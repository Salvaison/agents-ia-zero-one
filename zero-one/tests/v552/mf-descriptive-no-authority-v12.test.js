'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const S=require('../../modules/v552/source'),
 H=require('../helpers/asof-audit-14d'),
 D=require('../../modules/v552/decision'),
 M=require('../../modules/v552/market-quality'),
 P=require('../../modules/v552/paper');
const version='v5.5.2-lbw15-live-vigilance-campaign-paper-v1.2';
const at=Date.parse('2026-11-19T15:55:14.653+01:00');
const atCross=Date.parse('2026-11-19T15:53:14.643+01:00');
function observed(atTime=at){
 const input=H.load(S,atTime);
 const row=input.samples.at(-1);
 const o=D.sensor(input,atTime,row.lastPrice);
 return {input,o};
}
function flipMF(o,mode='reverse'){
 const x=JSON.parse(JSON.stringify(o));
 for(const k of ['slow','fast','slope15','slope3']){
  x.mf[k]=mode==='reverse'?-(x.mf[k]||0):null;
 }
 return x;
}
function evaluateCandidate(o,input,d,ep,parent='long'){
 const m=M.inspect(o,input,d,ep);
 const mem={startedAt:ep.crossAt-5000,
   campaign:{id:parent+'|E15:historical',direction:parent,phase:'COUNTERATTACK'},
   episode:{...ep,entered:false,status:'TACTICAL_HYPOTHESIS'}};
 const a=D.qualify(o,mem,null,{phase:'PENTE15_LIVE_VIGILANCE'},m);
 return {market:m,decision:a};
}
test('V552 v1.2 keeps MF15/MF3 as interpretation, never a trade-authority gate',()=>{
 assert.equal(D.VERSION,version);
 const marketSrc=fs.readFileSync(path.join(ROOT,'modules/v552/market-quality.js'),'utf8');
 const decisionSrc=fs.readFileSync(path.join(ROOT,'modules/v552/decision.js'),'utf8');
 assert.ok(marketSrc.includes('MF is DESCRIPTIVE'));
 assert.ok(decisionSrc.includes('MF15/MF3 explain a divergence'));
 assert.ok(!marketSrc.includes('phase.entryPrudence&&!mfAligned'));
 assert.ok(!decisionSrc.includes('slowMFConfirms&&heldTerritory'));
 assert.ok(!decisionSrc.includes('slowFlowAffirms&&economicGainAtRisk'));
});
test('15:55 SHORT is accepted by MCB3/LBW15/PM/price, even with MF15 still positive',()=>{
 const {input,o}=observed();
 const ep={direction:'short',id:'short|CROSS3:'+atCross,
  crossAt:atCross,crossPrice:63819.9};
 const original=evaluateCandidate(o,input,'short',ep);
 assert.ok(o.mf.slow>0,'MF15 should still be above zero at 15:55');
 assert.ok(o.mf.slope15<0,'MF15 slope should already be falling');
 assert.equal(o.mcb3.direction,'short');
 assert.equal(o.mcb15.direction,'short');
 assert.equal(o.pm.p3<0,true);
 assert.equal(o.pm.live<0,true);
 assert.equal(original.market.deferNewEntry,false,JSON.stringify(original.market));
 assert.equal(original.decision.action,'ENTER_SHORT',original.decision.reason);
 const opposite=evaluateCandidate(flipMF(o),input,'short',ep);
 const unknown=evaluateCandidate(flipMF(o,'unknown'),input,'short',ep);
 for(const x of [opposite,unknown]){
  assert.equal(x.market.deferNewEntry,original.market.deferNewEntry);
  assert.equal(x.decision.action,original.decision.action);
  assert.equal(x.decision.reason,original.decision.reason);
 }
 assert.notEqual(original.market.mfReading,opposite.market.mfReading);
});
test('contested failed crosses #14 and #15 remain deferred for PRICE reasons even if MF reverses',()=>{
 const ledger=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v552-paper-state.json')));
 for(const id of [14,15]){
  const t=ledger.history.find(v=>v.tradeNo===id);
  assert.ok(t);
  const {input,o}=observed(t.entryAt);
  const ep={direction:t.direction,id:t.episodeId,
   crossAt:Number(t.episodeId.split(':').at(-1)),
   crossPrice:t.entryPrice-(t.entryContext.qualification.cross0||0)*
    (t.direction==='long'?1:-1)};
  const original=evaluateCandidate(o,input,t.direction,ep);
  const reversed=evaluateCandidate(flipMF(o),input,t.direction,ep);
  assert.equal(original.market.deferNewEntry,true,'#'+id+' original');
  assert.equal(reversed.market.deferNewEntry,true,'#'+id+' inverted MF');
  assert.equal(original.decision.action,'WAIT');
  assert.equal(reversed.decision.action,'WAIT');
  assert.notEqual(original.market.reason,'MF15_LEVEL_OR_SLOPE_OPPOSES_NEW_ADMISSION');
  assert.notEqual(reversed.market.reason,'MF15_LEVEL_OR_SLOPE_OPPOSES_NEW_ADMISSION');
 }
});
test('historical SHORT winner #2 remains admitted, regardless of MF disagreement',()=>{
 const ledger=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v552-paper-state.json')));
 const t=ledger.history.find(x=>x.tradeNo===2);
 const {input,o}=observed(t.entryAt);
 const ep={direction:'short',id:t.episodeId,
  crossAt:Number(t.episodeId.split(':').at(-1)),
  crossPrice:t.entryPrice-(t.entryContext.qualification.cross0||0)*-1};
 const a=evaluateCandidate(o,input,'short',ep,t.entryContext.campaignDirection);
 const b=evaluateCandidate(flipMF(o),input,'short',ep,t.entryContext.campaignDirection);
 assert.equal(a.market.deferNewEntry,false);
 assert.equal(a.decision.action,'ENTER_SHORT');
 assert.equal(b.decision.action,a.decision.action);
});
test('a confirmed opposite cross holds a structurally defended position despite contrary MF',()=>{
 const t=1795104000000,pos={direction:'long',entryAt:t-600000,
  entryPrice:64000,mfePriceUsd:900};
 const o={at:t,price:64800,mcb3:{direction:'short'},
  mcb15:{direction:'short',gap:-2,gapSlope3:-2,
   closed:{direction:'short',confirmedCross:{direction:'short',knownAt:t-5000}}},
  pm:{p3:80,live:-12},
  mf:{slow:-40,slope15:-3,slope3:-5}};
 const mem={campaign:{direction:'long'}},watch={
  phase:'CROSS15_LIVE_WATCH',counterConvinces:false,
  evidence:{priceFromLive:-20}};
 const a=D.positionReview(o,mem,pos,watch);
 const b=D.positionReview(flipMF(o),mem,pos,watch);
 assert.equal(a.action,'HOLD');
 assert.equal(b.action,'HOLD');
 assert.equal(a.reason,'V552_CONFIRMED_15M_CONTEST_PRICE_DEFENDS_POSITION');
 assert.equal(a.reason,b.reason);
 const invalidated=D.positionReview({...o,price:63800,pm:{p3:-80,live:-40}},
  mem,pos,watch);
 assert.equal(invalidated.action,'EXIT_LONG');
});
test('a protected live exit requires structural counterattack and economic giveback, not MF',()=>{
 const t=1795104000000;
 const pos={direction:'long',entryAt:t-600000,entryPrice:63800,mfePriceUsd:800};
 const o={at:t,price:64100,mcb3:{direction:'short'},
  mcb15:{direction:'short',gap:-5,gapSlope3:-3,
   closed:{direction:'long',confirmedCross:null}},
  mf:{slow:100,slope15:8,slope3:10},pm:{p3:-80,live:-15}};
 const mem={campaign:{direction:'long'}};
 const watch={phase:'COUNTER_TRANSFER_PRODUCTIVE',counterConvinces:true,
  protectiveTransfer:true,watch:{at:t-30000,firstLiveAt:t-30000,
   challenger:'short'},evidence:{priceFromLive:120}};
 const a=D.positionReview(o,mem,pos,watch);
 const b=D.positionReview(flipMF(o),mem,pos,watch);
 assert.equal(a.action,'EXIT_LONG');
 assert.equal(b.action,'EXIT_LONG');
 assert.equal(a.reason,b.reason);
 const warningOnly=D.positionReview(o,mem,pos,{
  ...watch,protectiveTransfer:false});
 assert.equal(warningOnly.action,'HOLD');
});
test('MF15/MF3 classification remains visible but has no broker authority',()=>{
 const {input,o}=observed();
 const ep={id:'short|CROSS3:'+atCross,direction:'short',
  crossAt:atCross,crossPrice:63819.9};
 const a=M.inspect(o,input,'short',ep);
 assert.ok(a.mfReading);
 assert.ok(Number.isFinite(a.flowLevel));
 assert.ok(Number.isFinite(a.flow15));
 assert.equal(P.HARD_RISK_BTC_USD,500);
 assert.equal(P.NOTIONAL,1500);
 assert.equal(P.TAKER,.0005);
 const runner=fs.readFileSync(path.join(ROOT,'modules/v552/runner.js'),'utf8');
 assert.ok(!runner.includes('brokerClient'));
});
