'use strict';
// Historical diagnostics are generated before reading any trade ledger.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const R=require('../modules/attention/boonolab-trajectory-shadow-runner'),M=require('../modules/attention/boonolab-trajectory-memory');
const DATA=path.resolve(__dirname,'../data'),DIR=path.join(DATA,'audit-14d');
const FROM=Date.parse('2026-11-20T16:00:00+01:00'),TO=Date.parse('2026-11-24T16:37:00+01:00'),q=[];
for(const name of fs.readdirSync(DIR).filter(n=>/^audit-2026112[01234]T.*\.ndjson(\.gz)?$/.test(n)).sort()){
 const b=fs.readFileSync(path.join(DIR,name)),t=name.endsWith('.gz')?zlib.gunzipSync(b).toString():b.toString();
 for(const l of t.split('\n'))try{const x=JSON.parse(l);if(x.ts>=FROM&&x.ts<=TO)q.push(x);}catch{}
}
const rows=R.sortedAudit(q,TO),bars=R.loadBars(),state=M.initial(FROM),snapshots=[],events=[];
if(rows.length<100)throw Error('INSUFFICIENT_REPLAY');
for(const row of rows){
 const x=R.step(state,row,bars,row.ts,'HISTORICAL_REPLAY_CLOSE_PROXY');
 if(!x.accepted)continue;
 const i=x.interpretation;
 const hypotheses=Object.fromEntries(Object.entries(i.hypotheses).map(([d,h])=>[d,{
  initiative:h.initiative?{id:h.initiative.id,originAt:h.initiative.origin.sourceAt,originKind:h.initiative.originKind,progress:h.initiative.progress,crosses:h.initiative.crosses.map(x=>x.sourceAt)}:null,originAt:h.origin.sourceAt,attemptId:h.attemptId,originKind:h.originKind,evolution:h.evolution,parentAtBirth:h.parentAtBirth?.direction??null,
  role:h.role,priceState:h.priceState,progress:h.fromInflexion,ownCross:h.lastCrossInAttempt?.sourceAt??null,
  persistentCross:h.persistentCrossAnchor?.event.sourceAt??null,crossProgress:h.persistentCrossAnchor?.progress??null,
  nearestPairedExtreme:h.nearestPairedExtreme?{price:h.nearestPairedExtreme.ref.price,referenceAt:h.nearestPairedExtreme.ref.sourceAt,
   distance:h.nearestPairedExtreme.priceDifference,lbwDifference:h.nearestPairedExtreme.lbwDifference,bwDifference:h.nearestPairedExtreme.bwDifference}:null,
  support:h.support,narrative:h.narrative,coverageInterrupted:h.coverageInterrupted}]));
 // Deep copy: cross progress is mutable in the live memory.
 snapshots.push(JSON.parse(JSON.stringify({asOf:i.asOf,sourceAt:i.sourceAt,price:i.geometry.price,L:i.geometry.L,B:i.geometry.B,G:i.geometry.G,
  parent:i.parentE15?.direction??null,liveCross:i.liveCross?.sourceAt??null,liveSide:i.geometry.gapSide,hypotheses})));
 for(const e of x.events)events.push(e);
}
const truth=Object.freeze(snapshots),cases=[];
function at(t){let lo=0,hi=truth.length;while(lo<hi){const m=(lo+hi)>>1;if(truth[m].asOf<=t)lo=m+1;else hi=m;}return truth[lo-1]||null;}
for(const [file,engine,select] of [
 ['v553-paper-state.json','V553',n=>n>=90&&n<=113||[43,58,61].includes(n)],
 ['v52-paper-state.json','V543',n=>n>=320&&n<=329]]){
 const paper=JSON.parse(fs.readFileSync(path.join(DATA,file),'utf8'));
 if(paper.brokerOrdersEnabled!==false)throw Error('NOT_PAPER');
 for(const t of paper.history.filter(t=>select(t.tradeNo))){
  const e=at(t.entryAt),exit=at(t.exitAt),dir=t.direction==='long'?'UP':'DN',covered=e&&t.entryAt-e.asOf<=95000;
  cases.push({engine,tradeNo:t.tradeNo,direction:dir,entryAt:t.entryAt,exitAt:t.exitAt,covered:!!covered,
   entry:covered?e:null,exit:exit&&t.exitAt-exit.asOf<=95000?exit:null,actualNetUsd:t.netPnlUsd,actualMfePriceUsd:t.mfePriceUsd,
   timeline:covered?truth.filter(z=>z.asOf>=t.entryAt&&z.asOf<=t.exitAt).filter((z,j)=>j%6===0):[]});
 }
}
const report={version:R.VERSION,mode:'HISTORICAL_REPLAY_CLOSE_PROXY_ONLY',from:rows[0].ts,to:rows.at(-1).ts,
 observations:truth.length,events:events.length,byEvent:events.reduce((a,e)=>(a[e.type]=(a[e.type]||0)+1,a),{}),
 cases,decisionImpact:false,brokerOrdersEnabled:false,
 caveats:['Finalized historical CSV at close proxy, not exact first-observed live availability',
 'No trade inputs in state transitions; outcomes joined afterwards','No alternative fills or profitability claim']};
if(process.argv.includes('--publish')){
 const f=path.join(DATA,'boonolab-trajectory-shadow-replay-20261124.json');
 if(fs.existsSync(f))throw Error('REPLAY_REPORT_EXISTS');
 fs.writeFileSync(f+'.tmp',JSON.stringify(report));fs.renameSync(f+'.tmp',f);
}
console.log(JSON.stringify({observations:report.observations,events:report.byEvent,covered:cases.filter(x=>x.covered).length,total:cases.length,
 examples:cases.filter(x=>[43,58,61,90,92,93,94,99,101,102,109,110,113,320,321,322,324,325,326,327,329].includes(x.tradeNo))
 .map(x=>{const h=x.entry?.hypotheses[x.direction];return {engine:x.engine,n:x.tradeNo,covered:x.covered,net:x.actualNetUsd,
  initiative:h?.initiative,age:h?.progress.ageMin,evolution:h?.evolution,priceFromOrigin:h?.progress.price,priceSinceCross:h?.crossProgress?.price,crossAge:h?.crossProgress?.ageMin,
  priorTerritory:h?.nearestPairedExtreme,role:h?.role,priceState:h?.priceState};})},null,2));