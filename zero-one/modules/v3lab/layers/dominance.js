'use strict';
const legacy=require('../../v2/layers/dominance');

// V3 experimental threshold family — block 2026-09-24.
// Keep proof floor and terrain-conservation requirements unchanged.
// Only shorten the persistence duration required for a strong emergent camp:
// 3/4 -> 2/4 recent directional observations when proof >= .62.
const V3_PERSIST_MIN_COUNT=2;
const V3_PERSIST_MIN_PROOF=.62;

function applyV3Thresholds(base){
  let r={...base,model:'TICKER_EFFORT_CONVERSION_PERSISTENCE_V3'};
  const promotable=r.state==='DOMINATION_EMERGENTE' &&
    (r.direction==='long'||r.direction==='short') &&
    Number(r.persistCount)>=V3_PERSIST_MIN_COUNT &&
    r.conserved===true &&
    Number(r.proofScore)>=V3_PERSIST_MIN_PROOF;
  if(promotable)r={...r,state:'DOMINATION_PERSISTANTE'};
  r.v3ThresholdOverride={
    family:'dominance_persistence',
    persistMinCount:V3_PERSIST_MIN_COUNT,
    proofMin:V3_PERSIST_MIN_PROOF,
    terrainConservationRequired:true,
    promoted:promotable,
    semantic:'CONTROLLED_PAPER_TRADING_LOOSENING'
  };
  return r;
}

function evaluate(frame){return applyV3Thresholds(legacy.evaluate(frame));}
module.exports={evaluate,applyV3Thresholds,V3_PERSIST_MIN_COUNT,V3_PERSIST_MIN_PROOF};
