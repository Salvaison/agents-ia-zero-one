'use strict';
// One-time policy revision of the SAME V552 PAPER ledger, not a new engine.
// The active position and every trade, fee, key and equity amount are preserved.
// PRECONDITION: V552 PM2 stopped. Does not read broker credentials or orders.
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),DATA=path.join(ROOT,'data');
const FILE=path.join(DATA,'v552-paper-state.json');
const SUMMARY=path.join(DATA,'v552-paper-summary.json');
const BASE='/root/boonolab-archives';
const OLD='v5.5.2-lbw15-live-vigilance-campaign-paper-v1.1';
const NEW=require('../modules/v552/decision').VERSION;
const P=require('../modules/v552/paper'),runner=require('../modules/v552/runner');
function sha(buf){return crypto.createHash('sha256').update(buf).digest('hex')}
function services(){
 const x=JSON.parse(cp.execFileSync('pm2',['jlist'],{encoding:'utf8'}));
 return Object.fromEntries(x.map(a=>[a.name,a.pm2_env.status]));
}
function build(s,now,sourceHash){
 if(s?.version!=='v5.5.2-paper-ledger-v1'||s?.engine!=='V552'||
   s?.mode!=='PAPER_ONLY'||s?.brokerOrdersEnabled!==false||
   s?.policyVersion!==OLD||!Array.isArray(s.history)||
   !Array.isArray(s.usedEpisodes)||s?.memory?.version!=='v552-campaign-memory-v1'||
   !s.migratedFrom||s.migratedFrom.engine!=='V551'||
   s.policyRevision?.to!==OLD)
  throw Error('V552_POLICY_V12_UNTRUSTED_OLD_STATE');
 if(NEW!=='v5.5.2-lbw15-live-vigilance-campaign-paper-v1.2')
  throw Error('V552_EXPECTED_NEW_VERSION_MISSING');
 const prev=JSON.parse(JSON.stringify(s));
 const n={...prev,policyVersion:NEW,
  policyHistory:[...(Array.isArray(prev.policyHistory)?prev.policyHistory:[]),
    ...(prev.policyRevision?[prev.policyRevision]:[])],
  policyRevision:{from:OLD,to:NEW,at:now,
   oldAsOf:s.lastObservationAt,oldCompleted:s.completed,
   oldEquityUsd:s.equityUsd,oldFeesUsd:s.feesUsd,
   oldPositionEntryAt:s.position?.entryAt||null,
   oldPositionEntryPolicy:s.position?.entryPolicyVersion||null,
   oldLedgerSha256:sourceHash,
   previousPolicyRevision:s.policyRevision||null,
   reason:'REMOVE_MF_VETO_AND_AUTHORITY_MCB_PRICE_PM_CAUSAL',
   brokerOrdersEnabled:false,
   authority:'V552_PAPER_ONLY',
   priorPolicyClosedTradesPreserved:true}};
 // Preserve identity of ALL previous positions and outcomes, including open.
 for(const field of ['startedAt','lastObservationAt','completed','wins',
  'losses','realizedUsd','feesUsd','equityUsd','history','usedEpisodes',
  'position','lastExit','lastAction','memory','migratedFrom',
  'pre552Completed','newPolicyClosed','newPolicyNetUsd']){
  if(JSON.stringify(n[field])!==JSON.stringify(s[field]))
   throw Error('V552_REVISION_CHANGED_'+field);
 }
 P.verify(n);
 return n;
}
function atom(file,object){
 const tmp=file+'.revision-tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(object));
 fs.renameSync(tmp,file);
}
function main(){
 const buf=fs.readFileSync(FILE),old=JSON.parse(buf.toString('utf8'));
 const now=Date.now(),hash=sha(buf),s=build(old,now,hash);
 const pm=services();
 if(process.argv.includes('--dry-read')){
  console.log(JSON.stringify({mode:'READ_ONLY_PREFLIGHT',
   currentPolicy:old.policyVersion,targetPolicy:s.policyVersion,
   completed:old.completed,equity:old.equityUsd,fees:old.feesUsd,
   position:old.position?.direction||'FLAT',
   positionEntryAt:old.position?.entryAt||null,
   brokerOrdersEnabled:false,pm},null,2));return;
 }
 if(pm['boono-v552-paper']!=='stopped'||pm['boono-v551-paper']!=='stopped')
  throw Error('V552_V1_2_REVISION_REFUSES_PARALLEL_OR_RUNNING_ENGINE');
 if(sha(fs.readFileSync(FILE))!==hash)
  throw Error('V552_V1_2_LEDGER_CHANGED_DURING_SNAPSHOT');
 const folder=path.join(BASE,'V552_V1_1_TO_V1_2_'+new Date(now).toISOString().replace(/[:.]/g,'-'));
 fs.mkdirSync(folder,{recursive:true});
 const names=fs.readdirSync(DATA).filter(k=> k==='v552-paper-state.json'||
   k==='v552-paper-summary.json'||/^v552-paper-.*\.ndjson$/.test(k));
 const files={};
 for(const name of names){
  const from=path.join(DATA,name),to=path.join(folder,name);
  fs.copyFileSync(from,to);files[name]=sha(fs.readFileSync(to));
  if(sha(fs.readFileSync(from))!==files[name])throw Error('V552_BACKUP_SHA_FAIL');
 }
 const manifest={type:'V552_V1_2_NO_MF_VETO_IN_PLACE_NOT_NEW_ENGINE',at:now,
  from:OLD,to:NEW,filesSha256:files,
  oldCompleted:old.completed,oldEquityUsd:old.equityUsd,
  openPositionCarried:!!old.position,oldEntryAt:old.position?.entryAt||null,
  stopped:true,brokerOrdersEnabled:false};
 fs.writeFileSync(path.join(folder,'MANIFEST.json'),JSON.stringify(manifest,null,2));
 if(sha(fs.readFileSync(FILE))!==hash)throw Error('V552_LEDGER_MOVED_DURING_ARCHIVE');
 atom(FILE,s);atom(SUMMARY,runner.summary(s));
 console.log(JSON.stringify({mode:'REVISED_PAPER_STOPPED',backup:folder,
  oldSha256:hash,newPolicy:NEW,equity:s.equityUsd,
  closed:s.completed,open:s.position?.direction||'FLAT',
  positionEntryAt:s.position?.entryAt||null,brokerOrdersEnabled:false},null,2));
}
if(require.main===module)main();
module.exports={build,sha};
