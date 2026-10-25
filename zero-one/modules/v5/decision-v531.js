'use strict';
// BOONO Systems V5.3.1 — MA200 test / maturity / shared structural risk.
// The MCB15 strategic hypothesis and MCB3 tactical geometry remain V5.3;
// MA3/MA15 qualify whether price has PROVED acceptance or is merely testing.
// MF quality is truthful (tolerated negative MF15 != reinforcing).
// No broker code, no new shadow stream, historical ledgers are unchanged here.
const previous=require('./decision-v53'),ma=require('./ma-contract-v531');
const VERSION='v5.3.1-ma-maturity-mf-quality';
const n=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const side=d=>d==='long'?1:-1;
function evaluate(input){
 const isNewPosition=!!(input.position&&input.position.entryPolicyVersion===VERSION);
 // V5.3 treats every other version as legacy. For a V5.3.1 position reuse
 // its proven strategic protection path, then extend it with verified MA facts.
 const priorInput=isNewPosition?
  {...input,position:{...input.position,entryPolicyVersion:previous.VERSION}}:input;
 const base=previous.evaluate(priorInput);
 const contract=ma.evaluate(input,base);
 const position=input.position||null;
 let action=base.action,reason=base.reason,invalidation=base.invalidation;
 const original=base.action;
 const flow=contract.flowQuality||contract.quality||{};
 // A true MA test may be the dominant reason for an already waiting
 // mature E3 setup. Preserve the original reason as secondary evidence.
 if(!position&&original==='WAIT'&&contract.entryGate?.block&&
    base.reason==='IMPULSION_3M_MATURE_SANS_NOUVELLE_DEFENSE'&&
    base.quality==='DATA_OK'){
  reason=contract.entryGate.reason+' + '+base.reason;
 }
 if(!position&&(original==='ENTER_LONG'||original==='ENTER_SHORT')){
  const progress=n(base.readings?.maturity?.progressInTypical3mRanges);
  if(contract.entryGate?.block){
   action='WAIT';reason=contract.entryGate.reason;
  }else if(flow.grade==='ADVERSE'){
   action='WAIT';reason='WAIT_MF15_MF3_ADVERSE';
  }else if(flow.grade==='TACTICAL_VS_SLOW_ADVERSE'&&
     progress!==null&&progress>1.25){
   action='WAIT';reason='WAIT_MF15_ADVERSE_AND_MATURE_E3';
  }else if(flow.grade==='TACTICAL_VS_SLOW_ADVERSE'&&contract.activeZone&&
     !(contract.ma15?.accepted||contract.ma3?.accepted)){
   action='WAIT';reason='WAIT_MF15_MA_TEST_QUALITY_UNRESOLVED';
  }else if(contract.riskCandidate&&invalidation&&
      contract.riskCandidate.distanceUsd<invalidation.distanceUsd&&
      contract.riskCandidate.distanceUsd>0){
   // A PROVEN MA territory may improve risk, never a hypothetical proximity.
   invalidation=contract.riskCandidate;
  }
 }
 let protection=null;
 if(position&&isNewPosition&&action==='HOLD'){
  const d=side(position.direction),current=contract,
   slow=contract.ma15,fast=contract.ma3,
   pm3=n(base.readings?.conversion?.pm3),
   pm5=n(base.readings?.conversion?.pm5),
   mf15=n(base.readings?.flow15?.mf15Change),
   previouslyAccepted=position.entryContext?.maContract?.ma15?.accepted;
  const persistentLoss=!!(slow?.lostConfirmed&&previouslyAccepted&&
    pm3!==null&&pm5!==null&&d*pm3<0&&d*pm5<0&&
    mf15!==null&&d*mf15<0);
  if(persistentLoss){
   action='EXIT_'+position.direction.toUpperCase();
   reason='MA15_ACCEPTED_TERRITORY_LOST_WITH_MF_PM';
   protection={status:'CONFIRMED_MA15_FAILURE',source:'MA15',now:input.now};
  }else if(fast&&['TEST_PENDING','REJECTED'].includes(fast.state)){
   // MA3 has shared maturity/risk authority, but a single tactical test
   // is insufficient to overrule an already open structural campaign.
   protection={status:'WATCH_MA3_CONFRONTATION',source:'MA3',
    price:fast.ma,zone:current.activeZone};
   reason=reason==='CAMPAGNE_EN_POSITION'?
     'HOLD_WATCH_MA3_TEST_WITHOUT_PROVEN_INVALIDATION':reason;
  }
 }
 return {...base,version:VERSION,action,reason,invalidation,
  readings:{...base.readings,
   maContract:{
    version:contract.version,ma3:contract.ma3,ma15:contract.ma15,
    activeZone:contract.activeZone,entryGate:contract.entryGate,
    riskCandidate:contract.riskCandidate,flowQuality:contract.flowQuality,
    positionProtection:protection,
    semantics:'MA3 tactical test; MA15 structural proof; one active confrontation'
   },
   flow15:{...base.readings?.flow15,
     qualityGrade:flow.grade||'UNKNOWN',
     mf15ReallySupports:!!flow.genuineSlowSupport,
     mf15Role:flow.mf15Role||'UNKNOWN',mf3Role:flow.mf3Role||'UNKNOWN',
     previousToleranceNotSupport:flow.mf15Role==='ADVERSE'&&
       base.readings?.flow15?.mf15Aligned===true},
   maturity:{...base.readings?.maturity,
     ma3Stage:contract.ma3?.state||'UNKNOWN',
     ma15Stage:contract.ma15?.state||'UNKNOWN',
     maTestActive:!!contract.entryGate,
     activeConfrontation:contract.activeZone?.name||null},
   invalidationEvidence:{
     ...base.readings?.invalidationEvidence,
     ma3:contract.ma3?.state||null,
     ma15:contract.ma15?.state||null,
     maSharedRisk:invalidation?.kind==='CONFIRMED_MA_TERRITORY'
   }
  },
  checks:{...base.checks,
   maTestResolved:!contract.entryGate,
   flowGrade:flow.grade||'UNKNOWN',
   maRiskFromConfirmedPrice:invalidation?.kind==='CONFIRMED_MA_TERRITORY',
   entryReady:action==='ENTER_LONG'||action==='ENTER_SHORT'},
  decisionContract:{...base.decisionContract,
   ma3:'Maturity/tactical test; crossing Live alone does not imply acceptance',
   ma15:'Campaign/risk test; proof of loss plus MF/PM required to exit',
   activeZone:'At most one active price confrontation; no LGI-style level growth',
   flow:'MF3 and MF15 direction must be described truthfully'},
  brokerOrdersEnabled:false
 };
}
module.exports={VERSION,evaluate};
