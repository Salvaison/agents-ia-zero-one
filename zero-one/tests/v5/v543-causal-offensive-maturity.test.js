'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./fixtures/v543-archived-entries-20261027.json');
const asof=require('./fixtures/v541-20261026-asof.json');
const m=require('../../modules/v5/offensive-maturity-v543');
const old=require('../../modules/v5/decision-v542');
const active=require('../../modules/v5/decision-v543');
const oldPaper=require('../../modules/v5/paper-v542');
const newPaper=require('../../modules/v5/paper-v543');
const copy=x=>JSON.parse(JSON.stringify(x));
function archived(no){
 const c=fixture.cases.find(t=>t.tradeNo===no);
 assert.ok(c,'missing actual archived input #'+no);
 return {c,decision:{asOf:c.entryAt,price:c.entryPrice,phase:c.phase,candidate:c.direction,
  readings:{structural54:copy(c.structural54),geometry:{cross3:c.structural54?.mcb3?.cross},
   conversion:copy(c.conversion),maContract:copy(c.maContract)}},
 input:{bars3:copy(c.bars3)}};}
function classify(no){
 const {decision,input}=archived(no);
 return m.evaluate({decision,input});}
test('The #78 late LONG is flagged using THREE independent causal families, not E3 age',()=>{
 const {c}=archived(78),a=classify(78);
 assert.equal(c.phase,'STRUCTURAL_REVERSAL_FORMING');
 assert.equal(a.classification,'LATE_OFFENSIVE_CONFIRMATION');
 assert.equal(a.deferNewEntry,true);
 assert.equal(a.sourceQuality,'CAUSAL_ASOF_COMPLETE');
 assert.deepEqual(a.evidence.map(e=>[e.family,e.observed]),
  [['PRICE',true],['MCB15',true],['CONVERSION',true]]);
 assert.ok(a.context.priceOrigin.origin4h.progressUsd>800,
  'real 4h price origin is preserved from actual as-of 3m bars');
 assert.equal(a.context.priceGeometry.rank2h,1);
 assert.equal(a.context.oscillator.referenceLbw,69.1);
 assert.equal(a.context.oscillator.observedLbw15,64.8);
 assert.equal(a.context.conversion.directional.sinceBaton,-24.1);
 assert.equal(a.context.conversion.directional.pmLive,16);
 assert.equal(a.brokerOrdersEnabled,false);
 assert.equal(a.authority,'ADMISSION_ONLY_NO_EXIT_OR_CAMPAIGN_DIRECTION_CHANGE');
});
test('Previously useful reversals #62/#63/#72 and early moves remain admissible',()=>{
 for(const no of [59,60,61,62,63,69,70,72,74,77]){
  const a=classify(no);
  assert.equal(a.deferNewEntry,false,'must preserve archived opportunity #'+no);
  assert.equal(a.sourceQuality,'CAUSAL_ASOF_COMPLETE','#'+no);
 }
});
test('Even existing losing #66 on an outer 2h edge is NOT blocked on price alone',()=>{
 const a=classify(66);
 assert.equal(a.context.priceGeometry.priceAt2hExtreme,true);
 assert.equal(a.context.conversion.conversionFatigue,true);
 assert.equal(a.context.oscillator.oppositeDivergenceForming,false);
 assert.equal(a.deferNewEntry,false);
});
test('Actual #78 old E3 cross can be fresh while underlying PRICE offensive is ~3h old',()=>{
 const a=classify(78),o=a.context.priceOrigin;
 assert.ok(o.origin4h.ageMinutes>150);
 assert.ok(o.tacticalCrossObservedAt>o.origin4h.availableAt);
 assert.ok(a.context.oscillator.referenceAvailableAt<=a.asOf);
 assert.equal(o.tacticalCrossObservedAt<=a.asOf,true);
 assert.equal(a.context.priceGeometry.priceAt2hExtreme,true);
});
test('Gate is temporary: a new productive marginal PRICE episode requalifies same E3',()=>{
 const {decision,input}=archived(78);
 const original=m.evaluate({decision,input});assert.equal(original.deferNewEntry,true);
 decision.readings.conversion.pmSinceBaton=14.2; // new, actual as-of price improvement
 const recovered=m.evaluate({decision,input});
 assert.equal(recovered.deferNewEntry,false);
 assert.equal(recovered.context.conversion.marginalAdverse,false);
});
test('An E15 oscillator high that REQUALIFIES the price high also removes the gate',()=>{
 const {decision,input}=archived(78);
 decision.readings.structural54.currentLbw15=69.2;
 const r=m.evaluate({decision,input});
 assert.equal(r.context.oscillator.oppositeDivergenceForming,false);
 assert.equal(r.deferNewEntry,false);
});
test('A confirmed MA15 polarity change after the E15 anchor prevents stale divergence voting',()=>{
 const {decision,input}=archived(78);
 const anchor=decision.readings.structural54.structuralOrigin;
 decision.readings.maContract.ma15.polarityMemory.polarityChangedAt=anchor.sourceTs+15*60000;
 const r=m.evaluate({decision,input});
 assert.equal(r.context.oscillator.same15mPolarityRegime,false);
 assert.equal(r.deferNewEntry,false);
});
test('Future 3m bars never alter 4h origins, price ranks, or maturity as-of',()=>{
 const {decision,input}=archived(78),base=m.evaluate({decision,input});
 input.bars3.push({ts:decision.asOf+180000,close:5000,low:1000,high:90000});
 input.bars3.push({ts:decision.asOf+540000,close:85000,low:1000,high:90000});
 const again=m.evaluate({decision,input});
 assert.deepEqual(again,base);
});
test('Missing as-of oscillator/conversion evidence does not fabricate a veto',()=>{
 const {decision,input}=archived(78);
 decision.readings.structural54.currentLbw15=null;
 assert.equal(m.evaluate({decision,input}).deferNewEntry,false);
 decision.readings.structural54.currentLbw15=64.8;
 decision.readings.conversion.pmSinceBaton=null;
 assert.equal(m.evaluate({decision,input}).deferNewEntry,false);
});
test('PRICE and MCB15 bearish exhaustion remain symmetric to bullish lower lows',()=>{
 const {decision,input}=archived(78);
 const pivot=decision.readings.structural54.structuralOrigin;
 const mirror=160000;
 const flip=x=>mirror-x;
 decision.candidate='short';decision.price=flip(decision.price);
 decision.readings.structural54.currentLbw15=-64.8;
 decision.readings.structural54.structuralOrigin={
  ...pivot,type:'CREUX',price:flip(pivot.price),lbw:-pivot.lbw};
 decision.readings.structural54.origins.m120={
  ...decision.readings.structural54.origins.m120,
  low:flip(decision.readings.structural54.origins.m120.high),
  high:flip(decision.readings.structural54.origins.m120.low)};
 input.bars3=input.bars3.map(b=>({ts:b.ts,low:flip(b.high),
  high:flip(b.low),close:flip(b.close)}));
 for(const k of ['pm3','pm5','pmCombined','pmSinceBaton'])
  decision.readings.conversion[k]=-decision.readings.conversion[k];
 const r=m.evaluate({decision,input});
 assert.equal(r.classification,'LATE_OFFENSIVE_CONFIRMATION');
 assert.equal(r.deferNewEntry,true);
});
function asofInput(label){
 const c=asof.cases.find(c=>c.label===label);
 assert.ok(c,'fixture case '+label);
 const samples=asof.samples.filter(x=>x.ts<=c.ts).slice(-450);
 return {...asof,now:c.ts,price:c.price,samples,position:null,
  startedAt:asof.activatedV54,sourceAgeMs:c.ts-samples.at(-1).ts,
  tickAgeMs:100,health:true,liveMa3:null,liveMa15:null,levels:[]};
}
test('V5.4.3 keeps the earlier successful V5.4.1 16:00 LONG decision intact',()=>{
 const input=asofInput('16:00:37');
 const a=old.evaluate(input),b=active.evaluate(input);
 assert.equal(a.action,'ENTER_LONG');
 assert.equal(b.action,'ENTER_LONG');
 assert.equal(b.reason,a.reason);
 assert.equal(b.checks.offensiveMaturityBlocksNewAdmission,false);
 assert.equal(b.version,active.VERSION);
 assert.equal(b.brokerOrdersEnabled,false);
});
test('V5.4.3 inherited and newly opened positions retain EXACT full V5.4.2 exit actions',()=>{
 const input=asofInput('16:21:10');
 for(const policy of [old.VERSION,active.VERSION]){
  const pos={direction:'short',entryAt:input.now-12*60000,
   entryPrice:input.price+50,invalidationPrice:input.price+220,
   entryPolicyVersion:policy};
  const baseline=old.evaluate({...input,position:{...pos,entryPolicyVersion:old.VERSION}});
  const newer=active.evaluate({...input,position:pos});
  assert.equal(newer.action,baseline.action,policy);
  assert.equal(newer.reason,baseline.reason,policy);
  assert.equal(newer.invalidation?.price,baseline.invalidation?.price,policy);
  assert.equal(newer.checks.offensiveMaturityBlocksNewAdmission,false);
 }
});
test('Ledger migration carries all state, keys, historical fees and inherited position unchanged',()=>{
 const source=oldPaper.initial(1000);
 source.version=oldPaper.VERSION;source.completed=78;
 source.realizedUsd=-110.7215;source.equityUsd=889.2785;
 source.feesUsd=120.88;source.wins=33;source.losses=45;
 source.usedKeys=['x|1','y|2'];
 source.history=[{tradeNo:77,entryPolicyVersion:old.VERSION,netPnlUsd:-6.1839}];
 source.position={direction:'long',entryAt:500,entryPrice:80000,
  entryPolicyVersion:old.VERSION,invalidationPrice:79700,
  mfePriceUsd:125,gainFloorUsd:90,entryFeeUsd:.75};
 const next=newPaper.migrate(source,8000);
 for(const field of ['completed','realizedUsd','equityUsd','feesUsd','wins','losses'])
  assert.equal(next[field],source[field]);
 assert.deepEqual(next.usedKeys,source.usedKeys);
 assert.deepEqual(next.history,source.history);
 assert.deepEqual(next.position,source.position);
 assert.equal(next.version,newPaper.VERSION);
 assert.equal(next.policyActivatedAt,8000);
 assert.equal(next.brokerOrdersEnabled,false);
 assert.throws(()=>newPaper.migrate({...source,version:'CORRUPT'},8000),/MIGRATION_REFUSED/);
});
test('V543 PAPER hard -500 and 120/90 profit floor protect capital independently',()=>{
 const start=newPaper.initial(100);
 start.policyActivatedAt=100;start.lastObservationAt=100;
 start.position={direction:'long',entryAt:100,entryPrice:80000,lastPrice:80000,
  entryPolicyVersion:active.VERSION,entryFeeUsd:.75,
  mfePriceUsd:0,maePriceUsd:0,gainFloorUsd:0,invalidationPrice:79400};
 const loss=newPaper.step(copy(start),{version:active.VERSION,action:'HOLD',reason:'SLOW',
  phase:'STRUCTURAL_CONTINUATION',price:79499,asOf:300},{price:79499,ts:300,
  sourceAgeMs:0,tickAgeMs:0});
 assert.equal(loss.state.position,null);
 assert.equal(loss.trade.exitReason,'HARD_RISK_500');
 const winning=copy(start);
 newPaper.step(winning,{version:active.VERSION,action:'HOLD',reason:'TEST',
  phase:'STRUCTURAL_CONTINUATION',asOf:301,price:80125},
  {price:80125,ts:301,sourceAgeMs:0,tickAgeMs:0});
 assert.equal(winning.position.gainFloorUsd,90);
 const floor=newPaper.step(winning,{version:active.VERSION,action:'HOLD',reason:'TEST',
  phase:'STRUCTURAL_CONTINUATION',asOf:302,price:80089},
  {price:80089,ts:302,sourceAgeMs:0,tickAgeMs:0});
 assert.equal(floor.trade.exitReason,'GAIN_FLOOR_120_90_OR_220_180');
});
test('Paper step writes new V5.4.3 entry policy without erasing existing anti-churn keys',()=>{
 const s=newPaper.initial(100);s.startedAt=100;s.policyActivatedAt=100;
 const decision={version:active.VERSION,action:'ENTER_LONG',reason:'TEST',
  phase:'STRUCTURAL_REVERSAL_FORMING',quality:'DATA_OK',asOf:300,
  price:80000,entryKey:'long|200|forming|retest:230',
  invalidation:{price:79700,reference:'LOCAL_RETEST'},
  readings:{geometry:{cross3:{ts:200}},
   structural54:{campaignId:'short|E15:100'},
   maturity:{requalified:false},evidenceSincePolicy:{qualified:true},
   mcb15:{},place:{},conversion:{}}};
 const out=newPaper.step(s,decision,{price:80000,ts:300,sourceAgeMs:0,tickAgeMs:0});
 assert.equal(out.reason,'ENTER_PAPER');
 assert.equal(s.position.entryPolicyVersion,active.VERSION);
 assert.equal(s.position.direction,'long');
 assert.ok(s.usedKeys.includes(decision.entryKey));
 const second=newPaper.step(s,{...decision,action:'HOLD'},
  {price:80005,ts:301,sourceAgeMs:0,tickAgeMs:0});
 assert.equal(second.reason,'HOLD_CAMPAGNE');
 assert.equal(s.usedKeys.filter(x=>x===decision.entryKey).length,1);
});

test('Late OFFENSIVE memory survives a transient favourable PM tick on SAME E3',()=>{
 const {decision,input}=archived(78);
 const first=m.evaluate({decision,input});
 const f=active.reconcile({reading:first,now:decision.asOf,
  structural:decision.readings.structural54,
  conversion:decision.readings.conversion});
 assert.equal(f.deferNewEntry,true);
 assert.equal(f.episode.status,'DEFERRED');
 const subsequent=copy(decision);
 subsequent.readings.conversion.pmSinceBaton=0.1;
 const next=m.evaluate({decision:subsequent,input});
 assert.equal(next.deferNewEntry,false,'a single favourable PM tick lifts instant exhaustion');
 const held=active.reconcile({reading:next,prior:f.episode,
  now:decision.asOf+10000,
  structural:subsequent.readings.structural54,
  conversion:subsequent.readings.conversion});
 assert.equal(held.deferNewEntry,true,
  'same historical offensive is still deferred until independent new proof');
 assert.equal(held.persistentWait,true);
});
test('A new E3 cross by itself CANNOT erase same-campaign prior late-offensive memory',()=>{
 const {decision,input}=archived(78);
 const first=active.reconcile({reading:m.evaluate({decision,input}),
  now:decision.asOf,structural:decision.readings.structural54,
  conversion:decision.readings.conversion});
 const next=copy(decision);
 next.readings.structural54.mcb3.cross.ts=decision.asOf+180000;
 next.readings.conversion.pmSinceBaton=12.1;
 const resumed=active.reconcile({reading:m.evaluate({decision:next,input}),
  prior:first.episode,now:decision.asOf+180000,
  structural:next.readings.structural54,conversion:next.readings.conversion});
 assert.equal(resumed.deferNewEntry,true,'new 3m oscillator event alone is not price-phase renewal');
});
test('Deferral is requalified only by a NEW defended retest plus productive marginal PM',()=>{
 const {decision,input}=archived(78);
 const first=active.reconcile({reading:m.evaluate({decision,input}),
  now:decision.asOf,structural:decision.readings.structural54,
  conversion:decision.readings.conversion});
 const next=copy(decision);
 next.readings.conversion.pmSinceBaton=25;
 next.readings.conversion.pmCombined=31;
 next.readings.structural54.testedTerritory={validated:true,source:'DEFENDED_RETEST',
  availableAt:decision.asOf+12*60000,
  retest:{retestAt:decision.asOf+6*60000,heldAt:decision.asOf+12*60000}};
 const ready=active.reconcile({reading:m.evaluate({decision:next,input}),
  prior:first.episode,now:decision.asOf+12*60000,
  structural:next.readings.structural54,conversion:next.readings.conversion});
 assert.equal(ready.deferNewEntry,false);
 assert.equal(ready.requalified,true);
 assert.equal(ready.episode.status,'REQUALIFIED');
 assert.equal(ready.episode.requalificationProof,'POST_DEFERRAL_NEW_DEFENDED_RETEST_PLUS_PM');
});
test('New LBW15 confirmation AND productive marginal PM may independently requalify',()=>{
 const {decision,input}=archived(78);
 const oldReading=m.evaluate({decision,input});
 const first=active.reconcile({reading:oldReading,
  now:decision.asOf,structural:decision.readings.structural54,
  conversion:decision.readings.conversion});
 const next=copy(decision);
 next.readings.structural54.currentLbw15=70;
 next.readings.conversion.pmSinceBaton=20;
 next.readings.conversion.pmCombined=31;
 const ready=active.reconcile({reading:m.evaluate({decision:next,input}),
  prior:first.episode,now:decision.asOf+120000,
  structural:next.readings.structural54,conversion:next.readings.conversion});
 assert.equal(ready.deferNewEntry,false);
 assert.equal(ready.requalified,true);
 assert.equal(ready.episode.requalificationProof,'LBW15_REGAINS_CONFIRMED_EXTREME_PLUS_PM');
});
test('Deferred candidate memory never vetoes a DIFFERENT direction nor a new parent campaign',()=>{
 const {decision,input}=archived(78);
 const first=active.reconcile({reading:m.evaluate({decision,input}),
  now:decision.asOf,structural:decision.readings.structural54,
  conversion:decision.readings.conversion});
 const opp={...m.evaluate({decision,input}),candidate:'short',deferNewEntry:false};
 const opposite=active.reconcile({reading:opp,prior:first.episode,
  now:decision.asOf+30000,structural:decision.readings.structural54,
  conversion:decision.readings.conversion});
 assert.equal(opposite.deferNewEntry,false);
 assert.equal(opposite.episode.status,'DEFERRED','opposing candidate warning remembered silently');
 const updated={...decision.readings.structural54,campaignId:'new-long-campaign'};
 const fresh=active.reconcile({reading:{...opp,candidate:'long'},prior:first.episode,
  now:decision.asOf+90000,structural:updated,
  conversion:decision.readings.conversion});
 assert.equal(fresh.deferNewEntry,false);
 assert.equal(fresh.episode,null,'a real new 15m parent campaign resets prior memory');
});
test('Runner persists episode transitions immediately, no second active trading engine',()=>{
 const fs=require('fs'),path=require('path');
 const runner=fs.readFileSync(path.resolve(__dirname,'../../modules/v5/runner-v543.js'),'utf8');
 assert.ok(runner.includes('previousOffensiveMaturity:s.offensiveMaturityMemory||null'));
 assert.ok(runner.includes('s.offensiveMaturityMemory=d.readings?.offensiveMaturityMemory||null'));
 assert.ok(runner.includes('result.event||maturityStateChanged||received-lastSave>=30000'));
 assert.ok(runner.includes("decision=require('./decision-v543'),paper=require('./paper-v543')"));
 assert.ok(!runner.includes('BROKER_API_SECRET'));
});
