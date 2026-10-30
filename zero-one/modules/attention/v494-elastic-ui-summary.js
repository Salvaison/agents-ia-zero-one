'use strict';
// Compact authenticated BOONO Watch view of the autonomous V494 Elastic lab.
const VERSION='v494-elastic-shadow-ui-v0.1';
const SOURCE='v494-elastic-follow-shadow-v0.1';
const nn=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const text=(v,max=120)=>String(v===null||v===undefined?'':v).slice(0,max);
const integer=v=>Math.max(0,Math.trunc(nn(v)||0));
function build(raw,now=Date.now()){
 if(!raw||raw.version!==SOURCE||raw.mode!=='SHADOW_ONLY'||
    raw.decisionImpact!==false||raw.brokerOrdersEnabled!==false)
   throw Error('ELASTIC_V494_UNTRUSTED_OR_NON_READONLY');
 const at=nn(raw.asOf);
 if(at===null||at<0||at>now+30000)
   throw Error('ELASTIC_V494_INVALID_ASOF');
 const current=raw.current||{},range=raw.range2h||{};
 const q={quality:text(current.quality,25),direction:text(current.direction,8),
   samples:integer(current.samples),asOf:nn(current.asOf),
   pm3:nn(current.pm3),pm5:nn(current.pm5),pmLive:nn(current.pmLive),
   effortVsP75:nn(current.effortVsP75),yieldVsP75:nn(current.yieldVsP75),
   yieldVsP95:nn(current.yieldVsP95),temporalQuality:text(current.temporalQuality,30),
   marketState:text(current.marketState,35),travelState:text(current.travelState,42),
   phaseHypothesis:text(current.phaseHypothesis,35),
   mcb15Direction:text(current.mcb15Direction,8),
   mf15Direction:text(current.mf15Direction,8),
   flowBtcPerSec:nn(current.flowBtcPerSec),cadence:nn(current.cadence)};
 const events=(Array.isArray(raw.recentEvents)?raw.recentEvents:[]).slice(0,16).map(e=>({
   id:integer(e.id),kind:text(e.kind,80),at:nn(e.at),price:nn(e.price),
   direction:text(e.direction,8),phase:text(e.phase,40),
   priorEasyDirection:text(e.priorEasyDirection,8),
   rangeEdge:text(e.rangeEdge,25),rangePosition:nn(e.rangePosition),
   rangeLow:nn(e.rangeLow),rangeHigh:nn(e.rangeHigh),
   entryHypothesis:e.entryHypothesis?{
     direction:text(e.entryHypothesis.direction,8),kind:text(e.entryHypothesis.kind,55)}:null,
   exitHypothesis:e.exitHypothesis?{
     positionDirection:text(e.exitHypothesis.positionDirection,8),
     kind:text(e.exitHypothesis.kind,60)}:null,
   incumbentPosition:text(e.incumbentPosition,8),
   linkedContestedId:nn(e.linkedContestedId),
   horizon5:e.horizon5?outcome(e.horizon5):null,
   horizon15:e.horizon15?outcome(e.horizon15):null,
   horizon30:e.horizon30?outcome(e.horizon30):null,
   tickerAtEvent:e.tickerAtEvent?{
     regime:text(e.tickerAtEvent.regime,40),
     corroboration:text(e.tickerAtEvent.corroboration,45),
     coverageFraction:nn(e.tickerAtEvent.coverageFraction),
     qualityCoverageFraction:nn(e.tickerAtEvent.qualityCoverageFraction),
     lastQuarterMarketState:text(e.tickerAtEvent.lastQuarterMarketState,35)
   }:null
 }));
 const totals={};
 for(const [key,val] of Object.entries(raw.totals||{}).slice(0,35)){
  totals[text(key,85)]={seen:integer(val?.seen),
   matured5:integer(val?.matured5),positive5:integer(val?.positive5),
   matured15:integer(val?.matured15),positive15:integer(val?.positive15),
   matured30:integer(val?.matured30),positive30:integer(val?.positive30),
   censored:integer(val?.censored)};
 }
 const age=now-at;
 return {version:VERSION,mode:'SHADOW_ONLY',decisionImpact:false,
   brokerOrdersEnabled:false,asOf:at,startedAt:nn(raw.startedAt),
   ageMs:age,status:age>90000?'SOURCE_STALE':'DATA_RECENT',
   stage:text(raw.stage,35),observations:integer(raw.observations),price:nn(raw.price),
   campaignId:text(raw.campaignId,85),current:q,
   source:text(raw.source,85),
   position:text(raw.activePositionComparison?.direction||'FLAT',8),
   referenceAction:text(raw.lastDecision?.type||'',30),
   range2h:{valid:range.valid===true,reason:text(range.reason,65),
     low:nn(range.low),high:nn(range.high),spanUsd:nn(range.spanUsd),
     positionFraction:nn(range.positionFraction),
     nearUpper:range.nearUpper===true,nearLower:range.nearLower===true,
     edgeBandFraction:nn(range.edgeBandFraction),
     coverageMinutes:nn(range.coverageMinutes)},
   quality4x15:(Array.isArray(raw.fourByFifteen)?raw.fourByFifteen:[]).slice(-4)
      .map(w=>({startAt:nn(w.startAt),samples:integer(w.samples),
         partial:w.partial===true,coverageFraction:nn(w.coverageFraction),
         qualityCoverageFraction:nn(w.qualityCoverageFraction),
         qualityFractions:fractions(w.qualityFractions),
         directionFractions:fractions(w.directionFractions),
         marketFractions:fractions(w.marketFractions),
         travelFractions:fractions(w.travelFractions),
         phaseFractions:fractions(w.phaseFractions),
         latestMarketState:text(w.latestMarketState,36),
         latestPhaseHypothesis:text(w.latestPhaseHypothesis,36),
         productiveShare:nn(w.productiveShare),sterileShare:nn(w.sterileShare),
         meanEffortVsP75:nn(w.meanEffortVsP75),
         meanYieldVsP75:nn(w.meanYieldVsP75),
         meanFlowBtcPerSec:nn(w.meanFlowBtcPerSec),
         meanCadence:nn(w.meanCadence),
         meanPmLive:nn(w.meanPmLive),
         priceRetainedFraction:nn(w.priceRetainedFraction),
         priceMoveUsd:nn(w.priceMoveUsd)})),
   hourlyRegime:raw.hourRegime?{
     classification:text(raw.hourRegime.classification,45),
     coverageFraction:nn(raw.hourRegime.coverageFraction),
     qualityCoverageFraction:nn(raw.hourRegime.qualityCoverageFraction),
     directionFractions:fractions(raw.hourRegime.directionFractions),
     productiveShare:nn(raw.hourRegime.productiveShare),
     sterileShare:nn(raw.hourRegime.sterileShare),
     easyShare:nn(raw.hourRegime.easyShare),
     strongShare:nn(raw.hourRegime.strongShare),
     priorDirection:text(raw.hourRegime.priorDirection,8),
     recentDirection:text(raw.hourRegime.recentDirection,8)
   }:null,
   corroboration:(Array.isArray(raw.corroboration)?raw.corroboration:[]).slice(0,35)
     .map(c=>({kind:text(c.kind,85),alignment:text(c.alignment,50),
       seen:integer(c.seen),matured15:integer(c.matured15),
       positive15:integer(c.positive15),negative15:integer(c.negative15),
       censored15:integer(c.censored15),mean15Usd:nn(c.mean15Usd)})),
   totals,recentEvents:events,
   note:'Research only, no V494/V543 entry or exit authority. Price BTC outcomes without fees. 2h edge 10% exploratory.'};
}
function fractions(v){
 const out={};
 for(const [k,n] of Object.entries(v||{}).slice(0,22)){
  const x=nn(n);if(x!==null&&x>=0&&x<=1)out[text(k,50)]=x;
 }
 return out;
}
function outcome(o){
 return {status:text(o?.status,16),signedUsd:nn(o?.signedUsd),
   mfeUsd:nn(o?.mfeUsd),maeUsd:nn(o?.maeUsd),positive:o?.positive===true,
   reason:text(o?.reason,55)};
}
module.exports={VERSION,SOURCE,build};
