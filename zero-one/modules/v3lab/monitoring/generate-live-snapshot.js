'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {listSegments}=require('../storage/rotating-ndjson');

const ROOT=path.join(__dirname,'../../..');
const DATA=path.join(ROOT,'data');
const OUT=path.join(DATA,'BOONO-live-snapshot.json');
const PREV=path.join(DATA,'BOONO-live-snapshot.previous.json');
const EVAL=path.join(DATA,'trade-sim-v3lab-evaluations.ndjson');
const DEC=path.join(DATA,'trade-sim-v3lab-decisions.ndjson');
const SHADOW=path.join(DATA,'trade-sim-v3lab-shadow.ndjson');
const STATE=path.join(DATA,'trade-sim-v3lab-state.json');
const GAPS=path.join(DATA,'v3lab-causal-gaps.json');
const FORECAST=path.join(DATA,'mw-hourly-forecast-ledger.ndjson');
const WINDOW_MS=120*60*1000;
const HARD_LIMIT=5*1024*1024;

function readJson(p,fallback){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(_){return fallback;}}
function iso(v){const t=typeof v==='number'?v:Date.parse(v||'');return Number.isFinite(t)?new Date(t).toISOString():null;}
function tsOf(x){const t=Date.parse(x&&x.ts||x&&x.timestamp||'');return Number.isFinite(t)?t:null;}
function fileCandidates(active,since){
  const files=listSegments(active).filter(p=>{try{return fs.statSync(p).mtimeMs>=since-2*60*60*1000;}catch(_){return false;}});
  if(fs.existsSync(active))files.push(active);
  return files;
}
function scanWindow(active,since,until,expectedCadenceMs){
  const records=[];let invalidLines=0,totalLines=0;
  for(const p of fileCandidates(active,since)){
    const text=fs.readFileSync(p,'utf8');
    for(const line of text.split(/\r?\n/)){
      if(!line)continue; totalLines++;
      let x;try{x=JSON.parse(line);}catch(_){invalidLines++;continue;}
      const t=tsOf(x);if(t===null||t<since||t>until)continue;records.push(x);
    }
  }
  records.sort((a,b)=>tsOf(a)-tsOf(b));
  let duplicates=0,regressions=0,maxGapMs=null,gapsOverExpected=0;
  const seen=new Set();let prev=null;
  for(const x of records){
    const t=tsOf(x);const key=x.ts||x.timestamp;
    if(seen.has(key))duplicates++; else seen.add(key);
    if(prev!==null){const g=t-prev;if(g<0)regressions++;else{maxGapMs=maxGapMs===null?g:Math.max(maxGapMs,g);if(expectedCadenceMs&&g>expectedCadenceMs*3)gapsOverExpected++;}}
    prev=t;
  }
  return {records,quality:{selectedFiles:fileCandidates(active,since).map(p=>path.basename(p)),totalLinesScanned:totalLines,validInWindow:records.length,invalidLines,firstTimestamp:records.length?records[0].ts:null,lastTimestamp:records.length?records[records.length-1].ts:null,duplicates,regressions,maxGapMs,gapsOverExpected,expectedCadenceMs:expectedCadenceMs||null,continuous:records.length>0&&invalidLines===0&&duplicates===0&&regressions===0&&(expectedCadenceMs?gapsOverExpected===0:true)}};
}
function compactStructural(s){if(!s)return null;return {available:s.available===true,status:s.status||null,direction:s.direction||null,start:s.start||null,end:s.end||null,deltaUsd:s.deltaUsd??null,magnitudeUsd:s.magnitudeUsd??null,retracementRatio:s.retracementRatio??null,fullyRetraced:!!s.fullyRetraced,priceRetracementStatus:s.priceRetracementStatus||null};}
function compactEval(x){
  const w=x.wave||{},r=x.risk||{},q=r.eligibility||{},d=x.dominance||{},seq=x.sequence||{},sh=x.shadow||{};
  return {ts:x.ts,marketTimestamp:x.marketTimestamp,price:x.price,position:x.position||null,where:x.where?{status:x.where.status,relevant:!!x.where.relevant,confidence:x.where.confidence,ma200:x.where.ma200||null,sr:x.where.sr||null,lgi:x.where.lgi?{activeCount:x.where.lgi.activeCount,confluence:x.where.lgi.confluence,nearest:x.where.lgi.nearest||null}:null}:null,wave:{phase:w.phase,direction:w.direction,turningPoint:w.turningPoint||null,origin:w.origin||null,previousOrigin:w.previousOrigin||null,structural:compactStructural(w.structural),price:w.price||null,current:w.current||null,nested3m:w.nested3m?{phase:w.nested3m.phase,direction:w.nested3m.direction,turningPoint:w.nested3m.turningPoint||null,slopeLbw:w.nested3m.slopeLbw??null,origin:w.nested3m.origin||null,current:w.nested3m.current||null}:null},regime:x.regime?{state:x.regime.state,current:x.regime.current||null}:null,sequence:{current:seq.current||null,agesMs:seq.agesMs||null,locationByDirection:seq.locationByDirection||null},dominance:{state:d.state,direction:d.direction,proofScore:d.proofScore,retainedFraction:d.retainedFraction,persistCount:d.persistCount,conserved:d.conserved,current:d.current||null},risk:{direction:r.direction,entryMode:r.entryMode,entryAllowed:!!r.entryAllowed,reason:r.reason,locationReady:r.locationReady,locationSource:r.locationSource,protection:r.protection||null,rr:q.rr||null,reassertion:q.reassertion||null,phaseMaturity:q.phaseMaturity||null},action:x.action||null,shadow:{ma200:sh.ma200?{synthesis:sh.ma200.synthesis||null}:null,divergence:sh.divergence?{counts:sh.divergence.counts||null}:null,lineage:sh.lineage?{transitionEvidence:sh.lineage.transitionEvidence||null,movementCandidate:sh.lineage.movementCandidate||null}:null}};
}
function compactDecision(x){return {ts:x.ts,module:x.module,action:x.action,reason:x.reason,fingerprint:x.fingerprint,context:x.context?{price:x.context.price,marketTimestamp:x.context.marketTimestamp,wave:x.context.wave?{phase:x.context.wave.phase,direction:x.context.wave.direction,structural:compactStructural(x.context.wave.structural)}:null,risk:x.context.risk?{direction:x.context.risk.direction,entryMode:x.context.risk.entryMode,entryAllowed:x.context.risk.entryAllowed,reason:x.context.risk.reason}:null,action:x.context.action||null}:null};}
function compactShadow(x){const s=x.shadow||{};return {ts:x.ts,marketTimestamp:x.marketTimestamp,price:x.price,action:x.action,ma200:s.ma200?{synthesis:s.ma200.synthesis||null}:null,divergence:s.divergence?{counts:s.divergence.counts||null}:null,waveFib:s.waveFib?{status:s.waveFib.status,direction:s.waveFib.direction,anchors:s.waveFib.anchors||null,targets:s.waveFib.targets||null}:null,lineage:s.lineage?{transitionEvidence:s.lineage.transitionEvidence||null,movementCandidate:s.lineage.movementCandidate||null}:null};}
function readForecast(){
  let rows=[];try{rows=fs.readFileSync(FORECAST,'utf8').split(/\r?\n/).filter(Boolean).map(l=>{try{return JSON.parse(l);}catch(_){return null;}}).filter(Boolean);}catch(_){return null;}
  const forecasts=rows.filter(x=>String(x.kind||'').toLowerCase()==='forecast').sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
  const latest=forecasts.at(-1)||null;if(!latest)return null;
  const assessments=rows.filter(x=>String(x.kind||'').toLowerCase()==='assessment'&&x.forecastId===latest.id).sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
  return {forecast:latest,assessment:assessments.at(-1)||null};
}
function canonicalHash(obj){const copy=JSON.parse(JSON.stringify(obj));if(copy.integrity)delete copy.integrity.payloadSha256;return crypto.createHash('sha256').update(JSON.stringify(copy)).digest('hex');}
function atomicPublish(obj){
  obj.integrity=obj.integrity||{};obj.integrity.payloadSha256=canonicalHash(obj);
  const body=JSON.stringify(obj);const bytes=Buffer.byteLength(body);if(bytes>HARD_LIMIT)throw new Error('snapshot exceeds hard limit: '+bytes);
  const tmp=OUT+'.tmp-'+process.pid;const fd=fs.openSync(tmp,'w');try{fs.writeSync(fd,body);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  const parsed=JSON.parse(fs.readFileSync(tmp,'utf8'));if(canonicalHash(parsed)!==parsed.integrity.payloadSha256)throw new Error('snapshot checksum validation failed');
  if(fs.existsSync(OUT)){const ptmp=PREV+'.tmp-'+process.pid;fs.copyFileSync(OUT,ptmp);fs.renameSync(ptmp,PREV);}
  fs.renameSync(tmp,OUT);
  const final=JSON.parse(fs.readFileSync(OUT,'utf8'));if(canonicalHash(final)!==final.integrity.payloadSha256)throw new Error('published snapshot checksum validation failed');
  return {bytes,sha256:final.integrity.payloadSha256};
}
function main(){
  const now=Date.now(),since=now-WINDOW_MS;
  const ev=scanWindow(EVAL,since,now,30000),dec=scanWindow(DEC,since,now,null),sh=scanWindow(SHADOW,since,now,30000);
  if(!ev.records.length)throw new Error('no V3 evaluations in snapshot window');
  const latest=ev.records.at(-1),state=readJson(STATE,null),gaps=readJson(GAPS,{gaps:[]}),activeForecast=readForecast();
  const snapshot={schemaVersion:'boono-live-snapshot-v2.0',generatedAt:new Date(now).toISOString(),window:{start:new Date(since).toISOString(),end:new Date(now).toISOString(),requestedMinutes:120,actualMinutes:Math.round((now-tsOf(ev.records[0]))/60000*10)/10},policy:{readOnlyExtraction:true,rotatingNdjsonOnly:true,rawTicksIncluded:false,oldGiantArchivesRead:false,atomicReplace:true,hardLimitBytes:HARD_LIMIT,maxFiles:2,structuralContract:'last confirmed E15->E15 leg remains ACTIVE until a new opposite confirmed leg; fullyRetraced is descriptive only',ma200Contract:'priceVsMa200Stack is positional only, never directional permission',noBackfill:true},freshness:{latestEvaluationRecordedAt:latest.ts,latestEvaluationAgeMs:now-tsOf(latest),latestMarketTimestamp:iso(latest.marketTimestamp),latestMarketAgeMs:Number.isFinite(Number(latest.marketTimestamp))?Math.max(0,now-Number(latest.marketTimestamp)):null,latestDecisionAt:dec.records.at(-1)?.ts||null,latestShadowAt:sh.records.at(-1)?.ts||null},quality:{evaluations:ev.quality,decisions:dec.quality,shadows:sh.quality},causalGaps:gaps.gaps||[],current:{market:{price:latest.price,marketTimestamp:latest.marketTimestamp},v3Position:state&&state.modules||null,context:compactEval(latest),priceVsMa200Stack:latest.shadow&&latest.shadow.ma200&&latest.shadow.ma200.synthesis&&latest.shadow.ma200.synthesis.priceVsMa200Stack||null},windowData:{evaluations:ev.records.map(compactEval),decisions:dec.records.map(compactDecision),shadows:sh.records.map(compactShadow)},forecast:activeForecast,security:{containsCredentials:false,containsEnvironment:false,containsRawOkxTicks:false,sourceFiles:[path.basename(EVAL),path.basename(DEC),path.basename(SHADOW),path.basename(STATE),path.basename(GAPS),path.basename(FORECAST)]},integrity:{algorithm:'sha256',jsonValidated:true,payloadSha256:null}};
  const pub=atomicPublish(snapshot);console.log(JSON.stringify({output:OUT,previous:fs.existsSync(PREV)?PREV:null,bytes:pub.bytes,sha256:pub.sha256,window:snapshot.window,quality:snapshot.quality,latest:snapshot.freshness},null,2));
}
main();
