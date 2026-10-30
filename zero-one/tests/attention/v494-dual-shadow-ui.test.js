'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../../');
const view=require('../../modules/attention/v494-dual-ui-summary');
const server=fs.readFileSync(path.join(ROOT,'modules/config-server.js'),'utf8');
const live=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v494-dual-module-shadow-summary.json'),'utf8'));
function fixture(){
 const s=JSON.parse(JSON.stringify(live));
 for(const key of Object.keys(s.branches)){
  const b=s.branches[key];
  b.entries=0;b.completed=0;b.netRealizedUsd=0;b.feesUsd=0;
  b.entriesByDirection={long:0,short:0};
  b.netByDirection={long:0,short:0};
  b.blockedEntries=0;b.partialExits=0;
  b.position=null;b.recentTrades=[];b.exitsByReason={};
 }
 s.recentEvents=[];s.recentInfluence=[];s.influenceCount=0;
 return s;
}
function fromAppJs(){
 const tick=String.fromCharCode(96);
 const source=server.indexOf("app.get('/app.js', requireAuth");
 const a=server.indexOf('send('+tick,source);
 const b=server.indexOf(tick+');\n});',a);
 assert.ok(source>0&&a>0&&b>a);
 return vm.runInNewContext(tick+server.slice(a+6,b)+tick);
}
function uiContext(){
 const js=fromAppJs();
 const a=js.indexOf('function v494DualMoney(');
 const b=js.indexOf('async function loadShadows(){',a);
 assert.ok(a>0&&b>a);
 const holder={innerHTML:'',
  querySelectorAll:()=>[]};
 const funcs={
  shadowMoney:(n,d=1)=>(Number(n)>=0?'+':'')+Number(n).toFixed(d)+' $',
  shadowFmt:(n,d=1)=>Number(n).toFixed(d),
  shadowDateTime:ts=>ts===null?'—':
   new Date(ts).toISOString().slice(0,16).replace('T',' '),
  shadowStat:(n,label)=>'<div class="shadow-stat"><b>'+n+'</b>'+label+'</div>',
  shadowKv:rows=>rows.map(x=>'<span>'+String(x[0])+': '+String(x[1])+'</span>').join(''),
  escTrade:x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;')
   .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'),
  document:{getElementById:id=>id==='shadowV494Dual'?holder:null},
  Date,Number,String,Math,Array,Set
 };
 vm.createContext(funcs);
 vm.runInContext(js.slice(a,b),funcs);
 return {ctx:funcs,holder,js};
}
test('full schema: four branches and clean read-only status, excludes heavy source',()=>{
 const data=view.build(fixture(),live.lastObservationAt+15000);
 assert.equal(data.version,'v494-dual-shadow-ui-v1');
 assert.equal(data.branches.length,4);
 assert.deepEqual(data.branches.map(x=>x.key),['A','B','C','D']);
 assert.equal(data.status,'DATA_RECENT');
 assert.equal(data.brokerOrdersEnabled,false);
 assert.equal(data.decisionImpact,false);
 assert.equal(data.descriptiveDiff.exitWithExactEntry,null);
 assert.equal(data.descriptiveDiff.interactionContrast,null);
 assert.ok(!('prevEval' in data));
 assert.ok(!('history' in data));
 assert.ok(Buffer.byteLength(JSON.stringify(data))<16000);
});
test('rejects untrusted versions, modes, broker permissions and missing lanes',()=>{
 for(const [key,value] of [['mode','FUNDED'],['version','future'],
  ['brokerOrdersEnabled',true],['decisionImpact',true]]){
  const s=fixture();s[key]=value;
  assert.throws(()=>view.build(s),/UNTRUSTED/);
 }
 const s=fixture();delete s.branches.EXACT_V493__FROZEN_V493;
 assert.throws(()=>view.build(s),/MISSING_BRANCH/);
});
test('only bounded trade summaries and influence events are exposed',()=>{
 const s=fixture();
 const a=s.branches.EXACT_V493__FROZEN_V493;
 const b=s.branches.EXACT_V493__CONTINUATION_SUPERVISOR;
 a.entries=3;a.completed=2;a.netRealizedUsd=5;a.feesUsd=2;
 b.entries=4;b.completed=2;b.netRealizedUsd=10;b.feesUsd=4;
 a.recentTrades=Array.from({length:35},(_,i)=>({
  entryAt:101+i,exitAt:201+i,entryPrice:80000,
  exitPrice:80200,netPnlUsd:2,reason:'<img src=x onerror=alert(1)>',
  _rawEvaluation:{mcb:{huge:'x'.repeat(5000)}}
 }));
 s.recentInfluence=Array.from({length:30},(_,i)=>({
  ts:222+i,type:'EXIT_ENABLED_REENTRY',
  entryPolicy:'EXACT_V493',newDirection:'short',
  priorExit:{reason:'CONFIRMED_TERRITORY_LOSS_WITH_PRICE_MF'}}));
 s.influenceCount=30;
 const data=view.build(s,s.lastObservationAt+1000);
 assert.equal(data.branches[0].recentTrades.length,5);
 assert.equal(data.branches[0].recentTrades[0].exitAt,235);
 assert.equal(data.recentInfluence.length,8);
 assert.equal(data.descriptiveDiff.exitWithExactEntry,5);
 assert.equal(data.descriptiveDiff.interactionContrast,null);
 assert.ok(!JSON.stringify(data).includes('huge'));
 assert.ok(JSON.stringify(data).length<20000);
});
test('render: A/B/C/D cards, no fake $0 PNL before any closed campaign',()=>{
 const {ctx,holder}=uiContext();
 const data=view.build(fixture(),live.lastObservationAt+1000);
 ctx.renderV494DualShadow(data);
 for(const label of ['BRANCHE A','BRANCHE B','BRANCHE C','BRANCHE D',
  'EN COLLECTE','CONTRASTES A / B / C / D','Entrée avec sortie supervisée (D − B)',
  'Influence des sorties sur les entrées',
  'Concordance de la branche A']){
  assert.ok(holder.innerHTML.includes(label),'missing '+label);
 }
 assert.ok(holder.innerHTML.includes('aucune autorité sur V494'));
 assert.ok(!holder.innerHTML.includes('+0.00 $ net réalisé'),
  'no misleading zero-dollar performance');
});
test('XSS strings escaped, recent trade and influence disclosures visible',()=>{
 const s=fixture();
 const a=s.branches.EXACT_V493__FROZEN_V493;
 a.completed=1;a.entries=1;a.netRealizedUsd=1.25;
 a.recentTrades=[{entryAt:100,exitAt:110,direction:'long',
  entryPrice:80000,exitPrice:80200,netPnlUsd:1.25,
  reason:'<img src=x onerror=alert(1)>',
  givebackPriceUsd:10,mfePriceUsd:210,maePriceUsd:30}];
 s.recentInfluence=[{ts:200,type:'EXIT_ENABLED_REENTRY',
  entryPolicy:'EXACT_V493',newDirection:'short',newEntryPrice:80000,
  priorExit:{reason:'<script>evil()</script>'},
  originalBlockedBy:{direction:'long'}}];
 const {ctx,holder}=uiContext();
 ctx.renderV494DualShadow(view.build(s,live.lastObservationAt+1000));
 assert.ok(holder.innerHTML.includes('1.25 $ net réalisé'));
 assert.ok(holder.innerHTML.includes('Dernières clôtures (1 affichées'));
 assert.ok(holder.innerHTML.includes('SORTIE → RÉENTRÉE'));
 assert.ok(holder.innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.ok(holder.innerHTML.includes('&lt;script&gt;evil()&lt;/script&gt;'));
 assert.ok(!holder.innerHTML.includes('<script>evil()'));
 assert.ok(!holder.innerHTML.includes('<img src=x onerror=alert(1)>'));
});
test('refresh preserves expanded branch trades and interaction detail',()=>{
 const {ctx,holder}=uiContext();
 holder.querySelectorAll=()=>[
  {open:true,getAttribute:()=> 'trades-A'},
  {open:true,getAttribute:()=> 'influence'}];
 ctx.renderV494DualShadow(view.build(fixture(),live.lastObservationAt+1000));
 assert.ok(holder.innerHTML.includes('data-v494-fold="trades-A" open'));
 assert.ok(holder.innerHTML.includes('data-v494-fold="influence" open'));
});
test('old shadows are independently loaded; API reads only a small JSON summary',()=>{
 assert.ok(server.includes("app.get('/api/shadows/v494-dual',requireAuth"));
 assert.ok(server.includes("v494DualUiSummary.build(raw,Date.now())"));
 assert.ok(server.includes("if(size>256*1024)"));
 assert.ok(server.includes("loadV494DualShadow();"));
 const js=fromAppJs();
 const a=js.indexOf('async function loadShadows(){');
 const b=js.indexOf("fetch('/api/shadows'",a);
 assert.ok(a>0&&b>a);
 assert.ok(js.slice(a,b).includes('loadV494DualShadow();'));
 assert.ok(js.includes("fetch('/api/shadows/v494-dual',{cache:'no-store'})"));
 assert.ok(!server.includes("v494-dual-module-shadow-state.json"));
});
test('stale and unavailable data are not labelled recent',()=>{
 const s=fixture();
 const x=view.build(s,s.lastObservationAt+121000);
 assert.equal(x.status,'SOURCE_STALE');
 const {ctx,holder}=uiContext();
 ctx.renderV494DualShadow(x);
 assert.ok(holder.innerHTML.includes('SOURCE ANCIENNE'));
 assert.ok(holder.innerHTML.includes('résumé ancien'));
});

test('render marks same exposure and distinguishes realized dashes from provisional zero',()=>{
 const s=fixture();
 for(const b of Object.values(s.branches)){
  b.entries=1;b.completed=0;b.netRealizedUsd=0;
  b.portfolioMarkedNetUsd=3.2145;
  b.markedValuationStatus='OPEN_WITH_ESTIMATED_EXIT_FEE';
  b.position={direction:'long',entryAt:1793389583511,entryPrice:76745.6,
    remainingNotionalUsd:1500,tp1Taken:false,mfePriceUsd:250,maePriceUsd:40,
    unrealizedNetUsd:3.2,
    markedValuation:{positionNetIfClosedUsd:3.2145,
      estimatedRemainingExitFeeUsd:.752,priceUsd:76985}};
 }
 const data=view.build(s,s.lastObservationAt+1000);
 assert.equal(data.descriptiveDiff.exitWithExactEntry,null);
 assert.equal(data.markedDiff.exitWithExactEntry,0);
 assert.equal(data.comparisonReadiness.status,'SAME_EXPOSURE_NO_CONTRAST_YET');
 const {ctx,holder}=uiContext();ctx.renderV494DualShadow(data);
 for(const label of ['RÉALISÉ · CAMPAGNES CLÔTURÉES',
   'PROVISOIRE · PORTEFEUILLE MARQUÉ NET APRÈS FRAIS',
   'Mêmes positions et mêmes entrées','net estimé si sortie',
   'Portefeuille marqué net','clôtures encore insuffisantes']){
   assert.ok(holder.innerHTML.includes(label),'missing '+label);
 }
 assert.ok(holder.innerHTML.includes('0.00')||
   holder.innerHTML.includes('+0.00'));
 assert.ok(!holder.innerHTML.includes('3.21 $ net réalisé'));
});
test('render shows pending realized contrasts but nonzero provisional difference after exit',()=>{
 const s=fixture();
 const a=s.branches.EXACT_V493__FROZEN_V493,
  b=s.branches.EXACT_V493__CONTINUATION_SUPERVISOR;
 a.entries=1;b.entries=1;
 a.portfolioMarkedNetUsd=5;
 b.portfolioMarkedNetUsd=3.15;b.completed=1;b.netRealizedUsd=3.15;
 a.position={direction:'long',entryAt:1793389583511,entryPrice:76745.6,
  remainingNotionalUsd:1500,tp1Taken:false,mfePriceUsd:500,maePriceUsd:10,
  markedValuation:{positionNetIfClosedUsd:5,priceUsd:76985}};
 s.influenceCount=1;
 const result=view.build(s,s.lastObservationAt+1000);
 assert.equal(result.descriptiveDiff.exitWithExactEntry,null);
 assert.equal(result.markedDiff.exitWithExactEntry,-1.85);
 assert.equal(result.comparisonReadiness.status,'EXPOSURE_DIVERGED');
 const {ctx,holder}=uiContext();ctx.renderV494DualShadow(result);
 assert.ok(holder.innerHTML.includes('Expositions divergentes détectées'));
 assert.ok(holder.innerHTML.includes('-1.85'));
 assert.ok(holder.innerHTML.includes('PROVISOIRE'));
});
