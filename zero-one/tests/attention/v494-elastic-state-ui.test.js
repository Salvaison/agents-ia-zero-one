'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const state=require('../../modules/attention/v494-elastic-state-layer');
const config=fs.readFileSync(path.resolve(__dirname,'../../modules/config-server.js'),'utf8');
const start=config.indexOf('let v494StatesPending=false;');
const realStart=config.indexOf('// Independent state-change recorder, separate');
const end=config.indexOf('let v494ElasticShadowPending=false;',realStart);
assert.ok(realStart>=0&&end>realStart);
const t=1793388000000;
const escape=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function boot(){
 let html='',details={open:false},root={
  get innerHTML(){return html;},set innerHTML(value){html=value;},
  querySelector(sel){
   if(sel==='details[data-state-fold="history"]')return null;
   if(sel==='#shadowStateHistoryDetails')return details;
   return {onchange:null,onclick:null};
  }
 };
 const journal={innerHTML:''};
 const context={console,URLSearchParams,
  document:{getElementById:id=>id==='shadowV494States'?root:
   id==='shadowStateHistoryRows'?journal:null},
  escTrade:escape,shadowDateTime:date=>new Date(date).toISOString().slice(0,16),
  v494DualFmt:(x,n=1)=>x===null||x===undefined?'—':Number(x).toFixed(n),
  setTimeout,fetch:()=>Promise.reject(new Error('no live network in unit test'))};
 vm.createContext(context);
 vm.runInContext(config.slice(realStart,end),context,{timeout:3000});
 return {context,root,journal,get html(){return html;}};
}
function data(){
 const vocab=state.GROUPS.map(([family,title,origin,labels])=>({
  family,title,origin,labels}));
 return {version:state.VERSION,mode:'SHADOW_ONLY',brokerOrdersEnabled:false,
  decisionImpact:false,asOf:t,ageMs:400,status:'DATA_RECENT',
  vocabulary:vocab,current:Object.fromEntries(vocab.map(x=>[x.family,x.labels[0]])),
  seenValues:{CONVERSION_QUALITY:{EASY:4}},
  latestTransitions:[{
   at:t,seq:1,id:t+'|CONVERSION_QUALITY',
   family:'CONVERSION_QUALITY',title:'QUALITÉ CONVERSION',
   origin:'V493_P75_CLASSIFIER',from:'SILENT',to:'EASY',
   price:79000,transition:'CHANGED',researchOnly:false
  }]
 };
}
test('State-layer UI is separate from Elastic ticker and available in SHADOWS',()=>{
 assert.match(config,/id="shadowV494States"/);
 assert.match(config,/id="shadowV494Elastic"/);
 assert.match(config,/id="shadowV494Dual"/);
 assert.match(config,/loadV494StateLayer\(\)/);
 const v=boot();vm.runInContext('renderV494StateLayer(payload)',Object.assign(v.context,
  {payload:data()}),{timeout:3000});
 assert.match(v.html,/CHRONOLOGIE DES ÉTATS · COUCHE SÉPARÉE/);
 assert.match(v.html,/TICKER|RÉGIME 4×15/);
 assert.match(v.html,/QUALITÉ CONVERSION/);
 assert.match(v.html,/CAMPAGNE MCB15/);
 assert.match(v.html,/HYPOTHÈSE/);
 assert.match(v.html,/ACCEPTED_REVERSAL \(non observé\)/);
 assert.match(v.html,/Changements/);
 assert.match(v.html,/Snapshots 30s/);
 assert.match(v.html,/Ouvrir le registre horodaté/);
});
test('State history results show as-of time, prev/new and full 30s samples',()=>{
 const v=boot();
 vm.runInContext(`v494StatesHistory.loaded=true;v494StatesHistory.items=[{
  at:${t},asOf:${t},title:'QUALITÉ CONVERSION',family:'CONVERSION_QUALITY',
  from:'EASY',to:'CONTESTED',price:79800,transition:'CHANGED'
 }]`,v.context);
 let html=vm.runInContext('state494ResultRows()',v.context);
 assert.match(html,/EASY → <b>CONTESTED<\/b>/);
 assert.match(html,/connu/);
 vm.runInContext(`v494StatesHistory.kind='snapshots';v494StatesHistory.items=[{
  at:${t},price:80100,states:{MARKET_REGIME:'CHOP_SHADOW',
   CONVERSION_QUALITY:'INEFFICIENT'},
  measurements:{pm3Usd:21,pm5Usd:-40,pmLiveUsd:2,
   yieldVsP75:.4,effortVsP75:2,aggressiveFlowBtcPerSec:.9}
 }]`,v.context);
 html=vm.runInContext('state494ResultRows()',v.context);
 assert.match(html,/CHOP_SHADOW/);
 assert.match(html,/INEFFICIENT/);
 assert.match(html,/liquidité passive non mesurée/);
});
test('Html escape protects state names and timeline against text injection',()=>{
 const v=boot();const raw=data();
 raw.vocabulary[0].title='<svg onload=alert(1)>';
 raw.latestTransitions[0].to='<img src=x onerror=alert(1)>';
 vm.runInContext('renderV494StateLayer(payload)',Object.assign(v.context,{payload:raw}));
 assert.doesNotMatch(v.html,/<svg onload/);
 assert.doesNotMatch(v.html,/<img src=x/);
 assert.match(v.html,/&lt;svg/);
 assert.match(v.html,/&lt;img/);
});
test('Authenticated read-only endpoints never scan the trading ledger or Audit',()=>{
 assert.match(config,/app\.get\('\/api\/shadows\/v494-state-layer',requireAuth/);
 assert.match(config,/app\.get\('\/api\/shadows\/v494-state-history',requireAuth/);
 const a=config.indexOf("app.get('/api/shadows/v494-state-history'");
 const b=config.indexOf('// V494 entry/exit laboratory:',a);
 const route=config.slice(a,b);
 assert.doesNotMatch(route,/audit-history\.json|v494-paper-state\.json/);
 assert.match(route,/v494-elastic-state-timeline\.ndjson/);
 assert.match(route,/v494-elastic-state-observations\.ndjson/);
 assert.match(route,/v494StateHistory\.page/);
});
