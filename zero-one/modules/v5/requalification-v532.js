'use strict';
// BOONO v5.3.2 — causal E3→E15 admission requalification, MA proof authority.
// Observed timestamps only. No broker, persistence, or external IO.
const {bars,THREE,FIFTEEN,number:n,rounded:r,side}=require('./v53-causal');
const V='v532-causal-requalification';
const PROLONGING=new Set(['EASY','POWERFUL','PRODUCTIVE','EXCEPTIONAL']);
const last=(events,filter)=>events.filter(filter).at(-1)||null;
const median=xs=>{const a=xs.filter(Number.isFinite).sort((a,b)=>a-b);
 return a.length?a[Math.floor(a.length/2)]:null;};
function filtered(input){
 const now=n(input.now);
 return (input.causalEvents||[]).filter(e=>e&&n(e.observedAt)!==null&&e.observedAt<=now)
   .sort((a,b)=>a.observedAt-b.observedAt);
}
function nativeStatus(events,tf,dir,now){
 const family=tf==='15m'?'MCB15':'MCB3',key=tf==='15m'?'E15':'E3';
 const familyEvents=events.filter(e=>e.family===family&&e.key===key);
 const observed=last(familyEvents,e=>e.type==='OBSERVED'&&e.direction===dir);
 const confirmed=last(familyEvents,e=>e.type==='CONFIRMED'&&e.direction===dir);
 const latestObs=last(familyEvents,e=>e.type==='OBSERVED');
 const latestConfirmed=last(familyEvents,e=>e.type==='CONFIRMED');
 const interrupted=!!(observed&&familyEvents.some(e=>e.type==='INTERRUPTED'&&
   e.direction===dir&&e.observedAt>observed.observedAt&&
   (!n(e.sourceTs)||e.sourceTs===observed.sourceTs)&&
   (!confirmed||confirmed.observedAt<e.observedAt)));
 const barLen=tf==='15m'?FIFTEEN:THREE;
 const currentBar=Math.floor(now/barLen)*barLen;
 const live=!!(observed&&observed.sourceTs===currentBar&&!interrupted&&
   latestObs?.direction===dir&&
   (!latestConfirmed||latestConfirmed.observedAt<observed.observedAt||
      latestConfirmed.direction===dir));
 const hasConfirmed=!!(confirmed&&latestConfirmed?.direction===dir);
 return {live,confirmed:hasConfirmed,observed,confirmation:confirmed,
   interrupted,latestObservedDirection:latestObs?.direction||null,
   lastConfirmedDirection:latestConfirmed?.direction||null,
   liveSince:live?observed.observedAt:null,
   confirmedSince:hasConfirmed?confirmed.observedAt:null};
}
function maProof(input,ma,dir,tf='3m'){
 const now=input.now,d=side(dir);
 if(!d||!ma||n(ma.ma)===null)return {status:'UNKNOWN',blocked:false};
 const tol=n(ma.toleranceUsd)||Math.max(5,Math.abs(ma.ma)*.0003);
 const period=tf==='15m'?FIFTEEN:THREE;
 const rows=bars(tf==='15m'?input.bars15:input.bars3,now,period).filter(x=>n(x.ma200)!==null&&
   n(x.low)!==null&&n(x.high)!==null&&n(x.close)!==null).slice(-12);
 const actual=rows.filter(b=>b.low<=b.ma200+tol&&b.high>=b.ma200-tol);
 const lastTouch=actual.at(-1),lastBar=rows.at(-1);
 let provenRejection=false;
 if(lastTouch&&now-(lastTouch.ts+period)<=4*period&&lastBar){
  const after=rows.filter(b=>b.ts>lastTouch.ts);
  // A candle that actually tested the MA by wick and closed back on the
  // approach side is already a confirmed rejection; a later losing candle
  // is another valid proof. Proximity without a real touch is never proof.
  const rejectedInContactBar=d*(lastTouch.close-lastTouch.ma200)<-tol;
  provenRejection=(rejectedInContactBar||
    after.some(b=>d*(b.close-b.ma200)<-tol))&&
    d*(input.price-ma.ma)<-tol;
 }
 const accepted=!!(ma.accepted&&
   (ma.confirmedSame||ma.confirmedStrong));
 const nearby=!!ma.inApproach;
 const onFarSide=d*(input.price-ma.ma)>0;
 let status='NO_CONFRONTATION';
 if(provenRejection)status='PROVEN_REJECTION';
 else if(accepted)status='ACCEPTED_CONFIRMED';
 else if(onFarSide&&nearby)status='LIVE_TRAVERSAL_UNCONFIRMED';
 else if(nearby)status='APPROACH_UNPROVEN';
 else if(onFarSide)status='TERRITORY_AHEAD_UNTESTED';
 return {
  status,blocked:provenRejection,realContactCount:actual.length,
  lastConfirmedContactAt:lastTouch?lastTouch.ts+period:null,
  ma:ma.ma,toleranceUsd:r(tol),distanceUsd:ma.distanceUsd,
  priorState:ma.state,
  evidence:'Only a confirmed actual MA wick contact followed by adverse confirmed close proves a rejection; proximity is never a veto',
  noNewStructuralLevel:true
 };
}
function evaluate(input,base,dir){
 const now=n(input.now),d=side(dir),events=filtered(input);
 const g=base.readings?.geometry||{},c=base.readings?.conversion||{},
  m=base.readings?.maContract||{},flow=m.flowQuality||{},
  stage=base.readings?.marketStage||{},
  x3=g.cross3, x15=g.cross15;
 const e3=nativeStatus(events,'3m',dir,now);
 const e15=nativeStatus(events,'15m',dir,now);
 const conversion=last(events,e=>e.family==='CONVERSION'&&
   e.key==='CONVERSION'&&['TRANSITION','CONFIRMED','OBSERVED'].includes(e.type));
 const cvQual=conversion?.quality||null,
  cvDir=conversion?.direction||null;
 const marketQuality=!!(conversion&&cvDir===dir&&PROLONGING.has(cvQual)&&
   now-conversion.observedAt<=3*60000);
 const geometry3=!!(x3&&x3.direction===dir&&x3.ts<=now&&
   n(base.readings?.mcb3?.lbw)!==null&&n(base.readings?.mcb3?.bw)!==null&&
   d*(base.readings.mcb3.lbw-base.readings.mcb3.bw)>0);
 const e3Confirmed=!!(e3.confirmed&&e3.confirmation.observedAt>=x3?.ts-THREE&&
   (!e3.observed||e3.observed.direction===dir));
 const newE15=!!(e15.observed&&e15.observed.observedAt>=x3?.ts&&
   e15.observed.observedAt<=now);
 const phaseForming=!!(e15.live&&newE15);
 const confirmedPhase=!!(x15&&x15.direction===dir&&x15.ts<=now&&
   (e15.confirmed||e15.live)&&newE15);
 const liveOrConfirmed=phaseForming||confirmedPhase;
 const mfStrong=flow.grade==='REINFORCING';
 const pmProductive=!!(n(c.pm3)!==null&&n(c.pm5)!==null&&
   n(c.pmCombined)!==null&&d*c.pm3>8&&d*c.pm5>0&&d*c.pmCombined>0);
 const median15=median(bars(input.bars15,now,FIFTEEN).slice(-18)
   .map(b=>n(b.high)!==null&&n(b.low)!==null?b.high-b.low:null));
 const proofPrice=n(e15.observed?.price);
 const travel=proofPrice===null?null:r(d*(input.price-proofPrice));
 const travelIn15Range=travel!==null&&median15>0?r(travel/median15):null;
 // No fixed 250/325 USD expiry. A newly observed E15 phase earns a
 // NEW geometric maturity clock; do not chase > a whole typical 15m bar.
 const notExhausted=travelIn15Range!==null&&travelIn15Range>=-.5&&travelIn15Range<=1;
 const proofMa=maProof(input,m.ma3,dir,'3m');
 const proofMa15=maProof(input,m.ma15,dir,'15m');
 const risk=base.invalidation;
 const hardRiskOK=!!(risk&&n(risk.price)!==null&&
  n(risk.confirmedAvailableAt)!==null&&risk.confirmedAvailableAt<=now&&
  n(risk.distanceUsd)>0&&risk.distanceUsd<500);
 const fresh=base.quality==='DATA_OK'&&input.tickAgeMs<=25000&&
  now-(input.samples||[]).at(-1)?.ts<=65000;
 const eligible=!!(d&&geometry3&&e3Confirmed&&liveOrConfirmed&&newE15&&
   mfStrong&&pmProductive&&marketQuality&&notExhausted&&
   !proofMa.blocked&&!proofMa15.blocked&&
   hardRiskOK&&fresh&&base.checks?.newCausalProof===true);
 return {
  version:V,asOf:now,direction:dir,
  eligible,window:eligible?(confirmedPhase?'MCB15_CROSS_REQUALIFIED':'E15_LIVE_REVERSAL_FORMING'):
   'NO_REQUALIFICATION',
  // Old E15 observations remain historical memory, not a current proof.
  proofAt:newE15?e15.observed?.observedAt||null:null,
  proofPrice:newE15?proofPrice:null,confirmedAt:e15.confirmedSince,
  cross15At:confirmedPhase?x15.ts:null,
  e3ConfirmedAt:e3.confirmedSince,
  e3Confirmed,
  e15ObservedAt:e15.observed?.observedAt||null,
  e15LiveCurrent:e15.live,
  e15Confirmed:e15.confirmed,
  e15Interrupted:e15.interrupted,
  mcb3CrossAt:x3?.ts||null,
  current15:base.readings?.mcb15?.currentOffensive||null,
  strategicVsTactical:base.readings?.mcb15?.currentOffensive===dir?
   'STRATEGY_ALIGNED':'STRATEGIC_REVERSAL_FORMING',
  conversion:{quality:cvQual,direction:cvDir,observedAt:conversion?.observedAt,
    yieldVsP75:conversion?.detail?.yieldVsP75,effortVsP75:conversion?.detail?.effortVsP75,
    pmLive:c.pmCombined,pm3:c.pm3,pm5:c.pm5},
  mfQuality:flow.grade,
  ma3:proofMa,ma15:proofMa15,
  priceTravelSinceE15Usd:travel,median15RangeUsd:r(median15),
  priceTravelIn15Ranges:travelIn15Range,
  riskConfirmed:hardRiskOK,
  guards:{geometry3,e3Confirmed,liveOrConfirmed,newE15,mfStrong,pmProductive,
   marketQuality,notExhausted,maNotProvenResistance:!proofMa.blocked&&!proofMa15.blocked,
   hardRiskOK,fresh,proofAfterActivation:base.checks?.newCausalProof===true},
  note:'New evidence requalifies E3 maturity; MA is not a proven barrier unless actual price rejection is established'
 };
}
module.exports={evaluate,maProof,nativeStatus,filtered};
