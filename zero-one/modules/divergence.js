/**
 * divergence.js -- Detecteur de divergence prix/MCB, ancre et multi-timeframe.
 *
 * ECRIT LE 18/07/2026. Une divergence est un etat, pas une chaine qui se
 * souvient d'elle-meme. Elle est ACTIVE tant que le prix et la Blue Wave
 * vont en sens oppose par rapport a un point d'ancrage. Des qu'un point va
 * dans le MEME sens que le prix (par rapport a cette meme ancre), la
 * divergence a "exprime" son reequilibrage -- elle se termine net.
 *
 * Multidiv : plusieurs signaux consecutifs qui divergent tous contre la
 * MEME ancre. Comptage 1tf/2tf/3tf : pas besoin de contiguite des TF.
 *
 * Hierarchie de score : multidiv (20 pts) ne se score QUE si 3tf est deja
 * atteint -- pas un chemin independant. Raison : une multidiv isolee sur un
 * seul TF peut etre le symptome d'une cascade de liquidation plutot qu'un
 * vrai retournement structurel.
 *
 * LIMITES ASSUMEES, non resolues :
 *   - "falling knife" (correction majeure ou les div se multiplient sans
 *     inverser la tendance) non detecte -- besoin d'une mesure de vitesse.
 *   - Changement de "sentiment" de fond : pas de critere objectif, jugement
 *     subjectif hors de portee d'un score numerique.
 *   - L'ancre devrait idealement se referer a une vraie structure S/R
 *     (daily/weekly/monthly), pas juste au dernier extreme local -- depend
 *     de l'interface S/R non construite.
 */

const fs = require('fs');
const path = require('path');

const CSV_FILES = {
  '3m':  path.join(__dirname, '../../data/mcb-live/mcb_3m.csv'),
  '15m': path.join(__dirname, '../../data/mcb-live/mcb_15m.csv'),
  '1h':  path.join(__dirname, '../../data/mcb-live/mcb_1h.csv'),
  '4h':  path.join(__dirname, '../../data/mcb-live/mcb_4h.csv'),
  '1d':  path.join(__dirname, '../../data/mcb-live/mcb_1d.csv'),
  '1w':  path.join(__dirname, '../../data/mcb-live/mcb_1w.csv'),
};

const WAVE_SCALE = 200;

function readSignals(timeframe) {
  const filePath = CSV_FILES[timeframe];
  if (!filePath || !fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const rows = lines.slice(1).map(line => {
    const parts = line.split(',');
    const timestamp = parts[0];
    const close = parseFloat(parts[4]);
    const blue_wave = parseFloat(parts[6]);
    const buy = parseFloat(parts[8]);
    return { timestamp, close, blue_wave, buy };
  }).filter(r => !isNaN(r.close) && !isNaN(r.blue_wave));
  return rows.filter(r => !isNaN(r.buy) && r.buy !== 0);
}
function pctPrice(a, b) {
  return ((b.close - a.close) / a.close) * 100;
}

function pctWave(a, b) {
  return ((b.blue_wave - a.blue_wave) / WAVE_SCALE) * 100;
}

function diverges(a, b) {
  const dPrice = pctPrice(a, b);
  const dWave = pctWave(a, b);
  if (dPrice === 0 || dWave === 0) return false;
  return Math.sign(dPrice) !== Math.sign(dWave);
}
function detectDivergenceChains(timeframe) {
  const signals = readSignals(timeframe);
  if (signals.length < 2) {
    return { timeframe, status: 'insufficient_data', count: signals.length, chains: [], activeChain: null };
  }

  const chains = [];
  let anchor = signals[0];
  let chainPoints = [signals[0]];

  for (let i = 1; i < signals.length; i++) {
    const point = signals[i];

    if (diverges(anchor, point)) {
      chainPoints.push(point);
      if (isExpired(chainPoints, timeframe)) {
        chains.push(closeChain(chainPoints, timeframe, false, true));
        anchor = point;
        chainPoints = [point];
      }
    } else {
      if (chainPoints.length >= 2) {
        chains.push(closeChain(chainPoints, timeframe));
      }
      anchor = point;
      chainPoints = [point];
    }
  }

  const activeChain = chainPoints.length >= 2 ? closeChain(chainPoints, timeframe, true) : null;

  return { timeframe, chains, activeChain };
}

function closeChain(points, timeframe, isActive = false, expired = false) {
  const first = points[0];
  const last = points[points.length - 1];
  const dPrice = pctPrice(first, last);
  const dWave = pctWave(first, last);
  const sens = dPrice < 0 && dWave > 0 ? 'haussiere' : (dPrice > 0 && dWave < 0 ? 'baissiere' : 'indeterminee');

  return {
    timeframe,
    sens,
    length: points.length,
    startTs: first.timestamp,
    endTs: last.timestamp,
    amplitudePricePct: dPrice.toFixed(4),
    amplitudeWavePct: dWave.toFixed(2),
    active: isActive,
    expired,
  };
}

module.exports = { detectDivergenceChains, readSignals, diverges, scoreDivergence };
// -- Garde-fou d'expiration (ajoute le 18/07/2026) --
// Une chaine qui reste "active" indefiniment sans jamais rencontrer de point
// de meme sens n'est plus forcement un signal pertinent -- le marche a pu
// evoluer largement entre-temps. Limite simple par nombre de bougies, PAS une
// vraie calibration : a ajuster en paper trading.
//
// PISTE FUTURE non implementee : plutot qu'un seuil fixe, expirer une chaine
// quand le TF SUPERIEUR imprime lui-meme un nouveau point d'ancrage depuis le
// debut de la chaine -- rattacherait l'expiration a un evenement de marche
// reel plutot qu'a un compte de bougies arbitraire. A tester separement.
// Duree max d'une chaine en HEURES avant expiration -- pas un compte de
// points. Rare (~2% des bougies) fait que peu de points peuvent s'etaler sur
// tres longtemps ; c'est la duree reelle qui rend une chaine obsolete, pas
// le nombre de signaux qu'elle contient. Valeur de depart (18/07/2026) :
// 48h pour les TF rapides, a affiner en paper trading. Day/swing pas encore
// definis -- fallback large en attendant.
const MAX_CHAIN_HOURS = {
  '3m': 48, '15m': 48, '1h': 48, '4h': 96, '1d': 240, '1w': 720,
};

function isExpired(chainPoints, timeframe) {
  if (chainPoints.length < 2) return false;
  const first = chainPoints[0];
  const last = chainPoints[chainPoints.length - 1];
  const hoursElapsed = (new Date(last.timestamp) - new Date(first.timestamp)) / 3600000;
  const max = MAX_CHAIN_HOURS[timeframe] || 48;
  return hoursElapsed > max;
}
// -- Score de confluence multi-TF (ajoute le 18/07/2026) --
// Deux chaines sur des TF differents comptent comme "la meme" divergence si
// elles sont ACTIVES EN MEME TEMPS (maintenant) et de MEME SENS -- pas de
// fenetre de tolerance sur les dates de debut/fin, juste l'etat present.
//
// Hierarchie : multidiv (20 pts) ne se score QUE si 3tf est deja atteint.
// Une multidiv isolee sur un seul TF sans confluence ne vaut que son 1tf/2tf.
function scoreDivergence(timeframes) {
  const results = timeframes.map(tf => detectDivergenceChains(tf));

  const activeBySens = { haussiere: [], baissiere: [] };
  for (const r of results) {
    if (r.activeChain && !r.activeChain.expired) {
      activeBySens[r.activeChain.sens]?.push(r.activeChain);
    }
  }

  let bestSens = null;
  let bestChains = [];
  for (const sens of ['haussiere', 'baissiere']) {
    if (activeBySens[sens].length > bestChains.length) {
      bestSens = sens;
      bestChains = activeBySens[sens];
    }
  }

  const tfCount = bestChains.length;
  if (tfCount === 0) {
    return { score: 0, sens: null, tfCount: 0, multidiv: false, detail: results };
  }

  const hasMultidiv = tfCount >= 3 && bestChains.some(c => c.length >= 3);

  let score;
  if (hasMultidiv) score = 20;
  else if (tfCount >= 3) score = 15;
  else if (tfCount === 2) score = 10;
  else score = 5;

  return { score, sens: bestSens, tfCount, multidiv: hasMultidiv, detail: results };
}
