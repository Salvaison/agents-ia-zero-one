'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const six=require('../boono-tv/market-quality-six');
const state=require('../boono-tv/tv-living-state');
const baseline=require('../knowledge/BOONOLAB_PM_dissonance_study_results_2026-11-07.json');
const MIN=60000,T=Date.parse('2026-11-12T14:00:00Z');
function rows(flow,productive=true){
 return Array.from({length:120},(_,i)=>{
  const price=productive?72000+i*2:72000+(i%2?40:-40);
  return {ts:T-3600000+i*30000,lastPrice:price,
   volumeFenetreBtc:flow*10,winSec:10};
 });
}
const names={LOW:'FAIBLE',MEDIUM:'MÉDIAN',HIGH:'FORT'};
test('BOONOLAB 7/11 six classes: intensity low/median/high x PRODUCTIF/IMPRODUCTIF',()=>{
 const flows={LOW:.15,MEDIUM:.36,HIGH:.90};
 for(const [g,f] of Object.entries(flows)){
  for(const productive of [true,false]){
   const v=six.evaluate(rows(f,productive),T,baseline);
   assert.equal(v.status,'EXPLORATORY',g);
   assert.equal(v.intensity,g);
   assert.equal(v.productivity,productive?'PRODUCTIF':'IMPRODUCTIF');
   assert.equal(v.label,names[g]+' '+(productive?'PRODUCTIF':'IMPRODUCTIF'));
   assert.equal(v.brokerOrdersEnabled,false);
   assert.equal(v.decisionImpact,false);
   assert.equal(v.mode,'SHADOW_ONLY');
   assert.equal(v.samples,119); // start-of-hour boundary is exclusive
   assert.equal(v.medianFlowBtcPerSecond,f);
  }
 }
});
test('Original, frozen historical boundaries 0.2262 / 0.552, no market retuning',()=>{
 const boundaries=baseline.hourly;
 assert.equal(boundaries.tentativeLowerBoundary,.2262);
 assert.equal(boundaries.tentativeUpperBoundary,.552);
 assert.equal(six.evaluate(rows(.22619),T,baseline).intensity,'LOW');
 assert.equal(six.evaluate(rows(.2262),T,baseline).intensity,'MEDIUM');
 assert.equal(six.evaluate(rows(.55199),T,baseline).intensity,'MEDIUM');
 assert.equal(six.evaluate(rows(.552),T,baseline).intensity,'HIGH');
});
test('Missing calibration, insufficient samples, last-stale, missing first hour and gaps are not extrapolated',()=>{
 const all=rows(.5);
 assert.equal(six.evaluate(all,T,null).label,null);
 assert.equal(six.evaluate(all.slice(-89),T,baseline).status,'UNAVAILABLE');
 assert.equal(six.evaluate(all.slice(11),T,baseline).reason,'AUDIT_HOUR_START_NOT_COVERED');
 assert.equal(six.evaluate(all.map(x=>({...x,ts:x.ts-4*MIN})),T,baseline).status,'UNAVAILABLE');
 assert.equal(six.evaluate(all.filter((_,i)=>i<50||i>62),T,baseline).reason,'AUDIT_HOUR_SAMPLE_GAP');
});
test('No look-ahead: future price and volume observations cannot change historical six-state classification',()=>{
 const past=rows(.9,true),future=[
  {ts:T+30000,lastPrice:999999,volumeFenetreBtc:200,winSec:1}];
 const before=six.evaluate(past,T,baseline);
 const after=six.evaluate([...past,...future],T,baseline);
 assert.deepEqual(after,before);
});
test('Market quality survives a PM3 PM5 conflict but cannot create trade authority',()=>{
 const audit=rows(.9,true);
 const paper={brokerOrdersEnabled:false,position:null,latestAnalysis:{
  version:'v5.4.3-unit',quality:'DATA_OK',asOf:T,price:74000,
  readings:{conversion:{pm3:154.5,pm5:-167.4,pmCombined:-52.2},
   structural54:{phase:'AWAIT_TACTICAL_ALIGNMENT'}}}};
 const x=state.build({paper,audit,marketSixCalibration:baseline,now:T});
 assert.equal(x.status,'DATA_RECENT');
 assert.equal(x.causal.conversion.pm3,154.5);
 assert.equal(x.causal.conversion.pm5,-167.4);
 assert.equal(x.causal.conversion.pmLive,-52.2);
 assert.equal(x.causal.conversion.quality,'CONTESTED');
 assert.equal(x.causal.conversion.marketQualitySix.label,'FORT PRODUCTIF');
 assert.equal(x.causal.conversion.marketQualitySix.decisionImpact,false);
 assert.equal(x.causal.conversion.marketQualitySix.brokerOrdersEnabled,false);
 assert.equal(x.decisionImpact,false);
});
test('Incomplete calibration or stale AUDIT never becomes a market quality certainty',()=>{
 const a=rows(.3,true),good=six.evaluate(a,T,baseline);
 assert.equal(good.status,'EXPLORATORY');
 const bad=six.evaluate(a.slice(0,-7),T,baseline);
 assert.equal(bad.status,'UNAVAILABLE');
 assert.equal(bad.label,null);
 assert.equal(six.evaluate(a,T,{study:'other',hourly:baseline.hourly}).status,'UNAVAILABLE');
});
