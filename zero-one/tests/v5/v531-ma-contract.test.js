'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ma=require('../../modules/v5/ma-contract-v531'),
 policy=require('../../modules/v5/decision-v531'),
 old=require('../../modules/v5/decision-v53'),
 paper=require('../../modules/v5/paper-v52');
const T=1793000000000,PERIOD=180000;
function candle(i,close,lo,hi,ma200=80000){
 return {ts:T+i*PERIOD,open:close-2,close,low:lo,high:hi,
  ma200,lt_blue_wave:-35,blue_wave:-38,money_flow:-12};
}
test('contact MA200 threshold is 0.03% vs volatility-aware approach MA3 / MA15',()=>{
 const a=ma.band(80000,37.9,'3m'),b=ma.band(80000,200,'15m');
 assert.equal(a.toleranceUsd,24);
 assert.equal(a.approachUsd,48);
 assert.equal(a.departureUsd,48);
 assert.equal(b.toleranceUsd,24);
 assert.equal(b.approachUsd,100);
 assert.equal(ma.band(1000,5,'3m').toleranceUsd,5);
});
test('LIVE bullish test of MA3 is not confirmed acceptance just because it crossed',()=>{
 const rows=[
  candle(0,79890,79870,79920),
  candle(1,79920,79900,79950),
  candle(2,79970,79945,79988),
  candle(3,79942,79922,79968)];
 const now=T+4*PERIOD+10000;
 const r=ma.maPath({tf:'3m',raw:rows,now,price:80009.3,dir:'long',
  live:{barTs:T+4*PERIOD,observedAt:now-1000,value:80000}});
 assert.equal(r.inApproach,true);
 assert.equal(r.state,'TEST_PENDING');
 assert.equal(r.accepted,false);
 assert.equal(r.zone.stage,'FORMING_UNCONFIRMED');
 assert.equal(r.structureLevel,null);
 assert.equal(r.hasLive,true);
 assert.equal(r.distanceUsd,9.3);
});
test('stale LIVE MA does not backfill history or create hindsight',()=>{
 const rows=[candle(0,79950,79915,79960),candle(1,79960,79920,79965)];
 const asOf=T+2*PERIOD+1000;
 const result=ma.maPath({tf:'3m',raw:rows,now:asOf,price:80010,dir:'long',
  live:{barTs:T+5*PERIOD,observedAt:T+5*PERIOD,value:80500}});
 assert.equal(result.hasLive,false);
 assert.equal(result.ma,80000);
 assert.ok(result.lastConfirmedAt<=asOf);
});
test('after two confirmed closes above MA3 a later LIVE fluctuation is not enough to erase acceptance',()=>{
 const rows=[
  candle(0,79912,79900,79925),
  candle(1,79978,79958,80005),
  candle(2,80033,79988,80054),
  candle(3,80045,80020,80065)];
 const now=T+4*PERIOD+1000;
 const r=ma.maPath({tf:'3m',raw:rows,now,price:80037,dir:'long'});
 assert.equal(r.state,'ACCEPTED');
 assert.equal(r.confirmedSame,true);
 assert.equal(r.accepted,true);
 assert.ok(r.zone);
});
test('MF3 and MF15 quality classification distinguishes tolerance from support',()=>{
 const mk=(mf3,mf15)=>({readings:{flow15:{mf3Change:mf3,mf15Change:mf15}}});
 assert.equal(ma.quality(mk(1.1,.2),'long').grade,'REINFORCING');
 assert.equal(ma.quality(mk(4.7,-.5),'long').grade,'TACTICAL_VS_SLOW_ADVERSE');
 assert.equal(ma.quality(mk(4.7,0),'long').grade,'TACTICAL_LEADING');
 assert.equal(ma.quality(mk(-2,-1),'long').grade,'ADVERSE');
 assert.equal(ma.quality(mk(-2,-1),'short').grade,'REINFORCING');
});
test('one merged confrontation zone for nearby MA3/MA15, no five lines',()=>{
 const left={tf:'3m',ma:80000,approachUsd:50,distanceAbsUsd:15,
  inApproach:true,state:'TEST_PENDING',zone:{lower:79950,upper:80070,stage:'CONFRONTATION_REPEATED'}};
 const right={tf:'15m',ma:80025,approachUsd:85,distanceAbsUsd:40,
  inApproach:true,state:'TEST_PENDING',zone:{lower:79975,upper:80085,stage:'TEST_ZONE_FORMING'}};
 const x=ma.activeZone(left,right,80015);
 assert.equal(x.name,'JOINT_MA_CONFRONTATION');
 assert.deepEqual(x.horizons,['3m','15m']);
 assert.equal(x.lower,79950);
 assert.equal(x.upper,80085);
 assert.equal(Object.keys(x).includes('otherZones'),false);
});
test('MA15 loss cannot independently override an inherited trade exit policy',()=>{
 const t=T+PERIOD,position={direction:'long',entryPolicyVersion:old.VERSION,
  entryPrice:80000,invalidationPrice:79500};
 const bars3=[candle(0,79900,79885,79910)];
 const out=ma.evaluate({now:t,price:79900,bars3,bars15:[],position},{
  candidate:'short',readings:{flow15:{mf3Change:-1,mf15Change:-2}}});
 assert.equal(out.ma3.role,'TACTICAL');
 assert.equal(out.ma15.state,'UNKNOWN');
 assert.equal(out.entryGate,null);
});
test('as-of replay trade #5: price crossing MA before confirmation => WAIT; early #2 survives',t=>{
 const root=path.resolve(__dirname,'../..'),auditFile=path.join(root,'data/audit-history.json'),
  stateFile=path.join(root,'data/v52-paper-state.json');
 if(!fs.existsSync(auditFile)||!fs.existsSync(stateFile)){t.skip('Amsterdam history unavailable');return;}
 const audits=JSON.parse(fs.readFileSync(auditFile,'utf8'));
 const h=JSON.parse(fs.readFileSync(stateFile,'utf8')).history;
 if(h.length<5){t.skip('Trades 2/5 unavailable');return;}
 const sources=require('../../modules/v5/runner-v52').latest();
 for(const index of [1,4,8,9]){
  if(!h[index])continue;
  const tr=h[index],now=tr.entryAt,
   samples=audits.filter(x=>x.ts<=now).slice(-450),last=samples.at(-1),
   input={...sources,samples,levels:[],now,price:tr.entryPrice,
    startedAt:h[0].entryAt-300000,sourceAgeMs:now-last.ts,tickAgeMs:0};
  const d=policy.evaluate(input);
  console.log('V531_REPLAY',tr.tradeNo,d.action,d.reason,
   d.readings.maContract?.ma3?.state,d.readings.maContract?.flowQuality?.grade);
  if(tr.tradeNo===2)assert.equal(d.action,'ENTER_LONG');
  if(tr.tradeNo===5){
   assert.equal(d.action,'WAIT');
   assert.equal(d.readings.maContract.ma3.state,'TEST_PENDING');
   assert.ok(d.reason.includes('WAIT_3M_TEST_PENDING'));
  }
  if(tr.tradeNo===9){
   assert.equal(d.action,'WAIT');
   assert.equal(d.reason,'WAIT_MF15_ADVERSE_AND_MATURE_E3');
  }
 }
});
test('ledger migrates from V5.3 safely, retains historic trades, open position and zero-funded authority',()=>{
 const s=paper.initial(T);s.version=paper.V53_VERSION;s.completed=11;s.realizedUsd=-16.4039;
 s.equityUsd=983.5961;s.usedKeys=['long|1234|CAMPAIGN'];
 s.history=[{tradeNo:11,netPnlUsd:-2.92,entryPolicyVersion:old.VERSION}];
 s.position={direction:'short',entryAt:T,entryPrice:80000,
  entryPolicyVersion:old.VERSION,entryKey:'short|5|CAMPAIGN'};
 const copy=paper.migrate(s,T+180000);
 assert.equal(copy.version,paper.VERSION);
 assert.equal(copy.completed,11);
 assert.equal(copy.realizedUsd,-16.4039);
 assert.equal(copy.history.length,1);
 assert.equal(copy.usedKeys.length,1);
 assert.equal(copy.position.entryPolicyVersion,old.VERSION);
 assert.equal(copy.brokerOrdersEnabled,false);
 assert.ok(copy.policyActivatedAt>T);
 assert.throws(()=>paper.migrate({...s,version:'UNKNOWN'},T+120000),/MIGRATION_REFUSED/);
});

test('new 15m candle without a fresh Live sample retains previous observed polarity without crashing',()=>{
 const v53=require('../../modules/v5/decision-v53');
 const now=T+15*60000+10000,bar=Math.floor(now/(15*60000))*(15*60000);
 const input={now,samples:[{ts:bar-30000,lastPrice:80200,
  live15LbwRaw:-52,live15BwRaw:-45,live15MfRaw:-10,liveMoneyFlow:-11}],
  bars15:[],native15Events:[]};
 const base={readings:{
  mcb15:{trajectory:'long',lbw:-52,bw:-45},
  geometry:{cross15:{ts:bar-60000,direction:'short'}}}};
 const result=v53.mcb15Posture(input,base);
 assert.equal(result.liveDirection,'short');
 assert.equal(result.conflicted,true);
 assert.equal(result.state,'MCB15_CONTESTED_SHORT');
});

test('price always below MA is OPPOSITE_SIDE, not a fictitious lost support',()=>{
 const rows=[
  candle(0,79700,79690,79750),
  candle(1,79740,79720,79755),
  candle(2,79730,79710,79744),
  candle(3,79770,79755,79782)];
 const r=ma.maPath({tf:'3m',raw:rows,now:T+4*PERIOD,
  price:79765,dir:'long'});
 assert.equal(r.inApproach,false);
 assert.equal(r.state,'OPPOSITE_SIDE');
 assert.equal(r.accepted,false);
});

test('MA3 earns shared risk authority only through a repeatedly tested confirmed price zone',()=>{
 const bars=[
  candle(0,79970,79950,80006),
  candle(1,80020,79985,80040),
  candle(2,80038,79997,80055),
  candle(3,80050,80019,80065)];
 const result=ma.evaluate({now:T+4*PERIOD,price:80040,
  bars3:bars,bars15:[]},{
  candidate:'long',readings:{flow15:{mf3Change:1,mf15Change:.2}}});
 assert.equal(result.ma3.state,'ACCEPTED');
 assert.equal(result.activeZone.horizons.length,1);
 assert.equal(result.activeZone.quality,'REPEATED');
 assert.equal(result.riskCandidate.reference,'DEFENDED_MA200_3M');
 assert.equal(result.riskCandidate.price,79938);
 assert.equal(result.entryGate,null);
 assert.equal(result.ma15.state,'UNKNOWN');
});
