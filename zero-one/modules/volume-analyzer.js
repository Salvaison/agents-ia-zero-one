const fs = require('fs');
const path = require('path');

function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));
}
const _config = loadConfig();
const priceStream = require('./price-stream');

// --- Trigger group tick buffer ---
// price-stream.js emits individual 'price' ticks and does not buffer them itself.
// volume-analyzer.js maintains its own rolling window here so analyzeTrigger()
// has recent data to compare against.
const TICK_BUFFER_MAX = 200; // rolling window size — arbitrary, not yet calibrated
let tickBuffer = [];

priceStream.on('price', (tick) => {
  tickBuffer.push(tick);
  if (tickBuffer.length > TICK_BUFFER_MAX) tickBuffer.shift();
});

// start() is idempotent — safe to call even if cerveau-central.js already started the stream.
priceStream.start();

// Real production CSVs — 6 timeframes, synced from iMac every 5 min
const CSV_FILES = {
  '3m':  path.join(__dirname, '../../data/mcb-live/mcb_3m.csv'),
  '15m': path.join(__dirname, '../../data/mcb-live/mcb_15m.csv'),
  '1h':  path.join(__dirname, '../../data/mcb-live/mcb_1h.csv'),
  '4h':  path.join(__dirname, '../../data/mcb-live/mcb_4h.csv'),
  '1d':  path.join(__dirname, '../../data/mcb-live/mcb_1d.csv'),
  '1w':  path.join(__dirname, '../../data/mcb-live/mcb_1w.csv'),
};

// Real CSV schema: timestamp, open, high, low, close, lt_blue_wave, blue_wave, money_flow, buy, sell, dbsi_top, dbsi_bottom
function readCSV(timeframe) {
  const filePath = CSV_FILES[timeframe];
  if (!filePath || !fs.existsSync(filePath)) return [];

  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  return lines.slice(1).map(line => {
    const [timestamp, open, high, low, close, lt_blue_wave, blue_wave, money_flow, buy, sell, dbsi_top, dbsi_bottom, ma200] = line.split(',');
    return {
      timestamp,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      lt_blue_wave: parseFloat(lt_blue_wave),
      blue_wave: parseFloat(blue_wave),
      money_flow: parseFloat(money_flow),
      buy: parseFloat(buy),
      sell: parseFloat(sell),
      dbsi_top: parseFloat(dbsi_top),
      dbsi_bottom: parseFloat(dbsi_bottom),
      ma200: parseFloat(ma200),
    };
  }).filter(r => !isNaN(r.close));
}

// --- Group 1: Momentum (Blue Wave + Lt Blue Wave) — TradingView / MCB source ---
function loadConfig() {
  const configPath = path.join(__dirname, '../config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function toScore(value, thresholds) {
  const v = Math.abs(value);
  if (v >= thresholds[3]) return 5;
  if (v >= thresholds[2]) return 4;
  if (v >= thresholds[1]) return 3;
  if (v >= thresholds[0]) return 2;
  return 1;
}

function analyzeMomentum(timeframe, lookback = 20) {
  // Modifie le 24/07/2026 : LBW seul (velocite/amplitude immediate).
  // Auparavant |BW|+|LBW| combines -- la moyenne noyait le signal de
  // convergence que le VWAP (LBW-BW) capture desormais separement.
  const data = readCSV(timeframe);
  if (data.length < 3) return { status: 'insufficient_data', count: data.length };
  const recent = data.slice(-lookback);
  const last3 = recent.slice(-3);
  const avgLbw = last3.reduce((a, r) => a + Math.abs(r.lt_blue_wave), 0) / last3.length;
  const score = toScore(avgLbw, _config.scoring.momentum.thresholds.values);
  return {
    group: 'momentum',
    timeframe,
    avgLbw: avgLbw.toFixed(2),
    score,
  };
}

function analyzeMoneyFlow(timeframe, lookback = 20) {
  const data = readCSV(timeframe);
  if (data.length < 3) return { status: 'insufficient_data', count: data.length };
  const recent = data.slice(-lookback);
  const last3 = recent.slice(-3);
  const avgMF = last3.reduce((a, r) => a + Math.abs(r.money_flow), 0) / last3.length;
  const score = toScore(avgMF, _config.scoring.moneyFlow.thresholds.values);
  return {
    group: 'moneyFlow',
    timeframe,
    avgMF: avgMF.toFixed(2),
    score,
  };
}
function analyzeDbsi(timeframe, lookback = 20) {
  // Modifie le 24/07/2026 : le DBSI se recalcule en continu tant qu'une bougie
  // est ouverte (valeur vide dans le CSV jusqu'a cloture). On retombe sur la
  // derniere bougie CLOTUREE avec un DBSI valide plutot que de bloquer
  // pendant toute la duree de la bougie en cours.
  const data = readCSV(timeframe);
  if (data.length < 3) return { status: 'insufficient_data', count: data.length };
  const recent = data.slice(-lookback);
  let last = null;
  let staleCandles = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (!isNaN(recent[i].dbsi_top) && !isNaN(recent[i].dbsi_bottom)) {
      last = recent[i];
      break;
    }
    staleCandles++;
  }
  if (!last) {
    return { status: 'insufficient_data', count: 0, note: 'aucune bougie recente avec dbsi valide' };
  }
  const diff = last.dbsi_top - last.dbsi_bottom;
  const score = toScore(diff, _config.scoring.dbsi.thresholds.values);
  return {
    group: 'dbsi',
    timeframe,
    diff: diff.toFixed(2),
    dbsiTop: last.dbsi_top.toFixed(2),
    dbsiBottom: last.dbsi_bottom.toFixed(2),
    score,
    stale: staleCandles > 0,
    staleCandles,
  };
}
function analyzeVwap(timeframe, lookback = 20) {
  // VWAP = LBW - BW, confirme le 24/07/2026 (voir config.json scoring.vwap._note).
  // Proche de zero = retournement en cours. L'amplitude de la traversee
  // (ecart entre les deux valeurs qui encadrent le passage par zero) mesure
  // la force du retournement.
  const data = readCSV(timeframe);
  if (data.length < 2) return { status: 'insufficient_data', count: data.length };
  const recent = data.slice(-lookback);
  const withVwap = recent.map(r => ({ ts: r.timestamp, vwap: r.lt_blue_wave - r.blue_wave }));
  const last = withVwap[withVwap.length - 1];
  const prev = withVwap[withVwap.length - 2];

  const crossedZero = Math.sign(last.vwap) !== Math.sign(prev.vwap) && prev.vwap !== 0;
  const reversalMagnitude = crossedZero ? Math.abs(last.vwap - prev.vwap) : null;
  const nearZero = Math.abs(last.vwap) < _config.scoring.vwap.nearZeroThreshold;

  const score = toScore(
    crossedZero ? reversalMagnitude : Math.abs(last.vwap),
    _config.scoring.vwap.thresholds.values
  );

  return {
    group: 'vwap',
    timeframe,
    current: last.vwap.toFixed(2),
    previous: prev.vwap.toFixed(2),
    crossedZero,
    reversalMagnitude: reversalMagnitude !== null ? reversalMagnitude.toFixed(2) : null,
    nearZero,
    score,
  };
}

function analyzeTrigger() {
  if (tickBuffer.length < 50) {
    return { group: 'trigger', status: 'insufficient_data', count: tickBuffer.length };
  }

  const PCT_THRESHOLDS = _config.scoring.trigger.thresholds.values;

  const slices = [];
  for (let i = 0; i < 4; i++) {
    const start = tickBuffer.length - (4 - i) * 50;
    const slice = tickBuffer.slice(Math.max(0, start), start + 50);
    if (slice.length < 2) { slices.push(null); continue; }
    const p0 = slice[0].price;
    const p1 = slice[slice.length - 1].price;
    const pctMove = (p1 - p0) / p0;
    slices.push({ pctMove, score: toScore(pctMove, PCT_THRESHOLDS) });
  }

  const validSlices = slices.filter(s => s !== null);
  if (validSlices.length === 0) {
    return { group: 'trigger', status: 'insufficient_data', count: tickBuffer.length };
  }

  const signs = validSlices.map(s => Math.sign(s.pctMove));
  const sameSignCount = signs.filter(s => s === signs[0] && s !== 0).length;
  const coherence = sameSignCount / validSlices.length;

  const avgScore = validSlices.reduce((a, s) => a + s.score, 0) / validSlices.length;
  const weightedScore = Math.round(avgScore * (0.5 + 0.5 * coherence));

  const windowTicks = tickBuffer.slice(-200);
  const cadence = windowTicks.length >= 2
    ? (windowTicks.length / ((windowTicks[windowTicks.length - 1].ts - windowTicks[0].ts) / 1000 || 1)).toFixed(2)
    : null;
  // Cadence exposee comme condition de scenario a part entiere (24/07/2026).
  // Seuils provisoires dans config.json scoring.cadence -- voir _note.
  const cadenceScore = cadence !== null
    ? toScore(parseFloat(cadence), _config.scoring.cadence.thresholds.values)
    : null;

  const lastPrice = tickBuffer[tickBuffer.length - 1].price;

  return {
    group: 'trigger',
    lastPrice,
    slices: validSlices.map(s => ({ pctMove: (s.pctMove * 100).toFixed(4) + '%', score: s.score })),
    coherence: coherence.toFixed(2),
    cadenceTicksPerSec: cadence,
    cadenceScore,
    score: weightedScore,
  };
}
function analyzeVolume(timeframe) {
  const momentum = analyzeMomentum(timeframe);
  const moneyFlow = analyzeMoneyFlow(timeframe);
  const dbsi = analyzeDbsi(timeframe);
  const vwap = analyzeVwap(timeframe);
  const trigger = analyzeTrigger();
  return {
    timeframe,
    momentum,
    moneyFlow,
    dbsi,
    vwap,
    trigger,
  };
}

function runVolumeAnalyzer() {
  console.log('=== Module Volume - Momentum / MoneyFlow / DBSI / Trigger ===');
  for (const tf of ['3m', '15m', '1h', '4h', '1d', '1w']) {
    const result = analyzeVolume(tf);
    console.log(`[${tf}]`);
    for (const g of ['momentum', 'moneyFlow', 'dbsi', 'vwap']) {
      const r = result[g];
      console.log(r.status === 'insufficient_data'
        ? `  ${g}: donnees insuffisantes (${r.count} entrees)`
        : `  ${g}: score=${r.score}`);
    }
    console.log(result.trigger.status === 'insufficient_data'
      ? `  trigger: ${result.trigger.count} ticks en buffer`
      : `  trigger: score=${result.trigger.score} coherence=${result.trigger.coherence}`);
  }
}

module.exports = { analyzeVolume, analyzeMomentum, analyzeMoneyFlow, analyzeDbsi, analyzeVwap, analyzeTrigger };
