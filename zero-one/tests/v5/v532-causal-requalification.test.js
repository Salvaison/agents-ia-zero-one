'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./fixtures/2026-10-25-1541-requalification.json');
const policy=require('../../modules/v5/decision-v532');
const previous=require('../../modules/v5/decision-v531');
const proof=require('../../modules/v5/requalification-v532');
const T=str=>Date.parse('2026-10-25T'+str+'Z');
function replay(clock,mod={}){
 const now=T(clock),audit=fixture.rows.filter(r=>r.ts<=now),
  last=audit.at(-1);
 if(!last)throw Error('No historical Audit as-of '+clock);
 const input={
  ...fixture,causalEvents:fixture.events,
  native15Events:fixture.events.filter(e=>e.family==='MCB15'&&
   e.key==='E15'&&['OBSERVED','CONFIRMED'].includes(e.type)),
  now,price:last.lastPrice,samples:audit,levels:[],
  tickAgeMs:0,sourceAgeMs:now-last.ts,
  startedAt:T('09:55:00'),liveMa3:null,liveMa15:null,...mod
 };
 return {input,previous:previous.evaluate(input),current:policy.evaluate(input)};
}
test('15:41 before E15 UP observed: NO hindsight early entry',()=>{
 const {previous:old,current:d}=replay('14:41:35');
 assert.equal(old.action,'WAIT');
 assert.equal(d.action,'WAIT');
 assert.equal(d.readings.e15Requalification.eligible,false);
});
test('15:41:41 E15 Live and EASY with confirmed E3 and reinforcing MF renew immature 15m phase',()=>{
 const {input,previous:old,current:d}=replay('14:41:41');
 assert.equal(old.action,'WAIT');
 assert.equal(old.reason,'ATTENDRE_POSTURE_15M_COHERENTE');
 assert.equal(d.action,'ENTER_LONG');
 assert.equal(d.reason,'E15_LIVE_MCB3_MF_PM_PRODUCTIVE_REQUALIFIES');
 assert.equal(d.phase,'MCB15_REVERSAL_FORMING_LONG');
 assert.equal(d.readings.e15Requalification.eligible,true);
 assert.equal(d.readings.e15Requalification.conversion.quality,'EASY');
 assert.equal(d.readings.e15Requalification.mfQuality,'REINFORCING');
 assert.equal(d.readings.e15Requalification.e3Confirmed,true);
 assert.equal(d.readings.e15Requalification.e15LiveCurrent,true);
 assert.equal(d.readings.e15Requalification.ma3.blocked,false);
 assert.ok(d.invalidation.confirmedAvailableAt<=input.now);
 assert.equal(d.brokerOrdersEnabled,false);
});
test('15:42:12 cross15 UP + POWERFUL conversion is sufficient with MA only approached',()=>{
 const {previous:old,current:d}=replay('14:42:12');
 assert.equal(old.action,'WAIT');
 assert.equal(d.action,'ENTER_LONG');
 assert.equal(d.reason,'MCB15_CROSS_MF_PM_PRODUCTIVE_REQUALIFIES');
 const q=d.readings.e15Requalification;
 assert.equal(q.conversion.quality,'POWERFUL');
 assert.equal(q.ma3.status,'APPROACH_UNPROVEN');
 assert.equal(q.ma3.realContactCount,0);
 assert.equal(d.readings.maContract.ma3.state,'APPROACH_UNPROVEN');
 assert.equal(d.readings.maContract.entryGate,null);
 assert.equal(d.checks.noChopOverriddenByNewProof,true);
 assert.equal(d.checks.maOnlyProvenRejection,false);
 assert.ok(q.priceTravelIn15Ranges<1);
});
test('15:42:40 conversion INEFFICIENT closes the window despite existing E15/MCB15 proof',()=>{
 const {current:d}=replay('14:42:40');
 assert.equal(d.action,'WAIT');
 assert.equal(d.readings.e15Requalification.conversion.quality,'INEFFICIENT');
 assert.equal(d.readings.e15Requalification.eligible,false);
 assert.equal(d.readings.e15Requalification.guards.marketQuality,false);
});
test('15:50 easy-price MA crossing does not itself prove a barrier or a confirmed support',()=>{
 const {current:d}=replay('14:50:15');
 assert.equal(d.readings.e15Requalification.ma3.status,'LIVE_TRAVERSAL_UNCONFIRMED');
 assert.equal(d.readings.e15Requalification.ma3.blocked,false);
 assert.equal(d.readings.maContract.ma3.state,'LIVE_TRAVERSAL_UNCONFIRMED');
 assert.equal(d.readings.maContract.entryGate,null);
 assert.equal(d.action,'WAIT','independent maturity/quality constraints still apply');
 assert.equal(d.reason,'IMPULSION_3M_MATURE_SANS_NOUVELLE_DEFENSE');
});
test('late 15:55 follow-on cannot chase old E15 merely because it once turned productive',()=>{
 const {current:d}=replay('14:55:40');
 assert.equal(d.action,'WAIT');
 assert.equal(d.readings.e15Requalification.eligible,false);
 assert.ok(d.readings.e15Requalification.priceTravelIn15Ranges>1);
});
test('actual confirmed rejection after real MA contact is able to withhold admission',()=>{
 const P=180000,now=T('14:42:12'),origin=now-3*P;
 const bar=(i,close,low,high)=>({ts:origin+i*P,ma200:80000,close,low,high});
 const input={now,price:79960,bars3:[
  bar(0,79960,79930,79980),
  bar(1,79995,79980,80025),
  bar(2,79950,79935,79980)]};
 const ma={ma:80000,toleranceUsd:24,approachUsd:48,
  inApproach:true,state:'REJECTED',distanceUsd:-40};
 const result=proof.maProof(input,ma,'long');
 assert.equal(result.status,'PROVEN_REJECTION');
 assert.equal(result.blocked,true);
 assert.ok(result.realContactCount>0);
});
test('older or newly active PAPER position keeps V5.3.1 exit authority and risk floors',()=>{
 const pos={direction:'long',entryPrice:80400,
  invalidationPrice:80000,entryAt:T('14:39:00'),
  entryFeeUsd:.75,mfePriceUsd:24,maePriceUsd:0,gainFloorUsd:0};
 for(const policyVersion of [previous.VERSION,policy.VERSION]){
  const p={...pos,entryPolicyVersion:policyVersion},
    {input}=replay('14:42:12',{position:p});
  const x=previous.evaluate({...input,position:{...p,
   entryPolicyVersion:previous.VERSION}});
  const d=policy.evaluate(input);
  assert.equal(d.action,x.action);
  assert.equal(d.reason,x.reason);
  assert.equal(d.brokerOrdersEnabled,false);
 }
});
test('new E15 after EXIT can renew consumed E3, but the SAME E15 cannot cause churn',()=>{
 const paper=require('../../modules/v5/paper-v52');
 const start=T('14:31:00'),cross=start+10000,proof1=start+25000,proof2=start+62000;
 const decision=(ts,e15)=>({
  version:policy.VERSION,action:'ENTER_LONG',candidate:'long',
  quality:'DATA_OK',phase:'MCB15_REVERSAL_FORMING_LONG',
  reason:'E15_LIVE_MCB3_MF_PM_PRODUCTIVE_REQUALIFIES',
  entryKey:'long|'+cross+'|CAMPAIGN|E15:'+e15,
  invalidation:{price:80000,reference:'CONFIRMED_3M_LOW'},
  readings:{
   geometry:{cross3:{ts:cross}},mcb15:{lbw:-20},
   conversion:{pm3:20,pm5:14},
   evidenceSincePolicy:{qualified:true},
   e15Requalification:{eligible:true,proofAt:e15}
  }
 });
 const s=paper.initial(start);
 const first=paper.step(s,decision(start+30000,proof1),{
  price:80350,ts:start+30000,sourceAgeMs:10,tickAgeMs:10});
 assert.equal(first.event.type,'ENTER_LONG');
 const exit=paper.step(s,{action:'EXIT_LONG',quality:'DATA_OK',version:policy.VERSION,
  reason:'PROVEN_INVERSION'},{
  price:80340,ts:start+40000,sourceAgeMs:10,tickAgeMs:10});
 assert.equal(exit.event.type,'EXIT_LONG');
 const reuse=paper.step(s,decision(start+45000,proof1),{
  price:80355,ts:start+45000,sourceAgeMs:10,tickAgeMs:10});
 assert.equal(reuse.event,null);
 assert.equal(reuse.reason,'CROSS_3M_ALREADY_CONSUMED');
 const fresh=paper.step(s,decision(start+65000,proof2),{
  price:80358,ts:start+65000,sourceAgeMs:10,tickAgeMs:10});
 assert.equal(fresh.event.type,'ENTER_LONG');
 assert.equal(s.brokerOrdersEnabled,false);
});
test('migration V5.3.1 PAPER to V5.3.2 preserves historical open positions/fees',()=>{
 const paper=require('../../modules/v5/paper-v52');
 const orig=paper.initial(T('09:55:00'));
 orig.version=paper.V531_VERSION;
 orig.realizedUsd=-18.7527;orig.equityUsd=981.2473;orig.completed=13;orig.feesUsd=19.8;
 orig.history=[{tradeNo:13,entryPolicyVersion:previous.VERSION,netPnlUsd:-2.3352}];
 orig.usedKeys=['long|1000|one','short|2000|two'];
 orig.position={direction:'long',entryPrice:80599.9,
  entryPolicyVersion:previous.VERSION,invalidationPrice:80464.4,
  gainFloorUsd:90,entryAt:T('14:35:00')};
 const migrated=paper.migrate(orig,T('14:44:00'));
 assert.equal(migrated.version,paper.VERSION);
 assert.equal(migrated.completed,13);
 assert.equal(migrated.realizedUsd,-18.7527);
 assert.equal(migrated.equityUsd,981.2473);
 assert.equal(migrated.feesUsd,19.8);
 assert.deepEqual(migrated.usedKeys,orig.usedKeys);
 assert.equal(migrated.position.entryPolicyVersion,previous.VERSION);
 assert.equal(migrated.position.gainFloorUsd,90);
 assert.equal(migrated.brokerOrdersEnabled,false);
});
test('interrupted E15 Live cannot masquerade as an active phase before subsequent confirmation',()=>{
 const {current:d}=replay('14:45:12');
 assert.equal(d.readings.e15Requalification.e15LiveCurrent,false);
 assert.equal(d.readings.e15Requalification.eligible,false);
 assert.equal(d.action,'WAIT');
});
test('an old E15 preceding a new E3 cross is HISTORY, not proof of a fresh admission',()=>{
 const {input,current}=replay('14:55:40');
 const evaluation={...current,readings:{...current.readings,
  geometry:{...current.readings.geometry,cross3:{
   ...current.readings.geometry.cross3,ts:T('14:55:35')}}}};
 const out=proof.evaluate(input,evaluation,'long');
 assert.equal(out.guards.newE15,false);
 assert.equal(out.proofAt,null);
 assert.equal(out.eligible,false);
});
