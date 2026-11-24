'use strict';
// Interpret two simultaneous hypotheses against separate causal references.
// Descriptions are deliberately not action, probability, score or permission.
const {finite,r}=require('./boonolab-wave-geometry-v02');
const VERSION='boonolab-wave-interpreter-v0.2';
const sg=d=>d==='UP'?1:-1;
function view(s,h,g){
 const a=h.active,d=sg(h.direction),p=a.progress;
 const cross=a.liveCrosses.at(-1)||null;
 const signedCross=cross?d*(g.price-cross.price):null;
 const gapVelocity=g.k[3].G,lbwVelocity=g.k[3].L,bwVelocity=g.k[3].B;
 const alignment=g.gapSide===h.direction;
 const evolution=gapVelocity===null?'NON_MESUREE':gapVelocity*d>0?
  (alignment?'OUVERTURE_DANS_LE_SENS':'RAPPROCHEMENT_VERS_CROSS'):gapVelocity*d<0?
  (alignment?'REFERMETURE_DE_LA_SEPARATION':'ELOIGNEMENT_DU_CROSS'):'ECART_STABLE';
 const participants={LBW:finite(lbwVelocity)?r(d*lbwVelocity):null,BW:finite(bwVelocity)?r(-d*bwVelocity):null};
 const priceState=p.price<0?'PRIX_CONTREDIT_HYPOTHESE':p.price===0?'PAS_DE_TRANSLATION_NETTE':
  p.retained!==null&&p.retained<1?'TRANSLATION_PARTIELLEMENT_RESTITUEE':'TRANSLATION_A_L_EXTREME_OBSERVE';
 const rival=g.gapSide&&g.gapSide!==h.direction;
 const relation=s.confirmedE15?.direction===h.direction?'DANS_LE_SENS_E15':
  s.confirmedE15?.direction?'CONTRE_E15':'E15_INCONNU';
 const initiative=h.initiative;
 const summary={initiative:initiative?{id:initiative.id,origin:initiative.origin,originKind:initiative.originKind,
  parentAtBirth:initiative.parentAtBirth,progress:initiative.progress,peak:initiative.peak,trough:initiative.trough,
  crosses:initiative.crosses,confirmedCrosses:initiative.confirmedCrosses,nativeE15:initiative.nativeE15,
  rotationsObserved:initiative.rotations.length,coverageInterrupted:!!initiative.coverageInterrupted}:null,
  priorInitiatives:h.priorInitiatives.slice(-3).map(q=>({id:q.id,origin:q.origin,progress:q.progress,peak:q.peak,closedAt:q.closedAt})),
  previousCrossEpisodes:h.crossEpisodes.slice(-3).map(q=>({event:q.event,progress:q.progress,endedAt:q.endedAt})),
  direction:h.direction,trackId:h.id,attemptId:a.id,attemptOrdinal:h.attemptCount,
  origin:a.origin,firstObservedOrigin:h.firstOrigin,firstObservedInflexion:h.firstInflexion,originKind:a.originKind,originProvenance:a.provenance,
  parentAtBirth:a.parentE15AtBirth,relationToCurrentE15:relation,
  priorAttempts:h.previous.slice(-4).map(q=>({id:q.id,origin:q.origin,peak:q.peak,progress:q.progress,
   closedAt:q.closedAt,coverageInterrupted:!!q.coverageInterrupted})),
  lastCrossInAttempt:cross,liveCrosses:a.liveCrosses,confirmedCrosses:a.confirmedCrosses,
  persistentCrossAnchor:h.crossAnchor,priorCrossHistory:h.crossHistory.slice(-8),priorConfirmedHistory:h.confirmedHistory.slice(-8),priorNativeHistory:h.nativeHistory.slice(-8),
  nativeConfirmations:a.nativeE15Events,lastOppositeCross:a.lastOppositeCross??null,
  evolution,participants,priceState,fromInflexion:p,
  priceSinceOwnCross:r(signedCross,2),priceSincePersistentCross:h.crossAnchor?.progress?.price??null,crossAgeMin:cross?r((g.sourceAt-cross.sourceAt)/60000,2):null,
  extrema:{pricePeak:a.peak,priceAdverse:a.trough,LBWhigh:a.highestL,LBWlow:a.lowestL,
   BWhigh:a.highestB,BWlow:a.lowestB,maxSignedGap:a.maxSignedGap,minSignedGap:a.minSignedGap},
  frontier:a.frontier,nearestPreviousExtreme:a.nearestPreviousExtreme,nearestPairedExtreme:a.nearestPairedExtreme,
  support:a.lastSupport,supportHistory:a.supportChanges.slice(-8),coverageInterrupted:!!a.coverageInterrupted,
  role:rival?'HYPOTHESE_CONTRE_POLARITE_LIVE':alignment?'HYPOTHESE_DANS_POLARITE_LIVE':'POLARITE_INCONNUE'};
 const fmt=x=>finite(x)?String(r(x,2)):'non mesuré';
 summary.narrative=h.direction+' : '+evolution+', depuis '+a.originKind+
  ' ('+fmt(p.ageMin)+' min), LBW '+fmt(p.L)+', BW '+fmt(p.B)+
  ', translation signée BTC '+fmt(p.price)+' $, maximum '+fmt(p.favorable)+' $, '+priceState+
  '. '+relation+'. '+(summary.nearestPairedExtreme?
  'Référence de prix antérieure '+fmt(summary.nearestPairedExtreme.ref.price)+
  ' $, distance '+fmt(summary.nearestPairedExtreme.priceDifference)+' $, différence LBW '+fmt(summary.nearestPairedExtreme.lbwDifference)+'. ':'')+
  (cross?'Cross propre observé dans la tentative, translation depuis ce Cross '+fmt(signedCross)+' $.':
   'Pas de nouveau Cross propre enregistré dans cette tentative.')+
  (initiative?' Initiative '+initiative.id+' depuis '+initiative.originKind+' : '+fmt(initiative.progress?.ageMin)+
   ' min, prix signé '+fmt(initiative.progress?.price)+' $, maximum '+fmt(initiative.progress?.favorable)+' $.':' Origine de l initiative non observée.')+
  ' Soutiens/contestations : E3 '+(a.lastSupport?.E3_geometry??'UNKNOWN')+
  ', PM3 '+(a.lastSupport?.PM3??'UNKNOWN')+', MF15 '+(a.lastSupport?.MF15??'UNKNOWN')+
  ', E1 '+(a.lastSupport?.E1??'UNKNOWN')+', E4 '+(a.lastSupport?.E4??'UNKNOWN')+'.';
 return summary;
}
function interpret(s){
 if(!s?.latestGeometry||!s.hypotheses.UP.active||!s.hypotheses.DN.active)return {version:VERSION,available:false};
 const g=s.latestGeometry;
 const hypotheses=Object.fromEntries(['UP','DN'].map(d=>[d,view(s,s.hypotheses[d],g)]));
 const priceSinceE15=s.confirmedE15?.priceAtObservation;
 return {version:VERSION,available:true,asOf:s.lastKnownAt,sourceAt:g.sourceAt,mode:'SHADOW_ONLY',
  decisionImpact:false,brokerOrdersEnabled:false,authority:'DESCRIPTIVE_NO_ENTRY_EXIT_OR_SCORE',
  parentE15:s.confirmedE15,liveCross:s.lastCross,confirmedCross:s.lastConfirmedCross,
  priceSinceE15Observation:finite(priceSinceE15)?r(g.price-priceSinceE15,2):null,
  contexts:s.confirmed,native:s.native,geometry:g,hypotheses,
  observationCounts:{all:s.observations,live:s.liveObservations,bootstrap:s.bootstrapObservations,recovered:s.recoveryObservations},
  caveats:['No future Bézier fit; discrete as-of slopes and acceleration',
   'Slope rotation is an observed candidate, not a validated strategic transfer',
   'Prior territory distance and crossing are descriptive, not proof of acceptance',
   'Historical bootstrap and replay use bar-close proxies, not original first publication',
   'No trade, P&L, position or decision in this layer']};
}
module.exports={VERSION,interpret};
