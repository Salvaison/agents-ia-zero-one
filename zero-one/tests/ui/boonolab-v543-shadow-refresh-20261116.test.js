'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const watch=fs.readFileSync(path.join(root,'modules/config-server.js'),'utf8');
const tv=fs.readFileSync(path.join(root,'boono-tv/scene/chart-views.js'),'utf8');
test('30-second Watch update does not remount the opened structural observatory',()=>{
 const marker="if(!stateEl.querySelector('#v52-live')||!stateEl.querySelector('#v5-structure-details'))";
 assert.ok(watch.includes(marker));
 assert.ok(watch.includes('const preservePageY=window.scrollY;'));
 assert.ok(watch.includes('const previousOccScroll=root.querySelector'));
 assert.ok(watch.includes('window.scrollTo(0,preservePageY)'));
 assert.ok(watch.includes('shadowV543S1Details'));
 assert.ok(watch.includes('shadowPlaceE1E4Details'));
});
test('separate V543 S1 and E1/E4 shadow APIs are authenticated and non-authoritative',()=>{
 for(const endpoint of ['/api/shadows/boonolab-e1e4-place','/api/shadows/boonolab-lbw15-s1'])
  assert.ok(watch.includes("app.get('"+endpoint+"',requireAuth"));
 assert.ok(watch.includes("state.decisionImpact!==false"));
 assert.ok(watch.includes("state.brokerOrdersEnabled!==false"));
});
test('BOONO TV source excludes retired V494 from trading outcomes and plotted markers',()=>{
 assert.ok(tv.includes("x?.paper===true&&x.engine==='V543'"));
 assert.ok(tv.includes("summary.innerHTML=['V543']"));
 assert.ok(tv.includes("e=>e.engine==='V543'&&Number.isFinite(Number(e.entryTs))"));
 assert.ok(!tv.includes("['V494','V543']"));
 assert.ok(!tv.includes('V494 at the upper edge'));
});
