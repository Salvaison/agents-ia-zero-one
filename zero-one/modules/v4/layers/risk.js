'use strict';
const {finite}=require('../core/utils');

const ABSOLUTE_MAX_LOSS_USD=500;

function evaluate(frame,position,mcb,thesis,translation,ticker,context){
  const price=Number(frame.market.price);
  let currentSignedUsd=null,lossUsd=0,mfeUsd=0,maeUsd=0;
  if(position){
    currentSignedUsd=position.direction==='long'?price-Number(position.entryPrice):Number(position.entryPrice)-price;
    lossUsd=Math.max(0,-currentSignedUsd);
    mfeUsd=Number(position.metrics&&position.metrics.mfeUsd)||0;
    maeUsd=Number(position.metrics&&position.metrics.maeUsd)||0;
  }
  const hardStopBreached=!!position&&(lossUsd>=ABSOLUTE_MAX_LOSS_USD||maeUsd>=ABSOLUTE_MAX_LOSS_USD);
  const hardStopSource=!position?null:
    (lossUsd>=ABSOLUTE_MAX_LOSS_USD?'CURRENT_LOSS':
      (maeUsd>=ABSOLUTE_MAX_LOSS_USD?'OBSERVED_MAE':null));
  return {
    absoluteMaxLossUsd:ABSOLUTE_MAX_LOSS_USD,
    hardStopBreached,hardStopSource,
    hardStopReason:hardStopSource==='OBSERVED_MAE'
      ?'V4 hard absolute risk cap 500 USD was breached intracycle (observed MAE); exit at next decision cycle even after rebound'
      :(hardStopSource==='CURRENT_LOSS'?'V4 hard absolute risk cap 500 USD breached':null),
    position:position?{direction:position.direction,entryPrice:position.entryPrice,currentPrice:price,
      currentSignedUsd,lossUsd,mfeUsd,maeUsd}:null,
    rr:{decisionImpact:false,status:'INFORMATIVE_ONLY',
      note:'V4 n utilise aucun target R/R arbitraire pour autoriser ou refuser une direction'},
    context:{decisionImpact:false,status:context&&context.status||'NEUTRAL'},
    authority:'CAPITAL_AND_GAIN_PROTECTION_ONLY_NEVER_DIRECTION'
  };
}
module.exports={evaluate,ABSOLUTE_MAX_LOSS_USD};
