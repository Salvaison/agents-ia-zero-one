'use strict';
// BOONOLAB 07/11 six exploratory market qualities, NO admission authority.
// Three aggressive-flow intensity levels x productive / unproductive price path.
// Reuses FROZEN 01–07 November historical calibration (report JSON) and ONLY
// Audit snapshots at/before V543 asOf, never PM signs or future outcomes.
const MIN=60000,HOUR=60*MIN;
const SOURCE='BOONOLAB_20261107_SIX_MARKET_QUALITIES_AUDIT_1H_SHADOW';
const LABELS=Object.freeze({
 LOW:'FAIBLE',MEDIUM:'MÉDIAN',HIGH:'FORT'
});
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const n=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
const rounded=(v,dec=3)=>finite(v)?Math.round(v*10**dec)/10**dec:null;
function median(xs){
 const sorted=xs.filter(finite).sort((a,b)=>a-b);
 if(!sorted.length)return null;
 const middle=Math.floor(sorted.length/2);
 return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
}
function fail(reason,asOf,at=null,samples=0){
 return {status:'UNAVAILABLE',label:null,intensity:null,productivity:null,
  source:SOURCE,mode:'SHADOW_ONLY',decisionImpact:false,
  brokerOrdersEnabled:false,asOf,observedAt:at,samples,
  reason};
}
function evaluate(rows,asOf,study){
 const t=n(asOf),cal=study?.hourly;
 if(t===null||t<=0)return fail('INVALID_ASOF',t);
 if(study?.study!=='PM3_PM5_PMLIVE_DISSONANCE_FROM_2026_11_01'||
    !cal?.perIntensity||n(cal.tentativeLowerBoundary)===null||
    n(cal.tentativeUpperBoundary)===null)
   return fail('MISSING_20261107_CALIBRATION',t);
 const lo=Number(cal.tentativeLowerBoundary),hi=Number(cal.tentativeUpperBoundary);
 if(!(lo>0&&hi>lo))return fail('INVALID_20261107_CALIBRATION',t);
 const points=(Array.isArray(rows)?rows:[])
   .filter(x=>n(x?.ts)!==null&&Number(x.ts)<=t&&Number(x.ts)>t-HOUR&&
     n(x.lastPrice)!==null&&n(x.volumeFenetreBtc)!==null&&
     n(x.winSec)!==null&&Number(x.winSec)>0&&Number(x.volumeFenetreBtc)>=0)
   .slice().sort((a,b)=>a.ts-b.ts);
 const latest=points.at(-1);
 if(points.length<90)return fail('AUDIT_HOUR_COVERAGE_LT_90',t,latest?.ts??null,points.length);
 if(t-Number(latest.ts)>90000)return fail('AUDIT_LAST_SAMPLE_STALE',t,latest.ts,points.length);
 if(Number(points[0].ts)>t-HOUR+5*MIN)
   return fail('AUDIT_HOUR_START_NOT_COVERED',t,latest.ts,points.length);
 // Avoid treating fragmented or delayed data as continuous volume/price effort.
 if(points.some((x,i)=>i>0&&Number(x.ts)-Number(points[i-1].ts)>120000))
   return fail('AUDIT_HOUR_SAMPLE_GAP',t,latest.ts,points.length);
 const flow=median(points.map(x=>Number(x.volumeFenetreBtc)/Number(x.winSec)));
 if(flow===null||flow<=0)return fail('AUDIT_FLOW_UNKNOWN',t,latest.ts,points.length);
 const intensity=flow<lo?'LOW':flow<hi?'MEDIUM':'HIGH';
 const benchmark=cal.perIntensity[intensity];
 const baselineEfficiency=n(benchmark?.medianEfficiency),
       baselineRetention=n(benchmark?.medianRetention);
 if(baselineEfficiency===null||baselineRetention===null||
    baselineEfficiency<0||baselineRetention<0)
   return fail('INTENSITY_PRODUCTIVITY_REFERENCE_MISSING',t,latest.ts,points.length);
 const prices=points.map(x=>Number(x.lastPrice));
 const startPrice=prices[0],lastPrice=prices.at(-1),net=lastPrice-startPrice;
 let travel=0,maxDeparture=0;
 for(let i=0;i<prices.length;i++){
  if(i>0)travel+=Math.abs(prices[i]-prices[i-1]);
  maxDeparture=Math.max(maxDeparture,Math.abs(prices[i]-startPrice));
 }
 const efficiency=travel>0?Math.abs(net)/travel:0;
 const retention=maxDeparture>0?Math.abs(net)/maxDeparture:0;
 const productive=efficiency>=baselineEfficiency&&
   retention>=baselineRetention&&Math.abs(net)>=75;
 return {
  status:'EXPLORATORY',source:SOURCE,
  mode:'SHADOW_ONLY',decisionImpact:false,brokerOrdersEnabled:false,
  asOf:t,observedAt:Number(latest.ts),startAt:Number(points[0].ts),
  samples:points.length,intensity,productivity:productive?'PRODUCTIF':'IMPRODUCTIF',
  label:LABELS[intensity]+' '+(productive?'PRODUCTIF':'IMPRODUCTIF'),
  medianFlowBtcPerSecond:rounded(flow,4),netUsd:rounded(net,1),
  pathUsd:rounded(travel,1),efficiency:rounded(efficiency,4),
  retention:rounded(retention,4),
  references:{
   calibration:'FROZEN_HISTORICAL_2026_11_01_TO_07_NOT_WALK_FORWARD_VALIDATED',
   lowerBoundaryBtcSec:lo,upperBoundaryBtcSec:hi,
   medianEfficiency:baselineEfficiency,
   medianRetention:baselineRetention,minimumAbsoluteNetUsd:75
  },
  note:'Trailing-hour descriptive proxy using volume of rolling 200 OKX trades. Six regimes = low/medium/high flow x retained/non-retained path; unvalidated experimental thresholds, not trade advice.'
 };
}
module.exports={SOURCE,LABELS,median,evaluate};
