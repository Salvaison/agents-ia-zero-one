'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const model=require('../../modules/attention/v543-lbw15-s1-v02');
const T=1794924000000,MIN=60000;
function cur(at,extra={}){
 return {at,price:65000,lbw:35,bw:41,
  parent:'short',parentId:'short|E15:TEST',
  parentKnownAt:T-2*3600000,candidate:'short',
  phase:'STRUCTURAL_CONTINUATION',
  nativeDirection:'short',nativeKnownAt:T-3600000,
  cross15Direction:'short',cross15At:at-2*MIN,
  cross3Direction:'short',cross3At:at-MIN,
  pmLive:-55,pm3:-40,pm5:-45,
  defended:false,...extra};
}
const observations=[
 cur(T-15*MIN,{lbw:37,price:65090}),
 cur(T-3*MIN,{lbw:36,price:65042})
];
test('S1 v0.2 maintains three independent directions: parent, candidate and actual position',()=>{
 const x=cur(T,{lbw:32,candidate:'long',
  cross3Direction:'long',pmLive:30});
 const s=model.initial(T-15*MIN);
 const r=model.observe(s,x,{history:observations,
  position:{direction:'short',entryAt:T-40*MIN,entryPrice:65130,mfePriceUsd:250}});
 assert.equal(r.view.references.parent.direction,'short');
 assert.equal(r.view.references.candidate.direction,'long');
 assert.equal(r.view.references.position.direction,'short');
 assert.ok(r.view.references.parent.signed15m>0);
 assert.ok(r.view.references.candidate.signed15m<0);
 assert.ok(r.view.references.position.signed15m>0);
 assert.equal(r.view.brokerOrdersEnabled,false);
 assert.equal(r.view.exitRequested,null);
});
test('counterattack under same E15 is persistent, then recovery and requalification without new parent',()=>{
 const st=model.initial(T-15*MIN);
 const history=[...observations];
 const step=(x)=>{
  const out=model.observe(st,x,{history});
  assert.equal(out.changed,true);
  history.push(x);return out;
 };
 step(cur(T,{lbw:34}));
 const attack=step(cur(T+MIN,{lbw:40,price:65175,
  candidate:'long',cross3Direction:'long',
  cross3At:T+MIN-5000,pmLive:110}));
 assert.equal(attack.view.phase,'COUNTERATTACK');
 assert.equal(attack.view.counterattacks,1);
 assert.equal(attack.view.parent,'short');
 assert.ok(attack.view.references.parent.opposedFamilies.includes('MCB3'));
 assert.ok(attack.view.references.parent.opposedFamilies.includes('PM'));
 const intra=step(cur(T+2*MIN,{lbw:42,price:65155,
  candidate:'long',cross3Direction:'long',
  cross3At:T+2*MIN-2000,pmLive:30}));
 assert.equal(intra.view.phase,'COUNTERATTACK');
 const recover=step(cur(T+3*MIN,{lbw:38,price:65050,
  candidate:'short',cross3Direction:'short',pmLive:-70}));
 assert.equal(recover.view.phase,'RECOVERY_CANDIDATE');
 assert.equal(recover.view.counterattacks,1);
 const resumed=step(cur(T+4*MIN,{lbw:30,price:64970,
  candidate:'short',cross3Direction:'short',pmLive:-70}));
 assert.equal(resumed.view.phase,'RESUMED');
 step(cur(T+5*MIN,{lbw:27,price:64920,
  candidate:'short',cross3Direction:'short',pmLive:-65}));
 assert.equal(resumed.view.resumptions,1);
 assert.equal(resumed.view.proposedAdmission,'REQUALIFIED_SAME_PARENT_REENTRY_REVIEW');
 assert.equal(resumed.view.parentId,'short|E15:TEST');
 assert.ok(st.events.some(x=>x.to==='COUNTERATTACK'));
 assert.ok(st.events.some(x=>x.to==='RESUMED'));
});
test('native 15m opposition does not silently reassign the parent without price transfer',()=>{
 const st=model.initial();
 const history=[...observations];
 model.observe(st,cur(T),{history});
 const second=cur(T+MIN,{nativeDirection:'long',
  nativeKnownAt:T+MIN-3000,
  cross15Direction:'long',cross15At:T+MIN-1500,
  candidate:'long',pmLive:30,lbw:42});
 const x=model.observe(st,second,{history:[...history,cur(T)]});
 assert.equal(x.view.parent,'short');
 assert.equal(x.view.parentId,'short|E15:TEST');
 assert.equal(x.view.phase,'COUNTERATTACK');
 assert.equal(st.archives.length,0);
 const changed=model.observe(st,cur(T+2*MIN,{
  parent:'long',parentId:'long|E15:NEW',
  parentKnownAt:T+MIN,nativeDirection:'long',
  nativeKnownAt:T+MIN,cross15Direction:'long',
  candidate:'long',defended:false}),{history:[...history,cur(T),second]});
 assert.equal(changed.state.archives.length,1);
 const e=changed.transitions.find(x=>x.type==='S1_V02_PARENT_REPLACED');
 assert.ok(e);
 assert.equal(e.transitionStatus,'NEW_PARENT_OBSERVED_PRICE_TRANSFER_NOT_FULLY_VERIFIED');
});
test('an adverse E3 and PM triggers early position attention but never an exit',()=>{
 const st=model.initial();
 const x=cur(T,{cross3Direction:'long',cross3At:T-5000,
  candidate:'long',pmLive:75});
 const result=model.observe(st,x,{history:observations,
  position:{direction:'short',entryAt:T-20*MIN,
   entryPrice:65100,mfePriceUsd:300}});
 assert.equal(result.view.proposedPosition,
  'EXAMINE_PRICE_DEFENCE_AND_ECONOMIC_PROTECTION');
 assert.equal(result.view.exitRequested,null);
 assert.equal(result.view.entryAllowed,null);
 assert.ok(result.transitions.some(x=>x.type==='S1_V02_POSITION_REVIEW'));
});
test('sample and references cannot inspect future LBW observations',()=>{
 const st=model.initial();
 const h=[cur(T-15*MIN,{lbw:0}),cur(T-3*MIN,{lbw:30}),
  cur(T+5*MIN,{lbw:-95})];
 const out=model.observe(st,cur(T,{lbw:35}),{history:h});
 assert.equal(out.view.references.parent.delta15m,35);
 assert.equal(out.view.references.parent.delta3m,5);
 const old=model.observe(st,cur(T-1000),{history:[]});
 assert.equal(old.changed,false);
});
test('state version, read-only contract, and position authority are enforced',()=>{
 const x=model.initial();
 assert.equal(x.mode,'SHADOW_ONLY');
 assert.equal(x.decisionImpact,false);
 assert.equal(x.brokerOrdersEnabled,false);
 assert.throws(()=>model.checked({...x,brokerOrdersEnabled:true}),/INVALID/);
 assert.throws(()=>model.checked({...x,version:'boonolab-v543-lbw15-s1-v0.1'}),/INVALID/);
 const runner=fs.readFileSync(path.resolve(__dirname,
  '../../modules/attention/v543-lbw15-s1-v02-runner.js'),'utf8');
 assert.ok(!runner.includes("require('../v5/paper"));
 assert.ok(!runner.includes('paper.step('));
 assert.ok(!runner.includes('orderClient'));
 assert.ok(!runner.includes("write(PAPER"));
 assert.ok(runner.includes("v543-lbw15-s1-shadow-state.json"));
});
