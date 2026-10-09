'use strict';

function thesisState(direction,established){
  if(direction==='long')return established?'LONG':'LONG_FORMING';
  if(direction==='short')return established?'SHORT':'SHORT_FORMING';
  return 'UNCLEAR';
}
function qualitative(c){
  const rel=c&&c.relationshipFromPrevious||null;
  return {
    pairClass:rel&&rel.pairQuality&&rel.pairQuality.class||'UNPAIRED',
    lbwSpan:rel&&rel.lbwSpan||null,
    majorReferenceSpanLbw:rel&&rel.pairQuality&&rel.pairQuality.referenceSpanLbw||80,
    economicScale:rel&&rel.economicScale||null,
    decisionImpact:false
  };
}
function transition(candidate,mode,c,mcb,q,reason){
  return {
    state:'TRANSITION_NEUTRAL',
    direction:null,
    candidateDirection:candidate||null,
    reason,
    authority:'MCB_ONLY',
    mode,
    phase:'OBSERVATION',
    actionable:false,
    quality:q,
    evidence:{
      lobeType:c.type,lobeSign:c.lobeSign??c.sign,lobeDirection:c.lobeDirection||c.directionIntoLobe||null,
      structuralDirection:c.structuralDirection||mcb&&mcb.structural15m&&mcb.structural15m.structuralDirection||null,
      structuralState:c.structuralState||mcb&&mcb.structural15m&&mcb.structural15m.structuralState||null,
      structuralConfirmedAt:c.structuralConfirmedAt||mcb&&mcb.structural15m&&mcb.structural15m.structuralConfirmedAt||null,
      currentLbw:c.currentLbw,extremeLbw:c.extremeLbw,
      recoveryFraction:c.recoveryFraction,e15Class:c.e15Class,
      relationship:c.relationshipFromPrevious||null,
      liveZeroCross:c.liveZeroCross||null,
      priceReversalFromLobeExtremeUsd:c.priceReversalFromLobeExtremeUsd,
      nested3m:mcb.nested3m||null
    }
  };
}
function evaluate(mcb){
  const c=mcb&&mcb.currentLobe||null;
  if(!c)return {state:'UNCLEAR',direction:null,candidateDirection:null,reason:'MCB 15m current lobe unavailable',authority:'MCB_ONLY',actionable:false};

  const q=qualitative(c);
  const structuralDirection=c.structuralDirection||
    mcb&&mcb.structural15m&&mcb.structural15m.structuralDirection||null;
  const lobeDirection=c.lobeDirection||c.directionIntoLobe||null;

  // A causal E→E trajectory can propose a direction before the oscillator
  // crosses zero. It remains a candidate only; 3m + fresh price translation
  // must still mature it.
  if(structuralDirection&&lobeDirection&&structuralDirection!==lobeDirection){
    return transition(
      structuralDirection,
      'STRUCTURAL_TRAJECTORY',
      c,mcb,q,
      '15m causal E→E trajectory opposes current lobe location; structural direction becomes the candidate while 3m + PM must still prove execution'
    );
  }

  // Un retournement détecté n'est plus immédiatement une thèse tradable.
  // Il entre d'abord dans une transition neutre ; PM 3m + structure MCB 3m
  // devront prouver que la direction candidate mûrit.
  if(['MATURE_REVERSING','MATURE'].includes(c.maturity) && c.reversalCandidateDirection){
    return transition(
      c.reversalCandidateDirection,
      'REVERSAL_FORMING',
      c,mcb,q,
      '15m reversal is forming; candidate direction is observed but not actionable until 3m structure + net3m mature it'
    );
  }

  const dir=structuralDirection||lobeDirection||null;
  if(c.confirmedSide && dir){
    const established=q.pairClass==='PAIR_MAJOR_QUALITATIVE';
    if(established){
      return {
        state:thesisState(dir,true),direction:dir,candidateDirection:dir,
        reason:'confirmed 15m lobe extends in its direction with a qualitatively major opposite-E15 pair',
        authority:'MCB_ONLY',mode:'LOBE_EXTENSION',phase:'ESTABLISHED',actionable:true,quality:q,
        evidence:{
          lobeType:c.type,lobeSign:c.lobeSign??c.sign,lobeDirection,
          structuralDirection,structuralState:c.structuralState||null,
          structuralConfirmedAt:c.structuralConfirmedAt||null,
          currentLbw:c.currentLbw,extremeLbw:c.extremeLbw,
          recoveryFraction:c.recoveryFraction,e15Class:c.e15Class,
          relationship:c.relationshipFromPrevious||null,
          liveZeroCross:c.liveZeroCross||null,
          nested3m:mcb.nested3m||null
        }
      };
    }
    // Une extension sub-80 peut devenir une opportunité, mais ne parle plus
    // directement avec la même autorité qu'une structure majeure.
    return transition(
      dir,'LOBE_EXTENSION',c,mcb,q,
      'confirmed 15m lobe suggests continuation, but sub-80 structure remains neutral until 3m structure + net3m mature it'
    );
  }

  return {
    state:'UNCLEAR',direction:null,candidateDirection:null,
    reason:'MCB has no confirmed 15m side from which to propose a direction',
    authority:'MCB_ONLY',actionable:false,
    evidence:{currentLobe:{type:c.type,maturity:c.maturity,e15Class:c.e15Class,confirmedSide:c.confirmedSide||false}}
  };
}
module.exports={evaluate,thesisState,qualitative,transition};
