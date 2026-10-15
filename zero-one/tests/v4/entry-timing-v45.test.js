'use strict';
const assert=require('assert');
const action=require('../../modules/v4/layers/action');
const setupLayer=require('../../modules/v4/layers/setup-lifecycle');
const nativeSignal=require('../../modules/v4/layers/native-signal');

const base=1_813_000_000_000;
function row(ts,lbw,up=null,dn=null){
  return {ts,timestamp:new Date(ts).toISOString(),lt_blue_wave:lbw,blue_wave:lbw*.8,money_flow:0,
    open:1000,high:1005,low:995,close:1000,wt1_cross_up:up,wt1_cross_dn:dn};
}
function commonSetupInputs(direction='short'){
  const sign=direction==='long'?1:-1;
  return {
    baseThesis:{candidateDirection:direction,direction:null,mode:'REVERSAL_FORMING',
      quality:{pairClass:'PAIR_MAJOR_QUALITATIVE',lbwSpan:95}},
    mcb:{
      currentLobe:{startTs:base-900000,extremeTs:base-600000,maturity:'MATURE_REVERSING',type:direction==='short'?'CRETE':'CREUX',
        relationshipFromPrevious:{pairQuality:{class:'PAIR_MAJOR_QUALITATIVE'}}},
      nested3m:{available:true,startTs:base-300000,extremeTs:base-240000,lobeSign:sign,turningDirection:null}
    },
    background:{primaryRelation:'WITH_BACKGROUND'},
    room:{state:'OPEN_PATH',admissionBlocked:false},
    quality:{state:'ACTIVE',lowEdge:false,admissionBlocked:false}
  };
}

// Entry: PM post-setup + efficiency is sufficient; ticker is only a conviction qualifier.
{
  const a=action.evaluate({market:{price:1000}},null,{}, {state:'SHORT_FORMING',direction:'short'},
    {status:'NOT_TRANSLATING'}, {status:'NOT_CONFIRMED',confirmed:false}, {hardStopBreached:false}, {
      setup:{status:'SETUP',direction:'short',setupId:'pm-only-short',reinforcedUpBypass:false},
      thesis:{state:'SETUP',direction:'short'},
      translation:{
        status:'TRANSLATING',
        materiality:{passed:true,minNetUsd:10,minEfficiency:.25},
        sinceSetup:{available:true,netUsd:-24,grossUsd:60,efficiency:.40},
        horizons:{net3mUsd:-35,net5mUsd:-40,efficiency3m:.55}
      },
      ticker:{status:'NOT_CONFIRMED',confirmed:false},
      nativeSignal:{reinforcedUp:{active:false}},
      marketQuality:{state:'MIXED'}
    });
  assert.equal(a.type,'ENTER_SHORT');
  assert.equal(a.stage,'SETUP_PM_READY');
  assert.equal(a.evidence.tickerConfirmed,false);
}

// UP_REINFORCED_3M is a native confirmed 3m UP <= -60 and ends on the next confirmed 3m DN.
{
  const frame1={market:{timestamp:base+10*60000},sources:{mcb:{tfs:{
    '15m':{history:[]},
    '3m':{history:[
      row(base-6*60000,-35,null,-35),
      row(base-3*60000,-72,-72,null)
    ]}
  }}}};
  const n1=nativeSignal.evaluate(frame1);
  assert.equal(n1.reinforced3mUp.active,true);
  assert.equal(n1.reinforced3mUp.event.type,'UP');
  assert.equal(n1.reinforced3mUp.event.value,-72);

  const frame2={market:{timestamp:base+12*60000},sources:{mcb:{tfs:{
    '15m':{history:[]},
    '3m':{history:[
      row(base-6*60000,-35,null,-35),
      row(base-3*60000,-72,-72,null),
      row(base+9*60000,-10,null,-10)
    ]}
  }}}};
  const n2=nativeSignal.evaluate(frame2);
  assert.equal(n2.reinforced3mUp.active,false);
}

// A current-cycle UP_REINFORCED_3M closes a new SHORT entry window immediately.
{
  const x=commonSetupInputs('short');
  const n={
    reinforcedUp:{active:false},
    reinforced3mUp:{active:true,event:{type:'UP',ts:base-60000,value:-74}},
    last3mUp:{type:'UP',ts:base-60000,value:-74},
    last3mDn:null
  };
  const s=setupLayer.evaluate({market:{timestamp:base,price:1000}},x.baseThesis,x.mcb,x.background,x.room,x.quality,n,null,null,null);
  assert.equal(s.status,'OBSERVE');
  assert.equal(s.noNewShort,true);
  assert.ok(s.reasons.includes('UP_REINFORCED_3M_CLOSES_SHORT_ENTRY_WINDOW'));
}

// On an already-open SHORT, UP_REINFORCED_3M is a respiration alert only, never a standalone exit.
{
  const pos={direction:'short',entryTimestamp:new Date(base).toISOString(),entryPrice:1000};
  const a=action.evaluate({market:{price:990}},pos,{nested3m:{lobeSign:-1,turningDirection:null}},
    {state:'SHORT_FORMING',direction:'short'},
    {status:'WEAK_ALIGNED',aligned:false,horizons:{net3mUsd:-10}},
    {status:'NOT_CONFIRMED',confirmed:false},
    {hardStopBreached:false,position:{currentSignedUsd:10,mfeUsd:20}}, {
      nativeSignal:{
        recent:false,latest:null,reinforcedUp:{active:false},
        reinforced3mUp:{active:true,event:{type:'UP',ts:base+60000,value:-78}}
      }
    });
  assert.equal(a.type,'HOLD');
  assert.equal(a.stage,'RESPIRATION_ALERT');
  assert.equal(a.evidence.exitAuthority,false);
}

// Distinction preserved: the strategic 15m UP_REINFORCED remains a separate exit authority.
{
  const pos={direction:'short',entryTimestamp:new Date(base).toISOString(),entryPrice:1000};
  const n={recent:true,latest:{type:'UP',ts:base+60000,value:-72},
    reinforcedUp:{active:true,event:{type:'UP',ts:base+60000,value:-72}},
    reinforced3mUp:{active:false,event:null}};
  const ex=action.nativeSignalExit(pos,{nested3m:{}},{horizons:{net3mUsd:5}},n);
  assert.equal(ex.type,'EXIT_NATIVE_STRONG_SIGNAL');
  assert.equal(ex.evidence.signal,'UP_REINFORCED_15M');
}

// Active timing lifecycle: fresh 3m timing stays OPEN; an old still-extending candidate lobe becomes non-tradable.
{
  const x=commonSetupInputs('short');
  x.mcb.nested3m={available:true,startTs:base-300000,extremeTs:base-240000,lobeSign:1,turningDirection:'short',
    currentLbw:20,extremeLbw:20,recoveryFraction:0};
  const n={reinforcedUp:{active:false},reinforced3mUp:{active:false,event:null},last3mUp:null,last3mDn:null};
  const s1=setupLayer.evaluate({market:{timestamp:base,price:1000}},x.baseThesis,x.mcb,x.background,x.room,x.quality,n,null,null,null);
  assert.equal(s1.status,'SETUP');
  assert.equal(s1.timingShadow.state,'SETUP_OPEN');
  assert.equal(s1.timingShadow.decisionImpact,false);

  x.mcb.nested3m={...x.mcb.nested3m,lobeSign:-1,turningDirection:null,currentLbw:-45,extremeLbw:-45,recoveryFraction:0};
  const s2=setupLayer.evaluate({market:{timestamp:base+30000,price:995}},x.baseThesis,x.mcb,x.background,x.room,x.quality,n,s1,null,null);
  assert.equal(s2.status,'SETUP');
  assert.equal(s2.timingShadow.state,'SETUP_OPEN');
  assert.equal(s2.timingShadow.blocksNewEntry,false);

  const lateTs=base+8*60000;
  const sLate=setupLayer.evaluate({market:{timestamp:lateTs,price:993}},x.baseThesis,x.mcb,x.background,x.room,x.quality,n,s2,null,null);
  assert.equal(sLate.status,'OBSERVE');
  assert.equal(sLate.timingShadow.state,'SETUP_LATE');
  assert.equal(sLate.timingShadow.decisionImpact,'CLOSES_NEW_ENTRY_WINDOW');
  assert.equal(sLate.timingShadow.blocksNewEntry,true);
  assert.ok(sLate.reasons.includes('SETUP_LATE_CLOSES_ENTRY_WINDOW'));

  x.mcb.nested3m={...x.mcb.nested3m,turningDirection:'long'};
  const s3=setupLayer.evaluate({market:{timestamp:base+60000,price:997}},x.baseThesis,x.mcb,x.background,x.room,x.quality,n,s1,null,null);
  assert.equal(s3.status,'OBSERVE');
  assert.equal(s3.timingShadow.state,'SETUP_EXPIRED');
}



// Reinforced confirmation must strengthen the same causal setup, not manufacture a fresh one.
// Its 3m sync event also becomes the earlier timing origin for SETUP_LATE.
{
  const x=commonSetupInputs('long');
  const n3Start=base;
  x.mcb.currentLobe={...x.mcb.currentLobe,startTs:base-60*60000,extremeTs:base-30*60000};
  x.mcb.nested3m={available:true,startTs:n3Start,extremeTs:n3Start,lobeSign:1,turningDirection:null,
    structuralDirection:'long',structuralState:'ASCENT_ACTIVE',structuralConfirmedAt:n3Start,
    currentLbw:8,extremeLbw:8,recoveryFraction:0};
  const none={reinforcedUp:{active:false},reinforced3mUp:{active:false,event:null},last3mUp:null,last3mDn:null};
  const thesisA={...x.baseThesis,mode:'STRUCTURAL_TRAJECTORY'};
  const s1=setupLayer.evaluate({market:{timestamp:n3Start+2*60000,price:1000}},thesisA,x.mcb,x.background,x.room,x.quality,none,null,null,null);
  assert.equal(s1.status,'SETUP');
  assert.equal(s1.timingShadow.state,'SETUP_OPEN');

  const syncTs=n3Start-6*60000;
  const reinforced={
    reinforcedUp:{active:true,event:{type:'UP',ts:syncTs,value:-74}},
    reinforcedLongSync:{active:true,signal3m:{type:'UP',ts:syncTs,value:-42}},
    reinforced3mUp:{active:false,event:null},last3mUp:null,last3mDn:null
  };
  const thesisB={...x.baseThesis,mode:'NATIVE_UP_REINFORCED'};
  x.mcb.nested3m={...x.mcb.nested3m,currentLbw:42,extremeLbw:42,recoveryFraction:0};
  const s2=setupLayer.evaluate({market:{timestamp:n3Start+10*60000,price:1080}},thesisB,x.mcb,x.background,x.room,x.quality,reinforced,s1,null,null,null);
  assert.equal(s2.status,'OBSERVE');
  assert.equal(s2.setupId,s1.setupId);
  assert.equal(s2.setupTs,s1.setupTs);
  assert.equal(s2.timingShadow.state,'SETUP_LATE');
  assert.equal(s2.timingShadow.timingOriginTs,syncTs);
  assert.equal(s2.timingShadow.timingOriginSource,'REINFORCED_15M_SYNC_3M_UP');
  assert.ok(s2.reasons.includes('SETUP_LATE_CLOSES_ENTRY_WINDOW'));
}

console.log('V4.5 entry timing / ticker role tests OK');
