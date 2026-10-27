'use strict';
// BOONO Systems V5.4.3 PAPER — causally persistent offensive maturity.
// V5.4.2 exits, risk, fees and anti-churn keys are preserved, including
// inherited positions. One PAPER trading engine, not an added shadow.
const previous=require('./decision-v542');
const maturity=require('./offensive-maturity-v543');
const VERSION='v5.4.3-causal-offensive-maturity-paper-v1';
const MEMORY_VERSION='v543-offensive-episode-memory-v1';
const n=x=>x!==null&&x!==undefined&&Number.isFinite(Number(x))?Number(x):null;
const sign=d=>d==='long'?1:d==='short'?-1:0;
function reconcile({reading,prior=null,structural={},conversion={},now,position=null}){
 const camp=structural.campaignId||null,dir=reading?.candidate||null;
 const p=prior?.version===MEMORY_VERSION?prior:null;
 const same=!!(p&&p.status==='DEFERRED'&&p.campaignId===camp);
 const applies=!!(same&&p.candidate===dir);
 const last=structural.testedTerritory||{};
 const freshRetest=!!(applies&&last.source==='DEFENDED_RETEST'&&
  last.validated&&n(last.availableAt)!==null&&last.availableAt>p.deferredAt&&
  n(last.retest?.retestAt)!==null&&last.retest.retestAt>p.deferredAt&&
  n(last.retest?.heldAt)!==null&&last.retest.heldAt>p.deferredAt);
 const dirN=sign(dir),postBaton=n(conversion.pmSinceBaton),pmLive=n(conversion.pmCombined);
 const renewedPm=dirN&&postBaton!==null&&pmLive!==null&&
  dirN*postBaton>0&&dirN*pmLive>0;
 const ref=n(p?.referenceLbw15),observed=n(structural.currentLbw15);
 const renewedOscillator=!!(applies&&ref!==null&&observed!==null&&
  dirN*(observed-ref)>=0&&renewedPm);
 const newTerritorialEpisode=!!(freshRetest&&renewedPm);
 const requalified=!!(renewedOscillator||newTerritorialEpisode);
 const immediate=!!(reading?.deferNewEntry&&!position);
 const deferred=!!(!position&&((applies&&!requalified)||immediate));
 let state=null;
 if(immediate&&!same){
  state={version:MEMORY_VERSION,status:'DEFERRED',campaignId:camp,
   candidate:dir,deferredAt:now,firstSeenAt:now,lastSeenAt:now,
   referenceLbw15:reading?.context?.oscillator?.referenceLbw??null,
   priorPriceExtreme:reading?.context?.oscillator?.referencePrice??null,
   referenceE15At:reading?.context?.oscillator?.referenceAvailableAt??null,
   proofFamilies:(reading?.evidence||[]).filter(e=>e.observed).map(e=>e.family),
   note:'Episode retained until fresh CAUSAL requalification, never just a PM flicker'};
 }else if(same){
  state={...p,lastSeenAt:now,status:requalified?'REQUALIFIED':'DEFERRED',
   requalifiedAt:requalified?now:null,
   requalificationProof:requalified?(newTerritorialEpisode?
    'POST_DEFERRAL_NEW_DEFENDED_RETEST_PLUS_PM':'LBW15_REGAINS_CONFIRMED_EXTREME_PLUS_PM'):null};
  // The same read may still match a late-offensive warning at the exact
  // instant of requalification. Do not reopen during that contradiction.
  if(immediate){state.status='DEFERRED';state.requalifiedAt=null;
   state.requalificationProof=null;}
 }else if(p&&p.campaignId===camp&&!position){
  // Keep the earlier deferred opposing candidate while current 3m tactical
  // direction fluctuates. It cannot silently reenter on the old E3.
  state={...p,lastSeenAt:now};
 }else state=null;
 return {deferNewEntry:deferred,firstWarning:immediate,
  persistentWait:applies&&!requalified,
  requalified:requalified&&!immediate,
  episode:state,appliesToCurrentCandidate:applies,
  evidence:{freshRetest,newTerritorialEpisode,renewedOscillator,renewedPm},
  reason:deferred?immediate?'MULTI_FAMILY_LATE_OFFENSIVE':
   'SAME_OFFENSIVE_NO_FRESH_REQUALIFICATION':
   requalified?'NEW_CAUSAL_OFFENSIVE_REQUALIFICATION':'NO_MATURITY_CONFLICT'};
}
function evaluate(input){
 const pos=input.position||null;
 // The V542/V541 wrapper honors the exact pre-existing exit contract.
 const compatible=pos?.entryPolicyVersion===VERSION?
  {...pos,entryPolicyVersion:previous.VERSION}:pos;
 const old=previous.evaluate({...input,position:compatible});
 const reading=maturity.evaluate({decision:old,input});
 const state=reconcile({reading,prior:input.previousOffensiveMaturity,
  structural:old.readings?.structural54||{},
  conversion:old.readings?.conversion||{},
  now:old.asOf,position:pos});
 const attemptedEntry=old.action==='ENTER_LONG'||old.action==='ENTER_SHORT';
 const deferred=!pos&&attemptedEntry&&state.deferNewEntry;
 const action=deferred?'WAIT':old.action;
 const reason=deferred?'WAIT_OFFENSIVE_CHAIN_ALREADY_EXTENDED_AWAIT_REQUALIFICATION':old.reason;
 return {...old,version:VERSION,action,reason,
  readings:{...old.readings,
   offensiveMaturity:{...reading,deferNewEntry:state.deferNewEntry,
    memoryDefer:state.persistentWait,
    firstWarning:state.firstWarning,requalification:state.reason,
    episode:state.episode},
   offensiveMaturityMemory:state.episode,
   maturity:{...old.readings?.maturity,
    offensiveChain:reading.context?.priceOrigin||null,
    unifiedOffensiveClassification:reading.classification,
    unifiedOffensiveDeferNewEntry:state.deferNewEntry}},
  checks:{...old.checks,
   offensiveMaturitySharedAcrossPhase:true,
   offensiveMaturityBlocksNewAdmission:deferred,
   entryReady:deferred?false:old.checks?.entryReady},
  decisionContract:{...old.decisionContract,
   offensiveMaturity:'4h PRICE origin + 2h edge + same-MA15-regime prior E15 LBW + post-Baton PM, shared across ALL admission phases',
   maturityMemory:'Deferred E3 family persists until new confirmed defended PRICE retest plus productive PM OR restored LBW15/PM; new E3 alone never resets it',
   offensiveMaturityAuthoritativeOnlyForNewEntries:true,
   noNewFixedDollarExpiry:true,WHEREHasVeto:false,
   inheritedExitsUntouched:true,brokerOrdersEnabled:false}};
}
module.exports={VERSION,MEMORY_VERSION,reconcile,evaluate};
