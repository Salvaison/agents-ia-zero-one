'use strict';
// BOONOLAB V0.1 — four descriptive regimes, NEVER a trade veto.
// Time source: already recorded 30s Audit. Every window ends at the observed at.
const VERSION='boonolab-regime-observer-v0.1';
const MIN=60000,QUARTER=15*MIN,HOUR=60*MIN;
const R={LOW_LOW:'STERILE_HESITANT',LOW_HIGH:'SILENCIEUX_PRODUCTIF',
 HIGH_LOW:'DENSE_CONTRADICTOIRE',HIGH_HIGH:'DIRECTIONNEL_PRODUCTIF'};
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const round=(x,n=3)=>finite(x)?Math.round(x*10**n)/10**n:null;
function median(values){
 const a=values.filter(finite).sort((a,b)=>a-b);
 if(!a.length)return null;
 return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;
}
const stat=(arr,f)=>median(arr.map(f));
function features(points){
 const q=(points||[]).filter(x=>finite(x.ts)&&finite(x.lastPrice))
  .sort((a,b)=>a.ts-b.ts);
 if(!q.length)return {samples:0,available:false};
 const moves=q.slice(1).map((x,i)=>x.lastPrice-q[i].lastPrice);
 const path=moves.reduce((a,b)=>a+Math.abs(b),0);
 const net=q.at(-1).lastPrice-q[0].lastPrice;
 const hi=Math.max(...q.map(x=>x.lastPrice)),lo=Math.min(...q.map(x=>x.lastPrice));
 const flow=stat(q,x=>finite(x.volumeFenetreBtc)&&finite(x.winSec)&&x.winSec>0?
   x.volumeFenetreBtc/x.winSec:null);
 return {samples:q.length,startAt:q[0].ts,endAt:q.at(-1).ts,
  priceFirst:round(q[0].lastPrice,2),priceLast:round(q.at(-1).lastPrice,2),
  high:round(hi,2),low:round(lo,2),highAt:q.find(x=>x.lastPrice===hi).ts,
  lowAt:q.find(x=>x.lastPrice===lo).ts,
  rangeUsd:round(hi-lo,2),netUsd:round(net,2),pathUsd:round(path,2),
  pathEfficiency:path>0?round(Math.abs(net)/path,4):0,
  // Retained travel relative to the largest excursion from the first price.
  retainedFraction:Math.max(Math.abs(hi-q[0].lastPrice),
    Math.abs(lo-q[0].lastPrice))>0?
    round(Math.abs(net)/Math.max(Math.abs(hi-q[0].lastPrice),
      Math.abs(lo-q[0].lastPrice)),4):0,
  medianFlowBtcSec:round(flow,5),medianCadence:round(stat(q,x=>x.cadence),2),
  direction:net>0?'long':net<0?'short':null,
  reversals:moves.slice(1).filter((x,i)=>x*moves[i]<0).length,
  available:q.length>1
 };
}
function evaluate(rows,now,{context4h=null,parent=null}={}){
 if(!finite(now))throw Error('REGIME_REQUIRED_ASOF');
 const all=(rows||[]).filter(x=>finite(x.ts)&&x.ts<=now&&
  x.ts>=now-4*HOUR&&finite(x.lastPrice)).sort((a,b)=>a.ts-b.ts);
 const recent=all.filter(x=>x.ts>now-HOUR),
  baseline=all.filter(x=>x.ts<=now-HOUR&&x.ts>now-4*HOUR),
  twoHour=all.filter(x=>x.ts>now-2*HOUR);
 const last=all.at(-1),age=last?now-last.ts:null;
 const slots=Array.from({length:4},(_,i)=>{
  const start=now-(4-i)*QUARTER,until=start+QUARTER;
  const points=all.filter(x=>x.ts>start&&x.ts<=until);
  return {...features(points),slotStartAt:start,slotEndAt:until,
   coverage:round(Math.min(1,points.length/30),3)};
 });
 const curr=features(recent),prev=features(baseline),territory=features(twoHour);
 const priorHours=Array.from({length:3},(_,i)=>features(baseline.filter(
  x=>x.ts>now-(4-i)*HOUR&&x.ts<=now-(3-i)*HOUR)));
 const effReference=median(priorHours.filter(x=>x.samples>=70)
  .map(x=>x.pathEfficiency));
 const flowReference=prev.medianFlowBtcSec;
 const valid=curr.samples>=80&&baseline.length>=210&&
  finite(age)&&age>=0&&age<=90000&&
  finite(flowReference)&&flowReference>0&&finite(effReference);
 const intensityRelative=valid?
  curr.medianFlowBtcSec/flowReference:null;
 const effectivenessRelative=valid&&effReference>0?
  curr.pathEfficiency/effReference:null;
 // Relative medians are OBSERVATIONAL bin boundaries, not optimized gates.
 // Retention contributes explicitly, never a raw PM value.
 const intensityHigh=valid?intensityRelative>=1:null;
 const productive=valid?curr.pathEfficiency>=Math.max(.10,effReference)&&
   curr.retainedFraction>=.5&&curr.rangeUsd>0:null;
 const label=!valid?'INDETERMINE':
  R[(intensityHigh?'HIGH':'LOW')+'_'+(productive?'HIGH':'LOW')];
 const uncertain=!valid||Math.abs(intensityRelative-1)<.15||
  Math.abs(curr.pathEfficiency-effReference)<.04||
  Math.abs(curr.retainedFraction-.5)<.10;
 return {version:VERSION,asOf:now,ageMs:age,source:'AUDIT_30S_AS_OF',
  mode:'SHADOW_ONLY',brokerOrdersEnabled:false,decisionImpact:false,
  label,uncertainty:!valid?'COVERAGE_OR_SOURCE_INSUFFICIENT':
   uncertain?'BORDERLINE_OBSERVATIONAL_CLASSIFICATION':'DESCRIPTIVE_NOT_VALIDATED',
  intensity:valid?(intensityHigh?'HIGH':'LOW'):'UNKNOWN',
  productivity:valid?(productive?'RETAINED':'LOW_RETENTION'):'UNKNOWN',
  metrics:{intensityRelative:round(intensityRelative,3),
   productivityRelative:round(effectivenessRelative,3),
   baselineFlowBtcSec:round(flowReference,5),
   baselineEfficiency:round(effReference,4),
   lastHour:curr,previousThreeHours:prev},
  fourByFifteen:slots,
  twoHour:{...territory,context4h,MCB15Parent:parent},
  caveats:['Relative descriptive boundaries only; not calibrated trade thresholds',
   'Aggressive BTC/s is not passive order-book liquidity',
   'No information after asOf, PM overlapping windows not summed',
   'Regime not independently voting with MCB or Elastic']};
}
module.exports={VERSION,R,features,evaluate,median};
