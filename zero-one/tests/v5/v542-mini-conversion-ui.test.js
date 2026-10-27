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
test('sky-blue fixed axis and displacement corridor encode signed 3m PRICE net/range',()=>{
 const {mini}=create(),base={data:candles(),periodData:{to:NOW},
  width:220,height:192,now:NOW,quoteValue:79880};
 const snap=example({priceShift:-57,range:155});
 const falling=mini.miniSvg({...base,snapshot:snap});
 const rising=mini.miniSvg({...base,snapshot:example({priceShift:57,range:155})});
 const zero=mini.miniSvg({...base,snapshot:example({priceShift:0,range:155})});
 const missing=mini.miniSvg({...base,snapshot:example({status:'OKX_TRADES_UNAVAILABLE'})});
 const x=s=>Number((s.match(/class="v52-mini-blue-zero-axis" x1="([\d.]+)"/)||[])[1]);
 const contact=s=>Number((s.match(/class="v52-mini-cube-contact" x1="([\d.]+)"/)||[])[1]);
 const gap=s=>Number((s.match(/class="v52-mini-price-deport-gap" x="([\d.]+)" y="[\d.]+" width="([\d.]+)"/)||[])[2]);
 assert.ok(falling.includes('stroke="#4a9eff" stroke-width="1.6"'),
  'zero-price-displacement line uses same BOONO sky-blue accent');
 assert.ok(falling.includes('fill="#4a9eff" fill-opacity=".17"'),
  'the corridor must be visibly colored, not an imagined gap');
 assert.equal(x(falling),x(rising));
 assert.ok(contact(falling)<x(falling),'negative 3m price displacement shifts cubes left');
 assert.ok(contact(rising)>x(rising),'positive 3m price displacement shifts cubes right');
 assert.ok(Math.abs(gap(falling)-Math.abs(contact(falling)-x(falling)))<.25);
 assert.ok(falling.includes('Déport prix 3m : -36,8 %'));
 assert.ok(rising.includes('Déport prix 3m : +36,8 %'));
 assert.ok(!zero.includes('class="v52-mini-price-deport-gap"'),
  'zero displacement creates zero visual distance');
 assert.ok(!missing.includes('class="v52-mini-price-deport-gap"'));
 assert.ok(missing.includes('class="v52-mini-blue-zero-axis"'),
  'reference remains even if the OKX feed is unavailable');
 assert.ok(!falling.includes('eff3 -36,8'),
  'normalized price displacement is not efficiency of conversion');
});
test('normalized price deport row is separate from BTC price and does not use volume dominance',()=>{
 const {mini,dom}=create();
 const node=()=>({textContent:'',innerHTML:'',className:'',
  getBoundingClientRect:()=>({width:222,height:192})});
 for(const name of ['v52-mini-conversion','v52-mini-conversion-svg','v52-mini-delta',
  'v52-mini-price-deport','v52-mini-begin','v52-mini-end','v52-mini-btc-price',
  'v52-mini-buy','v52-mini-sell'])dom[name]=node();
 mini.setQuote(79880,NOW,'OKX live');
 mini.setCandles({candles:candles(),period:{to:NOW}});
 mini.refresh(example({buy:100,sell:1,priceShift:-57,range:155}));
 assert.equal(dom['v52-mini-price-deport'].textContent,
  'Déport prix -36,8 % du range 3m');
 assert.equal(dom['v52-mini-delta'].textContent,'Δ BTC 3m -57,0 $');
 // Changing effort dominance cannot change the normalized PRICE reading.
 mini.refresh(example({buy:1,sell:100,priceShift:-57,range:155}));
 assert.equal(dom['v52-mini-price-deport'].textContent,
  'Déport prix -36,8 % du range 3m');
 // Changing PRICE range changes the relative displacement but not $ movement.
 mini.refresh(example({buy:100,sell:1,priceShift:-57,range:190}));
 assert.equal(dom['v52-mini-price-deport'].textContent,
  'Déport prix -30,0 % du range 3m');
 assert.equal(dom['v52-mini-delta'].textContent,'Δ BTC 3m -57,0 $');
 mini.refresh(example({status:'OKX_TRADES_UNAVAILABLE'}));
 assert.equal(dom['v52-mini-price-deport'].textContent,'Déport prix —');
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
test('Conversion has one grey LIVE header, no nested white frame and Bâton near PM',()=>{
 const begin=config.indexOf("cell('conv','4. CONVERSION. PM ");
 const end=config.indexOf("cell('prognosis'",begin);
 assert.ok(begin>0&&end>begin);
 const slot=config.slice(begin,end);
 assert.ok(slot.includes('id="v52-mini-conversion-status"'));
 assert.ok(slot.includes('v52-mini-baton'));
 assert.ok(slot.indexOf('v52-mini-baton')<slot.indexOf('id="v52-mini-pm"'));
 assert.ok(slot.includes("sn(c.pmLastBaton)+' $ · depuis '+sn(c.pmSinceBaton)"));
 const above=slot.slice(0,slot.indexOf('id="v52-mini-conversion"'));
 assert.ok(!above.includes('Bâton +'));
 assert.ok(!slot.includes('v52-mini-head'),'no duplicated header');
 assert.ok(config.includes('.v52-cell.conv>.title{font:850 8.7px/1.4'));
 assert.ok(config.includes('border-bottom:1px solid #cbd5dd'),
  'single thin light-grey separator below main heading');
 assert.ok(config.includes('.v52-cell.conv > .value{display:none;}'));
 assert.ok(config.includes('.v52-mini-conversion{flex:1;min-width:0;margin-top:0;border:0;'));
 assert.ok(config.includes('.v52-mini-pm{color:#18222b;font-size:9px;'));
 assert.ok(src.includes("'OKX LIVE 3MIN'"));
 assert.ok(slot.includes("Vitesse 3m '"));
 assert.ok(!slot.includes('2m précédentes'));
});
test('Conversion information is ordered below the graph with subtle separators and lighter frame',()=>{
 const begin=config.indexOf("cell('conv','4. CONVERSION. PM ");
 const end=config.indexOf("cell('prognosis'",begin);
 assert.ok(begin>0&&end>begin);
 const slot=config.slice(begin,end);
 const miniStart=slot.indexOf('id="v52-mini-conversion"');
 assert.ok(miniStart>0);
 const top=slot.slice(0,miniStart);
 assert.ok(!top.includes('v52-mini-baton'),'Bâton is now in the lower telemetry');
 assert.ok(!top.includes("'PM3 '+sn(c.pm3)"),'redundant top PM3/PM5 removed');
 assert.ok(!top.includes('Vitesse 3m'),'speed removed from the top');
 assert.ok(!top.includes('MF3 Δ3m'),'MF history removed from the top');
 const order=[
  'id="v52-mini-btc-price"',
  'id="v52-mini-conversion-svg"',
  'id="v52-mini-delta"',
  'id="v52-mini-price-deport"',
  'id="v52-mini-begin"',
  'class="v52-mini-mf"',
  'v52-mini-baton',
  'id="v52-mini-pm"',
  'id="v52-mini-eff"',
  'v52-mini-speed v52-conv-speed',
  'id="v52-mini-quality"'
 ];
 let offset=-1;
 for(const item of order){
  const next=slot.indexOf(item);
  assert.ok(next>offset,item+' must follow the preceding data');
  offset=next;
 }
 assert.equal(slot.split('MF3 Δ3m').length-1,1,'MF data only once');
 assert.equal(slot.split('Vitesse 3m').length-1,1,'speed only once');
 assert.equal(slot.split('id="v52-mini-pm"').length-1,1,
  'PM3 PM5 Live are dynamically shown once at the bottom');
 for(const selector of ['.v52-mini-volume','.v52-mini-price-deport',
  '.v52-mini-hours']){
  const start=config.indexOf(selector+'{');
  assert.ok(start>0);
  const css=config.slice(start,config.indexOf('}',start));
  assert.ok(css.includes('border-bottom:1px solid #aebac3'),
   selector+' should separate sections with a thin dark-grey rule');
 }
 // The requested divider is under buyer/seller VOLUMES. Price and Delta
 // have no horizontal divider below them; Delta and Deport stay connected.
 for(const selector of ['.v52-mini-price-row','.v52-mini-delta']){
  const start=config.indexOf(selector+'{');
  assert.ok(start>0);
  const css=config.slice(start,config.indexOf('}',start));
  assert.ok(!css.includes('border-bottom'),selector+' must have no divider');
 }
 assert.ok(slot.indexOf('class="v52-mini-volume"')<
  slot.indexOf('id="v52-mini-delta"'), 'volume values precede price Delta');
 assert.ok(config.includes('.v52-cell.conv{border-left-color:#a15391;display:flex;flex-direction:column;background:#f3f5f7;}'),
  'the SINGLE outer Conversion card is light grey, with no nested white frame');
 assert.ok(config.includes('.v52-mini-chart{margin:0;min-height:192px;width:100%;overflow:hidden;background:#fff;'),
  'candle viewport remains pure white');
 assert.ok(config.includes('.v52-mini-pm{color:#18222b;font-size:9px;'),
  'PM3/PM5/Live row is black and same size as other small info');
});
test('live Etat vivant renders moved MF and speed only after the two time labels',()=>{
 const tick=String.fromCharCode(96);
 const source=config.indexOf("app.get('/app.js', requireAuth"),
  a=config.indexOf('send('+tick,source),
  b=config.indexOf(tick+');\n});',a);
 assert.ok(source>0&&a>0&&b>a);
 const js=vm.runInNewContext(tick+config.slice(a+6,b)+tick);
 const start=js.indexOf('function renderV52Living(data){');
 const finish=js.indexOf('async function loadV52PaperPanel(){',start);
 assert.ok(start>0&&finish>start);
 const element={innerHTML:''};
 const context={document:{getElementById:id=>id==='v52-live'?element:null},
  window:{},Date,Math,Number,String,escTrade:String,
  v5Time:v=>v?new Date(v).toISOString():'—'};
 vm.createContext(context);
 vm.runInContext(js.slice(start,finish),context);
 context.renderV52Living({updatedAt:NOW,analysis:{asOf:NOW,price:80440,
  action:'WAIT',quality:'DATA_OK',readings:{
   conversion:{pmLastBaton:14.6,pmSinceBaton:-21.4,pm3:-61.3,
    pm5:-119.8,mf3Delta3m:-2.0,intervalSeconds:15.6},
   mcb15:{mf15Delta10m:null},maturity:{recent3mRateUsdPerMin:null},
   flow15:{qualityGrade:'CONTESTED',mf15Role:null}}}});
 const html=element.innerHTML;
 const startCell=html.indexOf('class="v52-cell conv"');
 const nextCell=html.indexOf('class="v52-cell prognosis"',startCell);
 assert.ok(startCell>0&&nextCell>startCell);
 const conv=html.slice(startCell,nextCell),preChart=conv.slice(0,conv.indexOf('id="v52-mini-conversion"'));
 assert.ok(!preChart.includes('Bâton +14.6 $'));
 assert.ok(conv.includes('Bâton +14.6 $ · depuis -21.4 $'));
 assert.ok(conv.indexOf('MF3 Δ3m -2.0')<conv.indexOf('Bâton +14.6 $'));
 assert.ok(conv.indexOf('Bâton +14.6 $')<conv.indexOf('id="v52-mini-pm"'));
 assert.ok(!preChart.includes('PM3 -61.3'));
 assert.ok(!preChart.includes('MF3 Δ3m'));
 assert.ok(!preChart.includes('Vitesse 3m'));
 assert.ok(conv.includes('MF3 Δ3m -2.0 · MF15 Δ10m — · cohérence CONTESTED'));
 assert.ok(conv.includes('· 15.6s après Bâton'));
 assert.ok(conv.indexOf('id="v52-mini-end"')<conv.indexOf('MF3 Δ3m -2.0'));
 assert.ok(conv.indexOf('id="v52-mini-eff"')<conv.indexOf('Vitesse 3m — $/min'));
 assert.ok(conv.indexOf('Vitesse 3m — $/min')<conv.indexOf('id="v52-mini-quality"'));
});
test('the CURRENT full Conversion window AND mini use 150 minutes of actual 3m candles',()=>{
 assert.ok(config.includes("const now=Date.now(),minutes=150,t0=now-minutes*60000;"));
 assert.ok(config.includes("waveUiPriceSeries('3m',t0-180000,now).slice(-53)"));
 assert.ok(observer.includes('const t0=end-150*60000,t1=end+6*60000;'),
  'the existing larger canvas must no longer be limited to 90 minutes');
 assert.ok(src.includes('const VISIBLE_MINUTES=150;'));
 const {mini,dom}=create();
 const node=()=>({textContent:'',innerHTML:'',className:'',
  getBoundingClientRect:()=>({width:222,height:192})});
 for(const id of ['v52-mini-conversion','v52-mini-conversion-svg',
  'v52-mini-begin','v52-mini-end'])dom[id]=node();
 const bars=Array.from({length:53},(_,i)=>{
  const ts=NOW-(52-i)*ms,close=79900+Math.sin(i/5)*42;
  return {ts,open:close-3,high:close+7,low:close-8,close,ma200:79850};
 });
 mini.setCandles({period:{from:NOW-150*60000,to:NOW},candles:bars});
 assert.equal(mini.getSourceStatus().candles,53,
  'data source and client must not truncate to old 45 bars');
 const svg=mini.miniSvg({data:bars,periodData:{to:NOW},
  snapshot:example(),width:222,height:192,now:NOW,quoteValue:79890});
 assert.ok(svg.includes('data-window-minutes="150"'));
 const wickCount=[...svg.matchAll(/stroke-width=".68"/g)].length;
 assert.ok(wickCount>=45,
  'at least 120 minutes of 3m candles must be actually drawable');
 const start=new Date(NOW-150*60000).toLocaleTimeString('fr-FR',{
  timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit'});
 const end=new Date(NOW).toLocaleTimeString('fr-FR',{
  timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit'});
 assert.equal(dom['v52-mini-begin'].textContent,start);
 assert.equal(dom['v52-mini-end'].textContent,end);
 assert.equal((src.match(/fetch\(/g)||[]).length,0);
});
test('lightened outer frame remains separate from the white candle window',()=>{
 const {mini}=create();
 const svg=mini.miniSvg({data:candles(),periodData:{to:NOW},
  snapshot:example(),width:222,height:192,now:NOW,quoteValue:79880});
 assert.ok(svg.includes('<rect width="222" height="192" fill="#fff"/>'),
  'SVG candle plotting surface is unconditionally pure white');
 assert.ok(config.includes('.v52-cell.conv{border-left-color:#a15391;display:flex;flex-direction:column;background:#f3f5f7;}'),
  'the outer Conversion card is light grey');
 assert.ok(config.includes('border:0;border-radius:0;padding:0;background:transparent;'),
  'there is no extra nested white/grey frame around the chart');
 assert.ok(config.includes('overflow:hidden;background:#fff;border:1px solid #d7e0e7'),
  'the chart window must also be explicitly white in CSS');
 assert.ok(!svg.includes('fill="#e6ebf0"'),
  'dark frame color may not be painted over the candlesticks');
});
test('10 white rounded black-bordered volume pastilles encode fixed LOG total traded BTC',()=>{
 const {mini}=create(),base={data:candles(),periodData:{to:NOW},
  width:220,height:192,now:NOW,quoteValue:79880};
 const intense=mini.miniSvg({...base,snapshot:example({buy:74.322,sell:754.777})});
 assert.ok(intense.includes('data-level="9" data-total-btc="829.099"'));
 assert.equal((intense.match(/class="v52-mini-volume-pastille"/g)||[]).length,10);
 assert.equal((intense.match(/class="v52-mini-volume-active"/g)||[]).length,9);
 assert.ok(intense.includes('rx="2" fill="#fff" stroke="#283039"'),
  'all pastilles are white with black rounded borders');
 assert.ok(intense.includes('PAS la liquidité disponible dans le carnet'),
  'executed OKX volume must not be called resting order-book liquidity');
 const quiet=mini.miniSvg({...base,snapshot:example({buy:1,sell:1})});
 assert.ok(quiet.includes('data-level="2" data-total-btc="2.000"'));
 const saturated=mini.miniSvg({...base,snapshot:example({buy:1000,sell:1500})});
 assert.ok(saturated.includes('data-level="10" data-total-btc="2500.000"'));
 assert.equal((saturated.match(/class="v52-mini-volume-active"/g)||[]).length,10);
 const stale=mini.miniSvg({...base,snapshot:example({status:'OKX_TRADES_UNAVAILABLE'})});
 assert.ok(stale.includes('data-level="unknown" data-total-btc=""'));
 assert.equal((stale.match(/class="v52-mini-volume-pastille"/g)||[]).length,10);
 assert.equal((stale.match(/class="v52-mini-volume-active"/g)||[]).length,0);
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
