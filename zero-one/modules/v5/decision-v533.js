'use strict';
// BOONO V5.3.3 PAPER: separate persistent structural thesis, transient
// conversion respiration and actual entry timing. Does not modify exits.
const previous=require('./decision-v532');
const memory=require('./conversion-campaign-v533');
const VERSION='v5.3.3-conversion-memory-no-instant-veto';
function evaluate(input){
 const pos=input.position||null;
 // Preserve exits for V5.3.2 positions; a new V5.3.3 position uses the
 // SAME V5.3.1 exit contract through V5.3.2's existing delegation.
 const prior=pos?.entryPolicyVersion===VERSION?
  {...input,position:{...pos,entryPolicyVersion:previous.VERSION}}:input;
 const base=previous.evaluate(prior);
 const dir=pos?.direction||base.candidate;
 const campaign=memory.assess(input,base,dir);
 const original=base.reason;
 let action=base.action,reason=original,phase=base.phase,
  decisionImpact='CONVERSION_MEMORY_OBSERVATION';
 let renewal=false;
 if(!pos&&action==='WAIT'&&campaign.canRenewEntry){
  action='ENTER_'+dir.toUpperCase();
  reason='MCB15_PRODUCTIVE_CAMPAIGN_MF_PM_REQUALIFIED';
  decisionImpact='NEW_ENTRY_WITH_PERSISTENT_CONVERSION_EVIDENCE';
  renewal=true;
 }else if(!pos&&action==='WAIT'&&campaign.engaged&&
    campaign.moment==='RESPIRATION_AFTER_PRODUCTIVE_IMPULSE'&&
    campaign.timing==='WAIT_PM_RESPIRATION'&&
    ['INEFFICIENT','CONTESTED','SILENT'].includes(campaign.currentQuality)&&
    campaign.guards.geometry3&&campaign.guards.e3Confirmed&&
    campaign.guards.liveOrConfirmed&&campaign.guards.newE15&&
    campaign.guards.mfStrong&&campaign.guards.notExhausted&&
    campaign.guards.maNotProvenResistance&&campaign.guards.hardRiskOK&&
    campaign.guards.fresh){
  // A WAIT on current PM is a timing decision, NOT structural invalidation.
  reason='WAIT_PM_RESPIRATION_MCB15_CAMPAIGN_ENGAGED';
  decisionImpact='THESIS_RETAINED_TIMING_PAUSED';
 }
 const q=base.readings?.e15Requalification||{};
 const newProof=renewal?{...q,eligible:true,
  window:'MCB15_PRODUCTIVE_MEMORY_REQUALIFIED',proofAt:campaign.e15ProofAt,
  qualificationSource:'MCB15_E3_MF_PM_WITH_HISTORICAL_POWERFUL'}:q;
 const originalEvidence=base.readings?.evidenceSincePolicy||{};
 const evidence={...originalEvidence,
  qualified:!!(originalEvidence.qualified||renewal),
  components:renewal?[...(originalEvidence.components||[]),
   {type:'MCB15_CONVERSION_MEMORY_REQUALIFICATION',at:campaign.e15ProofAt,
    firstProductiveAt:campaign.firstProductiveAt}]:
   originalEvidence.components||[]};
 const key=renewal&&base.entryKey?
  base.entryKey+'|E15:'+campaign.e15ProofAt:base.entryKey;
 return {...base,version:VERSION,action,reason,phase,entryKey:key,
  readings:{...base.readings,e15Requalification:newProof,
   conversionCampaign:{...campaign,previousReason:original},
   evidenceSincePolicy:evidence,
   maturity:{...base.readings?.maturity,
    conversionCampaignEngaged:campaign.engaged,
    conversionTiming:campaign.timing,
    productiveImpulseMemoryAt:campaign.lastProductiveAt}
  },
  checks:{...base.checks,
   conversionStateDoesNotVetoMCB15:campaign.engaged,
   new15mProofRequalifies:renewal||base.checks?.new15mProofRequalifies,
   requalifiedOnConversionMemory:renewal,
   entryReady:action==='ENTER_LONG'||action==='ENTER_SHORT'},
  decisionContract:{...base.decisionContract,
   conversion:'INEFFICIENT or CONTESTED after POWERFUL is a temporal respiration, not a thesis reversal',
   admission:'Entry timing checks current PM/MF and structural risk, with historical productive conversion retained',
   thesisInvalidation:'Requires causal opposing MCB15/price/flow proof, never a mere conversion quality label',
   exits:'All live V5.3.1 and V5.3.2 position exit rules and gain/risk protections unchanged'},
  decisionImpact,brokerOrdersEnabled:false};
}
module.exports={VERSION,evaluate};
