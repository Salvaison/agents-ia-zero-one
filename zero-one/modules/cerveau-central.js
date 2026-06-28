const { analyzeVolume } = require('./volume-analyzer');

// Import MA/Tendance
function getTrendScore(trend) {
  if (trend === 'bull') return 2;
  if (trend === 'neutre') return 1;
  return 0;
}

async function cerebroCentral(module = 'scalp') {
  console.log(`\n=== Cerveau Central — Module ${module.toUpperCase()} ===\n`);

  const tfMap = {
    scalp: { signal: '60m', context: '4h' },
    day:   { signal: '4h',  context: '1d' },
    swing: { signal: '1d',  context: '1W' }
  };

  const tf = tfMap[module] || tfMap.scalp;

  // Score initial
  let score = 0;
  let details = [];

  // Module Volume
  const vol = analyzeVolume(tf.signal);
  if (vol.status !== 'insufficient_data') {
    score += vol.score;
    details.push(`Volume: ${vol.force} (+${vol.score})`);
  } else {
    details.push(`Volume: données insuffisantes (+0)`);
  }

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

  // Décision
  const seuil = module === 'swing' ? 7 : module === 'day' ? 6 : 5;
  const decision = score >= seuil ? '🟢 ENTRÉE AUTORISÉE' : '🔴 ATTENDRE';

  console.log(`Score: ${score}/9`);
  console.log(`Seuil ${module}: ${seuil}/9`);
  console.log(`Décision: ${decision}\n`);
  details.forEach(d => console.log(`  • ${d}`));
  console.log('');
}

cerebroCentral('scalp');
cerebroCentral('day');
cerebroCentral('swing');