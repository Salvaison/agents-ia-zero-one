'use strict';
// Controlled, ONE-TIME V551 -> V552 PAPER continuity at stopped predecessor.
// Run --dry-read before stopping V551; actual handoff requires V551 STOPPED.
// Existing position, entry fee, equity, MFE/MAE, history and used episodes
// remain intact. No funded broker/order functionality.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const cp=require('child_process'),P=require('../modules/v552/paper');
const RUNNER=require('../modules/v552/runner');
const DATA=path.resolve(__dirname,'../data');
const OLD=path.join(DATA,'v551-paper-state.json');
const NEW=RUNNER.FILES.state;
const BASE='/root/boonolab-archives';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const atomic=(p,o)=>{
 const tmp=p+'.handoff-tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(o));
 fs.renameSync(tmp,p);
};
function statuses(){
 const x=JSON.parse(cp.execFileSync('pm2',['jlist'],{encoding:'utf8'}));
 return Object.fromEntries(x.map(p=>[p.name,p.pm2_env.status]));
}
function preview(){
 const old=read(OLD),now=Date.now(),ps=statuses();
 const flag={oldProcessStopped:ps['boono-v551-paper']==='stopped',
  sourceHash:sha(OLD),frozenSourceHash:sha(OLD),handoffAt:now};
 const ledger=P.fromV551(old,now,{...flag,oldProcessStopped:true});
 return {old,ledger,ps,flag};
}
function main(){
 const x=preview(),{old,ledger,ps}=x;
 if(process.argv.includes('--dry-read')){
  console.log(JSON.stringify({mode:'DRY_READ_ONLY',
   V551:{version:old.version,completed:old.completed,equity:old.equityUsd,
    fees:old.feesUsd,open:old.position?.direction||'FLAT',
    entryAt:old.position?.entryAt||null,
    asOf:old.lastObservationAt},
   V552:{version:ledger.version,policyVersion:ledger.policyVersion,
    completed:ledger.completed,newPolicyClosed:ledger.newPolicyClosed,
    equity:ledger.equityUsd,fees:ledger.feesUsd,
    open:ledger.position?.direction||'FLAT',
    entryAt:ledger.position?.entryAt||null,
    baseline:ledger.pre552Completed},
   ps},null,2));return;
 }
 if(ps['boono-v551-paper']!=='stopped'||
    ps['boono-v552-paper']==='online')
  throw Error('V552_HANDOFF_REQUIRES_OLD_STOPPED_NEW_OFFLINE');
 if(fs.existsSync(NEW))throw Error('V552_ALREADY_HAS_LEDGER_REFUSE_OVERWRITE');
 if(sha(OLD)!==x.flag.sourceHash)
  throw Error('V551_CHANGED_DURING_HANDOFF');
 const now=Date.now(),flag={...x.flag,handoffAt:now};
 const s=P.fromV551(old,now,flag);
 fs.mkdirSync(BASE,{recursive:true});
 const folder=path.join(BASE,'V551_RETIRED_TO_V552_'+new Date(now).toISOString().replace(/[:.]/g,'-'));
 fs.mkdirSync(folder);
 const files=fs.readdirSync(DATA).filter(f=>
  f==='v551-paper-state.json'||f==='v551-paper-summary.json'||
  /^v551-paper-.*\.ndjson$/.test(f));
 const hashes={};
 for(const file of files){
  const source=path.join(DATA,file),dest=path.join(folder,file);
  fs.copyFileSync(source,dest);
  if(sha(source)!==sha(dest))throw Error('V551_BACKUP_SHA_MISMATCH '+file);
  hashes[file]=sha(dest);
 }
 const manifest={version:'v551-v552-paper-handoff-v1',
  at:now,oldStatus:'STOPPED',newBeforeStatus:ps['boono-v552-paper']||'ABSENT',
  oldAsOf:old.lastObservationAt,oldPositionAtRetirement:old.position,
  completed:old.completed,realizedUsd:old.realizedUsd,
  equityUsd:old.equityUsd,feesUsd:old.feesUsd,
  newVersion:s.version,newPolicyVersion:s.policyVersion,
  tradeCountPreserved:s.history.length,
  carriedPosition:!!s.position,carriedMfeUsd:s.position?.mfePriceUsd||null,
  filesSha256:hashes,
  noBrokerOrders:true,
  oldLedgerRemainsUntouched:true};
 fs.writeFileSync(path.join(folder,'MANIFEST.json'),JSON.stringify(manifest,null,2));
 if(sha(OLD)!==x.flag.sourceHash)
  throw Error('V551_SOURCE_CHANGED_AFTER_BACKUP');
 atomic(NEW,s);
 atomic(RUNNER.FILES.summary,RUNNER.summary(s));
 console.log(JSON.stringify({status:'V552_MIGRATED_READY_NOT_YET_RUNNING',
  archive:folder,sha256:x.flag.sourceHash,
  completed:s.completed,policyStartedAt:s.policyStartedAt,
  carry:s.position?.direction||'FLAT',
  equity:s.equityUsd,fees:s.feesUsd,
  brokerOrdersEnabled:false},null,2));
}
if(require.main===module)main();
module.exports={statuses,preview};
