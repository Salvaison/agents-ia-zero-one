'use strict';

const { finite, clamp } = require('../core/utils');

const MAX_RISK_USD = 500; // garde-fou simulateur existant, a calibrer
const RR_MIN_EXPERIMENTAL = 0.8;

function targetDistance(where, direction, price, minDistance = 0) {
  const candidates=[];
  if(direction==='long'){
    if(where.nextAbove&&where.nextAbove.distanceUsd>0)candidates.push(where.nextAbove.distanceUsd);
    if(where.nextLgiAbove&&where.nextLgiAbove.distanceUsd>0)candidates.push(where.nextLgiAbove.distanceUsd);
  } else if(direction==='short'){
    if(where.nextBelow&&where.nextBelow.distanceUsd<0)candidates.push(Math.abs(where.nextBelow.distanceUsd));
    if(where.nextLgiBelow&&where.nextLgiBelow.distanceUsd<0)candidates.push(Math.abs(where.nextLgiBelow.distanceUsd));
  }
  const usable=candidates.filter(x=>finite(x)&&x>Math.max(0,minDistance));
  return usable.length?Math.min(...usable):null;
}
function structuralRiskDistance(state,direction,price){
  const ps=state&&state.priceStructure3m||{};
  const points=direction==='long'?(ps.recentLows||[]):(ps.recentHighs||[]);
  for(let i=points.length-1;i>=0;i--){
    const p=Number(points[i]&&points[i].price);
    if(!finite(p))continue;
    const d=direction==='long'?price-p:p-price;
    if(d>0&&d<=MAX_RISK_USD)return d;
  }
  return null;
}

function statePermission(state, direction){
  const p=state.phase, lobe=state.lobe&&state.lobe.direction, ps=state.priceStructure3m||{};
  const opposingRebuild=ps.direction&&ps.direction!==direction&&String(ps.state||'').startsWith('RECONSTRUCTION_');
  const continuation=['naissance','expansion','relance','nouveau lobe'].includes(p)&&lobe===direction&&!opposingRebuild;
  const reconstruction=ps.direction===direction&&String(ps.state||'').startsWith('RECONSTRUCTION_');
  const reversal=reconstruction&&lobe!==direction&&['résolution','divergence de crête','relance stérile','bascule de polarité','respiration'].includes(p);
  const matureSame=lobe===direction&&['couronne de crête','érosion','relance stérile','résolution','extension terminale'].includes(p);
  return {allowed:continuation||reversal,continuation,reversal,matureSame,opposingRebuild,reason:continuation?'continuation structurelle':reversal?'reconstruction 3m multi-vagues':opposingRebuild?'structure 3m reconstruite en sens oppose':'structure non reconstruite'};
}

function evaluate(snapshot, context){
  const where=context.where, state=context.state, dom=context.dominance;
  const direction=dom&&dom.direction;
  const stale = snapshot.freshness && ((snapshot.freshness.marketAgeMs !== null && snapshot.freshness.marketAgeMs > 120000) ||
    (snapshot.freshness.auditAgeMs !== null && snapshot.freshness.auditAgeMs > 120000));
  if(stale) return {tradeable:false,direction:direction||null,reason:'donnees live trop anciennes',rrEstimate:null,dataFresh:false};
  if(!direction) return {tradeable:false,direction:null,reason:'aucune domination directionnelle',rrEstimate:null,dataFresh:true};
  const perm=statePermission(state,direction);
  const proof=Number(dom.proofScore)||0;
  const persistent=dom.state==='DOMINATION_PERSISTANTE';
  const erosionBlock=state.phase==='érosion';
  const dominanceEnough=persistent&&proof>=.60;
  const shockStructureOverride=!!(!erosionBlock&&perm.opposingRebuild&&dom.shock&&persistent&&proof>=.75);
  if(shockStructureOverride){perm.allowed=true;perm.reason='structure opposee mise a l epreuve par choc dominant';}
  const locationGood=where&&where.relevant&&where.confidence!=='UNRELIABLE';
  const locationBypass=!locationGood&&dom.shock&&perm.continuation;
  const structuralRisk=structuralRiskDistance(state,direction,snapshot.market.price);
  const riskUsd=finite(structuralRisk)?structuralRisk:MAX_RISK_USD;
  // Ignore une micro-zone immediatement collee au prix comme objectif final:
  // elle appartient souvent a la zone d'interaction WHERE elle-meme.
  const rewardUsd=targetDistance(where||{},direction,snapshot.market.price,Math.max(25,riskUsd*.35));
  const rr=finite(rewardUsd)&&riskUsd>0?rewardUsd/riskUsd:null;
  const travelled=dom.window&&finite(dom.window.startPrice)?Math.abs(snapshot.market.price-dom.window.startPrice):0;
  const waitCost=finite(rewardUsd)&&rewardUsd>0?clamp(travelled/rewardUsd,0,2):null;
  const rrOkay=rr===null ? (dom.shock&&persistent) : rr>=RR_MIN_EXPERIMENTAL;
  const tradeable=!erosionBlock&&perm.allowed&&dominanceEnough&&(locationGood||locationBypass)&&rrOkay;
  return {tradeable,direction,reason:tradeable?'preuve suffisante / risque acceptable':[
      erosionBlock?'phase érosion: pas de nouvelle entrée':null,!perm.allowed?perm.reason:null,!dominanceEnough?'domination non persistante':null,
      !(locationGood||locationBypass)?'WHERE absent/non fiable hors choc':null,!rrOkay?'R/R insuffisant ou territoire consomme':null
    ].filter(Boolean).join(' ; '),
    statePermission:perm,dominanceEnough,erosionBlock,shockStructureOverride,locationMode:locationGood?'OBSERVED':(locationBypass?'BYPASSED_UNRELIABLE_OR_ABSENT_IN_SHOCK':'ABSENT'),
    rewardUsd,riskUsd,structuralRiskUsd:structuralRisk,rrEstimate:rr,waitCost,proofScore:proof,
    thresholdsExperimental:{rrMin:RR_MIN_EXPERIMENTAL,maxRiskUsd:MAX_RISK_USD},
  };
}

module.exports={evaluate,statePermission,targetDistance,structuralRiskDistance};
