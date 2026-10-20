'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const setup=require('../../modules/v4/layers/setup-lifecycle');
const tick=1792504093235;
function fx({direction='long',eff3=.46,pm3=148,pm5=78,pair='PAIR_SUB80_QUALITATIVE',
  lowEdge=true,dormant=false,mfOpposes=false,boundary=false,late=false,desync=false}={}){
 const s=direction==='long'?1:-1;
 const frame={market:{timestamp:tick,price:81718}};
 const baseThesis={candidateDirection:direction,mode:'REVERSAL_FORMING',quality:{pairClass:pair}};
 const mcb={currentLobe:{startTs:tick-900000,extremeTs:tick-120000,maturity:'MATURE_REVERSING',
   type:direction==='long'?'CREUX':'CRETE',relationshipFromPrevious:{pairQuality:{class:pair}}},
  nested3m:{available:true,startTs:tick-(late?20:9)*60000,extremeTs:tick-30000,
   lobeSign:s,lobeDirection:direction,structuralDirection:desync?(direction==='long'?'short':'long'):direction,
   structuralState:direction==='long'?'ASCENT_ACTIVE':'DESCENT_ACTIVE',recoveryFraction:0}};
 const background={primaryRelation:'WITH_BACKGROUND'};
 const room={state:boundary?'BOUNDARY_CONTEST':'OPEN_PATH',admissionBlocked:boundary};
 const quality={state:dormant?'DORMANT':'CHOP_SHADOW',lowEdge,admissionBlocked:dormant};
 const native={latest:null,reinforcedUp:{active:false},reinforced3mUp:{active:false,event:null}};
 const temporal=mfOpposes?{memoryDirection:'short',memoryHorizon:'h2',tacticalDirection:'short',
   horizons:{h1:{direction:'short'}}}:{memoryDirection:null,memoryHorizon:null,tacticalDirection:direction};
 const mf={temporal};
 const rolling={horizons:{net3mUsd:pm3,net5mUsd:pm5,efficiency3m:eff3,efficiency5m:.5}};
 return setup.evaluate(frame,baseThesis,mcb,background,room,quality,native,null,null,null,null,mf,rolling);
}
test('V4.10.8 allows a sub-80 MCB setup on PM3/PM5 and 37.5% efficiency',()=>{
 const x=fx();assert.equal(x.status,'SETUP');assert.equal(x.lowEdgeSub80,false);
 assert.equal(x.lowEdgeException.eligible,true);assert.equal(x.lowEdgeException.ready,true);
 assert.equal(x.lowEdgeException.status,'ROLLING_3M_5M_REQUALIFIED');
 assert.equal(x.lowEdgeException.postSetupPmStillRequired,true);
 assert.equal(x.timingShadow.state,'SETUP_OPEN');
});
test('sub-80 still blocked by weak or opposite rolling conversion',()=>{
 for(const k of [{eff3:.374},{pm3:-60},{pm5:-50},{pm3:0},{pm5:0},{pm3:18,pm5:-15}]){
  const x=fx(k);assert.equal(x.status,'OBSERVE');assert.equal(x.lowEdgeSub80,true);
  assert.ok(x.reasons.includes('LOW_EDGE_REQUIRES_MAJOR_MCB_OR_REINFORCED_UP'));
  assert.equal(x.lowEdgeException.ready,false);
 }
});
test('symmetrical SHORT proof and unchanged major-pair access (#145/#146 class)',()=>{
 const short=fx({direction:'short',pm3:-120,pm5:-70,eff3:.8});
 assert.equal(short.status,'SETUP');
 const major=fx({pair:'PAIR_MAJOR_QUALITATIVE',pm3:8,pm5:3,eff3:.04});
 assert.equal(major.status,'SETUP');assert.equal(major.lowEdgeException.status,'NOT_REQUIRED');
});
test('never overrides MF, structural sync, boundaries, dormant or late entry',()=>{
 const cases=[
  [fx({mfOpposes:true}),'WAIT_MF_MEMORY'],
  [fx({desync:true}),'WAIT_3M_15M_SYNC'],
  [fx({boundary:true}),'BOUNDARY_CONTEST'],
  [fx({dormant:true}),'DORMANT_MARKET'],
  [fx({late:true}),'SETUP_LATE_CLOSES_ENTRY_WINDOW']
 ];
 for(const [s,reason] of cases){
  assert.equal(s.status,'OBSERVE',reason);
  assert.ok((s.reasons||[]).includes(reason),JSON.stringify([reason,s.reason]));
 }
});
test('ordinary NO LOW_EDGE state needs no override, no new direction',()=>{
 const s=fx({lowEdge:false,pm3:-100,pm5:-80});
 assert.equal(s.status,'SETUP');
 assert.equal(s.lowEdgeException.eligible,false);
});
