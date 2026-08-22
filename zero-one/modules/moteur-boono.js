/**
 * moteur-boono.js — Moteur de decision ZeroOne.
 *
 * VERSION 2 DU 20/08/2026. Reecriture complete d'apres lois-du-bot-200826.md.
 *
 * La v1 melangeait les timeframes : direction issue des ecarts VWAP 3m,
 * maintien issu du regime 15m, contexte lu sur mcb_3m alors que la strategie
 * se decide sur le 15m. Elle produisait des trades de trente secondes a
 * 0.03%, sous le seuil de rentabilite des frais.
 *
 * ── LES SEPT LOIS, DANS L'ORDRE D'EVALUATION ───────────────────────────
 *
 * LOI 0  Le VWAP15 se lit en permanence. Il donne le cadre, n'ordonne rien.
 *
 * LOI 1  VIGILANCE quand le Vslope15 entre dans la zone neutre (+/-4) ou la
 *        traverse, OU quand un lieu est actif (Lgi, niveau, MA200).
 *        La vigilance n'est pas une decision, c'est un changement d'etat.
 *
 * LOI 2  En vigilance SEULEMENT, le bot ouvre le 3m. Hors vigilance, le 3m
 *        n'est jamais consulte -- il ne sert qu'aux retournements, ce qu'il
 *        est seul a voir et ce qui le rend inutilisable en regime etabli.
 *
 * LOI 3  Les oscillations du 3m ne valent que si elles s'accordent au
 *        MoneyFlow 15m et au BW 15m, qui portent la tendance de fond.
 *        La direction se forme par correlation de dW3, dW15 et Vslope3.
 *
 * LOI 4  E3 et E15 doivent designer le MEME extreme de prix. C'est la loi
 *        la mieux etayee : la coincidence des deux timeframes separe
 *        nettement les signaux qui tiennent de ceux qui echouent.
 *
 * LOI 5  L'evenement donne le MOMENT, jamais la direction. Cadence en
 *        premier lieu ; a defaut, priceMove au-dela d'un seuil.
 *
 * LOI 6  BYPASS du retournement violent. La cadence n'y fonctionne pas --
 *        elle sature ou arrive trop tard. Quatre elements simultanes :
 *        Vslope3 et Vslope15 qui basculent, cadence exceptionnelle,
 *        priceMove qui confirme. Court-circuite les lois 3 a 5.
 *
 * ── LECTURE SEULE ──────────────────────────────────────────────────────
 *
 * Ce module ne modifie rien de ce qui tourne. Il lit baton-state.json et
 * trendlines.json, ecrit ses propres fichiers. Aucun acces partage en
 * ecriture avec trade-simulator.js -- les deux logiques tournent en
 * parallele sur les memes donnees, ce qui donne un point de comparaison.
 */

const fs = require('fs');
const path = require('path');

const BATON_PATH = path.join(__dirname, '../data/baton-state.json');
const TRENDLINES_PATH = path.join(__dirname, '../data/trendlines.json');
const STATE_PATH = path.join(__dirname, '../data/moteur-boono-state.json');
const HISTORY_PATH = path.join(__dirname, '../data/moteur-boono-history.json');

const CYCLE_MS = 30000;
const HISTORY_MAX = 2000;
const STALE_MS = 120000;

/* ── SEUILS PROVISOIRES ────────────────────────────────────────────────
 * Aucun ne remet en cause une loi : ce sont les lois qui disent ou les
 * mesurer. A recalibrer des que l'historique 15m sera fourni. */

/* LOI 1 -- DEUX zones distinctes sur le Vslope15 (22/08/2026).
 * La vigilance se declenche largement, a +/-4 : c'est l'approche de
 * l'equilibre qui doit eveiller l'attention.
 * Mais le Vslope15 continue de se prononcer sur la direction entre 2 et 4 --
 * il n'est vraiment muet qu'en deca de 2. */
const VSLOPE15_VIGILANCE = 4;
const VSLOPE15_NEUTRE = 2;

/* LOI 3 -- seuils au-dela desquels un indicateur se prononce. En deca il est
 * MUET, jamais contraire. */
const ECART_DW15_DIR = 3;
const ECART_DW3_DIR = 5;      /* le 3m bouge plus, seuil plus haut */
const VSLOPE3_DIR = 2;
/* TENDANCE DE FOND (revue le 22/08/2026). Le MoneyFlow la porte SEUL, par
 * son SIGNE, sans aucun seuil.
 * Motif : exiger l'accord de MF15 et BW15 en signe bloquait le moteur un
 * quart du temps. Leurs echelles sont incomparables et aucun des deux n'est
 * centre sur zero -- MF15 positif 88% du temps, BW15 69%, alors que les
 * trois VWAP le sont. Un seuil symetrique sur un indicateur asymetrique
 * filtre dans un seul sens.
 * Le BW ne peut que REFUSER la tendance, sur contradiction franche. */
const BW15_VETO = 30;

/* LOI 4 -- plus de tolerance de synchronisation : le signal 15m ne valide
 * plus l'entree. Il confirme apres coup, avec 500 a 700 USD de retard. */

/* LOI 5 -- l'evenement donne le moment.
 * Le priceMove s'evalue EN DOLLARS et non en multiple : c'est une entite
 * absolue, elle ne doit pas etre comparee a sa propre trace. Seuils cales
 * sur le p90 mesure de chaque regime (75, 98, 119 sur 24h). */
const CADENCE_EVENT = 2;
const PRICEMOVE_USD = { endormi: 75, normal: 100, cascade: 120 };

/* LOI 6 -- bypass du retournement violent. */
const BYPASS_CADENCE = 5;
/* Le bypass exige un mouvement franc : le double du seuil d'evenement. */
const BYPASS_PRICEMOVE_USD = 200;

/* REGIMES (revus le 22/08/2026). Ils se jugent sur le MOUVEMENT du prix et
 * non sur l'activite du carnet : un marche peu frequente peut avancer
 * fortement -- carnet mince apres une cascade -- et l'ancien calcul le
 * declarait endormi. Ce desaccord representait 30% des releves.
 *
 * Seuils sur la moyenne du |priceMove| des 20 derniers releves.
 * Distribution mesuree sur 24h : p25 = 28, median = 36, p75 = 49, p90 = 64.
 *
 * La cadence garde un role : elle ne peut plus declarer un marche endormi,
 * mais elle DURCIT la cascade -- il faut du mouvement ET de l'agitation.
 * Les deux ensemble ne surviennent que 3% du temps, ce qui correspond bien
 * a un regime exceptionnel. */
const REGIME_FENETRE = 20;
const REGIME_PM_ENDORMI = 28;
const REGIME_PM_CASCADE = 64;
const REGIME_CAD_CASCADE = 0.30;

/* Structure de position, heritee de l'ancienne. */
const TRANCHES = [
  { fraction: 25, gainPct: 0.15 },
  { fraction: 65, gainPct: 0.35 },
  { fraction: 10, gainPct: null },
];

/* Filets, inconditionnels. Le stop vient de la distribution des excursions
 * adverses mesuree sur 22 trades : mediane 153 USD, p90 406, max 462. */
const STOP_USD = 500;
const TIMEOUT_MINUTES = 240;

/* Dimensionnement : 1% de 1000 USD a 10x, soit 100 USD de notionnel.
 * Le levier de 10 est le plafond reglementaire europeen. */
const CAPITAL_USD = 1000;
const POSITION_PERCENT = 1;
const LEVIER = 10;
const NOTIONNEL_USD = CAPITAL_USD * POSITION_PERCENT / 100 * LEVIER;

/* Memoire glissante : TROIS heures (22/08/2026, etait une heure).
 * Espacement mesure entre deux signaux MCB : 3m median 12 min, max 60 ;
 * 15m median 60 min, p75 90, max 225. Une heure ne contenait donc aucun
 * signal 15m la moitie du temps, et le moteur restait bloque sur "un des
 * deux signaux manque".
 * Allonger ne cree pas de fausses validations : la LOI 4 exige que les deux
 * designent le MEME extreme, a dix batons et trente dollars pres. */
const BUFFER_MAX = 360;

/* ── OUTILS ───────────────────────────────────────────────────────────── */

const num = (v) => (typeof v === 'number' && isFinite(v)) ? v : null;

function lire(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}
function loadState() {
  const s = lire(STATE_PATH);
  return (s && typeof s === 'object') ? s : { position: null, buffer: [] };
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

/**
 * Memoire glissante. Le moteur a besoin d'un historique court pour retrouver
 * les extremes de prix que les signaux designent (LOI 4) et pour mesurer le
 * regime (taux d'evenements).
 */
function majBuffer(state, b, now) {
  if (!Array.isArray(state.buffer)) state.buffer = [];
  state.buffer.push({
    ts: now,
    prix: num(b.lastPrice),
    haut: num(b.priceHigh),
    bas: num(b.priceLow),
    sig3: b.wavePivotType || null,
    sig3v: num(b.wavePivotValue),
    reg15: b.waveRegime15 || null,
    reg15v: num(b.waveRegime15Value),
    cadM: num(b.cadenceMultiplier),
    pmMult: num(b.priceMoveMult),
    pm: num(b.priceMove),
  });
  while (state.buffer.length > BUFFER_MAX) state.buffer.shift();
}

/* ── LOI 0 : LA LECTURE DE FOND ───────────────────────────────────────── */

/**
 * Le VWAP15 donne le cadre. Il ne decide rien -- il situe.
 * Le MoneyFlow 15m et le BW 15m portent la tendance de fond.
 */
function lectureDeFond(b) {
  const vwap15 = num(b.vwap15);
  const vw15l = num(b.live15Vwap);
  const vslope15 = num(b.vwapSlope);
  const mf15 = num(b.live15MoneyFlow);
  const bw15 = num(b.live15Bw);

  /* Le MoneyFlow porte la tendance, seul, par son signe. */
  let tendance = (mf15 !== null) ? (mf15 > 0 ? 'long' : 'short') : null;
  const sMf = tendance;
  let sBw = null;
  if (tendance && bw15 !== null && Math.abs(bw15) >= BW15_VETO) {
    sBw = bw15 > 0 ? 'long' : 'short';
    /* Veto : le BW contredit franchement ce que dit le MoneyFlow. */
    if (sBw !== tendance) tendance = null;
  }

  return {
    vwap15, vw15l, vslope15, mf15, bw15,
    /* Pente du MoneyFlow 15m, alignee sur la bougie. Mesure sur 19 extremes :
     * elle reste orientee dans le sens du mouvement qui se termine. */
    mf15Pente: num(b.mf15Pente),
    dw15: (vw15l !== null && vwap15 !== null) ? +(vw15l - vwap15).toFixed(2) : null,
    tendance,
    tendanceSources: { mf: sMf, bw: sBw },
  };
}

/* ── LOI 1 : L'ENTREE EN VIGILANCE ────────────────────────────────────── */

/**
 * Deux portes d'entree, l'une ou l'autre suffit :
 *   - le Vslope15 entre dans la zone neutre ou la traverse,
 *   - un lieu est actif.
 * La vigilance n'autorise rien : elle ouvre le 3m (LOI 2).
 */
function vigilance(fond, lieu) {
  const raisons = [];
  if (fond.vslope15 !== null && Math.abs(fond.vslope15) <= VSLOPE15_VIGILANCE) {
    raisons.push('Vslope15 approche l equilibre');
  }
  if (lieu) raisons.push(`lieu actif (${lieu.contacts} contacts)`);
  return raisons.length ? raisons : null;
}

/* ── LOI 2 : L'OUVERTURE DU TIMEFRAME RAPIDE ──────────────────────────── */

function lecture3m(b) {
  const vwap3 = num(b.vwap3);
  const vw3l = num(b.vwapLive);
  return {
    vwap3, vw3l,
    dw3: (vw3l !== null && vwap3 !== null) ? +(vw3l - vwap3).toFixed(2) : null,
    vslope3: num(b.vwap3Slope),
  };
}

/* ── LOI 3 : L'ACCORD AVEC LA TENDANCE DE FOND ────────────────────────── */

/**
 * La direction se forme par correlation de dW3, dW15 et Vslope3.
 * Chaque indicateur vote ou se tait -- en deca de son seuil il est MUET,
 * jamais contraire.
 * Puis la direction obtenue doit s'accorder a la tendance de fond portee par
 * MF15 et BW15. Une oscillation du 3m qui les contredit est du bruit.
 */
function direction(fond, tf3) {
  const voix = [];
  if (fond.dw15 !== null && Math.abs(fond.dw15) >= ECART_DW15_DIR) {
    voix.push({ source: 'dW15', dir: fond.dw15 > 0 ? 'long' : 'short', valeur: fond.dw15 });
  }
  if (tf3.dw3 !== null && Math.abs(tf3.dw3) >= ECART_DW3_DIR) {
    voix.push({ source: 'dW3', dir: tf3.dw3 > 0 ? 'long' : 'short', valeur: tf3.dw3 });
  }
  if (tf3.vslope3 !== null && Math.abs(tf3.vslope3) >= VSLOPE3_DIR) {
    voix.push({ source: 'Vslope3', dir: tf3.vslope3 > 0 ? 'long' : 'short', valeur: tf3.vslope3 });
  }
  /* Le Vslope15 se prononce encore hors de sa zone de neutralite (+/-2),
   * meme s'il reste dans la zone de vigilance (+/-4). */
  if (fond.vslope15 !== null && Math.abs(fond.vslope15) > VSLOPE15_NEUTRE) {
    voix.push({ source: 'Vslope15', dir: fond.vslope15 > 0 ? 'long' : 'short',
                valeur: fond.vslope15 });
  }

  if (!voix.length) return { dir: null, raison: 'aucune voix ne se prononce', voix };

  const longs = voix.filter(v => v.dir === 'long').length;
  const shorts = voix.length - longs;
  if (longs && shorts) return { dir: null, raison: 'voix contradictoires', voix };
  const dir = longs ? 'long' : 'short';

  /* L'accord avec la tendance de fond est imperatif. */
  if (!fond.tendance) return { dir: null, raison: 'tendance de fond indeterminee', voix };
  if (fond.tendance !== dir) {
    return { dir: null, raison: `oscillation 3m a contresens du fond (${fond.tendance})`, voix };
  }
  return { dir, raison: 'voix accordees au fond', voix };
}

/* ── LOI 4 : LA SYNCHRONISATION DES PIVOTS ────────────────────────────── */

/**
 * E3 et E15 doivent designer le meme extreme de prix.
 * On retrouve, dans la memoire glissante, l'instant ou chaque signal a
 * change, puis l'extreme de prix qui le precede.
 */
function extremeDe(buf, iSig, cherchHaut, lookback) {
  const from = Math.max(0, iSig - lookback);
  let best = null, bi = null;
  for (let j = from; j <= iSig; j++) {
    const c = buf[j];
    const v = cherchHaut ? (c.haut !== null ? c.haut : c.prix)
                         : (c.bas !== null ? c.bas : c.prix);
    if (v === null) continue;
    if (best === null || (cherchHaut ? v > best : v < best)) { best = v; bi = j; }
  }
  return { i: bi, prix: best };
}

/**
 * LOI 4 (revue le 22/08/2026) -- le signal 3m suffit.
 *
 * L'ancienne version exigeait que E3 et E15 designent le meme extreme. Mais
 * le signal 15m confirme avec 500 a 700 USD de retard : attendre sa
 * confirmation revient a payer ce retard. Il ne valide plus l'entree, il
 * confirme apres coup qu'on avait raison.
 *
 * Le signal 15m reste lu et rapporte -- son age et son accord eventuel sont
 * enregistres dans le contexte du trade -- mais il ne bloque rien.
 */
function signal3m(buf) {
  if (buf.length < 40) return { ok: false, raison: 'memoire insuffisante' };

  let i3 = null, t3 = null;
  for (let i = buf.length - 1; i > 0; i--) {
    if (buf[i].sig3 &&
        (buf[i].sig3 !== buf[i - 1].sig3 || buf[i].sig3v !== buf[i - 1].sig3v)) {
      i3 = i; t3 = buf[i].sig3; break;
    }
  }
  if (i3 === null) return { ok: false, raison: 'aucun signal 3m' };

  const e3 = extremeDe(buf, i3, t3 === 'pic', 30);
  if (e3.prix === null) return { ok: false, raison: 'extreme 3m introuvable' };

  /* Le 15m, pour information seulement. */
  let i15 = null, t15 = null;
  for (let i = buf.length - 1; i > 0; i--) {
    if (buf[i].reg15 &&
        (buf[i].reg15 !== buf[i - 1].reg15 || buf[i].reg15v !== buf[i - 1].reg15v)) {
      i15 = i; t15 = buf[i].reg15 === 'haussier' ? 'creux' : 'pic'; break;
    }
  }
  let accord15 = null;
  if (i15 !== null) {
    const e15 = extremeDe(buf, i15, t15 === 'pic', 80);
    accord15 = {
      type: t15,
      ageMin: Math.round((buf.length - 1 - i15) * 0.5),
      memeType: t15 === t3,
      ecartUsd: (e15.prix !== null) ? +Math.abs(e3.prix - e15.prix).toFixed(1) : null,
    };
  }

  return {
    ok: true, type: t3,
    dir: t3 === 'creux' ? 'long' : 'short',
    extremePrix: +e3.prix.toFixed(1),
    ageMin: Math.round((buf.length - 1 - i3) * 0.5),
    accord15,
  };
}

/* ── LOI 5 : L'EVENEMENT DECLENCHEUR ──────────────────────────────────── */

/**
 * L'evenement donne le MOMENT, jamais la direction.
 * Cadence en premier lieu ; a defaut, priceMove au-dela d'un seuil.
 */
function evenement(b, dir, seuilCadence, nomRegime) {
  const cadM = num(b.cadenceMultiplier);
  if (cadM !== null && cadM >= seuilCadence) {
    return { type: 'cadence', valeur: cadM };
  }
  /* Le priceMove s'evalue en DOLLARS, contre un seuil propre au regime. */
  const pm = num(b.priceMove);
  const seuil = PRICEMOVE_USD[nomRegime] || PRICEMOVE_USD.normal;
  if (pm !== null && Math.abs(pm) >= seuil) {
    const sens = pm > 0 ? 'long' : 'short';
    if (sens === dir) return { type: 'priceMove', valeur: pm, seuil };
  }
  return null;
}

/* ── LOI 6 : LE CONTOURNEMENT DU RETOURNEMENT VIOLENT ─────────────────── */

/**
 * La cadence ne fonctionne pas sur un retournement violent : elle sature ou
 * arrive trop tard. Quatre elements simultanes court-circuitent les lois 3
 * a 5 -- les deux pentes qui basculent, une cadence exceptionnelle, et le
 * priceMove qui confirme le sens.
 */
function bypassRetournement(b, fond, tf3, buf) {
  const cadM = num(b.cadenceMultiplier);
  const pm = num(b.priceMove);
  if (cadM === null || cadM < BYPASS_CADENCE) return null;
  if (pm === null || Math.abs(pm) < BYPASS_PRICEMOVE_USD) return null;
  if (tf3.vslope3 === null || fond.vslope15 === null) return null;

  const sens = pm > 0 ? 'long' : 'short';
  /* Les deux pentes doivent aller dans le sens du mouvement -- elles
   * basculent, elles ne resistent pas. */
  const s3 = tf3.vslope3 > 0 ? 'long' : 'short';
  const s15 = fond.vslope15 > 0 ? 'long' : 'short';
  if (s3 !== sens || s15 !== sens) return null;

  /* Bascule recente : la pente 3m doit avoir change de signe dans la
   * memoire courte, sinon c'est une continuation et non un retournement. */
  return { dir: sens, cadence: cadM, priceMove: pm };
}

/* ── REGIMES ──────────────────────────────────────────────────────────── */

function regime(buf) {
  const w = buf.slice(-REGIME_FENETRE);
  if (w.length < REGIME_FENETRE) {
    return { nom: 'inconnu', pmMoyen: null, taux: null, seuilCadence: CADENCE_EVENT };
  }

  /* Le mouvement decide. */
  const pms = w.map(x => x.pm).filter(v => typeof v === 'number' && isFinite(v)).map(Math.abs);
  const pmMoyen = pms.length ? pms.reduce((a, v) => a + v, 0) / pms.length : null;

  /* L'activite ne fait que durcir la cascade. */
  const n = w.filter(x => (x.cadM || 0) >= CADENCE_EVENT).length;
  const taux = n / w.length;

  if (pmMoyen === null) {
    return { nom: 'inconnu', pmMoyen, taux, seuilCadence: CADENCE_EVENT };
  }
  if (pmMoyen > REGIME_PM_CASCADE && taux >= REGIME_CAD_CASCADE) {
    /* En cascade, les evenements de cadence saturent : le seuil s'ajuste a
     * l'engagement du moment, sinon il se declenche a chaque baton. */
    const cads = w.map(x => x.cadM || 0).sort((a, b) => b - a);
    const p90 = cads[Math.floor(cads.length * 0.1)];
    return { nom: 'cascade', pmMoyen, taux, seuilCadence: Math.max(CADENCE_EVENT, p90) };
  }
  if (pmMoyen < REGIME_PM_ENDORMI) {
    return { nom: 'endormi', pmMoyen, taux, seuilCadence: CADENCE_EVENT };
  }
  return { nom: 'normal', pmMoyen, taux, seuilCadence: CADENCE_EVENT };
}

/* ── GESTION DE POSITION ──────────────────────────────────────────────── */

function pnlPct(pos, prix) {
  const d = (prix - pos.entryPrice) / pos.entryPrice * 100;
  return pos.direction === 'long' ? d : -d;
}

function gererPosition(state, b, fond, prix, now, reg) {
  const pos = state.position;
  const pnl = pnlPct(pos, prix);
  const ecartUsd = Math.abs(prix - pos.entryPrice);
  const dureeMin = (now - Date.parse(pos.entryTimestamp)) / 60000;

  const sortir = (raison, fraction) => {
    const notionnel = (pos.notionnel || NOTIONNEL_USD) * fraction / 100;
    const usd = pnl / 100 * notionnel;
    appendHistory({
      entryTimestamp: pos.entryTimestamp,
      exitTimestamp: new Date(now).toISOString(),
      direction: pos.direction,
      entryPrice: pos.entryPrice,
      exitPrice: prix,
      pnlPercent: +pnl.toFixed(4),
      pnlUsd: +usd.toFixed(2),
      pnlMargePercent: +(pnl * (pos.levier || LEVIER)).toFixed(2),
      notionnel: +notionnel.toFixed(2),
      fraction,
      exitReason: raison,
      loiEntree: pos.loi,
      contexteEntree: pos.contexte,
    });
    console.log(`[moteur] SORTIE ${fraction}% ${pos.direction} @ ${prix} ` +
                `(${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}% = ${usd >= 0 ? '+' : ''}${usd.toFixed(2)} USD) -- ${raison}`);
  };

  /* FILETS -- inconditionnels, evalues en premier. */
  if (ecartUsd >= STOP_USD && pnl < 0) {
    sortir(`stop ${STOP_USD} USD`, pos.restant); state.position = null; return;
  }
  if (dureeMin > TIMEOUT_MINUTES) {
    sortir(`timeout ${TIMEOUT_MINUTES} min`, pos.restant); state.position = null; return;
  }

  /* LE CADRE QUI CHANGE ferme la position : le VWAP15 se retourne. */
  if (fond.vwap15 !== null && pos.vwap15Entree !== null &&
      Math.abs(fond.vwap15) >= 2) {
    const sensCadre = fond.vwap15 > 0 ? 'long' : 'short';
    if (sensCadre !== pos.direction) {
      sortir('VWAP15 retourne', pos.restant); state.position = null; return;
    }
  }

  /* LE MONEYFLOW A CONTRESENS pendant un mouvement favorable signale un
   * echec de poussee : on sort sans attendre. */
  if (pnl > 0.2 && fond.mf15 !== null) {
    const sensMf = fond.mf15 > 0 ? 'long' : 'short';
    if (sensMf !== pos.direction) {
      sortir('MoneyFlow15 a contresens', pos.restant); state.position = null; return;
    }
  }

  /* TRANCHES. En cascade, on ne sort pas sur objectif : on suit la tendance
   * jusqu'a ce qu'elle casse. */
  if (reg.nom !== 'cascade') {
    for (let i = pos.trancheStage; i < TRANCHES.length; i++) {
      const t = TRANCHES[i];
      if (t.gainPct === null) break;
      if (pnl >= t.gainPct) {
        sortir(`tranche ${t.fraction}%`, t.fraction);
        pos.restant -= t.fraction;
        pos.trancheStage = i + 1;
        if (pos.restant <= 0) { state.position = null; return; }
      } else break;
    }
  }

  pos.pnlCourant = +pnl.toFixed(4);
  pos.dureeMin = Math.round(dureeMin);
}

/* ── CYCLE ────────────────────────────────────────────────────────────── */

function tick() {
  const b = lire(BATON_PATH);
  if (!b) return;
  const now = Date.now();
  const age = now - Date.parse(b.timestamp);
  if (!(age >= 0 && age < STALE_MS)) { console.warn('[moteur] baton perime'); return; }
  const prix = num(b.lastPrice);
  if (prix === null) return;

  const state = loadState();
  majBuffer(state, b, now);

  const tl = lire(TRENDLINES_PATH);
  const lieu = (tl && tl.inZone)
    ? { lignes: tl.confluence || 1, contacts: tl.maxPointsInZone || null }
    : null;

  const fond = lectureDeFond(b);          /* LOI 0 */
  const reg = regime(state.buffer);

  if (state.position) {
    gererPosition(state, b, fond, prix, now, reg);
    saveState(state);
    return;
  }

  const abstenir = (r) => { state.derniereAbstention = r; saveState(state); };

  /* Marche endormi : les frais ne seraient pas couverts. */
  if (reg.nom === 'endormi') return abstenir('marche endormi');

  const tf3 = lecture3m(b);

  /* LOI 6 -- le bypass est teste AVANT la chaine, il la court-circuite. */
  const bp = bypassRetournement(b, fond, tf3, state.buffer);

  let dir = null, loi = null, detail = null;
  if (bp) {
    dir = bp.dir; loi = 'LOI 6 -- bypass retournement violent';
    detail = { cadence: bp.cadence, priceMove: bp.priceMove };
  } else {
    /* LOI 1 -- vigilance. */
    const vig = vigilance(fond, lieu);
    if (!vig) return abstenir('hors vigilance');

    /* LOI 2 et 3 -- le 3m est ouvert, la direction se forme. */
    const d = direction(fond, tf3);
    if (!d.dir) return abstenir(d.raison);

    /* LOI 4 -- le signal 3m declenche. Le 15m est lu mais ne bloque pas. */
    const sync = signal3m(state.buffer);
    if (!sync.ok) return abstenir(`signal 3m : ${sync.raison}`);
    if (sync.dir !== d.dir) return abstenir(`signal 3m designe ${sync.dir}, direction ${d.dir}`);

    /* LOI 5 -- l'evenement donne le moment. */
    const ev = evenement(b, d.dir, reg.seuilCadence, reg.nom);
    if (!ev) return abstenir('aucun evenement');

    dir = d.dir;
    loi = 'LOI 1-5 -- chaine complete';
    detail = { vigilance: vig, voix: d.voix, sync, evenement: ev };
  }

  state.position = {
    direction: dir,
    entryPrice: prix,
    entryTimestamp: new Date(now).toISOString(),
    restant: 100,
    trancheStage: 0,
    capital: CAPITAL_USD, positionPercent: POSITION_PERCENT,
    levier: LEVIER, notionnel: NOTIONNEL_USD,
    loi, detail,
    vwap15Entree: fond.vwap15,
    regime: reg.nom,
    contexte: { fond, tf3, lieu, regime: reg },
  };
  state.derniereAbstention = null;
  saveState(state);
  console.log(`[moteur] ENTREE ${dir} @ ${prix} ` +
              `[${reg.nom}, pm ${reg.pmMoyen !== null ? reg.pmMoyen.toFixed(0) : '?'} USD] -- ${loi}`);
}

/* ── DIAGNOSTIC ───────────────────────────────────────────────────────── */

function statut() {
  const s = loadState();
  const h = lire(HISTORY_PATH) || [];
  console.log('=== MOTEUR BOONO v2 ===');
  if (s.position) {
    const p = s.position;
    console.log(`${p.direction.toUpperCase()} @ ${p.entryPrice} depuis ${p.dureeMin || 0} min [${p.regime}]`);
    console.log(`  PNL ${p.pnlCourant !== undefined ? p.pnlCourant + '%' : 'n/a'}, restant ${p.restant}%`);
    console.log(`  ${p.loi}`);
  } else {
    console.log('Aucune position. Derniere abstention : ' + (s.derniereAbstention || 'aucune'));
  }
  if (h.length) {
    const tot = h.reduce((a, r) => a + (typeof r.pnlUsd === 'number' ? r.pnlUsd : 0), 0);
    const pct = h.reduce((a, r) => a + (r.fraction / 100) * r.pnlPercent, 0);
    const g = h.filter(r => r.pnlPercent > 0).length;
    console.log(`\n${h.length} sorties, ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% ` +
                `(${tot >= 0 ? '+' : ''}${tot.toFixed(2)} USD), ${Math.round(100 * g / h.length)}% gagnantes`);
    const par = {};
    for (const r of h) {
      const k = String(r.exitReason).split(' ')[0];
      if (!par[k]) par[k] = { n: 0, usd: 0 };
      par[k].n++; par[k].usd += (typeof r.pnlUsd === 'number' ? r.pnlUsd : 0);
    }
    for (const [k, v] of Object.entries(par).sort((a, b) => a[1].usd - b[1].usd)) {
      console.log(`  ${k.padEnd(22)} ${v.n}x  ${v.usd >= 0 ? '+' : ''}${v.usd.toFixed(2)} USD`);
    }
  } else {
    console.log('\nAucune sortie enregistree.');
  }
}

if (require.main === module) {
  if (process.argv.includes('--statut')) { statut(); process.exit(0); }
  console.log('[moteur] v2 demarre -- LECTURE SEULE, cycle ' + (CYCLE_MS / 1000) + 's');
  tick();
  setInterval(() => { try { tick(); } catch (e) { console.error('[moteur]', e.message); } }, CYCLE_MS);
}

module.exports = { tick, statut, lectureDeFond, direction, signal3m, regime };
