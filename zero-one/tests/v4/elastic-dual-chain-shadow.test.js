'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const shadow=require('../../modules/v4/experiments/elastic-dual-chain-shadow');
function fixture(ts=10000000,price=82000,structural='short',pm3=-40,pm5=-65,liveUp=false){
  const rows=Array.from({length:8},(_,i)=>({ts:ts-210000+i*30000,live15LbwRaw:42-i*2,
    liveLbw:28-i*3,live15MoneyFlow:12-i,liveMoneyFlow:6-i,mf15Pente:-1,priceMove:-5,lastPrice:price-i}));
  const frame={market:{timestamp:ts,price},sources:{auditRows:rows,mcb:{tfs:{
    '3m':{live:{lt_blue_wave:-15,ma200:82040,high:82045,low:81970}},
    '15m':{live:{lt_blue_wave:36,ma200:82060,high:82020,low:81950}}
  }}}};
  const mcb={dataQuality:{degraded:false},currentLobe:{type:structural==='short'?'CRETE':'CREUX',structuralDirection:structural,lobeDirection:structural},
    structural15m:{structuralDirection:structural},nested3m:{lobeDirection:structural,structuralDirection:structural}};
  const native={live3:{fresh:liveUp,up:liveUp?{type:'UP',ts:ts-1000,value:-50}:null,dn:null},
    live15:{fresh:false},last3mUp:null,last3mDn:{type:'DN',ts:ts-30000,value:45},lastUp:null,lastDn:{type:'DN',ts:ts-100000,value:43}};
  const translation={horizons:{net1mUsd:pm3/2,net3mUsd:pm3,net5mUsd:pm5,efficiency3m:.55,efficiency5m:.45}};
  const ticker={direction:pm3>0?'long':'short',current:{effortVsP75:.8,yieldVsP75:1.2,yieldVsP95:.4,cadence:14,flowBtcPerSec:.3}};
  const mf={temporal:{memoryDirection:'short',memoryHorizon:'h2',tacticalDirection:pm3>0?'long':'short'}};
  const behavior={interesting:true,direction:pm3>0?'long':'short',travel:{state:'EASY_TRAVEL'}};
  const thesis={candidateDirection:structural,direction:structural};
  return {frame,mcb,native,thesis,translation,ticker,mf,behavior};
}
function run(f,p=null){return shadow.evaluate(f.frame,f.mcb,f.native,f.thesis,f.translation,f.ticker,f.mf,f.behavior,p)}
test('v0.4 maintains both chains without authority over V4',()=>{
  const s=run(fixture());
  assert.equal(s.version,shadow.VERSION);
  assert.equal(s.decisionImpact,false);
  assert.equal(s.primaryThesis,'short');
  assert.equal(s.chains.short.role,'PRINCIPALE');
  assert.equal(s.chains.long.role,'CONCURRENTE');
  assert.equal(s.handoff.decisionImpact,false);
  assert.ok(s.chains.short.proofs.MF15_SLOPE_ALIGNED);
});
test('MCB proposal updates immediately, independently of PM and structural confirmation',()=>{
  const a=run(fixture());
  const f=fixture(10030000,81990,'short',-35,-45);
  f.thesis={state:'TRANSITION_NEUTRAL',mode:'REVERSAL_FORMING',candidateDirection:'long'};
  const b=run(f,a);
  assert.equal(b.mcbAuthority,'long');
  assert.equal(b.primaryThesis,'long');
  assert.equal(b.structuralDirection,'short');
  assert.equal(b.handoff.structuralAgreement,false);
  assert.equal(b.handoffs.length,1);
  assert.equal(b.handoffs[0].cause,'NEW_MCB_DIRECTION_PROPOSAL');
  assert.equal(b.decisionImpact,false);
  const c=run(fixture(10060000,82050,'long',45,55),b);
  assert.equal(c.primaryThesis,'long');
  assert.equal(c.structuralDirection,'long');
  assert.equal(c.handoffs.length,1); // no repeated handoff on later price confirmation
});
test('price persistence survives a 3m/5m respiration and does not create direction',()=>{
  const f=fixture(10000000,82000,'long',40,60);
  const step=30000,now=f.frame.market.timestamp;
  // Net -600 on 30m, but the last five minutes recover +80.
  f.frame.sources.auditRows=Array.from({length:65},(_,i)=>({
    ts:now-(64-i)*step,lastPrice:83000-i*10+(i>=55?(i-55)*18:0),
    live15LbwRaw:10,liveLbw:-15,liveMoneyFlow:2,mf15Pente:-1,priceMove:-5
  }));
  f.thesis={candidateDirection:'long',mode:'REVERSAL_FORMING'};
  const x=run(f);
  assert.equal(x.primaryThesis,'long');
  assert.equal(x.priceDominance.direction,'short');
  assert.equal(x.chains.long.phase,'CONTESTEE');
  assert.equal(x.chains.short.priceRelation,'SOUTIENT');
  assert.equal(x.priceDominance.shortTermOpposes,true);
});
test('a newer opposite E15 confirmed retires the older confirmed signal',()=>{
  const before=fixture(10000000,82000,'long',30,40);
  before.native.lastUp={type:'UP',ts:9700000,value:-12};
  before.native.lastDn={type:'DN',ts:9500000,value:50};
  const a=run(before);
  assert.equal(a.chains.long.proofs.E15_CONFIRMED.state,'ACTIVE');
  const after=fixture(10030000,81900,'short',-30,-40);
  after.native.lastUp=before.native.lastUp;
  after.native.lastDn={type:'DN',ts:10020000,value:55};
  const b=run(after,a);
  assert.equal(b.chains.long.proofs.E15_CONFIRMED.state,'SUPERSEDED');
  assert.equal(b.chains.long.proofs.E15_CONFIRMED.supersededByTs,10020000);
  assert.ok(b.chains.long.story.some(e=>e.type==='SUPERSEDED'&&e.name==='E15_CONFIRMED'));
  assert.equal(b.chains.short.proofs.E15_CONFIRMED.state,'ACTIVE');
});
test('evidence fades and reasserts in same story',()=>{
  const a=run(fixture(10000000,82000,'short',-30,-50,true));
  assert.equal(a.chains.long.proofs.E3_LIVE.state,'ACTIVE');
  const b=run(fixture(10030000,82000,'short',-25,-45,false),a);
  assert.equal(b.chains.long.proofs.E3_LIVE.state,'FADED');
  const c=run(fixture(10060000,82000,'short',-23,-42,true),b);
  assert.equal(c.chains.long.proofs.E3_LIVE.state,'ACTIVE');
  assert.equal(c.chains.long.proofs.E3_LIVE.reaffirmations,1);
  assert.ok(c.chains.long.story.some(x=>x.type==='REASSERTED'));
});
test('degraded MCB data suspends shadow handoff',()=>{
  const a=run(fixture());
  const f=fixture(10030000,82040,'long',40,50);
  f.mcb.dataQuality.degraded=true;
  const b=run(f,a);
  assert.equal(b.primaryThesis,'short');
  assert.equal(b.dataQuality,'DATA_DEGRADED');
});

test('causal milestones preserve E3/E15 live sources and real LBW3 zero crossing, not LBW15',()=>{
  const first=fixture(10000000,83000,'short',-50,-90);
  first.frame.sources.mcb.tfs['3m'].live.lt_blue_wave=9;
  first.frame.sources.auditRows.at(-1).live15LbwRaw=78;
  first.native.live3={fresh:true,dn:{type:'DN',ts:9970000,value:40},up:null};
  first.native.live15={fresh:true,dn:{type:'DN',ts:9940000,value:78},up:null};
  const a=run(first);
  const next=fixture(10030000,82700,'short',-150,-220);
  next.frame.sources.mcb.tfs['3m'].live.lt_blue_wave=-8;
  next.frame.sources.auditRows.at(-1).live15LbwRaw=74;
  next.native.live3={fresh:true,dn:{type:'DN',ts:9970000,value:40},up:null};
  next.native.live15={fresh:true,dn:{type:'DN',ts:9940000,value:76},up:null};
  const b=run(next,a);
  const ms=b.chains.short.milestones;
  assert.ok(ms.some(e=>e.event==='E3_LIVE'&&e.sourceTs===9970000));
  assert.ok(ms.some(e=>e.event==='E15_LIVE'&&e.sourceTs===9940000));
  assert.ok(ms.some(e=>e.event==='LBW3_ZERO_CROSS'&&e.type==='ZERO_CROSS'));
  assert.ok(!ms.some(e=>e.event==='LBW15_ZERO_CROSS'));
  assert.ok(ms.every(e=>e.observedAt>=e.sourceTs));
  const c=run({...next,frame:{...next.frame,market:{timestamp:10060000,price:82710}}},b);
  assert.equal(c.chains.short.milestones.filter(e=>e.event==='LBW3_ZERO_CROSS').length,1);
});
test('E15 confirmed is a new milestone when confirmation becomes available, not at source bar time',()=>{
  const before=fixture(10000000,82750,'short',-80,-90);
  before.native.lastDn={type:'DN',ts:9000000,value:32};
  before.native.live15={fresh:true,dn:{type:'DN',ts:9940000,value:75},up:null};
  const a=run(before);
  const confirmed=fixture(10030000,82710,'short',-80,-90);
  confirmed.native.lastDn={type:'DN',ts:9940000,value:75};
  confirmed.native.live15={fresh:true,dn:null,up:null};
  const b=run(confirmed,a);
  const e=b.chains.short.milestones.find(e=>e.event==='E15_CONFIRMED'&&e.sourceTs===9940000);
  assert.ok(e);
  assert.equal(e.sourceTs,9940000);
  assert.equal(e.observedAt,10030000);
  assert.ok(e.observedAt>e.sourceTs);
});

test('BW/LBW crosses are distinct shared geometric events, not extra votes or E3/E15 aliases',()=>{
  const t=10000000,base=fixture(t,83000,'short',-50,-90);
  const r0={ts:t-30000,lastPrice:83020,priceMove:-20,
    liveBw:38,liveLbw:40,live15BwRaw:77.5,live15LbwRaw:80.4,mf15Pente:1.5};
  const r1={...r0,ts:t,liveBw:36,liveLbw:38,live15BwRaw:77.54,live15LbwRaw:80.44};
  base.frame.sources.auditRows=[r0,r1];
  const a=run(base);
  assert.equal(a.waveGeometry.m3.crossNow,false);
  assert.equal(a.waveGeometry.m15.crossNow,false);
  const next=fixture(t+30000,82900,'short',-80,-100);
  const r2={...r1,ts:t+30000,liveBw:40.49,liveLbw:38.99,
    live15BwRaw:79.34,live15LbwRaw:78.91,lastPrice:82900};
  next.frame.sources.auditRows=[r0,r1,r2];
  next.native.live3={fresh:true,up:null,dn:{ts:t+10000,type:'DN',value:40.49}};
  next.native.live15={fresh:true,up:null,dn:{ts:t+10000,type:'DN',value:79.34}};
  const b=run(next,a);
  assert.equal(b.waveGeometry.m3.lastCrossing.event,'BW_CROSSES_ABOVE_LBW');
  assert.equal(b.waveGeometry.m15.lastCrossing.event,'BW_CROSSES_ABOVE_LBW');
  assert.equal(b.waveGeometry.m3.lastCrossing.sourceTs,t+30000);
  assert.equal(b.waveGeometry.m15.lastCrossing.sourceTs,t+30000);
  assert.equal(b.waveGeometry.m15.linkedNativeFamily,'E15');
  assert.equal(b.waveGeometry.m15.decisionImpact,false);
  for(const direction of ['long','short']){
    const story=b.chains[direction];
    assert.ok(story.milestones.some(x=>x.event==='BW_LBW_CROSS_3M'&&x.type==='GEOMETRIC_CROSS'&&x.direction===null));
    assert.ok(story.milestones.some(x=>x.event==='BW_LBW_CROSS_15M'&&x.type==='GEOMETRIC_CROSS'&&x.direction===null));
    assert.ok(!Object.keys(story.proofs).some(x=>x.startsWith('BW_LBW_CROSS')));
  }
  const control=fixture(t+30000,82900,'short',-80,-100);
  control.frame.sources.auditRows=[r0,r1,{...r2,liveBw:35,live15BwRaw:76}];
  control.native=next.native;
  const withoutCross=run(control,a);
  for(const direction of ['short','long']){
    assert.equal(b.chains[direction].activeProofCount,withoutCross.chains[direction].activeProofCount);
    assert.deepEqual(b.chains[direction].families,withoutCross.chains[direction].families);
  }
  const repeat=run({...next,frame:{...next.frame,market:{timestamp:t+60000,price:82900}}},b);
  assert.equal(repeat.waveGeometry.m3.crossNow,false);
  assert.equal(repeat.chains.short.milestones.filter(e=>e.event==='BW_LBW_CROSS_3M').length,1);
  assert.equal(repeat.chains.short.milestones.filter(e=>e.event==='BW_LBW_CROSS_15M').length,1);
});
test('BW/LBW geometric cross cannot be inferred across stale observations',()=>{
 const t=10000000;
 const f=fixture(t,82000,'short');
 f.frame.sources.auditRows=[
  {ts:t-240000,lastPrice:82050,liveBw:25,liveLbw:30,live15BwRaw:60,live15LbwRaw:65},
  {ts:t,lastPrice:82000,liveBw:30,liveLbw:25,live15BwRaw:65,live15LbwRaw:60}];
 const e=run(f);
 assert.equal(e.waveGeometry.m3.crossNow,false);
 assert.equal(e.waveGeometry.m15.crossNow,false);
 assert.ok(!e.chains.short.milestones.some(x=>x.type==='GEOMETRIC_CROSS'));
});
