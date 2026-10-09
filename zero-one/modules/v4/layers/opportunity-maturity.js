'use strict';
const {finite}=require('../core/utils');

function net3Aligned(translation,direction){
  const n=translation&&translation.horizons&&translation.horizons.net3mUsd;
  if(!finite(n)||!direction)return false;
  return direction==='long'?Number(n)>0:Number(n)<0;
}
function nested3mCoherence(mcb,direction){
  const n=mcb&&mcb.nested3m||null;
  if(!n||!n.available||!direction)return {coherent:false,state:'UNKNOWN',reason:'3m structure unavailable'};
  const structural=n.structuralDirection||null;
  const turn=n.turningDirection||null;
  const into=Number(n.lobeSign)>0?'long':Number(n.lobeSign)<0?'short':null;

  if(structural){
    return {
      coherent:structural===direction,
      state:structural===direction?'STRUCTURAL_ALIGNED':'STRUCTURAL_OPPOSING',
      structuralDirection:structural,
      structuralState:n.structuralState||null,
      structuralConfirmedAt:n.structuralConfirmedAt||null,
      turningDirection:turn,
      directionIntoLobe:into,
      reason:structural===direction
        ?'3m causal E3→E3 trajectory aligns with candidate'
        :'3m causal E3→E3 trajectory opposes candidate; lobe sign cannot override structural direction'
    };
  }
  if(turn){
    return {coherent:turn===direction,state:turn===direction?'TURN_ALIGNED':'TURN_OPPOSING',structuralDirection:null,turningDirection:turn,directionIntoLobe:into,
      reason:turn===direction?'3m tactical turning aligns with candidate':'3m tactical turning opposes candidate'};
  }
  return {coherent:into===direction,state:into===direction?'LOBE_ALIGNED':'LOBE_OPPOSING',
    structuralDirection:null,turningDirection:null,directionIntoLobe:into,
    reason:into===direction?'3m lobe fallback aligns because structural trajectory is unavailable':'3m lobe fallback opposes because structural trajectory is unavailable'};
}
function formingState(direction){return direction==='long'?'LONG_FORMING':direction==='short'?'SHORT_FORMING':'UNCLEAR';}
function evaluate(base,mcb,translation){
  if(!base)return {state:'UNCLEAR',direction:null,candidateDirection:null,actionable:false,reason:'base MCB thesis missing'};
  if(base.state!=='TRANSITION_NEUTRAL'){
    return {...base,maturityGate:{required:false,passed:!!base.direction,reason:'established MCB thesis does not require neutral transition gate'}};
  }

  const candidate=base.candidateDirection||null;
  const netAligned=net3Aligned(translation,candidate);
  const coherence=nested3mCoherence(mcb,candidate);
  const passed=!!(candidate&&netAligned&&coherence.coherent);

  if(!passed){
    return {
      ...base,
      state:'TRANSITION_NEUTRAL',direction:null,actionable:false,phase:'OBSERVATION',
      reason:'candidate observed; waiting for aligned net3m and coherent 3m MCB structure',
      maturityGate:{
        required:true,passed:false,candidateDirection:candidate,
        net3mAligned:netAligned,
        net3mUsd:translation&&translation.horizons&&translation.horizons.net3mUsd,
        nested3m:coherence,
        semantic:'neutrality is resolved by MCB maturity + real 3m price translation, without a fixed time delay'
      }
    };
  }

  return {
    ...base,
    state:formingState(candidate),direction:candidate,candidateDirection:candidate,
    originMode:base.mode||null,mode:'THESIS_FORMING',
    actionable:true,phase:'FORMING',
    reason:'MCB candidate matured: net3m translates in candidate direction and nested 3m MCB is coherent',
    maturityGate:{
      required:true,passed:true,candidateDirection:candidate,
      net3mAligned:true,
      net3mUsd:translation&&translation.horizons&&translation.horizons.net3mUsd,
      nested3m:coherence,
      semantic:'candidate promoted without timer; violent reversals may mature in one cycle when evidence is already aligned'
    }
  };
}
module.exports={evaluate,net3Aligned,nested3mCoherence,formingState};
