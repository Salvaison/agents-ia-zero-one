'use strict';
// BOONOLAB independent observer. No engine step, no broker, no PAPER writer.
const fs=require('node:fs'),path=require('node:path');
const reg=require('./boonolab-regime-observer');
const chr=require('./boonolab-causal-chronicle');
const pos=require('./boonolab-position-attention');
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
 samples:path.join(DATA,'boonolab-market-snapshots.ndjson')};
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
 return {audit:recent,paper,analysis,asOf,last,native,
   elasticState:json(FILE.elastic,{})};
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
   errors=0;
  }catch(e){if(++errors<=5||errors%20===0)
   console.error('[BOONOLAB MARKET SHADOW ERROR] '+e.stack);}
  finally{busy=false;}
 }
 tick();setInterval(tick,10000);
}
if(require.main===module)main();
module.exports={inputs,initial,checkOnly,replay182};
