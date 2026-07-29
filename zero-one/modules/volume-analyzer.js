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
  // Valeurs brutes (27/07/2026) : derniere bougie signee (pas moyenne, pas
  // valeur absolue) + tendance, pour l'affichage diagnostic reel.
  const lastCandle = recent[recent.length - 1];
  const prevCandle = recent[recent.length - 2];
  const lastLbw = lastCandle.lt_blue_wave;
  const lastBw = lastCandle.blue_wave;
  const trendLbw = prevCandle
    ? (lastLbw > prevCandle.lt_blue_wave ? 'hausse' : (lastLbw < prevCandle.lt_blue_wave ? 'baisse' : 'stable'))
    : 'stable';
  return {
    group: 'momentum',
    timeframe,
    avgLbw: avgLbw.toFixed(2),
    score,
    lastLbw: lastLbw.toFixed(2),
    lastBw: lastBw.toFixed(2),
    trendLbw,
    lastHigh: lastCandle.high,
    lastLow: lastCandle.low,
    lastClose: lastCandle.close,
    lastMa200: lastCandle.ma200,
  };
}

function analyzeMoneyFlow(timeframe, lookback = 20) {
  const data = readCSV(timeframe);
  if (data.length < 3) return { status: 'insufficient_data', count: data.length };
  const recent = data.slice(-lookback);
  const last3 = recent.slice(-3);
  const avgMF = last3.reduce((a, r) => a + Math.abs(r.money_flow), 0) / last3.length;
  const score = toScore(avgMF, _config.scoring.moneyFlow.thresholds.values);
  // Valeur brute (27/07/2026) : derniere bougie signee + tendance, pour
  // l'affichage diagnostic reel.
  const lastCandle = recent[recent.length - 1];
  const prevCandle = recent[recent.length - 2];
  const lastMoneyFlow = lastCandle.money_flow;
  const trendMoneyFlow = prevCandle
    ? (lastMoneyFlow > prevCandle.money_flow ? 'hausse' : (lastMoneyFlow < prevCandle.money_flow ? 'baisse' : 'stable'))
    : 'stable';
  return {
    group: 'moneyFlow',
    timeframe,
    avgMF: avgMF.toFixed(2),
    score,
    lastMoneyFlow: lastMoneyFlow.toFixed(2),
    trendMoneyFlow,
  };
}
// Bornes empiriques approximatives (28/07/2026, a affiner en observation) :
// LBW/BW ~ +/-120, MoneyFlow ~ +/-35. Utilisees pour ramener les trois sur
// une echelle commune (%) avant de les moyenner en un score d'Engagement
// (la vague et les participants -- distinct de la Velocite, basee sur
// Cadence/DBSI/Trigger).
const ENGAGEMENT_BOUNDS = { lbw: 120, bw: 120, moneyFlow: 35 };

function analyzeEngagement(timeframe, lookback = 20) {
  const momentum = analyzeMomentum(timeframe, lookback);
  const moneyFlow = analyzeMoneyFlow(timeframe, lookback);
  if (momentum.status === 'insufficient_data' || moneyFlow.status === 'insufficient_data') {
    return { status: 'insufficient_data' };
  }
  const lbwPct = Math.min(Math.abs(parseFloat(momentum.lastLbw)) / ENGAGEMENT_BOUNDS.lbw, 1) * 100;
  const bwPct = Math.min(Math.abs(parseFloat(momentum.lastBw)) / ENGAGEMENT_BOUNDS.bw, 1) * 100;
  const mfPct = Math.min(Math.abs(parseFloat(moneyFlow.lastMoneyFlow)) / ENGAGEMENT_BOUNDS.moneyFlow, 1) * 100;
  const avgPct = (lbwPct + bwPct + mfPct) / 3;
  const score = toScore(avgPct, _config.scoring.engagement.thresholds.values);
  return {
    group: 'engagement',
    timeframe,
    lbwPct: lbwPct.toFixed(1),
    bwPct: bwPct.toFixed(1),
    mfPct: mfPct.toFixed(1),
    avgPct: avgPct.toFixed(1),
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
  const SLICE_COUNT = 8; // passe de 4 a 8 le 27/07/2026 -- granularite plus fine (0.125/palier au lieu de 0.25)
  const SLICE_SIZE = 25; // reduit de 50 a 25 -- fenetre totale inchangee a 200 ticks (8x25)

  const slices = [];
  for (let i = 0; i < SLICE_COUNT; i++) {
    const start = tickBuffer.length - (SLICE_COUNT - i) * SLICE_SIZE;
    const slice = tickBuffer.slice(Math.max(0, start), start + SLICE_SIZE);
    if (slice.length < 2) { slices.push(null); continue; }
    const p0 = slice[0].price;
    const p1 = slice[slice.length - 1].price;
    const pctMove = (p1 - p0) / p0;
    // Delta de volume signe (27/07/2026) : volume achat moins volume vente
    // sur la tranche -- mesure si le mouvement de prix est porte par un
    // vrai flux directionnel (side/volume du tick) ou juste du bruit.
    let buyVol = 0;
    let sellVol = 0;
    for (const t of slice) {
      const v = parseFloat(t.volume) || 0;
      if (t.side === 1) buyVol += v;
      else if (t.side === 2) sellVol += v;
    }
    const volDelta = buyVol - sellVol;
    slices.push({ pctMove, score: toScore(pctMove, PCT_THRESHOLDS), volDelta });
  }

  const validSlices = slices.filter(s => s !== null);
  if (validSlices.length === 0) {
    return { group: 'trigger', status: 'insufficient_data', count: tickBuffer.length };
  }

  const signs = validSlices.map(s => Math.sign(s.pctMove));
  const sameSignCount = signs.filter(s => s === signs[0] && s !== 0).length;
  const coherence = sameSignCount / validSlices.length;

  // convictionScore (27/07/2026, chantier volume/side) : meme logique que
  // coherence mais appliquee au signe du volume delta plutot qu'au prix --
  // mesure si le FLUX (achat/vente) va dans le meme sens sur les tranches,
  // independamment du mouvement de prix. EXPOSE POUR OBSERVATION SEULEMENT :
  // ne participe pas encore a weightedScore ni a la bascule MA/Tendance
  // (a calibrer avant integration -- decision du 27/07/2026).
  const volSigns = validSlices.map(s => Math.sign(s.volDelta));
  const sameVolSignCount = volSigns.filter(s => s === volSigns[0] && s !== 0).length;
  const convictionScore = sameVolSignCount / validSlices.length;

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

  // Sens lisse (29/07/2026) : signe du mouvement de prix moyenne sur les 3
  // dernieres tranches (sur 8), pour donner une direction exploitable a un
  // bypass Cadence -- coherence/convictionScore restent des magnitudes non
  // signees, ce champ comble ce manque.
  const last3 = validSlices.slice(-3);
  const avgPctMove3 = last3.reduce((a, s) => a + s.pctMove, 0) / last3.length;
  const priceSens3 = Math.sign(avgPctMove3);

  const lastPrice = tickBuffer[tickBuffer.length - 1].price;

  return {
    group: 'trigger',
    lastPrice,
    slices: validSlices.map(s => ({ pctMove: (s.pctMove * 100).toFixed(4) + '%', score: s.score, volDelta: s.volDelta.toFixed(4) })),
    coherence: coherence.toFixed(2),
    convictionScore: convictionScore.toFixed(2),
    cadenceTicksPerSec: cadence,
    cadenceScore,
    priceSens3,
    avgPctMove3: (avgPctMove3 * 100).toFixed(4) + '%',
    score: weightedScore,
  };
}
function analyzeVolume(timeframe) {
  const momentum = analyzeMomentum(timeframe);
  const moneyFlow = analyzeMoneyFlow(timeframe);
  const dbsi = analyzeDbsi(timeframe);
  const vwap = analyzeVwap(timeframe);
  const trigger = analyzeTrigger();
  const engagement = analyzeEngagement(timeframe);
  return {
    timeframe,
    momentum,
    moneyFlow,
    dbsi,
    vwap,
    trigger,
    engagement,
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

module.exports = { analyzeVolume, analyzeMomentum, analyzeMoneyFlow, analyzeDbsi, analyzeVwap, analyzeTrigger, analyzeEngagement };
