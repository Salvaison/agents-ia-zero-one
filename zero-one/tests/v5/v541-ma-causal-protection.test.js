'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fixed=require('./fixtures/v541-trade66-ma-asof-20261026.json');
const v541=require('../../modules/v5/decision-v541');
const maMemory=require('../../modules/v5/ma-polarity-memory-v541');
function asOf(name,position){
 const c=fixed.cases.find(x=>x.name===name);assert.ok(c);
 const samples=fixed.samples.filter(x=>x.ts<=c.now).slice(-450);
 assert.ok(samples.length&&c.now-samples.at(-1).ts<65000);
 const i={now:c.now,price:c.price,samples,
  bars3:fixed.bars3,bars15:fixed.bars15,
  bars1h:fixed.bars1h,bars4h:fixed.bars4h,
  causalEvents:fixed.causalEvents.filter(x=>x.observedAt<=c.now),
  native15Events:fixed.causalEvents.filter(x=>x.observedAt<=c.now&&
   x.family==='MCB15'&&x.key==='E15'),
  liveMa3:null,liveMa15:null,levels:[],health:true,
  sourceAgeMs:c.now-samples.at(-1).ts,tickAgeMs:100,
  startedAt:fixed.startedAt,position:position?fixed.position:null};
 return v541.evaluate(i);
}
test('#66 as-of entry is deferred at UNRESOLVED MA3 even with another defended price level',()=>{
 const d=asOf('ENTRY_22_36_41',false),m=d.readings.maContract;
 assert.equal(d.quality,'DATA_OK');
 assert.equal(m.ma3.state,'TEST_PENDING');
 assert.equal(m.entryGate.reason,'WAIT_3M_TEST_PENDING');
 assert.equal(d.action,'WAIT');
 assert.equal(d.reason,'WAIT_3M_TEST_PENDING');
 assert.equal(d.checks.maTestResolved,false);
 assert.equal(d.brokerOrdersEnabled,false);
});
test('#66 held legacy position has an earlier causal exit with MA3 rejected + both MF adverse + opposite PRICE defended',()=>{
 const d=asOf('MA_REJECTION_22_59_50',true),p=d.readings.structural54.positionReview;
 assert.equal(d.quality,'DATA_OK');
 assert.equal(d.readings.maContract.ma3.state,'REJECTED');
 assert.equal(p.ma3RejectedSinceEntry,true);
 assert.equal(p.mfAdverse,true);
 assert.equal(p.defendedOpposition,true);
 assert.equal(d.action,'EXIT_LONG');
 assert.equal(d.reason,'V541_CONFIRMED_MA3_FAILURE_WITH_MF_PRICE');
 assert.equal(d.readings.structural54.director,'long','exit the position, not the structural campaign');
 assert.equal(d.brokerOrdersEnabled,false);
});
test('MA rejection before a position opened cannot retroactively become its exit',()=>{
 const old=fixed.position.entryAt;
 try{
  fixed.position.entryAt=Date.parse('2026-10-26T21:58:50Z');
  const d=asOf('MA_REJECTION_22_59_50',true);
  assert.equal(d.readings.structural54.positionReview.ma3RejectedSinceEntry,false);
  assert.notEqual(d.reason,'V541_CONFIRMED_MA3_FAILURE_WITH_MF_PRICE');
 }finally{fixed.position.entryAt=old;}
});
test('Retest COUNTER changes neither admission nor exit decisions',()=>{
 const original=maMemory.inspect;
 try{
  const baseline=[asOf('ENTRY_22_36_41',false),asOf('MA_REJECTION_22_59_50',true)]
    .map(x=>[x.action,x.reason]);
  maMemory.inspect=(tf,rows,now)=>({
   ...original(tf,rows,now),retestsSinceChange:99999,
   countIsPartial:false});
  const modified=[asOf('ENTRY_22_36_41',false),asOf('MA_REJECTION_22_59_50',true)]
    .map(x=>[x.action,x.reason]);
  assert.deepEqual(modified,baseline);
 }finally{maMemory.inspect=original;}
});
