'use strict';
// V5.5.1 independent raw market reader. No V543/V55 decision dependency.
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const MCB=path.resolve(ROOT,'../data/mcb-live');
const MIN=60000,PERIOD={m3:3*MIN,m15:15*MIN,h1:60*MIN,h4:240*MIN};
const FILES={audit:path.join(DATA,'audit-history.json'),
 m3:path.join(MCB,'mcb_3m.csv'),m15:path.join(MCB,'mcb_15m.csv'),
 h1:path.join(MCB,'mcb_1h.csv'),h4:path.join(MCB,'mcb_4h.csv')};
const val=x=>x===null||x===undefined||x===''?null:
 Number.isFinite(Number(x))?Number(x):null;
const cache=new Map();
function cached(file,reader){
 const m=fs.statSync(file).mtimeMs,c=cache.get(file);
 if(c&&c.mtime===m)return c.data;
 const data=reader(file);cache.set(file,{mtime:m,data});return data;
}
function parseCsv(file){
 const fd=fs.openSync(file,'r'),size=fs.fstatSync(fd).size;
 const max=500000,offset=Math.max(0,size-max);
 const bytes=Buffer.alloc(size-offset);
 try{fs.readSync(fd,bytes,0,bytes.length,offset)}finally{fs.closeSync(fd)}
 const lines=bytes.toString('utf8').split(/\r?\n/);
 lines.shift(); // header or incomplete line
 const out=[];
 for(const l of lines){
  if(!l)continue;
  const p=l.split(','),ts=Date.parse(p[0]);if(!Number.isFinite(ts)||p.length<8)continue;
  const c={ts,open:val(p[1]),high:val(p[2]),low:val(p[3]),
   close:val(p[4]),lbw:val(p[5]),bw:val(p[6]),
   mf:val(p[7]),ma200:val(p[12]),
   nativeUp:val(p[13]),nativeDn:val(p[14])};
  if([c.close,c.lbw,c.bw].some(x=>x===null))continue;
  out.push(c);
 }
 return out.sort((a,b)=>a.ts-b.ts);
}
function parseAudit(file){
 const rows=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!Array.isArray(rows))throw Error('V551_BAD_AUDIT');
 return rows.filter(x=>val(x.ts)!==null&&val(x.lastPrice)!==null).sort((a,b)=>a.ts-b.ts);
}
function load(asOf=Date.now()){
 const bars={};
 for(const tf of ['m3','m15','h1','h4'])
  bars[tf]=cached(FILES[tf],parseCsv).filter(x=>x.ts+PERIOD[tf]<=asOf);
 const samples=cached(FILES.audit,parseAudit).filter(x=>x.ts<=asOf).slice(-1000);
 const current=samples.at(-1)||null;
 return {asOf,samples,bars,current,
  healthy:!!current&&asOf-current.ts>=0&&asOf-current.ts<=65000&&
   bars.m3.length>=8&&bars.m15.length>=5,
  source:'RAW_MCB_CSV_AND_BATON_AUDIT_NO_V543_DECISION'};
}
function sampleAt(samples,at,margin=90000){
 let l=0,r=samples.length;
 while(l<r){const mid=(l+r)>>1;
  if(samples[mid].ts<=at)l=mid+1;else r=mid}
 const x=samples[l-1];return x&&at-x.ts<=margin?x:null;
}
function nativeLast(bars,period){
 for(let i=bars.length-1;i>=0;i--){
  const x=bars[i];const direction=x.nativeUp!==null&&x.nativeDn===null?'long':
   x.nativeDn!==null&&x.nativeUp===null?'short':null;
  if(direction)return {direction,at:x.ts,knownAt:x.ts+period};
 }
 return null;
}
function closedWave(rows){
 const x=rows.at(-1),p=rows.at(-2);
 if(!x)return {direction:null,confirmedCross:null,knownAt:null};
 const sign=v=>v>0?'long':v<0?'short':null;
 const gap=x.lbw-x.bw,previousGap=p?p.lbw-p.bw:null;
 const direction=sign(gap),prior=previousGap===null?null:sign(previousGap);
 return {direction,gap,previousGap,prior,
  confirmedCross:direction&&prior&&direction!==prior?
   {direction,from:prior,at:x.ts,knownAt:x.ts+15*MIN}:null,
  knownAt:x.ts+15*MIN,sourceAt:x.ts,lbw:x.lbw,bw:x.bw,mf:x.mf};
}
module.exports={MIN,PERIOD,FILES,val,load,parseCsv,parseAudit,sampleAt,nativeLast,closedWave};
