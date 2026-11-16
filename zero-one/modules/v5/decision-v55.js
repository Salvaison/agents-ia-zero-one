'use strict';
// BOONO V5.5 — independent PAPER policy, NEVER brokerage.
// V543 is used as read-only evidence extraction, not as trading authority.
// 4 authorities: admission, position protection, strategic transfer, re-entry.
const PLACE=require('../attention/boonolab-place-e1e4-shadow');
const VERSION='v5.5-structural-place-regime-paper-v1';
const MIN=60000,THREE=3*MIN,FIFTEEN=15*MIN,HOUR=60*MIN;
const num=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const round=x=>x===null?null:Math.round(x*100)/100;
const side=d=>d==='long'?1:d==='short'?-1:0;
const opposite=d=>d==='long'?'short':d==='short'?'long':null;
const median=x=>{const a=x.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
function older(rows,ts,mins){
 const t=ts-mins*MIN;
 return [...rows].reverse().find(a=>a.ts<=t&&t-a.ts<=90000)||null;
}
function context(input,now,price,candidate,regime,levelsMtime){
 const samples=(input.samples||[]).filter(x=>num(x.ts)!==null&&x.ts<=now&&
   num(x.live15LbwRaw)!==null&&num(x.live15BwRaw)!==null)
   .sort((a,b)=>a.ts-b.ts);
 const last=samples.at(-1),p3=older(samples,now,3),p15=older(samples,now,15);
 const raw15=last?num(last.live15LbwRaw):null;
 const delta3=last&&p3?round(raw15-num(p3.live15LbwRaw)):null;
 const delta15=last&&p15?round(raw15-num(p15.live15LbwRaw)):null;
 const gap=last?round(raw15-num(last.live15BwRaw)):null;
 const oldGap=p15?round(num(p15.live15LbwRaw)-num(p15.live15BwRaw)):null;
 const events=(tf,period)=>{
  return (input[tf]||[]).filter(b=>num(b.ts)!==null&&b.ts+period<=now)
   .map(b=>({sourceTs:b.ts,availableAt:b.ts+period,
    lbw:num(b.lt_blue_wave),bw:num(b.blue_wave),mf:num(b.money_flow),
    signal:num(b.wt1_cross_up)!==null&&num(b.wt1_cross_dn)===null?'long':
      num(b.wt1_cross_dn)!==null&&num(b.wt1_cross_up)===null?'short':null}))
   .filter(b=>b.lbw!==null&&b.bw!==null);
 };
 const e1=PLACE.confirmedE(events('bars1h',HOUR),now);
 const e4=PLACE.confirmedE(events('bars4h',4*HOUR),now);
 const place=PLACE.ranges(input.levels||[],price,levelsMtime,now);
 const market=PLACE.marketReading(regime,now,candidate);
 const audit=(input.samples||[]).filter(x=>num(x.ts)!==null&&x.ts<=now&&
    num(x.lastPrice)!==null).sort((a,b)=>a.ts-b.ts);
 const a3=older(audit,now,3),a15=older(audit,now,15),a60=older(audit,now,60);
 const sign=side(candidate);
 return {lbw:raw15,bw:last?num(last.live15BwRaw):null,delta3,delta15,gap,oldGap,
  contracting:gap!==null&&oldGap!==null&&Math.abs(gap)<Math.abs(oldGap),
  slopeCandidate3:delta3===null?null:round(sign*delta3),
  slopeCandidate15:delta15===null?null:round(sign*delta15),
  recentAuditAt:num(last?.ts),e1,e4,place,market,
  price3mSigned:a3?round(sign*(price-a3.lastPrice)):null,
  price15mSigned:a15?round(sign*(price-a15.lastPrice)):null,
  price60mSigned:a60?round(sign*(price-a60.lastPrice)):null,
  price3mAsOf:a3?.ts||null,price15mAsOf:a15?.ts||null,
  source:'AUDIT_FIRST_OBSERVED_LBW15_PLUS_CLOSED_E1_E4_ASOF'};
}
function closed3(input,now){
 return (input.bars3||[]).filter(b=>num(b.ts)!==null&&
   b.ts+THREE<=now&&num(b.close)!==null&&
   num(b.high)!==null&&num(b.low)!==null).sort((a,b)=>a.ts-b.ts);
}
function provenTerritory(input,now,price,dir,base){
 const rows=closed3(input,now);
 const d=side(dir),b=rows.slice(-30);
 const scale=median(b.slice(-24).map(x=>x.high-x.low).filter(x=>x>0))||80;
 // A CLOSING impulse beyond the previous four 3m candles followed by a
 // confirmed defended RETEST. Merely touching an MA never counts as defence.
 const buffer=Math.max(12,Math.min(32,scale*.2));
 for(let i=b.length-2;i>=Math.max(4,b.length-12);i--){
  const past=b.slice(i-4,i),imp=b[i];
  const frontier=d===1?Math.max(...past.map(x=>x.high)):
    Math.min(...past.map(x=>x.low));
  if(d*(imp.close-frontier)<Math.max(8,scale*.12))continue;
  const after=b.slice(i+1);
  const hasRetest=after.some(x=>d===1?x.low<=frontier+buffer:
    x.high>=frontier-buffer);
  const held=after.length>=1&&after.every(x=>
    d*(x.close-frontier)>=-buffer);
  const recent=now-(b.at(-1).ts+THREE)<=8*MIN&&
    now-(imp.ts+THREE)<=35*MIN;
  if(hasRetest&&held&&recent&&d*(price-frontier)>=-buffer){
   return {validated:true,kind:'CONFIRMED_3M_BREAK_RETEST_HOLD',
    level:round(frontier),availableAt:b.at(-1).ts+THREE,
    sourceAt:imp.ts,median3mRangeUsd:round(scale)};
  }
 }
 const st=base?.readings?.structural54||{},t=st.testedTerritory||{};
 if(base?.candidate===dir&&t.validated&&
   num(t.availableAt)!==null&&t.availableAt<=now&&
   now-t.availableAt<=35*MIN&&num(t.level)!==null&&
   d*(price-t.level)>=-buffer)
  return {validated:true,kind:t.source||'MCB_CONFIRMED_PRICE_TERRITORY',
   level:t.level,sourceAt:t.availableAt,availableAt:t.availableAt,
   median3mRangeUsd:round(scale)};
 return {validated:false,kind:'NO_RECENT_DEFENDED_3M_TERRITORY',
  level:null,availableAt:null,median3mRangeUsd:round(scale)};
}
function initialStop(input,now,price,dir,territory){
 const b=closed3(input,now).slice(-8),d=side(dir);
 if(b.length<5)return {available:false,reason:'STOP_NEEDS_5_CONFIRMED_3M'};
 const level=d===1?Math.min(...b.map(x=>x.low)):
  Math.max(...b.map(x=>x.high));
 const buffer=Math.max(12,Math.min(35,(territory.median3mRangeUsd||80)*.15));
 const stop=round(level-d*buffer),distance=round(d*(price-stop));
 return {available:stop>0&&distance>=30&&distance<500,
  price:stop,distanceUsd:distance,
  reference:'V55_LAST_8_CONFIRMED_3M_PRICE_EXTREME',
  availableAt:b.at(-1).ts+THREE,sourceAt:b.at(-1).ts,
  reason:distance>0&&distance<500?'CAUSAL_STOP':'NOT_SURVIVABLE'};
}
function marketGate(ctx,dir,territory,conv,now){
 const m=ctx.market||{};
 if(m.status!=='DESCRIPTIVE_SHADOW_NOT_VALIDATED')
  return {allowed:false,reason:'WAIT_FRESH_MARKET_REGIME'};
 const e=num(m.pathEfficiency),ret=num(m.retainedFraction);
 if(e===null||ret===null)return {allowed:false,reason:'WAIT_MARKET_COVERAGE'};
 const marketStrong=ctx.price15mSigned!==null&&
  ctx.price15mSigned>=Math.max(90,(territory.median3mRangeUsd||80)*.9);
 const conversionStrong=conv.productive&&conv.pmLiveDirectional>15;
 if(m.label==='STERILE_HESITANT'&&
   !(territory.validated&&marketStrong&&conversionStrong))
  return {allowed:false,reason:'WAIT_STERILE_NO_PRODUCTIVE_TERRITORY'};
 if(m.label==='DENSE_CONTRADICTOIRE'&&e<.18&&ret<.45&&
   !(territory.validated&&marketStrong&&conversionStrong))
  return {allowed:false,reason:'WAIT_CONTRADICTORY_NO_TERRITORY'};
 if(m.label==='DIRECTIONNEL_PRODUCTIF'&&m.twoHourDirection===opposite(dir)&&
   !marketStrong)
  return {allowed:false,reason:'WAIT_AGAINST_PRODUCTIVE_2H'};
 return {allowed:true,reason:'MARKET_PRODUCTIVITY_ACCEPTABLE',
  marketStrong,conversionStrong};
}
function evaluate({input,base,now,price,position=null,lastExit=null,
 startedAt,regime=null,levelsMtime=null,usedKeys=[]}={}){
 const safe={version:VERSION,asOf:now,price,brokerOrdersEnabled:false,
  quality:'DATA_DEGRADED',candidate:null,phase:'UNKNOWN',action:'WAIT',
  reason:'WAIT_DATA',entryKey:null,invalidation:null,readings:{},checks:{}};
 if(num(now)===null||num(price)===null||price<=0||
  !input||!base)return safe;
 const st=base.readings?.structural54||{},g=base.readings?.geometry||{},
  cv=base.readings?.conversion||{},cross=g.cross3||{};
 const candidate=cross.direction||null,sign=side(candidate);
 const contextData=context(input,now,price,candidate,regime,levelsMtime);
 const territory=sign?provenTerritory(input,now,price,candidate,base):{validated:false};
 const inv=sign?initialStop(input,now,price,candidate,territory):null;
 const native15=st.nativeE15||{},native3=st.nativeE3||{},
  nc=native15.confirmed||{},n3c=native3.confirmed||{},n3l=native3.live||{};
 const parent=st.director||null;
 const phase=parent===candidate?'V55_CONTINUATION':
  parent&&sign?'V55_EARLY_INFLECTION':'V55_UNQUALIFIED';
 const freshCross=num(cross.ts)!==null&&cross.ts<=now&&
  now-cross.ts<=18*MIN&&cross.ts>=Number(startedAt||0);
 const native3Aligned=!!(candidate&&
   ((n3c.direction===candidate&&num(n3c.availableAt)!==null&&
     n3c.availableAt<=now&&now-n3c.availableAt<=25*MIN&&
     num(cross.ts)!==null&&n3c.availableAt>=cross.ts-THREE)||
   (n3l.direction===candidate&&num(n3l.observedAt)!==null&&
     n3l.observedAt<=now&&now-n3l.observedAt<=THREE)));
 const confirmed15Conflict=!!(candidate&&nc.direction===opposite(candidate)&&
   num(nc.availableAt)!==null&&nc.availableAt<=now&&
   nc.availableAt>num(st.structuralPivotKnownAt||0));
 const confirmed15Favourable=!!(candidate&&nc.direction===candidate&&
  num(nc.availableAt)!==null&&nc.availableAt<=now);
 const cross15Conflict=g.cross15?.direction===opposite(candidate)&&
  num(g.cross15?.ts)!==null&&g.cross15.ts<=now&&now-g.cross15.ts<=45*MIN;
 const e15LiveFavourable=native15.live?.direction===candidate&&
  num(native15.live?.observedAt)!==null&&native15.live.observedAt<=now;
 const slope15=contextData.slopeCandidate15;
 const slope3=contextData.slopeCandidate3;
 const forward=sign&&slope15!==null&&
   (phase==='V55_CONTINUATION'?
     slope15>=-1&&slope3!==null&&slope3>=-2:
     slope15>=4&&slope3!==null&&slope3>=0);
 const converted=sign&&num(cv.pm3)!==null&&num(cv.pm5)!==null&&
  num(cv.pmCombined)!==null&&num(cv.mf3Delta3m)!==null;
 const pmDirectional=converted?round(sign*cv.pmCombined):null;
 const conv={productive:!!(converted&&sign*cv.pm3>8&&sign*cv.pm5>8&&
   sign*cv.mf3Delta3m>=-.15&&pmDirectional>=-10),
  pmLiveDirectional:pmDirectional,pm3Directional:sign&&num(cv.pm3)!==null?round(sign*cv.pm3):null,
  pm5Directional:sign&&num(cv.pm5)!==null?round(sign*cv.pm5):null,
  mf3Directional:sign&&num(cv.mf3Delta3m)!==null?round(sign*cv.mf3Delta3m):null,
  mf15Directional:sign&&num(cv.mf15Delta10m)!==null?round(sign*cv.mf15Delta10m):null};
 const gate=marketGate(contextData,candidate,territory,conv,now);
 const priceTranslated=!!(contextData.price3mSigned!==null&&
  contextData.price3mSigned>=Math.max(22,(territory.median3mRangeUsd||80)*.28)&&
  contextData.price15mSigned!==null&&contextData.price15mSigned>=-35);
 const maturity=base.readings?.offensiveMaturity||{};
 const matureEdge=!!(base.readings?.maturity?.twoHourPriceRank>=.9&&
  base.readings?.maturity?.offensiveChain?.origin4h?.progressVs15mRange>=4&&
  slope15!==null&&slope15<5);
 const macroAgainst=!!(candidate==='long'&&
   contextData.e1.direction==='short'&&contextData.e4.direction==='short'&&
   contextData.market.twoHourDirection==='short');
 const macroProofOk=!macroAgainst||
  (confirmed15Favourable&&contextData.price15mSigned>=130&&
   territory.kind==='CONFIRMED_3M_BREAK_RETEST_HOLD');
 // WHERE is a price/liquidity-location proxy, not a directional vote.
 // Outside the recorded value area AGAINST E1 and the observed 2h direction,
 // require a genuinely NEW price defence and an E15/native formation.
 const slowCounter=!!(candidate&&contextData.e1.direction===opposite(candidate)&&
  contextData.market.twoHourDirection===opposite(candidate));
 const outsideCounter=!!(candidate&&slowCounter&&
  [contextData.place.big,contextData.place.daily].some(area=>area&&(
   candidate==='long'&&area.outside==='BELOW_VAL'||
   candidate==='short'&&area.outside==='ABOVE_VAH')));
 const placeProofOk=!outsideCounter||
  (territory.kind==='CONFIRMED_3M_BREAK_RETEST_HOLD'&&
   contextData.price15mSigned!==null&&contextData.price15mSigned>=120&&
   (confirmed15Favourable||(e15LiveFavourable&&slope15>=8)));
 const tacticalGood=!!(freshCross&&native3Aligned&&forward&&territory.validated&&
  territory.availableAt>=(startedAt||0)&&conv.productive&&priceTranslated);
 const nativeConflictBlocks=confirmed15Conflict&&cross15Conflict&&
  phase==='V55_CONTINUATION';
 const stale=!input.health||base.quality!=='DATA_OK'||
  !contextData.recentAuditAt||now-contextData.recentAuditAt>65000||
  !Number.isFinite(num(contextData.delta15))||contextData.price15mSigned===null;
 const reentrySame=!!(lastExit&&lastExit.campaignId===st.campaignId&&
   now-lastExit.at<15*MIN);
 const newProof=!!(!lastExit||(cross.ts>lastExit.at&&
  territory.availableAt>lastExit.at));
 const reentryQualified=!reentrySame&&newProof;
 const entryKey=sign?candidate+'|'+cross.ts+'|'+territory.availableAt+'|'+st.campaignId:null;
 const checks={freshCross,native3Aligned,forward,territory:territory.validated,
  converted:conv.productive,priceTranslated,maturity:maturity.classification,
  matureEdge,nativeConflictBlocks,macroProofOk,
  placeProofOk,outsideCounter,market:gate.reason,
  reentryQualified,stopSurvivable:!!inv?.available,
  newEntryKey:!!entryKey&&!usedKeys.includes(entryKey)};
 let action='WAIT',reason='WAIT_CAUSAL_EVIDENCE';
 if(position){
  // Separate position protection from approval to start a new E15 campaign.
  const p=position,d=side(p.direction),move=d*(price-p.entryPrice),
   maxMove=Math.max(num(p.mfePriceUsd)||0,move),
   giveback=maxMove-move;
  const lc=closed3(input,now).slice(-2);
  const crossedStop=lc.length>=1&&lc.some(b=>
   d*(b.close-p.invalidationPrice)<-Math.max(8,(territory.median3mRangeUsd||80)*.1));
  const e15Opp=nc.direction===opposite(p.direction)&&
   num(nc.availableAt)!==null&&nc.availableAt>p.entryAt&&nc.availableAt<=now;
  const cross15Opp=g.cross15?.direction===opposite(p.direction)&&
   num(g.cross15?.ts)!==null&&g.cross15.ts<=now;
  const cross3Opp=cross.direction===opposite(p.direction)&&
   num(cross.ts)!==null&&now-cross.ts<=20*MIN;
  const E3Opp=(n3c.direction===opposite(p.direction)&&
    num(n3c.availableAt)!==null&&now-n3c.availableAt<=20*MIN)||
    (n3l.direction===opposite(p.direction)&&n3l.observedAt<=now);
  const adversePM=d*num(cv.pmCombined)>=0?false:
   num(cv.pmCombined)!==null&&d*cv.pmCombined< -15;
  const adverseMF=num(cv.mf3Delta3m)!==null&&d*cv.mf3Delta3m<-.15;
  const lbwAdverse=contextData.delta15!==null&&d*contextData.delta15<=-6;
  const fastLbwAdverse=contextData.delta3!==null&&d*contextData.delta3<=-3;
  const activeCounter=!!(cross3Opp&&E3Opp&&adversePM&&(lbwAdverse||fastLbwAdverse));
  const largeRetreat=maxMove>=100&&giveback>=Math.max(85,maxMove*.3);
  const lossOfHypothesis=move<=-(territory.median3mRangeUsd||80)*1.3&&
   activeCounter&&adverseMF;
  if(!stale&&e15Opp&&cross15Opp&&(adversePM||adverseMF)){
   action='EXIT_'+p.direction.toUpperCase();reason='V55_PROTECT_CONFIRMED_E15_TRANSFER';
  }else if(!stale&&crossedStop&&(adversePM||cross3Opp)){
   action='EXIT_'+p.direction.toUpperCase();reason='V55_PROTECT_INITIAL_STRUCTURE_LOSS';
  }else if(!stale&&activeCounter&&largeRetreat){
   action='EXIT_'+p.direction.toUpperCase();reason='V55_PROTECT_LBW15_COUNTERATTACK_GIVEBACK';
  }else if(!stale&&lossOfHypothesis){
   action='EXIT_'+p.direction.toUpperCase();reason='V55_PROTECT_EARLY_THESIS_INVALIDATED';
  }else{action='HOLD';reason=activeCounter?
   'V55_HOLD_COUNTERATTACK_OBSERVED_NOT_VALIDATED_EXIT':
   'V55_HOLD_STRUCTURAL_EVIDENCE';}
  return {...safe,quality:stale?'DATA_DEGRADED':'DATA_OK',candidate:p.direction,
   phase:p.entryContext?.phase||phase,action,reason,
   readings:{structural55:{context:contextData,territory,conversion:conv,
     parent,confirmed15Favourable,confirmed15Conflict,cross3:g.cross3,
     native15:native15,positionReview:{move:round(move),mfe:round(maxMove),
     giveback:round(giveback),cross3Opp,E3Opp,e15Opp,cross15Opp,
     adversePM,adverseMF,lbwAdverse,fastLbwAdverse,activeCounter,
     largeRetreat,crossedStop}},structural54:st,geometry:g,conversion:cv},
   checks:{...checks,positionActive:true}};
 }
 const blockers=[
  [stale,'WAIT_V55_FRESH_MCB_AUDIT'],
  [!candidate||!parent,'WAIT_V55_MCB_PARENT_OR_TACTIC'],
  [!freshCross,'WAIT_V55_NEW_MCB3_CROSS'],
  [!native3Aligned,'WAIT_V55_E3_NATIVELY_ALIGNED'],
  [!forward,'WAIT_V55_LBW15_TRAJECTORY'],
  [!territory.validated,'WAIT_V55_DEFENDED_PRICE_TERRITORY'],
  [!conv.productive,'WAIT_V55_PRODUCTIVE_CONVERSION'],
  [!priceTranslated,'WAIT_V55_PRICE_TRANSLATION'],
  [!gate.allowed,gate.reason],
  [nativeConflictBlocks,'WAIT_V55_NATIVE_E15_CONTRADICTS_PARENT'],
  [matureEdge,'WAIT_V55_MATURE_LBW15_PRICE_EDGE'],
  [!macroProofOk,'WAIT_V55_LONG_AGAINST_MACRO_WITHOUT_NEW_TERRITORY'],
  [!placeProofOk,'WAIT_V55_OUTSIDE_VALUE_AREA_COUNTERTREND_UNPROVEN'],
  [!reentryQualified,'WAIT_V55_NEW_PROOF_AFTER_EXIT'],
  [!inv?.available,'WAIT_V55_CAUSAL_SURVIVABLE_STOP'],
  [!entryKey||usedKeys.includes(entryKey),'WAIT_V55_CROSS_AND_TERRITORY_CONSUMED']
 ];
 const rejected=blockers.find(x=>x[0]);
 if(!rejected&&tacticalGood&&gate.allowed){
  action='ENTER_'+candidate.toUpperCase();reason=phase==='V55_CONTINUATION'?
    'V55_PRODUCTIVE_LBW15_CONTINUATION_WITH_DEFENDED_PRICE':
    'V55_EARLY_LBW15_INFLECTION_WITH_DEFENDED_PRICE';
 }else reason=rejected?.[1]||'WAIT_V55_NO_COMPLETE_PROOF';
 return {...safe,quality:stale?'DATA_DEGRADED':'DATA_OK',candidate,phase,
  action,reason,entryKey,invalidation:inv,
  readings:{structural55:{parent,candidate,context:contextData,territory,
   conversion:conv,marketGate:gate,confirmed15Conflict,
   confirmed15Favourable,e15LiveFavourable,stConfirmedAt:st.structuralPivotKnownAt},
   structural54:st,geometry:g,conversion:cv,maContract:base.readings?.maContract||null,
   maturity:base.readings?.maturity||null,offensiveMaturity:maturity},
  checks};
}
module.exports={VERSION,context,provenTerritory,initialStop,marketGate,evaluate};
