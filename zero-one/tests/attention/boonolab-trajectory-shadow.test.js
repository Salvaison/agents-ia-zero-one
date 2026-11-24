'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../../modules/attention/boonolab-wave-geometry-v02');
const M=require('../../modules/attention/boonolab-trajectory-memory');
const I=require('../../modules/attention/boonolab-wave-interpreter-v02');
const R=require('../../modules/attention/boonolab-trajectory-shadow-runner');
const base=Date.parse('2026-11-24T00:00:00Z'),m=60000;
function row(i,L,B,price=60000+i){
 return {ts:base+i*m,lastPrice:price,live15LbwRaw:L,live15BwRaw:B,live15MfRaw:-10+i/10,
 liveLbw:L,liveBw:B,liveMoneyFlow:i,priceMove:i%2?5:-5};
}
function feed(state,i,L,B,price,ctx={},provenance='HISTORICAL_REPLAY_CLOSE_PROXY'){
 const r=row(i,L,B,price);return M.observe(state,{row:r,knownAt:r.ts,contexts:ctx,provenance});
}
function seq(state,points){
 for(let i=0;i<points.length;i++)feed(state,i,...points[i]);
 return I.interpret(state);
}
const curve=[
 [-1,3],[-2,3],[-3,3],[-4,3],[-3,3],[-1,3],[0,3],[1,3],
 [0,3],[-1,3],[-2,3],[-1,3],[0,3],[2,3],[4,3],[6,3],
 [7,3],[6,3],[5,3],[4,3],[5,3],[6,3],[7,3]
];
test('raw fields only and future samples rejected',()=>{
 const p=G.point({...row(0,1,2),live15Lbw:99,live15Bw:98});
 assert.equal(p.L,1);assert.equal(p.B,2);
 const s=M.initial(base);assert.equal(M.observe(s,{row:row(1,1,2),knownAt:base}).accepted,false);
 assert.equal(s.observations,0);
});
test('pre-cross initiative persists across local rotations and through the cross',()=>{
 const s=M.initial(base);
 for(let i=0;i<=7;i++)feed(s,i,...curve[i]);
 const born=s.hypotheses.UP.initiative;
 assert.ok(born);assert.equal(born.originKind,'PRE_CROSS_LBW_ROTATION');
 const id=born.id,origin=born.origin.sourceAt;
 for(let i=8;i<curve.length;i++)feed(s,i,...curve[i]);
 const h=s.hypotheses.UP,i=I.interpret(s);
 assert.equal(h.initiative.id,id);assert.equal(h.initiative.origin.sourceAt,origin);
 assert.ok(h.attemptCount>=3);assert.ok(h.initiative.crosses.length>=1);
 assert.ok(h.initiative.crosses[0].sourceAt>origin);
 assert.equal(i.hypotheses.UP.initiative.id,id);
 assert.ok(i.hypotheses.UP.persistentCrossAnchor.progress.ageMin>0);
 assert.equal(i.decisionImpact,false);assert.equal(i.brokerOrdersEnabled,false);
});
test('hypotheses coexist; prior attempts and paired price references are causal',()=>{
 const s=M.initial(base);const i=seq(s,curve);
 assert.equal(i.hypotheses.UP.trackId,'TRACK_UP');assert.equal(i.hypotheses.DN.trackId,'TRACK_DN');
 assert.ok(s.hypotheses.UP.previous.length>0);assert.ok(s.refs.length>0);
 for(const h of Object.values(i.hypotheses)){
  if(h.nearestPairedExtreme)assert.ok(h.nearestPairedExtreme.ref.referenceKnownAt<=h.origin.knownAt);
  assert.ok(h.support.PM3);assert.ok(h.support.E1);
 }
});
test('duplicate/out-of-order observations do not mutate memory',()=>{
 const s=M.initial(base);feed(s,0,1,2);
 const saved=JSON.stringify(s);
 assert.equal(feed(s,0,8,1).accepted,false);assert.equal(JSON.stringify(s),saved);
});
test('missing data gap does not invent a Cross',()=>{
 const s=M.initial(base);feed(s,0,0,1);feed(s,1,0,1);
 const a=feed(s,10,3,1);assert.ok(a.events.some(e=>e.type==='OBSERVATION_GAP'));
 assert.ok(!a.events.some(e=>e.type==='CROSS15_LIVE'));
 assert.ok(s.hypotheses.UP.active.coverageInterrupted);
});
test('CSV closes remain unavailable before bar close; native and geometric events separate',()=>{
 const line=(ts,L,B,up='',dn='')=>[new Date(ts).toISOString(),1,3,1,2,L,B,-1,0,0,0,0,5,up,dn].join(',');
 const b=R.parseBars([line(base,0,1,'','-1'),line(base+15*m,2,1,'2','')].join('\n'),'15m');
 assert.deepEqual(R.contextAt(b,base+14*m,'15m'),{});
 const c=R.contextAt(b,base+29*m,'15m');assert.equal(c.lastNative.direction,'DN');
 const d=R.contextAt(b,base+30*m,'15m');assert.equal(d.lastNative.direction,'UP');assert.equal(d.lastCross.direction,'UP');
 const s=M.initial(base);feed(s,15,0,1,60000,{'15m':c});
 const res=feed(s,30,2,1,60100,{'15m':d});
 assert.ok(res.events.some(e=>e.type==='CROSS15_CONFIRMED'));
 assert.ok(res.events.some(e=>e.type==='NATIVE_15M_CONFIRMED'));
 assert.equal(s.confirmedE15.direction,'UP');
});
test('prefix replay invariant, market-only, state survives serialization',()=>{
 const a=M.initial(base),b=M.initial(base);
 for(let i=0;i<15;i++){feed(a,i,...curve[i]);feed(b,i,...curve[i]);}
 const copy=JSON.parse(JSON.stringify(a)),before=JSON.stringify(I.interpret(a));
 assert.equal(before,JSON.stringify(I.interpret(b)));
 assert.equal(before,JSON.stringify(I.interpret(copy)));
 for(let i=15;i<curve.length;i++){feed(a,i,...curve[i]);feed(copy,i,...curve[i]);}
 assert.equal(JSON.stringify(I.interpret(a)),JSON.stringify(I.interpret(copy)));
 assert.equal(JSON.stringify(I.interpret(b)),before);
});
test('bootstrapped origin explicitly marked and live observations counted separately',()=>{
 const s=M.initial(base);feed(s,0,1,2,60000,{},'HISTORICAL_BOOTSTRAP_CLOSE_PROXY');
 feed(s,1,0,2,59900,{},'LIVE_FILE_OBSERVED');
 assert.equal(s.bootstrapObservations,1);assert.equal(s.liveObservations,1);
 assert.equal(s.hypotheses.UP.active.origin.provenance,'HISTORICAL_BOOTSTRAP_CLOSE_PROXY');
 assert.equal(s.latestGeometry.provenance,'LIVE_FILE_OBSERVED');
});
