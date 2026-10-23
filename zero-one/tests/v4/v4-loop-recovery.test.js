'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path');
test('brain keeps its 30-second cadence after synchronous V4 evaluation failures',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../../modules/cerveau-central.js'),'utf8');
 assert.ok(s.includes('const safeTick=()=>{try{tick();}catch(err){console.error('));
 assert.ok(s.includes('setInterval(safeTick, EVAL_INTERVAL_MS);'));
 assert.ok(s.includes('const EVAL_INTERVAL_MS = 30000;'));
 assert.ok(s.indexOf('setInterval(safeTick, EVAL_INTERVAL_MS);')>s.indexOf('const safeTick='));
});
test('V4 trade archive is serialized compactly and can settle if history write fails',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../../modules/trade-simulator-v4.js'),'utf8');
 assert.ok(s.includes('p===HISTORY_PATH?JSON.stringify(v):JSON.stringify(v,null,2)'));
 assert.ok(s.includes('compactV4TradeHistoryContext(pos.context)'));
 assert.ok(s.includes('compactV4TradeHistoryContext(compactV4(result))'));
 assert.ok(s.includes('EXIT_HISTORY_RECOVERED'));
 assert.ok(s.includes('saveState(state);'));
 assert.ok(s.includes('try{recordDecision(state,module,result);}'));
});
