'use strict';
// BOONOLAB LBW15 S1 v0.2. Independent, causally persistent E15 campaign
// interpretation. Parent, tactical candidate, and held POSITION are distinct.
// Research only: never writes a PAPER order, stop, entry, or exit.
const base=require('./v543-lbw15-s1');
const VERSION='boonolab-v543-lbw15-s1-v0.2';
const MIN=60000,HOUR=60*MIN;
const n=x=>x===null||x===undefined||x===''?null:
 Number.isFinite(Number(x))?Number(x):null;
const s=d=>d==='long'?1:d==='short'?-1:0;
const opposite=d=>d==='long'?'short':d==='short'?'long':null;
const r=x=>x===null?null:Math.round(x*100)/100;
const signed=(x,d)=>x===null||!s(d)?null:r(s(d)*x);
function initial(startedAt=Date.now()){
 return {version:VERSION,mode:'SHADOW_ONLY',decisionImpact:false,
  brokerOrdersEnabled:false,startedAt,lastAt:0,
  count:0,current:null,archives:[],events:[],
  asOfEvidence:'FIRST_OBSERVED_PROSPECTIVE_NOT_HISTORICAL_RECREATION'};
}
function checked(x){
 if(!x||x.version!==VERSION||x.mode!=='SHADOW_ONLY'||
  x.decisionImpact!==false||x.brokerOrdersEnabled!==false)
  throw Error('S1_V02_STATE_VERSION_AUTHORITY_INVALID');
 return x;
}
function near(samples,ts,ago){
 const target=ts-ago*MIN;
 return [...samples].reverse().find(x=>x.at<=target&&
  target-x.at<=90000)||null;
}
function perspective(cur,past15,past3,dir,position=null){
 const d=s(dir),d15=past15?r(cur.lbw-past15.lbw):null,
  d3=past3?r(cur.lbw-past3.lbw):null;
 const adversePM=d!==0&&cur.pmLive!==null&&d*cur.pmLive< -15;
 const favorablePM=d!==0&&cur.pmLive!==null&&d*cur.pmLive>15;
 const cross3Opp=!!(d&&cur.cross3Direction===opposite(dir)&&
  n(cur.cross3At)!==null&&cur.cross3At<=cur.at&&
  cur.at-cur.cross3At<=20*MIN);
 const cross3Same=!!(d&&cur.cross3Direction===dir&&
  n(cur.cross3At)!==null&&cur.cross3At<=cur.at);
 const nativeOpp=!!(d&&cur.nativeDirection===opposite(dir)&&
  n(cur.nativeKnownAt)!==null&&cur.nativeKnownAt<=cur.at&&
  n(cur.parentKnownAt)!==null&&cur.nativeKnownAt>cur.parentKnownAt);
 const cross15Opp=!!(d&&cur.cross15Direction===opposite(dir)&&
  n(cur.cross15At)!==null&&cur.cross15At<=cur.at);
 const lbw15Adverse=d15!==null&&d*d15<=-6;
 const lbw3Adverse=d3!==null&&d*d3<=-3;
 const lbw15Favors=d15!==null&&d*d15>=4;
 const lbw3Favors=d3!==null&&d*d3>=2;
 const priceChange3=past3?r(cur.price-past3.price):null;
 const priceChange15=past15?r(cur.price-past15.price):null;
 const fam={
  MCB3:cross3Opp,
  PM:adversePM,
  LBW15:lbw15Adverse||lbw3Adverse,
  E15_NATIVE:nativeOpp&&cross15Opp
 };
 const supports={
  MCB3:cross3Same,
  PM:favorablePM,
  LBW15:lbw15Favors||lbw3Favors,
  E15_NATIVE:cur.nativeDirection===dir&&
    n(cur.nativeKnownAt)!==null&&cur.nativeKnownAt<=cur.at
 };
 const opposed=Object.keys(fam).filter(k=>fam[k]);
 const aligned=Object.keys(supports).filter(k=>supports[k]);
 const hasPriceOpp=priceChange3!==null&&d*priceChange3<=-20;
 const hasPriceSupport=priceChange3!==null&&d*priceChange3>=20;
 const threatened=opposed.length>=2&&
  (opposed.includes('MCB3')||opposed.includes('E15_NATIVE'));
 const transferCandidate=nativeOpp&&cross15Opp;
 let mfeAtObserved=null,givebackFromMfe=null;
 if(position&&n(position.entryPrice)!==null){
  const move=r(d*(cur.price-position.entryPrice));
  const mfe=n(position.mfePriceUsd);
  mfeAtObserved=mfe;
  givebackFromMfe=mfe!==null?Math.max(0,r(mfe-move)):null;
 }
 return {direction:dir,delta3m:r(d3),delta15m:r(d15),
  signed3m:signed(d3,dir),signed15m:signed(d15,dir),
  gap:r(cur.lbw-cur.bw),
  priceChange3m:r(priceChange3),priceChange15m:r(priceChange15),
  directionalPrice3m:signed(priceChange3,dir),
  directionalPrice15m:signed(priceChange15,dir),
  opposedFamilies:opposed,alignedFamilies:aligned,
  adversePM,favorablePM,lbw3Adverse,lbw15Adverse,lbw3Favors,
  lbw15Favors,cross3Opp,cross3Same,nativeOpp,cross15Opp,
  hasPriceOpp,hasPriceSupport,threatened,transferCandidate,
  mfeAtObserved,givebackFromMfe,
  basis:'SAME_ASOF_LBW15_PRICE_MCB_PM_FROM_V543_READONLY'};
}
function newCampaign(cur){
 return {parentId:cur.parentId||'UNKNOWN_PARENT',
  parentDirection:cur.parent||null,startedAt:cur.at,lastAt:cur.at,
  phase:'CAMPAIGN_ACTIVE',phaseSince:cur.at,
  entryReferencePrice:cur.price,lastPrice:cur.price,
  high:cur.price,low:cur.price,observations:0,
  counterattacks:0,resumptions:0,transferCandidates:0,
  counter:null,latestResumption:null,
  tacticalDirections:[],episodeHistory:[],
  lastParentPriceProgress:null,latestPositionReview:null,
  inheritance:'NEW_E15_PARENT_OBSERVED_NOT_DEDUCED_FROM_E3'};
}
function clone(x){return JSON.parse(JSON.stringify(x));}
function observe(state,cur,{position=null,history=[]}={}){
 checked(state);
 if(!cur||!['long','short'].includes(cur.parent)||!Number.isFinite(n(cur.at))||
  !Number.isFinite(n(cur.price))||!Number.isFinite(n(cur.lbw))||
  !Number.isFinite(n(cur.bw)))
  return {changed:false,state,error:'S1_V02_INSUFFICIENT_INPUT'};
 if(cur.at<=state.lastAt)return {changed:false,state,error:'S1_V02_REPEATED_OR_OLDER'};
 const previous=state.events.length?state.events.at(-1):null;
 // The memory is never backfilled from an older/candidate-only episode.
 const past15=near(history,cur.at,15),past3=near(history,cur.at,3);
 const perspectives={
  parent:perspective(cur,past15,past3,cur.parent),
  candidate:perspective(cur,past15,past3,cur.candidate||cur.parent),
  position:position?.direction?perspective(cur,past15,past3,position.direction,position):null
 };
 const transitions=[];
 let campaign=state.current;
 const emit=(type,from,to,more={})=>{
  transitions.push({type,at:cur.at,sourceAt:cur.at,
   parentId:cur.parentId,from,to,...more,decisionImpact:false,
   brokerOrdersEnabled:false});
 };
 if(campaign&&campaign.parentId!==cur.parentId){
  state.archives.push({...campaign,closedBy:'NEW_PARENT_OBSERVED',
    endedAt:cur.at});
  state.archives=state.archives.slice(-24);
  const old=campaign;
  campaign=newCampaign(cur);
  const nativeMatches=cur.nativeDirection===cur.parent&&
   n(cur.nativeKnownAt)!==null&&cur.nativeKnownAt<=cur.at;
  const cross15Matches=cur.cross15Direction===cur.parent&&
   n(cur.cross15At)!==null&&cur.cross15At<=cur.at;
  emit('S1_V02_PARENT_REPLACED',old.parentId,campaign.parentId,{
   oldDirection:old.parentDirection,newDirection:cur.parent,
   candidate:cur.candidate,
   transitionStatus:nativeMatches&&cross15Matches&&cur.defended?
    'NEW_PARENT_WITH_NATIVE_CROSS_AND_DEFENDED_PRICE':
    'NEW_PARENT_OBSERVED_PRICE_TRANSFER_NOT_FULLY_VERIFIED'});
 }
 if(!campaign){
  campaign=newCampaign(cur);
  emit('S1_V02_PARENT_STARTED',null,cur.parentId,
   {parentDirection:cur.parent});
 }
 const gap=campaign.lastAt&&cur.at-campaign.lastAt>2*MIN;
 if(gap){
  emit('S1_V02_OBSERVATION_GAP',campaign.phase,campaign.phase,
   {gapMinutes:r((cur.at-campaign.lastAt)/MIN)});
 }
 campaign.observations++;
 campaign.lastAt=cur.at;
 campaign.lastPrice=cur.price;
 campaign.high=Math.max(campaign.high,cur.price);
 campaign.low=Math.min(campaign.low,cur.price);
 campaign.tacticalDirections=[...campaign.tacticalDirections,
  {at:cur.at,direction:cur.candidate||null}].slice(-60);
 const p=perspectives.parent;
 // Counterattack evidence is measured against the parent, not current E3.
 // A fleeting opposite MCB3 accompanied by adverse PM is enough to START
 // review; it is not a mandatory EXIT nor an E15 transfer.
 const attackNow=p.threatened||
  (p.transferCandidate&&p.opposedFamilies.length>=1);
 const continuationNow=p.alignedFamilies.filter(x=>x!=='E15_NATIVE').length>=2&&
  p.cross3Same&&p.favorablePM;
 const setPhase=(next,why)=>{
  if(campaign.phase===next)return;
  const prev=campaign.phase;
  campaign.phase=next;campaign.phaseSince=cur.at;
  emit('S1_V02_CAMPAIGN_PHASE',prev,next,{
   reason:why,opposed:p.opposedFamilies,aligned:p.alignedFamilies,
   candidate:cur.candidate,position:position?.direction||null,
   parentPriceProgress:r(s(cur.parent)*(cur.price-campaign.entryReferencePrice))});
 };
 if(attackNow){
  if(!campaign.counter||campaign.phase==='CAMPAIGN_ACTIVE'||
      campaign.phase==='RESUMED'){
   campaign.counter={startedAt:cur.at,referencePrice:cur.price,
    worstOppositePrice:cur.price,worstAt:cur.at,
    firstFamilies:p.opposedFamilies,
    peakOppositeUsd:0,episodeId:campaign.counterattacks+1,
    endedAt:null,firstReviewAt:cur.at};
   campaign.counterattacks++;
   setPhase('COUNTERATTACK','TWO_INDEPENDENT_FAMILIES_AGAINST_PARENT');
  }else if(campaign.phase==='RECOVERY_CANDIDATE'){
   campaign.latestResumption=null;
   setPhase('COUNTERATTACK','RECOVERY_NOT_PERSISTENT');
  }
 }
 if(campaign.counter&&!campaign.counter.endedAt){
  const adverse=s(cur.parent)*(campaign.counter.referencePrice-cur.price);
  if(adverse>campaign.counter.peakOppositeUsd){
   campaign.counter.peakOppositeUsd=r(adverse);
   campaign.counter.worstAt=cur.at;
   campaign.counter.worstOppositePrice=cur.price;
  }
 }
 if(campaign.phase==='COUNTERATTACK'&&!attackNow&&continuationNow&&!gap){
  campaign.latestResumption={firstAt:cur.at,firstPrice:cur.price,
   parentId:campaign.parentId,firstFamilies:p.alignedFamilies,
   counterId:campaign.counter?.episodeId||null};
  setPhase('RECOVERY_CANDIDATE','PARENT_TACTICAL_LBW_PM_REAPPEAR');
 }else if(campaign.phase==='RECOVERY_CANDIDATE'){
  const rec=campaign.latestResumption;
  const elapsed=rec?cur.at-rec.firstAt:0;
  if(!attackNow&&continuationNow&&rec&&elapsed>=60*1000&&!gap&&
     s(cur.parent)*(cur.price-rec.firstPrice)>=0){
   campaign.resumptions++;
   if(campaign.counter){
    campaign.counter.endedAt=cur.at;
    campaign.episodeHistory.push({...campaign.counter,
     disposition:'PARENT_RESUMED_AFTER_CONTEST'});
    campaign.episodeHistory=campaign.episodeHistory.slice(-18);
   }
   setPhase('RESUMED','PERSISTENT_PARENT_RECLAIMED_PRICE');
  }else if(!attackNow&&!continuationNow&&elapsed>3*MIN){
   campaign.latestResumption=null;
   setPhase('COUNTERATTACK','RESUMPTION_NOT_PROVEN');
  }
 }
 const q=perspectives.position,review=!!(q&&
  ((q.cross3Opp&&q.adversePM)||
   (q.nativeOpp&&q.cross15Opp)||
   (q.lbw15Adverse&&q.adversePM)));
 if(review&&(!campaign.latestPositionReview||
    campaign.latestPositionReview.positionEntryAt!==position.entryAt)){
  campaign.latestPositionReview={at:cur.at,
   positionEntryAt:position?.entryAt||null,
   direction:position?.direction||null,reason:q.opposedFamilies,
   hypotheticalNetUsd:null,source:'S1_V02_ATTENTION_NOT_EXIT'};
  emit('S1_V02_POSITION_REVIEW',null,'REVIEW_WITHOUT_EXIT',{
   positionDirection:position.direction,
   positionEntryAt:position.entryAt,
   opposed:q.opposedFamilies,
   giveback:q.givebackFromMfe});
 }
 const resumedRecently=campaign.phase==='RESUMED'&&
  cur.at-campaign.phaseSince<=20*MIN;
 const admission=cur.candidate===cur.parent&&resumedRecently?
  'REQUALIFIED_SAME_PARENT_REENTRY_REVIEW':
  campaign.phase==='COUNTERATTACK'?
  'DEFER_NEW_UNPROVEN_TACTICAL_EPISODE_REVIEW':
  'NO_MEMORIAL_ADMISSION_OBJECTION';
 const positionReview=review?
  'EXAMINE_PRICE_DEFENCE_AND_ECONOMIC_PROTECTION':
  'NO_POSITION_REVIEW';
 campaign.lastParentPriceProgress=r(s(cur.parent)*(cur.price-
  campaign.entryReferencePrice));
 state.current=campaign;state.lastAt=cur.at;state.count++;
 const view={version:VERSION,asOf:cur.at,price:cur.price,
  parent:cur.parent,parentId:cur.parentId,
  phase:campaign.phase,phaseSince:campaign.phaseSince,
  candidate:cur.candidate,positionDirection:position?.direction||null,
  references:perspectives,
  counter:campaign.counter?clone(campaign.counter):null,
  campaignStartedAt:campaign.startedAt,
  counterattacks:campaign.counterattacks,resumptions:campaign.resumptions,
  parentProgressUsd:campaign.lastParentPriceProgress,
  proposedAdmission:admission,
  proposedPosition:positionReview,
  proposedTransfer:'PARENT_ID_CHANGE_ONLY_NEEDS_PRICE_ACCEPTANCE',
  decisionImpact:false,entryAllowed:null,exitRequested:null,
  brokerOrdersEnabled:false,
  note:'Classifications are causal observational hypotheses, no P&L or EXIT authority'};
 state.events=[...state.events,...transitions].slice(-180);
 return {changed:true,state,view,transitions};
}
module.exports={VERSION,initial,checked,perspective,observe};
