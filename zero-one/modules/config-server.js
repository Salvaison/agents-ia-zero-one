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
        </div>
      </div>

      <!-- ═══════════════ AUDIT (baton de relais) ═══════════════ -->
      <div class="main-section" id="section-audit">
        <div class="panel">
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:10px; font-size:11px; color:var(--faint);">
            <label>Retournement |&Delta;VWAP3|&ge; <input type="number" id="auditReversalDelta" value="6" step="0.5" style="width:48px;"></label>
            <label>et |VWAP3|&le; <input type="number" id="auditReversalProx" value="7" step="0.5" style="width:48px;"></label>
            <label>Confirm. cadenceMult&ge; <input type="number" id="auditConfirmCadence" value="3" step="0.1" style="width:48px;"></label>
            <label>ou netMoveMult&ge; <input type="number" id="auditConfirmNetMove" value="2" step="0.1" style="width:48px;"></label>
            <label>Bypass cadenceMult&ge; <input type="number" id="auditBypassCadence" value="7" step="0.5" style="width:48px;"></label>
            <label>ou netMoveMult&ge; <input type="number" id="auditBypassNetMove" value="5" step="0.5" style="width:48px;"></label>
            <button class="diag-refresh" id="auditRefresh">Rafraichir</button>
          </div>
          <div id="auditStats" style="font-size:11px; color:var(--faint); margin-bottom:8px;"></div>
          <div id="auditTableWrap" style="overflow-x:auto; max-height:70vh; overflow-y:auto;">
            <div class="placeholder-note">Chargement de l'historique...</div>
          </div>
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
      loadAudit();
      auditAutoRefresh = setInterval(loadAudit, 30000);
    }
    if (el.dataset.main === 'parametres') loadParams();
  });
});

document.querySelectorAll('.tab[data-tab2]').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-tab2]').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#tab2-ongoing, #tab2-executed, #tab2-pnl').forEach(p => p.classList.remove('active'));
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

async function loadTrades() {
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
      pnlEl.innerHTML = '<div class="diag-module"><div class="diag-details">' +
        '<div>Trades executes : ' + executed.length + '</div>' +
        '<div>Taux de reussite (simule) : ' + winRate.toFixed(1) + '% (' + wins + '/' + withPnl.length + ')</div>' +
        '<div>PNL cumule (simule) : ' + totalPnl.toFixed(2) + '%</div>' +
        '<div>PNL moyen par trade : ' + avgPnl.toFixed(2) + '%</div>' +
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
      wrap.innerHTML = '<div class="placeholder-note">Aucune donnee pour l\'instant -- le baton-relay doit tourner un moment.</div>';
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
document.getElementById('auditRefresh') && document.getElementById('auditRefresh').addEventListener('click', loadAudit);

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
