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
 for(const label of ['MCB 15','MCB 3','FLOW','MA','CONVERSION','BOUNDARY','CONTEXT','CHRONOLOGIE','6 h','24 h','48 h','Duel']){
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
test('tug-of-war squares remain touching, prices shift both regardless of effort sizes',()=>{
 const uiCode=fs.readFileSync(require.resolve('../../modules/elastic-observer-ui.js'),'utf8');
 const context={window:{},document:{},fetch:async()=>({ok:true,json:async()=>({events:[]})})};
 vm.runInNewContext(uiCode,context);
 const a=ev(f());a.lastEvent={observedAt:10000000,family:'MCB15',key:'E15',type:'CONFIRMED'};
 a.effort={available:true,buyBtc:.2,sellBtc:5,priceNetUsd:22,priceRangeUsd:50,sampleCount:3};
 const h=context.window.renderElasticObserverV05({elasticObserverShadow:a});
 const rs=[...h.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
 assert.equal(rs.length,2);
 const x=Number(rs[0][1]),side=Number(rs[0][3]),right=Number(rs[1][1]);
 assert.equal(x+side,right);
 assert.ok(right>180,'positive price moves both boxes right despite larger selling square');
 assert.ok(Number(rs[1][3])>side);
 assert.ok(h.includes('MCB15 / E15'));
 assert.ok(h.includes('CONVICTION / ticker'));
 assert.ok(h.includes('PM Live'));
 a.effort.priceNetUsd=-22;
 const h2=context.window.renderElasticObserverV05({elasticObserverShadow:a});
 const rs2=[...h2.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
 assert.ok(Number(rs2[1][1])<180);
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
