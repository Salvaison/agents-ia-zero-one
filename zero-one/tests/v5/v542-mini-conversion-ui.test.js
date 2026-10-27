'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'modules/elastic-mini-conversion-v542.js'),'utf8');
const live=fs.readFileSync(path.join(root,'modules/elastic-live-conversion-v541.js'),'utf8');
const observer=fs.readFileSync(path.join(root,'modules/elastic-observer-ui.js'),'utf8');
const config=fs.readFileSync(path.join(root,'modules/config-server.js'),'utf8');
const NOW=Date.parse('2026-10-27T12:53:00Z');
const ms=180000;
function candles(){
 return Array.from({length:32},(_,i)=>{
  const close=79800+Math.sin(i/4)*130+i*3;
  return {ts:NOW-(31-i)*ms,open:close-12,high:close+30,
   low:close-30,close,ma200:79850+Math.sin(i/14)*10};
 });
}
function example({buy=3.31,sell=55.838,priceShift=-57,range=190,status='LIVE_3M'}={}){
 return {status,coverageSeconds:180,
  effort:{available:status==='LIVE_3M',buyBtc:buy,sellBtc:sell,
    priceNetUsd:priceShift,priceRangeUsd:range},
  conversion:{pm3:-58.2,pm5:-40.9,pmLive:-19,efficiency3m:null,
   yieldVsP75:null,effortVsP75:null,quality:'UNCLASSIFIED',direction:'short'}};
}
function create(){
 let now=NOW;
 const dom={},document={hidden:false,getElementById:k=>dom[k]||null};
 class Clock extends Date {static now(){return now;}}
 const ctx={window:{},document,Date:Clock,Intl,Number,Math,Array,
  Object,JSON,String,Set};vm.createContext(ctx);
 vm.runInContext(src,ctx);
 const mini=ctx.window.BoonoMiniConversion;
 return {ctx,mini,dom,setNow:t=>now=t};
}
test('compact graph contains OHLC, MA200, thin price lines every 500 USD and a fixed axis',()=>{
 const {mini}=create();
 const svg=mini.miniSvg({data:candles(),periodData:{to:NOW+ms},
  snapshot:example(),width:225,height:192,now:NOW,quoteValue:79880});
 assert.ok(svg.includes('role="img"'));
 assert.ok(svg.includes('graduations 500 dollars'));
 assert.ok(svg.includes('stroke-width=".92"'),'MA line thinner than full chart');
 assert.ok(svg.includes('stroke-width=".68"'),'candle wicks thin');
 const marked=[...svg.matchAll(/stroke="#dee5e9" stroke-width=".65"/g)].length;
 assert.ok(marked>=1,'price grid is drawn at the available 500-dollar levels');
 const priceTicks=[...svg.matchAll(/font-size="7.8" fill="#657789">([^<]+)<\/text>/g)];
 assert.ok(priceTicks.length>=1);
 const nums=priceTicks.map(x=>Number(x[1].replace(/[^0-9]/g,'')));
 assert.ok(nums.every((v,i)=>i===0||v-nums[i-1]===500));
 assert.ok(svg.includes('stroke="#3577b9"'),'fresh BTC price line');
 assert.ok(!svg.includes('class="v52-mini-price-gap"'),
  'price delta moves into its own HTML row');
 assert.ok(!svg.includes('class="v52-mini-btc-price"'),
  'absolute price moves outside the chart too');
 assert.ok(svg.includes('data-camp="ACHAT"')&&svg.includes('data-camp="VENTE"'));
 assert.ok(!svg.includes('PM3 35'),'PM should not relocate effort squares');
});
test('price window removes vertical empty bands, caps at 1600 USD, preserves cube dimensions',()=>{
 const {mini}=create();
 const opts={data:candles(),periodData:{to:NOW},snapshot:example(),
  width:220,height:192,now:NOW};
 const a=mini.miniSvg({...opts,quoteValue:79880});
 const b=mini.miniSvg({...opts,quoteValue:81680});
 const span=s=>Number((s.match(/data-price-span-usd="([\d.]+)"/)||[])[1]);
 assert.ok(span(a)>=500&&span(a)<900,
  'tight price excursion should not retain 1600 dollars of blank space');
 assert.equal(span(b),1600,'an extreme price excursion stays capped at 1600');
 assert.ok(a.includes('data-price-span-max-usd="1600"'));
 const lines=s=>[...s.matchAll(/<line x1="39" x2="213" y1="([\d.]+)" y2="[\d.]+" stroke="#dee5e9" stroke-width=".65"/g)]
  .map(x=>Number(x[1]));
 const ys=lines(b);
 assert.ok(ys.length>=2);
 const expected500px=(192-3-3)*500/1600;
 for(let i=1;i<ys.length;i++)
  assert.ok(Math.abs(Math.abs(ys[i-1]-ys[i])-expected500px)<.15,
   '500-dollar grid expands into the recovered top/bottom plot area');
 const boxes=s=>[...s.matchAll(/<g class="v52-mini-camp" data-camp="(?:ACHAT|VENTE)">[\s\S]*?<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)]
  .map(x=>({width:x[3],height:x[4]}));
 assert.deepEqual(boxes(a),boxes(b),
  'price zoom cannot change the buyer/seller cube proportions');
});
test('signed 3m price delta has its own enlarged row, followed by start/end times',()=>{
 const {mini,dom}=create();
 const node=()=>({textContent:'',innerHTML:'',className:'',
  getBoundingClientRect:()=>({width:220,height:192})});
 for(const name of ['v52-mini-conversion','v52-mini-conversion-svg',
  'v52-mini-delta','v52-mini-begin','v52-mini-end','v52-mini-btc-price'])
  dom[name]=node();
 mini.setQuote(79880,NOW,'OKX live');
 assert.equal(mini.setCandles({candles:candles(),period:{to:NOW}}),true);
 assert.equal(mini.refresh(example({priceShift:-57})),true);
 assert.equal(dom['v52-mini-delta'].textContent,'Δ BTC 3m -57,0 $');
 assert.ok(dom['v52-mini-delta'].className.includes('down'));
 assert.ok(dom['v52-mini-btc-price'].textContent.includes('BTC 79'));
 assert.notEqual(dom['v52-mini-begin'].textContent,'—');
 assert.notEqual(dom['v52-mini-end'].textContent,'—');
 const chart=dom['v52-mini-conversion-svg'].innerHTML;
 assert.ok(!chart.includes('v52-mini-price-gap'),
  'delta text must never cover bottom candles');
 assert.ok(!chart.includes('font-size="8" fill="#72818e"'),
  'start/end times are outside the price plot');
 assert.equal(mini.refresh(example({priceShift:57})),true);
 assert.equal(dom['v52-mini-delta'].textContent,'Δ BTC 3m +57,0 $');
 assert.ok(dom['v52-mini-delta'].className.includes('up'));
 assert.equal(mini.refresh(example({status:'OKX_TRADES_UNAVAILABLE'})),true);
 assert.equal(dom['v52-mini-delta'].textContent,'Δ BTC 3m —',
  'expired OKX trade prices cannot masquerade as live');
});
test('smaller chart grants proportionally generous size to squares and shares contact axis',()=>{
 const {mini}=create();
 const compact=mini.miniSvg({data:candles(),periodData:{to:NOW},
  snapshot:example(),width:220,height:192,now:NOW,quoteValue:79885});
 const large=mini.miniSvg({data:candles(),periodData:{to:NOW},
  snapshot:example(),width:430,height:192,now:NOW,quoteValue:79885});
 const squares=s=>[...s.matchAll(/<g class="v52-mini-camp" data-camp="(ACHAT|VENTE)">[\s\S]*?<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
 const small=squares(compact),big=squares(large);
 assert.equal(small.length,2);assert.equal(big.length,2);
 assert.ok(Number(small[1][4])>=45,'biggest cube remains visible on 220px surface');
 assert.ok(Number(small[1][4])/Math.sqrt(220*192)>.2,'substantial relative area');
 assert.equal(Number(small[0][2])+Number(small[0][4]),Number(small[1][2]),
  'buy / sell are touching at the same contact boundary');
 const unavailable=mini.miniSvg({data:candles(),snapshot:example({status:'OKX_TRADES_UNAVAILABLE'}),
  width:220,height:192,now:NOW});
 assert.ok(!unavailable.includes('data-camp="ACHAT"'),'stale OKX volumes are not drawn');
});
test('V5.4.2 PM values are accepted from current PAPER, legacy V4 and funded source refused',()=>{
 let now=NOW,ctx={window:{},document:{hidden:false,getElementById:()=>null},
  Date:{now:()=>now}};
 vm.createContext(ctx);vm.runInContext(live,ctx);
 const mod=ctx.window.elasticConversionV541;
 const current=(version,flag=false)=>({version,brokerOrdersEnabled:flag,asOf:now,
  readings:{conversion:{pm3:-12.4,pm5:-4.1,pmCombined:-7.3}}});
 assert.equal(mod.setAnalysis(current('v5.4.2-selective-attention-paper-v1')),true);
 assert.equal(mod.setAnalysis(current('v4.10.10-archived')),false);
 assert.equal(mod.setAnalysis(current('v5.4.2-selective-attention-paper-v1',true)),false);
 mod.ingestTrade({instId:'BTC-USDT-SWAP',tradeId:'aa',ts:String(now),
  px:'79900',side:'buy',sz:'150'});
 mod.ingestTrade({instId:'BTC-USDT-SWAP',tradeId:'bb',ts:String(now),
  px:'79910',side:'sell',sz:'300'});
 const x=mod.snapshot();
 assert.equal(x.conversion.pm3,-12.4);
 assert.equal(x.conversion.pm5,-4.1);
 assert.equal(x.conversion.pmLive,-7.3);
 assert.equal(x.effort.buyBtc,1.5);
 assert.equal(x.effort.sellBtc,3);
});
test('mini shares existing OKX WS and identical candle fetch; integrated into living conversion slot',()=>{
 assert.equal((src.match(/new WebSocket\(/g)||[]).length,0);
 assert.equal((src.match(/fetch\(/g)||[]).length,0);
 assert.ok(config.includes('<script src="/elastic-mini-conversion-v542.js"></script>'));
 assert.ok(config.includes("app.get('/elastic-mini-conversion-v542.js'"));
 assert.ok(config.includes('id="v52-mini-conversion"'));
 assert.ok(config.includes('id="v52-mini-conversion-svg"'));
 assert.ok(config.includes('id="v52-mini-btc-price"'));
 assert.ok(config.includes('id="v52-mini-delta"'));
 assert.ok(config.includes('class="v52-mini-hours"'));
 assert.ok(config.includes('id="v52-mini-begin"'));
 assert.ok(config.includes('id="v52-mini-end"'));
 assert.ok(config.indexOf('id="v52-mini-btc-price"')<
  config.indexOf('id="v52-mini-conversion-svg"'));
 assert.ok(config.indexOf('id="v52-mini-delta"')<
  config.indexOf('class="v52-mini-hours"'),
  'delta must have its own row immediately above start/end times');
 assert.ok(!config.includes('<span class="buy">ACHAT'),
  'remove buy word to leave room for the numerical volume');
 assert.ok(!config.includes('<span class="sell">VENTE'),
  'remove sell word to leave room for the numerical volume');
 assert.ok(config.includes('window.BoonoMiniConversion.refresh();'));
 assert.ok(observer.includes('window.BoonoMiniConversion.setCandles(data)'));
 assert.ok(observer.includes('window.BoonoMiniConversion.setQuote(price,ts,status)'));
 assert.ok(observer.includes('window.BoonoMiniConversion.refresh(active)'));
});
test('live painter carries all existing measurements, preserves null P75 not fabricated',()=>{
 const {mini,dom,setNow}=create();
 const node=(txt='')=>({textContent:txt,innerHTML:'',getBoundingClientRect:()=>({width:240,height:192})});
 Object.assign(dom,{
  'v52-mini-conversion':node(),
  'v52-mini-conversion-svg':node(),
  'v52-mini-conversion-status':node(),
  'v52-mini-buy':node(),
  'v52-mini-sell':node(),
  'v52-mini-btc-price':node(),
  'v52-mini-delta':node(),
  'v52-mini-begin':node(),
  'v52-mini-end':node(),
  'v52-mini-pm':node(),
  'v52-mini-eff':node(),
  'v52-mini-quality':node()
 });
 mini.setQuote(79925.7,NOW,'OKX live');
 assert.equal(mini.setCandles({candles:candles(),period:{to:NOW}}),true);
 assert.equal(mini.refresh(example()),true);
 assert.ok(dom['v52-mini-conversion-svg'].innerHTML.includes('data-camp="ACHAT"'));
 assert.ok(dom['v52-mini-buy'].textContent.includes('3.310 BTC'));
 assert.ok(dom['v52-mini-sell'].textContent.includes('55.838 BTC'));
 assert.ok(dom['v52-mini-btc-price'].textContent.includes('79'));
 assert.equal(dom['v52-mini-delta'].textContent,'Δ BTC 3m -57,0 $');
 assert.notEqual(dom['v52-mini-begin'].textContent,'—');
 assert.notEqual(dom['v52-mini-end'].textContent,'—');
 assert.ok(dom['v52-mini-pm'].textContent.includes('PM3 -58,2'));
 assert.ok(dom['v52-mini-pm'].textContent.includes('Live -19,0'));
 assert.ok(dom['v52-mini-eff'].textContent.includes('eff3 —'));
 assert.ok(dom['v52-mini-eff'].textContent.includes('yield/P75 —'));
 assert.ok(dom['v52-mini-eff'].textContent.includes('effort/P75 —'));
 assert.ok(dom['v52-mini-quality'].textContent.includes('UNCLASSIFIED'));
 setNow(NOW+40000);
 assert.equal(mini.refresh(example({status:'OKX_TRADES_UNAVAILABLE'})),true);
 assert.ok(!dom['v52-mini-conversion-svg'].innerHTML.includes('data-camp="ACHAT"'));
 assert.ok(!dom['v52-mini-conversion-svg'].innerHTML.includes('BTC 79'));
});
