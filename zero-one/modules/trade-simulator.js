/**
 * trade-simulator.js — Simulation de gestion de trade (entree + sortie),
 * en OBSERVATION SEULE : aucun ordre reel n'est jamais passe, aucun capital
 * n'est engage.
 *
 * REFONTE COMPLETE DU 31/07/2026 (decision de Benjamin) -- l'ancienne loi
 * d'entree (VWAP croise zero + seuil LBW + ecart + DBSI) est ENTIEREMENT
 * REMPLACEE. Le systeme fonctionne desormais ainsi :
 *
 * ENTREE -- pilotee par le "baton de relais" (baton-relay.js, process PM2
 * permanent, ecrit data/baton-state.json toutes les 30s) :
 *   1. EVENEMENT : cadence >= 2x sa moyenne glissante 4h -> VIGILANCE
 *   2. VIGILANCE : etat persistant, relaye de baton en baton
 *   3. REACTION PRIX decide de la direction (jamais l'evenement seul, qui
 *      est ambigu par nature -- retournement OU continuation) :
 *        - |netMove| >= 0.06% -> action immediate
 *        - |netMove| >= 0.03% confirme sur 2 batons consecutifs -> action
 *   4. Cette action (baton-state.json : lastAction) declenche l'entree,
 *      dans le sens indique. Chaque action n'est consommee qu'UNE FOIS
 *      (suivi par timestamp dans data/trade-sim-entry-tracker.json, par
 *      module) -- meme signal jamais utilise deux fois pour deux entrees.
 *
 * SORTIE -- tranches 25/65/10 (structure Shlong, strategy-boono.md) :
 *   - 25% (TP1) au 1er declencheur qualifiant apres l'entree
 *   - 65% (TP2) au 2e declencheur qualifiant
 *   - 10% (residu) ferme au 3e declencheur qualifiant -- SIMPLIFICATION
 *     PROVISOIRE : le vrai shlong (bascule vers une position adverse,
 *     10% maintenus comme hedge pendant la bascule) est un chantier
 *     separe, non implemente ici. Pour l'instant, le residu est
 *     simplement ferme.
 *   - "Declencheur qualifiant" = un NOUVEL evenement de cadence (front
 *     montant, pas juste "toujours vrai"), OU un NOUVEAU passage a zero du
 *     VWAP (idem, front montant), OU un seuil NetMove independant (meme
 *     regle que la reaction prix de l'entree : 0.06% immediat, 0.03%
 *     confirme sur 2 batons) -- decision de Benjamin : "a chaque
 *     evenement ou passage a 0. et NetMove".
 *
 * PROTECTION -- liquidation par levier (SEUL filet, pas de stop manuel,
 * decision de Benjamin : "essayons sans stoploss, cela se joue sur notre
 * capacite a rentrer juste dans les trades") :
 *   - Prix de liquidation calcule DES L'ENTREE a partir du levier
 *     (entryPrice +/- entryPrice/leverage), verifie a chaque tick.
 *   - Timeout anti-zombie (garde-fou complementaire, config.tradeSimulator.
 *     maxHoldMinutesWithoutTp1) : ferme si aucune tranche n'a ete prise
 *     au-dela du delai configure par module.
 *   - COUPE-CIRCUIT (31/07/2026, decision de Benjamin) : si le PNL cumule
 *     depuis la derniere remise a zero de l'historique descend a -25% ou
 *     pire, bloque les NOUVELLES entrees (config.tradeSimulator.
 *     circuitBreakerTripped, persiste, reversible manuellement). Les
 *     positions deja ouvertes continuent d'etre gerees normalement --
 *     seul un nouveau depart de trade est empeche, pas la gestion en cours.
 *
 * NOTE (a traiter separement) : l'hypothese du passage a zero du VWAP
 * comme signal fiable reste en cours de revision (voir memoire du
 * 31/07/2026 sur l'apogee de la vague MCB vs l'apogee du prix, et
 * l'hypothese d'essoufflement de liquidite). Le passage a zero est
 * conserve ici comme declencheur de tranche (decision explicite de
 * Benjamin), mais la loi d'ENTREE n'en depend plus du tout.
 *
 * Un seul trade simule ouvert a la fois par module (scalp/day/swing).
 * Persistance : data/trade-sim-state.json (etat par module), data/
 * trade-sim-history.json (historique des tranches/clotures), data/
 * trade-sim-entry-tracker.json (dernier signal d'entree consomme par
 * module, evite les entrees en double sur le meme signal).
 */
const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, '../data/trade-sim-state.json');
const HISTORY_PATH = path.join(__dirname, '../data/trade-sim-history.json');
const ENTRY_TRACKER_PATH = path.join(__dirname, '../data/trade-sim-entry-tracker.json');
const BATON_STATE_PATH = path.join(__dirname, '../data/baton-state.json');
const CONFIG_PATH = path.join(__dirname, '../config.json');
const HISTORY_MAX = 300;

// Coupe-circuit (31/07/2026, decision de Benjamin) : si le PNL cumule
// depuis la derniere remise a zero de l'historique descend a -25% ou
// pire, bloque les NOUVELLES entrees pour recalibrage. Les positions deja
// ouvertes continuent d etre gerees normalement (liquidation, tranches) --
// seul un flag SEPARE de "enabled" est ecrit (config.tradeSimulator.
// circuitBreakerTripped), car "enabled" est le portail que cerveau-
// central.js verifie pour decider d appeler simulateModule() du tout : le
// couper aurait aussi arrete le suivi des positions en cours. Remise a
// false manuellement dans config.json une fois la recalibration faite.
const CIRCUIT_BREAKER_THRESHOLD = -25;

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return { scalp: null, day: null, swing: null };
  try {
    const data = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    return { scalp: data.scalp || null, day: data.day || null, swing: data.swing || null };
  } catch (e) {
    return { scalp: null, day: null, swing: null };
  }
}
function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function loadHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}
function appendHistory(record) {
  const history = loadHistory();
  history.push(record);
  if (history.length > HISTORY_MAX) history.shift();
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

/**
 * Coupe-circuit : calcule le PNL cumule depuis la derniere remise a zero
 * de l historique. Si <= CIRCUIT_BREAKER_THRESHOLD, ecrit
 * config.tradeSimulator.circuitBreakerTripped = true (persiste, visible,
 * reversible manuellement) et retourne true -- bloque alors les
 * NOUVELLES entrees uniquement, jamais la gestion des positions deja
 * ouvertes.
 */
function checkCircuitBreaker(config) {
  if (config && config.tradeSimulator && config.tradeSimulator.circuitBreakerTripped) return true;

  const history = loadHistory();
  const withPnl = history.filter(h => h.pnlPercent !== null && h.pnlPercent !== undefined);
  if (withPnl.length === 0) return false;

  const totalPnl = withPnl.reduce((a, h) => a + h.pnlPercent, 0);
  if (totalPnl > CIRCUIT_BREAKER_THRESHOLD) return false;

  try {
    const liveConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (liveConfig.tradeSimulator && !liveConfig.tradeSimulator.circuitBreakerTripped) {
      liveConfig.tradeSimulator.circuitBreakerTripped = true;
      liveConfig.tradeSimulator._note_circuit_breaker =
        `COUPE-CIRCUIT declenche le ${new Date().toISOString()} -- PNL cumule a ${totalPnl.toFixed(2)}% ` +
        `(seuil ${CIRCUIT_BREAKER_THRESHOLD}%). Bloque uniquement les NOUVELLES entrees -- les positions ` +
        `deja ouvertes continuent d etre gerees normalement (liquidation, tranches). Remettre a false ` +
        `manuellement dans config.json apres recalibrage.`;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(liveConfig, null, 2));
      console.log(`[trade-simulator] COUPE-CIRCUIT declenche : PNL cumule ${totalPnl.toFixed(2)}% <= ${CIRCUIT_BREAKER_THRESHOLD}%. Nouvelles entrees bloquees.`);
    }
  } catch (e) {
    console.error('[trade-simulator] Erreur ecriture coupe-circuit dans config.json :', e.message);
  }
  return true;
}

function loadEntryTracker() {
  if (!fs.existsSync(ENTRY_TRACKER_PATH)) return { scalp: null, day: null, swing: null };
  try {
    const data = JSON.parse(fs.readFileSync(ENTRY_TRACKER_PATH, 'utf8'));
    return { scalp: data.scalp || null, day: data.day || null, swing: data.swing || null };
  } catch (e) {
    return { scalp: null, day: null, swing: null };
  }
}
function saveEntryTracker(t) {
  fs.writeFileSync(ENTRY_TRACKER_PATH, JSON.stringify(t, null, 2));
}

function loadBatonState() {
  if (!fs.existsSync(BATON_STATE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(BATON_STATE_PATH, 'utf8'));
  } catch (e) {
    return null;
  }
}

// PNL simule : pourcentage de variation entre entree et prix courant,
// applique au levier -- purement indicatif. Plafonne a -100% : une
// position en marge isolee ne peut structurellement pas perdre plus que
// sa marge (checkLiquidation() devrait deja l'empecher en pratique).
function computePnlPercent(trade, exitPrice) {
  if (exitPrice === null || exitPrice === undefined) return null;
  if (trade.entryPrice === null || trade.entryPrice === undefined) return null;
  const rawPct = trade.direction === 'long'
    ? ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100
    : ((trade.entryPrice - exitPrice) / trade.entryPrice) * 100;
  const pnl = rawPct * (trade.leverage || 1);
  return Math.max(pnl, -100);
}

const ORDER_DEFAULTS = {
  leverage: 25, // baisse de 50x le 04/08/2026 -- comparaison risque/PnL sur 5 jours, decision Benjamin
  orderType: 'market',
  openType: 'isolated', // marge isolee -- necessaire pour que la liquidation par levier soit un vrai plafond
};

/**
 * Prix de liquidation par levier -- SEUL filet de protection (31/07/2026,
 * plus de stop manuel). A `leverage`x, une perte de -100% de la marge
 * correspond a un mouvement de prix de (entryPrice / leverage) contre la
 * position. A 50x : +/-2% depuis l'entree.
 */
function computeLiquidationPrice(entryPrice, direction, leverage) {
  if (!leverage || leverage <= 0 || !entryPrice) return null;
  const distance = entryPrice / leverage;
  return direction === 'long' ? entryPrice - distance : entryPrice + distance;
}

function checkLiquidation(trade) {
  if (trade.liquidationPrice === null || trade.liquidationPrice === undefined) return false;
  const high = trade.priceHighSinceEntry;
  const low = trade.priceLowSinceEntry;
  if (high === undefined || low === undefined) return false;
  if (trade.direction === 'long') return low <= trade.liquidationPrice;
  if (trade.direction === 'short') return high >= trade.liquidationPrice;
  return false;
}

/**
 * Entree pilotee par le baton de relais. Consulte baton-state.json :
 * lastAction (persistant, contrairement a "action" qui n'est vrai qu'un
 * seul tick) porte la direction resolue par la chaine evenement/
 * vigilance/reaction-prix. Chaque action n'est utilisee QU'UNE FOIS par
 * module (lastConsumedTs empeche de re-entrer sur le meme signal).
 */
function evaluateEntryFromBaton(batonState, lastConsumedTs, config) {
  if (!batonState || !batonState.lastAction) return null;
  const la = batonState.lastAction;
  if (!la.timestamp || !la.direction) return null;
  if (lastConsumedTs && la.timestamp <= lastConsumedTs) return null; // deja consomme

  const direction = la.direction === 'haussier' ? 'long' : (la.direction === 'baissier' ? 'short' : null);
  if (!direction) return null;

  /* FILTRE DIRECTIONNEL VAGUE MCB 15m (11/08/2026) -- regle de Benjamin.
   * Le dernier point confirme de la vague 15m definit le sens autorise :
   * pic (rouge) = seuls les SHORT, creux (vert) = seuls les LONG.
   * C'est un ETAT qui dure jusqu'au pivot suivant. Motif : deux LONG a
   * contresens en une heure le 11/08 (-11.52% et -12.28%) pendant une chute
   * continue, alors que toutes les pentes pointaient vers le haut.
   * Desactiver : waveRegimeFilter.enabled = false. */
  const _wrCfg = (config && config.tradeSimulator && config.tradeSimulator.waveRegimeFilter) || {};

  /* GARDE-FOU REGIME INDETERMINE (14/08/2026) -- avant ce patch, un
   * waveRegime15 a null faisait tomber toute la condition a faux, donc
   * sautait le filtre ENTIER : regime inconnu = toutes les entrees
   * autorisees, dans les deux sens. C'est l'inverse du comportement voulu.
   * Un regime inconnu doit conduire a s'abstenir, pas a tout permettre --
   * surtout au moment de la bascule vers le signal MCB natif, ou le CSV 15m
   * met plusieurs heures a fournir de quoi determiner un regime.
   * Revenir a l'ancien comportement : allowWhenRegimeUnknown = true. */
  if (_wrCfg.enabled !== false && !batonState.waveRegime15
      && _wrCfg.allowWhenRegimeUnknown !== true) {
    return null; // regime de vague 15m indetermine -- abstention par prudence
  }

  if (_wrCfg.enabled !== false && batonState.waveRegime15) {
    const allowed = batonState.waveRegime15 === 'haussier' ? 'long' : 'short';
    if (direction !== allowed) {
      return null; // contresens du regime de la vague MCB 15m -- entree refusee
    }

    /* ABSTENTION SUR DESACCORD (11/08/2026) -- quand le VWAP3 contredit
     * franchement le regime 15m, on n'entre dans AUCUN sens : le regime
     * autorise encore une direction, mais le court terme a deja bascule.
     * Cas reel : SHORT du 17:58 (-3.23%), regime baissier mais VWAP3 deja
     * repasse a +2.72. Critere = le SIGNE du VWAP3, pas sa pente (celle-ci
     * etait a +1.48, classee "plate", et n'aurait pas suffi).
     * ENTREES UNIQUEMENT -- les sorties ne sont jamais bloquees. */
    if (_wrCfg.abstainOnVwap3Disagreement !== false) {
      const v3 = batonState.vwap3 !== undefined ? batonState.vwap3 : null;
      const deadZone = _wrCfg.vwap3DeadZone !== undefined ? _wrCfg.vwap3DeadZone : 2.0;
      if (v3 !== null && Math.abs(v3) >= deadZone) {
        const v3Says = v3 > 0 ? 'haussier' : 'baissier';
        if (v3Says !== batonState.waveRegime15) {
          return null; // VWAP3 contredit le regime 15m -- abstention totale
        }
      }
    }
  }

  // FILTRE PIVOT DE VAGUE MCB (04/08/2026, Benjamin) : un point vert
  // (creux confirme) = signal haussier, bloque les SHORT. Un point rouge
  // (pic confirme) = signal baissier, bloque les LONG. Doit etre recent
  // (maxAgePivotCandles) pour rester valable.
  const pivotCfg = (config && config.tradeSimulator && config.tradeSimulator.wavePivotFilter) || {};
  // Age en CYCLES REELS de 30s (11/08/2026) -- l'ancien comptage en bougies 3m
  // rendait le filtre d'entree inoperant (0 blocage sur 57 candidats mesures).
  const _pivAge = batonState.wavePivotAgeRealCycles !== undefined && batonState.wavePivotAgeRealCycles !== null
    ? batonState.wavePivotAgeRealCycles
    : batonState.wavePivotAgeCycles;
  // BLOCAGE D'ENTREE DESACTIVE le 11/08/2026 (decision Benjamin) -- voir
  // en-tete du patch Y. Le pivot reste ACTIF EN SORTIE. Le probleme du
  // systeme est le manque d'entrees, et les signaux de pente (3 echelles,
  // dont la live a 30s) + displacementPct sont plus riches et plus frais.
  // Reactiver : wavePivotFilter.blockEntry = true dans config.json.
  if (pivotCfg.blockEntry === true
      && pivotCfg.enabled !== false && batonState.wavePivotType && _pivAge !== null && _pivAge !== undefined) {
    const maxAge = pivotCfg.maxAgePivotCycles !== undefined ? pivotCfg.maxAgePivotCycles
      : (pivotCfg.maxAgePivotCandles !== undefined ? pivotCfg.maxAgePivotCandles : 6);
    // LEVEE ANTICIPEE (10/08/2026) : le blocage saute avant l'echeance du
    // minuteur si la pente du VWAP s'est inversee contre le sens du pivot --
    // le marche a repris la main dans l'autre sens, le pivot est caduc.
    // Ne peut que RACCOURCIR le blocage, jamais l'allonger.
    const pivotDirEarly = batonState.wavePivotType === 'creux' ? 'haussier' : 'baissier';
    const slopeOpposes = pivotCfg.earlyReleaseOnSlope !== false
      && batonState.vwap3SlopeDir
      && batonState.vwap3SlopeDir !== 'plat'
      && batonState.vwap3SlopeDir !== (pivotDirEarly === 'haussier' ? 'montant' : 'descendant');
    if (_pivAge <= maxAge && !slopeOpposes) {
      const pivotDir = batonState.wavePivotType === 'creux' ? 'long' : 'short';
      if (direction !== pivotDir) {
        return null; // contresens d'un point de retournement recent -- entree refusee
      }
    }
  }

  return {
    direction,
    reason: `baton ${la.type || ''} ${la.direction} -- ${la.reason || 'action resolue'}`,
    actionTimestamp: la.timestamp,
  };
}

/**
 * Declencheur NetMove independant (meme seuil que la reaction prix de
 * l'entree) : |netMove| >= 0.06% declenche immediatement ; >= 0.03%
 * confirme sur 2 batons consecutifs dans le meme sens. Maintient son
 * propre etat de confirmation sur le trade (pendingNetMoveDirection),
 * independant de toute vigilance cadence deja ouverte ou non.
 */
function checkNetMoveThreshold(trade, batonState) {
  if (!batonState || batonState.netMovePct === null || batonState.netMovePct === undefined) return false;
  if (!batonState.direction || batonState.direction === 'neutre') return false;
  const absMove = Math.abs(batonState.netMovePct);

  if (absMove >= 0.06) {
    trade.pendingNetMoveDirection = null;
    return true; // immediat
  }
  if (absMove >= 0.03) {
    if (trade.pendingNetMoveDirection === batonState.direction) {
      trade.pendingNetMoveDirection = null;
      return true; // confirme sur 2 batons consecutifs
    }
    trade.pendingNetMoveDirection = batonState.direction;
    return false;
  }
  trade.pendingNetMoveDirection = null;
  return false;
}

/**
 * SEUIL D'INVALIDATION PROPORTIONNEL (03/08/2026). cadenceMult et NMx sont
 * deja relatifs a la volatilite recente -- reversalPct etait le seul seuil
 * reste fixe, ce qui l'a rendu trop serré pendant un episode de forte
 * volatilite le 03/08 (6 pertes consecutives, -51.70%, alors que le bot
 * etait pourtant entre dans le bon sens).
 *
 * Fenetre de reference VOLONTAIREMENT LONGUE (2h) : une fenetre courte
 * (10-30min) explose PENDANT l'episode volatil lui-meme et deviendrait
 * trop laxiste au pire moment. Sur 2h, la baseline reste stable meme en
 * plein episode (mesure : 0.11-0.17% contre jusqu'a 0.42% en fenetre 10min).
 */
function computeAdaptiveThreshold(priceHistoryLong, multiplier, floor, ceiling) {
  if (!priceHistoryLong || priceHistoryLong.length < 20) return floor;
  const disps = [];
  for (let i = 10; i < priceHistoryLong.length; i++) {
    const p0 = priceHistoryLong[i - 10];
    const p1 = priceHistoryLong[i];
    if (p0) disps.push(Math.abs(((p1 - p0) / p0) * 100));
  }
  if (!disps.length) return floor;
  const baseline = disps.reduce((a, v) => a + v, 0) / disps.length;
  const adaptive = baseline * multiplier;
  return Math.min(ceiling, Math.max(floor, adaptive));
}

/**
 * INVALIDATION (02/08/2026) -- la position meurt quand le scenario qui l'a
 * motivee n'existe plus. Deux causes : flux inverse, ou flux eteint.
 * Ce n'est pas un stop-loss : aucun niveau de perte n'intervient dans la
 * decision, seulement l'etat du flux (displacementPct du baton).
 */
function checkInvalidation(trade, batonState, config, price) {
  const cfg = (config && config.tradeSimulator && config.tradeSimulator.invalidation) || {};
  if (cfg.enabled === false) return null;

  // Buffer long pour le seuil adaptatif (03/08/2026) -- alimente a chaque
  // appel, independant de trade.entryPrice (persiste entre les trades).
  if (price) {
    priceHistoryLong.push(price);
    if (priceHistoryLong.length > PRICE_HISTORY_LONG_MAX) priceHistoryLong.shift();
  }

  const adaptive = cfg.adaptiveThreshold !== false;
  const floor = cfg.reversalFloorPct !== undefined ? cfg.reversalFloorPct : 0.10;
  const ceiling = cfg.reversalCeilingPct !== undefined ? cfg.reversalCeilingPct : 0.30;
  const multiplier = cfg.reversalMultiplier !== undefined ? cfg.reversalMultiplier : 3;
  const reversalPct = adaptive
    ? computeAdaptiveThreshold(priceHistoryLong, multiplier, floor, ceiling)
    : (cfg.reversalPct !== undefined ? cfg.reversalPct : 0.06);
  // stallPct ADAPTATIF (11/08/2026) -- meme logique que reversalPct, qui l'est
  // depuis le 03/08. Multiplicateur plus faible (1.0 vs 3.0) : le flux eteint
  // detecte l'ABSENCE de mouvement, il doit donc se declencher autour du
  // niveau ordinaire du moment, pas trois fois au-dessus.
  const adaptiveStall = cfg.adaptiveStall !== false;
  const stallFloor = cfg.stallFloorPct !== undefined ? cfg.stallFloorPct : 0.020;
  const stallCeiling = cfg.stallCeilingPct !== undefined ? cfg.stallCeilingPct : 0.080;
  const stallMultiplier = cfg.stallMultiplier !== undefined ? cfg.stallMultiplier : 1.0;
  const stallPct = adaptiveStall
    ? computeAdaptiveThreshold(priceHistoryLong, stallMultiplier, stallFloor, stallCeiling)
    : (cfg.stallPct !== undefined ? cfg.stallPct : 0.023);
  const stallCycles = cfg.stallCycles !== undefined ? cfg.stallCycles : 20;
  const graceCycles = cfg.graceCycles !== undefined ? cfg.graceCycles : 2;
  const reversalConfirmCycles = cfg.reversalConfirmCycles !== undefined ? cfg.reversalConfirmCycles : 2;
  const exitInProfit = cfg.exitInProfit !== false;

  trade.cyclesSinceEntry = (trade.cyclesSinceEntry || 0) + 1;
  if (trade.cyclesSinceEntry <= graceCycles) return null;

  const disp = batonState ? batonState.displacementPct : null;
  if (disp === null || disp === undefined) return null;

  // Position en profit ? (en % de prix, hors levier)
  let favorPct = null;
  if (price && trade.entryPrice) {
    favorPct = trade.direction === 'long'
      ? ((price - trade.entryPrice) / trade.entryPrice) * 100
      : ((trade.entryPrice - price) / trade.entryPrice) * 100;
  }

  // PIVOT DE VAGUE MCB EN SORTIE (04/08/2026, Benjamin) : un point oppose
  // frais invalide immediatement, sans attendre de confirmation
  // supplementaire -- le point est deja confirme sur sa propre bougie 3m
  // (cf patch M). Meme flag de config que le filtre d'entree (patch N).
  const pivotCfg = (config && config.tradeSimulator && config.tradeSimulator.wavePivotFilter) || {};
  // Age en CYCLES REELS de 30s (11/08/2026) -- l'ancien comptage en bougies 3m
  // rendait le filtre d'entree inoperant (0 blocage sur 57 candidats mesures).
  const _pivAge = batonState.wavePivotAgeRealCycles !== undefined && batonState.wavePivotAgeRealCycles !== null
    ? batonState.wavePivotAgeRealCycles
    : batonState.wavePivotAgeCycles;
  if (pivotCfg.enabled !== false && batonState.wavePivotType && _pivAge !== null && _pivAge !== undefined) {
    const maxAge = pivotCfg.maxAgePivotCycles !== undefined ? pivotCfg.maxAgePivotCycles
      : (pivotCfg.maxAgePivotCandles !== undefined ? pivotCfg.maxAgePivotCandles : 6);
    // Meme levee anticipee qu'a l'entree (10/08/2026) : un pivot dont la
    // pente VWAP s'est inversee ne doit plus provoquer de sortie.
    const _pivotDirEarly = batonState.wavePivotType === 'creux' ? 'haussier' : 'baissier';
    const _slopeOpposes = pivotCfg.earlyReleaseOnSlope !== false
      && batonState.vwap3SlopeDir
      && batonState.vwap3SlopeDir !== 'plat'
      && batonState.vwap3SlopeDir !== (_pivotDirEarly === 'haussier' ? 'montant' : 'descendant');
    // FILTRE DE MAGNITUDE (13/08/2026) -- diagnostic sur 39 occurrences,
    // decoupage par tercile : pivots faibles (1.1-27.9) et moyens
    // (28.3-49.3) nettement perdants (win% 23.1 et 15.4), pivots forts
    // (49.5-78.3) a l'equilibre (win% 30.8). Aucun filtre n'existait avant
    // ce patch. Seuil a 35 par defaut, ajustable via config.json
    // (config.tradeSimulator.wavePivotFilter.minPivotValue).
    const minPivotValue = pivotCfg.minPivotValue !== undefined ? pivotCfg.minPivotValue : 35;
    const pivotMagnitudeOk = Math.abs(batonState.wavePivotValue) >= minPivotValue;
    if (_pivAge <= maxAge && !_slopeOpposes && pivotMagnitudeOk) {
      const opposedByPeak = trade.direction === 'long' && batonState.wavePivotType === 'pic';
      const opposedByTrough = trade.direction === 'short' && batonState.wavePivotType === 'creux';
      if (opposedByPeak || opposedByTrough) {
        if (exitInProfit || favorPct === null || favorPct <= 0) {
          return `invalidation -- pivot de vague MCB oppose (${batonState.wavePivotType}, valeur ${batonState.wavePivotValue})`;
        }
      }
    }
  }

  // 1. FLUX INVERSE : le deplacement va contre la position au-dela du seuil,
  // CONFIRME sur plusieurs cycles consecutifs (02/08/2026 : sans confirmation,
  // 6 invalidations sur 7 etaient prematurees -- le zigzag du marche suffisait
  // a franchir le seuil un cycle isole).
  //
  // DESACTIVE PAR DEFAUT (13/08/2026) -- diagnostic sur 10 occurrences :
  // reversalCount valait systematiquement 2 (le minimum), la confirmation
  // ne filtrait donc jamais rien en pratique. 0% de trades gagnants,
  // -58.91% cumule. A 25x, un simple 0.10-0.40% de mouvement de prix
  // devient 2.5% a 12% de perte de compte. Recalibrage prevu apres la
  // migration au levier 10x (OKX) -- reactivable via config.json
  // (config.tradeSimulator.invalidation.reversalEnabled = true).
  const reversalEnabled = cfg.reversalEnabled === true;
  const adverse = trade.direction === 'long' ? -disp : disp;
  if (reversalEnabled && adverse >= reversalPct) {
    trade.reversalCount = (trade.reversalCount || 0) + 1;
    if (trade.reversalCount >= reversalConfirmCycles
        && (exitInProfit || favorPct === null || favorPct <= 0)) {
      trade.stallCount = 0;
      return `invalidation -- flux inverse (deplacement 5min ${disp}% contre la position sur ${trade.reversalCount} cycles, seuil ${reversalPct}%)`;
    }
  } else {
    trade.reversalCount = 0;
  }

  // 2. FLUX ETEINT : rien ne bouge depuis assez longtemps.
  if (Math.abs(disp) < stallPct) {
    trade.stallCount = (trade.stallCount || 0) + 1;
    if (trade.stallCount >= stallCycles) {
      return `invalidation -- flux eteint (${trade.stallCount} cycles sous ${stallPct}%)`;
    }
  } else {
    trade.stallCount = 0;
  }

  return null;
}

/**
 * Progression des tranches 25/65/10 -- declenchee par TROIS voies
 * independantes, decision de Benjamin : un NOUVEL evenement de cadence
 * (front montant de baton-state.isEvent), un NOUVEAU passage a zero du
 * VWAP (front montant), OU un seuil NetMove (meme regle que la reaction
 * prix de l'entree, 0.06% immediat / 0.03% confirme x2). Chacun n'est
 * compte qu'une fois par occurrence reelle (pas a chaque tick ou la
 * condition reste vraie).
 */
/**
 * Source VWAP du declencheur de tranche (02/08/2026). Utilisee A LA FOIS a
 * l'initialisation de lastCrossedZeroSeen et dans checkTrancheProgress :
 * initialiser l'etat avec un timeframe et le surveiller avec un autre faisait
 * manquer le premier front montant.
 */
function resolveVwapSource(primaryVol, volByTf, config) {
  const tf = (config && config.tradeSimulator && config.tradeSimulator.vwapTriggerTimeframe)
    || '15m';
  return (volByTf && volByTf[tf] && volByTf[tf].vwap)
    ? volByTf[tf].vwap
    : (primaryVol && primaryVol.vwap);
}

const ADVERSE_TOLERANCE_PCT = 0.02; // % de prix -- au-dela, declencheur ignore (02/08/2026)

const COOLDOWN_PATH = path.join(__dirname, '../data/trade-sim-cooldown.json');
const PRICE_HISTORY_LONG_MAX = 240; // 2h a 30s/cycle -- fenetre de reference du seuil adaptatif
let priceHistoryLong = [];

/**
 * COOLDOWN APRES UNE PERTE (03/08/2026) -- voir en-tete du patch. Fichier
 * separe de trade-sim-state.json car il doit SURVIVRE a la fermeture de
 * la position (on mesure le delai depuis la derniere sortie perdante).
 */
function loadCooldowns() {
  if (!fs.existsSync(COOLDOWN_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(COOLDOWN_PATH, 'utf8')); }
  catch (e) { return {}; }
}

function saveCooldowns(data) {
  fs.writeFileSync(COOLDOWN_PATH, JSON.stringify(data, null, 2));
}

function isInCooldown(module, config) {
  const minutes = (config && config.tradeSimulator && config.tradeSimulator.cooldownAfterLossMinutes !== undefined)
    ? config.tradeSimulator.cooldownAfterLossMinutes : 10;
  if (!minutes) return false;
  const cooldowns = loadCooldowns();
  const last = cooldowns[module];
  if (!last) return false;
  const elapsedMin = (Date.now() - new Date(last).getTime()) / 60000;
  return elapsedMin < minutes;
}

function recordLossExit(module) {
  const cooldowns = loadCooldowns();
  cooldowns[module] = new Date().toISOString();
  saveCooldowns(cooldowns);
}

function checkTrancheProgress(trade, batonState, primaryVol, volByTf, config) {
  // Sens du mouvement PAR RAPPORT A LA POSITION : positif = en notre
  // faveur, negatif = contre nous. En % de prix, hors levier.
  const px = (primaryVol && primaryVol.trigger) ? parseFloat(primaryVol.trigger.lastPrice) : null;
  let favorPct = null;
  if (px && trade.entryPrice) {
    favorPct = trade.direction === 'long'
      ? ((px - trade.entryPrice) / trade.entryPrice) * 100
      : ((trade.entryPrice - px) / trade.entryPrice) * 100;
  }
  const isEventNow = !!(batonState && batonState.isEvent);
  // Timeframe du declencheur VWAP (02/08/2026) : le 4h du module day ne
  // traversait zero qu'une fois par jour -- 1 seul usage sur 81 tranches.
  const vwapSrc = resolveVwapSource(primaryVol, volByTf, config);
  const crossedNow = !!(vwapSrc && vwapSrc.crossedZero);

  const eventIsNew = isEventNow && !trade.lastIsEventSeen;
  const crossIsNew = crossedNow && !trade.lastCrossedZeroSeen;
  const netMoveIsNew = checkNetMoveThreshold(trade, batonState);

  trade.lastIsEventSeen = isEventNow;
  trade.lastCrossedZeroSeen = crossedNow;

  if (!eventIsNew && !crossIsNew && !netMoveIsNew) return null;

  // FILTRE DIRECTIONNEL (02/08/2026) : ne pas consommer de tranche quand le
  // mouvement va contre la position au-dela de la tolerance. Sans ce filtre,
  // un pic de cadence pendant un mouvement adverse ferme la tranche au pire
  // prix (cas du 02/08 04:07, -19.29% puis -29.44%).
  if (favorPct !== null && favorPct < -ADVERSE_TOLERANCE_PCT) {
    trade.lastAdverseSkip = new Date().toISOString();
    return null;
  }

  trade.eventsSinceEntry += 1;
  let triggerLabel;
  if (eventIsNew) triggerLabel = `evenement cadence (x${batonState.cadenceMultiplier})`;
  else if (crossIsNew) triggerLabel = 'passage a zero VWAP';
  else triggerLabel = `netMove (${batonState.netMovePct}%)`;

  if (trade.eventsSinceEntry === 1) {
    return { stage: 1, fraction: 25, reason: `1er declencheur : ${triggerLabel}` };
  }
  if (trade.eventsSinceEntry === 2) {
    return { stage: 2, fraction: 65, reason: `2e declencheur : ${triggerLabel}` };
  }
  return {
    stage: 3,
    fraction: 10,
    reason: `${trade.eventsSinceEntry}e declencheur (${triggerLabel}) -- residu ferme, shlong complet non implemente`,
  };
}

/**
 * BLACKOUT PROGRAMME (02/08/2026) -- fenetres pendant lesquelles le simulateur
 * n'ouvre aucune position et ferme celles qui sont ouvertes. Prevu pour les
 * maintenances reseau annoncees, ou toute periode ou l'on ne veut pas que le
 * bot trade sans surveillance. Format ISO 8601 UTC dans config.json.
 */
function isInBlackout(config) {
  const wins = (config && config.tradeSimulator && config.tradeSimulator.blackoutWindows) || [];
  if (!wins.length) return null;
  const now = Date.now();
  for (const w of wins) {
    if (!w || !w.from || !w.to) continue;
    const from = Date.parse(w.from);
    const to = Date.parse(w.to);
    if (isNaN(from) || isNaN(to)) continue;
    if (now >= from && now <= to) return w;
  }
  return null;
}

/**
 * Point d'entree principal, appele une fois par module (scalp/day/swing)
 * a chaque tick de cerveau-central.js. Signature INCHANGEE (compatibilite
 * avec l'appel existant dans cerveau-central.js) -- divRaw n'est plus
 * utilise (l'ancienne branche de liquidation par divergence a disparu
 * avec l'ancienne loi de sortie), conserve uniquement pour compatibilite
 * d'appel.
 */
function simulateModule(module, primaryVol, divRaw, config, volByTf) {
  // Filtre des modules actifs (02/08/2026) : les trois modules ouvraient la
  // meme position a l'identique, soit 3x l'exposition prevue. Seul day est
  // actif le temps de le calibrer proprement.
  const active = (config && config.tradeSimulator && config.tradeSimulator.activeModules)
    || ['day'];
  if (!active.includes(module)) return null;

  const state = loadState();
  const trade = state[module];
  const price = primaryVol.trigger && primaryVol.trigger.lastPrice;
  const batonState = loadBatonState();

  // Blackout programme : aucune nouvelle entree, et fermeture preventive de
  // toute position ouverte. Verifie AVANT toute autre logique.
  const blackout = isInBlackout(config);
  if (blackout) {
    if (trade) {
      const direction = trade.direction;
      appendHistory({
        module,
        direction,
        entryPrice: trade.entryPrice,
        entryTimestamp: trade.entryTimestamp,
        exitPrice: price,
        exitTimestamp: new Date().toISOString(),
        exitReason: `blackout programme (${blackout.label || 'fenetre de maintenance'}) -- fermeture preventive`,
        leverage: trade.leverage,
        positionSizePercent: trade.positionSizePercent,
        pnlPercent: computePnlPercent(trade, price),
      });
      state[module] = null;
      saveState(state);
      return `[TRADE-SIM] ${module.toUpperCase()} ${direction} SORTIE @ ${price} (blackout programme)`;
    }
    return null;
  }

  if (!trade) {
    if (checkCircuitBreaker(config)) return null; // coupe-circuit actif, pas de nouvelle entree
    if (isInCooldown(module, config)) return null; // cooldown apres perte (03/08/2026), voir en-tete du patch

    const entryTracker = loadEntryTracker();
    const entry = evaluateEntryFromBaton(batonState, entryTracker[module], config);
    if (!entry) return null;

    entryTracker[module] = entry.actionTimestamp;
    saveEntryTracker(entryTracker);

    const positionSizePercent = (config && config.positionSizing && config.positionSizing.maxCapitalPercentPerTrade) || null;
    const liquidationPrice = computeLiquidationPrice(price, entry.direction, ORDER_DEFAULTS.leverage);

    state[module] = {
      direction: entry.direction,
      entryPrice: price,
      entryTimestamp: new Date().toISOString(),
      leverage: ORDER_DEFAULTS.leverage,
      positionSizePercent,
      orderType: ORDER_DEFAULTS.orderType,
      openType: ORDER_DEFAULTS.openType,
      liquidationPrice,
      eventsSinceEntry: 0,
      lastIsEventSeen: !!(batonState && batonState.isEvent),
      lastCrossedZeroSeen: !!(resolveVwapSource(primaryVol, volByTf, config) || {}).crossedZero,
      pendingNetMoveDirection: null,
      trancheStage: 0,
      priceHighSinceEntry: price,
      priceLowSinceEntry: price,
    };
    saveState(state);

    const label = entry.direction === 'long' ? 'ENTRER_LONG' : 'ENTRER_SHORT';
    return `[TRADE-SIM] ${module.toUpperCase()} ${label} @ ${price} (${entry.reason}) [levier=${ORDER_DEFAULTS.leverage}x, ${ORDER_DEFAULTS.orderType}, ${ORDER_DEFAULTS.openType}, taille=${positionSizePercent}%, liquidation=${liquidationPrice}]`;
  }

  // Suivi du plus haut/bas REEL depuis l'entree (corrige le 01/08/2026 --
  // l'ancienne version comparait au high/low d'une bougie ENTIERE du
  // timeframe primaire, pouvant inclure un pic survenu AVANT l'entree,
  // ou a l'inverse rater un vrai pic hors de la fenetre de cette bougie).
  const tickHigh = (primaryVol && primaryVol.trigger && primaryVol.trigger.priceHigh !== undefined && primaryVol.trigger.priceHigh !== null)
    ? parseFloat(primaryVol.trigger.priceHigh) : price;
  const tickLow = (primaryVol && primaryVol.trigger && primaryVol.trigger.priceLow !== undefined && primaryVol.trigger.priceLow !== null)
    ? parseFloat(primaryVol.trigger.priceLow) : price;
  if (tickHigh !== null && (trade.priceHighSinceEntry === undefined || tickHigh > trade.priceHighSinceEntry)) trade.priceHighSinceEntry = tickHigh;
  if (tickLow !== null && (trade.priceLowSinceEntry === undefined || tickLow < trade.priceLowSinceEntry)) trade.priceLowSinceEntry = tickLow;

  // Mouvement violent en UN SEUL cycle (03/08/2026) : liquidation instantanee
  // si aucune tranche n'a encore ete prise (voir en-tete du patch -- une
  // liquidation inconditionnelle coupait aussi des positions deja gagnantes).
  const vmCfg = (config && config.tradeSimulator && config.tradeSimulator.violentMove) || {};
  const vmThreshold = vmCfg.thresholdPct !== undefined ? vmCfg.thresholdPct : 0.15;
  if (vmCfg.enabled !== false && trade.trancheStage === 0 && trade.lastPriceSeen !== undefined) {
    const moveOneCycle = ((price - trade.lastPriceSeen) / trade.lastPriceSeen) * 100;
    const adverseOneCycle = trade.direction === 'long' ? -moveOneCycle : moveOneCycle;
    if (adverseOneCycle >= vmThreshold) {
      const direction = trade.direction;
      appendHistory({
        module,
        direction,
        entryPrice: trade.entryPrice,
        entryTimestamp: trade.entryTimestamp,
        exitPrice: price,
        exitTimestamp: new Date().toISOString(),
        exitReason: `liquidation instantanee -- mouvement violent (${moveOneCycle.toFixed(3)}% en 1 cycle, tranche 0, seuil ${vmThreshold}%)`,
        leverage: trade.leverage,
        positionSizePercent: trade.positionSizePercent,
        pnlPercent: computePnlPercent(trade, price),
      });
      recordLossExit(module); // toujours une perte par construction (mouvement violent adverse)
      state[module] = null;
      saveState(state);
      return `[TRADE-SIM] ${module.toUpperCase()} ${direction} LIQUIDER @ ${price} (mouvement violent ${moveOneCycle.toFixed(3)}%, tranche 0)`;
    }
  }
  trade.lastPriceSeen = price;

  // 0. Liquidation par levier -- verifiee a CHAQUE tick DES L'ENTREE (mode
  // meche, plus haut/bas REEL depuis l'entree). SEUL filet de protection.
  if (checkLiquidation(trade)) {
    const direction = trade.direction;
    appendHistory({
      module,
      direction,
      entryPrice: trade.entryPrice,
      entryTimestamp: trade.entryTimestamp,
      exitPrice: price,
      exitTimestamp: new Date().toISOString(),
      exitReason: `liquidation par levier touchee a ${trade.liquidationPrice} (mode meche, ${trade.leverage}x)`,
      leverage: trade.leverage,
      positionSizePercent: trade.positionSizePercent,
      pnlPercent: computePnlPercent(trade, price),
    });
    recordLossExit(module); // toujours une perte par construction (liquidation)
    state[module] = null;
    saveState(state);
    return `[TRADE-SIM] ${module.toUpperCase()} ${direction} LIQUIDER @ ${price} (liquidation par levier touchee a ${trade.liquidationPrice}, ${trade.leverage}x)`;
  }

  // 0.4. INVALIDATION (02/08/2026) : le scenario d'entree n'existe plus.
  // Verifiee avant les tranches -- une position dont la raison d'etre a
  // disparu ne doit pas attendre un declencheur pour sortir.
  const invalidReason = checkInvalidation(trade, batonState, config, price);
  if (invalidReason) {
    const direction = trade.direction;
    appendHistory({
      module,
      direction,
      entryPrice: trade.entryPrice,
      entryTimestamp: trade.entryTimestamp,
      exitPrice: price,
      exitTimestamp: new Date().toISOString(),
      exitReason: invalidReason,
      leverage: trade.leverage,
      positionSizePercent: trade.positionSizePercent,
      pnlPercent: computePnlPercent(trade, price),
    });
    if (computePnlPercent(trade, price) < 0) recordLossExit(module);
    state[module] = null;
    saveState(state);
    return `[TRADE-SIM] ${module.toUpperCase()} ${direction} SORTIE @ ${price} (${invalidReason})`;
  }

  // 0.5. Timeout anti-zombie (garde-fou complementaire) : tant qu'aucune
  // tranche n'a ete prise, la position est pleinement exposee -- ferme de
  // force au-dela du delai configure.
  if (trade.trancheStage === 0) {
    const maxHold = config && config.tradeSimulator && config.tradeSimulator.maxHoldMinutesWithoutTp1
      ? config.tradeSimulator.maxHoldMinutesWithoutTp1[module]
      : null;
    if (maxHold) {
      const elapsedMinutes = (Date.now() - new Date(trade.entryTimestamp).getTime()) / 60000;
      if (elapsedMinutes >= maxHold) {
        const direction = trade.direction;
        appendHistory({
          module,
          direction,
          entryPrice: trade.entryPrice,
          entryTimestamp: trade.entryTimestamp,
          exitPrice: price,
          exitTimestamp: new Date().toISOString(),
          exitReason: `timeout anti-zombie (${elapsedMinutes.toFixed(1)} min sans tranche, max ${maxHold})`,
          leverage: trade.leverage,
          positionSizePercent: trade.positionSizePercent,
          pnlPercent: computePnlPercent(trade, price),
        });
        if (computePnlPercent(trade, price) < 0) recordLossExit(module);
        state[module] = null;
        saveState(state);
        return `[TRADE-SIM] ${module.toUpperCase()} ${direction} LIQUIDER @ ${price} (timeout anti-zombie, ${elapsedMinutes.toFixed(1)} min sans tranche)`;
      }
    }
  }

  // 1. Progression des tranches 25/65/10.
  const progress = checkTrancheProgress(trade, batonState, primaryVol, volByTf, config);
  if (!progress) {
    saveState(state); // persiste lastIsEventSeen/lastCrossedZeroSeen mis a jour
    return null;
  }

  trade.trancheStage = progress.stage;
  const pnl = computePnlPercent(trade, price);
  appendHistory({
    module,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    entryTimestamp: trade.entryTimestamp,
    exitPrice: price,
    exitTimestamp: new Date().toISOString(),
    exitReason: `tranche ${progress.fraction}% -- ${progress.reason}`,
    fraction: progress.fraction,
    trancheStage: progress.stage,
    leverage: trade.leverage,
    positionSizePercent: trade.positionSizePercent,
    pnlPercent: pnl,
  });

  if (progress.stage >= 3) {
    state[module] = null;
    saveState(state);
    return `[TRADE-SIM] ${module.toUpperCase()} ${trade.direction} FERME (residu 10%) @ ${price} (${progress.reason})`;
  }

  state[module] = trade;
  saveState(state);
  return `[TRADE-SIM] ${module.toUpperCase()} ${trade.direction} TRANCHE ${progress.fraction}% @ ${price} (${progress.reason})`;
}

module.exports = { simulateModule, loadState, ORDER_DEFAULTS, computeLiquidationPrice };
