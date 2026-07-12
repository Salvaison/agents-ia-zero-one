const fs = require('fs');
const path = require('path');
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
    const [timestamp, open, high, low, close, lt_blue_wave, blue_wave, money_flow, buy, sell, dbsi_top, dbsi_bottom] = line.split(',');
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
    };
  }).filter(r => !isNaN(r.close));
}

// --- Group 1: Momentum (Blue Wave + Lt Blue Wave) — TradingView / MCB source ---
function analyzeMomentum(timeframe, lookback = 20) {
  const data = readCSV(timeframe);
  if (data.length < 3) return { status: 'insufficient_data', count: data.length };

  const recent = data.slice(-lookback);
  const bwSeries = recent.map(r => r.blue_wave);
  const lbwSeries = recent.map(r => r.lt_blue_wave);

  const avgBW = bwSeries.reduce((a, b) => a + b, 0) / bwSeries.length;
  const avgLBW = lbwSeries.reduce((a, b) => a + b, 0) / lbwSeries.length;
  const lastBW = bwSeries[bwSeries.length - 1];
  const lastLBW = lbwSeries[lbwSeries.length - 1];

  let force = 'normal';
  const combined = lastBW + lastLBW;
  const avgCombined = avgBW + avgLBW;
  if (combined > avgCombined * 1.5) force = 'fort';
  if (combined < avgCombined * 0.5) force = 'faible';

  return {
    group: 'momentum',
    timeframe,
    lastBW: lastBW.toFixed(2),
    lastLBW: lastLBW.toFixed(2),
    force,
    // TBD — scoring weight per group not yet defined (pending calibration decision)
    score: null,
  };
}

// --- Group 2: Engagement (Money Flow + DBSI) — TradingView / MCB source ---
function analyzeEngagement(timeframe, lookback = 20) {
  const data = readCSV(timeframe);
  if (data.length < 3) return { status: 'insufficient_data', count: data.length };

  const recent = data.slice(-lookback);
  const mfSeries = recent.map(r => r.money_flow);
  const dbsiTopSeries = recent.map(r => r.dbsi_top);
  const dbsiBottomSeries = recent.map(r => r.dbsi_bottom);

  const avgMF = mfSeries.reduce((a, b) => a + b, 0) / mfSeries.length;
  const lastMF = mfSeries[mfSeries.length - 1];
  const lastDbsiTop = dbsiTopSeries[dbsiTopSeries.length - 1];
  const lastDbsiBottom = dbsiBottomSeries[dbsiBottomSeries.length - 1];

  let force = 'normal';
  if (lastMF > avgMF * 1.5) force = 'fort';
  if (lastMF < avgMF * 0.5) force = 'faible';

  return {
    group: 'engagement',
    timeframe,
    lastMF: lastMF.toFixed(2),
    dbsiTop: lastDbsiTop.toFixed(2),
    dbsiBottom: lastDbsiBottom.toFixed(2),
    force,
    // TBD — scoring weight per group not yet defined (pending calibration decision)
    score: null,
  };
}

// --- Group 3: Trigger (Ticker) — MEXC source ---
// DECIDED: reads from the existing price-stream.js EventEmitter connection
// (wss://contract.mexc.com/edge) rather than opening a second MEXC websocket.
// price-stream.js already provides tick-by-tick price data — duplicating the
// connection here would waste a resource and risk MEXC rate limits.
//
// IMPORTANT — this only produces meaningful results if the process stays alive
// long enough for tickBuffer to fill. This is the same constraint already flagged
// for Day 46 (PM2/persistence): cerveau-central.js currently runs as a one-shot
// script that exits immediately, which means the tick buffer never has time to
// accumulate. This function will return 'insufficient_data' every time until
// cerveau-central.js (and by extension this module) run as a persistent process.
function analyzeTrigger() {
  if (tickBuffer.length < 3) {
    return { group: 'trigger', status: 'insufficient_data', count: tickBuffer.length };
  }

  const prices = tickBuffer.map(t => t.price);
  const lastPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const variation = ((lastPrice - firstPrice) / firstPrice) * 100;

  // Buy/sell pressure from tick side (1 = achat, 2 = vente) — raw count, not yet scored
  const buys = tickBuffer.filter(t => t.side === 1).length;
  const sells = tickBuffer.filter(t => t.side === 2).length;

  let force = 'normal';
  if (Math.abs(variation) > 0.5) force = 'fort'; // TBD — threshold not yet calibrated
  if (Math.abs(variation) < 0.1) force = 'faible'; // TBD — threshold not yet calibrated

  return {
    group: 'trigger',
    lastPrice,
    variationPct: variation.toFixed(3),
    buyTickCount: buys,
    sellTickCount: sells,
    force,
    // TBD — scoring weight per group not yet defined (pending calibration decision)
    score: null,
  };
}

// Aggregates the 3 groups into a single volume assessment for a given timeframe.
// Final scoring weights are TBD — this returns the 3 raw group results without
// summing them into a single number, to avoid silently inventing a weighting scheme.
//
// PROPOSED (not validated — discussed 2026-07, pending paper trading calibration):
//   - Each of the 5 raw indicators (Ticker, Blue Wave, Lt Blue Wave, DBSI, Money Flow)
//     graded 1-5, combined score max 25.
//   - Volume score intended to carry weight roughly equal to divergence + scenario
//     scores combined (proposed range 20-25), such that a high volume score could
//     partially compensate for a weaker scenario score.
//   - This scheme is NOT implemented below. Do not treat it as decided — it is a
//     candidate to test once real data accumulates.
function analyzeVolume(timeframe) {
  const momentum = analyzeMomentum(timeframe);
  const engagement = analyzeEngagement(timeframe);
  const trigger = analyzeTrigger();

  return {
    timeframe,
    momentum,
    engagement,
    trigger,
    // TBD — no aggregate score computed yet; cerveau-central.js should not
    // assume a combined score exists until the weighting scheme is decided.
    aggregateScore: null,
  };
}

function runVolumeAnalyzer() {
  console.log('\n=== Module Volume — 3 groupes (Momentum / Engagement / Trigger) ===\n');
  for (const tf of ['3m', '15m', '1h', '4h', '1d', '1w']) {
    const result = analyzeVolume(tf);
    console.log(`[${tf}]`);
    if (result.momentum.status === 'insufficient_data') {
      console.log(`  Momentum: données insuffisantes (${result.momentum.count} entrées)`);
    } else {
      console.log(`  Momentum: force=${result.momentum.force} | BW=${result.momentum.lastBW} LBW=${result.momentum.lastLBW} | score=TBD`);
    }
    if (result.engagement.status === 'insufficient_data') {
      console.log(`  Engagement: données insuffisantes (${result.engagement.count} entrées)`);
    } else {
      console.log(`  Engagement: force=${result.engagement.force} | MF=${result.engagement.lastMF} DBSI top/bottom=${result.engagement.dbsiTop}/${result.engagement.dbsiBottom} | score=TBD`);
    }
    if (result.trigger.status === 'insufficient_data') {
      console.log(`  Trigger: en attente de données tick (price-stream.js) — ${result.trigger.count} ticks reçus`);
    } else {
      console.log(`  Trigger: force=${result.trigger.force} | prix=${result.trigger.lastPrice} | variation=${result.trigger.variationPct}% | score=TBD`);
    }
    console.log('');
  }
}

module.exports = { analyzeVolume, analyzeMomentum, analyzeEngagement, analyzeTrigger };

if (require.main === module) {
  // NOTE: requiring this file now opens a live price-stream.js websocket connection
  // (for the Trigger group). Running this standalone will keep the process alive
  // rather than exit immediately like the old version did. This demo run waits
  // 10s to let a few ticks arrive, prints one pass, then stops the stream and exits —
  // useful for manual testing, not representative of production behavior (which
  // needs the process to stay alive continuously — see Day 46 note above).
  setTimeout(() => {
    runVolumeAnalyzer();
    priceStream.stop();
    process.exit(0);
  }, 10000);
}