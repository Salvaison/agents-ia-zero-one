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
const zlib = require('zlib');
const path = require('path');
const {readRecentNdjson,readNdjsonSince}=require('./v3lab/storage/rotating-ndjson');
const v53CausalChainUi=require('./v5/v53-causal-chain-view');
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
const ELASTIC_OBSERVER_EVENTS_PATH=path.join(__dirname,'../data/elastic-observer-events.ndjson');
const TRADES_V2_WAVES_PATH = path.join(__dirname, '../data/trade-sim-v4-waves.json');
const TRADES_V3_ARCHIVE_HISTORY_PATH = path.join(__dirname, '../data/trade-sim-v3lab-history.json');
/* Moteur Boono (19/08/2026) -- seconde logique, fichiers separes. */
const BOONO_STATE_PATH = path.join(__dirname, '../data/moteur-boono-state.json');
const BOONO_HISTORY_PATH = path.join(__dirname, '../data/moteur-boono-history.json');
const AUDIT_HISTORY_PATH = path.join(__dirname, '../data/audit-history.json');
const SHADOWS_CACHE_TTL_MS = 90000;
let shadowsResponseCache={at:0,payload:null};
// The full Sync object may exceed 5 MB. Keep complete evidence on Amsterdam;
 // never serialize 50 completed campaigns to a browser every 30 seconds.
function compactUiElasticSync(sync){
  if(!sync)return null;
  const ep=sync.activeEpisode||null;
  return {version:sync.version,decisionImpact:sync.decisionImpact,state:sync.state,
    activeEpisode:ep?{
      id:ep.id,direction:ep.direction,startedAt:ep.startedAt,startedPrice:ep.startedPrice,
      orderSignature:Array.isArray(ep.orderSignature)?ep.orderSignature.slice(-40):[],
      orderString:String(ep.orderString||'').slice(-850),
      maxFavorableUsd:ep.maxFavorableUsd,maxAdverseUsd:ep.maxAdverseUsd,
      relaxationCount:ep.relaxationCount,success220BeforeMinus180:ep.success220BeforeMinus180
    }:null,
    completedCount:Array.isArray(sync.completed)?sync.completed.length:0};
}
function compactV4UiEval(full){
  if(!full||typeof full!=='object')return null;
  const {elasticSyncShadow,elasticDualChainShadow,admissionCounterfactualShadow,
    continuationReentryShadow,live15AcceptanceShadow,structuralHandoff,...core}=full;
  return {...core,elasticSyncShadow:compactUiElasticSync(elasticSyncShadow)};
}
function compactV4UiReportContext(full){
  if(!full||typeof full!=='object')return full||null;
  const {elasticSyncShadow,elasticDualChainShadow,elasticObserverShadow,
    admissionCounterfactualShadow,continuationReentryShadow,
    live15AcceptanceShadow,structuralHandoff,...core}=full;
  return core;
}
function shadowsCurrentFromEval(latest,tpLatest=null){
  latest=latest||{};
  return {
    priceBehavior:latest.priceBehaviorShadow||null,
    continuationReentry:latest.continuationReentryShadow||null,
    structuralHandoff:latest.structuralHandoff||null,
    live15Acceptance:latest.live15AcceptanceShadow||null,
    admissionCounterfactual:latest.admissionCounterfactualShadow||null,
    elasticSync:compactUiElasticSync(latest.elasticSyncShadow),
    dataQuality:latest.dataQuality||latest.mcb&&latest.mcb.dataQuality||null,
    mfTemporal:latest.mfStructureShadow&&latest.mfStructureShadow.temporal||null,
    tpOptimization:tpLatest
  };
}
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

// Compress bulky UI JSON only when the browser advertises gzip support.
// Keep original object/contract and do asynchronous compression off the event loop.
function sendUiJson(req,res,value){
  if(!String(req.headers['accept-encoding']||'').includes('gzip'))
    return res.json(value);
  const raw=JSON.stringify(value);
  if(Buffer.byteLength(raw)<2048)return res.json(value);
  zlib.gzip(raw,{level:3},(err,buf)=>{
    if(err){if(!res.headersSent)res.json(value);return;}
    res.set('Content-Encoding','gzip');
    res.set('Vary','Accept-Encoding');
    res.type('json');
    res.send(buf);
  });
}
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

// BOONO V5 experimental PAPER, isolated from V4. Compact authenticated read only.
app.get('/api/v5',requireAuth,(req,res)=>{
  try{
    const v5path=path.join(__dirname,'../data/v5-shadow-memory-state.json');
    const paperPath=path.join(__dirname,'../data/v5-paper-state.json');
    const memory=JSON.parse(fs.readFileSync(v5path,'utf8'));
    const paper=fs.existsSync(paperPath)?JSON.parse(fs.readFileSync(paperPath,'utf8')):null;
    const lastPaperAt=Number(paper&&paper.lastObservationAt||0);
    // Never label a stopped or outdated paper ledger as a LIVE V5 opinion.
    const paperStatus=lastPaperAt>0&&Date.now()-lastPaperAt>=0&&
      Date.now()-lastPaperAt<=90000?'PAPER_RECENT':'FROZEN_ARCHIVE';
    const count=a=>(a||[]).reduce((s,v)=>s+Number(v||0),0);
    const market=memory.observation||{};
    const last=memory.anchor||{};
    const hour=memory.hour||{};
    const payload={version:'v5-paper-ui-v0.1',updatedAt:market.ts||null,
      mode:paper?paper.mode:'PAPER_STARTING',brokerOrdersEnabled:false,
      paperStatus,lastPaperAt,evidenceOriginalTimezone:'UTC',
      evidenceSemantic:'NATIVE_E15_E3_EVENTS_NOT_STRUCTURAL_TRAJECTORY',
      v4DecisionImpact:false,market:{price:market.price,
        quality:market.quality,qualityDirection:market.qualityDirection,
        pmLive:market.pmLive,sourceAt:market.ts},
      confirmedE15:last.confirmed&&last.confirmed.direction||null,
      liveE15:last.live&&last.live.direction||null,
      memory:{segments:(memory.threads||[]).length,unresolvedLinks:(memory.lineageEdges||[]).length,
        qualityCoverage:hour.coverage,
        qualityBias:hour.observedBias,
        buckets:(hour.buckets||[]).map(b=>({from:b.from,to:b.to,count:b.count,
          coverage:b.coverage,qualityCoverage:b.qualityCoverage,
          qualities:b.qualityShare,productiveShare:b.productiveShare,
          directionCounts:b.directions,price:b.price,meanYieldVsP75:b.meanYieldVsP75}))},
      opportunity:paper&&paper.lastHypothesis||null,
      paper:paper?{startedAt:paper.startAt,completed:paper.completed,wins:paper.wins,
        losses:paper.losses,equityUsd:paper.equityUsd,realizedUsd:paper.realizedUsd,
        feesUsd:paper.feesUsd,position:paper.position,lastAction:paper.lastAction,
        latestTrades:(paper.history||[]).slice(-7).reverse()}:null};
    res.set('Cache-Control','no-store');
    sendUiJson(req,res,payload);
  }catch(err){res.status(503).json({error:'V5 paper observer unavailable',detail:err.message});}
});
// The structure panel uses the SAME V5.4 decision evidence: no independent
// observational opinion and no legacy 90-second structural shadow writer.
app.get('/api/v5-structure',requireAuth,(req,res)=>{
 try{
  const state=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/v52-paper-state.json'),'utf8'));
  const a=state.latestAnalysis||{},h=a.readings?.structural54||{};
  if(!String(a.version||'').startsWith('v5.4')||!h.available)
   return res.status(503).json({error:'V5.4 structure not yet available'});
  const o=h.origins||{},f=h.activeFrontier||null;
  const payload={version:h.version,ts:a.asOf,price:a.price,
   phase:h.phase,source:'SAME_V54_ENGINE_NOT_AN_INDEPENDENT_SHADOW',
   structure:{direction:h.director,state:h.strategicState,
    pivot:h.structuralOrigin&&{type:h.structuralOrigin.type,
      lbw:h.structuralOrigin.lbw,extremeTs:h.structuralOrigin.sourceTs},
    context1h:h.context1h,context4h:h.context4h,
    childDirection:h.mcb3?.direction},
   enjeu:{valueArea:'STRUCTURAL_ORIGIN',
    profile:null,profileFrontier:null,nearest:f&&
    {key:f.name||'ACTIVE_CONFRONTATION',price:f.ma||f.lower}},
   boundary:f,attempts:{recent:[],e15Up3h:0,e15Down3h:0,e3Up90m:0,e3Down90m:0},
   horizon:{priceNet1h:o.m60?.priceChange??null,
    mf15Delta1h:null,lbw15:h.currentLbw15,mf15:a.readings?.mcb15?.mf15},
   conversion:{quality:a.readings?.conversionCampaign?.currentQuality||null,
    qualityDirection:a.candidate,pmLive:a.readings?.conversion?.pmCombined},
   evidence:['Campagne '+h.campaignId,
    'Pivot E15 connu '+new Date(h.structuralOrigin?.availableAt||0).toISOString(),
    'MCB3 tactique '+(h.mcb3?.direction||'UNKNOWN')],
   contradictions:h.currentOffensive&&h.currentOffensive!==h.director?
    ['Offensive Live 15m opposee a la trajectoire structurelle']:[],
   recentChanges:[],cautions:[],scenarios:[],
   integrity:{dataIntegrity:a.quality==='DATA_OK'?'ASOF_OK':'DATA_DEGRADED',
    elasticEventStatus:'SAME_ACTIVE_ENGINE',sampleTs:a.asOf},
   decisionImpact:true,tradingEnabled:false};
  res.set('Cache-Control','private,no-store');sendUiJson(req,res,payload);
 }catch(e){res.status(503).json({error:'V54_STRUCTURE_UNAVAILABLE',detail:e.message});}
});
// Independent PAPER engines: bounded summaries, never an order endpoint.
function v52PaperSummary(filename, tag) {
 const s=JSON.parse(fs.readFileSync(path.join(__dirname,'../data',filename),'utf8'));
 return {version:s.version,engine:tag,mode:s.mode,brokerOrdersEnabled:false,
  updatedAt:s.lastObservationAt,startedAt:s.startedAt,completed:s.completed,
  wins:s.wins,losses:s.losses,equityUsd:s.equityUsd,realizedUsd:s.realizedUsd,
  feesUsd:s.feesUsd,position:s.position||null,
  latestAction:s.lastAction||null,decision:s.latestDecision||s.decision||null,
  analysis:tag.startsWith('V5.4.')?s.latestAnalysis||null:null,
  attention:s.temporalAttention?{stage:s.temporalAttention.stage,
    asOf:s.temporalAttention.asOf,events:s.temporalAttention.events?.length||0,
    opposingTransfer:!!s.temporalAttention.opposing?.transferable}:null,
  latestTrades:(s.history||[]).slice(-5).reverse(),
  engineVersion:s.engine||null,gitRef:s.gitRef||null,
  source:'ISOLATED_SIMULATION_ONLY_NO_FUNDED_ORDERS'};
}
// Event chronology belongs to the visual diagnostic layer, never the admission engine.
// Cached disk sources avoid heavy re-reads with the 10-second phone UI polling.
const v53UiSources={eventsMtime:null,auditMtime:null,events:[],audit:[]};
function v53UiReadEvents(){
 const es=fs.statSync(ELASTIC_OBSERVER_EVENTS_PATH);
 if(v53UiSources.eventsMtime!==es.mtimeMs){
  v53UiSources.events=readRecentNdjson(ELASTIC_OBSERVER_EVENTS_PATH,1200)
   .filter(e=>e&&['MCB3','MCB15'].includes(e.family)&&
    ['E3','E15','BW_LBW_CROSS'].includes(e.key));
  v53UiSources.eventsMtime=es.mtimeMs;
 }
 const as=fs.statSync(AUDIT_HISTORY_PATH);
 if(v53UiSources.auditMtime!==as.mtimeMs){
  v53UiSources.audit=JSON.parse(fs.readFileSync(AUDIT_HISTORY_PATH,'utf8')).slice(-500);
  v53UiSources.auditMtime=as.mtimeMs;
 }
 return v53UiSources;
}
app.get('/api/v52',requireAuth,(req,res)=>{
 try{
  res.set('Cache-Control','no-store');
  const summary=v52PaperSummary('v52-paper-state.json','V5.4.3');
  try{
   const a=summary.analysis,src=v53UiReadEvents();
   summary.causalEvents=a?v53CausalChainUi.build({events:src.events,
    audit:src.audit,now:a.asOf,price:a.price,
    mcb15:a.readings?.mcb15,mcb3:a.readings?.mcb3}):null;
  }catch(err){
   summary.causalEvents={unavailable:true,message:'Provenance Elastic/Audit momentanément indisponible',
    decisionImpact:false};
  }
  sendUiJson(req,res,summary);
 }catch(e){res.status(503).json({error:'V5.4.3 PAPER indisponible',detail:e.message});}
});
app.get('/api/v493',requireAuth,(req,res)=>{
 try{res.set('Cache-Control','no-store');
  sendUiJson(req,res,v52PaperSummary('v494-paper-state.json','V4.9.4'));}
 catch(e){res.status(503).json({error:'V4.9.4 PAPER indisponible',detail:e.message});}
});
app.get('/api/v493-archive',requireAuth,(req,res)=>{
 try{res.set('Cache-Control','no-store');
  sendUiJson(req,res,v52PaperSummary('v493-baseline-state.json','V4.9.3 ARCHIVE'));}
 catch(e){res.status(503).json({error:'V4.9.3 archive unavailable'});}
});
// Separate observational execution lab. Never an order route or command.
app.get('/api/execution-lab',requireAuth,(req,res)=>{
 try{
  const file=path.join(__dirname,'../data/v53-execution-lab-state.json');
  const x=JSON.parse(fs.readFileSync(file,'utf8'));
  if(x.brokerOrdersEnabled!==false||x.fundedOrders!==false)
   throw Error('Execution lab must remain non-funded');
  res.set('Cache-Control','private,no-store');
  sendUiJson(req,res,{
   version:x.version,mode:x.mode,fundedOrders:false,
   sourceInstrument:x.analyticInstId,instrument:x.instId,
   startedAt:x.startedAt,updatedAt:x.updatedAt,
   book:x.book,bootstrapStatus:x.bootstrapStatus,
   statistics:x.statistics,active:x.active?{
    direction:x.active.signalDirection,signalTs:x.active.signalTs,
    signalPrice:x.active.signalPrice,
    signalLatencyMs:x.active.signalLatencyMs,
    offsetUsd:x.active.limits?.offsetUsd,
    triggerUsd:x.active.limits?.triggerUsd,
    BStatus:x.active.modeB?.entry?.status,
    CStatus:x.active.modeC?.status,
    CFillPx:x.active.modeC?.entry?.avgPx,
    BFillPx:x.active.modeB?.entry?.avgPx
   }:null,
   latest:(x.records||[]).slice(-5).reverse().map(row=>({
    signalTs:row.signalTs,direction:row.signalDirection,
    tradeNo:row.exitEvent?.tradeNo,
    result:row.comparisonResult,baselineNetUsd:row.referenceNetUsd,
    bNetUsd:row.modeB?.pnl?.netUsd??null,
    cNetUsd:row.modeC?.pnl?.netUsd??null,
    bEntry:row.modeB?.entry?.status,
    cEntry:row.modeC?.status
   })),
   caveat:'Public books5 snapshots: estimated IOC, not actual fills; no private API'
  });
 }catch(e){res.status(503).json({error:'LAB_EXECUTION_PAPER_INDISPONIBLE',
   detail:e.message});}
});
// Read-only per-engine PAPER history and full reports, always behind Amsterdam session.
// Read only the selected historical report, not the complete position contexts on refresh.
const PAPER_LEDGER_PATHS=Object.freeze({
 v52:'v52-paper-state.json',v493:'v494-paper-state.json'
});
function paperLedgerRead(kind){
 const name=PAPER_LEDGER_PATHS[kind];
 if(!name)throw Error('UNKNOWN_PAPER_ENGINE');
 const file=path.join(__dirname,'../data',name);
 const s=JSON.parse(fs.readFileSync(file,'utf8'));
 if(s.brokerOrdersEnabled!==false)throw Error('UNSAFE_PAPER_STATE');
 return s;
}
function compactPaperTrade(t,engine){
 return {engine,tradeNo:Number(t.tradeNo),
  direction:t.direction,entryAt:Number(t.entryAt),exitAt:Number(t.exitAt),
  entryPrice:Number(t.entryPrice),exitPrice:Number(t.exitPrice),
  netPnlUsd:Number(t.netPnlUsd),grossPnlUsd:Number(t.grossPnlUsd),
  feesUsd:Number(t.feesUsd),mfePriceUsd:Number(t.mfePriceUsd),
  maePriceUsd:Number(t.maePriceUsd),exitReason:String(t.exitReason||'PAPER_EXIT'),
  entryHypothesis:t.entryContext&&t.entryContext.phase||t.entryReason||null,
  entryPolicyVersion:engine==='v52'?
    t.entryPolicyVersion||'v5.2-structural-decision-paper-v0.1':
    t.entryPolicyVersion||t.engine||null,
  status:'CLOSED'};
}
function paperHistoryView(kind){
 const s=paperLedgerRead(kind);
 const history=(s.history||[]).slice(-150).reverse().map(t=>compactPaperTrade(t,kind));
 const p=s.position;
 const open=p?{engine:kind,status:'OPEN',tradeNo:Number(s.completed||0)+1,
  direction:p.direction,entryAt:Number(p.entryAt),entryPrice:Number(p.entryPrice),
  lastPrice:Number(p.lastPrice),lastNetPnlUsd:Number(p.lastNetPnlUsd),
  entryPolicyVersion:p.entryPolicyVersion||null,
  invalidationPrice:p.invalidationPrice||null,
  mfePriceUsd:p.metrics&&p.metrics.mfeUsd||p.mfePriceUsd||0,
  maePriceUsd:p.metrics&&p.metrics.maeUsd||p.maePriceUsd||0}:null;
 return {engine:kind,version:s.version,engineVersion:s.engine||null,
  startedAt:s.startedAt,updatedAt:s.lastObservationAt,
  completed:Number(s.completed||0),wins:Number(s.wins||0),
  losses:Number(s.losses||0),realizedUsd:Number(s.realizedUsd||0),
  feesUsd:Number(s.feesUsd||0),equityUsd:Number(s.equityUsd||1000),
  open,trades:history,historyLimit:150,brokerOrdersEnabled:false};
}
app.get('/api/paper-history',requireAuth,(req,res)=>{
 try{res.set('Cache-Control','private,no-store');
  sendUiJson(req,res,{version:'paper-comparison-history-v1',
   v52:paperHistoryView('v52'),v493:paperHistoryView('v493')});}
 catch(e){res.status(503).json({error:'Historique PAPER indisponible',detail:e.message});}
});
function paperMarkout(trade,rows){
 const exit=Number(trade.exitAt),entry=Number(trade.entryPrice),
  end=Number(trade.exitPrice),s=trade.direction==='long'?1:-1;
 if(!Number.isFinite(exit)||!Number.isFinite(entry)||!Number.isFinite(end))return [];
 const after=(rows||[]).filter(r=>Number.isFinite(Number(r.ts))&&
  Number.isFinite(Number(r.lastPrice))&&Number(r.ts)>exit).sort((a,b)=>a.ts-b.ts);
 return [5,15,30].map(minutes=>{
  const target=exit+minutes*60000;
  if(Date.now()<target)return {minutes,status:'PENDING'};
  const last=[...after].reverse().find(r=>Number(r.ts)<=target+30000);
  if(!last||Math.abs(Number(last.ts)-target)>90000)
    return {minutes,status:'NO_AUDIT_COVERAGE'};
  const samples=after.filter(r=>Number(r.ts)<=Number(last.ts));
  return {minutes,status:'OBSERVED',observedAt:Number(last.ts),
   price:Number(last.lastPrice),
   fromExitUsd:Math.round(s*(Number(last.lastPrice)-end)*10)/10,
   fromEntryUsd:Math.round(s*(Number(last.lastPrice)-entry)*10)/10,
   maxFavourableFromExitUsd:Math.round(Math.max(0,...samples.map(r=>s*(Number(r.lastPrice)-end)))*10)/10,
   maxAdverseFromExitUsd:Math.round(Math.min(0,...samples.map(r=>s*(Number(r.lastPrice)-end)))*10)/10};
 });
}
app.get('/api/paper-trade-report/:engine/:tradeNo',requireAuth,(req,res)=>{
 const engine=String(req.params.engine||'');
 const number=Number(req.params.tradeNo);
 if(!PAPER_LEDGER_PATHS[engine]||!Number.isInteger(number)||number<1||number>1000000)
  return res.status(400).json({error:'Moteur ou numéro PAPER invalide'});
 try{
  const state=paperLedgerRead(engine);
  let trade=(state.history||[]).find(t=>Number(t.tradeNo)===number)||null;
  if(!trade&&number<=Number(state.completed||0)){
   const f=path.join(__dirname,'../data',engine==='v52'?'v52-paper-trades.ndjson':'v494-paper-trades.ndjson');
   trade=readRecentNdjson(f,300).find(t=>Number(t.tradeNo)===number)||null;
  }
  if(!trade){
   if(state.position&&number===Number(state.completed||0)+1){
    res.set('Cache-Control','private,no-store');
    return sendUiJson(req,res,{engine,tradeNo:number,status:'OPEN',
     trade:state.position,version:state.version,postExit:[],brokerOrdersEnabled:false});
   }
   return res.status(404).json({error:'Rapport PAPER introuvable'});
  }
  let audit=[];
  try{audit=JSON.parse(fs.readFileSync(AUDIT_HISTORY_PATH,'utf8'));}catch(_){}
  let exitEvidence=null;
  try{
   const log=path.join(__dirname,'../data',engine==='v52'?
     'v52-paper-decisions.ndjson':'v494-paper-decisions.ndjson');
   const ev=readRecentNdjson(log,3000);
   exitEvidence=ev.slice().reverse().find(x=>
     x.tradeEvent&&Number(x.tradeEvent.tradeNo)===number&&
     String(x.tradeEvent.type||'').startsWith('EXIT_'))||null;
  }catch(_){}
  res.set('Cache-Control','private,no-store');
  return sendUiJson(req,res,{engine,tradeNo:number,status:'CLOSED',version:state.version,
   trade,postExit:paperMarkout(trade,audit),exitEvidence,brokerOrdersEnabled:false,
   accounting:{notionalUsd:1500,takerRate:.0005,
    funding:'NOT_MODELED',slippage:'NOT_MODELED'},
   notes:{markout:'Observations postérieures à la sortie : analyses rétrospectives, jamais des connaissances à l’entrée'}});
 }catch(e){res.status(503).json({error:'Rapport PAPER indisponible',detail:e.message});}
});
// Two active PAPER ledgers replace stopped V5.1 archival spans in Waves.
// Names kept independent: V5.2 magenta, V4.9.3 blue.
function waveUiComparePaperTrades(startTs,endTs) {
 const entries=[['v52-paper-state.json','V52_PAPER'],
                ['v494-paper-state.json','V493_PAPER']];
 const out=[];
 for(const [file,source] of entries){
  let s;try{s=JSON.parse(fs.readFileSync(path.join(__dirname,'../data',file),'utf8'));}catch(_){continue;}
  if(s.brokerOrdersEnabled!==false)continue;
  for(const t of s.history||[]){
   const entryTs=Number(t.entryAt),exitTs=Number(t.exitAt);
   if(!Number.isFinite(entryTs)||!Number.isFinite(exitTs)||entryTs>endTs||exitTs<startTs)continue;
   out.push({source,trade:Number(t.tradeNo),entryTs,exitTs,
     entryPrice:Number(t.entryPrice),exitPrice:Number(t.exitPrice),
     policyVersion:t.entryPolicyVersion||t.engine||null,
     direction:t.direction,netPnlUsd:Number(t.netPnlUsd),
     exitReason:String(t.exitReason||'PAPER_EXIT').slice(0,120),open:false});
  }
  const st=Number(s.lastObservationAt||0),age=Date.now()-st;
  if(s.position&&st>0&&age>=0&&age<90000){
   const t=s.position;
   const entryTs=Number(t.entryAt);
   if(Number.isFinite(entryTs)&&entryTs<=endTs)
    out.push({source,trade:Number(s.completed||0)+1,entryTs,exitTs:null,
      entryPrice:Number(t.entryPrice),exitPrice:null,direction:t.direction,
      policyVersion:t.entryPolicyVersion||t.engine||null,
      netPnlUsd:Number(t.lastNetPnlUsd)||0,exitReason:null,open:true});
  }
 }
 return out.filter(x=>x.trade>0&&Number.isFinite(x.entryPrice)&&
  ['long','short'].includes(x.direction)).sort((a,b)=>a.entryTs-b.entryTs).slice(-180);
}
// Elastic renders Waves 3m OHLC behind a centered buy/sell duel; no PM3 line.
// Read-only endpoint; no reuse of trading state or admission authority.
app.get('/api/elastic-chart-3m',requireAuth,(req,res)=>{
  try{
    // One shared HTTP response with 150m of true 3m candles for BOTH
    // the compact and the full-size Conversion charts; no additional fetch.
    const now=Date.now(),minutes=150,t0=now-minutes*60000;
    const candles=waveUiPriceSeries('3m',t0-180000,now).slice(-53);
    res.set('Cache-Control','no-store');
    res.json({version:'elastic-wave-3m-overlay-v0.2',source:'Waves/mcb_3m.csv + mcb_3m_live.csv',
      timeframe:'3m',period:{from:t0,to:now},candles,
      priceAxis:'BTC_USD',
      note:'Same Waves 3m OHLC source and same 150m viewport for mini and full Conversion charts. Buy/sell duel remains on its independent rolling 3m trades window, without trade authority.'});
  }catch(err){res.status(500).json({error:'Elastic 3m price chart unavailable',detail:err.message});}
});
app.get('/api/elastic-history',requireAuth,(req,res)=>{
  try{
    const hours=[6,24,48].includes(Number(req.query.hours))?Number(req.query.hours):6;
    const since=Date.now()-hours*3600000;
    const family=['MCB15','MCB3','FLOW','MA','CONVERSION','BOUNDARY','CONTEXT']
      .includes(String(req.query.family||''))?String(req.query.family):null;
    const beforeId=Number(req.query.beforeId);
    const limit=Math.max(20,Math.min(200,Number(req.query.limit)||100));
    // Reverse NDJSON parsing can reverse events sharing one evaluation timestamp.
    // The observer's monotonically increasing id is the stable pagination order.
    const all=readNdjsonSince(ELASTIC_OBSERVER_EVENTS_PATH,since)
      .filter(e=>e&&Number.isFinite(e.observedAt)&&e.observedAt>=since&&
        Number.isSafeInteger(Number(e.id))&&(!family||e.family===family))
      .sort((a,b)=>Number(a.id)-Number(b.id));
    const validBefore=Number.isSafeInteger(beforeId)&&beforeId>0;
    const eligible=validBefore?all.filter(e=>Number(e.id)<beforeId):all;
    const events=eligible.slice(-limit);
    res.set('Cache-Control','no-store');
    res.json({version:'elastic-observer-shadow-v0.5',hours,family,events,
      count:events.length,totalInWindow:all.length,hasMore:eligible.length>events.length,
      nextBeforeId:events.length?events[0].id:null,limit,
      note:'Paginated event history, newest page first. Actual observation time is different from the source bar. Archive rotation retention applies.'});
  }catch(e){res.status(500).json({error:'elastic history unavailable',detail:e.message});}
});
let tradesUiHistoryCache={size:-1,mtimeMs:-1,executed:[],reports:[],totalCount:0};
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
function readTradesUiHistory(){
  const st=fs.statSync(TRADES_V2_HISTORY_PATH);
  if(st.size===tradesUiHistoryCache.size&&st.mtimeMs===tradesUiHistoryCache.mtimeMs)
    return tradesUiHistoryCache;
  const h=JSON.parse(fs.readFileSync(TRADES_V2_HISTORY_PATH,'utf8'));
  if(!Array.isArray(h))throw new Error('V4 history malformed');
  const executed=h.map(t=>tradeSummary({...t,pnlPercent:
    t.pnlPercentLeveraged!==undefined?t.pnlPercentLeveraged:t.pnlPercentPrice}));
  const reports=h.slice(-12).map(t=>({
    ...t,entryContext:compactV4UiReportContext(t.entryContext),
    exitContext:compactV4UiReportContext(t.exitContext)
  }));
  tradesUiHistoryCache={size:st.size,mtimeMs:st.mtimeMs,executed,reports,totalCount:h.length};
  return tradesUiHistoryCache;
}
app.get('/api/trades/reports',requireAuth,(req,res)=>{
  try{
    const c=readTradesUiHistory();
    res.set('Cache-Control','private,no-store');
    sendUiJson(req,res,{version:'v4-ui-lazy-reports-v1',totalCount:c.totalCount,reports:c.reports});
  }catch(err){res.status(500).json({error:'V4 reports unavailable',detail:err.message});}
});
let archivedV3UiCache={size:-1,mtimeMs:-1,executed:[]};
function readArchivedV3Ui(){
  const st=fs.statSync(TRADES_V3_ARCHIVE_HISTORY_PATH);
  if(st.size===archivedV3UiCache.size&&st.mtimeMs===archivedV3UiCache.mtimeMs)
    return archivedV3UiCache.executed;
  const h=JSON.parse(fs.readFileSync(TRADES_V3_ARCHIVE_HISTORY_PATH,'utf8'));
  const executed=(Array.isArray(h)?h:[]).map(tradeSummary);
  archivedV3UiCache={size:st.size,mtimeMs:st.mtimeMs,executed};
  return executed;
}
app.get('/api/trades', requireAuth, (req, res) => {
  let state = { version: 'v4-prototype-0.1', modules: { scalp: null, day: null, swing: null } };
  let archivedV3Summary=[];
  let uiHistory={executed:[],reports:[],totalCount:0};
  let lastDecision = null;
  try {
    if (fs.existsSync(TRADES_V2_STATE_PATH)) state = JSON.parse(fs.readFileSync(TRADES_V2_STATE_PATH, 'utf8'));
  } catch (e) { /* etat absent ou transitoirement illisible */ }
  try {uiHistory=readTradesUiHistory();}catch(_){}
  try {
    const d = readRecentNdjson(TRADES_V2_DECISIONS_PATH,1);
    lastDecision = Array.isArray(d) && d.length ? d[d.length - 1] : null;
  } catch (e) { /* decision absente */ }
  try{archivedV3Summary=readArchivedV3Ui();}catch(_){}

  /* API UI legere : l'historique synthétique reste complet, mais les gros
   * contextes entry/exit ne sont envoyés que pour les derniers rapports.
   * Les fichiers source complets restent inchangés sur disque. */
  const ongoing = state.modules || { scalp: null, day: null, swing: null };

  const executed = uiHistory.executed;
  const stateUi = {
    version:state.version||null,
    modules:state.modules||{scalp:null,day:null,swing:null},
    lastEvaluation:compactV4UiEval(state.lastEvaluation),
    startedAt:state.startedAt||null,
    migratedAt:state.migratedAt||null,
    previousVersion:state.previousVersion||null
  };
  const lastDecisionUi = lastDecision ? {
    ts:lastDecision.ts||null,action:lastDecision.action||null,reason:lastDecision.reason||null,
    module:lastDecision.module||null,version:lastDecision.version||null
  } : null;
  sendUiJson(req,res,{
    version: state.version || 'v4-prototype-0.1',
    ongoing,
    executed,
    reports:[], // large contexts are loaded ONLY when Reports tab is opened
    reportMeta:{detailCount:uiHistory.reports.length,totalCount:uiHistory.totalCount},
    state:stateUi,
    decisions:[],
    waves:[],
    archivedV3:archivedV3Summary,
    lastDecision:lastDecisionUi,
  });
});


// Observatoire SHADOWS — synthese live + fenetre recente, aucun impact trading.
app.get('/api/shadows', requireAuth, (req, res) => {
  try {
    const EVAL_LIMIT=60; // emergency 30-minute shadow sample; 360 full snapshots blocked the UI for ~25s
    let state={};
    try {
      if(fs.existsSync(TRADES_V2_STATE_PATH))state=JSON.parse(fs.readFileSync(TRADES_V2_STATE_PATH,'utf8'));
    } catch (_) {}

    const cacheAge=Date.now()-Number(shadowsResponseCache.at||0);
    if(shadowsResponseCache.payload&&cacheAge<SHADOWS_CACHE_TTL_MS){
      const cached=shadowsResponseCache.payload;
      const latestLive=state.lastEvaluation||{};
      const payload={...cached,
        version:latestLive.version||state.version||cached.version||null,
        generatedAt:new Date().toISOString(),
        current:shadowsCurrentFromEval(latestLive,cached.current&&cached.current.tpOptimization||null),
        cache:{hit:true,ageMs:cacheAge,ttlMs:SHADOWS_CACHE_TTL_MS}
      };
      res.set('Cache-Control','no-store');
      return sendUiJson(req,res,payload);
    }

    let evalsAll=[];
    try { evalsAll=readRecentNdjson(TRADES_V2_EVAL_PATH,EVAL_LIMIT); } catch (_) {}
    evalsAll=(Array.isArray(evalsAll)?evalsAll:[]).filter(x=>x&&x.module==='day');
    function shadowEvalDataDegraded(x){
      const dq=x&&x.dataQuality||x&&x.mcb&&x.mcb.dataQuality||null;
      if(dq&&dq.degraded)return true;
      const mt=Number(x&&x.marketTimestamp);
      const cur=x&&x.mcb&&x.mcb.nested3m&&x.mcb.nested3m.currentTimestamp;
      const ct=cur?Date.parse(cur):NaN;
      return Number.isFinite(mt)&&Number.isFinite(ct)&&mt-ct>10*60000;
    }
    const excludedDataDegraded=evalsAll.filter(shadowEvalDataDegraded);
    const evals=evalsAll.filter(x=>!shadowEvalDataDegraded(x));

    // Same cached, summary-only trade array used by TRADES; TP ranking is retained.
    let history=[];
    try{history=readTradesUiHistory().executed;}catch(_){}

    const latest=evalsAll.length?evalsAll[evalsAll.length-1]:(state.lastEvaluation||{});
    const firstTs=evals.length?Date.parse(evals[0].ts||''):NaN;
    const lastTs=evals.length?Date.parse(evals[evals.length-1].ts||''):NaN;
    const windowMinutes=Number.isFinite(firstTs)&&Number.isFinite(lastTs)?Math.max(0,(lastTs-firstTs)/60000):null;

    // LIVE15 reliability uses the lighter AUDIT stream over up to 24h, then
    // compares each provisional 15m bar with the confirmed MCB CSV outcome.
    let audit15=[];
    try{
      if(fs.existsSync(AUDIT_HISTORY_PATH)){
        const a=JSON.parse(fs.readFileSync(AUDIT_HISTORY_PATH,'utf8'));
        audit15=Array.isArray(a)?a:[];
      }
    }catch(_){}
    const auditLastTs=audit15.length?Number(audit15[audit15.length-1].ts):NaN;
    const live15Since=Number.isFinite(auditLastTs)?auditLastTs-24*3600000:Date.now()-24*3600000;
    audit15=audit15.filter(r=>Number.isFinite(Number(r.ts))&&Number(r.ts)>=live15Since);

    const confirmed15Rows=new Set();
    try{
      waveUiReadTailText(path.join(WAVE_MCB_DIR,'mcb_15m.csv'),2*1024*1024).split(/\r?\n/).forEach(line=>{
        if(!line||line.startsWith('timestamp,'))return;
        const ts=Date.parse(line.split(',')[0]);if(Number.isFinite(ts))confirmed15Rows.add(ts);
      });
    }catch(_){}
    const confirmed15Events=new Map();
    try{
      waveUiSignalRows('15m',live15Since-3600000,Number.isFinite(auditLastTs)?auditLastTs:Date.now())
        .filter(e=>!e.provisional)
        .forEach(e=>confirmed15Events.set(Number(e.ts),{type:e.type,value:e.value}));
    }catch(_){}

    const live15Bars=new Map(),TF15=15*60000;
    audit15.forEach(r=>{
      const ts=Number(r.ts),barTs=Math.floor(ts/TF15)*TF15;
      const up=r.live15SignalUp!==null&&r.live15SignalUp!==undefined&&Number.isFinite(Number(r.live15SignalUp));
      const dn=r.live15SignalDn!==null&&r.live15SignalDn!==undefined&&Number.isFinite(Number(r.live15SignalDn));
      const type=up?'UP':dn?'DN':null,value=up?Number(r.live15SignalUp):dn?Number(r.live15SignalDn):null;
      let b=live15Bars.get(barTs);
      if(!b)b={barTs,closeTs:barTs+TF15,firstSeenAt:null,firstType:null,firstValue:null,firstPrice:null,
        lastType:null,lastValue:null,afterFirstSamples:0,presentSamples:0,absentSamples:0,
        flips:0,disappearances:0,reappearances:0,prevPresent:false,prevType:null};
      if(type&&!b.firstSeenAt){
        b.firstSeenAt=ts;b.firstType=type;b.firstValue=value;b.firstPrice=Number(r.lastPrice);
      }
      if(b.firstSeenAt){
        b.afterFirstSamples++;
        if(type){
          b.presentSamples++;
          if(b.prevType&&b.prevType!==type)b.flips++;
          if(!b.prevPresent&&b.presentSamples>1)b.reappearances++;
          b.prevPresent=true;b.prevType=type;b.lastType=type;b.lastValue=value;
        }else{
          b.absentSamples++;
          if(b.prevPresent)b.disappearances++;
          b.prevPresent=false;
        }
      }
      live15Bars.set(barTs,b);
    });
    const live15Resolved=[...live15Bars.values()].filter(b=>
      b.firstSeenAt&&confirmed15Rows.has(Number(b.barTs))&&
      (!Number.isFinite(auditLastTs)||Number(b.closeTs)<=auditLastTs-2*60000)
    ).map(b=>{
      const c=confirmed15Events.get(Number(b.barTs))||null;
      const confirmedType=c&&c.type||null;
      const same=confirmedType===b.firstType;
      const presence=b.afterFirstSamples?b.presentSamples/b.afterFirstSamples:null;
      return {...b,confirmedType,confirmedValue:c&&c.value,
        outcome:same?'CONFIRMED_SAME':confirmedType?'REPAINT_OPPOSITE':'REPAINT_NONE',
        leadMinutes:(b.closeTs-b.firstSeenAt)/60000,presenceFraction:presence};
    });
    const live15Same=live15Resolved.filter(x=>x.outcome==='CONFIRMED_SAME');
    const live15Repaint=live15Resolved.filter(x=>x.outcome!=='CONFIRMED_SAME');
    const live15Stable=live15Resolved.filter(x=>Number(x.presenceFraction)>=.8);
    const live15Fleeting=live15Resolved.filter(x=>Number(x.presenceFraction)<.25);
    const live15Avg=a=>a.length?a.reduce((s,x)=>s+Number(x||0),0)/a.length:null;
    const live15RawStats={
      hours:24,bars:live15Resolved.length,confirmedSame:live15Same.length,
      repaintNone:live15Resolved.filter(x=>x.outcome==='REPAINT_NONE').length,
      repaintOpposite:live15Resolved.filter(x=>x.outcome==='REPAINT_OPPOSITE').length,
      confirmationRate:live15Resolved.length?live15Same.length/live15Resolved.length:null,
      avgLeadMinutes:live15Avg(live15Resolved.map(x=>x.leadMinutes)),
      disappearanceBars:live15Resolved.filter(x=>x.disappearances>0).length,
      typeFlipBars:live15Resolved.filter(x=>x.flips>0).length,
      stableBars:live15Stable.length,
      stableConfirmationRate:live15Stable.length?live15Stable.filter(x=>x.outcome==='CONFIRMED_SAME').length/live15Stable.length:null,
      fleetingBars:live15Fleeting.length,
      fleetingConfirmationRate:live15Fleeting.length?live15Fleeting.filter(x=>x.outcome==='CONFIRMED_SAME').length/live15Fleeting.length:null,
      recent:live15Resolved.slice(-12)
    };

    const priceEpisodes=new Map();
    const continuationCandidates=new Map();
    const handoffEpisodes=new Map();
    const live15ActionResolved=new Map();
    const journal=[];
    let prevPriceKey=null,prevContState=null,prevHandoffKey=null,prevMfKey=null;
    let prevLive15ResolvedBar=null,prevLive15CurrentKey=null;

    function pushJournal(x,kind,title,detail,level){
      journal.push({
        ts:x.ts||null,marketTimestamp:x.marketTimestamp||null,price:x.price,
        kind,level:level||'SHADOW',title,detail
      });
    }
    for(const x of evals){
      const pb=x.priceBehaviorShadow||null;
      if(pb){
        const ep=pb.episode||{};
        const epKey=Number.isFinite(Number(ep.startedAt))?[ep.startedAt,pb.direction,pb.travel&&pb.travel.state].join('|'):null;
        if(pb.interesting&&epKey){
          const prev=priceEpisodes.get(epKey)||{};
          priceEpisodes.set(epKey,{
            startedAt:Number(ep.startedAt),startPrice:Number.isFinite(Number(ep.startPrice))?Number(ep.startPrice):(prev.startPrice??null),
            direction:pb.direction||null,
            travelState:pb.travel&&pb.travel.state||null,
            relation:pb.relationToSignalMemory||null,
            waveEstablished:!!pb.waveEstablished,waveAligned:!!pb.waveAligned,easyTravel:!!pb.easyTravel,
            yieldVsP75:Number.isFinite(Number(pb.travel&&pb.travel.yieldVsP75))?Number(pb.travel.yieldVsP75):(prev.yieldVsP75??null),
            effortVsP75:Number.isFinite(Number(pb.travel&&pb.travel.effortVsP75))?Number(pb.travel.effortVsP75):(prev.effortVsP75??null),
            maxFavorableUsd:Math.max(Number(prev.maxFavorableUsd)||0,Number(ep.maxFavorableUsd)||0),
            maxAdverseUsd:Math.max(Number(prev.maxAdverseUsd)||0,Number(ep.maxAdverseUsd)||0),
            lastTs:x.ts||null
          });
        }
        const priceKey=[pb.interesting?1:0,pb.travel&&pb.travel.state,pb.direction,pb.relationToSignalMemory,pb.signalMemory&&pb.signalMemory.direction,pb.signalMemory&&pb.signalMemory.sequence].join('|');
        if(priceKey!==prevPriceKey&&(pb.interesting||String(pb.state||'').includes('INTERESTING'))){
          pushJournal(
            x,'PRICE',
            (pb.travel&&pb.travel.state||pb.state||'PRICE')+(pb.direction?' · '+String(pb.direction).toUpperCase():''),
            'yield/P75 '+Number(pb.travel&&pb.travel.yieldVsP75||0).toFixed(2)+
              ' · effort/P75 '+Number(pb.travel&&pb.travel.effortVsP75||0).toFixed(2)+
              ' · '+String(pb.relationToSignalMemory||'NO_RELATION')+
              (pb.signalMemory&&pb.signalMemory.sequence?' · '+pb.signalMemory.sequence:''),
            'SHADOW'
          );
        }
        prevPriceKey=priceKey;
      }

      const cr=x.continuationReentryShadow||null;
      if(cr){
        if(cr.candidateKey){
          const old=continuationCandidates.get(cr.candidateKey)||{};
          continuationCandidates.set(cr.candidateKey,{
            candidateKey:cr.candidateKey,direction:cr.protectiveExit&&cr.protectiveExit.direction||null,
            triggeredAt:cr.triggeredAt||old.triggeredAt||null,triggerPrice:cr.triggerPrice??old.triggerPrice??null,
            state:cr.state||null,invalidated:!!cr.invalidated,
            reachedEconomicMove:!!(cr.reachedEconomicMove||old.reachedEconomicMove),
            churnRisk:!!(cr.churnRisk||old.churnRisk),
            maxMfeUsd:Math.max(Number(old.maxMfeUsd)||0,Number(cr.shadowMfeUsd)||0),
            maxMaeUsd:Math.max(Number(old.maxMaeUsd)||0,Number(cr.shadowMaeUsd)||0),
            lastTs:x.ts||null
          });
        }
        if(cr.state!==prevContState&&['CONTINUATION_REENTRY_CANDIDATE','TRACKING_SHADOW_REENTRY','TRACKING_INVALIDATED','REENTRY_INVALIDATED'].includes(cr.state)){
          pushJournal(
            x,'REENTRY',cr.state,
            (cr.protectiveExit&&cr.protectiveExit.direction?String(cr.protectiveExit.direction).toUpperCase()+' · ':'')+
              'MFE '+Number(cr.shadowMfeUsd||0).toFixed(1)+'$ · MAE '+Number(cr.shadowMaeUsd||0).toFixed(1)+'$'+
              (cr.churnRisk?' · CHURN RISK':'')+(cr.invalidationReason?' · '+cr.invalidationReason:''),
            'SHADOW'
          );
        }
        prevContState=cr.state||null;
      }

      const sh=x.structuralHandoff||null;
      if(sh){
        if(sh.detectedAt){
          const k=[sh.detectedAt,sh.direction].join('|');
          const old=handoffEpisodes.get(k)||{};
          handoffEpisodes.set(k,{
            detectedAt:sh.detectedAt,direction:sh.direction||null,
            price:Number.isFinite(Number(old.price))?Number(old.price):(Number.isFinite(Number(x.price))?Number(x.price):null),
            active:!!sh.active,reentryEligible:!!(sh.reentryEligible||old.reentryEligible),
            invalidated:!!sh.invalidated,state:sh.state||null,lastTs:x.ts||null
          });
        }
        const hk=[sh.state,sh.direction,sh.reentryEligible?1:0,sh.invalidated?1:0].join('|');
        if(hk!==prevHandoffKey&&(sh.active||sh.reentryEligible||sh.invalidated)){
          pushJournal(x,'HANDOFF',sh.state||'STRUCTURAL_HANDOFF',
            (sh.direction?String(sh.direction).toUpperCase()+' · ':'')+
            (sh.reentryEligible?'reentryEligible':'observation structure')+
            (sh.invalidationReason?' · '+sh.invalidationReason:''),'SHADOW');
        }
        prevHandoffKey=hk;
      }

      const l15=x.live15AcceptanceShadow||null;
      if(l15){
        const lr=l15.lastResolved||null;
        if(lr&&Number.isFinite(Number(lr.barTs))){
          live15ActionResolved.set(Number(lr.barTs),lr);
          if(Number(lr.barTs)!==prevLive15ResolvedBar){
            pushJournal(x,'LIVE15',lr.outcome,
              String(lr.firstType||'—')+' · lead '+Number(lr.firstSignalLeadMinutes||0).toFixed(1)+' min'+
              (lr.entryHypothesis?' · ENTRY '+(lr.entryHypothesis.confirmedSame?'confirmée':'repaint'):'')+
              (lr.exitHypothesis?' · EXIT '+(lr.exitHypothesis.confirmedSame?'confirmée':'repaint'):''),
              'SHADOW');
            prevLive15ResolvedBar=Number(lr.barTs);
          }
        }
        const cs=l15.currentSignal||null;
        const liveKey=cs?[cs.barTs,cs.type,l15.entryShadow&&l15.entryShadow.actionReady?1:0,l15.exitShadow&&l15.exitShadow.opposingLiveSignal?1:0].join('|'):'NONE';
        if(cs&&liveKey!==prevLive15CurrentKey&&(l15.entryShadow&&l15.entryShadow.actionReady||l15.exitShadow&&l15.exitShadow.opposingLiveSignal)){
          pushJournal(x,'LIVE15',cs.type+' LIVE · '+Number(cs.minutesToClose||0).toFixed(1)+' min avant close',
            (l15.entryShadow&&l15.entryShadow.actionReady?'ENTRY_STACK_READY':'')+
            (l15.entryShadow&&l15.entryShadow.actionReady&&l15.exitShadow&&l15.exitShadow.opposingLiveSignal?' · ':'')+
            (l15.exitShadow&&l15.exitShadow.opposingLiveSignal?'EXIT_OPPOSING_POSITION':''),
            'SHADOW');
        }
        prevLive15CurrentKey=liveKey;
      }

      const mf=x.mfStructureShadow&&x.mfStructureShadow.temporal||null;
      if(mf){
        const mk=[mf.state,mf.memoryDirection,mf.memoryHorizon,mf.candidateContext&&mf.candidateContext.state].join('|');
        if(mk!==prevMfKey&&mf.candidateContext&&mf.candidateContext.state){
          pushJournal(x,'MF MEMORY',mf.candidateContext.state,
            'mémoire '+String(mf.memoryDirection||'—').toUpperCase()+' '+String(mf.memoryHorizon||'')+
            ' · tactique '+String(mf.tacticalDirection||'—').toUpperCase(),'ACTIVE');
        }
        prevMfKey=mk;
      }
    }

    const pe=[...priceEpisodes.values()];
    const cc=[...continuationCandidates.values()];
    const he=[...handoffEpisodes.values()];

    const priceStats={
      episodes:pe.length,
      easyEpisodes:pe.filter(x=>x.easyTravel).length,
      alignedWithWave:pe.filter(x=>x.waveEstablished&&x.waveAligned).length,
      reached220:pe.filter(x=>Number(x.maxFavorableUsd)>=220).length,
      adverse180:pe.filter(x=>Number(x.maxAdverseUsd)>=180).length
    };
    const continuationStats={
      candidates:cc.length,
      reached220:cc.filter(x=>x.reachedEconomicMove||Number(x.maxMfeUsd)>=220).length,
      churnRisk:cc.filter(x=>x.churnRisk).length,
      invalidated:cc.filter(x=>x.invalidated).length,
      avgMfeUsd:cc.length?cc.reduce((a,x)=>a+Number(x.maxMfeUsd||0),0)/cc.length:null,
      avgMaeUsd:cc.length?cc.reduce((a,x)=>a+Number(x.maxMaeUsd||0),0)/cc.length:null
    };
    const handoffStats={
      episodes:he.length,
      reentryEligible:he.filter(x=>x.reentryEligible).length,
      invalidated:he.filter(x=>x.invalidated).length
    };

    const live15ResolvedActions=[...live15ActionResolved.values()];
    const live15EntryActions=live15ResolvedActions.map(x=>x.entryHypothesis).filter(Boolean);
    const live15ExitActions=live15ResolvedActions.map(x=>x.exitHypothesis).filter(Boolean);
    const live15ActionStats={
      entry:{
        candidates:live15EntryActions.length,
        confirmedSame:live15EntryActions.filter(x=>x.confirmedSame).length,
        repaints:live15EntryActions.filter(x=>!x.confirmedSame).length,
        avgLeadMinutes:live15Avg(live15EntryActions.map(x=>x.leadMinutesToClose)),
        avgMfeUsd:live15Avg(live15EntryActions.map(x=>x.maxFavorableUsd)),
        avgMaeUsd:live15Avg(live15EntryActions.map(x=>x.maxAdverseUsd)),
        riskReferenceBreached:live15EntryActions.filter(x=>x.riskReferenceBreached).length
      },
      exit:{
        candidates:live15ExitActions.length,
        confirmedSame:live15ExitActions.filter(x=>x.confirmedSame).length,
        repaints:live15ExitActions.filter(x=>!x.confirmedSame).length,
        avgLeadMinutes:live15Avg(live15ExitActions.map(x=>x.leadMinutesToClose)),
        avgMissedRecoveryUsd:live15Avg(live15ExitActions.map(x=>x.maxMissedRecoveryUsd)),
        avgAvoidedAdverseUsd:live15Avg(live15ExitActions.map(x=>x.maxAvoidedAdverseUsd)),
        prematureRecoveryReference:live15ExitActions.filter(x=>x.prematureRecoveryReference).length,
        avoidedAdverseReference:live15ExitActions.filter(x=>x.avoidedAdverseReference).length
      }
    };
    const live15Stats={raw:live15RawStats,actions:live15ActionStats};

    const tpTrades=[];
    history.forEach((t,i)=>{
      const tp=t&&t.tpOptimizationShadow;
      if(tp&&tp.ranking){
        tpTrades.push({
          tradeNo:i+1,exitTimestamp:t.exitTimestamp||null,direction:t.direction||null,
          bestTpVariantId:tp.ranking.bestTpVariantId||null,
          bestTpNetPnlUsd:Number(tp.ranking.bestTpNetPnlUsd),
          holdNetPnlUsd:Number(tp.ranking.holdNetPnlUsd),
          deltaVsHoldUsd:Number(tp.ranking.bestTpNetPnlUsd)-Number(tp.ranking.holdNetPnlUsd),
          variantCount:tp.variantCount||null
        });
      }
    });
    const tpStats={
      trades:tpTrades.length,
      improvedVsHold:tpTrades.filter(x=>Number(x.deltaVsHoldUsd)>0.005).length,
      equalToHold:tpTrades.filter(x=>Math.abs(Number(x.deltaVsHoldUsd))<=0.005).length,
      cumulativeBestTpDeltaUsd:tpTrades.reduce((a,x)=>a+(Number.isFinite(x.deltaVsHoldUsd)?x.deltaVsHoldUsd:0),0),
      latest:tpTrades.length?tpTrades[tpTrades.length-1]:null
    };

    function occ(ts,price,title,detail,direction,kind){
      return {
        ts:ts||null,
        price:Number.isFinite(Number(price))?Number(price):null,
        title:title||'—',detail:detail||'',direction:direction||null,kind:kind||'SHADOW'
      };
    }
    const priceOcc=pe.map(x=>occ(
      x.startedAt,x.startPrice,
      (x.travelState||'PRICE')+(x.direction?' · '+String(x.direction).toUpperCase():''),
      String(x.relation||'NO_RELATION')+' · MFE '+Number(x.maxFavorableUsd||0).toFixed(1)+'$ · MAE '+Number(x.maxAdverseUsd||0).toFixed(1)+'$'+
        (Number.isFinite(Number(x.yieldVsP75))?' · yield/P75 '+Number(x.yieldVsP75).toFixed(2):'')+
        (Number.isFinite(Number(x.effortVsP75))?' · effort/P75 '+Number(x.effortVsP75).toFixed(2):''),
      x.direction,'PRICE'
    ));
    const reentryOcc=cc.map(x=>occ(
      x.triggeredAt,x.triggerPrice,
      'RE-ENTRY '+String(x.direction||'—').toUpperCase(),
      String(x.state||'—')+' · MFE '+Number(x.maxMfeUsd||0).toFixed(1)+'$ · MAE '+Number(x.maxMaeUsd||0).toFixed(1)+'$'+
        (x.reachedEconomicMove?' · 220 atteint':'')+(x.churnRisk?' · CHURN RISK':'')+(x.invalidated?' · invalidé':''),
      x.direction,'REENTRY'
    ));
    const handoffOcc=he.map(x=>occ(
      x.detectedAt,x.price,
      'HANDOFF '+String(x.direction||'—').toUpperCase(),
      String(x.state||'—')+(x.reentryEligible?' · reentryEligible':'')+(x.invalidated?' · invalidé':''),
      x.direction,'HANDOFF'
    ));
    const live15Occ=live15Resolved.map(x=>occ(
      x.firstSeenAt,x.firstPrice,
      'LIVE15 '+String(x.firstType||'—')+' → '+String(x.confirmedType||'∅'),
      String(x.outcome||'—')+' · lead '+Number(x.leadMinutes||0).toFixed(1)+' min · présence '+Number(100*(x.presenceFraction||0)).toFixed(0)+'%'+
        (x.disappearances?' · disparitions '+x.disappearances:'')+(x.flips?' · flips '+x.flips:''),
      x.firstType==='UP'?'long':x.firstType==='DN'?'short':null,'LIVE15'
    ));
    const live15ActionOcc=live15ResolvedActions.map(x=>{
      const out=[];
      if(x.entryHypothesis){
        const h=x.entryHypothesis;
        out.push(occ(
          h.triggerTs,h.triggerPrice,
          'ENTRY LIVE15 '+String(h.signalType||'—')+' · '+String(x.outcome||'—'),
          'lead '+Number(h.leadMinutesToClose||0).toFixed(1)+' min · MFE '+Number(h.maxFavorableUsd||0).toFixed(1)+'$ · MAE '+Number(h.maxAdverseUsd||0).toFixed(1)+'$',
          h.direction,'LIVE15 ENTRY'
        ));
      }
      if(x.exitHypothesis){
        const h=x.exitHypothesis;
        out.push(occ(
          h.triggerTs,h.triggerPrice,
          'EXIT LIVE15 '+String(h.signalType||'—')+' · '+String(x.outcome||'—'),
          'lead '+Number(h.leadMinutesToClose||0).toFixed(1)+' min · récupération manquée '+Number(h.maxMissedRecoveryUsd||0).toFixed(1)+'$ · adverse évité '+Number(h.maxAvoidedAdverseUsd||0).toFixed(1)+'$',
          h.positionDirection,'LIVE15 EXIT'
        ));
      }
      return out;
    }).flat();
    const live15EntryOcc=live15ActionOcc.filter(x=>x.kind==='LIVE15 ENTRY');
    const live15ExitOcc=live15ActionOcc.filter(x=>x.kind==='LIVE15 EXIT');
    const tpOcc=tpTrades.map(x=>occ(
      x.exitTimestamp,null,
      '#'+x.tradeNo+' · '+String(x.bestTpVariantId||'—'),
      'best '+(Number.isFinite(x.bestTpNetPnlUsd)?(x.bestTpNetPnlUsd>=0?'+':'')+x.bestTpNetPnlUsd.toFixed(2)+'$':'—')+
        ' · HOLD '+(Number.isFinite(x.holdNetPnlUsd)?(x.holdNetPnlUsd>=0?'+':'')+x.holdNetPnlUsd.toFixed(2)+'$':'—')+
        ' · Δ '+(Number.isFinite(x.deltaVsHoldUsd)?(x.deltaVsHoldUsd>=0?'+':'')+x.deltaVsHoldUsd.toFixed(2)+'$':'—'),
      x.direction,'TP'
    ));

    const admissionShadow=latest&&latest.admissionCounterfactualShadow||null;
    const admissionEpisodes=[
      ...((admissionShadow&&Array.isArray(admissionShadow.completed))?admissionShadow.completed:[]),
      ...(admissionShadow&&admissionShadow.activeEpisode?[admissionShadow.activeEpisode]:[])
    ];
    const admissionOcc=admissionEpisodes.map(ep=>occ(
      ep.triggerTs,ep.triggerPrice,
      'ADMISSION '+String(ep.direction||'—').toUpperCase()+' · '+String((ep.initialBlockers||[]).join(' + ')||'—'),
      'MFE '+Number(ep.maxFavorableUsd||0).toFixed(1)+'$ · MAE '+Number(ep.maxAdverseUsd||0).toFixed(1)+'$'+
        (ep.success220BeforeMinus180===true?' · +220 avant -180':'')+
        (ep.success220BeforeMinus180===false?' · -180 avant +220':'')+
        (ep.liveToConfirmed3Minutes!==null&&ep.liveToConfirmed3Minutes!==undefined?' · E3 live→confirmé '+Number(ep.liveToConfirmed3Minutes).toFixed(1)+'m':'')+
        (ep.liveToStructural3Minutes!==null&&ep.liveToStructural3Minutes!==undefined?' · live→structure '+Number(ep.liveToStructural3Minutes).toFixed(1)+'m':'')+
        (ep.boundaryCrossedAt?' · boundary franchie':'')+
        (ep.resolution?' · '+ep.resolution:''),
      ep.direction,'ADMISSION'
    ));
    const admissionByGate={};
    ['LOW_EDGE','WAIT_SYNC','SETUP_LATE','MF_MEMORY','MF_1H','MF_3M','BOUNDARY','UP3_CLOSE_SHORT','CAMPAIGN_RETRY','THESIS_CONSUMED'].forEach(g=>{
      admissionByGate[g]=admissionOcc.filter((_,i)=>(admissionEpisodes[i]&&admissionEpisodes[i].initialBlockers||[]).includes(g));
    });

    const occurrences={
      price_all:priceOcc,
      price_wave:priceOcc.filter((_,i)=>pe[i]&&pe[i].waveEstablished&&pe[i].waveAligned),
      price_mfe220:priceOcc.filter((_,i)=>pe[i]&&Number(pe[i].maxFavorableUsd)>=220),
      price_mae180:priceOcc.filter((_,i)=>pe[i]&&Number(pe[i].maxAdverseUsd)>=180),
      reentry_all:reentryOcc,
      reentry_mfe220:reentryOcc.filter((_,i)=>cc[i]&&(cc[i].reachedEconomicMove||Number(cc[i].maxMfeUsd)>=220)),
      reentry_churn:reentryOcc.filter((_,i)=>cc[i]&&cc[i].churnRisk),
      handoff_reentry:handoffOcc.filter((_,i)=>he[i]&&he[i].reentryEligible),
      live15_all:live15Occ,
      live15_confirmed:live15Occ.filter((_,i)=>live15Resolved[i]&&live15Resolved[i].outcome==='CONFIRMED_SAME'),
      live15_repaint:live15Occ.filter((_,i)=>live15Resolved[i]&&live15Resolved[i].outcome!=='CONFIRMED_SAME'),
      live15_stable:live15Occ.filter((_,i)=>live15Resolved[i]&&Number(live15Resolved[i].presenceFraction)>=.8),
      live15_fleeting:live15Occ.filter((_,i)=>live15Resolved[i]&&Number(live15Resolved[i].presenceFraction)<.25),
      live15_disappear:live15Occ.filter((_,i)=>live15Resolved[i]&&Number(live15Resolved[i].disappearances)>0),
      live15_flip:live15Occ.filter((_,i)=>live15Resolved[i]&&Number(live15Resolved[i].flips)>0),
      live15_entry_all:live15EntryOcc,
      live15_entry_confirmed:live15EntryOcc.filter(x=>x.title.includes('CONFIRMED_SAME')),
      live15_entry_repaint:live15EntryOcc.filter(x=>!x.title.includes('CONFIRMED_SAME')),
      live15_exit_all:live15ExitOcc,
      live15_exit_repaint:live15ExitOcc.filter(x=>!x.title.includes('CONFIRMED_SAME')),
      live15_exit_recovery180:live15ExitOcc.filter((x,i)=>{
        const src=live15ResolvedActions.flatMap(r=>r.exitHypothesis?[r.exitHypothesis]:[])[i];
        return src&&src.prematureRecoveryReference;
      }),
      live15_exit_adverse180:live15ExitOcc.filter((x,i)=>{
        const src=live15ResolvedActions.flatMap(r=>r.exitHypothesis?[r.exitHypothesis]:[])[i];
        return src&&src.avoidedAdverseReference;
      }),
      admission_all:admissionOcc,
      admission_success220:admissionOcc.filter((_,i)=>admissionEpisodes[i]&&admissionEpisodes[i].success220BeforeMinus180===true),
      admission_live3:admissionOcc.filter((_,i)=>admissionEpisodes[i]&&admissionEpisodes[i].live3ContinuationAt),
      admission_LOW_EDGE:admissionByGate.LOW_EDGE||[],
      admission_WAIT_SYNC:admissionByGate.WAIT_SYNC||[],
      admission_SETUP_LATE:admissionByGate.SETUP_LATE||[],
      admission_MF_MEMORY:[...(admissionByGate.MF_MEMORY||[]),...(admissionByGate.MF_1H||[]),...(admissionByGate.MF_3M||[])],
      admission_BOUNDARY:admissionByGate.BOUNDARY||[],
      tp_all:tpOcc,
      tp_improved:tpOcc.filter((_,i)=>tpTrades[i]&&Number(tpTrades[i].deltaVsHoldUsd)>0.005),
      tp_equal:tpOcc.filter((_,i)=>tpTrades[i]&&Math.abs(Number(tpTrades[i].deltaVsHoldUsd))<=0.005)
    };
    Object.keys(occurrences).forEach(k=>{
      occurrences[k]=(occurrences[k]||[]).slice().sort((a,b)=>{
        const ta=typeof a.ts==='number'?a.ts:Date.parse(a.ts||0);
        const tb=typeof b.ts==='number'?b.ts:Date.parse(b.ts||0);
        return (Number.isFinite(tb)?tb:0)-(Number.isFinite(ta)?ta:0);
      }).slice(0,120);
    });

    const current=shadowsCurrentFromEval(latest,tpStats.latest);
    const elastic=latest&&latest.elasticSyncShadow||null;
    const elasticEpisodes=[...((elastic&&Array.isArray(elastic.completed))?elastic.completed:[]),...(elastic&&elastic.activeEpisode?[elastic.activeEpisode]:[])];
    const elasticOcc=elasticEpisodes.map(ep=>occ(
      ep.startedAt,ep.startedPrice,
      'ELASTIC '+String(ep.direction||'—').toUpperCase(),
      String(ep.orderString||'—')+' · MFE '+Number(ep.maxFavorableUsd||0).toFixed(1)+'$ · MAE '+Number(ep.maxAdverseUsd||0).toFixed(1)+'$ · relax '+Number(ep.relaxationCount||0)+
        (ep.success220BeforeMinus180===true?' · +220 avant -180':'')+(ep.resolution?' · '+ep.resolution:''),
      ep.direction,'ELASTIC'
    ));
    occurrences.elastic_all=elasticOcc;
    occurrences.elastic_success=elasticOcc.filter((_,i)=>elasticEpisodes[i]&&elasticEpisodes[i].success220BeforeMinus180===true);
    occurrences.elastic_relax=elasticOcc.filter((_,i)=>elasticEpisodes[i]&&Number(elasticEpisodes[i].relaxationCount)>0);

    const admissionStats={
      summary:admissionShadow&&admissionShadow.summary||{},
      episodes:admissionEpisodes.length,
      success220BeforeMinus180:admissionEpisodes.filter(x=>x&&x.success220BeforeMinus180===true).length,
      live3Continuation:admissionEpisodes.filter(x=>x&&x.live3ContinuationAt).length,
      active:admissionShadow&&admissionShadow.activeEpisode||null
    };
    const payload={
      version:latest&&latest.version||state.version||null,
      generatedAt:new Date().toISOString(),
      sampleWindow:{evaluations:evals.length,excludedDataDegraded:excludedDataDegraded.length,minutes:windowMinutes,firstTs:evals[0]&&evals[0].ts||null,lastTs:evals[evals.length-1]&&evals[evals.length-1].ts||null},
      current,
      stats:{priceBehavior:priceStats,continuationReentry:continuationStats,structuralHandoff:handoffStats,live15Acceptance:live15Stats,admissionCounterfactual:admissionStats,elasticSync:elastic&&elastic.summary||{episodes:0,success220BeforeMinus180:0,withRelaxation:0,orders:[]},tpOptimization:tpStats},
      occurrences,
      journal:journal.slice(-24).reverse(),
      cache:{hit:false,ageMs:0,ttlMs:SHADOWS_CACHE_TTL_MS}
    };
    shadowsResponseCache={at:Date.now(),payload};
    res.set('Cache-Control','no-store');
    sendUiJson(req,res,payload);
  } catch (e) {
    res.status(500).json({error:'shadows indisponibles',detail:e.message});
  }
});

// Isolated V5 PAPER positions. Never read V4 history for pink bands; no
// broker action. Return numeric UTC timestamps, no raw V5 analysis state.
function waveUiV5PaperTrades(startTs,endTs){
  try{
    const file=path.join(__dirname,'../data/v5-paper-state.json');
    const state=JSON.parse(fs.readFileSync(file,'utf8'));
    if(state.mode!=='PAPER_ONLY_0_USD_ORDERS'||state.brokerOrdersEnabled!==false)return[];
    const trades=(Array.isArray(state.history)?state.history:[]).map(t=>({
      trade:Number(t.tradeNo),entryTs:Number(t.entryAt),exitTs:Number(t.exitAt),
      entryPrice:Number(t.entryPrice),exitPrice:Number(t.exitPrice),
      direction:t.direction,netPnlUsd:Number(t.netPnlUsd),
      exitReason:String(t.exitReason||'PAPER_EXIT').slice(0,90),
      source:'V5_PAPER',open:false
    }));
    // An unresolved position in a stopped V5 PAPER ledger is NOT live.
    // Keep it intact in the archive, but never extend its pink span to the
    // current price after V5 has stopped observing the market.
    const paperAgeMs=Date.now()-Number(state.lastObservationAt||0);
    const paperIsLive=Number(state.lastObservationAt)>0&&paperAgeMs>=0&&paperAgeMs<=90000;
    if(state.position&&paperIsLive){
      const t=state.position;
      trades.push({trade:Number(state.completed||0)+1,entryTs:Number(t.entryAt),
        exitTs:null,entryPrice:Number(t.entryPrice),exitPrice:null,
        direction:t.direction,netPnlUsd:Number(t.lastNetPnlUsd)||0,
        exitReason:null,source:'V5_PAPER',open:true});
    }
    return trades.filter(t=>Number.isSafeInteger(t.trade)&&t.trade>0&&
      Number.isFinite(t.entryTs)&&t.entryTs>0&&
      Number.isFinite(t.entryPrice)&&t.entryPrice>0&&
      (t.exitTs===null||(Number.isFinite(t.exitTs)&&t.exitTs>=t.entryTs))&&
      ['long','short'].includes(t.direction)&&
      t.entryTs<=endTs&&(t.exitTs===null||t.exitTs>=startTs))
      .sort((a,b)=>a.entryTs-b.entryTs).slice(-150);
  }catch(_){return[];}
}
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
      data.priceSeries={'3m':waveUiPriceSeries('3m',start,end),'15m':waveUiPriceSeries('15m',start,end)};
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

// Native signal provenance: source candle, first LIVE manifestation,
// and observed confirmation are different clocks, never retroactive rights.
let waveNativeTimelineCache={mtime:0,lookup:new Map()};
function waveNativeTimeline(){
 const file=path.join(__dirname,'../data/elastic-observer-events.ndjson');
 let stat;try{stat=fs.statSync(file);}catch(_){return waveNativeTimelineCache.lookup;}
 if(waveNativeTimelineCache.mtime===stat.mtimeMs)return waveNativeTimelineCache.lookup;
 const map=new Map(),raw=waveUiReadTailText(file,6*1024*1024);
 for(const line of raw.split(/\r?\n/)){
  if(!line)continue;
  let e;try{e=JSON.parse(line);}catch(_){continue;}
  if(!['MCB3','MCB15'].includes(e.family)||!['E3','E15'].includes(e.key))continue;
  const barTs=Number(e.sourceTs),when=Number(e.observedAt);
  if(!Number.isFinite(barTs)||!Number.isFinite(when))continue;
  const dir=e.direction==='long'?'UP':e.direction==='short'?'DN':null;
  if(!dir)continue;
  const key=e.family+'|'+dir+'|'+barTs;
  let m=map.get(key);if(!m){m={firstObservedAt:null,confirmedObservedAt:null};map.set(key,m);}
  if(e.type==='OBSERVED')m.firstObservedAt=m.firstObservedAt===null?when:Math.min(m.firstObservedAt,when);
  if(e.type==='CONFIRMED')m.confirmedObservedAt=m.confirmedObservedAt===null?when:Math.min(m.confirmedObservedAt,when);
 }
 waveNativeTimelineCache={mtime:stat.mtimeMs,lookup:map};
 return map;
}
function waveUiSignalRows(tf,startTs,endTs,auditRows){
 const base=path.join(WAVE_MCB_DIR,'mcb_'+tf+'.csv');
 const live=path.join(WAVE_MCB_DIR,'mcb_'+tf+'_live.csv');
 const tfMs=tf==='3m'?180000:900000,group=tf==='3m'?'MCB3':'MCB15';
 const lookup=waveNativeTimeline(),out=[];
 const barFirst=new Map();
 if(Array.isArray(auditRows)){
  const up=tf==='3m'?'liveSignalUp':'live15SignalUp';
  const dn=tf==='3m'?'liveSignalDn':'live15SignalDn';
  for(const a of auditRows){
   const at=Number(a.ts);if(!Number.isFinite(at)||at<startTs-tfMs||at>endTs+tfMs)continue;
   const bar=Math.floor(at/tfMs)*tfMs;
   for(const [type,k] of [['UP',up],['DN',dn]]){
    if(!waveUiFinite(a[k]))continue;
    const id=type+'|'+bar;
    if(!barFirst.has(id))barFirst.set(id,at);
   }
  }
 }
 function consume(txt,isLive){
  if(!txt)return;
  txt.split(/\r?\n/).forEach(line=>{
   if(!line||line.startsWith('timestamp,'))return;
   const v=line.split(','),barTs=Date.parse(v[0]);
   if(!Number.isFinite(barTs)||barTs<startTs-tfMs||barTs>endTs)return;
   for(const [type,idx] of [['UP',13],['DN',14]]){
    const value=v[idx]!==undefined&&v[idx]!==''&&Number.isFinite(Number(v[idx]))?Number(v[idx]):null;
    if(value===null)continue;
    const meta=lookup.get(group+'|'+type+'|'+barTs)||{};
    const onset=Number(meta.firstObservedAt||barFirst.get(type+'|'+barTs));
    const hasOnset=Number.isFinite(onset)&&onset>=barTs&&onset<=barTs+tfMs+60000;
    // Display on first observable LIVE sample when known. Otherwise retain the
    // original source candle and explicit null for unavailable LIVE history.
    const displayTs=hasOnset?onset:barTs;
    const confirmedAt=Number(meta.confirmedObservedAt);
    out.push({ts:displayTs,barTs,sourceTs:barTs,type,value,
     provisional:!!isLive,firstObservedAt:hasOnset?onset:null,
     confirmedObservedAt:!isLive&&Number.isFinite(confirmedAt)&&confirmedAt>barTs?
      confirmedAt:null,chronologyQuality:hasOnset?'LIVE_ONSET_OBSERVED':'ONSET_NOT_RECORDED'});
   }
  });
 }
 consume(waveUiReadTailText(base),false);
 try{consume(fs.readFileSync(live,'utf8'),true);}catch(_){}
 const dedup=new Map();
 for(const e of out){
  const key=e.type+'|'+e.barTs,old=dedup.get(key);
  if(!old||old.provisional&&!e.provisional||old.firstObservedAt===null&&e.firstObservedAt!==null)
   dedup.set(key,e);
 }
 return [...dedup.values()].filter(x=>x.ts>=startTs&&x.ts<=endTs).sort((a,b)=>a.ts-b.ts);
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
        ma200:(v[12]!==undefined&&v[12]!==''?Number(v[12]):null),
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
  const mfs=r.mfStructureShadow||{}, mft=mfs.temporal||{};
  const p = r.position || null;
  return {
    version: r.version || null,
    ts: r.ts || null,
    price: r.price,
    position: p ? { direction:p.direction, entryPrice:p.entryPrice, entryTimestamp:p.entryTimestamp, metrics:p.metrics || null } : null,
    thesis: { state:th.state || null, direction:th.direction || null, candidateDirection:th.candidateDirection || null, mode:th.mode || null, originMode:th.originMode || null, phase:th.phase || null, actionable:!!th.actionable, maturityGate:th.maturityGate || null, reason:th.reason || null },
    background:{primaryRelation:bg.primaryRelation||null,oneHour:bg.oneHour||null,macroShadow:bg.macroShadow||null},
    nativeSignal:{latest:ns.latest||null,reinforcedUp:ns.reinforcedUp||null},
    setup:{status:setup.status||null,direction:setup.direction||null,candidateDirection:setup.candidateDirection||null,setupTs:setup.setupTs||null,reason:setup.reason||null,reasons:setup.reasons||null,mfMemory:setup.mfMemory||null,mfTransferRequired:!!setup.mfTransferRequired},
    structuralRoom:{state:room.state||null,roomToBoundaryUsd:room.roomToBoundaryUsd??null,nearestAhead:room.nearestAhead||null},
    marketQuality:{state:mq.state||null,lowEdge:!!mq.lowEdge,window30:mq.window30||null,window60:mq.window60||null},
    mfTemporal:{
      version:mft.version||null,state:mft.state||null,memoryDirection:mft.memoryDirection||null,memoryHorizon:mft.memoryHorizon||null,
      tacticalDirection:mft.tacticalDirection||null,candidateContext:mft.candidateContext||null,conversion:mft.conversion||null,
      horizons:mft.horizons?{
        m30:mft.horizons.m30||null,h1:mft.horizons.h1||null,h2:mft.horizons.h2||null,h4:mft.horizons.h4||null
      }:null
    },
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
function waveUiPriceSeries(tf,startTs,endTs){
  const base=path.join(WAVE_MCB_DIR,'mcb_'+tf+'.csv');
  const live=path.join(WAVE_MCB_DIR,'mcb_'+tf+'_live.csv');
  const out=[];
  function consume(txt,isLive){
    if(!txt)return;
    txt.split(/\r?\n/).forEach(function(line){
      if(!line||line.startsWith('timestamp,'))return;
      const v=line.split(','),ts=Date.parse(v[0]);
      if(!Number.isFinite(ts)||ts<Number(startTs)||ts>Number(endTs))return;
      const open=Number(v[1]),high=Number(v[2]),low=Number(v[3]),close=Number(v[4]);
      const ma200=(v[12]!==undefined&&v[12]!==''&&Number.isFinite(Number(v[12])))?Number(v[12]):null;
      if(![open,high,low,close].every(Number.isFinite))return;
      out.push({ts,timestamp:v[0],open,high,low,close,ma200,_live:!!isLive,timeframe:tf});
    });
  }
  consume(waveUiReadTailText(base,tf==='3m'?4*1024*1024:2*1024*1024),false);
  try{consume(fs.readFileSync(live,'utf8'),true);}catch(_){}
  out.sort((a,b)=>a.ts-b.ts||(a._live?1:-1));
  const m=new Map();
  out.forEach(r=>m.set(Number(r.ts),r));
  return Array.from(m.values()).sort((a,b)=>a.ts-b.ts);
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
    signalEvents,events,frames,
    v5PaperTrades:waveUiComparePaperTrades(startTs,endTs),
    priceSeries:{
      '3m':waveUiPriceSeries('3m',startTs,endTs),
      '15m':waveUiPriceSeries('15m',startTs,endTs)
    }
  };
  waveSnapshotCache={key,data};
  return data;
}
app.get('/api/wave-snapshot', requireAuth, (req,res)=>{
  try{
    const data=waveUiBuildSnapshot48();
    res.set('Cache-Control','private, max-age=60');
    sendUiJson(req,res,data);
  }catch(e){
    res.status(500).json({error:'wave snapshot indisponible',detail:e.message});
  }
});

// The wave LIVE state belongs to the only ACTIVE V5.4 PAPER engine.
// V4.10.10 is stopped and its historical file MUST never be called LIVE.
function waveUiV54LiveState(paper,auditLatest,now){
 const a=paper?.latestAnalysis||{},rd=a.readings||{},
  story=rd.structural54||{},conversion=rd.conversion||{};
 const ts=Number(a.asOf),p=Number(a.price);
 const validV54=paper?.brokerOrdersEnabled===false&&
  String(a.version||'').startsWith('v5.4')&&
  Number.isFinite(ts)&&ts>0&&now>=ts&&now-ts<=25000&&
  Number.isFinite(p)&&p>0;
 const at=Number(auditLatest?.ts),ap=Number(auditLatest?.lastPrice);
 const validAudit=Number.isFinite(at)&&at>0&&now>=at&&now-at<=65000&&
  Number.isFinite(ap)&&ap>0;
 const price=validV54?p:validAudit?ap:null;
 const observedAt=validV54?ts:validAudit?at:null;
 const pos=validV54&&paper.position?paper.position:null;
 return {
  version:validV54?(String(a.version||'').startsWith('v5.4.3')?'V5.4.3-PAPER':
    String(a.version||'').startsWith('v5.4.2')?'V5.4.2-PAPER':
    String(a.version||'').startsWith('v5.4.1')?'V5.4.1-PAPER':'V5.4-PAPER'):validAudit?'MCB-AUDIT':'LIVE-SOURCE-UNAVAILABLE',
  source:validV54?'V54_PAPER_PRICE':validAudit?'MCB_AUDIT_PRICE':'NO_FRESH_PRICE',
  ts:observedAt,price,priceAgeMs:observedAt===null?null:now-observedAt,
  position:pos?{direction:pos.direction,entryPrice:pos.entryPrice,
    entryTimestamp:pos.entryAt,metrics:{
      mfeUsd:pos.mfePriceUsd??null,maeUsd:pos.maePriceUsd??null,
      currentPnlUsd:pos.lastNetPnlUsd??null}}:null,
  thesis:{state:story.phase||a.phase||null,
    direction:story.director||null,candidateDirection:a.candidate||null},
  background:{primaryRelation:story.strategicState||null,
    oneHour:story.context1h?{direction:story.context1h,phase:'CONTEXT_ONLY'}:null,
    macroShadow:story.context4h||null},
  setup:{status:a.action||null,direction:a.candidate||null,reason:a.reason||null},
  structuralRoom:{state:story.phase||null,roomToBoundaryUsd:rd.place?.spaceUsd??null},
  marketQuality:{state:a.quality||null},
  mfTemporal:{state:story.mfQuality||null,memoryDirection:story.director||null,
    memoryHorizon:'E15_TO_E15',tacticalDirection:story.mcb3?.direction||null},
  mcb15:{maturity:story.phase||null,currentLbw:rd.mcb15?.lbw??null,
    extremeLbw:story.structuralOrigin?.lbw??null},
  mcb3:{currentLbw:rd.mcb3?.lbw??null,turningDirection:story.mcb3?.direction||null},
  pm:{status:story.conversion?.role||'EXECUTION_ONLY',
    net3m:conversion.pm3??null,gross3m:null,eff3m:null,
    move:conversion.pmCombined??null},
  ticker:{status:'NOT_DECISION_AUTHORITY'},
  action:{type:a.action||null,reason:a.reason||null,stage:story.phase||null},
  sourceContract:'V5.4/OKX price only; never a frozen V4.10.10 state'
 };
}
app.get('/api/btc-live-price',requireAuth,(req,res)=>{
 try{
  const s=JSON.parse(fs.readFileSync(path.join(__dirname,
    '../data/v52-paper-state.json'),'utf8'));
  const v=waveUiV54LiveState(s,null,Date.now());
  if(v.source!=='V54_PAPER_PRICE')
   return res.status(503).json({error:'NO_FRESH_V54_PRICE'});
  res.set('Cache-Control','private,no-store');
  sendUiJson(req,res,{price:v.price,ts:v.ts,ageMs:v.priceAgeMs,
    source:v.source,brokerOrdersEnabled:false});
 }catch(e){res.status(503).json({error:'V54_PRICE_UNAVAILABLE'});}
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
    try { history=readTradesUiHistory().executed; } catch(_){}
    try { state=JSON.parse(fs.readFileSync(TRADES_V2_STATE_PATH,'utf8')); } catch(_){}
    const openPosition=state.modules&&state.modules.day||null;
    const livingEval=state.lastEvaluation?Object.assign({},state.lastEvaluation,{position:openPosition}):null;
    let activePaper=null;
    try {
      activePaper=JSON.parse(fs.readFileSync(path.join(__dirname,
        '../data/v52-paper-state.json'),'utf8'));
    } catch(_){}
    const liveState=waveUiV54LiveState(activePaper,auditAll.at(-1)||null,now);
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
    sendUiJson(req,res,{
      version:'wave-live-0.1',live:true,generatedAt:new Date().toISOString(),
      period:{start:frames.length?new Date(frames[0].ts).toISOString():new Date(cut).toISOString(),end:frames.length?new Date(frames[frames.length-1].ts).toISOString():new Date(now).toISOString(),label:'LIVE Amsterdam · '+hours+'h glissantes'},
      sampling:{auditSeconds:30,frames:frames.length},
      sourceContract:{tradingImpact:false,state:'V5.4 PRIMARY PAPER price, fallback fresh AUDIT; historical frames remain audit-only',wave3:'audit live intra-bougie',wave15:'audit 15m live raw + confirme',ma200:'MCB CSV MA200; tests diagnostic only',signals:'MCB natif wt1_cross_up/down confirmés + signal live provisoire',divergences:'causal divergence shadow cached 60s; diagnostic only'},
      signalEvents:{
        wave3:waveUiSignalRows('3m',frames.length?Number(frames[0].ts):cut,frames.length?Number(frames[frames.length-1].ts):now,auditAll),
        wave15:waveUiSignalRows('15m',frames.length?Number(frames[0].ts):cut,frames.length?Number(frames[frames.length-1].ts):now,auditAll)
      },
      divergenceCatalog:waveUiCausalDivergenceCatalogCached(auditAll),
      priceSeries:{
        '3m':waveUiPriceSeries('3m',cut,now),
        '15m':waveUiPriceSeries('15m',cut,now)
      },
      liveState,
      v5PaperTrades:waveUiComparePaperTrades(now-48*3600000,now),
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
  sendUiJson(req,res,{ position, history, abstention });
});

app.get('/api/audit-history', requireAuth, (req, res) => {
  let history = [];
  try {
    if (fs.existsSync(AUDIT_HISTORY_PATH)) {
      const data = JSON.parse(fs.readFileSync(AUDIT_HISTORY_PATH, 'utf8'));
      history = Array.isArray(data) ? data : [];
    }
  } catch (e) { /* liste vide */ }
  sendUiJson(req,res,{ history });
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
  res.set('Cache-Control','no-store');
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
      /* Elastic v0.4: two market stories above the living V4 state. */
      body:has(#tab2-statev2.active) .page-wrap { max-width: 480px; }
      .elastic-dual-header {display:flex;justify-content:space-between;align-items:center;gap:6px;margin:8px 0 6px;font-family:"SF Mono",Menlo,monospace;font-size:10px;font-weight:800;letter-spacing:.05em;}
      .elastic-dual-note{font-size:9px;color:#777;letter-spacing:0;font-weight:400;}
      .elastic-dual-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:9px;}
      .elastic-dual-card{min-width:0;background:#fff;border:1px solid #dcdfe3;border-top:3px solid #aab4c1;border-radius:9px;padding:9px 10px;font:10px/1.48 "SF Mono",Menlo,monospace;}
      .elastic-dual-card.short{border-top-color:#b45353;}
      .elastic-dual-card.long{border-top-color:#278b61;}
      .elastic-dual-title{display:flex;align-items:center;justify-content:space-between;gap:6px;font-weight:800;font-size:13px;letter-spacing:.05em;}
      .elastic-dual-role{font-size:8px;padding:2px 5px;border-radius:4px;background:#f1f3f5;color:#45505c;letter-spacing:0;text-align:right;}
      .elastic-dual-status{font-size:9px;color:#686d73;margin:3px 0 7px;}
      .elastic-dual-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 9px;border-top:1px solid #eceef0;padding-top:6px;}
      .elastic-dual-kpis div{min-width:0;overflow-wrap:anywhere;}
      .elastic-dual-kpis b{color:#1c252c;font-weight:700;}
      .elastic-dual-events{margin:7px 0 0;border-top:1px solid #eceef0;padding-top:5px;}
      .elastic-dual-events .heading{font-weight:800;font-size:9px;color:#4a535a;margin-bottom:3px;}
      .elastic-dual-event{font-size:9px;padding:2px 0;border-bottom:1px dotted #f1f1f1;color:#3a4248;overflow-wrap:anywhere;}
      .elastic-dual-event em{font-style:normal;color:#8c949b;}
      .elastic-dual-full{margin-top:6px;padding-top:4px;border-top:1px solid #eceef0;}
      .elastic-dual-full summary{cursor:pointer;font-size:9px;font-weight:700;color:#546987;}
      .elastic-dual-full .elastic-dual-event{font-size:9px;}
      @media(max-width:560px){.elastic-dual-grid{gap:5px}.elastic-dual-card{padding:7px 6px;font-size:9px}.elastic-dual-title{font-size:11px}.elastic-dual-role{font-size:7px}.elastic-dual-kpis{gap:4px}.elastic-dual-header{font-size:9px}.elastic-dual-note{font-size:8px}}
      /* Elastic v0.5: compact shared measures + full causal history */
      .v5-observer{background:#f8fafb;border:1px solid #c8d9e7;border-top:3px solid #467ca3;
        border-radius:9px;margin:8px 0;padding:10px;font:10px/1.55 'SF Mono',Menlo,monospace;}
      /* V5.2 PAPER primary decision panel: Elastic shared-memory color grammar. */
      .v52-main{border-top:4px solid #8246a5;background:#f7f9fb;font:10px/1.5 'SF Mono',Menlo,monospace;}
      .v52-primary{font-size:14px;font-weight:900;letter-spacing:.04em;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
      .v53-btc-price{font-size:22px;line-height:1.1;letter-spacing:-.025em;font-weight:900;white-space:nowrap;}
      .v53-proof-row{display:flex;align-items:center;gap:4px;padding:3px 0;border-bottom:1px solid #eef1f4;font-size:9px;flex-wrap:wrap;}
      .v53-proof-row:last-child{border-bottom:0;}
      .v53-proof-key{min-width:67px;color:#62707f;font-weight:700;}
      .v53-proof-hour{font-variant-numeric:tabular-nums;}
      .v53-proof-pm{margin-left:auto;color:#576775;}
      .v53-up{color:#16804b;font-weight:850;}.v53-down{color:#bb3e42;font-weight:850;}
      .v53-neutral{color:#657482;font-weight:750;}
      .v53-phase-caption{margin:3px 0 4px;color:#536777;font-size:9px;}
      .v53-cross-note{padding-top:4px;font-size:9px;color:#7c5c36;}
      .v52-pill{font-weight:850;font-size:10px;border-radius:15px;padding:4px 8px;border:1px solid #c7d1de;background:#e8eef3;color:#46545f;}
      .v52-pill.long{background:#d7f0e1;color:#107c44;border-color:#85c9a2;}
      .v52-pill.short{background:#fbe4e5;color:#a32834;border-color:#e7a2a7;}
      .v52-pill.warn{background:#fff0d9;color:#9c6312;border-color:#edd0a1;}
      .v52-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px;}
      .v52-cell{min-width:0;border:1px solid #d9e1e8;border-left:3px solid #89a0b3;background:#fff;padding:6px;border-radius:6px;}
      .v52-cell.mcb{border-left-color:#6075b9;}.v52-cell.geom{border-left-color:#5f80ac;}
       .v52-cell.place{border-left-color:#b38339;}.v52-cell.conv{border-left-color:#a15391;display:flex;flex-direction:column;background:#f3f5f7;}
      .v52-mini-conversion{flex:1;min-width:0;margin-top:0;border:0;border-radius:0;padding:0;background:transparent;}
      .v52-cell.conv>.title{font:850 8.7px/1.4 'SF Mono',Menlo,monospace;letter-spacing:0;color:#5a6e7d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid #cbd5dd;padding-bottom:5px;margin-bottom:5px;}
      .v52-mini-price-row{text-align:center;padding:2px 0 3px;margin-bottom:1px;}
      .v52-mini-btc-price{font:850 14px/1.15 'SF Mono',Menlo,monospace;letter-spacing:-.04em;color:#304e60;font-variant-numeric:tabular-nums;}
      .v52-mini-chart{margin:0;min-height:192px;width:100%;overflow:hidden;background:#fff;border:1px solid #d7e0e7;border-radius:3px;}
      .v52-mini-chart svg{display:block;width:100%;height:192px;}
      .v52-mini-volume{display:flex;justify-content:space-between;align-items:center;gap:7px;padding:4px 1px 5px;margin-bottom:3px;border-bottom:1px solid #aebac3;font:850 11.5px/1.25 'SF Mono',Menlo,monospace;font-variant-numeric:tabular-nums;white-space:nowrap;}
      .v52-mini-delta{text-align:center;padding:3px 0 2px;margin-bottom:0;font:850 13px/1.2 'SF Mono',Menlo,monospace;color:#526b78;font-variant-numeric:tabular-nums;white-space:nowrap;}
      .v52-mini-delta.up{color:#117a4b;}.v52-mini-delta.down{color:#b93946;}
      .v52-mini-price-deport{text-align:center;color:#4387bd;font:750 9px/1.35 'SF Mono',Menlo,monospace;padding:2px 0 5px;margin-bottom:3px;border-bottom:1px solid #aebac3;white-space:nowrap;font-variant-numeric:tabular-nums;}
      .v52-mini-hours{display:flex;justify-content:space-between;gap:5px;border-bottom:1px solid #aebac3;padding:1px 0 5px;margin-bottom:3px;color:#697f8c;font:750 9.5px/1.25 'SF Mono',Menlo,monospace;font-variant-numeric:tabular-nums;}
      .v52-mini-volume .buy{color:#117a4b;}.v52-mini-volume .sell{color:#b93946;}
      .v52-mini-foot{font:9px/1.4 'SF Mono',Menlo,monospace;color:#647887;word-break:normal;}
      .v52-mini-foot strong{font-weight:800;color:#4c6574;}
      .v52-mini-mf{font:8.7px/1.4 'SF Mono',Menlo,monospace;color:#667987;overflow-wrap:break-word;margin:2px 0 3px;}
      .v52-mini-pm{color:#18222b;font-size:9px;font-weight:650;}
      .v52-mini-speed{font-size:9px;color:#647887;}
      @media(max-width:480px){.v52-mini-chart,.v52-mini-chart svg{min-height:192px;height:192px;}}
      .v52-cell.prognosis{border-left-color:#737aa3;}.v52-cell.decision{border-left-color:#40545f;}
      .v52-cell .title{font-size:9px;color:#687684;letter-spacing:.04em;font-weight:850;margin-bottom:3px;}
      .v52-cell .value{font-size:11px;font-weight:800;margin-bottom:2px;}
      .v52-cell.conv > .value{display:none;}
      .v52-cell.conv .v52-conv-speed{white-space:nowrap;}
      .v52-green{color:#14854e;font-weight:850}.v52-red{color:#b52b39;font-weight:850}
      .v52-muted{font-size:9px;color:#75818c}.v52-warn{color:#a36516;font-weight:750}
      .v52-strip{display:flex;justify-content:space-between;gap:5px;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid #dce4e8;}
      .v52-ledger{font-size:10px;padding:6px;background:#fff;border:1px solid #dce4e8;border-radius:5px;margin-top:7px;}
      @media(max-width:480px){.v52-grid{grid-template-columns:1fr;gap:4px}.v52-cell{padding:6px}.v52-cell .value{font-size:11px}}
      .v5-observer b{font-weight:800}
      .v5-head{display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap;font-size:11px;font-weight:800}
      .v5-muted{color:#657482}.v5-row{padding:4px 0;border-bottom:1px solid #e1e8ed}
      .v5-quality-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin:7px 0}
      .v5-quality-bar{border-radius:4px;padding:5px 2px;text-align:center;background:#e6ebef;font-size:9px}
      .v5-quality-bar.long{background:#d9eee2;color:#087245}
      .v5-quality-bar.short{background:#f7dedf;color:#a82d38}
      .v5-paper-position{padding:5px;margin:6px 0;background:#fff;border:1px solid #dce2e9;border-radius:4px}
      .v5-ledger{font-size:9px;border-top:1px dotted #cdd7dd;margin-top:6px;padding-top:4px}
      .v5-warn{font-weight:800;color:#9b5727}
      .el-wrap{background:#fff;border:1px solid #dbe0e5;border-radius:10px;margin:8px 0 10px;padding:11px;font:10px/1.5 "SF Mono",Menlo,monospace;}
      .el-head{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:11px;letter-spacing:.03em;flex-wrap:wrap}
      .el-head span,.el-foot,.el-old{color:#8b9298;font-weight:400}
      .el-overview{font-size:11px;padding:8px 0 5px;}
      .el-conviction{font-size:10px;padding:5px 7px;border:1px solid #dfe4e9;border-radius:6px;background:#f7f8fa;margin-bottom:5px;}
      .el-chronology{margin-top:11px;border-top:1px solid #e7e9ed;padding-top:8px;}
      .el-chronology>summary{font-weight:750;cursor:pointer;list-style-position:inside;font-size:10px;}
      .el-chronology[open]>summary{margin-bottom:6px;}
      .el-more{margin-top:5px;border:1px solid #d4dbe0;background:#f8fafb;border-radius:5px;cursor:pointer;font-size:9px;padding:6px 12px;color:#405362;}
      .el-more[hidden]{display:none;}
      .el-duel svg{display:block;margin:auto;max-width:440px;}
      .el-overlay-chart{height:268px;position:relative;width:100%;overflow:hidden;border:1px solid #dfe3e7;border-radius:5px;background:#fff;}
      .el-overlay-chart canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
      .el-overlay-chart svg{position:absolute;inset:0;width:100%;height:100%;max-width:none;pointer-events:none;}
      .el-price-axis{position:absolute;top:0;bottom:0;left:0;width:43px;pointer-events:none;font:8px 'SF Mono',Menlo,monospace;color:#555;}
      .el-price-axis span{position:absolute;left:1px;width:40px;transform:translateY(-50%);background:rgba(255,255,255,.88);text-align:right;padding-right:3px;}
      .el-chart-loading{position:absolute;left:46px;right:43px;top:6px;font-size:9px;color:#82909d;text-align:center;pointer-events:none;}
      .el-duel-price-value{text-align:center;font:800 12px/1.4 'SF Mono',Menlo,monospace;letter-spacing:.03em;padding:3px 0 1px;}
      .el-duel-legend{display:flex;gap:5px;justify-content:space-between;color:#697887;font-size:8px;padding:3px 0;}
      .el-duel-volumes{padding-bottom:3px;}
      .el-grid{display:block;margin-top:5px}
      .el-section{min-width:0;border:0;border-bottom:1px solid #e6e9ec;border-radius:0;padding:5px 0 6px;background:transparent;}
      .el-section:last-child{border-bottom:0;padding-bottom:0;}
      .el-section-title{font-weight:800;margin-bottom:4px;font-size:10px;letter-spacing:.03em;}
      .el-section-title small{font-size:8px;font-weight:400;color:#939aa0;}
      .el-measure{margin:1px 0;font-size:10px;line-height:1.4;overflow-wrap:anywhere;}
      .el-chain{font-size:10px;line-height:1.6;border-top:1px solid #e6e9ec;padding:5px 0;}
      .el-chain-proof{font-weight:650;white-space:normal;}
      .el-stack{width:100%;}
      .el-list-bubble{margin-bottom:7px;}
      .el-duel-bubble{padding:8px 9px;}
      .el-duel-metrics{font-size:10px;line-height:1.5;padding:3px 0 5px;}
      .el-duel-volumes{display:flex;justify-content:space-around;gap:8px;font-size:9px;font-weight:650;}
      .el-up{color:#16804b;font-weight:750}
      .el-down{color:#bb3e42;font-weight:750}
      .el-neutral{color:#53616e;font-weight:650}
      .el-duel{border:0;border-radius:0;padding:0;margin-top:0;}
      .el-duel-title{font-size:10px;font-weight:750;margin-bottom:4px;}
      .el-duel-grid{display:grid;grid-template-columns:1fr 76px 1fr;gap:6px;align-items:center;min-height:92px;}
      .el-fighter{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;font-size:9px;min-width:0;text-align:center;}
      .el-buy-square{display:block;background:#16804b2b;border:2px solid #16804b;border-radius:4px;}
      .el-sell-square{display:block;background:#bb3e422b;border:2px solid #bb3e42;border-radius:4px;}
      .el-duel-line{height:75px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border-left:2px dashed #a5adb5;font-size:9px;text-align:center;}
      .el-duel-notice{padding:9px;color:#687581;border:1px dotted #cfd5db;border-radius:6px;margin-top:8px;}
      .el-history-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:12px 0 5px;}
      .el-history-head label{font-size:9px;color:#687581;}
      .el-history-head select{font:inherit;padding:3px;border:1px solid #d7dce1;border-radius:4px;background:#fff;}
      .el-history-list{max-height:390px;overflow:auto;border:1px solid #e5e9ed;border-radius:6px;padding:6px;background:#fcfcfd;}
      .el-hist-row{font-size:9px;border-bottom:1px dotted #eceff1;padding:5px 1px;overflow-wrap:anywhere;}
      .el-foot{font-size:9px;margin-top:5px;line-height:1.45;}
      @media(max-width:540px){.el-wrap{padding:7px}.el-measure{font-size:9px}.el-duel-metrics{font-size:9px;}}
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
<span class="tab active" data-tab2="statev2">État vivant</span>
<span class="tab" data-tab2="waves">Vagues</span>
<span class="tab" data-tab2="historyv2">Historique</span>
<span class="tab" data-tab2="shadows">SHADOWS</span>
<span class="tab" data-tab2="boono">BOONO</span>
</div>
<div class="tab-panel active" id="tab2-statev2">
<div id="v52-live" class="v5-observer v52-main">V5.4.3 PAPER — connexion au moteur décisionnel…</div>
<div class="placeholder-note">État V4 — chargement.</div>
</div>
<div class="tab-panel" id="tab2-historyv2">
<div id="paperHistoryPanel">Chargement de l’historique PAPER…</div>
</div>
<div class="tab-panel" id="tab2-reportsv2">
<div class="placeholder-note">Les comptes rendus V4 apparaissent apres chaque trade cloture. Archive V3 conservee plus bas.</div>
</div>
<div class="tab-panel" id="tab2-shadows">
<style>
.shadow-shell{font-family:"SF Mono","Menlo","Consolas",monospace;color:#222;}
.shadow-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 10px;}
.shadow-title{font-size:14px;font-weight:800;letter-spacing:.06em;}
.shadow-sub{font-size:9.5px;color:#777;line-height:1.4;}
.shadow-window{font-size:9px;color:#666;text-align:right;}
.shadow-section-title{font-size:10px;font-weight:800;letter-spacing:.10em;color:#555;margin:12px 0 6px;}
.shadow-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
.shadow-card{border:1px solid #d7dde0;border-radius:8px;background:#fff;padding:9px 10px;min-width:0;}
.shadow-card.active-impact{border-color:#82b99a;background:rgba(31,157,85,.035);}
.shadow-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:7px;}
.shadow-card-title{font-size:11px;font-weight:850;letter-spacing:.05em;}
.shadow-badge{flex:none;border:1px solid #aebbc2;border-radius:999px;padding:2px 6px;font-size:8px;font-weight:850;letter-spacing:.06em;color:#58707c;background:#f8fafb;white-space:nowrap;}
.shadow-badge.active{border-color:#78b491;color:#1f7c48;background:rgba(31,157,85,.07);}
.shadow-badge.warn{border-color:#d8a65a;color:#9a6419;background:#fff8ec;}
.shadow-main{font-size:13px;font-weight:850;line-height:1.25;overflow-wrap:anywhere;}
.shadow-secondary{font-size:9.5px;color:#666;line-height:1.45;margin-top:3px;overflow-wrap:anywhere;}
.shadow-kv{display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 8px;margin-top:7px;font-size:9.5px;line-height:1.35;}
.shadow-kv .k{color:#888;white-space:nowrap;}
.shadow-kv .v{color:#333;font-weight:700;overflow-wrap:anywhere;}
.shadow-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;}
.shadow-stat{border:1px solid #dde1e3;border-radius:7px;background:#fff;padding:7px 8px;min-width:0;}
.shadow-stat-btn{width:100%;appearance:none;text-align:left;color:inherit;font-family:inherit;cursor:pointer;}
.shadow-stat-btn:hover{border-color:#8abbd3;background:#f7fbfd;}
.shadow-stat-btn:focus-visible{outline:2px solid rgba(47,128,237,.28);outline-offset:1px;}
.shadow-stat-btn.selected{border-color:#8abbd3;background:rgba(135,206,235,.12);}
.shadow-occurrences{display:none;position:static;margin:8px 0 10px;border:1px solid #8abbd3;border-radius:8px;background:#fff;overflow:hidden;scroll-margin-top:12px;height:270px;max-height:270px;}
.shadow-occurrences.open{display:flex;flex-direction:column;}
.shadow-occ-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 9px;background:rgba(135,206,235,.10);border-bottom:1px solid #dbeaf1;flex:none;}
.shadow-occ-title{font-size:10px;font-weight:850;letter-spacing:.06em;}
.shadow-occ-head-right{display:flex;align-items:center;gap:7px;min-width:0;}
.shadow-occ-meta{font-size:8.5px;color:#71808a;white-space:nowrap;}
.shadow-occ-close{width:22px;height:22px;min-width:22px;padding:0;border:1px solid #b8c7cf;border-radius:4px;background:#fff;color:#4f626c;font:700 14px/20px inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.shadow-occ-close:hover{border-color:#8abbd3;background:#eef8fc;}
.shadow-occ-list{min-height:0;flex:1;overflow-y:auto;overflow-x:hidden;}
.shadow-occ-row{display:grid;grid-template-columns:74px 72px minmax(0,1fr);gap:8px;padding:7px 9px;border-top:1px solid #edf0f1;align-items:start;}
.shadow-occ-row:first-child{border-top:0;}
.shadow-occ-time{font-size:8.5px;color:#777;line-height:1.35;}
.shadow-occ-kind{font-size:8px;font-weight:850;letter-spacing:.05em;color:#607782;}
.shadow-occ-main{font-size:9.5px;line-height:1.4;min-width:0;overflow-wrap:anywhere;}
.shadow-occ-main b{font-size:9.5px;}
.shadow-occ-empty{padding:11px;color:#777;font-size:9.5px;}
.shadow-stat .n{font-size:15px;font-weight:850;line-height:1.1;}
.shadow-stat .l{font-size:8.5px;color:#777;margin-top:3px;line-height:1.25;}
.shadow-journal{border:1px solid #dde1e3;border-radius:8px;background:#fff;overflow:hidden;}
.shadow-event{display:grid;grid-template-columns:56px 72px minmax(0,1fr);gap:7px;padding:7px 8px;border-top:1px solid #edf0f1;align-items:start;}
.shadow-event:first-child{border-top:0;}
.shadow-event-time{font-size:8.5px;color:#777;}
.shadow-event-kind{font-size:8px;font-weight:850;letter-spacing:.05em;color:#607782;}
.shadow-event-kind.active{color:#1f7c48;}
.shadow-event-main{font-size:9.5px;line-height:1.35;min-width:0;}
.shadow-event-main b{font-size:9.5px;}
.shadow-empty{padding:12px;color:#777;font-size:10px;}
@media(max-width:700px){
  .shadow-grid{grid-template-columns:1fr;}
  .shadow-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
  .shadow-event{grid-template-columns:48px 62px minmax(0,1fr);}
  .shadow-occ-row{grid-template-columns:60px 58px minmax(0,1fr);}
  .shadow-occurrences{height:235px;max-height:235px;}
}
</style>
<div id="shadowsApp" class="shadow-shell">
  <div class="shadow-head">
    <div><div class="shadow-title">BOONO — SHADOWS</div><div class="shadow-sub">Observatoire expérimental · aucune autorité implicite</div></div>
    <div id="shadowWindow" class="shadow-window">Chargement…</div>
  </div>
  <div id="shadowLive"><div class="shadow-empty">Chargement des shadows…</div></div>
</div>
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
.wave-price-head-main{min-width:0;flex:1 1 300px;}
.wave-price-titleline{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.wave-price-actions{display:flex;align-items:center;gap:4px;flex-wrap:wrap;}
.wave-price-live-head{font:800 10px 'SF Mono',Menlo,Consolas,monospace;color:#2f80ed;white-space:nowrap;margin-right:4px;letter-spacing:.02em;}
.wave-module-title-wrap{display:inline-flex;align-items:center;gap:5px;min-width:0;}
.wave-info-btn{width:18px;height:18px;min-width:18px;padding:0;border:1px solid #b8c7cf;border-radius:50%;background:#fff;color:#55717e;font:800 10px/16px 'SF Mono',Menlo,Consolas,monospace;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;}
.wave-info-btn:hover{background:#eef8fc;border-color:#8abbd3;color:#245a73;}
.wave-info-overlay{display:none;position:fixed;inset:0;z-index:1100;background:rgba(18,18,20,.16);padding:18px 10px;align-items:flex-start;justify-content:center;}
.wave-info-overlay.open{display:flex;}
.wave-info-card{width:min(430px,94vw);margin-top:min(18vh,120px);background:#fff;border:1px solid #b8c7cf;border-radius:9px;box-shadow:0 10px 28px rgba(0,0,0,.18);overflow:hidden;}
.wave-info-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border-bottom:1px solid #e5e8ea;background:#fbfcfc;}
.wave-info-title{font-size:10px;font-weight:800;letter-spacing:.06em;color:#222;}
.wave-info-close{width:26px;height:24px;min-width:26px;padding:0;border:1px solid #bbb;background:#fff;color:#222;border-radius:4px;font:700 15px/1 inherit;cursor:pointer;}
.wave-info-body{padding:10px 11px;font-size:10px;line-height:1.55;color:#444;}
.wave-info-body b{color:#222;}
.wave-info-body .wave-info-row{margin:0 0 4px;}
.wave-info-body .wave-info-row:last-child{margin-bottom:0;}
.wave-structural-story{border:1px solid #cbdbe5;border-left:3px solid #627a9a;
 background:#f8fbfd;border-radius:5px;padding:7px 9px;margin:0 0 8px;
 font:10px/1.5 'SF Mono',Menlo,Consolas,monospace;color:#334;}
.wave-structural-story .heading{font-weight:800;color:#234;letter-spacing:.03em;
 display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;}
.wave-structural-story .line{margin-top:3px}
.wave-structural-story .alert{color:#9b3545;font-weight:800}
.wave-structural-story .note{color:#63717d;font-size:9px}
.wave-price-canvas{height:300px;}
.wave-price-axis{position:absolute;left:0;right:auto;top:0;z-index:7;width:36px;height:300px;pointer-events:none;background:#fff;}

.wave-price-axis-mark{position:absolute;left:0;right:0;height:0;transform:translateY(-.5px);}
.wave-price-axis::after{content:'';position:absolute;right:0;top:12px;bottom:18px;border-right:1px solid rgba(150,150,150,.38);}
.wave-price-axis-bar{position:absolute;right:0;left:auto;top:0;width:5px;height:0;background:none;border-radius:0;border-top:1px solid #d9d9d9;}
.wave-price-axis-label{position:absolute;left:1px;right:5px;top:0;transform:translateY(-50%);font:600 8px 'SF Mono',Menlo,Consolas,monospace;color:#555;white-space:nowrap;text-align:right;background:#fff;}

.wave-flow-audit{border:1px solid #8abbd3;border-radius:7px;background:rgba(135,206,235,.18);padding:7px 9px;margin:0 0 8px;font-size:10px;color:#333;line-height:1.4;display:flex;align-items:center;justify-content:space-between;gap:10px;}
.wave-flow-audit .wave-flow-text{min-width:0;overflow-wrap:anywhere;}
.wave-flow-audit b{color:#222;letter-spacing:.06em;}.wave-flow-vivant{flex:none;border:1px solid #111;background:#fff;color:#111;border-radius:4px;padding:4px 8px;font:800 9px 'SF Mono',Menlo,Consolas,monospace;letter-spacing:.08em;cursor:pointer}.wave-flow-vivant:hover{background:#111;color:#fff}
.wave-price-legend{font-size:9.5px;color:#666;line-height:1.3;}
.wave-scroll-shell{position:relative;width:100%;}
.wave-scroll{width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;}
.wave-y-axis{position:absolute;left:0;top:0;z-index:6;width:36px;height:185px;pointer-events:none;background:linear-gradient(90deg,rgba(255,255,255,1) 0%,rgba(255,255,255,.98) 78%,rgba(255,255,255,.88) 92%,rgba(255,255,255,0) 100%);}
.wave-y-axis::after{content:'';position:absolute;right:0;top:13px;bottom:19px;border-right:1px solid rgba(150,150,150,.22);}
.wave-y-tick{position:absolute;right:5px;transform:translateY(-50%);font:9px 'SF Mono',Menlo,Consolas,monospace;color:#888;white-space:nowrap;text-shadow:0 1px 0 #fff;}
.wave-y-tick.threshold{font-weight:700;color:#555;}
.wave-y-tick.zero{font-weight:700;color:#2f80ed;}
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
.wave-trade-panel{border:1px solid #8abbd3;background:rgba(135,206,235,.18);border-radius:6px;padding:6px 9px;margin:-1px 0 8px;min-height:30px;font-size:10px;line-height:1.35;color:#333;display:flex;align-items:center;justify-content:space-between;gap:8px;}\n.wave-trade-panel .info{min-width:0;flex:1;overflow-wrap:anywhere;}\n.wave-trade-panel .head{font-weight:800;letter-spacing:.05em;margin-right:8px;}\n.wave-trade-panel .muted{color:#777;}\n.wave-trade-report-btn{border:1px solid #8abbd3;background:#fff;color:#245a73;border-radius:4px;padding:4px 7px;font-family:inherit;font-size:9px;font-weight:800;letter-spacing:.05em;cursor:pointer;flex:none;}\n.wave-trade-report-btn:hover{background:#eef8fc;}\n.wave-report-overlay{display:none;position:fixed;inset:0;z-index:1000;background:rgba(18,18,20,.18);padding:18px 10px;align-items:flex-start;justify-content:center;}
.wave-report-overlay.open{display:flex;}
.wave-report-card{width:min(620px,96vw);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border:1px solid #cfcfd4;border-radius:10px;box-shadow:0 10px 32px rgba(0,0,0,.24);}
.wave-report-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px;background:rgba(255,255,255,.97);border-bottom:1px solid #e2e2e5;}
.wave-report-title{font-size:11px;font-weight:800;letter-spacing:.05em;overflow-wrap:anywhere;}
.wave-report-close{border:1px solid #bbb;background:#fff;color:#222;border-radius:5px;width:28px;height:26px;font:700 16px/1 inherit;cursor:pointer;flex:none;}
.wave-report-body{padding:9px;}
.wave-report-body .diag-module{margin-bottom:0;}
.wave-report-loading{font-size:11px;color:#666;padding:12px 4px;}
@media(max-width:700px){.wave-band-head{display:block}.wave-band-legend{text-align:left;margin-top:3px}.wave-canvas{height:155px}.wave-price-canvas{height:230px}.wave-price-axis{height:230px}.wave-y-axis{height:155px}.wave-report-overlay{padding:8px 5px}.wave-report-card{max-height:calc(100vh - 16px);}}
</style>
<div id="waveReplayApp" class="wave-replay-shell">
  <div class="wave-replay-head">
    <div class="wave-title-row"><div class="wave-replay-title">BOONO — Vagues 15m / 3m</div><div class="wave-head-actions"><button id="waveModeLive" class="wave-mode-btn live" type="button"><span class="wave-live-dot"></span>LIVE</button></div></div>
    <div id="waveReplayPeriod" class="wave-replay-note">Chargement du LIVE…</div>
  </div>
  <div id="waveV5StructureStory" class="wave-structural-story">V5.4.3 · Lecture structurelle…</div>
  <div id="waveReplayState" class="wave-state-grid" style="display:none"></div>
  <div class="wave-band">
    <div class="wave-band-head">
      <div class="wave-price-head-main">
        <div class="wave-price-titleline"><span class="wave-module-title-wrap"><span id="wavePriceTitle" class="wave-band-title">PRIX BTCUSDT · 3m</span><button class="wave-info-btn" type="button" data-wave-info="price" aria-label="Informations graphe Prix">i</button></span><span id="wavePriceLiveHead" class="wave-price-live-head">LIVE —</span></div>
      </div>
      <div class="wave-price-actions">
        <button id="wavePrice3m" class="wave-scale-btn active" type="button">3m</button>
        <button id="wavePrice15m" class="wave-scale-btn" type="button">15m</button>
        <button id="waveScale24" class="wave-scale-btn active" type="button">24H</button>
        <button id="waveScale48" class="wave-scale-btn" type="button">48H</button>
      </div>
    </div>
    <div class="wave-scroll-shell"><div id="wavePriceScroll" class="wave-scroll top"><div class="wave-canvas-track"><canvas id="wavePriceCanvas" class="wave-canvas wave-price-canvas"></canvas></div></div><div id="wavePriceYAxis" class="wave-price-axis" aria-hidden="true"></div></div>
  </div>
  <div id="waveTradePanel" class="wave-trade-panel"><span class="muted">Toucher la bande bleue en haut (V4.9.3) ou rose en bas (V5) pour choisir un trade.</span></div>
  <div class="wave-band">
    <div class="wave-band-head wave15-head"><div class="wave-band-headline"><span class="wave-module-title-wrap"><span class="wave-band-title">VAGUE 15m — LIVE intra-bougie</span><button class="wave-info-btn" type="button" data-wave-info="wave15" aria-label="Informations Vague 15m">i</button></span></div></div>
    <div class="wave-scroll-shell"><div id="wave15Scroll" class="wave-scroll top"><div class="wave-canvas-track"><canvas id="wave15Canvas" class="wave-canvas"></canvas></div></div><div id="wave15YAxis" class="wave-y-axis" aria-hidden="true"></div></div>
  </div>
  <div id="waveFlowAudit" class="wave-flow-audit"><span class="wave-flow-text"><b>FLOW / AUDIT</b> · chargement…</span><button id="waveFlowAliveBtn" class="wave-flow-vivant" type="button">VIVANT</button></div>
  <div class="wave-band">
    <div class="wave-band-head"><span class="wave-module-title-wrap"><span class="wave-band-title">VAGUE 3m — LIVE intra-bougie</span><button class="wave-info-btn" type="button" data-wave-info="wave3" aria-label="Informations Vague 3m">i</button></span></div>
    <div class="wave-scroll-shell"><div id="wave3Scroll" class="wave-scroll bottom"><div class="wave-canvas-track"><canvas id="wave3Canvas" class="wave-canvas"></canvas></div></div><div id="wave3YAxis" class="wave-y-axis" aria-hidden="true"></div></div>
    <div class="wave-scroll-meta"><span id="waveHistoryStatus">6 h visibles · chargement historique…</span></div>
  </div>
  <div id="waveInfoOverlay" class="wave-info-overlay" aria-hidden="true">
    <div class="wave-info-card" role="dialog" aria-modal="true" aria-labelledby="waveInfoTitle">
      <div class="wave-info-head"><div id="waveInfoTitle" class="wave-info-title">INFO</div><button id="waveInfoClose" class="wave-info-close" type="button" aria-label="Fermer">×</button></div>
      <div id="waveInfoBody" class="wave-info-body"></div>
    </div>
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

<script src="/boono-charts.js"></script>
<script src="/elastic-live-conversion-v541.js"></script>
<script src="/elastic-mini-conversion-v542.js"></script>
<script src="/elastic-observer-ui.js"></script>
<script src="/app.js"></script>
    </body>
    </html>
  `);
});

// The conversion graph receives trades from the page's EXISTING OKX WS,
// not from V4.10.10. This lightweight client never decides or places orders.
app.get('/elastic-live-conversion-v541.js',requireAuth,(req,res)=>{
 const file=path.join(__dirname,'elastic-live-conversion-v541.js');
 res.set('Cache-Control','no-store');
 res.type('application/javascript').send(fs.readFileSync(file,'utf8'));
});
// Responsive compact version of the SAME live conversion: display only.
app.get('/elastic-mini-conversion-v542.js',requireAuth,(req,res)=>{
 const file=path.join(__dirname,'elastic-mini-conversion-v542.js');
 res.set('Cache-Control','no-store');
 res.type('application/javascript').send(fs.readFileSync(file,'utf8'));
});
// Elastic v0.5 historical observation renderer — read-only.
app.get('/elastic-observer-ui.js',requireAuth,(req,res)=>{
  const file=path.join(__dirname,'elastic-observer-ui.js');
  res.set('Cache-Control','no-store');
  res.type('application/javascript').send(fs.readFileSync(file,'utf8'));
});

// Shared BOONO charts renderer — same browser drawing core for Vagues and BOONO-TV.
app.get('/boono-charts.js', requireAuth, (req,res)=>{
  const file=path.join(__dirname,'../shared/boono-chart-renderer.js');
  res.set('Cache-Control','no-store');
  res.type('application/javascript').send(fs.readFileSync(file,'utf8'));
});

// ── Script client ─────────────────────────────────────────────────────────────
app.get('/app.js', requireAuth, (req, res) => {
  res.set('Cache-Control','no-store');
  res.type('application/javascript').send(`
let diagAutoRefresh = null;
let tradesAutoRefresh = null;
let auditAutoRefresh = null;

/* Prix BTC OKX : un WS navigateur avec watchdog + repli V5.4 serveur.
   Tous ces chemins sont LECTURE SEULE, aucun impact moteur. */
let v3UiPrice={price:null,ts:null,status:'connexion...',source:'NONE'};
let v3UiWs=null,v3UiPing=null,v3UiReconnect=null;
let v3UiWsOpenedAt=0,v3UiLastWsTradeAt=0;
let v3UiFallbackAt=0,v3UiFallbackBusy=false;
const V3_WS_STALE_MS=15000,V3_SERVER_STALE_MS=25000;
function v3UiFreshQuote(q){
 // A quote from a socket that has already errored/closed is not advertised
 // as a LIVE websocket trade, even during the 15s freshness window.
 if(q?.source==='OKX_WS'&&q.status!=='OKX live')return false;
 const max=q?.source==='V54_SERVER'?V3_SERVER_STALE_MS:V3_WS_STALE_MS;
 const age=Date.now()-Number(q?.ts);
 return q&&q.price!==null&&Number.isFinite(Number(q.price))&&Number(q.price)>0&&
   q.ts!==null&&Number.isFinite(Number(q.ts))&&Number(q.ts)>0&&
   age>=-3000&&age<=max;
}
function updateV3LivePriceDom(){
 const good=v3UiFreshQuote(v3UiPrice);
 const priceEl=document.getElementById('v3LivePrice');
 const metaEl=document.getElementById('v3LivePriceMeta');
 if(priceEl)priceEl.textContent=good?
   Number(v3UiPrice.price).toLocaleString('fr-FR',{
     minimumFractionDigits:1,maximumFractionDigits:1}):'—';
 if(metaEl){
   const age=v3UiPrice.ts?Math.max(0,(Date.now()-v3UiPrice.ts)/1000):null;
   metaEl.textContent=(good?v3UiPrice.status:'Prix Live indisponible')+
     (age!==null?' · '+age.toFixed(age<10?1:0)+'s':'');
 }
 if(window.updateElasticCurrentPrice)
   window.updateElasticCurrentPrice(good?v3UiPrice.price:null,
     good?v3UiPrice.ts:null,
     good?(v3UiPrice.source==='OKX_WS'?'OKX live':'V5.4 live serveur'):'STALE');
}
async function v3UiPollServerPrice(){
 if(v3UiFallbackBusy||Date.now()<v3UiFallbackAt||document.hidden)return;
 if(v3UiLastWsTradeAt&&Date.now()-v3UiLastWsTradeAt<=V3_WS_STALE_MS)return;
 v3UiFallbackAt=Date.now()+5000;
 v3UiFallbackBusy=true;
 try{
   const r=await fetch('/api/btc-live-price',{cache:'no-store',
     signal:AbortSignal.timeout(4000)});
   if(!r.ok)throw Error('HTTP '+r.status);
   const q=await r.json();
   if(v3UiLastWsTradeAt&&Date.now()-v3UiLastWsTradeAt<=V3_WS_STALE_MS)return;
   const candidate={price:Number(q.price),ts:Number(q.ts),
     status:'V5.4 live serveur',source:'V54_SERVER'};
   if(q.source!=='V54_PAPER_PRICE'||!v3UiFreshQuote(candidate))return;
   if(!v3UiFreshQuote(v3UiPrice)||Number(candidate.ts)>=Number(v3UiPrice.ts)){
     v3UiPrice=candidate;
     updateV3LivePriceDom();
     if(typeof waveSchedulePriceRedraw==='function')waveSchedulePriceRedraw();
   }
 }catch(_){
   if(!v3UiFreshQuote(v3UiPrice)){
     v3UiPrice.status='prix temporairement indisponible';
     updateV3LivePriceDom();
     if(typeof waveSchedulePriceRedraw==='function')waveSchedulePriceRedraw();
   }
 }finally{v3UiFallbackBusy=false;}
}
function connectV3LivePrice(){
 if(v3UiWs&&(v3UiWs.readyState===WebSocket.OPEN||
              v3UiWs.readyState===WebSocket.CONNECTING))return;
 clearTimeout(v3UiReconnect);
 try{
   v3UiPrice.status='connexion OKX...';updateV3LivePriceDom();
   const ws=new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
   v3UiWs=ws;
   ws.onopen=function(){
     if(v3UiWs!==ws)return;
     v3UiWsOpenedAt=Date.now();
     ws.send(JSON.stringify({op:'subscribe',args:[
       {channel:'trades',instId:'BTC-USDT-SWAP'}]}));
     clearInterval(v3UiPing);
     v3UiPing=setInterval(function(){
       try{if(v3UiWs===ws&&ws.readyState===WebSocket.OPEN)ws.send('ping');}
       catch(_){}
     },20000);
   };
   ws.onmessage=function(ev){
     if(v3UiWs!==ws||ev.data==='pong')return;
     let msg;try{msg=JSON.parse(ev.data);}catch(_){return;}
     if(!msg||msg.arg?.channel!=='trades'||!Array.isArray(msg.data)||
       !msg.data.length)return;
     // All OKX trades, not just the last of each message: aggressor
     // volume requires each trade side + size for an accurate 3m duel.
     if(window.elasticConversionV541)
       for(const tr of msg.data)window.elasticConversionV541.ingestTrade(tr);
     const d=msg.data[msg.data.length-1];
     const px=Number(d.px),ts=d.ts?Number(d.ts):Date.now();
     const next={price:px,ts,status:'OKX live',source:'OKX_WS'};
     if(!v3UiFreshQuote(next))return;
     v3UiLastWsTradeAt=Date.now();
     v3UiPrice=next;updateV3LivePriceDom();
     if(typeof waveSchedulePriceRedraw==='function')waveSchedulePriceRedraw();
   };
   ws.onerror=function(){
     if(v3UiWs!==ws)return;
     v3UiPrice.status='OKX WS erreur';
     try{ws.close();}catch(_){}
     updateV3LivePriceDom();
   };
   ws.onclose=function(){
     if(v3UiWs!==ws)return;
     v3UiWs=null;clearInterval(v3UiPing);v3UiPing=null;
     v3UiWsOpenedAt=0;v3UiLastWsTradeAt=0;
     if(v3UiPrice.source==='OKX_WS')v3UiPrice.status='OKX reconnect...';
     updateV3LivePriceDom();
     clearTimeout(v3UiReconnect);
     v3UiReconnect=setTimeout(connectV3LivePrice,3000);
   };
 }catch(_){
   v3UiWs=null;
   v3UiPrice.status='OKX WS indisponible';
   updateV3LivePriceDom();
   v3UiReconnect=setTimeout(connectV3LivePrice,3000);
 }
}
function v3UiPriceWatchdog(){
 const now=Date.now();
 if(v3UiWs&&v3UiWs.readyState===WebSocket.OPEN&&
    now-(v3UiLastWsTradeAt||v3UiWsOpenedAt||now)>V3_WS_STALE_MS){
   // An OPEN socket with no ticks is a zombie. Close, reconnect and
   // use V5.4 server quote meanwhile; NEVER leave a frozen price as LIVE.
   v3UiPrice.status='OKX WS silencieux · reconnexion';
   try{v3UiWs.close();}catch(_){}
 }
 if(!v3UiFreshQuote(v3UiPrice)){
   updateV3LivePriceDom();
   if(typeof waveSchedulePriceRedraw==='function')waveSchedulePriceRedraw();
 }
 if(!v3UiLastWsTradeAt||now-v3UiLastWsTradeAt>V3_WS_STALE_MS)
   v3UiPollServerPrice();
 if(window.elasticConversionV541)window.elasticConversionV541.refreshUi();
}
setInterval(v3UiPriceWatchdog,1000);
document.addEventListener('visibilitychange',function(){
 if(!document.hidden){
   if(!v3UiWs||v3UiWs.readyState>=WebSocket.CLOSING)connectV3LivePrice();
   v3UiFallbackAt=0;v3UiPriceWatchdog();
 }
});
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
      const shadowsTab=document.querySelector('.tab[data-tab2="shadows"]');
      const reportsTab=document.querySelector('.tab[data-tab2="reportsv2"]');
      const historyTab=document.querySelector('.tab[data-tab2="historyv2"]');
      const wavesTab=document.querySelector('.tab[data-tab2="waves"]');
      if(reportsTab&&reportsTab.classList.contains('active')){
        loadV4Reports(); // no 30-second reports download
      }else if(wavesTab&&wavesTab.classList.contains('active')){
        waveLiveFollow=true;loadWaveLive(false);
      }else if(historyTab&&historyTab.classList.contains('active')){
        // Opening TRADES with Historique already selected must load it NOW.
        loadPaperHistoryPanel();
      }else if(shadowsTab&&shadowsTab.classList.contains('active')){
        loadShadows();
        tradesAutoRefresh=setInterval(loadShadows,30000);
      }else{
        loadV5StructureLive();
        loadTrades();
        tradesAutoRefresh=setInterval(loadTrades,30000);
      }
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
    document.querySelectorAll('#tab2-statev2, #tab2-historyv2, #tab2-reportsv2, #tab2-shadows, #tab2-boono, #tab2-waves').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('tab2-' + el.dataset.tab2).classList.add('active');
    // Reading mode: reports must remain perfectly stable while Benjamin studies them.
    // The 30s trade refresh is suspended on the Reports sub-tab and resumes elsewhere.
    if (el.dataset.tab2 === 'reportsv2' || el.dataset.tab2 === 'waves') {
      if (tradesAutoRefresh) { clearInterval(tradesAutoRefresh); tradesAutoRefresh = null; }
      if (el.dataset.tab2 === 'waves') { waveLiveFollow=true; loadWaveLive(false); }
      else {stopWaveLiveRefresh();loadV4Reports();}
    } else if (el.dataset.tab2 === 'historyv2') {
      stopWaveLiveRefresh();
      // History is a separate PAPER API, not a side-effect of loadTrades().
      // Entering the tab must not wait for the 30-second periodic timer.
      if (tradesAutoRefresh) { clearInterval(tradesAutoRefresh); tradesAutoRefresh = null; }
      loadPaperHistoryPanel();
    } else if (el.dataset.tab2 === 'shadows') {
      stopWaveLiveRefresh();
      if (tradesAutoRefresh) { clearInterval(tradesAutoRefresh); tradesAutoRefresh = null; }
      loadShadows();
      tradesAutoRefresh = setInterval(loadShadows, 30000);
    } else {
      stopWaveLiveRefresh();
      const tradesMain = document.querySelector('.main-nav-item[data-main="trades"]');
      if (tradesMain && tradesMain.classList.contains('active') && !tradesAutoRefresh) {
        if(el.dataset.tab2==='statev2')loadV5StructureLive();
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
let wavePriceTf = '3m';
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
function waveV5TradeSpans(trades,endTs){
 return (trades||[]).filter(t=>t&&['V52_PAPER','V493_PAPER'].includes(t.source)&&
   Number.isSafeInteger(Number(t.trade))&&Number(t.trade)>0&&
   Number.isFinite(Number(t.entryTs))&&Number(t.entryTs)>0&&
   (t.exitTs===null||t.exitTs===undefined||
     Number(t.exitTs)>=Number(t.entryTs)))
 .map(t=>({source:t.source,trade:Number(t.trade),entryTs:Number(t.entryTs),
   drawEndTs:t.exitTs===null||t.exitTs===undefined?Number(endTs):Number(t.exitTs),
   exitTs:t.exitTs===null||t.exitTs===undefined?null:Number(t.exitTs),
   entryPrice:Number(t.entryPrice),policyVersion:t.policyVersion||null,
   exitPrice:t.exitPrice===null||t.exitPrice===undefined?null:Number(t.exitPrice),
   netPnlUsd:t.netPnlUsd===null||t.netPnlUsd===undefined?null:Number(t.netPnlUsd),
   exitReason:t.exitReason||null,direction:t.direction,open:!!t.open}));
}
function wavePaperPaintColor(z){
 // Reserved, non-overlapping 10px track per PAPER engine on all three graphs.
 return z.source==='V493_PAPER'?
   {fill:'#87cde9',line:'rgba(25,105,160,.83)',lane:'top'}:
   {fill:'#e98bc2',line:'rgba(156,31,111,.86)',lane:'bottom'};
}
function wavePaintV5Bands(canvas,zones,t0,t1,padding){
 // Price and both MCB Waves: two 10px tracks, NEVER full-height shading.
 // Uses the rendered canvas' CSS coordinate box, independent from its DPR.
 if(!canvas||!zones||!zones.length)return[];
 const box=canvas.getBoundingClientRect();
 if(!box.width||!box.height)return[];
 const ratio=canvas.width/box.width,ctx=canvas.getContext('2d');
 const L=padding.left,W=box.width-padding.left-padding.right;
 const top=padding.top,h=box.height-padding.top-padding.bottom;
 if(W<=0||h<=0)return[];
 const laneH=Math.min(10,h/2),map=ts=>L+(ts-t0)/Math.max(1,t1-t0)*W;
 const hit=[];
 ctx.save();ctx.setTransform(ratio,0,0,ratio,0,0);
 ctx.beginPath();ctx.rect(L,top,W,h);ctx.clip();
 zones.forEach(function(z){
   const left=Math.max(t0,z.entryTs),right=Math.min(t1,z.drawEndTs);
   if(right<=left||z.entryTs>t1||z.drawEndTs<t0)return;
   const x1=map(left),x2=map(right),width=Math.max(1,x2-x1);
   const color=wavePaperPaintColor(z);
   const y=color.lane==='top'?top:top+h-laneH;
   ctx.fillStyle=color.fill;
   ctx.fillRect(x1,y,width,laneH);
   // Only the REAL entry/exit times get a thin full-height marker:
   // a trade continuing into the viewport must not invent an entry line.
   ctx.strokeStyle=color.line;ctx.lineWidth=.65;
   ctx.beginPath();
   if(z.entryTs>=t0&&z.entryTs<=t1){
     const xx=map(z.entryTs)+.35;
     ctx.moveTo(xx,top);ctx.lineTo(xx,top+h);
   }
   if(z.exitTs!==null&&z.exitTs!==undefined&&z.exitTs>=t0&&z.exitTs<=t1){
     const xx=map(z.exitTs)-.35;
     ctx.moveTo(xx,top);ctx.lineTo(xx,top+h);
   }
   ctx.stroke();
   // Tapping the upper/lower track uniquely selects V4.9.3/V5, even
   // when their time intervals overlap. Visual height stays exactly 10px.
   const pad=Math.max(0,(12-width)/2);
   hit.push({x1,x2,hitX1:x1-pad,hitX2:x2+pad,
     y1:Math.max(top,y-4),y2:Math.min(top+h,y+laneH+4),
     laneY:y,laneHeight:laneH,trade:z,source:z.source});
 });
 ctx.restore();
 return hit;
}
function wavePaintLegacyTradeLines(canvas,zones,t0,t1,padding){
 // Optional archived V4 entries/exits: neutral markers only, no third band.
 if(!canvas||!zones||!zones.length)return[];
 const box=canvas.getBoundingClientRect();
 if(!box.width||!box.height)return[];
 const ratio=canvas.width/box.width,ctx=canvas.getContext('2d');
 const L=padding.left,W=box.width-padding.left-padding.right;
 const top=padding.top,h=box.height-padding.top-padding.bottom;
 const map=ts=>L+(ts-t0)/Math.max(1,t1-t0)*W,hits=[];
 ctx.save();ctx.setTransform(ratio,0,0,ratio,0,0);
 ctx.beginPath();ctx.rect(L,top,W,h);ctx.clip();
 ctx.strokeStyle='rgba(110,124,136,.62)';ctx.lineWidth=.6;
 zones.forEach(function(z){
   for(const ts of [z.entryTs,z.exitTs]){
     if(ts===null||ts===undefined||ts<t0||ts>t1)continue;
     const x=map(ts);
     ctx.beginPath();ctx.moveTo(x+.3,top);ctx.lineTo(x+.3,top+h);ctx.stroke();
     hits.push({x1:x,x2:x,hitX1:x-3,hitX2:x+3,
       y1:top,y2:top+h,trade:z});
   }
 });
 ctx.restore();
 return hits;
}
function waveSelectedTradeSpan() {
  if(waveSelectedTradeId===null||!waveReplayData||!waveReplayData.frames||!waveReplayData.frames.length)return null;
  const endTs=Number(waveReplayData.frames[waveReplayData.frames.length-1].ts);
  if(String(waveSelectedTradeId).startsWith('V52:')||
     String(waveSelectedTradeId).startsWith('V493:')){
    return waveV5TradeSpans(waveReplayData.v5PaperTrades||[],endTs)
      .find(function(z){const prefix=z.source==='V52_PAPER'?'V52:':'V493:';
        return prefix+z.trade===String(waveSelectedTradeId);})||null;
  }
  return waveTradeSpans(waveReplayData.events||[],endTs)
    .find(function(z){return String(z.trade)===String(waveSelectedTradeId);})||null;
}
function waveRenderTradePanel() {
  const el=document.getElementById('waveTradePanel'); if(!el)return;
  const t=waveSelectedTradeSpan();
  if(!t){
    el.innerHTML='<span class="muted">Simulations comparées · <b style="color:#1969a0">bleu V4.9.4</b> · <b style="color:#9c1f6f">rose V5.4.3 / archives V5.2–V5.4.2</b>. Toucher la bande supérieure V4.9.3 ou inférieure V5 pour lire le trade.</span>';
    return;
  }
  if(t.source==='V52_PAPER'||t.source==='V493_PAPER'){
    const end=t.exitTs?'Sortie '+waveParis(t.exitTs)+' @ '+waveNum(t.exitPrice,1):
      'POSITION OUVERTE · bande prolongée jusqu’au LIVE';
    const pnl=t.netPnlUsd===null?'—':(t.netPnlUsd>=0?'+':'')+waveNum(t.netPnlUsd,2)+' $';
    el.innerHTML='<span class="info"><span class="head" style="color:'+(t.source==='V52_PAPER'?'#9c1f6f':'#1969a0')+'">'+
      paperTradeVersion(t.source==='V52_PAPER'?'v52':'v493',t)+' PAPER #'+
      escTrade(t.trade)+' · '+escTrade(String(t.direction||'').toUpperCase())+'</span>'+
      'Entrée '+waveParis(t.entryTs)+' @ '+waveNum(t.entryPrice,1)+' · '+end+
      ' · PNL net '+pnl+' · '+escTrade(t.exitReason||'paper simulé')+
      '</span><button id="waveTradeReportBtn" class="wave-trade-report-btn" type="button">RAPPORT</button>';
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
// Resolve the policy that ACTUALLY opened a trade, not the current ledger
// version. Old V5/V493 trades keep their historical names in every report.
function paperTradeVersion(kind,trade){
 const policy=String(trade?.entryPolicyVersion||trade?.policyVersion||
   trade?.engine||'').toLowerCase();
 const found=policy.match(/v([0-9]+(?:[.][0-9]+){1,2})/);
 if(kind==='v493')return found?'V'+found[1]:'V4.9.4';
 return found?'V'+found[1]:'V5.2';
}
// Dedicated PAPER reports: no false V4 report for V5.2 / V4.9.3.
function renderPaperTradeReport(data){
 const t=data.trade||{},v52=data.engine==='v52',
  engine=paperTradeVersion(data.engine,t);
 const n=(x,d=1)=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':Number(x).toFixed(d);
 const signed=x=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':
    (Number(x)>0?'+':'')+Number(x).toFixed(2);
 const safe=x=>escTrade(String(x===null||x===undefined?'—':x));
 const date=x=>x?waveParis(Number(x)):'—';
 const ec=t.entryContext||{},m=ec.mcb15||{},g=ec.geometry||{},cv=ec.conversion||{},
  place=ec.place||{},economy=ec.economics||{},mat=ec.maturity||{},
  lineage=ec.causalChain||{};
 const open=data.status==='OPEN',last=open?t.lastPrice:t.exitPrice;
 const mfe=open?(t.mfePriceUsd??t.metrics?.mfeUsd):t.mfePriceUsd;
 const mae=open?(t.maePriceUsd??t.metrics?.maeUsd):t.maePriceUsd;
 const pnl=open?t.lastNetPnlUsd:t.netPnlUsd;
 const value=(label,text)=>'<div class="v5-row"><b>'+label+'</b> '+text+'</div>';
 const title='<div class="v52-primary" style="margin-bottom:5px;">'+
  '<b style="color:'+(v52?'#9c1f6f':'#1969a0')+'">'+engine+' PAPER #'+
  safe(data.tradeNo)+' · '+safe(String(t.direction||'').toUpperCase())+'</b>'+
  (open?' · POSITION OUVERTE':' · CLÔTURÉ')+'</div>';
 let html=title+
  '<div class="v52-grid">'+
   '<div class="v52-cell"><div class="title">ENTRÉE</div>'+
    '<div class="value">'+n(t.entryPrice)+' $ BTC</div>'+date(t.entryAt)+'</div>'+
   '<div class="v52-cell"><div class="title">'+(open?'PRIX OBSERVÉ':'SORTIE')+'</div>'+
    '<div class="value">'+n(last)+' $ BTC</div>'+date(t.exitAt)+'</div>'+
   '<div class="v52-cell"><div class="title">P&L NET '+(open?'ESTIMÉ':'RÉALISÉ')+'</div>'+
    '<div class="value" style="color:'+(Number(pnl)>=0?'#087245':'#ae2639')+'">'+signed(pnl)+' $</div>'+
    'Frais '+n(t.feesUsd,2)+' $</div>'+
   '<div class="v52-cell"><div class="title">EXCURSIONS DU PRIX</div>'+
    '<div class="value">MFE +'+n(mfe)+' $</div>MAE −'+n(mae)+' $</div>'+
  '</div>';
 html+=value('MOTIF ENTRÉE ·',safe(ec.phase||t.entryReason||t.entryHypothesis||'—')+
  (ec.prognosis?' · '+safe(ec.prognosis):''));
 if(v52&&Object.keys(ec).length){
  html+=value('PHASE À L’ENTRÉE ·','Trajectoire 15m '+safe(m.trajectory)+
   ' · LBW15 '+n(m.lbw)+' · extrême 45m '+n(m.extreme45m)+
   ' · 1h '+safe(m.context1h)+' · 4h '+safe(m.context4h)+
   ' · pivot structurel confirmé au plus tôt '+date(m.structuralAvailableAt));
  html+=value('TRANSITION GÉOMÉTRIQUE ·','BW/LBW3 '+
   safe(g.cross3?.direction)+' observé '+date(g.cross3?.ts)+
   ' · pente '+n(g.cross3?.slopePerMinute)+
   (g.cross15?.ts?' · BW/LBW15 '+safe(g.cross15.direction)+
    ' '+date(g.cross15.ts):''));
  html+=value('LIEU / INVALIDATION ·',safe(place.nearest?.key)+
    ' '+n(place.nearest?.price)+' $'+
    ' · invalidation initiale '+n(t.entryInvalidation||t.invalidationPrice)+
    ' $'+(economy.spaceVsStop?' · espace/risque '+n(economy.spaceVsStop)+'×':''));
  if(Object.keys(mat).length)html+=value('MATURITÉ CAUSALE ·',
    safe(mat.phase)+' · '+safe(mat.maturity)+' · croisement '+n(mat.cross3AgeMin)+' min'+
    ' · déplacement '+n(mat.priceAdvanceSinceCrossUsd)+' $ / '+
    n(mat.progressInTypical3mRanges)+'× range 3m'+
    (mat.incrementalRateSlowing?' · conversion marginale ralentie':''));
  if(Object.keys(lineage).length)html+=value('CHAÎNE CAUSALE ·','Campagne '+safe(lineage.campaignId)+
    ' · BW/LBW3 '+date(lineage.cross3?.observedAt)+' / E3 natif lié '+
    (lineage.e3Native?.relatedToCross?'oui':'non')+
    ' · terrain '+safe(lineage.locationAnchor?.key||'non reconnu')+
    ' connu '+date(lineage.locationAnchor?.availableAt));
  if(ec.invalidation)html+=value('PREUVE DE L’INVALIDATION ·',
    safe(ec.invalidation.kind)+' · '+safe(ec.invalidation.reference)+
    ' · niveau '+n(ec.invalidation.underlyingLevel)+' $'+
    ' · stop '+n(ec.invalidation.price)+' $'+
    ' · connaissable à '+date(ec.invalidation.confirmedAvailableAt));
  html+=value('CONVERSION MESURÉE À L’ENTRÉE ·','PM Bâton '+n(cv.pmLastBaton)+
    ' $ · depuis Bâton '+n(cv.pmSinceBaton)+' $ · PM3 '+n(cv.pm3)+
    ' $ · PM5 '+n(cv.pm5)+' $ · ΔMF3 '+n(cv.mf3Delta3m));
 }
 html+=value('SORTIE / PROTECTION ·',open?
  'Position active, surveillée à chaque prix observé.':safe(t.exitReason)+
  (String(t.exitReason||'').startsWith('GAIN_FLOOR')?
    ' · plancher économique déclenché sur retour du MFE, distinct d’une invalidation de trajectoire.':''));
 if(!open&&String(t.exitReason||'').startsWith('GAIN_FLOOR')){
   const floor=Number(t.mfePriceUsd)>=220?180:Number(t.mfePriceUsd)>=120?90:null;
   const captured=Number(t.entryPrice)>0&&Number(t.mfePriceUsd)>0&&Number.isFinite(Number(t.exitPrice))?
     (Number(t.exitPrice)-Number(t.entryPrice))*(t.direction==='long'?1:-1)/Number(t.mfePriceUsd)*100:null;
   html+=value('PLANCHER ACTIF ·',
      (floor!==null?'Protection du déplacement BTC à +'+n(floor)+' $':'Seuil non déterminé')+
      ' · capturé '+n(captured)+' % du MFE prix');
 }
 if(!open&&data.exitEvidence){
   const ex=data.exitEvidence,econv=ex.conversion||{},eplace=ex.place||{};
   html+=value('ÉTAT À L’INSTANT DE SORTIE ·',
     'Décision structurelle '+safe(ex.action||'—')+
     ' · phase '+safe(ex.phase||'—')+
     ' · événement PAPER '+safe(ex.tradeEvent?.type||'—')+
     ' · '+safe(ex.tradeEvent?.reason||t.exitReason||'—'));
   if(v52)html+=value('CONVERSION À LA SORTIE ·','PM3 '+n(econv.pm3)+
     ' $ · PM5 '+n(econv.pm5)+' $ · PM depuis Bâton '+n(econv.pmSinceBaton)+
     ' $ · ΔMF15 '+n(econv.mf15Delta10m)+
     ' · frontière '+safe(eplace.nearest?.key));
 }
 if(!open&&Array.isArray(data.postExit)&&data.postExit.length){
  html+='<div class="v52-ledger"><b>APRÈS LA SORTIE · OBSERVATIONS RÉTROSPECTIVES</b>'+
    '<div class="v52-muted">Ces prix ne constituaient pas des informations disponibles pour décider la sortie.</div>';
  for(const x of data.postExit){
   html+=value('+'+Number(x.minutes)+' MIN ·',x.status==='OBSERVED'?
    'BTC '+n(x.price)+' $ · depuis sortie '+signed(x.fromExitUsd)+
    ' $ BTC · pic favorable '+n(x.maxFavourableFromExitUsd)+' $ · retour adverse '+
    n(x.maxAdverseFromExitUsd)+' $':
    x.status==='PENDING'?'Horizon pas encore atteint':'Données historiques indisponibles');
  }
  html+='</div>';
 }
 html+='<div class="v52-muted">Simulateur PAPER indépendant · notionnel 1 500 $ ·'+
  ' frais modélisés, funding et slippage non modélisés · aucune exécution financée.</div>';
 return html;
}
async function waveOpenTradeReport(tradeNo) {
  const ov=document.getElementById('waveTradeOverlay');
  const title=document.getElementById('waveTradeOverlayTitle');
  const body=document.getElementById('waveTradeOverlayBody');
  if(!ov||!title||!body)return;
  // The overlay must be visible from Historique too, outside the hidden Vagues tab.
  if(ov.parentNode!==document.body)document.body.appendChild(ov);
  ov.classList.add('open');
  ov.setAttribute('aria-hidden','false');
  title.textContent='#'+tradeNo+' · chargement du rapport…';
  body.innerHTML='<div class="wave-report-loading">Chargement du rapport complet depuis Amsterdam…</div>';
  try{
    const paper=String(tradeNo).match(/^(V52|V493):(\\d+)$/);
    if(paper){
      const kind=paper[1]==='V52'?'v52':'v493',number=Number(paper[2]);
      const res=await fetch('/api/paper-trade-report/'+kind+'/'+number,{cache:'no-store'});
      if(!res.ok)throw Error('HTTP '+res.status);
      const report=await res.json();
      title.textContent=paperTradeVersion(kind,report.trade)+' PAPER #'+number+
        ' · '+String(report.trade?.direction||'').toUpperCase()+
        (report.status==='OPEN'?' · EN POSITION':' · RAPPORT COMPLET');
      body.innerHTML=renderPaperTradeReport(report);
      return;
    }
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
  const hits=(canvas._waveTradeZones||[]).filter(function(z){
    const x1=z.hitX1??z.x1,x2=z.hitX2??z.x2;
    return x>=x1&&x<=x2&&y>=z.y1&&y<=z.y2;
  });
  const zone=hits.find(z=>z.source==='V52_PAPER')||hits.find(z=>z.source==='V493_PAPER')||hits[0];
  if(!zone)return false;
  waveSelectedTradeId=zone.source==='V52_PAPER'?'V52:'+zone.trade.trade:zone.source==='V493_PAPER'?'V493:'+zone.trade.trade:String(zone.trade.trade);
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

function waveDrawFixedYAxis(key,yLimit,H,T,B,guides) {
  const id=key==='wave15'?'wave15YAxis':'wave3YAxis';
  const axis=document.getElementById(id);
  if(!axis)return;
  axis.style.height=H+'px';
  const h=H-T-B;
  const y=function(v){return T+(yLimit-Math.max(-yLimit,Math.min(yLimit,Number(v))))/(2*yLimit)*h;};
  axis.innerHTML=(guides||[]).map(function(v){
    const cls='wave-y-tick'+(Math.abs(v)===60?' threshold':'')+(v===0?' zero':'');
    return '<span class="'+cls+'" style="top:'+y(v).toFixed(1)+'px">'+escTrade(String(v))+'</span>';
  }).join('');
}

function waveDrawPriceYAxis(result,H) {
  const axis=document.getElementById('wavePriceYAxis');
  if(!axis||!result||!result.bounds)return;
  axis.style.height=H+'px';
  const b=result.bounds,p=result.padding,plotH=result.plotHeight;
  const step=200,out=[];
  const first=Math.ceil(b.lo/step)*step;
  for(let v=first;v<=b.hi+1e-9;v+=step){
    const rel=(b.hi-v)/Math.max(1e-9,b.hi-b.lo);
    const y=p.top+plotH*rel;
    out.push('<span class="wave-price-axis-mark major" style="top:'+y.toFixed(1)+'px"><i class="wave-price-axis-bar"></i><b class="wave-price-axis-label">'+Math.round(v).toLocaleString('fr-FR')+'</b></span>');
  }
  axis.innerHTML=out.join('');
}
// A LIVE quote is never derived from the archived V4.10.10 snapshot or
// a candle's historical close. Browser OKX WS wins; current V5.4 follows.
function waveCurrentMarketQuote(){
 if(waveReplayMode!=='live')return null;
 if(v3UiFreshQuote(v3UiPrice))
   return {price:Number(v3UiPrice.price),ts:Number(v3UiPrice.ts),
     source:v3UiPrice.source==='OKX_WS'?'OKX trade WS':'V5.4 server',
     status:'LIVE'};
 const q=waveReplayData?.liveState||{};
 const ts=Number(q.ts),price=Number(q.price),age=Date.now()-ts;
 if(q.price!==null&&Number.isFinite(price)&&price>0&&
    q.ts!==null&&Number.isFinite(ts)&&ts>0&&
    age>=-3000&&age<=(q.source==='V54_PAPER_PRICE'?25000:65000)&&
    ['V54_PAPER_PRICE','MCB_AUDIT_PRICE'].includes(q.source)){
   return {price,ts,source:q.source==='V54_PAPER_PRICE'?
     'V5.4 server':'MCB Audit ~30s',
     status:q.source==='V54_PAPER_PRICE'?'LIVE':'RELEVÉ'};
 }
 return null;
}
let wavePriceRedrawTimer=null;
function waveSchedulePriceRedraw(){
 if(wavePriceRedrawTimer||document.hidden||waveReplayMode!=='live'||
    !waveReplayData?.frames?.length)return;
 const panel=document.getElementById('tab2-waves');
 if(!panel||!panel.classList.contains('active'))return;
 wavePriceRedrawTimer=setTimeout(function(){
   wavePriceRedrawTimer=null;
   if(waveReplayMode!=='live'||document.hidden||!waveReplayData?.frames?.length)return;
   const quote=waveCurrentMarketQuote(),el=document.getElementById('waveReplayPriceLiveValue');
   if(el)el.textContent=quote?'BTC '+waveNum(quote.price,1):'BTC —';
   drawWavePrice(document.getElementById('wavePriceCanvas'),waveReplayIndex);
 },350); // redraw price layer only, not both oscillator canvases
}
function drawWavePrice(canvas,idx) {
  if(!canvas||!waveReplayData||!waveReplayData.frames||!waveReplayData.frames.length||!window.BoonoCharts)return;
  const frames=waveReplayData.frames,t0=Number(frames[0].ts),t1=Number(frames[frames.length-1].ts);
  const series=waveReplayData.priceSeries&&waveReplayData.priceSeries[wavePriceTf]||[];
  const endTs=t1,spans=waveReplayData.showLegacyV4?waveTradeSpans(waveReplayData.events||[],endTs):[];
  const v5Spans=waveV5TradeSpans(waveReplayData.v5PaperTrades||[],endTs);
  const sc=document.getElementById('wavePriceScroll');
  let boundsT0=t0,boundsT1=t1;
  if(sc&&sc.scrollWidth>sc.clientWidth+2){
    const leftRel=Math.max(0,Math.min(1,sc.scrollLeft/Math.max(1,sc.scrollWidth)));
    const rightRel=Math.max(0,Math.min(1,(sc.scrollLeft+sc.clientWidth)/Math.max(1,sc.scrollWidth)));
    boundsT0=t0+leftRel*(t1-t0);
    boundsT1=t0+rightRel*(t1-t0);
    if(waveLiveFollow&&sc.scrollLeft<2){
      boundsT1=t1;boundsT0=Math.max(t0,t1-waveVisibleWindowHours()*3600000);
    }
  }else if(waveLiveFollow){
    boundsT1=t1;boundsT0=Math.max(t0,t1-waveVisibleWindowHours()*3600000);
  }
  const result=window.BoonoCharts.drawPrice(canvas,series,{
    theme:'interface',t0,t1,boundsT0,boundsT1,candleMs:wavePriceTf==='3m'?180000:900000,
    cursorTs:frames[idx]&&frames[idx].ts,tradeSpans:[],
    padding:{left:36,right:9,top:12,bottom:18},maxBodyWidth:wavePriceTf==='3m'?8:14,
    pricePadPct:.035,minPriceSpan:500,priceSnap:50,
    priceGridMinor:100,priceGridMajor:200,hourGrid:true,
    maAbove:'#1f9d55',maBelow:'#d33'
  });
  // Do not ask the shared candle renderer for tinted full-height trade
  // zones; paint the two engine tracks afterward, keeping original candles.
  const pricePadding=result&&result.padding||{left:36,right:9,top:12,bottom:18};
  canvas._waveTradeZones=wavePaintV5Bands(canvas,v5Spans,t0,t1,pricePadding)
    .concat(wavePaintLegacyTradeLines(canvas,spans,t0,t1,pricePadding));

  const quote=waveCurrentMarketQuote();
  const livePrice=quote?.price??null;

  if(result&&Number.isFinite(livePrice)){
    const box=canvas.getBoundingClientRect();
    const ratio=box.width>0?canvas.width/box.width:1;
    const ctx=canvas.getContext('2d');
    const b=result.bounds,p=result.padding;
    const y=p.top+(b.hi-livePrice)/Math.max(1e-9,b.hi-b.lo)*result.plotHeight;
    {
      // Show an edge arrow when a fresh quote temporarily exceeds the
      // current candle range. Do not leave an old line stranded mid-chart.
      const outsideHigh=y<p.top,outsideLow=y>p.top+result.plotHeight;
      const plotY=Math.max(p.top+1,Math.min(p.top+result.plotHeight-1,y));
      ctx.save();
      ctx.setTransform(ratio,0,0,ratio,0,0);
      ctx.strokeStyle='#2f80ed';
      ctx.lineWidth=.8;
      ctx.setLineDash([4,4]);
      ctx.beginPath();
      ctx.moveTo(p.left,plotY);
      ctx.lineTo(p.left+result.plotWidth,plotY);
      ctx.stroke();
      ctx.setLineDash([]);
      const label=(outsideHigh?'↑ ':outsideLow?'↓ ':'')+
        (quote?.status||'LIVE')+' '+waveNum(livePrice,1);
      const visibleCenter=sc&&sc.clientWidth
        ?Math.max(p.left+45,Math.min(p.left+result.plotWidth-45,sc.scrollLeft+sc.clientWidth/2))
        :p.left+result.plotWidth/2;
      ctx.font="800 10px 'SF Mono', Menlo, Consolas, monospace";
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.lineJoin='round';
      ctx.strokeStyle='rgba(255,255,255,.96)';
      ctx.lineWidth=4;
      ctx.strokeText(label,visibleCenter,plotY);
      ctx.fillStyle='#2f80ed';
      ctx.fillText(label,visibleCenter,plotY);
      ctx.restore();
    }
  }

  const title=document.getElementById('wavePriceTitle');
  if(title)title.textContent='PRIX BTCUSDT · '+wavePriceTf;
  const liveHead=document.getElementById('wavePriceLiveHead');
  if(liveHead){
    liveHead.textContent=livePrice!==null?
      (quote?.status||'LIVE')+' '+waveNum(livePrice,1):
      'LIVE — · prix indisponible';
    liveHead.title=quote?
      quote.source+' · relevé '+waveParis(quote.ts):
      'Aucun prix suffisamment récent ; aucune ancienne cotation présentée comme LIVE';
  }
  const b3=document.getElementById('wavePrice3m'),b15=document.getElementById('wavePrice15m');
  if(b3)b3.classList.toggle('active',wavePriceTf==='3m');
  if(b15)b15.classList.toggle('active',wavePriceTf==='15m');
  if(result)waveDrawPriceYAxis(result,canvas.getBoundingClientRect().height);
}
function waveSetPriceTf(tf){
  if(tf!=='3m'&&tf!=='15m')return;
  wavePriceTf=tf;
  renderWaveReplay();
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
  waveDrawFixedYAxis(key,yLimit,H,T,B,guides);
  guides.forEach(function(v) {
    const yy=y(v),threshold=Math.abs(v)===60;
    ctx.save();
    ctx.strokeStyle = v === 0 ? '#2f80ed' : (threshold ? '#b8b8b8' : '#ececec');
    ctx.lineWidth = v === 0 ? 2 : (threshold ? 1.1 : .75);
    if (v !== 0) ctx.setLineDash(threshold?[5,4]:[2,5]);
    ctx.beginPath(); ctx.moveTo(L,yy); ctx.lineTo(L+w,yy); ctx.stroke();
    ctx.restore();
    ctx.fillStyle=threshold?'#555':'#888';
    ctx.font=(threshold?"700 ":"")+"9px 'SF Mono', Menlo, Consolas, monospace";
    ctx.textAlign='right';ctx.fillText(String(v),L-5,yy+3);
  });

  // No full-height position shading: trade lanes are drawn after MCB lines.
  canvas._waveTradeZones=[];
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

    // Souligner la plage Money Flow sans recouvrir la ligne zéro bleue :
    // seule la frontière MF reçoit un fin contour noir.
    ctx.save();
    ctx.strokeStyle='rgba(0,0,0,.78)';
    ctx.lineWidth=.7;
    ctx.lineJoin='round';
    ctx.lineCap='round';
    ctx.beginPath();
    waveSmoothPath(ctx,mfPts,T,T+h,true,false);
    ctx.stroke();
    ctx.restore();
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
      ctx.lineWidth=d.kind==='MULTIDIV'?1.35:1.05;
      ctx.setLineDash(d.kind==='CONTINUATION'?[5,3]:
        d.subtype==='STRUCTURAL_E15_WEAK_LBW_CANDIDATE'||
        (d.kind==='MULTIDIV'&&d.status==='FORMING')?[4,4]:[]);
      ctx.globalAlpha=d.subtype==='STRUCTURAL_E15_WEAK_LBW_CANDIDATE'?.72:
        d.status==='FORMING'?0.82:0.95;
      const aLbw=key==='wave3'&&Number.isFinite(Number(a.oscExtremeLbw))?Number(a.oscExtremeLbw):Number(a.lbw);
      const nodes=d.kind==='MULTIDIV'&&Array.isArray(d.points)&&d.points.length?
        [a,...d.points]:[a,b];
      ctx.beginPath();
      let drawn=0;
      nodes.forEach(function(p){
        const ts=Number(p.drawTs??p.extremeTs??p.confirmedAt);
        const lbw=Number(p.lbw);
        if(!Number.isFinite(ts)||!Number.isFinite(lbw))return;
        const x=tx(ts),yy=y(lbw);
        if(!drawn)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);
        drawn++;
      });
      if(drawn>=2)ctx.stroke();
      if(d.kind==='MULTIDIV')nodes.forEach(function(p){
        const ts=Number(p.drawTs??p.extremeTs??p.confirmedAt);
        if(!Number.isFinite(ts)||ts<t0||ts>t1)return;
        const x=tx(ts),yy=y(Number(p.lbw));
        ctx.beginPath();ctx.arc(x,yy,1.8,0,Math.PI*2);ctx.fillStyle=ctx.strokeStyle;ctx.fill();
      });
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
      if(key==='wave15'&&!e.provisional&&Number.isFinite(Number(e.confirmedObservedAt))&&
         Number(e.confirmedObservedAt)>Number(e.ts)&&Number(e.confirmedObservedAt)<=t1){
        ctx.beginPath();
        ctx.strokeStyle=e.type==='UP'?'rgba(31,157,85,.45)':'rgba(204,45,55,.45)';
        ctx.lineWidth=.6;ctx.setLineDash([2,2]);
        ctx.moveTo(tx(e.ts),y(e.value));ctx.lineTo(tx(e.confirmedObservedAt),y(e.value));
        ctx.stroke();ctx.setLineDash([]);
        ctx.beginPath();ctx.arc(tx(e.confirmedObservedAt),y(e.value),2.7,0,Math.PI*2);
        ctx.strokeStyle=e.type==='UP'?'#1f9d55':'#d33';ctx.lineWidth=.9;ctx.stroke();
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

  // Fixed 10px PAPER tracks (V4.9.3 at top / V5 at bottom) and genuine
  // entry/exit markers. Paint LAST so neither MCB curves nor MF obscure them.
  const lanePadding={left:L,right:R,top:T,bottom:B};
  canvas._waveTradeZones=wavePaintV5Bands(canvas,
    waveV5TradeSpans(waveReplayData.v5PaperTrades||[],t1),t0,t1,lanePadding)
    .concat(wavePaintLegacyTradeLines(canvas,
      waveReplayData.showLegacyV4?waveTradeSpans(waveReplayData.events||[],t1):[],
      t0,t1,lanePadding));
}
function renderWaveReplay() {
  if (!waveReplayData || !waveReplayData.frames.length) return;
  waveReplayIndex = Math.max(0, Math.min(waveReplayData.frames.length-1, waveReplayIndex));
  const f = waveReplayData.frames[waveReplayIndex], s=(waveReplayMode==='live'&&waveReplayData.liveState)?waveReplayData.liveState:(f.state||{}), p=s.position||null;
  const st = s.thesis||{}, m15=s.mcb15||{}, m3=s.mcb3||{}, pm=s.pm||{}, tk=s.ticker||{}, ac=s.action||{};
  const bg=s.background||{}, setup=s.setup||{}, sr=s.structuralRoom||{}, mq=s.marketQuality||{}, epm=s.entryPm||{}, etk=s.entryTicker||{}, ns=s.nativeSignal||{}, mft=s.mfTemporal||{};
  const w15=f.wave15||{}, conf=w15.confirmed||{}, w3=f.wave3||{}, au=f.audit||{};
  const flow = au.volumeFenetreBtc!==null&&au.winSec ? Number(au.volumeFenetreBtc)/Number(au.winSec) : null;
  const posMain=p ? String(p.direction).toUpperCase() + ' @ ' + waveNum(p.entryPrice,1) : 'FLAT';
  const posSub=p&&p.metrics ? 'MFE ' + waveNum(p.metrics.mfeUsd,1) + ' · MAE ' + waveNum(p.metrics.maeUsd,1) + (p.metrics.currentPnlUsd!==null&&p.metrics.currentPnlUsd!==undefined?' · PNL '+(Number(p.metrics.currentPnlUsd)>=0?'+':'')+waveNum(p.metrics.currentPnlUsd,2)+' $':'') : '';
  const engineShort=s.version ? String(s.version).split('-')[0].toUpperCase() : 'V4.5';

  let liveLeft='',liveRight='';
  const quote=waveReplayMode==='live'?waveCurrentMarketQuote():null;
  const displayTs=waveReplayMode==='live'?(quote?.ts??s.ts??f.ts):f.ts;
  const displayPrice=waveReplayMode==='live'?(quote?.price??null):f.price;
  liveLeft+=waveRow('HEURE',waveParis(displayTs),(waveReplayMode==='live'?'LIVE':'REPLAY')+' · frame '+(waveReplayIndex+1)+' / '+waveReplayData.frames.length);
  liveLeft+=waveRow('POSITION',posMain,posSub);
  liveLeft+=waveRow('SETUP',setup.status||'—',setup.direction||setup.candidateDirection||'');
  liveRight+=waveRow('PRIX','<span id="waveReplayPriceLiveValue">BTC '+
    (displayPrice===null?'—':waveNum(displayPrice,1))+'</span>',
    waveReplayMode==='live'?(quote?quote.source:'Flux Live indisponible'):
      'BTC-USDT-SWAP · REPLAY');
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
  mcb+=waveRow('MF MÉMOIRE',mft.state||'—',
    (mft.memoryDirection?'fond '+String(mft.memoryDirection).toUpperCase()+' '+String(mft.memoryHorizon||''):'fond —')+
    (mft.tacticalDirection?' · 30m '+String(mft.tacticalDirection).toUpperCase():'')+
    (mft.candidateContext&&mft.candidateContext.state?' · '+mft.candidateContext.state:''));
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

  const timeEl=document.getElementById('waveReplayTime'); if(timeEl)timeEl.textContent=waveParis(f.ts);
  const ev=nearestWaveEvents(f.ts),eventEl=document.getElementById('waveReplayEvent');
  if(eventEl)eventEl.textContent=ev.length ? ev.map(function(e){return e.label+' · '+String(e.direction||'').toUpperCase()+' @ '+waveNum(e.price,1);}).join(' | ') : '';
  const slider=document.getElementById('waveSlider'); if(slider)slider.value=String(waveReplayIndex);
  drawWavePrice(document.getElementById('wavePriceCanvas'),waveReplayIndex);
  drawWaveBand(document.getElementById('wave15Canvas'),'wave15',waveReplayIndex);
  drawWaveBand(document.getElementById('wave3Canvas'),'wave3',waveReplayIndex);
  const flowAudit=document.getElementById('waveFlowAudit');
  if(flowAudit)flowAudit.innerHTML='<span class="wave-flow-text"><b>FLOW / AUDIT</b> · PM '+waveNum(au.priceMove,1)+' · cadence '+waveNum(au.cadence,1)+' · flow '+waveNum(flow,2)+' BTC/s · MF15 pente '+waveNum(au.mf15Pente,2)+' · MF15 Live '+waveNum(w15.mf,2)+'</span><button id="waveFlowAliveBtn" class="wave-flow-vivant" type="button">VIVANT</button>';
  waveRenderTradePanel();
  waveUpdateHistoryStatus();
}
const waveInfoContent={
  price:{
    title:'PRIX BTCUSDT',
    html:'<div class="wave-info-row"><b>Bougies</b> · noir / gris / blanc</div>'+
      '<div class="wave-info-row"><b>MA200</b> · verte quand le prix est au-dessus, rouge quand il est au-dessous</div>'+
      '<div class="wave-info-row"><b>LIVE</b> · ligne horizontale bleue pointillée = dernier prix</div>'+
      '<div class="wave-info-row"><b>Plages bleues</b> · trade ; lignes verticales = entrée / sortie</div>'
  },
  wave15:{
    title:'VAGUE 15m',
    html:'<div class="wave-info-row"><b>BW</b> noir · <b>LBW</b> noir fin · <b>MF</b> gris bordé · <b>VWAP</b> jaune</div>'+
      '<div class="wave-info-row"><b>UP</b> vert · <b>DN</b> rouge · <b>DIV</b> vert/rouge</div>'+
      '<div class="wave-info-row"><b>0 MCB</b> · ligne bleue</div>'+
      '<div class="wave-info-row"><b>Plages bleues</b> · trade ; lignes verticales = entrée / sortie</div>'
  },
  wave3:{
    title:'VAGUE 3m',
    html:'<div class="wave-info-row">Même code visuel que la Vague 15m, à vitesse tactique 3m.</div>'+
      '<div class="wave-info-row"><b>Curseur</b> et axe temporel synchronisés avec PRIX et Wave15.</div>'+
      '<div class="wave-info-row"><b>UP</b> vert · <b>DN</b> rouge · <b>0 MCB</b> ligne bleue</div>'+
      '<div class="wave-info-row"><b>Plages bleues</b> · trade ; lignes verticales = entrée / sortie</div>'
  }
};
function waveOpenInfo(kind){
  const cfg=waveInfoContent[kind];if(!cfg)return;
  const ov=document.getElementById('waveInfoOverlay'),title=document.getElementById('waveInfoTitle'),body=document.getElementById('waveInfoBody');
  if(!ov||!title||!body)return;
  title.textContent=cfg.title;body.innerHTML=cfg.html;
  ov.classList.add('open');ov.setAttribute('aria-hidden','false');
}
function waveCloseInfo(){
  const ov=document.getElementById('waveInfoOverlay');if(!ov)return;
  ov.classList.remove('open');ov.setAttribute('aria-hidden','true');
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
function waveScrollGroup(){
  return [
    document.getElementById('wavePriceScroll'),
    document.getElementById('wave15Scroll'),
    document.getElementById('wave3Scroll')
  ].filter(Boolean);
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
  const group=waveScrollGroup();
  waveScrollProgrammatic=true;
  group.forEach(function(sc){sc.scrollLeft=left;});
  requestAnimationFrame(function(){
    waveScrollProgrammatic=false;
    waveUpdateHistoryStatus();
    if(waveReplayData)drawWavePrice(document.getElementById('wavePriceCanvas'),waveReplayIndex);
  });
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
function waveOnScroll(source){
  if(waveScrollProgrammatic)return;
  const group=waveScrollGroup();
  waveScrollProgrammatic=true;
  group.forEach(function(sc){if(sc!==source)sc.scrollLeft=source.scrollLeft;});
  requestAnimationFrame(function(){waveScrollProgrammatic=false;});
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
  const group=waveScrollGroup();
  group.forEach(function(sc){
    if(sc&&!sc.dataset.waveSyncBound){
      sc.dataset.waveSyncBound='1';
      sc.addEventListener('scroll',function(){waveOnScroll(sc);},{passive:true});
    }
  });
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
  if(mode==='live')loadWaveV5StructureStory();
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
let waveV5StoryLoading=false;
async function loadWaveV5StructureStory(){
  const el=document.getElementById('waveV5StructureStory');
  if(!el||waveV5StoryLoading||document.hidden)return;
  waveV5StoryLoading=true;
  try{
    const r=await fetch('/api/v5-structure',{cache:'no-store',
      signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const a=await r.json(),s=a.structure||{},j=a.enjeu||{},m=a.horizon||{};
    const z=a.integrity||{},t=(a.attempts||{}),p=(a.scenarios||[]);
    const signed=n=>n===null||n===undefined?'—':
      (Number(n)>0?'+':'')+Number(n).toFixed(1);
    const dir=x=>x?String(x).toUpperCase():'—';
    const safe=x=>escTrade(String(x===undefined||x===null?'—':x));
    const stale=z.dataIntegrity!=='ASOF_OK';
    const elasticStale=!['EVENT_STREAM_OBSERVED','SAME_ACTIVE_ENGINE'].includes(z.elasticEventStatus);
    const blocks=[
      '<div class="heading"><span>V5.4.3 · STRUCTURE DIRECTRICE</span>'+
        '<span>V5.4.1 PAPER · ACTIF</span></div>',
      stale?'<div class="line alert">MCB confirmé périmé ou absent : lecture historique uniquement.</div>':'',
      elasticStale?'<div class="line alert">Chronologie Elastic non fraîche : anciennes attaques, aucune confirmation récente déduite.</div>':'',
      '<div class="line"><b>Trajet E15→E15 '+safe(dir(s.direction))+'</b>'+
        ' · contexte 1h '+safe(dir(s.context1h))+' / 4h '+safe(dir(s.context4h))+
        ' · E3 '+safe(dir(s.childDirection))+'</div>',
      '<div class="line"><b>POSITION</b> '+safe(j.valueArea)+
        ' · frontière '+safe(j.profileFrontier&&j.profileFrontier.key||j.nearest&&j.nearest.key)+
        ' '+safe(j.profileFrontier&&j.profileFrontier.price||j.nearest&&j.nearest.price)+'$</div>',
      '<div class="line"><b>PHÉNOMÈNE</b> '+safe(a.phase)+
        ' · E15 UP '+Number(t.e15Up3h||0)+'/3h · E3 UP '+Number(t.e3Up90m||0)+'/90m</div>',
      '<div class="line"><b>EFFETS</b> Prix 1h '+signed(m.priceNet1h)+'$ · MF15 Δ1h '+
        signed(m.mf15Delta1h)+' · conversion '+safe(a.conversion&&a.conversion.quality)+
        ' (descriptive)</div>',
      '<div class="line"><b>HYPOTHÈSES</b> '+p.slice(0,2).map(x=>safe(x.kind)).join(' / ')+'</div>',
      '<div class="note">Observé '+waveParis(a.ts)+
        ' · horodatages réels, aucune exécution financée</div>'
    ];
    el.innerHTML=blocks.join('');
  }catch(err){
    el.textContent='V5.4.1 STRUCTURE · Observation indisponible : '+err.message;
  }finally{waveV5StoryLoading=false;}
}
function waveMergePriceSeries(a,b){
  const m=new Map();
  (a||[]).concat(b||[]).forEach(function(r){
    const ts=Number(r&&r.ts);if(Number.isFinite(ts))m.set(ts,r);
  });
  return Array.from(m.values()).sort(function(x,y){return Number(x.ts)-Number(y.ts);});
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
    v5PaperTrades:live.v5PaperTrades||snapshot.v5PaperTrades||[],
    signalEvents:{wave3:mergeSignals('wave3'),wave15:mergeSignals('wave15')},
    priceSeries:{
      '3m':waveMergePriceSeries(snapshot.priceSeries&&snapshot.priceSeries['3m'],live.priceSeries&&live.priceSeries['3m']),
      '15m':waveMergePriceSeries(snapshot.priceSeries&&snapshot.priceSeries['15m'],live.priceSeries&&live.priceSeries['15m'])
    },
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
    v5PaperTrades:recent.v5PaperTrades||base.v5PaperTrades||[],
    frames:frames,
    events:Array.from(eventMap.values()).sort(function(a,b){return Number(a.ts)-Number(b.ts);}),
    signalEvents:{wave3:mergeSignals('wave3'),wave15:mergeSignals('wave15')},
    priceSeries:{
      '3m':waveMergePriceSeries(base.priceSeries&&base.priceSeries['3m'],recent.priceSeries&&recent.priceSeries['3m']).filter(function(r){return Number(r.ts)>=cut;}),
      '15m':waveMergePriceSeries(base.priceSeries&&base.priceSeries['15m'],recent.priceSeries&&recent.priceSeries['15m']).filter(function(r){return Number(r.ts)>=cut;})
    },
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
  const infoBtn=e.target.closest&&e.target.closest('[data-wave-info]');
  if(infoBtn){waveOpenInfo(infoBtn.getAttribute('data-wave-info'));return;}
  const id=e.target.id || (e.target.closest&&e.target.closest('button')&&e.target.closest('button').id);
  if(id==='waveInfoClose'){waveCloseInfo();return;}
  if(e.target.id==='waveInfoOverlay'){waveCloseInfo();return;}
  if(id==='waveModeReplay'){loadWaveReplay();return;}
  if(id==='waveFlowAliveBtn'){
    const alive=document.querySelector('.tab[data-tab2="statev2"]');
    if(alive)alive.click();
    return;
  }
  if(id==='wavePrice3m'){waveSetPriceTf('3m');return;}
  if(id==='wavePrice15m'){waveSetPriceTf('15m');return;}
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
document.addEventListener('click',function(e){
 const b=e.target&&e.target.closest?e.target.closest('[data-paper-report]'):null;
 if(!b)return;
 const key=String(b.getAttribute('data-paper-report')||'');
 if(/^(V52|V493):[1-9]\\d*$/.test(key))waveOpenTradeReport(key);
});
document.addEventListener('keydown',function(ev){if(ev.key==='Escape'){waveCloseTradeReport();waveCloseInfo();}});

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
    const bg=c.background||{}, h1=bg.oneHour||{}, setup=c.setup||{}, room=c.structuralRoom||{}, mq=c.marketQuality||{}, mfs=c.mfStructureShadow||{}, mft=mfs.temporal||{};
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
        ' · structure descriptive</div>' +
      '<div><b>MF MÉMOIRE</b> ' + escTrade(mft.state) +
        (mft.memoryDirection ? ' · fond ' + escTrade(String(mft.memoryDirection).toUpperCase()) + ' ' + escTrade(mft.memoryHorizon) : '') +
        (mft.tacticalDirection ? ' · 30m ' + escTrade(String(mft.tacticalDirection).toUpperCase()) : '') +
        (mft.candidateContext&&mft.candidateContext.state ? ' · <b>' + escTrade(mft.candidateContext.state) + '</b>' : '') +
        (mft.conversion ? ' · prix/MF ' + escTrade(mft.conversion.priceRelation) + ' · effPrix ' + v3Fmt(100*Number(mft.conversion.priceEfficiency||0),0) + '%' : '') +
        ' · autorité admission 2h/4h seulement</div>' +
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


function shadowFmt(v,d){
  const n=Number(v);return Number.isFinite(n)?n.toFixed(d===undefined?1:d):'—';
}
function shadowMoney(v,d){
  const n=Number(v);return Number.isFinite(n)?(n>=0?'+':'')+n.toFixed(d===undefined?1:d)+' $':'—';
}
function shadowTime(v){
  if(v===null||v===undefined)return '—';
  const d=new Date(typeof v==='number'?v:String(v));
  if(!Number.isFinite(d.getTime()))return '—';
  return d.toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'});
}
function shadowBadge(label,kind){
  return '<span class="shadow-badge '+(kind||'')+'">'+escTrade(label)+'</span>';
}
function shadowKv(rows){
  return '<div class="shadow-kv">'+rows.map(function(r){
    return '<span class="k">'+escTrade(r[0])+'</span><span class="v">'+escTrade(r[1])+'</span>';
  }).join('')+'</div>';
}
function shadowCard(title,badge,badgeKind,main,secondary,rows,active){
  return '<div class="shadow-card'+(active?' active-impact':'')+'">'+
    '<div class="shadow-card-head"><span class="shadow-card-title">'+escTrade(title)+'</span>'+shadowBadge(badge,badgeKind)+'</div>'+
    '<div class="shadow-main">'+escTrade(main||'—')+'</div>'+
    (secondary?'<div class="shadow-secondary">'+escTrade(secondary)+'</div>':'')+
    shadowKv(rows||[])+'</div>';
}
function shadowStat(n,label,key){
  const body='<div class="n">'+escTrade(String(n))+'</div><div class="l">'+escTrade(label)+'</div>';
  if(!key)return '<div class="shadow-stat">'+body+'</div>';
  return '<button type="button" class="shadow-stat shadow-stat-btn" data-shadow-occ="'+escTrade(key)+'" data-shadow-label="'+encodeURIComponent(label)+'">'+body+'</button>';
}
let shadowLastData=null;
let shadowSelectedOccurrenceKey=null;
let shadowSelectedOccurrenceLabel=null;
function shadowDateTime(v){
  if(v===null||v===undefined)return '—';
  const d=new Date(typeof v==='number'?v:String(v));
  if(!Number.isFinite(d.getTime()))return '—';
  return d.toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function closeShadowOccurrences(){
  shadowSelectedOccurrenceKey=null;
  shadowSelectedOccurrenceLabel=null;
  document.querySelectorAll('.shadow-stat-btn.selected').forEach(function(b){b.classList.remove('selected');});
  const box=document.getElementById('shadowOccurrences');
  if(box)box.classList.remove('open');
}
function renderShadowOccurrences(data,key,label,scroll,anchorButton){
  const box=document.getElementById('shadowOccurrences');
  const title=document.getElementById('shadowOccurrencesTitle');
  const meta=document.getElementById('shadowOccurrencesMeta');
  const list=document.getElementById('shadowOccurrencesList');
  if(!box||!title||!meta||!list)return;
  const selectedButton=anchorButton||Array.from(document.querySelectorAll('.shadow-stat-btn')).find(function(b){return b.dataset.shadowOcc===key;})||null;
  const grid=selectedButton&&selectedButton.closest&&selectedButton.closest('.shadow-stat-grid');
  if(grid&&grid.parentNode)grid.insertAdjacentElement('afterend',box);
  document.querySelectorAll('.shadow-stat-btn').forEach(function(b){b.classList.toggle('selected',b.dataset.shadowOcc===key);});
  const arr=((data&&data.occurrences&&data.occurrences[key])||[]).slice().sort(function(a,b){
    const ta=typeof a.ts==='number'?a.ts:Date.parse(a.ts||0);
    const tb=typeof b.ts==='number'?b.ts:Date.parse(b.ts||0);
    return (Number.isFinite(tb)?tb:0)-(Number.isFinite(ta)?ta:0);
  });
  title.textContent='OCCURRENCES · '+(label||key||'—');
  meta.textContent=arr.length+' cas · récent → ancien';
  list.innerHTML=arr.length?arr.map(function(o){
    return '<div class="shadow-occ-row">'+
      '<div class="shadow-occ-time">'+shadowDateTime(o.ts)+'</div>'+
      '<div class="shadow-occ-kind">'+escTrade(o.kind||'SHADOW')+'</div>'+
      '<div class="shadow-occ-main"><b>'+escTrade(o.title||'—')+'</b>'+
        (o.price!==undefined&&o.price!==null?' · '+shadowFmt(o.price,1):'')+
        (o.detail?'<br><span style="color:#777;">'+escTrade(o.detail)+'</span>':'')+
      '</div></div>';
  }).join(''):'<div class="shadow-occ-empty">Aucune occurrence dans la fenêtre disponible.</div>';
  box.classList.add('open');
  list.scrollTop=0;
  if(scroll)box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderShadows(data){
  shadowLastData=data;
  const root=document.getElementById('shadowLive'),win=document.getElementById('shadowWindow');
  if(!root)return;
  const w=data.sampleWindow||{},cur=data.current||{},stats=data.stats||{};
  if(win){
    const mins=Number(w.minutes);
    win.textContent=(Number.isFinite(mins)?'fenêtre '+(mins>=60?(mins/60).toFixed(1)+' h':mins.toFixed(0)+' min'):'fenêtre —')+
      ' · '+Number(w.evaluations||0)+' évaluations'+
      (Number(w.excludedDataDegraded||0)?' · '+Number(w.excludedDataDegraded)+' exclues DATA_DEGRADED':'')+
      ' · '+(data.version||'—');
  }

  const pb=cur.priceBehavior||{};
  const tr=pb.travel||{},ppm=pb.pm||{},sm=pb.signalMemory||{},pep=pb.episode||{};
  const priceCard=shadowCard(
    'PRICE BEHAVIOR','SHADOW PUR','',
    (tr.state||pb.state||'—')+(pb.direction?' · '+String(pb.direction).toUpperCase():''),
    (pb.relationToSignalMemory||'NO_RELATION')+(sm.sequence?' · '+sm.sequence:''),
    [
      ['vague',sm.established?(String(sm.direction||'—').toUpperCase()+' · établie'):'non établie'],
      ['yield / effort',shadowFmt(tr.yieldVsP75,2)+'× P75 / '+shadowFmt(tr.effortVsP75,2)+'× P75'],
      ['PM 3m / 5m',shadowMoney(ppm.net3mUsd,1)+' / '+shadowMoney(ppm.net5mUsd,1)],
      ['eff3m',shadowFmt(Number(ppm.efficiency3m)*100,0)+' %'],
      ['épisode',shadowFmt(pep.durationMinutes,1)+' min · MFE '+shadowMoney(pep.maxFavorableUsd,1)+' · MAE '+shadowMoney(pep.maxAdverseUsd,1)]
    ],false
  );

  const cr=cur.continuationReentry||{},ce=cr.evidence||{},cp=cr.protectiveExit||{};
  const crWarn=!!cr.churnRisk;
  const continuationCard=shadowCard(
    'CONTINUATION RE-ENTRY',crWarn?'SHADOW · CHURN RISK':'SHADOW PUR',crWarn?'warn':'',
    (cr.state||'—')+(cp.direction?' · '+String(cp.direction).toUpperCase():''),
    cp.kind?('après '+cp.kind):'aucune sortie protectrice armée',
    [
      ['trigger',cr.triggerPrice!==undefined&&cr.triggerPrice!==null?shadowFmt(cr.triggerPrice,1)+' @ '+shadowTime(cr.triggeredAt):'—'],
      ['MFE / MAE',shadowMoney(cr.shadowMfeUsd,1)+' / '+shadowMoney(cr.shadowMaeUsd,1)],
      ['220 atteint',cr.reachedEconomicMove?'OUI':'NON'],
      ['PM 3m / 5m',shadowMoney(ce.net3mUsd,1)+' / '+shadowMoney(ce.net5mUsd,1)],
      ['état',cr.invalidationReason||((cr.waits||[]).join(' + ')||'suivi / attente')]
    ],false
  );

  const l15=cur.live15Acceptance||{},lSig=l15.currentSignal||{},lEntry=l15.entryShadow||{},lExit=l15.exitShadow||{},lBar=l15.currentBar||{},lLast=l15.lastResolved||{};
  const lStats=stats.live15Acceptance||{},lRaw=lStats.raw||{},lAct=lStats.actions||{},lEntryStats=lAct.entry||{},lExitStats=lAct.exit||{};
  const live15Main=lSig.type
    ?(lSig.type+' LIVE · '+String(lSig.direction||'').toUpperCase())
    :(l15.state||'—');
  const live15Secondary=lSig.type
    ?(shadowFmt(lSig.minutesToClose,1)+' min avant clôture 15m')
    :(lLast.outcome?('dernier verdict · '+lLast.outcome):'aucun signal live actuellement');
  const live15Card=shadowCard(
    'LIVE15 ACCEPTANCE','SHADOW PUR','',
    live15Main,
    live15Secondary,
    [
      ['ENTRY',lSig.type?(lEntry.actionReady?'STACK READY · accepter LIVE15':((lEntry.evidence&&lEntry.evidence.waits||[]).join(' + ')||'signal seul')):'—'],
      ['EXIT',lExit.opposingLiveSignal?'OPPOSÉ POSITION · hypothèse sortie immédiate':'aucune hypothèse sortie'],
      ['persistance',lBar.firstSeenAt?(String(lBar.presentSamples||0)+' présents / '+String(lBar.samples||0)+' samples · disparitions '+String(lBar.disappearanceTransitions||0)):'—'],
      ['dernier verdict',lLast.outcome?(lLast.outcome+' · lead '+shadowFmt(lLast.firstSignalLeadMinutes,1)+' min'):'—'],
      ['24h brut',lRaw.bars?(String(lRaw.confirmedSame||0)+'/'+String(lRaw.bars)+' confirmés · '+String((lRaw.repaintNone||0)+(lRaw.repaintOpposite||0))+' repaint'):'échantillon en construction']
    ],false
  );

  const dq=cur.dataQuality||{},dq3=dq.threeMinute||{},dq15=dq.fifteenMinute||{};
  const dataQualityCard=shadowCard(
    'DATA QUALITY',dq.degraded?'DATA_DEGRADED':'DATA OK',dq.degraded?'warn':'active',
    dq.state||'—',
    dq.degraded?'nouvelle admission suspendue jusqu’au retour du MCB':'MCB frais · autorité normale',
    [
      ['3m',String(dq3.status||'—')+' · live '+shadowFmt(Number(dq3.liveUpdateAgeMs)/1000,0)+'s · conf '+shadowFmt(Number(dq3.confirmedUpdateAgeMs)/1000,0)+'s'],
      ['15m',String(dq15.status||'—')+' · live '+shadowFmt(Number(dq15.liveUpdateAgeMs)/1000,0)+'s · conf '+shadowFmt(Number(dq15.confirmedUpdateAgeMs)/1000,0)+'s'],
      ['impact',dq.degraded?'NO NEW ENTRY · hard risk reste actif':'aucun']
    ],!!(!dq.degraded)
  );

  const ac=cur.admissionCounterfactual||{},ae=ac.activeEpisode||{};
  const admissionCard=shadowCard(
    'ADMISSION COUNTERFACTUAL','SHADOW PUR','',
    (ac.state||'—')+(ae.direction?' · '+String(ae.direction).toUpperCase():''),
    ae.initialBlockers&&ae.initialBlockers.length?ae.initialBlockers.join(' + '):'aucune fenêtre cohérente bloquée actuellement',
    [
      ['MFE / MAE',ae.triggerTs?shadowMoney(ae.maxFavorableUsd,1)+' / '+shadowMoney(ae.maxAdverseUsd,1):'—'],
      ['+220 avant -180',ae.success220BeforeMinus180===true?'OUI':ae.success220BeforeMinus180===false?'NON':'—'],
      ['E3 live → confirmé',ae.liveToConfirmed3Minutes!==null&&ae.liveToConfirmed3Minutes!==undefined?shadowFmt(ae.liveToConfirmed3Minutes,1)+' min':'—'],
      ['E3 live → structure',ae.liveToStructural3Minutes!==null&&ae.liveToStructural3Minutes!==undefined?shadowFmt(ae.liveToStructural3Minutes,1)+' min':'—'],
      ['boundary',ae.boundary?(String(ae.boundary.kind||'—')+' '+shadowFmt(ae.boundary.distanceAbsUsd,0)+'$'+(ae.boundaryCrossedAt?' · FRANCHIE':'')):'—']
    ],false
  );

  const el=cur.elasticSync||{},ee=el.activeEpisode||{};
  const elasticCard=shadowCard(
    'ELASTIC SYNC','SHADOW PUR','',
    (el.state||'—')+(ee.direction?' · '+String(ee.direction).toUpperCase():''),
    ee.orderString?('ordre observé · '+ee.orderString):'aucun ordre canonique imposé',
    [
      ['événements',ee.orderSignature&&ee.orderSignature.length?String(ee.orderSignature.length):'—'],
      ['MFE / MAE',ee.startedAt?shadowMoney(ee.maxFavorableUsd,1)+' / '+shadowMoney(ee.maxAdverseUsd,1):'—'],
      ['relaxations E3',ee.startedAt?String(ee.relaxationCount||0):'—'],
      ['+220 avant -180',ee.success220BeforeMinus180===true?'OUI':ee.success220BeforeMinus180===false?'NON':'—'],
      ['ordre',ee.orderString||'en attente']
    ],false
  );

  const sh=cur.structuralHandoff||{},se=sh.evidence||{};
  const handoffCard=shadowCard(
    'STRUCTURAL HANDOFF','SHADOW PUR','',
    (sh.state||'—')+(sh.direction?' · '+String(sh.direction).toUpperCase():''),
    sh.reentryEligible?'preuve post-sortie éligible':'mémoire structurelle / observation',
    [
      ['triple sync',sh.tripleSyncNow?'OUI':'NON'],
      ['1h / 15m / 3m',
        String(se.oneHour&&se.oneHour.direction||'—').toUpperCase()+' / '+
        String(se.fifteenMinute&&se.fifteenMinute.direction||'—').toUpperCase()+' / '+
        String(se.threeMinute&&se.threeMinute.direction||'—').toUpperCase()],
      ['reentryEligible',sh.reentryEligible?'OUI':'NON'],
      ['invalidation',sh.invalidationReason||'—']
    ],false
  );

  const tp=cur.tpOptimization||{};
  const tpMain=tp.tradeNo?('#'+tp.tradeNo+' · '+String(tp.bestTpVariantId||'—')):'aucun TP shadow finalisé';
  const tpCard=shadowCard(
    'TP OPTIMIZATION','SHADOW PUR','',
    tpMain,
    tp.tradeNo?('dernier trade analysé · '+shadowTime(tp.exitTimestamp)):'',
    [
      ['best TP',tp.tradeNo?shadowMoney(tp.bestTpNetPnlUsd,2):'—'],
      ['HOLD',tp.tradeNo?shadowMoney(tp.holdNetPnlUsd,2):'—'],
      ['Δ vs HOLD',tp.tradeNo?shadowMoney(tp.deltaVsHoldUsd,2):'—'],
      ['variantes',tp.variantCount!==undefined&&tp.variantCount!==null?String(tp.variantCount):'—']
    ],false
  );

  const mf=cur.mfTemporal||{},mc=mf.candidateContext||{},conv=mf.conversion||{};
  const mfCard=shadowCard(
    'MF MEMORY','ACTIF · ADMISSION_ONLY','active',
    (mf.state||'—')+(mf.memoryDirection?' · '+String(mf.memoryDirection).toUpperCase()+' '+String(mf.memoryHorizon||''):''),
    mc.state||'influence live sur admission seulement',
    [
      ['tactique 30m',String(mf.tacticalDirection||'—').toUpperCase()],
      ['candidat',String(mf.candidateDirection||'—').toUpperCase()],
      ['price relation',conv.priceRelation||'—'],
      ['price efficiency',shadowFmt(Number(conv.priceEfficiency)*100,0)+' %'],
      ['USD / MF pt',shadowFmt(conv.usdPerMfPoint,1)]
    ],true
  );

  const ps=stats.priceBehavior||{},cs=stats.continuationReentry||{},hs=stats.structuralHandoff||{},acs=stats.admissionCounterfactual||{},asum=acs.summary||{},els=stats.elasticSync||{},ts=stats.tpOptimization||{};
  const elasticProofs=Array.isArray(els.proofConversion)?els.proofConversion:[];
  const elasticInteractions=Array.isArray(els.interactions)?els.interactions:[];
  const elasticThesis5=elasticProofs.filter(function(x){return x&&x.polarity==='THESIS'&&Number(x.matured5)>0;}).sort(function(a,b){return Number(b.avgProofSigned5m||0)-Number(a.avgProofSigned5m||0);})[0]||null;
  const elasticCounter5=elasticProofs.filter(function(x){return x&&x.polarity==='COUNTERFACT'&&Number(x.matured5)>0;}).sort(function(a,b){return Number(b.avgProofSigned5m||0)-Number(a.avgProofSigned5m||0);})[0]||null;
  const recurringElasticInteractions=elasticInteractions.filter(function(x){return Number(x&&x.count)>=2;});
  const topElasticInteraction=recurringElasticInteractions.slice().sort(function(a,b){return Number(b.count||0)-Number(a.count||0);})[0]||null;
  const statHtml='<div class="shadow-section-title">PREMIÈRES STATISTIQUES · FENÊTRE RÉCENTE</div>'+
    '<div class="shadow-stat-grid">'+
      shadowStat(ps.episodes||0,'épisodes prix intéressants','price_all')+
      shadowStat(ps.alignedWithWave||0,'prix intéressant + vague','price_wave')+
      shadowStat(ps.reached220||0,'épisodes prix MFE ≥ 220 $','price_mfe220')+
      shadowStat(ps.adverse180||0,'épisodes prix MAE ≥ 180 $','price_mae180')+
      shadowStat(cs.candidates||0,'candidats re-entry','reentry_all')+
      shadowStat(cs.reached220||0,'re-entry MFE ≥ 220 $','reentry_mfe220')+
      shadowStat(cs.churnRisk||0,'re-entry churnRisk','reentry_churn')+
      shadowStat(hs.reentryEligible||0,'handoff reentryEligible','handoff_reentry')+
    '</div>';

  function gatePair(g){const x=asum[g]||{};return String(x.episodes||0)+' / '+String(x.success220BeforeMinus180||0);}
  const admissionStatsHtml='<div class="shadow-section-title">ADMISSION COUNTERFACTUAL · ÉPISODES / +220 AVANT −180</div>'+
    '<div class="shadow-stat-grid">'+
      shadowStat(acs.episodes||0,'fenêtres cohérentes bloquées','admission_all')+
      shadowStat(acs.success220BeforeMinus180||0,'succès +220 avant −180','admission_success220')+
      shadowStat(acs.live3Continuation||0,'avec E3 live continuation','admission_live3')+
      shadowStat(gatePair('LOW_EDGE'),'LOW_EDGE · épisodes / succès','admission_LOW_EDGE')+
      shadowStat(gatePair('WAIT_SYNC'),'WAIT_SYNC · épisodes / succès','admission_WAIT_SYNC')+
      shadowStat(gatePair('SETUP_LATE'),'SETUP_LATE · épisodes / succès','admission_SETUP_LATE')+
      shadowStat(String((asum.MF_MEMORY&&asum.MF_MEMORY.episodes||0)+(asum.MF_1H&&asum.MF_1H.episodes||0)+(asum.MF_3M&&asum.MF_3M.episodes||0))+' / '+String((asum.MF_MEMORY&&asum.MF_MEMORY.success220BeforeMinus180||0)+(asum.MF_1H&&asum.MF_1H.success220BeforeMinus180||0)+(asum.MF_3M&&asum.MF_3M.success220BeforeMinus180||0)),'MF MEMORY · épisodes / succès','admission_MF_MEMORY')+
      shadowStat(gatePair('BOUNDARY'),'BOUNDARY · épisodes / succès','admission_BOUNDARY')+
    '</div>';

  function elasticProofText(x){
    if(!x)return 'en attente';
    return String(x.event||'—')+' · '+shadowFmt(x.avgProofSigned5m,1)+'$ · '+shadowFmt(100*Number(x.positive5Rate||0),0)+'% +';
  }
  const elasticStatsHtml='<div class="shadow-section-title">ELASTIC SYNC · ORDRE / CONVERSION DES PREUVES</div>'+
    '<div class="shadow-stat-grid">'+
      shadowStat(els.episodes||0,'épisodes observés','elastic_all')+
      shadowStat(els.success220BeforeMinus180||0,'+220 avant −180','elastic_success')+
      shadowStat(els.withRelaxation||0,'avec respiration E3 opposée','elastic_relax')+
      shadowStat(elasticProofText(elasticThesis5),'meilleure preuve thèse · conversion 5m')+
      shadowStat(elasticProofText(elasticCounter5),'contre-preuve la plus payée · 5m')+
      shadowStat(recurringElasticInteractions.length,'interactions causales récurrentes')+
      shadowStat(topElasticInteraction?(String(topElasticInteraction.from||'—')+' → '+String(topElasticInteraction.to||'—')+' · x'+String(topElasticInteraction.count||0)):'en attente','interaction la plus fréquente')+
    '</div>';

  const live15Reliability='<div class="shadow-section-title">LIVE15 · LATENCE / REPAINT · JUSQU’À 24 H</div>'+
    '<div class="shadow-stat-grid">'+
      shadowStat(lRaw.bars||0,'bougies avec signal LIVE','live15_all')+
      shadowStat((lRaw.bars?shadowFmt(100*Number(lRaw.confirmationRate||0),0)+' %':'—'),'confirmés même sens','live15_confirmed')+
      shadowStat((lRaw.repaintNone||0)+(lRaw.repaintOpposite||0),'repaints','live15_repaint')+
      shadowStat(lRaw.avgLeadMinutes!==null&&lRaw.avgLeadMinutes!==undefined?shadowFmt(lRaw.avgLeadMinutes,1)+' min':'—','avance moyenne avant close','live15_all')+
      shadowStat(lRaw.stableBars?shadowFmt(100*Number(lRaw.stableConfirmationRate||0),0)+' %':'—','confirmation si présence ≥80%','live15_stable')+
      shadowStat(lRaw.fleetingBars?shadowFmt(100*Number(lRaw.fleetingConfirmationRate||0),0)+' %':'—','confirmation si présence <25%','live15_fleeting')+
      shadowStat(lRaw.disappearanceBars||0,'bougies avec disparition','live15_disappear')+
      shadowStat(lRaw.typeFlipBars||0,'bougies avec flip UP↔DN','live15_flip')+
    '</div>';

  const live15ActionStats='<div class="shadow-section-title">LIVE15 · ACTION HYPOTHÉTIQUE · DEPUIS ACTIVATION SHADOW</div>'+
    '<div class="shadow-stat-grid">'+
      shadowStat(lEntryStats.candidates||0,'ENTRY candidats stack-ready','live15_entry_all')+
      shadowStat(lEntryStats.confirmedSame||0,'ENTRY finalement confirmés','live15_entry_confirmed')+
      shadowStat(lEntryStats.repaints||0,'ENTRY repaint','live15_entry_repaint')+
      shadowStat(lEntryStats.avgLeadMinutes!==null&&lEntryStats.avgLeadMinutes!==undefined?shadowFmt(lEntryStats.avgLeadMinutes,1)+' min':'—','ENTRY avance moyenne','live15_entry_all')+
      shadowStat(lExitStats.candidates||0,'EXIT candidats signal seul','live15_exit_all')+
      shadowStat(lExitStats.repaints||0,'EXIT repaint','live15_exit_repaint')+
      shadowStat(lExitStats.prematureRecoveryReference||0,'EXIT récupération ≥180 $ manquée','live15_exit_recovery180')+
      shadowStat(lExitStats.avoidedAdverseReference||0,'EXIT adverse ≥180 $ évité','live15_exit_adverse180')+
    '</div>';

  const tpSummary='<div class="shadow-section-title">TP SHADOW · HISTORIQUE DISPONIBLE</div>'+
    '<div class="shadow-stat-grid">'+
      shadowStat(ts.trades||0,'trades analysés','tp_all')+
      shadowStat(ts.improvedVsHold||0,'meilleur TP > HOLD','tp_improved')+
      shadowStat(ts.equalToHold||0,'meilleur TP = HOLD','tp_equal')+
      shadowStat(shadowMoney(ts.cumulativeBestTpDeltaUsd,2),'Δ cumulé best TP vs HOLD','tp_all')+
    '</div>';

  const occurrencePanel='<div id="shadowOccurrences" class="shadow-occurrences">'+
    '<div class="shadow-occ-head"><div id="shadowOccurrencesTitle" class="shadow-occ-title">OCCURRENCES</div>'+
      '<div class="shadow-occ-head-right"><div id="shadowOccurrencesMeta" class="shadow-occ-meta"></div><button type="button" id="shadowOccurrencesClose" class="shadow-occ-close" aria-label="Fermer">×</button></div></div>'+
    '<div id="shadowOccurrencesList" class="shadow-occ-list"></div></div>';

  const j=(data.journal||[]);
  const journalHtml='<div class="shadow-section-title">JOURNAL SHADOW / ACTIF</div>'+
    '<div class="shadow-journal">'+(j.length?j.map(function(e){
      return '<div class="shadow-event">'+
        '<div class="shadow-event-time">'+shadowTime(e.ts)+'</div>'+
        '<div class="shadow-event-kind '+(e.level==='ACTIVE'?'active':'')+'">'+escTrade(e.kind||'—')+'</div>'+
        '<div class="shadow-event-main"><b>'+escTrade(e.title||'—')+'</b>'+
          (e.price!==undefined&&e.price!==null?' · '+shadowFmt(e.price,1):'')+
          (e.detail?'<br><span style="color:#777;">'+escTrade(e.detail)+'</span>':'')+
        '</div></div>';
    }).join(''):'<div class="shadow-empty">Aucun événement significatif dans la fenêtre récente.</div>')+'</div>';

  root.innerHTML=
    '<div class="shadow-section-title">ÉTAT LIVE</div>'+
    '<div class="shadow-grid">'+dataQualityCard+priceCard+continuationCard+live15Card+admissionCard+elasticCard+handoffCard+tpCard+mfCard+'</div>'+
    statHtml+admissionStatsHtml+elasticStatsHtml+live15Reliability+live15ActionStats+tpSummary+occurrencePanel+journalHtml;
  if(shadowSelectedOccurrenceKey){
    renderShadowOccurrences(data,shadowSelectedOccurrenceKey,shadowSelectedOccurrenceLabel,false,null);
  }
}
document.addEventListener('click',function(ev){
  if(ev.target&&ev.target.closest&&ev.target.closest('#shadowOccurrencesClose')){
    closeShadowOccurrences();
    return;
  }
  const b=ev.target&&ev.target.closest&&ev.target.closest('.shadow-stat-btn');
  if(!b)return;
  const key=b.dataset.shadowOcc;
  const label=decodeURIComponent(b.dataset.shadowLabel||key||'');
  const box=document.getElementById('shadowOccurrences');
  if(shadowSelectedOccurrenceKey===key&&box&&box.classList.contains('open')){
    closeShadowOccurrences();
    return;
  }
  shadowSelectedOccurrenceKey=key;
  shadowSelectedOccurrenceLabel=label;
  if(shadowLastData)renderShadowOccurrences(shadowLastData,key,label,true,b);
});
async function loadShadows(){
  const root=document.getElementById('shadowLive');
  if(!root)return;
  try{
    const res=await fetch('/api/shadows',{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    renderShadows(await res.json());
  }catch(e){
    root.innerHTML='<div class="shadow-empty">Shadows indisponibles : '+escTrade(e.message)+'</div>';
  }
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

function renderElasticDualV04(current) {
  const x=current&&current.elasticDualChainShadow||null;
  if(!x||!x.chains)return '<div class="elastic-dual-header">ELASTIC v0.4 · DEUX CHAÎNES <span class="elastic-dual-note">SHADOW PUR · données en attente</span></div>';
  const human=n=>String(n||'—').replace(/_/g,' ');
  const money=n=>n===null||n===undefined||!Number.isFinite(Number(n))?'—':(Number(n)>=0?'+':'')+Number(n).toFixed(1)+' $';
  const percent=n=>n===null||n===undefined||!Number.isFinite(Number(n))?'—':(Number(n)*100).toFixed(0)+' %';
  const rows=(list,max)=>{
    return (list||[]).slice(0,max).map(function(q){
      const time=q.ts?tradeTime(q.ts).split(' ').pop():'—';
      return '<div class="elastic-dual-event"><em>'+escTrade(time)+'</em> '+escTrade(human(q.type))+
        ' · <b>'+escTrade(human(q.name))+'</b></div>';
    }).join('');
  };
  function draw(direction){
    const c=x.chains[direction]||{},v=c.measures||{},pr=c.proofs||{};
    const signals=Object.values(pr).filter(function(p){return p&&p.state==='ACTIVE';});
    const pro=signals.filter(function(p){return !p.name.includes('OPPOSITE')&&!p.name.includes('DISAGREE')&&!p.name.includes('LOW_YIELD')&&!p.name.includes('EFFORT_LOW_YIELD')}).slice(0,4);
    const contra=signals.filter(function(p){return p.name.includes('OPPOSITE')||p.name.includes('DISAGREE')||p.name.includes('LOW_YIELD')}).slice(0,3);
    const superseded=Object.values(pr).filter(function(p){return p&&p.state==='SUPERSEDED';}).sort(function(a,b){return (b.lastFadedAt||0)-(a.lastFadedAt||0);}).slice(0,2);
    const dom=x.priceDominance||{},windows=dom.windows||{},w15=windows.m15||{},w30=windows.m30||{};
    const fmtNet=function(w){return w.available?money(w.netUsd):'—';};
    const geometry=x.waveGeometry||{};
    const bwLbwSummary=function(tf,label){
      const g=geometry[tf]||{};
      if(!g.available)return '<div class="elastic-dual-event">'+label+' · indisponible</div>';
      const rate=g.spreadRatePerMinute===null||g.spreadRatePerMinute===undefined?'—':v3Signed(g.spreadRatePerMinute,2);
      const since=g.sinceCrossMinutes===null||g.sinceCrossMinutes===undefined?'aucun croisement suivi':
        'croisement '+Number(g.sinceCrossMinutes).toFixed(1)+' min';
      return '<div class="elastic-dual-event">'+label+' · BW−LBW <b>'+
        v3Signed(g.spread,2)+'</b> · Δ/min '+rate+' · '+escTrade(since)+'</div>';
    };
    const tags=a=>a.length?a.map(function(p){return '<div class="elastic-dual-event">'+escTrade(human(p.name))+' · '+((p.activeSince&&c.lastUpdatedAt)?((c.lastUpdatedAt-p.activeSince)/60000).toFixed(1):'0')+'m'+
      (p.reaffirmations?' · repris '+p.reaffirmations+'x':'')+'</div>'}).join(''):'<div class="elastic-dual-event">—</div>';
    const recent=(c.story||[]).slice().reverse();
    const milestones=(c.milestones||[]).slice().reverse().map(function(e){return {ts:e.observedAt,type:e.type,name:e.event+(e.sourceTs&&e.sourceTs!==e.observedAt?' · barre '+tradeTime(e.sourceTs):'')};});
    return '<section class="elastic-dual-card '+direction+'" aria-label="Chaîne '+direction.toUpperCase()+'">'+
      '<div class="elastic-dual-title">'+direction.toUpperCase()+' <span class="elastic-dual-role">'+escTrade(human(c.role||'SHADOW'))+' MCB</span></div>'+
      '<div class="elastic-dual-status">'+escTrade(human(c.phase))+' · prix '+escTrade(human(c.priceRelation))+
      ' · '+Number(c.activeProofCount||0)+' observations / '+Number((c.families||[]).length)+' familles · '+Number(c.contraryCount||0)+' oppositions (pas des votes)</div>'+
      '<div class="elastic-dual-status" style="font-size:9px;border-top:1px dotted #eee;padding-top:4px;">'+
      'PRIX 15m <b>'+fmtNet(w15)+'</b> · 30m <b>'+fmtNet(w30)+'</b></div>'+
      '<div class="elastic-dual-kpis">'+
       '<div>LBW15 <b>'+v3Signed(v.lbw15,1)+'</b></div><div>LBW3 <b>'+v3Signed(v.lbw3,1)+'</b></div>'+
       '<div>MF15 <b>'+v3Signed(v.mf15,1)+'</b></div><div>MF3 <b>'+v3Signed(v.mf3,1)+'</b></div>'+
       '<div>pente MF15 <b>'+v3Signed(v.mf15Slope,2)+'</b></div><div>pente MF3 <b>'+v3Signed(v.mf3Slope,2)+'</b></div>'+
       '<div>PM3 <b>'+money(v.pm3)+'</b></div><div>PM5 <b>'+money(v.pm5)+'</b></div>'+
       '<div>PM Live <b>'+money(v.pmLive)+'</b></div><div>eff. 3m <b>'+percent(v.eff3)+'</b></div>'+
       '<div>yield/P75 <b>'+v3Fmt(v.yieldVsP75,2)+'x</b></div><div>effort/P75 <b>'+v3Fmt(v.effortVsP75,2)+'x</b></div>'+
       '</div>'+
       '<div class="elastic-dual-events"><div class="heading">CROISEMENTS BW / LBW · ÉVÉNEMENT DISTINCT</div>'+
       bwLbwSummary('m3','3m')+bwLbwSummary('m15','15m')+
       '<div class="elastic-dual-event">Liés aux E3/E15 · sans double comptage ni autorité de trading</div></div>'+
       '<div class="elastic-dual-events"><div class="heading">OBSERVATIONS ACTUELLES</div>'+tags(pro)+
       '<div class="heading" style="margin-top:6px;">CONTRE-PREUVES</div>'+tags(contra)+
       (superseded.length?'<div class="heading" style="margin-top:6px;">SIGNAL HISTORIQUE DÉPASSÉ</div>'+superseded.map(function(p){return '<div class="elastic-dual-event">'+escTrade(human(p.name))+' · remplacé par signal opposé</div>';}).join(''):'')+'</div>'+
       '<div class="elastic-dual-events"><div class="heading">JALONS CAUSAUX</div>'+rows(milestones,5)+'</div>'+
       '<div class="elastic-dual-events"><div class="heading">RÉCIT RÉCENT</div>'+rows(recent,4)+'</div>'+
       '<details class="elastic-dual-full" data-elastic-chain="'+direction+'-jalons"><summary>Historique des jalons ('+milestones.length+')</summary>'+rows(milestones.slice(5),16)+'</details>'+
       '<details class="elastic-dual-full" data-elastic-chain="'+direction+'"><summary>Historique des événements ('+Number((c.story||[]).length)+')</summary>'+rows(recent.slice(4),16)+'</details>'+
       '</section>';
  }
  return '<div class="elastic-dual-header">ELASTIC v0.4.3 · CHAÎNES PARALLÈLES '+
    '<span class="elastic-dual-note">MCB propose '+escTrade(human(x.mcbAuthority))+
    ' · trajet 15m '+escTrade(human(x.structuralDirection))+
    ' · prix 15/30m '+escTrade(human(x.priceDominance&&x.priceDominance.direction||
      (x.priceDominance&&x.priceDominance.context30mDirection
        ?x.priceDominance.context30mDirection+' / 15m contesté':'INDÉCIS')))+
    ' · SHADOW PUR</span></div>'+
    '<div class="elastic-dual-grid">'+draw('long')+draw('short')+'</div>';
}

// Reports are deliberately loaded ONCE when the user opens the Reports tab.
let v4ReportsLoadedForCount=null;
let v4ReportsLoading=false;
let v4ExpectedReportsCount=null;
async function loadV4Reports(){
  const el=document.getElementById('tab2-reportsv2');
  if(!el||v4ReportsLoading||(v4ReportsLoadedForCount!==null&&v4ReportsLoadedForCount===v4ExpectedReportsCount))return;
  v4ReportsLoading=true;
  el.innerHTML='<div class="placeholder-note">Chargement des 12 derniers rapports…</div>';
  try{
    const res=await fetch('/api/trades/reports',{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    const detailed=(data.reports||[]).slice().reverse();
    const main=detailed.length
      ?'<div class="diag-module"><div class="diag-details">'+detailed.length+
        ' derniers rapports · données détaillées chargées sur demande</div></div>'+
        detailed.map(renderV2Report).join('')
      :'<div class="placeholder-note">Aucun rapport disponible.</div>';
    el.innerHTML=main;
    v4ReportsLoadedForCount=Number(data.totalCount)||0;
    v4ExpectedReportsCount=v4ReportsLoadedForCount;
  }catch(e){
    el.innerHTML='<div class="ledger-empty">Rapports indisponibles : '+escTrade(e.message)+'</div>';
  }finally{v4ReportsLoading=false;}
}
// V5 is a separate observable paper agent, not a new rule inside V4.
let v5PanelLoading=false;
let v5PaperArchiveHtmlCache=null;
async function loadV5PaperPanel(){
  const el=document.getElementById('v5-paper-live');
  const archive=document.getElementById('v5-paper-archive');
  if(!el||!archive||!archive.open||v5PanelLoading||document.hidden)return;
  if(v5PaperArchiveHtmlCache!==null){el.innerHTML=v5PaperArchiveHtmlCache;return;}
  v5PanelLoading=true;
  try{
    const res=await fetch('/api/v5',{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const d=await res.json(),p=d.paper||{},o=d.opportunity||{},m=d.memory||{},v=d.market||{};
    const frozen=d.paperStatus!=='PAPER_RECENT';
    const fmt=x=>x===null||x===undefined||!isFinite(Number(x))?'—':Number(x).toFixed(1);
    const signed=x=>x===null||x===undefined||!isFinite(Number(x))?'—':
      (Number(x)>0?'+':'')+Number(x).toFixed(2);
    const time=x=>x?new Date(Number(x)).toLocaleTimeString('fr-FR',
      {timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
    // The old V5 engine wrote UTC times inside its evidence strings.
    // Match each UTC clock against the closest actual observation day.
    const localEvidence=function(value){
      return String(value||'')
        .replace(/^MCB15 confirmé /,'Événement E15 confirmé ')
        .replace(/^MCB15 Live provisoire /,'Événement E15 Live provisoire ')
        .replace(/^E3 CONFIRMED /,'Événement E3 confirmé ')
        .replace(/observé ([0-2][0-9]):([0-5][0-9])/g,
        function(_,hh,mm){
          const ref=Number(o.sourceAt||d.lastPaperAt)||0;
          const dt=new Date(ref);
          const midnight=Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth(),dt.getUTCDate());
          let best=null;
          for(const offset of [-1,0,1]){
            const candidate=midnight+offset*86400000+Number(hh)*3600000+Number(mm)*60000;
            if(best===null||Math.abs(candidate-ref)<Math.abs(best-ref))best=candidate;
          }
          const loc=new Date(best).toLocaleTimeString('fr-FR',{
            timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit'});
          return 'observé '+loc+' (Stockholm ; '+hh+':'+mm+' UTC)';
        });
    };
    const bar=(m.buckets||[]).map(function(b){
      const long=(b.directionCounts&&b.directionCounts.long)||0;
      const short=(b.directionCounts&&b.directionCounts.short)||0;
      const kind=long>short?'long':short>long?'short':'';
      const qq=Object.entries(b.qualities||{}).sort((a,c)=>c[1]-a[1])[0]||['UNKNOWN',0];
      return '<div class="v5-quality-bar '+kind+'"><b>'+time(b.from).slice(0,5)+'</b>'+
        '<div>'+escTrade(qq[0])+'</div>'+
        '<div>'+Math.round(100*Number(qq[1]))+' %</div>'+
        '<div>Δ '+signed(b.price&&b.price.netUsd)+'$</div></div>';
    }).join('');
    const evidence=(o.evidence||[]).slice(0,6).map(x=>'<div>+ '+escTrade(localEvidence(x))+'</div>').join('');
    const contrary=(o.contradictions||[]).slice(0,6).map(x=>'<div>− '+escTrade(x)+'</div>').join('');
    const pos=p.position;
    const posHtml=pos?
      '<div class="v5-paper-position"><b>'+(frozen?'POSITION PAPER FIGÉE ':'POSITION ')+
      escTrade((pos.direction||'').toUpperCase())+
      '</b> @ '+fmt(pos.entryPrice)+' · '+(frozen?'dernier prix enregistré ':'prix ')+fmt(pos.lastPrice)+
      ' · PNL net '+(frozen?'figé ':'indicatif ')+signed(pos.lastNetPnlUsd)+' $'+
      ' · MFE '+fmt(pos.mfePriceUsd)+'$ · MAE '+fmt(pos.maePriceUsd)+'$</div>':
      '<div class="v5-paper-position">FLAT · En attente d’une chaîne exploitable.</div>';
    const trades=(p.latestTrades||[]).slice(0,5).map(t=>
      '<div class="v5-ledger">#'+Number(t.tradeNo||0)+' '+escTrade((t.direction||'').toUpperCase())+
      ' '+fmt(t.entryPrice)+' → '+fmt(t.exitPrice)+' · NET '+signed(t.netPnlUsd)+
      ' $ · '+escTrade(t.exitReason||'')+'</div>').join('');
    const elNow=document.getElementById('v5-paper-live');
    if(!elNow)return;
    elNow.innerHTML='<div class="v5-head"><span>BOONO V5 PAPER · '+
      (frozen?'ARCHIVE GELÉE':'HYPOTHÈSES + PAPER TRADES')+'</span>'+
      '<span class="v5-warn">'+(frozen?'MOTEUR V5 ARRÊTÉ / ANCIENNE LECTURE':'ORDRES RÉELS DÉSACTIVÉS')+
      '</span></div>'+
      (frozen?'<div class="v5-row v5-warn">Dernière hypothèse du '+time(o.sourceAt||d.lastPaperAt)+
        ' (heure de Stockholm). Ces preuves sont HISTORIQUES et ne décrivent PAS le marché actuel.</div>':'')+
      '<div class="v5-row">MCB15 '+escTrade(d.confirmedE15||'—').toUpperCase()+
      ' · Live '+escTrade(d.liveE15||'—').toUpperCase()+
      ' · '+Number(m.segments||0)+' segments E15 · '+Number(m.unresolvedLinks||0)+
      ' relations à étudier</div>'+
      '<div class="v5-row"><b>'+(frozen?'ANCIENNE HYPOTHÈSE ':'HYPOTHÈSE ')+
        escTrade((o.direction||'INDECISE').toUpperCase())+
      '</b> · '+escTrade(o.phase||'INITIALISATION')+
      '<div>'+escTrade(o.hypothesis||'Premières observations…')+'</div></div>'+
      '<div class="v5-row">'+evidence+contrary+'</div>'+
      '<div class="v5-row">'+(frozen?'PM historique ':'PM Live ')+signed(v.pmLive)+
      ' $ · '+(frozen?'QUALITÉ historique ':'QUALITÉ ')+escTrade(v.quality||'—')+
      ' · <b>4×15m HISTORIQUE</b> ('+Math.round((Number(m.qualityCoverage)||0)*100)+'% observations)</div>'+
      '<div class="v5-quality-grid">'+bar+'</div>'+
      '<div class="v5-row"><b>PAPER</b> · '+Number(p.completed||0)+' trade(s) clôturé(s)'+
      ' · '+Number(p.wins||0)+' gagnant(s) · PNL net '+signed(p.realizedUsd)+
      ' $ · Equity '+fmt(p.equityUsd)+' $ · frais inclus</div>'+
      posHtml+trades+
      '<div class="v5-muted">V5 distinct de V4.10.10 · '+(frozen?'DERNIÈRE observation figée ':'observation ')+
      time(d.lastPaperAt||d.updatedAt)+
      ' · heures des preuves converties depuis UTC vers Stockholm. Frais taker modélisés, slippage et funding non modélisés.</div>';
    if(frozen)v5PaperArchiveHtmlCache=elNow.innerHTML;
  }catch(err){
    const elNow=document.getElementById('v5-paper-live');
    if(elNow)elNow.textContent='V5 paper indisponible : '+err.message;
  }finally{v5PanelLoading=false;}
}
// Structural V5 is the *current* analysis; separate 30s low-bandwidth poll.
// This never calls /api/trades and continues even when V4 state is stale.
// V5.2 independently refreshed, very small payload. V4.9.3 runs behind it.
let v52Pending=false,v493Pending=false;
function renderV52Living(data){
 const el=document.getElementById('v52-live');if(!el)return;
 const a=data.analysis||{},r=a.readings||{},m=r.mcb15||{},g=r.geometry||{},
  c=r.conversion||{},pl=r.place||{},eco=r.economics||{},
  mat=r.maturity||{},chain=r.causalChain||{},p=data.position||null;
 const n=x=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':Number(x).toFixed(1);
 const f=x=>escTrade(String(x===null||x===undefined?'—':x));
 const pos=x=>x==='long'?'long':x==='short'?'short':'';
 const sn=x=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':
  (Number(x)>=0?'+':'')+Number(x).toFixed(1);
 const age=Math.round((Date.now()-Number(data.updatedAt||0))/1000);
 const stale=age<0||age>90||a.quality!=='DATA_OK';
 const act=a.action||data.decision?.action||'WAIT';
 const theme=p?pos(p.direction):(act==='ENTER_LONG'?'long':act==='ENTER_SHORT'?'short':'');
 const cross3=g.cross3||{},cross15=g.cross15||{};
 const cell=(css,title,v,detail)=>
  '<div class="v52-cell '+css+'"><div class="title">'+title+'</div>'+
  '<div class="value">'+v+'</div><div>'+detail+'</div></div>';
 // Causal chain telemetry is observed by Elastic/Audit and has NO trading authority.
 const observed=data.causalEvents||{},ch15=observed.tf15||{},ch3=observed.tf3||{};
 const ma=r.maContract||{},ma3=ma.ma3||{},ma15=ma.ma15||{},zone=ma.activeZone||{},
  requal=r.e15Requalification||{},maProof=requal.ma3||{},
  campaign=r.conversionCampaign||{},s54=r.structural54||{},
  origin2h=s54.origins?.m120||{},origin30=s54.origins?.m30||{};
 const three=r.mcb3||{},band=observed.extremeBand||{};
 const div15=(r.attention?.events||[]).filter(e=>
  e.kind==='MCB15_LBW_DIVERGENCE').at(-1)||null;
 const divRegime15=r.attention?.polarityRegime||null;
 const maCycle=x=>{
  const q=x?.polarityMemory||{},s=q.polarity==='ABOVE'?'AU-DESSUS':
   q.polarity==='BELOW'?'AU-DESSOUS':'INCONNUE';
  const c=Number.isInteger(q.retestsSinceChange)?
   (q.countIsPartial?'≥':'')+q.retestsSinceChange:'—';
  const since=q.polarityChangeObserved&&q.polarityChangedAt?
   v5Time(q.polarityChangedAt):'avant couverture';
  return 'polarité '+s+' · retests '+c+' depuis '+since;
 };
 const eventTone=d=>d==='long'?'v53-up':d==='short'?'v53-down':'v53-neutral';
 const sideName=d=>d==='long'?'UP':d==='short'?'DN':'—';
 const proofRow=(label,e)=>{
  const usable=!!(e&&Number.isFinite(Number(e.observedAt)));
  const pm=usable&&e.pmQuality==='BATON_PLUS_EVENT_PRICE'?
   'PM Live '+sn(e.pmLive)+' $':'PM Live —';
  const oldMinutes=usable&&Number.isFinite(Number(e.ageMinutes))?
    Math.max(0,Math.floor(e.ageMinutes)):null;
  const historic=usable&&e.historyOnly&&oldMinutes!==null?
    ' · mémoire '+(oldMinutes>=60?
      Math.floor(oldMinutes/60)+'h'+String(oldMinutes%60).padStart(2,'0'):
      oldMinutes+'min'):'';
  return '<div class="v53-proof-row"><span class="v53-proof-key">'+label+'</span>'+
    '<b class="'+eventTone(e?.direction)+'">'+sideName(e?.direction)+'</b>'+
    '<span class="v53-proof-hour">'+(usable?v5Time(e.observedAt)+historic:'—')+'</span>'+
    '<span class="v53-proof-pm">'+pm+'</span></div>';
 };
 const alignment=observed.alignment==='ALIGNED'?'3m et 15m alignés':
   observed.alignment==='TACTICAL_OPPOSES_15M'?'3m opposé au 15m':'Alignement indéterminé';
 const state15=ch15.interrupted?' · Live interrompu':'';
 const state3=ch3.interrupted?' · Live interrompu':'';
 const  discrepancy15=ch15.cross&&ch15.live&&ch15.cross.direction!==ch15.live.direction;
 const discrepancy3=ch3.cross&&ch3.live&&ch3.cross.direction!==ch3.live.direction;
 const c3Txt=cross3.ts?v5Time(cross3.ts)+' '+f(cross3.direction)+' · pente '+n(cross3.slopePerMinute):'non daté';
 const c15Txt=cross15.ts?v5Time(cross15.ts)+' '+f(cross15.direction)+' · pente '+n(cross15.slopePerMinute):'non daté';
 const event=data.latestAction&&data.latestAction.ts?
  f(data.latestAction.type)+' '+v5Time(data.latestAction.ts):'aucune encore';
 const inv=a.invalidation||{};
 const status=stale?'DÉGRADÉ':act;
 const card=
  '<div class="v52-primary"><span>BOONO V5.4.3 · ÉTAT VIVANT</span>'+
  '<span class="v52-pill '+(stale?'warn':theme)+'">'+f(status)+'</span></div>'+
  '<div class="v52-strip"><b class="v53-btc-price">BTC '+n(a.price??data.position?.lastPrice)+' $</b>'+
  '<span>relevé '+v5Time(data.updatedAt)+' · '+age+'s · PAPER 0$</span></div>'+
  (stale?'<div class="v52-warn">Vérifier la fraîcheur des sources ; aucune entrée nouvelle autorisée.</div>':'')+
  '<div class="v52-grid">'+
   cell('mcb','1 · MCB15 · DIRECTEUR','LBW15 '+n(m.lbw)+' / BW15 '+n(m.bw),
    '<div class="v53-phase-caption">Offensive <b class="'+eventTone(m.currentOffensive)+'">'+
    sideName(m.currentOffensive)+'</b> · trajectoire mémorisée '+f(m.trajectory)+
    ' · MF15 '+sn(m.mf15??m.mf)+' / Δ10m '+sn(m.mf15Delta10m)+'</div>'+
    '<div class="v53-phase-caption">Bande haute : LBW15 ≥ +60 '+
     (band.highLBW60?'<b class="v53-up">ATTEINTE</b>':'non')+
     ' · bande basse : BW15 ≤ −60 '+(band.lowBWMinus60?'<b class="v53-down">ATTEINTE</b>':'non')+
     ' · simple repère, pas un veto</div>'+
    proofRow('Cross15',ch15.cross)+
    proofRow('E15 Live',ch15.live)+
    proofRow('E15 confirmé',ch15.confirmed)+
    ((state15||discrepancy15)?'<div class="v53-cross-note">'+
      (discrepancy15?'Croisement et dernier E15 Live de sens différent. ':'')+
      state15+'</div>':'')+
    '<div class="v52-muted">LBW/BW spread15 '+n(m.bwLbwSpread)+
     ' · pivot confirmé '+v5Time(m.structuralPivotAt)+
     ' · 1h '+f(s54.context1h||m.context1h)+' / 4h '+f(s54.context4h||m.context4h)+'</div>'+
    (s54.available?'<div class="v52-muted"><b>CAMPAGNE V5.4.3</b> '+f(s54.director)+
      ' · origine '+v5Time(s54.structuralOrigin?.sourceTs)+
      ' · disponible '+v5Time(s54.structuralOrigin?.availableAt)+
      ' · '+f(s54.strategicState)+'</div>'+
      '<div class="v52-muted">LBW15 géométrique ≠ E15 natif · '+
       f(s54.nativeE15?.confirmed?.direction||'—')+' source '+
       v5Time(s54.nativeE15?.confirmed?.sourceTs)+
       ' · connu '+v5Time(s54.nativeE15?.confirmed?.availableAt)+'</div>':'')+
    (divRegime15?'<div class="v52-muted"><b>RÉGIME DE FRAÎCHEUR 15m</b> · MA15 '+
      f(divRegime15.side||'INCONNU')+' · confirmé '+
      v5Time(divRegime15.confirmedAt)+
      (divRegime15.status==='CONFIRMED_REGIME'?
       ' · ancres limitées à ce régime MA15':
       ' · continuité MA15 non démontrée')+
      ' · sans autorité de trade</div>':'')+
    (div15?'<div class="v52-muted"><b>DIV15 LBW / PRIX · '+
     (div15.direction==='long'?'UP':'DN')+'</b> · prix '+
      n(div15.anchors?.priceFirst)+' → '+n(div15.anchors?.priceSecond)+
     ' $ · LBW15 '+sn(div15.anchors?.lbwFirst)+' → '+
     sn(div15.anchors?.lbwSecond)+' · connue '+v5Time(div15.availableAt)+
     ' · '+f(div15.quality||'OBSERVATION')+
     ' · points '+Number(div15.points?.length||0)+
     ' · sans autorité de trade</div>':'') )+
   cell('geom','2 · MCB3 · TACTIQUE','LBW3 '+n(three.lbw)+' / BW3 '+n(three.bw),
    '<div class="v53-phase-caption">Tactique '+f(mat.maturity)+
      ' · MF3 '+sn(three.mf)+' / Δ3m '+sn(c.mf3Delta3m)+'</div>'+
    proofRow('Cross3',ch3.cross)+
    proofRow('E3 Live',ch3.live)+
    proofRow('E3 confirmé',ch3.confirmed)+
    ((state3||discrepancy3)?'<div class="v53-cross-note">'+
      (discrepancy3?'Croisement et dernier E3 Live de sens différent. ':'')+
      state3+'</div>':'')+
    '<div class="v52-muted">V5.4.3 : '+f(s54.phase||'tactique héritée')+
     ' · pivot LBW3 (mémoire, sans veto) '+f(s54.mcb3?.direction||'—')+
     (s54.sourceFreshness?.firstNewBarSnapshotPending?
       ' · nouvelle bougie : premier relevé en attente (données précédentes fraîches)':'')+
     '</div>'+
    (s54.nativeE3?'<div class="v52-muted">E3 natif '+
      f(s54.nativeE3.confirmed?.direction||'—')+
      ' · source '+v5Time(s54.nativeE3.confirmed?.sourceTs)+
      ' · disponible '+v5Time(s54.nativeE3.confirmed?.availableAt)+
      ' · cross '+v5Time(s54.mcb3?.cross?.ts)+
      ' · preuve '+f(s54.tacticalAdmission?.reason||'—')+'</div>':'')+
    '<div class="v52-muted">'+f(alignment)+
     ' · déplacement depuis cross3 '+n(c.sinceCross)+' $ BTC'+
     ' · âge '+n(mat.cross3AgeMin)+' min (informatif)</div>'+
    '<div class="v52-muted">PM Live à chaque événement = Bâton + prix observé ensuite ;'+
     ' E3 et Cross3 appartiennent à une seule famille, sans ordre de validation imposé.</div>')+
   cell('place','3 · LIEU',''+f(pl.nearest?.key||'frontière inconnue')+
    ' '+n(pl.nearest?.price)+' $',
    'Frontière cartographiée (contexte, sans veto)'+
    '<div class="v52-muted">MA3 '+f(ma3.state||'—')+
     ' · distance '+sn(ma3.distanceUsd)+' $ · approche '+n(ma3.approachUsd)+
     ' $ · preuve '+f(maProof.status||'—')+'</div>'+
    '<div class="v52-muted">'+f(maCycle(ma3))+'</div>'+
    '<div class="v52-muted">Rejet MA3 '+
     (ma3.polarityMemory?.lastRejection?.at?
      v5Time(ma3.polarityMemory.lastRejection.at):'—')+
     ' · reconquête échouée '+
     (ma3.polarityMemory?.lastFailedReclaim?.at?
      v5Time(ma3.polarityMemory.lastFailedReclaim.at):'—')+'</div>'+
    '<div class="v52-muted">MA15 '+f(ma15.state||'—')+
     ' · distance '+sn(ma15.distanceUsd)+' $ · approche '+n(ma15.approachUsd)+' $</div>'+
    '<div class="v52-muted">'+f(maCycle(ma15))+' (compteur informatif)</div>'+
    (s54.available?'<div class="v52-muted">ORIGINE 2h '+
      n(origin2h.low)+' – '+n(origin2h.high)+' $ · place '+
      n(origin2h.positionInPriceRange)+' · 30m Δ '+
      sn(origin30.directionalPriceChange)+' $</div>':'')+
    '<div class="v52-muted">Zone active '+f(zone.name||'AUCUNE')+
     (zone.name?' ['+n(zone.lower)+' / '+n(zone.upper)+']':'')+
     ' · une seule confrontation · '+f(ma.entryGate?.reason||'MA contexte')+'</div>'+
    (s54.testedTerritory?'<div class="v52-muted">Territoire '+f(s54.testedTerritory.status)+
      ' · preuve '+v5Time(s54.testedTerritory.availableAt)+'</div>':'')+
    '<div class="v52-muted">Ancre de risque '+f(pl.anchor?.key||'NON DÉMONTRÉE')+
     ' '+n(pl.anchor?.price)+' $ · disponible '+v5Time(pl.anchor?.availableAt)+'</div>')+
   cell('conv','4. CONVERSION. PM <span id="v52-mini-conversion-status">OKX · attente</span>',
    '',
    '<div id="v52-mini-conversion" class="v52-mini-conversion" role="group"'+
      ' aria-label="Prix BTC en bougies 3m, duel des acheteurs et vendeurs, conversion live">'+
     '<div class="v52-mini-price-row"><strong class="v52-mini-btc-price"'+
       ' id="v52-mini-btc-price">BTC —</strong></div>'+
     '<div id="v52-mini-conversion-svg" class="v52-mini-chart"></div>'+
     '<div class="v52-mini-volume" aria-label="Volumes initiateurs BTC sur trois minutes">'+
      '<span class="buy" title="Volume acheteur initiateur sur trois minutes">'+
       '<b id="v52-mini-buy">—</b></span>'+
      '<span class="sell" title="Volume vendeur initiateur sur trois minutes">'+
       '<b id="v52-mini-sell">—</b></span></div>'+
     '<div class="v52-mini-delta" id="v52-mini-delta">Δ BTC 3m —</div>'+
     '<div class="v52-mini-price-deport" id="v52-mini-price-deport"'+
      ' title="Déplacement net BTC sur 3m divisé par amplitude haut-bas BTC sur 3m. Mesure normalisée du déport entre axe bleu et contact des cubes, distincte des volumes et de eff3.">Déport prix —</div>'+
     '<div class="v52-mini-hours">'+
      '<span>Début <b id="v52-mini-begin">—</b></span>'+
      '<span>Fin <b id="v52-mini-end">—</b></span></div>'+
     '<div class="v52-mini-mf">MF3 Δ3m '+sn(c.mf3Delta3m)+
      ' · MF15 Δ10m '+sn(m.mf15Delta10m)+
      ' · cohérence '+f(r.flow15?.qualityGrade||r.flow15?.coherence||'—')+
      ' · MF15 '+f(r.flow15?.mf15Role||'—')+
      ' · '+n(c.intervalSeconds)+'s après Bâton</div>'+
     '<div class="v52-mini-foot v52-mini-pm v52-mini-baton">Bâton '+
      sn(c.pmLastBaton)+' $ · depuis '+sn(c.pmSinceBaton)+' $</div>'+
     '<div class="v52-mini-foot v52-mini-pm" id="v52-mini-pm">PM3 — · PM5 — · Live —</div>'+
     '<div class="v52-mini-foot" id="v52-mini-eff">eff3 — · yield/P75 — · effort/P75 —</div>'+
     '<div class="v52-mini-foot v52-mini-speed v52-conv-speed">Vitesse 3m '+
      sn(mat.recent3mRateUsdPerMin)+' $/min</div>'+
     '<div class="v52-mini-foot" id="v52-mini-quality">Qualité — · direction —</div>'+
    '</div>')+
   cell('prognosis','5 · PRONOSTIC',f(a.candidate||'NEUTRE').toUpperCase(),
    f(a.prognosis||'—')+
    (s54.available?'<div class="v52-muted">PHASE STRUCTURELLE '+
      f(s54.phase)+' · campagne '+f(s54.campaignId)+
      ' · maturité rang2h '+n(s54.priceRangeRank)+
      ' · MF15 sur 2h '+sn(s54.mf15History2h)+
      ' · maturité extension '+(s54.matureAfterExtension?'AVANCÉE':'mesurée')+'</div>':
    '<div class="v52-muted">Nouvelle preuve E15 '+v5Time(requal.proofAt)+
    ' · fenêtre '+f(requal.window||'—')+
    ' · conversion '+f(requal.conversion?.quality||'—')+
    ' · MF '+f(requal.mfQuality||'—')+
    ' · progression depuis E15 '+n(requal.priceTravelIn15Ranges)+'×15m</div>'+
    (campaign.engaged?'<div class="v52-muted">MCB15 engagé · pic mémorisé '+
      f(campaign.peakQuality)+' '+v5Time(campaign.lastPowerfulAt||campaign.lastProductiveAt)+
      ' · conversion actuelle '+f(campaign.currentQuality)+
      ' · '+f(campaign.moment)+' · timing '+f(campaign.timing)+'</div>':
      '<div class="v52-muted">Mémoire de conversion : '+f(campaign.thesis||'—')+'</div>')))+
   cell('decision','6 · DÉCISION + INVALIDATION',f(act),
    f(a.reason||'—')+'<div class="v52-muted">Invalidation '+n(inv.price)+
    ' $ · '+f(inv.reference)+' · distance '+n(inv.distanceUsd)+
    ' $ · ancre connue '+v5Time(inv.confirmedAvailableAt)+
    ' · MA partage maturité/risque : '+f(ma.riskCandidate?.reference||'non activée')+
    ' · rejet MA réellement prouvé '+(maProof.blocked?'OUI':'non')+'</div>')+
  '</div>'+
  '<div class="v52-strip"><span><b>CHAÎNE CAUSALE · observation</b> PM Live '+
    sn(c.pmCombined)+' $ · Cross3 '+v5Time(ch3.cross?.observedAt)+
    ' → E3 Live '+v5Time(ch3.live?.observedAt)+
    ' → E3 confirmé '+v5Time(ch3.confirmed?.observedAt)+
    ' → Cross15 '+v5Time(ch15.cross?.observedAt)+
    ' → E15 Live '+v5Time(ch15.live?.observedAt)+
    ' → E15 confirmé '+v5Time(ch15.confirmed?.observedAt)+
    '<span class="v52-muted"> · jalons observés, ordre réel non imposé ; chaque PM est daté dans sa colonne</span>'+
    '</span></div>'+
  '<div class="v52-strip"><span><b>ATTENTION V5.4.3</b> '+
   f(r.attention?.stage||'—')+' · preuves '+Number(r.attention?.events?.length||0)+
   '</span><span>V4.9.3 SHADOW '+f(r.admissionV493Shadow?.action||'EN ATTENTE')+
   ' · âge '+(r.admissionV493Shadow?n(r.admissionV493Shadow.ageMs/1000):'—')+
   ' s · aucune autorité de trade</span></div>'+
  (r.offensiveMaturity?'<div class="v52-strip"><span><b>MATURITÉ OFFENSIVE</b> '+
   f(r.offensiveMaturity.classification||'—')+
   ' · début prix 4h '+v5Time(r.offensiveMaturity.context?.priceOrigin?.origin4h?.availableAt)+
   ' · progression '+n(r.offensiveMaturity.context?.priceOrigin?.origin4h?.progressUsd)+' $ BTC'+
   ' · bord 2h '+f(r.offensiveMaturity.context?.priceGeometry?.priceAt2hExtreme?'oui':'non')+
   '</span><span>LBW15/prix '+f(r.offensiveMaturity.context?.oscillator?.oppositeDivergenceForming?'divergence en formation':'pas de preuve opposée')+
   ' · PM marginal '+f(r.offensiveMaturity.context?.conversion?.conversionFatigue?'s’essouffle':'non invalidé')+
   (a.checks?.offensiveMaturityBlocksNewAdmission?
    ' · entrée DIFFÉRÉE · requalification possible':'')+
   '</span></div>':'')+
  '<div class="v52-strip"><span><b>RISQUE</b> plafond −500$ BTC · floors +120/90 et +220/180</span>'+
   '<span>Frais A/R estimés '+n(eco.expectedFeesUsd)+' $ · mobilité observée '+
     n(eco.empiricalMobilityUsd)+' $ BTC · niveau proche non-veto</span></div>'+
  (p?'<div class="v52-ledger"><b class="'+(p.direction==='long'?'v52-green':'v52-red')+'">POSITION '+f(p.direction).toUpperCase()+'</b>'+
   ' · entrée '+n(p.entryPrice)+' $ · '+v5Time(p.entryAt)+
   ' · P&L net potentiel '+sn(p.lastNetPnlUsd)+' $'+
   '<div>MFE '+n(p.mfePriceUsd)+' $ BTC · MAE '+n(p.maePriceUsd)+
   ' $ · plancher '+n(p.gainFloorUsd)+' $ · invalidation '+n(p.invalidationPrice)+' $</div></div>':
   '<div class="v52-ledger">FLAT · '+f(data.lastReason||a.reason||'étude de la prochaine ouverture')+'</div>')+
  '<div class="v52-muted">PAPER V5.4.3 · '+Number(data.completed||0)+' clôtures · '+Number(data.wins||0)+
   ' gagnantes · net '+sn(data.realizedUsd)+' $ · equity '+n(data.equityUsd)+
   ' $ · dernière action '+event+' · pas d’ordre broker financé</div>';
 el.innerHTML=card;
 // BOONO Watch rebuilds this cell on refresh; restore the cached mini chart
 // immediately rather than waiting for another OKX trade or chart request.
 if(typeof window!=='undefined'&&window.BoonoMiniConversion)
  window.BoonoMiniConversion.refresh();
}
async function loadV52PaperPanel(){
 const el=document.getElementById('v52-live');
 const tab=document.getElementById('tab2-statev2');
 if(!el||!tab?.classList.contains('active')||document.hidden||v52Pending)return;
 v52Pending=true;
 try{
  const resp=await fetch('/api/v52',{cache:'no-store'});
  if(!resp.ok)throw Error('HTTP '+resp.status);
  const data=await resp.json();
  if(data.brokerOrdersEnabled!==false)throw Error('PAPER_AUTHORITY_NOT_VERIFIED');
  data.lastReason=data.analysis?.reason||data.decision?.reason||null;
  if(window.elasticConversionV541)
    window.elasticConversionV541.setAnalysis(data.analysis);
  renderV52Living(data);
 }catch(e){if(el)el.textContent='V5.4.3 PAPER · indisponible : '+e.message;}
 finally{v52Pending=false;}
}
// Independent experiment: book-estimated X-Perp fills for the SAME PAPER signals.
let executionLabPending=false;
async function loadExecutionLabPanel(){
 const el=document.getElementById('execution-lab-live');
 const tab=document.getElementById('tab2-statev2');
 if(!el||!tab?.classList.contains('active')||document.hidden||executionLabPending)return;
 executionLabPending=true;
 try{
  const res=await fetch('/api/execution-lab',{cache:'no-store'});
  if(!res.ok)throw Error('HTTP '+res.status);
  const x=await res.json(),s=x.statistics||{},book=x.book||{},a=x.active||{};
  if(x.fundedOrders!==false)throw Error('LAB_AUTHORITY_NOT_VERIFIED');
  const fmt=z=>z===null||z===undefined||!Number.isFinite(Number(z))?'—':Number(z).toFixed(2);
  const name=z=>escTrade(String(z===null||z===undefined?'—':z));
  const fresh=book.status==='FRESH'&&Date.now()-Number(book.lastReceivedAt||0)<3500;
  const comparisons=Number(s.matched3||0);
  el.innerHTML='<div class="v52-strip"><b>BTC X-PERP · CARNET PUBLIC</b>'+
    '<span>'+name(fresh?'BOOK5 FRESH':book.status||'NO BOOK')+
    ' · bid '+fmt(book.bid)+' / ask '+fmt(book.ask)+
    ' · spread '+fmt(book.spread)+' $</span></div>'+
    '<div class="v5-row"><b>MODE A · PAPER initial</b> · signal au dernier prix BTC-USDT-SWAP'+
    ' · '+Number(s.closed||0)+' clôtures observées</div>'+
    '<div class="v5-row"><b>MODE B · TAKER IOC estimé</b> · '+
    Number(s.modeBFull||0)+' remplissages complets'+
    ' · '+Number(s.modeBPartial||0)+' partiels'+
    ' · '+Number(s.noQuoteB||0)+' sans carnet frais</div>'+
    '<div class="v5-row"><b>MODE C · DÉCLENCHEMENT + IOC</b> · '+
    Number(s.modeCTriggered||0)+' déclenchements'+
    ' · '+Number(s.modeCFull||0)+' complets'+
    ' · '+Number(s.expiredC||0)+' expirés</div>'+
    '<div class="v5-row"><b>COMPARAISON TRIPLE</b> '+comparisons+
    ' campagnes entièrement comparables · net A '+fmt(s.matchedSumA)+
    ' $ · B '+fmt(s.matchedSumB)+' $ · C '+fmt(s.matchedSumC)+' $</div>'+
    (a.signalTs?'<div class="v5-row">EN COURS · '+name(a.direction)+
       ' · signal '+v5Time(a.signalTs)+
       ' · B '+name(a.BStatus)+' @ '+fmt(a.BFillPx)+
       ' · C '+name(a.CStatus)+' @ '+fmt(a.CFillPx)+
       ' · tolérance '+fmt(a.offsetUsd)+' $'+
       ' · déclencheur '+fmt(a.triggerUsd)+' $</div>':
      '<div class="v5-row">FLAT · prochain signal observé</div>')+
    ((x.latest||[]).length?'<div class="v5-row"><b>DERNIÈRE CLÔTURE</b> #'+
      name(x.latest[0].tradeNo)+' '+name(x.latest[0].direction)+
      ' · A '+fmt(x.latest[0].baselineNetUsd)+' $'+
      ' · B '+fmt(x.latest[0].bNetUsd)+' $'+
      ' · C '+fmt(x.latest[0].cNetUsd)+' $'+
      ' · '+name(x.latest[0].result)+'</div>':'')+
    '<div class="v52-muted">Observations prospectives seulement : aucun ordre OKX.'+
    ' Estimations IOC à partir des 5 meilleurs niveaux publics,'+
    ' pas des exécutions garanties. Frais taker 0,05 %/côté modélisés.'+
    ' Le PNL A (contrat analyse) et les PNL B/C (X-Perp) ne sont'+
    ' directement comparables que pour les campagnes réellement remplies.</div>';
 }catch(e){el.textContent='LAB EXÉCUTION PAPER · en attente : '+e.message;}
 finally{executionLabPending=false;}
}
async function loadV493Panel(){
 const el=document.getElementById('v493-live'),tab=document.getElementById('tab2-statev2');
 if(!el||!tab?.classList.contains('active')||document.hidden||v493Pending)return;
 v493Pending=true;
 try{
  const resp=await fetch('/api/v493',{cache:'no-store'});
  if(!resp.ok)throw Error('HTTP '+resp.status);
  const x=await resp.json(),d=x.decision||{},p=x.position||null;
  const n=z=>z===null||z===undefined||!Number.isFinite(Number(z))?'—':Number(z).toFixed(1);
  const age=Math.round((Date.now()-Number(x.updatedAt||0))/1000);
  el.innerHTML='<div class="v52-strip"><b>V4.9.4 · MÉMOIRE TEMPORELLE ACTIVE</b>'+
   '<span>'+x.completed+' trades · '+x.wins+' gagnants · net '+n(x.realizedUsd)+' $</span></div>'+
   '<div class="v5-row">Code historique <b>'+escTrade(x.engineVersion||'v4.9.3')+
    '</b> · commit '+escTrade(x.gitRef||'—')+' · '+escTrade(x.mode||'PAPER')+'</div>'+
   '<div class="v5-row">ACTION '+escTrade(d.type||'—')+' · '+escTrade(d.reason||'—')+
   ' · source '+v5Time(x.updatedAt)+' · âge '+age+'s</div>'+
   '<div class="v5-row"><b>ATTENTION</b> '+escTrade(x.attention?.stage||'—')+
   ' · preuves '+Number(x.attention?.events||0)+
   ' · autorité d’exécution inchangée</div>'+
   (p?'<div class="v5-row"><b>POSITION '+escTrade(p.direction.toUpperCase())+'</b> @ '+n(p.entryPrice)+
   ' · MFE '+n(p.metrics?.mfeUsd)+' · MAE '+n(p.metrics?.maeUsd)+'</div>':
   '<div class="v5-row">FLAT</div>')+
   '<div class="v5-muted">PAPER indépendant, mêmes sources marché, frais modélisés, aucune écriture V4 active.</div>';
 }catch(e){if(el)el.textContent='V4.9.4 indisponible : '+e.message;}
 finally{v493Pending=false;}
}
setInterval(loadV52PaperPanel,10000);
setInterval(loadExecutionLabPanel,15000);
setInterval(loadV493Panel,30000);

let v5StructuralLivePending=false;
let v5StructuralLiveLast=null;
const v5Time=ms=>ms?new Date(Number(ms)).toLocaleTimeString('fr-FR',
  {timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
function renderV5StructuralLive(a){
 const el=document.getElementById('v5-structure-live');if(!el)return;
 const n=x=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':Number(x).toFixed(1);
 const signed=x=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':
   (Number(x)>0?'+':'')+Number(x).toFixed(1);
 const safe=x=>escTrade(String(x===undefined||x===null?'—':x));
 const S=a.structure||{},J=a.enjeu||{},B=a.boundary||{},
       H=a.horizon||{},C=a.conversion||{},A=a.attempts||{},I=a.integrity||{};
 const age=Math.max(0,Date.now()-Number(a.ts||0));
 const stale=!a.ts||age>150000||I.dataIntegrity!=='ASOF_OK';
 const slow=I.elasticEventStatus!=='EVENT_STREAM_OBSERVED';
 const area=J.valueArea||'VALUE_UNKNOWN';
 const level=J.profileFrontier||J.nearest||null;
 const crossing=level?'<b>'+safe(level.key)+' '+n(level.price)+' $</b>':'frontière non déterminée';
 const a0=(a.scenarios||[]).slice(0,2).map(x=>
   '<div class="v5-row"><b>'+safe(x.kind)+'</b> · '+safe(x.required)+'</div>').join('');
 const trail=(a.recentChanges||[]).slice(-4).reverse().map(x=>
   '<div class="v5-muted">'+v5Time(x.ts)+' · BTC '+n(x.price)+
   ' $ · '+safe(x.phase)+(Number(x.materialEvents||0)?
     ' · '+Number(x.materialEvents)+' événement(s)':'')+'</div>').join('');
 const price= n(a.price);
 el.innerHTML=
   '<div class="v5-head"><span>V5.4.3 · STRUCTURE VIVANTE</span>'+
     '<span style="color:#08794a;">OBSERVATION SEULE · AUCUN TRADE</span></div>'+
   '<div class="v5-row"><b>BTC '+price+' $</b> · relevé '+v5Time(a.ts)+
     ' (Stockholm) · âge '+Math.round(age/1000)+' s</div>'+
   (stale?'<div class="v5-row v5-warn">SOURCE STRUCTURELLE PÉRIMÉE : ne pas interpréter comme un signal actuel.</div>':'')+
   (slow?'<div class="v5-row v5-warn">Événements Elastic non récents : aucune synchro E3/E15 actuelle présumée.</div>':'')+
   '<div class="v5-row"><b>ENJEU</b> '+safe(area)+' · frontière '+crossing+
     ' · état '+safe(B.stage||'non testé')+'</div>'+
   '<div class="v5-row"><b>VAGUES</b> 15m '+safe(S.direction||'inconnue').toUpperCase()+
     ' · 1h '+safe(S.context1h||'inconnu').toUpperCase()+
     ' · 4h '+safe(S.context4h||'inconnu').toUpperCase()+
     ' · E3 '+safe(S.childDirection||'inconnu').toUpperCase()+'</div>'+
   '<div class="v5-row"><b>PHÉNOMÈNE</b> '+safe(a.phase)+
     ' · E15 UP '+Number(A.e15Up3h||0)+'/3h · E3 UP '+Number(A.e3Up90m||0)+'/90m'+
     ' <span class="v5-muted">(tentatives reconnues, pas votes)</span></div>'+
   '<div class="v5-row"><b>EFFETS</b> prix Δ1h '+signed(H.priceNet1h)+' $'+
     ' · MF15 Δ1h '+signed(H.mf15Delta1h)+
     ' · PM Live '+signed(C.pmLive)+' $'+
     ' · QUALITÉ '+safe(C.quality||'non disponible')+' (descriptif)</div>'+
   '<div class="v5-row"><b>SCÉNARIOS CONDITIONNELS</b>'+a0+'</div>'+
   '<div class="v5-row"><b>ÉVOLUTION OBSERVÉE</b>'+trail+'</div>'+
   '<div class="v5-row"><b>PREUVES</b> '+(a.evidence||[]).slice(0,3).map(safe).join(' · ')+'</div>'+
   ((a.contradictions||[]).length?'<div class="v5-row"><b>CONTRADICTIONS</b> '+
      a.contradictions.slice(0,3).map(safe).join(' · ')+'</div>':'')+
   '<div class="v5-muted">Lecture MCB / niveaux / prix actuelle. V5 PAPER figé ci-dessous. '+
     'Ni hypothèse macro imposée, ni ordre automatique.</div>';
}
async function loadV5StructureLive(){
 const tab=document.getElementById('tab2-statev2');
 const main=document.querySelector('.main-nav-item[data-main="trades"]');
 if(!tab||!tab.classList.contains('active')||
    main&&!main.classList.contains('active')||document.hidden||v5StructuralLivePending)return;
 v5StructuralLivePending=true;
 try{
   const r=await fetch('/api/v5-structure',{cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!r.ok)throw Error('HTTP '+r.status);
   const result=await r.json();
   v5StructuralLiveLast=result;
   renderV5StructuralLive(result);
 }catch(err){
   const el=document.getElementById('v5-structure-live');
   if(el)el.textContent='V5 STRUCTURE · Données non actualisées : '+err.message;
 }finally{v5StructuralLivePending=false;}
}
document.addEventListener('toggle',function(e){
 if(e.target&&e.target.id==='v5-paper-archive'&&e.target.open)loadV5PaperPanel();
},true);
setInterval(loadV5StructureLive,30000);
// Compact, real PAPER trade ledgers for the new primary V5.2 and baseline V4.9.3.
// The list is separate from V4 history; every RAPPORT opens the full report on demand.
let paperHistoryPending=false;
function renderPaperHistoryGroup(x,kind){
 const data=x||{},isV52=kind==='v52';
 const name=isV52?'V5.4.3':'V4.9.4',color=isV52?'#9c1f6f':'#1969a0';
 const prefix=isV52?'V52:':'V493:';
 const n=(v,d=1)=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':Number(v).toFixed(d);
 const signed=v=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':
   (Number(v)>0?'+':'')+Number(v).toFixed(2);
 const time=t=>t?waveParis(t):'—',f=x=>escTrade(String(x===null||x===undefined?'—':x));
 const cards=[];
 if(data.open){
  const p=data.open;
  cards.push('<div class="v52-ledger" style="border-left:3px solid '+color+'">'+
   '<b>'+paperTradeVersion(kind,p)+
   ' #'+f(p.tradeNo)+' · '+f(String(p.direction||'').toUpperCase())+
   ' · EN POSITION</b><div>Entrée '+time(p.entryAt)+' à '+n(p.entryPrice)+' $ BTC'+
   ' · prix '+n(p.lastPrice)+' $ · net estimé '+signed(p.lastNetPnlUsd)+' $</div>'+
   '<button type="button" class="wave-trade-report-btn" data-paper-report="'+prefix+
   Number(p.tradeNo)+'">RAPPORT</button></div>');
 }
 for(const t of data.trades||[]){
  const duration=Number.isFinite(Number(t.exitAt))&&Number.isFinite(Number(t.entryAt))?
    ((Number(t.exitAt)-Number(t.entryAt))/60000).toFixed(1)+' min':'—';
  const statusColor=Number(t.netPnlUsd)>=0?'#087245':'#b52b39';
  cards.push('<div class="v52-ledger" style="border-left:3px solid '+color+'">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">'+
    '<b>'+paperTradeVersion(kind,t)+
    ' #'+f(t.tradeNo)+' · '+f(String(t.direction||'').toUpperCase())+'</b>'+
    '<b style="color:'+statusColor+'">'+signed(t.netPnlUsd)+' $ net</b></div>'+
   '<div>Entrée '+time(t.entryAt)+' · '+n(t.entryPrice)+' $ BTC → sortie '+
    time(t.exitAt)+' · '+n(t.exitPrice)+' $ BTC · '+duration+'</div>'+
   '<div class="v52-muted">MFE +'+n(t.mfePriceUsd)+' $ · MAE −'+n(t.maePriceUsd)+
    ' $ · frais '+n(t.feesUsd,2)+' $ · '+f(t.exitReason)+'</div>'+
   '<div style="display:flex;justify-content:flex-end;margin-top:5px;">'+
    '<button type="button" class="wave-trade-report-btn" data-paper-report="'+prefix+
    Number(t.tradeNo)+'">RAPPORT</button></div></div>');
 }
 return '<div class="v52-strip"><b style="color:'+color+'">'+name+' PAPER · '+
  Number(data.completed||0)+' trade(s) clôturé(s)</b><span>'+
  Number(data.wins||0)+' gagnant(s) · net '+signed(data.realizedUsd)+' $'+
  ' · equity '+n(data.equityUsd)+' $</span></div>'+
  (cards.length?cards.join(''):'<div class="placeholder-note">Aucun trade pour ce simulateur.</div>');
}
async function loadPaperHistoryPanel(){
 const panel=document.getElementById('paperHistoryPanel');
 const tab=document.getElementById('tab2-historyv2');
 if(!panel||!tab||!tab.classList.contains('active')||document.hidden||paperHistoryPending)return;
 paperHistoryPending=true;
 try{
  const res=await fetch('/api/paper-history',{cache:'no-store'});
  if(!res.ok)throw Error('HTTP '+res.status);
  const d=await res.json();
  const wasOpen=!!panel.querySelector('#paperV493History[open]');
  panel.innerHTML='<div class="v5-observer v52-main"><div class="v52-primary">'+
    '<span>HISTORIQUE DES SIMULATIONS</span><span class="v52-pill">PAPER · sans ordre financé</span></div>'+
    '<div class="v52-muted">Entrée, sortie, MFE, MAE et P&L net. Chaque RAPPORT ouvre les preuves complètes.</div>'+
    renderPaperHistoryGroup(d.v52,'v52')+
    '<details id="paperV493History" style="margin-top:9px;" '+(wasOpen?'open':'')+'>'+
      '<summary style="font-weight:800;cursor:pointer;color:#1969a0;">V4.9.4 · Successeur du comparateur V4.9.3 ('+
        Number(d.v493?.completed||0)+' clôture(s))</summary>'+
       renderPaperHistoryGroup(d.v493,'v493')+'</details></div>';
 }catch(e){panel.textContent='Historique PAPER indisponible : '+e.message;}
 finally{paperHistoryPending=false;}
}
// PAPER histories are read ONLY when a user opens Historique.
// Never poll this endpoint while the tab remains open.
let tradesLoadInProgress=false;
async function loadTrades() {
  // Avoid overlapping network transfers on slow/mobile connections.
  if(tradesLoadInProgress||document.hidden)return;
  tradesLoadInProgress=true;
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
    const openElastic=Array.from(stateEl.querySelectorAll('details[data-elastic-chain][open]')).map(function(n){return n.dataset.elasticChain;});
    const archiveWasOpen=!!stateEl.querySelector('#v5-paper-archive[open]');
    const baselineWasOpen=!!stateEl.querySelector('#v493-details[open]');
    const labWasOpen=!stateEl.querySelector('#execution-lab-details')||
      !!stateEl.querySelector('#execution-lab-details[open]');
    const structureWasOpen=!!stateEl.querySelector('#v5-structure-details[open]');
    const legacyWasOpen=!!stateEl.querySelector('#v4-legacy-details[open]');
    stateEl.innerHTML =
      '<div id="v52-live" class="v5-observer v52-main">V5.4.3 PAPER · lecture de la décision en cours…</div>'+
      (window.renderElasticObserverV05?window.renderElasticObserverV05(current):renderElasticDualV04(current))+
      '<details id="execution-lab-details" class="v5-observer" '+(labWasOpen?'open':'')+'>'+
        '<summary style="cursor:pointer;font-weight:800;">EXÉCUTION LAB · A / B / C · X-PERP · PAPER UNIQUEMENT</summary>'+
        '<div id="execution-lab-live">Données du carnet en attente…</div></details>'+
      '<details id="v493-details" class="v5-observer" '+(baselineWasOpen?'open':'')+'>'+
        '<summary style="cursor:pointer;font-weight:800;">V4.9.4 · ÉCOUTE TEMPORELLE · V4.9.3 FIGÉ EN SOURCE</summary>'+
        '<div id="v493-live">Version historique chargement…</div></details>'+
      '<details id="v5-structure-details" class="v5-observer" '+(structureWasOpen?'open':'')+'>'+
        '<summary style="cursor:pointer;font-weight:800;">V5.4.3 · STRUCTURE DIRECTRICE · SOURCE DU MOTEUR</summary>'+
        '<div id="v5-structure-live">V5.4.1 · structure en cours…</div></details>'+
      '<details id="v5-paper-archive" class="v5-observer" '+(archiveWasOpen?'open':'')+'>'+
        '<summary style="cursor:pointer;font-weight:800;">V5.1 PAPER · ARCHIVE ARRÊTÉE · 22 trades clôturés</summary>'+
        '<div id="v5-paper-live">Historique PAPER sur demande…</div></details>'+
      '<details id="v4-legacy-details" class="v5-observer" '+(legacyWasOpen?'open':'')+'>'+
        '<summary style="cursor:pointer;font-weight:800;">V4.10.10 · ARCHIVE ARRÊTÉE / CONTRÔLE HISTORIQUE</summary>'+
        liveCard+living+posHtml+'</details>';
    loadV52PaperPanel();
    loadExecutionLabPanel();
    loadV493Panel();
    loadV5StructureLive();
    if(archiveWasOpen)loadV5PaperPanel();
    if(window.loadElasticObserverHistory)window.loadElasticObserverHistory();
    if(window.loadElasticChart3m)window.loadElasticChart3m(current);
    stateEl.querySelectorAll('details[data-elastic-chain]').forEach(function(n){n.open=openElastic.includes(n.dataset.elasticChain);});
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
    // V5.2 is the primary chronological ledger. Do not discard an open report
    // or reset the history scroll on a routine V4 30-second refresh.
    if(!historyEl.classList.contains('active')||!historyEl.querySelector('#paperHistoryPanel')){
      historyEl.innerHTML =
       '<div id="paperHistoryPanel">Chargement des trades PAPER V5.2.2 / V5.2 et V4.9.3…</div>'+
       '<details id="v4LegacyHistory" style="margin-top:12px;">'+
        '<summary style="cursor:pointer;font-weight:800;">V4.10.10 · ARCHIVE HISTORIQUE · '+
          executed.length+' trades (ancien moteur)</summary>'+
        summary+
        (executed.length?executed.map(renderV2HistoryRow).join(''):
         '<div class="placeholder-note">Aucun trade V4 clôturé.</div>')+'</details>'+
       '<details id="v3LegacyHistory" style="margin-top:6px;">'+
        '<summary style="cursor:pointer;font-weight:800;">V3 · ARCHIVE HISTORIQUE · '+
          archivedV3.length+' trades</summary>'+
        archiveSummary+
        (archivedV3.length?archivedV3.map(renderV2HistoryRow).join(''):'')+'</details>';
    }
    // History is loaded only by explicit Historique navigation, not by this
    // automatic 30-second live-state refresh.
    const reportTotal=Number(data.reportMeta&&data.reportMeta.totalCount)||0;
    if(v4ExpectedReportsCount!==reportTotal){
      v4ExpectedReportsCount=reportTotal;
      v4ReportsLoadedForCount=null;
      if(reportsEl)reportsEl.innerHTML='<div class="placeholder-note">Ouvrez l’onglet Rapports pour charger les derniers rapports détaillés (aucun téléchargement automatique).</div>';
    }
  } catch (e) {
    // An old V4 monitoring endpoint failure must not remove the live V5.2 panel.
    const legacy=stateEl&&stateEl.querySelector('#v4-legacy-details');
    if(legacy)legacy.innerHTML='<summary>V4.10.10 · CONTRÔLE TECHNIQUE</summary>'+
      '<div class="ledger-empty">V4 indisponible : '+escTrade(e.message)+'</div>';
    if(historyEl&&!historyEl.querySelector('#paperHistoryPanel'))
      historyEl.innerHTML='<div id="paperHistoryPanel">Chargement de l’historique PAPER…</div>';
    // Do not turn a failed legacy V4 refresh into a PAPER history request.
  } finally {
    tradesLoadInProgress=false;
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
const firstMain=document.querySelector('.main-nav-item[data-main="trades"].active');
const firstReport=document.querySelector('.tab[data-tab2="reportsv2"].active');
const firstWaves=document.querySelector('.tab[data-tab2="waves"].active');
if(firstMain&&!firstReport&&!firstWaves){
  loadV5StructureLive();
  loadTrades();
  tradesAutoRefresh=setInterval(loadTrades,30000);
}else if(firstMain&&firstReport){
  loadV4Reports();
}
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
