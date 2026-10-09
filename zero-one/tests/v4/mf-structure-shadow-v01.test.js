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

console.log('MF structure shadow v0.1 tests OK');

// A current move through the last MF high breaks an old descending staircase;
// it must not still be counted as SHORT support.
const broken=mf.evaluate(frame(dnVals,30),'short');
assert.strictEqual(broken.structuralState,'ADVANCING_DOWN');
assert.strictEqual(broken.extensionState,'UP_STRUCTURE_BREAK');
assert.strictEqual(broken.candidateContext.state,'MF_STRUCTURE_BREAK_AGAINST_CANDIDATE');
assert.strictEqual(broken.candidateContext.supports,false);
assert.strictEqual(broken.candidateContext.opposes,true);

console.log('MF structure break semantics OK');
