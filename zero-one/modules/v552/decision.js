'use strict';
// V5.5.2 — independent PAPER constitution, not V5.5 patch.
// MCB3 initiates tactical episode. BW15/LBW15 arbitrate continuity.
// MF15/3 and PM explain the unfolding effort; no imaginary price frontier.
// E15 -> LBW15 slope -> repeated Cross3 -> Cross15 -> conversion -> E3/E15
// is an event signature to OBSERVE, never an inflexible entry checklist.
const src=require('./source');
const vigilance=require('./vigilance');
const marketQuality=require('./market-quality');
const VERSION='v5.5.2-lbw15-live-vigilance-campaign-paper-v1.2';
const MIN=60000;
const val=src.val,side=d=>d==='long'?1:d==='short'?-1:0;
const dir=x=>x>0?'long':x<0?'short':null;
const opp=d=>d==='long'?'short':d==='short'?'long':null;
const round=x=>x===null?null:Math.round(x*100)/100;
const signed=(x,d)=>x===null||!side(d)?null:round(side(d)*x);
function originalMemory(now=Date.now()){
 return {version:'v552-campaign-memory-v1',startedAt:now,lastAsOf:0,
  lastAuditAt:0,lastGap3:null,lastGap15:null,
  cross3:null,episode:null,campaign:null,
  last15ClosedAt:null,lastNative3At:null,lastNative15At:null,
  lastSlope15Dir:null,lastPmDir:null,lastMF15Dir:null,
  vigilance:vigilance.initial(),
  trace:[],lastExit:null,completedEpisodes:0,
  transitionCounter:0};
}
function trace(mem,at,family,type,more={}){
 const e={at,family,type,...more};
 mem.trace.push(e);if(mem.trace.length>120)mem.trace.shift();
 return e;
}
function latestNative(bars,period){
 const last=src.nativeLast(bars,period);
 return last&&last.knownAt<=Number.MAX_SAFE_INTEGER?last:null;
}
function sensor(input,now,price){
 const {bars,samples,current}=input;
 if(!current)return null;
 const older3=src.sampleAt(samples,now-3*MIN);
 const older10=src.sampleAt(samples,now-10*MIN);
 const older15=src.sampleAt(samples,now-15*MIN);
 const g3=val(current.liveLbw)!==null&&val(current.liveBw)!==null?
  round(current.liveLbw-current.liveBw):null;
 const g15=val(current.live15LbwRaw)!==null&&val(current.live15BwRaw)!==null?
  round(current.live15LbwRaw-current.live15BwRaw):null;
 const wave=src.closedWave(bars.m15);
 const n3=latestNative(bars.m3,3*MIN),n15=latestNative(bars.m15,15*MIN);
 const pm=val(current.priceMove)!==null?
  round(current.priceMove+price-current.lastPrice):null;
 const p3=older3?round(price-older3.lastPrice):null,
  p15=older15?round(price-older15.lastPrice):null;
 const mf3=older3&&val(older3.liveMoneyFlow)!==null&&
  val(current.liveMoneyFlow)!==null?
  round(current.liveMoneyFlow-older3.liveMoneyFlow):null;
 const mf15=older10&&val(older10.live15MfRaw)!==null&&
  val(current.live15MfRaw)!==null?
  round(current.live15MfRaw-older10.live15MfRaw):null;
 const lbw3=older3&&val(older3.live15LbwRaw)!==null?
  round(current.live15LbwRaw-older3.live15LbwRaw):null;
 const bwSlope3=older3&&val(older3.live15BwRaw)!==null?
  round(current.live15BwRaw-older3.live15BwRaw):null;
 const bwSlope15=older15&&val(older15.live15BwRaw)!==null?
  round(current.live15BwRaw-older15.live15BwRaw):null;
 const lbw15=older15&&val(older15.live15LbwRaw)!==null?
  round(current.live15LbwRaw-older15.live15LbwRaw):null;
 const gap15Slope=older3&&val(older3.live15LbwRaw)!==null&&
  val(older3.live15BwRaw)!==null?
  round(g15-(older3.live15LbwRaw-older3.live15BwRaw)):null;
 const liquid=val(current.volumeFenetreBtc)!==null&&
  val(current.winSec)!==null&&current.winSec>0?
  round(current.volumeFenetreBtc/current.winSec*60):null;
 const prev3=bars.m3.at(-1),prev15=bars.m15.at(-1);
 return {at:now,price,auditAt:current.ts,g3,g15,
  mcb3:{lbw:val(current.liveLbw),bw:val(current.liveBw),
   direction:dir(g3),confirmedNative:n3},
  mcb15:{lbw:val(current.live15LbwRaw),
   bw:val(current.live15BwRaw),gap:g15,direction:dir(g15),
   slope3:lbw3,slope15:lbw15,bwSlope3,bwSlope15,
   gapSlope3:gap15Slope,
   closed:wave,confirmedNative:n15},
  mf:{slow:val(current.live15MfRaw),fast:val(current.liveMoneyFlow),
   slope15:mf15,slope3:mf3},
  pm:{live:pm,p3,p15,baton:val(current.priceMove),
   postBaton:round(price-current.lastPrice)},
  liquidity:{btcPerMinuteEstimate:liquid,
   source:'BATON_ROLLING_EXECUTED_VOLUME_NOT_ORDERBOOK_DEPTH'},
  place:{ma3:prev3?.ma200??null,ma15:prev15?.ma200??null,
   lastMcb3High:prev3?.high??null,lastMcb3Low:prev3?.low??null,
   note:'LEVELS_ARE_PRICE_REFERENCES_NOT_GUARANTEED_DEFENCES'},
  healthy:!!input.healthy,
  source:input.source};
}
function campaignFrom(o,mem){
 // The most recently confirmed native E15 is the initial campaign thesis.
 // Current BW15/LBW15 is its observed tactical state, not a replacement vote.
 const native=o.mcb15.confirmedNative;
 const initial=native?.direction||o.mcb15.closed.direction||o.mcb15.direction;
 if(!initial)return null;
 const origin=native?.at||o.mcb15.closed.sourceAt;
 return {id:initial+'|E15:'+String(origin||o.at),
  direction:initial,sourceAt:origin||o.at,
  knownAt:native?.knownAt||o.mcb15.closed.knownAt||o.at,
  originPrice:o.price,startedAt:o.at,
  lastPrice:o.price,high:o.price,low:o.price,
  phase:'CAMPAIGN_ACTIVE',episodes:0,counterAttacks:0,resumptions:0,
  confirmedCrossOppositeAt:null,transfer:null,
  nativeE15:native?.direction||null,
  crossed15Count:0};
}
function ownMemoryStep(mem,o){
 const events=[],emit=(at,family,type,detail={})=>{
  const e=trace(mem,at,family,type,detail);events.push(e);};
 if(!mem.campaign){
  const c=campaignFrom(o,mem);
  if(c){mem.campaign=c;emit(o.at,'MCB15','PARENT_OBSERVED',
   {direction:c.direction,originAt:c.sourceAt});}
 }
 const cam=mem.campaign;
 if(!cam)return {events,firstCross:null,eligibleCross:null};
 if(o.at<=mem.lastAsOf)return {events,firstCross:null,eligibleCross:null};
 const oldCamGap=mem.lastGap15;
 // Process actual NEW audit samples, not each 5-second tick, to avoid
 // recreating Cross3 from an unchanged 30-second observation.
 let firstCross=null;
 for(const row of o._newAudit||[]){
  const gap=val(row.liveLbw)!==null&&val(row.liveBw)!==null?
   row.liveLbw-row.liveBw:null;
  if(gap===null)continue;
  const s=dir(gap),prev=dir(mem.lastGap3);
  if(s&&prev&&s!==prev){
   mem.cross3={direction:s,at:row.ts,
    price:val(row.lastPrice),lbw:val(row.liveLbw),
    id:s+'|CROSS3:'+row.ts,source:'BATON_LIVE_BW_LBW_CROSS'};
   mem.episode={id:mem.cross3.id,direction:s,crossAt:row.ts,
    crossPrice:val(row.lastPrice),openedAt:o.at,
    entered:false,status:'TACTICAL_HYPOTHESIS',parentAtOpen:cam.id,
    mfePriceUsd:0,maePriceUsd:0,observations:0};
   cam.episodes++;
   if(s!==cam.direction){cam.counterAttacks++;cam.phase='COUNTERATTACK';}
   else if(['COUNTERATTACK','CONTESTED','TRANSFER_CANDIDATE'].includes(cam.phase)){
    cam.resumptions++;cam.phase='PARENT_RESUMPTION';
   }else cam.phase='TACTICAL_CONTINUATION';
   firstCross=mem.cross3;
   const otherGap=val(mem.lastGap3);
   const elapsed=mem.lastAuditAt>0?(row.ts-mem.lastAuditAt)/MIN:null;
   const crossVelocity=otherGap!==null&&elapsed>0?
    round((gap-otherGap)/elapsed):null;
   emit(row.ts,'MCB3','CROSS3_OBSERVED',{direction:s,
    id:mem.cross3.id,parent:cam.direction,
    crossVelocityPerMinute:crossVelocity,
    wave3Lbw:val(row.liveLbw),wave3Bw:val(row.liveBw),
    precedingLbw15Slope3:o.mcb15.slope3,
    precedingLbw15GapSlope3:o.mcb15.gapSlope3});
  }
  mem.lastGap3=gap;
  mem.lastAuditAt=row.ts;
 }
 if(o._newAudit?.length){
  // Sign/acceleration of the strategic wave is a causal observation BEFORE
  // a Cross3 confirmation, not a prerequisite threshold for it.
  const slope=dir(o.mcb15.slope3);
  if(slope&&slope!==mem.lastSlope15Dir){
   emit(o.auditAt,'MCB15','LBW15_PENTE_CAP_CHANGE',{
    direction:slope,delta3:o.mcb15.slope3,
    delta15:o.mcb15.slope15,
    gapSlope3:o.mcb15.gapSlope3});
   mem.lastSlope15Dir=slope;
  }
  const mf=dir(o.mf.slope15);
  if(mf&&mf!==mem.lastMF15Dir){
   emit(o.auditAt,'MF15','SLOW_FLOW_CHANGE',{
    direction:mf,mf3Slope:o.mf.slope3});
   mem.lastMF15Dir=mf;
  }
 }
 const pm=dir(o.pm.live);
 // Record only on a NEW Bâton observation. Tick-by-tick PM remains
 // available to the strategy, but should not flood the causal signature.
 if(o._newAudit?.length&&pm&&pm!==mem.lastPmDir){
  emit(o.at,'CONVERSION','PM_PRICE_TRANSLATION_CHANGED',{
   direction:pm,pmLive:o.pm.live,pm3:o.pm.p3,
   postBaton:o.pm.postBaton,afterCross3:mem.cross3?.at||null});
  mem.lastPmDir=pm;
 }
 const wave=o.mcb15.closed;
 if(wave.sourceAt&&wave.sourceAt!==mem.last15ClosedAt){
  if(mem.last15ClosedAt!==null&&wave.confirmedCross&&
      wave.confirmedCross.knownAt<=o.at){
   cam.crossed15Count++;
   const c=wave.confirmedCross;
   emit(c.knownAt,'MCB15','CROSS15_CLOSED',{
    direction:c.direction,from:c.from,sourceAt:c.at,
    againstParent:c.direction!==cam.direction});
   if(c.direction!==cam.direction){
    cam.confirmedCrossOppositeAt=c.knownAt;
    cam.phase='TRANSFER_CANDIDATE';
    cam.transfer={direction:c.direction,at:c.knownAt,
      priceAtFirstObservation:o.price,status:'OBSERVED_NOT_ACCEPTED'};
   }else{
    cam.phase='PARENT_RESUMPTION';
    cam.transfer=null;
   }
  }
  mem.last15ClosedAt=wave.sourceAt;
 }
 const n3=o.mcb3.confirmedNative,n15=o.mcb15.confirmedNative;
 if(n3&&n3.knownAt<=o.at&&n3.knownAt!==mem.lastNative3At){
  if(mem.lastNative3At!==null)emit(n3.knownAt,'MCB3','E3_CONFIRMED',{direction:n3.direction});
  mem.lastNative3At=n3.knownAt;
 }
 if(n15&&n15.knownAt<=o.at&&n15.knownAt!==mem.lastNative15At){
  if(mem.lastNative15At!==null)emit(n15.knownAt,'MCB15','E15_CONFIRMED',{direction:n15.direction});
  cam.nativeE15=n15.direction;mem.lastNative15At=n15.knownAt;
 }
 const d=cam.direction,live=o.mcb15.direction;
 if(cam.transfer){
  const t=cam.transfer,target=t.direction;
  // The observed confirmed crossing may be a violent failed attempt.
  // Acceptance requires observed PRICE and PM Live while the CLOSED and
  // LIVE 15m waves remain across BW. MF is read independently as context.
  const priceSupports=side(target)*(o.price-t.priceAtFirstObservation)>0;
  const pmSupports=signed(o.pm.live,target)>0;
  // A change of MF sign is NEVER required to recognize a transfer:
  // it may anticipate or lag the price/MCB structure.
  if(wave.direction===target&&live===target&&
     priceSupports&&pmSupports){
   emit(o.at,'MCB15','TRANSFER_ACCEPTED',{
    from:d,to:target,crossAt:t.at,price:o.price,
    acceptance:'CLOSED_WAVE_PLUS_PRICE_AND_PM_LIVE_MF_DESCRIPTIVE'});
   cam.direction=target;cam.id=target+'|TRANSFER:'+t.at;
   cam.sourceAt=t.at;cam.knownAt=t.at;
   cam.originPrice=t.priceAtFirstObservation;
   cam.episodes=0;cam.counterAttacks=0;cam.resumptions=0;
   cam.phase='NEW_PARENT_ACCEPTED';cam.transfer=null;
  }else if(wave.direction===d&&live===d){
   emit(o.at,'MCB15','CROSS15_FAILED_RETURN_PARENT',{direction:d});
   cam.transfer=null;cam.phase='PARENT_RESUMPTION';
  }
 }else if(live&&live!==cam.direction){
  if(cam.phase!=='COUNTERATTACK'&&cam.phase!=='CONTESTED')
   cam.phase='CONTESTED';
 }else if(live===cam.direction&&
   ['CONTESTED','COUNTERATTACK'].includes(cam.phase)&&
   o.mcb3.direction===cam.direction){
  cam.phase='PARENT_RESUMPTION';
 }
 if(oldCamGap!==null&&o.mcb15.gapSlope3!==null&&
    signed(o.mcb15.gapSlope3,cam.direction)<0&&
    o.mcb3.direction!==cam.direction&&
    !cam.transfer&&cam.phase==='CAMPAIGN_ACTIVE')
  cam.phase='COUNTERATTACK';
 cam.high=Math.max(cam.high,o.price);
 cam.low=Math.min(cam.low,o.price);
 cam.lastPrice=o.price;
 mem.lastGap15=o.mcb15.gap;
 mem.lastAsOf=o.at;
 return {events,firstCross};
}
function qualify(o,mem,position=null,attention=null,market=null){
 const cam=mem.campaign,ep=mem.episode;
 if(!cam||!ep)return {action:'WAIT',reason:'NO_MCB3_EPISODE',candidate:null};
 const d=ep.direction,parent=cam.direction;
 const wav=o.mcb15,closed=wav.closed.direction;
 const m15=signed(wav.slope15,d),m3=signed(wav.slope3,d);
 const mf15=signed(o.mf.slope15,d),mf3=signed(o.mf.slope3,d);
 const pm=signed(o.pm.live,d),pm3=signed(o.pm.p3,d);
 const cross0=side(d)*(o.price-ep.crossPrice);
 const waveSupports=d===parent?
  (closed===d||wav.direction===d||m15>0):
  ((wav.direction===d||m15>0)&&
   (wav.gapSlope3!==null&&signed(wav.gapSlope3,d)>0));
 // MF15/MF3 explain a divergence, but cannot independently grant or veto
 // an MCB3-led entry. Conversion is the current price response.
 const conversion=pm!==null&&pm>0;
 const turnaround=d!==parent;
 // Don't mistake an old PM3 response for fresh conversion. The present
 // price must still be moving with the LIVE MCB3 episode, not against it.
 const live3Aligned=o.mcb3.direction===d,priceRetained=cross0>=0;
 const marginalPrice=signed(o.pm.p3,d);
 // Marginal 3m price must still be productive NOW, not only since the
 // ancient Cross3. No absolute PM dollar threshold, no 18/25m clock.
 const marginalProgress=marginalPrice!==null&&marginalPrice>0;
 const support=waveSupports&&conversion&&priceRetained&&
  live3Aligned&&marginalProgress;
 const uncertain=attention?.phase==='POLARITY_UNCERTAIN';
 // Uncertain BW15/LBW15: require MCB3 + MCB15 and a current translated
 // price. MF15 and MF3 stay visible even when contrary or precursory.
 const uncertainProof=waveSupports&&live3Aligned&&
  marginalProgress&&conversion&&priceRetained;
 const MF='MF15_'+(mf15>0?'FAV':mf15<0?'OPP':'FLAT')+
  '_MF3_'+(mf3>0?'FAV':mf3<0?'OPP':'FLAT')+
  '_DESCRIPTIVE_NO_VETO';
 const context={waveSupports,m15,m3,mf15,mf3,
  pm,pm3,cross0,MF,conversionObserved:conversion,
  live3Aligned,priceRetained,marginalPrice,marginalProgress,
  uncertain,uncertainProof,
  vigilancePhase:attention?.phase||'UNKNOWN',
  marketPhase:market?.kind||'UNKNOWN',
  marketReason:market?.reason||'UNKNOWN',
  previousPolarityRetained:market?.priorPolarityRetained??null,
  currentCrossPriceDefended:market?.entryConfirmedSinceCross??null,
  MF15Conflict:market?.mfConflict??null,
  MF15Reading:market?.mfReading||null,
  lastCross15At:market?.lastConfirmedCross?.at??null,
  marketAdmissionDeferred:market?.deferNewEntry||false,
  priceSincePente15:attention?.evidence?.priceFromAnchor??null,
  pmFavourableSamples:attention?.watch?.pmFavourable??null,
  pmAdverseSamples:attention?.watch?.pmAdverse??null,
  pmCompatibility:pm>0?'TRADUCTIVE':pm<0?'COUNTER':'NEUTRAL',
  mode:turnaround?'REVERSAL_FORMING':'CONTINUATION',
  parentDirection:parent,campaignPhase:cam.phase};
 if(position)return {action:'HOLD',reason:'POSITION_REVIEW_SEPARATE',
  candidate:d,context};
 // The cross starts a persistent tactical hypothesis. MF, MCB15, price and
 // PM Live may agree later, and can disagree again. Neither a one-tick
 // rejection nor a fixed 18/25 min expiry is allowed. The opposite Cross3
 // replaces this episode; the PAPER ledger consumes only ACTUAL admissions.
 if(ep.entered||ep.status==='CONSUMED')
  return {action:'WAIT',reason:'TACTICAL_EPISODE_CONSUMED',candidate:d,context};
 if(ep.crossAt<mem.startedAt)return {action:'WAIT',
  reason:'CROSS_PRECEDES_ENGINE_START',candidate:d,context};
 if(o.mcb3.direction!==d){
  ep.status='TACTICAL_WAVE_NOW_CONTRADICTS_CROSS';
  return {action:'WAIT',reason:'MCB3_WAVE_NO_LONGER_ALIGNED',
   candidate:d,context};
 }
 // Persistent historical context of failed/undecided 15m polarities has
 // FIRST authority over new entries, independent of current instant slope.
 // A recent 15m confirmation is NOT permission to reverse automatically.
 const marketDeferred=!!market?.deferNewEntry;
 const admissible=support&&!marketDeferred&&(!uncertain||uncertainProof);
 ep.status=admissible?'ADMISSIBLE':'OBSERVING_CAUSAL_CONFIRMATIONS';
 return {action:admissible?'ENTER_'+d.toUpperCase():'WAIT',
  reason:marketDeferred?'V552_MARKET_POLARITY_CONTESTED_WAIT_PRICE_STRUCTURE':
   admissible?turnaround?'V552_REVERSAL_TACTIC_WITH_15M_CONVERSION':
   'V552_MCB3_CONTINUATION_15M_SUPPORTS':
   uncertain&&!uncertainProof?'V552_POLARITY_UNCERTAIN_DEFER_NEW_ENTRY':
   'V552_EPISODE_WATCH_MCB_PM_PRICE',
  candidate:d,context};
}

function positionReview(o,mem,position,attention){
 const held=position.direction,d=side(held),oppositeDirection=opp(held);
 const movement=round(d*(o.price-position.entryPrice));
 const relative=o.mcb3.direction===oppositeDirection;
 const cross15=o.mcb15.closed.confirmedCross;
 const confirmedOpposite=!!(cross15&&cross15.knownAt<=o.at&&
  cross15.direction===oppositeDirection&&cross15.knownAt>position.entryAt);
 // NOTE: 'signed' takes a STRING direction, not +/-1. This reimplementation
 // corrects the old V551 protection-type bug without enabling its naive
 // threshold pile-up / excessive exits.
 const g15=signed(o.mcb15.gapSlope3,held);
 const adversePrice=signed(o.pm.p3,held)<0;
 const adverseMF=signed(o.mf.slope3,held)<0;
 const adversePM=signed(o.pm.live,held)<0;
 const liveOpposite=o.mcb15.direction===oppositeDirection;
 const parentSupports=mem.campaign?.direction===held&&
  o.mcb15.closed.direction===held&&o.mcb15.direction===held;
 const watch=attention?.watch||null,evidence=attention?.evidence||null;
 const counterConvinces=!!(attention?.counterConvinces&&watch&&
  watch.challenger===oppositeDirection);
 const mf15Counter=signed(o.mf.slope15,oppositeDirection);
 const mfe=val(position.mfePriceUsd);
 const giveback=mfe===null?null:Math.max(0,mfe-movement);
 const netAtCurrentPrice=position.entryPrice>0?
  round(movement*1500/position.entryPrice - 0.75 -
    0.0005*1500*o.price/position.entryPrice):null;
 const economicGainAtRisk=mfe!==null&&giveback>movement&&
  movement>0&&netAtCurrentPrice!==null&&netAtCurrentPrice>0;
 // A single LIVE cross is WATCH only. An early protective EXIT requires
 // a reclaimed counter-attack of MCB/price PLUS an economic giveback.
 // MF level or slope may precede the reversal; it must NOT veto nor
 // grant EXIT. The old V551 immediate tactical exit is not resurrected.
 // MF readings remain on the position report strictly for interpretation.
 const slowFlowTerritory=signed(o.mf.slow,oppositeDirection);
 const slowFlowAffirms=slowFlowTerritory!==null&&slowFlowTerritory>0&&
  mf15Counter!==null&&mf15Counter>0;
 // MF level or slope is never a switch for protective exits.
 // Require the structural/price counter-attack to reclaim territory after
 // a respiration: a single LIVE 15m or fleeting MF impulse cannot close it.
 const structuralRecovery=attention?.protectiveTransfer===true;
 const earlyProtect=counterConvinces&&structuralRecovery&&economicGainAtRisk;
 const riskReview={movement,relative,confirmedOpposite,
  liveOpposite,adversePrice,adverseMF,adversePM,
  gap15:g15,parentSupports,
  vigilancePhase:attention?.phase||null,
  watchAt:watch?.at||null,
  firstLiveAt:watch?.firstLiveAt||null,
  priceConservedSinceLive:evidence?.priceFromLive??null,
  counterConvinces,protectiveTransfer:!!attention?.protectiveTransfer,
  mf15Counter,slowFlowTerritory,slowFlowAffirms,
  mfAuthority:'DESCRIPTIVE_NO_ENTRY_OR_EXIT_VETO',
  structuralRecovery,
  netAtCurrentPrice,mfe,giveback,economicGainAtRisk,earlyProtect};
 if(earlyProtect&&!parentSupports){
  return {action:'EXIT_'+held.toUpperCase(),
   reason:'V552_LIVE15_STRUCTURAL_PRICE_PROTECT_ECONOMIC_GAIN',
   positionReview:riskReview};
 }
 if(confirmedOpposite){
  // Confirmed opposite cross15 is a HIGH-PRIORITY structural review,
  // not mandatory liquidation if the held parent and PRICE are defended.
  // MF15/MF3 can disagree or lead, never granting/vetoing HOLD/EXIT.
  // Independent PAPER hard risk remains sovereign.
  const mf15LevelHeld=signed(o.mf.slow,held);
  const mf15SlopeHeld=signed(o.mf.slope15,held);
  const price3Held=signed(o.pm.p3,held);
  const isNativeHeld=mem.campaign?.direction===held;
  const heldTerritory=(movement>0&&price3Held!==null&&price3Held>0);
  const slowMFConfirms=mf15LevelHeld!==null&&mf15LevelHeld>0&&
    mf15SlopeHeld!==null&&mf15SlopeHeld>0;
  const counterLacksPrice= !attention?.counterConvinces&&
    (attention?.evidence?.priceFromLive===null||
     attention?.evidence?.priceFromLive===undefined||
     attention.evidence.priceFromLive<=0);
  riskReview.confirmed15Review={
   slowMFConfirms,heldTerritory,isNativeHeld,counterLacksPrice,
   mf15LevelHeld,mf15SlopeHeld,price3Held};
  if(isNativeHeld&&heldTerritory&&counterLacksPrice){
   return {action:'HOLD',
    reason:'V552_CONFIRMED_15M_CONTEST_PRICE_DEFENDS_POSITION',
    positionReview:riskReview};
  }
  return {action:'EXIT_'+held.toUpperCase(),
   reason:'V552_CONFIRMED_15M_POSITION_EXIT',
   positionReview:riskReview};
 }
 // Slope break, a single 3m counter-cross, or flat BW/LBW cannot liquidate
 // a campaign by itself. The PAPER hard risk remains independent.
 return {action:'HOLD',reason:attention?.phase==='POLARITY_UNCERTAIN'?
  'V552_15M_POLARITY_UNCERTAIN_POSITION_UNDER_REVIEW':
  attention?.phase==='CROSS15_LIVE_WATCH'?
   'V552_CROSS15_LIVE_WATCH_COUNTER_NOT_YET_CONVINCING':
   'V552_CAMPAIGN_HELD',positionReview:riskReview};
}
function evaluate(mem,input,price,now,position=null){
 const o=sensor(input,now,price);
 if(!o)return {decision:{version:VERSION,action:'WAIT',
  reason:'MISSING_SENSOR',brokerOrdersEnabled:false},memory:mem};
 if(o.at<=mem.lastAsOf)return {decision:{version:VERSION,
  action:'WAIT',reason:'DUPLICATE_TICK',brokerOrdersEnabled:false},memory:mem};
 o._newAudit=input.samples.filter(r=>r.ts>mem.lastAuditAt&&r.ts<=now);
 // No event backfill on startup, only observations from the present onward.
 if(mem.lastAsOf===0){
  const first=o._newAudit.at(-1);
  if(first){mem.lastAuditAt=first.ts;
   mem.lastGap3=val(first.liveLbw)!==null&&val(first.liveBw)!==null?
    first.liveLbw-first.liveBw:null;}
  o._newAudit=[];
 }
 const {events,firstCross}=ownMemoryStep(mem,o);
 o._firstCrossId=firstCross?.id||null;
 o._newCross3=firstCross||null;
 if(!mem.vigilance)mem.vigilance=vigilance.initial();
 const attention=vigilance.assess(o,mem.vigilance,position,input.samples);
 const market=marketQuality.inspect(o,input,
  mem.episode?.direction||o.mcb3.direction,mem.episode);
 for(const e of attention.events||[]){
  trace(mem,e.at,'ATTENTION',e.type,{
   price:e.price,phase:attention.phase,reason:e.cause||null});
 }
 let candidate=position?position.direction:mem.episode?.direction||null;
 let assessment=position?positionReview(o,mem,position,attention):
   qualify(o,mem,null,attention,market);
 if(!o.healthy){
  if(!position||assessment.action.startsWith('ENTER'))
   assessment={action:'WAIT',reason:'SOURCE_NOT_FRESH_OR_CONFIRMED',
    candidate,context:assessment.context||{}};
 }
 // Do not mutate the episode as 'entered' here: proposal is NOT an order.
 // PAPER does that only after a fresh, accepted simulated fill.
 if(position&&assessment.action.startsWith('EXIT')){
  mem.lastExit={at:now,reason:assessment.reason,price,direction:position.direction,
   parentAtExit:mem.campaign?.id||null};
 }
 const details={...o};
 delete details._newAudit;delete details._firstCrossId;
 delete details._newCross3;
 const decision={version:VERSION,asOf:now,price,
  mode:'PAPER_ONLY',brokerOrdersEnabled:false,action:assessment.action,
  reason:assessment.reason,quality:o.healthy?'DATA_OK':'DATA_DEGRADED',
  candidate:assessment.candidate||candidate,
  campaignId:mem.campaign?.id||null,
  campaignDirection:mem.campaign?.direction||null,
  campaignPhase:mem.campaign?.phase||'UNKNOWN',
  episode:mem.episode?{...mem.episode}:null,
  recentEvents:events,causalTrace:mem.trace.slice(-20),
  readings:details,qualification:assessment.context||null,
  positionReview:assessment.positionReview||null,
  market:{...market,entryAuthority:'NEW_ADMISSION_ONLY',
   positionExitAuthority:false},
  vigilance:{
   version:mem.vigilance.version,phase:attention.phase,
   evidence:attention.evidence,watch:attention.watch,
   relativeFlattening:attention.relativeFlattening,
   reference:attention.reference,
   events:attention.events,
   counterConvinces:attention.counterConvinces,
   protectiveTransfer:attention.protectiveTransfer
  },
  contracts:{origin:'MCB3_FIRST',campaign:'MCB15_DIRECTOR_JUDGE',
   validation:'MCB3_MCB15_PRICE_PM_MF_OBSERVATIONAL',
   risk:'HARD_500_BTC_PRICE_USD_ON_FRESH_TICK',
   levels:'PRICE_REFERENCE_NOT_STOP_ORACLE',
   thresholdPolicy:'NO_FIXED_MINUTES_OR_PM_DOLLAR_GATE',
   vigilance:'LBW15_SLOPE_LIVE_BEFORE_CROSS15_LIVE',
   reversals:'EXIT_POSITION_NOT_AUTO_ENTER_OPPOSITE'}};
 return {decision,memory:mem};
}
module.exports={VERSION,originalMemory,sensor,ownMemoryStep,
 qualify,positionReview,evaluate,trace};
