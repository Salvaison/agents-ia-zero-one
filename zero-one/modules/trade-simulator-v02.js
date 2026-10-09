/**
 * trade-simulator-v02.js — BOONO Constitution v0.2, 16/09/2026.
 * Simulation uniquement. Aucun ordre reel.
 * Noyau commun: WHERE -> STATE -> DOMINANCE -> RISK -> ACTION.
 */
'use strict';
const fs=require('fs');
const path=require('path');
const {BoonoCoreV02}=require('./v2/core/engine');
const location=require('./v2/layers/location');
const marketState=require('./v2/layers/state');
const dominance=require('./v2/layers/dominance');
const risk=require('./v2/layers/risk');
const decision=require('./v2/layers/decision');
const shadowExperiment=require('./v2/experiments/structural-shadow');
const {scoreDivergence:computeLegacyDivergence}=require('./divergence');
const {buildRuntimeSnapshot}=require('./v2/adapters/runtime-snapshot');
const priceStream=require('./price-stream');

const DATA=path.join(__dirname,'../data');
const STATE_PATH=path.join(DATA,'trade-sim-v2-state.json');
const HISTORY_PATH=path.join(DATA,'trade-sim-v2-history.json');
const DECISIONS_PATH=path.join(DATA,'trade-sim-v2-decisions.json');
const EVALUATIONS_PATH=path.join(DATA,'trade-sim-v02-evaluations.ndjson');
const SHADOW_PATH=path.join(DATA,'trade-sim-v02-shadow.ndjson');
const VERSION='constitution-v0.2a';
const HISTORY_MAX=3000, DECISION_MAX=8000;
const core=new BoonoCoreV02({location,state:marketState,dominance,risk,decision});
const nowIso=()=>new Date().toISOString();
// Excursions tick-par-tick en memoire: le simulateur evalue toutes les 30s,
// mais MFE/MAE doivent voir les extremes reels du flux OKX entre deux cycles.
const liveTracks=new Map();
function ensureLiveTrack(module,pos){
  if(!pos)return null;
  let t=liveTracks.get(module);
  if(!t||t.entryTimestamp!==pos.entryTimestamp){
    t={entryTimestamp:pos.entryTimestamp,entryPrice:pos.entryPrice,direction:pos.direction,
      mfeUsd:Number(pos.metrics&&pos.metrics.mfeUsd)||0,maeUsd:Number(pos.metrics&&pos.metrics.maeUsd)||0,
      mfeAt:pos.metrics&&pos.metrics.mfeAt||null,maeAt:pos.metrics&&pos.metrics.maeAt||null,lastPrice:pos.lastPrice||pos.entryPrice};
    liveTracks.set(module,t);
  }
  return t;
}
priceStream.on('price',tick=>{
  const px=Number(tick&&tick.price), ts=Number(tick&&tick.ts)||Date.now();
  if(!Number.isFinite(px))return;
  for(const t of liveTracks.values()){
    const signed=t.direction==='long'?px-t.entryPrice:t.entryPrice-px;
    if(signed>t.mfeUsd){t.mfeUsd=signed;t.mfeAt=new Date(ts).toISOString();}
    if(-signed>t.maeUsd){t.maeUsd=-signed;t.maeAt=new Date(ts).toISOString();}
    t.lastPrice=px;
  }
});

function legacyDivergenceShadow(){
  try{
    const raw=computeLegacyDivergence(['3m','15m','1h','4h']);
    return {score:raw.score,sens:raw.sens,tfCount:raw.tfCount,multidiv:raw.multidiv,
      byTf:(raw.detail||[]).map(r=>({timeframe:r.timeframe,activeChain:r.activeChain||null,
        latestClosed:r.chains&&r.chains.length?r.chains[r.chains.length-1]:null}))};
  }catch(e){return {error:e.message,score:null,sens:null,tfCount:null,multidiv:null,byTf:[]};}
}
function compactShadow(sh){
  if(!sh)return null;
  const d=sh.divergence||{}, st=d.structural||{}, lg=d.legacy||{}, rr=sh.rr||{};
  return {version:sh.version,decisionImpact:false,
    divergence:{counts:st.counts||null,legacy:{score:lg.score,sens:lg.sens,tfCount:lg.tfCount,multidiv:lg.multidiv}},
    rr:{direction:sh.direction,riskMicro3mUsd:rr.riskMicro3mUsd,rewardWhereUsd:rr.rewardWhereUsd,
      structural15m:rr.structural15m,structural1h:rr.structural1h,nearestFib15m:rr.nearestFib15m,
      nearestFib1h:rr.nearestFib1h,comparisons:rr.comparisons}};
}
function recordShadow(module,result,pos){
  if(!result.shadow)return;
  const rec={ts:nowIso(),module,version:VERSION,price:result.price,marketTimestamp:result.marketTimestamp,
    action:result.action&&result.action.type,position:pos?{direction:pos.direction,entryPrice:pos.entryPrice}:null,
    shadow:result.shadow};
  fs.appendFileSync(SHADOW_PATH,JSON.stringify(rec)+'\n');
}
function readJson(p,fallback=null){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(_){return fallback;}}
function writeJson(p,v){fs.writeFileSync(p,JSON.stringify(v,null,2));}
function appendCapped(p,rec,max){const a=readJson(p,[]);const arr=Array.isArray(a)?a:[];arr.push(rec);while(arr.length>max)arr.shift();writeJson(p,arr);}
function defaultState(legacy=null){return {version:VERSION,modules:{scalp:null,day:null,swing:null},wave:null,lastEvaluation:null,lastDecisionTsByModule:{},
  migratedFrom:legacy&&legacy.version||null,legacyUnknownFingerprints:legacy&&legacy.unknownFingerprints||{}};}
function loadState(){const s=readJson(STATE_PATH,null);if(!s||s.version!==VERSION)return defaultState(s);s.modules=s.modules||{scalp:null,day:null,swing:null};s.lastDecisionTsByModule=s.lastDecisionTsByModule||{};return s;}
function saveState(s){writeJson(STATE_PATH,s);}
function pnlPct(pos,price){const raw=(price-pos.entryPrice)/pos.entryPrice*100;return pos.direction==='long'?raw:-raw;}
function updateMetrics(pos,price,ts,module=null){
  pos.metrics=pos.metrics||{mfeUsd:0,maeUsd:0,mfeAt:null,maeAt:null,godYieldSeen:false};
  const track=module?ensureLiveTrack(module,pos):null;
  if(track){
    pos.metrics.mfeUsd=Math.max(pos.metrics.mfeUsd||0,track.mfeUsd||0);
    pos.metrics.maeUsd=Math.max(pos.metrics.maeUsd||0,track.maeUsd||0);
    if(track.mfeAt)pos.metrics.mfeAt=track.mfeAt;
    if(track.maeAt)pos.metrics.maeAt=track.maeAt;
  }
  const signed=pos.direction==='long'?price-pos.entryPrice:pos.entryPrice-price;
  pos.metrics.favorableUsd=signed;
  pos.metrics.adverseUsd=Math.max(0,-signed);
  if(signed>pos.metrics.mfeUsd){pos.metrics.mfeUsd=signed;pos.metrics.mfeAt=new Date(ts).toISOString();}
  if(-signed>pos.metrics.maeUsd){pos.metrics.maeUsd=-signed;pos.metrics.maeAt=new Date(ts).toISOString();}
  pos.lastPrice=price;pos.pnlPercentPrice=pnlPct(pos,price);
  return pos.metrics;
}
function compactContext(result){
  return {where:result.where,state:result.state,dominance:result.dominance,risk:result.risk,action:result.action,
    shadow:compactShadow(result.shadow),marketTimestamp:result.marketTimestamp,price:result.price,version:result.version};
}
function recordEvaluation(module,result,pos){
  const w=result.where||{}, st=result.state||{}, dom=result.dominance||{}, r=result.risk||{}, a=result.action||{};
  const ps=st.priceStructure3m||{}, lobe=st.lobe||{}, m=pos&&pos.metrics||{};
  const rec={ts:nowIso(),version:VERSION,module,marketTimestamp:result.marketTimestamp,price:result.price,
    where:{status:w.status,confidence:w.confidence,nextLgiAbove:w.nextLgiAbove,nextLgiBelow:w.nextLgiBelow,nearestLevel:w.nearestLevel},
    state:{phase:st.phase,phaseConfidence:st.phaseConfidence,lobeDirection:lobe.direction,lbw:lobe.lbw,
      structure3m:ps.state,structureDirection:ps.direction,cycle:st.cycle},
    dominance:{state:dom.state,direction:dom.direction,proofScore:dom.proofScore,asymmetry:dom.asymmetry,
      retainedFraction:dom.retainedFraction,shock:dom.shock,current:dom.current},
    risk:{tradeable:r.tradeable,rrEstimate:r.rrEstimate,rewardUsd:r.rewardUsd,riskUsd:r.riskUsd,
      locationMode:r.locationMode,reason:r.reason},action:{type:a.type,direction:a.direction,reason:a.reason,events:a.events||[]},
    shadow:compactShadow(result.shadow),
    position:pos?{direction:pos.direction,entryPrice:pos.entryPrice,mfeUsd:m.mfeUsd||0,maeUsd:m.maeUsd||0,
      favorableUsd:m.favorableUsd||0,godYieldSeen:!!m.godYieldSeen}:null};
  fs.appendFileSync(EVALUATIONS_PATH,JSON.stringify(rec)+'\n');
}
function recordDecision(state,module,result){
  const a=result.action||{};
  const fp=[a.type,a.direction,result.state&&result.state.phase,result.dominance&&result.dominance.state,
    result.where&&result.where.status,result.risk&&result.risk.tradeable].join('|');
  const last=state.lastDecisionTsByModule[module]||{}, now=Date.now();
  if(last.fp===fp&&now-(last.ts||0)<300000&&['NO_TRADE','WATCH','HOLD'].includes(a.type))return;
  state.lastDecisionTsByModule[module]={fp,ts:now};
  appendCapped(DECISIONS_PATH,{ts:nowIso(),version:VERSION,module,price:result.price,action:a.type,
    reason:a.reason,fingerprint:fp,context:compactContext(result)},DECISION_MAX);
}
function recordExit(module,pos,price,result){
  const pnl=pnlPct(pos,price), m=pos.metrics||{};
  const signed=pos.direction==='long'?price-pos.entryPrice:pos.entryPrice-price;
  const capture=m.mfeUsd>0?signed/m.mfeUsd*100:null;
  appendCapped(HISTORY_PATH,{version:VERSION,module,direction:pos.direction,archetype:pos.archetype,
    entryPrice:pos.entryPrice,entryTimestamp:pos.entryTimestamp,exitPrice:price,exitTimestamp:nowIso(),
    exitKind:result.action.type,exitReason:result.action.reason,pnlPercentPrice:pnl,
    pnlPercentLeveraged:pnl*Number(pos.leverage||10),mfeUsd:m.mfeUsd||0,maeUsd:m.maeUsd||0,
    mfeAt:m.mfeAt||null,maeAt:m.maeAt||null,mfeCapturedPct:capture,godYieldSeen:!!m.godYieldSeen,
    godYieldAt:m.godYieldAt||null,entryContext:pos.context,exitContext:compactContext(result)},HISTORY_MAX);
}
function violentRiskOverride(pos,snapshot,config,result){
  if(!pos)return result;
  const vm=(((config||{}).tradeSimulator||{}).violentMove)||{};
  if(vm.enabled===false)return result;
  const rows=snapshot.sources.auditRows||[], last=rows[rows.length-1]||{};
  const pm=Number(last.priceMove), threshold=vm.thresholdPct!==undefined?Number(vm.thresholdPct):0.15;
  if(!Number.isFinite(pm)||!Number.isFinite(threshold))return result;
  const adverse=pos.direction==='long'?-pm:pm;
  if(adverse>0&&adverse/pos.entryPrice*100>=threshold){
    result.action={type:'EXIT_RISK',direction:pos.direction,reason:`violent adverse move ${adverse.toFixed(1)} USD`,events:[]};
  }
  return result;
}

function simulateModule(module,primaryVol,divRaw,config,volByTf){
  const active=(((config||{}).tradeSimulator||{}).activeModules)||['day'];
  if(!active.includes(module))return null;
  const state=loadState();
  let snapshot;
  try{snapshot=buildRuntimeSnapshot(primaryVol);}catch(_){return null;}
  snapshot.simulatorConfig=(config||{}).tradeSimulator||{};
  const price=snapshot.market.price, pos=state.modules[module];
  if(pos)updateMetrics(pos,price,snapshot.market.timestamp,module);

  let result=core.evaluate(snapshot,{position:pos||null,lastEvaluation:state.lastEvaluation||null});
  result=violentRiskOverride(pos,snapshot,config,result);
  const legacyShadow=legacyDivergenceShadow();
  result.shadow=shadowExperiment.evaluate(snapshot,result,legacyShadow,config);
  // Shadow descriptif ajoute APRES core/risk/decision: il ne peut modifier aucune decision V0.2a.
  result.state.divergenceShadow={version:result.shadow.version,decisionImpact:false,
    structuralCounts:result.shadow.divergence.structural.counts,legacy:{score:legacyShadow.score,sens:legacyShadow.sens,tfCount:legacyShadow.tfCount,multidiv:legacyShadow.multidiv}};
  result.risk.shadow=compactShadow(result.shadow).rr;
  state.lastEvaluation=compactContext(result);
  recordEvaluation(module,result,pos);
  recordShadow(module,result,pos);
  state.wave={direction:result.state.lobe&&result.state.lobe.direction,currentLbw:result.state.lobe&&result.state.lobe.lbw,
    phase:result.state.phase,cycle:result.state.cycle,priceStructure3m:result.state.priceStructure3m};

  if(pos){
    const events=(result.action&&result.action.events)||[];
    if(events.includes('GOD_YIELD')){
      pos.metrics.godYieldSeen=true; pos.metrics.godYieldAt=pos.metrics.godYieldAt||nowIso();
      pos.metrics.godYieldPeakMfeUsd=Math.max(pos.metrics.godYieldPeakMfeUsd||0,pos.metrics.mfeUsd||0);
    }
    if(String(result.action.type).startsWith('EXIT_')){
      recordExit(module,pos,price,result); recordDecision(state,module,result);
      state.modules[module]=null; liveTracks.delete(module); saveState(state);
      return `[TRADE-SIM V0.2] ${module.toUpperCase()} ${result.action.type} ${pos.direction} @ ${price} -- ${result.action.reason}`;
    }
    pos.lastContext=compactContext(result); pos.lastEvaluationAt=nowIso();
    recordDecision(state,module,result); saveState(state); return null;
  }

  if(result.action.type==='ENTER_LONG'||result.action.type==='ENTER_SHORT'){
    const direction=result.action.type==='ENTER_LONG'?'long':'short';
    const archetype=result.risk&&result.risk.statePermission&&result.risk.statePermission.reversal?'REVERSAL_RECONSTRUCTION':'CONTINUATION';
    state.modules[module]={version:VERSION,direction,archetype,entryPrice:price,entryTimestamp:nowIso(),leverage:10,
      metrics:{mfeUsd:0,maeUsd:0,mfeAt:null,maeAt:null,favorableUsd:0,adverseUsd:0,godYieldSeen:false},
      context:compactContext(result),lastContext:compactContext(result),lastPrice:price,pnlPercentPrice:0};
    ensureLiveTrack(module,state.modules[module]);
    recordDecision(state,module,result); saveState(state);
    return `[TRADE-SIM V0.2] ${module.toUpperCase()} ENTER_${direction.toUpperCase()} @ ${price} -- ${archetype}`;
  }

  recordDecision(state,module,result); saveState(state); return null;
}

function computeLiquidationPrice(entryPrice,direction,leverage){if(!entryPrice||!leverage)return null;const d=entryPrice/leverage;return direction==='long'?entryPrice-d:entryPrice+d;}
const ORDER_DEFAULTS={leverage:10,orderType:'market',openType:'isolated'};
module.exports={simulateModule,loadState,ORDER_DEFAULTS,computeLiquidationPrice,core,VERSION};
