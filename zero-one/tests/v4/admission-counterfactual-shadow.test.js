'use strict';
const assert=require('assert');
const sh=require('../../modules/v4/experiments/admission-counterfactual-shadow');
const base=1_950_000_000_000;
function frame(ts,price){return {market:{timestamp:ts,price}};}
function pb(dir){return {interesting:true,waveEstablished:true,waveAligned:true,direction:dir,state:'INTERESTING_PRICE_WITH_WAVE',travel:{state:'EASY_TRAVEL'},relationToSignalMemory:'WITH_SIGNAL_MEMORY',signalMemory:{direction:dir,sequence:'SIGNAL3_TO_SIGNAL15'},pm:{multiHorizonDirection:dir,net3mUsd:dir==='long'?80:-80,net5mUsd:dir==='long'?120:-120,efficiency3m:.65}};}
function mcb(dir,structOpp=true){return {dataQuality:{degraded:false,state:'DATA_OK'},nested3m:{lobeDirection:dir,structuralDirection:structOpp?(dir==='long'?'short':'long'):dir,structuralState:structOpp?'DESCENT_ACTIVE':'ASCENT_ACTIVE',structuralConfirmedAt:base-180000,currentLbw:dir==='long'?30:-30,extremeLbw:dir==='long'?40:-40}};}
function setup(dir,reasons,status='OBSERVE'){return {status,candidateDirection:dir,direction:status==='SETUP'?dir:null,setupKey:dir+'|A',reasons,reason:reasons.join(' + ')};}
const room={state:'OPEN_PATH',nearestAhead:null};
const quality={state:'ACTIVE'};
const mf={temporal:{state:'FALLING_AND_TRANSLATING',memoryDirection:'short',memoryHorizon:'h4',tacticalDirection:'short'}};

{
  const t=base;
  const x=sh.evaluate(frame(t,1000),null,setup('short',['WAIT_3M_15M_SYNC']),{candidateDirection:'short'},mcb('short',true),pb('short'),{live3:{fresh:false}},mf,room,quality,null);
  assert.equal(x.decisionImpact,false);
  assert.equal(x.state,'TRACKING_BLOCKED_OPPORTUNITY');
  assert.deepEqual(x.activeEpisode.initialBlockers,['WAIT_SYNC']);
  assert.equal(x.activeEpisode.triggerPrice,1000);

  const liveDn={type:'DN',value:35,ts:t+60000};
  const y=sh.evaluate(frame(t+60000,1080),null,setup('short',['WAIT_3M_15M_SYNC']),{candidateDirection:'short'},mcb('short',true),pb('short'),{live3:{fresh:true,dn:liveDn,up:null},last3mDn:null},mf,room,quality,x);
  assert(y.activeEpisode.live3ContinuationAt);
  assert.equal(y.activeEpisode.maxAdverseUsd,80);

  const confirmedDn={type:'DN',value:35,ts:t+120000};
  const z=sh.evaluate(frame(t+120000,750),null,setup('short',['WAIT_3M_15M_SYNC']),{candidateDirection:'short'},mcb('short',false),pb('short'),{live3:{fresh:false},last3mDn:confirmedDn},mf,room,quality,y);
  assert.equal(z.activeEpisode.maxFavorableUsd,250);
  assert(z.activeEpisode.hit220At);
  assert.equal(z.activeEpisode.success220BeforeMinus180,true);
  assert(z.activeEpisode.confirmed3ContinuationAt);
  assert(z.activeEpisode.structuralAlignedAt);
  assert.equal(z.summary.WAIT_SYNC.hit220,1);

  const opened=sh.evaluate(frame(t+180000,740),null,setup('short',[],'SETUP'),{candidateDirection:'short'},mcb('short',false),pb('short'),{live3:{fresh:false},last3mDn:confirmedDn},mf,room,quality,z);
  assert.equal(opened.state,'IDLE');
  assert.equal(opened.completed.length,1);
  assert.equal(opened.completed[0].resolution,'SETUP_OPENED');
}

// Data degraded never starts a counterfactual episode.
{
  const mm=mcb('long',true);mm.dataQuality={degraded:true,state:'DATA_DEGRADED'};
  const x=sh.evaluate(frame(base,1000),null,setup('long',['WAIT_3M_15M_SYNC']),{candidateDirection:'long'},mm,pb('long'),{live3:{fresh:false}},mf,room,quality,null);
  assert.equal(x.activeEpisode,null);
}

// PM must be genuinely aligned on 3m+5m; interesting price alone is insufficient.
{
  const p=pb('long');p.pm.multiHorizonDirection='short';
  const x=sh.evaluate(frame(base,1000),null,setup('long',['LOW_EDGE_REQUIRES_MAJOR_MCB_OR_REINFORCED_UP']),{candidateDirection:'long'},mcb('long',true),p,{live3:{fresh:false}},mf,room,quality,null);
  assert.equal(x.strictQualification.ready,false);
  assert.equal(x.activeEpisode,null);
}
console.log('V4 admission counterfactual shadow tests OK');
