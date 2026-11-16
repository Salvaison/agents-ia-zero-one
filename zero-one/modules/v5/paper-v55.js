'use strict';
// V5.5 PAPER only: isolated state and accounting. Never loads a broker.
// New zeroed ledger; V494 and V543 remain immutable independent histories.
const VERSION='v5.5-paper-ledger-v1.0';
const POLICY='v5.5-structural-place-regime-paper-v1';
const NOTIONAL=1500,INITIAL=1000,TAKER=.0005,HARD_RISK_BTC_USD=500;
const num=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const round=x=>Math.round(x*10000)/10000;
const sign=d=>d==='long'?1:-1;
function initial(now=Date.now()){
 return {version:VERSION,mode:'PAPER_ONLY',brokerOrdersEnabled:false,
  retiredPredecessor:'V494_PAPER_STOPPED_AND_ARCHIVED_20261116',
  policyVersion:POLICY,startedAt:now,lastObservationAt:0,
  notionalUsd:NOTIONAL,capitalUsd:INITIAL,equityUsd:INITIAL,
  realizedUsd:0,feesUsd:0,completed:0,wins:0,losses:0,
  position:null,history:[],usedKeys:[],lastAction:null,lastExit:null,
  lastReason:null,decision:null,latestAnalysis:null,
  startupPolicy:'START_FLAT_NO_V494_BALANCE_TRANSFER_NO_PRIOR_POSITION'};
}
function migrate(x,now=Date.now()){
 if(!x)return initial(now);
 if(x.version!==VERSION||x.mode!=='PAPER_ONLY'||x.brokerOrdersEnabled!==false||
  x.policyVersion!==POLICY||x.retiredPredecessor!=='V494_PAPER_STOPPED_AND_ARCHIVED_20261116')
  throw Error('V55_LEDGER_UNTRUSTED_OR_CROSS_ENGINE_MIGRATION_REFUSED');
 return x;
}
function pnl(pos,price){
 const gross=(price-pos.entryPrice)*sign(pos.direction)*NOTIONAL/pos.entryPrice;
 const exitFee=NOTIONAL*TAKER*price/pos.entryPrice;
 return {gross:round(gross),exitFee:round(exitFee),
  net:round(gross-pos.entryFeeUsd-exitFee)};
}
function closed(s,ts,price,reason){
 const p=s.position;
 if(!p)return null;
 const result=pnl(p,price);
 const row={tradeNo:s.completed+1,engine:'V5.5',policyVersion:POLICY,
  direction:p.direction,entryAt:p.entryAt,exitAt:ts,
  entryPrice:p.entryPrice,exitPrice:price,notionalUsd:NOTIONAL,
  grossPnlUsd:result.gross,feesUsd:round(p.entryFeeUsd+result.exitFee),
  netPnlUsd:result.net,mfePriceUsd:round(p.mfePriceUsd),
  maePriceUsd:round(p.maePriceUsd),entryKey:p.entryKey,
  entryContext:p.entryContext,invalidationPrice:p.invalidationPrice,
  exitReason:reason,slippage:'NOT_MODELED',funding:'NOT_MODELED',
  fills:'OBSERVED_OKX_TRADE_TICK',brokerOrdersEnabled:false};
 s.position=null;s.completed++;
 s.realizedUsd=round(s.realizedUsd+result.net);
 s.feesUsd=round(s.feesUsd+result.exitFee);
 s.equityUsd=round(INITIAL+s.realizedUsd);
 if(result.net>0)s.wins++;else s.losses++;
 s.history.push(row);if(s.history.length>400)s.history=s.history.slice(-400);
 s.lastExit={at:ts,campaignId:p.campaignId,direction:p.direction,
  tradeNo:row.tradeNo,netPnlUsd:result.net};
 s.lastAction={type:'EXIT_'+p.direction.toUpperCase(),ts,price,reason,
  tradeNo:row.tradeNo,netPnlUsd:result.net,campaignId:p.campaignId,
  direction:p.direction};
 return {event:s.lastAction,trade:row};
}
function step(state,d,{ts,price,tickAgeMs,sourceAgeMs}={}){
 const s=migrate(state,ts);
 if(!d||d.version!==POLICY||d.brokerOrdersEnabled!==false)
  throw Error('V55_DECISION_MUST_BE_INDEPENDENT_PAPER');
 if(num(ts)===null||num(price)===null||price<=0||
  ts<=s.lastObservationAt)return {state:s,reason:'BAD_OR_DUPLICATE_TICK',event:null,trade:null};
 s.lastObservationAt=ts;
 const fresh=num(tickAgeMs)!==null&&tickAgeMs>=0&&tickAgeMs<=25000;
 const freshSource=num(sourceAgeMs)!==null&&sourceAgeMs>=0&&sourceAgeMs<=95000;
 let result=null,reason='WAIT';
 s.decision={version:d.version,asOf:d.asOf,action:d.action,reason:d.reason,
  phase:d.phase,candidate:d.candidate,quality:d.quality,price:d.price};
 if(s.position){
  const p=s.position,move=(price-p.entryPrice)*sign(p.direction);
  p.lastPrice=price;p.mfePriceUsd=Math.max(p.mfePriceUsd,move);
  p.maePriceUsd=Math.max(p.maePriceUsd,-move);
  p.lastNetPnlUsd=pnl(p,price).net;
  // The same hard adverse cap as historical V543: 500 BTC USD price move.
  // It acts even when the slower market classifications are temporarily stale.
  if(fresh&&move<=-HARD_RISK_BTC_USD)
   result=closed(s,ts,price,'HARD_RISK_500_BTC_PRICE_USD');
  else if(fresh&&freshSource&&d.quality==='DATA_OK'&&
    d.action==='EXIT_'+p.direction.toUpperCase()&&
    num(d.asOf)!==null&&d.asOf<=ts&&ts-d.asOf<=10000)
   result=closed(s,ts,price,d.reason);
  reason=result?'EXIT_PAPER':'HOLD_PAPER';
 }else if(d.action==='ENTER_LONG'||d.action==='ENTER_SHORT'){
  const dir=d.action==='ENTER_LONG'?'long':'short';
  const stop=d.invalidation||{};
  if(!fresh||!freshSource||d.quality!=='DATA_OK'||d.asOf>ts||ts-d.asOf>10000)
   reason='STALE_ENTRY_REFUSED';
  else if(!d.checks?.freshCross||!d.checks?.reentryQualified||!d.checks?.territory)
   reason='MISSING_CAUSAL_ENTRY_CHAIN';
  else if(!stop.available||num(stop.price)===null||
    num(stop.availableAt)===null||stop.availableAt>ts||
    num(stop.distanceUsd)===null||stop.distanceUsd<=0||
    stop.distanceUsd>=HARD_RISK_BTC_USD)
   reason='NO_SURVIVABLE_ASOF_STOP';
  else if(!d.entryKey||s.usedKeys.includes(d.entryKey))
   reason='USED_CAUSAL_EPISODE';
  else{
   const fee=round(NOTIONAL*TAKER);
   const st=d.readings?.structural55||{},ctx=st.context||{};
   s.position={direction:dir,entryAt:ts,entryPrice:price,lastPrice:price,
    entryPolicyVersion:POLICY,campaignId:d.readings?.structural54?.campaignId||null,
    entryKey:d.entryKey,entryFeeUsd:fee,notionalUsd:NOTIONAL,
    invalidationPrice:stop.price,invalidationReference:stop.reference,
    invalidationKnownAt:stop.availableAt,
    entryContext:{phase:d.phase,reason:d.reason,baselineV543IsNotAuthority:true,
     parent:st.parent,nativeConfirmedE15:st.confirmed15Favourable,
     e1:ctx.e1,e4:ctx.e4,bigRange:ctx.place?.big||null,
     dailyRange:ctx.place?.daily||null,market:ctx.market||null,
     lbw15Delta3m:ctx.delta3,lbw15Delta15m:ctx.delta15,
     territory:st.territory,conversion:st.conversion,
     marketGate:st.marketGate,sourceAt:d.asOf,checks:d.checks,
     structureParentId:d.readings?.structural54?.campaignId||null},
    mfePriceUsd:0,maePriceUsd:0,lastNetPnlUsd:-2*fee};
   s.usedKeys.push(d.entryKey);if(s.usedKeys.length>400)s.usedKeys=s.usedKeys.slice(-400);
   s.feesUsd=round(s.feesUsd+fee);
   s.lastAction={type:'ENTER_'+dir.toUpperCase(),ts,price,reason:d.reason,
    direction:dir,campaignId:d.readings?.structural54?.campaignId||null,
    feeUsd:fee,source:'V55_PAPER_ONLY'};
   result={event:s.lastAction};reason='ENTER_PAPER';
  }
 }
 s.lastReason=reason;
 return {state:s,reason,event:result?.event||null,trade:result?.trade||null};
}
module.exports={VERSION,POLICY,NOTIONAL,INITIAL,TAKER,HARD_RISK_BTC_USD,
 initial,migrate,pnl,step};
