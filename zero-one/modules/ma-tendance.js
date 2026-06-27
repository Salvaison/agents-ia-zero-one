const https = require('https');

const TIMEFRAMES = {
  scalp:  '60m',
  day:    '4h',
  swing:  '1d',
  weekly: '1W',
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
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function analyzeTimeframe(symbol, interval, label) {
  const raw = await getKlines(symbol, interval);
  const klines = Array.isArray(raw) ? raw : (raw.data || []);
  
  if (!klines.length) throw new Error('Pas de données');
  
  const closes = klines.map(k => parseFloat(k[4]));

  const ema9   = calcEMA(closes, 9);
  const ema21  = calcEMA(closes, 21);
  const ema50  = calcEMA(closes, 50);
  const ema200 = calcEMA(closes, 200);
  const price  = closes[closes.length - 1];

  let trend = 'neutre';
  if (ema9 > ema21 && ema21 > ema50 && price > ema200) trend = 'bull';
  if (ema9 < ema21 && ema21 < ema50 && price < ema200) trend = 'bear';

  return { label, interval, price, ema9, ema21, ema50, ema200, trend };
}

async function runMATendance(symbol = 'BTCUSDT') {
  console.log(`\n=== Module MA/Tendance — ${symbol} ===\n`);
  for (const [label, interval] of Object.entries(TIMEFRAMES)) {
    try {
      const r = await analyzeTimeframe(symbol, interval, label);
      console.log(`[${label.toUpperCase()}] ${r.trend.toUpperCase()}`);
      console.log(`  Prix: ${r.price}`);
      console.log(`  EMA9: ${r.ema9.toFixed(2)} | EMA21: ${r.ema21.toFixed(2)} | EMA50: ${r.ema50.toFixed(2)} | EMA200: ${r.ema200.toFixed(2)}\n`);
    } catch (e) {
      console.log(`[${label.toUpperCase()}] Erreur: ${e.message}\n`);
    }
  }
}

runMATendance();