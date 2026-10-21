'use strict';
// Elastic v0.5: one observable state, one causal history, no trading authority.
// Previous v0.4 continues to run unmodified for audit and comparison.
const VERSION='elastic-observer-shadow-v0.5';
const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const num=x=>finite(x)?Number(x):null;
const sign=x=>!finite(x)||Number(x)===0?null:Number(x)>0?'long':'short';
const other=d=>d==='long'?'short':d==='short'?'long':null;
const one=(a,b)=>a&&a[b]||null;
function waveform(frame,tf,mcb,native,geometry){
  const src=frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs&&frame.sources.mcb.tfs[tf]||{};
  const conf=(src.history||[]).slice(-1)[0]||src.confirmed||null, live=src.live||null;
  const f=(key)=>({confirmed:num(conf&&conf[key]),live:num(live&&live[key])});
  const bw=f('blue_wave'),lbw=f('lt_blue_wave'),mf=f('money_flow');
  const delta=lbw.confirmed!==null&&lbw.live!==null?lbw.live-lbw.confirmed:null;
  const mins=tf==='3m'?3:15;
  const structure=tf==='3m'?mcb&&mcb.nested3m:mcb&&mcb.currentLobe;
  const structural=one(structure,'relationshipFromPrevious')||null;
  const up=tf==='3m'?native&&native.last3mUp:native&&native.lastUp;
  const dn=tf==='3m'?native&&native.last3mDn:native&&native.lastDn;
  const confirmedSignal=up&&dn?(num(up.ts)>num(dn.ts)?up:dn):up||dn||null;
  const liveSignalRaw=tf==='3m'?native&&native.live3:native&&native.live15;
  const liveSignal=liveSignalRaw&&liveSignalRaw.fresh?(liveSignalRaw.dn||liveSignalRaw.up||null):null;
  const g=geometry&&geometry[tf==='3m'?'m3':'m15']||{};
  const age=confirmedSignal&&finite(confirmedSignal.ts)?Math.max(0,(Number(frame.market.timestamp)-Number(confirmedSignal.ts))/60000):null;
  return {timeframe:tf,referenceKind:'PREVIOUS_CONFIRMED_CANDLE',referenceTs:num(conf&&conf.ts),liveTs:num(live&&live.ts),
    bw,lbw,mf,lbwDelta:delta,lbwChangePerBar:delta,lbwChangePerMinute:delta!==null?delta/mins:null,
    structuralRelation:structural?{
      priceDeltaUsd:num(structural.priceDeltaUsd),durationMinutes:num(structural.durationMinutes),
      lbwSpan:num(structural.lbwSpan),slopeUsdPerMinute:
      finite(structural.priceDeltaUsd)&&finite(structural.durationMinutes)&&Number(structural.durationMinutes)>0
        ?Number(structural.priceDeltaUsd)/Number(structural.durationMinutes):null
    }:null,
    cross:{relation:g.relation||null,spread:num(g.spread),spreadRatePerMinute:num(g.spreadRatePerMinute),
      sinceCrossMinutes:num(g.sinceCrossMinutes),lastCrossing:g.lastCrossing||null},
    confirmedSignal:confirmedSignal?{type:confirmedSignal.type,sourceTs:num(confirmedSignal.ts),value:num(confirmedSignal.value),ageMinutes:age}:null,
    liveSignal:liveSignal?{type:liveSignal.type,sourceTs:num(liveSignal.ts),value:num(liveSignal.value),provisional:true}:null,
    freshness:{confirmedAgeMs:num(src.confirmedAgeMs),liveAgeMs:num(src.liveAgeMs)}
  };
}
function buySellEffort(frame,minutes=3){
  const now=Number(frame.market.timestamp),ticks=frame.sources&&frame.sources.liveTicks||[];
  const a=ticks.filter(t=>finite(t&&t.ts)&&Number(t.ts)>=now-minutes*60000&&Number(t.ts)<=now&&
    finite(t.price)&&finite(t.volume)&&(Number(t.side)===1||Number(t.side)===2))
    .sort((a,b)=>a.ts-b.ts);
  let buy=0,sell=0;
  for(const t of a){if(Number(t.side)===1)buy+=Number(t.volume);else sell+=Number(t.volume);}
  return {available:a.length>=2&&buy+sell>0,windowMinutes:minutes,sampleCount:a.length,
    buyBtc:buy,sellBtc:sell,netAggressiveBtc:buy-sell,
    priceNetUsd:a.length>=2?Number(a[a.length-1].price)-Number(a[0].price):null,
    note:'Aggressor volume from public OKX BTC-USDT-SWAP trade ticks, not net positions or true market-wide buyer/seller strength'};
}
function conversion(frame,translation,ticker,priceBehavior,previous){
  const h=translation&&translation.horizons||{},tk=ticker&&ticker.current||{},t=priceBehavior&&priceBehavior.travel||{};
  const net3=num(h.net3mUsd),net5=num(h.net5mUsd),pmLive=num((frame.sources&&frame.sources.auditRows||[]).slice(-1)[0]?.priceMove);
  const eff=num(h.efficiency3m),eff5=num(h.efficiency5m);
  const y=num(t.yieldVsP75??tk.yieldVsP75),y95=num(t.yieldVsP95??tk.yieldVsP95),
    effort=num(t.effortVsP75??tk.effortVsP75);
  const direction=sign(net3)&&sign(net3)===sign(net5)?sign(net3):null;
  const contested=sign(net3)&&sign(net5)&&sign(net3)!==sign(net5);
  let quality='UNCLASSIFIED',classificationSource='NONE';
  if(contested){quality='CONTESTED';classificationSource='PM3_PM5_DIRECTION_CONFLICT';}
  else if(y!==null){
    if(y95!==null&&y95>=1){quality='EXCEPTIONAL';}
    else if(y>=1&&effort!==null&&effort>=1){quality='POWERFUL';}
    else if(y>=1&&effort!==null&&effort<1){quality='EASY';}
    else if(y>=1){quality='PRODUCTIVE';}
    else if(effort!==null&&effort>=1){quality='INEFFICIENT';}
    else if(effort!==null&&effort<1){quality='SILENT';}
    classificationSource='EFFORT_YIELD_RELATIVE_TO_P75_P95';
  }
  const pre=previous&&previous.conversion||null;
  const wasProductive=pre&&['EASY','POWERFUL','PRODUCTIVE','EXCEPTIONAL'].includes(pre.quality);
  // Temporal categories are hypotheses, never inferred from a single snapshot.
  let temporalQuality=null;
  if(pre&&pre.direction&&pre.direction===direction&&pre.samples>=2){
    if(wasProductive&&effort!==null&&effort>=1&&y!==null&&y<.75)temporalQuality='EXHAUSTED';
    else if(effort!==null&&effort>=1&&y!==null&&y<1&&
      pre.quality==='INEFFICIENT'&&num(h.net3mUsd)!==null&&Math.abs(net3)<Math.abs(num(pre.pm3)||0))
      temporalQuality='ABSORBED';
  }
  const samples=pre&&pre.direction===direction&&pre.quality===quality?(pre.samples||0)+1:1;
  return {quality,temporalQuality,classificationSource,direction,
    pm3:net3,pm5:net5,pmLive,efficiency3m:eff,efficiency5m:eff5,
    yieldVsP75:y,yieldVsP95:y95,effortVsP75:effort,
    cadence:num(t.cadence??tk.cadence),flowBtcPerSec:num(t.flowBtcPerSec??tk.flowBtcPerSec),
    easeRatio:effort!==null&&effort>0&&y!==null?y/effort:null,
    samples,priceBehaviorStatus:priceBehavior&&priceBehavior.state||null,
    source:'EXISTING_PRICE_BEHAVIOR_AND_TICKER_SHADOW',
    labels:{SILENT:'SILENT',INEFFICIENT:'INEFFICIENT',PRODUCTIVE:'PRODUCTIVE',
      EASY:'EASY',POWERFUL:'POWERFUL',EXCEPTIONAL:'EXCEPTIONAL',CONTESTED:'CONTESTED',
      ABSORBED:'ABSORBED',EXHAUSTED:'EXHAUSTED'},
    experimental:['ABSORBED','EXHAUSTED']};
}
function maState(frame,tf,previous){
  const m=frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs&&frame.sources.mcb.tfs[tf]||{};
  const last=(m.history||[]).slice(-1)[0]||null,live=m.live||null;
  const price=num(frame.market.price),ma=num(live&&finite(live.ma200)?live.ma200:last&&last.ma200);
  const dist=ma!==null&&price!==null?price-ma:null,tol=ma!==null?Math.max(5,Math.abs(ma)*.0003):null;
  let base=previous?{...previous}:{state:'UNOBSERVED',contactCount:0,retestCount:0,approachSide:null,
    departureSide:null,lastBarTs:null,startedAt:null,lastTransitionAt:null,confirmedContactBars:0};
  const result={...base,timeframe:tf,ma200:ma,distanceUsd:dist,toleranceUsd:tol,
    liveContact:dist!==null&&tol!==null&&Math.abs(dist)<=tol,
    lastTransition:null,decisionImpact:false};
  if(!last||!finite(last.ts)||!finite(last.ma200)||!finite(last.close)||!finite(last.high)||!finite(last.low))
    return result;
  const ts=Number(last.ts);
  if(base.lastBarTs!==null&&ts<=base.lastBarTs)return result;
  const ref=Number(last.ma200),tolerance=Math.max(5,Math.abs(ref)*.0003),
    close=Number(last.close),side=close>=ref?'ABOVE':'BELOW',
    touch=Number(last.low)<=ref+tolerance&&Number(last.high)>=ref-tolerance,
    departed=Math.abs(close-ref)>=2*tolerance;
  let next=base.state;
  if(touch){
    if(['DEPART','HELD','REJECTED'].includes(base.state)){
      next='RETEST';result.retestCount=(base.retestCount||0)+1;
    }else if(['UNOBSERVED','LOST'].includes(base.state)){
      next='CONTACT';result.contactCount=(base.contactCount||0)+1;
      result.approachSide=base.approachSide||side;result.startedAt=ts;
    }
    result.confirmedContactBars=(base.confirmedContactBars||0)+1;
  }else if(departed){
    result.confirmedContactBars=0;
    if(['CONTACT','RETEST'].includes(base.state)){
      if(base.state==='RETEST'){
        next=side===base.departureSide?'HELD':'LOST';
      }else next='DEPART';
      result.departureSide=side;
    }else if(base.state==='HELD'&&side!==base.departureSide)next='LOST';
    else if(base.state==='DEPART'&&base.departureSide&&side!==base.departureSide)next='REJECTED';
    else if(base.state==='UNOBSERVED')next='DEPART';
  }
  result.lastBarTs=ts;result.state=next;
  if(next!==base.state){result.lastTransitionAt=ts;result.lastTransition={from:base.state,to:next,sourceTs:ts,
    distanceUsd:close-ref,price:close};}
  return result;
}
function confirmedEvent(native,tf){
 const up=tf==='3m'?native&&native.last3mUp:native&&native.lastUp;
 const dn=tf==='3m'?native&&native.last3mDn:native&&native.lastDn;
 const z=up&&dn?(num(up.ts)>num(dn.ts)?up:dn):up||dn||null;
 return z&&finite(z.ts)?{type:z.type,sourceTs:Number(z.ts),value:num(z.value)}:null;
}
function liveEvent(native,tf){
 const x=tf==='3m'?native&&native.live3:native&&native.live15;
 const e=x&&x.fresh&&(x.dn||x.up);
 return e&&finite(e.ts)?{type:e.type,sourceTs:Number(e.ts),value:num(e.value)}:null;
}
function evaluate(frame,mcb,native,baseThesis,translation,ticker,mf,priceBehavior,room,background,quality,geometry,prev){
 const previous=prev&&prev.version===VERSION?prev:null,now=Number(frame.market.timestamp),price=Number(frame.market.price);
 const result={version:VERSION,decisionImpact:false,ts:now,price,
   mcbProposal:baseThesis&&baseThesis.candidateDirection||null,
   mcbStructural:mcb&&mcb.currentLobe&&mcb.currentLobe.structuralDirection||null,
   priceDirection:null,shared:{},signals:{},ma:{},flow:{},boundary:{},context:{},
   conversion:null,effort:null,eventCount:previous&&previous.eventCount||0,newEvents:[],
   eventState:{},note:'Seven shared families, unique transitions; no setup/action/risk authority'};
 const push=(family,key,type,before,after,sourceTs,dir=null,detail=null)=>{
   result.eventCount++;
   result.newEvents.push({id:result.eventCount,observedAt:now,sourceTs:sourceTs??null,price,
     family,key,type,direction:dir,previous:before??null,current:after??null,detail:detail??null});
 };
 for(const tf of ['15m','3m']){
   const w=waveform(frame,tf,mcb,native,geometry),key=tf==='3m'?'MCB3':'MCB15';
   result.shared[key]=w;result.signals[tf]={confirmed:confirmedEvent(native,tf),live:liveEvent(native,tf)};
   const prevSig=previous&&previous.signals&&previous.signals[tf]||{};
   for(const maturity of ['confirmed','live']){
     const cur=result.signals[tf][maturity],before=prevSig[maturity]||null;
     const recent=cur&&cur.sourceTs<=now&&now-cur.sourceTs<= (tf==='3m'?10:32)*60000;
     if(cur&&recent&&(!before||cur.type!==before.type||cur.sourceTs!==before.sourceTs)){
       if(maturity==='confirmed'&&before)push(key,'E'+(tf==='3m'?'3':'15'),
         'SUPERSEDED',before,cur,cur.sourceTs,cur.type==='UP'?'long':'short');
       push(key,'E'+(tf==='3m'?'3':'15'),maturity==='live'?'OBSERVED':'CONFIRMED',
         before,cur,cur.sourceTs,cur.type==='UP'?'long':'short',
         {linkedBwLbw:!!(w.cross&&w.cross.lastCrossing)});
     }else if(!cur&&before&&maturity==='live')push(key,'E'+(tf==='3m'?'3':'15'),
       'INTERRUPTED',before,null,now,prevSig.live.type==='UP'?'long':'short');
   }
   const g=w.cross,lastg=previous&&previous.shared&&previous.shared[key]&&previous.shared[key].cross||{};
   if(g&&g.lastCrossing&&g.lastCrossing.sourceTs!== (lastg.lastCrossing&&lastg.lastCrossing.sourceTs)
     &&g.lastCrossing.sourceTs>=now-90000)
     push(key,'BW_LBW_CROSS','OBSERVED',lastg.lastCrossing,g.lastCrossing,g.lastCrossing.sourceTs,
       g.spread===null?null:g.spread>0?'short':'long',{nativeRelated:'E'+(tf==='3m'?'3':'15'),noAdditionalVote:true});
   const mar=maState(frame,tf,previous&&previous.ma&&previous.ma[tf]);
   result.ma[tf]=mar;
   if(mar.lastTransition)push('MA','MA'+(tf==='3m'?'3':'15'),mar.state,
     previous&&previous.ma&&previous.ma[tf]?.state||null,
     mar.lastTransition,mar.lastTransition.sourceTs,
     mar.distanceUsd===null?null:sign(mar.distanceUsd),
     {retestCount:mar.retestCount,contactCount:mar.contactCount});
 }
 result.flow={mf3:result.shared.MCB3.mf,mf15:result.shared.MCB15.mf,
   mf3Direction:sign(result.shared.MCB3.mf.live!==null&&result.shared.MCB3.mf.confirmed!==null
     ?result.shared.MCB3.mf.live-result.shared.MCB3.mf.confirmed:null),
   mf15Direction:sign(result.shared.MCB15.mf.live!==null&&result.shared.MCB15.mf.confirmed!==null
     ?result.shared.MCB15.mf.live-result.shared.MCB15.mf.confirmed:null),
   memoryDirection:mf&&mf.temporal&&mf.temporal.memoryDirection||null,
   memoryHorizon:mf&&mf.temporal&&mf.temporal.memoryHorizon||null};
 result.conversion=conversion(frame,translation,ticker,priceBehavior,previous);
 const cv=result.conversion,oldc=previous&&previous.conversion||null;
 const cmp=(x)=>x&&[x.quality,x.direction,x.temporalQuality||''].join('|');
 if(!oldc||cmp(cv)!==cmp(oldc)){
   if(oldc)push('CONVERSION','CONVERSION','INTERRUPTED',oldc.quality,cv.quality,now,oldc.direction);
   const restore=previous&&previous.previousConversion&&previous.previousConversion.key===cmp(cv)&&
     now-previous.previousConversion.ts<15*60000;
   push('CONVERSION','CONVERSION',restore?'RESTORED':'OBSERVED',
     oldc&&oldc.quality||null,cv.quality,now,cv.direction,
     {pm3:cv.pm3,pm5:cv.pm5,efficiency3m:cv.efficiency3m,effortVsP75:cv.effortVsP75,yieldVsP75:cv.yieldVsP75});
 }else if(cv.samples===3)push('CONVERSION','CONVERSION','CONFIRMED',cv.quality,cv.quality,now,cv.direction,
   {persistenceSamples:3});
 result.lastConversion={key:cmp(cv),ts:now};
 result.previousConversion=oldc&&cmp(oldc)!==cmp(cv)?{key:cmp(oldc),ts:now}:
   previous&&previous.previousConversion||null;
 result.effort=buySellEffort(frame,3);
 result.priceDirection=sign(result.effort.priceNetUsd);
 const levels=frame.sources&&frame.sources.levels||[];
 const nearest=(pred)=>levels.filter(x=>x&&finite(x.price)&&pred(x))
   .map(x=>({label:x.label||x.token||null,price:Number(x.price),
     distanceUsd:Number(x.price)-price}))
   .sort((a,b)=>Math.abs(a.distanceUsd)-Math.abs(b.distanceUsd)).slice(0,2);
 result.boundary={state:room&&room.state||null,rangeRr:room&&room.rangeRr||null,
   nearestAhead:room&&room.nearestAhead||null,
   barriers:room&&room.boundaries||[],fib:nearest(x=>String(x.fam||'').toLowerCase()==='fib'||/^fib/i.test(x.label||'')),
   levels:nearest(x=>String(x.fam||'').toLowerCase()!=='fib'&&!/^fib/i.test(x.label||''))};
 result.context={marketQuality:quality&&quality.state||null,backgroundDirection:background&&background.direction||null,
   dataQuality:mcb&&mcb.dataQuality&&mcb.dataQuality.degraded?'DEGRADED':'OK',
   h1:background&&background.oneHour||null,h4:background&&background.fourHour||null,
   daily:background&&background.daily||null,weekly:background&&background.weekly||null};
 // Compact state: historical events are appended to the dedicated rotating NDJSON log.
 // No 24/30-event clipping; each transition is persisted once and queried by timeframe.
  return result;
}
module.exports={VERSION,evaluate,conversion,maState,buySellEffort,waveform};
