'use strict';
// BOONO Systems — public quote simulation only; NEVER transmits orders.
// X-Perp FUTURES contract sizing and bid/ask book contract counts from OKX.
// A = real V5 PAPER last-trade fill baseline, B = marketable IOC bound,
// C = move-confirmed IOC. Quote fills are ESTIMATES, not actual OKX orders.
const INSTRUMENT=Object.freeze({
  instId:'BTC-USD_UM_XPERP-310404',ctValBtc:0.0001,
  tickSz:0.1,lotSz:1,minSz:1,linear:true,
  metadataSource:'OKX_PUBLIC_INSTRUMENTS_CHECK_2026_10_25'
});
const MODEL_VERSION='paper-execution-lab-v0.1';
const FEE_TAKER_RATE=.0005; // current V5 ledger model; not verified X-Perp account tier
const NOTIONAL_USD=1500;
const n=v=>v===null||v===undefined||v===''?null:
  Number.isFinite(Number(v))?Number(v):null;
const r=(x,d=4)=>n(x)===null?null:Math.round(x*10**d)/10**d;
const dir=d=>d==='long'?1:d==='short'?-1:0;
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
function quote(input,receivedAt=Date.now()){
 const row=input?.data?.[0]||input||{};
 const bids=(row.bids||[]).slice(0,5).map(x=>({
   px:n(x[0]),szContracts:n(x[1])})).filter(x=>x.px>0&&x.szContracts>0);
 const asks=(row.asks||[]).slice(0,5).map(x=>({
   px:n(x[0]),szContracts:n(x[1])})).filter(x=>x.px>0&&x.szContracts>0);
 const exchangeTs=n(row.ts),bestBid=bids[0]?.px,bestAsk=asks[0]?.px;
 if(!bids.length||!asks.length||!exchangeTs||bestBid>bestAsk)return null;
 return {exchangeTs,receivedAt,instId:INSTRUMENT.instId,bids,asks,
   bid:bestBid,ask:bestAsk,spread:r(bestAsk-bestBid,2),
   mid:r((bestBid+bestAsk)/2,2),
   topBidContracts:bids[0]?.szContracts,topAskContracts:asks[0]?.szContracts};
}
function validQuote(q,now, maxAgeMs=3000){
 return !!q&&q.instId===INSTRUMENT.instId&&n(q.exchangeTs)!==null&&
   now-q.receivedAt>=-1500&&now-q.receivedAt<=maxAgeMs&&
   now-q.exchangeTs>=-1500&&now-q.exchangeTs<=maxAgeMs&&
   q.bid>0&&q.ask>0&&q.spread>=0;
}
function contracts(notional,price){
 if(!Number.isFinite(price)||price<=0)return null;
 const ct=Math.floor(notional/(price*INSTRUMENT.ctValBtc*INSTRUMENT.lotSz))*
   INSTRUMENT.lotSz;
 return ct>=INSTRUMENT.minSz?ct:null;
}
function bounds({q,median3mRangeUsd=null,priceRateUsdPerMin=null}){
 const median=n(median3mRangeUsd)||35,rate=Math.abs(n(priceRateUsdPerMin)||0);
 const spread=q?.spread||0;
 const offset=r(clamp(Math.max(2,median*.08,rate*.12,spread*2),2,8),1);
 const trigger=r(clamp(Math.max(3,median*.12,rate*.17),3,8),1);
 return {offsetUsd:offset,triggerUsd:trigger,
  maxTriggerWaitMs:60000,quoteMaxAgeMs:3000,
  priceTravelEstimateSource:'Causal MCB3/PM range and observed price rate',
  capRule:'clamp(max(2,range3m*0.08,abs(rate)*0.12,spread*2),2,8)',
  triggerRule:'clamp(max(3,range3m*0.12,abs(rate)*0.17),3,8)'};
}
function roundLimit(px,side,tick=INSTRUMENT.tickSz){
 const units=px/tick;
 return r((side==='buy'?Math.ceil(units-1e-6):Math.floor(units+1e-6))*tick,4);
}
function simulateIOC({quote:q,side,quantityContracts,offsetUsd,
                        now=Date.now(),maxAgeMs=3000}){
 if(!['buy','sell'].includes(side)||!Number.isFinite(quantityContracts)||
   quantityContracts<INSTRUMENT.minSz)return {status:'INVALID_REQUEST'};
 if(!validQuote(q,now,maxAgeMs))return {status:'NO_FRESH_BOOK',quoteAgeMs:q?now-q.receivedAt:null};
 const limit=roundLimit(side==='buy'?q.ask+offsetUsd:q.bid-offsetUsd,side);
 const book=side==='buy'?q.asks:q.bids;
 let filled=0,total=0;
 const legs=[];
 for(const level of book){
  if((side==='buy'&&level.px>limit+1e-6)||
     (side==='sell'&&level.px<limit-1e-6))break;
  const sz=Math.min(quantityContracts-filled,Math.floor(level.szContracts));
  if(sz<=0)continue;
  filled+=sz;total+=sz*level.px;
  legs.push({px:level.px,contracts:sz});
  if(filled>=quantityContracts)break;
 }
 const avg=filled?r(total/filled,4):null;
 return {
  status:filled===quantityContracts?'FULL':
    filled>0?'PARTIAL':'NO_LIQUIDITY_AT_LIMIT',
  side,limitPx:limit,avgPx:avg,
  requestedContracts:quantityContracts,filledContracts:filled,
  unfilledContracts:quantityContracts-filled,
  completion:r(filled/quantityContracts,4),
  levelsUsed:legs.length,legs,
  quoteExchangeTs:q.exchangeTs,quoteObservedAt:q.receivedAt,
  quoteAgeMs:now-q.receivedAt,spreadUsd:q.spread,
  bestAtFill:side==='buy'?q.ask:q.bid,
  estimatedSweepUsd:avg===null?null:r(Math.abs(avg-(side==='buy'?q.ask:q.bid)),4),
  fillQuality:'PUBLIC_BOOK_SNAPSHOT_ESTIMATE_NOT_ACTUAL_FILL'
 };
}
function netPnl({direction,quantityContracts,entryPx,exitPx,feeRate=FEE_TAKER_RATE}){
 const d=dir(direction),btc=quantityContracts*INSTRUMENT.ctValBtc;
 if(!d||!btc||entryPx<=0||exitPx<=0)return null;
 const gross=d*(exitPx-entryPx)*btc;
 const feeEntry=btc*entryPx*feeRate,feeExit=btc*exitPx*feeRate;
 return {grossUsd:r(gross),feeEntryUsd:r(feeEntry),
  feeExitUsd:r(feeExit),netUsd:r(gross-feeEntry-feeExit),
  btcQty:r(btc,8),notionalAtEntry:r(btc*entryPx,2)};
}
function triggerStatus({direction,referenceMid,currentMid,thresholdUsd}){
 const d=dir(direction);
 if(!d||!Number.isFinite(referenceMid)||!Number.isFinite(currentMid))
  return {status:'UNKNOWN'};
 const movement=r(d*(currentMid-referenceMid),2);
 return {status:movement>=thresholdUsd?'TRIGGERED':'PENDING',
  movementUsd:movement,thresholdUsd:r(thresholdUsd,2)};
}
module.exports={MODEL_VERSION,INSTRUMENT,FEE_TAKER_RATE,NOTIONAL_USD,
 quote,validQuote,contracts,bounds,simulateIOC,netPnl,triggerStatus};
