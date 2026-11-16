'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const m=require('../../modules/attention/v543-lbw15-s1');
const now=1794831000000;
const older=[{at:now-15*60000,lbw:30,bw:10},
 {at:now-3*60000,lbw:14,bw:13}];
const cur=(p={})=>({at:now,price:64500,lbw:10,bw:9,
 parent:'long',parentId:'long|E15:1',parentKnownAt:now-2*3600000,
 phase:'STRUCTURAL_CONTINUATION',candidate:'long',nativeDirection:'short',
 nativeKnownAt:now-60000,nativeSourceAt:now-20*60000,
 cross15Direction:'short',cross15At:now-30000,
 cross3Direction:'short',cross3At:now-50000,pmLive:-25,
 pm3:20,pm5:10,mf3:-1,mf15:-2,defended:false,rank2h:.9,...p});
test('S1 sees newer contrary native E15 as a problem but has no trade authority',()=>{
 const r=m.inspect(older,cur());
 assert.equal(r.confirmedNativeConflict,true);
 assert.equal(r.parentNativeConflict,true);
 assert.equal(r.proposedAdmission,'DEFER_CONTINUATION_REVIEW');
 assert.equal(r.decisionImpact,false);assert.equal(r.entryAllowed,null);
 assert.equal(r.exitRequested,null);assert.equal(r.brokerOrdersEnabled,false);
});
test('the same opposition is not a universal veto over reversal forming winners',()=>{
 const r=m.inspect(older,cur({phase:'STRUCTURAL_REVERSAL_FORMING',
   candidate:'short',nativeDirection:'long',cross15Direction:'short'}));
 assert.equal(r.proposedAdmission,'PRESERVE_REVERSAL_FORMING');
 assert.equal(r.hypotheticalAdmissionDefer,false);
});
test('causal future confirmation must not count',()=>{
 const r=m.inspect(older,cur({nativeKnownAt:now+900000,
  cross15Direction:'long',lbw:36,bw:18,pmLive:20}));
 assert.equal(r.confirmedNativeConflict,false);
 assert.equal(r.parentNativeConflict,false);
});
test('contraction and counter-flow trigger attention without native confirmation',()=>{
 const r=m.inspect(older,cur({nativeDirection:'long',lbw:15,bw:14,
   cross15Direction:'long'}),{direction:'long'});
 assert.equal(r.evidence.gapContracting,true);
 assert.equal(r.hypotheticalAdmissionDefer,true);
 assert.equal(r.hypotheticalPositionReview,true);
});
test('no reliable 15-minute history means no fabricated slope',()=>{
 const r=m.inspect([],cur({nativeDirection:'long',
   cross15Direction:'long'}));
 assert.equal(r.lbwDelta15m,null);
 assert.equal(r.evidence.history15m,false);
});
test('sampling uses available native clocks, not old geometry live',()=>{
 const d={asOf:now,price:64500,action:'ENTER_SHORT',phase:'STRUCTURAL_CONTINUATION',
  candidate:'short',readings:{structural54:{available:true,
   director:'long',currentLbw15:-12,currentBw15:-8,
   structuralPivotKnownAt:now-3600000,phase:'STRUCTURAL_CONTINUATION',
   campaignId:'long|E15:1',nativeE15:{confirmed:{direction:'short',
    availableAt:now-1000,sourceTs:now-15*60000},live:null}},
   geometry:{e15Live:{direction:'long',firstObservedAt:now-3600000},
    cross15:{direction:'short',ts:now-2000}},
   conversion:{pmCombined:-12}}};
 const s=m.sample(d);
 assert.equal(s.nativeDirection,'short');
 assert.equal(s.activeLiveDirection,null);
 assert.equal(s.nativeKnownAt,now-1000);
});
