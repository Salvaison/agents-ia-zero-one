'use strict';
// BOONO Systems V543 PAPER-INDEPENDENT experimental observer.
// A lost causal entry invalidation AND observed opposite force are required.
// It never places orders and does not imply a new E15 strategic campaign.
const base=require('./structural-invalidation-observer');
const VERSION='v543-structural-level-transfer-v0.1';
const n=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
function inspect({position,now,price,bars3=[],conversion={},positionReview=null,
  tickFresh=true}={}){
 const level=base.inspect({position,now,price,bars3,conversion,tickFresh});
 const b=n(level.breachUsd),buffer=n(level.bufferUsd),range=n(level.medianRange3mUsd);
 const valid=level.status!=='UNKNOWN'&&b!==null&&buffer!==null&&range!==null;
 const c=level.conversion||{};
 // PM3/PM Live and price form ONE market-translation family; MF is separate.
 const pmAndFastMf=c.adversePrice===true&&c.adverseFastMF===true;
 // Independent defended opposing price plus two adverse MF windows is a
 // second, slower way to demonstrate transfer even when PM has faded.
 const defendedPriceAndMf=positionReview?.defendedOpposition===true&&
  c.adverseFastMF===true&&c.adverseSlowMF===true;
 const transferObserved=pmAndFastMf||defendedPriceAndMf;
 // The inherited buffer is max(12, 0.14*median3). Use only post-entry
 // CONFIRMED 3m candles available as-of now (enforced by base.inspect).
 const confirmedLoss=valid&&level.oneClose===true&&b>=buffer;
 // Severe price loss with independently adverse PM+MF may act before close.
 // The materiality threshold is inherited from the current shadow observer.
 const urgentLoss=valid&&b>=Math.max(50,.7*range)&&pmAndFastMf;
 const provenLoss=!!(confirmedLoss||urgentLoss);
 const exitRequested=!!(tickFresh&&valid&&provenLoss&&transferObserved);
 const reason=exitRequested?
   urgentLoss&&!confirmedLoss?
    'FAST_STRUCTURAL_LEVEL_LOSS_AND_OBSERVED_TRANSFER':
    'CONFIRMED_STRUCTURAL_LEVEL_LOSS_AND_OBSERVED_TRANSFER':
   !valid?'INVALID_OR_UNAVAILABLE_CAUSAL_LEVEL':
   b===0?'ENTRY_STRUCTURE_INTACT':
   !provenLoss?'LEVEL_CONTESTED_AWAIT_PROVEN_LOSS':
   'LEVEL_LOST_AWAIT_CORROBORATED_TRANSFER';
 return {version:VERSION,status:exitRequested?'LOSS_AND_TRANSFER_CONFIRMED':
   !valid?'UNKNOWN':b===0?'ENTRY_STRUCTURE_INTACT':
   !provenLoss?'LEVEL_CONTESTED':'AWAIT_TRANSFER',
  reason,exitRequested,entryInvalidation:n(position?.invalidationPrice),
  invalidationReference:position?.invalidationReference||null,
  breachUsd:b,bufferUsd:buffer,medianRange3mUsd:range,
  lastConfirmed3mAt:level.lastConfirmed3mAt??null,
  confirmedCloseBreachUsd:level.confirmedCloseBreachUsd??null,
  levelLoss:{confirmedLoss,urgentLoss,provenLoss,oneClose:level.oneClose===true},
  transfer:{observed:transferObserved,pmAndFastMf,defendedPriceAndMf,
   priceDefendedByOpposition:positionReview?.defendedOpposition===true,
   adversePM3AndLive:c.adversePrice===true,
   adverseMF3:c.adverseFastMF===true,adverseMF15:c.adverseSlowMF===true},
  proofContract:'FROZEN_ENTRY_STRUCTURE + (CONFIRMED_3M_LOSS_OR_FAST_MATERIAL_LOSS) + CORROBORATED_ADVERSE_TRANSFER',
  tickFresh:!!tickFresh};
}
module.exports={VERSION,inspect};
