'use strict';
// BOONO V5.5.2: its own MARKET reader, memory, strategy and PAPER account.
// No imports from V543/V55 decisions, state, risk, or ledger.
const fs=require('node:fs'),path=require('node:path');
const stream=require('../price-stream');
const source=require('./source'),policy=require('./decision'),paper=require('./paper');
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const FILES={state:path.join(DATA,'v552-paper-state.json'),
 summary:path.join(DATA,'v552-paper-summary.json'),
 trades:path.join(DATA,'v552-paper-trades.ndjson'),
 decisions:path.join(DATA,'v552-paper-decisions.ndjson')};
function read(p){return fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null}
function write(p,x){const f=p+'.tmp-'+process.pid;
 fs.writeFileSync(f,JSON.stringify(x));fs.renameSync(f,p);}
function append(p,x){appendRotatingNdjson(p,x,{maxBytes:4*1024*1024,maxSegments:12})}
function summary(s){
 const latest=s.latestAnalysis||{};
 return {version:paper.VERSION,policyVersion:policy.VERSION,
  asOf:s.lastObservationAt,startedAt:s.startedAt,
  mode:'PAPER_ONLY',brokerOrdersEnabled:false,
  engine:'V552',source:'V552_DIRECT_MCB_BATON_AND_OKX_PUBLIC_PRICE',
  completed:s.completed,wins:s.wins,losses:s.losses,
  realizedUsd:s.realizedUsd,equityUsd:s.equityUsd,feesUsd:s.feesUsd,
  position:s.position?{
   direction:s.position.direction,entryAt:s.position.entryAt,
   entryPrice:s.position.entryPrice,lastPrice:s.position.lastPrice,
   lastNetPnlUsd:s.position.lastNetPnlUsd,
   mfePriceUsd:s.position.mfePriceUsd,maePriceUsd:s.position.maePriceUsd,
   episodeId:s.position.episodeId,campaignId:s.position.campaignId,
   referenceRisk:'HARD_CAP_500_BTC_PRICE_NOT_A_CERTAIN_STRUCTURE_LEVEL'}:null,
  latestDecision:s.decision,decision:s.decision,lastAction:s.lastAction,
  campaign:s.memory.campaign,episode:s.memory.episode,
  vigilance:s.latestAnalysis?.vigilance||null,
  market:s.latestAnalysis?.market||null,
  policyRevision:s.policyRevision||null,
  causalTrace:s.memory.trace.slice(-25),
  latestReadings:latest.readings?{
   mcb3:latest.readings.mcb3,mcb15:latest.readings.mcb15,
   mf:latest.readings.mf,pm:latest.readings.pm,
   place:latest.readings.place,liquidity:latest.readings.liquidity}:null,
  latestQualification:latest.qualification||null,
  tradeHead:s.history.slice(-10).map(t=>({
   tradeNo:t.tradeNo,direction:t.direction,entryAt:t.entryAt,
   exitAt:t.exitAt,entryPrice:t.entryPrice,exitPrice:t.exitPrice,
   netPnlUsd:t.netPnlUsd,exitReason:t.exitReason})),
  ledgerContract:'V551_TO_V552_EXPLICIT_CONTINUOUS_ACCOUNT',
  policyStartedAt:s.policyStartedAt,
  migration:s.migratedFrom,
  pre552Completed:s.pre552Completed,newPolicyClosed:s.newPolicyClosed,
  newPolicyNetUsd:s.newPolicyNetUsd,
  executionContract:'PAPER_ONLY_NO_BROKER_NO_REAL_ORDER',
  assumptions:'No exact slippage/funding. Trade fills at observed OKX public tick.',
  riskContract:'500_BTC_PRICE_USD_HARD_ADVERSE_LIMIT_NOT_STOP_GUARANTEE',
  sourceMaturity:'MCB3_EVENT_FIRST_MCB15_WAVE_JUDGE_NO_18_25_TIMERS'};
}
function fallback(ts,price,why){
 return {version:policy.VERSION,mode:'PAPER_ONLY',brokerOrdersEnabled:false,
  asOf:ts,price,quality:'DATA_DEGRADED',
  action:'WAIT',reason:why,candidate:null,campaignId:null};
}
function dryRead(){
 const now=Date.now(),input=source.load(now),price=input.current?.lastPrice;
 if(!Number.isFinite(price))throw Error('V552_SOURCE_MISSING');
 const s=paper.initial(now-1000);
 const r=policy.evaluate(s.memory,input,price,now,null);
 console.log(JSON.stringify({mode:'READ_ONLY_TEST',engine:'V552',
  noWrites:true,sourceStatus:input.healthy,decision:r.decision,
  account:summary(s),brokerOrdersEnabled:false},null,2));
}
function main(){
 if(process.argv.includes('--test-read'))return dryRead();
 let s=read(FILES.state);if(s)paper.verify(s);
 else {
  const archive='/root/boonolab-archives';
  if(!fs.existsSync(archive)||!fs.readdirSync(archive)
    .some(x=>x.startsWith('V55_RETIRED_')))
   throw Error('V552_REFUSE_START_BEFORE_V55_ARCHIVE');
  throw Error('V552_HANDOFF_REQUIRED_RUN_EXPLICIT_MIGRATION_FIRST');
 }
 console.log('[V552 PAPER] '+JSON.stringify({version:policy.VERSION,
  ledger:paper.VERSION,startedAt:s.startedAt,completed:s.completed,
  position:s.position?.direction||'FLAT',
  brokerOrdersEnabled:false,mode:'PAPER_ONLY',
  priorV551:'RETIRED_SNAPSHOT_MIGRATED_ONCE'}));
 let busy=false,priorKey=null,lastSave=0,errors=0;
 function tick(){
  if(busy)return;busy=true;
  try{
   const ts=Number(stream.lastUpdateTs),price=Number(stream.lastPrice),
    received=Date.now();
   if(!Number.isFinite(ts)||!Number.isFinite(price)||price<=0||
    ts<=s.lastObservationAt)return;
   const tickAgeMs=received-ts;
   if(tickAgeMs<0)return;
   let d,sourceAgeMs=Infinity;
   try{
    const input=source.load(ts);
    sourceAgeMs=ts-Number(input.current?.ts||0);
    const result=policy.evaluate(s.memory,input,price,ts,s.position);
    d=result.decision;
   }catch(e){
    if(++errors<=4||errors%30===0)
     console.error('[V552 READONLY SOURCE ERROR] '+(e.stack||e));
    d=fallback(ts,price,'V552_FRESH_SOURCE_UNAVAILABLE');
   }
   const out=paper.step(s,d,{ts,price,tickAgeMs,sourceAgeMs});
   s=out.state;s.latestAnalysis=d;
   const currentKey=[d.action,d.reason,d.candidate,
    d.campaignId,d.campaignPhase,s.position?.direction,
    d.episode?.id].join('|');
   if(out.event||currentKey!==priorKey){
    append(FILES.decisions,{ts,price,decision:d.action,reason:d.reason,
     campaignId:d.campaignId,episodeId:d.episode?.id,
     qualification:d.qualification,causalTrace:d.recentEvents,
     marketQuality:d.market?{
      kind:d.market.kind,reason:d.market.reason,
      priorPolarityRetained:d.market.priorPolarityRetained,
      postCrossReclaim:d.market.postCrossReclaim,
      currentCrossPriceDefended:d.market.entryConfirmedSinceCross,
      deferNewEntry:d.market.deferNewEntry,
      mfAligned:d.market.mfAligned,
      lastCross15At:d.market.lastConfirmedCross?.at||null}:null,
     vigilance:d.vigilance?{
      phase:d.vigilance.phase,evidence:d.vigilance.evidence,
      watchAt:d.vigilance.watch?.at||null,
      firstLiveAt:d.vigilance.watch?.firstLiveAt||null,
      counterConvinces:d.vigilance.counterConvinces}:null,
     market:d.readings?{
      mcb3:d.readings.mcb3,mcb15:d.readings.mcb15,
      mf:d.readings.mf,pm:d.readings.pm,
      liquidity:d.readings.liquidity,place:d.readings.place}:null,
     event:out.event||null,paperResult:out.reason,
     version:policy.VERSION,brokerOrdersEnabled:false});
    priorKey=currentKey;
   }
   if(out.trade)append(FILES.trades,out.trade);
   if(out.event||received-lastSave>=30000){
    write(FILES.state,s);write(FILES.summary,summary(s));lastSave=received;
   }
   if(out.event)console.log('[V552 PAPER EVENT] '+JSON.stringify(out.event));
   errors=0;
  }catch(e){if(++errors<=5||errors%30===0)
   console.error('[V552 ERROR] '+(e.stack||e))}
  finally{busy=false}
 }
 stream.on('error',e=>console.error('[V552 PRICE FEED] '+e.message));
 stream.start();tick();setInterval(tick,5000);
}
if(require.main===module)main();
module.exports={FILES,summary,fallback,dryRead};
