'use strict';
// Reconstruct V553 entry's available whole-wave morphology from actual
// historic Bâton events. No simulated trades or future bars.
const fs=require('fs'),path=require('path');
const W=require('../modules/attention/boonolab-wave-geometry');
const {dataset}=require('./boonolab-practicability-shadow-replay');
const ROOT=path.resolve(__dirname,'..');
const FILE=path.join(ROOT,'data/boonolab-wave-geometry-trade-cases-asof.json');
const raw=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v553-paper-state.json'),'utf8'));
if(raw.mode!=='PAPER_ONLY'||raw.brokerOrdersEnabled!==false)
 throw Error('WAVE_GEOMETRY_UNEXPECTED_SOURCE');
const audit=dataset();
const entries=raw.history.filter(x=>[33,34,35,36,38,40,41,42,43,44,45,46,50,51,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68].includes(x.tradeNo));
function excerpt(s){
 if(!s.available)return {unavailable:s.reason};
 return {asOf:s.asOf,
  historyMinutes:s.completeness.observedHistoryMin,
  lbw15:s.current.lbw15,bw15:s.current.bw15,gap15:s.current.gap15,
  rangeLocation8h:s.current.positionInObserved8hLBWRange,
  recentExtremumHighAt:s.current.highAt,
  recentExtremumLowAt:s.current.lowAt,
  lbwSpeed3m:s.kinetics.lbwSpeed3mPerMin,
  lbwSpeed15m:s.kinetics.lbwSpeed15mPerMin,
  bwSpeed3m:s.kinetics.bwSpeed3mPerMin,
  gapSpeed3m:s.kinetics.gapSpeed3mPerMin,
  gapAccel:s.kinetics.gapAccelPerMin2,
  angleNow:s.kinetics.normalizedAngleNow?.relativeAngleDeg,
  lastCrossAt:s.morphology.lastCross?.at||null,
  lastCrossDirection:s.morphology.lastCross?.to||null,
  lastCrossAgeMin:s.morphology.lastCross?.ageMin??null,
  lastCrossAngle:s.morphology.lastCross?.angle?.relativeAngleDeg??null,
  lastCrossPriceResponse:s.morphology.sinceLastCross?.priceMoveInCrossDirectionUsd??null,
  lastCrossMf15Delta:s.morphology.sinceLastCross?.mf15Delta??null,
  crossCountHour:s.morphology.crossEventsLastHour,
  nearContactFractionHour:s.morphology.nearContactFractionLastHour,
  lastWaveSegments:s.morphology.recentSegments.slice(-4)};
}
const out=entries.map(t=>{
 const entry=W.compute(audit,t.entryAt);
 return {tradeNo:t.tradeNo,direction:t.direction,
  entryAt:t.entryAt,entryPrice:t.entryPrice,
  actualNetUsd:t.netPnlUsd,exitAt:t.exitAt,
  geometryAtEntry:excerpt(entry),
  geometryAtExit:excerpt(W.compute(audit,t.exitAt))};
});
const report={version:W.VERSION,mode:'ASOF_RECONSTRUCTION_ONLY',
 decisionImpact:false,brokerOrdersEnabled:false,
 source:'HOURLY_BATON_30S_NO_LOOKAHEAD',
 constructedAt:Date.now(),caseCount:out.length,
 cases:out,notes:[
  'Not a SHADOW veto or reweighted strategy; real V553 entries retained',
  'Full wave beyond eight hours is not asserted',
  'Angles normalized to observed recent MCB amplitude, not TradingView screen',
  'No causal significance of each shape attribute is established',
  'Outcome known for evaluation only, never injected into entry-time signature']};
if(process.argv.includes('--publish')){
 if(fs.existsSync(FILE))throw Error('ASOF_CASE_REPORT_ALREADY_EXISTS');
 const tmp=FILE+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(report,null,2));
 fs.renameSync(tmp,FILE);
}
console.log(JSON.stringify({reportVersion:report.version,cases:out.map(x=>({
 n:x.tradeNo,side:x.direction,net:x.actualNetUsd,
 available:!x.geometryAtEntry.unavailable,
 gap:x.geometryAtEntry.gap15,
 lbwSpeed3m:x.geometryAtEntry.lbwSpeed3m,
 lbwSpeed15m:x.geometryAtEntry.lbwSpeed15m,
 gapSpeed3m:x.geometryAtEntry.gapSpeed3m,
 accel:x.geometryAtEntry.gapAccel,
 normAngle:x.geometryAtEntry.angleNow,
 crossInHour:x.geometryAtEntry.crossCountHour,
 crossAgeMin:x.geometryAtEntry.lastCrossAgeMin,
 lastCrossAngle:x.geometryAtEntry.lastCrossAngle,
 priceSinceCross:x.geometryAtEntry.lastCrossPriceResponse,
 lbwPlace:x.geometryAtEntry.rangeLocation8h,
 nearContact:x.geometryAtEntry.nearContactFractionHour
 }))},null,2));
