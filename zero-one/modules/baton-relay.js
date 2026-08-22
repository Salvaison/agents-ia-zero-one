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
const { analyzeVwap, analyzeTrigger, analyzeWavePivot } = require('./volume-analyzer');
/* Lignes imaginaires (17/08/2026) -- OBSERVATION SEULEMENT.
 * Le detecteur tourne desormais comme processus PM2 autonome et ecrit
 * data/trendlines.json chaque minute. Le baton se contente de lire ce
 * fichier : cout CPU isole, et un plantage du detecteur ne peut plus
 * affecter le baton, qui lira au pire une valeur legerement perimee.
 *   pm2 start modules/trendline-detector.js --name trendline -- --daemon */
const TRENDLINES_PATH = path.join(__dirname, '../data/trendlines.json');

/* ── PRICEMOVE (19/08/2026) ────────────────────────────────────────────────
 * Deplacement du prix d'un baton au suivant, et son intensite rapportee au
 * regime recent. Meme principe que netMoveMult, mais sur le prix lui-meme.
 * 20 releves de 30s = 10 minutes de reference glissante. */
/* BASE FIXE PAR REGIME (22/08/2026), au lieu d'une moyenne glissante.
 * L'ancienne reference etait la moyenne des dix dernieres minutes : pendant
 * une poussee elle gonflait avec le mouvement, si bien qu'un priceMove de
 * 672 USD recevait un multiplicateur de 4.6 quand un de 351 en recevait 7.0.
 * Le priceMove est une entite absolue : il ne doit pas etre compare a sa
 * propre trace, mais a un etalon stable.
 * Valeurs calees sur le p90 mesure de chaque regime : 75, 98, 119. */
const PM_BASE = { endormi: 80, normal: 100, cascade: 120 };
/* Regime estime sur les 20 derniers releves, par le taux d'evenements de
 * cadence -- meme mesure que celle du moteur. */
const PM_REGIME_FENETRE = 20;
const _pmCadHist = [];
let _pmPrev = null;
let _pmLast = null;

/* Pente du MoneyFlow 15m, alignee sur la bougie (22/08/2026).
 * Mesure sur 19 extremes confirmes : aux creux la pente est negative, aux
 * sommets positive -- le flux poursuit le mouvement qui se termine. C'est
 * la signature de l'epuisement.
 * On compare la valeur courante a celle du meme point de la bougie
 * precedente, plutot qu'a une fenetre arbitraire. */
const _mf15Hist = [];   /* { barTs, valeur } */

function _priceMove(prix) {
  if (typeof prix !== 'number' || !isFinite(prix)) return null;
  if (_pmPrev === null) { _pmPrev = prix; _pmLast = 0; return 0; }
  const d = prix - _pmPrev;
  _pmPrev = prix;
  _pmLast = d;
  return +d.toFixed(1);
}

/* Regime courant, pour choisir la base. */
function _pmRegime(cadenceMult) {
  if (typeof cadenceMult === 'number' && isFinite(cadenceMult)) {
    _pmCadHist.push(cadenceMult);
    while (_pmCadHist.length > PM_REGIME_FENETRE) _pmCadHist.shift();
  }
  if (_pmCadHist.length < PM_REGIME_FENETRE) return 'normal';
  const n = _pmCadHist.filter(function (v) { return v >= 2; }).length;
  const taux = n / _pmCadHist.length;
  if (taux >= 0.30) return 'cascade';
  if (taux <= 0.05) return 'endormi';
  return 'normal';
}

function _priceMoveMult(cadenceMult) {
  if (_pmLast === null) return null;
  const base = PM_BASE[_pmRegime(cadenceMult)] || PM_BASE.normal;
  return +(Math.abs(_pmLast) / base).toFixed(2);
}

/**
 * Pente du MoneyFlow 15m : ecart entre la valeur courante et celle relevee
 * au meme moment de la bougie precedente. Alignee sur le rythme de
 * l'indicateur plutot que sur une fenetre arbitraire.
 */
function _mf15Pente(valeur, barTs) {
  if (typeof valeur !== 'number' || !isFinite(valeur)) return null;
  if (typeof barTs !== 'number' && typeof barTs !== 'string') return null;
  const cle = String(barTs);
  _mf15Hist.push({ barTs: cle, valeur });
  /* Deux bougies suffisent -- 15m a 30s par releve, soit 60 par bougie. */
  while (_mf15Hist.length > 130) _mf15Hist.shift();

  /* Position dans la bougie courante. */
  const courante = _mf15Hist.filter(function (e) { return e.barTs === cle; });
  const rang = courante.length - 1;
  /* Meme rang dans la bougie precedente. */
  const bougies = [];
  for (const e of _mf15Hist) {
    if (!bougies.length || bougies[bougies.length - 1].cle !== e.barTs) {
      bougies.push({ cle: e.barTs, vals: [] });
    }
    bougies[bougies.length - 1].vals.push(e.valeur);
  }
  if (bougies.length < 2) return null;
  const prec = bougies[bougies.length - 2].vals;
  const ref = prec[Math.min(rang, prec.length - 1)];
  if (typeof ref !== 'number') return null;
  return +(valeur - ref).toFixed(2);
}
let _tlCache = null;
let _tlLastRead = 0;
function getTrendlines() {
  const now = Date.now();
  if (!_tlCache || (now - _tlLastRead) > 30000) {
    try {
      _tlCache = JSON.parse(fs.readFileSync(TRENDLINES_PATH, 'utf8'));
      _tlLastRead = now;
    } catch (e) { /* fichier absent ou en cours d'ecriture : on garde le cache */ }
  }
  return _tlCache;
}

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
const CONFIG_PATH_BR = path.join(__dirname, '../config.json');

/* PENTE VWAP LIVE (11/08/2026) -- voir en-tete du patch V. Le snapshot
 * intra-bougie (mcb_3m_live.csv, ecrit toutes les 15s par le collecteur iMac)
 * ne contient qu'une ligne : on accumule ici un historique glissant pour
 * pouvoir calculer une pente par regression. */
const LIVE_CSV_PATH = '/root/agents-ia-zero-one/data/mcb-live/mcb_3m_live.csv';
/* Snapshot 15m (15/08/2026) -- ecrit par tab2-collector.js, qui alterne
 * entre ses cinq timeframes : ce fichier n'est donc PAS mis a jour en
 * continu, il fige pendant les rotations. Comparer live15BarTs a l'heure
 * attendue avant de s'y fier. */
const LIVE_CSV_PATH_15M = '/root/agents-ia-zero-one/data/mcb-live/mcb_15m_live.csv';
const LIVE_HISTORY_PATH = path.join(__dirname, '../data/vwap-live-history.json');
const LIVE_HISTORY_MAX = 40;   // ~20 min a 30s -- assez pour une pente stable
const LIVE_SLOPE_POINTS = 8;   // regression sur les 8 derniers points (~4 min)

function loadLiveHistory() {
  if (!fs.existsSync(LIVE_HISTORY_PATH)) return [];
  try {
    const d = JSON.parse(fs.readFileSync(LIVE_HISTORY_PATH, 'utf8'));
    return Array.isArray(d) ? d : [];
  } catch (e) { return []; }
}

let liveHistory = loadLiveHistory();

/* Suivi de la premiere detection de chaque pivot, pour mesurer son age en
 * cycles reels de 30s plutot qu'en bougies 3m (11/08/2026). */
/* Horodatages des pics de cadence recents, pour detecter un SECOND pic
 * rapproche (11/08/2026) -- meilleur signal directionnel mesure : 75%. */
let _recentPics = [];

/* Suivi du regime directionnel de la vague 15m (11/08/2026). */
let _lastRegime15Key = null;
let _lastRegime15Since = null;
let _lastPivotKey = null;
let _lastPivotSeenAt = null;

/* Lit le snapshot live et retourne { ts, vwap } ou null. Le fichier n'a qu'une
 * ligne de donnees (plus l'en-tete). */
function readLiveSnapshot(csvPath = LIVE_CSV_PATH) {
  try {
    if (!fs.existsSync(csvPath)) return null;
    const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
    if (lines.length < 2) return null;
    const c = lines[1].split(',');
    const lbw = parseFloat(c[5]);
    const bw = parseFloat(c[6]);
    if (isNaN(lbw) || isNaN(bw)) return null;

    /* ELARGI le 15/08/2026 -- le fichier live contient bien plus que LBW et
     * BW, mais seules ces deux colonnes etaient lues. Le reste (MoneyFlow,
     * DBSI, MA200, signaux MCB) etait ecrit en continu puis jete.
     * Colonnes : 0=ts 1=open 2=high 3=low 4=close 5=LBW 6=BW 7=moneyFlow
     *            8=buy 9=sell 10=dbsiTop 11=dbsiBottom 12=ma200
     *            13=wt1_cross_up 14=wt1_cross_dn
     * num() rend null sur une colonne vide ou absente -- les anciennes
     * lignes a 13 colonnes restent lisibles sans produire de NaN. */
    const num = (s) => {
      if (s === undefined || s === null || s === '') return null;
      const v = parseFloat(s);
      return isNaN(v) ? null : v;
    };

    return {
      barTs: c[0],
      vwap: parseFloat((lbw - bw).toFixed(4)),
      lbw,
      bw,
      moneyFlow: num(c[7]),
      dbsiTop: num(c[10]),
      dbsiBottom: num(c[11]),
      ma200: num(c[12]),
      signalUp: num(c[13]),
      signalDn: num(c[14]),
      close: num(c[4]),
    };
  } catch (e) { return null; }
}

/* Pente par regression lineaire (moindres carres) sur les N derniers points,
 * normalisee en unites VWAP PAR MINUTE -- les intervalles entre points ne sont
 * pas parfaitement reguliers (snapshot 15s cote iMac, sync 30s, cycle baton
 * 30s), donc on ne peut pas se contenter d'une difference brute. */
function computeLiveSlope(hist, n) {
  const pts = hist.slice(-n);
  if (pts.length < 3) return null;
  const t0 = pts[0].ts;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (const p of pts) {
    const x = (p.ts - t0) / 60000; // minutes depuis le premier point
    const y = p.vwap;
    sx += x; sy += y; sxy += x * y; sxx += x * x;
  }
  const k = pts.length;
  const denom = k * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return null;
  return parseFloat((((k * sxy - sx * sy) / denom)).toFixed(4));
}

/* Config relue a chaque tick (hot-reload, comme cerveau-central) -- necessaire
 * depuis le 10/08/2026 pour le seuil du declencheur de deplacement. */
let _cfgCache = {};
function reloadConfigBR() {
  try { _cfgCache = JSON.parse(fs.readFileSync(CONFIG_PATH_BR, 'utf8')); }
  catch (e) { /* garde la derniere version valide */ }
}
reloadConfigBR();
const PRICE_HISTORY_SIZE = 10;        // fenetre du desequilibre (10 batons = 5 min)
/* Seuil du DESEQUILIBRE, utilise uniquement par recommendedDirection (en
 * observation depuis le 01/08, ne pilote aucune decision). A ne pas confondre
 * avec displacementTrigger.thresholdPct (0.067) qui, lui, ouvre une vigilance
 * d'entree -- les deux mesurent |displacementPct| mais servent a des choses
 * differentes. Lisible en config depuis le 11/08/2026, valeur inchangee. */
const IMBALANCE_THRESHOLD_DEFAULT = 0.10;

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
let lastAction = null; // persiste (contrairement a "action", vrai un seul tick)
let priceHistory = []; // 10 derniers prix (02/08/2026 -- remplace netMoveHistory)

function pruneHistory(now) {
  const cutoff = now - ROLLING_WINDOW_MS;
  cadenceHistory = cadenceHistory.filter(h => h.ts >= cutoff);
}
function rollingAverage() {
  if (cadenceHistory.length === 0) return null;
  return cadenceHistory.reduce((a, h) => a + h.cadence, 0) / cadenceHistory.length;
}

function tick() {
  reloadConfigBR();
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

  // ===== Recommandation VWAP15 / desequilibre (01/08/2026, mode observation) ====
  const vwap15 = analyzeVwap('15m');
  // ===== PENTE VWAP LIVE (11/08/2026, observation) =========================
  // Accumule les snapshots intra-bougie et calcule la pente par regression.
  // Ne pilote aucune decision -- seuils provisoires, unite differente (par
  // minute) de la pente par bougie : ordres de grandeur non comparables.
  let vwapLive = null, vwapLiveSlope = null, vwapLiveSlopeDir = null;
  const liveSnap = readLiveSnapshot();
  /* Snapshot 15m -- OBSERVATION SEULEMENT a ce stade. Pas d'historique ni de
   * pente : on veut d'abord mesurer si le signal apparait avant la cloture
   * et si son type reste stable. */
  const liveSnap15 = readLiveSnapshot(LIVE_CSV_PATH_15M);
  if (liveSnap) {
    vwapLive = liveSnap.vwap;
    const last = liveHistory[liveHistory.length - 1];
    // N'ajoute que si la valeur a change OU si plus de 25s se sont ecoulees --
    // evite d'empiler des doublons quand le rsync n'a pas encore rafraichi.
    if (!last || last.vwap !== vwapLive || (now - last.ts) > 25000) {
      liveHistory.push({ ts: now, vwap: vwapLive });
      if (liveHistory.length > LIVE_HISTORY_MAX) liveHistory.shift();
      try { fs.writeFileSync(LIVE_HISTORY_PATH, JSON.stringify(liveHistory)); }
      catch (e) { /* persistance best-effort */ }
    }
    vwapLiveSlope = computeLiveSlope(liveHistory, LIVE_SLOPE_POINTS);
    if (vwapLiveSlope !== null) {
      const absL = Math.abs(vwapLiveSlope);
      // Lu depuis _cfgCache et non _slopeCfg : ce bloc s'execute AVANT la
      // declaration de _slopeCfg dans tick() (bug corrige le 11/08/2026).
      const _liveCfg = (_cfgCache && _cfgCache.tradeSimulator && _cfgCache.tradeSimulator.vwapSlope) || {};
      const flatL = _liveCfg.liveFlatBelow !== undefined ? _liveCfg.liveFlatBelow : 1.0;
      vwapLiveSlopeDir = absL < flatL ? 'plat' : (vwapLiveSlope > 0 ? 'montant' : 'descendant');
    }
  }

  // Pivots de vague MCB (04/08/2026, observation) -- sur 3m, coherent avec
  // le rythme du baton (cycle 30s). Ne pilote aucune decision a ce stade.
  const wavePivot = analyzeWavePivot('3m');

  /* REGIME DIRECTIONNEL DE LA VAGUE MCB 15m (11/08/2026) -- regle de Benjamin,
   * plusieurs annees d'observation : le dernier point confirme de la vague 15m
   * definit le sens autorise. Pic (rouge) = seuls les SHORT ; creux (vert) =
   * seuls les LONG. C'est un ETAT qui dure jusqu'au pivot suivant, pas un
   * evenement avec fenetre de validite -- d'ou l'absence de maxAge ici.
   * Le 15m et non le 3m : ce dernier produit un pivot toutes les 11 min
   * (trop de bruit, justesse directionnelle mesuree 33-50%). */
  const wavePivot15 = analyzeWavePivot('15m');
  let waveRegime15 = null, waveRegime15Value = null;
  if (wavePivot15 && wavePivot15.type) {
    waveRegime15 = wavePivot15.type === 'creux' ? 'haussier' : 'baissier';
    waveRegime15Value = wavePivot15.value !== undefined ? wavePivot15.value : null;
    const rk = wavePivot15.type + ':' + waveRegime15Value;
    if (_lastRegime15Key !== rk) {
      _lastRegime15Key = rk;
      _lastRegime15Since = new Date(now).toISOString();
    }
  }
  /* Age en CYCLES DE BATON (30s) et non en bougies 3m (11/08/2026) : mesure
   * du 11/08 -- avec l'ancien comptage en bougies, ZERO candidat a l'entree
   * sur 57 tombait dans la fenetre de validite. On horodate la premiere
   * detection de chaque pivot pour obtenir un age exact et previsible. */
  if (wavePivot && wavePivot.type) {
    const pivKey = wavePivot.type + ':' + wavePivot.value;
    if (_lastPivotKey !== pivKey) {
      _lastPivotKey = pivKey;
      _lastPivotSeenAt = now;
    }
  } else {
    _lastPivotKey = null;
    _lastPivotSeenAt = null;
  }
  const wavePivotAgeRealCycles = _lastPivotSeenAt !== null
    ? Math.floor((now - _lastPivotSeenAt) / 30000)
    : null;
  // Deplacement de prix REEL sur la fenetre (corrige le 02/08/2026 -- voir
  // en-tete du patch : l'ancienne somme de netMove chevauchants sous-estimait
  // l'amplitude d'un facteur ~2 et s'inversait parfois de signe).
  let displacementPct = null;
  if (priceHistory.length >= PRICE_HISTORY_SIZE) {
    const p0 = priceHistory[0];
    if (p0) displacementPct = parseFloat((((currentPrice - p0) / p0) * 100).toFixed(4));
  }
  if (currentPrice && !isAnomaly) {
    priceHistory.push(currentPrice);
    if (priceHistory.length > PRICE_HISTORY_SIZE) priceHistory.shift();
  }
  const _imbCfg = (_cfgCache && _cfgCache.tradeSimulator && _cfgCache.tradeSimulator.vwapSlope) || {};
  const _imbThreshold = _imbCfg.imbalanceThreshold !== undefined ? _imbCfg.imbalanceThreshold : IMBALANCE_THRESHOLD_DEFAULT;
  const strongImbalance = displacementPct !== null && Math.abs(displacementPct) >= _imbThreshold;
  const vwap15NearZero = !!(vwap15 && vwap15.nearZero);
  const vwap15Cur = (vwap15 && vwap15.current !== undefined) ? parseFloat(vwap15.current) : null;
  const vwap15Prev = (vwap15 && vwap15.previous !== undefined) ? parseFloat(vwap15.previous) : null;
  const vwap15TrendDown = (vwap15Cur !== null && vwap15Prev !== null)
    ? (Math.abs(vwap15Cur) < Math.abs(vwap15Prev)) : null;
  // PENTE DU VWAP (10/08/2026, observation seulement) -- direction de la
  // ligne par rapport a l'horizontale du zero MCB, et puissance de cette
  // pente (angle d'attaque). Une ligne PLATE = apogee de vague, retournement
  // proche (observation de Benjamin). Ne pilote aucune decision a ce stade.
  // Seuils recalibres le 10/08/2026 sur la distribution reelle (24h, 187
  // changements) : p25=2.04 p50=4.81 p75=8.90. Les anciennes valeurs posees
  // a l'estime (0.5 / 3.0) classaient 64% des cas en 'fort' -- inutilisable.
  const _slopeCfg = (_cfgCache && _cfgCache.tradeSimulator && _cfgCache.tradeSimulator.vwapSlope) || {};
  const slopeFlat = _slopeCfg.flatBelow !== undefined ? _slopeCfg.flatBelow : 2.04;
  const slopeStrong = _slopeCfg.strongAbove !== undefined ? _slopeCfg.strongAbove : 8.90;
  let vwapSlope = null, vwapSlopeDir = null, vwapSlopeStrength = null;
  if (vwap15Cur !== null && vwap15Prev !== null) {
    vwapSlope = parseFloat((vwap15Cur - vwap15Prev).toFixed(4));
    const abs = Math.abs(vwapSlope);
    vwapSlopeDir = abs < slopeFlat ? 'plat' : (vwapSlope > 0 ? 'montant' : 'descendant');
    vwapSlopeStrength = abs < slopeFlat ? 'faible' : (abs >= slopeStrong ? 'fort' : 'moyen');
  }

  // Pente du VWAP3 (10/08/2026) -- plus reactive que celle du 15m (mise a jour
  // toutes les 3 min contre 7.7 min en moyenne). Memes seuils pour l'instant,
  // a recalibrer separement : la distribution du 3m n'a aucune raison d'etre
  // identique a celle du 15m.
  const vwap3obj = analyzeVwap('3m');
  const vwap3Cur = (vwap3obj && vwap3obj.current !== undefined) ? parseFloat(vwap3obj.current) : null;
  const vwap3Prev = (vwap3obj && vwap3obj.previous !== undefined) ? parseFloat(vwap3obj.previous) : null;
  // Seuils PROPRES au 3m (11/08/2026) -- mesure retroactive sur 24h :
  // VWAP3 p25=2.19 p50=4.25 p75=8.44 (contre 1.77/4.23/7.35 pour le 15m).
  const slope3Flat = _slopeCfg.flat3Below !== undefined ? _slopeCfg.flat3Below : 2.19;
  const slope3Strong = _slopeCfg.strong3Above !== undefined ? _slopeCfg.strong3Above : 8.44;
  let vwap3Slope = null, vwap3SlopeDir = null, vwap3SlopeStrength = null;
  if (vwap3Cur !== null && vwap3Prev !== null) {
    vwap3Slope = parseFloat((vwap3Cur - vwap3Prev).toFixed(4));
    const abs3 = Math.abs(vwap3Slope);
    vwap3SlopeDir = abs3 < slope3Flat ? 'plat' : (vwap3Slope > 0 ? 'montant' : 'descendant');
    vwap3SlopeStrength = abs3 < slope3Flat ? 'faible' : (abs3 >= slope3Strong ? 'fort' : 'moyen');
  }

  let vwapRegime = 'neutre';
  if (vwap15TrendDown === false) vwapRegime = 'continuation';
  else if (vwap15NearZero && vwap15TrendDown === true) vwapRegime = 'retournement_possible';
  // recommendedDirection est desormais calcule PLUS BAS, apres cadenceMultiplier
  // (11/08/2026) -- la nouvelle logique en a besoin. Voir patch AA.

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

  /* PREDICTION DE RETOURNEMENT (11/08/2026) -- voir en-tete du patch AA.
   * Aucun signal isole ne predit un retournement (50-57% contre 51.5% de base).
   * Deux COMBINAISONS ressortent nettement, toutes deux fondees sur
   * l'essoufflement : un mouvement fort dont la force motrice s'epuise.
   *   deplacement fort + cadence essoufflee  -> 70.7%
   *   deplacement fort + pente VWAP3 plate   -> 79.3%
   * Le sens predit est l'OPPOSE du deplacement en cours.
   * Place ICI et non plus haut : a besoin de cadenceMultiplier, calcule juste
   * au-dessus. OBSERVATION SEULEMENT -- ne pilote aucune decision. */
  const _recCfg = (_cfgCache && _cfgCache.tradeSimulator && _cfgCache.tradeSimulator.prediction) || {};
  const recDispMin = _recCfg.displacementMin !== undefined ? _recCfg.displacementMin : 0.084;
  const recCadenceMax = _recCfg.cadenceExhaustedBelow !== undefined ? _recCfg.cadenceExhaustedBelow : 0.7;
  const recSlopeFlat = _recCfg.slope3FlatBelow !== undefined ? _recCfg.slope3FlatBelow : 2.19;

  let recommendedDirection = null;
  let recommendedReason = null;
  let recommendedConfidence = null;

  if (_recCfg.enabled !== false
      && displacementPct !== null
      && Math.abs(displacementPct) >= recDispMin) {
    const oppose = displacementPct > 0 ? 'baissier' : 'haussier';
    const cadenceExhausted = cadenceMultiplier !== null && cadenceMultiplier < recCadenceMax;
    const slopeFlat3 = vwap3Slope !== null && Math.abs(vwap3Slope) < recSlopeFlat;

    if (slopeFlat3) {
      recommendedDirection = oppose;
      recommendedReason = `deplacement ${displacementPct}% + pente VWAP3 plate (${vwap3Slope})`;
      recommendedConfidence = 'forte';
    } else if (cadenceExhausted) {
      recommendedDirection = oppose;
      recommendedReason = `deplacement ${displacementPct}% + cadence essoufflee (x${cadenceMultiplier})`;
      recommendedConfidence = 'moyenne';
    }
  }

  // ===== CHAINE DE DECISION (evenement/vigilance/reaction prix) ========
  // Deux voies d'ouverture de vigilance depuis le 10/08/2026 :
  //   1. EVENEMENT CADENCE  -- pic d'activite instantane (voie historique)
  //   2. DEPLACEMENT 5 MIN  -- mouvement progressif, invisible a la cadence
  //      (voir en-tete du patch : 293 occasions/24h ratees par la voie 1)
  const isEvent = cadenceMultiplier !== null && cadenceMultiplier >= EVENT_MULTIPLIER;

  const dispCfg = (_cfgCache && _cfgCache.tradeSimulator && _cfgCache.tradeSimulator.displacementTrigger) || {};
  const dispThreshold = dispCfg.thresholdPct !== undefined ? dispCfg.thresholdPct : 0.084;
  const isDisplacementEvent = dispCfg.enabled !== false
    && displacementPct !== null
    && Math.abs(displacementPct) >= dispThreshold;

  if (isEvent || isDisplacementEvent) {
    vigilance = {
      since: new Date(now).toISOString(),
      trigger: isEvent ? 'cadence' : 'displacement',
      triggerMultiplier: cadenceMultiplier,
      triggerDisplacement: displacementPct,
      priceAtEvent: currentPrice,
      batonCount: 0,
      pendingDirection: null,
      pendingNetMove: null,
    };
  } else if (vigilance) {
    vigilance.batonCount += 1;
  }

  /* 3e VOIE D ACTION (11/08/2026) -- pic de cadence sans reaction prix.
   * La voie normale (reaction prix par netMove) reste PRIORITAIRE : elle
   * est evaluee juste apres et ne s execute que si aucune action ici. */
  let action = null;

  const _crCfg = (_cfgCache && _cfgCache.tradeSimulator && _cfgCache.tradeSimulator.prediction) || {};
  const _crMinMult = _crCfg.cadenceReversalMinMult !== undefined ? _crCfg.cadenceReversalMinMult : 3;
  const _crMinDisp = _crCfg.cadenceReversalMinDisplacement !== undefined ? _crCfg.cadenceReversalMinDisplacement : 0.05;
  const _crDoublePicWindow = _crCfg.doublePicWindowCycles !== undefined ? _crCfg.doublePicWindowCycles : 8;
  const _crConfirmMax = _crCfg.confirmMaxCycles !== undefined ? _crCfg.confirmMaxCycles : 6;

  /* Historique des pics recents, pour detecter un SECOND pic rapproche. */
  if (isEvent && cadenceMultiplier !== null && cadenceMultiplier >= _crMinMult) {
    _recentPics.push(now);
    while (_recentPics.length && (now - _recentPics[0]) > _crDoublePicWindow * 30000) _recentPics.shift();
  }

  if (_crCfg.cadenceReversalEnabled !== false
      && vigilance
      && vigilance.trigger === 'cadence'
      && (vigilance.triggerMultiplier || 0) >= _crMinMult
      && displacementPct !== null
      && Math.abs(displacementPct) >= _crMinDisp) {

    const opposeDir = displacementPct > 0 ? 'baissier' : 'haussier';

    /* VOIE 1 (75%) -- second pic rapproche : bataille, point de bascule.
     * Action immediate, sans attendre de confirmation. */
    const isDoublePic = isEvent
      && cadenceMultiplier !== null && cadenceMultiplier >= _crMinMult
      && _recentPics.length >= 2;

    /* VOIE 2 (62.5%) -- confirmation : un cycle dont Dir. va dans le sens
     * predit, dans la limite de confirmMaxCycles. Au-dela, on ne fait RIEN
     * (mesure : forcer l'entree sans confirmation tombe a 58.3%). */
    const dirConfirms = direction && direction !== 'neutre' && direction === opposeDir;
    const withinWindow = vigilance.batonCount <= _crConfirmMax;

    if (isDoublePic) {
      action = {
        type: 'cadence_reversal_double',
        direction: opposeDir,
        reason: `second pic de cadence x${cadenceMultiplier} en moins de ${_crDoublePicWindow} cycles (bataille) -- sens oppose au deplacement (${displacementPct}%)`,
      };
      vigilance = null;
      _recentPics.length = 0;
    } else if (dirConfirms && withinWindow) {
      action = {
        type: 'cadence_reversal_confirmed',
        direction: opposeDir,
        reason: `pic de cadence x${vigilance.triggerMultiplier}, direction confirmee au cycle ${vigilance.batonCount} -- sens oppose au deplacement (${displacementPct}%)`,
      };
      vigilance = null;
    }
    /* Sinon : rien. La vigilance suit son cours normal (reaction prix). */
  }

  if (!action && vigilance && netMovePct !== null && direction && direction !== 'neutre') {
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
  if (action) {
    vigilance = null;
    lastAction = { ...action, timestamp: new Date(now).toISOString() };
  }

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
    lastAction,
    vwapRegime,
    displacementPct,
    recommendedDirection,
    recommendedReason,
    recommendedConfidence,
    vwapSlope,
    vwapSlopeDir,
    vwapSlopeStrength,
    vwap3: vwap3Cur,
    vwap15: vwap15Cur,
    vwap3Slope,
    vwap3SlopeDir,
    vwap3SlopeStrength,
    vwapLive,
    vwapLiveSlope,
    vwapLiveSlopeDir,
    vwapLivePoints: liveHistory.length,
    wavePivotType: wavePivot.type || null,
    wavePivotValue: wavePivot.value !== undefined ? wavePivot.value : null,
    wavePivotAgeCycles: wavePivot.ageCycles !== undefined ? wavePivot.ageCycles : null,
    wavePivotAgeRealCycles,
    /* VALEURS DYNAMIQUES INTRA-BOUGIE (15/08/2026) -- etat de la bougie 3m
     * EN FORMATION au moment ou ce baton est ecrit, et non la derniere
     * valeur figee a la cloture precedente. OBSERVATION SEULEMENT : aucune
     * decision ne s'en sert. Objectif : comparer, sur donnees reelles,
     * l'ecart entre valeur en cours et valeur confirmee, et mesurer
     * combien de temps la seconde est connue avant la premiere. */
    liveLbw: liveSnap ? liveSnap.lbw : null,
    liveBw: liveSnap ? liveSnap.bw : null,
    liveMoneyFlow: liveSnap ? liveSnap.moneyFlow : null,
    liveDbsiTop: liveSnap ? liveSnap.dbsiTop : null,
    liveDbsiBottom: liveSnap ? liveSnap.dbsiBottom : null,
    liveMa200: liveSnap ? liveSnap.ma200 : null,
    liveSignalUp: liveSnap ? liveSnap.signalUp : null,
    liveSignalDn: liveSnap ? liveSnap.signalDn : null,
    liveBarTs: liveSnap ? liveSnap.barTs : null,
    /* Valeurs intra-bougie du 15m (15/08/2026). live15BarTs sert a verifier
     * la fraicheur : si l'horodatage ne correspond pas a la bougie 15m en
     * cours, le collecteur etait pose sur un autre timeframe et la valeur
     * est perimee. */
    live15BarTs: liveSnap15 ? liveSnap15.barTs : null,
    live15Lbw: liveSnap15 ? liveSnap15.lbw : null,
    live15Bw: liveSnap15 ? liveSnap15.bw : null,
    live15Vwap: liveSnap15 ? liveSnap15.vwap : null,
    live15MoneyFlow: liveSnap15 ? liveSnap15.moneyFlow : null,
    live15DbsiTop: liveSnap15 ? liveSnap15.dbsiTop : null,
    live15DbsiBottom: liveSnap15 ? liveSnap15.dbsiBottom : null,
    live15SignalUp: liveSnap15 ? liveSnap15.signalUp : null,
    live15SignalDn: liveSnap15 ? liveSnap15.signalDn : null,
    waveRegime15,
    waveRegime15Value,
    waveRegime15Since: _lastRegime15Since,
  });

  // ===== Historique 24h pour le dashboard web (31/07/2026) ==============
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
    /* CONVICTION ET COHERENCE (16/08/2026) -- exposes dans l'audit apres
     * le constat qu'aucune mesure visible ne predit la direction du prix.
     * convictionScore : coherence du delta de volume signe (achats moins
     * ventes) sur les 8 tranches -- mesure le FLUX, pas le prix.
     * coherence : coherence du mouvement de prix sur les memes tranches.
     * Lus ensemble : conviction haute + coherence basse = le flux pousse
     * sans que le prix suive. */
    convictionScore: trig.convictionScore !== undefined ? trig.convictionScore : null,
    coherence: trig.coherence !== undefined ? trig.coherence : null,
    /* PRICEMOVE (19/08/2026) : deplacement du prix entre deux batons, en USD,
     * et son multiplicateur contre la moyenne glissante des dix dernieres
     * minutes. Le Vslope donne l'inflexion, le priceMove donne l'intensite
     * ET le sens -- un mouvement violent de Vslope se confirme par un
     * priceMove violent. */
    priceMove: _priceMove(currentPrice),
    priceMoveMult: _priceMoveMult(cadenceMultiplier),
    /* Pente du MoneyFlow 15m, alignee sur la bougie. Positive = il monte. */
    mf15Pente: _mf15Pente(liveSnap15 ? liveSnap15.moneyFlow : null,
                          liveSnap15 ? liveSnap15.barTs : null),
    /* LIGNES IMAGINAIRES (16/08/2026) -- trendlines obliques detectees sur les
     * extremes de prix. lgiPoints = nombre de touches de la ligne la plus
     * proche quand le prix entre dans sa zone (+/-40 USD), null sinon.
     * OBSERVATION SEULEMENT : aucune decision ne s'en sert. */
    /* Le detecteur v4 marque les lignes allumees avec 'active' et non plus
     * 'inZone' -- il expose aussi directement maxPointsInZone et natureInZone,
     * autant les lire plutot que de recalculer. */
    lgiPoints: (function () {
      const tl = getTrendlines();
      return (tl && tl.maxPointsInZone) ? tl.maxPointsInZone : null;
    })(),
    lgiNature: (function () {
      const tl = getTrendlines();
      return (tl && tl.natureInZone) ? tl.natureInZone : null;
    })(),
    /* CONFLUENCE (16/08/2026) : nombre de lignes dont le prix est dans la
     * zone au meme moment. Plusieurs lignes convergentes signalent un niveau
     * ou le prix a deja reagi de plusieurs facons -- Benjamin y voit un point
     * de controle local, et le cas du 16/08 15h43-16h20 (prix fige 13 min sur
     * une telle zone) lui donne raison. */
    /* La confluence est desormais calculee par le detecteur lui-meme. */
    lgiConfluence: (function () {
      const tl = getTrendlines();
      return (tl && tl.confluence) ? tl.confluence : null;
    })(),
    vwapSlope,
    vwapSlopeDir,
    vwap3Slope,
    vwap3SlopeDir,
    vwapLive,
    vwapLiveSlope,
    vwapLiveSlopeDir,
    /* VALEURS INTRA-BOUGIE (15/08/2026) -- ajoutees a l'historique d'audit,
     * et non plus seulement a baton-state.json. Permettent de comparer, sur
     * une meme ligne, la valeur confirmee de la derniere cloture et la
     * valeur EN COURS de la bougie qui se forme. Mesure du meme jour : le BW
     * d'une bougie 3m a ete revise 20 fois en 3 minutes, chaque releve porte
     * donc une information distincte. */
    liveBw: liveSnap ? liveSnap.bw : null,
    liveLbw: liveSnap ? liveSnap.lbw : null,
    liveMoneyFlow: liveSnap ? liveSnap.moneyFlow : null,
    liveDbsiTop: liveSnap ? liveSnap.dbsiTop : null,
    liveDbsiBottom: liveSnap ? liveSnap.dbsiBottom : null,
    liveSignalUp: liveSnap ? liveSnap.signalUp : null,
    liveSignalDn: liveSnap ? liveSnap.signalDn : null,
    live15Bw: liveSnap15 ? liveSnap15.bw : null,
    live15Lbw: liveSnap15 ? liveSnap15.lbw : null,
    live15MoneyFlow: liveSnap15 ? liveSnap15.moneyFlow : null,
    live15DbsiTop: liveSnap15 ? liveSnap15.dbsiTop : null,
    live15DbsiBottom: liveSnap15 ? liveSnap15.dbsiBottom : null,
    live15Vwap: liveSnap15 ? liveSnap15.vwap : null,
    live15SignalUp: liveSnap15 ? liveSnap15.signalUp : null,
    live15SignalDn: liveSnap15 ? liveSnap15.signalDn : null,
    wavePivotType: wavePivot.type || null,
    wavePivotValue: wavePivot.value !== undefined ? wavePivot.value : null,
    waveRegime15,
    waveRegime15Value,
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
