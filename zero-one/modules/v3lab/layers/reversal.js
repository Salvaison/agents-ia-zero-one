'use strict';

function opposite(d){ return d === 'long' ? 'short' : d === 'short' ? 'long' : null; }

function evaluate(frame, ctx){
  const wave = ctx.wave || {};
  const seq = ctx.sequence || {};
  const dom = ctx.dominance || {};
  const regime = ctx.regime || {};
  const three = wave.nested3m || {};
  const expected = opposite(wave.direction);

  if(!expected){
    return { status:'NONE', active:false, direction:null, reason:'phase 15m indeterminee' };
  }

  const neededTurn = expected === 'short' ? 'CRETE_EN_FORMATION' : 'CREUX_EN_FORMATION';
  const recentTurn = seq.memory && seq.memory.turning;
  const turningReady = wave.turningPoint === neededTurn ||
    !!(recentTurn && recentTurn.type === neededTurn && recentTurn.direction === expected);

  const threeReady = three.direction === expected && (three.phase === 'MONTEE' || three.phase === 'DESCENTE');
  const dominanceReady = dom.state === 'DOMINATION_PERSISTANTE' &&
    dom.direction === expected && Number(dom.proofScore) >= .60;
  const regimeBlocked = ['HACHOIR','CHOC_COMBAT'].includes(regime.state);

  const active = turningReady && threeReady && dominanceReady && !regimeBlocked;

  let protectionPrice = null;
  if(wave.price){
    if(expected === 'short' && Number.isFinite(Number(wave.price.maxPrice))) protectionPrice = Number(wave.price.maxPrice);
    if(expected === 'long' && Number.isFinite(Number(wave.price.minPrice))) protectionPrice = Number(wave.price.minPrice);
  }

  return {
    status: active ? (expected === 'short' ? 'REVERSAL_FORMING_SHORT' : 'REVERSAL_FORMING_LONG') : 'NONE',
    active,
    direction: active ? expected : null,
    candidateDirection: expected,
    evidence: {
      turningReady,
      turningPointCurrent: wave.turningPoint || null,
      turningPointRecent: recentTurn || null,
      nested3mPhase: three.phase || null,
      nested3mDirection: three.direction || null,
      dominanceReady,
      dominanceState: dom.state || null,
      dominanceDirection: dom.direction || null,
      dominanceProof: Number(dom.proofScore || 0),
      regime: regime.state || null,
      regimeBlocked,
    },
    locationBasis: turningReady ? 'TURNING_POINT_15M' : null,
    protectionPrice,
    note: 'etat transitoire 3m→15m; protection prix distincte de toute invalidation de tendance',
  };
}

module.exports = { evaluate };
