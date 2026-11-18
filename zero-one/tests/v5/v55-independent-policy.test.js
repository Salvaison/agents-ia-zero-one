'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const decision=require('../../modules/v5/decision-v55');
const paper=require('../../modules/v5/paper-v55');
const NOW=1794835000000,MIN=60000,THREE=3*MIN;
function fixture({direction='long',marketLabel='DIRECTIONNEL_PRODUCTIF',
 native15=null,phase='CONTINUATION'}={}){
 const sign=direction==='long'?1:-1;
 const price=65000;
 const samples=Array.from({length:89},(_,i)=>({
  ts:NOW-(88-i)*30000,
  lastPrice:price-sign*(88-i)*7,
  live15LbwRaw:-40+sign*i*.22,
  live15BwRaw:-42+sign*i*.2
 }));
 const bars3=Array.from({length:31},(_,i)=>{
  const ts=NOW-(31-i)*THREE,close=price-sign*(31-i)*11;
  return {ts,close,high:close+25,low:close-25,
   lt_blue_wave:-50+sign*i,bue_wave:-53+sign*i,
   money_flow:sign*2,wt1_cross_up:null,wt1_cross_dn:null};
 });
 // A genuinely confirmed and local causal swing on the protective side.
 // Merely taking the last eight candles is no longer a valid stop source.
 if(direction==='long')bars3[20].low=price-180;
 else bars3[20].high=price+180;
 const base={
  version:'v5.4.3-causal-offensive-maturity-paper-v1',
  quality:'DATA_OK',candidate:direction,phase:'STRUCTURAL_CONTINUATION',
  readings:{
   structural54:{available:true,director:direction,
    campaignId:direction+'|E15:TEST',structuralPivotKnownAt:NOW-3*3600000,
    nativeE3:{confirmed:{direction,availableAt:NOW-4*MIN}},
    nativeE15:{confirmed:native15||{direction,availableAt:NOW-2*3600000},live:null},
    testedTerritory:{validated:true,level:price-sign*40,
     availableAt:NOW-5*MIN,source:'DEFENDED_RETEST'}},
   geometry:{cross3:{direction,ts:NOW-7*MIN},cross15:{direction,ts:NOW-25*MIN}},
   conversion:{pm3:sign*100,pm5:sign*115,pmCombined:sign*70,
    mf3Delta3m:sign*1,mf15Delta10m:sign*.5},
   maturity:{twoHourPriceRank:.5,offensiveChain:{origin4h:{progressVs15mRange:1}}},
   offensiveMaturity:{classification:'NO_MULTI_FAMILY_MATURITY_CONFLICT'}
  }
 };
 const input={samples,bars3,bars15:[],bars1h:[],bars4h:[],
  levels:[],health:true};
 const regime={asOf:NOW-20000,label:marketLabel,
  intensity:'MEDIUM',productivity:marketLabel==='DIRECTIONNEL_PRODUCTIF'?
   'HIGH_RETENTION':'LOW_RETENTION',
  metrics:{lastHour:{pathEfficiency:.35,retainedFraction:.8}},
  twoHour:{direction}};
 const params={input,base,now:NOW,price,position:null,
  lastExit:null,startedAt:NOW-2*HOUR,regime,levelsMtime:NOW-50000,usedKeys:[]};
 return params;
}
const HOUR=3600000;
test('fresh V5.5 account is not the retired V494 ledger and never a brokerage account',()=>{
 const x=paper.initial(NOW);
 assert.equal(x.completed,0);assert.equal(x.equityUsd,1000);
 assert.equal(x.realizedUsd,0);assert.equal(x.position,null);
 assert.equal(x.brokerOrdersEnabled,false);
 assert.throws(()=>paper.migrate({version:'baseline-v494-attention-paper-v0.2',brokerOrdersEnabled:false}),/REFUSED/);
 assert.throws(()=>paper.migrate({version:'v5.4.3-paper-ledger-v1.0',brokerOrdersEnabled:false}),/REFUSED/);
});
test('V55 admits defensible aligned price under productive macro without V543 entry action',()=>{
 const p=fixture();
 const d=decision.evaluate(p);
 assert.equal(d.quality,'DATA_OK');
 assert.equal(d.phase,'V55_CONTINUATION');
 assert.equal(d.action,'ENTER_LONG',JSON.stringify({reason:d.reason,checks:d.checks,stop:d.invalidation}));
 assert.ok(d.invalidation.available);
 assert.equal(d.brokerOrdersEnabled,false);
});
test('V55 ledger accounts taker fees and closes with independent risk limit',()=>{
 const p=fixture(),d=decision.evaluate(p);const s=paper.initial(NOW-2*HOUR);
 let a=paper.step(s,d,{ts:NOW,price:65000,tickAgeMs:1000,sourceAgeMs:10000});
 assert.equal(a.reason,'ENTER_PAPER');
 assert.equal(s.feesUsd,.75);assert.ok(s.position);
 assert.equal(s.position.campaignId,'long|E15:TEST');
 const hold={...d,asOf:NOW+1000,action:'HOLD',reason:'HOLD_OK'};
 a=paper.step(s,hold,{ts:NOW+1000,price:65020,tickAgeMs:1000,sourceAgeMs:10000});
 assert.equal(a.reason,'HOLD_PAPER');
 a=paper.step(s,hold,{ts:NOW+2000,price:64490,tickAgeMs:1000,sourceAgeMs:10000});
 assert.equal(a.reason,'EXIT_PAPER');assert.equal(s.completed,1);
 assert.equal(a.trade.exitReason,'HARD_RISK_500_BTC_PRICE_USD');
 assert.equal(a.trade.brokerOrdersEnabled,false);
 assert.ok(s.equityUsd<1000);
 assert.ok(s.feesUsd>1.4);
 const again=paper.step(s,hold,{ts:NOW+2000,price:64600,tickAgeMs:1000,sourceAgeMs:10000});
 assert.equal(again.event,null);
});
test('V55 refuses unproductive stasis even when E3 and territory look aligned',()=>{
 const p=fixture({marketLabel:'STERILE_HESITANT'});
 p.regime.metrics.lastHour.pathEfficiency=.08;
 p.regime.metrics.lastHour.retainedFraction=.1;
 // Even if local conversion is positive, the territory has no efficient
 // 15-minute economic displacement after weak/sterile regime classification.
 p.input.samples=p.input.samples.map(x=>({...x,lastPrice:65000}));
 const d=decision.evaluate(p);
 assert.equal(d.action,'WAIT');
 assert.equal(d.readings.structural55.marketGate.allowed,false);
 assert.equal(d.reason,'WAIT_V55_PRICE_TRANSLATION');
});
test('dense contradiction is not a blanket veto when actual price is retained',()=>{
 const p=fixture({marketLabel:'DENSE_CONTRADICTOIRE'});
 p.regime.metrics.lastHour.pathEfficiency=.08;
 p.regime.metrics.lastHour.retainedFraction=.3;
 let d=decision.evaluate(p);
 assert.equal(d.readings.structural55.marketGate.allowed,true);
 // Weak conversion of this battle removes its exception.
 p.base.readings.conversion.pmCombined=0;
 d=decision.evaluate(p);
 assert.equal(d.readings.structural55.marketGate.allowed,false);
 assert.equal(d.action,'WAIT');
});
test('confirmed new adverse E15 plus contrary cross blocks false parent continuation',()=>{
 const p=fixture({native15:{direction:'short',availableAt:NOW-15*MIN}});
 p.base.readings.geometry.cross15={direction:'short',ts:NOW-10*MIN};
 const d=decision.evaluate(p);
 assert.equal(d.checks.nativeConflictBlocks,true);
 assert.equal(d.action,'WAIT');
 assert.equal(d.reason,'WAIT_V55_NATIVE_E15_CONTRADICTS_PARENT');
});
test('opposed parent early inflection can be considered without universal macro veto',()=>{
 const p=fixture();
 p.base.readings.structural54.director='short';
 p.base.readings.structural54.campaignId='short|E15:TEST';
 p.base.readings.structural54.nativeE15.confirmed={direction:'short',
  availableAt:NOW-2*HOUR};
 p.base.phase='STRUCTURAL_REVERSAL_FORMING';
 const d=decision.evaluate(p);
 assert.equal(d.phase,'V55_EARLY_INFLECTION');
 assert.equal(d.checks.forward,true);
 assert.equal(d.action,'ENTER_LONG',d.reason);
});
test('new admission requires a fresh price-and-tactical episode after previous exit',()=>{
 const p=fixture();
 p.lastExit={at:NOW-2*MIN,campaignId:'long|E15:TEST',direction:'long'};
 const d=decision.evaluate(p);
 assert.equal(d.action,'WAIT');
 assert.equal(d.checks.reentryQualified,false);
 assert.equal(d.reason,'WAIT_V55_NEW_PROOF_AFTER_EXIT');
});
test('an E15 confirmed after entry protects a position without waiting for new geometric pivot',()=>{
 const p=fixture();
 p.position={direction:'long',entryAt:NOW-40*MIN,entryPrice:65200,
  invalidationPrice:64700,mfePriceUsd:300,entryContext:{phase:'V55_CONTINUATION'}};
 p.base.readings.structural54.nativeE15.confirmed={direction:'short',
  availableAt:NOW-5*MIN};
 p.base.readings.geometry.cross15={direction:'short',ts:NOW-4*MIN};
 p.base.readings.conversion.pmCombined=-100;
 p.base.readings.conversion.mf3Delta3m=-2;
 const d=decision.evaluate(p);
 assert.equal(d.action,'EXIT_LONG',d.reason);
 assert.equal(d.reason,'V55_PROTECT_CONFIRMED_E15_TRANSFER');
});
test('no POSITION exit merely because MCB3 fluctuates without price and PM proof',()=>{
 const p=fixture();
 p.position={direction:'long',entryAt:NOW-40*MIN,entryPrice:65050,
  invalidationPrice:64500,mfePriceUsd:90,entryContext:{phase:'V55_CONTINUATION'}};
 p.base.readings.geometry.cross3={direction:'short',ts:NOW-3*MIN};
 p.base.readings.structural54.nativeE3.confirmed={direction:'short',availableAt:NOW-3*MIN};
 p.base.readings.conversion.pmCombined=50;
 const d=decision.evaluate(p);
 assert.equal(d.action,'HOLD',d.reason);
});

test('BigRange price location tightens a counter-macro admission, never alone',()=>{
 const p=fixture();
 p.regime.twoHour.direction='short';
 p.input.bars1h=[
   {ts:NOW-3*HOUR,lt_blue_wave:20,blue_wave:18,
    wt1_cross_up:null,wt1_cross_dn:38,money_flow:-8},
   {ts:NOW-2*HOUR,lt_blue_wave:18,blue_wave:19,
    wt1_cross_up:null,wt1_cross_dn:null,money_flow:-9}
 ];
 p.input.levels=[
   {token:'VAL',label:'VAL big',groupId:8,price:66000},
   {token:'POC',label:'POC big',groupId:8,price:70000},
   {token:'VAH',label:'VAH big',groupId:8,price:74000}
 ];
 const d=decision.evaluate(p);
 assert.equal(d.readings.structural55.context.place.big.outside,'BELOW_VAL');
 assert.equal(d.checks.outsideCounter,true);
 assert.equal(d.checks.placeProofOk,false);
 assert.equal(d.action,'WAIT');
 assert.equal(d.reason,'WAIT_V55_OUTSIDE_VALUE_AREA_COUNTERTREND_UNPROVEN');
});

test('V55 structural invalidation is a confirmed swing, not an 8 candle extreme',()=>{
 const p=fixture();
 const d=decision.evaluate(p);
 assert.equal(d.action,'ENTER_LONG',d.reason);
 assert.equal(d.invalidation.kind,'CAUSAL_SWING');
 assert.equal(d.invalidation.reference,'MCB3_CONFIRMED_SWING_LOW');
 assert.equal(d.invalidation.available,true);
 assert.equal(d.invalidation.source,'PURE_CAUSAL_3M_15M_SWING_RETEST_ASOF');
 assert.notEqual(d.invalidation.reference,'V55_LAST_8_CONFIRMED_3M_PRICE_EXTREME');
 assert.equal(d.invalidation.availableAt<=p.now,true);
});
test('old V55 policy transitions only when flat and retains old account and trade lineage',()=>{
 const old=paper.initial(NOW-100000);
 old.policyVersion='v5.5-structural-place-regime-paper-v1';
 old.completed=3;old.realizedUsd=-42;old.equityUsd=958;
 old.feesUsd=4.5;old.usedKeys=['OLD_CROSS'];old.history=[{tradeNo:3}];
 const migrated=paper.migrate(old,NOW);
 assert.equal(migrated.policyVersion,paper.POLICY);
 assert.equal(migrated.completed,3);assert.equal(migrated.realizedUsd,-42);
 assert.equal(migrated.equityUsd,958);assert.equal(migrated.history.length,1);
 assert.deepEqual(migrated.usedKeys,['OLD_CROSS']);
 assert.equal(migrated.policyMigration.from,'v5.5-structural-place-regime-paper-v1');
 const active={...old,position:{direction:'short',entryPrice:65000}};
 assert.throws(()=>paper.migrate(active,NOW),/ACTIVE_POSITION_POLICY_CHANGE_REFUSED/);
});
test('a previous close bar cannot be used if its confirmation is still in the future',()=>{
 const p=fixture();
 const x=decision.initialStop({...p.input,
  bars3:p.input.bars3.map(b=>({...b,ts:b.ts+2*60*60000}))},
  p.now,p.price,'long',{median3mRangeUsd:75},p.levelsMtime,p.base);
 assert.equal(x.available,false);
 assert.equal(x.reason,'NO_CONFIRMED_CAUSAL_STRUCTURE_WITHIN_500_BTC');
});
