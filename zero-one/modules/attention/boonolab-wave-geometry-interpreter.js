'use strict';
// BOONOLAB: read-only semantic interpretation of observed LBW15/BW15 geometry.
// It describes a CURRENT PROCESS, its origin, evolution, contestation and
// economic translation. No trading instruction, score threshold or broker.
const VERSION='boonolab-wave-geometry-interpreter-v0.1';
const MIN=60000;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const rnd=(v,n=3)=>finite(v)?Math.round(v*10**n)/10**n:null;
const sgn=v=>finite(v)?v>0?1:v<0?-1:0:0;
const dir=v=>v>0?'UP':v<0?'DN':null;
const opposite=x=>x==='UP'?'DN':x==='DN'?'UP':null;
const wording={UP:'haussière',DN:'baissière'};
function interpret({waveGeometry:g,measurements={},higher={},place=null}={}){
 if(!g||g.available!==true||g.version!=='boonolab-wave-geometry-signature-v0.1')
  return {version:VERSION,asOf:g?.asOf||null,available:false,
   phase:'OBSERVATION_INSUFFISANTE',decisionImpact:false,
   brokerOrdersEnabled:false,reason:'WAVE_MORPHOLOGY_ASOF_UNAVAILABLE'};
 const c=g.current,k=g.kinetics,m=g.morphology;
 const gap=c.gap15, v3=k.gapSpeed3mPerMin,
 v15=k.gapSpeed15mPerMin, a3=k.gapAccelPerMin2;
 const lbw3=k.lbwSpeed3mPerMin,lbw15=k.lbwSpeed15mPerMin;
 const side=dir(sgn(gap)),trend=dir(sgn(lbw3)),
 relativeMotion=dir(sgn(v3));
 const cross=m.lastCross||null,post=m.sinceLastCross||null;
 const crossed=!!cross&&cross.at<=g.asOf;
 const sinceCross= crossed?rnd((g.asOf-cross.at)/MIN,2):null;
 const lastSeg=m.lastSegment;
 const lastTurn=m.lastTurnAt;
 const sideSign=sgn(gap)||0;
 const expanding=sideSign!==0&&sgn(v3)===sideSign;
 const contracting=sideSign!==0&&sgn(v3)===-sideSign;
 const accelerating=expanding&&sgn(a3)===sideSign;
 const decelerating=expanding&&sgn(a3)===-sideSign;
 const crossSpeed=cross?.angleComparableAtCurrentScale?.gapSpeed??
  cross?.angle?.gapSpeed;
 const crossSpeedNowComparison=finite(crossSpeed)&&finite(v3)&&
  crossed&&sideSign!==0&&sgn(crossSpeed)===sideSign?
  Math.abs(v3)>Math.abs(crossSpeed)?'PLUS_RAPIDE':
  Math.abs(v3)<Math.abs(crossSpeed)?'MOINS_RAPIDE':'STABLE':
  'NON_COMPARABLE';
 const shortReversing=sgn(lbw3)!==0&&sgn(lbw15)!==0&&
  sgn(lbw3)!==sgn(lbw15);
 const priorLeg=Array.isArray(m.recentSegments)&&m.recentSegments.length>1?
  m.recentSegments.at(-2):null;
 const latestLegDuration=lastSeg?.durationMin??null;
 const hasContact=finite(m.nearContactFractionLastHour);
 const nearContact=hasContact&&m.nearContactFractionLastHour>.5;
 const repeatedCross=finite(m.crossEventsLastHour)&&m.crossEventsLastHour>=3;
 // These descriptive vocabulary bands are NOT optimized admission thresholds.
 const oscilling=nearContact&&repeatedCross;
 const shortTurn=!!(lastSeg&&priorLeg&&
   lastSeg.direction!==priorLeg.direction);
 const phase=oscilling&&(!expanding||contracting)?
  'CONFRONTATIONS_REPETEES':
  side&&relativeMotion===opposite(side)?
  'SEPARATION_QUI_SE_REFERME':
  crossed&&sinceCross!==null&&sinceCross<=3&&expanding?
  'CROSS_LIVE_NAISSANT_EN_OUVERTURE':
  expanding&&accelerating?'SEPARATION_ACCELERANTE':
  expanding&&decelerating?'SEPARATION_QUI_RALENTIT':
  expanding?'SEPARATION_EN_COURS':
  side&&trend&&trend!==side&&
    relativeMotion===trend?'INFLEXION_AVANT_CROISEMENT':
  shortTurn?'INFLEXION_DE_TRAJECTOIRE':
  'GEOMETRIE_NON_RESOLUE';
 // Cross age is not a trading cooldown; this phase name is descriptive.
 // Do not assume the last 8h includes the wave's actual origin.
 const loc=c.positionInObserved8hLBWRange;
 const maturity= !finite(loc)?'POSITION_INCONNUE':
  loc>=.8?'ZONE_HAUTE_DE_L_AMPLITUDE_OBSERVEE':
  loc<=.2?'ZONE_BASSE_DE_L_AMPLITUDE_OBSERVEE':
  'ZONE_CENTRALE_DE_L_AMPLITUDE_OBSERVEE';
 const priceDir=sgn(post?.priceMoveInCrossDirectionUsd);
 const retained=post?.retainedFavorableFraction;
 const priceTranslation= !cross||!post?
  'HISTOIRE_DEPUIS_CROSS_NON_DISPONIBLE':
  !finite(post.priceMoveInCrossDirectionUsd)?
  'PRIX_DEPUIS_CROSS_INCONNU':
  post.priceMoveInCrossDirectionUsd<0?
  'PRIX_CONTREDIT_CROSS':
  post.priceMoveInCrossDirectionUsd===0?
  'PRIX_SANS_DEPLACEMENT':
  finite(retained)&&retained<.5?
  'DEPLACEMENT_PARTIELLEMENT_RESTITUE':
  'PRIX_ACCOMPAGNE_CROSS';
 const recent=measurements?.recent30m||{};
 const fast=measurements?.quick6m||{};
 const efficiency=finite(recent.efficiency)?recent.efficiency:null;
 const retainedMarket=finite(recent.retained)?recent.retained:null;
 const economy= !recent.complete?'ECONOMIE_30M_NON_DISPONIBLE':
  efficiency<.06&&retainedMarket<.50?
  'FAIBLE_CONSERVATION_DU_TERRITOIRE':
  efficiency<.06?'RENDEMENT_CHEMIN_FAIBLE':
  retainedMarket<.5?'TERRITOIRE_PEUT_ETRE_RECONQUIS':
  'PRIX_CONSERVE_RELATIVEMENT_SON_DEPLACEMENT';
 // Separate LOCAL cross->price resolution from surrounding market
 // productivity. A profitable new impulse may emerge in a poor prior hour.
 const localMismatch=priceTranslation==='PRIX_CONTREDIT_CROSS'||
   priceTranslation==='DEPLACEMENT_PARTIELLEMENT_RESTITUE';
 const marketContextWeak=economy==='FAIBLE_CONSERVATION_DU_TERRITOIRE'||
   economy==='RENDEMENT_CHEMIN_FAIBLE';
 const economicMismatch=localMismatch||marketContextWeak;
 const speedRelative=k.gapSpeedVs8hP75;
 // Relative-intensity vocabulary is observational, not an entry gate.
 const intensity=!finite(speedRelative)?'INTENSITE_INCONNUE':
  speedRelative<.5?'VITESSE_RELATIVE_FAIBLE':
  speedRelative<1?'VITESSE_RELATIVE_MODEREE':
  'VITESSE_RELATIVE_SUPERIEURE_A_P75';
 const angleRaw=k.normalizedAngleNow;
 const angle=finite(angleRaw?.relativeAngleDeg)?
  angleRaw.relativeAngleDeg:null;
 const nextHypothesis=(phase==='SEPARATION_ACCELERANTE'||
   phase==='CROSS_LIVE_NAISSANT_EN_OUVERTURE')&&
   priceTranslation==='PRIX_CONTREDIT_CROSS'?
   'GEOMETRIE_SANS_RESOLUTION_ECONOMIQUE_LOCALE':
  (phase==='SEPARATION_ACCELERANTE'||phase==='CROSS_LIVE_NAISSANT_EN_OUVERTURE')&&
   priceTranslation==='PRIX_ACCOMPAGNE_CROSS'?
   (marketContextWeak?'OFFENSIVE_LOCALEMENT_PRODUCTIVE_MARCHE_GLOBAL_INCERTAIN':
    'OUVERTURE_GEOMETRIQUE_ET_PRIX_CONCORDANTS'):
  phase==='SEPARATION_QUI_SE_REFERME'?'CROSS_EN_PERTE_D_AUTORITE':
  phase==='CONFRONTATIONS_REPETEES'?'CROISEMENTS_NON_RESOLUS':
  phase==='INFLEXION_AVANT_CROISEMENT'?
   'INVERSION_NAISSANTE_NON_VALIDEE_PAR_CROSS':
  phase==='SEPARATION_QUI_RALENTIT'?
   'SEPARATION_QUI_PERD_DE_LA_VITESSE':
  'STRUCTURE_EN_OBSERVATION';
 // A continuously opening weak cross can be more promising than a previously
 // steep cross already fading; both are narrative observations, not predictions.
 const crossStrength=finite(cross?.angle?.gapSpeed)?
  Math.abs(cross.angle.gapSpeed):null;
 const ratio=finite(crossStrength)&&crossStrength>0&&
  finite(v3)?rnd(Math.abs(v3)/crossStrength,3):null;
 let developmentalContrast=null;
 if(crossed&&cross?.to===side&&sinceCross!==null&&sinceCross<=45){
  if(expanding&&accelerating&&crossSpeedNowComparison==='PLUS_RAPIDE')
   developmentalContrast='CROISEMENT_DONT_L_OUVERTURE_ACCELERE';
  else if(contracting&&crossStrength!==null)
   developmentalContrast='CROISEMENT_DEJA_EN_REFERMETURE';
  else if(expanding&&decelerating)
   developmentalContrast='CROISEMENT_ENCORE_OUVERT_MAIS_RALENTIT';
 }
 const contextDirection=higher?.slowDir||null;
 const againstParent=!!(side&&contextDirection&&
   (side==='UP'?'long':'short')!==contextDirection);
 const priceWaveContradiction=!!higher?.priceWaveOpposition;
 const range=place?.big;
 const contextNotes=[];
 if(againstParent)
  contextNotes.push('E1_E4_CONTEXT_CONTRADICTORY_TO_MCB15_SIDE');
 if(priceWaveContradiction)
  contextNotes.push('BTC_PRICE_AND_LBW15_TREND_DISAGREE');
 if(range?.outside&&range.outside!=='INSIDE')
  contextNotes.push('OUTSIDE_RECORDED_BIG_VALUE_AREA');
 if(oscilling)contextNotes.push('REPEATED_BW_LBW_CONTACTS');
 if(economicMismatch)
  contextNotes.push('GEOMETRY_ECONOMIC_TRANSLATION_DISPUTED');
 if(shortReversing)
  contextNotes.push('THREE_MINUTE_TURN_AGAINST_FIFTEEN_MINUTE_TRAJECTORY');
 const milestones=[];
 const segments=(m.recentSegments||[]).slice(-4);
 for(const seg of segments)
  milestones.push({at:seg.endAt,type:'LBW_TRAJECTORY_LEG',
   direction:seg.direction,durationMin:seg.durationMin,
   lbwTravel:seg.lbwTravel,priceTravelUsd:seg.priceTravelUsd});
 if(crossed)milestones.push({at:cross.at,type:'CROSS15_LIVE',
  direction:cross.to,relativeAngle:cross.angle?.relativeAngleDeg??null,
  price:cross.price});
 milestones.sort((a,b)=>a.at-b.at);
 // Human-readable causal account, with chronology and evidence rather
 // than just a label. It is intentionally descriptive, not an action.
 const num=v=>finite(v)?String(rnd(v,2)):'non mesuré';
 const phrase={
  CONFRONTATIONS_REPETEES:'les courbes se croisent à répétition sans résolution durable',
  SEPARATION_QUI_SE_REFERME:'la séparation antérieure se referme',
  CROSS_LIVE_NAISSANT_EN_OUVERTURE:'un croisement Live vient de commencer à s ouvrir',
  SEPARATION_ACCELERANTE:'les courbes s écartent avec une accélération relative',
  SEPARATION_QUI_RALENTIT:'les courbes s écartent encore, mais leur vitesse relative diminue',
  SEPARATION_EN_COURS:'les deux lignes continuent de se séparer',
  INFLEXION_AVANT_CROISEMENT:'LBW tourne vers BW avant une nouvelle preuve de croisement',
  INFLEXION_DE_TRAJECTOIRE:'une nouvelle jambe LBW apparaît dans la trajectoire',
  GEOMETRIE_NON_RESOLUE:'aucune phase dominante n est suffisamment caractérisée',
  PRIX_ACCOMPAGNE_CROSS:'le prix accompagne le dernier croisement observé',
  PRIX_CONTREDIT_CROSS:'le prix contredit le dernier croisement observé',
  DEPLACEMENT_PARTIELLEMENT_RESTITUE:'une partie du déplacement initial a été restituée',
  PRIX_SANS_DEPLACEMENT:'le prix n a pas encore traduit le dernier croisement',
  HISTOIRE_DEPUIS_CROSS_NON_DISPONIBLE:'le dernier croisement est hors du contexte disponible',
  FAIBLE_CONSERVATION_DU_TERRITOIRE:'les fluctuations ont conservé peu de territoire net',
  RENDEMENT_CHEMIN_FAIBLE:'le prix n avance guère malgré ses oscillations',
  PRIX_CONSERVE_RELATIVEMENT_SON_DEPLACEMENT:'une partie significative du déplacement net est conservée',
  TERRITOIRE_PEUT_ETRE_RECONQUIS:'le marché est sujet aux reconquêtes adverses'};
 const dirLabel=wording[side]||'sans polarité claire';
 const journeys=segments.map(x=>x.direction+' '+
  num(x.durationMin)+' min, LBW '+num(x.lbwTravel)).join(' ; ');
 const historyNarrative='Trajectoire récemment observée : '+
  (journeys||'aucune succession de segments encore mesurable')+'.';
 const crossNarrative=cross?
  'Dernier Cross15 Live '+cross.to+' connu depuis '+num(sinceCross)+
   ' min ; angle au croisement recalculé dans l échelle actuelle '+
   num(cross.angleComparableAtCurrentScale?.relativeAngleDeg)+
   '° et angle actuel '+num(angle)+
   '° (même calibration locale, non degrés écran).':
  'Aucun Cross15 Live dans la portion actuellement disponible.';
 const narrative=[
  'Polarité LBW15/BW15 '+dirLabel+' : écart '+num(gap)+
   ', variation relative '+num(v3)+' MCB/min.',
  historyNarrative,
  crossNarrative,
  'Interprétation : '+(phrase[phase]||phase)+'. '+
   'LBW15 progresse à '+num(lbw3)+' MCB/min sur 3m et '+
   num(lbw15)+' MCB/min sur 15m. Vitesse relative : '+
   intensity+' ('+num(speedRelative)+' fois le P75 observé).',
  'Prix : '+(phrase[priceTranslation]||priceTranslation)+
   ' ; contexte 30m : '+(phrase[economy]||economy)+'.',
  'Espace : '+maturity+
   ' ; preuves contextuelles : '+
   (contextNotes.length?contextNotes.join(', '):
    'aucune contradiction particulière relevée')+'.'
 ].join(' ');
 return {version:VERSION,asOf:g.asOf,
  available:true,mode:'SHADOW_ONLY',decisionImpact:false,
  brokerOrdersEnabled:false,authority:'NARRATIVE_OBSERVATION_NOT_POLICY',
  phase,hypothesis:nextHypothesis,maturity,
  location:{positionInObservedWave:loc,
   observedMin:c.observedMinLBW,observedMax:c.observedMaxLBW,
   minutesSinceHigh:c.minutesSinceObservedHigh,
   minutesSinceLow:c.minutesSinceObservedLow,
   fullWaveGuaranteed:false},
  temporal:{lastTurnAt:lastTurn,latestLegDurationMin:latestLegDuration,
   firstKnownCrossAt:cross?.at??null,
   sinceCrossMin:sinceCross,recentCrossCount:m.crossEventsLastHour,
   lastHourNearContactFraction:m.nearContactFractionLastHour,
   repeatedContact:oscilling,shortHorizonTurn:shortTurn},
  dynamics:{direction:side,gap15:gap,
   lbwSpeed3m:lbw3,lbwSpeed15m:lbw15,
   bwSpeed3m:k.bwSpeed3mPerMin,
   gapSpeed3m:v3,gapSpeed15m:v15,gapAcceleration:a3,
   normalizedRelativeAngleDeg:angle,
   normalization:angleRaw?.normalization||null,
   opening:expanding,closing:contracting,
   accelerationSupportsOpening:accelerating,
   openingDecelerates:decelerating,
   crossGapSpeedAtObservation:crossSpeed??null,
   crossRelativeAngleSameAsOfScale:
    cross?.angleComparableAtCurrentScale?.relativeAngleDeg??null,
   currentVsInitialCrossSpeed:crossSpeedNowComparison,
   currentVsCrossSpeedRatio:ratio,
   relativeGapSpeedVsObservedP75:speedRelative,
   relativeIntensity:intensity,
   developmentalContrast},
  economic:{priceTranslation,economy,
   priceSinceCross:post?.priceMoveInCrossDirectionUsd??null,
   highestFavorable:post?.highestFavorablePriceUsd??null,
   retainedFractionSinceCross:retained??null,
   efficiency30m:efficiency,retained30m:retainedMarket,
   priceTrendOpposedToWave:priceWaveContradiction,
   lastSegmentPriceMove:lastSeg?.priceTravelUsd??null,
   mf15SinceCross:post?.mf15Delta??null},
  higherContext:{E1_E4_sharedDirection:contextDirection,
   oppositeToSlowContext:againstParent,
   bigValueArea:range?{outside:range.outside,
    val:range.val,poc:range.poc,vah:range.vah,
    sourceAt:place?.sourceAt||null}:null},
  caveats:[
   'Descriptive geometry process, NOT a calibrated probability or trade order',
   'Slope signs and angle are in MCB oscillator units and normalized coordinates, not price units or chart pixels',
   'The 8h observation window does not guarantee the original MCB wave start',
   'Bâton 30s cross events can jitter near zero and are not 15m native confirmations',
   'Thresholds for descriptive vocabulary are exploratory, not trading limits',
   'MA, liquidity and full E1/E4 histories are not embedded in this semantic layer'],
  milestones,narrative};
}
// Interpretation relative to a candidate's direction, WITHOUT issuing an
// entry or exit decision. This is used to examine historical V553 admissions.
function assessCandidate(reading,direction){
 if(!reading?.available||!['long','short'].includes(direction))
  return {status:'UNAVAILABLE',brokerOrdersEnabled:false,
    decisionImpact:false};
 const wanted=direction==='long'?'UP':'DN';
 const d=reading.dynamics||{},e=reading.economic||{},
  ctx=reading.higherContext||{};
 const preCross=d.direction!==wanted;
 const supports3=sgn(d.lbwSpeed3m)===(direction==='long'?1:-1);
 const supports15=sgn(d.lbwSpeed15m)===(direction==='long'?1:-1);
 const parentOpposes=ctx.E1_E4_sharedDirection&&
  ctx.E1_E4_sharedDirection!==direction;
 const priceCross=preCross?'NON_PERTINENT_AVANT_CROSS':
  e.priceTranslation;
 const status=preCross&&supports3&&!supports15?
  'ROTATION_COURTE_CONTRE_TRAJECTOIRE_15M_AVANT_CROSS':
  preCross?'ANTICIPATION_NON_CONFIRMEE_PAR_CROSS15':
  parentOpposes?'CROSS_ALIGNE_MAIS_CONFLIT_E1_E4':
  e.priceTranslation==='PRIX_CONTREDIT_CROSS'?
   'CROSS_ALIGNE_MAIS_PRIX_CONTRAIRE':
  'CROSS_ALIGNE_ANALYSE_DE_TRANSLATION_REQUISE';
 return {status,preCross,wanted,
  supportsLbw3m:supports3,supportsLbw15m:supports15,
  slowContextContrary:!!parentOpposes,
  priceTranslationRelativeToLastCross:priceCross,
  timingSinceCrossMin:reading.temporal.sinceCrossMin,
  marketEconomy30m:e.economy,
  sourceAt:reading.asOf,mode:'SHADOW_ONLY',
  decisionImpact:false,brokerOrdersEnabled:false,
  note:'Description rétrospective des conditions, aucune permission de trader'};
}
function initial(at=0){
 return {version:VERSION,mode:'SHADOW_ONLY',decisionImpact:false,
  brokerOrdersEnabled:false,createdAt:at,lastAt:0,
  episodeNo:0,activeEpisode:null,completedEpisodes:[],
  changes:[],phaseDurationsMs:{},last:null};
}
function observe(state,reading){
 if(state.version!==VERSION||state.decisionImpact!==false||
  state.brokerOrdersEnabled!==false)
  throw Error('GEOMETRY_INTERPRETER_UNTRUSTED_STATE');
 if(!reading||reading.version!==VERSION||
    reading.available!==true||
    reading.decisionImpact!==false||
    reading.brokerOrdersEnabled!==false||
    !finite(reading.asOf)||reading.asOf<=state.lastAt)
  return {accepted:false,events:[]};
 const now=reading.asOf,last=state.last,
 delta=last?Math.max(0,now-state.lastAt):0;
 if(last)state.phaseDurationsMs[last.phase]=
  (state.phaseDurationsMs[last.phase]||0)+delta;
 const events=[];
 const changed=!last||last.phase!==reading.phase||
  last.hypothesis!==reading.hypothesis;
 const crossChanged=!!(reading.temporal.firstKnownCrossAt&&
  (!last||reading.temporal.firstKnownCrossAt!==last.crossAt));
 const newEpisode=!!(!state.activeEpisode||crossChanged||
   (last?.dynamics.direction!==reading.dynamics.direction&&
     !!reading.dynamics.direction));
 if(newEpisode){
  if(state.activeEpisode){
   state.activeEpisode.endedAt=now;
   state.completedEpisodes.push(state.activeEpisode);
   state.completedEpisodes=state.completedEpisodes.slice(-24);
  }
  state.activeEpisode={id:++state.episodeNo,
   startedAt:now,origin:crossChanged&&last?
    'NEW_CROSS15_LIVE_OBSERVED':
    !last?'FIRST_OBSERVED_GEOMETRY':'GEOMETRIC_POLARITY_TURN',
   crossAt:reading.temporal.firstKnownCrossAt,
   direction:reading.dynamics.direction,firstPhase:reading.phase,
   lastPhase:reading.phase,firstPriceResponse:reading.economic.priceSinceCross,
   observations:0,phaseChanges:0,
   maxAbsGap:Math.abs(reading.dynamics.gap15),
   maxFavorablePrice:reading.economic.highestFavorable};
  events.push({at:now,type:'GEOMETRIC_EPISODE_BEGINS',
   episode:state.episodeNo,origin:state.activeEpisode.origin});
 }
 if(changed){
  state.activeEpisode.phaseChanges++;
  const e={at:now,type:'GEOMETRY_INTERPRETATION_CHANGED',
   from:last?.phase||null,to:reading.phase,
   hypothesis:reading.hypothesis,
   lastCrossAt:reading.temporal.firstKnownCrossAt};
  events.push(e);
  state.changes.push(e);
  state.changes=state.changes.slice(-120);
 }
 state.activeEpisode.lastPhase=reading.phase;
 state.activeEpisode.observations++;
 state.activeEpisode.maxAbsGap=Math.max(state.activeEpisode.maxAbsGap,
  Math.abs(reading.dynamics.gap15));
 state.activeEpisode.lastPriceResponse=reading.economic.priceSinceCross;
 if(finite(reading.economic.highestFavorable))
  state.activeEpisode.maxFavorablePrice=Math.max(
   state.activeEpisode.maxFavorablePrice||0,
   reading.economic.highestFavorable);
 state.lastAt=now;
 state.last={asOf:now,phase:reading.phase,
  hypothesis:reading.hypothesis,
  dynamics:{direction:reading.dynamics.direction},
  crossAt:reading.temporal.firstKnownCrossAt,
  priceTranslation:reading.economic.priceTranslation};
 return {accepted:true,events};
}
module.exports={VERSION,interpret,assessCandidate,initial,observe};
