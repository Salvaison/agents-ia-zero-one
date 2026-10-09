'use strict';

const fs = require('fs');
const path = require('path');
const { num, ageMs } = require('../core/utils');

const ROOT = path.join(__dirname, '../../..');
const DATA = path.join(ROOT, 'data');
const MCB = path.join(ROOT, '../data/mcb-live');
const HISTORY_ROWS = {'3m':1100,'15m':240,'1h':72,'4h':36,'1d':80,'1w':80};

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return fallback; }
}
function parseCsvRows(p, maxRows = 64) {
  try {
    const lines = fs.readFileSync(p, 'utf8').trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const h = lines[0].split(',');
    return lines.slice(Math.max(1, lines.length - maxRows)).map(line => {
      const v = line.split(','), r = {};
      h.forEach((k, i) => { r[k] = v[i] ?? ''; });
      // Historical confirmed CSV headers can still stop at dbsi_bottom while
      // rows have carried the extended 15-column schema since August.
      // Recover trailing fields positionally so MA200 and native MCB signals
      // are not silently discarded by the runtime adapter.
      if (v.length >= 15) {
        r.buy = v[8] ?? r.buy ?? '';
        r.sell = v[9] ?? r.sell ?? '';
        r.dbsi_top = v[10] ?? r.dbsi_top ?? '';
        r.dbsi_bottom = v[11] ?? r.dbsi_bottom ?? '';
        r.ma200 = v[12] ?? r.ma200 ?? '';
        r.wt1_cross_up = v[13] ?? r.wt1_cross_up ?? '';
        r.wt1_cross_dn = v[14] ?? r.wt1_cross_dn ?? '';
      }
      ['open','high','low','close','lt_blue_wave','blue_wave','money_flow','dbsi_top','dbsi_bottom','ma200','wt1_cross_up','wt1_cross_dn']
        .forEach(k => { r[k] = num(r[k]); });
      r.ts = Date.parse(r.timestamp);
      return r;
    }).filter(r => Number.isFinite(r.ts));
  } catch (_) { return []; }
}
function fileUpdateAgeMs(p, now) {
  try { return Math.max(0, now - fs.statSync(p).mtimeMs); } catch (_) { return null; }
}
function tfSource(tf, now) {
  const histPath = path.join(MCB, `mcb_${tf}.csv`);
  const livePath = path.join(MCB, `mcb_${tf}_live.csv`);
  const history = parseCsvRows(histPath, HISTORY_ROWS[tf] || 80);
  const liveRows = parseCsvRows(livePath, 2);
  const confirmed = history.length ? history[history.length - 1] : null;
  const live = liveRows.length ? liveRows[liveRows.length - 1] : null;
  return {
    timeframe: tf, history, confirmed, live,
    confirmedAgeMs: confirmed ? ageMs(confirmed.ts, now) : null,
    liveAgeMs: live ? ageMs(live.ts, now) : null,
    confirmedUpdateAgeMs: fileUpdateAgeMs(histPath, now),
    liveUpdateAgeMs: fileUpdateAgeMs(livePath, now),
  };
}
function buildRuntimeSnapshot(primaryVol = null) {
  const now = Date.now();
  const baton = readJson(path.join(DATA, 'baton-state.json'), null);
  const auditAll = readJson(path.join(DATA, 'audit-history.json'), []);
  const auditRows = Array.isArray(auditAll) ? auditAll.slice(-320) : [];
  const lastAudit = auditRows.length ? auditRows[auditRows.length - 1] : null;
  const trendlines = readJson(path.join(DATA, 'trendlines.json'), null);
  const levels = readJson(path.join(DATA, 'levels.json'), []);
  const tfs = {};
  for (const tf of ['1w','1d','4h','1h','15m','3m']) tfs[tf] = tfSource(tf, now);

  const triggerPrice = num(primaryVol && primaryVol.trigger && primaryVol.trigger.lastPrice);
  const batonPrice = num(baton && baton.lastPrice);
  const auditPrice = num(lastAudit && lastAudit.lastPrice);
  const price = triggerPrice ?? batonPrice ?? auditPrice;
  const sourceTs = baton && baton.timestamp ? Date.parse(baton.timestamp)
    : (lastAudit && Number.isFinite(Number(lastAudit.ts)) ? Number(lastAudit.ts) : now);
  if (!Number.isFinite(price)) throw new Error('prix live indisponible');

  return {
    market: { price, timestamp: Number.isFinite(sourceTs) ? sourceTs : now, receivedAt: now },
    sources: { baton, auditRows, trendlines, levels, mcb: { tfs } },
    freshness: {
      marketAgeMs: Number.isFinite(sourceTs) ? Math.max(0, now - sourceTs) : null,
      batonAgeMs: baton && baton.timestamp ? ageMs(baton.timestamp, now) : null,
      auditAgeMs: lastAudit ? ageMs(Number(lastAudit.ts), now) : null,
    },
  };
}

module.exports = { buildRuntimeSnapshot, parseCsvRows, tfSource };
