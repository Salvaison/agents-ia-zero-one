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

const transfer=require('../../modules/v5/structural-transfer-observer');
test('joint exit: level loss with adverse PM but neutral MF is not a transfer',()=>{
 const res=transfer.inspect({position:pos(),now:T+THREE+10000,price:79865,
  bars3:[candle(T+THREE,79870)],
  conversion:{pm3:-22,pmCombined:-30,mf3Delta3m:0,mf15Delta10m:.1}});
 assert.equal(res.levelLoss.confirmedLoss,true);
 assert.equal(res.transfer.observed,false);
 assert.equal(res.exitRequested,false);
});
test('joint exit: confirmed loss and adverse PM3 PM Live MF3 transfer',()=>{
 const res=transfer.inspect({position:pos(),now:T+THREE+10000,price:79865,
  bars3:[candle(T+THREE,79870)],
  conversion:{pm3:-22,pmCombined:-30,mf3Delta3m:-.4,mf15Delta10m:.1}});
 assert.equal(res.transfer.pmAndFastMf,true);
 assert.equal(res.exitRequested,true);
 assert.match(res.reason,/STRUCTURAL_LEVEL_LOSS_AND_OBSERVED_TRANSFER/);
});
test('joint exit: defended opposite price and MF3 MF15 adverse also corroborate',()=>{
 const res=transfer.inspect({position:pos(),now:T+THREE+10000,price:79865,
  bars3:[candle(T+THREE,79870)],
  positionReview:{defendedOpposition:true},
  conversion:{pm3:8,pmCombined:3,mf3Delta3m:-.5,mf15Delta10m:-.3}});
 assert.equal(res.transfer.defendedPriceAndMf,true);
 assert.equal(res.exitRequested,true);
});
test('joint exit: isolated wick or unsupported transfer never exits',()=>{
 const r=transfer.inspect({position:pos(),now:T+15000,price:79894,bars3:[],
  conversion:{pm3:-20,pmCombined:-28,mf3Delta3m:-.5,mf15Delta10m:-.5}});
 assert.equal(r.exitRequested,false);
 assert.equal(r.levelLoss.provenLoss,false);
});
test('joint exit: rapid material loss with PM/MF before 3m close',()=>{
 const r=transfer.inspect({position:pos(),now:T+15000,price:79820,bars3:[],
  conversion:{pm3:-20,pmCombined:-28,mf3Delta3m:-.5,mf15Delta10m:.1}});
 assert.equal(r.levelLoss.urgentLoss,true);
 assert.equal(r.exitRequested,true);
});
test('joint exit: short direction and stale decision guard',()=>{
 const p={...pos(),direction:'short',invalidationPrice:80100};
 const a={position:p,now:T+THREE+10000,price:80145,
  bars3:[candle(T+THREE,80131)],
  conversion:{pm3:30,pmCombined:15,mf3Delta3m:.5,mf15Delta10m:.2}};
 assert.equal(transfer.inspect({...a,tickFresh:true}).exitRequested,true);
 assert.equal(transfer.inspect({...a,tickFresh:false}).exitRequested,false);
});
test('joint shadow never uses 120/90 or 220/180 gain floor',()=>{
 const {s,p,paper}=enter();
 model.step(s,{paperState:paper,now:T+10000,price:80280,input:{bars3:[]},
  decide:()=>({action:'HOLD'})});
 const x=model.step(s,{paperState:{...paper,position:null},now:T+15000,
  price:80070,input:{bars3:[]},decide:()=>({action:'HOLD'})});
 assert.equal(s.variants.BASELINE_PLUS_FAST_INVALIDATION.completed,1);
 assert.equal(s.variants.STRUCTURAL_LEVEL_AND_TRANSFER.completed,0);
 assert.ok(s.variants.STRUCTURAL_LEVEL_AND_TRANSFER.position);
 assert.equal(x.events.filter(e=>e.policy==='STRUCTURAL_LEVEL_AND_TRANSFER'&&e.type==='SHADOW_EXIT').length,0);
});
test('joint shadow ignores standalone V541 exit if initial level intact',()=>{
 const {s,p,paper}=enter();
 model.step(s,{paperState:{...paper,position:null},now:T+15000,
  price:80100,input:{bars3:[]},
  decide:()=>({action:'EXIT_LONG',reason:'V541_MA3_TRANSFER',readings:{
   conversion:{pm3:-50,pmCombined:-40,mf3Delta3m:-.5,mf15Delta10m:-.5},
   structural54:{positionReview:{defendedOpposition:true}}}})});
 assert.equal(s.variants.STRUCTURAL_LEVEL_AND_TRANSFER.completed,0);
 assert.equal(s.variants.STRUCTURE_ONLY.completed,1);
});
test('joint shadow exits when lost structural level and transfer confirmed, counts fees',()=>{
 const {s,p,paper}=enter();
 const out=model.step(s,{paperState:{...paper,position:null},now:T+THREE+15000,
  price:79860,input:{bars3:[candle(T+THREE,79872)]},
  decide:()=>({action:'HOLD',readings:{
   conversion:{pm3:-50,pmCombined:-30,mf3Delta3m:-.5,mf15Delta10m:-.1},
   structural54:{positionReview:{defendedOpposition:false}}}})});
 const rec=s.variants.STRUCTURAL_LEVEL_AND_TRANSFER.records[0];
 assert.equal(s.variants.STRUCTURAL_LEVEL_AND_TRANSFER.completed,1);
 assert.equal(rec.exitReason,'SHADOW_CONFIRMED_STRUCTURAL_LEVEL_LOSS_AND_OBSERVED_TRANSFER');
 assert.ok(rec.feesUsd>1.49&&rec.feesUsd<1.51);
 assert.ok(out.events.some(e=>e.policy==='STRUCTURAL_LEVEL_AND_TRANSFER'&&e.type==='SHADOW_EXIT'));
});
test('joint shadow retains hard-risk -500 and blocks overlapping baseline entries',()=>{
 const {s,p,paper}=enter();
 model.step(s,{paperState:{...paper,position:null},now:T+10000,
  price:80130,input:{bars3:[]},decide:()=>({action:'HOLD'})});
 const next=pos(T+15000,80130,80080);
 model.step(s,{paperState:{...paper,position:next,completed:1},now:T+20000,
  price:80130,input:{bars3:[]},decide:()=>({action:'HOLD'})});
 assert.equal(s.variants.STRUCTURAL_LEVEL_AND_TRANSFER.blockedReentries,1);
 model.step(s,{paperState:{...paper,position:null,completed:1},now:T+25000,
  price:79490,input:{bars3:[]},decide:()=>({action:'HOLD'})});
 assert.equal(s.variants.STRUCTURAL_LEVEL_AND_TRANSFER.completed,1);
 assert.equal(s.variants.STRUCTURAL_LEVEL_AND_TRANSFER.records[0].exitReason,'SHADOW_HARD_RISK_500');
});
test('migration v0.2 preserves existing virtual positions and new fork starts flat',()=>{
 const {s}=enter();
 const old=s.variants.STRUCTURE_ONLY.position.entryAt;
 s.version='v543-campaign-hold-shadow-v0.2';
 delete s.variants.STRUCTURAL_LEVEL_AND_TRANSFER;
 model.migrate(s);
 assert.equal(s.version,model.VERSION);
 assert.equal(s.variants.STRUCTURE_ONLY.position.entryAt,old);
 assert.equal(s.variants.STRUCTURAL_LEVEL_AND_TRANSFER.position,null);
});
