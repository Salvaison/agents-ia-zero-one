'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const state=require('../../modules/attention/v494-elastic-state-layer');
const history=require('../../modules/attention/v494-elastic-state-history');
const {appendRotatingNdjson}=require('../../modules/v3lab/storage/rotating-ndjson');
const T=1793388000000;
function makeSample(t=T,q='EASY',direction='long'){
 const evalNow={marketTimestamp:t,price:79000,
   mcb:{currentLobe:{startTs:T-900000,structuralDirection:'long',
     structuralState:'ASCENT_ACTIVE',liveZeroCross:{detected:false}}},
   ticker:{current:{ts:t}},marketQuality:{state:'DIRECTIONAL'}};
 const s={latestQuality:{quality:q,direction,pm3:20,pm5:23,pmLive:10,
     yieldVsP75:1.3,yieldVsP95:.4,effortVsP75:.5},
   lastConversion:{quality:q,direction},
   qualitySamples:[{at:t,price:79000,travelState:'EASY_TRAVEL',
     marketState:'DIRECTIONAL',phaseHypothesis:'PRODUCTIVE',
     flowBtcPerSec:.5,cadence:12,pm3:20,pm5:23,lastE3Ts:t-180000,
     lastE15Ts:t-900000,mf15Direction:'long'}],
   tickerHour:{regime:{classification:'PERSISTENT_LONG',
     coverageFraction:1,qualityCoverageFraction:1}},
   range2h:{valid:true,low:78000,high:81000,positionFraction:.33}};
 return {e:evalNow,s};
}
test('All requested state vocabularies retained, factual and experimental explicitly separate',()=>{
 const expected=['CONVERSION_QUALITY','TEMPORAL_QUALITY','EFFORT_YIELD',
 'MARKET_REGIME','CAMPAIGN_PHASE','CONVERSION_PHASE','HOUR_REGIME'];
 assert.deepEqual(state.GROUPS.map(x=>x[0]),expected);
 for(const x of ['EASY','POWERFUL','EXCEPTIONAL','CONTESTED','SILENT',
 'INEFFICIENT','PRODUCTIVE'])
  assert.ok(state.CONTRACT.CONVERSION_QUALITY.labels.includes(x));
 for(const x of ['ABSORBED','EXHAUSTED'])
  assert.ok(state.CONTRACT.TEMPORAL_QUALITY.labels.includes(x));
 for(const x of ['LOW_EDGE_SHADOW','CHOP_SHADOW','DORMANT'])
  assert.ok(state.CONTRACT.MARKET_REGIME.labels.includes(x));
 assert.ok(state.CONTRACT.CAMPAIGN_PHASE.labels.includes('ACCEPTED_REVERSAL'));
 assert.ok(state.CONTRACT.CONVERSION_PHASE.labels.includes('REACCELERATING'));
});
test('Bootstrap records all seven groups at knowledge time; no future inference',()=>{
 const {e,s}=makeSample();const x=state.extract(e,s,T);
 const r=state.observe(state.initial(),x);
 assert.equal(r.transitions.length,7);
 assert.ok(r.transitions.every(y=>y.at===T&&y.asOf===T&&
   y.transition==='BOOTSTRAP_OBSERVED'));
 assert.equal(r.state.current.CAMPAIGN_PHASE,'STRUCTURAL_BIAS');
 assert.equal(r.state.current.EFFORT_YIELD,'EASY_TRAVEL');
 assert.equal(x.measurements.passiveLiquidity,'NOT_MEASURED');
 assert.equal(x.sources.e15SourceTs,T-900000);
 assert.equal(r.state.lastSnapshot.sources.e15SourceTs,T-900000);
 assert.equal(state.observe(r.state,x).changed,false);
 assert.equal(r.state.nextSeq,7);
});
test('Attribute class/market/phase transitions independently and preserve causal parent',()=>{
 const base=makeSample(),s=state.observe(null,state.extract(base.e,base.s,T)).state;
 const next=makeSample(T+30000,'CONTESTED',null);
 next.e.marketQuality.state='CHOP_SHADOW';
 next.s.qualitySamples[0].marketState='CHOP_SHADOW';
 next.s.qualitySamples[0].travelState='HIGH_EFFORT_LOW_YIELD';
 next.s.qualitySamples[0].phaseHypothesis='BREATHING';
 next.s.lastConversion.direction=null;
 next.s.stateLayer=s;
 const r=state.observe(s,state.extract(next.e,next.s,T+30000));
 assert.deepEqual(new Set(r.transitions.map(x=>x.family)),
   new Set(['CONVERSION_QUALITY','EFFORT_YIELD','MARKET_REGIME',
    'CAMPAIGN_PHASE','CONVERSION_PHASE']));
 assert.ok(r.transitions.every(x=>x.origin&&x.from!==x.to));
 assert.equal(r.state.current.CAMPAIGN_PHASE,'CONTESTED');
 assert.equal(r.state.current.MARKET_REGIME,'CHOP_SHADOW');
 assert.ok(!r.transitions.some(x=>x.to==='ACCEPTED_REVERSAL'));
});
test('Unresolved structural regime never claims ACCEPTED_REVERSAL',()=>{
 const {e,s}=makeSample();
 e.mcb.currentLobe.structuralDirection=null;
 assert.equal(state.extract(e,s,T).states.CAMPAIGN_PHASE,'UNRESOLVED');
 e.mcb.currentLobe.structuralDirection='short';
 e.mcb.currentLobe.liveZeroCross={detected:true,confirmed:false};
 assert.equal(state.extract(e,s,T).states.CAMPAIGN_PHASE,'TRANSITION_LIVE');
});
test('Outage reinits observations as AFTER_GAP_OR_NEW, not uninterrupted state',()=>{
 const {e,s}=makeSample();
 const a=state.observe(null,state.extract(e,s,T)).state;
 const later=makeSample(T+300000);
 const result=state.observe(a,state.extract(later.e,later.s,T+300000));
 assert.equal(result.transitions.length,7);
 assert.ok(result.transitions.every(x=>x.transition==='AFTER_GAP_OR_NEW'));
 assert.equal(result.state.nextSeq,14);
 assert.equal(state.summary(result.state).seenValues.CONVERSION_QUALITY.EASY,2);
});
test('History page respects family, timestamps, pagination and no hypothetical backfill',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boono-elastic-state-'));
 const file=path.join(dir,'states.ndjson');
 const initial=state.initial();let v=initial;
 try{
  for(let i=0;i<5;i++){
   const {e,s}=makeSample(T+i*30000,i%2?'POWERFUL':'EASY');
   s.stateLayer=v;
   const a=state.observe(v,state.extract(e,s,T+i*30000));v=a.state;
   for(const y of a.transitions)appendRotatingNdjson(file,y,
    {maxBytes:1800,maxSegments:20});
  }
  const p=history.page(file,{now:T+180000,hours:6,limit:3});
  assert.equal(p.items.length,3);
  assert.equal(p.hasMore,true);
  const p2=history.page(file,{now:T+180000,hours:6,limit:3,
    before:p.nextBefore});
  assert.equal(p2.items.length,3);
  assert.ok(p2.items.every(e=>e.seq<p.nextBefore));
  assert.equal(p.items[0].asOf,p.items[0].at);
  const specific=history.page(file,{now:T+180000,hours:6,limit:40,
   family:'CONVERSION_QUALITY'});
  assert.equal(specific.items.length,5);
  assert.ok(specific.items.every(e=>e.family==='CONVERSION_QUALITY'));
  assert.throws(()=>history.page(file,{family:'../../../etc/passwd'}),/INVALID_FAMILY/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Snapshot mode keeps simultaneous seven states and no passive liquidity fiction',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boono-state-samples-'));
 const file=path.join(dir,'samples.ndjson');
 try{
  for(let i=0;i<3;i++){
   const {e,s}=makeSample(T+i*30000);
   appendRotatingNdjson(file,state.extract(e,s,T+i*30000));
  }
  const page=history.page(file,{now:T+120000,hours:6,kind:'snapshots',
    limit:2});
  assert.equal(page.items.length,2);assert.equal(page.hasMore,true);
  assert.equal(page.items[0].states.CAMPAIGN_PHASE,'STRUCTURAL_BIAS');
  assert.equal(page.items[0].measurements.passiveLiquidity,'NOT_MEASURED');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
