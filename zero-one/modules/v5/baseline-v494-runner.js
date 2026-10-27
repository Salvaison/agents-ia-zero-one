'use strict';
// BOONO baseline: ORIGINAL V4.9.3 engine loaded from detached cdf1936 worktree.
// Own isolated PAPER accounting. Never runs original cerveau-central or a broker.
const fs=require('fs'),path=require('path');
const BASE='/root/boono-v493-baseline/zero-one';
const {buildRuntimeSnapshot}=require(BASE+'/modules/v2/adapters/runtime-snapshot');
const engine=require(BASE+'/modules/v4/core/engine');
const listening=require('../attention/listening-v494');
const DATA=path.resolve(__dirname,'../../data');
const STATE=path.join(DATA,'v494-paper-state.json');
const TRADES=path.join(DATA,'v494-paper-trades.ndjson');
const DECISIONS=path.join(DATA,'v494-paper-decisions.ndjson');
const VERSION='baseline-v494-attention-paper-v0.2';
const NOTIONAL=1500,FEE=.0005,INIT=1000;
const round=n=>Math.round(n*10000)/10000;
function atomic(p,v){const tmp=p+'.tmp-'+process.pid;fs.writeFileSync(tmp,JSON.stringify(v));fs.renameSync(tmp,p);}
function read(p,f){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(_){return f;}}
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
function append(p,obj){appendRotatingNdjson(p,obj,{maxBytes:4*1024*1024,maxSegments:10});}
function initial(){return {version:VERSION,engine:engine.VERSION,gitRef:'cdf1936',
 mode:'PAPER_V494_ONLY',brokerOrdersEnabled:false,startedAt:Date.now(),
 completed:0,wins:0,losses:0,realizedUsd:0,feesUsd:0,equityUsd:INIT,
 position:null,history:[],priorEval:null,lastObservationAt:0,lastAction:null,
 lastReason:'STARTING',latestDecision:null,decisionImpactOnV4:false};}
function directionPnl(d,entry,price,notional){
 return (price-entry)*(d==='long'?1:-1)*notional/entry;
}
function step(s,frame){
 const ts=Number(frame.market.timestamp),price=Number(frame.market.price);
 if(!Number.isFinite(ts)||!Number.isFinite(price)||ts<=s.lastObservationAt)
  return {s,changed:false};
 s.lastObservationAt=ts;
 const p=s.position;
 if(p){
  const signed=(price-p.entryPrice)*(p.direction==='long'?1:-1);
  p.metrics=p.metrics||{};
  p.metrics.mfeUsd=Math.max(p.metrics.mfeUsd||0,signed);
  p.metrics.maeUsd=Math.max(p.metrics.maeUsd||0,-signed);
  p.metrics.currentSignedUsd=signed;
  p.metrics.favorableUsd=Math.max(0,signed);
  p.metrics.adverseUsd=Math.max(0,-signed);
  p.metrics.currentPnlUsd=directionPnl(p.direction,p.entryPrice,price,p.notionalUsd)-
    p.entryFeeUsd-p.partialFeesUsd-p.notionalUsd*FEE;
 }
 const evaluated=engine.evaluate(frame,p,s.priorEval);
 // Temporal attention is observational in first controlled V494 release.
 // The exact V493 original evaluation remains the SOLE trade authority.
 const listeningNow=listening.decorate({v493Evaluation:evaluated,frame,position:p,
  previousAttention:s.temporalAttention||null,
  lastExitAt:String(s.lastAction?.type||'').startsWith('EXIT_')?s.lastAction.ts:null});
 s.temporalAttention=listeningNow.temporalAttention;
 s.temporalExitProposal=listeningNow.temporalExitProposal;
 // Last full evaluation is needed to preserve original V4.9.3 campaign/MF memory.
 s.priorEval=evaluated;
 const action=evaluated.action||{},type=action.type||'WAIT';
 const quality=(Date.now()-ts<90000&&fs.statSync(path.join(DATA,'../../data/mcb-live/mcb_3m_live.csv')).mtimeMs>Date.now()-120000)
  ?'DATA_OK':'DATA_DEGRADED';
 s.latestDecision={type,direction:action.direction||null,reason:action.reason||null,
  marketTs:ts,price,quality,setup:evaluated.setup?.status||null,
  mcb:evaluated.mcb?.currentLobe?.structuralDirection||null,
  version:listening.VERSION,originalEngineVersion:engine.VERSION,
  attentionStage:s.temporalAttention?.stage||null};
 let event=null;
 if(p){
  if(type==='TAKE_PROFIT_PARTIAL'&&!p.tp1Taken){
   const frac=.25,notional=p.notionalUsd*frac;
   const fee=notional*FEE*(price/p.entryPrice);
   p.realizedGrossUsd+=directionPnl(p.direction,p.entryPrice,price,notional);
   p.partialFeesUsd+=fee;p.grossRealizedPnlUsd=p.realizedGrossUsd;
   p.tradingFeesPaidUsd+=fee;p.realizedPnlUsd=p.realizedGrossUsd-p.tradingFeesPaidUsd;
   p.notionalUsd-=notional;p.marginUsd*=1-frac;
   p.tp1Taken=true;p.tpEvents.push({type,ts,price,fraction:frac,feeUsd:round(fee)});
   s.feesUsd=round(s.feesUsd+fee);
   event={type:'TP1',ts,price,direction:p.direction,reason:action.reason};
  }else if(type.startsWith('EXIT_')){
   const gross=p.realizedGrossUsd+directionPnl(p.direction,p.entryPrice,price,p.notionalUsd);
   const exitFee=p.notionalUsd*FEE*(price/p.entryPrice);
   const fees=p.entryFeeUsd+p.partialFeesUsd+exitFee,net=round(gross-fees);
   const t={tradeNo:s.completed+1,
    engine:p.entryAt<(s.policyActivatedAt||0)?'V4.9.3':'V4.9.4',
    gitRef:'cdf1936',
    direction:p.direction,entryAt:p.entryAt,exitAt:ts,entryPrice:p.entryPrice,exitPrice:price,
    notionalUsd:NOTIONAL,grossPnlUsd:round(gross),feesUsd:round(fees),netPnlUsd:net,
    mfePriceUsd:round(p.metrics.mfeUsd),maePriceUsd:round(p.metrics.maeUsd),
    exitReason:type,entryReason:p.entryReason,tpEvents:p.tpEvents,
    slippage:'NOT_MODELED',funding:'NOT_MODELED',fills:'OBSERVED_BATON_30S'};
   append(TRADES,t);s.history.push(t);s.history=s.history.slice(-120);
   s.position=null;s.completed++;if(net>0)s.wins++;else s.losses++;
   s.realizedUsd=round(s.realizedUsd+net);s.equityUsd=round(INIT+s.realizedUsd);
   s.feesUsd=round(s.feesUsd+exitFee);
   event={type,ts,price,direction:p.direction,netPnlUsd:net,tradeNo:t.tradeNo};
  }
 }else if((type==='ENTER_LONG'||type==='ENTER_SHORT')&&quality==='DATA_OK'&&ts>s.startedAt){
   const dir=type==='ENTER_LONG'?'long':'short',fee=round(NOTIONAL*FEE);
   s.position={direction:dir,entryAt:ts,entryTimestamp:new Date(ts).toISOString(),
    entryPrice:price,lastPrice:price,notionalUsd:NOTIONAL,marginUsd:150,
    entryPolicyVersion:listening.VERSION,
    initialNotionalUsd:NOTIONAL,initialMarginUsd:150,capitalUsd:INIT,leverage:10,
    entryFeeUsd:fee,tradingFeesPaidUsd:fee,realizedPnlUsd:-fee,
    grossRealizedPnlUsd:0,partialFeesUsd:0,realizedGrossUsd:0,tp1Taken:false,
    tpEvents:[],entryReason:action.reason,entryMode:action.stage||null,
    maxAdversePriceMoveUsd:500,maxRiskBudgetUsd:10,
    riskAt500PriceMoveUsd:NOTIONAL*500/price,
    entrySetupTs:evaluated.setup?.setupTs||null,
    entrySetupId:evaluated.setup?.setupId||null,entrySetupKey:evaluated.setup?.setupKey||null,
    metrics:{mfeUsd:0,maeUsd:0,currentSignedUsd:0,favorableUsd:0,adverseUsd:0,
      currentPnlUsd:-2*fee}};
   s.feesUsd=round(s.feesUsd+fee);
   event={type,ts,price,direction:dir,reason:action.reason,feeUsd:fee};
 }
 s.lastReason=action.reason||type;
 if(event)s.lastAction=event;
 return {s,event,type,quality,changed:true};
}
function main(){
 let s=read(STATE,null);
 if(!s||s.version!==VERSION||s.brokerOrdersEnabled!==false)
  throw Error('V494_LEDGER_MIGRATION_REFUSED_REQUIRES_EXPLICIT_COPY');
 atomic(STATE,s);
 console.log('[V494 PAPER] '+JSON.stringify({engine:listening.VERSION,base:engine.VERSION,gitRef:'cdf1936',
  mode:'PAPER_ONLY',brokerOrdersEnabled:false,startAt:s.startedAt,trades:s.completed}));
 let busy=false,errors=0,lastKey=null;
 function tick(){
  if(busy)return;busy=true;
  try{
   const f=buildRuntimeSnapshot();
   const r=step(s,f);s=r.s;
   if(r.changed){
    const fp=[r.type,s.latestDecision?.reason,s.position?.direction||'FLAT',
     s.temporalAttention?.stage||'UNKNOWN'].join('|');
    if(fp!==lastKey||r.event){
     append(DECISIONS,{ts:f.market.timestamp,price:f.market.price,action:r.type,
      reason:s.latestDecision?.reason,quality:r.quality,tradeEvent:r.event||null,
      engine:listening.VERSION,source:'V494_CDF1936',
      attention:{stage:s.temporalAttention?.stage,at:s.temporalAttention?.asOf,
        eventCount:s.temporalAttention?.events?.length||0,
        transferable:!!s.temporalAttention?.opposing?.transferable,
        exitProposal:s.temporalExitProposal||null},brokerOrdersEnabled:false});
     lastKey=fp;
    }
    atomic(STATE,s);
    if(r.event)console.log('[V494 PAPER] '+JSON.stringify(r.event));
   }
   errors=0;
  }catch(err){if(++errors<=4||errors%20===0)console.error('[V493 BASELINE] '+err.stack);}
  finally{busy=false;}
 }
 tick();setInterval(tick,30000);
}
if(require.main===module)main();
module.exports={step,initial,VERSION};
