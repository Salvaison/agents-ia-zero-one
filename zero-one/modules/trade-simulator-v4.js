/**
 * BOONO V4 — moteur paper-trading primaire.
 * Direction: MCB only. PM live + efficiency can authorize entry; ticker qualifies conviction. Context informs. Risk protects.
 * V3 is evaluated only as a shadow counterfactual; it cannot open/close V4 positions.
 */
'use strict';
const fs=require('fs');
const path=require('path');
const priceStream=require('./price-stream');
const {buildRuntimeFrame}=require('./v3lab/adapters/runtime-frame');
const v4=require('./v4/core/engine');
const {appendRotatingNdjson}=require('./v3lab/storage/rotating-ndjson');
const tpMultiFractionShadow=require('./v4/experiments/tp-multifraction-shadow');

const {V3LabEngine}=require('./v3lab/core/engine');
const v3Engine=new V3LabEngine({
  baton:require('./v3lab/adapters/baton-v3'),
  where:require('./v3lab/layers/where'),
  wave:require('./v3lab/layers/wave'),
  regime:require('./v3lab/layers/regime'),
  dominance:require('./v3lab/layers/dominance'),
  sequence:require('./v3lab/layers/sequence'),
  reversal:require('./v3lab/layers/reversal'),
  risk:require('./v3lab/layers/risk'),
  action:require('./v3lab/layers/action')
});

const VERSION=v4.VERSION||'v4.1-e15-quality-20261001';
const DATA=path.join(__dirname,'../data');
const STATE_PATH=path.join(DATA,'trade-sim-v4-state.json');
const HISTORY_PATH=path.join(DATA,'trade-sim-v4-history.json');
const DECISIONS_PATH=path.join(DATA,'trade-sim-v4-decisions.ndjson');
const EVAL_PATH=path.join(DATA,'trade-sim-v4-evaluations.ndjson');
const V3_SHADOW_PATH=path.join(DATA,'trade-sim-v3-shadow-v4.ndjson');
const TP_SHADOW_PATH=path.join(DATA,'trade-sim-v4-tp-shadow.ndjson');
const ROT={maxBytes:32*1024*1024,maxSegments:16};
const SIZING={
  capitalUsd:1000,
  positionPercent:15,
  leverage:10,
  marginUsd:150,
  notionalUsd:1500,
  maxAdversePriceMoveUsd:500,
  maxRiskBudgetUsd:10,
  model:'OLD_BOONO_RISK_1PCT_1000_V1'
};

const DEFAULT_FEE_MODEL={
  enabled:true,
  makerRate:.0002,
  takerRate:.0005,
  entryLiquidity:'taker',
  exitLiquidity:'taker',
  estimateCloseFeeInLivePnl:true,
  source:'OKX_EEA_X_PERPS_REFERENCE_20261009'
};
function normalizeFeeModel(config=null){
  const raw=config&&config.tradeSimulator&&config.tradeSimulator.fees
    ?config.tradeSimulator.fees
    :(config&&('makerRate' in config||'takerRate' in config||'enabled' in config)?config:{});
  const n=(v,f)=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):f;
  const liq=v=>String(v||'taker').toLowerCase()==='maker'?'maker':'taker';
  return {
    enabled:raw.enabled!==false,
    makerRate:n(raw.makerRate,DEFAULT_FEE_MODEL.makerRate),
    takerRate:n(raw.takerRate,DEFAULT_FEE_MODEL.takerRate),
    entryLiquidity:liq(raw.entryLiquidity||DEFAULT_FEE_MODEL.entryLiquidity),
    exitLiquidity:liq(raw.exitLiquidity||DEFAULT_FEE_MODEL.exitLiquidity),
    estimateCloseFeeInLivePnl:raw.estimateCloseFeeInLivePnl!==false,
    source:raw._source||raw.source||DEFAULT_FEE_MODEL.source
  };
}
function positionFeeModel(pos){
  return pos&&pos.feeModel?normalizeFeeModel(pos.feeModel):{...DEFAULT_FEE_MODEL,enabled:false,source:'LEGACY_NO_FEE_MODEL'};
}
function feeRate(model,liquidity){
  if(!model||model.enabled===false)return 0;
  return String(liquidity||'taker').toLowerCase()==='maker'?Number(model.makerRate)||0:Number(model.takerRate)||0;
}
function executedQuoteNotional(entryNotionalUsd,entryPrice,executionPrice){
  const n=Number(entryNotionalUsd),e=Number(entryPrice),p=Number(executionPrice);
  return Number.isFinite(n)&&Number.isFinite(e)&&e>0&&Number.isFinite(p)?n*(p/e):0;
}
function executionFeeUsd(entryNotionalUsd,entryPrice,executionPrice,rate){
  return executedQuoteNotional(entryNotionalUsd,entryPrice,executionPrice)*(Number(rate)||0);
}

const liveTicks=[];
const liveTracks=new Map();
const nowIso=()=>new Date().toISOString();

function readJson(p,f){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(_){return f;}}
function writeJson(p,v){const tmp=p+'.tmp-'+process.pid;fs.writeFileSync(tmp,JSON.stringify(v,null,2));fs.renameSync(tmp,p);}
function appendCapped(p,rec,max=3000){const a=readJson(p,[]);const x=Array.isArray(a)?a:[];x.push(rec);while(x.length>max)x.shift();writeJson(p,x);}
function initialV3ShadowPosition(){
  const old=readJson(path.join(DATA,'trade-sim-v3lab-state.json'),null);
  const p=old&&old.modules&&old.modules.day;
  return p?JSON.parse(JSON.stringify(p)):null;
}
function defaultState(){return {version:VERSION,startedAt:nowIso(),modules:{scalp:null,day:null,swing:null},lastEvaluation:null,
  lastDecisionTsByModule:{},lastExitByModule:{},v3ShadowLastEvaluation:null,v3ShadowLastEvaluationRaw:null,v3ShadowPosition:initialV3ShadowPosition(),
  v3ShadowMigratedAt:nowIso()};}
function loadState(){
  const s=readJson(STATE_PATH,null);
  if(!s)return defaultState();
  if(s.version!==VERSION){
    s.previousVersion=s.version||null;
    s.version=VERSION;
    s.migratedAt=nowIso();
    s.modules=s.modules||{scalp:null,day:null,swing:null};
    s.lastDecisionTsByModule=s.lastDecisionTsByModule||{};
    s.lastExitByModule=s.lastExitByModule||{};
  }
  s.lastExitByModule=s.lastExitByModule||{};
  if(s.modules){for(const k of Object.keys(s.modules))if(s.modules[k])applySizing(s.modules[k]);}
  return s;
}
function saveState(s){writeJson(STATE_PATH,s);}
function pnlPct(pos,price){const x=(Number(price)-Number(pos.entryPrice))/Number(pos.entryPrice)*100;return pos.direction==='long'?x:-x;}
function sizingSnapshot(entryPrice){
  const e=Number(entryPrice);
  const riskAt500=Number.isFinite(e)&&e>0?SIZING.notionalUsd*SIZING.maxAdversePriceMoveUsd/e:null;
  return {...SIZING,riskAt500PriceMoveUsd:riskAt500};
}
function pnlUsdFor(pos,price){
  const notional=Number(pos&&pos.notionalUsd)||SIZING.notionalUsd;
  const grossRealized=Number.isFinite(Number(pos&&pos.grossRealizedPnlUsd))
    ?Number(pos.grossRealizedPnlUsd)
    :Number(pos&&pos.realizedPnlUsd)||0;
  const gross=grossRealized+pnlPct(pos,price)/100*notional;
  const fm=positionFeeModel(pos);
  if(!fm.enabled)return gross;
  const paid=Number(pos&&pos.tradingFeesPaidUsd)||0;
  const estClose=fm.estimateCloseFeeInLivePnl
    ?executionFeeUsd(notional,pos.entryPrice,price,feeRate(fm,fm.exitLiquidity))
    :0;
  return gross-paid-estClose;
}
function applySizing(pos){
  if(!pos)return pos;
  const z=sizingSnapshot(pos.entryPrice);
  pos.capitalUsd=Number(pos.capitalUsd)||z.capitalUsd;
  pos.positionPercent=Number(pos.positionPercent)||z.positionPercent;
  pos.leverage=Number(pos.leverage)||z.leverage;
  pos.marginUsd=Number(pos.marginUsd)||z.marginUsd;
  pos.notionalUsd=Number(pos.notionalUsd)||z.notionalUsd;
  pos.maxAdversePriceMoveUsd=Number(pos.maxAdversePriceMoveUsd)||z.maxAdversePriceMoveUsd;
  pos.maxRiskBudgetUsd=Number(pos.maxRiskBudgetUsd)||z.maxRiskBudgetUsd;
  pos.riskAt500PriceMoveUsd=Number.isFinite(Number(pos.riskAt500PriceMoveUsd))?Number(pos.riskAt500PriceMoveUsd):z.riskAt500PriceMoveUsd;
  pos.sizingModel=pos.sizingModel||z.model;
  pos.initialCapitalUsd=Number(pos.initialCapitalUsd)||Number(pos.capitalUsd)||z.capitalUsd;
  pos.initialMarginUsd=Number(pos.initialMarginUsd)||Number(pos.marginUsd)||z.marginUsd;
  pos.initialNotionalUsd=Number(pos.initialNotionalUsd)||Number(pos.notionalUsd)||z.notionalUsd;
  pos.initialPositionPercent=Number(pos.initialPositionPercent)||Number(pos.positionPercent)||z.positionPercent;
  pos.grossRealizedPnlUsd=Number(pos.grossRealizedPnlUsd)||0;
  pos.tradingFeesPaidUsd=Number(pos.tradingFeesPaidUsd)||0;
  pos.entryFeeUsd=Number(pos.entryFeeUsd)||0;
  pos.exitFeesPaidUsd=Number(pos.exitFeesPaidUsd)||0;
  pos.realizedPnlUsd=Number.isFinite(Number(pos.realizedPnlUsd))
    ?Number(pos.realizedPnlUsd)
    :pos.grossRealizedPnlUsd-pos.tradingFeesPaidUsd;
  pos.tpEvents=Array.isArray(pos.tpEvents)?pos.tpEvents:[];
  pos.tp1Taken=!!pos.tp1Taken;
  return pos;
}
function applyPartialTakeProfit(pos,result){
  if(!pos||!result||!result.action||result.action.type!=='TAKE_PROFIT_PARTIAL')return null;
  applySizing(pos);
  if(pos.tp1Taken)return null;
  const rawFraction=Number(result.action.evidence&&result.action.evidence.fraction);
  const fraction=Number.isFinite(rawFraction)?Math.max(.05,Math.min(.5,rawFraction)):.25;
  const beforeNotional=Number(pos.notionalUsd)||SIZING.notionalUsd;
  const beforeMargin=Number(pos.marginUsd)||SIZING.marginUsd;
  const beforePositionPercent=Number(pos.positionPercent)||SIZING.positionPercent;
  const closedNotional=beforeNotional*fraction;
  const closedMargin=beforeMargin*fraction;
  const grossRealized=pnlPct(pos,result.price)/100*closedNotional;
  const fm=positionFeeModel(pos);
  const closeRate=feeRate(fm,fm.exitLiquidity);
  const executedQuoteUsd=executedQuoteNotional(closedNotional,pos.entryPrice,result.price);
  const tradingFeeUsd=executedQuoteUsd*closeRate;
  const netRealizedAfterCloseFee=grossRealized-tradingFeeUsd;
  const ts=Number(result.marketTimestamp)||Date.now();
  const ev={
    type:'TP1_STRESS_TEST',timestamp:new Date(ts).toISOString(),price:Number(result.price),
    fractionOfCurrent:fraction,fractionOfInitial:closedNotional/Number(pos.initialNotionalUsd||beforeNotional),
    closedNotionalUsd:closedNotional,closedMarginUsd:closedMargin,executedQuoteNotionalUsd:executedQuoteUsd,
    grossRealizedPnlUsd:grossRealized,tradingFeeUsd,netRealizedAfterCloseFeeUsd:netRealizedAfterCloseFee,
    realizedPnlUsd:netRealizedAfterCloseFee,
    feeRate:closeRate,liquidity:fm.exitLiquidity,
    mfeUsd:Number(pos.metrics&&pos.metrics.mfeUsd)||0,
    givebackUsd:Number(result.action.evidence&&result.action.evidence.givebackUsd)||0,
    reason:result.action.reason,
    mfSupport:result.action.evidence&&result.action.evidence.mfSupport||null
  };
  pos.grossRealizedPnlUsd=(Number(pos.grossRealizedPnlUsd)||0)+grossRealized;
  pos.tradingFeesPaidUsd=(Number(pos.tradingFeesPaidUsd)||0)+tradingFeeUsd;
  pos.exitFeesPaidUsd=(Number(pos.exitFeesPaidUsd)||0)+tradingFeeUsd;
  pos.realizedPnlUsd=pos.grossRealizedPnlUsd-pos.tradingFeesPaidUsd;
  pos.notionalUsd=beforeNotional-closedNotional;
  pos.marginUsd=beforeMargin-closedMargin;
  pos.positionPercent=beforePositionPercent*(1-fraction);
  pos.riskAt500PriceMoveUsd=pos.notionalUsd*SIZING.maxAdversePriceMoveUsd/Number(pos.entryPrice);
  pos.tp1Taken=true;
  pos.tp1TakenAt=ev.timestamp;
  pos.tpEvents.push(ev);
  return ev;
}

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
  if(t){
    pos.metrics.mfeUsd=Math.max(Number(pos.metrics.mfeUsd)||0,Number(t.mfeUsd)||0);
    pos.metrics.maeUsd=Math.max(Number(pos.metrics.maeUsd)||0,Number(t.maeUsd)||0);
    if(t.mfeAt)pos.metrics.mfeAt=t.mfeAt;if(t.maeAt)pos.metrics.maeAt=t.maeAt;
  }
  const signed=pos.direction==='long'?Number(price)-Number(pos.entryPrice):Number(pos.entryPrice)-Number(price);
  pos.metrics.currentSignedUsd=signed;
  pos.metrics.favorableUsd=Math.max(0,signed);
  pos.metrics.adverseUsd=Math.max(0,-signed);
  if(signed>pos.metrics.mfeUsd){pos.metrics.mfeUsd=signed;pos.metrics.mfeAt=new Date(ts).toISOString();}
  if(-signed>pos.metrics.maeUsd){pos.metrics.maeUsd=-signed;pos.metrics.maeAt=new Date(ts).toISOString();}
  applySizing(pos);
  const notional=Number(pos.notionalUsd)||SIZING.notionalUsd;
  const initialNotional=Number(pos.initialNotionalUsd)||notional;
  const initialMargin=Number(pos.initialMarginUsd)||SIZING.marginUsd;
  const unrealized=pnlPct(pos,price)/100*notional;
  const grossRealized=Number(pos.grossRealizedPnlUsd)||0;
  const grossCurrent=grossRealized+unrealized;
  const fm=positionFeeModel(pos);
  const paidFees=Number(pos.tradingFeesPaidUsd)||0;
  const estimatedCloseFee=fm.enabled&&fm.estimateCloseFeeInLivePnl
    ?executionFeeUsd(notional,pos.entryPrice,price,feeRate(fm,fm.exitLiquidity))
    :0;
  const netIfClosed=grossCurrent-paidFees-estimatedCloseFee;
  pos.metrics.unrealizedPnlUsd=unrealized;
  pos.metrics.grossRealizedPnlUsd=grossRealized;
  pos.metrics.realizedPnlUsd=Number(pos.realizedPnlUsd)||0;
  pos.metrics.grossCurrentPnlUsd=grossCurrent;
  pos.metrics.tradingFeesPaidUsd=paidFees;
  pos.metrics.estimatedCloseFeeUsd=estimatedCloseFee;
  pos.metrics.totalFeesIfClosedNowUsd=paidFees+estimatedCloseFee;
  pos.metrics.currentPnlUsd=netIfClosed;
  pos.metrics.netPnlIfClosedNowUsd=netIfClosed;
  pos.metrics.mfePnlUsd=(Number(pos.metrics.mfeUsd)||0)/Number(pos.entryPrice)*initialNotional;
  pos.metrics.maeLossUsd=(Number(pos.metrics.maeUsd)||0)/Number(pos.entryPrice)*initialNotional;
  pos.lastPrice=price;pos.pnlPercentPrice=pnlPct(pos,price);
  pos.pnlPercentLeveraged=initialMargin>0?pos.metrics.currentPnlUsd/initialMargin*100:pos.pnlPercentPrice*Number(pos.leverage||SIZING.leverage);
}
function compactV3(x){
  if(!x)return null;
  return {
    action:x.action||null,
    wave:x.wave?{phase:x.wave.phase,direction:x.wave.direction,structural:x.wave.structural,origin:x.wave.origin,current:x.wave.current,nested3m:x.wave.nested3m}:null,
    dominance:x.dominance?{state:x.dominance.state,direction:x.dominance.direction,proofScore:x.dominance.proofScore,persistCount:x.dominance.persistCount,retainedFraction:x.dominance.retainedFraction}:null,
    regime:x.regime?{state:x.regime.state,current:x.regime.current}:null,
    risk:x.risk?{direction:x.risk.direction,entryMode:x.risk.entryMode,entryAllowed:x.risk.entryAllowed,reason:x.risk.reason}:null
  };
}
function compactV4(x){
  return {version:x.version,price:x.price,marketTimestamp:x.marketTimestamp,
    mcb:x.mcb,nativeSignal:x.nativeSignal||null,background:x.background||null,baseThesis:x.baseThesis||null,entryBaseThesis:x.entryBaseThesis||null,thesis:x.thesis,
    context:x.context,structuralRoom:x.structuralRoom||null,capitulationGuard:x.capitulationGuard||null,
    marketQuality:x.marketQuality||null,setup:x.setup||null,
    translation:x.translation,ticker:x.ticker,mfStructureShadow:x.mfStructureShadow||null,structuralHandoff:x.structuralHandoff||null,
    entryTranslation:x.entryTranslation||null,entryTicker:x.entryTicker||null,
    risk:x.risk,action:x.action,contract:x.contract,v3Shadow:x.v3Shadow||null};
}
function recordDecision(state,module,result){
  const a=result.action||{},fp=[a.type,a.direction,a.stage,result.thesis&&result.thesis.state,
    result.translation&&result.translation.status,result.ticker&&result.ticker.status].join('|');
  const last=state.lastDecisionTsByModule[module]||{},now=Date.now();
  if(last.fp===fp&&now-(last.ts||0)<300000&&['NO_TRADE','WATCH','HOLD'].includes(a.type))return;
  state.lastDecisionTsByModule[module]={fp,ts:now};
  appendRotatingNdjson(DECISIONS_PATH,{ts:nowIso(),version:VERSION,module,action:a.type,reason:a.reason,fingerprint:fp,context:compactV4(result)},ROT);
}
function recordEval(module,result,pos){
  appendRotatingNdjson(EVAL_PATH,{ts:nowIso(),version:VERSION,module,
    position:pos?{direction:pos.direction,entryPrice:pos.entryPrice,entryTimestamp:pos.entryTimestamp,
      tp1Taken:!!pos.tp1Taken,realizedPnlUsd:pos.realizedPnlUsd,grossRealizedPnlUsd:pos.grossRealizedPnlUsd,
      tradingFeesPaidUsd:pos.tradingFeesPaidUsd,feeModel:pos.feeModel||null,metrics:pos.metrics,
      tpOptimizationShadow:tpMultiFractionShadow.compact(pos.tpOptimizationShadow||null)}:null,
    ...compactV4(result)},ROT);
  appendRotatingNdjson(V3_SHADOW_PATH,{ts:nowIso(),module,price:result.price,v3:result.v3Shadow},ROT);
}
function recordExit(module,pos,result){
  const price=result.price,pnl=pnlPct(pos,price),m=pos.metrics||{};
  applySizing(pos);
  const remainingNotional=Number(pos.notionalUsd)||SIZING.notionalUsd;
  const remainingMargin=Number(pos.marginUsd)||SIZING.marginUsd;
  const initialNotional=Number(pos.initialNotionalUsd)||remainingNotional;
  const initialMargin=Number(pos.initialMarginUsd)||remainingMargin;
  const grossRealized=Number(pos.grossRealizedPnlUsd)||0;
  const runnerGrossPnl=pnl/100*remainingNotional;
  const grossTotalPnl=grossRealized+runnerGrossPnl;
  const fm=positionFeeModel(pos);
  const finalExitRate=feeRate(fm,fm.exitLiquidity);
  const finalExitQuoteNotional=executedQuoteNotional(remainingNotional,pos.entryPrice,price);
  const finalExitFeeUsd=finalExitQuoteNotional*finalExitRate;
  const feesPaidBeforeExit=Number(pos.tradingFeesPaidUsd)||0;
  const totalTradingFeesUsd=feesPaidBeforeExit+finalExitFeeUsd;
  const netTotalPnl=grossTotalPnl-totalTradingFeesUsd;
  const mfePnl=(Number(m.mfeUsd)||0)/Number(pos.entryPrice)*initialNotional;
  const rec={version:pos.version||VERSION,exitEngineVersion:VERSION,module,direction:pos.direction,entryPrice:pos.entryPrice,entryTimestamp:pos.entryTimestamp,
    exitPrice:price,exitTimestamp:nowIso(),exitKind:result.action.type,exitReason:result.action.reason,
    pnlPercentPrice:pnl,pnlPercentLeveraged:initialMargin>0?netTotalPnl/initialMargin*100:pnl*Number(pos.leverage||SIZING.leverage),
    grossPnlPercentLeveraged:initialMargin>0?grossTotalPnl/initialMargin*100:null,
    pnlUsd:netTotalPnl,netPnlUsd:netTotalPnl,grossPnlUsd:grossTotalPnl,
    grossRealizedPnlUsd:grossRealized,realizedPnlUsd:grossRealized-feesPaidBeforeExit,
    runnerPnlUsd:runnerGrossPnl,
    tradingFeesUsd:totalTradingFeesUsd,tradingFeesPaidBeforeFinalExitUsd:feesPaidBeforeExit,
    entryFeeUsd:Number(pos.entryFeeUsd)||0,partialExitFeesUsd:Number(pos.exitFeesPaidUsd)||0,
    finalExitFeeUsd,finalExitFeeRate:finalExitRate,finalExitLiquidity:fm.exitLiquidity,
    finalExitQuoteNotionalUsd:finalExitQuoteNotional,feeModel:fm,
    fundingPnlUsd:null,fundingMode:'NOT_MODELED',
    capitalUsd:pos.initialCapitalUsd||pos.capitalUsd,marginUsd:initialMargin,notionalUsd:initialNotional,positionPercent:pos.initialPositionPercent||pos.positionPercent,
    remainingMarginUsd:remainingMargin,remainingNotionalUsd:remainingNotional,remainingPositionPercent:pos.positionPercent,
    tp1Taken:!!pos.tp1Taken,tpEvents:Array.isArray(pos.tpEvents)?pos.tpEvents:[],
    maxAdversePriceMoveUsd:pos.maxAdversePriceMoveUsd,riskAt500PriceMoveUsd:pos.riskAt500PriceMoveUsd,sizingModel:pos.sizingModel,
    mfeUsd:m.mfeUsd||0,maeUsd:m.maeUsd||0,mfeAt:m.mfeAt||null,maeAt:m.maeAt||null,
    mfePnlUsd:mfePnl,
    maeLossUsd:(Number(m.maeUsd)||0)/Number(pos.entryPrice)*initialNotional,
    mfeCapturedPct:mfePnl>0?netTotalPnl/mfePnl*100:null,
    mfeCapturedPctGross:mfePnl>0?grossTotalPnl/mfePnl*100:null,
    entryContext:pos.context,exitContext:compactV4(result)};
  const tpShadowFull=tpMultiFractionShadow.fullResult(pos.tpOptimizationShadow||null);
  if(tpShadowFull&&tpShadowFull.finalized){
    rec.tpOptimizationShadow=tpMultiFractionShadow.compact(tpShadowFull);
    appendRotatingNdjson(TP_SHADOW_PATH,{
      ts:nowIso(),version:tpShadowFull.version,module,
      entryTimestamp:pos.entryTimestamp,exitTimestamp:rec.exitTimestamp,
      direction:pos.direction,entryPrice:pos.entryPrice,exitPrice:price,
      shadow:tpShadowFull
    },ROT);
  }
  appendCapped(HISTORY_PATH,rec,3000);
  return rec;
}

function simulateModule(module,primaryVol,divRaw,config,volByTf){
  const active=(((config||{}).tradeSimulator||{}).activeModules)||['day'];
  if(!active.includes(module))return null;
  const state=loadState();
  let frame;try{frame=buildRuntimeFrame(primaryVol,liveTicks);}catch(_){return null;}
  frame.prototype={name:'V4',fullAuditRows:(frame.sources.auditRows||[]).length,liveTickRows:(frame.sources.liveTicks||[]).length};
  frame.entryControl=state.lastExitByModule&&state.lastExitByModule[module]||null;
  const pos=state.modules[module];
  if(pos)updateMetrics(pos,frame.market.price,frame.market.timestamp,module);
  let v3pos=state.v3ShadowPosition||null;
  if(v3pos)updateMetrics(v3pos,frame.market.price,frame.market.timestamp,'v3shadow-'+module);

  const result=v4.evaluate(frame,pos||null,state.lastEvaluation||null);
  try{
    const v3=v3Engine.evaluate(frame,{position:v3pos,lastEvaluation:state.v3ShadowLastEvaluationRaw});
    result.v3Shadow=compactV3(v3);
    state.v3ShadowLastEvaluation=compactV3(v3);
    state.v3ShadowLastEvaluationRaw=v3;
    const va=v3.action||{};
    if(v3pos&&String(va.type||'').startsWith('EXIT_')){
      appendRotatingNdjson(V3_SHADOW_PATH,{ts:nowIso(),module,price:frame.market.price,event:'V3_SHADOW_EXIT',
        position:{direction:v3pos.direction,entryPrice:v3pos.entryPrice,entryTimestamp:v3pos.entryTimestamp,metrics:v3pos.metrics},
        action:va,v3:compactV3(v3)},ROT);
      state.v3ShadowPosition=null;liveTracks.delete('v3shadow-'+module);v3pos=null;
    }else if(v3pos){
      v3pos.lastContext=compactV3(v3);v3pos.lastEvaluationAt=nowIso();state.v3ShadowPosition=v3pos;
    }else if(va.type==='ENTER_LONG'||va.type==='ENTER_SHORT'){
      const vd=va.type==='ENTER_LONG'?'long':'short';
      state.v3ShadowPosition={version:'v3-shadow-under-v4',direction:vd,entryPrice:frame.market.price,entryTimestamp:nowIso(),leverage:10,
        entryMode:va.entryMode||v3.risk&&v3.risk.entryMode||'PHASE_CONTINUATION',
        protectionPrice:v3.risk&&v3.risk.protection?v3.risk.protection.price:null,
        reversalConfirmed:false,metrics:{mfeUsd:0,maeUsd:0,mfeAt:null,maeAt:null,favorableUsd:0,adverseUsd:0},
        context:compactV3(v3),lastContext:compactV3(v3),lastPrice:frame.market.price,pnlPercentPrice:0};
      ensureTrack('v3shadow-'+module,state.v3ShadowPosition);
      appendRotatingNdjson(V3_SHADOW_PATH,{ts:nowIso(),module,price:frame.market.price,event:'V3_SHADOW_ENTRY',
        action:va,v3:compactV3(v3)},ROT);
    }
  }catch(e){result.v3Shadow={error:e.message};}
  if(pos)tpMultiFractionShadow.step(pos,result);
  state.lastEvaluation=compactV4(result);
  recordEval(module,result,pos);
  if(pos){
    if(result.action.type==='TAKE_PROFIT_PARTIAL'){
      const tp=applyPartialTakeProfit(pos,result);
      if(tp){
        updateMetrics(pos,frame.market.price,frame.market.timestamp,module);
        pos.lastContext=compactV4(result);pos.lastEvaluationAt=nowIso();
        recordDecision(state,module,result);saveState(state);
        return '[V4] '+module.toUpperCase()+' TP1 25% '+pos.direction+' @ '+result.price+' -- runner '+Number(pos.notionalUsd).toFixed(0)+'$ notional';
      }
    }
    if(String(result.action.type).startsWith('EXIT_')){
      const exitRec=recordExit(module,pos,result);recordDecision(state,module,result);
      state.lastExitByModule=state.lastExitByModule||{};
      const exitPnlUsd=exitRec&&Number.isFinite(Number(exitRec.pnlUsd))?Number(exitRec.pnlUsd):pnlUsdFor(pos,result.price);
      state.lastExitByModule[module]={
        lastExitTs:Number(result.marketTimestamp)||Date.now(),
        lastExitTimestamp:nowIso(),
        direction:pos.direction,
        setupId:pos.entrySetupId||null,
        setupKey:pos.entrySetupKey||null,
        campaignKey:pos.entryCampaignKey||null,
        fourHourArmToken:pos.entryFourHourArmToken||null,
        capitulationReversal:!!pos.entryCapitulationReversal,
        pnlUsd:exitPnlUsd,
        mfeUsd:Number(pos.metrics&&pos.metrics.mfeUsd)||0,
        maeUsd:Number(pos.metrics&&pos.metrics.maeUsd)||0,
        exitKind:result.action.type
      };
      state.modules[module]=null;liveTracks.delete(module);saveState(state);
      return '[V4] '+module.toUpperCase()+' '+result.action.type+' '+pos.direction+' @ '+result.price+' -- '+result.action.reason;
    }
    pos.lastContext=compactV4(result);pos.lastEvaluationAt=nowIso();
    recordDecision(state,module,result);saveState(state);return null;
  }
  if(result.action.type==='ENTER_LONG'||result.action.type==='ENTER_SHORT'){
    const direction=result.action.type==='ENTER_LONG'?'long':'short';
    const z=sizingSnapshot(result.price);
    const fm=normalizeFeeModel(config);
    const entryRate=feeRate(fm,fm.entryLiquidity);
    const entryFeeUsd=executionFeeUsd(z.notionalUsd,result.price,result.price,entryRate);
    state.modules[module]={version:VERSION,direction,entryPrice:result.price,entryTimestamp:nowIso(),leverage:z.leverage,
      capitalUsd:z.capitalUsd,positionPercent:z.positionPercent,marginUsd:z.marginUsd,notionalUsd:z.notionalUsd,
      initialCapitalUsd:z.capitalUsd,initialPositionPercent:z.positionPercent,initialMarginUsd:z.marginUsd,initialNotionalUsd:z.notionalUsd,
      feeModel:fm,entryFeeUsd,tradingFeesPaidUsd:entryFeeUsd,exitFeesPaidUsd:0,
      grossRealizedPnlUsd:0,realizedPnlUsd:-entryFeeUsd,tp1Taken:false,tp1TakenAt:null,tpEvents:[],
      maxAdversePriceMoveUsd:z.maxAdversePriceMoveUsd,maxRiskBudgetUsd:z.maxRiskBudgetUsd,
      riskAt500PriceMoveUsd:z.riskAt500PriceMoveUsd,sizingModel:z.model,
      entrySetupId:result.setup&&result.setup.setupId||null,
      entrySetupKey:result.setup&&result.setup.setupKey||null,
      entryCampaignKey:result.setup&&result.setup.campaignKey||null,
      entryFourHourArmToken:result.setup&&result.setup.fourHourArmToken||null,
      entryCapitulationReversal:!!(result.setup&&result.setup.capitulationReversal),
      entrySetupTs:result.setup&&result.setup.setupTs||null,
      entryStage:result.action.stage,entryThesis:result.thesis,
      metrics:{mfeUsd:0,maeUsd:0,mfeAt:null,maeAt:null,currentSignedUsd:0,favorableUsd:0,adverseUsd:0,currentPnlUsd:0,mfePnlUsd:0,maeLossUsd:0},
      context:compactV4(result),lastContext:compactV4(result),lastPrice:result.price,pnlPercentPrice:0,pnlPercentLeveraged:0};
    ensureTrack(module,state.modules[module]);
    updateMetrics(state.modules[module],frame.market.price,frame.market.timestamp,module);
    recordDecision(state,module,result);saveState(state);
    return '[V4] '+module.toUpperCase()+' ENTER_'+direction.toUpperCase()+' @ '+result.price;
  }
  recordDecision(state,module,result);saveState(state);return null;
}
function computeLiquidationPrice(entryPrice,direction,leverage){
  if(!entryPrice||!leverage)return null;const d=entryPrice/leverage;
  return direction==='long'?entryPrice-d:entryPrice+d;
}
const ORDER_DEFAULTS={leverage:SIZING.leverage,orderType:'market',openType:'isolated'};
module.exports={simulateModule,loadState,ORDER_DEFAULTS,computeLiquidationPrice,VERSION,engine:v4,SIZING,DEFAULT_FEE_MODEL,
  sizingSnapshot,pnlUsdFor,applySizing,applyPartialTakeProfit,normalizeFeeModel,positionFeeModel,feeRate,executedQuoteNotional,executionFeeUsd};
