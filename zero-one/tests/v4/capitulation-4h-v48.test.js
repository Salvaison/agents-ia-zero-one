'use strict';
const assert=require('assert');
const guard=require('../../modules/v4/layers/capitulation-guard');
const nativeSignal=require('../../modules/v4/layers/native-signal');
const setupLayer=require('../../modules/v4/layers/setup-lifecycle');
const riskLayer=require('../../modules/v4/layers/risk');
const action=require('../../modules/v4/layers/action');

const H4=4*60*60*1000, M15=15*60*1000;
const base=1_820_000_000_000;

function h4bg(){
  return {fourHour:{
    available:true,lobeType:'CREUX',currentLbw:-66,extremeLbw:-72,
    structuralDirection:'short',structuralState:'DESCENT_ACTIVE',startTs:base-H4
  }};
}
function mcb15(confirmedAt){
  return {
    currentLobe:{
      startTs:base-M15*4,extremeTs:base-M15*2,maturity:'MATURE_REVERSING',
      type:'CREUX',structuralDirection:'long',structuralState:'ASCENT_ACTIVE',
      structuralConfirmedAt:confirmedAt,
      structuralPivot:{type:'CREUX',price:100,lbw:-70,extremeTs:base-M15*2,confirmedAt}
    },
    nested3m:{available:true,startTs:base-180000,extremeTs:base-180000,lobeSign:1,turningDirection:null,structuralDirection:'long',structuralState:'ASCENT_ACTIVE',structuralConfirmedAt:base-180000}
  };
}
function armNative(eventTs, now, with15=false){
  const e={type:'UP',value:-68,ts:eventTs,availableAt:eventTs+H4,confirmed:true};
  return {
    latest:with15?{type:'UP',value:-70,ts:now-M15*2,confirmed:true}:null,
    fourHour:{reversalArmed:true,lastSub60Up:e},
    reinforcedUp:{active:false},
    reinforced3mUp:{active:false,event:null}
  };
}

// 1) Deep 4h descending lobe that reached <= -60 locks LONG reversal search.
{
  const g=guard.evaluate({market:{timestamp:base}},'long',mcb15(base-M15*5),h4bg(),
    {fourHour:{reversalArmed:false,lastSub60Up:null}},null);
  assert.equal(g.state,'DEEP_4H_WAIT_UP_SUB60');
  assert.equal(g.blocked,true);
  assert.equal(g.decisionImpact,true);
}

// 2) A 4h sub-60 UP is unusable before the 4h bar is causally closed.
{
  const ts=base-H4;
  const frameBefore={market:{timestamp:ts+H4-1},sources:{mcb:{tfs:{'4h':{
    history:[{ts,timestamp:new Date(ts).toISOString(),open:100,high:101,low:90,close:95,lt_blue_wave:-68,blue_wave:-65,money_flow:0,wt1_cross_up:-68,wt1_cross_dn:null}],
    confirmed:{ts,timestamp:new Date(ts).toISOString(),lt_blue_wave:-68,close:95},
    live:{ts:ts+H4,timestamp:new Date(ts+H4).toISOString(),lt_blue_wave:-65,close:96}
  }}}}};
  const n0=nativeSignal.evaluate(frameBefore);
  assert.equal(n0.fourHour.reversalArmed,false);
  assert.equal(n0.fourHour.lastSub60Up.availableAt,ts+H4);

  frameBefore.market.timestamp=ts+H4+1;
  const n1=nativeSignal.evaluate(frameBefore);
  assert.equal(n1.fourHour.reversalArmed,true);
}

// 3) After the 4h arm, evidence that predates the arm cannot be recycled.
{
  const eTs=base-H4, available=eTs+H4;
  const now=base+1;
  const n=armNative(eTs,now,false);
  let g=guard.evaluate({market:{timestamp:now}},'long',mcb15(available-M15*3),h4bg(),n,null);
  assert.equal(g.state,'4H_REVERSAL_ARMED_WAIT_NEW_15M');
  assert.equal(g.blocked,true);

  // New structural 15m confirmation after the arm unlocks search.
  g=guard.evaluate({market:{timestamp:now}},'long',mcb15(available),h4bg(),n,null);
  assert.equal(g.state,'4H_REVERSAL_ARMED_15M_READY');
  assert.equal(g.blocked,false);
  assert.equal(g.arm.postArm15m,true);
}

// 4) The same 4h arm cannot fund another LONG campaign after a failed capitulation reversal.
{
  const eTs=base-H4, available=eTs+H4, now=base+1;
  const n=armNative(eTs,now,false);
  const m=mcb15(available);
  const token=String(eTs);
  const g=guard.evaluate({market:{timestamp:now}},'long',m,h4bg(),n,{
    direction:'long',pnlUsd:-2,fourHourArmToken:token,capitulationReversal:true
  });
  assert.equal(g.state,'4H_ARM_CONSUMED_AFTER_FAILED_REVERSAL');
  assert.equal(g.blocked,true);
}

// 5) Setup lifecycle obeys the 4h guard even when 15m/3m are locally synchronized.
{
  const frame={market:{timestamp:base,price:100}};
  const bt={candidateDirection:'long',mode:'REVERSAL_FORMING',quality:{pairClass:'PAIR_MAJOR_QUALITATIVE'}};
  const m=mcb15(base-M15);
  const bg={primaryRelation:'WITH_BACKGROUND'};
  const room={state:'OPEN_PATH',admissionBlocked:false};
  const quality={state:'ACTIVE',lowEdge:false,admissionBlocked:false};
  const n={reinforcedUp:{active:false},reinforced3mUp:{active:false,event:null},latest:null};
  const g={state:'DEEP_4H_WAIT_UP_SUB60',blocked:true,decisionImpact:true,deepReached:true,arm:{active:false,token:null}};
  const s=setupLayer.evaluate(frame,bt,m,bg,room,quality,n,null,null,null,g);
  assert.equal(s.status,'OBSERVE');
  assert.ok(s.reasons.includes('DEEP_4H_WAIT_UP_SUB60'));
}

// 6) In deep 4h capitulation, price + LBW below the entry-supporting 15m trough invalidates the LONG leg.
{
  const pos={direction:'long',context:{mcb:{currentLobe:{structuralPivot:{type:'CREUX',price:100,lbw:-70,extremeTs:1,confirmedAt:2}}}}};
  const m={currentLobe:{currentLbw:-72}};
  const bg={fourHour:{available:true,lobeType:'CREUX',structuralDirection:'short',extremeLbw:-75}};
  const r={position:{currentPrice:99,currentSignedUsd:-1,mfeUsd:20,maeUsd:1}};
  const x=action.structuralPivotBreachExit(pos,m,bg,r);
  assert(x);
  assert.equal(x.type,'EXIT_STRUCTURAL_PIVOT_BREACH');

  assert.equal(action.structuralPivotBreachExit(pos,{currentLobe:{currentLbw:-69}},bg,r),null);
}

// 7) Hard risk is truly hard: observed MAE >= 500 triggers even after price rebounds.
{
  const pos={direction:'long',entryPrice:1000,metrics:{mfeUsd:20,maeUsd:520}};
  const r=riskLayer.evaluate({market:{price:900}},pos,{},null,null,null,null);
  assert.equal(r.hardStopBreached,true);
  assert.equal(r.hardStopSource,'OBSERVED_MAE');
}

console.log('V4.8 4h capitulation guard tests OK');
