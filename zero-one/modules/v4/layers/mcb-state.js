'use strict';
const {finite,median,sign,clamp}=require('../core/utils');
const structuralTrajectory=require('./structural-trajectory');

const MAJOR_PAIR_SPAN_LBW=80;
const ECONOMIC_MOVE_MIN_USD=220;
const ECONOMIC_MOVE_PREFERRED_USD=250;
const GAIN_RETENTION_REFERENCE_USD=180;

function confirmedSeries(src){
  if(!src)return[];
  return (src.history||[])
    .filter(r=>finite(r.lt_blue_wave)&&finite(r.close)&&finite(r.ts))
    .slice()
    .sort((a,b)=>Number(a.ts)-Number(b.ts));
}
function liveRow(src){
  const r=src&&src.live;
  return r&&finite(r.lt_blue_wave)&&finite(r.close)&&finite(r.ts)?r:null;
}
function combined(src){
  const a=confirmedSeries(src);
  const l=liveRow(src);
  if(l){
    const i=a.findIndex(r=>Number(r.ts)===Number(l.ts));
    if(i>=0)a[i]={...a[i],...l};
    else if(!a.length||Number(l.ts)>Number(a[a.length-1].ts))a.push(l);
  }
  return a.sort((x,y)=>Number(x.ts)-Number(y.ts));
}
function lobeFromRows(rows,sgn,completedAt=null){
  if(!rows.length||!sgn)return null;
  let ex=rows[0],px=rows[0],pv=sgn>0?Number(px.high):Number(px.low);
  for(const r of rows){
    const v=Number(r.lt_blue_wave),e=Number(ex.lt_blue_wave);
    if((sgn>0&&v>e)||(sgn<0&&v<e))ex=r;
    const p=sgn>0?Number(r.high):Number(r.low);
    if(finite(p)&&((sgn>0&&p>pv)||(sgn<0&&p<pv))){pv=p;px=r;}
  }
  return {
    sign:sgn,type:sgn>0?'CRETE':'CREUX',directionIntoLobe:sgn>0?'long':'short',
    reversalCandidateDirection:sgn>0?'short':'long',
    startTs:Number(rows[0].ts),endTs:Number(rows[rows.length-1].ts),
    startTimestamp:rows[0].timestamp,endTimestamp:rows[rows.length-1].timestamp,
    completedAt:completedAt&&completedAt.timestamp||null,completed:!!completedAt,
    extremeTs:Number(ex.ts),extremeTimestamp:ex.timestamp,extremeLbw:Number(ex.lt_blue_wave),
    extremePrice:sgn>0?Number(ex.high):Number(ex.low),
    priceExtreme:pv,priceExtremeTs:Number(px.ts),priceExtremeTimestamp:px.timestamp,
    durationMinutes:Math.max(0,(Number(rows[rows.length-1].ts)-Number(rows[0].ts))/60000),
    bars:rows.length,currentLbw:Number(rows[rows.length-1].lt_blue_wave)
  };
}
function splitLobes(series){
  const completed=[];let seg=[],sgn=0;
  for(const r of series){
    const s=sign(r.lt_blue_wave); if(!s)continue;
    if(!sgn){sgn=s;seg=[r];continue;}
    if(s===sgn){seg.push(r);continue;}
    const l=lobeFromRows(seg,sgn,r); if(l)completed.push(l);
    sgn=s;seg=[r];
  }
  return {completed,current:lobeFromRows(seg,sgn,null)};
}
function relationship(prev,cur,recentPriceLegs=[]){
  if(!prev||!cur)return null;
  const lbwSpan=Math.abs(Number(cur.extremeLbw)-Number(prev.extremeLbw));
  const priceDelta=Number(cur.priceExtreme)-Number(prev.priceExtreme);
  const priceMagnitude=Math.abs(priceDelta);
  const med=median(recentPriceLegs);
  const priceScaleVsMedian=finite(med)&&Number(med)>0?priceMagnitude/Number(med):null;
  const oppositeSides=sign(prev.extremeLbw)!==sign(cur.extremeLbw)&&sign(prev.extremeLbw)!==0&&sign(cur.extremeLbw)!==0;
  const majorPair=!!(oppositeSides&&lbwSpan>=MAJOR_PAIR_SPAN_LBW);
  return {
    fromType:prev.type,toType:cur.type,
    lbwSpan,priceDeltaUsd:priceDelta,priceMagnitudeUsd:priceMagnitude,
    durationMinutes:Math.abs(Number(cur.extremeTs)-Number(prev.extremeTs))/60000,
    oppositeSides,
    oscillatorMajorEvidence:majorPair,
    oscillatorMajorReferenceOnly:true,
    pairQuality:{
      class:majorPair?'PAIR_MAJOR_QUALITATIVE':'PAIR_SUB80_QUALITATIVE',
      lbwSpan,
      referenceSpanLbw:MAJOR_PAIR_SPAN_LBW,
      oppositeSides,
      decisionImpact:false,
      semantic:'80 LBW = repere qualitatif entre deux E15 opposes de part et autre de zero; jamais un veto'
    },
    economicScale:{
      priceMagnitudeUsd:priceMagnitude,
      minimumUsefulUsd:ECONOMIC_MOVE_MIN_USD,
      preferredUsefulUsd:ECONOMIC_MOVE_PREFERRED_USD,
      gainRetentionReferenceUsd:GAIN_RETENTION_REFERENCE_USD,
      ratioVsMinimum:ECONOMIC_MOVE_MIN_USD>0?priceMagnitude/ECONOMIC_MOVE_MIN_USD:null,
      ratioVsPreferred:ECONOMIC_MOVE_PREFERRED_USD>0?priceMagnitude/ECONOMIC_MOVE_PREFERRED_USD:null,
      decisionImpact:false,
      semantic:'220 USD = minimum economique indicatif; 250 USD = reference preferee pour laisser respirer; 180 USD = gain conserve vise apres respiration; aucun de ces nombres ne cree une direction'
    },
    priceScaleVsMedian,
    priceStructuralCandidate:finite(priceScaleVsMedian)&&priceScaleVsMedian>=1.5,
    semantic:'relation E15↔E15 descriptive; amplitude LBW/prix qualifie la structure mais ne retire jamais le droit de proposer une these MCB'
  };
}
function decorateCompleted(completed){
  const out=[];const legs=[];
  for(let i=0;i<completed.length;i++){
    const prev=i?completed[i-1]:null;
    const rel=relationship(prev,completed[i],legs.slice(-6));
    const x={...completed[i],relationFromPrevious:rel};
    out.push(x);
    if(rel&&finite(rel.priceMagnitudeUsd))legs.push(rel.priceMagnitudeUsd);
  }
  return out;
}
function applyLiveToConfirmedCurrent(base,live){
  if(!base)return null;
  const out={...base,confirmedSide:true,confirmedBars:base.bars,liveLbw:null,liveTimestamp:null,
    liveZeroCross:{detected:false,confirmed:false,directionIntoProvisionalLobe:null}};
  if(!live||Number(live.ts)<Number(base.endTs))return out;
  const lv=Number(live.lt_blue_wave),ls=sign(lv);
  out.liveLbw=lv;out.liveTimestamp=live.timestamp||null;
  out.endTs=Math.max(Number(out.endTs),Number(live.ts));
  out.endTimestamp=live.timestamp||out.endTimestamp;
  out.durationMinutes=Math.max(0,(Number(out.endTs)-Number(out.startTs))/60000);
  if(Number(live.ts)>Number(base.endTs))out.bars=base.bars+1;
  if(ls===base.sign||ls===0){
    out.currentLbw=lv;
    if(ls===base.sign){
      if((base.sign>0&&lv>Number(out.extremeLbw))||(base.sign<0&&lv<Number(out.extremeLbw))){
        out.extremeLbw=lv;out.extremeTs=Number(live.ts);out.extremeTimestamp=live.timestamp;
        out.extremePrice=base.sign>0?Number(live.high):Number(live.low);
      }
      const p=base.sign>0?Number(live.high):Number(live.low);
      if(finite(p)&&((base.sign>0&&p>Number(out.priceExtreme))||(base.sign<0&&p<Number(out.priceExtreme)))){
        out.priceExtreme=p;out.priceExtremeTs=Number(live.ts);out.priceExtremeTimestamp=live.timestamp;
      }
    }
  }else{
    out.currentLbw=lv;
    out.liveZeroCross={
      detected:true,confirmed:false,
      directionIntoProvisionalLobe:ls>0?'long':'short',
      liveLbw:lv,timestamp:live.timestamp||null
    };
  }
  return out;
}
function preserveLiveExtreme(current,previousCurrent){
  if(!current||!previousCurrent)return current;
  if(Number(current.startTs)!==Number(previousCurrent.startTs)||Number(current.sign)!==Number(previousCurrent.sign))return current;
  const out={...current};
  const pe=Number(previousCurrent.extremeLbw),ce=Number(current.extremeLbw);
  if(finite(pe)&&((current.sign>0&&pe>ce)||(current.sign<0&&pe<ce))){
    out.extremeLbw=pe;
    out.extremeTs=previousCurrent.extremeTs;
    out.extremeTimestamp=previousCurrent.extremeTimestamp;
    out.extremePrice=previousCurrent.extremePrice;
    out.persistentLiveExtreme=true;
  }
  const pp=Number(previousCurrent.priceExtreme),cp=Number(current.priceExtreme);
  if(finite(pp)&&((current.sign>0&&pp>cp)||(current.sign<0&&pp<cp))){
    out.priceExtreme=pp;
    out.priceExtremeTs=previousCurrent.priceExtremeTs;
    out.priceExtremeTimestamp=previousCurrent.priceExtremeTimestamp;
    out.persistentLivePriceExtreme=true;
  }
  return out;
}
function currentLobeState(current,prevCompleted,completedDecorated,marketPrice){
  if(!current)return null;
  const absExtreme=Math.abs(Number(current.extremeLbw));
  const recoveryLbw=current.liveZeroCross&&current.liveZeroCross.detected?0:Math.abs(Number(current.currentLbw));
  const recovery=absExtreme>0?clamp((absExtreme-recoveryLbw)/absExtreme,0,1):0;
  const priorLegs=completedDecorated.map(x=>x.relationFromPrevious&&x.relationFromPrevious.priceMagnitudeUsd).filter(finite).slice(-6);
  const rel=relationship(prevCompleted,current,priorLegs);
  const priceReversalUsd=current.sign<0
    ? Number(marketPrice)-Number(current.priceExtreme)
    : Number(current.priceExtreme)-Number(marketPrice);
  let maturity='DEVELOPING';
  if(recovery<.12)maturity='EXTENDING';
  else if(recovery>=.35)maturity='MATURE_REVERSING';
  else if(recovery>=.18)maturity='MATURE';
  const pairClass=rel&&rel.pairQuality&&rel.pairQuality.class||'UNPAIRED';
  return {
    ...current,recoveryFraction:recovery,recoveryLbwUsed:recoveryLbw,relationshipFromPrevious:rel,
    priceReversalFromLobeExtremeUsd:priceReversalUsd,
    maturity,
    structuralEvidence:{
      oscillatorMajorQualitative:!!(rel&&rel.oscillatorMajorEvidence),
      priceCandidateQualitative:!!(rel&&rel.priceStructuralCandidate),
      decisionImpact:false
    },
    e15Class:pairClass==='PAIR_MAJOR_QUALITATIVE'
      ?'E15_PAIR_MAJOR_QUALITATIVE'
      :(rel?'E15_PAIR_SUB80_QUALITATIVE':'E15_CANDIDATE'),
    decisionEligibility:{
      blockedBy80:false,
      majorReferenceSpanLbw:MAJOR_PAIR_SPAN_LBW,
      economicMoveMinimumUsd:ECONOMIC_MOVE_MIN_USD,
      economicMovePreferredUsd:ECONOMIC_MOVE_PREFERRED_USD,
      gainRetentionReferenceUsd:GAIN_RETENTION_REFERENCE_USD,
      semantic:'qualite E15 et eligibilite directionnelle sont separees'
    },
    note:'80 mesure la qualite de la relation entre deux E15 opposes; il ne donne ni ne retire une direction'
  };
}
function nestedState(src){
  const series=combined(src); const parts=splitLobes(series); const c=parts.current;
  if(!c)return {available:false};
  const cur=series[series.length-1],prev=series[series.length-2];
  const slope=cur&&prev?Number(cur.lt_blue_wave)-Number(prev.lt_blue_wave):null;
  const turn=finite(slope)&&Number(c.currentLbw)<0&&slope>0?'long':
    finite(slope)&&Number(c.currentLbw)>0&&slope<0?'short':null;
  const structural=structuralTrajectory.evaluate(src,'3m');
  return {available:true,currentLbw:c.currentLbw,extremeLbw:c.extremeLbw,
    lobeSign:c.sign,lobeDirection:c.sign>0?'long':c.sign<0?'short':null,
    startTs:Number(c.startTs),startTimestamp:c.startTimestamp,
    extremeTs:Number(c.extremeTs),extremeTimestamp:c.extremeTimestamp,
    recoveryFraction:Math.abs(c.extremeLbw)>0?clamp((Math.abs(c.extremeLbw)-Math.abs(c.currentLbw))/Math.abs(c.extremeLbw),0,1):0,
    slopeLbw:slope,turningDirection:turn,currentTimestamp:cur&&cur.timestamp||null,
    structuralDirection:structural.structuralDirection||null,
    structuralState:structural.structuralState||null,
    structuralPivot:structural.lastStructuralPivot||null,
    structuralConfirmedAt:structural.structuralConfirmedAt||null,
    structuralTrajectory:structural,
    note:'3m lobeSign = position de la vague; structuralDirection E3→E3 = trajet causal persistant; turningDirection reste tactique'};
}
function evaluate(frame,previousMcb=null){
  const tfs=frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs||{};
  const s15=confirmedSeries(tfs['15m']);
  const parts=splitLobes(s15);
  const completed=decorateCompleted(parts.completed);
  const prev=completed[completed.length-1]||null;
  let current=applyLiveToConfirmedCurrent(parts.current,liveRow(tfs['15m']));
  current=preserveLiveExtreme(current,previousMcb&&previousMcb.currentLobe||null);
  current=currentLobeState(current,prev,completed,frame.market.price);
  const structural15=structuralTrajectory.evaluate(tfs['15m'],'15m');
  if(current){
    current={
      ...current,
      lobeSign:current.sign,
      lobeDirection:current.directionIntoLobe||null,
      structuralDirection:structural15.structuralDirection||null,
      structuralState:structural15.structuralState||null,
      structuralPivot:structural15.lastStructuralPivot||null,
      structuralConfirmedAt:structural15.structuralConfirmedAt||null,
      structuralTrajectory:structural15
    };
  }
  const lastCompleted=completed[completed.length-1]||null;
  const previousCompleted=completed.length>1?completed[completed.length-2]:null;
  const latestRel=lastCompleted&&lastCompleted.relationFromPrevious||null;
  const lastMajor=completed.slice().reverse().find(x=>x.relationFromPrevious&&x.relationFromPrevious.oscillatorMajorEvidence)||null;
  return {
    version:'v4-mcb-state-0.3',decisionAuthority:'PRIMARY_DIRECTION_SOURCE',
    marketTimestamp:frame.market.timestamp,price:frame.market.price,
    currentLobe:current,
    completedLobes:completed.slice(-12),
    lastCompleted,previousCompleted,
    lastQualifiedOscillatorE15:lastMajor,
    lastMajorQualitativePair:lastMajor,
    latestCompletedRelation:latestRel,
    structural15m:structural15,
    nested3m:nestedState(tfs['3m']),
    qualitativeReferences:{
      majorPairSpanLbw:MAJOR_PAIR_SPAN_LBW,
      economicMoveMinimumUsd:ECONOMIC_MOVE_MIN_USD, economicMovePreferredUsd:ECONOMIC_MOVE_PREFERRED_USD, gainRetentionReferenceUsd:GAIN_RETENTION_REFERENCE_USD,
      decisionImpact:false
    },
    causalContract:{
      currentLobeMayUseLive:true,
      completedLobeRequiresConfirmedZeroCross:true,
      liveZeroCrossNeverCompletes15mLobe:true,
      persistentLiveExtreme:true,
      majorLabelNeverFromOneE15Magnitude:true,
      majorPairRequiresOppositeSides:true,
      span80IsQualitativeOnly:true,
      lobeSignIsLocationNotDirection:true,
      structuralDirectionUsesCausalEToE:true
    }
  };
}
module.exports={
  evaluate,combined,confirmedSeries,liveRow,splitLobes,lobeFromRows,relationship,currentLobeState,nestedState,
  applyLiveToConfirmedCurrent,preserveLiveExtreme,MAJOR_PAIR_SPAN_LBW,ECONOMIC_MOVE_MIN_USD,ECONOMIC_MOVE_PREFERRED_USD,GAIN_RETENTION_REFERENCE_USD
};
