'use strict';
// Same TRAJECTORY policy as shadow, independent continuous PAPER ledger.
const fs=require('node:fs'),path=require('node:path'),P=require('./paper'),M=require('./market'),D=require('./decision');
const source=require('../v553/source'),R=require('../attention/boonolab-trajectory-shadow-runner');
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
const DATA=path.resolve(__dirname,'../../data'),FILES={state:path.join(DATA,'v554-paper-state.json'),summary:path.join(DATA,'v554-paper-summary.json'),trades:path.join(DATA,'v554-paper-trades.ndjson'),decisions:path.join(DATA,'v554-paper-decisions.ndjson')};
function read(f){return JSON.parse(fs.readFileSync(f,'utf8'));}
function atomic(f,x){const t=f+'.tmp-'+process.pid;fs.writeFileSync(t,JSON.stringify(x));fs.renameSync(t,f);}
function save(s){P.verify(s);atomic(FILES.state,s);atomic(FILES.summary,P.summary(s));}
function append(f,x){appendRotatingNdjson(f,x,{maxBytes:4*1024*1024,maxSegments:48});}
function tickerAt(ts){try{const x=read(path.join(DATA,'boonolab-ticker4x15-summary.json'));return x.brokerOrdersEnabled===false&&x.decisionImpact===false&&Number.isFinite(x.asOf)&&x.asOf<=ts?{at:x.asOf,quality:x.current?.quality??null}:null;}catch{return null;}}
function tick(s,{ts,price,receivedAt},input,bars,ticker){
 let newMarket=false;
 if(input?.current&&input.current.ts>s.marketMemory.lastSourceAt&&input.current.ts<=ts){
  const pending=input.samples.filter(x=>x.ts>s.marketMemory.lastSourceAt&&x.ts<=ts);
  for(const row of pending){
   const last=row===pending.at(-1),at=last?receivedAt:Math.max(row.ts,s.marketMemory.trajectory.lastKnownAt);
   const m=M.observe(s.marketMemory,row,bars,at,last?ticker:null,last?'LIVE_FILE_OBSERVED':'RECOVERED_HISTORY_CLOSE_PROXY');
   if(m&&last){newMarket=true;s.marketObservations++;}
  }
 }
 const m=s.marketMemory.latest,healthy=!!input?.healthy&&m?.sourceAt===input.current?.ts&&m.sourceAt>=s.policyStartedAt;
 const out=P.step(s,m,{ts:receivedAt,price,fresh:receivedAt-ts>=0&&receivedAt-ts<=25000,healthy,bars});
 s.lastPriceTickAt=ts;return {newMarket,...out};
}
function main(){
 const s=P.verify(read(FILES.state));
 if(process.argv.includes('--check')){console.log(JSON.stringify({mode:s.mode,engine:s.engine,completed:s.completed,equityUsd:s.equityUsd,position:s.position?.direction||'FLAT',brokerOrdersEnabled:s.brokerOrdersEnabled,source:s.marketMemory.latest?.sourceAt}));return;}
 const stream=require('../price-stream');
 let busy=false,lastSave=0,priorKey=null,errors=0;
 console.log('[V554 PAPER] '+JSON.stringify({policy:P.POLICY,completed:s.completed,equityUsd:s.equityUsd,position:s.position?.direction||'FLAT',brokerOrdersEnabled:false}));
 function run(){
  if(busy)return;busy=true;
  try{
   const ts=Number(stream.lastUpdateTs),price=Number(stream.lastPrice),receivedAt=Date.now();
   if(!Number.isFinite(ts)||!Number.isFinite(price)||price<=0||ts<=(s.lastPriceTickAt||0)||receivedAt-ts<0||receivedAt-ts>25000)return;
   let input=null,bars={},ticker=null;
   try{input=source.load(ts);bars=R.loadBars();ticker=tickerAt(ts);}catch(e){if(++errors<=3||errors%30===0)console.error('[V554 PAPER INPUT] '+e.message);}
   let out;
   try{out=tick(s,{ts,price,receivedAt},input,bars,ticker);}
   catch(e){console.error('[V554 PAPER MARKET] '+e.message);out=P.step(s,null,{ts:receivedAt,price,fresh:true,healthy:false,bars:{}});s.lastPriceTickAt=ts;}
   const key=[out.decision.action,out.decision.reason,s.position?.direction,s.marketMemory.latest?.suspension?.since].join('|');
   if(out.newMarket||out.event||receivedAt-lastSave>=30000){save(s);lastSave=receivedAt;}
   if(out.trade)append(FILES.trades,out.trade);
   if(out.newMarket||out.event||key!==priorKey){append(FILES.decisions,{ts:receivedAt,price,version:P.POLICY,decision:out.decision.action,reason:out.decision.reason,
    qualification:out.decision,market:s.marketMemory.latest,event:out.event||null,brokerOrdersEnabled:false});priorKey=key;}
   if(out.event)console.log('[V554 PAPER EVENT] '+JSON.stringify(out.event));
   if(input?.healthy)errors=0;
  }catch(e){if(++errors<=5||errors%30===0)console.error('[V554 PAPER RUNNER] '+(e.stack||e));}finally{busy=false;}
 }
 stream.on('error',e=>console.error('[V554 PUBLIC PRICE] '+e.message));
 stream.start();run();setInterval(run,5000);
}
if(require.main===module)main();
module.exports={FILES,save,tick};

