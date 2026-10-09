'use strict';
const {opposite}=require('../core/utils');
const {ECONOMIC_MOVE_MIN_USD}=require('./market-quality');

const TP1_FRACTION=.25;
const MFE_MINIMUM_USD=ECONOMIC_MOVE_MIN_USD*2;
const MFE_GIVEBACK_REFERENCE_USD=180;
const RUNNER_GIVEBACK_USD=MFE_GIVEBACK_REFERENCE_USD*2;

function mfStructureSupportsPosition(position,mf){
  if(!position||!mf||!mf.available)return {ready:false,reason:'MF_STRUCTURE_UNAVAILABLE'};
  const d=position.direction,state=mf.structuralState,ext=mf.extensionState;
  const breakAgainst=(d==='long'&&['DOWN_STRUCTURE_BREAK','DOWN_EXTENSION'].includes(ext))||
    (d==='short'&&['UP_STRUCTURE_BREAK','UP_EXTENSION'].includes(ext));
  const aligned=(d==='long'&&state==='ADVANCING_UP')||(d==='short'&&state==='ADVANCING_DOWN');
  const ready=!!(aligned&&!breakAgainst);
  return {ready,direction:d,structuralState:state,extensionState:ext,highRelation:mf.highRelation||null,lowRelation:mf.lowRelation||null,reason:ready?'MF_STRUCTURE_ALIGNED':breakAgainst?'MF_STRUCTURE_BREAK_AGAINST_POSITION':'MF_STRUCTURE_NOT_ALIGNED'};
}

function stage(thesis,translation,ticker){
  if(thesis&&thesis.state==='TRANSITION_NEUTRAL')return {state:'OBSERVE',direction:null,candidateDirection:thesis.candidateDirection||null,reason:'MCB transition is observed but has not matured into an actionable forming thesis'};
  const dir=thesis&&thesis.direction||null;
  if(!dir)return {state:'OBSERVE',direction:null,reason:'MCB thesis unclear'};
  const translating=translation&&translation.aligned&&
    ['TRANSLATING','STRONG_TRANSLATION'].includes(translation.status);
  const confirmed=!!(translating&&ticker&&ticker.confirmed);
  if(confirmed)return {state:'CONFIRMED',direction:dir,
    reason:'MCB thesis + PM live translation + ticker confirmation'};
  if(translating)return {state:'THESIS_TRANSLATING',direction:dir,
    reason:'MCB thesis is translating in price; ticker confirmation incomplete'};
  return {state:'THESIS_FORMING',direction:dir,
    reason:'MCB proposes thesis; waiting for PM live translation and ticker confirmation'};
}


function directionAligned(v,direction){
  const n=Number(v);
  return Number.isFinite(n)&&((direction==='long'&&n>0)||(direction==='short'&&n<0));
}
function entryContinuityProof(setup,translation,marketQuality){
  const direction=setup&&setup.direction||null;
  const h=translation&&translation.horizons||{};
  const nativeBypass=!!(setup&&setup.reinforcedUpBypass&&direction==='long');
  const net3Aligned=directionAligned(h.net3mUsd,direction);
  const net5Aligned=directionAligned(h.net5mUsd,direction);
  const eff3=Number(h.efficiency3m);
  const q=marketQuality&&marketQuality.state||setup&&setup.marketQuality||'UNKNOWN';
  const lowEfficiencyRegime=['CHOP_SHADOW','LOW_EDGE_SHADOW'].includes(q);

  if(nativeBypass){
    return {ready:true,nativeBypass:true,quality:q,net3Aligned,net5Aligned,efficiency3m:Number.isFinite(eff3)?eff3:null,
      reason:'reinforced native MCB event bypasses rolling continuity requirement'};
  }
  if(!net3Aligned){
    return {ready:false,nativeBypass:false,quality:q,net3Aligned:false,net5Aligned,efficiency3m:Number.isFinite(eff3)?eff3:null,
      reason:'fresh PM impulse is not yet supported by rolling 3m conversion'};
  }
  if(lowEfficiencyRegime){
    const minEff=.25*1.5;
    const ready=net5Aligned&&Number.isFinite(eff3)&&eff3>=minEff;
    return {ready,nativeBypass:false,quality:q,net3Aligned,net5Aligned,efficiency3m:Number.isFinite(eff3)?eff3:null,minEfficiency3m:minEff,
      reason:ready?'CHOP/LOW_EDGE proof sustained across 3m+5m with stronger efficiency':'CHOP/LOW_EDGE requires 3m+5m directional continuity and >=37.5% 3m efficiency'};
  }
  return {ready:true,nativeBypass:false,quality:q,net3Aligned,net5Aligned,efficiency3m:Number.isFinite(eff3)?eff3:null,
    reason:'rolling 3m conversion supports the fresh post-setup impulse'};
}
function adversePmProof(position,translation){
  if(!position||!translation)return {ready:false};
  const opp=opposite(position.direction),h=translation.horizons||{};
  const net3=Number(h.net3mUsd),eff3=Number(h.efficiency3m);
  const netOpp=directionAligned(net3,opp);
  const status=['STRONG_OPPOSITE_TRANSLATION','OPPOSITE_TRANSLATION'].includes(translation.status);
  const strong=translation.status==='STRONG_OPPOSITE_TRANSLATION'||
    (translation.status==='OPPOSITE_TRANSLATION'&&Number.isFinite(net3)&&Math.abs(net3)>=50&&Number.isFinite(eff3)&&eff3>=.4);
  return {ready:!!(netOpp&&status&&strong),opp,status:translation.status,net3mUsd:net3,efficiency3m:Number.isFinite(eff3)?eff3:null};
}
function adverseMicroProof(position,ticker){
  if(!position||!ticker)return {ready:false};
  const opp=opposite(position.direction),cur=ticker.current||{};
  const y75=Number(cur.yieldVsP75),effort=Number(cur.effortVsP75);
  const rawOpp=ticker.direction===opp;
  const productive=Number.isFinite(y75)&&y75>=1;
  const meaningfulEffort=(Number.isFinite(effort)&&effort>=1)||(Number.isFinite(y75)&&y75>=2);
  const ready=!!(ticker.oppositeConfirmed||(rawOpp&&productive&&meaningfulEffort));
  return {ready,opp,status:ticker.status,direction:ticker.direction,yieldVsP75:Number.isFinite(y75)?y75:null,effortVsP75:Number.isFinite(effort)?effort:null};
}
function structuralPivotBreachExit(position,mcb,background,risk){
  if(!position||position.direction!=='long')return null;
  const h4=background&&background.fourHour||{};
  const deep4h=!!(
    h4.available&&h4.lobeType==='CREUX'&&h4.structuralDirection==='short'&&
    Number.isFinite(Number(h4.extremeLbw))&&Number(h4.extremeLbw)<=-60
  );
  if(!deep4h)return null;
  const entryMcb=position.context&&position.context.mcb||{};
  const entryPivot=entryMcb.currentLobe&&entryMcb.currentLobe.structuralPivot||null;
  if(!entryPivot||entryPivot.type!=='CREUX')return null;
  const currentLbw=mcb&&mcb.currentLobe&&Number(mcb.currentLobe.currentLbw);
  const currentPrice=risk&&risk.position&&Number(risk.position.currentPrice);
  if(!Number.isFinite(currentLbw)||!Number.isFinite(currentPrice))return null;
  const priceBreached=currentPrice<Number(entryPivot.price);
  const lbwBreached=currentLbw<Number(entryPivot.lbw);
  if(!(priceBreached&&lbwBreached))return null;
  return {
    type:'EXIT_STRUCTURAL_PIVOT_BREACH',direction:position.direction,stage:'STRUCTURAL_INVALIDATION',
    reason:'deep-4h reversal LONG lost the confirmed 15m trough that supported entry: both price and LBW breached the pivot; the ascent leg is invalidated without waiting for a new E15/DN',
    evidence:{
      fourHourExtremeLbw:Number(h4.extremeLbw),
      pivotPrice:Number(entryPivot.price),pivotLbw:Number(entryPivot.lbw),
      currentPrice,currentLbw,priceBreached,lbwBreached,
      pivotExtremeTs:entryPivot.extremeTs||null,pivotConfirmedAt:entryPivot.confirmedAt||null
    }
  };
}

function executionFailureExit(position,translation,ticker,risk){
  const rp=risk&&risk.position||null;
  if(!position||!rp)return null;
  const mfe=Number(rp.mfeUsd)||0,current=Number(rp.currentSignedUsd)||0;
  const entryRange=position&&position.context&&position.context.structuralRoom&&position.context.structuralRoom.rangeRr||null;
  const reclaimRisk=!!(
    entryRange&&(
      (position.direction==='long'&&entryRange.quality==='LONG_RECLAIM_REQUIRED')||
      (position.direction==='short'&&entryRange.quality==='SHORT_RECLAIM_REQUIRED')
    )
  );
  const mfeCeiling=reclaimRisk?ECONOMIC_MOVE_MIN_USD:ECONOMIC_MOVE_MIN_USD*.25;
  const pm=adversePmProof(position,translation),micro=adverseMicroProof(position,ticker);
  if(current<0&&mfe<=mfeCeiling&&pm.ready&&micro.ready){
    return {
      type:'EXIT_EXECUTION_FAILURE',direction:position.direction,stage:'EXECUTION_FAILURE',
      reason:reclaimRisk
        ?'range reclaim attempt failed to generate an economic MFE before adverse PM conversion and adverse microstructure took control; exit without waiting for MCB thesis invalidation'
        :'entry failed to generate meaningful MFE while adverse PM conversion and adverse microstructure persist; exit without waiting for MCB thesis invalidation',
      evidence:{currentSignedUsd:current,mfeUsd:mfe,mfeCeilingUsd:mfeCeiling,reclaimRisk,entryRange:entryRange?{
        quality:entryRange.quality,location:entryRange.location,val:entryRange.val,poc:entryRange.poc,vah:entryRange.vah
      }:null,pm,micro}
    };
  }
  return null;
}
function mfeProtectionExit(position,translation,ticker,risk,mcb=null,thesis=null,mfStructure=null){
  const rp=risk&&risk.position||null;
  if(!position||!rp)return null;
  const mfe=Number(rp.mfeUsd)||0,current=Number(rp.currentSignedUsd)||0;
  const giveback=mfe-current;
  const pm=adversePmProof(position,translation),micro=adverseMicroProof(position,ticker);
  if(!(current>0&&mfe>=MFE_MINIMUM_USD&&giveback>=MFE_GIVEBACK_REFERENCE_USD&&pm.ready&&micro.ready))return null;

  const thesisAligned=!!(thesis&&thesis.direction===position.direction);
  const mfSupport=mfStructureSupportsPosition(position,mfStructure);
  const structuralSupport=!!(thesisAligned&&mfSupport.ready);
  const tp1Taken=!!position.tp1Taken;

  // First real adverse stress after a large MFE: if MCB + MF still carry the
  // position and only one respiration unit has been surrendered, monetize a
  // small tranche instead of killing the campaign.
  if(!tp1Taken&&structuralSupport&&giveback<RUNNER_GIVEBACK_USD){
    return {
      type:'TAKE_PROFIT_PARTIAL',direction:position.direction,stage:'TP1_STRESS_TEST',
      reason:'large MFE meets a productive adverse stress test, but MCB thesis and MF15 staircase still support the campaign; secure 25% and keep a 75% runner',
      evidence:{
        fraction:TP1_FRACTION,currentSignedUsd:current,mfeUsd:mfe,givebackUsd:giveback,
        minimumUsefulUsd:MFE_MINIMUM_USD,givebackReferenceUsd:MFE_GIVEBACK_REFERENCE_USD,
        runnerGivebackUsd:RUNNER_GIVEBACK_USD,thesisAligned,mfSupport,pm,micro
      }
    };
  }

  // After TP1 the runner is allowed one extra respiration unit while the
  // structure remains aligned. Other exits (risk/native/MCB flip) remain active.
  if(tp1Taken&&structuralSupport&&giveback<RUNNER_GIVEBACK_USD)return null;

  return {
    type:'EXIT_MFE_PROTECTION',direction:position.direction,stage:'GAIN_PROTECTION',
    reason:tp1Taken
      ?'runner surrendered the extended giveback allowance after TP1, or structural MF/MCB support no longer justifies holding; monetize the remaining position'
      :'large MFE is being materially surrendered while PM conversion and microstructure are adverse; monetize gain without declaring the MCB thesis invalid',
    evidence:{
      currentSignedUsd:current,mfeUsd:mfe,givebackUsd:giveback,
      minimumUsefulUsd:MFE_MINIMUM_USD,givebackReferenceUsd:MFE_GIVEBACK_REFERENCE_USD,
      runnerGivebackUsd:RUNNER_GIVEBACK_USD,tp1Taken,thesisAligned,mfSupport,pm,micro
    }
  };
}

function nativeSignalExit(position,mcb,translation,nativeSignal){
  if(!position||!nativeSignal)return null;
  const entryTs=Date.parse(position.entryTimestamp||'');
  const opp=opposite(position.direction);
  const strong=nativeSignal.reinforcedUp&&nativeSignal.reinforcedUp.active&&position.direction==='short'
    ?nativeSignal.reinforcedUp.event:null;
  if(strong&&Number(strong.ts)>=entryTs){
    return {type:'EXIT_NATIVE_STRONG_SIGNAL',direction:position.direction,stage:'MCB_NATIVE_PROTECTION',
      reason:'confirmed 15m MCB UP_REINFORCED at/below -60 after short entry; strategic 15m native event overrides slow exit chain',
      evidence:{signal:'UP_REINFORCED_15M',value:strong.value,signalTs:strong.ts}};
  }
  const e=nativeSignal.latest;
  if(!e||Number(e.ts)<entryTs||!nativeSignal.recent)return null;
  const opposed=(position.direction==='long'&&e.type==='DN')||(position.direction==='short'&&e.type==='UP');
  if(!opposed)return null;
  const n=mcb&&mcb.nested3m||{};
  const into=Number(n.lobeSign)>0?'long':Number(n.lobeSign)<0?'short':null;
  const mcb3Opposing=n.turningDirection===opp||into===opp;
  const net3=translation&&translation.horizons&&Number(translation.horizons.net3mUsd);
  const pmOpposing=Number.isFinite(net3)&&((opp==='long'&&net3>0)||(opp==='short'&&net3<0));
  if(mcb3Opposing&&pmOpposing){
    return {type:'EXIT_NATIVE_SIGNAL_PROTECTION',direction:position.direction,stage:'MCB_NATIVE_PROTECTION',
      reason:'confirmed native MCB '+e.type+' after entry + 3m/PM move in opposite direction',
      evidence:{signal:e.type,value:e.value,signalTs:e.ts,mcb3Opposing,pmOpposing,net3mUsd:net3}};
  }
  return null;
}

function evaluate(frame,position,mcb,thesis,translation,ticker,risk,entry=null){
  const s=stage(thesis,translation,ticker);
  if(!position){
    const setup=entry&&entry.setup||null;
    if(!setup||setup.status!=='SETUP'){
      return {type:'NO_TRADE',direction:null,stage:'OBSERVE',candidateDirection:setup&&setup.candidateDirection||null,
        reason:setup&&setup.reason||'no armed structural setup'};
    }
    const es=stage(entry.thesis,entry.translation,entry.ticker);
    const fresh=entry.translation&&entry.translation.sinceSetup||null;
    const nativeBypass=!!(setup.reinforcedUpBypass&&setup.direction==='long');
    const nativeFreshReady=!!(nativeBypass&&fresh&&fresh.available&&Number(fresh.netUsd)>=50&&Number(fresh.efficiency)>=.12);
    const continuity=entryContinuityProof(setup,entry.translation,entry.marketQuality||null);
    const pmReady=!!(
      entry.translation&&['TRANSLATING','STRONG_TRANSLATION'].includes(entry.translation.status)&&
      entry.translation.materiality&&entry.translation.materiality.passed&&
      continuity.ready
    );
    if(nativeFreshReady){
      return {type:'ENTER_LONG',direction:'long',stage:'NATIVE_REINFORCED_BYPASS',setupId:setup.setupId,
        reason:'UP_REINFORCED <= -60 + local MCB sync + fresh bullish translation; 1H/ticker confirmation bypassed for this asymmetric native MCB event',
        evidence:{netSinceSetupUsd:Number(fresh.netUsd),grossSinceSetupUsd:Number(fresh.grossUsd),efficiencySinceSetup:Number(fresh.efficiency)}};
    }
    if(pmReady){
      return {type:setup.direction==='long'?'ENTER_LONG':'ENTER_SHORT',direction:setup.direction,
        stage:'SETUP_PM_READY',setupId:setup.setupId,
        reason:'fresh post-setup PM translation + efficiency materiality authorize execution; ticker qualifies conviction but is not an admission gate',
        evidence:{
          netSinceSetupUsd:fresh&&Number(fresh.netUsd),grossSinceSetupUsd:fresh&&Number(fresh.grossUsd),
          efficiencySinceSetup:fresh&&Number(fresh.efficiency),tickerStatus:entry.ticker&&entry.ticker.status||null,
          tickerConfirmed:!!(entry.ticker&&entry.ticker.confirmed),continuityProof:continuity
        }};
    }
    if(es.state==='CONFIRMED'&&continuity.ready){
      return {type:es.direction==='long'?'ENTER_LONG':'ENTER_SHORT',direction:es.direction,
        stage:'SETUP_CONFIRMED',reason:'fresh post-setup PM translation is ready, continuity proof passes, and ticker also confirms conviction',setupId:setup.setupId,
        evidence:{continuityProof:continuity}};
    }
    return {type:'WATCH',direction:setup.direction,stage:'SETUP_BUILDING',setupId:setup.setupId,
      reason:nativeBypass?'UP_REINFORCED setup armed; waiting for fresh PM translation/efficiency (ticker is only a conviction qualifier)':
        (!continuity.ready?'fresh PM exists but rolling conversion quality is insufficient: '+continuity.reason:
        'setup armed; waiting for fresh post-setup PM translation + efficiency; ticker is not required'),
      evidence:{continuityProof:continuity}};
  }
  if(risk&&risk.hardStopBreached){
    return {type:'EXIT_RISK',direction:position.direction,stage:s.state,
      reason:risk.hardStopReason||'V4 hard absolute risk cap 500 USD breached',
      evidence:{hardStopSource:risk.hardStopSource||null,maeUsd:risk.position&&risk.position.maeUsd,currentLossUsd:risk.position&&risk.position.lossUsd}};
  }
  const structuralBreach=structuralPivotBreachExit(position,mcb,entry&&entry.background||null,risk);
  if(structuralBreach)return structuralBreach;
  const executionFailure=executionFailureExit(position,translation,ticker,risk);
  if(executionFailure)return executionFailure;
  const gainProtection=mfeProtectionExit(position,translation,ticker,risk,mcb,thesis,entry&&entry.mfStructureShadow||null);
  if(gainProtection)return gainProtection;
  const nativeExit=nativeSignalExit(position,mcb,translation,entry&&entry.nativeSignal||null);
  if(nativeExit)return nativeExit;
  const opp=opposite(position.direction);
  const mcbOpposite=thesis&&thesis.direction===opp;
  const pmOpposite=translation&&translation.aligned&&translation.thesisDirection===opp&&
    ['TRANSLATING','STRONG_TRANSLATION'].includes(translation.status);
  const tickerOpposite=!!(ticker&&ticker.confirmed&&ticker.thesisDirection===opp);
  if(mcbOpposite&&pmOpposite&&tickerOpposite){
    const current=risk&&risk.position&&Number(risk.position.currentSignedUsd)||0;
    const mfe=risk&&risk.position&&Number(risk.position.mfeUsd)||0;
    return {
      type:current>0||mfe>0?'EXIT_PROFIT_PROTECTION':'EXIT_MCB_FLIP',
      direction:position.direction,stage:'OPPOSITE_TRANSLATION',
      reason:'MCB proposes opposite thesis and PM live + ticker confirm its translation',
      evidence:{oppositeDirection:opp,currentSignedUsd:current,mfeUsd:mfe,
        mcbState:thesis.state,pmState:translation.status,tickerState:ticker.status}
    };
  }
  const entryTs=Date.parse(position.entryTimestamp||'');
  const tactical3m=entry&&entry.nativeSignal&&entry.nativeSignal.reinforced3mUp||null;
  const tacticalEvent=tactical3m&&tactical3m.event||null;
  const tacticalRespiration=!!(
    position.direction==='short'&&tactical3m&&tactical3m.active&&tacticalEvent&&
    Number.isFinite(entryTs)&&Number(tacticalEvent.ts)>=entryTs
  );
  if(tacticalRespiration){
    return {type:'HOLD',direction:position.direction,stage:'RESPIRATION_ALERT',
      reason:'UP_REINFORCED_3M after SHORT entry: tactical respiration alert only; 3m has no standalone authority to exit the 15m campaign',
      evidence:{signal:'UP_REINFORCED_3M',value:tacticalEvent.value,signalTs:tacticalEvent.ts,exitAuthority:false}};
  }
  return {type:'HOLD',direction:position.direction,stage:s.state,
    reason:mcbOpposite?'opposite MCB thesis not yet confirmed by both PM live and ticker':'current position not falsified by V4 hierarchy'};
}
module.exports={evaluate,stage,nativeSignalExit,entryContinuityProof,adversePmProof,adverseMicroProof,structuralPivotBreachExit,executionFailureExit,mfeProtectionExit,mfStructureSupportsPosition,directionAligned,TP1_FRACTION,MFE_MINIMUM_USD,MFE_GIVEBACK_REFERENCE_USD,RUNNER_GIVEBACK_USD};
