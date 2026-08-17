/**
 * trendline-detector.js — Detection des "lignes imaginaires" (Benjamin).
 *
 * VERSION DU 17/08/2026 : deux changements par rapport a la version du 16/08.
 *
 * ── 1. LES PIVOTS VIENNENT DES SIGNAUX MCB 15m ─────────────────────────
 *
 * La version precedente calculait ses propres extrema locaux sur le 3m
 * (fenetre glissante de 8 bougies, filtre d'amplitude a 25 USD). Resultat :
 * 71 pivots sur 48h au lieu de 35, donc environ quatre fois plus de paires
 * candidates, et des lignes tracees sur des oscillations qui ne correspondent
 * a aucun retournement reel. Benjamin : "clairement il n'utilise pas
 * uniquement les extremes de prix recences pour tracer ses lignes, resultat
 * on a des Luigi all over rendant la fonction inutilisable".
 *
 * C'etait un ecart avec sa conception initiale : l'extreme de prix doit etre
 * celui rattache a un signal MCB. On revient a cette definition, et sur le
 * 15m plutot que le 3m -- les extremes du 15m sont des pivots de structure,
 * ceux qui portent de vraies lignes ; le 3m donne des oscillations trop fines
 * pour ancrer une trendline de 48 heures.
 *
 * Volume attendu : environ 37 signaux 15m sur 48h contre 164 sur le 3m.
 *
 * ── 2. PROCESSUS PM2 AUTONOME ──────────────────────────────────────────
 *
 * Le detecteur etait appele depuis baton-relay avec un cache de 2 minutes.
 * Il tourne desormais seul et ecrit data/trendlines.json ; baton-relay se
 * contente de lire ce fichier. Avantages : cout CPU isole, rythme propre,
 * et un plantage du detecteur ne peut plus affecter le baton.
 *
 *   pm2 start modules/trendline-detector.js --name trendline -- --daemon
 *
 * ── MESURES QUI FONDENT LES PARAMETRES (16/08/2026) ────────────────────
 *
 * Test prospectif : une ligne construite sur 3 pivots alignes annonce-t-elle
 * ou se formera le pivot SUIVANT, inconnu au moment du trace ?
 *
 *   zone +/-15$ : 22% de reussite  (hasard 2.2%)  -- x10
 *   zone +/-25$ : 36%              (hasard 3.6%)  -- x10
 *   zone +/-40$ : 48%              (hasard 5.8%)  -- x8
 *   zone +/-60$ : 62%              (hasard 8.6%)  -- x7
 *
 * Deux resultats contre-intuitifs, mesures et non supposes :
 *   - La REDONDANCE n'aide pas : 3 points donnent 36%, 6 points 34%.
 *   - Les lignes ANCIENNES sont meilleures : moins de 6h -> 27%, plus de
 *     48h -> 36%. Il faut laisser a une ligne le temps de s'etablir.
 *
 * PIEGE EVITE : une premiere version mesurait la "reaction du prix apres
 * contact" et trouvait 100% de rebonds partout. C'etait une tautologie --
 * un minimum local est suivi d'une remontee par definition. Reference
 * mesuree : apres un point bas quelconque, le prix remonte de 47 USD dans
 * 65% des cas, ligne ou pas ligne. Seul le test PROSPECTIF a du sens.
 */

const fs = require('fs');
const path = require('path');

const CSV_15M = '/root/agents-ia-zero-one/data/mcb-live/mcb_15m.csv';
const OUT_PATH = path.join(__dirname, '../data/trendlines.json');

/* Fenetre d'historique. 48h = 192 bougies de 15m. */
const WINDOW_HOURS = 48;

/* Zone de tolerance en POURCENTAGE du prix : un seuil en dollars absolus se
 * perime des que le prix bouge. 0.048% = 30 USD a 63 000, valeur choisie par
 * Benjamin le 16/08 ("l'equivalent de 30 dollars aujourd'hui, en pourcent"). */
const TOLERANCE_PCT = 0.048;
let TOLERANCE_USD = 30;

/* Recul pour retrouver l'extreme de prix precedant un signal. Le signal
 * confirme un retournement deja passe : mesure du 15/08, le decalage median
 * etait de 2 bougies. 5 laisse de la marge sans remonter trop loin. */
const EXTREME_LOOKBACK = 5;

/* Deux ancres separees d'au moins 3h : en deca, la pente est dictee par le
 * bruit local. */
const MIN_SPAN_HOURS = 3;

/* Nombre de lignes conservees. */
const MAX_LINES = 12;

/* Rythme du mode demon. Les lignes bougent lentement -- une minute suffit. */
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
    /* Colonnes 13 et 14 : signal MCB natif. Vides sur la plupart des bougies
     * -- le signal est ponctuel. Absentes des lignes anterieures au 14/08. */
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

/**
 * Un pivot = l'extreme de prix qui a PRECEDE un signal MCB.
 * wt1_cross_up (point vert, creux de vague) -> on cherche le plus BAS.
 * wt1_cross_dn (point rouge, pic de vague)  -> on cherche le plus HAUT.
 */
function extractPivots(bars) {
  const pv = [];
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
    /* Plusieurs signaux peuvent designer le meme extreme -- on ne le compte
     * qu'une fois, sinon le nombre de touches d'une ligne est gonfle. */
    if (pv.length && pv[pv.length - 1].ts === bars[bestIdx].ts) continue;
    pv.push({
      ts: bars[bestIdx].ts,
      type: cherchHaut ? 'HAUT' : 'BAS',
      price: bestVal,
      sigValue: cherchHaut ? b.sigDn : b.sigUp,
      lagBars: i - bestIdx,
    });
  }
  return pv;
}

function buildLines(pivots, nowTs, nowPrice) {
  const lines = [];
  for (let i = 0; i < pivots.length; i++) {
    for (let j = i + 1; j < pivots.length; j++) {
      const a = pivots[i], b = pivots[j];
      if (a.type !== b.type) continue;
      if ((b.ts - a.ts) < MIN_SPAN_HOURS * 3600) continue;

      const slope = (b.price - a.price) / (b.ts - a.ts);
      const at = (t) => a.price + slope * (t - a.ts);

      /* Au moins un point confirmant entre les deux ancres -> 3 points au
       * total. Exiger davantage n'ameliore pas la prediction (mesure). */
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
        inZone: Math.abs(distance) <= TOLERANCE_USD,
        lastAnchorTs: b.ts,
      });
    }
  }

  /* Deux lignes de pente et de niveau proches decrivent la meme chose. */
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

  const above = lines.filter(l => l.distanceUsd < 0)
    .sort((a, b) => b.distanceUsd - a.distanceUsd)[0] || null;
  const below = lines.filter(l => l.distanceUsd > 0)
    .sort((a, b) => a.distanceUsd - b.distanceUsd)[0] || null;
  const inZone = lines.filter(l => l.inZone);

  const state = {
    timestamp: new Date().toISOString(),
    barTs: new Date(nowTs * 1000).toISOString(),
    price: nowPrice,
    source: 'signaux MCB 15m',
    pivotCount: pivots.length,
    lineCount: lines.length,
    nearestAbove: above ? { projected: above.projectedNow, distance: Math.abs(above.distanceUsd),
                            nature: above.nature, points: above.points } : null,
    nearestBelow: below ? { projected: below.projectedNow, distance: below.distanceUsd,
                            nature: below.nature, points: below.points } : null,
    inZone: inZone.length > 0,
    confluence: inZone.length,
    maxPointsInZone: inZone.length ? Math.max(...inZone.map(l => l.points)) : null,
    natureInZone: inZone.length ? inZone.slice().sort((a, b) => b.points - a.points)[0].nature : null,
    lines,
    params: { WINDOW_HOURS, TOLERANCE_PCT, TOLERANCE_USD, EXTREME_LOOKBACK,
              MIN_SPAN_HOURS, MAX_LINES },
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
  console.log(`[trendline] ${s.pivotCount} pivots 15m, ${s.lineCount} lignes, prix ${s.price}`);
  if (s.nearestAbove) console.log(`  resistance : ${s.nearestAbove.projected} (+${s.nearestAbove.distance} USD, ${s.nearestAbove.points} pts)`);
  if (s.nearestBelow) console.log(`  support    : ${s.nearestBelow.projected} (-${s.nearestBelow.distance} USD, ${s.nearestBelow.points} pts)`);
  if (s.inZone) console.log(`  EN ZONE : ${s.confluence} ligne(s), max ${s.maxPointsInZone} touches, ${s.natureInZone}`);
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
