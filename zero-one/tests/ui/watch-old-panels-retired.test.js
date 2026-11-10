'use strict';
// BOONO Watch regression tests: retirement of legacy rendered Elastic/Conversion
// and the redundant living states on the Vagues tab. Read-only evidence only.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const SERVER=fs.readFileSync(path.resolve(__dirname,'../../modules/config-server.js'),'utf8');
const LIVE_CONVERSION=fs.readFileSync(path.resolve(__dirname,'../../modules/elastic-live-conversion-v541.js'),'utf8');

function getClient(){
 const begin=SERVER.indexOf("app.get('/app.js'");
 const tick=String.fromCharCode(96);
 const a=SERVER.indexOf('send('+tick,begin)+5;
 const b=SERVER.indexOf(tick+');\n});',a);
 assert.ok(begin>0&&a>5&&b>a,'client JS template exists');
 return vm.runInNewContext(SERVER.slice(a,b+1));
}
function getPage(){
 const begin=SERVER.indexOf("app.get('/', requireAuth,");
 const tick=String.fromCharCode(96);
 const a=SERVER.indexOf('res.send('+tick,begin)+9;
 const b=SERVER.indexOf(tick+');\n});',a);
 assert.ok(begin>0&&a>9&&b>a,'page HTML template exists');
 return SERVER.slice(a,b);
}
test('Watch loads only the current mini Conversion (no legacy Elastic or full duel)',()=>{
 const html=getPage(),js=getClient();
 assert.doesNotMatch(html,/<script src="\/elastic-observer-ui\.js"><\/script>/);
 assert.match(html,/<script src="\/elastic-mini-conversion-v542\.js"><\/script>/);
 assert.match(html,/<script src="\/elastic-live-conversion-v541\.js"><\/script>/);
 assert.doesNotMatch(js,/window\.renderElasticObserverV05\s*\?/);
 assert.doesNotMatch(js,/loadElasticObserverHistory\(\)|loadElasticChart3m\(current\)/);
 assert.match(js,/v52-mini-conversion/);
 assert.match(js,/v52-mini-ticker/);
 assert.match(js,/v52-decision-tech-details/);
 assert.doesNotMatch(html,/État V4 — chargement\./);
});
test('Vagues keeps its price/wave canvases and FLOW, but drops both legacy living states',()=>{
 const html=getPage(),js=getClient();
 for(const id of ['wavePriceCanvas','wave15Canvas','wave3Canvas','waveFlowAudit','waveTradePanel']){
  assert.ok(html.includes('id="'+id+'"'),id+' exists');
 }
 for(const id of ['waveReplayState','waveV5StructureStory']){
  assert.ok(!html.includes('id="'+id+'"'),id+' removed');
  assert.ok(!js.includes("getElementById('"+id+"')"),id+' not used in client');
 }
 assert.doesNotMatch(js,/loadWaveV5StructureStory\(\)/);
 const a=js.indexOf('function renderWaveReplay() {');
 const b=js.indexOf('const waveInfoContent=',a);
 const flow={innerHTML:''},calls=[];
 const sandbox={
  waveReplayData:{frames:[{ts:1794330000000,wave15:{mf:2.2},audit:{priceMove:8,cadence:28,volumeFenetreBtc:20,winSec:2,mf15Pente:1.3}}]},
  waveReplayIndex:0,document:{getElementById:id=>id==='waveFlowAudit'?flow:{id}},
  waveNum:(v,d)=>v==null?'—':Number(v).toFixed(d===undefined?1:d),
  drawWavePrice:()=>calls.push('price'),drawWaveBand:(_,k)=>calls.push(k),
  waveRenderTradePanel:()=>calls.push('trades'),waveUpdateHistoryStatus:()=>calls.push('history')
 };
 vm.runInNewContext(js.slice(a,b)+'\nrenderWaveReplay()',sandbox);
 assert.deepEqual(calls,['price','wave15','wave3','trades','history']);
 assert.match(flow.innerHTML,/FLOW \/ AUDIT/);
 assert.match(flow.innerHTML,/BTC\/s/);
});
test('New mini gets its OHLC candles from existing authenticated 3m route with throttling',async()=>{
 const js=getClient();
 const a=js.indexOf('let miniConversionCandlesBusy=false');
 const b=js.indexOf('async function loadV52PaperPanel()',a);
 assert.ok(a>0&&b>a,'standalone candles helper exists');
 const host={title:'',removeAttribute(){},setAttribute(){}};
 const elements={
  'tab2-statev2':{classList:{contains:x=>x==='active'}},
  'v52-mini-conversion':host
 };
 let fetches=0,feeds=0;
 const sandbox={
  document:{hidden:false,getElementById:id=>elements[id]||null},
  window:{BoonoMiniConversion:{setCandles:payload=>{feeds++;return Array.isArray(payload.candles)&&payload.candles.length>=2;}}},
  fetch:async(url,opts)=>{
   fetches++;
   assert.equal(url,'/api/elastic-chart-3m');
   assert.equal(opts.cache,'no-store');
   return {ok:true,json:async()=>({candles:[{ts:1},{ts:2}]})};
  },
  AbortSignal,Date,Number,Error,String
 };
 const loader=vm.runInNewContext(js.slice(a,b)+'\nloadMiniConversionCandles',sandbox);
 await loader();await loader();
 assert.equal(fetches,1);assert.equal(feeds,1);
});
test('OKX live conversion continues through current mini while Waves tab stays idle',()=>{
 let active=true;const calls=[];
 const nodes={
  'tab2-statev2':{classList:{contains:x=>x==='active'&&active}},
  'v52-mini-conversion':{id:'v52-mini-conversion'}
 };
 const w={BoonoMiniConversion:{refresh:s=>{calls.push(s);return true;}}};
 vm.runInNewContext(LIVE_CONVERSION,{window:w,
  document:{hidden:false,getElementById:id=>nodes[id]||null},Date,Number,String,Math,Set});
 const o=w.elasticConversionV541,now=Date.now();
 assert.ok(o.ingestTrade({instId:'BTC-USDT-SWAP',ts:now-800,px:'74001',sz:'100',side:'buy',tradeId:'1'}));
 assert.ok(o.ingestTrade({instId:'BTC-USDT-SWAP',ts:now-200,px:'74005',sz:'200',side:'sell',tradeId:'2'}));
 assert.equal(o.refreshUi(true),true);
 assert.equal(calls.length,1);
 assert.equal(calls[0].effort.buyBtc,1);
 assert.equal(calls[0].effort.sellBtc,2);
 active=false;assert.equal(o.refreshUi(true),false);
 assert.equal(calls.length,1);
});

