'use strict';
const assert=require('assert');
const mf=require('../../modules/v4/experiments/mf-structure-shadow');

function row(i,value){
  return {
    ts:i*15*60*1000,
    timestamp:new Date(i*15*60*1000).toISOString(),
    lt_blue_wave:1,
    blue_wave:1,
    money_flow:value,
    close:80000+i
  };
}
function frame(vals,live=null){
  return {sources:{mcb:{tfs:{'15m':{
    history:vals.map((v,i)=>row(i,v)),
    live:live===null?null:{...row(vals.length,live),money_flow:live}
  }}}}};
}

// Two higher highs + two higher lows -> advancing MF staircase.
const upVals=[0,5,4,3,6,10,9,8,11,15,14,13,16,20,19,18,21];
const up=mf.evaluate(frame(upVals,22),'short');
assert.strictEqual(up.highRelation,'HH');
assert.strictEqual(up.lowRelation,'HL');
assert.strictEqual(up.structuralState,'ADVANCING_UP');
assert.strictEqual(up.extensionState,'UP_EXTENSION');
assert.strictEqual(up.candidateContext.state,'MF_OPPOSES_CANDIDATE');
assert.strictEqual(up.candidateContext.maturity,'IMMATURE_AGAINST_MF_STRUCTURE');
assert.strictEqual(up.decisionImpact,false);

// Lower highs + lower lows -> advancing down and supports SHORT.
const dnVals=[20,15,16,17,14,10,11,12,9,5,6,7,4,0,1,2,-1];
const dn=mf.evaluate(frame(dnVals,-2),'short');
assert.strictEqual(dn.highRelation,'LH');
assert.strictEqual(dn.lowRelation,'LL');
assert.strictEqual(dn.structuralState,'ADVANCING_DOWN');
assert.strictEqual(dn.candidateContext.state,'MF_SUPPORTS_CANDIDATE');

// Compression: lower highs + higher lows.
const compVals=[0,10,8,6,7,9,7,5,6,8,7,6,7,7.5,7,6.5,7];
const comp=mf.evaluate(frame(compVals,7),'short');
assert.ok(['COMPRESSION','UNRESOLVED'].includes(comp.structuralState));
assert.strictEqual(comp.decisionImpact,false);

console.log('MF structure shadow v0.2 temporal tests OK');

// A current move through the last MF high breaks an old descending staircase;
// it must not still be counted as SHORT support.
const broken=mf.evaluate(frame(dnVals,30),'short');
assert.strictEqual(broken.structuralState,'ADVANCING_DOWN');
assert.strictEqual(broken.extensionState,'UP_STRUCTURE_BREAK');
assert.strictEqual(broken.candidateContext.state,'MF_STRUCTURE_BREAK_AGAINST_CANDIDATE');
assert.strictEqual(broken.candidateContext.supports,false);
assert.strictEqual(broken.candidateContext.opposes,true);

console.log('MF structure break semantics OK');

// Temporal memory: same final MF level, opposite path = opposite interpretation.
{
  const risingRows=[
    {ts:1,mf:-21,close:80000},{ts:2,mf:-18,close:80020},{ts:3,mf:-15,close:80040},
    {ts:4,mf:-9,close:80080},{ts:5,mf:-5,close:80100}
  ];
  const fallingRows=[
    {ts:1,mf:11,close:80100},{ts:2,mf:7,close:80080},{ts:3,mf:2,close:80050},
    {ts:4,mf:-2,close:80020},{ts:5,mf:-5,close:80000}
  ];
  const upMem=mf.temporalMemory(risingRows,'short');
  const dnMem=mf.temporalMemory(fallingRows,'long');
  assert.strictEqual(upMem.memoryDirection,'long');
  assert.strictEqual(dnMem.memoryDirection,'short');
  assert.strictEqual(upMem.decisionImpact,false);
  assert.strictEqual(dnMem.decisionImpact,false);
}

// Tactical SHORT pullback inside persistent rising MF memory: #98-like semantics.
{
  const rows=[
    {ts:1,mf:-21,close:80000},{ts:2,mf:-18,close:80020},{ts:3,mf:-15,close:80050},
    {ts:4,mf:-10,close:80100},{ts:5,mf:-8,close:80130},{ts:6,mf:-6,close:80160},
    {ts:7,mf:-4,close:80200},{ts:8,mf:-3,close:80220},{ts:9,mf:-3.7,close:80210},
    {ts:10,mf:-5.2,close:80120}
  ];
  const x=mf.temporalMemory(rows,'short');
  assert.strictEqual(x.memoryDirection,'long');
  assert.strictEqual(x.tacticalDirection,'short');
  assert.strictEqual(x.state,'RISING_WITH_PULLBACK');
  assert.strictEqual(x.candidateContext.state,'TACTICAL_SHORT_AGAINST_LONG_MF_MEMORY');
  assert.strictEqual(x.candidateContext.transitionCandidate,true);
}

// Tactical LONG recovery inside falling MF memory: early reversal context, not a veto.
{
  const rows=[
    {ts:1,mf:5,close:80200},{ts:2,mf:2,close:80180},{ts:3,mf:-3,close:80150},
    {ts:4,mf:-8,close:80120},{ts:5,mf:-13,close:80090},{ts:6,mf:-18,close:80060},
    {ts:7,mf:-21,close:80040},{ts:8,mf:-20,close:80050},{ts:9,mf:-18,close:80120}
  ];
  const x=mf.temporalMemory(rows,'long');
  assert.strictEqual(x.memoryDirection,'short');
  assert.strictEqual(x.tacticalDirection,'long');
  assert.strictEqual(x.state,'FALLING_WITH_RECOVERY');
  assert.strictEqual(x.candidateContext.state,'TACTICAL_LONG_AGAINST_SHORT_MF_MEMORY');
  assert.strictEqual(x.decisionImpact,false);
}

