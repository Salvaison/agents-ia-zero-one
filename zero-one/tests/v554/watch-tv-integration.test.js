'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'../..'),server=fs.readFileSync(path.join(ROOT,'modules/config-server.js'),'utf8'),bridge=fs.readFileSync(path.join(ROOT,'boono-tv/bridge.js'),'utf8');
function client(){
 const tick=String.fromCharCode(96),i=server.indexOf("app.get('/app.js', requireAuth"),a=server.indexOf('send('+tick,i),b=server.indexOf(tick+');\n});',a);
 assert.ok(i>0&&a>0&&b>a);const src=vm.runInNewContext(tick+server.slice(a+6,b)+tick);new vm.Script(src);return src;
}
test('Watch client compiled; V554 active, V553 archive, V543 comparator',()=>{
 const js=client();
 assert.ok(js.includes("fetch('/api/v554-paper'"));
 assert.ok(js.includes("renderPaperHistoryGroup(d.v554,'v554')"));
 assert.ok(js.includes("renderPaperHistoryGroup(d.v553,'v553')"));
 assert.ok(js.includes('paperV553Archive'));
 assert.ok(js.includes('TRAJECTOIRE 1H'));
 assert.ok(js.includes("String(waveSelectedTradeId).startsWith('V554:')"));
 assert.ok(js.includes('V554|V553|V552'));
 assert.ok(!js.includes('function loadV553PaperPanel()'));
});
test('authenticated V554 and retired V553 routes enforce identity, fresh market and parity',()=>{
 const begin=server.indexOf("app.get('/api/v553-paper',requireAuth"),end=server.indexOf("app.get('/api/v493'",begin),routes={};
 const state=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v554-paper-state.json')));
 const view=require('../../modules/v554/paper').summary(state);
 const old=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v553-paper-state.json')));
 const oldView=require('../../modules/v553/runner').summary(old);
 const proxyFs={readFileSync:(file,encoding)=>file.endsWith('v554-paper-state.json')?JSON.stringify(state):file.endsWith('v554-paper-summary.json')?JSON.stringify(view):file.endsWith('v553-paper-state.json')?JSON.stringify(old):file.endsWith('v553-paper-summary.json')?JSON.stringify(oldView):fs.readFileSync(file,encoding)};
 vm.runInNewContext(server.slice(begin,end),{app:{get:(n,auth,f)=>routes[n]=f},requireAuth:()=>{},fs:proxyFs,path,__dirname:path.join(ROOT,'modules'),Date,Number,JSON,Error,sendUiJson:(_req,res,data)=>{res.data=data;}});
 const response=()=>({statusCode:200,set(){return this;},status(code){this.statusCode=code;return this;},json(data){this.data=data;return this;}});
 let res=response();routes['/api/v554-paper']({},res);assert.equal(res.statusCode,200);assert.equal(res.data.engine,'V554');assert.equal(res.data.completed,state.completed);assert.equal(res.data.ledgerVersion,state.version);assert.equal(res.data.brokerOrdersEnabled,false);
 res=response();routes['/api/v553-paper']({},res);assert.equal(res.statusCode,200);assert.equal(res.data.status,'PAPER_ARCHIVED');assert.equal(res.data.position,null);assert.deepEqual(res.data.transferredPosition,old.position);
});
test('waves blue only V554 current policy, retired engines excluded',()=>{
 const a=server.indexOf('function waveUiComparePaperTrades('),b=server.indexOf('// Retained read-only OHLC source',a),src=server.slice(a,b);
 assert.ok(src.includes("['v554-paper-state.json','V554_PAPER']"));
 assert.ok(src.includes("['v52-paper-state.json','V52_PAPER']"));
 assert.ok(src.includes("if(source==='V554_PAPER'&&t.historicalPolicy)continue;"));
 assert.ok(!src.includes("['v553-paper-state.json'"));
 assert.ok(server.includes("v553:paperHistoryView('v553')"));assert.ok(server.includes("v554:paperHistoryView('v554')"));
});
test('TV bridge reads only V554 as active second engine, V543 living unchanged',()=>{
 assert.ok(bridge.includes("engine554:boonoTvV554State("));assert.ok(bridge.includes("latestPaperLedgerTrades(PATHS.trades554,'V554')"));
 assert.ok(bridge.includes("raw.migratedFrom?.engine==='V553'"));
 assert.ok(bridge.includes("source:fresh?'V543_PAPER_STATE_READ_ONLY'"));assert.ok(!bridge.includes('engine553:'));
 const a=bridge.indexOf('function boonoTvV554State'),b=bridge.indexOf('function normalizeV543Live',a);
 const fn=vm.runInNewContext(bridge.slice(a,b)+'\nboonoTvV554State',{Number,Date});
 const state=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v554-paper-state.json')));
 const view=require('../../modules/v554/paper').summary(state),v=fn(state,view);
 assert.equal(v.engine,'V554');assert.notEqual(v.status,'UNAVAILABLE');assert.equal(v.completed,state.newPolicyClosed);assert.equal(v.brokerOrdersEnabled,false);
});

