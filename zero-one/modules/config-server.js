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
const {readRecentNdjson}=require('./v3lab/storage/rotating-ndjson');
const divergenceLineageShadow=require('./v3lab/experiments/divergence-lineage-shadow');
const divergenceCausalShadow=require('./v4/experiments/divergence-causal-shadow');

const PORT = process.env.CONFIG_UI_PORT || 80;
const PASSWORD = process.env.CONFIG_UI_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const CONFIG_PATH = path.join(__dirname, '../config.json');
const DIAGNOSTIC_PATH = path.join(__dirname, '../data/latest-evaluation.json');
const TRADES_V2_STATE_PATH = path.join(__dirname, '../data/trade-sim-v4-state.json');
const TRADES_V2_HISTORY_PATH = path.join(__dirname, '../data/trade-sim-v4-history.json');
const TRADES_V2_DECISIONS_PATH = path.join(__dirname, '../data/trade-sim-v4-decisions.ndjson');
const TRADES_V2_EVAL_PATH = path.join(__dirname, '../data/trade-sim-v4-evaluations.ndjson');
const TRADES_V2_WAVES_PATH = path.join(__dirname, '../data/trade-sim-v4-waves.json');
const TRADES_V3_ARCHIVE_HISTORY_PATH = path.join(__dirname, '../data/trade-sim-v3lab-history.json');
/* Moteur Boono (19/08/2026) -- seconde logique, fichiers separes. */
const BOONO_STATE_PATH = path.join(__dirname, '../data/moteur-boono-state.json');
const BOONO_HISTORY_PATH = path.join(__dirname, '../data/moteur-boono-history.json');
const AUDIT_HISTORY_PATH = path.join(__dirname, '../data/audit-history.json');
const WAVE_REPLAY_PATH = path.join(__dirname, '../data/replays/wave-replay-2026-10-02-six-losses.json');
const WAVE_MCB_DIR = '/root/agents-ia-zero-one/data/mcb-live';

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
/* En-tete de tableau fixe au defilement (06/09/2026) : les noms de colonnes
 * restent lisibles quand on parcourt les releves. */
#tabs { position: sticky; top: 0; z-index: 5; background: #0d1117; padding: 6px 0; }
thead th { position: sticky; z-index: 3; }

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
  let state = { version: 'v4-prototype-0.1', modules: { scalp: null, day: null, swing: null } };
  let history = [];
  let decisions = [];
  let waves = [];
  let archivedV3 = [];
  let lastDecision = null;
  try {
    if (fs.existsSync(TRADES_V2_STATE_PATH)) state = JSON.parse(fs.readFileSync(TRADES_V2_STATE_PATH, 'utf8'));
  } catch (e) { /* etat absent ou transitoirement illisible */ }
  try {
    if (fs.existsSync(TRADES_V2_HISTORY_PATH)) {
      const h = JSON.parse(fs.readFileSync(TRADES_V2_HISTORY_PATH, 'utf8'));
      history = Array.isArray(h) ? h : [];
    }
  } catch (e) { /* historique vide */ }
  try {
    const d = readRecentNdjson(TRADES_V2_DECISIONS_PATH,1);
    lastDecision = Array.isArray(d) && d.length ? d[d.length - 1] : null;
  } catch (e) { /* decision absente */ }
  try {
    if (fs.existsSync(TRADES_V2_WAVES_PATH)) {
      const w = JSON.parse(fs.readFileSync(TRADES_V2_WAVES_PATH, 'utf8'));
      waves = Array.isArray(w) ? w.slice(-50) : [];
    }
  } catch (e) { /* vagues vides */ }
  try {
    if (fs.existsSync(TRADES_V3_ARCHIVE_HISTORY_PATH)) {
      const h3 = JSON.parse(fs.readFileSync(TRADES_V3_ARCHIVE_HISTORY_PATH, 'utf8'));
      archivedV3 = Array.isArray(h3) ? h3 : [];
    }
  } catch (e) { /* archive V3 vide */ }

  /* API UI legere : l'historique synthétique reste complet, mais les gros
   * contextes entry/exit ne sont envoyés que pour les derniers rapports.
   * Les fichiers source complets restent inchangés sur disque. */
  const ongoing = state.modules || { scalp: null, day: null, swing: null };
  const executedFull = history.map(t => Object.assign({}, t, {
    pnlPercent: t.pnlPercentLeveraged !== undefined ? t.pnlPercentLeveraged : t.pnlPercentPrice,
  }));
  const tradeSummary = (t) => ({
    version:t&&t.version||null,module:t&&t.module||'day',direction:t&&t.direction||null,
    entryTimestamp:t&&t.entryTimestamp||null,exitTimestamp:t&&t.exitTimestamp||null,
    entryPrice:t&&t.entryPrice,exitPrice:t&&t.exitPrice,
    exitKind:t&&t.exitKind||null,exitReason:t&&t.exitReason||null,
    pnlPercent:t&&t.pnlPercent,
    pnlPercentPrice:t&&t.pnlPercentPrice,pnlPercentLeveraged:t&&t.pnlPercentLeveraged,pnlUsd:t&&t.pnlUsd,
    netPnlUsd:t&&t.netPnlUsd,grossPnlUsd:t&&t.grossPnlUsd,grossPnlPercentLeveraged:t&&t.grossPnlPercentLeveraged,
    tradingFeesUsd:t&&t.tradingFeesUsd,entryFeeUsd:t&&t.entryFeeUsd,partialExitFeesUsd:t&&t.partialExitFeesUsd,
    finalExitFeeUsd:t&&t.finalExitFeeUsd,feeModel:t&&t.feeModel||null,fundingMode:t&&t.fundingMode||null,
    marginUsd:t&&t.marginUsd,notionalUsd:t&&t.notionalUsd,
    remainingMarginUsd:t&&t.remainingMarginUsd,remainingNotionalUsd:t&&t.remainingNotionalUsd,
    realizedPnlUsd:t&&t.realizedPnlUsd,grossRealizedPnlUsd:t&&t.grossRealizedPnlUsd,
    runnerPnlUsd:t&&t.runnerPnlUsd,tp1Taken:!!(t&&t.tp1Taken),tpEvents:t&&t.tpEvents||[],
    tpOptimizationShadow:t&&t.tpOptimizationShadow||null,
    mfeUsd:t&&t.mfeUsd,maeUsd:t&&t.maeUsd,mfePnlUsd:t&&t.mfePnlUsd,maeLossUsd:t&&t.maeLossUsd,
    mfeCapturedPct:t&&t.mfeCapturedPct,godYieldSeen:!!(t&&t.godYieldSeen),
    entryArchetype:t&&t.entryContext&&t.entryContext.opportunity&&t.entryContext.opportunity.archetype||null
  });
  const executed = executedFull.map(tradeSummary);
  const reports = executedFull.slice(-12);
  const archivedV3Summary = archivedV3.map(tradeSummary);
  const stateUi = {
    version:state.version||null,
    modules:state.modules||{scalp:null,day:null,swing:null},
    lastEvaluation:state.lastEvaluation||null,
    startedAt:state.startedAt||null,
    migratedAt:state.migratedAt||null,
    previousVersion:state.previousVersion||null
  };
  const lastDecisionUi = lastDecision ? {
    ts:lastDecision.ts||null,action:lastDecision.action||null,reason:lastDecision.reason||null,
    module:lastDecision.module||null,version:lastDecision.version||null
  } : null;
  res.json({
    version: state.version || 'v4-prototype-0.1',
    ongoing,
    executed,
    reports,
    reportMeta:{detailCount:reports.length,totalCount:executedFull.length},
    state:stateUi,
    decisions:[],
    waves:[],
    archivedV3:archivedV3Summary,
    lastDecision:lastDecisionUi,
  });
});

// Rapport V4 complet a la demande depuis la Wave.
// Un seul trade est lu/envoye au clic afin de garder /api/trades leger.
app.get('/api/trade-report/:tradeNo', requireAuth, (req, res) => {
  try {
    const tradeNo=Number(req.params.tradeNo);
    if(!Number.isInteger(tradeNo)||tradeNo<1)return res.status(400).json({error:'numero de trade invalide'});
    let history=[],state={};
    try{
      if(fs.existsSync(TRADES_V2_HISTORY_PATH)){
        const h=JSON.parse(fs.readFileSync(TRADES_V2_HISTORY_PATH,'utf8'));
        history=Array.isArray(h)?h:[];
      }
    }catch(_){}
    try{
      if(fs.existsSync(TRADES_V2_STATE_PATH))state=JSON.parse(fs.readFileSync(TRADES_V2_STATE_PATH,'utf8'));
    }catch(_){}
    if(tradeNo<=history.length){
      res.set('Cache-Control','no-store');
      return res.json({tradeNo,status:'CLOSED',trade:history[tradeNo-1]});
    }
    const open=state.modules&&state.modules.day;
    if(open&&tradeNo===history.length+1){
      res.set('Cache-Control','no-store');
      return res.json({tradeNo,status:'OPEN',module:'day',trade:open});
    }
    return res.status(404).json({error:'trade introuvable',tradeNo});
  }catch(e){
    res.status(500).json({error:'rapport trade indisponible',detail:e.message});
  }
});
/* Moteur Boono (19/08/2026) -- seconde logique, fichiers separes.
 * Meme protection que les autres routes : requireAuth. */
/* Maquette diagnostic vagues 3m/15m — replay fige, aucun impact trading. */
app.get('/api/wave-replay', requireAuth, (req, res) => {
  try {
    if (!fs.existsSync(WAVE_REPLAY_PATH)) return res.status(404).json({ error: 'replay vagues indisponible' });
    const data=JSON.parse(fs.readFileSync(WAVE_REPLAY_PATH, 'utf8'));
    waveUiDecorateMa(data.frames||[]);
    if(Array.isArray(data.frames)&&data.frames.length){
      const start=Number(data.frames[0].ts),end=Number(data.frames[data.frames.length-1].ts);
      data.signalEvents={wave3:waveUiSignalRows('3m',start,end),wave15:waveUiSignalRows('15m',start,end)};
    }
    data.sourceContract=data.sourceContract||{};
    data.sourceContract.ma200='MCB CSV MA200, diagnostic only; test episode = bar range within 0.03% of MA200';
    res.set('Cache-Control', 'no-store');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'replay vagues illisible', detail: e.message });
  }
});

function waveUiFinite(v) {
  return v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
}

function waveUiReadTailText(file,maxBytes=524288){
  try{
    const st=fs.statSync(file),size=st.size,start=Math.max(0,size-maxBytes),len=size-start;
    const fd=fs.openSync(file,'r'),buf=Buffer.alloc(len);
    try{fs.readSync(fd,buf,0,len,start);}finally{fs.closeSync(fd);}
    let txt=buf.toString('utf8');
    if(start>0){const i=txt.indexOf('\n');if(i>=0)txt=txt.slice(i+1);}
    return txt;
  }catch(_){return '';}
}
function waveUiMaRows(tf,startTs,endTs){
  const base=path.join(WAVE_MCB_DIR,'mcb_'+tf+'.csv');
  const live=path.join(WAVE_MCB_DIR,'mcb_'+tf+'_live.csv');
  const rows=[];
  function consume(txt,isLive){
    if(!txt)return;
    txt.split(/\r?\n/).forEach(function(line){
      if(!line||line.startsWith('timestamp,'))return;
      const v=line.split(','),ts=Date.parse(v[0]);
      if(!Number.isFinite(ts)||ts<startTs-3600000||ts>endTs+3600000)return;
      const high=Number(v[2]),low=Number(v[3]),close=Number(v[4]),ma=Number(v[12]);
      if(![high,low,close,ma].every(Number.isFinite))return;
      rows.push({ts,high,low,close,ma200:ma,isLive:!!isLive});
    });
  }
  consume(waveUiReadTailText(base),false);
  try{consume(fs.readFileSync(live,'utf8'),true);}catch(_){}
  rows.sort((a,b)=>a.ts-b.ts||(a.isLive?1:-1));
  const dedup=[];
  rows.forEach(function(r){if(dedup.length&&dedup[dedup.length-1].ts===r.ts)dedup[dedup.length-1]=r;else dedup.push(r);});
  let tests=0,wasTesting=false,lastTestTs=null;
  dedup.forEach(function(r){
    const tol=Math.max(5,Math.abs(r.close)*0.0003);
    const testing=r.ma200>=r.low-tol&&r.ma200<=r.high+tol;
    if(testing&&!wasTesting){tests++;lastTestTs=r.ts;}
    r.testing=testing;r.testCount=tests;r.retestCount=Math.max(0,tests-1);r.lastTestTs=lastTestTs;r.toleranceUsd=tol;
    wasTesting=testing;
  });
  return dedup;
}

function waveUiSignalRows(tf,startTs,endTs){
  const base=path.join(WAVE_MCB_DIR,'mcb_'+tf+'.csv');
  const live=path.join(WAVE_MCB_DIR,'mcb_'+tf+'_live.csv');
  const out=[];
  function consume(txt,isLive){
    if(!txt)return;
    txt.split(/\r?\n/).forEach(function(line){
      if(!line||line.startsWith('timestamp,'))return;
      const v=line.split(','),ts=Date.parse(v[0]);
      if(!Number.isFinite(ts)||ts<startTs||ts>endTs)return;
      const up=(v[13]!==undefined&&v[13]!==''&&Number.isFinite(Number(v[13])))?Number(v[13]):null;
      const dn=(v[14]!==undefined&&v[14]!==''&&Number.isFinite(Number(v[14])))?Number(v[14]):null;
      if(up!==null)out.push({ts,type:'UP',value:up,provisional:!!isLive});
      if(dn!==null)out.push({ts,type:'DN',value:dn,provisional:!!isLive});
    });
  }
  consume(waveUiReadTailText(base),false);
  try{consume(fs.readFileSync(live,'utf8'),true);}catch(_){}
  out.sort((a,b)=>a.ts-b.ts);
  const dedup=[];
  out.forEach(function(e){
    const i=dedup.findIndex(x=>x.ts===e.ts&&x.type===e.type);
    if(i<0)dedup.push(e);
    else if(dedup[i].provisional&&!e.provisional)dedup[i]=e;
  });
  return dedup.sort((a,b)=>a.ts-b.ts);
}



function waveUiDivergenceSeries(tf){
  const base=path.join(WAVE_MCB_DIR,'mcb_'+tf+'.csv');
  const live=path.join(WAVE_MCB_DIR,'mcb_'+tf+'_live.csv');
  const rows=[];
  function consume(txt,isLive){
    if(!txt)return;
    txt.split(/\r?\n/).forEach(function(line){
      if(!line||line.startsWith('timestamp,'))return;
      const v=line.split(','),ts=Date.parse(v[0]);
      if(!Number.isFinite(ts))return;
      const r={
        ts:ts,timestamp:v[0],
        open:Number(v[1]),high:Number(v[2]),low:Number(v[3]),close:Number(v[4]),
        lt_blue_wave:Number(v[5]),blue_wave:Number(v[6]),money_flow:Number(v[7]),
        buy:Number(v[8]),sell:Number(v[9]),
        wt1_cross_up:(v[13]!==undefined&&v[13]!==''?Number(v[13]):null),
        wt1_cross_dn:(v[14]!==undefined&&v[14]!==''?Number(v[14]):null),
        _live:!!isLive
      };
      if(![r.high,r.low,r.close,r.lt_blue_wave].every(Number.isFinite))return;
      rows.push(r);
    });
  }
  // Enough depth for the 72h continuation search while keeping the route light.
  consume(waveUiReadTailText(base,4*1024*1024),false);
  try{consume(fs.readFileSync(live,'utf8'),true);}catch(_){}
  rows.sort((a,b)=>a.ts-b.ts||(a._live?1:-1));
  const map=new Map();
  rows.forEach(r=>map.set(r.ts,r));
  return Array.from(map.values()).sort((a,b)=>a.ts-b.ts);
}
function waveUiCausalDivergenceCatalog(auditRows){
  try{
    const out=divergenceCausalShadow.detectCatalog({
      seriesByTf:{
        '15m':waveUiDivergenceSeries('15m'),
        '3m':waveUiDivergenceSeries('3m'),
        '1h':waveUiDivergenceSeries('1h'),
        '4h':waveUiDivergenceSeries('4h'),
        '1d':waveUiDivergenceSeries('1d'),
        '1w':waveUiDivergenceSeries('1w')
      },
      auditRows:Array.isArray(auditRows)?auditRows:[]
    });
    return {
      version:out.version,
      decisionImpact:false,
      wave15:{...out.wave15,display:true},
      wave3:{...out.wave3,display:true},
      tf1h:{...out.tf1h,display:false},
      tf4h:{...out.tf4h,display:false},
      tf1d:{...out.tf1d,display:false},
      tf1w:{...out.tf1w,display:false}
    };
  }catch(e){
    return {
      version:'divergence-causal-shadow-v0.7',
      decisionImpact:false,
      wave15:{display:false,lines:[],error:e.message},
      wave3:{display:false,lines:[],error:e.message}
    };
  }
}

let waveDivergenceCache={at:0,data:null};
function waveUiCausalDivergenceCatalogCached(auditRows){
  const now=Date.now();
  if(waveDivergenceCache.data&&now-waveDivergenceCache.at<60000)return waveDivergenceCache.data;
  const data=waveUiCausalDivergenceCatalog(auditRows);
  waveDivergenceCache={at:now,data};
  return data;
}

function waveUi15mLineageSource(){
  const base=path.join(WAVE_MCB_DIR,'mcb_15m.csv');
  const live=path.join(WAVE_MCB_DIR,'mcb_15m_live.csv');
  const rows=[];
  function consume(txt,isLive){
    if(!txt)return;
    txt.split(/\r?\n/).forEach(function(line){
      if(!line||line.startsWith('timestamp,'))return;
      const v=line.split(','),ts=Date.parse(v[0]);
      if(!Number.isFinite(ts))return;
      const r={
        ts:ts,timestamp:v[0],
        open:Number(v[1]),high:Number(v[2]),low:Number(v[3]),close:Number(v[4]),
        lt_blue_wave:Number(v[5]),blue_wave:Number(v[6]),money_flow:Number(v[7]),
        buy:Number(v[8]),sell:Number(v[9]),
        _live:!!isLive
      };
      if(![r.high,r.low,r.close,r.lt_blue_wave].every(Number.isFinite))return;
      rows.push(r);
    });
  }
  consume(waveUiReadTailText(base,2*1024*1024),false);
  try{consume(fs.readFileSync(live,'utf8'),true);}catch(_){}
  rows.sort((a,b)=>a.ts-b.ts||(a._live?1:-1));
  const dedup=[];
  rows.forEach(function(r){
    if(dedup.length&&dedup[dedup.length-1].ts===r.ts)dedup[dedup.length-1]=r;
    else dedup.push(r);
  });
  const history=dedup.filter(r=>!r._live);
  const liveRow=dedup.length&&dedup[dedup.length-1]._live?dedup[dedup.length-1]:null;
  return {history,live:liveRow};
}
function waveUiLineageCatalog15(frames){
  try{
    const src=waveUi15mLineageSource();
    if(!src.history.length)return {version:'divergence-lineage-shadow-v0.1',decisionImpact:false,timeframe:'15m',lines:[],error:'no 15m history'};
    const lastFrame=Array.isArray(frames)&&frames.length?frames[frames.length-1]:null;
    const lastSeries=src.live||src.history[src.history.length-1];
    const price=lastFrame&&waveUiFinite(lastFrame.price)?Number(lastFrame.price):Number(lastSeries.close);
    const frame={market:{price,timestamp:lastFrame?Number(lastFrame.ts):Number(lastSeries.ts)},sources:{mcb:{tfs:{'15m':src}}}};
    const out=divergenceLineageShadow.evaluate(frame,{});
    const all=out&&out.divergences&&Array.isArray(out.divergences.all)?out.divergences.all:[];
    const lines=all.map(function(d){
      return {
        direction:d.direction,status:d.status||null,lifecycle:d.lifecycleCandidate||null,
        structuralAge:d.structuralAge||null,
        intermediateSameSideCount:Number(d.intermediateSameSideCount||0),
        older:d.older?{ts:Number(d.older.ts),timestamp:d.older.timestamp||null,lbw:Number(d.older.lbw),price:Number(d.older.price),type:d.older.type||null}:null,
        newer:d.newer?{ts:Number(d.newer.ts),timestamp:d.newer.timestamp||null,lbw:Number(d.newer.lbw),price:Number(d.newer.price),type:d.newer.type||null,confirmed:d.newer.confirmed!==false}:null
      };
    }).filter(d=>d.older&&d.newer&&Number.isFinite(d.older.ts)&&Number.isFinite(d.newer.ts)&&Number.isFinite(d.older.lbw)&&Number.isFinite(d.newer.lbw));
    return {
      version:out.version||'divergence-lineage-shadow-v0.1',
      decisionImpact:false,display:false,timeframe:'15m',
      activeCount:out.divergences&&Number(out.divergences.activeCount)||0,
      historicalCount:out.divergences&&Number(out.divergences.historicalCount)||0,
      bullishCount:lines.filter(d=>d.direction==='bullish').length,
      bearishCount:lines.filter(d=>d.direction==='bearish').length,
      lines
    };
  }catch(e){
    return {version:'divergence-lineage-shadow-v0.1',decisionImpact:false,timeframe:'15m',lines:[],error:e.message};
  }
}

function waveUiDecorateMa(frames){
  if(!Array.isArray(frames)||!frames.length)return frames;
  const start=Number(frames[0].ts),end=Number(frames[frames.length-1].ts);
  [['wave3','3m'],['wave15','15m']].forEach(function(pair){
    const key=pair[0],tf=pair[1],rows=waveUiMaRows(tf,start,end);
    let j=0,current=null;
    frames.forEach(function(f){
      while(j<rows.length&&rows[j].ts<=Number(f.ts)){current=rows[j];j++;}
      if(!f[key])f[key]={};
      if(!current){f[key].ma200=null;return;}
      const px=Number(f.price),dist=Number.isFinite(px)?px-current.ma200:null;
      f[key].ma200={
        timeframe:tf,price:current.ma200,distanceUsd:dist,distanceAbsUsd:dist===null?null:Math.abs(dist),
        side:dist===null?null:(dist>=0?'ABOVE':'BELOW'),
        testing:current.testing,testCount:current.testCount,retestCount:current.retestCount,
        lastTestTs:current.lastTestTs,toleranceUsd:current.toleranceUsd,barTs:current.ts
      };
    });
  });
  return frames;
}

function waveUiCompactEval(r) {
  if (!r) return null;
  const c = r.mcb && r.mcb.currentLobe || {};
  const n = r.mcb && r.mcb.nested3m || {};
  const tr = r.translation || {}, tk = r.ticker || {}, th = r.thesis || {}, a = r.action || {};
  const etr=r.entryTranslation||{}, etk=r.entryTicker||{}, bg=r.background||{}, setup=r.setup||{}, room=r.structuralRoom||{}, mq=r.marketQuality||{}, ns=r.nativeSignal||{};
  const p = r.position || null;
  return {
    version: r.version || null,
    ts: r.ts || null,
    price: r.price,
    position: p ? { direction:p.direction, entryPrice:p.entryPrice, entryTimestamp:p.entryTimestamp, metrics:p.metrics || null } : null,
    thesis: { state:th.state || null, direction:th.direction || null, candidateDirection:th.candidateDirection || null, mode:th.mode || null, originMode:th.originMode || null, phase:th.phase || null, actionable:!!th.actionable, maturityGate:th.maturityGate || null, reason:th.reason || null },
    background:{primaryRelation:bg.primaryRelation||null,oneHour:bg.oneHour||null,macroShadow:bg.macroShadow||null},
    nativeSignal:{latest:ns.latest||null,reinforcedUp:ns.reinforcedUp||null},
    setup:{status:setup.status||null,direction:setup.direction||null,candidateDirection:setup.candidateDirection||null,setupTs:setup.setupTs||null,reason:setup.reason||null,reasons:setup.reasons||null},
    structuralRoom:{state:room.state||null,roomToBoundaryUsd:room.roomToBoundaryUsd??null,nearestAhead:room.nearestAhead||null},
    marketQuality:{state:mq.state||null,lowEdge:!!mq.lowEdge,window30:mq.window30||null,window60:mq.window60||null},
    mcb15: { type:c.type || null, currentLbw:c.currentLbw ?? null, extremeLbw:c.extremeLbw ?? null, recoveryFraction:c.recoveryFraction ?? null, maturity:c.maturity || null, e15Class:c.e15Class || null },
    mcb3: { currentLbw:n.currentLbw ?? null, extremeLbw:n.extremeLbw ?? null, recoveryFraction:n.recoveryFraction ?? null, slopeLbw:n.slopeLbw ?? null, turningDirection:n.turningDirection || null },
    pm: { status:tr.status || null, direction:tr.direction || null,
      move:(tr.pmLive && tr.pmLive.priceMoveUsd) ?? null,
      net3m:(tr.horizons && tr.horizons.net3mUsd) ?? null,
      gross3m:(tr.horizons && tr.horizons.gross3mUsd) ?? null,
      eff3m:(tr.horizons && tr.horizons.efficiency3m) ?? null },
    ticker: { status:tk.status || null, direction:tk.direction || null, confirmed:!!tk.confirmed,
      yieldVsP75:(tk.current && tk.current.yieldVsP75) ?? null,
      effortVsP75:(tk.current && tk.current.effortVsP75) ?? null,
      alignedLast4:(tk.persistence && tk.persistence.alignedLast4) ?? null,
      terrain:(tk.persistence && tk.persistence.terrainRetainedFraction) ?? null },
    entryPm:{status:etr.status||null,direction:etr.direction||null,sinceTs:etr.sinceTs??null,
      netSince:(etr.sinceSetup&&etr.sinceSetup.netUsd)??null,grossSince:(etr.sinceSetup&&etr.sinceSetup.grossUsd)??null,
      effSince:(etr.sinceSetup&&etr.sinceSetup.efficiency)??null,materiality:etr.materiality||null},
    entryTicker:{status:etk.status||null,direction:etk.direction||null,confirmed:!!etk.confirmed,sinceTs:etk.sinceTs??null},
    action: { type:a.type || null, direction:a.direction || null, stage:a.stage || null, reason:a.reason || null },
    contextStatus: r.context && r.context.status || null
  };
}
function waveUiNearest(rows, ts, maxMs) {
  if (!rows.length) return null;
  let lo=0, hi=rows.length-1;
  while (lo < hi) {
    const m=Math.floor((lo+hi)/2);
    if (Date.parse(rows[m].ts || '') < ts) lo=m+1; else hi=m;
  }
  const c=[rows[lo], rows[Math.max(0,lo-1)]].filter(Boolean);
  let best=null, bd=Infinity;
  c.forEach(function(r){ const d=Math.abs(Date.parse(r.ts || '')-ts); if(d<bd){bd=d;best=r;} });
  return bd <= maxMs ? best : null;
}
function waveUiFrame(r, state) {
  return {
    ts:Number(r.ts),
    price:waveUiFinite(r.lastPrice)?Number(r.lastPrice):null,
    wave3:{
      bw:waveUiFinite(r.liveBw)?Number(r.liveBw):null,
      lbw:waveUiFinite(r.liveLbw)?Number(r.liveLbw):null,
      mf:waveUiFinite(r.liveMoneyFlow)?Number(r.liveMoneyFlow):null,
      vwap:waveUiFinite(r.vwapLive)?Number(r.vwapLive):null,
      up:waveUiFinite(r.liveSignalUp)?Number(r.liveSignalUp):null,
      dn:waveUiFinite(r.liveSignalDn)?Number(r.liveSignalDn):null
    },
    wave15:{
      bw:waveUiFinite(r.live15BwRaw)?Number(r.live15BwRaw):null,
      lbw:waveUiFinite(r.live15LbwRaw)?Number(r.live15LbwRaw):null,
      mf:waveUiFinite(r.live15MfRaw)?Number(r.live15MfRaw):null,
      vwap:waveUiFinite(r.live15Vwap)?Number(r.live15Vwap):null,
      up:waveUiFinite(r.live15SignalUp)?Number(r.live15SignalUp):null,
      dn:waveUiFinite(r.live15SignalDn)?Number(r.live15SignalDn):null,
      confirmed:{
        bw:waveUiFinite(r.live15Bw)?Number(r.live15Bw):null,
        lbw:waveUiFinite(r.live15Lbw)?Number(r.live15Lbw):null,
        mf:waveUiFinite(r.live15MoneyFlow)?Number(r.live15MoneyFlow):null
      }
    },
    audit:{
      priceMove:waveUiFinite(r.priceMove)?Number(r.priceMove):null,
      cadence:waveUiFinite(r.cadence)?Number(r.cadence):null,
      volumeFenetreBtc:waveUiFinite(r.volumeFenetreBtc)?Number(r.volumeFenetreBtc):null,
      winSec:waveUiFinite(r.winSec)?Number(r.winSec):null,
      mf15Pente:waveUiFinite(r.mf15Pente)?Number(r.mf15Pente):null,
      vwap3Confirmed:waveUiFinite(r.vwap3)?Number(r.vwap3):null,
      vwap15Confirmed:waveUiFinite(r.vwap15)?Number(r.vwap15):null
    },
    state:waveUiCompactEval(state)
  };
}
function waveUiSnapshotSeries(tf,startTs,endTs){
  const file=path.join(WAVE_MCB_DIR,'mcb_'+tf+'.csv');
  const txt=waveUiReadTailText(file,tf==='3m'?2*1024*1024:1024*1024);
  const out=[];
  txt.split(/\r?\n/).forEach(function(line){
    if(!line||line.startsWith('timestamp,'))return;
    const v=line.split(','),ts=Date.parse(v[0]);
    if(!Number.isFinite(ts)||ts<startTs||ts>endTs)return;
    const close=Number(v[4]),lbw=Number(v[5]),bw=Number(v[6]),mf=Number(v[7]);
    if(![close,lbw,bw,mf].every(Number.isFinite))return;
    const up=v[13]!==undefined&&v[13]!==''&&Number.isFinite(Number(v[13]))?Number(v[13]):null;
    const dn=v[14]!==undefined&&v[14]!==''&&Number.isFinite(Number(v[14]))?Number(v[14]):null;
    out.push({ts,timestamp:v[0],close,lbw,bw,mf,vwap:lbw-bw,up,dn});
  });
  return out.sort((a,b)=>a.ts-b.ts);
}
let waveSnapshotCache={key:null,data:null};
function waveUiBuildSnapshot48(){
  // Freeze the older 36h on 15m boundaries. The newest 12h stay rich/live.
  const bucket=15*60*1000;
  const nowBucket=Math.floor(Date.now()/bucket)*bucket;
  const endTs=nowBucket-12*3600000;
  const startTs=nowBucket-48*3600000;
  const key=String(startTs)+'|'+String(endTs);
  if(waveSnapshotCache.key===key&&waveSnapshotCache.data)return waveSnapshotCache.data;

  const r3=waveUiSnapshotSeries('3m',startTs,endTs);
  const r15=waveUiSnapshotSeries('15m',startTs,endTs);
  const map=new Map();
  function blankFrame(ts,price){
    return {
      ts:Number(ts),price:Number.isFinite(Number(price))?Number(price):null,snapshot:true,
      wave3:{bw:null,lbw:null,mf:null,vwap:null,up:null,dn:null},
      wave15:{bw:null,lbw:null,mf:null,vwap:null,up:null,dn:null,confirmed:{bw:null,lbw:null,mf:null}},
      audit:{priceMove:null,cadence:null,volumeFenetreBtc:null,winSec:null,mf15Pente:null,vwap3Confirmed:null,vwap15Confirmed:null},
      state:null
    };
  }
  r3.forEach(function(r){
    const f=blankFrame(r.ts,r.close);
    f.wave3={bw:r.bw,lbw:r.lbw,mf:r.mf,vwap:r.vwap,up:null,dn:null};
    map.set(r.ts,f);
  });
  r15.forEach(function(r){
    let f=map.get(r.ts);
    if(!f){f=blankFrame(r.ts,r.close);map.set(r.ts,f);}
    if(f.price===null)f.price=r.close;
    f.wave15={bw:r.bw,lbw:r.lbw,mf:r.mf,vwap:r.vwap,up:null,dn:null,confirmed:{bw:r.bw,lbw:r.lbw,mf:r.mf}};
  });
  const frames=Array.from(map.values()).sort((a,b)=>a.ts-b.ts);

  let history=[];
  try{
    const h=JSON.parse(fs.readFileSync(TRADES_V2_HISTORY_PATH,'utf8'));
    history=Array.isArray(h)?h:[];
  }catch(_){}
  const events=[];
  history.forEach(function(t,i){
    const n=i+1,en=Date.parse(t.entryTimestamp),ex=Date.parse(t.exitTimestamp);
    if(Number.isFinite(en)&&Number.isFinite(ex)&&ex>=startTs&&en<=endTs){
      events.push({ts:en,type:'ENTER',trade:n,direction:t.direction,price:t.entryPrice,label:'#'+n+' IN'});
      events.push({ts:ex,type:'EXIT',trade:n,direction:t.direction,price:t.exitPrice,label:'#'+n+' OUT',exitKind:t.exitKind,pnlPercentLeveraged:t.pnlPercentLeveraged});
    }
  });
  const signalEvents={
    wave3:r3.flatMap(function(r){const a=[];if(r.up!==null)a.push({ts:r.ts,type:'UP',value:r.up,provisional:false});if(r.dn!==null)a.push({ts:r.ts,type:'DN',value:r.dn,provisional:false});return a;}),
    wave15:r15.flatMap(function(r){const a=[];if(r.up!==null)a.push({ts:r.ts,type:'UP',value:r.up,provisional:false});if(r.dn!==null)a.push({ts:r.ts,type:'DN',value:r.dn,provisional:false});return a;})
  };
  const data={
    version:'wave-snapshot-v0.1',
    snapshot:true,
    generatedAt:new Date().toISOString(),
    period:{start:new Date(startTs).toISOString(),end:new Date(endTs).toISOString(),label:'SNAPSHOT confirmé · 12–48h'},
    sampling:{wave3Bars:r3.length,wave15Bars:r15.length,frames:frames.length},
    sourceContract:{tradingImpact:false,geometry:'confirmed MCB bars only',state:'none',semantic:'older 36h frozen/compact; newest 12h remain live-rich'},
    signalEvents,events,frames
  };
  waveSnapshotCache={key,data};
  return data;
}
app.get('/api/wave-snapshot', requireAuth, (req,res)=>{
  try{
    const data=waveUiBuildSnapshot48();
    res.set('Cache-Control','private, max-age=60');
    res.json(data);
  }catch(e){
    res.status(500).json({error:'wave snapshot indisponible',detail:e.message});
  }
});

app.get('/api/wave-live', requireAuth, (req, res) => {
  try {
    const hours=Math.max(1,Math.min(24,Number(req.query.hours)||12));
    const now=Date.now(), cut=now-hours*3600000;
    let audit=[],auditAll=[];
    if (fs.existsSync(AUDIT_HISTORY_PATH)) {
      const a=JSON.parse(fs.readFileSync(AUDIT_HISTORY_PATH,'utf8'));
      auditAll=Array.isArray(a)?a:[];
      audit=auditAll.filter(r=>Number(r.ts)>=cut);
    }
    // LIVE mode no longer reconstructs thousands of historical V4 evaluations.
    // The Wave geometry comes from audit frames; the state panel stays genuinely LIVE.
    const frames=audit.map(r=>waveUiFrame(r,null));
    waveUiDecorateMa(frames);
    let history=[], state={};
    try { history=JSON.parse(fs.readFileSync(TRADES_V2_HISTORY_PATH,'utf8')); if(!Array.isArray(history))history=[]; } catch(_){}
    try { state=JSON.parse(fs.readFileSync(TRADES_V2_STATE_PATH,'utf8')); } catch(_){}
    const openPosition=state.modules&&state.modules.day||null;
    const livingEval=state.lastEvaluation?Object.assign({},state.lastEvaluation,{position:openPosition}):null;
    const liveState=waveUiCompactEval(livingEval);
    const events=[];
    history.forEach(function(t,i){
      const n=i+1,en=Date.parse(t.entryTimestamp),ex=Date.parse(t.exitTimestamp);
      if(ex>=cut){
        events.push({ts:en,type:'ENTER',trade:n,direction:t.direction,price:t.entryPrice,label:'#'+n+' IN'});
        events.push({ts:ex,type:'EXIT',trade:n,direction:t.direction,price:t.exitPrice,label:'#'+n+' OUT',exitKind:t.exitKind,pnlPercentLeveraged:t.pnlPercentLeveraged});
      }
    });
    const open=state.modules&&state.modules.day;
    if(open){
      const en=Date.parse(open.entryTimestamp),n=history.length+1;
      if(!events.some(e=>e.type==='ENTER'&&Math.abs(e.ts-en)<1000))events.push({ts:en,type:'ENTER',trade:n,direction:open.direction,price:open.entryPrice,label:'#'+n+' IN (open)'});
    }
    events.sort((a,b)=>a.ts-b.ts);
    res.set('Cache-Control','no-store');
    res.json({
      version:'wave-live-0.1',live:true,generatedAt:new Date().toISOString(),
      period:{start:frames.length?new Date(frames[0].ts).toISOString():new Date(cut).toISOString(),end:frames.length?new Date(frames[frames.length-1].ts).toISOString():new Date(now).toISOString(),label:'LIVE Amsterdam · '+hours+'h glissantes'},
      sampling:{auditSeconds:30,frames:frames.length},
      sourceContract:{tradingImpact:false,state:'V4 living state only; historical Wave scrolling does not reconstruct old decision states',wave3:'audit live intra-bougie',wave15:'audit 15m live raw + confirme',ma200:'MCB CSV MA200; tests diagnostic only',signals:'MCB natif wt1_cross_up/down confirmés + signal live provisoire',divergences:'causal divergence shadow cached 60s; diagnostic only'},
      signalEvents:{
        wave3:waveUiSignalRows('3m',frames.length?Number(frames[0].ts):cut,frames.length?Number(frames[frames.length-1].ts):now),
        wave15:waveUiSignalRows('15m',frames.length?Number(frames[0].ts):cut,frames.length?Number(frames[frames.length-1].ts):now)
      },
      divergenceCatalog:waveUiCausalDivergenceCatalogCached(auditAll),
      liveState,
      events,frames
    });
  } catch(e) {
    res.status(500).json({error:'wave live indisponible',detail:e.message});
  }
});


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
  <div id="entete" style="position:sticky; top:0; z-index:10; background:#0d1117; padding-bottom:6px; border-bottom:1px solid #2a3444;">
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
    <span id="flux" style="margin-left:18px; font-size:13px; color:#8fa3bf;"></span>
    <span style="margin-left:12px; font-size:11px; opacity:0.6; display:block; margin-top:4px;">VAGUE : ce que dit MarketCipher &nbsp;|&nbsp; MOUVEMENT : ce que le prix a fait &nbsp;|&nbsp; ENGAGEMENT : qui pousse et avec quelle constance</span>
  </div>
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
    /* Variation de l ecart live/confirme sur cinq minutes (06/09/2026).
 * Ce qui compte n est pas le signe de l ecart mais son MOUVEMENT : le live
 * s ecarte-t-il davantage du confirme, ou revient-il vers lui ? */
function varEcart(i, arr, champLive, champConf) {
  if (i < 10) return null;
  const e = (x) => (x && x[champLive] !== null && x[champLive] !== undefined
                    && x[champConf] !== null && x[champConf] !== undefined)
                   ? x[champLive] - x[champConf] : null;
  const v1 = e(arr[i]), v0 = e(arr[i-10]);
  if (v1 === null || v0 === null) return null;
  const d = v1 - v0;
  return Math.abs(d) < 0.5 ? 0 : d;
}
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
    // Trades Constitution V2, indexes par tranche de 30s pour l'audit.
    let tradeEvents = {};
    try {
      const tr = await (await fetch('/api/trades')).json();
      const addEntry = function(t) {
        if (!t || !t.entryTimestamp) return;
        const eIn = Math.floor(new Date(t.entryTimestamp).getTime() / 30000);
        const dir = t.direction === 'long' ? 'LONG' : 'SHORT';
        if (!tradeEvents[eIn]) tradeEvents[eIn] = [];
        if (!tradeEvents[eIn].some(function(x) { return x.label.indexOf('ENTREE') === 0; })) {
          tradeEvents[eIn].push({
            label: 'ENTREE ' + dir,
            bg: t.direction === 'long' ? '#1e8449' : '#922b21',
            title: 'Constitution V2 — entree ' + dir + ' @ ' + t.entryPrice + (t.archetype ? ' — ' + t.archetype : '')
          });
        }
      };
      const activeDay = tr.ongoing && tr.ongoing.day;
      if (activeDay) addEntry(activeDay);
      (tr.executed || []).forEach(function(t) {
        if (t.module !== 'day') return;
        addEntry(t);
        const eOut = Math.floor(new Date(t.exitTimestamp).getTime() / 30000);
        const rs = String(t.exitReason || '');
        let lbl = 'SORTIE', bg = '#555';
        if (t.exitKind === 'EXIT_RISK') { lbl = 'RISK'; bg = '#a93226'; }
        else if (t.exitKind === 'EXIT_STRUCTURE') { lbl = 'STRUCT'; bg = '#7d3c98'; }
        else if (t.exitKind === 'EXIT_EXECUTION') { lbl = 'EXEC'; bg = '#b9770e'; }
        const pnl = (t.pnlPercent !== null && t.pnlPercent !== undefined)
          ? ' (' + t.pnlPercent.toFixed(2) + '%)' : '';
        if (!tradeEvents[eOut]) tradeEvents[eOut] = [];
        tradeEvents[eOut].push({ label: lbl + pnl, bg: bg, title: (t.exitKind || 'SORTIE') + ' — ' + rs });
      });
    } catch (e) { /* trades V2 indisponibles, l'audit reste lisible */ }

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
        '<td class="' + cls(r.vwapLive) + '" style="padding:2px 1px; background:#171f2c;">' + fmt(ecartVw(r.vwapLive, r.vwap3),1) + '</td>' +
        /* Bloc 15m sur fond plus clair (19/08/2026) : c'est de lui que vient
         * la direction -- ecart VW15L-VWAP15 a +0.228 et Vslope15 a +0.243,
         * les deux meilleures mesures directionnelles mesurees. */
        '<td class="' + cls(r.vwap15) + '" style="border-left:2px solid #5a6b85;">' + fmt(r.vwap15,2) + '</td>' +
        '<td class="' + cls(r.live15Vwap) + '" style="opacity:0.85; font-size:11px;">' + fmt(r.live15Vwap,2) + '</td>' +
        '<td class="' + cls(r.vwapSlope) + '">' + fmt(r.vwapSlope,2) + '</td>' +
        '<td style="text-align:center; padding:2px 0;">' + slopeArrow(r.vwapSlopeDir) + '</td>' +
        '<td class="' + cls(r.live15Vwap) + '" style="border-right:2px solid #5a6b85; padding:2px 1px;">' + fmt(ecartVw(r.live15Vwap, r.vwap15),1) + '</td>' +
        '<td class="' + cls(r.priceMove) + '" style="border-left:2px solid #5a6b85; font-weight:600; background:#1e2a3d;">' + fmt(r.priceMove,0) + '</td>' +
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
            '<td class="' + cls(r.vwapLive) + '" style="background:#171f2c;">' + fmt(ecartVw(r.vwapLive, r.vwap3),1) + '</td>' +
            '<td class="' + cls(r.vwap3Slope) + '" style="background:#171f2c;">' + fmt(r.vwap3Slope,2) + '</td>' +
            '<td style="text-align:center; padding:2px 0; background:#171f2c;">' + slopeArrow(r.vwap3SlopeDir) + '</td>' +
            '<td class="' + cls(r.vwapLiveSlope) + '" style="background:#171f2c;">' + fmt(r.vwapLiveSlope,2) + '</td>' +
            '<td class="' + cls(r.vwap15) + '" style="border-left:2px solid #5a6b85;">' + fmt(r.vwap15,2) + '</td>' +
            '<td class="' + cls(r.live15Vwap) + '">' + fmt(ecartVw(r.live15Vwap, r.vwap15),1) + '</td>' +
            '<td class="' + cls(r.vwapSlope) + '">' + fmt(r.vwapSlope,2) + '</td>' +
            '<td style="text-align:center; padding:2px 0;">' + slopeArrow(r.vwapSlopeDir) + '</td>' +
            /* Mouvement */
            '<td class="' + cls(r.priceMove) + '" style="border-left:2px solid #5a6b85; font-weight:600; background:#1e2a3d;">' + fmt(r.priceMove,0) + '</td>' +
            '<td style="background:#1e2a3d;' + ((r.priceMoveMult !== null && r.priceMoveMult >= 3) ? ' font-weight:700; color:#f39c12;' : '') + '">' + fmt(r.priceMoveMult,1) + '</td>' +
            '<td style="background:#171f2c;">' + fmt(r.cadence,2) + '</td>' +
            '<td style="background:#171f2c;">' + fmt(r.cadenceMult,2) + 'x</td>' +
            '<td>' + (r.tailleMoyenneBtc !== null && r.tailleMoyenneBtc !== undefined ? r.tailleMoyenneBtc.toFixed(3) : '') + '</td>' +
            '<td>' + fmt(r.volumeFenetreBtc,1) + '</td>' +
            /* Vagues : confirme puis live, pour comparaison */
            '<td class="' + cls(r.mf15Pente) + '" style="border-left:2px solid #5a6b85;" title="pente ' + fmt(r.mf15Pente,2) + '">' + fmt(r.live15MoneyFlow,2) + '</td>' +
            '<td class="' + cls(r.live15MfRaw) + '">' + fmt(ecartVw(r.live15MfRaw, r.live15MoneyFlow),1) + '</td>' +
            '<td class="' + cls(pente10(i, recent, 'live15Bw')) + '" style="background:#171f2c;">' + fmt(r.live15Bw,2) + '</td>' +
            '<td class="' + cls(r.live15BwRaw) + '" style="background:#171f2c;">' + fmt(ecartVw(r.live15BwRaw, r.live15Bw),1) + '</td>' +
            '<td class="' + rel(r.live15Lbw, r.live15Bw) + '">' + fmt(r.live15Lbw,2) + '</td>' +
            '<td class="' + cls(r.live15LbwRaw) + '">' + fmt(ecartVw(r.live15LbwRaw, r.live15Lbw),1) + '</td>'
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
          '<th style="width:26px; padding:2px 0; background:#171f2c;" title="Direction de la pente VWAP 3m">P3</th>' +
          '<th style="background:#171f2c;" title="Pente du VWAP 3m LIVE, calculee en continu sur l intra-bougie. Mesure du 06/09 : elle anticipe le Vsl3 confirme de une a trois minutes, et affiche parfois le sens oppose pendant que celui-ci reste fige.">VslL3</th>' +
          '<th style="border-left:2px solid #5a6b85;" title="VWAP 15m confirme">VW15</th>' +
          '<th title="Ecart VW15L moins VWAP15">dW15</th>' +
          '<th title="Pente du VWAP 15m">Vsl15</th>' +
          '<th style="width:26px; padding:2px 0;" title="Direction de la pente VWAP 15m">P15</th>' +
          '<th style="border-left:2px solid #5a6b85; background:#171f2c;" title="priceMove : deplacement du prix en USD depuis le releve precedent">PM</th>' +
          '<th style="background:#171f2c;" title="Multiplicateur du priceMove contre la mediane glissante de 48h. Au-dela de 3, evenement.">PMx</th>' +
          '<th style="background:#171f2c;" title="Cadence : transactions par seconde">Cad</th>' +
          '<th style="background:#171f2c;" title="Multiplicateur de cadence">nMx</th>' +
          '<th title="Taille moyenne d une transaction sur la fenetre de 200 ticks, en BTC. Distingue un gros ordre d un carnet vide -- deux situations qui produisent le meme impact par transaction.">Tx</th>' +
          '<th title="Volume total echange sur la fenetre de 200 ticks, en BTC.">Vol</th>' +
          '<th style="border-left:2px solid #5a6b85;" title="MoneyFlow 15m CONFIRME a la cloture. Colore par sa pente.">Mf15</th>' +
          '<th title="Ecart entre le MoneyFlow 15m live et le confirme : de combien la vague en formation decroche du trace.">dwMFL</th>' +
          '<th style="background:#171f2c;" title="Blue Wave 15m CONFIRMEE. Coloree par sa pente sur cinq minutes.">BW15</th>' +
          '<th style="background:#171f2c;" title="Ecart entre la Blue Wave live et la confirmee.">dwBWL</th>' +
          '<th title="Lt Blue Wave 15m CONFIRMEE. Verte au-dessus du BW, rouge en dessous.">Lbw15</th>' +
          '<th title="Ecart entre la Lt Blue Wave live et la confirmee. Le croisement se prepare ici avant d apparaitre dans le confirme.">dwLBWL</th>'
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
    const der = recent[recent.length - 1], fx = document.getElementById('flux');
    if (der && fx && der.tailleMoyenneBtc && der.lastPrice) {
      const t = der.tailleMoyenneBtc, v = der.volumeFenetreBtc, px = der.lastPrice;
      fx.innerHTML = 'Taille moyenne de <b>' + t.toFixed(3) + ' BTC</b> par transaction, soit environ <b>'
        + Math.round(t * px).toLocaleString('fr-FR') + ' USD</b>, et <b>'
        + (v ? v.toFixed(2) : '-') + ' BTC</b> sur les 200 derniers ticks'
        + '<span style="opacity:0.5;"> // </span>PRIX : <b>' + Math.round(px).toLocaleString('fr-FR') + '</b>';
    }
  } catch (e) {
    wrap.innerHTML = '<div class="empty">Erreur reseau : ' + e.message + '</div>';
  }
}

loadAudit();
setInterval(loadAudit, 30000);
function calerEntete(){var e=document.getElementById("entete");if(!e)return;var h=e.offsetHeight;document.querySelectorAll("thead th").forEach(function(t){t.style.top=h+"px";});}
window.addEventListener("resize",calerEntete);
setInterval(calerEntete,1000);
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
      .ledger-block .ledger-row { border-bottom: 1px dashed var(--border); padding-right: 44px; }
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
      .ledger-order{display:inline-flex;gap:2px;flex-shrink:0;}
      .ledger-move{width:21px;height:21px;display:inline-flex;align-items:center;justify-content:center;background:var(--card);border:1px solid var(--border);border-radius:4px;color:var(--muted);font-size:11px;line-height:1;cursor:pointer;padding:0;}
      .ledger-move:disabled{opacity:.28;cursor:default;}
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
        <span class="main-nav-item active" data-main="trades">TRADES</span>
        <span class="main-nav-item" data-main="niveaux">NIVEAUX</span>
        <span class="main-nav-item" data-main="scenario">SCENARIO</span>
        <span class="main-nav-item" data-main="audit">AUDIT</span>
      </div>

      <!-- ═══════════════ NIVEAUX ═══════════════ -->
      <div class="main-section" id="section-niveaux">
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

      <!-- ═══════════════ TRADES — V4 primaire / V3 shadow ═══════════════ -->
<div class="main-section active" id="section-trades">
<div class="panel">
<div class="tabs">
<span class="tab active" data-tab2="statev2">Etat V4</span>
<span class="tab" data-tab2="waves">Vagues</span>
<span class="tab" data-tab2="historyv2">Historique</span>
<span class="tab" data-tab2="boono">BOONO</span>
</div>
<div class="tab-panel active" id="tab2-statev2">
<div class="placeholder-note">V4 — chargement.</div>
</div>
<div class="tab-panel" id="tab2-historyv2">
<div class="placeholder-note">Aucun trade V4 cloture pour l'instant.</div>
</div>
<div class="tab-panel" id="tab2-reportsv2">
<div class="placeholder-note">Les comptes rendus V4 apparaissent apres chaque trade cloture. Archive V3 conservee plus bas.</div>
</div>
<div class="tab-panel" id="tab2-boono">
<div class="placeholder-note">Moteur Boono -- chargement.</div>
</div>
<div class="tab-panel" id="tab2-waves">
<style>
.wave-replay-shell{position:relative;background:transparent;color:#111;border:0;padding:0;font-family:"SF Mono","Menlo","Consolas",monospace;}
#tab2-statev2{font-family:"SF Mono","Menlo","Consolas",monospace;}
.wave-replay-head{display:block;padding:0 1px 7px;margin-bottom:6px;}
.wave-title-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:3px;}
.wave-replay-title{font-size:14px;font-weight:750;letter-spacing:.03em;}
.wave-head-actions{display:flex;align-items:center;gap:5px;flex:none;}
.wave-mode-btn{border:1px solid #bbb;background:#fff;color:#555;border-radius:4px;padding:4px 8px;font-family:inherit;font-size:10px;font-weight:700;letter-spacing:.06em;cursor:pointer;flex:none;}
.wave-mode-btn.live{background:#1f9d55;color:#fff;border-color:#1f9d55;}
.wave-live-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#fff;margin-right:4px;vertical-align:1px;}
.wave-replay-note{font-size:10px;color:#666;max-width:760px;line-height:1.35;}
.wave-state-grid{display:block;margin:0;}
.wave-group{border:1px solid #dedede;border-radius:8px;background:#fff;min-width:0;overflow:hidden;margin:0 0 8px;}
.wave-group-title{padding:6px 9px 2px;background:transparent;border-bottom:0;color:#444;font-size:11px;letter-spacing:.10em;text-transform:uppercase;font-weight:800;}\n.wave-group-title::after{content:"";display:block;height:1px;background:#dedede;margin-top:5px;}
.wave-row{display:block;padding:0 9px 3px;border-top:0;min-width:0;}
.wave-row:first-of-type{border-top:none;}
.wave-row .k{display:block;font-size:10px;color:#777;letter-spacing:.09em;text-transform:uppercase;font-weight:700;margin-bottom:2px;}
.wave-row .line{display:block;min-width:0;line-height:1.3;overflow-wrap:break-word;word-break:normal;white-space:normal;}\n.wave-row .v{display:inline;font-size:12px;font-weight:750;}
.wave-row .s{display:inline;font-size:10px;color:#666;font-weight:400;}\n.wave-live-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 8px;padding:0 0 3px;}\n.wave-live-col{min-width:0;}\n
.wave-band{position:relative;border:1px solid #dedede;border-radius:8px;background:#fff;padding:8px 9px;margin:0 0 8px;overflow:hidden;}
.wave-band-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px;flex-wrap:wrap;}
.wave-band-title{font-size:11px;font-weight:800;letter-spacing:.08em;}
.wave15-head{display:block;}
.wave-band-headline{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.wave-scale-actions{display:flex;align-items:center;gap:4px;flex:none;}
.wave-scale-btn{border:1px solid #bbb;background:#fff;color:#555;border-radius:4px;padding:3px 7px;font-family:inherit;font-size:9px;font-weight:800;letter-spacing:.05em;cursor:pointer;}
.wave-scale-btn.active{background:#222;color:#fff;border-color:#222;}
.wave15-head .wave-band-legend{display:block;text-align:left;margin-top:3px;}
.wave-band-legend{font-size:9.5px;color:#666;white-space:normal;text-align:right;line-height:1.3;}
.wave-ma-info{font-size:9.5px;color:#555;margin:0 0 4px;line-height:1.3;overflow-wrap:break-word;}
.wave-scroll{width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;}
.wave-scroll.top{scrollbar-width:none;}
.wave-scroll.top::-webkit-scrollbar{display:none;}
.wave-canvas-track{width:100%;min-width:100%;position:relative;}
.wave-canvas{display:block;width:100%;height:185px;background:#fff;border:1px solid #ececec;border-radius:4px;}
.wave-scroll.bottom{padding-bottom:2px;}
.wave-scroll.bottom::-webkit-scrollbar{height:9px;}
.wave-scroll.bottom::-webkit-scrollbar-thumb{background:#bdbdbd;border-radius:8px;}
.wave-scroll.bottom::-webkit-scrollbar-track{background:#f1f1f1;}
.wave-scroll-meta{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:3px;min-height:21px;font-size:9.5px;color:#666;}
.wave-scroll-meta button{border:1px solid #bbb;background:#fff;color:#333;border-radius:4px;padding:3px 7px;font-family:inherit;font-size:9.5px;font-weight:700;cursor:pointer;}
.wave-trade-panel{border:1px solid #b8d7e6;background:rgba(135,206,235,.12);border-radius:6px;padding:6px 9px;margin:-1px 0 8px;min-height:30px;font-size:10px;line-height:1.35;color:#333;display:flex;align-items:center;justify-content:space-between;gap:8px;}\n.wave-trade-panel .info{min-width:0;flex:1;overflow-wrap:anywhere;}\n.wave-trade-panel .head{font-weight:800;letter-spacing:.05em;margin-right:8px;}\n.wave-trade-panel .muted{color:#777;}\n.wave-trade-report-btn{border:1px solid #8abbd3;background:#fff;color:#245a73;border-radius:4px;padding:4px 7px;font-family:inherit;font-size:9px;font-weight:800;letter-spacing:.05em;cursor:pointer;flex:none;}\n.wave-trade-report-btn:hover{background:#eef8fc;}\n.wave-report-overlay{display:none;position:fixed;inset:0;z-index:1000;background:rgba(18,18,20,.18);padding:18px 10px;align-items:flex-start;justify-content:center;}
.wave-report-overlay.open{display:flex;}
.wave-report-card{width:min(620px,96vw);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border:1px solid #cfcfd4;border-radius:10px;box-shadow:0 10px 32px rgba(0,0,0,.24);}
.wave-report-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px;background:rgba(255,255,255,.97);border-bottom:1px solid #e2e2e5;}
.wave-report-title{font-size:11px;font-weight:800;letter-spacing:.05em;overflow-wrap:anywhere;}
.wave-report-close{border:1px solid #bbb;background:#fff;color:#222;border-radius:5px;width:28px;height:26px;font:700 16px/1 inherit;cursor:pointer;flex:none;}
.wave-report-body{padding:9px;}
.wave-report-body .diag-module{margin-bottom:0;}
.wave-report-loading{font-size:11px;color:#666;padding:12px 4px;}
@media(max-width:700px){.wave-band-head{display:block}.wave-band-legend{text-align:left;margin-top:3px}.wave-canvas{height:155px}.wave-report-overlay{padding:8px 5px}.wave-report-card{max-height:calc(100vh - 16px);}}
</style>
<div id="waveReplayApp" class="wave-replay-shell">
  <div class="wave-replay-head">
    <div class="wave-title-row"><div class="wave-replay-title">BOONO — Vagues 15m / 3m</div><div class="wave-head-actions"><button id="waveModeLive" class="wave-mode-btn live" type="button"><span class="wave-live-dot"></span>LIVE</button></div></div>
    <div id="waveReplayPeriod" class="wave-replay-note">Chargement du LIVE…</div>
  </div>
  <div id="waveReplayState" class="wave-state-grid"></div>
  <div class="wave-band">
    <div class="wave-band-head wave15-head"><div class="wave-band-headline"><span class="wave-band-title">VAGUE 15m — LIVE intra-bougie</span><div class="wave-scale-actions"><button id="waveScale24" class="wave-scale-btn active" type="button">24H</button><button id="waveScale48" class="wave-scale-btn" type="button">48H</button></div></div><span class="wave-band-legend">BW noir · LBW noir fin · MF gris · VWAP jaune · UP vert · DN rouge · DIV vert/rouge · plein = régulière · pointillé = continuation</span></div>
    <div id="wave15MaInfo" class="wave-ma-info">MA200 —</div>
    <div id="wave15Scroll" class="wave-scroll top"><div class="wave-canvas-track"><canvas id="wave15Canvas" class="wave-canvas"></canvas></div></div>
  </div>
  <div id="waveTradePanel" class="wave-trade-panel"><span class="muted">Cliquer une plage bleue pour afficher le résumé du trade.</span></div>
  <div class="wave-band">
    <div class="wave-band-head"><span class="wave-band-title">VAGUE 3m — LIVE intra-bougie</span><span class="wave-band-legend">même échelle visuelle · curseur synchronisé</span></div>
    <div id="wave3MaInfo" class="wave-ma-info">MA200 —</div>
    <div id="wave3Scroll" class="wave-scroll bottom"><div class="wave-canvas-track"><canvas id="wave3Canvas" class="wave-canvas"></canvas></div></div>
    <div class="wave-scroll-meta"><span id="waveHistoryStatus">6 h visibles · chargement historique…</span></div>
  </div>
  <div id="waveTradeOverlay" class="wave-report-overlay" aria-hidden="true">
    <div class="wave-report-card" role="dialog" aria-modal="true" aria-labelledby="waveTradeOverlayTitle">
      <div class="wave-report-head"><div id="waveTradeOverlayTitle" class="wave-report-title">Rapport trade</div><button id="waveTradeOverlayClose" class="wave-report-close" type="button" aria-label="Fermer">×</button></div>
      <div id="waveTradeOverlayBody" class="wave-report-body"><div class="wave-report-loading">Chargement…</div></div>
    </div>
  </div>
</div>
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
        <form id="logoutForm" method="POST" action="/logout" style="display:none"></form>
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

/* Prix OKX direct navigateur — affichage uniquement, aucun impact moteur. */
let v3UiPrice = { price: null, ts: null, status: 'connexion...' };
let v3UiWs = null;
let v3UiPing = null;
let v3UiReconnect = null;
function updateV3LivePriceDom() {
  const priceEl = document.getElementById('v3LivePrice');
  const metaEl = document.getElementById('v3LivePriceMeta');
  if (priceEl && v3UiPrice.price !== null) {
    priceEl.textContent = Number(v3UiPrice.price).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  if (metaEl) {
    const age = v3UiPrice.ts ? Math.max(0, (Date.now() - v3UiPrice.ts) / 1000) : null;
    metaEl.textContent = v3UiPrice.status + (age !== null ? ' · ' + age.toFixed(age < 10 ? 1 : 0) + 's' : '');
  }
}
function connectV3LivePrice() {
  if (v3UiWs && (v3UiWs.readyState === WebSocket.OPEN || v3UiWs.readyState === WebSocket.CONNECTING)) return;
  clearTimeout(v3UiReconnect);
  try {
    v3UiPrice.status = 'connexion OKX...'; updateV3LivePriceDom();
    v3UiWs = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
    v3UiWs.onopen = function() {
      v3UiPrice.status = 'OKX live';
      v3UiWs.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'trades', instId: 'BTC-USDT-SWAP' }] }));
      clearInterval(v3UiPing);
      v3UiPing = setInterval(function() {
        try { if (v3UiWs && v3UiWs.readyState === WebSocket.OPEN) v3UiWs.send('ping'); } catch (_) {}
      }, 20000);
      updateV3LivePriceDom();
    };
    v3UiWs.onmessage = function(ev) {
      if (ev.data === 'pong') return;
      let m; try { m = JSON.parse(ev.data); } catch (_) { return; }
      if (!m || !m.arg || m.arg.channel !== 'trades' || !Array.isArray(m.data) || !m.data.length) return;
      const d = m.data[m.data.length - 1], px = Number(d.px);
      if (!isFinite(px)) return;
      v3UiPrice.price = px;
      v3UiPrice.ts = d.ts ? Number(d.ts) : Date.now();
      v3UiPrice.status = 'OKX live';
      updateV3LivePriceDom();
    };
    v3UiWs.onerror = function() { v3UiPrice.status = 'OKX WS erreur'; updateV3LivePriceDom(); };
    v3UiWs.onclose = function() {
      clearInterval(v3UiPing);
      v3UiPrice.status = 'OKX reconnect...'; updateV3LivePriceDom();
      v3UiReconnect = setTimeout(connectV3LivePrice, 3000);
    };
  } catch (_) {
    v3UiPrice.status = 'OKX indisponible'; updateV3LivePriceDom();
    v3UiReconnect = setTimeout(connectV3LivePrice, 3000);
  }
}
setInterval(updateV3LivePriceDom, 1000);
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
      tradesAutoRefresh = setInterval(loadTrades, 30000);
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
    document.querySelectorAll('#tab2-statev2, #tab2-historyv2, #tab2-reportsv2, #tab2-boono, #tab2-waves').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('tab2-' + el.dataset.tab2).classList.add('active');
    // Reading mode: reports must remain perfectly stable while Benjamin studies them.
    // The 30s trade refresh is suspended on the Reports sub-tab and resumes elsewhere.
    if (el.dataset.tab2 === 'reportsv2' || el.dataset.tab2 === 'waves') {
      if (tradesAutoRefresh) { clearInterval(tradesAutoRefresh); tradesAutoRefresh = null; }
      if (el.dataset.tab2 === 'waves') { waveLiveFollow=true; loadWaveLive(false); }
      else stopWaveLiveRefresh();
    } else {
      stopWaveLiveRefresh();
      const tradesMain = document.querySelector('.main-nav-item[data-main="trades"]');
      if (tradesMain && tradesMain.classList.contains('active') && !tradesAutoRefresh) {
        loadTrades();
        tradesAutoRefresh = setInterval(loadTrades, 30000);
      }
    }
  });
});


let waveReplayData = null;
let waveReplayCache = null;
let waveReplayIndex = 0;
let waveReplayTimer = null;
let waveReplayMode = 'live';
let waveLiveRefresh = null;
let waveLiveFollow = true;
let waveScaleModeHours = 24;
let waveSnapshotLoaded = false;
let waveSnapshotLoading = false;
let waveSelectedTradeId = null;

function waveNum(v, d) {
  if (v === null || v === undefined || !isFinite(Number(v))) return '—';
  return Number(v).toFixed(d === undefined ? 1 : d);
}
function waveParis(ts) {
  return new Date(ts).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' });
}
function waveRow(label, main, sub) {
  return '<div class="wave-row"><div class="k">' + label + '</div><div class="line"><span class="v">' + main + '</span>' +
    (sub ? '<span class="s"> · ' + sub + '</span>' : '') + '</div></div>';
}
function waveGroup(title, body, cls) {
  return '<section class="wave-group' + (cls ? ' ' + cls : '') + '"><div class="wave-group-title">' + title + '</div>' + body + '</section>';
}
function waveSnapshot(label, main, sub) {
  return '<div class="wave-snapshot-item"><div class="k">' + label + '</div><div class="v">' + main + '</div>' +
    (sub ? '<div class="s">' + sub + '</div>' : '') + '</div>';
}
function nearestWaveEvents(ts) {
  if (!waveReplayData || !Array.isArray(waveReplayData.events)) return [];
  return waveReplayData.events.filter(function(e) { return Math.abs(Number(e.ts) - Number(ts)) <= 20000; });
}
function waveEventX(e, frames, left, width) {
  const t0 = frames[0].ts, t1 = frames[frames.length - 1].ts;
  return left + (Number(e.ts) - t0) / Math.max(1, t1 - t0) * width;
}
function waveBarAnchors(frames, key) {
  const bucketMs = key === 'wave15' ? 15 * 60000 : 3 * 60000;
  const out = [];
  let cur = null;
  frames.forEach(function(f, i) {
    const bucket = Math.floor(Number(f.ts) / bucketMs) * bucketMs;
    if (!cur || cur.bucket !== bucket) {
      cur = {
        bucket: bucket, firstTs: Number(f.ts), lastTs: Number(f.ts),
        firstIndex: i, lastIndex: i,
        bw: null, lbw: null, mf: null, vwap: null,
        up: null, upTs: null, dn: null, dnTs: null
      };
      out.push(cur);
    }
    cur.lastTs = Number(f.ts);
    cur.lastIndex = i;
    const wv = f[key] || {};
    ['bw','lbw','mf','vwap'].forEach(function(field) {
      if (wv[field] !== null && wv[field] !== undefined && isFinite(Number(wv[field]))) cur[field] = Number(wv[field]);
    });
    if (wv.up !== null && wv.up !== undefined && isFinite(Number(wv.up))) { cur.up = Number(wv.up); cur.upTs = Number(f.ts); }
    if (wv.dn !== null && wv.dn !== undefined && isFinite(Number(wv.dn))) { cur.dn = Number(wv.dn); cur.dnTs = Number(f.ts); }
  });
  return out;
}
function waveLocalTurn(pts, i) {
  if (i <= 0 || i >= pts.length - 1) return false;
  const a = pts[i - 1], b = pts[i], c = pts[i + 1];
  const d1 = b.y - a.y, d2 = c.y - b.y;
  // Retournement visuellement significatif : changement de signe de pente
  // avec au moins ~4 px de mouvement de chaque côté. On garde ainsi les
  // vraies cassures sans transformer le bruit 3m en dents artificielles.
  return d1 * d2 < 0 && Math.abs(d1) >= 4 && Math.abs(d2) >= 4;
}
function waveSmoothPath(ctx, pts, top, bottom, moveStart, sharpTurns) {
  if (!pts.length) return;
  if (moveStart !== false) ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 1) return;
  if (pts.length === 2) { ctx.lineTo(pts[1].x, pts[1].y); return; }
  const tension = 0.72;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    // Autour d'un pivot local, on conserve volontairement un angle lisible.
    // Les segments ordinaires restent lissés en Bézier.
    if (sharpTurns && (waveLocalTurn(pts, i) || waveLocalTurn(pts, i + 1))) {
      ctx.lineTo(p2.x, p2.y);
      continue;
    }
    const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
    const cp1y = Math.max(top, Math.min(bottom, p1.y + (p2.y - p0.y) * tension / 6));
    const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
    const cp2y = Math.max(top, Math.min(bottom, p2.y - (p3.y - p1.y) * tension / 6));
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}
function waveTradeSpans(events,endTs) {
  const map=new Map();
  (events||[]).slice().sort(function(a,b){return Number(a.ts)-Number(b.ts);}).forEach(function(e){
    const id=String(e.trade);
    if(e.type==='ENTER'){
      map.set(id,{trade:e.trade,direction:e.direction,entryTs:Number(e.ts),entryPrice:e.price,exitTs:null,exitPrice:null,open:true});
    } else if(e.type==='EXIT'){
      let z=map.get(id);
      if(!z){z={trade:e.trade,direction:e.direction,entryTs:null,entryPrice:null,exitTs:null,exitPrice:null,open:false};map.set(id,z);}
      z.exitTs=Number(e.ts);z.exitPrice=e.price;z.open=false;
    }
  });
  return Array.from(map.values()).filter(function(z){return z.entryTs!==null;}).map(function(z){
    if(z.exitTs===null)z.drawEndTs=Number(endTs);else z.drawEndTs=z.exitTs;
    return z;
  });
}
function waveSelectedTradeSpan() {
  if(waveSelectedTradeId===null||!waveReplayData||!waveReplayData.frames||!waveReplayData.frames.length)return null;
  const endTs=Number(waveReplayData.frames[waveReplayData.frames.length-1].ts);
  return waveTradeSpans(waveReplayData.events||[],endTs).find(function(z){return String(z.trade)===String(waveSelectedTradeId);})||null;
}
function waveRenderTradePanel() {
  const el=document.getElementById('waveTradePanel'); if(!el)return;
  const t=waveSelectedTradeSpan();
  if(!t){
    el.innerHTML='<span class="muted">Cliquer une plage bleue pour afficher le résumé du trade.</span>';
    return;
  }
  const move=(t.exitPrice!==null&&t.exitPrice!==undefined&&t.entryPrice!==null&&t.entryPrice!==undefined)
    ?Number(t.exitPrice)-Number(t.entryPrice):null;
  const pct=move!==null&&Number(t.entryPrice)!==0?move/Number(t.entryPrice)*100:null;
  const out=t.exitTs?'Sortie '+waveParis(t.exitTs)+' @ '+waveNum(t.exitPrice,1):'Position ouverte';
  const info='<span class="info"><span class="head">#'+escTrade(t.trade)+' · '+escTrade(String(t.direction||'').toUpperCase())+'</span>'+
    'Entrée '+waveParis(t.entryTs)+' @ '+waveNum(t.entryPrice,1)+' · '+out+
    (move!==null?' · mouvement '+(move>=0?'+':'')+waveNum(move,1)+' $ ('+(pct>=0?'+':'')+waveNum(pct,3)+'%)':'')+'</span>';
  el.innerHTML=info+'<button id="waveTradeReportBtn" class="wave-trade-report-btn" type="button">RAPPORT</button>';
}

function waveCloseTradeReport() {
  const ov=document.getElementById('waveTradeOverlay');
  if(!ov)return;
  ov.classList.remove('open');
  ov.setAttribute('aria-hidden','true');
}
async function waveOpenTradeReport(tradeNo) {
  const ov=document.getElementById('waveTradeOverlay');
  const title=document.getElementById('waveTradeOverlayTitle');
  const body=document.getElementById('waveTradeOverlayBody');
  if(!ov||!title||!body)return;
  ov.classList.add('open');
  ov.setAttribute('aria-hidden','false');
  title.textContent='#'+tradeNo+' · chargement du rapport…';
  body.innerHTML='<div class="wave-report-loading">Chargement du rapport complet depuis Amsterdam…</div>';
  try{
    const res=await fetch('/api/trade-report/'+encodeURIComponent(tradeNo),{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json(),t=data.trade||{};
    if(data.status==='OPEN'){
      title.textContent='#'+data.tradeNo+' · '+String(t.direction||'').toUpperCase()+' · TRADE EN COURS';
      body.innerHTML='<div class="wave-report-loading" style="padding:0 0 8px;">Rapport non clôturé : état complet courant.</div>'+renderV2Position(data.module||'day',t);
    }else{
      title.textContent='#'+data.tradeNo+' · '+String(t.module||'day').toUpperCase()+' '+String(t.direction||'').toUpperCase()+' · '+String(t.exitKind||'TRADE');
      body.innerHTML=renderV2Report(t,0);
    }
  }catch(e){
    title.textContent='#'+tradeNo+' · rapport indisponible';
    body.innerHTML='<div class="wave-report-loading">Impossible de charger le rapport : '+escTrade(e.message)+'</div>';
  }
}
function waveSelectTradeAtPointer(ev,canvas) {
  if(!canvas)return false;
  const rect=canvas.getBoundingClientRect(),x=ev.clientX-rect.left,y=ev.clientY-rect.top;
  const zone=(canvas._waveTradeZones||[]).find(function(z){return x>=z.x1&&x<=z.x2&&y>=z.y1&&y<=z.y2;});
  if(!zone)return false;
  waveSelectedTradeId=String(zone.trade.trade);
  waveRenderTradePanel();
  return true;
}

function waveMaInfo(ma) {
  if(!ma||ma.price===null||ma.price===undefined)return 'MA200 —';
  const dist=Number(ma.distanceUsd);
  const side=ma.side==='ABOVE'?'prix au-dessus':'prix sous';
  const signed=Number.isFinite(dist)?((dist>=0?'+':'')+waveNum(dist,1)+' $'):'—';
  let test='tests '+Number(ma.testCount||0)+' · retests '+Number(ma.retestCount||0);
  if(ma.testing)test=(Number(ma.testCount||0)>1?'RETEST':'TEST')+' #'+Number(ma.testCount||1)+' EN COURS · retests '+Number(ma.retestCount||0);
  return 'MA200 '+waveNum(ma.price,1)+' · '+side+' '+signed+' · '+test;
}

function drawWaveBand(canvas, key, idx) {
  if (!canvas || !waveReplayData || !waveReplayData.frames.length) return;
  const frames = waveReplayData.frames;
  const anchors = waveBarAnchors(frames, key);
  const box = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(300, Math.floor(box.width * ratio));
  canvas.height = Math.max(140, Math.floor(box.height * ratio));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const W = box.width, H = box.height, L = 36, R = 9, T = 13, B = 19;
  const w = W - L - R, h = H - T - B;
  const t0 = Number(frames[0].ts), t1 = Number(frames[frames.length - 1].ts);
  let maxAbs = 0;
  anchors.forEach(function(a) {
    ['bw','lbw','mf','vwap'].forEach(function(field) {
      if (a[field] !== null && a[field] !== undefined && isFinite(Number(a[field]))) maxAbs = Math.max(maxAbs, Math.abs(Number(a[field])));
    });
  });
  {
    const dc=waveReplayData&&waveReplayData.divergenceCatalog&&waveReplayData.divergenceCatalog[key];
    (dc&&dc.display===true&&Array.isArray(dc.lines)?dc.lines:[]).forEach(function(d){
      if(d.start&&Number.isFinite(Number(d.start.lbw)))maxAbs=Math.max(maxAbs,Math.abs(Number(d.start.lbw)));
      if(d.end&&Number.isFinite(Number(d.end.lbw)))maxAbs=Math.max(maxAbs,Math.abs(Number(d.end.lbw)));
    });
  }
  const yLimit = Math.max(100, Math.ceil((Math.max(1,maxAbs) * 1.08) / 10) * 10);
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H);
  const y = function(v) { return T + (yLimit - Math.max(-yLimit, Math.min(yLimit, Number(v)))) / (2*yLimit) * h; };
  const tx = function(ts) { return L + (Number(ts) - t0) / Math.max(1, t1 - t0) * w; };
  const zeroY = y(0);

  const guides = [-90,-60,-30,0,30,60,90].filter(function(v){return Math.abs(v)<=yLimit;});
  guides.forEach(function(v) {
    const yy=y(v),threshold=Math.abs(v)===60;
    ctx.save();
    ctx.strokeStyle = v === 0 ? '#2f80ed' : (threshold ? '#b8b8b8' : '#ececec');
    ctx.lineWidth = v === 0 ? 1.25 : (threshold ? 1.1 : .75);
    if (v !== 0) ctx.setLineDash(threshold?[5,4]:[2,5]);
    ctx.beginPath(); ctx.moveTo(L,yy); ctx.lineTo(L+w,yy); ctx.stroke();
    ctx.restore();
    ctx.fillStyle=threshold?'#555':'#888';
    ctx.font=(threshold?"700 ":"")+"9px 'SF Mono', Menlo, Consolas, monospace";
    ctx.textAlign='right';ctx.fillText(String(v),L-5,yy+3);
  });

  canvas._waveTradeZones=[];
  waveTradeSpans(waveReplayData.events||[],t1).forEach(function(z){
    const sx=Math.max(t0,Number(z.entryTs)),ex=Math.min(t1,Number(z.drawEndTs));
    if(ex<=t0||sx>=t1||ex<=sx)return;
    const x1=tx(sx),x2=tx(ex);
    ctx.fillStyle='rgba(135,206,235,.12)';
    ctx.fillRect(x1,T,Math.max(1,x2-x1),h);
    ctx.strokeStyle='#b8d7e6';ctx.lineWidth=.7;
    ctx.beginPath();ctx.moveTo(x1,T);ctx.lineTo(x1,T+h);ctx.moveTo(x2,T);ctx.lineTo(x2,T+h);ctx.stroke();
    canvas._waveTradeZones.push({x1:x1,x2:x2,y1:T,y2:T+h,trade:z});
  });

  let lastHour = null;
  for (let i=0;i<frames.length;i++) {
    const dt = new Date(frames[i].ts);
    const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(dt);
    const hh = Number((parts.find(function(p){return p.type==='hour';})||{}).value);
    const mm = Number((parts.find(function(p){return p.type==='minute';})||{}).value);
    if (mm === 0 && hh !== lastHour) {
      lastHour = hh;
      const xx=tx(frames[i].ts);
      ctx.strokeStyle='#f0f0f0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx,T);ctx.lineTo(xx,T+h);ctx.stroke();
      ctx.fillStyle='#777';ctx.font="10px 'SF Mono', Menlo, Consolas, monospace";ctx.textAlign='center';ctx.fillText(String(hh).padStart(2,'0')+'h',xx,H-5);
    }
  }

  function points(field) {
    return anchors.filter(function(a){return a[field]!==null&&a[field]!==undefined;}).map(function(a){
      return {x:tx(Math.max(t0,Math.min(t1,a.bucket))),y:y(a[field]),v:a[field],ts:a.bucket};
    });
  }

  const mfPts=points('mf');
  if (mfPts.length) {
    ctx.beginPath();
    ctx.moveTo(mfPts[0].x,zeroY);
    ctx.lineTo(mfPts[0].x,mfPts[0].y);
    waveSmoothPath(ctx,mfPts,T,T+h,false,false);
    ctx.lineTo(mfPts[mfPts.length-1].x,zeroY);
    ctx.closePath();
    ctx.fillStyle='rgba(135,135,135,.24)';
    ctx.fill();
  }

  function line(field, color, width, alpha) {
    const pts=points(field); if(!pts.length)return;
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;
    ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();waveSmoothPath(ctx,pts,T,T+h,true,field==='bw'||field==='lbw');ctx.stroke();ctx.restore();
  }
  line('bw','#111',1.35,.92);
  line('lbw','#333',1.0,.68);
  line('vwap','#d4aa00',1.45,.98);

  {
    const dc=waveReplayData&&waveReplayData.divergenceCatalog&&waveReplayData.divergenceCatalog[key];
    const divs=dc&&dc.display===true&&Array.isArray(dc.lines)?dc.lines:[];
    ctx.save();
    ctx.beginPath();ctx.rect(L,T,w,h);ctx.clip();
    divs.forEach(function(d){
      const a=d.start,b=d.end;
      if(!a||!b)return;
      const aTs=Number.isFinite(Number(a.drawTs))
        ?Number(a.drawTs)
        :(d.kind==='CONTINUATION'
          ?Number(a.extremeTs)
          :(key==='wave3'&&Number.isFinite(Number(a.oscExtremeTs))
            ?Number(a.oscExtremeTs)
            :Number(a.confirmedAt||a.extremeTs)));
      const bTs=Number.isFinite(Number(b.drawTs))
        ?Number(b.drawTs)
        :(d.kind==='CONTINUATION'
          ?Number(b.extremeTs)
          :(d.status==='FORMING'?Number(b.extremeTs):Number(b.confirmedAt||b.extremeTs)));
      if(!Number.isFinite(aTs)||!Number.isFinite(bTs)||bTs<t0||aTs>t1)return;
      if(!Number.isFinite(Number(a.lbw))||!Number.isFinite(Number(b.lbw)))return;
      ctx.save();
      ctx.strokeStyle=d.direction==='bullish'?'#1f9d55':'#d33';
      ctx.lineWidth=1.05;
      ctx.setLineDash(d.kind==='CONTINUATION'?[5,3]:[]);
      ctx.globalAlpha=d.status==='FORMING'?0.82:0.95;
      const aLbw=key==='wave3'&&Number.isFinite(Number(a.oscExtremeLbw))?Number(a.oscExtremeLbw):Number(a.lbw);
      ctx.beginPath();
      ctx.moveTo(tx(aTs),y(aLbw));
      ctx.lineTo(tx(bTs),y(Number(b.lbw)));
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }

  const signalSet=(waveReplayData.signalEvents&&waveReplayData.signalEvents[key])||null;
  if(Array.isArray(signalSet)&&signalSet.length){
    signalSet.forEach(function(e){
      if(e.ts<t0||e.ts>t1||e.value===null||e.value===undefined)return;
      ctx.save();
      ctx.globalAlpha=e.provisional?0.58:1;
      ctx.beginPath();
      ctx.arc(tx(e.ts),y(e.value),e.provisional?2.4:3.0,0,Math.PI*2);
      ctx.fillStyle=e.type==='UP'?'#1f9d55':'#d33';
      ctx.fill();
      if(e.provisional){
        ctx.strokeStyle=e.type==='UP'?'#137c42':'#a22';
        ctx.lineWidth=.8;ctx.stroke();
      }
      ctx.restore();
    });
  } else {
    // Fallback ancien : utile si un vieux snapshot ne contient pas encore
    // le flux de signaux natifs confirmé.
    anchors.forEach(function(a){
      if(a.up!==null&&a.up!==undefined){
        ctx.beginPath();ctx.arc(tx(a.upTs||a.bucket),y(a.up),2.8,0,Math.PI*2);ctx.fillStyle='#1f9d55';ctx.fill();
      }
      if(a.dn!==null&&a.dn!==undefined){
        ctx.beginPath();ctx.arc(tx(a.dnTs||a.bucket),y(a.dn),2.8,0,Math.PI*2);ctx.fillStyle='#d33';ctx.fill();
      }
    });
  }

  (waveReplayData.events||[]).forEach(function(e){
    if(e.ts<t0||e.ts>t1)return;
    const xx=tx(e.ts);
    ctx.strokeStyle='rgba(80,80,80,.16)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx,T);ctx.lineTo(xx,T+h);ctx.stroke();
  });

  const cx=tx(frames[idx].ts);
  ctx.save();ctx.setLineDash([4,3]);ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx,T);ctx.lineTo(cx,T+h);ctx.stroke();ctx.restore();
}
function renderWaveReplay() {
  if (!waveReplayData || !waveReplayData.frames.length) return;
  waveReplayIndex = Math.max(0, Math.min(waveReplayData.frames.length-1, waveReplayIndex));
  const f = waveReplayData.frames[waveReplayIndex], s=(waveReplayMode==='live'&&waveReplayData.liveState)?waveReplayData.liveState:(f.state||{}), p=s.position||null;
  const st = s.thesis||{}, m15=s.mcb15||{}, m3=s.mcb3||{}, pm=s.pm||{}, tk=s.ticker||{}, ac=s.action||{};
  const bg=s.background||{}, setup=s.setup||{}, sr=s.structuralRoom||{}, mq=s.marketQuality||{}, epm=s.entryPm||{}, etk=s.entryTicker||{}, ns=s.nativeSignal||{};
  const w15=f.wave15||{}, conf=w15.confirmed||{}, w3=f.wave3||{}, au=f.audit||{};
  const flow = au.volumeFenetreBtc!==null&&au.winSec ? Number(au.volumeFenetreBtc)/Number(au.winSec) : null;
  const posMain=p ? String(p.direction).toUpperCase() + ' @ ' + waveNum(p.entryPrice,1) : 'FLAT';
  const posSub=p&&p.metrics ? 'MFE ' + waveNum(p.metrics.mfeUsd,1) + ' · MAE ' + waveNum(p.metrics.maeUsd,1) + (p.metrics.currentPnlUsd!==null&&p.metrics.currentPnlUsd!==undefined?' · PNL '+(Number(p.metrics.currentPnlUsd)>=0?'+':'')+waveNum(p.metrics.currentPnlUsd,2)+' $':'') : '';
  const engineShort=s.version ? String(s.version).split('-')[0].toUpperCase() : 'V4.5';

  let liveLeft='',liveRight='';
  const displayTs=(waveReplayMode==='live'&&s.ts!==null&&s.ts!==undefined)?s.ts:f.ts;
  const displayPrice=(waveReplayMode==='live'&&s.price!==null&&s.price!==undefined)?s.price:f.price;
  liveLeft+=waveRow('HEURE',waveParis(displayTs),(waveReplayMode==='live'?'LIVE':'REPLAY')+' · frame '+(waveReplayIndex+1)+' / '+waveReplayData.frames.length);
  liveLeft+=waveRow('POSITION',posMain,posSub);
  liveLeft+=waveRow('SETUP',setup.status||'—',setup.direction||setup.candidateDirection||'');
  liveRight+=waveRow('PRIX','BTC '+waveNum(displayPrice,1),'BTC-USDT-SWAP');
  liveRight+=waveRow('ACTION',ac.type||'—',ac.stage||'');
  liveRight+=waveRow('ENGINE',engineShort,'paper / simulation');
  const live='<div class="wave-live-grid"><div class="wave-live-col">'+liveLeft+'</div><div class="wave-live-col">'+liveRight+'</div></div>';

  let mcb='';
  mcb+=waveRow('THÈSE',(st.state||'—')+(st.direction?' · '+String(st.direction).toUpperCase():(st.candidateDirection?' · cand. '+String(st.candidateDirection).toUpperCase():'')),
    (st.mode?'mode '+st.mode:'')+(st.originMode?' · issue de '+st.originMode:''));
  mcb+=waveRow('SIGNAL',ns.reinforcedUp&&ns.reinforcedUp.active?'UP_REINFORCED':(ns.latest&&ns.latest.type||'—'),
    ns.reinforcedUp&&ns.reinforcedUp.active&&ns.reinforcedUp.event?'LBW '+waveNum(ns.reinforcedUp.event.value,1)+' · bypass 1H LONG actif':(ns.latest?'val '+waveNum(ns.latest.value,1)+' · age '+waveNum(ns.latest.ageMinutes,0)+'m':''));
  mcb+=waveRow('15m LIVE / CONF','LBW '+waveNum(w15.lbw,1)+' / '+waveNum(conf.lbw,1),'BW '+waveNum(w15.bw,1)+' / '+waveNum(conf.bw,1)+' · MF '+waveNum(w15.mf,1)+' / '+waveNum(conf.mf,1));
  mcb+=waveRow('15m ÉTAT',(m15.maturity||'—')+' · rec '+(m15.recoveryFraction!==null&&m15.recoveryFraction!==undefined?waveNum(100*m15.recoveryFraction,1)+'%':'—'),(m15.e15Class||'—')+' · extrême '+waveNum(m15.extremeLbw,1));
  mcb+=waveRow('3m','LBW '+waveNum(w3.lbw,1)+' · pente '+waveNum(m3.slopeLbw,1),'turn '+(m3.turningDirection||'—')+' · MF '+waveNum(w3.mf,1));

  let context='';
  context+=waveRow('BACKGROUND',bg.primaryRelation||'—',bg.oneHour?'1H '+(bg.oneHour.direction||'—')+' · '+(bg.oneHour.phase||'—')+' · macro '+(bg.macroShadow||'—'):'');
  context+=waveRow('STRUCTURE',sr.state||'—',sr.roomToBoundaryUsd!==null&&sr.roomToBoundaryUsd!==undefined?'room '+waveNum(sr.roomToBoundaryUsd,1)+' $':'');
  context+=waveRow('MARKET',(mq.state||'—')+(mq.lowEdge?' · LOW_EDGE':''),mq.window60&&mq.window60.efficiency!==undefined?'eff60 '+waveNum(100*mq.window60.efficiency,0)+'% · flips/h '+waveNum(mq.window60.flipsPerHour,0):'');

  let execution='';
  execution+=waveRow('SETUP',(setup.status||'—')+(setup.direction||setup.candidateDirection?' · '+String(setup.direction||setup.candidateDirection).toUpperCase():''),setup.reason?escTrade(setup.reason):'');
  execution+=waveRow('PM / CONVERSION',(pm.status||'—')+' · net3m '+waveNum(pm.net3m,1),'gross3m '+waveNum(pm.gross3m,1)+' · eff3m '+(pm.eff3m!==null&&pm.eff3m!==undefined?waveNum(100*pm.eff3m,0)+'%':'—'));
  execution+=waveRow('TICKER',(tk.status||'—')+(tk.direction?' · '+String(tk.direction).toUpperCase():''),'yield/P75 '+waveNum(tk.yieldVsP75,2)+' · effort/P75 '+waveNum(tk.effortVsP75,2));
  execution+=waveRow('PREUVE',(epm.status||'—')+' · ticker '+(etk.status||'—'),epm.netSince!==null&&epm.netSince!==undefined?'net '+waveNum(epm.netSince,1)+' · gross '+waveNum(epm.grossSince,1)+' · eff '+waveNum(100*epm.effSince,0)+'%'+(epm.materiality?' · matérialité '+(epm.materiality.passed?'OK':'NON'):''):'preuve repart à zéro au setup');
  execution+=waveRow('ACTION',ac.type||'—',ac.reason?escTrade(ac.reason):'');
  execution+=waveRow('FLOW / AUDIT','PM '+waveNum(au.priceMove,1)+' · cadence '+waveNum(au.cadence,1),'flow '+waveNum(flow,2)+' BTC/s · MF15 pente '+waveNum(au.mf15Pente,2)+' · MF15 Live '+waveNum(w15.mf,2));

  document.getElementById('waveReplayState').innerHTML=
    waveGroup('LIVE',live,'live')+
    waveGroup('MCB / THÈSE',mcb,'')+
    waveGroup('CONTEXTE',context,'')+
    waveGroup('EXÉCUTION / PREUVE',execution,'');

  const ma15=document.getElementById('wave15MaInfo'),ma3=document.getElementById('wave3MaInfo');
  if(ma15)ma15.textContent=waveMaInfo(w15.ma200);
  if(ma3)ma3.textContent=waveMaInfo(w3.ma200);
  const timeEl=document.getElementById('waveReplayTime'); if(timeEl)timeEl.textContent=waveParis(f.ts);
  const ev=nearestWaveEvents(f.ts),eventEl=document.getElementById('waveReplayEvent');
  if(eventEl)eventEl.textContent=ev.length ? ev.map(function(e){return e.label+' · '+String(e.direction||'').toUpperCase()+' @ '+waveNum(e.price,1);}).join(' | ') : '';
  const slider=document.getElementById('waveSlider'); if(slider)slider.value=String(waveReplayIndex);
  drawWaveBand(document.getElementById('wave15Canvas'),'wave15',waveReplayIndex);
  drawWaveBand(document.getElementById('wave3Canvas'),'wave3',waveReplayIndex);
  waveRenderTradePanel();
  waveUpdateHistoryStatus();
}
function waveSetModeButtons() {
  const r=document.getElementById('waveModeReplay'), l=document.getElementById('waveModeLive');
  if(r)r.classList.toggle('active',waveReplayMode==='replay');
  if(l)l.classList.toggle('active',waveReplayMode==='live');
}
function waveDescribePeriod() {
  if(!waveReplayData)return;
  const period=document.getElementById('waveReplayPeriod');
  if(!period)return;
  period.textContent=(waveReplayData.period&&waveReplayData.period.label?waveReplayData.period.label+' · ':'')+
    waveParis(waveReplayData.period.start)+' → '+waveParis(waveReplayData.period.end)+
    ' · '+waveReplayData.frames.length+' relevés ~30s'+
    (waveReplayMode==='live'?' · rafraîchi '+waveParis(waveReplayData.generatedAt||Date.now()):'');
}
let waveScrollProgrammatic=false;
let waveScrollSettleTimer=null;
function waveScrollPair(){
  return {top:document.getElementById('wave15Scroll'),bottom:document.getElementById('wave3Scroll')};
}
function waveVisibleWindowHours(){
  return waveScaleModeHours===48?12:6;
}
function waveSetTrackScale(){
  const tracks=document.querySelectorAll('#waveReplayApp .wave-canvas-track');
  let ratio=1;
  if(waveReplayMode==='live'&&waveReplayData&&waveReplayData.frames&&waveReplayData.frames.length>1){
    const fs=waveReplayData.frames;
    const hours=Math.max(0,(Number(fs[fs.length-1].ts)-Number(fs[0].ts))/3600000);
    ratio=Math.max(1,hours/Math.max(1,waveVisibleWindowHours()));
  }
  tracks.forEach(function(t){t.style.width=(ratio*100).toFixed(2)+'%';});
  const b24=document.getElementById('waveScale24'),b48=document.getElementById('waveScale48');
  if(b24)b24.classList.toggle('active',waveScaleModeHours===24);
  if(b48)b48.classList.toggle('active',waveScaleModeHours===48);
}
function waveSetScaleMode(hours){
  const h=Number(hours);
  if(h!==24&&h!==48)return;
  const sc=document.getElementById('wave3Scroll');
  let anchorTs=null;
  if(waveReplayData&&waveReplayData.frames&&waveReplayData.frames.length){
    if(waveLiveFollow){
      anchorTs=Number(waveReplayData.frames[waveReplayData.frames.length-1].ts);
    }else if(sc){
      const fs=waveReplayData.frames,t0=Number(fs[0].ts),t1=Number(fs[fs.length-1].ts);
      const rel=Math.max(0,Math.min(1,(sc.scrollLeft+sc.clientWidth)/Math.max(1,sc.scrollWidth)));
      anchorTs=t0+rel*(t1-t0);
    }
  }
  waveScaleModeHours=h;
  waveSetTrackScale();
  renderWaveReplay();
  requestAnimationFrame(function(){
    waveBindScrollSync();
    if(anchorTs!==null)waveScrollToTimestamp(anchorTs);
    else waveUpdateHistoryStatus();
  });
}
function waveNearestIndexForTs(ts){
  if(!waveReplayData||!waveReplayData.frames||!waveReplayData.frames.length)return 0;
  const a=waveReplayData.frames;
  let lo=0,hi=a.length-1;
  while(lo<hi){const m=Math.floor((lo+hi)/2);if(Number(a[m].ts)<Number(ts))lo=m+1;else hi=m;}
  const p=Math.max(0,lo-1);
  return Math.abs(Number(a[p].ts)-Number(ts))<=Math.abs(Number(a[lo].ts)-Number(ts))?p:lo;
}
function waveUpdateHistoryStatus(){
  const el=document.getElementById('waveHistoryStatus'),btn=document.getElementById('waveReturnLive');
  const sc=document.getElementById('wave3Scroll');
  if(!el||!sc||!waveReplayData||!waveReplayData.frames||!waveReplayData.frames.length)return;
  if(waveReplayMode!=='live'){
    el.textContent='REPLAY · période complète';
    if(btn)btn.style.display='none';
    return;
  }
  if(btn)btn.style.display='';
  const fs=waveReplayData.frames,t0=Number(fs[0].ts),t1=Number(fs[fs.length-1].ts),span=Math.max(1,t1-t0);
  const total=Math.max(1,sc.scrollWidth),leftRel=Math.max(0,Math.min(1,sc.scrollLeft/total));
  const rightRel=Math.max(0,Math.min(1,(sc.scrollLeft+sc.clientWidth)/total));
  const leftTs=t0+leftRel*span,rightTs=t0+rightRel*span;
  const max=Math.max(0,sc.scrollWidth-sc.clientWidth),nearRight=max-sc.scrollLeft<8;
  if(nearRight){
    const availableHours=Math.min(48,span/3600000);
    let availText;
    if(waveSnapshotLoaded&&availableHours>=47.5)availText='48 h disponibles';
    else if(waveSnapshotLoading)availText=availableHours.toFixed(1)+' h live · snapshot 36 h en chargement';
    else if(waveSnapshotLoaded)availText=availableHours.toFixed(1)+' h disponibles';
    else availText=availableHours.toFixed(1)+' h live';
    el.textContent='LIVE · '+waveVisibleWindowHours()+' h visibles / '+availText;
  }
  else el.textContent='HISTORIQUE · '+waveParis(leftTs)+' → '+waveParis(rightTs);
}
function waveSetScroll(left){
  const pair=waveScrollPair();
  waveScrollProgrammatic=true;
  if(pair.top)pair.top.scrollLeft=left;
  if(pair.bottom)pair.bottom.scrollLeft=left;
  requestAnimationFrame(function(){waveScrollProgrammatic=false;waveUpdateHistoryStatus();});
}
function waveScrollToTimestamp(ts){
  const sc=document.getElementById('wave3Scroll');
  if(!sc||!waveReplayData||!waveReplayData.frames||!waveReplayData.frames.length)return;
  const fs=waveReplayData.frames,t0=Number(fs[0].ts),t1=Number(fs[fs.length-1].ts);
  const rel=Math.max(0,Math.min(1,(Number(ts)-t0)/Math.max(1,t1-t0)));
  const left=Math.max(0,Math.min(sc.scrollWidth-sc.clientWidth,rel*sc.scrollWidth-sc.clientWidth));
  waveSetScroll(left);
}
function waveScrollToLive(){
  const sc=document.getElementById('wave3Scroll');
  if(!sc)return;
  waveLiveFollow=true;
  waveReplayIndex=waveReplayData&&waveReplayData.frames?Math.max(0,waveReplayData.frames.length-1):0;
  waveSetScroll(Math.max(0,sc.scrollWidth-sc.clientWidth));
  renderWaveReplay();
}
function waveOnScroll(source,target){
  if(waveScrollProgrammatic)return;
  if(target){
    waveScrollProgrammatic=true;
    target.scrollLeft=source.scrollLeft;
    requestAnimationFrame(function(){waveScrollProgrammatic=false;});
  }
  const max=Math.max(0,source.scrollWidth-source.clientWidth);
  if(waveReplayMode==='live')waveLiveFollow=(max-source.scrollLeft<8);
  waveUpdateHistoryStatus();
  clearTimeout(waveScrollSettleTimer);
  waveScrollSettleTimer=setTimeout(function(){
    if(!waveReplayData||!waveReplayData.frames||!waveReplayData.frames.length)return;
    const rel=Math.max(0,Math.min(1,(source.scrollLeft+source.clientWidth)/Math.max(1,source.scrollWidth)));
    const fs=waveReplayData.frames;
    const targetTs=Number(fs[0].ts)+rel*(Number(fs[fs.length-1].ts)-Number(fs[0].ts));
    waveReplayIndex=waveNearestIndexForTs(targetTs);
    renderWaveReplay();
  },120);
}
function waveBindScrollSync(){
  const pair=waveScrollPair();
  if(pair.top&&!pair.top.dataset.waveSyncBound){
    pair.top.dataset.waveSyncBound='1';
    pair.top.addEventListener('scroll',function(){waveOnScroll(pair.top,pair.bottom);},{passive:true});
  }
  if(pair.bottom&&!pair.bottom.dataset.waveSyncBound){
    pair.bottom.dataset.waveSyncBound='1';
    pair.bottom.addEventListener('scroll',function(){waveOnScroll(pair.bottom,pair.top);},{passive:true});
  }
}

function waveApplyData(data, mode, targetTs) {
  waveReplayData=data; waveReplayMode=mode;
  const slider=document.getElementById('waveSlider');
  if(slider)slider.max=String(Math.max(0,data.frames.length-1));
  if(mode==='live'&&waveLiveFollow) waveReplayIndex=Math.max(0,data.frames.length-1);
  else if(targetTs!==null&&targetTs!==undefined&&data.frames.length){
    waveReplayIndex=waveNearestIndexForTs(targetTs);
  } else waveReplayIndex=Math.max(0,Math.min(data.frames.length-1,waveReplayIndex));
  if(slider)slider.value=String(waveReplayIndex);
  waveSetModeButtons(); waveDescribePeriod(); waveSetTrackScale(); renderWaveReplay();
  requestAnimationFrame(function(){
    waveBindScrollSync();
    if(mode==='live'&&waveLiveFollow)waveScrollToTimestamp(data.frames[data.frames.length-1].ts);
    else if(targetTs!==null&&targetTs!==undefined)waveScrollToTimestamp(targetTs);
    else waveUpdateHistoryStatus();
  });
}
function stopWaveLiveRefresh(){if(waveLiveRefresh){clearInterval(waveLiveRefresh);waveLiveRefresh=null;}}
function startWaveLiveRefresh(){
  stopWaveLiveRefresh();
  waveLiveRefresh=setInterval(function(){
    const p=document.getElementById('tab2-waves');
    if(p&&p.classList.contains('active')&&waveReplayMode==='live')loadWaveLive(true);
  },30000);
}
async function loadWaveReplay() {
  const app=document.getElementById('waveReplayApp'); if(!app)return;
  stopWaveLiveRefresh();
  waveReplayMode='replay'; waveLiveFollow=false; waveSetModeButtons();
  try{
    if(!waveReplayCache){
      const res=await fetch('/api/wave-replay'); if(!res.ok)throw new Error('HTTP '+res.status);
      waveReplayCache=await res.json();
    }
    const firstLoss=(waveReplayCache.events||[]).find(function(e){return e.trade===10&&e.type==='ENTER';});
    let target=null;
    if(firstLoss)target=firstLoss.ts;
    waveApplyData(waveReplayCache,'replay',target);
  }catch(e){
    document.getElementById('waveReplayState').innerHTML='<div class="placeholder-note">Replay indisponible : '+e.message+'</div>';
  }
}
function waveMergeSnapshotData(live,snapshot){
  if(!snapshot||!snapshot.frames||!snapshot.frames.length)return live;
  const frameMap=new Map();
  (snapshot.frames||[]).forEach(function(f){
    const ts=Number(f&&f.ts); if(Number.isFinite(ts))frameMap.set(ts,f);
  });
  (live.frames||[]).forEach(function(f){
    const ts=Number(f&&f.ts); if(Number.isFinite(ts))frameMap.set(ts,f); // rich live wins
  });
  const frames=Array.from(frameMap.values()).sort(function(a,b){return Number(a.ts)-Number(b.ts);});
  const eventMap=new Map();
  (snapshot.events||[]).concat(live.events||[]).forEach(function(e){
    if(!e)return;
    eventMap.set([e.type,e.trade,e.ts].join('|'),e);
  });
  function mergeSignals(key){
    const map=new Map();
    const a=(snapshot.signalEvents&&snapshot.signalEvents[key])||[];
    const b=(live.signalEvents&&live.signalEvents[key])||[];
    a.concat(b).forEach(function(e){
      if(!e)return;
      map.set([e.type,e.ts,e.value,e.provisional?'P':'C'].join('|'),e);
    });
    return Array.from(map.values()).sort(function(x,y){return Number(x.ts)-Number(y.ts);});
  }
  return Object.assign({},snapshot,live,{
    live:true,
    snapshotLoaded:true,
    frames:frames,
    events:Array.from(eventMap.values()).sort(function(a,b){return Number(a.ts)-Number(b.ts);}),
    signalEvents:{wave3:mergeSignals('wave3'),wave15:mergeSignals('wave15')},
    period:{
      start:frames.length?new Date(frames[0].ts).toISOString():snapshot.period&&snapshot.period.start,
      end:frames.length?new Date(frames[frames.length-1].ts).toISOString():live.period&&live.period.end,
      label:'LIVE 12h + SNAPSHOT confirmé 12–48h'
    },
    sampling:Object.assign({},live.sampling||{},{
      frames:frames.length,
      snapshotFrames:(snapshot.frames||[]).length,
      snapshot3m:snapshot.sampling&&snapshot.sampling.wave3Bars||0,
      snapshot15m:snapshot.sampling&&snapshot.sampling.wave15Bars||0
    })
  });
}
async function loadWaveSnapshot(){
  if(waveSnapshotLoaded||waveSnapshotLoading||!waveReplayData)return;
  waveSnapshotLoading=true;
  waveUpdateHistoryStatus();
  const oldTs=waveReplayData&&waveReplayData.frames&&waveReplayData.frames[waveReplayIndex]?waveReplayData.frames[waveReplayIndex].ts:null;
  try{
    const res=await fetch('/api/wave-snapshot',{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const snapshot=await res.json();
    waveSnapshotLoaded=true;
    const merged=waveMergeSnapshotData(waveReplayData,snapshot);
    waveApplyData(merged,'live',waveLiveFollow?null:oldTs);
  }catch(e){
    const el=document.getElementById('waveHistoryStatus');
    if(el)el.textContent='Archive 12–48h indisponible · LIVE 12h actif';
  }finally{
    waveSnapshotLoading=false;
    waveUpdateHistoryStatus();
  }
}

function waveMergeLiveData(base,recent){
  if(!base||!base.frames||!base.frames.length)return recent;
  const recentFrames=(recent&&recent.frames)||[];
  if(!recentFrames.length)return base;
  const endTs=Number(recentFrames[recentFrames.length-1].ts)||Date.now();
  const cut=endTs-48*3600000;
  const frameMap=new Map();
  (base.frames||[]).concat(recentFrames).forEach(function(f){
    const ts=Number(f&&f.ts);
    if(Number.isFinite(ts)&&ts>=cut)frameMap.set(ts,f);
  });
  const frames=Array.from(frameMap.values()).sort(function(a,b){return Number(a.ts)-Number(b.ts);});
  const eventMap=new Map();
  (base.events||[]).concat(recent.events||[]).forEach(function(e){
    if(!e)return;
    eventMap.set([e.type,e.trade,e.ts].join('|'),e);
  });
  function mergeSignals(key){
    const map=new Map();
    const a=(base.signalEvents&&base.signalEvents[key])||[];
    const b=(recent.signalEvents&&recent.signalEvents[key])||[];
    a.concat(b).forEach(function(e){
      if(!e||Number(e.ts)<cut)return;
      map.set([e.type,e.ts,e.value,e.provisional?'P':'C'].join('|'),e);
    });
    return Array.from(map.values()).sort(function(x,y){return Number(x.ts)-Number(y.ts);});
  }
  return Object.assign({},base,recent,{
    live:true,
    frames:frames,
    events:Array.from(eventMap.values()).sort(function(a,b){return Number(a.ts)-Number(b.ts);}),
    signalEvents:{wave3:mergeSignals('wave3'),wave15:mergeSignals('wave15')},
    period:{
      start:frames.length?new Date(frames[0].ts).toISOString():new Date(cut).toISOString(),
      end:frames.length?new Date(frames[frames.length-1].ts).toISOString():new Date(endTs).toISOString(),
      label:'LIVE Amsterdam · 48h glissantes'
    },
    sampling:Object.assign({},recent.sampling||{}, {frames:frames.length})
  });
}

async function loadWaveLive(force) {
  const app=document.getElementById('waveReplayApp'); if(!app)return;
  const hadLive=waveReplayMode==='live'&&waveReplayData&&waveReplayData.frames&&waveReplayData.frames.length;
  const oldTs=waveReplayData&&waveReplayData.frames&&waveReplayData.frames[waveReplayIndex]?waveReplayData.frames[waveReplayIndex].ts:null;
  waveReplayMode='live'; waveSetModeButtons();
  try{
    const hours=hadLive?1:12;
    const res=await fetch('/api/wave-live?hours='+hours+(force?'&_='+Date.now():''),{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    let data=await res.json();
    if(hadLive)data=waveMergeLiveData(waveReplayData,data);
    waveApplyData(data,'live',waveLiveFollow?null:oldTs);
    startWaveLiveRefresh();
    if(!hadLive&&!waveSnapshotLoaded&&!waveSnapshotLoading){
      setTimeout(function(){loadWaveSnapshot();},0);
    }
  }catch(e){
    document.getElementById('waveReplayState').innerHTML='<div class="placeholder-note">Live indisponible : '+e.message+'</div>';
  }
}
function waveStep(delta){if(!waveReplayData)return;waveReplayIndex=Math.max(0,Math.min(waveReplayData.frames.length-1,waveReplayIndex+delta));renderWaveReplay();if(waveReplayData.frames[waveReplayIndex])waveScrollToTimestamp(waveReplayData.frames[waveReplayIndex].ts);}
document.addEventListener('input',function(e){if(e.target&&e.target.id==='waveSlider'){if(waveReplayMode==='live')waveLiveFollow=false;waveReplayIndex=Number(e.target.value)||0;renderWaveReplay();if(waveReplayData&&waveReplayData.frames[waveReplayIndex])waveScrollToTimestamp(waveReplayData.frames[waveReplayIndex].ts);}});
document.addEventListener('click',function(e){
  if(!e.target)return;
  const id=e.target.id || (e.target.closest&&e.target.closest('button')&&e.target.closest('button').id);
  if(id==='waveModeReplay'){loadWaveReplay();return;}
  if(id==='waveScale24'){waveSetScaleMode(24);return;}
  if(id==='waveScale48'){waveSetScaleMode(48);if(!waveSnapshotLoaded)loadWaveSnapshot();return;}
  if(id==='waveModeLive'){waveLiveFollow=true;loadWaveLive(true).then(function(){requestAnimationFrame(waveScrollToLive);});return;}
  if(id==='waveReturnLive'){waveScrollToLive();return;}
  if(id==='waveStepBack'){if(waveReplayMode==='live')waveLiveFollow=false;waveStep(-1);}
  if(id==='waveStepFwd'){waveStep(1);if(waveReplayMode==='live'&&waveReplayIndex>=waveReplayData.frames.length-1)waveLiveFollow=true;}
  if(id==='wavePlay'){
    if(waveReplayTimer){clearInterval(waveReplayTimer);waveReplayTimer=null;e.target.textContent='▶';}
    else {e.target.textContent='Ⅱ';waveReplayTimer=setInterval(function(){if(!waveReplayData)return;if(waveReplayIndex>=waveReplayData.frames.length-1){clearInterval(waveReplayTimer);waveReplayTimer=null;const b=document.getElementById('wavePlay');if(b)b.textContent='▶';return;}waveStep(1);},180);}
  }
});
function waveTradeOverlayClick(ev) {
  const t=ev.target;
  if(t&&t.classList&&t.classList.contains('wave-canvas')){waveSelectTradeAtPointer(ev,t);return;}
  if(t&&t.id==='waveTradeReportBtn'){
    if(waveSelectedTradeId!==null)waveOpenTradeReport(waveSelectedTradeId);
    return;
  }
  if(t&&t.id==='waveTradeOverlayClose'){waveCloseTradeReport();return;}
  if(t&&t.id==='waveTradeOverlay'){waveCloseTradeReport();}
}
document.addEventListener('click',waveTradeOverlayClick);
document.addEventListener('keydown',function(ev){if(ev.key==='Escape')waveCloseTradeReport();});

waveBindScrollSync();
window.addEventListener('resize',function(){const p=document.getElementById('tab2-waves');if(p&&p.classList.contains('active')&&waveReplayData){waveSetTrackScale();renderWaveReplay();if(waveLiveFollow)requestAnimationFrame(waveScrollToLive);}});

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

function rawLedgerUnits() {
  const seen = new Set();
  const units = [];
  entries.forEach((e, i) => {
    const key = e.groupId != null ? 'g:' + e.groupId : 's:' + i;
    if (seen.has(key)) return;
    seen.add(key);
    if (e.groupId != null) {
      const idx = entries.map((x, j) => j).filter(j => entries[j].groupId === e.groupId);
      units.push({ type:'group', groupId:e.groupId, idx });
    } else {
      units.push({ type:'single', idx:[i] });
    }
  });
  return units;
}
function ledgerUnitOrder(u) {
  const vals = u.idx.map(i => Number(entries[i] && entries[i].uiOrder)).filter(Number.isFinite);
  return vals.length ? Math.min(...vals) : null;
}
function setLedgerUnitOrder(u, order) {
  u.idx.forEach(i => { if (entries[i]) entries[i].uiOrder = order; });
}
function ensureLedgerUiOrder() {
  const units = rawLedgerUnits();
  if (!units.length) return [];
  const haveAny = units.some(u => Number.isFinite(ledgerUnitOrder(u)));
  const missing = units.filter(u => !Number.isFinite(ledgerUnitOrder(u)));
  if (!haveAny) {
    units.slice().reverse().forEach((u, pos) => setLedgerUnitOrder(u, pos));
  } else if (missing.length) {
    const existing = units.filter(u => Number.isFinite(ledgerUnitOrder(u)))
      .sort((a,b) => ledgerUnitOrder(a) - ledgerUnitOrder(b));
    const display = missing.slice().reverse().concat(existing);
    display.forEach((u, pos) => setLedgerUnitOrder(u, pos));
  }
  return rawLedgerUnits().sort((a,b) => ledgerUnitOrder(a) - ledgerUnitOrder(b));
}
function normalizeLedgerUiOrder(units) {
  units.forEach((u, pos) => setLedgerUnitOrder(u, pos));
}
function nextLedgerTopOrder() {
  const units = ensureLedgerUiOrder();
  if (!units.length) return 0;
  return Math.min(...units.map(u => ledgerUnitOrder(u))) - 1;
}
function moveLedgerUnit(pos, delta) {
  const units = ensureLedgerUiOrder();
  const target = pos + delta;
  if (pos < 0 || pos >= units.length || target < 0 || target >= units.length) return;
  const tmp = units[pos]; units[pos] = units[target]; units[target] = tmp;
  normalizeLedgerUiOrder(units);
  renderLedger();
  updateScenarioOptions();
}

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
  const uiOrder = nextLedgerTopOrder();
  parsed.forEach(p => {
    const label = p.scope ? p.token + ' ' + p.scope.split('-')[0] : p.token;
    entries.push({ label, token: p.token, price: p.price, time, fam: p.fam, groupId, uiOrder });
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

function renderRow(e, idx, unitPos, canUp, canDown, groupMove) {
  const c = famColors[e.fam];
  const orderControls = Number.isInteger(unitPos)
    ? '<span class="ledger-order">' +
      '<button class="ledger-move" type="button" data-unit="' + unitPos + '" data-move="-1" aria-label="' + (groupMove?'Monter le groupe':'Monter le niveau') + '"' + (canUp?'':' disabled') + '>↑</button>' +
      '<button class="ledger-move" type="button" data-unit="' + unitPos + '" data-move="1" aria-label="' + (groupMove?'Descendre le groupe':'Descendre le niveau') + '"' + (canDown?'':' disabled') + '>↓</button>' +
      '</span>' : '';
  return '<div class="ledger-row" data-idx="' + idx + '">' +
    '<span class="ledger-badge" style="background:' + c.bg + ';color:' + c.fg + '">' + e.label + '</span>' +
    '<span class="ledger-price mono" data-price-cell="' + idx + '">' + e.price.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '</span>' +
    '<span class="ledger-time">' + e.time + '</span>' +
    orderControls +
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
  const ledger = document.getElementById('ledger');
  if (entries.length === 0) {
    ledger.innerHTML = '<div class="ledger-empty">Aucun niveau soumis</div>';
    saveLevels();
    return;
  }

  const units = ensureLedgerUiOrder();
  normalizeLedgerUiOrder(units);
  saveLevels();

  let html = '';
  units.forEach((u, unitPos) => {
    const canUp = unitPos > 0;
    const canDown = unitPos < units.length - 1;
    if (u.type === 'group') {
      const groupEntries = u.idx.map(idx => ({ ...entries[idx], idx }));
      groupEntries.sort((a, b) => (domainOrder[a.token] ?? 99) - (domainOrder[b.token] ?? 99));
      const isFibGroup = groupEntries.some(ge => ge.token === 'fib0') && groupEntries.some(ge => ge.token === 'fib1');
      let fibInfoHtml = '';
      if (isFibGroup) {
        const fib0 = groupEntries.find(ge => ge.token === 'fib0').price;
        const fib1 = groupEntries.find(ge => ge.token === 'fib1').price;
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
        groupEntries.map((ge, j) => renderRow(ge, ge.idx, j===0?unitPos:null, canUp, canDown, true)).join('') + '</div>';
    } else {
      const idx = u.idx[0];
      html += renderRow(entries[idx], idx, unitPos, canUp, canDown, false);
    }
  });

  ledger.innerHTML = html;

  ledger.querySelectorAll('.ledger-move').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      moveLedgerUnit(parseInt(btn.dataset.unit), parseInt(btn.dataset.move));
    });
  });
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
  const ordered = [];
  ensureLedgerUiOrder().forEach(u => {
    let rows = u.idx.map(idx => ({ ...entries[idx], idx }));
    if (u.type === 'group') rows.sort((a,b) => (domainOrder[a.token] ?? 99) - (domainOrder[b.token] ?? 99));
    ordered.push(...rows);
  });
  sel.innerHTML = '<option value="">-- selectionne un niveau soumis --</option>' +
    ordered.map(e => '<option value="' + e.idx + '">' + e.label + ' -- ' + e.price.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '</option>').join('');
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
document.getElementById('diagRefresh') && document.getElementById('diagRefresh').addEventListener('click', loadDiagnostic);

function escTrade(v) {
  if (v === null || v === undefined) return '--';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function tradeTime(v) {
  if (!v) return '--';
  try { return new Date(v).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }); } catch (_) { return String(v); }
}
function v3Fmt(v, digits) {
  if (v === null || v === undefined || isNaN(Number(v))) return '--';
  return Number(v).toFixed(digits === undefined ? 1 : digits);
}
function v3Signed(v, digits) {
  if (v === null || v === undefined || isNaN(Number(v))) return '--';
  const n = Number(v); return (n >= 0 ? '+' : '') + n.toFixed(digits === undefined ? 1 : digits);
}
function v3DivSummary(div) {
  if (!div) return '--';
  const by = div.byTf || {};
  const parts = ['3m','15m','1h','4h'].map(function(tf) {
    const d = by[tf] || {};
    let marks = [];
    if (d.bullish) marks.push('<span style="color:#26a69a;">&#9650; confirmed</span>');
    if (d.bearish) marks.push('<span style="color:#ef5350;">&#9660; confirmed</span>');
    (d.forming || []).forEach(function(x) {
      if (x === 'bullish') marks.push('<span style="color:#26a69a;opacity:.7;">&#9650; forming</span>');
      if (x === 'bearish') marks.push('<span style="color:#ef5350;opacity:.7;">&#9660; forming</span>');
    });
    return tf + ' ' + (marks.length ? marks.join('/') : '—');
  });
  const lg = div.legacy || {};
  if (lg.score) parts.push('legacy ' + escTrade(lg.sens || 'div') + (lg.multidiv ? ' multi' : ''));
  return parts.join(' · ');
}
function ctxSummary(c) {
  if (!c) return '<span style="opacity:0.55;">contexte indisponible</span>';

  /* V4 — MCB autorite, PM/ticker confirmation, contexte informatif. */
  if (c.mcb && c.thesis) {
    const m = c.mcb || {}, ml = m.currentLobe || {}, rel = ml.relationshipFromPrevious || {};
    const n3 = m.nested3m || {}, th = c.thesis || {}, gate = th.maturityGate || {}, tr = c.translation || {}, tk = c.ticker || {}, ns = c.nativeSignal || {};
    const cx = c.context || {}, rk = c.risk || {}, ac = c.action || {}, pm = tr.pmLive || {}, hz = tr.horizons || {};
    const bg=c.background||{}, h1=bg.oneHour||{}, setup=c.setup||{}, room=c.structuralRoom||{}, mq=c.marketQuality||{}, mfs=c.mfStructureShadow||{};
    const etr=c.entryTranslation||{}, etk=c.entryTicker||{}, es=etr.sinceSetup||{};
    const tcur = tk.current || {}, per = tk.persistence || {}, rp = rk.position || {};
    const v3s = c.v3Shadow || {}, v3a = v3s.action || {};
    const rec = (ml.recoveryFraction !== undefined && ml.recoveryFraction !== null) ? (100 * Number(ml.recoveryFraction)).toFixed(1) + '%' : '--';
    return '<div style="font-size:11px; line-height:1.65; opacity:0.94;">' +
      '<div><b>MCB THESIS</b> ' + escTrade(th.state) +
        (th.direction ? ' → ' + escTrade(th.direction) : (th.candidateDirection ? ' · candidat ' + escTrade(th.candidateDirection) : '')) +
        (th.state==='TRANSITION_NEUTRAL'&&th.mode ? ' · ' + escTrade(th.mode) : '') +
        (th.originMode ? ' · issue de ' + escTrade(th.originMode) : '') +
        ' · <b>autorité directionnelle MCB</b></div>' +
      (gate.required ? '<div><b>MATURITÉ</b> ' + (gate.passed ? 'PASS' : 'NEUTRE') +
        ' · net3m ' + (gate.net3mAligned ? 'aligné' : 'non aligné') +
        (gate.nested3m ? ' · 3m ' + escTrade(gate.nested3m.state) : '') + '</div>' : '') +
      '<div><b>BACKGROUND MCB</b> 1H ' + escTrade(bg.primaryRelation) +
        (h1.direction ? ' · ' + escTrade(h1.direction) + ' / ' + escTrade(h1.phase) : '') +
        ' · 4H/D shadow ' + escTrade(bg.macroShadow) + '</div>' +
      '<div><b>MCB SIGNAL</b> ' + ((ns.reinforcedUp&&ns.reinforcedUp.active)?'<b>UP_REINFORCED</b>':'') +
        (ns.latest ? ((ns.reinforcedUp&&ns.reinforcedUp.active?' · ':'') + escTrade(ns.latest.type) + ' @ ' + v3Fmt(ns.latest.value,1) + ' · age ' + v3Fmt(ns.latest.ageMinutes,0) + 'm') : '—') + '</div>' +
      '<div><b>SETUP</b> ' + escTrade(setup.status) +
        (setup.direction||setup.candidateDirection ? ' → ' + escTrade(setup.direction||setup.candidateDirection) : '') +
        ' · ' + escTrade(setup.reason) + '</div>' +
      '<div><b>STRUCTURE</b> ' + escTrade(room.state) +
        (room.roomToBoundaryUsd!==undefined&&room.roomToBoundaryUsd!==null ? ' · room ' + v3Fmt(room.roomToBoundaryUsd,1) + '$' : '') +
        ' · <b>MARKET</b> ' + escTrade(mq.state) + '</div>' +
      '<div><b>PREUVE POST-SETUP</b> PM ' + escTrade(etr.status) + ' · ticker ' + escTrade(etk.status) +
        (es.netUsd!==undefined&&es.netUsd!==null ? ' · net ' + v3Signed(es.netUsd,1) + '$ · gross ' + v3Fmt(es.grossUsd,1) + '$ · effic ' + v3Fmt(100*Number(es.efficiency||0),1) + '%' : '') + '</div>' +
      '<div><b>E15 / 15m</b> ' + escTrade(ml.type) + ' · classe ' + escTrade(ml.e15Class) +
        ' · LBW extrême ' + v3Fmt(ml.extremeLbw,2) + ' → actuel ' + v3Fmt(ml.currentLbw,2) +
        ' · récupération ' + rec +
        (rel.lbwSpan !== undefined ? ' · span ' + v3Fmt(rel.lbwSpan,1) : '') +
        (ml.priceReversalFromLobeExtremeUsd !== undefined ? ' · prix depuis extrême ' + v3Signed(ml.priceReversalFromLobeExtremeUsd,1) + '$' : '') + '</div>' +
      '<div><b>MCB 3m</b> LBW ' + v3Fmt(n3.currentLbw,2) + ' · extrême ' + v3Fmt(n3.extremeLbw,2) +
        ' · pente ' + v3Signed(n3.slopeLbw,2) + (n3.turningDirection ? ' · turning ' + escTrade(n3.turningDirection) : '') + '</div>' +
      '<div><b>MF15 SHADOW</b> ' + escTrade(mfs.structuralState) +
        (mfs.highRelation||mfs.lowRelation ? ' · ' + escTrade(mfs.highRelation) + '/' + escTrade(mfs.lowRelation) : '') +
        (mfs.extensionState ? ' · ' + escTrade(mfs.extensionState) : '') +
        (mfs.currentMf!==undefined&&mfs.currentMf!==null ? ' · MF ' + v3Signed(mfs.currentMf,2) : '') +
        (mfs.candidateContext&&mfs.candidateContext.state ? ' · ' + escTrade(mfs.candidateContext.state) : '') +
        ' · shadow uniquement</div>' +
      '<div><b>PM LIVE</b> ' + escTrade(tr.status) + ' · PM ' + v3Signed(pm.priceMoveUsd,1) + '$' +
        (hz.net3mUsd !== undefined ? ' · net3m ' + v3Signed(hz.net3mUsd,1) + '$' : '') +
        (hz.efficiency3m !== undefined && hz.efficiency3m !== null ? ' · effic3m ' + (100*Number(hz.efficiency3m)).toFixed(1) + '%' : '') + '</div>' +
      '<div><b>TICKER</b> ' + escTrade(tk.status) +
        ' · yield ' + v3Fmt(tcur.yieldUsdPerBtc,2) + '$/BTC' +
        (tcur.yieldVsP95 !== undefined && tcur.yieldVsP95 !== null ? ' · xP95 ' + v3Fmt(tcur.yieldVsP95,2) : '') +
        ' · cadence ' + v3Fmt(tcur.cadence,2) + ' · flow ' + v3Fmt(tcur.flowBtcPerSec,3) +
        (per.terrainRetainedFraction !== undefined ? ' · terrain ' + v3Fmt(per.terrainRetainedFraction,2) : '') + '</div>' +
      '<div><b>CONTEXTE</b> ' + escTrade(cx.status) + ' · informatif uniquement</div>' +
      '<div><b>RISK</b> cap absolu ' + v3Fmt(rk.absoluteMaxLossUsd,0) + '$' +
        (rk.position ? ' · courant ' + v3Signed(rp.currentSignedUsd,1) + '$ · MFE +' + v3Fmt(rp.mfeUsd,1) + '$ · MAE -' + v3Fmt(rp.maeUsd,1) + '$' : '') + '</div>' +
      '<div><b>ACTION V4</b> ' + escTrade(ac.type) + (ac.direction ? ' ' + escTrade(ac.direction) : '') +
        ' · ' + escTrade(ac.stage) + ' · ' + escTrade(ac.reason) + '</div>' +
      (v3a.type ? '<div style="opacity:.58;"><b>V3 SHADOW</b> ' + escTrade(v3a.type) + (v3a.direction ? ' ' + escTrade(v3a.direction) : '') + ' · ' + escTrade(v3a.reason) + '</div>' : '') +
      '</div>';
  }

  /* V3-LAB archive/shadow */
  if (c.wave) {
    const wh = c.where || {}, w = c.wave || {}, cur = w.current || {}, pp = w.price || {};
    const rg = c.regime || {}, dom = c.dominance || {}, rk = c.risk || {}, resp = rk.respiration || {};
    const seq = c.sequence || {}, rev = c.reversal || {}, w3 = w.nested3m || {};
    const tk = c.ticker || {}, ac = c.action || {}, sh = c.shadow || {}, div = sh.divergence || null;
    const origin = w.origin || {}, structural = rk.structural || {}, lgi = wh.lgi || {}, sr = wh.sr || {};
    const nl = lgi.nearest || null, ns = sr.nearest || null;
    const priceExtreme = w.direction === 'short' ? pp.maxPrice : (w.direction === 'long' ? pp.minPrice : null);
    const lgiTxt = 'LGI x' + (lgi.activeCount || 0) +
      (lgi.confluence ? ' · conf ' + lgi.confluence : '') +
      (nl && nl.distanceUsd !== undefined ? ' · nearest ' + v3Signed(nl.distanceUsd, 0) + '$' : '');
    const srTxt = ns ? (escTrade(ns.label || ns.family || 'S/R') + ' ' + v3Signed(ns.distanceUsd, 0) + '$') : '—';
    return '<div style="font-size:11px; line-height:1.65; opacity:0.92;">' +
      '<div><b>WAVE 15m</b> ' + escTrade(w.phase) + (w.direction ? ' → ' + escTrade(w.direction) : '') +
        (w.turningPoint ? ' · <b>' + escTrade(w.turningPoint) + '</b>' : '') +
        (origin.type ? ' · ancre E15 ' + escTrade(origin.type) + ' @ ' + v3Fmt(origin.price,1) : '') +
        (priceExtreme !== null && priceExtreme !== undefined ? ' · extrême prix @ ' + v3Fmt(priceExtreme,1) : '') +
        (rk.protection && rk.protection.price !== null && rk.protection.price !== undefined ? ' · protection @ ' + v3Fmt(rk.protection.price,1) : '') + '</div>' +
      '<div><b>MCB 15m</b> LBW ' + v3Fmt(cur.lbw,2) + ' · BW ' + v3Fmt(cur.bw,2) + ' · MF ' + v3Fmt(cur.moneyFlow,2) + '</div>' +
      '<div><b>3m</b> ' + escTrade(w3.phase) + (w3.direction ? ' → ' + escTrade(w3.direction) : '') +
        (w3.turningPoint ? ' · ' + escTrade(w3.turningPoint) : '') +
        (w3.current ? ' · LBW ' + v3Fmt(w3.current.lbw,2) + ' · MF ' + v3Fmt(w3.current.moneyFlow,2) : '') + '</div>' +
      '<div><b>PRIX / VAGUE</b> translation ' + v3Signed(pp.signedTranslationUsd,1) + '$ · respiration ' + v3Fmt(pp.counterExcursionUsd,1) + '$</div>' +
      '<div><b>REGIME</b> ' + escTrade(rg.state) +
        (rg.current ? ' · effic ' + v3Fmt(100 * Number(rg.current.efficiency || 0),1) + '% · brut/h ' + v3Fmt(rg.current.grossPerHour,0) + '$' : '') + '</div>' +
      '<div><b>TICKER</b> Vol ' + v3Fmt(tk.volumeFenetreBtc,2) + ' BTC · winSec ' + v3Fmt(tk.winSec,1) + 's · cadence ' +
        v3Fmt(tk.cadence,2) + ' · PM ' + v3Signed(tk.priceMove,1) + '$</div>' +
      '<div><b>RESPIRATION RISK</b> ' + escTrade(resp.currentState) + ' · actuelle ' + v3Fmt(resp.currentCounterExcursionUsd,1) +
        '$ · p75 ' + v3Fmt(resp.p75,1) + '$ · p90 ' + v3Fmt(resp.p90,1) + '$</div>' +
      '<div><b>WHERE</b> ' + escTrade(wh.status) + ' · confiance ' + escTrade(wh.confidence) + ' · ' + lgiTxt + ' · S/R ' + srTxt + '</div>' +
      '<div><b>SEQUENCE</b> ' + ((seq.continuation && seq.continuation.locationReady) ?
        ('location ' + escTrade(seq.continuation.locationSource) + (seq.agesMs && seq.agesMs.where !== null ? ' · age ' + (Number(seq.agesMs.where)/60000).toFixed(1) + 'm' : '')) : 'aucune location fraiche') +
        (seq.memory && seq.memory.turning ? ' · turning ' + escTrade(seq.memory.turning.type) + ' (' + (Number(seq.agesMs.turning)/60000).toFixed(1) + 'm)' : '') + '</div>' +
      '<div><b>REVERSAL</b> ' + escTrade(rev.status) +
        (rev.candidateDirection ? ' · candidat ' + escTrade(rev.candidateDirection) : '') +
        (rev.evidence ? ' · turn ' + (rev.evidence.turningReady ? 'OK' : '—') + ' · 3m ' + escTrade(rev.evidence.nested3mDirection) +
          ' · dom ' + (rev.evidence.dominanceReady ? 'OK' : '—') : '') + '</div>' +
      '<div><b>DIV</b> ' + v3DivSummary(div) + '</div>' +
      (sh.tranches ? '<div><b>TRANCHES SHADOW</b> 70/30 · 60/40 · 50/50 · runners ' + ((sh.tranches.open || []).length) +
        ' · complétés ' + Number(sh.tranches.completed || 0) + '</div>' : '') +
      '<div><b>DOMINANCE</b> ' + escTrade(dom.state) + (dom.direction ? ' → ' + escTrade(dom.direction) : '') +
        (dom.proofScore !== undefined ? ' · preuve ' + Number(dom.proofScore).toFixed(2) : '') +
        (dom.retainedFraction !== undefined ? ' · terrain ' + Number(dom.retainedFraction).toFixed(2) : '') + '</div>' +
      '<div><b>ACTION</b> ' + escTrade(ac.type) + (ac.direction ? ' ' + escTrade(ac.direction) : '') + ' · ' + escTrade(ac.reason) + '</div>' +
      '</div>';
  }

  /* Compatibilite Constitution V2 archivee. */
  if (c.where || c.state || c.dominance || c.risk || c.action) {
    const wh = c.where || {}, st = c.state || {}, dom = c.dominance || {}, rk = c.risk || {}, ac = c.action || {};
    const lobe = st.lobe || {}, ps = st.priceStructure3m || st.structure || {};
    return '<div style="font-size:11px; line-height:1.55; opacity:0.86;">' +
      '<b>WHERE</b> ' + escTrade(wh.status) + ' · confiance ' + escTrade(wh.confidence) + '<br>' +
      '<b>STATE</b> ' + escTrade(st.phase) + ' · lobe ' + escTrade(lobe.direction) + ' LBW ' + escTrade(lobe.lbw) +
      ' · structure3m ' + escTrade(ps.state) + (ps.direction ? ' (' + escTrade(ps.direction) + ')' : '') + '<br>' +
      '<b>DOMINANCE</b> ' + escTrade(dom.state) + (dom.direction ? ' → ' + escTrade(dom.direction) : '') +
      (dom.proofScore !== undefined ? ' · preuve ' + Number(dom.proofScore).toFixed(2) : '') +
      (dom.retainedFraction !== undefined ? ' · terrain ' + Number(dom.retainedFraction).toFixed(2) : '') + '<br>' +
      '<b>RISK</b> ' + (rk.tradeable ? 'TRADEABLE' : 'WAIT') +
      (rk.rrEstimate !== undefined && rk.rrEstimate !== null ? ' · R/R ' + Number(rk.rrEstimate).toFixed(2) : '') +
      ' · ' + escTrade(rk.reason) + '<br>' +
      '<b>ACTION</b> ' + escTrade(ac.type) + (ac.direction ? ' ' + escTrade(ac.direction) : '') + ' · ' + escTrade(ac.reason) +
      '</div>';
  }

  const top = c.topDown || {}, w = c.wave || {}, m = c.micro || {}, seq = c.sequence || {}, opp = c.opportunity || {};
  return '<div style="font-size:11px; line-height:1.55; opacity:0.86;">' +
    '<b>Compréhension</b> ' + escTrade(c.understanding) +
    ' &nbsp; <b>Top-down</b> ' + escTrade(top.state) + (top.bias ? ' (' + escTrade(top.bias) + ')' : '') + '<br>' +
    '<b>Vague</b> ' + escTrade(w.direction) + (w.e15 ? ' · E15 vu' : ' · E15 non vu') +
    ' &nbsp; <b>Energie</b> ' + escTrade(m.energy) + ' &nbsp; <b>Effort</b> ' + escTrade(m.effort) +
    ' &nbsp; <b>Conversion</b> ' + escTrade(m.conversion) + '<br>' +
    '<b>Séquence</b> ' + escTrade(seq.stage) + (seq.direction ? ' → ' + escTrade(seq.direction) : '') +
    ' &nbsp; <b>Opportunité</b> ' + escTrade(opp.state) + (opp.archetype ? ' / ' + escTrade(opp.archetype) : '') + '</div>';
}
function renderV2Position(module, trade) {
  if (!trade) return '';
  const c = trade.lastContext || trade.context || null;
  const pnl = (trade.pnlPercentPrice !== undefined && trade.pnlPercentPrice !== null) ? trade.pnlPercentPrice : null;
  const lev = Number(trade.leverage || 10);
  const pnlLev = (trade.pnlPercentLeveraged !== undefined && trade.pnlPercentLeveraged !== null) ? Number(trade.pnlPercentLeveraged) : (pnl !== null ? pnl * lev : null);
  const notional = Number(trade.notionalUsd || 1500);
  const pnlUsd = trade.metrics && trade.metrics.currentPnlUsd !== undefined ? Number(trade.metrics.currentPnlUsd) : (pnl !== null ? pnl / 100 * notional : null);
  const grossPnlUsd = trade.metrics && trade.metrics.grossCurrentPnlUsd !== undefined ? Number(trade.metrics.grossCurrentPnlUsd) : null;
  const feesPaidUsd = trade.metrics && trade.metrics.tradingFeesPaidUsd !== undefined ? Number(trade.metrics.tradingFeesPaidUsd) : Number(trade.tradingFeesPaidUsd||0);
  const estimatedCloseFeeUsd = trade.metrics && trade.metrics.estimatedCloseFeeUsd !== undefined ? Number(trade.metrics.estimatedCloseFeeUsd) : null;
  const feeAware = !!(trade.feeModel && trade.feeModel.enabled);
  const tpShadow = trade.tpOptimizationShadow || null;
  const tpShadowVariants = tpShadow ? Number(tpShadow.variantCount || ((tpShadow.variants||[]).length) || 0) : 0;
  const cls = trade.direction === 'long' ? 'ok' : 'refus';
  return '<div class="diag-module">' +
    '<div class="diag-head"><span class="diag-name">' + escTrade(module.toUpperCase()) + ' — ' + escTrade(trade.archetype || trade.version || 'V4') + '</span>' +
    '<span class="diag-decision ' + cls + '">' + escTrade(trade.direction.toUpperCase()) + '</span></div>' +
    '<div class="diag-details"><div>Entrée : <b>' + escTrade(trade.entryPrice) + '</b> — ' + tradeTime(trade.entryTimestamp) + '</div>' +
    '<div>Dernier prix : ' + escTrade(trade.lastPrice) +
    (pnl !== null ? ' · PNL prix ' + (pnl >= 0 ? '+' : '') + pnl.toFixed(3) + '%' : '') +
    (pnlLev !== null ? ' · marge nette ' + (pnlLev >= 0 ? '+' : '') + pnlLev.toFixed(2) + '%' : '') +
    (pnlUsd !== null ? ' · <b>NET si clôture ' + (pnlUsd >= 0 ? '+' : '') + pnlUsd.toFixed(2) + ' $</b>' : '') + '</div>' +
    (feeAware ? '<div><b>FRAIS</b> payés ' + Number(feesPaidUsd||0).toFixed(2) + '$' +
      (estimatedCloseFeeUsd!==null ? ' · clôture estimée ' + Number(estimatedCloseFeeUsd).toFixed(2) + '$' : '') +
      (grossPnlUsd!==null ? ' · brut ' + (grossPnlUsd>=0?'+':'') + grossPnlUsd.toFixed(2) + '$' : '') + '</div>' : '') +
    (trade.metrics ? '<div>MFE prix <b>+' + Number(trade.metrics.mfeUsd || 0).toFixed(1) + '$ BTC</b>' +
      (trade.metrics.mfePnlUsd !== undefined ? ' / +' + Number(trade.metrics.mfePnlUsd || 0).toFixed(2) + '$ PNL' : '') +
      ' · MAE prix <b>-' + Number(trade.metrics.maeUsd || 0).toFixed(1) + '$ BTC</b>' +
      (trade.metrics.maeLossUsd !== undefined ? ' / -' + Number(trade.metrics.maeLossUsd || 0).toFixed(2) + '$ PNL' : '') +
      (trade.metrics.godYieldSeen ? ' · GOD_YIELD vu' : '') + '</div>' : '') +
    (trade.tp1Taken ? '<div><b>TP1 STRESS</b> pris · réalisé ' + ((Number(trade.realizedPnlUsd||0)>=0?'+':'')+Number(trade.realizedPnlUsd||0).toFixed(2)) + '$ · runner 75%</div>' : '') +
    (tpShadow ? '<div><b>TP SHADOW</b> ' + tpShadowVariants + ' trajectoires · TP1 ' + (tpShadow.tp1Event?'observé':'en attente') + ' · TP2 ' + (tpShadow.tp2Event?'observé':(tpShadow.tp2ArmedAt?'armé après nouveau MFE':'non armé')) + ' · <span style="opacity:.75;">aucun impact décisionnel</span></div>' : '') +
    '<div style="opacity:.7;font-size:10px;">Sizing: marge ' + Number(trade.marginUsd || 150).toFixed(1) + '$ / initiale ' + Number(trade.initialMarginUsd || 150).toFixed(0) + '$ · notionnel ' + Number(trade.notionalUsd || 1500).toFixed(0) + '$ / initial ' + Number(trade.initialNotionalUsd || 1500).toFixed(0) + '$ · x' + lev + '</div>' +
    ctxSummary(c) + '</div></div>';
}
function renderV2HistoryRow(t) {
  const tradeNo = (t && t.__tradeNo !== undefined && t.__tradeNo !== null) ? Number(t.__tradeNo) : null;
  const p = (t.pnlPercentLeveraged !== null && t.pnlPercentLeveraged !== undefined) ? t.pnlPercentLeveraged : t.pnlPercentPrice;
  const pnlUsd = (t.pnlUsd !== null && t.pnlUsd !== undefined) ? Number(t.pnlUsd) :
    ((t.pnlPercentPrice !== null && t.pnlPercentPrice !== undefined) ? Number(t.pnlPercentPrice)/100*Number(t.notionalUsd||1500) : null);
  const feeAware = t.tradingFeesUsd !== null && t.tradingFeesUsd !== undefined;
  const grossPnlUsd = feeAware && t.grossPnlUsd !== null && t.grossPnlUsd !== undefined ? Number(t.grossPnlUsd) : null;
  const tpShadow = t.tpOptimizationShadow || null;
  const cls = (p !== null && p !== undefined) ? (p >= 0 ? 'ok' : 'refus') : 'indisponible';
  const pt = (p !== null && p !== undefined) ? ((p >= 0 ? '+' : '') + p.toFixed(2) + '% marge' + (pnlUsd!==null?' · '+(pnlUsd>=0?'+':'')+pnlUsd.toFixed(2)+'$':'')) : '--';
  return '<div class="diag-module">' +
    '<div class="diag-head"><span class="diag-name">' + (tradeNo !== null ? '#' + tradeNo + ' · ' : '') + escTrade((t.module || 'day').toUpperCase()) + ' ' + escTrade((t.direction || '').toUpperCase()) + ' · ' + escTrade(t.entryArchetype || (t.entryContext && t.entryContext.opportunity && t.entryContext.opportunity.archetype) || t.version || 'V4') + '</span>' +
    '<span class="diag-decision ' + cls + '">' + pt + '</span></div>' +
    '<div class="diag-details"><div>' + tradeTime(t.entryTimestamp) + ' → ' + tradeTime(t.exitTimestamp) + '</div>' +
    '<div>Prix : ' + escTrade(t.entryPrice) + ' → ' + escTrade(t.exitPrice) +
    (t.pnlPercentPrice !== null && t.pnlPercentPrice !== undefined ? ' · mouvement ' + (t.pnlPercentPrice >= 0 ? '+' : '') + t.pnlPercentPrice.toFixed(3) + '%' : '') + '</div>' +
    '<div><b>' + escTrade(t.exitKind) + '</b> — ' + escTrade(t.exitReason) + '</div>' +
    (pnlUsd!==null?'<div><b>' + (feeAware?'PNL NET simulé ':'PNL brut historique ') + (pnlUsd>=0?'+':'') + pnlUsd.toFixed(2) + '$</b> · marge '+Number(t.marginUsd||150).toFixed(0)+'$ · notionnel '+Number(t.notionalUsd||1500).toFixed(0)+'$</div>':'') +
    (feeAware?'<div>Brut '+(grossPnlUsd>=0?'+':'')+Number(grossPnlUsd||0).toFixed(2)+'$ · frais -'+Number(t.tradingFeesUsd||0).toFixed(2)+'$' +
      (t.fundingMode==='NOT_MODELED'?' · funding non modélisé':'') + '</div>':'') +
    ((t.mfeUsd !== undefined || t.maeUsd !== undefined) ? '<div>MFE prix +' + Number(t.mfeUsd || 0).toFixed(1) + '$ BTC' + (t.mfePnlUsd!==undefined?' / +'+Number(t.mfePnlUsd||0).toFixed(2)+'$ PNL':'') + ' · MAE prix -' + Number(t.maeUsd || 0).toFixed(1) + '$ BTC' + (t.maeLossUsd!==undefined?' / -'+Number(t.maeLossUsd||0).toFixed(2)+'$ PNL':'') + (t.mfeCapturedPct !== null && t.mfeCapturedPct !== undefined ? ' · capture ' + Number(t.mfeCapturedPct).toFixed(1) + '% du MFE' : '') + (t.godYieldSeen ? ' · GOD_YIELD' : '') + '</div>' : '') +
    (t.tp1Taken?'<div><b>TP1 STRESS</b> · réalisé '+(Number(t.realizedPnlUsd||0)>=0?'+':'')+Number(t.realizedPnlUsd||0).toFixed(2)+'$ · runner final '+Number(t.remainingNotionalUsd||0).toFixed(0)+'$ notionnel</div>':'') +
    (tpShadow&&tpShadow.ranking?'<div><b>TP SHADOW</b> meilleur '+escTrade(tpShadow.ranking.bestTpVariantId)+' · net '+(Number(tpShadow.ranking.bestTpNetPnlUsd)>=0?'+':'')+Number(tpShadow.ranking.bestTpNetPnlUsd||0).toFixed(2)+'$ · HOLD '+(Number(tpShadow.ranking.holdNetPnlUsd)>=0?'+':'')+Number(tpShadow.ranking.holdNetPnlUsd||0).toFixed(2)+'$</div>':'') + '</div></div>';
}
function tradeReportKey(t) {
  return encodeURIComponent(String(t && t.version || '') + '|' + String(t && t.entryTimestamp || '') + '|' + String(t && t.exitTimestamp || '') + '|' + String(t && t.direction || ''));
}
function renderV2Report(t, index) {
  const pPrice = t.pnlPercentPrice;
  const pLev = t.pnlPercentLeveraged;
  const feeAware = t.tradingFeesUsd !== null && t.tradingFeesUsd !== undefined;
  const grossPnlUsd = feeAware && t.grossPnlUsd !== null && t.grossPnlUsd !== undefined ? Number(t.grossPnlUsd) : null;
  const tpShadow = t.tpOptimizationShadow || null;
  let conclusion = 'Sortie non classée.';
  if (t.exitKind === 'EXIT_RISK') conclusion = 'Survivabilité : cap absolu de risque atteint. V4 ne laisse jamais ce seuil s’élargir avec le régime.';
  else if (t.exitKind === 'EXIT_EXECUTION_FAILURE') conclusion = 'Échec d’exécution : presque aucun MFE et PM/microstructure deviennent adverses de façon productive ; BOONO abandonne l’exécution sans prétendre que la thèse MCB est invalidée.';
  else if (t.exitKind === 'EXIT_MFE_PROTECTION') conclusion = 'Protection MFE / TP dynamique : un gros MFE restitue une part importante pendant que PM et microstructure deviennent adverses ; BOONO monétise le gain sans déclarer la thèse MCB morte.';
  else if (t.exitKind === 'EXIT_PROFIT_PROTECTION') conclusion = 'Protection du gain : MCB a proposé la thèse opposée et PM Live + ticker en ont confirmé la traduction ; BOONO a choisi de conserver le gain plutôt que d’attendre une preuve tardive.';
  else if (t.exitKind === 'EXIT_MCB_FLIP') conclusion = 'Flip MCB : la thèse directionnelle MCB a changé et PM Live + ticker ont confirmé ce changement.';
  else if (t.exitKind === 'EXIT_STRUCTURE') conclusion = 'Structure : la thèse structurelle qui autorisait le trade a été invalidée.';
  else if (t.exitKind === 'EXIT_EXECUTION') conclusion = 'Exécution : la structure pouvait encore exister, mais les conditions permettant de l’exploiter ont disparu ou se sont retournées.';
  else if (t.exitKind === 'EXIT_EFFICIENCY') conclusion = 'Efficacité : le trade restait potentiellement valide mais sa capacité à convertir en terrain s’est dégradée après un MFE significatif.';
  else if (t.exitKind === 'EXIT_GOD_YIELD') conclusion = 'God Yield : une translation exceptionnelle a été protégée après dégradation du rendement.';
  else if (t.exitKind === 'EXIT_EFFICIENCY') conclusion = 'Efficacité : le mouvement avait produit un MFE significatif puis en restituait une part excessive sans domination suffisante pour justifier l’attente.';
  else if (t.exitKind === 'EXIT_GOD_YIELD') conclusion = 'GOD_YIELD : une translation exceptionnellement productive avait été capturée puis sa qualité s’est dégradée ; le simulateur a monétisé l’excursion.';
  if(t.tp1Taken) conclusion='TP1 stress-test avait déjà sécurisé 25% pendant une attaque adverse sans tuer la campagne ; le runner a ensuite été géré par la hiérarchie normale. ' + conclusion;
  return '<details class="diag-module" data-report-key="' + tradeReportKey(t) + '"' + (index === 0 ? ' open' : '') + '>' +
    '<summary style="cursor:pointer; font-weight:600;">' + tradeTime(t.exitTimestamp) + ' — ' + escTrade((t.direction || '').toUpperCase()) +
    ' — ' + escTrade(t.exitKind) +
    (pLev !== null && pLev !== undefined ? ' — ' + (pLev >= 0 ? '+' : '') + pLev.toFixed(2) + '%' : '') + '</summary>' +
    '<div class="diag-details" style="margin-top:10px;">' +
    '<div><b>TRADE</b> ' + escTrade(t.entryPrice) + ' → ' + escTrade(t.exitPrice) +
    ' · prix ' + (pPrice !== null && pPrice !== undefined ? (pPrice >= 0 ? '+' : '') + pPrice.toFixed(3) + '%' : '--') +
    ' · marge ' + (pLev !== null && pLev !== undefined ? (pLev >= 0 ? '+' : '') + pLev.toFixed(2) + '%' : '--') +
    ' · <b>' + (feeAware?'NET ':'') + ((t.pnlUsd!==null&&t.pnlUsd!==undefined)?((Number(t.pnlUsd)>=0?'+':'')+Number(t.pnlUsd).toFixed(2)+' $'):'$ --') + '</b></div>' +
    (feeAware?'<div><b>ÉCONOMIE</b> brut '+(grossPnlUsd>=0?'+':'')+Number(grossPnlUsd||0).toFixed(2)+'$ · frais -'+Number(t.tradingFeesUsd||0).toFixed(2)+'$ · net <b>'+(Number(t.pnlUsd)>=0?'+':'')+Number(t.pnlUsd||0).toFixed(2)+'$</b>' +
      ' · entrée '+Number(t.entryFeeUsd||0).toFixed(2)+'$ · sorties '+Number((t.partialExitFeesUsd||0)+(t.finalExitFeeUsd||0)).toFixed(2)+'$' +
      (t.fundingMode==='NOT_MODELED'?' · funding non modélisé':'') + '</div>':'') +
    '<div style="opacity:.75;font-size:10px;">Sizing V4: capital 1000$ · marge ' + Number(t.marginUsd||150).toFixed(0) + '$ · notionnel ' + Number(t.notionalUsd||1500).toFixed(0) + '$ · x10</div>' +
    '<div style="margin-top:8px;"><b>Pourquoi BOONO est entré</b></div>' + ctxSummary(t.entryContext) +
    ((t.tpEvents&&t.tpEvents.length)?'<div style="margin-top:8px;"><b>TP pris pendant le trade</b></div>' + t.tpEvents.map(function(tp){return '<div>TP1 STRESS · '+tradeTime(tp.timestamp)+' @ '+escTrade(tp.price)+' · '+v3Fmt(100*Number(tp.fractionOfInitial||tp.fractionOfCurrent||0),0)+'% initial · brut '+(Number(tp.grossRealizedPnlUsd||tp.realizedPnlUsd||0)>=0?'+':'')+Number(tp.grossRealizedPnlUsd||tp.realizedPnlUsd||0).toFixed(2)+'$'+
      (tp.tradingFeeUsd!==undefined?' · frais -'+Number(tp.tradingFeeUsd||0).toFixed(2)+'$ · net <b>'+(Number(tp.netRealizedAfterCloseFeeUsd||0)>=0?'+':'')+Number(tp.netRealizedAfterCloseFeeUsd||0).toFixed(2)+' $</b>':' · réalisé <b>'+(Number(tp.realizedPnlUsd||0)>=0?'+':'')+Number(tp.realizedPnlUsd||0).toFixed(2)+' $</b>')+
      ' · MFE +'+v3Fmt(tp.mfeUsd,1)+'$ · giveback '+v3Fmt(tp.givebackUsd,1)+'$</div>';}).join(''):'') +
    (tpShadow&&tpShadow.ranking?'<div style="margin-top:8px;"><b>SHADOW TP1/TP2 — fee-aware, sans impact décisionnel</b></div>'+
      '<div>Meilleur TP : <b>'+escTrade(tpShadow.ranking.bestTpVariantId)+'</b> · net '+(Number(tpShadow.ranking.bestTpNetPnlUsd)>=0?'+':'')+Number(tpShadow.ranking.bestTpNetPnlUsd||0).toFixed(2)+'$ · HOLD 100% '+(Number(tpShadow.ranking.holdNetPnlUsd)>=0?'+':'')+Number(tpShadow.ranking.holdNetPnlUsd||0).toFixed(2)+'$'+
      (tpShadow.ranking.fullExitAtFirstStressNetPnlUsd!==null&&tpShadow.ranking.fullExitAtFirstStressNetPnlUsd!==undefined?' · sortie 100% au 1er stress '+(Number(tpShadow.ranking.fullExitAtFirstStressNetPnlUsd)>=0?'+':'')+Number(tpShadow.ranking.fullExitAtFirstStressNetPnlUsd).toFixed(2)+'$':'')+'</div>'+
      ((tpShadow.topVariants||[]).length?'<div style="opacity:.8;font-size:10px;">Top : '+tpShadow.topVariants.map(function(v){return escTrade(v.id)+' '+(Number(v.netPnlUsd)>=0?'+':'')+Number(v.netPnlUsd||0).toFixed(2)+'$ (Δ hold '+(Number(v.deltaVsHoldNetUsd)>=0?'+':'')+Number(v.deltaVsHoldNetUsd||0).toFixed(2)+'$)';}).join(' · ')+'</div>':''):'') +
    '<div style="margin-top:8px;"><b>Pourquoi BOONO est sorti</b> — ' + escTrade(t.exitReason) + '</div>' + ctxSummary(t.exitContext) +
    '<div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--line);"><b>Conclusion du trade</b> — ' + escTrade(conclusion) + '</div>' +
    '</div></details>';
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
      '<div style="opacity:0.7; font-size:11px;">notionnel ' + 100 +
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
  loadBoono(); // onglet BOONO historique volontairement inchangé
  const stateEl = document.getElementById('tab2-statev2');
  const historyEl = document.getElementById('tab2-historyv2');
  const reportsEl = document.getElementById('tab2-reportsv2');
  // Preserve the user's report-reading state across the 30s refresh.
  // Replacing innerHTML used to close every <details>, making reports impossible to study.
  const hadReportDom = !!(reportsEl && reportsEl.querySelector('details[data-report-key]'));
  const openReportKeys = new Set();
  if (reportsEl) {
    reportsEl.querySelectorAll('details[data-report-key][open]').forEach(function(el) {
      openReportKeys.add(el.dataset.reportKey);
    });
  }
  try {
    const res = await fetch('/api/trades');
    if (!res.ok) throw new Error('reponse HTTP ' + res.status);
    const data = await res.json();
    const state = data.state || {};
    const mods = state.modules || data.ongoing || {};
    let posHtml = ['scalp', 'day', 'swing'].map(function(m) { return renderV2Position(m, mods[m]); }).filter(Boolean).join('');
    if (!posHtml) posHtml = '<div class="placeholder-note">Aucune position V4 en cours.</div>';

    const current = state.lastEvaluation || null;
    const ld = data.lastDecision || null;
    const snapPrice = current && current.price !== undefined ? Number(current.price) : null;
    const liveCard = '<div class="diag-module" style="padding:14px 16px;">' +
      '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
        '<div><div style="font-size:10px;letter-spacing:.08em;opacity:.6;">BTC-USDT-SWAP · PRIX LIVE</div>' +
        '<div id="v3LivePrice" style="font-size:28px;font-weight:800;line-height:1.1;">' +
          (v3UiPrice.price !== null ? Number(v3UiPrice.price).toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1}) :
           (snapPrice !== null ? snapPrice.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1}) : '--')) +
        '</div></div>' +
        '<div id="v3LivePriceMeta" style="font-size:10px;opacity:.6;">' + escTrade(v3UiPrice.status) + '</div>' +
      '</div></div>';
    let living = '<div class="diag-module"><div class="diag-head"><span class="diag-name">ETAT VIVANT — ' + escTrade(data.version) + '</span>' +
      '<span class="diag-decision indisponible">SIMULATION</span></div><div class="diag-details">';
    if (current) living += ctxSummary(current);
    else living += '<div><b>V4</b> état courant indisponible.</div>';
    if (ld) living += '<div style="margin-top:7px;opacity:.7;"><b>Dernière décision journalisée</b> ' + escTrade(ld.action) + ' — ' + escTrade(ld.reason) + ' · ' + tradeTime(ld.ts) + '</div>';
    living += '</div></div>';
    stateEl.innerHTML = liveCard + living + posHtml;
    updateV3LivePriceDom();

    const executed = (data.executed || []).map(function(t,i){ return Object.assign({}, t, {__tradeNo:i+1}); }).reverse();
    const withPnl = executed.filter(function(t) { return t.pnlPercentLeveraged !== null && t.pnlPercentLeveraged !== undefined; });
    const wins = withPnl.filter(function(t) { return t.pnlPercentLeveraged >= 0; }).length;
    const total = withPnl.reduce(function(a, t) { return a + t.pnlPercentLeveraged; }, 0);
    const totalUsd = executed.reduce(function(a,t){
      if(t.pnlUsd!==null&&t.pnlUsd!==undefined)return a+Number(t.pnlUsd);
      if(t.pnlPercentPrice!==null&&t.pnlPercentPrice!==undefined)return a+Number(t.pnlPercentPrice)/100*Number(t.notionalUsd||1500);
      return a;
    },0);
    const equityUsd = 1000 + totalUsd;
    const feeAwareCount = executed.filter(function(t){ return t.tradingFeesUsd!==null&&t.tradingFeesUsd!==undefined; }).length;
    const legacyGrossCount = executed.length-feeAwareCount;
    const accountingLabel = feeAwareCount===0?'historique BRUT (avant modèle de frais)':(legacyGrossCount===0?'NET de frais':'MIXTE : '+legacyGrossCount+' brut historique + '+feeAwareCount+' net(s)');
    const byKind = {};
    executed.forEach(function(t) { const k = t.exitKind || 'OTHER'; byKind[k] = (byKind[k] || 0) + 1; });
    const summary = '<div class="diag-module"><div class="diag-details"><b>' + executed.length + ' trade(s) V4 cloturé(s)</b>' +
      (withPnl.length ? ' · réussite ' + (100 * wins / withPnl.length).toFixed(1) + '% · PNL marge cumulé ' + (total >= 0 ? '+' : '') + total.toFixed(2) + '%' +
      ' · PNL simulé <b>' + (totalUsd>=0?'+':'') + totalUsd.toFixed(2) + '$</b> · equity ' + equityUsd.toFixed(2) + '$' : '') +
      '<br><span style="font-size:11px;opacity:0.75;"><b>Comptabilité :</b> ' + accountingLabel + ' · frais taker modélisés à partir de V4.9.1 ; funding/slippage hors modèle' +
      '<br>RISK ' + (byKind.EXIT_RISK || 0) +
      ' · PROFIT_PROTECTION ' + (byKind.EXIT_PROFIT_PROTECTION || 0) +
      ' · MFE_TP ' + (byKind.EXIT_MFE_PROTECTION || 0) +
      ' · EXEC_FAIL ' + (byKind.EXIT_EXECUTION_FAILURE || 0) +
      ' · MCB_FLIP ' + (byKind.EXIT_MCB_FLIP || 0) +
      ' · autres ' + ((byKind.EXIT_STRUCTURE || 0)+(byKind.EXIT_EXECUTION || 0)+(byKind.EXIT_EFFICIENCY || 0)+(byKind.EXIT_GOD_YIELD || 0)) +
      '</span></div></div>';
    const archivedV3 = (data.archivedV3 || []).map(function(t,i){ return Object.assign({}, t, {__tradeNo:i+1}); }).reverse();
    const archiveSummary = archivedV3.length
      ? '<div class="diag-module" style="opacity:.82;"><div class="diag-details"><b>ARCHIVE V3 — ' + archivedV3.length + ' trade(s)</b> · lecture seulement / shadow historique</div></div>'
      : '';
    historyEl.innerHTML = summary +
      (executed.length ? executed.map(renderV2HistoryRow).join('') : '<div class="placeholder-note">Aucun trade V4 cloturé pour le moment.</div>') +
      archiveSummary +
      (archivedV3.length ? archivedV3.map(renderV2HistoryRow).join('') : '');
    const detailedReports = (data.reports || []).slice().reverse();
    const v4Reports = detailedReports.length
      ? '<div class="diag-module" style="opacity:.72;"><div class="diag-details">Rapports détaillés : ' + detailedReports.length + ' derniers trades V4 · historique complet conservé sur Amsterdam.</div></div>' +
        detailedReports.map(renderV2Report).join('')
      : '<div class="placeholder-note">Aucun compte rendu V4 encore. Le premier sera généré automatiquement à la clôture d’un trade V4.</div>';
    const v3Reports = archivedV3.length
      ? '<div class="diag-module" style="opacity:.72;"><div class="diag-details"><b>ARCHIVE V3</b> · historique synthétique visible dans Historique ; contextes détaillés non rechargés toutes les 30 s.</div></div>'
      : '';
    reportsEl.innerHTML = v4Reports + v3Reports;
    if (hadReportDom) {
      reportsEl.querySelectorAll('details[data-report-key]').forEach(function(el) {
        el.open = openReportKeys.has(el.dataset.reportKey);
      });
    }
  } catch (e) {
    stateEl.innerHTML = '<div class="ledger-empty">Erreur V4 : ' + escTrade(e.message) + '</div>';
    historyEl.innerHTML = '<div class="ledger-empty">Historique indisponible.</div>';
    reportsEl.innerHTML = '<div class="ledger-empty">Rapports indisponibles.</div>';
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
loadTrades();
tradesAutoRefresh = setInterval(loadTrades, 30000);
connectV3LivePrice();
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
