/**
 * sr-detector.js -- Score S/R base sur la MA200 du DBSI (touche/retest).
 *
 * ECRIT LE 20/07/2026. La MA200 est une source de niveau S/R, pas un score
 * separe -- voir strategy-boono.md section "MA200 (DBSI) comme source S/R".
 *
 * Barème (config.json : scoring.rangeSR.points) :
 *   0  = hors zone
 *   10 = touche simple (prix dans la tolerance de la MA200, rien confirme)
 *   15 = retest confirme (touche -> eloignement -> retour dans la zone)
 *   25 = confluence scenario (necessite l'interface S/R, non construite --
 *        jamais atteint aujourd'hui, seule la MA200 est une source active)
 *
 * Regle heuristique (documentee dans strategy-boono.md), pas une loi
 * universelle : si le retest ne se produit pas, "wait for further
 * confirmation" -- le score reste a 10 (jamais null) en attendant.
 *
 * Fenetre de recherche : 50 dernieres bougies du TF PRINCIPAL du module
 * (pas tous les TF de signal -- pour le scalp c'est donc le 3m, la plus
 * fine des trois, celle qui a le plus de donnees).
 */

const fs = require('fs');
const path = require('path');

function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));
}

const CSV_FILES = {
  '3m':  path.join(__dirname, '../../data/mcb-live/mcb_3m.csv'),
  '15m': path.join(__dirname, '../../data/mcb-live/mcb_15m.csv'),
  '1h':  path.join(__dirname, '../../data/mcb-live/mcb_1h.csv'),
  '4h':  path.join(__dirname, '../../data/mcb-live/mcb_4h.csv'),
  '1d':  path.join(__dirname, '../../data/mcb-live/mcb_1d.csv'),
  '1w':  path.join(__dirname, '../../data/mcb-live/mcb_1w.csv'),
};

function readCloses(timeframe, limit = 50) {
  const filePath = CSV_FILES[timeframe];
  if (!filePath || !fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const rows = lines.slice(1).map(line => {
    const parts = line.split(',');
    return {
      timestamp: parts[0],
      close: parseFloat(parts[4]),
      ma200: parseFloat(parts[12]),
    };
  }).filter(r => !isNaN(r.close) && !isNaN(r.ma200));
  return rows.slice(-limit);
}

function pctGap(price, ma) {
  return ((price - ma) / ma) * 100;
}

/**
 * Cherche le motif touche -> eloignement -> retest dans une serie de
 * bougies (close + ma200 par bougie). Retourne le meilleur statut trouve.
 */
function detectTouchRetest(candles, toleranceP, minDeviationP) {
  const gaps = candles.map(c => pctGap(c.close, c.ma200));

  let lastTouchIdx = -1;
  for (let i = gaps.length - 1; i >= 0; i--) {
    if (Math.abs(gaps[i]) <= toleranceP) {
      lastTouchIdx = i;
      break;
    }
  }

  if (lastTouchIdx === -1) {
    return { status: 'hors_zone' };
  }

  const isLastCandle = lastTouchIdx === gaps.length - 1;
  if (isLastCandle) {
    for (let i = lastTouchIdx - 1; i >= 0; i--) {
      if (Math.abs(gaps[i]) > minDeviationP) {
        const wentAbove = gaps[i] > 0;
        for (let j = i - 1; j >= 0; j--) {
          if (Math.abs(gaps[j]) <= toleranceP) {
            return {
              status: 'retest_confirme',
              touchTs: candles[j].timestamp,
              deviationTs: candles[i].timestamp,
              retestTs: candles[lastTouchIdx].timestamp,
            };
          }
        }
        break;
      }
    }
    return { status: 'touche_simple', touchTs: candles[lastTouchIdx].timestamp };
  }

  return { status: 'hors_zone', lastTouchTs: candles[lastTouchIdx].timestamp };
}
/**
 * Calcule le score S/R pour un module (scalp/day/swing), base uniquement
 * sur la MA200 pour l'instant (les niveaux DS/DR/WS/WR dependent de
 * l'interface S/R, non construite).
 */
function scoreRangeSR(module, mainTimeframe) {
  const config = loadConfig();
  const tolerance = config.srZone.ma200TolerancePercent;
  const minDeviation = config.srZone.ma200MinDeviationPercent;
  const points = config.scoring.rangeSR.points;

  const candles = readCloses(mainTimeframe, 50);
  if (candles.length < 3) {
    return { status: 'insufficient_data', count: candles.length, score: null };
  }

  const result = detectTouchRetest(candles, tolerance, minDeviation);

  let score;
  if (result.status === 'retest_confirme') score = points.retestConfirme;
  else if (result.status === 'touche_simple') score = points.toucheSimple;
  else score = points.non;

  return { ...result, score, timeframe: mainTimeframe, source: 'ma200' };
}

module.exports = { scoreRangeSR, detectTouchRetest, readCloses, pctGap };
