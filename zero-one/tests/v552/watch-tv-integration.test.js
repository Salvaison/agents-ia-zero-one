'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'../..');
const src=fs.readFileSync(path.join(ROOT,'modules/config-server.js'),'utf8');
const bridge=fs.readFileSync(path.join(ROOT,'boono-tv/bridge.js'),'utf8');
function client(){
 const tick=String.fromCharCode(96);
 const i=src.indexOf("app.get('/app.js', requireAuth");
 const a=src.indexOf('send('+tick,i),b=src.indexOf(tick+');\n});',a);
 assert.ok(i>0&&a>0&&b>a);
 const js=vm.runInNewContext(tick+src.slice(a+6,b)+tick);
 assert.doesNotThrow(()=>new vm.Script(js));
 return js;
}
test('V552 has its own strictly protected read-only PAPER endpoint',()=>{
 const a=src.indexOf("app.get('/api/v552-paper',requireAuth");
 const b=src.indexOf("app.get('/api/v493'",a);
 assert.ok(a>0&&b>a);
 const v=src.slice(a,b);
 for(const expected of ['v552-paper-state.json','v552-paper-summary.json',
  'v5.5.2-paper-ledger-v1','v5.5.2-lbw15-live-vigilance-campaign-paper-v1',
  "state.engine!=='V552'","state.mode!=='PAPER_ONLY'",
  'state.brokerOrdersEnabled!==false',
  'view.asOf!==state.lastObservationAt'])
  assert.ok(v.includes(expected),expected);
 assert.ok(!v.includes('paper.step('));
});
test('Watch active report, 15m vigilance and new policy economic counters compile',()=>{
 const js=client();
 assert.ok(js.includes('function loadV552PaperPanel()'));
 assert.ok(js.includes("fetch('/api/v552-paper'"));
 assert.ok(js.includes("getElementById('v552-paper-live')"));
 assert.ok(js.includes('V5.5.2 ·'));
 assert.ok(js.includes('VIGILANCE LBW15 LIVE'));
 assert.ok(js.includes('BW15'));
 assert.ok(js.includes('newPolicyClosed'));
 assert.ok(js.includes('newPolicyNetUsd'));
 assert.ok(!js.includes('function loadV551PaperPanel()'));
});
test('active waves V552/V543 only; V551 and V55 remain historic archives',()=>{
 const i=src.indexOf('function waveUiComparePaperTrades(');
 const j=src.indexOf('function waveUiComparePaperTrades(',i+20);
 const w=src.slice(i,j<0?i+2500:j);
 assert.ok(w.includes("['v552-paper-state.json','V552_PAPER']"));
 assert.ok(w.includes("['v52-paper-state.json','V52_PAPER']"));
 assert.ok(!w.includes("['v551-paper-state.json'"));
 assert.ok(w.includes("t.historicalPolicy)continue"));
 const js=client();
 assert.ok(js.includes("renderPaperHistoryGroup(d.v552,'v552')"));
 assert.ok(js.includes("renderPaperHistoryGroup(d.v551,'v551')"));
 assert.ok(js.includes('paperV551Archive'));
 assert.ok(js.includes("String(waveSelectedTradeId).startsWith('V552:')"));
});
test('separate trade reports for V552 new policy and V551 old records',()=>{
 assert.ok(src.includes("v552:'v552-paper-state.json'"));
 assert.ok(src.includes("v551:'v551-paper-state.json'"));
 assert.ok(src.includes("'v552-paper-trades.ndjson'"));
 assert.ok(src.includes("'v552-paper-decisions.ndjson'"));
 const js=client();
 assert.ok(js.includes('V552|V551|V55|V493'));
 assert.ok(js.includes('VERSION DE DÉCISION / PASSATION'));
});
test('Amsterdam TV relay V552 ONLY and dedicated API data',()=>{
 for(const q of ["v552paper: path.join(DATA, 'v552-paper-state.json')",
  "v552summary: path.join(DATA, 'v552-paper-summary.json')",
  "latestPaperLedgerTrades(PATHS.trades552,'V552')",
  "['V552',v552State],['V543',v543State]",
  'engine552:boonoTvV552State(',
  "source:'V552_PAPER_LEDGER_READ_ONLY'"])
  assert.ok(bridge.includes(q),q);
 assert.equal(bridge.includes('engine551:boonoTvV551State'),false);
});
test('no duplicate V551 decision engine, UI and broker remain independent',()=>{
 for(const file of ['source.js','decision.js','paper.js','runner.js',
  'vigilance.js']){
  const s=fs.readFileSync(path.join(ROOT,'modules/v552',file),'utf8');
  assert.ok(!s.includes("require('../v551/decision')"),file);
  assert.ok(!s.includes("require('../v5/decision-v543')"),file);
  assert.ok(!s.includes('brokerClient'),file);
 }
 assert.ok(bridge.includes('brokerOrdersEnabled:false'));
});
test('real V552 ledger when deployed preserves migration authority',()=>{
 const p=path.join(ROOT,'data/v552-paper-state.json');
 if(!fs.existsSync(p))return;
 const s=JSON.parse(fs.readFileSync(p));
 assert.equal(s.version,'v5.5.2-paper-ledger-v1');
 assert.equal(s.engine,'V552');
 assert.equal(s.brokerOrdersEnabled,false);
 assert.equal(s.migratedFrom.engine,'V551');
 assert.equal(s.pre552Completed,s.migratedFrom.oldCompleted);
 assert.equal(s.policyVersion,'v5.5.2-lbw15-live-vigilance-campaign-paper-v1');
});
