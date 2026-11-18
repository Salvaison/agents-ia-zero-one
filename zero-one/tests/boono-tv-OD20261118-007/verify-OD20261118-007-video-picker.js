'use strict';
const P=require('/home/ubuntu/boono-tv-studio/agent/node_modules/puppeteer');
const assert=require('assert/strict');
(async()=>{
 const b=await P.launch({executablePath:'/home/ubuntu/.cache/puppeteer/chrome-headless-shell/linux-155.0.8059.39/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{
 const p=await b.newPage();await p.setViewport({width:1600,height:900});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:3095/?showcase=1&windowVideo=clemens&projectionCycle=21&videoFps=30',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.BoonoTVLocalVideoTest?.getStatus()?.mode==='playing',{timeout:22000});
 const clipResults=[];
 await p.click('#boonoAVToggle');
 for(const id of ['houseparty','forest','clemens']){
   await p.select('#boonoAVMediaSelect',id);
   await p.waitForFunction(i=>{const s=window.BoonoTVLocalVideoTest?.getStatus?.();return s?.trackId===i&&s?.mode==='playing'&&s.videoInitialized}, {timeout:22000},id);
   const st=await p.evaluate(()=>window.BoonoTVLocalVideoTest.getStatus());
   clipResults.push({id,actual:st.trackId,mode:st.mode,ready:st.readyState,fps:st.canvasFps,frameErrors:st.canvasDrawErrors});
   assert.equal(st.mode,'playing');assert.equal(st.canvasFps,30);
 }
 assert.equal(errors.length,0,errors.join(';'));
 console.log(JSON.stringify({clips:clipResults,jsErrors:errors,pass:true},null,2));
 await p.close();
 }finally{await b.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=2});
