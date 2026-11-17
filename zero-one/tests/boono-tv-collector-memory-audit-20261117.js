'use strict';
const WebSocket=require('/root/agents-ia-zero-one/node_modules/ws');
const session=(url)=>new Promise((resolve,reject)=>{const ws=new WebSocket(url);ws.once('open',()=>resolve(ws));ws.once('error',reject)});
const ask=(ws,id,method,params={})=>new Promise((resolve,reject)=>{
 const wait=setTimeout(()=>{ws.off('message',on);reject(Error(method+' timed out'))},6000);
 function on(raw){const p=JSON.parse(raw.toString());if(p.id!==id)return;clearTimeout(wait);ws.off('message',on);resolve(p)}
 ws.on('message',on);ws.send(JSON.stringify({id,method,params}));
});
async function sample(){
 const tabs=(await(await fetch('http://127.0.0.1:9222/json/list')).json())
   .filter(x=>x.type==='page'&&/tradingview\.com\/chart\//.test(x.url||''));
 for (const t of tabs){
  let ws;
  try{
   ws=await session(t.webSocketDebuggerUrl);
   const expression=`(()=>{const w=window.TradingViewApi?._activeChartWidgetWV?.value?.();const p=performance.memory||{};
     return {resolution:String(w?.resolution?.()||''), studies:(w?.getAllStudies?.()||[]).length,
      usedJSHeapMiB:Math.round((p.usedJSHeapSize||0)/1048576),totalJSHeapMiB:Math.round((p.totalJSHeapSize||0)/1048576),
      jsHeapLimitMiB:Math.round((p.jsHeapSizeLimit||0)/1048576),
      docElements:document.getElementsByTagName('*').length,canvas:document.querySelectorAll('canvas').length,
      hidden:document.hidden,title:document.title.slice(0,70)}})()`;
   const r=await ask(ws,1,'Runtime.evaluate',{expression,returnByValue:true,awaitPromise:false});
   const m=r.result?.result?.value||{error:r.error||r.result?.exceptionDetails};
   const counters=await ask(ws,2,'Memory.getDOMCounters').catch(e=>({error:String(e)}));
   console.log(JSON.stringify({time:new Date().toISOString(),id:t.id,layout:t.url.split('/chart/')[1]?.split('/')[0],...m,dom:counters.result||{error:counters.error}}));
  }catch(e){console.log('ERROR',t.id,String(e))}
  finally{try{ws?.close()}catch(_){}}
 }
}
(async()=>{for(let i=0;i<4;i++){await sample();if(i<3)await new Promise(r=>setTimeout(r,18000))}})().catch(e=>console.log('TOP_ERROR',String(e)));
