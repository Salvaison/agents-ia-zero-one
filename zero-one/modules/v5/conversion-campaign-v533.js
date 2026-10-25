'use strict';
// BOONO V5.3.3: conversion is a tactical OBSERVATION, not MCB15 authority.
// Preserve productive impulse memory across INEFFICIENT / CONTESTED snapshots.
// No I/O, no orders, no state writes. Event times are observedAt, not sourceTs.
const V='v533-conversion-campaign-memory';
const LONG_QUALITIES=new Set(['EASY','PRODUCTIVE','POWERFUL','EXCEPTIONAL']);
const QUAL_SCORE={EASY:1,PRODUCTIVE:2,POWERFUL:3,EXCEPTIONAL:4};
const n=x=>x===null||x===undefined||x===''?null:
 Number.isFinite(Number(x))?Number(x):null;
const opposite=d=>d==='long'?'short':d==='short'?'long':null;
const last=a=>a.at(-1)||null;
function assess(input,base,dir){
 const now=n(input?.now),q=base?.readings?.e15Requalification||{},
  guards=q.guards||{},g=base?.readings?.geometry||{};
 const invalid={version:V,asOf:now,direction:dir||null,
  thesis:'NOT_ESTABLISHED',engaged:false,
  timing:'NO_FRESH_PROOF',canRenewEntry:false,
  note:'An isolated conversion label never has authority to cancel MCB15'};
 if(now===null||!['long','short'].includes(dir))return invalid;
 const events=(input.causalEvents||[]).filter(x=>x&&n(x.observedAt)!==null&&
     x.observedAt<=now)
   .sort((a,b)=>a.observedAt-b.observedAt);
 const e15At=n(q.e15ObservedAt),cross3At=n(q.mcb3CrossAt);
 if(e15At===null)return {
  ...invalid,thesis:'MCB15_NO_OBSERVED_E15_CAMPAIGN'};
 const confirmOpp=last(events.filter(e=>e.family==='MCB15'&&e.key==='E15'&&
   e.type==='CONFIRMED'&&e.direction===opposite(dir)&&e.observedAt>e15At));
 // The E3 cross and a new E15 link a causal episode. Keep the prior
 // productive conversion event, without requiring a new POWERFUL after
 // every inefficient Baton; reset only on real opposing MCB15 proof.
 const previousOpp=last(events.filter(e=>e.family==='MCB15'&&e.key==='E15'&&
   e.type==='CONFIRMED'&&e.direction===opposite(dir)&&e.observedAt<=e15At));
 const previousCross=last(events.filter(e=>e.family==='MCB3'&&
   e.key==='BW_LBW_CROSS'&&e.type==='OBSERVED'&&e.direction===dir&&
   e.observedAt<=e15At&&
   (!previousOpp||e.observedAt>previousOpp.observedAt)));
 // The episode is anchored to the earlier tactical cross: a later E3
 // respiration cannot erase the established MCB15 phase.
 const episodeStart=previousCross?.observedAt||
   (cross3At!==null&&cross3At<=e15At?cross3At:e15At);
 const conversion=events.filter(e=>e.family==='CONVERSION'&&
   e.key==='CONVERSION'&&e.type==='TRANSITION'&&e.quality&&
   e.observedAt>=episodeStart);
 const current=last(conversion);
 const aligned=conversion.filter(e=>e.direction===dir&&LONG_QUALITIES.has(e.quality));
 const firstStrong=aligned[0]||null,latestStrong=last(aligned);
 const peak=aligned.reduce((a,e)=>!a||
   QUAL_SCORE[e.quality]>QUAL_SCORE[a.quality]?e:a,null);
 const lastPowerful=last(aligned.filter(e=>QUAL_SCORE[e.quality]>=3));
 const structuralOpponent=!!confirmOpp;
 const mcbThesis=!!(firstStrong&&!structuralOpponent);
 const conversionAdverse=!!(current&&current.direction===opposite(dir)&&
   LONG_QUALITIES.has(current.quality));
 const quality=current?.quality||'UNKNOWN';
 const inRespiration=mcbThesis&&
   (quality==='INEFFICIENT'||quality==='CONTESTED'||quality==='SILENT');
 const sideAligned=base.readings?.mcb15?.currentOffensive===dir;
 const guarded=!!(guards.geometry3&&guards.e3Confirmed&&
   guards.liveOrConfirmed&&guards.newE15&&guards.mfStrong&&
   guards.pmProductive&&guards.notExhausted&&
   guards.maNotProvenResistance&&guards.hardRiskOK&&guards.fresh&&
   guards.proofAfterActivation);
 // Opposite conversion is a timing warning, not an MCB15 invalidation.
 const canRenewEntry=!!(mcbThesis&&guarded&&!conversionAdverse&&
   !base.readings?.maContract?.entryGate?.block&&
   n(q.proofAt)!==null&&q.proofAt>=input.startedAt);
 const timing=canRenewEntry?'ENTRY_ALLOWED_ON_MCB15_AND_PM':
  !mcbThesis?(structuralOpponent?'PROVEN_OPPOSING_E15':'AWAIT_PRODUCTIVE_EPISODE'):
  !guards.notExhausted?'NO_LATE_ENTRY_PHASE_ADVANCED':
  conversionAdverse?'WAIT_OPPOSING_CONVERSION':
  !guards.pmProductive?'WAIT_PM_RESPIRATION':
  !guards.mfStrong?'WAIT_MF_COHERENCE':
  !guards.liveOrConfirmed?'WAIT_MCB15_TRANSITION':
  !guards.maNotProvenResistance?'WAIT_PROVEN_MA_REJECTION':
  !guards.hardRiskOK?'WAIT_STRUCTURAL_RISK':
  'WAIT_OTHER_CAUSAL_PROOF';
 return {
  version:V,asOf:now,direction:dir,
  thesis:mcbThesis?'MCB15_PRODUCTIVE_CAMPAIGN_ENGAGED':
   structuralOpponent?'MCB15_OPPOSING_CONFIRMED':'AWAIT_PRODUCTIVE_MCB15_EVIDENCE',
  engaged:mcbThesis,
  strategicCurrentDirection:base.readings?.mcb15?.currentOffensive||null,
  strategicAligned:sideAligned,
  e15ProofAt:e15At,e3CrossAt:cross3At,
  episodeStartAt:episodeStart,
  firstProductiveAt:firstStrong?.observedAt||null,
  lastProductiveAt:latestStrong?.observedAt||null,
  lastPowerfulAt:lastPowerful?.observedAt||null,
  peakQuality:peak?.quality||null,
  currentQuality:quality,
  currentDirection:current?.direction||null,
  currentObservedAt:current?.observedAt||null,
  moment:inRespiration?'RESPIRATION_AFTER_PRODUCTIVE_IMPULSE':
    conversionAdverse?'OPPOSING_CONVERSION_TO_ASSESS':
    mcbThesis?'CAMPAIGN_ENGAGED':'NO_PRODUCTIVE_MEMORY',
  lastConfirmedOpposingE15At:confirmOpp?.observedAt||null,
  conversionIsNotStructuralInvalidation:true,
  conversionAdverse,
  canRenewEntry,timing,
  guards:{...guards,memoryProductive:!!latestStrong,
   opposingE15Confirmed:structuralOpponent,
   opposingConversion:conversionAdverse},
  note:'INEFFICIENT/CONTESTED modify timing and conversion yield, never erase valid MCB15/E3/MF campaign proof'
 };
}
module.exports={V,assess};
