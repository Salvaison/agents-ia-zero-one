'use strict';
// BOONO V5 — research-only temporal structural story; NEVER imported by action/risk.
const trajectory=require('../v4/layers/structural-trajectory');
const VERSION='v5-structural-story-shadow-v0.3',MINUTE=60000,TF15=15*MINUTE,TF3=3*MINUTE;
const val=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const round=x=>x===null||!Number.isFinite(x)?null:Math.round(x*10)/10;
const sense=(d,x)=>d==='long'?x:-x;
function initial(){return {version:VERSION,decisionImpact:false,tradingEnabled:false,at:null,
 attempts:[],eventKeys:[],eventHistory:[],lastElasticObservedAt:null,priceHistory:[],qualityHistory:[],lastQuality:null,boundaryMemory:{},lastHypothesis:null,
 summaries:[],observationCount:0,missing:0};}
function causalBars(rows,tf,ts){
 // Sources are timestamp-sorted. Binary search avoids rescanning months of
 // MCB3 bars at every 30s observation during a replay.
 if(!Array.isArray(rows)||!rows.length)return[];
 const latest=ts-tf;let lo=0,hi=rows.length;
 while(lo<hi){const mid=(lo+hi)>>1;
   if(Number(rows[mid].ts)<=latest)lo=mid+1;else hi=mid;
 }
 return rows.slice(Math.max(0,lo-280),lo).filter(b=>
   val(b.ts)!==null&&val(b.lt_blue_wave)!==null&&val(b.close)!==null);
}
function location(price,levels,b15,asOfTs){
 const vals=(levels||[]).filter(l=>val(l.price)!==null&&['VAL','POC','VAH'].includes(l.token)&&
   l.groupId!==null&&l.groupId!==undefined);
 const unique={};for(const l of vals)unique[l.token]=l;
 const lo=unique.VAL,mid=unique.POC,hi=unique.VAH;
 let area='VALUE_UNKNOWN';
 if(lo&&mid&&hi&&lo.price<mid.price&&mid.price<hi.price){
  area=price<lo.price?'BELOW_VALUE':price>hi.price?'ABOVE_VALUE':
    price<mid.price?'LOWER_VALUE':price>mid.price?'UPPER_VALUE':'AT_POC';
 }
 const marks=[...vals];
 const recent=b15.slice(-24);
 if(recent.length>=4){
  const low=Math.min(...recent.map(b=>b.low).filter(Number.isFinite));
  const high=Math.max(...recent.map(b=>b.high).filter(Number.isFinite));
  if(Number.isFinite(low))marks.push({token:'LOCAL_LOW',price:low,label:'Past confirmed 15m local low',kind:'local'});
  if(Number.isFinite(high))marks.push({token:'LOCAL_HIGH',price:high,label:'Past confirmed 15m local high',kind:'local'});
 }
 const above=marks.filter(l=>l.price>price).sort((a,b)=>a.price-b.price)[0]||null;
 const below=marks.filter(l=>l.price<price).sort((a,b)=>b.price-a.price)[0]||null;
 const nearest=[above,below].filter(Boolean).sort((a,b)=>Math.abs(price-a.price)-Math.abs(price-b.price))[0]||null;
 const activeProfile=area==='BELOW_VALUE'||area==='LOWER_VALUE'?lo:
   area==='UPPER_VALUE'||area==='AT_POC'?mid:
   area==='ABOVE_VALUE'?hi:null;
 return {valueArea:area,profileFrontier:activeProfile?{key:activeProfile.token,price:activeProfile.price}:null,profile:{
   VAL:lo?lo.price:null,POC:mid?mid.price:null,VAH:hi?hi.price:null},
   nearestAbove:above&&{key:above.token,price:above.price,distanceUsd:round(above.price-price)}||null,
   nearestBelow:below&&{key:below.token,price:below.price,distanceUsd:round(price-below.price)}||null,
   nearest:nearest&&{key:nearest.token,price:nearest.price,side:price<nearest.price?'below':'above'}||null,
   provenance:vals.length?'LEVELS_SNAPSHOT_AVAILABLE_NOW':'PROFILE_NOT_HISTORICALLY_VERIFIED',
   structureAsOf:asOfTs,
   note:'Profile levels are not automatically the major range boundaries'};
}
function updateBoundary(memory,point,ts,price){
 if(!point)return null;
 const id=point.key+'|'+point.price;
 let b=memory[id];
 if(!b){b={id,level:point.price,sideAtFirstObservation:point.side,firstObservedAt:ts,
   lastSide:point.side,crossings:0,retests:0,stage:'NOT_YET_RETESTED',
   lastCrossAt:null,extremeBeyond:null,heldRetestAt:null,failedAt:null};memory[id]=b;}
 const side=price>=b.level?'above':'below';
 if(side!==b.lastSide){
  b.crossings++;b.lastCrossAt=ts;
  // A cross itself is not acceptance. A return into the old side is rejection.
  b.stage=b.crossings>1?'RE_CROSSED_UNRESOLVED':'CROSSED_UNTESTED';
  if(b.crossings>1&&side===b.sideAtFirstObservation)b.failedAt=ts;
 }
 // Record a retest only when a price has moved away from the boundary,
 // then revisits and remains on the newly won side. No future observation used.
 if(b.lastCrossAt&&ts>b.lastCrossAt&&side!==b.sideAtFirstObservation){
  const distance=Math.abs(price-b.level);
  b.extremeBeyond=Math.max(b.extremeBeyond||0,distance);
  if(b.extremeBeyond>0&&distance<b.extremeBeyond){
   b.retests++;
   b.heldRetestAt=ts;
   b.stage='RETEST_HELD_PROVISIONAL';
  }
 }
 if(b.failedAt&&side===b.sideAtFirstObservation)b.stage='CROSS_REJECTED';
 b.lastSide=side;
 return {id:b.id,stage:b.stage,crossings:b.crossings,retests:b.retests,
   firstObservedAt:b.firstObservedAt,heldRetestAt:b.heldRetestAt,failedAt:b.failedAt,
   warning:'Two samples may show a retest but do not prove durable acceptance'};
}
function interpretEvent(e){
 if(!e||!Number.isFinite(Number(e.observedAt)))return null;
 const tf=e.family==='MCB3'?'3m':e.family==='MCB15'?'15m':null;
 if(!tf||!['E3','E15','BW_LBW_CROSS'].includes(e.key))return null;
 if(!['OBSERVED','CONFIRMED','INTERRUPTED','SUPERSEDED'].includes(e.type))return null;
 const x=typeof e.current==='object'&&e.current||{};
 return {key:[tf,e.key,x.sourceTs??e.sourceTs??e.observedAt].join(':'),
   sourceTs:val(x.sourceTs)??val(e.sourceTs)??e.observedAt,
   observedAt:Number(e.observedAt),tf,family:e.key==='BW_LBW_CROSS'?'CROSS':'NATIVE',
   dir:e.direction,status:e.type,price:val(e.price)};
}
function updateAttempts(s,events,ts,price,parentDirection){
 const material=[];
 for(const raw of events||[]){
  if(raw&&Number(raw.observedAt)<=ts&&Number.isFinite(Number(raw.observedAt)))
    s.lastElasticObservedAt=Math.max(s.lastElasticObservedAt||0,Number(raw.observedAt));
  if(raw&&raw.family==='CONVERSION'&&Number(raw.observedAt)<=ts){
   const q=raw.current;
   const quality=typeof q==='string'?q:q&&typeof q==='object'?q.quality:null;
   if(quality&&['TRANSITION','RESTORED','CONFIRMED'].includes(raw.type))
     s.lastQuality={quality,direction:raw.direction||q&&q.direction||null,observedAt:Number(raw.observedAt)};
   continue;
  }
  const e=interpretEvent(raw);
  if(!e||e.observedAt>ts)continue;
  if(!s.eventKeys.includes(e.key+'|'+e.status)){
   s.eventKeys.push(e.key+'|'+e.status);
   s.eventKeys=s.eventKeys.slice(-300);
   material.push(e);
   if(e.family==='CROSS'){
    const sibling=[...s.eventHistory].reverse().find(x=>x.tf===e.tf&&x.family==='NATIVE'&&
      x.dir===e.dir&&Math.abs(x.observedAt-e.observedAt)<=(e.tf==='3m'?TF3:TF15));
    e.linkedTo=sibling&&sibling.key||null;
    e.relation=sibling?'LINKED_NATIVE_SAME_OSCILLATOR':'CROSS_UNPAIRED_UNDER_OBSERVATION';
   }else if(e.family==='NATIVE'){
    const sibling=[...s.eventHistory].reverse().find(x=>x.tf===e.tf&&x.family==='CROSS'&&
      x.dir===e.dir&&Math.abs(x.observedAt-e.observedAt)<=(e.tf==='3m'?TF3:TF15));
    if(sibling){sibling.linkedTo=e.key;sibling.relation='LINKED_NATIVE_SAME_OSCILLATOR';}
   }
   s.eventHistory.push(e);s.eventHistory=s.eventHistory.slice(-130);
  }
  if(e.family!=='NATIVE'||!['OBSERVED','CONFIRMED'].includes(e.status))continue;
  const key=e.key;
  let x=s.attempts.find(a=>a.id===key);
  if(!x){
   x={id:key,tf:e.tf,direction:e.dir,sourceTs:e.sourceTs,observedAt:e.observedAt,
     originPrice:e.price??price,lastPrice:price,highPrice:price,lowPrice:price,
     confirmed:false,consequence:'OBSERVING',parentAtOrigin:parentDirection,
     favourableMax:0,adverseMax:0,retainedUsd:null,settledAt:null};
   s.attempts.push(x);s.attempts=s.attempts.slice(-110);
  }
  if(e.status==='CONFIRMED')x.confirmed=true;
 }
 for(const x of s.attempts){
  if(x.observedAt>ts)continue;
  x.lastPrice=price;x.highPrice=Math.max(x.highPrice,price);x.lowPrice=Math.min(x.lowPrice,price);
  const f=sense(x.direction,price-x.originPrice);
  x.retainedUsd=round(f);
  x.favourableMax=round(Math.max(x.favourableMax,sense(x.direction,x.highPrice-x.originPrice),
      sense(x.direction,x.lowPrice-x.originPrice),0));
  x.adverseMax=round(Math.max(x.adverseMax,-sense(x.direction,x.highPrice-x.originPrice),
      -sense(x.direction,x.lowPrice-x.originPrice),0));
  if(x.settledAt===null&&ts-x.observedAt>=TF15){
   x.settledAt=ts;
   x.consequence=f>0?'TERRITORY_RETAINED':'TERRITORY_NOT_RETAINED';
  }else if(x.settledAt===null)x.consequence='OUTCOME_PENDING';
 }
 return material;
}
function step(previous,{sample,bars15=[],bars3=[],bars1h=[],bars4h=[],levels=[],events=[],levelMode='CURRENT'}){
 const s=previous&&previous.version===VERSION?previous:initial();
 const ts=val(sample?.ts),price=val(sample?.price);
 if(ts===null||price===null||ts<=s.at)return {state:s,changed:false,reason:'DUPLICATE_OR_MISSING'};
 const b15=causalBars(bars15,TF15,ts),b3=causalBars(bars3,TF3,ts);
 const closed15=b15.at(-1)?.ts??null,closed3=b3.at(-1)?.ts??null;
 const lag15=closed15===null?null:Math.max(0,ts-(closed15+TF15));
 const lag3=closed3===null?null:Math.max(0,ts-(closed3+TF3));
 const integrity=lag15===null||lag3===null?'UNKNOWN':
   lag15>20*MINUTE||lag3>9*MINUTE?'STALE_CONFIRMED_MCB':'ASOF_OK';
 const t15=trajectory.evaluate({history:b15},'15m');
 const t3=trajectory.evaluate({history:b3},'3m');
 const t1h=trajectory.evaluate({history:causalBars(bars1h,60*MINUTE,ts)},'1h');
 const t4h=trajectory.evaluate({history:causalBars(bars4h,4*60*MINUTE,ts)},'4h');
 const parent=t15.structuralDirection||null,child=t3.structuralDirection||null;
 const material=updateAttempts(s,events,ts,price,parent);
 const elasticLag=s.lastElasticObservedAt===null?null:Math.max(0,ts-s.lastElasticObservedAt);
 const elasticFreshness=elasticLag===null?'NO_EVENT_HISTORY':
    elasticLag>15*MINUTE?'STALE_ELASTIC_EVENTS':'EVENT_STREAM_OBSERVED';
 s.priceHistory.push({ts,price,mf15:val(sample.mf15),mf15Slope:val(sample.mf15Slope),
   pmLive:val(sample.pmLive),lbw15:val(sample.lbw15),lbw3:val(sample.lbw3)});
 s.priceHistory=s.priceHistory.slice(-170);
 const profile=location(price,levelMode==='CURRENT'?levels:[],b15,ts);
 const selectedFrontier=profile.profileFrontier?
   {...profile.profileFrontier,side:price<profile.profileFrontier.price?'below':'above'}:
   profile.nearest;
 const memory=updateBoundary(s.boundaryMemory,selectedFrontier,ts,price);
 const now15=s.attempts.filter(x=>x.tf==='15m'&&ts-x.observedAt<=180*MINUTE);
 const up15=now15.filter(x=>x.direction==='long'),down15=now15.filter(x=>x.direction==='short');
 const up3=s.attempts.filter(x=>x.tf==='3m'&&ts-x.observedAt<=90*MINUTE&&x.direction==='long');
 const down3=s.attempts.filter(x=>x.tf==='3m'&&ts-x.observedAt<=90*MINUTE&&x.direction==='short');
 const lastUp=up15.at(-1),lastDown=down15.at(-1);
 const origin=s.priceHistory.find(x=>x.ts<=ts-60*MINUTE);
 const hourPrice=origin?round(price-origin.price):null;
 const mfOrigin=origin&&origin.mf15;
 const mfChange=mfOrigin!==null&&mfOrigin!==undefined&&val(sample.mf15)!==null?
    round(sample.mf15-mfOrigin):null;
 const causes=[],counter=[],uncertainty=[];
 if(elasticFreshness!=='EVENT_STREAM_OBSERVED')
  uncertainty.push('Chronologie E3/E15/QUALITÉ Elastic non fraîche ; pas de nouvelle synchronisation affirmée');
 if(parent)causes.push('Trajectoire E15→E15 confirmée '+parent.toUpperCase()+
     ' depuis pivot '+(t15.lastStructuralPivot?.type||'?'));
 else uncertainty.push('Trajectoire E15→E15 indisponible');
 causes.push('Position '+profile.valueArea+
   (profile.nearest?' ; frontière voisine '+profile.nearest.key+' '+profile.nearest.price:''));
 if(mfChange!==null)causes.push('MF15 évolution 1h '+(mfChange>=0?'+':'')+mfChange.toFixed(1));
 if(hourPrice!==null)causes.push('Terrain prix 1h '+(hourPrice>=0?'+':'')+hourPrice.toFixed(1)+' $');
 const recUp=up15.length+up3.length,recDown=down15.length+down3.length;
 let phase='STRUCTURE_OBSERVED',direction=parent;
 if(parent&&child&&child!==parent){
  phase='COUNTER_ATTACK_IN_PROGRESS';
  counter.push('Structure E3 '+child.toUpperCase()+' opposée à E15→E15 '+parent.toUpperCase());
 }
 if(parent&&up15.length&&parent==='short'){
  phase='REBOUND_CONTESTING_DOWNTREND';
  counter.push(up15.length+' E15 UP observé(s) distinct(s) sur 3h ; tenue du prix à qualifier');
 }
 if(parent&&down15.length&&parent==='long'){
  phase='PULLBACK_CONTESTING_UPTREND';
  counter.push(down15.length+' E15 DN observé(s) distinct(s) sur 3h ; tenue du prix à qualifier');
 }
 if(parent&&hourPrice!==null&&sense(parent,hourPrice)<0){
  if(phase==='STRUCTURE_OBSERVED')phase='STRUCTURAL_BIAS_CONTESTED_BY_PRICE';
  counter.push('Prix 1h opposé au trajet E15→E15 : '+hourPrice+' $, maturité contestée');
 }
 if(integrity!=='ASOF_OK'){
  phase='SOURCE_GAP_STRUCTURE_NOT_CURRENT';
  uncertainty.push('Bougies MCB confirmées insuffisamment fraîches : dernière structure seulement historique');
 }else if(memory&&memory.stage==='RETEST_HELD_PROVISIONAL')phase='BOUNDARY_RETEST_HELD_PROVISIONAL';
 else if(memory&&memory.stage==='CROSS_REJECTED')phase='BOUNDARY_RECLAIM_REJECTED';
 else if(memory&&memory.stage==='CROSSED_UNTESTED')phase='BOUNDARY_CROSSED_UNTESTED';
 const q=s.lastQuality&&ts-s.lastQuality.observedAt<=10*MINUTE?s.lastQuality:null;
 s.qualityHistory.push({ts,quality:q&&q.quality||'UNKNOWN',direction:q&&q.direction||null});
 s.qualityHistory=s.qualityHistory.slice(-125);
 const qualityCounts={};const qs=s.qualityHistory.filter(x=>ts-x.ts<=60*MINUTE);
 for(const x of qs)qualityCounts[x.quality]=(qualityCounts[x.quality]||0)+1;
 const recentSignalEvents=s.eventHistory.filter(e=>ts-e.observedAt<=60*MINUTE)
   .slice(-12).map(e=>({kind:e.family,tf:e.tf,direction:e.dir,status:e.status,
     observedAt:e.observedAt,sourceTs:e.sourceTs,linkedTo:e.linkedTo||null,
     relation:e.relation||null}));
 const latestAttacks=[...s.attempts].slice(-14).map(x=>({tf:x.tf,dir:x.direction,
   observedAt:x.observedAt,confirmed:x.confirmed,consequence:x.consequence,
   retainedUsd:x.retainedUsd,favourableMax:x.favourableMax,
   parentAtOrigin:x.parentAtOrigin}));
 const scenarios=[];
 if(profile.valueArea!=='VALUE_UNKNOWN'){
  const {VAL,POC,VAH}=profile.profile;
  scenarios.push({kind:price<VAL?'RECLAIM_VALUE':'DEFEND_VALUE_REINTEGRATION',conditional:true,
    required:price<VAL?'franchissement puis conservation VAL '+VAL:
      'conserver la zone de valeur au-dessus du VAL '+VAL+' après contre-attaque',
    nextIfConfirmed:['POC '+POC,'VAH '+VAH]});
  scenarios.push({kind:'REJECT_OR_LOSE_VALUE',conditional:true,
    required:price<VAL?'rejet au VAL '+VAL:'perte du VAL '+VAL+' après la reprise',
    nextIfConfirmed:'revisiter les soutiens locaux historiques'});
 }
 scenarios.push({kind:'CONTINUATION',conditional:true,
   required:'conservation du terrain dans le sens '+(parent||'INCONNU')});
 const story={version:VERSION,decisionImpact:false,tradingEnabled:false,ts,price,
  structure:{direction:parent,state:t15.structuralState,pivot:t15.lastStructuralPivot,
    confirmedAt:t15.structuralConfirmedAt,
    trajectorySource:'CONFIRMED_E15_E_TO_E',childDirection:child,
    childPivot:t3.lastStructuralPivot,
    context1h:{direction:t1h.structuralDirection,pivot:t1h.lastStructuralPivot},
    context4h:{direction:t4h.structuralDirection,pivot:t4h.lastStructuralPivot}},
  enjeu:profile,boundary:memory,phase,direction,proposedScenarios:scenarios,
  supporting:causes,contesting:counter,uncertainties:uncertainty,
  synchronizedSignals:{recent:recentSignalEvents,
    linkedCrossCount:recentSignalEvents.filter(e=>e.relation==='LINKED_NATIVE_SAME_OSCILLATOR').length,
    note:'Crossing BW/LBW and E3/E15 associated signals are one oscillator event family, not independent votes'},
  attempts:{recent:latestAttacks,e15Up3h:up15.length,e15Down3h:down15.length,
    e3Up90m:up3.length,e3Down90m:down3.length},
  horizon:{priceNet1h:hourPrice,mf15Delta1h:mfChange,
    lbw15:val(sample.lbw15),mf15:val(sample.mf15)},
  conversion:{quality:q&&q.quality||null,qualityDirection:q&&q.direction||null,
    qualityCounts1h:qualityCounts,
    qualityCoverage:round(qs.filter(x=>x.quality!=='UNKNOWN').length/Math.max(1,qs.length)),
    pmLive:val(sample.pmLive),role:'DESCRIPTION_ONLY_NOT_TREND_AUTHORITY'},
  qualification:'RESEARCH_HYPOTHESIS_NOT_TRADE_ADMISSION',
  evidenceAsOf:{sampleTs:ts,latestConfirmed15mBar:closed15,
    latestConfirmed3mBar:closed3,confirmed15mLagMs:lag15,confirmed3mLagMs:lag3,
    dataIntegrity:integrity,elasticEventLagMs:elasticLag,elasticEventStatus:elasticFreshness,
    profileLevelMode:levelMode,materialEvents:material.length}};
 s.at=ts;s.lastHypothesis=story;s.observationCount++;
 if(material.length||s.observationCount===1||phase!==s.lastPhase){
  s.summaries.push({ts,phase,parent,child,price,boundary:profile.nearest?.key||null,
    materialEvents:material.length,e15Up3h:up15.length,mf15:sample.mf15});
  s.summaries=s.summaries.slice(-300);
 }
 s.lastPhase=phase;
 return {state:s,story,changed:true,events:material};
}
module.exports={VERSION,initial,step,causalBars,location,interpretEvent};
