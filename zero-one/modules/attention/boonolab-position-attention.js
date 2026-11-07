'use strict';
// BOONOLAB V0.1 — counter-offensive threat, OBSERVATION ONLY.
// Does not send an EXIT, cannot change PAPER state or simulate guaranteed fills.
const VERSION='boonolab-position-attention-v0.1';
const M=60000,NOTIONAL_DEFAULT=1500,FEE=.0005;
const n=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const round=(x,p=3)=>n(x)===null?null:Math.round(x*10**p)/10**p;
const med=q=>{const a=q.filter(x=>n(x)!==null).sort((a,b)=>a-b);
 return a.length?a[Math.floor(a.length/2)]:null;};
function priceAtOrBefore(rows,ts){
 return rows.filter(x=>x.ts<=ts).at(-1)||null;
}
function netIfClosed(pos,price){
 if(!pos||n(price)===null||n(pos.entryPrice)===null)return null;
 const N=n(pos.notionalUsd)||NOTIONAL_DEFAULT,sgn=pos.direction==='long'?1:-1;
 const gross=(price-pos.entryPrice)*sgn*N/pos.entryPrice;
 const fees=N*FEE+N*(price/pos.entryPrice)*FEE;
 return round(gross-fees,4);
}
function probe({position,audit,asOf,analysis=null,regime=null}={}){
 if(!position||!['short','long'].includes(position.direction)||
   n(position.entryAt)===null||n(asOf)===null)
  return {valid:false,status:'NO_POSITION'};
 const all=(audit||[]).filter(x=>n(x.ts)!==null&&n(x.lastPrice)!==null&&
    x.ts<=asOf&&x.ts>=position.entryAt-60*M).sort((a,b)=>a.ts-b.ts);
 const q=all.filter(x=>x.ts>=position.entryAt);
 if(q.length<3||asOf-q.at(-1).ts>90000)
  return {valid:false,status:'SOURCE_COVERAGE_INSUFFICIENT'};
 const sign=position.direction==='long'?1:-1,entry=position.entryPrice;
 const best=q.reduce((prev,x)=>sign*(x.lastPrice-entry)>
   sign*(prev.lastPrice-entry)?x:prev);
 const favourable=Math.max(0,sign*(best.lastPrice-entry));
 const current=q.at(-1),adverse=Math.max(0,
  -sign*(current.lastPrice-best.lastPrice));
 const agePeak=current.ts-best.ts,prior60=priceAtOrBefore(q,current.ts-M);
 const adverse60=prior60?Math.max(0,
  -sign*(current.lastPrice-prior60.lastPrice)):null;
 const oneMinMoves=[];
 for(const [i,p] of all.entries()){
  const b=priceAtOrBefore(all.slice(0,i),p.ts-M);
  if(b&&p.ts-b.ts<=90000)oneMinMoves.push(Math.abs(p.lastPrice-b.lastPrice));
 }
 const p75Moves=oneMinMoves.length>=20?
  oneMinMoves.slice().sort((a,b)=>a-b)[Math.floor((oneMinMoves.length-1)*.75)]:null;
 const flowsBefore=all.filter(x=>x.ts>=current.ts-15*M&&x.ts<=current.ts-2*M&&
   n(x.volumeFenetreBtc)!==null&&n(x.winSec)>0)
  .map(x=>x.volumeFenetreBtc/x.winSec);
 const flowsNow=all.filter(x=>x.ts>current.ts-90*1000&&n(x.volumeFenetreBtc)!==null&&n(x.winSec)>0)
  .map(x=>x.volumeFenetreBtc/x.winSec);
 const flowRelative=med(flowsBefore)>0?med(flowsNow)/med(flowsBefore):null;
 const breakEvenMove=entry*2*FEE;
 const fromPeakFraction=favourable>0?adverse/favourable:null;
 const mature=favourable>3*breakEvenMove;
 // Descriptive hypotheses only: a material fraction of a mature impulse,
 // combined with an economically relevant 60s counter-price move.
 const material=mature&&fromPeakFraction>=.15&&
  n(adverse60)!==null&&adverse60>=breakEvenMove;
 const followUp=material&&n(flowRelative)!==null&&flowRelative>=1;
 const cv=analysis?.readings?.conversion||{};
 const mf3=n(cv.mf3Delta3m),mf15=n(cv.mf15Delta10m),
  pm3=n(cv.pm3),pm5=n(cv.pm5),pmLive=n(cv.pmCombined);
 const momentumAdverse=[pm3,pm5,pmLive].filter(n0=>n(n0)!==null)
  .filter(x=>sign*x<0).length;
 const mfAdverse=mf3!==null&&mf15!==null&&sign*mf3<0&&sign*mf15<0;
 const status=followUp?'COUNTERATTACK_WITH_AGGRESSIVE_FLOW':
  material?'MATERIAL_COUNTERATTACK':
  mature&&adverse>breakEvenMove?'WATCH_GIVEBACK':
  mature?'MATURE_IMPULSE':'OBSERVING';
 return {version:VERSION,valid:true,asOf:current.ts,source:'AUDIT_30S_AND_OPTIONAL_V543_READINGS',
  status,positionEntryAt:position.entryAt,direction:position.direction,
  campaignId:position.campaignId||null,entryPrice:entry,
  price:round(current.lastPrice,2),bestObservedPrice:round(best.lastPrice,2),
  bestObservedAt:best.ts,peakAgeSec:round(agePeak/1000,1),
  favourableObservedUsd:round(favourable,2),adverseSincePeakUsd:round(adverse,2),
  adverse60sUsd:round(adverse60,2),
  fractionGivenBack:round(fromPeakFraction,4),
  p75Absolute60sBtc:round(p75Moves,2),
  flowNowBtcPerSec:round(med(flowsNow),4),
  flowPrevBtcPerSec:round(med(flowsBefore),4),
  flowRelative:round(flowRelative,3),
  feeBreakEvenPriceMoveUsd:round(breakEvenMove,2),
  netIfClosedOnObservedPriceUsd:netIfClosed(position,current.lastPrice),
  fullObservationSinceEntry:q[0].ts<=position.entryAt+90000,
  pm:{asOf:n(analysis?.asOf),pm3,pm5,pmLive,mf3Delta:mf3,mf15Delta:mf15,
   adverseCount:momentumAdverse,mfAdverse},
  regimeAtEvent:regime?.label||'UNKNOWN',
  decisionImpact:false,brokerOrdersEnabled:false,
  caveat:'A signal to EXAMINE protecting a position, NOT a trading EXIT. Thresholds are exploratory; no slippage/fill modeled.'};
}
function initial(){return {version:VERSION,mode:'SHADOW_ONLY',
 brokerOrdersEnabled:false,decisionImpact:false,lastAt:0,
 current:null,session:null,recentClosed:[],lastEvent:null,episodeCount:0};}
function observe(s,{position,audit,asOf,analysis,regime,paperHistory=[]}={}){
 if(!s||s.version!==VERSION||s.decisionImpact!==false||
   s.brokerOrdersEnabled!==false)throw Error('POSITION_ATTENTION_UNTRUSTED_STATE');
 if(!Number.isFinite(asOf)||asOf<=s.lastAt)return {state:s,events:[],changed:false};
 const events=[];s.lastAt=asOf;
 if(!position){
  if(s.session){
   const prior=s.session;
   const actual=paperHistory.find(x=>x.entryAt===prior.entryAt);
   const result={entryAt:prior.entryAt,direction:prior.direction,
    firstAttention:prior.firstAttention||null,lastSeenAt:prior.lastSeenAt,
    actualExitAt:actual?.exitAt||null,actualNetUsd:actual?.netPnlUsd??null,
    hypotheticalDifferenceUsd:actual&&prior.firstAttention?
       round(prior.firstAttention.netIfClosedOnObservedPriceUsd-
       actual.netPnlUsd,4):null,
    warning:'Single-position hypothetical; does NOT simulate exits/reentries or execution.'};
   s.recentClosed.unshift(result);s.recentClosed=s.recentClosed.slice(0,24);
   events.push({type:'POSITION_CLOSED_OBSERVED',at:asOf,family:'CONTEXT',
     key:'POSITION_CLOSED',value:result,positionEntryAt:prior.entryAt});
  }
  s.session=null;s.current=null;
  return {state:s,events,changed:true};
 }
 const key=String(position.entryAt)+'|'+position.direction;
 if(!s.session||s.session.key!==key){
  s.session={key,entryAt:position.entryAt,direction:position.direction,
   firstAttention:null,lastStatus:null,lastSeenAt:asOf};
  events.push({type:'POSITION_OBSERVED',at:asOf,family:'CONTEXT',
    key:'POSITION_MONITORING',positionEntryAt:position.entryAt,
    source:'PAPER_POSITION_OBSERVED_AT_SHADOW_START_OR_ENTRY'});
 }
 const v=probe({position,audit,asOf,analysis,regime});s.current=v;
 s.session.lastSeenAt=asOf;
 if(v.valid&&v.status!==s.session.lastStatus){
  // Never backdate the alert: it becomes known when this observer reads it.
  s.session.lastStatus=v.status;
  if(['MATERIAL_COUNTERATTACK','COUNTERATTACK_WITH_AGGRESSIVE_FLOW'].includes(v.status)&&
    !s.session.firstAttention){
   s.session.firstAttention={at:asOf,status:v.status,price:v.price,
    bestObservedAt:v.bestObservedAt,adverse60sUsd:v.adverse60sUsd,
    fractionGivenBack:v.fractionGivenBack,
    netIfClosedOnObservedPriceUsd:v.netIfClosedOnObservedPriceUsd};
   s.episodeCount++;
  }
  events.push({type:'POSITION_THREAT_CHANGE',at:asOf,family:'CONTEXT',
   key:v.status,positionEntryAt:position.entryAt,
   value:{status:v.status,price:v.price,bestPrice:v.bestObservedPrice,
    peakAt:v.bestObservedAt,adverse60sUsd:v.adverse60sUsd,
    fractionGivenBack:v.fractionGivenBack,flowRelative:v.flowRelative,
    shadowNetIfExitUsd:v.netIfClosedOnObservedPriceUsd,
    regime:v.regimeAtEvent},decisionImpact:false});
 }
 s.lastEvent=events.at(-1)||s.lastEvent;
 return {state:s,events,changed:true};
}
module.exports={VERSION,initial,probe,observe,netIfClosed};
