'use strict';

const http=require('http');
const fs=require('fs');
const path=require('path');
const WebSocket=require('/opt/desktop-commander/runtime/node_modules/ws');

const DEBUG_PORT=9222;
const CAPTURE_CHART_ID='qljTf3vu';
const COLLECTOR_CHART_ID='2AqpEMfD';
const OUT=path.resolve(__dirname,'..','assets','desk-live');
const TRIGGER='/run/boono-tv-desk-rollover.json';
const NORMAL_MS=10000;
const ROLLOVER_MS=1800;
const CLIP={x:55,y:425,width:1195,height:165,scale:1};
const SEQUENCE=[3,15];

fs.mkdirSync(OUT,{recursive:true});

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function getJson(urlPath){
  return new Promise((resolve,reject)=>{
    const req=http.get({host:'127.0.0.1',port:DEBUG_PORT,path:urlPath},res=>{
      let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{resolve(JSON.parse(d))}catch(e){reject(e)}});
    });req.on('error',reject);req.setTimeout(2500,()=>req.destroy(new Error('CDP HTTP timeout')));
  });
}
function atomicWrite(file,data){
  const tmp=file+'.tmp-'+process.pid;
  fs.writeFileSync(tmp,data);
  fs.renameSync(tmp,file);
}
function readRollover(){
  try{
    const j=JSON.parse(fs.readFileSync(TRIGGER,'utf8'));
    const until=Number(j.until||0);
    if(Date.now()<until)return {active:true,until,sequence:Array.isArray(j.sequence)&&j.sequence.length?j.sequence:SEQUENCE};
    fs.unlinkSync(TRIGGER);
  }catch(_){}
  return {active:false,sequence:SEQUENCE};
}
async function findTarget(){
  const tabs=await getJson('/json');
  // Capture is physically isolated from the collector layout. Never attach
  // Page.captureScreenshot to 2AqpEMfD (3m/15m data collectors).
  return tabs.find(t=>t.type==='page'&&/tradingview\.com/.test(t.url||'')&&(t.url||'').includes('/chart/'+CAPTURE_CHART_ID+'/'))||null;
}
async function waitForResolution(Runtime,tf){
  const wanted=String(tf);
  const getRes=async()=>{
    const r=await Runtime.evaluate({expression:`(function(){try{return String(window.TradingViewApi._activeChartWidgetWV.value().resolution())}catch(e){return ''}})()`,returnByValue:true});
    return String(r.result&&r.result.value||'');
  };
  let current=await getRes();
  if(current!==wanted){
    await Runtime.evaluate({
      expression:`(function(){try{var w=window.TradingViewApi._activeChartWidgetWV.value();w.setResolution(${JSON.stringify(wanted)});return true}catch(e){return false}})()`,
      returnByValue:true
    });
    const until=Date.now()+5000;
    do{await sleep(150);current=await getRes();}while(current!==wanted&&Date.now()<until);
    if(current!==wanted)throw new Error('TA timeframe did not switch to '+wanted+'m (actual '+current+')');
    // Let TradingView repaint the indicator panes after the interval change.
    await sleep(700);
  }
  return current;
}
async function cdpShot(target,tf){
  return new Promise((resolve,reject)=>{
    const ws=new WebSocket(target.webSocketDebuggerUrl);
    let seq=1,settled=false;const waits=new Map();
    const finish=(err,val)=>{if(settled)return;settled=true;try{ws.close()}catch(_){};err?reject(err):resolve(val)};
    ws.on('message',raw=>{
      let m;try{m=JSON.parse(raw)}catch(_){return}
      if(m.id&&waits.has(m.id)){const {ok,bad}=waits.get(m.id);waits.delete(m.id);m.error?bad(new Error(JSON.stringify(m.error))):ok(m.result)}
    });
    ws.once('error',e=>finish(e));
    ws.once('open',async()=>{
      const cmd=(method,params={})=>new Promise((ok,bad)=>{const id=seq++;waits.set(id,{ok,bad});ws.send(JSON.stringify({id,method,params}))});
      try{
        await cmd('Page.enable');
        await cmd('Runtime.enable');
        // Use only Benjamin's TA layout and switch its interval through the
        // TradingView API; collector tabs remain completely untouched.
        const wanted=String(tf);
        let current='';
        const getRes=async()=>{
          const r=await cmd('Runtime.evaluate',{expression:`(function(){try{return String(window.TradingViewApi._activeChartWidgetWV.value().resolution())}catch(e){return ''}})()`,returnByValue:true});
          return String(r&&r.result&&r.result.value||'');
        };
        current=await getRes();
        if(current!==wanted){
          await cmd('Runtime.evaluate',{expression:`(function(){try{var w=window.TradingViewApi._activeChartWidgetWV.value();w.setResolution(${JSON.stringify(wanted)});return true}catch(e){return false}})()`,returnByValue:true});
          const until=Date.now()+5000;
          do{await sleep(150);current=await getRes();}while(current!==wanted&&Date.now()<until);
          if(current!==wanted)throw new Error('TA timeframe did not switch to '+wanted+'m (actual '+current+')');
          await sleep(700);
        }
        const shot=await cmd('Page.captureScreenshot',{format:'jpeg',quality:82,fromSurface:true,captureBeyondViewport:false,clip:CLIP});
        finish(null,{jpg:Buffer.from(shot.data,'base64'),actualTf:current});
      }catch(e){finish(e)}
    });
    setTimeout(()=>finish(new Error('CDP screenshot timeout')),5000);
  });
}
function stateWrite(obj){
  atomicWrite(path.join(OUT,'state.json'),JSON.stringify(obj,null,2)+'\n');
}
let rolloverIndex=0;
async function tick(){
  const ro=readRollover();
  const tf=ro.active?Number(ro.sequence[rolloverIndex++%ro.sequence.length]||3):3;
  const started=Date.now();
  try{
    const target=await findTarget();
    if(!target)throw new Error('TradingView TA layout '+CAPTURE_CHART_ID+' not found');
    if((target.url||'').includes('/chart/'+COLLECTOR_CHART_ID+'/'))throw new Error('refusing collector target');
    const capture=await cdpShot(target,tf);
    const jpg=capture.jpg;
    atomicWrite(path.join(OUT,'marketcipher-'+tf+'m.jpg'),jpg);
    atomicWrite(path.join(OUT,'marketcipher-live.jpg'),jpg);
    stateWrite({
      ok:true,capturedAt:new Date().toISOString(),tf,rollover:ro.active,
      nextMs:ro.active?ROLLOVER_MS:NORMAL_MS,
      title:target.title,url:target.url,clip:CLIP,bytes:jpg.length,
      sourceLayout:CAPTURE_CHART_ID,captureIsolation:'TA_ONLY',actualTf:capture.actualTf
    });
  }catch(e){
    stateWrite({ok:false,capturedAt:new Date().toISOString(),tf,rollover:ro.active,error:e.message,nextMs:ro.active?ROLLOVER_MS:NORMAL_MS});
  }
  const wait=(ro.active?ROLLOVER_MS:NORMAL_MS)-Math.max(0,Date.now()-started);
  await sleep(Math.max(250,wait));
}
(async()=>{while(true)await tick()})().catch(e=>{console.error(e);process.exit(1)});
