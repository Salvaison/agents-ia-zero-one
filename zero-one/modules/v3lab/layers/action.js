'use strict';
function opposite(d){return d==='long'?'short':d==='short'?'long':null;}
function finite(v){return Number.isFinite(Number(v));}
function positionEntryMode(pos){
  return pos&&pos.entryMode || pos&&pos.context&&pos.context.action&&pos.context.action.entryMode ||
    pos&&pos.context&&pos.context.risk&&pos.context.risk.entryMode || 'PHASE_CONTINUATION';
}
function positionProtectionPrice(pos){
  if(finite(pos&&pos.protectionPrice))return Number(pos.protectionPrice);
  const p=pos&&pos.context&&pos.context.risk&&pos.context.risk.protection&&pos.context.risk.protection.price;
  return finite(p)?Number(p):null;
}
function evaluate(frame,ctx){
  const pos=ctx.previous&&ctx.previous.position||null,w=ctx.wave||{},d=ctx.dominance||{},r=ctx.risk||{},rev=ctx.reversal||{};
  if(!pos){
    if(r.entryAllowed&&r.direction){
      const why=r.entryMode==='STRUCTURAL_REASSERTION'?
        'V3 these E15 prix + reassertion structurelle 3m + dominance + risk; WHERE descriptif':
        r.entryMode==='REVERSAL_FORMING'?
          'V3 reversal forming sans these E15 prix disponible + dominance + turning point':
          'V3 phase LBW alignee avec these E15 prix + dominance + maturite + risk; WHERE descriptif';
      return {type:r.direction==='long'?'ENTER_LONG':'ENTER_SHORT',direction:r.direction,entryMode:r.entryMode,reason:why};
    }
    if(r.direction)return {type:'WATCH',direction:r.direction,entryMode:r.entryMode,reason:r.reason||'preuve en formation'};
    if(rev.candidateDirection&&rev.evidence&&rev.evidence.turningReady){
      return {type:'WATCH',direction:rev.candidateDirection,entryMode:'REVERSAL_CANDIDATE',reason:r.reason||'reversal en formation incomplet'};
    }
    if(d.direction)return {type:'WATCH',direction:d.direction,entryMode:r.entryMode,reason:r.reason||'preuve en formation'};
    return {type:'NO_TRADE',direction:null,reason:r.reason||'aucune these'};
  }
  const opp=opposite(pos.direction),m=pos.metrics||{},adverse=Number(m.adverseUsd)||0;
  const entryMode=positionEntryMode(pos);
  const protectionPrice=positionProtectionPrice(pos);
  const price=Number(frame.market.price);
  const completedLeg=w.completedLeg||w.structural||{};
  const completedLegOpposite=completedLeg.available===true&&completedLeg.direction===opp;
  const completedLegExitCounterfactual=completedLegOpposite?{
    wouldExit:true,direction:pos.direction,oppositeCompletedLegDirection:completedLeg.direction,
    start:completedLeg.start||null,end:completedLeg.end||null,
    reason:'ancienne logique: leg E15→E15 acheve oppose a la position'
  }:null;
  const p90AlertOnly=pos.p90Policy==='ALERT_ONLY';
  const oppDom=d.direction===opp&&d.state==='DOMINATION_PERSISTANTE'&&Number(d.proofScore)>=.60;
  const unusual=r.respiration&&r.respiration.currentState==='UNUSUAL';
  const p90AttackAlert=oppDom&&unusual?{
    active:true,policy:p90AlertOnly?'ALERT_ONLY':'LEGACY_EXIT',
    direction:opp,proofScore:Number(d.proofScore)||0,persistCount:Number(d.persistCount)||0,
    retainedFraction:Number(d.retainedFraction)||0,
    waveCounterExcursionUsd:Number(r.respiration&&r.respiration.currentCounterExcursionUsd)||0,
    p90Usd:Number(r.respiration&&r.respiration.p90)||null,
    semantic:'FORCE_OF_OPPOSITE_ATTACK_ONLY_NOT_ACCEPTANCE_OR_SUCCESS'
  }:null;
  const emit=o=>{
    let out={...o};
    if(completedLegExitCounterfactual)out={...out,counterfactual:{...(out.counterfactual||{}),completedLegExit:completedLegExitCounterfactual}};
    if(p90AttackAlert)out={...out,alerts:{...(out.alerts||{}),oppositeAttackP90:p90AttackAlert}};
    return out;
  };
  const entryProtectionBreached=finite(protectionPrice)&&
    (pos.direction==='long'?price<protectionPrice:pos.direction==='short'?price>protectionPrice:false);
  if(adverse>=Number(r.emergencyGuardUsd||500))return emit({type:'EXIT_RISK',direction:pos.direction,reason:'garde-fou d urgence hors respiration normale'});
  if(entryProtectionBreached)return emit({type:'EXIT_RISK',direction:pos.direction,
    reason:'limite de protection prix d entree franchie; ne confirme pas la these opposee'});
  const reversalPending=entryMode==='REVERSAL_FORMING'&&!pos.reversalConfirmed;

  // Transfer-aware giveback exit: once a confirmed trade has produced a meaningful
  // excursion, a durable opposite camp that retains terrain should not be ignored
  // until the 15m phase finally flips. This is deliberately contextual rather than
  // a fixed trailing stop.
  const mfeUsd=Math.max(0,Number(m.mfeUsd)||0);
  const currentFavorableUsd=Number(m.favorableUsd)||0;
  const givebackUsd=mfeUsd>0?Math.max(0,mfeUsd-Math.max(0,currentFavorableUsd)):0;
  const givebackFraction=mfeUsd>0?givebackUsd/mfeUsd:0;
  const entryRiskUsd=finite(protectionPrice)&&finite(pos.entryPrice)?Math.abs(Number(pos.entryPrice)-Number(protectionPrice)):null;
  const p50=Number(r.respiration&&r.respiration.p50);
  const maturityThresholdUsd=Math.max(
    finite(entryRiskUsd)?entryRiskUsd*.5:0,
    finite(p50)?p50*.25:25
  );
  const meaningfulMfe=mfeUsd>=maturityThresholdUsd;
  const durableOpp=oppDom&&Number(d.proofScore)>=.65&&Number(d.retainedFraction)>=.80&&Number(d.persistCount)>=3;
  if(!reversalPending&&durableOpp&&meaningfulMfe&&givebackFraction>=.50){
    return emit({type:'EXIT_EXECUTION',direction:pos.direction,
      reason:'transfert adverse durable + terrain favorable rendu apres excursion significative',
      evidence:{oppositeDirection:opp,proofScore:Number(d.proofScore),retainedFraction:Number(d.retainedFraction),persistCount:Number(d.persistCount),
        mfeUsd,currentFavorableUsd,givebackUsd,givebackFraction,entryRiskUsd,maturityThresholdUsd}});
  }
  if(oppDom&&unusual&&!p90AlertOnly)
    return emit({type:'EXIT_EXECUTION',direction:pos.direction,reason:'dominance opposee + respiration > p90 du regime'});
  if(reversalPending)return emit({type:'HOLD',direction:pos.direction,
    reason:oppDom&&unusual&&p90AlertOnly?'reversal forming: attaque adverse >P90 sous observation, acceptation non demontree':
      (oppDom?'reversal forming: opposition toleree avant confirmation 15m':'reversal forming: attente confirmation 15m')});
  return emit({type:'HOLD',direction:pos.direction,
    reason:oppDom&&unusual&&p90AlertOnly?'attaque adverse >P90 sous observation; pas de sortie sans transfert/giveback ou risque':
      (oppDom?'dominance opposee toleree tant que le transfert/giveback reste insuffisant':'these V3 non falsifiee')});
}
module.exports={evaluate};
