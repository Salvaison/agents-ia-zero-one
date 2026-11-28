'use strict';
// Market memory remains independent; this layer may consume proof in a
// simulated account, never writes a market anchor or resets the market clock.
const VERSION='v5.5.4-trajectory-synchronisation-shadow-v1';
const finite=Number.isFinite,sg=d=>d==='UP'?1:-1,op=d=>d==='UP'?'DN':'UP';
function action(action,reason,detail={}){return {version:VERSION,action,reason,...detail,brokerOrdersEnabled:false,decisionImpact:false};}
function candidate(m,account,price,variant='TRAJECTORY'){
 if(!m||!finite(price))return action('WAIT','MARKET_UNAVAILABLE');
 const h=Object.values(m.hypotheses).filter(x=>x.eligible);
 if(h.length!==1)return action('WAIT',h.length?'RIVAL_HYPOTHESES':'NO_QUALIFIED_TRAJECTORY');
 const x=h[0],d=x.direction,k=sg(d),proof=x.evidence.proof;
 // Never let a subsequent quote create a new proof or buy an already-spent
 // impulse far from the evidence; tolerance calibrated to the observed noise.
 const slip=k*(price-m.price);
 if(slip>Math.max(m.noise*2,1))return action('WAIT','PRICE_ALREADY_MOVED_SINCE_PROOF',{hypothesis:x});
 if(slip<-m.noise*2)return action('WAIT','PRICE_PROOF_RETRACTED',{hypothesis:x});
 if(proof&&finite(proof.price)&&k*(price-proof.price)>100)return action('WAIT','PRICE_PROOF_ALREADY_CONSUMED',{hypothesis:x});
 if(proof&&k*(price-proof.level)<=0)return action('WAIT','PROOF_TERRITORY_NO_LONGER_HELD',{hypothesis:x});
 if(!proof&&x.knownActualCross&&finite(x.crossTravel)&&x.crossTravel+slip>100)return action('WAIT','CROSS_TRAVEL_VIGILANCE',{hypothesis:x});
 if(variant==='A'&&x.variantA||variant==='B'&&x.variantB)return action('WAIT','EXPERIMENTAL_ANTI_PHASE_'+variant,{hypothesis:x});
 const used=account.usedInitiatives?.[x.initiativeId];
 // Entry and exit do not reset market memory. Re-admission only after a NEW
 // independently observed economic proof, post-exit and not recycled.
 if(used&&(!proof||proof.sourceAt<=Math.max(used.at,account.lastExit?.at||0)||proof.id===used.proofId||k*(price-(used.peakPrice??used.price))<=m.noise))
  return action('WAIT','INITIATIVE_ALREADY_EXPLOITED_NO_NEW_PROOF',{hypothesis:x});
 if(account.lastExit&&m.sourceAt<=account.lastExit.at)return action('WAIT','NO_POST_EXIT_MARKET_OBSERVATION',{hypothesis:x});
 return action('ENTER_'+(d==='UP'?'LONG':'SHORT'),x.reason,{hypothesis:x,proofId:proof?.id||null,initiativeId:x.initiativeId,sourceAt:m.sourceAt});
}
function latestPivot(bars,at,d,entryAt){
 // Confirmed 15m swing; next closed bar must exist. No future pivot.
 const a=bars||[],k=sg(d);
 for(let j=a.length-2;j>=1;j--){
  const b=a[j],l=a[j-1],r=a[j+1];
  if(r.closeAt>at||b.closeAt<=entryAt||r.closeAt-b.closeAt!==900000||b.closeAt-l.closeAt!==900000)continue;
  if(d==='UP'&&[l.low,b.low,r.low].every(finite)&&b.low<l.low&&b.low<r.low)return {level:b.low,sourceAt:b.sourceAt,knownAt:r.closeAt,kind:'CONFIRMED_15M_SWING'};
  if(d==='DN'&&[l.high,b.high,r.high].every(finite)&&b.high>l.high&&b.high>r.high)return {level:b.high,sourceAt:b.sourceAt,knownAt:r.closeAt,kind:'CONFIRMED_15M_SWING'};
 }
 return null;
}
function initialDefense(bars,at,d){
 const a=(bars||[]).filter(b=>b.closeAt<=at).slice(-8),k=sg(d);
 for(let j=a.length-2;j>=1;j--){
  const b=a[j],l=a[j-1],r=a[j+1];
  const q=d==='UP'?[l.low,b.low,r.low]:[l.high,b.high,r.high];
  if(q.every(finite)&&k*(q[1]-q[0])<0&&k*(q[1]-q[2])<0)return {level:q[1],sourceAt:b.sourceAt,knownAt:r.closeAt,kind:'INITIAL_CONFIRMED_3M_PIVOT'};
 }
 return null;
}
function exitReview(m,p,price,at,bars,early=true){
 const d=p.direction==='long'?'UP':'DN',k=sg(d),against=op(d),g=m.geometry,c=m.liveCross;
 const latest=latestPivot(bars['15m'],m.asOf,d,p.entryAt);
 if(latest&&(!p.defense||k*(latest.level-p.defense.level)>0))p.defense=latest;
 const adverseCross=c?.type==='CROSS15_LIVE'&&c.direction===against&&c.sourceAt>p.entryAt&&g.gapSide===against;
 const crossMove=adverseCross?-k*(price-c.price):null;
 const oppTactical=g.tactical.side===against||finite(g.k[3].L)&&k*g.k[3].L<0;
 const structural=finite(g.k[3].L)&&finite(g.k[3].G)&&k*g.k[3].L<0&&k*g.k[3].G<0;
 // No gain floor or P&L test. Structural loss must be corroborated and
 // observed at two distinct market samples (not two polling ticks).
 const broken=p.defense&&-k*(price-p.defense.level)>m.noise&&structural&&g.tactical.side===against&&finite(g.conversion.pm3)&&k*g.conversion.pm3<0;
 if(p.lastReviewSource!==m.sourceAt){
  p.lastReviewSource=m.sourceAt;p.brokenCount=broken?(p.brokenCount||0)+1:0;
  p.adverseCrossCount=adverseCross&&crossMove>m.noise&&oppTactical?(p.adverseCrossCount||0)+1:0;
  if(p.reviewCrossAt!==c?.sourceAt){p.reviewCrossAt=c?.sourceAt??null;p.adverseCrossCount=adverseCross&&crossMove>m.noise&&oppTactical?1:0;}
 }
 if(early&&broken&&p.brokenCount>=2)return action('EXIT_'+p.direction.toUpperCase(),'V554_STRUCTURAL_DEFENSE_LOST',{defense:p.defense,sourceAt:m.sourceAt});
 if(adverseCross&&crossMove>m.noise&&oppTactical&&p.adverseCrossCount>=2)return action('EXIT_'+p.direction.toUpperCase(),'V554_REAL_CROSS_ADVERSE_TRANSLATED',{crossAt:c.sourceAt,crossMove,sourceAt:m.sourceAt});
 return action('HOLD','V554_TRAJECTORY_UNINVALIDATED',{defense:p.defense,crossMove,sourceAt:m.sourceAt});
}
module.exports={VERSION,candidate,exitReview,initialDefense,latestPivot,action};
