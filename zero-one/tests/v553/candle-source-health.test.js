'use strict';
// Regression: a newly written CSV file with OLD confirmed candle timestamps
// must never make V553 regard stale MCB as trading-grade structure.
const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../../modules/v553/source');
const D=require('../../modules/v553/decision');
const P=require('../../modules/v553/paper');
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..'),MIN=60000;
test('timestamp safety: one close interval plus actual collector tolerance',()=>{
 const asOf=Date.parse('2026-11-20T17:18:00+01:00');
 const good=S.confirmedHealth({
  m3:[{ts:asOf-3*MIN-1*MIN}],
  m15:[{ts:asOf-15*MIN-1*MIN}]},asOf);
 assert.equal(good.valid,true);
 assert.equal(good.detail.m3.ageMs,MIN);
 assert.equal(good.detail.m15.ageMs,MIN);
 const bad=S.confirmedHealth({
  m3:[{ts:asOf-3*MIN-8*MIN}],
  m15:[{ts:asOf-15*MIN-35*MIN}]},asOf);
 assert.equal(bad.valid,false);
 assert.equal(bad.detail.m3.fresh,false);
 assert.equal(bad.detail.m15.fresh,false);
 assert.equal(S.CANDLE_HEALTH,
  'v553-mcb-bar-timestamp-freshness-safety-v1');
});
test('real source is rejected when current confirmed bars are stale despite updated mtime',()=>{
 const asOf=Date.now();
 const input=S.load(asOf);
 assert.equal(input.brokerOrdersEnabled,undefined);
 assert.ok(input.confirmedHealth);
 const shouldBeFresh=['m3','m15'].every(tf=>{
  const bar=input.bars[tf].at(-1);
  const period=S.PERIOD[tf];
  return asOf-(bar.ts+period)<=period+120000;
 });
 assert.equal(input.confirmedHealth.valid,shouldBeFresh);
 assert.equal(input.healthy,
  shouldBeFresh&&!!input.current&&asOf-input.current.ts>=0&&
  asOf-input.current.ts<=65000&&
  input.bars.m3.length>=8&&input.bars.m15.length>=5);
});
test('stale MCB must not authorize a new V553 PAPER position',()=>{
 const now=Date.now(),input=S.load(now);
 const frozen=JSON.parse(JSON.stringify(input));
 frozen.healthy=false;
 frozen.confirmedHealth={version:S.CANDLE_HEALTH,valid:false,
  detail:{m3:{knownAt:now-1000000,ageMs:1000000,maxAgeMs:300000,fresh:false},
   m15:{knownAt:now-3000000,ageMs:3000000,maxAgeMs:1020000,fresh:false}}};
 const mem=D.originalMemory(now-3600000);
 const o=D.sensor(frozen,now,frozen.current?.lastPrice||59500);
 assert.equal(o.healthy,false);
 const result=D.evaluate(mem,frozen,o.price,now,null).decision;
 assert.equal(result.quality,'DATA_DEGRADED');
 assert.equal(result.market.admissionAllowed,false);
 assert.equal(result.market.status,'UNRECOGNIZED');
 assert.equal(result.action,'WAIT');
});
test('PAPER hard risk still works on an existing position when MCB source is degraded',()=>{
 const now=Date.now(),s=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v553-paper-state.json')));
 const p=s.position||{direction:'long',entryAt:now-600000,
  entryPrice:60000,lastPrice:60000,entryFeeUsd:.75,
  mfePriceUsd:80,maePriceUsd:40,
  entryPolicyVersion:'fixture',entryContext:{},campaignId:'E15-test'};
 s.position={...p,entryPrice:p.direction==='long'?62000:58000};
 const ts=Math.max(now,s.lastObservationAt+10000);
 const price=s.position.direction==='long'?61490:58510;
 const d={version:D.VERSION,brokerOrdersEnabled:false,
  asOf:ts,quality:'DATA_DEGRADED',action:'HOLD',reason:'MCB_CANDLE_STALE'};
 const res=P.step(s,d,{ts,price,tickAgeMs:100,sourceAgeMs:100});
 assert.equal(res.reason,'EXIT_PAPER');
 assert.equal(res.trade.exitReason,'V553_HARD_RISK_500_BTC_PRICE_USD');
});

test('Watch shows true closed-candle age and explicit degraded admissions',()=>{
 const source=fs.readFileSync(path.join(ROOT,'modules/config-server.js'),'utf8');
 assert.ok(source.includes('const sourceHealth=d.confirmedSourceHealth||null'));
 assert.ok(source.includes('MCB CONFIRMÉ PÉRIMÉ'));
 assert.ok(source.includes('nouvelles admissions V553 refusées'));
 assert.ok(source.includes("fetch('/api/v553-paper'"));
});
