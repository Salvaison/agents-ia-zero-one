'use strict';
// V5.5.2: first attention on LBW15 slope LIVE, before 15m LIVE cross.
// No autonomous process and no trading authority here. All inputs are as-of.
// Price response is a delta between event anchors; PM windows are NOT summed.
const VERSION='v552-lbw15-causal-vigilance-v1';
const sign=d=>d==='long'?1:d==='short'?-1:0;
const dir=x=>x>0?'long':x<0?'short':null;
const opposite=d=>d==='long'?'short':d==='short'?'long':null;
const num=x=>x===null||x===undefined||x===''?null:
 Number.isFinite(Number(x))?Number(x):null;
const round=x=>x===null?null:Math.round(x*100)/100;
function initial(){
 return {version:VERSION,lastAuditAt:0,lastLbwSlope:null,lastBwSlope:null,
  lastLiveDirection:null,watch:null,events:[],lastConclusion:null,
  lastCampaignId:null,conflicts:0,rejected:0,productive:0};
}
function valid(x){
 if(!x||x.version!==VERSION||!Array.isArray(x.events))
  throw Error('V552_VIGILANCE_MEMORY_UNTRUSTED');
 return x;
}
function medianAbs(values){
 const a=values.filter(x=>Number.isFinite(x)).map(Math.abs).sort((x,y)=>x-y);
 return a.length?a[Math.floor((a.length-1)/2)]:null;
}
function baseline(samples,asOf){
 const r=(samples||[]).filter(x=>x.ts<=asOf&&x.ts>=asOf-240*60000);
 const a=[],b=[],prev=[];
 for(let i=0;i<r.length;i++){
  const x=r[i];if(i>=6){
   const p=r[i-6];
   if(num(x.live15LbwRaw)!==null&&num(p.live15LbwRaw)!==null)
    a.push(x.live15LbwRaw-p.live15LbwRaw);
   if(num(x.live15BwRaw)!==null&&num(p.live15BwRaw)!==null)
    b.push(x.live15BwRaw-p.live15BwRaw);
  }
 }
 return {lbwMedianAbs3m:medianAbs(a),bwMedianAbs3m:medianAbs(b),
  observations:r.length,method:'ROLLING_PREVIOUS_4H_3M_SLOPES_ASOF'};
}
function watchFrom(o,owner,cause){
 return {id:owner+'|'+cause+'|'+o.auditAt,
  owner,challenger:opposite(owner),reason:cause,at:o.auditAt,
  referencePrice:o.price,lastAt:o.auditAt,lastPrice:o.price,
  firstLiveAt:o.mcb15.direction===opposite(owner)?o.auditAt:null,
  firstLivePrice:o.mcb15.direction===opposite(owner)?o.price:null,
  firstLiveGap:o.mcb15.direction===opposite(owner)?o.mcb15.gap:null,
  previousLivePrice:null,previousLiveGap:null,
  consecutiveLive:o.mcb15.direction===opposite(owner)?1:0,
  deepening:false,highestProgressSinceLive:0,
  hadCounterRespiration:false,reclaimedAfterRespiration:false,
  high:o.price,low:o.price,
  maxChallengerProgress:0,maxChallengerAdverse:0,
  samples:0,pmFavourable:0,pmAdverse:0,pmSignFlips:0,lastPmSign:null,
  cross3Opposite:0,events:[],
  status:'OBSERVING',lastEvidence:null,
  confirmedAt:null,conclusion:null,
  indicator:'WATCH_IS_NOT_AN_ORDER'};
}
function event(state,o,type,details={}){
 const e={at:o.auditAt,price:o.price,family:'V552_CAUSAL_ATTENTION',
  type,...details,decisionImpact:type==='WATCH_OPEN'?false:null};
 state.events=[...state.events,e].slice(-120);
 if(state.watch)state.watch.events=[...state.watch.events,e].slice(-30);
 return e;
}
function assess(o,mem,position=null,samples=[]){
 valid(mem);
 const owner=position?.direction||mem.lastCampaignDirection||o.mcb15.closed?.direction;
 if(!['long','short'].includes(owner))return {phase:'UNKNOWN',view:null,events:[]};
 const t=o.auditAt,seen=t>mem.lastAuditAt;
 const l=num(o.mcb15.slope3),b=num(o.mcb15.bwSlope3),
  gap=num(o.mcb15.gap),live=o.mcb15.direction,
  flipLive=seen&&mem.lastLiveDirection&&live!==mem.lastLiveDirection;
 const sig=sign(owner),slopeAgainst=l!==null&&l*sig<0;
 const convergence=o.mcb15.gapSlope3!==null&&
   o.mcb15.gapSlope3*sig<0;
 const decelerating=seen&&l!==null&&mem.lastLbwSlope!==null&&
   l*sig<mem.lastLbwSlope*sig;
 const preliminary=decelerating&&(slopeAgainst||convergence);
 const ref=baseline(samples,t);
 const flatL=ref.lbwMedianAbs3m!==null&&l!==null&&
  Math.abs(l)<=ref.lbwMedianAbs3m;
 const flatB=ref.bwMedianAbs3m!==null&&b!==null&&
  Math.abs(b)<=ref.bwMedianAbs3m;
 // 'near horizontal' is relative to each wave's observed historical movement.
 // It is a descriptive regime, not a newly invented numeric trade stop.
 const nearFlat=flatL&&flatB;
 // Similar low directional speed in BOTH waves is indecision even when
 // their signs happen to agree. It cannot alone liquidate an open position.
 const eps=[];
 let w=mem.watch;
 if(seen){
  const ownerChanged=mem.lastOwner&&mem.lastOwner!==owner;
  if(ownerChanged&&w){
   event(mem,o,'WATCH_OWNER_CHANGED',{from:mem.lastOwner,to:owner});
   mem.lastConclusion={at:t,result:'OWNER_CHANGED',watchId:w.id};
   w=null;mem.watch=null;
  }
  if(w&&live===owner&&w.firstLiveAt!==null&&t>w.firstLiveAt){
   // A LIVE cross that geometrically returns to its owner is a NEW
   // observation, not permission to carry the former live-cross evidence
   // into the next distinct crossing. Price retention is still recorded.
   const returnedPrice=round(sig*(o.price-w.referencePrice));
   eps.push(event(mem,o,'CROSS15_LIVE_REJECTED_RETURN',
     {watchId:w.id,liveDirection:live,
      ownerPriceChange:returnedPrice,
      priceReclaimed:returnedPrice>=0}));
   mem.rejected++;mem.lastConclusion={at:t,result:'LIVE_GEOMETRY_RETURN',
    watchId:w.id,ownerPriceChange:returnedPrice};
   w=null;mem.watch=null;
  }
  if(!w&&(preliminary||nearFlat||live===opposite(owner))){
   const cause=live===opposite(owner)?'CROSS15_LIVE_OPPOSES_OWNER':
    preliminary?'LBW15_LIVE_PENTE_BREAK':'BOTH_WAVES_LOSE_MOMENTUM';
   w=watchFrom(o,owner,cause);
   mem.watch=w;
   eps.push(event(mem,o,'WATCH_OPEN',{cause,owner,
    lbwSlope3:l,bwSlope3:b,gap,flatRelative:nearFlat}));
  }
  if(w){
   const challenger=w.challenger,cs=sign(challenger);
   w.lastAt=t;w.lastPrice=o.price;
   w.high=Math.max(w.high,o.price);w.low=Math.min(w.low,o.price);
   const progress=cs*(o.price-w.referencePrice);
   w.maxChallengerProgress=Math.max(w.maxChallengerProgress,progress);
   w.maxChallengerAdverse=Math.max(w.maxChallengerAdverse,-progress);
   w.samples++;
   const pmSigned=num(o.pm.live)!==null?cs*o.pm.live:null;
   // A price continuation after an actual adverse counter-pulse
   // gives more evidence than a raw two-sample cross. No time threshold.
   if(w.firstLiveAt!==null&&t>w.firstLiveAt){
    const p=cs*(o.price-w.firstLivePrice);
    if(p<w.highestProgressSinceLive&&w.highestProgressSinceLive>0&&
       (pmSigned===null||pmSigned<=0||
        o.mcb3.direction===owner)){
     w.hadCounterRespiration=true;
    }
    if(p>w.highestProgressSinceLive){
     if(w.hadCounterRespiration&&pmSigned>0)
      w.reclaimedAfterRespiration=true;
     w.highestProgressSinceLive=p;
    }
   }
   const pmSign=pmSigned===null?null:Math.sign(pmSigned);
   if(pmSign>0)w.pmFavourable++;
   else if(pmSign<0)w.pmAdverse++;
   if(pmSign!==null&&w.lastPmSign!==null&&pmSign!==w.lastPmSign)
    w.pmSignFlips++;
   if(pmSign!==null)w.lastPmSign=pmSign;
   if(live===challenger){
    if(w.firstLiveAt===null){
     w.firstLiveAt=t;w.firstLivePrice=o.price;w.firstLiveGap=gap;
     w.consecutiveLive=1;
     eps.push(event(mem,o,'CROSS15_LIVE_OBSERVED',{
      challenger,watchId:w.id,fromOwner:owner,
      priceAtCross:o.price,gapAtCross:gap}));
    }else if(t>w.firstLiveAt){
     w.consecutiveLive++;
     if(w.previousLiveGap!==null&&gap!==null&&
       cs*(gap-w.previousLiveGap)>0)w.deepening=true;
    }
    w.previousLivePrice=o.price;w.previousLiveGap=gap;
   }else{
    w.consecutiveLive=0;w.previousLiveGap=null;w.previousLivePrice=null;
   }
   if(o._newCross3?.direction===challenger){
    w.cross3Opposite++;
    eps.push(event(mem,o,'MCB3_COUNTER_EVIDENCE',{
     direction:challenger,crossAt:o._newCross3.at,
     crossVelocity:o._newCross3.crossVelocityPerMinute}));
   }
   if(o.mcb15.closed?.confirmedCross?.direction===challenger&&
      o.mcb15.closed.confirmedCross.knownAt<=o.at){
    w.confirmedAt=o.mcb15.closed.confirmedCross.knownAt;
   }
  }
  mem.lastAuditAt=t;
  mem.lastLbwSlope=l;
  mem.lastBwSlope=b;
  mem.lastLiveDirection=live;
  mem.lastOwner=owner;
 }
 const challenger=w?.challenger||opposite(owner),cs=sign(challenger);
 const progressFromLive=w?.firstLivePrice===null||!w?
  null:round(cs*(o.price-w.firstLivePrice));
 const progressFromAnchor=w?round(cs*(o.price-w.referencePrice)):null;
 const price3=num(o.pm.p3)!==null?cs*o.pm.p3:null;
 const mf3=num(o.mf.slope3)!==null?cs*o.mf.slope3:null;
 const mf15=num(o.mf.slope15)!==null?cs*o.mf.slope15:null;
 const pmNow=num(o.pm.live)!==null?cs*o.pm.live:null;
 const counterPrice=price3!==null&&price3>0&&
   progressFromLive!==null&&progressFromLive>0;
 const counterFlow=(mf3!==null&&mf3>0)||(mf15!==null&&mf15>0);
 const counterPM=pmNow!==null&&pmNow>0;
 const crossOpp=o.mcb3.direction===challenger;
 const liveOpp=live===challenger;
 const movingAway=liveOpp&&w?.consecutiveLive>=2&&
   w?.deepening&&gap!==null&&w.firstLiveGap!==null&&
   cs*(gap-w.firstLiveGap)>0;
 // MF is retained as a diagnostic of participation/divergence only.
 // An opposite MF may lead or lag MCB; it cannot veto a price translation.
 const counterConvinces=!!(w&&movingAway&&crossOpp&&counterPrice&&counterPM);
 // Important separation: first convincing threat opens protection
 // REVIEW. A position EXIT needs a *recovered* counter-impulse:
 // challenger price broke a prior extreme after a pullback.
 const protectiveTransfer=!!(counterConvinces&&
  w.reclaimedAfterRespiration);
 let phase=!w?'CAMPAIGN_ACTIVE':w.firstLiveAt?
  'CROSS15_LIVE_WATCH':'PENTE15_LIVE_VIGILANCE';
 if(nearFlat&&!counterConvinces)phase='POLARITY_UNCERTAIN';
 if(counterConvinces)phase='COUNTER_TRANSFER_PRODUCTIVE';
 if(w)w.lastEvidence={
  asOf:o.at,phase,challenger,liveOpp,crossOpp,price3:round(price3),
  mf3:round(mf3),mf15:round(mf15),counterFlow,
  mfAuthority:'DESCRIPTIVE_ONLY',pmNow:round(pmNow),
  gap,lbwSlope3:l,bwSlope3:b,gapSlope3:o.mcb15.gapSlope3,
  priceFromLive:progressFromLive,priceFromAnchor:progressFromAnchor,
  movingAway,counterConvinces,protectiveTransfer,
  hadCounterRespiration:w.hadCounterRespiration,
  reclaimedAfterRespiration:w.reclaimedAfterRespiration,
  relativeFlattening:nearFlat,
  pmFavourableSamples:w.pmFavourable,pmAdverseSamples:w.pmAdverse,
  pmSignFlips:w.pmSignFlips,priceRetained:progressFromAnchor};
 mem.lastCampaignDirection=o.mcb15.closed?.direction||owner;
 return {phase,watch:w?{...w}:null,evidence:w?.lastEvidence||null,
  owner,challenger,events:eps,
  relativeFlattening:nearFlat,reference:ref,
  counterConvinces,protectiveTransfer,brokerOrdersEnabled:false,
  qualification:'OBSERVED_ASOF_NOT_CERTAIN'};
}
module.exports={VERSION,initial,valid,medianAbs,baseline,assess};
