'use strict';

const { finite, num, ageMs } = require('../core/utils');

const LEVEL_TOL_PCT = 0.39; // fenetre legacy, seuil experimental en v0.2
const LGI_SEARCH_PCT = 0.096;

function evaluate(snapshot) {
  const price = snapshot.market.price;
  const tl = snapshot.sources.trendlines || null;
  const levels = Array.isArray(snapshot.sources.levels) ? snapshot.sources.levels : [];
  const now = snapshot.market.receivedAt || Date.now();
  const tlAge = tl && tl.timestamp ? ageMs(tl.timestamp, now) : null;
  const tlFresh = tlAge !== null && tlAge <= 180000;

  const activeLines = tlFresh && Array.isArray(tl.catalogue)
    ? tl.catalogue.filter(l => l && l.active) : [];
  const allLines = tlFresh && Array.isArray(tl.catalogue) ? tl.catalogue.filter(Boolean) : [];
  const nearestLine = allLines.slice().sort((a,b) => Math.abs(a.distanceUsd || 1e12) - Math.abs(b.distanceUsd || 1e12))[0] || null;
  const lgiAbove = allLines.filter(l => Number(l.projectedNow) > price).sort((a,b) => Number(a.projectedNow)-Number(b.projectedNow))[0] || null;
  const lgiBelow = allLines.filter(l => Number(l.projectedNow) < price).sort((a,b) => Number(b.projectedNow)-Number(a.projectedNow))[0] || null;

  let nearestLevel = null, nextAbove = null, nextBelow = null;
  for (const l of levels) {
    const p = num(l.price); if (!finite(p)) continue;
    const d = p - price, ap = Math.abs(d) / price * 100;
    const x = { label: l.label, family: l.fam, price: p, distanceUsd: d, distancePct: ap };
    if (!nearestLevel || ap < nearestLevel.distancePct) nearestLevel = x;
    if (d > 0 && (!nextAbove || d < nextAbove.distanceUsd)) nextAbove = x;
    if (d < 0 && (!nextBelow || Math.abs(d) < Math.abs(nextBelow.distanceUsd))) nextBelow = x;
  }
  const levelNear = nearestLevel && nearestLevel.distancePct <= LEVEL_TOL_PCT ? nearestLevel : null;
  const lineNear = nearestLine && Math.abs(Number(nearestLine.distanceUsd)) / price * 100 <= LGI_SEARCH_PCT ? nearestLine : null;

  let confidence = 'UNKNOWN', status = 'NO_VALID_LOCATION';
  const reasons = [];
  if (tl && !tlFresh) reasons.push('LGI stale');
  if (activeLines.length) {
    const best = activeLines.slice().sort((a,b) => (b.points || 0) - (a.points || 0))[0];
    const searchTol = tl && tl.params ? Number(tl.params.SEARCH_TOLERANCE_USD) : null;
    const residualGood = finite(best.residual) && finite(searchTol) ? best.residual <= searchTol * 0.5 : false;
    confidence = (activeLines.length >= 2 || (best.points >= 4 && residualGood)) ? 'HIGH' : 'MEDIUM';
    status = 'RELEVANT'; reasons.push(`${activeLines.length} LGI active`);
  } else if (lineNear || levelNear) {
    confidence = lineNear && levelNear ? 'MEDIUM' : 'LOW';
    status = 'RELEVANT';
    if (lineNear) reasons.push('LGI proche');
    if (levelNear) reasons.push('niveau proche');
  } else if (tlFresh || levels.length) {
    confidence = 'LOW'; reasons.push('aucune zone proche');
  }

  return {
    status, relevant: status === 'RELEVANT', confidence, direction: null,
    reasons, price, trendlinesFresh: tlFresh, trendlinesAgeMs: tlAge,
    activeLgi: activeLines.map(l => ({ projected: l.projectedNow, distanceUsd: l.distanceUsd,
      points: l.points, residual: l.residual, natureMetadataOnly: l.nature })),
    nearestLgi: lineNear ? { projected: lineNear.projectedNow, distanceUsd: lineNear.distanceUsd,
      points: lineNear.points, residual: lineNear.residual, natureMetadataOnly: lineNear.nature } : null,
    nextLgiAbove: lgiAbove ? { projected:lgiAbove.projectedNow, distanceUsd:Number(lgiAbove.projectedNow)-price, points:lgiAbove.points, residual:lgiAbove.residual } : null,
    nextLgiBelow: lgiBelow ? { projected:lgiBelow.projectedNow, distanceUsd:Number(lgiBelow.projectedNow)-price, points:lgiBelow.points, residual:lgiBelow.residual } : null,
    nearestLevel: levelNear, nextAbove, nextBelow,
    constructionTf: '15m-current-detector', targetExperiment: '1h-priority-under-test',
    thresholdsExperimental: { levelTolerancePct: LEVEL_TOL_PCT, lgiSearchPct: LGI_SEARCH_PCT },
  };
}

module.exports = { evaluate };
