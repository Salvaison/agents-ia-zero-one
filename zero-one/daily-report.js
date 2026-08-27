/**
 * daily-report.js — Rapport quotidien du systeme, envoye a 9h par Telegram.
 *
 * Ecrit le 17/08/2026 a la demande de Benjamin. Complementaire du watchdog :
 * celui-ci n'alerte QUE quand quelque chose va mal, et son silence peut
 * signifier deux choses opposees -- tout va bien, ou il ne tourne plus.
 * C'est exactement ce qui s'est produit entre le 3 et le 17 aout : le
 * watchdog s'etait arrete sans etre dans pm2 save, aucune alerte n'est
 * partie malgre des dizaines d'incidents, et personne ne l'a remarque.
 *
 * Un rapport quotidien resout ce probleme : son ABSENCE devient elle-meme
 * un signal.
 *
 * Contenu : collecte par timeframe, trades de la veille avec ventilation
 * par mecanisme de sortie, etat des processus PM2, baton, lignes
 * imaginaires, et fraicheur des donnees.
 *
 * Lance en processus PM2 :
 *   pm2 start daily-report.js --name daily-report
 *
 * Envoi manuel pour tester, sans attendre 9h :
 *   node daily-report.js --now
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const CSV_DIR = '/root/agents-ia-zero-one/data/mcb-live';
const TRADES_PATH = path.join(__dirname, 'data/trade-sim-history.json');
const BATON_PATH = path.join(__dirname, 'data/baton-state.json');
const TRENDLINES_PATH = path.join(__dirname, 'data/trendlines.json');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/* Heure d'envoi, en heure de Paris. */
const REPORT_HOUR = 9;
const REPORT_MINUTE = 0;

const TIMEFRAMES = { '3m': 3, '15m': 15, '1h': 60, '4h': 240 };

function sendTelegram(text) {
  if (!TOKEN || !CHAT_ID) {
    console.error('[daily-report] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant -- rapport non envoye');
    console.log(text);
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
    if (res.statusCode !== 200) console.error(`[daily-report] Echec Telegram, code ${res.statusCode}`);
  });
  req.on('error', (e) => console.error('[daily-report] Erreur Telegram:', e.message));
  req.write(data);
  req.end();
}

/** Completude de la collecte sur 24h, par timeframe. */
function sectionCollecte() {
  const out = [];
  for (const [tf, periodMin] of Object.entries(TIMEFRAMES)) {
    const full = path.join(CSV_DIR, `mcb_${tf}.csv`);
    try {
      const lines = fs.readFileSync(full, 'utf8').trim().split('\n');
      const now = Date.now();
      const ts = [];
      for (let i = 1; i < lines.length; i++) {
        const t = Date.parse(lines[i].split(',')[0]);
        if (isFinite(t) && t > now - 24 * 3600 * 1000) ts.push(t);
      }
      const attendu = Math.floor(1440 / periodMin);
      let manquantes = 0;
      for (let i = 1; i < ts.length; i++) {
        const gap = (ts[i] - ts[i - 1]) / 60000;
        if (gap > periodMin * 1.5) manquantes += Math.round(gap / periodMin) - 1;
      }
      const pct = attendu ? (100 * ts.length / attendu) : 0;
      const ageMin = Math.round((now - fs.statSync(full).mtimeMs) / 60000);
      out.push(`  ${tf.padEnd(4)} ${ts.length}/${attendu} (${pct.toFixed(0)}%)` +
               (manquantes ? `, ${manquantes} manquantes` : '') +
               `, maj il y a ${ageMin} min`);
    } catch (e) {
      out.push(`  ${tf.padEnd(4)} ILLISIBLE (${e.message})`);
    }
  }
  return out.join('\n');
}

/** Trades des dernieres 24h, regroupes par position puis par mecanisme. */
function sectionTrades() {
  let trades;
  try {
    trades = JSON.parse(fs.readFileSync(TRADES_PATH, 'utf8'));
  } catch (e) {
    return '  historique illisible';
  }
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const recents = trades.filter(t => Date.parse(t.exitTimestamp) >= cutoff);
  if (!recents.length) return '  aucun trade sur 24h';

  /* Une position produit une ligne de sortie par tranche : on regroupe pour
   * ne pas compter trois fois le meme trade. */
  const pos = {};
  for (const t of recents) {
    const k = `${t.entryTimestamp}|${t.entryPrice}|${t.direction}|${t.module}`;
    (pos[k] = pos[k] || []).push(t);
  }
  const lignes = [];
  let total = 0, gagnants = 0;
  const parRaison = {};
  for (const exits of Object.values(pos)) {
    exits.sort((a, b) => Date.parse(a.exitTimestamp) - Date.parse(b.exitTimestamp));
    const pnl = exits.reduce((s, e) => s + (e.fraction || 100) / 100 * e.pnlPercent, 0);
    total += pnl;
    if (pnl > 0) gagnants++;
    const raison = String(exits[exits.length - 1].exitReason || '').split(' -- ')[0].slice(0, 30);
    if (!parRaison[raison]) parRaison[raison] = { n: 0, pnl: 0 };
    parRaison[raison].n++;
    parRaison[raison].pnl += pnl;
  }
  const n = Object.keys(pos).length;
  lignes.push(`  ${n} position(s), ${gagnants} gagnante(s) (${Math.round(100 * gagnants / n)}%)`);
  lignes.push(`  PNL cumule ${total >= 0 ? '+' : ''}${total.toFixed(2)}%`);
  for (const [r, v] of Object.entries(parRaison).sort((a, b) => a[1].pnl - b[1].pnl)) {
    lignes.push(`    ${r} : ${v.n}x, ${v.pnl >= 0 ? '+' : ''}${v.pnl.toFixed(2)}%`);
  }
  return lignes.join('\n');
}

function sectionPm2() {
  try {
    const procs = JSON.parse(execSync('pm2 jlist').toString());
    return procs.map(p => {
      const st = p.pm2_env.status;
      /* chrome-watchdog et chrome-recycle tournent en cron : ils s executent
       * puis se terminent. Leur statut normal entre deux passages est stopped. */
      const enCron = (p.name === 'chrome-watchdog' || p.name === 'chrome-recycle');
      const flag = (st === 'online' || enCron) ? '' : '  <<< ANORMAL';
      return `  ${p.name.padEnd(16)} ${st}, ${p.pm2_env.restart_time} redemarrage(s)${flag}`;
    }).join('\n');
  } catch (e) {
    return `  PM2 illisible : ${e.message}`;
  }
}

function sectionBaton() {
  try {
    const s = JSON.parse(fs.readFileSync(BATON_PATH, 'utf8'));
    const ageMin = Math.round((Date.now() - Date.parse(s.timestamp)) / 60000);
    const l = [];
    l.push(`  prix ${s.lastPrice}, maj il y a ${ageMin} min`);
    l.push(`  cadence ${s.cadenceRaw} (x${s.cadenceMultiplier})`);
    l.push(`  regime 15m ${s.waveRegime15 || 'INDETERMINE'}` +
           (s.waveRegime15 ? '' : '  <<< aucune entree autorisee'));
    l.push(`  pivot ${s.wavePivotType || 'aucun'}` +
           (s.wavePivotValue ? ` ${Number(s.wavePivotValue).toFixed(1)}` : ''));
    return l.join('\n');
  } catch (e) {
    return `  baton-state illisible : ${e.message}`;
  }
}

function sectionLignes() {
  try {
    const s = JSON.parse(fs.readFileSync(TRENDLINES_PATH, 'utf8'));
    const ageMin = Math.round((Date.now() - Date.parse(s.timestamp)) / 60000);
    const l = [];
    l.push(`  ${s.pivotCount} pivots, catalogue ${s.lineCount}, ${s.activeCount} allumee(s)`);
    if (s.nearestAbove) l.push(`  au-dessus ${s.nearestAbove.projected} (+${s.nearestAbove.distance})`);
    if (s.nearestBelow) l.push(`  en dessous ${s.nearestBelow.projected} (-${s.nearestBelow.distance})`);
    l.push(`  maj il y a ${ageMin} min` + (ageMin > 10 ? '  <<< demon arrete ?' : ''));
    return l.join('\n');
  } catch (e) {
    return `  trendlines illisible : ${e.message}`;
  }
}

function buildReport() {
  const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  return [
    `ZeroOne — rapport du ${now}`,
    '',
    'COLLECTE (24h)',
    sectionCollecte(),
    '',
    'TRADES (24h)',
    sectionTrades(),
    '',
    'PROCESSUS',
    sectionPm2(),
    '',
    'BATON',
    sectionBaton(),
    '',
    'LIGNES IMAGINAIRES',
    sectionLignes(),
  ].join('\n');
}

/* Declenchement a heure fixe. On verifie chaque minute plutot que de calculer
 * un delai : un VPS qui dort ou un decalage d'horloge ne fait alors rater
 * qu'un rapport, pas tous les suivants. */
let lastSentDay = null;
function tick() {
  const paris = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const jour = paris.toISOString().slice(0, 10);
  if (jour === lastSentDay) return;
  if (paris.getHours() === REPORT_HOUR && paris.getMinutes() >= REPORT_MINUTE) {
    lastSentDay = jour;
    const r = buildReport();
    console.log(r);
    sendTelegram(r);
  }
}

if (require.main === module) {
  if (process.argv.includes('--now')) {
    const r = buildReport();
    console.log(r);
    sendTelegram(r);
    setTimeout(() => process.exit(0), 3000);
  } else {
    console.log(`[daily-report] demarre, envoi quotidien a ${REPORT_HOUR}h00 (Paris)`);
    tick();
    setInterval(tick, 60000);
  }
}

module.exports = { buildReport };
