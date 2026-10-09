'use strict';
const assert=require('assert');
const trajectory=require('../../modules/v4/layers/structural-trajectory');
const background=require('../../modules/v4/layers/mcb-background');
const thesis=require('../../modules/v4/layers/mcb-thesis');
const maturity=require('../../modules/v4/layers/opportunity-maturity');

function rows(tf){
  const step={
    '3m':180000,'15m':900000,'1h':3600000,'4h':14400000,'1d':86400000,'1w':604800000
  }[tf];
  const base=1_800_000_000_000;
  const vals=[45,82,70,62,55,60];
  return vals.map((lbw,i)=>({
    ts:base+i*step,
    timestamp:new Date(base+i*step).toISOString(),
    lt_blue_wave:lbw,
    blue_wave:lbw*.9,
    open:1000+i*5,
    high:1010+i*5,
    low:990+i*5,
    close:1000+i*5
  }));
}

// Same structural contract on every MCB timeframe.
for(const tf of ['3m','15m','1h','4h','1d','1w']){
  const out=trajectory.evaluate({history:rows(tf)},tf);
  assert.equal(out.available,true,tf+' trajectory available');
  assert.equal(out.structuralDirection,'short',tf+' structural direction');
  assert.equal(out.structuralState,'DESCENT_ACTIVE',tf+' structural state');
  assert.equal(out.lastStructuralPivot.type,'CRETE',tf+' last pivot');
  assert.ok(Number.isFinite(out.structuralConfirmedAt),tf+' confirmedAt');
}

// 1h can still be in a positive lobe while structural context is already SHORT.
{
  const src={history:rows('1h')};
  const v=background.tfView(src,'1h');
  assert.equal(v.lobeSign,1);
  assert.equal(v.structuralDirection,'short');
  assert.equal(v.structuralState,'DESCENT_ACTIVE');

  const frame={sources:{mcb:{tfs:{'1h':src}}}};
  const b=background.evaluate(frame,'short');
  assert.equal(b.primaryRelation,'WITH_BACKGROUND');
  assert.equal(b.legacyPrimaryRelation,'AGAINST_BACKGROUND');
}

// 15m structural direction may propose a reversal candidate before zero-cross.
{
  const mcb={
    currentLobe:{
      type:'CRETE',sign:1,lobeSign:1,lobeDirection:'long',directionIntoLobe:'long',
      structuralDirection:'short',structuralState:'DESCENT_ACTIVE',structuralConfirmedAt:123,
      currentLbw:55,extremeLbw:82,recoveryFraction:.15,e15Class:'E15_PAIR_SUB80_QUALITATIVE',
      confirmedSide:true,relationshipFromPrevious:{pairQuality:{class:'PAIR_SUB80_QUALITATIVE'}}
    },
    structural15m:{structuralDirection:'short',structuralState:'DESCENT_ACTIVE',structuralConfirmedAt:123},
    nested3m:{available:true}
  };
  const x=thesis.evaluate(mcb);
  assert.equal(x.state,'TRANSITION_NEUTRAL');
  assert.equal(x.candidateDirection,'short');
  assert.equal(x.mode,'STRUCTURAL_TRAJECTORY');
  assert.equal(x.direction,null);
}

// 3m timing follows structural trajectory, not lobe sign.
{
  const mcb={nested3m:{
    available:true,lobeSign:1,turningDirection:null,
    structuralDirection:'short',structuralState:'DESCENT_ACTIVE',structuralConfirmedAt:456
  }};
  const x=maturity.nested3mCoherence(mcb,'short');
  assert.equal(x.coherent,true);
  assert.equal(x.state,'STRUCTURAL_ALIGNED');
  assert.equal(x.structuralDirection,'short');

  const y=maturity.nested3mCoherence(mcb,'long');
  assert.equal(y.coherent,false);
  assert.equal(y.state,'STRUCTURAL_OPPOSING');
}

console.log('V4.6 structural trajectory tests OK');
