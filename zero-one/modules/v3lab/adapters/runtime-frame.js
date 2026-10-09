'use strict';
const fs=require('fs');
const path=require('path');
const {buildRuntimeSnapshot}=require('../../v2/adapters/runtime-snapshot');

const DATA=path.join(__dirname,'../../../data');
function readJson(p,fallback){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(_){return fallback;}}
function buildRuntimeFrame(primaryVol=null,liveTicks=[]){
  const s=buildRuntimeSnapshot(primaryVol);
  const all=readJson(path.join(DATA,'audit-history.json'),[]);
  s.sources.auditRows=Array.isArray(all)?all:[];
  s.sources.liveTicks=Array.isArray(liveTicks)?liveTicks.slice(-20000):[];
  const last=s.sources.liveTicks.length?s.sources.liveTicks[s.sources.liveTicks.length-1]:null;
  if(last&&Number.isFinite(last.price)&&Date.now()-last.ts<10000){
    s.market.price=last.price;
    s.market.timestamp=last.ts;
    s.market.priceSource='OKX_PRICE_STREAM';
    s.freshness.marketAgeMs=Math.max(0,Date.now()-last.ts);
  } else {
    s.market.priceSource='RUNTIME_SNAPSHOT_FALLBACK';
  }
  s.prototype={name:'V3-LAB',fullAuditRows:s.sources.auditRows.length,liveTickRows:s.sources.liveTicks.length};
  return s;
}
module.exports={buildRuntimeFrame};
