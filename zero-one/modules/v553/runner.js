'use strict';
// V553: fully independent PAPER strategy loop and account. V552 retired at handoff.
const fs=require('node:fs'),path=require('node:path');
const stream=require('../price-stream');
const source=require('./source'),policy=require('./decision'),paper=require('./paper');
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const FILES={state:path.join(DATA,'v553-paper-state.json'),
 summary:path.join(DATA,'v553-paper-summary.json'),
 trades:path.join(DATA,'v553-paper-trades.ndjson'),
 decisions:path.join(DATA,'v553-paper-decisions.ndjson')};
function read(p){return fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;}
function write(p,v){const temp=p+'.tmp-'+process.pid;
 fs.writeFileSync(temp,JSON.stringify(v));fs.renameSync(temp,p);}
function append(p,x){appendRotatingNdjson(p,x,{maxBytes:4*1024*1024,maxSegments:12});}
function summary(s){
 const d=s.latestAnalysis||{},r=d.readings||{};
 return {version:paper.VERSION,policyVersion:policy.VERSION,
  engine:'V553',mode:'PAPER_ONLY',brokerOrdersEnabled:false,
  asOf:s.lastObservationAt,startedAt:s.startedAt,
  source:'INDEPENDENT_V553_MCB_BATON_OKX_PUBLIC',
  completed:s.completed,wins:s.wins,losses:s.losses,
  equityUsd:s.equityUsd,realizedUsd:s.realizedUsd,feesUsd:s.feesUsd,
  position:s.position?{
   direction:s.position.direction,entryAt:s.position.entryAt,
   entryPrice:s.position.entryPrice,lastPrice:s.position.lastPrice,
   lastNetPnlUsd:s.position.lastNetPnlUsd,
   mfePriceUsd:s.position.mfePriceUsd,
   maePriceUsd:s.position.maePriceUsd,
   opportunityId:s.position.opportunityId||s.position.episodeId||null,
   campaignId:s.position.campaignId||null,
   inheritedFrom:s.position.inheritedFrom||null,
   hardRisk:'500_BTC_USD_ADVERSE_PRICE_MOVE'}:null,
  latestDecision:s.decision,lastAction:s.lastAction,
  parentE15:s.memory.e15,opportunity:s.memory.opportunity,
  threat:s.memory.threat,
  market:d.market||null,vigilance:d.vigilance||null,
  causalTrace:s.memory.trace.slice(-28),
  latestReadings:{mcb15:r.mcb15||null,mcb3:r.mcb3||null,
   pm:r.pm||null,mf:r.mf||null,place:r.place||null},
  latestQualification:d.qualification||null,
  pre553Completed:s.pre553Completed,
  newPolicyClosed:s.newPolicyClosed,newPolicyNetUsd:s.newPolicyNetUsd,
  migratedFrom:s.migratedFrom,
  tradeHead:s.history.slice(-10).map(t=>({
   tradeNo:t.tradeNo,direction:t.direction,entryAt:t.entryAt,
   exitAt:t.exitAt,entryPrice:t.entryPrice,exitPrice:t.exitPrice,
   netPnlUsd:t.netPnlUsd,exitReason:t.exitReason,
   entryPolicyVersion:t.entryPolicyVersion||null,
   exitPolicyVersion:t.exitPolicyVersion||null})),
  executionContract:'PAPER_ONLY_NO_FUNDED_BROKER',
  assumptions:'Price at public OKX tick, no slippage or funding model',
  riskContract:'MAX_ADVERSE_PRICE_500_BTCUSD_NOT_GUARANTEED_STOP'};
}
function fallback(ts,price,why){
 return {version:policy.VERSION,mode:'PAPER_ONLY',brokerOrdersEnabled:false,
  asOf:ts,price,quality:'DATA_DEGRADED',
  action:'WAIT',reason:why,candidate:null};
}
function dryRead(){
 const now=Date.now(),input=source.load(now),px=input.current?.lastPrice;
 if(!Number.isFinite(px))throw Error('V553_SOURCE_MISSING');
 const dummy=paper.initial(now-120000);
 const r=policy.evaluate(dummy.memory,input,px,now,null);
 console.log(JSON.stringify({mode:'READ_ONLY_TEST',engine:'V553',
  noWrites:true,sourceStatus:input.healthy,decision:r.decision,
  account:summary(dummy),brokerOrdersEnabled:false},null,2));
}
function main(){
 if(process.argv.includes('--test-read'))return dryRead();
 const s0=read(FILES.state);
 if(!s0)throw Error('V553_HANDOFF_REQUIRED_NO_INITIAL_ACCOUNT');
 let s=paper.verify(s0);
 console.log('[V553 PAPER] '+JSON.stringify({version:policy.VERSION,
  ledger:paper.VERSION,startedAt:s.startedAt,completed:s.completed,
  position:s.position?.direction||'FLAT',
  priorV552:'STOPPED_FROZEN_MIGRATED_ONCE',
  brokerOrdersEnabled:false,mode:'PAPER_ONLY'}));
 let busy=false,lastSave=0,priorKey=null,errors=0;
 function tick(){
  if(busy)return;busy=true;
  try{
   const ts=Number(stream.lastUpdateTs),price=Number(stream.lastPrice);
   const rec=Date.now();
   if(!Number.isFinite(ts)||!Number.isFinite(price)||price<=0||
    ts<=s.lastObservationAt)return;
   const tickAgeMs=rec-ts;
   if(tickAgeMs<0)return;
   let d,sourceAgeMs=Infinity;
   try{
    const input=source.load(ts);
    sourceAgeMs=ts-Number(input.current?.ts||0);
    d=policy.evaluate(s.memory,input,price,ts,s.position).decision;
   }catch(err){
    if(++errors<=5||errors%30===0)
     console.error('[V553 SOURCE ERROR] '+(err.stack||err));
    d=fallback(ts,price,'V553_SOURCE_UNAVAILABLE');
   }
   const out=paper.step(s,d,{ts,price,tickAgeMs,sourceAgeMs});
   s=out.state;s.latestAnalysis=d;
   const key=[d.action,d.reason,s.position?.direction,
    d.campaignId,d.chain?.id,d.chain?.phase,
    d.market?.status,d.vigilance?.firstLiveAt].join('|');
   if(out.event||key!==priorKey||d.recentEvents?.length){
    append(FILES.decisions,{ts,price,version:policy.VERSION,
     decision:d.action,reason:d.reason,quality:d.quality,
     market:{status:d.market?.status,reason:d.market?.reason,
      evidence:d.market?.evidence,place:d.market?.place},
     parentE15:d.parentE15,
     causalChain:d.chain||null,
     vigilance:d.vigilance||null,
     qualification:d.qualification||null,
     readings:{mcb15:d.readings?.mcb15,mcb3:d.readings?.mcb3,
      pm:d.readings?.pm,mf:d.readings?.mf},
     events:d.recentEvents||[],
     paperResult:out.reason,event:out.event||null,
     brokerOrdersEnabled:false});
    priorKey=key;
   }
   if(out.trade)append(FILES.trades,out.trade);
   if(out.event||rec-lastSave>=30000){
    write(FILES.state,s);write(FILES.summary,summary(s));lastSave=rec;
   }
   if(out.event)console.log('[V553 PAPER EVENT] '+JSON.stringify(out.event));
   errors=0;
  }catch(err){
   if(++errors<=5||errors%30===0)
    console.error('[V553 ERROR] '+(err.stack||err));
  }finally{busy=false;}
 }
 stream.on('error',err=>console.error('[V553 PRICE STREAM] '+err.message));
 stream.start();tick();setInterval(tick,5000);
}
if(require.main===module)main();
module.exports={FILES,summary,fallback,dryRead};
