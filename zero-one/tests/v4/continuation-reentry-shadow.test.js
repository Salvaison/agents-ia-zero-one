'use strict';
const assert=require('assert');
const shadow=require('../../modules/v4/experiments/continuation-reentry-shadow');

const base=1_900_000_000_000;
function frame(price,ts,exitKind='EXIT_ECONOMIC_PROFIT_FLOOR'){
  return {market:{price,timestamp:ts},entryControl:{
    lastExitTs:base,lastExitTimestamp:new Date(base).toISOString(),direction:'long',
    campaignKey:'long|campaign',pnlUsd:1.2,mfeUsd:350,exitKind
  }};
}
const baseThesis={candidateDirection:'long'};
const mcb={nested3m:{lobeSign:1,lobeDirection:'long',structuralDirection:'short'}};
const native={
  latest:{type:'UP',ts:base-60000},
  last3mUp:{type:'UP',ts:base+60000,value:10},
  last3mDn:{type:'DN',ts:base-60000,value:-10}
};
const pm={horizons:{net3mUsd:120,net5mUsd:180,efficiency3m:.7}};
const mf={temporal:{memoryDirection:'long',memoryHorizon:'h2'}};
const room={state:'OPEN_PATH',admissionBlocked:false};

// Candidate can form despite opposing 3m structuralDirection because this is explicitly a continuation shadow.
{
  const tk={status:'NO_THESIS',direction:'long',confirmed:false,current:{yieldVsP75:.7,yieldVsP95:.3,effortVsP75:.5}};
  const x=shadow.evaluate(frame(1000,base+120000),null,baseThesis,mcb,native,pm,tk,mf,room,null);
  assert.equal(x.state,'CONTINUATION_REENTRY_CANDIDATE');
  assert.equal(x.eligible,true);
  assert.equal(x.decisionImpact,false);
  assert.equal(x.evidence.ticker.quality,'UNPRODUCTIVE');
}

// Ticker classifies low-effort/high-yield but never gates candidate creation.
{
  const tk={status:'NO_THESIS',direction:'long',confirmed:false,current:{yieldVsP75:2.4,yieldVsP95:.8,effortVsP75:.45}};
  const x=shadow.evaluate(frame(1000,base+120000),null,baseThesis,mcb,native,pm,tk,mf,room,null);
  assert.equal(x.eligible,true);
  assert.equal(x.evidence.ticker.quality,'LOW_EFFORT_HIGH_YIELD');
}

// One candidate per exit: later cycles track MFE/MAE instead of retriggering.
{
  const tk={current:{yieldVsP75:2,effortVsP75:.5}};
  const first=shadow.evaluate(frame(1000,base+120000),null,baseThesis,mcb,native,pm,tk,mf,room,null);
  const second=shadow.evaluate(frame(1250,base+180000),null,baseThesis,mcb,native,pm,tk,mf,room,first);
  assert.equal(second.state,'TRACKING_SHADOW_REENTRY');
  assert.equal(second.triggeredAt,first.triggeredAt);
  assert.equal(second.shadowMfeUsd,250);
  assert.equal(second.reachedEconomicMove,true);
}

// Churn-risk accounting: adverse 180 before economic MFE is explicitly flagged.
{
  const tk={current:{yieldVsP75:.5,effortVsP75:.5}};
  const first=shadow.evaluate(frame(1000,base+120000),null,baseThesis,mcb,native,pm,tk,mf,room,null);
  const second=shadow.evaluate(frame(810,base+180000),null,baseThesis,mcb,native,pm,tk,mf,room,first);
  assert.equal(second.shadowMaeUsd,190);
  assert.equal(second.reachedEconomicMove,false);
  assert.equal(second.churnRisk,true);
}

// No shadow re-entry after an execution-failure exit.
{
  const x=shadow.evaluate(frame(1000,base+120000,'EXIT_EXECUTION_FAILURE'),null,baseThesis,mcb,native,pm,{},mf,room,null);
  assert.equal(x.state,'NO_PROTECTIVE_EXIT_CONTEXT');
  assert.equal(x.eligible,false);
}

// Slow 2h/4h MF memory opposing the old direction invalidates continuation.
{
  const oppMf={temporal:{memoryDirection:'short',memoryHorizon:'h4'}};
  const x=shadow.evaluate(frame(1000,base+120000),null,baseThesis,mcb,native,pm,{},oppMf,room,null);
  assert.equal(x.state,'REENTRY_INVALIDATED');
  assert.equal(x.eligible,false);
}

// Fresh 3m event is mandatory.
{
  const oldNative={...native,last3mUp:{type:'UP',ts:base-60000},last3mDn:{type:'DN',ts:base-120000}};
  const x=shadow.evaluate(frame(1000,base+120000),null,baseThesis,mcb,oldNative,pm,{},mf,room,null);
  assert.equal(x.state,'ARMED_WAIT_CONTINUATION');
  assert.ok(x.waits.includes('WAIT_FRESH_3M_EVENT_AFTER_EXIT'));
}

console.log('V4 continuation reentry shadow tests OK');
