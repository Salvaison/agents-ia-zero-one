'use strict';
const {nested3mCoherence}=require('./opportunity-maturity');

function maxFinite(values){
  const a=values.map(Number).filter(Number.isFinite);
  return a.length?Math.max(...a):null;
}
function activeTimingShadow(coherence,previousSetup,prevSame,marketTs,setupTs){
  const prior=prevSame&&previousSetup&&previousSetup.timingShadow||null;
  const established=coherence&&['STRUCTURAL_ALIGNED','LOBE_ALIGNED'].includes(coherence.state);
  const state=established?'SETUP_LATE':'SETUP_OPEN';
  return {
    state,decisionImpact:false,
    openedAt:prior&&prior.openedAt||setupTs,
    lateAt:state==='SETUP_LATE'?(prior&&prior.lateAt||marketTs):null,
    expiredAt:null,
    basis:established?'3m aligned lobe already established; classify as late in shadow only':'3m aligned turn is still the open execution window',
    semantic:'shadow lifecycle only: observe OPEN -> LATE -> EXPIRED before deciding whether LATE should become non-tradable'
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
    semantic:'shadow lifecycle only; expiry is observed, except explicit UP_REINFORCED_3M closes a SHORT entry window immediately'
  };
}
function evaluate(frame,baseThesis,mcb,background,structuralRoom,marketQuality,nativeSignal,previousSetup,position,entryControl,capitulationGuard=null){
  const candidate=baseThesis&&(baseThesis.candidateDirection||baseThesis.direction)||null;
  const c=mcb&&mcb.currentLobe||{};
  const n3=mcb&&mcb.nested3m||{};
  const relation=background&&background.primaryRelation||'UNKNOWN';
  const coherence=nested3mCoherence(mcb,candidate);
  const marketTs=Number(frame.market.timestamp);
  const lastExitTs=entryControl&&Number(entryControl.lastExitTs)||null;
  const lastConsumedSetupKey=entryControl&&entryControl.setupKey||null;
  const structuralEventTs=maxFinite([c.startTs,c.extremeTs,n3.startTs,n3.extremeTs]);

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
  const lowEdgeSub80=!!(marketQuality&&marketQuality.lowEdge&&!majorPair&&!reinforcedUpBypass);
  const reinforced3m=nativeSignal&&nativeSignal.reinforced3mUp||null;
  const reinforced3mEventTs=reinforced3m&&reinforced3m.event?Number(reinforced3m.event.ts):null;
  const n3CycleTs=Number(n3.startTs);
  const reinforced3mShortClose=!!(
    candidate==='short'&&reinforced3m&&reinforced3m.active&&
    Number.isFinite(reinforced3mEventTs)&&Number.isFinite(n3CycleTs)&&
    reinforced3mEventTs>=n3CycleTs
  );

  const reasons=[];
  if(capitulationGuard&&capitulationGuard.blocked)reasons.push(capitulationGuard.state);
  if(!syncReady)reasons.push('WAIT_3M_15M_SYNC');
  if(lowEdgeSub80)reasons.push('LOW_EDGE_REQUIRES_MAJOR_MCB_OR_REINFORCED_UP');
  if(!roomReady)reasons.push('BOUNDARY_CONTEST');
  if(!activityReady)reasons.push('DORMANT_MARKET');
  if(reinforced3mShortClose)reasons.push('UP_REINFORCED_3M_CLOSES_SHORT_ENTRY_WINDOW');

  const nativeToken=reinforcedUpBypass&&nativeSignal&&nativeSignal.reinforcedUp&&nativeSignal.reinforcedUp.event
    ?Number(nativeSignal.reinforcedUp.event.ts)||0:0;
  const fourHourArmToken=capitulationGuard&&capitulationGuard.arm&&capitulationGuard.arm.token||null;
  const capitulationReversal=!!(capitulationGuard&&capitulationGuard.deepReached&&capitulationGuard.arm&&capitulationGuard.arm.active);
  const baseToken=[
    candidate,
    baseThesis&&baseThesis.mode||'',
    Number(c.startTs)||0,
    Number(n3.startTs)||0,
    nativeToken,
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
  const campaignReset=reinforcedUpBypass||nativeAfterExit;
  const campaignRetryBlocked=lastCampaignLoss&&!campaignReset;
  if(campaignRetryBlocked)reasons.push('CAMPAIGN_RETRY_NEEDS_NEW_15M_EVENT_AFTER_FAILED_TRADE');

  const thesisConsumed=!!(lastConsumedSetupKey&&lastConsumedSetupKey===baseToken);
  if(thesisConsumed)reasons.push('THESIS_CONSUMED_WAIT_MCB_CHANGE');

  const previousActiveSame=!!(previousSetup&&previousSetup.status==='SETUP'&&previousSetup.setupKey===baseToken);
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
      campaignKey,lastCampaignKey,lastCampaignLoss,campaignReset,nativeAfterExit,campaignRetryBlocked,
      capitulationGuard:capitulationGuard||null,fourHourArmToken,capitulationReversal,
      pairClass,majorPair,lowEdgeSub80,reinforcedUpBypass,counterBackgroundLocalProof,alignedAfterExtreme,
      reinforced3mShortClose,noNewShort:reinforced3mShortClose,
      timingShadow,
      setupId:previousActiveSame?previousSetup.setupId||null:null,
      setupTs:previousActiveSame?previousSetup.setupTs||null:null,
      setupKey:baseToken,admissionAllowed:false,reasons,
      reason:reasons.join(' + ')
    };
  }

  const prevSame=previousActiveSame;
  const setupTs=prevSame?Number(previousSetup.setupTs):marketTs;
  const setupId=prevSame?previousSetup.setupId:[baseToken,setupTs].join('@');
  const timingShadow=activeTimingShadow(coherence,previousSetup,prevSame,marketTs,setupTs);
  return {
    status:'SETUP',candidateDirection:candidate,direction:candidate,
    setupId,setupKey:baseToken,setupTs,
    createdAt:prevSame?previousSetup.createdAt||setupTs:marketTs,
    relationToBackground:relation,localSync:coherence,
    structuralRoom:structuralRoom&&structuralRoom.state||null,
    marketQuality:marketQuality&&marketQuality.state||null,
    thesisConsumed:false,structuralEventTs,lastExitTs,lastConsumedSetupKey,
    campaignKey,lastCampaignKey,lastCampaignLoss,campaignReset,nativeAfterExit,campaignRetryBlocked:false,
    capitulationGuard:capitulationGuard||null,fourHourArmToken,capitulationReversal,
    backgroundQualifier:against?'COUNTER_1H_WAVE':'WITH_1H_WAVE',
    pairClass,majorPair,lowEdgeSub80,reinforcedUpBypass,counterBackgroundLocalProof,alignedAfterExtreme,
    reinforced3mShortClose:false,noNewShort:false,timingShadow,
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
      thesisNotConsumed:true
    },
    reason:against
      ?'MCB local setup armed against the current 1h wave leg; 1h is a risk/quality qualifier only and fresh execution proof must still be built from zero'
      :'MCB local setup armed; post-setup microstructure evidence must now be built from zero'
  };
}
module.exports={evaluate,maxFinite,activeTimingShadow,expiredTimingShadow};
