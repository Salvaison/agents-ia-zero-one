'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const W=require('../modules/attention/boonolab-wave-geometry');
const P=require('../modules/attention/boonolab-market-practicability-shadow');
const {dataset}=require('../scripts/boonolab-practicability-shadow-replay');
const MIN=60000;
const start=Date.parse('2026-11-22T12:00:00+01:00');
const circle=(n=360)=>Array.from({length:n},(_,i)=>({
 ts:start-(n-i)*30000,
 lastPrice:61000+Math.sin(i/17)*150+i*.22,
 live15LbwRaw:Math.sin(i/35)*75,
 live15BwRaw:Math.sin((i-6)/38)*70,
 liveLbw:Math.sin(i/7)*20,liveBw:Math.sin((i-1)/7)*20,
 live15MfRaw:Math.cos(i/50)*5,
 volumeFenetreBtc:20,winSec:30
}));
test('wave geometry measures complete observed multi-hour trajectories, not last two samples',()=>{
 const a=circle(),asOf=a.at(-1).ts,g=W.compute(a,asOf);
 assert.equal(g.version,W.VERSION);
 assert.equal(g.available,true);
 assert.equal(g.completeness.fullWaveGuaranteed,false);
 assert.ok(g.completeness.observedHistoryMin>160);
 assert.ok(Number.isFinite(g.kinetics.lbwSpeed3mPerMin));
 assert.ok(Number.isFinite(g.kinetics.lbwSpeed15mPerMin));
 assert.ok(Number.isFinite(g.kinetics.gapAccelPerMin2));
 assert.ok(g.morphology.recentSegments.length>=2);
 assert.ok(g.current.observed8hLBWAmplitude>0);
 assert.equal(g.decisionImpact,false);
 assert.equal(g.brokerOrdersEnabled,false);
});
test('relative crossing angle has explicit amplitude/time calibration (not screen pixels)',()=>{
 const a=circle(); const g=W.compute(a,a.at(-1).ts);
 const m=g.kinetics.normalizedAngleNow;
 assert.equal(m.normalization.horizontalTimeMin,15);
 assert.ok(m.normalization.mcbAmplitudeRange>0);
 assert.ok(m.normalization.caveat.includes('NOT_TRADINGVIEW_PIXEL_ANGLE'));
 assert.ok(Math.abs(m.lbwAngleDeg-m.bwAngleDeg-m.relativeAngleDeg)<0.03);
});
test('historical ASOF geometry unaffected by any future Bâton rows',()=>{
 const a=circle(),at=a.at(-40).ts;
 const x=W.compute(a.filter(r=>r.ts<=at),at);
 const y=W.compute([...a,{...a.at(-1),ts:at+MIN,lastPrice:999999}],at);
 assert.deepEqual(x,y);
 assert.ok(x.completeness.lastSampleAt<=at);
 if(x.morphology.lastCross) assert.ok(x.morphology.lastCross.at<=at);
});
test('morphology history has no unjustified complete-wave claim',()=>{
 const a=circle(),g=W.compute(a,a.at(-1).ts);
 assert.equal(g.completeness.fullWaveGuaranteed,false);
 assert.ok(g.caveats.some(x=>x.includes('not guaranteed')));
 assert.equal(g.morphology.sinceLastCross?.separatedSinceCross,
  g.morphology.lastCross?.to===g.current.gapSide);
});
test('the geometry is included only in the read-only market shadow, not V553',()=>{
 const a=circle(),asOf=a.at(-1).ts,x=P.evaluate({audit:a,asOf});
 assert.equal(x.waveGeometry.version,W.VERSION);
 assert.equal(x.decisionImpact,false);
 assert.equal(x.brokerOrdersEnabled,false);
 const source=require('fs').readFileSync(require('path').resolve(__dirname,
  '../modules/v553/decision.js'),'utf8');
 assert.equal(source.includes('boonolab-wave-geometry'),false);
});
test('real data: entry as-of shape is available for historical #58 and #65',()=>{
 const all=dataset();
 for(const at of [
  Date.parse('2026-11-22T01:48:18+01:00'),
  Date.parse('2026-11-22T13:35:18+01:00')]){
  const g=W.compute(all,at);
  assert.equal(g.available,true);
  assert.ok(g.completeness.observedHistoryMin>=240);
  assert.ok(g.completeness.lastSampleAt<=at);
  assert.ok(g.morphology.lastCross?.at<=at);
 }
});
