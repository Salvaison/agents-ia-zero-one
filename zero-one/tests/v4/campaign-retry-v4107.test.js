'use strict';
const assert=require('assert');
const setupLayer=require('../../modules/v4/layers/setup-lifecycle');

const base=1_820_000_000_000;
function common(){
  return {
    frame:{market:{timestamp:base,price:1000}},
    thesis:{candidateDirection:'long',direction:null,mode:'STRUCTURAL_TRAJECTORY',quality:{pairClass:'PAIR_MAJOR_QUALITATIVE'}},
    mcb:{currentLobe:{startTs:base-900000,extremeTs:base-600000,maturity:'MATURE',type:'CREUX',relationshipFromPrevious:{pairQuality:{class:'PAIR_MAJOR_QUALITATIVE'}}},nested3m:{available:true,startTs:base-180000,extremeTs:base-120000,lobeSign:1,lobeDirection:'long',structuralDirection:'long',structuralState:'ASCENT_ACTIVE',structuralConfirmedAt:base-120000}},
    bg:{primaryRelation:'WITH_BACKGROUND'},room:{state:'OPEN_PATH',admissionBlocked:false},quality:{state:'ACTIVE',lowEdge:false,admissionBlocked:false},native:{latest:null,reinforcedUp:{active:false},reinforced3mUp:{active:false,event:null}}
  };
}
const campaignKey=['long',base-900000].join('|');
const lastExit={lastExitTs:base-60000,direction:'long',campaignKey,pnlUsd:-2,setupKey:'old'};

// Old reinforced signal must not reset a losing campaign.
{
  const x=common();
  x.native.reinforcedUp={active:true,event:{type:'UP',ts:base-10*60000,value:-70}};
  x.mcb.nested3m={...x.mcb.nested3m,lobeSign:-1,lobeDirection:'short',structuralDirection:'long',structuralConfirmedAt:base-3*60000};
  const s=setupLayer.evaluate(x.frame,x.thesis,x.mcb,x.bg,x.room,x.quality,x.native,null,null,lastExit,null,null,{horizons:{net3mUsd:60,net5mUsd:-55,efficiency3m:.61}},{interesting:true,direction:'long',state:'INTERESTING_PRICE_WITH_WAVE'});
  assert.equal(s.status,'OBSERVE');
  assert.equal(s.campaignRetryBlocked,true);
  assert.equal(s.campaignReset,false);
  assert.equal(s.localRetryRequalification.ready,false);
}

// Fresh post-exit local transfer can reset without a new 15m event.
{
  const x=common();
  x.mcb.nested3m={...x.mcb.nested3m,lobeSign:1,lobeDirection:'long',structuralDirection:'long',structuralState:'ASCENT_ACTIVE',structuralConfirmedAt:base-30000};
  const s=setupLayer.evaluate(x.frame,x.thesis,x.mcb,x.bg,x.room,{state:'CHOP_SHADOW',lowEdge:true,admissionBlocked:false},x.native,null,null,lastExit,null,null,{horizons:{net3mUsd:171,net5mUsd:308.5,efficiency3m:.65}},{interesting:true,direction:'long',state:'INTERESTING_PRICE'});
  assert.equal(s.status,'SETUP');
  assert.equal(s.campaignRetryBlocked,false);
  assert.equal(s.campaignReset,true);
  assert.equal(s.campaignResetReason,'LOCAL_POST_EXIT_REQUALIFICATION');
  assert.equal(s.localRetryRequalification.ready,true);
}

// The same local transfer is insufficient if PM5 still opposes.
{
  const x=common();
  x.mcb.nested3m={...x.mcb.nested3m,structuralConfirmedAt:base-30000};
  const s=setupLayer.evaluate(x.frame,x.thesis,x.mcb,x.bg,x.room,x.quality,x.native,null,null,lastExit,null,null,{horizons:{net3mUsd:60,net5mUsd:-30,efficiency3m:.8}},{interesting:true,direction:'long',state:'INTERESTING_PRICE'});
  assert.equal(s.status,'OBSERVE');
  assert.equal(s.campaignRetryBlocked,true);
}

console.log('V4.10.7 campaign retry requalification tests OK');
