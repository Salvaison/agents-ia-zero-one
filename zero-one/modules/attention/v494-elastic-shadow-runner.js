'use strict';
// Independent BOONO Elastic laboratory for V4.9.4.
// STRICTLY READ-ONLY with respect to V494/V543, no broker, no engine.evaluate.
// Reads only current V494 state + 64 KiB of already confirmed MCB3 candles.
const fs=require('fs'),path=require('path');
const lab=require('./v494-elastic-shadow');
const stateLayer=require('./v494-elastic-state-layer');
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const V494=path.join(DATA,'v494-paper-state.json');
const STATE=path.join(DATA,'v494-elastic-shadow-state.json');
const SUMMARY=path.join(DATA,'v494-elastic-shadow-summary.json');
const EVENTS=path.join(DATA,'v494-elastic-shadow-events.ndjson');
const SAMPLES=path.join(DATA,'v494-elastic-shadow-samples.ndjson');
const STATE_TIMELINE=path.join(DATA,'v494-elastic-state-timeline.ndjson');
const STATE_SAMPLES=path.join(DATA,'v494-elastic-state-observations.ndjson');
const STATE_SUMMARY=path.join(DATA,'v494-elastic-state-summary.json');
const BARS3=path.resolve(ROOT,'../data/mcb-live/mcb_3m.csv');
const PERIOD_MS=30000,MAX_BYTES=8*1024*1024;
const read=(p,alt=null)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(e){if(e.code==='ENOENT')return alt;throw e;}};
function write(p,v){
 const dest=p+'.tmp-'+process.pid;
 fs.writeFileSync(dest,JSON.stringify(v));fs.renameSync(dest,p);
}
function latestConfirmedBars(maxRows=65){
 const fd=fs.openSync(BARS3,'r');
 try{
  const st=fs.fstatSync(fd),size=Math.min(st.size,65536);
  const buf=Buffer.alloc(size);fs.readSync(fd,buf,0,size,st.size-size);
  const lines=buf.toString('utf8').split(/\r?\n/);
  // Tail starts inside a row if over 64 KiB; never parse that partial line.
  if(st.size>size)lines.shift();
  return lines.filter(x=>x&&/^\d{4}-\d\d-\d\dT/.test(x))
   .slice(-maxRows).map(line=>{
     const v=line.split(',');return {ts:Date.parse(v[0]),
       open:Number(v[1]),high:Number(v[2]),low:Number(v[3]),close:Number(v[4])};
   }).filter(x=>Number.isFinite(x.ts)&&Number.isFinite(x.high)&&
     Number.isFinite(x.low)&&x.high>=x.low);
 }finally{fs.closeSync(fd);}
}
function source(){
 const paper=read(V494);
 if(!paper||paper.mode!=='PAPER_V494_ONLY'||paper.gitRef!=='cdf1936'||
   paper.brokerOrdersEnabled!==false||!paper.priorEval)
  throw Error('ELASTIC_V494_UNTRUSTED_OR_MISSING_FROZEN_PAPER_SOURCE');
 const at=Number(paper.lastObservationAt),e=paper.priorEval;
 if(!Number.isFinite(at)||Math.abs(at-Number(e.marketTimestamp))>1000||
    !Number.isFinite(Number(e.price)))
  throw Error('ELASTIC_V494_PAPER_STATE_ASOF_MISMATCH');
 const price=Number(e.price),range=lab.rangeFromConfirmed3m(
   latestConfirmedBars(),at,price);
 return {asOf:at,price,evaluation:e,range,
   position:paper.position,decision:paper.latestDecision,
   quality:paper.latestDecision?.quality||'UNKNOWN',
   paperCompleted:paper.completed};
}
function checkOnly(){
 const x=source(),cv=lab.stateForEval(x.evaluation,null);
 console.log(JSON.stringify({mode:'SHADOW_TEST_READ',version:lab.VERSION,
   asOf:x.asOf,price:x.price,sourceAgeMs:Date.now()-x.asOf,
   classification:{quality:cv.quality,direction:cv.direction,
    yieldVsP75:cv.yieldVsP75,effortVsP75:cv.effortVsP75,
    source:cv.source},range2h:x.range,quality:x.quality,
   v494PaperCompleted:x.paperCompleted,decisionImpact:false,
   brokerOrdersEnabled:false},null,2));
}
function main(){
 if(process.argv.includes('--test-read'))return checkOnly();
 let s=read(STATE);
 s=s?lab.validate(s):lab.initial(Date.now());
 s.stateLayer=s.stateLayer?stateLayer.validate(s.stateLayer):stateLayer.initial();
 if(s.lastObservationAt>Date.now()+30000)
  throw Error('ELASTIC_V494_SHADOW_FUTURE_STATE_REFUSED');
 console.log('[V494 ELASTIC SHADOW] '+JSON.stringify({version:lab.VERSION,
   mode:s.mode,decisionImpact:s.decisionImpact,brokerOrdersEnabled:false,
   observations:s.observations,lastObservationAt:s.lastObservationAt,
   paperSource:'v494-paper-state.json FROZEN_CDF1936'}));
 let busy=false,failures=0;
 function tick(){
  if(busy)return;busy=true;
  try{
   const x=source(),now=Date.now();
   const result=lab.advance(s,x,now);s=result.state;
   if(result.changed){
    const states=stateLayer.extract(x.evaluation,s,x.asOf);
    const stateOut=stateLayer.observe(s.stateLayer,states);
    s.stateLayer=stateOut.state;
    for(const event of stateOut.transitions)
     appendRotatingNdjson(STATE_TIMELINE,event,{maxBytes:MAX_BYTES,maxSegments:12});
    appendRotatingNdjson(STATE_SAMPLES,states,{maxBytes:MAX_BYTES,maxSegments:12});
    s.activePositionComparison={direction:x.position?.direction||'FLAT',
     entryPrice:x.position?.entryPrice??null,entryAt:x.position?.entryAt??null,
     tradeNo:x.paperCompleted+(x.position?1:0)};
    s.lastDecision={type:x.decision?.type||'UNKNOWN',
      reason:String(x.decision?.reason||'').slice(0,140),
      marketTs:x.decision?.marketTs??null};
    for(const event of result.events)
     appendRotatingNdjson(EVENTS,event,{maxBytes:MAX_BYTES,maxSegments:12});
    appendRotatingNdjson(SAMPLES,{asOf:x.asOf,price:x.price,
      quality:s.latestQuality?.quality,direction:s.latestQuality?.direction,
      effortVsP75:s.latestQuality?.effortVsP75,
      yieldVsP75:s.latestQuality?.yieldVsP75,
      rangeLow:s.range2h?.low,rangeHigh:s.range2h?.high,
      position:x.position?.direction||'FLAT',
      campaignId:s.campaignId,decisionImpact:false},
     {maxBytes:MAX_BYTES,maxSegments:12});
    write(STATE,s);
    write(SUMMARY,lab.summary(s,now));
    write(STATE_SUMMARY,stateLayer.summary(s.stateLayer));
    const important=result.events.filter(y=>y.type==='NEW_EVENT'&&
      y.kind!=='QUALITY_CONFIRMED_SILENT'&&y.kind!=='QUALITY_CONFIRMED_INEFFICIENT');
    if(important.length)console.log('[V494 ELASTIC EVENT] '+JSON.stringify(
      important.map(y=>({kind:y.kind,ts:y.at,price:y.price,
        direction:y.direction,edge:y.rangeEdge})).slice(-5)));
   }
   failures=0;
  }catch(e){
   if(++failures<=4||failures%20===0)
    console.error('[V494 ELASTIC SHADOW ERROR] '+e.stack);
  }finally{busy=false;}
 }
 tick();setInterval(tick,PERIOD_MS);
}
if(require.main===module)main();
module.exports={latestConfirmedBars,source,checkOnly};
