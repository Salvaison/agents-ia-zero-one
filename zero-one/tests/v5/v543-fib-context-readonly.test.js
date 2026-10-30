'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const fib=require('../../modules/v5/fib-context-readonly');
const root=path.join(__dirname,'../../');
function toLevels(a,b,g='6'){
 return [{token:'fib0',price:a,fam:'fib',groupId:g,time:'16:56'},
  {token:'fib1',price:b,fam:'fib',groupId:g,time:'16:56'}];
}
test('manual descending fib0→fib1: 0.382 level and signed USD distance, exactly like NIVEAUX composer',()=>{
 const m=fib.mapped({price:77291,levels:toLevels(87649,58500)});
 assert.equal(m.available,true);
 assert.equal(m.groups.length,1);
 const x=m.groups[0].levels.find(z=>z.ratio===.382);
 assert.equal(x.price,76514.1);
 assert.equal(x.distanceUsd,-776.9);
 assert.equal(x.location,'BELOW');
 assert.equal(m.nearest.ratio,.382);
 assert.equal(m.nearest.groupId,'6');
 assert.equal(m.groups[0].anchoredAsOf,null,'manual source has only HH:MM, not dated');
});
test('ascending group and descending group both use registered fib0→fib1, never exchange their meaning',()=>{
 const m=fib.mapped({price:77291,levels:[
  ...toLevels(57582,126425,'5'),...toLevels(126260,15738,'3'),
  ...toLevels(87649,58500,'6')]});
 assert.equal(m.groups.length,3);
 assert.equal(m.groups.find(x=>x.groupId==='5').levels.find(x=>x.ratio===.382).price,83880);
 assert.equal(m.groups.find(x=>x.groupId==='3').levels.find(x=>x.ratio===.382).price,84040.6);
 assert.equal(m.nearest.groupId,'6');
});
test('E15 campaign shows BOTH 0.382 from origin and 38.2% retracement, not the same level',()=>{
 const state={director:'long',
  structuralOrigin:{type:'CREUX',price:76652,sourceTs:10,availableAt:20},
  origins:{m120:{high:78070,highAvailableAt:30}}};
 const c=fib.campaign({price:77291,now:40,structural54:state});
 assert.equal(c.available,true);
 assert.equal(c.progressFromOrigin382.price,77193.7);
 assert.equal(c.progressFromOrigin382.distanceUsd,-97.3);
 assert.equal(c.retracementFromExtreme382.price,77528.3);
 assert.equal(c.retracementFromExtreme382.distanceUsd,237.3);
 assert.equal(c.availableAt,30);
 assert.equal(c.role,'READ_ONLY_PRICE_CONTEXT');
});
test('short campaign works symmetrically',()=>{
 const c=fib.campaign({price:77291,now:40,structural54:{director:'short',
  structuralOrigin:{type:'CRETE',price:78070,availableAt:20,sourceTs:10},
  origins:{m120:{low:76652,lowAvailableAt:30}}}});
 assert.equal(c.available,true);
 assert.equal(c.progressFromOrigin382.price,77528.3);
 assert.equal(c.retracementFromExtreme382.price,77193.7);
});
test('an older or future extreme cannot become a prospective campaign fib',()=>{
 const state={director:'long',structuralOrigin:{type:'CREUX',price:76652,
  availableAt:30},origins:{m120:{high:78070,highAvailableAt:20}}};
 assert.equal(fib.campaign({price:77500,now:40,structural54:state}).available,false);
 state.origins.m120.highAvailableAt=45;
 assert.equal(fib.campaign({price:77500,now:40,structural54:state}).available,false);
});
test('incomplete/invalid or degenerate manual fib is not silently promoted',()=>{
 const m=fib.mapped({price:77500,levels:[
  {token:'fib0',price:77500,groupId:'a'},
  ...toLevels(100,100,'b'),...toLevels('x',65000,'c')]});
 assert.equal(m.groups.length,0);
 assert.equal(m.nearest,null);
 assert.equal(m.available,false);
});
test('API and interface expose fib only as observation, without passing to active V5 policy',()=>{
 const server=fs.readFileSync(path.join(root,'modules/config-server.js'),'utf8');
 assert.match(server,/fibContextReadOnly\.evaluate\(/);
 assert.match(server,/summary\.fibContext=/);
 assert.match(server,/FIB ENREGISTRÉ/);
 assert.match(server,/FIB CAMPAGNE illustratif/);
 for(const n of ['decision-v541.js','decision-v543.js','paper-v543.js','runner-v543.js']){
  const code=fs.readFileSync(path.join(root,'modules/v5',n),'utf8');
  assert.ok(!code.includes('fib-context-readonly'),n+' must not import display-only Fib');
 }
 const r=fib.evaluate({price:77291,levels:toLevels(87649,58500)});
 assert.equal(r.decisionImpact,false);
 assert.equal(r.brokerOrdersEnabled,false);
});
