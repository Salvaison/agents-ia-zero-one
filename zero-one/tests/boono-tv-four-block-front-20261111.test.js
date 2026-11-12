'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const FRONT=path.resolve(__dirname,'../boono-tv/scene/tv-living-state.js');
const CSS=path.resolve(__dirname,'../boono-tv/scene/tv-living-state.css');
function browser(){
 const fake={innerHTML:'',dataset:{},classList:{add(){this.added=true}},setAttribute(k,v){this[k]=v}};
 const w={},ctx={window:w,document:{querySelector:q=>q==='#stateRows'?fake:null},
   Intl,Date,Number,Math,String};
 vm.runInNewContext(fs.readFileSync(FRONT,'utf8'),ctx);
 return {front:w.BoonoTVLivingState,fake};
}
function stub(){
 const z={status:'DATA_RECENT',
  trajectory:{strategicState:'DESCENT_ACTIVE',director:'short',offensive:'short',
    bw:{confirmed:54.7,live:46.2},lbw:{confirmed:47.5,live:33.2},
    mf:{confirmed:-0.2,live:-4.5},flowBtcPerSec:4.2,mf15Slope:-5.37,mf15Live:-4.49,
    cross:{direction:'short',observedAt:1794347121000,ageMinutes:51,
      oscillatorAtEvent:{bw:61.6,lbw:59.6},deltaSinceEvent:-183.3}},
  tactical:{phase:'AWAIT_TACTICAL_ALIGNMENT',alignment:'UNRESOLVED',
    bw:{confirmed:-52.2,live:-56.2},lbw:{confirmed:-57.7,live:-55.8},
    mf:{confirmed:6.6,live:9},ma3:{state:'ACCEPTED',distanceUsd:-56.5,
      retests:0,confirmedContactBars:null},
    cross:{direction:'long',observedAt:1794350181000,ageMinutes:0,
      oscillatorAtEvent:{bw:-56.3,lbw:-56},deltaSinceEvent:24.8}},
  place:{candidate:'short',extended:true,rangeZone:'RANGE_LOW',
    h4:{status:'CONFIRMED',bw:{previous:-52.4,confirmed:-62.8},
      lbw:{previous:-64.7,confirmed:-73.9},sourceAt:1794326400000,
      availableAt:1794340800000,event:{direction:'short',sourceAt:1794283200000,
        availableAt:1794297600000,lbw:-42.8}}},
  causal:{pmLiveUsd:19.2,cross3:{observedAt:1794350181000},
    e3Live:{observedAt:1794350181000},e3Confirmed:{observedAt:1794349311000},
    cross15:{observedAt:1794347121000},e15Live:{observedAt:1794347121000},
    e15Confirmed:{observedAt:1794348051000}},
  structure:{phase:'AWAIT_TACTICAL_ALIGNMENT',campaignId:'short|E15:1794346200000',
    priceRangeRank:.7,mf15History2h:7.2,matureAfterExtension:false},
  position:{direction:'short',entryPrice:73625.1,entryAt:1794349834000,
    potentialNetPnlUsd:-2.5,mfePriceUsd:25.7,maePriceUsd:47.8,
    gainFloorUsd:0,floorAdvisory:true,invalidationPrice:73701.3},
  offensive:{classification:'NO_MULTI_FAMILY_MATURITY_CONFLICT',
    priceOrigin4hAt:1794346560000,progress4hUsd:351.9,atPrice2hEdge:false,
    oppositeDivergenceForming:false,conversionFatigue:false}};
 return z;
}
test('TV follows user PDF: exact four ordered sections, all evidence and PAPER risk',()=>{
 const {front}=browser(),text=front.renderHtml(stub());
 assert.equal((text.match(/class="tv-state-block/g)||[]).length,4);
 for(const x of ['Trajectoire','Tactique','Lieu','CHAÎNE CAUSALE','MCB15','Cross15',
   'MF15','MCB3','Cross3','MA3','BW4','E4 confirmé','PHASE STRUCTURELLE',
   'POSITION','MFE','MAE','invalidation','MATURITÉ OFFENSIVE']){
  assert.ok(text.includes(x),x);
 }
 const offsets=['Trajectoire','Tactique','Lieu','CHAÎNE CAUSALE'].map(x=>text.indexOf(x));
 assert.ok(offsets.every((x,i)=>x>=0&&(i===0||x>offsets[i-1])));
 assert.match(text,/73.?701,3/);
 assert.match(text,/floor indicatif non-exécutoire/);
 assert.doesNotMatch(text,/THÈSE \/ MCB|STRUCTURE \/ POSITION|CONVERSION \/ COMBAT/);
});
test('Stale source is not displayed as a live trajectory or position',()=>{
 const {front}=browser();
 const text=front.renderHtml({...stub(),status:'SOURCE_STALE'});
 assert.match(text,/Source V5\.4\.3 périmée/);
 assert.doesNotMatch(text,/POSITION SHORT|DESCENT_ACTIVE/);
});
test('HTML data is escaped; flat state does not invent position MFE',()=>{
 const {front}=browser(),bad=stub();
 bad.structure.campaignId='<img src=x onerror=alert(1)>';
 bad.position=null;
 const html=front.renderHtml(bad);
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
 assert.match(html,/POSITION<\/b> FLAT/);
 assert.doesNotMatch(html,/MFE 25/);
});
test('Current CSS is scoped to the left state stage and hides other stage variants',()=>{
 const css=fs.readFileSync(CSS,'utf8');
 assert.match(css,/#statePanel \.state-rows\.tv-four/);
 assert.match(css,/#statePanel\.charts-active \.state-rows\.tv-four/);
 assert.match(css,/#statePanel\.trades-active \.state-rows\.tv-four/);
 assert.match(css,/#statePanel\.dialogue-editing \.state-rows\.tv-four/);
 assert.doesNotMatch(css,/#boonoV2Cat|#deskScreenLeft|#pricePanelCanvas/);
 const patch=fs.readFileSync(path.resolve(__dirname,'../knowledge/BOONO_TV_EV4_OVH_runtime_patch_2026-11-11.patch'),'utf8');
 assert.match(patch,/window\.BoonoTVLivingState\?\.render/);
 assert.match(patch,/tv-living-state\.js\?v=OD20261111-001/);
});

test('Typographie BOONO-TV : sigles bleus, précédent gris, actuelle rouge/verte selon variation, direction UP/DN',()=>{
 const {front}=browser(),html=front.renderHtml(stub());
 const cases=[
  ['BW15 en recul', /<span class="tv-indicator">BW<\/span>\s*<span class="tv-prior">\+54,7<\/span>[\s\S]*?<b class="tv-current tv-down">\+46,2<\/b>/],
  ['LBW15 en recul', /<span class="tv-indicator">LBW<\/span>\s*<span class="tv-prior">\+47,5<\/span>[\s\S]*?<b class="tv-current tv-down">\+33,2<\/b>/],
  ['LBW3 se redresse', /<span class="tv-indicator">LBW<\/span>\s*<span class="tv-prior">-57,7<\/span>[\s\S]*?<b class="tv-current tv-up">-55,8<\/b>/],
  ['MF3 en hausse', /<span class="tv-indicator">MF3<\/span>\s*<span class="tv-prior">\+6,6<\/span>[\s\S]*?<b class="tv-current tv-up">\+9,0<\/b>/],
  ['Cross15 DN en rouge', /<span class="tv-indicator">Cross15<\/span>\s*<b class="tv-direction tv-down">DN<\/b>/],
  ['Cross3 UP en vert', /<span class="tv-indicator">Cross3<\/span>\s*<b class="tv-direction tv-up">UP<\/b>/],
  ['E4 confirmé coloration', /<span class="tv-indicator">E4 confirmé<\/span>\s*<b class="tv-direction tv-down">DN<\/b>/],
  ['PM Live positif en vert', /<span class="tv-indicator">PM Live<\/span>\s*<b class="tv-result tv-up">\+19,2<\/b>/],
  ['P&L net négatif en rouge', /P&L net potentiel\s*<b class="tv-result tv-down">-2,5<\/b>/],
 ];
 for(const [label,expr] of cases)assert.match(html,expr,label);
 assert.ok((html.match(/class="tv-indicator"/g)||[]).length>=15);
 assert.ok((html.match(/class="tv-prior"/g)||[]).length>=7);
 assert.ok((html.match(/class="tv-current tv-(?:up|down|neutral|muted)"/g)||[]).length>=7);
});
test('Contraste, titres agrandis et géométrie complète : seules les quatre rubriques État vivant sont touchées',()=>{
 const css=fs.readFileSync(CSS,'utf8');
 assert.match(css,/font-weight:900;font-size:23px/);
 assert.match(css,/#statePanel \.tv-indicator\{\s*color:#4ed8ff/);
 assert.match(css,/\.tv-current\.tv-up[\s\S]*?color:#39f3a4/);
 assert.match(css,/\.tv-current\.tv-down[\s\S]*?color:#ff6276/);
 assert.match(css,/grid-template-rows:\.85fr \.91fr \.65fr 2\.15fr/);
 assert.doesNotMatch(css,/#boonoV2Cat|#deskScreenLeft|#pricePanelCanvas|#room\.boono-v2/);
});
