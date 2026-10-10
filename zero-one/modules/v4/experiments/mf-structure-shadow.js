'use strict';

const {finite}=require('../core/utils');
const mcbState=require('../layers/mcb-state');

const VERSION='mf-structure-shadow-v0.2-temporal';
const TF='15m';
const CONFIRM_BARS=2;
const TEMPORAL_WINDOWS={m30:2,h1:4,h2:8,h4:16};
const TEMPORAL_COHERENCE_MIN=.25;
const TEMPORAL_PERSISTENCE_MIN=.625;

function rowsFromSource(src){
  return mcbState.confirmedSeries(src)
    .filter(r=>finite(r.money_flow))
    .map(r=>({
      ts:Number(r.ts),
      timestamp:r.timestamp||new Date(Number(r.ts)).toISOString(),
      mf:Number(r.money_flow),
      close:finite(r.close)?Number(r.close):null
    }));
}

function temporalRows(src){
  const rows=rowsFromSource(src);
  const live=src&&src.live&&finite(src.live.money_flow)&&finite(src.live.close)?{
    ts:Number(src.live.ts),
    timestamp:src.live.timestamp||new Date(Number(src.live.ts)).toISOString(),
    mf:Number(src.live.money_flow),
    close:Number(src.live.close)
  }:null;
  if(live&&Number.isFinite(live.ts)){
    const last=rows[rows.length-1];
    if(last&&Number(last.ts)===live.ts)rows[rows.length-1]=live;
    else rows.push(live);
  }
  rows.sort((a,b)=>Number(a.ts)-Number(b.ts));
  return rows;
}

function temporalWindow(rows,bars){
  const n=Math.max(1,Number(bars)||1);
  const a=(rows||[]).slice(-(n+1));
  if(a.length<2)return null;
  const start=a[0],end=a[a.length-1];
  const deltaMf=Number(end.mf)-Number(start.mf);
  const deltaPriceUsd=Number(end.close)-Number(start.close);
  let grossMf=0,grossPriceUsd=0,alignedMfSteps=0,nonZeroMfSteps=0;
  for(let i=1;i<a.length;i++){
    const dm=Number(a[i].mf)-Number(a[i-1].mf);
    const dp=Number(a[i].close)-Number(a[i-1].close);
    grossMf+=Math.abs(dm);
    grossPriceUsd+=Math.abs(dp);
    if(dm!==0){
      nonZeroMfSteps++;
      if(Math.sign(dm)===Math.sign(deltaMf))alignedMfSteps++;
    }
  }
  const direction=deltaMf>0?'long':deltaMf<0?'short':null;
  const priceDirection=deltaPriceUsd>0?'long':deltaPriceUsd<0?'short':null;
  const mfPathEfficiency=grossMf>0?Math.abs(deltaMf)/grossMf:0;
  const stepPersistence=nonZeroMfSteps>0?alignedMfSteps/nonZeroMfSteps:0;
  const priceEfficiency=grossPriceUsd>0?Math.abs(deltaPriceUsd)/grossPriceUsd:0;
  return {
    bars:a.length-1,
    startTs:Number(start.ts),endTs:Number(end.ts),
    startTimestamp:start.timestamp||new Date(Number(start.ts)).toISOString(),
    endTimestamp:end.timestamp||new Date(Number(end.ts)).toISOString(),
    startMf:Number(start.mf),endMf:Number(end.mf),deltaMf,
    grossMf,mfPathEfficiency,stepPersistence,
    startPrice:Number(start.close),endPrice:Number(end.close),
    deltaPriceUsd,grossPriceUsd,priceEfficiency,
    usdPerMfPoint:Math.abs(deltaMf)>0?Math.abs(deltaPriceUsd)/Math.abs(deltaMf):null,
    direction,priceDirection,
    priceRelation:!direction||!priceDirection?'UNRESOLVED':direction===priceDirection?'ALIGNED_WITH_MF':'OPPOSES_MF'
  };
}

function temporalCoherent(h){
  return !!(h&&h.direction&&Number(h.mfPathEfficiency)>=TEMPORAL_COHERENCE_MIN&&Number(h.stepPersistence)>=TEMPORAL_PERSISTENCE_MIN);
}

function temporalMemory(rows,candidateDirection=null){
  const horizons={};
  for(const [key,bars] of Object.entries(TEMPORAL_WINDOWS))horizons[key]=temporalWindow(rows,bars);
  const h30=horizons.m30,h1=horizons.h1,h2=horizons.h2,h4=horizons.h4;

  let memoryHorizon=null,memory=null;
  if(temporalCoherent(h4)){memoryHorizon='h4';memory=h4;}
  else if(temporalCoherent(h2)){memoryHorizon='h2';memory=h2;}
  else if(temporalCoherent(h1)){memoryHorizon='h1';memory=h1;}

  const memoryDirection=memory&&memory.direction||null;
  const tacticalDirection=h30&&h30.direction||null;
  let state='MIXED_OR_FLAT';
  if(memoryDirection==='long'&&tacticalDirection==='short')state='RISING_WITH_PULLBACK';
  else if(memoryDirection==='long'&&tacticalDirection==='long')state='RISING_AND_TRANSLATING';
  else if(memoryDirection==='short'&&tacticalDirection==='long')state='FALLING_WITH_RECOVERY';
  else if(memoryDirection==='short'&&tacticalDirection==='short')state='FALLING_AND_TRANSLATING';
  else if(memoryDirection==='long')state='RISING_BACKGROUND';
  else if(memoryDirection==='short')state='FALLING_BACKGROUND';
  else if(tacticalDirection==='long')state='BUILDING_UP';
  else if(tacticalDirection==='short')state='BUILDING_DOWN';

  const supportsMemory=!!(candidateDirection&&memoryDirection&&candidateDirection===memoryDirection);
  const opposesMemory=!!(candidateDirection&&memoryDirection&&candidateDirection!==memoryDirection);
  const tacticalWithCandidate=!!(candidateDirection&&tacticalDirection&&candidateDirection===tacticalDirection);
  let candidateState='NO_CANDIDATE_OR_MEMORY';
  if(opposesMemory&&tacticalWithCandidate){
    candidateState='TACTICAL_'+String(candidateDirection).toUpperCase()+'_AGAINST_'+String(memoryDirection).toUpperCase()+'_MF_MEMORY';
  }else if(opposesMemory){
    candidateState='MF_MEMORY_OPPOSES_CANDIDATE';
  }else if(supportsMemory&&tacticalDirection&&tacticalDirection!==candidateDirection){
    candidateState='MF_MEMORY_SUPPORTS_BUT_TACTICAL_PULLBACK';
  }else if(supportsMemory){
    candidateState='MF_MEMORY_SUPPORTS_CANDIDATE';
  }else if(candidateDirection&&tacticalWithCandidate){
    candidateState='TACTICAL_MF_SUPPORTS_CANDIDATE';
  }

  const reference=memory||h2||h1||h30||null;
  return {
    version:'mf-temporal-memory-v0.1',
    decisionImpact:false,
    state,
    memoryDirection,
    memoryHorizon,
    tacticalDirection,
    candidateDirection:candidateDirection||null,
    candidateContext:{
      state:candidateState,
      supportsMemory,
      opposesMemory,
      tacticalWithCandidate,
      transitionCandidate:!!(opposesMemory&&tacticalWithCandidate)
    },
    conversion:reference?{
      horizon:memoryHorizon||((reference===h2)?'h2':(reference===h1)?'h1':'m30'),
      mfDirection:reference.direction,
      priceDirection:reference.priceDirection,
      priceRelation:reference.priceRelation,
      mfPathEfficiency:reference.mfPathEfficiency,
      stepPersistence:reference.stepPersistence,
      priceEfficiency:reference.priceEfficiency,
      usdPerMfPoint:reference.usdPerMfPoint
    }:null,
    horizons,
    semantic:{
      memory:'MF value is interpreted with path memory; the same current level can mean opposite things depending on how it was reached.',
      tactical:'30m direction describes the current MF attack/respiration; 1h/2h/4h describe progressively slower memory.',
      pullback:'TACTICAL_*_AGAINST_*_MF_MEMORY means a local attack inside an opposing persistent MF trajectory, not an automatic reversal.',
      conversion:'priceEfficiency and usdPerMfPoint describe how much price terrain the MF trajectory converts; they are measurements, not entry thresholds.',
      authority:'shadow descriptive context only; no veto, direction, entry or exit authority'
    }
  };
}

function pivots(rows,confirmBars=CONFIRM_BARS){
  const k=Math.max(1,Number(confirmBars)||1);
  const raw=[];
  for(let i=1;i<rows.length-k;i++){
    const cur=rows[i],prev=rows[i-1];
    const post=rows.slice(i+1,i+k+1);
    const high=cur.mf>=prev.mf&&post.every(x=>cur.mf>x.mf);
    const low=cur.mf<=prev.mf&&post.every(x=>cur.mf<x.mf);
    if(!high&&!low)continue;
    const confirm=rows[i+k];
    raw.push({
      type:high?'HIGH':'LOW',
      value:cur.mf,
      ts:cur.ts,
      timestamp:cur.timestamp,
      price:cur.close,
      confirmedAt:confirm.ts,
      confirmedTimestamp:confirm.timestamp,
      confirmBars:k
    });
  }
  const out=[];
  for(const p of raw){
    const last=out[out.length-1];
    if(last&&last.type===p.type){
      const better=p.type==='HIGH'?p.value>last.value:p.value<last.value;
      if(better)out[out.length-1]=p;
    }else out.push(p);
  }
  return out;
}

function relation(prev,cur,kind){
  if(!prev||!cur)return null;
  if(cur.value>prev.value)return kind==='HIGH'?'HH':'HL';
  if(cur.value<prev.value)return kind==='HIGH'?'LH':'LL';
  return kind==='HIGH'?'EH':'EL';
}

function classify(highRelation,lowRelation){
  if(highRelation==='HH'&&lowRelation==='HL')return 'ADVANCING_UP';
  if(highRelation==='LH'&&lowRelation==='LL')return 'ADVANCING_DOWN';
  if(highRelation==='LH'&&lowRelation==='HL')return 'COMPRESSION';
  if(highRelation==='HH'&&lowRelation==='LL')return 'EXPANDING';
  return 'UNRESOLVED';
}

function extensionState(state,current,lastHigh,lastLow){
  if(!finite(current))return null;
  if(state==='ADVANCING_DOWN'&&lastHigh&&current>Number(lastHigh.value))return 'UP_STRUCTURE_BREAK';
  if(state==='ADVANCING_UP'&&lastLow&&current<Number(lastLow.value))return 'DOWN_STRUCTURE_BREAK';
  if(lastHigh&&current>Number(lastHigh.value))return 'UP_EXTENSION';
  if(lastLow&&current<Number(lastLow.value))return 'DOWN_EXTENSION';
  if(state==='ADVANCING_UP'&&lastHigh&&current<Number(lastHigh.value))return 'UP_PULLBACK';
  if(state==='ADVANCING_DOWN'&&lastLow&&current>Number(lastLow.value))return 'DOWN_PULLBACK';
  return 'INSIDE_STRUCTURE';
}

function relationToCandidate(candidate,state,extension){
  if(!candidate)return {state:'NO_CANDIDATE',supports:false,opposes:false,maturity:'UNKNOWN'};
  const breakUp=extension==='UP_STRUCTURE_BREAK';
  const breakDown=extension==='DOWN_STRUCTURE_BREAK';
  if((candidate==='short'&&breakUp)||(candidate==='long'&&breakDown)){
    return {state:'MF_STRUCTURE_BREAK_AGAINST_CANDIDATE',supports:false,opposes:true,maturity:'TRANSITIONAL_BREAK_AGAINST_CANDIDATE'};
  }
  if((candidate==='long'&&breakUp)||(candidate==='short'&&breakDown)){
    return {state:'MF_STRUCTURE_BREAK_SUPPORTS_CANDIDATE',supports:true,opposes:false,maturity:'STRUCTURE_BREAK_SUPPORTS_CANDIDATE'};
  }
  const up=state==='ADVANCING_UP'||extension==='UP_EXTENSION';
  const down=state==='ADVANCING_DOWN'||extension==='DOWN_EXTENSION';
  const supports=(candidate==='long'&&up)||(candidate==='short'&&down);
  const opposes=(candidate==='long'&&down)||(candidate==='short'&&up);
  if(supports&&opposes)return {state:'MF_TRANSITIONAL',supports:false,opposes:false,maturity:'TRANSITIONAL_CONFLICT'};
  return {
    state:supports?'MF_SUPPORTS_CANDIDATE':opposes?'MF_OPPOSES_CANDIDATE':'MF_TRANSITIONAL',
    supports,opposes,maturity:supports?'SUPPORTED_BY_MF_STRUCTURE':opposes?'IMMATURE_AGAINST_MF_STRUCTURE':'TRANSITIONAL'
  };
}

function evaluate(frame,candidateDirection=null){
  const src=frame&&frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs&&frame.sources.mcb.tfs[TF]||{};
  const rows=rowsFromSource(src);
  const ps=pivots(rows);
  const highs=ps.filter(p=>p.type==='HIGH');
  const lows=ps.filter(p=>p.type==='LOW');
  const lastHigh=highs[highs.length-1]||null;
  const prevHigh=highs[highs.length-2]||null;
  const lastLow=lows[lows.length-1]||null;
  const prevLow=lows[lows.length-2]||null;
  const highRelation=relation(prevHigh,lastHigh,'HIGH');
  const lowRelation=relation(prevLow,lastLow,'LOW');
  const state=classify(highRelation,lowRelation);
  const confirmedCurrent=rows[rows.length-1]||null;
  const live=src&&src.live&&finite(src.live.money_flow)?{
    ts:Number(src.live.ts),
    timestamp:src.live.timestamp||new Date(Number(src.live.ts)).toISOString(),
    value:Number(src.live.money_flow)
  }:null;
  const current=live&&finite(live.value)?Number(live.value):confirmedCurrent&&Number(confirmedCurrent.mf);
  const extension=extensionState(state,current,lastHigh,lastLow);
  const candidate=relationToCandidate(candidateDirection,state,extension);
  const temporal=temporalMemory(temporalRows(src),candidateDirection);
  return {
    version:VERSION,
    decisionImpact:false,
    timeframe:TF,
    available:!!(rows.length&&highRelation&&lowRelation),
    currentMf:finite(current)?Number(current):null,
    currentSource:live?'LIVE':'CONFIRMED',
    structuralState:state,
    extensionState:extension,
    highRelation,
    lowRelation,
    highDelta:lastHigh&&prevHigh?Number(lastHigh.value)-Number(prevHigh.value):null,
    lowDelta:lastLow&&prevLow?Number(lastLow.value)-Number(prevLow.value):null,
    lastHigh,
    previousHigh:prevHigh,
    lastLow,
    previousLow:prevLow,
    turns:ps.slice(-12),
    candidateDirection:candidateDirection||null,
    candidateContext:candidate,
    temporal,
    coverage:{
      bars:rows.length,
      startTs:rows[0]&&rows[0].ts||null,
      endTs:rows[rows.length-1]&&rows[rows.length-1].ts||null
    },
    semantic:{
      primary:'MF is treated as persistent flow structure, not a pivot timer and not a directional order.',
      staircase:'HH+HL = advancing up; LH+LL = advancing down; LH+HL = compression; HH+LL = expansion.',
      causality:'MF pivots are confirmed only after '+CONFIRM_BARS+' closed 15m bars.',
      timing:'LBW may turn before MF. Opposing MF structure qualifies maturity/context only; it never vetoes a trade.',
      temporality:'MF level is never interpreted alone: 30m tactical path is compared with 1h/2h/4h persistent memory and price conversion.',
      liquidity:'MarketCipher Money Flow is an indicator/proxy for persistent flow pressure; it is not direct order-book liquidity.'
    }
  };
}

module.exports={
  VERSION,TF,CONFIRM_BARS,TEMPORAL_WINDOWS,TEMPORAL_COHERENCE_MIN,TEMPORAL_PERSISTENCE_MIN,
  rowsFromSource,temporalRows,temporalWindow,temporalCoherent,temporalMemory,
  pivots,relation,classify,extensionState,relationToCandidate,evaluate
};
