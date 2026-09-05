/**
 * config-server.js -- Interface unique de pilotage du Bot Trading Boono.
 *
 * v3 -- 22/07/2026. Navigation a plat, 5 onglets, suite a la maquette
 * revisee de Benjamin (NIVEAUX / SCENARIO / DIAGNOSTIC / TRADES / PARAMETRES).
 * Plus de niveau de navigation imbrique -- chaque onglet est une section
 * de plein droit, y compris sur mobile (l'onglet principal fait office de
 * bascule, plus besoin d'un second niveau de tabs pour Niveaux/Scenario).
 *
 *   NIVEAUX     : composeurs S/R (points/fib/range) + la liste des niveaux
 *                 soumis directement en dessous (plus de sous-onglet separe)
 *   SCENARIO    : composeur de scenario + la liste des scenarios enregistres
 *                 directement en dessous
 *   DIAGNOSTIC  : rapport complet de cerveau-central.js, lu depuis
 *                 data/latest-evaluation.json (pas de websocket duplique)
 *   TRADES      : Ongoing / Executed / PNL en sous-onglets (ceux-la restent
 *                 groupes, un seul sujet -- "mes trades" -- avec 3 vues)
 *   PARAMETRES  : editeur de config.json
 *
 * Jetons reactifs (idee de Benjamin) : les tokens de niveaux portent la
 * classe .token[data-insert] et sont prets a recevoir une classe
 * "live-match" quand leur niveau est effectivement touche par le prix en
 * direct. Le hook CSS existe (voir .token.live-match plus bas) mais n'est
 * pas encore branche a un flux de prix reel -- ca demande la connexion
 * price-stream.js une fois deploye sur le VPS, pas disponible dans cette
 * maquette hors ligne.
 *
 * PREREQUIS avant deploiement :
 *   1. Patch de cerveau-central.js pour qu'il ecrive
 *      data/latest-evaluation.json a chaque tick().
 *   2. Verifier que zero-one/data/ existe et est inscriptible.
 *   3. Brancher un flux de prix reel pour activer les jetons reactifs
 *      (piste future, non implementee ici).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const PORT = process.env.CONFIG_UI_PORT || 80;
const PASSWORD = process.env.CONFIG_UI_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const CONFIG_PATH = path.join(__dirname, '../config.json');
const DIAGNOSTIC_PATH = path.join(__dirname, '../data/latest-evaluation.json');
const TRADES_STATE_PATH = path.join(__dirname, '../data/trade-sim-state.json');
const TRADES_HISTORY_PATH = path.join(__dirname, '../data/trade-sim-history.json');
/* Moteur Boono (19/08/2026) -- seconde logique, fichiers separes. */
const BOONO_STATE_PATH = path.join(__dirname, '../data/moteur-boono-state.json');
const BOONO_HISTORY_PATH = path.join(__dirname, '../data/moteur-boono-history.json');
const AUDIT_HISTORY_PATH = path.join(__dirname, '../data/audit-history.json');

if (!PASSWORD || !SESSION_SECRET) {
  console.error('[config-server] FATAL: CONFIG_UI_PASSWORD ou SESSION_SECRET manquant dans .env');
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 3600 * 1000 },
}));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  next();
});

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  return res.redirect('/login');
}

// ── Page de connexion ─────────────────────────────────────────────────────────
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Connexion</title>
    <style>
      body { font-family: -apple-system, sans-serif; background: #0d0d0f; color: #e8e8ea; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      form { background: #1a1a1d; padding: 32px; border-radius: 12px; width: 280px; }
      input { width: 100%; padding: 10px; margin: 8px 0; border-radius: 6px; border: 1px solid #333; background: #0d0d0f; color: #e8e8ea; box-sizing: border-box; }
      button { width: 100%; padding: 10px; border-radius: 6px; border: none; background: #4a7fff; color: white; font-weight: 600; cursor: pointer; }
      .err { color: #ff5c5c; font-size: 0.85em; }
    </style>
    </head>
    <body>
      <form method="POST" action="/login">
        <h3>Bot Trading Boono</h3>
        <input type="password" name="password" placeholder="Mot de passe" autofocus required>
        <button type="submit">Entrer</button>
        ${req.query.err ? '<p class="err">Mot de passe incorrect</p>' : ''}
      </form>
    </body>
    </html>
  `);
});

app.post('/login', express.urlencoded({ extended: false }), (req, res) => {
  if (req.body.password === PASSWORD) {
    req.session.authenticated = true;
    return res.redirect('/');
  }
  return res.redirect('/login?err=1');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ── API config ────────────────────────────────────────────────────────────────
app.get('/api/config', requireAuth, (req, res) => {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/config', requireAuth, (req, res) => {
  try {
    const incoming = req.body;
    JSON.stringify(incoming);
    incoming._lastUpdated = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(incoming, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── API niveaux (persistance NIVEAUX/fib/range) ─────────────────────────────────
const LEVELS_PATH = path.join(__dirname, '../data/levels.json');
app.get('/api/levels', requireAuth, (req, res) => {
  try {
    if (!fs.existsSync(LEVELS_PATH)) return res.json([]);
    const data = fs.readFileSync(LEVELS_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/levels', requireAuth, (req, res) => {
  try {
    const incoming = req.body;
    JSON.stringify(incoming);
    fs.writeFileSync(LEVELS_PATH, JSON.stringify(incoming, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
// ── API scenarios (persistance des scenarios enregistres) ───────────────────────
const SCENARIOS_PATH = path.join(__dirname, '../data/scenarios.json');
app.get('/api/scenarios', requireAuth, (req, res) => {
  try {
    if (!fs.existsSync(SCENARIOS_PATH)) return res.json([]);
    const data = fs.readFileSync(SCENARIOS_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/scenarios', requireAuth, (req, res) => {
  try {
    const incoming = req.body;
    JSON.stringify(incoming);
    fs.writeFileSync(SCENARIOS_PATH, JSON.stringify(incoming, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
// ── API chat consultatif (DeepSeek) ─────────────────────────────────────────────
function addVwapColumn(lines) {
  return lines.map(line => {
    const cols = line.split(',');
    const lbw = parseFloat(cols[5]);
    const bw = parseFloat(cols[6]);
    const vwap = (Number.isFinite(lbw) && Number.isFinite(bw)) ? (lbw - bw).toFixed(2) : '';
    return line + ',' + vwap;
  });
}

function readLastCandles(timeframe, n) {
  const filePath = path.join(__dirname, '../../data/mcb-live/mcb_' + timeframe + '.csv');
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  return addVwapColumn(lines.slice(1).slice(-n));
}
function readCandlesInRange(timeframe, debut, fin) {
  const filePath = path.join(__dirname, '../../data/mcb-live/mcb_' + timeframe + '.csv');
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  return addVwapColumn(lines.slice(1).filter(line => {
    const ts = line.split(',')[0];
    return ts >= debut && ts <= fin;
  }).slice(0, 300));
}
const chatTools = [{
  type: 'function',
  function: {
    name: 'lire_bougies',
    description: 'Lit les bougies MCB pour une plage de dates precise sur un timeframe donne. A utiliser pour analyser un evenement passe hors de la fenetre de contexte fournie par defaut (100 dernieres bougies).',
    parameters: {
      type: 'object',
      properties: {
        timeframe: { type: 'string', enum: ['3m', '15m', '1h', '4h', '1d', '1w'], description: 'Le timeframe a consulter' },
        debut: { type: 'string', description: 'Date/heure de debut, format ISO 8601 UTC, ex: 2026-07-24T08:30:00' },
        fin: { type: 'string', description: 'Date/heure de fin, format ISO 8601 UTC, ex: 2026-07-24T18:30:00' },
      },
      required: ['timeframe', 'debut', 'fin'],
    },
  },
}];

app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'message manquant' });
    }
    let diagnostic = null;
    const diagPath = path.join(__dirname, '../data/latest-evaluation.json');
    if (fs.existsSync(diagPath)) diagnostic = JSON.parse(fs.readFileSync(diagPath, 'utf8'));

    const candles15m = readLastCandles('15m', 100);
    const candles4h = readLastCandles('4h', 100);

    const contextBlock = 'Diagnostic actuel (JSON):\n' + JSON.stringify(diagnostic, null, 2) +
      '\n\n100 dernieres bougies 15m (timestamp,open,high,low,close,lt_blue_wave,blue_wave,money_flow,buy,sell,dbsi_top,dbsi_bottom,ma200,vwap):\n' +
      candles15m.join('\n') +
      '\n\n100 dernieres bougies 4h (timestamp,open,high,low,close,lt_blue_wave,blue_wave,money_flow,buy,sell,dbsi_top,dbsi_bottom,ma200,vwap):\n' +
      candles4h.join('\n');

    const systemPrompt = 'Tu es un assistant consultatif pour un bot de trading BTC/USDT. ' +
      'Tu analyses et discutes les conditions de marche avec l\'utilisateur a partir des donnees fournies. ' +
      'Tu ne dois JAMAIS suggerer d\'executer un ordre reel ni pretendre en avoir passe un -- tu es purement consultatif. ' +
      'Si l\'utilisateur demande un evenement passe hors de la fenetre fournie, utilise l\'outil lire_bougies. ' +
      'IMPORTANT sur les fuseaux horaires : les CSV sont en UTC. Si l\'utilisateur donne une heure francaise ' +
      '(heure d\'ete, UTC+2 actuellement), CONVERTIS en UTC (soustrais 2h) avant d\'appeler l\'outil. ' +
      'IMPORTANT sur le VWAP : la derniere colonne de chaque ligne de bougie, nommee "vwap" dans l\'en-tete, ' +
      'est DEJA CALCULEE pour toi (lt_blue_wave moins blue_wave). Pour toute question sur le VWAP, LIS cette ' +
      'valeur directement dans les donnees fournies -- ne la recalcule JAMAIS toi-meme et ne l\'estime jamais ' +
      'depuis lt_blue_wave/blue_wave. Si la colonne semble absente ou vide pour une bougie donnee, dis-le ' +
      'explicitement plutot que d\'inventer une valeur. ' +
      'IMPORTANT sur le prix de reference : quand tu cites "le prix" a un instant donne, precise TOUJOURS ' +
      'si c\'est le CLOSE (cloture) ou un extreme intra-bougie (HIGH/LOW) -- ne confonds jamais les deux ' +
      '(par exemple ne presente jamais un LOW comme si c\'etait le prix de cloture). Le VWAP et les scores ' +
      'Momentum/MoneyFlow/DBSI sont calcules sur la cloture. Le S/R (touche/retest) et la divergence sont ' +
      'calcules en mode meche depuis le 28/07/2026 (high/low, pas la cloture) -- si on te demande le statut ' +
      'S/R ou une divergence, ne donne jamais le close comme reference. ' +
      'Reponds en francais, de maniere concise.';

    const messages = [
      { role: 'system', content: systemPrompt + '\n\n' + contextBlock },
      { role: 'user', content: userMessage },
    ];

    async function callDeepSeek(msgs, withTools) {
      const body = { model: 'deepseek-v4-flash', messages: msgs };
      if (withTools) { body.tools = chatTools; body.tool_choice = 'auto'; }
      const r = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ? d.error.message : ('HTTP ' + r.status));
      return d;
    }

    let data = await callDeepSeek(messages, true);
    let message = data.choices && data.choices[0] && data.choices[0].message;

    if (message && message.tool_calls && message.tool_calls.length > 0) {
      messages.push({ role: 'assistant', content: message.content || null, tool_calls: message.tool_calls });
      for (const tc of message.tool_calls) {
        let result = [];
        try {
          const args = JSON.parse(tc.function.arguments);
          result = readCandlesInRange(args.timeframe, args.debut, args.fin);
        } catch (e) { result = ['erreur lecture: ' + e.message]; }
        messages.push({ role: 'tool', tool_call_id: tc.id, content: result.join('\n') || 'aucune bougie trouvee sur cette plage' });
      }
      data = await callDeepSeek(messages, false);
      message = data.choices && data.choices[0] && data.choices[0].message;
    }

    const reply = message ? (message.content || 'Reponse vide.') : 'Reponse vide.';
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// ── API diagnostic ────────────────────────────────────────────────────────────
app.get('/api/diagnostic', requireAuth, (req, res) => {
  try {
    const data = fs.readFileSync(DIAGNOSTIC_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(404).json({
      error: 'diagnostic indisponible',
      detail: e.code === 'ENOENT'
        ? 'data/latest-evaluation.json introuvable -- le patch de cerveau-central.js a-t-il ete deploye ?'
        : e.message,
    });
  }
});

app.get('/api/trades', requireAuth, (req, res) => {
  let ongoing = { scalp: null, day: null, swing: null };
  let executed = [];
  try {
    if (fs.existsSync(TRADES_STATE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(TRADES_STATE_PATH, 'utf8'));
      ongoing = { scalp: parsed.scalp || null, day: parsed.day || null, swing: parsed.swing || null };
    }
  } catch (e) { /* garde les valeurs par defaut */ }
  try {
    if (fs.existsSync(TRADES_HISTORY_PATH)) {
      const data = JSON.parse(fs.readFileSync(TRADES_HISTORY_PATH, 'utf8'));
      executed = Array.isArray(data) ? data : [];
    }
  } catch (e) { /* liste vide */ }
  res.json({ ongoing, executed });
});
/* Moteur Boono (19/08/2026) -- seconde logique, fichiers separes.
 * Meme protection que les autres routes : requireAuth. */
app.get('/api/boono', requireAuth, (req, res) => {
  let position = null;
  let history = [];
  let abstention = null;
  try {
    if (fs.existsSync(BOONO_STATE_PATH)) {
      const s = JSON.parse(fs.readFileSync(BOONO_STATE_PATH, 'utf8'));
      position = s.position || null;
      abstention = s.derniereAbstention || null;
    }
  } catch (e) { /* garde les valeurs par defaut */ }
  try {
    if (fs.existsSync(BOONO_HISTORY_PATH)) {
      const h = JSON.parse(fs.readFileSync(BOONO_HISTORY_PATH, 'utf8'));
      history = Array.isArray(h) ? h : [];
    }
  } catch (e) { /* le moteur n'a peut-etre encore rien produit */ }
  res.json({ position, history, abstention });
});

app.get('/api/audit-history', requireAuth, (req, res) => {
  let history = [];
  try {
    if (fs.existsSync(AUDIT_HISTORY_PATH)) {
      const data = JSON.parse(fs.readFileSync(AUDIT_HISTORY_PATH, 'utf8'));
      history = Array.isArray(data) ? data : [];
    }
  } catch (e) { /* liste vide */ }
  res.json({ history });
});

// ── Page AUDIT independante (31/07/2026) ───────────────────────────────────────
// Fond noir, hors de la coquille de l'app -- ouverte dans un nouvel onglet.
app.get('/audit-view', requireAuth, (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Audit BOONOTRADE</title>
<style>
  :root {
    --bg: #0f1419;
    --panel: #1a2230;
    --border: #3a4557;
    --text: #d8e0ea;
    --muted: #7d8ba0;
    --accent: #4a9eff;
    --up: #26a69a;
    --down: #ef5350;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 16px;
    background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 13px;
  }
  h1 { font-size: 16px; font-weight: 600; margin: 0 0 4px; }
  .sub { color: var(--muted); font-size: 12px; margin-bottom: 14px; }
  .controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; font-size: 11px; color: var(--muted); }
  .controls input { width: 46px; background: var(--panel); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 3px 5px; }
  .controls button { background: var(--accent); color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; }
  .stats { color: var(--muted); font-size: 12px; margin-bottom: 10px; }
  .stats b { color: var(--text); }
  table { width: 100%; border-collapse: collapse; font-family: "SF Mono", Menlo, monospace; font-size: 12px; }
  th, td { text-align: right; padding: 5px 4px; border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); white-space: nowrap; }
  /* Infobulle au survol des en-tetes : les libelles sont abreges pour tenir
     en largeur, l'explication complete reste accessible via l'attribut title. */
  th[title] { cursor: help; border-bottom: 1px dotted var(--muted); }
  th:first-child, td:first-child { text-align: left; }
  th:last-child, td:last-child { border-right: none; }
  th { color: var(--muted); font-weight: 500; position: sticky; top: 0; background: var(--bg); }
  .up { color: var(--up); }
  .down { color: var(--down); }
  tr.reversal { background: #2a1f3d; }
  tr.trade { background: #0e2a1e; }
  tr.bypass { background: #2a1a0d; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
  .badge.trade { background: #2ecc71; color: #04170e; }
  .badge.bypass { background: #ff6b35; color: #2a1000; }
  .pivot { display: inline-block; width: 9px; height: 9px; border-radius: 2px; }
  .pivot.high { background: #26a69a; }
  .pivot.low { background: #ef5350; }
  .empty { color: var(--muted); padding: 30px; text-align: center; }
</style>
</head>
<body>
  <div style="display:flex; align-items:baseline; gap:22px; margin-bottom:2px;">
    <h1 style="margin:0; white-space:nowrap; width:395px; flex:none;">Audit BOONOTRADE</h1>
    <div class="sub" style="margin:0; flex:1;">Historique glissant 24h, mis a jour toutes les 30s. Heure affichee : Europe / Paris.
      &nbsp;&nbsp;<button onclick="loadAudit()" style="padding:3px 10px; border:1px solid #5a6b85; background:#1a2332; color:#8fa3bf; cursor:pointer; border-radius:3px; font-size:11px;">Rafraichir</button></div>
  </div>
  <div class="stats" id="stats" style="font-size:11px; opacity:0.75; margin:0 0 8px 0;"></div>
  <div style="display:none;">
    <input type="number" id="rDelta" value="3"><input type="number" id="rProx" value="2">
    <input type="number" id="cCad" value="1.6"><input type="number" id="cNet" value="2.5">
    <input type="number" id="bCad" value="5.8"><input type="number" id="bNet" value="10">
  </div>
  <div id="tabs" style="margin:8px 0 10px 0;">
    <button id="tab-vague" onclick="switchTab('vague')"
      style="padding:5px 14px; margin-right:6px; border:1px solid #5a6b85; background:#2c3e50; color:#e8eef5; cursor:pointer; border-radius:3px; font-size:12px;">VAGUE</button>
    <button id="tab-mouvement" onclick="switchTab('mouvement')"
      style="padding:5px 14px; margin-right:6px; border:1px solid #5a6b85; background:#1a2332; color:#8fa3bf; cursor:pointer; border-radius:3px; font-size:12px;">MOUVEMENT</button>
    <button id="tab-composite" onclick="switchTab('composite')"
      style="padding:5px 14px; margin-right:6px; border:1px solid #5a6b85; background:#1a2332; color:#8fa3bf; cursor:pointer; border-radius:3px; font-size:12px;">COMPOSITE</button>
    <button id="tab-engagement" onclick="switchTab('engagement')"
      style="padding:5px 14px; border:1px solid #5a6b85; background:#1a2332; color:#8fa3bf; cursor:pointer; border-radius:3px; font-size:12px;">ENGAGEMENT</button>
    <span style="margin-left:12px; font-size:11px; opacity:0.6;">VAGUE : ce que dit MarketCipher &nbsp;|&nbsp; MOUVEMENT : ce que le prix a fait &nbsp;|&nbsp; ENGAGEMENT : qui pousse et avec quelle constance</span>
  </div>
  <div id="wrap"><div class="empty">Chargement des donnees</div></div>

<script>
function fmt(v, d) {
  if (v === undefined || v === null || isNaN(v)) return String.fromCharCode(8212);
  return v.toFixed(d);
}
function cls(v) {
  if (v === undefined || v === null || isNaN(v)) return '';
  return v > 0 ? 'up' : (v < 0 ? 'down' : '');
}
function arrow(d) {
  if (d === 'haussier') return '<span class="up">&#9650;</span>';
  if (d === 'baissier') return '<span class="down">&#9660;</span>';
  if (d === 'neutre') return '0';
  return String.fromCharCode(8212);
}
function timeParis(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
/* Onglet actif -- conserve entre deux rafraichissements automatiques, sinon
 * la vue reviendrait a INTENTION toutes les 30 secondes. */
var _activeTab = 'vague';
function switchTab(t) {
  _activeTab = t;
  var on = 'padding:5px 14px; border:1px solid #5a6b85; background:#2c3e50; color:#e8eef5; cursor:pointer; border-radius:3px; font-size:12px;';
  var off = 'padding:5px 14px; border:1px solid #5a6b85; background:#1a2332; color:#8fa3bf; cursor:pointer; border-radius:3px; font-size:12px;';
  document.getElementById('tab-vague').style.cssText = (t === 'vague' ? on : off) + 'margin-right:6px;';
  document.getElementById('tab-mouvement').style.cssText = (t === 'mouvement' ? on : off) + 'margin-right:6px;';
  document.getElementById('tab-composite').style.cssText = (t === 'composite' ? on : off) + 'margin-right:6px;';
  document.getElementById('tab-engagement').style.cssText = (t === 'engagement' ? on : off);
  loadAudit();
}

async function loadAudit() {
  const wrap = document.getElementById('wrap');
  const statsEl = document.getElementById('stats');
  /* Valeurs de repli alignees sur les percentiles OKX (16/08/2026) -- elles
   * doivent correspondre aux valeurs par defaut des champs, sinon un champ
   * vide reintroduit silencieusement les anciens seuils Bybit. */
  const rDelta = parseFloat(document.getElementById('rDelta').value) || 3;
  const rProx = parseFloat(document.getElementById('rProx').value) || 2;
  const cCad = parseFloat(document.getElementById('cCad').value) || 1.6;
  const cNet = parseFloat(document.getElementById('cNet').value) || 2.5;
  const bCad = parseFloat(document.getElementById('bCad').value) || 5.8;
  const bNet = parseFloat(document.getElementById('bNet').value) || 10;

  try {
    const res = await fetch('/api/audit-history');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const rows = data.history || [];
    if (rows.length === 0) {
      wrap.innerHTML = '<div class="empty">Aucune donnee pour le moment.</div>';
      statsEl.innerHTML = '';
      return;
    }

    const BASE_WINDOW = 10;
    let prevVwap3 = null;
    let prevVwap15 = null;
    let vigActive = false, vigCounter = 0;
    const VIG_WINDOW = 6;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      r.deltaVwap3 = (prevVwap3 !== null && r.vwap3 !== null) ? (r.vwap3 - prevVwap3) : null;
      if (r.vwap3 !== null) prevVwap3 = r.vwap3;
      r.deltaVwap15 = (prevVwap15 !== null && r.vwap15 !== null) ? (r.vwap15 - prevVwap15) : null;
      if (r.vwap15 !== null) prevVwap15 = r.vwap15;

      const start = Math.max(0, i - BASE_WINDOW);
      const prior = rows.slice(start, i).filter(function(p) { return p.netMove !== null && p.netMove !== undefined; });
      const baseline = prior.length > 0 ? prior.reduce(function(a, p) { return a + Math.abs(p.netMove); }, 0) / prior.length : null;
      r.netMoveMult = (baseline !== null && baseline > 0 && r.netMove !== null) ? Math.abs(r.netMove) / baseline : null;
      /* Multiplicateur d'amplitude (17/08/2026), meme principe que netMoveMult :
       * rapport a la moyenne des releves precedents de la meme fenetre. */
      const priorA = rows.slice(start, i).filter(function(p) { return p.amplitude !== null && p.amplitude !== undefined; });
      const baseA = priorA.length > 0 ? priorA.reduce(function(a, p) { return a + Math.abs(p.amplitude); }, 0) / priorA.length : null;
      r.amplitudeMult = (baseA !== null && baseA > 0 && r.amplitude !== null) ? Math.abs(r.amplitude) / baseA : null;

      r.isReversal = (r.deltaVwap3 !== null && Math.abs(r.deltaVwap3) >= rDelta) && (r.vwap3 !== null && Math.abs(r.vwap3) <= rProx);
      r.isConfirm = (r.cadenceMult !== null && r.cadenceMult >= cCad) || (r.netMoveMult !== null && r.netMoveMult >= cNet);
      r.isBypass = (r.cadenceMult !== null && r.cadenceMult >= bCad) || (r.netMoveMult !== null && r.netMoveMult >= bNet);

      r.isTrade = false;
      if (r.isReversal) { vigActive = true; vigCounter = 0; }
      else if (vigActive) { vigCounter++; if (vigCounter > VIG_WINDOW) vigActive = false; }
      if (vigActive && r.isConfirm) { r.isTrade = true; vigActive = false; }

      r.pivot = null;
    }

    let lastSign = null, lastIdx = null;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.deltaVwap3 === null || r.deltaVwap3 === 0) continue;
      const sign = r.deltaVwap3 > 0 ? 1 : -1;
      if (lastSign !== null && sign !== lastSign && lastIdx !== null) {
        rows[lastIdx].pivot = (lastSign > 0) ? 'high' : 'low';
      }
      lastSign = sign;
      lastIdx = i;
    }

    let reversals = 0, trades = 0, bypasses = 0, crosses = 0;
    for (const r of rows) {
      if (r.isReversal) reversals++;
      if (r.isTrade) trades++;
      if (r.isBypass) bypasses++;
      if (r.vwap15Cross || r.vwap3Cross) crosses++;
    }
    statsEl.innerHTML = rows.length + ' releves (24h glissantes) - ' + crosses + ' passages a zero - ' + reversals + ' retournements imminents - <b style="color:#2ecc71">' + trades + ' TRADE</b> - <b style="color:#ff6b35">' + bypasses + ' BYPASS</b>';

    // Fleche de direction de la pente VWAP (10/08/2026) -- montant / plat /
    // descendant par rapport a l'horizontale du zero MCB.
    // Pivot de vague MCB -- affiche UNIQUEMENT a son apparition (11/08/2026),
    // au lieu d'etre repete sur toutes les lignes suivantes. On voit ainsi le
    // moment exact du point, comme pour les badges.
    let _lastPivKey = null;
    function mcbPivotCell(r) {
      if (!r.wavePivotType) { _lastPivKey = null; return ''; }
      const key = r.wavePivotType + ':' + r.wavePivotValue;
      if (key === _lastPivKey) return '';
      _lastPivKey = key;
      const v = (r.wavePivotValue !== null && r.wavePivotValue !== undefined)
        ? Math.round(r.wavePivotValue) : '';
      const col = r.wavePivotType === 'creux' ? '#2ecc71' : '#e74c3c';
      return '<span style="color:' + col + '; font-size:10px; font-weight:600;">' + v + '</span>';
    }

    /* Signal MCB 15m (20/08/2026). Meme rendu que Sig3, sur waveRegime15 --
     * soit analyzeWavePivot('15m'), la source de la colonne Rg et du
     * marqueur E15. Affiche uniquement au releve ou la valeur change.
     * Lu cote a cote avec Sig3, il rend visible la LOI 4 : deux signaux
     * rapproches designant le meme extreme donnent 83% de justesse, contre
     * 42% quand un seul est present. */
    let _lastSig15 = null;
    function mcb15Cell(r) {
      if (!r.waveRegime15) { _lastSig15 = null; return ''; }
      const key = r.waveRegime15 + ':' + r.waveRegime15Value;
      if (key === _lastSig15) return '';
      _lastSig15 = key;
      const v = (r.waveRegime15Value !== null && r.waveRegime15Value !== undefined)
        ? Math.round(r.waveRegime15Value) : '';
      /* haussier vient d'un creux, baissier d'un pic -- meme convention de
       * couleur que le 3m. */
      const col = r.waveRegime15 === 'haussier' ? '#2ecc71' : '#e74c3c';
      return '<span style="color:' + col + '; font-size:10px; font-weight:600;">' + v + '</span>';
    }

    // Regime directionnel de la vague MCB 15m -- LE filtre qui decide quelles
    // entrees sont autorisees depuis le 11/08. Affiche a chaque changement.
    let _lastRegKey = null;
    function regimeCell(r) {
      if (!r.waveRegime15) return '';
      const isNew = r.waveRegime15 !== _lastRegKey;
      _lastRegKey = r.waveRegime15;
      const up = r.waveRegime15 === 'haussier';
      const col = up ? '#2ecc71' : '#e74c3c';
      const ar = up ? '&#9650;' : '&#9660;';
      const w = isNew ? 'font-weight:700;' : 'opacity:0.45;';
      return '<span style="color:' + col + ';' + w + '">' + ar + '</span>';
    }

    /* Colonne Signal refondue (11/08/2026) -- deux natures d'information :
     *   - EVENEMENTS DU BATON (ce qui motive), en discret, calcules avec les
     *     VRAIS seuils du baton et non avec les curseurs de la page.
     *   - TRADES REELS (ce qui en resulte), en badges colores pleins.
     * Remplace les anciens badges TRADE/BYPASS/LONG/SHORT, qui etaient une
     * simulation parallele sans rapport avec les decisions reelles. */
    function buildSignal(r, d5) {
      let out = '';
      const marks = [];
      if (r.cadenceMult !== null && r.cadenceMult !== undefined && r.cadenceMult >= 2) {
        marks.push('EVT x' + r.cadenceMult.toFixed(1));
      }
      if (d5 !== null && Math.abs(d5) >= 0.20) marks.push('DEPL');
      if (r.netMove !== null && r.netMove !== undefined && Math.abs(r.netMove) >= 0.06) {
        marks.push(r.netMove > 0 ? 'NM+' : 'NM-');
      }
      if (marks.length) {
        out += '<span style="color:#8fa3bf; font-size:9px; margin-right:6px;">' + marks.join(' ') + '</span> ';
      }
      const ev = tradeEvents[Math.floor(r.ts / 30000)];
      if (ev) {
        out += ev.map(function(e) {
          /* Les marqueurs du moteur portent un encadre pointille (05/09/2026),
           * ceux du simulateur restent pleins. */
          const bord = e.dashed ? ' border:1px dashed #8fa3bf;' : '';
          return '<span title="' + String(e.title || '').replace(/"/g, '&quot;') +
                 '" style="background:' + e.bg +
                 '; color:#fff; padding:1px 5px; border-radius:3px; font-size:9px; ' +
                 'font-weight:600; margin-right:2px;' + bord + '">' + e.label + '</span>';
        }).join('');
      }
      return out;
    }

    /* Cellule PRIX avec carre de pivot (14/08/2026) : le carre marque
     * l'extreme de prix qui a PRECEDE le point MCB, pas la confirmation
     * elle-meme. L'infobulle donne le decalage reel en minutes, pour
     * verifier sur donnees reelles la fourchette "3 a 5 bougies". */
    /* DBSI du 15m (20/08/2026). Meme rendu que la version 3m, sur les champs
     * live15DbsiTop / live15DbsiBottom que le baton exposait deja. */
    function dbsi15Cell(r) {
      const t = r.live15DbsiTop, b = r.live15DbsiBottom;
      if (t === null || t === undefined || b === null || b === undefined) return '';
      return '<span class="down">' + Math.round(t) + '</span>' +
             '<span style="opacity:0.4;"> / </span>' +
             '<span class="up">' + Math.round(b) + '</span>';
    }
    /* Pente du BW15 sur cinq minutes (04/09/2026). Le champ mf15Pente existe
 * deja cote baton pour le MoneyFlow ; le BW se calcule ici, a l affichage.
 * Sous 0.5 la vague est jugee plate -- c est la mediane des variations
 * mesurees sur 24h. */
    /* Pente d'un champ sur cinq minutes, pour colorer les vagues du panneau
     * composite. Sous 0.5 la vague est jugee plate. */
    function pente10(i, arr, champ) {
      if (i < 10) return null;
      const v1 = arr[i] && arr[i][champ], v0 = arr[i-10] && arr[i-10][champ];
      if (v1 === null || v1 === undefined || v0 === null || v0 === undefined) return null;
      const d = v1 - v0;
      return Math.abs(d) < 0.5 ? 0 : d;
    }
    /* Position d'un LBW par rapport a son BW : vert au-dessus, rouge en
     * dessous. Rend le croisement visible d'un coup d'oeil. */
    function rel(lbw, bw) {
      if (lbw === null || lbw === undefined || bw === null || bw === undefined) return '';
      return lbw > bw ? 'up' : 'down';
    }
    function bwPente(r, i, arr) {
  if (i < 10) return null;
  const v1 = r.live15Bw, v0 = arr[i-10] && arr[i-10].live15Bw;
  if (v1 === null || v1 === undefined || v0 === null || v0 === undefined) return null;
  const d = v1 - v0;
  return Math.abs(d) < 0.5 ? 0 : d;
}
function priceCell(r) {
      return (r.lastPrice !== null && r.lastPrice !== undefined) ? Math.round(r.lastPrice) : '';
    }
    /* Ecart entre le VWAP live et le VWAP confirme (19/08/2026). Il mesure de
     * combien le live decroche -- donc dans quel sens le confirme va rattraper,
     * et le prix avec lui. Sur le 15m c'est le meilleur indicateur directionnel
     * mesure a ce jour ; sur le 3m il ne vaut rien. */
    function ecartVw(live, confirme) {
      if (live === null || live === undefined) return null;
      if (confirme === null || confirme === undefined) return null;
      return live - confirme;
    }
    /* Cellule d'extreme de prix (17/08/2026). CONVENTION : vert = plus HAUT,
     * rouge = plus BAS -- convention historique du projet, distincte de celle
     * du signal MCB (ou vert = creux annoncant une hausse).
     * Le 15m utilise rouge/vert francs, le 3m rose/vert clair pour rester
     * lisible sans ecraser le 15m. */
    function extCell(r, field, colHaut, colBas) {
      const t = r[field];
      if (!t) return '';
      const val = r[field + 'Val'];
      const lag = ((r[field + 'Lag'] || 0) * 30 / 60).toFixed(1);
      const col = (t === 'HAUT') ? colHaut : colBas;
      const tip = (t === 'HAUT' ? 'Plus haut ' : 'Plus bas ') +
                  (val !== null && val !== undefined ? Math.round(val) : '') +
                  ' -- signal confirme ' + lag + ' min plus tard';
      return '<span title="' + tip + '" style="display:inline-block; width:7px; height:7px; ' +
             'background:' + col + '; vertical-align:middle;"></span>';
    }

    /* Cellule conviction / coherence (16/08/2026) : valeur de 0 a 1, coloree
     * par palier. Au-dela de 0.75 le flux (ou le prix) va dans le meme sens
     * sur au moins 6 tranches sur 8 -- c'est la que la mesure devient
     * interessante. En dessous de 0.5, les tranches se contredisent. */
    function convCell(v) {
      /* parseFloat obligatoire : analyzeTrigger() renvoie certains champs
       * en CHAINE (il utilise .toFixed() en interne), et v.toFixed() sur une
       * chaine casse le rendu de toute la page. */
      var n = parseFloat(v);
      if (v === null || v === undefined || isNaN(n)) return '';
      var col = n >= 0.75 ? '#2ecc71' : (n >= 0.5 ? '#f1c40f' : '#8fa3bf');
      var w = n >= 0.75 ? 'font-weight:700;' : '';
      return '<span style="color:' + col + ';' + w + '">' + n.toFixed(2) + '</span>';
    }

    /* Cellule DBSI (15/08/2026) : les deux valeurs cote a cote, "top / bottom".
     * Top en rouge (pression vendeuse au-dessus de la bougie), bottom en vert
     * (pression acheteuse en dessous) -- convention demandee par Benjamin.
     * Valeurs INTRA-BOUGIE : elles bougent pendant la formation de la bougie,
     * contrairement aux colonnes du CSV qui ne changent qu'a la cloture. */
    function dbsiCell(r) {
      const t = r.liveDbsiTop;
      const b = r.liveDbsiBottom;
      if ((t === null || t === undefined) && (b === null || b === undefined)) return '';
      const fmtV = (v) => (v === null || v === undefined) ? '-' : Math.round(v);
      return '<span style="color:#e74c3c; font-weight:600;">' + fmtV(t) + '</span>' +
             '<span style="color:#6b7d95;"> / </span>' +
             '<span style="color:#2ecc71; font-weight:600;">' + fmtV(b) + '</span>';
    }

    // Deplacement de prix sur 5 min (10 releves) -- meme calcul que le baton.
    function disp5(idx, arr) {
      if (idx < 10) return null;
      const p0 = arr[idx - 10] && arr[idx - 10].lastPrice;
      const p1 = arr[idx] && arr[idx].lastPrice;
      if (!p0 || !p1) return null;
      return ((p1 - p0) / p0) * 100;
    }
    function slopeArrow(d) {
      if (d === 'montant') return '<span style="color:#2ecc71;">&#9650;</span>';
      if (d === 'descendant') return '<span style="color:#e74c3c;">&#9660;</span>';
      if (d === 'plat') return '<span style="color:#f1c40f;">&#9644;</span>';
      return '';
    }
    // Trades reels, indexes par tranche de 30s pour appariement avec l'audit.
    let tradeEvents = {};
    try {
      const tr = await (await fetch('/api/trades')).json();
      (tr.executed || []).forEach(function(t) {
        if (t.module !== 'day') return;
        const eIn = Math.floor(new Date(t.entryTimestamp).getTime() / 30000);
        const eOut = Math.floor(new Date(t.exitTimestamp).getTime() / 30000);
        const dir = t.direction === 'long' ? 'LONG' : 'SHORT';
        if (!tradeEvents[eIn]) tradeEvents[eIn] = [];
        if (!tradeEvents[eIn].some(function(x) { return x.label.indexOf('ENTREE') === 0; })) {
          tradeEvents[eIn].push({
            label: 'ENTREE ' + dir,
            bg: t.direction === 'long' ? '#1e8449' : '#922b21',
            title: 'Entree ' + dir + ' @ ' + t.entryPrice
          });
        }
        const rs = String(t.exitReason || '');
        let lbl = 'SORTIE', bg = '#555';
        if (rs.indexOf('tranche 25') >= 0) { lbl = 'T25'; bg = '#2471a3'; }
        else if (rs.indexOf('tranche 65') >= 0) { lbl = 'T65'; bg = '#2471a3'; }
        else if (rs.indexOf('tranche 10') >= 0) { lbl = 'T10'; bg = '#2471a3'; }
        else if (rs.indexOf('pivot de vague') >= 0) { lbl = 'PIVOT'; bg = '#7d3c98'; }
        else if (rs.indexOf('flux') >= 0) { lbl = 'INVAL'; bg = '#b9770e'; }
        else if (rs.indexOf('liquidation') >= 0) { lbl = 'LIQ'; bg = '#a93226'; }
        else if (rs.indexOf('timeout') >= 0) { lbl = 'TIMEOUT'; bg = '#616a6b'; }
        else if (rs.indexOf('blackout') >= 0) { lbl = 'BLACKOUT'; bg = '#616a6b'; }
        const pnl = (t.pnlPercent !== null && t.pnlPercent !== undefined)
          ? ' (' + t.pnlPercent.toFixed(2) + '%)' : '';
        if (!tradeEvents[eOut]) tradeEvents[eOut] = [];
        tradeEvents[eOut].push({ label: lbl + pnl, bg: bg, title: rs });
      });
    } catch (e) { /* trades indisponibles, l'audit reste lisible */ }

    /* ── MOTEUR BOONO (retabli le 05/09/2026) ─────────────────────────────
     * Meme index par tranche de 30s que le simulateur, mais marqueurs en
     * pointille : on lit sur la meme ligne, au meme instant, ce que chacune
     * des deux logiques a decide. */
    try {
      const bh = await (await fetch('/api/boono')).json();
      const vues = {};
      (bh.history || []).forEach(function(t) {
        const eIn = Math.floor(new Date(t.entryTimestamp).getTime() / 30000);
        const eOut = Math.floor(new Date(t.exitTimestamp).getTime() / 30000);
        const dir = t.direction === 'long' ? 'LONG' : 'SHORT';

        /* Une position produit une ligne de sortie par tranche : son entree
         * n'est marquee qu'une fois. */
        if (!vues[t.entryTimestamp]) {
          vues[t.entryTimestamp] = true;
          const tip = 'MOTEUR — entree ' + dir + ' @ ' + Math.round(t.entryPrice) +
            (t.loiEntree ? ' | ' + t.loiEntree : '');
          if (!tradeEvents[eIn]) tradeEvents[eIn] = [];
          tradeEvents[eIn].push({
            label: 'B:' + dir,
            bg: t.direction === 'long' ? '#0e6655' : '#6e2c00',
            dashed: true, title: tip
          });
        }

        const rs = String(t.exitReason || '');
        let lbl = 'B:OUT', bg = '#4a4a4a';
        if (rs.indexOf('tranche 25') >= 0) { lbl = 'B:T25'; bg = '#1a5276'; }
        else if (rs.indexOf('tranche 65') >= 0) { lbl = 'B:T65'; bg = '#1a5276'; }
        else if (rs.indexOf('tranche 10') >= 0) { lbl = 'B:T10'; bg = '#1a5276'; }
        else if (rs.indexOf('vague neutre') >= 0) { lbl = 'B:VAGUE'; bg = '#5b2c6f'; }
        else if (rs.indexOf('MoneyFlow') >= 0) { lbl = 'B:MFLOW'; bg = '#935116'; }
        else if (rs.indexOf('stop') >= 0) { lbl = 'B:STOP'; bg = '#922b21'; }
        else if (rs.indexOf('timeout') >= 0) { lbl = 'B:TIME'; bg = '#515a5a'; }
        const usd = (typeof t.pnlUsd === 'number')
          ? ' (' + (t.pnlUsd >= 0 ? '+' : '') + t.pnlUsd.toFixed(2) + ')' : '';
        if (!tradeEvents[eOut]) tradeEvents[eOut] = [];
        tradeEvents[eOut].push({ label: lbl + usd, bg: bg, dashed: true, title: rs });
      });
    } catch (e) { /* le moteur n'a peut-etre encore rien produit */ }

    const recent = rows.slice(-2880);

    /* EXTREME DE PRIX PRE-SIGNAL (14/08/2026) -- le point MCB confirme un
     * retournement qui a eu lieu quelques bougies plus tot. On remonte la
     * fenetre pour retrouver le vrai extreme de prix et le marquer, plutot
     * que de laisser croire que le retournement s'est produit au moment de
     * la confirmation.
     * 30 releves de 30s = 15 min = 5 bougies de 3m (borne haute de la
     * fourchette "3 a 5 bougies"). Passer a 18 pour 3 bougies. */
    /* Recherche generique de l'extreme de prix precedant un signal.
     * Utilisee pour le 3m et le 15m, avec des fenetres differentes. */
    function markExtremes(arr, typeField, valField, lookback, outField) {
      let lastKey = null;
      for (let i = 0; i < arr.length; i++) {
        const r = arr[i];
        const typ = r[typeField];
        if (!typ) { lastKey = null; continue; }
        const key = typ + ':' + r[valField];
        if (key === lastKey) continue;
        lastKey = key;
        /* 'pic'/'baissier' -> chercher le plus HAUT ; sinon le plus BAS. */
        const cherchHaut = (typ === 'pic' || typ === 'baissier');
        const from = Math.max(0, i - lookback);
        let bestIdx = null, bestVal = null;
        for (let j = from; j <= i; j++) {
          const c = arr[j];
          if (cherchHaut) {
            const h = (c.priceHigh !== null && c.priceHigh !== undefined) ? c.priceHigh : c.lastPrice;
            if (h === null || h === undefined) continue;
            if (bestVal === null || h > bestVal) { bestVal = h; bestIdx = j; }
          } else {
            const l = (c.priceLow !== null && c.priceLow !== undefined) ? c.priceLow : c.lastPrice;
            if (l === null || l === undefined) continue;
            if (bestVal === null || l < bestVal) { bestVal = l; bestIdx = j; }
          }
        }
        if (bestIdx !== null) {
          arr[bestIdx][outField] = cherchHaut ? 'HAUT' : 'BAS';
          arr[bestIdx][outField + 'Val'] = bestVal;
          arr[bestIdx][outField + 'Lag'] = i - bestIdx;
        }
      }
    }
    /* 3m : 30 releves = 15 min. 15m : 80 releves = 40 min -- le decalage
     * mesure entre extreme et confirmation est d'environ 2 bougies. */
    markExtremes(recent, 'wavePivotType', 'wavePivotValue', 30, 'ext3');
    markExtremes(recent, 'waveRegime15', 'waveRegime15Value', 80, 'ext15');

    let inVigilance = false;
    const rowsHtml = [];

    // entries() plutot que for...of : le calcul du deplacement 5 min a besoin
    // de l'index pour remonter de 10 releves (corrige le 11/08/2026).
    for (const [i, r] of recent.entries()) {
      const rowCls = r.isTrade ? 'trade' : (r.isBypass ? 'bypass' : (r.isReversal ? 'reversal' : ''));
      let pivotCell = '';
      if (r.pivot === 'high') pivotCell = '<span class="pivot high"></span>';
      else if (r.pivot === 'low') pivotCell = '<span class="pivot low"></span>';
      if (r.isReversal) inVigilance = true;
      // Colonne Signal (11/08/2026) : evenements reels du baton + trades reels.
      // Les anciens badges calcules avec les curseurs de la page sont retires --
      // ils affichaient des signaux sans rapport avec les decisions du bot.
      const signalCell = buildSignal(r, disp5(i, recent));
      if (r.isTrade || r.isBypass) inVigilance = false;

      // Retournement fusionne dans la colonne Evenement (14/08/2026) au lieu
      // d'occuper sa propre colonne -- il appartient a la meme famille
      // d'information que les evenements du baton.
      /* Marqueur Lgi (16/08/2026) : le prix est entre dans la zone d'une
       * ligne imaginaire. Le chiffre est son nombre de touches. Vert pour un
       * support, rouge pour une resistance. */
      let lgiCell = '';
      if (r.lgiPoints) {
        const lc = r.lgiNature === 'SUPPORT' ? '#2ecc71' : '#e74c3c';
        const conf = (r.lgiConfluence && r.lgiConfluence > 1) ? 'x' + r.lgiConfluence : '';
        lgiCell = '<span title="Ligne imaginaire ' + (r.lgiNature || '') + ', ' +
                  r.lgiPoints + ' touches' +
                  (conf ? ' -- ' + r.lgiConfluence + ' lignes confluentes' : '') +
                  '" style="color:' + lc +
                  '; font-size:9px; font-weight:600; margin-right:5px;">Lgi ' +
                  r.lgiPoints + conf + '</span>';
      }
      const eventCell = (r.isReversal ? '<span style="color:#f1c40f; margin-right:4px;" title="Retournement imminent">&#9888;</span>' : '') + lgiCell + signalCell;
      // mcbPivotCell() dedoublonne en interne (_lastPivKey) : un second
      // appel sur la meme ligne renverrait toujours vide. On capture donc
      // le resultat une seule fois, pour la cellule ET pour le fond de ligne.
      const mcbCell = mcbPivotCell(r);
      let rowStyle = '';
      if (mcbCell !== '') {
        rowStyle = r.wavePivotType === 'creux'
          ? ' style="background:rgba(46,204,113,0.14);"'
          : ' style="background:rgba(231,76,60,0.14);"';
      }
      rowsHtml.push('<tr class="' + rowCls + '"' + rowStyle + '>' +
        '<td style="background:#171f2c;">' + timeParis(r.ts) + '</td>' +
        '<td class="' + cls(r.priceMove) + '" style="font-weight:600; background:#171f2c;">' + priceCell(r) + '</td>' +
        '<td style="text-align:center; padding:2px 0;">' + extCell(r, 'ext15', '#2ecc71', '#e74c3c') + '</td>' +
        '<td style="text-align:center; padding:2px 0;">' + extCell(r, 'ext3', '#a9dfbf', '#f5b7b1') + '</td>' +
        '<td style="text-align:center; padding:2px 1px;">' + regimeCell(r) + '</td>' +
        /* Colonne Pivot retiree le 20/08/2026 : le champ r.pivot est absent de
         * tous les releves recents (verifie sur 500), elle affichait du vide.
         * Les colonnes E15 et E3 la remplacent avantageusement. */
        '<td style="text-align:center; padding:2px 1px;">' + mcbCell + '</td>' +
        '<td style="text-align:center; padding:2px 1px;">' + mcb15Cell(r) + '</td>' +
        /* Tronc commun masque en mode composite : il repeterait VW3, dW3,
         * VW15, dW15, PM et PMx que le panneau contient deja (05/09/2026). */
        (_activeTab === 'composite' ? '' :
        '<td class="' + cls(r.vwap3) + '" style="border-left:2px solid #5a6b85; background:#171f2c;">' + fmt(r.vwap3,2) + '</td>' +
        '<td class="' + cls(r.vwapLive) + '" style="opacity:0.85; font-size:11px; background:#171f2c;">' + fmt(r.vwapLive,2) + '</td>' +
        '<td class="' + cls(r.vwap3Slope) + '" style="background:#171f2c;">' + fmt(r.vwap3Slope,2) + '</td>' +
        '<td style="text-align:center; padding:2px 0; background:#171f2c;">' + slopeArrow(r.vwap3SlopeDir) + '</td>' +
        '<td class="' + cls(ecartVw(r.vwapLive, r.vwap3)) + '" style="padding:2px 1px; background:#171f2c;">' + fmt(ecartVw(r.vwapLive, r.vwap3),1) + '</td>' +
        /* Bloc 15m sur fond plus clair (19/08/2026) : c'est de lui que vient
         * la direction -- ecart VW15L-VWAP15 a +0.228 et Vslope15 a +0.243,
         * les deux meilleures mesures directionnelles mesurees. */
        '<td class="' + cls(r.vwap15) + '" style="border-left:2px solid #5a6b85;">' + fmt(r.vwap15,2) + '</td>' +
        '<td class="' + cls(r.live15Vwap) + '" style="opacity:0.85; font-size:11px;">' + fmt(r.live15Vwap,2) + '</td>' +
        '<td class="' + cls(r.vwapSlope) + '">' + fmt(r.vwapSlope,2) + '</td>' +
        '<td style="text-align:center; padding:2px 0;">' + slopeArrow(r.vwapSlopeDir) + '</td>' +
        '<td class="' + cls(ecartVw(r.live15Vwap, r.vwap15)) + '" style="border-right:2px solid #5a6b85; padding:2px 1px;">' + fmt(ecartVw(r.live15Vwap, r.vwap15),1) + '</td>' +
        '<td class="' + cls(r.priceMove) + '" style="border-left:2px solid #5a6b85; font-weight:600; background:#171f2c;">' + fmt(r.priceMove,0) + '</td>' +
        '<td style="border-right:2px solid #5a6b85; background:#171f2c;' +
          ((r.priceMoveMult !== null && r.priceMoveMult >= 3) ? ' font-weight:700; color:#f39c12;' : '') +
          '">' + fmt(r.priceMoveMult,1) + '</td>') +
        (_activeTab === 'vague'
          /* 15m et non 3m (20/08/2026) : la strategie se decide sur le 15m,
           * les donnees de vague doivent venir du meme timeframe. */
          ? '<td style="text-align:center; white-space:nowrap; border-left:3px solid #5a6b85;">' + dbsi15Cell(r) + '</td>' +
            /* Couleur sur la PENTE et non sur le signe (22/08/2026) : c'est
             * l'inflexion qui porte l'information, pas le niveau. */
            '<td class="' + cls(r.mf15Pente) + '" title="pente ' + fmt(r.mf15Pente,2) + '">' + fmt(r.live15MoneyFlow,2) + '</td>' +
            /* BW colore par sa PENTE et non par son signe (04/09/2026) : ce
             * qui compte est le sens de la vague, pas sa position. Seuil 0.5
             * sur cinq minutes -- la mediane mesuree des variations. */
            '<td class="' + cls(bwPente(r, i, recent)) + '" style="background:#171f2c;" title="pente " + fmt(bwPente(r, i, recent),2) + "">' + fmt(r.live15Bw,2) + '</td>' +
            /* LBW colore par sa POSITION par rapport au BW : vert au-dessus,
             * rouge en dessous. Rend le croisement visible d un coup d oeil.
             * Mesure du 03/09 : 60 croisements en 24h, dont 43 pourcent
             * seulement tiennent plus de dix minutes. */
            '<td class="' + ((r.live15Lbw !== null && r.live15Bw !== null) ? (r.live15Lbw > r.live15Bw ? 'up' : 'down') : '') + '" style="background:#171f2c;">' + fmt(r.live15Lbw,2) + '</td>'
          : _activeTab === 'mouvement'
          ? '<td style="border-left:3px solid #5a6b85;">' + fmt(r.cadence,2) + '</td>' +
            '<td>' + fmt(r.cadenceMult,2) + 'x</td>' +
            '<td class="' + cls(r.netMove) + '" style="background:#171f2c;">' + fmt(r.netMove,3) + '</td>' +
            '<td style="background:#171f2c;">' + fmt(r.netMoveMult,1) + '</td>' +
            '<td style="background:#171f2c;">' + fmt(r.amplitude,3) + '</td>' +
            '<td style="background:#171f2c;">' + fmt(r.amplitudeMult,1) + '</td>'
          : _activeTab === 'composite'
          ? /* VWAP 3m et 15m */
            '<td class="' + cls(r.vwap3) + '" style="border-left:3px solid #5a6b85; background:#171f2c;">' + fmt(r.vwap3,2) + '</td>' +
            '<td class="' + cls(ecartVw(r.vwapLive, r.vwap3)) + '" style="background:#171f2c;">' + fmt(ecartVw(r.vwapLive, r.vwap3),1) + '</td>' +
            '<td class="' + cls(r.vwap3Slope) + '" style="background:#171f2c;">' + fmt(r.vwap3Slope,2) + '</td>' +
            '<td class="' + cls(r.vwap15) + '" style="border-left:2px solid #5a6b85;">' + fmt(r.vwap15,2) + '</td>' +
            '<td class="' + cls(ecartVw(r.live15Vwap, r.vwap15)) + '">' + fmt(ecartVw(r.live15Vwap, r.vwap15),1) + '</td>' +
            '<td class="' + cls(r.vwapSlope) + '">' + fmt(r.vwapSlope,2) + '</td>' +
            /* Mouvement */
            '<td class="' + cls(r.priceMove) + '" style="border-left:2px solid #5a6b85; font-weight:600; background:#171f2c;">' + fmt(r.priceMove,0) + '</td>' +
            '<td style="background:#171f2c;' + ((r.priceMoveMult !== null && r.priceMoveMult >= 3) ? ' font-weight:700; color:#f39c12;' : '') + '">' + fmt(r.priceMoveMult,1) + '</td>' +
            '<td class="' + cls(r.netMove) + '">' + fmt(r.netMove,3) + '</td>' +
            '<td>' + fmt(r.netMoveMult,1) + '</td>' +
            '<td style="background:#171f2c;">' + fmt(r.cadence,2) + '</td>' +
            '<td style="background:#171f2c;">' + fmt(r.cadenceMult,2) + 'x</td>' +
            /* Vagues : confirme puis live, pour comparaison */
            '<td class="' + cls(r.mf15Pente) + '" style="border-left:2px solid #5a6b85;" title="pente ' + fmt(r.mf15Pente,2) + '">' + fmt(r.live15MoneyFlow,2) + '</td>' +
            '<td class="' + cls(pente10(i, recent, 'live15MfRaw')) + '">' + fmt(r.live15MfRaw,2) + '</td>' +
            '<td class="' + cls(pente10(i, recent, 'live15Bw')) + '" style="background:#171f2c;">' + fmt(r.live15Bw,2) + '</td>' +
            '<td class="' + cls(pente10(i, recent, 'live15BwRaw')) + '" style="background:#171f2c;">' + fmt(r.live15BwRaw,2) + '</td>' +
            '<td class="' + rel(r.live15Lbw, r.live15Bw) + '">' + fmt(r.live15Lbw,2) + '</td>' +
            '<td class="' + rel(r.live15LbwRaw, r.live15BwRaw) + '">' + fmt(r.live15LbwRaw,2) + '</td>'
          : '<td style="text-align:center; font-size:11px; border-left:3px solid #5a6b85;">' + convCell(r.convictionScore) + '</td>' +
            '<td style="text-align:center; font-size:11px;">' + convCell(r.coherence) + '</td>' +
            '<td style="background:#171f2c;">' + (r.priceSens3 > 0 ? '<span class="up">&#9650;</span>' : (r.priceSens3 < 0 ? '<span class="down">&#9660;</span>' : '0')) + '</td>' +
            '<td>' + fmt(r.winSec,1) + '</td>' +
            '<td>' + arrow(r.direction) + '</td>'
        ) +
        '<td style="border-left:2px solid #5a6b85;">' + eventCell + '</td>' +
        '</tr>');
    }
    rowsHtml.reverse();
    let html = '<table><thead><tr>' +
      '<th style="width:62px; background:#171f2c;">UTC+2</th>' +
      '<th style="width:52px; background:#171f2c;">PRIX</th>' +
      '<th style="width:14px; padding:2px 0;" title="Extreme de prix rattache a un signal MCB 15m -- vert = plus haut, rouge = plus bas">E15</th>' +
      '<th style="width:14px; padding:2px 0;" title="Extreme de prix rattache a un signal MCB 3m -- vert clair = plus haut, rose = plus bas">E3</th>' +
      '<th style="width:18px; padding:2px 1px;" title="Regime directionnel vague MCB 15m">Rg</th>' +

      '<th style="width:26px; padding:2px 1px;" title="Signal MCB natif du 3m (point rouge/vert). Ne vaut que confirme par le 15m -- LOI 4.">Sig3</th>' +
      '<th style="width:26px; padding:2px 1px;" title="Signal MCB natif du 15m. Quand les deux signaux se rapprochent sur le meme extreme : 83 pourcent de justesse, contre 42 pourcent quand un seul est present.">Sig15</th>' +
      (_activeTab === 'composite' ? '' :
      '<th style="border-left:2px solid #5a6b85; background:#171f2c;" title="VWAP 3m confirme a la cloture (LBW moins BW)">VW3</th>' +
      '<th style="background:#171f2c;" title="VWAP 3m INTRA-BOUGIE, mis a jour en continu. Decroche parfois du confirme une a deux minutes avant.">VW3L</th>' +
      '<th style="background:#171f2c;" title="Pente du VWAP 3m, en unites par minute">Vsl3</th>' +
      '<th style="width:26px; padding:2px 0; background:#171f2c;" title="Direction de la pente VWAP 3m : montant, plat, descendant">P3</th>' +
      '<th style="width:34px; padding:2px 1px; background:#171f2c;" title="Ecart VW3L moins VWAP3 : de combien le live decroche du confirme. Sur le 3m, mesure du 18/08 : aucune valeur predictive (+0.05 a 5 min).">dW3</th>' +
      '<th style="border-left:2px solid #5a6b85;" title="VWAP 15m confirme a la cloture. Timeframe de pilotage : c est lui qui porte la direction.">VW15</th>' +
      '<th title="VWAP 15m INTRA-BOUGIE. Mesure du 16/08 : a bascule 15 minutes et 46 USD avant le prix.">VW15L</th>' +
      '<th title="Pente du VWAP 15m. Sa zone neutre declenche la vigilance (LOI 1).">Vsl15</th>' +
      '<th style="width:26px; padding:2px 0;" title="Direction de la pente VWAP 15m">P15</th>' +
      '<th style="width:34px; padding:2px 1px;" title="Ecart VW15L moins VWAP15. Voix de direction (LOI 3), seuil 3.">dW15</th>' +
      '<th style="border-left:2px solid #5a6b85; width:44px; background:#171f2c;" title="priceMove : deplacement du prix en USD depuis le releve precedent. L evolution du prix est le facteur premier de toutes les comparaisons.">PM</th>' +
      '<th style="width:34px; background:#171f2c;" title="Multiplicateur du priceMove contre la mediane glissante de 48h. Au-dela de 3, evenement (LOI 5).">PMx</th>') +
      (_activeTab === 'vague'
        ? '<th style="border-left:3px solid #5a6b85;" title="DBSI 15m intra-bougie : pression vendeuse (rouge, au-dessus) / acheteuse (vert, en dessous). Lecture isolee sans valeur -- il faut la moyenne sur dix minutes.">DBSI15</th>' +
          '<th title="MoneyFlow 15m intra-bougie. COULEUR = SA PENTE : vert quand il monte, rouge quand il descend -- c est l inflexion qui compte, pas le niveau. Mesure sur 19 extremes : la pente reste orientee dans le sens du mouvement qui se termine, signature de l epuisement.">MF15</th>' +
          '<th style="background:#171f2c;" title="Blue Wave 15m intra-bougie (WT2). Porte la tendance de fond avec MF15 (LOI 3).">BW15</th>' +
          '<th style="background:#171f2c;" title="Lt Blue Wave 15m intra-bougie (WT1)">LBW15</th>'
        : _activeTab === 'mouvement'
        ? '<th style="border-left:3px solid #5a6b85;" title="Cadence : transactions par seconde sur la fenetre de 200 ticks">Cad</th>' +
          '<th title="Multiplicateur de cadence contre la moyenne glissante 4h. Marque le MOMENT, jamais la direction (LOI 5).">nMx</th>' +
          '<th style="background:#171f2c;" title="NetMove : deplacement net de prix sur la fenetre, en pourcent. Correlation avec la direction future : -0.028, soit rien.">NM</th>' +
          '<th style="background:#171f2c;" title="Multiplicateur de netMove contre la moyenne des 30 releves precedents">NMx</th>' +
          '<th style="background:#171f2c;" title="Amplitude : ecart haut-bas sur la fenetre de 200 ticks, en pourcent">Ampl</th>' +
          '<th style="background:#171f2c;" title="Multiplicateur d amplitude contre la moyenne des 30 releves precedents">AMx</th>'
        : _activeTab === 'composite'
        ? '<th style="border-left:3px solid #5a6b85; background:#171f2c;" title="VWAP 3m confirme">VW3</th>' +
          '<th style="background:#171f2c;" title="Ecart VW3L moins VWAP3">dW3</th>' +
          '<th style="background:#171f2c;" title="Pente du VWAP 3m. En vigilance, c est lui qui tranche.">Vsl3</th>' +
          '<th style="border-left:2px solid #5a6b85;" title="VWAP 15m confirme">VW15</th>' +
          '<th title="Ecart VW15L moins VWAP15">dW15</th>' +
          '<th title="Pente du VWAP 15m">Vsl15</th>' +
          '<th style="border-left:2px solid #5a6b85; background:#171f2c;" title="priceMove : deplacement du prix en USD depuis le releve precedent">PM</th>' +
          '<th style="background:#171f2c;" title="Multiplicateur du priceMove contre la mediane glissante de 48h. Au-dela de 3, evenement.">PMx</th>' +
          '<th title="NetMove : deplacement net sur la fenetre de 200 ticks, en pourcent">NM</th>' +
          '<th title="Multiplicateur de netMove">NMx</th>' +
          '<th style="background:#171f2c;" title="Cadence : transactions par seconde">Cad</th>' +
          '<th style="background:#171f2c;" title="Multiplicateur de cadence">nMx</th>' +
          '<th style="border-left:2px solid #5a6b85;" title="MoneyFlow 15m CONFIRME a la cloture. Colore par sa pente.">Mf15</th>' +
          '<th title="MoneyFlow 15m LIVE intra-bougie. Colore par sa pente.">MfL15</th>' +
          '<th style="background:#171f2c;" title="Blue Wave 15m CONFIRMEE. Coloree par sa pente sur cinq minutes.">BW15</th>' +
          '<th style="background:#171f2c;" title="Blue Wave 15m LIVE intra-bougie.">BWL15</th>' +
          '<th title="Lt Blue Wave 15m CONFIRMEE. Verte au-dessus du BW, rouge en dessous.">Lbw15</th>' +
          '<th title="Lt Blue Wave 15m LIVE. Le croisement se voit ici avant le confirme.">LbwL15</th>'
        : '<th style="border-left:3px solid #5a6b85;" title="Conviction : part des 8 tranches ou le flux achat/vente va dans le meme sens. Distribution verifiee non saturee, moyenne 0.66.">Cv</th>' +
          '<th title="Coherence : part des 8 tranches ou le mouvement de prix va dans le meme sens. 41 pourcent des releves a zero -- le prix zigzague.">Ch</th>' +
          '<th style="background:#171f2c;" title="Sens lisse du prix sur les 3 dernieres tranches">S3</th>' +
          '<th title="Duree pour accumuler 200 ticks. Fenetre courte = marche actif (17 USD a 5 min), longue = marche endormi (9 USD).">WSec</th>' +
          '<th title="Direction du prix entre deux releves. Zero signifie prix immobile.">Dir</th>'
      ) +
      '<th style="border-left:2px solid #5a6b85;">Evenement</th>' +
      '</tr></thead><tbody>' + rowsHtml.join('');
    html += '</tbody></table>';
    wrap.innerHTML = html;
  } catch (e) {
    wrap.innerHTML = '<div class="empty">Erreur reseau : ' + e.message + '</div>';
  }
}

loadAudit();
setInterval(loadAudit, 30000);
</script>
</body>
</html>`);
});

// ── Page principale ───────────────────────────────────────────────────────────
app.get('/', requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bot Trading Boono</title>
    <style>
      :root {
        --page: #f6f6f7;
        --card: #ffffff;
        --border: #e3e3e6;
        --text: #18181b;
        --muted: #8a8a92;
        --faint: #b8b8bd;
        --accent: #3b6fee;

        --support: #15803d;
        --support-bg: #ecfdf3;
        --resistance: #b91c1c;
        --resistance-bg: #fef2f2;
        --poc: #b45309;
        --poc-bg: #fffbeb;
        --fib: #6d28d9;
        --fib-bg: #f5f3ff;

        --ok: #15803d;
        --bad: #b91c1c;
      }
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: var(--page);
        color: var(--text);
        margin: 0;
        padding: 10px;
        font-size: 13px;
      }
      .page-wrap { max-width: 480px; margin: 0 auto; }
      .mono { font-family: "SF Mono", "Menlo", "Consolas", monospace; font-variant-numeric: tabular-nums; }

      .ticker {
        display: flex; align-items: baseline; justify-content: space-between;
        background: var(--card); border: 1px solid var(--border); border-radius: 8px;
        padding: 8px 12px; margin-bottom: 10px;
      }
      .ticker-label { font-size: 10px; color: var(--faint); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
      .ticker-updated { font-size: 10px; color: var(--faint); margin-top: 2px; }

      /* -- Navigation principale a plat, 5 onglets -- */
      .main-nav {
        display: flex; flex-wrap: wrap; gap: 4px;
        background: var(--card); border: 1px solid var(--border); border-radius: 10px;
        padding: 4px; margin-bottom: 10px;
      }
      .main-nav-item {
        flex: 1; min-width: 60px; text-align: center;
        font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em;
        color: var(--muted); padding: 8px 2px; border-radius: 7px; cursor: pointer;
      }
      .main-nav-item.active { color: white; background: var(--accent); }
      .main-section { display: none; }
      .main-section.active { display: block; }

      .panel {
        background: var(--card); border: 1px solid var(--border); border-radius: 8px;
        padding: 8px 10px; margin-bottom: 8px;
      }
      .eyebrow {
        font-size: 10px; color: var(--faint); text-transform: uppercase;
        letter-spacing: 0.08em; font-weight: 600; margin: 0 0 5px;
      }

      .token-group { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 5px; }
      .token {
        font-family: "SF Mono", "Menlo", "Consolas", monospace;
        font-size: 10px; letter-spacing: 0.03em; padding: 4px 7px;
        border-radius: 5px; border: 1px solid var(--border); background: var(--card);
        cursor: pointer; line-height: 1.3; transition: background 0.3s, border-color 0.3s;
      }
      .token[data-fam="support"] { color: var(--support); border-color: #d1fae5; }
      .token[data-fam="resistance"] { color: var(--resistance); border-color: #fecaca; }
      .token[data-fam="poc"] { color: var(--poc); border-color: #fde68a; }
      .token[data-fam="fib"] { color: var(--fib); border-color: #ddd6fe; }
      .token[data-scope] { color: var(--muted); font-family: -apple-system, sans-serif; font-size: 10px; }
      .token[data-scope][data-active="1"] { color: var(--text); font-weight: 600; border-color: var(--text); }
      .token[data-mod], .token[data-dir] { font-family: -apple-system, sans-serif; font-size: 11px; color: var(--muted); }
      .token[data-mod][data-active="1"] { color: var(--text); font-weight: 600; border-color: var(--text); }
      .token[data-dir][data-active="1"] { font-weight: 600; }
      .token[data-dir="long"][data-active="1"] { background: var(--support-bg); border-color: var(--support); }
      .token[data-dir="short"][data-active="1"] { background: var(--resistance-bg); border-color: var(--resistance); }
      .token[data-cond] { color: var(--accent); border-color: #c7d7fe; font-family: "SF Mono", "Menlo", "Consolas", monospace; }
      /* Jeton "en direct" -- s'allumera quand son niveau est reellement touche
         par le prix (piste future, voir note en tete de fichier). */
      .token.live-match { background: #fef9c3; border-color: #eab308; font-weight: 700; }

      .unit { display: inline-flex; border: 1px solid var(--border); border-radius: 5px; overflow: hidden; }
      .unit .token { border: none; border-radius: 0; }
      .unit .token:not(:last-child) { border-right: 1px solid var(--border); }

      .composer-row { display: flex; gap: 5px; margin-top: 6px; }
      .composer-row input {
        flex: 1; min-width: 0; padding: 7px 10px; border-radius: 6px;
        border: 1px solid var(--border); background: var(--page); color: var(--text);
        font-family: "SF Mono", "Menlo", "Consolas", monospace; font-size: 12px;
      }
      .composer-row input::placeholder { color: var(--faint); font-family: -apple-system, sans-serif; font-size: 11px; }
      .composer-row button {
        padding: 5px 11px; border-radius: 6px; border: none; background: var(--accent);
        color: white; font-weight: 600; font-size: 11px; white-space: nowrap;
      }
      .composer-row button:disabled { background: var(--border); color: var(--faint); }
      .composer-hint { font-size: 10px; color: var(--faint); margin: 4px 0 0; }

      .scenario-row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
      .scenario-row select { flex: 1; min-width: 0; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--page); font-size: 12px; color: var(--text); }
      .scenario-row .label { font-size: 11px; color: var(--muted); white-space: nowrap; width: 84px; }

      .scenario-composer { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
      .scenario-composer textarea {
        width: 100%; min-height: 42px; resize: vertical; padding: 7px 10px; border-radius: 6px;
        border: 1px solid var(--border); background: var(--page); color: var(--text);
        font-family: "SF Mono", "Menlo", "Consolas", monospace; font-size: 12px; line-height: 1.4;
      }
      .scenario-composer textarea::placeholder { color: var(--faint); font-family: -apple-system, sans-serif; font-size: 11px; }
      .scenario-composer button { width: 100%; padding: 7px 0; border-radius: 6px; border: none; background: var(--accent); color: white; font-weight: 600; font-size: 12px; }
      .scenario-composer button:disabled { background: var(--border); color: var(--faint); }

      .tabs { display: flex; flex-wrap: wrap; gap: 2px; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
      .tab { font-size: 11px; font-weight: 600; color: var(--faint); padding: 5px 10px 7px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
      .tab.active { color: var(--text); border-bottom-color: var(--accent); }
      .tab-panel { display: none; }
      .tab-panel.active { display: block; }

      .ledger-block { background: var(--page); border: 1px solid var(--border); border-radius: 6px; padding: 2px 8px; margin: 6px 0; position: relative; }
      .ledger-block .ledger-row { border-bottom: 1px dashed var(--border); padding-right: 22px; }
      .ledger-block .ledger-row:last-child { border-bottom: none; }
      .ledger-block .ledger-row .ledger-del { display: none; }
      .ledger-block-del { position: absolute; top: 4px; right: 4px; background: none; border: none; color: var(--faint); font-size: 14px; cursor: pointer; padding: 2px 5px; line-height: 1; }
      .fib-info-btn { position: absolute; top: 4px; right: 24px; background: var(--accent); color: white; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; font-weight: 700; cursor: pointer; line-height: 16px; padding: 0; }
      .fib-info-panel { display: none; margin-top: 6px; padding: 6px 8px; background: #eef2ff; border: 1px solid #c7d7fe; border-radius: 6px; font-size: 11px; font-family: "SF Mono", "Menlo", "Consolas", monospace; }
      .fib-info-panel.open { display: block; }
      .fib-info-panel div { display: flex; justify-content: space-between; padding: 1px 0; }
      .fib-info-panel .fib-ratio { color: var(--muted); }
      #chatToggle { position: fixed; bottom: 16px; right: 16px; width: 48px; height: 48px; border-radius: 50%; background: var(--accent); color: white; border: none; font-size: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); cursor: pointer; z-index: 1000; }
      #chatPanel { display: none; position: fixed; bottom: 0; right: 0; left: 0; top: 15%; background: var(--page); border-top-left-radius: 12px; border-top-right-radius: 12px; box-shadow: 0 -2px 12px rgba(0,0,0,0.25); z-index: 1001; flex-direction: column; }
      #chatPanel.open { display: flex; }
      #chatPanelHead { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 13px; font-weight: 600; }
      #chatPanelHead button { background: none; border: none; font-size: 18px; color: var(--faint); cursor: pointer; }
      #chatMessages { flex: 1; overflow-y: auto; padding: 10px 14px; font-size: 12px; }
      #chatMessages .msg-user { text-align: right; margin: 6px 0; }
      #chatMessages .msg-user span { display: inline-block; background: var(--accent); color: white; border-radius: 10px; padding: 6px 10px; max-width: 80%; }
      #chatMessages .msg-bot span { display: inline-block; background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 6px 10px; max-width: 80%; white-space: pre-wrap; }
      #chatInputRow { display: flex; gap: 6px; padding: 10px 14px; border-top: 1px solid var(--border); }
      #chatInputRow textarea { flex: 1; resize: none; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border); font-size: 12px; font-family: inherit; }
      #chatInputRow button { padding: 0 14px; border-radius: 6px; border: none; background: var(--accent); color: white; font-weight: 600; font-size: 12px; }


      .ledger-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 12px; }
      .ledger-row:last-child { border-bottom: none; }
      .ledger-badge { font-family: "SF Mono", "Menlo", "Consolas", monospace; font-size: 10px; padding: 2px 6px; border-radius: 4px; flex-shrink: 0; width: 80px; text-align: center; }
      .ledger-price { font-weight: 600; flex: 1; }
      .ledger-price input { width: 90px; font-family: "SF Mono", "Menlo", "Consolas", monospace; font-weight: 600; font-size: 12px; border: 1px solid var(--accent); border-radius: 4px; padding: 1px 4px; background: var(--card); color: var(--text); }
      .ledger-edit { background: none; border: none; color: var(--faint); font-size: 10px; cursor: pointer; padding: 1px 3px; line-height: 1; }
      .ledger-time { color: var(--faint); }
      .ledger-del { background: none; border: none; color: var(--faint); font-size: 13px; cursor: pointer; padding: 1px 3px; line-height: 1; }
      .ledger-empty { padding: 12px 0; text-align: center; color: var(--faint); font-size: 12px; }

      .scenario-card { border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; margin: 6px 0; position: relative; padding-right: 26px; }
      .scenario-card-head { display: flex; gap: 6px; align-items: center; font-size: 12px; font-weight: 600; margin-bottom: 4px; }
      .scenario-card-head .dir-long { color: var(--support); }
      .scenario-card-head .dir-short { color: var(--resistance); }
      .scenario-card-level { color: var(--muted); font-weight: 400; font-size: 11px; }
      .scenario-card-conds { display: flex; flex-wrap: wrap; gap: 4px; }
      .scenario-chip { font-family: "SF Mono", "Menlo", "Consolas", monospace; font-size: 10px; color: var(--accent); background: #eef2ff; border: 1px solid #c7d7fe; border-radius: 4px; padding: 2px 6px; }
      .scenario-card-del { position: absolute; top: 4px; right: 6px; background: none; border: none; color: var(--faint); font-size: 14px; cursor: pointer; }

      .diag-module { border: 1px solid var(--border); border-radius: 8px; padding: 10px; margin-bottom: 8px; }
      .diag-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
      .diag-name { font-weight: 700; font-size: 13px; }
      .diag-decision { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 5px; }
      .diag-decision.ok { color: white; background: var(--ok); }
      .diag-decision.refus { color: white; background: var(--bad); }
      .diag-decision.indisponible { color: var(--muted); background: var(--page); border: 1px solid var(--border); }
      .diag-reason { font-size: 11px; color: var(--muted); margin-bottom: 8px; }
      .diag-scores { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .diag-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 6px; }
      .diag-grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
      .diag-score { background: var(--page); border-radius: 6px; padding: 6px; text-align: center; }
      .diag-score .k { font-size: 9px; color: var(--faint); text-transform: uppercase; letter-spacing: 0.05em; }
      .diag-score .v { font-size: 10px; font-weight: 700; font-family: "SF Mono", "Menlo", "Consolas", monospace; }
      .diag-score .v.null { color: var(--faint); font-size: 11px; font-weight: 400; }
      .diag-tf-note { font-size: 9px; color: var(--faint); text-align: right; margin-top: 3px; }
      .diag-details { margin-top: 8px; font-size: 11px; color: var(--muted); line-height: 1.6; font-family: "SF Mono", "Menlo", "Consolas", monospace; }
      .diag-updated { font-size: 10px; color: var(--faint); text-align: right; margin-top: 6px; }
      .diag-refresh { width: 100%; padding: 7px 0; border-radius: 6px; border: 1px solid var(--border); background: var(--card); color: var(--muted); font-weight: 600; font-size: 12px; margin-bottom: 10px; }

      .placeholder-note { font-size: 12px; color: var(--muted); text-align: center; padding: 30px 10px; line-height: 1.6; }
    </style>
    </head>
    <body>

      <div class="page-wrap">

      <div class="ticker">
        <span class="ticker-label">BTCUSD.P</span>
        <span class="ticker-price mono" id="tickerPrice" style="font-size:16px;font-weight:600;color:var(--support)">--</span>
      </div>
      <div class="ticker-updated" id="tickerUpdated"></div>

      <div class="main-nav">
        <span class="main-nav-item active" data-main="niveaux">NIVEAUX</span>
        <span class="main-nav-item" data-main="scenario">SCENARIO</span>
        <span class="main-nav-item" data-main="diagnostic">DIAGNOSTIC</span>
        <span class="main-nav-item" data-main="trades">TRADES</span>
        <span class="main-nav-item" data-main="audit">AUDIT</span>
        <span class="main-nav-item" data-main="parametres">PARAMETRES</span>
      </div>

      <!-- ═══════════════ NIVEAUX ═══════════════ -->
      <div class="main-section active" id="section-niveaux">
        <div class="panel">
          <p class="eyebrow">Niveaux ponctuels</p>
          <div class="token-group">
            <span class="token" data-fam="support" data-insert="DS">DS</span>
            <span class="token" data-fam="resistance" data-insert="DR">DR</span>
            <span class="token" data-fam="support" data-insert="WS">WS</span>
            <span class="token" data-fam="resistance" data-insert="WR">WR</span>
            <span class="token" data-fam="support" data-insert="MS">MS</span>
            <span class="token" data-fam="resistance" data-insert="MR">MR</span>
          </div>
          <div class="composer-row">
            <input type="text" id="composerPoints" placeholder="DS 63200:DR 64800">
            <button data-submit="points">Ajouter</button>
          </div>
          <p class="composer-hint">Colle ou tape TOKEN prix, separe par : pour chainer</p>
        </div>

        <div class="panel">
          <p class="eyebrow">Fibonacci</p>
          <div class="unit">
            <span class="token" data-fam="fib" data-insert="fib0">fib0</span>
            <span class="token" data-fam="fib" data-insert="fib1">fib1</span>
          </div>
          <div class="composer-row">
            <input type="text" id="composerFib" placeholder="fib0 63000:fib1 65200">
            <button data-submit="fib">Ajouter</button>
          </div>
        </div>

        <div class="panel">
          <p class="eyebrow">Range -- daily / range / big-range</p>
          <div class="token-group">
            <span class="token" data-scope="daily-range" data-active="1">daily-range</span>
            <span class="token" data-scope="range">range</span>
            <span class="token" data-scope="big-range">big-range</span>
          </div>
          <div class="unit">
            <span class="token" data-fam="resistance" data-insert="VAH">VAH</span>
            <span class="token" data-fam="poc" data-insert="POC">POC</span>
            <span class="token" data-fam="support" data-insert="VAL">VAL</span>
          </div>
          <div class="composer-row">
            <input type="text" id="composerRange" placeholder="daily-range:VAH 65120:POC 64200:VAL 63400">
            <button data-submit="range">Ajouter</button>
          </div>
        </div>

        <div class="panel">
          <p class="eyebrow">Niveaux soumis</p>
          <div id="ledger"><div class="ledger-empty">Aucun niveau soumis</div></div>
        </div>
      </div>

      <!-- ═══════════════ SCENARIO ═══════════════ -->
      <div class="main-section" id="section-scenario">
        <div class="panel">
          <p class="eyebrow">Scenario</p>
          <div class="scenario-row">
            <span class="label">Module</span>
            <div class="token-group" id="scenarioModule" style="margin-bottom:0">
              <span class="token" data-mod="scalp" data-active="1">Scalp</span>
              <span class="token" data-mod="day">Day</span>
              <span class="token" data-mod="swing">Swing</span>
            </div>
          </div>
          <div class="scenario-row">
            <span class="label">Direction</span>
            <div class="token-group" id="scenarioDirection" style="margin-bottom:0">
              <span class="token" data-fam="support" data-dir="long" data-active="1">Long</span>
              <span class="token" data-fam="resistance" data-dir="short">Short</span>
            </div>
          </div>
          <div class="scenario-row">
            <span class="label">Niveau</span>
            <select id="scenarioLevel"><option value="">-- selectionne un niveau soumis --</option></select>
          </div>

          <p class="eyebrow" style="margin-top:8px">Score (agrege)</p>
          <div class="token-group">
            <span class="token" data-cond="DIV">DIV</span>
            <span class="token" data-cond="S/R">S/R</span>
            <span class="token" data-cond="Volume">Volume</span>
          </div>

          <p class="eyebrow">Metriques</p>
          <div class="token-group">
            <span class="token" data-cond="MA200">MA200</span>
            <span class="token" data-cond="Momentum">Momentum</span>
            <span class="token" data-cond="VWAP">VWAP</span>
            <span class="token" data-cond="MoneyFlow">MoneyFlow</span>
            <span class="token" data-cond="DBSI">DBSI</span>
            <span class="token" data-cond="Trigger">Trigger</span>
            <span class="token" data-cond="Cadence">Cadence</span>
          </div>

          <div class="scenario-composer">
            <textarea id="scenarioComposer" rows="2" placeholder="DIV>=15:Momentum>=4:DBSI>=4 -- clique une condition, complete l'operateur et le seuil"></textarea>
            <button id="scenarioSubmit" disabled>Enregistrer</button>
          </div>
        </div>

        <div class="panel">
          <p class="eyebrow">Scenarios enregistres</p>
          <div id="scenarioList"><div class="ledger-empty">Aucun scenario enregistre</div></div>
        </div>
      </div>

      <!-- ═══════════════ DIAGNOSTIC ═══════════════ -->
      <div class="main-section" id="section-diagnostic">
        <button class="diag-refresh" id="diagRefresh">Rafraichir</button>
        <div id="diagContent">
          <div class="ledger-empty">Chargement...</div>
        </div>
      </div>

      <!-- ═══════════════ TRADES ═══════════════ -->
      <div class="main-section" id="section-trades">
        <div class="panel">
          <div class="tabs">
            <span class="tab active" data-tab2="ongoing">Ongoing</span>
            <span class="tab" data-tab2="executed">Executed</span>
            <span class="tab" data-tab2="pnl">PNL</span>
            <span class="tab" data-tab2="boono">BOONO</span>
          </div>
          <div class="tab-panel active" id="tab2-ongoing">
            <div class="placeholder-note">Aucun trade en cours.<br>Le paper trading n'a pas encore demarre.</div>
          </div>
          <div class="tab-panel" id="tab2-executed">
            <div class="placeholder-note">Aucun trade execute pour l'instant.</div>
          </div>
          <div class="tab-panel" id="tab2-pnl">
            <div class="placeholder-note">P/L -- aucune donnee disponible.<br>S'alimentera automatiquement une fois des trades executes.</div>
          </div>
          <div class="tab-panel" id="tab2-boono">
            <div class="placeholder-note">Moteur Boono -- chargement.</div>
          </div>
        </div>
      </div>

      <!-- ═══════════════ AUDIT (baton de relais) ═══════════════ -->
      <div class="main-section" id="section-audit">
        <div class="panel" style="text-align:center; padding:60px 20px;">
          <div style="font-size:13px; color:var(--faint); margin-bottom:16px;">
            La page AUDIT s ouvre dans un nouvel onglet, avec un affichage optimise (fond noir, colonnes larges) -- ideal aussi en mode paysage sur telephone.
          </div>
          <button class="diag-refresh" id="auditOpenBtn" style="padding:10px 24px; font-size:13px;">Ouvrir la page AUDIT</button>
        </div>
      </div>
      <!-- ═══════════════ PARAMETRES ═══════════════ -->
      <div class="main-section" id="section-parametres">
        <h1 style="font-size:12px;font-weight:700;margin:4px 0 10px;display:flex;justify-content:space-between;">
          Parametres <span id="lastUpdated" style="font-size:10px;color:var(--faint);font-weight:400;"></span>
        </h1>
        <div id="paramsApp">Chargement...</div>
        <form id="logoutForm" method="POST" action="/logout" style="display:none"></form>
      </div>

      </div>
      <button id="chatToggle" aria-label="Ouvrir le chat">💬</button>
      <div id="chatPanel">
        <div id="chatPanelHead">
          <span>Assistant (consultatif)</span>
          <button id="chatClose" aria-label="Fermer">&times;</button>
        </div>
        <div id="chatMessages"></div>
        <div id="chatInputRow">
          <textarea id="chatInput" rows="1" placeholder="Poser une question sur le marche..."></textarea>
          <button id="chatSend">Envoyer</button>
        </div>
      </div>

<script src="/app.js"></script>
    </body>
    </html>
  `);
});

// ── Script client ─────────────────────────────────────────────────────────────
app.get('/app.js', requireAuth, (req, res) => {
  res.type('application/javascript').send(`
let diagAutoRefresh = null;
let tradesAutoRefresh = null;
let auditAutoRefresh = null;
document.querySelectorAll('.main-nav-item').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.main-nav-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.main-section').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('section-' + el.dataset.main).classList.add('active');
    if (diagAutoRefresh) { clearInterval(diagAutoRefresh); diagAutoRefresh = null; }
    if (tradesAutoRefresh) { clearInterval(tradesAutoRefresh); tradesAutoRefresh = null; }
    if (auditAutoRefresh) { clearInterval(auditAutoRefresh); auditAutoRefresh = null; }
    if (el.dataset.main === 'diagnostic') {
      loadDiagnostic();
      diagAutoRefresh = setInterval(loadDiagnostic, 60000);
    }
    if (el.dataset.main === 'trades') {
      loadTrades();
      tradesAutoRefresh = setInterval(loadTrades, 60000);
    }
    if (el.dataset.main === 'audit') {
      window.open('/audit-view', '_blank');
    }
    if (el.dataset.main === 'parametres') loadParams();
  });
});

document.querySelectorAll('.tab[data-tab2]').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-tab2]').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#tab2-ongoing, #tab2-executed, #tab2-pnl, #tab2-boono').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('tab2-' + el.dataset.tab2).classList.add('active');
  });
});

const famColors = {
  support: { bg: 'var(--support-bg)', fg: 'var(--support)' },
  resistance: { bg: 'var(--resistance-bg)', fg: 'var(--resistance)' },
  poc: { bg: 'var(--poc-bg)', fg: 'var(--poc)' },
  fib: { bg: 'var(--fib-bg)', fg: 'var(--fib)' },
};
const tokenFam = {
  DS: 'support', WS: 'support', MS: 'support', VAL: 'support',
  DR: 'resistance', WR: 'resistance', MR: 'resistance', VAH: 'resistance',
  POC: 'poc', fib0: 'fib', fib1: 'fib',
};
const domainOrder = { VAH: 0, POC: 1, VAL: 2, fib0: 0, fib1: 1 };
const entries = [];
async function saveLevels() {
  try {
    await fetch('/api/levels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries),
    });
  } catch (e) { console.error('saveLevels a echoue:', e); }
}
async function loadLevels() {
  try {
    const res = await fetch('/api/levels');
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      entries.push(...data);
      groupCounter = Math.max(0, ...entries.map(e => e.groupId || 0));
      renderLedger();
      updateScenarioOptions();
    }
  } catch (e) { console.error('loadLevels a echoue:', e); }
}
let activeScope = 'daily-range';
let groupCounter = 0;

function insertToken(input, text) {
  let val = input.value;
  val = val.length === 0 ? text + ' ' : val.trimEnd() + ':' + text + ' ';
  input.value = val;
  input.focus();
}
document.querySelectorAll('.token[data-insert]').forEach(el => {
  el.addEventListener('click', () => {
    const group = el.closest('.panel');
    const input = group.querySelector('.composer-row input');
    insertToken(input, el.dataset.insert);
  });
});
document.querySelectorAll('.token[data-scope]').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.token[data-scope]').forEach(t => t.removeAttribute('data-active'));
    el.setAttribute('data-active', '1');
    activeScope = el.dataset.scope;
    const input = document.getElementById('composerRange');
    let val = input.value;
    const scopes = ['daily-range', 'range', 'big-range'];
    for (const s of scopes) { if (val.startsWith(s + ':')) { val = val.slice(s.length + 1); break; } }
    input.value = activeScope + ':' + val;
    input.focus();
  });
});

function parseLine(raw, defaultScope) {
  raw = raw.trim();
  if (!raw) return [];
  let scope = defaultScope || null;
  const scopes = ['daily-range', 'range', 'big-range'];
  for (const s of scopes) { if (raw.startsWith(s + ':')) { scope = s; raw = raw.slice(s.length + 1); break; } }
  const segments = raw.split(':').map(s => s.trim()).filter(Boolean);
  const out = [];
  segments.forEach(seg => {
    const m = seg.match(/^(\\S+)\\s+([\\d.,]+)$/);
    if (!m) return;
    const token = m[1];
    const price = parseFloat(m[2].replace(',', '.'));
    if (isNaN(price)) return;
    const fam = tokenFam[token] || tokenFam[token.toUpperCase()] || 'support';
    out.push({ token, price, fam, scope });
  });
  return out;
}

function commitEntries(parsed) {
  const now = new Date();
  const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  const groupId = parsed.length > 1 ? ++groupCounter : null;
  parsed.forEach(p => {
    const label = p.scope ? p.token + ' ' + p.scope.split('-')[0] : p.token;
    entries.push({ label, token: p.token, price: p.price, time, fam: p.fam, groupId });
  });
  renderLedger();
  updateScenarioOptions();
}
document.querySelectorAll('button[data-submit]').forEach(btn => {
  btn.addEventListener('click', () => {
    const kind = btn.dataset.submit;
    const inputId = kind === 'points' ? 'composerPoints' : kind === 'fib' ? 'composerFib' : 'composerRange';
    const input = document.getElementById(inputId);
    const defaultScope = kind === 'range' ? activeScope : null;
    const parsed = parseLine(input.value, defaultScope);
    if (parsed.length === 0) return;
    commitEntries(parsed);
    input.value = '';
  });
});

function renderRow(e, idx) {
  const c = famColors[e.fam];
  return '<div class="ledger-row" data-idx="' + idx + '">' +
    '<span class="ledger-badge" style="background:' + c.bg + ';color:' + c.fg + '">' + e.label + '</span>' +
    '<span class="ledger-price mono" data-price-cell="' + idx + '">' + e.price.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '</span>' +
    '<span class="ledger-time">' + e.time + '</span>' +
    '<button class="ledger-edit" data-edit="' + idx + '" aria-label="Modifier">edit</button>' +
    '<button class="ledger-del" data-idx="' + idx + '" aria-label="Supprimer">&times;</button>' +
    '</div>';
}
function startEdit(idx) {
  const cell = document.querySelector('[data-price-cell="' + idx + '"]');
  const current = entries[idx].price;
  cell.innerHTML = '<input type="text" inputmode="decimal" value="' + current + '">';
  const input = cell.querySelector('input');
  input.focus(); input.select();
  function commit() {
    const v = parseFloat(input.value.replace(',', '.'));
    if (!isNaN(v)) entries[idx].price = v;
    renderLedger();
    updateScenarioOptions();
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', ev => { if (ev.key === 'Enter') input.blur(); });
}
function renderLedger() {
  saveLevels();
  const ledger = document.getElementById('ledger');
  if (entries.length === 0) { ledger.innerHTML = '<div class="ledger-empty">Aucun niveau soumis</div>'; return; }
  const rendered = new Set();
  const units = [];
  entries.forEach((e, i) => {
    if (rendered.has(i)) return;
    if (e.groupId != null) {
      const groupIdx = entries.map((x, idx) => idx).filter(idx => entries[idx].groupId === e.groupId);
      groupIdx.forEach(idx => rendered.add(idx));
      units.push({ type: 'group', groupId: e.groupId, idx: groupIdx });
    } else { rendered.add(i); units.push({ type: 'single', idx: i }); }
  });
  units.reverse();
  let html = '';
  units.forEach(u => {
    if (u.type === 'group') {
      const groupEntries = u.idx.map(idx => ({ ...entries[idx], idx }));
      groupEntries.sort((a, b) => (domainOrder[a.token] ?? 99) - (domainOrder[b.token] ?? 99));
      const isFibGroup = groupEntries.some(ge => ge.token === 'fib0') && groupEntries.some(ge => ge.token === 'fib1');
      let fibInfoHtml = '';
      if (isFibGroup) {
        const fib0 = groupEntries.find(ge => ge.token === 'fib0').price;
        const fib1 = groupEntries.find(ge => ge.token === 'fib1').price;
        // Miroir de config.json fibonacci.tp1Ratio/tp2Ratio -- pas synchronise automatiquement,
        // a mettre a jour manuellement ici si ces valeurs changent dans config.json.
        const ratios = [0, 0.382, 0.618, 0.65, 1];
        const rows = ratios.map(r => {
          const p = fib0 + (fib1 - fib0) * r;
          return '<div><span class="fib-ratio">' + r + '</span><span>' + p.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '</span></div>';
        }).join('');
        fibInfoHtml = '<button class="fib-info-btn" data-fib-toggle="' + u.groupId + '" aria-label="Voir les niveaux Fibonacci">i</button>' +
          '<div class="fib-info-panel" id="fib-info-' + u.groupId + '">' + rows + '</div>';
      }
      html += '<div class="ledger-block">' +
        '<button class="ledger-block-del" data-group="' + u.groupId + '" aria-label="Supprimer le groupe">&times;</button>' +
        fibInfoHtml +
        groupEntries.map(ge => renderRow(ge, ge.idx)).join('') + '</div>';
    } else { html += renderRow(entries[u.idx], u.idx); }
  });
  ledger.innerHTML = html;
  ledger.querySelectorAll('.ledger-row > .ledger-del').forEach(btn => {
    btn.addEventListener('click', () => { entries.splice(parseInt(btn.dataset.idx), 1); renderLedger(); updateScenarioOptions(); });
  });
  ledger.querySelectorAll('.ledger-edit').forEach(btn => {
    btn.addEventListener('click', () => startEdit(parseInt(btn.dataset.edit)));
  });
  ledger.querySelectorAll('.ledger-block-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const gid = parseInt(btn.dataset.group);
      for (let i = entries.length - 1; i >= 0; i--) { if (entries[i].groupId === gid) entries.splice(i, 1); }
      renderLedger(); updateScenarioOptions();
    });
  });
  ledger.querySelectorAll('.fib-info-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById('fib-info-' + btn.dataset.fibToggle);
      if (panel) panel.classList.toggle('open');
    });
  });
}

let scenarioModule = 'scalp';
let scenarioDirection = 'long';
const scenarios = [];
async function saveScenarios() {
  try {
    await fetch('/api/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenarios),
    });
  } catch (e) { console.error('saveScenarios a echoue:', e); }
}
async function loadScenarios() {
  try {
    const res = await fetch('/api/scenarios');
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      scenarios.push(...data);
      renderScenarios();
    }
  } catch (e) { console.error('loadScenarios a echoue:', e); }
}
document.querySelectorAll('#scenarioModule .token').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('#scenarioModule .token').forEach(t => t.removeAttribute('data-active'));
    el.setAttribute('data-active', '1'); scenarioModule = el.dataset.mod;
  });
});
document.querySelectorAll('#scenarioDirection .token').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('#scenarioDirection .token').forEach(t => t.removeAttribute('data-active'));
    el.setAttribute('data-active', '1'); scenarioDirection = el.dataset.dir;
  });
});
document.querySelectorAll('.token[data-cond]').forEach(el => {
  el.addEventListener('click', () => insertToken(document.getElementById('scenarioComposer'), el.dataset.cond));
});
const scenarioComposer = document.getElementById('scenarioComposer');
scenarioComposer.addEventListener('input', updateScenarioSubmitState);
document.getElementById('scenarioLevel').addEventListener('change', updateScenarioSubmitState);
function updateScenarioSubmitState() {
  const levelOk = document.getElementById('scenarioLevel').value !== '';
  const condOk = scenarioComposer.value.trim() !== '';
  document.getElementById('scenarioSubmit').disabled = !(levelOk && condOk);
}
document.getElementById('scenarioSubmit').addEventListener('click', () => {
  const levelIdx = document.getElementById('scenarioLevel').value;
  const levelEntry = entries[parseInt(levelIdx)];
  if (!levelEntry) return;
  const conditions = scenarioComposer.value.trim().split(':').map(s => s.trim()).filter(Boolean);
  if (conditions.length === 0) return;
  scenarios.unshift({ module: scenarioModule, direction: scenarioDirection, levelLabel: levelEntry.label, levelPrice: levelEntry.price, conditions });
  renderScenarios();
  scenarioComposer.value = '';
  updateScenarioSubmitState();
});
function renderScenarios() {
  saveScenarios();
  const list = document.getElementById('scenarioList');
  if (scenarios.length === 0) { list.innerHTML = '<div class="ledger-empty">Aucun scenario enregistre</div>'; return; }
  list.innerHTML = scenarios.map((s, i) => {
    const dirClass = s.direction === 'long' ? 'dir-long' : 'dir-short';
    const dirLabel = s.direction === 'long' ? 'LONG' : 'SHORT';
    return '<div class="scenario-card">' +
      '<button class="scenario-card-del" data-sidx="' + i + '" aria-label="Supprimer">&times;</button>' +
      '<div class="scenario-card-head"><span>' + s.module.toUpperCase() + '</span><span class="' + dirClass + '">' + dirLabel + '</span>' +
      '<span class="scenario-card-level">' + s.levelLabel + ' -- ' + s.levelPrice.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '</span></div>' +
      '<div class="scenario-card-conds">' + s.conditions.map(c => '<span class="scenario-chip">' + c + '</span>').join('') + '</div>' +
    '</div>';
  }).join('');
  list.querySelectorAll('.scenario-card-del').forEach(btn => {
    btn.addEventListener('click', () => { scenarios.splice(parseInt(btn.dataset.sidx), 1); renderScenarios(); });
  });
}
function updateScenarioOptions() {
  const sel = document.getElementById('scenarioLevel');
  const current = sel.value;
  sel.innerHTML = '<option value="">-- selectionne un niveau soumis --</option>' +
    entries.map((e, i) => '<option value="' + i + '">' + e.label + ' -- ' + e.price.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '</option>').join('');
  sel.value = current;
  updateScenarioSubmitState();
}

async function loadDiagnostic() {
  const content = document.getElementById('diagContent');
  content.innerHTML = '<div class="ledger-empty">Chargement...</div>';
  try {
    const res = await fetch('/api/diagnostic');
    if (!res.ok) {
      const err = await res.json();
      content.innerHTML = '<div class="ledger-empty">' + (err.detail || err.error || 'Erreur') + '</div>';
      return;
    }
    const data = await res.json();
    content.innerHTML = data.results.map(renderDiagModule).join('');
    const tickerUpdatedEl = document.getElementById('tickerUpdated');
    if (tickerUpdatedEl) tickerUpdatedEl.textContent = new Date(data.updatedAt).toLocaleTimeString('fr-FR');
  } catch (e) {
    content.innerHTML = '<div class="ledger-empty">Erreur reseau: ' + e.message + '</div>';
  }
}
function renderDiagModule(r) {
  const decClass = r.decision === 'CONFLUENCE ATTEINTE' ? 'ok' : r.decision === 'REFUS' ? 'refus' : 'indisponible';
  const rg = r.rawGrid || {};
  const row1 = [['DIV', rg.div], ['S/R', rg.sr], ['VWAP', rg.vwap], ['MONEYFLOW', rg.moneyFlow]];
  const row2 = [['LBW', rg.lbw], ['BW', rg.bw], ['DBSI', rg.dbsi], ['TRIGGER', rg.trigger], ['CADENCE', rg.cadence]];
  const buildRow = (row) => row.map(([label, v]) => {
    const isEmpty = (v === null || v === undefined);
    return '<div class="diag-score"><div class="k">' + label + '</div><div class="v ' + (isEmpty ? 'null' : '') + '">' + (isEmpty ? '--' : v) + '</div></div>';
  }).join('');
  const gridHtml = '<div class="diag-grid-4">' + buildRow(row1) + '</div>' +
    '<div class="diag-grid-5">' + buildRow(row2) + '</div>' +
    '<div class="diag-tf-note">Donnees ' + (rg.tf || '--') + '</div>';
  const detailsHtml = (r.details || []).map(d => '<div>' + d + '</div>').join('');
  return '<div class="diag-module">' +
    '<div class="diag-head"><span class="diag-name">' + r.module.toUpperCase() + '</span>' +
    '<span class="diag-decision ' + decClass + '">' + r.decision + '</span></div>' +
    '<div class="diag-reason">' + r.reason + '</div>' +
    gridHtml +
    '<div class="diag-details">' + detailsHtml + '</div>' +
  '</div>';
}
document.getElementById('diagRefresh').addEventListener('click', loadDiagnostic);

function renderOngoingModule(module, trade) {
  if (!trade) {
    return '<div class="placeholder-note">' + module.toUpperCase() + ' : aucun trade en cours.</div>';
  }
  const dirClass = trade.direction === 'long' ? 'ok' : 'refus';
  return '<div class="diag-module">' +
    '<div class="diag-head"><span class="diag-name">' + module.toUpperCase() + '</span>' +
    '<span class="diag-decision ' + dirClass + '">' + trade.direction.toUpperCase() + '</span></div>' +
    '<div class="diag-details">' +
      '<div>Entree : ' + trade.entryPrice + ' (' + new Date(trade.entryTimestamp).toLocaleTimeString('fr-FR') + ')</div>' +
      '<div>Passages a zero depuis entree : ' + trade.crossingsSinceEntry + (trade.tp1Taken ? ' (TP1 pris)' : '') + '</div>' +
      '<div>Stop loss : ' + (trade.stopLossPrice !== null && trade.stopLossPrice !== undefined ? trade.stopLossPrice : 'pas encore pose') + '</div>' +
      '<div>Levier : ' + trade.leverage + 'x | ' + trade.orderType + ' | ' + trade.openType + ' | taille : ' + trade.positionSizePercent + '%</div>' +
    '</div></div>';
}

function renderExecutedRow(t) {
  const hasPnl = t.pnlPercent !== null && t.pnlPercent !== undefined;
  const pnlClass = hasPnl ? (t.pnlPercent >= 0 ? 'ok' : 'refus') : 'indisponible';
  const pnlText = hasPnl ? t.pnlPercent.toFixed(2) + '%' : '--';
  return '<div class="diag-module">' +
    '<div class="diag-head"><span class="diag-name">' + t.module.toUpperCase() + ' ' + t.direction.toUpperCase() + '</span>' +
    '<span class="diag-decision ' + pnlClass + '">' + pnlText + '</span></div>' +
    '<div class="diag-details">' +
      '<div>Entree : ' + t.entryPrice + ' &rarr; Sortie : ' + t.exitPrice + '</div>' +
      '<div>Motif : ' + t.exitReason + '</div>' +
      '<div>' + new Date(t.entryTimestamp).toLocaleString('fr-FR') + ' &rarr; ' + new Date(t.exitTimestamp).toLocaleString('fr-FR') + '</div>' +
    '</div></div>';
}

async function loadBoono() {
  const el = document.getElementById('tab2-boono');
  if (!el) return;
  try {
    const res = await fetch('/api/boono');
    if (!res.ok) throw new Error('reponse HTTP ' + res.status);
    const d = await res.json();
    let html = '';

    /* Position en cours, avec la chaine de decision qui l'a produite. */
    if (d.position) {
      const p = d.position;
      const col = p.direction === 'long' ? 'var(--support)' : 'var(--resistance)';
      const usd = (p.pnlCourant !== undefined && p.notionnel)
        ? (p.pnlCourant / 100 * p.notionnel * p.restant / 100) : null;
      html += '<div style="border:1px solid #5a6b85; border-radius:4px; padding:10px; margin-bottom:14px;">' +
        '<div style="font-weight:600; color:' + col + '; margin-bottom:6px;">' +
        p.direction.toUpperCase() + ' @ ' + p.entryPrice +
        '  <span style="opacity:0.7; font-weight:400;">depuis ' + (p.dureeMin || 0) + ' min</span></div>' +
        '<div>PNL ' + (p.pnlCourant !== undefined ? p.pnlCourant.toFixed(2) + '%' : 'n/a') +
        (usd !== null ? '  (' + (usd >= 0 ? '+' : '') + usd.toFixed(2) + ' USD)' : '') +
        (p.levier && p.pnlCourant !== undefined
          ? '  --  ' + (p.pnlCourant * p.levier >= 0 ? '+' : '') + (p.pnlCourant * p.levier).toFixed(1) + '% de marge' : '') +
        '  --  restant ' + p.restant + '%</div>' +
        (p.direction_source ? '<div style="opacity:0.75; font-size:11px; margin-top:4px;">direction : ' + p.direction_source +
          (p.voix ? ' (' + p.voix.map(v => v.source).join(', ') + ')' : '') + '</div>' : '') +
        (p.moneyFlowControle ? '<div style="opacity:0.75; font-size:11px;">MoneyFlow : ' + p.moneyFlowControle + '</div>' : '') +
        (p.engagement ? '<div style="opacity:0.75; font-size:11px;">engagement : ' + p.engagement + '</div>' : '') +
        (p.lieu ? '<div style="opacity:0.75; font-size:11px;">lieu : ' + p.lieu.contacts + ' contacts, ' +
          p.lieu.lignes + ' ligne(s)</div>' : '') +
        '</div>';
    } else {
      html += '<div class="placeholder-note" style="margin-bottom:14px;">Aucune position en cours.' +
        (d.abstention ? '<br>Derniere abstention : <b>' + d.abstention + '</b>' : '') + '</div>';
    }

    const h = d.history || [];
    if (!h.length) {
      html += '<div class="placeholder-note">Aucune sortie enregistree.</div>';
      el.innerHTML = html;
      return;
    }

    /* Bilan. Une position produit une ligne par tranche : on regroupe pour
     * compter les ENTREES distinctes, comme dans l'onglet PNL. */
    const entrees = {};
    h.forEach(function (t) {
      if (!entrees[t.entryTimestamp]) entrees[t.entryTimestamp] = { pnl: 0, prix: t.entryPrice };
      entrees[t.entryTimestamp].pnl += (t.fraction / 100) * t.pnlPercent;
    });
    const listeEntrees = Object.values(entrees);
    const total = listeEntrees.reduce(function (a, e) { return a + e.pnl; }, 0);
    const gagnantes = listeEntrees.filter(function (e) { return e.pnl > 0; }).length;
    /* pnlUsd est enregistre depuis le 19/08. Les lignes anterieures retombent
     * sur l'ancien calcul -- signale par un asterisque. */
    let usdTotal = 0, approx = false;
    h.forEach(function (t) {
      if (typeof t.pnlUsd === 'number') usdTotal += t.pnlUsd;
      else { usdTotal += (t.fraction / 100) * t.pnlPercent / 100 * t.entryPrice; approx = true; }
    });

    html += '<div class="stats" style="margin-bottom:12px;">' +
      '<div>' + listeEntrees.length + ' entree(s), ' + h.length + ' ligne(s) de sortie</div>' +
      '<div>Taux de reussite : ' + (100 * gagnantes / listeEntrees.length).toFixed(1) + '%</div>' +
      '<div>PNL cumule : ' + (total >= 0 ? '+' : '') + total.toFixed(2) + '%  (' +
        (usdTotal >= 0 ? '+' : '') + usdTotal.toFixed(2) + ' USD' + (approx ? '*' : '') + ')</div>' +
      '<div style="opacity:0.7; font-size:11px;">notionnel ' + (h[0] && h[0].notionnel ? h[0].notionnel : 100) +
        ' USD par trade (1% de 1000 a 10x)' + (approx ? '  --  * lignes anterieures au 19/08 estimees' : '') + '</div>' +
      '</div>';

    /* Ventilation par motif de sortie -- c'est elle qui dit quel mecanisme
     * porte le resultat et lequel le plombe. */
    const parRaison = {};
    h.forEach(function (t) {
      const k = String(t.exitReason || 'inconnu');
      if (!parRaison[k]) parRaison[k] = { n: 0, pnl: 0, usd: 0 };
      parRaison[k].n++;
      parRaison[k].pnl += (t.fraction / 100) * t.pnlPercent;
      parRaison[k].usd += (typeof t.pnlUsd === 'number')
        ? t.pnlUsd : (t.fraction / 100) * t.pnlPercent / 100 * t.entryPrice;
    });
    html += '<table style="width:100%; margin-bottom:14px;"><thead><tr>' +
      '<th style="text-align:left;">Motif de sortie</th><th>n</th><th>PNL</th><th>USD</th>' +
      '</tr></thead><tbody>';
    Object.keys(parRaison).sort(function (a, b) { return parRaison[a].pnl - parRaison[b].pnl; })
      .forEach(function (k) {
        const v = parRaison[k];
        const c = v.pnl >= 0 ? 'up' : 'down';
        html += '<tr><td style="text-align:left;">' + k + '</td><td>' + v.n + '</td>' +
          '<td class="' + c + '">' + (v.pnl >= 0 ? '+' : '') + v.pnl.toFixed(2) + '%</td>' +
          '<td class="' + c + '">' + (v.usd >= 0 ? '+' : '') + v.usd.toFixed(2) + '</td></tr>';
      });
    html += '</tbody></table>';

    /* Detail, du plus recent au plus ancien. */
    html += '<table style="width:100%;"><thead><tr>' +
      '<th>Entree</th><th>Sortie</th><th>Sens</th><th>Prix in</th><th>Prix out</th>' +
      '<th>Part</th><th>PNL</th><th>USD</th><th style="text-align:left;">Motif</th>' +
      '</tr></thead><tbody>';
    h.slice().reverse().forEach(function (t) {
      const c = t.pnlPercent >= 0 ? 'up' : 'down';
      const usd = (typeof t.pnlUsd === 'number')
        ? t.pnlUsd : (t.fraction / 100) * t.pnlPercent / 100 * t.entryPrice;
      const hm = function (s) { return new Date(s).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' }); };
      html += '<tr><td>' + hm(t.entryTimestamp) + '</td><td>' + hm(t.exitTimestamp) + '</td>' +
        '<td class="' + (t.direction === 'long' ? 'up' : 'down') + '">' + t.direction + '</td>' +
        '<td>' + Math.round(t.entryPrice) + '</td><td>' + Math.round(t.exitPrice) + '</td>' +
        '<td>' + t.fraction + '%</td>' +
        '<td class="' + c + '">' + (t.pnlPercent >= 0 ? '+' : '') + t.pnlPercent.toFixed(2) + '%</td>' +
        '<td class="' + c + '">' + (usd >= 0 ? '+' : '') + usd.toFixed(2) + '</td>' +
        '<td style="text-align:left; font-size:11px; opacity:0.8;">' + String(t.exitReason || '') + '</td></tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = '<div class="placeholder-note">Moteur Boono indisponible : ' + e.message + '</div>';
  }
}

async function loadTrades() {
  loadBoono();
  const ongoingEl = document.getElementById('tab2-ongoing');
  const executedEl = document.getElementById('tab2-executed');
  const pnlEl = document.getElementById('tab2-pnl');
  try {
    const res = await fetch('/api/trades');
    if (!res.ok) throw new Error('reponse HTTP ' + res.status);
    const data = await res.json();
    const modules = ['scalp', 'day', 'swing'];
    ongoingEl.innerHTML = modules.map(m => renderOngoingModule(m, data.ongoing && data.ongoing[m])).join('');
    const executed = (data.executed || []).slice().reverse();
    executedEl.innerHTML = executed.length
      ? executed.map(renderExecutedRow).join('')
      : '<div class="placeholder-note">Aucun trade execute pour le moment.</div>';
    if (executed.length) {
      const withPnl = executed.filter(t => t.pnlPercent !== null && t.pnlPercent !== undefined);
      const wins = withPnl.filter(t => t.pnlPercent >= 0).length;
      const totalPnl = withPnl.reduce((a, t) => a + t.pnlPercent, 0);
      const avgPnl = withPnl.length ? totalPnl / withPnl.length : 0;
      const winRate = withPnl.length ? (wins / withPnl.length * 100) : 0;
      // Comptage des ENTREES distinctes (10/08/2026) : chaque entree genere
      // jusqu'a 3 lignes de sortie (tranches 25/65/10) -- afficher le nombre
      // de lignes donnait un total trompeur (300 lignes pour 141 entrees).
      const entryKeys = new Set(executed.map(t => t.entryTimestamp + '|' + t.module));
      const nbEntrees = entryKeys.size;
      const pnlParEntree = nbEntrees ? totalPnl / nbEntrees : 0;
      let btcPrice = '--';
      try {
        const bs = await (await fetch('/api/baton-state')).json();
        if (bs && bs.lastPrice) btcPrice = Number(bs.lastPrice).toLocaleString('fr-FR');
      } catch (e) { /* prix indisponible */ }
      pnlEl.innerHTML = '<div class="diag-module"><div class="diag-details">' +
        '<div style="font-size:20px; font-weight:600; margin-bottom:8px;">BTC : ' + btcPrice + ' USDT</div>' +
        '<div>Entrees : <b>' + nbEntrees + '</b>  (' + executed.length + ' lignes de sortie)</div>' +
        '<div>Taux de reussite (simule) : ' + winRate.toFixed(1) + '% (' + wins + '/' + withPnl.length + ' lignes)</div>' +
        '<div>PNL cumule (simule) : ' + totalPnl.toFixed(2) + '%</div>' +
        '<div>PNL moyen par ENTREE : ' + pnlParEntree.toFixed(2) + '%</div>' +
        '<div style="opacity:0.6; font-size:11px;">PNL moyen par ligne : ' + avgPnl.toFixed(2) + '%</div>' +
      '</div></div>';
    } else {
      pnlEl.innerHTML = '<div class="placeholder-note">P/L -- aucune donnee disponible.<br>Alimentation automatique une fois des trades executes.</div>';
    }
  } catch (e) {
    ongoingEl.innerHTML = '<div class="ledger-empty">Erreur reseau: ' + e.message + '</div>';
  }
}

function fmtNum(v, digits) {
  if (v === undefined || v === null || isNaN(v)) return '\u2014';
  return v.toFixed(digits);
}
function signStyle(v) {
  if (v === undefined || v === null || isNaN(v)) return '';
  if (v > 0) return 'color:#26a69a;';
  if (v < 0) return 'color:#ef5350;';
  return '';
}
function dirArrowAudit(direction) {
  if (direction === 'haussier') return '<span style="color:#26a69a;">&#9650;</span>';
  if (direction === 'baissier') return '<span style="color:#ef5350;">&#9660;</span>';
  if (direction === 'neutre') return '0';
  return '\u2014';
}
function fmtTimeParis(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function loadAudit() {
  const wrap = document.getElementById('auditTableWrap');
  const statsEl = document.getElementById('auditStats');
  const reversalDeltaT = parseFloat(document.getElementById('auditReversalDelta').value) || 6;
  const reversalProxT = parseFloat(document.getElementById('auditReversalProx').value) || 7;
  const confirmCadenceT = parseFloat(document.getElementById('auditConfirmCadence').value) || 3;
  const confirmNetMoveT = parseFloat(document.getElementById('auditConfirmNetMove').value) || 2;
  const bypassCadenceT = parseFloat(document.getElementById('auditBypassCadence').value) || 7;
  const bypassNetMoveT = parseFloat(document.getElementById('auditBypassNetMove').value) || 5;

  try {
    const res = await fetch('/api/audit-history');
    if (!res.ok) throw new Error('reponse HTTP ' + res.status);
    const data = await res.json();
    const rows = data.history || [];
    if (rows.length === 0) {
      wrap.innerHTML = '<div class="placeholder-note">Aucune donnee pour le moment -- le baton-relay doit tourner un moment.</div>';
      statsEl.innerHTML = '';
      return;
    }

    const NETMOVE_BASELINE_WINDOW = 10;
    let prevVwap3 = null;
    let vigilanceActive = false, vigilanceCounter = 0;
    const VIGILANCE_WINDOW = 6;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      r.deltaVwap3 = (prevVwap3 !== null && r.vwap3 !== null) ? (r.vwap3 - prevVwap3) : null;
      if (r.vwap3 !== null) prevVwap3 = r.vwap3;

      const start = Math.max(0, i - NETMOVE_BASELINE_WINDOW);
      const prior = rows.slice(start, i).filter(p => p.netMove !== null && p.netMove !== undefined);
      const baseline = prior.length > 0 ? prior.reduce((a, p) => a + Math.abs(p.netMove), 0) / prior.length : null;
      r.netMoveMult = (baseline !== null && baseline > 0 && r.netMove !== null) ? Math.abs(r.netMove) / baseline : null;

      r.isReversal = (r.deltaVwap3 !== null && Math.abs(r.deltaVwap3) >= reversalDeltaT)
        && (r.vwap3 !== null && Math.abs(r.vwap3) <= reversalProxT);
      r.isConfirm = (r.cadenceMult !== null && r.cadenceMult >= confirmCadenceT)
        || (r.netMoveMult !== null && r.netMoveMult >= confirmNetMoveT);
      r.isBypass = (r.cadenceMult !== null && r.cadenceMult >= bypassCadenceT)
        || (r.netMoveMult !== null && r.netMoveMult >= bypassNetMoveT);

      r.isTrade = false;
      if (r.isReversal) { vigilanceActive = true; vigilanceCounter = 0; }
      else if (vigilanceActive) { vigilanceCounter++; if (vigilanceCounter > VIGILANCE_WINDOW) vigilanceActive = false; }
      if (vigilanceActive && r.isConfirm) { r.isTrade = true; vigilanceActive = false; }
    }

    let reversals = 0, trades = 0, bypasses = 0, crosses = 0;
    for (const r of rows) {
      if (r.isReversal) reversals++;
      if (r.isTrade) trades++;
      if (r.isBypass) bypasses++;
      if (r.vwap15Cross || r.vwap3Cross) crosses++;
    }
    statsEl.innerHTML = rows.length + ' relev\u00e9s (24h glissantes) &middot; ' + crosses + ' passages \u00e0 z\u00e9ro &middot; ' + reversals + ' retournements imminents &middot; <span style="color:#2ecc71">' + trades + ' TRADE</span> &middot; <span style="color:#ff6b35">' + bypasses + ' BYPASS</span>';

    const recent = rows.slice(-200);
    let html = '<table style="width:100%; border-collapse:collapse; font-family:monospace; font-size:11px;">' +
      '<thead><tr style="color:var(--faint); text-align:right;">' +
      '<th style="text-align:left;">Heure (Paris)</th><th>Prix</th><th>High</th><th>Low</th>' +
      '<th>VWAP3</th><th>&Delta;VWAP3</th><th>&times;0</th><th>VWAP15</th><th>&times;0</th>' +
      '<th>Cadence</th><th>Mult.</th><th>Sens3</th><th>NetMove</th><th>NM&times;</th><th>Amplitude</th><th>WinSec</th>' +
      '<th>Dir.</th><th>Retourn.</th><th>Signal</th>' +
      '</tr></thead><tbody>';

    for (const r of recent) {
      const rowStyle = r.isTrade ? 'background:#123a2a;' : (r.isBypass ? 'background:#2a1a10;' : (r.isReversal ? 'background:#3a2a5a;' : ''));
      let signalCell = '';
      if (r.isTrade) signalCell = '<b style="color:#2ecc71;">TRADE</b>';
      else if (r.isBypass) signalCell = '<b style="color:#ff6b35;">BYPASS</b>';
      html += '<tr style="' + rowStyle + ' border-bottom:1px solid var(--border);">' +
        '<td style="text-align:left;">' + fmtTimeParis(r.ts) + '</td>' +
        '<td>' + fmtNum(r.lastPrice,1) + '</td>' +
        '<td>' + fmtNum(r.priceHigh,1) + '</td>' +
        '<td>' + fmtNum(r.priceLow,1) + '</td>' +
        '<td style="' + signStyle(r.vwap3) + '">' + fmtNum(r.vwap3,2) + '</td>' +
        '<td style="' + signStyle(r.deltaVwap3) + '">' + fmtNum(r.deltaVwap3,2) + '</td>' +
        '<td>' + (r.vwap3Cross ? '&#10003;' : '') + '</td>' +
        '<td style="' + signStyle(r.vwap15) + '">' + fmtNum(r.vwap15,2) + '</td>' +
        '<td>' + (r.vwap15Cross ? '&#10003;' : '') + '</td>' +
        '<td>' + fmtNum(r.cadence,2) + '</td>' +
        '<td>' + fmtNum(r.cadenceMult,2) + 'x</td>' +
        '<td>' + (r.priceSens3 > 0 ? '&#9650;' : (r.priceSens3 < 0 ? '&#9660;' : '0')) + '</td>' +
        '<td style="' + signStyle(r.netMove) + '">' + fmtNum(r.netMove,4) + '</td>' +
        '<td>' + fmtNum(r.netMoveMult,2) + '</td>' +
        '<td>' + fmtNum(r.amplitude,4) + '</td>' +
        '<td>' + fmtNum(r.winSec,1) + '</td>' +
        '<td>' + dirArrowAudit(r.direction) + '</td>' +
        '<td>' + (r.isReversal ? '&#9888;' : '') + '</td>' +
        '<td>' + signalCell + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    wrap.innerHTML = html;
  } catch (e) {
    wrap.innerHTML = '<div class="ledger-empty">Erreur reseau: ' + e.message + '</div>';
  }
}
document.getElementById('auditOpenBtn') && document.getElementById('auditOpenBtn').addEventListener('click', function() { window.open('/audit-view', '_blank'); });

const FIELDS = [
  { group: 'Contexte de trading', key: 'positionSizing.maxCapitalPercentPerTrade', label: 'Capital max par trade', unit: '%', info: 'Pourcentage du capital risque sur un seul trade' },
  { group: 'Contexte de trading', key: 'leverage.scalp.min', label: 'Levier scalp (min)', unit: 'x', info: 'Levier minimum autorise pour les trades scalp' },
  { group: 'Contexte de trading', key: 'leverage.scalp.max', label: 'Levier scalp (max)', unit: 'x', info: 'Levier maximum autorise pour les trades scalp' },
  { group: 'Contexte de trading', key: 'leverage.day.min', label: 'Levier day (min)', unit: 'x', info: 'Levier minimum autorise pour les trades day' },
  { group: 'Contexte de trading', key: 'leverage.day.max', label: 'Levier day (max)', unit: 'x', info: 'Levier maximum autorise pour les trades day' },
  { group: 'Contexte de trading', key: 'leverage.swing.min', label: 'Levier swing (min)', unit: 'x', info: 'Levier minimum autorise pour les trades swing' },
  { group: 'Contexte de trading', key: 'leverage.swing.max', label: 'Levier swing (max)', unit: 'x', info: 'Levier maximum autorise pour les trades swing' },
  { group: 'Contexte de trading', key: 'fibonacci.tp1Ratio', label: 'Fibonacci TP1', unit: '', info: 'Ratio de retracement pour la premiere prise de profit' },
  { group: 'Contexte de trading', key: 'fibonacci.tp2Ratio', label: 'Fibonacci TP2', unit: '', info: 'Ratio de retracement pour la deuxieme prise de profit' },
  { group: 'Contexte de trading', key: 'shlongStructure.tp1Percent', label: 'Shlong TP1', unit: '%', info: 'Part de la position fermee au premier palier' },
  { group: 'Contexte de trading', key: 'shlongStructure.tp2Percent', label: 'Shlong TP2', unit: '%', info: 'Part fermee au declenchement du mouvement inverse' },
  { group: 'Contexte de trading', key: 'shlongStructure.hedgePercent', label: 'Shlong hedge', unit: '%', info: 'Part maintenue comme assurance dans la bascule long/short' },

  { group: 'Echelles de score', key: 'scoring.divergence.points.1tf', label: 'Divergence 1 TF', unit: 'pts', info: 'Points si la divergence est visible sur un seul timeframe' },
  { group: 'Echelles de score', key: 'scoring.divergence.points.2tf', label: 'Divergence 2 TF', unit: 'pts', info: 'Points si visible sur deux timeframes actifs en meme temps' },
  { group: 'Echelles de score', key: 'scoring.divergence.points.3tf', label: 'Divergence 3 TF', unit: 'pts', info: 'Points si visible sur trois timeframes actifs en meme temps' },
  { group: 'Echelles de score', key: 'scoring.divergence.points.multidiv', label: 'Multidiv', unit: 'pts', info: 'Plusieurs points contre la meme ancre, seulement si 3TF deja atteint' },
  { group: 'Echelles de score', key: 'scoring.rangeSR.points.toucheSimple', label: 'S/R : touche simple', unit: 'pts', info: 'Prix dans la zone de tolerance, rien confirme' },
  { group: 'Echelles de score', key: 'scoring.rangeSR.points.retestConfirme', label: 'S/R : retest confirme', unit: 'pts', info: 'Touche puis eloignement puis retour confirme' },
  { group: 'Echelles de score', key: 'scoring.rangeSR.points.confluenceScenario', label: 'S/R : confluence scenario', unit: 'pts', info: 'Le niveau confirme un scenario etabli' },
  { group: 'Echelles de score', key: 'srZone.tolerancePercent', label: 'Tolerance zone S/R', unit: '%', info: 'Largeur de la zone consideree "au niveau" pour un S/R fixe' },
  { group: 'Echelles de score', key: 'srZone.ma200TolerancePercent', label: 'Tolerance MA200', unit: '%', info: 'Tolerance de touche specifique a la MA200 (plus stricte que le S/R fixe)' },
  { group: 'Echelles de score', key: 'srZone.ma200MinDeviationPercent', label: 'Eloignement min MA200', unit: '%', info: 'Ecart minimum entre une touche et un retest pour ecarter le bruit' },

  { group: 'Unite de score', key: 'scoring.momentum.thresholds.values.0', label: 'Momentum seuil 1', unit: '', info: 'Seuil bas de palier pour la notation Momentum (1-5)' },
  { group: 'Unite de score', key: 'scoring.moneyFlow.thresholds.values.0', label: 'MoneyFlow seuil 1', unit: '', info: 'Seuil bas de palier pour la notation MoneyFlow (1-5)' },
  { group: 'Unite de score', key: 'scoring.dbsi.thresholds.values.0', label: 'DBSI seuil 1', unit: '', info: 'Seuil bas de palier pour la notation DBSI (1-5)' },
  { group: 'Unite de score', key: 'scoring.trigger.thresholds.values.0', label: 'Trigger seuil 1', unit: '%', info: 'Seuil bas de palier pour la notation Trigger (1-4)' },
  { group: 'Unite de score', key: 'scoring.vwap.thresholds.values.0', label: 'VWAP seuil 1', unit: '', info: 'Seuil bas de palier pour la force de retournement VWAP (LBW-BW)' },
  { group: 'Unite de score', key: 'scoring.vwap.nearZeroThreshold', label: 'VWAP proximite zero', unit: '', info: 'Seuil en dessous duquel le VWAP est considere proche de zero (retournement en cours)' },
  { group: 'Unite de score', key: 'scoring.cadence.thresholds.values.0', label: 'Cadence seuil 1', unit: 'ticks/s', info: 'Seuil bas de palier pour la densite temporelle du Trigger' },
  { group: 'Unite de score', key: 'divergence.maxChainHours.3m', label: 'Expiration divergence 3m', unit: 'h', info: 'Duree max d une chaine de divergence avant expiration (3m)' },

  { group: 'Seuils par module', key: 'entryRules.scalp.totalThreshold', label: 'Seuil total scalp', unit: 'pts', info: 'Score total minimum pour valider un scalp' },
  { group: 'Seuils par module', key: 'entryRules.day.totalThreshold', label: 'Seuil total day', unit: 'pts', info: 'Score total minimum pour valider un day' },
  { group: 'Seuils par module', key: 'volumeBypass.requires.momentum', label: 'Bypass: Momentum min', unit: '/5', info: 'Minimum Momentum pour une entree scalp anticipee' },
  { group: 'Seuils par module', key: 'volumeBypass.requires.moneyFlow', label: 'Bypass: MoneyFlow min', unit: '/5', info: 'Minimum Money Flow pour une entree scalp anticipee' },
  { group: 'Seuils par module', key: 'volumeBypass.requires.dbsi', label: 'Bypass: DBSI min', unit: '/5', info: 'Minimum DBSI pour une entree scalp anticipee' },
  { group: 'Seuils par module', key: 'volumeBypass.requires.trigger', label: 'Bypass: Trigger min', unit: '/4', info: 'Minimum Trigger pour une entree scalp anticipee' },

  { group: 'Garde-fous', key: 'circuitBreakers.dynamicStopProfitPercent.scalp', label: 'Stop dynamique scalp', unit: '%', info: 'Seuil de resserrement du stop une fois en profit (scalp)' },
  { group: 'Garde-fous', key: 'circuitBreakers.dynamicStopProfitPercent.day', label: 'Stop dynamique day', unit: '%', info: 'Seuil de resserrement du stop une fois en profit (day)' },
  { group: 'Garde-fous', key: 'circuitBreakers.dynamicStopProfitPercent.swing', label: 'Stop dynamique swing', unit: '%', info: 'Seuil de resserrement du stop une fois en profit (swing)' },
];

function getPath(obj, p) { return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function setPath(obj, p, value) {
  const keys = p.split('.'); let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) { if (cur[keys[i]] == null) cur[keys[i]] = {}; cur = cur[keys[i]]; }
  cur[keys[keys.length - 1]] = value;
}
let currentConfig = null;
async function loadParams() {
  const res = await fetch('/api/config');
  currentConfig = await res.json();
  renderParams();
}
function renderParams() {
  document.getElementById('lastUpdated').textContent = currentConfig._lastUpdated ? 'maj: ' + currentConfig._lastUpdated : '';
  const groups = [];
  for (const f of FIELDS) { if (!groups.includes(f.group)) groups.push(f.group); }
  let html = '';
  for (const g of groups) {
    html += '<h2 class="eyebrow" style="margin-top:14px">' + g + '</h2><div class="panel">';
    for (const f of FIELDS.filter(function(x) { return x.group === g; })) {
      const val = getPath(currentConfig, f.key);
      const isNull = (val === null || val === undefined);
      html += '<div class="scenario-row" style="border-bottom:1px solid var(--border);padding-bottom:6px;">';
      html += '<span class="label" style="width:auto;flex:1;" title="' + f.info + '">' + f.label + '</span>';
      html += '<input type="text" inputmode="decimal" data-key="' + f.key + '"';
      html += ' style="width:90px;text-align:right;padding:6px 8px;border-radius:6px;border:1px solid ' + (isNull ? 'var(--poc)' : 'var(--border)') + ';background:var(--page);font-family:monospace;font-size:12px;"';
      html += ' value="' + (isNull ? '' : val) + '"';
      html += ' placeholder="' + (isNull ? 'non defini' : '') + '"></div>';
    }
    html += '</div>';
  }
  html += '<div class="composer-row" style="margin-top:10px;">';
  html += '<button style="flex:1;padding:10px;" onclick="saveParams()">Enregistrer</button>';
  html += '<button style="background:var(--card);color:var(--muted);border:1px solid var(--border);" onclick="document.getElementById(\\'logoutForm\\').submit()">Deconnexion</button>';
  html += '</div><div id="paramsStatus" style="font-size:11px;text-align:center;margin-top:6px;height:1.2em;"></div>';
  document.getElementById('paramsApp').innerHTML = html;
}
async function saveParams() {
  const inputs = document.querySelectorAll('#paramsApp input[data-key]');
  for (const inp of inputs) {
    const raw = inp.value.trim();
    if (raw === '') { setPath(currentConfig, inp.dataset.key, null); continue; }
    const num = Number(raw);
    setPath(currentConfig, inp.dataset.key, isNaN(num) ? raw : num);
  }
  const statusEl = document.getElementById('paramsStatus');
  try {
    const res = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentConfig) });
    if (!res.ok) throw new Error('Echec sauvegarde');
    statusEl.textContent = 'Enregistre.'; statusEl.style.color = 'var(--support)';
    loadParams();
  } catch (e) { statusEl.textContent = 'Erreur: ' + e.message; statusEl.style.color = 'var(--resistance)'; }
}
loadLevels();
loadScenarios();
document.getElementById('chatToggle').addEventListener('click', () => {
  document.getElementById('chatPanel').classList.add('open');
});
document.getElementById('chatClose').addEventListener('click', () => {
  document.getElementById('chatPanel').classList.remove('open');
});
function appendChatMessage(role, text) {
  const box = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = role === 'user' ? 'msg-user' : 'msg-bot';
  const span = document.createElement('span');
  span.textContent = text;
  div.appendChild(span);
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  appendChatMessage('user', text);
  input.value = '';
  appendChatMessage('bot', '...');
  const box = document.getElementById('chatMessages');
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    box.removeChild(box.lastChild);
    appendChatMessage('bot', data.reply || ('Erreur: ' + data.error));
  } catch (e) {
    box.removeChild(box.lastChild);
    appendChatMessage('bot', 'Erreur reseau: ' + e.message);
  }
}
document.getElementById('chatSend').addEventListener('click', sendChatMessage);
document.getElementById('chatInput').addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); sendChatMessage(); }
});
  `);
});

app.listen(PORT, () => {
  console.log(`[config-server] en ecoute sur le port ${PORT}`);
});
