'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const I=require('../modules/attention/boonolab-wave-geometry-interpreter');
const P=require('../modules/attention/boonolab-market-practicability-shadow');
const {dataset}=require('../scripts/boonolab-practicability-shadow-replay');
const ROOT=path.resolve(__dirname,'..');
const now=Date.parse('2026-11-22T14:00:00+01:00');
function geometry({gap=1,velocity=1.2,accel=.4,initialSpeed=.2,
 crossAgoMin=2,priceResponse=70,lbw3=.9,lbw15=.3,
 recentCrosses=1,nearContact=.2}={}){
 const crossAt=now-crossAgoMin*60000;
 return {version:'boonolab-wave-geometry-signature-v0.1',
  asOf:now,available:true,
  current:{lbw15:20,bw15:20-gap,gap15:gap,
   positionInObserved8hLBWRange:.45,observedMinLBW:-80,
   observedMaxLBW:80,minutesSinceObservedHigh:95,
   minutesSinceObservedLow:15},
  kinetics:{lbwSpeed3mPerMin:lbw3,
   lbwSpeed15mPerMin:lbw15,bwSpeed3mPerMin:lbw3-velocity,
   gapSpeed3mPerMin:velocity,gapSpeed15mPerMin:.4,
   gapAccelPerMin2:accel,
   normalizedAngleNow:{relativeAngleDeg:8.5,
    normalization:{mcbAmplitudeRange:80,horizontalTimeMin:15}}},
  morphology:{recentSegments:[
   {direction:'DN',startAt:now-15*60000,endAt:now-9*60000,
    durationMin:6,lbwTravel:-3,priceTravelUsd:-35},
   {direction:'UP',startAt:now-9*60000,endAt:now,
    durationMin:9,lbwTravel:7,priceTravelUsd:priceResponse}],
   lastSegment:{direction:'UP',startAt:now-9*60000,
    endAt:now,durationMin:9,lbwTravel:7,priceTravelUsd:priceResponse},
   lastTurnAt:now-9*60000,
   lastCross:{at:crossAt,to:'UP',
    angle:{gapSpeed:initialSpeed,relativeAngleDeg:3.5}},
   sinceLastCross:{priceMoveInCrossDirectionUsd:priceResponse,
    highestFavorablePriceUsd:Math.max(priceResponse,1),
    highestAdversePriceUsd:20,
    retainedFavorableFraction:priceResponse>=0?.95:0,
    mf15Delta:3.3},
   crossEventsLastHour:recentCrosses,
   nearContactFractionLastHour:nearContact}};
}
const market={recent30m:{complete:true,efficiency:.15,retained:.82},
 quick6m:{complete:true,efficiency:.16,retained:.9}};
function explain(g,ctx={}){
 return I.interpret({waveGeometry:g,measurements:market,
  higher:ctx.higher||{},place:ctx.place||null});
}
test('weak young cross that OPENs and accelerates differs from steep fading cross',()=>{
 const weak=explain(geometry());
 assert.equal(weak.phase,'CROSS_LIVE_NAISSANT_EN_OUVERTURE');
 assert.equal(weak.dynamics.developmentalContrast,
  'CROISEMENT_DONT_L_OUVERTURE_ACCELERE');
 assert.equal(weak.dynamics.currentVsInitialCrossSpeed,'PLUS_RAPIDE');
 assert.equal(weak.economic.priceTranslation,'PRIX_ACCOMPAGNE_CROSS');
 const strong=explain(geometry({gap:18,velocity:-.8,accel:-.4,
  initialSpeed:4,crossAgoMin:8,priceResponse:20}));
 assert.equal(strong.phase,'SEPARATION_QUI_SE_REFERME');
 assert.equal(strong.dynamics.developmentalContrast,
  'CROISEMENT_DEJA_EN_REFERMETURE');
 assert.equal(strong.dynamics.closing,true);
 assert.equal(weak.brokerOrdersEnabled,false);
 assert.equal(strong.decisionImpact,false);
});
test('local price translation is NOT conflated with poor prior 30m economy',()=>{
 const g=geometry();
 const x=I.interpret({waveGeometry:g,
  measurements:{recent30m:{complete:true,efficiency:.01,retained:.18}}});
 assert.equal(x.phase,'CROSS_LIVE_NAISSANT_EN_OUVERTURE');
 assert.equal(x.economic.priceTranslation,'PRIX_ACCOMPAGNE_CROSS');
 assert.equal(x.economic.economy,'FAIBLE_CONSERVATION_DU_TERRITOIRE');
 assert.equal(x.hypothesis,'OFFENSIVE_LOCALEMENT_PRODUCTIVE_MARCHE_GLOBAL_INCERTAIN');
});
test('a local upward LBW turn against a downward fifteen-minute wave is recognized',()=>{
 const g=geometry({gap:-3,velocity:.2,lbw3:.15,lbw15:-.5,
  priceResponse:-50,crossAgoMin:32});
 const i=explain(g);
 const c=I.assessCandidate(i,'long');
 assert.equal(c.status,'ROTATION_COURTE_CONTRE_TRAJECTOIRE_15M_AVANT_CROSS');
 assert.equal(c.preCross,true);
 assert.equal(c.supportsLbw3m,true);
 assert.equal(c.supportsLbw15m,false);
 assert.equal(c.brokerOrdersEnabled,false);
});
test('a strong cross opposed by higher horizon is a CONFLICT, not a SHORT guarantee',()=>{
 const i=explain(geometry({gap:-15,velocity:-1,
  lbw3:-1.5,lbw15:-1.2,priceResponse:-300}),
  {higher:{slowDir:'long',priceWaveOpposition:true}});
 const c=I.assessCandidate(i,'short');
 assert.equal(c.status,'CROSS_ALIGNE_MAIS_CONFLIT_E1_E4');
 assert.equal(c.slowContextContrary,true);
 assert.equal(i.higherContext.oppositeToSlowContext,true);
 assert.ok(i.narrative.includes('E1_E4_CONTEXT_CONTRADICTORY'));
});
test('semantic observer preserves distinct episodes and accumulates phase duration',()=>{
 const state=I.initial(now-1000000),a=explain(geometry());
 assert.equal(I.observe(state,a).accepted,true);
 assert.equal(I.observe(state,a).accepted,false);
 const b=explain({...geometry({gap:5,velocity:.1,accel:-.3,
  crossAgoMin:9}),asOf:now+30000});
 assert.equal(I.observe(state,b).accepted,true);
 assert.equal(state.episodeNo,2);
 assert.ok(state.completedEpisodes.length>=1);
 assert.ok(state.phaseDurationsMs[a.phase]>=30000);
 assert.ok(state.changes.length>=2);
 assert.equal(state.decisionImpact,false);
 assert.equal(state.brokerOrdersEnabled,false);
});
test('outdated geometry remains unavailable rather than invented narrative',()=>{
 const i=I.interpret({waveGeometry:{
  asOf:now,available:false,version:'boonolab-wave-geometry-signature-v0.1'}});
 assert.equal(i.available,false);
 assert.equal(i.phase,'OBSERVATION_INSUFFISANTE');
 assert.equal(i.brokerOrdersEnabled,false);
});
test('real historical V553 #43 #58 #61 #62-64 #65 geometry produces source ASOF semantic phases',()=>{
 const raw=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v553-paper-state.json')));
 const rows=dataset();
 for(const n of [43,58,61,62,63,64,65]){
  const t=raw.history.find(x=>x.tradeNo===n);
  assert.ok(t);
  const x=P.evaluate({audit:rows,asOf:t.entryAt});
  const i=x.waveInterpretation;
  assert.equal(i.available,true);
  assert.equal(i.asOf,t.entryAt);
  assert.ok(i.milestones.every(e=>e.at<=t.entryAt));
  assert.equal(i.brokerOrdersEnabled,false);
  assert.equal(i.decisionImpact,false);
  const c=I.assessCandidate(i,t.direction);
  if([62,63,64].includes(n))
   assert.equal(c.status,'ROTATION_COURTE_CONTRE_TRAJECTOIRE_15M_AVANT_CROSS');
  if(n===43||n===61)
   assert.equal(i.hypothesis,
    'OFFENSIVE_LOCALEMENT_PRODUCTIVE_MARCHE_GLOBAL_INCERTAIN');
  if(n===58)assert.equal(i.phase,'CROSS_LIVE_NAISSANT_EN_OUVERTURE');
 }
});
test('semantic shadow wiring does not import or alter V553 PAPER policy',()=>{
 const src=fs.readFileSync(path.join(ROOT,'modules/v553/decision.js'),'utf8');
 const module=fs.readFileSync(path.join(ROOT,'modules/attention/boonolab-wave-geometry-interpreter.js'),'utf8');
 assert.ok(!src.includes('boonolab-wave-geometry-interpreter'));
 for(const v of ['require(\'../v553', 'paper.step(',
  'brokerOrdersEnabled:true','sendOrder('])
  assert.equal(module.includes(v),false,v);
});
test('old practicability SHADOW state migrates its semantic memory without resetting counters',()=>{
 const state=P.initial(now-7*60000),x=P.evaluate({
  audit:require('../scripts/boonolab-practicability-shadow-replay').dataset(),
  asOf:Date.parse('2026-11-22T13:35:18+01:00')});
 assert.ok(x.waveInterpretation.available);
 delete state.semantic;
 state.totalSamples=1000;
 state.coveredSamples=998;
 assert.equal(P.observe(state,x),true);
 assert.equal(state.totalSamples,1001);
 assert.equal(state.coveredSamples,999);
 assert.equal(state.semantic.version,I.VERSION);
 assert.equal(state.semantic.decisionImpact,false);
 assert.equal(state.semantic.brokerOrdersEnabled,false);
 assert.ok(state.last.waveInterpretation.phase);
 const v=P.summary(state);
 assert.equal(v.semantic.version,I.VERSION);
 assert.equal(v.semantic.phase,state.semantic.last.phase);
});
test('relative intensity is calibrated against actually observed gap-speed history, never a fixed entry gate',()=>{
 const W=require('../modules/attention/boonolab-wave-geometry');
 const rows=dataset();
 const a=Date.parse('2026-11-22T13:35:18+01:00');
 const g=W.compute(rows,a),q=I.interpret({waveGeometry:g});
 assert.ok(g.kinetics.p75AbsGapSpeed3mObserved8h>0);
 assert.ok(Number.isFinite(g.kinetics.gapSpeedVs8hP75));
 assert.equal(q.dynamics.relativeGapSpeedVsObservedP75,g.kinetics.gapSpeedVs8hP75);
 assert.equal(q.decisionImpact,false);
 assert.ok(['VITESSE_RELATIVE_FAIBLE','VITESSE_RELATIVE_MODEREE',
  'VITESSE_RELATIVE_SUPERIEURE_A_P75'].includes(q.dynamics.relativeIntensity));
 assert.ok(q.narrative.includes('Vitesse relative'));
});
test('past/current crossing angles use the SAME per-snapshot amplitude calibration for comparison',()=>{
 const W=require('../modules/attention/boonolab-wave-geometry');
 const rows=dataset(),at=Date.parse('2026-11-21T03:16:48+01:00');
 const g=W.compute(rows,at);
 assert.ok(g.morphology.lastCross.angleComparableAtCurrentScale);
 const first=g.morphology.lastCross.angleComparableAtCurrentScale;
 const last=g.kinetics.normalizedAngleNow;
 assert.equal(first.normalization.mcbAmplitudeRange,
  last.normalization.mcbAmplitudeRange);
 assert.equal(first.normalization.horizontalTimeMin,
  last.normalization.horizontalTimeMin);
 const i=I.interpret({waveGeometry:g});
 assert.equal(i.dynamics.crossRelativeAngleSameAsOfScale,
  first.relativeAngleDeg);
});
