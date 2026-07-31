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
const { analyzeVwap, analyzeTrigger } = require('./volume-analyzer');

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

function pruneHistory(now) {
  const cutoff = now - ROLLING_WINDOW_MS;
  cadenceHistory = cadenceHistory.filter(h => h.ts >= cutoff);
}
function rollingAverage() {
  if (cadenceHistory.length === 0) return null;
  return cadenceHistory.reduce((a, h) => a + h.cadence, 0) / cadenceHistory.length;
}

function tick() {
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
  const isEvent = cadenceMultiplier !== null && cadenceMultiplier >= EVENT_MULTIPLIER;
  if (isEvent) {
    vigilance = {
      since: new Date(now).toISOString(),
      triggerMultiplier: cadenceMultiplier,
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
  if (action) vigilance = null;

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
  });

  // ===== Historique 24h pour le dashboard web (31/07/2026) ==============
  const vwap15 = analyzeVwap('15m');
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
