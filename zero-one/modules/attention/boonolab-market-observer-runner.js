'use strict';
// BOONOLAB independent observer. No engine step, no broker, no PAPER writer.
const fs=require('node:fs'),path=require('node:path');
const reg=require('./boonolab-regime-observer');
const chr=require('./boonolab-causal-chronicle');
const pos=require('./boonolab-position-attention');
// Experimental independent practicability shadow, deliberately on the
// EXISTING observer process. It never changes V543/V553 PAPER authority.
const practical=require('./boonolab-market-practicability-shadow');
const place=require('./boonolab-place-e1e4-shadow');
const {appendRotatingNdjson,readRecentNdjson}=
 require('../v3lab/storage/rotating-ndjson');
const DATA=path.resolve(__dirname,'../../data');
const FILE={
 audit:path.join(DATA,'audit-history.json'),
 paper:path.join(DATA,'v52-paper-state.json'),
 elastic:path.join(DATA,'v494-elastic-state-summary.json'),
 native:path.join(DATA,'elastic-observer-events.ndjson'),
 state:path.join(DATA,'boonolab-market-observer-state.json'),
 summary:path.join(DATA,'boonolab-market-observer-summary.json'),
 events:path.join(DATA,'boonolab-market-events.ndjson'),
 samples:path.join(DATA,'boonolab-market-snapshots.ndjson'),
 practicabilityState:path.join(DATA,'boonolab-practicability-shadow-state.json'),
 practicabilitySummary:path.join(DATA,'boonolab-practicability-shadow-summary.json'),
 practicabilitySamples:path.join(DATA,'boonolab-practicability-shadow-samples.ndjson'),
 practicabilityEvents:path.join(DATA,'boonolab-practicability-shadow-events.ndjson')};
const json=(f,alt=null)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}
 catch(e){if(e.code==='ENOENT')return alt;throw e;}};
function atomic(f,val){const tmp=f+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(val));fs.renameSync(tmp,f);}
function inputs(){
 const audit=json(FILE.audit),paper=json(FILE.paper);
 if(!Array.isArray(audit)||!paper||paper.brokerOrdersEnabled!==false||
    !paper.latestAnalysis)throw Error('BOONOLAB_OBSERVER_SOURCE_UNAVAILABLE');
 const analysis=paper.latestAnalysis,asOf=Number(analysis.asOf);
 const recent=audit.filter(x=>Number.isFinite(x.ts)&&x.ts<=asOf);
 const last=recent.at(-1);
 if(!last||!Number.isFinite(asOf)||Date.now()-asOf>95000||
  asOf-last.ts>95000||last.ts>asOf||last.lastPrice<=0)
  throw Error('BOONOLAB_OBSERVER_STALE_AS_OF');
 const native=readRecentNdjson(FILE.native,250).filter(e=>
  Number.isFinite(Number(e.observedAt))&&e.observedAt<=asOf);
 const elastic=json(FILE.elastic,{});
 const elasticAt=Number(elastic?.asOf);
 const elasticFresh=Number.isFinite(elasticAt)&&elasticAt<=asOf&&
  asOf-elasticAt<=90000;
 return {audit:recent,paper,analysis,asOf,last,native,
  // V494 PAPER is retired. NEVER report frozen Elastic as a live vote.
  elasticState:elasticFresh?elastic:{}};
}
function initial(){return {version:'boonolab-observer-runner-v0.1',
  decisionImpact:false,brokerOrdersEnabled:false,lastAt:0,
  chronicle:chr.initial(),position:pos.initial(),regime:null,observations:0,
  startedAt:Date.now()};}
function checkOnly(){
 const x=inputs(),state=initial();
 const regime=reg.evaluate(x.audit,x.asOf,{
  parent:x.analysis.readings?.structural54?.director||null,
  context4h:x.analysis.readings?.mcb15?.context4h||null});
 const position=pos.probe({position:x.paper.position,audit:x.audit,
  asOf:x.asOf,analysis:x.analysis,regime});
 console.log(JSON.stringify({version:state.version,asOf:x.asOf,
  ageMs:Date.now()-x.asOf,regime:regime.label,
  uncertainty:regime.uncertainty,position:position.status,
  nativeEventsAvailable:x.native.length,paperCompleted:x.paper.completed,
  mode:'SHADOW_ONLY',brokerOrdersEnabled:false,decisionImpact:false},null,2));
}
function replay182(){
 const audit=json(FILE.audit);
 const paper=json(FILE.paper);
 const trade=(paper?.history||[]).find(t=>t.tradeNo===182);
 if(!trade)throw Error('REPLAY_182_NOT_IN_LEDGER');
 const position={entryAt:trade.entryAt,entryPrice:trade.entryPrice,
   direction:trade.direction,notionalUsd:trade.notionalUsd,
   campaignId:trade.entryContext?.causalChain?.campaignId||null};
 const q=audit.filter(x=>x.ts>=trade.entryAt&&x.ts<=trade.exitAt)
  .sort((a,b)=>a.ts-b.ts),first=[],changes=[];
 let prior='';
 for(const x of q){
  const v=pos.probe({position,audit,asOf:x.ts});
  if(v.valid&&v.status!==prior){
   changes.push({at:x.ts,price:v.price,status:v.status,
    best:v.bestObservedPrice,adverse60:v.adverse60sUsd,
    giveback:v.fractionGivenBack,flowRelative:v.flowRelative,
    hypotheticalNetIfClosed:v.netIfClosedOnObservedPriceUsd});
   if(!first.length&&['MATERIAL_COUNTERATTACK',
    'COUNTERATTACK_WITH_AGGRESSIVE_FLOW'].includes(v.status))
     first.push(changes.at(-1));
   prior=v.status;
  }
 }
 console.log(JSON.stringify({replay:'HISTORICAL_AS_OF_AUDIT_ONLY_NOT_LIVE',
  tradeNo:182,entryAt:trade.entryAt,actualExitAt:trade.exitAt,
  actualNetUsd:trade.netPnlUsd,observedAuditSnapshots:q.length,
  firstAttention:first[0]||null,transitions:changes,
  note:'No MF/PM inserted from future paper decision; no broker fills.'},null,2));
}
// Independent, NO additional PM2 service. A failure of the new shadow may
// not interrupt the original market observer, its chronicle, or the PAPER.
const MCP=path.resolve(__dirname,'../../../data/mcb-live');
const onePath=path.join(MCP,'mcb_1h.csv'),
 fourPath=path.join(MCP,'mcb_4h.csv'),
 levelsPath=path.join(DATA,'levels.json');
const shadowCache=new Map();
function cachedClosed(file,tf){
 const stamp=fs.statSync(file).mtimeMs, prior=shadowCache.get(file);
 if(prior&&prior.stamp===stamp)return prior.bars;
 const bars=place.parseMcbCsv(fs.readFileSync(file,'utf8'),tf);
 shadowCache.set(file,{stamp,bars});return bars;
}
function practicabilityTick(x){
 const state=json(FILE.practicabilityState,null)||
  practical.initial(x.asOf);
 if(state.version!==practical.VERSION||state.decisionImpact!==false||
    state.brokerOrdersEnabled!==false)
  throw Error('PRACTICABILITY_SHADOW_STATE_MIGRATION_REQUIRED');
 if(x.asOf<=state.lastAt)return false;
 const e1=cachedClosed(onePath,'1h'),e4=cachedClosed(fourPath,'4h');
 const levelStat=fs.statSync(levelsPath);
 const sample=practical.evaluate({audit:x.audit,asOf:x.asOf,
  bars1h:e1,bars4h:e4,
  levels:JSON.parse(fs.readFileSync(levelsPath,'utf8')),
  levelsMtime:levelStat.mtimeMs});
 const prior=state.last?.proposed||{};
 if(!practical.observe(state,sample))return false;
 atomic(FILE.practicabilityState,state);
 atomic(FILE.practicabilitySummary,practical.summary(state));
 appendRotatingNdjson(FILE.practicabilitySamples,{asOf:x.asOf,
  source:'OBSERVED_BATON_AND_CONFIRMED_E1E4_ASOF',
  mode:'SHADOW_ONLY',brokerOrdersEnabled:false,decisionImpact:false,
  covered:sample.coverage.ready,proposed:sample.proposed,
  measurements:sample.measurements,higher:sample.higher,
  place:sample.place,
  waveGeometry:sample.waveGeometry},{
   maxBytes:4*1024*1024,maxSegments:12});
 const changed=Object.keys(practical.VARIANTS).filter(key=>
  prior[key]?.proposedClosed!==sample.proposed[key].proposedClosed);
 if(changed.length)appendRotatingNdjson(FILE.practicabilityEvents,{
  version:practical.VERSION,asOf:x.asOf,type:'PROPOSED_ADMISSION_MARKET_CHANGED',
  changed,
  states:Object.fromEntries(changed.map(key=>[key,sample.proposed[key]])),
  decisionImpact:false,brokerOrdersEnabled:false},
  {maxBytes:4*1024*1024,maxSegments:12});
 return true;
}
function main(){
 if(process.argv.includes('--test-read'))return checkOnly();
 if(process.argv.includes('--replay-182'))return replay182();
 let s=json(FILE.state,null);
 if(!s)s=initial();
 if(s.version!=='boonolab-observer-runner-v0.1'||
  s.decisionImpact!==false||s.brokerOrdersEnabled!==false||
  s.chronicle?.version!==chr.VERSION||s.position?.version!==pos.VERSION)
  throw Error('BOONOLAB_OBSERVER_STATE_MIGRATION_REQUIRED_HALTED');
 console.log('[BOONOLAB MARKET SHADOW] '+JSON.stringify({
  version:s.version,lastAt:s.lastAt,observations:s.observations,
  decisionImpact:false,brokerOrdersEnabled:false}));
 let busy=false,errors=0;
 function tick(){
  if(busy)return;busy=true;
  try{
   const x=inputs();
   if(x.asOf<=s.lastAt)return;
   const regime=reg.evaluate(x.audit,x.asOf,{
    parent:x.analysis.readings?.structural54?.director||null,
    context4h:x.analysis.readings?.mcb15?.context4h||null});
   const beforePos=pos.observe(s.position,{
    position:x.paper.position,audit:x.audit,asOf:x.asOf,
    analysis:x.analysis,regime,paperHistory:x.paper.history||[]});
   s.position=beforePos.state;
   const chron=chr.observe(s.chronicle,{asOf:x.asOf,
    price:x.last.lastPrice,analysis:x.analysis,regime,
    threat:s.position.current,elasticState:x.elasticState,native:x.native});
   s.chronicle=chron.state;
   const positionEvents=beforePos.events.map(e=>({
    ...e,version:chr.VERSION,seq:++s.chronicle.nextSeq,
    id:s.chronicle.nextSeq,knownAt:e.at,sourceAt:e.at,
    origin:'POSITION_ATTENTION_OBSERVATION_ONLY',
    brokerOrdersEnabled:false,decisionImpact:false}));
   for(const e of positionEvents){
    s.chronicle.lastEvents.unshift(e);
    s.chronicle.counts.CONTEXT=(s.chronicle.counts.CONTEXT||0)+1;
   }
   s.chronicle.lastEvents=s.chronicle.lastEvents.slice(0,40);
   for(const e of [...chron.events,...positionEvents])
    appendRotatingNdjson(FILE.events,e,{maxBytes:4*1024*1024,
     maxSegments:14});
   appendRotatingNdjson(FILE.samples,{version:s.version,asOf:x.asOf,
    price:x.last.lastPrice,regimeLabel:regime.label,
    intensity:regime.intensity,productivity:regime.productivity,
    regimeMetrics:regime.metrics?.lastHour,
    twoHour:regime.twoHour,
    positionAttention:s.position.current?.status||'NO_POSITION',
    positionAttentionMetrics:s.position.current?.valid?
    {adverse60sUsd:s.position.current.adverse60sUsd,
     peakAt:s.position.current.bestObservedAt,
     givebackFraction:s.position.current.fractionGivenBack,
     hypotheticalNetUsd:s.position.current.netIfClosedOnObservedPriceUsd}:null,
    decisionImpact:false,brokerOrdersEnabled:false},
    {maxBytes:4*1024*1024,maxSegments:20});
   s.regime=regime;s.lastAt=x.asOf;s.observations++;
   atomic(FILE.state,s);
   atomic(FILE.summary,{...chr.summary(s.chronicle,regime,s.position),
    startedAt:s.startedAt,observations:s.observations,
    paperPositionEntryAt:x.paper.position?.entryAt||null,
    paperCompleted:x.paper.completed,
    latestPaperDecision:{action:x.analysis.action,reason:x.analysis.reason,
     asOf:x.analysis.asOf},
    freshAtWrite:Date.now()});
   // Isolated from all legacy observer state and PM2 control.
   try{practicabilityTick(x);}catch(e){
    console.error('[PRACTICABILITY OBSERVATION ONLY] '+(e.stack||e));}
   errors=0;
  }catch(e){if(++errors<=5||errors%20===0)
   console.error('[BOONOLAB MARKET SHADOW ERROR] '+e.stack);}
  finally{busy=false;}
 }
 tick();setInterval(tick,10000);
}
if(require.main===module)main();
module.exports={inputs,initial,checkOnly,replay182,
 practicabilityTick,cachedClosed};
