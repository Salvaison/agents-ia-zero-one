'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(ROOT,'modules/config-server.js'),'utf8');
const v55=require('../../modules/v5/decision-v55');
const paper=require('../../modules/v5/paper-v55');
test('17 November 16:43 short uses a RECENT confirmed swing instead of obsolete highest 8 bars',()=>{
 const now=Date.parse('2026-11-17T15:43:01Z'),MIN=60000;
 const highs=[65060,65135,65000,64900,64850,64820,64789,
  64765,64750,64735,64712,64690,64714.8,64680,64670,64640];
 const bars3=highs.map((high,i)=>({
  ts:now-(highs.length-i)*3*MIN,
  high,low:high-90,close:high-45
 }));
 const p={bars3,bars15:[],levels:[]};
 const atEntry=v55.initialStop(p,now,64277,'short',
  {median3mRangeUsd:160},null,{});
 assert.equal(atEntry.available,true,JSON.stringify(atEntry));
 assert.equal(atEntry.reference,'MCB3_CONFIRMED_SWING_HIGH');
 assert.equal(atEntry.kind,'CAUSAL_SWING');
 assert.equal(atEntry.underlyingLevel,64714.8);
 assert.equal(atEntry.price,64737.2);
 assert.equal(atEntry.distanceUsd,460.2);
 assert.ok(atEntry.availableAt<=now);
 const tooLate=v55.initialStop(p,now+13000,64233.5,'short',
  {median3mRangeUsd:160},null,{});
 assert.equal(tooLate.available,false);
 assert.equal(tooLate.reason,'NO_CONFIRMED_CAUSAL_STRUCTURE_WITHIN_500_BTC');
});
test('V55 PAPER policy migrated as-of with no broker and preserves previously closed trades',()=>{
 assert.equal(v55.VERSION,paper.POLICY);
 const current=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v55-paper-state.json'),'utf8'));
 assert.equal(current.brokerOrdersEnabled,false);
 assert.equal(current.policyVersion,'v5.5-structural-place-regime-paper-v1.1');
 assert.equal(current.policyMigration.from,'v5.5-structural-place-regime-paper-v1');
 assert.ok(current.completed>=17);
 assert.ok(current.history.some(t=>t.policyVersion==='v5.5-structural-place-regime-paper-v1'));
});
test('S1 v0.2 endpoint and live display are separately authenticated and NON PAPER',()=>{
 assert.ok(source.includes("app.get('/api/shadows/boonolab-lbw15-s1-v02',requireAuth"));
 assert.ok(source.includes("'boonolab-v543-lbw15-s1-v0.2'"));
 assert.ok(source.includes('shadowV543S1V02Details'));
 assert.ok(source.includes("get('/api/shadows/boonolab-lbw15-s1-v02')"));
 assert.ok(source.includes('Parent Δ15'));
 assert.ok(source.includes('candidat Δ15'));
 assert.ok(source.includes('position Δ15'));
 assert.ok(source.includes("get('/api/shadows/boonolab-lbw15-s1')"));
});
test('Watch V55 read endpoint accepts new V55 v1.1 and checks state/summary coherence',()=>{
 const start=source.indexOf("app.get('/api/v55-paper',requireAuth");
 const end=source.indexOf("app.get('/api/v493'",start);
 assert.ok(start>=0&&end>start);
 const s=source.slice(start,end);
 assert.ok(s.includes("'v5.5-structural-place-regime-paper-v1.1'"));
 assert.ok(s.includes('view.policyVersion!==state.policyVersion'));
 assert.ok(s.includes("state.brokerOrdersEnabled!==false"));
});
test('client-side S1 v0.2 view compiles without changing existing read-only cards',()=>{
 const tick=String.fromCharCode(96);
 const anchor=source.indexOf("app.get('/app.js', requireAuth");
 const a=source.indexOf('send('+tick,anchor);
 const b=source.indexOf(tick+');\n});',a);
 const js=vm.runInNewContext(tick+source.slice(a+6,b)+tick);
 assert.doesNotThrow(()=>new vm.Script(js));
});
