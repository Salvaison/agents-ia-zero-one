'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const entry=require('../../modules/attention/v494-entry-module-shadow');
const exit=require('../../modules/attention/v494-exit-module-shadow');
const lab=require('../../modules/attention/v494-dual-module-shadow');
const T=1793382000000;
function frame(ts=T,price=80000,opts={}){
 const lobe=opts.lobe||{type:'CREUX',extremeLbw:-62,startTs:T-900000,
  structuralDirection:'long'};
 const data={market:{timestamp:ts,price},
  testAction:opts.action||'ENTER_LONG',testLobe:lobe,
  sources:{mcb:{tfs:{'3m':{history:opts.bars||[]}}},auditRows:opts.audit||[]}};
 return data;
}
const engine={evaluate:(f,p,prior)=>({
 action:{type:p?(f.testAction==='TAKE_PROFIT_PARTIAL'?'TAKE_PROFIT_PARTIAL':
   f.testAction==='EXIT_MCB_FLIP'?'EXIT_MCB_FLIP':'HOLD'):f.testAction,
   reason:'FIXTURE_V493'},
 mcb:{currentLobe:f.testLobe},
 translation:{horizons:f.testTranslation||{net3mUsd:0,efficiency3m:0}},
 setup:{setupKey:'key|'+f.testLobe.startTs,setupTs:f.market.timestamp},
 risk:{},evaluatedAt:f.market.timestamp
})};
const listening={decorate:({v493Evaluation,frame,position})=>({
 temporalAttention:{version:'boono-attention-v0.2',stage:position?'REVERSAL_ATTENTION':'DISCOVERY',
  asOf:frame.market.timestamp,events:[],campaignId:'test'}
})};
const dependencies={engine,listening,
 anchor:()=>({price:79900,reference:'MCB3_CONFIRMED_SWING_LOW',
   confirmedAvailableAt:T-180000})};
test('two modules never create a direction; E1 filters only V493-authorized entries',()=>{
 const original={action:{type:'ENTER_LONG'},mcb:{currentLobe:{
  type:'CREUX',extremeLbw:-60,startTs:T-10000}},setup:{setupKey:'S'}};
 assert.equal(entry.evaluate({evaluation:original,frame:frame(),policy:'EXACT_V493'}).admitted,true);
 assert.equal(entry.evaluate({evaluation:original,frame:frame(),policy:'MCB15_INFLECTION'}).admitted,true);
 original.mcb.currentLobe.extremeLbw=-23;
 assert.equal(entry.evaluate({evaluation:original,frame:frame(),policy:'MCB15_INFLECTION'}).admitted,false);
 original.action.type='NO_TRADE';
 assert.equal(entry.evaluate({evaluation:original,frame:frame(),policy:'MCB15_INFLECTION'}).admitted,false);
 original.action.type='ENTER_SHORT';
 original.mcb.currentLobe={type:'CRETE',extremeLbw:63,startTs:T-10000};
 assert.equal(entry.evaluate({evaluation:original,frame:frame(),policy:'MCB15_INFLECTION'}).admitted,true);
});
test('single 3m wick and E3-like counter signal alone do not close a V494 campaign',()=>{
 const p={direction:'long',entryPrice:80000,entryAt:T,entryInvalidation:79900,
  metrics:{mfeUsd:180,maeUsd:105,currentSignedUsd:-105}};
 const ts=T+360000,f=frame(ts,79895,{action:'HOLD',bars:[{
  ts:ts-180000,high:80020,low:79860,close:79940}]});
 const result=exit.evaluate({frame:f,evaluation:{
  action:{type:'HOLD'},mcb:{currentLobe:{structuralDirection:'long'}},
  translation:{horizons:{net3mUsd:-95,efficiency3m:.7}}},
  position:p,attention:{stage:'REVERSAL_ATTENTION'},
  policy:'CONTINUATION_SUPERVISOR'});
 assert.notEqual(result.action,'EXIT_RESEARCH');
 assert.equal(result.proof.oneConfirmedCloseBeyond,false);
});
test('loss of defended initial boundary plus confirmed 3m and PM/MF independent proof permits experimental EXIT',()=>{
 const ts=T+360000, f=frame(ts,79850,{action:'HOLD',
  bars:[{ts:ts-180000,close:79850,high:80020,low:79830}],
  audit:[{ts:ts-180000,liveMoneyFlow:7,live15MfRaw:8},
   {ts,liveMoneyFlow:-6,live15MfRaw:-2}]});
 const p={direction:'long',entryPrice:80000,entryAt:T,entryInvalidation:79900,
 metrics:{mfeUsd:160,maeUsd:150,currentSignedUsd:-150}};
 const result=exit.evaluate({frame:f,evaluation:{
  action:{type:'HOLD'},mcb:{currentLobe:{structuralDirection:'long'}},
  translation:{horizons:{net3mUsd:-110,efficiency3m:.56}}},
  position:p,attention:{stage:'REVERSAL_ATTENTION'},
  policy:'CONTINUATION_SUPERVISOR'});
 assert.equal(result.action,'EXIT_RESEARCH');
 assert.equal(result.proof.oneConfirmedCloseBeyond,true);
 assert.equal(result.proof.priceAdverse,true);
 assert.equal(result.proof.mf3Adverse,true);
 assert.equal(exit.evaluate({frame:f,evaluation:{action:{type:'HOLD'}},
  position:p,policy:'FROZEN_V493'}).action,'HOLD');
});
test('4 independent ledgers: early EXIT frees a new entry while frozen EXIT stays in position',()=>{
 const s=lab.initial(T-180001);
 const a=lab.advance(s,frame(T,80000),dependencies);
 assert.equal(a.events.filter(e=>e.type==='ENTRY').length,4);
 assert.ok(s.branches.EXACT_V493__FROZEN_V493.position);
 const originalPosition=s.branches.EXACT_V493__FROZEN_V493.position;
 assert.equal(originalPosition.entryTimestamp,new Date(T).toISOString());
 assert.equal(originalPosition.initialNotionalUsd,1500);
 assert.equal(originalPosition.metrics.currentPnlUsd,-1.5);
 assert.equal(originalPosition.entrySetupKey,'key|'+(T-900000));
 const ts=T+360000,
 f=frame(ts,79850,{action:'HOLD',
  bars:[{ts:ts-180000,close:79850,high:80020,low:79830}],
  audit:[{ts:ts-180000,liveMoneyFlow:7,live15MfRaw:8},
   {ts,liveMoneyFlow:-6,live15MfRaw:-2}]});
 f.testTranslation={net3mUsd:-110,efficiency3m:.56};
 const second=lab.advance(s,f,dependencies);
 assert.equal(second.events.filter(e=>e.type==='EXIT'&&
  e.reason==='CONFIRMED_TERRITORY_LOSS_WITH_PRICE_MF').length,2);
 assert.ok(s.branches.EXACT_V493__FROZEN_V493.position);
 assert.equal(s.branches.EXACT_V493__CONTINUATION_SUPERVISOR.position,null);
 const third=lab.advance(s,frame(T+420000,79940,{
  action:'ENTER_SHORT',lobe:{type:'CRETE',extremeLbw:61,startTs:T+200000,
    structuralDirection:'short'}}),dependencies);
 const newOrders=third.events.filter(e=>e.type==='ENTRY'&&e.direction==='short');
 assert.equal(newOrders.length,2);
 assert.equal(s.branches.EXACT_V493__FROZEN_V493.position.direction,'long');
 assert.equal(s.branches.EXACT_V493__CONTINUATION_SUPERVISOR.position.direction,'short');
 assert.equal(newOrders[0].precedingExit?.reason,'CONFIRMED_TERRITORY_LOSS_WITH_PRICE_MF');
 assert.ok(s.influenceEvents.some(e=>e.type==='EXIT_INFLUENCES_ENTRY_EXPOSURE'));
 assert.ok(s.influenceEvents.some(e=>e.type==='EXIT_ENABLED_REENTRY'&&
   e.priorExit.reason==='CONFIRMED_TERRITORY_LOSS_WITH_PRICE_MF'));
 assert.equal(s.brokerOrdersEnabled,false);
 assert.equal(s.decisionImpact,false);
});
test('inflexion-only branch can block candidate without affecting the exact entry branch',()=>{
 const s=lab.initial(T-180001);
 const out=lab.advance(s,frame(T,80000,{lobe:{
  type:'CREUX',extremeLbw:-20,startTs:T-120000}}),dependencies);
 assert.equal(out.events.filter(e=>e.type==='ENTRY').length,2);
 assert.equal(out.events.filter(e=>e.type==='FILTERED_ENTRY').length,2);
 assert.ok(s.branches.EXACT_V493__FROZEN_V493.position);
 assert.equal(s.branches.MCB15_INFLECTION__FROZEN_V493.position,null);
});
test('risk remains max adverse BTC price 500 in ALL shadow variants',()=>{
 const s=lab.initial(T-180001);
 lab.advance(s,frame(T,80000),dependencies);
 const z=lab.advance(s,frame(T+30000,79470,{action:'HOLD'}),dependencies);
 assert.equal(z.events.filter(e=>e.type==='EXIT'&&e.reason==='SHADOW_HARD_RISK_500').length,4);
 for(const x of Object.values(s.branches))assert.equal(x.position,null);
});
test('frozen partial TP1 reduces size by 25%, and net accounting retains all fees',()=>{
 const s=lab.initial(T-180001);
 lab.advance(s,frame(T,80000),dependencies);
 const x=lab.advance(s,frame(T+30000,80455,{action:'TAKE_PROFIT_PARTIAL'}),dependencies);
 assert.equal(x.events.filter(e=>e.type==='TP1').length,4);
 const b=s.branches.EXACT_V493__FROZEN_V493;
 assert.equal(b.position.notionalUsd,1125);
 assert.equal(b.position.tpEvents.length,1);
 const y=lab.advance(s,frame(T+60000,80550,{action:'EXIT_MCB_FLIP'}),dependencies);
 assert.equal(b.position,null);
 assert.ok(b.history[0].netPnlUsd>0);
 assert.ok(b.history[0].feesUsd>1);
 assert.equal(y.events.filter(e=>e.type==='EXIT').length,4);
});
test('duplicate/out of order snapshot does not cause double entry, nor any broker action',()=>{
 const s=lab.initial(T-180001);
 lab.advance(s,frame(T,80000),dependencies);
 const count=s.branches.EXACT_V493__FROZEN_V493.entries;
 const x=lab.advance(s,frame(T,70000),dependencies);
 assert.equal(x.reason,'STALE_DUPLICATE_FRAME');
 assert.equal(s.branches.EXACT_V493__FROZEN_V493.entries,count);
 assert.equal(s.brokerOrdersEnabled,false);
 assert.throws(()=>lab.advance({...s,brokerOrdersEnabled:true},
  frame(T+30000,79800),dependencies),/AUTHORITY/);
});
test('branch accounting/summary is isolated with entry/exit factorial evidence',()=>{
 const s=lab.initial(T-180001);
 lab.advance(s,frame(T,80000),dependencies);
 const summary=lab.summary(s);
 assert.equal(Object.keys(summary.branches).length,4);
 assert.equal(summary.mode,'SHADOW_ONLY');
 assert.equal(summary.brokerOrdersEnabled,false);
 assert.equal(summary.decisionImpact,false);
 assert.ok(summary.branches.EXACT_V493__CONTINUATION_SUPERVISOR);
});

test('additive shadow migration preserves ongoing position and historical accounting',()=>{
 const s=lab.initial(T-180001);
 lab.advance(s,frame(T,80000),dependencies);
 const b=s.branches.EXACT_V493__FROZEN_V493;
 const originalAt=b.position.entryAt;
 delete b.entriesByDirection;
 delete b.blockedByDirection;
 delete b.lastExit;
 const migrated=lab.migrate(s);
 assert.equal(migrated.branches.EXACT_V493__FROZEN_V493.position.entryAt,originalAt);
 assert.equal(migrated.branches.EXACT_V493__FROZEN_V493.entriesByDirection.long,1);
 assert.equal(migrated.branches.EXACT_V493__FROZEN_V493.blockedByDirection.short,0);
});
