/**
 * watchdog.js (03/08/2026)
 *
 * Surveillance des pannes SILENCIEUSES pendant l'absence de Benjamin
 * (voyage 4-8 aout). Trois defaillances identifiees qui ne generent aucune
 * alerte native :
 *   1. CSV figes -- le collecteur iMac s'arrete, le bot continue de trader
 *      avec un VWAP perime sans que rien ne le signale.
 *   2. Processus PM2 en boucle de crash -- redemarre, recrasse, redemarre.
 *      Le compteur de redemarrages grimpe mais personne ne regarde.
 *   3. Coupe-circuit declenche -- PNL a -25%, le bot est a l'arret et
 *      attend une decision humaine qui ne viendra pas avant le retour.
 *
 * Cycle : 15 minutes. Alerte via Telegram (TELEGRAM_BOT_TOKEN / CHAT_ID
 * dans .env). Anti-spam : chaque type d'alerte n'est renvoye qu'une fois
 * toutes les 2h tant que la condition persiste (sinon un CSV fige pendant
 * 3 jours enverrait ~280 messages).
 *
 * Lance en tant que 4e processus PM2 : pm2 start watchdog.js --name watchdog
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const ALERT_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h -- anti-spam par type d'alerte
const CSV_STALE_MINUTES = 25; // CSV plus vieux que ca = alerte
const CSV_DIR = '/root/agents-ia-zero-one/data/mcb-live';
const CONFIG_PATH = path.join(__dirname, 'config.json');
const STATE_PATH = path.join(__dirname, 'data/trade-sim-state.json');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let lastAlertSentAt = {}; // { type: timestamp } pour l'anti-spam
let lastKnownRestarts = {}; // { processName: restartCount } pour detecter une NOUVELLE boucle de crash

function sendTelegram(text) {
  if (!TOKEN || !CHAT_ID) {
    console.error('[watchdog] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant dans .env -- alerte non envoyee:', text);
    return;
  }
  const data = `chat_id=${encodeURIComponent(CHAT_ID)}&text=${encodeURIComponent(text)}`;
  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data),
    },
  }, (res) => {
    if (res.statusCode !== 200) {
      console.error(`[watchdog] Echec envoi Telegram, code ${res.statusCode}`);
    }
  });
  req.on('error', (err) => console.error('[watchdog] Erreur reseau Telegram:', err.message));
  req.write(data);
  req.end();
}

/* Anti-spam : n'alerte a nouveau qu'apres ALERT_COOLDOWN_MS, par type d'alerte
 * distinct (chaque type de panne a son propre cooldown independant). */
function alertOnce(type, text) {
  const now = Date.now();
  const last = lastAlertSentAt[type];
  if (last && (now - last) < ALERT_COOLDOWN_MS) return;
  lastAlertSentAt[type] = now;
  console.log(`[watchdog] ALERTE (${type}): ${text}`);
  sendTelegram(`⚠️ ZeroOne — ${text}`);
}

/* Timeframes surveilles, avec leur periode en minutes. Tout fichier hors de
 * cette liste est ignore -- mcb_closes.csv et consorts sont obsoletes et
 * declenchaient des alertes permanentes. */
const TIMEFRAMES = { '3m': 3, '15m': 15, '1h': 60, '4h': 240, '1d': 1440, '1w': 10080 };

/* Seuil de fraicheur = deux periodes plus une marge de 10 min. Une bougie qui
 * tarde d'une periode est normale (cloture en cours) ; deux signalent un
 * probleme. */
function staleThresholdMin(tf) {
  return TIMEFRAMES[tf] * 2 + 10;
}

/* Lit les N derniers horodatages d'un CSV, du plus ancien au plus recent. */
function readTimestamps(full, n) {
  const lines = fs.readFileSync(full, 'utf8').trim().split('\n');
  const out = [];
  for (let i = Math.max(1, lines.length - n); i < lines.length; i++) {
    const ts = Date.parse(lines[i].split(',')[0]);
    if (isFinite(ts)) out.push(ts);
  }
  return out;
}

/* Dernier prix de cloture d'un CSV, pour le controle de plausibilite. */
function lastClose(full) {
  const lines = fs.readFileSync(full, 'utf8').trim().split('\n');
  const c = lines[lines.length - 1].split(',');
  const v = parseFloat(c[4]);
  return isFinite(v) ? v : null;
}

function checkCsvFreshness() {
  let files;
  try {
    files = fs.readdirSync(CSV_DIR).filter(f => f.endsWith('.csv'));
  } catch (e) {
    alertOnce('csv-dir', `Dossier CSV illisible (${CSV_DIR}): ${e.message}`);
    return;
  }
  if (!files.length) {
    alertOnce('csv-empty', `Aucun fichier CSV trouve dans ${CSV_DIR}`);
    return;
  }

  const now = Date.now();
  const stale = [];
  const incoherent = [];
  const trous = [];
  const aberrant = [];

  for (const f of files) {
    /* Nomenclature attendue : mcb_<tf>.csv ou mcb_<tf>_live.csv */
    const m = f.match(/^mcb_(3m|15m|1h|4h|1d|1w)(_live)?\.csv$/);
    if (!m) continue;
    const tf = m[1];
    const isLive = !!m[2];
    const periodMin = TIMEFRAMES[tf];
    const full = path.join(CSV_DIR, f);

    /* 1. FRAICHEUR, avec un seuil propre au timeframe. */
    try {
      const ageMin = (now - fs.statSync(full).mtimeMs) / 60000;
      const seuil = isLive ? Math.max(5, periodMin) : staleThresholdMin(tf);
      if (ageMin > seuil) {
        stale.push(`${f} (${Math.round(ageMin)} min, seuil ${seuil})`);
      }
    } catch (e) { continue; }

    if (isLive) continue;   /* le fichier live n'a qu'une ligne : pas de trous a compter */

    /* 2. COHERENCE DE PERIODE. Si l'ecart entre les deux dernieres bougies
     * est INFERIEUR a la periode, le fichier contient des bougies d'un autre
     * timeframe -- c'est arrive deux fois cette semaine apres un changement
     * d'intervalle de l'onglet TradingView. */
    try {
      const ts = readTimestamps(full, 3);
      if (ts.length >= 2) {
        const gapMin = (ts[ts.length - 1] - ts[ts.length - 2]) / 60000;
        if (gapMin > 0 && gapMin < periodMin * 0.9) {
          incoherent.push(`${f} (ecart ${Math.round(gapMin)} min au lieu de ${periodMin})`);
        }
      }
    } catch (e) { /* lecture impossible, la fraicheur l'aura signale */ }

    /* 3. TROUS sur les dernieres 24h. Quelques-uns sont tolerables ; au-dela
     * de 10% des bougies attendues, la collecte est degradee. */
    try {
      const attendu = Math.floor(1440 / periodMin);
      if (attendu >= 4) {
        const ts = readTimestamps(full, attendu + 5);
        const recents = ts.filter(t => t > now - 24 * 3600 * 1000);
        let manquantes = 0;
        for (let i = 1; i < recents.length; i++) {
          const gap = (recents[i] - recents[i - 1]) / 60000;
          if (gap > periodMin * 1.5) manquantes += Math.round(gap / periodMin) - 1;
        }
        if (manquantes > attendu * 0.1) {
          trous.push(`${f} (${manquantes} bougies manquantes sur ${attendu} attendues)`);
        }
      }
    } catch (e) { /* idem */ }

    /* 4. PLAUSIBILITE DU PRIX. Un CSV correctement horodate peut contenir des
     * valeurs aberrantes -- fichier tronque, colonnes decalees. */
    try {
      const px = lastClose(full);
      if (px === null || px < 1000 || px > 500000) {
        aberrant.push(`${f} (dernier close ${px})`);
      }
    } catch (e) { /* idem */ }
  }

  if (stale.length) {
    alertOnce('csv-stale', `CSV perimes : ${stale.join(', ')}. Collecteur iMac probablement arrete.`);
  }
  if (incoherent.length) {
    alertOnce('csv-timeframe', `INCOHERENCE DE TIMEFRAME : ${incoherent.join(', ')}. L'onglet TradingView affiche probablement un autre intervalle -- verifier et nettoyer les lignes polluees.`);
  }
  if (trous.length) {
    alertOnce('csv-trous', `Collecte degradee : ${trous.join(', ')}.`);
  }
  if (aberrant.length) {
    alertOnce('csv-aberrant', `Valeurs aberrantes : ${aberrant.join(', ')}. Fichier tronque ou colonnes decalees ?`);
  }
}

function checkPm2Health() {
  let procs;
  try {
    procs = JSON.parse(execSync('pm2 jlist').toString());
  } catch (e) {
    alertOnce('pm2-unreadable', `Impossible de lire l'etat PM2: ${e.message}`);
    return;
  }
  for (const p of procs) {
    const name = p.name;
    const status = p.pm2_env.status;
    const restarts = p.pm2_env.restart_time;

    if (status !== 'online') {
      if (name !== 'chrome-watchdog') alertOnce(`pm2-status-${name}`, `Processus ${name} n'est pas en ligne (status: ${status}).`);
      continue;
    }

    /* Boucle de crash : le compteur de redemarrages a augmente depuis la
     * derniere verification (15 min) -- un simple redemarrage manuel ne
     * declenche PAS cette alerte, seule une AUGMENTATION recente le fait. */
    const prev = lastKnownRestarts[name];
    if (prev !== undefined && restarts > prev) {
      alertOnce(`pm2-crashloop-${name}`, `Processus ${name} a redemarre ${restarts - prev} fois depuis la derniere verification (total: ${restarts}). Boucle de crash possible.`);
    }
    lastKnownRestarts[name] = restarts;
  }
}

function checkCircuitBreaker() {
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    alertOnce('config-unreadable', `config.json illisible: ${e.message}`);
    return;
  }
  const tripped = cfg && cfg.tradeSimulator && cfg.tradeSimulator.circuitBreakerTripped;
  if (tripped) {
    alertOnce('circuit-breaker', `COUPE-CIRCUIT DECLENCHE — PNL cumule <= -25%. Aucune nouvelle entree tant que circuitBreakerTripped n'est pas remis a false manuellement. Positions ouvertes toujours gerees normalement.`);
  }
}

function runChecks() {
  console.log(`[watchdog] Verification a ${new Date().toISOString()}`);
  checkCsvFreshness();
  checkPm2Health();
  checkCircuitBreaker();
}

/* Message de demarrage -- confirme immediatement que la chaine fonctionne,
 * sans attendre le premier cycle de 15 min. */
sendTelegram('✅ ZeroOne watchdog demarre. Verification toutes les 15 min : CSV, processus PM2, coupe-circuit.');
runChecks();
setInterval(runChecks, CHECK_INTERVAL_MS);
