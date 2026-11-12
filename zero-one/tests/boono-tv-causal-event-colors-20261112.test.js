'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const SRC=fs.readFileSync(path.resolve(__dirname,'../boono-tv/scene/tv-living-state.js'),'utf8');
const CSS=fs.readFileSync(path.resolve(__dirname,'../boono-tv/scene/tv-living-state.css'),'utf8');
const keys=[['Cross3','cross3'],['E3 Live','e3Live'],['E3 confirmé','e3Confirmed'],
 ['Cross15','cross15'],['E15 Live','e15Live'],['E15 confirmé','e15Confirmed']];
function createRenderer(){
 const w={};
 const ctx={window:w,document:{querySelector:()=>null},Date,Math,Number,String,Intl};
 vm.runInNewContext(SRC,ctx);
 return w.BoonoTVLivingState.renderHtml;
}
function paper(){
 const causal={pmLiveUsd:10};
 const at=1794488243917;
 for(const [label,key] of keys){causal[key]={observedAt:at,direction:'long'};}
 return {status:'DATA_RECENT',trajectory:{strategicState:'ASCENT_ACTIVE',
    director:'long',offensive:'short'},
    tactical:{phase:'AWAIT_TACTICAL_ALIGNMENT',alignment:'UNRESOLVED'},
    place:{candidate:'long',recordedRanges:{}},causal,
    structure:{phase:'AWAIT_TACTICAL_ALIGNMENT'},position:null,offensive:{}};
}
test('Each of six causal labels has its own event direction, even if adjacent events disagree',()=>{
 const render=createRenderer(),s=paper();
 for(let i=0;i<keys.length;i++)s.causal[keys[i][1]].direction=i%2===0?'short':'long';
 const html=render(s);
 for(let i=0;i<keys.length;i++){
  const [name]=keys[i];
  const tone=i%2===0?'down':'up';
  assert.ok(html.includes('<b class="tv-event-label tv-'+tone+'">'+name+'</b>'),
   name+' must use its own polarity');
 }
 assert.equal((html.match(/class="tv-event-label tv-/g)||[]).length,6);
 assert.equal((html.match(/tv-event-label tv-up/g)||[]).length,3);
 assert.equal((html.match(/tv-event-label tv-down/g)||[]).length,3);
});
test('Signal direction accepts UP/DN aliases; missing or unknown evidence stays neutral',()=>{
 const render=createRenderer(),s=paper();
 s.causal.cross3.direction='UP';
 s.causal.e3Live.direction='DN';
 s.causal.e3Confirmed.direction=null;
 s.causal.cross15.direction='unknown';
 s.causal.e15Live.observedAt=null;
 const html=render(s);
 assert.match(html,/<b class="tv-event-label tv-up">Cross3<\/b>/);
 assert.match(html,/<b class="tv-event-label tv-down">E3 Live<\/b>/);
 assert.match(html,/<b class="tv-event-label tv-neutral">E3 confirmé<\/b>/);
 assert.match(html,/<b class="tv-event-label tv-neutral">Cross15<\/b>/);
 assert.match(html,/<b class="tv-event-label tv-neutral">E15 Live<\/b>/);
});
test('Specific CSS overrides legacy white causal event rule without changing non-causal indicators',()=>{
 assert.match(CSS,/#statePanel \.tv-five \.tv-causal \.tv-event b\.tv-event-label\.tv-up\{\s*color:#39f3a4/);
 assert.match(CSS,/#statePanel \.tv-five \.tv-causal \.tv-event b\.tv-event-label\.tv-down\{\s*color:#ff6178/);
 assert.match(CSS,/#statePanel \.tv-five \.tv-causal \.tv-event b\.tv-event-label\.tv-neutral\{\s*color:#e4eff2/);
 assert.match(CSS,/#statePanel \.tv-five \.tv-indicator\{color:#f8fcff/);
 assert.match(CSS,/grid-template-rows:repeat\(5,20%\);gap:0/);
});
test('A stale data source must never show a previous event as live',()=>{
 const render=createRenderer(),s=paper();
 s.status='SOURCE_STALE';
 const html=render(s);
 assert.match(html,/Source V5\.4\.3 périmée/);
 assert.doesNotMatch(html,/class="tv-event-label"/);
 assert.doesNotMatch(html,/E3 confirmé/);
});
