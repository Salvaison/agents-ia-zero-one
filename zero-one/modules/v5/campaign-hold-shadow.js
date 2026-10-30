'use strict';
// BOONO Systems — independent PAPER counterfactual ledger (no broker, no writes
// to V543). A shadow fork follows actual V543 entries and may remain open after
// a live gain-floor. Overlapping subsequent actual entries are explicitly
// rejected in that fork, never counted as fictional profits.
const invalidation=require('./structural-invalidation-observer');
const structuralTransfer=require('./structural-transfer-observer');
const VERSION='v543-campaign-hold-shadow-v0.3';
const PRIOR_VERSION='v543-campaign-hold-shadow-v0.2';
const LEGACY_VERSION='v543-campaign-hold-shadow-v0.1';
const NOTIONAL=1500,TAKER=.0005,RISK_USD=500;
const POLICIES=['STRUCTURE_ONLY','EARLY_INVALIDATION','TERRITORY_FLOOR_120',
 'BASELINE_PLUS_FAST_INVALIDATION','STRUCTURAL_LEVEL_AND_TRANSFER'];
const n=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
const r=x=>Math.round(x*10000)/10000;
const side=x=>x==='long'?1:x==='short'?-1:0;
const clone=x=>JSON.parse(JSON.stringify(x));
function blankVariant(policy){
 return {policy,position:null,completed:0,realizedNetUsd:0,feesUsd:0,
  blockedReentries:0,blockedTradeNos:[],records:[],
  previousAttention:null,previousOffensiveMaturity:null};
}
function initial(startedAt,bootstrapPosition=null){
 return {version:VERSION,mode:'READ_ONLY_SHADOW',brokerOrdersEnabled:false,
  decisionImpact:false,startedAt,lastObservationAt:0,
  bootstrapIgnoredEntryAt:bootstrapPosition?.entryAt||null,
  lastAcceptedPaperEntryAt:bootstrapPosition?.entryAt||null,
  baselines:{},
  variants:Object.fromEntries(POLICIES.map(policy=>[policy,blankVariant(policy)])),
  events:[],lastError:null};
}
function migrate(s){
 if(!s||!([VERSION,PRIOR_VERSION,LEGACY_VERSION].includes(s.version))||
   s.brokerOrdersEnabled!==false)throw Error('SHADOW_MIGRATION_REFUSED');
 if(s.version===VERSION)return s;
 if(s.version===LEGACY_VERSION&&!s.variants.BASELINE_PLUS_FAST_INVALIDATION)
  s.variants.BASELINE_PLUS_FAST_INVALIDATION=blankVariant('BASELINE_PLUS_FAST_INVALIDATION');
 if(!s.variants.STRUCTURAL_LEVEL_AND_TRANSFER)
  s.variants.STRUCTURAL_LEVEL_AND_TRANSFER=blankVariant('STRUCTURAL_LEVEL_AND_TRANSFER');
 s.version=VERSION;
 s.migrationNote='New STRUCTURAL_LEVEL_AND_TRANSFER fork begins on NEXT true PAPER entry; no retroactive position; older forks retained';
 return s;
}
function pnl(p,price){
 const gross=(price-p.entryPrice)*side(p.direction)*NOTIONAL/p.entryPrice;
 const exitFee=NOTIONAL*TAKER*(price/p.entryPrice);
 return {gross:r(gross),fee:r((p.entryFeeUsd??NOTIONAL*TAKER)+exitFee),
  net:r(gross-(p.entryFeeUsd??NOTIONAL*TAKER)-exitFee)};
}
function emit(state,events,e){
 events.push(e);state.events.push(e);
 if(state.events.length>90)state.events=state.events.slice(-90);
}
function begin(v,source,tradeNo,ts,state,events){
 const p=clone(source);
 p.originTradeNo=tradeNo;
 p.entryFeeUsd=n(p.entryFeeUsd)??NOTIONAL*TAKER;
 p.mfePriceUsd=n(p.mfePriceUsd)??0;
 p.maePriceUsd=n(p.maePriceUsd)??0;
 p.gainFloorUsd=0;p.dynamicStopPrice=null;
 v.position=p;
 v.feesUsd=r(v.feesUsd+p.entryFeeUsd);
 v.previousAttention=null;v.previousOffensiveMaturity=null;
 emit(state,events,{ts,policy:v.policy,type:'SHADOW_ENTRY',originTradeNo:tradeNo,
  entryAt:p.entryAt,entryPrice:p.entryPrice,direction:p.direction,
  entryInvalidation:p.invalidationPrice});
}
function finish(v,price,ts,reason,state,events,protection={}){
 const p=v.position,financial=pnl(p,price);
 const move=r(side(p.direction)*(price-p.entryPrice));
 const record={originTradeNo:p.originTradeNo,originEntryAt:p.entryAt,
  direction:p.direction,entryAt:p.entryAt,exitAt:ts,
  entryPrice:p.entryPrice,exitPrice:price,
  entryInvalidation:p.invalidationPrice,
  baselineTradeNo:p.originTradeNo,
  baselineNetUsd:state.baselines[String(p.originTradeNo)]?.netPnlUsd??null,
  entryCampaignId:p.campaignId||null,
  mfePriceUsd:r(p.mfePriceUsd),maePriceUsd:r(p.maePriceUsd),
  finalMovementUsd:move,givebackUsd:r(p.mfePriceUsd-move),
  grossPnlUsd:financial.gross,feesUsd:financial.fee,netPnlUsd:financial.net,
  exitReason:reason,protection};
 v.completed++;v.realizedNetUsd=r(v.realizedNetUsd+financial.net);
 v.feesUsd=r(v.feesUsd+(financial.fee-p.entryFeeUsd));
 v.records.push(record);if(v.records.length>90)v.records=v.records.slice(-90);
 v.position=null;
 emit(state,events,{ts,policy:v.policy,type:'SHADOW_EXIT',...record});
 return record;
}
function reconcileBaseline(state,paper){
 // The actual ledger is the only source of actual exits; no guessed fills.
 for(const x of paper.history||[]){
  const no=n(x.tradeNo);if(no===null)continue;
  const key=String(no);if(no<=(paper.completed||0)&&
     (state.baselines[key]===undefined||state.baselines[key].exitAt!==x.exitAt))
   state.baselines[key]={tradeNo:no,entryAt:x.entryAt,exitAt:x.exitAt,
    entryPrice:x.entryPrice,exitPrice:x.exitPrice,exitReason:x.exitReason,
    netPnlUsd:x.netPnlUsd,feesUsd:x.feesUsd};
 }
 const valid=new Set(Object.keys(state.baselines).slice(-110));
 for(const key of Object.keys(state.baselines))if(!valid.has(key))
  delete state.baselines[key];
 for(const v of Object.values(state.variants))
  for(const x of v.records)if(x.baselineNetUsd===null&&
    state.baselines[String(x.originTradeNo)])
   x.baselineNetUsd=state.baselines[String(x.originTradeNo)].netPnlUsd;
}
function step(state,{paperState,now,price,input={},tickFresh=true,
  decide=()=>null,territoryStop=()=>null}={}){
 if(!state||state.version!==VERSION||state.brokerOrdersEnabled!==false)
  throw Error('SHADOW_VERSION_OR_BROKER_REJECTED');
 const ts=n(now),px=n(price);
 if(ts===null||px===null||px<=0||ts<=state.lastObservationAt)
  return {state,events:[],status:'DUPLICATE_OR_BAD_TICK'};
 state.lastObservationAt=ts;
 const events=[];
 const paper=paperState||{};
 reconcileBaseline(state,paper);
 const live=paper.position;
 if(live&&n(live.entryAt)!==null&&
   live.entryAt>state.startedAt&&live.entryAt<=ts&&
   live.entryAt!==state.lastAcceptedPaperEntryAt){
  state.lastAcceptedPaperEntryAt=live.entryAt;
  const no=(n(paper.completed)||0)+1;
  for(const v of Object.values(state.variants)){
   if(v.position){
    v.blockedReentries++;v.blockedTradeNos.push(no);
    if(v.blockedTradeNos.length>80)v.blockedTradeNos=v.blockedTradeNos.slice(-80);
    emit(state,events,{ts,policy:v.policy,type:'SKIPPED_ACTUAL_REENTRY',
     attemptedTradeNo:no,activeOriginTradeNo:v.position.originTradeNo});
   }else begin(v,live,no,ts,state,events);
  }
 }
 for(const v of Object.values(state.variants)){
  const p=v.position;if(!p)continue;
  const d=side(p.direction),move=d*(px-p.entryPrice);
  p.lastPrice=px;
  p.mfePriceUsd=Math.max(p.mfePriceUsd,move);
  p.maePriceUsd=Math.max(p.maePriceUsd,-move);
  if(!tickFresh)continue;
  if(move<=-RISK_USD){
   finish(v,px,ts,'SHADOW_HARD_RISK_500',state,events);continue;
  }
  const decision=decide(p,v,input)||{};
  v.lastDecision={asOf:ts,action:decision.action||'UNKNOWN',reason:decision.reason||null,
   attention:decision.readings?.attention?.stage||null};
  v.previousAttention=decision.readings?.attention??v.previousAttention;
  v.previousOffensiveMaturity=decision.readings?.offensiveMaturityMemory??v.previousOffensiveMaturity;
  // Specific joint experiment: never convert an isolated V541 EXIT into
  // this fork's exit without BOTH causal level loss and adversarial transfer.
  if(v.policy==='STRUCTURAL_LEVEL_AND_TRANSFER'){
   const joint=structuralTransfer.inspect({position:p,now:ts,price:px,
    bars3:input.bars3,conversion:decision.readings?.conversion||{},
    positionReview:decision.readings?.structural54?.positionReview||null,
    tickFresh});
   v.lastInvalidation=joint;
   v.lastDecision.alternativeV541Exit=decision.action==='EXIT_'+p.direction.toUpperCase();
   if(joint.exitRequested)
    finish(v,px,ts,'SHADOW_'+joint.reason,state,events,joint);
   continue;
  }
  let inv=null;
  if(v.policy==='EARLY_INVALIDATION'||v.policy==='TERRITORY_FLOOR_120'||
     v.policy==='BASELINE_PLUS_FAST_INVALIDATION'){
   inv=invalidation.inspect({position:p,now:ts,price:px,bars3:input.bars3,
    conversion:decision.readings?.conversion||{},tickFresh});
   v.lastInvalidation={status:inv.status,reason:inv.reason,
    breachUsd:inv.breachUsd,bufferUsd:inv.bufferUsd,
    lastConfirmed3mAt:inv.lastConfirmed3mAt,exitRequested:inv.exitRequested};
   if(inv.exitRequested){
    finish(v,px,ts,'SHADOW_'+inv.reason,state,events,inv);continue;
   }
  }
  if(v.policy==='TERRITORY_FLOOR_120'){
   if(p.mfePriceUsd>=120)p.gainFloorUsd=Math.max(p.gainFloorUsd,90);
   // Preserve 120/90 but replace 220/180 by proven post-entry territory.
   if(p.mfePriceUsd>=220){
    const structural=territoryStop(p,v,input)||null;
    const level=n(structural?.price),known=n(structural?.confirmedAvailableAt);
    if(level!==null&&known!==null&&known>p.entryAt&&known<=ts&&
      d*(px-level)>=0&&d*(level-p.entryPrice)>90){
     p.gainFloorUsd=Math.max(p.gainFloorUsd,d*(level-p.entryPrice));
     p.dynamicStopPrice=level;
    }
   }
   if(p.gainFloorUsd>0&&move<=p.gainFloorUsd){
    finish(v,px,ts,'SHADOW_TERRITORY_FLOOR',state,events,
     {floorUsd:r(p.gainFloorUsd),lastProvenStopPrice:p.dynamicStopPrice});continue;
   }
  }
  if(v.policy==='BASELINE_PLUS_FAST_INVALIDATION'){
   if(p.mfePriceUsd>=220)p.gainFloorUsd=180;
   else if(p.mfePriceUsd>=120)p.gainFloorUsd=Math.max(90,p.gainFloorUsd||0);
   if(p.gainFloorUsd>0&&move<=p.gainFloorUsd){
    finish(v,px,ts,'SHADOW_BASELINE_GAIN_FLOOR',state,events,
     {floorUsd:r(p.gainFloorUsd)});continue;
   }
  }
  if(decision.action==='EXIT_'+p.direction.toUpperCase()){
   finish(v,px,ts,'SHADOW_'+(decision.reason||'STRUCTURAL_EXIT'),
    state,events,{structure:decision.readings?.structural54?.positionReview||null});continue;
  }
 }
 return {state,events,status:'OBSERVED'};
}
function summary(state){
 const variants={};
 for(const [k,v] of Object.entries(state.variants)){
  const comparable=v.records.filter(x=>x.baselineNetUsd!==null);
  variants[k]={open:v.position?{tradeNo:v.position.originTradeNo,
     entryPrice:v.position.entryPrice,direction:v.position.direction,
     entryAt:v.position.entryAt,mfePriceUsd:v.position.mfePriceUsd,
     maePriceUsd:v.position.maePriceUsd,gainFloorUsd:v.position.gainFloorUsd,
     lastPrice:v.position.lastPrice,
     provisionalNetIfClosedUsd:pnl(v.position,v.position.lastPrice).net,
     lastInvalidation:v.lastInvalidation||null}:null,
    completed:v.completed,netUsd:v.realizedNetUsd,feesUsd:v.feesUsd,
    blockedReentries:v.blockedReentries,
    pairedTrades:comparable.length,
    pairedNetDeltaUsd:r(comparable.reduce((s,x)=>s+x.netPnlUsd-x.baselineNetUsd,0)),
    recent:v.records.slice(-7)};
 }
 return {version:VERSION,startedAt:state.startedAt,
  lastObservationAt:state.lastObservationAt,brokerOrdersEnabled:false,
  decisionImpact:false,variants,lastEvents:state.events.slice(-6)};
}
module.exports={VERSION,POLICIES,initial,migrate,pnl,step,summary};
