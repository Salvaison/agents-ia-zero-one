'use strict';
function current(src){
  if(!src)return null;
  if(src.live&&src.liveUpdateAgeMs!==null&&src.liveUpdateAgeMs<120000)return {row:src.live,source:'live',updateAgeMs:src.liveUpdateAgeMs};
  if(src.confirmed)return {row:src.confirmed,source:'confirmed',updateAgeMs:src.confirmedUpdateAgeMs};
  return null;
}
function build(frame){
  const tfs=((frame.sources||{}).mcb||{}).tfs||{}, mcb={};
  for(const tf of ['1w','1d','4h','1h','15m','3m']){
    const c=current(tfs[tf]);
    mcb[tf]=c?{
      source:c.source,updateAgeMs:c.updateAgeMs,timestamp:c.row.timestamp,
      open:c.row.open,high:c.row.high,low:c.row.low,close:c.row.close,
      lbw:c.row.lt_blue_wave,bw:c.row.blue_wave,moneyFlow:c.row.money_flow,
      dbsiTop:c.row.dbsi_top,dbsiBottom:c.row.dbsi_bottom
    }:null;
  }
  const audit=(frame.sources.auditRows||[]), last=audit.length?audit[audit.length-1]:null;
  return {
    contract:'BATON_V3_RAW_ONLY',
    timestamp:new Date().toISOString(),
    market:{price:frame.market.price,timestamp:frame.market.timestamp,source:frame.market.priceSource,
      liveTickCount:(frame.sources.liveTicks||[]).length},
    ticker:last?{
      ts:last.ts,cadence:last.cadence,volumeFenetreBtc:last.volumeFenetreBtc,winSec:last.winSec,
      priceMove:last.priceMove,lastPrice:last.lastPrice,priceHigh:last.priceHigh,priceLow:last.priceLow,
      netMove:last.netMove,amplitude:last.amplitude
    }:null,
    mcb,
    structures:{trendlines:frame.sources.trendlines||null,levels:frame.sources.levels||[]},
    freshness:frame.freshness,
    rule:'facts only; no recommendedDirection, vigilance, action or polarity inference'
  };
}
module.exports={build};
