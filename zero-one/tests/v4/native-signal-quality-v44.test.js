'use strict';
const assert=require('assert');
const nativeSignal=require('../../modules/v4/layers/native-signal');
const setupLayer=require('../../modules/v4/layers/setup-lifecycle');
const priceTranslation=require('../../modules/v4/layers/price-translation');
const action=require('../../modules/v4/layers/action');
const {parseCsvRows}=require('../../modules/v2/adapters/runtime-snapshot');
const fs=require('fs');

const base=1_812_000_000_000;
function row(ts,lbw,up=null,dn=null){
  return {ts,timestamp:new Date(ts).toISOString(),lt_blue_wave:lbw,blue_wave:lbw*.8,money_flow:0,
    open:1000,high:1005,low:995,close:1000,wt1_cross_up:up,wt1_cross_dn:dn};
}
function sub80Base(dir='long'){
  return {candidateDirection:dir,direction:null,mode:'REVERSAL_FORMING',
    quality:{pairClass:'PAIR_SUB80_QUALITATIVE',lbwSpan:55}};
}
function mcbFor(dir='long'){
  const sign=dir==='long'?-1:1;
  return {
    currentLobe:{startTs:base-900000,extremeTs:base-600000,maturity:'MATURE_REVERSING',
      relationshipFromPrevious:{pairQuality:{class:'PAIR_SUB80_QUALITATIVE'}}},
    nested3m:{available:true,startTs:base-300000,extremeTs:base-300000,lobeSign:dir==='long'?1:-1,turningDirection:null}
  };
}

// Native confirmed UP at/below -60 is reinforced and remains asymmetric.
{
  const frame={market:{timestamp:base+60*60000},sources:{mcb:{tfs:{'15m':{history:[
    row(base-30*60000,35,null,35),
    row(base, -72, -72, null)
  ]}}}}};
  const n=nativeSignal.evaluate(frame);
  assert.equal(n.reinforcedUp.active,true);
  assert.equal(n.reinforcedUp.event.type,'UP');
  assert.equal(n.reinforcedUp.event.value,-72);
  assert.equal(n.lastDn.type,'DN');
}

// 4H native signals are causal macro permission evidence. A confirmed UP <= -60 arms a reversal-search window
// only after the 4h bar closes; it never times execution by itself.
{
  const frame={market:{timestamp:base+12*60*60000},sources:{mcb:{tfs:{'4h':{
    history:[
      row(base-8*60*60000,-68,null,-68),
      row(base-4*60*60000,-72,-72,null)
    ],
    confirmed:row(base-4*60*60000,-72,-72,null),
    live:row(base,-69,null,null)
  }}}}};
  const n=nativeSignal.evaluate(frame);
  assert.equal(n.fourHour.deepSub60,true);
  assert.equal(n.fourHour.reversalArmed,true);
  assert.equal(n.fourHour.state,'UP_SUB60_CONFIRMED');
  assert.equal(n.fourHour.lastSub60Up.value,-72);
  assert.equal(n.fourHour.decisionImpact,'CAPITULATION_PERMISSION_ONLY');
  assert.ok(Number(n.fourHour.lastSub60Up.availableAt)>Number(n.fourHour.lastSub60Up.ts));

  frame.sources.mcb.tfs['4h'].history.push(row(base,-45,null,-45));
  frame.sources.mcb.tfs['4h'].confirmed=row(base,-45,null,-45);
  frame.sources.mcb.tfs['4h'].live=row(base+4*60*60000,-35,null,null);
  frame.market.timestamp=base+16*60*60000;
  const ended=nativeSignal.evaluate(frame);
  assert.equal(ended.fourHour.reversalArmed,false);
}

// Deep 4H structural pivot breach is shadow-only: after a confirmed sub-60 trough,
 // both price and 4H LBW must break below that pivot to falsify the ascent.
{
  const h4=[
    row(base-16*60*60000,20,null,null),
    row(base-12*60*60000,-72,-72,null),
    row(base-8*60*60000,-50,null,null),
    row(base-4*60*60000,-45,null,null)
  ];
  h4[1].low=900; h4[1].high=930; h4[1].close=915;
  h4[2].low=940; h4[2].high=970; h4[2].close=960;
  h4[3].low=945; h4[3].high=980; h4[3].close=965;
  const live=row(base,-75,null,null); live.low=880; live.high=920; live.close=890;
  const frame={market:{timestamp:base,price:890},sources:{mcb:{tfs:{'4h':{
    history:h4,confirmed:h4[h4.length-1],live
  }}}}};
  const n=nativeSignal.evaluate(frame);
  assert.equal(n.fourHour.structuralPivot.type,'CREUX');
  assert.equal(n.fourHour.structuralPivotDeep,true);
  assert.equal(n.fourHour.pivotBreachShadow.active,true);
  assert.equal(n.fourHour.pivotBreachShadow.state,'STRUCTURAL_PIVOT_BREACH');
  assert.equal(n.fourHour.pivotBreachShadow.decisionImpact,false);
}

// LOW_EDGE + sub-80 stays OBSERVE; reinforced UP can bypass that quality gate for LONG.
{
  const frame={market:{timestamp:base,price:1000}};
  const bt=sub80Base('long'),mcb=mcbFor('long'),bg={primaryRelation:'WITH_BACKGROUND'};
  const room={state:'OPEN_PATH',admissionBlocked:false};
  const low={state:'LOW_EDGE_SHADOW',lowEdge:true,admissionBlocked:false};
  const none={reinforcedUp:{active:false}};
  const x=setupLayer.evaluate(frame,bt,mcb,bg,room,low,none,null,null,null);
  assert.equal(x.status,'OBSERVE');
  assert.ok(x.reasons.includes('LOW_EDGE_REQUIRES_MAJOR_MCB_OR_REINFORCED_UP'));

  const strong={reinforcedUp:{active:true,event:{ts:base-60000,value:-72}}};
  const y=setupLayer.evaluate(frame,bt,mcb,bg,room,low,strong,null,null,null);
  assert.equal(y.status,'SETUP');
  assert.equal(y.reinforcedUpBypass,true);
}

// Against 1H: an already-established aligned 3m lobe AFTER the 15m extreme preserves turn memory.
{
  const frame={market:{timestamp:base,price:1000}};
  const bt={...sub80Base('short'),quality:{pairClass:'PAIR_MAJOR_QUALITATIVE',lbwSpan:95}};
  const mcb={
    currentLobe:{startTs:base-1800000,extremeTs:base-600000,maturity:'MATURE_REVERSING',
      relationshipFromPrevious:{pairQuality:{class:'PAIR_MAJOR_QUALITATIVE'}}},
    nested3m:{available:true,startTs:base-300000,extremeTs:base-300000,lobeSign:-1,turningDirection:null}
  };
  const x=setupLayer.evaluate(frame,bt,mcb,{primaryRelation:'AGAINST_BACKGROUND'},
    {state:'OPEN_PATH',admissionBlocked:false},{state:'ACTIVE',lowEdge:false,admissionBlocked:false},
    {reinforcedUp:{active:false}},null,null,null);
  assert.equal(x.status,'SETUP');
  assert.equal(x.alignedAfterExtreme,true);
  assert.equal(x.counterBackgroundLocalProof,true);
}

// Post-setup: clean sign alone is insufficient. Low conversion becomes COMBAT_ALIGNED.
{
  const rows=[];let p=1000;
  for(let i=0;i<50;i++){const d=i%2?1:-1;p+=d;rows.push({ts:base+i*30000,lastPrice:p,priceMove:d});}
  const setupTs=base+50*30000;
  rows.push({ts:setupTs,lastPrice:p,priceMove:0});
  const moves=[-20,18,-18,17,-20]; // gross 93, net -23? too material; override below.
  // Build gross work with near-zero net: -20,+20,-20,+20,-3 => net -3, gross 83.
  for(const d of [-20,20,-20,20,-3]){p+=d;rows.push({ts:rows.at(-1).ts+30000,lastPrice:p,priceMove:d});}
  const frame={market:{timestamp:rows.at(-1).ts,price:p},sources:{auditRows:rows}};
  const pm=priceTranslation.evaluate(frame,{state:'SETUP',direction:'short'},{sinceTs:setupTs});
  assert.equal(pm.materiality.passed,false);
  assert.ok(pm.sinceSetup.efficiency<.25);
  assert.equal(pm.status,'COMBAT_ALIGNED');
}

// Reinforced UP after a SHORT entry is a direct protection event; no synthetic reinforced DN.
{
  const pos={direction:'short',entryTimestamp:new Date(base).toISOString(),entryPrice:1000};
  const n={recent:true,latest:{type:'UP',ts:base+60000,value:-72},
    reinforcedUp:{active:true,event:{type:'UP',ts:base+60000,value:-72}}};
  const ex=action.nativeSignalExit(pos,{nested3m:{}},{horizons:{net3mUsd:5}},n);
  assert.equal(ex.type,'EXIT_NATIVE_STRONG_SIGNAL');
}


// Reinforced UP is an entry bypass for 1H/ticker only after local setup + fresh material bullish translation.
{
  const a=action.evaluate({market:{price:1050}},null,{}, {state:'TRANSITION_NEUTRAL',direction:null},
    {status:'NO_THESIS'}, {status:'NO_THESIS',confirmed:false}, {hardStopBreached:false}, {
      setup:{status:'SETUP',direction:'long',setupId:'reinforced',reinforcedUpBypass:true},
      thesis:{state:'SETUP',direction:'long'},
      translation:{status:'WEAK_ALIGNED',sinceSetup:{available:true,netUsd:80,grossUsd:300,efficiency:.267}},
      ticker:{status:'NOT_CONFIRMED',confirmed:false},
      nativeSignal:{reinforcedUp:{active:true,event:{ts:base,value:-72}}}
    });
  assert.equal(a.type,'ENTER_LONG');
  assert.equal(a.stage,'NATIVE_REINFORCED_BYPASS');
}


// Legacy confirmed CSV header (12 cols) must not discard trailing MA200 / native signal columns.
{
  const tmp='/tmp/v44-legacy-mcb-header.csv';
  fs.writeFileSync(tmp,'timestamp,open,high,low,close,lt_blue_wave,blue_wave,money_flow,buy,sell,dbsi_top,dbsi_bottom\n'+
    '2026-10-05T05:15:00.000Z,1000,1010,990,1005,-73,-74,15,1,0,1,16,950,-74,\n');
  const r=parseCsvRows(tmp,10)[0];
  assert.equal(r.ma200,950);
  assert.equal(r.wt1_cross_up,-74);
  assert.equal(r.wt1_cross_dn,null);
  fs.unlinkSync(tmp);
}

console.log('V4.4 native signal / quality tests OK');
