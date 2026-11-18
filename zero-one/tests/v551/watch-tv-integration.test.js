'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const server=fs.readFileSync(path.join(ROOT,'modules/config-server.js'),'utf8');
const bridge=fs.readFileSync(path.join(ROOT,'boono-tv/bridge.js'),'utf8');
const load=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
function appJs(){
 const tick=String.fromCharCode(96);
 const at=server.indexOf("app.get('/app.js', requireAuth");
 const a=server.indexOf('send('+tick,at),b=server.indexOf(tick+');\n});',a);
 assert.ok(at>0&&a>0&&b>a);
 return vm.runInNewContext(tick+server.slice(a+6,b)+tick);
}
test('V551 real account route enforces exact independent PAPER contract',()=>{
 const a=server.indexOf("app.get('/api/v551-paper',requireAuth");
 const b=server.indexOf("app.get('/api/v493'",a);
 assert.ok(a>=0&&b>a);
 const route=server.slice(a,b),register={};
 const sandbox={fs,path,__dirname:path.join(ROOT,'modules'),
  Date,Number,Math,JSON,Error,
  app:{get:(p,auth,handler)=>{register[p]=handler}},
  requireAuth:()=>{},
  sendUiJson:(_req,res,payload)=>{res.payload=payload;return res}};
 vm.createContext(sandbox);vm.runInContext(route,sandbox);
 const res={statusCode:200,set(){return this},status(n){this.statusCode=n;return this},
  json(x){this.payload=x;return this}};
 register['/api/v551-paper']({},res);
 assert.equal(res.statusCode,200,JSON.stringify(res.payload));
 assert.equal(res.payload.version,'v5.5.1-paper-ledger-v1');
 assert.equal(res.payload.engine,'V551');
 assert.equal(res.payload.brokerOrdersEnabled,false);
 assert.equal(res.payload.mode,'PAPER_ONLY');
 assert.equal(res.payload.ledgerVersion,'v5.5.1-paper-ledger-v1');
});
test('active Waves reads V551 and V543, never V55 or V494 live',()=>{
 const start=server.indexOf('function waveUiComparePaperTrades');
 const stop=server.indexOf('function ',start+10);
 const x=server.slice(start,stop);
 assert.ok(x.includes("['v551-paper-state.json','V551_PAPER']"));
 assert.ok(x.includes("['v52-paper-state.json','V52_PAPER']"));
 assert.ok(!x.includes("['v55-paper-state.json'"));
 assert.ok(!x.includes("['v494-paper-state.json'"));
});
test('V55 archived history retained; V551 separately listed and report files independent',()=>{
 assert.ok(server.includes("v551:'v551-paper-state.json'"));
 assert.ok(server.includes("v55:'v55-paper-state.json'"));
 assert.ok(server.includes("v551:paperHistoryView('v551')"));
 assert.ok(server.includes("v55:paperHistoryView('v55')"));
 assert.ok(server.includes("'v551-paper-trades.ndjson'"));
 assert.ok(server.includes("'v551-paper-decisions.ndjson'"));
 const js=appJs();
 assert.ok(js.includes("renderPaperHistoryGroup(d.v551,'v551')"));
 assert.ok(js.includes('id="paperV55Archive"'));
 assert.ok(js.includes("renderPaperHistoryGroup(d.v55,'v55')"));
 assert.ok(js.includes("data.engine==='v551'"));
});
test('Watch panel shows V551 decisions, MCB15, MF15 and results, not V55 live',()=>{
 const js=appJs();
 assert.ok(js.includes('function loadV551PaperPanel()'));
 assert.ok(js.includes("fetch('/api/v551-paper'"));
 assert.ok(js.includes("getElementById('v551-paper-live')"));
 assert.ok(js.includes('MCB3 · PREMIER SIGNAL'));
 assert.ok(js.includes('MCB15 · JUGE'));
 assert.ok(js.includes('LIQUIDITÉ'));
 assert.ok(!js.includes('function loadV55PaperPanel()'));
 assert.ok(!js.includes('V5.5 · NOUVEAU PAPER'));
 assert.ok(js.includes("String(waveSelectedTradeId).startsWith('V551:')"));
 assert.doesNotThrow(()=>new vm.Script(js));
});
test('V551 technical and PAPER modules are independent from V543 and V55 policy files',()=>{
 for(const file of ['modules/v551/source.js','modules/v551/decision.js',
  'modules/v551/paper.js','modules/v551/runner.js']){
  const txt=fs.readFileSync(path.join(ROOT,file),'utf8');
  for(const forbidden of ['decision-v543','decision-v55','paper-v543',
   'paper-v55','runner-v543','v55-paper-state.json',
   'v52-paper-state.json','brokerClient','ccxt','private-api'])
    assert.ok(!txt.includes(forbidden),file+': '+forbidden);
 }
 const s=load('data/v551-paper-state.json');
 assert.equal(s.engine,'V551');
 assert.equal(s.brokerOrdersEnabled,false);
 assert.equal(s.startPolicy,'NEW_1000_USD_NO_V55_V543_ACCOUNT_TRANSFER');
});
test('Amsterdam BOONO-TV snapshot includes only active V551/V543 and read-only V551 account',()=>{
 assert.ok(bridge.includes("v551paper: path.join(DATA, 'v551-paper-state.json')"));
 assert.ok(bridge.includes("latestPaperLedgerTrades(PATHS.trades551,'V551')"));
 assert.ok(!bridge.includes('latestPaperLedgerTrades(PATHS.trades494'));
 assert.ok(bridge.includes("['V551',v551State],['V543',v543State]"));
 assert.ok(bridge.includes('engine551:boonoTvV551State('));
 assert.ok(bridge.includes("source:'V551_PAPER_LEDGER_READ_ONLY'"));
 assert.ok(bridge.includes('brokerOrdersEnabled:false'));
});
test('Retired V55 remains FLAT and PM2 is stopped, V551 initial ledger is distinct',()=>{
 const old=load('data/v55-paper-state.json'),now=load('data/v551-paper-state.json');
 assert.equal(old.position,null);
 assert.equal(old.brokerOrdersEnabled,false);
 assert.notEqual(old.version,now.version);
 assert.notEqual(old.startedAt,now.startedAt);
 assert.equal(now.initialCapitalUsd,undefined);
 assert.equal(now.capitalUsd,1000);
 assert.ok(old.completed>=29);
});
