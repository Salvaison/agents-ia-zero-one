'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../../modules/v554/paper'),A=require('../../modules/v554/account'),M=require('../../modules/v554/market'),H=require('../../scripts/boonolab-v554-handoff');
const at=1800000000000;
function fixture(open=true){
 const old={engine:'V553',mode:'PAPER_ONLY',brokerOrdersEnabled:false,version:'v5.5.3-paper-ledger-v1',policyVersion:'v5.5.3-live-causal-price-market-paper-v1',startedAt:at-86400000,lastObservationAt:at-1000,completed:1,wins:0,losses:1,capitalUsd:1000,notionalUsd:1500,equityUsd:990,realizedUsd:-10,feesUsd:open?2.25:1.5,history:[{tradeNo:1,netPnlUsd:-10,feesUsd:1.5,entryPolicyVersion:'old',exitPolicyVersion:'old'}],lastExit:{at:at-60000},lastAction:null,migratedFrom:{engine:'V552'},pre553Completed:0,newPolicyClosed:1,newPolicyNetUsd:-10,position:open?{direction:'long',entryAt:at-20000,entryPrice:60000,lastPrice:60025,entryFeeUsd:.75,notionalUsd:1500,mfePriceUsd:140,maePriceUsd:30,lastNetPnlUsd:-.875,entryPolicyVersion:'v5.5.3-live-causal-price-market-paper-v1',campaignId:'oldcampaign',entryContext:{original:true}}:null};
 const market=M.initial(at-200000);market.latest={sourceAt:at-10000,asOf:at-5000,brokerOrdersEnabled:false,hypotheses:{UP:{initiativeId:'I_UP',evidence:{}},DN:{initiativeId:'I_DN',evidence:{}}}};
 return {old,market,manifest:{oldProcessStopped:true,sourceHash:'abc',frozenSourceHash:'abc',handoffAt:at}};
}
test('continuous V553 handoff preserves all finances and open entry; no shadow account adoption',()=>{
 const {old,market,manifest}=fixture(),s=P.fromV553(old,market,manifest);H.parity(old,s);assert.equal(s.equityUsd,990);assert.equal(s.completed,1);assert.equal(s.newPolicyClosed,0);assert.equal(s.position.entryPrice,60000);assert.equal(s.position.entryFeeUsd,.75);assert.equal(s.position.originalTradeNo,2);assert.equal(s.position.initiativeId,'I_UP');assert.equal(s.position.inheritedFrom,'V553');assert.equal(s.history[0].historicalPolicy,true);assert.equal(old.history[0].historicalPolicy,undefined);assert.notEqual(s.marketMemory,market);assert.equal(P.summary(s).mode,'PAPER_ONLY');
});
test('no restart of old account or future market accepted',()=>{
 const {old,market,manifest}=fixture(false);
 assert.throws(()=>P.fromV553(old,market,{...manifest,oldProcessStopped:false}));
 assert.throws(()=>P.fromV553(old,market,{...manifest,frozenSourceHash:'other'}));
 market.latest.asOf=at+1;assert.throws(()=>P.fromV553(old,market,manifest));
});
test('inherited open position hard risk works on degraded source, closes once with original version and V554 exit',()=>{
 const {old,market,manifest}=fixture(),s=P.fromV553(old,market,manifest);
 const hold=P.step(s,null,{ts:at+1000,price:60085,fresh:true,healthy:false});
 assert.equal(hold.decision.action,'HOLD');assert.equal(s.completed,1);assert.equal(s.position.mfePriceUsd,140);
 const out=P.step(s,null,{ts:at+2000,price:59499,fresh:true,healthy:false});
 assert.equal(out.trade.tradeNo,2);assert.equal(out.trade.mode,'PAPER_ONLY');assert.equal(out.trade.entryPolicyVersion,old.policyVersion);assert.equal(out.trade.exitPolicyVersion,P.POLICY);assert.equal(out.trade.exitReason,'V554_HARD_RISK_500_BTC_PRICE_USD');assert.equal(out.trade.inheritedPosition,true);assert.equal(s.newPolicyClosed,1);assert.equal(s.completed,2);assert.equal(s.position,null);assert.equal(s.equityUsd,Number((old.equityUsd+out.trade.netPnlUsd).toFixed(4)));assert.equal(s.feesUsd,Number((old.feesUsd+out.trade.feesUsd-.75).toFixed(4)));P.verify(s);
});
test('shadow API cannot operate on active paper ledger',()=>{
 const {old,market,manifest}=fixture(),s=P.fromV553(old,market,manifest);assert.throws(()=>A.verify(s));assert.throws(()=>P.verify(A.initial(at)));
});
