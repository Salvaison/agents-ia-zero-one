'use strict';
// V5.4.2 — same capital/risk/anti-churn decisions as V5.4.1 for the first
// controlled PAPER rollout. Selective causal listening + genuine V493 shadow.
const previous=require('./decision-v541');
const temporal=require('../attention/attention-memory');
const adapter=require('../attention/evidence-adapters');
const VERSION='v5.4.2-selective-attention-paper-v1';
function evaluate(input){
 const position=input.position||null;
 // The V541 engine delegates unknown position versions to V54. A genuine V542
 // position must continue through V541's FULL existing structural exit contract.
 const compatibility=position?.entryPolicyVersion===VERSION?
  {...position,entryPolicyVersion:previous.VERSION}:position;
 const d=previous.evaluate({...input,position:compatibility});
 const s=d.readings?.structural54||{};
 const now=d.asOf,oldAttention=input.previousAttention||null;
 let attention;
 if(s.available){
  attention=temporal.evaluate({now,previous:oldAttention,
   campaignId:s.campaignId,campaignDirection:s.director,
   positionDirection:position?.direction||null,
   observations:adapter.fromV542(d,input),
   lastExitAt:input.lastExitAt??null});
 }else{
  // No synthetic available history when the structural sources are stale.
  attention={version:temporal.VERSION,asOf:now,stage:'DISCOVERY',
   campaignId:null,attentionOnly:true,events:[],
   unavailableReason:s.reason||d.reason,brokerOrdersEnabled:false};
 }
 const old=input.v493AdmissionAsOf||null;
 const age=old?now-old.at:null;
 const comparable=!!(old&&old.engine==='v4.9.3-mf-memory-admission-20261012'&&
  age>=0&&age<=90000&&old.asOfVerified===true);
 const shadow=comparable?{engine:old.engine,at:old.at,ageMs:age,
   action:old.action?.type||null,reason:old.action?.reason||null,
   setup:old.setup?.status||null,provenance:'FROZEN_CDF1936',
   noTradingAuthority:true}:null;
 return {...d,version:VERSION,
  action:d.action,reason:d.reason,quality:d.quality,
  readings:{...d.readings,attention,admissionV493Shadow:shadow},
  checks:{...d.checks,attentionHasTradeAuthority:false,
   v493ShadowHasTradeAuthority:false},
  decisionContract:{...d.decisionContract,
   phaseAttention:'DISCOVERY > CAMPAIGN_HOLD > REVERSAL_ATTENTION > TRANSFER_EXAMINATION',
   originalV541ExecutionPreserved:true,
   admissionV493Shadow:'exact frozen evaluator, independent proof memory, zero trading authority',
   maRetestCounterDecisionImpact:false,
   brokerOrdersEnabled:false}};
}
module.exports={VERSION,evaluate};