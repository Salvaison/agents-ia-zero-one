// Module MA/Tendance
// Calcule EMA 9/21/50/200 sur chaque timeframe
// Retourne orientation bull/bear/neutre

const https = require('https');

const TIMEFRAMES = {
  scalp:  '1h',
  day:    '4h', 
  swing:  '1d',
  weekly: '1w',
  macro:  '1M'
};

function calcEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

async function getKlines(symbol, interval, limit = 200) {
  return new Promise((resolve, reject) => {
    const url = `https://api.mexc.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function analyzeTimeframe(symbol, interval, label) {
  const klines = await getKlines(symbol, interval);
  const closes = klines.map(k => parseFloat(k[4]));
  
  const ema9   = calcEMA(closes, 9);
  const ema21  = calcEMA(closes, 21);
  const ema50  = calcEMA(closes, 50);
  const ema200 = calcEMA(closes, 200);
  const price  = closes[closes.length - 1];

  // Orientation
  let trend = 'neutre';
  if (ema9 > ema21 && ema21 > ema50 && price > ema200) trend = 'bull';
  if (ema9 < ema21 && ema21 < ema50 && price < ema200) trend = 'bear';

  return {
    label,
    interval,
    price,
    ema9: ema9.toFixed(2),
    ema21: ema21.toFixed(2),
    ema50: ema50.toFixed(2),
    ema200: ema200.toFixed(2),
    trend
  };
}

async function runMATendance(symbol = 'BTCUSDT') {
  console.log(`\n=== Module MA/Tendance — ${symbol} ===\n`);
  
  for (const [label, interval] of Object.entries(TIMEFRAMES)) {
    try {
      const result = await analyzeTimeframe(symbol, interval, label);
      console.log(`[${label.toUpperCase()}] ${result.trend.toUpperCase()}`);
      console.log(`  Prix: ${result.price}`);
      console.log(`  EMA9: ${result.ema9} | EMA21: ${result.ema21} | EMA50: ${result.ema50} | EMA200: ${result.ema200}\n`);
    } catch (e) {
      console.log(`[${label}] Erreur: ${e.message}`);
    }
  }
}

runMATendance();