'use strict';
// Deterministic retrospective AS-OF diagnostic, no PAPER fills or historical P&L
// attributed to the new strategy. Missing 30s Audit stays UNKNOWN.
const fs=require('fs'),path=require('path');
const lab=require('../modules/attention/boonolab-mcb3-first-mcb15-shadow');
const ROOT=path.resolve(__dirname,'..'),DATA=path.join(ROOT,'data');
const local=(h,m)=>Date.parse('2026-11-17T'+String(h).padStart(2,'0')+
 ':'+String(m).padStart(2,'0')+':00+01:00');
const start=local(15,0),end=local(19,0);
const files=[
 'v52-paper-decisions.segment-20261117T154302050Z.ndjson',
 'v52-paper-decisions.segment-20261117T211144674Z.ndjson'
];
const data=new Map();
for(const file of files){
 const raw=fs.readFileSync(path.join(DATA,file),'utf8');
 for(const ln of raw.split('\n')){
  try{const d=JSON.parse(ln);
   if(d.ts>=start&&d.ts<=end)data.set(d.ts,d);
  }catch(_){}
 }
}
const decisions=[...data.values()].sort((a,b)=>a.ts-b.ts);
const bars15=fs.readFileSync(path.join(ROOT,'../data/mcb-live/mcb_15m.csv'),'utf8')
 .split(/\r?\n/).slice(1).map(l=>l.split(',')).filter(v=>v.length>=7)
 .map(v=>({ts:Date.parse(v[0]),lt_blue_wave:Number(v[5]),blue_wave:Number(v[6])}))
 .filter(x=>Number.isFinite(x.ts));
const v55=JSON.parse(fs.readFileSync(path.join(DATA,'v55-paper-state.json'),'utf8'));
const v543=JSON.parse(fs.readFileSync(path.join(DATA,'v52-paper-state.json'),'utf8'));
const actual=[
 ...v55.history.filter(x=>[14,15].includes(x.tradeNo)).map(x=>({
  engine:'V55',trade:x.tradeNo,entryAt:x.entryAt,exitAt:x.exitAt,
  direction:x.direction,net:x.netPnlUsd
 })),
 ...v543.history.filter(x=>[272,273].includes(x.tradeNo)).map(x=>({
  engine:'V543',trade:x.tradeNo,entryAt:x.entryAt,exitAt:x.exitAt,
  direction:x.direction,net:x.netPnlUsd
 }))
];
const dstr=ts=>new Date(ts).toLocaleTimeString('fr-FR',{
 timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',second:'2-digit'});
const state=lab.initial(start),events=[],samples=[],gaps=[];
let prior=null;
for(const decision of decisions){
 const at=decision.ts;
 if(prior!==null&&at-prior>90000)
  gaps.push({from:dstr(prior),to:dstr(at),gapMinutes:Math.round((at-prior)/6000)/10});
 prior=at;
 const x=lab.extract(decision,{audit:[],bars15,now:at});
 if(!x)continue;
 const r=lab.observe(state,x);
 if(!r.changed)continue;
 for(const e of r.events)events.push({...e,price:x.price,
  mcb15Gap:x.mcb15.gap,
  confirmed15Dir:x.mcb15.confirmed.direction});
 samples.push({at,price:x.price,parent:x.parent,
  cross3:x.cross3.direction,
  mcb15Live:x.mcb15.liveDirection,
  mcb15Confirmed:x.mcb15.confirmed.direction,
  verdict:r.result.structural.m15Verdict,
  phase:r.result.campaignPhase,
  mf:r.result.structural.mfRelation});
}
const stamps=[local(15,30),local(15,36),local(15,46),
 local(16,3),local(16,27),local(16,39),local(16,43),
 local(17,27),local(18,9),local(18,30),local(18,46)];
const milestones=stamps.map(t=>{
 const r=samples.reduce((p,x)=>Math.abs(x.at-t)<Math.abs(p.at-t)?x:p);
 return {...r,at:dstr(r.at)};
});
console.log(JSON.stringify({
 mode:'READ_ONLY_REPLAY_MCB3_FIRST_MCB15_WAVE',
 noBroker:true,noPaperMutation:true,
 coverage:{decisionRecords:decisions.length,validSamples:samples.length,
  source:'SPARSE_V543_DECISIONS_15_00_TO_19_00',
  auditHistoryPresent:false,exactEventsFromObservedSnapshotsOnly:true,
  historicalGapsOver90seconds:gaps.length,gapExamples:gaps.slice(0,12)},
 baselineClosedTrades:actual.map(x=>({...x,entryAt:dstr(x.entryAt),
  exitAt:dstr(x.exitAt)})),
 newTacticalEvents:events.filter(x=>x.type==='MCB3_NEW_TACTICAL_CROSS')
  .map(x=>({at:dstr(x.at),direction:x.direction,
   mcb15Verdict:x.mcb15Verdict,parentId:x.parentId,
   price:x.price,gap:x.mcb15Gap,confirmed15Dir:x.confirmed15Dir})),
 parentChanges:events.filter(x=>x.type==='PARENT_CHANGED_OBSERVED')
  .map(x=>({at:dstr(x.at),from:x.from,to:x.to,price:x.price})),
 cross15ConfirmedAgainstParent:events.filter(x=>
  x.type==='CROSS15_CONFIRMED_OPPOSES_PARENT')
  .map(x=>({at:dstr(x.at),price:x.price,to:x.direction})),
 milestones,finalCampaign:state.campaign,
 caveat:'No real shadow trades on historical data. Event chronology as of source rows, price/LBW15 response only; no order-book liquidity, spreads, slippage or missing minutes.'
},null,2));
