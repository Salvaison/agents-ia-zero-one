'use strict';
// BOONOLAB MCB3-first / MCB15 adjudication — SHADOW v0.1.
// Inverts the priority of V55 v1.1 WITHOUT changing its PAPER ledger.
// The 3m cross opens a tactical episode; 15m waveform judges the parent.
// No stop oracle, new minutes-of-validity, indicator threshold, order or veto.
const VERSION='boonolab-mcb3-first-mcb15-wave-shadow-v0.1';
const MS=60000,MS3=3*MS,MS15=15*MS;
const val=x=>x===undefined||x===null||x===''?null:
  Number.isFinite(Number(x))?Number(x):null;
const side=d=>d==='long'?1:d==='short'?-1:0;
const fromSign=x=>x>0?'long':x<0?'short':null;
const opp=d=>d==='long'?'short':d==='short'?'long':null;
const round=x=>x===null?null:Math.round(x*100)/100;
function lastAt(rows,asOf,minutes=0){
 const target=asOf-minutes*MS;
 return (rows||[]).filter(x=>val(x.ts)!==null&&x.ts<=target)
  .sort((a,b)=>a.ts-b.ts).at(-1)||null;
}
function asOfBars(bars,now){
 return (bars||[]).filter(b=>val(b.ts)!==null&&b.ts+MS15<=now&&
  val(b.lt_blue_wave)!==null&&val(b.blue_wave)!==null)
  .sort((a,b)=>a.ts-b.ts);
}
function confirmed15(bars,now){
 const a=asOfBars(bars,now),cur=a.at(-1),prev=a.at(-2);
 if(!cur)return {direction:null,status:'UNKNOWN',availableAt:null,
  crossConfirmed:false,source:'CONFIRMED_MCB15_BAR_CLOSE_ONLY'};
 const gap=round(cur.lt_blue_wave-cur.blue_wave);
 const prevGap=prev?round(prev.lt_blue_wave-prev.blue_wave):null;
 const direction=fromSign(gap);
 const crossConfirmed=prevGap!==null&&fromSign(prevGap)!==null&&
  direction!==null&&fromSign(prevGap)!==direction;
 return {direction,prevDirection:prevGap===null?null:fromSign(prevGap),
  status:'CLOSED_15M_OBSERVED',gap,prevGap,
  sourceAt:cur.ts,availableAt:cur.ts+MS15,
  crossConfirmed,crossDirection:crossConfirmed?direction:null,
  source:'CONFIRMED_MCB15_BAR_CLOSE_ONLY'};
}
function extract(decision,{audit=[],bars15=[],now}={}){
 const d=decision||{},r=d.readings||d,st=r.structural54||{},g=r.geometry||{},
  c=r.conversion||{};
 const at=val(now??d.asOf??d.ts),price=val(d.price);
 if(at===null||price===null||price<=0||
   !['long','short'].includes(st.director)||val(st.currentLbw15)===null||
   val(st.currentBw15)===null||!g.cross3||!['long','short'].includes(g.cross3.direction))
  return null;
 const evidence=(audit||[]).filter(x=>val(x.ts)!==null&&x.ts<=at)
  .sort((a,b)=>a.ts-b.ts);
 const a0=evidence.at(-1)||null,a3=lastAt(evidence,at,3),a15=lastAt(evidence,at,15);
 const m15=val(st.currentLbw15),b15=val(st.currentBw15),gap=round(m15-b15);
 const m3=a0?val(a0.liveLbw):null,b3=a0?val(a0.liveBw):null;
 const native3=st.nativeE3||{},native15=st.nativeE15||{};
 const infoNative=obj=>{
  const confirmed=obj.confirmed||{},live=obj.live||{};
  return {confirmed:confirmed.direction||null,
   confirmedKnownAt:val(confirmed.availableAt),
   live:live.direction||null,liveKnownAt:val(live.observedAt)};
 };
 const currentCross={at:val(g.cross3.ts),direction:g.cross3.direction,
  level:val(g.cross3.level),price:val(g.cross3.price)};
 const confirmed=confirmed15(bars15,at);
 const flow=a0&&val(a0.winSec)>0&&val(a0.volumeFenetreBtc)!==null?
  round(60*a0.volumeFenetreBtc/a0.winSec):null;
 const area=r.maContract||{},place=r.place||{};
 return {at,price,quality:d.quality||'UNKNOWN',
  policySource:d.version||null,
  parent:st.director,parentId:st.campaignId||null,
  parentKnownAt:val(st.structuralPivotKnownAt),
  cross3:currentCross,rawMcb3Direction:fromSign(m3!==null&&b3!==null?m3-b3:0),
  mcb3:{lbw:m3,bw:b3,gap:m3!==null&&b3!==null?round(m3-b3):null,
   priorGap:a3&&val(a3.liveLbw)!==null&&val(a3.liveBw)!==null?
    round(a3.liveLbw-a3.liveBw):null},
  mcb15:{lbw:m15,bw:b15,gap,
   liveDirection:fromSign(gap),confirmed,
   observedCross15:{direction:g.cross15?.direction||null,at:val(g.cross15?.ts)},
   lbwDelta3:a3&&val(a3.live15LbwRaw)!==null?
    round(m15-a3.live15LbwRaw):null,
   lbwDelta15:a15&&val(a15.live15LbwRaw)!==null?
    round(m15-a15.live15LbwRaw):null,
   bwDelta3:a3&&val(a3.live15BwRaw)!==null?
    round(b15-a3.live15BwRaw):null,
   gapDelta3:a3&&val(a3.live15LbwRaw)!==null&&val(a3.live15BwRaw)!==null?
    round(gap-(a3.live15LbwRaw-a3.live15BwRaw)):null},
  native3:infoNative(native3),native15:infoNative(native15),
  mf:{mf15:a0?val(a0.live15MfRaw):null,
   mf3:a0?val(a0.liveMoneyFlow):null,
   slope15:val(c.mf15Delta10m),slope3:val(c.mf3Delta3m)},
  pm:{pm3:val(c.pm3),pm5:val(c.pm5),live:val(c.pmCombined),
   sinceBaton:val(c.pmSinceBaton)},
  price3:a3&&val(a3.lastPrice)!==null?round(price-a3.lastPrice):null,
  price15:a15&&val(a15.lastPrice)!==null?round(price-a15.lastPrice):null,
  place:{ma3:area.ma3?.state||null,ma15:area.ma15?.state||null,
   nearest:place.nearest?.key||null,
   nearestPrice:val(place.nearest?.price),
   territoryLabel:st.testedTerritory?.status||null,
   territoryEvidence:st.testedTerritory?.source||null},
  liquidity:{btcPerMinuteEstimate:flow,
   reference:'BATON_ROLLING_TRADES_FLOW_NOT_ORDERBOOK_DEPTH',
   marketRegime:st.market?.label||null},
  source:'V543_OBSERVATIONS_ASOF_AND_CONFIRMED_15M',
  noBroker:true};
}
function initial(at=Date.now()){
 return {version:VERSION,mode:'SHADOW_ONLY',brokerOrdersEnabled:false,
  decisionImpact:false,startedAt:at,lastAt:0,
  observations:0,phase:'UNOBSERVED',campaign:null,
  tacticalEpisode:null,campaignArchive:[],recentEvents:[],
  latest:null,watchOnly:true};
}
function assertState(s){
 if(!s||s.version!==VERSION||s.mode!=='SHADOW_ONLY'||
  s.brokerOrdersEnabled!==false||s.decisionImpact!==false)
  throw Error('MCB3_MCB15_SHADOW_UNTRUSTED_STATE');
}
function signQuality(x,d){
 if(x===null||!side(d))return 'UNKNOWN';
 const z=x*side(d);
 return z>0?'SUPPORTS':z<0?'CONTRADICTS':'NEUTRAL';
}
function adjudicate(x,{position=null}={}){
 if(!x)return null;
 const dir=x.cross3.direction,p=x.parent,w=x.mcb15;
 const g=w.gap,live=w.liveDirection,closed=w.confirmed.direction;
 const parentAgree=dir===p;
 let m15Verdict;
 if(closed&&closed===dir&&live===dir)
  m15Verdict=parentAgree?'CONFIRMS_TACTICAL_PARENT':'CROSS15_FAVORS_TACTIC_PARENT_NOT_REPLACED';
 else if(live===dir&&closed!==dir)
  m15Verdict=parentAgree?'LIVE_WAVE_RESUMING_PARENT':'LIVE_WAVE_TESTS_OLD_PARENT';
 else if(closed&&closed===dir&&live!==dir)
  m15Verdict='LIVE_WAVE_CONTESTS_CONFIRMED_15M';
 else m15Verdict=parentAgree?'PARENT_UNDER_WAVE_CONTEST':'TACTICAL_COUNTERPARENT';
 const mf15=signQuality(x.mf.slope15,dir),
  mf3=signQuality(x.mf.slope3,dir);
 const mfRelation=mf15==='SUPPORTS'&&mf3==='SUPPORTS'?'MF15_AND_MF3_COHERENT':
  mf15==='CONTRADICTS'&&mf3==='SUPPORTS'?'MF3_LEADS_AGAINST_SLOW_FLOW':
  mf15==='NEUTRAL'&&mf3==='SUPPORTS'?'MF3_LEADS_FLAT_MF15':
  mf15==='SUPPORTS'&&mf3==='CONTRADICTS'?'MF3_TACTICAL_RESPIRATION':
  mf15==='CONTRADICTS'&&mf3==='CONTRADICTS'?'MF_OPPOSES_TACTIC':'MF_MIXED_OR_UNKNOWN';
 const price3=signQuality(x.price3,dir),
  pmLive=signQuality(x.pm.live,dir);
 const last15Confirmed=closed&&closed!==p?'OPPOSES_PARENT':
  closed===p?'SUPPORTS_PARENT':'NOT_AVAILABLE';
 const cross15=x.mcb15.confirmed.crossConfirmed?
  'CONFIRMED_ON_LAST_CLOSED_15M_BAR':
  x.mcb15.observedCross15.direction===opp(p)&&
   live===opp(p)?
    'OPPOSITE_GEOMETRIC_CROSS_OBSERVED_NOT_CLOSE_PROVEN':
    'NO_NEW_CONFIRMED_CROSS';
 const structural={
  parent:p,parentId:x.parentId,mc3Direction:dir,
  mc3RawLiveDirection:x.rawMcb3Direction,
  e3NativeConfirmed:x.native3.confirmed,
  e15NativeConfirmed:x.native15.confirmed,
  cross3EventAt:x.cross3.at,
  live15Direction:live,confirmed15Direction:closed,
  parentAgreement:parentAgree,m15Verdict,confirmedCrossStatus:cross15,
  confirmed15VsParent:last15Confirmed,
  lbw15Gap:g,lbw15AngleDelta3:w.lbwDelta3,
  lbw15Delta15m:w.lbwDelta15,
  bw15AngleDelta3:w.bwDelta3,gapSpeedDelta3:w.gapDelta3,
  angleRelation:w.gapDelta3===null?'UNKNOWN':
   w.gapDelta3>0?'LBW15_CATCHES_OR_LEADS_UP':
   w.gapDelta3<0?'LBW15_CATCHES_OR_LEADS_DOWN':'PARALLEL_AT_SAMPLE',
  mfRelation,mf15,mf3,
  qualityNote:'NO_ARBITRARY_CROSS3_18MIN_OR_E3_25MIN_VETO'};
 const opportunity={
  firstAuthority:'MCB3_CROSS',
  cross3VsLiveWave:x.rawMcb3Direction===null?'UNKNOWN':
   x.rawMcb3Direction===dir?'COHERENT':'LIVE_3M_ALREADY_CONTRADICTS_LAST_CROSS',
  proposed:'MCB3_TACTICAL_EPISODE_OBSERVED',
  mcb15Assessment:m15Verdict,
  mfAssessment:mfRelation,
  priceResponse:price3,
  pmImmediate:pmLive,
  placeContext:x.place,liquidityContext:x.liquidity,
  reason:'NO_ENTER_OR_EXIT_IN_SHADOW; REPORT_THE_RELATION_TO_15M',
  newThresholdsAdded:0};
 const held=position&&['long','short'].includes(position.direction)?
  position.direction:null;
 const positionAttention=held?{
  direction:held,relativeToCross3:held===dir?'SAME':'TACTIC_OPPOSES_POSITION',
  relativeToParent:held===p?'SAME':'POSITION_OPPOSES_PARENT',
  cross15ConfirmedOpposite:closed===opp(held)&&
   x.mcb15.confirmed.crossConfirmed,
  requiresReview:closed===opp(held)&&x.mcb15.confirmed.crossConfirmed?
   'CONFIRMED_15M_OPPOSITE_REVIEW_POSITION_EARLY':
   dir===opp(held)?'MCB3_COUNTER_REVIEW_LOCAL_RISK_NOT_PARENT_EXIT':
    'NO_NEW_TACTICAL_WARNING',
  decisionImpact:false,exitRequested:null}:null;
 return {asOf:x.at,structural,opportunity,positionAttention,
  dataQuality:x.quality,source:x.source,
  mode:'SHADOW_ONLY',brokerOrdersEnabled:false,decisionImpact:false};
}
function observe(state,x,{position=null}={}){
 assertState(state);
 if(!x||val(x.at)===null||x.at<=state.lastAt)
  return {changed:false,state,reason:'MISSING_OR_OLDER_ASOF'};
 const result=adjudicate(x,{position});if(!result)return {changed:false,state};
 const events=[];
 const push=(type,more={})=>events.push({at:x.at,type,parentId:x.parentId,
  ...more,mode:'SHADOW_ONLY',decisionImpact:false,brokerOrdersEnabled:false});
 if(!state.campaign||state.campaign.parentId!==x.parentId){
  if(state.campaign){
   state.campaignArchive=[...state.campaignArchive,{...state.campaign,
    endedAt:x.at,reason:'PARENT_ID_CHANGED_OBSERVED'}].slice(-30);
   push('PARENT_CHANGED_OBSERVED',
    {from:state.campaign.parentId,to:x.parentId});
  }else push('PARENT_FIRST_OBSERVED',{to:x.parentId});
  state.campaign={parentId:x.parentId,direction:x.parent,
   firstObservedAt:x.at,phase:'CAMPAIGN_ACTIVE',
   firstPrice:x.price,lastPrice:x.price,high:x.price,low:x.price,
   tacticalAttempts:0,counterAttempts:0,resumptions:0,
   confirmedOpposite15Count:0,lastConfirmedOppositeCrossAt:null};
  state.tacticalEpisode=null;
 }
 const cam=state.campaign;cam.lastPrice=x.price;
 cam.high=Math.max(cam.high,x.price);cam.low=Math.min(cam.low,x.price);
 const episodeKey=x.cross3.at!==null?
  x.cross3.direction+'|'+x.cross3.at:null;
 if(episodeKey&&episodeKey!==state.tacticalEpisode?.id){
  // Preexisting means the event was actually observed BEFORE this shadow
  // started; the first post-start crossing is not discarded.
  const preexisting=x.cross3.at<state.startedAt;
  if(!preexisting){
   cam.tacticalAttempts++;
   if(x.cross3.direction!==cam.direction){
    cam.counterAttempts++;cam.phase='COUNTERATTACK';
   }else if(cam.phase==='COUNTERATTACK'){
    cam.resumptions++;cam.phase='PARENT_RESUMPTION_ATTEMPT';
   }else cam.phase='PARENT_TACTICAL_WINDOW';
   push('MCB3_NEW_TACTICAL_CROSS',{direction:x.cross3.direction,
    crossAt:x.cross3.at,classification:cam.phase,
    mcb15Verdict:result.structural.m15Verdict});
  }else push('MCB3_EXISTING_EPISODE_AT_SHADOW_START',{
   direction:x.cross3.direction,crossAt:x.cross3.at});
  state.tacticalEpisode={id:episodeKey,firstObservedAt:x.at,
   crossAt:x.cross3.at,direction:x.cross3.direction,
   isNewSinceShadowStart:!preexisting,
   relationToParent:x.cross3.direction===cam.direction?'ALIGNED':'COUNTER'};
 }
 const confirmedOpp=result.structural.confirmed15VsParent==='OPPOSES_PARENT'&&
  result.structural.confirmedCrossStatus==='CONFIRMED_ON_LAST_CLOSED_15M_BAR';
 if(confirmedOpp&&
   cam.lastConfirmedOppositeCrossAt!==x.mcb15.confirmed.availableAt){
  cam.confirmedOpposite15Count++;
  cam.lastConfirmedOppositeCrossAt=x.mcb15.confirmed.availableAt;
  push('CROSS15_CONFIRMED_OPPOSES_PARENT',
   {direction:x.mcb15.confirmed.direction,barKnownAt:x.mcb15.confirmed.availableAt});
  cam.phase='CONFIRMED_15M_PARENT_DISPUTE';
 }else if(cam.phase==='PARENT_RESUMPTION_ATTEMPT'&&
  result.structural.live15Direction===cam.direction&&
  (x.price-cam.firstPrice)*side(cam.direction)>0){
  cam.phase='PARENT_RESUMED';
  push('PARENT_RESUMED_AFTER_MCB3',
   {price:x.price,mc15:x.mcb15.liveDirection});
 }
 result.campaignPhase=cam.phase;
 result.tacticalEpisode=state.tacticalEpisode;
 result.campaign=cam;
 result.positionReview=result.positionAttention;
 state.lastAt=x.at;state.observations++;
 state.phase=cam.phase;state.latest=result;
 state.recentEvents=[...state.recentEvents,...events].slice(-80);
 return {changed:true,state,result,events};
}
module.exports={VERSION,initial,assertState,extract,adjudicate,observe,
 confirmed15,asOfBars,lastAt,signQuality};
