'use strict';
// BOONO V5.5: second INDEPENDENT PAPER engine replacing retired V494.
// Reads the same market as V543. No funded exchange/broker imports or writes.
const fs=require('node:fs'),path=require('node:path');
const stream=require('../price-stream');
const {latest}=require('./runner-v543'); // read-only data loader, no main()
const reference=require('./decision-v543'); // evidence extractor ONLY
const decision=require('./decision-v55'),paper=require('./paper-v55');
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const STATE=path.join(DATA,'v55-paper-state.json');
const TRADES=path.join(DATA,'v55-paper-trades.ndjson');
const CHANGES=path.join(DATA,'v55-paper-decisions.ndjson');
const REGIME=path.join(DATA,'boonolab-market-observer-summary.json');
const LEVELS=path.join(DATA,'levels.json');
const json=(f,alt=null)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}
 catch(e){if(e.code==='ENOENT')return alt;throw e;}};
const atomic=(f,v)=>{const tmp=f+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(v));fs.renameSync(tmp,f);};
const append=(f,v)=>appendRotatingNdjson(f,v,
 {maxBytes:4*1024*1024,maxSegments:12});
function independentlyEvaluate(x,{now,price,s,sourceAgeMs,tickAgeMs}){
 const base=reference.evaluate({...x,now,price,position:null,
  startedAt:s.startedAt,sourceAgeMs,tickAgeMs,
  previousAttention:null,previousOffensiveMaturity:null,
  lastExitAt:null,v493AdmissionAsOf:null});
 const obs=json(REGIME,{});
 const market=obs?.regime||null;
 const mtime=fs.existsSync(LEVELS)?Math.round(fs.statSync(LEVELS).mtimeMs):null;
 const result=decision.evaluate({input:x,base,now,price,
  position:s.position,lastExit:s.lastExit,startedAt:s.startedAt,
  usedKeys:s.usedKeys,regime:market,levelsMtime:mtime});
 return {...result,quality:x.health&&sourceAgeMs>=0&&sourceAgeMs<=65000?
    result.quality:'DATA_DEGRADED'};
}
function safeFallback(s,now,price,reason){
 return {version:decision.VERSION,asOf:now,price,action:'WAIT',
  candidate:s.position?.direction||null,reason,phase:'DATA_DEGRADED',
  quality:'DATA_DEGRADED',brokerOrdersEnabled:false,
  invalidation:null,entryKey:null,readings:{},checks:{}};
}
function report(x,s){
 const campaigns=new Map();
 for(const t of s.history||[]){
  const id=t.entryContext?.structureParentId||'UNKNOWN_PARENT';
  const a=campaigns.get(id)||{campaignId:id,trades:0,wins:0,netUsd:0,feesUsd:0};
  a.trades++;if(t.netPnlUsd>0)a.wins++;
  a.netUsd=Math.round((a.netUsd+Number(t.netPnlUsd||0))*10000)/10000;
  a.feesUsd=Math.round((a.feesUsd+Number(t.feesUsd||0))*10000)/10000;
  campaigns.set(id,a);
 }
 return {version:paper.VERSION,policyVersion:decision.VERSION,mode:'PAPER_ONLY',
  brokerOrdersEnabled:false,retiredPredecessor:'V494',
  asOf:s.lastObservationAt,startedAt:s.startedAt,completed:s.completed,
  wins:s.wins,losses:s.losses,realizedUsd:s.realizedUsd,
  feesUsd:s.feesUsd,equityUsd:s.equityUsd,
  campaignCount:campaigns.size,recentCampaigns:[...campaigns.values()].slice(-8),
  position:s.position?{direction:s.position.direction,entryAt:s.position.entryAt,
   entryPrice:s.position.entryPrice,lastPrice:s.position.lastPrice,
   campaignId:s.position.campaignId,entryKey:s.position.entryKey,
   mfePriceUsd:s.position.mfePriceUsd,maePriceUsd:s.position.maePriceUsd,
   lastNetPnlUsd:s.position.lastNetPnlUsd,
   invalidationPrice:s.position.invalidationPrice}:null,
  latestDecision:s.decision,lastAction:s.lastAction,
  tradeHead:s.history.slice(-8).map(t=>({tradeNo:t.tradeNo,direction:t.direction,
    entryAt:t.entryAt,exitAt:t.exitAt,netPnlUsd:t.netPnlUsd,
    exitReason:t.exitReason,phase:t.entryContext?.phase||null})),
  notes:['V55 independent PAPER successor of retired V494; fresh 1000 USD simulated capital',
   'V543 original policy and ledger not modified',
   'No funded orders, no slippage or funding, observation tick fills',
   'Regime and LBW15 thresholds exploratory, no out-of-sample economic proof']};
}
function main(){
 const flags=new Set(process.argv.slice(2));
 if(flags.has('--test-read')){
  const x=latest(),now=x.last?.ts,price=x.last?.lastPrice;
  if(!now||!price)throw Error('V55_TEST_NO_MARKET');
  const s=paper.initial(now-6*3600000);
  const d=independentlyEvaluate(x,{now,price,s,sourceAgeMs:0,tickAgeMs:0});
  console.log(JSON.stringify({test:'READ_ONLY',engine:paper.VERSION,
   referenceNotAuthoritative:true,decision:d,brokerOrdersEnabled:false},null,2));
  return;
 }
 const existing=json(STATE,null);
 if(existing&&existing.version!==paper.VERSION)
  throw Error('V55_REFUSE_MIGRATE_ANY_OTHER_ENGINE_LEDGER');
 let s=paper.migrate(existing);
 if(!s)s=paper.initial(Date.now());
 if(s.retiredPredecessor!=='V494_PAPER_STOPPED_AND_ARCHIVED_20261116'||
    s.brokerOrdersEnabled!==false||s.policyVersion!==decision.VERSION)
  throw Error('V55_NO_BROKER_AND_NO_INHERITED_POSITION_CONTRACT');
 atomic(STATE,s);
 let busy=false,lastSave=0,priorKey=null,errors=0;
 function tick(){
  if(busy)return;busy=true;
  try{
   const ts=Number(stream.lastUpdateTs),price=Number(stream.lastPrice);
   if(!Number.isFinite(ts)||!Number.isFinite(price)||price<=0||
     ts<=s.lastObservationAt)return;
   const x=latest(),now=Date.now(),tickAgeMs=now-ts,
    sourceAgeMs=ts-Number(x.last?.ts||0);
   if(!x.last||sourceAgeMs<0||sourceAgeMs>95000||tickAgeMs<0)return;
   let d;
   try{d=independentlyEvaluate(x,{now:ts,price,s,sourceAgeMs,tickAgeMs});}
   catch(e){
    console.error('[V55 EVIDENCE FAIL] '+(e.stack||e));
    d=safeFallback(s,ts,price,'V55_READONLY_EVIDENCE_FAILURE');
   }
   if(!x.health&&d.action?.startsWith('ENTER_')){
    d={...d,quality:'DATA_DEGRADED',action:'WAIT',
      reason:'V55_MCB_COLLECTOR_STALE_NO_ENTRY'};
   }
   const r=paper.step(s,d,{ts,price,tickAgeMs,sourceAgeMs});
   s=r.state;s.latestAnalysis=d;
   const key=[d.action,d.reason,d.candidate,d.phase,
    s.position?.direction||'FLAT',
    d.readings?.structural55?.context?.market?.label||'UNKNOWN',
    d.readings?.structural55?.context?.e1?.direction||'UNKNOWN',
    d.readings?.structural55?.context?.e4?.direction||'UNKNOWN',
    d.readings?.structural55?.context?.delta15??'UNKNOWN'].join('|');
   if(r.event||key!==priorKey){
    append(CHANGES,{ts,price,policy:decision.VERSION,action:d.action,
     reason:d.reason,phase:d.phase,candidate:d.candidate,
     paperOutcome:r.reason,event:r.event||null,
     attention:d.readings?.structural55||{},
     checks:d.checks,quality:d.quality,
     brokerOrdersEnabled:false});
    priorKey=key;
   }
   if(r.trade)append(TRADES,r.trade);
   if(r.event||now-lastSave>=30000){
    atomic(STATE,s);
    atomic(path.join(DATA,'v55-paper-summary.json'),report(x,s));
    lastSave=now;
   }
   if(r.event)console.log('[V55 PAPER] '+JSON.stringify(r.event));
   errors=0;
  }catch(e){
   if(++errors<=6||errors%20===0)
    console.error('[V55 PAPER ERROR] '+(e.stack||e));
  }finally{busy=false;}
 }
 stream.on('error',e=>console.error('[V55 PRICE STREAM] '+e.message));
 stream.start();
 console.log('[V55 PAPER] '+JSON.stringify({policy:decision.VERSION,
  ledger:paper.VERSION,startedAt:s.startedAt,completed:s.completed,
  position:s.position?.direction||'FLAT',
  mode:'PAPER_ONLY',brokerOrdersEnabled:false,
  predecessor:'V494_RETIRED_NO_LEDGER_TRANSFER'}));
 tick();setInterval(tick,5000);
}
if(require.main===module)main();
module.exports={independentlyEvaluate,report};
