'use strict';
const assert=require('assert');
const shadow=require('../../modules/v4/experiments/live15-acceptance-shadow');

const bar=1_920_000_000_000;
function frame(ts,price,barTs,liveType,confirmedRows=[]){
  const live={ts:barTs,timestamp:new Date(barTs).toISOString(),
    wt1_cross_up:liveType==='UP'?-20:null,wt1_cross_dn:liveType==='DN'?25:null};
  const history=confirmedRows.map(r=>({
    ts:r.ts,timestamp:new Date(r.ts).toISOString(),
    wt1_cross_up:r.type==='UP'?r.value??-20:null,
    wt1_cross_dn:r.type==='DN'?r.value??25:null
  }));
  return {market:{timestamp:ts,price},sources:{mcb:{tfs:{'15m':{
    live,history,confirmed:history.length?history[history.length-1]:null,liveUpdateAgeMs:0
  }}}}};
}
function native(barTs,type){
  const e=type?{type,value:type==='UP'?-20:25,ts:barTs,timestamp:new Date(barTs).toISOString(),confirmed:false,provisional:true}:null;
  return {live15:{fresh:true,rowTs:barTs,up:type==='UP'?e:null,dn:type==='DN'?e:null},
    reinforcedUp:{active:false},reinforced3mUp:{active:false}};
}
function mcb(direction){
  return {nested3m:{available:true,startTs:bar+2*60000,extremeTs:bar+3*60000,
    lobeSign:direction==='long'?1:-1,structuralDirection:direction,
    structuralState:direction==='long'?'ASCENT_ACTIVE':'DESCENT_ACTIVE',
    structuralConfirmedAt:bar+3*60000,recoveryFraction:.35,currentLbw:direction==='long'?25:-25,extremeLbw:direction==='long'?35:-35}};
}
function translation(direction){
  return {status:'STRONG_TRANSLATION',horizons:{
    net3mUsd:direction==='long'?120:-120,net5mUsd:direction==='long'?170:-170,efficiency3m:.8
  }};
}
const mf={temporal:{memoryDirection:null,memoryHorizon:null,tacticalDirection:null,horizons:{}}};
const room={state:'OPEN_PATH',admissionBlocked:false};
const quality={state:'ACTIVE',admissionBlocked:false,lowEdge:false};

// Entry: a live UP can become a hypothetical actionable entry only when all other evidence is ready.
{
  const t1=bar+5*60000;
  const x1=shadow.evaluate(frame(t1,1000,bar,'UP'),null,mcb('long'),native(bar,'UP'),translation('long'),mf,room,quality,null);
  assert.equal(x1.decisionImpact,false);
  assert.equal(x1.entryShadow.signalAcceptedAsValidated,true);
  assert.equal(x1.entryShadow.actionReady,true);
  assert(x1.currentBar.entryHypothesis);
  assert.equal(x1.currentBar.entryHypothesis.direction,'long');
  assert.equal(x1.currentBar.entryHypothesis.leadMinutesToClose,10);

  const t2=bar+10*60000;
  const x2=shadow.evaluate(frame(t2,1080,bar,'UP'),null,mcb('long'),native(bar,'UP'),translation('long'),mf,room,quality,x1);
  assert.equal(x2.currentBar.entryHypothesis.maxFavorableUsd,80);

  const nextBar=bar+15*60000;
  const resolved=shadow.evaluate(
    frame(nextBar+45000,1100,nextBar,null,[{ts:bar,type:'UP'}]),
    null,mcb('long'),native(nextBar,null),translation('long'),mf,room,quality,x2
  );
  assert(resolved.lastResolved);
  assert.equal(resolved.lastResolved.outcome,'CONFIRMED_SAME');
  assert.equal(resolved.lastResolved.entryHypothesis.confirmedSame,true);
  assert.equal(resolved.lastResolved.entryHypothesis.maxFavorableUsd,80);
  assert(Math.abs(resolved.lastResolved.firstSignalLeadMinutes-10)<1e-9);
  assert(resolved.lastResolved.confirmationAvailabilityLagMinutes>0);
}

// Entry signal present is NOT action-ready when PM 5m disagrees.
{
  const t=bar+6*60000;
  const badPm={status:'TRANSLATING',horizons:{net3mUsd:100,net5mUsd:-50,efficiency3m:.8}};
  const x=shadow.evaluate(frame(t,1000,bar,'UP'),null,mcb('long'),native(bar,'UP'),badPm,mf,room,quality,null);
  assert.equal(x.entryShadow.signalAcceptedAsValidated,true);
  assert.equal(x.entryShadow.actionReady,false);
  assert.equal(x.currentBar.entryHypothesis,null);
  assert(x.entryShadow.evidence.waits.includes('PM5_NOT_ALIGNED'));
}

// Exit: a live DN against a LONG is tracked as if it had immediate exit authority.
// If it repaints while price recovers strongly, premature-exit danger is measured.
{
  const t1=bar+4*60000;
  const pos={direction:'long',entryPrice:950,entryTimestamp:new Date(bar-10*60000).toISOString()};
  const x1=shadow.evaluate(frame(t1,1000,bar,'DN'),pos,mcb('short'),native(bar,'DN'),translation('short'),mf,room,quality,null);
  assert.equal(x1.exitShadow.opposingLiveSignal,true);
  assert(x1.currentBar.exitHypothesis);
  assert.equal(x1.currentBar.exitHypothesis.positionDirection,'long');

  // Signal disappears and price recovers +210 in the original LONG direction.
  const t2=bar+9*60000;
  const x2=shadow.evaluate(frame(t2,1210,bar,null),pos,mcb('long'),native(bar,null),translation('long'),mf,room,quality,x1);
  assert.equal(x2.currentBar.disappearanceTransitions,1);
  assert.equal(x2.currentBar.exitHypothesis.maxMissedRecoveryUsd,210);

  const nextBar=bar+15*60000;
  const resolved=shadow.evaluate(
    frame(nextBar+60000,1190,nextBar,null,[{ts:bar,type:null}]),
    null,mcb('long'),native(nextBar,null),translation('long'),mf,room,quality,x2
  );
  assert.equal(resolved.lastResolved.outcome,'REPAINT_NONE');
  assert.equal(resolved.lastResolved.exitHypothesis.repaintNone,true);
  assert.equal(resolved.lastResolved.exitHypothesis.prematureRecoveryReference,true);
  assert.equal(resolved.lastResolved.exitHypothesis.maxMissedRecoveryUsd,210);
}

// Opposite confirmed type is classified distinctly from a disappearance.
{
  const t1=bar+3*60000;
  const x1=shadow.evaluate(frame(t1,1000,bar,'UP'),null,mcb('long'),native(bar,'UP'),translation('long'),mf,room,quality,null);
  const nextBar=bar+15*60000;
  const resolved=shadow.evaluate(
    frame(nextBar+60000,980,nextBar,null,[{ts:bar,type:'DN'}]),
    null,mcb('short'),native(nextBar,null),translation('short'),mf,room,quality,x1
  );
  assert.equal(resolved.lastResolved.outcome,'REPAINT_OPPOSITE');
  assert.equal(resolved.lastResolved.entryHypothesis.repaintOpposite,true);
}



// Missing 3m start timestamp must never fabricate a gigantic lobe age / SETUP_LATE.
{
  const t=bar+7*60000;
  const noStart={nested3m:{available:true,startTs:null,lobeSign:1,structuralDirection:'long',
    structuralState:'ASCENT_ACTIVE',structuralConfirmedAt:bar+3*60000,recoveryFraction:.05,currentLbw:50,extremeLbw:55}};
  const x=shadow.evaluate(frame(t,1000,bar,'UP'),null,noStart,native(bar,'UP'),translation('long'),mf,room,quality,null);
  assert.equal(x.entryShadow.evidence.timing.blocksNewEntry,false);
  assert.equal(x.entryShadow.evidence.timing.lobeAgeMinutes,null);
  assert.equal(x.entryShadow.evidence.timing.timingOriginSource,'UNAVAILABLE');
}

console.log('V4 live15 acceptance shadow tests OK');
