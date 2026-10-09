'use strict';

const {opposite}=require('../core/utils');

const VERSION='structural-handoff-shadow-v0.1';

function directionFrom15(baseThesis,native){
  // 15m THESIS is the campaign authority. A native UP/DN qualifies the thesis,
  // but an older native event must never overwrite a newer MCB candidate/turn.
  const d=baseThesis&&(baseThesis.candidateDirection||baseThesis.direction)||null;
  if(d)return {direction:d,source:'15M_MCB_THESIS',event:native&&native.latest||null};
  const e=native&&native.latest||null;
  if(e&&native.recent){
    if(e.type==='DN')return {direction:'short',source:'15M_NATIVE_DN_FALLBACK',event:e};
    if(e.type==='UP')return {direction:'long',source:'15M_NATIVE_UP_FALLBACK',event:e};
  }
  return {direction:null,source:'NONE',event:e||null};
}
function directionFrom3(mcb){
  const n=mcb&&mcb.nested3m||{};
  const structural=n.structuralDirection||null;
  const into=Number(n.lobeSign)>0?'long':Number(n.lobeSign)<0?'short':null;
  const d=structural||n.turningDirection||into||null;
  return {
    direction:d,
    source:structural?'3M_STRUCTURAL_TRAJECTORY':n.turningDirection?'3M_TURNING_DIRECTION':(into?'3M_LOBE_FALLBACK':'NONE'),
    structuralDirection:structural,
    structuralState:n.structuralState||null,
    lobeDirection:into
  };
}
function opposite15EventAfter(native,direction,detectedAt){
  const e=native&&native.latest||null;
  if(!e||!Number.isFinite(Number(e.ts))||Number(e.ts)<=Number(detectedAt))return false;
  return (direction==='short'&&e.type==='UP')||(direction==='long'&&e.type==='DN');
}
function evaluateStructure(frame,position,mcb,baseThesis,background,native,translation,previous=null){
  const marketTs=Number(frame&&frame.market&&frame.market.timestamp);
  const h1=background&&background.oneHour||{};
  const h1Direction=h1.structuralDirection||null;
  const d15=directionFrom15(baseThesis,native);
  const d3=directionFrom3(mcb);
  const triple=!!(h1Direction&&d15.direction&&d3.direction&&h1Direction===d15.direction&&h1Direction===d3.direction);

  let active=false,direction=null,detectedAt=null,persisted=false,invalidated=false,invalidationReason=null;
  if(triple){
    active=true;
    direction=h1Direction;
    if(previous&&previous.active&&previous.direction===direction){
      detectedAt=Number(previous.detectedAt)||marketTs;
      persisted=true;
    }else detectedAt=marketTs;
  }else if(previous&&previous.active&&previous.direction){
    direction=previous.direction;
    detectedAt=Number(previous.detectedAt)||marketTs;
    const h1Opposed=!!(h1Direction&&h1Direction!==direction);
    const thesis15Opposed=!!(d15.direction&&d15.direction!==direction);
    invalidated=h1Opposed||thesis15Opposed;
    invalidationReason=h1Opposed?'1H_STRUCTURAL_TURN_OPPOSED':thesis15Opposed?'15M_THESIS_OPPOSED':null;
    active=!invalidated;
    persisted=active;
  }

  const positionOpposed=!!(active&&position&&position.direction&&position.direction!==direction);
  const rollingPmAligned=!!(
    active&&translation&&translation.aligned&&translation.thesisDirection===direction&&
    ['TRANSLATING','STRONG_TRANSLATION'].includes(translation.status)
  );
  const exitCandidate=!!(positionOpposed&&rollingPmAligned);

  return {
    version:VERSION,
    decisionImpact:false,
    active,
    direction,
    state:active?('STRUCTURAL_HANDOFF_'+String(direction).toUpperCase()):(invalidated?'HANDOFF_INVALIDATED':'NO_HANDOFF'),
    detectedAt:active?detectedAt:null,
    detectedTimestamp:active&&Number.isFinite(detectedAt)?new Date(detectedAt).toISOString():null,
    persisted,
    invalidated,
    invalidationReason,
    tripleSyncNow:triple,
    evidence:{
      oneHour:{
        direction:h1Direction,
        structuralState:h1.structuralState||null,
        pivot:h1.structuralPivot||null,
        legacyDirection:h1.direction||null,
        legacyPhase:h1.phase||null,
        nativeSignal:native&&native.oneHour&&native.oneHour.latest||null
      },
      fifteenMinute:d15,
      threeMinute:d3,
      rollingPm:{
        aligned:rollingPmAligned,
        status:translation&&translation.status||null,
        thesisDirection:translation&&translation.thesisDirection||null,
        net3mUsd:translation&&translation.horizons&&translation.horizons.net3mUsd
      }
    },
    positionOpposed,
    exitCandidate,
    exitSemantic:'shadow only: opposite open position may be considered falsified by structural multi-TF handoff + rolling PM conversion; no ticker required in this experiment',
    antiChurnContract:{
      structuralMemoryMayPersist:true,
      executionProofMayPersist:false,
      preExitPmReusableForReentry:false,
      preExitTickerReusableForReentry:false,
      preExitEfficiencyReusableForReentry:false
    }
  };
}
function proofStartTs(structure,entryControl){
  if(!structure||!structure.active||!Number.isFinite(Number(structure.detectedAt)))return null;
  const lastExit=entryControl&&Number(entryControl.lastExitTs);
  if(Number.isFinite(lastExit))return Math.max(Number(structure.detectedAt),lastExit);
  return Number(structure.detectedAt);
}
function finalize(structure,freshTranslation,entryControl,position){
  const startTs=proofStartTs(structure,entryControl);
  const fresh=!!(
    !position&&structure&&structure.active&&freshTranslation&&
    freshTranslation.aligned&&freshTranslation.thesisDirection===structure.direction&&
    ['TRANSLATING','STRONG_TRANSLATION'].includes(freshTranslation.status)&&
    freshTranslation.materiality&&freshTranslation.materiality.passed
  );
  return {
    ...structure,
    proofStartTs:startTs,
    proofStartTimestamp:Number.isFinite(startTs)?new Date(startTs).toISOString():null,
    freshPostExitPm:freshTranslation?{
      status:freshTranslation.status||null,
      direction:freshTranslation.thesisDirection||freshTranslation.direction||null,
      sinceTs:freshTranslation.sinceTs||startTs,
      sinceSetup:freshTranslation.sinceSetup||null,
      materiality:freshTranslation.materiality||null
    }:null,
    reentryEligible:!!fresh,
    reentrySemantic:'shadow only: structural handoff may survive exit, but execution requires new PM evidence built strictly after max(handoffTs,lastExitTs); no pre-exit microstructure proof is reusable'
  };
}

module.exports={VERSION,evaluateStructure,proofStartTs,finalize,directionFrom15,directionFrom3};
