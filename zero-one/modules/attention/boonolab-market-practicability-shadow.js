'use strict';
// BOONOLAB - independent experimental practicability SHADOW.
// No order, no PAPER policy and no V553 decision function imported.
// Three reversible observational gate HYPOTHESES, never trading authority.
const place=require('./boonolab-place-e1e4-shadow');
const waveShape=require('./boonolab-wave-geometry');
const interpret=require('./boonolab-wave-geometry-interpreter');
const VERSION='boonolab-market-practicability-geometry-shadow-v0.1';
const MIN=60000,HALF=30*MIN,FOUR_HOURS=240*MIN;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const rnd=(v,d=3)=>finite(v)?Math.round(v*10**d)/10**d:null;
const sign=v=>finite(v)?v>0?'long':v<0?'short':null:null;
const med=x=>{const a=x.filter(finite).sort((a,b)=>a-b);return a.length?
 a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2:null;};
function lower(rows,t){let l=0,r=rows.length;
 while(l<r){const m=(l+r)>>1;if(rows[m].ts<t)l=m+1;else r=m;}return l;}
function slice(rows,start,end){return rows.slice(lower(rows,start),lower(rows,end+1)).filter(x=>x.ts<=end);}
function feat(r){
 const q=r.filter(x=>finite(x.ts)&&finite(x.lastPrice)&&
  finite(x.live15LbwRaw)&&finite(x.live15BwRaw)&&
  finite(x.liveLbw)&&finite(x.liveBw));
 if(q.length<2)return {n:q.length,complete:false};
 let path=0,flips15=0,flips3=0,hi=-Infinity,lo=Infinity;
 const gaps15=[],gaps3=[],flow=[];
 for(let i=0;i<q.length;i++){
  const x=q[i],g15=x.live15LbwRaw-x.live15BwRaw,g3=x.liveLbw-x.liveBw;
  gaps15.push(g15);gaps3.push(g3);
  hi=Math.max(hi,x.lastPrice);lo=Math.min(lo,x.lastPrice);
  if(finite(x.volumeFenetreBtc)&&finite(x.winSec)&&x.winSec>0)
   flow.push(x.volumeFenetreBtc/x.winSec);
  if(!i)continue;
  const p=q[i-1];path+=Math.abs(x.lastPrice-p.lastPrice);
  if(g15&&gaps15[i-1]&&Math.sign(g15)!==Math.sign(gaps15[i-1]))flips15++;
  if(g3&&gaps3[i-1]&&Math.sign(g3)!==Math.sign(gaps3[i-1]))flips3++;
 }
 const p0=q[0].lastPrice,net=q.at(-1).lastPrice-p0;
 const excursion=Math.max(hi-p0,p0-lo),gap0=gaps15[0],gap1=gaps15.at(-1);
 const half=Math.max(1,Math.floor(q.length/2));
 const dt=(q.at(-1).ts-q[0].ts)/MIN;
 const dt1=(q[half].ts-q[0].ts)/MIN,dt2=(q.at(-1).ts-q[half].ts)/MIN;
 const firstSlope=dt1>0?(gaps15[half]-gap0)/dt1:null,
  secondSlope=dt2>0?(gap1-gaps15[half])/dt2:null;
 return {n:q.length,complete:true,firstAt:q[0].ts,lastAt:q.at(-1).ts,
  firstPrice:p0,lastPrice:q.at(-1).lastPrice,
  netPriceUsd:rnd(net,2),pathPriceUsd:rnd(path,2),
  efficiency:rnd(path?Math.abs(net)/path:0,4),
  retained:rnd(excursion>0?Math.abs(net)/excursion:0,4),
  flip15:flips15,flip3:flips3,
  absGap15Median:rnd(med(gaps15.map(Math.abs)),2),
  absGap3Median:rnd(med(gaps3.map(Math.abs)),2),
  gap15First:rnd(gap0,3),gap15Last:rnd(gap1,3),
  gap15Delta:rnd(gap1-gap0,3),
  gap15VelocityPerMin:rnd(dt>0?(gap1-gap0)/dt:null,4),
  gap15CurvatureProxyPerMin2:rnd(firstSlope!==null&&secondSlope!==null?
   (secondSlope-firstSlope)/Math.max(1,dt/2):null,5),
  lbw15Delta:rnd(q.at(-1).live15LbwRaw-q[0].live15LbwRaw,3),
  bw15Delta:rnd(q.at(-1).live15BwRaw-q[0].live15BwRaw,3),
  mf15Delta:rnd(finite(q.at(-1).live15MfRaw)&&finite(q[0].live15MfRaw)?
   q.at(-1).live15MfRaw-q[0].live15MfRaw:null,3),
  mf15Now:finite(q.at(-1).live15MfRaw)?rnd(q.at(-1).live15MfRaw,3):null,
  priceHigh:hi,priceLow:lo,medianBtcSec:rnd(med(flow),6)};
}
const VARIANTS={
 STRICT_3_FAMILIES:{flips15:3,flips3:7,maxGap15:5,maxEfficiency:.05,maxRetained:.4,requiresSlow:true},
 GEOMETRY_CONVERSION:{flips15:2,flips3:5,maxGap15:8,maxEfficiency:.08,maxRetained:.55,requiresSlow:false},
 GEOMETRY_OR_SLOW:{flips15:2,flips3:5,maxGap15:8,maxEfficiency:.08,maxRetained:.55,requiresSlow:'OR'}
};
function evaluate({audit=[],asOf,bars1h=[],bars4h=[],levels=null,
 levelsMtime=null}={}){
 if(!finite(asOf))throw Error('PRACTICABILITY_SHADOW_REQUIRES_ASOF');
 const waveGeometry=waveShape.compute(audit,asOf);
 const recent=feat(slice(audit,asOf-HALF,asOf));
 const quick=feat(slice(audit,asOf-6*MIN,asOf));
 const longer=feat(slice(audit,asOf-FOUR_HOURS,asOf));
 const ready=recent.complete&&recent.n>=43&&
  asOf-recent.lastAt>=0&&asOf-recent.lastAt<=90000&&
  quick.n>=8&&quick.complete;
 const e1=place.confirmedE(bars1h,asOf);
 const e4=place.confirmedE(bars4h,asOf);
 const lastGap=recent.gap15Last;
 const direction=sign(lastGap);
 const slowDir=e1.direction===e4.direction?e1.direction:null;
 const parentOpposition=!!(slowDir&&direction&&slowDir!==direction);
 const priceWaveOpposition=ready&&recent.netPriceUsd!==0&&
  recent.lbw15Delta!==0&&
  Math.sign(recent.netPriceUsd)!==Math.sign(recent.lbw15Delta);
 // Direction of MF15 is descriptive, not a vote on its sign.
 const mf15Neutral=finite(recent.mf15Now)&&Math.abs(recent.mf15Now)<=5;
 const unresolved=parentOpposition||priceWaveOpposition;
 // Emerging productive translation is a counterexample worth counting,
 // NOT an automatic permission to reopen V553.
 const growing=quick.complete&&
  sign(quick.gap15Delta)===sign(quick.netPriceUsd)&&
  sign(quick.gap15Last)===sign(quick.netPriceUsd);
 const emergence=ready&&growing&&quick.efficiency>=.13&&
  quick.retained>=.70&&Math.abs(quick.netPriceUsd)>=
   (longer.complete&&finite(longer.netPriceUsd)?Math.abs(longer.netPriceUsd)/20:0);
 const results={};
 for(const [name,cfg] of Object.entries(VARIANTS)){
  const geometry=ready&&recent.absGap15Median<=cfg.maxGap15&&
   (recent.flip15>=cfg.flips15||recent.flip3>=cfg.flips3);
  const economy=ready&&recent.efficiency<=cfg.maxEfficiency&&
   recent.retained<=cfg.maxRetained;
  const raw=!ready?null:
   cfg.requiresSlow===true?geometry&&economy&&unresolved:
   cfg.requiresSlow==='OR'?economy&&(geometry||unresolved):
   geometry&&economy;
  results[name]={rawClosed:raw,geometry,economy,unresolved,
   productiveEscape:!!emergence,proposedClosed:!!raw&&!emergence,
   reason:!ready?'INSUFFICIENT_ASOF_COVERAGE':
    raw&&emergence?'PRODUCTIVE_ESCAPE_OBSERVED':
    raw?'CROSSES_CONVERSION_SLOW_CONTEXT': 'NOT_PROVEN_UNPRACTICABLE'};
 }
 let range=null;
 if(Array.isArray(levels)&&finite(levelsMtime)&&levelsMtime<=asOf){
  range=place.ranges(levels,recent.lastPrice,levelsMtime,asOf);
 }
 const higher={e1:{direction:e1.direction,knownAtProxy:e1.knownAtProxy,
    lbw:e1.lbw,mf:e1.mf},
   e4:{direction:e4.direction,knownAtProxy:e4.knownAtProxy,
    lbw:e4.lbw,mf:e4.mf},slowDir,direction,
   parentOpposition,priceWaveOpposition,mf15Neutral,unresolved};
 const spatial=range&&{status:range.status,big:range.big,
    sourceAt:range.sourceAt};
 const waveInterpretation=interpret.interpret({waveGeometry,
   measurements:{recent30m:recent,quick6m:quick},
   higher,place:spatial});
 return {version:VERSION,asOf,mode:'SHADOW_ONLY',
  brokerOrdersEnabled:false,decisionImpact:false,
  authority:'OBSERVATION_ONLY_NO_V553_ADMISSION_OR_EXIT',
  coverage:{ready,samples30m:recent.n,
   asOfAgeMs:recent.lastAt===undefined?null:asOf-recent.lastAt},
  waveGeometry,waveInterpretation,
  measurements:{recent30m:recent,quick6m:quick,
   baseline4h:{n:longer.n,efficiency:longer.efficiency,
    medianBtcSec:longer.medianBtcSec},
   volumeBtcSecRelative:longer.complete&&longer.medianBtcSec>0?
    rnd(recent.medianBtcSec/longer.medianBtcSec):null},
  higher,
  geometry:{slopeUnits:'MCB_VALUE_PER_MINUTE_NOT_CHART_PIXEL_ANGLE',
   curvatureUnits:'MCB_VALUE_PER_MINUTE_SQUARED_DIFFERENCE_OF_HALVES'},
  place:spatial,
  proposed:results,
  caveats:['Exploratory thresholds, no calibration or live PAPER authority',
   'Sampled 30s sign flips may count jitter near zero, not native 15m closes',
   'E1/E4 knownAtProxy is bar-end availability, not verified first receipt',
   'Only current levels recorded as-of can be used, no invented historical VAL',
   'MF15 is an observation, not active confirmation in V553',
   'No alternative trade execution, no causal PnL claim']};
}
function initial(startAt=0){return {version:VERSION,mode:'SHADOW_ONLY',
 brokerOrdersEnabled:false,decisionImpact:false,startedAt:startAt,
 lastAt:0,totalSamples:0,coveredSamples:0,
 variants:Object.fromEntries(Object.keys(VARIANTS).map(x=>[x,
  {rawClosed:0,proposedClosed:0,escape:0,entryClosed:0}])),
 last:null,latestHistory:[],
 semantic:interpret.initial(startAt),semanticLastEvents:[]};}
function observe(state,sample){
 if(state.version!==VERSION||state.decisionImpact!==false||
  state.brokerOrdersEnabled!==false)throw Error('SHADOW_INVALID_STATE');
 if(sample.version!==VERSION||sample.decisionImpact!==false||
   sample.brokerOrdersEnabled!==false||sample.asOf<=state.lastAt)
  return false;
 // Migrate additive SHADOW fields without changing old state version.
 if(!state.semantic)state.semantic=interpret.initial(state.startedAt);
 const semanticResult=interpret.observe(state.semantic,
    sample.waveInterpretation);
 state.semanticLastEvents=semanticResult.events;
 state.lastAt=sample.asOf;state.totalSamples++;
 if(sample.coverage.ready)state.coveredSamples++;
 for(const [name,r] of Object.entries(sample.proposed)){
  const counters=state.variants[name];
  if(r.rawClosed===true)counters.rawClosed++;
  if(r.proposedClosed)counters.proposedClosed++;
  if(r.rawClosed===true&&r.productiveEscape)counters.escape++;
 }
 state.last={asOf:sample.asOf,
  coverage:sample.coverage,
  proposed:sample.proposed,
  measurements:sample.measurements,
  higher:sample.higher,place:sample.place,
  waveGeometry:sample.waveGeometry,
  waveInterpretation:sample.waveInterpretation};
 state.latestHistory.push({at:sample.asOf,
  ready:sample.coverage.ready,
  flags:Object.fromEntries(Object.entries(sample.proposed).map(([k,v])=>[k,
   v.proposedClosed]))});
 state.latestHistory=state.latestHistory.slice(-45);
 return true;
}
function summary(state){
 const covered=state.coveredSamples;
 return {version:VERSION,mode:'SHADOW_ONLY',
  decisionImpact:false,brokerOrdersEnabled:false,at:state.lastAt,
  totalObservations:state.totalSamples,coveredObservations:covered,
  uncoveredObservations:state.totalSamples-covered,
  variants:Object.fromEntries(Object.entries(state.variants).map(([k,v])=>[k,
   {...v,percentMarketClosed:covered?rnd(100*v.proposedClosed/covered,2):null,
    percentRawClosed:covered?rnd(100*v.rawClosed/covered,2):null}])),
  latest:state.last,latestHistory:state.latestHistory,
  semantic:{version:state.semantic?.version||null,
   lastAt:state.semantic?.lastAt||null,
   phase:state.semantic?.last?.phase||null,
   hypothesis:state.semantic?.last?.hypothesis||null,
   activeEpisode:state.semantic?.activeEpisode||null,
   completedEpisodes:state.semantic?.completedEpisodes?.length||0,
   phaseDurationsMs:state.semantic?.phaseDurationsMs||{},
   recentChanges:state.semantic?.changes?.slice(-10)||[]},
  note:'Time-sampled historical and prospective 30s scenarios, not trading authority; exposure to V553 entries is measured separately; no counterfactual PnL.'};
}
module.exports={VERSION,VARIANTS,feat,evaluate,initial,observe,summary};
