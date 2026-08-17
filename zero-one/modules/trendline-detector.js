/**
 * trendline-detector.js — "Lignes imaginaires" (conception de Benjamin).
 *
 * VERSION 4 DU 17/08/2026 — RETOUR A LA CONCEPTION D'ORIGINE.
 *
 * Les versions 1 a 3 testaient TOUTES les paires de pivots passes, soit 561
 * combinaisons pour 34 pivots. D'ou une machinerie de tri entiere (seuils,
 * dedoublonnage, limite par ancre, plafond de lignes) uniquement destinee a
 * filtrer l'exces que cette methode produisait elle-meme. Elle produisait
 * aussi des resultats absurdes : une "trendline" reliant un creux a son
 * rebond trente minutes plus tard.
 *
 * C'etait l'approche classique du chartisme algorithmique, appliquee par
 * automatisme -- pas celle que Benjamin avait decrite.
 *
 * ── SA CONCEPTION ──────────────────────────────────────────────────────
 *
 * "La ligne serait connectee entre le prix maintenant et l'avant-dernier
 *  extreme de prix. Ces 2 points vont bouger l'un par rapport a l'autre,
 *  entrainant une ligne dont l'angle va virtuellement osciller jusqu'a
 *  l'alignement avec 3 points minimum attaches sur une meme ligne. Si le
 *  niveau est actif la ligne va se stabiliser entre ses points, former une
 *  ligne dure qui a chaque point de touche supplementaire se durcira."
 *
 * Soit : UNE ancre fixe dans le passe, UN point mobile au present, et les
 * alignements se revelent d'eux-memes a mesure que le prix bouge. Aucun tri
 * n'est necessaire -- il n'y a que deux lignes candidates a tout instant,
 * une par type de pivot.
 *
 * ── MECANIQUE ──────────────────────────────────────────────────────────
 *
 * 1. Pour chaque type (HAUT, BAS) : ancre = avant-dernier pivot confirme de
 *    ce type. Le dernier est ecarte -- il peut encore evoluer.
 * 2. Ligne provisoire de l'ancre au prix courant.
 * 3. Compter les pivots de meme type qui tombent dans sa zone.
 * 4. A 3 contacts ou plus, la ligne est VALIDEE. On la fige alors par
 *    regression sur ses points (et non sur le prix courant, qui bouge), et
 *    on l'ajoute au catalogue.
 * 5. Le catalogue garde 48h. Une ligne validee reste en memoire meme quand
 *    le prix s'en eloigne -- elle est ETEINTE, pas caduque, et se rallume
 *    si le prix revient dans sa zone.
 *
 * ── MESURES QUI FONDENT LES PARAMETRES (16/08/2026) ────────────────────
 *
 * Test prospectif : une ligne a 3 pivots alignes annonce-t-elle ou se
 * formera le pivot suivant, inconnu au moment du trace ?
 *   zone +/-25$ : 36% (hasard 3.6%)  |  +/-40$ : 48% (5.8%)  |  +/-60$ : 62% (8.6%)
 * La redondance n'aide pas : 3 points 36%, 6 points 34%.
 *
 * PIEGE EVITE : une premiere version mesurait la "reaction apres contact" et
 * trouvait 100% de rebonds partout -- tautologie, un minimum local est suivi
 * d'une remontee par definition. Reference : apres un point bas quelconque,
 * le prix remonte de 47 USD dans 65% des cas, ligne ou pas.
 */

const fs = require('fs');
const path = require('path');

const CSV_15M = '/root/agents-ia-zero-one/data/mcb-live/mcb_15m.csv';
const OUT_PATH = path.join(__dirname, '../data/trendlines.json');

/* Memoire du catalogue. Benjamin : "48h sur le 15min est bien assez". */
const WINDOW_HOURS = 48;

/* Zone en POURCENTAGE du prix -- un seuil en dollars se perime des que le
 * marche bouge. 0.048% = 30 USD a 63 000. */
const TOLERANCE_PCT = 0.048;
let TOLERANCE_USD = 30;

/* Recul pour retrouver l'extreme de prix precedant un signal MCB. */
const EXTREME_LOOKBACK = 5;

/* Fusion des pivots proches -- transposition du filtre visuel de Benjamin
 * ("quand le bot voit 5 meches groupees, moi je vois 1 touch"). 90 minutes
 * depuis le 17/08 : le creux du 16 au 17 s'est forme en trois meches, la
 * premiere a 23h30 et le vrai plus bas a 00h40. */
const MERGE_MINUTES = 90;
const MERGE_USD = 40;

/* Ecart minimum entre l'ancre et le prix courant : en deca, la pente suit
 * le bruit local. */
const MIN_SPAN_HOURS = 3;

const DAEMON_INTERVAL_MS = 60000;

function readCsv() {
  if (!fs.existsSync(CSV_15M)) return [];
  const lines = fs.readFileSync(CSV_15M, 'utf8').trim().split('\n');
  const out = [];
  for (const line of lines.slice(1)) {
    const c = line.split(',');
    const ts = Date.parse(c[0]);
    const high = parseFloat(c[2]);
    const low = parseFloat(c[3]);
    const close = parseFloat(c[4]);
    if (!isFinite(ts) || !isFinite(high) || !isFinite(low)) continue;
    const up = (c[13] !== undefined && c[13] !== '') ? parseFloat(c[13]) : null;
    const dn = (c[14] !== undefined && c[14] !== '') ? parseFloat(c[14]) : null;
    out.push({
      ts: Math.floor(ts / 1000), high, low, close,
      sigUp: (up !== null && isFinite(up)) ? up : null,
      sigDn: (dn !== null && isFinite(dn)) ? dn : null,
    });
  }
  return out.sort((a, b) => a.ts - b.ts);
}

/** Extreme de prix precedant chaque signal MCB, puis fusion des grappes. */
function extractPivots(bars) {
  const raw = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    if (b.sigUp === null && b.sigDn === null) continue;
    const cherchHaut = (b.sigDn !== null);
    const from = Math.max(0, i - EXTREME_LOOKBACK);
    let bestIdx = null, bestVal = null;
    for (let j = from; j <= i; j++) {
      const v = cherchHaut ? bars[j].high : bars[j].low;
      if (!isFinite(v)) continue;
      if (bestVal === null || (cherchHaut ? v > bestVal : v < bestVal)) {
        bestVal = v; bestIdx = j;
      }
    }
    if (bestIdx === null) continue;
    raw.push({ ts: bars[bestIdx].ts, type: cherchHaut ? 'HAUT' : 'BAS', price: bestVal });
  }
  const merged = [];
  for (const p of raw) {
    const last = merged[merged.length - 1];
    if (last && last.type === p.type &&
        (p.ts - last.ts) <= MERGE_MINUTES * 60 &&
        Math.abs(p.price - last.price) <= MERGE_USD) {
      const plusExtreme = (p.type === 'HAUT') ? (p.price > last.price) : (p.price < last.price);
      if (plusExtreme) merged[merged.length - 1] = p;
      continue;
    }
    if (last && last.ts === p.ts) continue;
    merged.push(p);
  }
  return merged;
}

/** Droite des moindres carres sur un ensemble de points. */
function fitLine(points) {
  const k = points.length;
  if (k < 2) return null;
  const t0 = points[0].ts;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (const p of points) {
    const x = p.ts - t0;
    sx += x; sy += p.price; sxy += x * p.price; sxx += x * x;
  }
  const den = k * sxx - sx * sx;
  if (Math.abs(den) < 1e-9) return null;
  const slope = (k * sxy - sx * sy) / den;
  const intercept = (sy - slope * sx) / k;
  return { t0, slope, at: (t) => intercept + slope * (t - t0) };
}

/**
 * Recherche a la Benjamin : ancre sur l'avant-dernier pivot confirme, ligne
 * vers le prix courant, comptage des alignements.
 * Renvoie une ligne validee (>= 3 contacts) ou null.
 */
function searchFromAnchor(pivots, type, nowTs, nowPrice) {
  const same = pivots.filter(p => p.type === type);
  /* L'avant-dernier : le dernier peut encore evoluer, on ne s'y ancre pas. */
  if (same.length < 2) return null;
  const anchor = same[same.length - 2];
  if ((nowTs - anchor.ts) < MIN_SPAN_HOURS * 3600) return null;

  const slope = (nowPrice - anchor.price) / (nowTs - anchor.ts);
  const at = (t) => anchor.price + slope * (t - anchor.ts);

  /* Tous les pivots de meme type alignes sur cette ligne provisoire --
   * avant, entre ou apres l'ancre : un point qui vient se poser sur le
   * prolongement est justement la confirmation la plus interessante. */
  const contacts = same.filter(p => Math.abs(p.price - at(p.ts)) <= TOLERANCE_USD);
  if (contacts.length < 3) return null;

  /* Ligne figee par regression sur ses seuls points de contact -- pas sur le
   * prix courant, qui bougera au cycle suivant. C'est ce qui la fait
   * "se stabiliser entre ses points". */
  const fit = fitLine(contacts);
  if (!fit) return null;

  const projected = fit.at(nowTs);
  const distance = nowPrice - projected;
  return {
    anchorType: type,
    contacts: contacts.map(p => ({ ts: p.ts, price: +p.price.toFixed(1) })),
    points: contacts.length,
    slopeUsdPerHour: +(fit.slope * 3600).toFixed(2),
    firstTs: contacts[0].ts,
    lastTs: contacts[contacts.length - 1].ts,
    projectedNow: +projected.toFixed(1),
    distanceUsd: +distance.toFixed(1),
    /* Le role depend de la position du prix, pas du type des points : une
     * ligne batie sur des sommets devient un support des que le prix passe
     * au-dessus. */
    nature: distance >= 0 ? 'SUPPORT' : 'RESISTANCE',
    active: Math.abs(distance) <= TOLERANCE_USD,
    fit: { t0: fit.t0, slope: fit.slope, at0: fit.at(fit.t0) },
  };
}

/** Catalogue persistant : les lignes validees survivent au deplacement du prix. */
function loadCatalogue() {
  try {
    const d = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    return Array.isArray(d.catalogue) ? d.catalogue : [];
  } catch (e) { return []; }
}

function run() {
  const bars = readCsv();
  if (bars.length < 20) {
    console.warn('[trendline] pas assez de bougies 15m');
    return null;
  }
  const nowTs = bars[bars.length - 1].ts;
  const nowPrice = bars[bars.length - 1].close;
  TOLERANCE_USD = +(nowPrice * TOLERANCE_PCT / 100).toFixed(1);

  const recent = bars.filter(b => b.ts >= nowTs - WINDOW_HOURS * 3600);
  const pivots = extractPivots(recent);

  /* Deux candidates au maximum : une par type de pivot. */
  const found = [];
  for (const t of ['HAUT', 'BAS']) {
    const l = searchFromAnchor(pivots, t, nowTs, nowPrice);
    if (l) found.push(l);
  }

  /* Catalogue : on ajoute les nouvelles, on rafraichit la position des
   * anciennes, on retire celles dont le dernier contact sort de la fenetre. */
  const cat = loadCatalogue().filter(l => l.lastTs >= nowTs - WINDOW_HOURS * 3600);
  for (const l of found) {
    const dup = cat.find(c => Math.abs(c.slopeUsdPerHour - l.slopeUsdPerHour) < 2 &&
                              Math.abs(c.fit.at0 - l.fit.at0) < TOLERANCE_USD);
    if (dup) { Object.assign(dup, l); }
    else cat.push(l);
  }
  /* Recalcul de la position de chaque ligne du catalogue au prix courant. */
  for (const l of cat) {
    const proj = l.fit.at0 + l.fit.slope * (nowTs - l.fit.t0);
    l.projectedNow = +proj.toFixed(1);
    l.distanceUsd = +(nowPrice - proj).toFixed(1);
    l.nature = l.distanceUsd >= 0 ? 'SUPPORT' : 'RESISTANCE';
    l.active = Math.abs(l.distanceUsd) <= TOLERANCE_USD;
  }
  cat.sort((a, b) => Math.abs(a.distanceUsd) - Math.abs(b.distanceUsd));

  const actives = cat.filter(l => l.active);
  const above = cat.filter(l => l.distanceUsd < 0)[0] || null;
  const below = cat.filter(l => l.distanceUsd > 0)[0] || null;

  const state = {
    timestamp: new Date().toISOString(),
    barTs: new Date(nowTs * 1000).toISOString(),
    price: nowPrice,
    source: 'ancre sur avant-dernier extreme confirme + prix courant',
    pivotCount: pivots.length,
    foundNow: found.length,
    lineCount: cat.length,
    activeCount: actives.length,
    nearestAbove: above ? { projected: above.projectedNow, distance: Math.abs(above.distanceUsd),
                            points: above.points } : null,
    nearestBelow: below ? { projected: below.projectedNow, distance: below.distanceUsd,
                            points: below.points } : null,
    inZone: actives.length > 0,
    confluence: actives.length,
    maxPointsInZone: actives.length ? Math.max(...actives.map(l => l.points)) : null,
    natureInZone: actives.length ? actives.slice().sort((a, b) => b.points - a.points)[0].nature : null,
    catalogue: cat,
    lines: cat,
    params: { WINDOW_HOURS, TOLERANCE_PCT, TOLERANCE_USD, EXTREME_LOOKBACK,
              MERGE_MINUTES, MERGE_USD, MIN_SPAN_HOURS },
  };

  try {
    fs.writeFileSync(OUT_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('[trendline] ecriture impossible:', e.message);
  }
  return state;
}

function logState(s) {
  if (!s) return;
  console.log(`[trendline] ${s.pivotCount} pivots, ${s.foundNow} ligne(s) trouvee(s) ce cycle, ` +
              `catalogue ${s.lineCount} dont ${s.activeCount} allumee(s), prix ${s.price}`);
  if (s.nearestAbove) console.log(`  au-dessus : ${s.nearestAbove.projected} (+${s.nearestAbove.distance} USD, ${s.nearestAbove.points} pts)`);
  if (s.nearestBelow) console.log(`  en dessous: ${s.nearestBelow.projected} (-${s.nearestBelow.distance} USD, ${s.nearestBelow.points} pts)`);
  if (s.inZone) console.log(`  ALLUMEE : ${s.confluence} ligne(s), max ${s.maxPointsInZone} contacts, ${s.natureInZone}`);
}

if (require.main === module) {
  if (process.argv.includes('--daemon')) {
    console.log(`[trendline] demon demarre, cycle ${DAEMON_INTERVAL_MS / 1000}s`);
    logState(run());
    setInterval(() => { try { logState(run()); } catch (e) { console.error('[trendline]', e.message); } },
                DAEMON_INTERVAL_MS);
  } else {
    logState(run());
  }
}

module.exports = { run, extractPivots, searchFromAnchor };
