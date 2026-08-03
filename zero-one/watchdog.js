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
  for (const f of files) {
    const full = path.join(CSV_DIR, f);
    try {
      const ageMin = (now - fs.statSync(full).mtimeMs) / 60000;
      if (ageMin > CSV_STALE_MINUTES) stale.push(`${f} (${Math.round(ageMin)} min)`);
    } catch (e) { /* fichier disparu entre le readdir et le stat -- ignore */ }
  }
  if (stale.length) {
    alertOnce('csv-stale', `CSV non mis a jour depuis plus de ${CSV_STALE_MINUTES} min : ${stale.join(', ')}. Collecteur iMac probablement arrete.`);
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
      alertOnce(`pm2-status-${name}`, `Processus ${name} n'est pas en ligne (status: ${status}).`);
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
