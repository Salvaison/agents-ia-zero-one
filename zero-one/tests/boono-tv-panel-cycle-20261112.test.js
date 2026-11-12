'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROTATION_SOURCE=fs.readFileSync(path.resolve(__dirname,'../boono-tv/scene/chart-views.js'),'utf8');
const STATE_CSS=fs.readFileSync(path.resolve(__dirname,'../boono-tv/scene/tv-living-state.css'),'utf8');

function simulate(query=''){
 const clock={elapsed:0,timers:new Map(),lastId:0,intervals:[]};
 const element=()=>({
  dataset:{},classList:{names:new Set(),toggle(key,active){
   if(active)this.names.add(key);else this.names.delete(key);
  }},setAttribute(key,value){this[key]=value}
 });
 const nodes={
  '#statePanel':element(),
  '#leftChartTrio':element(),
  '#completedTradesPanel':element()
 };
 const context={
  window:{},document:{querySelector:selector=>nodes[selector]||null},
  location:{search:query},URLSearchParams,Date,Math,Number,String,Array,Object,Error,
  setTimeout(fn,ms){const id=++clock.lastId;clock.timers.set(id,{fn,ms});return id},
  clearTimeout(id){clock.timers.delete(id)},
  setInterval(fn,ms){clock.intervals.push({fn,ms});return ++clock.lastId},
  fetch:async()=>({ok:false})
 };
 vm.runInNewContext(ROTATION_SOURCE,context);
 const oneTimer=()=>{assert.ok(clock.timers.size<=1);return [...clock.timers.values()][0]?.ms??null};
 const advance=()=>{
  assert.equal(clock.timers.size,1);
  const [id,t]=clock.timers.entries().next().value;
  clock.timers.delete(id);clock.elapsed+=t.ms;t.fn();
 };
 return {clock,nodes,view:()=>context.window.BoonoTVCharts.view,
  duration:()=>JSON.parse(JSON.stringify(context.window.BoonoTVCharts.cycleDurationsMs)),
  oneTimer,advance,setView:context.window.BoonoTVCharts.setView};
}

test('Panneaux BOONO-TV 25s état / 15s graphiques / 5s trades : 45s total',()=>{
 const v=simulate();
 assert.deepEqual(v.duration(),{state:25000,charts:15000,trades:5000});
 assert.equal(v.view(),'state');assert.equal(v.oneTimer(),25000);
 v.advance();assert.equal(v.view(),'charts');assert.equal(v.oneTimer(),15000);
 assert.equal(v.nodes['#leftChartTrio']['aria-hidden'],'false');
 v.advance();assert.equal(v.view(),'trades');assert.equal(v.oneTimer(),5000);
 assert.equal(v.nodes['#completedTradesPanel']['aria-hidden'],'false');
 v.advance();assert.equal(v.view(),'state');assert.equal(v.oneTimer(),25000);
 assert.equal(v.clock.elapsed,45000);
 assert.equal(v.clock.timers.size,1);
});
test('Une action manuelle réinitialise la durée de la vue active sans minuterie en double',()=>{
 const v=simulate();
 v.setView('trades');
 assert.equal(v.view(),'trades');
 assert.equal(v.oneTimer(),5000);
 assert.equal(v.clock.timers.size,1);
 v.advance();assert.equal(v.view(),'state');
 assert.equal(v.oneTimer(),25000);
});
test('Le mode ?panel et le mode dialogue restent figés comme avant',()=>{
 const preview=simulate('?panel=charts');
 assert.equal(preview.view(),'charts');
 assert.equal(preview.oneTimer(),null);
 const editing=simulate('?dialogueEdit=1');
 assert.equal(editing.view(),'state');
 assert.equal(editing.oneTimer(),null);
 const storyboard=simulate('?storyboardEdit=1');
 assert.equal(storyboard.view(),'state');
 assert.equal(storyboard.oneTimer(),null);
});
test('Cinq portions rigides exactement égales : chacune 20% du stage de 900px',()=>{
 assert.match(STATE_CSS,/#statePanel \.state-rows\.tv-five\{\s*display:grid/);
 assert.match(STATE_CSS,/grid-template-rows:repeat\(5,20%\);gap:0/);
 assert.match(STATE_CSS,/box-sizing:border-box;height:900px/);
 assert.match(STATE_CSS,/#statePanel \.tv-five \.tv-state-block\{\s*box-sizing:border-box;min-height:0;height:100%/);
 assert.match(STATE_CSS,/overflow-x:hidden;overflow-y:auto;scrollbar-width:none/);
 assert.match(STATE_CSS,/#statePanel \.tv-five \.tv-block-title\{/);
 assert.match(STATE_CSS,/#statePanel \.tv-five \.tv-indicator\{color:#f8fcff/);
});
test('Cycle indépendant des rafraîchissements du prix, des sprites et du projecteur',()=>{
 const s=ROTATION_SOURCE;
 assert.doesNotMatch(s,/ROTATION_MS=12000/);
 assert.match(s,/setTimeout\(\(\)=>\{/);
 assert.doesNotMatch(s,/setInterval\(\(\)=>setView/);
 assert.match(s,/setInterval\(refreshMarkers,60000\)/);
 assert.ok(!s.includes('/api/orders')&&!s.includes('/api/execute'));
});
