'use strict';
// Prospective BOONOLAB S1 v0.2 campaign memory SHADOW.
// Runs alongside unmodified S1 v0.1, reads V543 PAPER ONLY, never writes it.
const fs=require('node:fs'),path=require('node:path');
const model=require('./v543-lbw15-s1-v02'),v01=require('./v543-lbw15-s1');
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const PAPER=path.join(DATA,'v52-paper-state.json');
const V01=path.join(DATA,'v543-lbw15-s1-shadow-state.json');
const STATE=path.join(DATA,'v543-lbw15-s1-v02-shadow-state.json');
const SUMMARY=path.join(DATA,'v543-lbw15-s1-v02-shadow-summary.json');
const EVENTS=path.join(DATA,'v543-lbw15-s1-v02-shadow-events.ndjson');
const json=(p,alt=null)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}
 catch(e){if(e.code==='ENOENT')return alt;throw e;}};
const write=(p,x)=>{const f=p+'.tmp-'+process.pid;
 fs.writeFileSync(f,JSON.stringify(x));fs.renameSync(f,p);};
const n=x=>x===null||x===undefined||x===''?null:
 Number.isFinite(Number(x))?Number(x):null;
function evidenceInputs(){
 const paper=json(PAPER);
 if(!paper||paper.version!=='v5.4.3-paper-ledger-v1.0'||
   paper.mode!=='PAPER_ONLY'||paper.brokerOrdersEnabled!==false)
  throw Error('S1_V02_UNTRUSTED_V543_PAPER');
 const cur=v01.sample(paper.latestAnalysis);
 const now=Date.now();
 if(!cur||cur.at>now+5000||now-cur.at>95000||
   Math.abs(cur.at-n(paper.lastObservationAt))>1000)
  throw Error('S1_V02_STALE_V543_PAPER');
 const v01State=json(V01,{});
 // Existing S1 source samples include actual as-of V543 PM + source clocks.
 const history=(Array.isArray(v01State.samples)?v01State.samples:[])
  .filter(x=>n(x.at)!==null&&x.at<cur.at&&
   x.at>=cur.at-4*3600000&&n(x.lbw)!==null&&
   n(x.price)!==null).sort((a,b)=>a.at-b.at);
 if(history.length<30)throw Error('S1_V02_LBW15_HISTORY_INSUFFICIENT');
 const position=paper.position?{
  direction:paper.position.direction,entryAt:paper.position.entryAt,
  entryPrice:paper.position.entryPrice,mfePriceUsd:paper.position.mfePriceUsd||
   paper.position.metrics?.mfeUsd||null
 }:null;
 return {paper,cur,position,history};
}
function summary(s,view,now){
 return {version:model.VERSION,mode:'SHADOW_ONLY',decisionImpact:false,
  brokerOrdersEnabled:false,asOf:s.lastAt,freshAtWrite:now,
  observations:s.count,startedAt:s.startedAt,
  latest:view||s.lastView||null,
  currentCampaign:s.current?{
   parentId:s.current.parentId,parentDirection:s.current.parentDirection,
   startedAt:s.current.startedAt,phase:s.current.phase,
   phaseSince:s.current.phaseSince,
   counterattacks:s.current.counterattacks,
   resumptions:s.current.resumptions,
   parentProgressUsd:s.current.lastParentPriceProgress,
   counter:s.current.counter,
   recentHistory:s.current.episodeHistory.slice(-6),
   latestPositionReview:s.current.latestPositionReview}:null,
  recentParentCampaigns:s.archives.slice(-5).map(x=>({
   parentId:x.parentId,direction:x.parentDirection,
   startedAt:x.startedAt,endedAt:x.endedAt,
   counterattacks:x.counterattacks,resumptions:x.resumptions,
   phase:x.phase})),
  lastTransitions:s.events.slice(-16),
  reference:'S1 v0.1 still running independently. No PAPER gate, no performance claim.',
  caveat:'Prospective only; parent/candidate/position each have independent directional LBW. A 2-family counterattack is attention, not EXIT. Post-exit PNL is actual V543 only.'};
}
function checkOnly(){
 const {paper,cur,position,history}=evidenceInputs();
 const s=model.initial(Date.now());
 const res=model.observe(s,cur,{position,history});
 console.log(JSON.stringify({mode:'READ_ONLY_TEST',
  asOf:cur.at,version:model.VERSION,
  source:'V543_PAPER_AND_S1_V01_READONLY',
  historySamples:history.length,
  view:res.view,decisionImpact:false,brokerOrdersEnabled:false},null,2));
}
function run(){
 if(process.argv.includes('--test-read'))return checkOnly();
 const old=json(STATE,null);
 const s=old?model.checked(old):model.initial(Date.now());
 let busy=false,errors=0;
 console.log('[S1 V0.2 LBW15 MEMORY] '+JSON.stringify({
  mode:'SHADOW_ONLY',version:model.VERSION,
  lastAt:s.lastAt,observations:s.count,brokerOrdersEnabled:false}));
 const tick=()=>{
  if(busy)return;busy=true;
  try{
   const input=evidenceInputs();
   const r=model.observe(s,input.cur,{
    position:input.position,history:input.history});
   if(!r.changed)return;
   s.lastView=r.view;
   s.lastPaperCompleted=input.paper.completed;
   s.lastPaperTradeNo=input.paper.completed+(input.position?1:0);
   s.lastPaperPositionDirection=input.position?.direction||null;
   // Immutable review events. Never invent a PAPER counterfactual trade.
   for(const event of r.transitions)
    appendRotatingNdjson(EVENTS,event,{maxBytes:4*1024*1024,maxSegments:12});
   write(STATE,s);
   write(SUMMARY,summary(s,r.view,Date.now()));
   if(r.transitions.length)
    console.log('[S1 V0.2 MEMORY TRANSITIONS] '+
     JSON.stringify(r.transitions.map(x=>({at:x.at,type:x.type,
      from:x.from,to:x.to}))));
   errors=0;
  }catch(e){
   if(++errors<=5||errors%30===0)
    console.error('[S1 V0.2 ERROR] '+(e.stack||e));
  }finally{busy=false;}
 };
 tick();setInterval(tick,10000);
}
if(require.main===module)run();
module.exports={STATE,SUMMARY,EVENTS,evidenceInputs,summary,checkOnly};
