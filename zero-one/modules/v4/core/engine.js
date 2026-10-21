'use strict';

const mcbState=require('../layers/mcb-state');
const dataQuality=require('../layers/data-quality');
const mcbThesis=require('../layers/mcb-thesis');
const opportunityMaturity=require('../layers/opportunity-maturity');
const nativeSignal=require('../layers/native-signal');
const mcbBackground=require('../layers/mcb-background');
const structuralRoom=require('../layers/structural-room');
const capitulationGuard=require('../layers/capitulation-guard');
const marketQuality=require('../layers/market-quality');
const setupLifecycle=require('../layers/setup-lifecycle');
const priceTranslation=require('../layers/price-translation');
const tickerConfirmation=require('../layers/ticker-confirmation');
const context=require('../layers/context');
const risk=require('../layers/risk');
const action=require('../layers/action');
const structuralHandoffShadow=require('../experiments/structural-handoff-shadow');
const mfStructureShadow=require('../experiments/mf-structure-shadow');
const tpMultiFractionShadow=require('../experiments/tp-multifraction-shadow');
const continuationReentryShadow=require('../experiments/continuation-reentry-shadow');
const priceBehaviorShadow=require('../experiments/price-behavior-shadow');
const live15AcceptanceShadow=require('../experiments/live15-acceptance-shadow');
const admissionCounterfactualShadow=require('../experiments/admission-counterfactual-shadow');
const elasticSyncShadow=require('../experiments/elastic-sync-shadow');
const elasticDualChainShadow=require('../experiments/elastic-dual-chain-shadow');
const elasticObserverShadow=require('../experiments/elastic-observer-shadow');

const VERSION='v4.10.10-hard-stream-gain-floor-20261021';

function evaluate(frame,position=null,previousEvaluation=null){
  const previousMcb=previousEvaluation&&previousEvaluation.mcb||null;
  const dq=dataQuality.evaluate(frame);
  const mcb=mcbState.evaluate(frame,previousMcb,dq);

  // MCB remains the only source of directional meaning.
  const baseThesis=mcbThesis.evaluate(mcb);

  // Native MCB signals are part of MCB evidence. Reinforced UP <= -60 is asymmetric by design.
  const native=nativeSignal.evaluate(frame);
  const c=mcb&&mcb.currentLobe||{};
  const reinforcedEvent=native&&native.reinforcedUp&&native.reinforcedUp.event||null;
  const nativeLongCandidate=!!(
    native&&native.reinforcedUp&&native.reinforcedUp.active&&
    c.type==='CREUX'&&reinforcedEvent&&Number(reinforcedEvent.ts)>=Number(c.startTs)
  );
  const entryBaseThesis=nativeLongCandidate?{
    ...baseThesis,
    state:'TRANSITION_NEUTRAL',direction:null,candidateDirection:'long',
    mode:'NATIVE_UP_REINFORCED',phase:'OBSERVATION',actionable:false,
    reason:'confirmed MCB UP_REINFORCED <= -60 creates an exceptional LONG candidate while the deep 15m trough is still active',
    authority:'MCB_ONLY',nativeSignalBypass:true
  }:baseThesis;
  const candidateDirection=entryBaseThesis&&(entryBaseThesis.candidateDirection||entryBaseThesis.direction)||null;

  // Central background: 1h is actionable context; 4h/D are strong shadow qualifiers only.
  const background=mcbBackground.evaluate(frame,candidateDirection);

  // Structural limits never choose a direction, but an unresolved boundary can suspend setup creation.
  const ctx=context.evaluate(frame,entryBaseThesis);
  const room=structuralRoom.evaluate(frame,candidateDirection,ctx);

  // Deep 4h capitulation guard: 4h only grants permission to SEARCH for a reversal.
  // A confirmed sub-60 4h UP must be causally available, then fresh 15m evidence
  // must form after that arm before 3m + PM can time execution.
  const capGuard=capitulationGuard.evaluate(
    frame,candidateDirection,mcb,background,native,frame.entryControl||null
  );

  // Market quality: only a truly dormant 30m window blocks. CHOP remains shadow for now.
  const quality=marketQuality.evaluate(frame);

  // Rolling market thesis remains available for exits / understanding.
  const translation=priceTranslation.evaluate(frame,baseThesis);
  const thesis=opportunityMaturity.evaluate(baseThesis,mcb,translation);
  const ticker=tickerConfirmation.evaluate(frame,thesis);

  const mfStructure=mfStructureShadow.evaluate(frame,candidateDirection);

  // Same-direction continuation after a protective exit: SHADOW ONLY.
  const continuationReentry=continuationReentryShadow.evaluate(
    frame,position,baseThesis,mcb,native,translation,ticker,mfStructure,room,
    previousEvaluation&&previousEvaluation.continuationReentryShadow||null
  );

  const priceBehavior=priceBehaviorShadow.evaluate(
    frame,native,translation,ticker,
    previousEvaluation&&previousEvaluation.priceBehaviorShadow||null
  );

  const live15Acceptance=live15AcceptanceShadow.evaluate(
    frame,position,mcb,native,translation,mfStructure,room,quality,
    previousEvaluation&&previousEvaluation.live15AcceptanceShadow||null
  );

  // Structural handoff experiment: persistent 1h structural context + 15m thesis + 3m timing.
  // It is SHADOW ONLY. It may remember structure across an exit, but execution proof is always reset.
  const handoffStructure=structuralHandoffShadow.evaluateStructure(
    frame,position,mcb,baseThesis,background,native,translation,
    previousEvaluation&&previousEvaluation.structuralHandoff||null
  );
  let handoffFreshTranslation=null;
  const handoffProofStart=structuralHandoffShadow.proofStartTs(handoffStructure,frame.entryControl||null);
  if(!position&&handoffStructure.active&&Number.isFinite(Number(handoffProofStart))){
    const handoffThesis={
      state:'SETUP',
      direction:handoffStructure.direction,
      candidateDirection:handoffStructure.direction,
      authority:'MCB_STRUCTURAL_HANDOFF_SHADOW'
    };
    handoffFreshTranslation=priceTranslation.evaluate(frame,handoffThesis,{sinceTs:handoffProofStart});
  }
  const structuralHandoff=structuralHandoffShadow.finalize(
    handoffStructure,handoffFreshTranslation,frame.entryControl||null,position
  );

  // Entry setup is a separate causal lifecycle.
  const setup=setupLifecycle.evaluate(
    frame,entryBaseThesis,mcb,background,room,quality,native,
    previousEvaluation&&previousEvaluation.setup||null,
    position,
    frame.entryControl||null,
    capGuard,
    mfStructure,
    translation,
    priceBehavior
  );

  const admissionCounterfactual=admissionCounterfactualShadow.evaluate(
    frame,position,setup,entryBaseThesis,mcb,priceBehavior,native,mfStructure,room,quality,
    previousEvaluation&&previousEvaluation.admissionCounterfactualShadow||null
  );

  const elasticSync=elasticSyncShadow.evaluate(
    frame,setup,entryBaseThesis,thesis,mcb,native,translation,priceBehavior,
    previousEvaluation&&previousEvaluation.elasticSyncShadow||null
  );
  // v0.4 observes both market stories. It has no setup, action or risk authority.
  const elasticDualChain=elasticDualChainShadow.evaluate(
    frame,mcb,native,baseThesis,translation,ticker,mfStructure,priceBehavior,
    previousEvaluation&&previousEvaluation.elasticDualChainShadow||null
  );

  const elasticObserver=elasticObserverShadow.evaluate(
    frame,mcb,native,baseThesis,translation,ticker,mfStructure,priceBehavior,
    room,background,quality,elasticDualChain.waveGeometry,
    previousEvaluation&&previousEvaluation.elasticObserverShadow||null
  );

  const entryThesis=setup&&setup.status==='SETUP'
    ?{state:'SETUP',direction:setup.direction,candidateDirection:setup.direction,mode:baseThesis&&baseThesis.mode||null,authority:'MCB_ONLY'}
    :{state:'OBSERVE',direction:null,candidateDirection:null,authority:'MCB_ONLY'};
  const entryTranslation=priceTranslation.evaluate(
    frame,entryThesis,
    setup&&setup.status==='SETUP'?{sinceTs:setup.setupTs}:{}
  );
  const entryTicker=tickerConfirmation.evaluate(
    frame,entryThesis,
    setup&&setup.status==='SETUP'?{sinceTs:setup.setupTs}:{}
  );

  const r=risk.evaluate(frame,position,mcb,thesis,translation,ticker,ctx);
  const a=action.evaluate(frame,position,mcb,thesis,translation,ticker,r,{
    setup,thesis:entryThesis,translation:entryTranslation,rollingTranslation:translation,ticker:entryTicker,nativeSignal:native,
    marketQuality:quality,structuralRoom:room,background,capitulationGuard:capGuard,
    mfStructureShadow:mfStructure
  });

  return {
    version:VERSION,
    evaluatedAt:Date.now(),
    marketTimestamp:frame.market.timestamp,
    price:frame.market.price,
    mcb,
    dataQuality:dq,
    nativeSignal:native,
    background,
    baseThesis,
    entryBaseThesis,
    thesis,
    context:ctx,
    structuralRoom:room,
    capitulationGuard:capGuard,
    marketQuality:quality,
    setup,
    translation,
    ticker,
    mfStructureShadow:mfStructure,
    continuationReentryShadow:continuationReentry,
    priceBehaviorShadow:priceBehavior,
    live15AcceptanceShadow:live15Acceptance,
    admissionCounterfactualShadow:admissionCounterfactual,
    elasticSyncShadow:elasticSync,
    elasticDualChainShadow:elasticDualChain,
    elasticObserverShadow:elasticObserver,
    structuralHandoff,
    entryTranslation,
    entryTicker,
    risk:r,
    action:a,
    contract:{
      directionAuthority:'MCB_ONLY',
      dataQuality:{decisionImpact:'SUSPEND_NEW_ENTRIES_WHEN_STALE',version:dataQuality.VERSION,hardRiskRemainsActive:true,semantic:'stale MCB cannot retain structural entry authority'},
      backgroundPrimary:'1H_WAVE_LEG_QUALIFIER_ONLY',
      oneHourAdmissionImpact:false,
      oneHourSemantic:'1h E-to-E describes the current 1h wave leg; it qualifies risk/quality but never vetoes a valid 15m/3m setup by itself',
      structuralDirectionContract:'LOBE_IS_LOCATION_E_TO_E_IS_DIRECTION',
      structuralTrajectoryTimeframes:['3m','15m','1h','4h','1d','1w'],
      structuralTrajectoryDecisionImpact:{'3m':'TIMING','15m':'THESIS_CANDIDATE','1h':'QUALIFIER','4h':'CAPITULATION_PERMISSION','1d':'SHADOW','1w':'SHADOW'},
      reinforcedUpThresholdLbw:-60,
      reinforcedUpBackgroundBypassLong:true,
      reinforcedUpPreservesCausalSetupIdentity:true,
      reinforcedUpTimingOrigin:'EARLIEST_OF_CURRENT_3M_LOBE_AND_REINFORCED_SYNC_3M_UP',
      reinforcedUpRollingOppositionGate:{decisionImpact:true,forbidsEntryWhen:['ROLLING_3M_OPPOSES','ROLLING_5M_OPPOSES'],semantic:'native reinforcement cannot manufacture freshness or erase simultaneous 3m+5m adverse conversion'},
      reinforcedUpCanCreateLongCandidateInDeepTrough:true,
      reinforcedDnSynthetic:false,
      macro4hDailyDecisionImpact:'4H_CAPITULATION_PERMISSION_ONLY; DAILY_SHADOW',
      fourHourCapitulationGuard:{thresholdLbw:-60,requiresConfirmedSub60Up:true,requiresFresh15mAfterArm:true,oneArmOneFailedCampaign:true},
      entryRequiresStructuralSetup:true,
      preSetupMicrostructureAdmissionImpact:false,
      postExitPreservesMcbContext:true,
      postExitResetsMicrostructureProof:true,
      structuralHandoffShadowDecisionImpact:false,
      continuationReentryShadow:{decisionImpact:false,version:continuationReentryShadow.VERSION,
        protectiveExitKinds:Array.from(continuationReentryShadow.PROTECTIVE_EXITS),
        oneCandidatePerExit:true,requiresFresh3mEventAfterExit:true,requiresAligned3mAnd5mPm:true,
        minEfficiency3m:continuationReentryShadow.MIN_PM_EFFICIENCY,tickerDecisionImpact:false,
        semantic:'shadow-only anti-churn study of same-direction continuation after protective exits; ticker measures effort/yield but never creates direction'},
      priceBehaviorShadow:{decisionImpact:false,version:priceBehaviorShadow.VERSION,alwaysOn:true,
        signalMemory:['3m','15m'],tickerDecisionImpact:false,pmDecisionImpact:false,
        semantic:'continuous study of price effort/yield and conversion in relation to remembered native signal sequence; observation only'},
      elasticSyncShadow:{decisionImpact:false,version:elasticSyncShadow.VERSION,ordered:false,learnObservedOrder:true,tracks:['ACTUAL_EVENT_ORDER','PAIRWISE_LAGS','PRICE_CONSUMED','E3_RELAXATIONS','PLUS220_BEFORE_MINUS180']},
      elasticDualChainShadow:{decisionImpact:false,version:elasticDualChainShadow.VERSION,tracks:['PARALLEL_LONG_SHORT','PROOF_LIFECYCLE','MF_LBW_SLOPES','MA_REJECTION_CANDIDATES','MCB_PRICE_HANDOFF_SHADOW'],semantic:'two persistent market stories; all handoffs are observational and cannot alter V4 action'},
      admissionCounterfactualShadow:{decisionImpact:false,version:admissionCounterfactualShadow.VERSION,
        qualification:['PRICE_BEHAVIOR_INTERESTING','WAVE_MEMORY_ALIGNED','MCB_CANDIDATE_SAME_DIRECTION','PM3_PM5_ALIGNED','EFF3_GTE_25PCT','DATA_OK'],
        tracks:['BLOCKERS','MFE_MAE','PLUS220_BEFORE_MINUS180','BOUNDARY_CROSS','LIVE3_CONTINUATION','CONFIRMED3_CONTINUATION','STRUCTURAL3_ALIGNMENT'],
        semantic:'shadow-only blocked-opportunity laboratory; never weakens or bypasses active admission gates'},
      live15AcceptanceShadow:{decisionImpact:false,version:live15AcceptanceShadow.VERSION,
        entryPolicy:'LIVE15_MAY_BE_TREATED_AS_VALIDATED_ONLY_WHEN_OTHER_ENTRY_EVIDENCE_IS_READY',
        exitPolicy:'LIVE15_ALONE_IS_MEASURED_AS_HYPOTHETICAL_EXIT_AUTHORITY_ONLY',
        tracks:['FIRST_SEEN_LATENCY','PERSISTENCE','DISAPPEARANCE','TYPE_FLIP','CONFIRMATION_OUTCOME','ENTRY_MFE_MAE_BEFORE_CLOSE','EXIT_MISSED_RECOVERY_VS_AVOIDED_ADVERSE'],
        semantic:'shadow-only study of the latency gain and repaint danger of acting on provisional 15m native signals; entry and exit consequences are measured separately'},
      mfStructureShadowDecisionImpact:'TEMPORAL_ADMISSION_ONLY',
      mfStructureShadowTimeframe:'15m',
      mfStructureSemantic:'persistent HH/HL/LH/LL flow structure qualifies MCB maturity/context only; never a veto or direction source',
      mfTemporalMemory:{decisionImpact:'ADMISSION_ONLY',activeMemoryHorizons:['2h','4h'],transferSequence:['30m','1h','3m','STRONG_PM'],tickerGate:false,exitAuthority:false,semantic:'persistent 2h/4h MF memory can suspend counter-memory admission; 30m+1h+full 3m alignment plus STRONG rolling PM may confirm transfer; MCB remains direction authority'},
      structuralHandoffPreservesOnlyStructure:true,
      structuralHandoffReentryRequiresFreshPmAfterMaxExitOrHandoffTs:true,
      postSetupTranslationMateriality:{minNetUsd:10,minEfficiency:.25},
      entryTickerDecisionImpact:false,
      entryPmTranslationCanAuthorize:true,
      reinforced3mUpShortEntryImpact:'CLOSES_CURRENT_3M_SHORT_WINDOW',
      reinforced3mUpOpenShortImpact:'RESPIRATION_ALERT_ONLY',
      setupTiming:{states:['SETUP_OPEN','SETUP_LATE','SETUP_EXPIRED'],decisionImpact:'SETUP_LATE_CLOSES_NEW_ENTRY_WINDOW',lateDefinition:{candidateSide3mLobeMinAgeMinutes:12,maxRecoveryFraction:.12},semantic:'late is cycle-based, not price-distance based; once late, the same setup cannot reopen'},
      sameSetupCannotBeReusedUntilMcbSetupKeyChanges:true,
      failedCampaignRetry:{decisionImpact:true,policy:'NEW_15M_EVENT_OR_POST_EXIT_LOCAL_REQUALIFICATION',oldReinforcedEventCannotResetByItself:true,localRequalificationRequires:['NEW_POST_EXIT_3M_STRUCTURE','3M_LOBE_ALIGNED','PM3_ALIGNED','PM5_ALIGNED','REGIME_EFFICIENCY','PRODUCTIVE_PRICE_BEHAVIOR']},
      threeMinuteCycleAloneCannotResetFailed15mCampaign:true,
      structuralBoundaryCanSuspendSetup:true,
      structuralBoundaryNeverChoosesDirection:true,
      lowEdgeSub80CanSuspendSetup:true,
      chopDecisionImpact:'ONLY_WITH_SUB80_OR_UNLESS_REINFORCED_UP',
      dormantMarketCanSuspendSetup:true,
      contextDirectionImpact:false,
      rrDecisionImpact:false,
      rangeRrDecisionImpact:false,
      rangeRrSemantic:'range position qualifies remaining terrain / reclaim risk but does not choose direction',
      entryRolling3mContinuityRequired:true,
      chopEntryRequiresRolling3m5mAndEfficiency3m:.375,
      executionFailure:{decisionImpact:true,standardMaxMfeFractionOfEconomicMinimum:.25,reclaimMaxMfeFractionOfEconomicMinimum:1,requiresAdversePmAndMicrostructure:true},
      structuralPivotBreach:{decisionImpact:true,scope:'LONG_DURING_DEEP_4H_CAPITULATION',requiresPriceAndLbwBreach:true},
      hardRiskUsesObservedMae:true,
      economicProfitFloor:{decisionImpact:true,armMfeUsd:220,floorSignedUsd:180,requiresAdverseConfirmation:false,semantic:'once MFE reaches 220 USD, return to/below +180 USD exits to preserve economic viability'},
      live15ProtectionBypass:{decisionImpact:true,requires:['OPPOSING_LIVE_15M_NATIVE','OPPOSING_3M_STRUCTURE','PRODUCTIVE_ADVERSE_PM','3M_MA200_LOSS_OR_REJECTION'],confirmed15mRequired:false,tickerRequired:false,semantic:'full stack bypasses waiting for 15m close; live 15m signal alone has no exit authority'},
      mfeProtection:{decisionImpact:true,minimumMfeUsd:440,givebackReferenceUsd:180,requiresAdversePmAndMicrostructure:true},
      stressTpRunner:{decisionImpact:true,tp1Fraction:.25,tp1GivebackUsd:180,runnerGivebackUsd:360,requiresAlignedMcbAndMf:true,semantic:'productive adverse stress on a large winner takes 25% only when MCB+MF still carry the campaign; runner keeps one extra respiration unit'},
      tradingFeeModel:{decisionImpact:'ACCOUNTING_AND_ECONOMIC_PNL',entryAndExitFees:true,partialExitFees:true,liveCloseFeeEstimate:true,fundingMode:'NOT_MODELED',ratesFromConfig:true},
      tpOptimizationShadow:{decisionImpact:false,version:tpMultiFractionShadow.VERSION,tp1Fractions:tpMultiFractionShadow.TP1_FRACTIONS,tp2FractionsOfRemaining:tpMultiFractionShadow.TP2_FRACTIONS_OF_REMAINING,requiresNewCausalMfeBeforeTp2:true,feeAware:true,semantic:'counterfactual TP1/TP2 sizing only; never changes live V4 action or position size'},
      dominanceDecisionImpact:false,
      maxLossUsd:500,
      e15MajorPairSpanLbw:80,
      e15MajorPairDecisionImpact:false,
      economicMoveMinimumUsd:220,
      economicMovePreferredUsd:250,
      gainRetentionReferenceUsd:180
    }
  };
}
module.exports={evaluate,VERSION};
