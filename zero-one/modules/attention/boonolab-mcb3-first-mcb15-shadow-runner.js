'use strict';
// MCB3-first / MCB15-wave live laboratory. NO PAPER/BROKER writes.
// Separate from S1 v0.1, S1 v0.2, V543, and V55 accounts and their decision engines.
const fs=require('node:fs'),path=require('node:path');
const model=require('./boonolab-mcb3-first-mcb15-shadow');
const {latest}=require('../v5/runner-v543');
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const SOURCE_V543=path.join(DATA,'v52-paper-state.json');
const SOURCE_V55=path.join(DATA,'v55-paper-state.json');
const SOURCE_MARKET=path.join(DATA,'boonolab-market-observer-summary.json');
const STATE=path.join(DATA,'boonolab-mcb3-first-mcb15-shadow-state.json');
const SUMMARY=path.join(DATA,'boonolab-mcb3-first-mcb15-shadow-summary.json');
const EVENTS=path.join(DATA,'boonolab-mcb3-first-mcb15-shadow-events.ndjson');
const SAMPLES=path.join(DATA,'boonolab-mcb3-first-mcb15-shadow-samples.ndjson');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const atomic=(f,x)=>{const tmp=f+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(x));fs.renameSync(tmp,f)};
function sources(){
 const j=read(SOURCE_V543),v=read(SOURCE_V55);
 if(j.version!=='v5.4.3-paper-ledger-v1.0'||j.brokerOrdersEnabled!==false||
  j.mode!=='PAPER_ONLY'||v.version!=='v5.5-paper-ledger-v1.0'||
  v.brokerOrdersEnabled!==false||v.mode!=='PAPER_ONLY')
  throw Error('MCB3_WAVE_SHADOW_SOURCE_CONTRACT_INVALID');
 const dec=j.latestAnalysis,at=dec?.asOf;
 if(!Number.isFinite(at)||Math.abs(j.lastObservationAt-at)>2000||
  Date.now()-at>95000||at>Date.now()+5000)
  throw Error('MCB3_WAVE_SHADOW_STALE_SOURCE');
 const inp=latest();
 const obs=model.extract(dec,{audit:inp.samples,bars15:inp.bars15,now:at});
 if(!obs)throw Error('MCB3_WAVE_SHADOW_NO_CAUSAL_MCB3_OR_PARENT');
 const market=read(SOURCE_MARKET).regime||{};
 if(market.asOf<=at&&at-market.asOf<=95000)
  obs.liquidity.marketRegime=market.label||null;
 const vh=v.position&&v.position.entryAt<=at?v.position:null;
 const jh=j.position&&j.position.entryAt<=at?j.position:null;
 return {obs,position:vh||jh,
  positionSource:vh?'V55_PAPER':jh?'V543_PAPER':'FLAT',
  paperVersions:{v55:v.policyVersion,v543:j.version},
  originalDecisions:{v55:v.decision||null,v543:{
   action:dec.action,reason:dec.reason,phase:dec.phase}},
  sourcesFresh:true};
}
function render(state,meta){
 const v=state.latest||{};
 return {version:model.VERSION,asOf:state.lastAt,
  writtenAt:Date.now(),mode:'SHADOW_ONLY',
  decisionImpact:false,brokerOrdersEnabled:false,
  authorizesOrders:false,proposesEntriesOnly:true,
  observations:state.observations,phase:state.phase,
  latest:v,campaign:state.campaign,
  tacticalEpisode:state.tacticalEpisode,
  recentEvents:state.recentEvents.slice(-22),
  recentCampaigns:state.campaignArchive.slice(-6).map(x=>({
   parentId:x.parentId,direction:x.direction,
   firstObservedAt:x.firstObservedAt,endedAt:x.endedAt,
   tacticalAttempts:x.tacticalAttempts,
   counterAttempts:x.counterAttempts,
   resumptions:x.resumptions})),
  positionSource:meta.positionSource,
  actualPaperDecisions:meta.originalDecisions,
  contracts:{
   first:'MCB3 CROSS: event creates the tactical episode',
   director:'MCB15 BW/LBW, LIVE vs closed cross, E15 parent memory',
   MF:'MF15 slope with MF3 inside the same wave, not separate votes',
   PLACE:'price/map/MA/proxies are descriptive, not infallible boundaries',
   CONVERSION:'PM3/PM5/Live are correlated price responses',
   RISK:'Existing PAPER hard risk -500 BTC price move remains untouched',
   futureProof:'NO DATA AFTER ASOF',
   dateLimits:'NO CROSS3 18min/E3 25min/15min REENTRY TIMER',
   labels:'No new numeric indicator gates'},
  caveat:'Prospective observational shadow, NOT a simulated or funded trade. A closed BW15/LBW15 crossover is a major structural signal, not a guaranteed reversal. Missing samples are not inferred.'};
}
function run(){
 const test=process.argv.includes('--test-read');
 const state0=fs.existsSync(STATE)?read(STATE):model.initial(Date.now());
 model.assertState(state0);const state=state0;
 const tick=()=>{
  const source=sources();
  const r=model.observe(state,source.obs,{position:source.position});
  if(!r.changed)return null;
  if(test)return render(state,source);
  atomic(STATE,state);
  atomic(SUMMARY,render(state,source));
  const view=r.result;
  appendRotatingNdjson(SAMPLES,{at:source.obs.at,
   cross3:source.obs.cross3,
   parent:source.obs.parent,parentId:source.obs.parentId,
   phase:r.result.campaignPhase,mc15:r.result.structural,
   mf:r.result.structural.mfRelation,
   price:source.obs.price,pm:source.obs.pm,
   liquidity:source.obs.liquidity,
   version:model.VERSION,decisionImpact:false,
   brokerOrdersEnabled:false},{maxBytes:3*1024*1024,maxSegments:8});
  for(const event of r.events)
   appendRotatingNdjson(EVENTS,event,{maxBytes:3*1024*1024,maxSegments:8});
  return render(state,source);
 };
 if(test){
  console.log(JSON.stringify({test:'READ_ONLY',snapshot:tick()},null,2));
  return;
 }
 console.log('[MCB3-FIRST MCB15 SHADOW] '+JSON.stringify({
  version:model.VERSION,startedAt:state.startedAt,observations:state.observations,
  mode:'SHADOW_ONLY',brokerOrdersEnabled:false,decisionImpact:false}));
 let busy=false,errCount=0;
 const step=()=>{
  if(busy)return;busy=true;
  try{tick();errCount=0;}
  catch(e){errCount++;if(errCount<=5||errCount%30===0)
   console.error('[MCB3-FIRST LAB ERROR] '+(e.stack||e))}
  finally{busy=false}
 };
 step();setInterval(step,15000);
}
if(require.main===module)run();
module.exports={sources,render,run,STATE,SUMMARY,EVENTS,SAMPLES};
