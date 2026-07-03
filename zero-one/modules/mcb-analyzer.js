const fs = require('fs');
const path = require('path');
const MCB_LIVE_PATH = path.join(__dirname, '../../data/mcb-live');

function readCSV(filepath) {
  if (!fs.existsSync(filepath)) return [];
  const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = isNaN(vals[i]) ? vals[i] : parseFloat(vals[i]);
    });
    return obj;
  }).filter(r => !isNaN(r.close) && !isNaN(r.blue_wave));
}

function detectPivots(data, key, lookback = 2) {
  const pivots = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    const val = data[i][key];
    let isHigh = true, isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i-j][key] >= val || data[i+j][key] >= val) isHigh = false;
      if (data[i-j][key] <= val || data[i+j][key] <= val) isLow = false;
    }
    if (isHigh) pivots.push({ index: i, type: 'high', value: val, ts: data[i].timestamp });
    if (isLow)  pivots.push({ index: i, type: 'low',  value: val, ts: data[i].timestamp });
  }
  return pivots;
}function detectDivergences(data) {
  if (data.length < 6) return { regular: [], hidden: [] };
  const pricePivots = detectPivots(data, 'close');
  const mcbPivots   = detectPivots(data, 'blue_wave');
  const regular = [], hidden = [];
  const priceHighs = pricePivots.filter(p => p.type === 'high').slice(-2);
  const mcbHighs   = mcbPivots.filter(p => p.type === 'high').slice(-2);
  const priceLows  = pricePivots.filter(p => p.type === 'low').slice(-2);
  const mcbLows    = mcbPivots.filter(p => p.type === 'low').slice(-2);
  if (priceHighs.length === 2 && mcbHighs.length === 2) {
    if (priceHighs[1].value > priceHighs[0].value && mcbHighs[1].value < mcbHighs[0].value)
      regular.push({ type: 'bearish', signal: 'regular', strength: 2 });
    if (priceHighs[1].value < priceHighs[0].value && mcbHighs[1].value > mcbHighs[0].value)
      hidden.push({ type: 'bearish', signal: 'hidden', strength: 1 });
  }
  if (priceLows.length === 2 && mcbLows.length === 2) {
    if (priceLows[1].value < priceLows[0].value && mcbLows[1].value > mcbLows[0].value)
      regular.push({ type: 'bullish', signal: 'regular', strength: 2 });
    if (priceLows[1].value > priceLows[0].value && mcbLows[1].value < mcbLows[0].value)
      hidden.push({ type: 'bullish', signal: 'hidden', strength: 1 });
  }
  return { regular, hidden };
}

function analyzeTimeframe(tf) {
  const data = readCSV(path.join(MCB_LIVE_PATH, `mcb_${tf}.csv`));
  if (data.length < 6) return { tf, status: 'insufficient_data', count: data.length };
  const divergences = detectDivergences(data);
  const last = data[data.length - 1];
  let score = 0;
  if (divergences.regular.length > 0) score += 3;
  if (divergences.hidden.length > 0)  score += 2;
  if (last.buy !== 0)  score += 2;
  if (last.sell !== 0) score += 1;
  return { tf, status: 'ok', count: data.length, last_close: last.close,
           blue_wave: last.blue_wave, money_flow: last.money_flow, divergences, score };
}

function runMCBAnalyzer() {
  console.log('\n=== Module MCB Analyzer ===\n');
  for (const tf of ['3m', '15m', '1h', '4h', '1d', '1w']) {
    const r = analyzeTimeframe(tf);
    if (r.status === 'insufficient_data') {
      console.log(`[${tf}] Donnees insuffisantes (${r.count} bougies)`);
    } else {
      console.log(`[${tf}] Close: ${r.last_close} | BW: ${r.blue_wave?.toFixed(2)} | MF: ${r.money_flow?.toFixed(2)}`);
      console.log(`  Regulieres: ${r.divergences.regular.map(d=>d.type).join(', ')||'aucune'}`);
      console.log(`  Cachees:    ${r.divergences.hidden.map(d=>d.type).join(', ')||'aucune'}`);
      console.log(`  Score MCB: ${r.score}/8\n`);
    }
  }
}

module.exports = { analyzeTimeframe, detectDivergences };
runMCBAnalyzer();