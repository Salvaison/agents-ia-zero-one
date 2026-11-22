'use strict';
// AS-OF interpretation case study; never replays fills or modifies PAPER.
// Each narrative is constructed from data available at that observation time.
// Actual PnL is attached only after interpreting the entry.
const fs=require('fs'),path=require('path');
const {dataset}=require('./boonolab-practicability-shadow-replay');
const P=require('../modules/attention/boonolab-market-practicability-shadow');
const E=require('../modules/attention/boonolab-place-e1e4-shadow');
const I=require('../modules/attention/boonolab-wave-geometry-interpreter');
const ROOT=path.resolve(__dirname,'..'),DATA=path.join(ROOT,'data'),
 FILE=path.join(DATA,'boonolab-geometry-interpreter-cases-asof.json');
const rows=dataset();
const b1=E.parseMcbCsv(fs.readFileSync(path.join(ROOT,'../data/mcb-live/mcb_1h.csv'),'utf8'),'1h');
const b4=E.parseMcbCsv(fs.readFileSync(path.join(ROOT,'../data/mcb-live/mcb_4h.csv'),'utf8'),'4h');
const levels=JSON.parse(fs.readFileSync(path.join(DATA,'levels.json'),'utf8'));
const levelsMtime=fs.statSync(path.join(DATA,'levels.json')).mtimeMs;
const state=JSON.parse(fs.readFileSync(path.join(DATA,'v553-paper-state.json'),'utf8'));
if(state.mode!=='PAPER_ONLY'||state.brokerOrdersEnabled!==false||
 state.policyVersion!=='v5.5.3-live-causal-price-market-paper-v1')
 throw Error('CASE_STUDY_REJECT_POLICY');
const entries=state.history.filter(x=>x.tradeNo>=33&&x.tradeNo<=68);
function get(asOf){
 return P.evaluate({audit:rows,asOf,bars1h:b1,bars4h:b4,
 levels,levelsMtime});
}
const selected=[36,38,43,46,55,57,58,59,61,62,63,64,65,66];
const all=entries.map(t=>{
 const x=get(t.entryAt),i=x.waveInterpretation;
 const candidate=I.assessCandidate(i,t.direction);
 const record={tradeNo:t.tradeNo,direction:t.direction,
  entryAt:t.entryAt,exitAt:t.exitAt,entryPrice:t.entryPrice,
  actualNetUsd:t.netPnlUsd,actualMfePriceUsd:t.mfePriceUsd,
  readOnly:true,interpretationAsOf:i,
  marketContextAsOf:{
   measurements:x.measurements,
   higher:x.higher,place:x.place,
   productiveEscape:x.proposed?.GEOMETRY_OR_SLOW?.productiveEscape||false},
  candidateViewAsOf:candidate};
 if(selected.includes(t.tradeNo)){
  const seq=[];
  const observations=rows.filter(r=>r.ts>=t.entryAt&&
    r.ts<=t.exitAt);
  let lastAt=0,priorPhase=null;
  for(const r of observations){
   if(lastAt&&r.ts-lastAt<3*60000)continue;
   const ir=get(r.ts).waveInterpretation;
   if(!ir.available)continue;
   if(ir.phase!==priorPhase||!lastAt||
      r.ts-lastAt>=15*60000||
      r.ts>=t.exitAt-3*60000){
    seq.push({asOf:r.ts,phase:ir.phase,
     hypothesis:ir.hypothesis,
     angle:ir.dynamics.normalizedRelativeAngleDeg,
     opening:ir.dynamics.opening,
     acceleration:ir.dynamics.accelerationSupportsOpening,
     priceTranslation:ir.economic.priceTranslation,
     marketEconomy:ir.economic.economy,
     priceSinceCross:ir.economic.priceSinceCross,
     observedCrossAt:ir.temporal.firstKnownCrossAt});
    lastAt=r.ts;priorPhase=ir.phase;
   }
  }
  record.inPositionMorphologicalHistory=seq.slice(0,80);
 }
 return record;
});
const byType={};
for(const r of all){
 const key=r.candidateViewAsOf.status;
 if(!byType[key])byType[key]={trades:0,wins:0,actualNetUsd:0,numbers:[]};
 byType[key].trades++;
 byType[key].wins+=+(r.actualNetUsd>0);
 byType[key].actualNetUsd+=r.actualNetUsd;
 byType[key].numbers.push(r.tradeNo);
}
for(const x of Object.values(byType))
 x.actualNetUsd=Math.round(x.actualNetUsd*100)/100;
const report={version:I.VERSION,mode:'HISTORICAL_ASOF_RECONSTRUCTION_ONLY',
 decisionImpact:false,brokerOrdersEnabled:false,
 asOf:rows.at(-1).ts,records:all.length,
 byCandidateMorphology:byType,
 cases:all,
 caveats:[
  'A phase is a semantic description, NOT a trading predictor or instruction',
  'P&L is attached after geometry interpretation as an audit outcome only',
  'Trade-exit price is not used in any entry interpretation',
  'Only closed E1/E4 and manual levels known as-of are included',
  'Trajectory window is up to eight hours, not guaranteed full native wave',
  '30-second Bâton crossing timestamps may jitter and are not native 15m closes',
  'Changing admission policy changes future trade sequence, so no counterfactual PnL']
};
if(process.argv.includes('--publish')){
 if(fs.existsSync(FILE))throw Error('INTERPRETER_CASE_REPORT_ALREADY_EXISTS');
 const temp=FILE+'.temp-'+process.pid;
 fs.writeFileSync(temp,JSON.stringify(report,null,2));
 fs.renameSync(temp,FILE);
}
console.log(JSON.stringify({
 version:report.version,records:all.length,
 status:byType,
 examples:all.filter(x=>[38,43,58,61,62,63,64,65,66].includes(x.tradeNo))
 .map(x=>({
  n:x.tradeNo,net:x.actualNetUsd,candidate:x.candidateViewAsOf.status,
  phase:x.interpretationAsOf.phase,
  hypothesis:x.interpretationAsOf.hypothesis,
  price:x.interpretationAsOf.economic.priceTranslation,
  market:x.interpretationAsOf.economic.economy,
  slow:x.interpretationAsOf.higherContext.E1_E4_sharedDirection,
  morphologicalUpdates:x.inPositionMorphologicalHistory?.length||0,
  morphology:x.inPositionMorphologicalHistory?.slice(0,5)||[]
 })),
 NO_PAPER_WRITES:true},null,2));
