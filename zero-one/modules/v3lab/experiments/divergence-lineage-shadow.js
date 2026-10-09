'use strict';

const { confirmedPivots } = require('../layers/wave');

const VERSION = 'divergence-lineage-shadow-v0.1';
const TF_MS = 15 * 60 * 1000;

function finite(v){ return Number.isFinite(Number(v)); }
function median(a){
  const x=a.filter(finite).map(Number).sort((m,n)=>m-n);
  if(!x.length)return null;
  const k=Math.floor(x.length/2);
  return x.length%2?x[k]:(x[k-1]+x[k])/2;
}
function series15(frame){
  const src=frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs&&frame.sources.mcb.tfs['15m'];
  if(!src)return[];
  const a=(src.history||[]).filter(r=>finite(r.ts)&&finite(r.lt_blue_wave)&&finite(r.close)).slice();
  if(src.live&&finite(src.live.ts)&&finite(src.live.lt_blue_wave)&&(!a.length||Number(src.live.ts)>Number(a[a.length-1].ts)))a.push(src.live);
  return a;
}
function source15(frame){ return frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs&&frame.sources.mcb.tfs['15m']; }

function legStats(pivots,series){
  const out=[];
  for(let i=1;i<pivots.length;i++){
    const a=pivots[i-1],b=pivots[i];
    const delta=Number(b.price)-Number(a.price);
    const dir=delta>0?'long':delta<0?'short':null;
    if(!dir)continue;
    const mag=Math.abs(delta);
    const after=series.filter(r=>Number(r.ts)>=Number(b.ts));
    let adverse=0;
    if(after.length){
      if(dir==='long'){
        const lo=Math.min(...after.map(r=>finite(r.low)?Number(r.low):Number(r.close)));
        adverse=Math.max(0,Number(b.price)-lo);
      }else{
        const hi=Math.max(...after.map(r=>finite(r.high)?Number(r.high):Number(r.close)));
        adverse=Math.max(0,hi-Number(b.price));
      }
    }
    out.push({index:i-1,start:a,end:b,direction:dir,translationUsd:delta,magnitudeUsd:mag,
      adverseAfterEndUsd:adverse,retracementRatio:mag>0?adverse/mag:null});
  }
  return out;
}

function movementCandidate(pivots,series,currentPrice){
  const legs=legStats(pivots,series);
  if(!legs.length)return null;
  const recent=legs.slice(-12);
  const med=median(recent.map(x=>x.magnitudeUsd))||0;
  const candidates=recent.filter(x=>x.magnitudeUsd>=Math.max(150,med*1.25) && finite(x.retracementRatio) && x.retracementRatio<0.618);
  let best=null;
  if(candidates.length){
    // The current campaign is the most recent significant unresolved leg, not
    // the largest historical leg still below an arbitrary retracement ratio.
    const x=candidates[candidates.length-1];
    const scale=med>0?x.magnitudeUsd/med:null;
    const persistence=1-Math.min(1,Number(x.retracementRatio||0));
    best={...x,scaleVsMedian:scale,score:(scale||1)*persistence};
  }
  if(!best){
    const x=recent[recent.length-1];
    best={...x,scaleVsMedian:med>0?x.magnitudeUsd/med:null,score:null};
  }
  const cur=Number(currentPrice);
  const fromStart=best.direction==='long'?cur-Number(best.start.price):Number(best.start.price)-cur;
  return {
    model:'dominant unresolved E15 price leg (provisional)',
    status:'PROVISIONAL',
    startPivot:best.start,endPivot:best.end,direction:best.direction,
    translationUsd:best.translationUsd,magnitudeUsd:best.magnitudeUsd,
    medianRecentLegUsd:med,scaleVsMedian:best.scaleVsMedian,
    adverseAfterEndUsd:best.adverseAfterEndUsd,retracementRatio:best.retracementRatio,
    currentTranslationFromStartUsd:fromStart,
    note:'candidate boundary only; durable power transfer is not inferred from MCB/price alone'
  };
}

function transitionEvidence(series,movement){
  if(!movement||!movement.startPivot)return null;
  const seg=series.filter(r=>Number(r.ts)>=Number(movement.startPivot.ts));
  let firstCross=null,zeroCrossCount=0;
  for(let i=1;i<seg.length;i++){
    const a=Number(seg[i-1].lt_blue_wave),b=Number(seg[i].lt_blue_wave);
    if((a>0&&b<=0)||(a<0&&b>=0)){
      zeroCrossCount++;
      if(!firstCross)firstCross={ts:seg[i].ts,timestamp:seg[i].timestamp,from:a,to:b};
    }
  }
  const cur=seg[seg.length-1];
  return {
    state:'MOVEMENT_TRANSITION_EVIDENCE',
    firstPolarityCross:firstCross,polarityCrossCount:zeroCrossCount,
    currentPolarity:cur?(Number(cur.lt_blue_wave)>=0?'POSITIVE':'NEGATIVE'):null,
    polaritySupportsDirection:cur?((movement.direction==='long'&&Number(cur.lt_blue_wave)>0)||(movement.direction==='short'&&Number(cur.lt_blue_wave)<0)):false,
    powerTransferConfirmed:false,
    note:'MCB polarity change is transition evidence only; it never confirms a durable power transfer by itself'
  };
}

function lobeContent(series,older,newer){
  const seg=series.filter(r=>Number(r.ts)>=Number(older.ts)&&Number(r.ts)<=Number(newer.ts));
  if(!seg.length)return null;
  let mass=0,signed=0,zeroCrosses=0;
  for(let i=0;i<seg.length;i++){
    const dt=i===0?TF_MS:Math.max(1,Number(seg[i].ts)-Number(seg[i-1].ts));
    const h=dt/3600000;
    const v=Number(seg[i].lt_blue_wave)||0;
    mass+=Math.abs(v)*h;signed+=v*h;
    if(i>0){const p=Number(seg[i-1].lt_blue_wave);if((p>0&&v<=0)||(p<0&&v>=0))zeroCrosses++;}
  }
  const priceDelta=Number(newer.price)-Number(older.price);
  return {
    bars:seg.length,durationMinutes:(Number(newer.ts)-Number(older.ts))/60000,
    lbwMassAbsTime:mass,lbwMassSignedTime:signed,zeroCrosses,
    maxLbw:Math.max(...seg.map(r=>Number(r.lt_blue_wave))),minLbw:Math.min(...seg.map(r=>Number(r.lt_blue_wave))),
    priceDeltaUsd:priceDelta,absPriceDeltaUsd:Math.abs(priceDelta),
    pricePerLbwMass:mass>0?Math.abs(priceDelta)/mass:null
  };
}

function makeCandidate(direction,older,newer,pivots,series,movement,status){
  const between=pivots.filter(p=>Number(p.ts)>Number(older.ts)&&Number(p.ts)<Number(newer.ts));
  const sameType=between.filter(p=>p.type===older.type);
  const sameMovement=!!(movement&&Number(older.ts)>=Number(movement.startPivot.ts)&&Number(newer.ts)>=Number(movement.startPivot.ts));
  return {
    direction,status,
    older,newer,
    ageMinutesFromOlder:(Number(series[series.length-1]&&series[series.length-1].ts)-Number(older.ts))/60000,
    agePivots:between.length,
    intermediatePivots:between,
    intermediateSameSideCount:sameType.length,
    sameMovementCandidate:sameMovement,
    structuralAge:sameMovement?'CURRENT_MOVEMENT':'PREVIOUS_MOVEMENT',
    lifecycleCandidate:sameMovement?'ACTIVE':'HISTORICAL',
    lobeContent:lobeContent(series,older,newer),
    note:'lifecycle is shadow classification; intermediate E15 do not cancel a divergence automatically'
  };
}

function divergenceCandidates(pivots,series){
  const out=[];
  for(const cfg of [
    {direction:'bullish',type:'CREUX',priceOk:(a,b)=>Number(b.price)<Number(a.price),lbwOk:(a,b)=>Number(b.lbw)>Number(a.lbw)},
    {direction:'bearish',type:'CRETE',priceOk:(a,b)=>Number(b.price)>Number(a.price),lbwOk:(a,b)=>Number(b.lbw)<Number(a.lbw)},
  ]){
    const same=pivots.filter(p=>p.type===cfg.type).slice(-8);
    if(same.length>=2){
      for(let j=1;j<same.length;j++){
        const newer=same[j];
        for(let i=Math.max(0,j-5);i<j;i++){
          const old=same[i];
          if(cfg.priceOk(old,newer)&&cfg.lbwOk(old,newer))out.push({direction:cfg.direction,older:old,newer,status:'confirmed'});
        }
      }
    }
  }
  const cur=series[series.length-1];
  if(cur&&finite(cur.lt_blue_wave)){
    if(Number(cur.lt_blue_wave)<0&&finite(cur.low)){
      const lows=pivots.filter(p=>p.type==='CREUX'&&Number(p.ts)<Number(cur.ts));
      for(let i=lows.length-1;i>=0&&lows.length-i<=5;i--){
        const old=lows[i],newer={ts:cur.ts,timestamp:cur.timestamp,type:'FORMING_CREUX',lbw:Number(cur.lt_blue_wave),price:Number(cur.low),confirmed:false};
        if(Number(newer.price)<Number(old.price)&&Number(newer.lbw)>Number(old.lbw))out.push({direction:'bullish',older:old,newer,status:'forming'});
      }
    }
    if(Number(cur.lt_blue_wave)>0&&finite(cur.high)){
      const highs=pivots.filter(p=>p.type==='CRETE'&&Number(p.ts)<Number(cur.ts));
      for(let i=highs.length-1;i>=0&&highs.length-i<=5;i--){
        const old=highs[i],newer={ts:cur.ts,timestamp:cur.timestamp,type:'FORMING_CRETE',lbw:Number(cur.lt_blue_wave),price:Number(cur.high),confirmed:false};
        if(Number(newer.price)>Number(old.price)&&Number(newer.lbw)<Number(old.lbw))out.push({direction:'bearish',older:old,newer,status:'forming'});
      }
    }
  }
  return out;
}

function evaluate(frame,result){
  const src=source15(frame),series=series15(frame);
  if(!src||series.length<3)return {version:VERSION,decisionImpact:false,status:'INSUFFICIENT_DATA'};
  const pivots=confirmedPivots(src,2);
  const movement=movementCandidate(pivots,series,frame.market.price);
  const transition=transitionEvidence(series,movement);
  const raw=divergenceCandidates(pivots,series);
  const candidates=raw.map(x=>makeCandidate(x.direction,x.older,x.newer,pivots,series,movement,x.status));
  const active=candidates.filter(x=>x.lifecycleCandidate==='ACTIVE');
  const historical=candidates.filter(x=>x.lifecycleCandidate==='HISTORICAL');
  return {
    version:VERSION,decisionImpact:false,timeframe:'15m',
    hypothesis:'divergence age is structural lineage age, not primarily clock age or pivot count',
    movementCandidate:movement,transitionEvidence:transition,
    divergences:{all:candidates,active,historical,activeCount:active.length,historicalCount:historical.length},
    currentContext:{wavePhase:result.wave&&result.wave.phase||null,waveDirection:result.wave&&result.wave.direction||null,regime:result.regime&&result.regime.state||null,dominance:result.dominance&&result.dominance.direction||null},
    falsification:'shadow only: compare candidate boundaries/lifecycles against subsequent price structure, E15 geometry and durable microstructure power transfer',
    note:'no TTL and no pivot-count expiry; MCB zero-cross is evidence of transition, never the boundary proof by itself'
  };
}

module.exports={VERSION,evaluate,movementCandidate,divergenceCandidates,lobeContent};
