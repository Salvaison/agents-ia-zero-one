/**
 * trade-simulator-v3lab.js — Prototype integral BOONO V3-LAB.
 * Simulation uniquement. Aucun ordre reel.
 * Un meme frame causal alimente prix live, WHERE, vague, regime, dominance, risk et action.
 */
'use strict';
const fs=require('fs');
const path=require('path');
const priceStream=require('./price-stream');
const {buildRuntimeFrame}=require('./v3lab/adapters/runtime-frame');
const baton=require('./v3lab/adapters/baton-v3');
const where=require('./v3lab/layers/where');
const wave=require('./v3lab/layers/wave');
const regime=require('./v3lab/layers/regime');
const dominance=require('./v3lab/layers/dominance');
const sequence=require('./v3lab/layers/sequence');
const reversal=require('./v3lab/layers/reversal');
const risk=require('./v3lab/layers/risk');
const action=require('./v3lab/layers/action');
const {V3LabEngine}=require('./v3lab/core/engine');
const shadow=require('./v3lab/experiments/structure-shadow');
const waveFib=require('./v3lab/experiments/wave-fib');
const trancheShadow=require('./v3lab/experiments/tranche-shadow');
const threeTradeBlock=require('./v3lab/experiments/three-trade-block');
const {appendRotatingNdjson}=require('./v3lab/storage/rotating-ndjson');

const VERSION='v3-lab-prototype-0.2';
const DATA=path.join(__dirname,'../data');
const STATE_PATH=path.join(DATA,'trade-sim-v3lab-state.json');
const HISTORY_PATH=path.join(DATA,'trade-sim-v3lab-history.json');
const DECISIONS_PATH=path.join(DATA,'trade-sim-v3lab-decisions.ndjson');
const EVAL_PATH=path.join(DATA,'trade-sim-v3lab-evaluations.ndjson');
const SHADOW_PATH=path.join(DATA,'trade-sim-v3lab-shadow.ndjson');
const LOG_ROTATION={
  decisions:{maxBytes:32*1024*1024,maxSegments:8},
  evaluations:{maxBytes:32*1024*1024,maxSegments:16},
  shadow:{maxBytes:32*1024*1024,maxSegments:16},
};
const engine=new V3LabEngine({baton,where,wave,regime,dominance,sequence,reversal,risk,action});
const liveTicks=[];
const liveTracks=new Map();
const nowIso=()=>new Date().toISOString();
function readJson(p,f){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(_){return f;}}
function writeJson(p,v){
  const tmp=p+'.tmp-'+process.pid;
  fs.writeFileSync(tmp,JSON.stringify(v,null,2));
  fs.renameSync(tmp,p);
}
function appendCapped(p,rec,max=8000){const a=readJson(p,[]);const x=Array.isArray(a)?a:[];x.push(rec);while(x.length>max)x.shift();writeJson(p,x);}
function defaultState(){return {version:VERSION,startedAt:nowIso(),modules:{scalp:null,day:null,swing:null},lastEvaluation:null,lastDecisionTsByModule:{}};}
function loadState(){
  const s=readJson(STATE_PATH,null);
  if(!s)return defaultState();
  if(s.version===VERSION)return s;
  if(s.version==='v3-lab-prototype-0.1'){
    s.version=VERSION;
    s.migratedFrom='v3-lab-prototype-0.1';
    s.migratedAt=nowIso();
    return s;
  }
  return defaultState();
}
function saveState(s){writeJson(STATE_PATH,s);}
function pnlPct(pos,price){const x=(price-pos.entryPrice)/pos.entryPrice*100;return pos.direction==='long'?x:-x;}
function ensureTrack(module,pos){
  if(!pos)return null;let t=liveTracks.get(module);
  if(!t||t.entryTimestamp!==pos.entryTimestamp){
    t={entryTimestamp:pos.entryTimestamp,entryPrice:pos.entryPrice,direction:pos.direction,
      mfeUsd:Number(pos.metrics&&pos.metrics.mfeUsd)||0,maeUsd:Number(pos.metrics&&pos.metrics.maeUsd)||0,
      mfeAt:pos.metrics&&pos.metrics.mfeAt||null,maeAt:pos.metrics&&pos.metrics.maeAt||null};
    liveTracks.set(module,t);
  }return t;
}
priceStream.on('price',tick=>{
  const px=Number(tick&&tick.price),ts=Number(tick&&tick.ts)||Date.now();
  if(!Number.isFinite(px))return;
  liveTicks.push({ts,price:px});
  const cutoff=ts-30*60*1000;
  while(liveTicks.length&&liveTicks[0].ts<cutoff)liveTicks.shift();
  for(const t of liveTracks.values()){
    const signed=t.direction==='long'?px-t.entryPrice:t.entryPrice-px;
    if(signed>t.mfeUsd){t.mfeUsd=signed;t.mfeAt=new Date(ts).toISOString();}
    if(-signed>t.maeUsd){t.maeUsd=-signed;t.maeAt=new Date(ts).toISOString();}
  }
});
function updateMetrics(pos,price,ts,module){
  pos.metrics=pos.metrics||{mfeUsd:0,maeUsd:0,mfeAt:null,maeAt:null};
  const t=ensureTrack(module,pos);
  if(t){pos.metrics.mfeUsd=Math.max(pos.metrics.mfeUsd||0,t.mfeUsd||0);pos.metrics.maeUsd=Math.max(pos.metrics.maeUsd||0,t.maeUsd||0);
    if(t.mfeAt)pos.metrics.mfeAt=t.mfeAt;if(t.maeAt)pos.metrics.maeAt=t.maeAt;}
  const signed=pos.direction==='long'?price-pos.entryPrice:pos.entryPrice-price;
  pos.metrics.favorableUsd=signed;pos.metrics.adverseUsd=Math.max(0,-signed);
  if(signed>pos.metrics.mfeUsd){pos.metrics.mfeUsd=signed;pos.metrics.mfeAt=new Date(ts).toISOString();}
  if(-signed>pos.metrics.maeUsd){pos.metrics.maeUsd=-signed;pos.metrics.maeAt=new Date(ts).toISOString();}
  pos.lastPrice=price;pos.pnlPercentPrice=pnlPct(pos,price);
}
function compactDivergence(divergence){
  if(!divergence)return null;
  const structural=divergence.structural||{}, byTf=structural.byTf||{}, tf={};
  for(const name of ['3m','15m','1h','4h']){
    const v=byTf[name]||{}, c=v.confirmed||{};
    tf[name]={
      bullish:!!c.bullish,bearish:!!c.bearish,
      multiBullish:Number(c.multiBullish)||0,multiBearish:Number(c.multiBearish)||0,
      forming:(v.forming||[]).map(x=>x&&x.direction).filter(Boolean)
    };
  }
  return {counts:structural.counts||null,byTf:tf,legacy:divergence.legacy||null};
}
function compact(result){
  const rawTicker=result.raw&&result.raw.ticker?result.raw.ticker:null;
  const ticker=rawTicker?{
    ts:rawTicker.ts,cadence:rawTicker.cadence,volumeFenetreBtc:rawTicker.volumeFenetreBtc,
    winSec:rawTicker.winSec,priceMove:rawTicker.priceMove,netMove:rawTicker.netMove,
    amplitude:rawTicker.amplitude,lastPrice:rawTicker.lastPrice,priceHigh:rawTicker.priceHigh,priceLow:rawTicker.priceLow
  }:null;
  return {version:result.version,price:result.price,marketTimestamp:result.marketTimestamp,ticker,
    where:result.where,wave:result.wave,regime:result.regime,dominance:result.dominance,sequence:result.sequence,reversal:result.reversal,risk:result.risk,action:result.action,
    shadow:result.shadow?{version:result.shadow.version,decisionImpact:false,
      divergence:compactDivergence(result.shadow.divergence),waveFib:result.shadow.waveFib||null,
      tranches:result.shadow.tranches||null,lineage:result.shadow.lineage||null,ma200:result.shadow.ma200||null,
      causalEvents:result.shadow.causalEvents||null,combatLedger:result.shadow.combatLedger||null}:null};
}
function recordDecision(state,module,result){
  const a=result.action||{},fp=[a.type,a.direction,result.wave&&result.wave.phase,result.regime&&result.regime.state,
    result.dominance&&result.dominance.state,result.where&&result.where.status,result.reversal&&result.reversal.status,a.entryMode].join('|');
  const last=state.lastDecisionTsByModule[module]||{},now=Date.now();
  if(last.fp===fp&&now-(last.ts||0)<300000&&['NO_TRADE','WATCH','HOLD'].includes(a.type))return;
  state.lastDecisionTsByModule[module]={fp,ts:now};
  appendRotatingNdjson(DECISIONS_PATH,{ts:nowIso(),version:VERSION,module,action:a.type,reason:a.reason,fingerprint:fp,context:compact(result)},LOG_ROTATION.decisions);
}
function recordEval(module,result,pos){
  appendRotatingNdjson(EVAL_PATH,{ts:nowIso(),version:VERSION,module,position:pos?{direction:pos.direction,entryPrice:pos.entryPrice,
    entryMode:pos.entryMode||null,protectionPrice:pos.protectionPrice??null,reversalConfirmed:!!pos.reversalConfirmed,metrics:pos.metrics}:null,...compact(result)},LOG_ROTATION.evaluations);
  if(result.shadow)appendRotatingNdjson(SHADOW_PATH,{ts:nowIso(),version:VERSION,module,price:result.price,
    marketTimestamp:result.marketTimestamp,action:result.action&&result.action.type,shadow:result.shadow},LOG_ROTATION.shadow);
}
function recordExit(module,pos,result){
  const price=result.price,pnl=pnlPct(pos,price),m=pos.metrics||{};
  const rec={version:VERSION,module,direction:pos.direction,entryPrice:pos.entryPrice,entryTimestamp:pos.entryTimestamp,
    entryMode:pos.entryMode||null,protectionPrice:pos.protectionPrice??null,reversalConfirmed:!!pos.reversalConfirmed,
    exitPrice:price,exitTimestamp:nowIso(),exitKind:result.action.type,exitReason:result.action.reason,
    pnlPercentPrice:pnl,pnlPercentLeveraged:pnl*Number(pos.leverage||10),mfeUsd:m.mfeUsd||0,maeUsd:m.maeUsd||0,
    mfeAt:m.mfeAt||null,maeAt:m.maeAt||null,entryContext:pos.context,exitContext:compact(result),
    experimentConfigId:pos.experimentConfigId||threeTradeBlock.CONFIG_ID,p90Policy:pos.p90Policy||'LEGACY_EXIT'};
  appendCapped(HISTORY_PATH,rec,3000);
  threeTradeBlock.onTradeClosed(rec);
}
function simulateModule(module,primaryVol,divRaw,config,volByTf){
  const active=(((config||{}).tradeSimulator||{}).activeModules)||['day'];
  if(!active.includes(module))return null;
  const state=loadState();
  let frame;try{frame=buildRuntimeFrame(primaryVol,liveTicks);}catch(_){return null;}
  const pos=state.modules[module];
  if(pos)updateMetrics(pos,frame.market.price,frame.market.timestamp,module);
  let result=engine.evaluate(frame,{position:pos||null,lastEvaluation:state.lastEvaluation});
  result.shadow=shadow.evaluate(frame,result,config,pos);
  result.shadow.waveFib=waveFib.evaluate(result);
  result.shadow.tranches=trancheShadow.update(module,result,pos);
  state.lastEvaluation=compact(result);
  recordEval(module,result,pos);
  if(pos){
    if(String(result.action.type).startsWith('EXIT_')){
      recordExit(module,pos,result);recordDecision(state,module,result);state.modules[module]=null;liveTracks.delete(module);saveState(state);
      return '[V3-LAB] '+module.toUpperCase()+' '+result.action.type+' '+pos.direction+' @ '+result.price+' -- '+result.action.reason;
    }
    if(pos.entryMode==='REVERSAL_FORMING'&&!pos.reversalConfirmed&&result.wave){
      const structural=result.wave.structural||{};
      const structuralConfirmed=structural.available===true&&structural.status==='ACTIVE'&&structural.direction===pos.direction;
      const legacyConfirmed=structural.available!==true&&result.wave.direction===pos.direction&&['MONTEE','DESCENTE'].includes(result.wave.phase);
      if(structuralConfirmed||legacyConfirmed){pos.reversalConfirmed=true;pos.reversalConfirmedAt=nowIso();}
    }
    pos.lastContext=compact(result);pos.lastEvaluationAt=nowIso();recordDecision(state,module,result);saveState(state);return null;
  }
  if(result.action.type==='ENTER_LONG'||result.action.type==='ENTER_SHORT'){
    const direction=result.action.type==='ENTER_LONG'?'long':'short';
    const protectionPrice=result.risk&&result.risk.protection?result.risk.protection.price:null;
    state.modules[module]={version:VERSION,direction,entryPrice:result.price,entryTimestamp:nowIso(),leverage:10,
      experimentConfigId:threeTradeBlock.CONFIG_ID,
      p90Policy:(threeTradeBlock.configDefinition().exitPolicies||{}).p90||'LEGACY_EXIT',
      entryMode:result.action.entryMode||result.risk&&result.risk.entryMode||'PHASE_CONTINUATION',
      protectionPrice,
      entryProtectionOrigin:result.risk&&result.risk.protection?result.risk.protection.origin:null,
      entryThesis:result.risk&&result.risk.thesis?result.risk.thesis:null,
      reversalConfirmed:false,reversalConfirmedAt:null,
      metrics:{mfeUsd:0,maeUsd:0,mfeAt:null,maeAt:null,favorableUsd:0,adverseUsd:0},context:compact(result),lastContext:compact(result),
      lastPrice:result.price,pnlPercentPrice:0};
    ensureTrack(module,state.modules[module]);recordDecision(state,module,result);saveState(state);
    return '[V3-LAB] '+module.toUpperCase()+' ENTER_'+direction.toUpperCase()+' @ '+result.price;
  }
  recordDecision(state,module,result);saveState(state);return null;
}
function computeLiquidationPrice(entryPrice,direction,leverage){if(!entryPrice||!leverage)return null;const d=entryPrice/leverage;return direction==='long'?entryPrice-d:entryPrice+d;}
const ORDER_DEFAULTS={leverage:10,orderType:'market',openType:'isolated'};
module.exports={simulateModule,loadState,ORDER_DEFAULTS,computeLiquidationPrice,engine,VERSION};
