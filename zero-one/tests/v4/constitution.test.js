'use strict';
const assert=require('assert');
const mcbState=require('../../modules/v4/layers/mcb-state');
const mcbThesis=require('../../modules/v4/layers/mcb-thesis');
const maturity=require('../../modules/v4/layers/opportunity-maturity');
const action=require('../../modules/v4/layers/action');
const risk=require('../../modules/v4/layers/risk');

function row(ts,lbw,price){
  return {ts,timestamp:new Date(ts).toISOString(),lt_blue_wave:lbw,blue_wave:lbw*.7,money_flow:0,
    open:price,high:price+5,low:price-5,close:price};
}
const base=1_800_000_000_000;
const hist15=[
  row(base+0*900000,50,1000),
  row(base+1*900000,55,1010),
  row(base+2*900000,40,1005),
  row(base+3*900000,-10,980),
  row(base+4*900000,-40,950),
  row(base+5*900000,-65,900),
  row(base+6*900000,-50,920)
];
const live15=row(base+7*900000,-30,930);
const hist3=[row(base+6*900000,-60,905),row(base+6*900000+180000,-55,915)];
const live3=row(base+6*900000+360000,-45,925);
const frame={market:{price:930,timestamp:live15.ts},sources:{auditRows:[],liveTicks:[],levels:[],trendlines:null,
  mcb:{tfs:{'15m':{history:hist15,live:live15},'3m':{history:hist3,live:live3}}}}};
const ms=mcbState.evaluate(frame);
assert.equal(ms.currentLobe.type,'CREUX');
assert.ok(ms.currentLobe.relationshipFromPrevious.lbwSpan>=80);
assert.ok(ms.currentLobe.recoveryFraction>.35);
assert.equal(ms.currentLobe.maturity,'MATURE_REVERSING');
const baseTh=mcbThesis.evaluate(ms);
assert.equal(baseTh.state,'TRANSITION_NEUTRAL');
assert.equal(baseTh.direction,null);
assert.equal(baseTh.candidateDirection,'long');
assert.equal(baseTh.authority,'MCB_ONLY');
const translation={status:'STRONG_TRANSLATION',aligned:true,thesisDirection:'long',horizons:{net3mUsd:25}};
const th=maturity.evaluate(baseTh,ms,translation);
assert.equal(th.state,'LONG_FORMING');
assert.equal(th.direction,'long');

const baseRisk={hardStopBreached:false,position:null};
const entryTicker={status:'STRONG_CONFIRMATION',confirmed:true,thesisDirection:'long'};
const enter=action.evaluate(frame,null,ms,th,
  translation,
  entryTicker,
  baseRisk,
  {setup:{status:'SETUP',direction:'long',setupId:'test-setup'},thesis:th,translation,ticker:entryTicker});
assert.equal(enter.type,'ENTER_LONG');

const noMcb=action.evaluate(frame,null,ms,{state:'UNCLEAR',direction:null},
  {status:'STRONG_TRANSLATION',aligned:true,thesisDirection:null},
  {status:'STRONG_CONFIRMATION',confirmed:true,thesisDirection:null},baseRisk);
assert.equal(noMcb.type,'NO_TRADE');

const pos={direction:'long',entryPrice:1000,metrics:{mfeUsd:300,maeUsd:0}};
const rHard=risk.evaluate({market:{price:500}},pos,ms,th,{}, {}, {});
assert.equal(rHard.absoluteMaxLossUsd,500);
assert.equal(rHard.hardStopBreached,true);
const exitRisk=action.evaluate({market:{price:500}},pos,ms,th,
  {status:'NOT_TRANSLATING',aligned:false},{confirmed:false},rHard);
assert.equal(exitRisk.type,'EXIT_RISK');

const shortTh={state:'SHORT_FORMING',direction:'short'};
const rOk={hardStopBreached:false,position:{currentSignedUsd:120,mfeUsd:420}};
const exitGain=action.evaluate(frame,pos,ms,shortTh,
  {status:'TRANSLATING',aligned:true,thesisDirection:'short'},
  {status:'CONFIRMED',confirmed:true,thesisDirection:'short'},rOk);
assert.equal(exitGain.type,'EXIT_PROFIT_PROTECTION');

const hold=action.evaluate(frame,pos,ms,shortTh,
  {status:'TRANSLATING',aligned:true,thesisDirection:'short'},
  {status:'NOT_CONFIRMED',confirmed:false,thesisDirection:'short'},rOk);
assert.equal(hold.type,'HOLD');

console.log('V4 constitution tests OK');
