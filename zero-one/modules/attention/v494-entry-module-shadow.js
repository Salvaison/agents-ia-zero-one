'use strict';
// Experimental module only: an exact V493 admission or an additional MCB15
// inflection filter. NEVER creates a direction that V4.9.3 did not authorize.
const VERSION='v494-entry-research-v0.1';
const POLICIES=['EXACT_V493','MCB15_INFLECTION'];
function evaluate({evaluation,frame,policy}={}){
 if(!POLICIES.includes(policy))throw Error('UNKNOWN_ENTRY_POLICY');
 const a=evaluation?.action||{},type=String(a.type||'');
 const admitted=type==='ENTER_LONG'||type==='ENTER_SHORT';
 if(!admitted)return {admitted:false,reason:'V493_NO_ENTRY',
  originalAction:type,policy,version:VERSION};
 const direction=type==='ENTER_LONG'?'long':'short';
 const lobe=evaluation?.mcb?.currentLobe||{}, lbw=Number(lobe.extremeLbw);
 const causal=Number(lobe.startTs)<=Number(frame?.market?.timestamp);
 const family=direction==='long'?'CREUX':'CRETE';
 const correctLobe=lobe.type===family&&Number.isFinite(lbw)&&
  (direction==='long'?lbw<=-45:lbw>=45)&&causal;
 const reason=correctLobe?'MCB15_INFLECTION_45_CONFIRMED':
  'MCB15_EXTREME_FILTER_NOT_MET';
 const setupKey=evaluation?.setup?.setupKey||evaluation?.setup?.setupId||
  direction+'|'+lobe.startTs;
 return {version:VERSION,policy,admitted:policy==='EXACT_V493'||correctLobe,
  direction,reason:policy==='EXACT_V493'?'ORIGINAL_V493_AUTHORIZED':reason,
  sourceAction:type,originalReason:a.reason||null,setupKey,
  originalSetupTs:evaluation?.setup?.setupTs||null,
  evidence:{family,lobeType:lobe.type||null,extremeLbw:Number.isFinite(lbw)?lbw:null,
   lobeStartTs:lobe.startTs||null,asOf:frame?.market?.timestamp||null,
   signedThreshold:direction==='long'?-45:45,
   evidenceMeaning:'observed MCB15 trough/crest, not automatic counter-trade'}};
}
module.exports={VERSION,POLICIES,evaluate};
