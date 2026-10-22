'use strict';
const fs=require('fs'),path=require('path');
const p=path.resolve(__dirname,'../../data/v5-shadow-memory-state.json');
if(!fs.existsSync(p)){console.error('V5 shadow has no persisted state');process.exit(2);}
const s=JSON.parse(fs.readFileSync(p,'utf8'));
const fmt=ts=>ts?new Date(ts).toISOString():'—';
const buckets=(s.hour&&s.hour.buckets||[]).map(b=>({
 bar:fmt(b.from),samples:b.count,coverage:b.coverage,
 qualities:b.qualityShare,dirs:b.directions,
 yieldP75:b.meanYieldVsP75,effortP75:b.meanEffortVsP75,
 priceNet:b.price&&b.price.netUsd}));
console.log(JSON.stringify({
 version:s.version,decisionImpact:s.decisionImpact,
 lastObservation:fmt(s.lastSampleTs),price:s.observation&&s.observation.price,
 latestQuality:s.observation&&s.observation.quality,
 confirmedE15:s.anchor.confirmed,liveE15:s.anchor.live,
 classifiedE15Segments:s.threads.length,
 unresolvedSegmentLinks:(s.lineageEdges||[]).length,
 latestLinks:(s.lineageEdges||[]).slice(-6),
 latestSegments:s.threads.slice(-5).map(t=>({
  id:t.id,origin:t.originKind,priceStart:t.priceStart,
  priceLast:t.priceLast,priceHigh:t.priceHigh,priceLow:t.priceLow,
  attempts:t.attempts.length,counterAttempts:t.attempts.filter(a=>a.againstAnchor).length,
  unresolvedCounterAttempts:t.attempts.filter(a=>a.againstAnchor&&a.outcome==='UNRESOLVED').length
 })),
 qualityHour:{coverage:s.hour&&s.hour.coverage,distributions:s.hour&&s.hour.distribution,
   observedBias:s.hour&&s.hour.observedBias,buckets},
 counts:s.counts,ethicalNote:'Research only, no trades and no inferred campaign membership'
},null,2));
