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
test('a new MCB structural direction cannot hand over without price',()=>{
  const a=run(fixture());
  const f=fixture(10030000,81990,'long',-35,-45);
  const b=run(f,a);
  assert.equal(b.mcbAuthority,'long');
  assert.equal(b.primaryThesis,'short');
  assert.equal(b.handoff.state,'CANDIDAT_MCB_EN_ATTENTE_DU_PRIX');
  const c=run(fixture(10060000,82050,'long',45,55),b);
  assert.equal(c.primaryThesis,'long');
  assert.equal(c.handoff.state,'TRANSFERT_SHADOW_OBSERVE');
  assert.equal(c.handoffs.length,1);
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
