'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(require.resolve('../../modules/config-server.js'),'utf8');
const start=src.indexOf('let v5PanelLoading=false;');
const end=src.indexOf('// Structural V5 is the *current* analysis;',start);
assert.ok(start>0&&end>start);
const body=src.slice(start,end);
const ref=Date.parse('2026-10-23T07:56:04.111Z');
function payload(status){
 return {paperStatus:status,lastPaperAt:ref,updatedAt:ref,
  market:{pmLive:-1.6,quality:'INEFFICIENT'},
  confirmedE15:'short',liveE15:null,
  memory:{segments:18,unresolvedLinks:17,qualityCoverage:.45,buckets:[]},
  opportunity:{sourceAt:ref,direction:'short',phase:'TRANSLATION_CONTESTED',
   hypothesis:'Aucune admission disponible',evidence:[
     'MCB15 confirmé SHORT observé 07:15',
     'E3 CONFIRMED SHORT observé 07:45',
     'PM Live -1.6$ : conversion immédiate cohérente'
   ],contradictions:['PM3/PM5 non synchronisés']},
  paper:{completed:22,wins:4,losses:18,realizedUsd:-71.74,equityUsd:928.26,
    position:{direction:'short',entryPrice:81745,lastPrice:81575.3,lastNetPnlUsd:1.614,mfePriceUsd:181.2,maePriceUsd:63.7},
    latestTrades:[]}
 };
}
async function render(status){
 const el={innerHTML:'',textContent:''};
 const ctx={document:{getElementById:id=>id==='v5-paper-live'?el:id==='v5-paper-archive'?{open:true}:null,hidden:false},
  fetch:async()=>({ok:true,json:async()=>payload(status)}),escTrade:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'),Date,Number,Math,Object,String,Array,isFinite};
 vm.createContext(ctx);vm.runInContext(body,ctx);
 await vm.runInContext('loadV5PaperPanel()',ctx);
 return el.innerHTML;
}
test('V5 halted paper shows frozen archive, not live opinions, and maps UTC evidence to Stockholm correctly',async()=>{
 const html=await render('FROZEN_ARCHIVE');
 assert.ok(html.includes('ARCHIVE GELÉE'));
 assert.ok(html.includes('MOTEUR V5 ARRÊTÉ'));
 assert.ok(html.includes('preuves sont HISTORIQUES'));
 assert.ok(html.includes('ANCIENNE HYPOTHÈSE SHORT'));
 assert.ok(html.includes('observé 09:15 (Stockholm ; 07:15 UTC)'));
 assert.ok(html.includes('observé 09:45 (Stockholm ; 07:45 UTC)'));
 assert.ok(html.includes('POSITION PAPER FIGÉE'));
 assert.ok(html.includes('PM historique'));
 assert.ok(!html.includes('BOONO V5 · HYPOTHÈSES + PAPER TRADES'));
});
test('Live V5 UI does not misleadingly label current hypotheses as frozen',async()=>{
 const html=await render('PAPER_RECENT');
 assert.ok(html.includes('HYPOTHÈSES + PAPER TRADES'));
 assert.ok(!html.includes('ARCHIVE GELÉE'));
 assert.ok(!html.includes('POSITION PAPER FIGÉE'));
});
test('route returns explicit freeze status based on observation age',()=>{
 assert.ok(src.includes("?'PAPER_RECENT':'FROZEN_ARCHIVE'"));
 assert.ok(src.includes('lastPaperAt,'));
 assert.ok(src.includes('sendUiJson(req,res,payload)'));
});
