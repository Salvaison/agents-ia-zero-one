'use strict';
// BOONO Systems V5.2.2 — causal phase / crossing / place / conversion → PAPER decision.
// Preserves V5.2.0 as an immutable counterfactual, never imports a broker.
const old=require('./decision-v52');
const VERSION='v5.2.2-causal-maturity-structural-invalidation';
const MIN=60000,THREE=3*MIN,FIFTEEN=15*MIN,RISK_CAP=500;
const num=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const round=v=>num(v)===null?null:Math.round(v*10)/10;
const direction=d=>d==='long'?1:d==='short'?-1:0;
const opposite=d=>d==='long'?'short':d==='short'?'long':null;
const within=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=b*0.0001;
function barsAvailable(rows,now,tf){
 return (rows||[]).filter(b=>Number.isFinite(num(b.ts))&&b.ts+tf<=now&&
    num(b.low)!==null&&num(b.high)!==null&&num(b.close)!==null);
}
function priceOnAudit(rows,ts){
 const x=[...(rows||[])].reverse().find(r=>r.ts<=ts&&ts-r.ts<=90000&&num(r.lastPrice)!==null);
 return x?num(x.lastPrice):null;
}
function localSwings(rows,dir,limit=32){
 const x=rows.slice(-limit),out=[];
 if(x.length<3)return out;
 for(let i=1;i<x.length-1;i++){
  const before=x[i-1],mid=x[i],after=x[i+1];
  const low=dir==='long',v=num(mid[low?'low':'high']);
  const prev=num(before[low?'low':'high']),next=num(after[low?'low':'high']);
  if(v===null||prev===null||next===null)continue;
  if(low?(v<=prev&&v<next):(v>=prev&&v>next)){
   out.push({key:low?'MCB3_CONFIRMED_SWING_LOW':'MCB3_CONFIRMED_SWING_HIGH',
    price:v,sourceTs:mid.ts,availableAt:after.ts+THREE,
    kind:'CAUSAL_SWING',evidence:'Prior and next confirmed 3m bars'});
  }
 }
 return out;
}
function acceptedReclaim(rows,level,dir,scale,now){
 const side=direction(dir),tolerance=Math.max(12,scale*.14);
 if(!Number.isFinite(num(level))||!side||rows.length<4)return null;
 let crossing=null,excursion=null,retest=null,held=null;
 for(let i=1;i<rows.length;i++){
  const prev=rows[i-1],cur=rows[i],p=num(prev.close),c=num(cur.close);
  if(p===null||c===null)continue;
  if(!crossing&&side*(p-level)<=0&&side*(c-level)>0){crossing=cur.ts+THREE;continue;}
  if(crossing&&cur.ts+THREE>=crossing&&!excursion&&side*(c-level)>tolerance)
   excursion=cur.ts+THREE;
  if(excursion&&cur.ts+THREE>excursion&&!retest&&
   Math.abs(c-level)<=tolerance&&side*(c-level)>=-tolerance*.35)
   retest=cur.ts+THREE;
  if(retest&&cur.ts+THREE>retest&&side*(c-level)>tolerance)
   held=cur.ts+THREE;
 }
 return held&&held<=now?{stage:'RETEST_HELD',level,heldAt:held,
  tolerance:round(tolerance),crossedAt:crossing,returnAt:retest}:null;
}
function structuralPlace({now,price,dir,bars3,bars15,levels,medianRange,base}){
 const side=direction(dir),scale=medianRange||65;
 const c3=barsAvailable(bars3,now,THREE),c15=barsAvailable(bars15,now,FIFTEEN);
 const all=[],notes=[];
 const add=x=>{
  if(!x||num(x.price)===null||!side)return;
  if(side*(price-x.price)<=0)return; // genuine protective side only
  const pad=Math.max(12,scale*.14);
  const stop=x.price-side*pad;
  const risk=side*(price-stop);
  if(!Number.isFinite(risk)||risk<=0)return;
  all.push({...x,stop:round(stop),risk:round(risk)});
 };
 for(const swing of localSwings(c3,dir))add(swing);
 const recent15=c15.slice(-5);
 if(recent15.length){
  const choose=recent15.reduce((best,r)=>!best||
   (side===1?r.low<best.low:r.high>best.high)?r:best,null);
  if(choose)add({key:side===1?'MCB15_OBSERVED_LOW':'MCB15_OBSERVED_HIGH',
    price:side===1?num(choose.low):num(choose.high),
    sourceTs:choose.ts,availableAt:choose.ts+FIFTEEN,kind:'CONFIRMED_15M_EXTREME',
    evidence:'Observed 15m candle extreme available after its close'});
 }
 const known=(levels||[]).filter(l=>num(l.price)!==null&&
   ['VAL','VAH','POC','WS','WR','DS','DR','MS','MR','SUPPORT','RESISTANCE'].includes(String(l.token||'').toUpperCase()));
 for(const l of known){
  const role=String(l.fam||'').toLowerCase(),key=String(l.token||l.label||'MAP');
  const priceLevel=num(l.price);
  // A named VAL / POC / VAH / S-R may change role only AFTER an observable
  // crossing, an excursion, a retest and renewed movement in the new direction.
  const meaningful=['support','resistance','poc'].includes(role)||
    ['VAL','VAH','POC'].includes(key);
  if(!meaningful)continue;
  const held=acceptedReclaim(c3.slice(-32),priceLevel,dir,scale,now);
  if(held)add({key:'ACCEPTED_'+key,price:priceLevel,kind:'ACCEPTED_LEVEL',
    sourceTs:null,availableAt:held.heldAt,acceptance:held,
    evidence:'Cross + retreat + subsequent confirmed defence observed'});
  else if(Math.abs(price-priceLevel)<=scale*1.5)
    notes.push(key+' '+priceLevel+': level mapped but defence not verified');
 }
 // A historical 3m high can become LONG support (or a low, SHORT resistance)
 // only after that extreme is itself causally confirmed, followed by an actual
 // cross + retreat + renewed departure. Do not treat a mere close > high as
 // acceptance. This requalification uses a fresh event in the same campaign.
 const oppositePivots=localSwings(c3,dir==='long'?'short':'long',50).slice(-8);
 for(const pv of oppositePivots){
  const rowsKnown=c3.filter(b=>b.ts+THREE>=pv.availableAt).slice(-32);
  const held=acceptedReclaim(rowsKnown,pv.price,dir,scale,now);
  if(held)add({key:dir==='long'?'RECLAIMED_3M_HIGH':'REJECTED_3M_LOW',
    price:pv.price,kind:'ACCEPTED_RETEST',sourceTs:pv.sourceTs,
    availableAt:held.heldAt,acceptance:held,
    evidence:'Confirmed opposite 3m extreme, later crossed, retested, held'});
  else if(Math.abs(price-pv.price)<=scale*1.5&&
      side*(price-pv.price)>0){
   notes.push('Previous '+(side===1?'HIGH':'LOW')+' '+round(pv.price)+
     ' crossed but retest not proven; NOT an automatic stop');
  }
 }
 // Never choose a stop narrower than the observed ordinary 3m candle:
 // the minimum is volatility-scaled, not a fixed 41/50 USD threshold.
 const minRoom=Math.max(36,scale*.8);
 const structurallyUsable=all.filter(x=>x.risk>=minRoom&&
   x.risk<RISK_CAP&&x.availableAt!==null&&x.availableAt<=now)
   .sort((a,b)=>a.risk-b.risk);
 const chosen=structurallyUsable[0]||null;
 const nearest=base?.readings?.place?.nearest||null;
 const nearHighWrongSide=nearest&&
  (side===1?String(nearest.key).includes('HIGH'):String(nearest.key).includes('LOW'))&&
  side*(price-nearest.price)>0;
 return {nearest,anchor:chosen?{...chosen}:null,notes:notes.slice(0,6),
  invalidation:chosen?{price:chosen.stop,reference:chosen.key,sourceTs:chosen.sourceTs,
    confirmedAvailableAt:chosen.availableAt,kind:chosen.kind,
    distanceUsd:chosen.risk,underlyingLevel:chosen.price,
    acceptedRetest:chosen.acceptance||null}:null,
  minVolatilityDistance:round(minRoom),validCandidates:structurallyUsable.length,
  ignoredPreviousExtreme:!!nearHighWrongSide&&!chosen?.acceptance,
  candidates:all.slice(-14).map(x=>({key:x.key,price:x.price,risk:x.risk,
    kind:x.kind,availableAt:x.availableAt})),
  explanation:chosen?'Structural '+chosen.kind+' '+chosen.key+
    ' known as of entry; not an untested opposite extremum':
    'No defensible structural invalidation within hard risk and volatility bounds'};
}
function sideOfLobe(lbw){return lbw>0?'long':lbw<0?'short':null;}
function movementMaturity(base,dir,place){
 const side=direction(dir),r=base.readings||{},m15=r.mcb15||{},m3=r.mcb3||{},
  geom=r.geometry||{},c=r.conversion||{},cross=geom.cross3||null;
 const med=num(r.economics?.median3mRange);
 const travelled=num(c.sinceCross);
 const units=med&&travelled!==null?round(side*travelled/med):null;
 const recent3=num(c.pm3),five=num(c.pm5),previous2=recent3!==null&&five!==null?five-recent3:null;
 const currentRate=recent3!==null?recent3/3:null;
 const previousRate=previous2!==null?previous2/2:null;
 const priorAligned=previousRate!==null&&side*previousRate>0;
 const slower=priorAligned&&currentRate!==null&&
   side*currentRate<(side*previousRate)*.65;
 const fullParent=m15.trajectory===dir;
 const historicalExtreme=num(m15.extreme45m),currentLbw=num(m15.lbw);
 const recovered=historicalExtreme&&currentLbw!==null?
   round(Math.max(0,(historicalExtreme-Math.abs(currentLbw))/historicalExtreme)):null;
 const alignedExtreme=dir==='long'?currentLbw<=-50:currentLbw>=50;
 const earlyOpposite=!!(m15.trajectory&&m15.trajectory===opposite(dir)&&
   alignedExtreme&&(num(cross?.level)!==null&&
   (dir==='long'?cross.level<0:cross.level>0)));
 const parentHasChanged=!!fullParent;
 const crossExtreme=num(cross?.level)!==null&&side*cross.level>=60;
 const nowExtreme=num(m3.lbw)!==null&&side*m3.lbw>=60;
 const postReversal=parentHasChanged&&historicalExtreme!==null&&
   historicalExtreme>=60&&currentLbw!==null&&sideOfLobe(currentLbw)!==dir&&
   recovered!==null&&recovered>=.15;
 const phase=earlyOpposite?'REVERSAL_NASCENT':
   postReversal?'POST_REVERSAL_EXPANSION':
   parentHasChanged?'CAMPAIGN_CONTINUATION':
   'TRANSITION_UNRESOLVED';
 const freshRetest=place.anchor&&place.anchor.acceptance?.heldAt?place.anchor.acceptance.heldAt:null;
 const requalified=!!(freshRetest&&base.asOf-freshRetest>=0&&
   base.asOf-freshRetest<=4*MIN);
 const lateTravel=units!==null&&units>1.25&&(slower||units>2);
 const atTacticalExtreme=!!(crossExtreme||nowExtreme)&&!requalified;
 const maturity=earlyOpposite&&units!==null&&units<=1.15?'EARLY_REVERSAL':
   requalified?'RETEST_REQUALIFIED':
   lateTravel?'MATURE_IMPULSE_WAIT_NEW_CYCLE':
   atTacticalExtreme?'TACTICAL_3M_EXTREME':
   phase==='POST_REVERSAL_EXPANSION'?'CAMPAIGN_ESTABLISHING':
   'DEVELOPING';
 return {phase,maturity,earlyOpposite,parentHasChanged,
  trajectory15:m15.trajectory,lobe15:m15.lbw,
  priorExtreme45m:historicalExtreme,recoveredFraction:recovered,
  cross3AgeMin:cross?.ts?round((base.asOf-cross.ts)/MIN):null,
  cross3At:cross?.ts||null,cross3Level:cross?.level??null,
  priceAdvanceSinceCrossUsd:travelled,progressInTypical3mRanges:units,
  recent3mRateUsdPerMin:round(currentRate),previousNonoverlapping2mRateUsdPerMin:round(previousRate),
  incrementalRateSlowing:!!slower,atTacticalExtreme,
  lateTravel:!!lateTravel,requalifiedAt:freshRetest||null,
  requalified:!!requalified,
  semantic:'Compare NEW 3m net displacement with preceding non-overlapping 2m, never sum PM3 and PM5'};
}
function causalLineage(base,maturity,place,dir){
 const g=base.readings?.geometry||{},c=base.readings?.conversion||{},
  e3=g.e3Live,e15=g.e15Live,cross=g.cross3,
  native3=e3&&cross&&e3.direction===dir&&
   Math.abs(e3.firstObservedAt-cross.ts)<=THREE+90000;
 return {campaignId:[maturity.trajectory15||'UNRESOLVED',
    base.readings?.mcb15?.structuralPivotAt||'PIVOT_UNKNOWN'].join('|'),
  direction:dir,phase:maturity.phase,
  cross3:cross?{observedAt:cross.ts,candleStart:cross.barTs,
   lbwLevel:cross.level,spreadSlope:cross.slopePerMinute,direction:cross.direction}:null,
  e3Native:e3?{firstObservedAt:e3.firstObservedAt,
   barStartTs:e3.barTs,direction:e3.direction,relatedToCross:!!native3}:null,
  cross15:g.cross15?{observedAt:g.cross15.ts,candleStart:g.cross15.barTs,
   direction:g.cross15.direction}:null,
  e15Native:e15?{firstObservedAt:e15.firstObservedAt,barStartTs:e15.barTs,
   direction:e15.direction}:null,
  locationAnchor:place.anchor?{kind:place.anchor.kind,key:place.anchor.key,
   price:place.anchor.price,availableAt:place.anchor.availableAt}:null,
  priceSinceCrossUsd:c.sinceCross??null,
  pmSinceBatonUsd:c.pmSinceBaton??null,
  pm3Usd:c.pm3??null,pm5Usd:c.pm5??null,
  mf3Change:c.mf3Delta3m??null,mf15Change:c.mf15Delta10m??null,
  note:'MCB crossing and native E are one oscillator family, NOT two independent votes'};
}
function evidenceAgainstPosition(input,base,place,median){
 const p=input.position,now=input.now,dir=p.direction,side=direction(dir),
  price=input.price,inv=num(p.invalidationPrice);
 if(inv===null||!side)return {breached:false,persistent:false,price:inv};
 const breached=side*(price-inv)<=0;
 if(!breached)return {breached:false,persistent:false,price:inv};
 const rows=(input.samples||[]).filter(r=>r.ts<=now&&r.ts>=now-3*MIN&&
    num(r.lastPrice)!==null&&side*(r.lastPrice-inv)<=0);
 const observed=rows.length>=2&&rows[rows.length-1].ts-rows[0].ts>=25000;
 const conv=base.readings?.conversion||{},pm3=num(conv.pm3),pm5=num(conv.pm5);
 const opposing=pm3!==null&&pm5!==null&&side*pm3<0&&side*pm5<0;
 const deep=side*(inv-price)>Math.max(35,(median||65)*.5);
 const persistent=observed&&opposing||deep&&opposing;
 return {breached,persistent,consecutiveObservations:rows.length,opposingPm:opposing,
  lastObserved:rows.at(-1)?.ts||null,price:inv,
  basis:'Hold through a lone wick; require sustained opposing conversion / material penetration'};
}
function evaluate(input){
 const base=old.evaluate(input);
 const now=num(input.now),price=num(input.price);
 if(now===null||price===null||!base?.readings?.mcb15)
  return {...base,version:VERSION,action:'WAIT',reason:'V522_NO_DATA'};
 const r=base.readings,g=r.geometry||{},cross=g.cross3,dir=cross?.direction||
   r.mcb15.trajectory||null,side=direction(dir);
 const med=num(r.economics?.median3mRange);
 const place=structuralPlace({now,price,dir,bars3:input.bars3||[],
   bars15:input.bars15||[],levels:input.levels||[],medianRange:med,base});
 const maturity=movementMaturity(base,dir,place);
 const chain=causalLineage(base,maturity,place,dir);
 const inv=place.invalidation,conv=r.conversion||{},pm3=num(conv.pm3),
   pm5=num(conv.pm5),md3=num(conv.mf3Delta3m),md15=num(conv.mf15Delta10m);
 const priceShortTerm=side&&pm3!==null&&pm5!==null&&
    side*pm3>12&&side*pm5>8;
 const flowAligned=side&&md3!==null&&side*md3>0&&md15!==null&&side*md15>-1.8;
 const baton=side&&num(conv.pmCombined)!==null&&side*conv.pmCombined>0;
 const bornAfterActivation=!!(cross&&(cross.ts>=input.startedAt||
   (maturity.requalified&&maturity.requalifiedAt>=input.startedAt)));
 const timeQualified=!!(cross&&bornAfterActivation&&now>=cross.ts&&
    ((now-cross.ts<=12*MIN)||maturity.requalified));
 const phaseValid=!!dir&&(maturity.phase==='REVERSAL_NASCENT'||
   maturity.phase==='POST_REVERSAL_EXPANSION'||
   maturity.phase==='CAMPAIGN_CONTINUATION');
 const stageValid=maturity.maturity!=='MATURE_IMPULSE_WAIT_NEW_CYCLE'&&
   maturity.maturity!=='TACTICAL_3M_EXTREME'&&
   (maturity.maturity!=='CAMPAIGN_ESTABLISHING'||maturity.requalified||
    (maturity.progressInTypical3mRanges!==null&&
     maturity.progressInTypical3mRanges<=.85&&!maturity.incrementalRateSlowing));
 const risk=inv?.distanceUsd??null;
 const cost=num(r.economics?.feeRoundTripMoveUsd);
 const room=num(r.economics?.estimatedNextBoundarySpaceUsd);
 const meaningfulRoom=risk!==null&&room!==null&&cost!==null&&
   room>Math.max(2.1*cost,1.15*risk);
 const sourceOK=base.quality==='DATA_OK';
 const noisy=!(base.checks?.noChop);
 const entryReady=sourceOK&&timeQualified&&phaseValid&&stageValid&&
   !!inv&&meaningfulRoom&&priceShortTerm&&flowAligned&&baton&&!noisy;
 const reason=!sourceOK?'SOURCES_NON_FRAICHES':
   !dir?'AUCUNE_DIRECTION_CANDIDATE':
   !cross||!timeQualified?'TRANSITION_3M_NON_REQUALIFIEE':
   !phaseValid?'MCB15_SANS_PHASE_EXPLOITABLE':
   maturity.maturity==='TACTICAL_3M_EXTREME'?'3M_EXTREME_SANS_RETEST_DEFENDU':
   maturity.maturity==='MATURE_IMPULSE_WAIT_NEW_CYCLE'?
     'IMPULSION_DEJA_MATURE_ATTENDRE_REQUALIFICATION':
   !stageValid?'CAMPAGNE_ETABLIE_ATTENDRE_REQUALIFICATION':
   !inv?'INVALIDATION_STRUCTURELLE_NON_DEMONTREE':
   !meaningfulRoom?'POTENTIEL_INSUFFISANT_POUR_RISQUE_ET_FRAIS':
   !priceShortTerm?'CONVERSION_PM3_PM5_NON_PRODUCTIVE':
   !baton?'PM_LIVE_DEPUIS_BATON_NON_CONVERTI':
   !flowAligned?'TRANSFERT_MF_NON_COHERENT':
   noisy?'RECROISEMENTS_SANS_TERRAIN':'CONVERSION_CAUSALE_EXPLOITABLE';
 let action=entryReady?'ENTER_'+dir.toUpperCase():'WAIT',finalReason=reason;
 let protectionEvidence=null;
 if(input.position){
  const p=input.position,pSide=direction(p.direction),move=pSide*(price-p.entryPrice);
  const legacyPosition=p.entryPolicyVersion&&p.entryPolicyVersion!==VERSION;
  protectionEvidence=evidenceAgainstPosition(input,base,place,med);
  action='HOLD';finalReason='CAMPAGNE_TENUE';
  if(move<=-RISK_CAP){action='EXIT_'+p.direction.toUpperCase();finalReason='HARD_RISK_500';}
  else if(legacyPosition&&base.action==='EXIT_'+p.direction.toUpperCase()){
   action=base.action;finalReason='LEGACY_POSITION_EXIT_'+base.reason;
  }
  else if(!legacyPosition&&protectionEvidence.persistent){
   action='EXIT_'+p.direction.toUpperCase();
   finalReason='STRUCTURAL_LEVEL_LOST_WITH_OPPOSING_CONVERSION';
  }
  else{
   const adverse15=g.cross15&&g.cross15.direction===opposite(p.direction)&&
     now-g.cross15.ts<=25*MIN;
   const adversePrice=pm3!==null&&pm5!==null&&
     pSide*pm3<-(med||60)*.55&&pSide*pm5<-(med||60)*.7;
   const mfOpposition=md15!==null&&pSide*md15<-.8;
   if(adverse15&&adversePrice&&mfOpposition){
    action='EXIT_'+p.direction.toUpperCase();
    finalReason='MCB15_TRANSFER_ADVERSE_PRICE_MF';
   }else if(r.mcb15.trajectory&&r.mcb15.trajectory===opposite(p.direction)&&
      adversePrice&&mfOpposition){
    action='EXIT_'+p.direction.toUpperCase();
    finalReason='TRAJECTORY_15M_OPPOSITE_WITH_CONVERSION';
   }else if(protectionEvidence.breached){
    finalReason='BOUNDARY_WICK_UNRESOLVED_HOLD_WITH_RISK_CAP';
   }
  }
 }
 return {...base,version:VERSION,action,reason:finalReason,
  candidate:dir,phase:maturity.phase,entryKey:cross&&dir?
    dir+'|'+cross.ts+'|'+chain.campaignId+
    (maturity.requalified?'|RETEST:'+maturity.requalifiedAt:''):null,
  prognosis:dir?(maturity.phase==='REVERSAL_NASCENT'?'Renversement '+dir+
    ' en formation à l’extrême MCB15':
    maturity.phase==='POST_REVERSAL_EXPANSION'?'Campagne '+dir+
    ' établie: chercher respiration et requalification':
    'Continuation '+dir+' conditionnée au cycle E3 et au terrain défendu'):
    'Structure non qualifiée',
  invalidation:inv,
  quality:base.quality,
  readings:{...r,
    mcb15:{...r.mcb15,phase:maturity.phase},
    geometry:{...g,causalNativeRelation:chain.e3Native?.relatedToCross||false},
    maturity,causalChain:chain,
    place:{...r.place,nearest:place.nearest,anchor:place.anchor,
      notes:place.notes,minVolatilityDistance:place.minVolatilityDistance,
      invalidationRef:inv?.reference||null,unacceptedOppositeExtreme:place.ignoredPreviousExtreme},
    economics:{...r.economics,stopDistanceUsd:risk,
      spaceVsStop:room!==null&&risk!==null&&risk>0?round(room/risk):null,
      viable:meaningfulRoom,volatilityMin:place.minVolatilityDistance,
      expectedFeesUsd:1.5},
    invalidationEvidence:protectionEvidence
  },
  checks:{...base.checks,phaseLocation:phaseValid,maturityOK:stageValid,
    crossingWindow:timeQualified,causalStop:!!inv,
    pmAligned:!!priceShortTerm,batonLiveResponse:!!baton,
    mfTransfer:!!flowAligned,room:meaningfulRoom,entryReady},
  decisionContract:{flat:'ENTER only on causal stage, valid location and conversion',
   position:'HOLD through tactical respiration; exit sustained adverse evidence',
   hardRiskPriceMove:500,gainFloor:'120/90 then 220/180 in independent paper risk'},
  brokerOrdersEnabled:false};
}
module.exports={VERSION,evaluate,structuralPlace,movementMaturity,causalLineage,
 acceptedReclaim,evidenceAgainstPosition,localSwings,barsAvailable};
