/**
 * trade-simulator.js — Simulation de gestion de trade (entree + sortie),
 * en OBSERVATION SEULE : aucun ordre reel n'est jamais passe, aucun capital
 * n'est engage. Cree le 27/07/2026, suite a la formalisation de la loi
 * d'entree et de la machine a etats TP1/TP2/liquidation basee sur le VWAP
 * (LBW - BW), en remplacement du plan Fibonacci-sur-pivot du SOP v1 (jamais
 * implemente -- voir SOP-bot-trading-boono.md, section Trigger C).
 *
 * Un seul trade simule ouvert a la fois par module (scalp/day/swing),
 * coherent avec l'architecture a 3 modules paralleles du SOP.
 *
 * ENTREE (evaluee uniquement si aucun trade simule n'est ouvert pour ce
 * module, et seulement au moment d'un passage a zero du VWAP -- crossedZero) :
 *   SI VWAP croise zero : LBW >= 60 : ecart >= 10 : DBSI <= -4 ALORS ENTRER_LONG
 *   SINON SI VWAP croise zero : LBW <= -60 : ecart >= 10 : DBSI <= -4 ALORS ENTRER_SHORT
 *   SINON ATTENDRE
 *
 * SORTIE (evaluee uniquement si un trade simule est ouvert pour ce module,
 * et seulement au moment d'un passage a zero du VWAP) :
 *   SI 1er passage depuis l'entree ALORS TP1 (garde le trade ouvert)
 *   SINON SI 2e passage : ecart >= 20 : BW entre -20 et 20 ALORS TP2 (ferme)
 *   SINON SI 2e passage : ecart < 20 ALORS ATTENDRE (garde le trade ouvert)
 *   SINON SI DIV >= 1 TF ALORS LIQUIDER, motif "divergence confirmee"
 *   SINON LIQUIDER, motif "valeur BW hors zone -20/20"
 *
 * HYPOTHESE D'IMPLEMENTATION A VALIDER AVEC BENJAMIN : chaque passage a zero
 * detecte fait avancer le compteur crossingsSinceEntry, y compris le cas
 * ATTENDRE (2e passage, ecart<20) -- donc un 3e passage eventuel tombe dans
 * la branche de liquidation par defaut (DIV/BW), faute de regle definie
 * au-dela du 2e passage dans la conversation du 27/07/2026. A confirmer ou
 * corriger une fois observe en conditions reelles.
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

// Seuils de la loi d'entree/sortie -- en dur pour l'instant (27/07/2026),
// a exposer dans config.json si Benjamin veut les calibrer plus tard.
const THRESHOLDS = {
  entryLbw: 60,
  entryEcart: 10,
  entryDbsi: -4,
  tp2Ecart: 20,
  tp2BwMin: -20,
  tp2BwMax: 20,
};

function evaluateEntry(primaryVol) {
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

  if (lbw >= THRESHOLDS.entryLbw) {
    return { direction: 'long', reason: `LBW=${lbw} ecart=${ecart} DBSI=${dbsiDiff}` };
  }
  if (lbw <= -THRESHOLDS.entryLbw) {
    return { direction: 'short', reason: `LBW=${lbw} ecart=${ecart} DBSI=${dbsiDiff}` };
  }
  return null;
}

function evaluateExit(trade, primaryVol, divRaw) {
  const vwap = primaryVol.vwap;
  if (!vwap || !vwap.crossedZero) {
    return { action: null, reason: null, closesTrade: false, incrementCrossing: false };
  }

  const ecart = vwap.reversalMagnitude !== null && vwap.reversalMagnitude !== undefined
    ? parseFloat(vwap.reversalMagnitude)
    : null;
  const bw = primaryVol.momentum && primaryVol.momentum.lastBw !== undefined
    ? parseFloat(primaryVol.momentum.lastBw)
    : null;
  const crossingNumber = trade.crossingsSinceEntry + 1;

  if (crossingNumber === 1) {
    return { action: 'TP1', reason: '1er passage a zero depuis entree', closesTrade: false, incrementCrossing: true };
  }

  if (crossingNumber === 2 && ecart !== null && ecart >= THRESHOLDS.tp2Ecart && bw !== null && bw >= THRESHOLDS.tp2BwMin && bw <= THRESHOLDS.tp2BwMax) {
    return { action: 'TP2', reason: `2e passage, ecart=${ecart} BW=${bw}`, closesTrade: true, incrementCrossing: true };
  }

  if (crossingNumber === 2 && ecart !== null && ecart < THRESHOLDS.tp2Ecart) {
    return { action: 'ATTENDRE', reason: `2e passage, ecart=${ecart} < ${THRESHOLDS.tp2Ecart}`, closesTrade: false, incrementCrossing: true };
  }

  // Branche par defaut (2e passage avec BW hors zone, ou 3e+ passage) :
  // liquidation, motif distingue selon divergence (27/07/2026).
  const tfCount = (divRaw && divRaw.tfCount) || 0;
  if (tfCount >= 1) {
    return { action: 'LIQUIDER', reason: 'divergence confirmee', closesTrade: true, incrementCrossing: true };
  }
  return { action: 'LIQUIDER', reason: 'valeur inferieure a 20/-20 sur BW', closesTrade: true, incrementCrossing: true };
}

/**
 * Point d'entree principal, appele une fois par module (scalp/day/swing)
 * a chaque tick de cerveau-central.js. Retourne une ligne de log/details
 * a afficher (visible en pm2 logs ET dans le panneau Diagnostic, puisque
 * `details` y est deja rendu), ou null si rien de notable ne s'est passe
 * ce tick pour ce module.
 */
function simulateModule(module, primaryVol, divRaw) {
  const state = loadState();
  const trade = state[module];
  const price = primaryVol.trigger && primaryVol.trigger.lastPrice;

  if (!trade) {
    const entry = evaluateEntry(primaryVol);
    if (!entry) return null;
    state[module] = {
      direction: entry.direction,
      entryPrice: price,
      entryTimestamp: new Date().toISOString(),
      crossingsSinceEntry: 0,
      tp1Taken: false,
    };
    saveState(state);
    const label = entry.direction === 'long' ? 'ENTRER_LONG' : 'ENTRER_SHORT';
    return `[TRADE-SIM] ${label} @ ${price} (${entry.reason})`;
  }

  const exit = evaluateExit(trade, primaryVol, divRaw);
  if (!exit.action) return null; // pas de passage a zero ce tick, rien a signaler

  if (exit.incrementCrossing) trade.crossingsSinceEntry += 1;
  if (exit.action === 'TP1') trade.tp1Taken = true;

  const direction = trade.direction;
  if (exit.closesTrade) {
    state[module] = null;
  } else {
    state[module] = trade;
  }
  saveState(state);

  return `[TRADE-SIM] ${module.toUpperCase()} ${direction} ${exit.action} @ ${price} (${exit.reason})`;
}

module.exports = { simulateModule, loadState, THRESHOLDS };
