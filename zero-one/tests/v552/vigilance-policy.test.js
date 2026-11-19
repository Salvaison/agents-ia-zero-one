'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const D=require('../../modules/v552/decision');
const V=require('../../modules/v552/vigilance');
const S=require('../../modules/v552/source');
const P=require('../../modules/v552/paper');
const T=1795000000000,MIN=60000;
const mk=(at,props={})=>({
 at,auditAt:at,price:64000,healthy:true,
 mcb3:{direction:'long',lbw:4,bw:1,confirmedNative:null},
 mcb15:{direction:'long',gap:4,lbw:10,bw:6,slope3:2,
  slope15:8,bwSlope3:2,bwSlope15:6,gapSlope3:0,
  closed:{direction:'long',sourceAt:at-15*MIN,knownAt:at,
   confirmedCross:null}},
 mf:{slow:10,fast:5,slope15:1,slope3:1},
 pm:{live:12,p3:25,p15:40},
 place:{ma3:64100,ma15:63800},
 _newCross3:null,...props});
const baseline=[
 ...Array.from({length:12},(_,i)=>({
  ts:T-(12-i)*30000,live15LbwRaw:4+i*.1,
  live15BwRaw:3+i*.1,lastPrice:64000+i}))
];
test('V552 is a new independent policy/ledger, no V543 or V551 decision imports',()=>{
 assert.equal(D.VERSION,'v5.5.2-lbw15-live-vigilance-campaign-paper-v1.2');
 assert.equal(P.VERSION,'v5.5.2-paper-ledger-v1');
 for(const file of ['source.js','decision.js','paper.js','runner.js','vigilance.js']){
  const s=fs.readFileSync(path.join(ROOT,'modules/v552',file),'utf8');
  for(const bad of ["require('../v5/decision-v543')","require('../v551/decision')",
   "require('../v551/paper')","require('../v5/runner-v543')",'brokerClient','ccxt'])
   assert.equal(s.includes(bad),false,file+' imported '+bad);
 }
});
test('PENTE15_LIVE vigilance opens BEFORE any Cross15 Live (without order)',()=>{
 const mem=V.initial();
 V.assess(mk(T,{mcb15:{...mk(T).mcb15,slope3:3,
  bwSlope3:2,gapSlope3:1}}),mem,{direction:'long'},baseline);
 const r=V.assess(mk(T+30000,{price:63970,
  mcb15:{...mk(T).mcb15,slope3:-1,bwSlope3:2,gapSlope3:-3,
   direction:'long',gap:1}}),mem,{direction:'long'},baseline);
 assert.ok(r.watch);
 assert.equal(r.watch.reason,'LBW15_LIVE_PENTE_BREAK');
 assert.equal(r.watch.firstLiveAt,null);
 assert.ok(r.events.some(e=>e.type==='WATCH_OPEN'));
 assert.equal(r.brokerOrdersEnabled,false);
});
test('cross15 Live escalates, return cancels old live evidence; no automatic EXIT',()=>{
 const mem=V.initial();
 V.assess(mk(T),mem,{direction:'long'},baseline);
 const r=V.assess(mk(T+30000,{price:63980,
  mcb3:{direction:'short'},mcb15:{...mk(T).mcb15,
   direction:'short',gap:-1,slope3:-3,bwSlope3:1,gapSlope3:-2}}),
  mem,{direction:'long'},baseline);
 assert.equal(r.watch.firstLiveAt,T+30000);
 assert.equal(r.counterConvinces,false);
 const ret=V.assess(mk(T+60000,{price:64020}),mem,
  {direction:'long'},baseline);
 assert.equal(ret.watch,null);
 assert.ok(ret.events.some(e=>e.type==='CROSS15_LIVE_REJECTED_RETURN'));
 assert.equal(mem.rejected,1);
});
test('near horizontal LBW15 and BW15 is descriptive UNCERTAIN, not trade command',()=>{
 const mem=V.initial();
 const r=V.assess(mk(T,{mcb15:{...mk(T).mcb15,slope3:.03,
  bwSlope3:.02,gapSlope3:.01}}),mem,null,
  [...baseline,{ts:T-30000,live15LbwRaw:8,live15BwRaw:7}]);
 assert.equal(r.relativeFlattening,true);
 assert.equal(r.phase,'POLARITY_UNCERTAIN');
 assert.equal(r.counterConvinces,false);
});
test('early exit needs owner-opposed persistent Live plus reclaimed price, not MF15 approval',()=>{
 const pos={direction:'long',entryAt:T-800000,entryPrice:63800,
  mfePriceUsd:800};
 const o=mk(T,{price:64100,mcb3:{direction:'short'},
  mcb15:{...mk(T).mcb15,direction:'short',gap:-3,
   gapSlope3:-2},mf:{slow:-12,slope15:-2,slope3:-4},
  pm:{live:-20,p3:-80}});
 const attention={phase:'COUNTER_TRANSFER_PRODUCTIVE',
  watch:{at:T-30000,firstLiveAt:T-30000,challenger:'short'},
  evidence:{priceFromLive:50},counterConvinces:true,
  protectiveTransfer:true};
 const rv=D.positionReview(o,{campaign:{direction:'long'}},pos,attention);
 assert.equal(rv.action,'EXIT_LONG');
 assert.equal(rv.reason,'V552_LIVE15_STRUCTURAL_PRICE_PROTECT_ECONOMIC_GAIN');
 assert.equal(rv.positionReview.adversePrice,true);
 assert.equal(rv.positionReview.adverseMF,true);
 assert.equal(rv.positionReview.adversePM,true);
});
test('SHORT holds when structural counter-attack is NOT requalified despite MF changes',()=>{
 const pos={direction:'short',entryAt:T-100000,entryPrice:65000,
  mfePriceUsd:500};
 const o=mk(T,{price:64600,mcb3:{direction:'long'},
  mcb15:{...mk(T).mcb15,direction:'long',gap:2,gapSlope3:2},
  mf:{slow:-40,slope15:0.3,slope3:3},pm:{live:20,p3:45}});
 const attention={phase:'COUNTER_TRANSFER_PRODUCTIVE',
  watch:{at:T-30000,firstLiveAt:T-30000,challenger:'long'},
  evidence:{priceFromLive:50},counterConvinces:true};
 const r=D.positionReview(o,{campaign:{direction:'short'}},pos,attention);
 assert.equal(r.action,'HOLD');
 assert.equal(r.positionReview.slowFlowAffirms,false);
});
test('no early exit merely because MF3 and price counter on one audit',()=>{
 const pos={direction:'short',entryAt:T-100000,entryPrice:65000,mfePriceUsd:240};
 const o=mk(T,{price:64940,mcb3:{direction:'long'},
  mcb15:{...mk(T).mcb15,direction:'long',gap:.1,gapSlope3:2},
  mf:{slow:10,slope15:1,slope3:2},pm:{live:15,p3:20}});
 const att={phase:'CROSS15_LIVE_WATCH',
  watch:{challenger:'long',at:T,firstLiveAt:T},
  counterConvinces:false};
 assert.equal(D.positionReview(o,{campaign:{direction:'short'}},pos,att).action,'HOLD');
});
test('15m closed cross remains position-only exit, not auto reverse entry',()=>{
 const pos={direction:'long',entryAt:T-100000,entryPrice:64000,mfePriceUsd:40};
 const o=mk(T,{mcb15:{...mk(T).mcb15,closed:{
  direction:'short',confirmedCross:{direction:'short',
   knownAt:T-50000,from:'long'}}}});
 const r=D.positionReview(o,{campaign:{direction:'long'}},pos,null);
 assert.equal(r.action,'EXIT_LONG');
 assert.equal(r.reason,'V552_CONFIRMED_15M_POSITION_EXIT');
});
test('explicit handoff preserves old 11+ historical trades, fees, equity, and open position',()=>{
 const old=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v551-paper-state.json')));
 const oldBefore=JSON.stringify(old),at=old.lastObservationAt+1;
 const manifest={oldProcessStopped:true,sourceHash:'unit-test-sha',
  frozenSourceHash:'unit-test-sha',handoffAt:at};
 const x=P.fromV551(old,at,manifest);
 assert.equal(x.version,'v5.5.2-paper-ledger-v1');
 assert.equal(x.completed,old.completed);
 assert.equal(x.pre552Completed,old.completed);
 assert.equal(x.equityUsd,old.equityUsd);
 assert.equal(x.feesUsd,old.feesUsd);
 assert.equal(x.realizedUsd,old.realizedUsd);
 assert.deepEqual(x.usedEpisodes,old.usedEpisodes);
 assert.equal(x.position?.entryAt,old.position?.entryAt);
 assert.equal(x.position?.entryPolicyVersion,old.position?.entryPolicyVersion);
 assert.equal(x.memory.vigilance.version,V.VERSION);
 assert.equal(x.history.every(t=>t.sourceEngine==='V551'),true);
 assert.equal(JSON.stringify(old),oldBefore);
 assert.throws(()=>P.fromV551(old,at,{...manifest,oldProcessStopped:false}),/REFUSE/);
});
test('as-of closed 15m data ignores future 15m candle',()=>{
 const before=[
 {ts:T-30*MIN,lbw:2,bw:4},
 {ts:T-15*MIN,lbw:4,bw:1}];
 const early=before.filter(x=>x.ts+15*MIN<=T-1);
 const later=before.filter(x=>x.ts+15*MIN<=T);
 assert.equal(S.closedWave(early).confirmedCross,null);
 assert.equal(S.closedWave(later).confirmedCross.direction,'long');
});
test('preserves 500 BTCUSD adverse hard risk, including carried positions',()=>{
 const old=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v551-paper-state.json')));
 const at=old.lastObservationAt+1;
 const state=P.fromV551(old,at,{oldProcessStopped:true,
  sourceHash:'test',frozenSourceHash:'test',handoffAt:at});
 if(!state.position)return; // only relevant when real old state has open
 const px=state.position.entryPrice+
   (state.position.direction==='long'?-501:501);
 const ts=at+5000;
 const d={version:D.VERSION,asOf:ts,quality:'DATA_OK',
  brokerOrdersEnabled:false,action:'HOLD'};
 const r=P.step(state,d,{ts,price:px,tickAgeMs:0,sourceAgeMs:0});
 assert.ok(r.trade);
 assert.equal(r.trade.exitReason,'V552_HARD_RISK_500_BTC_PRICE_USD');
 assert.equal(r.trade.inheritedPosition,true);
 assert.equal(r.state.newPolicyClosed,1);
 assert.equal(r.state.brokerOrdersEnabled,false);
});
