'use strict';
const {finite}=require('../core/utils');
const mcbState=require('./mcb-state');
const structuralTrajectory=require('./structural-trajectory');

const REINFORCED_UP_THRESHOLD=-60;
const REINFORCED_3M_UP_THRESHOLD=REINFORCED_UP_THRESHOLD;
const REINFORCED_4H_UP_THRESHOLD=REINFORCED_UP_THRESHOLD;
const FOUR_HOUR_MS=4*60*60*1000;
const REINFORCED_UP_MAX_AGE_MIN=90;
const NATIVE_SIGNAL_MAX_AGE_MIN=60;

function eventsFromTf(src){
  const rows=mcbState.confirmedSeries(src);
  const out=[];
  for(const r of rows){
    const ts=Number(r.ts);
    if(!finite(ts))continue;
    if(finite(r.wt1_cross_up))out.push({type:'UP',value:Number(r.wt1_cross_up),ts,timestamp:r.timestamp||new Date(ts).toISOString(),confirmed:true});
    if(finite(r.wt1_cross_dn))out.push({type:'DN',value:Number(r.wt1_cross_dn),ts,timestamp:r.timestamp||new Date(ts).toISOString(),confirmed:true});
  }
  return out.sort((a,b)=>a.ts-b.ts);
}
function ageMinutes(ts,now){return finite(ts)&&finite(now)?Math.max(0,(Number(now)-Number(ts))/60000):null;}
function decorate(e,now){return e?{...e,ageMinutes:ageMinutes(e.ts,now)}:null;}
function decorateWithAvailability(e,now,periodMs){
  if(!e)return null;
  const availableAt=Number(e.ts)+Number(periodMs||0);
  return {
    ...e,
    ageMinutes:ageMinutes(e.ts,now),
    availableAt,
    availableTimestamp:new Date(availableAt).toISOString(),
    causalAgeMinutes:ageMinutes(availableAt,now)
  };
}

function evaluate(frame){
  const tfs=frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs||{};
  const now=Number(frame.market.timestamp);
  const e15=eventsFromTf(tfs['15m']);
  const e3=eventsFromTf(tfs['3m']);
  const e1h=eventsFromTf(tfs['1h']);
  const e4h=eventsFromTf(tfs['4h']);

  const latest=e15[e15.length-1]||null;
  const latest1h=e1h[e1h.length-1]||null;
  const last1hUp=e1h.slice().reverse().find(e=>e.type==='UP')||null;
  const last1hDn=e1h.slice().reverse().find(e=>e.type==='DN')||null;
  const latest4h=e4h[e4h.length-1]||null;
  const last4hUp=e4h.slice().reverse().find(e=>e.type==='UP')||null;
  const last4hDn=e4h.slice().reverse().find(e=>e.type==='DN')||null;
  const last4hSub60Up=e4h.slice().reverse().find(e=>e.type==='UP'&&Number(e.value)<=REINFORCED_4H_UP_THRESHOLD)||null;
  const src4=tfs['4h']||{};
  const live4=src4.live||null,confirmed4=src4.confirmed||null;
  const live4Lbw=live4&&finite(live4.lt_blue_wave)?Number(live4.lt_blue_wave):null;
  const confirmed4Lbw=confirmed4&&finite(confirmed4.lt_blue_wave)?Number(confirmed4.lt_blue_wave):null;
  const deep4Lbw=finite(live4Lbw)?live4Lbw:confirmed4Lbw;
  const fourHourDeepSub60=finite(deep4Lbw)&&Number(deep4Lbw)<=REINFORCED_UP_THRESHOLD;
  const last4hSub60AvailableAt=last4hSub60Up?Number(last4hSub60Up.ts)+FOUR_HOUR_MS:null;
  const fourHourReversalArmed=!!(
    last4hSub60Up&&Number(last4hSub60AvailableAt)<=now&&
    (!last4hDn||Number(last4hDn.ts)<Number(last4hSub60Up.ts))
  );
  const fourHourStructural=structuralTrajectory.evaluate(src4,'4h');
  const fourHourPivot=fourHourStructural.lastStructuralPivot||null;
  const fourHourPivotDeep=!!(
    fourHourPivot&&(
      (fourHourPivot.type==='CREUX'&&Number(fourHourPivot.lbw)<=REINFORCED_UP_THRESHOLD)||
      (fourHourPivot.type==='CRETE'&&Number(fourHourPivot.lbw)>=Math.abs(REINFORCED_UP_THRESHOLD))
    )
  );
  const marketPrice=Number(frame.market.price);
  const fourHourPivotBreach=!!(
    fourHourPivotDeep&&finite(marketPrice)&&finite(deep4Lbw)&&(
      (fourHourPivot.type==='CREUX'&&marketPrice<Number(fourHourPivot.price)&&Number(deep4Lbw)<Number(fourHourPivot.lbw))||
      (fourHourPivot.type==='CRETE'&&marketPrice>Number(fourHourPivot.price)&&Number(deep4Lbw)>Number(fourHourPivot.lbw))
    )
  );
  const lastUp=e15.slice().reverse().find(e=>e.type==='UP')||null;
  const lastDn=e15.slice().reverse().find(e=>e.type==='DN')||null;
  const lastReinforcedUp=e15.slice().reverse().find(e=>e.type==='UP'&&Number(e.value)<=REINFORCED_UP_THRESHOLD)||null;
  const reinforcedAge=lastReinforcedUp?ageMinutes(lastReinforcedUp.ts,now):null;
  const reinforcedActive=!!(
    lastReinforcedUp&&reinforcedAge<=REINFORCED_UP_MAX_AGE_MIN&&
    (!lastDn||Number(lastReinforcedUp.ts)>Number(lastDn.ts))
  );

  const last3Up=e3.slice().reverse().find(e=>e.type==='UP')||null;
  const last3Dn=e3.slice().reverse().find(e=>e.type==='DN')||null;
  const lastReinforced3mUp=e3.slice().reverse().find(e=>e.type==='UP'&&Number(e.value)<=REINFORCED_3M_UP_THRESHOLD)||null;
  // Tactical 3m event: it stays active only inside its native UP->next DN cycle.
  // No timer or price-distance expiry is invented here.
  const reinforced3mUpActive=!!(
    lastReinforced3mUp&&(!last3Dn||Number(last3Dn.ts)<Number(lastReinforced3mUp.ts))
  );
  const sync3Up=reinforcedActive
    ?e3.find(e=>e.type==='UP'&&Number(e.ts)>=Number(lastReinforcedUp.ts))||null
    :null;
  // The 15m reinforced trough is considered synchronised once a CONFIRMED 3m
  // UP occurs afterwards. A later confirmed 3m DN explicitly ends this sync.
  const reinforcedLongSyncActive=!!(
    sync3Up&&(!last3Dn||Number(last3Dn.ts)<Number(sync3Up.ts))
  );

  const latestAge=latest?ageMinutes(latest.ts,now):null;
  return {
    latest:decorate(latest,now),
    lastUp:decorate(lastUp,now),
    lastDn:decorate(lastDn,now),
    last3mUp:decorate(last3Up,now),
    last3mDn:decorate(last3Dn,now),
    oneHour:{
      latest:decorate(latest1h,now),
      lastUp:decorate(last1hUp,now),
      lastDn:decorate(last1hDn,now),
      decisionImpact:false,
      semantic:'1h native MCB signal is contextual evidence for the 15m/3m stack; never an entry order by itself'
    },
    fourHour:{
      latest:decorateWithAvailability(latest4h,now,FOUR_HOUR_MS),
      lastUp:decorateWithAvailability(last4hUp,now,FOUR_HOUR_MS),
      lastDn:decorateWithAvailability(last4hDn,now,FOUR_HOUR_MS),
      lastSub60Up:decorateWithAvailability(last4hSub60Up,now,FOUR_HOUR_MS),
      currentLbw:deep4Lbw,
      confirmedLbw:confirmed4Lbw,
      liveLbw:live4Lbw,
      deepSub60:fourHourDeepSub60,
      reversalArmed:fourHourReversalArmed,
      state:fourHourReversalArmed?'UP_SUB60_CONFIRMED':(fourHourDeepSub60?'DEEP_SUB60_WAIT_UP':'NORMAL'),
      structuralPivot:fourHourPivot,
      structuralPivotDeep:fourHourPivotDeep,
      pivotBreachShadow:{
        active:fourHourPivotBreach,
        state:fourHourPivotBreach?'STRUCTURAL_PIVOT_BREACH':'INTACT',
        decisionImpact:false,
        semantic:'a confirmed deep 4h pivot is falsified only when both market price and live/confirmed 4h LBW cross beyond the pivot in the adverse direction'
      },
      decisionImpact:'CAPITULATION_PERMISSION_ONLY',
      semantic:'4h native UP/DN are macro reversal evidence. A sub-60 UP becomes usable only after the 4h bar closes; it may unlock search for a new 15m reversal setup until the next confirmed 4h DN.'
    },
    reinforced3mUp:{
      active:reinforced3mUpActive,
      thresholdLbw:REINFORCED_3M_UP_THRESHOLD,
      event:decorate(lastReinforced3mUp,now),
      semantic:'UP_REINFORCED_3M is a tactical timing event: it closes a late SHORT entry window in the current 3m cycle and alerts respiration on an open SHORT; it is not an exit order by itself.'
    },
    reinforcedUp:{
      active:reinforcedActive,
      thresholdLbw:REINFORCED_UP_THRESHOLD,
      maxAgeMinutes:REINFORCED_UP_MAX_AGE_MIN,
      event:decorate(lastReinforcedUp,now),
      semantic:'MCB native UP confirmed at or below -60; strong asymmetric bullish event. No synthetic reinforced DN exists.'
    },
    reinforcedLongSync:{
      active:reinforcedLongSyncActive,
      signal15m:decorate(lastReinforcedUp,now),
      signal3m:decorate(sync3Up,now),
      semantic:'confirmed 15m UP_REINFORCED followed by confirmed 3m UP: native MCB multi-TF synchronisation for exceptional LONG bypass'
    },
    recent:!!(latest&&latestAge<=NATIVE_SIGNAL_MAX_AGE_MIN),
    authority:'MCB_NATIVE_EVENT',
    note:'UP/DN are native MCB events. 1h and 4h signals are context-only shadow evidence; 4h sub-60 UP is collected for macro reversal study, 15m UP_REINFORCED can arm the exceptional LONG opportunity, and 3m UP_REINFORCED remains tactical only.'
  };
}
function opposesPosition(signal,positionDirection){
  const e=signal&&signal.latest;
  if(!e||!positionDirection)return false;
  return (positionDirection==='long'&&e.type==='DN')||(positionDirection==='short'&&e.type==='UP');
}
module.exports={evaluate,eventsFromTf,opposesPosition,decorateWithAvailability,REINFORCED_UP_THRESHOLD,REINFORCED_3M_UP_THRESHOLD,REINFORCED_4H_UP_THRESHOLD,FOUR_HOUR_MS,REINFORCED_UP_MAX_AGE_MIN,NATIVE_SIGNAL_MAX_AGE_MIN};
