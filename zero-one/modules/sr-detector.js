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
      high: parseFloat(parts[2]),
      low: parseFloat(parts[3]),
      close: parseFloat(parts[4]),
      ma200: parseFloat(parts[12]),
    };
  }).filter(r => !isNaN(r.close) && !isNaN(r.ma200) && !isNaN(r.high) && !isNaN(r.low));
  return rows.slice(-limit);
}

function pctGap(price, ma) {
  return ((price - ma) / ma) * 100;
}

/**
 * Retourne le prix (high, low, ou le niveau lui-meme si la meche l'a
 * physiquement traverse) le plus proche du niveau donne -- mode "meche"
 * plutot que cloture seule (corrige le 28/07/2026, suite a un episode ou
 * le chatbot consultatif a confondu un low intra-bougie avec le prix de
 * cloture).
 */
function closestApproach(candle, level) {
  if (level >= candle.low && level <= candle.high) return level;
  return Math.abs(candle.high - level) < Math.abs(candle.low - level) ? candle.high : candle.low;
}

/**
 * Cherche le motif touche -> eloignement -> retest dans une serie de
 * bougies (high/low/ma200 par bougie -- mode meche depuis le 28/07/2026,
 * auparavant close seule). Retourne le meilleur statut trouve.
 */
function detectTouchRetest(candles, toleranceP, minDeviationP) {
  const gaps = candles.map(c => pctGap(closestApproach(c, c.ma200), c.ma200));

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
 * Lit les closes seuls (sans exiger ma200), pour comparer a des niveaux fixes.
 */
function readClosesOnly(timeframe, limit = 50) {
  const filePath = CSV_FILES[timeframe];
  if (!filePath || !fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const rows = lines.slice(1).map(line => {
    const parts = line.split(',');
    return { timestamp: parts[0], high: parseFloat(parts[2]), low: parseFloat(parts[3]), close: parseFloat(parts[4]) };
  }).filter(r => !isNaN(r.close) && !isNaN(r.high) && !isNaN(r.low));
  return rows.slice(-limit);
}

/**
 * Score S/R base sur les niveaux fixes soumis via l'interface (data/levels.json:
 * DS/DR/WS/WR/MS/MR, fib0/fib1, VAH/POC/VAL). Reutilise detectTouchRetest en
 * substituant le prix fixe du niveau a la place de la ma200 mobile -- meme
 * machine a etats, source differente. Ajoute le 25/07/2026.
 */
function scoreFixedLevels(mainTimeframe) {
  const levelsPath = path.join(__dirname, '../data/levels.json');
  if (!fs.existsSync(levelsPath)) return { status: 'hors_zone', matchedLevel: null };
  let levels;
  try { levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8')); } catch (e) { return { status: 'hors_zone', matchedLevel: null }; }
  if (!Array.isArray(levels) || levels.length === 0) return { status: 'hors_zone', matchedLevel: null };

  const config = loadConfig();
  const tolerance = config.srZone.tolerancePercent;
  const minDeviation = config.srZone.ma200MinDeviationPercent;
  const closes = readClosesOnly(mainTimeframe, 50);
  if (closes.length < 3) return { status: 'insufficient_data' };

  const rank = { hors_zone: 0, touche_simple: 1, retest_confirme: 2 };
  let best = { status: 'hors_zone', matchedLevel: null };
  for (const lvl of levels) {
    const candles = closes.map(c => ({ timestamp: c.timestamp, high: c.high, low: c.low, close: c.close, ma200: lvl.price }));
    const result = detectTouchRetest(candles, tolerance, minDeviation);
    if ((rank[result.status] || 0) > (rank[best.status] || 0)) {
      best = { ...result, matchedLevel: lvl.label, matchedPrice: lvl.price };
    }
  }
  return best;
}

/**
 * Evaluateur minimal de scenario -- gere uniquement les conditions ET
 * (separateur ':' cote interface) avec un operateur explicite (>=,<=,>,<,=).
 * Tokens supportes : Momentum, MoneyFlow, DBSI, VWAP, Trigger, Cadence.
 * DIV, S/R, MA200, Volume, SCORE ne sont PAS supportes ici (risque de
 * circularite avec le calcul de rangeSR lui-meme, ou pas encore de source
 * claire) -- un scenario les utilisant sera considere invalide (jamais actif).
 * Pas de OU, pas d'actions : seulement de quoi determiner si un scenario est
 * actif, pour la confluence. Grammaire complete SI/SINON/OU/actions laissee
 * a un chantier dedie ulterieur.
 */
function parseCondition(cond) {
  const m = String(cond).trim().match(/^([A-Za-z]+)\s*(>=|<=|>|<|=)\s*(-?\d+(\.\d+)?)$/);
  if (!m) return null;
  return { token: m[1], op: m[2], value: parseFloat(m[3]) };
}

function getConditionValue(token, vol) {
  switch (token) {
    case 'Momentum': return vol.momentum && vol.momentum.score;
    case 'MoneyFlow': return vol.moneyFlow && vol.moneyFlow.score;
    case 'DBSI': return vol.dbsi && vol.dbsi.score;
    case 'VWAP': return vol.vwap && vol.vwap.score;
    case 'Trigger': return vol.trigger && vol.trigger.score;
    case 'Cadence': return vol.trigger && vol.trigger.cadenceScore;
    default: return null;
  }
}

function compareOp(actual, op, target) {
  if (actual === null || actual === undefined || isNaN(actual)) return false;
  switch (op) {
    case '>=': return actual >= target;
    case '<=': return actual <= target;
    case '>': return actual > target;
    case '<': return actual < target;
    case '=': return actual === target;
    default: return false;
  }
}

function evaluateScenario(scenario, volByTf, config) {
  const tf = config.timeframes[scenario.module];
  if (!tf) return false;
  const mainTf = Array.isArray(tf.signal) ? tf.signal[0] : tf.signal;
  const vol = volByTf[mainTf];
  if (!vol) return false;
  if (!Array.isArray(scenario.conditions) || scenario.conditions.length === 0) return false;
  for (const condStr of scenario.conditions) {
    const parsed = parseCondition(condStr);
    if (!parsed) return false;
    const actual = getConditionValue(parsed.token, vol);
    if (!compareOp(actual, parsed.op, parsed.value)) return false;
  }
  return true;
}

function loadScenarios() {
  const scenariosPath = path.join(__dirname, '../data/scenarios.json');
  if (!fs.existsSync(scenariosPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (e) { return []; }
}

/**
 * Calcule le score S/R pour un module (scalp/day/swing). Combine deux
 * sources independantes -- MA200 (mobile) et niveaux fixes soumis (data/
 * levels.json) -- et verifie la confluence avec un scenario actif pour
 * atteindre le palier superieur (25 pts). Ajoute le 25/07/2026 : avant
 * cette date, seule la MA200 etait une source active.
 */
function scoreRangeSR(module, mainTimeframe, volByTf) {
  const config = loadConfig();
  const points = config.scoring.rangeSR.points;

  const ma200Candles = readCloses(mainTimeframe, 50);
  const ma200Result = ma200Candles.length >= 3
    ? detectTouchRetest(ma200Candles, config.srZone.ma200TolerancePercent, config.srZone.ma200MinDeviationPercent)
    : { status: 'insufficient_data' };

  const fixedResult = scoreFixedLevels(mainTimeframe);

  if (ma200Result.status === 'insufficient_data' && fixedResult.status === 'insufficient_data') {
    return { status: 'insufficient_data', score: null, timeframe: mainTimeframe };
  }

  // Confluence : un niveau fixe touche/retestE, ET un scenario du meme module
  // referencant ce meme niveau (par label), dont toutes les conditions sont
  // actives en ce moment.
  if (volByTf && (fixedResult.status === 'touche_simple' || fixedResult.status === 'retest_confirme')) {
    const scenarios = loadScenarios();
    const matchingScenarios = scenarios.filter(s => s.module === module && s.levelLabel === fixedResult.matchedLevel);
    for (const s of matchingScenarios) {
      if (evaluateScenario(s, volByTf, config)) {
        return { status: 'confluence_scenario', score: points.confluenceScenario, timeframe: mainTimeframe, matchedLevel: fixedResult.matchedLevel, scenario: s };
      }
    }
  }

  // Sinon : meilleur des deux resultats (MA200 vs niveaux fixes).
  const rank = { insufficient_data: -1, hors_zone: 0, touche_simple: 1, retest_confirme: 2 };
  const best = (rank[fixedResult.status] || 0) >= (rank[ma200Result.status] || 0)
    ? { ...fixedResult, source: 'niveaux' }
    : { ...ma200Result, source: 'ma200' };

  let score;
  if (best.status === 'retest_confirme') score = points.retestConfirme;
  else if (best.status === 'touche_simple') score = points.toucheSimple;
  else score = points.non;

  return { ...best, score, timeframe: mainTimeframe };
}

module.exports = { scoreRangeSR, detectTouchRetest, readCloses, readClosesOnly, scoreFixedLevels, evaluateScenario, parseCondition, pctGap };
