'use strict';
const structural=require('../../v2/experiments/structural-shadow');
const {scoreDivergence}=require('../../divergence');
const lineage=require('./divergence-lineage-shadow');
const ma200=require('./ma200-shadow');
const causalEvents=require('./causal-events-shadow');
const combatLedger=require('./combat-ledger-shadow');
function legacy(){try{const r=scoreDivergence(['3m','15m','1h','4h']);return {score:r.score,sens:r.sens,tfCount:r.tfCount,multidiv:r.multidiv};}catch(e){return {error:e.message};}}
function evaluate(frame,result,config,pos=null){
  const pseudo={action:result.action,dominance:result.dominance,risk:{riskUsd:null,rewardUsd:null}};
  const s=structural.evaluate(frame,pseudo,legacy(),config);
  const ma=ma200.evaluate(frame,result);
  return {...s,lineage:lineage.evaluate(frame,result),ma200:ma,
    causalEvents:causalEvents.evaluate(frame,result,ma),
    combatLedger:combatLedger.evaluate(frame,result,pos),
    decisionImpact:false,note:'V2 divergence + lineage + MA200 + causal events + combat ledger run in shadow with zero decision impact'};
}
module.exports={evaluate};
