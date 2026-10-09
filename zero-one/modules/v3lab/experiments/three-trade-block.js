'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const DATA=path.join(__dirname,'../../../data');
const STATE_PATH=process.env.V3LAB_EXPERIMENT_BLOCK_PATH||path.join(DATA,'v3lab-experiment-block.json');
const REVIEW_HISTORY_PATH=process.env.V3LAB_EXPERIMENT_REVIEW_HISTORY_PATH||path.join(DATA,'v3lab-experiment-review-history.ndjson');
const CONFIG_ID='V3EXP-20260930-P90ALERT-R1.2';
const BLOCK_SIZE=3;

function readJson(p,f){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(_){return f;}}
function atomicWrite(p,v){
  const tmp=p+'.tmp-'+process.pid;
  fs.writeFileSync(tmp,JSON.stringify(v,null,2));
  fs.renameSync(tmp,p);
}
function configDefinition(){
  return {
    configId:CONFIG_ID,
    purpose:'paper-trading R1.2: E15 major-lobe semantics + P90 adverse attack alert instead of autonomous exit',
    where:{
      entryVeto:false,
      role:'localisation_memory_rr_analysis_only',
      dataPreserved:true
    },
    decisionChanges:{
      completedE15LegExit:{
        before:'EXIT_STRUCTURE when last completed E15→E15 leg is opposite position',
        after:'counterfactual only; completed leg cannot autonomously exit position',
        changed:true
      },
      majorE15Recognition:{
        before:'local pointed LBW extrema with adjacent-bar amplitude >=2',
        after:'absolute LBW extreme of completed zero-bounded 15m lobe; local extrema retained separately',
        changed:true,
        activeThesis:'latest confirmed major E15 pivot + >=50 USD price translation; completed major leg span >=80 LBW'
      },
      p90AttackExit:{
        before:'opposite persistent dominance + wave counter-excursion > 12h zigzag P90 => EXIT_EXECUTION',
        after:'same condition => OPPOSITE_ATTACK_P90 alert only; exit still requires risk/protection or transfer-aware giveback',
        changed:true
      }
    },
    exitPolicies:{p90:'ALERT_ONLY'},
    thresholds:{
      dominancePersistence:{
        before:{persistCountMin:3,proofMin:.62,terrainConservationRequired:true},
        after:{persistCountMin:2,proofMin:.62,terrainConservationRequired:true},
        changedFamily:'dominance_persistence'
      },
      rrMin:{before:1.0,after:1.0,changed:false},
      protectionP50Fraction:{before:.25,after:.25,changed:false},
      phaseOverrunRatio:{before:2.5,after:2.5,changed:false},
      minRetainedFraction:{before:.50,after:.50,changed:false},
      reassertTurningMaxMinutes:{before:6,after:6,changed:false}
    }
  };
}
function defaultState(startedAt=null,baselineHistoryLength=null,baselineLastExit=null){
  return {
    schemaVersion:'v3lab-three-trade-block-v1',
    activeConfig:configDefinition(),
    blockNumber:1,
    blockSize:BLOCK_SIZE,
    startedAt,
    baselineHistoryLength,
    baselineLastExit,
    closedTradesInBlock:0,
    trades:[],
    reviewDue:false,
    reviewDueAt:null,
    reviewedAt:null,
    overflowTrades:[],
    rule:'review every 3 closed V3 trades; at most one threshold family change before next block'
  };
}
function initialize(meta={}){
  const existing=readJson(STATE_PATH,null);
  if(existing&&existing.activeConfig&&existing.activeConfig.configId===CONFIG_ID)return existing;
  const s=defaultState(meta.startedAt||new Date().toISOString(),meta.baselineHistoryLength??null,meta.baselineLastExit??null);
  atomicWrite(STATE_PATH,s);return s;
}
function tradeSummary(rec){
  return {
    entryTimestamp:rec.entryTimestamp,exitTimestamp:rec.exitTimestamp,
    direction:rec.direction,entryMode:rec.entryMode||null,
    entryPrice:rec.entryPrice,exitPrice:rec.exitPrice,
    pnlPercentLeveraged:rec.pnlPercentLeveraged,
    mfeUsd:rec.mfeUsd,maeUsd:rec.maeUsd,
    exitKind:rec.exitKind,exitReason:rec.exitReason,
    configId:rec.experimentConfigId||CONFIG_ID,p90Policy:rec.p90Policy||null
  };
}
function onTradeClosed(rec){
  let s=readJson(STATE_PATH,null);
  const recConfig=rec.experimentConfigId||CONFIG_ID;
  if(recConfig!==CONFIG_ID){
    const foreign={schemaVersion:'v3lab-foreign-config-trade-v1',kind:'FOREIGN_CONFIG_TRADE_AFTER_ROLLOVER',
      recordedAt:new Date().toISOString(),activeConfigId:CONFIG_ID,trade:tradeSummary(rec)};
    fs.appendFileSync(REVIEW_HISTORY_PATH,JSON.stringify(foreign)+'\n');
    return s||initialize();
  }
  if(!s||!s.activeConfig||s.activeConfig.configId!==CONFIG_ID)s=initialize();
  const t=tradeSummary(rec);
  if(s.reviewDue){
    s.overflowTrades=Array.isArray(s.overflowTrades)?s.overflowTrades:[];
    s.overflowTrades.push(t);
  }else{
    s.trades=Array.isArray(s.trades)?s.trades:[];
    s.trades.push(t);
    s.closedTradesInBlock=Number(s.closedTradesInBlock||0)+1;
    if(s.closedTradesInBlock>=BLOCK_SIZE){
      s.reviewDue=true;
      s.reviewDueAt=new Date().toISOString();
    }
  }
  s.updatedAt=new Date().toISOString();
  atomicWrite(STATE_PATH,s);
  return s;
}
function fingerprint(){
  return crypto.createHash('sha256').update(JSON.stringify(configDefinition())).digest('hex');
}
function completeReview(review={}){
  const old=readJson(STATE_PATH,null);
  if(!old)throw new Error('experiment block state missing');
  const overflow=Array.isArray(old.overflowTrades)?old.overflowTrades.slice():[];
  const archived={...old,reviewedAt:new Date().toISOString(),review};
  fs.appendFileSync(REVIEW_HISTORY_PATH,JSON.stringify(archived)+'\n');
  const history=readJson(path.join(DATA,'trade-sim-v3lab-history.json'),[]);
  const next=defaultState(new Date().toISOString(),Array.isArray(history)?history.length:null,
    Array.isArray(history)&&history.length?history[history.length-1].exitTimestamp:null);
  next.blockNumber=Number(old.blockNumber||0)+1;
  next.previousBlock={blockNumber:old.blockNumber,configId:old.activeConfig&&old.activeConfig.configId,reviewedAt:archived.reviewedAt};
  atomicWrite(STATE_PATH,next);
  for(const trade of overflow)onTradeClosed(trade);
  return readJson(STATE_PATH,next);
}
module.exports={STATE_PATH,REVIEW_HISTORY_PATH,CONFIG_ID,BLOCK_SIZE,configDefinition,initialize,onTradeClosed,completeReview,fingerprint};
