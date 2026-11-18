'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const P=require('../../modules/v551/decision'),
 S=require('../../modules/v551/source'),
 L=require('../../modules/v551/paper');
const MIN=60000,T=1795000000000;
const mkbar=(ts,lbw,bw,mf=-2,up=null,dn=null)=>({
 ts,open:64100,high:64220,low:63800,close:64000,lbw,bw,mf,
 nativeUp:up,nativeDn:dn,ma200:64500});
function audit(ts,{g3=-2,g15=-4,price=64000,pm=-30,mf3=-10,mf15=-5}={}){
 return {ts,lastPrice:price,liveLbw:g3,liveBw:0,
  live15LbwRaw:g15,live15BwRaw:0,
  liveMoneyFlow:mf3,live15MfRaw:mf15,
  priceMove:pm,winSec:30,volumeFenetreBtc:12};
}
const aud0=audit(T,{price:64160,g3:-2,g15:-5,mf3:4,mf15:5});
const aud3=audit(T+3*MIN,{price:64120,g3:-5,g15:-6,mf3:3,mf15:4});
const aud10=audit(T+10*MIN,{price:64050,g3:-3,g15:-5,mf3:1,mf15:1});
const audCurrent=audit(T+13*MIN,{price:64000,g3:-2,g15:-4,mf3:-1,mf15:-1});
function inputs(at=T+13*MIN,rows=[aud0,aud3,aud10,audCurrent],b15=null){
 const bb=b15||[
  mkbar(T-60*MIN,20,25),mkbar(T-45*MIN,10,18),
  mkbar(T-30*MIN,-1,8),mkbar(T-15*MIN,-4,1)];
 return {asOf:at,samples:rows,bars:{
  m3:[mkbar(T-20*MIN,-4,1),mkbar(T-17*MIN,-5,2)],
  m15:bb,h1:[mkbar(T-120*MIN,-8,-5)],
  h4:[mkbar(T-300*MIN,-8,0)]},
  current:rows.at(-1),healthy:true,
  source:'SYNTH_RAW_ASOF'};
}
test('V551 new ledger is independent and cannot migrate or touch V55 or V543',()=>{
 const s=L.initial(T);
 assert.equal(s.version,'v5.5.1-paper-ledger-v1');
 assert.equal(s.capitalUsd,1000);assert.equal(s.equityUsd,1000);
 assert.equal(s.completed,0);assert.equal(s.position,null);
 assert.equal(s.brokerOrdersEnabled,false);
 assert.throws(()=>L.verify({...s,version:'v5.5-paper-ledger-v1.0'}),
  /UNTRUSTED/);
 const r=fs.readFileSync(path.resolve(__dirname,'../../modules/v551/runner.js'),'utf8');
 for(const banned of ['require(\'./decision-v543\')','require(\'./decision-v55\')',
  'v55-paper-state.json','v52-paper-state.json','paper-v55',
  'runner-v543','orderClient','privateApi'])
  assert.ok(!r.includes(banned),banned);
});
test('source reader confirms 15m only after close, no lookahead even with later bar',()=>{
 const b=[
  mkbar(T-30*MIN,-3,3),mkbar(T-15*MIN,5,1)];
 const early=b.filter(x=>x.ts+15*MIN<=T-1);
 const late=b.filter(x=>x.ts+15*MIN<=T);
 assert.equal(S.closedWave(early).confirmedCross,null);
 assert.equal(S.closedWave(late).confirmedCross.direction,'long');
 assert.equal(S.closedWave(late).confirmedCross.knownAt,T);
});
test('bootstrap does not count cross that existed before starting',()=>{
 const s=P.originalMemory(T+13*MIN-1000);
 const x=inputs();
 const d=P.evaluate(s,x,64000,T+13*MIN);
 assert.equal(d.decision.action,'WAIT');
 assert.equal(d.memory.campaign.direction,'short');
 assert.equal(d.memory.episode,null);
 assert.equal(d.memory.lastAuditAt,audCurrent.ts);
});
test('MCB3 new cross makes its own tactical event, not a parent change',()=>{
 const at=T+13*MIN,s=P.originalMemory(at-1000);
 P.evaluate(s,inputs(),64000,at);
 const t=at+30000,a=audit(t,{g3:2,g15:-4,price:64080,pm:50,
  mf3:1,mf15:-1});
 const r=P.evaluate(s,inputs(t,[aud0,aud3,aud10,audCurrent,a]),64080,t);
 assert.equal(r.decision.campaignDirection,'short');
 assert.equal(r.decision.episode.direction,'long');
 assert.equal(s.campaign.counterAttacks,1);
 assert.ok(r.decision.causalTrace.some(x=>x.family==='MCB3'&&x.type==='CROSS3_OBSERVED'));
 assert.ok(r.decision.action==='WAIT'||r.decision.action==='ENTER_LONG');
});
test('second MCB3 signal returns to same parent without inventing E15',()=>{
 const at=T+13*MIN,s=P.originalMemory(at-1000);
 P.evaluate(s,inputs(),64000,at);
 const t=at+30000,a=audit(t,{g3:3,g15:-4,price:64060,pm:50,
  mf3:1,mf15:-1});
 P.evaluate(s,inputs(t,[aud0,aud3,aud10,audCurrent,a]),64060,t);
 const t2=t+30000,b=audit(t2,{g3:-4,g15:-5,price:63840,pm:-45,
  mf3:-4,mf15:-3});
 const r=P.evaluate(s,inputs(t2,[aud0,aud3,aud10,audCurrent,a,b]),63840,t2);
 assert.equal(r.decision.campaignDirection,'short');
 assert.equal(s.campaign.resumptions,1);
 assert.equal(s.episode.direction,'short');
 assert.equal(r.decision.action,'ENTER_SHORT');
 assert.ok(r.decision.causalTrace.some(x=>x.family==='MCB3'));
});
test('MCB3 hypothesis can gain PM confirmation after cross; only actual PAPER fill consumes it',()=>{
 const at=T+13*MIN,s=P.originalMemory(at-1000);
 P.evaluate(s,inputs(),64000,at);
 // At the cross, MF and 15m agree but PM Live has not yet translated.
 const a=audit(at+30000,{g3:3,g15:4,price:64050,pm:-40,mf3:3,mf15:1});
 const pending=P.evaluate(s,inputs(a.ts,[aud0,aud3,aud10,audCurrent,a]),64050,a.ts);
 assert.equal(pending.decision.action,'WAIT');
 assert.equal(pending.decision.episode.status,'OBSERVING_CAUSAL_CONFIRMATIONS');
 // A later REAL price tick, same 3m event, now makes PM positive.
 const ts=a.ts+10000;
 const ready=P.evaluate(s,inputs(ts,[aud0,aud3,aud10,audCurrent,a]),64140,ts);
 assert.equal(ready.decision.action,'ENTER_LONG');
 assert.equal(ready.decision.episode.crossAt,a.ts);
 assert.equal(ready.decision.qualification.pm>0,true);
 // Proposal alone does NOT consume the episode. Simulated PAPER fill does.
 const account=L.initial(at-1000);account.memory=s;
 const fill=L.step(account,ready.decision,
   {ts,price:64140,tickAgeMs:0,sourceAgeMs:0});
 assert.equal(fill.reason,'ENTER_PAPER');
 assert.equal(s.episode.status,'CONSUMED');
 const again=P.evaluate(s,inputs(ts+8000,[aud0,aud3,aud10,audCurrent,a]),
  64170,ts+8000,fill.state.position);
 assert.notEqual(again.decision.action,'ENTER_LONG');
});
test('closed cross15 opposing position requests local exit without E15+MF+PM triple',()=>{
 const mem=P.originalMemory(T),pos={direction:'short',
  entryAt:T+1,entryPrice:64000,mfePriceUsd:90};
 const snap=P.sensor(inputs(),T+13*MIN,64100);
 snap.mcb15.closed.confirmedCross={
  direction:'long',from:'short',knownAt:T+12*MIN};
 snap.mcb15.closed.direction='long';
 const r=P.positionReview(snap,mem,pos);
 assert.equal(r.action,'EXIT_SHORT');
 assert.equal(r.reason,'V551_CONFIRMED_15M_CROSS_LOCAL_POSITION_EXIT');
});
test('one opposing MCB3 cross cannot automatically liquidate supported MCB15',()=>{
 const mem=P.originalMemory(T);
 mem.campaign={direction:'short'};
 const snap=P.sensor(inputs(),T+13*MIN,64000);
 snap.mcb3.direction='long';
 snap.mcb15.closed.confirmedCross=null;
 snap.mcb15.closed.direction='short';
 snap.mcb15.direction='short';
 snap.mcb15.gapSlope3=-1;
 const r=P.positionReview(snap,mem,{direction:'short',
  entryAt:T+2*MIN,entryPrice:64100});
 assert.equal(r.action,'HOLD');
});
test('candidate no threshold in minutes; real event counted only on new audit observation',()=>{
 const mem=P.originalMemory(T);
 mem.campaign={id:'short|E15:T',direction:'short',
  episodes:0,counterAttacks:0,resumptions:0,phase:'ACTIVE',
  high:64000,low:64000,startedAt:T,sourceAt:T,lastPrice:64000};
 mem.lastGap3=-5;mem.lastAuditAt=T;
 const snap=P.sensor(inputs(),T+13*MIN,64000);
 snap._newAudit=[audit(T+13*MIN,{g3:2,g15:-4})];
 P.ownMemoryStep(mem,snap);
 assert.equal(mem.episode.direction,'long');
 assert.equal(mem.campaign.counterAttacks,1);
 const count=mem.campaign.episodes;
 snap.at=T+13*MIN+5000;snap._newAudit=[];
 P.ownMemoryStep(mem,snap);
 assert.equal(mem.campaign.episodes,count);
});
test('hard adverse 500 BTC price exits without imaginary stop-level, with fees',()=>{
 const s=L.initial(T);
 s.position={direction:'short',entryAt:T+2000,entryPrice:64000,
   entryFeeUsd:0.75,mfePriceUsd:0,maePriceUsd:0,
   campaignId:'short|E15:abc',episodeId:'short|CROSS3:abc',
   entryContext:{reason:'UNIT_TEST'}};
 const d={version:P.VERSION,asOf:T+5000,quality:'DATA_OK',
  action:'HOLD',brokerOrdersEnabled:false};
 const r=L.step(s,d,{ts:T+5000,price:64501,tickAgeMs:0,sourceAgeMs:0});
 assert.equal(r.trade.exitReason,'V551_HARD_RISK_500_BTC_PRICE_USD');
 assert.equal(r.trade.tradeNo,1);
 assert.equal(r.state.position,null);
 assert.equal(r.state.completed,1);
 assert.ok(r.state.equityUsd<1000);
});
test('fees model plus used tactical episode prevents duplicate entries',()=>{
 const s=L.initial(T);
 const key='short|CROSS3:123';
 const d={version:P.VERSION,asOf:T+5000,quality:'DATA_OK',
  action:'ENTER_SHORT',brokerOrdersEnabled:false,
  episode:{id:key},campaignDirection:'short',campaignId:'short|E15:123',
  readings:{mcb3:{},mcb15:{},mf:{},pm:{},place:{},liquidity:{}},
  qualification:{},causalTrace:[]};
 const r=L.step(s,d,{ts:T+5000,price:64000,tickAgeMs:0,sourceAgeMs:0});
 assert.equal(r.reason,'ENTER_PAPER');
 assert.equal(r.state.feesUsd,.75);
 assert.equal(r.state.position.direction,'short');
 assert.equal(r.state.position.entryPolicyVersion,P.VERSION);
 assert.deepEqual(r.state.usedEpisodes,[key]);
 r.state.position=null;
 const again=L.step(r.state,{...d,asOf:T+6000},
  {ts:T+6000,price:63990,tickAgeMs:0,sourceAgeMs:0});
 assert.equal(again.reason,'EPISODE_ALREADY_USED_OR_UNAVAILABLE');
});
test('persistent false confirmed BW15 cross can return to original parent',()=>{
 const mem=P.originalMemory(T-1000);
 mem.campaign={id:'short|E15:origin',direction:'short',
  sourceAt:T-15*MIN,knownAt:T-15*MIN,startedAt:T-5*MIN,
  originPrice:64100,high:64120,low:63980,lastPrice:64000,
  episodes:0,counterAttacks:0,resumptions:0,phase:'ACTIVE',
  crossed15Count:0,transfer:null};
 mem.last15ClosedAt=T-30*MIN;
 mem.lastGap3=-2;mem.lastAuditAt=T-30000;
 const d=P.sensor(inputs(),T+13*MIN,64000);
 d.mcb15.closed={direction:'long',sourceAt:T-15*MIN,
  confirmedCross:{direction:'long',from:'short',
   at:T-15*MIN,knownAt:T}};
 d.mcb15.direction='long';
 d._newAudit=[];
 P.ownMemoryStep(mem,d);
 assert.equal(mem.campaign.direction,'short');
 assert.ok(mem.campaign.transfer);
 assert.equal(mem.campaign.phase,'TRANSFER_CANDIDATE');
 const ret={...d,at:d.at+MIN};
 ret.mcb15={...d.mcb15,closed:{direction:'short',
  sourceAt:T,confirmedCross:{direction:'short',from:'long',knownAt:d.at+MIN}},
  direction:'short'};
 ret._newAudit=[];
 P.ownMemoryStep(mem,ret);
 assert.equal(mem.campaign.direction,'short');
 assert.equal(mem.campaign.transfer,null);
});
