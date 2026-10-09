'use strict';
const assert=require('assert');
const mcbState=require('../../modules/v4/layers/mcb-state');
const mcbThesis=require('../../modules/v4/layers/mcb-thesis');
const priceTranslation=require('../../modules/v4/layers/price-translation');
const maturity=require('../../modules/v4/layers/opportunity-maturity');
const tickerConfirmation=require('../../modules/v4/layers/ticker-confirmation');
const action=require('../../modules/v4/layers/action');

function row(ts,lbw,price){
  return {ts,timestamp:new Date(ts).toISOString(),lt_blue_wave:lbw,blue_wave:lbw*.7,money_flow:0,
    open:price,high:price+5,low:price-5,close:price};
}
function lobe(type,lbw,price,ts=1){
  const s=type==='CRETE'?1:-1;
  return {type,sign:s,extremeLbw:lbw,priceExtreme:price,extremeTs:ts};
}

// 1) 80 is the span BETWEEN opposite E15s, never one E15 magnitude.
{
  const a=mcbState.relationship(lobe('CREUX',-30,1000),lobe('CRETE',45,1100),[]);
  assert.equal(a.lbwSpan,75);
  assert.equal(a.oppositeSides,true);
  assert.equal(a.oscillatorMajorEvidence,false);
  assert.equal(a.pairQuality.class,'PAIR_SUB80_QUALITATIVE');
  assert.equal(a.pairQuality.decisionImpact,false);

  const b=mcbState.relationship(lobe('CREUX',-35,1000),lobe('CRETE',50,1100),[]);
  assert.equal(b.lbwSpan,85);
  assert.equal(b.oscillatorMajorEvidence,true);
  assert.equal(b.pairQuality.class,'PAIR_MAJOR_QUALITATIVE');

  const c=mcbState.relationship(lobe('CRETE',5,1000),lobe('CRETE',90,1100),[]);
  assert.equal(c.lbwSpan,85);
  assert.equal(c.oppositeSides,false);
  assert.equal(c.oscillatorMajorEvidence,false);
}

// 2) Sub-80 E15 recovery can still propose a reversal thesis.
{
  const c={
    type:'CREUX',sign:-1,directionIntoLobe:'short',reversalCandidateDirection:'long',
    confirmedSide:true,currentLbw:-15,extremeLbw:-22,recoveryFraction:.318,
    maturity:'MATURE',e15Class:'E15_PAIR_SUB80_QUALITATIVE',
    priceReversalFromLobeExtremeUsd:180,
    relationshipFromPrevious:{
      lbwSpan:62,oppositeSides:true,
      pairQuality:{class:'PAIR_SUB80_QUALITATIVE',referenceSpanLbw:80,decisionImpact:false},
      economicScale:{priceMagnitudeUsd:180,referenceUsd:180,ratio:1,decisionImpact:false}
    }
  };
  const m={currentLobe:c,nested3m:{available:true,lobeSign:-1,turningDirection:'long'}};
  const base=mcbThesis.evaluate(m);
  assert.equal(base.state,'TRANSITION_NEUTRAL');
  assert.equal(base.direction,null);
  assert.equal(base.candidateDirection,'long');
  assert.equal(base.quality.pairClass,'PAIR_SUB80_QUALITATIVE');
  const th=maturity.evaluate(base,m,{horizons:{net3mUsd:25}});
  assert.equal(th.state,'LONG_FORMING');
  assert.equal(th.direction,'long');
}

// 3) A confirmed extending lobe can propose its own direction below 80.
//    >=80 upgrades qualitative state only; it is not an admission gate.
{
  const mk=(pairClass,span)=>({
    type:'CRETE',sign:1,directionIntoLobe:'long',reversalCandidateDirection:'short',
    confirmedSide:true,currentLbw:25,extremeLbw:27,recoveryFraction:.07,maturity:'EXTENDING',
    e15Class:pairClass==='PAIR_MAJOR_QUALITATIVE'?'E15_PAIR_MAJOR_QUALITATIVE':'E15_PAIR_SUB80_QUALITATIVE',
    relationshipFromPrevious:{lbwSpan:span,oppositeSides:true,pairQuality:{class:pairClass,referenceSpanLbw:80,decisionImpact:false}}
  });
  const subM={currentLobe:mk('PAIR_SUB80_QUALITATIVE',55),nested3m:{available:true,lobeSign:1,turningDirection:null}};
  const majM={currentLobe:mk('PAIR_MAJOR_QUALITATIVE',95),nested3m:{available:true,lobeSign:1,turningDirection:null}};
  const sub=mcbThesis.evaluate(subM);
  const maj=mcbThesis.evaluate(majM);
  assert.equal(sub.direction,null);
  assert.equal(sub.candidateDirection,'long');
  assert.equal(sub.state,'TRANSITION_NEUTRAL');
  const promoted=maturity.evaluate(sub,subM,{horizons:{net3mUsd:20}});
  assert.equal(promoted.state,'LONG_FORMING');
  assert.equal(promoted.direction,'long');
  assert.equal(maj.direction,'long');
  assert.equal(maj.state,'LONG');
}

// 4) Live intrabar E15 extreme is persistent: once -32 was seen, later -24 cannot erase it.
{
  const base=1_800_100_000_000;
  const history=[
    row(base+0*900000,35,1000),
    row(base+1*900000,40,1010),
    row(base+2*900000,-8,990),
    row(base+3*900000,-20,970)
  ];
  const frame1={market:{price:965,timestamp:base+4*900000},sources:{mcb:{tfs:{
    '15m':{history,live:row(base+4*900000,-32,965)},
    '3m':{history:[],live:null}
  }}}};
  const m1=mcbState.evaluate(frame1);
  assert.equal(m1.currentLobe.extremeLbw,-32);

  const frame2={market:{price:980,timestamp:base+4*900000+60000},sources:{mcb:{tfs:{
    '15m':{history,live:row(base+4*900000,-24,980)},
    '3m':{history:[],live:null}
  }}}};
  const m2=mcbState.evaluate(frame2,m1);
  assert.equal(m2.currentLobe.extremeLbw,-32);
  assert.ok(m2.currentLobe.recoveryFraction>0);
  assert.equal(m2.currentLobe.persistentLiveExtreme,true);
}

// 5) A LIVE zero cross never completes the 15m lobe.
{
  const base=1_800_200_000_000;
  const history=[
    row(base+0*900000,35,1000),
    row(base+1*900000,40,1010),
    row(base+2*900000,-10,990),
    row(base+3*900000,-20,970)
  ];
  const frame={market:{price:995,timestamp:base+4*900000},sources:{mcb:{tfs:{
    '15m':{history,live:row(base+4*900000,3,995)},
    '3m':{history:[],live:null}
  }}}};
  const m=mcbState.evaluate(frame);
  assert.equal(m.currentLobe.type,'CREUX');
  assert.equal(m.currentLobe.liveZeroCross.detected,true);
  assert.equal(m.currentLobe.liveZeroCross.confirmed,false);
  assert.equal(m.currentLobe.recoveryFraction,1);
  assert.equal(m.lastCompleted.type,'CRETE');
  assert.equal(m.causalContract.completedLobeRequiresConfirmedZeroCross,true);
}

// 6) PM/ticker expose NO_THESIS rather than falsely saying "no movement".
{
  const now=1_800_300_000_000;
  const audit=[];
  let price=1000;
  for(let i=0;i<50;i++){
    const move=(i%3===0?12:-4);
    price+=move;
    audit.push({ts:now+i*30000,lastPrice:price,priceMove:move,volumeFenetreBtc:2,winSec:20,cadence:10});
  }
  const frame={market:{timestamp:now+49*30000,price},sources:{auditRows:audit}};
  const pm=priceTranslation.evaluate(frame,{state:'UNCLEAR',direction:null});
  const tk=tickerConfirmation.evaluate(frame,{state:'UNCLEAR',direction:null});
  assert.equal(pm.status,'NO_THESIS');
  assert.equal(tk.status,'NO_THESIS');
  assert.ok(pm.pmLive);
  assert.ok(tk.current);
}

// 7) Sub-80 thesis remains tradable when PM + ticker confirm.
{
  const frame={market:{price:1000}};
  const th={state:'LONG_FORMING',direction:'long',quality:{pairClass:'PAIR_SUB80_QUALITATIVE'}};
  const pm={status:'TRANSLATING',aligned:true,thesisDirection:'long',
    materiality:{passed:true},sinceSetup:{available:true,netUsd:20,grossUsd:25,efficiency:.8},
    horizons:{net3mUsd:30,net5mUsd:40,efficiency3m:.6}};
  const tk={status:'CONFIRMED',confirmed:true,thesisDirection:'long'};
  const a=action.evaluate(frame,null,{},th,pm,tk,
    {hardStopBreached:false,position:null},
    {setup:{status:'SETUP',direction:'long',setupId:'sub80'},thesis:th,translation:pm,ticker:tk});
  assert.equal(a.type,'ENTER_LONG');
}

console.log('V4.1 E15 quality / causality tests OK');
