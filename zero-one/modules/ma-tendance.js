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