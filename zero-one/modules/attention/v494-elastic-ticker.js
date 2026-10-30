'use strict';
// BOONOLAB — 4x15m qualitative memory; one descriptive hour, NO trading vote.
// Categories retain the original Elastic V0.5 taxonomy, plus separate
// historical V493 market-quality and price-travel classifications.
const SLOT_MS=15*60000,MINUTE=60000,STEP_MS=30000;
const PRODUCTIVE=new Set(['EASY','PRODUCTIVE','POWERFUL','EXCEPTIONAL']);
const STERILE=new Set(['INEFFICIENT','ABSORBED','EXHAUSTED']);
const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const num=x=>finite(x)?Number(x):null;
const round=(x,n=3)=>finite(x)?Math.round(Number(x)*10**n)/10**n:null;
const side=x=>num(x)===null||num(x)===0?null:Number(x)>0?'long':'short';
function travelState(e){
 const v=e?.ticker?.current||{},y=num(v.yieldVsP75),y95=num(v.yieldVsP95),effort=num(v.effortVsP75);
 if(y95!==null&&y95>=1&&effort!==null&&effort<1)return 'EXTREME_EASY_TRAVEL';
 if(y!==null&&y>=1&&effort!==null&&effort<1)return 'EASY_TRAVEL';
 if(y95!==null&&y95>=1)return 'EXTREME_PRODUCTIVE_TRAVEL';
 if(y!==null&&y>=1)return 'PRODUCTIVE_TRAVEL';
 if(effort!==null&&effort>=1&&(y===null||y<1))return 'HIGH_EFFORT_LOW_YIELD';
 if(y!==null&&y<1)return 'LOW_YIELD';
 return 'UNKNOWN';
}
function sampleOf(e,cv,at,price,prior=null){
 const v=e?.ticker?.current||{},pm=e?.translation?.horizons||{};
 const structural=e?.mcb?.currentLobe?.structuralDirection||null;
 const tactical=e?.mcb?.nested3m?.structuralDirection||null;
 const temporal=cv.temporalQuality||null;
 let phase='UNPROVEN';
 if(temporal==='EXHAUSTED')phase='EXHAUSTING';
 else if(cv.quality==='CONTESTED'&&prior&&PRODUCTIVE.has(prior.quality))
   phase='BREATHING';
 else if(PRODUCTIVE.has(cv.quality)&&prior?.quality==='CONTESTED'&&
   prior?.mcb15Direction===cv.direction)phase='REACCELERATING';
 else if(PRODUCTIVE.has(cv.quality)&&prior&&prior.direction===cv.direction&&
   prior.mcb15Direction===cv.direction)phase='RETAINING';
 else if(PRODUCTIVE.has(cv.quality)&&cv.direction)phase=prior?'PRODUCTIVE':'INITIATING';
 else if(cv.quality==='INEFFICIENT'&&cv.direction===structural&&
   num(v.effortVsP75)>=1)phase='EXHAUSTING';
 const e3=e?.nativeSignal||{};
 const last3=[e3.last3mUp,e3.last3mDn].filter(z=>finite(z?.ts))
   .sort((a,b)=>Number(b.ts)-Number(a.ts))[0]||null;
 const last15=[e3.lastUp,e3.lastDn].filter(z=>finite(z?.ts))
   .sort((a,b)=>Number(b.ts)-Number(a.ts))[0]||null;
 return {
   at,price:round(price,2),quality:cv.quality,direction:cv.direction,
   temporalQuality:temporal,phaseHypothesis:phase,
   marketState:e?.marketQuality?.state||'UNKNOWN',
   travelState:travelState(e),
   mcb15Direction:structural,mcb3Direction:tactical,
   yieldVsP75:round(v.yieldVsP75,4),yieldVsP95:round(v.yieldVsP95,4),
   effortVsP75:round(v.effortVsP75,4),
   yieldUsdPerBtc:round(v.yieldUsdPerBtc,4),
   cadence:round(v.cadence,4),flowBtcPerSec:round(v.flowBtcPerSec,5),
   pmLive:round(cv.pmLive,2),pm3:round(cv.pm3,2),pm5:round(cv.pm5,2),
   efficiency3m:round(pm.efficiency3m,4),
   mf15Direction:e?.mfStructureShadow?.temporal?.memoryDirection||null,
   mf15Value:round(e?.mfStructureShadow?.currentMf,4),
   lbw15:round(e?.mcb?.currentLobe?.currentLbw,4),
   lastE3Ts:last3?Number(last3.ts):null,
   lastE15Ts:last15?Number(last15.ts):null,
   source:'V494_PRIOR_EVAL_AS_OF',
 };
}
const sumShare=(counts,total)=>Object.fromEntries(Object.entries(counts)
  .map(([key,v])=>[key,round(v/Math.max(total,1),3)]));
function slot(samples,from,asOf){
 const until=Math.min(from+SLOT_MS,asOf),expected=Math.max(0,until-from);
 const members=(samples||[]).filter(s=>s.at>from&&s.at<=until)
   .slice().sort((a,b)=>a.at-b.at);
 const counts={},dirs={},market={},travel={},phases={};
 const metricFields=['yieldVsP75','effortVsP75','yieldUsdPerBtc',
   'cadence','flowBtcPerSec','pmLive','pm3','pm5','efficiency3m','lbw15'];
 const metrics=Object.fromEntries(metricFields.map(k=>[k,{total:0,weight:0}]));
 let occupied=0,lastEnd=from,productive=0,sterile=0,marketKnown=0,qualitiesKnown=0;
 for(const s of members){
  const beg=Math.max(from,s.at-STEP_MS,lastEnd),end=Math.min(until,s.at);
  const w=Math.max(0,end-beg);
  if(!w)continue;
  lastEnd=end;occupied+=w;
  const quality=s.quality||'UNCLASSIFIED',dir=s.direction||'contested';
  counts[quality]=(counts[quality]||0)+w;
  dirs[dir]=(dirs[dir]||0)+w;
  const mk=s.marketState||'UNKNOWN',tk=s.travelState||'UNKNOWN';
  market[mk]=(market[mk]||0)+w;
  travel[tk]=(travel[tk]||0)+w;
  const p=s.phaseHypothesis||'UNPROVEN';
  phases[p]=(phases[p]||0)+w;
  if(PRODUCTIVE.has(quality))productive+=w;
  if(STERILE.has(quality)||s.temporalQuality==='EXHAUSTED'||s.temporalQuality==='ABSORBED')sterile+=w;
  if(quality!=='UNCLASSIFIED')qualitiesKnown+=w;
  if(mk!=='UNKNOWN')marketKnown+=w;
  for(const k of metricFields){
   if(num(s[k])===null)continue;
   metrics[k].total+=Number(s[k])*w;
   metrics[k].weight+=w;
  }
 }
 const agg=Object.fromEntries(metricFields.map(k=>[k,
   metrics[k].weight?round(metrics[k].total/metrics[k].weight,3):null]));
 const first=members[0]||null,last=members.at(-1)||null;
 const path=members.filter(x=>num(x.price)!==null).map(x=>x.price);
 const favorite=Object.entries(dirs).filter(([k])=>['long','short'].includes(k))
   .sort((a,b)=>b[1]-a[1])[0];
 const dominant= favorite&&favorite[1]>occupied*.50?favorite[0]:null;
 const net=path.length>=2?path.at(-1)-path[0]:null;
 const dirNet=dominant&&net!==null?(dominant==='long'?net:-net):null;
 const peak=dominant&&path.length?
   Math.max(0,...path.map(x=>(dominant==='long'?1:-1)*(x-path[0]))):null;
 const retention=peak>0?Math.max(0,dirNet)/peak:null;
 const native3=new Set(members.filter(x=>finite(x.lastE3Ts)).map(x=>x.lastE3Ts));
 const native15=new Set(members.filter(x=>finite(x.lastE15Ts)).map(x=>x.lastE15Ts));
 return {
  startAt:from,endAt:from+SLOT_MS,throughAt:until,
  partial:until<from+SLOT_MS,expectedSeconds:round(expected/1000,1),
  observedSeconds:round(occupied/1000,1),
  samples:members.length,coverageFraction:expected?round(occupied/expected,3):0,
  qualityCoverageFraction:occupied?round(qualitiesKnown/occupied,3):0,
  marketCoverageFraction:occupied?round(marketKnown/occupied,3):0,
  qualityFractions:sumShare(counts,occupied),
  directionFractions:sumShare(dirs,occupied),
  marketFractions:sumShare(market,occupied),
  travelFractions:sumShare(travel,occupied),
  phaseFractions:sumShare(phases,occupied),
  productiveShare:occupied?round(productive/occupied,3):null,
  sterileShare:occupied?round(sterile/occupied,3):null,
  meanEffortVsP75:agg.effortVsP75,
  meanYieldVsP75:agg.yieldVsP75,
  meanYieldUsdPerBtc:agg.yieldUsdPerBtc,
  meanCadence:agg.cadence,
  meanFlowBtcPerSec:agg.flowBtcPerSec,
  meanPmLive:agg.pmLive,meanPm3:agg.pm3,meanPm5:agg.pm5,
  meanEfficiency3m:agg.efficiency3m,meanLbw15:agg.lbw15,
  priceStart:first?.price??null,priceEnd:last?.price??null,
  priceHigh:path.length?Math.max(...path):null,
  priceLow:path.length?Math.min(...path):null,
  priceMoveUsd:net===null?null:round(net,2),
  dominantDirection:dominant,
  priceRetainedFraction:retention===null?null:round(retention,3),
  latestMarketState:last?.marketState||'UNKNOWN',
  latestPhaseHypothesis:last?.phaseHypothesis||'UNPROVEN',
  latestMfMemoryDirection:last?.mf15Direction||null,
  lastE3UniqueSources:native3.size,
  lastE15UniqueSources:native15.size,
  evidence:'COVERED_30S_SNAPSHOTS_ONLY',
 };
}
function regime(buckets,now){
 const ms=buckets.map(b=>b.observedSeconds*1000),total=ms.reduce((a,b)=>a+b,0);
 const elapsed=buckets.reduce((a,b)=>a+b.expectedSeconds*1000,0);
 const cover=elapsed?total/elapsed:0;
 const dirTimes={long:0,short:0,contested:0};
 let wasted=0,prod=0,strong=0,easy=0;
 for(const b of buckets){
  const w=b.observedSeconds*1000;
  for(const k of ['long','short','contested'])dirTimes[k]+=w*(b.directionFractions[k]||0);
  wasted+=w*(b.sterileShare||0);
  prod+=w*(b.productiveShare||0);
  strong+=w*((b.qualityFractions.POWERFUL||0)+(b.qualityFractions.EXCEPTIONAL||0));
  easy+=w*(b.qualityFractions.EASY||0);
 }
 const denominator=dirTimes.long+dirTimes.short+dirTimes.contested;
 const shares=sumShare(dirTimes,denominator);
 const primary=shares.long>=shares.short?'long':'short';
 const dominant=shares[primary]||0;
 const last=buckets.at(-1),recentDirection=last?.dominantDirection||null;
 const prior=buckets.slice(0,-1);
 const priorWeight=prior.reduce((sum,b)=>sum+b.observedSeconds,0);
 const priorDirection=priorWeight?
  (prior.reduce((sum,b)=>sum+b.observedSeconds*(b.directionFractions.long||0),0) >=
   prior.reduce((sum,b)=>sum+b.observedSeconds*(b.directionFractions.short||0),0)?'long':'short'):null;
 let classification='COVERAGE_INSUFFICIENT';
 const qualityCoverage=total?buckets.reduce((sum,b)=>sum+b.observedSeconds*1000*b.qualityCoverageFraction,0)/total:0;
 // Tunable observational thresholds, NOT validated economic gates.
 if(cover>=.60&&qualityCoverage>=.65){
  if(priorDirection&&recentDirection&&recentDirection!==priorDirection&&
      last.coverageFraction>=.4&&
      (last.directionFractions[recentDirection]||0)>=.55)
    classification='TRANSITION_UNCONFIRMED';
  else if(priorDirection&&recentDirection===priorDirection&&
      priorWeight>0&&last.coverageFraction>=.4&&
      last.sterileShare!==null&&last.sterileShare>=.45 &&
      (last.meanYieldVsP75===null||last.meanYieldVsP75<.85))
    classification='WEAKENING';
  else if((shares.contested||0)>=.23||
      ((shares.long||0)>=.25&&(shares.short||0)>=.25))
    classification='ASYMMETRIC_CONTEST';
  else if(dominant>=.62&&primary==='long')
    classification='PERSISTENT_LONG';
  else if(dominant>=.62&&primary==='short')
    classification='PERSISTENT_SHORT';
  else classification='ASYMMETRIC_CONTEST';
 }
 return {classification,asOf:now,coverageFraction:round(cover,3),
   qualityCoverageFraction:round(qualityCoverage,3),
   directionFractions:shares,observedMinutes:round(total/60000,1),
   productiveShare:total?round(prod/total,3):null,
   sterileShare:total?round(wasted/total,3):null,
   easyShare:total?round(easy/total,3):null,
   strongShare:total?round(strong/total,3):null,
   priorDirection,recentDirection,
   reliability:'COVERAGE_BASED_NOT_CALIBRATED_WIN_PROBABILITY',
   note:'Regime is a descriptive four-slot state, not an independent MCB vote'};
}
function snapshot(samples,at){
 // At the exact 15m boundary the most recent complete bar remains
 // the fourth slot until the first real observation of the new bar.
 const current=Math.floor((at-1)/SLOT_MS)*SLOT_MS,buckets=[];
 for(let i=3;i>=0;i--)buckets.push(slot(samples,current-i*SLOT_MS,at));
 return {asOf:at,buckets,regime:regime(buckets,at),
   scope:'EXPERIMENTAL_4X15_AS_OF_OBSERVATION',
   liquiditySemantics:'FLOW_BTC_PER_SEC_IS_AGGRESSIVE_TRADE_FLOW_PROXY_NOT_ORDERBOOK_DEPTH; DO_NOT_ADD_OVERLAPPING_PM_WINDOWS'};
}
function corroboration(ticker,direction){
 const r=ticker?.regime||{};
 if(!direction||!['long','short'].includes(direction))return 'DIRECTION_UNRESOLVED';
 if(r.classification==='COVERAGE_INSUFFICIENT')return 'LOW_COVERAGE';
 if(r.classification==='TRANSITION_UNCONFIRMED'||r.classification==='ASYMMETRIC_CONTEST')
  return 'REGIME_CONTESTED';
 if(r.classification==='WEAKENING')return 'WEAKENING_NOT_DIRECTIONAL_CONFIRMED';
 const isLong=r.classification==='PERSISTENT_LONG';
 const isShort=r.classification==='PERSISTENT_SHORT';
 if((isLong&&direction==='long')||(isShort&&direction==='short'))
  return 'REGIME_ALIGNED';
 if((isLong&&direction==='short')||(isShort&&direction==='long'))
  return 'REGIME_OPPOSED';
 return 'REGIME_UNRESOLVED';
}
module.exports={SLOT_MS,PRODUCTIVE,STERILE,travelState,sampleOf,slot,regime,
 snapshot,corroboration};
