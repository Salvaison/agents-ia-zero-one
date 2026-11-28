'use strict';
// Active PAPER account, separate from the shadow accounts and predecessor.
const A=require('./account'),D=require('./decision'),M=require('./market');
const VERSION='v5.5.4-paper-ledger-v1',POLICY=D.VERSION;
const clone=x=>JSON.parse(JSON.stringify(x)),finite=Number.isFinite;
const round=x=>Math.round(x*10000)/10000;
function verify(s){
 if(s?.version!==VERSION||s.engine!=='V554'||s.policyVersion!==POLICY||s.mode!=='PAPER_ONLY'||
  s.brokerOrdersEnabled!==false||s.decisionImpact!==false||s.notionalUsd!==A.NOTIONAL||
  !finite(s.equityUsd)||!finite(s.lastObservationAt)||!Array.isArray(s.history)||s.history.length!==s.completed||
  !s.usedInitiatives||s.migratedFrom?.engine!=='V553'||s.migratedFrom?.oldProcessStopped!==true||
  typeof s.migratedFrom?.sourceSha256!=='string'||!finite(s.policyStartedAt)||
  s.marketMemory?.version!==M.VERSION||!Number.isInteger(s.newPolicyClosed)||s.completed!==s.pre554Completed+s.newPolicyClosed)
   throw Error('V554_PAPER_LEDGER_UNTRUSTED_OR_MIGRATION_REQUIRED');
 if(s.position&&(!['long','short'].includes(s.position.direction)||!finite(s.position.entryPrice)||
    !finite(s.position.entryAt)||s.position.notionalUsd!==A.NOTIONAL||!finite(s.position.entryFeeUsd)))
   throw Error('V554_INVALID_PAPER_POSITION');
 return s;
}
function fromV553(old,market,manifest){
 if(old?.engine!=='V553'||old.version!=='v5.5.3-paper-ledger-v1'||old.policyVersion!=='v5.5.3-live-causal-price-market-paper-v1'||
  old.mode!=='PAPER_ONLY'||old.brokerOrdersEnabled!==false||old.history.length!==old.completed||old.notionalUsd!==A.NOTIONAL||
  !finite(old.equityUsd)||old.equityUsd<=0||old.capitalUsd!==A.INITIAL)
   throw Error('V554_BAD_V553_SOURCE');
 if(!manifest?.oldProcessStopped||manifest.sourceHash!==manifest.frozenSourceHash||!finite(manifest.handoffAt)||manifest.handoffAt<old.lastObservationAt||
  market?.version!==M.VERSION||!market.latest||market.latest.asOf>manifest.handoffAt||
  manifest.handoffAt-market.latest.sourceAt>95000||market.latest.brokerOrdersEnabled!==false)
   throw Error('V554_BAD_FROZEN_MANIFEST_OR_MARKET');
 const s={...A.initial(old.startedAt),version:VERSION,mode:'PAPER_ONLY',policyStartedAt:manifest.handoffAt,
  marketMemory:clone(market),lastPriceTickAt:0,pre554Completed:old.completed,newPolicyClosed:0,newPolicyNetUsd:0,
  retiredPredecessor:'V553_STOPPED_AND_ARCHIVED',migratedFrom:{engine:'V553',ledgerVersion:old.version,
   policyVersion:old.policyVersion,at:manifest.handoffAt,oldCompleted:old.completed,oldEquityUsd:old.equityUsd,
   oldFeesUsd:old.feesUsd,oldRealizedUsd:old.realizedUsd,oldProcessStopped:true,sourceSha256:manifest.sourceHash,
   carriedOpenPosition:!!old.position,carriedEntryAt:old.position?.entryAt??null,archive:manifest.archive??null},
  ledgerLineage:{prior:clone(old.migratedFrom),pre553Completed:old.pre553Completed,new553Closed:old.newPolicyClosed,new553NetUsd:old.newPolicyNetUsd},
  marketObservations:0};
 for(const k of ['completed','wins','losses','realizedUsd','feesUsd','equityUsd','lastObservationAt','lastExit','lastAction','capitalUsd','notionalUsd'])
  s[k]=old[k]===undefined?null:clone(old[k]);
 s.history=old.history.map(t=>({...clone(t),originalHistoricalPolicy:!!t.historicalPolicy,historicalPolicy:true,historicalFromV553:true}));
 if(old.position){
  const p=clone(old.position),d=p.direction==='long'?'UP':'DN',h=market.latest.hypotheses[d];
  p.inheritedFrom='V553';p.originalTradeNo=old.completed+1;p.entryPolicyVersion=p.entryPolicyVersion||old.policyVersion;
  p.initiativeId=h?.initiativeId||('INHERITED:'+p.entryAt);
  p.initiativeBinding={at:manifest.handoffAt,kind:'HANDOFF_CURRENT_MARKET_CONTEXT_NOT_ORIGINAL_ENTRY',previousCampaignId:p.campaignId||null};
  p.defense=null;p.lastReviewSource=null;p.reviewCrossAt=null;p.brokenCount=0;p.adverseCrossCount=0;
  s.position=p;
  s.usedInitiatives[p.initiativeId]={at:manifest.handoffAt,proofId:h?.evidence?.proof?.id||null,price:p.entryPrice,peakPrice:p.entryPrice+(p.direction==='long'?1:-1)*p.mfePriceUsd};
 }
 s.decision=D.action(s.position?'HOLD':'WAIT','V554_HANDOFF_AWAIT_FRESH_MARKET',{asOf:manifest.handoffAt});
 return verify(s);
}
function step(s,m,opts){
 const r=A.stepCore(s,m,{...opts,variant:'TRAJECTORY',early:true},verify);
 if(r.trade){s.newPolicyClosed++;s.newPolicyNetUsd=round(s.newPolicyNetUsd+r.trade.netPnlUsd);}
 return r;
}
function summary(s){
 const m=s.marketMemory.latest,h=m?.hypotheses||{};
 const states=Object.values(h);
 const status=m?.suspension?'CONTESTED_TRAJECTORY':states.some(x=>x.eligible)?'QUALIFIED_TRAJECTORY':states.some(x=>x.state==='UNRECOGNIZED')?'UNRECOGNIZED':'OBSERVING';
 const parent=m?.parentE15||null;
 const p=s.position?{...s.position}:null;if(p)delete p.entryContext;
 return {version:VERSION,policyVersion:POLICY,engine:'V554',mode:'PAPER_ONLY',brokerOrdersEnabled:false,decisionImpact:false,
  startedAt:s.startedAt,policyStartedAt:s.policyStartedAt,asOf:s.lastObservationAt,marketAsOf:m?.asOf??null,marketSourceAt:m?.sourceAt??null,
  completed:s.completed,wins:s.wins,losses:s.losses,equityUsd:s.equityUsd,realizedUsd:s.realizedUsd,feesUsd:s.feesUsd,
  newPolicyClosed:s.newPolicyClosed,newPolicyNetUsd:s.newPolicyNetUsd,pre554Completed:s.pre554Completed,migratedFrom:s.migratedFrom,
  position:p,latestDecision:s.decision,lastAction:s.lastAction,parentE15:parent,
  market:m?{...m,status,reason:m.suspension?'FROZEN_RANGE_NOT_RECONQUERED':'TRAJECTORY_QUALIFICATION',
    admissionAllowed:states.some(x=>x.eligible)}:null,
  opportunity:s.decision?.hypothesis||null,threat:null,causalTrace:[],
  latestReadings:m?.geometry||null,marketObservations:s.marketObservations,
  tradeHead:s.history.filter(t=>!t.historicalPolicy).slice(-10),
  riskContract:'500_BTC_USD_ADVERSE_PRICE_MOVE_NO_GAIN_FLOOR',executionContract:'PAPER_ONLY_NO_FUNDED_BROKER'};
}
module.exports={VERSION,POLICY,verify,fromV553,step,summary};
