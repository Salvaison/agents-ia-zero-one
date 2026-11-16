'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(ROOT,'modules/config-server.js'),'utf8');
const runner=fs.readFileSync(path.join(ROOT,'modules/v5/runner-v55.js'),'utf8');
const paper=fs.readFileSync(path.join(ROOT,'modules/v5/paper-v55.js'),'utf8');
test('V55 stands in active Watch instead of V494 while V494 is archival',()=>{
 assert.ok(source.includes("app.get('/api/v55-paper',requireAuth"));
 assert.ok(source.includes('v55-paper-details'));
 assert.ok(source.includes("fetch('/api/v55-paper'"));
 assert.ok(source.includes('setInterval(loadV55PaperPanel,10000)'));
 assert.ok(!source.includes('setInterval(loadV493Panel,30000)'));
 assert.ok(source.includes("ARCHIVE V494 arrêtée le 16/11"));
});
test('V55 and V543 have separate authenticated history and own reports',()=>{
 assert.ok(source.includes("v52:'v52-paper-state.json',v55:'v55-paper-state.json'"));
 assert.ok(source.includes("v55:paperHistoryView('v55')"));
 assert.ok(source.includes("renderPaperHistoryGroup(d.v55,'v55')"));
 assert.ok(source.includes('V55:'));
 assert.ok(source.includes("engine==='v55'?'v55-paper-trades.ndjson'"));
 assert.ok(source.includes("engine==='v55'?"));
 assert.ok(source.includes('LIEU STRUCTUREL À L’ENTRÉE'));
});
test('Waves compare V55 with V543 but no longer pull retired V494 active spans',()=>{
 assert.ok(source.includes("['v55-paper-state.json','V55_PAPER']"));
 assert.ok(!source.includes("['v494-paper-state.json','V493_PAPER']"));
 assert.ok(source.includes('bleu V5.5'));
 assert.ok(source.includes("zone.source==='V55_PAPER'?'V55:'"));
 assert.ok(source.includes("t.source==='V55_PAPER'?'v55':'v493'"));
});
test('V55 runner has independent state, no native-writer duplication, no brokerage imports',()=>{
 assert.ok(runner.includes("v55-paper-state.json"));
 assert.ok(runner.includes("v55-paper-trades.ndjson"));
 assert.ok(runner.includes("const reference=require('./decision-v543')"));
 assert.ok(runner.includes("const result=decision.evaluate("));
 assert.ok(!runner.includes('nativeFeed.step('));
 assert.ok(!runner.includes("const broker=require("));
 assert.ok(!runner.includes("orderClient"));
 assert.ok(paper.includes("HARD_RISK_BTC_USD=500"));
 assert.ok(paper.includes("notionalUsd:NOTIONAL,capitalUsd:INITIAL"));
});
test('client HTML script remains parsable as JavaScript after V55 insertion',()=>{
 const start=source.indexOf("app.get('/app.js', requireAuth");
 const a=source.indexOf('send('+String.fromCharCode(96),start);
 const b=source.indexOf(String.fromCharCode(96)+');\n});',a);
 assert.ok(a>0&&b>a);
 const browser=vm.runInNewContext(String.fromCharCode(96)+source.slice(a+6,b)+String.fromCharCode(96));
 assert.doesNotThrow(()=>new vm.Script(browser));
 assert.ok(browser.includes("const paper=String(tradeNo).match(/^(V52|V55|V493):(\\d+)$/);"));
 assert.ok(browser.includes("if(/^(V52|V55|V493):[1-9]\\d*$/.test(key))"));
});
