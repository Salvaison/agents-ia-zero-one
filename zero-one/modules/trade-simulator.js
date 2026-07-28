/**
 * trade-simulator.js — Simulation de gestion de trade (entree + sortie),
 * en OBSERVATION SEULE : aucun ordre reel n'est jamais passe, aucun capital
 * n'est engage. Cree le 27/07/2026, suite a la formalisation de la loi
 * d'entree et de la machine a etats TP1/TP2/liquidation basee sur le VWAP
 * (LBW - BW), en remplacement du plan Fibonacci-sur-pivot du SOP v1 (jamais
 * implemente -- voir SOP-bot-trading-boono.md, section Trigger C).
 *
 * MIS A JOUR LE 28/07/2026 (1) : ajoute les champs qu'un vrai ordre MEXC
 * porterait (levier, taille de position, type d'ordre, openType) et un
 * mecanisme de stop loss (pose a TP1, verifie en mode meche a chaque tick).
 *
 * MIS A JOUR LE 28/07/2026 (2) : seuils LBW d'entree ASYMETRIQUES selon la
 * tendance (close vs MA200), configurables dans config.json
 * (tradeSimulator.lbwThresholds). Observation de Benjamin le 27/07 au soir :
 * avant la chute, la vague MCB 15m etait collee en haut (haussiere) avec BW
 * a peine sous zero -- l'ancien seuil symetrique +/-60 sur LBW aurait
 * empeche TOUT trade dans ce contexte pourtant clairement directionnel.
 * Nouvelle regle :
 *   - Tendance haussiere (close > MA200) :
 *       SHORT (contre-tendance, extreme)  : LBW >= lbwThresholds.haussiere.shortExtreme (60 par defaut)
 *       LONG  (avec la tendance, assoupli) : LBW >= lbwThresholds.haussiere.longSouple (-20 par defaut)
 *   - Tendance baissiere (close < MA200) :
 *       LONG  (contre-tendance, extreme)  : LBW <= lbwThresholds.baissiere.longExtreme (-60 par defaut)
 *       SHORT (avec la tendance, assoupli) : LBW <= lbwThresholds.baissiere.shortSouple (20 par defaut)
 *   - Tendance indeterminee (close manquant/egal a MA200) : repli sur
 *     l'ancien seuil symetrique +/-60 (THRESHOLDS.entryLbw), par prudence.
 *
 * Un seul trade simule ouvert a la fois par module (scalp/day/swing),
 * coherent avec l'architecture a 3 modules paralleles du SOP.
 *
 * SORTIE (evaluee uniquement si un trade simule est ouvert pour ce module) :
 *   0. A CHAQUE TICK : si un stop loss est pose (donc apres TP1) et que la
 *      meche de la derniere bougie l'a touche, LIQUIDER immediatement --
 *      independamment d'un passage a zero du VWAP.
 *   1. Sinon, uniquement au moment d'un passage a zero du VWAP :
 *      SI 1er passage depuis l'entree ALORS TP1 (garde le trade ouvert,
 *        pose le stop loss a l'equilibre +/- 0.20)
 *      SINON SI 2e passage : ecart >= 20 : BW entre -20 et 20 ALORS TP2 (ferme)
 *      SINON SI 2e passage : ecart < 20 ALORS ATTENDRE (garde le trade ouvert)
 *      SINON SI DIV >= 1 TF ALORS LIQUIDER, motif "divergence confirmee"
 *      SINON LIQUIDER, motif "valeur BW hors zone -20/20"
 *
 * HYPOTHESE D'IMPLEMENTATION A VALIDER AVEC BENJAMIN : chaque passage a zero
 * detecte fait avancer le compteur crossingsSinceEntry, y compris le cas
 * ATTENDRE (2e passage, ecart<20) -- donc un 3e passage eventuel tombe dans
 * la branche de liquidation par defaut (DIV/BW), faute de regle definie
 * au-dela du 2e passage dans la conversation du 27/07/2026.
 *
 * Persistance : data/trade-sim-state.json, un objet par module ou null si
 * aucun trade simule n'est ouvert pour ce module.
 */
const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, '../data/trade-sim-state.json');

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return { scalp: null, day: null, swing: null };
  try {
    const data = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    return { scalp: data.scalp || null, day: data.day || null, swing: data.swing || null };
  } catch (e) {
    return { scalp: null, day: null, swing: null };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// Seuils de la loi d'entree/sortie -- en dur pour l'instant (27-28/07/2026),
// a exposer dans config.json si Benjamin veut les calibrer plus tard.
// entryLbw sert desormais de REPLI uniquement, quand la tendance (close vs
// MA200) est indeterminee -- voir lbwThresholds dans config.json pour le
// cas normal (28/07/2026).
const THRESHOLDS = {
  entryLbw: 60,
  entryEcart: 10,
  entryDbsi: -4,
  tp2Ecart: 20,
  tp2BwMin: -20,
  tp2BwMax: 20,
};

// Parametres d'ordre simules -- reflete les champs qu'un vrai ordre MEXC
// porterait (levier, type d'ordre, openType), PROVISOIRES (28/07/2026).
const ORDER_DEFAULTS = {
  leverage: 50, // fixe entre 1x et 100x -- a calibrer, aucune donnee pour l'instant
  orderType: 'market', // seul mode actif ; l'idee d'un limit order pour les scenarios n'est pas tranchee
  openType: 'isolated', // choix par defaut arbitraire, a confirmer
  stopLossBufferAbs: 0.20, // marge au-dela du prix d'entree pour le stop pose a TP1
};

/**
 * Determine la tendance (close vs MA200) a partir des donnees deja lues
 * par analyzeMomentum(). Retourne 'haussiere', 'baissiere', ou null si
 * indeterminable (donnees manquantes ou egalite exacte).
 */
function determineTrend(primaryVol) {
  const momentum = primaryVol.momentum;
  if (!momentum || momentum.lastClose === undefined || momentum.lastMa200 === undefined) return null;
  const close = parseFloat(momentum.lastClose);
  const ma200 = parseFloat(momentum.lastMa200);
  if (isNaN(close) || isNaN(ma200)) return null;
  if (close > ma200) return 'haussiere';
  if (close < ma200) return 'baissiere';
  return null;
}

function evaluateEntry(primaryVol, config) {
  const vwap = primaryVol.vwap;
  const momentum = primaryVol.momentum;
  const dbsi = primaryVol.dbsi;
  if (!vwap || !vwap.crossedZero) return null;
  if (!momentum || momentum.lastLbw === undefined) return null;
  if (!dbsi || dbsi.diff === undefined) return null;

  const lbw = parseFloat(momentum.lastLbw);
  const ecart = vwap.reversalMagnitude !== null && vwap.reversalMagnitude !== undefined
    ? parseFloat(vwap.reversalMagnitude)
    : null;
  const dbsiDiff = parseFloat(dbsi.diff);

  if (ecart === null || ecart < THRESHOLDS.entryEcart) return null;
  if (dbsiDiff > THRESHOLDS.entryDbsi) return null; // DBSI doit etre <= -4

  const trend = determineTrend(primaryVol);
  const lbwCfg = (config && config.tradeSimulator && config.tradeSimulator.lbwThresholds) || null;

  if (trend && lbwCfg && lbwCfg.haussiere && lbwCfg.baissiere) {
    if (trend === 'haussiere') {
      // Contre-tendance (extreme) teste en premier, prioritaire sur le seuil assoupli.
      if (lbw >= lbwCfg.haussiere.shortExtreme) {
        return { direction: 'short', reason: `LBW=${lbw} (extreme, contre-tendance haussiere) ecart=${ecart} DBSI=${dbsiDiff}` };
      }
      if (lbw >= lbwCfg.haussiere.longSouple) {
        return { direction: 'long', reason: `LBW=${lbw} (assoupli, tendance haussiere) ecart=${ecart} DBSI=${dbsiDiff}` };
      }
      return null;
    }
    if (trend === 'baissiere') {
      if (lbw <= lbwCfg.baissiere.longExtreme) {
        return { direction: 'long', reason: `LBW=${lbw} (extreme, contre-tendance baissiere) ecart=${ecart} DBSI=${dbsiDiff}` };
      }
      if (lbw <= lbwCfg.baissiere.shortSouple) {
        return { direction: 'short', reason: `LBW=${lbw} (assoupli, tendance baissiere) ecart=${ecart} DBSI=${dbsiDiff}` };
      }
      return null;
    }
  }

  // Repli : tendance indeterminee ou config manquante -- ancien seuil
  // symetrique +/-60 (comportement d'avant le 28/07/2026), par prudence.
  if (lbw >= THRESHOLDS.entryLbw) {
    return { direction: 'long', reason: `LBW=${lbw} ecart=${ecart} DBSI=${dbsiDiff} (seuil symetrique, tendance indeterminee)` };
  }
  if (lbw <= -THRESHOLDS.entryLbw) {
    return { direction: 'short', reason: `LBW=${lbw} ecart=${ecart} DBSI=${dbsiDiff} (seuil symetrique, tendance indeterminee)` };
  }
  return null;
}

/**
 * Verifie le stop loss en mode meche, a CHAQUE tick (independant d'un
 * passage a zero du VWAP). Retourne true si le stop a ete touche.
 * Aucun effet si trade.stopLossPrice est null (pas encore pose, avant TP1).
 */
function checkStopLoss(trade, primaryVol) {
  if (trade.stopLossPrice === null || trade.stopLossPrice === undefined) return false;
  const momentum = primaryVol.momentum;
  if (!momentum || momentum.lastHigh === undefined || momentum.lastLow === undefined) return false;
  const high = parseFloat(momentum.lastHigh);
  const low = parseFloat(momentum.lastLow);
  if (trade.direction === 'long') return low <= trade.stopLossPrice;
  if (trade.direction === 'short') return high >= trade.stopLossPrice;
  return false;
}

function evaluateExit(trade, primaryVol, divRaw) {
  const vwap = primaryVol.vwap;
  if (!vwap || !vwap.crossedZero) {
    return { action: null, reason: null, closesTrade: false, incrementCrossing: false, setsStopLoss: false };
  }

  const ecart = vwap.reversalMagnitude !== null && vwap.reversalMagnitude !== undefined
    ? parseFloat(vwap.reversalMagnitude)
    : null;
  const bw = primaryVol.momentum && primaryVol.momentum.lastBw !== undefined
    ? parseFloat(primaryVol.momentum.lastBw)
    : null;
  const crossingNumber = trade.crossingsSinceEntry + 1;

  if (crossingNumber === 1) {
    return { action: 'TP1', reason: '1er passage a zero depuis entree', closesTrade: false, incrementCrossing: true, setsStopLoss: true };
  }

  if (crossingNumber === 2 && ecart !== null && ecart >= THRESHOLDS.tp2Ecart && bw !== null && bw >= THRESHOLDS.tp2BwMin && bw <= THRESHOLDS.tp2BwMax) {
    return { action: 'TP2', reason: `2e passage, ecart=${ecart} BW=${bw}`, closesTrade: true, incrementCrossing: true, setsStopLoss: false };
  }

  if (crossingNumber === 2 && ecart !== null && ecart < THRESHOLDS.tp2Ecart) {
    return { action: 'ATTENDRE', reason: `2e passage, ecart=${ecart} < ${THRESHOLDS.tp2Ecart}`, closesTrade: false, incrementCrossing: true, setsStopLoss: false };
  }

  // Branche par defaut (2e passage avec BW hors zone, ou 3e+ passage) :
  // liquidation, motif distingue selon divergence (27/07/2026).
  const tfCount = (divRaw && divRaw.tfCount) || 0;
  if (tfCount >= 1) {
    return { action: 'LIQUIDER', reason: 'divergence confirmee', closesTrade: true, incrementCrossing: true, setsStopLoss: false };
  }
  return { action: 'LIQUIDER', reason: 'valeur inferieure a 20/-20 sur BW', closesTrade: true, incrementCrossing: true, setsStopLoss: false };
}

/**
 * Point d'entree principal, appele une fois par module (scalp/day/swing)
 * a chaque tick de cerveau-central.js. Retourne une ligne de log/details
 * a afficher (visible en pm2 logs ET dans le panneau Diagnostic, puisque
 * `details` y est deja rendu), ou null si rien de notable ne s'est passe
 * ce tick pour ce module.
 */
function simulateModule(module, primaryVol, divRaw, config) {
  const state = loadState();
  const trade = state[module];
  const price = primaryVol.trigger && primaryVol.trigger.lastPrice;

  if (!trade) {
    const entry = evaluateEntry(primaryVol, config);
    if (!entry) return null;
    const positionSizePercent = (config && config.positionSizing && config.positionSizing.maxCapitalPercentPerTrade) || null;
    state[module] = {
      direction: entry.direction,
      entryPrice: price,
      entryTimestamp: new Date().toISOString(),
      crossingsSinceEntry: 0,
      tp1Taken: false,
      leverage: ORDER_DEFAULTS.leverage,
      positionSizePercent,
      orderType: ORDER_DEFAULTS.orderType,
      openType: ORDER_DEFAULTS.openType,
      stopLossPrice: null, // pose seulement au moment de TP1
    };
    saveState(state);
    const label = entry.direction === 'long' ? 'ENTRER_LONG' : 'ENTRER_SHORT';
    return `[TRADE-SIM] ${label} @ ${price} (${entry.reason}) [levier=${ORDER_DEFAULTS.leverage}x, ${ORDER_DEFAULTS.orderType}, ${ORDER_DEFAULTS.openType}, taille=${positionSizePercent}%]`;
  }

  // 0. Stop loss -- verifie a CHAQUE tick, independamment d'un passage a
  // zero du VWAP (mode meche : high/low de la derniere bougie).
  if (checkStopLoss(trade, primaryVol)) {
    const direction = trade.direction;
    state[module] = null;
    saveState(state);
    return `[TRADE-SIM] ${module.toUpperCase()} ${direction} LIQUIDER @ ${price} (stop loss touche a ${trade.stopLossPrice}, mode meche)`;
  }

  // 1. Machine a etats basee sur les passages a zero du VWAP.
  const exit = evaluateExit(trade, primaryVol, divRaw);
  if (!exit.action) return null; // pas de passage a zero ce tick, rien a signaler

  if (exit.incrementCrossing) trade.crossingsSinceEntry += 1;
  if (exit.action === 'TP1') {
    trade.tp1Taken = true;
    trade.stopLossPrice = trade.direction === 'long'
      ? trade.entryPrice + ORDER_DEFAULTS.stopLossBufferAbs
      : trade.entryPrice - ORDER_DEFAULTS.stopLossBufferAbs;
  }

  const direction = trade.direction;
  if (exit.closesTrade) {
    state[module] = null;
  } else {
    state[module] = trade;
  }
  saveState(state);

  const slNote = exit.action === 'TP1' ? ` [stop loss pose a ${trade.stopLossPrice}]` : '';
  return `[TRADE-SIM] ${module.toUpperCase()} ${direction} ${exit.action} @ ${price} (${exit.reason})${slNote}`;
}

module.exports = { simulateModule, loadState, THRESHOLDS, ORDER_DEFAULTS, determineTrend };
