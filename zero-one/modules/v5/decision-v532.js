'use strict';
// BOONO V5.3.2 PAPER: causal MCB15 requalification of mature E3 candidate.
// Do not let a hypothetical MA barrier veto a high-quality, early observed
// MCB3/MF/PM/E15 transformation. Exit authority/protections are delegated.
const old=require('./decision-v531'),priorPolicy=require('./decision-v53'),
 phase=require('./requalification-v532');
const VERSION='v5.3.2-e15-live-productive-ma-proof';
function evaluate(input){
 const pos=input.position||null;
 // An open V5.3.2 position inherits exactly the V5.3.1 position protection
 // path. All positions opened by older policies retain their original policy.
 const originalPos=pos?.entryPolicyVersion;
 const delegated=originalPos===VERSION?
  {...input,position:{...pos,entryPolicyVersion:old.VERSION}}:input;
 const base=old.evaluate(delegated);
 const dir=pos?.direction||base.candidate;
 const q=phase.evaluate(input,base,dir);
 const originalMA=base.readings?.maContract||{};
 const ma3Original=originalMA.ma3||{};
 // Current price BELOW an untested MA is not proof of rejection.
 // Preserve full diagnostics, but do not manufacture a trading barrier.
 const ma15Original=originalMA.ma15||{};
 const rectify3=(q.ma3.status==='APPROACH_UNPROVEN'&&
    ma3Original.state==='REJECTED')||
    (q.ma3.status==='LIVE_TRAVERSAL_UNCONFIRMED'&&
    ma3Original.state==='TEST_PENDING');
 const rectify15=(q.ma15.status==='APPROACH_UNPROVEN'&&
    ma15Original.state==='REJECTED')||
    (q.ma15.status==='LIVE_TRAVERSAL_UNCONFIRMED'&&
    ma15Original.state==='TEST_PENDING');
 const ma3=rectify3?{...ma3Original,state:q.ma3.status,
   legacyClassification:ma3Original.state}:ma3Original;
 const ma15=rectify15?{...ma15Original,state:q.ma15.status,
   legacyClassification:ma15Original.state}:ma15Original;
 const oldGate=originalMA.entryGate||null;
 const falseGate=!!(oldGate&&(oldGate.source==='3m'?rectify3:
    oldGate.source==='15m'?rectify15:false));
 const maContract={...originalMA,ma3,ma15,
   entryGate:falseGate?null:originalMA.entryGate,
   maProof:q.ma3,ma15Proof:q.ma15,
   causalRequalification:q.window,
   priorGate:oldGate,noHypotheticalMAAuthority:true};
 let action=base.action,reason=base.reason,
   decisionImpact='READONLY_NO_NEW_ADMISSION';
 // An unproven MA must not be cited as the reason for an otherwise
 // independent WAIT on 3m maturity or conversion.
 if(falseGate&&oldGate&&reason.startsWith(oldGate.reason+' + '))
  reason=reason.slice((oldGate.reason+' + ').length);
 let phaseLabel=base.phase;
 // A prior V5.3-approved setup blocked SOLELY by hypothetical MA proximity
 // must be restored when the MA has not actually rejected the price.
 const maOnlyReason=!!(oldGate&&base.reason===oldGate.reason);
 if(!pos&&base.action==='WAIT'&&falseGate&&maOnlyReason){
  const parent=priorPolicy.evaluate(input);
  const qf=base.readings?.maContract?.flowQuality||{};
  if(parent.action==='ENTER_'+String(dir).toUpperCase()&&
      qf.grade!=='ADVERSE'&&qf.grade!=='TACTICAL_VS_SLOW_ADVERSE'){
   action=parent.action;
   reason='MA_UNPROVEN_NONVETO_RESTORE_PARENT_ADMISSION';
   decisionImpact='UNPROVEN_MA_REMOVED_AS_VETO';
  }
 }
 // Existing positions: absolutely no MA/E15 rewrite of the exit contract.
 if(!pos&&action==='WAIT'&&q.eligible){
  action='ENTER_'+dir.toUpperCase();
  reason=q.window==='E15_LIVE_REVERSAL_FORMING'?
   'E15_LIVE_MCB3_MF_PM_PRODUCTIVE_REQUALIFIES':
   'MCB15_CROSS_MF_PM_PRODUCTIVE_REQUALIFIES';
  phaseLabel=q.window==='E15_LIVE_REVERSAL_FORMING'?
   'MCB15_REVERSAL_FORMING_'+dir.toUpperCase():base.phase;
  decisionImpact='NEW_CAUSAL_E15_PHASE_ADMISSION';
 }
 const e=base.readings?.evidenceSincePolicy||{};
 const proofSincePolicy=q.eligible&&q.proofAt>=input.startedAt;
 const derivedEvidence={
  ...e,qualified:!!(e.qualified||proofSincePolicy),
  components:proofSincePolicy?[...(e.components||[]),
    {type:'E15_NEW_PHASE_REQUALIFICATION',at:q.proofAt}]:
    e.components||[]
 };
 const maturity=base.readings?.maturity||{};
 const renewedEntryKey=decisionImpact==='NEW_CAUSAL_E15_PHASE_ADMISSION'&&
   base.entryKey&&q.proofAt?base.entryKey+'|E15:'+q.proofAt:base.entryKey;
 return {...base,version:VERSION,action,reason,phase:phaseLabel,
  entryKey:renewedEntryKey,
  readings:{...base.readings,maContract,
    e15Requalification:q,
    evidenceSincePolicy:derivedEvidence,
    maturity:{...maturity,
     originalMaturity:maturity.maturity,
     new15mProof:q.eligible?q.window:null,
     maUnprovenNonVeto:q.ma3.status==='APPROACH_UNPROVEN'}
  },checks:{...base.checks,
   maTestResolved:falseGate||base.checks?.maTestResolved,
   new15mProofRequalifies:decisionImpact==='NEW_CAUSAL_E15_PHASE_ADMISSION',
   maOnlyProvenRejection:q.ma3.blocked||q.ma15.blocked,
   noChopOverriddenByNewProof:decisionImpact==='NEW_CAUSAL_E15_PHASE_ADMISSION'&&
      base.checks?.noChop===false,
   entryReady:action==='ENTER_LONG'||action==='ENTER_SHORT'
  },decisionContract:{...base.decisionContract,
   ma:'Approach is not a barrier; only confirmed actual reaction proves rejection',
   e15:'First OBSERVED E15 Live can requalify E3 when confirmed E3, reinforcing MF, productive conversion and causal risk agree',
   priceStage:'Maturity measured since new E15 proof normalized to confirmed 15m range; no fixed-dollar expiry',
   historicalPosition:'Older positions keep entry policy and all hard risk/gain floors'
  },decisionImpact,brokerOrdersEnabled:false};
}
module.exports={VERSION,evaluate};
