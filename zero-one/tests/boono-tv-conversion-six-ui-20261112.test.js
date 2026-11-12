'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const script=fs.readFileSync(path.resolve(__dirname,'../boono-tv/scene/tv-living-state.js'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../boono-tv/scene/tv-living-state.css'),'utf8');
function render(){
 const w={};
 vm.runInNewContext(script,{window:w,document:{querySelector:()=>null},
   Intl,Date,Math,Number,String});
 return w.BoonoTVLivingState.renderHtml;
}
function sample(){
 const causal={
  pmLiveUsd:-52.2,
  conversion:{
   asOf:1794493391221,pm3:-154.5,pm5:167.4,pmLive:-52.2,
   quality:'CONTESTED',
   marketQualitySix:{
    status:'EXPLORATORY',mode:'SHADOW_ONLY',decisionImpact:false,
    brokerOrdersEnabled:false,productivity:'PRODUCTIF',
    label:'MÉDIAN PRODUCTIF',medianFlowBtcPerSecond:.35,
    efficiency:.19,retention:.74}
  }
 };
 return {status:'DATA_RECENT',trajectory:{strategicState:'ASCENT_ACTIVE',director:'long'},
  tactical:{phase:'AWAIT_TACTICAL_ALIGNMENT'},place:{candidate:'long'},
  structure:{phase:'AWAIT_TACTICAL_ALIGNMENT',campaignId:'long|E15:test'},
  causal,offensive:{},position:null};
}
test('CONVERSION after six causal events and before the structural phase, split in two compact lines',()=>{
 const html=render()(sample());
 const a=html.indexOf('CHAÎNE CAUSALE');
 const b=html.indexOf('tv-conversion-line',a);
 const c=html.indexOf('PHASE STRUCTURELLE',b);
 assert.ok(a>=0&&b>a&&c>b,'causal → conversion → phase order');
 const conversion=html.slice(b,c);
 const metrics=conversion.indexOf('tv-conversion-metrics');
 const qualities=conversion.indexOf('tv-conversion-qualities');
 assert.ok(metrics>=0&&qualities>metrics,'two compact lines');
 for(const x of ['PM3','PM5','PMLive','CONTESTED','MÉDIAN PRODUCTIF','SHADOW']){
  assert.ok(conversion.includes(x),x);
 }
 assert.match(conversion,/class="tv-market-grade tv-up">MÉDIAN PRODUCTIF/);
 assert.match(conversion,/class="tv-quality-flag">CONTESTED/);
 assert.match(conversion,/SHADOW/);
 assert.match(conversion,/débit médian 0,3500 BTC\/s/);
});
test('Six classes remain separate from a PM sign clash and color productivity correctly',()=>{
 const app=sample();
 app.causal.conversion.marketQualitySix.label='FORT IMPRODUCTIF';
 app.causal.conversion.marketQualitySix.productivity='IMPRODUCTIF';
 let html=render()(app);
 assert.match(html,/class="tv-market-grade tv-down">FORT IMPRODUCTIF/);
 assert.match(html,/CONTESTED/);
 app.causal.conversion.quality='UNCLASSIFIED';
 html=render()(app);
 assert.match(html,/UNCLASSIFIED/);
 assert.match(html,/FORT IMPRODUCTIF/);
});
test('Missing or untrusted six-class source is neutral, never a fabricated grade',()=>{
 const app=sample();
 app.causal.conversion.marketQualitySix={status:'UNAVAILABLE',label:null,mode:'SHADOW_ONLY'};
 let html=render()(app);
 assert.match(html,/class="tv-market-grade tv-neutral">—/);
 assert.doesNotMatch(html,/MÉDIAN PRODUCTIF/);
 app.causal.conversion.marketQualitySix={status:'EXPLORATORY',label:'FAIBLE PRODUCTIF',
   decisionImpact:true,brokerOrdersEnabled:false,mode:'SHADOW_ONLY'};
 html=render()(app);
 assert.doesNotMatch(html,/FAIBLE PRODUCTIF/);
});
test('Stale PAPER source hides conversion figures and market grade',()=>{
 const app=sample();
 app.status='SOURCE_STALE';
 const html=render()(app);
 assert.match(html,/Source V5\.4\.3 périmée/);
 assert.doesNotMatch(html,/CONVERSION :|MÉDIAN PRODUCTIF|CONTESTED/);
});
test('Conversion styling preserves historic per-event colors and fixed five 20% tracks',()=>{
 assert.match(css,/#statePanel \.tv-five \.tv-causal \.tv-conversion-line\{/);
 assert.match(css,/\.tv-conversion-metrics,[\s\S]*?\.tv-conversion-qualities\{\s*display:block/);
 assert.match(css,/tv-market-grade\.tv-up\{\s*color:#39f3a4/);
 assert.match(css,/tv-market-grade\.tv-down\{\s*color:#ff6178/);
 assert.match(css,/tv-event-label\.tv-up\{\s*color:#39f3a4/);
 assert.match(css,/grid-template-rows:repeat\(5,20%\);gap:0/);
});
