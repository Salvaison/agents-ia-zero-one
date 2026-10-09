/**
 * trade-simulator-v2.js — Constitution logique BOONO, 14/09/2026.
 *
 * Simulation uniquement. Aucun ordre reel. Interface compatible avec
 * cerveau-central.js : simulateModule(module, primaryVol, divRaw, config, volByTf).
 *
 * Principes : top-down -> vague MCB -> lieu -> energie -> effort ->
 * conversion -> persistance/asymetrie -> decision. Les etats UNKNOWN,
 * AMBIGUOUS, CONTRADICTORY et INVALID_DATA imposent l'abstention.
 *
 * Les metriques de microstructure sont lues dans audit-history.json afin de
 * ne pas modifier baton-relay. E15 reste un extremum structurel ; la vague
 * complete est approximee par 0 -> E15 -> 0 sur LBW15 live.
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '../data');
const MCB = path.join(__dirname, '../../data/mcb-live');
const BATON_PATH = path.join(DATA, 'baton-state.json');
const AUDIT_PATH = path.join(DATA, 'audit-history.json');
const TRENDLINES_PATH = path.join(DATA, 'trendlines.json');
const LEVELS_PATH = path.join(DATA, 'levels.json');
const STATE_PATH = path.join(DATA, 'trade-sim-v2-state.json');
const HISTORY_PATH = path.join(DATA, 'trade-sim-v2-history.json');
const DECISIONS_PATH = path.join(DATA, 'trade-sim-v2-decisions.json');
const WAVES_PATH = path.join(DATA, 'trade-sim-v2-waves.json');

const VERSION = 'constitution-v0.1';
const HISTORY_MAX = 2000;
const DECISION_MAX = 5000;
const WAVES_MAX = 500;
const BASELINE_ROWS = 240; // ~2h a 30s
const STALE_MS = 120000;
const LEVEL_TOLERANCE_PCT = 0.39;
const RISK_STOP_USD = 500;
const EXECUTION_DEAD_CYCLES = 10;
const ENTRY_GRACE_MS = 120000;
const num = (v) => (typeof v === 'number' && Number.isFinite(v)) ? v : null;
const nowIso = () => new Date().toISOString();

function readJson(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return fallback; }
}
function writeJson(p, value) {
  fs.writeFileSync(p, JSON.stringify(value, null, 2));
}
function appendCapped(p, rec, max) {
  const a = readJson(p, []);
  const arr = Array.isArray(a) ? a : [];
  arr.push(rec);
  while (arr.length > max) arr.shift();
  writeJson(p, arr);
}
function defaultState() {
  return {
    version: VERSION,
    modules: { scalp: null, day: null, swing: null },
    wave: null,
    lastWaveRegime15: null,
    lastAuditTs: null,
    lastDecisionTsByModule: {},
    unknownFingerprints: {},
  };
}
function loadState() {
  const s = readJson(STATE_PATH, null);
  if (!s || s.version !== VERSION) return defaultState();
  s.modules = s.modules || { scalp: null, day: null, swing: null };
  s.unknownFingerprints = s.unknownFingerprints || {};
  s.lastDecisionTsByModule = s.lastDecisionTsByModule || {};
  return s;
}
function saveState(s) { writeJson(STATE_PATH, s); }

function quantile(values, q) {
  const a = values.filter(Number.isFinite).sort((x, y) => x - y);
  if (!a.length) return null;
  const i = (a.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  if (lo === hi) return a[lo];
  return a[lo] + (a[hi] - a[lo]) * (i - lo);
}
function microFromRow(r, checkStale = true) {
  if (!r) return null;
  const vol = num(r.volumeFenetreBtc);
  const winSec = num(r.winSec);
  const cadence = num(r.cadence);
  const taille = num(r.tailleMoyenneBtc);
  const priceMove = num(r.priceMove);
  const flow = (vol !== null && winSec !== null && winSec > 0) ? vol / winSec : null;
  const priceYield = (vol !== null && vol > 0 && priceMove !== null) ? priceMove / vol : null;
  const expectedCadence = (winSec !== null && winSec > 0) ? 200 / winSec : null;
  const cadenceError = (cadence !== null && expectedCadence !== null && expectedCadence > 0)
    ? Math.abs(cadence - expectedCadence) / expectedCadence : null;
  let quality = 'VALID';
  const reasons = [];
  if (checkStale && (!r.ts || Date.now() - Number(r.ts) > STALE_MS)) { quality = 'INVALID'; reasons.push('audit stale'); }
  if (winSec === null || winSec <= 0) { quality = 'INVALID'; reasons.push('winSec invalide'); }
  if (cadence === null || cadence < 0) { quality = 'INVALID'; reasons.push('cadence invalide'); }
  if (vol === null || vol < 0) { quality = 'INVALID'; reasons.push('volume invalide'); }
  if (quality !== 'INVALID' && cadenceError !== null && cadenceError > 0.20) {
    quality = 'DEGRADED'; reasons.push('cadence incoherente avec 200/winSec');
  }
  return {
    ts: Number(r.ts), cadence, taille, vol, winSec, flow, priceMove, priceYield,
    pmDir: priceMove === null || Math.abs(priceMove) < 0.1 ? null : (priceMove > 0 ? 'long' : 'short'),
    quality, qualityReasons: reasons, cadenceError,
  };
}

function buildBaselines(rows) {
  const m = rows.slice(-BASELINE_ROWS).map(r => microFromRow(r, false)).filter(Boolean)
    .filter(x => x.quality !== 'INVALID');
  const vals = (k, abs = false) => m.map(x => x[k]).filter(Number.isFinite).map(v => abs ? Math.abs(v) : v);
  const pack = (k, abs = false) => ({
    p25: quantile(vals(k, abs), .25), p50: quantile(vals(k, abs), .50),
    p75: quantile(vals(k, abs), .75), p95: quantile(vals(k, abs), .95),
  });
  return {
    n: m.length,
    cadence: pack('cadence'), flow: pack('flow'), volume: pack('vol'), taille: pack('taille'),
    pmAbs: pack('priceMove', true), yieldAbs: pack('priceYield', true),
  };
}

function ge(v, t) { return Number.isFinite(v) && Number.isFinite(t) && v >= t; }
function le(v, t) { return Number.isFinite(v) && Number.isFinite(t) && v <= t; }

function classifyMicro(cur, b) {
  if (!cur || cur.quality === 'INVALID' || b.n < 40) {
    return { energy: 'UNKNOWN', effort: 'UNKNOWN', conversion: 'UNKNOWN' };
  }
  const apm = Math.abs(cur.priceMove || 0), ay = Math.abs(cur.priceYield || 0);
  let energy = 'NORMAL';
  if (ge(cur.cadence, b.cadence.p95) || ge(cur.flow, b.flow.p95) || ge(apm, b.pmAbs.p95)) energy = 'EXTREME';
  else if (le(cur.cadence, b.cadence.p25) && le(cur.flow, b.flow.p25) && le(apm, b.pmAbs.p25)) energy = 'DEAD';
  else if (ge(apm, b.pmAbs.p75) && (ge(cur.cadence, b.cadence.p50) || ge(cur.flow, b.flow.p50))) energy = 'REACTIVE';
  else if (le(cur.cadence, b.cadence.p50) && le(cur.flow, b.flow.p50) && le(apm, b.pmAbs.p50)) energy = 'QUIET';

  let effort = 'NORMAL';
  if (le(cur.cadence, b.cadence.p25) && ge(cur.vol, b.volume.p75) && ge(cur.taille, b.taille.p75)) effort = 'SLOW_LARGE_TRADES';
  else if (ge(cur.flow, b.flow.p75) || ge(cur.cadence, b.cadence.p75)) effort = 'HIGH';
  else if (le(cur.flow, b.flow.p25) && le(cur.cadence, b.cadence.p25)) effort = 'LOW';

  let conversion = 'NORMAL';
  if ((effort === 'HIGH' || effort === 'SLOW_LARGE_TRADES') && le(ay, b.yieldAbs.p25)) conversion = 'NEUTRALIZED';
  else if (ge(ay, b.yieldAbs.p75) && le(cur.flow, b.flow.p50)) conversion = 'FRAGILE';
  else if (ge(ay, b.yieldAbs.p75)) conversion = 'PRODUCTIVE';
  else if (le(ay, b.yieldAbs.p25)) conversion = 'LOW';
  return { energy, effort, conversion };
}
function forceShift(rows, b) {
  const recent = rows.slice(-10).map(r => microFromRow(r, false)).filter(Boolean)
    .filter(x => x.quality !== 'INVALID' && x.priceMove !== null && x.priceYield !== null);
  if (recent.length < 5 || b.n < 40) return { stage: 'NONE', direction: null };
  let best = { stage: 'NONE', direction: null };
  for (let i = Math.max(0, recent.length - 8); i <= recent.length - 3; i++) {
    const a = recent[i];
    const highEffort = ge(a.flow, b.flow.p75) || ge(a.cadence, b.cadence.p75);
    const lowConversion = le(Math.abs(a.priceYield), b.yieldAbs.p25);
    if (!highEffort || !lowConversion || !a.pmDir) continue;
    best = { stage: 'EFFORT_NEUTRALIZED', direction: null, anchorTs: a.ts, initial: a.pmDir };
    const after = recent.slice(i + 1);
    const initialSign = a.pmDir === 'long' ? 1 : -1;
    const signed = after.slice(0, 3).reduce((s, x) => s + (x.priceMove || 0) * initialSign, 0);
    if (signed > 0) continue;
    const opposite = a.pmDir === 'long' ? 'short' : 'long';
    best = { ...best, stage: 'INITIAL_FAILURE', direction: opposite };
    const productiveOpp = after.some(x => x.pmDir === opposite && ge(Math.abs(x.priceYield), b.yieldAbs.p75));
    if (!productiveOpp) continue;
    best = { ...best, stage: 'OPPOSITE_PRODUCTIVE' };
    const dirs = after.filter(x => x.pmDir).slice(-3).map(x => x.pmDir);
    const persist = dirs.filter(d => d === opposite).length >= 2 && dirs[dirs.length - 1] === opposite;
    if (!persist) continue;
    return { ...best, stage: 'FORCE_SHIFT', direction: opposite };
  }
  return best;
}
function parseCsvLast(tf) {
  const p = path.join(MCB, `mcb_${tf}.csv`);
  try {
    const lines = fs.readFileSync(p, 'utf8').trim().split(/\r?\n/);
    if (lines.length < 2) return null;
    const h = lines[0].split(','), v = lines[lines.length - 1].split(',');
    const r = {};
    h.forEach((k, i) => { r[k] = v[i]; });
    ['open','high','low','close','lt_blue_wave','blue_wave','money_flow'].forEach(k => {
      const n = Number(r[k]); r[k] = Number.isFinite(n) ? n : null;
    });
    return r;
  } catch (_) { return null; }
}

function classifyTf(row) {
  if (!row) return { bias: 'unknown', signs: [] };
  const vals = [row.lt_blue_wave, row.blue_wave, row.money_flow].filter(Number.isFinite);
  const signs = vals.map(v => v > 0 ? 'long' : v < 0 ? 'short' : 'neutral');
  const longs = signs.filter(x => x === 'long').length;
  const shorts = signs.filter(x => x === 'short').length;
  let bias = 'mixed';
  if (longs >= 2 && shorts <= 1) bias = 'long';
  if (shorts >= 2 && longs <= 1) bias = 'short';
  if (!vals.length) bias = 'unknown';
  return { bias, signs, timestamp: row.timestamp, values: {
    lbw: row.lt_blue_wave, bw: row.blue_wave, mf: row.money_flow, close: row.close,
  }};
}
function topDown() {
  const tfs = {};
  for (const tf of ['1w','1d','4h','1h','15m','3m']) tfs[tf] = classifyTf(parseCsvLast(tf));
  const major = ['1w','1d','4h','1h'].map(tf => tfs[tf].bias).filter(x => x === 'long' || x === 'short');
  const longs = major.filter(x => x === 'long').length, shorts = major.filter(x => x === 'short').length;
  let state = 'CONFLICT', bias = null;
  if (major.length < 2) state = 'UNKNOWN';
  else if (longs >= 3 && shorts <= 1) { state = 'ALIGNED_BULLISH'; bias = 'long'; }
  else if (shorts >= 3 && longs <= 1) { state = 'ALIGNED_BEARISH'; bias = 'short'; }
  else if (longs === major.length) { state = 'ALIGNED_BULLISH'; bias = 'long'; }
  else if (shorts === major.length) { state = 'ALIGNED_BEARISH'; bias = 'short'; }
  return { state, bias, tfs };
}

function locationState(price) {
  const tl = readJson(TRENDLINES_PATH, null);
  const levels = readJson(LEVELS_PATH, []);
  let trendline = null;
  if (tl && tl.inZone) trendline = { active: true, nature: tl.natureInZone || null, contacts: tl.maxPointsInZone || null };
  let nearestLevel = null;
  if (Array.isArray(levels) && Number.isFinite(price)) {
    for (const l of levels) {
      const p = Number(l.price); if (!Number.isFinite(p)) continue;
      const dPct = Math.abs(price - p) / price * 100;
      if (!nearestLevel || dPct < nearestLevel.distancePct) nearestLevel = { label: l.label, family: l.fam, price: p, distancePct: dPct };
    }
  }
  const levelActive = nearestLevel && nearestLevel.distancePct <= LEVEL_TOLERANCE_PCT ? nearestLevel : null;
  return { relevant: !!trendline || !!levelActive, trendline, level: levelActive };
}

function locationSupports(loc, dir) {
  if (!loc || !loc.relevant) return false;
  const natures = [];
  if (loc.trendline && loc.trendline.nature) natures.push(String(loc.trendline.nature).toLowerCase());
  if (loc.level && loc.level.family) natures.push(String(loc.level.family).toLowerCase());
  if (dir === 'long') return natures.some(x => x.includes('support') || x === 'poc' || x === 'fib');
  return natures.some(x => x.includes('resistance') || x === 'poc' || x === 'fib');
}
function startWave(dir, ts, price, lbw, partial) {
  return {
    id: `wave-${ts}`, direction: dir, partial: !!partial,
    startTs: ts, startPrice: price, startLbw: lbw,
    e15: null, samples: 0, lastSampleTs: null,
    btcIntegratedEstimate: 0, maxCadence: 0, maxFlow: 0,
    sumAbsYield: 0, yieldSamples: 0, maxAbsLbw: Math.abs(lbw || 0),
  };
}

function closeWave(w, ts, price, lbw) {
  const out = { ...w, endTs: ts, endPrice: price, endLbw: lbw,
    durationSec: Math.max(0, (ts - w.startTs) / 1000),
    priceDelta: Number.isFinite(price) && Number.isFinite(w.startPrice) ? price - w.startPrice : null,
    meanAbsYield: w.yieldSamples ? w.sumAbsYield / w.yieldSamples : null,
    volumeMetric: 'btcIntegratedEstimate uses sampled BTC/s; not exact raw cumulative BTC',
  };
  appendCapped(WAVES_PATH, out, WAVES_MAX);
  return out;
}

function updateWave(state, baton, micro, price) {
  if (!micro || micro.ts === state.lastAuditTs) return;
  const lbw = num(baton && (num(baton.live15LbwRaw) !== null ? baton.live15LbwRaw : baton.live15Lbw));
  if (lbw === null) { state.lastAuditTs = micro.ts; return; }
  const dir = lbw > 0 ? 'long' : lbw < 0 ? 'short' : 'neutral';
  if (!state.wave && dir !== 'neutral') state.wave = startWave(dir, micro.ts, price, lbw, true);
  else if (state.wave && dir !== 'neutral' && dir !== state.wave.direction) {
    closeWave(state.wave, micro.ts, price, lbw);
    state.wave = startWave(dir, micro.ts, price, lbw, false);
  }
  const w = state.wave;
  if (w) {
    const dt = w.lastSampleTs ? Math.min(120, Math.max(0, (micro.ts - w.lastSampleTs) / 1000)) : 0;
    if (Number.isFinite(micro.flow)) w.btcIntegratedEstimate += micro.flow * dt;
    if (Number.isFinite(micro.cadence)) w.maxCadence = Math.max(w.maxCadence, micro.cadence);
    if (Number.isFinite(micro.flow)) w.maxFlow = Math.max(w.maxFlow, micro.flow);
    if (Number.isFinite(micro.priceYield)) { w.sumAbsYield += Math.abs(micro.priceYield); w.yieldSamples++; }
    w.maxAbsLbw = Math.max(w.maxAbsLbw, Math.abs(lbw));
    w.samples++; w.lastSampleTs = micro.ts; w.currentLbw = lbw; w.currentPrice = price;
  }
  const reg = baton ? baton.waveRegime15 : null;
  if (reg && reg !== state.lastWaveRegime15 && state.wave) {
    const e15Type = reg === 'baissier' ? 'pic' : reg === 'haussier' ? 'creux' : null;
    const expectedDir = e15Type === 'pic' ? 'long' : e15Type === 'creux' ? 'short' : null;
    if (e15Type && state.wave.direction === expectedDir) {
      state.wave.e15 = {
        type: e15Type, ts: micro.ts, value: num(baton.waveRegime15Value),
        price, lbw,
      };
    }
  }
  state.lastWaveRegime15 = reg || state.lastWaveRegime15;
  state.lastAuditTs = micro.ts;
}

function understanding(quality, top, wave, microClass, seq) {
  if (!quality || quality === 'INVALID') return 'INVALID_DATA';
  if (!wave || top.state === 'UNKNOWN') return 'UNKNOWN';
  if (top.state === 'CONFLICT') return 'CONTRADICTORY';
  if (seq.stage === 'FORCE_SHIFT') return 'KNOWN';
  if (microClass.energy === 'EXTREME' && seq.stage === 'NONE') return 'UNKNOWN';
  if (microClass.conversion === 'NEUTRALIZED' || microClass.conversion === 'FRAGILE') return 'AMBIGUOUS';
  return 'KNOWN';
}

function opportunity(ctx) {
  const none = { state: 'NONE', direction: null, archetype: null, reasons: [] };
  if (ctx.understanding !== 'KNOWN' || ctx.micro.energy === 'DEAD' || ctx.micro.energy === 'UNKNOWN') return none;

  if (ctx.sequence.stage === 'FORCE_SHIFT' && ctx.sequence.direction) {
    const dir = ctx.sequence.direction;
    const atPlace = locationSupports(ctx.location, dir);
    const waveOpposed = ctx.wave && ctx.wave.direction !== dir;
    const e15Seen = !!(ctx.wave && ctx.wave.e15);
    if (atPlace && waveOpposed && e15Seen) return { state: 'READY', direction: dir, archetype: 'REVERSAL', reasons: ['force shift causal', 'lieu compatible', 'E15 observe'] };
    if (atPlace) return { state: 'FORMING', direction: dir, archetype: 'REVERSAL', reasons: ['force shift causal', 'lieu compatible', 'attente structure vague/E15'] };
    return { state: 'WATCH', direction: dir, archetype: 'REVERSAL', reasons: ['force shift causal sans lieu valide'] };
  }

  const dir = ctx.wave ? ctx.wave.direction : null;
  if (!dir || ctx.top.bias !== dir) return none;
  const atPlace = locationSupports(ctx.location, dir);
  const pmOk = ctx.current.pmDir === dir;
  const productive = ctx.micro.conversion === 'PRODUCTIVE';
  const energetic = ctx.micro.energy === 'REACTIVE' || ctx.micro.energy === 'EXTREME';
  if (atPlace && pmOk && productive && energetic) return { state: 'READY', direction: dir, archetype: 'CONTINUATION', reasons: ['top-down aligne', 'vague compatible', 'lieu compatible', 'effort productif'] };
  if (atPlace && (energetic || productive)) return { state: 'FORMING', direction: dir, archetype: 'CONTINUATION', reasons: ['structure et lieu compatibles'] };
  return { state: 'WATCH', direction: dir, archetype: 'CONTINUATION', reasons: ['structure compatible, conditions execution absentes'] };
}
function pnlPct(pos, price) {
  if (!pos || !Number.isFinite(price) || !Number.isFinite(pos.entryPrice)) return null;
  const raw = (price - pos.entryPrice) / pos.entryPrice * 100;
  return pos.direction === 'long' ? raw : -raw;
}

function recordExit(module, pos, price, kind, reason, ctx) {
  const pnl = pnlPct(pos, price);
  appendCapped(HISTORY_PATH, {
    version: VERSION, module, direction: pos.direction,
    entryPrice: pos.entryPrice, entryTimestamp: pos.entryTimestamp,
    exitPrice: price, exitTimestamp: nowIso(),
    exitKind: kind, exitReason: reason,
    pnlPercentPrice: pnl,
    pnlPercentLeveraged: pnl === null ? null : pnl * (pos.leverage || 10),
    entryContext: pos.context,
    exitContext: ctx,
  }, HISTORY_MAX);
}

function managePosition(module, pos, price, ctx, config) {
  const ageMs = Date.now() - Date.parse(pos.entryTimestamp);
  const adverseUsd = pos.direction === 'long' ? pos.entryPrice - price : price - pos.entryPrice;
  const vm = (((config || {}).tradeSimulator || {}).violentMove || {});
  const violentThreshold = vm.thresholdPct !== undefined ? vm.thresholdPct : 0.15;

  if (adverseUsd >= RISK_STOP_USD) return { kind: 'EXIT_RISK', reason: `fixed risk stop ${RISK_STOP_USD} USD` };
  if (vm.enabled !== false && ctx.current.priceMove !== null) {
    const adversePm = pos.direction === 'long' ? -ctx.current.priceMove : ctx.current.priceMove;
    if (adversePm / pos.entryPrice * 100 >= violentThreshold) return { kind: 'EXIT_RISK', reason: `violent adverse move ${adversePm.toFixed(1)} USD` };
  }

  if (ctx.wave && ctx.wave.direction && ctx.wave.direction !== pos.direction && ageMs >= ENTRY_GRACE_MS) {
    return { kind: 'EXIT_STRUCTURE', reason: `LBW15 zero-cross -> wave ${ctx.wave.direction}` };
  }
  if (ctx.top.bias && ctx.top.bias !== pos.direction && ctx.top.state.startsWith('ALIGNED_') && ageMs >= ENTRY_GRACE_MS) {
    return { kind: 'EXIT_STRUCTURE', reason: `higher timeframes aligned ${ctx.top.bias}` };
  }

  pos.deadCycles = ctx.micro.energy === 'DEAD' ? (pos.deadCycles || 0) + 1 : 0;
  if (ageMs >= ENTRY_GRACE_MS && ctx.sequence.stage === 'FORCE_SHIFT' && ctx.sequence.direction && ctx.sequence.direction !== pos.direction) {
    return { kind: 'EXIT_EXECUTION', reason: `force shift persistent -> ${ctx.sequence.direction}` };
  }
  if (ageMs >= ENTRY_GRACE_MS && pos.deadCycles >= EXECUTION_DEAD_CYCLES) {
    return { kind: 'EXIT_EXECUTION', reason: `market dead ${pos.deadCycles} cycles` };
  }
  return null;
}

function contextSnapshot(ctx) {
  return {
    topDown: ctx.top,
    wave: ctx.wave,
    location: ctx.location,
    micro: ctx.micro,
    current: ctx.current,
    sequence: ctx.sequence,
    understanding: ctx.understanding,
    opportunity: ctx.opportunity,
  };
}
function logDecision(state, module, price, ctx, action, reason) {
  const fp = [ctx.understanding, ctx.top.state, ctx.wave && ctx.wave.direction,
    ctx.micro.energy, ctx.micro.effort, ctx.micro.conversion,
    ctx.sequence.stage, ctx.opportunity.state, ctx.opportunity.direction].join('|');
  const now = Date.now();
  const last = state.lastDecisionTsByModule[module] || {};
  if (last.fp === fp && now - (last.ts || 0) < 600000 && action === 'NO_TRADE') return;
  state.lastDecisionTsByModule[module] = { fp, ts: now };
  appendCapped(DECISIONS_PATH, {
    ts: nowIso(), version: VERSION, module, price, action, reason,
    fingerprint: fp, context: contextSnapshot(ctx),
  }, DECISION_MAX);
  if (ctx.understanding === 'UNKNOWN') {
    const u = state.unknownFingerprints[fp] || { count: 0, firstSeen: nowIso() };
    u.count++; u.lastSeen = nowIso(); u.lastPrice = price;
    state.unknownFingerprints[fp] = u;
  }
}

function buildContext(state, baton, auditRows, price) {
  const current = microFromRow(auditRows[auditRows.length - 1]);
  const baselines = buildBaselines(auditRows);
  const micro = classifyMicro(current, baselines);
  const sequence = forceShift(auditRows, baselines);
  const top = topDown();
  const location = locationState(price);
  updateWave(state, baton, current, price);
  const wave = state.wave ? JSON.parse(JSON.stringify(state.wave)) : null;
  const understood = understanding(current && current.quality, top, wave, micro, sequence);
  const ctx = { current, baselines, micro, sequence, top, location, wave, understanding: understood };
  ctx.opportunity = opportunity(ctx);
  return ctx;
}

function simulateModule(module, primaryVol, divRaw, config, volByTf) {
  const active = (((config || {}).tradeSimulator || {}).activeModules) || ['day'];
  if (!active.includes(module)) return null;

  const state = loadState();
  const baton = readJson(BATON_PATH, null);
  const auditRows = readJson(AUDIT_PATH, []);
  const rawPrice = primaryVol && primaryVol.trigger ? Number(primaryVol.trigger.lastPrice) : NaN;
  const price = Number.isFinite(rawPrice) ? rawPrice : (baton ? Number(baton.lastPrice) : NaN);
  if (!baton || !Array.isArray(auditRows) || !auditRows.length || !Number.isFinite(price)) return null;

  const ctx = buildContext(state, baton, auditRows, price);
  const pos = state.modules[module];
  if (pos) {
    const exit = managePosition(module, pos, price, ctx, config);
    if (exit) {
      recordExit(module, pos, price, exit.kind, exit.reason, contextSnapshot(ctx));
      logDecision(state, module, price, ctx, exit.kind, exit.reason);
      state.modules[module] = null;
      saveState(state);
      return `[TRADE-SIM V2] ${module.toUpperCase()} ${exit.kind} ${pos.direction} @ ${price} -- ${exit.reason}`;
    }
    pos.lastContext = contextSnapshot(ctx);
    pos.lastPrice = price;
    pos.pnlPercentPrice = pnlPct(pos, price);
    logDecision(state, module, price, ctx, 'HOLD', 'position maintained');
    saveState(state);
    return null;
  }

  if (ctx.opportunity.state !== 'READY') {
    logDecision(state, module, price, ctx, 'NO_TRADE', `${ctx.understanding}/${ctx.opportunity.state}`);
    saveState(state);
    return null;
  }

  state.modules[module] = {
    version: VERSION,
    direction: ctx.opportunity.direction,
    archetype: ctx.opportunity.archetype,
    entryPrice: price,
    entryTimestamp: nowIso(),
    leverage: 10,
    deadCycles: 0,
    context: contextSnapshot(ctx),
  };
  logDecision(state, module, price, ctx, 'ENTER', `${ctx.opportunity.archetype} READY`);
  saveState(state);
  return `[TRADE-SIM V2] ${module.toUpperCase()} ENTER_${ctx.opportunity.direction.toUpperCase()} @ ${price} -- ${ctx.opportunity.archetype}`;
}

function computeLiquidationPrice(entryPrice, direction, leverage) {
  if (!entryPrice || !leverage) return null;
  const d = entryPrice / leverage;
  return direction === 'long' ? entryPrice - d : entryPrice + d;
}

const ORDER_DEFAULTS = { leverage: 10, orderType: 'market', openType: 'isolated' };
module.exports = { simulateModule, loadState, ORDER_DEFAULTS, computeLiquidationPrice, buildContext, forceShift };
