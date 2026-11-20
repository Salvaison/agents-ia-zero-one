'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'../..');
const server=fs.readFileSync(path.join(ROOT,'modules/config-server.js'),'utf8');
const bridge=fs.readFileSync(path.join(ROOT,'boono-tv/bridge.js'),'utf8');
function client(){
 const tick=String.fromCharCode(96),i=server.indexOf("app.get('/app.js', requireAuth");
 const a=server.indexOf('send('+tick,i),b=server.indexOf(tick+');\n});',a);
 assert.ok(i>0&&a>0&&b>a);
 const src=vm.runInNewContext(tick+server.slice(a+6,b)+tick);
 new vm.Script(src);
 return src;
}
test('V553 dedicated protected route verifies independent PAPER and exact version',()=>{
 const begin=server.indexOf("app.get('/api/v553-paper',requireAuth");
 const end=server.indexOf("app.get('/api/v493'",begin);
 assert.ok(begin>0&&end>begin);
 const route=server.slice(begin,end);
 for(const part of ['v553-paper-state.json','v553-paper-summary.json',
  'v5.5.3-paper-ledger-v1',
  'v5.5.3-live-causal-price-market-paper-v1',
  "state.engine!=='V553'",
  "state.mode!=='PAPER_ONLY'","state.brokerOrdersEnabled!==false",
  "state.migratedFrom?.engine!=='V552'",
  'view.asOf!==state.lastObservationAt'])
  assert.ok(route.includes(part),part);
 assert.ok(!route.includes('paper.step('));
});
test('authenticated V553 API returns migrated account and new-policy counters',()=>{
 const old=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v552-paper-state.json')));
 const ledger=require('../../modules/v553/paper').fromV552(old,{
  sourceHash:'mock',frozenSourceHash:'mock',oldProcessStopped:true,
  handoffAt:old.lastObservationAt+1});
 const view=require('../../modules/v553/runner').summary(ledger);
 const begin=server.indexOf("app.get('/api/v553-paper',requireAuth"),
 end=server.indexOf("app.get('/api/v493'",begin),routes={};
 const proxyFs={readFileSync:(file,encoding)=>{
  if(file.endsWith('v553-paper-state.json'))return JSON.stringify(ledger);
  if(file.endsWith('v553-paper-summary.json'))return JSON.stringify(view);
  return fs.readFileSync(file,encoding);
 }};
 const env={app:{get:(name,auth,fn)=>routes[name]=fn},
  requireAuth:()=>{},fs:proxyFs,path,
  __dirname:path.join(ROOT,'modules'),Date,Number,JSON,Math,Error,
  sendUiJson:(_req,res,data)=>{res.data=data;return res;}};
 vm.runInNewContext(server.slice(begin,end),env);
 const res={statusCode:200,headers:{},set(k,v){this.headers[k]=v;return this;},
  status(code){this.statusCode=code;return this;},
  json(data){this.data=data;return this;}};
 routes['/api/v553-paper']({},res);
 assert.equal(res.statusCode,200);
 assert.equal(res.data.engine,'V553');
 assert.equal(res.data.policyVersion,ledger.policyVersion);
 assert.equal(res.data.completed,old.completed);
 assert.equal(res.data.newPolicyClosed,0);
 assert.equal(res.data.equityUsd,old.equityUsd);
 assert.equal(res.data.brokerOrdersEnabled,false);
});
test('Watch primary V553, V543 independent comparison and frozen V552 archive',()=>{
 const js=client();
 const anchor=js.indexOf('stateEl.innerHTML =',js.indexOf('async function loadTrades()'));
 const a=js.indexOf('<details id="v553-paper-details"',anchor);
 const b=js.indexOf('<div id="v52-live"',anchor);
 const c=js.indexOf('<details id="v552-paper-archive"',anchor);
 assert.ok(anchor>0&&a>anchor&&b>a&&c>b);
 assert.ok(js.includes('function loadV553PaperPanel()'));
 assert.ok(js.includes("fetch('/api/v553-paper'"));
 assert.ok(js.includes('CHAÎNE CAUSALE'));
 assert.ok(js.includes('MARCHÉ · NOUVELLE ADMISSION'));
 assert.ok(js.includes("fetch('/api/v52'"));
 assert.ok(js.includes("fetch('/api/v552-paper'"));
 assert.ok(js.includes("renderPaperHistoryGroup(d.v553,'v553')"));
 assert.ok(js.includes("renderPaperHistoryGroup(d.v552,'v552')"));
 assert.ok(js.includes('paperV552Archive'));
});
test('V553 is the ONLY active blue Waves source, V552 is never drawn twice',()=>{
 const a=server.indexOf('function waveUiComparePaperTrades(');
 const b=server.indexOf('// Retained read-only OHLC source',a);
 const src=server.slice(a,b);
 assert.ok(src.includes("['v553-paper-state.json','V553_PAPER']"));
 assert.ok(src.includes("['v52-paper-state.json','V52_PAPER']"));
 assert.ok(src.includes("if(source==='V553_PAPER'&&t.historicalPolicy)continue;"));
 assert.equal(src.includes("['v552-paper-state.json'"),false);
 const js=client();
 assert.ok(js.includes("String(waveSelectedTradeId).startsWith('V553:')"));
 assert.ok(js.includes("V553|V552|V551|V55|V493"));
});
test('V553 paper history and per-trade reports keep archived previous engines',()=>{
 for(const s of ["v553:'v553-paper-state.json'",
  "v552:'v552-paper-state.json'",
  "v553:paperHistoryView('v553')",
  "v552:paperHistoryView('v552')",
  "engine==='v553'?'v553-paper-trades.ndjson'",
  "'v553-paper-decisions.ndjson'",
  "'v552-paper-decisions.ndjson'"])
  assert.ok(server.includes(s),s);
});
test('BOONO-TV receives V553 independent PAPER and keeps MCB read source V543',()=>{
 for(const s of ["v553paper: path.join(DATA, 'v553-paper-state.json')",
  "v553summary: path.join(DATA, 'v553-paper-summary.json')",
  "latestPaperLedgerTrades(PATHS.trades553,'V553')",
  "['V553',v553State],['V543',v543State]",
  "engine553:boonoTvV553State(",
  "source:'V553_PAPER_LEDGER_READ_ONLY'",
  "source:fresh?'V543_PAPER_STATE_READ_ONLY'"])
  assert.ok(bridge.includes(s),s);
 assert.ok(!bridge.includes("latestPaperLedgerTrades(PATHS.trades552,'V552')"));
});
test('OVH patch only touches scene labels, trades blue lane and no Composer code',()=>{
 const patch=fs.readFileSync(path.join(ROOT,'scripts/v553-ovh-scene-display.patch'),'utf8');
 assert.ok(patch.includes('a/scene/app.js'));
 assert.ok(patch.includes('a/scene/index.html'));
 assert.ok(patch.includes('a/scene/chart-views.js'));
 assert.ok(patch.includes('V5.5.3 PAPER'));
 for(const s of ['scene/styles.css','scene/composer',
  'scene/postures','scene/media'])assert.ok(!patch.includes('a/'+s),s);
});
