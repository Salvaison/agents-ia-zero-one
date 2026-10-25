'use strict';
// BOONO V5.3, PAPER decision only. Four-hour/one-hour context is never a veto.
// Signal evidence persists while its causal geometry and price campaign persist.
// A signal's existence is not permission to enter a mature impulse.
const v522=require('./decision-v522'),c=require('./v53-causal');
const VERSION='v5.3-causal-15m-flow-market-phase';
const {MIN,THREE,FIFTEEN,number:n,rounded:rr,side,opposite}=c;
function atOrBefore(rows,ts){
 return [...(rows||[])].reverse().find(r=>r.ts<=ts&&ts-r.ts<80000)||null;
}
function mcb15Posture(input,base){
 const now=input.now,series=c.bars(input.bars15,now,FIFTEEN);
 const native=c.native15(input.samples,series,now),r=base.readings||{},
  memory=r.mcb15?.trajectory||null,liveSide=native.crossDirection;
 const official=(input.native15Events||[]).filter(e=>e.observedAt<=now&&
   e.observedAt>0).sort((a,b)=>a.observedAt-b.observedAt);
 const lastOfficialConfirmed=official.filter(e=>e.type==='CONFIRMED').at(-1)||null;
 const lastOfficialLive=official.filter(e=>e.type==='OBSERVED').at(-1)||null;
 const last=input.samples?.at(-1);
 // Preserve last OBSERVED BW/LBW15 polarity across a new 15m candle
 // before its first Live sample. Do not invent a fresh E15 signal.
 const priorSpread=last&&n(last.live15LbwRaw)!==null&&n(last.live15BwRaw)!==null?
   n(last.live15LbwRaw)-n(last.live15BwRaw):null;
 const priorSide=priorSpread===null||Math.abs(priorSpread)<.04?null:
   priorSpread>0?'long':'short';
 const mf3=n(last?.liveMoneyFlow),mf15=n(last?.live15MfRaw);
 const p15=atOrBefore(input.samples,now-10*MIN),p3=atOrBefore(input.samples,now-3*MIN);
 const delta15=p15&&mf15!==null&&n(p15.live15MfRaw)!==null?
   rr(mf15-p15.live15MfRaw):null;
 const delta3=p3&&mf3!==null&&n(p3.liveMoneyFlow)!==null?
   rr(mf3-p3.liveMoneyFlow):null;
 const history=r.geometry?.cross15;
 if(!liveSide&&priorSide)liveSide=priorSide;
 const geometryActive=!!(liveSide&&history&&history.direction===liveSide&&
   history.ts<=now);
 const nativeConfirm=!!(lastOfficialConfirmed?
   lastOfficialConfirmed.direction===liveSide:native.currentConfirmed);
 const provisional=!!(native.nativeLive&&native.nativeLive.direction===liveSide)||
   !!(lastOfficialLive&&lastOfficialLive.direction===liveSide&&
     lastOfficialLive.sourceTs===native.sourceBar);
 const liveDirection=geometryActive&&(nativeConfirm||provisional||
   Math.abs(native.spread||priorSpread||0)>=.4)?liveSide:null;
 const inConflict=!!(memory&&liveDirection&&memory!==liveDirection);
 const offensive=liveDirection||memory||null;
 // LBW15 current-wave LOCATION and E15 direction are different notions.
 const lbw=n(r.mcb15?.lbw);
 const wavePosition=lbw===null?'UNKNOWN':
   lbw>=60?'UPPER_EXTREME':lbw<=-60?'LOWER_EXTREME':
   lbw>=20?'UPPER_WAVE':lbw<=-20?'LOWER_WAVE':'MID_CYCLE';
 return {structuralMemory:memory,offensive,liveDirection,conflicted:inConflict,
   wavePosition,lbw:rr(lbw),bw:rr(r.mcb15?.bw),
   mf15:rr(mf15),mf3:rr(mf3),mf15Delta10m:delta15,mf3Delta3m:delta3,
   native,firstLiveAt:(lastOfficialLive?.direction===liveSide?
     lastOfficialLive.observedAt:null)||native.nativeLive?.observedAt||null,
   lastConfirmedAt:lastOfficialConfirmed?.observedAt||null,
   officialConfirmed:lastOfficialConfirmed,officialLive:lastOfficialLive,
   cross15At:geometryActive?history.ts:null,
   sourceBar:native.sourceBar,
   state:inConflict?'MCB15_CONTESTED_'+liveDirection.toUpperCase():
     liveDirection?'MCB15_OFFENSIVE_'+liveDirection.toUpperCase():
     memory?'MCB15_MEMORY_'+memory.toUpperCase():'MCB15_UNKNOWN'};
}
function classifyCycle(base,posture,dir,place){
 const mt=base.readings?.maturity||{},g=base.readings?.geometry||{},cross=g.cross3;
 const sideValue=side(dir),lbw3=n(base.readings?.mcb3?.lbw),
  crossLbw=n(cross?.level),parent=n(posture.lbw);
 const deep3=crossLbw!==null&&sideValue*crossLbw<=-40;
 const late3=crossLbw!==null&&sideValue*crossLbw>=40;
 const lateNow=lbw3!==null&&sideValue*lbw3>=55;
 const aligned15=posture.offensive===dir;
 const current15=posture.liveDirection===dir;
 const deep15=parent!==null&&sideValue*parent<=-50;
 const expanded15=parent!==null&&sideValue*parent>=40;
 const oldProof=g.cross15?.direction===dir&&g.cross15.ts<=base.asOf;
 const acute=!!(deep3&&(deep15||expanded15||aligned15));
 // A long 15m wave with a deep opposite E3 respiration is often fresher than
 // a perfectly synced E3 at the late positive extreme.
 const maturity=deep3?'TACTICAL_RESET_E3':
   late3&&lateNow?'END_OF_3M_IMPULSE':
   lateNow?'3M_WAVE_ADVANCED':
   '3M_TRANSITION';
 const relation=posture.conflicted?
   '15M_OFFENSIVE_AGAINST_PREVIOUS_MEMORY':
   aligned15?'15M_DIRECTION_ALIGNED':
   '15M_OPPOSED_OR_UNRESOLVED';
 const oldAge=cross?.ts?rr((base.asOf-cross.ts)/MIN):null;
 const decayByPrice=mt.incrementalRateSlowing===true&&
   mt.progressInTypical3mRanges!==null&&mt.progressInTypical3mRanges>1;
 const expandedFromCross=mt.progressInTypical3mRanges!==null&&
   mt.progressInTypical3mRanges>1.25;
 const tacticalNotReset=crossLbw!==null&&sideValue*crossLbw>-35;
 const expensiveEntry=!!(expandedFromCross&&tacticalNotReset&&
    !place.anchor?.acceptance)||late3&&decayByPrice&&!place.anchor?.acceptance;
 return {maturity,relation,aligned15,current15,deep3,late3,lateNow,deep15,
   expanded15,acute,oldAgeMin:oldAge,decayByPrice,
   expensiveEntry,cross3At:cross?.ts||null,
   evidenceAgeSemantic:'Age is informational; causal validity ends at adverse reversal, not at 12 minutes',
   mcb15Wave:posture.wavePosition};
}
function flowEvidence(base,posture,dir){
 const d=side(dir),cv=base.readings?.conversion||{},pm3=n(cv.pm3),pm5=n(cv.pm5),
  mf3=n(posture.mf3Delta3m),mf15=n(posture.mf15Delta10m);
 const pmLive=n(cv.pmCombined);
 const price3=pm3!==null?d*pm3:null,price5=pm5!==null?d*pm5:null;
 const alignedPrice=price3!==null&&price5!==null&&price3>8&&price5>0;
 const liveResponse=pmLive!==null&&d*pmLive>0;
 const mf3Aligned=mf3!==null&&d*mf3>=-.15;
 const mf15Aligned=mf15!==null&&d*mf15>=-.6;
 const conflict=!!(mf3!==null&&mf15!==null&&
   d*mf3<-.6&&d*mf15<-.6);
 const mf15StrongOpposition=mf15!==null&&d*mf15< -2.2;
 const contestedMF=!!(mf15StrongOpposition&&!mf3Aligned);
 // Distinguish MF reversal memory from its sign: a recovering negative MF15
 // can support an early LONG, and weakening positive MF15 can support SHORT.
 return {pm3:pm3,pm5:pm5,pmLive,price3,price5,alignedPrice,liveResponse,
   mf3Change:mf3,mf15Change:mf15,
   mf3Aligned,mf15Aligned,conflict,contestedMF,
   coherence:conflict||contestedMF?'OPPOSING_FLOW':
    mf3Aligned&&mf15Aligned?'BOTH_FLOW_SLOPES_SUPPORT':
    mf3Aligned?'TACTICAL_FLOW_LEADS_15M':'FLOW_NOT_READY',
   valid:!!(alignedPrice&&liveResponse&&mf3Aligned&&!conflict&&!contestedMF)};
}
function campaignStillAlive(input,base,posture,dir,allowEarlyReversal=false){
 const d=side(dir),g=base.readings?.geometry||{},cross=g.cross3,now=input.now;
 if(!cross||cross.direction!==dir||cross.ts>now)return {active:false,reason:'NO_CROSS3'};
 const current3=n(base.readings?.mcb3?.lbw)-n(base.readings?.mcb3?.bw);
 const threeDirection=Number.isFinite(current3)?
   current3>0?'long':current3<0?'short':null:null;
 const inverted=threeDirection&&threeDirection!==dir;
 if(inverted)return {active:false,reason:'THREE_MINUTE_GEOMETRY_REVERSED'};
 const adverse15=posture.liveDirection===opposite(dir);
 if(adverse15&&!allowEarlyReversal)return {active:false,reason:'FIFTEEN_MINUTE_OFFENSIVE_OPPOSES'};
 // If the 3m cross and 15m evidence persist, the thesis is active even after
 // many minutes. Price/MF validity is then judged separately every evaluation.
 return {active:true,reason:'PERSISTENT_GEOMETRIC_CANDIDACY',
   crossAt:cross.ts,firstSeenAfterPolicy:cross.ts>=input.startedAt};
}
function hasNewCausalEvidence(input,base,posture,place,dir){
 const t=input.startedAt||0,g=base.readings?.geometry||{},e3=g.e3Live;
 const w=[
  {type:'CROSS3',at:g.cross3?.direction===dir?g.cross3?.ts:null},
  {type:'E3_LIVE',at:e3?.direction===dir?e3.firstObservedAt:null},
  {type:'CROSS15',at:posture.liveDirection===dir?posture.cross15At:null},
  {type:'E15_LIVE',at:posture.liveDirection===dir?posture.firstLiveAt:null},
  {type:'E15_CONFIRMED',at:posture.officialConfirmed?.direction===dir?
     posture.officialConfirmed.observedAt:null},
  {type:'DEFENDED_RETEST',at:place.anchor?.acceptance?.heldAt||null}
 ].filter(e=>Number.isFinite(e.at)&&e.at>=t&&e.at<=input.now);
 return {qualified:w.length>0,components:w,
   reason:w.length?'FRESH_CAMPAIGN_EVIDENCE':'AWAIT_OBSERVED_POST_ACTIVATION_EVENT'};
}
function evaluate(input){
 const base=v522.evaluate(input),r=base.readings||{},now=n(input.now),price=n(input.price);
 if(now===null||price===null||!r.mcb15)return {...base,version:VERSION,
   action:'WAIT',reason:'V53_MCB_DATA_MISSING',brokerOrdersEnabled:false};
 const posture=mcb15Posture(input,base);
 const g=r.geometry||{},cross=g.cross3;
 const dir=cross?.direction||posture.liveDirection||posture.structuralMemory||null;
 const med=n(r.economics?.median3mRange)||65;
 const place=c.mapPlace({now,price,dir,bars3:input.bars3,bars15:input.bars15,
   levels:input.levels,median3:med,base});
 const phase=classifyCycle(base,posture,dir,place);
 const flow=flowEvidence(base,posture,dir);
 const r15=n(posture.lbw),pm15AtCross=n(r.conversion?.pm15);
 const earlyCandidate=!!(phase.deep3&&phase.deep15&&
   r15!==null&&Math.abs(r15)>=60&&pm15AtCross!==null&&
   side(dir)*pm15AtCross>0);
 const lifespan=campaignStillAlive(input,base,posture,dir,earlyCandidate);
 const proof=hasNewCausalEvidence(input,base,posture,place,dir);
 const drift=price-(input.samples?.at(-1)?.lastPrice||price);
 // An observed but not yet published new bar is not a stale old observation.
 const age=now-(input.samples?.at(-1)?.ts||0);
 const priceFresh=input.tickAgeMs!==null&&input.tickAgeMs>=0&&input.tickAgeMs<=25000;
 const auditFresh=age>=0&&age<=65000&&n(r.mcb15.lbw)!==null&&n(r.mcb3?.lbw)!==null;
 const health=priceFresh&&auditFresh;
 const shortPhase=!!(posture.liveDirection===dir)||
   (posture.structuralMemory===dir&&!posture.conflicted);
 // Do not require the E15 reversal to be confirmed before its first E3.
 // Deep E3 reset near the opposite 15m extreme is a valid prospective thesis
 // if price conversion and MF later support it (neither is an extra MCB vote).
 const initialPm15=n(r.conversion?.pm15);
 const earlyReversal=!!(phase.deep3&&phase.deep15&&
   Math.abs(n(posture.lbw)||0)>=60&&
   initialPm15!==null&&side(dir)*initialPm15>0&&
   phase.maturity==='TACTICAL_RESET_E3');
 const phaseOK=!!dir&&(shortPhase||earlyReversal);
 // Historical E15 -> current E15 Live/confirmed can strengthen a candidate
 // without renewing its birth timestamp or receiving a second signal vote.
 const stageOK=phase.maturity!=='END_OF_3M_IMPULSE'&&!phase.expensiveEntry&&
  (phase.maturity!=='3M_WAVE_ADVANCED'||phase.deep3||place.anchor?.acceptance);
 // Only an actually observed 3m support/resistance is authority for risk.
 const invalidation=place.invalidation,hardRiskOK=!!invalidation&&
   invalidation.distanceUsd<500&&invalidation.distanceUsd>0;
 // Local levels stay INFORMATIVE. No nearest-local-high veto on admissions.
 // Economics is a market mobility + fee test, NOT a projected R:R claim.
 const feeMove=n(r.economics?.feeRoundTripMoveUsd)||price*.001;
 const measuredTravel=Math.max(Math.abs(n(flow.pm5)||0),Math.abs(n(r.conversion?.pm15)||0),med);
 const mobilityDemonstrated=measuredTravel>=feeMove*.7||
   (phase.deep3&&Math.abs(n(posture.lbw)||0)>=50&&flow.price3>0);
 const sameFamilyOK=!!(cross&&g.cross3.direction===dir);
 const recentEvidence=proof.qualified;
 const entryReady=health&&phaseOK&&stageOK&&lifespan.active&&
   sameFamilyOK&&recentEvidence&&hardRiskOK&&flow.valid&&
   base.checks?.noChop!==false;
 const reason=!health?'DATA_REELLEMENT_PERIMEES':
  !dir?'NO_DIRECTION_FROM_MCB':
  !phaseOK?'ATTENDRE_POSTURE_15M_COHERENTE':
  !lifespan.active?'CAMPAGNE_INTERROMPUE_'+lifespan.reason:
  !recentEvidence?'EN_ATTENTE_DE_PREUVE_CAUSALE_DEPUIS_ACTIVATION':
  !stageOK?'IMPULSION_3M_MATURE_SANS_NOUVELLE_DEFENSE':
  !hardRiskOK?'RISQUE_SANS_ANCRE_STRUCTURELLE':
  !flow.valid?'CONVERSION_OU_MF_INCOHERENTS_'+flow.coherence:
  base.checks?.noChop===false?'CROISEMENTS_SANS_TERRAIN':
  'CAMPAGNE_15M_ET_CONVERSION_EXPLOITABLE';
 let action=entryReady?'ENTER_'+dir.toUpperCase():'WAIT',why=reason,protect=null;
 if(input.position){
  const pos=input.position,pdir=pos.direction,sd=side(pdir);
  const inherited=pos.entryPolicyVersion&&pos.entryPolicyVersion!==VERSION;
  action='HOLD';why='CAMPAGNE_EN_POSITION';
  if(inherited){action=base.action;why='LEGACY_POSITION_'+base.reason;}
  else{
   const loss=sd*(price-pos.entryPrice);
   protect=v522.evidenceAgainstPosition(input,base,place,med);
   const posFlow=flowEvidence(base,posture,pdir);
   const adverse15=posture.liveDirection===opposite(pdir);
   const actualFailure=adverse15&&posFlow.pm3!==null&&
     sd*posFlow.pm3<0&&posFlow.mf15Change!==null&&
     sd*posFlow.mf15Change<0&&
     posFlow.pm5!==null&&sd*posFlow.pm5<0;
   if(loss<=-500){action='EXIT_'+pdir.toUpperCase();why='HARD_RISK_500';}
   else if(protect.persistent){action='EXIT_'+pdir.toUpperCase();
     why='DEFENDED_PRICE_LEVEL_LOST_WITH_OPPOSING_CONVERSION';}
   else if(actualFailure){action='EXIT_'+pdir.toUpperCase();
     why='MCB15_OFFENSIVE_REVERSAL_AND_MF_PRICE_OPPOSE';}
   else if(protect.breached)why='BREATH_WICK_NOT_STRUCTURAL_EXIT';
  }
 }
 const chain={...r.causalChain,campaign15:posture.state,
   native15:posture.native,priceGround:place.anchor?.key||null,
   cycle3:phase.maturity,newEvidence:proof.components,
   note:'E3/E15 native and BW/LBW are geometric family; no 12-minute timer'};
 const flatCandidate=dir&&cross?dir+'|'+cross.ts+'|'+(r.causalChain?.campaignId||'UNANCHORED')+
   (place.anchor?.acceptance?'|RETEST:'+place.anchor.acceptance.heldAt:''):null;
 return {...base,version:VERSION,action,reason:why,candidate:dir,
  phase:posture.state,entryKey:flatCandidate,
  prognosis:dir?'MCB15 '+posture.state+' ; tactique 3m '+phase.maturity:'Équilibre structurel',
  invalidation,quality:health?'DATA_OK':'DATA_DEGRADED',
  readings:{...r,mcb15:{...r.mcb15,phase:posture.state,
    currentOffensive:posture.liveDirection,offensive:posture.offensive,
    confirmedE15:posture.officialConfirmed||posture.native.confirmed,
    liveE15:posture.officialLive||posture.native.nativeLive,
    currentCross15:posture.cross15At,
    bwLbwSpread:posture.native.spread,
    mf15:posture.mf15,mf15Delta10m:posture.mf15Delta10m,
    memoryDirection:posture.structuralMemory,wavePosition:posture.wavePosition},
    maturity:{...r.maturity,phase:posture.state,
      requalified:!!place.anchor?.acceptance,
      requalifiedAt:place.anchor?.acceptance?.heldAt||null,
      maturity:phase.maturity,location3m:phase,
      staleByAge:false,activeCampaign:lifespan.active,
      activeReason:lifespan.reason},
    geometry:{...g,cross15Role:posture.state,
      cross15ActiveAt:posture.cross15At,
      e15ConfirmedAt:posture.lastConfirmedAt},
    place:{...r.place,nearest:place.nearestContext||r.place?.nearest,
      anchor:place.anchor,source:place.source,
      spaceUsd:r.place?.spaceUsd,notes:place.notes,
      boundaryAuthority:'CONTEXT_ONLY_UNTIL_DEFENDED'},
    causalChain:chain,
    economics:{...r.economics,viable:mobilityDemonstrated,
      localRoomOnlyContext:true,stopDistanceUsd:invalidation?.distanceUsd||null,
      empiricalMobilityUsd:rr(measuredTravel),
      costCoverageObserved:mobilityDemonstrated,
      note:'Fee/price mobility is observed evidence, not a predicted local-boundary veto',
      feeRoundTripMoveUsd:rr(feeMove)},
    flow15:flow,
    invalidationEvidence:protect,
    marketStage:phase,
    evidenceSincePolicy:proof,
    freshness:{auditAgeMs:age,barPending:new Date(now).getTime()>=0&&
      input.samples?.at(-1)?.ts <Math.floor(now/THREE)*THREE,
      realSourceStale:!health}},
  checks:{...base.checks,phaseLocation:phaseOK,
    crossAgeNotVeto:true,causalSequenceActive:lifespan.active,
    newCausalProof:proof.qualified,causalStop:hardRiskOK,
    mcb15Offensive:phaseOK,flowConsistent:flow.valid,
    targetNotVeto:true,entryReady},
  decisionContract:{flat:'MCB15 phase and 3m location/money flow decide; levels contextual',
    position:'Keep through breaths, exit on defended-level failure or adverse 15m+MF',
    timeValidity:'Until causal structural reversal; not 12m',
    hardRiskPriceMove:500,gainFloor:'120/90,220/180 managed by paper risk'},
  brokerOrdersEnabled:false};
}
module.exports={VERSION,evaluate,mcb15Posture,classifyCycle,
 flowEvidence,campaignStillAlive,hasNewCausalEvidence};
