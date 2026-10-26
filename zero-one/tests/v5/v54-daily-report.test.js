'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../../daily-report.js'),'utf8');
test('BOONO daily report reads V5.4 active paper ledger and sole V4.9.3 comparator',()=>{
 assert.ok(src.includes("data/v52-paper-state.json"));
 assert.ok(src.includes("data/v493-baseline-state.json"));
 assert.ok(!src.includes("trade-sim-history.json"));
 assert.ok(src.includes("BOONO Systems — rapport PAPER"));
 assert.ok(src.includes("entrées V5.4"));
 assert.ok(src.includes("brokerOrdersEnabled!==false"));
});
test('actual daily report never represents inherited V5.3.3 trades as new V5.4 trades',()=>{
 const r=require('../../daily-report.js').buildReport();
 assert.ok(r.includes('V5.4 PRINCIPAL'));
 assert.ok(r.includes('V4.9.3 COMPARATEUR'));
 assert.ok(r.includes('anciennes versions'));
 assert.ok(r.includes('aucun ordre financé'));
});
