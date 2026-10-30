'use strict';
// Bounded on-demand NDJSON history. Reads backwards in 64 KiB chunks,
// never parses the entire journal or the active V494/PAPER files.
const fs=require('fs'),path=require('path');
const {listSegments}=require('../v3lab/storage/rotating-ndjson');
const {GROUPS,VERSION}=require('./v494-elastic-state-layer');
const KNOWN=new Set(GROUPS.map(x=>x[0]));
const MAX_LIMIT=80,READ_CHUNK=64*1024;
function page(active,{hours=24,limit=45,kind='transitions',
  family='ALL',before=null,now=Date.now()}={}){
 if(!['transitions','snapshots'].includes(kind))throw Error('STATE_HISTORY_INVALID_KIND');
 if(![6,24,48,168,336].includes(Number(hours)))throw Error('STATE_HISTORY_INVALID_HOURS');
 if(family!=='ALL'&&!KNOWN.has(family))throw Error('STATE_HISTORY_INVALID_FAMILY');
 const max=Math.min(MAX_LIMIT,Math.max(1,Math.trunc(Number(limit)||45)));
 const cutoff=now-Number(hours)*3600000;
 const beforeValue=before===null||before===''?null:Number(before);
 if(beforeValue!==null&&(!Number.isSafeInteger(beforeValue)||beforeValue<=0))
  throw Error('STATE_HISTORY_INVALID_CURSOR');
 const segments=listSegments(active).reverse();
 if(fs.existsSync(active))segments.unshift(active);
 const rows=[],ids=new Set();let scanningDone=false,scannedBytes=0;
 // At most 32 MiB for one interactive request; report cap transparently.
 const byteLimit=32*1024*1024;
 function visit(line){
  if(!line)return;
  let e;try{e=JSON.parse(line);}catch(_){return;}
  if(e.version!==VERSION||e.decisionImpact!==false||
      e.brokerOrdersEnabled!==false)return;
  const at=Number(e.at??e.asOf);
  if(!Number.isFinite(at)||at>now+30000)return;
  if(at<cutoff){scanningDone=true;return;}
  const c=kind==='snapshots'?at:Number(e.seq);
  if(!Number.isSafeInteger(c)||c<=0||beforeValue!==null&&c>=beforeValue)return;
  if(kind==='transitions'&&family!=='ALL'&&e.family!==family)return;
  if(kind==='snapshots'&&family!=='ALL'&&!e.states?.[family])return;
  const key=kind==='transitions'?String(e.id):String(at);
  if(ids.has(key))return;
  ids.add(key);
  rows.push(kind==='transitions'?{
    cursor:c,id:String(e.id).slice(0,80),seq:e.seq,at,asOf:at,price:e.price,
    family:e.family,title:e.title,origin:e.origin,
    from:e.from,to:e.to,transition:e.transition,
    sourceAt:e.sourceAt,sourceTs:e.sourceTs,
    mcb15Direction:e.mcb15Direction,
    researchOnly:e.researchOnly===true
  }:{
    cursor:c,at,price:e.price,states:e.states,
    sources:{e3SourceTs:e.sources?.e3SourceTs,
      e15SourceTs:e.sources?.e15SourceTs,
      tickerObservationTs:e.sources?.tickerObservationTs,
      mcb15Direction:e.sources?.mcb15Direction},
    measurements:{pm3Usd:e.measurements?.pm3Usd,
      pm5Usd:e.measurements?.pm5Usd,
      pmLiveUsd:e.measurements?.pmLiveUsd,
      yieldVsP75:e.measurements?.yieldVsP75,
      effortVsP75:e.measurements?.effortVsP75,
      aggressiveFlowBtcPerSec:e.measurements?.aggressiveFlowBtcPerSec,
      passiveLiquidity:'NOT_MEASURED'}
  });
 }
 for(const filename of segments){
  if(rows.length>max||scanningDone||scannedBytes>=byteLimit)break;
  let fd,stat;
  try{fd=fs.openSync(filename,'r');stat=fs.fstatSync(fd);}
  catch(_){continue;}
  try{
   let pos=stat.size,carry=Buffer.alloc(0);
   while(pos>0&&rows.length<=max&&!scanningDone&&scannedBytes<byteLimit){
    const size=Math.min(READ_CHUNK,pos,byteLimit-scannedBytes),buffer=Buffer.alloc(size);
    pos-=size;scannedBytes+=size;fs.readSync(fd,buffer,0,size,pos);
    const combined=Buffer.concat([buffer,carry]);
    let end=combined.length;
    for(let i=combined.length-1;i>=0;i--){
     if(combined[i]!==10)continue; // newline byte; preserve UTF8 codepoints
     visit(combined.subarray(i+1,end).toString('utf8').replace(/\r$/,''));
     end=i;
     if(rows.length>max||scanningDone)break;
    }
    carry=combined.subarray(0,end);
   }
   if(pos===0&&carry.length&&rows.length<=max&&!scanningDone)
    visit(carry.toString('utf8'));
  }finally{fs.closeSync(fd);}
 }
 const hasMore=rows.length>max,items=rows.slice(0,max);
 return {kind,family,hours:Number(hours),asOf:now,
  items,hasMore,nextBefore:hasMore?items.at(-1).cursor:null,
  truncatedByScanBudget:scannedBytes>=byteLimit,
  scannedBytes,storage:'ROTATING_NDJSON_CAPACITY_BOUNDED_NOT_14D_GUARANTEED',
  source:'V494_ELASTIC_STATE_LAYER_ONLY',decisionImpact:false,
  brokerOrdersEnabled:false};
}
module.exports={page,MAX_LIMIT};
