'use strict';

/*
 * divergence-causal-shadow.js
 *
 * Shadow diagnostic only. No trading authority.
 *
 * Design contract:
 * - regular divergence = a causal MCB turn lineage, not all pair combinations;
 * - signal pivots must persist for most of their timeframe (filters intra-bar flashes);
 * - price is taken from the relevant local extreme immediately preceding confirmation;
 * - continuation/hidden divergence is price-swing anchored and compares LBW at the swing;
 * - one lineage is extended to the latest qualifying point instead of emitting N choose 2 pairs;
 * - current forming divergences may use the live/current row.
 */

const VERSION='divergence-causal-shadow-v0.4';
const DECISION_IMPACT=false;
const structuralTrajectory=require('../layers/structural-trajectory');

function finite(v){return v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v));}
function n(v){return finite(v)?Number(v):null;}
function sign(v){const x=n(v);return x===null?0:x>0?1:x<0?-1:0;}

const CFG={
  '15m':{
    ms:15*60*1000,
    minSignalPersistMs:9.5*60*1000,
    minAbsLbw:40,
    minPriceDelta:50,
    minLbwDelta:5,
    priceLookbackBars:2,
    priceSwingBars:4,
    priceSwingProminenceUsd:30,
    hiddenMinPriceDelta:100,
    hiddenMinLbwDelta:3,
    hiddenLookbackMs:72*60*60*1000
  },
  '3m':{
    ms:3*60*1000,
    minSignalPersistMs:2*60*1000,
    minAbsLbw:40,
    minPriceDelta:40,
    minLbwDelta:5,
    priceLookbackBars:2,
    priceSwingBars:3,
    priceSwingProminenceUsd:20,
    hiddenMinPriceDelta:70,
    hiddenMinLbwDelta:4,
    hiddenLookbackMs:18*60*60*1000
  },
  '1h':{
    ms:60*60*1000,
    minAbsLbw:30,
    minPriceDelta:120,
    minLbwDelta:4,
    localTurnDeltaLbw:0.5,
    localMaxConfirmBars:3,
    priceSwingBars:1,
    priceSwingProminenceUsd:50,
    hiddenMinPriceDelta:250,
    hiddenMinLbwDelta:2,
    hiddenLookbackMs:120*60*60*1000,
    minHistoryBars:36
  },
  '4h':{
    ms:4*60*60*1000,
    minAbsLbw:35,
    minPriceDelta:350,
    minLbwDelta:7,
    localTurnDeltaLbw:2,
    localMaxConfirmBars:2,
    priceSwingBars:1,
    priceSwingProminenceUsd:180,
    hiddenMinPriceDelta:500,
    hiddenMinLbwDelta:5,
    hiddenLookbackMs:14*24*60*60*1000,
    minHistoryBars:24
  },
  '1d':{
    ms:24*60*60*1000,
    minAbsLbw:35,
    minPriceDelta:500,
    minLbwDelta:5,
    hiddenMinPriceDelta:800,
    hiddenMinLbwDelta:5,
    hiddenLookbackMs:120*24*60*60*1000,
    minHistoryBars:20
  },
  '1w':{
    ms:7*24*60*60*1000,
    minAbsLbw:25,
    minPriceDelta:1000,
    minLbwDelta:5,
    localTurnDeltaLbw:3,
    localMaxConfirmBars:2,
    hiddenMinPriceDelta:1500,
    hiddenMinLbwDelta:5,
    hiddenLookbackMs:365*24*60*60*1000,
    minHistoryBars:12
  }
};

function orderedSeries(rows){
  const map=new Map();
  for(const r of rows||[]){
    const ts=n(r.ts);
    if(ts===null||!finite(r.lt_blue_wave)||!finite(r.high)||!finite(r.low)||!finite(r.close))continue;
    map.set(ts,{...r,ts,lt_blue_wave:Number(r.lt_blue_wave),high:Number(r.high),low:Number(r.low),close:Number(r.close)});
  }
  return Array.from(map.values()).sort((a,b)=>a.ts-b.ts);
}

function signalRuns(auditRows,tf,direction){
  const cfg=CFG[tf];
  const field=tf==='15m'
    ?(direction==='bullish'?'live15SignalUp':'live15SignalDn')
    :(direction==='bullish'?'liveSignalUp':'liveSignalDn');
  const lbwField=tf==='15m'?'live15Lbw':'liveLbw';
  const sorted=(auditRows||[]).filter(r=>finite(r.ts)).slice().sort((a,b)=>Number(a.ts)-Number(b.ts));
  const runs=[];
  let cur=null;
  for(const r of sorted){
    const val=n(r[field]);
    if(val!==null){
      if(!cur)cur={start:r,end:r};
      else cur.end=r;
    }else if(cur){
      runs.push(cur);cur=null;
    }
  }
  if(cur)runs.push(cur);
  return runs.map(run=>{
    const durationMs=Number(run.end.ts)-Number(run.start.ts);
    const lbw=n(run.start[lbwField]);
    const price=n(run.start.lastPrice);
    return {
      direction,
      confirmedAt:Number(run.start.ts),
      confirmedTimestamp:new Date(Number(run.start.ts)).toISOString(),
      durationMs,
      lbw,
      observedPrice:price,
      signalValue:n(run.start[field])
    };
  }).filter(e=>
    e.durationMs>=cfg.minSignalPersistMs &&
    e.lbw!==null && Math.abs(e.lbw)>=cfg.minAbsLbw &&
    e.observedPrice!==null
  );
}

function rowsBefore(series,ts,bars){
  const a=series.filter(r=>r.ts<=ts);
  return a.slice(-Math.max(1,bars+1));
}

function decorateSignalPivot(event,series,tf){
  const cfg=CFG[tf];
  const w=rowsBefore(series,event.confirmedAt,cfg.priceLookbackBars);
  if(!w.length)return null;
  const isBull=event.direction==='bullish';
  let px=w[0],osc=w[0];
  for(const r of w){
    if(isBull ? r.low<px.low : r.high>px.high)px=r;
    if(isBull ? Number(r.lt_blue_wave)<Number(osc.lt_blue_wave) : Number(r.lt_blue_wave)>Number(osc.lt_blue_wave))osc=r;
  }
  // Preserve the causal confirmation timestamp while keeping both the associated
  // price extreme and the actual oscillator extreme for diagnostic drawing.
  return {
    type:isBull?'CREUX':'CRETE',
    direction:event.direction,
    confirmedAt:event.confirmedAt,
    confirmedTimestamp:event.confirmedTimestamp,
    extremeTs:px.ts,
    extremeTimestamp:px.timestamp||new Date(px.ts).toISOString(),
    oscExtremeTs:Number(osc.ts),
    oscExtremeTimestamp:osc.timestamp||new Date(Number(osc.ts)).toISOString(),
    oscExtremeLbw:Number(osc.lt_blue_wave),
    lbw:event.lbw,
    price:isBull?px.low:px.high,
    observedPrice:event.observedPrice,
    signalValue:event.signalValue,
    persistenceMs:event.durationMs,
    source:'PERSISTENT_MCB_SIGNAL'
  };
}

function structuralSignalPivots(series,auditRows,tf,direction){
  const out=[];
  for(const e of signalRuns(auditRows,tf,direction)){
    const p=decorateSignalPivot(e,series,tf);
    if(!p)continue;
    const last=out[out.length-1];
    // Same causal pivot may briefly disappear/reappear. Collapse close duplicates.
    if(last && p.confirmedAt-last.confirmedAt<CFG[tf].ms &&
       Math.abs(p.lbw-last.lbw)<3 &&
       Math.abs(p.price-last.price)<CFG[tf].minPriceDelta){
      if(p.persistenceMs>last.persistenceMs)out[out.length-1]=p;
      continue;
    }
    out.push(p);
  }
  return out;
}

function regularLineages(pivots,tf,direction){
  const cfg=CFG[tf];
  if(!pivots.length)return[];
  const bull=direction==='bullish';
  const out=[];
  let anchor=pivots[0],end=null;
  function qualifies(p){
    return bull
      ? p.price<=anchor.price-cfg.minPriceDelta && p.lbw>=anchor.lbw+cfg.minLbwDelta
      : p.price>=anchor.price+cfg.minPriceDelta && p.lbw<=anchor.lbw-cfg.minLbwDelta;
  }
  function confirmsTrend(p){
    return bull
      ? p.price<=anchor.price-cfg.minPriceDelta && p.lbw<=anchor.lbw
      : p.price>=anchor.price+cfg.minPriceDelta && p.lbw>=anchor.lbw;
  }
  function extendsLine(p){
    if(!end)return false;
    if(!qualifies(p))return false;
    return bull ? p.price<end.price : p.price>end.price;
  }
  function push(){
    if(!end)return;
    out.push({
      kind:'REGULAR',
      direction,
      status:'CONFIRMED',
      start:anchor,
      end,
      source:'CAUSAL_SIGNAL_LINEAGE',
      decisionImpact:false
    });
  }
  for(const p of pivots.slice(1)){
    if(end){
      if(extendsLine(p)){end=p;continue;}
      if(confirmsTrend(p)){push();anchor=p;end=null;continue;}
      continue;
    }
    if(qualifies(p)){end=p;continue;}
    if(confirmsTrend(p)){anchor=p;continue;}
  }
  push();
  return out;
}

function currentExtremeSince(series,sinceTs,direction){
  const rows=series.filter(r=>r.ts>=sinceTs);
  if(!rows.length)return null;
  const bull=direction==='bullish';
  let p=rows[0];
  for(const r of rows){
    if(bull ? r.low<p.low : r.high>p.high)p=r;
  }
  return {
    type:bull?'FORMING_CREUX':'FORMING_CRETE',
    direction,
    confirmedAt:null,
    confirmedTimestamp:null,
    extremeTs:p.ts,
    extremeTimestamp:p.timestamp||new Date(p.ts).toISOString(),
    lbw:Number(p.lt_blue_wave),
    price:bull?Number(p.low):Number(p.high),
    observedPrice:Number(p.close),
    source:'CURRENT_FORMING_PRICE_EXTREME'
  };
}

function formingRegular(series,pivots,tf,direction){
  const cfg=CFG[tf],bull=direction==='bullish';
  const anchors=pivots.filter(p=>bull?p.lbw<0:p.lbw>0);
  if(!anchors.length)return null;
  const anchor=anchors[anchors.length-1];
  const end=currentExtremeSince(series,anchor.confirmedAt||anchor.extremeTs,direction);
  if(!end||Math.abs(end.lbw)<cfg.minAbsLbw)return null;
  const ok=bull
    ? end.price<=anchor.price-cfg.minPriceDelta && end.lbw>=anchor.lbw+cfg.minLbwDelta
    : end.price>=anchor.price+cfg.minPriceDelta && end.lbw<=anchor.lbw-cfg.minLbwDelta;
  if(!ok)return null;
  // If a confirmed lineage already ends on essentially the same point, caller can de-duplicate.
  return {
    kind:'REGULAR',
    direction,
    status:'FORMING',
    start:anchor,
    end,
    source:'CAUSAL_SIGNAL_TO_CURRENT_EXTREME',
    decisionImpact:false
  };
}

function priceSwingPivots(series,tf,direction){
  const cfg=CFG[tf],k=cfg.priceSwingBars,bull=direction==='bullish';
  const out=[];
  for(let i=k;i<series.length-k;i++){
    const r=series[i];
    const pre=series.slice(i-k,i),post=series.slice(i+1,i+k+1);
    if(!pre.length||!post.length)continue;
    const value=bull?r.low:r.high;
    const preEdge=bull?Math.min(...pre.map(x=>x.low)):Math.max(...pre.map(x=>x.high));
    const postEdge=bull?Math.min(...post.map(x=>x.low)):Math.max(...post.map(x=>x.high));
    const isSwing=bull?(value<preEdge&&value<=postEdge):(value>preEdge&&value>=postEdge);
    if(!isSwing)continue;
    const prominence=bull?Math.min(preEdge-value,postEdge-value):Math.min(value-preEdge,value-postEdge);
    if(prominence<cfg.priceSwingProminenceUsd)continue;
    if(Math.abs(Number(r.lt_blue_wave))<cfg.minAbsLbw)continue;
    // Continuation requires oscillator on the same side as the swing.
    if(bull&&Number(r.lt_blue_wave)>=0)continue;
    if(!bull&&Number(r.lt_blue_wave)<=0)continue;
    out.push({
      type:bull?'PRICE_SWING_LOW':'PRICE_SWING_HIGH',
      direction,
      confirmedAt:Number(series[i+k].ts),
      confirmedTimestamp:series[i+k].timestamp||new Date(Number(series[i+k].ts)).toISOString(),
      extremeTs:r.ts,
      extremeTimestamp:r.timestamp||new Date(r.ts).toISOString(),
      lbw:Number(r.lt_blue_wave),
      price:Number(value),
      prominenceUsd:prominence,
      source:'PRICE_SWING_WITH_LBW'
    });
  }
  return out;
}

function formingHidden(series,tf,direction,currentStartTs){
  const cfg=CFG[tf],bull=direction==='bullish';
  const end=currentExtremeSince(series,currentStartTs,direction);
  if(!end||Math.abs(end.lbw)<cfg.minAbsLbw)return null;
  const all=priceSwingPivots(series,tf,direction)
    .filter(p=>p.extremeTs<end.extremeTs && end.extremeTs-p.extremeTs<=cfg.hiddenLookbackMs);
  const candidates=all.filter(p=>bull
    ? end.price>=p.price+cfg.hiddenMinPriceDelta && end.lbw<=p.lbw-cfg.hiddenMinLbwDelta
    : end.price<=p.price-cfg.hiddenMinPriceDelta && end.lbw>=p.lbw+cfg.hiddenMinLbwDelta
  );
  if(!candidates.length)return null;
  // Prefer the most prominent qualifying structural price swing; if tied, the most recent.
  candidates.sort((a,b)=>(b.prominenceUsd-a.prominenceUsd)||(b.extremeTs-a.extremeTs));
  const anchor=candidates[0];
  return {
    kind:'CONTINUATION',
    direction,
    status:'FORMING',
    start:anchor,
    end,
    source:'PRICE_SWING_HIDDEN_DIVERGENCE',
    decisionImpact:false
  };
}


function confirmedHiddenLineage(seriesRows,tf,direction){
  const cfg=CFG[tf],bull=direction==='bullish';
  const piv=priceSwingPivots(orderedSeries(seriesRows),tf,direction);
  for(let j=piv.length-1;j>=1;j--){
    const newer=piv[j];
    for(let i=j-1;i>=Math.max(0,j-8);i--){
      const older=piv[i];
      const ok=bull
        ? Number(newer.price)>=Number(older.price)+cfg.hiddenMinPriceDelta&&Number(newer.lbw)<=Number(older.lbw)-cfg.hiddenMinLbwDelta
        : Number(newer.price)<=Number(older.price)-cfg.hiddenMinPriceDelta&&Number(newer.lbw)>=Number(older.lbw)+cfg.hiddenMinLbwDelta;
      if(!ok)continue;
      return {
        kind:'CONTINUATION',
        subtype:'HIDDEN_CONFIRMED',
        direction,
        status:'CONFIRMED',
        start:older,
        end:newer,
        source:'STRUCTURAL_PRICE_SWING_HIDDEN_CONFIRMED',
        decisionImpact:false
      };
    }
  }
  return null;
}



function causalDivergencePivots15m(seriesRows){
  const series=orderedSeries(seriesRows),out=[];
  const k=2;
  for(let i=1;i<series.length-k;i++){
    const prev=series[i-1],cur=series[i];
    const post=series.slice(i+1,i+k+1);
    const v=Number(cur.lt_blue_wave),p=Number(prev.lt_blue_wave);
    const crest=v>0&&v>=p&&post.every(r=>v>Number(r.lt_blue_wave));
    const trough=v<0&&v<=p&&post.every(r=>v<Number(r.lt_blue_wave));
    if(!crest&&!trough)continue;
    const conf=series[i+k];
    out.push({
      type:crest?'CRETE':'CREUX',
      direction:crest?'bearish':'bullish',
      confirmedAt:Number(conf.ts),
      confirmedTimestamp:conf.timestamp||new Date(Number(conf.ts)).toISOString(),
      extremeTs:Number(cur.ts),
      extremeTimestamp:cur.timestamp||new Date(Number(cur.ts)).toISOString(),
      drawTs:Number(cur.ts),
      lbw:v,
      price:crest?Number(cur.high):Number(cur.low),
      source:'CAUSAL_E15_DIVERGENCE_PIVOT'
    });
  }
  return out;
}

function localBullish15mFromPivots(pivots){
  const cfg=CFG['15m'];
  const troughs=(pivots||[]).filter(p=>p.type==='CREUX').slice().sort((a,b)=>a.extremeTs-b.extremeTs);
  const regularCandidates=[];
  for(let i=0;i<troughs.length-1;i++){
    const a=troughs[i];
    const ends=troughs.slice(i+1).filter(b=>
      Number(b.price)<=Number(a.price)-cfg.minPriceDelta&&
      Number(b.lbw)>=Number(a.lbw)+cfg.minLbwDelta
    );
    if(!ends.length)continue;
    ends.sort((x,y)=>(Number(x.price)-Number(y.price))||(Number(y.extremeTs)-Number(x.extremeTs)));
    const b=ends[0];
    regularCandidates.push({
      kind:'REGULAR',subtype:'E15_LOCAL_REGULAR',
      direction:'bullish',status:'CONFIRMED',start:a,end:b,
      source:'CAUSAL_E15_LOCAL_DIVERGENCE',decisionImpact:false,
      strength:{priceDeltaUsd:Number(a.price)-Number(b.price),lbwDelta:Number(b.lbw)-Number(a.lbw)}
    });
  }
  regularCandidates.sort((x,y)=>
    Number(y.end.extremeTs)-Number(x.end.extremeTs)||
    Number(y.strength.lbwDelta)-Number(x.strength.lbwDelta)
  );
  const regular=regularCandidates[0]||null;

  const hiddenCandidates=[];
  const hiddenLbwMin=Math.max(20,Number(cfg.hiddenMinLbwDelta)||0);
  for(let j=1;j<troughs.length;j++){
    const b=troughs[j];
    let a=null;
    const minI=Math.max(0,j-4);
    for(let i=j-1;i>=minI;i--){
      const x=troughs[i];
      const ok=Number(b.price)>=Number(x.price)+cfg.hiddenMinPriceDelta&&
        Number(b.lbw)<=Number(x.lbw)-hiddenLbwMin;
      if(ok){a=x;break;}
    }
    if(!a)continue;
    hiddenCandidates.push({
      kind:'CONTINUATION',subtype:'HIDDEN_LOCAL_E15',
      direction:'bullish',status:'CONFIRMED',start:a,end:b,
      source:'CAUSAL_E15_LOCAL_HIDDEN_DIVERGENCE',decisionImpact:false,
      strength:{priceDeltaUsd:Number(b.price)-Number(a.price),lbwDelta:Number(a.lbw)-Number(b.lbw)}
    });
  }
  hiddenCandidates.sort((x,y)=>
    Number(y.end.extremeTs)-Number(x.end.extremeTs)||
    Number(y.strength.lbwDelta)-Number(x.strength.lbwDelta)
  );
  const continuation=hiddenCandidates[0]||null;
  return [continuation,regular].filter(Boolean);
}

function localBullish15mLines(seriesRows){
  return localBullish15mFromPivots(causalDivergencePivots15m(seriesRows));
}

function causalHiddenCandidates3m(seriesRows,direction){
  const cfg=CFG['3m'],bull=direction==='bullish';
  const series=orderedSeries(seriesRows);
  const latestTs=series.length?Number(series[series.length-1].ts):0;
  const turns=structuralTrajectory.structuralTurns({history:series},'3m')
    .filter(p=>!latestTs||latestTs-Number(p.extremeTs)<=cfg.hiddenLookbackMs)
    .filter(p=>p.type===(bull?'CREUX':'CRETE'))
    .map(p=>({
      type:p.type,
      direction,
      confirmedAt:Number(p.confirmedAt),
      confirmedTimestamp:p.confirmedTimestamp,
      extremeTs:Number(p.extremeTs),
      extremeTimestamp:p.extremeTimestamp,
      lbw:Number(p.lbw),
      price:Number(p.price),
      source:'CAUSAL_E3_PIVOT'
    }));
  const out=[];
  for(let i=1;i<turns.length;i++){
    const a=turns[i-1],b=turns[i];
    const ok=bull
      ? b.price>=a.price+cfg.hiddenMinPriceDelta && b.lbw<=a.lbw-cfg.hiddenMinLbwDelta
      : b.price<=a.price-cfg.hiddenMinPriceDelta && b.lbw>=a.lbw+cfg.hiddenMinLbwDelta;
    if(!ok)continue;
    out.push({
      kind:'CONTINUATION',
      subtype:'E3_CAUSAL_HIDDEN_CANDIDATE',
      direction,
      status:'CONFIRMED',
      start:a,end:b,
      source:'CAUSAL_E3_HIDDEN_CANDIDATE',
      display:false,
      decisionImpact:false
    });
  }
  return out;
}

function dedupe(lines,tf){
  const tol=CFG[tf].ms;
  const out=[];
  for(const l of lines.filter(Boolean).sort((a,b)=>(a.end.extremeTs||a.end.confirmedAt||0)-(b.end.extremeTs||b.end.confirmedAt||0))){
    const same=out.find(x=>
      x.kind===l.kind&&x.direction===l.direction&&
      Math.abs((x.start.confirmedAt||x.start.extremeTs)-(l.start.confirmedAt||l.start.extremeTs))<=tol&&
      Math.abs((x.end.confirmedAt||x.end.extremeTs)-(l.end.confirmedAt||l.end.extremeTs))<=tol
    );
    if(same){
      if(l.status==='CONFIRMED')Object.assign(same,l);
    }else out.push(l);
  }
  return out;
}

function detectTimeframe(seriesRows,auditRows,tf){
  const series=orderedSeries(seriesRows);
  const bullPivots=structuralSignalPivots(series,auditRows,tf,'bullish');
  const bearPivots=structuralSignalPivots(series,auditRows,tf,'bearish');
  const bullRegular=regularLineages(bullPivots,tf,'bullish');
  const bearRegular=regularLineages(bearPivots,tf,'bearish');

  const latestBullAnchor=bullPivots.filter(p=>p.lbw<0).slice(-1)[0]||null;
  const latestBearAnchor=bearPivots.filter(p=>p.lbw>0).slice(-1)[0]||null;
  const formingBull=formingRegular(series,bullPivots,tf,'bullish');
  const formingBear=formingRegular(series,bearPivots,tf,'bearish');

  const latestSeriesTs=series.length?series[series.length-1].ts:0;
  const hiddenBull=formingHidden(series,tf,'bullish',
    latestBullAnchor?latestBullAnchor.confirmedAt:Math.max(0,latestSeriesTs-6*CFG[tf].ms));
  const hiddenBear=formingHidden(series,tf,'bearish',
    latestBearAnchor?latestBearAnchor.confirmedAt:Math.max(0,latestSeriesTs-6*CFG[tf].ms));
  const confirmedHiddenBull=tf==='15m'?confirmedHiddenLineage(series,tf,'bullish'):null;

  let lines=dedupe([...bullRegular,...bearRegular,formingBull,formingBear,hiddenBull,hiddenBear,confirmedHiddenBull],tf);

  // 3m is tactical and very noisy. Only the latest validated REGULAR lineage is drawn.
  // Hidden/continuation structures are recalculated from causal E3 pivots and kept
  // as non-displayed candidates until several cases are visually validated.
  let continuationCandidates=[];
  if(tf==='3m'){
    const regular=lines.filter(x=>x.kind==='REGULAR').sort((a,b)=>(b.end.extremeTs||b.end.confirmedAt||0)-(a.end.extremeTs||a.end.confirmedAt||0));
    continuationCandidates=[
      ...causalHiddenCandidates3m(series,'bullish'),
      ...causalHiddenCandidates3m(series,'bearish')
    ];
    lines=[...(regular.slice(0,1))];
  }else{
    // 15m bullish divergences use a dedicated non-merged causal E15 stream.
    // This prevents old, mathematically-valid but structurally weak anchors from
    // dominating the chart. Bearish regular lineage remains on the validated
    // persistent-signal model until equivalent bearish cases are reviewed.
    const localBull=localBullish15mLines(series);
    const bearConfirmed=lines.filter(x=>
      x.kind==='REGULAR'&&x.status==='CONFIRMED'&&x.direction==='bearish'
    ).sort((a,b)=>(b.end.confirmedAt||b.end.extremeTs)-(a.end.confirmedAt||a.end.extremeTs))[0]||null;
    const bearForming=lines.filter(x=>x.direction==='bearish'&&x.status==='FORMING');
    lines=[...localBull,bearConfirmed,...bearForming].filter(Boolean);
  }

  lines.sort((a,b)=>(a.start.confirmedAt||a.start.extremeTs)-(b.start.confirmedAt||b.start.extremeTs));
  return {
    version:VERSION,decisionImpact:DECISION_IMPACT,timeframe:tf,
    signalPivots:{bullish:bullPivots,bearish:bearPivots},
    continuationCandidates,
    lines,
    counts:{
      total:lines.length,
      bullish:lines.filter(x=>x.direction==='bullish').length,
      bearish:lines.filter(x=>x.direction==='bearish').length,
      regular:lines.filter(x=>x.kind==='REGULAR').length,
      continuation:lines.filter(x=>x.kind==='CONTINUATION').length,
      forming:lines.filter(x=>x.status==='FORMING').length
    },
    contract:{
      regular:'persistent causal MCB turn -> one lineage extended to latest qualifying price extreme',
      continuation:tf==='3m'
        ?'3m hidden continuation candidates require consecutive causal E3 pivots and remain non-displayed pending validation'
        :'15m bullish continuation uses the nearest qualifying confirmed causal E15 anchor; no long-range forming projection',
      threeMinuteContinuationDisplay:tf==='3m'?false:null,
      noCombinatorialPairs:true,
      priceAndOscillatorTimestampsKeptSeparate:true
    }
  };
}


function localLbwPivots(seriesRows,tf){
  const cfg=CFG[tf],series=orderedSeries(seriesRows),out=[];
  if(!cfg||series.length<3)return out;
  for(let i=1;i<series.length-1;i++){
    const prev=series[i-1],r=series[i],next=series[i+1];
    const v=Number(r.lt_blue_wave);
    const crest=v>0&&v>=Number(prev.lt_blue_wave)&&v>Number(next.lt_blue_wave);
    const trough=v<0&&v<=Number(prev.lt_blue_wave)&&v<Number(next.lt_blue_wave);
    if(!crest&&!trough)continue;
    if(Math.abs(v)<cfg.minAbsLbw)continue;
    const type=crest?'CRETE':'CREUX';
    let confirmed=null;
    const maxBars=Math.max(1,Number(cfg.localMaxConfirmBars||2));
    const need=Math.max(0.1,Number(cfg.localTurnDeltaLbw||1));
    for(let j=i+1;j<series.length&&j<=i+maxBars;j++){
      const away=crest?v-Number(series[j].lt_blue_wave):Number(series[j].lt_blue_wave)-v;
      if(away>=need){confirmed=series[j];break;}
    }
    if(!confirmed)continue;
    out.push({
      type,
      extremeTs:Number(r.ts),
      extremeTimestamp:r.timestamp||new Date(Number(r.ts)).toISOString(),
      confirmedAt:Number(confirmed.ts),
      confirmedTimestamp:confirmed.timestamp||new Date(Number(confirmed.ts)).toISOString(),
      lbw:v,
      highPrice:Number(r.high),
      lowPrice:Number(r.low),
      close:Number(r.close),
      source:'LOCAL_LBW_TURN_CAUSAL'
    });
  }
  return out;
}

function directionalizePivot(p,direction){
  if(!p)return null;
  const bull=direction==='bullish';
  const price=finite(p.price)?Number(p.price):(bull?Number(p.lowPrice):Number(p.highPrice));
  return {...p,direction,price};
}

function localRegularLines(localPivots,tf,direction){
  const out=[];
  for(const type of ['CREUX','CRETE']){
    const piv=localPivots.filter(p=>p.type===type).map(p=>directionalizePivot(p,direction));
    out.push(...regularLineages(piv,tf,direction));
  }
  return out;
}

function continuationAfterRegular(line,localPivots,tf,direction){
  if(!line)return null;
  const cfg=CFG[tf],bull=direction==='bullish';
  const same=localPivots
    .filter(p=>p.type===line.start.type&&Number(p.confirmedAt)>Number(line.end.confirmedAt||line.end.extremeTs))
    .map(p=>directionalizePivot(p,direction));
  let end=null;
  for(const p of same){
    const priceRecovery=bull
      ? p.price>=Number(line.end.price)+cfg.minPriceDelta*.5
      : p.price<=Number(line.end.price)-cfg.minPriceDelta*.5;
    const oscillatorContinuation=bull
      ? p.lbw>=Number(line.end.lbw)+cfg.minLbwDelta
      : p.lbw<=Number(line.end.lbw)-cfg.minLbwDelta;
    if(priceRecovery&&oscillatorContinuation)end=p;
  }
  if(!end)return null;
  return {
    kind:'CONTINUATION',
    subtype:'REGULAR_THEN_CONTINUATION',
    direction,
    status:'CONFIRMED',
    start:line.start,
    end,
    points:[line.end,end],
    source:'CAUSAL_LBW_LINEAGE_CONTINUATION',
    decisionImpact:false
  };
}

function currentSignedLobeEndpoint(seriesRows,direction){
  const series=orderedSeries(seriesRows);
  if(!series.length)return null;
  const bull=direction==='bullish';
  const wanted=bull?-1:1;
  const last=series[series.length-1];
  // A forming divergence must belong to the lobe that is alive NOW.
  if(sign(last.lt_blue_wave)!==wanted)return null;
  let start=series.length-1;
  while(start>0&&sign(series[start-1].lt_blue_wave)===wanted)start--;
  const seg=series.slice(start);
  if(!seg.length)return null;
  // Anchor price to the oscillator extreme itself, not to an unrelated
  // price wick elsewhere in the same lobe.
  let ex=seg[0];
  for(const r of seg){
    if(bull?Number(r.lt_blue_wave)<Number(ex.lt_blue_wave):Number(r.lt_blue_wave)>Number(ex.lt_blue_wave))ex=r;
  }
  return {
    type:bull?'FORMING_CREUX':'FORMING_CRETE',
    direction,
    confirmedAt:null,
    confirmedTimestamp:null,
    extremeTs:Number(ex.ts),
    extremeTimestamp:ex.timestamp||new Date(Number(ex.ts)).toISOString(),
    lbw:Number(ex.lt_blue_wave),
    price:bull?Number(ex.low):Number(ex.high),
    observedPrice:Number(ex.close),
    lobeStartTs:Number(seg[0].ts),
    source:'CURRENT_SIGNED_LBW_LOBE_EXTREME'
  };
}

function formingHiddenFromLocalLbw(seriesRows,localPivots,tf,direction){
  const cfg=CFG[tf],bull=direction==='bullish';
  const type=bull?'CREUX':'CRETE';
  const anchors=localPivots.filter(p=>p.type===type);
  if(!anchors.length)return null;
  const end=currentSignedLobeEndpoint(seriesRows,direction);
  if(!end||Math.abs(Number(end.lbw))<cfg.minAbsLbw)return null;
  const candidates=anchors.filter(p=>{
    if(Number(p.extremeTs)>=Number(end.lobeStartTs||end.extremeTs))return false;
    const a=directionalizePivot(p,direction);
    return bull
      ? end.price>=a.price+cfg.hiddenMinPriceDelta&&end.lbw<=a.lbw-cfg.hiddenMinLbwDelta
      : end.price<=a.price-cfg.hiddenMinPriceDelta&&end.lbw>=a.lbw+cfg.hiddenMinLbwDelta;
  }).map(p=>directionalizePivot(p,direction));
  if(!candidates.length)return null;
  // Prefer the most recent qualifying causal LBW pivot.
  candidates.sort((a,b)=>Number(b.confirmedAt)-Number(a.confirmedAt));
  return {
    kind:'CONTINUATION',
    subtype:'HIDDEN_FORMING',
    direction,
    status:'FORMING',
    start:candidates[0],
    end,
    source:'LOCAL_LBW_HIDDEN_DIVERGENCE',
    decisionImpact:false
  };
}

function nativeCsvSignalPivots(seriesRows,tf,direction){
  const cfg=CFG[tf],bull=direction==='bullish';
  const field=bull?'wt1_cross_up':'wt1_cross_dn';
  const series=orderedSeries(seriesRows);
  return series.filter(r=>finite(r[field])&&Math.abs(Number(r.lt_blue_wave))>=cfg.minAbsLbw)
    .map(r=>({
      type:bull?'CREUX':'CRETE',
      direction,
      confirmedAt:Number(r.ts),
      confirmedTimestamp:r.timestamp||new Date(Number(r.ts)).toISOString(),
      extremeTs:Number(r.ts),
      extremeTimestamp:r.timestamp||new Date(Number(r.ts)).toISOString(),
      lbw:Number(r.lt_blue_wave),
      price:bull?Number(r.low):Number(r.high),
      lowPrice:Number(r.low),
      highPrice:Number(r.high),
      signalValue:Number(r[field]),
      source:'CONFIRMED_CSV_SIGNAL'
    }));
}

function currentPoint(seriesRows,direction){
  const series=orderedSeries(seriesRows);
  if(!series.length)return null;
  const r=series[series.length-1],bull=direction==='bullish';
  return {
    type:bull?'FORMING_CREUX':'FORMING_CRETE',
    direction,
    confirmedAt:null,
    confirmedTimestamp:null,
    extremeTs:Number(r.ts),
    extremeTimestamp:r.timestamp||new Date(Number(r.ts)).toISOString(),
    lbw:Number(r.lt_blue_wave),
    price:bull?Number(r.low):Number(r.high),
    lowPrice:Number(r.low),highPrice:Number(r.high),
    source:'CURRENT_TF_ROW'
  };
}

function anchorMultidiv(pivots,current,tf,direction){
  const cfg=CFG[tf],bull=direction==='bullish';
  const pts=(pivots||[]).slice().sort((a,b)=>Number(a.confirmedAt)-Number(b.confirmedAt));
  let best=null;
  function qualifies(anchor,p){
    if(!anchor||!p)return false;
    return bull
      ? Number(p.price)<=Number(anchor.price)-cfg.minPriceDelta&&Number(p.lbw)>=Number(anchor.lbw)+cfg.minLbwDelta
      : Number(p.price)>=Number(anchor.price)+cfg.minPriceDelta&&Number(p.lbw)<=Number(anchor.lbw)-cfg.minLbwDelta;
  }
  for(let i=0;i<pts.length;i++){
    const anchor=pts[i],points=[];
    for(let j=i+1;j<pts.length;j++)if(qualifies(anchor,pts[j]))points.push(pts[j]);
    let includesCurrent=false;
    if(current&&qualifies(anchor,current)){points.push(current);includesCurrent=true;}
    if(!points.length)continue;
    const candidate={anchor,points,includesCurrent};
    if(!best||candidate.points.length>best.points.length||
      (candidate.points.length===best.points.length&&Number(candidate.anchor.confirmedAt)<Number(best.anchor.confirmedAt)))best=candidate;
  }
  if(!best)return null;
  const end=best.points[best.points.length-1];
  return {
    kind:best.points.length>=2?'MULTIDIV':'REGULAR',
    subtype:'ANCHOR_PERSISTENT',
    direction,
    status:best.includesCurrent?'FORMING':'CONFIRMED',
    start:best.anchor,
    end,
    points:best.points,
    multidiv:best.points.length>=2,
    source:'PERSISTENT_ANCHOR_DIVERGENCE',
    decisionImpact:false
  };
}

function higherCounts(lines){
  return {
    total:lines.length,
    bullish:lines.filter(x=>x.direction==='bullish').length,
    bearish:lines.filter(x=>x.direction==='bearish').length,
    regular:lines.filter(x=>x.kind==='REGULAR').length,
    continuation:lines.filter(x=>x.kind==='CONTINUATION').length,
    multidiv:lines.filter(x=>x.kind==='MULTIDIV').length,
    forming:lines.filter(x=>x.status==='FORMING').length
  };
}


function causalPriceSwings(seriesRows,tf,side){
  const cfg=CFG[tf],series=orderedSeries(seriesRows);
  const k=Math.max(1,Number(cfg.priceSwingBars||1));
  const minProm=Math.max(0,Number(cfg.priceSwingProminenceUsd||0));
  const high=side==='high',out=[];
  for(let i=k;i<series.length-k;i++){
    const r=series[i];
    const pre=series.slice(i-k,i),post=series.slice(i+1,i+k+1);
    const value=high?Number(r.high):Number(r.low);
    const preEdge=high?Math.max(...pre.map(x=>Number(x.high))):Math.min(...pre.map(x=>Number(x.low)));
    const postEdge=high?Math.max(...post.map(x=>Number(x.high))):Math.min(...post.map(x=>Number(x.low)));
    const ok=high?(value>preEdge&&value>=postEdge):(value<preEdge&&value<=postEdge);
    if(!ok)continue;
    const prominence=high?Math.min(value-preEdge,value-postEdge):Math.min(preEdge-value,postEdge-value);
    if(prominence<minProm)continue;
    if(Math.abs(Number(r.lt_blue_wave))<cfg.minAbsLbw)continue;
    const confirm=series[i+k];
    out.push({
      type:high?'PRICE_SWING_HIGH':'PRICE_SWING_LOW',
      confirmedAt:Number(confirm.ts),
      confirmedTimestamp:confirm.timestamp||new Date(Number(confirm.ts)).toISOString(),
      extremeTs:Number(r.ts),
      extremeTimestamp:r.timestamp||new Date(Number(r.ts)).toISOString(),
      lbw:Number(r.lt_blue_wave),
      price:value,
      highPrice:Number(r.high),
      lowPrice:Number(r.low),
      prominenceUsd:prominence,
      source:'CAUSAL_PRICE_SWING'
    });
  }
  return out;
}

function anchoredContinuationChain(swings,tf,direction){
  const cfg=CFG[tf],bull=direction==='bullish';
  const a=(swings||[]).slice().sort((x,y)=>Number(x.confirmedAt)-Number(y.confirmedAt));
  let best=null;
  function firstQualifies(anchor,p){
    return bull
      ? Number(p.price)<=Number(anchor.price)-cfg.minPriceDelta&&Number(p.lbw)>=Number(anchor.lbw)+cfg.minLbwDelta
      : Number(p.price)>=Number(anchor.price)+cfg.minPriceDelta&&Number(p.lbw)<=Number(anchor.lbw)-cfg.minLbwDelta;
  }
  for(let i=0;i<a.length;i++){
    let points=[];
    for(let j=i+1;j<a.length;j++){
      const p=a[j];
      if(!points.length){
        if(firstQualifies(a[i],p))points.push(p);
        continue;
      }
      const last=points[points.length-1];
      const oscillatorStrengthens=bull
        ? Number(p.lbw)>=Number(last.lbw)+cfg.minLbwDelta
        : Number(p.lbw)<=Number(last.lbw)-cfg.minLbwDelta;
      const priceContinues=bull
        ? Number(p.price)>=Number(last.price)+cfg.minPriceDelta*.5&&Number(p.price)<Number(a[i].price)
        : Number(p.price)<=Number(last.price)-cfg.minPriceDelta*.5&&Number(p.price)>Number(a[i].price);
      if(oscillatorStrengthens&&priceContinues)points.push(p);
    }
    if(points.length<2)continue;
    const candidate={anchor:a[i],points};
    if(!best||candidate.points.length>best.points.length||
      (candidate.points.length===best.points.length&&Number(candidate.anchor.confirmedAt)>Number(best.anchor.confirmedAt)))best=candidate;
  }
  if(!best)return null;
  return {
    kind:'CONTINUATION',
    subtype:'CAUSAL_PRICE_SWING_CHAIN',
    direction,
    status:'CONFIRMED',
    start:{...best.anchor,direction},
    end:{...best.points[best.points.length-1],direction},
    points:best.points.map(x=>({...x,direction})),
    source:'PRICE_LBW_CONTINUATION_LINEAGE',
    decisionImpact:false
  };
}

function detectHigherTimeframe(seriesRows,tf){
  const cfg=CFG[tf],series=orderedSeries(seriesRows);
  if(!cfg)return {version:VERSION,decisionImpact:false,timeframe:tf,status:'UNSUPPORTED',lines:[],counts:higherCounts([])};
  if(series.length<Number(cfg.minHistoryBars||3)){
    return {
      version:VERSION,decisionImpact:false,timeframe:tf,status:'INSUFFICIENT_HISTORY',
      coverage:{bars:series.length,startTs:series[0]&&series[0].ts||null,endTs:series[series.length-1]&&series[series.length-1].ts||null},
      lines:[],counts:higherCounts([])
    };
  }

  let lines=[],pivots={bullish:[],bearish:[]};

  if(tf==='1d'){
    const bull=nativeCsvSignalPivots(series,tf,'bullish').filter(p=>p.lbw<0);
    const bear=nativeCsvSignalPivots(series,tf,'bearish').filter(p=>p.lbw>0);
    pivots={bullish:bull,bearish:bear};
    const b1=anchorMultidiv(bull,currentPoint(series,'bullish'),tf,'bullish');
    const b2=anchorMultidiv(bear,currentPoint(series,'bearish'),tf,'bearish');
    lines=[b1,b2].filter(Boolean);
  }else{
    const endTs=series[series.length-1]&&Number(series[series.length-1].ts);
    const recentHorizon=tf==='1h'?5*24*60*60*1000:tf==='4h'?14*24*60*60*1000:365*24*60*60*1000;
    const local=localLbwPivots(series,tf)
      .filter(p=>!endTs||endTs-Number(p.confirmedAt)<=recentHorizon);
    const swingHigh=causalPriceSwings(series,tf,'high')
      .filter(p=>!endTs||endTs-Number(p.confirmedAt)<=recentHorizon);
    const swingLow=causalPriceSwings(series,tf,'low')
      .filter(p=>!endTs||endTs-Number(p.confirmedAt)<=recentHorizon);
    pivots={local,swingHigh,swingLow};

    // On higher intraday TFs we stay deliberately conservative:
    // 1) a continuation chain needs an anchor + at least two confirming price swings;
    // 2) a hidden/forming divergence may use the current signed LBW lobe.
    const bullChain=anchoredContinuationChain(swingHigh,tf,'bullish');
    const bearChain=anchoredContinuationChain(swingLow,tf,'bearish');
    const bullHidden=formingHiddenFromLocalLbw(series,local,tf,'bullish');
    const bearHidden=formingHiddenFromLocalLbw(series,local,tf,'bearish');

    lines=[bullChain,bearChain,bullHidden,bearHidden].filter(Boolean);
  }

  // Keep only structures whose end is reasonably recent for the TF.
  const endTs=series[series.length-1]&&Number(series[series.length-1].ts);
  const horizon=tf==='1h'?5*24*60*60*1000:tf==='4h'?14*24*60*60*1000:120*24*60*60*1000;
  lines=dedupe(lines,tf).filter(l=>!endTs||endTs-Number(l.end.extremeTs||l.end.confirmedAt||0)<=horizon);
  lines.sort((a,b)=>Number(a.start.confirmedAt||a.start.extremeTs)-Number(b.start.confirmedAt||b.start.extremeTs));

  return {
    version:VERSION,decisionImpact:false,timeframe:tf,status:'OK',
    pivots,lines,counts:higherCounts(lines),
    coverage:{bars:series.length,startTs:series[0]&&series[0].ts||null,endTs:series[series.length-1]&&series[series.length-1].ts||null},
    contract:{
      causalLocalPivots:tf!=='1d',
      confirmedCsvSignals:tf==='1d',
      persistentAnchorMultidiv:tf==='1d',
      noCombinatorialPairs:true
    }
  };
}

function detectCatalog(input){
  const seriesByTf=input&&input.seriesByTf||{};
  const auditRows=input&&input.auditRows||[];
  return {
    version:VERSION,
    decisionImpact:DECISION_IMPACT,
    wave15:detectTimeframe(seriesByTf['15m']||[],auditRows,'15m'),
    wave3:detectTimeframe(seriesByTf['3m']||[],auditRows,'3m'),
    tf1h:detectHigherTimeframe(seriesByTf['1h']||[],'1h'),
    tf4h:detectHigherTimeframe(seriesByTf['4h']||[],'4h'),
    tf1d:detectHigherTimeframe(seriesByTf['1d']||[],'1d'),
    tf1w:detectHigherTimeframe(seriesByTf['1w']||[],'1w')
  };
}

module.exports={
  VERSION,DECISION_IMPACT,CFG,
  orderedSeries,signalRuns,structuralSignalPivots,regularLineages,
  priceSwingPivots,formingRegular,formingHidden,confirmedHiddenLineage,
  causalDivergencePivots15m,localBullish15mFromPivots,localBullish15mLines,
  causalHiddenCandidates3m,localLbwPivots,localRegularLines,continuationAfterRegular,
  formingHiddenFromLocalLbw,nativeCsvSignalPivots,anchorMultidiv,
  causalPriceSwings,anchoredContinuationChain,
  detectTimeframe,detectHigherTimeframe,detectCatalog
};
