'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync(require.resolve('../../modules/config-server.js'),'utf8');
function extract(a,b){const i=s.indexOf(a),j=s.indexOf(b,i+2);assert(i>0&&j>i);return s.slice(i,j);}
const renderer=extract('function renderV5StructuralLive(a){','async function loadV5StructureLive(){');
const fixed=Date.parse('2026-10-23T11:54:00Z');
function mockStory(){
 return {ts:fixed,price:81686.4,phase:'PULLBACK_CONTESTING_UPTREND',
  structure:{direction:'long',context1h:'short',context4h:'short',childDirection:'long'},
  enjeu:{valueArea:'LOWER_VALUE',profileFrontier:{key:'VAL',price:81238}},
  boundary:{stage:'CROSSED_UNTESTED'},
  horizon:{priceNet1h:-13.6,mf15Delta1h:1.8},
  conversion:{pmLive:10.5,quality:null},
  attempts:{e15Up3h:1,e3Up90m:2},
  integrity:{dataIntegrity:'ASOF_OK',elasticEventStatus:'STALE_ELASTIC_EVENTS'},
  scenarios:[{kind:'DEFEND_VALUE_REINTEGRATION',required:'conserver VAL 81238'},
    {kind:'REJECT_OR_LOSE_VALUE',required:'perdre VAL 81238'}],
  evidence:['Trajectoire E15→E15 confirmée LONG depuis pivot CREUX'],
  contradictions:['Prix 1h opposé'],
  recentChanges:[{ts:fixed-1800000,price:81750,phase:'STRUCTURE_OBSERVED',materialEvents:1},
    {ts:fixed-60000,price:81640,phase:'PULLBACK_CONTESTING_UPTREND',materialEvents:2}]
 };
}
test('live V5 structure renders current market separately from frozen paper archive',()=>{
 const el={innerHTML:''};
 const ctx={document:{getElementById:(id)=>id==='v5-structure-live'?el:null},
  Date,Number,String,Math,Object,v5Time:()=>"13:54:00",NumberFormat:undefined,
  escTrade:x=>String(x).replace(/</g,'&lt;').replace(/&/g,'&amp;')};
 vm.createContext(ctx);vm.runInContext(renderer,ctx);
 vm.runInContext('renderV5StructuralLive(input)',Object.assign(ctx,{input:mockStory()}));
 const html=el.innerHTML;
 for(const word of ['LECTURE VIVANTE','BTC 81686.4 $','Stockholm',
    'VAGUES','E15','ÉVOLUTION OBSERVÉE','SCÉNARIOS CONDITIONNELS',
    'Trajectoire E15','Prix 1h opposé','VAL','OBSERVATION SEULE'])assert.ok(html.includes(word),word);
 assert.ok(html.includes('Elastic non récents'),'stale subsource clearly distinguished');
 assert.ok(!html.includes('POSITION PAPER FIGÉE'));
 assert.ok(!html.includes('HYPOTHÈSE SHORT observé'));
});
test('V5.2 PAPER is primary, shared Elastic is visible and older observers are collapsed',()=>{
 const first=s.indexOf('<div id="v52-live" class="v5-observer v52-main">');
 const archive=s.indexOf('<details id="v5-paper-archive"');
 const baseline=s.indexOf('<details id="v493-details"');
 const structure=s.indexOf('<details id="v5-structure-details"');
 assert.ok(first>0&&baseline>first&&structure>baseline&&archive>structure);
 assert.ok(s.includes('renderElasticObserverV05(current)'));
 assert.ok(s.includes('setInterval(loadV52PaperPanel,10000)'));
 assert.ok(s.includes('setInterval(loadV5StructureLive,30000)'));
 assert.ok(s.includes("fetch('/api/v52'"));
 assert.ok(s.includes("fetch('/api/v493'"));
 assert.ok(s.includes("fetch('/api/v5-structure'"));
 assert.ok(s.includes('if(archiveWasOpen)loadV5PaperPanel()'));
 assert.ok(s.includes('recentChanges:(state.summaries||[]).slice(-7)'));
});
test('a stale structural model warns and never passes through as trading permission',()=>{
 const ctx={document:{getElementById:()=>({innerHTML:''})},
   Date,Number,String,Math,Object,v5Time:()=>"13:54:00",escTrade:String};
 const box={innerHTML:''};ctx.document.getElementById=()=>box;
 vm.createContext(ctx);vm.runInContext(renderer,ctx);
 const story=mockStory();
 story.integrity.dataIntegrity='STALE_CONFIRMED_MCB';
 vm.runInContext('renderV5StructuralLive(input)',Object.assign(ctx,{input:story}));
 assert.ok(box.innerHTML.includes('SOURCE STRUCTURELLE PÉRIMÉE'));
 assert.ok(box.innerHTML.includes('AUCUN TRADE'));
});
