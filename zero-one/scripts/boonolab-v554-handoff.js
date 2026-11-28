'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const P=require('../modules/v554/paper'),R=require('../modules/v554/paper-runner');
const DATA=path.resolve(__dirname,'../data'),OLD=path.join(DATA,'v553-paper-state.json'),SHADOW=path.join(DATA,'v554-shadow-state.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function parity(old,s){
 for(const k of ['startedAt','lastObservationAt','completed','wins','losses','realizedUsd','feesUsd','equityUsd','capitalUsd','notionalUsd'])
  if(old[k]!==s[k])throw Error('PARITY_'+k);
 if(!!old.position!==!!s.position)throw Error('POSITION_LOST');
 if(old.position)for(const k of Object.keys(old.position))if(JSON.stringify(old.position[k])!==JSON.stringify(s.position[k])&&!['initiativeId','inheritedFrom','originalTradeNo'].includes(k))throw Error('POSITION_CHANGED_'+k);
 if(s.history.length!==old.history.length)throw Error('HISTORY_COUNT');
 for(let i=0;i<old.history.length;i++)for(const k of Object.keys(old.history[i]))if(!['historicalPolicy'].includes(k)&&JSON.stringify(old.history[i][k])!==JSON.stringify(s.history[i][k]))throw Error('TRADE_MUTATED_'+i+'_'+k);
 if(s.newPolicyClosed!==0||s.newPolicyNetUsd!==0)throw Error('NEW_POLICY_COUNTERS');
}
function status(){return Object.fromEntries(JSON.parse(cp.execFileSync('pm2',['jlist'],{encoding:'utf8'})).map(x=>[x.name,x.pm2_env.status]));}
function main(){
 const pm=status(),dry=process.argv.includes('--dry-read'),at=Date.now();
 if(fs.existsSync(R.FILES.state)||fs.existsSync(R.FILES.summary)||pm['boono-v554-paper']==='online')throw Error('V554_ALREADY_EXISTS');
 if(!dry&&pm['boono-v553-paper']!=='stopped')throw Error('OLD_PAPER_NOT_STOPPED');
 const buf=fs.readFileSync(OLD),old=JSON.parse(buf),hash=sha(buf),sh=JSON.parse(fs.readFileSync(SHADOW,'utf8'));
 if(sh.mode!=='SHADOW_ONLY'||sh.brokerOrdersEnabled!==false||sh.decisionImpact!==false||sh.market?.latest?.asOf>at)throw Error('BAD_SHADOW_SEED');
 const folder=path.join('/root/boonolab-archives','V553_RETIRED_TO_V554_'+new Date(at).toISOString().replace(/[:.]/g,'-'));
 const m={oldProcessStopped:true,sourceHash:hash,frozenSourceHash:hash,handoffAt:at,archive:folder};
 const s=P.fromV553(old,sh.market,m);parity(old,s);
 if(dry){console.log(JSON.stringify({mode:'READ_ONLY_PREFLIGHT',completed:old.completed,equityUsd:old.equityUsd,position:old.position?.direction||'FLAT',entryPrice:old.position?.entryPrice??null,sourceHash:hash,sourceStatus:pm['boono-v553-paper'],marketSourceAt:sh.market.latest.sourceAt,brokerOrdersEnabled:false}));return;}
 fs.mkdirSync(folder,{recursive:false});
 const files=fs.readdirSync(DATA).filter(n=>/^v553-paper-(state\.json|summary\.json|(?:trades|decisions)(?:\.segment-[^.]+)?\.ndjson)$/.test(n));
 const hashes={};
 for(const n of files){
  const f=path.join(DATA,n),dest=path.join(folder,n);
  fs.copyFileSync(f,dest,fs.constants.COPYFILE_EXCL);hashes[n]=sha(fs.readFileSync(dest));
  if(hashes[n]!==sha(fs.readFileSync(f)))throw Error('ARCHIVE_HASH_'+n);
 }
 if(hashes['v553-paper-state.json']!==hash||sha(fs.readFileSync(OLD))!==hash)throw Error('SOURCE_MOVED_AFTER_STOP');
 fs.writeFileSync(path.join(folder,'MANIFEST.json'),JSON.stringify({...m,mode:'FROZEN_ARTIFACT',brokerOrdersEnabled:false,completed:old.completed,equityUsd:old.equityUsd,position:old.position?.direction||'FLAT',hashes},null,2));
 R.save(s);
 console.log(JSON.stringify({mode:'HANDOFF_CREATED',archive:folder,hash,files:files.length,completed:s.completed,equityUsd:s.equityUsd,feesUsd:s.feesUsd,newPolicyClosed:0,position:s.position?.direction||'FLAT',entryAt:s.position?.entryAt??null,entryPrice:s.position?.entryPrice??null,brokerOrdersEnabled:false},null,2));
}
if(require.main===module)main();
module.exports={parity,sha};
