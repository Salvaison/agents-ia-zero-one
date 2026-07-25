/**
 * cerveau-central.js — Boucle d'évaluation persistante.
 *
 * RÉÉCRIT LE 17/07/2026. La version précédente était one-shot : elle appelait
 * runAll() une fois et le process mourait. Conséquence : le tickBuffer de
 * volume-analyzer.js n'avait jamais le temps de se remplir (le WebSocket met
 * ~1s à se connecter, le script avait déjà rendu insufficient_data). Le groupe
 * Trigger n'a donc JAMAIS produit une seule mesure depuis sa création.
 *
 * Autres bugs corrigés :
 *   - tfMap disait scalp: signal '60m' — cette clé n'existe dans AUCUN CSV_FILES
 *     de volume-analyzer.js ('3m','15m','1h','4h','1d','1w'). Le module scalp
 *     cherchait un fichier inexistant à chaque appel.
 *   - Le scalp lit TROIS timeframes (3m + 15m + 1h), pas un seul.
 *   - Les seuils 5/9, 6/9, 7/9 étaient codés en dur alors qu'ils sont abandonnés
 *     (jamais validés). Tout vient maintenant de config.json.
 *   - MCB / S/R / MA étaient des `const = 0`, ce qui les faisait compter comme
 *     "aucun signal" dans le total au lieu de "pas encore branché". Ils sont
 *     maintenant null, et un score contenant un null n'est PAS comparé à un seuil.
 *
 * Ce que ce fichier NE fait pas encore (et le dit) :
 *   - La notation 1-5 de Momentum/MoneyFlow/DBSI n'existe pas dans
 *     volume-analyzer.js : il rend une force qualitative et score: null.
 *   - La détection de divergence (comparaison de deux signaux consécutifs pour
 *     en déduire 1tf/2tf/3tf) n'est implémentée nulle part.
 *   - S/R et MA/Tendance ne sont branchés à aucune source.
 *   Tant que ces trois points sont ouverts, aucune décision de trade ne peut
 *   être émise. Le fichier le signale explicitement plutôt que d'inventer un
 *   nombre.
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

const EVAL_INTERVAL_MS = 60000;
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

  const scores = {
    divergence: scoreDivergence(module),
    rangeSR:    scoreRangeSR(module, volByTf),
    momentum:   scoreMomentum(primaryVol),
    moneyFlow:  scoreMoneyFlow(primaryVol),
    dbsi:       scoreDbsi(primaryVol),
    trigger:    scoreTrigger(primaryVol),
  };
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
  const trig = primaryVol.trigger;
  details.push((trig && trig.status === 'insufficient_data')
    ? `Trigger: ${trig.count} ticks en buffer (min ${MIN_TICKS})`
    : `Trigger: score=${trig && trig.score} coherence=${trig && trig.coherence}`);
  const ma = evalMaTrend(module, trig);
  details.push(`MA/Tendance: ${ma === null ? 'non branche' : ma}`);
const rules = config.entryRules[module];
  const notScored = Object.keys(scores).filter(k => scores[k] === null);

  if (notScored.length) {
    return {
      module,
      decision: 'INDISPONIBLE',
      reason: `categories non calculables: ${notScored.join(', ')}`,
      scores,
      details,
    };
  }

  if (rules.reading === 'C') {
    for (const b of (rules.blocking || [])) {
      const required = config.scoring[b] && config.scoring[b].min[module];
      if (scores[b] < required) {
        return {
          module,
          decision: 'REFUS',
          reason: `${b}=${scores[b]} < ${required} (bloquant)`,
          scores,
          details,
        };
      }
    }
  }

  const summed = ['divergence', 'rangeSR', 'momentum', 'moneyFlow', 'dbsi']
    .reduce((a, k) => a + scores[k], 0);

  const bypass = checkVolumeBypass(module, scores);
  const threshold = rules.totalThreshold;
  const passes = bypass.applies || (threshold !== null && summed >= threshold);

  return {
    module,
    decision: passes ? 'CONFLUENCE ATTEINTE' : 'REFUS',
    reason: bypass.applies
      ? `bypass volume: ${bypass.reason}`
      : `total=${summed} vs seuil=${threshold}`,
    summed,
    threshold,
    scores,
    details,
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
