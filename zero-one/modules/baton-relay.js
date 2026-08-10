/**
 * baton-relay.js — Processus PERMANENT et INDEPENDANT (30/07/2026), separe
 * de cerveau-central.js (qui evalue toutes les 60s). Calcule le "baton de
 * relais" toutes les 30s :
 *   - direction : signe de (prix maintenant - prix il y a 30s, le relevé
 *     precedent)
 *   - cadenceMultiplier : cadence actuelle / MOYENNE GLISSANTE sur 4h
 *
 * Garde-fou de plausibilite : cadence > 120 = anomalie -- exclue de la
 * moyenne glissante, ne produit aucun signal.
 *
 * CHAINE DE DECISION (30/07/2026) :
 *   1. EVENEMENT     : cadenceMultiplier >= 2x -> VIGILANCE
 *   2. VIGILANCE     : etat PERSISTANT, relaye de baton en baton
 *   3. REACTION PRIX : |netMove| >= 0.06% -> action immediate ;
 *                      |netMove| >= 0.03% confirme sur 2 batons -> action
 *   4. TRADE         : dans le sens du prix
 *
 * MIS A JOUR LE 31/07/2026 (v3) : ajoute la persistance d'un historique
 * glissant de 24h (2880 relevés a 30s) dans data/audit-history.json,
 * servi par la route /api/audit-history (config-server.js) -- remplace
 * le copier-coller manuel du log dans l'outil d'audit HTML par un vrai
 * onglet du dashboard web (AUDIT). Inclut desormais priceHigh/priceLow
 * (necessite le patch priceHigh/priceLow de volume-analyzer.js).
 *
 * Ecrit dans data/baton-state.json (etat courant, lu par trade-simulator.js
 * a chaque cycle de 60s) ET data/audit-history.json (historique 24h, lu
 * par le dashboard web). Le baton NE DECIDE PAS le trade : il expose l'etat
 * de la chaine. Les regles d'action (tranches 25/65/10) vivent dans
 * trade-simulator.js.
 *
 * PM2 : pm2 restart baton-relay
 */
const fs = require('fs');
const path = require('path');
const priceStream = require('./price-stream');
const { analyzeVwap, analyzeTrigger, analyzeWavePivot } = require('./volume-analyzer');

const STATE_PATH = path.join(__dirname, '../data/baton-state.json');
const HISTORY_PATH = path.join(__dirname, '../data/baton-cadence-history.json');
const AUDIT_HISTORY_PATH = path.join(__dirname, '../data/audit-history.json');

const CADENCE_SANITY_CEILING = 120;   // au-dela = anomalie (nominal, a reviser en bull market)
const ROLLING_WINDOW_MS = 4 * 60 * 60 * 1000; // moyenne glissante 4h
const MIN_SAMPLES_FOR_AVG = 60;       // ~30 min avant de faire confiance a la moyenne

const EVENT_MULTIPLIER = 2;
const PRICE_REACTION_IMMEDIATE = 0.06;
const PRICE_REACTION_CONFIRMED = 0.03;

const AUDIT_HISTORY_MAX = 2880; // 24h a raison d'un relevé/30s
const CONFIG_PATH_BR = path.join(__dirname, '../config.json');

/* Config relue a chaque tick (hot-reload, comme cerveau-central) -- necessaire
 * depuis le 10/08/2026 pour le seuil du declencheur de deplacement. */
let _cfgCache = {};
function reloadConfigBR() {
  try { _cfgCache = JSON.parse(fs.readFileSync(CONFIG_PATH_BR, 'utf8')); }
  catch (e) { /* garde la derniere version valide */ }
}
reloadConfigBR();
const PRICE_HISTORY_SIZE = 10;        // fenetre du desequilibre (10 batons = 5 min)
const IMBALANCE_THRESHOLD = 0.10;     // % de deplacement de prix -- ~p90/p95 mesure sur 24h

function loadHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}
function saveHistory(history) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history));
}
function writeState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function loadAuditHistory() {
  if (!fs.existsSync(AUDIT_HISTORY_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(AUDIT_HISTORY_PATH, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}
function appendAuditHistory(row) {
  auditHistory.push(row);
  if (auditHistory.length > AUDIT_HISTORY_MAX) auditHistory.shift();
  fs.writeFileSync(AUDIT_HISTORY_PATH, JSON.stringify(auditHistory));
}

let cadenceHistory = loadHistory();
let auditHistory = loadAuditHistory();
let prevPrice = null;
let vigilance = null;
let lastAction = null; // persiste (contrairement a "action", vrai un seul tick)
let priceHistory = []; // 10 derniers prix (02/08/2026 -- remplace netMoveHistory)

function pruneHistory(now) {
  const cutoff = now - ROLLING_WINDOW_MS;
  cadenceHistory = cadenceHistory.filter(h => h.ts >= cutoff);
}
function rollingAverage() {
  if (cadenceHistory.length === 0) return null;
  return cadenceHistory.reduce((a, h) => a + h.cadence, 0) / cadenceHistory.length;
}

function tick() {
  reloadConfigBR();
  const trig = analyzeTrigger();
  const now = Date.now();

  if (!trig || trig.status === 'insufficient_data') {
    writeState({ timestamp: new Date(now).toISOString(), status: 'insufficient_data' });
    return;
  }

  const currentPrice = parseFloat(trig.lastPrice);
  const currentCadence = parseFloat(trig.cadenceTicksPerSec);
  const isAnomaly = currentCadence > CADENCE_SANITY_CEILING;

  const netMovePct = trig.netMovePct !== null && trig.netMovePct !== undefined
    ? parseFloat(String(trig.netMovePct).replace('%', ''))
    : null;
  const amplitudePct = trig.amplitudePct !== null && trig.amplitudePct !== undefined
    ? parseFloat(String(trig.amplitudePct).replace('%', ''))
    : null;
  const priceHigh = trig.priceHigh !== null && trig.priceHigh !== undefined ? parseFloat(trig.priceHigh) : null;
  const priceLow = trig.priceLow !== null && trig.priceLow !== undefined ? parseFloat(trig.priceLow) : null;

  // ===== Recommandation VWAP15 / desequilibre (01/08/2026, mode observation) ====
  const vwap15 = analyzeVwap('15m');
  // Pivots de vague MCB (04/08/2026, observation) -- sur 3m, coherent avec
  // le rythme du baton (cycle 30s). Ne pilote aucune decision a ce stade.
  const wavePivot = analyzeWavePivot('3m');
  // Deplacement de prix REEL sur la fenetre (corrige le 02/08/2026 -- voir
  // en-tete du patch : l'ancienne somme de netMove chevauchants sous-estimait
  // l'amplitude d'un facteur ~2 et s'inversait parfois de signe).
  let displacementPct = null;
  if (priceHistory.length >= PRICE_HISTORY_SIZE) {
    const p0 = priceHistory[0];
    if (p0) displacementPct = parseFloat((((currentPrice - p0) / p0) * 100).toFixed(4));
  }
  if (currentPrice && !isAnomaly) {
    priceHistory.push(currentPrice);
    if (priceHistory.length > PRICE_HISTORY_SIZE) priceHistory.shift();
  }
  const strongImbalance = displacementPct !== null && Math.abs(displacementPct) >= IMBALANCE_THRESHOLD;
  const vwap15NearZero = !!(vwap15 && vwap15.nearZero);
  const vwap15Cur = (vwap15 && vwap15.current !== undefined) ? parseFloat(vwap15.current) : null;
  const vwap15Prev = (vwap15 && vwap15.previous !== undefined) ? parseFloat(vwap15.previous) : null;
  const vwap15TrendDown = (vwap15Cur !== null && vwap15Prev !== null)
    ? (Math.abs(vwap15Cur) < Math.abs(vwap15Prev)) : null;
  // PENTE DU VWAP (10/08/2026, observation seulement) -- direction de la
  // ligne par rapport a l'horizontale du zero MCB, et puissance de cette
  // pente (angle d'attaque). Une ligne PLATE = apogee de vague, retournement
  // proche (observation de Benjamin). Ne pilote aucune decision a ce stade.
  // Seuils recalibres le 10/08/2026 sur la distribution reelle (24h, 187
  // changements) : p25=2.04 p50=4.81 p75=8.90. Les anciennes valeurs posees
  // a l'estime (0.5 / 3.0) classaient 64% des cas en 'fort' -- inutilisable.
  const _slopeCfg = (_cfgCache && _cfgCache.tradeSimulator && _cfgCache.tradeSimulator.vwapSlope) || {};
  const slopeFlat = _slopeCfg.flatBelow !== undefined ? _slopeCfg.flatBelow : 2.04;
  const slopeStrong = _slopeCfg.strongAbove !== undefined ? _slopeCfg.strongAbove : 8.90;
  let vwapSlope = null, vwapSlopeDir = null, vwapSlopeStrength = null;
  if (vwap15Cur !== null && vwap15Prev !== null) {
    vwapSlope = parseFloat((vwap15Cur - vwap15Prev).toFixed(4));
    const abs = Math.abs(vwapSlope);
    vwapSlopeDir = abs < slopeFlat ? 'plat' : (vwapSlope > 0 ? 'montant' : 'descendant');
    vwapSlopeStrength = abs < slopeFlat ? 'faible' : (abs >= slopeStrong ? 'fort' : 'moyen');
  }

  let vwapRegime = 'neutre';
  if (vwap15TrendDown === false) vwapRegime = 'continuation';
  else if (vwap15NearZero && vwap15TrendDown === true) vwapRegime = 'retournement_possible';
  let recommendedDirection = null;
  if (vwapRegime === 'retournement_possible' && strongImbalance) {
    recommendedDirection = displacementPct > 0 ? 'baissier' : 'haussier'; // sens oppose au desequilibre
  }

  pruneHistory(now);

  let direction = null;
  if (prevPrice !== null) {
    const diff = currentPrice - prevPrice;
    direction = diff > 0 ? 'haussier' : (diff < 0 ? 'baissier' : 'neutre');
  }
  prevPrice = currentPrice;

  let cadenceMultiplier = null;
  let rollingAvg4h = rollingAverage();

  if (!isAnomaly) {
    cadenceHistory.push({ ts: now, cadence: currentCadence });
    saveHistory(cadenceHistory);
    rollingAvg4h = rollingAverage();
    if (cadenceHistory.length >= MIN_SAMPLES_FOR_AVG && rollingAvg4h > 0) {
      cadenceMultiplier = parseFloat((currentCadence / rollingAvg4h).toFixed(2));
    }
  }

  // ===== CHAINE DE DECISION (evenement/vigilance/reaction prix) ========
  // Deux voies d'ouverture de vigilance depuis le 10/08/2026 :
  //   1. EVENEMENT CADENCE  -- pic d'activite instantane (voie historique)
  //   2. DEPLACEMENT 5 MIN  -- mouvement progressif, invisible a la cadence
  //      (voir en-tete du patch : 293 occasions/24h ratees par la voie 1)
  const isEvent = cadenceMultiplier !== null && cadenceMultiplier >= EVENT_MULTIPLIER;

  const dispCfg = (_cfgCache && _cfgCache.tradeSimulator && _cfgCache.tradeSimulator.displacementTrigger) || {};
  const dispThreshold = dispCfg.thresholdPct !== undefined ? dispCfg.thresholdPct : 0.084;
  const isDisplacementEvent = dispCfg.enabled !== false
    && displacementPct !== null
    && Math.abs(displacementPct) >= dispThreshold;

  if (isEvent || isDisplacementEvent) {
    vigilance = {
      since: new Date(now).toISOString(),
      trigger: isEvent ? 'cadence' : 'displacement',
      triggerMultiplier: cadenceMultiplier,
      triggerDisplacement: displacementPct,
      priceAtEvent: currentPrice,
      batonCount: 0,
      pendingDirection: null,
      pendingNetMove: null,
    };
  } else if (vigilance) {
    vigilance.batonCount += 1;
  }

  let action = null;
  if (vigilance && netMovePct !== null && direction && direction !== 'neutre') {
    const absMove = Math.abs(netMovePct);
    if (absMove >= PRICE_REACTION_IMMEDIATE) {
      action = {
        type: 'immediate',
        direction,
        reason: `netMove=${netMovePct}% >= ${PRICE_REACTION_IMMEDIATE}% (action immediate), vigilance depuis ${vigilance.since} (evenement x${vigilance.triggerMultiplier})`,
      };
    } else if (absMove >= PRICE_REACTION_CONFIRMED) {
      if (vigilance.pendingDirection === direction) {
        action = {
          type: 'confirmed',
          direction,
          reason: `netMove=${netMovePct}% >= ${PRICE_REACTION_CONFIRMED}% confirme sur 2 batons (${direction}), vigilance depuis ${vigilance.since} (evenement x${vigilance.triggerMultiplier})`,
        };
      } else {
        vigilance.pendingDirection = direction;
        vigilance.pendingNetMove = netMovePct;
      }
    } else {
      vigilance.pendingDirection = null;
      vigilance.pendingNetMove = null;
    }
  }
  if (action) {
    vigilance = null;
    lastAction = { ...action, timestamp: new Date(now).toISOString() };
  }

  writeState({
    timestamp: new Date(now).toISOString(),
    status: 'ok',
    direction,
    netMovePct,
    cadenceMultiplier,
    cadenceRaw: currentCadence,
    rollingAvg4h: rollingAvg4h !== null ? parseFloat(rollingAvg4h.toFixed(2)) : null,
    sampleCount: cadenceHistory.length,
    isAnomaly,
    lastPrice: currentPrice,
    isEvent,
    vigilance,
    action,
    lastAction,
    vwapRegime,
    displacementPct,
    recommendedDirection,
    vwapSlope,
    vwapSlopeDir,
    vwapSlopeStrength,
    wavePivotType: wavePivot.type || null,
    wavePivotValue: wavePivot.value !== undefined ? wavePivot.value : null,
    wavePivotAgeCycles: wavePivot.ageCycles !== undefined ? wavePivot.ageCycles : null,
  });

  // ===== Historique 24h pour le dashboard web (31/07/2026) ==============
  const vwap3 = analyzeVwap('3m');
  appendAuditHistory({
    ts: now,
    vwap15: (vwap15 && vwap15.current !== undefined) ? parseFloat(vwap15.current) : null,
    vwap15Cross: !!(vwap15 && vwap15.crossedZero),
    vwap3: (vwap3 && vwap3.current !== undefined) ? parseFloat(vwap3.current) : null,
    vwap3Cross: !!(vwap3 && vwap3.crossedZero),
    cadence: currentCadence,
    cadenceMult: cadenceMultiplier,
    priceSens3: trig.priceSens3 !== undefined ? trig.priceSens3 : null,
    netMove: netMovePct,
    amplitude: amplitudePct,
    winSec: (trig.windowSeconds !== undefined && trig.windowSeconds !== null) ? parseFloat(trig.windowSeconds) : null,
    direction,
    lastPrice: currentPrice,
    priceHigh,
    priceLow,
    isAnomaly,
  });

  if (isEvent) {
    console.log(`[baton] EVENEMENT x${cadenceMultiplier} (cadence=${currentCadence}, moy4h=${rollingAvg4h ? rollingAvg4h.toFixed(2) : 'n/a'}) -> VIGILANCE`);
  }
  if (action) {
    console.log(`[baton] ACTION ${action.type} ${action.direction} -- ${action.reason}`);
  }
}

priceStream.start();
tick();
setInterval(tick, 30000);

function shutdown() {
  try { priceStream.stop(); } catch (e) {}
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('[baton-relay] v3 demarre (chaine + historique 24h), ecrit dans', STATE_PATH, 'et', AUDIT_HISTORY_PATH, 'toutes les 30s.');
