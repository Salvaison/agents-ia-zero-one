'use strict';
// Pure AS-OF replay of V553, no PAPER modification and no simulated fills.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const D=require('../modules/v553/decision'),S=require('../modules/v553/source');
const ROOT=path.resolve(__dirname,'..');
const old=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v552-paper-state.json')));
// The rolling audit is concurrently rewritten by Bâton. Historical replays
// must never crash on a transient partial JSON write; hourly archives are
// canonical for this period.
let auditLive=[];
try{auditLive=JSON.parse(fs.readFileSync(path.join(ROOT,'data/audit-history.json')));}
catch(e){if(!(e instanceof SyntaxError))throw e;}
const archived=new Map();
const archiveFolder=path.join(ROOT,'data/audit-14d');
for(const n of fs.readdirSync(archiveFolder).filter(n=>
 /^audit-202611(19|20)T\d{2}\.ndjson(\.gz)?$/.test(n))){
 const raw=fs.readFileSync(path.join(archiveFolder,n));
 const text=n.endsWith('.gz')?zlib.gunzipSync(raw).toString():raw.toString();
 for(const row of text.split('\n')){
  try{const x=JSON.parse(row);archived.set(x.ts,x);}catch(_){}
 }
}
for(const x of auditLive)archived.set(x.ts,x);
const audit=[...archived.values()].sort((a,b)=>a.ts-b.ts);
function loadAt(ts){
 const a=audit.filter(r=>r.ts<=ts).slice(-1000);
 const x=S.load(ts,{auditRows:a});
 x.samples=a;x.current=a.at(-1)||null;
 x.healthy=!!x.current&&ts-x.current.ts>=0&&
  ts-x.current.ts<=65000&&x.bars.m3.length>=8&&
  x.bars.m15.length>=5;
 return x;
}
function stamp(t){return new Date(t).toLocaleString('sv-SE',{timeZone:'Europe/Stockholm'});}
function replayPosition(t){
 const mem=D.originalMemory(t.entryAt-1);
 const start=audit.filter(x=>x.ts<=t.entryAt).at(-1);
 if(start){
  const o=D.sensor(loadAt(start.ts),start.ts,start.lastPrice);
  mem.lastSlope=o?.mcb15.slope3??null;
  mem.lastGap=o?.mcb15.gap??null;
  mem.lastPM=o?.pm.live??null;
 }
 const pos={direction:t.direction,entryAt:t.entryAt,
  entryPrice:t.entryPrice,entryFeeUsd:.75,
  mfePriceUsd:0,maePriceUsd:0,episodeId:t.episodeId,
  inheritedFrom:'V552_HISTORICAL_REPLAY'};
 const q=audit.filter(x=>x.ts>t.entryAt&&x.ts<=t.exitAt);
 let first=null,firstLive=null,firstSlope=null,active=0,live=0,early=0;
 for(const x of q){
  const r=D.evaluate(mem,loadAt(x.ts),x.lastPrice,x.ts,pos).decision;
  if(mem.threat?.startedAt&&!firstSlope)firstSlope=mem.threat.startedAt;
  if(mem.threat?.firstLiveAt&&!firstLive)firstLive=mem.threat.firstLiveAt;
  if(r.action.startsWith('EXIT')){
   if(!first)first={at:x.ts,price:x.lastPrice,
    reason:r.reason,chain:r.chain,
    market:r.market?.status};
   if(r.reason.includes('CROSS15_LIVE'))live++;
   else early++;
  }
  active++;
 }
 return {trade:t.tradeNo,direction:t.direction,
  entryAt:stamp(t.entryAt),actualExitAt:stamp(t.exitAt),
  netActual:t.netPnlUsd,checked:active,
  firstSlope:firstSlope?stamp(firstSlope):null,
  firstLive:firstLive?stamp(firstLive):null,
  firstExit:first?{...first,at:stamp(first.at),chain:undefined}:null,
  hypotheticalExitNet:first?
   Math.round((((t.direction==='long'?1:-1)*(first.price-t.entryPrice)*
   1500/t.entryPrice)-.75-.0005*1500*first.price/t.entryPrice)*10000)/10000:null,
  triggeredTicks:live+early};
}
function replayFlat(from,to){
 const start=audit.filter(x=>x.ts<=from).at(-1);
 const mem=D.originalMemory(from-1,{at:from-1,price:start?.lastPrice,
  reason:'REPLAY_START_FLAT'});
 if(start){
  const o=D.sensor(loadAt(start.ts),start.ts,start.lastPrice);
  mem.lastSlope=o?.mcb15.slope3??null;
  mem.lastGap=o?.mcb15.gap??null;
  mem.lastPM=o?.pm.live??null;
 }
 const q=audit.filter(x=>x.ts>from&&x.ts<=to);
 let entered=null,chains=[],states=[];
 for(const x of q){
  const r=D.evaluate(mem,loadAt(x.ts),x.lastPrice,x.ts,null).decision;
  if(r.recentEvents?.length)chains.push(...r.recentEvents);
  if(r.market?.status!==states.at(-1)?.status)
   states.push({at:stamp(x.ts),status:r.market?.status,
    reason:r.market?.reason,price:x.lastPrice});
  if(r.action.startsWith('ENTER')&&!entered){
   entered={at:stamp(x.ts),price:x.lastPrice,direction:r.candidate,
    chain:r.chain,reason:r.reason,
    market:r.market?.status};
  }
 }
 return {started:stamp(from),ended:stamp(to),
  firstEntry:entered?
   {at:entered.at,price:entered.price,direction:entered.direction,
    chainAt:stamp(entered.chain.startedAt),reason:entered.reason,
    market:entered.market}:null,
  chainEvents:chains.slice(0,17),marketChanges:states.slice(0,17)};
}
const args=process.argv.slice(2),out={asofOnly:true,
 noWrites:true,policy:D.VERSION,
 positions:[],flat:[]};
const selected=args.filter(x=>/^\d+$/.test(x)).map(Number);
for(const t of old.history.filter(x=>selected.length?
  selected.includes(x.tradeNo):[16,17,19,20,21,22,23,24,25,26,27].includes(x.tradeNo)))
 out.positions.push(replayPosition(t));
const from=Date.parse('2026-11-19T15:40:00+01:00');
const until=Date.parse('2026-11-19T16:08:00+01:00');
out.flat.push(replayFlat(from,until));
console.log(JSON.stringify(out,null,2));
