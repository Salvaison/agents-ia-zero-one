'use strict';
// One independent V552 structural opportunity interpreter (NO additional PM2).
// An opposed 15m close is NOT an entry permission. Price must be won and
// defended after the cross in a contested campaign. No minute TTL or USD cap.
const sign=d=>d==='long'?1:d==='short'?-1:0;
const direction=n=>n>0?'long':n<0?'short':null;
const safe=x=>Number.isFinite(Number(x))&&x!==null?Number(x):null;
const round=x=>Math.round(x*100)/100;
function closedCrosses(bars,asOf){
 const x=(bars||[]).filter(b=>b.ts+900000<=asOf&&
  safe(b.bw)!==null&&safe(b.lbw)!==null).sort((a,b)=>a.ts-b.ts);
 const all=[];
 for(let i=1;i<x.length;i++){
  const a=direction(x[i-1].lbw-x[i-1].bw);
  const b=direction(x[i].lbw-x[i].bw);
  if(a&&b&&a!==b)all.push({direction:b,previous:a,
   at:x[i].ts+900000,price:x[i].close,atBar:x[i].ts,
   nativeDirection:x[i].nativeUp!==null?'long':
    x[i].nativeDn!==null?'short':null});
 }
 return {crosses:all,bars:x};
}
function inspect(o,input,candidate,ep){
 const context=closedCrosses(input?.bars?.m15||[],o.at);
 const c=context.crosses,last=c.at(-1),previous=c.at(-2);
 const directionNow=candidate||o.mcb3.direction;
 const s=sign(directionNow);
 const phase={kind:'UNKNOWN',lastConfirmedCross:last||null,
  previousConfirmedCross:previous||null,
  priorPolarityRetained:null,
  crossDirectionAligned:last?.direction===directionNow,
  entryConfirmedSinceCross:false,
  priceAfterCross:null,
  crossPrice: last?.price||null,
  adverseAfterCross:false,postCrossReclaim:false,
  postCrossReclaimWithFlow:false,
  breakoutOfObserved1h:false,
  estimatedEpisodeMaturity:'UNKNOWN',
  reason:'STRUCTURAL_DATA_NOT_AVAILABLE',
  source:'ASOF_CLOSED_15M_BARS_PLUS_BATON_NO_FUTURE'};
 if(!last||!ep||!s)return phase;
 const lastPeriod=(input.bars.m15||[]).filter(b=>
  b.ts+900000<=o.at&&b.ts+900000>o.at-60*60000);
 const h=lastPeriod.length?Math.max(...lastPeriod.map(b=>b.high)):null,
   l=lastPeriod.length?Math.min(...lastPeriod.map(b=>b.low)):null;
 const breakout=directionNow==='long'?o.price>h:o.price<l;
 const known=(input.samples||[]).filter(r=>r.ts>=last.at&&r.ts<=o.at);
 // Since the 15m CLOSE, a counter-pulse then a recovery in the proposed
 // direction: a causal, defended resumption. Does not imply fixed minutes.
 let best=0,retraced=false,recovered=false,oppositeSeen=false;
 for(const v of known){
  const displacement=s*(v.lastPrice-last.price);
  if(displacement<0)oppositeSeen=true;
  if(best>0&&displacement<best)retraced=true;
  if((oppositeSeen||retraced)&&displacement>best)
   recovered=true;
  best=Math.max(best,displacement);
 }
 const flow15= s*o.mf.slope15,
  flow3=s*o.mf.slope3,
  flowLevel=s*o.mf.slow,
  livePM=s*o.pm.live,
  marginal=s*o.pm.p3;
 const crossProgress=s*(o.price-last.price);
 const heldPrice= crossProgress>0 && livePM>0 && marginal>0;
 const flowProves=(flow15>0&&flow3>0)||(flowLevel>0&&flow3>0);
 const priceEvidence= heldPrice&&(breakout||(recovered&&flowProves));
 const prevTranslation=previous?sign(previous.direction)*
  (last.price-previous.price):null;
 const disputed=previous!==undefined&&prevTranslation<=0;
 const deltaFromEpisode=s*(o.price-ep.crossPrice);
 const lastBars=context.bars.filter(b=>b.ts+900000<=o.at&&
  b.ts+900000>o.at-60*60000);
 const typicalRange=lastBars.length?lastBars.map(b=>b.high-b.low)
  .sort((a,b)=>a-b)[Math.floor((lastBars.length-1)/2)]:null;
 const exhausted=typicalRange!==null&&deltaFromEpisode>typicalRange&&
  !(recovered||breakout);
 phase.kind=disputed?'PREVIOUS_POLARITY_NOT_RETAINED':
  last.direction===directionNow?'CONFIRMED_MCB15_NEEDS_PRICE_TRANSLATION':
  'TACTICAL_OPPOSES_CONFIRMED_MCB15';
 phase.priorPolarityRetained=prevTranslation===null?null:prevTranslation>0;
 phase.priceAfterCross=round(crossProgress);
 phase.entryConfirmedSinceCross=priceEvidence;
 phase.adverseAfterCross=oppositeSeen||retraced;
 phase.postCrossReclaim=recovered;
 phase.postCrossReclaimWithFlow=recovered&&flowProves;
 phase.breakoutOfObserved1h=breakout;
 phase.estimatedEpisodeMaturity=exhausted?'TRAVEL_EXCEEDS_TYPICAL_15M_RANGE_WITHOUT_RECLAIM':'OBSERVED';
 phase.flow15=round(flow15);phase.flow3=round(flow3);
 phase.flowLevel=round(flowLevel);phase.pm=round(livePM);
 phase.marginalPrice=round(marginal);
 phase.episodeProgress=round(deltaFromEpisode);
 phase.observationsSinceCross=known.length;
 phase.reason=!phase.crossDirectionAligned?'CROSS15_CLOSED_NOT_IN_TACTIC_DIRECTION':
  !heldPrice?'NO_NEW_PRICE_TRANSLATION_AFTER_CROSS15':
  exhausted?'OLD_CROSS3_TRAVEL_NOT_REQUALIFIED':
  !priceEvidence?'CROSS15_TRANSFER_PRICE_NOT_YET_DEFENDED':
  'STRUCTURE_AND_PRICE_QUALIFIED';
 // Applies to an uncertain/recently failed polarity only; stable campaigns
 // can continue to use normal MCB3-first timing.
 const mfConflict=flowLevel<0||flow15<0;
 const mfAligned=flowLevel>0&&flow15>0;
 // When the previous 15m polarity FAILED to keep its territory, do not
 // immediately recycle its confirmed opposite as a new position.
 // Force an observed price re-acceptance, rather than a wall-clock delay.
 phase.entryPrudence=disputed||last.direction!==directionNow||exhausted;
 phase.mfConflict=mfConflict;
 phase.mfAligned=mfAligned;
 // Even outside repeated 15m crosses, a newly proposed position should
 // not fight BOTH the level and the trend of slow MF15.
 phase.slowMFUnambiguouslyOpposite=flowLevel<0&&flow15<0;
 phase.deferNewEntry=(phase.entryPrudence&&!priceEvidence)||
  (phase.entryPrudence&&!mfAligned)||exhausted||
  phase.slowMFUnambiguouslyOpposite;
 if(phase.deferNewEntry){
  phase.reason=exhausted?'OLD_CROSS3_TRAVEL_NOT_REQUALIFIED':
   !mfAligned||phase.slowMFUnambiguouslyOpposite?'MF15_LEVEL_OR_SLOPE_OPPOSES_NEW_ADMISSION':
   !priceEvidence?'POST_CROSS15_PRICE_NOT_YET_DEFENDED':
   phase.reason;
 }
 return phase;
}
module.exports={closedCrosses,inspect};
