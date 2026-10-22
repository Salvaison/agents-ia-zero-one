'use strict';
// BOONO V5 research observer. Reads already collected public/audited market data.
// Never imports V4 action/trade executors. Writes only its own v5-shadow-* files.
const fs=require('fs'),path=require('path');
const core=require('./elastic-memory-engine');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const AUDIT=path.join(DATA,'audit-history.json');
const EVENT=path.join(DATA,'elastic-observer-events.ndjson');
const STATE=path.join(DATA,'v5-shadow-memory-state.json');
const JOURNAL=path.join(DATA,'v5-shadow-samples.ndjson');
const TRANSITIONS=path.join(DATA,'v5-shadow-events.ndjson');
const WATCH_MS=30000;
function atomic(p,x){const tmp=p+'.new';fs.writeFileSync(tmp,JSON.stringify(x));fs.renameSync(tmp,p);}
function parsedLines(text){return text.split(/\r?\n/).filter(Boolean).flatMap(line=>{
 try{return[JSON.parse(line)];}catch(_){return[];}
});}
function readLastAudit(){
 const st=fs.statSync(AUDIT),fd=fs.openSync(AUDIT,'r');
 const len=Math.min(st.size,15000),b=Buffer.alloc(len);
 try{fs.readSync(fd,b,0,len,st.size-len);}finally{fs.closeSync(fd);}
 const text=b.toString('utf8'),j=text.lastIndexOf('}'),i=text.lastIndexOf('{"ts":',j);
 if(i<0||j<i)throw Error('AUDIT_LAST_RECORD_MISSING');
 return JSON.parse(text.slice(i,j+1));
}
function slim(a){
 return {ts:Number(a.ts),price:a.lastPrice,lbw3:a.liveLbw,
   lbw15:a.live15LbwRaw,mf3:a.liveMoneyFlow,mf15:a.live15MfRaw,
   mf15Slope:a.mf15Pente,pmLive:a.priceMove};
}
function replay(rows,events,from=0,to=Infinity){
 let state=core.empty(),idx=0,applied=0;
 const requestedFrom=from;
 events=events.filter(x=>Number.isFinite(Number(x.observedAt))&&x.observedAt<=to)
   .sort((a,b)=>a.observedAt-b.observedAt||a.id-b.id);
 // Warm up structural lineage before a selected replay window; never inject
 // old events into the first selected observation as if they happened now.
 const warmupFrom=Math.min(from,events[0]?.observedAt??from);
 for(const a of rows){
  if(a.ts<warmupFrom||a.ts>to)continue;
  const incoming=[];
  while(idx<events.length&&events[idx].observedAt<=a.ts)incoming.push(events[idx++]);
  const r=core.step(state,slim(a),incoming);
  state=r.state;
  if(r.changed&&a.ts>=requestedFrom)applied++;
 }
 return {state,applied,unapplied:events.length-idx};
}
function readBootstrap(){
 const rows=JSON.parse(fs.readFileSync(AUDIT,'utf8'));
 const events=parsedLines(fs.readFileSync(EVENT,'utf8'));
 const prior=fs.existsSync(STATE)?JSON.parse(fs.readFileSync(STATE,'utf8')):null;
 if(prior&&prior.version===core.VERSION)return {state:prior,bootstrap:'RESUMED_COMPACT'};
 // Only replay samples whose source market data and observed Elastic events overlap.
 const eventStart=events.length?events[0].observedAt:Date.now();
 const from=Math.max(eventStart,Date.now()-24*3600000);
 const r=replay(rows,events,from,Infinity);
 return {state:r.state,bootstrap:'HISTORIC_CAUSAL_REPLAY',applied:r.applied,
   from,through:r.state.lastSampleTs};
}
function appendCompact(p,row,maxBytes=8*1024*1024,maxSegments=12){
 const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
 appendRotatingNdjson(p,row,{maxBytes,maxSegments});
}
let filePos=0,fileIdentity=null,partial='';
function startCursor(){
 const st=fs.statSync(EVENT);filePos=st.size;fileIdentity=st.ino;partial='';
}
function newEvents(){
 const st=fs.statSync(EVENT);
 if(fileIdentity!==st.ino||st.size<filePos){
  filePos=0;fileIdentity=st.ino;partial='';
 }
 if(st.size===filePos)return [];
 const fd=fs.openSync(EVENT,'r'),bytes=st.size-filePos,buf=Buffer.alloc(bytes);
 try{fs.readSync(fd,buf,0,bytes,filePos);}finally{fs.closeSync(fd);}
 filePos=st.size;
 const text=partial+buf.toString('utf8'),parts=text.split('\n');
 partial=parts.pop()||'';
 return parts.flatMap(line=>{try{return line.trim()?[JSON.parse(line)]:[];}catch(_){return[];}});
}
function main(){
 const argv=new Set(process.argv.slice(2));
 if(argv.has('--replay')){
  const audit=JSON.parse(fs.readFileSync(AUDIT,'utf8'));
  const events=parsedLines(fs.readFileSync(EVENT,'utf8'));
  const from=Number(process.env.BOONO_V5_REPLAY_FROM)||events[0]?.observedAt||0;
  const to=Number(process.env.BOONO_V5_REPLAY_TO)||Infinity;
  const r=replay(audit,events,from,to);
  console.log(JSON.stringify({mode:'REPLAY',version:core.VERSION,from,to,
   observations:r.applied,unappliedEvents:r.unapplied,sourceLatest:r.state.lastSampleTs,
   currentAnchor:r.state.anchor,lineageEdges:r.state.lineageEdges.length,
   recentLineageEdges:r.state.lineageEdges.slice(-8),threads:r.state.threads.map(t=>({
     id:t.id,attempts:t.attempts.length,events:t.events.length,
     counterAttempts:t.attempts.filter(a=>a.againstAnchor).length,
     priceStart:t.priceStart,priceLast:t.priceLast})),
   qualityHour:r.state.hour,decisionImpact:false}));
  return;
 }
 const begin=readBootstrap();let state=begin.state;
 atomic(STATE,state);startCursor();
 console.log('[V5 SHADOW] '+JSON.stringify({status:'BOOTSTRAPPED',source:begin.bootstrap,
   observations:state.counts.samples,linked:state.counts.linked,
   lastTs:state.lastSampleTs,threadCount:state.threads.length,decisionImpact:false}));
 // Capture events emitted after the most recent AUDIT row but before
 // observer startup; they are causally processed only at the next sample.
 let backlog=parsedLines(fs.readFileSync(EVENT,'utf8'))
   .filter(e=>Number(e.id)>state.lastEventId);
 let busy=false;
 function tick(){
  if(busy)return;busy=true;
  try{
   const audit=readLastAudit(),incoming=backlog.concat(newEvents());backlog=[];
   if(Date.now()-audit.ts>5*60000){
    if(!tick.staleLogged){console.error('[V5 SHADOW] AUDIT_STALE');tick.staleLogged=true;}
    return;
   }
   tick.staleLogged=false;
   const r=core.step(state,slim(audit),incoming);
   state=r.state;
   if(!r.changed)return;
   atomic(STATE,state);
   appendCompact(JOURNAL,r.compact);
   if(r.significant){
    const window=state.events.filter(e=>e.at>=audit.ts-3*60000).slice(-12);
    appendCompact(TRANSITIONS,{ts:audit.ts,linked:state.counts.linked,
      threadId:r.compact.threadId,events:window,quality:state.lastQuality,
      decisionImpact:false});
   }
   console.log('[V5 SHADOW] '+JSON.stringify({time:new Date(audit.ts).toISOString(),
     price:r.compact.price,anchor:r.compact.e15,live:r.compact.e15Live,
     quality:r.compact.quality,events:r.significant,thread:r.compact.threadId,
     hourBias:r.compact.hourBias,coverage:r.compact.hourCoverage}));
  }catch(e){console.error('[V5 SHADOW] '+String(e.stack||e).slice(0,900));}
  finally{busy=false;}
 }
 tick();setInterval(tick,WATCH_MS);
}
if(require.main===module)main();
module.exports={readLastAudit,slim,replay,readBootstrap};
