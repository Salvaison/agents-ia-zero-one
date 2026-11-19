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
 // MF is DESCRIPTIVE, even when at a contrarian level: its slope can
 // precede an MCB reversal. Price and MCB, not MF, qualify structure.
 const priceEvidence=heldPrice&&(breakout||recovered);
 const flowProves=(flow15>0&&flow3>0)||(flowLevel>0&&flow3>0);
 // flowProves is retained for EXPLANATION ONLY; not used in priceEvidence.
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
 // MF15 is measured for diagnostic interpretation, not an admission gate.
 // The same MCB/price/PM evidence must produce the SAME action if MF differs.
 const mfConflict=flowLevel<0||flow15<0;
 const mfAligned=flowLevel>0&&flow15>0;
 phase.mfConflict=mfConflict;
 phase.mfAligned=mfAligned;
 phase.mfReading=flowLevel<0&&flow15>0?'MF15_SLOPE_LEADS_AGAINST_LEVEL':
  flowLevel>0&&flow15<0?'MF15_SLOPE_WARNINGS_BEFORE_LEVEL_CROSS':
  mfAligned?'MF15_COMPATIBLE':'MF15_CONTRARIAN_OR_UNCERTAIN';
 // In contested 15m polarity, the last crossing must have produced more
 // price movement than the *real PAPER round-trip fee break-even*.
 // This is an economic observation, NOT an empirical 18/25min gate.
 const feeBreakevenMove=o.price*0.001; // two 0.05% taker fees
 const economicallyTranslated=crossProgress>feeBreakevenMove;
 const structuralChain=o.mcb3.direction===directionNow&&
   ((o.mcb15.direction===directionNow)||
    (s*o.mcb15.slope3>0&&s*o.mcb15.gapSlope3>0));
 const progressiveFromCross3=Number.isFinite(ep.crossPrice)&&
  s*(o.price-ep.crossPrice)>0;
 const transitionProved=priceEvidence&&economicallyTranslated&&
  structuralChain&&progressiveFromCross3;
 phase.feeBreakevenPriceMove=round(feeBreakevenMove);
 phase.economicallyTranslated=economicallyTranslated;
 phase.structuralChain=structuralChain;
 phase.progressiveFromCross3=progressiveFromCross3;
 phase.transitionProved=transitionProved;
 phase.entryPrudence=disputed||last.direction!==directionNow||exhausted;
 phase.slowMFUnambiguouslyOpposite=flowLevel<0&&flow15<0; // descriptive only
 phase.deferNewEntry=exhausted||
  (phase.entryPrudence&&!transitionProved);
 if(phase.deferNewEntry){
  phase.reason=exhausted?'OLD_CROSS3_TRAVEL_NOT_REQUALIFIED':
   !priceEvidence?'POST_CROSS15_PRICE_NOT_YET_DEFENDED':
   !economicallyTranslated?'PRICE_MOVE_DOES_NOT_YET_COVER_TAKER_FEES':
   !structuralChain?'MCB3_MCB15_WAVE_NOT_YET_ALIGNED':
   !progressiveFromCross3?'CROSS3_PRICE_NOT_YET_TRANSLATED':
   'STRUCTURAL_TRANSFER_PRICE_NOT_YET_ACCEPTED';
 }else if(phase.entryPrudence){
  phase.reason='MCB_PRICE_CONVERSION_TERRITORY_ACCEPTED_MF_OBSERVATIONAL';
 }
 return phase;
}
module.exports={closedCrosses,inspect};
