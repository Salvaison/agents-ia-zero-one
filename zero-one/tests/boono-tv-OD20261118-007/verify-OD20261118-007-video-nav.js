'use strict';
const P=require('/home/ubuntu/boono-tv-studio/agent/node_modules/puppeteer');
const assert=require('assert/strict');
const URL='http://127.0.0.1:3095';
const BIN='/home/ubuntu/.cache/puppeteer/chrome-headless-shell/linux-155.0.8059.39/chrome-headless-shell-linux64/chrome-headless-shell';
(async()=>{
 const browser=await P.launch({executablePath:BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const output=[];
 try{
  for(const [name,initial,action] of [
    ['stale-media','/?showcase=1&mediaPanel=1','none'],
    ['stale-live','/?showcase=1','none'],
    ['bare-live','/','live'],
    ['dialogue-close','/?dialogueEdit=1&showcase=1','close'],
    ['dialogue-tab','/?dialogueEdit=1&showcase=1','live']
  ]){
   const page=await browser.newPage();page.setDefaultTimeout(22000);
   await page.setViewport({width:1600,height:900});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(URL+initial,{waitUntil:'domcontentloaded',timeout:25000});
   await page.waitForSelector('#boonoCompositionTabsToggle',{timeout:15000});
   if(action==='live'){
    await page.click('#boonoCompositionTabsToggle');
    await page.click('a[data-workshop=live]');
   }
   if(action==='close'){
    await page.waitForSelector('#dialogueClose',{timeout:17000});
    await page.click('#dialogueClose');
   }
   await page.waitForFunction(()=>window.BoonoTVLocalVideoTest?.getStatus()?.videoInitialized===true&&
      window.BoonoTVProjectionCycle?.current?.(),{timeout:21000});
   await page.waitForFunction(()=>window.BoonoTVLocalVideoTest?.getStatus()?.mode==='playing',{timeout:18000});
   let before=await page.evaluate(()=>({
      url:location.search,
      status:window.BoonoTVLocalVideoTest.getStatus(),
      projection:window.BoonoTVProjectionCycle.current(),
      videoElementCount:document.querySelectorAll('#boonoWindowLocalPlayer').length
    }));
   await page.click('#boonoCompositionTabsToggle');
   await page.click('a[data-workshop=media]');
   await page.click('a[data-workshop=live]');
   const after=await page.evaluate(()=>({
      url:location.search,
      state:window.BoonoTVLocalVideoTest.getStatus(),
      elements:document.querySelectorAll('#boonoWindowLocalPlayer').length
    }));
   assert.equal(before.status.canvasFps,30);
   assert.equal(after.elements,1);
   assert.equal(after.state.mode,'playing');
   assert.equal(after.state.trackId,'clemens');
   assert.equal(errors.length,0,errors.join(';'));
   assert.ok(after.state.videoInitialized);
   assert.ok(after.state.currentTime>=before.status.currentTime);
   output.push({name,initial,finalUrl:after.url,videoPlaying:after.state.mode,
      track:after.state.trackId,fps:after.state.canvasFps,
      frames:after.state.canvasFrames,projection:before.projection.surface,
      reusedDecoder:after.elements===1,errors});
   await page.close();
  }
 }finally{await browser.close()}
 console.log(JSON.stringify(output,null,2));
 console.log('PASS: stale URLs, composer exit and 30fps video navigation recovered');
})().catch(e=>{console.error(e.stack);process.exitCode=2});
