'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../../modules/config-server.js'),'utf8');
const code=(a,b)=>{const st=src.indexOf(a),en=src.indexOf(b,st+a.length);
 assert.ok(st>=0&&en>st,'function boundary '+a);return src.slice(st,en);};
const NOW=1793028845000, V4_FROZEN=80451.4;
function server(){
 const ctx={};
 vm.createContext(ctx);
 vm.runInContext(code('function waveUiV54LiveState(','app.get(\'/api/btc-live-price\''),ctx);
 return ctx.waveUiV54LiveState;
}
function paper(price=80583.9,ageMs=1000){
 return {brokerOrdersEnabled:false,position:null,latestAnalysis:{
  version:'v5.4-structural-campaign-paper-v1',
  asOf:NOW-ageMs,price,action:'WAIT',reason:'TEST',quality:'DATA_OK',
  phase:'STRUCTURAL_CONTINUATION',candidate:'long',
  readings:{mcb15:{lbw:-40},mcb3:{lbw:13},
   conversion:{pm3:10,pm5:30,pmCombined:6},
   structural54:{campaignId:'long|E15:foo',director:'long',
    structuralOrigin:{lbw:-60},context1h:'long',context4h:'long',
    mcb3:{direction:'long'},strategicState:'ASCENT_ACTIVE'}}}};
}
function browserQuote({ws=null,liveState=null,mode='live'}={}){
 const ctx={Date:{now:()=>NOW},waveReplayMode:mode,
  v3UiPrice:ws||{price:null,ts:null,status:'NO_SOURCE',source:'NONE'},
  waveReplayData:{liveState},V3_WS_STALE_MS:15000,V3_SERVER_STALE_MS:25000,
  v3UiFreshQuote:q=>q&&q.price!==null&&Number.isFinite(Number(q.price))&&
   q.ts!==null&&NOW-q.ts<=(q.source==='V54_SERVER'?25000:15000)&&
   NOW-q.ts>=-3000};
 vm.createContext(ctx);
 vm.runInContext(code('function waveCurrentMarketQuote(){','let wavePriceRedrawTimer=null;'),ctx);
 return ctx.waveCurrentMarketQuote();
}
test('Frozen V4.10.10 at 80451.4 is never selected as Vagues live source',()=>{
 const v=server(),active=v(paper(80583.9),{ts:NOW-15000,lastPrice:80570},NOW);
 assert.equal(active.price,80583.9);
 assert.equal(active.source,'V54_PAPER_PRICE');
 assert.equal(active.version,'V5.4-PAPER');
 assert.equal(active.position,null);
 assert.equal(active.action.type,'WAIT');
 const q=browserQuote({ws:null,liveState:active});
 assert.equal(q.price,80583.9);
 assert.notEqual(q.price,V4_FROZEN);
 assert.equal(q.source,'V5.4 server');
 assert.equal(q.status,'LIVE');
});
test('A fresh direct OKX WebSocket trade overrides the slightly older V5.4 server price',()=>{
 const source=server()(paper(80583.9),null,NOW);
 const quote=browserQuote({ws:{price:80596.2,ts:NOW-100,source:'OKX_WS',
  status:'OKX live'},liveState:source});
 assert.equal(quote.price,80596.2);
 assert.equal(quote.source,'OKX trade WS');
});
test('A stale direct OKX trade is rejected, but a recent V5.4 server quote is displayed',()=>{
 const quote=browserQuote({ws:{price:V4_FROZEN,ts:NOW-80000,
  status:'OKX live',source:'OKX_WS'},
  liveState:server()(paper(80583.9),null,NOW)});
 assert.equal(quote.price,80583.9);
 assert.notEqual(quote.price,V4_FROZEN);
});
test('When V5.4 is stale, only a freshly timestamped Audit quote appears as RELEVÉ',()=>{
 const v=server();
 const a=v(paper(V4_FROZEN,180000),{ts:NOW-20000,lastPrice:80572.6},NOW);
 assert.equal(a.price,80572.6);
 assert.equal(a.version,'MCB-AUDIT');
 const q=browserQuote({liveState:a});
 assert.equal(q.status,'RELEVÉ');
 assert.equal(q.price,80572.6);
});
test('When all quote sources are stale, header must show LIVE — and no old blue line',()=>{
 const stale=server()(paper(V4_FROZEN,900000),
  {ts:NOW-90000,lastPrice:V4_FROZEN},NOW);
 assert.equal(stale.price,null);
 assert.equal(stale.source,'NO_FRESH_PRICE');
 assert.equal(browserQuote({liveState:stale}),null);
 assert.equal(browserQuote({liveState:{
  price:V4_FROZEN,ts:NOW-600,source:'V4_10_10_ARCHIVED'}}),null);
});
test('The same verified quote updates graph blue line AND the two price headers',()=>{
 assert.ok(src.includes("const livePrice=quote?.price??null;"));
 assert.ok(src.includes("const quote=waveReplayMode==='live'?waveCurrentMarketQuote():null;"));
 assert.ok(src.includes('id="waveReplayPriceLiveValue"'));
 assert.ok(src.includes("const label=(outsideHigh?'↑ ':outsideLow?'↓ ':'')+"));
 assert.ok(src.includes('waveSchedulePriceRedraw()'));
 assert.ok(src.includes("waveReplayMode==='live'"));
 assert.ok(src.includes("source:'V54_PAPER_PRICE'")||
   src.includes("v.source!=='V54_PAPER_PRICE'"));
 assert.ok(!src.includes('const liveState=waveUiCompactEval(livingEval);'),
  'V4 frozen live state must not be sent from /api/wave-live');
});
test('OPEN WebSocket with zero incoming trades gets closed and server fallback is used',async()=>{
 const original=code('/* Prix BTC OKX : un WS navigateur','document.querySelectorAll(\'.main-nav-item\')');
 let now=NOW;const sockets=[];
 class FakeWS{
  static OPEN=1;static CONNECTING=0;static CLOSING=2;static CLOSED=3;
  constructor(){this.readyState=1;sockets.push(this);this.sent=[];this.closed=false;}
  send(payload){this.sent.push(payload);}
  close(){this.closed=true;this.readyState=3;if(this.onclose)this.onclose();}
 }
 const textEl={textContent:''},metaEl={textContent:''};
 const ctx={Date:{now:()=>now},WebSocket:FakeWS,
  window:{updateElasticCurrentPrice:()=>{}},
  document:{hidden:false,getElementById:id=>id==='v3LivePrice'?textEl:
    id==='v3LivePriceMeta'?metaEl:null,addEventListener:()=>{}},
  setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>2,clearTimeout:()=>{},
  AbortSignal:{timeout:()=>undefined},
  fetch:async()=>({ok:true,json:async()=>({price:80570.8,ts:now,
    source:'V54_PAPER_PRICE'})})};
 vm.createContext(ctx);vm.runInContext(original,ctx);
 vm.runInContext('connectV3LivePrice()',ctx);
 assert.equal(sockets.length,1);
 sockets[0].onopen();
 sockets[0].onmessage({data:JSON.stringify({arg:{channel:'trades'},
  data:[{px:String(V4_FROZEN),ts:String(now)}]})});
 assert.equal(textEl.textContent.includes('80'),true);
 now+=16500;
 vm.runInContext('v3UiPriceWatchdog()',ctx);
 assert.equal(sockets[0].closed,true,'zombie OPEN socket is terminated');
 // Allow asynchronous server-fallback fetch and parsed quote to settle.
 await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(vm.runInContext('v3UiPrice.source',ctx),'V54_SERVER');
 assert.equal(vm.runInContext('v3UiPrice.price',ctx),80570.8);
 assert.ok(textEl.textContent.includes('80'));
});
