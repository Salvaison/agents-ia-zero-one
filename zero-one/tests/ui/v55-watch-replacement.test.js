'use strict';
// Regression: V5.5 has been RETIRED as an artifact. V5.5.1 is a separate
// decision engine, PAPER account, Watch and BOONO-TV source.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(ROOT,'modules/config-server.js'),'utf8');
const runner551=fs.readFileSync(path.join(ROOT,'modules/v551/runner.js'),'utf8');
const paper551=fs.readFileSync(path.join(ROOT,'modules/v551/paper.js'),'utf8');
const oldRunner=fs.readFileSync(path.join(ROOT,'modules/v5/runner-v55.js'),'utf8');
const oldPaper=fs.readFileSync(path.join(ROOT,'modules/v5/paper-v55.js'),'utf8');
test('V551 replaces retired V55 in active Watch; V55 survives only as archive',()=>{
 assert.ok(source.includes("app.get('/api/v551-paper',requireAuth"));
 assert.ok(source.includes('v551-paper-details'));
 assert.ok(source.includes("fetch('/api/v551-paper'"));
 assert.ok(source.includes('setInterval(loadV551PaperPanel,10000)'));
 assert.ok(!source.includes('setInterval(loadV55PaperPanel,10000)'));
 assert.ok(source.includes('paperV55Archive'));
 assert.ok(source.includes("app.get('/api/v55-paper',requireAuth"));
});
test('V551/V543 active comparison and V55 archived ledgers remain independently readable',()=>{
 assert.ok(source.includes("v551:'v551-paper-state.json'"));
 assert.ok(source.includes("v55:'v55-paper-state.json'"));
 assert.ok(source.includes("v551:paperHistoryView('v551')"));
 assert.ok(source.includes("v55:paperHistoryView('v55')"));
 assert.ok(source.includes("renderPaperHistoryGroup(d.v551,'v551')"));
 assert.ok(source.includes("renderPaperHistoryGroup(d.v55,'v55')"));
 assert.ok(source.includes("engine==='v551'?'v551-paper-trades.ndjson'"));
 assert.ok(source.includes("'v551-paper-decisions.ndjson'"));
});
test('Waves show V551 blue and V543 magenta; no V55 archived spans in active timeline',()=>{
 const a=source.indexOf('function waveUiComparePaperTrades(');
 const b=source.indexOf('// Retained read-only OHLC source',a);
 assert.ok(a>0&&b>a);
 const wave=source.slice(a,b);
 assert.ok(wave.includes("['v551-paper-state.json','V551_PAPER']"));
 assert.ok(wave.includes("['v52-paper-state.json','V52_PAPER']"));
 assert.ok(!wave.includes("['v55-paper-state.json','V55_PAPER']"));
 assert.ok(source.includes('bleu V5.5.1'));
 assert.ok(source.includes("zone.source==='V551_PAPER'?'V551:'"));
 assert.ok(source.includes("t.source==='V551_PAPER'?'v551':'v493'"));
});
test('New engine does not import old decisions, ledgers, or broker; original source is preserved',()=>{
 assert.ok(runner551.includes("v551-paper-state.json"));
 assert.ok(runner551.includes("v551-paper-trades.ndjson"));
 assert.ok(runner551.includes("const source=require('./source')"));
 assert.ok(runner551.includes("const stream=require('../price-stream')"));
 for(const forbidden of ['decision-v543','decision-v55','paper-v55','runner-v543','orderClient']){
  assert.ok(!runner551.includes(forbidden),forbidden);
 }
 assert.ok(paper551.includes("HARD_RISK_BTC_USD=500"));
 assert.ok(paper551.includes("INITIAL=1000"));
 assert.ok(paper551.includes("brokerOrdersEnabled:false"));
 assert.ok(oldRunner.includes("const reference=require('./decision-v543')"));
 assert.ok(oldPaper.includes("const VERSION='v5.5-paper-ledger-v1.0'"));
});
test('Client HTML remains valid after V551 integration, including historical V55 reports',()=>{
 const start=source.indexOf("app.get('/app.js', requireAuth");
 const tick=String.fromCharCode(96);
 const a=source.indexOf('send('+tick,start);
 const b=source.indexOf(tick+');\n});',a);
 assert.ok(a>0&&b>a);
 const browser=vm.runInNewContext(tick+source.slice(a+6,b)+tick);
 assert.doesNotThrow(()=>new vm.Script(browser));
 assert.ok(browser.includes('V551|V55|V493'));
 assert.ok(browser.includes("String(waveSelectedTradeId).startsWith('V551:')"));
});
