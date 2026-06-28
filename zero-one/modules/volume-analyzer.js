const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../../data/mcb-history.csv');

function readCSV() {
  if (!fs.existsSync(CSV_PATH)) return [];
  const lines = fs.readFileSync(CSV_PATH, 'utf8').trim().split('\n');
  return lines.slice(1).map(line => {
    const [timestamp, timeframe, prix, volume] = line.split(',');
    return { timestamp, timeframe, prix: parseFloat(prix), volume: parseFloat(volume) };
  }).filter(r => !isNaN(r.volume));
}

function analyzeVolume(timeframe, lookback = 20) {
  const data = readCSV().filter(r => r.timeframe === timeframe);
  if (data.length < 3) return { status: 'insufficient_data', count: data.length };

  const recent = data.slice(-lookback);
  const volumes = recent.map(r => r.volume);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const lastVolume = volumes[volumes.length - 1];
  const prevVolume = volumes[volumes.length - 2];

  // Vélocité
  const velocite = lastVolume - prevVolume;

  // Tendance sur 5 dernières bougies
  const last5 = volumes.slice(-5);
  const trend = last5[last5.length - 1] > last5[0] ? 'croissant' : 'décroissant';

  // Classification
  let force = 'normal';
  if (lastVolume > avgVolume * 1.5) force = 'fort';
  if (lastVolume < avgVolume * 0.5) force = 'faible';

  return {
    timeframe,
    lastVolume: lastVolume.toFixed(2),
    avgVolume: avgVolume.toFixed(2),
    velocite: velocite.toFixed(2),
    trend,
    force,
    score: force === 'fort' ? 2 : force === 'normal' ? 1 : 0
  };
}

function runVolumeAnalyzer() {
  console.log('\n=== Module Volume ===\n');
  for (const tf of ['60m', '4h', '1d']) {
    const result = analyzeVolume(tf);
    if (result.status === 'insufficient_data') {
      console.log(`[${tf}] Données insuffisantes (${result.count} entrées)`);
    } else {
      console.log(`[${tf}] Force: ${result.force.toUpperCase()} | Trend: ${result.trend} | Vélocité: ${result.velocite}`);
      console.log(`  Volume actuel: ${result.lastVolume} | Moyenne: ${result.avgVolume} | Score: ${result.score}/2\n`);
    }
  }
}

module.exports = { analyzeVolume };
runVolumeAnalyzer();