/**
 * trendline-detector.js — "Lignes imaginaires" (conception de Benjamin).
 *
 * VERSION 3 DU 17/08/2026. Trois changements de fond par rapport a la v2.
 *
 * ── 1. UNE LIGNE N'EST NI SUPPORT NI RESISTANCE PAR NATURE ─────────────
 *
 * Benjamin : "une ligne est toujours autant une resistance que un support,
 * cela depend de quel cote tu te places."
 *
 * Les versions precedentes exigeaient que les deux ancres soient de meme
 * type -- un support ne reliait que des BAS, une resistance que des HAUT.
 * C'etait une contrainte artificielle, et elle rendait invisibles les
 * niveaux les plus interessants : celui que Benjamin a trace a 63130 tenait
 * sur trois sommets ET deux creux (le prix l'a traverse deux fois, la ligne
 * a alors agi en support). Le detecteur ne pouvait pas le trouver.
 *
 * Desormais : les lignes se construisent sur TOUS les pivots, sans
 * distinction. La nature se deduit de la position du prix a l'instant --
 * au-dessus de la ligne c'est un support, en dessous une resistance.
 *
 * ── 2. CATALOGUE PERMANENT, LIGNES ALLUMEES PONCTUELLEMENT ─────────────
 *
 * Benjamin : "je m'imaginais que ces lignes s'allumeraient au passage et en
 * alignement avec d'autres ancres."
 *
 * La v2 traitait les lignes eloignees comme du bruit a filtrer. C'est
 * l'inverse : une ligne a 1300 USD du prix n'est pas caduque, elle est
 * ETEINTE -- et peut se rallumer quelques heures plus tard si le prix
 * revient. On garde donc tout le catalogue sur la fenetre de 48h, et on
 * distingue les lignes ACTIVES (prix dans la zone) du reste.
 *
 * ── 3. FUSION DES PIVOTS PROCHES ───────────────────────────────────────
 *
 * Benjamin : "quand le bot voit 5 meches regroupees sur un spot, moi je
 * vois 1 touch."
 *
 * Deux pivots de meme type separes de moins de MERGE_MINUTES et de moins de
 * MERGE_USD sont fusionnes en un seul contact -- on garde le plus extreme.
 * Sans cela, une grappe de mecheseGonfle artificiellement le nombre de
 * touches d'une ligne : les listes de la v2 affichaient 8 points la ou
 * Benjamin en comptait 4.
 *
 * ── MESURES QUI FONDENT LES PARAMETRES (16/08/2026) ────────────────────
 *
 * Test prospectif : une ligne construite sur 3 pivots alignes annonce-t-elle
 * ou se formera le pivot SUIVANT, inconnu au moment du trace ?
 *   zone +/-25$ : 36% de reussite (hasard 3.6%)
 *   zone +/-40$ : 48%             (hasard 5.8%)
 *   zone +/-60$ : 62%             (hasard 8.6%)
 * La redondance n'aide pas : 3 points donnent 36%, 6 points 34%.
 *
 * PIEGE EVITE : une premiere version mesurait la "reaction apres contact" et
 * trouvait 100% de rebonds partout. Tautologie -- un minimum local est suivi
 * d'une remontee par definition. Reference : apres un point bas quelconque,
 * le prix remonte de 47 USD dans 65% des cas, ligne ou pas.
 */

const fs = require('fs');
const path = require('path');

const CSV_15M = '/root/agents-ia-zero-one/data/mcb-live/mcb_15m.csv';
const OUT_PATH = path.join(__dirname, '../data/trendlines.json');

/* Memoire du catalogue. Benjamin : "48h sur le 15min est bien assez, presque
 * trop, mais commencons avec 48". */
const WINDOW_HOURS = 48;

/* Zone d'allumage, en POURCENTAGE du prix -- un seuil en dollars se perime
 * des que le marche bouge. 0.048% = 30 USD a 63 000. */
const TOLERANCE_PCT = 0.048;
let TOLERANCE_USD = 30;

/* Recul pour retrouver l'extreme de prix precedant un signal MCB. Decalage
 * median mesure le 15/08 : 2 bougies. */
const EXTREME_LOOKBACK = 5;

/* Fusion des pivots proches -- transposition du filtre visuel de Benjamin. */
const MERGE_MINUTES = 45;
const MERGE_USD = 40;

/* Deux ancres separees d'au moins 3h : en deca, la pente suit le bruit. */
const MIN_SPAN_HOURS = 3;

/* Une meme ancre ne peut porter qu'un nombre limite de lignes, sinon on
 * obtient des variantes autour de quelques points plutot que des lignes
 * distinctes (constate sur la v2 : une ancre servait a cinq lignes). */
const MAX_LINES_PER_ANCHOR = 2;

const MAX_LINES = 20;
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
    raw.push({
      ts: bars[bestIdx].ts,
      type: cherchHaut ? 'HAUT' : 'BAS',
      price: bestVal,
      sigValue: cherchHaut ? b.sigDn : b.sigUp,
    });
  }

  /* Fusion : deux pivots de meme type, proches dans le temps ET en prix, ne
   * forment qu'un seul contact. On conserve le plus extreme des deux. */
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

function buildLines(pivots, nowTs, nowPrice) {
  const lines = [];
  const anchorUse = {};

  for (let i = 0; i < pivots.length; i++) {
    for (let j = i + 1; j < pivots.length; j++) {
      const a = pivots[i], b = pivots[j];
      /* PAS de contrainte de type : une ligne peut relier un haut et un bas.
       * Voir en-tete -- c'est la position du prix qui fait le support ou la
       * resistance, pas la nature des ancres. */
      if ((b.ts - a.ts) < MIN_SPAN_HOURS * 3600) continue;

      const slope = (b.price - a.price) / (b.ts - a.ts);
      const at = (t) => a.price + slope * (t - a.ts);

      /* Au moins un point confirmant -> 3 contacts au total. */
      const conf = pivots.filter(p =>
        p.ts > a.ts && p.ts < b.ts && Math.abs(p.price - at(p.ts)) <= TOLERANCE_USD);
      if (conf.length < 1) continue;

      const projected = at(nowTs);
      const distance = nowPrice - projected;
      const contacts = conf.concat([a, b]);

      lines.push({
        /* Nature deduite de la position du prix MAINTENANT, pas du type des
         * ancres. Au-dessus de la ligne = support, en dessous = resistance. */
        nature: distance >= 0 ? 'SUPPORT' : 'RESISTANCE',
        anchors: [
          { ts: a.ts, price: +a.price.toFixed(1), type: a.type },
          { ts: b.ts, price: +b.price.toFixed(1), type: b.type },
        ],
        points: contacts.length,
        hauts: contacts.filter(p => p.type === 'HAUT').length,
        bas: contacts.filter(p => p.type === 'BAS').length,
        slopeUsdPerHour: +(slope * 3600).toFixed(2),
        spanHours: +((b.ts - a.ts) / 3600).toFixed(1),
        projectedNow: +projected.toFixed(1),
        distanceUsd: +distance.toFixed(1),
        /* ALLUMEE : le prix est dans la zone en ce moment. Une ligne eteinte
         * n'est pas caduque -- elle peut se rallumer si le prix revient. */
        active: Math.abs(distance) <= TOLERANCE_USD,
        _a: a.ts, _b: b.ts,
      });
    }
  }

  /* Priorite aux lignes allumees, puis aux plus proches du prix. */
  lines.sort((x, y) => (y.active - x.active) ||
                       (Math.abs(x.distanceUsd) - Math.abs(y.distanceUsd)) ||
                       (y.points - x.points));

  const uniq = [];
  for (const l of lines) {
    /* Une ancre ne peut porter qu'un petit nombre de lignes. */
    const ua = anchorUse[l._a] || 0, ub = anchorUse[l._b] || 0;
    if (ua >= MAX_LINES_PER_ANCHOR || ub >= MAX_LINES_PER_ANCHOR) continue;
    const dup = uniq.some(u =>
      Math.abs(l.slopeUsdPerHour - u.slopeUsdPerHour) < 3 &&
      Math.abs(l.projectedNow - u.projectedNow) < TOLERANCE_USD * 2);
    if (dup) continue;
    anchorUse[l._a] = ua + 1;
    anchorUse[l._b] = ub + 1;
    delete l._a; delete l._b;
    uniq.push(l);
    if (uniq.length >= MAX_LINES) break;
  }
  return uniq;
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
  const lines = buildLines(pivots, nowTs, nowPrice);

  const actives = lines.filter(l => l.active);
  const above = lines.filter(l => l.distanceUsd < 0)
    .sort((a, b) => b.distanceUsd - a.distanceUsd)[0] || null;
  const below = lines.filter(l => l.distanceUsd > 0)
    .sort((a, b) => a.distanceUsd - b.distanceUsd)[0] || null;

  const state = {
    timestamp: new Date().toISOString(),
    barTs: new Date(nowTs * 1000).toISOString(),
    price: nowPrice,
    source: 'signaux MCB 15m, lignes mixtes',
    pivotCount: pivots.length,
    lineCount: lines.length,
    activeCount: actives.length,
    nearestAbove: above ? { projected: above.projectedNow, distance: Math.abs(above.distanceUsd),
                            points: above.points } : null,
    nearestBelow: below ? { projected: below.projectedNow, distance: below.distanceUsd,
                            points: below.points } : null,
    /* Champs lus par baton-relay pour le marqueur Lgi. */
    inZone: actives.length > 0,
    confluence: actives.length,
    maxPointsInZone: actives.length ? Math.max(...actives.map(l => l.points)) : null,
    natureInZone: actives.length ? actives.slice().sort((a, b) => b.points - a.points)[0].nature : null,
    lines,
    params: { WINDOW_HOURS, TOLERANCE_PCT, TOLERANCE_USD, EXTREME_LOOKBACK,
              MERGE_MINUTES, MERGE_USD, MIN_SPAN_HOURS, MAX_LINES_PER_ANCHOR },
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
  console.log(`[trendline] ${s.pivotCount} pivots, ${s.lineCount} lignes dont ${s.activeCount} allumee(s), prix ${s.price}`);
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

module.exports = { run, extractPivots, buildLines };
