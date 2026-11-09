'use strict';
// Isolated regression: simulate two CDP TA tabs without modifying Chromium.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const {EventEmitter}=require('events');
const file=path.resolve(__dirname,'../boono-tv/desk/desk-capture-daemon.js');
let source=fs.readFileSync(file,'utf8');
source=source.replace('function sleep(ms){return new Promise(r=>setTimeout(r,ms));}','async function sleep(ms){}');
const tail='(async()=>{while(true)await tick()})().catch(e=>{console.error(e);process.exit(1)});';
assert.ok(source.includes(tail),'daemon tail should exist');
source=source.replace(tail,'globalThis.__TEST__={cdpShot,lastInitializedTabId,TA_BOOT_MARKER};');
const files=new Map(), history=[];
const fakeFs={
 mkdirSync:()=>{},
 readFileSync:(p)=>{if(!files.has(p))throw Error('ENOENT');return files.get(p)},
 writeFileSync:(p,v)=>files.set(p,String(v)),
 renameSync:(f,t)=>{files.set(t,files.get(f));files.delete(f)}
};
const chart={resolution:'15',symbol:'OKX:BTCUSDT.P'};
class WS extends EventEmitter {
 constructor(){super();process.nextTick(()=>this.emit('open'))}
 close(){}
 send(raw){
  const q=JSON.parse(raw);history.push({method:q.method,expression:q.params?.expression||''});
  const m={id:q.id,result:{}};
  if(q.method==='Runtime.evaluate'){
   let v;
   const x=q.params.expression;
   if(x.includes('getAllStudies'))v={clip:{x:606,y:429,width:610,height:152,scale:1},pane:{},viewport:{}};
   else if(x.includes('w.setSymbol')){chart.symbol='OKX:BTCUSDT.P';v={ok:true};}
   else if(x.includes('w.setResolution')){chart.resolution='3';v={ok:true};}
   else v={resolution:chart.resolution,symbol:chart.symbol};
   m.result={result:{type:'object',value:v}};
  }else if(q.method==='Page.captureScreenshot')m.result={data:Buffer.alloc(16000,123).toString('base64')};
  process.nextTick(()=>this.emit('message',Buffer.from(JSON.stringify(m))));
 }
}
const sandbox={
 require:n=>n==='fs'?fakeFs:n==='path'?path:n==='http'?{}:WS,
 __dirname:path.dirname(file),
 process:{pid:111},console,Buffer,setTimeout:(fn,ms)=>({}),Date
};
vm.runInNewContext(source,sandbox,{filename:'desk-capture-daemon.js'});
const {cdpShot,lastInitializedTabId,TA_BOOT_MARKER}=sandbox.__TEST__;
(async()=>{
 const t1={id:'TAB-ONE',webSocketDebuggerUrl:'ws://fake-one'};
 files.set(TA_BOOT_MARKER,JSON.stringify({targetId:t1.id,startupTf:'3',startupSymbol:chart.symbol}));
 const first=await cdpShot(t1);
 assert.equal(first.actualTf,'15','manual TF15 must survive');
 assert.equal(first.initializedNewTab,false);
 assert.equal(history.filter(x=>x.expression.includes('w.setResolution')).length,0);
 assert.equal(history.filter(x=>x.expression.includes('w.setSymbol')).length,0);
 const t2={id:'TAB-TWO',webSocketDebuggerUrl:'ws://fake-two'};
 const second=await cdpShot(t2);
 assert.equal(second.initializedNewTab,true);
 assert.equal(second.actualTf,'3','new tab should get initial TF3');
 assert.equal(lastInitializedTabId(),t2.id);
 assert.equal(history.filter(x=>x.expression.includes('w.setResolution')).length,1);
 chart.resolution='60';
 const third=await cdpShot(t2);
 assert.equal(third.initializedNewTab,false);
 assert.equal(third.actualTf,'60','manual TF1h must survive after bootstrap');
 assert.equal(history.filter(x=>x.expression.includes('w.setResolution')).length,1,'no second coercion');
 const screenshots=history.filter(x=>x.method==='Page.captureScreenshot').length;
 assert.equal(screenshots,3);
 console.log(JSON.stringify({result:'PASS',existingTabCapturedTf:first.actualTf,newTabStartupTf:second.actualTf,manualAfterStartupTf:third.actualTf,setResolutionCalls:1,setSymbolCalls:0,screenshots,clip:first.clip,markerPersisted:files.has(TA_BOOT_MARKER)}));
})().catch(e=>{console.error(e.stack);process.exitCode=2});
