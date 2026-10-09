'use strict';
const assert=require('assert');
const action=require('../../modules/v4/layers/action');
const sim=require('../../modules/trade-simulator-v4');

function adverse(){
  return {
    tr:{status:'OPPOSITE_TRANSLATION',horizons:{net3mUsd:-81.5,efficiency3m:.92}},
    tk:{status:'OPPOSITE_CONFIRMED',direction:'short',oppositeConfirmed:true,current:{yieldVsP75:1.57,effortVsP75:.72}}
  };
}

// #86-like: first productive adverse stress after a huge MFE, but MCB + MF still LONG.
{
  const {tr,tk}=adverse();
  const pos={direction:'long',tp1Taken:false};
  const risk={position:{currentSignedUsd:1108.7,mfeUsd:1293.5}};
  const thesis={direction:'long'};
  const mf={available:true,structuralState:'ADVANCING_UP',extensionState:'UP_PULLBACK',highRelation:'HH',lowRelation:'HL'};
  const x=action.mfeProtectionExit(pos,tr,tk,risk,null,thesis,mf);
  assert(x);
  assert.strictEqual(x.type,'TAKE_PROFIT_PARTIAL');
  assert.strictEqual(x.evidence.fraction,.25);
  assert(x.evidence.givebackUsd>180&&x.evidence.givebackUsd<360);
}

// After TP1 the same respiration must NOT immediately kill the runner.
{
  const {tr,tk}=adverse();
  const pos={direction:'long',tp1Taken:true};
  const risk={position:{currentSignedUsd:1108.7,mfeUsd:1293.5}};
  const thesis={direction:'long'};
  const mf={available:true,structuralState:'ADVANCING_UP',extensionState:'UP_PULLBACK',highRelation:'HH',lowRelation:'HL'};
  assert.strictEqual(action.mfeProtectionExit(pos,tr,tk,risk,null,thesis,mf),null);
}

// #82-like: ~531 USD giveback is already beyond runner allowance -> full exit.
{
  const tr={status:'STRONG_OPPOSITE_TRANSLATION',horizons:{net3mUsd:64,efficiency3m:.503}};
  const tk={status:'OPPOSITE_CONFIRMED',direction:'long',oppositeConfirmed:true,current:{yieldVsP75:10.53,effortVsP75:2}};
  const pos={direction:'short',tp1Taken:false};
  const risk={position:{currentSignedUsd:43,mfeUsd:574}};
  const thesis={direction:'short'};
  const mf={available:true,structuralState:'ADVANCING_DOWN',extensionState:'DOWN_PULLBACK',highRelation:'LH',lowRelation:'LL'};
  const x=action.mfeProtectionExit(pos,tr,tk,risk,null,thesis,mf);
  assert(x);
  assert.strictEqual(x.type,'EXIT_MFE_PROTECTION');
}

// A structural MF break against the position keeps full protection authority.
{
  const {tr,tk}=adverse();
  const pos={direction:'long',tp1Taken:false};
  const risk={position:{currentSignedUsd:1108.7,mfeUsd:1293.5}};
  const thesis={direction:'long'};
  const mf={available:true,structuralState:'ADVANCING_UP',extensionState:'DOWN_STRUCTURE_BREAK',highRelation:'HH',lowRelation:'HL'};
  const x=action.mfeProtectionExit(pos,tr,tk,risk,null,thesis,mf);
  assert(x);
  assert.strictEqual(x.type,'EXIT_MFE_PROTECTION');
}

// Simulator accounting: 25% is realized and 75% remains live.
{
  const pos={version:'test',direction:'long',entryPrice:80566.3,entryTimestamp:new Date().toISOString(),
    capitalUsd:1000,positionPercent:15,marginUsd:150,notionalUsd:1500,leverage:10,
    maxAdversePriceMoveUsd:500,maxRiskBudgetUsd:10,sizingModel:'test',
    metrics:{mfeUsd:1293.5,maeUsd:66.3}};
  const result={marketTimestamp:Date.now(),price:81675,action:{type:'TAKE_PROFIT_PARTIAL',reason:'test',evidence:{fraction:.25,givebackUsd:184.8,mfSupport:{ready:true}}}};
  const ev=sim.applyPartialTakeProfit(pos,result);
  assert(ev);
  assert.strictEqual(pos.tp1Taken,true);
  assert(Math.abs(pos.notionalUsd-1125)<1e-9);
  assert(Math.abs(pos.marginUsd-112.5)<1e-9);
  assert(Math.abs(pos.positionPercent-11.25)<1e-9);
  assert(pos.realizedPnlUsd>0);
  assert.strictEqual(pos.tpEvents.length,1);
}

console.log('V4.9 stress TP / runner tests OK');
// Realized + runner PNL must be continuous at the exact TP price.
{
  const pos={direction:'long',entryPrice:80566.3,entryTimestamp:new Date().toISOString(),
    capitalUsd:1000,positionPercent:15,marginUsd:150,notionalUsd:1500,leverage:10,
    maxAdversePriceMoveUsd:500,maxRiskBudgetUsd:10,sizingModel:'test',metrics:{mfeUsd:1293.5,maeUsd:66.3}};
  const price=81675;
  const before=(price-pos.entryPrice)/pos.entryPrice*1500;
  sim.applyPartialTakeProfit(pos,{marketTimestamp:Date.now(),price,action:{type:'TAKE_PROFIT_PARTIAL',reason:'test',evidence:{fraction:.25,givebackUsd:184.8}}});
  const after=sim.pnlUsdFor(pos,price);
  assert(Math.abs(before-after)<1e-9);
}

console.log('V4.9 partial accounting continuity OK');
