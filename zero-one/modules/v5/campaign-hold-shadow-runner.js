'use strict';
// BOONO V5.4.3 — independently running shadow observer.
// NO import of PAPER step, broker, order service, or any live-state writer.
const fs=require('fs'),path=require('path');
const stream=require('../price-stream');
const {latest}=require('./runner-v543');
const decision=require('./decision-v543');
const causal=require('./v53-causal');
const model=require('./campaign-hold-shadow');
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const PAPER=path.join(DATA,'v52-paper-state.json');
const STATE=path.join(DATA,'v543-campaign-hold-shadow-state.json');
const EVENTS=path.join(DATA,'v543-campaign-hold-shadow-events.ndjson');
const SUMMARY=path.join(DATA,'v543-campaign-hold-shadow-summary.json');
const TICKS=path.join(DATA,'v543-campaign-hold-shadow-ticks.ndjson');
const json=(file,fallback)=>{
 try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(_){return fallback;}
};
function atomic(filename,data){
 const tmp=filename+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(data));fs.renameSync(tmp,filename);
}
function evalPosition(position,variant,input,ts,paper,tickAge){
 // Virtual position makes V541 recompute the genuine position-specific
 // structural exit after the baseline V5 floor has closed the original.
 return decision.evaluate({...input,now:ts,price:input.virtualPrice,
  startedAt:paper.policyActivatedAt||paper.startedAt,
  position,
  sourceAgeMs:ts-input.last.ts,tickAgeMs:tickAge,
  previousAttention:variant.previousAttention,
  previousOffensiveMaturity:variant.previousOffensiveMaturity,
  lastExitAt:null,v493AdmissionAsOf:null});
}
function provedTerritory(position,input,ts){
 const closed=(input.bars3||[]).filter(b=>b.ts+180000<=ts&&
  Number.isFinite(b.high)&&Number.isFinite(b.low));
 const scales=closed.slice(-24).map(x=>x.high-x.low).sort((a,b)=>a-b);
 const median3=scales.length?scales[Math.floor(scales.length/2)]:60;
 const place=causal.mapPlace({now:ts,price:input.virtualPrice,
  dir:position.direction,bars3:input.bars3,bars15:input.bars15,
  levels:input.levels,median3,base:{}});
 return place.invalidation;
}
function main(){
 const flags=new Set(process.argv.slice(2));
 const paper=json(PAPER,null);
 if(!paper||paper.brokerOrdersEnabled!==false)
  throw Error('SHADOW_REFUSE_NON_PAPER_OR_MISSING_BASELINE');
 if(flags.has('--test-read')){
  const x=latest();
  console.log(JSON.stringify({mode:'READ_ONLY',policy:model.VERSION,
   recentAuditTs:x.last?.ts,paperEntryAt:paper.position?.entryAt||null,
   actualCompleted:paper.completed,brokerOrdersEnabled:false},null,2));
  return;
 }
 let state=json(STATE,null);
 if(!state)state=model.initial(Date.now(),paper.position);
 state=model.migrate(state);
 if(state.version!==model.VERSION||state.brokerOrdersEnabled!==false)
  throw Error('SHADOW_INCOMPATIBLE_STATE_HALTED');
 let busy=false,lastSave=0,errorCount=0;
 const loop=()=>{
  if(busy)return;busy=true;
  try{
   const ts=Number(stream.lastUpdateTs),px=Number(stream.lastPrice);
   if(!Number.isFinite(ts)||!Number.isFinite(px)||
      ts<=state.lastObservationAt)return;
   const paper=json(PAPER,null);
   if(!paper||paper.brokerOrdersEnabled!==false)
    throw Error('LIVE_PAPER_SOURCE_INVALID');
   const x=latest();
   if(!x.last||x.last.ts>ts)return;
   const now=Date.now(),age=now-ts;
   const tickFresh=age>=0&&age<=25000&&
    ts-x.last.ts<=95000&&ts-x.last.ts>=0&&x.health===true;
   const args={...x,virtualPrice:px};
   const result=model.step(state,{paperState:paper,now:ts,
    price:px,input:args,tickFresh,
    decide:(p,v)=>evalPosition(p,v,args,ts,paper,age),
    territoryStop:p=>provedTerritory(p,args,ts)});
   state=result.state;
   const forks=Object.values(state.variants);
   // Permanent 5s read-only trace: future replays can reproduce actual shadow
   // sampling rather than hallucinate 5s fills from 30s historical snapshots.
   if(paper.position||forks.some(v=>v.position)||result.events.length){
    appendRotatingNdjson(TICKS,{ts,price:px,auditAt:x.last.ts,tickFresh,
     baseline:{completed:paper.completed,entryAt:paper.position?.entryAt||null,
      direction:paper.position?.direction||null,entryPrice:paper.position?.entryPrice||null},
     forks:Object.fromEntries(forks.map(v=>[v.policy,{
      originTradeNo:v.position?.originTradeNo||null,
      entryAt:v.position?.entryAt||null,
      mfe:v.position?.mfePriceUsd||null,
      mae:v.position?.maePriceUsd||null,
      floor:v.position?.gainFloorUsd||null,
      decision:v.lastDecision||null,invalidation:v.lastInvalidation||null}])),
     eventTypes:result.events.map(e=>e.type+'|'+e.policy),
     brokerOrdersEnabled:false,decisionImpact:false},
     {maxBytes:4*1024*1024,maxSegments:18});
   }
   for(const e of result.events)
    appendRotatingNdjson(EVENTS,e,{maxBytes:2*1024*1024,maxSegments:8});
   if(result.events.length||now-lastSave>=30000){
    atomic(STATE,state);atomic(SUMMARY,model.summary(state));lastSave=now;
   }
   if(result.events.length)
    console.log('[V543 HOLD SHADOW] '+JSON.stringify(result.events.slice(-4)));
   errorCount=0;
  }catch(e){
   if(++errorCount<=4||errorCount%20===0)
    console.error('[V543 HOLD SHADOW ERROR] '+e.stack);
  }finally{busy=false;}
 };
 stream.on('error',e=>console.error('[V543 HOLD SHADOW STREAM] '+e.message));
 stream.start();
 console.log('[V543 HOLD SHADOW] '+JSON.stringify({version:model.VERSION,
  mode:'READ_ONLY_SHADOW',brokerOrdersEnabled:false,
  decisionImpact:false,startedAt:state.startedAt,
  lastObservationAt:state.lastObservationAt}));
 setInterval(loop,5000);
}
if(require.main===module)main();
module.exports={evalPosition,provedTerritory};
