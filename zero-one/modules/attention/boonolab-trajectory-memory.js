'use strict';
// Market-owned history. Hypotheses survive trades, crosses and E15 updates.
// An attempt is a new observed slope turn; the directional hypothesis retains
// all its previous attempts. A local turn is NOT a confirmed reversal.
const G=require('./boonolab-wave-geometry-v02');
const VERSION='boonolab-trajectory-memory-v0.1';
const {finite,r,dir,diff}=G;
const D=['UP','DN'], sg=d=>d==='UP'?1:-1;
const cap=(a,n)=>{if(a.length>n)a.splice(0,a.length-n);};
const opposite=d=>d==='UP'?'DN':'UP';
const snap=(g,knownAt,kind)=>({kind,sourceAt:g.sourceAt,knownAt,price:g.price,L:g.L,B:g.B,G:g.G,provenance:g.provenance??'UNKNOWN',
 k3:g.k[3],k15:g.k[15],acceleration:g.acceleration,mf15:g.conversion.mf15,mf3:g.conversion.mf3,
 pm3:g.conversion.pm3,pmLive:g.conversion.pmLive});
function initial(at=0){
 return {version:VERSION,mode:'SHADOW_ONLY',decisionImpact:false,brokerOrdersEnabled:false,
  createdAt:at,lastSourceAt:0,lastKnownAt:0,observations:0,bootstrapObservations:0,
  liveObservations:0,recoveryObservations:0,rows:[],seq:0,lastSlope:null,lastGap:null,lastTactical:null,
  confirmed:{},native:{},lastCross:null,lastConfirmedCross:null,confirmedE15:null,
  refs:[],events:[],hypotheses:Object.fromEntries(D.map(d=>[d,{direction:d,id:'TRACK_'+d,
   firstOrigin:null,firstInflexion:null,attemptCount:0,active:null,previous:[],milestones:[],crossHistory:[],confirmedHistory:[],nativeHistory:[],crossAnchor:null,crossEpisodes:[],initiative:null,initiativeNo:0,priorInitiatives:[]}]))};
}
function emit(s,events,type,at,sourceAt,detail={}){
 const e={id:++s.seq,type,knownAt:at,sourceAt,provenance:s.currentProvenance??'UNKNOWN',...detail,decisionImpact:false,brokerOrdersEnabled:false};
 s.events.push(e);cap(s.events,100);events.push(e);return e;
}
function reference(s,a,knownAt){
 if(!a?.peak||!finite(a.peak.price))return;
 s.refs.push({...a.peak,kind:'ATTEMPT_PRICE_EXTREME',direction:a.direction,attemptId:a.id,
  referenceKnownAt:knownAt});cap(s.refs,160);
}
function startInitiative(s,h,g,at,kind,events){
 if(h.initiative){
  const q=h.initiative;q.closedAt=at;
  if(q.peak){s.refs.push({...q.peak,kind:'INITIATIVE_PRICE_EXTREME',direction:h.direction,attemptId:q.id,referenceKnownAt:at});cap(s.refs,160);}
  h.priorInitiatives.push(q);cap(h.priorInitiatives,18);
 }
 const a=snap(g,at,kind);
 h.initiative={id:h.id+'_INIT_'+(++h.initiativeNo),origin:a,originKind:kind,
  parentAtBirth:s.confirmedE15,peak:a,trough:a,lastPrice:g.price,pricePath:0,
  crosses:[],confirmedCrosses:[],nativeE15:[],rotations:[],observations:0};
 emit(s,events,'TRAJECTORY_INITIATIVE_BEGINS',at,g.sourceAt,{direction:h.direction,initiativeId:h.initiative.id,originKind:kind,price:g.price,L:g.L,B:g.B});
}
function updateInitiative(h,g,at){
 const q=h.initiative;if(!q)return;
 const d=sg(h.direction),p=g.price,move=d*(p-q.origin.price),pt=snap(g,at,'OBSERVATION');
 q.pricePath+=Math.abs(p-q.lastPrice);q.lastPrice=p;q.observations++;
 if(d*(p-q.peak.price)>0)q.peak=pt;
 if(d*(p-q.trough.price)<0)q.trough=pt;
 const favorable=d*(q.peak.price-q.origin.price);
 q.progress={ageMin:r((g.sourceAt-q.origin.sourceAt)/60000,2),price:r(move,2),
  favorable:r(favorable,2),adverse:r(d*(q.trough.price-q.origin.price),2),
  retained:favorable>0?r(move/favorable):null,L:r(g.L-q.origin.L),B:r(g.B-q.origin.B),
  gapTravelSigned:r(d*(g.G-q.origin.G)),path:r(q.pricePath,2),
  efficiency:q.pricePath>0?r(move/q.pricePath):null};
}
function startAttempt(s,h,g,at,origin,events){
 if(h.active){reference(s,h.active,at);h.active.closedAt=at;h.previous.push(h.active);cap(h.previous,18);}
 const a=snap(g,at,origin);
 const id=h.id+'-'+(++h.attemptCount);
 if(!h.firstOrigin)h.firstOrigin=a;
 if(origin==='LBW15_SLOPE_ROTATION'){
  if(!h.firstInflexion)h.firstInflexion=a;
  const preCross=g.gapSide&&g.gapSide!==h.direction;
  if(!h.initiative||(preCross&&(h.initiative.crosses.length>0||h.initiative.originKind!=='PRE_CROSS_LBW_ROTATION')))
   startInitiative(s,h,g,at,preCross?'PRE_CROSS_LBW_ROTATION':'ROTATION_WITHIN_EXISTING_POLARITY',events);
  h.initiative.rotations.push(a);cap(h.initiative.rotations,48);
 }
 h.active={id,direction:h.direction,origin:a,originKind:origin,parentE15AtBirth:s.confirmedE15,
  inheritedLiveCross:s.lastCross,liveCrosses:[],confirmedCrosses:[],nativeE15Events:[],
  peak:a,trough:a,pricePath:0,lastPrice:g.price,observations:0,maxSignedGap:sg(h.direction)*g.G,
  minSignedGap:sg(h.direction)*g.G,highestL:a,lowestL:a,highestB:a,lowestB:a,
  lastSupport:null,supportChanges:[],frontier:null,visits:[],currentVisit:null,
  provenance:origin==='OBSERVED_CONTEXT_NO_ORIGIN'?'ORIGIN_NOT_OBSERVED':'OBSERVED_SLOPE_TURN'};
 emit(s,events,'LBW_HYPOTHESIS_ATTEMPT',at,g.sourceAt,{direction:h.direction,attemptId:id,origin,
  parent:s.confirmedE15?.direction??null,price:g.price,L:g.L,B:g.B});
}
function updateAttempt(s,h,g,at,events,barRange){
 const a=h.active;if(!a)return;
 const d=sg(h.direction),p=g.price,origin=a.origin.price;
 a.observations++;a.pricePath+=Math.abs(p-a.lastPrice);a.lastPrice=p;
 const point=snap(g,at,'OBSERVATION');
 if(d*(p-a.peak.price)>0)a.peak=point;
 if(d*(p-a.trough.price)<0)a.trough=point;
 if(g.L>a.highestL.L)a.highestL=point;if(g.L<a.lowestL.L)a.lowestL=point;
 if(g.B>a.highestB.B)a.highestB=point;if(g.B<a.lowestB.B)a.lowestB=point;
 a.maxSignedGap=Math.max(a.maxSignedGap,d*g.G);a.minSignedGap=Math.min(a.minSignedGap,d*g.G);
 a.progress={ageMin:r((g.sourceAt-a.origin.sourceAt)/60000,2),price:r(d*(p-origin),2),
  favorable:r(d*(a.peak.price-origin),2),adverse:r(d*(a.trough.price-origin),2),
  retained:d*(a.peak.price-origin)>0?r(d*(p-origin)/(d*(a.peak.price-origin))):null,
  L:r(g.L-a.origin.L),B:r(g.B-a.origin.B),gap:r(g.G-a.origin.G),
  gapTravelSigned:r(d*(g.G-a.origin.G)),path:r(a.pricePath,2),
  efficiency:a.pricePath>0?r(d*(p-origin)/a.pricePath):null,
  extensionVsTypical3m:barRange>0?r(d*(p-origin)/barRange):null};
 const refs=s.refs.filter(q=>q.direction===h.direction&&q.referenceKnownAt<=a.origin.knownAt&&q.attemptId!==a.id);
 const nearest=refs.reduce((best,q)=>!best||Math.abs(p-q.price)<Math.abs(p-best.price)?q:best,null);
 const paired=refs.filter(q=>finite(q.L)&&finite(q.B)).reduce((best,q)=>!best||Math.abs(p-q.price)<Math.abs(p-best.price)?q:best,null);
 a.nearestPairedExtreme=paired?{ref:paired,priceDifference:r(p-paired.price,2),
  distanceVsTypical3m:barRange>0?r(Math.abs(p-paired.price)/barRange):null,
  lbwDifference:r(g.L-paired.L),bwDifference:r(g.B-paired.B),
  mf15Difference:r(diff(g.conversion.mf15,paired.mf15)),sameTerritoryNotProven:true}:null;
 // The actual observed Cross is a separate persistent origin; local
 // rotations never reset its price and geometry history.
 const ca=h.crossAnchor;
 if(ca){
  const move=d*(p-ca.event.price);
  ca.maxFavorable=Math.max(ca.maxFavorable,move);ca.maxAdverse=Math.min(ca.maxAdverse,move);
  ca.path+=Math.abs(p-ca.lastPrice);ca.lastPrice=p;
  ca.progress={ageMin:r((g.sourceAt-ca.event.sourceAt)/60000,2),price:r(move,2),
   favorable:r(ca.maxFavorable,2),adverse:r(ca.maxAdverse,2),
   retained:ca.maxFavorable>0?r(move/ca.maxFavorable):null,
   L:r(g.L-ca.event.L),B:r(g.B-ca.event.B),
   gapTravelSigned:r(d*(g.G-(ca.event.L-ca.event.B))),
   efficiency:ca.path>0?r(move/ca.path):null};
 }
 a.nearestPreviousExtreme=nearest?{ref:nearest,priceDifference:r(p-nearest.price,2),
  distanceVsTypical3m:barRange>0?r(Math.abs(p-nearest.price)/barRange):null,
  lbwDifference:r(diff(g.L,nearest.L)),bwDifference:r(diff(g.B,nearest.B)),
  mf15Difference:r(diff(g.conversion.mf15,nearest.mf15)),sameTerritoryNotProven:true}:null;
 // Freeze the closest frontier in the direction of the attempt at its start.
 // A crossing/return is a measured relation, not an accepted retest or support.
 if(!a.frontier){
  const ahead=refs.filter(q=>d*(q.price-origin)>0).sort((x,y)=>Math.abs(x.price-origin)-Math.abs(y.price-origin));
  if(ahead.length)a.frontier={ref:ahead[0],firstBeyondAt:null,lastReturnAt:null,relation:'NOT_REACHED',crossings:0};
 }
 if(a.frontier){
  const f=a.frontier,relation=d*(p-f.ref.price)>0?'BEYOND':d*(p-f.ref.price)<0?'INSIDE':'AT_REFERENCE';
  if(relation!==f.relation){
   if(relation==='BEYOND'){f.firstBeyondAt??=at;f.crossings++;}
   if(relation==='INSIDE'&&f.firstBeyondAt)f.lastReturnAt=at;
   if(relation==='BEYOND'||f.firstBeyondAt){
    const e=emit(s,events,'TERRITORY_RELATION_CHANGED',at,g.sourceAt,{direction:h.direction,attemptId:a.id,
     referenceAt:f.ref.sourceAt,referencePrice:f.ref.price,relation,price:p});
    a.visits.push(e);cap(a.visits,12);
   }
   f.relation=relation;
  }
 }
}
function support(s,h,g,at,events){
 const a=h.active;if(!a)return;
 const d=sg(h.direction),rel=n=>!finite(n)?'UNKNOWN':n*d>0?'SUPPORT':n*d<0?'OPPOSE':'NEUTRAL';
 const relDir=x=>!x?'UNKNOWN':x===h.direction?'SUPPORT':'OPPOSE';
 const v={LBW3:rel(g.k[3].L),LBW15:rel(g.k[15].L),BW3:rel(g.k[3].B),gap3:rel(g.k[3].G),
  priceFromOrigin:rel(a.progress.price*d),price3:rel(g.k[3].price),
  E3_geometry:relDir(g.tactical.side),E3_native_live:relDir(g.tactical.e3LiveObserved),
  E3_confirmed:relDir(s.native['3m']?.direction),E15_native:relDir(s.confirmedE15?.direction),
  Cross15Live:relDir(g.gapSide),Cross15Confirmed:relDir(s.lastConfirmedCross?.direction),
  PMlive:rel(g.conversion.pmLive),PM3:rel(g.conversion.pm3),MF3:rel(g.conversion.mf3Change),MF15:rel(g.conversion.mf15Change),
  E1:relDir(s.native['1h']?.direction),E4:relDir(s.native['4h']?.direction),
  LBW1:rel(s.confirmed['1h']?.lbwChange),LBW4:rel(s.confirmed['4h']?.lbwChange)};
 const changes=Object.entries(v).filter(([k,x])=>a.lastSupport?.[k]!==x).map(([k,to])=>({family:k,from:a.lastSupport?.[k]??null,to}));
 if(changes.length){
  a.supportChanges.push({knownAt:at,sourceAt:g.sourceAt,changes});cap(a.supportChanges,36);
 }
 a.lastSupport=v;
}
function updateConfirmed(s,contexts,at,g,events,provenance){
 for(const tf of ['3m','15m','1h','4h']){
  const c=contexts?.[tf];if(!c?.latest||c.latest.closeAt>at)continue;
  const last=s.confirmed[tf];
  if(!last||c.latest.sourceAt>last.sourceAt){
   s.confirmed[tf]={...c.latest,knownAt:at,lbwChange:c.previous?diff(c.latest.L,c.previous.L):null,
    bwChange:c.previous?diff(c.latest.B,c.previous.B):null,availability:provenance};
   const pside=dir(c.previous?c.previous.L-c.previous.B:null),side=dir(c.latest.L-c.latest.B);
   if(tf==='15m'&&pside&&side&&pside!==side){
    const e=emit(s,events,'CROSS15_CONFIRMED',at,c.latest.sourceAt,{direction:side,barCloseAt:c.latest.closeAt,
      availability:provenance,priceAtObservation:g.price,L:c.latest.L,B:c.latest.B});
    s.lastConfirmedCross=e;
    const h=s.hypotheses[side],a=h.active;h.confirmedHistory.push(e);cap(h.confirmedHistory,36);if(h.initiative){h.initiative.confirmedCrosses.push(e);cap(h.initiative.confirmedCrosses,24);}if(a){a.confirmedCrosses.push(e);cap(a.confirmedCrosses,18);}
   }else if(tf==='15m'&&!s.lastConfirmedCross&&c.lastCross){
    s.lastConfirmedCross={...c.lastCross,knownAt:at,availability:'INITIAL_CLOSED_HISTORY_REFERENCE',notAnObservedTransition:true};
   }
   // 3m price pivots require the following closed candle; they are price
   // references only, not a claim about the exact contemporaneous indicator.
   if(tf==='3m'&&c.pivot){
    for(const q of c.pivot){
     if(s.refs.some(x=>x.kind==='CONFIRMED_3M_PRICE_PIVOT'&&x.sourceAt===q.sourceAt&&x.direction===q.direction))continue;
     s.refs.push({...q,kind:'CONFIRMED_3M_PRICE_PIVOT',referenceKnownAt:at,knownAt:at,
      L:null,B:null,mf15:null,availability:provenance});cap(s.refs,160);
    }
   }
  }
  const n=c.lastNative;
  if(n&&n.closeAt<=at&&(!s.native[tf]||n.sourceAt>s.native[tf].sourceAt)){
   const e=emit(s,events,'NATIVE_'+tf.toUpperCase()+'_CONFIRMED',at,n.sourceAt,{direction:n.direction,
    barCloseAt:n.closeAt,availability:provenance,L:n.L,B:n.B,mf:n.mf,priceProxy:n.price,
    priceAtObservation:g.price,initialReference:!s.native[tf]});
   s.native[tf]=e;
   if(tf==='15m'){
    s.confirmedE15=e;
    const h=s.hypotheses[n.direction],a=h.active;h.nativeHistory.push(e);cap(h.nativeHistory,36);if(h.initiative){h.initiative.nativeE15.push(e);cap(h.initiative.nativeE15,24);}if(a){a.nativeE15Events.push(e);cap(a.nativeE15Events,18);}
   }
  }
 }
}
function observe(s,{row,knownAt,contexts={},provenance='LIVE_FILE_OBSERVED'}){
 if(s.version!==VERSION||s.mode!=='SHADOW_ONLY'||s.decisionImpact!==false||s.brokerOrdersEnabled!==false)throw Error('UNTRUSTED_TRAJECTORY_STATE');
 const p=G.point(row);
 if(!p||!finite(knownAt)||p.ts>knownAt||knownAt<s.lastKnownAt||p.ts<=s.lastSourceAt)return {accepted:false,events:[]};
 s.currentProvenance=provenance;
 const events=[],gapMs=s.lastSourceAt?p.ts-s.lastSourceAt:0;
 // Gap is a data quality marker, not a strategy timeout. Do not infer a
 // slope reversal/cross across missing observations.
 if(gapMs>95000){emit(s,events,'OBSERVATION_GAP',knownAt,p.ts,{gapMs});
  s.lastSlope=null;s.lastGap=null;s.lastTactical=null;
  for(const h of Object.values(s.hypotheses)){if(h.active)h.active.coverageInterrupted=true;if(h.crossAnchor)h.crossAnchor.coverageInterrupted=true;if(h.initiative)h.initiative.coverageInterrupted=true;}
 }
 G.trim(s.rows,p);
 const g=G.read(s.rows,knownAt);
 if(!g.available)return {accepted:false,events:[]};
 g.provenance=provenance;
 updateConfirmed(s,contexts,knownAt,g,events,provenance);
 for(const h of Object.values(s.hypotheses))if(!h.active)startAttempt(s,h,g,knownAt,'OBSERVED_CONTEXT_NO_ORIGIN',events);
 if(g.slopeSide&&s.lastSlope&&g.slopeSide!==s.lastSlope){
  startAttempt(s,s.hypotheses[g.slopeSide],g,knownAt,'LBW15_SLOPE_ROTATION',events);
 }
 if(g.gapSide&&s.lastGap&&g.gapSide!==s.lastGap){
  const e=emit(s,events,'CROSS15_LIVE',knownAt,p.ts,{direction:g.gapSide,from:s.lastGap,price:g.price,L:g.L,B:g.B,
   k3:g.k[3],availability:'RAW_BATON_SIGN_CHANGE'});
  s.lastCross=e;
  const h=s.hypotheses[g.gapSide],a=h.active,other=s.hypotheses[opposite(g.gapSide)].active;
  if(h.crossAnchor){h.crossEpisodes.push({...h.crossAnchor,endedAt:knownAt});cap(h.crossEpisodes,24);}
  if(!h.initiative)startInitiative(s,h,g,knownAt,'CROSS_WITH_UNOBSERVED_PRE_CROSS_ORIGIN',events);
  h.initiative.crosses.push(e);cap(h.initiative.crosses,36);
  h.crossHistory.push(e);cap(h.crossHistory,36);h.crossAnchor={event:e,maxFavorable:0,maxAdverse:0,path:0,lastPrice:g.price,progress:null};
  if(a){a.liveCrosses.push(e);cap(a.liveCrosses,24);}
  if(other){other.lastOppositeCross=e;}
 }else if(!s.lastCross&&g.gapSide){
  s.lastCross={direction:g.gapSide,sourceAt:null,knownAt,kind:'POLARITY_ALREADY_OBSERVED',price:null};
 }
 if(g.tactical.side&&s.lastTactical&&g.tactical.side!==s.lastTactical)
  emit(s,events,'CROSS3_LIVE',knownAt,p.ts,{direction:g.tactical.side,from:s.lastTactical,price:g.price,availability:'RAW_BATON_SIGN_CHANGE'});
 for(const [key,value] of [['E3_LIVE_DISPLAY',g.tactical.e3LiveObserved],['E15_LIVE_DISPLAY',g.e15LiveDisplay]]){
  if(s[key]!==value){if(value||s[key])emit(s,events,key+'_CHANGED',knownAt,p.ts,{from:s[key]??null,to:value,
    availability:'BATON_DISPLAY_SIGNAL_NOT_INDEPENDENT_CONFIRMATION'});s[key]=value;}
 }
 const typical=contexts['3m']?.medianRange??null;
 for(const h of Object.values(s.hypotheses)){updateInitiative(h,g,knownAt);updateAttempt(s,h,g,knownAt,events,typical);support(s,h,g,knownAt,events);}
 s.lastSlope=g.slopeSide||s.lastSlope;s.lastGap=g.gapSide||s.lastGap;
 s.lastTactical=g.tactical.side||s.lastTactical;s.lastSourceAt=p.ts;s.lastKnownAt=knownAt;s.observations++;
 if(provenance==='LIVE_FILE_OBSERVED')s.liveObservations++;
 else if(provenance==='HISTORICAL_BOOTSTRAP_CLOSE_PROXY')s.bootstrapObservations++;
 else s.recoveryObservations++;
 s.latestGeometry=g;
 return {accepted:true,geometry:g,events};
}
module.exports={VERSION,initial,observe};
