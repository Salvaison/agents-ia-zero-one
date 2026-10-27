'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const path=require('path');
const d=require('../../modules/v4/experiments/divergence-causal-shadow');
const a=require('../../modules/attention/evidence-adapters');
const memory=require('../../modules/attention/attention-memory');
const TF=15*60*1000;
const file=path.resolve(__dirname,'../../../data/mcb-live/mcb_15m.csv');
const rows=fs.readFileSync(file,'utf8').split(/\r?\n/).slice(1)
 .map(s=>s.split(',')).filter(r=>r.length>=8&&Number.isFinite(Date.parse(r[0])))
 .map(r=>({ts:Date.parse(r[0]),high:Number(r[2]),low:Number(r[3]),
  close:Number(r[4]),lt_blue_wave:Number(r[5]),money_flow:Number(r[7])}));
const ASOF=Date.parse('2026-10-27T12:00:00+01:00');
const before=rows.filter(r=>r.ts+TF<=ASOF-1);
const after=rows.filter(r=>r.ts+TF<=ASOF);
test('LBW15/price divergence is not available before SECOND 15m confirmation bar closes',()=>{
 assert.equal(d.developingLbw15mFromStructuralAnchor(before,'bullish'),null);
 assert.equal(a.lbw15Observations(before,ASOF-1).length,0);
});
test('05:30 -> 11:15 is a weak but causally confirmed E15 divergence candidate',()=>{
 const line=d.developingLbw15mFromStructuralAnchor(after,'bullish');
 assert.ok(line);
 assert.equal(line.kind,'REGULAR');
 assert.equal(line.subtype,'STRUCTURAL_E15_WEAK_LBW_CANDIDATE');
 assert.equal(line.status,'FORMING');
 assert.equal(line.start.extremeTs,Date.parse('2026-10-27T05:30:00+01:00'));
 assert.equal(line.end.extremeTs,Date.parse('2026-10-27T11:15:00+01:00'));
 assert.equal(line.availableAt,ASOF);
 assert.ok(Math.abs(line.strength.priceDeltaUsd-129.3)<.01);
 assert.ok(Math.abs(line.strength.lbwDelta-2.775543)<.00001);
 assert.equal(line.decisionImpact,false);
 assert.equal(line.pivotsConfirmed,true);
 assert.equal(line.confidence,'LOW_LBW_DELTA_OBSERVATIONAL_ONLY');
});
test('The Waves 15m catalog draws the weak candidate as an observation',()=>{
 const output=d.detectTimeframe(after,[],'15m');
 const line=output.lines.find(x=>x.subtype==='STRUCTURAL_E15_WEAK_LBW_CANDIDATE');
 assert.ok(line);
 assert.equal(line.start.price,79607.2);
 assert.equal(line.end.price,79477.9);
});
test('The LIVE 15m row never fabricates the second confirmation candle',()=>{
 const fakeLive={...rows.find(r=>r.ts===Date.parse('2026-10-27T11:45:00+01:00')),
  _live:true};
 assert.ok(fakeLive.ts);
 assert.equal(d.developingLbw15mFromStructuralAnchor([...before,fakeLive],'bullish'),null);
});
test('The LBW15 divergence enters V542 and V494 MEMORY without creating trading authority',()=>{
 const ev=a.lbw15Observations(after,ASOF);
 assert.equal(ev.length,1);
 assert.equal(ev[0].kind,'MCB15_LBW_DIVERGENCE');
 assert.equal(ev[0].availableAt,ASOF);
 assert.equal(ev[0].quality,'CONFIRMED_CAUSAL_EXTREMA_WEAK_LBW_DELTA');
 const s=memory.evaluate({now:ASOF,positionDirection:'long',
  campaignId:'long|E15:1793075400000',campaignDirection:'long',observations:ev});
 assert.equal(s.aligned.oscillator.lbw15Divergence.kind,'MCB15_LBW_DIVERGENCE');
 assert.equal(s.stage,'CAMPAIGN_HOLD');
 assert.equal(s.entryAllowed,null);
 assert.equal(s.exitRequested,null);
 assert.equal(s.riskOverride,false);
 assert.equal(s.brokerOrdersEnabled,false);
});
