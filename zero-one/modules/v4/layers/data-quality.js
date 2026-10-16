'use strict';

const VERSION='mcb-data-quality-v0.1';
const CONFIG={
  '3m':{liveUpdateMaxMs:120000,liveRowMaxMs:5*60000,confirmedUpdateMaxMs:8*60000,confirmedRowMaxMs:8*60000},
  '15m':{liveUpdateMaxMs:180000,liveRowMaxMs:17*60000,confirmedUpdateMaxMs:20*60000,confirmedRowMaxMs:32*60000}
};
function finite(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));}
function tfQuality(src,tf){
  const cfg=CONFIG[tf];
  if(!cfg)return {timeframe:tf,ready:true,status:'UNSCOPED'};
  if(!src)return {timeframe:tf,ready:false,status:'SOURCE_MISSING',reasons:['SOURCE_MISSING'],config:cfg};
  const vals={
    liveUpdateAgeMs:finite(src.liveUpdateAgeMs)?Number(src.liveUpdateAgeMs):null,
    liveRowAgeMs:finite(src.liveAgeMs)?Number(src.liveAgeMs):null,
    confirmedUpdateAgeMs:finite(src.confirmedUpdateAgeMs)?Number(src.confirmedUpdateAgeMs):null,
    confirmedRowAgeMs:finite(src.confirmedAgeMs)?Number(src.confirmedAgeMs):null
  };
  // Synthetic/unit-test frames may not carry freshness metadata. Preserve
  // compatibility there; production runtime always supplies these ages.
  const measured=Object.values(vals).some(finite);
  if(!measured)return {timeframe:tf,ready:true,status:'FRESHNESS_UNMEASURED',measured:false,reasons:[],...vals,config:cfg};
  const reasons=[];
  if(vals.liveUpdateAgeMs===null||vals.liveUpdateAgeMs>cfg.liveUpdateMaxMs)reasons.push('LIVE_FILE_STALE');
  if(vals.liveRowAgeMs===null||vals.liveRowAgeMs>cfg.liveRowMaxMs)reasons.push('LIVE_ROW_STALE');
  if(vals.confirmedUpdateAgeMs===null||vals.confirmedUpdateAgeMs>cfg.confirmedUpdateMaxMs)reasons.push('CONFIRMED_FILE_STALE');
  if(vals.confirmedRowAgeMs===null||vals.confirmedRowAgeMs>cfg.confirmedRowMaxMs)reasons.push('CONFIRMED_ROW_STALE');
  return {timeframe:tf,ready:reasons.length===0,status:reasons.length?'STALE':'FRESH',measured:true,reasons,...vals,config:cfg};
}
function evaluate(frame){
  const tfs=frame&&frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs||{};
  const threeMinute=tfQuality(tfs['3m'],'3m');
  const fifteenMinute=tfQuality(tfs['15m'],'15m');
  const degraded=[];
  if(!threeMinute.ready)degraded.push('3m');
  if(!fifteenMinute.ready)degraded.push('15m');
  return {
    version:VERSION,state:degraded.length?'DATA_DEGRADED':'DATA_OK',degraded:degraded.length>0,
    decisionImpact:degraded.length?'SUSPEND_NEW_ENTRIES':'NONE',
    threeMinute,fifteenMinute,
    semantic:'stale MCB never retains entry authority; hard risk and price observation remain available while data recovers'
  };
}
module.exports={VERSION,CONFIG,tfQuality,evaluate};
