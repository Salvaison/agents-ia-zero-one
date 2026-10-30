'use strict';
// Approximate historical 30s snapshot replay for research only.
// NOT equal to the 5s runner, native MA observations/fills are incomplete.
// Never writes the real trading state or uses broker clients.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const r=require('../modules/v5/runner-v543'),decision=require('../modules/v5/decision-v543');
const causal=require('../modules/v5/v53-causal');
const shadow=require('../modules/v5/campaign-hold-shadow');
const json=f=>JSON.parse(fs.readFileSync(path.join(root,'data',f),'utf8'));
const trades=fs.readFileSync(path.join(root,'data/v52-paper-trades.ndjson'),'utf8')
 .trim().split('\n').map(JSON.parse);
const audit=json('audit-history.json').filter(x=>
 Number.isFinite(x.ts)&&Number.isFinite(x.lastPrice)).sort((a,b)=>a.ts-b.ts);
const source=r.latest();
const startNo=Number(process.argv[2]||102),horizonHours=Number(process.argv[3]||5);
const first=trades.find(x=>x.tradeNo===startNo);
if(!first)throw Error('MISSING_TRADE_'+startNo);
const start=first.entryAt-30000,end=Math.min(audit.at(-1).ts,
 first.entryAt+horizonHours*3600000);
const initialIdx=audit.findIndex(x=>x.ts>=start);
if(initialIdx<0||audit[initialIdx].ts>first.exitAt){
 console.error(JSON.stringify({status:'CENSORED_NO_AUDIT_AT_ENTRY',
  tradeNo:startNo,auditStart:audit[0].ts,entry:first.entryAt}));process.exit(2);
}
let s=shadow.initial(start-1,null),considered=0,missing=0,found=0,used=[];
const allBars=source.bars3;
function virtualPaper(x){
 const closed=trades.filter(z=>z.exitAt<=x.ts);
 const live=trades.find(z=>z.entryAt<=x.ts&&x.ts<z.exitAt);
 let pos=null;
 if(live)pos={entryAt:live.entryAt,entryPrice:live.entryPrice,
  direction:live.direction,entryFeeUsd:.75,
  entryPolicyVersion:live.entryPolicyVersion,
  entryKey:live.entryKey,campaignId:live.entryContext?.causalChain?.campaignId,
  invalidationPrice:live.entryInvalidation,
  invalidationReference:live.entryContext?.invalidation?.reference,
  mfePriceUsd:0,maePriceUsd:0,
  entryContext:live.entryContext};
 return {position:pos,completed:closed.length,history:closed.slice(-125),
  brokerOrdersEnabled:false,policyActivatedAt:1793138440380,
  startedAt:1793138440380};
}
function territoryStop(position,inp,ts){
 const closed=source.bars3.filter(b=>b.ts+180000<=ts);
 const arr=closed.slice(-24).map(b=>b.high-b.low).sort((a,b)=>a-b);
 const median=arr.length?arr[Math.floor(arr.length/2)]:60;
 return causal.mapPlace({now:ts,price:inp.virtualPrice,
  dir:position.direction,bars3:inp.bars3,bars15:inp.bars15,
  levels:[],median3:median}).invalidation;
}
for(let i=initialIdx;i<audit.length;i++){
 const row=audit[i],ts=row.ts;
 if(ts>end)break;
 const available=source.causalEvents.filter(e=>e.observedAt<=ts);
 const inp={...source,now:ts,virtualPrice:row.lastPrice,
  samples:audit.slice(Math.max(0,i-449),i+1),
  last:row,liveMa3:null,liveMa15:null,levels:[],
  causalEvents:available,
  native15Events:source.native15Events.filter(e=>e.observedAt<=ts),
  health:true,sourceAgeMs:0,tickAgeMs:0};
 const paper=virtualPaper(row);
 const out=shadow.step(s,{paperState:paper,now:ts,
  price:row.lastPrice,input:inp,tickFresh:true,
  decide:(p,v)=>{
   const d=decision.evaluate({...inp,now:ts,price:row.lastPrice,
    position:p,previousAttention:v.previousAttention,
    previousOffensiveMaturity:v.previousOffensiveMaturity,
    startedAt:paper.policyActivatedAt,lastExitAt:null});
   if(d.readings?.structural54?.available===false)missing++;
   return d;
  },territoryStop:p=>territoryStop(p,inp,ts)});
 found+=out.events.filter(e=>e.type==='SHADOW_EXIT').length;
 for(const e of out.events)if(e.type==='SHADOW_EXIT')
  used.push({policy:e.policy,originTradeNo:e.originTradeNo,exitAt:e.exitAt,
   exitReason:e.exitReason,netPnlUsd:e.netPnlUsd,
   baselineNetUsd:e.baselineNetUsd,exitPrice:e.exitPrice,
   mfePriceUsd:e.mfePriceUsd,givebackUsd:e.givebackUsd});
 considered++;
}
const report={version:'indicative-audit-30s-v1',asOf:audit.at(-1).ts,
 startedAt:start,endAt:end,tradeNo:startNo,horizonHours,
 actualFirstTrade:{entryAt:first.entryAt,exitAt:first.exitAt,
  entryPrice:first.entryPrice,exitPrice:first.exitPrice,
  mfePriceUsd:first.mfePriceUsd,netPnlUsd:first.netPnlUsd},
 observationSamples:considered,structuralUnavailability:missing,
 constraints:['30s audit snapshots, not 5s ticks','unknown live MA at historical time',
  'no historical source health guarantee','baseline real entries, blocked overlapping hypothetical reentries',
  'point-in-time events only, but late/rotated source coverage may bias'],
 summary:shadow.summary(s),shadowExitEvents:used};
const out=path.join(root,'data/research-briefs/v543-shadow-replay-'+startNo+'-'+Date.now()+'.json');
fs.writeFileSync(out,JSON.stringify(report));
console.log('REPLAY_RESEARCH_ONLY',JSON.stringify({firstTrade:startNo,
 samples:considered,unavailable:missing,events:used,
 variants:Object.fromEntries(Object.entries(report.summary.variants).map(([k,v])=>[k,
 {completed:v.completed,netUsd:v.netUsd,open:v.open,blockedReentries:v.blockedReentries,
  pairedTrades:v.pairedTrades,delta:v.pairedNetDeltaUsd}])),
 output:out},null,2));
