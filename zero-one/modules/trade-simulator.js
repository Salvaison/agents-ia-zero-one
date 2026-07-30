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
 * (tradeSimulator.lbwThresholds).
 *
 * MIS A JOUR LE 28/07/2026 (3) : cascade VWAP 15m -> 3m. Quand le VWAP du
 * timeframe principal (15m pour Scalp) est tres proche de zero
 * (|vwap| <= 2) sans avoir encore croise, le systeme interroge le VWAP 3m
 * pour une confirmation anticipee -- si le 3m a deja croise zero, ca
 * confirme le mouvement 3 a 6 minutes avant la cloture de la bougie 15m.
 * Le passage a zero sur 3m suit exactement les memes regles que sur 15m
 * (memes seuils LBW/ecart/DBSI). Ne s'applique qu'aux modules dont le
 * timeframe 3m est disponible dans volByTf (Scalp uniquement pour
 * l'instant, puisque son signal inclut 3m -- Day/Swing n'ont pas cette
 * donnee).
 *
 * MIS A JOUR LE 28/07/2026 (4) : trade-simulator.js devient l'EXECUTANT
 * d'un systeme a deux etages. cerveau-central.js calcule desormais une
 * chaine de confluence (DIV/S-R/Engagement/VWAP/Velocite, minimums
 * simultanes) qui sert de PORTAIL -- simulateModule() n'est appele par
 * cerveau-central.js que si cette chaine est entierement verifiee
 * (CONFLUENCE ATTEINTE). La loi VWAP ci-dessous reste le declencheur
 * PRECIS (le "quand exactement"), evaluee uniquement une fois le portail
 * ouvert.
 *
 * Un seul trade simule ouvert a la fois par module (scalp/day/swing),
 * coherent avec l'architecture a 3 modules paralleles du SOP.
 *
 * ENTREE (evaluee uniquement si aucun trade simule n'est ouvert pour ce
 * module, et seulement au moment d'un passage a zero du VWAP -- crossedZero
 * sur le TF principal, OU confirme par la cascade 3m) :
 *   SI VWAP croise zero : LBW seuil (asymetrique selon tendance) : ecart >= 10 : DBSI <= -4 ALORS ENTRER_LONG/SHORT
 *   SINON ATTENDRE
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

const HISTORY_PATH = path.join(__dirname, '../data/trade-sim-history.json');
const HISTORY_MAX = 200; // limite pour ne pas laisser grossir indefiniment

function loadHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function appendHistory(record) {
  const history = loadHistory();
  history.push(record);
  if (history.length > HISTORY_MAX) history.shift();
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

// PNL simule (28/07/2026) : pourcentage de variation entre entree et
// sortie, applique au levier du trade -- purement indicatif, aucun ordre
// reel, aucun capital engage.
function computePnlPercent(trade, exitPrice) {
  if (exitPrice === null || exitPrice === undefined) return null;
  if (trade.entryPrice === null || trade.entryPrice === undefined) return null;
  const rawPct = trade.direction === 'long'
    ? ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100
    : ((trade.entryPrice - exitPrice) / trade.entryPrice) * 100;
  return rawPct * (trade.leverage || 1);
}

// Seuils de la loi d'entree/sortie -- en dur pour l'instant (27-28/07/2026),
// a exposer dans config.json si Benjamin veut les calibrer plus tard.
// entryLbw sert de REPLI uniquement, quand la tendance (close vs MA200)
// est indeterminee -- voir lbwThresholds dans config.json pour le cas normal.
const THRESHOLDS = {
  entryLbw: 60,
  entryEcart: 5, // baisse de 10 a 5 le 29/07/2026 -- aucun passage a zero observe en audit n'atteignait 10 (tous entre 5 et 8)
  entryDbsi: -4,
  tp2Ecart: 20,
  tp2BwMin: -20,
  tp2BwMax: 20,
  cascadeVwapThreshold: 3, // monte de 2 a 3 le 29/07/2026 (|vwap 15m| <= ce seuil -> interroge le 3m)
  cadenceBypassThreshold: 30, // ajoute le 29/07/2026 -- repli si config.tradeSimulator.cadenceBypassThreshold absent
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
function determineTrend(vol) {
  const momentum = vol.momentum;
  if (!momentum || momentum.lastClose === undefined || momentum.lastMa200 === undefined) return null;
  const close = parseFloat(momentum.lastClose);
  const ma200 = parseFloat(momentum.lastMa200);
  if (isNaN(close) || isNaN(ma200)) return null;
  if (close > ma200) return 'haussiere';
  if (close < ma200) return 'baissiere';
  return null;
}

/**
 * Cascade VWAP 15m -> 3m (28/07/2026). Si le VWAP du TF principal n'a pas
 * encore croise zero mais en est tres proche (|vwap| <= seuil), interroge
 * le VWAP 3m (s'il est disponible dans volByTf) pour une confirmation
 * anticipee. Retourne le "vol" a utiliser pour l'evaluation de la loi
 * d'entree -- soit primaryVol tel quel (croisement normal ou aucune
 * cascade applicable), soit le vol du 3m (cascade confirmee), soit null
 * (aucun croisement, ni direct ni par cascade).
 */
function resolveEntryVol(primaryVol, volByTf) {
  if (primaryVol.vwap && primaryVol.vwap.crossedZero) {
    return { vol: primaryVol, cascade: false };
  }
  const current = primaryVol.vwap ? parseFloat(primaryVol.vwap.current) : NaN;
  if (isNaN(current) || Math.abs(current) > THRESHOLDS.cascadeVwapThreshold) return { vol: null, cascade: false };
  const vol3m = volByTf && volByTf['3m'];
  if (!vol3m || !vol3m.vwap || !vol3m.vwap.crossedZero) return { vol: null, cascade: false };
  return { vol: vol3m, cascade: true };
}

function evaluateEntry(primaryVol, config, volByTf) {
  // Bypass Cadence (29/07/2026, decision de Benjamin) : capte les poussees
  // directionnelles fortes que le VWAP (base sur un retournement/passage a
  // zero) ne peut pas voir par construction -- observe en audit le
  // 29/07/2026 (cadence pic a 53 ticks/s, DBSI eleve, mais VWAP 15m ET 3m
  // sans aucun passage a zero). Si Cadence >= seuil, declenche une entree
  // sur le sens lisse du prix (Trigger.priceSens3), independamment de tout
  // passage a zero du VWAP.
  const trig = primaryVol.trigger;
  const cadenceBypassThreshold = (config && config.tradeSimulator && config.tradeSimulator.cadenceBypassThreshold) || THRESHOLDS.cadenceBypassThreshold;
  if (trig && trig.cadenceTicksPerSec !== undefined && trig.cadenceTicksPerSec !== null) {
    const cadenceValue = parseFloat(trig.cadenceTicksPerSec);
    if (cadenceValue >= cadenceBypassThreshold && trig.priceSens3 !== undefined && trig.priceSens3 !== 0) {
      const direction = trig.priceSens3 > 0 ? 'long' : 'short';
      const sensLabel = trig.priceSens3 > 0 ? 'haussier' : 'baissier';
      return { direction, reason: `bypass cadence=${cadenceValue} ticks/s (sens lisse 3 tranches, ${sensLabel})` };
    }
  }

  const { vol: sourceVol, cascade } = resolveEntryVol(primaryVol, volByTf || {});
  if (!sourceVol) return null;

  const vwap = sourceVol.vwap;
  const momentum = sourceVol.momentum;
  const dbsi = sourceVol.dbsi;
  if (!momentum || momentum.lastLbw === undefined) return null;

  // DBSI desactivable (29/07/2026, decision de Benjamin) : pour calibrer
  // d'abord le passage a zero + seuil LBW tout seuls, avant de reintroduire
  // DBSI comme condition supplementaire. Reversible via
  // config.tradeSimulator.requiresDbsi (false actuellement).
  const requiresDbsi = !config || !config.tradeSimulator || config.tradeSimulator.requiresDbsi !== false;
  const dbsiDiff = (dbsi && dbsi.diff !== undefined) ? parseFloat(dbsi.diff) : null;
  if (requiresDbsi) {
    if (dbsiDiff === null) return null;
    if (dbsiDiff > THRESHOLDS.entryDbsi) return null; // DBSI doit etre <= -4
  }

  const lbw = parseFloat(momentum.lastLbw);
  const ecart = vwap.reversalMagnitude !== null && vwap.reversalMagnitude !== undefined
    ? parseFloat(vwap.reversalMagnitude)
    : null;

  if (ecart === null || ecart < THRESHOLDS.entryEcart) return null;

  const cascadeNote = cascade ? ' [cascade 3m, confirmation anticipee]' : '';
  const dbsiNote = dbsiDiff !== null ? ` DBSI=${dbsiDiff}${requiresDbsi ? '' : ' (hors condition)'}` : '';

  // Tendance toujours evaluee sur le TF principal (15m), pas sur le 3m
  // meme en cas de cascade -- la tendance de fond ne change pas en 3 min.
  const trend = determineTrend(primaryVol);
  const lbwCfg = (config && config.tradeSimulator && config.tradeSimulator.lbwThresholds) || null;

  if (trend && lbwCfg && lbwCfg.haussiere && lbwCfg.baissiere) {
    if (trend === 'haussiere') {
      if (lbw >= lbwCfg.haussiere.shortExtreme) {
        return { direction: 'short', reason: `LBW=${lbw} (extreme, contre-tendance haussiere) ecart=${ecart}${dbsiNote}${cascadeNote}` };
      }
      if (lbw >= lbwCfg.haussiere.longSouple) {
        return { direction: 'long', reason: `LBW=${lbw} (assoupli, tendance haussiere) ecart=${ecart}${dbsiNote}${cascadeNote}` };
      }
      return null;
    }
    if (trend === 'baissiere') {
      if (lbw <= lbwCfg.baissiere.longExtreme) {
        return { direction: 'long', reason: `LBW=${lbw} (extreme, contre-tendance baissiere) ecart=${ecart}${dbsiNote}${cascadeNote}` };
      }
      if (lbw <= lbwCfg.baissiere.shortSouple) {
        return { direction: 'short', reason: `LBW=${lbw} (assoupli, tendance baissiere) ecart=${ecart}${dbsiNote}${cascadeNote}` };
      }
      return null;
    }
  }

  // Repli : tendance indeterminee ou config manquante -- ancien seuil
  // symetrique +/-60 (comportement d'avant le 28/07/2026), par prudence.
  if (lbw >= THRESHOLDS.entryLbw) {
    return { direction: 'long', reason: `LBW=${lbw} ecart=${ecart}${dbsiNote} (seuil symetrique, tendance indeterminee)${cascadeNote}` };
  }
  if (lbw <= -THRESHOLDS.entryLbw) {
    return { direction: 'short', reason: `LBW=${lbw} ecart=${ecart}${dbsiNote} (seuil symetrique, tendance indeterminee)${cascadeNote}` };
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
 * a chaque tick de cerveau-central.js -- UNIQUEMENT si la chaine de
 * confluence est deja verifiee (voir cerveau-central.js). Retourne une
 * ligne de log/details a afficher, ou null si rien de notable ne s'est
 * passe ce tick pour ce module.
 */
function simulateModule(module, primaryVol, divRaw, config, volByTf) {
  const state = loadState();
  const trade = state[module];
  const price = primaryVol.trigger && primaryVol.trigger.lastPrice;

  if (!trade) {
    const entry = evaluateEntry(primaryVol, config, volByTf);
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
    appendHistory({
      module,
      direction,
      entryPrice: trade.entryPrice,
      entryTimestamp: trade.entryTimestamp,
      exitPrice: price,
      exitTimestamp: new Date().toISOString(),
      exitReason: `stop loss touche a ${trade.stopLossPrice} (mode meche)`,
      leverage: trade.leverage,
      positionSizePercent: trade.positionSizePercent,
      pnlPercent: computePnlPercent(trade, price),
    });
    state[module] = null;
    saveState(state);
    return `[TRADE-SIM] ${module.toUpperCase()} ${direction} LIQUIDER @ ${price} (stop loss touche a ${trade.stopLossPrice}, mode meche)`;
  }

  // 0.5. Timeout anti-zombie (30/07/2026, GARDE-FOU D'URGENCE) : une
  // position sans TP1 n'a jamais de stop pose (voir etape 0 ci-dessus),
  // donc peut rester ouverte a nu indefiniment si aucun passage a zero
  // n'arrive. Ferme de force au-dela de config.tradeSimulator.
  // maxHoldMinutesWithoutTp1[module] minutes. Provisoire, remplace par le
  // "baton de relais" une fois pret.
  if (!trade.tp1Taken) {
    const maxHold = config && config.tradeSimulator && config.tradeSimulator.maxHoldMinutesWithoutTp1
      ? config.tradeSimulator.maxHoldMinutesWithoutTp1[module]
      : null;
    if (maxHold) {
      const elapsedMinutes = (Date.now() - new Date(trade.entryTimestamp).getTime()) / 60000;
      if (elapsedMinutes >= maxHold) {
        const direction = trade.direction;
        appendHistory({
          module,
          direction,
          entryPrice: trade.entryPrice,
          entryTimestamp: trade.entryTimestamp,
          exitPrice: price,
          exitTimestamp: new Date().toISOString(),
          exitReason: `timeout anti-zombie (${elapsedMinutes.toFixed(1)} min sans TP1, max ${maxHold})`,
          leverage: trade.leverage,
          positionSizePercent: trade.positionSizePercent,
          pnlPercent: computePnlPercent(trade, price),
        });
        state[module] = null;
        saveState(state);
        return `[TRADE-SIM] ${module.toUpperCase()} ${direction} LIQUIDER @ ${price} (timeout anti-zombie, ${elapsedMinutes.toFixed(1)} min sans TP1)`;
      }
    }
  }

  // 1. Machine a etats basee sur les passages a zero du VWAP.
  const exit = evaluateExit(trade, primaryVol, divRaw);
  if (!exit.action) return null; // pas de passage a zero ce tick, rien a signaler

  if (exit.incrementCrossing) trade.crossingsSinceEntry += 1;
  if (exit.action === 'TP1') {
    trade.tp1Taken = true;
    // Corrige le 29/07/2026 : stop de protection pose a TP1 (break-even),
    // du cote qui protege le gain acquis. LONG -> sous l'entree ; SHORT ->
    // au-dessus. Les signes etaient inverses, ce qui posait le stop quasi
    // colle au prix du mauvais cote (touche des la bougie suivante).
    trade.stopLossPrice = trade.direction === 'long'
      ? trade.entryPrice - ORDER_DEFAULTS.stopLossBufferAbs
      : trade.entryPrice + ORDER_DEFAULTS.stopLossBufferAbs;
  }

  const direction = trade.direction;
  if (exit.closesTrade) {
    appendHistory({
      module,
      direction,
      entryPrice: trade.entryPrice,
      entryTimestamp: trade.entryTimestamp,
      exitPrice: price,
      exitTimestamp: new Date().toISOString(),
      exitReason: `${exit.action} -- ${exit.reason}`,
      leverage: trade.leverage,
      positionSizePercent: trade.positionSizePercent,
      pnlPercent: computePnlPercent(trade, price),
    });
    state[module] = null;
  } else {
    state[module] = trade;
  }
  saveState(state);

  const slNote = exit.action === 'TP1' ? ` [stop loss pose a ${trade.stopLossPrice}]` : '';
  return `[TRADE-SIM] ${module.toUpperCase()} ${direction} ${exit.action} @ ${price} (${exit.reason})${slNote}`;
}

module.exports = { simulateModule, loadState, THRESHOLDS, ORDER_DEFAULTS, determineTrend };
