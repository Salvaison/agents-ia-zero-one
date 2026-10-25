'use strict';
// Dedicated V5.2 decision + execution PAPER service. Never imports real broker clients.
const fs=require('fs'),path=require('path'),stream=require('../price-stream');
const decision=require('./decision-v53'),paper=require('./paper-v52');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const MCB=path.resolve(ROOT,'../data/mcb-live');
const STATE=path.join(DATA,'v52-paper-state.json');
const TRADES=path.join(DATA,'v52-paper-trades.ndjson');
const CHANGES=path.join(DATA,'v52-paper-decisions.ndjson');
const INTERVAL_MS=5000;
const json=(p,f)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(_){return f;}};
function writeAtomic(p,x){
 const tmp=p+'.tmp-'+process.pid;fs.writeFileSync(tmp,JSON.stringify(x));fs.renameSync(tmp,p);
}
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
function append(p,x){appendRotatingNdjson(p,x,{maxBytes:4*1024*1024,maxSegments:10});}
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
function tail(p,n=350000){
 const st=fs.statSync(p),fd=fs.openSync(p,'r'),len=Math.min(st.size,n);
 const b=Buffer.allocUnsafe(len);
 try{fs.readSync(fd,b,0,len,st.size-len);}finally{fs.closeSync(fd);}
 return b.toString('utf8').split(/\r?\n/).slice(st.size>len?1:0).filter(x=>x&&!x.startsWith('timestamp,'));
}
function csv(tf){
 const p=path.join(MCB,'mcb_'+tf+'.csv');
 const rows=tail(p,tf==='3m'?250000:tf==='15m'?190000:110000);
 const a=[];for(const line of rows){
  const v=line.split(',');if(v.length<8)continue;
  const ts=Date.parse(v[0]);if(!Number.isFinite(ts))continue;
  const num=k=>finite(v[k])?Number(v[k]):null;
  if(num(4)===null||num(5)===null)continue;
  a.push({ts,open:num(1),high:num(2),low:num(3),close:num(4),
   lt_blue_wave:num(5),blue_wave:num(6),money_flow:num(7),ma200:num(12),
   wt1_cross_up:num(13),wt1_cross_dn:num(14)});
 }
 return a.sort((x,y)=>x.ts-y.ts);
}
let caches={};
function cached(file,loader){
 const m=fs.statSync(file).mtimeMs;const prev=caches[file];
 if(prev&&prev.m===m)return prev.data;
 const data=loader();caches[file]={m,data};return data;
}
function latest(){
 const audit=cached(path.join(DATA,'audit-history.json'),()=>json(path.join(DATA,'audit-history.json'),[]));
 const samples=audit.slice(-450).filter(x=>finite(x.ts)&&finite(x.lastPrice));
 const tf=t=>cached(path.join(MCB,'mcb_'+t+'.csv'),()=>csv(t));
 const levels=cached(path.join(DATA,'levels.json'),()=>json(path.join(DATA,'levels.json'),[]));
 // Reuse the existing Elastic source for REAL observed E15 times, not a new shadow.
 const historyPath=path.join(DATA,'elastic-observer-events.ndjson');
 let native15Events=[];
 try{
  native15Events=cached(historyPath,()=>tail(historyPath,350000).map(line=>{
   try{return JSON.parse(line);}catch(_){return null;}
  }).filter(e=>e&&e.family==='MCB15'&&e.key==='E15'&&
   ['OBSERVED','CONFIRMED'].includes(e.type)&&Number.isFinite(e.observedAt))
   .map(e=>({type:e.type,direction:e.direction,sourceTs:e.sourceTs,
     observedAt:e.observedAt,value:e.current?.value||null})));
 }catch(_){}

 const last=samples.at(-1),time=Date.now();
 const health=['3m','15m'].every(t=>{
  const folder=path.join(MCB,'mcb_'+t+'_live.csv');
  try{return time-fs.statSync(folder).mtimeMs<(t==='3m'?120000:180000);}catch(_){return false;}
 });
 return {samples,bars3:tf('3m'),bars15:tf('15m'),bars1h:tf('1h'),bars4h:tf('4h'),
  levels,native15Events,last,health};
}
function main(){
 const flags=new Set(process.argv.slice(2));
 if(flags.has('--test-read')){
  const x=latest(),now=x.last.ts;
  const d=decision.evaluate({...x,now,price:x.last.lastPrice,startedAt:now-120*60000,
   sourceAgeMs:0,tickAgeMs:0});
  console.log(JSON.stringify({mode:'READ_ONLY_TEST',decision:d},null,2));return;
 }
 let s=json(STATE,null);
 // Versioned migration is explicit. Incompatible/corrupt state HALTS; never
 // reset the ledger or overwrite a position simply because policy changed.
 s=paper.migrate(s,Date.now());
 // Keep the original startedAt so only genuinely new causally observed crossings
 // can trigger; keys are matched across both policy generations.
 writeAtomic(STATE,s);
 let busy=false,priorKey=null,lastSave=0,errors=0;
 function tick(){
  if(busy)return;busy=true;
  try{
   const x=latest(),tickTs=Number(stream.lastUpdateTs),price=Number(stream.lastPrice);
   if(!tickTs||!Number.isFinite(price)||tickTs<=0)return;
   const received=Date.now(),age=received-tickTs;
   const auditAge=tickTs-x.last.ts;
   const d=decision.evaluate({...x,now:tickTs,price,
    startedAt:s.policyActivatedAt||s.startedAt,
    position:s.position,sourceAgeMs:auditAge,tickAgeMs:age});
   if(!x.health){d.quality='DATA_DEGRADED';if(!s.position){
     d.action='WAIT';d.reason='MCB_COLLECTOR_STALE';
   }}
   const result=paper.step(s,d,{price,ts:tickTs,sourceAgeMs:auditAge,tickAgeMs:age});
   s=result.state;
   s.latestAnalysis=d;
   const key=[d.action,d.reason,d.phase,s.position?.direction||'FLAT',result.reason].join('|');
   if(result.event||priorKey!==key){
    append(CHANGES,{ts:tickTs,price,action:d.action,reason:d.reason,phase:d.phase,
     candidate:d.candidate,decisionOutcome:result.reason,tradeEvent:result.event||null,
     conversion:d.readings.conversion,place:d.readings.place,geometry:d.readings.geometry,
     maturity:d.readings.maturity,causalChain:d.readings.causalChain,
     invalidation:d.invalidation,invalidationEvidence:d.readings.invalidationEvidence,
     quality:d.quality,origin:'V5.3_PAPER',policyVersion:d.version,brokerOrdersEnabled:false});
    priorKey=key;
   }
   if(result.trade)append(TRADES,result.trade);
   if(result.event||received-lastSave>=30000){writeAtomic(STATE,s);lastSave=received;}
   if(result.event)console.log('[V522 PAPER] '+JSON.stringify(result.event));
   errors=0;
  }catch(e){if(++errors<=4||errors%20===0)console.error('[V52 PAPER] '+e.stack);}
  finally{busy=false;}
 }
 stream.on('error',e=>console.error('[V52 PRICE] '+e.message));
 stream.start();
 console.log('[V522 PAPER] '+JSON.stringify({policy:decision.VERSION,mode:'PAPER_ONLY',brokerOrdersEnabled:false,
  startAt:s.startedAt,priorTrades:s.completed,position:s.position?.direction||null}));
 setInterval(tick,INTERVAL_MS);
}
if(require.main===module)main();
module.exports={csv,latest};
