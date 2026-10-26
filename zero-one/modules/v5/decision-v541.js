'use strict';
// BOONO Systems V5.4.1 — SINGLE ACTIVE PAPER CONSTITUTION.
// MCB15 E15->E15 trajectory defines the structural campaign BEFORE considering
// the latest E3 cross. MCB3 is tactical; MF qualifies; MA tests territory;
// PM measures execution conditions. No broker imports or funded orders.
// Old V5.3.3 is referenced ONLY to honor exits for positions inherited at switch.
const trajectory=require('../v4/layers/structural-trajectory');
const sensor=require('./decision-v52');
const priorV54=require('./decision-v54');
const evidence=require('./structural-evidence-v541');
const causal=require('./v53-causal');
const ma=require('./ma-contract-v531');
const VERSION='v5.4.1-structural-e3-territory-paper-v1';
const MIN=60000,THREE=3*MIN,FIFTEEN=15*MIN,HOUR=60*MIN;
const n=v=>v===null||v===undefined||v===''?null:
 Number.isFinite(Number(v))?Number(v):null;
const r=v=>n(v)===null?null:Math.round(v*10)/10;
const side=d=>d==='long'?1:d==='short'?-1:0;
const opposite=d=>d==='long'?'short':d==='short'?'long':null;
const median=xs=>{const a=xs.filter(Number.isFinite).sort((x,y)=>x-y);
 return a.length?a[Math.floor(a.length/2)]:null;};
function closed(rows,period,now){
 return (rows||[]).filter(b=>n(b.ts)!==null&&b.ts+period<=now&&
  n(b.lt_blue_wave)!==null&&n(b.close)!==null&&n(b.high)!==null&&n(b.low)!==null);
}
function originMap(bars3,now,price,dir){
 const out={};
 for(const min of [30,60,120]){
  const series=bars3.filter(b=>b.ts+THREE>=now-min*MIN&&b.ts+THREE<=now);
  const older=bars3.filter(b=>b.ts+THREE<=now-min*MIN).at(-1);
  if(series.length<Math.floor(min/3*.7)||!older)continue;
  const lo=series.reduce((a,b)=>!a||b.low<a.low?b:a,null);
  const hi=series.reduce((a,b)=>!a||b.high>a.high?b:a,null);
  const span=hi.high-lo.low,d=side(dir),prior=d===1?lo:hi;
  out['m'+min]={
   windowMinutes:min,low:r(lo.low),lowAvailableAt:lo.ts+THREE,
   high:r(hi.high),highAvailableAt:hi.ts+THREE,
   priceAtWindowStart:r(older.close),priceChange:r(price-older.close),
   directionalPriceChange:d?r(d*(price-older.close)):null,
   fromOppositeExtremeUsd:d?r(d*(price-(d===1?lo.low:hi.high))):null,
   lastOppositeExtremeAt:prior.ts+THREE,
   positionInPriceRange:span>0?r((price-lo.low)/span):null,
   informationAvailableAt:now,
   asOfCausality:'CONFIRMED_3M_ONLY'
  };
 }
 return out;
}
function liveNative(input,tf,direction,now){
 const fam=tf==='15m'?'MCB15':'MCB3',key=tf==='15m'?'E15':'E3',
  period=tf==='15m'?FIFTEEN:THREE,
  currentStart=Math.floor(now/period)*period;
 const events=(input.causalEvents||[]).filter(e=>e.family===fam&&e.key===key&&
  e.type==='OBSERVED'&&e.direction===direction&&n(e.observedAt)!==null&&
  e.observedAt<=now).sort((a,b)=>a.observedAt-b.observedAt);
 const ev=events.at(-1)||null;
 const cancelled=!!(ev&&(input.causalEvents||[]).some(x=>
  x.family===fam&&x.key===key&&x.type==='INTERRUPTED'&&
  x.direction===direction&&n(x.observedAt)!==null&&
  x.observedAt>ev.observedAt&&x.observedAt<=now&&
  x.sourceTs===ev.sourceTs));
 return ev&&ev.sourceTs===currentStart&&!cancelled?ev:null;
}
function actualDefense(bars3,dir,now,price){
 const d=side(dir);
 const near=bars3.slice(-5);
 if(!d||near.length<3)return {status:'UNKNOWN',held:false,level:null};
 // A prior fully completed local bar provides the price frontier.
 // This does not create a new Luigi/LGI level.
 const base=near.slice(-4,-1),last=near.at(-1);
 const boundary=d===1?Math.max(...base.map(b=>b.high)):
  Math.min(...base.map(b=>b.low));
 const penetration=d*(last.close-boundary),current=d*(price-boundary);
 const recovery=penetration>0&&current>=0;
 const previous=d===1?Math.min(...near.map(b=>b.low)):
  Math.max(...near.map(b=>b.high));
 return {
  status:recovery?'RECLAIMED_LOCAL_PRICE_FRONTIER':'NO_CONFIRMED_RECLAIM',
  held:recovery,level:r(boundary),
  protectiveExtreme:r(previous),sourceAt:last.ts+THREE,
  evidence:'Closed 3m price crossing earlier closed 3m frontier; no MA hypothesis'
 };
}
function build(input){
 const now=n(input.now),price=n(input.price);
 if(now===null||price===null||!Array.isArray(input.samples)||!input.samples.length)
  return {available:false,reason:'NO_ASOF_PRICE_OR_AUDIT'};
 const b15=closed(input.bars15,FIFTEEN,now),b3=closed(input.bars3,THREE,now);
 const b1=closed(input.bars1h,HOUR,now),b4=closed(input.bars4h,4*HOUR,now);
 const lastSample=input.samples.filter(x=>x.ts<=now).at(-1)||null;
 const last15=b15.at(-1),last3=b3.at(-1);
 if(!lastSample||!last15||!last3)return {available:false,reason:'MISSING_CONFIRMED_STRUCTURE'};
 const t15=trajectory.evaluate({history:b15},'15m'),
  t3=trajectory.evaluate({history:b3},'3m'),
  t1=trajectory.evaluate({history:b1},'1h'),
  t4=trajectory.evaluate({history:b4},'4h');
 if(!t15.available)return {available:false,reason:'MCB15_PIVOT_NOT_CAUSALLY_CONFIRMED'};
 const parent=t15.structuralDirection,pivot=t15.lastStructuralPivot,
  pivotKnownAt=pivot.confirmedAt+FIFTEEN;
 if(pivotKnownAt>now)return {available:false,reason:'MCB15_FUTURE_PIVOT_REJECTED'};
 const pivots=t15.turns,previousPivot=pivots.length>1?pivots.at(-2):null;
 const bSamples=input.samples.filter(x=>x.ts<=now&&x.ts>=now-3*HOUR);
 const raw15n=n(lastSample.live15LbwRaw),raw15b=n(lastSample.live15BwRaw);
 const observedSide=raw15n!==null&&raw15b!==null&&Math.abs(raw15n-raw15b)>.2?
  (raw15n>raw15b?'long':'short'):null;
 const origin=originMap(b3,now,price,parent);
 const native15=evidence.nativeProof(input,'MCB15',now);
 const native3=evidence.nativeProof(input,'MCB3',now);
 const stage='MCB15_'+parent.toUpperCase()+
  (observedSide===parent?'_ALIGNED':observedSide?'_CONTESTED':'_UNRESOLVED');
 return {
  available:true,asOf:now,price,source:'CONFIRMED_E15_E_TO_E',
  campaignId:parent+'|E15:'+pivot.extremeTs,
  direction:parent,structuralState:t15.structuralState,
  phase:stage,confirmationKnownAt:pivotKnownAt,
  parentPivot:{
   type:pivot.type,originKind:'GEOMETRIC_LBW_EXTREMUM',
   nativeE15IsIndependent:true,
   sourceTs:pivot.extremeTs,availableAt:pivotKnownAt,
   lbw:r(pivot.lbw),price:r(pivot.price)
  },
  previousPivot:previousPivot?{
   type:previousPivot.type,sourceTs:previousPivot.extremeTs,
   availableAt:previousPivot.confirmedAt+FIFTEEN,
   lbw:r(previousPivot.lbw),price:r(previousPivot.price)
  }:null,
  durationSincePivotMinutes:r((now-pivotKnownAt)/MIN),
  previousE15DurationMin:previousPivot?r((pivot.extremeTs-previousPivot.extremeTs)/MIN):null,
  currentLbw15:r(raw15n),currentBw15:r(raw15b),liveOscillatorDirection:observedSide,
  native15,native3,
  last3Pivot:t3.lastStructuralPivot?{
   direction:t3.structuralDirection,sourceTs:t3.lastStructuralPivot.extremeTs,
   availableAt:t3.lastStructuralPivot.confirmedAt+THREE,
   lbw:r(t3.lastStructuralPivot.lbw)}:null,
  mcb3Direction:t3.structuralDirection||null,
  contextual1h:t1.structuralDirection||null,
  contextual4h:t4.structuralDirection||null,
  lastConfirmed15AvailableAt:last15.ts+FIFTEEN,
  lastConfirmed3AvailableAt:last3.ts+THREE,
  originByHorizon:origin,
  bars15:b15,bars3:b3,sourceSamples:bSamples,
  role:'MCB15 DIRECTOR; geom LBW extrema and native E15 are distinct; MCB3 tactical',
  exitAuthority:'Only causal structural opposition plus price territory loss; hard risk independent'
 };
}
function evaluate(input){
 const now=n(input.now),price=n(input.price),pos=input.position||null;
 if(pos?.entryPolicyVersion&&pos.entryPolicyVersion!==VERSION){
  // Keep inherited position exits and every capital protection unchanged.
  const legacy=priorV54.evaluate(input);
  return {...legacy,version:VERSION,
   readings:{...legacy.readings,structural54:{
    ...legacy.readings?.structural54,
    legacyPolicyPreserved:pos.entryPolicyVersion,
    exitDelegatedTo:'V5.4_OR_OLDER_ORIGINAL_EXIT_CONTRACT',
    readOnly:'V5.4.1 NEVER REWRITES LEGACY POSITION EXIT'}},
   decisionContract:{...legacy.decisionContract,
    continuity:'All V5.4 and older positions keep their EXACT former exit decisions'},
   brokerOrdersEnabled:false};
 }
 const base=sensor.evaluate(input); // observations only; NEVER its candidate/action
 const rbase=base.readings||{},conv=rbase.conversion||{},
  geometry=rbase.geometry||{},cross=geometry.cross3||null;
 const story=build(input);
 const t=story.available?story:null;
 const empty={
  version:VERSION,asOf:now,price,action:'WAIT',candidate:null,
  phase:'STRUCTURE_UNKNOWN',reason:story.reason||'STRUCTURE_UNKNOWN',
  quality:'DATA_UNKNOWN',invalidation:null,entryKey:null,
  prognosis:'MCB15 E15→E15 unavailable, no trade',
  readings:{...rbase,structural54:story},
  checks:{entryReady:false},brokerOrdersEnabled:false
 };
 if(!t)return empty;
 const parent=t.direction,dirPos=pos?.direction||null;
 const asOfSample=input.samples.filter(x=>x.ts<=now).at(-1)||null;
 // V5.2's legacy rawFresh incorrectly requires an Audit sample stamped
 // inside the NEW 3m/15m bar at its first millisecond. At bar rollover the
 // latest perfectly fresh snapshot can belong to the previous bar for ~30s.
 // Real freshness and "first new-bar observation pending" are DIFFERENT.
 const sampleAge=now-asOfSample.ts;
 const oscillatorPresent=['liveLbw','liveBw','live15LbwRaw','live15BwRaw']
   .every(field=>n(asOfSample[field])!==null);
 const health=input.health!==false&&oscillatorPresent&&
  n(input.tickAgeMs)!==null&&input.tickAgeMs>=0&&input.tickAgeMs<=25000&&
  sampleAge>=0&&sampleAge<=65000&&
  now-t.lastConfirmed15AvailableAt>=0&&
  now-t.lastConfirmed15AvailableAt<=25*MIN&&
  now-t.lastConfirmed3AvailableAt>=0&&
  now-t.lastConfirmed3AvailableAt<=8*MIN;
 const current3mObserved=asOfSample.ts>=Math.floor(now/THREE)*THREE;
 const current15mObserved=asOfSample.ts>=Math.floor(now/FIFTEEN)*FIFTEEN;
 const newBarPending=!current3mObserved||!current15mObserved;
 const dir3=cross?.direction||null, liveOpp=liveNative(input,'15m',opposite(parent),now);
 const MF3=n(conv.mf3Delta3m),MF15=n(conv.mf15Delta10m),pm3=n(conv.pm3),
  pm5=n(conv.pm5),pmLive=n(conv.pmCombined);
 const m15=ma.maPath({tf:'15m',raw:input.bars15,live:input.liveMa15,
  now,price,dir:dirPos||parent});
 const longOrShort=dir3||parent,sign=side(longOrShort);
 const m3=ma.maPath({tf:'3m',raw:input.bars3,live:input.liveMa3,
  now,price,dir:dirPos||longOrShort});
 const zone=ma.activeZone(m3,m15,price);
 const origin=t.originByHorizon.m120;
 const earlier15=t.bars15.filter(b=>b.ts+FIFTEEN<=now-2*HOUR).at(-1)||null;
 const current15=t.bars15.at(-1);
 const mf15History2h=earlier15&&n(earlier15.money_flow)!==null&&
  n(current15.money_flow)!==null?r(current15.money_flow-earlier15.money_flow):null;
 const lbw15History2h=earlier15&&n(earlier15.lt_blue_wave)!==null?
  r(current15.lt_blue_wave-earlier15.lt_blue_wave):null;
 const b3=t.bars3;
 const med3=median(b3.slice(-24).map(b=>b.high-b.low));
 const med15=median(t.bars15.slice(-20).map(b=>b.high-b.low));
 const defensible=(direction)=>actualDefense(b3,direction,now,price);
 const proofOpp=liveOpp&&cross&&cross.direction===liveOpp.direction&&
  t.liveOscillatorDirection===liveOpp.direction;
 // The E15 live contrary starts a STRUCTURAL FORMATION, never automatically
 // replaces the E15→E15 campaign. Price must show causal defence/reclaim.
 const formation=!!(proofOpp&&defensible(liveOpp.direction).held);
 const counterDir=dir3&&dir3!==parent?dir3:null;
 const counterMcb3=counterDir&&n(cross?.level)!==null&&
  side(counterDir)*cross.level<=-55;
 const parentExtreme=n(t.currentLbw15)!==null&&counterDir&&
  side(counterDir)*t.currentLbw15<=-45;
 const tacticalCounter=!!(counterDir&&counterMcb3&&parentExtreme&&
  defensible(counterDir).held);
 const candidate=formation?liveOpp.direction:
  tacticalCounter?counterDir:parent;
 const stance=formation?'STRUCTURAL_REVERSAL_FORMING':
  tacticalCounter?'TACTICAL_RESPIRATION':
  dir3===parent?'STRUCTURAL_CONTINUATION':'AWAIT_TACTICAL_ALIGNMENT';
 const dir=side(candidate),flow3=MF3===null?null:r(dir*MF3),
  flow15=MF15===null?null:r(dir*MF15);
 const flowQuality=flow3===null||flow15===null?'UNKNOWN':
  flow3>.15&&flow15>.15?'REINFORCING':
  flow3>.15&&flow15>=-.15?'TACTICAL_LEADING':
  flow3<-.15&&flow15<-.15?'ADVERSE':'CONTESTED';
 const pmNow=pm3!==null&&pm5!==null&&pmLive!==null;
 const pmOpposed=pmNow&&dir*pm3<0&&dir*pm5<0&&dir*pmLive<0;
 const mfCompatible=flow3!==null&&flow3>-.15&&
  (flow15!==null&&(flow15>=-.15||formation||tacticalCounter));
 const mc15=ma.maPath({tf:'15m',raw:input.bars15,live:input.liveMa15,now,price,dir:candidate});
 const mc3=ma.maPath({tf:'3m',raw:input.bars3,live:input.liveMa3,now,price,dir:candidate});
 const realRejection=(m)=>m?.state==='REJECTED'&&m?.recentlyTouched&&
  m?.zone?.source==='CONFIRMED_PRICE_EXTREMA'&&m.zone.tests>=2;
 const priceCandidate=defensible(candidate);
 const previousExtreme=origin?.positionInPriceRange;
 const rank=previousExtreme===null||previousExtreme===undefined?null:
  candidate==='long'?previousExtreme:1-previousExtreme;
 const atRangeEdge=rank!==null&&rank>=.9;
 const tacticalWaveLevel=n(cross?.level);
 const nearMcb3Extreme=tacticalWaveLevel!==null&&
  side(candidate)*tacticalWaveLevel>=40;
 const slowNoLongerImproving=flow15===null||flow15<=.15;
 // Maturity is the RELATION between origin, wave and slow-flow, not an
 // arbitrary number of BTC dollars consumed.
 const structurallyLate=atRangeEdge&&nearMcb3Extreme&&slowNoLongerImproving&&
  !priceCandidate.held;
 const medEconomic=med3??60;
 const riskPlace=causal.mapPlace({now,price,dir:candidate,
  bars3:input.bars3,bars15:input.bars15,levels:input.levels||[],
  median3:medEconomic,base});
 // MCB3's LAST GEOMETRIC PIVOT is historical breathing memory only.
 // Native E3 + a current cross + real price/MA proof may validate the
 // parent's continuation BEFORE another opposite LBW3 extreme is formed.
 const territory=evidence.defendedTerritory({
  input,now,dir:candidate,ma3:mc3,ma15:mc15,riskPlace});
 const tactical=evidence.tacticalEpisode({
  input,now,dir:candidate,cross,native3:t.native3,native15:t.native15,territory,
  parentAvailableAt:t.confirmationKnownAt,legacyPivot3:t.mcb3Direction});
 const structuralContinuation=stance==='STRUCTURAL_CONTINUATION';
 const confirmedTransition=stance==='STRUCTURAL_REVERSAL_FORMING'&&
  tactical.alignedCross&&tactical.nativeAligned&&territory.validated;
 // Preserve explicit E3 extreme counter-campaign breathing as an exception,
 // without silently promoting it to an independent 15m strategy.
 const qualifiedTacticalEpisode=structuralContinuation?tactical.allowed:
  stance==='STRUCTURAL_REVERSAL_FORMING'?confirmedTransition:
  tacticalCounter;
 const maRisk=ma.evaluate(input,{candidate,readings:{flow15:{
  mf3Change:MF3,mf15Change:MF15}}}).riskCandidate;
 const structuralStop=riskPlace.invalidation;
 const stop=maRisk&&(!structuralStop||maRisk.distanceUsd<structuralStop.distanceUsd)?
  maRisk:structuralStop;
 // Relative phase maturity, never a fixed 250/325 USD price-expiry.
 // All three observations must coincide: outer edge of actual 2h territory,
 // native tactical lobe already near the known 60-band, and a new entry
 // more than a typical confirmed 15m range away from defended ground.
 // A fresh price retest near that defence can still qualify later.
 const atWaveOuterEdge=rank!==null&&rank>=1;
 const e3AtOuterBand=n(cross?.level)!==null&&
   side(candidate)*cross.level>=60;
 const farFromDefendedGround=territory.validated&&
   n(territory.level)!==null&&med15>0&&
   side(candidate)*(price-territory.level)>med15;
 const matureAfterExtension=!!(structuralContinuation&&
   atWaveOuterEdge&&e3AtOuterBand&&farFromDefendedGround);
 const hardRiskOK=!!(stop&&n(stop.price)!==null&&
  n(stop.distanceUsd)!==null&&stop.distanceUsd>0&&stop.distanceUsd<500&&
  n(stop.confirmedAvailableAt)!==null&&stop.confirmedAvailableAt<=now);
 const proofAfterActivation=territory.source==='DEFENDED_RETEST'&&
  tactical.allowed&&territory.availableAt>=(input.startedAt||0);
 const recentTactic=!!(cross&&cross.direction===candidate&&cross.ts<=now&&
  (cross.ts>=(input.startedAt||0)||proofAfterActivation));
 const alignedTactic=!!(cross&&cross.direction===candidate&&
  (structuralContinuation?tactical.alignedCross:
    tacticalCounter||confirmedTransition));
 const reversalRoom=qualifiedTacticalEpisode;
 const entryEligible=!!(!pos&&health&&!newBarPending&&recentTactic&&alignedTactic&&
  stance!=='AWAIT_TACTICAL_ALIGNMENT'&&reversalRoom&&
  (flowQuality==='REINFORCING'||flowQuality==='TACTICAL_LEADING'||
    (tacticalCounter&&flow3>.15))&&
  mfCompatible&&!pmOpposed&&!realRejection(mc3)&&
  !realRejection(mc15)&&!structurallyLate&&
  !matureAfterExtension&&hardRiskOK);
 // The first cross of an E3 episode authorizes one candidate in an existing
 // E15 campaign; new E3 / genuinely new price defence can renew it.
 const retestAt=territory.source==='DEFENDED_RETEST'&&
  territory.availableAt>cross?.ts?territory.availableAt:null;
 const key=recentTactic?candidate+'|'+cross.ts+'|'+
  (formation?'FORMING:'+liveOpp.sourceTs:tacticalCounter?
    'TACTICAL:'+t.campaignId:t.campaignId)+
  (retestAt?'|RETEST:'+retestAt:''):null;
 const reasons=[
  [!health,'STRUCTURAL_SOURCES_STALE'],
  [newBarPending,'WAIT_MCB_NEW_BAR_FIRST_SNAPSHOT'],
  [stance==='AWAIT_TACTICAL_ALIGNMENT','WAIT_MCB3_INSIDE_MCB15_CAMPAIGN'],
  [!recentTactic,'WAIT_NEW_CAUSAL_E3_OPPORTUNITY'],
  [!alignedTactic,'WAIT_MCB3_CROSS_ALIGNED_WITH_PARENT'],
  [!qualifiedTacticalEpisode,structuralContinuation?
    tactical.reason:'WAIT_CAUSAL_REVERSAL_OR_RESPIRATION_PROOF'],
  [!mfCompatible,'WAIT_MF_NOT_COMPATIBLE_WITH_STRUCTURE'],
  [pmOpposed,'WAIT_PM_OPPOSED_TO_STRUCTURE'],
  [realRejection(mc3)||realRejection(mc15),'WAIT_PROVEN_MA_REJECTION'],
  [structurallyLate,'WAIT_EXTENDED_WAVE_NEAR_PRICE_RANGE_EDGE'],
  [matureAfterExtension,'WAIT_LATE_MCB3_EXTREME_FAR_FROM_DEFENCE'],
  [!hardRiskOK,'WAIT_NO_CAUSAL_SURVIVABLE_INVALIDATION']
 ];
 let action=entryEligible?'ENTER_'+candidate.toUpperCase():'WAIT',
  reason=entryEligible?'V541_STRUCTURAL_CONTINUATION_REAL_TERRITORY':
   reasons.find(x=>x[0])?.[1]||'WAIT_STRUCTURE_QUALITY_UNKNOWN';
 let positionReview=null;
 if(pos){
  action='HOLD';reason='V54_CAMPAIGN_POSITION_ACTIVE';
  const pdir=pos.direction,pSign=side(pdir);
  const opposingPivot=t.direction===opposite(pdir)&&
    t.confirmationKnownAt>pos.entryAt;
  const structuralLoss=!!(n(pos.invalidationPrice)!==null&&
    t.bars3.slice(-2).length===2&&t.bars3.slice(-2).every(b=>
     pSign*(b.close-pos.invalidationPrice)<0));
  const mfAdverse=MF15!==null&&pSign*MF15<-.15&&
    MF3!==null&&pSign*MF3<-.15;
  const defendedOpposition=defensible(opposite(pdir)).held;
  positionReview={previousCampaign:pos.campaignId||null,currentCampaign:t.campaignId,
   opposingPivotConfirmed:opposingPivot,structuralLoss,mfAdverse,
   defendedOpposition,stopReference:pos.invalidationPrice,
   hasHardRiskOverride:false};
  if((opposingPivot&&mfAdverse&&defendedOpposition)||
     (structuralLoss&&mfAdverse&&defendedOpposition)){
   action='EXIT_'+pdir.toUpperCase();
   reason='V54_CONFIRMED_STRUCTURAL_TERRITORY_TRANSFER';
  }else if(opposingPivot||structuralLoss){
   reason='HOLD_V54_STRUCTURE_CONTESTED_PROTECT';
  }else if(dir3===opposite(pdir)){
   reason='HOLD_V54_3M_RESPIRATION_NOT_EXIT';
  }
 }
 const structural54={
  version:VERSION,available:true,asOf:now,campaignId:t.campaignId,
  director:t.direction,strategicState:t.structuralState,phase:stance,
  structuralOrigin:t.parentPivot,previousStructuralPivot:t.previousPivot,
  structuralPivotKnownAt:t.confirmationKnownAt,
  previousE15DurationMin:t.previousE15DurationMin,
  currentOffensive:t.liveOscillatorDirection,
  currentLbw15:t.currentLbw15,currentBw15:t.currentBw15,
  origins:t.originByHorizon,
  context1h:t.contextual1h,context4h:t.contextual4h,
  mcb3:{direction:t.mcb3Direction,latestPivot:t.last3Pivot,
   cross:cross||null,role:'TACTICAL_ONLY'},
  oppositeLive15:liveOpp?{observedAt:liveOpp.observedAt,
   sourceTs:liveOpp.sourceTs,direction:liveOpp.direction}:null,
  formingReversal:formation,tacticalRespiration:tacticalCounter,
  localPriceDefence:priceCandidate,
  nativeE15:t.native15,nativeE3:t.native3,
  tacticalAdmission:tactical,
  testedTerritory:territory,
  nativeVsGeometry:'Distinct native E3/E15 signals and LBW pivots; no double authority',
  activeFrontier:zone||null,
  MA3:mc3.state,MA15:mc15.state,
  directionalMF3:flow3,directionalMF15:flow15,
  mf15History2h,lbw15History2h,
  mfQuality:flowQuality,
  priceRangeRank:rank,atDirectional2hEdge:atRangeEdge,
  extendedTacticalWave:nearMcb3Extreme,structurallyLate,
  matureAfterExtension,
  maturityAssessment:{atWaveOuterEdge,e3AtOuterBand,farFromDefendedGround,
    priceRank2h:rank,tacticalCrossLevel:cross?.level??null,
    distanceFromDefenceUsd:territory.level!==null?
      r(side(candidate)*(price-territory.level)):null,
    typical15mRangeUsd:r(med15),
    note:'MCB3 at band ±60 + 2h outer edge + distant defended price'},
  sourceFreshness:{auditAgeMs:r(sampleAge),current3mObserved,
   current15mObserved,firstNewBarSnapshotPending:newBarPending,
   actualDataDegraded:!health,
   semantics:'Bar rollover is a pending new observation, not lost market data'},
  price3mMedianRange:r(med3),price15mMedianRange:r(med15),
  conversion:{pm3,pm5,pmLive,role:'EXECUTION_NOT_DIRECTION',
   fullyOpposed:pmOpposed},
  positionReview,
  entryReason:reason,proofAt:cross?.ts||null,
  noDoubleVoting:'Native E3/E15 and BW-LBW CROSS are one oscillator family',
  note:'The structural E15→E15 phase exists without an open trade; an adverse PM or E3 cannot select a strategic direction'
 };
 return {
  version:VERSION,asOf:now,price,candidate,
  phase:stance,prognosis:'MCB15 '+parent.toUpperCase()+
   ' depuis '+t.parentPivot.type+' · '+stance,
  action,reason,quality:health?'DATA_OK':'DATA_DEGRADED',
  invalidation:stop,entryKey:key,brokerOrdersEnabled:false,
  readings:{...rbase,
   mcb15:{...rbase.mcb15,
    trajectory:parent,phase:stance,
    structuralPivotAt:t.parentPivot.sourceTs,
    structuralAvailableAt:t.parentPivot.availableAt,
    currentOffensive:t.liveOscillatorDirection},
   mcb3:{...rbase.mcb3,trajectory:t.mcb3Direction},
   place:{...rbase.place,anchor:riskPlace.anchor,
    nearest:riskPlace.nearestContext,
    invalidationRef:stop?.reference||null},
   maContract:{...ma.evaluate(input,{candidate,readings:{flow15:{
    mf3Change:MF3,mf15Change:MF15}}}),
    direction:candidate},
   structural54,
   maturity:{...rbase.maturity,
    phase:stance,structuralOrigin:t.parentPivot,
    twoHourPriceRank:rank,structurallyLate,
    campaignId:t.campaignId,
    requalified:!!(retestAt&&qualifiedTacticalEpisode),
    requalifiedAt:retestAt,
    nativeEpisodeAt:t.native3.confirmed?.availableAt||null,
    confirmationProof:tactical.reason},
   causalChain:{...rbase.causalChain,
    campaignId:t.campaignId,direction:t.direction,
    structuralOrigin:t.parentPivot,
    tacticalOpportunityAt:cross?.ts||null,
    qualifier:'STRUCTURAL_PARENT_NOT_CROSS3'},
   flow15:{mf3Change:MF3,mf15Change:MF15,
    coherence:flowQuality,qualityGrade:flowQuality},
   evidenceSincePolicy:{qualified:recentTactic,
    components:recentTactic?[
      {type:'MCB3_NATIVE_IN_15M_CAMPAIGN',at:tactical.proofAt??cross.ts},
      ...(retestAt?[{type:'CONFIRMED_DEFENDED_TERRITORY',at:retestAt}]:[])
    ]:[]}
  },
  checks:{dataFresh:health,firstNewBarSnapshotPending:newBarPending,
   current3mObserved,current15mObserved,structuralParentKnown:true,
   nativeE3Available:t.native3.confirmed?.availableAt||null,
   mcb3GeometricPivotHasVeto:false,
   mcb3Aligned:alignedTactic,verifiedTerritory:territory.validated,
   tacticalCausalEvidence:qualifiedTacticalEpisode,
   flowCompatible:mfCompatible,
   maReallyRejects:realRejection(mc3)||realRejection(mc15),
   tooMatureAfterExtension:matureAfterExtension,
   provenStop:hardRiskOK,entryReady:entryEligible},
  decisionContract:{
   director:'MCB15 E15→E15, not last cross3',
   MCB3:'Cross/E3 native is tactical; LBW3 old extremum is not a strategic veto',
   MF:'Quality, not source of direction',
   MA:'Confirmed MA contact/acceptance or causal crossing+extension+retest+hold; no single-breakout authority',
   PM:'Execution conditions, never strategic direction',
   exits:'Campaign phase independent from position; confirm territorial transfer',
   protection:'Independent PAPER stop -500 BTC USD and +120/90,+220/180'
  }
 };
}
module.exports={VERSION,build,evaluate,originMap,actualDefense};
