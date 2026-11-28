'use strict';
// Isolated research account, no broker, no write to any predecessor or observer.
const fs=require('node:fs'),path=require('node:path');
const M=require('./market'),A=require('./account'),D=require('./decision');
const source=require('../v553/source');
const R=require('../attention/boonolab-trajectory-shadow-runner');
const I=require('../attention/boonolab-wave-interpreter-v02');
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
const DATA=path.resolve(__dirname,'../../data');
const FILES={state:path.join(DATA,'v554-shadow-state.json'),summary:path.join(DATA,'v554-shadow-summary.json'),
 samples:path.join(DATA,'v554-shadow-samples.ndjson'),trades:path.join(DATA,'v554-shadow-trades.ndjson')};
const CONFIGS=Object.freeze({TRAJECTORY:{variant:'TRAJECTORY',early:true},A:{variant:'A',early:true},B:{variant:'B',early:true},CROSS_EXIT_ONLY:{variant:'TRAJECTORY',early:false}});
const VERSION='v554-shadow-runner-v1';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
function write(f,x){const t=f+'.tmp-'+process.pid;fs.writeFileSync(t,JSON.stringify(x));fs.renameSync(t,f);}
function append(f,x){appendRotatingNdjson(f,x,{maxBytes:4*1024*1024,maxSegments:48});}
function newState(at){
 const market=M.initial(at),seed=read(R.FILE.state);
 if(seed.version!==market.trajectory.version||seed.decisionImpact!==false||seed.brokerOrdersEnabled!==false||seed.lastKnownAt>at||at-seed.lastSourceAt>95000||!seed.rows?.length)throw Error('V554_INVALID_OR_STALE_TRAJECTORY_SEED');
 // Copy, never mutate the observer's persisted state. Carry initiative and
 // genuine cross origins intact; new sync evidence requires new observation.
 market.trajectory=seed;market.lastSourceAt=seed.lastSourceAt;
 const i=I.interpret(seed);
 const cross=i.liveCross,rows=seed.rows;
 // Reconstruct completed segments from the last two hours of the seed only.
 let active=null,previous=null;
 for(const p of rows.filter(x=>x.ts>=seed.lastSourceAt-2*3600000)){
  const direction=M.side(p.L-p.B);
  if(previous&&p.ts-previous.ts>95000){active=null;market.segments=[];}
  if(direction&&previous&&direction!==M.side(previous.L-previous.B)){
   if(active){
    const move=M.sg(active.direction)*(active.lastPrice-active.price),duration=(active.lastAt-active.sourceAt)/60000,retained=active.favorable>0?move/active.favorable:null;
    if(duration>=M.cfg.minSegmentMin)market.segments.push({id:active.id,direction:active.direction,sourceAt:active.sourceAt,endAt:active.lastAt,move,favorable:active.favorable,retained,duration,failed:move<=0||(retained!==null&&retained<M.cfg.weakRetention)});
   }
   active={id:p.ts,sourceAt:p.ts,direction,price:p.price,lastPrice:p.price,lastAt:p.ts,favorable:0};
  }
  if(active&&direction===active.direction){active.lastPrice=p.price;active.lastAt=p.ts;active.favorable=Math.max(active.favorable,M.sg(direction)*(p.price-active.price));}
  previous=p;
 }
 if(active?.id===cross?.sourceAt)market.active=active;
 market.segments=market.segments.slice(-36);
 const recent=market.segments.slice(-3),fails=recent.filter(x=>x.failed);
 if(recent.length===3&&fails.length>=2&&new Set(fails.map(x=>x.direction)).size===2){
  const range=M.bounds(M.window(rows,seed.lastSourceAt,45));
  if(range)market.suspension={since:seed.lastSourceAt,range,trigger:recent.map(x=>({id:x.id,direction:x.direction,failed:x.failed})),beyond:{UP:0,DN:0},bootstrap:true};
 }
 return {version:VERSION,mode:'SHADOW_ONLY',brokerOrdersEnabled:false,decisionImpact:false,startedAt:at,
  seededFrom:{sourceAt:seed.lastSourceAt,knownAt:seed.lastKnownAt,version:seed.version},market,
  accounts:Object.fromEntries(Object.keys(CONFIGS).map(k=>[k,A.initial(at)])),observations:0,lastPriceTickAt:0};
}
function verify(s){
 if(s?.version!==VERSION||s.mode!=='SHADOW_ONLY'||s.brokerOrdersEnabled!==false||s.decisionImpact!==false||s.market?.version!==M.VERSION||!s.seededFrom)throw Error('V554_UNTRUSTED_STATE');
 for(const k of Object.keys(CONFIGS))A.verify(s.accounts[k]);return s;
}
function tickerAt(ts){
 try{const x=read(path.join(DATA,'boonolab-ticker4x15-summary.json'));
 if(x.brokerOrdersEnabled!==false||x.decisionImpact!==false||x.asOf>ts||!Number.isFinite(x.asOf))return null;
 return {at:x.asOf,quality:x.current?.quality??null,effort:x.current?.effortVsP75??null,yield:x.current?.yieldVsP75??null};
 }catch{return null;}
}
function compact(s){
 const m=s.market.latest;return {version:VERSION,policyVersion:D.VERSION,engine:'V554',mode:'SHADOW_ONLY',brokerOrdersEnabled:false,decisionImpact:false,
 startedAt:s.startedAt,seededFrom:s.seededFrom,observations:s.observations,sourceAt:m?.sourceAt??null,asOf:m?.asOf??null,
 market:m?{price:m.price,geometry:m.geometry,parentE15:m.parentE15,liveCross:m.liveCross,confirmedCross:m.confirmedCross,
 range45:m.range45,noise:m.noise,suspension:m.suspension,release:m.release,segments:m.segments,hypotheses:m.hypotheses}:null,
 accounts:Object.fromEntries(Object.entries(s.accounts).map(([k,a])=>[k,{completed:a.completed,wins:a.wins,losses:a.losses,
  equityUsd:a.equityUsd,realizedUsd:a.realizedUsd,feesUsd:a.feesUsd,position:a.position,lastDecision:a.decision,lastAction:a.lastAction,
  lastObservationAt:a.lastObservationAt,history:a.history.slice(-8)}]))};
}
function tick(s,{ts,price,receivedAt},input,bars,ticker){
 let newMarket=false;
 // After restart, preserve market state. Catch up missing source observations
 // without executing retroactive simulated fills.
 if(input?.current&&input.current.ts>s.market.lastSourceAt&&input.current.ts<=ts){
  const pending=input.samples.filter(x=>x.ts>s.market.lastSourceAt&&x.ts<=ts);
  for(const row of pending){
   const last=row===pending.at(-1);
   const at=last?receivedAt:Math.max(row.ts,s.market.trajectory.lastKnownAt);
   const m=M.observe(s.market,row,bars,at,last?ticker:null,last?'LIVE_FILE_OBSERVED':'RECOVERED_HISTORY_CLOSE_PROXY');
   if(m&&last){newMarket=true;s.observations++;}
  }
 }
 const healthy=!!input?.healthy&&s.market.latest?.sourceAt===input.current?.ts&&s.market.latest.sourceAt>=s.startedAt;
 const out={};
 for(const [k,a] of Object.entries(s.accounts))out[k]=A.step(a,s.market.latest,{ts:receivedAt,price,
  fresh:receivedAt-ts>=0&&receivedAt-ts<=25000,healthy,bars,...CONFIGS[k]});
 s.lastPriceTickAt=ts;return {newMarket,out};
}
function dry(){
 const now=Date.now(),s=newState(now);
 const input=source.load(now),bars=R.loadBars(),g=s.market.trajectory.latestGeometry;
 console.log(JSON.stringify({mode:'READ_ONLY',seed:s.seededFrom,marketHealthy:input.healthy,sourceAt:input.current?.ts,
  h1:bars['1h'].at(-1)?.closeAt,h4:bars['4h'].at(-1)?.closeAt,price:g?.price,accounts:Object.keys(s.accounts),brokerOrdersEnabled:false}));
}
function main(){
 if(process.argv.includes('--check'))return dry();
 const stream=require('../price-stream');
 let s=fs.existsSync(FILES.state)?verify(read(FILES.state)):newState(Date.now()),lastSave=0,busy=false,errors=0;
 write(FILES.state,s);write(FILES.summary,compact(s));
 function run(){
  if(busy)return;busy=true;
  try{
   const ts=Number(stream.lastUpdateTs),price=Number(stream.lastPrice),receivedAt=Date.now();
   if(!Number.isFinite(ts)||!Number.isFinite(price)||price<=0||ts<=(s.lastPriceTickAt||0)||receivedAt-ts<0||receivedAt-ts>25000)return;
   let input=null,bars={},ticker=null;
   try{input=source.load(ts);bars=R.loadBars();ticker=tickerAt(ts);}catch(e){if(++errors<=3||errors%30===0)console.error('[V554 INPUT] '+e.message);}
   // Even with a bad source, simulated hard-risk is supervised on public price.
   let out;
   try{out=tick(s,{ts,price,receivedAt},input,bars,ticker);}
   catch(e){
    console.error('[V554 MARKET] '+e.message);
    out={newMarket:false,out:{}};s.lastPriceTickAt=ts;
    for(const [k,a] of Object.entries(s.accounts))out.out[k]=A.step(a,null,{ts:receivedAt,price,fresh:true,healthy:false,bars:{}});
   }
   const events=Object.entries(out.out).filter(([,x])=>x.event);
   if(out.newMarket||events.length||receivedAt-lastSave>=30000){
    write(FILES.state,s);write(FILES.summary,compact(s));lastSave=receivedAt;
   }
   for(const [k,x] of events){if(x.trade)append(FILES.trades,{...x.trade,variant:k});console.log('[V554 SHADOW EVENT] '+JSON.stringify({variant:k,...x.event}));}
   if(out.newMarket){
    const m=s.market.latest;
    append(FILES.samples,{version:VERSION,asOf:m.asOf,sourceAt:m.sourceAt,price:m.price,liveCross:m.liveCross,parentE15:m.parentE15,
     suspension:m.suspension,release:m.release,hypotheses:m.hypotheses,
     decisions:Object.fromEntries(Object.entries(out.out).map(([k,v])=>[k,{action:v.decision.action,reason:v.decision.reason}])),brokerOrdersEnabled:false,decisionImpact:false});
   }
   if(input?.healthy)errors=0;
  }catch(e){if(++errors<=5||errors%30===0)console.error('[V554 RUNNER] '+(e.stack||e));}finally{busy=false;}
 }
 stream.on('error',e=>console.error('[V554 PUBLIC PRICE] '+e.message));
 stream.start();run();setInterval(run,5000);
}
if(require.main===module)main();
module.exports={FILES,CONFIGS,VERSION,newState,verify,compact,tick};

