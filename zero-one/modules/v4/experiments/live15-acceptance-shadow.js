'use strict';

const {nested3mCoherence}=require('../layers/opportunity-maturity');
const {mfMemoryAdmission,activeTimingShadow}=require('../layers/setup-lifecycle');

const VERSION='live15-acceptance-shadow-v0.1';
const TF_MS=15*60*1000;
const MIN_PM_EFFICIENCY=.25;
const ECONOMIC_REFERENCE_USD=180;

function finite(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));}
function directionFromSignal(e){
  return e&&e.type==='UP'?'long':e&&e.type==='DN'?'short':null;
}
function aligned(v,direction){
  const n=Number(v);
  return Number.isFinite(n)&&((direction==='long'&&n>0)||(direction==='short'&&n<0));
}
function opposingSignalType(positionDirection){
  return positionDirection==='long'?'DN':positionDirection==='short'?'UP':null;
}
function liveSignal(native){
  const l=native&&native.live15||{};
  return l&&l.fresh?(l.up||l.dn||null):null;
}
function confirmedRow(frame,barTs){
  const src=frame&&frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs&&frame.sources.mcb.tfs['15m']||null;
  if(!src)return {available:false,row:null,type:null};
  const rows=[];
  if(src.confirmed)rows.push(src.confirmed);
  if(Array.isArray(src.history))rows.push(...src.history);
  const row=rows.slice().reverse().find(r=>r&&Number(r.ts)===Number(barTs))||null;
  if(!row)return {available:false,row:null,type:null};
  const up=finite(row.wt1_cross_up),dn=finite(row.wt1_cross_dn);
  return {available:true,row,type:up?'UP':dn?'DN':null,value:up?Number(row.wt1_cross_up):dn?Number(row.wt1_cross_dn):null};
}
function entryEvidence(frame,direction,mcb,native,translation,mfStructure,room,quality){
  const now=Number(frame&&frame.market&&frame.market.timestamp);
  const n3=mcb&&mcb.nested3m||{};
  const coherence=nested3mCoherence(mcb,direction);
  const h=translation&&translation.horizons||{};
  const net3=Number(h.net3mUsd),net5=Number(h.net5mUsd),eff3=Number(h.efficiency3m);
  const pm3=aligned(net3,direction),pm5=aligned(net5,direction);
  const material=pm3&&pm5&&Number.isFinite(eff3)&&eff3>=MIN_PM_EFFICIENCY;
  const mf=mfMemoryAdmission(direction,mfStructure,mcb,native);
  const transferPmReady=!mf.requiresTransfer||(translation&&translation.status==='STRONG_TRANSLATION');
  const timing=finite(n3.startTs)
    ?activeTimingShadow(coherence,null,false,now,now,n3,direction,Number(n3.startTs),'CURRENT_3M_LOBE_START')
    :{state:'SETUP_OPEN',decisionImpact:false,blocksNewEntry:false,lobeAgeMinutes:null,
      timingOriginTs:null,timingOriginSource:'UNAVAILABLE',lobeRecoveryFraction:finite(n3.recoveryFraction)?Number(n3.recoveryFraction):null,
      lobeDirection:Number(n3.lobeSign)>0?'long':Number(n3.lobeSign)<0?'short':null,candidateDirection:direction,
      basis:'3m timing origin unavailable; lateness cannot be asserted',
      semantic:'shadow safety: missing 3m origin never fabricates SETUP_LATE'};
  const roomReady=!(room&&room.admissionBlocked);
  const activityReady=!(quality&&quality.admissionBlocked);
  const ready=!!(
    direction&&coherence.coherent&&material&&mf.allowed&&transferPmReady&&
    !timing.blocksNewEntry&&roomReady&&activityReady
  );
  const waits=[];
  if(!coherence.coherent)waits.push('3M_NOT_COHERENT');
  if(!pm3)waits.push('PM3_NOT_ALIGNED');
  if(!pm5)waits.push('PM5_NOT_ALIGNED');
  if(!(Number.isFinite(eff3)&&eff3>=MIN_PM_EFFICIENCY))waits.push('PM3_EFFICIENCY_LOW');
  if(!mf.allowed)waits.push(mf.state||'MF_MEMORY_BLOCK');
  if(mf.requiresTransfer&&!transferPmReady)waits.push('MF_TRANSFER_NEEDS_STRONG_PM');
  if(timing.blocksNewEntry)waits.push('SETUP_LATE');
  if(!roomReady)waits.push('BOUNDARY_CONTEST');
  if(!activityReady)waits.push('DORMANT_MARKET');
  return {
    ready,direction,waits,coherence,
    pm:{net3mUsd:Number.isFinite(net3)?net3:null,net5mUsd:Number.isFinite(net5)?net5:null,
      efficiency3m:Number.isFinite(eff3)?eff3:null,aligned3m:pm3,aligned5m:pm5,minEfficiency:MIN_PM_EFFICIENCY},
    mfMemory:mf,timing,roomReady,activityReady
  };
}
function newBar(barTs,now,price){
  return {
    barTs:Number(barTs),barTimestamp:new Date(Number(barTs)).toISOString(),
    closeTs:Number(barTs)+TF_MS,closeTimestamp:new Date(Number(barTs)+TF_MS).toISOString(),
    firstSeenAt:null,firstSeenPrice:null,firstType:null,firstValue:null,
    lastSeenAt:null,lastType:null,lastValue:null,
    samples:0,presentSamples:0,absentSamples:0,
    typeFlips:0,disappearanceTransitions:0,reappearanceTransitions:0,
    previousPresent:false,previousType:null,
    entryHypothesis:null,exitHypothesis:null,
    createdAt:now,createdPrice:price
  };
}
function cloneBar(x){
  return x?JSON.parse(JSON.stringify(x)):null;
}
function updateExcursion(h,price,direction,kind){
  if(!h||!finite(price)||!finite(h.triggerPrice))return h;
  const signed=direction==='long'?Number(price)-Number(h.triggerPrice):Number(h.triggerPrice)-Number(price);
  if(kind==='entry'){
    h.currentSignedUsd=signed;
    h.maxFavorableUsd=Math.max(Number(h.maxFavorableUsd)||0,signed);
    h.maxAdverseUsd=Math.max(Number(h.maxAdverseUsd)||0,-signed);
  }else{
    // For a hypothetical exit, positive = terrain the original position later recovered;
    // negative = loss that an early exit would have avoided.
    h.currentOriginalDirectionUsd=signed;
    h.maxMissedRecoveryUsd=Math.max(Number(h.maxMissedRecoveryUsd)||0,signed);
    h.maxAvoidedAdverseUsd=Math.max(Number(h.maxAvoidedAdverseUsd)||0,-signed);
  }
  return h;
}
function startEntryHypothesis(bar,signal,now,price,evidence){
  if(bar.entryHypothesis||!signal||!evidence||!evidence.ready)return;
  const direction=directionFromSignal(signal);
  bar.entryHypothesis={
    signalType:signal.type,direction,triggerTs:now,triggerTimestamp:new Date(now).toISOString(),
    triggerPrice:Number(price),leadMinutesToClose:Math.max(0,(bar.closeTs-now)/60000),
    evidence,
    currentSignedUsd:0,maxFavorableUsd:0,maxAdverseUsd:0
  };
}
function startExitHypothesis(bar,signal,now,price,position){
  if(bar.exitHypothesis||!signal||!position||!position.direction)return;
  if(signal.type!==opposingSignalType(position.direction))return;
  bar.exitHypothesis={
    signalType:signal.type,positionDirection:position.direction,
    positionEntryPrice:finite(position.entryPrice)?Number(position.entryPrice):null,
    triggerTs:now,triggerTimestamp:new Date(now).toISOString(),
    triggerPrice:Number(price),leadMinutesToClose:Math.max(0,(bar.closeTs-now)/60000),
    currentOriginalDirectionUsd:0,maxMissedRecoveryUsd:0,maxAvoidedAdverseUsd:0
  };
}
function resolveHypothesis(h,confirmedType,kind){
  if(!h)return null;
  const same=confirmedType===h.signalType;
  const none=!confirmedType;
  const opposite=!!(confirmedType&&confirmedType!==h.signalType);
  const out={...h,confirmedSame:same,repaintNone:none,repaintOpposite:opposite};
  if(kind==='entry'){
    out.riskReferenceBreached=Number(h.maxAdverseUsd)>=ECONOMIC_REFERENCE_USD;
  }else{
    out.prematureRecoveryReference=Number(h.maxMissedRecoveryUsd)>=ECONOMIC_REFERENCE_USD;
    out.avoidedAdverseReference=Number(h.maxAvoidedAdverseUsd)>=ECONOMIC_REFERENCE_USD;
  }
  return out;
}
function finalizeBar(bar,confirmed,now){
  if(!bar)return null;
  const lead=finite(bar.firstSeenAt)?Math.max(0,(bar.closeTs-Number(bar.firstSeenAt))/60000):null;
  const presenceBase=Math.max(1,(Number(bar.presentSamples)||0)+(Number(bar.absentSamples)||0));
  const confirmedType=confirmed&&confirmed.type||null;
  const firstSame=!!(bar.firstType&&confirmedType===bar.firstType);
  return {
    version:VERSION,barTs:bar.barTs,barTimestamp:bar.barTimestamp,
    closeTs:bar.closeTs,closeTimestamp:bar.closeTimestamp,
    resolvedAt:now,resolvedTimestamp:new Date(now).toISOString(),
    confirmationAvailabilityLagMinutes:Math.max(0,(now-bar.closeTs)/60000),
    firstSeenAt:bar.firstSeenAt,firstSeenPrice:bar.firstSeenPrice,
    firstType:bar.firstType,firstValue:bar.firstValue,lastType:bar.lastType,lastValue:bar.lastValue,
    firstSignalLeadMinutes:lead,
    confirmedType,confirmedValue:confirmed&&finite(confirmed.value)?Number(confirmed.value):null,
    outcome:!bar.firstType?'NO_LIVE_SIGNAL':firstSame?'CONFIRMED_SAME':!confirmedType?'REPAINT_NONE':'REPAINT_OPPOSITE',
    firstSignalConfirmed:firstSame,
    typeFlips:Number(bar.typeFlips)||0,
    disappearanceTransitions:Number(bar.disappearanceTransitions)||0,
    reappearanceTransitions:Number(bar.reappearanceTransitions)||0,
    presentSamples:Number(bar.presentSamples)||0,
    absentSamples:Number(bar.absentSamples)||0,
    presenceFraction:(Number(bar.presentSamples)||0)/presenceBase,
    entryHypothesis:resolveHypothesis(bar.entryHypothesis,confirmedType,'entry'),
    exitHypothesis:resolveHypothesis(bar.exitHypothesis,confirmedType,'exit')
  };
}
function evaluate(frame,position,mcb,native,translation,mfStructure,room,quality,previous=null){
  const now=Number(frame&&frame.market&&frame.market.timestamp);
  const price=Number(frame&&frame.market&&frame.market.price);
  const live=native&&native.live15||{};
  const rowTs=finite(live.rowTs)?Number(live.rowTs):null;
  const sig=liveSignal(native);
  const prior=previous&&previous.version===VERSION?previous:null;
  let current=cloneBar(prior&&prior.currentBar);
  let pending=cloneBar(prior&&prior.pendingResolution);
  let lastResolved=prior&&prior.lastResolved||null;

  // A new live 15m row means the previous bar is now waiting for its confirmed row.
  if(rowTs!==null&&current&&Number(current.barTs)!==rowTs){
    if(current.firstSeenAt)pending=current;
    current=null;
  }
  if(rowTs!==null&&!current)current=newBar(rowTs,now,price);

  // Resolve only when the confirmed CSV actually contains that bar.
  if(pending){
    const conf=confirmedRow(frame,pending.barTs);
    if(conf.available){
      lastResolved=finalizeBar(pending,conf,now);
      pending=null;
    }
  }

  if(current&&rowTs!==null&&Number(current.barTs)===rowTs){
    current.samples++;
    if(sig){
      current.presentSamples++;
      if(!current.firstSeenAt){
        current.firstSeenAt=now;current.firstSeenPrice=price;
        current.firstType=sig.type;current.firstValue=finite(sig.value)?Number(sig.value):null;
      }
      current.lastSeenAt=now;current.lastType=sig.type;current.lastValue=finite(sig.value)?Number(sig.value):null;
      if(current.previousType&&current.previousType!==sig.type)current.typeFlips++;
      if(current.previousPresent===false&&current.presentSamples>1)current.reappearanceTransitions++;
      current.previousPresent=true;current.previousType=sig.type;

      const dir=directionFromSignal(sig);
      const evidence=entryEvidence(frame,dir,mcb,native,translation,mfStructure,room,quality);
      if(!position)startEntryHypothesis(current,sig,now,price,evidence);
      if(position)startExitHypothesis(current,sig,now,price,position);
    }else{
      current.absentSamples++;
      if(current.previousPresent)current.disappearanceTransitions++;
      current.previousPresent=false;
    }

    if(current.entryHypothesis)updateExcursion(current.entryHypothesis,price,current.entryHypothesis.direction,'entry');
    if(current.exitHypothesis)updateExcursion(current.exitHypothesis,price,current.exitHypothesis.positionDirection,'exit');
  }

  const dir=directionFromSignal(sig);
  const currentEntryEvidence=sig&&!position?entryEvidence(frame,dir,mcb,native,translation,mfStructure,room,quality):null;
  const currentExitOpposing=!!(sig&&position&&sig.type===opposingSignalType(position.direction));
  const closeLead=current&&finite(current.closeTs)?Math.max(0,(Number(current.closeTs)-now)/60000):null;

  return {
    version:VERSION,decisionImpact:false,
    state:sig?'LIVE15_SIGNAL_PRESENT':(current&&current.firstSeenAt?'LIVE15_SIGNAL_REPAINTED_OR_ABSENT':'NO_LIVE15_SIGNAL'),
    currentSignal:sig?{type:sig.type,value:finite(sig.value)?Number(sig.value):null,direction:dir,barTs:rowTs,
      firstSeenLeadMinutes:current&&finite(current.firstSeenAt)?Math.max(0,(current.closeTs-Number(current.firstSeenAt))/60000):null,
      minutesToClose:closeLead}:null,
    entryShadow:{
      policy:'TREAT_LIVE15_AS_CONFIRMED_ONLY_IF_OTHER_ENTRY_EVIDENCE_READY',
      signalAcceptedAsValidated:!!sig,
      actionReady:!!(currentEntryEvidence&&currentEntryEvidence.ready),
      evidence:currentEntryEvidence,
      currentHypothesis:current&&current.entryHypothesis||null
    },
    exitShadow:{
      policy:'TEST_LIVE15_ALONE_AS_EXIT_AUTHORITY',
      opposingLiveSignal:currentExitOpposing,
      currentHypothesis:current&&current.exitHypothesis||null,
      note:'measurement only: quantifies avoided adverse terrain versus missed recovery before confirmation'
    },
    currentBar:current,
    pendingResolution:pending,
    lastResolved,
    dangerModel:{
      repaintRisk:true,
      typeFlipRisk:true,
      disappearanceRisk:true,
      economicReferenceUsd:ECONOMIC_REFERENCE_USD,
      semantic:'live 15m may front-run confirmation but can disappear before close; entry and exit consequences are measured separately'
    },
    semantic:'shadow only: measures live 15m signal latency, persistence, confirmation/repaint and hypothetical entry/exit consequences; never changes V4 action'
  };
}

module.exports={VERSION,TF_MS,MIN_PM_EFFICIENCY,ECONOMIC_REFERENCE_USD,evaluate,entryEvidence,confirmedRow,directionFromSignal};
