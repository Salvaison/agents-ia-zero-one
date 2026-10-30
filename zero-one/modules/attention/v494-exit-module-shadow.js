'use strict';
// Two-stage decision: evidence of deterioration does NOT immediately invert the
// MCB15 campaign. This experimental EXIT changes only shadow positions.
const VERSION='v494-exit-research-v0.1';
const POLICIES=['FROZEN_V493','CONTINUATION_SUPERVISOR'];
const THREE=180000;
const n=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
const side=d=>d==='long'?1:d==='short'?-1:0;
function evaluate({frame,evaluation,position,attention,policy}={}){
 if(!POLICIES.includes(policy))throw Error('UNKNOWN_EXIT_POLICY');
 if(!position)return {version:VERSION,policy,action:'NO_POSITION'};
 const ts=n(frame?.market?.timestamp),price=n(frame?.market?.price),d=side(position.direction);
 const original=evaluation?.action||{},originalType=String(original.type||'HOLD');
 if(!ts||!price||!d)return {version:VERSION,policy,action:'WATCH',reason:'NO_FRESH_PRICE'};
 const current=d*(price-position.entryPrice);
 const mfe=position.metrics?.mfeUsd||0,giveback=mfe-current;
 const out={version:VERSION,policy,action:'HOLD',reason:'CONTINUATION_NOT_FALSIFIED',
  originalAction:originalType,at:ts,price,currentSignedUsd:current,mfeUsd:mfe,
  givebackUsd:giveback,proof:{}};
 if(current<=-500||position.metrics?.maeUsd>=500){
  return {...out,action:'EXIT_RISK',reason:'SHADOW_HARD_RISK_500',
   protective:true};
 }
 if(originalType.startsWith('EXIT_'))return {...out,action:originalType,
  reason:'V493_ORIGINAL_EXIT',originalReason:original.reason||null};
 if(originalType==='TAKE_PROFIT_PARTIAL')return {...out,action:originalType,
  reason:'V493_PARTIAL_PROTECT'};
 if(policy==='FROZEN_V493')return {...out,action:'HOLD',reason:'ORIGINAL_V493_HOLD'};
 const lev=n(position.entryInvalidation);
 const bars=(frame?.sources?.mcb?.tfs?.['3m']?.history||[])
  .filter(b=>n(b.ts)!==null&&b.ts+THREE<=ts&&n(b.close)!==null);
 const ranges=bars.slice(-24).map(b=>n(b.high)-n(b.low))
  .filter(x=>Number.isFinite(x)).sort((a,b)=>a-b);
 const r3=ranges.length?ranges[Math.floor(ranges.length/2)]:60;
 const buffer=Math.max(12,.14*r3);
 const breach=lev===null?null:Math.max(0,-d*(price-lev));
 const last=bars.at(-1)||null;
 const closedLoss=!!(last&&last.ts+THREE>position.entryAt&&
  lev!==null&&-d*(last.close-lev)>=buffer);
 const audit=(frame?.sources?.auditRows||[])
  .filter(r=>n(r.ts)!==null&&r.ts<=ts);
 const nowRow=audit.at(-1)||{},at3=ts-THREE;
 const prev=audit.slice().reverse().find(r=>r.ts<=at3&&at3-r.ts<75000);
 const mf3Now=n(nowRow.liveMoneyFlow),mf3Prev=n(prev?.liveMoneyFlow),
  mf15Now=n(nowRow.live15MfRaw),mf15Prev=n(prev?.live15MfRaw);
 const mf3Adverse=mf3Now!==null&&mf3Prev!==null&&d*(mf3Now-mf3Prev)<-.5;
 const mf15Adverse=mf15Now!==null&&mf15Prev!==null&&d*(mf15Now-mf15Prev)<-.5;
 const roll=evaluation?.translation?.horizons||{};
 const pm3=n(roll.net3mUsd),eff=n(roll.efficiency3m);
 const priceAdverse=pm3!==null&&eff!==null&&eff>=.25&&
  d*pm3<=-Math.max(12,.2*r3);
 const mcb=evaluation?.mcb?.currentLobe||{};
 const strategicAligned=mcb.structuralDirection===position.direction;
 const oppos3=evaluation?.mcb?.tactical3m?.structuralDirection&&
  evaluation.mcb.tactical3m.structuralDirection!==position.direction;
 const attentionStage=attention?.stage||'UNKNOWN';
 // No E3 alone, no one unconfirmed candle, no mere Fibonacci touch.
 const confirmedStructure=closedLoss&&breach!==null&&breach>=buffer&&
  priceAdverse&&mf3Adverse&&
  (!strategicAligned||mf15Adverse||breach>=Math.max(50,.7*r3));
 const materialNoAnchor=lev===null&&current<=-Math.max(220,1.2*r3)&&
  priceAdverse&&mf3Adverse&&mf15Adverse;
 const profitableCampaignUnderAttack=mfe>=440&&current>0&&
  giveback>=Math.max(200,.55*mfe)&&priceAdverse&&mf3Adverse&&
  (mf15Adverse||!strategicAligned);
 out.proof={attentionStage,anchor:lev,breachUsd:breach,
  oneConfirmedCloseBeyond:closedLoss,lastConfirmed3mAt:last?last.ts+THREE:null,
  medianRange3m:r3,bufferUsd:buffer,priceAdverse,pm3,efficiency3m:eff,
  mf3Adverse,mf15Adverse,strategicAligned,opposing3m:!!oppos3,
  materialNoAnchor,confirmedStructure,profitableCampaignUnderAttack,
  causalThresholds:'experimental, NO active trading authority'};
 if(confirmedStructure)return {...out,action:'EXIT_RESEARCH',
  reason:'CONFIRMED_TERRITORY_LOSS_WITH_PRICE_MF',
  proof:out.proof};
 if(materialNoAnchor)return {...out,action:'EXIT_RESEARCH',
  reason:'NO_SURVIVABLE_ANCHOR_WITH_MATERIAL_OPPOSITION',
  proof:out.proof};
 if(profitableCampaignUnderAttack)return {...out,action:'EXIT_RESEARCH',
  reason:'LARGE_MFE_CONVERSION_FAILURE_WITHOPPOSING_MF',
  proof:out.proof};
 if((breach!==null&&breach>0)||priceAdverse||attentionStage==='REVERSAL_ATTENTION')
  return {...out,action:'WATCH',reason:'CONTESTED_BUT_NOT_FALSIFIED'};
 return out;
}
module.exports={VERSION,POLICIES,evaluate};
