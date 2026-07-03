const fs = require('fs');
const path = require('path');

const MCB_LIVE_PATH = path.join(__dirname, '../../data/mcb-live');

// Lit un CSV et retourne un tableau d'objets
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

// Détecte les pivots hauts et bas sur une série
function detectPivots(data, key, lookback = 2) {
  const pivots = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    const val = data[i][key];
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i-j][key] >= val) isHigh = false;
      if (data[i+j][key] >= val) isHigh = false;
      if (data[i-j][key] <= val) isLow = false;
      if (data[i+j][key] <= val) isLow = false;
    }
    if (isHigh) pivots.push({ index: i, type: 'high', value: val, ts: data[i].timestamp });
    if (isLow)  pivots.push({ index: i, type: 'low',  value: val, ts: data[i].timestamp });
  }
  return pivots;
}

// Détecte les divergences entre prix et oscillateur
function detectDivergences(data) {
  if (data.length < 6) return { regular: [], hidden: [] };

  const pricePivots = detectPivots(data, 'close');
  const mcbPivots   = detectPivots(data, 'blue_wave');

  const regular = [];
  const hidden  = [];

  // Compare les 2 derniers pivots hauts
  const priceHighs = pricePivots.filter(p => p.type === 'high').slice(-2);
  const mcbHighs   = mcbPivots.filter(p => p.type === 'high').slice(-2);
  const priceLows  = pricePivots.filter(p => p.type === 'low').slice(-2);
  const mcbLows    = mcbPivots.filter(p => p.type === 'low').slice(-2);

  // Divergence régulière baissière : prix HH + MCB LH
  if (priceHighs.length === 2 && mcbHighs.length === 2) {
    if (priceHighs[1].value > priceHighs[0].value &&
        mcbHighs[1].value   < mcbHighs[0].value) {
      regular.push({ type: 'bearish', signal: 'regular', strength: 2 });
    }
  }

  // Divergence régulière haussière : prix LL + MCB HL
  if (priceLows.length === 2 && mcbLows.length === 2) {
    if (priceLows[1].value  < priceLows[0].value &&
        mcbLows[1].value    > mcbLows[0].value) {
      regular.push({ type: 'bullish', signal: 'regular', strength: 2 });
    }
  }

  // Divergence cachée haussière : prix HL + MCB LL (continuation)
  if (priceLows.length === 2 && mcbLows.length === 2) {
    if (priceLows[1].value  > priceLows[0].value &&
        mcbLows[1].value    < mcbLows[0].value) {
      hidden.push({ type: 'bullish', signal: 'hidden', strength: 1 });
    }
  }

  // Divergence cachée baissière : prix LH + MCB HH (continuation)
  if (priceHighs.length === 2 && mcbHighs.length === 2) {
    if (priceHighs[1].value < priceHighs[0].value &&
        mcbHighs[1].value   > mcbHighs[0].value) {
      hidden.push({ type: 'bearish', signal: 'hidden', strength: 1 });
    }
  }

  return { regular, hidden };
}

// Analyse un timeframe
function analyzeTimeframe(tf) {
  const filepath = path.join(MCB_LIVE_PATH, `mcb_${tf}.csv`);
  const data = readCSV(filepath);

  if (data.length < 6) {
    return { tf, status: 'insufficient_data', count: data.length };
  }

  const divergences = detectDivergences(data);
  const last = data[data.length - 1];

  // Score MCB
  let score = 0;
  if (divergences.regular.length > 0) score += 3;
  if (divergences.hidden.length > 0)  score += 2;
  if (last.buy !== 0)  score += 2;
  if (last.sell !== 0) score += 1;

  return {
    tf,
    status: 'ok',
    count: data.length,
    last_close: last.close,
    blue_wave: last.blue_wave,
    money_flow: last.money_flow,
    divergences,
    score
  };
}

// Analyse tous les timeframes
function runMCBAnalyzer() {
  console.log('\n=== Module MCB Analyzer ===\n');
  const timeframes = ['3m', '15m', '1h', '4h', '1d', '1w'];

  for (const tf of timeframes) {
    const result = analyzeTimeframe(tf);
    if (result.status === 'insufficient_data') {
      console.log(`[${tf}] Données insuffisantes (${result.count} bougies)`);
    } else {
      const div = result.divergences;
      console.log(`[${tf}] Close: ${result.last_close} | BW: ${result.blue_wave?.toFixed(2)} | MF: ${result.money_flow?.toFixed(2)}`);
      console.log(`  Divergences régulières: ${div.regular.length > 0 ? div.regular.map(d => d.type).join(', ') : 'aucune'}`);
      console.log(`  Divergences cachées:    ${div.hidden.length > 0 ? div.hidden.map(d => d.type).join(', ') : 'aucune'}`);
      console.log(`  Score MCB: ${result.score}/8\n`);
    }
  }
}

module.exports = { analyzeTimeframe, detectDivergences };
runMCBAnalyzer();