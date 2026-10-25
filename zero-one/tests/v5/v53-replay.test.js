'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs');
const path=require('node:path'),v53=require('../../modules/v5/decision-v53'),
 v522=require('../../modules/v5/decision-v522'),causal=require('../../modules/v5/v53-causal');
const ROOT=path.resolve(__dirname,'../..'),auditPath=path.join(ROOT,'data/audit-history.json');
const historyPath=path.join(ROOT,'data/v52-paper-state.json');
function fixture(){
 if(!fs.existsSync(auditPath)||!fs.existsSync(historyPath))return null;
 const runner=require('../../modules/v5/runner-v52');
 return {rows:JSON.parse(fs.readFileSync(auditPath,'utf8')),
  all:runner.latest(),history:JSON.parse(fs.readFileSync(historyPath,'utf8')).history};
}
test('replay historical V5.2/522 entry decisions without reading future Audit rows',t=>{
 const fx=fixture();
 if(!fx||fx.history.length<6){t.skip('Amsterdam mounted replay missing');return;}
 const started=fx.history[0].entryAt-15*60000;
 const targets=[...fx.history.slice(0,6)].map(tr=>tr.entryAt);
 for(let i=0;i<targets.length;i++){
  const at=targets[i],tr=fx.history[i],samples=fx.rows.filter(x=>x.ts<=at).slice(-450),
    last=samples.at(-1);
  const input={...fx.all,samples,levels:[],now:at,price:tr.entryPrice,
   startedAt:started,sourceAgeMs:at-last.ts,tickAgeMs:0};
  const was=v522.evaluate(input),newr=v53.evaluate(input);
  console.log('REPLAY',tr.tradeNo,'old',was.action,was.reason,
   'new',newr.action,newr.reason,
   'posture',newr.readings?.mcb15?.phase,
   'stage',newr.readings?.marketStage?.maturity,
   'MF',newr.readings?.flow15?.coherence,
   'risk',newr.invalidation?.distanceUsd);
  assert.equal(newr.brokerOrdersEnabled,false);
  assert.ok(newr.action==='WAIT'||newr.action==='ENTER_LONG'||newr.action==='ENTER_SHORT');
 }
});
test('old reclaim cannot remain DEFENDED after an intervening decisive failure',()=>{
 const step=180000,t=1792906500000;
 const closes=[99,101,104,100.3,102.1,95,96,99,101,104];
 const bars=closes.map((v,i)=>({ts:t+i*step,low:v-.5,high:v+.5,close:v}));
 const a=causal.retestCausal(bars,100,'long',12,t+closes.length*step);
 assert.equal(a,null,'prior cross/retest cannot survive material loss with no new retest');
});
test('confirmed 15m posture is separate from structural pivot memory',()=>{
 const now=1792916640000,sampleTs=Math.floor(now/900000)*900000;
 const samples=[{ts:now-30000,live15LbwRaw:-36,live15BwRaw:-31,live15SignalDn:-35,
   live15MfRaw:11,liveMoneyFlow:-19}];
 const bars15=[{ts:sampleTs-900000,open:80500,close:80400,low:80360,high:80600,
  lt_blue_wave:-25,blue_wave:-30,money_flow:12,wt1_cross_dn:-30}];
 const result=causal.native15(samples,bars15,now);
 assert.equal(result.crossDirection,'short');
 assert.ok(result.nativeLive,'E15 DN Live belongs to the current bar, not old structural pivot');
});

test('3m geometric evidence does not expire merely because 12 minutes elapsed',()=>{
 const dir='long',now=10000000,cross=now-31*60000;
 const base={readings:{geometry:{cross3:{direction:dir,ts:cross}},
  mcb3:{lbw:-25,bw:-35}}};
 const alive=v53.campaignStillAlive({
  now,startedAt:cross-100000,samples:[],price:80000
 },base,{liveDirection:'long'},dir);
 assert.equal(alive.active,true);
 assert.equal(alive.reason,'PERSISTENT_GEOMETRIC_CANDIDACY');
 const opposite15=v53.campaignStillAlive({
  now,startedAt:cross-100000,samples:[],price:80000
 },base,{liveDirection:'short'},dir);
 assert.equal(opposite15.active,false);
});
test('E3UP -75 at 15m upper wave +60 is reset, E3UP +45 after expansion is late',()=>{
 const now=20000000;
 const mk=(crossLevel,units)=>{
  const base={asOf:now,readings:{mcb3:{lbw:crossLevel},mcb15:{lbw:65},
   geometry:{cross3:{ts:now-20*60000,level:crossLevel,direction:'long'}},
   maturity:{progressInTypical3mRanges:units,
    incrementalRateSlowing:true}}};
  return v53.classifyCycle(base,{offensive:'long',liveDirection:'long',
   structuralMemory:'long',lbw:65},'long',{anchor:null});
 };
 const early=mk(-75,.5),late=mk(45,2.2);
 assert.equal(early.maturity,'TACTICAL_RESET_E3');
 assert.equal(early.acute,true);
 assert.equal(late.expensiveEntry,true);
});
test('MF3 and MF15 conflict cancels entry regardless of candle enthusiasm',()=>{
 const base={readings:{conversion:{pm3:60,pm5:90,pmCombined:30}}};
 const posture={mf3Delta3m:-2.4,mf15Delta10m:-3.2};
 const opposed=v53.flowEvidence(base,posture,'long');
 assert.equal(opposed.conflict,true);
 assert.equal(opposed.valid,false);
 assert.equal(opposed.coherence,'OPPOSING_FLOW');
 const recovered=v53.flowEvidence(base,{mf3Delta3m:1.2,mf15Delta10m:.3},'long');
 assert.equal(recovered.valid,true);
});
test('V5.3 migrates V5.2.2 ledger in memory preserving all trades and an open position',()=>{
 const paper=require('../../modules/v5/paper-v52');
 const legacy={...paper.initial(1000),version:paper.V522_VERSION,
  startedAt:1000,policyActivatedAt:5000,completed:6,wins:2,losses:4,
  realizedUsd:-9.0501,equityUsd:990.9499,feesUsd:9,
  usedKeys:['long|1234|REVERSAL','short|9012|CONTINUATION'],
  history:[{tradeNo:6,engine:'V5.2.2',entryPolicyVersion:
    'v5.2.2-causal-maturity-structural-invalidation',netPnlUsd:-4.8352}],
  position:{direction:'short',entryPrice:80600,entryAt:5000,
   entryPolicyVersion:'v5.2.2-causal-maturity-structural-invalidation',
   invalidationPrice:80900}};
 const s=paper.migrate(legacy,15000);
 assert.equal(s.version,paper.VERSION);
 assert.equal(s.policyActivatedAt,15000);
 assert.equal(s.completed,6);
 assert.equal(s.realizedUsd,-9.0501);
 assert.equal(s.position.direction,'short');
 assert.equal(s.position.entryPolicyVersion,legacy.position.entryPolicyVersion);
 assert.equal(s.usedKeys.length,2);
 assert.equal(s.brokerOrdersEnabled,false);
});
test('as-of night replay shows opposing 15m offensive at 09:24 despite older LONG pivot',t=>{
 const fx=fixture();
 if(!fx){t.skip('Amsterdam Audit unavailable');return;}
 const now=Date.parse('2026-10-25T08:24:15.000Z');
 const samples=fx.rows.filter(x=>x.ts<=now).slice(-450),last=samples.at(-1);
 if(!last){t.skip('asof data missing');return;}
 const result=v53.evaluate({...fx.all,samples,levels:[],now,
  price:last.lastPrice,startedAt:now-4*3600000,sourceAgeMs:now-last.ts,tickAgeMs:0});
 assert.equal(result.readings.mcb15.memoryDirection,'long');
 assert.equal(result.readings.mcb15.currentOffensive,'short');
 assert.ok(result.phase.includes('CONTESTED_SHORT'));
 assert.equal(result.candidate,'short');
 assert.equal(result.readings.economics.localRoomOnlyContext,true);
 assert.equal(result.checks.crossAgeNotVeto,true);
});
test('current 3m bar beginning does not automatically imply DATA_DEGRADED',t=>{
 const fx=fixture();
 if(!fx){t.skip('Amsterdam Audit unavailable');return;}
 const now=Date.parse('2026-10-25T07:12:04.000Z'),
  samples=fx.rows.filter(x=>x.ts<=now).slice(-450),last=samples.at(-1);
 if(!last||now-last.ts>65000){t.skip('Audit gap');return;}
 const r=v53.evaluate({...fx.all,samples,levels:[],now,
  price:last.lastPrice,startedAt:now-2*3600000,sourceAgeMs:now-last.ts,tickAgeMs:0});
 assert.equal(r.quality,'DATA_OK');
 assert.equal(r.readings.freshness.realSourceStale,false);
});
test('historical 3 trade orientations are preserved while V5.2.2 late #5 and #6 lose admission',t=>{
 const fx=fixture();
 if(!fx||fx.history.length<6){t.skip('Full history missing');return;}
 const expected=['WAIT','ENTER_LONG','WAIT','ENTER_LONG','WAIT','WAIT'];
 for(let i=0;i<6;i++){
  const h=fx.history[i],now=h.entryAt,
   samples=fx.rows.filter(x=>x.ts<=now).slice(-450),last=samples.at(-1);
  if(!last){t.skip('asof Audit missing');return;}
  const d=v53.evaluate({...fx.all,samples,levels:[],now,price:h.entryPrice,
    startedAt:fx.history[0].entryAt-1800000,sourceAgeMs:now-last.ts,tickAgeMs:0});
  assert.equal(d.action,expected[i],'historical #'+h.tradeNo+' -> '+d.reason);
 }
});
