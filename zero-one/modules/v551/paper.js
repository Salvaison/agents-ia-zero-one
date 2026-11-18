'use strict';
// Dedicated V5.5.1 PAPER ledger: new capital, own campaign memory, zero brokerage.
// No import from any V543 / V55 decision, paper, position or ledger.
const decision=require('./decision');
const VERSION='v5.5.1-paper-ledger-v1',POLICY=decision.VERSION;
const INITIAL=1000,NOTIONAL=1500,TAKER=.0005,HARD_RISK_BTC_USD=500;
const N=x=>x===null||x===undefined||x===''?null:
 Number.isFinite(Number(x))?Number(x):null;
const rnd=x=>Math.round(x*10000)/10000;
const dir=x=>x==='long'?1:-1;
function initial(now=Date.now()){
 return {version:VERSION,policyVersion:POLICY,
  engine:'V551',mode:'PAPER_ONLY',brokerOrdersEnabled:false,
  startPolicy:'NEW_1000_USD_NO_V55_V543_ACCOUNT_TRANSFER',
  retiredPredecessor:'V55_STOPPED_AND_ARCHIVED',
  startedAt:now,lastObservationAt:0,
  notionalUsd:NOTIONAL,capitalUsd:INITIAL,equityUsd:INITIAL,
  completed:0,wins:0,losses:0,realizedUsd:0,feesUsd:0,
  history:[],usedEpisodes:[],position:null,decision:null,
  latestAnalysis:null,lastAction:null,lastExit:null,
  memory:decision.originalMemory(now)};
}
function verify(x){
 if(!x||x.version!==VERSION||x.policyVersion!==POLICY||
  x.engine!=='V551'||x.mode!=='PAPER_ONLY'||x.brokerOrdersEnabled!==false||
  x.retiredPredecessor!=='V55_STOPPED_AND_ARCHIVED'||
  x.memory?.version!=='v551-campaign-memory-v1')
  throw Error('V551_LEDGER_UNTRUSTED_NO_IMPLICIT_MIGRATION');
 return x;
}
function pnl(p,price){
 const gross=dir(p.direction)*(price-p.entryPrice)*NOTIONAL/p.entryPrice;
 const exitFee=NOTIONAL*TAKER*price/p.entryPrice;
 return {gross:rnd(gross),exitFee:rnd(exitFee),
  net:rnd(gross-p.entryFeeUsd-exitFee)};
}
function close(s,ts,price,reason){
 const p=s.position,calc=pnl(p,price);
 const t={tradeNo:s.completed+1,engine:'V551',policyVersion:POLICY,
  direction:p.direction,entryAt:p.entryAt,exitAt:ts,
  entryPrice:p.entryPrice,exitPrice:price,
  notionalUsd:NOTIONAL,grossPnlUsd:calc.gross,
  feesUsd:rnd(p.entryFeeUsd+calc.exitFee),
  netPnlUsd:calc.net,mfePriceUsd:rnd(p.mfePriceUsd),
  maePriceUsd:rnd(p.maePriceUsd),entryContext:p.entryContext,
  episodeId:p.episodeId,campaignId:p.campaignId,
  exitReason:reason,brokerOrdersEnabled:false,
  fills:'OBSERVED_OKX_PUBLIC_TRADE_TICK_SIMULATED',
  slippage:'NOT_MODELED',funding:'NOT_MODELED'};
 s.history.push(t);if(s.history.length>500)s.history=s.history.slice(-500);
 s.completed++;s.realizedUsd=rnd(s.realizedUsd+calc.net);
 s.feesUsd=rnd(s.feesUsd+calc.exitFee);
 s.equityUsd=rnd(INITIAL+s.realizedUsd);
 if(calc.net>0)s.wins++;else s.losses++;
 s.position=null;
 s.lastExit={at:ts,reason,price,direction:p.direction,
  campaignId:p.campaignId,tradeNo:t.tradeNo,netPnlUsd:calc.net};
 s.memory.lastExit={...s.lastExit};
 s.lastAction={type:'EXIT_'+p.direction.toUpperCase(),
  ts,price,reason,tradeNo:t.tradeNo,netPnlUsd:calc.net,
  campaignId:p.campaignId,brokerOrdersEnabled:false};
 return t;
}
function step(s,d,{ts,price,tickAgeMs=Infinity,sourceAgeMs=Infinity}={}){
 verify(s);
 if(!d||d.version!==POLICY||d.brokerOrdersEnabled!==false)
  throw Error('V551_DECISION_NOT_INDEPENDENT');
 if(!Number.isFinite(ts)||!Number.isFinite(price)||price<=0||
    ts<=s.lastObservationAt)
  return {state:s,reason:'DUPLICATE_OR_BAD_TICK',event:null,trade:null};
 const fresh=Number.isFinite(tickAgeMs)&&tickAgeMs>=0&&tickAgeMs<=25000;
 const freshSource=Number.isFinite(sourceAgeMs)&&sourceAgeMs>=0&&
   sourceAgeMs<=65000;
 const decisionFresh=d.asOf===ts&&d.quality==='DATA_OK';
 s.lastObservationAt=ts;
 s.decision={version:d.version,asOf:ts,action:d.action,
  reason:d.reason,candidate:d.candidate,campaignDirection:d.campaignDirection,
  campaignPhase:d.campaignPhase,quality:d.quality};
 let trade=null,event=null,reason='WAIT_PAPER';
 if(s.position){
  const p=s.position,move=dir(p.direction)*(price-p.entryPrice);
  p.lastPrice=price;
  p.mfePriceUsd=Math.max(p.mfePriceUsd,move);
  p.maePriceUsd=Math.max(p.maePriceUsd,-move);
  p.lastNetPnlUsd=pnl(p,price).net;
  if(fresh&&move<=-HARD_RISK_BTC_USD)
   trade=close(s,ts,price,'V551_HARD_RISK_500_BTC_PRICE_USD');
  else if(fresh&&freshSource&&decisionFresh&&
   d.action==='EXIT_'+p.direction.toUpperCase())
   trade=close(s,ts,price,d.reason);
  if(trade){event=s.lastAction;reason='EXIT_PAPER'}
  else reason='HOLD_PAPER';
 }else if(d.action==='ENTER_LONG'||d.action==='ENTER_SHORT'){
  const direction=d.action==='ENTER_LONG'?'long':'short';
  const episodeId=d.episode?.id;
  if(!fresh||!freshSource||!decisionFresh)reason='ENTRY_SOURCE_STALE';
  else if(!episodeId||s.usedEpisodes.includes(episodeId))
   reason='EPISODE_ALREADY_USED_OR_UNAVAILABLE';
  else if(!d.campaignId||!['long','short'].includes(d.campaignDirection))
   reason='NO_MEMORY_CAMPAIGN';
  else{
   const fee=rnd(NOTIONAL*TAKER);
   const readings=d.readings||{};
   const quality=d.qualification||{};
   s.position={direction,entryAt:ts,entryPrice:price,lastPrice:price,
    entryFeeUsd:fee,notionalUsd:NOTIONAL,episodeId,
    entryPolicyVersion:POLICY,campaignId:d.campaignId,
    entryContext:{
     phase:d.campaignPhase,reason:d.reason,campaignDirection:d.campaignDirection,
     MCB3:readings.mcb3,MCB15:readings.mcb15,MF:readings.mf,
     PM:readings.pm,liquidity:readings.liquidity,place:readings.place,
     qualification:quality,trace:d.causalTrace?.slice(-15)||[],
     referenceRisk:'HARD_500_BTC_PRICE_USD_NOT_A_CERTAIN_STRUCTURE_LEVEL'},
    mfePriceUsd:0,maePriceUsd:0,lastNetPnlUsd:-2*fee};
   s.usedEpisodes.push(episodeId);
   if(s.usedEpisodes.length>500)s.usedEpisodes=s.usedEpisodes.slice(-500);
   if(s.memory.episode?.id===episodeId){
    s.memory.episode.entered=true;
    s.memory.episode.status='CONSUMED';
   }
   s.feesUsd=rnd(s.feesUsd+fee);
   event={type:'ENTER_'+direction.toUpperCase(),ts,price,episodeId,
    campaignId:d.campaignId,reason:d.reason,brokerOrdersEnabled:false};
   s.lastAction=event;reason='ENTER_PAPER';
  }
 }
 return {state:s,reason,event,trade};
}
module.exports={VERSION,POLICY,INITIAL,NOTIONAL,TAKER,HARD_RISK_BTC_USD,
 initial,verify,pnl,step};
