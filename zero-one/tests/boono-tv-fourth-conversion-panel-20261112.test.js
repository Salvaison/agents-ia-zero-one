'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const script=fs.readFileSync(path.resolve(__dirname,'../boono-tv/scene/tv-conversion-panel.js'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../boono-tv/scene/tv-conversion-panel.css'),'utf8');
function harness(){
 const elements=Object.fromEntries([
 '#statePanel','#tvConversionPanel','#tvConvQuote','#tvConvPM','#tvConvQuality',
 '#tvConvDuelInfo','#tvConvDelta','#tvConvDeport','#tvConvEffortNote','#tvConvVolumeRail',
 '#tvConvTicker','#tvConvPriceCanvas','#tvConvOverlayCanvas','#tvConvPeriod','#tvConvMA'
 ].map(name=>[name,{innerHTML:'',textContent:'',title:'',dataset:{},clientWidth:430,clientHeight:550}]));
 elements['#statePanel'].dataset.activePanel='conversion';
 const calls=[];
 const charts={
  drawPrice(_canvas,rows,opts){
   calls.push({rows,opts});
   return {bounds:{lo:70000,hi:74000},padding:{left:22,right:83,top:11,bottom:26},
    plotHeight:480,plotWidth:325};
  },
  setupCanvas(){
   const ctx=new Proxy({save(){},restore(){},clearRect(){},beginPath(){},rect(){},clip(){},
    stroke(){},moveTo(){},lineTo(){},setLineDash(){},fillRect(){},roundRect(){},
    fill(){},fillText(){},strokeRect(){}},{get(obj,k){return obj[k]}});
   return {ctx,w:430,h:550};
  },
  mapPrice(v,b,p,h){return p+(b.hi-v)/(b.hi-b.lo)*h}
 };
 const w={BoonoCharts:charts};
 vm.runInNewContext(script,{window:w,document:{querySelector:x=>elements[x]||null},
  Intl,Date,Math,Number,String,Object,Array});
 return {elements,calls,api:w.BoonoTVConversion};
}
function packet(){
 const now=Date.now(),start=Math.floor(now/900000)*900000;
 const rows=Array.from({length:65},(_,i)=>{
  const price=71600+i*3;
  return {ts:now-(65-i)*180000,open:price,close:price+5,
   high:price+35,low:price-50,ma200:price+50};
 });
 const windows=Array.from({length:4},(_,i)=>{
  const t=start-i*900000;
  return {startAt:t,samples:i?30:9,partial:i===0,qualityFractions:{
   INEFFICIENT:.41,CONTESTED:.32,SILENT:.27},
   directionFractions:{long:.29,short:.44,contested:.27},
   marketFractions:{MIXED:.77,LOW_EDGE_SHADOW:.23}}
 });
 return {market:{fresh:true,price:71890,marketTimestamp:now},
  analysis:{asOf:now},series:{mcb3:rows},
  conversion:{status:'LIVE_3M',effort:{available:true,buyBtc:150,
   sellBtc:230,priceNetUsd:-22,priceRangeUsd:110},
   conversion:{pm3:-40,pm5:32,pmLive:-10.8,quality:'CONTESTED',direction:null}},
  tvTicker4x15:{mode:'SHADOW_ONLY',decisionImpact:false,
   brokerOrdersEnabled:false,status:'DATA_RECENT',asOf:now,
   windows:windows.slice().reverse(),volume4x15:{
    source:'OKX_BTC_USDT_SWAP_CLOSED_1M_VOLCCY',status:'OK',asOf:now,
    windows:windows.map(x=>({startAt:x.startAt,sourceStatus:'OK',
     meanBtcPerMinute:62.1,meanGraphVolumePct:70}))}}};
}
test('Fourth stage renders confirmed 3m candles, live buy/sell duel and 4x15 from existing snapshot',()=>{
 const {api,elements,calls}=harness();const x=packet();
 api.onSnapshot(x);
 assert.equal(calls.length,1);
 assert.ok(calls[0].rows.length>=45);
 assert.equal(calls[0].opts.theme,'tv-neon');
 assert.equal(calls[0].opts.candleMs,180000);
 assert.match(elements['#tvConvQuote'].textContent,/71.?890/);
 assert.match(elements['#tvConvDuelInfo'].innerHTML,/ACHAT 150,00 BTC/);
 assert.match(elements['#tvConvDuelInfo'].innerHTML,/VENTE 230,00 BTC/);
 assert.match(elements['#tvConvDelta'].textContent,/-22,0/);
 assert.match(elements['#tvConvPM'].innerHTML,/PM3/);
 assert.match(elements['#tvConvQuality'].textContent,/CONTESTED/);
 assert.equal((elements['#tvConvTicker'].innerHTML.match(/tv-quarter-card/g)||[]).length,4);
 assert.match(elements['#tvConvTicker'].innerHTML,/Vol moy: 70% · 62,1 BTC\/min/);
 assert.match(elements['#tvConvTicker'].innerHTML,/INEFFICIENT 41%/);
 assert.match(elements['#tvConvTicker'].innerHTML,/LONG 29%/);
 assert.match(elements['#tvConvTicker'].innerHTML,/MIXED 77%/);
 assert.equal(elements['#tvConvTicker'].dataset.status,'DATA_RECENT');
 assert.equal((elements['#tvConvVolumeRail'].innerHTML.match(/class="on"/g)||[]).length,8);
});
test('No re-render when hidden, manual/next view renders only from existing snapshot',()=>{
 const {api,elements,calls}=harness(),p=packet();
 elements['#statePanel'].dataset.activePanel='state';
 api.onSnapshot(p);
 assert.equal(calls.length,0);
 api.render();
 assert.equal(calls.length,1);
 assert.equal(api.source,'TV_READ_ONLY_EXISTING_OKX_MCB3_V494_ELASTIC');
});
test('Stale or absent ticker cannot masquerade as real-time, no invented minute volumes',()=>{
 const {api,elements}=harness(),p=packet();
 p.tvTicker4x15.status='SOURCE_STALE';
 p.tvTicker4x15.volume4x15=null;
 api.render(p);
 assert.equal(elements['#tvConvTicker'].dataset.status,'SOURCE_STALE');
 assert.equal((elements['#tvConvTicker'].innerHTML.match(/SOURCE ANCIENNE/g)||[]).length,4);
 assert.match(elements['#tvConvTicker'].innerHTML,/Vol moy: —% · — BTC\/min/);
});
test('When OKX price/effort is unavailable, quote and duel are not fabricated',()=>{
 const {api,elements}=harness(),p=packet();
 p.market.fresh=false;
 p.conversion.effort.available=false;
 p.conversion.effort.buyBtc=null;
 p.conversion.effort.sellBtc=null;
 api.render(p);
 assert.equal(elements['#tvConvQuote'].textContent,'BTC —');
 assert.match(elements['#tvConvDuelInfo'].innerHTML,/ACHAT — BTC/);
 assert.equal(elements['#tvConversionPanel'].dataset.priceStatus,'PRICE_STALE');
});
test('Stage CSS is scoped; Vagues and studio calibrated projection geometry are untouched',()=>{
 assert.match(css,/#tvConversionPanel\{/);
 assert.match(css,/#statePanel\.conversion-active \.price-row/);
 assert.match(css,/#statePanel\.conversion-active #tvConversionPanel/);
 assert.match(css,/grid-template-rows:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/#tvConvVolumeRail/);
 assert.doesNotMatch(css,/#room\.visual-library|#deskScreen|\.market-curtain|\.boono-character/);
 assert.doesNotMatch(script,/(\/api\/orders|\/api\/execute|fetch\(|new WebSocket|placeOrder)/);
});
