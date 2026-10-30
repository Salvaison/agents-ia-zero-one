'use strict';
// BOONO Watch SHADOWS: bounded, read-only view of the V494 factorial lab.
// Never passes a decision, broker action, or original PAPER state.
const VERSION='v494-dual-shadow-ui-v1';
const SOURCE='boono-v494-entry-exit-lab-v0.1';
const IDS=Object.freeze([
 ['A','EXACT_V493__FROZEN_V493','Entrée V493','Sortie V493'],
 ['B','EXACT_V493__CONTINUATION_SUPERVISOR','Entrée V493','Sortie supervisée'],
 ['C','MCB15_INFLECTION__FROZEN_V493','Entrée filtrée MCB15','Sortie V493'],
 ['D','MCB15_INFLECTION__CONTINUATION_SUPERVISOR','Entrée filtrée MCB15','Sortie supervisée']
]);
function num(v){
 return v===null||v===undefined||v===''?null:
 Number.isFinite(Number(v))?Number(v):null;
}
function str(v,max=140){return String(v===null||v===undefined?'':v).slice(0,max);}
function nn(v){const n=num(v);return n===null?0:Math.max(0,Math.trunc(n));}
function money(v){const n=num(v);return n===null?null:Math.round(n*1e4)/1e4;}
function recentTrade(t){
 return {direction:str(t?.direction,6),entryAt:num(t?.entryAt),
  exitAt:num(t?.exitAt),entryPrice:money(t?.entryPrice),
  exitPrice:money(t?.exitPrice),netPnlUsd:money(t?.netPnlUsd),
  feesUsd:money(t?.feesUsd),mfePriceUsd:money(t?.mfePriceUsd),
  maePriceUsd:money(t?.maePriceUsd),
  givebackPriceUsd:money(t?.givebackPriceUsd),
  exitReason:str(t?.reason||t?.exitReason,100)};
}
function branch(branchId,label,id,entryName,exitName,v){
 const p=v?.position||null;
 const exits=Object.entries(v?.exitsByReason||{})
   .map(([reason,count])=>({reason:str(reason,100),count:nn(count)}))
   .sort((a,b)=>b.count-a.count).slice(0,6);
 return {key:branchId,id,entryName,exitName,
  entries:nn(v?.entries),completed:nn(v?.completed),
  blockedEntries:nn(v?.blockedEntries),partialExits:nn(v?.partialExits),
  realizedNetUsd:money(v?.netRealizedUsd),
  feesUsd:money(v?.feesUsd),
  entriesLong:nn(v?.entriesByDirection?.long),
  entriesShort:nn(v?.entriesByDirection?.short),
  netLongUsd:money(v?.netByDirection?.long),
  netShortUsd:money(v?.netByDirection?.short),
  position:p?{direction:str(p.direction,6),entryAt:num(p.entryAt),
   entryPrice:money(p.entryPrice),
   mfePriceUsd:money(p.mfePriceUsd),
   maePriceUsd:money(p.maePriceUsd),
   unrealizedNetUsd:money(p.unrealizedNetUsd),
   entryInvalidation:money(p.entryInvalidation)}:null,
  exitReasons:exits,
  recentTrades:(Array.isArray(v?.recentTrades)?v.recentTrades:[])
    .slice(-5).reverse().map(recentTrade)};
}
function influence(e){
 const event={type:str(e?.type,56),ts:num(e?.ts),
  entryPolicy:str(e?.entryPolicy,32),exitPolicy:str(e?.exitPolicy,32),
  original:str(e?.original,60),review:str(e?.review,60),
  filtered:str(e?.filtered,60),newDirection:str(e?.newDirection,6),
  newEntryPrice:money(e?.newEntryPrice),
  priorExitReason:str(e?.priorExit?.reason,92),
  priorExitNetUsd:money(e?.priorExit?.netPnlUsd),
  originalStillIn:str(e?.originalBlockedBy?.direction,6)};
 return event;
}
function build(s,now=Date.now()){
 if(!s||s.version!==SOURCE||s.mode!=='SHADOW_ONLY'||
  s.decisionImpact!==false||s.brokerOrdersEnabled!==false)
  throw Error('V494_DUAL_SHADOW_UNTRUSTED_OR_NON_READONLY');
 const at=num(s.lastObservationAt),start=num(s.startedAt);
 if(at===null||start===null||at<start)throw Error('V494_DUAL_SHADOW_INVALID_TIMESTAMPS');
 const lanes=IDS.map(([key,id,entryName,exitName])=>{
  const raw=s.branches?.[id];
  if(!raw||raw.entryPolicy!==id.split('__')[0]||
     raw.exitPolicy!==id.split('__')[1])
   throw Error('V494_DUAL_SHADOW_MISSING_BRANCH_'+key);
  return branch(key,key,id,entryName,exitName,raw);
 });
 const [a,b,c,d]=lanes;
 // Different entry times, fees, trajectories and blocked admissions: these
 // differences are DESCRIPTIVE, never a paired causal or portfolio estimate.
 const metric=(x,y)=>x.completed&&y.completed?
  money(x.realizedNetUsd-y.realizedNetUsd):null;
 const same=s.originalComparison||{};
 const age=now-at;
 return {version:VERSION,sourceVersion:SOURCE,mode:'SHADOW_ONLY',
  brokerOrdersEnabled:false,decisionImpact:false,
  asOf:at,startedAt:start,observationCount:nn(s.observations),
  status:age>90000||age<0?'SOURCE_STALE':'DATA_RECENT',ageMs:age,
  branches:lanes,
  descriptiveDiff:{exitWithExactEntry:metric(b,a),
   exitWithFilteredEntry:metric(d,c),
   entryWithOriginalExit:metric(c,a),
   entryWithSupervisorExit:metric(d,b),
   interactionContrast:a.completed&&b.completed&&c.completed&&d.completed?
    money((d.realizedNetUsd-c.realizedNetUsd)-
      (b.realizedNetUsd-a.realizedNetUsd)):null,
   causalInterpretation:'NOT_A_PAIRED_BACKTEST'},
  realReference:{sourceAgeMs:num(same.sourceAgeMs),
   comparableAtSameStep:same.comparableAtSameStep===true,
   sameExposure:same.sameExposure===true,
   actualCompleted:nn(same.actualCompleted),
   shadowCompleted:nn(same.baselineCompleted),
   actualPosition:str(same.actualPosition,8),
   shadowPosition:str(same.shadowPosition,8)},
  influenceCount:nn(s.influenceCount),
  recentInfluence:(Array.isArray(s.recentInfluence)?s.recentInfluence:[])
   .slice(-8).reverse().map(influence),
  recentEvents:(Array.isArray(s.recentEvents)?s.recentEvents:[])
   .slice(-8).reverse().map(e=>({
    type:str(e?.type,54),ts:num(e?.ts),route:str(e?.route,80),
    direction:str(e?.direction||e?.newDirection,6),
    price:money(e?.exitPrice??e?.entryPrice??e?.price),
    netPnlUsd:money(e?.netPnlUsd),reason:str(e?.reason,120)})),
  note:'Four independent virtual portfolios. No trading authority. Results are not matching-trade causal estimates.'};
}
module.exports={VERSION,SOURCE,IDS,build};
