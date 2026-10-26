'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test'),fs=require('fs'),vm=require('vm');
const shadow=require('../../modules/v4/experiments/elastic-observer-shadow');
function f(t=10000000,opts={}){
 const r=(tf)=>({ts:t-(tf==='3m'?180000:900000),close:82800,high:82830,low:82780,ma200:82500,
   blue_wave:opts.bw??40,lt_blue_wave:opts.lbw??45,money_flow:opts.mf??4});
 const live=(tf)=>({ts:t-(tf==='3m'?0:0),close:82800,high:82820,low:82780,ma200:82500,
   blue_wave:opts.bwLive??42,lt_blue_wave:opts.lbwLive??48,money_flow:opts.mfLive??7});
 return {market:{timestamp:t,price:82810},sources:{auditRows:[{ts:t,priceMove:-21}],liveTicks:opts.ticks||[],
   mcb:{tfs:{'3m':{history:[r('3m')],live:live('3m')},'15m':{history:[r('15m')],live:live('15m')}}}}};
}
const ev=(f,prev=null,ns={},tr={horizons:{net3mUsd:-80,net5mUsd:-73,efficiency3m:.66}},
 tick={current:{yieldVsP75:.72,effortVsP75:.72}},pb={travel:{yieldVsP75:.72,effortVsP75:.72}})=>
 shadow.evaluate(f,{},ns,{candidateDirection:'short'},tr,tick,null,pb,{},null,{},null,prev);
test('previous confirmed candle is grey source; slope from confirmed to live, not sign',()=>{
 const x=ev(f());
 assert.equal(x.shared.MCB15.bw.confirmed,40);
 assert.equal(x.shared.MCB15.bw.live,42);
 assert.equal(x.shared.MCB3.lbwDelta,3);
 assert.equal(x.shared.MCB3.lbwChangePerMinute,1);
 assert.equal(x.decisionImpact,false);
 assert.equal(x.conversion.quality,'SILENT');
});
test('nine approved English conversion names and separate temporal quality',()=>{
 const mk=(a,b,e,p3=-50,p5=-60,y95=null)=>{
  const tick={current:{yieldVsP75:b,effortVsP75:e,yieldVsP95:y95}};
  return ev(f(),null,{}, {horizons:{net3mUsd:p3,net5mUsd:p5,efficiency3m:.55}},tick,
   {travel:{yieldVsP75:b,effortVsP75:e,yieldVsP95:y95}}).conversion.quality;
 };
 assert.equal(mk(null,.5,.5),'SILENT');
 assert.equal(mk(null,.5,1.2),'INEFFICIENT');
 assert.equal(mk(null,1.4,.6),'EASY');
 assert.equal(mk(null,1.4,1.2),'POWERFUL');
 assert.equal(mk(null,1.4,1.2,-70,-80,1.2),'EXCEPTIONAL');
 assert.equal(mk(null,.7,.8,-70,80),'CONTESTED');
 assert.ok(Object.keys(ev(f()).conversion.labels).includes('ABSORBED'));
 assert.ok(Object.keys(ev(f()).conversion.labels).includes('EXHAUSTED'));
});
test('event lifecycle: provisional E15 DN does not replace last confirmed UP',()=>{
 const up={lastUp:{type:'UP',ts:9700000,value:70},live15:{fresh:false}};
 const a=ev(f(),null,up);
 assert.equal(a.signals['15m'].confirmed.type,'UP');
 const dnLive={...up,live15:{fresh:true,dn:{type:'DN',ts:9990000,value:70}}};
 const b=ev(f(10030000),a,dnLive);
 assert.equal(b.signals['15m'].confirmed.type,'UP');
 assert.equal(b.signals['15m'].live.type,'DN');
 assert.ok(!b.newEvents.some(x=>x.type==='SUPERSEDED'&&x.key==='E15'));
 const confirmed={...up,lastDn:{type:'DN',ts:9990000,value:70},live15:{fresh:false}};
 const c=ev(f(10060000),b,confirmed);
 assert.equal(c.signals['15m'].confirmed.type,'DN');
 assert.ok(c.newEvents.some(x=>x.type==='SUPERSEDED'&&x.key==='E15'));
 assert.ok(c.newEvents.some(x=>x.type==='CONFIRMED'&&x.key==='E15'));
 assert.ok(c.newEvents.some(x=>x.type==='INTERRUPTED'&&x.key==='E15'));
 const stable=ev(f(10090000),c,confirmed);
 assert.ok(!stable.newEvents.some(x=>x.key==='E15'));
});
test('MA episodes have CONTACT, DEPART, RETEST and HELD without repeat each 30s',()=>{
 let prev=null;
 function make(ts,high,low,close){
  const frame=f(ts);
  const bar={ts,high,low,close,ma200:82800};
  frame.market.price=close;
  frame.sources.mcb.tfs['3m'].history=[bar];
  frame.sources.mcb.tfs['3m'].live={...bar};
  return frame;
 }
 const bars=[
  [10000000,82804,82796,82802,'CONTACT'],
  [10180000,82880,82860,82870,'DEPART'],
  [10360000,82805,82797,82803,'RETEST'],
  [10540000,82890,82867,82875,'HELD']];
 for(const [ts,high,low,close,expected] of bars){
  const out=shadow.maState(make(ts,high,low,close),'3m',prev);
  assert.equal(out.state,expected);prev=out;
  const repeated=shadow.maState(make(ts+30000,high,low,close),'3m',prev);
  assert.equal(repeated.lastTransition,null);
  assert.equal(repeated.retestCount,prev.retestCount);
 }
 assert.equal(prev.retestCount,1);
});
test('effort squares use real aggressive buyer/seller volume and price is independent',()=>{
 const ts=10000000;
 const a=f(ts,{ticks:[{ts:ts-40000,price:82800,side:1,volume:.2},
  {ts:ts-10000,price:82760,side:2,volume:.6}]});
 const x=ev(a);
 assert.equal(x.effort.available,true);
 assert.ok(Math.abs(x.effort.buyBtc-.2)<1e-9);
 assert.ok(Math.abs(x.effort.sellBtc-.6)<1e-9);
 assert.equal(x.effort.priceNetUsd,-40);
 assert.equal(ev(f(ts)).effort.available,false);
});
test('no duplicate transitions on unchanged signal/MA/quality snapshot',()=>{
 const a=ev(f());
 const b=ev(f(10030000),a);
 const c=ev(f(10060000),b);
 const d=ev(f(10090000),c);
 assert.equal(d.newEvents.length,0);
 assert.ok(c.newEvents.some(x=>x.type==='CONFIRMED'&&x.family==='CONVERSION'));
});
test('browser client renders 7 families and historical controls without twin columns',()=>{
 const code=fs.readFileSync(require.resolve('../../modules/elastic-observer-ui.js'),'utf8');
 const context={window:{},document:{},fetch:async()=>({ok:true,json:async()=>({events:[]})})};
 vm.runInNewContext(code,context);
 const s=ev(f());
 const html=context.window.renderElasticObserverV05({elasticObserverShadow:s});
 for(const label of ['MCB 15','MCB 3','FLOW','MA','CONVERSION','BOUNDARY','CONTEXT','CHRONOLOGIE','6 h','24 h','48 h','PRIX BTC']){
  assert.ok(html.includes(label),label);
 }
 assert.ok(!html.includes('CONTRE-PREUVES'));
 assert.ok(!html.includes('repris'));
});

test('historical transitions survive current-state changes and 6/24/48h queries',()=>{
 const os=require('node:os'),path=require('node:path');
 const store=require('../../modules/v3lab/storage/rotating-ndjson');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'elastic-v05-ledger-')),file=path.join(dir,'elastic-observer-events.ndjson');
 const now=Date.now();
 try{
  const rows=[{observedAt:now-30*3600000,sourceTs:now-30*3600000-900000,type:'CONFIRMED',family:'MCB15'},
   {observedAt:now-8*3600000,sourceTs:now-8*3600000-180000,type:'SUPERSEDED',family:'MCB15'},
   {observedAt:now-2*3600000,sourceTs:now-2*3600000-30000,type:'OBSERVED',family:'CONVERSION'}];
  for(const e of rows)store.appendRotatingNdjson(file,{...e,ts:new Date(e.observedAt).toISOString()},{maxBytes:10240,maxSegments:3});
  const read=hours=>store.readNdjsonSince(file,now-hours*3600000);
  assert.equal(read(6).length,1);
  assert.equal(read(24).length,2);
  assert.equal(read(48).length,3);
  assert.equal(read(48)[0].sourceTs,rows[0].sourceTs);
  assert.equal(read(48)[1].type,'SUPERSEDED');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('conversion quality changes are one transition, not paired INTERRUPTION plus OBSERVED',()=>{
 const a=ev(f());
 const b=ev(f(10030000),a,{}, {horizons:{net3mUsd:120,net5mUsd:111,efficiency3m:.8}},
   {current:{yieldVsP75:1.7,effortVsP75:.7}},
   {travel:{yieldVsP75:1.7,effortVsP75:.7}});
 const transitions=b.newEvents.filter(x=>x.family==='CONVERSION');
 assert.equal(transitions.length,1);
 assert.equal(transitions[0].type,'TRANSITION');
 assert.equal(transitions[0].previous.quality,'SILENT');
 assert.equal(transitions[0].current.quality,'EASY');
 assert.equal(b.lastEvent.type,'TRANSITION');
 assert.equal(b.conviction.pmLiveDirection,'short');
 assert.equal(b.conviction.decisionImpact,false);
});
test('duel moves together around fixed axis with BTC 3m displacement and price label',async()=>{
 const src=fs.readFileSync(require.resolve('../../modules/elastic-observer-ui.js'),'utf8');
 const T=Date.now(),canvas={getBoundingClientRect:()=>({width:420,height:268})};
 const svg={innerHTML:'',attributes:{},setAttribute(k,v){this.attributes[k]=v;}};
 const axis={innerHTML:''},loading={style:{},textContent:''};
 const priceEl={textContent:'',className:''};
 const btcLabel={textContent:''};
 const nodes={'elastic-price-candles':canvas,'elastic-conversion-overlay':svg,
  'elastic-price-axis':axis,'elastic-chart-loading':loading,
  'elastic-duel-price':priceEl,'elastic-current-btc-value':btcLabel};
 const optsCaptured=[];
 const ctx={window:{BoonoCharts:{
    drawPrice:(can,rows,opts)=>{optsCaptured.push({can,rows,opts});
      return {bounds:{lo:82000,hi:83000},padding:opts.padding,
        plotWidth:420-opts.padding.left-opts.padding.right,
        plotHeight:268-opts.padding.top-opts.padding.bottom};},
    mapPrice:(v,b,top,height)=>top+(b.hi-v)/(b.hi-b.lo)*height,
    mapTime:(ts,t0,t1,left,width)=>left+(ts-t0)/(t1-t0)*width
  }},document:{getElementById:id=>nodes[id]||null},
  fetch:async url=>({ok:true,json:async()=>({period:{to:T},candles:[
    {ts:T-18*60000,open:82400,high:82500,low:82350,close:82480},
    {ts:T-15*60000,open:82480,high:82580,low:82400,close:82530}],
    conversion:[{ts:T-180000,pm3Usd:-70},{ts:T-90000,pm3Usd:20},{ts:T,pm3Usd:45}]})})};
 vm.runInNewContext(src,ctx);
 const x=ev(f());x.effort={available:true,buyBtc:3,sellBtc:6,sampleCount:30,
   priceNetUsd:30,priceRangeUsd:50};
 x.conversion.pm3=45;
 // The cubes are driven by current OKX telemetry, NEVER the archived V4 evaluation.
 ctx.window.elasticConversionV541={snapshot:()=>({...x,status:'LIVE_3M',
  coverageSeconds:180})};
 ctx.window.updateElasticCurrentPrice(82531.3,T,'OKX live');
 await ctx.window.loadElasticChart3m({elasticObserverShadow:x});
 assert.equal(optsCaptured.length,1);
 assert.equal(optsCaptured[0].opts.theme,'interface');
 assert.equal(optsCaptured[0].opts.candleMs,180000);
 assert.equal(optsCaptured[0].rows.length,2);
 assert.equal(optsCaptured[0].opts.padding.right,10);
 const boxes=[...svg.innerHTML.matchAll(/<rect class="el-conversion-square" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
 assert.equal(boxes.length,2);
 const left=boxes[0].map(Number),right=boxes[1].map(Number);
 assert.equal(left[1]+left[3],right[1],'squares remain touching');
 const center=optsCaptured[0].opts.padding.left+(420-optsCaptured[0].opts.padding.left-optsCaptured[0].opts.padding.right)/2;
 const central=[...svg.innerHTML.matchAll(/<line class="el-duel-zero-axis" x1="([\d.]+)"/g)];
 assert.equal(central.length,1);
 assert.ok(Math.abs(Number(central[0][1])-center)<1,'dashed zero axis remains centered');
 const currentLabel=[...svg.innerHTML.matchAll(/<text class="el-btc-current-center" x="([\d.]+)" y="([\d.]+)"/g)];
 assert.equal(currentLabel.length,1,'current BTC price appears once, inside chart SVG');
 assert.ok(Math.abs(Number(currentLabel[0][1])-center)<.5,
   'BTC price must align exactly with fixed dashed axis, not the whole container');
 assert.ok(Number(currentLabel[0][2])>optsCaptured[0].opts.padding.top,
   'BTC label is inside upper plot, not a new row');
 const shown=82531.3.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})+' $';
 assert.ok(svg.innerHTML.includes('BTC <tspan id="elastic-current-btc-value">'+shown+'</tspan>'),
   'absolute price is sourced from the separate current OKX feed, not 3m delta');
 const html=ctx.window.renderElasticObserverV05({elasticObserverShadow:x});
 const metrics=html.split('class="el-duel-metrics">')[1].split('class="el-duel-volumes"')[0];
 assert.ok(metrics.includes('PM Live'),'PM Live remains in original conversion metrics');
 assert.ok(metrics.includes('PM3 ')&&metrics.includes('PM5 '));
 assert.ok(!svg.innerHTML.includes('PM Live '),
   'PM Live is no longer incorrectly labeled as current BTC quote');
 assert.ok(html.includes('Δ PRIX BTC +30.0 $ · 3m'),'bottom label means a displacement');
 assert.ok(html.includes('pas le cours actuel'),'displacement is not the actual BTC quotation');
 assert.ok(right[1]>center+10,'positive BTC displacement moves both squares right');
 assert.ok(left[3]>90&&right[3]>125,'squares are still large');
 assert.ok(left[3]+right[3]>220,'combined duel occupies substantial chart width');
 assert.ok(svg.innerHTML.includes('class="el-duel-movement"'));
 assert.equal(priceEl.textContent,'Δ PRIX BTC +30.0 $ · 3m');
 assert.ok(!svg.innerHTML.includes('el-pm3-trace'),'blue PM3 path removed');
 assert.ok(!svg.innerHTML.includes('el-pm3-scale'),'right-hand PM3 axis removed');
 assert.ok(!svg.innerHTML.includes('PM3 $'),'no PM3 caption in chart');
 assert.ok(axis.innerHTML.includes('82'),'BTC candles still have left price axis');
 x.conversion.pm3=-90;
 await ctx.window.loadElasticChart3m({elasticObserverShadow:x});
 const next=[...svg.innerHTML.matchAll(/<rect class="el-conversion-square" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
 assert.equal(next[0][1],boxes[0][1]);
 assert.equal(next[0][2],boxes[0][2],'changing PM3 does not move squares vertically');
 x.effort.priceNetUsd=-30;
 await ctx.window.loadElasticChart3m({elasticObserverShadow:x});
 const reversed=[...svg.innerHTML.matchAll(/<rect class="el-conversion-square" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
 assert.ok(Number(reversed[1][1])<center-10,'negative BTC displacement shifts both left');
 assert.equal(reversed[0][2],boxes[0][2],'direction reversal does not alter box heights');
 assert.equal(reversed[0][3],boxes[0][3],'direction reversal does not alter effort sizes');
 assert.equal(priceEl.textContent,'Δ PRIX BTC -30.0 $ · 3m');
 assert.ok(priceEl.className.includes('el-down'));
 // A new quote updates only the text, not the candle graph / duel geometry.
 const beforeQuoteUpdate=svg.innerHTML;
 ctx.window.updateElasticCurrentPrice(82670.1,T+500,'OKX live');
 const second=82670.1.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})+' $';
 assert.equal(btcLabel.textContent,second,'same OKX live trade feed updates quote');
 assert.equal(svg.innerHTML,beforeQuoteUpdate,'price update must not rerender squares');
 const quoteSource=82531.3.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})+' $';
 assert.ok(beforeQuoteUpdate.includes(quoteSource));
 x.conversion.pmLive=37.5;
 await ctx.window.loadElasticChart3m({elasticObserverShadow:x});
 const nowRect=[...svg.innerHTML.matchAll(/<rect class="el-conversion-square" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
 assert.equal(nowRect[0][1],reversed[0][1],'PM Live never translates cubes');
 assert.ok(svg.innerHTML.includes('BTC <tspan id="elastic-current-btc-value">'+second+'</tspan>'));
 ctx.window.updateElasticCurrentPrice(82670.1,T-20000,'OKX live');
 assert.equal(btcLabel.textContent,'—','stale last traded price must not masquerade as live');
 ctx.window.updateElasticCurrentPrice(82670.1,T,'OKX reconnect...');
 assert.equal(btcLabel.textContent,'—','disconnected source must not display a live quote');
 ctx.window.updateElasticCurrentPrice(82679.9,T+500,'OKX live');
 assert.ok(btcLabel.textContent.includes('82679'.slice(0,2)));
 ctx.window.updateElasticCurrentPrice(82680.1,T-19000,'V5.4 live serveur');
 assert.ok(btcLabel.textContent.includes('82'),'fresh V5.4 fallback is a real quote');
 ctx.window.updateElasticCurrentPrice(82680.1,T-29000,'V5.4 live serveur');
 assert.equal(btcLabel.textContent,'—','server fallback beyond 25 seconds must expire');
 assert.equal(svg.innerHTML.includes('el-pm3-trace'),false);
 assert.equal(loading.style.display,'none');
 assert.equal(svg.attributes.viewBox,'0 0 420 268');
});
test('current BTC quote reuses the existing WebSocket and never creates a parallel feed',()=>{
 const ui=fs.readFileSync(require.resolve('../../modules/elastic-observer-ui.js'),'utf8');
 const app=fs.readFileSync(require.resolve('../../modules/config-server.js'),'utf8');
 assert.ok(ui.includes('window.updateElasticCurrentPrice=function(price,ts,status)'));
 assert.ok(app.includes('window.updateElasticCurrentPrice(good?v3UiPrice.price:null,'));
 assert.ok(app.includes("good?(v3UiPrice.source==='OKX_WS'?'OKX live':'V5.4 live serveur')"),
   'Elastic must receive only verified recent prices, including current V5.4 server fallback');
 assert.equal((ui.match(/new WebSocket\(/g)||[]).length,0,
   'Elastic shares the existing BTC-USDT-SWAP WebSocket');
 assert.ok(ui.includes('CURRENT_QUOTE_MAX_AGE_MS=15000'));
 assert.ok(app.includes("channel:'trades',instId:'BTC-USDT-SWAP'"));
});
test('chronology stays collapsed without fetching and fetches paginated events when opened',async()=>{
 const src=fs.readFileSync(require.resolve('../../modules/elastic-observer-ui.js'),'utf8');
 const details={open:false},output={innerHTML:'',scrollTop:0},hours={value:'6'},family={value:''},more={hidden:true};
 const nodes={'elastic-chronology':details,'elastic-history':output,'elastic-history-hours':hours,
  'elastic-history-family':family,'elastic-history-more':more};
 const requests=[],now=Date.now();
 const ctx={window:{},document:{getElementById:id=>nodes[id]||null},
  fetch:async url=>{
    requests.push(url);
    const page=requests.length===1?[
      {id:2,observedAt:now-2000,type:'CONFIRMED',family:'MCB3',key:'E3',current:{type:'DN',sourceTs:now-3000},price:82000},
      {id:3,observedAt:now-1000,type:'TRANSITION',family:'CONVERSION',key:'CONVERSION',previous:{quality:'SILENT'},current:{quality:'EASY'},price:82020}]:[
      {id:1,observedAt:now-3000,type:'OBSERVED',family:'MCB15',key:'E15',current:{type:'UP',sourceTs:now-5000},price:81950}];
    return {ok:true,json:async()=>({events:page,hasMore:requests.length===1,nextBeforeId:page[0].id,
      totalInWindow:3})};
  }};
 vm.runInNewContext(src,ctx);
 const html=ctx.window.renderElasticObserverV05({elasticObserverShadow:ev(f())});
 assert.ok(html.includes('<details id="elastic-chronology"'));
 assert.ok(!html.includes('<details id="elastic-chronology" class="el-chronology" open'));
 ctx.window.loadElasticObserverHistory();
 assert.equal(requests.length,0);
 details.open=true;details.ontoggle();
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(requests.length,1);
 assert.ok(output.innerHTML.includes('TRANSITION'));
 assert.equal(more.hidden,false);
 more.onclick();await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(requests.length,2);
 assert.ok(requests[1].includes('beforeId=2'));
 assert.ok(output.innerHTML.includes('MCB15'));
 assert.equal(more.hidden,true);
 details.open=false;details.ontoggle();
 assert.equal(ctx.window.elasticHistoryState.open,false);
 const closedHtml=ctx.window.renderElasticObserverV05({elasticObserverShadow:ev(f())});
 assert.ok(!closedHtml.includes('<details id="elastic-chronology" class="el-chronology" open'));
});

test('thesis chain retains initial observation times and tracks conditions lighting in any order',()=>{
 const a=ev(f(10000000));
 const short=a.thesisChain;
 assert.equal(short.direction,'short');
 assert.equal(short.decisionImpact,false);
 assert.ok(short.supports.some(x=>x.label==='PM Live'));
 assert.ok(short.supports.some(x=>x.label==='PM3'));
 assert.ok(short.opposes.some(x=>x.label.startsWith('LBW')));
 assert.ok(!short.supports.some(x=>x.label.includes('TICKER')),'ticker is not the thesis chain');
 const b=ev(f(10030000),a);
 assert.equal(b.thesisChain.supports.find(x=>x.label==='PM Live').observedAt,10000000);
 const p=f(10060000);p.sources.auditRows[0].priceMove=21;
 const c=ev(p,b);
 assert.ok(!c.thesisChain.supports.some(x=>x.label==='PM Live'));
 assert.ok(c.thesisChain.opposes.some(x=>x.label==='PM Live'));
 const dd=ev(f(10090000),c);
 assert.equal(dd.thesisChain.supports.find(x=>x.label==='PM Live').observedAt,10090000);
 assert.ok(dd.thesisChain.supports.every((x,i,a)=>i===0||a[i-1].observedAt<=x.observedAt));
});
test('mobile width at desktop, two distinct bubbles and graduated plot',()=>{
 const ui=fs.readFileSync(require.resolve('../../modules/elastic-observer-ui.js'),'utf8');
 const style=fs.readFileSync(require.resolve('../../modules/config-server.js'),'utf8');
 assert.ok(style.includes('body:has(#tab2-statev2.active) .page-wrap { max-width: 480px; }'));
 assert.ok(style.includes('.el-grid{display:block'));
 assert.ok(style.includes('border-bottom:1px solid #e6e9ec'));
 const c={window:{},document:{}};vm.runInNewContext(ui,c);
 const snap=ev(f());snap.effort={available:true,buyBtc:2,sellBtc:1,
   priceNetUsd:25,priceRangeUsd:100,sampleCount:100};
 const html=c.window.renderElasticObserverV05({elasticObserverShadow:snap});
 assert.equal((html.match(/class="el-wrap /g)||[]).length,2);
 assert.ok(html.includes('el-list-bubble'));
 assert.ok(html.includes('el-duel-bubble'));
 assert.ok(html.indexOf('el-duel-bubble')<html.indexOf('el-list-bubble'),
  'Conversion chart immediately follows V5.3 and precedes the Elastic evidence list');
 assert.ok(html.includes('el-duel-metrics'));
 assert.ok(html.includes('eff3'));
 assert.ok(html.includes('id="elastic-price-candles"'));
 assert.ok(html.includes('id="elastic-conversion-overlay"'));
 assert.ok(html.includes('BTC · axe gauche')&&html.includes('Surfaces · volume acheteurs / vendeurs'));
 assert.ok(html.includes('PRIX'));
 assert.ok(html.includes('CHAÎNE DE THÈSE'));
 assert.ok(!html.includes('CONVICTION / ticker'));
 assert.ok(!html.includes('Les carrés restent accolés'));
 assert.ok(!html.includes('class="el-price-trail"'));
});

test('Waves OHLC 3m remains the price source while duel is independently centered without a PM3 trace',()=>{
 const ui=fs.readFileSync(require.resolve('../../modules/elastic-observer-ui.js'),'utf8');
 const server=fs.readFileSync(require.resolve('../../modules/config-server.js'),'utf8');
 assert.ok(server.includes("app.get('/api/elastic-chart-3m'"));
 assert.ok(server.includes("waveUiPriceSeries('3m',t0-180000,now)"),'must reuse Waves 3m candle source');
 assert.ok(server.includes("version:'elastic-wave-3m-overlay-v0.2'"));
 assert.ok(server.includes("priceAxis:'BTC_USD'"));
 assert.ok(!server.includes("const conversion=[]"),'server does not calculate unused PM3 line');
 assert.ok(ui.includes('window.BoonoCharts.drawPrice(canvas,candles'));
 assert.ok(ui.includes("theme:'interface'"));
 assert.ok(ui.includes('const cx=pad.left+plotW/2,cy=pad.top+plotH/2'));
 assert.ok(ui.includes('const maxSide=Math.min(plotW*.365,plotH*.73,150)'));
 assert.ok(ui.includes('class="el-duel-zero-axis"'));
 assert.ok(ui.includes('priceShift/priceRange'));
 assert.ok(!ui.includes('const ypm=v=>'));
 assert.ok(!ui.includes('class="el-pm3-trace"'));
 assert.ok(ui.includes('class="el-conversion-square"'));
 assert.ok(!ui.includes('priceTrailAxes'),'old rotated price trace should be unused');
});
test('price overlay with sparse or unavailable ticks falls back without synthetic price path',()=>{
 const src=fs.readFileSync(require.resolve('../../modules/elastic-observer-ui.js'),'utf8');
 const ctx={window:{},document:{}};vm.runInNewContext(src,ctx);
 const obs=ev(f());
 assert.equal(obs.effort.available,false);
 let html=ctx.window.renderElasticObserverV05({elasticObserverShadow:obs});
 assert.ok(!html.includes('class="el-price-trail"'));
 obs.effort={available:true,buyBtc:1,sellBtc:1,priceNetUsd:0,priceRangeUsd:1,priceTrail:[],sampleCount:2};
 html=ctx.window.renderElasticObserverV05({elasticObserverShadow:obs});
 assert.ok(!html.includes('class="el-price-trail"'));
 assert.ok(!html.includes('NaN')&&!html.includes('undefined'));
});

test('BTC volumes appear INSIDE both semi-transparent moving squares, including compact cases',async()=>{
 const src=fs.readFileSync(require.resolve('../../modules/elastic-observer-ui.js'),'utf8');
 const T=Date.now(),canvas={getBoundingClientRect:()=>({width:420,height:268})};
 const svg={innerHTML:'',setAttribute(){}},axis={innerHTML:''},loading={style:{}};
 const priceEl={textContent:'',className:''};
 const nodes={'elastic-price-candles':canvas,'elastic-conversion-overlay':svg,
   'elastic-price-axis':axis,'elastic-chart-loading':loading,'elastic-duel-price':priceEl};
 const ctx={window:{BoonoCharts:{
   drawPrice:(c,r,o)=>({bounds:{lo:82000,hi:83000},padding:o.padding,
     plotWidth:420-o.padding.left-o.padding.right,plotHeight:268-o.padding.top-o.padding.bottom}),
   mapPrice:(v,b,t,h)=>t+(b.hi-v)/(b.hi-b.lo)*h
 }},document:{getElementById:id=>nodes[id]},fetch:async()=>({ok:true,json:async()=>({
   period:{to:T},candles:[{ts:T-360000,open:82500,high:82600,low:82450,close:82580},
   {ts:T-180000,open:82580,high:82680,low:82560,close:82650}]})})};
 vm.runInNewContext(src,ctx);
 const snap=ev(f());snap.effort={available:true,buyBtc:115.4804,
   sellBtc:45.3172,priceNetUsd:73.2,priceRangeUsd:99.1,sampleCount:2000};
 ctx.window.elasticConversionV541={snapshot:()=>({...snap,status:'LIVE_3M',
  coverageSeconds:180})};
 await ctx.window.loadElasticChart3m({elasticObserverShadow:snap});
 assert.equal((svg.innerHTML.match(/class="el-volume-amount"/g)||[]).length,2);
 assert.ok(svg.innerHTML.includes('115.480 BTC'));
 assert.ok(svg.innerHTML.includes('45.317 BTC'));
 assert.ok(svg.innerHTML.includes('ACHAT : 115.480 BTC initiateurs'));
 assert.ok(svg.innerHTML.includes('VENTE : 45.317 BTC initiateurs'));
 assert.equal((svg.innerHTML.match(/class="el-volume-label-back"/g)||[]).length,0);
 assert.equal((svg.innerHTML.match(/class="el-volume-side"/g)||[]).length,0);
 assert.ok(!svg.innerHTML.includes('fill="#fff" fill-opacity=".80"'));
 assert.equal((svg.innerHTML.match(/font-weight="900"/g)||[]).length,2);
 assert.equal((svg.innerHTML.match(/fill-opacity="1"/g)||[]).length,2);
 assert.ok(svg.innerHTML.includes('fill="#16804b" fill-opacity="1"'));
 assert.ok(svg.innerHTML.includes('fill="#bf4149" fill-opacity="1"'));
 const header=ctx.window.renderElasticObserverV05({elasticObserverShadow:snap});
 assert.ok(header.includes('ACHAT 115.480 BTC'));
 assert.ok(header.includes('VENTE 45.317 BTC'));
 const groups=[...svg.innerHTML.matchAll(/<g class="el-conversion-camp">([\s\S]*?)<\/g>/g)];
 assert.equal(groups.length,2);
 for(const g of groups){
   const s=g[1],rect=s.match(/class="el-conversion-square" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
   const label=s.match(/class="el-volume-amount" x="([\d.]+)" y="([\d.]+)"/);
   assert.ok(rect&&label);
   const [x,y,w,h]=rect.slice(1).map(Number),[tx,ty]=label.slice(1).map(Number);
   assert.ok(tx>x&&tx<x+w&&ty>y&&ty<y+h,'label centered inside its own square');
 }
 assert.ok(svg.innerHTML.includes('el-duel-zero-axis'));
 assert.ok(svg.innerHTML.includes('el-duel-movement'));
 assert.equal(priceEl.textContent,'Δ PRIX BTC +73.2 $ · 3m');
 snap.effort.buyBtc=.004;
 snap.effort.sellBtc=100;
 await ctx.window.loadElasticChart3m({elasticObserverShadow:snap});
 assert.ok(svg.innerHTML.includes('0.0040'),'tiny volume not misleadingly rounded to zero');
 assert.ok(svg.innerHTML.includes('textLength='),'narrow square text fit is explicitly constrained');
 assert.ok(svg.innerHTML.includes('100.000 BTC'));
 assert.ok(svg.innerHTML.includes('BTC initiateurs sur 3m'));
});
