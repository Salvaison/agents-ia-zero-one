'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const m=require('../../modules/attention/boonolab-mcb3-first-mcb15-shadow');
const NOW=1795000000000,MS=60000,M15=900000;
const bar=(ts,lbw,bw)=>({ts,lt_blue_wave:lbw,blue_wave:bw});
const closed=[
 bar(NOW-3*M15,15,20),bar(NOW-2*M15,2,12),
 bar(NOW-M15,-4,1)
];
const history=[
 {ts:NOW-15*MS,live15LbwRaw:-2,live15BwRaw:1,
  lastPrice:64500,liveLbw:-5,liveBw:-6},
 {ts:NOW-3*MS,live15LbwRaw:-5,live15BwRaw:0,
  lastPrice:64400,liveLbw:-12,liveBw:-9},
 {ts:NOW-10000,live15LbwRaw:-7,live15BwRaw:-1,
  liveLbw:-15,liveBw:-10,live15MfRaw:-5,liveMoneyFlow:-9,
  volumeFenetreBtc:15,winSec:30,lastPrice:64340}
];
function decision({
 at=NOW,dir='short',parent='short',id='short|E15:A',
 crossAt=NOW-1000,quality='DATA_OK',lbw15=-7,bw15=-1,
 mf15=-.1,mf3=-1,pm=-25
}={}){
 return {asOf:at,price:64325,quality,action:'WAIT',
  readings:{
   structural54:{director:parent,campaignId:id,
    currentLbw15:lbw15,currentBw15:bw15,
    structuralPivotKnownAt:NOW-3600000,
    nativeE15:{confirmed:{direction:parent,availableAt:NOW-10000}},
    nativeE3:{confirmed:{direction:dir,availableAt:NOW-5000}},
    testedTerritory:{validated:false,status:'NONE'}},
   geometry:{cross3:{ts:crossAt,direction:dir},
    cross15:{ts:NOW-10*MS,direction:'short'}},
   conversion:{pm3:-100,pm5:-85,pmCombined:pm,
    mf15Delta10m:mf15,mf3Delta3m:mf3,
    pmSinceBaton:-5},
   maContract:{ma3:{state:'CONTACT'},ma15:{state:'FAR'}},
   place:{nearest:{key:'WR',price:65000}}
  }};
}
test('MCB3 is the first entry hypothesis, without wait for E3 confirmed and without 18 or 25 minutes',()=>{
 const d=decision({dir:'long',parent:'short',crossAt:NOW-40*MS});
 d.readings.structural54.nativeE3={confirmed:null,live:null};
 const o=m.extract(d,{audit:history,bars15:closed});
 const view=m.adjudicate(o);
 assert.equal(view.opportunity.firstAuthority,'MCB3_CROSS');
 assert.equal(view.structural.mc3Direction,'long');
 assert.equal(view.structural.parent,'short');
 assert.equal(view.structural.m15Verdict,'TACTICAL_COUNTERPARENT');
 assert.equal(view.opportunity.newThresholdsAdded,0);
 assert.equal(view.decisionImpact,false);
});
test('15m wave is confirmed only after close of 15m candle, never by Live',()=>{
 const b=[bar(NOW-2*M15,12,20),bar(NOW-M15,30,20)];
 const notYet=m.confirmed15(b,NOW-2);
 const closed=m.confirmed15(b,NOW);
 assert.equal(notYet.crossConfirmed,false);
 assert.equal(notYet.direction,'short');
 assert.equal(closed.crossConfirmed,true);
 assert.equal(closed.direction,'long');
 assert.ok(closed.availableAt<=NOW);
});
test('raw BW/LBW15 contact is NOT automatically a confirmed transfer or stop',()=>{
 const d=decision({lbw15:0,bw15:0});
 const o=m.extract(d,{audit:history,bars15:closed});
 const view=m.adjudicate(o);
 assert.equal(view.structural.confirmedCrossStatus,'NO_NEW_CONFIRMED_CROSS');
 assert.equal(view.mode,'SHADOW_ONLY');
 assert.equal(view.opportunity.placeContext.territoryEvidence,null);
 assert.equal(view.positionAttention,null);
});
test('MF15 slight favorable and MF3 positive reinforce; slow MF may lead against tactical MF3',()=>{
 const d=decision({dir:'short',mf15:-.01,mf3:-2});
 const view=m.adjudicate(m.extract(d,{audit:history,bars15:closed}));
 assert.equal(view.structural.mfRelation,'MF15_AND_MF3_COHERENT');
 const other=decision({dir:'long',mf15:-.01,mf3:2});
 assert.equal(m.adjudicate(m.extract(other,{audit:history,bars15:closed}))
  .structural.mfRelation,'MF3_LEADS_AGAINST_SLOW_FLOW');
});
test('MA contact is not treated as defended border, and risk stop has no fabricated oracle',()=>{
 const o=m.extract(decision(),{audit:history,bars15:closed});
 const v=m.adjudicate(o);
 assert.equal(v.opportunity.placeContext.ma3,'CONTACT');
 assert.equal(v.opportunity.placeContext.territoryLabel,'NONE');
 assert.equal(v.opportunity.proposed,'MCB3_TACTICAL_EPISODE_OBSERVED');
 assert.equal(v.opportunity.reason.includes('NO_ENTER_OR_EXIT_IN_SHADOW'),true);
 assert.equal(JSON.stringify(v).includes('stopPrice'),false);
});
test('parent persists across MCB3 flip, counterattack and resumption in same parent',()=>{
 const s=m.initial(NOW-2000);
 const start=m.extract(decision({crossAt:NOW-3000}),{audit:history,bars15:closed});
 m.observe(s,start);
 assert.equal(s.campaign.tacticalAttempts,0);
 const a=m.extract(decision({at:NOW+MS,dir:'long',crossAt:NOW+MS-1000}),
  {audit:history,bars15:closed,now:NOW+MS});
 const first=m.observe(s,a);
 assert.equal(first.result.campaignPhase,'COUNTERATTACK');
 assert.equal(first.result.structural.parent,'short');
 assert.equal(s.campaign.counterAttempts,1);
 const b=m.extract(decision({at:NOW+2*MS,dir:'short',crossAt:NOW+2*MS-1000}),
  {audit:history,bars15:closed,now:NOW+2*MS});
 const second=m.observe(s,b);
 assert.equal(second.result.campaignPhase,'PARENT_RESUMPTION_ATTEMPT');
 assert.equal(s.campaign.resumptions,1);
 assert.equal(s.campaign.parentId,'short|E15:A');
});
test('same MCB3 cross does not create a second episode or new entry',()=>{
 const s=m.initial(NOW-5000);
 const a=m.extract(decision({crossAt:NOW-2000}),{audit:history,bars15:closed});
 m.observe(s,a);
 const prior=s.campaign.tacticalAttempts;
 const later=m.extract(decision({at:NOW+MS,crossAt:NOW-2000}),
  {audit:history,bars15:closed,now:NOW+MS});
 const o=m.observe(s,later);
 assert.equal(o.result.tacticalEpisode.id,'short|'+(NOW-2000));
 assert.equal(s.campaign.tacticalAttempts,prior);
});
test('confirmed opposite cross15 requests review, not exit; other MC3 counter only local review',()=>{
 const a=m.extract(decision({dir:'long',parent:'short',
  crossAt:NOW-5000}),{audit:history,bars15:closed});
 const baseline=m.adjudicate(a,{position:{direction:'short'}});
 assert.equal(baseline.positionAttention.exitRequested,null);
 assert.equal(baseline.positionAttention.requiresReview,
  'MCB3_COUNTER_REVIEW_LOCAL_RISK_NOT_PARENT_EXIT');
 const closedOpp=[
  bar(NOW-2*M15,20,25),bar(NOW-M15,28,21)
 ];
 const opposition=m.adjudicate(m.extract(decision({dir:'long',parent:'short'}),
   {audit:history,bars15:closedOpp}),{position:{direction:'short'}});
 assert.equal(opposition.positionAttention.requiresReview,
  'CONFIRMED_15M_OPPOSITE_REVIEW_POSITION_EARLY');
 assert.equal(opposition.decisionImpact,false);
});
test('as-of future confirmed 15m bars and future audit rows do not affect snapshot',()=>{
 const d=decision();
 const future=[...closed,bar(NOW,90,-90)];
 const base=m.extract(d,{audit:history,bars15:closed});
 const withFuture=m.extract(d,{audit:[...history,{...history.at(-1),
  ts:NOW+MS,lastPrice:80000}],bars15:future});
 assert.deepEqual(withFuture,base);
});
test('paper safety and version contracts; runner never calls paper.step',()=>{
 const s=m.initial();
 assert.equal(s.mode,'SHADOW_ONLY');assert.equal(s.brokerOrdersEnabled,false);
 assert.equal(s.decisionImpact,false);
 assert.throws(()=>m.assertState({...s,decisionImpact:true}),/UNTRUSTED/);
 const code=fs.readFileSync(path.join(__dirname,
  '../../modules/attention/boonolab-mcb3-first-mcb15-shadow-runner.js'),'utf8');
 for(const forbidden of ['paper.step(', 'write(PAPER', 'broker.step(', 'orderClient'])
  assert.equal(code.includes(forbidden),false,forbidden);
 assert.equal(code.includes('v52-paper-state.json'),true);
 assert.equal(code.includes('v55-paper-state.json'),true);
});
