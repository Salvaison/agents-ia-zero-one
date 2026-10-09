'use strict';
const { execFile } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const DISPLAY=':99';
let applied=null, busy=false;
function getJson(url){return new Promise((resolve,reject)=>http.get(url,r=>{let s='';r.on('data',d=>s+=d);r.on('end',()=>{try{resolve(JSON.parse(s));}catch(e){reject(e);}});}).on('error',reject));}
function getScreen(){return new Promise((resolve,reject)=>execFile('/usr/bin/xrandr',['--current'],{env:{...process.env,DISPLAY}},(e,out)=>{if(e)return reject(e);const m=String(out).match(/current\s+(\d+)\s+x\s+(\d+)/);if(!m)return reject(new Error('xrandr current size not found'));resolve({width:+m[1],height:+m[2]});}));}
async function setChromeBounds(size){
  const tabs=await getJson('http://127.0.0.1:9222/json/list');
  const target=tabs.find(t=>t.type==='page'&&/tradingview\.com\/chart/i.test(t.url)) || tabs.find(t=>t.type==='page');
  if(!target)throw new Error('no Chrome page target');
  const ver=await getJson('http://127.0.0.1:9222/json/version');
  const ws=new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP open timeout')),2500);ws.once('open',()=>{clearTimeout(timer);resolve();});ws.once('error',reject);});
  let seq=0; const pending=new Map();
  ws.on('message',d=>{let m;try{m=JSON.parse(d);}catch{return;}if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}});
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(new Error(method+' timeout'));},2500);pending.set(id,m=>{clearTimeout(timer);m.error?reject(new Error(m.error.message)):resolve(m.result||{});});ws.send(JSON.stringify({id,method,params}));});
  try{
    const w=await call('Browser.getWindowForTarget',{targetId:target.id});
    await call('Browser.setWindowBounds',{windowId:w.windowId,bounds:{left:0,top:0,width:size.width,height:size.height,windowState:'normal'}});
  } finally { try{ws.close();}catch{} }
}
async function tick(){
  if(busy)return; busy=true;
  try{
    const size=await getScreen(); const key=`${size.width}x${size.height}`;
    if(key!==applied){ await setChromeBounds(size); applied=key; process.stdout.write(`[${new Date().toISOString()}] Chrome -> ${key}\n`); }
  } catch(e) { process.stderr.write(`[${new Date().toISOString()}] autoresize retry: ${e.message}\n`); }
  finally{busy=false;}
}
setInterval(tick,500); tick();
