'use strict';
// Autonomous BOONOLAB 4x15m qualitative ticker. No V494 state, runner,
// PAPER evaluate/step, broker or event-feed writer.
const fs=require('node:fs'),path=require('node:path');
const core=require('./boonolab-ticker4x15-independent');
const {appendRotatingNdjson,readRecentNdjson}=
 require('../v3lab/storage/rotating-ndjson');
const DATA=path.resolve(__dirname,'../../data');
const FILE={
 audit:path.join(DATA,'audit-history.json'),
 markets:path.join(DATA,'boonolab-market-snapshots.ndjson'),
 state:path.join(DATA,'boonolab-ticker4x15-state.json'),
 summary:path.join(DATA,'boonolab-ticker4x15-summary.json'),
 events:path.join(DATA,'boonolab-ticker4x15-events.ndjson'),
 samples:path.join(DATA,'boonolab-ticker4x15-samples.ndjson')
};
const raw=(f,alt=null)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}
 catch(e){if(e.code==='ENOENT')return alt;throw e;}};
const atomic=(f,v)=>{const tmp=f+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(v));fs.renameSync(tmp,f);};
function recentMarkets(){
 const p=FILE.markets;
 const segment=fs.readdirSync(DATA)
  .filter(f=>/^boonolab-market-snapshots\.segment-.*\.ndjson$/.test(f))
  .sort().slice(-1)[0];
 const fromSegment=segment?
  readRecentNdjson(path.join(DATA,segment),260):[];
 return [...fromSegment,...readRecentNdjson(p,350)];
}
function getInputs(){
 const audit=raw(FILE.audit);
 if(!Array.isArray(audit)||audit.length<300)
  throw Error('TICKER_4X15_AUDIT_COVERAGE_INSUFFICIENT');
 const asOf=Number(audit.at(-1)?.ts);
 const now=Date.now(),age=now-asOf;
 if(!Number.isFinite(asOf)||age< -5000||age>95000)
  throw Error('TICKER_4X15_SOURCE_STALE age='+age);
 const markets=recentMarkets();
 return {audit,marketSnapshots:markets,asOf};
}
function initial(now=Date.now()){return{
 version:core.VERSION,mode:'SHADOW_ONLY',decisionImpact:false,
 brokerOrdersEnabled:false,startedAt:now,lastAt:0,observations:0,
 lastLabel:null,lastHourlyRegime:null,lastQuarterStart:null,
 lastMarketState:null,lastDirection:null
};}
function checkState(x){
 if(!x||x.version!==core.VERSION||x.mode!=='SHADOW_ONLY'||
   x.decisionImpact!==false||x.brokerOrdersEnabled!==false)
  throw Error('TICKER_4X15_OLD_OR_UNTRUSTED_STATE_REFUSED');
}
function evolve(state,input,{persist=true}={}){
 checkState(state);
 if(input.asOf<=state.lastAt)return {changed:false,state};
 const out=core.calculate(input);
 const last=out.current||{};
 const quarter=out.quality4x15.at(-1);
 const changes=[];
 const record=(field,prev,next)=>{
  if(prev===next)return;
  changes.push({at:input.asOf,type:'TICKER_4X15_TRANSITION',
   family:field,from:prev,to:next,
   source:out.source,decisionImpact:false,brokerOrdersEnabled:false});
 };
 record('QUALITY',state.lastLabel,last.quality||null);
 record('DIRECTION',state.lastDirection,last.direction||null);
 record('MARKET',state.lastMarketState,last.marketState||null);
 record('HOUR_REGIME',state.lastHourlyRegime,out.hourlyRegime.classification);
 record('NEW_15M',state.lastQuarterStart,quarter?.startAt||null);
 state.lastAt=input.asOf;state.observations++;
 state.lastLabel=last.quality||null;
 state.lastDirection=last.direction||null;
 state.lastMarketState=last.marketState||null;
 state.lastHourlyRegime=out.hourlyRegime.classification;
 state.lastQuarterStart=quarter?.startAt||null;
 if(persist){
  atomic(FILE.state,state);
  atomic(FILE.summary,{...out,startedAt:state.startedAt,
   observations:state.observations,
   freshAtWrite:Date.now(),status:'DATA_RECENT',
   note:'Independent qualitative ticker, no V494 PAPER/state; classifications reconstructed from observed audit as-of. Volume 1m attached by authenticated read-only Watch API.'});
  appendRotatingNdjson(FILE.samples,{at:input.asOf,
   quality:last.quality,direction:last.direction,
   market:last.marketState,pm3:last.pm3,pm5:last.pm5,
   price:out.price,effortVsP75:last.effortVsP75,
   yieldVsP75:last.yieldVsP75,
   quarterStart:quarter?.startAt,
   qualityCoverage:quarter?.qualityCoverageFraction,
   source:out.source,mode:'SHADOW_ONLY',
   brokerOrdersEnabled:false,decisionImpact:false},
   {maxBytes:4*1024*1024,maxSegments:8});
  for(const item of changes)
   appendRotatingNdjson(FILE.events,item,
    {maxBytes:4*1024*1024,maxSegments:8});
 }
 return {changed:true,state,summary:out,events:changes};
}
function main(){
 const input=getInputs(),state=raw(FILE.state,null)||initial();
 if(process.argv.includes('--test-read')){
  const r=evolve(initial(),input,{persist:false});
  const s=r.summary;
  console.log(JSON.stringify({mode:'READ_ONLY_TEST',version:s.version,
   asOf:s.asOf,status:'TEST_ONLY',current:s.current,
   hourlyRegime:s.hourlyRegime,
   quality4x15:s.quality4x15.map(x=>({
    startAt:x.startAt,samples:x.samples,coverage:x.coverageFraction,
    qualityFractions:x.qualityFractions,
    directionFractions:x.directionFractions,
    marketFractions:x.marketFractions
   })),decisionImpact:false,brokerOrdersEnabled:false},null,2));
  return;
 }
 checkState(state);
 console.log('[BOONOLAB TICKER 4X15 SHADOW] '+
  JSON.stringify({version:core.VERSION,lastAt:state.lastAt,mode:state.mode,
   paperSource:'NONE',brokerOrdersEnabled:false,decisionImpact:false}));
 let busy=false,errors=0;
 const tick=()=>{
  if(busy)return;busy=true;
  try{
   const i=getInputs();
   evolve(state,i);
   errors=0;
  }catch(e){
   if(++errors<=5||errors%30===0)
    console.error('[BOONOLAB TICKER4X15 ERROR] '+(e.stack||e));
  }finally{busy=false;}
 };
 tick();setInterval(tick,30000);
}
if(require.main===module)main();
module.exports={FILE,initial,getInputs,recentMarkets,evolve};
