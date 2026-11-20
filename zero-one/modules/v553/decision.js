'use strict';
// BOONO V553 - each independent trade needs its OWN causal Live evidence.
// E15 is contextual, not a reusable entry permission. No V552 policy imports.
const source=require('./source'),marketModel=require('./market');
const VERSION='v5.5.3-live-causal-price-market-paper-v1',MIN=60000;
const num=source.val,sg=d=>d==='long'?1:d==='short'?-1:0;
const direction=x=>x>0?'long':x<0?'short':null;
const opposite=d=>d==='long'?'short':d==='short'?'long':null;
const rnd=x=>x===null||!Number.isFinite(x)?null:Math.round(x*100)/100;
function originalMemory(asOf=Date.now(),lastExit=null){
 return {version:'v553-causal-chain-memory-v1',startedAt:asOf,
  lastAsOf:asOf,lastAuditAt:asOf,observations:0,
  e15:null,opportunity:null,threat:null,
  lastSlope:null,lastGap:null,lastPM:null,
  lastExit:lastExit?{...lastExit}:null,
  lastPositionEntryAt:null,trace:[],events:[],
  marketStatus:'UNRECOGNIZED',decisionArchive:[]};
}
function emit(mem,at,family,type,details={}){
 const item={at,family,type,...details};
 mem.trace.push(item);mem.trace=mem.trace.slice(-160);
 mem.events.push(item);return item;
}
function sensor(input,now,price){
 const {current,bars,samples}=input;if(!current)return null;
 const p3=source.sampleAt(samples,now-3*MIN),
 p10=source.sampleAt(samples,now-10*MIN),
 p15=source.sampleAt(samples,now-15*MIN);
 const gap3=num(current.liveLbw)!==null&&num(current.liveBw)!==null?
  current.liveLbw-current.liveBw:null;
 const gap15=num(current.live15LbwRaw)!==null&&num(current.live15BwRaw)!==null?
  current.live15LbwRaw-current.live15BwRaw:null;
 const oldGap=p3&&num(p3.live15LbwRaw)!==null&&num(p3.live15BwRaw)!==null?
  p3.live15LbwRaw-p3.live15BwRaw:null;
 const n15=source.nativeLast(bars.m15,15*MIN);
 const n3=source.nativeLast(bars.m3,3*MIN);
 const last=bars.m15.at(-1),old3=bars.m3.at(-1);
 const bar=bars.m15.find(x=>x.ts===n15?.at);
 const native=n15?{...n15,
  priceProxy:n15.direction==='long'?bar?.low:bar?.high,
  priceBasis:'EXTREME_OF_CONFIRMED_15M_BAR_PROXY',
  lbwAtExtreme:bar?.lbw??null}:null;
 return {asOf:now,at:now,price,auditAt:current.ts,
  healthy:input.healthy,brokerOrdersEnabled:false,
  mcb3:{direction:direction(gap3),gap:rnd(gap3),
   native:n3,lbw:num(current.liveLbw),bw:num(current.liveBw)},
  mcb15:{direction:direction(gap15),gap:rnd(gap15),
   lbw:num(current.live15LbwRaw),bw:num(current.live15BwRaw),
   slope3:p3?rnd(current.live15LbwRaw-p3.live15LbwRaw):null,
   bwSlope3:p3?rnd(current.live15BwRaw-p3.live15BwRaw):null,
   slope15:p15?rnd(current.live15LbwRaw-p15.live15LbwRaw):null,
   gapSlope3:oldGap!==null?rnd(gap15-oldGap):null,
   closed:source.closedWave(bars.m15),native},
  pm:{live:num(current.priceMove)!==null?
    rnd(current.priceMove+price-current.lastPrice):null,
   p3:p3?rnd(price-p3.lastPrice):null,
   p15:p15?rnd(price-p15.lastPrice):null,
   baton:num(current.priceMove)},
  mf:{slow:num(current.live15MfRaw),fast:num(current.liveMoneyFlow),
   slope15:p10?rnd(current.live15MfRaw-p10.live15MfRaw):null,
   slope3:p3?rnd(current.liveMoneyFlow-p3.liveMoneyFlow):null},
  place:{ma3:old3?.ma200??null,ma15:last?.ma200??null},
  source:input.source};
}
function openChain(mem,o,d,type){
 const a={id:'V553|'+type+'|'+d+'|'+o.auditAt,
  direction:d,source:type,startedAt:o.auditAt,
  startPrice:o.price,initialGap:o.mcb15.gap,
  slopeAt:o.mcb15.slope3,bwSlopeAt:o.mcb15.bwSlope3,
  firstLiveAt:o.mcb15.direction===d?o.auditAt:null,
  firstLivePrice:o.mcb15.direction===d?o.price:null,
  firstLiveGap:o.mcb15.direction===d?o.mcb15.gap:null,
  confirmations:0,liveSamples:0,highestProgress:0,
  lowestProgress:0,lastAuditAt:o.auditAt,lastPrice:o.price,
  status:'WATCHING',parentE15:mem.e15?.id||null,
  phase:'LBW15_PENTE_LIVE',rejections:0};
 emit(mem,o.auditAt,'MCB15','LBW15_PENTE_LIVE',{
  chainId:a.id,direction:d,source:type,price:o.price,
  lbw15Slope3:o.mcb15.slope3,bw15Slope3:o.mcb15.bwSlope3,
  gapSlope3:o.mcb15.gapSlope3});
 return a;
}
function refresh(mem,o,input,position){
 const newAudit=o.auditAt>mem.lastAuditAt;
 const n=o.mcb15.native;
 if(n&&n.knownAt<=o.at&&(!mem.e15||n.knownAt>mem.e15.knownAt)){
  mem.e15={id:n.direction+'|E15:'+n.at,
   direction:n.direction,barAt:n.at,knownAt:n.knownAt,
   priceProxy:n.priceProxy,priceBasis:n.priceBasis,
   lbwAtExtreme:n.lbwAtExtreme,
   note:'E15_CONTEXT_NOT_ENTRY_AUTHORITY'};
  emit(mem,n.knownAt,'MCB15','E15_PARENT_CONFIRMED',
   {parentId:mem.e15.id,priceProxy:n.priceProxy});
 }
 const held=position?.direction||null;
 if(held&&mem.lastPositionEntryAt!==position.entryAt){
  mem.lastPositionEntryAt=position.entryAt;
  mem.opportunity=null;mem.threat=null;
  emit(mem,o.at,'POSITION','POSITION_REVIEW_INITIALIZED',{
   direction:held,entryAt:position.entryAt,
   inherited:position.inheritedFrom||null});
 }
 if(!held&&mem.lastPositionEntryAt){
  mem.lastPositionEntryAt=null;mem.threat=null;
 }
 if(!newAudit)return;
 const slope=o.mcb15.slope3,gapSlope=o.mcb15.gapSlope3;
 const slopeDirection=direction(slope),gapDirection=direction(gapSlope);
 const prevSlopeDirection=direction(mem.lastSlope);
 const pmDirection=direction(o.pm.live),prevPMDirection=direction(mem.lastPM);
 let target=held?opposite(held):slopeDirection;
 const slopeChanged=!!(slopeDirection&&
  prevSlopeDirection&&slopeDirection!==prevSlopeDirection);
 const pmTurn=!!(pmDirection&&prevPMDirection&&
  pmDirection!==prevPMDirection);
 const freshAfterExit=!mem.lastExit||o.auditAt>mem.lastExit.at;
 const structuralTurn=target&&slopeDirection===target&&
  gapDirection===target;
 if(held){
  mem.opportunity=null;
  if(structuralTurn&&!mem.threat){
   mem.threat=openChain(mem,o,target,'POSITION_ADVERSE_SLOPE');
  }
  if(mem.threat&&mem.threat.direction!==target)mem.threat=null;
 }else{
  const hasChain=mem.opportunity&&
   mem.opportunity.startedAt>(mem.lastExit?.at||0);
  const newInitiative=(slopeChanged||
   (pmTurn&&pmDirection===target&&structuralTurn)||
   (!hasChain&&mem.lastGap!==null&&
    direction(mem.lastGap)!==o.mcb15.direction&&
    o.mcb15.direction===target));
  if(structuralTurn&&freshAfterExit&&newInitiative){
   mem.opportunity=openChain(mem,o,target,
    slopeChanged?'SLOPE_TURN':'NEW_CONVERSION_OR_CROSS15_LIVE');
  }
 }
 for(const chain of [held?mem.threat:mem.opportunity]){
  if(!chain||o.auditAt<=chain.lastAuditAt)continue;
  const sign=sg(chain.direction),progress=sign*(o.price-chain.startPrice);
  const pm=sign*o.pm.live,marginal=sign*o.pm.p3,
   structural=o.mcb15.slope3*sign>0&&
     o.mcb15.gapSlope3*sign>0;
  const supporting=o.mcb3.direction===chain.direction&&
   pm>0&&marginal>0&&structural&&progress>0;
  chain.confirmations=supporting?chain.confirmations+1:0;
  chain.highestProgress=Math.max(chain.highestProgress,progress);
  chain.lowestProgress=Math.min(chain.lowestProgress,progress);
  if(o.mcb15.direction===chain.direction){
   if(chain.firstLiveAt===null){
    chain.firstLiveAt=o.auditAt;chain.firstLivePrice=o.price;
    chain.firstLiveGap=o.mcb15.gap;chain.liveSamples=1;
    emit(mem,o.auditAt,'MCB15','CROSS15_LIVE_OBSERVED',{
     chainId:chain.id,direction:chain.direction,
     price:o.price,gap:o.mcb15.gap});
   }else chain.liveSamples++;
   chain.phase='CROSS15_LIVE';
  }else if(chain.firstLiveAt!==null){
   chain.rejections++;
   chain.phase='CROSS15_LIVE_RETURNED';
   // A rejected live cross cannot accumulate old persistence toward
   // the NEXT cross. The observations remain in the causal trace only.
   chain.firstLiveAt=null;chain.firstLivePrice=null;
   chain.firstLiveGap=null;chain.liveSamples=0;
   emit(mem,o.auditAt,'MCB15','CROSS15_LIVE_REJECTED',{
    chainId:chain.id,price:o.price});
   if(!held&&chain.confirmations===0)mem.opportunity=null;
  }
  chain.lastAuditAt=o.auditAt;chain.lastPrice=o.price;
 }
 mem.lastSlope=slope;
 mem.lastGap=o.mcb15.gap;
 mem.lastPM=o.pm.live;
 mem.lastAuditAt=o.auditAt;
 mem.observations++;
}
function exitReview(o,mem,pos,market){
 const dir=pos.direction,against=opposite(dir),s=sg(against);
 const c=mem.threat,closed=o.mcb15.closed,
  confirmedOpp=closed.direction===against&&
   closed.knownAt>pos.entryAt;
 const adverse=o.mcb3.direction===against&&
  o.mcb15.slope3*s>0&&o.mcb15.gapSlope3*s>0&&
  o.pm.live*s>0&&o.pm.p3*s>0;
 const progress=c?s*(o.price-c.startPrice):null;
 const liveProgress=c&&c.firstLivePrice!==null?
  s*(o.price-c.firstLivePrice):null;
 const noise=market.evidence?.recent?.median30sMove??null;
 const priceHeld=progress!==null&&progress>0&&
  (noise===null||progress>noise);
 const liveHeld=liveProgress!==null&&liveProgress>0;
 const separating=c&&c.firstLiveGap!==null&&
  o.mcb15.gap!==null?s*(o.mcb15.gap-c.firstLiveGap)>0:false;
 const deepeningLive=!!(c&&c.liveSamples>=2&&
  o.mcb15.direction===against&&separating&&liveHeld);
 // LBW15 pente Live is the FIRST attention anchor. A pre-cross
 // liquidation needs additional place/invalidation evidence, not merely
 // transient MCB3+PM opposition. Do not reproduce V552's false exits.
 // The current V553 policy acts at a persistent productive CROSS15 LIVE
 // without waiting for the confirmed 15m bar or a positive P&L.
 const early=false;
 const live=!!(deepeningLive&&adverse&&priceHeld);
 const confirmed=!!(confirmedOpp&&adverse&&o.mcb15.direction===against);
 const context={direction:dir,challenger:against,
  slopeAt:c?.startedAt||null,cross15LiveAt:c?.firstLiveAt||null,
  close15At:closed.knownAt,confirmedOpp,
  priceSinceSlope:rnd(progress),priceSinceCross15Live:rnd(liveProgress),
  pmAgainst:rnd(s*o.pm.live),mcb3Against:o.mcb3.direction===against,
  widening:separating,confirmedSamples:c?.confirmations||0,
  liveSamples:c?.liveSamples||0,
  economicGainNotRequired:true,
  secondRespirationNotRequired:true,
  mfSecondaryOnly:market.status==='SUSPEND_NEW'||
    market.status==='WATCH_CONTESTED',
  marketCannotForceExit:true};
 if(early||live||confirmed){
  return {action:'EXIT_'+dir.toUpperCase(),
   reason:live?'V553_CROSS15_LIVE_PRICE_TRANSFER_INVALIDATES_POSITION':
    'V553_CONFIRMED15_PRICE_INVALIDATES_POSITION',context};
 }
 return {action:'HOLD',
  reason:c?'V553_LIVE_STRUCTURAL_REVIEW_HOLD':
    'V553_POSITION_VALID_NOT_YET_CONTESTED',context};
}
function entryReview(o,mem,market){
 const chain=mem.opportunity;
 if(!chain)return {action:'WAIT',reason:'V553_NO_NEW_CAUSAL_CHAIN'};
 const s=sg(chain.direction),progress=s*(o.price-chain.startPrice);
 const current=o.mcb3.direction===chain.direction&&
  o.mcb15.slope3*s>0&&o.mcb15.gapSlope3*s>0&&
  o.pm.live*s>0&&o.pm.p3*s>0&&progress>0;
 const stable=chain.confirmations>=2;
 const live=chain.firstLiveAt!==null&&
  o.mcb15.direction===chain.direction&&chain.liveSamples>=2&&
  chain.firstLiveGap!==null&&
  s*(o.mcb15.gap-chain.firstLiveGap)>0;
 const emerging=market.emerging;
 const inContext=!!mem.e15;
 const place=market.place||{};
 const poorLocation=place.nearBoundary&&!place.extension&&!live;
 const noNew=!!(mem.lastExit&&chain.startedAt<=mem.lastExit.at);
 const canTrade=current&&stable&&inContext&&
  (live||emerging)&&market.admissionAllowed&&
  !poorLocation&&!noNew;
 const reason=!inContext?'V553_E15_CONTEXT_UNKNOWN':
  noNew?'V553_OLD_CAUSAL_CHAIN_CONSUMED':
  !market.admissionAllowed?'V553_MARKET_NOT_EXPLOITABLE':
  poorLocation?'V553_NO_ROOM_NEAR_15M_RANGE_BOUNDARY':
  !stable?'V553_WAIT_LIVE_CHAIN_PERSISTENCE':
  !current?'V553_MCB_PM_PRICE_NOT_TRANSLATED':
  !(live||emerging)?'V553_WAIT_CROSS15_LIVE_OR_NEW_IMPULSE':
  'V553_CAUSAL_CHAIN_ACCEPTED_WITH_MARKET';
 const context={chainId:chain.id,direction:chain.direction,
  e15Context:mem.e15?.id||null,
  slopeAt:chain.startedAt,cross15LiveAt:chain.firstLiveAt,
  timeSinceSlopeMs:o.at-chain.startedAt,
  priceSinceSlope:rnd(progress),
  liveSamples:chain.liveSamples,confirmations:chain.confirmations,
  priceLocation:place,market:market.status,
  pmLive:o.pm.live,pm3:o.pm.p3,mf:o.mf,
  noRecycledCross3:true,noFixedPostExitTimer:true};
 return {action:canTrade?'ENTER_'+chain.direction.toUpperCase():'WAIT',
  reason,context};
}
function evaluate(memory,input,price,ts,position=null){
 const o=sensor(input,ts,price);
 if(!o)return {memory,decision:{version:VERSION,mode:'PAPER_ONLY',
  brokerOrdersEnabled:false,asOf:ts,action:'WAIT',
  quality:'DATA_DEGRADED',reason:'V553_NO_AUDIT_SENSOR'}};
 if(ts<=memory.lastAsOf)return {memory,decision:{version:VERSION,
  brokerOrdersEnabled:false,mode:'PAPER_ONLY',
  action:'WAIT',reason:'V553_DUPLICATE_TICK',asOf:ts}};
 memory.events=[];
 refresh(memory,o,input,position);
 const market=marketModel.calculate(input,o,position?null:memory.opportunity,
   {exitAt:memory.lastExit?.at||0});
 // A market cannot oscillate OPEN/SUSPEND with every 30-second Bâton row.
 // Retain SUSPEND through transient signs. Reopen only on measured fresh
 // productive translation (or a sustained hour that already retained price).
 const priorMarket=memory.marketStatus;
 market.rawStatus=market.status;
 const stableEvidence=market.evidence?.recent?.priceEfficiency>
   market.evidence?.efficiencyBaseline&&
   market.evidence?.recent?.retainedFraction>
   market.evidence?.retentionBaseline;
 if(priorMarket==='SUSPEND_NEW'&&
    market.status==='OPEN_OBSERVING'&&
    !market.emerging&&!stableEvidence){
   market.status='SUSPEND_NEW';
   market.admissionAllowed=false;
   market.reason='PREVIOUS_CHOP_UNRESOLVED_NO_NEW_TRANSFER';
 }
 if(market.status!==priorMarket)emit(memory,o.auditAt,'MARKET',
   'ADMISSION_MARKET_TRANSITION',{
    from:priorMarket,to:market.status,reason:market.reason});
 let r=position?exitReview(o,memory,position,market):
  entryReview(o,memory,market);
 if(!o.healthy&&r.action.startsWith('ENTER'))
  r={...r,action:'WAIT',reason:'V553_DATA_STALE_NO_ADMISSION'};
 memory.marketStatus=market.status;
 memory.lastAsOf=ts;
 const d={version:VERSION,asOf:ts,price,mode:'PAPER_ONLY',
  brokerOrdersEnabled:false,quality:o.healthy?'DATA_OK':'DATA_DEGRADED',
  action:r.action,reason:r.reason,
  candidate:memory.opportunity?.direction||null,
  parentE15:memory.e15,
  campaignId:memory.e15?.id||null,
  campaignDirection:memory.e15?.direction||null,
  campaignPhase:memory.threat?.phase||
   memory.opportunity?.phase||'E15_CONTEXT_ONLY',
  chain:position?memory.threat:memory.opportunity,
  opportunity:position?null:memory.opportunity,
  market,readings:o,qualification:r.context||null,
  vigilance:{phase:memory.threat?.phase||
    memory.opportunity?.phase||'OBSERVING',
    slopeAt:memory.threat?.startedAt||memory.opportunity?.startedAt||null,
    firstLiveAt:memory.threat?.firstLiveAt||
      memory.opportunity?.firstLiveAt||null,
    priceSinceSlope:r.context?.priceSinceSlope??null,
    status:r.reason},
  recentEvents:memory.events.slice(),
  causalTrace:memory.trace.slice(-20)};
 return {memory,decision:d};
}
module.exports={VERSION,originalMemory,sensor,openChain,refresh,
 exitReview,entryReview,evaluate};
