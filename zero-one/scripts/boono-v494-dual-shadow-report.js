'use strict';
// Human-readable, on-demand comparison of four independently accounted V494
// shadow campaigns. No API/UI polling, broker, scheduler or state mutation.
const fs=require('fs'),path=require('path');
const FILE=path.resolve(__dirname,'../data/v494-dual-module-shadow-summary.json');
const raw=fs.readFileSync(FILE,'utf8'),s=JSON.parse(raw);
if(s.mode!=='SHADOW_ONLY'||s.brokerOrdersEnabled!==false||
  s.decisionImpact!==false)throw Error('UNTRUSTED_SHADOW_STATE');
const ids={
 A:'EXACT_V493__FROZEN_V493',
 B:'EXACT_V493__CONTINUATION_SUPERVISOR',
 C:'MCB15_INFLECTION__FROZEN_V493',
 D:'MCB15_INFLECTION__CONTINUATION_SUPERVISOR'
};
const f=x=>Number(x||0).toFixed(4);
function record(key){
 const x=s.branches[ids[key]];
 if(!x)throw Error('MISSING_FACTORIAL_BRANCH_'+key);
 return {label:key,entry:x.entryPolicy,exit:x.exitPolicy,
  n:x.completed,entries:x.entries,blocked:x.blockedEntries,
  fee:x.feesUsd,net:x.netRealizedUsd,
  pos:x.position?.direction||'FLAT',
  byDirection:x.netByDirection||{},entryDirections:x.entriesByDirection||{}};
}
const a=record('A'),b=record('B'),c=record('C'),d=record('D');
const result={version:s.version,asOf:s.lastObservationAt,
 asOfUTC:new Date(s.lastObservationAt).toISOString(),
 observationCount:s.observations||0,
 routeCount:4,branches:[a,b,c,d],
 exitEffectExactEntry:b.net-a.net,
 exitEffectFilteredEntry:d.net-c.net,
 entryEffectOriginalExit:c.net-a.net,
 entryEffectAlternativeExit:d.net-b.net,
 interactionContrast:(d.net-c.net)-(b.net-a.net),
 influence:s.recentInfluence||[],
 realBaseline:s.originalComparison||null,
 warning:'Unmatched entries, risk and positions: effects are descriptive, NOT an unbiased causal effect or actionable performance'};
if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
else{
 console.log('BOONO V4.9.4 — DOUBLE MODULE SHADOW | '+result.asOfUTC+
  '\n'+result.observationCount+' observations, 4 branches, non-funded; no UI load');
 for(const x of result.branches)
  console.log(x.label+' · '+x.entry+' / '+x.exit+' | entries '+x.entries+
   ', closes '+x.n+', net '+f(x.net)+' $, fees '+f(x.fee)+
   ' $, filtered '+x.blocked+', position '+x.pos+
   ', LONG '+f(x.byDirection.long)+' $, SHORT '+f(x.byDirection.short)+' $');
 if(!a.n&&!b.n&&!c.n&&!d.n)
  console.log('No completed shadow campaigns yet; profitability conclusions unavailable.');
 else{
  console.log('Sortie seule B−A '+f(result.exitEffectExactEntry)+' $; D−C '+
   f(result.exitEffectFilteredEntry)+' $');
  console.log('Entrée seule C−A '+f(result.entryEffectOriginalExit)+' $; D−B '+
   f(result.entryEffectAlternativeExit)+' $');
  console.log('Interaction différence-des-différences descriptive '+f(result.interactionContrast)+' $');
 }
 const influences=(s.recentInfluence||[]);
 console.log('Exposure-influence events recent '+influences.length);
 for(const i of influences.slice(-5)){
  if(i.type==='EXIT_ENABLED_REENTRY')
   console.log(new Date(i.ts).toISOString()+' EXIT_ENABLED_REENTRY '+
    i.entryPolicy+' prior '+i.priorExit?.reason+' -> '+i.newDirection+
    ' while original holds '+i.originalBlockedBy?.direction);
  else console.log(new Date(i.ts).toISOString()+' '+i.type+
   ' '+(i.entryPolicy||i.exitPolicy)+' '+i.original+' -> '+
   (i.review||i.filtered));
 }
 console.log('Active V494 comparison',JSON.stringify(result.realBaseline));
 console.log(result.warning);
}
