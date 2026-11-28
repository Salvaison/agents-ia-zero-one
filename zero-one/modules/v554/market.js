'use strict';
// V554 independent market interpretation. No account/position/ledger input.
const M=require('../attention/boonolab-trajectory-memory');
const I=require('../attention/boonolab-wave-interpreter-v02');
const G=require('../attention/boonolab-wave-geometry-v02');
const R=require('../attention/boonolab-trajectory-shadow-runner');
const VERSION='v554-trajectory-sync-market-v1',MIN=60000;
const finite=Number.isFinite,sg=d=>d==='UP'?1:-1,side=n=>n>0?'UP':n<0?'DN':null;
const median=x=>{const a=x.filter(finite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
const round=x=>finite(x)?Math.round(x*1000)/1000:null;
const tail=(a,n)=>a.slice(-n);
const cfg=Object.freeze({crossVigilanceMin:12,crossVigilanceUsd:100,edgeRank:.90,minSegmentMin:3,weakRetention:.25,
 maxSourceAge:65000,minimumNoise:1,proofSamples:2,proofVigilanceMin:12,proofVigilanceUsd:100});
function initial(at){return {version:VERSION,lastSourceAt:0,trajectory:M.initial(at),segments:[],active:null,
 suspension:null,lastSuspensionResolution:null,tracks:{UP:{},DN:{}},latest:null};}
function window(rows,at,min,lag=0){return rows.filter(x=>x.ts>=at-min*MIN-lag*MIN&&x.ts<=at-lag*MIN);}
function bounds(rows){return rows.length?{low:Math.min(...rows.map(x=>x.price)),high:Math.max(...rows.map(x=>x.price)),fromAt:rows[0].ts,toAt:rows.at(-1).ts}:null;}
function frontier(b,d){return b?d==='UP'?b.high:b.low:null;}
function pathStats(rows){if(rows.length<2)return null;const path=rows.slice(1).reduce((s,p,i)=>s+Math.abs(p.price-rows[i].price),0);return {path,net:rows.at(-1).price-rows[0].price,efficiency:path?Math.abs(rows.at(-1).price-rows[0].price)/path:0};}
function higher(ctx,at,d,tf){
 const p=ctx?.latest,b=ctx?.previous,period=tf==='1h'?60*MIN:240*MIN,s=sg(d);
 if(!p||!b||p.closeAt>at||at-p.closeAt>period+2*MIN||p.closeAt-b.closeAt!==period)
  return {state:'UNKNOWN',native:ctx?.lastNative?.direction||null,closeAt:p?.closeAt??null};
 const L=s*(p.L-b.L),B=s*(p.B-b.B),gap=L-B,price=s*(p.price-b.price),mf=finite(p.mf)&&finite(b.mf)?s*(p.mf-b.mf):null;
 const state=L>0&&gap>0&&price>=0?'PRODUCTIVE_SUPPORT':L<0&&gap<0&&price<0?'PRODUCTIVE_OPPOSITION':'MIXED_OR_MATURING';
 return {state,native:ctx.lastNative?.direction||null,closeAt:p.closeAt,L:p.L,B:p.B,dL:round(L),dB:round(B),dGap:round(gap),dPrice:round(price),dMF:round(mf),basis:'CONFIRMED_CLOSED_CSV'};
}
function proofFresh(proof,at,asOf,px,d,noise,originAt){
 if(!proof||!finite(proof.sourceAt)||!finite(proof.knownAt)||!finite(proof.price)||!finite(proof.level)||proof.sourceAt<originAt||proof.sourceAt>at||proof.knownAt>asOf)return false;
 return (at-proof.sourceAt)/MIN<=cfg.proofVigilanceMin&&sg(d)*(px-proof.price)<=cfg.proofVigilanceUsd&&sg(d)*(px-proof.level)>noise;
}
function newSegment(s,g,rows,cross){
 if(s.active&&s.active.id!==cross.sourceAt){
  const a=s.active,move=sg(a.direction)*(a.lastPrice-a.price),ret=a.favorable>0?move/a.favorable:null;
  const duration=(a.lastAt-a.sourceAt)/MIN;
  if(a.complete!==false&&duration>=cfg.minSegmentMin)s.segments=tail([...s.segments,{id:a.id,direction:a.direction,sourceAt:a.sourceAt,endAt:a.lastAt,move,favorable:a.favorable,retained:ret,duration,failed:move<=0||(ret!==null&&ret<cfg.weakRetention)}],36);
  const recent=s.segments.filter(x=>x.endAt>=g.sourceAt-120*MIN).slice(-3);
  if(!s.suspension&&recent.length===3&&recent.filter(x=>x.failed).length>=2&&new Set(recent.filter(x=>x.failed).map(x=>x.direction)).size===2&&recent.at(-1).endAt>(s.lastSuspensionResolution?.sourceAt||0)){
   const range=bounds(window(rows,g.sourceAt,45));
   if(range)s.suspension={since:g.sourceAt,range,trigger:recent.map(x=>({id:x.id,direction:x.direction,failed:x.failed})),beyond:{UP:0,DN:0}};
  }
 }
 const history=rows.filter(p=>p.ts>=cross.sourceAt&&p.ts<=g.sourceAt);
 const complete=history.length>0&&history[0].ts===cross.sourceAt&&history.every((p,j)=>!j||p.ts-history[j-1].ts<=95000);
 s.active={id:cross.sourceAt,sourceAt:cross.sourceAt,direction:cross.direction,price:cross.price,lastPrice:g.price,lastAt:g.sourceAt,complete,
  favorable:Math.max(0,...history.map(p=>sg(cross.direction)*(p.price-cross.price)))};
}
function sync(s,i,contexts,ticker=null){
 const g=i.geometry,rows=s.trajectory.rows,at=g.sourceAt,px=g.price,prior=rows.filter(x=>x.ts<at);
 const recent=tail(prior,120);const changes=recent.slice(1).map((x,j)=>Math.abs(x.price-recent[j].price));
 const noise=Math.max(cfg.minimumNoise,median(changes)||1);
 const range45=bounds(window(rows,at,45)),prior45=bounds(window(prior,at,45)),r15=bounds(window(prior,at,15,3));
 const r1=pathStats(window(rows,at,60));
 const cross=i.liveCross;
 const knownCross=!s.trajectory.hypotheses[g.gapSide]?.crossAnchor?.coverageInterrupted&&cross?.type==='CROSS15_LIVE'&&finite(cross.sourceAt)&&finite(cross.price)&&cross.sourceAt<=at&&cross.direction===g.gapSide;
 if(knownCross&&s.active?.id!==cross.sourceAt)newSegment(s,g,rows,cross);
 if(s.active&&g.gapSide===s.active.direction){
  s.active.lastPrice=px;s.active.lastAt=at;s.active.favorable=Math.max(s.active.favorable,sg(s.active.direction)*(px-s.active.price));
 }
 const quality=ticker&&finite(ticker.at)&&ticker.at<=i.asOf&&i.asOf-ticker.at<=95000?ticker.quality:null;
 const positiveQuality=['EASY','PRODUCTIVE','POWERFUL','EXCEPTIONAL'].includes(quality);
 const view={};
 for(const d of ['UP','DN']){
  const h=i.hypotheses[d],k=sg(d),tr=s.tracks[d],init=h.initiative,rot=h.origin;
  const validOrigin=!!init&&finite(init.origin?.sourceAt)&&init.origin.sourceAt<=at&&!init.coverageInterrupted;
  const aligned=g.gapSide===d,actual=knownCross&&aligned&&cross.direction===d;
  const age=actual?(at-cross.sourceAt)/MIN:null,travel=actual?k*(px-cross.price):null;
  const fromInit=validOrigin?k*(px-init.origin.price):null;
  // Freeze reference at the actual market event, not at a candidature.
  // A recross never deletes initiative history. References exclude last 3m.
  const anchor=actual?cross.sourceAt:validOrigin?init.origin.sourceAt:null;
  const anchorId=actual?'C:'+anchor:validOrigin?'I:'+init.id:null;
  if(anchorId&&tr.anchorId!==anchorId){
   const a15=bounds(window(rows,anchor,15,3)),a45=bounds(window(rows,anchor,45,0).filter(x=>x.ts<anchor));
   tr.anchorId=anchorId;tr.anchorAt=anchor;tr.ref15=frontier(a15,d);tr.ref45=frontier(a45,d);
   tr.beyond=0;tr.majorBeyond=0;tr.anchorProof=null;tr.anchorMajor=null;
  }
  const local=finite(g.k[3].L)&&finite(g.k[3].G)&&k*g.k[3].L>0&&k*g.k[3].G>0;
  const tactical=g.tactical.side===d&&finite(g.conversion.pm3)&&k*g.conversion.pm3>noise&&finite(g.conversion.pmLive)&&k*g.conversion.pmLive>0;
  const beyond=finite(tr.ref15)&&k*(px-tr.ref15)>noise;
  const major=finite(tr.ref45)&&k*(px-tr.ref45)>noise;
  tr.beyond=beyond?(tr.beyond||0)+1:0;tr.majorBeyond=major?(tr.majorBeyond||0)+1:0;
  if(tr.beyond>=cfg.proofSamples&&!tr.anchorProof){tr.anchorProof={id:'BREAK15:'+d+':'+anchorId,sourceAt:at,knownAt:i.asOf,level:tr.ref15,price:px,kind:'OBSERVED_BREAK15_HELD'};}
  if(tr.majorBeyond>=cfg.proofSamples&&!tr.anchorMajor){tr.anchorMajor={id:'BREAK45:'+d+':'+anchorId,sourceAt:at,knownAt:i.asOf,level:tr.ref45,price:px,kind:'OBSERVED_BREAK45_HELD'};}
  const fresh=p=>validOrigin&&proofFresh(p,at,i.asOf,px,d,noise,init.origin.sourceAt);
  const proof=fresh(tr.anchorMajor)?tr.anchorMajor:fresh(tr.anchorProof)?tr.anchorProof:null;
  const majorProof=!!(proof&&proof.kind==='OBSERVED_BREAK45_HELD');
  // After a meaningful retreat from the established peak, recovery of that
  // same frozen peak is a NEW economic event; not a mere change of slope.
  if(tr.initiativeId!==init?.id){tr.initiativeId=init?.id||null;tr.peak=px;tr.retest=null;tr.renewal=null;}
  const typical=contexts['3m']?.medianRange??null;
  if(finite(tr.peak)&&finite(typical)&&typical>0&&k*(tr.peak-px)>=typical&&!tr.retest)
   tr.retest={level:tr.peak,at,held:0};
  if(tr.retest){
   tr.retest.held=k*(px-tr.retest.level)>noise?(tr.retest.held||0)+1:0;
   if(tr.retest.held>=cfg.proofSamples){
    tr.renewal={id:'RECLAIM:'+d+':'+at,sourceAt:at,knownAt:i.asOf,level:tr.retest.level,price:px,kind:'RECLAIM_AFTER_OBSERVED_RESPIRATION'};
    tr.retest=null;
   }
  }
  if(!finite(tr.peak)||k*(px-tr.peak)>0)tr.peak=px;
  const renewed=fresh(tr.renewal)?tr.renewal:null;
  const rangePos=range45&&range45.high>range45.low?(d==='UP'?(px-range45.low):(range45.high-px))/(range45.high-range45.low):null;
  const late=actual&&(age>cfg.crossVigilanceMin||travel>cfg.crossVigilanceUsd),edge=rangePos!==null&&rangePos>=cfg.edgeRank;
  const weak=['SILENT','INEFFICIENT','CONTESTED'].includes(quality);
  const hi=higher(contexts['1h'],i.asOf,d,'1h'),h4=higher(contexts['4h'],i.asOf,d,'4h');
  let release=null;
  if(s.suspension){
   const level=frontier(s.suspension.range,d);
   s.suspension.beyond[d]=k*(px-level)>noise?s.suspension.beyond[d]+1:0;
   if(s.suspension.beyond[d]>=cfg.proofSamples&&validOrigin&&local&&tactical)
    release={id:'RESOLVE:'+d+':'+at,sourceAt:at,knownAt:i.asOf,level,price:px,kind:'CONTESTED_RANGE_TRANSFER',direction:d};
  }
  if(release)tr.lastRelease=release;
  const releaseProof=fresh(tr.lastRelease)?tr.lastRelease:null;
  const proofAny=releaseProof||renewed||proof;
  // E1 native sign is contextual. Productive opposition raises burden of
  // proof to a 45m transfer / reclaim with 4h context; never a bare veto.
  const counter=hi.state==='PRODUCTIVE_OPPOSITION';
  const counterProof=majorProof||!!releaseProof||!!(renewed&&h4.state!=='PRODUCTIVE_OPPOSITION')||!!(proof&&h4.state==='PRODUCTIVE_SUPPORT');
  const localMove=finite(rot?.price)?k*(px-rot.price):null;
  const freshCross=actual&&age<=cfg.crossVigilanceMin&&travel>=noise&&travel<=cfg.crossVigilanceUsd;
  const preCross=!aligned&&validOrigin&&init.originKind==='PRE_CROSS_LBW_ROTATION'&&h.evolution==='RAPPROCHEMENT_VERS_CROSS';
  const mature=!!(late&&edge&&!proofAny);
  const contradictory=!!(actual&&travel<0&&!proofAny);
  let state='CONSTRUCTION',reason='AWAIT_CAUSAL_PRICE_TRANSLATION',eligible=false;
  if(!validOrigin||!finite(noise)||rangePos===null||hi.state==='UNKNOWN'||h4.state==='UNKNOWN'){state='UNRECOGNIZED';reason='ORIGIN_OR_HIGHER_CONTEXT_UNKNOWN';}
  else if(s.suspension&&!release){state='CONTESTED_TRAJECTORY';reason='FROZEN_RANGE_NOT_RECONQUERED';}
  else if(contradictory){state='CONTESTED_TRAJECTORY';reason='PRICE_CONTRADICTS_CROSS';}
  else if(mature){state='MATURE_IMPULSE';reason='LATE_AND_AT_DIRECTIONAL_EDGE';}
  else if(!local||!tactical||!finite(localMove)||localMove<=0){state='CONSTRUCTION';reason='LOCAL_TRANSLATION_NOT_READY';}
  else if(counter&&!counterProof){state='CONSTRUCTION';reason='PRODUCTIVE_1H_OPPOSITION_NEEDS_TRANSFER';}
  else if((preCross||edge||late)&&!proofAny){state=edge?'MATURE_IMPULSE':'CONSTRUCTION';reason='NEED_NEW_ECONOMIC_PROOF';}
  else if(proofAny&&(aligned||preCross)){state=releaseProof||renewed?'RENEWED_IMPULSE':late?'PRODUCTIVE_CONTINUATION':'NEW_IMPULSE';reason=proofAny.kind;eligible=true;}
  else if(freshCross&&!edge&&positiveQuality){state='NEW_IMPULSE';reason='FRESH_ACTUAL_CROSS_WITH_PRICE_TRANSLATION';eligible=true;}
  else if(freshCross&&!edge&&hi.state==='PRODUCTIVE_SUPPORT'){state='NEW_IMPULSE';reason='FRESH_TRANSLATION_WITH_1H_SUPPORT';eligible=true;}
  view[d]={direction:d,state,reason,eligible,initiativeId:init?.id||null,initiativeOrigin:init?.origin||null,initiativeAgeMin:init?.progress?.ageMin??null,
   fromInitiative:round(fromInit),initiativeRetained:init?.progress?.retained??null,attemptId:h.attemptId,rotationAt:rot?.sourceAt??null,
   crossAt:actual?cross.sourceAt:null,crossAgeMin:round(age),crossTravel:round(travel),crossDirection:g.gapSide,knownActualCross:!!actual,
   localMove:round(localMove),rangeRank:round(rangePos),late:!!late,edge:!!edge,weakConversion:weak,conversionQuality:quality,
   variantA:!!(late&&edge),variantB:!!(late&&edge&&weak),higher1h:hi,higher4h:h4,
   evidence:{local,tactical,noise,ref15:tr.ref15??null,ref45:tr.ref45??null,proof:proofAny,proofAgeMin:proofAny?round((at-proofAny.sourceAt)/MIN):null,proofTravel:proofAny?round(k*(px-proofAny.price)):null,majorProof,counterProof,preCross,fromInitiative:round(fromInit),
    priceVsPreviousExtreme:h.nearestPairedExtreme||null},release};
 }
 const release=Object.values(view).find(x=>x.release)?.release;
 if(release){s.lastSuspensionResolution=release;s.suspension=null;}
 return {version:VERSION,asOf:i.asOf,sourceAt:at,price:px,liveCross:cross,confirmedCross:i.confirmedCross,parentE15:i.parentE15,
  geometry:{L:g.L,B:g.B,G:g.G,gapSide:g.gapSide,k:g.k,conversion:g.conversion,tactical:g.tactical},
  range45,prior45,r15,noise,path60:r1,suspension:s.suspension,release:s.lastSuspensionResolution,segments:tail(s.segments,6),hypotheses:view,
  brokerOrdersEnabled:false,decisionImpact:false};
}
function observe(s,row,bars,knownAt,ticker,provenance='LIVE_FILE_OBSERVED'){
 if(s.version!==VERSION||!finite(row?.ts)||row.ts<=s.lastSourceAt||row.ts>knownAt)return null;
 const ctx=R.contextsAt(bars,provenance==='LIVE_FILE_OBSERVED'?knownAt:row.ts);
 if(row.ts>s.trajectory.lastSourceAt){
  const x=M.observe(s.trajectory,{row,knownAt,contexts:ctx,provenance});if(!x.accepted)return null;
 }else if(row.ts!==s.trajectory.lastSourceAt)return null;
 const i=I.interpret(s.trajectory);if(!i.available||i.sourceAt!==row.ts||i.asOf>knownAt)return null;
 if(s.lastSourceAt&&row.ts-s.lastSourceAt>95000){s.active=null;s.segments=[];for(const d of ['UP','DN']){s.tracks[d].beyond=0;s.tracks[d].majorBeyond=0;s.tracks[d].anchorId=null;s.tracks[d].retest=null;s.tracks[d].renewal=null;s.tracks[d].lastRelease=null;}if(s.suspension)s.suspension.beyond={UP:0,DN:0};}
 s.latest=sync(s,i,ctx,ticker);s.lastSourceAt=row.ts;return s.latest;
}
module.exports={VERSION,cfg,initial,observe,sync,higher,sg,side,median,bounds,window,proofFresh};

