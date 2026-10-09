'use strict';

const {finite}=require('../core/utils');

const VERSION='structural-trajectory-v1';

const CONFIG={
  '3m':{confirmBars:1,minAbsLbw:8},
  '15m':{confirmBars:2,minAbsLbw:10},
  '1h':{confirmBars:2,minAbsLbw:20},
  '4h':{confirmBars:2,minAbsLbw:20},
  '1d':{confirmBars:1,minAbsLbw:20},
  '1w':{confirmBars:1,minAbsLbw:20}
};

function confirmedRows(src){
  return (src&&src.history||[])
    .filter(r=>finite(r.ts)&&finite(r.lt_blue_wave)&&finite(r.close))
    .slice()
    .sort((a,b)=>Number(a.ts)-Number(b.ts));
}

function structuralTurns(src,tf){
  const cfg=CONFIG[tf]||{confirmBars:1,minAbsLbw:0};
  const rows=confirmedRows(src);
  const k=Math.max(1,Number(cfg.confirmBars)||1);
  if(rows.length<k+2)return[];

  const raw=[];
  for(let i=1;i<rows.length-k;i++){
    const cur=rows[i],prev=rows[i-1];
    const v=Number(cur.lt_blue_wave),p=Number(prev.lt_blue_wave);
    const post=rows.slice(i+1,i+k+1).map(r=>Number(r.lt_blue_wave));
    const crest=v>0&&v>=p&&post.every(x=>v>x);
    const trough=v<0&&v<=p&&post.every(x=>v<x);
    if(!crest&&!trough)continue;
    if(Math.abs(v)<Number(cfg.minAbsLbw||0))continue;

    const confirm=rows[i+k];
    raw.push({
      type:crest?'CRETE':'CREUX',
      direction:crest?'short':'long',
      structuralState:crest?'DESCENT_ACTIVE':'ASCENT_ACTIVE',
      extremeTs:Number(cur.ts),
      extremeTimestamp:cur.timestamp||new Date(Number(cur.ts)).toISOString(),
      confirmedAt:Number(confirm.ts),
      confirmedTimestamp:confirm.timestamp||new Date(Number(confirm.ts)).toISOString(),
      lbw:v,
      price:crest?Number(cur.high):Number(cur.low),
      confirmBars:k,
      source:'CAUSAL_LBW_EXTREME'
    });
  }

  const out=[];
  for(const x of raw){
    const last=out[out.length-1];
    if(last&&last.type===x.type){
      const better=x.type==='CRETE'?x.lbw>last.lbw:x.lbw<last.lbw;
      if(better)out[out.length-1]=x;
    }else out.push(x);
  }
  return out;
}

function evaluate(src,tf){
  const turns=structuralTurns(src,tf);
  const last=turns[turns.length-1]||null;
  const rows=confirmedRows(src);
  if(!last){
    return {
      version:VERSION,timeframe:tf,available:false,
      structuralDirection:null,structuralState:null,
      lastStructuralPivot:null,structuralConfirmedAt:null,
      direction:null,state:null,lastPivot:null,confirmedAt:null,
      turns:[],coverage:{bars:rows.length,startTs:rows[0]&&Number(rows[0].ts)||null,endTs:rows[rows.length-1]&&Number(rows[rows.length-1].ts)||null},
      semantic:'lobe sign is location; structural direction is unavailable until a causal LBW extremum is confirmed'
    };
  }
  return {
    version:VERSION,timeframe:tf,available:true,
    structuralDirection:last.direction,
    structuralState:last.structuralState,
    lastStructuralPivot:last,
    structuralConfirmedAt:last.confirmedAt,
    structuralConfirmedTimestamp:last.confirmedTimestamp,
    direction:last.direction,
    state:last.structuralState,
    lastPivot:last,
    confirmedAt:last.confirmedAt,
    turns:turns.slice(-10),
    persistence:'UNTIL_OPPOSITE_CAUSAL_EXTREME',
    coverage:{bars:rows.length,startTs:Number(rows[0].ts),endTs:Number(rows[rows.length-1].ts)},
    semantic:'lobe sign is location; E-to-E causal trajectory is direction and persists through local slope respirations'
  };
}

module.exports={VERSION,CONFIG,confirmedRows,structuralTurns,evaluate};
