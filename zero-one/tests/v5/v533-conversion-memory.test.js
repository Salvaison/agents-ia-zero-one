'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./fixtures/2026-10-25-1541-requalification.json');
const previous=require('../../modules/v5/decision-v532');
const next=require('../../modules/v5/decision-v533');
const memory=require('../../modules/v5/conversion-campaign-v533');
const T=str=>Date.parse('2026-10-25T'+str+'Z');
function replay(clock,options={}){
 const now=T(clock),samples=fixture.rows.filter(x=>x.ts<=now),row=samples.at(-1);
 if(!row)throw Error('fixture missing Audit as-of '+clock);
 const events=[...fixture.events,...(options.additionalEvents||[])];
 const input={
  ...fixture,causalEvents:events,
  native15Events:events.filter(e=>e.family==='MCB15'&&
   e.key==='E15'&&['OBSERVED','CONFIRMED'].includes(e.type)),
  now,price:row.lastPrice,samples,tickAgeMs:0,sourceAgeMs:now-row.ts,
  levels:[],liveMa3:null,liveMa15:null,startedAt:T('09:55:00'),
  ...(options.position?{position:options.position}:{})
 };
 return {input,old:previous.evaluate(input),result:next.evaluate(input)};
}
function conv(at,quality,direction){
 return {family:'CONVERSION',key:'CONVERSION',type:'TRANSITION',
  observedAt:T(at),sourceTs:T(at),price:80400,quality,direction,
  detail:{pm3:70,pm5:60,pmLive:30}};
}
test('historical V5.3.2 entry remains legitimate at E15 Live EASY',()=>{
 const {old,result}=replay('14:41:41');
 assert.equal(old.action,'ENTER_LONG');
 assert.equal(result.action,'ENTER_LONG');
 assert.equal(result.readings.conversionCampaign.engaged,true);
 assert.equal(result.readings.conversionCampaign.peakQuality,'EASY');
 assert.equal(result.brokerOrdersEnabled,false);
});
test('after POWERFUL, INEFFICIENT pauses only PM ENTRY, not productive MCB15 thesis',()=>{
 const {old,result}=replay('14:42:40');
 const x=result.readings.conversionCampaign;
 assert.equal(old.action,'WAIT');
 assert.equal(old.reason,'IMPULSION_3M_MATURE_SANS_NOUVELLE_DEFENSE');
 assert.equal(result.action,'WAIT');
 assert.equal(result.reason,'WAIT_PM_RESPIRATION_MCB15_CAMPAIGN_ENGAGED');
 assert.equal(x.engaged,true);
 assert.equal(x.thesis,'MCB15_PRODUCTIVE_CAMPAIGN_ENGAGED');
 assert.equal(x.peakQuality,'POWERFUL');
 assert.equal(x.currentQuality,'INEFFICIENT');
 assert.equal(x.moment,'RESPIRATION_AFTER_PRODUCTIVE_IMPULSE');
 assert.ok(x.lastPowerfulAt>=T('14:42:10')&&x.lastPowerfulAt<T('14:42:11'));
 assert.equal(x.timing,'WAIT_PM_RESPIRATION');
 assert.equal(x.canRenewEntry,false);
 assert.equal(result.phase,old.phase,'MCB15 structural phase must not change');
});
test('CONTESTED and SILENT after POWERFUL are normal temporary states, not independent strategic reversals',()=>{
 for(const [clock,quality] of [
  ['14:44:15','SILENT'],['14:45:12','CONTESTED']]){
  const {result}=replay(clock);
  const c=result.readings.conversionCampaign;
  assert.equal(c.currentQuality,quality);
  assert.equal(c.engaged,true);
  assert.equal(c.peakQuality,'POWERFUL');
  assert.equal(c.conversionIsNotStructuralInvalidation,true);
  assert.ok(c.lastProductiveAt<=T(clock));
  assert.equal(result.action,'WAIT');
 }
});
test('same E15 phase with regained PM+MF admits despite latest label INEFFICIENT',()=>{
 const additionalEvents=[conv('14:42:11','INEFFICIENT','long')];
 const {old,result}=replay('14:42:20',{additionalEvents});
 const x=result.readings.conversionCampaign;
 assert.equal(old.action,'WAIT');
 assert.equal(old.readings.e15Requalification.conversion.quality,'INEFFICIENT');
 assert.equal(result.action,'ENTER_LONG');
 assert.equal(result.reason,'MCB15_PRODUCTIVE_CAMPAIGN_MF_PM_REQUALIFIED');
 assert.equal(x.currentQuality,'INEFFICIENT');
 assert.equal(x.peakQuality,'POWERFUL');
 assert.equal(x.canRenewEntry,true);
 assert.ok(result.entryKey.endsWith('|E15:'+result.readings.conversionCampaign.e15ProofAt));
 assert.equal(result.readings.e15Requalification.eligible,true);
 assert.equal(result.checks.requalifiedOnConversionMemory,true);
});
test('CONTESTED tag without an adverse PM/MF/price state also cannot veto an engaged campaign',()=>{
 const {old,result}=replay('14:42:20',{additionalEvents:[conv('14:42:11','CONTESTED',null)]});
 assert.equal(old.action,'WAIT');
 assert.equal(result.readings.conversionCampaign.engaged,true);
 assert.equal(result.readings.conversionCampaign.currentQuality,'CONTESTED');
 assert.equal(result.action,'ENTER_LONG');
 assert.equal(result.readings.conversionCampaign.canRenewEntry,true);
});
test('opposing POWERFUL conversion pauses admission but does not erase MCB thesis',()=>{
 const {result}=replay('14:42:20',{additionalEvents:[conv('14:42:11','POWERFUL','short')]});
 assert.equal(result.action,'WAIT');
 assert.equal(result.readings.conversionCampaign.engaged,true);
 assert.equal(result.readings.conversionCampaign.conversionAdverse,true);
 assert.equal(result.readings.conversionCampaign.canRenewEntry,false);
 assert.equal(result.readings.conversionCampaign.timing,'WAIT_OPPOSING_CONVERSION');
});
test('a confirmed opposing E15, not a mere CONTESTED conversion, invalidates the productive phase',()=>{
 const opposite={
  family:'MCB15',key:'E15',type:'CONFIRMED',direction:'short',
  observedAt:T('14:42:13'),sourceTs:T('14:30:00'),price:80380
 };
 const {result}=replay('14:42:20',{additionalEvents:[opposite]});
 const x=result.readings.conversionCampaign;
 assert.equal(x.engaged,false);
 assert.equal(x.thesis,'MCB15_OPPOSING_CONFIRMED');
 assert.equal(x.lastConfirmedOpposingE15At,T('14:42:13'));
 assert.equal(x.canRenewEntry,false);
 assert.equal(result.action,'WAIT');
});
test('later phase with mature travel cannot reuse old POWERFUL to chase',()=>{
 const {result}=replay('14:55:40');
 assert.equal(result.action,'WAIT');
 assert.equal(result.readings.conversionCampaign.engaged,true);
 assert.equal(result.readings.conversionCampaign.guards.notExhausted,false);
 assert.equal(result.readings.conversionCampaign.canRenewEntry,false);
});
test('V5.3.3 and inherited V5.3.2 positions keep exactly the V5.3.2 exit policy',()=>{
 const base={direction:'long',entryPrice:80400,invalidationPrice:80000,
  entryAt:T('14:38:00'),entryFeeUsd:.75,mfePriceUsd:20,
  maePriceUsd:0,gainFloorUsd:0};
 for(const version of [previous.VERSION,next.VERSION]){
  const pos={...base,entryPolicyVersion:version};
  const {input,result}=replay('14:42:20',{position:pos});
  const delegated={...pos,entryPolicyVersion:previous.VERSION};
  const expected=previous.evaluate({...input,position:delegated});
  assert.equal(result.action,expected.action);
  assert.equal(result.reason,expected.reason);
  assert.equal(result.brokerOrdersEnabled,false);
 }
});
