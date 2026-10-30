'use strict';
// Separate V4.9.4 laboratory — four independent PAPER-only virtual campaigns.
// No trading clients, no mutation of boono-v494-paper or boono-v543-paper.
const fs=require('fs'),path=require('path');
const BASE='/root/boono-v493-baseline/zero-one';
const engine=require(BASE+'/modules/v4/core/engine');
const {buildRuntimeSnapshot}=require(BASE+'/modules/v2/adapters/runtime-snapshot');
const listening=require('./listening-v494');
const causal=require('../v5/v53-causal');
const research=require('./v494-dual-module-shadow');
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const STATE=path.join(DATA,'v494-dual-module-shadow-state.json');
const SUMMARY=path.join(DATA,'v494-dual-module-shadow-summary.json');
const EVENTS=path.join(DATA,'v494-dual-module-shadow-events.ndjson');
const ORIGINAL=path.join(DATA,'v494-paper-state.json');
const THREE=180000,FIFTEEN=900000,INTERVAL_MS=30000;
function read(p,alt){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(_){return alt;}}
function write(p,obj){
 const tmp=p+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(obj));
 fs.renameSync(tmp,p);
}
function median(xs){
 const v=xs.filter(Number.isFinite).sort((a,b)=>a-b);
 return v.length?v[Math.floor(v.length/2)]:60;
}
function entryAnchor({frame,direction}){
 // Proposed initial risk from the V5 causal swing/territory reader.
 // This is OBSERVATIONAL in V494 lab and not the original V493 risk law.
 const at=frame.market.timestamp,price=frame.market.price;
 const tf=frame.sources?.mcb?.tfs||{};
 const bars3=(tf['3m']?.history||[]).filter(b=>b.ts+THREE<=at);
 const bars15=(tf['15m']?.history||[]).filter(b=>b.ts+FIFTEEN<=at);
 const r3=median(bars3.slice(-24).map(b=>b.high-b.low));
 const data=causal.mapPlace({now:at,price,dir:direction,bars3,bars15,
  levels:frame.sources?.levels||[],median3:r3,base:{}});
 const x=data.invalidation;
 return x?{price:x.price,reference:x.reference,kind:x.kind,
  confirmedAvailableAt:x.confirmedAvailableAt,sourceTs:x.sourceTs,
  distanceUsd:x.distanceUsd,underlyingLevel:x.underlyingLevel,
  source:'V5_LIKE_CAUSAL_ANCHOR_IN_SHADOW_ONLY'}:null;
}
function readRealComparison(s,ts){
 const real=read(ORIGINAL,null);
 if(!real||real.brokerOrdersEnabled!==false)return null;
 const actualAt=Number(real.lastObservationAt||0);
 const base=s.branches.EXACT_V493__FROZEN_V493;
 const live=real.position||null,virtual=base?.position||null;
 const sameExposure=!!(!live&&!virtual||
  live&&virtual&&live.direction===virtual.direction&&
  Math.abs(live.entryAt-virtual.entryAt)<=60000);
 return {at:ts,actualAt,sourceAgeMs:ts-actualAt,
  actualCompleted:real.completed,
  baselineCompleted:base?.completed||0,
  comparableAtSameStep:Math.abs(ts-actualAt)<=60000,
  sameExposure,actualPosition:live?.direction||'FLAT',
  shadowPosition:virtual?.direction||'FLAT',
  note:'Late-start shadow memory and 30s sampling may differ from active V494'};
}
function seedHistoricalMemoryIfFlat(s,real){
 if(s.bootstrapStatus)return;
 const routes=Object.values(s.branches||{});
 const eligible=routes.every(b=>!b.position&&!b.entries&&!b.completed);
 if(!eligible||!real||real.position||!real.priorEval){
  s.bootstrapStatus='NO_FLAT_V494_MEMORY_SEED';
  return;
 }
 const srcAt=Number(real.priorEval.marketTimestamp||0);
 if(srcAt<1||srcAt>Date.now()+30000){
  s.bootstrapStatus='REFUSED_CAUSAL_TIMESTAMP';
  return;
 }
 for(const branch of routes){
  branch.prevEval=JSON.parse(JSON.stringify(real.priorEval));
  if(real.temporalAttention?.version==='boono-attention-v0.2')
   branch.previousAttention=JSON.parse(JSON.stringify(real.temporalAttention));
 }
 s.bootstrapStatus='SEED_FROM_FLAT_V494_WITHOUT_TRADES';
 s.bootstrapSourceAt=srcAt;
}
function run(){
 const flags=new Set(process.argv.slice(2));
 const real=read(ORIGINAL,null);
 if(!real||real.brokerOrdersEnabled!==false)throw Error('SHADOW_REFUSES_MISSING_V494_PAPER');
 if(flags.has('--test-read')){
  const frame=buildRuntimeSnapshot(),e=engine.evaluate(frame,null,null);
  console.log(JSON.stringify({mode:'READ_ONLY',version:research.VERSION,
   gitRef:'cdf1936',asOf:frame.market.timestamp,price:frame.market.price,
   entryCandidate:e.action?.type,asOfAgeMs:Date.now()-frame.market.timestamp,
   fourBranches:research.ROUTES.map(x=>x.id),brokerOrdersEnabled:false}));
  return;
 }
 let s=read(STATE,null);
 if(!s)s=research.initial(Date.now());
 s=research.migrate(s);
 seedHistoricalMemoryIfFlat(s,real);
 if(s.version!==research.VERSION||s.brokerOrdersEnabled!==false||
  s.decisionImpact!==false)throw Error('SHADOW_STATE_VERSION_OR_AUTHORITY_REFUSED');
 console.log('[V494 ENTRY/EXIT SHADOW] '+JSON.stringify({version:research.VERSION,
  versionOfFrozenV4:engine.VERSION,mode:'SHADOW_ONLY',
  brokerOrdersEnabled:false,branches:research.ROUTES.length,
  startedAt:s.startedAt,warmupUntil:s.warmupUntil,bootstrap:s.bootstrapStatus}));
 let busy=false,failures=0;
 function tick(){
  if(busy)return;busy=true;
  try{
   const frame=buildRuntimeSnapshot();
   const at=Number(frame.market?.timestamp);
   if(!at||at<=s.lastObservationAt)return;
   const received=Date.now(),age=received-at;
   // Aged price can neither open a new position nor trigger a virtual exit.
   // A future timestamp is always rejected.
   if(age<0||age>90000)return;
   const quality=age<=90000?'DATA_OK':'DATA_DEGRADED';
   const out=research.advance(s,frame,
    {engine,listening,anchor:entryAnchor},quality);
   s=out.state;
   s.lastRealComparison=readRealComparison(s,at);
   for(const e of out.events)
    appendRotatingNdjson(EVENTS,e,{maxBytes:4*1024*1024,maxSegments:12});
   write(STATE,s);
   write(SUMMARY,{...research.summary(s),originalComparison:s.lastRealComparison});
   if(out.events.length)console.log('[V494 MODULE SHADOW EVENT] '+
    JSON.stringify(out.events.map(x=>({type:x.type,route:x.route,
     reason:x.reason,ts:x.ts,net:x.netPnlUsd})).slice(-12)));
   failures=0;
  }catch(e){if(++failures<=4||failures%20===0)
    console.error('[V494 MODULE SHADOW ERROR] '+e.stack);}
  finally{busy=false;}
 }
 setTimeout(()=>{tick();setInterval(tick,INTERVAL_MS);},12000);
}
if(require.main===module)run();
module.exports={entryAnchor,readRealComparison,seedHistoricalMemoryIfFlat};
