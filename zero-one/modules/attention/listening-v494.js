'use strict';
// V4.9.4 — preserve the exact frozen V4.9.3 trading action while learning
// temporally when to reopen attention to a reversal. No new automatic EXIT.
const temporal=require('./attention-memory');
const adapters=require('./evidence-adapters');
const VERSION='v4.9.4-temporal-reversal-listening-paper-v1';
function decorate({v493Evaluation,frame,position=null,previousAttention=null,lastExitAt=null}){
 if(!v493Evaluation||!frame?.market)throw Error('V494_REQUIRES_REAL_V493_SNAPSHOT');
 const e=v493Evaluation,now=Number(frame.market.timestamp),
  structural=e.mcb?.currentLobe?.structuralPivot||null,
  campaignDirection=e.mcb?.currentLobe?.structuralDirection||e.thesis?.direction||null,
  campaignId=campaignDirection+'|'+(structural?.extremeTs||e.mcb?.currentLobe?.startTs||'UNKNOWN');
 const attention=temporal.evaluate({now,previous:previousAttention,
  campaignId,campaignDirection,positionDirection:position?.direction||null,
  observations:adapters.fromV494(e,frame),
  polarityRegime:adapters.polarity15Regime(frame.sources?.mcb?.tfs?.['15m']?.history,now),
  lastExitAt});
 const proposal=position&&attention.stage===temporal.STAGES.TRANSFER&&
  e.action?.type==='HOLD'?{
   type:'REVIEW_EARLY_EXIT',direction:position.direction,
   evidence:attention.opposing,at:now,decisionImpact:false}:null;
 return {...e,version:VERSION,originalEngineVersion:e.version,
  action:e.action,temporalAttention:attention,temporalExitProposal:proposal,
  contract:{...e.contract,phaseAttention:'OBSERVATION_FIRST',
   originalActionPreserved:true,noThirdTradingEngine:true,
   maRetestCounterDecisionImpact:false,brokerOrdersEnabled:false}};
}
module.exports={VERSION,decorate};