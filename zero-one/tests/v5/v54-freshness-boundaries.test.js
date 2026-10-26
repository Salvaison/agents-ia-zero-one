'use strict';
// Frozen as-of 25/10 Amsterdam fixture: replay bar-opening 3m / 15m.
// V5.4 must report actual freshness, not the old V5.2 "current bar seen"
// rule, and MUST NOT admit a new trade while first sample is pending.
const test=require('node:test'),assert=require('node:assert/strict');
const f=require('./fixtures/2026-10-25-1541-requalification.json');
const v54=require('../../modules/v5/decision-v54');
const v52=require('../../modules/v5/decision-v52');
function inputAt(iso,overrides={}){
 const now=Date.parse(iso),samples=f.rows.filter(x=>x.ts<=now);
 if(!samples.length)throw Error('Fixture has no Audit before '+iso);
 const last=samples.at(-1);
 return {...f,now,price:last.lastPrice,samples,
  causalEvents:f.events,levels:[],health:true,
  startedAt:Date.parse('2026-10-25T10:00:00Z'),
  sourceAgeMs:now-last.ts,tickAgeMs:100,
  liveMa3:null,liveMa15:null,position:null,...overrides};
}
test('At exactly 3m rollover old sensor falsely says DATA_DEGRADED but V54 holds DATA_OK + WAIT',()=>{
 const x=inputAt('2026-10-25T14:42:00Z');
 assert.equal(v52.evaluate(x).quality,'DATA_DEGRADED',
  'this is the proven old bar-start check, not actual collector failure');
 const d=v54.evaluate(x),f=d.readings.structural54.sourceFreshness;
 assert.equal(d.quality,'DATA_OK');
 assert.equal(d.action,'WAIT');
 assert.equal(d.reason,'WAIT_MCB_NEW_BAR_FIRST_SNAPSHOT');
 assert.equal(d.checks.entryReady,false);
 assert.equal(f.firstNewBarSnapshotPending,true);
 assert.equal(f.current3mObserved,false);
 assert.equal(f.current15mObserved,true);
 assert.ok(f.auditAgeMs<65000);
 assert.equal(d.brokerOrdersEnabled,false);
});
test('After first actual 3m sample V54 removes pending state and no longer shows DEGRADED',()=>{
 const x=inputAt('2026-10-25T14:42:10Z'),d=v54.evaluate(x);
 assert.equal(d.quality,'DATA_OK');
 assert.equal(d.readings.structural54.sourceFreshness.firstNewBarSnapshotPending,false);
 assert.equal(d.checks.current3mObserved,true);
 assert.equal(d.checks.current15mObserved,true);
 assert.notEqual(d.reason,'STRUCTURAL_SOURCES_STALE');
 assert.equal(d.brokerOrdersEnabled,false);
});
test('At exactly joint 15m and 3m rollover current bars await first observed snapshot, no trade',()=>{
 const d=v54.evaluate(inputAt('2026-10-25T14:45:00Z'));
 assert.equal(d.quality,'DATA_OK');
 assert.equal(d.action,'WAIT');
 assert.equal(d.reason,'WAIT_MCB_NEW_BAR_FIRST_SNAPSHOT');
 assert.equal(d.checks.current3mObserved,false);
 assert.equal(d.checks.current15mObserved,false);
});
test('15m + 3m rollover becomes eligible for normal evaluation only after new sample arrives',()=>{
 const d=v54.evaluate(inputAt('2026-10-25T14:45:10Z'));
 assert.equal(d.quality,'DATA_OK');
 assert.equal(d.checks.current3mObserved,true);
 assert.equal(d.checks.current15mObserved,true);
 assert.equal(d.checks.firstNewBarSnapshotPending,false);
});
test('Real stale Audit is still a true DATA_DEGRADED with no new admission',()=>{
 const x=inputAt('2026-10-25T14:43:10Z');
 const old=x.samples.filter(r=>r.ts<=Date.parse('2026-10-25T14:41:38Z'));
 const last=old.at(-1);
 assert.ok(last);
 const d=v54.evaluate({...x,samples:old,sourceAgeMs:x.now-last.ts});
 assert.equal(d.quality,'DATA_DEGRADED');
 assert.equal(d.action,'WAIT');
 assert.equal(d.reason,'STRUCTURAL_SOURCES_STALE');
 assert.equal(d.brokerOrdersEnabled,false);
});
test('Real stale collector state overrides otherwise fresh Audit',()=>{
 const d=v54.evaluate(inputAt('2026-10-25T14:42:10Z',{health:false}));
 assert.equal(d.quality,'DATA_DEGRADED');
 assert.equal(d.action,'WAIT');
 assert.equal(d.reason,'STRUCTURAL_SOURCES_STALE');
});
test('Missing actual 15m oscillator does not get mislabeled as healthy',()=>{
 const x=inputAt('2026-10-25T14:42:10Z');
 const samples=x.samples.map((r,i)=>i===x.samples.length-1?
  {...r,live15BwRaw:null}:r);
 const d=v54.evaluate({...x,samples});
 assert.equal(d.quality,'DATA_DEGRADED');
 assert.equal(d.action,'WAIT');
});
test('No fresh price tick can authorize admission even when bar has been observed',()=>{
 const d=v54.evaluate(inputAt('2026-10-25T14:42:10Z',{tickAgeMs:50000}));
 assert.equal(d.quality,'DATA_DEGRADED');
 assert.equal(d.action,'WAIT');
});
