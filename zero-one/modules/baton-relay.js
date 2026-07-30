/**
 * baton-relay.js — Processus PERMANENT et INDEPENDANT (30/07/2026).
 * Calcule le "baton de relais" toutes les 30s et implemente la CHAINE DE
 * DECISION definie avec Benjamin :
 *
 *   1. EVENEMENT     : cadenceMultiplier >= 2x (vs moyenne glissante 4h)
 *                      -> entre en VIGILANCE
 *   2. VIGILANCE     : etat PERSISTANT, relaye de baton en baton. Ne
 *                      s'eteint jamais tout seul (decision de Benjamin) --
 *                      seule une reaction du prix le resout.
 *   3. REACTION PRIX : c'est le PRIX qui decide du sens, jamais l'evenement
 *                      (un pic de cadence est ambigu par nature : il casse
 *                      le marche -- ralentit, inverse, ou accentue une
 *                      tendance existante -- verifie le 30/07 sur 7 pics
 *                      reels : parfois retournement, parfois continuation).
 *                        - |netMove| >= 0.06%  -> action IMMEDIATE (1 baton)
 *                        - |netMove| >= 0.03%  -> action si confirme sur
 *                          2 batons consecutifs dans le MEME sens
 *                      (0.01% ~ mouvement moyen observe ; 3x = significatif)
 *   4. TRADE         : dans le sens du prix ("la liquidite MAINTENANT")
 *
 * Garde-fou de plausibilite : cadence > 120 = anomalie (sweep extreme ou
 * limite de resolution de l'horodatage MEXC -- observe cadence=50000 avec
 * winSec=0.0). Exclue de la moyenne glissante, ne produit aucun signal.
 *
 * Ecrit dans data/baton-state.json, lu par trade-simulator.js (60s).
 * Le baton NE DECIDE PAS le trade : il expose l'etat de la chaine. Les
 * regles d'action (tranches 25/65/10) vivent dans trade-simulator.js.
 *
 * PM2 : pm2 start baton-relay.js --name baton-relay
 */
const fs = require('fs');
const path = require('path');
const priceStream = require('./price-stream');
const { analyzeTrigger } = require('./volume-analyzer');

const STATE_PATH = path.join(__dirname, '../data/baton-state.json');
const HISTORY_PATH = path.join(__dirname, '../data/baton-cadence-history.json');

const CADENCE_SANITY_CEILING = 120;   // au-dela = anomalie (nominal, a reviser en bull market)
const ROLLING_WINDOW_MS = 4 * 60 * 60 * 1000; // moyenne glissante 4h
const MIN_SAMPLES_FOR_AVG = 60;       // ~30 min avant de faire confiance a la moyenne

const EVENT_MULTIPLIER = 2;           // seuil d'evenement (declenche la vigilance)
const PRICE_REACTION_IMMEDIATE = 0.06; // % -- action immediate, 1 seul baton
const PRICE_REACTION_CONFIRMED = 0.03; // % -- action si 2 batons consecutifs meme sens

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

let cadenceHistory = loadHistory();
let prevPrice = null;

// Etat de la chaine -- persiste d'un baton au suivant.
let vigilance = null;
// vigilance = {
//   since: ISO string,          quand l'evenement a declenche la vigilance
//   triggerMultiplier: number,  le multiplicateur de l'evenement declencheur
//   priceAtEvent: number,       prix au moment de l'evenement
//   batonCount: number,         nb de batons ecoules depuis
//   pendingDirection: string,   sens du 1er baton >= 0.03% (attente confirmation)
//   pendingNetMove: number,
// }

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

  // netMove vient du Trigger (deplacement net sur la fenetre de 200 ticks),
  // deja exprime en % -- ex "0.0341%".
  const netMovePct = trig.netMovePct !== null && trig.netMovePct !== undefined
    ? parseFloat(String(trig.netMovePct).replace('%', ''))
    : null;

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

  // ===== CHAINE DE DECISION =============================================

  // 1. EVENEMENT -> entre (ou re-entre) en vigilance.
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
    // 2. VIGILANCE : persiste, on compte les batons ecoules.
    vigilance.batonCount += 1;
  }

  // 3. REACTION DU PRIX -- evaluee seulement si on est en vigilance.
  let action = null; // { type, direction, reason }

  if (vigilance && netMovePct !== null && direction && direction !== 'neutre') {
    const absMove = Math.abs(netMovePct);

    if (absMove >= PRICE_REACTION_IMMEDIATE) {
      // Mouvement franc : pas besoin d'attendre une confirmation.
      action = {
        type: 'immediate',
        direction,
        reason: `netMove=${netMovePct}% >= ${PRICE_REACTION_IMMEDIATE}% (action immediate), vigilance depuis ${vigilance.since} (evenement x${vigilance.triggerMultiplier})`,
      };
    } else if (absMove >= PRICE_REACTION_CONFIRMED) {
      if (vigilance.pendingDirection === direction) {
        // 2e baton consecutif dans le meme sens -> confirme.
        action = {
          type: 'confirmed',
          direction,
          reason: `netMove=${netMovePct}% >= ${PRICE_REACTION_CONFIRMED}% confirme sur 2 batons (${direction}), vigilance depuis ${vigilance.since} (evenement x${vigilance.triggerMultiplier})`,
        };
      } else {
        // 1er baton : on met en attente de confirmation.
        vigilance.pendingDirection = direction;
        vigilance.pendingNetMove = netMovePct;
      }
    } else {
      // Mouvement insuffisant : casse la sequence de confirmation en cours.
      vigilance.pendingDirection = null;
      vigilance.pendingNetMove = null;
    }
  }

  // 4. Une action resout la vigilance (le prix a tranche).
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
    vigilance, // null si aucune vigilance en cours
    action,    // null si rien a faire ce baton
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

console.log('[baton-relay] v2 demarre (chaine evenement/vigilance/prix), ecrit dans', STATE_PATH, 'toutes les 30s.');
