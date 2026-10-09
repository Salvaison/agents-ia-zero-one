'use strict';

const {finite}=require('../core/utils');

const VERSION='capitulation-4h15-v1';
const DEEP_LBW_THRESHOLD=-60;
const FIFTEEN_MIN_MS=15*60*1000;

function aligned15NativeAvailableAt(native,candidate){
  const e=native&&native.latest||null;
  if(!e||!candidate)return null;
  const aligned=(candidate==='long'&&e.type==='UP')||(candidate==='short'&&e.type==='DN');
  if(!aligned)return null;
  return Number(e.ts)+FIFTEEN_MIN_MS;
}
function structural15AvailableAt(mcb){
  const c=mcb&&mcb.currentLobe||{};
  return finite(c.structuralConfirmedAt)?Number(c.structuralConfirmedAt)+FIFTEEN_MIN_MS:null;
}
function evaluate(frame,candidate,mcb,background,native,entryControl){
  const now=Number(frame&&frame.market&&frame.market.timestamp);
  const h4=background&&background.fourHour||{};
  const c=mcb&&mcb.currentLobe||{};
  const f4=native&&native.fourHour||{};
  const e=f4.lastSub60Up||null;

  const deepReached=!!(
    candidate==='long'&&h4.available&&
    h4.lobeType==='CREUX'&&
    h4.structuralDirection==='short'&&
    finite(h4.extremeLbw)&&Number(h4.extremeLbw)<=DEEP_LBW_THRESHOLD
  );

  const armAvailableAt=e&&finite(e.availableAt)?Number(e.availableAt):null;
  const armInCurrent4hLobe=!!(
    e&&finite(e.ts)&&finite(h4.startTs)&&Number(e.ts)>=Number(h4.startTs)
  );
  const armActive=!!(
    deepReached&&f4.reversalArmed&&e&&armInCurrent4hLobe&&
    finite(armAvailableAt)&&armAvailableAt<=now
  );
  const armToken=armActive?String(e.ts):null;

  const s15At=structural15AvailableAt(mcb);
  const n15At=aligned15NativeAvailableAt(native,candidate);
  const latest15ProofAt=[s15At,n15At].filter(Number.isFinite).sort((a,b)=>b-a)[0]||null;
  const postArm15m=!!(
    armActive&&finite(latest15ProofAt)&&finite(armAvailableAt)&&
    latest15ProofAt>=armAvailableAt
  );

  const lastFailedSameArm=!!(
    deepReached&&armActive&&entryControl&&
    entryControl.direction==='long'&&
    Number.isFinite(Number(entryControl.pnlUsd))&&Number(entryControl.pnlUsd)<=0&&
    entryControl.fourHourArmToken&&String(entryControl.fourHourArmToken)===String(armToken)&&
    entryControl.capitulationReversal===true
  );

  let state='NORMAL';
  let blocked=false;
  let reason=null;
  if(deepReached&&!armActive){
    state='DEEP_4H_WAIT_UP_SUB60';
    blocked=true;
    reason='4h deep capitulation: LONG reversal search is locked until a causally confirmed 4h UP at/below -60';
  }else if(deepReached&&armActive&&!postArm15m){
    state='4H_REVERSAL_ARMED_WAIT_NEW_15M';
    blocked=true;
    reason='4h sub-60 UP is confirmed; wait for new 15m structural/native bullish evidence formed after the 4h confirmation';
  }else if(deepReached&&armActive&&lastFailedSameArm){
    state='4H_ARM_CONSUMED_AFTER_FAILED_REVERSAL';
    blocked=true;
    reason='this 4h sub-60 reversal arm already funded a failed LONG campaign; wait for a new 4h arm or a confirmed 4h structural turn';
  }else if(deepReached&&armActive&&postArm15m){
    state='4H_REVERSAL_ARMED_15M_READY';
  }

  return {
    version:VERSION,
    candidateDirection:candidate||null,
    state,blocked,decisionImpact:deepReached,
    deepReached,
    thresholdLbw:DEEP_LBW_THRESHOLD,
    fourHour:{
      lobeType:h4.lobeType||null,
      currentLbw:finite(h4.currentLbw)?Number(h4.currentLbw):null,
      extremeLbw:finite(h4.extremeLbw)?Number(h4.extremeLbw):null,
      structuralDirection:h4.structuralDirection||null,
      structuralState:h4.structuralState||null,
      startTs:finite(h4.startTs)?Number(h4.startTs):null
    },
    arm:{
      active:armActive,
      token:armToken,
      event:e||null,
      availableAt:armAvailableAt,
      postArm15m,
      latest15ProofAt,
      structural15AvailableAt:s15At,
      native15AvailableAt:n15At,
      consumedByFailedCampaign:lastFailedSameArm
    },
    reason,
    semantic:'4h authorizes the search for a macro reversal; 15m proposes a new post-arm setup; 3m + PM time execution'
  };
}

module.exports={VERSION,DEEP_LBW_THRESHOLD,FIFTEEN_MIN_MS,evaluate,aligned15NativeAvailableAt,structural15AvailableAt};
