'use strict';
// V5.4 native market-event TELEMETRY. No MCB hypothesis, trade action,
// opportunity score, or broker. Produces only first-observed E3/E15 and
// BW/LBW cross timestamps from the already collected 30s Audit/MCB data.
// Replaces the event-file writing side effect formerly owned by V4.10.10.
const VERSION='v54-native-causal-event-feed-v1';
const THREE=180000,FIFTEEN=900000;
const num=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
const last=a=>a.at(-1)||null;
const getCurrentBar=(rows,now,period)=>{
 const xs=(rows||[]).filter(b=>num(b.ts)!==null&&b.ts+period<=now);
 return last(xs);
};
const fields={
 MCB3:{tf:THREE,lbw:'liveLbw',bw:'liveBw',up:'liveSignalUp',
  down:'liveSignalDn',signal:'E3'},
 MCB15:{tf:FIFTEEN,lbw:'live15LbwRaw',bw:'live15BwRaw',
  up:'live15SignalUp',down:'live15SignalDn',signal:'E15'}
};
function marker(sample,fam,conf=false,bar=null){
 const v=fields[fam],src=conf?bar:sample;
 const up=num(conf?src?.wt1_cross_up:src?.[v.up]);
 const down=num(conf?src?.wt1_cross_dn:src?.[v.down]);
 if(up!==null&&down!==null)return null; // contradictory native signals
 const direction=up!==null?'long':down!==null?'short':null;
 if(!direction)return null;
 return {direction,sourceTs:conf?bar.ts:
  Math.floor(sample.ts/v.tf)*v.tf,value:up??down,
  type:direction==='long'?'UP':'DN'};
}
function snapshot(sample){
 const result={};
 for(const [fam,v] of Object.entries(fields)){
  const lbw=num(sample[v.lbw]),bw=num(sample[v.bw]);
  result[fam]={live:marker(sample,fam),spread:lbw!==null&&bw!==null?
   bw-lbw:null};
 }
 return result;
}
function initial(sample,bars3,bars15,lastId=0){
 const s=snapshot(sample);
 return {
  version:VERSION,lastSampleTs:sample.ts,lastId:Number(lastId)||0,
  families:Object.fromEntries(Object.keys(fields).map(fam=>{
   const bar=getCurrentBar(fam==='MCB3'?bars3:bars15,
     sample.ts,fields[fam].tf);
   return [fam,{live:s[fam].live,spread:s[fam].spread,
    prevTs:sample.ts,lastConfirmedBarTs:bar?.ts??null}];
  })),
  bootstrap:'NO_BACKDATED_OBSERVATION_ON_RESTART',
  source:'ALREADY_COLLECTED_TRADINGVIEW_AUDIT_ONLY',
  tradingEnabled:false
 };
}
function step(state,sample,bars3,bars15){
 if(!state||state.version!==VERSION)throw Error('V54_EVENT_FEED_STATE_INVALID');
 if(!sample||num(sample.ts)===null||sample.ts<=state.lastSampleTs)
  return {state,events:[],changed:false};
 const events=[],px=num(sample.lastPrice),now=sample.ts;
 const append=(family,key,type,direction,sourceTs,current=null,previous=null,detail=null)=>{
  state.lastId++;
  events.push({id:state.lastId,observedAt:now,ts:new Date(now).toISOString(),
   sourceTs,price:px,family,key,type,direction,previous,current,detail,
   version:VERSION,decisionImpact:false,producer:'BOONO_V54_EVENT_DATA_ONLY'});
 };
 for(const [fam,v] of Object.entries(fields)){
  const prior=state.families[fam]||{live:null,spread:null,prevTs:0,lastConfirmedBarTs:null};
  const live=marker(sample,fam),rawLb=num(sample[v.lbw]),
   rawBw=num(sample[v.bw]),spread=rawLb===null||rawBw===null?null:rawBw-rawLb;
  const lastLive=prior.live,oldId=lastLive?.direction+'|'+lastLive?.sourceTs;
  const newId=live?.direction+'|'+live?.sourceTs;
  if(lastLive&&newId!==oldId){
   append(fam,v.signal,'INTERRUPTED',lastLive.direction,lastLive.sourceTs,null,
    {type:lastLive.type,sourceTs:lastLive.sourceTs,value:lastLive.value},
    {reason:'LIVE_SIGNAL_DISAPPEARED_OR_BAR_ROLLED'});
  }
  if(live&&newId!==oldId){
   append(fam,v.signal,'OBSERVED',live.direction,live.sourceTs,
    {type:live.type,sourceTs:live.sourceTs,value:live.value},
    lastLive?{type:lastLive.type,sourceTs:lastLive.sourceTs}:null,
    {linkedBwLbw:true,availability:'FIRST_AUDIT_OBSERVATION'});
  }
  const bar=getCurrentBar(fam==='MCB3'?bars3:bars15,now,v.tf);
  if(bar&&bar.ts>(prior.lastConfirmedBarTs??-Infinity)){
   // A TradingView native confirmation is available only AFTER the bar closed
   // and first appeared in collector data. Do not invent earlier observedAt.
   const conf=marker(sample,fam,true,bar);
   if(conf)append(fam,v.signal,'CONFIRMED',conf.direction,conf.sourceTs,
    {type:conf.type,sourceTs:conf.sourceTs,value:conf.value},null,
    {availability:'CONFIRMED_BAR_FIRST_SEEN_BY_V54_EVENT_FEED'});
   prior.lastConfirmedBarTs=bar.ts;
  }
  // BW-LBW cross is a separate event from oscillator crossing ZERO.
  // In BW-LBW spread convention, crossing BELOW zero means LONG.
  if(spread!==null&&prior.spread!==null&&spread*prior.spread<0&&
     now-prior.prevTs>0&&now-prior.prevTs<=90000){
   const direction=spread<0?'long':'short';
   append(fam,'BW_LBW_CROSS','OBSERVED',direction,now,
    {event:direction==='long'?'BW_CROSSES_BELOW_LBW':'BW_CROSSES_ABOVE_LBW',
     sourceTs:now,fromSpread:prior.spread,toSpread:spread,
     observedAt:now,price:px},null,{nativeRelated:v.signal,noAdditionalVote:true});
  }
  prior.live=live;
  prior.spread=spread;
  prior.prevTs=now;
  state.families[fam]=prior;
 }
 state.lastSampleTs=now;
 return {state,events,changed:true};
}
module.exports={VERSION,initial,step,marker,snapshot};
