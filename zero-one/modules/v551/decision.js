'use strict';
// V5.5.1 — independent PAPER constitution, not V5.5 patch.
// MCB3 initiates tactical episode. BW15/LBW15 arbitrate continuity.
// MF15/3 and PM explain the unfolding effort; no imaginary price frontier.
// E15 -> LBW15 slope -> repeated Cross3 -> Cross15 -> conversion -> E3/E15
// is an event signature to OBSERVE, never an inflexible entry checklist.
const src=require('./source');
const VERSION='v5.5.1-mcb3-first-campaign-memory-paper-v1';
const MIN=60000;
const val=src.val,side=d=>d==='long'?1:d==='short'?-1:0;
const dir=x=>x>0?'long':x<0?'short':null;
const opp=d=>d==='long'?'short':d==='short'?'long':null;
const round=x=>x===null?null:Math.round(x*100)/100;
const signed=(x,d)=>x===null||!side(d)?null:round(side(d)*x);
function originalMemory(now=Date.now()){
 return {version:'v551-campaign-memory-v1',startedAt:now,lastAsOf:0,
  lastAuditAt:0,lastGap3:null,lastGap15:null,
  cross3:null,episode:null,campaign:null,
  last15ClosedAt:null,lastNative3At:null,lastNative15At:null,
  lastSlope15Dir:null,lastPmDir:null,lastMF15Dir:null,
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
   slope3:lbw3,slope15:lbw15,gapSlope3:gap15Slope,
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
  // Acceptance is observed only if its own price AND MF/PM concur
  // while the 15m wave remains across BW. It is not an age timer.
  const priceSupports=side(target)*(o.price-t.priceAtFirstObservation)>0;
  const flowSupports=signed(o.mf.slope15,target)>0||
   signed(o.mf.slope3,target)>0;
  const pmSupports=signed(o.pm.live,target)>0;
  if(wave.direction===target&&live===target&&
     priceSupports&&(flowSupports||pmSupports)){
   emit(o.at,'MCB15','TRANSFER_ACCEPTED',{
    from:d,to:target,crossAt:t.at,price:o.price,
    acceptance:'CLOSED_WAVE_PLUS_PRICE_AND_FLOW_OR_CONVERSION'});
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
function qualify(o,mem,position=null){
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
 const speedAlignment=mf3>0||mf15>0;
 const conversion=pm!==null&&pm>0;
 const turnaround=d!==parent;
 // Don't mistake an old PM3 response for fresh conversion. The present
 // price must still be moving with the LIVE MCB3 episode, not against it.
 const live3Aligned=o.mcb3.direction===d,priceRetained=cross0>=0;
 const support=turnaround?
  waveSupports&&mf3>0&&conversion&&priceRetained&&live3Aligned:
  waveSupports&&speedAlignment&&conversion&&priceRetained&&live3Aligned;
 const MF='MF15_'+(mf15>0?'FAV':mf15<0?'OPP':'FLAT')+
  '_MF3_'+(mf3>0?'FAV':mf3<0?'OPP':'FLAT');
 const context={waveSupports,m15,m3,mf15,mf3,
  pm,pm3,cross0,MF,conversionObserved:conversion,
  live3Aligned,priceRetained,
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
 ep.status=support?'ADMISSIBLE':'OBSERVING_CAUSAL_CONFIRMATIONS';
 return {action:support?'ENTER_'+d.toUpperCase():'WAIT',
  reason:support?turnaround?'MCB3_REVERSAL_FORMING_WITH_15M_AND_CONVERSION':
   'MCB3_CONTINUATION_SUPPORTED_BY_15M_FLOW_AND_PRICE':
   'MCB3_EPISODE_OBSERVING_MF_PM_MCB15_PRICE',
  candidate:d,context};
}

function positionReview(o,mem,position){
 const direction=position.direction,d=side(direction);
 const movement=round(d*(o.price-position.entryPrice));
 const relative=o.mcb3.direction===opp(direction);
 const cross15=o.mcb15.closed.confirmedCross;
 const confirmedOpposite=!!(cross15&&cross15.knownAt<=o.at&&
  cross15.direction===opp(direction)&&
  cross15.knownAt>position.entryAt);
 const g15=signed(o.mcb15.gapSlope3,d);
 const adversePrice=signed(o.pm.p3,d)<0;
 const adverseMF=signed(o.mf.slope3,d)<0;
 const adversePM=signed(o.pm.live,d)<0;
 const parentSupports=mem.campaign?.direction===direction &&
  o.mcb15.closed.direction===direction &&
  o.mcb15.direction===direction;
 const contested15=o.mcb15.direction===opp(direction)||
  (g15!==null&&g15<0);
 // No triple confirmation on E15 + Cross15 + MF. Closed 15m cross has
 // direct, but LOCAL position-only, exit authority; parent not deleted.
 if(confirmedOpposite)return {action:'EXIT_'+direction.toUpperCase(),
  reason:'V551_CONFIRMED_15M_CROSS_LOCAL_POSITION_EXIT'};
 if(relative&&contested15&&adversePrice&&
    (adverseMF||adversePM)&&!parentSupports)
  return {action:'EXIT_'+direction.toUpperCase(),
   reason:'V551_MCB3_COUNTER_AND_PRICE_TRANSFER_LOCAL_EXIT'};
 return {action:'HOLD',reason:relative?
   'V551_TACTICAL_COUNTER_BUT_PARENT_NOT_INVALIDATED':
   'V551_CAMPAIGN_HELD',
  positionReview:{movement,relative,confirmedOpposite,contested15,
   adversePrice,adverseMF,adversePM,parentSupports}};
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
 let candidate=position?position.direction:mem.episode?.direction||null;
 let assessment=position?positionReview(o,mem,position):qualify(o,mem);
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
  contracts:{origin:'MCB3_FIRST',campaign:'MCB15_DIRECTOR_JUDGE',
   validation:'MF15_MF3_AND_PM_PRICE_WITHIN_WAVE',
   risk:'HARD_500_BTC_PRICE_USD_ON_FRESH_TICK',
   levels:'PRICE_REFERENCE_NOT_STOP_ORACLE',
   thresholdPolicy:'NO_UNVERIFIED_18MIN_25MIN_OR_PM_DOLLAR_GATES'}};
 return {decision,memory:mem};
}
module.exports={VERSION,originalMemory,sensor,ownMemoryStep,
 qualify,positionReview,evaluate,trace};
