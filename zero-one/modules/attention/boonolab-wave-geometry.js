'use strict';
// Numeric morphology of the WHOLE recent LBW15/BW15 TRAJECTORIES, not isolated
// 3-minute booleans. All inputs are Bâton observations known AS-OF timestamp.
// STRICTLY SHADOW: no position, broker, trade direction or PAPER authority.
const VERSION='boonolab-wave-geometry-signature-v0.1';
const MIN=60000, HOUR=60*MIN, MAX=8*HOUR;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const r=(v,d=3)=>finite(v)?Math.round(v*10**d)/10**d:null;
const val=x=>x.live15LbwRaw;
const bw=x=>x.live15BwRaw;
const gap=x=>val(x)-bw(x);
const sign=v=>v>0?'UP':v<0?'DN':'FLAT';
function known(rows,at,maxLag=90000){
 let left=0,right=rows.length;
 while(left<right){const m=(left+right)>>1;
  if(rows[m].ts<=at)left=m+1;else right=m;}
 const x=rows[left-1]||null;
 return x&&at-x.ts>=0&&at-x.ts<=maxLag?x:null;
}
function velocity(a,b,fn){
 if(!a||!b||a.ts<=b.ts)return null;
 return (fn(a)-fn(b))/((a.ts-b.ts)/MIN);
}
function range(q,field){
 const a=q.map(field).filter(finite);
 if(a.length<2)return null;
 return Math.max(...a)-Math.min(...a);
}
function downsample(q,interval=3*MIN){
 const bins=new Map();
 for(const x of q)bins.set(Math.floor(x.ts/interval),x);
 return [...bins.values()].sort((a,b)=>a.ts-b.ts);
}
function segments(q){
 const a=downsample(q),all=[];
 if(a.length<3)return [];
 let group=null;
 for(let i=1;i<a.length;i++){
  const prev=a[i-1],now=a[i],delta=val(now)-val(prev);
  if(!delta)continue;
  const dir=sign(delta);
  if(group&&dir===group.dir){
   group.endAt=now.ts;group.endLbw=val(now);group.endBw=bw(now);
   group.endPrice=now.lastPrice;group.points++;
  }else{
   if(group)all.push(group);
   group={dir,startAt:prev.ts,endAt:now.ts,
    startLbw:val(prev),endLbw:val(now),
    startBw:bw(prev),endBw:bw(now),
    startPrice:prev.lastPrice,endPrice:now.lastPrice,points:2};
  }
 }
 if(group)all.push(group);
 return all.map(g=>({direction:g.dir,startAt:g.startAt,endAt:g.endAt,
  durationMin:r((g.endAt-g.startAt)/MIN,1),
  lbwTravel:r(g.endLbw-g.startLbw,2),
  bwTravel:r(g.endBw-g.startBw,2),
  priceTravelUsd:r(g.endPrice-g.startPrice,1),
  samples:g.points})).slice(-9);
}
function angleAt(q,point,amp){ // stable, explicit normalization
 if(!point||!finite(amp)||amp<=0)return null;
 const previous=known(q,point.ts-3*MIN);
 if(!previous)return null;
 const slopeL=velocity(point,previous,val);
 const slopeB=velocity(point,previous,bw);
 const normalize=v=>Math.atan(v*15/amp)*180/Math.PI;
 return {at:point.ts,lbwAngleDeg:r(normalize(slopeL),2),
  bwAngleDeg:r(normalize(slopeB),2),
  relativeAngleDeg:r(normalize(slopeL)-normalize(slopeB),2),
  lbwSpeed:r(slopeL,4),bwSpeed:r(slopeB,4),
  gapSpeed:r(slopeL-slopeB,4),
  normalization:{mcbAmplitudeRange:r(amp,3),
   horizontalTimeMin:15,
   caveat:'CONVENTIONAL_NORMALIZATION_NOT_TRADINGVIEW_PIXEL_ANGLE'}};
}
function compute(audit,asOf){
 if(!finite(asOf))throw Error('WAVE_GEOMETRY_REQUIRED_ASOF');
 const all=(audit||[]).filter(x=>finite(x.ts)&&x.ts<=asOf&&
  x.ts>=asOf-MAX&&finite(val(x))&&finite(bw(x))&&
  finite(x.lastPrice)).sort((a,b)=>a.ts-b.ts);
 const last=all.at(-1);
 const avail=last&&asOf-last.ts<=90000&&all.length>=100;
 if(!avail)return {version:VERSION,asOf,available:false,
  samples:all.length,decisionImpact:false,brokerOrdersEnabled:false,
  reason:'INSUFFICIENT_OR_STALE_ASOF_WAVE'};
 const q4=all.filter(x=>x.ts>=asOf-4*HOUR);
 const q1=all.filter(x=>x.ts>=asOf-HOUR);
 const q15=all.filter(x=>x.ts>=asOf-15*MIN);
 const prior3=known(all,last.ts-3*MIN),prior6=known(all,last.ts-6*MIN);
 const prior15=known(all,last.ts-15*MIN),prior60=known(all,last.ts-HOUR);
 const lbw3=velocity(last,prior3,val),bw3=velocity(last,prior3,bw);
 const lbwPrev3=velocity(prior3,prior6,val);
 const bwPrev3=velocity(prior3,prior6,bw);
 const lbw15=velocity(last,prior15,val),bw15=velocity(last,prior15,bw);
 const lbw60=velocity(last,prior60,val),bw60=velocity(last,prior60,bw);
 const amplitude8=range(all,val),amplitude4=range(q4,val);
 const envelope=Math.max(0,...all.map(x=>val(x)),...all.map(x=>bw(x)))-
  Math.min(0,...all.map(x=>val(x)),...all.map(x=>bw(x)));
 const amp=amplitude4&&amplitude4>0?amplitude4:envelope;
 // Reference for the INTENSITY of the shape: actual 3m gap velocities
 // along the last eight hours, not a fixed indicator-unit cutoff.
 const coarse=downsample(all,3*MIN);
 const pastGapSpeeds=coarse.slice(1).map((x,i)=>
  Math.abs(velocity(x,coarse[i],gap))).filter(finite).sort((a,b)=>a-b);
 const typicalSpeed=pastGapSpeeds.length?
  pastGapSpeeds[Math.floor((pastGapSpeeds.length-1)*.5)]:null;
 const p75GapSpeed=pastGapSpeeds.length?
  pastGapSpeeds[Math.floor((pastGapSpeeds.length-1)*.75)]:null;
 const min=Math.min(...all.map(val)),max=Math.max(...all.map(val));
 const location=max>min?(val(last)-min)/(max-min):null;
 const low=all.find(x=>val(x)===min),high=all.find(x=>val(x)===max);
 const swings=segments(all);
 const pastCrosses=[];
 for(let i=1;i<all.length;i++){
  const p=all[i-1],x=all[i],g0=gap(p),g1=gap(x);
  if(g0*g1<0 || (g0===0&&g1!==0)){
   pastCrosses.push({at:x.ts,price:x.lastPrice,mf15:x.live15MfRaw,
    from:sign(g0),to:sign(g1),gapBefore:r(g0,3),
    gapAfter:r(g1,3)});
  }
 }
 const lastCross=pastCrosses.at(-1)||null;
 const crossPoint=lastCross?known(all,lastCross.at):null;
 const crossKnown=lastCross&&crossPoint?{
  ...lastCross,
  ageMin:r((last.ts-lastCross.at)/MIN,2),
  angle:angleAt(all,crossPoint,
   range(all.filter(x=>x.ts>=crossPoint.ts-4*HOUR&&
    x.ts<=crossPoint.ts),val)||amp),
  // This separate angle uses the SAME as-of amplitude reference as the
  // current angle. It is comparable inside this one snapshot, but was
  // not necessarily the reference known at the original cross moment.
  angleComparableAtCurrentScale:angleAt(all,crossPoint,amp)
 }:null;
 const after=lastCross?all.filter(x=>x.ts>=lastCross.at):[];
 const crossDirection=lastCross?lastCross.to:null;
 const signedMove=crossPoint&&crossDirection?
  (crossDirection==='UP'?1:-1)*(last.lastPrice-crossPoint.lastPrice):null;
 const favorable=after.length?Math.max(...after.map(x=>
  (crossDirection==='UP'?1:-1)*(x.lastPrice-crossPoint.lastPrice))):null;
 const adverse=after.length?Math.max(...after.map(x=>
  (crossDirection==='UP'?-1:1)*(x.lastPrice-crossPoint.lastPrice))):null;
 const recentCrosses=pastCrosses.filter(x=>x.at>asOf-HOUR);
 const fractionNear=q1.length? q1.filter(x=>Math.abs(gap(x))<=Math.max(0.2,amp*.04)).length/q1.length:null;
 const v=lbw3!==null&&bw3!==null?lbw3-bw3:null;
 const v15=lbw15!==null&&bw15!==null?lbw15-bw15:null;
 const angleNow=angleAt(all,last,amp);
 return {version:VERSION,asOf,available:true,
  decisionImpact:false,brokerOrdersEnabled:false,
  geometryBasis:'MCB_OSCILLATOR_VALUE_VS_ELAPSED_TIME',
  completeness:{sampleCount:all.length,
   observedHistoryMin:r((last.ts-all[0].ts)/MIN,1),
   maxLookbackHours:8,
   fullWaveGuaranteed:false,
   lastSampleAt:last.ts,ageMs:asOf-last.ts},
  current:{lbw15:r(val(last),3),bw15:r(bw(last),3),
   gap15:r(gap(last),3),gapSide:sign(gap(last)),
   positionInObserved8hLBWRange:r(location,3),
   observedMinLBW:r(min,2),observedMaxLBW:r(max,2),
   observed4hLBWAmplitude:r(amplitude4,2),
   observed8hLBWAmplitude:r(amplitude8,2),
   lowAt:low.ts,highAt:high.ts,
   minutesSinceObservedLow:r((asOf-low.ts)/MIN,2),
   minutesSinceObservedHigh:r((asOf-high.ts)/MIN,2)},
  kinetics:{
   lbwSpeed3mPerMin:r(lbw3,4),bwSpeed3mPerMin:r(bw3,4),
   lbwSpeed15mPerMin:r(lbw15,4),bwSpeed15mPerMin:r(bw15,4),
   lbwSpeed60mPerMin:r(lbw60,4),bwSpeed60mPerMin:r(bw60,4),
   gapSpeed3mPerMin:r(v,4),gapSpeed15mPerMin:r(v15,4),
   medianAbsGapSpeed3mObserved8h:r(typicalSpeed,4),
   p75AbsGapSpeed3mObserved8h:r(p75GapSpeed,4),
   gapSpeedVs8hP75:p75GapSpeed>0?r(Math.abs(v)/p75GapSpeed,3):null,
   lbwAccelPerMin2:r(lbwPrev3!==null&&lbw3!==null?
    (lbw3-lbwPrev3)/3:null,5),
   bwAccelPerMin2:r(bwPrev3!==null&&bw3!==null?
    (bw3-bwPrev3)/3:null,5),
   gapAccelPerMin2:r(lbwPrev3!==null&&bwPrev3!==null&&v!==null?
    (v-(lbwPrev3-bwPrev3))/3:null,5),
   normalizedAngleNow:angleNow},
  morphology:{recentSegments:swings,
   lastSegment:swings.at(-1)||null,
   lastTurnAt:swings.length>1?swings.at(-1).startAt:null,
   lastTurnAgeMin:swings.length>1?
    r((asOf-swings.at(-1).startAt)/MIN,2):null,
   crossEventsLastHour:recentCrosses.length,
   nearContactFractionLastHour:r(fractionNear,3),
   lastCross:crossKnown,
   sinceLastCross:crossKnown?{
    priceMoveInCrossDirectionUsd:r(signedMove,1),
    highestFavorablePriceUsd:r(favorable,1),
    highestAdversePriceUsd:r(adverse,1),
    retainedFavorableFraction:favorable>0?r(signedMove/favorable,3):null,
    mf15Delta:r(finite(last.live15MfRaw)&&finite(crossPoint.live15MfRaw)?
     last.live15MfRaw-crossPoint.live15MfRaw:null,3),
    gapNow:r(gap(last),3),
    separatedSinceCross:sign(gap(last))===crossDirection
   }:null},
  caveats:[
   'Angle is normalized to observed 4h LBW amplitude and 15min horizontal unit, NOT a universal pixel angle',
   'Historical cross angle can be re-expressed at CURRENT as-of amplitude for within-snapshot comparison; original cross-time angle may have a different scale',
   'Curvature is a discrete 3min-velocity difference, not a smooth derivative of price',
   'Trailing 8h is a limited observed curve, not guaranteed to be the complete MCB wave',
   'Crosses are 30s Bâton sign changes; near-zero jitter may generate several contacts',
   'Current wave shape is NOT a calibrated trade admission or exit authority',
   'All quantities are as-of, not future/confirmed swing labels']};
}
module.exports={VERSION,compute,known,velocity,segments,angleAt};
