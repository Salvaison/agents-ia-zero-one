'use strict';
// V553: own PAPER ledger, policy, and risk. Explicit one-time V552 handoff.
// Never invokes a broker, never opens a second live PAPER account.
const decision=require('./decision');
const VERSION='v5.5.3-paper-ledger-v1',POLICY=decision.VERSION;
const INITIAL=1000,NOTIONAL=1500,TAKER=.0005,HARD_RISK_BTC_USD=500;
const rnd=x=>Math.round(x*10000)/10000;
const side=d=>d==='long'?1:d==='short'?-1:0;
function clone(x){return JSON.parse(JSON.stringify(x));}
function initial(now=Date.now()){
 return {version:VERSION,policyVersion:POLICY,
  engine:'V553',mode:'PAPER_ONLY',brokerOrdersEnabled:false,
  startedAt:now,policyStartedAt:now,lastObservationAt:0,
  capitalUsd:INITIAL,notionalUsd:NOTIONAL,equityUsd:INITIAL,
  completed:0,wins:0,losses:0,realizedUsd:0,feesUsd:0,
  pre553Completed:0,newPolicyClosed:0,newPolicyNetUsd:0,
  history:[],usedOpportunities:[],position:null,
  retiredPredecessor:'V552_STOPPED_AND_ARCHIVED',
  migratedFrom:null,ledgerLineage:null,
  lastExit:null,lastAction:null,decision:null,latestAnalysis:null,
  memory:decision.originalMemory(now)};
}
function verify(s){
 if(!s||s.version!==VERSION||s.policyVersion!==POLICY||
  s.engine!=='V553'||s.mode!=='PAPER_ONLY'||
  s.brokerOrdersEnabled!==false||
  s.retiredPredecessor!=='V552_STOPPED_AND_ARCHIVED'||
  !s.migratedFrom||s.migratedFrom.engine!=='V552'||
  s.migratedFrom.oldProcessStopped!==true||
  s.memory?.version!=='v553-causal-chain-memory-v1'||
  !Array.isArray(s.history)||s.history.length!==s.completed||
  !Array.isArray(s.usedOpportunities)||
  !Number.isFinite(s.equityUsd)||s.equityUsd<=0||
  !Number.isFinite(s.lastObservationAt))
  throw Error('V553_PAPER_LEDGER_UNTRUSTED_OR_MIGRATION_REQUIRED');
 return s;
}
function fromV552(old,manifest){
 if(!old||old.engine!=='V552'||
  old.version!=='v5.5.2-paper-ledger-v1'||
  old.mode!=='PAPER_ONLY'||old.brokerOrdersEnabled!==false||
  !Array.isArray(old.history)||old.history.length!==old.completed||
  !Number.isFinite(old.equityUsd)||old.equityUsd<=0||
  !Number.isFinite(old.lastObservationAt)||!old.migratedFrom)
  throw Error('V553_SOURCE_V552_UNTRUSTED');
 if(!manifest||manifest.sourceHash!==manifest.frozenSourceHash||
  manifest.oldProcessStopped!==true||
  !Number.isFinite(manifest.handoffAt)||
  manifest.handoffAt<old.lastObservationAt)
  throw Error('V553_REFUSE_UNFROZEN_OR_PARALLEL_PASSATION');
 const s=initial(old.startedAt);
 for(const k of ['completed','wins','losses','realizedUsd',
  'feesUsd','equityUsd','lastObservationAt','lastExit','lastAction'])
  s[k]=clone(old[k]===undefined?null:old[k]);
 s.history=old.history.map(t=>({...clone(t),
  historicalPolicy:true,sourceEngine:t.sourceEngine||'V552',
  historicalFromV552:true}));
 s.pre553Completed=old.completed;
 s.policyStartedAt=manifest.handoffAt;
 s.ledgerLineage={fromV551:clone(old.migratedFrom),
  oldV552PolicyRevisions:clone(old.policyHistory||[]),
  lastV552Revision:clone(old.policyRevision||null),
  oldV552NewPolicyClosed:old.newPolicyClosed,
  oldV552NewPolicyNetUsd:old.newPolicyNetUsd};
 s.position=old.position?{...clone(old.position),
  inheritedFrom:'V552',
  originalTradeNo:old.completed+1,
  entryPolicyVersion:old.position.entryPolicyVersion||
   old.policyVersion}:null;
 s.memory=decision.originalMemory(old.lastObservationAt,old.lastExit);
 s.usedOpportunities=[];
 s.migratedFrom={engine:'V552',ledgerVersion:old.version,
  policyVersion:old.policyVersion,
  at:manifest.handoffAt,oldStartedAt:old.startedAt,
  oldCompleted:old.completed,oldEquityUsd:old.equityUsd,
  oldFeesUsd:old.feesUsd,oldRealizedUsd:old.realizedUsd,
  carriedOpenPosition:!!old.position,
  carriedEntryAt:old.position?.entryAt||null,
  oldAsOf:old.lastObservationAt,sourceSha256:manifest.sourceHash,
  oldProcessStopped:true,brokerOrdersEnabled:false};
 return verify(s);
}
function pnl(p,price){
 const gross=side(p.direction)*(price-p.entryPrice)*NOTIONAL/p.entryPrice;
 const exitFee=NOTIONAL*TAKER*price/p.entryPrice;
 return {gross:rnd(gross),exitFee:rnd(exitFee),
  net:rnd(gross-p.entryFeeUsd-exitFee)};
}
function close(s,ts,price,reason){
 const p=s.position,calc=pnl(p,price);
 const t={tradeNo:s.completed+1,engine:'V553',
  policyVersion:POLICY,entryPolicyVersion:p.entryPolicyVersion,
  exitPolicyVersion:POLICY,
  direction:p.direction,entryAt:p.entryAt,exitAt:ts,
  entryPrice:p.entryPrice,exitPrice:price,
  notionalUsd:NOTIONAL,grossPnlUsd:calc.gross,
  feesUsd:rnd(p.entryFeeUsd+calc.exitFee),netPnlUsd:calc.net,
  mfePriceUsd:rnd(p.mfePriceUsd),maePriceUsd:rnd(p.maePriceUsd),
  entryContext:p.entryContext,opportunityId:p.opportunityId||null,
  episodeId:p.episodeId||p.opportunityId||null,
  campaignId:p.campaignId||null,
  sourceEngine:p.inheritedFrom||'V553',
  inheritedPosition:!!p.inheritedFrom,
  originalTradeNo:p.originalTradeNo||null,
  exitReason:reason,brokerOrdersEnabled:false,
  fills:'OBSERVED_OKX_PUBLIC_TRADE_TICK_SIMULATED',
  slippage:'NOT_MODELED',funding:'NOT_MODELED'};
 s.history.push(t);
 s.completed++;s.newPolicyClosed++;
 s.newPolicyNetUsd=rnd(s.newPolicyNetUsd+calc.net);
 s.realizedUsd=rnd(s.realizedUsd+calc.net);
 s.feesUsd=rnd(s.feesUsd+calc.exitFee);
 s.equityUsd=rnd(INITIAL+s.realizedUsd);
 if(calc.net>0)s.wins++;else s.losses++;
 s.position=null;
 s.lastExit={at:ts,price,reason,direction:p.direction,
  netPnlUsd:calc.net,tradeNo:t.tradeNo,
  opportunityId:p.opportunityId||null,
  parentE15:p.campaignId||null};
 s.memory.lastExit={...s.lastExit};
 s.memory.opportunity=null;s.memory.threat=null;
 s.memory.lastPositionEntryAt=null;
 s.lastAction={type:'EXIT_'+p.direction.toUpperCase(),ts,
  price,reason,tradeNo:t.tradeNo,netPnlUsd:calc.net,
  brokerOrdersEnabled:false};
 return t;
}
function step(s,d,{ts,price,tickAgeMs=Infinity,sourceAgeMs=Infinity}={}){
 verify(s);
 if(!d||d.version!==POLICY||d.brokerOrdersEnabled!==false)
  throw Error('V553_REJECT_WRONG_POLICY_OR_BROKER');
 if(!Number.isFinite(ts)||!Number.isFinite(price)||price<=0||
   ts<=s.lastObservationAt)
  return {state:s,reason:'BAD_OR_DUPLICATE_TICK',event:null,trade:null};
 const fresh=Number.isFinite(tickAgeMs)&&tickAgeMs>=0&&tickAgeMs<=25000;
 const sourceFresh=Number.isFinite(sourceAgeMs)&&
  sourceAgeMs>=0&&sourceAgeMs<=65000;
 const decisionFresh=d.asOf===ts&&d.quality==='DATA_OK';
 s.lastObservationAt=ts;
 s.decision={version:d.version,asOf:ts,action:d.action,
  reason:d.reason,market:d.market?.status||null,
  campaignId:d.campaignId,quality:d.quality};
 let event=null,trade=null,reason='WAIT_PAPER';
 if(s.position){
  const p=s.position,move=side(p.direction)*(price-p.entryPrice);
  p.lastPrice=price;p.mfePriceUsd=Math.max(p.mfePriceUsd,move);
  p.maePriceUsd=Math.max(p.maePriceUsd,-move);
  p.lastNetPnlUsd=pnl(p,price).net;
  if(fresh&&move<=-HARD_RISK_BTC_USD)
   trade=close(s,ts,price,'V553_HARD_RISK_500_BTC_PRICE_USD');
  else if(fresh&&sourceFresh&&decisionFresh&&
    d.action==='EXIT_'+p.direction.toUpperCase())
   trade=close(s,ts,price,d.reason);
  if(trade){event=s.lastAction;reason='EXIT_PAPER';}
  else reason='HOLD_PAPER';
 }else if(['ENTER_LONG','ENTER_SHORT'].includes(d.action)){
  const chain=d.opportunity;
  const direction=d.action==='ENTER_LONG'?'long':'short';
  if(!fresh||!sourceFresh||!decisionFresh)
   reason='ENTRY_SOURCE_STALE';
  else if(!chain||chain.direction!==direction||!
    Number.isFinite(chain.startedAt)||
    chain.startedAt<=(s.lastExit?.at||0)||
    chain.confirmations<2)
   reason='NO_FRESH_QUALIFIED_POST_EXIT_CAUSAL_CHAIN';
  else if(s.usedOpportunities.includes(chain.id))
   reason='OPPORTUNITY_ALREADY_USED';
  else if(d.market?.admissionAllowed!==true)
   reason='MARKET_REJECTS_NEW_ENTRY';
  else{
   const fee=rnd(NOTIONAL*TAKER);
   s.position={direction,entryAt:ts,entryPrice:price,lastPrice:price,
    entryFeeUsd:fee,notionalUsd:NOTIONAL,
    opportunityId:chain.id,episodeId:chain.id,
    campaignId:d.parentE15?.id||null,
    entryPolicyVersion:POLICY,
    entryContext:{reason:d.reason,
     parentE15:d.parentE15,causalChain:clone(chain),
     market:clone(d.market),
     qualification:d.qualification,
     MCB3:d.readings?.mcb3,MCB15:d.readings?.mcb15,
     MF:d.readings?.mf,PM:d.readings?.pm,place:d.readings?.place,
     timing:'NEW_CAUSAL_CHAIN_ASOF',
     risk:'HARD_500_BTC_USD_NOT_STOP_GUARANTEE'},
    mfePriceUsd:0,maePriceUsd:0,
    lastNetPnlUsd:-2*fee};
   s.usedOpportunities.push(chain.id);
   if(s.usedOpportunities.length>750)
    s.usedOpportunities=s.usedOpportunities.slice(-750);
   s.memory.opportunity=null;
   s.feesUsd=rnd(s.feesUsd+fee);
   event={type:'ENTER_'+direction.toUpperCase(),
    ts,price,opportunityId:chain.id,
    parentE15:d.parentE15?.id||null,
    reason:d.reason,brokerOrdersEnabled:false};
   s.lastAction=event;reason='ENTER_PAPER';
  }
 }
 return {state:s,reason,event,trade};
}
module.exports={VERSION,POLICY,INITIAL,NOTIONAL,TAKER,HARD_RISK_BTC_USD,
 initial,fromV552,verify,pnl,step};
