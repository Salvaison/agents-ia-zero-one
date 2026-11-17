'use strict';
// BOONOLAB autonomous 4x15m ticker, NO V494 PAPER/state dependency.
// Reuses ONLY pure legacy Elastic taxonomy and pure 15m weighted aggregation.
// As-of reconstructed BATON 30s audit + historical market observer labels.
const taxonomy=require('../v4/experiments/elastic-observer-shadow');
const windows=require('./v494-elastic-ticker');
const VERSION='boonolab-ticker4x15-independent-v1';
const MIN=60000,QUARTER=15*MIN;
const n=x=>x===null||x===undefined||x===''?null:
 Number.isFinite(Number(x))?Number(x):null;
const r=(x,dp=3)=>x===null?null:Math.round(x*10**dp)/10**dp;
const quantile=(a,q)=>{
 if(!a?.length)return null;
 const b=[...a].sort((x,y)=>x-y);
 const x=(b.length-1)*q,lo=Math.floor(x),hi=Math.ceil(x);
 return b[lo]+(b[hi]-b[lo])*(x-lo);
};
function lag(rows,ts,ms){
 const goal=ts-ms;
 let left=0,right=rows.length;
 while(left<right){const mid=Math.floor((left+right)/2);
  if(rows[mid].ts<=goal)left=mid+1;else right=mid;
 }
 const item=rows[left-1];
 return item&&goal-item.ts<=48000?item:null;
}
function prepareAudit(audit,asOf){
 const seen=new Map();
 for(const raw of audit||[]){
  const ts=n(raw.ts),price=n(raw.lastPrice),vol=n(raw.volumeFenetreBtc),
   sec=n(raw.winSec),cadence=n(raw.cadence);
  if(ts===null||ts>asOf||ts<=0||price===null||price<=0)continue;
  const flow=sec!==null&&sec>=3&&vol!==null&&vol>=0?
   vol/sec:null;
  const usable=flow!==null&&flow>0&&flow<30&&
   (cadence===null||cadence<1000);
  seen.set(ts,{ts,price,flow:usable?flow:null,
   cadence:cadence!==null&&cadence>=0&&cadence<1000?cadence:null,
   pmLive:n(raw.priceMove),lbw15:n(raw.live15LbwRaw),
   mf15:n(raw.live15MfRaw),rawDirection:raw.direction||null});
 }
 return [...seen.values()].sort((a,b)=>a.ts-b.ts).filter(x=>x.ts>=asOf-6*3600000);
}
function normalizeMarket(observed,asOf){
 const seen=new Map();
 for(const x of observed||[]){
  const at=n(x.asOf);
  if(at===null||at>asOf||!x.regimeLabel)continue;
  seen.set(at,{at,regimeLabel:String(x.regimeLabel)});
 }
 return [...seen.values()].sort((a,b)=>a.at-b.at);
}
function lastMarket(markets,at){
 let l=0,h=markets.length;
 while(l<h){const m=(l+h)>>1;if(markets[m].at<=at)l=m+1;else h=m;}
 const x=markets[l-1];
 return x&&at-x.at<=90000?x.regimeLabel:'UNKNOWN';
}
function prepareYield(audit){
 return audit.map((x,i)=>{
  const past3=lag(audit,x.ts,3*MIN),past5=lag(audit,x.ts,5*MIN);
  const pm3=past3?r(x.price-past3.price,2):null;
  const pm5=past5?r(x.price-past5.price,2):null;
  const yieldPerBtc=x.flow!==null&&pm3!==null&&x.flow>0?
   Math.abs(pm3)/(x.flow*180):null;
  return {...x,pm3,pm5,yieldPerBtc};
 });
}
function sampleAt(rows,markets,index,prior=null){
 const x=rows[index];
 if(!x)return null;
 // P75 and P95 use ONLY earlier observations: a 4h trailing comparison,
 // excluding the latest 3m to keep present effort out of its own baseline.
 const past=rows.slice(Math.max(0,index-520),index).filter(p=>
  p.ts>=x.ts-4*3600000&&p.ts<=x.ts-3*MIN);
 const flows=past.map(p=>p.flow).filter(v=>v!==null&&v>0);
 const yields=past.map(p=>p.yieldPerBtc).filter(v=>v!==null&&v>0);
 const baselineOk=flows.length>=55&&yields.length>=55;
 const effort75=baselineOk?quantile(flows,.75):null;
 const yield75=baselineOk?quantile(yields,.75):null;
 const yield95=baselineOk?quantile(yields,.95):null;
 const effort=effort75>0&&x.flow!==null?x.flow/effort75:null;
 const yieldNow=x.yieldPerBtc;
 const relativeYield=yield75>0&&yieldNow!==null?yieldNow/yield75:null;
 const relativeYield95=yield95>0&&yieldNow!==null?yieldNow/yield95:null;
 const frame={sources:{auditRows:[{priceMove:x.pmLive}]}};
 const translation={horizons:{net3mUsd:x.pm3,net5mUsd:x.pm5}};
 const ticker={current:{yieldVsP75:relativeYield,
  yieldVsP95:relativeYield95,effortVsP75:effort,
  flowBtcPerSec:x.flow,cadence:x.cadence}};
 const cv=taxonomy.conversion(frame,translation,ticker,
  {travel:{...ticker.current}},prior);
 const valid=baselineOk&&x.pm3!==null&&x.pm5!==null&&x.flow!==null;
 const quality=valid?cv.quality:'UNCLASSIFIED';
 // Direction fractions remain honest: when PM3 and PM5 conflict the slot
 // is CONTESTED. Never convert unavailable PM into a direction vote.
 const direction=x.pm3!==null&&x.pm5!==null?
  ((x.pm3>0&&x.pm5>0)?'long':(x.pm3<0&&x.pm5<0)?'short':
   (x.pm3*x.pm5<0)?'contested':null):null;
 const marketState=lastMarket(markets,x.ts);
 let phase='UNPROVEN';
 if(valid&&prior&&prior.conversion&&prior.conversion.direction===direction){
  if(cv.temporalQuality==='EXHAUSTED'||cv.temporalQuality==='ABSORBED')phase='EXHAUSTING';
  else if(['EASY','PRODUCTIVE','POWERFUL','EXCEPTIONAL'].includes(quality))
   phase='PRODUCTIVE';
  else if(quality==='CONTESTED')phase='BREATHING';
 }
 return {
  at:x.ts,price:x.price,quality,direction,
  temporalQuality:valid?cv.temporalQuality:null,phaseHypothesis:phase,
  marketState,travelState:!valid?'UNKNOWN':
   relativeYield95!==null&&relativeYield95>=1?
    (effort!==null&&effort<1?'EXTREME_EASY_TRAVEL':'EXTREME_PRODUCTIVE_TRAVEL'):
   relativeYield!==null&&relativeYield>=1?
    (effort!==null&&effort<1?'EASY_TRAVEL':'PRODUCTIVE_TRAVEL'):
   effort!==null&&effort>=1?'HIGH_EFFORT_LOW_YIELD':'LOW_YIELD',
  yieldVsP75:r(relativeYield),yieldVsP95:r(relativeYield95),
  effortVsP75:r(effort),
  yieldUsdPerBtc:r(yieldNow),
  cadence:x.cadence,flowBtcPerSec:x.flow,
  pmLive:x.pmLive,pm3:x.pm3,pm5:x.pm5,
  efficiency3m:null,lbw15:x.lbw15,
  mf15Value:x.mf15,src:'BATON_30S_ASOF_PRICE_AND_FLOW',
  baselineFlowSamples:flows.length,baselineYieldSamples:yields.length,
  sourceAt:x.ts,
  _conversion:{...cv,quality,direction}};
}
function calculate({audit=[],marketSnapshots=[],asOf}={}){
 if(!Number.isFinite(asOf)||asOf<=0)throw Error('TICKER_4X15_ASOF_INVALID');
 const prepared=prepareYield(prepareAudit(audit,asOf));
 const markets=normalizeMarket(marketSnapshots,asOf);
 const past=prepared.filter(x=>x.ts<=asOf&&x.ts>=asOf-65*MIN);
 let previous=null,samples=[];
 for(const x of past){
  let left=0,right=prepared.length;
  while(left<right){const mid=(left+right)>>1;
   if(prepared[mid].ts<x.ts)left=mid+1;else right=mid;
  }
  if(previous&&x.ts-previous.at>90*1000)previous=null;
  const sample=sampleAt(prepared,markets,left,previous&&{conversion:previous._conversion});
  if(!sample)continue;
  samples.push(sample);previous=sample;
 }
 samples=samples.filter(x=>x.at>=asOf-65*MIN);
 const data=windows.snapshot(samples,asOf);
 const latest=samples.at(-1)||null;
 return {version:VERSION,mode:'SHADOW_ONLY',decisionImpact:false,
  brokerOrdersEnabled:false,asOf,price:latest?.price??null,
  current:latest?{quality:latest.quality,direction:latest.direction,
   marketState:latest.marketState,pm3:latest.pm3,pm5:latest.pm5,
   pmLive:latest.pmLive,effortVsP75:latest.effortVsP75,
   yieldVsP75:latest.yieldVsP75,sourceAt:latest.at}:null,
  quality4x15:data.buckets,hourlyRegime:data.regime,
  observations:samples.length,
  source:'BATON_AUDIT_30S_AND_OBSERVED_MARKET_REGIMES',
  taxonomy:'ELASTIC_V05_CATEGORIES_WITH_4H_ASOF_EFFORT_YIELD_PROXY',
  effortBasis:'BTC/sec from Bâton rolling volumeFenetreBtc / winSec',
  yieldBasis:'abs(3min BTC price change) / (rolling BTC/sec x 180s), vs prior four hours P75/P95',
  categoryContract:'ELASTIC_CATEGORIES_PRESERVED_BUT_NUMERIC_RESULTS_NOT_IDENTICAL_TO_V494',
  liquidityContract:'EXECUTED_FLOW_PROXY_NOT_ORDER_BOOK_DEPTH_NOT_LIQUIDATIONS',
  caveat:'PM3/PM5 reconstructed from prior Bâton prices, not original tick PM3/PM5. 1m OKX volume is a separate measurement.'};
}
module.exports={VERSION,quantile,lag,prepareAudit,prepareYield,
 normalizeMarket,lastMarket,sampleAt,calculate};
