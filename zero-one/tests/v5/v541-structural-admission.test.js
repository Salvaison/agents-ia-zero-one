'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./fixtures/v541-20261026-asof.json');
const v54=require('../../modules/v5/decision-v54');
const v541=require('../../modules/v5/decision-v541');
const evidence=require('../../modules/v5/structural-evidence-v541');
const paper=require('../../modules/v5/paper-v52');
const time=s=>Date.parse('2026-10-26T'+s+'Z');
function replay(name,extra={}){
 const c=fixture.cases.find(e=>e.label===name);
 assert.ok(c,'historical input '+name);
 const samples=fixture.samples.filter(x=>x.ts<=c.ts).slice(-450);
 const last=samples.at(-1);
 assert.ok(last&&c.ts-last.ts<=65000,'genuine available audit within 65s');
 const input={...fixture,now:c.ts,price:c.price,samples,position:null,
  startedAt:name.startsWith('trade-')?fixture.startedAtBeforeV54:fixture.activatedV54,
  sourceAgeMs:c.ts-last.ts,tickAgeMs:100,health:true,
  liveMa3:null,liveMa15:null,levels:[],...extra};
 return {input,archived:c,old:v54.evaluate(input),current:v541.evaluate(input)};
}
test('V5.4.1 uses native E15 separately from LBW geometric origin (and no future bar)',()=>{
 const {current:d,input}=replay('16:00:37'),s=d.readings.structural54;
 assert.equal(d.version,v541.VERSION);
 assert.equal(s.director,'long');
 assert.equal(s.campaignId,d.readings.causalChain.campaignId);
 assert.equal(s.structuralOrigin.originKind,'GEOMETRIC_LBW_EXTREMUM');
 assert.equal(s.structuralOrigin.sourceTs,time('13:45:00'));
 assert.equal(s.nativeE15.confirmed.direction,'long');
 assert.equal(s.nativeE15.confirmed.sourceTs,time('14:15:00'));
 assert.ok(s.nativeE15.confirmed.availableAt<=input.now);
 assert.notEqual(s.nativeE15.confirmed.sourceTs,s.structuralOrigin.sourceTs);
 assert.equal(s.nativeE3.confirmed.direction,'long');
 assert.equal(s.nativeE3.confirmed.sourceTs,time('14:36:00'));
 assert.ok(s.nativeE3.confirmed.availableAt<=input.now);
 assert.equal(s.mcb3.direction,'short','old geometric LBW3 remains short');
 assert.equal(s.tacticalAdmission.structural3PivotHasVeto,false);
 assert.equal(d.brokerOrdersEnabled,false);
});
test('Early cross/price break is NOT a defended MA or retest; no 15:39–15:51 premature LONG',()=>{
 for(const key of ['15:39:35','15:48:10','15:51:12']){
  const {current:d}=replay(key);
  assert.equal(d.action,'WAIT',key);
  assert.equal(d.readings.structural54.testedTerritory.validated,false,key);
  assert.equal(d.checks.verifiedTerritory,false,key);
  assert.equal(d.brokerOrdersEnabled,false);
 }
});
test('15:57 confirmed MA3 is insufficient when MF coherence is contested',()=>{
 const {current:d}=replay('15:57:12');
 assert.equal(d.action,'WAIT');
 assert.equal(d.readings.structural54.testedTerritory.validated,true);
 assert.equal(d.readings.structural54.mfQuality,'CONTESTED');
});
test('16:00 V5.4.1 admits the previously vetoed LONG, proven 3m MA and native E3',()=>{
 const {old,current:d,archived}=replay('16:00:37');
 assert.equal(archived.originalAction,'WAIT');
 assert.equal(archived.originalReason,'WAIT_NEW_TACTICAL_PRICE_EPISODE');
 assert.equal(old.action,'WAIT');
 assert.equal(d.action,'ENTER_LONG');
 assert.equal(d.reason,'V541_STRUCTURAL_CONTINUATION_REAL_TERRITORY');
 const x=d.readings.structural54;
 assert.equal(x.director,'long');
 assert.equal(x.mcb3.direction,'short');
 assert.equal(x.mcb3.cross.direction,'long');
 assert.equal(x.nativeE3.confirmed.direction,'long');
 assert.equal(x.testedTerritory.status,'CONFIRMED_MA3_ACCEPTED_AFTER_PRICE_CONTACT');
 assert.equal(x.testedTerritory.hasRealMA3Contact,true);
 assert.equal(x.mfQuality,'REINFORCING');
 assert.ok(d.invalidation.distanceUsd<500);
 assert.ok(d.invalidation.confirmedAvailableAt<=d.asOf);
 assert.equal(d.checks.mcb3GeometricPivotHasVeto,false);
 assert.equal(d.checks.entryReady,true);
});
test('16:21 a newly defended retest does not excuse a mature E3 at range edge',()=>{
 const {current:d}=replay('16:21:10');
 assert.equal(d.action,'WAIT');
 assert.equal(d.reason,'WAIT_LATE_MCB3_EXTREME_FAR_FROM_DEFENCE');
 assert.equal(d.readings.structural54.testedTerritory.status,
  'CONFIRMED_PRICE_RETEST_DEFENDED');
 const maturity=d.readings.structural54.maturityAssessment;
 assert.equal(maturity.atWaveOuterEdge,true);
 assert.equal(maturity.e3AtOuterBand,true);
 assert.equal(maturity.farFromDefendedGround,true);
 assert.equal(d.checks.tooMatureAfterExtension,true);
});
test('16:39 a new genuine defended price test can requalify an E3 in the same campaign',()=>{
 const {current:d}=replay('16:39:10');
 assert.equal(d.action,'ENTER_LONG');
 const q=d.readings.structural54;
 assert.equal(q.testedTerritory.status,'CONFIRMED_PRICE_RETEST_DEFENDED');
 assert.equal(q.testedTerritory.retest.crossedAt<q.testedTerritory.retest.retestAt,true);
 assert.ok(q.testedTerritory.retest.retestAt<q.testedTerritory.retest.heldAt);
 assert.equal(d.readings.structural54.tacticalAdmission.alignedCross,true);
 assert.ok(d.entryKey.includes('|'+d.readings.structural54.mcb3.cross.ts+'|'),
  'new E3 event renews the candidature; retained retest predates this fresh cross');
 assert.equal(d.checks.tooMatureAfterExtension,false);
});
test('Negative prior admissions are not reopened by removing the old MCB3 geometric veto',()=>{
 for(const key of ['trade-26-original-entry','trade-35-original-entry',
   'trade-36-original-entry','trade-37-original-entry','trade-42-original-entry']){
  const {current:d}=replay(key);
  assert.ok(!['ENTER_LONG','ENTER_SHORT'].includes(d.action),
   key+' should NOT become an automatic 5.4.1 admission');
  assert.equal(d.brokerOrdersEnabled,false);
 }
});
test('Future E3 bar or event cannot leak into an earlier as-of evaluation',()=>{
 const {input}=replay('15:39:35');
 const earlier=time('14:38:20');
 const base={...input,now:earlier,
  samples:input.samples.filter(s=>s.ts<=earlier)};
 const a=evidence.nativeProof(base,'MCB3',earlier);
 assert.notEqual(a.confirmed?.sourceTs,time('14:36:00'));
 const future={...base,bars3:[...base.bars3,
  {ts:time('14:45:00'),wt1_cross_up:71,
   open:80000,low:79900,high:80200,close:80100,lt_blue_wave:65}]};
 assert.deepEqual(evidence.nativeProof(future,'MCB3',earlier).confirmed,a.confirmed);
});
test('Current open V5.4 position retains exactly its original exit decision',()=>{
 const {input}=replay('16:21:10');
 const pos={direction:'short',entryPolicyVersion:v54.VERSION,
  entryAt:time('14:32:00'),entryPrice:80256.3,
  invalidationPrice:80462.3,gainFloorUsd:180,
  mfePriceUsd:325,maePriceUsd:98,entryFeeUsd:.75};
 const original=v54.evaluate({...input,position:pos});
 const newer=v541.evaluate({...input,position:pos});
 assert.equal(newer.action,original.action);
 assert.equal(newer.reason,original.reason);
 assert.equal(newer.invalidation?.price,original.invalidation?.price);
 assert.equal(newer.readings.structural54.legacyPolicyPreserved,v54.VERSION);
 assert.equal(newer.brokerOrdersEnabled,false);
});
test('V5.4 ledger migrates without changing balances, keys or the open position',()=>{
 const old=paper.initial(1000);
 old.version=paper.V54_VERSION;old.completed=61;old.wins=26;old.losses=35;
 old.realizedUsd=-79.2997;old.equityUsd=920.7003;
 old.feesUsd=92.2527;old.usedKeys=['long|111','short|222'];
 old.history=[{tradeNo:61,entryPolicyVersion:v54.VERSION,netPnlUsd:.1042}];
 old.position={direction:'short',entryAt:4567,entryPrice:80256.3,
  entryPolicyVersion:v54.VERSION,entryKey:'short|1000|short|E15:999',
  gainFloorUsd:180,invalidationPrice:80462.3,
  entryFeeUsd:.75,mfePriceUsd:240,maePriceUsd:70};
 const migrated=paper.migrate(old,6789);
 assert.equal(migrated.version,paper.VERSION);
 assert.equal(migrated.policyActivatedAt,6789);
 assert.equal(migrated.completed,61);
 assert.equal(migrated.wins,26);
 assert.equal(migrated.losses,35);
 assert.equal(migrated.equityUsd,920.7003);
 assert.equal(migrated.realizedUsd,-79.2997);
 assert.equal(migrated.feesUsd,92.2527);
 assert.deepEqual(migrated.usedKeys,old.usedKeys);
 assert.deepEqual(migrated.history,old.history);
 assert.deepEqual(migrated.position,old.position);
 assert.equal(migrated.brokerOrdersEnabled,false);
 assert.throws(()=>paper.migrate({...old,version:'CORRUPT'},6789),/MIGRATION_REFUSED/);
});
test('Native E15 may requalify a same-cycle E3 that preceded pivot confirmation',()=>{
 const crossTs=time('14:38:20'),now=time('14:42:00');
 const input={now,price:80300},cross={ts:crossTs,direction:'long'};
 const native3={confirmed:{direction:'long',
  sourceTs:time('14:36:00'),availableAt:time('14:39:00')},live:null};
 const native15={confirmed:{direction:'long',
  sourceTs:time('14:30:00'),availableAt:time('14:40:00')}};
 const territory={validated:true,availableAt:time('14:40:00'),level:80100};
 const base={input,now,dir:'long',cross,native3,native15,territory,
  parentAvailableAt:time('14:41:00'),legacyPivot3:'short'};
 const good=evidence.tacticalEpisode(base);
 assert.equal(good.allowed,true);
 assert.equal(good.requalifiedByNewE15,true);
 assert.equal(good.structural3PivotHasVeto,false);
 const bad=evidence.tacticalEpisode({...base,native15:{confirmed:{
  ...native15.confirmed,direction:'short'}}});
 assert.equal(bad.allowed,false);
 const future=evidence.tacticalEpisode({...base,native15:{confirmed:{
  ...native15.confirmed,availableAt:now+10000}}});
 assert.equal(future.allowed,false);
});
