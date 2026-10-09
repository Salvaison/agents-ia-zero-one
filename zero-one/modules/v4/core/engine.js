'use strict';

const mcbState=require('../layers/mcb-state');
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

const VERSION='v4.9.2-tp-shadow-20261009';

function evaluate(frame,position=null,previousEvaluation=null){
  const previousMcb=previousEvaluation&&previousEvaluation.mcb||null;
  const mcb=mcbState.evaluate(frame,previousMcb);

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
    capGuard
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
    setup,thesis:entryThesis,translation:entryTranslation,ticker:entryTicker,nativeSignal:native,
    marketQuality:quality,structuralRoom:room,background,capitulationGuard:capGuard,
    mfStructureShadow:mfStructure
  });

  return {
    version:VERSION,
    evaluatedAt:Date.now(),
    marketTimestamp:frame.market.timestamp,
    price:frame.market.price,
    mcb,
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
    structuralHandoff,
    entryTranslation,
    entryTicker,
    risk:r,
    action:a,
    contract:{
      directionAuthority:'MCB_ONLY',
      backgroundPrimary:'1H_WAVE_LEG_QUALIFIER_ONLY',
      oneHourAdmissionImpact:false,
      oneHourSemantic:'1h E-to-E describes the current 1h wave leg; it qualifies risk/quality but never vetoes a valid 15m/3m setup by itself',
      structuralDirectionContract:'LOBE_IS_LOCATION_E_TO_E_IS_DIRECTION',
      structuralTrajectoryTimeframes:['3m','15m','1h','4h','1d','1w'],
      structuralTrajectoryDecisionImpact:{'3m':'TIMING','15m':'THESIS_CANDIDATE','1h':'QUALIFIER','4h':'CAPITULATION_PERMISSION','1d':'SHADOW','1w':'SHADOW'},
      reinforcedUpThresholdLbw:-60,
      reinforcedUpBackgroundBypassLong:true,
      reinforcedUpCanCreateLongCandidateInDeepTrough:true,
      reinforcedDnSynthetic:false,
      macro4hDailyDecisionImpact:'4H_CAPITULATION_PERMISSION_ONLY; DAILY_SHADOW',
      fourHourCapitulationGuard:{thresholdLbw:-60,requiresConfirmedSub60Up:true,requiresFresh15mAfterArm:true,oneArmOneFailedCampaign:true},
      entryRequiresStructuralSetup:true,
      preSetupMicrostructureAdmissionImpact:false,
      postExitPreservesMcbContext:true,
      postExitResetsMicrostructureProof:true,
      structuralHandoffShadowDecisionImpact:false,
      mfStructureShadowDecisionImpact:false,
      mfStructureShadowTimeframe:'15m',
      mfStructureSemantic:'persistent HH/HL/LH/LL flow structure qualifies MCB maturity/context only; never a veto or direction source',
      structuralHandoffPreservesOnlyStructure:true,
      structuralHandoffReentryRequiresFreshPmAfterMaxExitOrHandoffTs:true,
      postSetupTranslationMateriality:{minNetUsd:10,minEfficiency:.25},
      entryTickerDecisionImpact:false,
      entryPmTranslationCanAuthorize:true,
      reinforced3mUpShortEntryImpact:'CLOSES_CURRENT_3M_SHORT_WINDOW',
      reinforced3mUpOpenShortImpact:'RESPIRATION_ALERT_ONLY',
      setupTimingShadow:{states:['SETUP_OPEN','SETUP_LATE','SETUP_EXPIRED'],decisionImpact:false},
      sameSetupCannotBeReusedUntilMcbSetupKeyChanges:true,
      failed15mCampaignRetryRequiresNewAligned15mNativeEvent:true,
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
