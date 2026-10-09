'use strict';

const action=require('../layers/action');

const VERSION='tp-multifraction-shadow-v0.1';
const TP1_FRACTIONS=[.10,.20,.25,.33];
const TP2_FRACTIONS_OF_REMAINING=[0,.10,.20,.25,.33];

function finite(v){return Number.isFinite(Number(v));}
function round(v,n=8){
  if(!finite(v))return null;
  const p=10**n;
  return Math.round(Number(v)*p)/p;
}
function pctLabel(v){return String(Math.round(Number(v)*100));}
function feeRate(model,liquidity='taker'){
  if(!model||model.enabled===false)return 0;
  return String(liquidity).toLowerCase()==='maker'?Number(model.makerRate)||0:Number(model.takerRate)||0;
}
function executedQuoteNotional(entryNotionalUsd,entryPrice,executionPrice){
  const n=Number(entryNotionalUsd),e=Number(entryPrice),p=Number(executionPrice);
  return finite(n)&&finite(e)&&e>0&&finite(p)?n*(p/e):0;
}
function executionFeeUsd(entryNotionalUsd,entryPrice,executionPrice,rate){
  return executedQuoteNotional(entryNotionalUsd,entryPrice,executionPrice)*(Number(rate)||0);
}
function grossPnlUsd(direction,entryPrice,executionPrice,entryNotionalUsd){
  const e=Number(entryPrice),p=Number(executionPrice),n=Number(entryNotionalUsd);
  if(!finite(e)||e<=0||!finite(p)||!finite(n))return 0;
  const move=direction==='long'?(p-e):(e-p);
  return move/e*n;
}
function variant(id,tp1Fraction,tp2FractionOfRemaining,initialNotionalUsd){
  return {
    id,tp1Fraction,tp2FractionOfRemaining,
    initialNotionalUsd:Number(initialNotionalUsd),
    remainingNotionalUsd:Number(initialNotionalUsd),
    grossRealizedPnlUsd:0,
    partialExitFeesUsd:0,
    tp1:null,tp2:null,final:null
  };
}
function create(position,marketTs=Date.now()){
  const initialNotional=Number(position&&position.initialNotionalUsd)||Number(position&&position.notionalUsd)||1500;
  const entryPrice=Number(position&&position.entryPrice);
  const feeModel=position&&position.feeModel||{enabled:false};
  const entryFee=finite(position&&position.entryFeeUsd)
    ?Number(position.entryFeeUsd)
    :executionFeeUsd(initialNotional,entryPrice,entryPrice,feeRate(feeModel,feeModel.entryLiquidity||'taker'));
  const variants=[variant('HOLD_100',0,0,initialNotional)];
  for(const f1 of TP1_FRACTIONS){
    for(const f2 of TP2_FRACTIONS_OF_REMAINING){
      variants.push(variant('TP1_'+pctLabel(f1)+'_TP2_'+pctLabel(f2),f1,f2,initialNotional));
    }
  }
  return {
    version:VERSION,decisionImpact:false,
    createdAt:Number(marketTs)||Date.now(),
    direction:position&&position.direction||null,
    entryPrice,
    initialNotionalUsd:initialNotional,
    initialMarginUsd:Number(position&&position.initialMarginUsd)||Number(position&&position.marginUsd)||150,
    feeModel,
    entryFeeUsd:entryFee,
    tp1Fractions:TP1_FRACTIONS.slice(),
    tp2FractionsOfRemaining:TP2_FRACTIONS_OF_REMAINING.slice(),
    variants,
    tp1Event:null,
    tp2ArmedAt:null,
    tp2ArmedTimestamp:null,
    tp2ArmMfeUsd:null,
    tp2Event:null,
    fullExitAtFirstStress:null,
    finalized:false,
    finalizedAt:null,
    finalExit:null,
    ranking:null,
    semantic:{
      tp1:'first productive adverse stress while MCB thesis + MF15 structure still carry the campaign',
      tp2:'after TP1, a new causal MFE must be printed first; the next productive adverse stress may take a second partial',
      fractions:'TP1 is fraction of initial/current position; TP2 is fraction of the runner remaining after TP1',
      fees:'all variants pay the same entry fee; each synthetic partial/final execution pays the configured execution fee',
      authority:'shadow only; never changes V4 action, position size, entry, exit or risk'
    }
  };
}
function stressEvidence(position,result){
  const rp=result&&result.risk&&result.risk.position||null;
  if(!position||!rp)return {ready:false,reason:'NO_POSITION_RISK'};
  const mfe=Number(rp.mfeUsd)||0,current=Number(rp.currentSignedUsd)||0;
  const giveback=mfe-current;
  const pm=action.adversePmProof(position,result.translation);
  const micro=action.adverseMicroProof(position,result.ticker);
  const thesisAligned=!!(result.thesis&&result.thesis.direction===position.direction);
  const mfSupport=action.mfStructureSupportsPosition(position,result.mfStructureShadow);
  const structuralSupport=!!(thesisAligned&&mfSupport.ready);
  const ready=!!(
    current>0&&
    mfe>=action.MFE_MINIMUM_USD&&
    giveback>=action.MFE_GIVEBACK_REFERENCE_USD&&
    giveback<action.RUNNER_GIVEBACK_USD&&
    pm.ready&&micro.ready&&structuralSupport
  );
  return {
    ready,
    reason:ready?'PRODUCTIVE_ADVERSE_STRESS_WITH_STRUCTURE':
      !structuralSupport?'STRUCTURE_NOT_SUPPORTIVE':
      !(pm.ready&&micro.ready)?'ADVERSE_EXECUTION_PROOF_INCOMPLETE':
      giveback<action.MFE_GIVEBACK_REFERENCE_USD?'GIVEBACK_TOO_SMALL':
      giveback>=action.RUNNER_GIVEBACK_USD?'GIVEBACK_ALREADY_FULL_EXIT_ZONE':
      mfe<action.MFE_MINIMUM_USD?'MFE_TOO_SMALL':
      current<=0?'NO_POSITIVE_TERRAIN':'NOT_READY',
    currentSignedUsd:current,mfeUsd:mfe,givebackUsd:giveback,
    thesisAligned,mfSupport,pm,micro
  };
}
function executePartial(state,v,which,fraction,price,ts,stress){
  if(!(fraction>0)||v[which])return null;
  const before=Number(v.remainingNotionalUsd)||0;
  const closed=before*Number(fraction);
  if(!(closed>0))return null;
  const gross=grossPnlUsd(state.direction,state.entryPrice,price,closed);
  const rate=feeRate(state.feeModel,state.feeModel&&state.feeModel.exitLiquidity||'taker');
  const quote=executedQuoteNotional(closed,state.entryPrice,price);
  const fee=quote*rate;
  const ev={
    type:which.toUpperCase(),
    timestamp:new Date(Number(ts)||Date.now()).toISOString(),
    marketTimestamp:Number(ts)||Date.now(),
    price:Number(price),
    fractionOfRunnerBefore:Number(fraction),
    fractionOfInitial:closed/Number(state.initialNotionalUsd),
    closedNotionalUsd:closed,
    remainingNotionalUsd:before-closed,
    grossRealizedPnlUsd:gross,
    tradingFeeUsd:fee,
    netRealizedAfterExitFeeUsd:gross-fee,
    mfeUsd:stress&&stress.mfeUsd,
    givebackUsd:stress&&stress.givebackUsd
  };
  v.remainingNotionalUsd=before-closed;
  v.grossRealizedPnlUsd+=gross;
  v.partialExitFeesUsd+=fee;
  v[which]=ev;
  return ev;
}
function fullExitReference(state,price,ts,stress){
  const gross=grossPnlUsd(state.direction,state.entryPrice,price,state.initialNotionalUsd);
  const rate=feeRate(state.feeModel,state.feeModel&&state.feeModel.exitLiquidity||'taker');
  const fee=executionFeeUsd(state.initialNotionalUsd,state.entryPrice,price,rate);
  return {
    id:'EXIT_100_AT_FIRST_STRESS',
    timestamp:new Date(Number(ts)||Date.now()).toISOString(),
    marketTimestamp:Number(ts)||Date.now(),
    price:Number(price),
    grossPnlUsd:gross,
    entryFeeUsd:state.entryFeeUsd,
    finalExitFeeUsd:fee,
    tradingFeesUsd:state.entryFeeUsd+fee,
    netPnlUsd:gross-state.entryFeeUsd-fee,
    mfeUsd:stress&&stress.mfeUsd,
    givebackUsd:stress&&stress.givebackUsd
  };
}
function armTp2(state,position){
  if(!state.tp1Event||state.tp2ArmedAt||!position||!position.metrics)return false;
  const mfe=Number(position.metrics.mfeUsd)||0;
  const mfeAt=Date.parse(position.metrics.mfeAt||'');
  const tp1Ts=Number(state.tp1Event.marketTimestamp);
  if(Number.isFinite(mfeAt)&&mfeAt>tp1Ts&&mfe>Number(state.tp1Event.mfeUsd)){
    state.tp2ArmedAt=mfeAt;
    state.tp2ArmedTimestamp=new Date(mfeAt).toISOString();
    state.tp2ArmMfeUsd=mfe;
    return true;
  }
  return false;
}
function finalizeVariant(state,v,price,ts,mfePriceUsd){
  if(v.final)return v.final;
  const runnerGross=grossPnlUsd(state.direction,state.entryPrice,price,v.remainingNotionalUsd);
  const rate=feeRate(state.feeModel,state.feeModel&&state.feeModel.exitLiquidity||'taker');
  const finalFee=executionFeeUsd(v.remainingNotionalUsd,state.entryPrice,price,rate);
  const grossTotal=v.grossRealizedPnlUsd+runnerGross;
  const fees=state.entryFeeUsd+v.partialExitFeesUsd+finalFee;
  const net=grossTotal-fees;
  const lockedNetAfterPartials=v.grossRealizedPnlUsd-state.entryFeeUsd-v.partialExitFeesUsd;
  const mfeGross=finite(mfePriceUsd)&&state.entryPrice>0
    ?Number(mfePriceUsd)/state.entryPrice*state.initialNotionalUsd:null;
  v.final={
    timestamp:new Date(Number(ts)||Date.now()).toISOString(),
    marketTimestamp:Number(ts)||Date.now(),
    price:Number(price),
    grossPnlUsd:grossTotal,
    netPnlUsd:net,
    tradingFeesUsd:fees,
    entryFeeUsd:state.entryFeeUsd,
    partialExitFeesUsd:v.partialExitFeesUsd,
    finalExitFeeUsd:finalFee,
    lockedNetAfterPartialsUsd:lockedNetAfterPartials,
    runnerContributionGrossUsd:runnerGross,
    finalRunnerFractionOfInitial:v.remainingNotionalUsd/state.initialNotionalUsd,
    mfeGrossPnlUsd:mfeGross,
    mfeCapturedPctNet:finite(mfeGross)&&mfeGross>0?net/mfeGross*100:null
  };
  return v.final;
}
function finalize(state,position,result){
  if(state.finalized)return state;
  const price=Number(result&&result.price);
  const ts=Number(result&&result.marketTimestamp)||Date.now();
  const mfe=Number(position&&position.metrics&&position.metrics.mfeUsd)||0;
  for(const v of state.variants)finalizeVariant(state,v,price,ts,mfe);
  const hold=state.variants.find(v=>v.id==='HOLD_100');
  const holdNet=hold&&hold.final&&Number(hold.final.netPnlUsd);
  for(const v of state.variants){
    const net=v.final&&Number(v.final.netPnlUsd);
    v.final.deltaVsHoldNetUsd=finite(holdNet)&&finite(net)?net-holdNet:null;
    v.final.mutilationVsHoldUsd=finite(holdNet)&&finite(net)?Math.max(0,holdNet-net):null;
    v.final.benefitVsHoldUsd=finite(holdNet)&&finite(net)?Math.max(0,net-holdNet):null;
  }
  const tpVariants=state.variants.filter(v=>v.id!=='HOLD_100');
  const sorted=tpVariants.slice().sort((a,b)=>Number(b.final.netPnlUsd)-Number(a.final.netPnlUsd));
  const overall=state.variants.slice().sort((a,b)=>Number(b.final.netPnlUsd)-Number(a.final.netPnlUsd));
  state.finalized=true;
  state.finalizedAt=new Date(ts).toISOString();
  state.finalExit={timestamp:state.finalizedAt,marketTimestamp:ts,price,action:result&&result.action&&result.action.type||null};
  state.ranking={
    bestTpVariantId:sorted[0]&&sorted[0].id||null,
    bestTpNetPnlUsd:sorted[0]&&sorted[0].final.netPnlUsd||null,
    bestOverallVariantId:overall[0]&&overall[0].id||null,
    bestOverallNetPnlUsd:overall[0]&&overall[0].final.netPnlUsd||null,
    holdNetPnlUsd:holdNet,
    fullExitAtFirstStressNetPnlUsd:state.fullExitAtFirstStress&&state.fullExitAtFirstStress.netPnlUsd||null
  };
  return state;
}
function compact(state){
  if(!state)return null;
  const ranked=state.finalized
    ?state.variants.slice().sort((a,b)=>Number(b.final&&b.final.netPnlUsd)-Number(a.final&&a.final.netPnlUsd)).slice(0,5).map(v=>({
      id:v.id,
      netPnlUsd:round(v.final&&v.final.netPnlUsd),
      deltaVsHoldNetUsd:round(v.final&&v.final.deltaVsHoldNetUsd),
      mutilationVsHoldUsd:round(v.final&&v.final.mutilationVsHoldUsd),
      benefitVsHoldUsd:round(v.final&&v.final.benefitVsHoldUsd)
    }))
    :[];
  return {
    version:state.version,decisionImpact:false,
    tp1Event:state.tp1Event,
    tp2ArmedAt:state.tp2ArmedAt,
    tp2ArmedTimestamp:state.tp2ArmedTimestamp,
    tp2ArmMfeUsd:state.tp2ArmMfeUsd,
    tp2Event:state.tp2Event,
    finalized:!!state.finalized,
    finalExit:state.finalExit,
    ranking:state.ranking,
    fullExitAtFirstStress:state.fullExitAtFirstStress,
    variantCount:Array.isArray(state.variants)?state.variants.length:0,
    topVariants:ranked
  };
}
function fullResult(state){
  if(!state)return null;
  return JSON.parse(JSON.stringify(state));
}
function step(position,result){
  if(!position||!result)return null;
  let state=position.tpOptimizationShadow;
  if(!state||state.version!==VERSION||state.direction!==position.direction||Number(state.entryPrice)!==Number(position.entryPrice)){
    state=create(position,result.marketTimestamp);
    position.tpOptimizationShadow=state;
  }
  if(state.finalized)return state;
  const actionType=String(result.action&&result.action.type||'');
  const isFullExit=actionType.startsWith('EXIT_');
  if(!isFullExit){
    const stress=stressEvidence(position,result);
    if(!state.tp1Event&&stress.ready){
      const ts=Number(result.marketTimestamp)||Date.now();
      state.tp1Event={
        timestamp:new Date(ts).toISOString(),marketTimestamp:ts,price:Number(result.price),
        currentSignedUsd:stress.currentSignedUsd,mfeUsd:stress.mfeUsd,givebackUsd:stress.givebackUsd,
        evidence:{thesisAligned:stress.thesisAligned,mfSupport:stress.mfSupport,pm:stress.pm,micro:stress.micro}
      };
      state.fullExitAtFirstStress=fullExitReference(state,result.price,ts,stress);
      for(const v of state.variants){
        if(v.tp1Fraction>0)executePartial(state,v,'tp1',v.tp1Fraction,result.price,ts,stress);
      }
    }
    armTp2(state,position);
    if(state.tp1Event&&state.tp2ArmedAt&&!state.tp2Event&&stress.ready){
      const ts=Number(result.marketTimestamp)||Date.now();
      if(ts>=Number(state.tp2ArmedAt)&&ts>Number(state.tp1Event.marketTimestamp)){
        state.tp2Event={
          timestamp:new Date(ts).toISOString(),marketTimestamp:ts,price:Number(result.price),
          currentSignedUsd:stress.currentSignedUsd,mfeUsd:stress.mfeUsd,givebackUsd:stress.givebackUsd,
          armedAt:state.tp2ArmedAt,armedMfeUsd:state.tp2ArmMfeUsd,
          evidence:{thesisAligned:stress.thesisAligned,mfSupport:stress.mfSupport,pm:stress.pm,micro:stress.micro}
        };
        for(const v of state.variants){
          if(v.tp1Fraction>0&&v.tp2FractionOfRemaining>0){
            executePartial(state,v,'tp2',v.tp2FractionOfRemaining,result.price,ts,stress);
          }
        }
      }
    }
  }
  if(isFullExit)finalize(state,position,result);
  state.lastObservedAt=Number(result.marketTimestamp)||Date.now();
  state.lastObservedPrice=Number(result.price);
  position.tpOptimizationShadow=state;
  return state;
}

module.exports={
  VERSION,TP1_FRACTIONS,TP2_FRACTIONS_OF_REMAINING,
  create,step,compact,fullResult,stressEvidence,armTp2,
  feeRate,executedQuoteNotional,executionFeeUsd,grossPnlUsd
};
