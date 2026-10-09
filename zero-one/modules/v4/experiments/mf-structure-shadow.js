'use strict';

const {finite}=require('../core/utils');
const mcbState=require('../layers/mcb-state');

const VERSION='mf-structure-shadow-v0.1';
const TF='15m';
const CONFIRM_BARS=2;

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
    coverage:{
      bars:rows.length,
      startTs:rows[0]&&rows[0].ts||null,
      endTs:rows[rows.length-1]&&rows[rows.length-1].ts||null
    },
    semantic:{
      primary:'MF is treated as persistent flow structure, not a pivot timer and not a directional order.',
      staircase:'HH+HL = advancing up; LH+LL = advancing down; LH+HL = compression; HH+LL = expansion.',
      causality:'MF pivots are confirmed only after '+CONFIRM_BARS+' closed 15m bars.',
      timing:'LBW may turn before MF. Opposing MF structure qualifies maturity/context only; it never vetoes a trade in v0.1.',
      liquidity:'MarketCipher Money Flow is an indicator/proxy for persistent flow pressure; it is not direct order-book liquidity.'
    }
  };
}

module.exports={VERSION,TF,CONFIRM_BARS,rowsFromSource,pivots,relation,classify,extensionState,relationToCandidate,evaluate};
