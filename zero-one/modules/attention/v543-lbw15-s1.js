'use strict';
// V543 S1 / LBW15 trajectory: deterministic SHADOW-only evidence.
// Never imports PAPER step, broker, order or position writer.
const VERSION='boonolab-v543-lbw15-s1-v0.1';
const number=x=>x===null||x===undefined||x===''?null:
  Number.isFinite(Number(x))?Number(x):null;
const side=d=>d==='long'?1:d==='short'?-1:0;
const opp=d=>d==='long'?'short':d==='short'?'long':null;
const round=x=>x===null?null:Math.round(x*100)/100;
function sample(d){
 const st=d?.readings?.structural54||d?.structural54||{};
 const g=d?.readings?.geometry||d?.geometry||{};
 const cv=d?.readings?.conversion||d?.conversion||{};
 const na=st.nativeE15||{};
 const now=number(d?.asOf??d?.ts),price=number(d?.price);
 if(now===null||price===null||!st.available||
    number(st.currentLbw15)===null||number(st.currentBw15)===null)return null;
 const c=na.confirmed||{},live=na.live||{};
 return {at:now,price,lbw:number(st.currentLbw15),
  bw:number(st.currentBw15),parent:st.director||null,
  parentId:st.campaignId||null,parentKnownAt:number(st.structuralPivotKnownAt),
  phase:d.phase||st.phase||null,candidate:d.candidate||null,
  paperAction:d.action||null,
  nativeDirection:c.direction||null,
  nativeKnownAt:number(c.availableAt),
  nativeSourceAt:number(c.sourceTs),
  activeLiveDirection:live.direction||null,
  activeLiveObservedAt:number(live.observedAt),
  cross15Direction:g.cross15?.direction||null,
  cross15At:number(g.cross15?.ts),
  cross3Direction:g.cross3?.direction||null,
  cross3At:number(g.cross3?.ts),
  pmLive:number(cv.pmCombined),
  pm3:number(cv.pm3),pm5:number(cv.pm5),
  mf3:number(cv.mf3Delta3m),
  mf15:number(cv.mf15Delta10m),
  defended:st.testedTerritory?.validated===true,
  attentionStage:d.readings?.attention?.stage||null,
  rank2h:number(d.readings?.maturity?.twoHourPriceRank??d.maturity?.twoHourPriceRank)
 };
}
function lag(samples,now,mins){
 const at=now-mins*60000;
 return [...samples].reverse().find(x=>x.at<=at&&at-x.at<=90000)||null;
}
function inspect(samples,cur,position=null){
 if(!cur)return {version:VERSION,status:'INSUFFICIENT_INPUT',
  decisionImpact:false,brokerOrdersEnabled:false};
 const all=[...samples.filter(x=>x.at<cur.at),cur]
  .sort((a,b)=>a.at-b.at);
 const p3=lag(all,cur.at,3),p15=lag(all,cur.at,15);
 const cand=cur.candidate||cur.parent;
 const d=side(cand),posDir=position?.direction||null;
 const dp=side(posDir);
 const delta3=p3?cur.lbw-p3.lbw:null;
 const delta15=p15?cur.lbw-p15.lbw:null;
 const gap=cur.lbw-cur.bw;
 const priorGap=p15?p15.lbw-p15.bw:null;
 const gapContracting=priorGap!==null&&Math.abs(gap)<Math.abs(priorGap);
 const nativeConflict=!!(d&&cur.nativeDirection===opp(cand)&&
  cur.nativeKnownAt!==null&&cur.parentKnownAt!==null&&
  cur.nativeKnownAt>cur.parentKnownAt&&cur.nativeKnownAt<=cur.at);
 const nativeParentConflict=!!(cur.parent&&
  cur.nativeDirection===opp(cur.parent)&&cur.nativeKnownAt!==null&&
  cur.parentKnownAt!==null&&cur.nativeKnownAt>cur.parentKnownAt&&
  cur.nativeKnownAt<=cur.at);
 const currentCrossOpp=!!(d&&cur.cross15Direction===opp(cand)&&
  cur.cross15At!==null&&cur.at-cur.cross15At>=0&&
  cur.at-cur.cross15At<=45*60000);
 const down15=delta15!==null&&d*delta15<=-6;
 const down3=delta3!==null&&d*delta3<=-3;
 const pmAdverse=cur.pmLive!==null&&d*cur.pmLive<0;
 const cross3Opp=!!(d&&cur.cross3Direction===opp(cand)&&
   cur.cross3At!==null&&cur.at-cur.cross3At>=0&&
   cur.at-cur.cross3At<=15*60000);
 const recentNativeOpp=!!(cur.activeLiveDirection===opp(cand)&&
   cur.activeLiveObservedAt!==null&&
   cur.at-cur.activeLiveObservedAt>=0&&cur.at-cur.activeLiveObservedAt<=15*60000);
 const phase=cur.phase||'';
 const continuation=phase==='STRUCTURAL_CONTINUATION';
 const formation=phase==='STRUCTURAL_REVERSAL_FORMING';
 // SHADOW proposal, not a veto: historical winner #237 can pass a native conflict.
 const reviewContinuation=!!(continuation&&
  ((nativeConflict&&currentCrossOpp)||
   (down15&&gapContracting&&(pmAdverse||cross3Opp))||
   (nativeConflict&&down3&&pmAdverse)));
 // Entry and position have separate review criteria. No exit is generated.
 const pd=side(posDir);
 const posDelta=delta15!==null?pd*delta15:null;
 const positionReview=!!(pd&&
  ((cur.nativeDirection===opp(posDir)&&cur.nativeKnownAt!==null&&
    cur.parentKnownAt!==null&&cur.nativeKnownAt>cur.parentKnownAt&&
    cur.cross15Direction===opp(posDir))||
   (posDelta!==null&&posDelta<=-6&&gapContracting&&
    cur.pmLive!==null&&pd*cur.pmLive<0)));
 const transferEvidence=!!(cur.nativeDirection&&cur.cross15Direction&&
  cur.nativeDirection===cur.cross15Direction&&
  cur.nativeKnownAt!==null&&cur.nativeKnownAt<=cur.at&&
  cur.cross15At!==null&&cur.cross15At<=cur.at&&
  cur.nativeDirection!==cur.parent);
 const classification=formation?'FORMATION_SEPARATE_AUTHORITY':
  nativeParentConflict?'PARENT_NATIVE_CONTRADICTION':
  down15&&gapContracting?'LBW15_RAPID_CONTRACTION':
  down15?'LBW15_DIRECTIONAL_DECELERATION':
  delta15===null?'LBW15_HISTORY_INCOMPLETE':'LBW15_NO_ADVERSE_EVIDENCE';
 return {version:VERSION,asOf:cur.at,sourceAt:cur.nativeSourceAt,
  firstKnownAt:cur.nativeKnownAt,classification,
  parent:cur.parent,parentId:cur.parentId,parentKnownAt:cur.parentKnownAt,
  candidate:cand,phase,parentNativeConflict:nativeParentConflict,
  confirmedNativeConflict:nativeConflict,
  e15ConfirmedDirection:cur.nativeDirection,
  e15LiveDirection:cur.activeLiveDirection,
  cross15Direction:cur.cross15Direction,cross15At:cur.cross15At,
  cross3Direction:cur.cross3Direction,
  lbw15:cur.lbw,bw15:cur.bw,
  lbwDelta3m:round(delta3),lbwDelta15m:round(delta15),
  directionalLbw15Change:round(delta15!==null?d*delta15:null),
  gap:round(gap),priorGap:round(priorGap),gapContracting,
  price:cur.price,pmLive:cur.pmLive,pm3:cur.pm3,pm5:cur.pm5,
  mf3:cur.mf3,mf15:cur.mf15,rank2h:cur.rank2h,
  evidence:{nativeConflict,currentCrossOpp,down15,down3,
   gapContracting,pmAdverse,cross3Opp,recentNativeOpp,
   defended:cur.defended,history3m:!!p3,history15m:!!p15},
  proposedAdmission:reviewContinuation?'DEFER_CONTINUATION_REVIEW':
   formation?'PRESERVE_REVERSAL_FORMING':
   'NO_LBW15_ADMISSION_OBJECTION',
  proposedPosition:positionReview?'EXAMINE_ECONOMIC_POSITION_PROTECTION':
   'NO_LBW15_POSITION_OBJECTION',
  proposedTransfer:transferEvidence?
   'EXAMINE_STRATEGIC_TRANSFER_NOT_CONFIRMED_BY_PRICE':
   'NO_STRATEGIC_TRANSFER_CONCLUSION',
  hypotheticalAdmissionDefer:reviewContinuation,
  hypotheticalPositionReview:positionReview,
  decisionImpact:false,entryAllowed:null,exitRequested:null,
  brokerOrdersEnabled:false,
  caveat:'Exploratory 3m/15m LBW deltas (6/3 points), not calibrated out-of-sample. E15 source/availability distinct; no PAPER order, veto or exit.'};
}
module.exports={VERSION,sample,inspect};
