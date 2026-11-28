'use strict';
// Pure, separate simulated ledger. No broker integration or old ledger writes.
const D=require('./decision');
const VERSION='v554-shadow-ledger-v1',INITIAL=1000,NOTIONAL=1500,TAKER=.0005,HARD=500;
const round=x=>Math.round(x*10000)/10000,finite=Number.isFinite,sg=d=>d==='long'?1:-1;
function initial(at){return {version:VERSION,engine:'V554',policyVersion:D.VERSION,mode:'SHADOW_ONLY',brokerOrdersEnabled:false,decisionImpact:false,
 startedAt:at,lastObservationAt:0,capitalUsd:INITIAL,notionalUsd:NOTIONAL,equityUsd:INITIAL,realizedUsd:0,feesUsd:0,completed:0,wins:0,losses:0,
 position:null,history:[],usedInitiatives:{},lastExit:null,lastAction:null,decision:null};}
function verify(a){
 if(a?.version!==VERSION||a.engine!=='V554'||a.policyVersion!==D.VERSION||a.mode!=='SHADOW_ONLY'||a.brokerOrdersEnabled!==false||a.decisionImpact!==false||a.notionalUsd!==NOTIONAL||!finite(a.equityUsd)||!Array.isArray(a.history)||!a.usedInitiatives)throw Error('V554_UNTRUSTED_SHADOW_LEDGER');
 return a;
}
function pnl(p,price){const gross=sg(p.direction)*(price-p.entryPrice)*NOTIONAL/p.entryPrice,exitFee=NOTIONAL*TAKER*price/p.entryPrice;return {gross:round(gross),exitFee:round(exitFee),net:round(gross-p.entryFeeUsd-exitFee)};}
function step(a,m,{ts,price,fresh,healthy,bars={},variant='TRAJECTORY',early=true}){
 verify(a);if(!finite(ts)||!finite(price)||price<=0||ts<=a.lastObservationAt)return {decision:D.action('WAIT','DUPLICATE_OR_INVALID_TICK'),event:null};
 if(!fresh)return {decision:D.action('WAIT','STALE_PRICE_TICK'),event:null};
 a.lastObservationAt=ts;let decision,event=null,trade=null;
 const valid=healthy&&m&&finite(m.asOf)&&m.asOf<=ts&&m.sourceAt<=ts&&ts-m.sourceAt<=65000;
 if(a.position){
  const p=a.position,move=sg(p.direction)*(price-p.entryPrice);
  p.lastPrice=price;p.mfePriceUsd=Math.max(p.mfePriceUsd,move);p.maePriceUsd=Math.max(p.maePriceUsd,-move);p.lastNetPnlUsd=pnl(p,price).net;
  decision=move<=-HARD?D.action('EXIT_'+p.direction.toUpperCase(),'V554_HARD_RISK_500_BTC_PRICE_USD'):valid?D.exitReview(m,p,price,ts,bars,early):D.action('HOLD','DATA_UNAVAILABLE_HARD_RISK_STILL_ACTIVE');
  if(decision.action.startsWith('EXIT_')){
   const c=pnl(p,price);trade={tradeNo:++a.completed,engine:'V554',mode:'SHADOW_ONLY',brokerOrdersEnabled:false,decisionImpact:false,
    policyVersion:D.VERSION,direction:p.direction,entryAt:p.entryAt,exitAt:ts,entryPrice:p.entryPrice,exitPrice:price,
    notionalUsd:NOTIONAL,grossPnlUsd:c.gross,netPnlUsd:c.net,feesUsd:round(p.entryFeeUsd+c.exitFee),
    mfePriceUsd:round(p.mfePriceUsd),maePriceUsd:round(p.maePriceUsd),entryContext:p.entryContext,exitContext:decision,
    exitReason:decision.reason,initiativeId:p.initiativeId,fillModel:'PUBLIC_PRICE_OBSERVED_SIMULATION_NO_SLIPPAGE_FUNDING'};
   a.history.push(trade);a.history=a.history.slice(-500);a.realizedUsd=round(a.realizedUsd+c.net);a.equityUsd=round(INITIAL+a.realizedUsd);a.feesUsd=round(a.feesUsd+c.exitFee);
   if(c.net>0)a.wins++;else a.losses++;if(a.usedInitiatives[p.initiativeId])a.usedInitiatives[p.initiativeId].peakPrice=p.entryPrice+sg(p.direction)*p.mfePriceUsd; a.position=null;a.lastExit={at:ts,price,direction:p.direction,initiativeId:p.initiativeId,net:c.net};event={type:decision.action,ts,price,reason:decision.reason,tradeNo:trade.tradeNo};
  }
 }else{
  decision=valid&&a.equityUsd>0?D.candidate(m,a,price,variant):D.action('WAIT','DATA_OR_ACCOUNT_UNAVAILABLE');
  if(decision.action.startsWith('ENTER_')){
   const direction=decision.action==='ENTER_LONG'?'long':'short',fee=NOTIONAL*TAKER;
   let defense=D.initialDefense(bars['3m'],m.asOf,direction==='long'?'UP':'DN');if(defense&&sg(direction)*(price-defense.level)<=0)defense=null;
   a.position={direction,entryAt:ts,entryPrice:price,lastPrice:price,entryFeeUsd:fee,initiativeId:decision.initiativeId,
    entryContext:JSON.parse(JSON.stringify(decision)),defense,mfePriceUsd:0,maePriceUsd:0,lastNetPnlUsd:-2*fee};
   a.usedInitiatives[decision.initiativeId]={at:ts,proofId:decision.proofId,price};
   const keys=Object.keys(a.usedInitiatives);for(const k of keys.slice(0,Math.max(0,keys.length-400)))delete a.usedInitiatives[k];
   a.feesUsd=round(a.feesUsd+fee);event={type:decision.action,ts,price,reason:decision.reason,initiativeId:decision.initiativeId};
  }
 }
 a.decision={...decision,asOf:ts};if(event)a.lastAction=event;
 return {decision:a.decision,event,trade};
}
module.exports={VERSION,INITIAL,NOTIONAL,TAKER,HARD,initial,verify,pnl,step};
