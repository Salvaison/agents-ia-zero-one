'use strict';
/* BOONO Systems OD-20261117-002 — temporary read-only rollover observer.
 * Never navigate, modify TradingView state, reload a tab, or collect GC.
 * Time window: 2026-11-17 22:50 UTC to 2026-11-18 00:40 UTC.
 */
const fs=require('fs');
const path=require('path');
const http=require('http');
const WebSocket=require('/root/agents-ia-zero-one/node_modules/ws');
const START_MS=Date.parse('2026-11-17T22:50:00Z');
const END_MS=Date.parse('2026-11-18T00:40:00Z');
const INTERVAL_MS=10000;
const BASE='/root/agents-ia-zero-one/zero-one/data/system-audits/rollover-2026-11-18';
const LOG='/root/.pm2/logs/collecteur-tab2-error.log';
const HEARTBEAT='/run/boono-mcb-tab2.heartbeat';
const CSV_DIR='/root/agents-ia-zero-one/data/mcb-live';
const TF=['15m','1h','4h','1d'];
const PROBE=process.argv.includes('--probe');
const nowISO=()=>new Date().toISOString();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let targetId=null,logOffset=null,successful=0,failed=0,previousResolution=null;
function saveJSON(file,value){fs.writeFileSync(path.join(BASE,file),JSON.stringify(value,null,2)+'\n')}
function append(file,value){fs.appendFileSync(path.join(BASE,file),JSON.stringify(value)+'\n')}
function safeJSON(file){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(_){return null}}
function stat(file){try{return fs.statSync(file)}catch(_){return null}}
function tailCsv(tf){
 const file=path.join(CSV_DIR,'mcb_'+tf+'.csv');const st=stat(file);
 if(!st)return {exists:false};
 const len=Math.min(st.size,4096),buf=Buffer.alloc(len),fd=fs.openSync(file,'r');
 try{fs.readSync(fd,buf,0,len,st.size-len)}finally{fs.closeSync(fd)}
 const str=buf.toString('utf8'),lines=str.split(/\r?\n/).filter(x=>x.includes(','));
 const last=lines[lines.length-1]||'';
 return {exists:true,sizeBytes:st.size,modifiedAt:st.mtime.toISOString(),
   lastTimestamp:last.split(',')[0]||null,lastLineBytes:Buffer.byteLength(last)};
}
function readHost(){
 const m=fs.readFileSync('/proc/meminfo','utf8');
 const r=k=>Number(m.match(new RegExp('^'+k+':\\s*(\\d+) kB','m'))?.[1]||0);
 const psi=(p)=>{try{return fs.readFileSync('/proc/pressure/'+p,'utf8').split('\n')[0]}catch(_){return ''}};
 return {memAvailableMiB:Math.round(r('MemAvailable')/1024),
  swapUsedMiB:Math.round((r('SwapTotal')-r('SwapFree'))/1024),
  cpuPsi:psi('cpu'),memoryPsi:psi('memory')};
}
function fetchJson(url){
 return new Promise((resolve,reject)=>{
  const req=http.get(url,res=>{let out='';res.on('data',s=>out+=s);
    res.on('end',()=>{try{resolve(JSON.parse(out))}catch(e){reject(e)}})});
  req.once('error',reject);req.setTimeout(2800,()=>req.destroy(Error('CDP HTTP timeout')));
 });
}
async function open(url){
 return new Promise((resolve,reject)=>{const ws=new WebSocket(url);
  const timer=setTimeout(()=>{ws.terminate();reject(Error('WebSocket open timeout'))},2800);
  ws.once('open',()=>{clearTimeout(timer);resolve(ws)});
  ws.once('error',e=>{clearTimeout(timer);reject(e)});
 });
}
function ask(ws,id,method,params={}){
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{ws.off('message',onMessage);reject(Error(method+' timeout'))},3000);
  function onMessage(raw){
   let packet;try{packet=JSON.parse(raw.toString())}catch(_){return}
   if(packet.id!==id)return;
   ws.off('message',onMessage);clearTimeout(timeout);
   if(packet.error)reject(Error(method+': '+JSON.stringify(packet.error)));
   else resolve(packet.result);
  }
  ws.on('message',onMessage);ws.send(JSON.stringify({id,method,params}));
 });
}
async function readTradingView(){
 const tabs=(await fetchJson('http://127.0.0.1:9222/json/list'))
  .filter(t=>t.type==='page'&&/tradingview\.com\/chart\/2AqpEMfD\//.test(t.url||''));
 const tab=(targetId&&tabs.find(t=>t.id===targetId))||
  tabs.find(t=>!new URL(t.url).searchParams.get('interval')?.startsWith('3'))||
  tabs.find(t=>new URL(t.url).searchParams.get('interval')!=='3');
 if(!tab)throw Error('tab2 TradingView target not found');
 const idChanged=targetId&&targetId!==tab.id;targetId=tab.id;
 const ws=await open(tab.webSocketDebuggerUrl);
 try{
  const expression=`(()=>{try{const w=window.TradingViewApi?._activeChartWidgetWV?.value?.();
     const p=performance.memory||{};
     return {resolution:w?.resolution?.()??null,symbol:w?.symbol?.()??null,
       jsHeapUsedMiB:Math.round((p.usedJSHeapSize||0)/1048576),
       jsHeapTotalMiB:Math.round((p.totalJSHeapSize||0)/1048576),
       domElements:document.getElementsByTagName('*').length,
       canvasElements:document.querySelectorAll('canvas').length,
       documentVisibility:document.visibilityState};
   }catch(e){return {error:String(e)}}})()`;
  const a=await ask(ws,1,'Runtime.evaluate',{expression,returnByValue:true});
  const b=await ask(ws,2,'Memory.getDOMCounters');
  return {targetId:tab.id,targetChanged:!!idChanged,urlInterval:new URL(tab.url).searchParams.get('interval'),
   metrics:a?.result?.value||null,dom:b||null};
 }finally{try{ws.close()}catch(_){}}
}
function captureLog(){
 const st=stat(LOG);if(!st)return {error:'log missing'};
 if(logOffset===null)logOffset=st.size;
 if(st.size<logOffset){fs.appendFileSync(path.join(BASE,'tab2-events.log'),'\n===LOG_REOPEN '+nowISO()+' ===\n');logOffset=0}
 const available=st.size-logOffset;
 if(available<=0)return {newBytes:0};
 const fd=fs.openSync(LOG,'r'),chunk=Buffer.alloc(Math.min(65536,available)),parts=[];
 try{
  let remaining=available;
  while(remaining>0){
   const length=Math.min(chunk.length,remaining);
   const n=fs.readSync(fd,chunk,0,length,logOffset);
   if(n<=0)break;
   parts.push(chunk.subarray(0,n).toString('utf8'));logOffset+=n;remaining-=n;
  }
 }finally{fs.closeSync(fd)}
 fs.appendFileSync(path.join(BASE,'tab2-events.log'),'\n===OBSERVED '+nowISO()+' ===\n'+parts.join(''));
 return {newBytes:available};
}
async function oneSample(){
 const row={at:nowISO(),csv:Object.fromEntries(TF.map(tf=>[tf,tailCsv(tf)])),
   heartbeat:safeJSON(HEARTBEAT),host:readHost()};
 try{
  row.tab=await readTradingView();successful++;
  const res=String(row.tab.metrics?.resolution||'');
  if(previousResolution!==null&&previousResolution!==res)row.resolutionTransition=previousResolution+' -> '+res;
  previousResolution=res;
 }catch(e){row.tabError=String(e.message||e);failed++}
 return row;
}
async function main(){
 if(PROBE){console.log(JSON.stringify(await oneSample()));return}
 if(Date.now()<START_MS-60000)throw Error('probe started before scheduled window');
 fs.mkdirSync(BASE,{recursive:true});
 saveJSON('start.json',{startedAt:nowISO(),plannedFrom:new Date(START_MS).toISOString(),
  plannedUntil:new Date(END_MS).toISOString(),intervalMs:INTERVAL_MS,script:__filename,
  probeOnly:false,passive:true});
 const initial=stat(LOG);logOffset=initial?.size??0;
 if(initial){
  const tail=fs.readFileSync(LOG,'utf8').split('\n').slice(-140).join('\n');
  fs.writeFileSync(path.join(BASE,'tab2-before.log'),tail);
 }
 let index=0;
 try{
  while(Date.now()<END_MS){
   const began=Date.now();
   try{
    const row=await oneSample();row.index=index;row.logCapture=captureLog();
    append('metrics.ndjson',row);
   }catch(e){append('observer-errors.ndjson',{at:nowISO(),error:String(e.stack||e),index})}
   index++;const wait=Math.max(200,INTERVAL_MS-(Date.now()-began));
   await sleep(Math.min(wait,Math.max(0,END_MS-Date.now())));
  }
 }finally{
  try{captureLog()}catch(_){}
  saveJSON('finished.json',{finishedAt:nowISO(),rows:index,successful,failed,
    finalResolution:previousResolution,completedThroughEnd:Date.now()>=END_MS});
 }
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
