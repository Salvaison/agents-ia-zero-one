'use strict';
// Independent OBSERVATION ONLY. Cannot trade and never opens a broker connection.
const fs=require('fs'),path=require('path'),engine=require('./structural-story-engine');
const BASE=path.resolve(__dirname,'../..'),MCB=path.resolve(BASE,'../data/mcb-live');
const AUDIT=path.join(BASE,'data/audit-history.json'),ELASTIC=path.join(BASE,'data/elastic-observer-events.ndjson');
const LEVELS=path.join(BASE,'data/levels.json');
const OUT=path.join(BASE,'data/v5-structural-story-state.json'),EVENTS=path.join(BASE,'data/v5-structural-story-transitions.ndjson');
const RUNTIME=90*1000;
function json(file,defaultValue){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(_){return defaultValue;}}
function csv(tf){
 const file=path.join(MCB,'mcb_'+tf+'.csv'),raw=fs.readFileSync(file,'utf8').split(/\r?\n/);
 const heads=raw.shift().split(',');
 return raw.flatMap(line=>{if(!line)return[];
  const cols=line.split(','),o={};
  heads.forEach((h,i)=>o[h]=cols[i]);
  const ts=Date.parse(o.timestamp),n=k=>o[k]!==''&&Number.isFinite(Number(o[k]))?Number(o[k]):null;
  if(!Number.isFinite(ts)||n('close')===null||n('lt_blue_wave')===null)return[];
  return [{ts,close:n('close'),high:n('high'),low:n('low'),
    lt_blue_wave:n('lt_blue_wave'),blue_wave:n('blue_wave'),money_flow:n('money_flow')}];
 }).sort((a,b)=>a.ts-b.ts);
}
function readSources(){
 const audits=json(AUDIT,[]).filter(x=>Number.isFinite(x.ts)&&Number.isFinite(Number(x.lastPrice)))
   .sort((a,b)=>a.ts-b.ts);
 const events=fs.readFileSync(ELASTIC,'utf8').split('\n').flatMap(l=>{
   try{return l.trim()?[JSON.parse(l)]:[];}catch(_){return[];}
 }).filter(e=>Number.isFinite(Number(e.observedAt))).sort((a,b)=>a.observedAt-b.observedAt||a.id-b.id);
 const levels=json(LEVELS,[]),mtime=fs.statSync(LEVELS).mtimeMs;
 return {audits,events,levels,mtime,bars15:csv('15m'),bars3:csv('3m'),
   bars1h:csv('1h'),bars4h:csv('4h')};
}
const slim=x=>({ts:x.ts,price:x.lastPrice,lbw15:x.live15LbwRaw,
 lbw3:x.liveLbw,mf15:x.live15MfRaw,mf15Slope:x.mf15Pente,
 pmLive:x.priceMove});
function run(sources,old=null,opts={}){
 const {audits,events,bars15,bars3,bars1h,bars4h,levels,mtime}=sources;
 let s=old&&old.version===engine.VERSION?old:engine.initial();
 let index=0,changed=0;const stories=[];
 const last=a=>a&&a.at||0;
 const pending=events.filter(e=>e.observedAt>last(s)).sort((a,b)=>a.observedAt-b.observedAt||a.id-b.id);
 for(const a of audits){
  if(a.ts<=last(s))continue;
  const ev=[];
  while(index<pending.length&&pending[index].observedAt<=a.ts)ev.push(pending[index++]);
  // Only source levels as historical if their snapshot timestamp was known.
  // A current snapshot is NEVER backdated into the previous day's decisions.
  const levelMode=mtime<=a.ts&&a.ts>=Date.now()-5*60000?'CURRENT':'HISTORICAL_UNKNOWN';
  const result=engine.step(s,{sample:slim(a),bars15,bars3,bars1h,bars4h,events:ev,
    levels:levelMode==='CURRENT'?levels:[],levelMode});
  s=result.state;
  if(!result.changed)continue;
  changed++;
  if(opts.captureEvery&&changed%opts.captureEvery===0)stories.push(result.story);
  if(result.events.length||result.story.phase!==opts.lastPhase){
   stories.push(result.story);opts.lastPhase=result.story.phase;
  }
 }
 return {state:s,changed,stories:stories.slice(-250)};
}
function writeState(state){
 if(!state||!state.lastHypothesis)return;
 const tmp=OUT+'.new';fs.writeFileSync(tmp,JSON.stringify(state));fs.renameSync(tmp,OUT);
 const latest=state.lastHypothesis,compact={
  ts:latest.ts,price:latest.price,phase:latest.phase,structure:latest.structure.direction,
  enjeu:latest.enjeu.valueArea,level:latest.enjeu.nearest&&latest.enjeu.nearest.key,
  attempts:latest.attempts,evidenceAsOf:latest.evidenceAsOf,
  decisionImpact:false,tradingEnabled:false
 };
 fs.appendFileSync(EVENTS,JSON.stringify(compact)+'\n');
}
function main(){
 const flags=new Set(process.argv.slice(2));
 if(flags.has('--replay')){
   const sources=readSources(),r=run(sources,null,{captureEvery:150});
   console.log(JSON.stringify({mode:'REPLAY',version:engine.VERSION,
     sampleCount:r.changed,last:r.state.lastHypothesis,
     timeline:r.stories.filter(x=>x.ts>=r.state.at-24*3600000).map(x=>({
       at:x.ts,price:x.price,phase:x.phase,dir:x.structure.direction,
       e15Up:x.attempts.e15Up3h,mf15Delta1h:x.horizon.mf15Delta1h,
       issue:x.enjeu.valueArea,evidenceAsOf:x.evidenceAsOf})).slice(-45),
     decisionImpact:false,tradingEnabled:false}));
   return;
 }
 let state=json(OUT,null);
 if(!state||state.version!==engine.VERSION)state=engine.initial();
 let busy=false;
 function tick(){
  if(busy)return;busy=true;
  try{
   const src=readSources();
   const updated=run(src,state,{captureEvery:0});
   state=updated.state;
   if(updated.changed){
    writeState(state);
    const h=state.lastHypothesis;
    console.log('[V5 STRUCTURE RESEARCH] '+JSON.stringify({
      at:new Date(h.ts).toISOString(),price:h.price,
      structure:h.structure.direction,phase:h.phase,
      valueArea:h.enjeu.valueArea,issue:h.enjeu.nearest&&h.enjeu.nearest.key,
      e15Up3h:h.attempts.e15Up3h,observations:updated.changed,
      decisionImpact:false,tradingEnabled:false}));
   }
  }catch(e){console.error('[V5 STRUCTURE RESEARCH] '+String(e.stack||e).slice(0,800));}
  finally{busy=false;}
 }
 tick();
 if(flags.has('--loop'))setInterval(tick,RUNTIME);
}
if(require.main===module)main();
module.exports={readSources,run,slim};
