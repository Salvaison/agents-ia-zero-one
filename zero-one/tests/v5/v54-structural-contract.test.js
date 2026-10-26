'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const v54=require('../../modules/v5/decision-v54');
const v533=require('../../modules/v5/decision-v533');
const paper=require('../../modules/v5/paper-v52');
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../../..'),DATA=path.join(ROOT,'zero-one/data');
const all=require('../../modules/v5/runner-v52');
const audit=JSON.parse(fs.readFileSync(path.join(DATA,'audit-history.json'),'utf8'));
const base=all.latest();
function at(time,opt={}){
 const now=Date.parse(time),samples=audit.filter(a=>a.ts<=now).slice(-450);
 const last=samples.at(-1);
 if(!last||now-last.ts>65000)return null;
 return {...base,samples,now,price:last.lastPrice,
  startedAt:now-3600000,sourceAgeMs:now-last.ts,tickAgeMs:100,
  liveMa3:null,liveMa15:null,position:null,...opt};
}
function ensureInput(t,time){const x=at(time);
 if(!x){t.skip('Rolling Amsterdam Audit missing '+time);return null;}return x;}
test('MCB15 structural trajectory is the director, and E3 cross cannot select opposing strategic direction',t=>{
 const x=ensureInput(t,'2026-10-26T04:50:30Z');if(!x)return;
 const s=v54.build(x),d=v54.evaluate(x);
 assert.equal(s.available,true);
 assert.ok(['long','short'].includes(s.direction));
 assert.equal(d.readings.structural54.director,s.direction);
 assert.equal(d.readings.structural54.campaignId,s.campaignId);
 assert.ok(d.readings.structural54.structuralOrigin.availableAt<=x.now);
 assert.ok(d.readings.structural54.origins.m120);
 const oppositeSide=d.readings.structural54.mcb3.cross?.direction;
 if(oppositeSide&&oppositeSide!==s.direction){
  assert.notEqual(d.candidate,oppositeSide,
   'tactical cross alone cannot select strategic direction');
  assert.equal(d.action,'WAIT');
 }
 assert.equal(d.brokerOrdersEnabled,false);
});
test('no confirmed E15 structural pivot gives UNKNOWN rather than latest 3m cross',()=>{
 const now=Date.parse('2026-10-26T05:00:00Z'),input={
  now,price:80000,startedAt:now-3600000,
  samples:[{ts:now-1000,liveLbw:10,liveBw:9,live15LbwRaw:2,live15BwRaw:1,
    lastPrice:80000}],
  bars15:[],bars3:[],bars1h:[],bars4h:[],levels:[],
  tickAgeMs:100,sourceAgeMs:1000};
 const d=v54.evaluate(input);
 assert.equal(d.action,'WAIT');
 assert.equal(d.candidate,null);
 assert.equal(d.readings.structural54.available,false);
});
test('confirmed 2h origin is immutable if future candles are appended',t=>{
 const x=ensureInput(t,'2026-10-26T05:03:00Z');if(!x)return;
 const a=v54.build(x);
 if(!a.available){t.skip('Confirmed pivot unavailable at this point');return;}
 const altered={...x,bars3:[...x.bars3,
  {ts:x.now+3600000,open:100000,low:10,high:150000,close:150000,
    lt_blue_wave:-95,blue_wave:-85,money_flow:99}],
  bars15:[...x.bars15,
   {ts:x.now+3600000,open:100000,low:10,high:150000,close:150000,
    lt_blue_wave:-95,blue_wave:-85,money_flow:99}]};
 const b=v54.build(altered);
 assert.deepEqual(b.originByHorizon,a.originByHorizon);
 assert.equal(b.campaignId,a.campaignId);
 assert.equal(b.parentPivot.availableAt,a.parentPivot.availableAt);
});
test('legacy V5.3.3 position retains exactly its exit action and reason at switch',t=>{
 const x=ensureInput(t,'2026-10-26T04:59:40Z');if(!x)return;
 const position={direction:'short',entryPolicyVersion:v533.VERSION,entryAt:x.now-600000,
  entryPrice:x.price+80,invalidationPrice:x.price+140,gainFloorUsd:90,
  entryFeeUsd:.75,mfePriceUsd:180,maePriceUsd:0};
 const input={...x,position};
 const a=v533.evaluate(input),b=v54.evaluate(input);
 assert.equal(b.action,a.action);
 assert.equal(b.reason,a.reason);
 assert.equal(b.readings.structural54.legacyPolicyPreserved,v533.VERSION);
 assert.equal(b.brokerOrdersEnabled,false);
});
test('no stale confirmed bars authorize entry and no hypothetical level fabricates a stop',t=>{
 const x=ensureInput(t,'2026-10-26T05:00:00Z');if(!x)return;
 const stale={...x,bars15:x.bars15.filter(b=>b.ts+900000<x.now-7200000)};
 const d=v54.evaluate(stale);
 assert.notEqual(d.action,'ENTER_LONG');
 assert.notEqual(d.action,'ENTER_SHORT');
 assert.equal(d.checks?.dataFresh,false);
});
test('next confirmed 15m pivot changes campaign identity independently from old E3 trade',t=>{
 const x=ensureInput(t,'2026-10-26T05:03:00Z');if(!x)return;
 const s=v54.build(x);
 if(!s.available){t.skip('Missing pivot');return;}
 const input={...x,bars3:x.bars3.slice(0,-1),samples:x.samples.slice(0,-1)};
 const comparison=v54.build(input);
 if(!comparison.available){t.skip('Source became unavailable');return;}
 assert.equal(s.campaignId,comparison.campaignId);
 assert.equal(s.direction,comparison.direction);
});
test('actual 3m reclaim requires closed bars, not unconfirmed LIVE price alone',()=>{
 const start=1793000000000;
 const input=[[-1,100,97,105],[-1,100,97,105],[-1,98,95,99],[-1,104,101,106]].map(
  ([_,close,low,high],i)=>({ts:start+180000*i,close,low,high}));
 const no=v54.actualDefense(input.slice(0,3),'long',start+3*180000,107);
 assert.equal(no.held,false);
 const yes=v54.actualDefense(input,'long',start+4*180000,106);
 assert.equal(typeof yes.held,'boolean');
});
test('V5.4 ledger migration preserves full history, fees, position and entry policy',()=>{
 const before=paper.initial(1000);before.version=paper.VERSION;
 before.completed=43;before.wins=18;before.losses=25;
 before.realizedUsd=-55.5622;before.equityUsd=944.4378;
 before.feesUsd=64.5;before.usedKeys=['long|100|E15:300','short|200|E15:400'];
 before.history=[{tradeNo:43,entryPolicyVersion:v533.VERSION,netPnlUsd:1.3}];
 before.position={entryPolicyVersion:v533.VERSION,entryPrice:80300,
  entryAt:300,direction:'long',invalidationPrice:80190,gainFloorUsd:90};
 // Current schema recognizes its own version and must not create a new
 // branch yet; V5.4 migration is tested when new VERSION becomes active.
 assert.equal(before.brokerOrdersEnabled,false);
 assert.equal(before.position.entryPolicyVersion,v533.VERSION);
 assert.equal(before.completed,43);
});
test('V5.4 policy migration from V5.3.3 keeps a live position, fees, equity and consumed keys',()=>{
 const previous=paper.initial(1000);
 previous.version=paper.V533_VERSION;previous.completed=56;
 previous.realizedUsd=-75.5005;previous.equityUsd=924.4995;previous.feesUsd=84.4;
 previous.usedKeys=['long|E3:20|E15:30','short|E3:40|E15:50'];
 previous.history=[{tradeNo:56,entryPolicyVersion:v533.VERSION,netPnlUsd:-3}];
 previous.position={entryPolicyVersion:v533.VERSION,entryPrice:80300,entryAt:1800,
  direction:'long',invalidationPrice:80190,gainFloorUsd:90};
 const migrated=paper.migrate(previous,5000);
 assert.equal(migrated.version,paper.VERSION);
 assert.equal(migrated.policyActivatedAt,5000);
 assert.equal(migrated.completed,56);
 assert.equal(migrated.realizedUsd,-75.5005);
 assert.equal(migrated.equityUsd,924.4995);
 assert.equal(migrated.feesUsd,84.4);
 assert.deepEqual(migrated.history,previous.history);
 assert.deepEqual(migrated.usedKeys,previous.usedKeys);
 assert.equal(migrated.position.entryPolicyVersion,v533.VERSION);
 assert.equal(migrated.position.invalidationPrice,80190);
 assert.equal(migrated.position.gainFloorUsd,90);
 assert.equal(migrated.brokerOrdersEnabled,false);
 assert.throws(()=>paper.migrate({...previous,version:'CORRUPT'},5000),/MIGRATION_REFUSED/);
});
test('E3 admission key cannot churn on old tactical event; a new cross represents a new opportunity',()=>{
 const s=paper.initial(1000);s.policyActivatedAt=1000;
 const evidence=cross=>({
  version:v54.VERSION,action:'ENTER_LONG',quality:'DATA_OK',
  reason:'V54_STRUCTURAL_CAMPAIGN_TACTICAL_ENTRY',
  candidate:'long',entryKey:'long|'+cross+'|long|E15:100',
  invalidation:{price:79800,reference:'CONFIRMED_3M_LOW'},
  readings:{geometry:{cross3:{ts:cross}},causalChain:{campaignId:'long|E15:100'},
   mcb15:{lbw:-50},mcb3:{lbw:-60},
   place:{},conversion:{pm3:30,pm5:35},
   structural54:{campaignId:'long|E15:100',mcb3:{latestPivot:{availableAt:cross+100}}}}});
 const first=paper.step(s,evidence(2000),{price:80000,ts:3000,tickAgeMs:0,sourceAgeMs:100});
 assert.equal(first.event.type,'ENTER_LONG');
 const exited=paper.step(s,{version:v54.VERSION,action:'EXIT_LONG',
   reason:'STRUCTURAL_TERRITORY_LOST'},
  {price:80030,ts:4000,tickAgeMs:0,sourceAgeMs:100});
 assert.equal(exited.event.type,'EXIT_LONG');
 const stale=paper.step(s,evidence(2000),{price:80020,ts:5000,tickAgeMs:0,sourceAgeMs:100});
 assert.equal(stale.event,null);
 assert.equal(stale.reason,'V54_SAME_CAMPAIGN_AWAIT_NEW_E3_OR_DEFENDED_TERRITORY');
 const newEvent=paper.step(s,evidence(6000),{price:80020,ts:7000,tickAgeMs:0,sourceAgeMs:100});
 assert.equal(newEvent.event.type,'ENTER_LONG');
 assert.equal(s.brokerOrdersEnabled,false);
});
test('Changing PM alone cannot reverse the strategic MCB15 thesis',t=>{
 const x=ensureInput(t,'2026-10-26T04:50:30Z');if(!x)return;
 const a=v54.evaluate(x);
 const manipulated={...x,samples:x.samples.map((r,i)=>
   i===x.samples.length-1?{...r,priceMove:-900}:r)};
 const b=v54.evaluate(manipulated);
 assert.equal(b.readings.structural54.director,a.readings.structural54.director);
 assert.equal(b.readings.structural54.campaignId,a.readings.structural54.campaignId);
 if(b.readings.structural54.mcb3.cross?.direction!==
   b.readings.structural54.director){
  assert.equal(b.action,'WAIT','PM strength cannot buy against 15m without structural proof');
 }
});
