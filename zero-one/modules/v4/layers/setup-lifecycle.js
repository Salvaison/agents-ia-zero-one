'use strict';
const {nested3mCoherence}=require('./opportunity-maturity');

function maxFinite(values){
  const a=values.map(Number).filter(Number.isFinite);
  return a.length?Math.max(...a):null;
}
function activeTimingShadow(coherence,previousSetup,prevSame,marketTs,setupTs,n3=null,candidate=null,timingOriginTs=null,timingOriginSource=null){
  const prior=prevSame&&previousSetup&&previousSetup.timingShadow||null;
  const into=n3&&(Number(n3.lobeSign)>0?'long':Number(n3.lobeSign)<0?'short':null);
  const nativeOrigin=Number(timingOriginTs);
  const n3Origin=n3&&Number(n3.startTs);
  const originTs=Number.isFinite(nativeOrigin)?nativeOrigin:(Number.isFinite(n3Origin)?n3Origin:null);
  const ageMinutes=Number.isFinite(originTs)
    ?Math.max(0,(Number(marketTs)-originTs)/60000):null;
  let recovery=n3&&Number(n3.recoveryFraction);
  if(!Number.isFinite(recovery)){
    const cur=n3&&Math.abs(Number(n3.currentLbw)),ext=n3&&Math.abs(Number(n3.extremeLbw));
    recovery=Number.isFinite(cur)&&Number.isFinite(ext)&&ext>0?Math.max(0,Math.min(1,(ext-cur)/ext)):null;
  }
  const sameInto=!!(candidate&&into===candidate);
  const establishedFourBars=Number.isFinite(ageMinutes)&&ageMinutes>=12;
  const extending=Number.isFinite(recovery)&&recovery<=.12;
  const priorLate=!!(prior&&prior.state==='SETUP_LATE'&&prior.blocksNewEntry);
  const activeLate=priorLate||!!(sameInto&&establishedFourBars&&extending);
  const state=activeLate?'SETUP_LATE':'SETUP_OPEN';
  return {
    state,
    decisionImpact:activeLate?'CLOSES_NEW_ENTRY_WINDOW':false,
    blocksNewEntry:activeLate,
    openedAt:prior&&prior.openedAt||setupTs,
    lateAt:activeLate?(prior&&prior.lateAt||marketTs):null,
    expiredAt:null,
    lobeAgeMinutes:Number.isFinite(ageMinutes)?ageMinutes:null,
    timingOriginTs:Number.isFinite(originTs)?originTs:null,
    timingOriginSource:timingOriginSource||(Number.isFinite(nativeOrigin)?'NATIVE_3M_SYNC':'CURRENT_3M_LOBE_START'),
    lobeRecoveryFraction:Number.isFinite(recovery)?recovery:null,
    lobeDirection:into,
    candidateDirection:candidate||null,
    basis:activeLate
      ?'3m candidate lobe has already consumed >=4 bars while still EXTENDING near its extreme'
      :'3m execution cycle remains inside the admissible opening window',
    semantic:'active lifecycle: SETUP_LATE closes new entry when the candidate-side 3m lobe is >=12m old and recovery <=12%; no fixed USD move is used'
  };
}
function expiredTimingShadow(previousSetup,marketTs,reason){
  const prior=previousSetup&&previousSetup.timingShadow||null;
  return {
    state:'SETUP_EXPIRED',decisionImpact:false,
    openedAt:prior&&prior.openedAt||previousSetup&&previousSetup.setupTs||null,
    lateAt:prior&&prior.lateAt||null,
    expiredAt:marketTs,
    basis:reason||'3m cycle no longer supports the armed setup',
    semantic:'lifecycle expiry is descriptive here; explicit active gates (including SETUP_LATE and UP_REINFORCED_3M for SHORT) close entry windows separately'
  };
}
function mfMemoryAdmission(candidate,mfStructure,mcb,nativeSignal){
  const temporal=mfStructure&&mfStructure.temporal||null;
  const memory=temporal&&temporal.memoryDirection||null;
  const horizon=temporal&&temporal.memoryHorizon||null;
  const tactical=temporal&&temporal.tacticalDirection||null;
  const activeSlowMemory=!!(memory&&['h2','h4'].includes(horizon));
  const reinforcedUpBypass=!!(
    candidate==='long'&&nativeSignal&&nativeSignal.reinforcedUp&&nativeSignal.reinforcedUp.active
  );

  const n3=mcb&&mcb.nested3m||{};
  const lobe3=n3.lobeDirection||
    (Number(n3.lobeSign)>0?'long':Number(n3.lobeSign)<0?'short':null);
  const structural3=n3.structuralDirection||null;
  const h1=temporal&&temporal.horizons&&temporal.horizons.h1||null;
  const h1Direction=h1&&h1.direction||null;

  const base={
    activeSlowMemory,memoryDirection:memory,memoryHorizon:horizon,
    tacticalDirection:tactical,h1Direction,
    threeMinuteLobeDirection:lobe3,threeMinuteStructuralDirection:structural3,
    reinforcedUpBypass,
    decisionImpact:activeSlowMemory?'ADMISSION_ONLY':'NONE'
  };

  if(!candidate||!activeSlowMemory||candidate===memory){
    return {...base,allowed:true,requiresTransfer:false,state:!activeSlowMemory?'MF_MEMORY_NOT_ACTIVE':'MF_MEMORY_ALIGNED'};
  }
  if(reinforcedUpBypass){
    return {...base,allowed:true,requiresTransfer:false,state:'MF_MEMORY_NATIVE_REINFORCED_BYPASS'};
  }
  if(tactical!==candidate){
    return {...base,allowed:false,requiresTransfer:true,state:'WAIT_MF_MEMORY',
      reason:'candidate opposes persistent 2h/4h MF memory and 30m MF has not transferred to the candidate'};
  }
  if(h1Direction!==candidate){
    return {...base,allowed:false,requiresTransfer:true,state:'WAIT_MF_TRANSFER_1H',
      reason:'30m MF attacks with candidate but 1h MF has not transferred yet'};
  }
  if(structural3!==candidate||lobe3!==candidate){
    return {...base,allowed:false,requiresTransfer:true,state:'WAIT_MF_TRANSFER_3M',
      reason:'30m+1h MF transfer is forming but 3m structure and lobe are not both aligned'};
  }

  return {...base,allowed:true,requiresTransfer:true,state:'MF_TRANSFER_READY_FOR_STRONG_PM',
    reason:'opposing slow MF memory may be challenged only after 30m+1h transfer and full 3m alignment; strong rolling PM still required before entry'};
}

function evaluate(frame,baseThesis,mcb,background,structuralRoom,marketQuality,nativeSignal,previousSetup,position,entryControl,capitulationGuard=null,mfStructure=null,rollingTranslation=null,priceBehavior=null){
  const candidate=baseThesis&&(baseThesis.candidateDirection||baseThesis.direction)||null;
  const c=mcb&&mcb.currentLobe||{};
  const n3=mcb&&mcb.nested3m||{};
  const relation=background&&background.primaryRelation||'UNKNOWN';
  const coherence=nested3mCoherence(mcb,candidate);
  const marketTs=Number(frame.market.timestamp);
  const lastExitTs=entryControl&&Number(entryControl.lastExitTs)||null;
  const lastConsumedSetupKey=entryControl&&entryControl.setupKey||null;
  const structuralEventTs=maxFinite([c.startTs,c.extremeTs,n3.startTs,n3.extremeTs]);

  const dq=mcb&&mcb.dataQuality||null;
  if(!position&&dq&&dq.fifteenMinute&&dq.fifteenMinute.ready===false){
    return {status:'OBSERVE',candidateDirection:candidate,direction:null,admissionAllowed:false,
      dataQuality:dq,reasons:['DATA_DEGRADED_15M'],reason:'DATA_DEGRADED_15M: fresh 15m MCB authority unavailable'};
  }
  if(!position&&dq&&dq.threeMinute&&dq.threeMinute.ready===false){
    return {status:'OBSERVE',candidateDirection:candidate,direction:null,admissionAllowed:false,
      dataQuality:dq,reasons:['DATA_DEGRADED_3M'],reason:'DATA_DEGRADED_3M: fresh 3m timing/structure unavailable'};
  }

  if(position){
    return {
      status:'CONSUMED',direction:position.direction,candidateDirection:candidate,
      setupId:previousSetup&&previousSetup.setupId||position.entrySetupId||null,
      setupTs:previousSetup&&previousSetup.setupTs||null,
      consumedAt:marketTs,
      reason:'setup already consumed by an open position',
      admissionAllowed:false
    };
  }
  if(!candidate){
    return {status:'OBSERVE',candidateDirection:null,reason:'no local MCB candidate',admissionAllowed:false};
  }

  const against=relation==='AGAINST_BACKGROUND';
  const pairClass=baseThesis&&baseThesis.quality&&baseThesis.quality.pairClass||
    c.relationshipFromPrevious&&c.relationshipFromPrevious.pairQuality&&c.relationshipFromPrevious.pairQuality.class||'UNPAIRED';
  const majorPair=pairClass==='PAIR_MAJOR_QUALITATIVE';
  const reinforcedUpBypass=!!(candidate==='long'&&nativeSignal&&nativeSignal.reinforcedUp&&nativeSignal.reinforcedUp.active);
  const coherenceEventTs=coherence.state==='STRUCTURAL_ALIGNED'
    ?Number(n3.structuralConfirmedAt)
    :Number(n3.startTs);
  const alignedAfterExtreme=!!(
    ['STRUCTURAL_ALIGNED','LOBE_ALIGNED'].includes(coherence.state)&&
    Number.isFinite(coherenceEventTs)&&Number.isFinite(Number(c.extremeTs))&&
    coherenceEventTs>=Number(c.extremeTs)
  );
  const counterBackgroundLocalProof=['STRUCTURAL_ALIGNED','TURN_ALIGNED'].includes(coherence.state)||alignedAfterExtreme;
  // V4.7: 1h is a context/quality qualifier, never an admission veto by itself.
  const againstReady=true;
  const syncReady=!!coherence.coherent;
  const roomReady=!(structuralRoom&&structuralRoom.admissionBlocked);
  const activityReady=!(marketQuality&&marketQuality.admissionBlocked);
  // V4.10.8: a sub-80 15m pair in CHOP may arm a setup when rolling
  // PM3 AND PM5 already convert in the MCB candidate direction with the same
  // reinforced efficiency (37.5%) required by entryContinuityProof in CHOP.
  // This is NOT entry permission: fresh post-setup PM and every other gate remain.
  const lowEdgeBase=!!(marketQuality&&marketQuality.lowEdge&&!majorPair&&!reinforcedUpBypass);
  const lowEdgeH=rollingTranslation&&rollingTranslation.horizons||{};
  const lowEdgeNet3=Number(lowEdgeH.net3mUsd),lowEdgeNet5=Number(lowEdgeH.net5mUsd);
  const lowEdgeEff3=Number(lowEdgeH.efficiency3m);
  const lowEdgePmAligned=(candidate==='long'
    ?lowEdgeNet3>0&&lowEdgeNet5>0
    :candidate==='short'&&lowEdgeNet3<0&&lowEdgeNet5<0);
  const lowEdgeOverrideReady=!!(
    lowEdgeBase&&syncReady&&
    Number.isFinite(lowEdgeNet3)&&Number.isFinite(lowEdgeNet5)&&
    Number.isFinite(lowEdgeEff3)&&lowEdgePmAligned&&lowEdgeEff3>=.375
  );
  const lowEdgeSub80=lowEdgeBase&&!lowEdgeOverrideReady;
  const lowEdgeException={
    eligible:lowEdgeBase,ready:lowEdgeOverrideReady,
    status:!lowEdgeBase?'NOT_REQUIRED':lowEdgeOverrideReady?'ROLLING_3M_5M_REQUALIFIED':'WAIT_ROLLING_3M_5M',
    minEfficiency3m:.375,net3mUsd:Number.isFinite(lowEdgeNet3)?lowEdgeNet3:null,
    net5mUsd:Number.isFinite(lowEdgeNet5)?lowEdgeNet5:null,
    efficiency3m:Number.isFinite(lowEdgeEff3)?lowEdgeEff3:null,
    structural3mCoherent:syncReady,postSetupPmStillRequired:true,decisionImpact:'SETUP_ONLY'
  };
  const reinforced3m=nativeSignal&&nativeSignal.reinforced3mUp||null;
  const reinforced3mEventTs=reinforced3m&&reinforced3m.event?Number(reinforced3m.event.ts):null;
  const n3CycleTs=Number(n3.startTs);
  const reinforced3mShortClose=!!(
    candidate==='short'&&reinforced3m&&reinforced3m.active&&
    Number.isFinite(reinforced3mEventTs)&&Number.isFinite(n3CycleTs)&&
    reinforced3mEventTs>=n3CycleTs
  );

  const mfMemory=mfMemoryAdmission(candidate,mfStructure,mcb,nativeSignal);

  const reasons=[];
  if(capitulationGuard&&capitulationGuard.blocked)reasons.push(capitulationGuard.state);
  if(!syncReady)reasons.push('WAIT_3M_15M_SYNC');
  if(lowEdgeSub80)reasons.push('LOW_EDGE_REQUIRES_MAJOR_MCB_OR_REINFORCED_UP');
  if(!roomReady)reasons.push('BOUNDARY_CONTEST');
  if(!activityReady)reasons.push('DORMANT_MARKET');
  if(reinforced3mShortClose)reasons.push('UP_REINFORCED_3M_CLOSES_SHORT_ENTRY_WINDOW');
  if(!mfMemory.allowed)reasons.push(mfMemory.state);

  const fourHourArmToken=capitulationGuard&&capitulationGuard.arm&&capitulationGuard.arm.token||null;
  const capitulationReversal=!!(capitulationGuard&&capitulationGuard.deepReached&&capitulationGuard.arm&&capitulationGuard.arm.active);
  // Setup identity is causal, not descriptive: changing from STRUCTURAL to
  // NATIVE_UP_REINFORCED inside the same 15m campaign / 3m cycle must not
  // manufacture a fresh execution window or reset post-setup evidence.
  const baseToken=[
    candidate,
    Number(c.startTs)||0,
    Number(n3.startTs)||0,
    fourHourArmToken||0
  ].join('|');
  const campaignKey=[candidate,Number(c.startTs)||0].join('|');
  const lastCampaignKey=entryControl&&entryControl.campaignKey||null;
  const lastCampaignLoss=!!(
    lastCampaignKey&&lastCampaignKey===campaignKey&&
    entryControl&&entryControl.direction===candidate&&
    Number.isFinite(Number(entryControl.pnlUsd))&&Number(entryControl.pnlUsd)<=0
  );
  const latestNative=nativeSignal&&nativeSignal.latest||null;
  const nativeAligned=!!(
    latestNative&&
    ((candidate==='long'&&latestNative.type==='UP')||(candidate==='short'&&latestNative.type==='DN'))
  );
  const nativeAfterExit=!!(
    nativeAligned&&Number.isFinite(lastExitTs)&&Number(latestNative.ts)>lastExitTs
  );

  // V4.10.7: a failed 15m campaign may be retried without waiting for a new
  // 15m native event only when genuinely NEW local evidence formed after the
  // failed exit. An old reinforced event can still qualify the broader setup,
  // but it can no longer reset a losing campaign by itself.
  const lobe3=n3.lobeDirection||(Number(n3.lobeSign)>0?'long':Number(n3.lobeSign)<0?'short':null);
  const structural3=n3.structuralDirection||null;
  const structural3At=Number(n3.structuralConfirmedAt);
  const freshStructural3AfterExit=!!(
    Number.isFinite(lastExitTs)&&Number.isFinite(structural3At)&&structural3At>lastExitTs&&
    structural3===candidate&&lobe3===candidate
  );
  const rh=rollingTranslation&&rollingTranslation.horizons||{};
  const net3=Number(rh.net3mUsd),net5=Number(rh.net5mUsd),eff3=Number(rh.efficiency3m);
  const pm3Aligned=Number.isFinite(net3)&&Math.abs(net3)>=10&&((candidate==='long'&&net3>0)||(candidate==='short'&&net3<0));
  const pm5Aligned=Number.isFinite(net5)&&Math.abs(net5)>=10&&((candidate==='long'&&net5>0)||(candidate==='short'&&net5<0));
  const lowEfficiencyRegime=!!(marketQuality&&['CHOP_SHADOW','LOW_EDGE_SHADOW'].includes(marketQuality.state));
  const minRetryEfficiency3m=lowEfficiencyRegime?.375:.25;
  const pmContinuityReady=pm3Aligned&&pm5Aligned&&Number.isFinite(eff3)&&eff3>=minRetryEfficiency3m;
  const priceBehaviorReady=!!(priceBehavior&&priceBehavior.interesting&&priceBehavior.direction===candidate);
  const localRetryRequalification={
    ready:!!(lastCampaignLoss&&freshStructural3AfterExit&&pmContinuityReady&&priceBehaviorReady),
    freshStructural3AfterExit,lobe3,structural3,structural3At,
    pm3Aligned,pm5Aligned,net3mUsd:Number.isFinite(net3)?net3:null,net5mUsd:Number.isFinite(net5)?net5:null,
    efficiency3m:Number.isFinite(eff3)?eff3:null,minEfficiency3m:minRetryEfficiency3m,
    priceBehaviorReady,priceBehaviorState:priceBehavior&&priceBehavior.state||null,
    semantic:'same-campaign retry may reopen on fresh post-exit 3m structure+lobe plus aligned PM3/PM5 and productive price behavior'
  };
  const campaignReset=!!(nativeAfterExit||localRetryRequalification.ready);
  const campaignResetReason=nativeAfterExit?'NEW_15M_EVENT_AFTER_EXIT':localRetryRequalification.ready?'LOCAL_POST_EXIT_REQUALIFICATION':null;
  const campaignRetryBlocked=lastCampaignLoss&&!campaignReset;
  if(campaignRetryBlocked)reasons.push('CAMPAIGN_RETRY_NEEDS_NEW_15M_OR_LOCAL_REQUALIFICATION');

  const thesisConsumed=!!(lastConsumedSetupKey&&lastConsumedSetupKey===baseToken);
  if(thesisConsumed)reasons.push('THESIS_CONSUMED_WAIT_MCB_CHANGE');

  const previousSameSetup=!!(previousSetup&&previousSetup.setupKey===baseToken);
  const previousActiveSame=!!(previousSameSetup&&previousSetup.status==='SETUP');
  if(reasons.length){
    const timingShadow=previousActiveSame
      ?expiredTimingShadow(previousSetup,marketTs,reinforced3mShortClose?'UP_REINFORCED_3M ended the current SHORT timing window':coherence.reason||reasons[0])
      :(previousSetup&&previousSetup.setupKey===baseToken&&previousSetup.timingShadow||null);
    return {
      status:'OBSERVE',candidateDirection:candidate,direction:null,
      relationToBackground:relation,localSync:coherence,
      structuralRoom:structuralRoom&&structuralRoom.state||null,
      marketQuality:marketQuality&&marketQuality.state||null,
      thesisConsumed,structuralEventTs,lastExitTs,lastConsumedSetupKey,
      campaignKey,lastCampaignKey,lastCampaignLoss,campaignReset,campaignResetReason,nativeAfterExit,localRetryRequalification,campaignRetryBlocked,
      capitulationGuard:capitulationGuard||null,fourHourArmToken,capitulationReversal,
      pairClass,majorPair,lowEdgeSub80,lowEdgeException,reinforcedUpBypass,counterBackgroundLocalProof,alignedAfterExtreme,
      reinforced3mShortClose,noNewShort:reinforced3mShortClose,
      mfMemory,mfTransferRequired:!!mfMemory.requiresTransfer,
      timingShadow,
      setupId:previousSameSetup?previousSetup.setupId||null:null,
      setupTs:previousSameSetup?previousSetup.setupTs||null:null,
      createdAt:previousSameSetup?previousSetup.createdAt||previousSetup.setupTs||null:null,
      setupKey:baseToken,admissionAllowed:false,reasons,
      reason:reasons.join(' + ')
    };
  }

  const prevSame=previousSameSetup;
  const previousSetupTsValid=!!(prevSame&&previousSetup&&previousSetup.setupTs!==null&&previousSetup.setupTs!==undefined&&previousSetup.setupTs!==''&&Number.isFinite(Number(previousSetup.setupTs))&&Number(previousSetup.setupTs)>0);
  const setupTs=previousSetupTsValid?Number(previousSetup.setupTs):marketTs;
  const setupId=previousSetupTsValid&&previousSetup.setupId?previousSetup.setupId:[baseToken,setupTs].join('@');
  const reinforcedSync3=nativeSignal&&nativeSignal.reinforcedLongSync&&nativeSignal.reinforcedLongSync.active
    ?nativeSignal.reinforcedLongSync.signal3m:null;
  const reinforcedSync3Ts=reinforcedUpBypass&&reinforcedSync3?Number(reinforcedSync3.ts):null;
  const current3Start=Number(n3.startTs);
  const timingOriginTs=Number.isFinite(reinforcedSync3Ts)
    ?(Number.isFinite(current3Start)?Math.min(reinforcedSync3Ts,current3Start):reinforcedSync3Ts)
    :(Number.isFinite(current3Start)?current3Start:null);
  const timingOriginSource=Number.isFinite(reinforcedSync3Ts)?'REINFORCED_15M_SYNC_3M_UP':'CURRENT_3M_LOBE_START';
  const timingShadow=activeTimingShadow(coherence,previousSetup,prevSame,marketTs,setupTs,n3,candidate,timingOriginTs,timingOriginSource);
  if(timingShadow.blocksNewEntry){
    return {
      status:'OBSERVE',candidateDirection:candidate,direction:null,
      setupId,setupKey:baseToken,setupTs,
      createdAt:prevSame?previousSetup.createdAt||previousSetup.setupTs||setupTs:marketTs,
      relationToBackground:relation,localSync:coherence,
      structuralRoom:structuralRoom&&structuralRoom.state||null,
      marketQuality:marketQuality&&marketQuality.state||null,
      thesisConsumed:false,structuralEventTs,lastExitTs,lastConsumedSetupKey,
      campaignKey,lastCampaignKey,lastCampaignLoss,campaignReset,campaignResetReason,nativeAfterExit,localRetryRequalification,campaignRetryBlocked:false,
      capitulationGuard:capitulationGuard||null,fourHourArmToken,capitulationReversal,
      backgroundQualifier:against?'COUNTER_1H_WAVE':'WITH_1H_WAVE',
      pairClass,majorPair,lowEdgeSub80,lowEdgeException,reinforcedUpBypass,counterBackgroundLocalProof,alignedAfterExtreme,
      reinforced3mShortClose:false,noNewShort:false,timingShadow,
      mfMemory,mfTransferRequired:!!mfMemory.requiresTransfer,
      admissionAllowed:false,
      reasons:['SETUP_LATE_CLOSES_ENTRY_WINDOW'],
      reason:'SETUP_LATE_CLOSES_ENTRY_WINDOW: candidate-side 3m lobe has already consumed >=4 bars while still extending near its extreme'
    };
  }
  return {
    status:'SETUP',candidateDirection:candidate,direction:candidate,
    setupId,setupKey:baseToken,setupTs,
    createdAt:prevSame?previousSetup.createdAt||previousSetup.setupTs||setupTs:marketTs,
    relationToBackground:relation,localSync:coherence,
    structuralRoom:structuralRoom&&structuralRoom.state||null,
    marketQuality:marketQuality&&marketQuality.state||null,
    thesisConsumed:false,structuralEventTs,lastExitTs,lastConsumedSetupKey,
    campaignKey,lastCampaignKey,lastCampaignLoss,campaignReset,campaignResetReason,nativeAfterExit,localRetryRequalification,campaignRetryBlocked:false,
    capitulationGuard:capitulationGuard||null,fourHourArmToken,capitulationReversal,
    backgroundQualifier:against?'COUNTER_1H_WAVE':'WITH_1H_WAVE',
    pairClass,majorPair,lowEdgeSub80,lowEdgeException,reinforcedUpBypass,counterBackgroundLocalProof,alignedAfterExtreme,
    reinforced3mShortClose:false,noNewShort:false,timingShadow,
    mfMemory,mfTransferRequired:!!mfMemory.requiresTransfer,
    admissionAllowed:true,
    requirements:{
      local3m15mSync:true,
      oneHourRelation:relation,
      againstBackgroundExtraProof:false,
      oneHourDecisionImpact:'QUALIFIER_ONLY',
      fourHourCapitulationState:capitulationGuard&&capitulationGuard.state||'NORMAL',
      fourHourCapitulationDecisionImpact:!!(capitulationGuard&&capitulationGuard.decisionImpact),
      reinforcedUpBypass:reinforcedUpBypass,
      counterBackgroundLocalProof:counterBackgroundLocalProof,
      majorPairOrStrongSignal:majorPair||reinforcedUpBypass,
      boundaryResolved:true,
      marketNotDormant:true,
      thesisNotConsumed:true,
      mfMemoryAdmission:mfMemory.state,
      mfTransferStrongPmRequired:!!mfMemory.requiresTransfer
    },
    reason:mfMemory.requiresTransfer
      ?'MF_TRANSFER_FORMING: candidate challenges persistent 2h/4h MF memory; 30m+1h+3m transfer is structurally ready, waiting for strong rolling PM before execution'
      :(against
        ?'MCB local setup armed against the current 1h wave leg; 1h is a risk/quality qualifier only and fresh execution proof must still be built from zero'
        :'MCB local setup armed; post-setup microstructure evidence must now be built from zero')
  };
}
module.exports={evaluate,maxFinite,activeTimingShadow,expiredTimingShadow,mfMemoryAdmission};
