'use strict';
// TV fourth panel: bounded read-only Elastic 4×15 and 1m-confirmed OKX volume.
// Uses the exact Watch UI builders and thresholds; no new quality classifier.
// The output is independent of the PAPER trading engine and V543 analyses.
const fs=require('node:fs'),path=require('node:path');
const elasticUi=require('../modules/attention/v494-elastic-ui-summary');
const volume1m=require('../modules/attention/v494-elastic-volume-1m');
const SOURCE='V494_ELASTIC_4X15_DISPLAY_ONLY';
const SUMMARY_NAME='v494-elastic-shadow-summary.json';
const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
function createReader({dataDir=path.resolve(__dirname,'../data'),
 clock=()=>Date.now(),volumeProvider=volume1m.createProvider(),
 intervalMs=60000}={}){
 const summary=path.join(dataDir,SUMMARY_NAME);
 let cached=null,mtime=null,size=null,vol=null,pending=null,
     lastRefresh=0,lastRequestedAsOf=null,lastErr=null;
 function packet(){
  try{
   const st=fs.statSync(summary);
   if(st.size>256*1024||st.size<20)throw Error('ELASTIC_SUMMARY_SIZE');
   if(!cached||mtime!==st.mtimeMs||size!==st.size){
    const raw=JSON.parse(fs.readFileSync(summary,'utf8'));
    const validated=elasticUi.build(raw,clock());
    if(validated.decisionImpact!==false||validated.brokerOrdersEnabled!==false||
      validated.mode!=='SHADOW_ONLY'||!Array.isArray(validated.quality4x15))
      throw Error('UNTRUSTED_ELASTIC_4X15');
    cached=validated;mtime=st.mtimeMs;size=st.size;
   }
   // Do not erase an independent confirmed-volume refresh error merely
   // because the Elastic JSON remains readable.
   return cached;
  }catch(e){lastErr=String(e.message||e).slice(0,105);return null;}
 }
 async function refresh(force=false){
  const p=packet(),now=clock();
  if(!p)return false;
  if(!force&&lastRefresh&&now-lastRefresh<intervalMs)return true;
  if(pending)return pending;
  lastRefresh=now;lastRequestedAsOf=p.asOf;
  pending=Promise.resolve().then(()=>volumeProvider.get(p.quality4x15,p.asOf))
   .then(data=>{
    if(!data||data.decisionImpact!==false||data.brokerOrdersEnabled!==false||
       data.source!==volume1m.SOURCE||!Array.isArray(data.windows))
      throw Error('UNTRUSTED_OKX_1M_VOLUME');
    // Volume measurements are strictly as-of the same Elastic snapshot.
    vol={...data,forAsOf:p.asOf};
    lastErr=null;
    return true;
   }).catch(err=>{
    lastErr=String(err.message||err).slice(0,105);
    vol=null;
    return false;
   }).finally(()=>{pending=null;});
  return pending;
 }
 function view(){
  const p=packet(),now=clock();
  const fresh=p&&finite(p.asOf)&&Number(p.asOf)<=now+30000&&
    now-Number(p.asOf)<=90000&&p.status==='DATA_RECENT';
  if(!p)return {source:SOURCE,status:'UNAVAILABLE',mode:'SHADOW_ONLY',
    decisionImpact:false,brokerOrdersEnabled:false,
    asOf:null,windows:[],volume4x15:null,error:lastErr};
  // Shadow observations may update every ~30 s while confirmed 1m volume
  // refreshes every minute. A prior volume as-of is acceptable within 90s;
  // never display volume sampled AFTER this Elastic summary as if known before.
  const trustedVolume=vol&&finite(vol.forAsOf)&&Number(vol.forAsOf)<=p.asOf&&
    p.asOf-Number(vol.forAsOf)<=90000&&vol.status==='OK'&&
    now-Number(vol.updatedAt||0)<=240000;
  return {
   source:SOURCE,mode:'SHADOW_ONLY',decisionImpact:false,brokerOrdersEnabled:false,
   asOf:p.asOf,ageMs:now-p.asOf,status:fresh?'DATA_RECENT':'SOURCE_STALE',
   windows:p.quality4x15.slice(-4).map(w=>({
    startAt:w.startAt,partial:w.partial===true,samples:w.samples,
    coverageFraction:w.coverageFraction,qualityCoverageFraction:w.qualityCoverageFraction,
    qualityFractions:w.qualityFractions,directionFractions:w.directionFractions,
    marketFractions:w.marketFractions,meanFlowBtcPerSec:w.meanFlowBtcPerSec
   })),
   volume4x15:trustedVolume?{
    source:volume1m.SOURCE,status:'OK',asOf:vol.forAsOf,updatedAt:vol.updatedAt,
    windows:vol.windows.slice(-4).map(w=>({
     startAt:w.startAt,meanBtcPerMinute:w.sourceStatus==='OK'?w.meanBtcPerMinute:null,
     meanGraphVolumePct:w.sourceStatus==='OK'?w.meanGraphVolumePct:null,
     observedMinutes:w.observedMinutes,expectedMinutes:w.expectedMinutes,
     sourceStatus:w.sourceStatus,status:w.status
    }))
   }:null,
   error:lastErr,
   note:'V494 Elastic quality fractions SHADOW 4x15; OKX confirmed 1m volCcy and same 3m ten-pastille intensity. No V543 admission authority.'
  };
 }
 return {view,refresh,packet};
}
module.exports={SOURCE,createReader};
