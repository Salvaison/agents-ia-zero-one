'use strict';
const fs=require('fs');
const path=require('path');

function ensureDir(p){fs.mkdirSync(path.dirname(p),{recursive:true});}
function segmentPrefix(active){
  const ext=path.extname(active);
  return path.basename(active,ext)+'.segment-';
}
function listSegments(active){
  const dir=path.dirname(active),prefix=segmentPrefix(active);
  let names=[];try{names=fs.readdirSync(dir);}catch(_){return[];}
  return names.filter(n=>n.startsWith(prefix)&&n.endsWith('.ndjson'))
    .map(n=>path.join(dir,n)).sort();
}
function pruneSegments(active,maxSegments){
  const segs=listSegments(active);
  const excess=Math.max(0,segs.length-maxSegments);
  for(const p of segs.slice(0,excess))fs.unlinkSync(p);
}
function rotateIfNeeded(active,incomingBytes,maxBytes,maxSegments){
  ensureDir(active);
  let size=0;try{size=fs.statSync(active).size;}catch(_){}
  if(size===0||size+incomingBytes<=maxBytes)return null;
  const dir=path.dirname(active),ext=path.extname(active);
  const base=path.basename(active,ext);
  const stamp=new Date().toISOString().replace(/[-:.]/g,'');
  const rotated=path.join(dir,base+'.segment-'+stamp+'.ndjson');
  fs.renameSync(active,rotated);
  pruneSegments(active,maxSegments);
  return rotated;
}
function appendRotatingNdjson(active,record,opts={}){
  const maxBytes=Number(opts.maxBytes)||32*1024*1024;
  const maxSegments=Number(opts.maxSegments)||16;
  const line=JSON.stringify(record)+'\n';
  const bytes=Buffer.byteLength(line);
  if(bytes>maxBytes)throw new Error('rotating NDJSON record exceeds maxBytes: '+bytes);
  rotateIfNeeded(active,bytes,maxBytes,maxSegments);
  ensureDir(active);
  const fd=fs.openSync(active,'a');
  try{fs.writeSync(fd,line,null,'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
function parseLinesReverse(text,out,limit,sinceMs){
  const lines=text.split(/\r?\n/);
  for(let i=lines.length-1;i>=0;i--){
    const line=lines[i];if(!line)continue;
    let x;try{x=JSON.parse(line);}catch(_){continue;}
    if(sinceMs!==null){
      const t=Date.parse(x.ts||x.timestamp||'');
      if(Number.isFinite(t)&&t<sinceMs)continue;
    }
    out.push(x);
    if(limit&&out.length>=limit)return true;
  }
  return false;
}
function recentFiles(active){
  const files=listSegments(active);
  try{if(fs.existsSync(active))files.push(active);}catch(_){}
  return files.reverse();
}
function readRecentNdjson(active,limit=200){
  const out=[];
  for(const p of recentFiles(active)){
    let text='';try{text=fs.readFileSync(p,'utf8');}catch(_){continue;}
    if(parseLinesReverse(text,out,limit,null))break;
  }
  return out.reverse();
}
function readNdjsonSince(active,sinceMs){
  const out=[];
  for(const p of recentFiles(active)){
    let st;try{st=fs.statSync(p);}catch(_){continue;}
    if(p!==active&&st.mtimeMs<sinceMs-2*60*60*1000)continue;
    let text='';try{text=fs.readFileSync(p,'utf8');}catch(_){continue;}
    parseLinesReverse(text,out,0,sinceMs);
  }
  return out.sort((a,b)=>Date.parse(a.ts||a.timestamp||0)-Date.parse(b.ts||b.timestamp||0));
}
module.exports={appendRotatingNdjson,readRecentNdjson,readNdjsonSince,listSegments,rotateIfNeeded};
