/**
 * trendline-detector.js — "Lignes imaginaires" (conception de Benjamin).
 *
 * VERSION 5 DU 19/08/2026. Quatre regles ajoutees apres observation du
 * catalogue en conditions reelles.
 *
 * ── 1. CHAINE D'ANCRES CONSECUTIVES ────────────────────────────────────
 *
 * Benjamin : "Une ligne se compose d'ancres de meme nature, haut/bas, qui se
 * suivent. Si cette chaine est coupee, la ligne s'arrete."
 *
 * Les versions precedentes reliaient n'importe quels pivots de meme type
 * dans la fenetre. Si trois creux A, B, C existaient et que A-C formait une
 * droite alors que B en etait loin, la ligne etait validee quand meme -- B
 * "percait" la structure sans l'invalider. D'ou les lignes manifestement
 * fausses reliant des points en milieu de vague.
 *
 * Desormais : pour qu'une ligne A→C soit valide, TOUS les pivots de meme
 * type situes entre A et C doivent etre dessus. Un seul hors tolerance et
 * la ligne est rejetee.
 *
 * ── 2. COEXISTENCE DES CONCURRENTES ────────────────────────────────────
 *
 * Benjamin : "Dans un premier temps AB et AC peuvent coexister avec chacune
 * leur prevision. Quand le prix revient il fera son choix et validera l'une
 * ou l'autre. A ce moment le systeme pourrait nettoyer l'autre."
 *
 * On ne tranche donc pas a l'avance. Les deux restent au catalogue ; celle
 * qui recoit un nouveau contact survit, l'autre est retiree.
 *
 * ── 3. RECONFIRMATION A DEUX ANCRES ────────────────────────────────────
 *
 * Une ligne rompue reste en memoire. Si le prix revient, DEUX contacts
 * alignes suffisent a la reactiver -- contre trois exiges a la creation.
 * Une structure deja etablie n'a pas a tout reprouver.
 *
 * ── 4. AUTO-AJUSTEMENT DANS LA PLAGE DE REDONDANCE ─────────────────────
 *
 * Benjamin : "toute la redondance du point peut servir d'ancre, que toutes
 * les ancres s'auto-ajustent entre elles pour au mieux possible etre
 * alignees."
 *
 * Un extreme n'est pas un point mais une zone : les meches autour du sommet
 * couvrent quelques dizaines de dollars, et n'importe laquelle peut servir
 * d'ancre. Reduire le pivot au seul extreme absolu fait rater les lignes
 * dont l'alignement passe cinq dollars a cote.
 *
 * Chaque pivot porte donc une PLAGE [priceMin, priceMax], et la ligne
 * retenue est celle qui minimise l'ecart total en laissant chaque ancre
 * glisser dans sa plage.
 *
 * ── MESURES QUI FONDENT LES PARAMETRES ─────────────────────────────────
 *
 * Test prospectif du 16/08 : une ligne a 3 pivots annonce ou se formera le
 * pivot suivant dans 48% des cas a +/-40 USD, contre 5.8% au hasard.
 * La redondance n'aide pas : 3 points 36%, 6 points 34%.
 *
 * Mesure du 18/08 : le marqueur Lgi actif donne +249 USD de mouvement a
 * 30 min avec 95% de hausses, contre +9 USD en reference -- de loin le
 * meilleur predicteur du systeme, sur 3% du temps seulement.
 *
 * PIEGE EVITE : une premiere version mesurait la "reaction apres contact"
 * et trouvait 100% de rebonds partout. Tautologie -- un minimum local est
 * suivi d'une remontee par definition.
 */

const fs = require('fs');
const path = require('path');

const CSV_15M = '/root/agents-ia-zero-one/data/mcb-live/mcb_15m.csv';
const OUT_PATH = path.join(__dirname, '../data/trendlines.json');
const BATON_PATH = path.join(__dirname, '../data/baton-state.json');
const BATON_MAX_AGE_MS = 120000;

const WINDOW_HOURS = 48;

/* Zone d'allumage et zone de recherche, en pourcentage du prix. La recherche
 * est plus large : on repere une ligne en formation, on ne l'allume que si le
 * prix vient vraiment dessus. */
const TOLERANCE_PCT = 0.048;
const SEARCH_TOLERANCE_PCT = 0.096;
let TOLERANCE_USD = 30;
let SEARCH_TOLERANCE_USD = 60;

const EXTREME_LOOKBACK = 5;
const MERGE_MINUTES = 90;
const MERGE_USD = 40;

/* SECONDE SOURCE DE PIVOTS (19/08/2026) : les extrema locaux du prix,
 * independamment de tout signal MCB. Motif : deux des trois sommets d'une
 * resistance evidente n'existaient pas comme pivots, faute de signal dans
 * les 75 minutes suivantes. Un sommet est un sommet.
 * 4 bougies de 15m de chaque cote = fenetre de 2h. */
const LOCAL_LOOKBACK = 4;
/* Amplitude minimale de l'oscillation, en pourcentage du prix, pour ecarter
 * le bruit. 0.06% = ~38 USD a 64 000. */
const LOCAL_MIN_AMP_PCT = 0.06;
const MIN_SPAN_HOURS = 3;
const DAEMON_INTERVAL_MS = 60000;

/* Amplitude de la plage de redondance d'un pivot, en pourcentage du prix.
 * Ramene de 0.03% a 0.015% le 19/08 (~10 USD a 64 000) : a 19 USD, combine
 * a une tolerance de recherche de 62, l'ajustement laissait se former des
 * lignes sur des points en realite disperses. */
const ANCHOR_PLAY_PCT = 0.015;
let ANCHOR_PLAY_USD = 10;

/* Nombre d'ancres candidates testees, en remontant depuis la plus recente.
 * La plus recente est toujours exclue -- elle peut encore evoluer. Avec une
 * seule ancre (l'avant-dernier), le detecteur ne trouvait rien des que ce
 * pivot precis ne donnait aucun alignement. */
const ANCHOR_CANDIDATES = 10;

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

/**
 * Extreme de prix precedant chaque signal MCB, puis fusion des grappes.
 * Chaque pivot porte une PLAGE et non un point unique : l'extreme absolu,
 * et la marge dans laquelle l'ancre peut glisser pour s'aligner.
 */
function extractPivots(bars) {
  const raw = [];

  /* SOURCE 1 : l'extreme de prix precedant chaque signal MCB. */
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
    raw.push({ ts: bars[bestIdx].ts, type: cherchHaut ? 'HAUT' : 'BAS',
               price: bestVal, src: 'mcb' });
  }

  /* SOURCE 2 : les extrema locaux du prix, sans condition de signal. Une
   * bougie dont le haut domine sa fenetre est un sommet, meme si aucun
   * signal MCB ne l'a confirme. */
  const ampMin = bars.length ? bars[bars.length - 1].close * LOCAL_MIN_AMP_PCT / 100 : 30;
  for (let i = LOCAL_LOOKBACK; i < bars.length - LOCAL_LOOKBACK; i++) {
    const win = bars.slice(i - LOCAL_LOOKBACK, i + LOCAL_LOOKBACK + 1);
    let hi = -Infinity, lo = Infinity;
    for (const w of win) { if (w.high > hi) hi = w.high; if (w.low < lo) lo = w.low; }
    if ((hi - lo) < ampMin) continue;   /* oscillation trop faible */
    if (bars[i].high === hi) raw.push({ ts: bars[i].ts, type: 'HAUT', price: hi, src: 'prix' });
    else if (bars[i].low === lo) raw.push({ ts: bars[i].ts, type: 'BAS', price: lo, src: 'prix' });
  }

  raw.sort((a, b) => a.ts - b.ts);

  const merged = [];
  for (const p of raw) {
    let idx = -1;
    for (let i = merged.length - 1; i >= 0; i--) {
      if (merged[i].type === p.type) { idx = i; break; }
    }
    const last = idx >= 0 ? merged[idx] : null;
    if (merged.some(m => m.type === p.type && m.ts === p.ts)) continue;
    if (last &&
        (p.ts - last.ts) <= MERGE_MINUTES * 60 &&
        Math.abs(p.price - last.price) <= MERGE_USD) {
      const plusExtreme = (p.type === 'HAUT') ? (p.price > last.price) : (p.price < last.price);
      if (plusExtreme) {
        /* Un pivot confirme par un signal MCB garde cette qualite meme si
         * l'extreme retenu vient de la source prix. */
        const srcFusion = (last.src === 'mcb' || p.src === 'mcb') ? 'mcb' : 'prix';
        merged[idx] = Object.assign({}, p, { src: srcFusion });
      } else if (p.src === 'mcb' && last.src === 'prix') {
        last.src = 'mcb';
      }
      continue;
    }
    merged.push(p);
  }

  /* Plage de redondance. Un sommet peut servir d'ancre a son plus haut ou
   * legerement en dessous ; un creux a son plus bas ou legerement au-dessus.
   * L'ancre ne depasse jamais l'extreme absolu, elle ne fait que rentrer. */
  for (const p of merged) {
    if (p.type === 'HAUT') { p.priceMax = p.price; p.priceMin = p.price - ANCHOR_PLAY_USD; }
    else { p.priceMin = p.price; p.priceMax = p.price + ANCHOR_PLAY_USD; }
  }
  return merged;
}

/** Droite des moindres carres sur un ensemble de points. */
function fitLine(points, useField) {
  const k = points.length;
  if (k < 2) return null;
  const t0 = points[0].ts;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (const p of points) {
    const x = p.ts - t0;
    const y = useField ? p[useField] : p.price;
    sx += x; sy += y; sxy += x * y; sxx += x * x;
  }
  const den = k * sxx - sx * sx;
  if (Math.abs(den) < 1e-9) return null;
  const slope = (k * sxy - sx * sy) / den;
  const intercept = (sy - slope * sx) / k;
  return { t0, slope, intercept, at: (t) => intercept + slope * (t - t0) };
}

/**
 * AUTO-AJUSTEMENT. Chaque ancre peut glisser dans sa plage ; on cherche la
 * droite qui minimise l'ecart total. Methode : partir de l'ajustement sur
 * les prix extremes, puis projeter chaque point dans sa plage vers la droite
 * et reajuster. Quelques iterations suffisent a converger.
 */
function fitLineAdjusted(points, iterations = 4) {
  let fit = fitLine(points);
  if (!fit) return null;
  const adjusted = points.map(p => ({ ts: p.ts, price: p.price, type: p.type,
                                      priceMin: p.priceMin, priceMax: p.priceMax }));
  for (let it = 0; it < iterations; it++) {
    for (const p of adjusted) {
      const cible = fit.at(p.ts);
      /* On rapproche l'ancre de la droite, sans sortir de sa plage. */
      p.price = Math.max(p.priceMin, Math.min(p.priceMax, cible));
    }
    const nf = fitLine(adjusted);
    if (!nf) break;
    fit = nf;
  }
  /* Ecart residuel mesure sur les prix D'ORIGINE (19/08/2026) et non sur les
   * prix ajustes : ces derniers donnaient un residuel flatteur qui ne disait
   * rien de la dispersion reelle des pivots. L'ajustement sert a trouver la
   * meilleure droite, pas a maquiller une ligne qui n'existe pas. */
  let errAjuste = 0, errOrigine = 0;
  for (let i = 0; i < adjusted.length; i++) {
    errAjuste += Math.abs(adjusted[i].price - fit.at(adjusted[i].ts));
    errOrigine += Math.abs(points[i].price - fit.at(points[i].ts));
  }
  fit.residual = +(errOrigine / points.length).toFixed(1);
  fit.residualAdjusted = +(errAjuste / adjusted.length).toFixed(1);
  fit.points = adjusted;
  return fit;
}

/**
 * CHAINE CONSECUTIVE. Une ligne n'est valide que si tous les pivots de meme
 * type situes entre le premier et le dernier contact sont sur la ligne.
 * Un pivot intercale hors tolerance rompt la chaine.
 */
function chaineRompueA(pivots, type, contacts, at, tol) {
  const t0 = contacts[0].ts, t1 = contacts[contacts.length - 1].ts;
  let rupture = null;
  for (const p of pivots) {
    if (p.type !== type) continue;
    if (p.ts <= t0 || p.ts >= t1) continue;
    if (contacts.some(c => c.ts === p.ts)) continue;

    const ecart = p.price - at(p.ts);
    /* ASYMETRIE (corrigee le 19/08/2026, elle etait a l'envers).
     *
     * Sur une resistance, un sommet PLUS BAS que la ligne est le
     * comportement normal : le prix ne va pas chercher le niveau a chaque
     * oscillation. Ce qui invalide une resistance, c'est un sommet qui la
     * DEPASSE franchement.
     *
     * La version precedente rompait sur les pivots en deca, ce qui a bloque
     * une resistance a trois sommets alignes a 4 USD pres sur dix-huit
     * heures : ses six sommets intermediaires etaient tous en dessous, de
     * 119 a 282 USD -- exactement ce qu'on attend d'une resistance qui
     * tient. */
    const enDeca = (type === 'HAUT') ? (ecart < 0) : (ecart > 0);
    if (enDeca) continue;                       /* normal, ne rompt jamais */
    if (Math.abs(ecart) > tol) {                /* depassement franc */
      if (rupture === null || p.ts < rupture) rupture = p.ts;
    }
  }
  return rupture;
}

/**
 * Recherche depuis une ancre : toutes les lignes valides partant de
 * l'avant-dernier pivot confirme de ce type. Plusieurs peuvent coexister --
 * c'est le prix qui tranchera.
 */
function searchFromAnchor(pivots, type, nowTs, nowPrice) {
  const same = pivots.filter(p => p.type === type);
  if (same.length < 2) return [];
  const out = [];

  /* PLUSIEURS ANCRES CANDIDATES (19/08/2026). On remonte depuis
   * l'avant-dernier -- le dernier est exclu, il peut encore evoluer. Chaque
   * ancre donne sa propre ligne provisoire vers le prix courant, et donc ses
   * propres alignements. */
  for (let k = 2; k <= Math.min(ANCHOR_CANDIDATES + 1, same.length); k++) {
    const anchor = same[same.length - k];
    if (!anchor) continue;
    if ((nowTs - anchor.ts) < MIN_SPAN_HOURS * 3600) continue;

    const slope = (nowPrice - anchor.price) / (nowTs - anchor.ts);
    const at = (t) => anchor.price + slope * (t - anchor.ts);

    const alignes = same.filter(p => Math.abs(p.price - at(p.ts)) <= SEARCH_TOLERANCE_USD);
    if (alignes.length < 3) continue;
    collectLines(out, pivots, type, alignes, nowTs, nowPrice);
  }

  /* SECONDE METHODE (19/08/2026) : les paires de pivots passes.
   *
   * La recherche par ancre mobile ne trouve que les lignes dont la
   * projection actuelle passe par le prix courant. Une resistance
   * descendante que le prix n'a pas encore rejointe echappe donc a la
   * detection -- alors que c'est le cas le plus interessant : on veut la
   * connaitre AVANT que le prix y arrive.
   *
   * Ici on relie deux pivots passes et on compte les alignements. Le prix
   * n'intervient que plus tard, pour savoir si la ligne est allumee. */
  for (let i = 0; i < same.length - 1; i++) {
    for (let j = i + 1; j < same.length; j++) {
      const A = same[i], B = same[j];
      if ((B.ts - A.ts) < MIN_SPAN_HOURS * 3600) continue;
      const sl = (B.price - A.price) / (B.ts - A.ts);
      const f = (t) => A.price + sl * (t - A.ts);
      const alignes = same.filter(p => Math.abs(p.price - f(p.ts)) <= SEARCH_TOLERANCE_USD);
      /* Trois contacts minimum, comme partout ailleurs. */
      if (alignes.length < 3) continue;
      collectLines(out, pivots, type, alignes, nowTs, nowPrice);
    }
  }
  return out;
}

/* Teste chaque sous-ensemble terminal d'un groupe de pivots alignes : A→B,
 * A→C, etc. Les lignes valides peuvent coexister -- c'est le prix qui
 * tranchera entre elles. */
function collectLines(out, pivots, type, alignes, nowTs, nowPrice) {
  {
  for (let fin = 2; fin < alignes.length; fin++) {
    let sous = alignes.slice(0, fin + 1);
    let fit = fitLineAdjusted(sous);
    if (!fit) continue;

    /* BORNAGE (19/08/2026) : si un pivot rompt la chaine, la ligne s'arrete
     * la -- elle reste valide sur le segment qui precede, au lieu d'etre
     * annulee. C'est ce que decrivait Benjamin : "si cette chaine est
     * coupee, la ligne s'arrete". */
    const rupture = chaineRompueA(pivots, type, sous, fit.at, SEARCH_TOLERANCE_USD);
    if (rupture !== null) {
      /* On garde le segment RECENT (19/08/2026). Une trendline se construit
       * vers le present : si la chaine casse, le pivot fautif marque la fin
       * de l'ancienne structure, et c'est ce qui suit qui reste valide.
       * La version precedente gardait l'ancien segment, ce qui ne laissait
       * qu'un ou deux points quand la rupture survenait tot -- et rejetait
       * donc toutes les candidates. */
      sous = sous.filter(p => p.ts > rupture);
      if (sous.length < 3) continue;
      fit = fitLineAdjusted(sous);
      if (!fit) continue;
      /* La chaine du nouveau segment doit etre intacte a son tour. */
      if (chaineRompueA(pivots, type, sous, fit.at, SEARCH_TOLERANCE_USD) !== null) continue;
    }

    /* Une ligne dont la dispersion D'ORIGINE depasse la tolerance de
     * recherche n'existe pas vraiment : l'ajustement l'aurait fabriquee. */
    if (fit.residual > SEARCH_TOLERANCE_USD) continue;

    const projected = fit.at(nowTs);
    const distance = nowPrice - projected;
    out.push({
      anchorType: type,
      contacts: fit.points.map(p => ({ ts: p.ts, price: +p.price.toFixed(1) })),
      points: fit.points.length,
      slopeUsdPerHour: +(fit.slope * 3600).toFixed(2),
      residual: fit.residual,
      residualAdjusted: fit.residualAdjusted,
      firstTs: sous[0].ts,
      lastTs: sous[sous.length - 1].ts,
      projectedNow: +projected.toFixed(1),
      distanceUsd: +distance.toFixed(1),
      nature: distance >= 0 ? 'SUPPORT' : 'RESISTANCE',
      active: Math.abs(distance) <= TOLERANCE_USD,
      confirmed: true,
      fit: { t0: fit.t0, slope: fit.slope, at0: fit.at(fit.t0) },
    });
  }
  }
}

function loadCatalogue() {
  try {
    const d = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    return Array.isArray(d.catalogue) ? d.catalogue : [];
  } catch (e) { return []; }
}

/**
 * RECONFIRMATION. Une ligne du catalogue, meme rompue, se reactive si DEUX
 * pivots recents s'alignent dessus -- contre trois a la creation.
 */
function reconfirmer(cat, pivots, nowTs) {
  for (const l of cat) {
    const at = (t) => l.fit.at0 + l.fit.slope * (t - l.fit.t0);
    const recents = pivots.filter(p =>
      p.type === l.anchorType && p.ts > l.lastTs &&
      Math.abs(p.price - at(p.ts)) <= SEARCH_TOLERANCE_USD);
    if (recents.length >= 2) {
      for (const p of recents) {
        if (!l.contacts.some(c => c.ts === p.ts)) {
          l.contacts.push({ ts: p.ts, price: +p.price.toFixed(1) });
        }
      }
      l.contacts.sort((a, b) => a.ts - b.ts);
      l.points = l.contacts.length;
      l.lastTs = l.contacts[l.contacts.length - 1].ts;
      l.reconfirmed = (l.reconfirmed || 0) + 1;
    }
  }
}

/**
 * NETTOYAGE DES CONCURRENTES. Deux lignes partageant leur premiere ancre
 * sont des variantes de la meme idee (A→B contre A→C). Quand l'une a recu
 * un contact plus recent que l'autre, le prix a tranche : on garde celle-la.
 */
function nettoyerConcurrentes(cat) {
  const out = [];
  for (const l of cat) {
    const rival = out.find(u => u.anchorType === l.anchorType && u.firstTs === l.firstTs);
    if (!rival) { out.push(l); continue; }
    /* Le prix a tranche en faveur de celle dont le dernier contact est le
     * plus recent ; a egalite, celle dont l'ecart residuel est le plus faible. */
    const gagnante = (l.lastTs > rival.lastTs) ||
                     (l.lastTs === rival.lastTs && l.residual < rival.residual) ? l : rival;
    out[out.indexOf(rival)] = gagnante;
  }
  return out;
}

function run() {
  const bars = readCsv();
  if (bars.length < 20) {
    console.warn('[trendline] pas assez de bougies 15m');
    return null;
  }
  const nowTs = Math.floor(Date.now() / 1000);
  let nowPrice = bars[bars.length - 1].close;
  let priceSource = 'cloture 15m';
  try {
    const b = JSON.parse(fs.readFileSync(BATON_PATH, 'utf8'));
    const age = Date.now() - Date.parse(b.timestamp);
    if (isFinite(b.lastPrice) && age >= 0 && age < BATON_MAX_AGE_MS) {
      nowPrice = b.lastPrice;
      priceSource = 'baton (temps reel)';
    }
  } catch (e) { /* repli sur la cloture */ }

  TOLERANCE_USD = +(nowPrice * TOLERANCE_PCT / 100).toFixed(1);
  SEARCH_TOLERANCE_USD = +(nowPrice * SEARCH_TOLERANCE_PCT / 100).toFixed(1);
  ANCHOR_PLAY_USD = +(nowPrice * ANCHOR_PLAY_PCT / 100).toFixed(1);

  const lastBarTs = bars[bars.length - 1].ts;
  const recent = bars.filter(b => b.ts >= lastBarTs - WINDOW_HOURS * 3600);
  const pivots = extractPivots(recent);

  const found = [];
  for (const t of ['HAUT', 'BAS']) {
    for (const l of searchFromAnchor(pivots, t, nowTs, nowPrice)) found.push(l);
  }

  let cat = loadCatalogue().filter(l => l.lastTs >= lastBarTs - WINDOW_HOURS * 3600);
  reconfirmer(cat, pivots, nowTs);

  for (const l of found) {
    const dup = cat.find(c => Math.abs(c.slopeUsdPerHour - l.slopeUsdPerHour) < 2 &&
                              Math.abs(c.fit.at0 - l.fit.at0) < TOLERANCE_USD);
    if (dup) Object.assign(dup, l);
    else cat.push(l);
  }
  cat = nettoyerConcurrentes(cat);

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
    barTs: new Date(lastBarTs * 1000).toISOString(),
    price: nowPrice,
    priceSource,
    source: 'chaine consecutive, ancres auto-ajustees',
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
    params: { WINDOW_HOURS, TOLERANCE_PCT, TOLERANCE_USD, SEARCH_TOLERANCE_PCT,
              SEARCH_TOLERANCE_USD, ANCHOR_PLAY_PCT, ANCHOR_PLAY_USD,
              ANCHOR_CANDIDATES, EXTREME_LOOKBACK, MERGE_MINUTES, MERGE_USD,
              MIN_SPAN_HOURS },
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
  console.log(`[trendline] ${s.pivotCount} pivots, ${s.foundNow} trouvee(s) ce cycle, ` +
              `catalogue ${s.lineCount} dont ${s.activeCount} allumee(s), ` +
              `prix ${s.price} [${s.priceSource}]`);
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

module.exports = { run, extractPivots, searchFromAnchor, fitLineAdjusted, chaineRompueA };
