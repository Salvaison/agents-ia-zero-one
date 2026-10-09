'use strict';
const {finite,quantile,clamp}=require('../core/utils');

function micro(r){
  if(!r)return null;
  const move=Number(r.priceMove),vol=Number(r.volumeFenetreBtc),win=Number(r.winSec),cad=Number(r.cadence),price=Number(r.lastPrice);
  if(!finite(move)||!finite(price))return null;
  const flow=finite(vol)&&finite(win)&&win>0?vol/win:null;
  const yieldPx=finite(vol)&&vol>0?Math.abs(move)/vol:null;
  return {ts:Number(r.ts),move,dir:move>0?'long':move<0?'short':null,
    cadence:finite(cad)?cad:null,flow,yield:yieldPx,price};
}
function pack(a,key){
  const v=a.map(x=>x&&x[key]).filter(finite);
  return {p25:quantile(v,.25),p50:quantile(v,.5),p75:quantile(v,.75),p95:quantile(v,.95)};
}
function retained(recent,direction){
  if(!recent.length||!direction)return 0;
  const start=Number(recent[0].price),end=Number(recent[recent.length-1].price);
  const prices=recent.map(x=>Number(x.price));
  if(direction==='long'){
    const best=Math.max(...prices)-start,kept=end-start;
    return best>0?clamp(kept/best,0,1):0;
  }
  const best=start-Math.min(...prices),kept=start-end;
  return best>0?clamp(kept/best,0,1):0;
}
function evaluate(frame,thesis,opts={}){
  const all=(frame.sources.auditRows||[]).slice(-240).map(micro).filter(Boolean);
  const sinceTs=finite(opts.sinceTs)?Number(opts.sinceTs):null;
  const evidence=sinceTs===null?all:all.filter(x=>Number(x.ts)>=sinceTs);
  const recent=evidence.slice(-10),last=(recent[recent.length-1]||all[all.length-1]||null);
  const direction=thesis&&thesis.direction||null;
  if(all.length<40||!last)return {status:'UNKNOWN',direction:null,confirmed:false,authority:'CONFIRMATION_ONLY'};

  const base={yield:pack(all,'yield'),cadence:pack(all,'cadence'),flow:pack(all,'flow')};
  const y=Number(last.yield);
  const yieldVsP75=finite(y)&&finite(base.yield.p75)&&base.yield.p75>0?y/base.yield.p75:null;
  const yieldVsP95=finite(y)&&finite(base.yield.p95)&&base.yield.p95>0?y/base.yield.p95:null;
  const effort=Math.max(
    finite(last.cadence)&&finite(base.cadence.p75)&&base.cadence.p75>0?last.cadence/base.cadence.p75:0,
    finite(last.flow)&&finite(base.flow.p75)&&base.flow.p75>0?last.flow/base.flow.p75:0
  );
  const current={ts:last.ts,cadence:last.cadence,flowBtcPerSec:last.flow,yieldUsdPerBtc:last.yield,
    yieldVsP75,yieldVsP95,effortVsP75:effort};

  if(!direction){
    return {
      status:'NO_THESIS',direction:last.dir,thesisDirection:null,confirmed:false,
      current,baseline:base,evidenceWindow:sinceTs===null?'ROLLING':'POST_SETUP',sinceTs,
      authority:'CONFIRMATION_ONLY_NEVER_CREATES_DIRECTION',
      note:'NO_THESIS signifie absence de direction MCB a confirmer; les mesures ticker brutes restent observables'
    };
  }
  if(sinceTs!==null&&evidence.length<2){
    return {
      status:'FRESH_EVIDENCE_BUILDING',direction:last.dir,thesisDirection:direction,confirmed:false,
      current,baseline:base,evidenceWindow:'POST_SETUP',sinceTs,
      persistence:{alignedLast4:0,terrainRetainedFraction:0,recentDirectionalCount:evidence.filter(x=>x.dir).length},
      authority:'CONFIRMATION_ONLY_NEVER_CREATES_DIRECTION',
      note:'ticker attend des observations posterieures au setup; aucune preuve pre-setup ne compte pour une nouvelle admission'
    };
  }

  const last4=recent.slice(-4);
  const alignedCount=last4.filter(x=>x.dir===direction).length;
  const terrain=retained(recent,direction);
  const productive=last.dir===direction&&finite(y)&&finite(base.yield.p75)&&y>=base.yield.p75;
  const strong=last.dir===direction&&finite(y)&&finite(base.yield.p95)&&y>=base.yield.p95;
  const confirmed=(productive&&(alignedCount>=2||terrain>=.5))||strong;
  const opp=direction==='long'?'short':'long';
  const oppositeRows=last4.filter(x=>x.dir===opp);
  const oppositeProductive=last.dir===opp&&finite(y)&&finite(base.yield.p75)&&y>=base.yield.p75&&
    (oppositeRows.length>=2||retained(recent,opp)>=.5);
  let status='NOT_CONFIRMED';
  if(strong&&confirmed)status='STRONG_CONFIRMATION';
  else if(confirmed)status='CONFIRMED';
  else if(oppositeProductive)status='OPPOSITE_CONFIRMED';

  return {
    status,direction:last.dir,thesisDirection:direction,confirmed,oppositeConfirmed:oppositeProductive,
    evidenceWindow:sinceTs===null?'ROLLING':'POST_SETUP',sinceTs,
    current,
    persistence:{alignedLast4:alignedCount,terrainRetainedFraction:terrain,recentDirectionalCount:recent.filter(x=>x.dir).length},
    baseline:base,
    authority:'CONFIRMATION_ONLY_NEVER_CREATES_DIRECTION',
    note:'ticker confirme effort/rendement/conservation d une these MCB deja existante'
  };
}
module.exports={evaluate,micro,retained};
