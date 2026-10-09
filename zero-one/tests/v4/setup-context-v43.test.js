'use strict';
const assert=require('assert');
const background=require('../../modules/v4/layers/mcb-background');
const room=require('../../modules/v4/layers/structural-room');
const setupLayer=require('../../modules/v4/layers/setup-lifecycle');
const priceTranslation=require('../../modules/v4/layers/price-translation');
const ticker=require('../../modules/v4/layers/ticker-confirmation');
const action=require('../../modules/v4/layers/action');

function row(ts,lbw,price){
  return {ts,timestamp:new Date(ts).toISOString(),lt_blue_wave:lbw,blue_wave:lbw*.8,money_flow:0,
    open:price,high:price+5,low:price-5,close:price};
}
const base=1_810_000_000_000;

// 1H bridge reads a recovering negative lobe as LONG background, while 4H/D stay shadow.
{
  const h1=[row(base,-50,1000),row(base+3600000,-60,990),row(base+7200000,-40,1005)];
  const h4=[row(base,-20,1000),row(base+4*3600000,-30,995)];
  const d1=[row(base,30,1000),row(base+86400000,35,1010)];
  const frame={sources:{mcb:{tfs:{
    '1h':{history:h1,live:row(base+3*3600000,-25,1015)},
    '4h':{history:h4,live:null},
    '1d':{history:d1,live:null}
  }}}};
  const b=background.evaluate(frame,'long');
  assert.equal(b.primaryRelation,'WITH_BACKGROUND');
  assert.equal(b.oneHour.direction,'long');
  assert.equal(b.macroDecisionImpact,false);
}

// Structural boundary is directional: MA ahead can suspend, MA behind cannot.
{
  const frame={market:{price:1000}};
  const ahead={where:{ma200:{available:true,fresh:true,price:1050,toleranceUsd:60,source:'live'},sr:{},lgi:{lines:[]}}};
  const behind={where:{ma200:{available:true,fresh:true,price:950,toleranceUsd:60,source:'live'},sr:{},lgi:{lines:[]}}};
  assert.equal(room.evaluate(frame,'long',ahead).state,'BOUNDARY_CONTEST');
  assert.equal(room.evaluate(frame,'long',behind).state,'OPEN_PATH');
}

// V4.7: setup still requires local sync, but 1H opposition is a qualifier only, never a veto.
{
  const frame={market:{timestamp:base,price:1000}};
  const c={startTs:base-900000,extremeTs:base-900000,maturity:'MATURE',type:'CRETE'};
  const mcb={currentLobe:c,nested3m:{available:true,startTs:base-180000,extremeTs:base-180000,lobeSign:-1,turningDirection:null}};
  const bt={candidateDirection:'short',direction:null,mode:'REVERSAL_FORMING'};
  const bg={primaryRelation:'AGAINST_BACKGROUND'};
  const open={state:'OPEN_PATH',admissionBlocked:false};
  const active={state:'ACTIVE',admissionBlocked:false};
  const x=setupLayer.evaluate(frame,bt,mcb,bg,open,active,null,null,null,null);
  assert.equal(x.status,'SETUP');
  assert.equal(x.backgroundQualifier,'COUNTER_1H_WAVE');
  assert.equal(x.requirements.againstBackgroundExtraProof,false);
  assert.ok(!String(x.reason).includes('mature 15m'));
}

// MCB context survives an exit, but the exact thesis/setup already consumed cannot be reused.
{
  const t=base+10_000_000;
  const frame={market:{timestamp:t,price:1000}};
  const mcb={currentLobe:{startTs:t-600000,extremeTs:t-300000,maturity:'MATURE_REVERSING'},
    nested3m:{available:true,startTs:t-180000,extremeTs:t-120000,lobeSign:1,turningDirection:null}};
  const bt={candidateDirection:'long',mode:'REVERSAL_FORMING'};
  const bg={primaryRelation:'WITH_BACKGROUND'};
  const open={state:'OPEN_PATH',admissionBlocked:false};
  const active={state:'ACTIVE',admissionBlocked:false};
  const key=['long','REVERSAL_FORMING',t-600000,t-180000,0,0].join('|');

  // Exact same MCB setup was consumed by the previous trade => stale thesis.
  const stale=setupLayer.evaluate(frame,bt,mcb,bg,open,active,null,null,null,
    {lastExitTs:t-60000,setupKey:key});
  assert.equal(stale.status,'OBSERVE');
  assert.ok(stale.reasons.includes('THESIS_CONSUMED_WAIT_MCB_CHANGE'));

  // A different previous setup does NOT erase MCB history. Only micro evidence restarts at this setup.
  const fresh=setupLayer.evaluate(frame,bt,mcb,bg,open,active,null,null,null,
    {lastExitTs:t-60000,setupKey:'short|REVERSAL_FORMING|old'});
  assert.equal(fresh.status,'SETUP');
  assert.equal(fresh.setupTs,t);
}

// PM proof after setup ignores pre-setup movement.
{
  const rows=[];let price=1000;
  for(let i=0;i<20;i++){price+=5;rows.push({ts:base+i*30000,lastPrice:price,priceMove:5});}
  const setupTs=base+20*30000;
  rows.push({ts:setupTs,lastPrice:price,priceMove:0});
  price-=2;rows.push({ts:setupTs+30000,lastPrice:price,priceMove:-2});
  price-=2;rows.push({ts:setupTs+60000,lastPrice:price,priceMove:-2});
  const frame={market:{timestamp:setupTs+60000,price},sources:{auditRows:rows}};
  const th={state:'SETUP',direction:'long'};
  const pm=priceTranslation.evaluate(frame,th,{sinceTs:setupTs});
  assert.equal(pm.evidenceWindow,'POST_SETUP');
  assert.ok(pm.sinceSetup.netUsd<0);
  assert.notEqual(pm.status,'TRANSLATING');
  assert.notEqual(pm.status,'STRONG_TRANSLATION');
}

// Ticker also cannot reuse pre-setup persistence.
{
  const rows=[];let price=1000;
  for(let i=0;i<50;i++){price+=10;rows.push({ts:base+i*30000,lastPrice:price,priceMove:10,volumeFenetreBtc:2,winSec:20,cadence:10});}
  const setupTs=base+50*30000;
  rows.push({ts:setupTs,lastPrice:price,priceMove:0,volumeFenetreBtc:2,winSec:20,cadence:10});
  const frame={market:{timestamp:setupTs,price},sources:{auditRows:rows}};
  const tk=ticker.evaluate(frame,{state:'SETUP',direction:'long'},{sinceTs:setupTs});
  assert.equal(tk.status,'FRESH_EVIDENCE_BUILDING');
  assert.equal(tk.confirmed,false);
}

// Flat action cannot enter without an armed setup, regardless of rolling confirmations.
{
  const a=action.evaluate({market:{price:1000}},null,{}, {state:'LONG_FORMING',direction:'long'},
    {status:'STRONG_TRANSLATION',aligned:true,thesisDirection:'long'},
    {status:'STRONG_CONFIRMATION',confirmed:true,thesisDirection:'long'},
    {hardStopBreached:false}, {setup:{status:'OBSERVE',candidateDirection:'long'}});
  assert.equal(a.type,'NO_TRADE');
}

console.log('V4.3 setup/background/structure tests OK');
