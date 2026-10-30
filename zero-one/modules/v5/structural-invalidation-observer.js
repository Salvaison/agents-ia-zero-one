'use strict';
// BOONO Systems — v0.1 experimental STRUCTURAL INVALIDATION OBSERVER.
// This module never sends orders. A PAPER promotion requires a distinct reviewed
// policy, causal replays and explicit versioned release.
const MIN=60000,THREE=3*MIN;
const n=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
const round=x=>Math.round(x*10)/10;
const dir=x=>x==='long'?1:x==='short'?-1:0;
const median=xs=>{
 const a=xs.filter(Number.isFinite).sort((a,b)=>a-b);
 return a.length?a[Math.floor(a.length/2)]:null;
};
function inspect({position,now,price,bars3=[],conversion={},tickFresh=true}={}){
 const p=position||{},d=dir(p.direction),entry=n(p.entryPrice);
 const inv=n(p.invalidationPrice),at=n(now),px=n(price);
 if(!d||entry===null||inv===null||at===null||px===null||entry<=0||
   !Number.isFinite(Number(p.entryAt))||d*(entry-inv)<=0)
  return {status:'UNKNOWN',exitRequested:false,reason:'NO_VALID_ENTRY_INVALIDATION'};
 const closed=(bars3||[]).filter(b=>{
  const ts=n(b.ts);return ts!==null&&ts+THREE<=at&&
   n(b.close)!==null&&n(b.high)!==null&&n(b.low)!==null;
 });
 const r3=median(closed.slice(-24).map(b=>n(b.high)-n(b.low)))||60;
 const buffer=Math.max(12,0.14*r3);
 const breach=Math.max(0,-d*(px-inv));
 const post=closed.filter(b=>b.ts+THREE>p.entryAt);
 const last=post.at(-1)||null;
 const closeBreach=last?Math.max(0,-d*(last.close-inv)):0;
 const mf3=n(conversion.mf3Delta3m??conversion.mf3Change),
  mf15=n(conversion.mf15Delta10m??conversion.mf15Change),
  pm3=n(conversion.pm3),pm5=n(conversion.pm5),
  pmLive=n(conversion.pmCombined??conversion.pmLive);
 // Price and PM belong to the same evidence family; MF independent.
 const adversePrice=!!(pm3!==null&&pmLive!==null&&
   d*pm3<0&&d*pmLive<0);
 const adverseSlow=!!(mf15!==null&&d*mf15<-.15);
 const adverseFast=!!(mf3!==null&&d*mf3<-.15);
 const oneClose=!!(last&&closeBreach>=buffer&&
   at-(last.ts+THREE)<=2*THREE);
 // Never use a confirmed candle that was not available when evaluated.
 const confirmedLoss=breach>=buffer&&oneClose&&
   (adversePrice||adverseFast);
 // Sharp extension with independent FLOW evidence can outrun 3m closes.
 const urgentLoss=breach>=Math.max(50,r3*.7)&&
   adversePrice&&adverseFast;
 const requested=!!(tickFresh&&(confirmedLoss||urgentLoss));
 return {version:'structural-invalidation-observer-v0.1',
  status:requested?'LOSS_PROVEN_FOR_POSITION':breach>0?
   'INITIAL_INVALIDATION_CONTESTED':'INITIAL_INVALIDATION_INTACT',
  exitRequested:requested,
  reason:requested?urgentLoss?'FAST_PRICE_MF_TRANSFER_BEYOND_INVALIDATION':
    'ONE_CONFIRMED_3M_LOSS_PLUS_ADVERSE_TRANSLATION':
    breach>0?'WATCH_INITIAL_INVALIDATION':'NO_BREACH',
  invalidationPrice:inv,breachUsd:round(breach),bufferUsd:round(buffer),
  medianRange3mUsd:round(r3),lastConfirmed3mAt:last?last.ts+THREE:null,
  confirmedCloseBreachUsd:round(closeBreach),oneClose,
  conversion:{adversePrice,adverseFastMF:adverseFast,adverseSlowMF:adverseSlow},
  gateSemantics:'ONE 3M CONFIRMED LOSS with corroboration OR material urgent adverse MF/price; no E15 opposition or double 3m close'};
}
module.exports={inspect};