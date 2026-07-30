/**
 * baton-relay.js — Processus PERMANENT et INDEPENDANT (30/07/2026), separe
 * de cerveau-central.js (qui evalue toutes les 60s). Calcule le "baton de
 * relais" toutes les 30s :
 *   - direction : signe de (prix maintenant - prix il y a 30s, le relevé
 *     precedent)
 *   - cadenceMultiplier : cadence actuelle / MOYENNE GLISSANTE sur 4h
 *     (decision de Benjamin le 30/07/2026 -- remplace la comparaison au
 *     relevé precedent, jugee trop bruitee apres observation)
 *
 * Garde-fou de plausibilite (decision de Benjamin) : cadence > 120 =
 * anomalie -- soit un vrai "sweep" extreme, soit une limite de resolution
 * de l'horodatage MEXC (deals distincts ecrases sur la meme milliseconde,
 * observe : cadence=50000 avec winSec=0.0 le 30/07/2026). Une anomalie
 * n'est PAS ajoutee a la moyenne glissante (ne doit jamais la fausser), et
 * ne produit pas de multiplicateur exploitable -- "fausse alerte", aucune
 * suite, tel que demande par Benjamin.
 *
 * Ecrit son etat dans data/baton-state.json, lu par trade-simulator.js a
 * chaque cycle de 60s. Le baton ne decide rien lui-meme -- il transmet
 * juste ces faits bruts ; les regles d'action (TP1/entree/etc., seuils
 * x2/x3.5/x4) vivent dans trade-simulator.js, pas ici.
 *
 * IMPORTANT : ce process a sa PROPRE connexion websocket a MEXC (via son
 * propre require de price-stream.js/volume-analyzer.js) -- totalement
 * independante de cerveau-central.js au niveau memoire (deux process Node
 * separes, deux buffers de ticks separes, mais le meme flux public MEXC).
 *
 * Gere par PM2 comme process permanent : pm2 start baton-relay.js --name baton-relay
 */
const fs = require('fs');
const path = require('path');
const priceStream = require('./price-stream');
const { analyzeTrigger } = require('./volume-analyzer');

const STATE_PATH = path.join(__dirname, '../data/baton-state.json');
const HISTORY_PATH = path.join(__dirname, '../data/baton-cadence-history.json');

const CADENCE_SANITY_CEILING = 120; // au-dela, anomalie (nominal, a reviser en bull market)
const ROLLING_WINDOW_MS = 4 * 60 * 60 * 1000; // 4h
const MIN_SAMPLES_FOR_AVG = 60; // ~30 min de donnees avant de faire confiance a la moyenne

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

let cadenceHistory = loadHistory(); // [{ts, cadence}, ...] -- persiste entre redemarrages
let prevPrice = null;

function pruneHistory(now) {
  const cutoff = now - ROLLING_WINDOW_MS;
  cadenceHistory = cadenceHistory.filter(h => h.ts >= cutoff);
}

function rollingAverage() {
  if (cadenceHistory.length === 0) return null;
  const sum = cadenceHistory.reduce((a, h) => a + h.cadence, 0);
  return sum / cadenceHistory.length;
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

  pruneHistory(now);

  // Direction : toujours calculee, meme en cas d'anomalie de cadence (le
  // prix lui-meme reste une donnee valide).
  let direction = null;
  if (prevPrice !== null) {
    const diff = currentPrice - prevPrice;
    direction = diff > 0 ? 'haussier' : (diff < 0 ? 'baissier' : 'neutre');
  }
  prevPrice = currentPrice;

  let cadenceMultiplier = null;
  let rollingAvg4h = rollingAverage();

  if (!isAnomaly) {
    // N'ajoute a l'historique QUE les valeurs plausibles -- une anomalie
    // ne doit jamais fausser la moyenne glissante sur 4h.
    cadenceHistory.push({ ts: now, cadence: currentCadence });
    saveHistory(cadenceHistory);
    rollingAvg4h = rollingAverage(); // recalcule apres ajout

    if (cadenceHistory.length >= MIN_SAMPLES_FOR_AVG && rollingAvg4h > 0) {
      cadenceMultiplier = parseFloat((currentCadence / rollingAvg4h).toFixed(2));
    }
  }

  writeState({
    timestamp: new Date(now).toISOString(),
    status: 'ok',
    direction,
    cadenceMultiplier, // null si anomalie OU pas assez de donnees encore
    cadenceRaw: currentCadence,
    rollingAvg4h: rollingAvg4h !== null ? parseFloat(rollingAvg4h.toFixed(2)) : null,
    sampleCount: cadenceHistory.length,
    isAnomaly,
    lastPrice: currentPrice,
  });
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

console.log('[baton-relay] demarre (connexion MEXC independante), ecrit dans', STATE_PATH, 'toutes les 30s.');
