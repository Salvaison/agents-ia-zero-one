'use strict';
// BOONOLAB V494: crossed, independent entry/exit policies in four PAPER-only
// research branches. Never imports or mutates the active V494 or V543 ledgers.
const entries=require('./v494-entry-module-shadow');
const exits=require('./v494-exit-module-shadow');
const VERSION='boono-v494-entry-exit-lab-v0.1';
const NOTIONAL=1500,TAKER=.0005,RISK_BTC=500;
const round=n=>Math.round(n*10000)/10000;
const side=d=>d==='long'?1:-1;
const ROUTES=Object.freeze(entries.POLICIES.flatMap(a=>
 exits.POLICIES.map(b=>({id:a+'__'+b,entryPolicy:a,exitPolicy:b}))));
const copy=x=>JSON.parse(JSON.stringify(x));
function newBranch(route){
 return {route,position:null,prevEval:null,previousAttention:null,
  lastAction:null,lastExit:null,completed:0,realizedNetUsd:0,feesUsd:0,
  entries:0,blockedEntries:0,partialExits:0,
  entriesByDirection:{long:0,short:0},blockedByDirection:{long:0,short:0},
  exitsByReason:{},missedAdmissionKeys:[],history:[],
  lastDecision:null};
}
function initial(now=Date.now()){
 return {version:VERSION,mode:'SHADOW_ONLY',brokerOrdersEnabled:false,
  decisionImpact:false,startedAt:now,warmupUntil:now+180000,
  lastObservationAt:0,observations:0,events:[],
  influenceEvents:[],lastComparison:null,
  branches:Object.fromEntries(ROUTES.map(r=>[r.id,newBranch(r)]))};
}
function migrate(s){
 if(!s||s.version!==VERSION||s.brokerOrdersEnabled!==false||
    s.decisionImpact!==false)throw Error('SHADOW_STATE_MIGRATION_REFUSED');
 for(const b of Object.values(s.branches||{})){
  if(!b.entriesByDirection){
   b.entriesByDirection={long:0,short:0};
   for(const row of b.history||[])b.entriesByDirection[row.direction]++;
   if(b.position)b.entriesByDirection[b.position.direction]++;
  }
  if(!b.blockedByDirection)b.blockedByDirection={long:0,short:0};
  if(b.position){
   const p=b.position;
   if(!p.entryTimestamp)p.entryTimestamp=new Date(p.entryAt).toISOString();
   if(!p.entrySetupId)p.entrySetupId=null;
   if(!p.metrics.favorableUsd)p.metrics.favorableUsd=Math.max(0,p.metrics.currentSignedUsd||0);
   if(!p.metrics.adverseUsd)p.metrics.adverseUsd=Math.max(0,-(p.metrics.currentSignedUsd||0));
  }
  if(!('lastExit' in b))b.lastExit=(b.history||[]).length?
   {ts:b.history.at(-1).exitAt,reason:b.history.at(-1).reason,
    direction:b.history.at(-1).direction,
    entryAt:b.history.at(-1).entryAt,
    netPnlUsd:b.history.at(-1).netPnlUsd}:null;
 }
 return s;
}
function pnl(direction,entry,price,notional=NOTIONAL){
 return (price-entry)*side(direction)*notional/entry;
}
function event(s,events,data){
 events.push(data);
 s.events.push(data);
 if(s.events.length>150)s.events=s.events.slice(-150);
}
function open(s,b,e,selected,frame,anchor){
 const ts=Number(frame.market.timestamp),price=Number(frame.market.price);
 const fee=round(NOTIONAL*TAKER);
 const lv=anchor?anchor({frame,direction:selected.direction,evaluation:e}):null;
 const inv=lv&&Number.isFinite(lv.price)?lv.price:null;
 const p={direction:selected.direction,entryAt:ts,
  entryTimestamp:new Date(ts).toISOString(),entryPrice:price,lastPrice:price,
  entryFeeUsd:fee,initialNotionalUsd:NOTIONAL,notionalUsd:NOTIONAL,
  marginUsd:150,initialMarginUsd:150,capitalUsd:1000,leverage:10,
  entryPolicyVersion:'v4.9.4-temporal-reversal-listening-paper-v1',
  tradingFeesPaidUsd:fee,realizedPnlUsd:-fee,grossRealizedPnlUsd:0,
  realizedGrossUsd:0,partialFeesUsd:0,tp1Taken:false,tpEvents:[],
  entryReason:e.action?.reason||null,entryMode:e.action?.stage||null,
  entrySetupTs:e.setup?.setupTs||null,entrySetupId:e.setup?.setupId||null,
  entrySetupKey:e.setup?.setupKey||selected.setupKey,
  maxAdversePriceMoveUsd:500,maxRiskBudgetUsd:10,
  riskAt500PriceMoveUsd:NOTIONAL*500/price,
  entryPolicy:b.route.entryPolicy,exitPolicy:b.route.exitPolicy,
  entryInvalidation:inv,entryInvalidationProof:lv||null,
  metrics:{mfeUsd:0,maeUsd:0,currentSignedUsd:0,
    favorableUsd:0,adverseUsd:0,currentPnlUsd:-2*fee}};
 b.position=p;b.entries++;b.entriesByDirection[p.direction]++;
 b.feesUsd=round(b.feesUsd+fee);
 return {type:'ENTRY',ts,route:b.route.id,direction:p.direction,
  entryPrice:price,entrySetupKey:p.entrySetupKey,
  lobeExtremum:selected.evidence||null,entryInvalidation:inv,
  precedingExit:b.lastExit?{...b.lastExit}:null,
  brokerOrdersEnabled:false};
}
function takePartial(b,price,ts){
 const p=b.position;if(!p||p.tp1Taken)return null;
 const frac=.25,notional=p.notionalUsd*frac;
 const fee=notional*TAKER*(price/p.entryPrice);
 p.realizedGrossUsd+=pnl(p.direction,p.entryPrice,price,notional);
 p.partialFeesUsd+=fee;p.notionalUsd-=notional;p.tp1Taken=true;
 p.marginUsd*=1-frac;
 p.grossRealizedPnlUsd=p.realizedGrossUsd;
 p.tradingFeesPaidUsd+=fee;
 p.realizedPnlUsd=p.realizedGrossUsd-p.tradingFeesPaidUsd;
 p.tpEvents.push({ts,price,fraction:frac,feeUsd:round(fee)});
 b.feesUsd=round(b.feesUsd+fee);
 b.partialExits++;
 return {type:'TP1',ts,route:b.route.id,direction:p.direction,price,feeUsd:round(fee)};
}
function close(b,ts,price,reason){
 const p=b.position;
 const gross=p.realizedGrossUsd+pnl(p.direction,p.entryPrice,price,p.notionalUsd);
 const exitFee=p.notionalUsd*TAKER*(price/p.entryPrice);
 const fees=p.entryFeeUsd+p.partialFeesUsd+exitFee;
 const net=round(gross-fees);
 const row={type:'EXIT',ts,route:b.route.id,
  direction:p.direction,entryAt:p.entryAt,exitAt:ts,
  entryPrice:p.entryPrice,exitPrice:price,entryPolicy:p.entryPolicy,
  exitPolicy:p.exitPolicy,entrySetupKey:p.entrySetupKey,
  entryInvalidation:p.entryInvalidation,
  mfePriceUsd:round(p.metrics.mfeUsd),maePriceUsd:round(p.metrics.maeUsd),
  realizedPriceMove:round((price-p.entryPrice)*side(p.direction)),
  givebackPriceUsd:round(p.metrics.mfeUsd-(price-p.entryPrice)*side(p.direction)),
  grossPnlUsd:round(gross),feesUsd:round(fees),netPnlUsd:net,
  tpEvents:p.tpEvents,reason};
 b.completed++;b.realizedNetUsd=round(b.realizedNetUsd+net);
 b.feesUsd=round(b.feesUsd+exitFee);
 b.exitsByReason[reason]=(b.exitsByReason[reason]||0)+1;
 b.history.push(row);if(b.history.length>125)b.history=b.history.slice(-125);
 b.position=null;
 return row;
}
function advance(s,frame,dependencies={},quality='DATA_OK'){
 const ts=Number(frame?.market?.timestamp),price=Number(frame?.market?.price);
 if(!Number.isFinite(ts)||!Number.isFinite(price)||price<=0||
    ts<=s.lastObservationAt)
  return {state:s,events:[],reason:'STALE_DUPLICATE_FRAME'};
 if(s.version!==VERSION||s.brokerOrdersEnabled!==false||s.decisionImpact!==false)
  throw Error('SHADOW_AUTHORITY_REFUSED');
 const {engine,listening,anchor}=dependencies;
 if(!engine?.evaluate||!listening?.decorate)
  throw Error('SHADOW_EXACT_EVALUATOR_REQUIRED');
 s.lastObservationAt=ts;s.observations++;
 const events=[];
 for(const branch of Object.values(s.branches)){
  const p=branch.position;
  if(p){
   const signed=(price-p.entryPrice)*side(p.direction);
   p.metrics.mfeUsd=Math.max(p.metrics.mfeUsd,signed);
   p.metrics.maeUsd=Math.max(p.metrics.maeUsd,-signed);
   p.metrics.currentSignedUsd=signed;
   p.metrics.favorableUsd=Math.max(0,signed);
   p.metrics.adverseUsd=Math.max(0,-signed);
   p.lastPrice=price;
   p.metrics.currentPnlUsd=pnl(p.direction,p.entryPrice,price,p.notionalUsd)-
    p.entryFeeUsd-p.partialFeesUsd-p.notionalUsd*TAKER;
  }
  const e=engine.evaluate(frame,p,branch.prevEval);
  const attention=listening.decorate({v493Evaluation:e,frame,
   position:p,previousAttention:branch.previousAttention||null,
   lastExitAt:branch.lastAction?.type==='EXIT'?branch.lastAction.ts:null});
  branch.prevEval=e;
  branch.previousAttention=attention.temporalAttention;
  const from=e.action?.type||'NO_TRADE';
  const assessment=p?exits.evaluate({frame,evaluation:e,position:p,
   attention:branch.previousAttention,policy:branch.route.exitPolicy}):null;
  branch.lastDecision={ts,action:from,stage:branch.previousAttention?.stage||null,
   supervisor:assessment?.action||null,proof:assessment?.proof||null,
   entryPolicy:branch.route.entryPolicy,exitPolicy:branch.route.exitPolicy};
  if(p){
   const outcome=assessment.action;
   if(outcome.startsWith('EXIT_')){
    const row=close(branch,ts,price,assessment.reason||outcome);
    branch.lastExit={ts,reason:row.reason,direction:row.direction,
     entryAt:row.entryAt,netPnlUsd:row.netPnlUsd};
    branch.lastAction={type:'EXIT',ts,reason:row.reason,
      direction:row.direction,entrySetupKey:row.entrySetupKey};
    event(s,events,row);
   }else if(outcome==='TAKE_PROFIT_PARTIAL'&&!p.tp1Taken){
    const te=takePartial(branch,price,ts);
    if(te)event(s,events,te);
   }
  }else if(ts>=s.warmupUntil&&quality==='DATA_OK'){
   const candidate=entries.evaluate({evaluation:e,frame,policy:branch.route.entryPolicy});
   if(candidate.sourceAction&&candidate.sourceAction.startsWith('ENTER_')){
    if(candidate.admitted){
     const ev=open(s,branch,e,candidate,frame,anchor);
     branch.lastAction={type:'ENTRY',ts,direction:ev.direction,entrySetupKey:ev.entrySetupKey};
     event(s,events,ev);
    }else{
     branch.blockedEntries++;branch.blockedByDirection[candidate.direction]++;
     if(!branch.missedAdmissionKeys.includes(candidate.setupKey)){
      branch.missedAdmissionKeys.push(candidate.setupKey);
      branch.missedAdmissionKeys=branch.missedAdmissionKeys.slice(-70);
      event(s,events,{type:'FILTERED_ENTRY',ts,route:branch.route.id,
       direction:candidate.direction,setupKey:candidate.setupKey,
       reason:candidate.reason,evidence:candidate.evidence});
     }
    }
   }
  }
 }
 // Direct causal probe: a new V493-approved entry exists ONLY in the branch
 // previously freed by its EXIT while the original branch is still occupied.
 // This is stronger evidence than a generic divergence of open positions.
 for(const entryPolicy of entries.POLICIES){
  const original=s.branches[entryPolicy+'__FROZEN_V493'];
  const review=s.branches[entryPolicy+'__CONTINUATION_SUPERVISOR'];
  const ev=events.find(x=>x.type==='ENTRY'&&x.route===review.route.id);
  if(ev&&original.position&&review.lastExit&&
    original.position.entryAt<review.lastExit.ts&&
    ev.ts>review.lastExit.ts){
   const impact={type:'EXIT_ENABLED_REENTRY',ts,
    entryPolicy,freedRoute:review.route.id,
    priorExit:review.lastExit,
    newDirection:ev.direction,newEntryPrice:ev.entryPrice,
    originalBlockedBy:{direction:original.position.direction,
     entryAt:original.position.entryAt,entryPrice:original.position.entryPrice},
    interpretation:'The reviewed EXIT changed FLAT/occupied state before this independent original V493 entry'};
   s.influenceEvents.push(impact);
   s.influenceEvents=s.influenceEvents.slice(-120);
   event(s,events,impact);
  }
 }
 // Factorial comparisons: for each fixed entry logic, vary EXIT; for each
 // fixed exit logic, vary ENTRY. A change here is not attributed to a single
 // newly detected signal, but to its entire independent branch history.
 for(const entry of entries.POLICIES){
  const a=s.branches[entry+'__FROZEN_V493'];
  const b=s.branches[entry+'__CONTINUATION_SUPERVISOR'];
  if(!a||!b)continue;
  const sig=z=>z.position?z.position.direction+':'+z.position.entryAt:'FLAT';
  const diverged=sig(a)!==sig(b);
  const key=entry+':'+sig(a)+'|'+sig(b);
  const was=s.lastComparison?.[entry]||null;
  if(diverged&&key!==was){
   const cause={type:'EXIT_INFLUENCES_ENTRY_EXPOSURE',ts,
    entryPolicy:entry,original:sig(a),review:sig(b),
    originalLast:a.lastAction,reviewLast:b.lastAction,
    originalLastExit:a.lastExit,reviewLastExit:b.lastExit,
    reason:'Distinct exit histories change which subsequent entries are admissible'};
   s.influenceEvents.push(cause);
   s.influenceEvents=s.influenceEvents.slice(-120);
   event(s,events,cause);
  }
  if(!s.lastComparison)s.lastComparison={};
  s.lastComparison[entry]=diverged?key:null;
 }
 for(const exit of exits.POLICIES){
  const a=s.branches['EXACT_V493__'+exit],b=s.branches['MCB15_INFLECTION__'+exit];
  if(!a||!b)continue;
  const sig=z=>z.position?z.position.direction+':'+z.position.entryAt:'FLAT';
  const k='entry:'+exit,old=s.lastComparison?.[k]||null;
  const key=sig(a)+'|'+sig(b);
  if(sig(a)!==sig(b)&&key!==old){
   const cause={type:'ENTRY_FILTER_INFLUENCES_EXPOSURE',ts,exitPolicy:exit,
    original:sig(a),filtered:sig(b)};
   s.influenceEvents.push(cause);
   s.influenceEvents=s.influenceEvents.slice(-120);
   event(s,events,cause);
  }
  s.lastComparison[k]=sig(a)!==sig(b)?key:null;
 }
 return {state:s,events,reason:'EVALUATED'};
}
// Valuation is descriptive only. Treat realized TP1 proceeds as part of the
// still-open campaign, then mark remaining notional at the same observed BTC
// price and reserve the estimated fee for closing that remaining notional.
// No change to risk, orders, entries, exits or the PAPER ledgers.
function markedPosition(p){
 if(!p)return null;
 const price=Number(p.lastPrice),entry=Number(p.entryPrice),
   remaining=Number(p.notionalUsd);
 if(![price,entry,remaining].every(Number.isFinite)||
   price<=0||entry<=0||remaining<=0)return null;
 const partialGross=Number(p.realizedGrossUsd||0),
   entryFee=Number(p.entryFeeUsd||0),
   partialFees=Number(p.partialFeesUsd||0);
 if(![partialGross,entryFee,partialFees].every(Number.isFinite))return null;
 const remainingGross=pnl(p.direction,entry,price,remaining),
   estimatedExitFee=remaining*TAKER*(price/entry);
 return {
  priceUsd:round(price),
  partialGrossUsd:round(partialGross),
  remainingGrossUsd:round(remainingGross),
  entryFeeUsd:round(entryFee),
  partialFeesUsd:round(partialFees),
  estimatedRemainingExitFeeUsd:round(estimatedExitFee),
  positionNetIfClosedUsd:round(partialGross+remainingGross-
    entryFee-partialFees-estimatedExitFee),
  methodology:'REALIZED_PARTIAL_GROSS_PLUS_REMAINING_MARK_MINUS_ENTRY_PARTIAL_AND_ESTIMATED_EXIT_TAKER_FEES',
  assumption:'FUTURE_EXIT_AT_LAST_OBSERVED_BTC_PRICE_NO_SLIPPAGE_NO_FUNDING'
 };
}
function summary(s){
 const branches={};
 for(const [id,b] of Object.entries(s.branches)){
  const p=b.position,mark=markedPosition(p),
   cumulativeMarkedNetUsd=p?
    mark?round(b.realizedNetUsd+mark.positionNetIfClosedUsd):null:
    round(b.realizedNetUsd);
  branches[id]={entryPolicy:b.route.entryPolicy,
   exitPolicy:b.route.exitPolicy,completed:b.completed,
   netRealizedUsd:b.realizedNetUsd,feesUsd:b.feesUsd,
   portfolioMarkedNetUsd:cumulativeMarkedNetUsd,
   markedValuationStatus:p?(mark?'OPEN_WITH_ESTIMATED_EXIT_FEE':
     'OPEN_PRICE_UNAVAILABLE'):(b.entries>0?'FLAT_CLOSED_PORTFOLIO':'NO_EXPOSURE_YET'),
   entries:b.entries,blockedEntries:b.blockedEntries,
   entriesByDirection:b.entriesByDirection,blockedByDirection:b.blockedByDirection,
   netByDirection:{long:round(b.history.filter(x=>x.direction==='long')
    .reduce((s,x)=>s+x.netPnlUsd,0)),
    short:round(b.history.filter(x=>x.direction==='short')
     .reduce((s,x)=>s+x.netPnlUsd,0))},
   partialExits:b.partialExits,exitsByReason:b.exitsByReason,
   position:p?{direction:p.direction,entryAt:p.entryAt,
    entryPrice:p.entryPrice,entryInvalidation:p.entryInvalidation,
    remainingNotionalUsd:p.notionalUsd,tp1Taken:!!p.tp1Taken,
    mfePriceUsd:p.metrics.mfeUsd,maePriceUsd:p.metrics.maeUsd,
    unrealizedNetUsd:round(pnl(p.direction,p.entryPrice,p.entryPrice+
     p.metrics.currentSignedUsd*side(p.direction),p.notionalUsd)-
     p.entryFeeUsd-p.partialFeesUsd-p.notionalUsd*TAKER),
    markedValuation:mark}:null,
   recentTrades:b.history.slice(-6)};
 }
 return {version:s.version,mode:s.mode,
  decisionImpact:s.decisionImpact,brokerOrdersEnabled:s.brokerOrdersEnabled,
  startedAt:s.startedAt,warmupUntil:s.warmupUntil,
  lastObservationAt:s.lastObservationAt,observations:s.observations,
  branches,influenceCount:s.influenceEvents.length,
  recentInfluence:s.influenceEvents.slice(-10),
  recentEvents:s.events.slice(-12),
  evaluationNote:'Four independent parallel ledgers; net not equivalent to a shared-capital trading result'};
}
module.exports={VERSION,ROUTES,initial,migrate,advance,summary,markedPosition};
