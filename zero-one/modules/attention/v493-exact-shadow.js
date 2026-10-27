'use strict';
// Frozen cdf1936 V4.9.3 evaluator. Only as-of verified data, NO broker,
// NO independent ledger and NO order execution.
const fs=require('fs'),path=require('path');
const BASE='/root/boono-v493-baseline/zero-one';
const original=require(BASE+'/modules/v4/core/engine');
const snapshot=require(BASE+'/modules/v2/adapters/runtime-snapshot');
const MCB=path.join(BASE,'../data/mcb-live');
const DURATION={'3m':180000,'15m':900000,'1h':3600000,
 '4h':14400000,'1d':86400000,'1w':604800000};
function capture(tickTs){
 const f=snapshot.buildRuntimeSnapshot(),at=Number(f.market.timestamp);
 if(!Number.isFinite(at)||at<=0||at>tickTs||tickTs-at>90000)
  throw Error('V493_SHADOW_SOURCE_TIMESTAMP_STALE_OR_FUTURE');
 if(!f.sources?.auditRows?.length)throw Error('V493_SHADOW_NO_AUDIT');
 f.sources.auditRows=f.sources.auditRows.filter(x=>x.ts<=at);
 const changed=[];
 for(const [tf,s] of Object.entries(f.sources.mcb.tfs||{})){
  const period=DURATION[tf];if(!period)continue;
  const prior=s.history?.length||0;
  s.history=(s.history||[]).filter(b=>Number.isFinite(b.ts)&&b.ts+period<=at);
  s.confirmed=s.history.at(-1)||null;
  s.confirmedAgeMs=s.confirmed?at-s.confirmed.ts:null;
  if(s.live){
   // The actual CSV-file write time is the LIVE observation time, not its
   // source candle start. Never use an unobserved/future LIVE field.
   const source=path.join(MCB,'mcb_'+tf+'_live.csv');
   let observedAt=null;try{observedAt=fs.statSync(source).mtimeMs;}catch(_){}
   if(observedAt===null||observedAt>at||s.live.ts>at){
    s.live=null;changed.push(tf+':live_omitted_asof');
   }else{s.live={...s.live,observedAt};}
  }
  if(s.history.length!==prior)changed.push(tf+':future_bar_filtered');
 }
 for(const row of f.sources.auditRows)
  if(row.ts>at)throw Error('V493_SHADOW_FUTURE_AUDIT');
 for(const [tf,s] of Object.entries(f.sources.mcb.tfs||{}))
  for(const b of s.history||[])
   if(b.ts+DURATION[tf]>at)throw Error('V493_SHADOW_FUTURE_BAR');
 return {frame:f,at,changed};
}
function evaluate({tickTs,previousEvaluation=null}){
 const {frame,at,changed}=capture(tickTs);
 const e=original.evaluate(frame,null,previousEvaluation);
 if(e.version!=='v4.9.3-mf-memory-admission-20261012')
  throw Error('V493_SHADOW_WRONG_FROZEN_ENGINE');
 return {engine:e.version,at,asOfVerified:true,
  action:e.action,setup:e.setup,
  proof:{asOf:at,lagMs:tickTs-at,filteredSourceFields:changed},
  fullEvaluation:e,brokerOrdersEnabled:false,noTradingAuthority:true};
}
module.exports={capture,evaluate};
