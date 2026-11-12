'use strict';

/**
 * BOONO-TV 11/11/2026 — display-only four-part État vivant.
 *
 * Inputs: V5.4.3 PAPER + archived MCB confirmed candles + Audit/Elastic
 * causal events. No broker call, no decision or state mutation.
 * All timestamps are UTC epoch ms; the browser formats Europe/Stockholm.
 */
const fs=require('node:fs');
const path=require('node:path');
const causalView=require('../modules/v5/v53-causal-chain-view');

const TF_MS={3:180000,15:900000,60:3600000,240:14400000};
const NULL_IF_MISSING=x=>x===null||x===undefined||x===''||
  !Number.isFinite(Number(x))?null:Number(x);
const round=(v,d=1)=>NULL_IF_MISSING(v)===null?null:
  Math.round(Number(v)*10**d)/10**d;

function parseMcbConfirmed(csv,tfMinutes,asOf){
 const tf=TF_MS[tfMinutes],now=NULL_IF_MISSING(asOf);
 if(!tf||now===null)return [];
 return String(csv||'').split(/\r?\n/).flatMap(line=>{
  const f=line.split(',');
  if(f.length<15)return [];
  const sourceAt=Date.parse(f[0]);
  if(!Number.isFinite(sourceAt)||sourceAt+tf>now)return [];
  if([f[5],f[6]].some(v=>NULL_IF_MISSING(v)===null))return [];
  return [{
   sourceAt,availableAt:sourceAt+tf,
   bw:round(f[6]),lbw:round(f[5]),mf:round(f[7]),
   eventUp:NULL_IF_MISSING(f[13]),eventDown:NULL_IF_MISSING(f[14])
  }];
 }).sort((a,b)=>a.sourceAt-b.sourceAt);
}
// The 1h line reports two genuine CLOSED MCB candles, not a fabricated
// live value or a replay of the 4h numbers. E1 Live is unavailable until
// a separately timestamped native 1h intrabar event source is verified.
function confirmed1h(csv,asOf){
 const bars=parseMcbConfirmed(csv,60,asOf);
 const latest=bars.at(-1),previous=bars.at(-2);
 return {status:latest&&previous?'CONFIRMED':'UNAVAILABLE',
  bw:{previous:previous?.bw??null,confirmed:latest?.bw??null},
  lbw:{previous:previous?.lbw??null,confirmed:latest?.lbw??null},
  sourceAt:latest?.sourceAt??null,
  availableAt:latest?.availableAt??null,
  e1Live:null};
}
function confirmed4h(csv,asOf){
 const bars=parseMcbConfirmed(csv,240,asOf),latest=bars.at(-1),previous=bars.at(-2);
 const event=[...bars].reverse().find(x=>
  (x.eventUp!==null)!==(x.eventDown!==null));
 return {status:latest&&previous?'CONFIRMED':'UNAVAILABLE',
   bw:{previous:previous?.bw??null,confirmed:latest?.bw??null},
   lbw:{previous:previous?.lbw??null,confirmed:latest?.lbw??null},
   sourceAt:latest?.sourceAt??null,availableAt:latest?.availableAt??null,
   event:event?{direction:event.eventUp!==null?'UP':'DN',
     lbw:event.lbw,sourceAt:event.sourceAt,availableAt:event.availableAt}:null};
}
function rangeZone(rank){
 const x=NULL_IF_MISSING(rank);
 return x===null||x<0||x>1?null:
   x<=.25?'RANGE_LOW':x>=.75?'RANGE_HIGH':'RANGE_MID';
}
function pair(confirmed,live){
 return {confirmed:round(confirmed),live:round(live)};
}
// User-recorded VAH/POC/VAL ranges. Geometric classification ONLY: an
// observed price below VAL is not, by itself, proof of defended territory loss.
function recordedRanges(levels,price){
 const px=NULL_IF_MISSING(price),out={daily:null,big:null};
 if(px===null||!Array.isArray(levels))return out;
 const groups=new Map();
 for(const entry of levels){
  if(!entry||!['VAH','POC','VAL'].includes(entry.token))continue;
  const value=NULL_IF_MISSING(entry.price);
  if(value===null||value<=0||entry.groupId==null)continue;
  const scope=String(entry.label||'').trim().split(/\s+/)[1]?.toLowerCase();
  if(!['daily','big'].includes(scope))continue;
  const key=String(entry.groupId)+'|'+scope;
  if(!groups.has(key))groups.set(key,{scope,groupId:entry.groupId,values:{}});
  groups.get(key).values[entry.token]=value;
 }
 for(const g of groups.values()){
  const e=g.values;
  if(![e.VAL,e.POC,e.VAH].every(Number.isFinite)||!(e.VAL<e.POC&&e.POC<e.VAH))continue;
  const width=e.VAH-e.VAL;
  const zone=px<e.VAL?'BELOW_VAL':px>e.VAH?'ABOVE_VAH':
   px>e.POC?'ABOVE_POC':px<e.POC?'BELOW_POC':'AT_POC';
  const ref=px>=e.POC?e.VAH-e.POC:e.POC-e.VAL;
  const data={
   label:g.scope==='daily'?'DailyRange':'BigRange',groupId:g.groupId,
   val:e.VAL,poc:e.POC,vah:e.VAH,
   zone,positionPct:round(100*(px-e.VAL)/width,1),
   fairValuePct:round(100*(px-e.POC)/ref,1),
   distanceFromValUsd:round(px-e.VAL),
   distanceFromVahUsd:round(px-e.VAH),
   distanceFromPocUsd:round(px-e.POC),
   priceAsOf:'V543_ANALYSIS_PRICE',
   classificationProof:'GEOMETRY_ONLY_NO_TERRITORY_DEFENCE'
  };
  // Duplicate scopes must not be merged; use the newest UI group ID.
  if(!out[g.scope]||Number(g.groupId)>Number(out[g.scope].groupId))out[g.scope]=data;
 }
 return out;
}
function build({paper, audit=[],events=[],csv3='',csv15='',csv1='',csv4='',levels=[],now=Date.now()}={}){
 const a=paper?.latestAnalysis||{},r=a.readings||{},s54=r.structural54||{};
 const asOf=NULL_IF_MISSING(a.asOf),age=asOf===null?Infinity:now-asOf;
 const valid=paper?.brokerOrdersEnabled===false&&
   /^v5\.4\.3/.test(String(a.version||''))&&
   asOf!==null&&age>=-3000&&age<=90000&&a.quality==='DATA_OK';
 const output={version:'boono-tv-living-four-blocks-v1',
   source:'V543_PAPER_PLUS_CONFIRMED_MCB_AND_ELASTIC_AUDIT_READ_ONLY',
   decisionImpact:false,brokerOrdersEnabled:false,
   asOf,sourceAgeMs:Number.isFinite(age)?Math.round(age):null,
   status:valid?'DATA_RECENT':'SOURCE_STALE'};
 if(!valid)return output;

 const pastRows=Array.isArray(audit)?audit.filter(x=>
   NULL_IF_MISSING(x?.ts)!==null&&x.ts<=asOf):[];
 const last=pastRows.at(-1);
 const auditGood=!!last&&asOf-last.ts>=-3000&&asOf-last.ts<=95000;
 const obs=auditGood?last:null;
 const rows3=parseMcbConfirmed(csv3,3,asOf),
       rows15=parseMcbConfirmed(csv15,15,asOf);
 const bar3=rows3.at(-1),bar15=rows15.at(-1);
 // Never show confirmed candle as currently fresh if source has stalled.
 const recent3=bar3&&asOf-bar3.availableAt<=12*60000;
 const recent15=bar15&&asOf-bar15.availableAt<=35*60000;
 const chain=causalView.build({events,audit:pastRows,now:asOf,price:a.price,
   mcb15:r.mcb15,mcb3:r.mcb3})||{};
 const c=r.conversion||{},m=r.maContract?.ma3||{},
   m15=r.maContract?.ma15||{},
   mat=r.offensiveMaturity||{},con=mat.context||{},
   inv=a.invalidation||{},pos=paper.position||null;
 const source15=recent15?bar15:null,source3=recent3?bar3:null;
 const flow=obs&&NULL_IF_MISSING(obs.volumeFenetreBtc)!==null&&
   Number(obs.winSec)>0?round(Number(obs.volumeFenetreBtc)/Number(obs.winSec),2):null;
 output.trajectory={
  strategicState:s54.strategicState||null, director:s54.director||null,
  offensive:s54.currentOffensive||null,
  bw:pair(source15?.bw,obs?.live15BwRaw),
  lbw:pair(source15?.lbw,obs?.live15LbwRaw),
  mf:pair(source15?.mf,obs?.live15MfRaw),
  cross:chain.tf15?.cross||null,
  mf15Slope:round(obs?.mf15Pente,2),mf15Live:round(obs?.live15MfRaw,2),
  flowBtcPerSec:flow,
  ma15:{distanceUsd:round(m15.distanceUsd),
    state:m15.state||null,
    retests:Number.isInteger(m15.polarityMemory?.retestsSinceChange)?
     m15.polarityMemory.retestsSinceChange:null,
    confirmedContactBars:Number.isInteger(m15.confirmedContactBars)?
     m15.confirmedContactBars:null},
  confirmedAt:source15?.availableAt??null,
  liveSampledAt:obs?.ts??null
 };
 output.tactical={
  phase:s54.phase||r.maturity?.phase||null,
  alignment:chain.alignment||'UNRESOLVED',
  bw:pair(source3?.bw,obs?.liveBw),
  lbw:pair(source3?.lbw,obs?.liveLbw),
  mf:pair(source3?.mf,obs?.liveMoneyFlow),
  cross:chain.tf3?.cross||null,
  ma3:{distanceUsd:round(m.distanceUsd),
    state:m.state||null,
    retests:Number.isInteger(m.polarityMemory?.retestsSinceChange)?
      m.polarityMemory.retestsSinceChange:null,
    confirmedContactBars:Number.isInteger(m.confirmedContactBars)?
      m.confirmedContactBars:null},
  confirmedAt:source3?.availableAt??null,liveSampledAt:obs?.ts??null
 };
 const rank=NULL_IF_MISSING(s54.priceRangeRank);
 output.place={
  candidate:a.candidate||null,
  extended:s54.extendedTacticalWave===true,
  priceRangeRank:round(rank,2),rangeZone:rangeZone(rank),
  recordedRanges:recordedRanges(levels,a.price),
  priceAsOf:asOf,
  h4:confirmed4h(csv4,asOf),
  h1:confirmed1h(csv1,asOf)
 };
 output.causal={
  pmLiveUsd:round(c.pmCombined),
  cross3:chain.tf3?.cross||null,
  e3Live:chain.tf3?.live||null,e3Confirmed:chain.tf3?.confirmed||null,
  cross15:chain.tf15?.cross||null,
  e15Live:chain.tf15?.live||null,e15Confirmed:chain.tf15?.confirmed||null,
  note:chain.meaning||'Observed event times, not a guaranteed chronological order'
 };
 output.structure={
  phase:s54.phase||null,campaignId:s54.campaignId||null,
  priceRangeRank:round(s54.priceRangeRank,2),
  mf15History2h:round(s54.mf15History2h),
  matureAfterExtension:s54.matureAfterExtension===true
 };
 output.position=pos&&['long','short'].includes(pos.direction)?
  {paper:true,direction:pos.direction,entryPrice:round(pos.entryPrice),
   entryAt:NULL_IF_MISSING(pos.entryAt),
   potentialNetPnlUsd:round(pos.lastNetPnlUsd),
   mfePriceUsd:round(pos.mfePriceUsd),maePriceUsd:round(pos.maePriceUsd),
   gainFloorUsd:round(pos.gainFloorUsd),
   floorAdvisory:!String(pos.floorAuthorityVersion||'')
     .startsWith('v543-legacy-autonomous'),
   invalidationPrice:round(pos.invalidationPrice),
   invalidationReference:pos.invalidationReference||null}:null;
 output.offensive={
  classification:mat.classification||null,
  priceOrigin4hAt:NULL_IF_MISSING(con.priceOrigin?.origin4h?.availableAt),
  progress4hUsd:round(con.priceOrigin?.origin4h?.progressUsd),
  atPrice2hEdge:con.priceGeometry?.priceAt2hExtreme===true,
  oppositeDivergenceForming:con.oscillator?.oppositeDivergenceForming===true,
  conversionFatigue:con.conversion?.conversionFatigue===true
 };
 return output;
}
// File contents are reloaded only when mtime/size changes; a 5s TV publish
// must not parse the multi-MB Audit JSON on every frame.
function createReader({dataDir,mcDir}={}){
 const data=dataDir||path.resolve(__dirname,'../data');
 const mcb=mcDir||'/root/agents-ia-zero-one/data/mcb-live';
 const cache=new Map();
 function read(file,transform,fallback){
  let st;try{st=fs.statSync(file);}catch(_){return fallback;}
  const old=cache.get(file);
  if(old?.mtime===st.mtimeMs&&old?.size===st.size)return old.data;
  try{
   const value=transform(file,st);
   cache.set(file,{mtime:st.mtimeMs,size:st.size,data:value});
   return value;
  }catch(_){return old?.data??fallback;}
 }
 function tail(file,max){
  return read(file,(name,st)=>{
   const sz=Math.min(st.size,max),b=Buffer.alloc(sz),fd=fs.openSync(name,'r');
   try{fs.readSync(fd,b,0,sz,st.size-sz)}finally{fs.closeSync(fd)}
   return b.toString('utf8');
  },'');
 }
 function jsonTail(file){
  return read(file,name=>{
   const raw=JSON.parse(fs.readFileSync(name,'utf8'));
   return Array.isArray(raw)?raw.slice(-500):[];
  },[]);
 }
 function eventsTail(file){
  return read(file,(name,st)=>{
   const sz=Math.min(st.size,1024*1024),buf=Buffer.alloc(sz);
   const fd=fs.openSync(name,'r');try{fs.readSync(fd,buf,0,sz,st.size-sz)}finally{fs.closeSync(fd)}
   const str=buf.toString('utf8');
   const lines=str.split(/\r?\n/).slice(st.size>sz?1:0);
   return lines.flatMap(line=>{
     try{const v=JSON.parse(line);return v&&['MCB3','MCB15'].includes(v.family)?
       [v]:[];}catch(_){return []}
   }).slice(-1500);
  },[]);
 }
 const fsCsv=(tf)=>path.join(mcb,'mcb_'+tf+'.csv');
 return paper=>build({paper,now:Date.now(),
   audit:jsonTail(path.join(data,'audit-history.json')),
   events:eventsTail(path.join(data,'elastic-observer-events.ndjson')),
   levels:read(path.join(data,'levels.json'),name=>{
    const parsed=JSON.parse(fs.readFileSync(name,'utf8'));
    return Array.isArray(parsed)?parsed:[];
   },[]),
   csv3:tail(fsCsv('3m'),30000),
   csv15:tail(fsCsv('15m'),30000),
   csv1:tail(fsCsv('1h'),30000),
   csv4:tail(fsCsv('4h'),100000)});
}
module.exports={build,parseMcbConfirmed,confirmed1h,confirmed4h,rangeZone,recordedRanges,createReader};
