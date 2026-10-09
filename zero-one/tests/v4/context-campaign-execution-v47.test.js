'use strict';
const assert=require('assert');
const setupLayer=require('../../modules/v4/layers/setup-lifecycle');
const action=require('../../modules/v4/layers/action');
const room=require('../../modules/v4/layers/structural-room');

const base=1_814_000_000_000;

function setupInputs(direction='long'){
  const sign=direction==='long'?1:-1;
  return {
    frame:{market:{timestamp:base,price:1000}},
    thesis:{candidateDirection:direction,direction:null,mode:'STRUCTURAL_TRAJECTORY',
      quality:{pairClass:'PAIR_MAJOR_QUALITATIVE'}},
    mcb:{
      currentLobe:{startTs:base-900000,extremeTs:base-600000,maturity:'MATURE',type:direction==='long'?'CREUX':'CRETE',
        relationshipFromPrevious:{pairQuality:{class:'PAIR_MAJOR_QUALITATIVE'}}},
      nested3m:{available:true,startTs:base-180000,extremeTs:base-120000,lobeSign:sign,turningDirection:null}
    },
    bg:{primaryRelation:'AGAINST_BACKGROUND'},
    room:{state:'OPEN_PATH',admissionBlocked:false},
    quality:{state:'ACTIVE',lowEdge:false,admissionBlocked:false},
    native:{latest:null,reinforcedUp:{active:false},reinforced3mUp:{active:false,event:null}}
  };
}

// 1) 1h opposition qualifies risk but does not veto a synchronized local setup.
{
  const x=setupInputs('long');
  const s=setupLayer.evaluate(x.frame,x.thesis,x.mcb,x.bg,x.room,x.quality,x.native,null,null,null);
  assert.equal(s.status,'SETUP');
  assert.equal(s.backgroundQualifier,'COUNTER_1H_WAVE');
  assert.equal(s.requirements.againstBackgroundExtraProof,false);
}

// 2) New 3m cycle alone cannot recycle a failed 15m campaign.
{
  const x=setupInputs('long');
  const campaignKey=['long',x.mcb.currentLobe.startTs].join('|');
  const lastExit={
    lastExitTs:base-60000,direction:'long',campaignKey,pnlUsd:-2,
    setupKey:'old-setup'
  };
  let s=setupLayer.evaluate(x.frame,x.thesis,x.mcb,{primaryRelation:'WITH_BACKGROUND'},x.room,x.quality,x.native,null,null,lastExit);
  assert.equal(s.status,'OBSERVE');
  assert.equal(s.campaignRetryBlocked,true);
  assert.ok(s.reasons.includes('CAMPAIGN_RETRY_NEEDS_NEW_15M_EVENT_AFTER_FAILED_TRADE'));

  // Changing only the 3m cycle still does not reset campaign memory.
  x.mcb.nested3m={...x.mcb.nested3m,startTs:base-60000,extremeTs:base-30000};
  s=setupLayer.evaluate(x.frame,x.thesis,x.mcb,{primaryRelation:'WITH_BACKGROUND'},x.room,x.quality,x.native,null,null,lastExit);
  assert.equal(s.status,'OBSERVE');
  assert.equal(s.campaignRetryBlocked,true);

  // A new aligned 15m native event after the failed exit is a legitimate reset.
  x.native.latest={type:'UP',ts:base-30000,confirmed:true};
  s=setupLayer.evaluate(x.frame,x.thesis,x.mcb,{primaryRelation:'WITH_BACKGROUND'},x.room,x.quality,x.native,null,null,lastExit);
  assert.equal(s.status,'SETUP');
  assert.equal(s.nativeAfterExit,true);
  assert.equal(s.campaignReset,true);
}

// 3) #70 pattern: a fresh 30s impulse cannot enter if rolling 3m conversion is opposite.
{
  const proof=action.entryContinuityProof(
    {direction:'long',reinforcedUpBypass:false},
    {horizons:{net3mUsd:-38.8,net5mUsd:-26.8,efficiency3m:.355}},
    {state:'MIXED'}
  );
  assert.equal(proof.ready,false);
}

// 4) CHOP requires more evidence than a good fresh impulse.
{
  // #77-like: 3m/5m point long but efficiency is still too weak for chop.
  const weak=action.entryContinuityProof(
    {direction:'long',reinforcedUpBypass:false},
    {horizons:{net3mUsd:22.2,net5mUsd:20.5,efficiency3m:.277}},
    {state:'CHOP_SHADOW'}
  );
  assert.equal(weak.ready,false);

  // #69-like: broad conversion is coherent and efficient.
  const good=action.entryContinuityProof(
    {direction:'long',reinforcedUpBypass:false},
    {horizons:{net3mUsd:134.9,net5mUsd:152.1,efficiency3m:1}},
    {state:'CHOP_SHADOW'}
  );
  assert.equal(good.ready,true);

  // Strong native MCB remains an explicit exception (#72 family).
  const reinforced=action.entryContinuityProof(
    {direction:'long',reinforcedUpBypass:true},
    {horizons:{net3mUsd:-82.8,net5mUsd:-210.8,efficiency3m:.47}},
    {state:'CHOP_SHADOW'}
  );
  assert.equal(reinforced.ready,true);
}

// 5) #78 pattern: almost no MFE + persistent adverse PM + productive adverse micro => execution failure.
{
  const pos={direction:'long'};
  const tr={status:'STRONG_OPPOSITE_TRANSLATION',horizons:{net3mUsd:-52.4,efficiency3m:.512}};
  const tk={status:'NO_THESIS',direction:'short',oppositeConfirmed:false,
    current:{yieldVsP75:3.01,effortVsP75:1.89}};
  const risk={position:{currentSignedUsd:-84.8,mfeUsd:16.1}};
  const x=action.executionFailureExit(pos,tr,tk,risk);
  assert(x);
  assert.equal(x.type,'EXIT_EXECUTION_FAILURE');
}

// 5b) #83 pattern: a LONG reclaim attempt below VAL gets the full economic MFE allowance.
{
  const pos={direction:'long',context:{structuralRoom:{rangeRr:{
    quality:'LONG_RECLAIM_REQUIRED',location:'BELOW_RANGE',val:82918,poc:83979,vah:85531
  }}}};
  const tr={status:'OPPOSITE_TRANSLATION',horizons:{net3mUsd:-53.8,efficiency3m:.706}};
  const tk={status:'NO_THESIS',direction:'short',oppositeConfirmed:false,
    current:{yieldVsP75:1.126,effortVsP75:19.27}};
  const risk={position:{currentSignedUsd:-98.5,mfeUsd:100.1}};
  const x=action.executionFailureExit(pos,tr,tk,risk);
  assert(x);
  assert.equal(x.type,'EXIT_EXECUTION_FAILURE');
  assert.equal(x.evidence.reclaimRisk,true);
  assert.equal(x.evidence.mfeCeilingUsd,220);

  // The same 100 USD MFE outside a reclaim-risk context does not widen the standard rule.
  const ordinary=action.executionFailureExit({direction:'long'},tr,tk,risk);
  assert.equal(ordinary,null);
}

// 6) #80 family: large MFE + material giveback + adverse PM/micro => take profit without MCB invalidation.
{
  const pos={direction:'long'};
  const tr={status:'OPPOSITE_TRANSLATION',horizons:{net3mUsd:-42.1,efficiency3m:.456}};
  // For an ordinary OPPOSITE_TRANSLATION, make net3 material enough to meet adversePmProof.
  tr.horizons.net3mUsd=-60;
  const tk={status:'OPPOSITE_CONFIRMED',direction:'short',oppositeConfirmed:true,
    current:{yieldVsP75:1.34,effortVsP75:1.09}};
  const risk={position:{currentSignedUsd:369,mfeUsd:633}};
  const x=action.mfeProtectionExit(pos,tr,tk,risk);
  assert(x);
  assert.equal(x.type,'EXIT_MFE_PROTECTION');

  const tooEarly=action.mfeProtectionExit(pos,tr,tk,{position:{currentSignedUsd:180,mfeUsd:210}});
  assert.equal(tooEarly,null);
}

// 7) Range is R/R qualification, not a veto.
{
  const levels=[
    {label:'VAH daily',price:85531,groupId:4},
    {label:'POC daily',price:83979,groupId:4},
    {label:'VAL daily',price:82918,groupId:4}
  ];
  const short=room.rangeRr(levels,83179,'short');
  assert.equal(short.available,true);
  assert.equal(short.quality,'LOW_RR');
  assert(Math.abs(short.roomUsd-261)<1e-9);
  assert(short.roomFraction<.15);
  assert.equal(short.decisionImpact,false);

  const below=room.rangeRr(levels,82849,'long');
  assert.equal(below.location,'BELOW_RANGE');
  assert.equal(below.quality,'LONG_RECLAIM_REQUIRED');
  assert.equal(below.decisionImpact,false);
}

console.log('V4.7 context/campaign/execution tests OK');
