'use strict';
// BOONO Systems — Causal life-cycle of a PRICE offensive, read at actual as-of.
// Shared across CONTINUATION, REVERSAL_FORMING and TACTICAL_RESPIRATION.
// This layer is an admission QUALIFICATION only; it cannot touch an open
// position, invent future price pivots, or turn WHERE into a directional veto.
const VERSION='v543-offensive-maturity-v1';
const THREE=180000,HOUR=3600000;
const n=v=>v===null||v===undefined||v===''?null:
 Number.isFinite(Number(v))?Number(v):null;
const r=v=>n(v)===null?null:Math.round(Number(v)*100)/100;
const side=d=>d==='long'?1:d==='short'?-1:0;
const median=a=>{const xs=a.filter(x=>Number.isFinite(x)).sort((x,y)=>x-y);return xs.length?xs[Math.floor(xs.length/2)]:null;};
function confirmed3(input,now){
 return (input.bars3||[]).filter(b=>n(b.ts)!==null&&b.ts+THREE<=now&&
  n(b.high)!==null&&n(b.low)!==null&&n(b.close)!==null).sort((a,b)=>a.ts-b.ts);
}
function priceOrigin(rows,candidate,now,minutes){
 const since=now-minutes*60000;
 const bs=rows.filter(b=>b.ts+THREE>=since&&b.ts+THREE<=now);
 if(bs.length<Math.floor(minutes/3*.65))return null;
 const d=side(candidate);
 const origin=d===1?bs.reduce((a,b)=>!a||b.low<a.low?b:a,null):
  bs.reduce((a,b)=>!a||b.high>a.high?b:a,null);
 const high=Math.max(...bs.map(b=>b.high)),low=Math.min(...bs.map(b=>b.low));
 return {sourceTs:origin.ts,availableAt:origin.ts+THREE,
  originPrice:r(d===1?origin.low:origin.high),
  high:r(high),low:r(low),ageMinutes:r((now-origin.ts-THREE)/60000),
  pricePositionInRange:null,barCount:bs.length,windowMinutes:minutes};
}
function evaluate({decision,input}={}){
 const d=decision||{},s=d.readings?.structural54||{},conv=d.readings?.conversion||{};
 const now=n(d.asOf),price=n(d.price),candidate=d.candidate,sgn=side(candidate);
 const phase=d.phase||null;
 const base={version:VERSION,asOf:now,phase,candidate,
  authority:'ADMISSION_ONLY_NO_EXIT_OR_CAMPAIGN_DIRECTION_CHANGE',
  classification:'UNKNOWN',deferNewEntry:false,sourceQuality:'UNKNOWN',
  requalification:'NEW_PRICE_EFFICIENCY_OR_TRUE_NEW_LBW15_CONFIRMATION',
  context:{},evidence:[],brokerOrdersEnabled:false};
 if(!sgn||now===null||price===null||!s.available||!s.structuralOrigin||
   !Array.isArray(input?.bars3))return {...base,reason:'MISSING_CAUSAL_OBSERVATIONS'};
 const rows=confirmed3(input,now);
 const o2=priceOrigin(rows,candidate,now,120);
 const o4=priceOrigin(rows,candidate,now,240);
 const ranges=rows.slice(-30).map(x=>x.high-x.low).filter(x=>x>0);
 const typical3=median(ranges),typical15=n(s.price15mMedianRange);
 const origin4=o4?{...o4,progressUsd:r(sgn*(price-o4.originPrice)),
  progressVs15mRange:typical15>0?r(sgn*(price-o4.originPrice)/typical15):null}:null;
 const origin2=o2?{...o2,progressUsd:r(sgn*(price-o2.originPrice)),
  progressVs15mRange:typical15>0?r(sgn*(price-o2.originPrice)/typical15):null}:null;
 const cross=s.mcb3?.cross||d.readings?.geometry?.cross3||null;
 // The FULL offensive origin predates some tactical crosses. A fresh E3 does
 // not reset the age of this underlying price advance.
 const chain={origin4h:origin4,origin2h:origin2,
  tacticalCrossObservedAt:n(cross?.ts),
  crossLevel:n(cross?.level),
  observedPriceAtEntry:r(price),
  nativeE15ObservedAt:n(s.nativeE15?.live?.observedAt)||
   n(s.nativeE15?.confirmed?.availableAt),
  nativeE3ObservedAt:n(s.nativeE3?.confirmed?.availableAt)||
   n(s.nativeE3?.live?.observedAt),
  defendedPriceAt:n(s.testedTerritory?.availableAt),
  defendedPriceLevel:n(s.testedTerritory?.level),
  ma15Polarity:d.readings?.maContract?.ma15?.polarityMemory?.polarity||null};
 // A very fresh 3m cross does NOT reset price origin or a prior E15 crest.
 const refs=[s.structuralOrigin,s.previousStructuralPivot].filter(Boolean);
 const type=sgn===1?'CRETE':'CREUX';
 const previousOppositeExtreme=refs
  .filter(a=>a.type===type&&n(a.price)!==null&&n(a.lbw)!==null&&
   n(a.sourceTs)!==null&&n(a.availableAt)!==null&&a.availableAt<=now)
  .sort((a,b)=>b.availableAt-a.availableAt)[0]||null;
 const polarityChange=n(d.readings?.maContract?.ma15?.polarityMemory?.polarityChangedAt);
 const samePolarity=!!(previousOppositeExtreme&&
  (polarityChange===null||previousOppositeExtreme.sourceTs>=polarityChange));
 const lbwNow=n(s.currentLbw15),lbwAnchor=n(previousOppositeExtreme?.lbw);
 const priceBeyond=!!(previousOppositeExtreme&&sgn*(price-previousOppositeExtreme.price)>0);
 const oscillatorLessExtreme=!!(lbwNow!==null&&lbwAnchor!==null&&
  sgn*(lbwNow-lbwAnchor)<0);
 const opposingOscillatorDivergence=!!(samePolarity&&priceBeyond&&oscillatorLessExtreme);
 // This is an in-formation contrast, never a confirmed future pivot.
 const oscillator={referenceType:type,referenceSourceAt:previousOppositeExtreme?.sourceTs||null,
  referenceAvailableAt:previousOppositeExtreme?.availableAt||null,
  referencePrice:r(previousOppositeExtreme?.price),
  referenceLbw:r(lbwAnchor),observedLbw15:r(lbwNow),
  priceBeyondReferenceUsd:previousOppositeExtreme?
   r(sgn*(price-previousOppositeExtreme.price)):null,
  lbwUnderReference:previousOppositeExtreme&&lbwNow!==null?
   r(sgn*(lbwNow-lbwAnchor)):null,
  same15mPolarityRegime:samePolarity,
  oppositeDivergenceForming:opposingOscillatorDivergence,
  source:'CONFIRMED_GEOMETRIC_E15_ANCHOR_PLUS_CURRENT_OBSERVED_LBW15_PRICE'};
 const pm3=n(conv.pm3),pm5=n(conv.pm5),pmLive=n(conv.pmCombined),
  sinceBaton=n(conv.pmSinceBaton);
 const dirs={pm3:pm3===null?null:r(sgn*pm3),
  pm5:pm5===null?null:r(sgn*pm5),
  pmLive:pmLive===null?null:r(sgn*pmLive),
  sinceBaton:sinceBaton===null?null:r(sgn*sinceBaton)};
 const aggregateProductive=dirs.pm3!==null&&dirs.pm5!==null&&
  dirs.pm3>0&&dirs.pm5>0;
 const marginalAdverse=dirs.sinceBaton!==null&&dirs.sinceBaton<0;
 const marginalLagging=dirs.pmLive!==null&&aggregateProductive&&
  dirs.pmLive<Math.min(dirs.pm3,dirs.pm5);
 const conversion={directional:dirs,aggregateProductive,
  marginalAdverse,marginalLagging,
  conversionFatigue:aggregateProductive&&marginalAdverse&&marginalLagging,
  source:'SAME_ASOF_PM3_PM5_PM_LIVE_PM_SINCE_BATON'};
 const rank=n(s.priceRangeRank),o120=s.origins?.m120||null;
 // The price must be at its 2h directional outside edge AND close to the
 // *observed* high/low within half a typical confirmed 3m candle range.
 // No arbitrary fixed $250/$325 expiry and no WHERE veto.
 const recentExtreme=sgn===1?n(o120?.high):n(o120?.low);
 const distanceToExtreme=recentExtreme===null?null:r(sgn*(recentExtreme-price));
 const near2hExtreme=!!(o120&&rank!==null&&rank>=.9&&typical3!==null&&
  distanceToExtreme!==null&&distanceToExtreme<=typical3/2);
 const priceGeometry={rank2h:rank,priceAt2hExtreme:near2hExtreme,
  extreme2hPrice:recentExtreme,distanceToExtremeUsd:distanceToExtreme,
  typicalConfirmed3mRangeUsd:r(typical3),
  typicalConfirmed15mRangeUsd:typical15,
  source:'CONFIRMED_3M_TWO_HOUR_EXTREME_NO_FUTURE'};
 const evidence=[
  {family:'PRICE',observed:near2hExtreme,
   detail:'Near directional 2h price edge, independent of fresh E3 age'},
  {family:'MCB15',observed:opposingOscillatorDivergence,
   detail:'Price makes a fresh directional extreme but confirmed E15 reference LBW exceeds current LBW, same MA15 polarity regime'},
  {family:'CONVERSION',observed:conversion.conversionFatigue,
   detail:'PM3/PM5 still positive but PM Live lags and post-Bâton PRICE movement contradicts them'}
 ];
 const complete=!!(o2&&o4&&cross&&n(cross.ts)!==null&&
  n(cross.ts)<=now&&lbwNow!==null&&typical3!==null&&rank!==null&&
  pm3!==null&&pm5!==null&&pmLive!==null&&sinceBaton!==null);
 const lateConfirmation=complete&&evidence.every(e=>e.observed);
 const classification=!complete?'INSUFFICIENT_CAUSAL_EVIDENCE':
  lateConfirmation?'LATE_OFFENSIVE_CONFIRMATION':
  near2hExtreme&&aggregateProductive?'EDGE_BUT_CONVERSION_NOT_PROVEN_EXHAUSTED':
  'NO_MULTI_FAMILY_MATURITY_CONFLICT';
 return {...base,sourceQuality:complete?'CAUSAL_ASOF_COMPLETE':'PARTIAL',
  classification,deferNewEntry:!!lateConfirmation,
  reason:lateConfirmation?'PRICE_EDGE_WITH_MCB15_OPPOSITE_LBW_AND_MARGINAL_PM_DECAY':
   'NO_COMPLETE_THREE_FAMILY_LATE_OFFENSIVE_PROOF',
  context:{priceOrigin:chain,oscillator,conversion,priceGeometry},
  evidence,requalification:'RECOVERED_POST_BATON_PRICE_CONVERSION_OR_NEW_LBW15_SUPPORT',
  sameDirectionMaturityAcrossPhases:true,
  note:'Offensive price history outlives fresh E3 crosses. Temporary wait, not a terminal expiry; each later as-of snapshot requalifies when independent evidence returns.'};
}
module.exports={VERSION,evaluate};
