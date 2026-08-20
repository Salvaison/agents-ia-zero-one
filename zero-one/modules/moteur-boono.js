/**
 * moteur-boono.js — Moteur de decision selon la logique Lieu/Passage/Evenement.
 *
 * Ecrit le 19/08/2026 d'apres logique-trading-190826.md.
 *
 * ── LECTURE SEULE SUR L'EXISTANT ───────────────────────────────────────
 *
 * Ce module ne modifie RIEN de ce qui tourne. Il lit baton-state.json et
 * trendlines.json, ecrit ses propres fichiers (moteur-boono-state.json et
 * moteur-boono-history.json), et n'a aucun acces partage en ecriture avec
 * trade-simulator.js. Les deux logiques tournent donc en parallele sur les
 * memes donnees, ce qui donne un point de comparaison.
 *
 * Reference a battre : l'ancienne logique fait 205% de PNL cumule sur 142
 * entrees, 68.7% de reussite. Elle est jugee mal concue -- shorts pris en
 * pleine hausse, declencheurs sans valeur directionnelle -- mais elle gagne.
 * Le nouveau moteur devra faire mieux pour justifier de la remplacer.
 *
 * ── CHEMINS RELATIFS ───────────────────────────────────────────────────
 *
 * Tous construits avec path.join(__dirname, ...). Le module est transportable
 * vers Amsterdam par un simple git pull, sans reancrage.
 *
 * ── LA LOGIQUE ─────────────────────────────────────────────────────────
 *
 * LIEU     — permanent, connu a l'avance : lignes imaginaires, niveaux.
 *            Mesure du 18/08 : Lgi actif donne +249 USD de mouvement a 30 min
 *            avec 95% de hausses, contre +9 USD en reference. Meilleur
 *            predicteur du systeme, sur 3% du temps seulement.
 *
 * PASSAGE  — le prix entre dans la zone. On lit alors le CONTEXTE des quinze
 *            dernieres minutes : MoneyFlow, VWAP, signaux, DBSI. Rien de
 *            cela ne decide -- cela situe le trade et son rapport R/R.
 *
 * EVENEMENT— ce qui se manifeste au passage et declenche : signal MCB 15m
 *            de magnitude suffisante, ecart VW15L-VWAP15, Vslope15.
 *
 * L'EMPILEMENT DEGRADE : mesure du 18/08, >=2 conditions donne +19 USD,
 * >=3 donne +21, >=4 donne +4 -- moins que la reference. On n'exige donc pas
 * un decompte mais la sequence lieu -> evenement.
 *
 * ── CE QU'ON N'UTILISE PAS, ET POURQUOI ────────────────────────────────
 *
 * Passage a zero du VWAP3 : 88 evenements mesures, ratio 0.92 a 0.98 contre
 *   la reference a horizon apparie. Aucune valeur.
 * Accord VWAP3/VWAP15 : 10 USD dans les trois configurations.
 * Signal MCB 3m seul : 31% de reussite, -0.49% sur 42 trades.
 * Coherence de signe sur les signaux MCB : REGLE RETIREE le 19/08. Un creux
 *   de vague peut se produire a valeur positive -- la vague redescend puis
 *   repart sans passer sous zero. Seule la magnitude compte.
 */

const fs = require('fs');
const path = require('path');

const BATON_PATH = path.join(__dirname, '../data/baton-state.json');
const TRENDLINES_PATH = path.join(__dirname, '../data/trendlines.json');
const STATE_PATH = path.join(__dirname, '../data/moteur-boono-state.json');
const HISTORY_PATH = path.join(__dirname, '../data/moteur-boono-history.json');
const CONFIG_PATH = path.join(__dirname, '../config.json');

const CYCLE_MS = 30000;
const HISTORY_MAX = 2000;
/* Au-dela, les donnees du baton sont jugees perimees et le moteur s'abstient. */
const STALE_MS = 120000;

/* ── SEUILS, tous issus de mesures datees ─────────────────────────────── */

/* Signal MCB 15m. Mesure sur 100h (11-15/08) : magnitude >=45 donne 22 trades,
 * +5.96% brut, 64% de reussite, R/R 2.98. Le seuil 45 est l'optimum -- 40 et
 * 50 sont moins bons. */
const MCB_MAGNITUDE_MIN = 45;

/* Ecart VW15L moins VWAP15. Balayage du 18/08 : +48 USD de mouvement a 3,
 * +92 a 6, +136 a 10 avec 72% de hausses. On retient 10. */
const ECART_VW15_MIN = 10;

/* Abstention en marche endormi. Mesure : fenetre courte (<15s) donne 17 USD
 * de mouvement a 5 min, longue (>50s) 9 USD. */
const WINSEC_MAX = 200;
const CADENCE_MULT_MIN = 0.8;

/* Seuils des ecarts VWAP, qui portent desormais la DIRECTION.
 * L'ecart VW15L-VWAP15 est le meilleur indicateur directionnel mesure
 * (correlation +0.228 a 30 min ; +136 USD de mouvement au-dela de 10, avec
 * 72% de hausses). Le Vslope15 le suit de pres (+0.243).
 * En deca de ces seuils, l'indicateur est juge muet plutot que contraire. */
const ECART_VW15_DIR = 3;      /* ecart minimal pour que le 15m se prononce */
const ECART_VW3_DIR = 5;       /* le 3m bouge plus, seuil plus haut */
const VSLOPE15_DIR = 1;
const VSLOPE3_ARBITRE = 2;     /* derniere instance quand les autres divergent */

/* MoneyFlow : au-dela de cette valeur absolue, son orientation compte comme
 * confirmation ou infirmation. En deca, il est muet.
 * Mesure : seul facteur dont la correlation MONTE avec l'horizon
 * (+0.18 a 5 min, +0.26 a 30 min). */
const MONEYFLOW_MIN = 3;

/* Voie parallele : si le mouvement a deja amplement commence, on n'attend pas
 * la confirmation d'extrema. Multiplicateur de priceMove contre la moyenne
 * des releves precedents. */
const PRICEMOVE_MULT_MIN = 3;
const PRICEMOVE_BUFFER = 20;   /* 20 releves de 30s = 10 minutes */

/* DIMENSIONNEMENT (19/08/2026). Capital de depart 1000 USD, 1% engage par
 * trade soit 10 USD de marge, levier 10x -> notionnel de 100 USD.
 * Le levier de 10 est le plafond reglementaire europeen pour un particulier,
 * verifie le 14/08 sur le compte OKX : l'instrument en autorise 50, pas le
 * compte. */
const CAPITAL_USD = 1000;
const POSITION_PERCENT = 1;
const LEVIER = 10;
const NOTIONNEL_USD = CAPITAL_USD * POSITION_PERCENT / 100 * LEVIER;

/* Tranches conservees de l'ancienne structure : 25% au premier objectif,
 * 65% au second, 10% laisses courir. */
const TRANCHES = [
  { fraction: 25, gainPct: 0.15 },
  { fraction: 65, gainPct: 0.35 },
  { fraction: 10, gainPct: null },   /* laissee courir jusqu'au signal inverse */
];

/* Filets. Le stop de 500 USD vient de la distribution des excursions adverses
 * mesuree sur 22 trades : mediane 153, p75 282, p90 406, max 462. Il est
 * au-dessus du pire cas observe -- donc il sera depasse un jour. */
const STOP_USD = 500;
const TIMEOUT_MINUTES = 240;

function lire(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

function loadState() {
  const s = lire(STATE_PATH);
  return s && typeof s === 'object' ? s : { position: null, lastSignalKey: null };
}

function saveState(s) {
  try { fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2), 'utf8'); }
  catch (e) { console.error('[moteur] ecriture etat impossible:', e.message); }
}

function appendHistory(rec) {
  let h = lire(HISTORY_PATH);
  if (!Array.isArray(h)) h = [];
  h.push(rec);
  while (h.length > HISTORY_MAX) h.shift();
  try { fs.writeFileSync(HISTORY_PATH, JSON.stringify(h, null, 2), 'utf8'); }
  catch (e) { console.error('[moteur] ecriture historique impossible:', e.message); }
}

const num = (v) => (typeof v === 'number' && isFinite(v)) ? v : null;

/* ── LIEU ─────────────────────────────────────────────────────────────── */

function evaluerLieu(tl) {
  if (!tl || !tl.inZone) return null;
  return {
    present: true,
    lignes: tl.confluence || 1,
    contacts: tl.maxPointsInZone || null,
    nature: tl.natureInZone || null,
  };
}

/* ── PASSAGE : lecture de contexte, ne decide rien ────────────────────── */

function lireContexte(b) {
  const mf = num(b.liveMoneyFlow);
  const v3 = num(b.vwap3), v15 = num(b.vwap15);
  const vl3 = num(b.vwapLive), vl15 = num(b.live15Vwap);
  const dTop = num(b.liveDbsiTop), dBas = num(b.liveDbsiBottom);

  let vwapEtat = 'indetermine';
  if (v3 !== null && v15 !== null) {
    if (Math.abs(v3) < 2 && Math.abs(v15) < 2) vwapEtat = 'proches de zero';
    else if (v3 * v15 > 0) vwapEtat = 'synchronises';
    else vwapEtat = 'en desaccord';
  }

  return {
    moneyFlow: mf,
    moneyFlowSens: mf === null ? null : (mf > 0 ? 'positif' : 'negatif'),
    vwapEtat,
    ecartVW3: (vl3 !== null && v3 !== null) ? +(vl3 - v3).toFixed(2) : null,
    ecartVW15: (vl15 !== null && v15 !== null) ? +(vl15 - v15).toFixed(2) : null,
    dbsiNet: (dTop !== null && dBas !== null) ? dBas - dTop : null,
    signalRecent: b.wavePivotType || null,
    signalValeur: num(b.wavePivotValue),
    regime15: b.waveRegime15 || null,
    cadenceMult: num(b.cadenceMultiplier),
    winSec: num(b.winSec),
  };
}

/* ── DIRECTION : ce sont les ecarts VWAP qui decident ─────────────────── */

/**
 * Le lieu pose la question, les VWAP y repondent.
 * Chaque indicateur vote 'long', 'short', ou s'abstient s'il est sous son
 * seuil -- un indicateur faible est MUET, pas contraire.
 * Si les voix divergent, le Vslope3 tranche en derniere instance.
 */
function directionVwap(b, ctx) {
  const voix = [];

  if (ctx.ecartVW15 !== null && Math.abs(ctx.ecartVW15) >= ECART_VW15_DIR) {
    voix.push({ source: 'ecart_vw15', dir: ctx.ecartVW15 > 0 ? 'long' : 'short',
                valeur: ctx.ecartVW15 });
  }
  if (ctx.ecartVW3 !== null && Math.abs(ctx.ecartVW3) >= ECART_VW3_DIR) {
    voix.push({ source: 'ecart_vw3', dir: ctx.ecartVW3 > 0 ? 'long' : 'short',
                valeur: ctx.ecartVW3 });
  }
  const vs15 = num(b.vwapSlope);
  if (vs15 !== null && Math.abs(vs15) >= VSLOPE15_DIR) {
    voix.push({ source: 'vslope15', dir: vs15 > 0 ? 'long' : 'short', valeur: vs15 });
  }

  if (!voix.length) return { direction: null, raison: 'VWAP muets', voix };

  const longs = voix.filter(v => v.dir === 'long').length;
  const shorts = voix.length - longs;

  if (longs && shorts) {
    /* DERNIERE INSTANCE : le Vslope3. Il est du bruit en moyenne, mais dans
     * un retournement il est le seul a parler a temps -- cas du 18/08 a
     * 16h27:30, ou il bascule de +6.99 a -3.66 trois minutes et demie avant
     * le sommet, alors que tout le reste montait encore. */
    const vs3 = num(b.vwap3Slope);
    if (vs3 === null || Math.abs(vs3) < VSLOPE3_ARBITRE) {
      return { direction: null, raison: 'VWAP divergents, Vslope3 muet', voix };
    }
    return { direction: vs3 > 0 ? 'long' : 'short',
             raison: 'tranche par Vslope3', voix, arbitre: vs3 };
  }

  return { direction: longs ? 'long' : 'short', raison: 'VWAP concordants', voix };
}

/**
 * Le MoneyFlow controle la presomption des VWAP : son orientation
 * correspond-elle a l'intention qu'ils expriment ?
 * Retourne 'confirme', 'infirme' ou 'muet'.
 */
function controleMoneyFlow(ctx, direction) {
  if (ctx.moneyFlow === null || Math.abs(ctx.moneyFlow) < MONEYFLOW_MIN) return 'muet';
  const sens = ctx.moneyFlow > 0 ? 'long' : 'short';
  return sens === direction ? 'confirme' : 'infirme';
}

/**
 * Seuil d'ENGAGEMENT : la vague porte-t-elle assez pour initier ?
 * Le MCB ne donne plus la direction (correction du 19/08) -- il autorise.
 * Mesure sur 100h : magnitude >=45 donne 64% de reussite et un R/R de 2.98.
 */
function vagueSuffisante(b) {
  const v15 = num(b.waveRegime15Value);
  return v15 !== null && Math.abs(v15) >= MCB_MAGNITUDE_MIN;
}

/**
 * VOIE PARALLELE : le mouvement a deja amplement commence, sans confirmation
 * d'extrema. On le suit plutot que d'attendre le MCB.
 */
function priceMoveEngage(state, prix) {
  if (!Array.isArray(state.priceBuffer)) state.priceBuffer = [];
  state.priceBuffer.push(prix);
  while (state.priceBuffer.length > PRICEMOVE_BUFFER) state.priceBuffer.shift();
  const buf = state.priceBuffer;
  if (buf.length < PRICEMOVE_BUFFER) return null;

  const deltas = [];
  for (let i = 1; i < buf.length; i++) deltas.push(Math.abs(buf[i] - buf[i - 1]));
  const moyenne = deltas.reduce((a, d) => a + d, 0) / deltas.length;
  if (moyenne <= 0) return null;

  const dernier = buf[buf.length - 1] - buf[buf.length - 2];
  const mult = Math.abs(dernier) / moyenne;
  if (mult < PRICEMOVE_MULT_MIN) return null;
  return { direction: dernier > 0 ? 'long' : 'short', mult: +mult.toFixed(1) };
}

/* ── ABSTENTIONS ──────────────────────────────────────────────────────── */

function raisonAbstention(b, ctx, lieu) {
  if (ctx.winSec !== null && ctx.winSec > WINSEC_MAX &&
      ctx.cadenceMult !== null && ctx.cadenceMult < CADENCE_MULT_MIN) {
    return 'marche endormi';
  }
  if (!ctx.regime15) return 'regime 15m indetermine';
  if (!lieu) return 'aucun lieu';
  return null;
}

/* ── GESTION DE POSITION ──────────────────────────────────────────────── */

function pnlPct(pos, prix) {
  const d = (prix - pos.entryPrice) / pos.entryPrice * 100;
  return pos.direction === 'long' ? d : -d;
}

function gererPosition(state, b, ctx, prix, now) {
  const pos = state.position;
  const pnl = pnlPct(pos, prix);
  const ecartUsd = Math.abs(prix - pos.entryPrice);
  const dureeMin = (now - Date.parse(pos.entryTimestamp)) / 60000;

  const sortir = (raison, fraction) => {
    /* PNL en USD sur le NOTIONNEL engage, et non sur le prix du sous-jacent.
     * Un mouvement de 0.67% donne 0.67 USD sur 100 de notionnel -- pas 435,
     * qui etait le mouvement rapporte a un bitcoin entier. */
    const notionnelTranche = (pos.notionnel || NOTIONNEL_USD) * fraction / 100;
    const usd = pnl / 100 * notionnelTranche;
    /* Part de la marge engagee : c'est cette lecture qui dit si le trade
     * fait mal. Avec un levier de 10, 0.67% de mouvement fait 6.7% de marge. */
    const pctMarge = pnl * (pos.levier || LEVIER);
    appendHistory({
      entryTimestamp: pos.entryTimestamp,
      exitTimestamp: new Date(now).toISOString(),
      direction: pos.direction,
      entryPrice: pos.entryPrice,
      exitPrice: prix,
      pnlPercent: +pnl.toFixed(4),
      pnlUsd: +usd.toFixed(2),
      pnlMargePercent: +pctMarge.toFixed(2),
      notionnel: +notionnelTranche.toFixed(2),
      fraction,
      exitReason: raison,
      contexteEntree: pos.contexte,
      declencheur: pos.declencheur,
    });
    console.log(`[moteur] SORTIE ${fraction}% ${pos.direction} @ ${prix} ` +
                `(${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}% = ${usd >= 0 ? '+' : ''}${usd.toFixed(2)} USD) -- ${raison}`);
  };

  /* Filets, evalues en premier. */
  if (ecartUsd >= STOP_USD && pnl < 0) {
    sortir(`stop ${STOP_USD} USD`, pos.restant);
    state.position = null;
    return;
  }
  if (dureeMin > TIMEOUT_MINUTES) {
    sortir(`timeout ${TIMEOUT_MINUTES} min`, pos.restant);
    state.position = null;
    return;
  }

  /* LE MCB COMME MOTIF DE MAINTIEN (19/08/2026). Il ne donne plus la
   * direction a l'entree, mais tant qu'il s'accorde avec la position, celle-ci
   * tient. Un signal franc a contresens la ferme.
   * Mesure du 16/08 : le VW3L se retourne au creux du prix, 94% du mouvement
   * capture en sortant sur signal inverse. */
  const v15 = num(b.waveRegime15Value);
  if (v15 !== null && Math.abs(v15) >= MCB_MAGNITUDE_MIN && b.waveRegime15) {
    const dir = b.waveRegime15 === 'haussier' ? 'long' : 'short';
    if (dir !== pos.direction) {
      sortir('vague MCB a contresens', pos.restant);
      state.position = null;
      return;
    }
  }

  /* Les VWAP ayant donne la direction, leur retournement franc la retire. */
  const dvNow = directionVwap(b, ctx);
  if (dvNow.direction && dvNow.direction !== pos.direction && dvNow.voix.length >= 2) {
    sortir('VWAP retournes', pos.restant);
    state.position = null;
    return;
  }

  /* Swing failure : le MoneyFlow reste du mauvais cote pendant une poussee
   * favorable. Cas du 18/08 -- breakout de 542 USD avec MoneyFlow negatif
   * tout du long, entierement rendu ensuite. */
  if (pnl > 0.2 && ctx.moneyFlow !== null) {
    const mfContre = (pos.direction === 'long' && ctx.moneyFlow < 0) ||
                     (pos.direction === 'short' && ctx.moneyFlow > 0);
    if (mfContre) {
      sortir('swing failure (MoneyFlow a contresens)', pos.restant);
      state.position = null;
      return;
    }
  }

  /* Tranches. */
  for (let i = pos.trancheStage; i < TRANCHES.length; i++) {
    const t = TRANCHES[i];
    if (t.gainPct === null) break;      /* la derniere court jusqu'au signal */
    if (pnl >= t.gainPct) {
      sortir(`tranche ${t.fraction}%`, t.fraction);
      pos.restant -= t.fraction;
      pos.trancheStage = i + 1;
      if (pos.restant <= 0) { state.position = null; return; }
    } else break;
  }

  pos.pnlCourant = +pnl.toFixed(4);
  pos.dureeMin = Math.round(dureeMin);
}

/* ── CYCLE ────────────────────────────────────────────────────────────── */

function tick() {
  const b = lire(BATON_PATH);
  const tl = lire(TRENDLINES_PATH);
  if (!b) return;

  const now = Date.now();
  const age = now - Date.parse(b.timestamp);
  if (!(age >= 0 && age < STALE_MS)) {
    console.warn('[moteur] baton perime, abstention');
    return;
  }
  const prix = num(b.lastPrice);
  if (prix === null) return;

  const state = loadState();
  const ctx = lireContexte(b);
  const lieu = evaluerLieu(tl);

  if (state.position) {
    gererPosition(state, b, ctx, prix, now);
    saveState(state);
    return;
  }

  /* Le priceMove se calcule a chaque cycle, meme en abstention : son buffer
   * doit rester continu. */
  const pm = priceMoveEngage(state, prix);

  const abst = raisonAbstention(b, ctx, lieu);
  if (abst) { state.derniereAbstention = abst; saveState(state); return; }

  /* 2. DIRECTION -- les ecarts VWAP repondent a la question posee par le lieu. */
  const dv = directionVwap(b, ctx);
  if (!dv.direction) {
    state.derniereAbstention = dv.raison;
    saveState(state);
    return;
  }
  const direction = dv.direction;

  /* 3. MONEYFLOW -- controle de la presomption. */
  const mf = controleMoneyFlow(ctx, direction);
  if (mf === 'infirme') {
    state.derniereAbstention = `MoneyFlow contredit la direction ${direction}`;
    saveState(state);
    return;
  }

  /* 4. ENGAGEMENT -- vague suffisante, ou mouvement deja lance. */
  const vague = vagueSuffisante(b);
  const suitPriceMove = (pm !== null && pm.direction === direction);
  if (!vague && !suitPriceMove) {
    state.derniereAbstention = 'vague insuffisante et mouvement non engage';
    saveState(state);
    return;
  }

  state.position = {
    direction,
    entryPrice: prix,
    entryTimestamp: new Date(now).toISOString(),
    restant: 100,
    trancheStage: 0,
    /* Dimensionnement fige a l'entree : si les parametres changent en cours
     * de route, la position garde ceux avec lesquels elle a ete ouverte. */
    capital: CAPITAL_USD,
    positionPercent: POSITION_PERCENT,
    levier: LEVIER,
    notionnel: NOTIONNEL_USD,
    direction_source: dv.raison,
    voix: dv.voix,
    moneyFlowControle: mf,
    engagement: vague ? 'vague MCB >= 45' : `priceMove x${pm.mult}`,
    contexte: ctx,
    lieu,
  };
  state.derniereAbstention = null;
  saveState(state);
  console.log(`[moteur] ENTREE ${direction} @ ${prix} -- lieu ${lieu.contacts} contacts | ` +
              `${dv.raison} (${dv.voix.map(v => v.source).join(', ')}) | ` +
              `MoneyFlow ${mf} | ${state.position.engagement}`);
}

/* ── DIAGNOSTIC ───────────────────────────────────────────────────────── */

function statut() {
  const s = loadState();
  const h = lire(HISTORY_PATH) || [];
  console.log('=== MOTEUR BOONO ===');
  if (s.position) {
    const p = s.position;
    console.log(`Position ${p.direction} @ ${p.entryPrice} depuis ${p.dureeMin || 0} min`);
    console.log(`  PNL ${p.pnlCourant !== undefined ? p.pnlCourant + '%' : 'n/a'}, restant ${p.restant}%`);
    console.log(`  declencheur : ${p.declencheur.map(d => d.type).join(', ')}`);
  } else {
    console.log('Aucune position. Derniere abstention : ' + (s.derniereAbstention || 'aucune'));
  }
  if (h.length) {
    const tot = h.reduce((a, r) => a + (r.fraction / 100) * r.pnlPercent, 0);
    const gagnantes = h.filter(r => r.pnlPercent > 0).length;
    console.log(`\n${h.length} sorties, PNL cumule ${tot >= 0 ? '+' : ''}${tot.toFixed(2)}%, ` +
                `${Math.round(100 * gagnantes / h.length)}% gagnantes`);
    const parRaison = {};
    for (const r of h) {
      const k = r.exitReason.split(' ')[0];
      if (!parRaison[k]) parRaison[k] = { n: 0, pnl: 0 };
      parRaison[k].n++;
      parRaison[k].pnl += (r.fraction / 100) * r.pnlPercent;
    }
    for (const [k, v] of Object.entries(parRaison).sort((a, b) => a[1].pnl - b[1].pnl)) {
      console.log(`  ${k.padEnd(20)} ${v.n}x  ${v.pnl >= 0 ? '+' : ''}${v.pnl.toFixed(2)}%`);
    }
  } else {
    console.log('\nAucune sortie enregistree.');
  }
}

if (require.main === module) {
  if (process.argv.includes('--statut')) { statut(); process.exit(0); }
  console.log(`[moteur] demarre, cycle ${CYCLE_MS / 1000}s -- LECTURE SEULE sur baton et trendlines`);
  tick();
  setInterval(() => { try { tick(); } catch (e) { console.error('[moteur]', e.message); } }, CYCLE_MS);
}

module.exports = { tick, statut, lireContexte, directionVwap, controleMoneyFlow };
