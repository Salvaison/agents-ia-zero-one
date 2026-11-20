'use strict';
// Explicit, one-shot V552 -> V553 PAPER handoff. Source must be frozen,
// old PM2 stopped; no simultaneous engines, no broker order, no new capital.
const fs=require('node:fs'),path=require('node:path'),
 crypto=require('node:crypto'),cp=require('node:child_process');
const P=require('../modules/v553/paper'),R=require('../modules/v553/runner');
const ROOT=path.resolve(__dirname,'..'),DATA=path.join(ROOT,'data');
const BASE='/root/boonolab-archives';
const OLD=path.join(DATA,'v552-paper-state.json');
const NEW=R.FILES.state;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function status(){
 const a=JSON.parse(cp.execFileSync('pm2',['jlist'],{encoding:'utf8'}));
 return Object.fromEntries(a.map(x=>[x.name,x.pm2_env.status]));
}
function atomic(file,obj){
 const tmp=file+'.handoff-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(obj));fs.renameSync(tmp,file);
}
function parity(old,s){
 const fields=['startedAt','lastObservationAt','completed','wins',
  'losses','realizedUsd','feesUsd','equityUsd'];
 for(const k of fields)if(old[k]!==s[k])
  throw Error('V553_HANDOFF_PARITY_FAIL_'+k);
 if(!s.position!==!old.position)throw Error('V553_POSITION_LOST');
 if(old.position){
  for(const k of ['direction','entryAt','entryPrice','lastPrice',
   'entryFeeUsd','mfePriceUsd','maePriceUsd','lastNetPnlUsd',
   'episodeId','campaignId'])
   if(JSON.stringify(s.position[k])!==JSON.stringify(old.position[k]))
    throw Error('V553_POSITION_CHANGED_'+k);
 }
 if(s.history.length!==old.history.length)throw Error('V553_HIST_COUNT_CHANGED');
 for(let i=0;i<old.history.length;i++){
  const a=old.history[i],b=s.history[i];
  for(const key of ['tradeNo','direction','entryAt','exitAt',
   'entryPrice','exitPrice','feesUsd','netPnlUsd','exitReason',
   'entryPolicyVersion','exitPolicyVersion'])
   if(JSON.stringify(a[key])!==JSON.stringify(b[key]))
    throw Error('V553_OLD_TRADE_MUTATED_'+i+'_'+key);
 }
 if(s.newPolicyClosed!==0||s.newPolicyNetUsd!==0)
  throw Error('V553_NEW_ACCOUNT_MUST_START_ZERO_POLICY_COUNTERS');
}
function main(){
 const buf=fs.readFileSync(OLD),old=JSON.parse(buf),
  oldHash=sha(buf),pm=status(),at=Date.now();
 if(fs.existsSync(NEW)||pm['boono-v553-paper']==='online')
  throw Error('V553_HANDOFF_REFUSE_EXISTING_NEW_LEDGER_OR_PROCESS');
 if(old.policyVersion!=='v5.5.2-lbw15-live-vigilance-campaign-paper-v1.2')
  throw Error('V553_UNEXPECTED_V552_POLICY');
 const testManifest={sourceHash:oldHash,frozenSourceHash:oldHash,
  oldProcessStopped:true,handoffAt:at};
 const s=P.fromV552(old,testManifest);
 parity(old,s);
 if(process.argv.includes('--dry-read')){
  console.log(JSON.stringify({mode:'READ_ONLY_PREFLIGHT',
   oldProcess:pm['boono-v552-paper'],newProcess:pm['boono-v553-paper']||'absent',
   completed:old.completed,equityUsd:old.equityUsd,
   feesUsd:old.feesUsd,open:old.position?.direction||'FLAT',
   positionEntryAt:old.position?.entryAt||null,
   sourceHash:oldHash,newLedger:P.VERSION,
   newPolicy:P.POLICY,noWrites:true,brokerOrdersEnabled:false},null,2));
  return;
 }
 if(pm['boono-v552-paper']!=='stopped'||
    pm['boono-v551-paper']!=='stopped'||
    pm['boono-v55-paper']!=='stopped')
  throw Error('V553_REFUSE_SOURCE_ENGINE_ONLINE');
 if(sha(fs.readFileSync(OLD))!==oldHash)
  throw Error('V553_SOURCE_MOVED_DURING_STOP');
 const folder=path.join(BASE,'V552_RETIRED_TO_V553_'+
  new Date(at).toISOString().replace(/[:.]/g,'-'));
 fs.mkdirSync(folder,{recursive:true});
 const names=fs.readdirSync(DATA).filter(x=>
  /^v552-paper-(state\.json|summary\.json|trades\.ndjson|decisions\.ndjson)$/.test(x));
 const hashes={};
 for(const n of names){
  const source=path.join(DATA,n),dest=path.join(folder,n);
  fs.copyFileSync(source,dest);
  hashes[n]=sha(fs.readFileSync(dest));
  if(hashes[n]!==sha(fs.readFileSync(source)))
   throw Error('V553_ARCHIVE_HASH_MISMATCH_'+n);
 }
 if(hashes['v552-paper-state.json']!==oldHash)
  throw Error('V553_FROZEN_STATE_HASH_CHANGED');
 const manifest={type:'V552_RETIRE_AND_CONTINUOUS_V553_PAPER_HANDOFF',
  at,sourceHash:oldHash,frozenSourceHash:oldHash,
  oldProcessStopped:true,brokerOrdersEnabled:false,
  oldPolicy:old.policyVersion,newPolicy:P.POLICY,
  oldCompleted:old.completed,oldEquityUsd:old.equityUsd,
  oldFeesUsd:old.feesUsd,
  openPositionCarried:!!old.position,
  carriedPositionEntryAt:old.position?.entryAt||null,
  hashes};
 fs.writeFileSync(path.join(folder,'MANIFEST.json'),
  JSON.stringify(manifest,null,2));
 if(sha(fs.readFileSync(OLD))!==oldHash)
  throw Error('V553_SOURCE_CHANGED_AFTER_ARCHIVE');
 atomic(NEW,s);atomic(R.FILES.summary,R.summary(s));
 console.log(JSON.stringify({mode:'V553_HANDOFF_CREATED_SOURCE_STOPPED',
  archive:folder,sourceHash:oldHash,
  oldCompleted:old.completed,newCompleted:s.completed,
  equityUsd:s.equityUsd,feesUsd:s.feesUsd,
  position:s.position?.direction||'FLAT',
  entryAt:s.position?.entryAt||null,
  newPolicy:P.POLICY,brokerOrdersEnabled:false},null,2));
}
if(require.main===module)main();
module.exports={parity,sha};
