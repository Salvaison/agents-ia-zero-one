'use strict';
function finite(v){return v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v));}
function q(v,p){const a=v.filter(finite).map(Number).sort((x,y)=>x-y);if(!a.length)return null;return a[Math.min(a.length-1,Math.round((a.length-1)*p))];}
function zigzag(prices,threshold=50){
  if(prices.length<3)return[];
  let start=prices[0],ext=start,dir=0,out=[];
  for(const x of prices.slice(1)){
    if(dir===0){
      if(x.p>=ext.p+threshold){dir=1;ext=x;}
      else if(x.p<=ext.p-threshold){dir=-1;ext=x;}
      else if(Math.abs(x.p-start.p)>Math.abs(ext.p-start.p))ext=x;
    }else if(dir===1){
      if(x.p>ext.p)ext=x;
      else if(ext.p-x.p>=threshold){out.push(Math.abs(ext.p-start.p));start=ext;dir=-1;ext=x;}
    }else{
      if(x.p<ext.p)ext=x;
      else if(x.p-ext.p>=threshold){out.push(Math.abs(ext.p-start.p));start=ext;dir=1;ext=x;}
    }
  }
  return out;
}

const MIN_ENTRY_RR=1.0;
const MIN_PROTECTION_P50_FRACTION=.25;
const PHASE_OVERRUN_RATIO=2.5;
const MIN_PHASE_RETAINED_FRACTION=.50;
const REASSERT_TURNING_MAX_MS=6*60*1000;

function currentMa200(frame,tf){
  const src=frame&&frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs&&frame.sources.mcb.tfs[tf];
  if(!src)return null;
  for(const row of [src.live,src.confirmed]){
    if(row&&finite(row.ma200)&&Number(row.ma200)>1000)return Number(row.ma200);
  }
  return null;
}
function nearestTarget(frame,direction,price){
  const c=[];
  for(const tf of ['3m','15m']){
    const ma=currentMa200(frame,tf);
    if(!finite(ma))continue;
    if(direction==='short'&&ma<price)c.push({kind:'MA200',timeframe:tf,price:ma,distanceUsd:price-ma});
    if(direction==='long'&&ma>price)c.push({kind:'MA200',timeframe:tf,price:ma,distanceUsd:ma-price});
  }
  const levels=Array.isArray(frame&&frame.sources&&frame.sources.levels)?frame.sources.levels:[];
  for(const l of levels){
    const lp=Number(l&&l.price);if(!finite(lp))continue;
    if(direction==='short'&&lp<price)c.push({kind:'LEVEL',label:l.label||null,family:l.fam||null,price:lp,distanceUsd:price-lp});
    if(direction==='long'&&lp>price)c.push({kind:'LEVEL',label:l.label||null,family:l.fam||null,price:lp,distanceUsd:lp-price});
  }
  return c.sort((a,b)=>a.distanceUsd-b.distanceUsd)[0]||null;
}

function structuralPriceTarget(wave,direction,price){
  const reclaim=wave&&wave.structural&&finite(wave.structural.reclaimPrice)?Number(wave.structural.reclaimPrice):null;
  const structuralExtreme=direction==='long'?
    wave&&wave.price&&Number(wave.price.maxPrice):
    wave&&wave.price&&Number(wave.price.minPrice);
  if(direction==='long'){
    if(finite(reclaim)&&reclaim>price)return {kind:'MAJOR_E15_RECLAIM',timeframe:'15m',price:reclaim,distanceUsd:reclaim-price,basis:'PREVIOUS_MAJOR_E15_PRICE'};
    if(finite(structuralExtreme)&&structuralExtreme>price)return {kind:'STRUCTURAL_EXTREME',timeframe:'15m',price:structuralExtreme,distanceUsd:structuralExtreme-price,basis:'CURRENT_MAJOR_E15_PRICE_PATH'};
  }
  if(direction==='short'){
    if(finite(reclaim)&&reclaim<price)return {kind:'MAJOR_E15_RECLAIM',timeframe:'15m',price:reclaim,distanceUsd:price-reclaim,basis:'PREVIOUS_MAJOR_E15_PRICE'};
    if(finite(structuralExtreme)&&structuralExtreme<price)return {kind:'STRUCTURAL_EXTREME',timeframe:'15m',price:structuralExtreme,distanceUsd:price-structuralExtreme,basis:'CURRENT_MAJOR_E15_PRICE_PATH'};
  }
  return null;
}

function evaluate(frame,ctx){
  const wave=ctx.wave||{}, dom=ctx.dominance||{}, regime=ctx.regime||{}, where=ctx.where||{};
  const sequence=ctx.sequence||{}, reversal=ctx.reversal||{};
  const now=frame.market.timestamp, rows=(frame.sources.auditRows||[]).filter(r=>Number(r.ts)>=now-12*3600000&&finite(r.lastPrice));
  const swings=zigzag(rows.map(r=>({t:Number(r.ts),p:Number(r.lastPrice)})),50);
  const respiration={n:swings.length,minSwingUsd:50,p50:q(swings,.5),p75:q(swings,.75),p90:q(swings,.9),p95:q(swings,.95)};
  const counter=wave.price&&finite(wave.price.counterExcursionUsd)?wave.price.counterExcursionUsd:0;
  let counterState='UNKNOWN';
  if(finite(respiration.p90)){
    counterState=counter>=respiration.p90?'UNUSUAL':counter>=respiration.p75?'LARGE_NORMAL':'NORMAL';
  }

  const structuralThesis=wave.structural||{};
  const structuralKnown=structuralThesis.available===true;
  const structuralActive=structuralKnown&&['long','short'].includes(structuralThesis.direction);
  let direction=null,entryMode='NO_THESIS';
  let counterThesisCandidateBlocked=false;
  if(structuralActive){
    direction=structuralThesis.direction;
    counterThesisCandidateBlocked=!!(reversal.active&&reversal.direction&&reversal.direction!==direction);
    entryMode=wave.direction===direction?'PHASE_CONTINUATION':'STRUCTURAL_REASSERTION';
  }else{
    entryMode=reversal.active?'REVERSAL_FORMING':'PHASE_CONTINUATION';
    direction=reversal.active?reversal.direction:wave.direction;
  }
  const persistent=dom.state==='DOMINATION_PERSISTANTE'&&dom.direction===direction&&Number(dom.proofScore)>=.60;
  const regimeBlocked=['HACHOIR','CHOC_COMBAT'].includes(regime.state);

  let locationReady=false,locationSource=null;
  if(entryMode==='REVERSAL_FORMING'){
    locationReady=true;
    locationSource=reversal.locationBasis||'TURNING_POINT_15M';
  }else if(direction){
    const byDir=sequence.locationByDirection&&sequence.locationByDirection[direction];
    const legacyCont=sequence.continuation&&(!sequence.continuation.direction||sequence.continuation.direction===direction)?sequence.continuation:null;
    const seqCont=byDir||legacyCont||{};
    locationReady=!!seqCont.locationReady;
    locationSource=seqCont.locationSource||null;
  }

  const price=Number(frame.market.price);
  let protectionOrigin=null,protectionPrice=null,protectionDistanceUsd=null,protectionBreached=false;
  if(entryMode==='REVERSAL_FORMING'&&reversal.protectionPrice!==null&&reversal.protectionPrice!==undefined&&finite(reversal.protectionPrice)){
    protectionPrice=Number(reversal.protectionPrice);
    protectionOrigin={type:'REVERSAL_PRICE_PROTECTION',price:protectionPrice,basis:reversal.locationBasis};
  }else if(direction&&wave.price){
    const basis=direction==='long'?'MIN_PRICE_SINCE_E15':'MAX_PRICE_SINCE_E15';
    const candidate=direction==='long'?wave.price.minPrice:wave.price.maxPrice;
    if(candidate!==null&&candidate!==undefined&&finite(candidate)){
      protectionPrice=Number(candidate);
      protectionOrigin={type:'PRICE_PROTECTION_SINCE_E15',price:protectionPrice,basis,waveAnchor:wave.origin||null};
    }
  }
  const protectionReady=protectionPrice!==null&&finite(protectionPrice);
  if(protectionReady){
    protectionDistanceUsd=direction==='long'?price-protectionPrice:protectionPrice-price;
    protectionBreached=protectionDistanceUsd<0;
  }

  const structuralRiskUsd=protectionReady?Math.max(0,Number(protectionDistanceUsd)):null;
  const structuralRewardTarget=structuralActive?structuralPriceTarget(wave,direction,price):null;
  const target=structuralRewardTarget||(direction?nearestTarget(frame,direction,price):null);
  const rewardSpaceUsd=target&&finite(target.distanceUsd)?Number(target.distanceUsd):null;
  const rr=finite(structuralRiskUsd)&&structuralRiskUsd>0&&finite(rewardSpaceUsd)?rewardSpaceUsd/structuralRiskUsd:null;
  const rrBlocked=finite(rr)&&rr<MIN_ENTRY_RR;

  const p50=respiration.p50;
  const minProtectionUsd=finite(p50)?Math.max(10,Number(p50)*MIN_PROTECTION_P50_FRACTION):10;
  const protectionTooTight=protectionReady&&finite(structuralRiskUsd)&&structuralRiskUsd<minProtectionUsd;

  const signed=wave.price&&finite(wave.price.signedTranslationUsd)?Number(wave.price.signedTranslationUsd):null;
  const best=wave.price&&finite(wave.price.bestTranslationUsd)?Number(wave.price.bestTranslationUsd):null;
  const phaseCounter=wave.price&&finite(wave.price.counterExcursionUsd)?Number(wave.price.counterExcursionUsd):null;
  const overrunRatio=finite(best)&&best>0&&finite(phaseCounter)?phaseCounter/best:null;
  const phaseMeaningful=finite(best)&&best>=Math.max(50,finite(p50)?Number(p50):50);
  const retainedFraction=finite(best)&&best>0&&finite(signed)?Number(signed)/Number(best):null;
  const lowRetention=phaseMeaningful&&finite(retainedFraction)&&retainedFraction<MIN_PHASE_RETAINED_FRACTION;
  const overrunStale=finite(signed)&&signed<0&&phaseMeaningful&&finite(overrunRatio)&&overrunRatio>=PHASE_OVERRUN_RATIO;
  const staleSameDirectionPhase=structuralActive&&wave.direction===direction&&(lowRetention||overrunStale);
  if(staleSameDirectionPhase)entryMode='STRUCTURAL_REASSERTION';
  const phaseRetentionBlocked=entryMode==='PHASE_CONTINUATION'&&lowRetention;
  const phaseOverrunBlocked=entryMode==='PHASE_CONTINUATION'&&overrunStale;

  const turning=sequence.memory&&sequence.memory.turning||null;
  const turningAge=sequence.agesMs&&sequence.agesMs.turning;
  const nestedAligned=!!(wave.nested3m&&wave.nested3m.direction===direction);
  const freshTurningAligned=!!(turning&&turning.direction===direction&&finite(turningAge)&&Number(turningAge)<=REASSERT_TURNING_MAX_MS);
  const reassertionRequired=entryMode==='STRUCTURAL_REASSERTION';
  const currentLocationForReassertion=locationSource==='CURRENT_WHERE';
  // WHERE reste une information de contexte et de qualite, jamais un veto d'admission.
  const reassertionReady=!reassertionRequired||(nestedAligned&&freshTurningAligned);
  const entryAllowed=!!direction&&persistent&&!regimeBlocked&&protectionReady&&!protectionBreached&&
    !rrBlocked&&!protectionTooTight&&!phaseOverrunBlocked&&!phaseRetentionBlocked&&reassertionReady;

  const reasons=[];
  if(!direction)reasons.push('direction indeterminee');
  if(counterThesisCandidateBlocked)reasons.push('reversal microstructure opposee a la these structurelle E15 prix encore active');
  if(!persistent)reasons.push('dominance actuelle non alignee/persistante');
  if(regimeBlocked)reasons.push('regime hachoir/choc');
  if(!protectionReady)reasons.push('limite de protection prix indisponible');
  if(protectionBreached)reasons.push('limite de protection prix deja franchie avant admission');
  if(protectionTooTight)reasons.push('protection prix trop proche pour la respiration normale');
  if(rrBlocked)reasons.push('R:R structurel insuffisant avant admission');
  if(phaseRetentionBlocked)reasons.push('continuation trop mature: moins de 50% de la meilleure translation conservee');
  if(phaseOverrunBlocked)reasons.push('phase E15 depassee par la contre-excursion prix');
  if(reassertionRequired&&!nestedAligned)reasons.push('reassertion structurelle: 3m non aligne');
  if(reassertionRequired&&!freshTurningAligned)reasons.push('reassertion structurelle: turning point frais absent');

  const allowedReason=entryMode==='STRUCTURAL_REASSERTION'?
    'these E15 prix active + reassertion 3m fraiche + dominance + risk; WHERE descriptif':
    entryMode==='REVERSAL_FORMING'?
      'reversal forming sans these E15 prix disponible + dominance + turning point + risk':
      'phase courante alignee avec these E15 majeure + dominance + maturite + risk; WHERE descriptif';

  return {
    direction,entryMode,entryAllowed,locationReady,locationSource,
    reason:entryAllowed?allowedReason:reasons.join(' ; '),
    sequenceUsed:['PHASE_CONTINUATION','STRUCTURAL_REASSERTION'].includes(entryMode)&&locationSource==='RECENT_WHERE',
    reversalUsed:entryMode==='REVERSAL_FORMING',
    thesis:{
      source:structuralKnown?'LATEST_MAJOR_E15_PIVOT_PLUS_PRICE_TRANSLATION':'FALLBACK_WAVE_PHASE',
      available:structuralKnown,status:structuralThesis.status||'UNKNOWN',
      direction:structuralActive?structuralThesis.direction:null,
      oscillatorPhaseDirection:wave.direction||null,
      counterThesisCandidateBlocked,
      detail:structuralKnown?structuralThesis:null
    },
    respiration:{...respiration,currentCounterExcursionUsd:counter,currentState:counterState},
    protection:{ready:protectionReady,price:protectionPrice,distanceUsd:protectionDistanceUsd,breached:protectionBreached,origin:protectionOrigin,
      semantic:'EXECUTION_PROTECTION_ONLY_NOT_TREND_INVALIDATION'},
    emergencyGuardUsd:Math.max(500,finite(respiration.p95)?respiration.p95*1.25:500),
    eligibility:{
      location:{decisionImpact:false,ready:locationReady,source:locationSource,
        semantic:'CONTEXT_AND_QUALITY_ONLY_NO_ENTRY_VETO'},
      rr:{decisionImpact:true,min:MIN_ENTRY_RR,riskUsd:structuralRiskUsd,rewardUsd:rewardSpaceUsd,ratio:rr,target,blocked:rrBlocked},
      breathingRoom:{decisionImpact:true,minProtectionUsd,actualProtectionUsd:structuralRiskUsd,p50Fraction:MIN_PROTECTION_P50_FRACTION,blocked:protectionTooTight},
      phaseMaturity:{decisionImpact:true,overrunLimit:PHASE_OVERRUN_RATIO,minRetainedFraction:MIN_PHASE_RETAINED_FRACTION,
        signedTranslationUsd:signed,bestTranslationUsd:best,counterExcursionUsd:phaseCounter,overrunRatio,retainedFraction,
        lowRetention,overrunStale,staleForFreshContinuation:lowRetention||overrunStale,
        retentionBlocked:phaseRetentionBlocked,overrunBlocked:phaseOverrunBlocked,blocked:phaseRetentionBlocked||phaseOverrunBlocked},
      reassertion:{decisionImpact:true,required:reassertionRequired,nested3mAligned:nestedAligned,freshTurningAligned,currentLocation:currentLocationForReassertion,
        locationRequired:false,turningAgeMs:finite(turningAge)?Number(turningAge):null,
        maxTurningAgeMs:REASSERT_TURNING_MAX_MS,ready:reassertionReady}
    },
    rrDecisionImpact:true,
    sizingPrinciple:'protection prix/respiration -> taille de position -> risque financier; invalidation de tendance reste distincte'
  };
}
module.exports={evaluate,zigzag};
