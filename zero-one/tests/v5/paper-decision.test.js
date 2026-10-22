'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const opp=require('../../modules/v5/opportunity-engine');
const trader=require('../../modules/v5/paper-trader');
const t=1792677000000;
function mem(d='long',q='POWERFUL'){
  const samples=[];for(let i=0;i<14;i++)samples.push({ts:t-390000+i*30000,price:82000+i*12});
  return {anchor:{confirmed:{direction:'short',sourceTs:t-3600000,observedAt:t-3600000},
    live:{direction:d,sourceTs:t-90000,observedAt:t-90000}},
    observation:{ts:t,price:82156,quality:q,qualityDirection:d,pmLive:d==='long'?32:-32},
    samples,events:[{tf:'3m',kind:'NATIVE',at:t-30000,sourceTs:t-60000,
      status:'OBSERVED',direction:d}]};
}
test('V5 forms causal hypothesis with changing evidence order and no V4 authority',()=>{
 const m=mem(),h=opp.evaluate(m,{marketNow:t+30000,dataQuality:'DATA_OK'});
 assert.equal(h.ready,true);assert.equal(h.direction,'long');assert.equal(h.phase,'EARLY_EXECUTABLE_HYPOTHESIS');
 assert.ok(h.evidence.some(v=>v.includes('MCB15')));
 assert.ok(h.evidence.some(v=>v.includes('E3')));
 assert.equal(h.e3ObservedAt,t-30000);assert.equal(h.decisionImpact,false);
 assert.ok(h.entryKey);
});
test('quality informs without becoming a second veto or direction oracle',()=>{
 const m=mem('long','CONTESTED');m.observation.qualityDirection=null;
 const h=opp.evaluate(m,{marketNow:t+10000});
 assert.equal(h.ready,true);
 assert.ok(h.contradictions.some(v=>v.includes('Qualité')));
 const no3=mem();no3.events=[];assert.equal(opp.evaluate(no3,{marketNow:t+10000}).ready,false);
 const opposite=mem();opposite.observation.pmLive=-60;
 assert.equal(opp.evaluate(opposite,{marketNow:t+10000}).ready,false);
});
test('V5 paper has real entry/exit accounting but NEVER broker orders',()=>{
 const h=opp.evaluate(mem(),{marketNow:t+20000,dataQuality:'DATA_OK'});
 let s=trader.newState();s.startAt=t-40000;
 let x=trader.step(s,h,{ts:t,price:82156,enableNewEntries:true,sourceAgeMs:20000,dataQuality:'DATA_OK'});
 assert.equal(x.event.type,'ENTER');assert.equal(s.brokerOrdersEnabled,false);
 assert.equal(s.position.direction,'long');assert.equal(s.feesUsd,0.75);
 const already=trader.step(s,h,{ts:t+30000,price:82280,enableNewEntries:true,sourceAgeMs:20000,dataQuality:'DATA_OK'});
 assert.equal(already.reason,'HOLD');assert.equal(s.position.mfePriceUsd,124);
 const win=trader.step(s,h,{ts:t+60000,price:82240,enableNewEntries:true,sourceAgeMs:20000,dataQuality:'DATA_OK'});
 assert.equal(win.event.type,'EXIT');assert.equal(win.event.reason,'EXIT_GAIN_FLOOR_PAPER');
 assert.equal(s.completed,1);assert.equal(s.wins,1);
 assert.ok(s.history[0].netPnlUsd>0);assert.equal(s.history[0].feesUsd,1.5);
 assert.equal(s.position,null);
 const again=trader.step(s,h,{ts:t+90000,price:82250,enableNewEntries:true,sourceAgeMs:20000,dataQuality:'DATA_OK'});
 assert.equal(again.reason,'ENTRY_KEY_ALREADY_USED','avoid churn/reopen from same E3');
 assert.equal(s.completed,1);
});
test('on activation V5 cannot open based on historic E3 evidence',()=>{
 const h=opp.evaluate(mem(),{marketNow:t,dataQuality:'DATA_OK'});
 let s=trader.newState();s.startAt=t;
 const x=trader.step(s,h,{ts:t,price:82156,enableNewEntries:true,
  sourceAgeMs:0,dataQuality:'DATA_OK'});
 assert.equal(x.event,null);assert.equal(x.reason,'ENTRY_CHAIN_NOT_OBSERVED_SINCE_PAPER_ACTIVATION');
});
test('risk hard stop, degraded data, offline and duplicate timestamps',()=>{
 const h=opp.evaluate(mem(),{marketNow:t,dataQuality:'DATA_OK'});
 let s=trader.newState();s.startAt=t-50000;
 for(const [key,settings] of [['DATA_DEGRADED',{dataQuality:'DATA_DEGRADED'}],
  ['ENTRY_DISABLED',{enableNewEntries:false}],
  ['MARKET_NOT_FRESH',{sourceAgeMs:120000}]]){
   const args={ts:t,price:82156,enableNewEntries:true,sourceAgeMs:0,dataQuality:'DATA_OK',...settings};
   assert.equal(trader.step(s,h,args).reason,key);
   s.lastObservationAt=0;
 }
 trader.step(s,h,{ts:t,price:82156,enableNewEntries:true,sourceAgeMs:0,dataQuality:'DATA_OK'});
 assert.equal(trader.step(s,h,{ts:t,price:81656,enableNewEntries:true,sourceAgeMs:0,dataQuality:'DATA_OK'}).reason,'UNRELIABLE_OR_DUPLICATE_MARKET');
 const exit=trader.step(s,h,{ts:t+30000,price:81656,enableNewEntries:true,sourceAgeMs:0,dataQuality:'DATA_OK'});
 assert.equal(exit.event.reason,'EXIT_RISK_500_PRICE');assert.equal(s.completed,1);assert.ok(s.history[0].netPnlUsd<0);
});
