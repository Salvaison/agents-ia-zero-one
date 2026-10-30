'use strict';
// BOONO Elastic v494: descriptive, prospective research ONLY.
// All inputs are frozen V493 evaluations and confirmed past-price bars.
// Never imported by V494/V543 decision, paper ledger or broker.
const {conversion}=require('../v4/experiments/elastic-observer-shadow');
const ticker4x15=require('./v494-elastic-ticker');
const VERSION='v494-elastic-follow-shadow-v0.1';
const HORIZONS=[1,3,5,15,30,60];
const MAX_EVENTS=220, MAX_SAMPLES=160, GAP_MS=90000, MAX_PERSIST_MIN=30;
const STRONG=new Set(['POWERFUL','EXCEPTIONAL']);
const opposite=d=>d==='long'?'short':d==='short'?'long':null;
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const num=v=>finite(v)?Number(v):null;
const sign=v=>finite(v)&&Number(v)!==0?(Number(v)>0?'long':'short'):null;
const signed=(dir,from,to)=>dir==='long'?to-from:dir==='short'?from-to:null;
const round=v=>finite(v)?Math.round(Number(v)*100)/100:null;
function initial(now=Date.now()){
 return {version:VERSION,mode:'SHADOW_ONLY',decisionImpact:false,brokerOrdersEnabled:false,
   startedAt:now,lastObservationAt:0,lastCheckedAt:0,observations:0,qualitySamples:[],
   lastConversion:null,run:null,previousRun:null,latestQuality:null,range2h:null,
   campaignId:null,stage:'UNOBSERVED',lastEasyContested:null,powerfulStart:null,
   tickerHour:null,
   lastRealActionTs:0,nextId:0,events:[],pending:[],totals:{},errors:0,
   note:'Independent 30s V494 observational laboratory; never trading authority'};
}
function validate(s){
 if(!s||s.version!==VERSION||s.mode!=='SHADOW_ONLY'||s.decisionImpact!==false||
   s.brokerOrdersEnabled!==false||!Array.isArray(s.events)||!Array.isArray(s.pending))
   throw Error('ELASTIC_V494_INCOMPATIBLE_OR_NON_OBSERVATIONAL_STATE');
 return s;
}
function rangeFromConfirmed3m(bars,asOf,price){
 const since=asOf-120*60000,period=180000;
 const rows=(bars||[]).filter(x=>finite(x.ts)&&x.ts+period<=asOf&&
   x.ts+period>since&&finite(x.high)&&finite(x.low)&&x.high>=x.low)
   .slice().sort((a,b)=>a.ts-b.ts);
 const uniq=rows.filter((x,i)=>!i||x.ts!==rows[i-1].ts);
 const maxGap=uniq.slice(1).reduce((m,x,i)=>Math.max(m,x.ts-uniq[i].ts),0);
 const coverage=uniq.length*3,valid=uniq.length>=35&&coverage>=105&&maxGap<=6*60000;
 if(!valid)return {valid:false,reason:'INSUFFICIENT_CONFIRMED_3M_COVERAGE',
    count:uniq.length,coverageMinutes:coverage,maxGapMinutes:round(maxGap/60000)};
 // The boundary must predate this decision. A new live breakout must not
 // silently redefine the confirmed range extreme at its own price.
 const high=Math.max(...uniq.map(x=>x.high)),low=Math.min(...uniq.map(x=>x.low));
 const span=high-low;
 if(!finite(span)||span<=0)return {valid:false,reason:'NO_PRICE_RANGE'};
 const pos=(price-low)/span;
 // Exploratory 10% edge band, NOT a trading admission/exit threshold.
 const band=.10;
 const median3=uniq.map(x=>x.high-x.low).sort((a,b)=>a-b)[Math.floor(uniq.length/2)];
 return {valid:true,source:'3M_CONFIRMED_CANDLES_AS_OF',asOf,
   fromAt:since,throughAt:uniq.at(-1).ts+period,count:uniq.length,
   coverageMinutes:coverage,maxGapMinutes:round(maxGap/60000),
   low:round(low),high:round(high),spanUsd:round(span),
   positionFraction:round(pos),nearLower:pos>=0&&pos<=band,
   nearUpper:pos<=1&&pos>=1-band,
   belowRange:pos<0,aboveRange:pos>1,
   edgeBandFraction:band,median3mRangeUsd:round(median3)};
}
function stateForEval(e,previous){
 const audit={priceMove:num(e?.translation?.pmLive?.priceMoveUsd)};
 const frame={sources:{auditRows:[audit]}};
 const result=conversion(frame,e?.translation,e?.ticker,null,
   previous?{conversion:previous}:null);
 // The historical v0.5 classifier uses V493's already-available ticker P75.
 return {...result,source:'V493_TICKER_P75_ELASTIC_V05_REUSED'};
}
function putEvent(s,created,kind,at,price,direction,extra={}){
 const event={id:++s.nextId,kind,at,price:round(price),direction:direction||null,
   campaignId:s.campaignId,quality:s.latestQuality?.quality||null,
   evidence:'OBSERVED_AS_OF_V494',decisionImpact:false,brokerOrdersEnabled:false,
   ...extra, horizons:{},mfeUsd:0,maeUsd:0,lastOutcomeAt:at,unreliable:false,
   tickerAtEvent:{
     asOf:at,
     regime:s.tickerHour?.regime?.classification||'COVERAGE_INSUFFICIENT',
     coverageFraction:s.tickerHour?.regime?.coverageFraction??null,
     qualityCoverageFraction:s.tickerHour?.regime?.qualityCoverageFraction??null,
     directionalShares:s.tickerHour?.regime?.directionFractions||{},
     corroboration:ticker4x15.corroboration(s.tickerHour,direction),
     lastQuarterYieldVsP75:s.tickerHour?.buckets?.at(-1)?.meanYieldVsP75??null,
     lastQuarterEffortVsP75:s.tickerHour?.buckets?.at(-1)?.meanEffortVsP75??null,
     lastQuarterMarketState:s.tickerHour?.buckets?.at(-1)?.latestMarketState||'UNKNOWN'
   }};
 s.events.push(event);
 if(s.events.length>MAX_EVENTS)s.events.splice(0,s.events.length-MAX_EVENTS);
 if(direction&&extra.evaluate!==false)s.pending.push(event.id);
 created.push({type:'NEW_EVENT',...event,horizons:{}});
 s.totals[kind]??={seen:0,matured5:0,positive5:0,matured15:0,positive15:0,
   matured30:0,positive30:0,censored:0};
 s.totals[kind].seen++;
 return event;
}
function updateEvent(s,created,id,phase,at,details={}){
 const e=s.events.find(x=>x.id===id);
 if(!e)return;
 e.phase=phase;e.phaseAt=at;Object.assign(e,details);
 created.push({type:'EVENT_PHASE',id,kind:e.kind,phase,at,...details});
}
function mature(s,at,price,created){
 if(!s.pending.length)return;
 const next=[];
 for(const id of s.pending){
  const e=s.events.find(x=>x.id===id);
  if(!e||!e.direction)continue;
  const latestElapsed=at-e.lastOutcomeAt;
  if(latestElapsed>GAP_MS||latestElapsed<0)e.unreliable=true;
  const delta=signed(e.direction,e.price,price);
  if(!e.unreliable&&finite(delta)){
   e.mfeUsd=Math.max(e.mfeUsd,delta);
   e.maeUsd=Math.max(e.maeUsd,-delta);
   e.lastOutcomeAt=at;
  }
  for(const h of HORIZONS){
   const name=String(h),target=e.at+h*60000;
   if(e.horizons[name]||at<target)continue;
   // A stale/late price cannot be retroactively used as the exact horizon fill.
   const reliability=!e.unreliable&&at-target<= (h<15?GAP_MS:120000);
   e.horizons[name]=reliability?{status:'MEASURED',at,signedUsd:round(delta),
     mfeUsd:round(e.mfeUsd),maeUsd:round(e.maeUsd),
     positive:delta>0,retention:e.mfeUsd>0?round(Math.max(0,delta)/e.mfeUsd):null}:
     {status:'CENSORED',reason:'MISSING_OR_LATE_PRICE_SAMPLE',at};
   if([5,15,30].includes(h)){
    const counter=s.totals[e.kind];
    if(reliability){counter['matured'+h]++;if(delta>0)counter['positive'+h]++;}
    else counter.censored++;
   }
   if(h===30||h===60)
    created.push({type:'HORIZON_EVALUATED',id,kind:e.kind,at,horizonMinutes:h,
      result:e.horizons[name]});
  }
  if(!e.horizons['60'])next.push(id);
 }
 s.pending=next;
}
function fourByFifteen(s){
 return s.tickerHour?.buckets||ticker4x15.snapshot(s.qualitySamples,s.lastObservationAt).buckets;
 /* LEGACY v0.1 implementation retained temporarily for comparison only.
 const now=s.lastObservationAt,last=Math.floor(now/900000),out=[];
 for(let index=last-3;index<=last;index++){
  const group=s.qualitySamples.filter(x=>Math.floor(x.at/900000)===index);
  const counts={},directionCounts={};
  for(const g of group){
   counts[g.quality]=(counts[g.quality]||0)+1;
   const d=g.direction||'CONTESTED';directionCounts[d]=(directionCounts[d]||0)+1;
  }
  const n=group.length;
  out.push({startAt:index*900000,endAt:(index+1)*900000,
   samples:n,coverageFraction:round(Math.min(1,n/30)),
   qualityFractions:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,round(v/n)])),
   directionFractions:Object.fromEntries(Object.entries(directionCounts).map(([k,v])=>[k,round(v/n)])),
   priceMoveUsd:n>=2?round(group.at(-1).price-group[0].price):null,
   note:'30s sample-time shares; overlapping PM windows NOT added as volume'});
 }
 return out;
 */
}
function classifyEdge(range,direction){
 if(!range?.valid)return {atEdge:false,edge:null,entryDirection:null,reason:'RANGE_NOT_VALID'};
 if(direction==='long'&&range.nearUpper)return {
   atEdge:true,edge:'UPPER_2H',entryDirection:'short',reason:'EASY_LONG_AT_UPPER_EDGE'};
 if(direction==='short'&&range.nearLower)return {
   atEdge:true,edge:'LOWER_2H',entryDirection:'long',reason:'EASY_SHORT_AT_LOWER_EDGE'};
 return {atEdge:false,edge:null,entryDirection:opposite(direction),
   reason:'CONTROL_OUTSIDE_FAVORABLE_EDGE'};
}
function advance(s,input,now=Date.now()){
 validate(s);
 const e=input?.evaluation,asOf=num(input?.asOf),price=num(input?.price);
 if(asOf===null||price===null||!e||!finite(e.marketTimestamp))
  throw Error('ELASTIC_V494_MISSING_TIMESTAMP_OR_EVALUATION');
 s.lastCheckedAt=now;
 if(asOf<=s.lastObservationAt)return {state:s,events:[],changed:false};
 if(Math.abs(asOf-Number(e.marketTimestamp))>1000)
  throw Error('ELASTIC_V494_EVAL_NOT_SAME_AS_OF');
 const qualityOk=input.quality==='DATA_OK',age=now-asOf;
 const tickerAt=num(e.ticker?.current?.ts),tickQualityOk=tickerAt!==null&&
  tickerAt<=asOf+15000&&asOf-tickerAt<=65000;
 const created=[];
 if(!qualityOk||age<0||age>90000||!tickQualityOk){
  s.stage='PAUSED_STALE_SOURCE';
  s.lastCheckedAt=now;
  return {state:s,events:[],changed:false,reason:'STALE_SOURCE_NO_SHADOW_EVENT'};
 }
 // Timestamp of knowledge is the V494 PAPER evaluation time, not E15 candle origin.
 const gap=s.lastObservationAt?asOf-s.lastObservationAt:0;
 if(gap>GAP_MS&&s.run){
  for(const id of s.pending){
   const event=s.events.find(x=>x.id===id);
   if(event)event.unreliable=true;
  }
  s.run=null;s.previousRun=null;s.lastEasyContested=null;s.powerfulStart=null;
  created.push({type:'OBSERVATION_GAP_RESET',at:asOf,gapMs:gap});
 }
 mature(s,asOf,price,created);
 const cv=stateForEval(e,s.lastConversion);
 const prior=s.run;
 const position=input.position||null;
 const r=input.range||{valid:false,reason:'RANGE_NOT_SUPPLIED'};
 s.range2h=r;s.campaignId=String(e.mcb?.currentLobe?.startTs||
   e.setup?.campaignKey||'MCB15_UNKNOWN');
 const sample=ticker4x15.sampleOf(e,cv,asOf,price,s.qualitySamples.at(-1)||null);
 s.qualitySamples.push(sample);
 s.qualitySamples=s.qualitySamples.filter(x=>asOf-x.at<=65*60000).slice(-MAX_SAMPLES);
 s.tickerHour=ticker4x15.snapshot(s.qualitySamples,asOf);
 s.latestQuality={quality:cv.quality,direction:cv.direction,
  marketState:sample.marketState,travelState:sample.travelState,
  phaseHypothesis:sample.phaseHypothesis,mcb15Direction:sample.mcb15Direction,
  mf15Direction:sample.mf15Direction,flowBtcPerSec:sample.flowBtcPerSec,
  cadence:sample.cadence, samples:cv.samples,asOf,source:cv.source,pm3:round(cv.pm3),
  pm5:round(cv.pm5),pmLive:round(cv.pmLive),
  efficiency3m:round(cv.efficiency3m),effortVsP75:round(cv.effortVsP75),
  yieldVsP75:round(cv.yieldVsP75),yieldVsP95:round(cv.yieldVsP95),
  temporalQuality:cv.temporalQuality||null};
 if(!prior){
  s.run={quality:cv.quality,direction:cv.direction,at:asOf,price,samples:1,
    lastAt:asOf,peakSignedUsd:0,origin:'OBSERVED_AT_SHADOW_BOOTSTRAP'};
  if(STRONG.has(cv.quality)&&cv.direction)
   s.powerfulStart={at:asOf,price,direction:cv.direction,observedOnly:true};
 }else if(prior.quality===cv.quality&&prior.direction===cv.direction){
  s.run.samples++;
  s.run.lastAt=asOf;
  if(s.powerfulStart&&STRONG.has(cv.quality)){
   const move=signed(s.powerfulStart.direction,s.powerfulStart.price,price);
   s.run.peakSignedUsd=Math.max(s.run.peakSignedUsd||0,move||0);
  }
  if(s.run.samples===3){
   putEvent(s,created,'QUALITY_CONFIRMED_'+cv.quality,asOf,price,cv.direction,
    {phase:'CONFIRMED',classification:'THREE_FRESH_SNAPSHOTS',
     pm3:round(cv.pm3),pm5:round(cv.pm5),
     yieldVsP75:round(cv.yieldVsP75),effortVsP75:round(cv.effortVsP75)});
   if(s.transitionAwaiting&&s.transitionAwaiting.newQuality===cv.quality){
    updateEvent(s,created,s.transitionAwaiting.id,'CONFIRMED',asOf,
      {confirmedAt:asOf,confirmationPrice:round(price)});
    s.transitionAwaiting=null;
   }
  }
 }else{
  if(s.transitionAwaiting){
   updateEvent(s,created,s.transitionAwaiting.id,'FADED_BEFORE_3_SAMPLES',asOf);
   s.transitionAwaiting=null;
  }
  s.previousRun={...prior};
  created.push({type:'QUALITY_RAW_TRANSITION',at:asOf,price:round(price),
    fromQuality:prior.quality,toQuality:cv.quality,
    fromDirection:prior.direction,toDirection:cv.direction,
    priorSamples:prior.samples,source:'V493_TICKER_P75',decisionImpact:false});
  if(STRONG.has(prior.quality)&&!STRONG.has(cv.quality)&&s.powerfulStart){
   // Resolution is NOT automatically a reversal. An EASY continuation in
   // the original camp is a different test from a new opposite camp.
   const resolutionKind=!cv.direction?'UNRESOLVED_CONTEST':
     cv.direction===s.powerfulStart.direction?'SAME_CAMP_AFTER_POWERFUL':
     'OPPOSITE_CAMP_AFTER_POWERFUL';
   putEvent(s,created,'POWERFUL_RESOLVED',asOf,price,cv.direction,{
     phase:'PROVISIONAL',resolutionKind,
     offensiveDirection:s.powerfulStart.direction,
     powerfulStartedAt:s.powerfulStart.at,
     durationMinutes:round((asOf-s.powerfulStart.at)/60000),
     alreadyPresentAtBootstrap:!!s.powerfulStart.observedOnly,
     resolutionQuality:cv.quality,resolutionDirection:cv.direction,
     pm3:round(cv.pm3),pm5:round(cv.pm5)});
   s.powerfulStart=null;
  }
  if(STRONG.has(cv.quality)&&!s.powerfulStart&&cv.direction){
   s.powerfulStart={at:asOf,price,direction:cv.direction,observedOnly:false};
   putEvent(s,created,'POWERFUL_ONSET',asOf,price,cv.direction,
     {phase:'PROVISIONAL',qualityAtOnset:cv.quality,
      experiment:'INTENSITY_VS_REMAINING_ROOM_NOT_AN_ENTRY_SIGNAL'});
  }
  if(prior.quality==='EASY'&&prior.direction&&
     cv.quality==='CONTESTED'&&prior.samples>=3){
   const edge=classifyEdge(r,prior.direction);
   const exitApplicable=position?.direction===prior.direction;
   const kind=edge.atEdge?'EASY_TO_CONTESTED_AT_EXTREME':
    'EASY_TO_CONTESTED_OUTSIDE_EXTREME';
   const signal=putEvent(s,created,kind,asOf,price,opposite(prior.direction),{
      phase:'PROVISIONAL',previousQuality:'EASY',
      priorEasyDirection:prior.direction,priorEasySamples:prior.samples,
      rangeValid:!!r.valid,rangeEdge:edge.edge,
      rangeLow:r.low??null,rangeHigh:r.high??null,
      rangePosition:r.positionFraction??null,rangeBandFraction:r.edgeBandFraction??null,
      entryHypothesis:edge.atEdge?
       {direction:edge.entryDirection,kind:'POTENTIAL_REVERSAL_NOT_TRADE'}:null,
      exitHypothesis:exitApplicable?
       {positionDirection:position.direction,kind:'POTENTIAL_PROTECTION_NOT_EXIT'}:null,
      incumbentPosition:position?.direction||'FLAT',
      mcb15StructuralDirection:e.mcb?.currentLobe?.structuralDirection||null,
      mfMemoryDirection:e.mfStructureShadow?.temporal?.memoryDirection||null,
      pm3:round(cv.pm3),pm5:round(cv.pm5),
      classification:'OBSERVED_AT_FIRST_CONTESTED_SNAPSHOT'});
   s.lastEasyContested={id:signal.id,at:asOf,price,direction:prior.direction,
     edge:edge.edge,rangeValid:!!r.valid,atEdge:edge.atEdge};
   s.transitionAwaiting={id:signal.id,newQuality:'CONTESTED'};
  }else if(prior.quality==='CONTESTED'&&cv.quality==='EASY'&&cv.direction){
   const linked=s.lastEasyContested&&
      asOf-s.lastEasyContested.at<=MAX_PERSIST_MIN*60000?
      s.lastEasyContested:null;
   const relation=linked?(cv.direction===opposite(linked.direction)?
     'OPPOSITE_CAMP':'ORIGINAL_CAMP'):'UNLINKED';
   const kind='CONTESTED_TO_EASY_'+relation;
   const signal=putEvent(s,created,kind,asOf,price,cv.direction,{
     phase:'PROVISIONAL',linkedContestedId:linked?.id||null,
     priorEasyDirection:linked?.direction||null,rangeEdge:linked?.edge||null,
     beforeAtExtreme:!!linked?.atEdge,
     incumbentPosition:position?.direction||'FLAT',
     exitHypothesis:position?.direction&&position.direction!==cv.direction?
      {positionDirection:position.direction,kind:'OPPOSING_EASY_AFTER_CONTEST_NOT_EXIT'}:null,
     pm3:round(cv.pm3),pm5:round(cv.pm5),
     mcb15StructuralDirection:e.mcb?.currentLobe?.structuralDirection||null,
     semantic:'DIRECTIONAL_CONVERSION_CANDIDATE_NOT_CONFIRMED_MCB15_TRANSFER'});
   s.transitionAwaiting={id:signal.id,newQuality:'EASY'};
   if(linked){
    updateEvent(s,created,linked.id,
      relation==='OPPOSITE_CAMP'?'OPPOSING_EASY_APPEARED':'ORIGINAL_EASY_RETURNED',
      asOf,{resolvedAt:asOf,resolutionEventId:signal.id});
   }
  }
  s.run={quality:cv.quality,direction:cv.direction,at:asOf,price,samples:1,
    lastAt:asOf,peakSignedUsd:0,origin:'NEW_OBSERVED_TRANSITION'};
 }
 // Real PAPER events are annotated, never blocked or replayed as fictitious fills.
 const realAction=input.decision||{},actionAt=num(realAction.marketTs);
 const action=String(realAction.type||'');
 if(actionAt===asOf&&actionAt>s.lastRealActionTs&&
    (/^ENTER_(LONG|SHORT)$/.test(action)||/^EXIT_/.test(action))){
  s.lastRealActionTs=actionAt;
  if(/^ENTER_/.test(action)){
   const direction=action.endsWith('LONG')?'long':'short';
   const category=STRONG.has(cv.quality)?'STRONG':
     cv.quality==='EASY'?'EASY':cv.quality==='CONTESTED'?'CONTESTED':'OTHER';
   putEvent(s,created,'V494_BASELINE_ENTRY_'+category,asOf,price,direction,{
     phase:'OBSERVED_REAL_PAPER_DECISION',realAction:action,
     baselineReason:String(realAction.reason||'').slice(0,140),
     qualityDirection:cv.direction,
     hypothesis:category==='STRONG'?'DEFER_NEW_ENTRY_UNTIL_POWERFUL_RESOLVES':
      category==='EASY'?'CHECK_EASY_ENTRY_ECONOMY':'CONTROL',
     note:'Descriptive label only; original V494 trade was NOT blocked'});
  }else{
   putEvent(s,created,'V494_BASELINE_EXIT',asOf,price,
     opposite(position?.direction||null),{phase:'OBSERVED_REAL_PAPER_DECISION',
     realAction:action,qualityAtExit:cv.quality,
     note:'Observed exit, not attributed to Elastic',evaluate:false});
  }
 }
 s.lastConversion=cv;s.lastObservationAt=asOf;s.lastPrice=round(price);s.observations++;
 s.stage='OBSERVING_FRESH_V494';
 // Current 4×15m ticker already captured the current as-of sample above.
 return {state:s,events:created,changed:true};
}
function corroborationStats(events){
 // Conditional descriptive outcomes of the retained research-event window.
 // Ticker and event share inputs: aligned DOES NOT mean independent evidence.
 const groups={};
 for(const event of events||[]){
  const label=event.tickerAtEvent?.corroboration||'UNAVAILABLE';
  const key=event.kind+'|'+label;
  if(!groups[key])groups[key]={
   kind:event.kind,alignment:label,seen:0,matured15:0,
   positive15:0,negative15:0,censored15:0,sum15Usd:0};
  const c=groups[key];c.seen++;
  const h=event.horizons?.['15'];
  if(h?.status==='MEASURED'){
   c.matured15++;c.sum15Usd+=Number(h.signedUsd)||0;
   if(h.signedUsd>0)c.positive15++;
   else if(h.signedUsd<0)c.negative15++;
  }else if(h?.status==='CENSORED')c.censored15++;
 }
 return Object.values(groups).map(c=>({
  kind:c.kind,alignment:c.alignment,seen:c.seen,
  matured15:c.matured15,positive15:c.positive15,negative15:c.negative15,
  censored15:c.censored15,
  mean15Usd:c.matured15?round(c.sum15Usd/c.matured15):null,
  evidence:'RETAINED_SHADOW_EVENTS_ONLY_WITH_15MIN_PRICE_OUTCOME'
 })).sort((a,b)=>b.seen-a.seen).slice(0,40);
}
function summary(s,now=Date.now()){
 validate(s);
 const asOf=s.lastObservationAt,age=now-asOf;
 const stat=(x)=>({seen:x.seen,matured5:x.matured5,
   positive5:x.positive5,matured15:x.matured15,positive15:x.positive15,
   matured30:x.matured30,positive30:x.positive30,censored:x.censored});
 const events=s.events.slice(-24).reverse().map(e=>({
   id:e.id,kind:e.kind,at:e.at,price:e.price,direction:e.direction,
   phase:e.phase||null,previousQuality:e.previousQuality||null,
   priorEasyDirection:e.priorEasyDirection||null,rangeEdge:e.rangeEdge||null,
   rangePosition:e.rangePosition??null,rangeValid:e.rangeValid??null,
   rangeLow:e.rangeLow??null,rangeHigh:e.rangeHigh??null,
   entryHypothesis:e.entryHypothesis||null,
   exitHypothesis:e.exitHypothesis||null,
   linkedContestedId:e.linkedContestedId||null,
   incumbentPosition:e.incumbentPosition||null,
   horizon5:e.horizons?.['5']||null,horizon15:e.horizons?.['15']||null,
   horizon30:e.horizons?.['30']||null,
   tickerAtEvent:e.tickerAtEvent||null,
   note:e.note||e.semantic||null}));
 return {version:VERSION,mode:'SHADOW_ONLY',decisionImpact:false,
   brokerOrdersEnabled:false,source:'V494_FROZEN_V493_P75_AND_CONFIRMED_3M',
   startedAt:s.startedAt,asOf,ageMs:age,
   status:!asOf||age<0||age>90000?'SOURCE_STALE':
     s.stage==='PAUSED_STALE_SOURCE'?'SOURCE_STALE':'DATA_RECENT',
   stage:s.stage,observations:s.observations,campaignId:s.campaignId,price:s.lastPrice??null,
   current:s.latestQuality,qualityRun:s.run,range2h:s.range2h,
   activePositionComparison:s.activePositionComparison||null,
   lastDecision:s.lastDecision||null,
   fourByFifteen:asOf?fourByFifteen(s):[],
   hourRegime:s.tickerHour?.regime||null,
   corroboration:corroborationStats(s.events),
   totals:Object.fromEntries(
     Object.entries(s.totals).map(([k,v])=>[k,stat(v)])),
   recentEvents:events,
   note:'Qualities from original Elastic v0.5 using V493 P75; experimental edge 10% 2h confirmed range; no PAPER orders changed; event outcomes are BTC price differences, not net PNL'};
}
module.exports={VERSION,HORIZONS,initial,validate,rangeFromConfirmed3m,stateForEval,
 advance,summary,classifyEdge};
