'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const memory=require('../../modules/v5/ma-polarity-memory-v541');
const ma=require('../../modules/v5/ma-contract-v531');
const {csv}=require('../../modules/v5/runner-v52');
const THREE=180000;
function bar(ts,close,low=close-2,high=close+2){
 return {ts,open:close,close,low,high,ma200:100,
  lt_blue_wave:0,blue_wave:0,money_flow:0};
}
test('MA confirmed polarity, retests counted as episodes since last confirmed flip',()=>{
 const start=Date.parse('2026-10-26T19:00:00Z');
 const values=[
  [80,78,83],[82,79,85],
  [112,101,114],[118,108,122], // two closes above, flip to ABOVE
  [125,118,127],[115,103,119], // first retest touch band 95..105
  [114,103,116], // same contact, not a second retest
  [125,116,130],[115,100,120], // another retest after departure
  [90,88,100],[87,85,92] // flip to BELOW: reset counter
 ];
 const rows=values.map((v,i)=>bar(start+i*THREE,...v));
 const pre=memory.inspect('3m',rows,start+9*THREE);
 assert.equal(pre.polarity,'ABOVE');
 assert.equal(pre.polarityChangeObserved,true);
 assert.equal(pre.retestsSinceChange,2);
 assert.equal(pre.countIsPartial,false);
 const next=memory.inspect('3m',rows,start+11*THREE);
 assert.equal(next.polarity,'BELOW');
 assert.equal(next.retestsSinceChange,0);
 assert.ok(next.polarityChangedAt>pre.polarityChangedAt);
 assert.equal(next.source,'CONFIRMED_MCB_MA200_PRICE');
});
test('MA future closed candles are invisible to historical as-of memory',()=>{
 const t=Date.parse('2026-10-26T18:00:00Z'),b=[
  bar(t,80),bar(t+THREE,82),bar(t+2*THREE,115),bar(t+3*THREE,120)
 ];
 const early=memory.inspect('3m',b,t+3*THREE);
 const late=memory.inspect('3m',b,t+4*THREE);
 assert.equal(early.polarity,'BELOW');
 assert.equal(late.polarity,'ABOVE');
 assert.ok(late.polarityChangedAt>early.coveredFrom);
});
test('Retest count is informational; MA contract outputs no trading action',()=>{
 const t=Date.parse('2026-10-26T18:00:00Z');
 const b=[bar(t,80),bar(t+THREE,82),bar(t+2*THREE,115),
  bar(t+3*THREE,120),bar(t+4*THREE,125),bar(t+5*THREE,115,100,127)];
 const m=ma.maPath({tf:'3m',raw:b,now:t+6*THREE,price:115,dir:'long'});
 assert.equal(m.polarityMemory.retestsSinceChange,1);
 assert.equal(m.decisionImpact,false);
 assert.equal(m.polarityMemory.action,undefined);
 assert.equal(m.polarityMemory.allowed,undefined);
});
test('As-of #66: tested MA was pending at admission; MA rejection came after a confirmed acceptance',()=>{
 const bars=csv('3m'),ts=s=>Date.parse('2026-10-26T'+s+'Z');
 const inAt=ts('21:36:41'),rejectedAt=ts('21:59:50');
 const pending=ma.maPath({tf:'3m',raw:bars,now:inAt,price:80112.2,dir:'long'});
 const rejected=ma.maPath({tf:'3m',raw:bars,now:rejectedAt,price:80072.5,dir:'long'});
 assert.equal(pending.state,'TEST_PENDING');
 assert.equal(rejected.state,'REJECTED');
 assert.equal(rejected.polarityMemory.lastRejection?.sideLost,'ABOVE');
 assert.ok(rejected.polarityMemory.lastRejection.at>inAt);
 assert.ok(rejected.polarityMemory.lastRejection.acceptedAt>inAt);
 const after=ma.maPath({tf:'3m',raw:bars,now:ts('22:09:10'),price:79995,dir:'long'});
 assert.equal(after.polarityMemory.lastFailedReclaim?.sideLost,'ABOVE');
 assert.ok(after.polarityMemory.lastFailedReclaim.at>rejectedAt);
});
