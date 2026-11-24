'use strict';
// Independent market clock: no PAPER read or import.
const fs=require('node:fs'),path=require('node:path');
const G=require('./boonolab-wave-geometry-v02'),M=require('./boonolab-trajectory-memory'),I=require('./boonolab-wave-interpreter-v02');
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
const DATA=path.resolve(__dirname,'../../data'),MCB=path.resolve(DATA,'../../data/mcb-live');
const VERSION='boonolab-trajectory-shadow-v0.1',periods={'3m':180000,'15m':900000,'1h':3600000,'4h':14400000};
const FILE=Object.fromEntries(['state','summary','samples','events'].map(k=>[k,path.join(DATA,'boonolab-trajectory-shadow-'+k+(k==='samples'||k==='events'?'.ndjson':'.json'))]));
FILE.audit=path.join(DATA,'audit-history.json');
const number=x=>x!==undefined&&x!==null&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
function atomic(f,x){const tmp=f+'.tmp-'+process.pid;fs.writeFileSync(tmp,JSON.stringify(x));fs.renameSync(tmp,f);}
function parseBars(text,tf){
 const period=periods[tf];if(!period)throw Error('UNSUPPORTED_TF');
 const map=new Map();
 for(const line of text.split(/\r?\n/)){
  const c=line.split(','),sourceAt=Date.parse(c[0]),L=number(c[5]),B=number(c[6]),price=number(c[4]);
  if(!Number.isFinite(sourceAt)||L===null||B===null||price===null)continue;
  const u=number(c[13]),d=number(c[14]);
  map.set(sourceAt,{sourceAt,closeAt:sourceAt+period,L,B,price,mf:number(c[7]),high:number(c[2]),low:number(c[3]),direction:u!==null&&d===null?'UP':d!==null&&u===null?'DN':null});
 }
 const bars=[...map.values()].sort((a,b)=>a.closeAt-b.closeAt);
 let native=null,cross=null;
 for(let i=0;i<bars.length;i++){
  const b=bars[i],p=bars[i-1];
  if(b.direction)native={sourceAt:b.sourceAt,closeAt:b.closeAt,direction:b.direction,L:b.L,B:b.B,mf:b.mf,price:b.price};
  const d=G.dir(b.L-b.B),prior=p?G.dir(p.L-p.B):null;
  if(prior&&d&&d!==prior)cross={sourceAt:b.sourceAt,closeAt:b.closeAt,direction:d,L:b.L,B:b.B,price:b.price};
  b.lastNative=native;b.lastCross=cross;
 }
 return bars;
}
function contextAt(bars,at,tf){
 let lo=0,hi=bars.length;
 while(lo<hi){const m=(lo+hi)>>1;if(bars[m].closeAt<=at)lo=m+1;else hi=m;}
 const i=lo-1;if(i<0)return {};
 const b=bars[i],p=bars[i-1],q=bars[i-2];
 const clean=x=>{if(!x)return null;const {lastNative,lastCross,...v}=x;return v;};
 const ctx={latest:clean(b),previous:clean(p),lastNative:b.lastNative,lastCross:b.lastCross};
 if(tf==='3m'){
  const ranges=bars.slice(Math.max(0,i-19),i+1).filter(z=>z.high!==null&&z.low!==null).map(z=>z.high-z.low).filter(v=>v>0).sort((a,b)=>a-b);
  ctx.medianRange=ranges.length?ranges[Math.floor(ranges.length/2)]:null;ctx.pivot=[];
  if(p&&q){
   if([b.high,p.high,q.high].every(Number.isFinite)&&p.high>q.high&&p.high>b.high)ctx.pivot.push({direction:'UP',sourceAt:p.sourceAt,price:p.high,confirmedCloseAt:b.closeAt});
   if([b.low,p.low,q.low].every(Number.isFinite)&&p.low<q.low&&p.low<b.low)ctx.pivot.push({direction:'DN',sourceAt:p.sourceAt,price:p.low,confirmedCloseAt:b.closeAt});
  }
 }
 return ctx;
}
function contextsAt(bars,at){return Object.fromEntries(Object.entries(bars).map(([tf,b])=>[tf,contextAt(b,at,tf)]));}
const cache=new Map();
function loadBars(){
 const bars={};
 for(const tf of Object.keys(periods)){
  const f=path.join(MCB,'mcb_'+tf+'.csv'),stamp=fs.statSync(f).mtimeMs,prior=cache.get(tf);
  if(prior?.stamp===stamp)bars[tf]=prior.bars;
  else{const all=parseBars(fs.readFileSync(f,'utf8'),tf),last=all.at(-1);
   bars[tf]=last?all.filter(b=>b.closeAt>=last.closeAt-7*86400000):[];cache.set(tf,{stamp,bars:bars[tf]});}
 }
 return bars;
}
function sample(i,provenance){
 return {version:VERSION,asOf:i.asOf,sourceAt:i.sourceAt,mode:'SHADOW_ONLY',provenance,decisionImpact:false,brokerOrdersEnabled:false,
  parentE15:i.parentE15,liveCross:i.liveCross,confirmedCross:i.confirmedCross,geometry:i.geometry,
  hypotheses:Object.fromEntries(Object.entries(i.hypotheses).map(([d,h])=>{const {priorAttempts,priorInitiatives,previousCrossEpisodes,priorCrossHistory,priorConfirmedHistory,priorNativeHistory,supportHistory,extrema,liveCrosses,confirmedCrosses,nativeConfirmations,...compact}=h;return [d,compact];}))};
}
function step(state,row,bars,knownAt,provenance){
 // For catch-up and replay, never expose bars closing after this sample.
 const contextTime=provenance==='LIVE_FILE_OBSERVED'?knownAt:row.ts;
 const x=M.observe(state,{row,knownAt,contexts:contextsAt(bars,contextTime),provenance});
 return x.accepted?{...x,interpretation:I.interpret(state)}:x;
}
function sortedAudit(rows,now){return [...new Map(rows.filter(r=>G.point(r)&&r.ts<=now).map(r=>[r.ts,r])).values()].sort((a,b)=>a.ts-b.ts);}
function tick({check=false}={}){
 const now=Date.now(),rows=sortedAudit(JSON.parse(fs.readFileSync(FILE.audit,'utf8')),now),last=rows.at(-1);
 if(!last||now-last.ts>95000)throw Error('TRAJECTORY_STALE_BATON');
 const state=!check&&fs.existsSync(FILE.state)?JSON.parse(fs.readFileSync(FILE.state,'utf8')):M.initial(now);
 if(state.version!==M.VERSION||state.decisionImpact!==false||state.brokerOrdersEnabled!==false)throw Error('TRAJECTORY_STATE_MIGRATION_REQUIRED');
 if(last.ts<=state.lastSourceAt)return {status:'NO_NEW_BATON',sourceAt:last.ts};
 const bars=loadBars(),bootstrap=!state.lastSourceAt;
 const pending=rows.filter(r=>r.ts>state.lastSourceAt&&r.ts>=last.ts-8*3600000);
 let result,events=[];
 for(const row of pending){
  const live=row.ts===last.ts,provenance=live?'LIVE_FILE_OBSERVED':bootstrap?'HISTORICAL_BOOTSTRAP_CLOSE_PROXY':'RECOVERED_HISTORY_CLOSE_PROXY';
  const z=step(state,row,bars,live?now:Math.max(row.ts,state.lastKnownAt),provenance);
  if(z.accepted){result=z;if(live)events=z.events;}
 }
 if(!result?.accepted)throw Error('TRAJECTORY_NO_ACCEPTED_OBSERVATION');
 const i=result.interpretation,summary={...i,shadowVersion:VERSION,freshAtWrite:Date.now(),
  sourceClock:'BATON_PLUS_CLOSED_CSV_NOT_PAPER',bootstrapHistoricalOnly:bootstrap,coverageAgeMs:now-last.ts};
 if(!check){
  atomic(FILE.state,state);atomic(FILE.summary,summary);
  appendRotatingNdjson(FILE.samples,sample(i,'LIVE_FILE_OBSERVED'),{maxBytes:4*1024*1024,maxSegments:16});
  for(const e of events)appendRotatingNdjson(FILE.events,{...e,version:VERSION,provenance:'LIVE_FILE_OBSERVED'},{maxBytes:4*1024*1024,maxSegments:16});
 }
 return {status:check?'CHECK_ONLY':'OBSERVED',sourceAt:i.sourceAt,asOf:i.asOf,counts:i.observationCounts,
  price:i.geometry.price,L:i.geometry.L,B:i.geometry.B,parent:i.parentE15?.direction||null,up:i.hypotheses.UP.narrative,dn:i.hypotheses.DN.narrative};
}
function start(){
 let busy=false,errors=0;
 const run=()=>{if(busy)return;busy=true;try{tick();errors=0;}catch(e){if(++errors<=5||errors%20===0)console.error('[TRAJECTORY SHADOW ONLY] '+(e.stack||e));}finally{busy=false;}};
 run();return setInterval(run,10000);
}
if(require.main===module){if(process.argv.includes('--check'))console.log(JSON.stringify(tick({check:true})));else throw Error('EMBEDDED_OBSERVER_ONLY');}
module.exports={VERSION,FILE,parseBars,contextAt,contextsAt,loadBars,sample,step,tick,start,sortedAudit};