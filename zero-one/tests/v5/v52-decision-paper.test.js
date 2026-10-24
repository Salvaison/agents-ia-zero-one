'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../../modules/v5/decision-v52');
const paper=require('../../modules/v5/paper-v52');
const MS=60000;
const start=1792842000000;
function fakeAudit(ts,price,l3=-40,b3=-38,signal=null){
 return {ts,lastPrice:price,priceMove:ts===start?5:8,
  liveLbw:l3,liveBw:b3,live15LbwRaw:-70,live15BwRaw:-65,
  liveMoneyFlow:-10,live15MfRaw:-15,
  liveSignalUp:signal,liveSignalDn:null,
  live15SignalUp:null,live15SignalDn:null};
}
test('BW/LBW3 crossing is first OBSERVED audit time, not retrospectively candle start',()=>{
 const a=[
  fakeAudit(start,80700,-41,-37),
  fakeAudit(start+30000,80703,-38,-42,-38),
  fakeAudit(start+60000,80705,-33,-40)];
 const cross=policy.geometric(a,'3m',start+60000);
 assert.equal(cross.flips45m,1);
 assert.equal(cross.last.ts,start+30000);
 assert.equal(cross.last.direction,'long');
 assert.equal(cross.last.barTs,Math.floor((start+30000)/(3*MS))*(3*MS));
 const events=policy.events(a,'3m',start+60000);
 assert.equal(events[0].firstObservedAt,start+30000);
 assert.equal(events[0].barTs,cross.last.barTs);
});
test('Last Bâton priceMove + subsequent live OKX displacement are sequential, not overlapping volume',()=>{
 const now=start+100000;
 const samples=[fakeAudit(start,80600),fakeAudit(start+30000,80608),
  fakeAudit(start+60000,80613),fakeAudit(start+90000,80620)];
 const d=policy.evaluate({samples,now,price:80626,startedAt:start,sourceAgeMs:10000,
  tickAgeMs:250,bars15:[],bars3:[],bars1h:[],bars4h:[],levels:[]});
 assert.equal(d.readings.conversion.pmLastBaton,8);
 assert.equal(d.readings.conversion.pmSinceBaton,6);
 assert.equal(d.readings.conversion.pmCombined,14);
 assert.equal(d.readings.conversion.intervalSeconds,10);
 assert.equal(d.quality,'DATA_OK');
 assert.equal(d.action,'WAIT');
});
function candidate(ts,dir='long',invalid=79800,key='long-cross'){
 return {version:policy.VERSION,action:'ENTER_'+dir.toUpperCase(),
  candidate:dir,quality:'DATA_OK',entryKey:key,prognosis:'REVERSAL_TEST',
  phase:'EXTREME_REVERSAL_CANDIDATE',reason:'CONVERSION_EXPLOITABLE',asOf:ts,
  price:80000,invalidation:{price:invalid,reference:'LOCAL_LOW'},
  readings:{geometry:{cross3:{ts:ts-500}},mcb15:{lbw:-70},place:{nearSupport:true},
   conversion:{pm3:25},economics:{room:300}}};
}
test('PAPER creates no broker order, records fees and keeps the position through opposing 3m HOLD',()=>{
 let s=paper.initial(start),d=candidate(start+1000);
 let r=paper.step(s,d,{price:80000,ts:start+1000,sourceAgeMs:100,tickAgeMs:100});
 assert.equal(r.event.type,'ENTER_LONG');
 assert.equal(s.brokerOrdersEnabled,false);
 assert.equal(s.position.direction,'long');
 assert.equal(s.feesUsd,.75);
 r=paper.step(s,{version:policy.VERSION,action:'HOLD',phase:'TACTICAL_E3_OPPOSED',
  candidate:'short',quality:'DATA_OK',reason:'TACTICAL_ONLY'},
  {price:80090,ts:start+3000,sourceAgeMs:100,tickAgeMs:100});
 assert.equal(r.event,null);
 assert.equal(s.position.direction,'long');
 assert.equal(s.position.mfePriceUsd,90);
 assert.equal(s.position.gainFloorUsd,0);
});
test('120/90 protection exits at actual observed price (no fabricated fill at +90)',()=>{
 let s=paper.initial(start),d=candidate(start+1000);
 paper.step(s,d,{price:80000,ts:start+1000,sourceAgeMs:100,tickAgeMs:100});
 paper.step(s,{action:'HOLD',version:policy.VERSION,quality:'DATA_OK'},
  {price:80130,ts:start+3000,sourceAgeMs:100,tickAgeMs:100});
 assert.equal(s.position.gainFloorUsd,90);
 const r=paper.step(s,{action:'HOLD',version:policy.VERSION,quality:'DATA_OK'},
  {price:80065,ts:start+5000,sourceAgeMs:100,tickAgeMs:100});
 assert.equal(r.event.type,'EXIT_LONG');
 assert.equal(r.event.price,80065);
 assert.equal(s.position,null);assert.equal(s.completed,1);
 assert.ok(s.realizedUsd<0.5,'fee-aware dollar P&L is not +90 BTC fictitious');
 assert.equal(s.history[0].exitPrice,80065);
 assert.equal(s.history[0].exitReason,'GAIN_FLOOR_120_90_OR_220_180');
});
test('no reentry on same crossing, no preregistration hindsight and no stale entrant',()=>{
 let s=paper.initial(start);
 const d=candidate(start+2000);
 const old=paper.step(s,candidate(start+2000,'long',79800,'old'),{price:80000,
  ts:start+2000,sourceAgeMs:100,tickAgeMs:30000});
 assert.equal(old.event,null);
 assert.equal(s.position,null);
 const enter=paper.step(s,d,{price:80000,ts:start+3000,sourceAgeMs:100,tickAgeMs:100});
 assert.equal(enter.event.type,'ENTER_LONG');
 let exit=paper.step(s,{version:policy.VERSION,action:'HOLD',phase:'TEST',quality:'DATA_OK'},
  {price:79490,ts:start+6000,sourceAgeMs:100,tickAgeMs:100});
 assert.equal(exit.event.type,'EXIT_LONG');
 const denied=paper.step(s,d,{price:79490,ts:start+7000,sourceAgeMs:100,tickAgeMs:100});
 assert.equal(denied.event,null);
 assert.equal(denied.reason,'USED_CROSS_KEY');
 const prior=paper.initial(start+9000);
 const pre=paper.step(prior,candidate(start+8500,'long',79800,'pre'),{
  price:80000,ts:start+10000,sourceAgeMs:100,tickAgeMs:100});
 assert.equal(pre.event,null);assert.equal(pre.reason,'NO_FRESH_POST_START_CROSS');
});
