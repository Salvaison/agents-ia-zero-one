'use strict';
// Dedicated V5.2 decision + execution PAPER service. Never imports real broker clients.
const fs=require('fs'),path=require('path'),stream=require('../price-stream');
const decision=require('./decision-v543'),paper=require('./paper-v543'),
  nativeFeed=require('./causal-event-feed-v54'),
  shadow=require('../attention/v493-exact-shadow');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const MCB=path.resolve(ROOT,'../data/mcb-live');
const STATE=path.join(DATA,'v52-paper-state.json');
const TRADES=path.join(DATA,'v52-paper-trades.ndjson');
const CHANGES=path.join(DATA,'v52-paper-decisions.ndjson');
const NATIVE_FEED_STATE=path.join(DATA,'v54-native-event-feed-state.json');
// Reuse observational V493 shadow, not a second trading strategy or order.
const SHADOW_STATE=path.join(DATA,'v542-admission-shadow-state.json');
const ELASTIC_EVENTS=path.join(DATA,'elastic-observer-events.ndjson');
const INTERVAL_MS=5000;
const json=(p,f)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(_){return f;}};
function writeAtomic(p,x){
 const tmp=p+'.tmp-'+process.pid;fs.writeFileSync(tmp,JSON.stringify(x));fs.renameSync(tmp,p);
}
const {appendRotatingNdjson,readRecentNdjson}=require('../v3lab/storage/rotating-ndjson');
function append(p,x){appendRotatingNdjson(p,x,{maxBytes:4*1024*1024,maxSegments:10});}
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
function tail(p,n=350000){
 const st=fs.statSync(p),fd=fs.openSync(p,'r'),len=Math.min(st.size,n);
 const b=Buffer.allocUnsafe(len);
 try{fs.readSync(fd,b,0,len,st.size-len);}finally{fs.closeSync(fd);}
 return b.toString('utf8').split(/\r?\n/).slice(st.size>len?1:0).filter(x=>x&&!x.startsWith('timestamp,'));
}
function csv(tf){
 const p=path.join(MCB,'mcb_'+tf+'.csv');
 const rows=tail(p,tf==='3m'?250000:tf==='15m'?190000:110000);
 const a=[];for(const line of rows){
  const v=line.split(',');if(v.length<8)continue;
  const ts=Date.parse(v[0]);if(!Number.isFinite(ts))continue;
  const num=k=>finite(v[k])?Number(v[k]):null;
  if(num(4)===null||num(5)===null)continue;
  a.push({ts,open:num(1),high:num(2),low:num(3),close:num(4),
   lt_blue_wave:num(5),blue_wave:num(6),money_flow:num(7),ma200:num(12),
   wt1_cross_up:num(13),wt1_cross_dn:num(14)});
 }
 return a.sort((x,y)=>x.ts-y.ts);
}
let caches={};
function cached(file,loader){
 const m=fs.statSync(file).mtimeMs;const prev=caches[file];
 if(prev&&prev.m===m)return prev.data;
 const data=loader();caches[file]={m,data};return data;
}
function latest(){
 const audit=cached(path.join(DATA,'audit-history.json'),()=>json(path.join(DATA,'audit-history.json'),[]));
 const samples=audit.slice(-450).filter(x=>finite(x.ts)&&finite(x.lastPrice));
 const tf=t=>cached(path.join(MCB,'mcb_'+t+'.csv'),()=>csv(t));
 const levels=cached(path.join(DATA,'levels.json'),()=>json(path.join(DATA,'levels.json'),[]));
 // Only the latest actual TradingView MA200 Live observation is admitted;
 // barStartTs is NOT observedAt. Older historical replays reject future mtime.
 const liveMa=tf=>{
  try{
   const f=path.join(MCB,'mcb_'+tf+'_live.csv');
   const observedAt=Math.round(fs.statSync(f).mtimeMs);
   const lines=tail(f,2400),v=lines.at(-1)?.split(',')||[];
   const barTs=Date.parse(v[0]),value=finite(v[12])?Number(v[12]):null;
   return value!==null&&value>0&&Number.isFinite(barTs)?
     {barTs,observedAt,value,source:'MCB_TRADINGVIEW_LIVE_MA200'}:null;
  }catch(_){return null;}
 };
 const liveMa3=liveMa('3m'),liveMa15=liveMa('15m');
 // One bounded existing Elastic source: causal E3 / E15 / PM history.
 // LIVE means observed time; sourceTs is only the TradingView bar start.
 const historyPath=path.join(DATA,'elastic-observer-events.ndjson');
 let native15Events=[],causalEvents=[];
 try{
  causalEvents=cached(historyPath,()=>tail(historyPath,1600000).map(line=>{
   try{return JSON.parse(line);}catch(_){return null;}
  }).filter(e=>e&&Number.isFinite(e.observedAt)&&
   ((e.family==='MCB15'&&e.key==='E15')||
    (e.family==='MCB3'&&e.key==='E3')||
    (e.family==='CONVERSION'&&e.key==='CONVERSION')||
    ((e.family==='MCB15'||e.family==='MCB3')&&e.key==='BW_LBW_CROSS')))
   .map(e=>({family:e.family,key:e.key,type:e.type,
    direction:e.direction||e.current?.direction||null,
    sourceTs:e.sourceTs,observedAt:e.observedAt,price:e.price,
    quality:e.current?.quality||null,previous:e.previous||null,
    value:e.current?.value??null,
    detail:e.detail&&{pm3:e.detail.pm3,pm5:e.detail.pm5,
      pmLive:e.detail.pmLive,effortVsP75:e.detail.effortVsP75,
      yieldVsP75:e.detail.yieldVsP75}})));
  native15Events=causalEvents.filter(e=>e.family==='MCB15'&&
    e.key==='E15'&&['OBSERVED','CONFIRMED'].includes(e.type));
 }catch(_){}

 const last=samples.at(-1),time=Date.now();
 const health=['3m','15m'].every(t=>{
  const folder=path.join(MCB,'mcb_'+t+'_live.csv');
  try{return time-fs.statSync(folder).mtimeMs<(t==='3m'?120000:180000);}catch(_){return false;}
 });
 return {samples,bars3:tf('3m'),bars15:tf('15m'),bars1h:tf('1h'),bars4h:tf('4h'),
  levels,native15Events,causalEvents,liveMa3,liveMa15,last,health};
}
function main(){
 const flags=new Set(process.argv.slice(2));
 if(flags.has('--test-read')){
  const x=latest(),now=x.last.ts;
  const d=decision.evaluate({...x,now,price:x.last.lastPrice,startedAt:now-120*60000,
   sourceAgeMs:0,tickAgeMs:0});
  console.log(JSON.stringify({mode:'READ_ONLY_TEST',decision:d},null,2));return;
 }
 let s=json(STATE,null);
 // Versioned migration is explicit. Incompatible/corrupt state HALTS; never
 // reset the ledger or overwrite a position simply because policy changed.
 s=paper.migrate(s,Date.now());
 // Keep the original startedAt so only genuinely new causally observed crossings
 // can trigger; keys are matched across both policy generations.
 writeAtomic(STATE,s);
 // V4.10.10 used to WRITE native Elastic observations as an unintended
 // side effect of its old trading simulator. V5.4 is the sole strategy, so
 // source collection is now a PURE native-data writer inside this runner.
 // The gap while old writer was stopped is not falsely backdated.
 const feedBootstrap=latest();
 const lastObserved=readRecentNdjson(ELASTIC_EVENTS,1).at(-1);
 let feedState=json(NATIVE_FEED_STATE,null);
 if(!feedState||feedState.version!==nativeFeed.VERSION){
  feedState=nativeFeed.initial(feedBootstrap.last,feedBootstrap.bars3,
    feedBootstrap.bars15,lastObserved?.id||0);
  writeAtomic(NATIVE_FEED_STATE,feedState);
 }
 if(Number(lastObserved?.id)>feedState.lastId)feedState.lastId=lastObserved.id;
 console.log('[V54 NATIVE EVENT DATA] '+JSON.stringify({
  latestAuditAt:feedBootstrap.last.ts,lastElasticObservedAt:lastObserved?.observedAt||null,
  lastEventId:feedState.lastId,role:'TELEMETRY_ONLY_NO_EXTRA_TRADING_ENGINE'}));
 let busy=false,priorKey=null,lastSave=0,errors=0;
 let comparison=json(SHADOW_STATE,null),shadowAttemptAt=0;
 function tick(){
  if(busy)return;busy=true;
  try{
   const x=latest(),tickTs=Number(stream.lastUpdateTs),price=Number(stream.lastPrice);
   if(!tickTs||!Number.isFinite(price)||tickTs<=0)return;
   const received=Date.now(),age=received-tickTs;
   // Stable as-of chronology; never run decision against an older tick.
   if(tickTs<=s.lastObservationAt)return;
   // Real V493 code evaluated as FLAT on its OWN causal state every ~30s.
   // This side calculation has no ledger/broker and cannot change V542 action.
   if(received-shadowAttemptAt>=30000){
    shadowAttemptAt=received;
    try{
     const v=shadow.evaluate({tickTs,previousEvaluation:comparison?.fullEvaluation||null});
     if(!comparison||v.at>comparison.at){
      comparison={...v,checkedAt:received};writeAtomic(SHADOW_STATE,comparison);
     }
    }catch(err){
     if(!comparison?.failureLoggedAt||received-comparison.failureLoggedAt>180000){
      console.error('[V543 ADMISSION SHADOW] '+err.message);
      if(comparison)comparison.failureLoggedAt=received;
     }
    }
   }
   const auditAge=tickTs-x.last.ts;
   let nativeAdded=[];
   // Do not let telemetry or an old event-file failure interrupt position risk.
   if(x.health&&tickTs-x.last.ts>=0&&tickTs-x.last.ts<=65000){
    try{
     const r=nativeFeed.step(feedState,x.last,x.bars3,x.bars15);
     if(r.changed){
      for(const e of r.events)appendRotatingNdjson(ELASTIC_EVENTS,e,
       {maxBytes:8*1024*1024,maxSegments:32});
      feedState=r.state;writeAtomic(NATIVE_FEED_STATE,feedState);
      nativeAdded=r.events;
     }
    }catch(err){console.error('[V54 NATIVE EVENT DATA] '+err.message);}
   }
   const d=decision.evaluate({...x,causalEvents:[...x.causalEvents,...nativeAdded],
    now:tickTs,price,
    startedAt:s.policyActivatedAt||s.startedAt,
    position:s.position,sourceAgeMs:auditAge,tickAgeMs:age,
    previousAttention:s.attentionState||null,
    previousOffensiveMaturity:s.offensiveMaturityMemory||null,
    lastExitAt:String(s.lastAction?.type||'').startsWith('EXIT_')?s.lastAction.ts:null,
    v493AdmissionAsOf:comparison&&comparison.at<=tickTs?comparison:null});
   if(!x.health){d.quality='DATA_DEGRADED';if(!s.position){
     d.action='WAIT';d.reason='MCB_COLLECTOR_STALE';
   }}
   const result=paper.step(s,d,{price,ts:tickTs,sourceAgeMs:auditAge,tickAgeMs:age});
   s=result.state;
   s.latestAnalysis=d;
   s.attentionState=d.readings?.attention||null;
   const episodeMark=e=>e?[e.status,e.campaignId,e.candidate,e.deferredAt,e.requalifiedAt].join('|'):'NONE';
   const previousEpisodeMark=episodeMark(s.offensiveMaturityMemory);
   s.offensiveMaturityMemory=d.readings?.offensiveMaturityMemory||null;
   const maturityStateChanged=episodeMark(s.offensiveMaturityMemory)!==previousEpisodeMark;
   // Archive only causal MA transitions/retest episodes, not every 5s candle value.
   // Retest COUNTS are telemetry; none of them is evaluated by the decision engine.
   const maMark=tf=>{
    const m=d.readings?.maContract?.[tf]?.polarityMemory;
    return m?[m.polarity,m.polarityChangedAt,m.retestsSinceChange,
      m.lastRejection?.at,m.lastFailedReclaim?.at].join(':'):'UNKNOWN';
   };
   const key=[d.action,d.reason,d.phase,s.position?.direction||'FLAT',
     result.reason,maMark('ma3'),maMark('ma15'),
     d.readings?.attention?.stage||'UNKNOWN',
     d.readings?.admissionV493Shadow?.action||'NO_SHADOW',
     d.readings?.offensiveMaturity?.classification||'NO_OFFENSIVE_ASSESSMENT',
     s.offensiveMaturityMemory?.status||'NO_EPISODE'].join('|');
   if(result.event||priorKey!==key){
    append(CHANGES,{ts:tickTs,price,action:d.action,reason:d.reason,phase:d.phase,
     candidate:d.candidate,decisionOutcome:result.reason,tradeEvent:result.event||null,
     conversion:d.readings.conversion,place:d.readings.place,geometry:d.readings.geometry,
     maturity:d.readings.maturity,causalChain:d.readings.causalChain,
     maContract:d.readings.maContract,
     e15Requalification:d.readings.e15Requalification,
     conversionCampaign:d.readings.conversionCampaign,
     structural54:d.readings.structural54,
     attention:{stage:d.readings?.attention?.stage,
      asOf:d.readings?.attention?.asOf,
      evidenceCount:d.readings?.attention?.events?.length||0,
      transferPossible:!!d.readings?.attention?.opposing?.transferable},
     admissionV493Shadow:d.readings?.admissionV493Shadow,
     offensiveMaturity:{classification:d.readings?.offensiveMaturity?.classification,
      deferred:!!d.readings?.offensiveMaturity?.deferNewEntry,
      status:s.offensiveMaturityMemory?.status||null,
      source:d.readings?.offensiveMaturity?.context?.priceOrigin||null,
      evidence:d.readings?.offensiveMaturity?.evidence||[]},
     invalidation:d.invalidation,invalidationEvidence:d.readings.invalidationEvidence,
     quality:d.quality,origin:'V5.4.3_PAPER',policyVersion:d.version,brokerOrdersEnabled:false});
    priorKey=key;
   }
   if(result.trade)append(TRADES,result.trade);
   if(result.event||maturityStateChanged||received-lastSave>=30000){
    writeAtomic(STATE,s);lastSave=received;
   }
   if(result.event)console.log('[V543 PAPER] '+JSON.stringify(result.event));
   errors=0;
  }catch(e){if(++errors<=4||errors%20===0)console.error('[V52 PAPER] '+e.stack);}
  finally{busy=false;}
 }
 stream.on('error',e=>console.error('[V52 PRICE] '+e.message));
 stream.start();
 console.log('[V543 PAPER] '+JSON.stringify({policy:decision.VERSION,mode:'PAPER_ONLY',brokerOrdersEnabled:false,
  startAt:s.startedAt,priorTrades:s.completed,position:s.position?.direction||null}));
 setInterval(tick,INTERVAL_MS);
}
if(require.main===module)main();
module.exports={csv,latest};
