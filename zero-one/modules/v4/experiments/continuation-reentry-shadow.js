'use strict';

const VERSION='continuation-reentry-shadow-v0.1';
const PROTECTIVE_EXITS=new Set([
  'EXIT_ECONOMIC_PROFIT_FLOOR',
  'EXIT_MFE_PROTECTION',
  'EXIT_PROFIT_PROTECTION'
]);
const MIN_PM_EFFICIENCY=.25;

function aligned(v,d){
  const n=Number(v);
  return Number.isFinite(n)&&((d==='long'&&n>0)||(d==='short'&&n<0));
}
function opposite(d){return d==='long'?'short':d==='short'?'long':null;}
function tickerRead(ticker){
  const c=ticker&&ticker.current||{};
  const y75=Number(c.yieldVsP75),y95=Number(c.yieldVsP95),effort=Number(c.effortVsP75);
  let quality='UNPRODUCTIVE';
  if(Number.isFinite(y95)&&y95>=1)quality='EXTREME_YIELD';
  else if(Number.isFinite(y75)&&y75>=1&&Number.isFinite(effort)&&effort<1)quality='LOW_EFFORT_HIGH_YIELD';
  else if(Number.isFinite(y75)&&y75>=1)quality='PRODUCTIVE_YIELD';
  return {
    status:ticker&&ticker.status||null,direction:ticker&&ticker.direction||null,
    confirmed:!!(ticker&&ticker.confirmed),
    yieldVsP75:Number.isFinite(y75)?y75:null,
    yieldVsP95:Number.isFinite(y95)?y95:null,
    effortVsP75:Number.isFinite(effort)?effort:null,
    quality
  };
}
function fresh3mEvent(native,direction,exitTs){
  const same=direction==='long'?native&&native.last3mUp:native&&native.last3mDn;
  const opp=direction==='long'?native&&native.last3mDn:native&&native.last3mUp;
  const fresh=!!(same&&Number.isFinite(Number(same.ts))&&Number(same.ts)>Number(exitTs)&&
    (!opp||Number(opp.ts)<Number(same.ts)));
  return {fresh,event:same||null,oppositeEvent:opp||null};
}
function slowMfOpposes(mf,direction){
  const t=mf&&mf.temporal||{};
  const h=t.memoryHorizon,mem=t.memoryDirection;
  return !!(mem&&['h2','h4'].includes(h)&&mem!==direction);
}
function evaluate(frame,position,baseThesis,mcb,native,translation,ticker,mfStructure,room,previous=null){
  const exit=frame&&frame.entryControl||null;
  const now=Number(frame&&frame.market&&frame.market.timestamp);
  const price=Number(frame&&frame.market&&frame.market.price);
  const exitTs=exit&&Number(exit.lastExitTs);
  const direction=exit&&exit.direction||null;
  const protective=!!(exit&&PROTECTIVE_EXITS.has(exit.exitKind));
  const baseDirection=baseThesis&&(baseThesis.candidateDirection||baseThesis.direction)||null;

  const base={
    version:VERSION,decisionImpact:false,
    protectiveExit:protective?{
      kind:exit.exitKind,direction,lastExitTs:exitTs,
      lastExitTimestamp:exit.lastExitTimestamp||null,
      campaignKey:exit.campaignKey||null,
      pnlUsd:Number.isFinite(Number(exit.pnlUsd))?Number(exit.pnlUsd):null,
      mfeUsd:Number.isFinite(Number(exit.mfeUsd))?Number(exit.mfeUsd):null
    }:null
  };

  if(position)return {...base,state:'REAL_POSITION_OPEN',active:false,eligible:false,
    semantic:'shadow pauses while a real position is open'};
  if(!protective||!direction||!Number.isFinite(exitTs)||!Number.isFinite(now)||now<=exitTs){
    return {...base,state:'NO_PROTECTIVE_EXIT_CONTEXT',active:false,eligible:false};
  }

  const prior=previous&&previous.version===VERSION&&previous.protectiveExit&&
    Number(previous.protectiveExit.lastExitTs)===exitTs?previous:null;
  const priorTracking=!!(prior&&prior.triggeredAt);

  const latest15=native&&native.latest||null;
  const opp=opposite(direction);
  const opposite15AfterExit=!!(latest15&&Number(latest15.ts)>exitTs&&
    ((direction==='long'&&latest15.type==='DN')||(direction==='short'&&latest15.type==='UP')));
  const thesisSame=baseDirection===direction;
  const e3=fresh3mEvent(native,direction,exitTs);
  const n3=mcb&&mcb.nested3m||{};
  const lobe3=Number(n3.lobeSign)>0?'long':Number(n3.lobeSign)<0?'short':null;
  const lobeAligned=lobe3===direction;
  const h=translation&&translation.horizons||{};
  const net3=Number(h.net3mUsd),net5=Number(h.net5mUsd),eff3=Number(h.efficiency3m);
  const pmReady=aligned(net3,direction)&&aligned(net5,direction)&&Number.isFinite(eff3)&&eff3>=MIN_PM_EFFICIENCY;
  const mfOpposes=slowMfOpposes(mfStructure,direction);
  const tickerEvidence=tickerRead(ticker);
  const boundary=room&&room.admissionBlocked?room.state||'BOUNDARY_CONTEST':null;

  const invalidated=opposite15AfterExit||!thesisSame||mfOpposes;
  const invalidationReason=opposite15AfterExit?'OPPOSITE_15M_AFTER_EXIT':
    !thesisSame?'15M_THESIS_CHANGED':mfOpposes?'SLOW_MF_MEMORY_OPPOSES':null;

  if(priorTracking){
    const triggerPrice=Number(prior.triggerPrice);
    const signed=direction==='long'?price-triggerPrice:triggerPrice-price;
    const mfe=Math.max(Number(prior.shadowMfeUsd)||0,Number.isFinite(signed)?signed:0);
    const mae=Math.max(Number(prior.shadowMaeUsd)||0,Number.isFinite(signed)?-signed:0);
    return {
      ...base,state:invalidated?'TRACKING_INVALIDATED':'TRACKING_SHADOW_REENTRY',
      active:!invalidated,eligible:false,invalidated,invalidationReason,
      oneCandidatePerExit:true,
      candidateKey:prior.candidateKey,
      triggeredAt:prior.triggeredAt,triggeredTimestamp:prior.triggeredTimestamp,
      triggerPrice,
      shadowMfeUsd:mfe,shadowMaeUsd:mae,currentSignedUsd:Number.isFinite(signed)?signed:null,
      reachedEconomicMove:mfe>=220,
      churnRisk:mae>=180&&mfe<220,
      evidence:{thesisSame,e3,lobeAligned,pmReady,net3mUsd:Number.isFinite(net3)?net3:null,
        net5mUsd:Number.isFinite(net5)?net5:null,efficiency3m:Number.isFinite(eff3)?eff3:null,
        mfOpposes,ticker:tickerEvidence,boundary},
      semantic:'shadow-only continuation reentry tracking; one candidate maximum per protective exit'
    };
  }

  const eligible=!!(!invalidated&&thesisSame&&e3.fresh&&lobeAligned&&pmReady&&!mfOpposes);
  if(!eligible){
    const waits=[];
    if(!thesisSame)waits.push('WAIT_SAME_15M_CAMPAIGN');
    if(!e3.fresh)waits.push('WAIT_FRESH_3M_EVENT_AFTER_EXIT');
    if(!lobeAligned)waits.push('WAIT_3M_LOBE_ALIGNMENT');
    if(!pmReady)waits.push('WAIT_FRESH_3M_5M_PM');
    if(mfOpposes)waits.push('SLOW_MF_MEMORY_OPPOSES');
    if(opposite15AfterExit)waits.push('OPPOSITE_15M_AFTER_EXIT');
    return {...base,state:invalidated?'REENTRY_INVALIDATED':'ARMED_WAIT_CONTINUATION',
      active:!invalidated,eligible:false,invalidated,invalidationReason,waits,
      evidence:{thesisSame,e3,lobeAligned,pmReady,net3mUsd:Number.isFinite(net3)?net3:null,
        net5mUsd:Number.isFinite(net5)?net5:null,efficiency3m:Number.isFinite(eff3)?eff3:null,
        mfOpposes,ticker:tickerEvidence,boundary},
      antiChurn:{oneCandidatePerProtectiveExit:true,requiresFresh3mEventAfterExit:true,
        requires3mAnd5mPm:true,minEfficiency3m:MIN_PM_EFFICIENCY,
        preExitMicrostructureReusable:false,tickerIsGate:false,boundaryIsGate:false}
    };
  }

  const eventTs=Number(e3.event.ts);
  return {
    ...base,state:'CONTINUATION_REENTRY_CANDIDATE',active:true,eligible:true,
    invalidated:false,invalidationReason:null,
    oneCandidatePerExit:true,
    candidateKey:[exitTs,direction,eventTs].join('|'),
    triggeredAt:now,triggeredTimestamp:new Date(now).toISOString(),triggerPrice:price,
    shadowMfeUsd:0,shadowMaeUsd:0,currentSignedUsd:0,reachedEconomicMove:false,churnRisk:false,
    evidence:{thesisSame,e3,lobeAligned,pmReady,net3mUsd:net3,net5mUsd:net5,efficiency3m:eff3,
      mfOpposes:false,ticker:tickerEvidence,boundary},
    antiChurn:{oneCandidatePerProtectiveExit:true,requiresFresh3mEventAfterExit:true,
      requires3mAnd5mPm:true,minEfficiency3m:MIN_PM_EFFICIENCY,
      preExitMicrostructureReusable:false,tickerIsGate:false,boundaryIsGate:false},
    semantic:'shadow-only: protective exit may rearm same-direction continuation after fresh 3m event + aligned 3m/5m PM; ticker qualifies efficiency but never creates direction'
  };
}

module.exports={VERSION,PROTECTIVE_EXITS,MIN_PM_EFFICIENCY,evaluate,tickerRead,fresh3mEvent,slowMfOpposes};
