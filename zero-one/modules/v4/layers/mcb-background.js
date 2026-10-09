'use strict';
const {finite,clamp}=require('../core/utils');
const mcbState=require('./mcb-state');
const structuralTrajectory=require('./structural-trajectory');

function structuralTurns(src,tf){return structuralTrajectory.structuralTurns(src,tf);}
function structuralTrajectoryView(src,tf){return structuralTrajectory.evaluate(src,tf);}

function tfView(src,tf){
  const hist=mcbState.confirmedSeries(src);
  if(!hist.length)return {timeframe:tf,available:false};
  const parts=mcbState.splitLobes(hist);
  let cur=mcbState.applyLiveToConfirmedCurrent(parts.current,mcbState.liveRow(src));
  if(!cur)return {timeframe:tf,available:false};
  const live=mcbState.liveRow(src);
  const latestLbw=finite(cur.currentLbw)?Number(cur.currentLbw):Number(cur.extremeLbw);
  const extreme=Math.abs(Number(cur.extremeLbw));
  const recovery=extreme>0?clamp((extreme-Math.abs(latestLbw))/extreme,0,1):0;
  const prev=hist.length>1?hist[hist.length-2]:null;
  const lastConfirmed=hist[hist.length-1]||null;
  const reference=live&&finite(live.lt_blue_wave)?live:lastConfirmed;
  const slope=reference&&prev&&finite(reference.lt_blue_wave)&&finite(prev.lt_blue_wave)
    ?Number(reference.lt_blue_wave)-Number(prev.lt_blue_wave):null;

  let turningDirection=null;
  if(recovery>=.18&&finite(slope)){
    if(cur.sign<0&&slope>0)turningDirection='long';
    if(cur.sign>0&&slope<0)turningDirection='short';
  }
  const legacyDirection=turningDirection||(cur.sign>0?'long':cur.sign<0?'short':null);

  let phase='DEVELOPING';
  if(recovery<.12)phase='EXTENDING';
  else if(recovery>=.35)phase='REVERSING';
  else if(recovery>=.18)phase='TURNING';

  const structural=structuralTrajectoryView(src,tf);

  return {
    timeframe:tf,available:true,
    // Kept for diagnostics/backward compatibility only.
    direction:legacyDirection,
    legacyDirection,
    phase,turningDirection,
    lobeType:cur.type,lobeSign:cur.sign,
    lobeDirection:cur.sign>0?'long':cur.sign<0?'short':null,
    currentLbw:latestLbw,extremeLbw:Number(cur.extremeLbw),
    recoveryFraction:recovery,slopeLbw:slope,
    startTs:Number(cur.startTs),startTimestamp:cur.startTimestamp,
    currentTimestamp:(live&&live.timestamp)||(lastConfirmed&&lastConfirmed.timestamp)||null,
    structuralDirection:structural.structuralDirection||null,
    structuralState:structural.structuralState||null,
    structuralPivot:structural.lastStructuralPivot||null,
    structuralConfirmedAt:structural.structuralConfirmedAt||null,
    structuralTrajectory:structural,
    source:live?'LIVE_PLUS_CONFIRMED':'CONFIRMED',
    semantic:'lobeSign/lobeDirection describe wave location; structuralDirection E→E is persistent directional context'
  };
}

function relation(direction,view){
  if(!direction||!view||!view.available||!view.direction)return 'UNKNOWN';
  return view.direction===direction?'WITH_BACKGROUND':'AGAINST_BACKGROUND';
}

function structuralRelation(direction,view){
  if(!direction||!view||!view.available)return 'UNKNOWN';
  const d=view.structuralDirection||view.direction||null;
  if(!d)return 'UNKNOWN';
  return d===direction?'WITH_BACKGROUND':'AGAINST_BACKGROUND';
}

function evaluate(frame,candidateDirection){
  const tfs=frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs||{};
  const h1=tfView(tfs['1h'],'1h');
  const h4=tfView(tfs['4h'],'4h');
  const d1=tfView(tfs['1d'],'1d');
  const w1=tfView(tfs['1w'],'1w');

  const legacyPrimaryRelation=relation(candidateDirection,h1);
  const primary=structuralRelation(candidateDirection,h1);

  const macro=[
    {tf:'4h',relation:structuralRelation(candidateDirection,h4),view:h4},
    {tf:'1d',relation:structuralRelation(candidateDirection,d1),view:d1}
  ];
  const macroAligned=macro.filter(x=>x.relation==='WITH_BACKGROUND').length;
  const macroOpposed=macro.filter(x=>x.relation==='AGAINST_BACKGROUND').length;
  const macroShadow=macroAligned===2?'STRONG_WITH_BACKGROUND_SHADOW':
    macroOpposed===2?'STRONG_AGAINST_BACKGROUND_SHADOW':'MIXED_SHADOW';

  return {
    candidateDirection:candidateDirection||null,
    primaryTimeframe:'1h',
    primaryRelation:primary,
    legacyPrimaryRelation,
    structuralRelation:primary,
    oneHour:h1,
    fourHour:h4,
    daily:d1,
    weekly:w1,
    macroShadow,
    macroDecisionImpact:false,
    weeklyDecisionImpact:false,
    authority:'MCB_BACKGROUND_1H_STRUCTURAL_PRIMARY_4H_D_W_SHADOW',
    note:'1h structuralDirection E→E is actionable context; 4h/D/W are shadow qualifiers. lobeSign is never used as a synonym for structural direction'
  };
}

module.exports={evaluate,tfView,relation,structuralRelation,structuralTurns,structuralTrajectory:structuralTrajectoryView};
