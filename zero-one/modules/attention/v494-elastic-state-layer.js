'use strict';
// BOONOLAB: timestamped state layer for V494 Elastic; no trading authority.
const VERSION='v494-elastic-state-layer-v0.1';
const GROUPS=Object.freeze([
 ['CONVERSION_QUALITY','QUALITÉ CONVERSION','V493_P75_CLASSIFIER',
  ['SILENT','INEFFICIENT','PRODUCTIVE','EASY','POWERFUL','EXCEPTIONAL',
   'CONTESTED','UNCLASSIFIED']],
 ['TEMPORAL_QUALITY','QUALITÉ TEMPORELLE','EXPERIMENTAL_HYPOTHESIS',
  ['ABSORBED','EXHAUSTED','NONE','UNRESOLVED']],
 ['EFFORT_YIELD','EFFORT / RENDEMENT','V493_P75_TRAVEL_PROXY',
  ['LOW_YIELD','HIGH_EFFORT_LOW_YIELD','PRODUCTIVE_TRAVEL',
   'EASY_TRAVEL','EXTREME_PRODUCTIVE_TRAVEL','EXTREME_EASY_TRAVEL','UNKNOWN']],
 ['MARKET_REGIME','RÉGIME DU MARCHÉ','V493_MARKET_QUALITY',
  ['ACTIVE','DIRECTIONAL','MIXED','DORMANT','CHOP_SHADOW',
   'LOW_EDGE_SHADOW','UNKNOWN']],
 ['CAMPAIGN_PHASE','CAMPAGNE MCB15','EXPERIMENTAL_HYPOTHESIS',
  ['STRUCTURAL_BIAS','CONTESTED','TRANSITION_LIVE',
   'ACCEPTED_REVERSAL','BIAS_RETAINED','UNRESOLVED']],
 ['CONVERSION_PHASE','PHASE CONVERSION','EXPERIMENTAL_HYPOTHESIS',
  ['UNPROVEN','INITIATING','PRODUCTIVE','RETAINING','BREATHING',
   'REACCELERATING','EXHAUSTING','INVALIDATED']],
 ['HOUR_REGIME','RÉGIME 4×15','EXPERIMENTAL_COVERAGE_BASED',
  ['PERSISTENT_LONG','PERSISTENT_SHORT','ASYMMETRIC_CONTEST',
   'WEAKENING','TRANSITION_UNCONFIRMED','COVERAGE_INSUFFICIENT']]
]);
const CONTRACT=Object.fromEntries(GROUPS.map(([id,title,origin,labels])=>
 [id,{title,origin,labels}]));
const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const round=v=>num(v)===null?null:Math.round(Number(v)*10000)/10000;
function campaign(e,cv,old){
 const m=e?.mcb?.currentLobe||{},director=m.structuralDirection;
 if(!['long','short'].includes(director))return 'UNRESOLVED';
 const cross=m.liveZeroCross||{};
 if(cross.detected===true&&cross.confirmed!==true)
   return 'TRANSITION_LIVE';
 if(cv?.quality==='CONTESTED'||(cv?.direction&&cv.direction!==director))
   return 'CONTESTED';
 if(['CONTESTED','TRANSITION_LIVE'].includes(old)&&cv?.direction===director)
   return 'BIAS_RETAINED';
 return 'STRUCTURAL_BIAS';
}
function extract(e,s,at){
 const current=s?.latestQuality||{},sample=s?.qualitySamples?.at(-1)||{};
 const hour=s?.tickerHour?.regime||{},cv=s?.lastConversion||{};
 const prior=s?.stateLayer?.current?.CAMPAIGN_PHASE||null;
 const dir=e?.mcb?.currentLobe?.structuralDirection||null;
 const states={
  CONVERSION_QUALITY:current.quality||'UNCLASSIFIED',
  TEMPORAL_QUALITY:current.temporalQuality||'NONE',
  EFFORT_YIELD:sample.travelState||'UNKNOWN',
  MARKET_REGIME:sample.marketState||'UNKNOWN',
  CAMPAIGN_PHASE:campaign(e,{quality:cv.quality,direction:cv.direction},prior),
  CONVERSION_PHASE:sample.phaseHypothesis||'UNPROVEN',
  HOUR_REGIME:hour.classification||'COVERAGE_INSUFFICIENT'
 };
 for(const [family,value] of Object.entries(states)){
  if(!CONTRACT[family].labels.includes(value))
   throw Error('STATE_LAYER_UNKNOWN_VALUE_'+family+'_'+String(value).slice(0,60));
 }
 return {
  version:VERSION,asOf:at,price:round(e?.price),states,
  sources:{
   v494MarketTs:num(e?.marketTimestamp),
   mcb15AnchorTs:num(e?.mcb?.currentLobe?.startTs),
   mcb15Direction:dir,
   mcb15StructuralState:e?.mcb?.currentLobe?.structuralState||null,
   e3SourceTs:num(sample.lastE3Ts),e15SourceTs:num(sample.lastE15Ts),
   tickerObservationTs:num(e?.ticker?.current?.ts),
   hourCoverage:round(hour.coverageFraction),
   qualityCoverage:round(hour.qualityCoverageFraction)
  },
  measurements:{
   pmLiveUsd:round(current.pmLive),pm3Usd:round(current.pm3),
   pm5Usd:round(current.pm5),
   yieldVsP75:round(current.yieldVsP75),
   yieldVsP95:round(current.yieldVsP95),
   effortVsP75:round(current.effortVsP75),
   aggressiveFlowBtcPerSec:round(sample.flowBtcPerSec),
   cadence:round(sample.cadence),
   mfMemoryDirection:sample.mf15Direction||null,
   mcb15Direction:dir,rangeLow:round(s?.range2h?.low),
   rangeHigh:round(s?.range2h?.high),
   edgePosition:round(s?.range2h?.positionFraction),
   tickerRange:'4x15_MINUTES',
   passiveLiquidity:'NOT_MEASURED'
  },
  kind:'STATE_SNAPSHOT',
  decisionImpact:false,brokerOrdersEnabled:false
 };
}
function initial(){
 return {version:VERSION,mode:'SHADOW_ONLY',decisionImpact:false,
   brokerOrdersEnabled:false,lastAsOf:0,nextSeq:0,current:{},
   latestTransitions:[],counts:{},seenValues:{},lastSnapshot:null};
}
function validate(x){
 if(!x||x.version!==VERSION||x.decisionImpact!==false||
    x.brokerOrdersEnabled!==false||x.mode!=='SHADOW_ONLY'||
    !Array.isArray(x.latestTransitions))throw Error('BAD_STATE_LAYER_CONTRACT');
 return x;
}
function observe(old,snapshot){
 const s=validate(old||initial());
 if(!snapshot||snapshot.version!==VERSION||
    snapshot.decisionImpact!==false||snapshot.brokerOrdersEnabled!==false)
  throw Error('BAD_STATE_LAYER_SNAPSHOT');
 const ts=num(snapshot.asOf);
 if(ts===null||ts<=s.lastAsOf)return {state:s,transitions:[],changed:false};
 if(s.lastAsOf&&ts-s.lastAsOf>90000)s.current={};
 const wasEmpty=s.lastAsOf===0,changes=[];
 for(const [family,title,origin] of GROUPS){
  const to=snapshot.states[family],from=s.current[family]??null;
  if(from===to)continue;
  const entry={
   version:VERSION,seq:++s.nextSeq,id:String(ts)+'|'+family,
   family,title,origin,
   at:ts,asOf:ts,sourceAt:snapshot.sources.v494MarketTs,
   price:snapshot.price,from,to,
   transition:wasEmpty?'BOOTSTRAP_OBSERVED':
     from===null?'AFTER_GAP_OR_NEW':'CHANGED',
   campaignAnchorTs:snapshot.sources.mcb15AnchorTs,
   mcb15Direction:snapshot.sources.mcb15Direction,
   sourceTs:snapshot.sources.e15SourceTs,
   dataStatus:'V494_FRESH_AS_OF',
   researchOnly:origin.startsWith('EXPERIMENTAL'),
   decisionImpact:false,brokerOrdersEnabled:false
  };
  s.current[family]=to;
  s.counts[family]=(s.counts[family]||0)+1;
  s.seenValues=s.seenValues||{};
  s.seenValues[family]=s.seenValues[family]||{};
  s.seenValues[family][to]=(s.seenValues[family][to]||0)+1;
  changes.push(entry);s.latestTransitions.push(entry);
 }
 s.latestTransitions=s.latestTransitions.slice(-24);
 s.lastAsOf=ts;s.lastSnapshot=snapshot;
 return {state:s,transitions:changes,changed:true};
}
function summary(s){
 s=validate(s);
 return {
  version:VERSION,mode:'SHADOW_ONLY',decisionImpact:false,
  brokerOrdersEnabled:false,asOf:s.lastAsOf,
  vocabulary:GROUPS.map(([family,title,origin,labels])=>
   ({family,title,origin,labels})),
  current:Object.fromEntries(GROUPS.map(([f])=>[f,s.current[f]||null])),
  counts:s.counts,seenValues:s.seenValues||{},
  latestTransitions:s.latestTransitions.slice(-16).reverse(),
  provenance:'Factual V494 qualities, P75 ticker, marketQuality; experimental phases separated',
  caveats:[
   'No fake backfill before activation',
   'Passive/hidden orderbook liquidity NOT measured',
   'Ticker and Elastic share inputs and do not form independent votes'
  ]};
}
module.exports={VERSION,GROUPS,CONTRACT,campaign,extract,initial,validate,observe,summary};
