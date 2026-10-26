'use strict';
// BOONO V5.2 PAPER only. One independent accounting ledger; zero funded orders.
const VERSION='v5.4.1-paper-ledger-v0.8';
const V54_VERSION='v5.4-paper-ledger-v0.7';
const V533_VERSION='v5.3.3-paper-ledger-v0.6';
const V532_VERSION='v5.3.2-paper-ledger-v0.5';
const V531_VERSION='v5.3.1-paper-ledger-v0.4';
const V53_VERSION='v5.3-paper-ledger-v0.3';
const V522_VERSION='v5.2.2-paper-ledger-v0.2';
const LEGACY_VERSION='v5.2-paper-ledger-v0.1';
const PREVIOUS_POLICY='v5.2-structural-decision-paper-v0.1';
const NOTIONAL=1500,INIT=1000,TAKER=.0005,RISK_PRICE=500;
const n=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const round=v=>Math.round(v*10000)/10000;
const sign=d=>d==='long'?1:-1;
function initial(now=Date.now()){return {version:VERSION,mode:'PAPER_ONLY',brokerOrdersEnabled:false,
 startedAt:now,policyActivatedAt:now,lastObservationAt:0,notionalUsd:NOTIONAL,capitalUsd:INIT,equityUsd:INIT,
 realizedUsd:0,feesUsd:0,completed:0,wins:0,losses:0,position:null,
 history:[],usedKeys:[],lastAction:null,decision:null,lastReason:null,decisionImpactOnV4:false};}
function migrate(state,now=Date.now()){
 if(!state)return initial(now);
 if(state.version===VERSION)return state;
 if(![LEGACY_VERSION,V522_VERSION,V53_VERSION,V531_VERSION,V532_VERSION,V533_VERSION,V54_VERSION].includes(state.version)||
   state.brokerOrdersEnabled!==false)
   throw Error('V541_LEDGER_MIGRATION_REFUSED: '+String(state.version||'NO_VERSION'));
 // Preserve every trade, entry key, fee, equity and ongoing position.
 const copy={...state,version:VERSION,policyActivatedAt:now,
  history:(state.history||[]).map(t=>({...t,
    entryPolicyVersion:t.entryPolicyVersion||PREVIOUS_POLICY})),
  position:state.position?{...state.position,
    entryPolicyVersion:state.position.entryPolicyVersion||PREVIOUS_POLICY}:null};
 return copy;
}
function pnl(p,price){const gross=(price-p.entryPrice)*sign(p.direction)*NOTIONAL/p.entryPrice;
 const exitFee=NOTIONAL*TAKER*(price/p.entryPrice);
 return {gross:round(gross),net:round(gross-p.entryFeeUsd-exitFee),exitFee:round(exitFee)};}
function exit(s,ts,price,reason){
 const p=s.position;if(!p)return null;
 const q=pnl(p,price);
 const row={tradeNo:s.completed+1,
  engine:String(p.entryPolicyVersion||'').includes('v5.4.1')?'V5.4.1':
   String(p.entryPolicyVersion||'').includes('v5.4')?'V5.4':
   String(p.entryPolicyVersion||'').includes('v5.3.3')?'V5.3.3':
   String(p.entryPolicyVersion||'').includes('v5.3.2')?'V5.3.2':
   String(p.entryPolicyVersion||'').includes('v5.3.1')?'V5.3.1':
   String(p.entryPolicyVersion||'').includes('v5.3')?'V5.3':
   p.entryPolicyVersion===PREVIOUS_POLICY?'V5.2':'V5.2.2',
  entryPolicyVersion:p.entryPolicyVersion||PREVIOUS_POLICY,direction:p.direction,
  entryAt:p.entryAt,exitAt:ts,entryPrice:p.entryPrice,exitPrice:price,
  notionalUsd:NOTIONAL,grossPnlUsd:q.gross,feesUsd:round(p.entryFeeUsd+q.exitFee),
  netPnlUsd:q.net,mfePriceUsd:round(p.mfePriceUsd),maePriceUsd:round(p.maePriceUsd),
  entryKey:p.entryKey,entryContext:p.entryContext,
  entryInvalidation:p.invalidationPrice,exitReason:reason,
  slippage:'NOT_MODELED',funding:'NOT_MODELED',filledAt:'ACTUAL_OBSERVED_TICK'};
 s.position=null;s.completed++;s.realizedUsd=round(s.realizedUsd+q.net);
 s.feesUsd=round(s.feesUsd+q.exitFee);s.equityUsd=round(INIT+s.realizedUsd);
 if(q.net>0)s.wins++;else s.losses++;
 s.history.push(row);if(s.history.length>200)s.history=s.history.slice(-200);
 s.lastAction={type:'EXIT_'+p.direction.toUpperCase(),ts,price,reason,tradeNo:row.tradeNo,
  netPnlUsd:q.net,campaignId:p.campaignId||null,direction:p.direction,
  source:String(p.entryPolicyVersion||'').includes('v5.4.1')?
   'V5.4.1_PAPER_ONLY':String(p.entryPolicyVersion||'').includes('v5.4')?
   'V5.4_PAPER_ONLY':String(p.entryPolicyVersion||'').includes('v5.3.3')?
   'V5.3.3_PAPER_ONLY':String(p.entryPolicyVersion||'').includes('v5.3.2')?
   'V5.3.2_PAPER_ONLY':String(p.entryPolicyVersion||'').includes('v5.3.1')?
   'V5.3.1_PAPER_ONLY':String(p.entryPolicyVersion||'').includes('v5.3')?
   'V5.3_PAPER_ONLY':'V5.2_PAPER_ONLY'};
 return {event:s.lastAction,trade:row};
}
function step(s,decision,{price,ts,sourceAgeMs,tickAgeMs}){
 s=migrate(s,ts);
 if(s.brokerOrdersEnabled!==false)throw Error('V541_NEVER_BROKER');
 if(!Number.isFinite(n(ts))||!Number.isFinite(n(price))||price<=0||ts<=s.lastObservationAt)
  return {state:s,event:null,reason:'DUPLICATE_OR_INVALID'};
 s.lastObservationAt=ts;
 s.decision={version:decision.version,action:decision.action,phase:decision.phase,
  reason:decision.reason,candidate:decision.candidate,prognosis:decision.prognosis,
  price:decision.price,asOf:decision.asOf,quality:decision.quality};
 let result=null,reason='NO_TRADE';
 const tickFresh=tickAgeMs!==null&&tickAgeMs>=0&&tickAgeMs<=25000;
 if(s.position){
  const p=s.position,move=(price-p.entryPrice)*sign(p.direction);
  p.lastPrice=price;p.mfePriceUsd=Math.max(p.mfePriceUsd,move);
  p.maePriceUsd=Math.max(p.maePriceUsd,-move);p.lastNetPnlUsd=pnl(p,price).net;
  if(p.mfePriceUsd>=220)p.gainFloorUsd=180;
  else if(p.mfePriceUsd>=120)p.gainFloorUsd=Math.max(90,p.gainFloorUsd||0);
  if(tickFresh&&move<=-RISK_PRICE)result=exit(s,ts,price,'HARD_RISK_500');
  else if(tickFresh&&p.gainFloorUsd>0&&move<=p.gainFloorUsd)
   result=exit(s,ts,price,'GAIN_FLOOR_120_90_OR_220_180');
  else if(tickFresh&&decision.action==='EXIT_'+p.direction.toUpperCase())
   result=exit(s,ts,price,decision.reason);
  reason=result?'EXIT_PAPER':'HOLD_CAMPAGNE';
 }else if(decision.action==='ENTER_LONG'||decision.action==='ENTER_SHORT'){
  const dir=decision.action==='ENTER_LONG'?'long':'short';
  const crossTs=decision.readings?.geometry?.cross3?.ts;
  const inv=decision.invalidation&&decision.invalidation.price;
  if(!tickFresh||sourceAgeMs>95000||decision.quality!=='DATA_OK')
   reason='STALE_SOURCE_NO_ENTRY';
  else if(!crossTs||
    (crossTs<(s.policyActivatedAt||s.startedAt)&&
     !decision.readings?.evidenceSincePolicy?.qualified&&
     !(decision.readings?.maturity?.requalified&&
       Number(decision.readings.maturity.requalifiedAt)>=(s.policyActivatedAt||s.startedAt))))
   reason='NO_FRESH_POST_START_CROSS';
  else if(decision.version==='v5.4.1-structural-e3-territory-paper-v1'&&
    String(s.lastAction?.type||'')==='EXIT_'+dir.toUpperCase()&&
    s.lastAction?.campaignId&&
    s.lastAction.campaignId===decision.readings?.structural54?.campaignId&&
    !(crossTs>s.lastAction.ts||
      (decision.readings?.maturity?.requalified&&
       Number(decision.readings.maturity.requalifiedAt)>s.lastAction.ts&&
       decision.readings?.structural54?.testedTerritory?.source==='DEFENDED_RETEST')))
   reason='V541_SAME_CAMPAIGN_AWAIT_NEW_NATIVE_E3_OR_PROVEN_RETEST';
  else if(decision.version==='v5.4-structural-campaign-paper-v1'&&
    String(s.lastAction?.type||'')==='EXIT_'+dir.toUpperCase()&&
    s.lastAction?.campaignId&&
    s.lastAction.campaignId===decision.readings?.structural54?.campaignId&&
    !(crossTs>s.lastAction.ts&&(
      Number(decision.readings?.structural54?.mcb3?.latestPivot?.availableAt)>s.lastAction.ts||
      (decision.readings?.structural54?.localPriceDefence?.held&&
       Number(decision.readings?.structural54?.localPriceDefence?.sourceAt)>s.lastAction.ts))))
   reason='V54_SAME_CAMPAIGN_AWAIT_NEW_E3_OR_DEFENDED_TERRITORY';
  else if(!decision.entryKey||s.usedKeys.some(k=>{
       if(k===decision.entryKey)return true;
       const sameCross=String(k).split('|').slice(0,2).join('|')===
          String(decision.entryKey).split('|').slice(0,2).join('|');
       const retestAt=decision.readings?.maturity?.requalifiedAt;
       const previousExitAt=String(s.lastAction?.type||'').startsWith('EXIT_')?
          Number(s.lastAction.ts):null;
       // A new accepted retest AFTER the previous exit is a new causal
       // opportunity within the same campaign; the old cross alone is not.
       const genuineRequalification=!!(
          decision.readings?.maturity?.requalified&&
          String(decision.entryKey).includes('|RETEST:')&&
          Number.isFinite(Number(retestAt))&&
          Number.isFinite(previousExitAt)&&retestAt>previousExitAt);
       // A NEW E15 causal phase after the last exit may independently
       // requalify the same E3 family, but the same E15 event cannot churn.
       const e15=decision.readings?.e15Requalification||{};
       const e15At=n(e15.proofAt);
       const freshE15=!!(['v5.3.2-e15-live-productive-ma-proof',
          'v5.3.3-conversion-memory-no-instant-veto'].includes(decision.version)&&
        e15.eligible&&e15At!==null&&
        String(decision.entryKey).includes('|E15:'+e15At)&&
        Number.isFinite(previousExitAt)&&e15At>previousExitAt&&
        e15At>=(s.policyActivatedAt||s.startedAt)&&e15At<=ts);
       return sameCross&&!genuineRequalification&&!freshE15;
      }))
   reason='CROSS_3M_ALREADY_CONSUMED';
  else if(!Number.isFinite(n(inv))||Math.abs(price-inv)>=RISK_PRICE)
   reason='INVALIDATION_NOT_SURVIVABLE';
  else{
   const fee=round(NOTIONAL*TAKER);
   s.position={direction:dir,entryAt:ts,entryPrice:price,lastPrice:price,
    entryPolicyVersion:decision.version||VERSION,
    campaignId:decision.readings?.causalChain?.campaignId||null,
    entryKey:decision.entryKey,entryFeeUsd:fee,notionalUsd:NOTIONAL,
    invalidationPrice:inv,invalidationReference:decision.invalidation.reference,
    entryContext:{phase:decision.phase,prognosis:decision.prognosis,
     flow15:decision.readings?.flow15||null,
     maContract:decision.readings?.maContract||null,
     e15Requalification:decision.readings?.e15Requalification||null,
     conversionCampaign:decision.readings?.conversionCampaign||null,
     structural54:decision.readings?.structural54||null,
     marketStage:decision.readings?.marketStage||null,
     evidenceSincePolicy:decision.readings?.evidenceSincePolicy||null,
     version:decision.version||VERSION,
     causalChain:decision.readings?.causalChain||null,
     maturity:decision.readings?.maturity||null,
     invalidation:decision.invalidation||null,
     setupChecks:decision.checks||null,
     mcb15:decision.readings.mcb15,geometry:decision.readings.geometry,
     place:decision.readings.place,conversion:decision.readings.conversion,
     economics:decision.readings.economics,sourceAt:decision.asOf},
    mfePriceUsd:0,maePriceUsd:0,gainFloorUsd:0,lastNetPnlUsd:-2*fee};
   s.feesUsd=round(s.feesUsd+fee);
   s.usedKeys=[...s.usedKeys,decision.entryKey].slice(-350);
   s.lastAction={type:'ENTER_'+dir.toUpperCase(),ts,price,reason:decision.reason,
    direction:dir,entryKey:decision.entryKey,feeUsd:fee,
    source:decision.version==='v5.4.1-structural-e3-territory-paper-v1'?
      'V5.4.1_PAPER_ONLY':decision.version==='v5.4-structural-campaign-paper-v1'?
      'V5.4_PAPER_ONLY':decision.version==='v5.3.3-conversion-memory-no-instant-veto'?
      'V5.3.3_PAPER_ONLY':decision.version==='v5.3.2-e15-live-productive-ma-proof'?
      'V5.3.2_PAPER_ONLY':decision.version==='v5.3.1-ma-maturity-mf-quality'?
      'V5.3.1_PAPER_ONLY':decision.version==='v5.3-causal-15m-flow-market-phase'?
      'V5.3_PAPER_ONLY':'V5.2_PAPER_ONLY'};
   result={event:s.lastAction};reason='ENTER_PAPER';
  }
 }
 s.lastReason=reason;
 return {state:s,event:result&&result.event||null,trade:result&&result.trade||null,reason};
}
module.exports={VERSION,V54_VERSION,V533_VERSION,V532_VERSION,V531_VERSION,V53_VERSION,V522_VERSION,LEGACY_VERSION,NOTIONAL,TAKER,initial,migrate,step,pnl};
