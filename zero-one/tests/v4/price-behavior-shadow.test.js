'use strict';
const assert=require('assert');
const shadow=require('../../modules/v4/experiments/price-behavior-shadow');

const base=1_910_000_000_000;
function ev(type,ts,value=0){return {type,ts,timestamp:new Date(ts).toISOString(),value,confirmed:true};}

// Native memory explicitly distinguishes 3m -> 15m from 15m -> 3m.
{
  const a=shadow.signalMemory({
    last3mUp:ev('UP',base),last3mDn:null,
    lastUp:ev('UP',base+60000),lastDn:null
  });
  assert.equal(a.established,true);
  assert.equal(a.direction,'long');
  assert.equal(a.sequence,'SIGNAL3_TO_SIGNAL15');
  assert.equal(a.gapMinutes,1);

  const b=shadow.signalMemory({
    last3mUp:ev('UP',base+120000),last3mDn:null,
    lastUp:ev('UP',base),lastDn:null
  });
  assert.equal(b.established,true);
  assert.equal(b.sequence,'SIGNAL15_TO_SIGNAL3');
}

// Opposite latest memories remain a conflict, not a fabricated wave.
{
  const x=shadow.signalMemory({
    last3mUp:ev('UP',base+120000),last3mDn:null,
    lastUp:null,lastDn:ev('DN',base+60000)
  });
  assert.equal(x.established,false);
  assert.equal(x.state,'SIGNAL_MEMORY_CONFLICT');
}

// Easy travel is observable even with NO_THESIS: price behavior is not subordinate to admission.
{
  const frame={market:{timestamp:base+180000,price:1100}};
  const native={
    last3mUp:ev('UP',base),last3mDn:null,
    lastUp:ev('UP',base+60000),lastDn:null
  };
  const translation={status:'NO_THESIS',horizons:{net1mUsd:50,net3mUsd:120,net5mUsd:180,efficiency1m:.9,efficiency3m:.8,efficiency5m:.7}};
  const ticker={status:'NO_THESIS',direction:'long',confirmed:false,current:{
    yieldVsP75:2.9,yieldVsP95:.9,effortVsP75:.4,cadence:20,flowBtcPerSec:.5,yieldUsdPerBtc:24
  }};
  const x=shadow.evaluate(frame,native,translation,ticker,null);
  assert.equal(x.decisionImpact,false);
  assert.equal(x.travel.state,'EASY_TRAVEL');
  assert.equal(x.interesting,true);
  assert.equal(x.waveEstablished,true);
  assert.equal(x.waveAligned,true);
  assert.equal(x.state,'INTERESTING_PRICE_WITH_WAVE');
  assert.equal(x.observations.establishedWavePlusEasyPrice,true);
}

// Extreme yield with low effort gets its own descriptive class.
{
  const x=shadow.classifyTicker({direction:'short',current:{yieldVsP75:4,yieldVsP95:1.2,effortVsP75:.6}});
  assert.equal(x.state,'EXTREME_EASY_TRAVEL');
  assert.equal(x.direction,'short');
}

// High effort with sub-P75 yield is explicitly inefficient/stalled behavior.
{
  const x=shadow.classifyTicker({direction:'long',current:{yieldVsP75:.5,yieldVsP95:.2,effortVsP75:3}});
  assert.equal(x.state,'HIGH_EFFORT_LOW_YIELD');
}

// Episode persistence measures actual terrain while the same price behavior persists.
{
  const native={
    last3mUp:ev('UP',base),last3mDn:null,
    lastUp:ev('UP',base+60000),lastDn:null
  };
  const translation={horizons:{net3mUsd:100,net5mUsd:150,efficiency3m:.8,efficiency5m:.7}};
  const ticker={direction:'long',current:{yieldVsP75:2,yieldVsP95:.8,effortVsP75:.5}};
  const first=shadow.evaluate({market:{timestamp:base+180000,price:1000}},native,translation,ticker,null);
  const second=shadow.evaluate({market:{timestamp:base+240000,price:1120}},native,translation,ticker,first);
  assert.equal(second.episode.startedAt,first.episode.startedAt);
  assert.equal(second.episode.samples,2);
  assert.equal(second.episode.currentSignedMoveUsd,120);
  assert.equal(second.episode.maxFavorableUsd,120);
  assert.equal(second.episode.durationMinutes,1);
}

// If ticker direction is unavailable, coherent 3m+5m price conversion remains observable.
{
  const x=shadow.evaluate(
    {market:{timestamp:base+300000,price:900}},
    {},
    {horizons:{net3mUsd:-80,net5mUsd:-120,efficiency3m:.7,efficiency5m:.8}},
    {current:{yieldVsP75:.8,effortVsP75:.5}},
    null
  );
  assert.equal(x.direction,'short');
  assert.equal(x.pm.multiHorizonDirection,'short');
}



// Price shadow prefers persistent strategic lineage over a noisy latest-3m conflict.
{
  const native={
    signalSequenceMemory:{
      available:true,established:true,direction:'long',sequence:'SIGNAL3_TO_SIGNAL15',
      strategic15m:ev('UP',base+60000),precursor3m:ev('UP',base),
      latest3m:ev('DN',base+120000),tacticalOpposition:true,
      tacticalState:'3M_OPPOSES_ESTABLISHED_15M_WAVE',decisionImpact:false
    },
    last3mUp:ev('UP',base),last3mDn:ev('DN',base+120000),
    lastUp:ev('UP',base+60000),lastDn:null
  };
  const m=shadow.signalMemory(native);
  assert.equal(m.established,true);
  assert.equal(m.direction,'long');
  assert.equal(m.sequence,'SIGNAL3_TO_SIGNAL15');
  assert.equal(m.tacticalOpposition,true);
  assert.equal(m.persistentStrategicMemory,true);
}

console.log('V4 price behavior shadow tests OK');
