'use strict';
const assert=require('assert');
const bg=require('../../modules/v4/layers/mcb-background');
const handoff=require('../../modules/v4/experiments/structural-handoff-shadow');

function row(i,lbw){
  return {
    ts:i*3600000,
    timestamp:new Date(i*3600000).toISOString(),
    lt_blue_wave:lbw,
    blue_wave:lbw,
    high:86000+i*10,
    low:85000-i*10,
    close:85500
  };
}

// 1h structural direction persists from the causal crest even if LBW stays positive
// and the local slope later breathes upward.
const src={history:[
  row(1,70),row(2,100),row(3,90),row(4,65),row(5,72),row(6,55),row(7,30),row(8,12)
]};
const st=bg.structuralTrajectory(src,'1h');
assert.strictEqual(st.available,true);
assert.strictEqual(st.direction,'short');
assert.strictEqual(st.state,'DESCENT_ACTIVE');
assert.strictEqual(st.lastPivot.type,'CRETE');
assert.strictEqual(st.lastPivot.extremeTs,2*3600000);
assert.strictEqual(st.lastPivot.confirmedAt,4*3600000);

// Triple sync: 1h structural context + 15m DN/thesis + 3m short timing.
const frame={market:{timestamp:100000},entryControl:null};
const background={oneHour:{
  available:true,
  direction:'long',
  phase:'REVERSING',
  structuralDirection:'short',
  structuralState:'DESCENT_ACTIVE',
  structuralPivot:{type:'CRETE',confirmedAt:50000}
}};
const native={
  recent:true,
  latest:{type:'DN',ts:90000},
  oneHour:{latest:null}
};
const mcb={nested3m:{lobeSign:-1,turningDirection:null}};
const thesis={candidateDirection:'short',direction:'short'};
const translation={
  aligned:true,
  thesisDirection:'short',
  status:'TRANSLATING',
  horizons:{net3mUsd:-120}
};
const position={direction:'long'};

const a=handoff.evaluateStructure(frame,position,mcb,thesis,background,native,translation,null);
assert.strictEqual(a.active,true);
assert.strictEqual(a.direction,'short');
assert.strictEqual(a.tripleSyncNow,true);
assert.strictEqual(a.positionOpposed,true);
assert.strictEqual(a.exitCandidate,true);
assert.strictEqual(a.antiChurnContract.preExitPmReusableForReentry,false);

// A 3m respiration does not erase structural memory.
const breathed=handoff.evaluateStructure(
  {market:{timestamp:110000}},
  null,
  {nested3m:{lobeSign:1,turningDirection:'long'}},
  thesis,
  background,
  native,
  {aligned:false,status:'NOT_TRANSLATING'},
  a
);
assert.strictEqual(breathed.active,true);
assert.strictEqual(breathed.persisted,true);
assert.strictEqual(breathed.tripleSyncNow,false);

// A native UP alone does NOT erase a still-short 15m thesis.
const nativeBreath=handoff.evaluateStructure(
  {market:{timestamp:120000}},
  null,
  mcb,
  thesis,
  background,
  {recent:true,latest:{type:'UP',ts:115000}},
  translation,
  a
);
assert.strictEqual(nativeBreath.active,true);

// The handoff is invalidated when the 15m THESIS itself flips opposite.
const invalid=handoff.evaluateStructure(
  {market:{timestamp:130000}},
  null,
  mcb,
  {candidateDirection:'long',direction:'long'},
  background,
  {recent:true,latest:{type:'UP',ts:125000}},
  {aligned:true,thesisDirection:'long',status:'TRANSLATING'},
  a
);
assert.strictEqual(invalid.active,false);
assert.strictEqual(invalid.invalidationReason,'15M_THESIS_OPPOSED');

// Re-entry proof starts strictly after the later of handoff and exit.
const exitControl={lastExitTs:105000};
assert.strictEqual(handoff.proofStartTs(a,exitControl),105000);
const fresh={
  aligned:true,
  thesisDirection:'short',
  status:'TRANSLATING',
  sinceTs:105000,
  sinceSetup:{available:true,n:3,netUsd:-25,grossUsd:30,efficiency:.83},
  materiality:{postSetupRequired:true,passed:true,minNetUsd:10,minEfficiency:.25}
};
const final=handoff.finalize(a,fresh,exitControl,null);
assert.strictEqual(final.proofStartTs,105000);
assert.strictEqual(final.reentryEligible,true);
assert.strictEqual(final.antiChurnContract.preExitTickerReusableForReentry,false);

console.log('Structural handoff shadow v0.1 tests OK');
