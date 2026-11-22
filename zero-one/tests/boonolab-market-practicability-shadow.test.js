'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const P=require('../modules/attention/boonolab-market-practicability-shadow');
const ROOT=path.resolve(__dirname,'..'),MIN=60000;
const t0=Date.parse('2026-11-22T12:00:00+01:00');
const parent=(dir,t,lbw=8)=>({sourceTs:t-60*MIN,
 availableAt:t,lbw,bw:0,mf:0,signal:dir,price:60000});
function noisy({seconds=30000,bias=0}={}){
 const a=[];
 // 130 history ticks from 65 min before t0 to t0:
 for(let i=0;i<130;i++){
  const at=t0-(129-i)*seconds;
  const q=i%2?1:-1,up15=i%10<5?1:-1,up3=i%4<2?1:-1;
  a.push({ts:at,lastPrice:60000+(i%2?20:-20)+
    (i>=110?bias*(i-110):0),
   live15LbwRaw:up15*(1+0.1*(i%3)),
   live15BwRaw:0,liveLbw:up3*4,liveBw:0,
   live15MfRaw:0.1,volumeFenetreBtc:10,winSec:30});
 }
 return a;
}
test('three hypotheses are SHADOW_ONLY, no POLICY import, no broker or fills',()=>{
 const c=fs.readFileSync(path.join(ROOT,'modules/attention/boonolab-market-practicability-shadow.js'),'utf8');
 assert.equal(P.VERSION,'boonolab-market-practicability-geometry-shadow-v0.1');
 assert.equal(Object.keys(P.VARIANTS).length,3);
 for(const fragment of ['modules/v553/decision','paper.step(','broker.place','openOrder(','closeOrder('])
  assert.equal(c.includes(fragment),false,fragment);
 const state=P.initial(t0),s=P.summary(state);
 assert.equal(s.decisionImpact,false);
 assert.equal(s.brokerOrdersEnabled,false);
});
test('zero lookahead, future E1/E4 and Bâton rows do not enter the past',()=>{
 const a=noisy(),pars1=[parent('long',t0-2*MIN),
  parent('short',t0+4*MIN)],
 pars4=[parent('long',t0-2*MIN),
  parent('short',t0+4*MIN)];
 const x=P.evaluate({audit:a,asOf:t0,bars1h:pars1,bars4h:pars4});
 const y=P.evaluate({audit:[...a,{...a.at(-1),ts:t0+MIN,
   lastPrice:180000,live15LbwRaw:999}],
  asOf:t0,bars1h:pars1,bars4h:pars4});
 assert.deepEqual(y.proposed,x.proposed);
 assert.deepEqual(y.measurements,x.measurements);
 assert.equal(x.higher.e1.direction,'long');
 assert.equal(x.higher.e4.direction,'long');
 assert.equal(x.decisionImpact,false);
 assert.equal(x.brokerOrdersEnabled,false);
});
test('experimental chirping geometry and failed price conversion are measured',()=>{
 const r=P.evaluate({audit:noisy(),asOf:t0,
  bars1h:[parent('long',t0-MIN)],
  bars4h:[parent('long',t0-MIN)]});
 assert.equal(r.coverage.ready,true);
 assert.ok(r.measurements.recent30m.flip15>=3);
 assert.ok(r.measurements.recent30m.flip3>=7);
 assert.ok(r.measurements.recent30m.absGap15Median<=5);
 assert.ok(r.measurements.recent30m.efficiency<=.05);
 assert.equal(r.proposed.STRICT_3_FAMILIES.geometry,true);
 assert.equal(r.proposed.STRICT_3_FAMILIES.economy,true);
 assert.equal(r.higher.slowDir,'long');
 assert.equal(r.higher.direction,'short');
 assert.equal(r.higher.parentOpposition,true);
 assert.equal(r.proposed.STRICT_3_FAMILIES.proposedClosed,true);
 assert.equal(r.proposed.GEOMETRY_OR_SLOW.proposedClosed,true);
});
test('unavailable as-of market data is not falsely counted as a closed market',()=>{
 const rows=noisy().slice(-6);
 const x=P.evaluate({audit:rows,asOf:t0,
  bars1h:[],bars4h:[]});
 assert.equal(x.coverage.ready,false);
 for(const v of Object.values(x.proposed)){
  assert.equal(v.rawClosed,null);
  assert.equal(v.proposedClosed,false);
 }
 const s=P.initial(t0);P.observe(s,x);
 assert.equal(s.coveredSamples,0);
 assert.equal(P.summary(s).uncoveredObservations,1);
});
test('manual BigRange levels cannot leak their current version into old timestamps',()=>{
 const a=noisy();
 const levels=[
  {token:'VAL',price:66812,label:'VAH big',groupId:1},
  {token:'POC',price:77121,label:'POC big',groupId:1},
  {token:'VAH',price:84671,label:'VAH big',groupId:1}];
 const future=P.evaluate({audit:a,asOf:t0,
  bars1h:[],bars4h:[],levels,levelsMtime:t0+5*MIN});
 const past=P.evaluate({audit:a,asOf:t0,
  bars1h:[],bars4h:[],levels,levelsMtime:t0-5*MIN});
 assert.equal(future.place,null);
 assert.ok(past.place?.big);
 assert.equal(past.place.big.outside,'BELOW_VAL');
 assert.equal(past.place.sourceAt,t0-5*MIN);
});
test('counters are covered-time denominators and reject duplicate observations',()=>{
 const a=noisy();const x=P.evaluate({audit:a,asOf:t0,
  bars1h:[parent('long',t0-MIN)],
  bars4h:[parent('long',t0-MIN)]});
 const state=P.initial(t0-2*MIN);
 assert.equal(P.observe(state,x),true);
 assert.equal(P.observe(state,x),false);
 const s=P.summary(state);
 assert.equal(s.totalObservations,1);
 assert.equal(s.coveredObservations,1);
 assert.equal(s.variants.STRICT_3_FAMILIES.proposedClosed,1);
 assert.equal(s.variants.STRICT_3_FAMILIES.percentMarketClosed,100);
});
test('prospective observer is isolated inside the existing market observer process',()=>{
 const text=fs.readFileSync(path.join(ROOT,'modules/attention/boonolab-market-observer-runner.js'),'utf8');
 assert.ok(text.includes('practicabilityTick(x)'));
 assert.ok(text.includes('try{practicabilityTick(x);}catch(e)'));
 assert.ok(text.includes("const practical=require('./boonolab-market-practicability-shadow')"));
 assert.equal(text.includes('pm2 start boonolab-practicability'),false);
});
