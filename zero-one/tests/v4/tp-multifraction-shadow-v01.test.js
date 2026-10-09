'use strict';

const assert=require('assert');
const shadow=require('../../modules/v4/experiments/tp-multifraction-shadow');

const feeModel={enabled:true,makerRate:.0002,takerRate:.0005,entryLiquidity:'taker',exitLiquidity:'taker'};

function position(){
  return {
    direction:'long',
    entryPrice:80000,
    entryTimestamp:new Date(1000000).toISOString(),
    initialNotionalUsd:1500,
    notionalUsd:1500,
    initialMarginUsd:150,
    marginUsd:150,
    feeModel,
    entryFeeUsd:.75,
    metrics:{mfeUsd:600,mfeAt:new Date(1500000).toISOString(),maeUsd:0}
  };
}
function mf(){
  return {available:true,structuralState:'ADVANCING_UP',extensionState:'UP_PULLBACK',highRelation:'HH',lowRelation:'HL'};
}
function adverseResult(ts,current,mfe,actionType='HOLD'){
  return {
    marketTimestamp:ts,
    price:80000+current,
    thesis:{direction:'long'},
    mfStructureShadow:mf(),
    translation:{status:'OPPOSITE_TRANSLATION',horizons:{net3mUsd:-80,efficiency3m:.9}},
    ticker:{status:'OPPOSITE_CONFIRMED',direction:'short',oppositeConfirmed:true,current:{yieldVsP75:1.5,effortVsP75:1.1}},
    risk:{position:{currentSignedUsd:current,mfeUsd:mfe}},
    action:{type:actionType,direction:'long'}
  };
}
function supportiveResult(ts,current,mfe){
  return {
    marketTimestamp:ts,
    price:80000+current,
    thesis:{direction:'long'},
    mfStructureShadow:mf(),
    translation:{status:'TRANSLATING',aligned:true,thesisDirection:'long',horizons:{net3mUsd:80,efficiency3m:.9}},
    ticker:{status:'ALIGNED',direction:'long',oppositeConfirmed:false,current:{yieldVsP75:1.3,effortVsP75:1.1}},
    risk:{position:{currentSignedUsd:current,mfeUsd:mfe}},
    action:{type:'HOLD',direction:'long'}
  };
}

// Full two-stage lifecycle.
{
  const pos=position();

  // First adverse stress: MFE 1293.5, giveback 184.8.
  pos.metrics.mfeUsd=1293.5;
  pos.metrics.mfeAt=new Date(1900000).toISOString();
  let s=shadow.step(pos,adverseResult(2000000,1108.7,1293.5,'TAKE_PROFIT_PARTIAL'));
  assert.strictEqual(s.version,shadow.VERSION);
  assert.strictEqual(s.decisionImpact,false);
  assert.strictEqual(s.variants.length,21); // HOLD + 4x5 TP candidates
  assert(s.tp1Event);
  assert.strictEqual(s.tp2Event,null);
  assert(s.fullExitAtFirstStress);
  assert(s.fullExitAtFirstStress.netPnlUsd<s.fullExitAtFirstStress.grossPnlUsd);

  const v2525=s.variants.find(v=>v.id==='TP1_25_TP2_25');
  assert(v2525&&v2525.tp1);
  assert(Math.abs(v2525.remainingNotionalUsd-1125)<1e-9);
  assert(v2525.partialExitFeesUsd>0);

  // Campaign resumes and prints a genuinely newer causal MFE.
  pos.metrics.mfeUsd=1600;
  pos.metrics.mfeAt=new Date(2500000).toISOString();
  s=shadow.step(pos,supportiveResult(2600000,1600,1600));
  assert.strictEqual(s.tp2ArmedAt,2500000);
  assert.strictEqual(s.tp2ArmMfeUsd,1600);
  assert.strictEqual(s.tp2Event,null);

  // Second productive adverse stress after that new high.
  s=shadow.step(pos,adverseResult(3000000,1400,1600,'HOLD'));
  assert(s.tp2Event);
  assert.strictEqual(s.tp2Event.armedAt,2500000);
  assert(v2525.tp2);
  assert(Math.abs(v2525.remainingNotionalUsd-843.75)<1e-9);

  // Normal V4 hierarchy later closes the campaign.
  s=shadow.step(pos,adverseResult(4000000,1000,1600,'EXIT_NATIVE_SIGNAL_PROTECTION'));
  assert.strictEqual(s.finalized,true);
  assert(s.ranking);
  assert(finite(s.ranking.holdNetPnlUsd));
  assert(s.ranking.bestTpVariantId);
  assert(s.variants.every(v=>v.final&&finite(v.final.netPnlUsd)));
  assert(s.variants.every(v=>v.final.tradingFeesUsd>0));
  assert(s.variants.some(v=>v.final.benefitVsHoldUsd>0));
  assert(s.variants.some(v=>v.final.mutilationVsHoldUsd>=0));

  const compact=shadow.compact(s);
  assert.strictEqual(compact.variantCount,21);
  assert(compact.topVariants.length<=5);
  assert.strictEqual(compact.finalized,true);
}

// TP2 cannot happen just because a second stress arrives: a newer MFE must exist first.
{
  const pos=position();
  pos.metrics.mfeUsd=1000;
  pos.metrics.mfeAt=new Date(1900000).toISOString();
  let s=shadow.step(pos,adverseResult(2000000,800,1000,'TAKE_PROFIT_PARTIAL'));
  assert(s.tp1Event);
  pos.metrics.mfeUsd=1000;
  pos.metrics.mfeAt=new Date(1900000).toISOString();
  s=shadow.step(pos,adverseResult(3000000,800,1000,'HOLD'));
  assert.strictEqual(s.tp2ArmedAt,null);
  assert.strictEqual(s.tp2Event,null);
}

// Fractions are exactly the requested grids.
assert.deepStrictEqual(shadow.TP1_FRACTIONS,[.10,.20,.25,.33]);
assert.deepStrictEqual(shadow.TP2_FRACTIONS_OF_REMAINING,[0,.10,.20,.25,.33]);

function finite(v){return Number.isFinite(Number(v));}
console.log('V4.9.2 TP multi-fraction fee-aware shadow tests OK');
