'use strict';

const { finite, signDir, pct, clamp } = require('../core/utils');

const TF_ROLE = {
  '1w':'contexte semaines','1d':'contexte jours','4h':'climat journee',
  '1h':'reaction intraday','15m':'vague de travail','3m':'impulsion micro',
};
function currentRow(src) {
  if (!src) return null;
  if (src.live && src.liveUpdateAgeMs !== null && src.liveUpdateAgeMs < 120000) return src.live;
  return src.confirmed || null;
}
function tfMs(tf) {
  return ({'3m':180000,'15m':900000,'1h':3600000,'4h':14400000,'1d':86400000,'1w':604800000})[tf] || 900000;
}
function describeTf(src) {
  const cur = currentRow(src), hist = src && src.history || [];
  const prev = hist.length ? hist[hist.length - 1] : null;
  const lbw = cur && cur.lt_blue_wave, bw = cur && cur.blue_wave, mf = cur && cur.money_flow;
  const slope = finite(lbw) && prev && finite(prev.lt_blue_wave) ? lbw - prev.lt_blue_wave : null;
  return {
    role: TF_ROLE[src && src.timeframe] || null, timeframe: src && src.timeframe,
    lbw, bw, mf, sign: signDir(lbw), lbwSlope: slope,
    source: cur === (src && src.live) ? 'live' : 'confirmed',
    sourceTimestamp: cur && cur.timestamp,
    ageMs: cur === (src && src.live) ? src.liveUpdateAgeMs : src && src.confirmedAgeMs,
    barAgeMs: cur && cur.ts ? Math.max(0, Date.now() - cur.ts) : null,
    updateAgeMs: cur === (src && src.live) ? src.liveUpdateAgeMs : src && src.confirmedUpdateAgeMs,
  };
}
function combinedSeries(src) {
  if (!src) return [];
  const a = (src.history || []).slice(-24);
  if (src.live && (!a.length || src.live.ts > a[a.length-1].ts)) a.push(src.live);
  return a;
}
function priceStructure3m(src) {
  const a = combinedSeries(src).slice(-24);
  const highs = [], lows = [];
  for (let i = 1; i < a.length - 1; i++) {
    if (finite(a[i].high) && a[i].high >= a[i-1].high && a[i].high > a[i+1].high) highs.push({ts:a[i].ts, price:a[i].high});
    if (finite(a[i].low) && a[i].low <= a[i-1].low && a[i].low < a[i+1].low) lows.push({ts:a[i].ts, price:a[i].low});
  }
  const h = highs.slice(-2), l = lows.slice(-2);
  let state = 'INSUFFICIENT', direction = null;
  if (h.length >= 2 && l.length >= 2) {
    const hh = h[1].price > h[0].price, hl = l[1].price > l[0].price;
    const lh = h[1].price < h[0].price, ll = l[1].price < l[0].price;
    if (hh && hl) { state = 'RECONSTRUCTION_HAUSSIERE'; direction = 'long'; }
    else if (lh && ll) { state = 'RECONSTRUCTION_BAISSIERE'; direction = 'short'; }
    else state = 'MIXED_REBUILD';
  }
  return { state, direction, recentHighs:h, recentLows:l };
}

function efficiency(a, b) {
  if (!a || !b || !finite(a.close) || !finite(b.close) || !finite(a.lt_blue_wave) || !finite(b.lt_blue_wave)) return null;
  const dp = Math.abs(pct(b.close, a.close));
  const dl = Math.abs(b.lt_blue_wave - a.lt_blue_wave);
  return dl > 1e-9 ? dp / dl : null;
}
function phase15(series) {
  const a = series.filter(r => finite(r.lt_blue_wave) && finite(r.close)).slice(-10);
  if (a.length < 3) return { phase:'résolution', confidence:'LOW', reason:'donnees insuffisantes' };
  const cur=a[a.length-1], prev=a[a.length-2], prev2=a[a.length-3];
  const dir=signDir(cur.lt_blue_wave), prevDir=signDir(prev.lt_blue_wave);
  const abs=Math.abs(cur.lt_blue_wave), pa=Math.abs(prev.lt_blue_wave), p2=Math.abs(prev2.lt_blue_wave);
  const slope=abs-pa, slope2=pa-p2;
  const maxAbs=Math.max(...a.map(x=>Math.abs(x.lt_blue_wave)));
  const recentEff=efficiency(a[Math.max(0,a.length-3)],cur);
  const priorEff=a.length>=6?efficiency(a[a.length-6],a[a.length-3]):null;
  const ratio=finite(recentEff)&&finite(priorEff)&&priorEff>0?recentEff/priorEff:null;
  const directionalPrice = pct(cur.close, prev.close);
  const alignedPrice = finite(directionalPrice) && ((dir==='long'&&directionalPrice>0)||(dir==='short'&&directionalPrice<0));
  if (dir!=='neutral' && prevDir!=='neutral' && dir!==prevDir) return {phase:'bascule de polarité',confidence:'HIGH',reason:'passage LBW par zero',conversionRatio:ratio,recentEfficiency:recentEff};
  if (abs<15 && slope>2) return {phase:'naissance',confidence:'MEDIUM',reason:'sortie de zero',conversionRatio:ratio,recentEfficiency:recentEff};
  const newPriceExtreme = dir==='long' ? cur.high>=Math.max(...a.slice(0,-1).map(x=>x.high||-Infinity)) : cur.low<=Math.min(...a.slice(0,-1).map(x=>x.low||Infinity));
  if (newPriceExtreme && abs < maxAbs*0.78) {
    if (dir==='long') return {phase:'divergence de crête',confidence:'MEDIUM',reason:'nouveau sommet prix sans reproduction LBW',conversionRatio:ratio,recentEfficiency:recentEff};
    return {phase:'résolution',confidence:'MEDIUM',reason:'nouveau low prix sans reproduction LBW — divergence basse observée',conversionRatio:ratio,recentEfficiency:recentEff};
  }
  if (Math.abs(slope)<2 && abs>=maxAbs*0.9) return {phase:'couronne de crête',confidence:'MEDIUM',reason:'LBW proche maximum et aplati',conversionRatio:ratio,recentEfficiency:recentEff};
  if (slope>2) {
    const wasPullback=slope2<0;
    if ((finite(ratio)&&ratio<0.45) || (!alignedPrice && abs>25)) return {phase:'relance stérile',confidence:'MEDIUM',reason:'effort LBW sans conversion prix equivalente',conversionRatio:ratio,recentEfficiency:recentEff};
    if (abs>75 && finite(ratio)&&ratio<0.75) return {phase:'extension terminale',confidence:'LOW',reason:'LBW extreme, conversion degradee',conversionRatio:ratio,recentEfficiency:recentEff};
    return {phase:wasPullback?'relance':'expansion',confidence:'MEDIUM',reason:wasPullback?'LBW repart apres retrait':'LBW accelere avec le lobe',conversionRatio:ratio,recentEfficiency:recentEff};
  }
  if (slope<-2) {
    if (abs>=maxAbs*0.8) return {phase:'érosion',confidence:'MEDIUM',reason:'retrait depuis altitude elevee',conversionRatio:ratio,recentEfficiency:recentEff};
    if (slope2<0) return {phase:'résolution',confidence:'MEDIUM',reason:'deux retraits LBW successifs',conversionRatio:ratio,recentEfficiency:recentEff};
    return {phase:'respiration',confidence:'LOW',reason:'retrait interne du lobe',conversionRatio:ratio,recentEfficiency:recentEff};
  }
  return {phase:'respiration',confidence:'LOW',reason:'etat intermediaire',conversionRatio:ratio,recentEfficiency:recentEff};
}
function latestPivot(series) {
  const a=series.filter(r=>finite(r.lt_blue_wave)).slice(-20), piv=[];
  for(let i=1;i<a.length-1;i++){
    const v=a[i].lt_blue_wave, p=a[i-1].lt_blue_wave, n=a[i+1].lt_blue_wave;
    if(Math.abs(v)<15) continue;
    if((v>=p&&v>n)||(v<=p&&v<n)) piv.push({ts:a[i].ts,value:v,price:a[i].close,type:v>0?'haut-lbw':'bas-lbw'});
  }
  return piv.length?piv[piv.length-1]:null;
}

function evaluate(snapshot) {
  const tfs = snapshot.sources.mcb && snapshot.sources.mcb.tfs || {};
  const descriptors = {};
  for (const tf of Object.keys(TF_ROLE)) descriptors[tf] = describeTf(tfs[tf]);
  const s15 = combinedSeries(tfs['15m']);
  const ph = phase15(s15);
  const cur15 = s15.length ? s15[s15.length-1] : null;
  const lobeDir = cur15 ? signDir(cur15.lt_blue_wave) : 'unknown';
  const p3 = priceStructure3m(tfs['3m']);
  const pivot = latestPivot(s15);
  const cycleStatus = ['résolution','bascule de polarité','nouveau lobe','naissance'].includes(ph.phase) && p3.state==='MIXED_REBUILD'
    ? 'RECONSTRUCTION' : 'ACTIVE';
  const currentAge = currentRow(tfs['15m']) === (tfs['15m'] && tfs['15m'].live) ? tfs['15m'].liveUpdateAgeMs : (tfs['15m'] && tfs['15m'].confirmedAgeMs);

  return {
    phase: ph.phase, phaseConfidence: ph.confidence, phaseReason: ph.reason,
    lobe: { direction:lobeDir, lbw:cur15&&cur15.lt_blue_wave, bw:cur15&&cur15.blue_wave,
      moneyFlow:cur15&&cur15.money_flow, sourceTimestamp:cur15&&cur15.timestamp, ageMs:currentAge },
    wave: { direction:lobeDir, phase:ph.phase, conversionRatio:ph.conversionRatio,
      recentEfficiency:ph.recentEfficiency, model:'full-wave-crosses-zero; lobe is internal segment' },
    cycle: { id:pivot?`cycle-exp-${pivot.ts}`:null, anchor:pivot, status:cycleStatus,
      confidence:pivot?'LOW':'UNKNOWN', experimental:true },
    priceStructure3m:p3, timeframes:descriptors,
    climate4h:descriptors['4h'], reaction1h:descriptors['1h'], impulse3m:descriptors['3m'],
    freshness: snapshot.freshness,
    labels: ph.confidence==='HIGH'?['DEMONSTRE']:['AMBIGU'],
  };
}

module.exports = { evaluate, phase15, priceStructure3m, describeTf };
