'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const server=fs.readFileSync(path.resolve(__dirname,'../../modules/config-server.js'),'utf8');
const tick=String.fromCharCode(96);
const from=server.indexOf("app.get('/app.js', requireAuth");
const a=server.indexOf('send('+tick,from),b=server.indexOf(tick+');\n});',a);
assert(a>0&&b>a);
const browser=vm.runInNewContext(tick+server.slice(a+6,b)+tick);
const labelling={};
const policyStart=browser.indexOf('function paperTradeVersion(kind,trade){');
const policyEnd=browser.indexOf('// Dedicated PAPER reports',policyStart);
assert(policyStart>0&&policyEnd>policyStart);
vm.createContext(labelling);
vm.runInContext(browser.slice(policyStart,policyEnd),labelling);
function clientSegment(first,last,extra={}){
 const i=browser.indexOf(first),j=browser.indexOf(last,i+first.length);
 assert.ok(i>=0&&j>i,first);
 const ctx={Math,Number,Date,String,Array,Object,JSON,
  escTrade:x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),
  waveParis:x=>new Date(Number(x)).toISOString().slice(11,19),
  paperTradeVersion:labelling.paperTradeVersion,...extra};
 vm.createContext(ctx);vm.runInContext(browser.slice(i,j),ctx);return ctx;
}
function serverRoutes(){
 const i=server.indexOf('const PAPER_LEDGER_PATHS='),j=server.indexOf('// Two active PAPER ledgers',i);
 assert(i>0&&j>i);
 const routes={};
 const c={fs,path,__dirname:path.resolve(__dirname,'../../modules'),
  app:{get:(key,auth,handler)=>routes[key]=handler},
  requireAuth:()=>{},Date,Number,String,JSON,Math,Error,
  readRecentNdjson:()=>[],
  AUDIT_HISTORY_PATH:path.resolve(__dirname,'../../data/audit-history.json'),
  sendUiJson:(req,res,data)=>{res.data=data;return res}};
 vm.createContext(c);vm.runInContext(server.slice(i,j),c);return routes;
}
const mockRes=()=>({code:200,status(x){this.code=x;return this},set(){return this},
 json(v){this.data=v;return this}});
test('both PAPER ledgers have independent read-only history and report routes',()=>{
 const r=serverRoutes();
 const list=mockRes();r['/api/paper-history']({},list);
 assert.equal(list.code,200);
 assert.equal(list.data.v52.brokerOrdersEnabled,false);
 assert.equal(list.data.v493.brokerOrdersEnabled,false);
 assert.ok(Array.isArray(list.data.v52.trades));
 const first=(list.data.v52.trades||[])[0];
 if(first){
  const out=mockRes();
  r['/api/paper-trade-report/:engine/:tradeNo']({params:{engine:'v52',tradeNo:String(first.tradeNo)}},out);
  assert.equal(out.code,200);
  assert.equal(out.data.engine,'v52');
  assert.equal(out.data.tradeNo,first.tradeNo);
  assert.equal(out.data.trade.exitReason,first.exitReason);
 }
 const bad=mockRes();
 r['/api/paper-trade-report/:engine/:tradeNo']({params:{engine:'../../etc',tradeNo:'1'}},bad);
 assert.equal(bad.code,400);
});
test('V5.2 history is visible before collapsed baseline and old V4 history',()=>{
 assert.ok(browser.includes('<div id="paperHistoryPanel">'));
 assert.ok(browser.includes('<details id="v4LegacyHistory"'));
 assert.ok(browser.includes('paperV493History'));
 assert.ok(browser.includes("fetch('/api/paper-history'"));
 assert.ok(browser.includes('loadPaperHistoryPanel();'));
 const c=clientSegment('function renderPaperHistoryGroup(','async function loadPaperHistoryPanel(){');
 const text=c.renderPaperHistoryGroup({completed:2,wins:1,realizedUsd:-.3,equityUsd:999.7,
  trades:[{engine:'v52',tradeNo:2,direction:'long',entryAt:100000,
   exitAt:125000,entryPrice:79467.8,exitPrice:79639.9,
   netPnlUsd:1.75,feesUsd:1.5,mfePriceUsd:332,maePriceUsd:149,
   exitReason:'GAIN_FLOOR'}]},'v52');
 assert.ok(text.includes('V5.4.3 PAPER'));
 assert.ok(text.includes('V5.2 #2'),'older trades retain original version label');
 assert.ok(text.includes('data-paper-report="V52:2"'));
 assert.ok(text.includes('MFE +332.0'));
 assert.ok(text.includes('RAPPORT'));
});
test('Waves reports are restored for both engines and share readable overlay',()=>{
 assert.ok(browser.includes("if(t.source==='V52_PAPER'||t.source==='V493_PAPER')"));
 assert.ok(browser.includes('waveTradeReportBtn'));
 assert.ok(browser.includes("fetch('/api/paper-trade-report/'"));
 assert.ok(browser.includes('document.body.appendChild(ov)'));
 assert.ok(browser.includes('data-paper-report'));
 assert.ok(browser.includes("paperTradeVersion(t.source==='V52_PAPER'?'v52':'v493',t)"),
  'Waves selection must also use the trade actual originating policy version');
 const c=clientSegment('function renderPaperTradeReport(data){','async function waveOpenTradeReport(tradeNo) {');
 const html=c.renderPaperTradeReport({engine:'v52',tradeNo:2,status:'CLOSED',
  trade:{direction:'long',entryAt:100000,exitAt:125000,
   entryPrice:79467.8,exitPrice:79639.9,netPnlUsd:1.7469,
   grossPnlUsd:3.2469,feesUsd:1.5,mfePriceUsd:332.1,maePriceUsd:148.7,
   exitReason:'GAIN_FLOOR_120_90_OR_220_180',entryContext:{
    phase:'EXTREME_REVERSAL_CANDIDATE',prognosis:'Retournement LONG',
    mcb15:{trajectory:'short',lbw:-84.2,extreme45m:85.5},
    geometry:{cross3:{direction:'long',ts:123000,slopePerMinute:2.3}},
    conversion:{pm3:172.6,pm5:61.9},
    place:{nearest:{key:'MCB15_LOCAL_LOW',price:79168}}}},
  postExit:[{minutes:15,status:'OBSERVED',price:79835.2,fromExitUsd:195.3,
   maxFavourableFromExitUsd:224.6,maxAdverseFromExitUsd:-.9}]});
 assert.ok(html.includes('V5.2 PAPER #2'));
 assert.ok(html.includes('GAIN_FLOOR_120_90_OR_220_180'));
 assert.ok(html.includes('PHASE À L’ENTRÉE'));
 assert.ok(html.includes('CONVERSION MESURÉE'));
 assert.ok(html.includes('APRÈS LA SORTIE'));
 assert.ok(html.includes('195.30'));
});

test('history loads only on explicit tab navigation, never by a 30s history timer',()=>{
 assert.ok(browser.includes("} else if (el.dataset.tab2 === 'historyv2') {"));
 assert.ok(browser.includes("loadPaperHistoryPanel();"));
 assert.ok(browser.includes("historyTab&&historyTab.classList.contains('active')"));
 assert.ok(!browser.includes('setInterval(loadPaperHistoryPanel,30000)'));
 // Only TWO explicit call sites: Historique tab and reenter TRADES on Historique.
 const calls=[...browser.matchAll(/loadPaperHistoryPanel\(\);/g)].length;
 assert.equal(calls,2);
 assert.ok(browser.includes('id="paperHistoryPanel"'));
});
test('PAPER report key regexes survive server-side JS template processing',()=>{
 assert.ok(browser.includes('const paper=String(tradeNo).match(/^(V52|V493):(\\d+)$/);'));
 assert.ok(browser.includes('if(/^(V52|V493):[1-9]\\d*$/.test(key))waveOpenTradeReport(key);'));
 const report=/^(V52|V493):(\d+)$/;
 const click=/^(V52|V493):[1-9]\d*$/;
 for(const k of ['V52:77','V52:78','V493:26','V493:27']){
  assert.ok(report.test(k));assert.ok(click.test(k));
 }
 for(const k of ['V52:0','V493:not_a_number','V493:27x']){
  assert.equal(click.test(k),false);
 }
});
test('real trade policy labels are kept across V5.4.2 and V4.9.4 migrations',()=>{
 const v=labelling.paperTradeVersion;
 assert.equal(v('v52',{entryPolicyVersion:'v5.4.2-selective-attention-paper-v1'}),'V5.4.2');
 assert.equal(v('v52',{entryPolicyVersion:'v5.4.3-causal-offensive-maturity-paper-v1'}),'V5.4.3');
 assert.equal(v('v52',{entryPolicyVersion:'v5.4.1-structural-e3-territory-paper-v1'}),'V5.4.1');
 assert.equal(v('v493',{engine:'V4.9.4'}),'V4.9.4');
 assert.equal(v('v493',{engine:'V4.9.3'}),'V4.9.3');
 const c=clientSegment('function renderPaperHistoryGroup(','async function loadPaperHistoryPanel(){');
 const html=c.renderPaperHistoryGroup({completed:1,netUsd:1,
  trades:[{tradeNo:77,engine:'v52',entryPolicyVersion:'v5.4.2-selective-attention-paper-v1',
   direction:'short',entryAt:100000,exitAt:120000,entryPrice:80070.1,
   exitPrice:80320,netPnlUsd:-6.18}]},'v52');
 assert.ok(html.includes('V5.4.2 #77'));
 const html493=c.renderPaperHistoryGroup({completed:1,
  trades:[{tradeNo:27,engine:'V4.9.4',direction:'long',entryAt:100000,exitAt:120000,
   entryPrice:80000,exitPrice:80200,netPnlUsd:2.25}]},'v493');
 assert.ok(html493.includes('V4.9.4 #27'));
});
