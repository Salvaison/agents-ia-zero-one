const { analyzeVolume } = require('./volume-analyzer');

function getTrendScore(trend) {
  if (trend === 'bull') return 2;
  if (trend === 'neutre') return 1;
  return 0;
}

// TFMAP NOTE — NOT YET DECIDED, pending paper trading validation.
// Benjamin is unsure which pair is correct for the scalp module without direct
// access to the Mac/TradingView to check visually. Two candidates on the table:
//   (a) signal: 15m, context: 1h  — matches the 15m pivot used for Fib calc in agent-spec.md
//   (b) signal: 1h,  context: 4h  — the original pairing, possibly also valid
// Current default below is left at the original 60m/4h. DO NOT treat this as
// resolved — revisit once real chart access allows a visual check.
const tfMap = {
  scalp: { signal: '60m', context: '4h' },
  day:   { signal: '4h',  context: '1d' },
  swing: { signal: '1d',  context: '1W' }
};

async function cerebroCentral(module = 'scalp') {
  console.log(`\n=== Cerveau Central — Module ${module.toUpperCase()} ===\n`);

  const tf = tfMap[module] || tfMap.scalp;

  let score = 0;
  let details = [];

  // --- Module Volume — 3 groupes (Momentum / Engagement / Trigger) ---
  // IMPORTANT: analyzeVolume() no longer returns a single {status, score} pair.
  // It returns 3 raw group results (momentum, engagement, trigger), each with
  // score: null, because the scoring weights are not yet calibrated (pending
  // paper trading data). Do NOT invent a numeric contribution here — report
  // the raw group data and mark the volume contribution as TBD explicitly,
  // rather than silently treating it as 0 (which would misrepresent it as a
  // calibrated "no signal" rather than "not yet scored").
  const vol = analyzeVolume(tf.signal);

  if (vol.momentum.status === 'insufficient_data') {
    details.push(`Volume/Momentum: données insuffisantes (${vol.momentum.count} entrées)`);
  } else {
    details.push(`Volume/Momentum: force=${vol.momentum.force} (score TBD — non calibré)`);
  }

  if (vol.engagement.status === 'insufficient_data') {
    details.push(`Volume/Engagement: données insuffisantes (${vol.engagement.count} entrées)`);
  } else {
    details.push(`Volume/Engagement: force=${vol.engagement.force} (score TBD — non calibré)`);
  }

  if (vol.trigger.status === 'insufficient_data') {
    details.push(`Volume/Trigger: en attente de ticks price-stream.js (${vol.trigger.count} reçus)`);
  } else {
    details.push(`Volume/Trigger: force=${vol.trigger.force}, prix=${vol.trigger.lastPrice} (score TBD — non calibré)`);
  }

  // No numeric score added for volume yet — score stays as-is until calibration.
  // The /9 total below is therefore INCOMPLETE by design, not a real total.

  // Placeholders — seront remplis par MCB et MA/Tendance
  const mcbScore = 0;
  details.push(`MCB: en attente MCP (+${mcbScore})`);
  score += mcbScore;

  const srScore = 0;
  details.push(`S/R: non configuré (+${srScore})`);
  score += srScore;

  const maScore = 0;
  details.push(`MA/Tendance: non connecté (+${maScore})`);
  score += maScore;

  const seuil = module === 'swing' ? 7 : module === 'day' ? 6 : 5;

  console.log(`Score partiel (hors volume — non calibré): ${score}/9`);
  console.log(`Seuil ${module}: ${seuil}/9`);
  console.log(`Décision: ⚠️  NON DISPONIBLE — volume, MCB, S/R et MA/Tendance ne sont pas encore tous scorés numériquement. Ne pas engager de trade sur cette base.\n`);
  details.forEach(d => console.log(`  • ${d}`));
  console.log('');
}

async function runAll() {
  await cerebroCentral('scalp');
  await cerebroCentral('day');
  await cerebroCentral('swing');
}

if (require.main === module) {
  runAll();
}

module.exports = { cerebroCentral };