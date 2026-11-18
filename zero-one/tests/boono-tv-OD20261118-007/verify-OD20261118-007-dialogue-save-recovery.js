'use strict';
const P=require('/home/ubuntu/boono-tv-studio/agent/node_modules/puppeteer');
const assert=require('assert/strict');
(async()=>{
 const b=await P.launch({executablePath:'/home/ubuntu/.cache/puppeteer/chrome-headless-shell/linux-155.0.8059.39/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{
 const p=await b.newPage();await p.setViewport({width:1600,height:900});
 await p.setRequestInterception(true);
 let intercepted=0;
 p.on('request',req=>{
  if(req.method()==='POST'&&req.url().endsWith('/api/dialogue-script')){
   intercepted++;
   void req.respond({status:503,contentType:'application/json',body:'{"error":"Simulation de requête indisponible"}'});
  }else void req.continue();
 });
 await p.goto('http://127.0.0.1:3095/?dialogueEdit=1&showcase=1',{waitUntil:'domcontentloaded'});
 await p.waitForSelector('#dialogueSave',{timeout:16000});
 await p.click('#dialogueSave');
 await p.waitForFunction(()=>{const b=document.querySelector('#dialogueSave');return b&&!b.disabled&&(document.querySelector('#dialogueNotice')?.textContent||'').includes('NON enregistré')},{timeout:10000});
 const results=await p.evaluate(()=>({disabled:document.querySelector('#dialogueSave').disabled,notice:document.querySelector('#dialogueNotice')?.textContent,loaded:window.BoonoTVDialogueScripts?.loaded}));
 assert.equal(intercepted,1);
 assert.equal(results.disabled,false);
 console.log(JSON.stringify({intercepted,results,pass:true},null,2));
 }finally{await b.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=2});
