'use strict';
// Independently scheduled V543 LBW15 S1 shadow. It NEVER calls paper.step,
// updates PAPER ledgers, loads a broker, or modifies Watch/BOONO-TV assets.
const fs=require('node:fs'),path=require('node:path');
const model=require('./v543-lbw15-s1');
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const PAPER=path.join(DATA,'v52-paper-state.json');
const STATE=path.join(DATA,'v543-lbw15-s1-shadow-state.json');
const SUMMARY=path.join(DATA,'v543-lbw15-s1-shadow-summary.json');
const EVENTS=path.join(DATA,'v543-lbw15-s1-shadow-events.ndjson');
const n=x=>x===null||x===undefined||x===''?null:
 Number.isFinite(Number(x))?Number(x):null;
const json=(p,alt=null)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}
 catch(e){if(e.code==='ENOENT')return alt;throw e;}};
function atomic(p,x){const tmp=p+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(x));fs.renameSync(tmp,p);}
function archiveSamples(now){
 // Raw Bâton/TradingView snapshots are observed at their as-of ts, no future.
 // These carry the continuous LBW15 path; decisions are sparse and only a fallback.
 const audit=json(path.join(DATA,'audit-history.json'),[]);
 const continuous=Array.isArray(audit)?audit.filter(x=>
   n(x.ts)!==null&&x.ts<=now&&x.ts>=now-4*3600000&&
   n(x.live15LbwRaw)!==null&&n(x.live15BwRaw)!==null)
  .map(x=>({at:Number(x.ts),lbw:Number(x.live15LbwRaw),
   bw:Number(x.live15BwRaw),price:n(x.lastPrice),
   provenance:'AUDIT_30S_ACTUAL_OBSERVATION'})): [];
 if(continuous.length>=40)return continuous.slice(-720);
 const names=fs.readdirSync(DATA)
  .filter(x=>/^v52-paper-decisions\.segment-.*\.ndjson$/.test(x)).sort().slice(-5)
  .concat('v52-paper-decisions.ndjson');
 const rows=[];
 for(const f of names){
  try{
   const data=fs.readFileSync(path.join(DATA,f),'utf8');
   for(const line of data.split('\n')){
    if(!line.trim())continue;
    try{
     const x=JSON.parse(line),at=n(x.ts);
     if(at===null||at>now||at<now-4*3600000)continue;
     const s=model.sample(x);
     if(s)rows.push(s);
    }catch(_){}
   }
  }catch(_){}
 }
 const seen=new Set(),spaced=[];
 for(const x of rows.sort((a,b)=>a.at-b.at)){
  if(seen.has(x.at))continue;
  seen.add(x.at);
  if(spaced.length&&x.at-spaced.at(-1).at<20000)continue;
  spaced.push(x);
 }
 return spaced.slice(-720);
}
function initial(paper,now){
 return {version:model.VERSION,mode:'SHADOW_ONLY',decisionImpact:false,
  brokerOrdersEnabled:false,startedAt:now,lastAt:0,
  observations:0,samples:archiveSamples(now),
  lastPaperEntryAt:n(paper.position?.entryAt),
  lastPaperCompleted:paper.completed,
  admissionFlags:{},matchedClosed:[],lastResult:null,
  latest:null,lastClassification:null,lastRecommendation:null,
  startupHistory:'AS_OF_PAPER_DECISION_ARCHIVE_4H_WARMUP',
  note:'S1 is an observer; flagged trades are diagnostic, not a recreated portfolio'};
}
function report(s,now){
 const tested=s.matchedClosed;
 const flagged=tested.filter(x=>x.flagged);
 const stats=arr=>({count:arr.length,winners:arr.filter(x=>x.net>0).length,
   netBaselineUsd:Math.round(arr.reduce((p,x)=>p+x.net,0)*100)/100,
   feesBaselineUsd:Math.round(arr.reduce((p,x)=>p+x.fees,0)*100)/100});
 return {version:model.VERSION,asOf:s.lastAt,freshAtWrite:now,
  mode:'SHADOW_ONLY',decisionImpact:false,brokerOrdersEnabled:false,
  observations:s.observations,sampleCoverageMinutes:s.samples.length?
   Math.round((s.lastAt-s.samples[0].at)/60000):null,
  latest:s.latest,lastClassification:s.lastClassification,
  statistics:{matchedClosed:stats(tested),flagged:stats(flagged),
   unflagged:stats(tested.filter(x=>!x.flagged))},
  recentMatchedClosed:tested.slice(-15),
  caveat:'No real counterfactual equity: opportunity costs and reentries are not simulated. Exploratory LBW thresholds, prospective shadow only.'};
}
function advance(s,paper){
 if(!paper||paper.brokerOrdersEnabled!==false||
    paper.mode!=='PAPER_ONLY'||paper.version!=='v5.4.3-paper-ledger-v1.0')
  throw Error('S1_REFUSE_INVALID_PAPER_SOURCE');
 const d=paper.latestAnalysis||null, cur=model.sample(d);
 if(!cur||cur.at<=s.lastAt)return false;
 if(Math.abs(cur.at-n(paper.lastObservationAt))>1000||
    Date.now()-cur.at>95000||cur.at>Date.now()+5000)
  throw Error('S1_REFUSE_STALE_OR_NONCAUSAL_ANALYSIS');
 const view=model.inspect(s.samples,cur,paper.position||null);
 s.samples.push(cur);
 s.samples=s.samples.filter(x=>x.at>=cur.at-4*3600000).slice(-720);
 const classified=view.classification+'|'+view.proposedAdmission+'|'+view.proposedPosition;
 if(classified!==s.lastClassification){
  appendRotatingNdjson(EVENTS,{at:cur.at,type:'S1_LBW15_EVIDENCE_TRANSITION',
   sourceAt:view.sourceAt,knownAt:view.firstKnownAt,
   from:s.lastClassification,to:classified,
   campaignId:cur.parentId,lbwDelta15m:view.lbwDelta15m,
   evidence:view.evidence,decisionImpact:false,brokerOrdersEnabled:false},
   {maxBytes:4*1024*1024,maxSegments:10});
 }
 const pos=paper.position;
 if(pos&&n(pos.entryAt)!==s.lastPaperEntryAt){
  const tradeNo=(paper.completed||0)+1;
  const direction=pos.direction;
  const pView=model.inspect(s.samples.slice(0,-1),{...cur,candidate:direction,
   phase:pos.entryContext?.phase||cur.phase},pos);
  s.admissionFlags[String(tradeNo)]={at:n(pos.entryAt),seenAt:cur.at,
   direction,campaignId:pos.campaignId||null,
   classification:pView.classification,phase:pView.phase,
   proposedAdmission:pView.proposedAdmission,
   flagged:pView.hypotheticalAdmissionDefer,
   evidence:pView.evidence};
  s.lastPaperEntryAt=n(pos.entryAt);
  appendRotatingNdjson(EVENTS,{at:cur.at,type:'S1_ACTUAL_PAPER_ADMISSION_OBSERVED',
   tradeNo,entryAt:n(pos.entryAt),...s.admissionFlags[String(tradeNo)],
   decisionImpact:false,brokerOrdersEnabled:false},
   {maxBytes:4*1024*1024,maxSegments:10});
 }
 if((paper.completed||0)>s.lastPaperCompleted){
  const list=(paper.history||[]).filter(x=>
   x.tradeNo>s.lastPaperCompleted&&x.tradeNo<=paper.completed)
   .sort((a,b)=>a.tradeNo-b.tradeNo);
  for(const t of list){
   const flag=s.admissionFlags[String(t.tradeNo)];
   const v={tradeNo:t.tradeNo,entryAt:t.entryAt,exitAt:t.exitAt,
    direction:t.direction,campaignId:t.entryContext?.causalChain?.campaignId||null,
    flagged:flag?!!flag.flagged:null,
    entryClass:flag?.classification||'NOT_OBSERVED_WHILE_RUNNING',
    net:n(t.netPnlUsd),fees:n(t.feesUsd)};
   if(v.net!==null){s.matchedClosed.push(v);
    appendRotatingNdjson(EVENTS,{at:cur.at,type:'S1_BASELINE_CLOSURE',
     ...v,decisionImpact:false,brokerOrdersEnabled:false},
     {maxBytes:4*1024*1024,maxSegments:10});}
   delete s.admissionFlags[String(t.tradeNo)];
  }
  s.matchedClosed=s.matchedClosed.slice(-300);
  s.lastPaperCompleted=paper.completed;
 }
 s.lastAt=cur.at;s.observations++;s.latest=view;
 s.lastClassification=classified;
 s.lastRecommendation=view.proposedAdmission;
 return true;
}
function main(){
 const paper=json(PAPER,null);
 if(!paper||paper.brokerOrdersEnabled!==false)throw Error('S1_PAPER_SOURCE_INVALID');
 const test=process.argv.includes('--test-read');
 let s=test?initial(paper,Date.now()):json(STATE,null);
 if(!s)s=initial(paper,Date.now());
 if(s.version!==model.VERSION||s.brokerOrdersEnabled!==false||
    s.decisionImpact!==false)throw Error('S1_STATE_VERSION_OR_AUTHORITY_INVALID');
 if(test){
  const d=paper.latestAnalysis,cur=model.sample(d);
  console.log(JSON.stringify({mode:'READ_ONLY_TEST',historySamples:s.samples.length,
   sample:model.inspect(s.samples,cur,paper.position),
   brokerOrdersEnabled:false,decisionImpact:false},null,2));return;
 }
 console.log('[V543 S1 LBW15 SHADOW] '+JSON.stringify({
  version:model.VERSION,source:PAPER,observations:s.observations,
  asOf:s.lastAt,historySamples:s.samples.length,
  brokerOrdersEnabled:false,decisionImpact:false}));
 let busy=false,errors=0;
 function tick(){
  if(busy)return;busy=true;
  try{
   const p=json(PAPER,null);
   if(advance(s,p)){
    atomic(STATE,s);atomic(SUMMARY,report(s,Date.now()));
   }
   errors=0;
  }catch(e){
   if(++errors<=5||errors%30===0)
    console.error('[V543 S1 SHADOW ERROR] '+(e.stack||e));
  }finally{busy=false;}
 }
 tick();setInterval(tick,10000);
}
if(require.main===module)main();
module.exports={initial,advance,report,archiveSamples};
