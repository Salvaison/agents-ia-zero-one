'use strict';
// BOONO V5.2 PAPER only. One independent accounting ledger; zero funded orders.
const VERSION='v5.2-paper-ledger-v0.1';
const NOTIONAL=1500,INIT=1000,TAKER=.0005,RISK_PRICE=500;
const n=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const round=v=>Math.round(v*10000)/10000;
const sign=d=>d==='long'?1:-1;
function initial(now=Date.now()){return {version:VERSION,mode:'PAPER_ONLY',brokerOrdersEnabled:false,
 startedAt:now,lastObservationAt:0,notionalUsd:NOTIONAL,capitalUsd:INIT,equityUsd:INIT,
 realizedUsd:0,feesUsd:0,completed:0,wins:0,losses:0,position:null,
 history:[],usedKeys:[],lastAction:null,decision:null,lastReason:null,decisionImpactOnV4:false};}
function pnl(p,price){const gross=(price-p.entryPrice)*sign(p.direction)*NOTIONAL/p.entryPrice;
 const exitFee=NOTIONAL*TAKER*(price/p.entryPrice);
 return {gross:round(gross),net:round(gross-p.entryFeeUsd-exitFee),exitFee:round(exitFee)};}
function exit(s,ts,price,reason){
 const p=s.position;if(!p)return null;
 const q=pnl(p,price);
 const row={tradeNo:s.completed+1,engine:'V5.2',direction:p.direction,
  entryAt:p.entryAt,exitAt:ts,entryPrice:p.entryPrice,exitPrice:price,
  notionalUsd:NOTIONAL,grossPnlUsd:q.gross,feesUsd:round(p.entryFeeUsd+q.exitFee),
  netPnlUsd:q.net,mfePriceUsd:round(p.mfePriceUsd),maePriceUsd:round(p.maePriceUsd),
  entryKey:p.entryKey,entryContext:p.entryContext,
  entryInvalidation:p.invalidationPrice,exitReason:reason,
  slippage:'NOT_MODELED',funding:'NOT_MODELED',filledAt:'ACTUAL_OBSERVED_TICK'};
 s.position=null;s.completed++;s.realizedUsd=round(s.realizedUsd+q.net);
 s.feesUsd=round(s.feesUsd+q.exitFee);s.equityUsd=round(INIT+s.realizedUsd);
 if(q.net>0)s.wins++;else s.losses++;
 s.history.push(row);if(s.history.length>200)s.history=s.history.slice(-200);
 s.lastAction={type:'EXIT_'+p.direction.toUpperCase(),ts,price,reason,tradeNo:row.tradeNo,
  netPnlUsd:q.net,source:'V5.2_PAPER_ONLY'};
 return {event:s.lastAction,trade:row};
}
function step(s,decision,{price,ts,sourceAgeMs,tickAgeMs}){
 if(!s||s.version!==VERSION)s=initial(ts);
 if(!Number.isFinite(n(ts))||!Number.isFinite(n(price))||price<=0||ts<=s.lastObservationAt)
  return {state:s,event:null,reason:'DUPLICATE_OR_INVALID'};
 s.lastObservationAt=ts;
 s.decision={version:decision.version,action:decision.action,phase:decision.phase,
  reason:decision.reason,candidate:decision.candidate,prognosis:decision.prognosis,
  price:decision.price,asOf:decision.asOf,quality:decision.quality};
 let result=null,reason='NO_TRADE';
 const tickFresh=tickAgeMs!==null&&tickAgeMs>=0&&tickAgeMs<=25000;
 if(s.position){
  const p=s.position,move=(price-p.entryPrice)*sign(p.direction);
  p.lastPrice=price;p.mfePriceUsd=Math.max(p.mfePriceUsd,move);
  p.maePriceUsd=Math.max(p.maePriceUsd,-move);p.lastNetPnlUsd=pnl(p,price).net;
  if(p.mfePriceUsd>=220)p.gainFloorUsd=180;
  else if(p.mfePriceUsd>=120)p.gainFloorUsd=Math.max(90,p.gainFloorUsd||0);
  if(tickFresh&&move<=-RISK_PRICE)result=exit(s,ts,price,'HARD_RISK_500');
  else if(tickFresh&&p.gainFloorUsd>0&&move<=p.gainFloorUsd)
   result=exit(s,ts,price,'GAIN_FLOOR_120_90_OR_220_180');
  else if(tickFresh&&decision.action==='EXIT_'+p.direction.toUpperCase())
   result=exit(s,ts,price,decision.reason);
  reason=result?'EXIT_PAPER':'HOLD_CAMPAGNE';
 }else if(decision.action==='ENTER_LONG'||decision.action==='ENTER_SHORT'){
  const dir=decision.action==='ENTER_LONG'?'long':'short';
  const crossTs=decision.readings?.geometry?.cross3?.ts;
  const inv=decision.invalidation&&decision.invalidation.price;
  if(!tickFresh||sourceAgeMs>95000||decision.quality!=='DATA_OK')
   reason='STALE_SOURCE_NO_ENTRY';
  else if(!crossTs||crossTs<s.startedAt)reason='NO_FRESH_POST_START_CROSS';
  else if(!decision.entryKey||s.usedKeys.includes(decision.entryKey))reason='USED_CROSS_KEY';
  else if(!Number.isFinite(n(inv))||Math.abs(price-inv)>=RISK_PRICE)
   reason='INVALIDATION_NOT_SURVIVABLE';
  else{
   const fee=round(NOTIONAL*TAKER);
   s.position={direction:dir,entryAt:ts,entryPrice:price,lastPrice:price,
    entryKey:decision.entryKey,entryFeeUsd:fee,notionalUsd:NOTIONAL,
    invalidationPrice:inv,invalidationReference:decision.invalidation.reference,
    entryContext:{phase:decision.phase,prognosis:decision.prognosis,
     mcb15:decision.readings.mcb15,geometry:decision.readings.geometry,
     place:decision.readings.place,conversion:decision.readings.conversion,
     economics:decision.readings.economics,sourceAt:decision.asOf},
    mfePriceUsd:0,maePriceUsd:0,gainFloorUsd:0,lastNetPnlUsd:-2*fee};
   s.feesUsd=round(s.feesUsd+fee);
   s.usedKeys=[...s.usedKeys,decision.entryKey].slice(-350);
   s.lastAction={type:'ENTER_'+dir.toUpperCase(),ts,price,reason:decision.reason,
    direction:dir,entryKey:decision.entryKey,feeUsd:fee,source:'V5.2_PAPER_ONLY'};
   result={event:s.lastAction};reason='ENTER_PAPER';
  }
 }
 s.lastReason=reason;
 return {state:s,event:result&&result.event||null,trade:result&&result.trade||null,reason};
}
module.exports={VERSION,NOTIONAL,TAKER,initial,step,pnl};
