/**
 * cerveau-central.js — Boucle d'évaluation persistante.
 *
 * RÉÉCRIT LE 17/07/2026 (historique). La version précédente était one-shot :
 * elle appelait runAll() une fois et le process mourait, empêchant le
 * tickBuffer de volume-analyzer.js de se remplir. Corrigé depuis : boucle
 * persistante avec warmup, tick() toutes les 60s.
 *
 * MIS A JOUR LE 27/07/2026 -- etat reel du fichier a cette date :
 *   - Momentum / MoneyFlow / DBSI : scores 1-5 ET valeurs brutes signees
 *     (lastLbw/lastBw/lastMoneyFlow/dbsiTop/dbsiBottom) exposees pour le
 *     diagnostic reel (rawGrid), en plus des scores utilises pour la somme.
 *   - VWAP (LBW - BW) : calcule depuis le 24/07, detecte les passages a
 *     zero (crossedZero) et l'amplitude du retournement (reversalMagnitude).
 *   - Divergence : detectee via divergence.js (chaines par timeframe,
 *     tfCount + sens), exposee brute via describeDivergence().
 *   - rangeSR : combine MA200 (mobile) et niveaux fixes soumis (data/
 *     levels.json), avec confluence scenario ; statut brut (touche_simple/
 *     retest_confirme/hors_zone) expose via describeRangeSR().
 *   - MA/Tendance : branche sur Trigger (coherence + cadenceScore) depuis
 *     le 24/07. Seuils encore provisoires (config.json scoring.maTrend).
 *   - Trigger : coherence (accord directionnel du prix) ET convictionScore
 *     (accord directionnel du volume signe achat/vente) sur 8 tranches de
 *     25 ticks depuis le 27/07 -- convictionScore expose pour observation,
 *     ne participe pas encore a une decision.
 *   - Simulation de trade (trade-simulator.js) : loi d'entree et machine a
 *     etats TP1/TP2/liquidation basee sur le VWAP, en observation seule --
 *     remplace le plan Fibonacci-sur-pivot du SOP v1 (jamais implemente).
 *
 * Points encore ouverts / provisoires :
 *   - Seuils Trigger/Cadence/MA-Tendance non calibres sur donnees reelles
 *     etendues (voir config.json, notes _status).
 *   - Aucun ordre reel n'est jamais passe -- tout reste en observation/dry
 *     run tant que la calibration n'est pas validee en paper trading.
 *
 * Usage :
 *   node cerveau-central.js              # boucle persistante (pour PM2)
 *   node cerveau-central.js --once       # une seule évaluation puis sortie
 */

const fs = require('fs');
const path = require('path');
const { analyzeVolume } = require('./volume-analyzer');
const priceStream = require('./price-stream');
const { scoreDivergence: computeDivergenceScore } = require('./divergence');
const { scoreRangeSR: computeRangeSRScore } = require('./sr-detector');
const { simulateModule } = require('./trade-simulator');

// ── Config ────────────────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, '../config.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

let config;
try {
  config = loadConfig();
} catch (e) {
  console.error(`[cerveau] FATAL: impossible de lire ${CONFIG_PATH} — ${e.message}`);
  process.exit(1);
}

fs.watchFile(CONFIG_PATH, { interval: 5000 }, () => {
  try {
    config = loadConfig();
    log('config.json rechargé');
  } catch (e) {
    log(`config.json illisible, on garde l'ancienne version — ${e.message}`);
  }
});

const EVAL_INTERVAL_MS = 30000; // baisse de 60000 le 31/07/2026 -- aligne sur le cycle de baton-relay.js (30s), qui produisait un verdict sur deux jamais lu
const WARMUP_MS        = 30000;
const MIN_TICKS        = 50;

const ONCE = process.argv.includes('--once');

function log(msg) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] [cerveau] ${msg}\n`);
}
// ── Notation ──────────────────────────────────────────────────────────────────
// Ces fonctions lisent les scores 1-5 calcules par volume-analyzer.js
// (branche le 17/07/2026 -- avant cela, volume-analyzer.js ne rendait que
// score: null et une force qualitative).
function scoreMomentum(volResult) {
  if (!volResult.momentum || volResult.momentum.status === 'insufficient_data') return null;
  return volResult.momentum.score;
}
function scoreMoneyFlow(volResult) {
  if (!volResult.moneyFlow || volResult.moneyFlow.status === 'insufficient_data') return null;
  return volResult.moneyFlow.score;
}
function scoreDbsi(volResult) {
  if (!volResult.dbsi || volResult.dbsi.status === 'insufficient_data') return null;
  return volResult.dbsi.score;
}
function scoreTrigger(volResult) {
  if (!volResult.trigger || volResult.trigger.status === 'insufficient_data') return null;
  return volResult.trigger.score;
}


function scoreDivergence(module) {
  const tf = config.timeframes[module];
  if (!tf) return null;
  const signalTfs = Array.isArray(tf.signal) ? tf.signal : [tf.signal];
  const result = computeDivergenceScore(signalTfs);
  return result.score;
}

function scoreRangeSR(module, volByTf) {
  const tf = config.timeframes[module];
  if (!tf) return null;
  const signalTfs = Array.isArray(tf.signal) ? tf.signal : [tf.signal];
  const mainTf = signalTfs[0];
  const result = computeRangeSRScore(module, mainTf, volByTf);
  return result.score;
}

// Fonctions "describe" (27/07/2026) : exposent les donnees BRUTES de DIV et
// S/R (tfCount/sens, status touche-retest) pour l'affichage diagnostic reel,
// independamment du score numerique utilise par scoreDivergence/scoreRangeSR.
function describeDivergence(module) {
  const tf = config.timeframes[module];
  if (!tf) return null;
  const signalTfs = Array.isArray(tf.signal) ? tf.signal : [tf.signal];
  return computeDivergenceScore(signalTfs);
}

function describeRangeSR(module, volByTf) {
  const tf = config.timeframes[module];
  if (!tf) return null;
  const signalTfs = Array.isArray(tf.signal) ? tf.signal : [tf.signal];
  const mainTf = signalTfs[0];
  return computeRangeSRScore(module, mainTf, volByTf);
}

function evalMaTrend(module, trig) {
  // Branche le 24/07/2026 sur Trigger (coherence + cadenceScore) plutot que MA200.
  // Voir config.json scoring.maTrend._note. Seuils PROVISOIRES.
  if (!trig || trig.status === 'insufficient_data' || trig.cadenceScore == null) return null;
  const cfg = config.scoring.maTrend;
  const coherence = parseFloat(trig.coherence);
  const cadenceScore = trig.cadenceScore;
  if (coherence < cfg.coherenceThreshold || cadenceScore < cfg.cadenceScoreThreshold) {
    return 'neutre';
  }
  const signs = trig.slices.map(s => Math.sign(parseFloat(s.pctMove)));
  const upCount = signs.filter(s => s > 0).length;
  const downCount = signs.filter(s => s < 0).length;
  return upCount > downCount ? 'haussier' : (downCount > upCount ? 'baissier' : 'neutre');
}

// ── Bypass volume ─────────────────────────────────────────────────────────────
function checkVolumeBypass(module, scores) {
  const bp = config.volumeBypass;
  if (!bp || !bp.enabled) return { applies: false, reason: 'désactivé' };
  if (!bp.appliesTo || !bp.appliesTo.includes(module)) {
    return { applies: false, reason: `ne s'applique pas à ${module}` };
  }

  const missing = [];
  for (const k of Object.keys(bp.requires)) {
    const min = bp.requires[k];
    if (scores[k] === null || scores[k] === undefined) {
      return { applies: false, reason: `${k} non calculable (non branché)` };
    }
    if (scores[k] < min) missing.push(`${k}=${scores[k]}<${min}`);
  }
  if (missing.length) return { applies: false, reason: missing.join(', ') };
  return { applies: true, reason: 'les 4 minimums simultanés sont atteints' };
}
// ── Évaluation d'un module ────────────────────────────────────────────────────
function evaluate(module) {
  const tf = config.timeframes[module];
  if (!tf) {
    log(`module inconnu: ${module}`);
    return null;
  }

  const signalTfs = Array.isArray(tf.signal) ? tf.signal : [tf.signal];
  const details = [];

  const volByTf = {};
  for (const t of signalTfs) {
    volByTf[t] = analyzeVolume(t);
  }

  const primaryVol = volByTf[signalTfs[0]];

  for (const t of signalTfs) {
    const v = volByTf[t];
    const m = (v.momentum && v.momentum.status === 'insufficient_data')
      ? `donnees insuffisantes (${v.momentum.count})`
      : `score=${v.momentum && v.momentum.score}`;
    const mf = (v.moneyFlow && v.moneyFlow.status === 'insufficient_data')
      ? `donnees insuffisantes (${v.moneyFlow.count})`
      : `score=${v.moneyFlow && v.moneyFlow.score}`;
    const d = (v.dbsi && v.dbsi.status === 'insufficient_data')
      ? `donnees insuffisantes (${v.dbsi.count})`
      : `score=${v.dbsi && v.dbsi.score}`;
    details.push(`[${t}] Momentum: ${m} | MoneyFlow: ${mf} | DBSI: ${d}`);
  }

  // Timeframes de CONTEXTE (27/07/2026) : affichage informatif uniquement,
  // ne participent PAS au calcul du score (scores bases sur signalTfs/primaryVol).
  const contextTfs = Array.isArray(tf.context) ? tf.context : (tf.context ? [tf.context] : []);
  for (const t of contextTfs) {
    const v = analyzeVolume(t);
    const m = (v.momentum && v.momentum.status === 'insufficient_data')
      ? `donnees insuffisantes (${v.momentum.count})`
      : `score=${v.momentum && v.momentum.score}`;
    const mf = (v.moneyFlow && v.moneyFlow.status === 'insufficient_data')
      ? `donnees insuffisantes (${v.moneyFlow.count})`
      : `score=${v.moneyFlow && v.moneyFlow.score}`;
    const d = (v.dbsi && v.dbsi.status === 'insufficient_data')
      ? `donnees insuffisantes (${v.dbsi.count})`
      : `score=${v.dbsi && v.dbsi.score}`;
    details.push(`[${t}] Momentum: ${m} | MoneyFlow: ${mf} | DBSI: ${d} (contexte, hors score)`);
  }
  const trig = primaryVol.trigger;
  details.push((trig && trig.status === 'insufficient_data')
    ? `Trigger: ${trig.count} ticks en buffer (min ${MIN_TICKS})`
    : `Trigger: score=${trig && trig.score} coherence=${trig && trig.coherence} conviction=${trig && trig.convictionScore}`);
  const ma = evalMaTrend(module, trig);
  details.push(`MA/Tendance: ${ma === null ? 'non branche' : ma}`);

  // Grille diagnostic "donnees reelles" (27/07/2026) : DIV/S-R/VWAP/MoneyFlow
  // puis LBW/BW/DBSI/Trigger/Cadence -- valeurs brutes plutot que scores 1-5.
  const divRaw = describeDivergence(module);
  const srRaw = describeRangeSR(module, volByTf);
  const rawGrid = {
    div: (divRaw && divRaw.tfCount > 0) ? `${divRaw.tfCount}TF ${divRaw.sens}` : 'aucune',
    sr: srRaw ? srRaw.status : '--',
    vwap: (primaryVol.vwap && primaryVol.vwap.current !== undefined) ? primaryVol.vwap.current : '--',
    moneyFlow: (primaryVol.moneyFlow && primaryVol.moneyFlow.lastMoneyFlow !== undefined) ? `${primaryVol.moneyFlow.lastMoneyFlow} / ${primaryVol.moneyFlow.trendMoneyFlow}` : '--',
    lbw: (primaryVol.momentum && primaryVol.momentum.lastLbw !== undefined) ? `${primaryVol.momentum.lastLbw} / ${primaryVol.momentum.trendLbw}` : '--',
    bw: (primaryVol.momentum && primaryVol.momentum.lastBw !== undefined) ? primaryVol.momentum.lastBw : '--',
    dbsi: (primaryVol.dbsi && primaryVol.dbsi.dbsiTop !== undefined) ? `top:${primaryVol.dbsi.dbsiTop} / bottom:${primaryVol.dbsi.dbsiBottom}` : '--',
    trigger: (trig && trig.coherence !== undefined) ? `coh:${trig.coherence} / conv:${trig.convictionScore}` : '--',
    cadence: (trig && trig.cadenceTicksPerSec !== undefined) ? trig.cadenceTicksPerSec : '--',
    tf: signalTfs[0],
  };

  // ===== CHAINE DE CONFLUENCE (28/07/2026) =================================
  // Remplace l'ancienne somme+seuil. Le volumeBypass associe n'est plus
  // appele -- la faille qu'il corrigeait (une somme peut masquer un maillon
  // mort) est desormais evitee structurellement par des minimums simultanes.
  // Chaque maillon doit etre vrai EN MEME TEMPS :
  //   DIV >= min   ET   S/R >= min   ET   Engagement >= min
  //   ET   VWAP a croise zero   ET   Velocite (cadenceScore) >= min
  // config.entryRules n'est plus lu ici (laisse en config, non supprime).
  const minimums = (config.scoring.confluenceChain && config.scoring.confluenceChain.minimums) || {};
  const divScore = divRaw ? divRaw.score : null;
  const srScore = (srRaw && srRaw.score !== null && srRaw.score !== undefined) ? srRaw.score : null;
  const engagementScore = (primaryVol.engagement && primaryVol.engagement.score !== undefined) ? primaryVol.engagement.score : null;
  const velocityScore = (trig && trig.cadenceScore !== undefined && trig.cadenceScore !== null) ? trig.cadenceScore : null;
  const vwapOk = !!(primaryVol.vwap && primaryVol.vwap.crossedZero);

  const chain = {
    div: { value: divScore, min: minimums.div },
    sr: { value: srScore, min: minimums.sr },
    engagement: { value: engagementScore, min: minimums.engagement },
    velocity: { value: velocityScore, min: minimums.velocity },
  };

  const notScored = Object.keys(chain).filter(k => chain[k].value === null);
  if (notScored.length) {
    return {
      module,
      decision: 'INDISPONIBLE',
      reason: `categories non calculables: ${notScored.join(', ')}`,
      chain,
      vwapOk,
      details,
      rawGrid,
    };
  }

  const chainFailures = Object.entries(chain).filter(([k, c]) => c.value < (c.min || 0));
  const passes = chainFailures.length === 0 && vwapOk;

  // Simulation de trade (27/07/2026, cascade 3m ajoutee separement dans
  // trade-simulator.js) : loi d'entree + machine a etats TP1/TP2/liquidation
  // basee sur le VWAP. OBSERVATION SEULE -- aucun ordre reel n'est jamais
  // passe. Portail de confluence DESACTIVE le 29/07/2026 (decision de
  // Benjamin) : trade-simulator redevient autonome, pilote uniquement par
  // sa propre loi VWAP/LBW/ecart/DBSI, pour calibrer ce declencheur en
  // paper trading avant de le recontraindre par la chaine de confluence.
  // Reversible via config.tradeSimulator.requiresConfluence (false
  // actuellement -- remettre a true pour reactiver le portail).
  const requiresConfluence = !config.tradeSimulator || config.tradeSimulator.requiresConfluence !== false;
  if ((passes || !requiresConfluence) && config.tradeSimulator && config.tradeSimulator.enabled) {
    const tradeSimLine = simulateModule(module, primaryVol, divRaw, config, volByTf);
    if (tradeSimLine) details.push(tradeSimLine);
  }

  return {
    module,
    decision: passes ? 'CONFLUENCE ATTEINTE' : 'REFUS',
    reason: passes
      ? 'tous les maillons de la chaine sont verifies'
      : (!vwapOk ? 'VWAP: pas de passage a zero' : chainFailures.map(([k, c]) => `${k}=${c.value}<${c.min}`).join(', ')),
    chain,
    vwapOk,
    details,
    rawGrid,
  };
}

function report(r) {
  if (!r) return;
  log(`-- ${r.module.toUpperCase()} : ${r.decision} -- ${r.reason}`);
  r.details.forEach(d => log(`     ${d}`));
}

function tick() {
  const results = ['scalp', 'day', 'swing'].map(m => evaluate(m));
  results.forEach(report);
  const snapshot = { updatedAt: new Date().toISOString(), results };
  fs.writeFileSync(path.join(__dirname, '../data/latest-evaluation.json'), JSON.stringify(snapshot, null, 2));
}

async function main() {
  log('demarrage');
  log(`config: ${CONFIG_PATH}`);
  priceStream.start();

  log(`warmup ${WARMUP_MS / 1000}s`);
  await new Promise(r => setTimeout(r, WARMUP_MS));

  tick();

  if (ONCE) {
    priceStream.stop();
    return;
  }

  setInterval(tick, EVAL_INTERVAL_MS);
  log(`boucle active -- evaluation toutes les ${EVAL_INTERVAL_MS / 1000}s`);
}

function shutdown() {
  log('arret');
  try { priceStream.stop(); } catch (e) {}
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main();

module.exports = { evaluate, checkVolumeBypass };
