'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const MODULE=require('../boono-tv/tv-conversion-ticker');
const vol=require('../modules/attention/v494-elastic-volume-1m');
const DATA=path.resolve(__dirname,'../data');
function source(){return JSON.parse(fs.readFileSync(path.join(DATA,'v494-elastic-shadow-summary.json'),'utf8'))}
test('Only trusted read-only V494 Elastic 4x15 source, four ordered historical quarters',async()=>{
 const raw=source(),now=Number(raw.asOf)+25000;
 const starts=raw.fourByFifteen.slice(-4).map(w=>w.startAt);
 const requested=[];
 const provider={async get(windows,asOf){requested.push({windows,asOf});return {
  source:vol.SOURCE,status:'OK',decisionImpact:false,brokerOrdersEnabled:false,
  updatedAt:now,windows:windows.map(w=>({startAt:w.startAt,sourceStatus:'OK',
   meanBtcPerMinute:58.7,meanGraphVolumePct:70,observedMinutes:15,expectedMinutes:15}))
 }}};
 const r=MODULE.createReader({clock:()=>now,volumeProvider:provider});
 let first=r.view();
 assert.equal(first.mode,'SHADOW_ONLY');assert.equal(first.brokerOrdersEnabled,false);
 assert.equal(first.decisionImpact,false);assert.equal(first.source,MODULE.SOURCE);
 assert.equal(first.status,'DATA_RECENT');
 assert.deepEqual(first.windows.map(w=>w.startAt),starts);
 assert.ok(first.windows.every(w=>w.qualityFractions&&w.directionFractions&&w.marketFractions));
 assert.equal(first.volume4x15,null);
 assert.equal(await r.refresh(true),true);
 assert.equal(requested.length,1);
 assert.equal(requested[0].asOf,raw.asOf);
 const after=r.view();
 assert.equal(after.volume4x15.status,'OK');
 assert.equal(after.volume4x15.windows.length,4);
 assert.equal(after.volume4x15.windows[0].meanGraphVolumePct,70);
 assert.equal(after.volume4x15.asOf,raw.asOf);
 assert.equal(await r.refresh(false),true);
 assert.equal(requested.length,1,'1-minute volume must be cached for 60s');
});
test('Volume provenance must be verified; future-asof volume cannot be carried as past',async()=>{
 const raw=source(),at=Number(raw.asOf),now=at+18000;
 const bad={async get(ws,asOf){return {source:'WRONG_SOURCE',status:'OK',
  decisionImpact:true,brokerOrdersEnabled:false,updatedAt:now,
  windows:ws.map(w=>({startAt:w.startAt,meanBtcPerMinute:999}))}}};
 const x=MODULE.createReader({clock:()=>now,volumeProvider:bad});
 assert.equal(await x.refresh(true),false);
 assert.equal(x.view().volume4x15,null);
 assert.ok(x.view().error);
});
test('Stale Elastic source still exposes historical windows but is never marked LIVE',()=>{
 const raw=source();
 const x=MODULE.createReader({clock:()=>Number(raw.asOf)+3*60000,
  volumeProvider:{async get(){return null}}});
 const out=x.view();
 assert.equal(out.status,'SOURCE_STALE');
 assert.equal(out.windows.length,4);
 assert.equal(out.brokerOrdersEnabled,false);
});
