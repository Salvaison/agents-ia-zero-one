'use strict';
const assert=require('assert');
const sim=require('../../modules/trade-simulator-v4');

const fm=sim.normalizeFeeModel({tradeSimulator:{fees:{enabled:true,makerRate:.0002,takerRate:.0005,entryLiquidity:'taker',exitLiquidity:'taker',estimateCloseFeeInLivePnl:true}}});
assert.strictEqual(fm.takerRate,.0005);
assert.strictEqual(fm.makerRate,.0002);
assert.strictEqual(sim.feeRate(fm,'taker'),.0005);
assert.strictEqual(sim.feeRate(fm,'maker'),.0002);

// 1500 USDT market entry at 80k costs 0.75 USDT.
assert(Math.abs(sim.executionFeeUsd(1500,80000,80000,.0005)-.75)<1e-12);

// Close notional follows price because BTC quantity is fixed.
const closeQuote=sim.executedQuoteNotional(1500,80000,80800);
assert(Math.abs(closeQuote-1515)<1e-9);
assert(Math.abs(sim.executionFeeUsd(1500,80000,80800,.0005)-.7575)<1e-9);

// At unchanged price, economic PNL-if-closed-now is exactly two taker fees.
{
 const pos={direction:'long',entryPrice:80000,notionalUsd:1500,initialNotionalUsd:1500,
   feeModel:fm,entryFeeUsd:.75,tradingFeesPaidUsd:.75,grossRealizedPnlUsd:0,realizedPnlUsd:-.75};
 assert(Math.abs(sim.pnlUsdFor(pos,80000)-(-1.5))<1e-9);
}

// A TP pays its own close fee and the runner keeps only 75% entry-notional.
{
 const entry=80566.3, price=81675;
 const pos={direction:'long',entryPrice:entry,entryTimestamp:new Date().toISOString(),
   capitalUsd:1000,positionPercent:15,marginUsd:150,notionalUsd:1500,
   initialCapitalUsd:1000,initialPositionPercent:15,initialMarginUsd:150,initialNotionalUsd:1500,
   leverage:10,maxAdversePriceMoveUsd:500,maxRiskBudgetUsd:10,sizingModel:'test',
   feeModel:fm,entryFeeUsd:.75,tradingFeesPaidUsd:.75,exitFeesPaidUsd:0,
   grossRealizedPnlUsd:0,realizedPnlUsd:-.75,tp1Taken:false,tpEvents:[],metrics:{mfeUsd:1293.5,maeUsd:66.3}};
 const result={marketTimestamp:Date.now(),price,action:{type:'TAKE_PROFIT_PARTIAL',reason:'test',evidence:{fraction:.25,givebackUsd:184.8}}};
 const ev=sim.applyPartialTakeProfit(pos,result);
 assert(ev.tradingFeeUsd>0);
 assert(ev.grossRealizedPnlUsd>ev.netRealizedAfterCloseFeeUsd);
 assert(Math.abs(pos.notionalUsd-1125)<1e-9);
 assert(Math.abs(pos.marginUsd-112.5)<1e-9);
 assert(Math.abs(pos.tradingFeesPaidUsd-(.75+ev.tradingFeeUsd))<1e-9);
 // Split close at the same price should equal one full close economically.
 const grossFull=(price-entry)/entry*1500;
 const fullCloseFee=sim.executionFeeUsd(1500,entry,price,.0005);
 const expectedNet=grossFull-.75-fullCloseFee;
 assert(Math.abs(sim.pnlUsdFor(pos,price)-expectedNet)<1e-9);
}

// Legacy positions without a fee model remain gross for backwards-compatible archived tests.
{
 const pos={direction:'long',entryPrice:80000,notionalUsd:1500,realizedPnlUsd:0};
 assert(Math.abs(sim.pnlUsdFor(pos,80800)-15)<1e-9);
}

console.log('V4.9.1 trading fee accounting tests OK');