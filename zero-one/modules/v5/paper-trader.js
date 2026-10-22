'use strict';
// V5 autonomous PAPER executions only. Never sends OKX orders.
const VERSION='v5-paper-trader-v0.1';
const NOTIONAL=1500,INIT_EQUITY=1000,TAKER_RATE=.0005;
const RISK_PRICE=500;
const N=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const norm=(n)=>Math.round(n*1e4)/1e4;
const signed=(position,price)=>((price-position.entryPrice)*(position.direction==='long'?1:-1));
function newState(){return {version:VERSION,mode:'PAPER_ONLY_0_USD_ORDERS',brokerOrdersEnabled:false,
  capitalUsd:INIT_EQUITY,notionalUsd:NOTIONAL,feeRate:TAKER_RATE,
  equityUsd:INIT_EQUITY,realizedUsd:0,feesUsd:0,completed:0,wins:0,losses:0,
  position:null,history:[],lastEvidenceKeys:[],lastObservationAt:0,startAt:0,lastAction:null,
  lastHypothesis:null,decisionImpactOnV4:false};}
function totalPnl(p,price){return norm(signed(p,price)*NOTIONAL/p.entryPrice);}
function calcNet(p,price){const gross=totalPnl(p,price);
 return norm(gross-p.entryFeeUsd-NOTIONAL*TAKER_RATE);}
function close(s,p,ts,price,reason){
 const gross=totalPnl(p,price),fee=norm(NOTIONAL*TAKER_RATE);
 const net=norm(gross-p.entryFeeUsd-fee);
 const row={tradeNo:s.completed+1,direction:p.direction,entryAt:p.entryAt,exitAt:ts,
  entryPrice:p.entryPrice,exitPrice:price,notionalUsd:NOTIONAL,
  grossPnlUsd:gross,feesUsd:norm(p.entryFeeUsd+fee),netPnlUsd:net,
  mfePriceUsd:norm(p.mfePriceUsd),maePriceUsd:norm(p.maePriceUsd),
  entryKey:p.entryKey,entryHypothesis:p.entryHypothesis,
  exitReason:reason,slippage:'NOT_MODELED',funding:'NOT_MODELED'};
 s.position=null;s.completed++;s.realizedUsd=norm(s.realizedUsd+net);
 s.feesUsd=norm(s.feesUsd+fee);
 if(net>0)s.wins++;else s.losses++;
 s.equityUsd=norm(INIT_EQUITY+s.realizedUsd);
 s.history=[...s.history,row].slice(-150);
 s.lastAction={type:'EXIT',at:ts,price,reason,tradeNo:row.tradeNo,netPnlUsd:net};
 return {state:s,event:s.lastAction};
}
function step(current,hypothesis,market){
 const s=current&&current.version===VERSION?current:newState();
 const ts=N(market&&market.ts),price=N(market&&market.price);
 if(ts===null||price===null||price<=0||ts<=s.lastObservationAt)
  return {state:s,event:null,reason:'UNRELIABLE_OR_DUPLICATE_MARKET'};
 s.lastObservationAt=ts;s.lastHypothesis=hypothesis||null;
 let p=s.position;
 if(p){
  const moved=signed(p,price);p.lastPrice=price;
  p.mfePriceUsd=Math.max(p.mfePriceUsd,moved);
  p.maePriceUsd=Math.max(p.maePriceUsd,-moved);
  p.lastNetPnlUsd=calcNet(p,price);
  if(p.mfePriceUsd>=220)p.protectedPriceUsd=180;
  else if(p.mfePriceUsd>=120&&p.protectedPriceUsd<90)p.protectedPriceUsd=90;
  if(moved<=-RISK_PRICE)return close(s,p,ts,price,'EXIT_RISK_500_PRICE');
  if(p.protectedPriceUsd>0&&moved<=p.protectedPriceUsd)
   return close(s,p,ts,price,'EXIT_GAIN_FLOOR_PAPER');
  // Execution failure: latest opposite E15/E3 and live price BOTH convert.
  // No auto flip: paper can next enter only when a distinct E3/MCB key arrives.
  if(hypothesis&&hypothesis.ready&&hypothesis.direction!==p.direction)
   return close(s,p,ts,price,'EXIT_OPPOSING_V5_CAUSAL_CHAIN');
  return {state:s,event:null,reason:'HOLD'};
 }
 if(!hypothesis||!hypothesis.ready||!hypothesis.entryKey)
  return {state:s,event:null,reason:'NO_COHERENT_HYPOTHESIS'};
 if(s.lastEvidenceKeys.includes(hypothesis.entryKey))
  return {state:s,event:null,reason:'ENTRY_KEY_ALREADY_USED'};
 // Trading begins only with an observation newer than activation time. A
 // bootstrap historical replay can never create retrospective positions.
 if(market.enableNewEntries!==true)
  return {state:s,event:null,reason:'ENTRY_DISABLED'};
 if(!s.startAt||hypothesis.e3ObservedAt<s.startAt||hypothesis.sourceAt<s.startAt)
  return {state:s,event:null,reason:'ENTRY_CHAIN_NOT_OBSERVED_SINCE_PAPER_ACTIVATION'};
 if(market.dataQuality!=='DATA_OK')
  return {state:s,event:null,reason:'DATA_DEGRADED'};
 if(market.sourceAgeMs>90000||market.sourceAgeMs<0)
  return {state:s,event:null,reason:'MARKET_NOT_FRESH'};
 const fee=norm(NOTIONAL*TAKER_RATE);
 p={direction:hypothesis.direction,entryPrice:price,entryAt:ts,
  lastPrice:price,notionalUsd:NOTIONAL,entryFeeUsd:fee,entryKey:hypothesis.entryKey,
  entryHypothesis:{phase:hypothesis.phase,sourceAt:hypothesis.sourceAt,
    slowKind:hypothesis.slowKind,evidence:hypothesis.evidence},
  mfePriceUsd:0,maePriceUsd:0,protectedPriceUsd:0,lastNetPnlUsd:-2*fee};
 s.position=p;s.feesUsd=norm(s.feesUsd+fee);
 s.lastEvidenceKeys=[...s.lastEvidenceKeys,hypothesis.entryKey].slice(-250);
 s.lastAction={type:'ENTER',at:ts,price,direction:p.direction,entryKey:p.entryKey,
  reason:'MCB_E3_PM_CONVERSION_CHAIN',feeUsd:fee,mode:'PAPER'};
 return {state:s,event:s.lastAction};
}
module.exports={VERSION,newState,step,totalPnl,calcNet};
