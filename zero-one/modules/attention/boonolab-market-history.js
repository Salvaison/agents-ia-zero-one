'use strict';
// Reverse-chunk bounded history; no periodic browser refresh needed.
const fs=require('node:fs'),path=require('node:path');
const {listSegments}=require('../v3lab/storage/rotating-ndjson');
const chr=require('./boonolab-causal-chronicle');
const MAX_BYTES=16*1024*1024,CHUNK=64*1024,MAX=80;
function page(active,{kind='events',hours=48,family='ALL',
  limit=40,before=null,now=Date.now()}={}){
 if(!['events','snapshots'].includes(kind))throw Error('LAB_HISTORY_BAD_KIND');
 if(![6,24,48,168,336].includes(Number(hours)))throw Error('LAB_HISTORY_BAD_HOURS');
 if(!['ALL',...chr.FAMILIES].includes(family))throw Error('LAB_HISTORY_BAD_FAMILY');
 const lim=Math.min(MAX,Math.max(1,Math.trunc(Number(limit)||40)));
 const cursor=before===null||before===''?null:Number(before);
 if(cursor!==null&&(!Number.isSafeInteger(cursor)||cursor<=0))
  throw Error('LAB_HISTORY_BAD_CURSOR');
 const files=listSegments(active).reverse();
 if(fs.existsSync(active))files.unshift(active);
 const since=now-Number(hours)*3600000;
 let bytes=0,done=false,rows=[],seen=new Set();
 const check=line=>{
  if(!line)return;
  let x;try{x=JSON.parse(line);}catch(_){return;}
  if(x.brokerOrdersEnabled!==false||x.decisionImpact!==false||
    (kind==='events'&&x.version!==chr.VERSION)||
    (kind==='snapshots'&&x.version!=='boonolab-observer-runner-v0.1'))return;
  const at=Number(x.at??x.asOf);
  if(!Number.isSafeInteger(at)||at>now+30000)return;
  if(at<since){done=true;return;}
  if(kind==='events'&&family!=='ALL'&&x.family!==family)return;
  if(kind==='snapshots'&&family!=='ALL')return;
  const key=kind==='events'?Number(x.seq):at;
  if(!Number.isSafeInteger(key)||key<=0||
     cursor!==null&&key>=cursor||seen.has(key))return;
  seen.add(key);rows.push({...x,cursor:key});
 };
 for(const file of files){
  if(done||rows.length>lim||bytes>=MAX_BYTES)break;
  let fd,st;try{fd=fs.openSync(file,'r');st=fs.fstatSync(fd);}
   catch(_){continue;}
  try{
   let offset=st.size,carry=Buffer.alloc(0);
   while(offset>0&&!done&&rows.length<=lim&&bytes<MAX_BYTES){
    const k=Math.min(CHUNK,offset,MAX_BYTES-bytes);
    offset-=k;bytes+=k;
    const buf=Buffer.alloc(k);fs.readSync(fd,buf,0,k,offset);
    const block=Buffer.concat([buf,carry]);let end=block.length;
    for(let i=block.length-1;i>=0;i--){
     if(block[i]!==10)continue;
     check(block.subarray(i+1,end).toString('utf8').replace(/\r$/,''));
     end=i;if(done||rows.length>lim)break;
    }
    carry=block.subarray(0,end);
   }
   if(offset===0&&carry.length&&!done&&rows.length<=lim)
    check(carry.toString('utf8'));
  }finally{fs.closeSync(fd);}
 }
 const hasMore=rows.length>lim,items=rows.slice(0,lim);
 return {version:'boonolab-market-reader-v0.1',kind,family,hours,items,
   hasMore,nextBefore:hasMore?items.at(-1).cursor:null,
   scannedBytes:bytes,truncatedByScanBudget:bytes>=MAX_BYTES,
   storage:'ROTATING_NDJSON_NOT_GUARANTEED_14_DAYS',
   observationOnly:true,brokerOrdersEnabled:false,decisionImpact:false};
}
module.exports={page,MAX};
