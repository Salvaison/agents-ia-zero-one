'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const ticker=require('../../modules/attention/v494-elastic-ticker');
const pure=require('../../modules/attention/v494-elastic-shadow');
const H=30000,BASE=1793367000000;
function sample(at,quality='EASY',direction='long',other={}){
 return {at,price:80000+(at-BASE)/H,quality,direction,
  marketState:'DIRECTIONAL',travelState:'EASY_TRAVEL',
  phaseHypothesis:'PRODUCTIVE',yieldVsP75:1.3,effortVsP75:.6,
  flowBtcPerSec:.75,cadence:15,pmLive:3,pm3:17,pm5:12,
  efficiency3m:.5,lastE3Ts:BASE-1000,lastE15Ts:BASE-2000,...other};
}
const series=(n,fn=(i)=>({}))=>Array.from({length:n},(_,i)=>
 sample(BASE+(i+1)*H,'EASY','long',fn(i)));
test('four quarter bars cover precisely one observed hour, last candle closed on exact boundary',()=>{
 const rows=series(120),snap=ticker.snapshot(rows,BASE+120*H);
 assert.equal(snap.buckets.length,4);
 for(const b of snap.buckets){
  assert.equal(b.partial,false);assert.equal(b.samples,30);
  assert.equal(b.coverageFraction,1);
  assert.equal(b.meanFlowBtcPerSec,.75);
  assert.equal(b.meanYieldVsP75,1.3);
  assert.equal(b.qualityFractions.EASY,1);
  assert.equal(b.marketFractions.DIRECTIONAL,1);
  assert.equal(b.travelFractions.EASY_TRAVEL,1);
 }
 assert.equal(snap.regime.classification,'PERSISTENT_LONG');
 assert.equal(snap.regime.qualityCoverageFraction,1);
 assert.equal(ticker.corroboration(snap,'long'),'REGIME_ALIGNED');
 assert.equal(ticker.corroboration(snap,'short'),'REGIME_OPPOSED');
});
test('qualifications, market states and price-effort states are never conflated',()=>{
 const rows=series(30,i=>i<15?{
  marketState:'DIRECTIONAL',travelState:'EASY_TRAVEL'
 }:{marketState:'CHOP_SHADOW',travelState:'HIGH_EFFORT_LOW_YIELD'});
 const x=ticker.slot(rows,BASE,BASE+15*60000);
 assert.equal(x.qualityFractions.EASY,1);
 assert.equal(x.marketFractions.DIRECTIONAL,.5);
 assert.equal(x.marketFractions.CHOP_SHADOW,.5);
 assert.equal(x.travelFractions.EASY_TRAVEL,.5);
 assert.equal(x.travelFractions.HIGH_EFFORT_LOW_YIELD,.5);
 assert.equal(x.lastE3UniqueSources,1);
 assert.equal(x.lastE15UniqueSources,1);
 assert.ok(x.meanFlowBtcPerSec<1); // mean of BTC/s, never summation of overlapping windows
});
test('4x15 ticker measures true coverage and marks partially observed final quarter',()=>{
 const rows=series(70).filter(x=>x.at<=BASE+5*60000||x.at>BASE+30*60000);
 const at=BASE+35*60000;
 const snap=ticker.snapshot(rows,at);
 assert.equal(snap.buckets.at(-1).partial,true);
 assert.equal(snap.buckets.at(-1).expectedSeconds,300);
 assert.equal(snap.buckets.at(-1).coverageFraction,1);
 assert.ok(snap.regime.coverageFraction<.75);
 assert.equal(snap.regime.classification,'COVERAGE_INSUFFICIENT');
 const missing=ticker.slot(series(10),BASE,BASE+15*60000);
 assert.ok(missing.coverageFraction<.4);
});
test('stable quality but adverse market class is visible separately, no forced bias',()=>{
 const rows=series(120,i=>i>=90?{
  marketState:'LOW_EDGE_SHADOW',travelState:'HIGH_EFFORT_LOW_YIELD',
  quality:'EASY',phaseHypothesis:'EXHAUSTING',
  effortVsP75:2.1,yieldVsP75:.4
 }:{});
 const snap=ticker.snapshot(rows,BASE+120*H);
 assert.equal(snap.buckets.at(-1).latestMarketState,'LOW_EDGE_SHADOW');
 assert.equal(snap.buckets.at(-1).phaseFractions.EXHAUSTING,1);
 assert.equal(snap.buckets.at(-1).qualityFractions.EASY,1);
 assert.equal(snap.regime.classification,'PERSISTENT_LONG');
});
test('hourly regime can weaken without turning a counter-E3 into a new 15m campaign',()=>{
 const rows=series(120,i=>i>=90?{
  quality:'INEFFICIENT',phaseHypothesis:'EXHAUSTING',
  yieldVsP75:.4,effortVsP75:1.8
 }:{});
 const snap=ticker.snapshot(rows,BASE+120*H);
 assert.equal(snap.regime.classification,'WEAKENING');
 assert.equal(snap.regime.priorDirection,'long');
 assert.equal(snap.regime.recentDirection,'long');
 assert.equal(snap.regime.reliability,'COVERAGE_BASED_NOT_CALIBRATED_WIN_PROBABILITY');
 assert.equal(ticker.corroboration(snap,'long'),'WEAKENING_NOT_DIRECTIONAL_CONFIRMED');
});
test('a true recent opposite camp yields TRANSITION_UNCONFIRMED, not accepted reversal',()=>{
 const rows=series(120,i=>i>=90?{
  direction:'short',quality:'EASY'
 }:{});
 const snap=ticker.snapshot(rows,BASE+120*H);
 assert.equal(snap.regime.classification,'TRANSITION_UNCONFIRMED');
 assert.equal(ticker.corroboration(snap,'short'),'REGIME_CONTESTED');
});
test('market travel labels keep historical P75 and P95 distinctions',()=>{
 const e=(y,y95,effort)=>({ticker:{current:{yieldVsP75:y,yieldVsP95:y95,effortVsP75:effort}}});
 assert.equal(ticker.travelState(e(1.1,.8,.5)),'EASY_TRAVEL');
 assert.equal(ticker.travelState(e(2,1.1,.4)),'EXTREME_EASY_TRAVEL');
 assert.equal(ticker.travelState(e(1.2,.6,2)),'PRODUCTIVE_TRAVEL');
 assert.equal(ticker.travelState(e(2,1.2,2)),'EXTREME_PRODUCTIVE_TRAVEL');
 assert.equal(ticker.travelState(e(.4,.1,2)),'HIGH_EFFORT_LOW_YIELD');
 assert.equal(ticker.travelState(e(.5,.1,.5)),'LOW_YIELD');
 assert.equal(ticker.travelState({ticker:{current:{}}}),'UNKNOWN');
});
test('confirmed 2h range does not move after an unconfirmed live breakout',()=>{
 const bars=Array.from({length:40},(_,i)=>({ts:BASE-(40-i)*180000,
    high:80500,low:79500}));
 const r=pure.rangeFromConfirmed3m(bars,BASE,80600);
 assert.equal(r.valid,true);assert.equal(r.high,80500);
 assert.equal(r.aboveRange,true);assert.equal(r.nearUpper,false);
});
test('as-of event stores immutable 4x15 regime and later price cannot rewrite its original reading',()=>{
 const s=pure.initial(BASE);
 const r=series(120);
 for(const row of r)s.qualitySamples.push(row);
 const old=ticker.snapshot(s.qualitySamples,BASE+120*H);
 const original=ticker.corroboration(old,'long');
 const later=ticker.snapshot([
  ...r,...series(60,i=>({direction:'short',quality:'POWERFUL'}))
 ],BASE+180*H);
 assert.equal(original,'REGIME_ALIGNED');
 // The caller stores the old snapshot at signal-time; the later regime is independent.
 assert.equal(old.asOf,BASE+120*H);
 assert.equal(later.asOf,BASE+180*H);
});
