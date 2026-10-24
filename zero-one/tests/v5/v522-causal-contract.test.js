'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),policy=require('../../modules/v5/decision-v522');
const legacy=require('../../modules/v5/decision-v52');
const ledger=require('../../modules/v5/paper-v52');
const ROOT=path.resolve(__dirname,'../..'),MCB=path.resolve(ROOT,'../data/mcb-live');
const MS=60000;
function synthetic(tf,base,period=3){
 return Array.from({length:tf},(_,i)=>({
  ts:base+i*period*MS,open:79900+i*5,high:79975+i*6,
  low:79825+i*5,close:79920+i*5,lt_blue_wave:30-i*.6,blue_wave:25+i*.1,
  money_flow:-10+i*.2
 }));
}
test('V5.2.2 keeps old PAPER ledger, positions, trade numbers, realized capital and consumed crossings',()=>{
 const oldState={...ledger.initial(1000),version:ledger.LEGACY_VERSION,
  startedAt:1000,completed:3,wins:1,losses:2,realizedUsd:-2.6443,
  equityUsd:997.3557,feesUsd:4.5,
  usedKeys:['long|4000|REVERSAL'],
  history:[{tradeNo:3,direction:'long',entryAt:3500,exitAt:4000,netPnlUsd:-2.27}],
  position:{direction:'short',entryAt:4100,entryPrice:80000,entryKey:'short|4100|CONTINUATION',
   invalidationPrice:80220}};
 const next=ledger.migrate(oldState,5000);
 assert.equal(next.version,ledger.VERSION);
 assert.equal(next.completed,3);
 assert.equal(next.history[0].tradeNo,3);
 assert.equal(next.history[0].entryPolicyVersion,'v5.2-structural-decision-paper-v0.1');
 assert.equal(next.position.entryPolicyVersion,'v5.2-structural-decision-paper-v0.1');
 assert.equal(next.startedAt,1000);
 assert.equal(next.equityUsd,997.3557);
 assert.deepEqual(next.usedKeys,['long|4000|REVERSAL']);
 assert.equal(next.brokerOrdersEnabled,false);
 assert.throws(()=>ledger.migrate({...oldState,version:'UNRECOGNISED'},5000),
  /MIGRATION_REFUSED/);
});
test('previous HIGH is not a freshly defended support or a valid LONG invalidation',()=>{
 const start=1792845360000,now=start+12*MS;
 const bars3=synthetic(24,start-24*3*MS);
 const bars15=synthetic(8,start-8*15*MS,15);
 const b={readings:{place:{nearest:{key:'MCB3_LOCAL_HIGH',price:79910}}}};
 const r=policy.structuralPlace({now,price:79920,dir:'long',bars3,bars15,
   levels:[],medianRange:130,base:b});
 assert.equal(r.nearest.key,'MCB3_LOCAL_HIGH');
 assert.equal(r.ignoredPreviousExtreme,true);
 assert.ok(!r.invalidation||!r.invalidation.reference.endsWith('HIGH'));
 if(r.invalidation)assert.ok(r.invalidation.distanceUsd>=104);
});
test('causal local pivots are available only after the succeeding 3m bar closes',()=>{
 const t=1792845000000,rows=[
  {ts:t,low:100,high:200,close:150},
  {ts:t+3*MS,low:80,high:190,close:120},
  {ts:t+6*MS,low:95,high:210,close:180}
 ];
 const piv=policy.localSwings(rows,'long');
 assert.equal(piv.length,1);
 assert.equal(piv[0].price,80);
 assert.equal(piv[0].sourceTs,t+3*MS);
 assert.equal(piv[0].availableAt,t+9*MS);
});
test('single wick through defensible structural level is not an EXIT; confirmed opposing conversion can invalidate',()=>{
 const now=1792845500000,stop=79500;
 let x=policy.evidenceAgainstPosition({
  now,price:79495,samples:[
   {ts:now-60000,lastPrice:79520},{ts:now-30000,lastPrice:79515},
   {ts:now-4000,lastPrice:79495}],
  position:{direction:'long',invalidationPrice:stop}},{
  readings:{conversion:{pm3:-60,pm5:-100}}},null,130);
 assert.equal(x.breached,true);
 assert.equal(x.persistent,false);
 x=policy.evidenceAgainstPosition({now,price:79490,
  samples:[{ts:now-65000,lastPrice:79493},{ts:now-25000,lastPrice:79496}],
  position:{direction:'long',invalidationPrice:stop}},{
  readings:{conversion:{pm3:-60,pm5:-110}}},null,130);
 assert.equal(x.persistent,true);
 x=policy.evidenceAgainstPosition({now,price:79490,
  samples:[{ts:now-65000,lastPrice:79493},{ts:now-25000,lastPrice:79496}],
  position:{direction:'long',invalidationPrice:stop}},{
  readings:{conversion:{pm3:35,pm5:110}}},null,130);
 assert.equal(x.persistent,false);
});
test('PM temporal comparison uses non-overlapping intervals (latest 3m vs preceding 2m)',()=>{
 const legacyResult={asOf:1000000,readings:{
  mcb15:{trajectory:'long',lbw:-49,extreme45m:73},
  mcb3:{lbw:35},geometry:{cross3:{ts:1000000-11*MS,level:-7.6}},
  conversion:{pm3:38.2,pm5:113,sinceCross:204.6},
  economics:{median3mRange:126.5}}};
 const p=policy.movementMaturity(legacyResult,'long',{anchor:null});
 assert.equal(p.maturity,'MATURE_IMPULSE_WAIT_NEW_CYCLE');
 assert.equal(p.phase,'POST_REVERSAL_EXPANSION');
 assert.ok(p.incrementalRateSlowing);
 assert.equal(p.cross3AgeMin,11);
 assert.equal(p.progressInTypical3mRanges,1.6);
 assert.equal(p.recent3mRateUsdPerMin,12.7);
 assert.equal(p.previousNonoverlapping2mRateUsdPerMin,37.4);
});
test('same MCB cross cannot re-enter under new campaign key after old trade consumed it',()=>{
 const ts=100000,old=ledger.initial(0);
 old.usedKeys=['long|99000|REVERSAL'];
 const d={version:policy.VERSION,action:'ENTER_LONG',quality:'DATA_OK',phase:'TEST',
  reason:'TEST',entryKey:'long|99000|long|previousPivot',
  prognosis:'TEST',asOf:ts,readings:{geometry:{cross3:{ts:99000}},
  causalChain:{campaignId:'long|previousPivot'}} ,
  invalidation:{price:79800,reference:'MCB15_OBSERVED_LOW'}};
 const r=ledger.step(old,d,{price:80000,ts,sourceAgeMs:50,tickAgeMs:50});
 assert.equal(r.event,null);
 assert.equal(r.reason,'CROSS_3M_ALREADY_CONSUMED');
});
test('genuinely new RETEST after last failed exit may requalify within the same campaign',()=>{
 const ts=1792845537000,lastExit=ts-120000,retestAt=ts-15000;
 const state=ledger.initial(ts-3600000);
 state.usedKeys=['long|1792845000000|REVERSAL'];
 state.lastAction={type:'EXIT_LONG',ts:lastExit};
 const decision={version:policy.VERSION,action:'ENTER_LONG',
  candidate:'long',quality:'DATA_OK',phase:'POST_REVERSAL_EXPANSION',
  reason:'CONVERSION_CAUSALE_EXPLOITABLE',asOf:ts,
  entryKey:'long|1792845000000|long|pivot|RETEST:'+retestAt,
  invalidation:{price:79800,reference:'RECLAIMED_3M_HIGH',kind:'ACCEPTED_RETEST'},
  readings:{geometry:{cross3:{ts:1792845000000}},
   maturity:{requalified:true,requalifiedAt:retestAt},
   causalChain:{campaignId:'long|pivot'},mcb15:{},place:{},conversion:{},economics:{}}};
 let out=ledger.step(state,decision,{price:80000,ts,sourceAgeMs:100,tickAgeMs:100});
 assert.equal(out.event.type,'ENTER_LONG');
 assert.equal(state.position.entryPolicyVersion,policy.VERSION);
 assert.equal(state.position.entryContext.invalidation.kind,'ACCEPTED_RETEST');
 const newState=ledger.initial(ts-3600000);
 newState.usedKeys=['long|1792845000000|REVERSAL'];
 newState.lastAction={type:'EXIT_LONG',ts:ts-10000};
 out=ledger.step(newState,decision,{price:80000,ts,sourceAgeMs:100,tickAgeMs:100});
 assert.equal(out.event,null);
 assert.equal(out.reason,'CROSS_3M_ALREADY_CONSUMED',
  'no backdated retest may reset an already consumed cross');
});
// Historical as-of smoke tests are deliberately IN-SAMPLE, not evidence of profit.
test('observed trade #1/#2/#3 replay: reject late setup, preserve early reversal',t=>{
 const files=[path.join(ROOT,'data/v52-paper-state.json'),path.join(ROOT,'data/audit-history.json')];
 if(files.some(x=>!fs.existsSync(x))||!fs.existsSync(path.join(MCB,'mcb_3m.csv'))){
  t.skip('Amsterdam dataset not mounted');return;
 }
 const paper=JSON.parse(fs.readFileSync(files[0],'utf8'));
 const audits=JSON.parse(fs.readFileSync(files[1],'utf8'));
 const runner=require('../../modules/v5/runner-v52');
 const all=runner.latest();
 const list=(paper.history||[]).filter(x=>x.tradeNo<=3);
 if(list.length!==3){t.skip('Initial paper archive incomplete');return;}
 const expected=[['WAIT','3M_EXTREME_SANS_RETEST_DEFENDU'],
  ['ENTER_LONG','CONVERSION_CAUSALE_EXPLOITABLE'],
  ['WAIT','IMPULSION_DEJA_MATURE_ATTENDRE_REQUALIFICATION']];
 for(let i=0;i<3;i++){
  const trade=list[i],now=trade.entryAt,
   samples=audits.filter(x=>x.ts<=now).slice(-450),last=samples.at(-1);
  assert(last,'replay Audit missing');
  // Levels are omitted: no historical level snapshot provenance is guaranteed.
  const input={...all,levels:[],samples,now,price:trade.entryPrice,
   startedAt:paper.startedAt,sourceAgeMs:now-last.ts,tickAgeMs:0};
  const d=policy.evaluate(input);
  assert.equal(d.action,expected[i][0],'trade '+(i+1)+': '+d.reason);
  assert.equal(d.reason,expected[i][1],'trade '+(i+1));
  assert.ok(d.invalidation===null||!String(d.invalidation.reference).includes('LOCAL_HIGH'));
  assert.equal(d.brokerOrdersEnabled,false);
 }
});
