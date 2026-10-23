'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const m=require('../../modules/v5/structural-story-engine');
const t=1792700000000,T15=900000,T3=180000;
const m15=[-20,-48,-35,-19,10,22,30].map((n,i)=>({
 ts:t+i*T15,lt_blue_wave:n,close:81700+i*30,high:81760+i*30,low:81620+i*30
}));
const m3=[-10,-29,-22,9,15,7,2,22].map((n,i)=>({
 ts:t+4*T15+i*T3,lt_blue_wave:n,close:81780+i*10,
 high:81820+i*10,low:81740+i*10
}));
const lvl=[{token:'VAL',price:82035,groupId:4},
 {token:'POC',price:83876,groupId:4},{token:'VAH',price:85498,groupId:4}];
const sample=(ts,price,mf15=-18)=>({ts,price,mf15,mf15Slope:2.1,lbw15:-24,lbw3:15,pmLive:30,quality:'POWERFUL'});
const E=(id,at,tf,dir,type,src)=>({id,observedAt:at,sourceTs:src,family:tf==='15m'?'MCB15':'MCB3',
 key:tf==='15m'?'E15':'E3',direction:dir,type,current:{sourceTs:src,type:dir==='long'?'UP':'DN'},price:81800});
test('parent 15m E-to-E confirmed CREUX remains LONG despite fresh E15 DN Live',()=>{
 const when=t+7*T15;
 let s=m.initial();
 const out=m.step(s,{sample:sample(when,81790),bars15:m15,bars3:m3,
   levels:lvl,events:[E(1,when-2000,'15m','short','OBSERVED',when-T15)]});
 assert.equal(out.changed,true);
 assert.equal(out.story.structure.direction,'long','structural trough dictates direction');
 assert.equal(out.story.structure.pivot.type,'CREUX');
 assert.notEqual(out.story.structure.direction,'short');
 assert.ok(out.story.evidenceAsOf.latestConfirmed15mBar<=when-T15);
 assert.equal(out.story.enjeu.valueArea,'BELOW_VALUE');
 assert.equal(out.story.conversion.role,'DESCRIPTION_ONLY_NOT_TREND_AUTHORITY');
 assert.equal(out.story.decisionImpact,false);
 assert.equal(out.story.tradingEnabled,false);
});
test('up E3 attack is a countertest of SHORT, without changing the strategic parent',()=>{
 const down=[20,56,42,25,-10,-28,-32].map((n,i)=>({
  ts:t+i*T15,lt_blue_wave:n,close:82000-i*30,high:82050-i*30,low:81940-i*30
 }));
 const when=t+7*T15,e=E(2,when-5000,'3m','long','OBSERVED',when-5000);
 let s=m.initial();
 const a=m.step(s,{sample:sample(when,81650),bars15:down,bars3:m3,
  levels:[],levelMode:'HISTORICAL_UNKNOWN',events:[e]});
 assert.equal(a.story.structure.direction,'short');
 assert.equal(a.story.attempts.recent.at(-1).dir,'long');
 assert.equal(a.story.attempts.recent.at(-1).parentAtOrigin,'short');
 assert.equal(a.story.enjeu.profile.VAL,null,'do not hallucinate old profile');
 assert.equal(a.story.enjeu.provenance,'PROFILE_NOT_HISTORICALLY_VERIFIED');
 const b=m.step(s,{sample:sample(when+T15+10000,81760),bars15:down,bars3:m3,events:[]});
 assert.ok(b.story.attempts.recent.some(x=>x.consequence==='TERRITORY_NOT_RETAINED'),
  'rebound from intermediate low does not mean reclaim of original E3 attack price');
 assert.equal(b.story.structure.direction,'short');
});
test('profile creates CONDITIONAL reclaim story, not price targets or acceptance claim',()=>{
 const a=m.location(81750,lvl,[],t);
 assert.equal(a.valueArea,'BELOW_VALUE');
 assert.equal(a.nearestAbove.price,82035);
 const b=m.location(82500,lvl,[],t);
 assert.equal(b.valueArea,'LOWER_VALUE');
 assert.equal(b.profile.POC,83876);
 assert.equal(b.profile.VAH,85498);
 const r=m.step(null,{sample:sample(t+7*T15,82500),bars15:m15,bars3:m3,levels:lvl});
 assert.equal(r.story.proposedScenarios[0].kind,'DEFEND_VALUE_REINTEGRATION');
 assert.ok(r.story.proposedScenarios.every(x=>x.conditional===true));
});
test('as-of gating excludes pivots requiring future 15m confirmation',()=>{
 const now=t+4*T15;
 const history=m.causalBars(m15,T15,now);
 assert.equal(history.at(-1).ts,t+3*T15);
 assert.ok(!history.some(x=>x.ts===t+4*T15));
 const r=m.step(null,{sample:sample(now,81900),bars15:m15,bars3:m3,levels:lvl});
 assert.ok(r.story.structure.pivot.confirmedAt<=now-T15);
});
test('MF history and observed price can contest the 15m thesis without changing direction',()=>{
 let s=m.initial();const start=t+7*T15;
 m.step(s,{sample:sample(start,82100,-10),bars15:m15,bars3:m3});
 const x=m.step(s,{sample:sample(start+3600000,81750,-21),bars15:m15,bars3:m3});
 assert.equal(x.story.horizon.priceNet1h,-350);
 assert.equal(x.story.horizon.mf15Delta1h,-11);
 assert.equal(x.story.structure.direction,'long');
 assert.ok(x.story.contesting.some(x=>x.includes('Prix 1h opposé')));
});
test('replay is deterministic and duplicates are not interpreted as new market events',()=>{
 const k=t+7*T15;
 const ev=E(7,k-5000,'3m','long','OBSERVED',k-5000);
 let a=m.initial(),b=m.initial();
 for(const x of [a,b]){
  m.step(x,{sample:sample(k,81900),bars15:m15,bars3:m3,events:[ev]});
  m.step(x,{sample:sample(k+30000,81950),bars15:m15,bars3:m3,events:[ev]});
 }
 assert.deepEqual(a.lastHypothesis,b.lastHypothesis);
 assert.equal(a.attempts.length,1);
 assert.equal(a.eventKeys.filter(x=>x.startsWith('3m:E3:')).length,1);
});

test('MCB stale confirmation is explicit; historical trajectory is retained without claim of a current trend',()=>{
 const k=t+14*T15;
 const x=m.step(null,{sample:sample(k,81550),bars15:m15,bars3:m3,levels:lvl});
 assert.equal(x.story.evidenceAsOf.dataIntegrity,'STALE_CONFIRMED_MCB');
 assert.equal(x.story.phase,'SOURCE_GAP_STRUCTURE_NOT_CURRENT');
 assert.ok(x.story.uncertainties.some(x=>x.includes('insuffisamment fraîches')));
 assert.equal(x.story.structure.direction,'long','retain last known trajectory as history');
});
test('conversion quality is descriptive: no invented class and no change of structural direction',()=>{
 const when=t+7*T15;
 const q={id:42,family:'CONVERSION',key:'CONVERSION',type:'TRANSITION',
  observedAt:when-12000,direction:'short',current:{quality:'POWERFUL',direction:'short'}};
 const r=m.step(null,{sample:sample(when,81800),bars15:m15,bars3:m3,events:[q]});
 assert.equal(r.story.structure.direction,'long');
 assert.equal(r.story.conversion.quality,'POWERFUL');
 assert.equal(r.story.conversion.qualityDirection,'short');
 assert.equal(r.story.conversion.role,'DESCRIPTION_ONLY_NOT_TREND_AUTHORITY');
 assert.ok(r.story.conversion.qualityCounts1h.POWERFUL>=1);
 const next=m.step(r.state,{sample:sample(when+30000,81820),bars15:m15,bars3:m3});
 assert.equal(next.story.conversion.quality,'POWERFUL');
});

test('BW/LBW cross is attached to native E3 rather than counted as independent confirmation',()=>{
 const k=t+7*T15;
 const native=E(11,k-25000,'3m','long','OBSERVED',k-45000);
 const cross={id:12,family:'MCB3',key:'BW_LBW_CROSS',type:'OBSERVED',
   observedAt:k-20000,sourceTs:k-22000,direction:'long',
   current:{sourceTs:k-22000,event:'BW_CROSSES_BELOW_LBW'},price:81800};
 const r=m.step(null,{sample:sample(k,81740),bars15:m15,bars3:m3,events:[native,cross]});
 assert.equal(r.story.attempts.recent.length,1);
 assert.equal(r.story.synchronizedSignals.linkedCrossCount,1);
 const event=r.story.synchronizedSignals.recent.find(x=>x.kind==='CROSS');
 assert.equal(event.relation,'LINKED_NATIVE_SAME_OSCILLATOR');
 assert.ok(event.linkedTo);
 assert.equal(r.story.structure.direction,'long');
});

test('stale Elastic event stream is named explicitly, without asserting a recent E3/E15 synchro',()=>{
 const k=t+7*T15;
 const event=E(42,k-35*60000,'15m','long','OBSERVED',k-45*60000);
 const s=m.initial();
 const a=m.step(s,{sample:sample(k,81710),bars15:m15,bars3:m3,events:[event]});
 assert.equal(a.story.evidenceAsOf.elasticEventStatus,'STALE_ELASTIC_EVENTS');
 assert.ok(a.story.uncertainties.some(x=>x.includes('non fraîche')));
 assert.equal(a.story.tradingEnabled,false);
});
