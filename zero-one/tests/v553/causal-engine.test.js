'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT=path.resolve(__dirname,'../..');
const D=require('../../modules/v553/decision'),
 M=require('../../modules/v553/market'),
 S=require('../../modules/v553/source'),
 P=require('../../modules/v553/paper'),
 R=require('../../modules/v553/runner'),
 H=require('../../scripts/boonolab-v553-handoff'),
 Audit=require('../helpers/asof-audit-14d');
const old=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v552-paper-state.json')));
function fakeMigration(){
 return P.fromV552(old,{sourceHash:'fixture-sha',
  frozenSourceHash:'fixture-sha',oldProcessStopped:true,
  handoffAt:old.lastObservationAt+1});
}
test('V553 is a separate autonomous PAPER policy; no previous decision import',()=>{
 assert.equal(D.VERSION,'v5.5.3-live-causal-price-market-paper-v1');
 assert.equal(P.VERSION,'v5.5.3-paper-ledger-v1');
 assert.equal(P.HARD_RISK_BTC_USD,500);
 assert.equal(P.TAKER,.0005);
 assert.equal(P.NOTIONAL,1500);
 for(const f of ['source','market','decision','paper','runner']){
  const code=fs.readFileSync(path.join(ROOT,'modules/v553/'+f+'.js'),'utf8');
  for(const bad of ["require('../v552", "require('../v551",
   "require('../v5/decision","brokerClient","fundedBroker",
   "openOrder("])assert.equal(code.includes(bad),false,f+' '+bad);
 }
});
test('the V552 account is handed to V553 once with every completed trade intact',()=>{
 const n=fakeMigration();
 H.parity(old,n);
 P.verify(n);
 assert.equal(n.completed,old.completed);
 assert.equal(n.equityUsd,old.equityUsd);
 assert.equal(n.feesUsd,old.feesUsd);
 assert.equal(n.startedAt,old.startedAt);
 assert.equal(n.lastObservationAt,old.lastObservationAt);
 assert.equal(n.pre553Completed,old.completed);
 assert.equal(n.newPolicyClosed,0);
 assert.equal(n.newPolicyNetUsd,0);
 assert.equal(n.brokerOrdersEnabled,false);
 assert.ok(n.history.every(x=>x.historicalPolicy&&x.historicalFromV552));
 assert.equal(n.memory.version,'v553-causal-chain-memory-v1');
 assert.equal(n.memory.opportunity,null);
 assert.equal(n.memory.threat,null);
 assert.equal(n.migratedFrom.engine,'V552');
 if(old.position){
  assert.deepEqual(n.position.entryContext,old.position.entryContext);
  assert.equal(n.position.entryAt,old.position.entryAt);
  assert.equal(n.position.entryPrice,old.position.entryPrice);
  assert.equal(n.position.mfePriceUsd,old.position.mfePriceUsd);
  assert.equal(n.position.maePriceUsd,old.position.maePriceUsd);
 }
 assert.throws(()=>P.fromV552({...old,engine:'V551'},{
  sourceHash:'x',frozenSourceHash:'x',oldProcessStopped:true,
  handoffAt:old.lastObservationAt+1}),/UNTRUSTED/);
});
test('old Cross3 from a previous trade can never buy a new admission',()=>{
 const s=fakeMigration();
 s.position=null;
 s.lastExit={at:s.lastObservationAt-100,tradeNo:s.completed};
 s.memory.lastExit={...s.lastExit};
 const at=s.lastObservationAt+5000,price=62000;
 const d={version:P.POLICY,brokerOrdersEnabled:false,
  asOf:at,quality:'DATA_OK',action:'ENTER_LONG',
  reason:'ATTEMPT_TO_RECYCLE',market:{admissionAllowed:true},
  parentE15:{id:'long|E15:X'},
  opportunity:{id:'oldCross3',direction:'long',
   startedAt:s.lastExit.at,confirmations:99}};
 const x=P.step(s,d,{ts:at,price,
  tickAgeMs:10,sourceAgeMs:10});
 assert.equal(x.event,null);
 assert.equal(x.reason,'NO_FRESH_QUALIFIED_POST_EXIT_CAUSAL_CHAIN');
 assert.equal(s.position,null);
});
test('PAPER hard risk keeps working even if the new structural policy says HOLD',()=>{
 const s=fakeMigration();
 s.position={direction:'long',entryAt:s.lastObservationAt-500000,
  entryPrice:63000,lastPrice:63000,entryFeeUsd:.75,
  mfePriceUsd:150,maePriceUsd:20,lastNetPnlUsd:0,
  entryPolicyVersion:'historical-test',entryContext:{},opportunityId:'x',
  campaignId:'long|E15'};
 const ts=s.lastObservationAt+5000;
 const decision={version:P.POLICY,brokerOrdersEnabled:false,
  asOf:ts,quality:'DATA_OK',action:'HOLD',reason:'HOLD_TEST'};
 const before=s.completed;
 const x=P.step(s,decision,{ts,price:62490,
  tickAgeMs:10,sourceAgeMs:10});
 assert.ok(x.trade);
 assert.equal(x.trade.tradeNo,before+1);
 assert.equal(x.trade.exitReason,'V553_HARD_RISK_500_BTC_PRICE_USD');
 assert.equal(s.completed,before+1);
 assert.equal(s.position,null);
 assert.equal(s.memory.opportunity,null);
 assert.equal(s.memory.lastExit.at,ts);
 assert.equal(s.newPolicyClosed,1);
});
test('native E15 is independent market context, never replaced by closed Cross15',()=>{
 const c=fs.readFileSync(path.join(ROOT,'modules/v553/decision.js'),'utf8');
 assert.ok(c.includes('E15_CONTEXT_NOT_ENTRY_AUTHORITY'));
 assert.ok(c.includes('E15_PARENT_CONFIRMED'));
 assert.ok(!c.includes('TRANSFER_ACCEPTED'));
 assert.ok(!c.includes('mem.cross3='));
 assert.ok(!c.includes('mem.episode='));
});
test('Live exits never depend on profitability or a second respiration',()=>{
 const c=fs.readFileSync(path.join(ROOT,'modules/v553/decision.js'),'utf8');
 assert.ok(!c.includes('economicGainAtRisk'));
 assert.ok(!c.includes('structuralRecovery'));
 assert.ok(!c.includes('reclaimedAfterRespiration'));
 assert.ok(!c.includes('gainFloor'));
 assert.ok(c.includes('deepeningLive'));
 assert.ok(c.includes('liveSamples>=2'));
});
test('market evidence is source-ASOF, entry only, retains the last contested state',()=>{
 const asOf=Date.parse('2026-11-20T08:40:00+01:00');
 // The active Bâton JSON is a rolling buffer, not a permanent historic.
 // Use actual archived as-of 30s observations, never invented price data.
 const input=Audit.load(S,asOf);
 assert.ok(input.samples.every(x=>x.ts<=asOf));
 assert.ok(input.bars.m15.every(x=>x.ts+900000<=asOf));
 const o=D.sensor(input,asOf,input.current.lastPrice);
 const r=M.calculate(input,o);
 assert.equal(r.brokerOrdersEnabled,false);
 assert.equal(r.source,'INDEPENDENT_BATON_AND_CLOSED_MCB_ASOF');
 assert.ok(['SUSPEND_NEW','OPEN_OBSERVING','UNRECOGNIZED'].includes(r.status));
 assert.ok(r.place?.sourceAt<=asOf);
 const c=fs.readFileSync(path.join(ROOT,'modules/v553/decision.js'),'utf8');
 assert.ok(c.includes('PREVIOUS_CHOP_UNRESOLVED_NO_NEW_TRANSFER'));
 assert.ok(c.includes('market.rawStatus=market.status'));
});
let historic=null;
function replay(){
 if(!historic){
  const out=cp.execFileSync(process.execPath,
   [path.join(ROOT,'scripts/boonolab-v553-replay-asof.js'),
    '20','21','22','24'],{cwd:ROOT,encoding:'utf8',
     timeout:30000,maxBuffer:2000000});
  historic=JSON.parse(out);
 }
 return historic;
}
test('read-only replay: losses #21/#22 challenged before hard risk without gain floor',()=>{
 const r=replay();
 for(const id of [21,22]){
  const x=r.positions.find(t=>t.trade===id);
  assert.ok(x.firstExit,'#'+id+' should receive structural exit');
  assert.ok(x.firstExit.reason.includes('CROSS15_LIVE'));
  assert.ok(x.hypotheticalExitNet>x.netActual);
  assert.ok(x.firstLive<x.actualExitAt);
 }
});
test('read-only replay: false Live #20 and #24 are not immediately liquidated',()=>{
 const r=replay();
 for(const id of [20,24]){
  const x=r.positions.find(t=>t.trade===id);
  assert.equal(x.firstExit,null,
   '#'+id+' should continue until real historic outcome');
 }
});
test('read-only replay: emerging SHORT before the confirmed 15m Cross at 15:54',()=>{
 const f=replay().flat[0].firstEntry;
 assert.ok(f);
 assert.equal(f.direction,'short');
 assert.ok(f.at.includes('2026-11-19 15:53'));
 assert.equal(f.market,'EMERGING_DIRECTION');
 assert.ok(f.chainAt<f.at);
});
test('financial summary reports new-policy and historical totals independently',()=>{
 const s=fakeMigration(),v=R.summary(s);
 assert.equal(v.engine,'V553');
 assert.equal(v.policyVersion,D.VERSION);
 assert.equal(v.completed,s.completed);
 assert.equal(v.equityUsd,s.equityUsd);
 assert.equal(v.pre553Completed,s.pre553Completed);
 assert.equal(v.newPolicyClosed,0);
 assert.equal(v.newPolicyNetUsd,0);
 assert.equal(v.migratedFrom.engine,'V552');
});
