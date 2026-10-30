'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../../modules/v5/campaign-hold-shadow');
const invalid=require('../../modules/v5/structural-invalidation-observer');
const T=1793346000000,THREE=180000;
function candle(at,close,high=close+12,low=close-12){
 return {ts:at-THREE,close,high,low};
}
function pos(at=T,price=80000,inv=79900){
 return {entryAt:at,entryPrice:price,lastPrice:price,
  direction:'long',entryFeeUsd:.75,notionalUsd:1500,
  entryPolicyVersion:'v5.4.3-causal-offensive-maturity-paper-v1',
  entryKey:'long|1|camp',campaignId:'camp',
  invalidationPrice:inv,invalidationReference:'MCB3_CONFIRMED_SWING_LOW',
  mfePriceUsd:0,maePriceUsd:0,entryContext:{phase:'STRUCTURAL_CONTINUATION'}};
}
function enter(){
 const s=model.initial(T-1000,null),p=pos(),paper={brokerOrdersEnabled:false,position:p,completed:0,history:[]};
 const result=model.step(s,{paperState:paper,now:T+5000,price:80000,
  input:{bars3:[]},decide:()=>({action:'HOLD'})});
 return {s,p,paper,result};
}
test('shadow refuses wrong live version and never authorizes broker',()=>{
 const {s}=enter();
 assert.equal(s.brokerOrdersEnabled,false);assert.equal(s.decisionImpact,false);
 assert.throws(()=>model.step({...s,brokerOrdersEnabled:true},{now:T+10000,price:80010}),/BROKER/);
});
test('wick below initial invalidation is WATCH, not exit',()=>{
 const r=invalid.inspect({position:pos(),now:T+5000,price:79894,
  bars3:[candle(T-THREE,79870)],conversion:{pm3:-10,pmCombined:-14,mf3Delta3m:-.4}});
 assert.equal(r.status,'INITIAL_INVALIDATION_CONTESTED');
 assert.equal(r.exitRequested,false);
});
test('one confirmed adverse close + fresh price conversion exits without E15 or 2 closes',()=>{
 const r=invalid.inspect({position:pos(),now:T+200000,price:79870,
  bars3:[candle(T+THREE,79872)],conversion:{pm3:-40,pmCombined:-25,mf3Delta3m:0}});
 assert.equal(r.oneClose,true);
 assert.equal(r.exitRequested,true);
 assert.match(r.reason,/ONE_CONFIRMED/);
});
test('fast material breach and adverse MF/PM can act before a 3m close',()=>{
 const r=invalid.inspect({position:pos(),now:T+20000,price:79830,
  bars3:[],conversion:{pm3:-35,pmCombined:-19,mf3Delta3m:-.5}});
 assert.equal(r.exitRequested,true);
 assert.match(r.reason,/FAST_PRICE/);
});
test('isolated short signal and old confirmed bar cannot trigger exit',()=>{
 const r=invalid.inspect({position:pos(),now:T+20000,price:79870,
  bars3:[candle(T-THREE,79870)],conversion:{pm3:30,pmCombined:25,mf3Delta3m:-.4}});
 assert.equal(r.exitRequested,false);
});
test('shadow forks three variants, ignores baseline floor and updates real paired result',()=>{
 const {s,p,paper}=enter();
 let x=model.step(s,{paperState:{...paper,position:null,completed:1,
  history:[{tradeNo:1,entryAt:T,exitAt:T+10000,entryPrice:80000,
   exitPrice:80091,netPnlUsd:.2,feesUsd:1.5,exitReason:'GAIN_FLOOR'}]},
  now:T+10000,price:80091,input:{bars3:[]},decide:()=>({action:'HOLD'})});
 assert.equal(x.events.filter(e=>e.type==='SHADOW_EXIT').length,0);
 x=model.step(s,{paperState:{...paper,position:null,completed:1,history:[]},
  now:T+15000,price:80155,input:{bars3:[]},decide:()=>({action:'HOLD'})});
 assert.ok(s.variants.STRUCTURE_ONLY.position);
 x=model.step(s,{paperState:{...paper,position:null,completed:1,history:[]},
  now:T+20000,price:80088,input:{bars3:[]},decide:()=>({action:'HOLD'})});
 assert.equal(s.variants.TERRITORY_FLOOR_120.completed,1);
 assert.ok(s.variants.STRUCTURE_ONLY.position);
 assert.ok(s.variants.EARLY_INVALIDATION.position);
 const rec=s.variants.TERRITORY_FLOOR_120.records[0];
 assert.equal(rec.baselineNetUsd,.2);
 assert.equal(rec.exitReason,'SHADOW_TERRITORY_FLOOR');
});
test('structural-only exits on independent V541 event, no price floor',()=>{
 const {s,p,paper}=enter();
 const x=model.step(s,{paperState:{...paper,position:null},now:T+15000,
  price:80110,input:{bars3:[]},
  decide:()=>({action:'EXIT_LONG',reason:'V54_CONFIRMED_STRUCTURAL_TERRITORY_TRANSFER'})});
 assert.equal(s.variants.STRUCTURE_ONLY.completed,1);
 assert.ok(s.variants.STRUCTURE_ONLY.records[0].exitReason.includes('STRUCTURAL_TERRITORY'));
});
test('baseline reentry is blocked when virtual position is still open',()=>{
 const {s,p,paper}=enter();
 model.step(s,{paperState:{...paper,position:null},now:T+10000,
  price:80150,input:{bars3:[]},decide:()=>({action:'HOLD'})});
 const second=pos(T+16000,80140,80090);
 const x=model.step(s,{paperState:{...paper,position:second,completed:1},
  now:T+20000,price:80140,input:{bars3:[]},decide:()=>({action:'HOLD'})});
 assert.equal(s.variants.STRUCTURE_ONLY.blockedReentries,1);
 assert.ok(x.events.some(e=>e.type==='SKIPPED_ACTUAL_REENTRY'));
 assert.equal(s.variants.STRUCTURE_ONLY.position.originTradeNo,1);
});
test('confirmed post-entry rising structural stop upgrades floor without future',()=>{
 const {s,p,paper}=enter();
 model.step(s,{paperState:paper,now:T+10000,price:80250,input:{bars3:[]},
  decide:()=>({action:'HOLD'}),
  territoryStop:()=>({price:80210,confirmedAvailableAt:T+8000})});
 assert.ok(s.variants.TERRITORY_FLOOR_120.position.gainFloorUsd>=210);
 const x=model.step(s,{paperState:{...paper,position:null},now:T+15000,
  price:80200,input:{bars3:[]},decide:()=>({action:'HOLD'})});
 assert.equal(s.variants.TERRITORY_FLOOR_120.completed,1);
 assert.equal(s.variants.STRUCTURE_ONLY.completed,0);
});
test('time travelling and stale prices do not trigger shadow exits',()=>{
 const {s,p,paper}=enter();
 const pre=s.lastObservationAt;
 model.step(s,{paperState:paper,now:pre-100,price:79500,input:{bars3:[]}});
 assert.equal(s.lastObservationAt,pre);
 model.step(s,{paperState:paper,now:pre+5000,price:79500,
  tickFresh:false,input:{bars3:[]},decide:()=>({action:'EXIT_LONG'})});
 assert.equal(s.variants.STRUCTURE_ONLY.completed,0);
});

test('new baseline plus fast invalidation keeps original gain floors',()=>{
 const {s,p,paper}=enter();
 model.step(s,{paperState:paper,now:T+10000,price:80135,input:{bars3:[]},
  decide:()=>({action:'HOLD'})});
 const x=model.step(s,{paperState:{...paper,position:null},now:T+15000,
  price:80087,input:{bars3:[]},decide:()=>({action:'HOLD'})});
 assert.equal(s.variants.BASELINE_PLUS_FAST_INVALIDATION.completed,1);
 assert.equal(s.variants.BASELINE_PLUS_FAST_INVALIDATION.records[0].exitReason,
  'SHADOW_BASELINE_GAIN_FLOOR');
 assert.equal(s.variants.STRUCTURE_ONLY.completed,0);
});
test('shadow v0.1 state migrates without losing prior research positions',()=>{
 const {s}=enter();
 const previous=s.variants.STRUCTURE_ONLY.position;
 delete s.variants.BASELINE_PLUS_FAST_INVALIDATION;
 s.version='v543-campaign-hold-shadow-v0.1';
 const next=model.migrate(s);
 assert.equal(next.version,model.VERSION);
 assert.equal(next.variants.STRUCTURE_ONLY.position.entryAt,previous.entryAt);
 assert.equal(next.variants.BASELINE_PLUS_FAST_INVALIDATION.position,null);
 assert.match(next.migrationNote,/NEXT/);
});
