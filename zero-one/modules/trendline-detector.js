/**
 * trendline-detector.js — Detection des "lignes imaginaires" (Benjamin, 16/08/2026).
 *
 * Trace des trendlines obliques a partir des extremes de prix, et mesure a
 * quelle distance le prix courant se trouve de chacune.
 *
 * OBSERVATION SEULEMENT : ecrit data/trendlines.json, ne pilote aucune decision.
 *
 * ── MESURES QUI ONT FIXE LES PARAMETRES (16/08/2026, 72h de donnees 3m) ──
 *
 * Test prospectif : une ligne construite sur 3 pivots alignes annonce-t-elle
 * ou se formera le pivot SUIVANT (inconnu au moment du trace) ?
 *
 *   zone +/-15$ : 22% de reussite  (hasard 2.2%)  -- x10
 *   zone +/-25$ : 36%              (hasard 3.6%)  -- x10
 *   zone +/-40$ : 48%              (hasard 5.8%)  -- x8
 *   zone +/-60$ : 62%              (hasard 8.6%)  -- x7
 *   zone +/-80$ : 73%              (hasard 11.5%) -- x6
 *
 * Le "hasard" est la probabilite qu'un niveau tire au sort dans la fourchette
 * du prix tombe a la meme distance d'un pivot. Le detecteur fait 6 a 10 fois
 * mieux quelle que soit la zone -- le choix de TOLERANCE_USD est donc un
 * arbitrage entre fiabilite et precision, pas un seuil de validite.
 *
 * DEUX RESULTATS CONTRE-INTUITIFS, mesures et non supposes :
 *   - La REDONDANCE n'aide pas : 3 points donnent 36%, 6 points 34%. Une ligne
 *     tres touchee ne vaut pas mieux qu'une ligne a trois points.
 *   - Les lignes ANCIENNES sont meilleures : moins de 6h -> 27%, plus de 48h
 *     -> 36%. Il faut laisser a une ligne le temps de s'etablir.
 *
 * PIEGE EVITE : une premiere version mesurait la "reaction du prix apres
 * contact" et trouvait 100% de rebonds sur toutes les lignes. C'etait une
 * tautologie -- un minimum local est suivi d'une remontee par definition.
 * Mesure de reference : apres un point bas quelconque, le prix remonte de
 * 47 USD en moyenne dans 65% des cas, ligne ou pas ligne. Seul le test
 * PROSPECTIF (predire ou sera le prochain pivot) a du sens.
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = '/root/agents-ia-zero-one/data/mcb-live/mcb_3m.csv';
const OUT_PATH = path.join(__dirname, '../data/trendlines.json');

/* Fenetre d'historique. 48h : au-dela, le marche a change de regime ; en deca,
 * pas assez de pivots pour trouver des alignements. */
const WINDOW_HOURS = 48;

/* Zone de tolerance, en POURCENTAGE du prix (16/08/2026). Un seuil en dollars
 * absolus se perime des que le prix bouge -- meme raison qui avait fait passer
 * srZone de 250 USD a 0.39% le 17/07.
 * 0.048% = 30.2 USD a 63 000, valeur choisie par Benjamin.
 * Reperes mesures (a 40 USD absolus) : 48% de reussite prospective contre
 * 5.8% au hasard. Un seuil plus serre reduit le taux mais gagne en precision. */
const TOLERANCE_PCT = 0.048;
let TOLERANCE_USD = 30;   // recalcule a chaque run() sur le prix courant

/* Extraction des pivots : un extremum doit dominer une fenetre de +/-8 bougies
 * (48 min) et s'inscrire dans une amplitude d'au moins MIN_AMPLITUDE, pour
 * ecarter les micro-oscillations. */
const PIVOT_LOOKBACK = 8;
const MIN_AMPLITUDE_USD = 25;

/* Deux ancres doivent etre separees d'au moins 3h : en deca, la pente est
 * dictee par le bruit local. */
const MIN_SPAN_HOURS = 3;

/* Nombre de lignes conservees. Sans limite, 72h de donnees produisent plus de
 * 2000 lignes candidates -- inexploitable. */
const MAX_LINES = 12;

function readCsv() {
  if (!fs.existsSync(CSV_PATH)) return [];
  const lines = fs.readFileSync(CSV_PATH, 'utf8').trim().split('\n');
  const out = [];
  for (const line of lines.slice(1)) {
    const c = line.split(',');
    const ts = Date.parse(c[0]);
    const high = parseFloat(c[2]);
    const low = parseFloat(c[3]);
    const close = parseFloat(c[4]);
    if (!isFinite(ts) || !isFinite(high) || !isFinite(low)) continue;
    out.push({ ts: Math.floor(ts / 1000), high, low, close });
  }
  return out.sort((a, b) => a.ts - b.ts);
}

function extractPivots(bars) {
  const pv = [];
  for (let i = PIVOT_LOOKBACK; i < bars.length - PIVOT_LOOKBACK; i++) {
    const win = bars.slice(i - PIVOT_LOOKBACK, i + PIVOT_LOOKBACK + 1);
    const hi = Math.max(...win.map(b => b.high));
    const lo = Math.min(...win.map(b => b.low));
    if ((hi - lo) < MIN_AMPLITUDE_USD) continue;
    if (bars[i].high === hi) pv.push({ ts: bars[i].ts, type: 'HAUT', price: hi });
    else if (bars[i].low === lo) pv.push({ ts: bars[i].ts, type: 'BAS', price: lo });
  }
  /* Fusionner les pivots consecutifs de meme type et rapproches : un sommet
   * etale sur plusieurs bougies ne doit compter qu'une fois. */
  const ded = [];
  for (const p of pv) {
    const last = ded[ded.length - 1];
    if (last && last.type === p.type && (p.ts - last.ts) < PIVOT_LOOKBACK * 180) {
      if ((p.type === 'HAUT' && p.price > last.price) ||
          (p.type === 'BAS' && p.price < last.price)) ded[ded.length - 1] = p;
      continue;
    }
    ded.push(p);
  }
  return ded;
}

function buildLines(pivots, nowTs, nowPrice) {
  const lines = [];
  for (let i = 0; i < pivots.length; i++) {
    for (let j = i + 1; j < pivots.length; j++) {
      const a = pivots[i], b = pivots[j];
      if (a.type !== b.type) continue;                  // support OU resistance, pas les deux
      if ((b.ts - a.ts) < MIN_SPAN_HOURS * 3600) continue;

      const slope = (b.price - a.price) / (b.ts - a.ts);
      const at = (t) => a.price + slope * (t - a.ts);

      /* Points confirmant la ligne entre les deux ancres. Il en faut au moins
       * un -> 3 points au total. La mesure montre qu'aller au-dela n'ameliore
       * pas la prediction, donc on ne l'exige pas. */
      const conf = pivots.filter(p =>
        p.type === a.type && p.ts > a.ts && p.ts < b.ts &&
        Math.abs(p.price - at(p.ts)) <= TOLERANCE_USD);
      if (conf.length < 1) continue;

      const projected = at(nowTs);
      const distance = nowPrice - projected;

      lines.push({
        nature: a.type === 'BAS' ? 'SUPPORT' : 'RESISTANCE',
        anchors: [
          { ts: a.ts, price: +a.price.toFixed(1) },
          { ts: b.ts, price: +b.price.toFixed(1) },
        ],
        points: conf.length + 2,
        slopeUsdPerHour: +(slope * 3600).toFixed(2),
        spanHours: +((b.ts - a.ts) / 3600).toFixed(1),
        projectedNow: +projected.toFixed(1),
        distanceUsd: +distance.toFixed(1),
        /* Le prix est-il dans la zone de la ligne en ce moment ? */
        inZone: Math.abs(distance) <= TOLERANCE_USD,
        lastAnchorTs: b.ts,
      });
    }
  }

  /* Dedoublonnage : deux lignes de pente et de niveau proches decrivent la
   * meme chose. On garde celle qui a le plus de points. */
  lines.sort((x, y) => y.points - x.points || Math.abs(x.distanceUsd) - Math.abs(y.distanceUsd));
  const uniq = [];
  for (const l of lines) {
    const dup = uniq.some(u =>
      Math.abs(l.slopeUsdPerHour - u.slopeUsdPerHour) < 3 &&
      Math.abs(l.projectedNow - u.projectedNow) < TOLERANCE_USD * 2);
    if (!dup) uniq.push(l);
    if (uniq.length >= MAX_LINES) break;
  }
  return uniq;
}

function run() {
  const bars = readCsv();
  if (bars.length < 50) {
    console.warn('[trendline] pas assez de bougies');
    return null;
  }
  const nowTs = bars[bars.length - 1].ts;
  const nowPrice = bars[bars.length - 1].close;
  /* Tolerance recalculee sur le prix courant, pas figee en dollars. */
  TOLERANCE_USD = +(nowPrice * TOLERANCE_PCT / 100).toFixed(1);
  const recent = bars.filter(b => b.ts >= nowTs - WINDOW_HOURS * 3600);

  const pivots = extractPivots(recent);
  const lines = buildLines(pivots, nowTs, nowPrice);

  /* La plus proche au-dessus et en dessous : c'est ce qui interesse pour
   * savoir ou le prix peut reagir a la hausse comme a la baisse. */
  const above = lines.filter(l => l.distanceUsd < 0)
    .sort((a, b) => b.distanceUsd - a.distanceUsd)[0] || null;
  const below = lines.filter(l => l.distanceUsd > 0)
    .sort((a, b) => a.distanceUsd - b.distanceUsd)[0] || null;

  const state = {
    timestamp: new Date().toISOString(),
    barTs: new Date(nowTs * 1000).toISOString(),
    price: nowPrice,
    pivotCount: pivots.length,
    lineCount: lines.length,
    nearestAbove: above ? { projected: above.projectedNow, distance: Math.abs(above.distanceUsd),
                            nature: above.nature, points: above.points } : null,
    nearestBelow: below ? { projected: below.projectedNow, distance: below.distanceUsd,
                            nature: below.nature, points: below.points } : null,
    inZone: lines.some(l => l.inZone),
    lines,
    params: { WINDOW_HOURS, TOLERANCE_PCT, TOLERANCE_USD, PIVOT_LOOKBACK,
              MIN_AMPLITUDE_USD, MIN_SPAN_HOURS },
  };

  try {
    fs.writeFileSync(OUT_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('[trendline] ecriture impossible:', e.message);
  }
  return state;
}

if (require.main === module) {
  const s = run();
  if (s) {
    console.log(`[trendline] ${s.pivotCount} pivots, ${s.lineCount} lignes, prix ${s.price}`);
    if (s.nearestAbove) console.log(`  resistance la plus proche : ${s.nearestAbove.projected} (+${s.nearestAbove.distance} USD)`);
    if (s.nearestBelow) console.log(`  support le plus proche    : ${s.nearestBelow.projected} (-${s.nearestBelow.distance} USD)`);
    if (s.inZone) console.log('  PRIX ACTUELLEMENT DANS UNE ZONE DE LIGNE');
  }
}

module.exports = { run, extractPivots, buildLines };
