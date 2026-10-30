'use strict';
// BOONOLAB: display-only Fibonacci context. No broker, no entry, no stop,
// no migration of existing level values. Sources are manual anchors / confirmed
// campaign extremes; neither on its own demonstrates a defended price level.
const VERSION='fib-context-observation-v0.1';
const RATIOS=Object.freeze([0,.382,.618,.65,1]);
const num=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
const round=x=>Math.round(x*10)/10;
const signed=(level,price)=>({
 price:round(level),distanceUsd:round(level-price),
 distanceAbsUsd:round(Math.abs(level-price)),
 location:level>price?'ABOVE':level<price?'BELOW':'AT_PRICE'
});
function mapped({levels=[],price}={}){
 const px=num(price);
 if(px===null||px<=0)return {available:false,groups:[],nearest:null,reason:'NO_PRICE'};
 const groups=new Map();
 for(const level of Array.isArray(levels)?levels:[]){
  const k=level?.token, gid=level?.groupId, value=num(level?.price);
  if(!['fib0','fib1'].includes(k)||gid===null||gid===undefined||
     value===null||value<=0)continue;
  if(!groups.has(String(gid)))groups.set(String(gid),{groupId:String(gid),
   anchored:{},times:{}});
  const g=groups.get(String(gid));
  g.anchored[k]=value;g.times[k]=level.time||null;
 }
 const valid=[];
 for(const g of groups.values()){
  const a=g.anchored.fib0,b=g.anchored.fib1;
  if(!Number.isFinite(a)||!Number.isFinite(b)||a===b)continue;
  const levels=RATIOS.map(ratio=>({
   ratio,...signed(a+(b-a)*ratio,px),groupId:g.groupId,
   source:'MANUAL_FIB0_FIB1',
   authority:'READ_ONLY_CONTEXT'
  }));
  valid.push({groupId:g.groupId,fib0:a,fib1:b,
   orientation:b>a?'ASCENDING':'DESCENDING',
   localTimesOnly:g.times,anchoredAsOf:null,levels,
   note:'HH:MM source is insufficient for a dated/confirmed price pivot'});
 }
 const all=valid.flatMap(g=>g.levels);
 all.sort((a,b)=>a.distanceAbsUsd-b.distanceAbsUsd||
  a.groupId.localeCompare(b.groupId));
 valid.sort((a,b)=>Number(a.groupId)-Number(b.groupId));
 return {version:VERSION,available:!!valid.length,groups:valid,
  nearest:all[0]||null,asOf:null,price:round(px),
  note:'All ratios are derived, not stored levels; manual group age is unknown'};
}
function campaign({price,structural54={},now}={}){
 const px=num(price),ts=num(now),story=structural54||{};
 const d=story.director,pivot=story.structuralOrigin||{},
  range=story.origins?.m120||null;
 if(px===null||px<=0||ts===null||!['long','short'].includes(d)||
  !range||pivot.type!==(d==='long'?'CREUX':'CRETE'))
  return {available:false,reason:'NO_CONFIRMED_CAMPAIGN_PIVOT_OR_2H_RANGE'};
 const origin=num(pivot.price),originAt=num(pivot.availableAt),
  extreme=d==='long'?num(range.high):num(range.low),
  extremeAt=d==='long'?num(range.highAvailableAt):num(range.lowAvailableAt);
 if(origin===null||originAt===null||extreme===null||extremeAt===null||
  originAt>ts||extremeAt>ts||extremeAt<originAt||
  (d==='long'?extreme<=origin:extreme>=origin)){
  return {available:false,reason:'EXTREME_NOT_AFTER_CAUSAL_PARENT_OR_NOT_DIRECTIONAL'};
 }
 const length=Math.abs(extreme-origin);
 const progress=origin+(extreme-origin)*.382;
 const retracement=extreme+(origin-extreme)*.382;
 return {version:VERSION,available:true,direction:d,
  originPrice:round(origin),originType:pivot.type,
  originSourceTs:num(pivot.sourceTs),originConfirmedAt:originAt,
  extremePrice:round(extreme),extremeConfirmedAt:extremeAt,
  amplitudeUsd:round(length),availableAt:Math.max(originAt,extremeAt),
  progressFromOrigin382:{...signed(progress,px),ratio:.382},
  retracementFromExtreme382:{...signed(retracement,px),ratio:.382},
  source:'MCB15_GEOMETRIC_PARENT_PLUS_CONFIRMED_3M_2H_EXTREME',
  role:'READ_ONLY_PRICE_CONTEXT',
  note:'Two conventions for 0.382 are different. Rolling 2h extreme can change; not a fixed swing pair or stop.'};
}
function evaluate({levels=[],price,structural54=null,now}={}){
 return {version:VERSION,brokerOrdersEnabled:false,decisionImpact:false,
  mapped:mapped({levels,price}),campaign:campaign({price,structural54,now})};
}
module.exports={VERSION,RATIOS,mapped,campaign,evaluate};
