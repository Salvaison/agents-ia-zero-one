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
