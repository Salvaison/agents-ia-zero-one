'use strict';
const assert=require('assert');
const mw=require('../../modules/v3lab/monitoring/mw-hourly-report');

{
  const rows=[{marketTimestamp:0,x:1},{marketTimestamp:1000,x:3},{marketTimestamp:2000,x:5}];
  const s=mw.numericSummary(rows,r=>r.x);
  assert.equal(s.entry,1);assert.equal(s.avg,3);assert.equal(s.exit,5);assert.equal(s.min,1);assert.equal(s.max,5);
}
{
  const rows=[{marketTimestamp:0,x:'A'},{marketTimestamp:1000,x:'B'},{marketTimestamp:3000,x:'B'}];
  const s=mw.categoricalSummary(rows,r=>r.x,0,4000);
  assert.equal(s.entry,'A');assert.equal(s.exit,'B');
  assert.equal(s.occupancy[0].state,'B');assert.equal(s.occupancy[0].pct,75);
}
{
  assert.throws(()=>mw.validateHorizon({thesis:'x',validation:[],invalidation:['y']},'h'),/validation/);
  assert.equal(mw.validateHorizon({thesis:'x',validation:['observable A'],invalidation:['observable B']},'h'),true);
}
{
  // Historical giant logs may be archived after storage rotation. The report must
  // remain structurally valid even when a requested window is explicitly unavailable.
  const r=mw.buildHourlyReport(Date.parse('2026-09-20T14:00:00Z'),Date.parse('2026-09-20T15:00:00Z'));
  assert.equal(r.version,'mw-hourly-v0.1');
  assert.ok(r.window.evaluationCount>=0);
  assert.ok(r.topDown['1h']);
  assert.ok(Array.isArray(r.refusalGates));
  const b=mw.renderEvidenceBrief(r);
  assert.match(b,/BOONO:/);assert.match(b,/Prévision précédente:/);
}
console.log('mw-hourly-report.test.js OK');
