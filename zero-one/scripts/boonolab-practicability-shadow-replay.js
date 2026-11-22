'use strict';
// Historical AS-OF backfill for the independent geometric practicability SHADOW.
// Explicit --publish writes only new SHADOW files (never PAPER or engine state).
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const p=require('../modules/attention/boonolab-market-practicability-shadow');
const place=require('../modules/attention/boonolab-place-e1e4-shadow');
const {appendRotatingNdjson}=require('../modules/v3lab/storage/rotating-ndjson');
const ROOT=path.resolve(__dirname,'..'),DATA=path.join(ROOT,'data');
const DIR=path.join(DATA,'audit-14d');
const FILE={
 state:path.join(DATA,'boonolab-practicability-shadow-state.json'),
 summary:path.join(DATA,'boonolab-practicability-shadow-summary.json'),
 samples:path.join(DATA,'boonolab-practicability-shadow-samples.ndjson'),
 report:path.join(DATA,'boonolab-practicability-shadow-replay-report.json'),
 trades:path.join(DATA,'v553-paper-state.json'),
 levels:path.join(DATA,'levels.json'),
 one:path.join(ROOT,'../data/mcb-live/mcb_1h.csv'),
 four:path.join(ROOT,'../data/mcb-live/mcb_4h.csv')};
const since=Date.parse('2026-11-20T16:00:00+01:00');
const warmup=since-4*3600000;
const asOf=Date.now();
function dataset(){
 const unique=new Map(),hourFiles=fs.readdirSync(DIR).filter(x=>
  /^audit-202611(20|21|22)T\d\d\.ndjson(\.gz)?$/.test(x)).sort();
 for(const file of hourFiles){
  const raw=fs.readFileSync(path.join(DIR,file));
  const text=file.endsWith('.gz')?zlib.gunzipSync(raw).toString():raw.toString();
  for(const l of text.split('\n')){
   if(!l)continue;
   try{
    const x=JSON.parse(l);
    if(Number.isFinite(x.ts)&&x.ts>=warmup&&x.ts<=asOf&&
     Number.isFinite(x.lastPrice))unique.set(x.ts,x);
   }catch(_){}
  }
 }
 let live=[];
 try{live=JSON.parse(fs.readFileSync(path.join(DATA,'audit-history.json')));}
 catch(err){if(!(err instanceof SyntaxError))throw err;}
 for(const x of live){
  if(Number.isFinite(x.ts)&&x.ts>=warmup&&x.ts<=asOf&&
    Number.isFinite(x.lastPrice))unique.set(x.ts,x);
 }
 return [...unique.values()].sort((a,b)=>a.ts-b.ts);
}
function atomic(file,x){
 const temp=file+'.temp-'+process.pid;
 fs.writeFileSync(temp,JSON.stringify(x));fs.renameSync(temp,file);
}
function nearest(samples,at){
 let lo=0,hi=samples.length;
 while(lo<hi){const mid=(lo+hi)>>1;
  if(samples[mid].asOf<=at)lo=mid+1;else hi=mid;}
 const x=samples[lo-1];
 return x&&at-x.asOf<=90000?x:null;
}
function replay(){
 const rows=dataset();if(rows.length<1000)
  throw Error('PRACTICABILITY_REPLAY_INSUFFICIENT_HISTORIC_BATON');
 const b1=place.parseMcbCsv(fs.readFileSync(FILE.one,'utf8'),'1h');
 const b4=place.parseMcbCsv(fs.readFileSync(FILE.four,'utf8'),'4h');
 const lev=JSON.parse(fs.readFileSync(FILE.levels,'utf8'));
 const levelsMtime=Math.trunc(fs.statSync(FILE.levels).mtimeMs);
 const state=p.initial(since);const samples=[],frames=[];
 const startIndex=rows.findIndex(x=>x.ts>=since);
 if(startIndex<0)throw Error('NO_ANALYZABLE_REPLAY_WINDOW');
 for(let i=startIndex;i<rows.length;i++){
  const x=rows[i];if(x.ts>asOf)break;
  const q=p.evaluate({audit:rows,asOf:x.ts,bars1h:b1,bars4h:b4,
   levels:lev,levelsMtime});
  p.observe(state,q);
  // Prospective read model uses only observations no later than x.ts.
  const frame={asOf:x.ts,price:x.lastPrice,
   decisionImpact:false,brokerOrdersEnabled:false,
   covered:q.coverage.ready,
   variants:Object.fromEntries(Object.entries(q.proposed).map(([name,v])=>
    [name,{closed:v.proposedClosed,raw:v.rawClosed,
     rescue:v.productiveEscape,geometry:v.geometry,
     economy:v.economy,slowUnresolved:v.unresolved}])),
   evidence:{
    cross15:q.measurements.recent30m.flip15,
    cross3:q.measurements.recent30m.flip3,
    gap15median:q.measurements.recent30m.absGap15Median,
    priceEfficiency:q.measurements.recent30m.efficiency,
    retained:q.measurements.recent30m.retained,
    priceWaveOpposition:q.higher.priceWaveOpposition,
    parentOpposition:q.higher.parentOpposition,
    slowDir:q.higher.slowDir,
    directionalGap:q.higher.direction},
   source:'OBSERVED_ASOF_BATON_E1_E4_CONFIRMED_BAR_END'};
  samples.push(frame);
  if(q.coverage.ready)frames.push(frame);
 }
 const ledger=JSON.parse(fs.readFileSync(FILE.trades,'utf8'));
 if(ledger.brokerOrdersEnabled!==false||ledger.policyVersion!==
   'v5.5.3-live-causal-price-market-paper-v1')
  throw Error('REPLAY_REFUSE_UNEXPECTED_PAPER_SOURCE');
 const trades=ledger.history.filter(x=>x.entryAt>=since&&x.entryAt<=asOf);
 const matched=trades.map(t=>{
  const f=nearest(samples,t.entryAt);
  return {tradeNo:t.tradeNo,direction:t.direction,entryAt:t.entryAt,
   netActualUsd:t.netPnlUsd,winActual:t.netPnlUsd>0,
   ageSeconds:f?Math.round((t.entryAt-f.asOf)/1000):null,
   variantAtEntry:f?Object.fromEntries(Object.entries(f.variants)
    .map(([name,q])=>[name,{closed:q.closed,raw:q.raw,
     rescue:q.rescue,geometry:q.geometry,economy:q.economy,
     slowUnresolved:q.slowUnresolved}])):null,
   lastFrameAt:f?.asOf??null};
 });
 const windows=[
  {name:'21_NOV_17H_23H',start:Date.parse('2026-11-21T17:00:00+01:00'),
   end:Date.parse('2026-11-21T23:00:00+01:00')},
  {name:'22_NOV_12H_17H',start:Date.parse('2026-11-22T12:00:00+01:00'),
   end:Date.parse('2026-11-22T17:00:00+01:00')},
  {name:'22_NOV_00H_07H',start:Date.parse('2026-11-22T00:00:00+01:00'),
   end:Date.parse('2026-11-22T07:00:00+01:00')},
  {name:'22_NOV_07H_12H',start:Date.parse('2026-11-22T07:00:00+01:00'),
   end:Date.parse('2026-11-22T12:00:00+01:00')}
 ].map(w=>{
  const x=frames.filter(s=>s.asOf>=w.start&&s.asOf<w.end);
  return {...w,knownSamples:x.length,variants:Object.fromEntries(
   Object.keys(p.VARIANTS).map(name=>[name,{
    closed:x.filter(s=>s.variants[name].closed).length,
    percent:x.length?Math.round(10000*x.filter(s=>s.variants[name].closed).length/x.length)/100:null,
    raw:x.filter(s=>s.variants[name].raw).length,
    rescue:x.filter(s=>s.variants[name].raw&&s.variants[name].rescue).length
   }]))};
 });
 const modes=Object.fromEntries(Object.keys(p.VARIANTS).map(name=>{
  const candidates=matched.filter(x=>x.variantAtEntry);
  const blocked=candidates.filter(x=>x.variantAtEntry[name].closed);
  return [name,{entriesObserved:candidates.length,
   entriesFlagged:blocked.length,
   winsFlagged:blocked.filter(x=>x.winActual).length,
   lossesFlagged:blocked.filter(x=>!x.winActual).length,
   flaggedActualPnLUsd:Math.round(blocked.reduce(
    (s,x)=>s+x.netActualUsd,0)*100)/100,
   entryFlaggedTradeNumbers:blocked.map(x=>x.tradeNo)}];
 }));
 const report={version:p.VERSION,mode:'REPLAY_ASOF_SHADOW_ONLY',
  decisionImpact:false,brokerOrdersEnabled:false,
  replayStart:since,replayEnd:rows.at(-1).ts,
  historicalRows:rows.length,replayedRows:samples.length,
  coverage:p.summary(state),windows,entryMatches:matched,
  entryExposure:modes,
  source:'HOURLY_AUDIT_ARCHIVES_PLUS_ROLLING_JSON_MCBCSV_CLOSED_ONLY',
  sourceDetails:{firstHistoricAudit:rows[0].ts,
   lastHistoricAudit:rows.at(-1).ts,
   e1E4:'NATIVE_E_EVENT_BAR_CLOSE_PROXY',
   manualRanges:'SKIPPED_BEFORE_CURRENT_LEVELS_MTIME; NO FUTURE_MANUAL_RANGE'},
  caveats:[
   'Shadow flags only on frames sampled every 30 seconds; percent is time coverage, not market hours literally shut',
   'Historic ledger outcomes cannot be deleted to infer strategy PnL',
   'Trades blocked ex-post are matched observations, NOT full counterfactual reentries',
   'Sensitivity settings are exploratory and must not be optimized on these same trades',
   'No effect on engines or brokers; separate shadow files only']};
 if(process.argv.includes('--publish')){
  if(fs.existsSync(FILE.state)||fs.existsSync(FILE.report))
   throw Error('SHADOW_ALREADY_INITIALIZED_REFUSE_TO_OVERWRITE');
  const chunks=samples.map(x=>JSON.stringify(x)).join('\n')+'\n';
  const tmp=FILE.samples+'.tmp-'+process.pid;
  fs.writeFileSync(tmp,chunks);fs.renameSync(tmp,FILE.samples);
  atomic(FILE.state,state);atomic(FILE.summary,p.summary(state));
  atomic(FILE.report,report);
  console.log('SHADOW_PUBLISHED',FILE.state,FILE.summary,FILE.report);
 }
 console.log(JSON.stringify({model:p.VERSION,mode:report.mode,
  asOf:report.replayEnd,historicalRows:rows.length,
  samples:report.replayedRows,covered:state.coveredSamples,
  fractions:report.coverage.variants,windows,
  entryExposure:modes,
  selectedTrades:matched.filter(x=>[33,38,43,46,51,55,56,57,
   58,59,60,61,62,63,64,65,66,67].includes(x.tradeNo)),
  NO_PAPER_WRITES:true},null,2));
}
if(require.main===module)replay();
module.exports={dataset,nearest,replay};
