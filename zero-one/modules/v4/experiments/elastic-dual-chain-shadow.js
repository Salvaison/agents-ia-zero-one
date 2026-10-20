'use strict';
// Elastic v0.4 — simultaneous directional narratives. OBSERVATION ONLY.
// The V4 action, setup, risk and legacy Elastic v0.3 remain unchanged.
const v03=require('./elastic-sync-shadow');
const VERSION='elastic-dual-chain-shadow-v0.4';
const KEEP_EVENTS=24,KEEP_PROOFS=64;
const DIRECTIONS=['long','short'];
const other=d=>d==='long'?'short':'long';
const finite=x=>x!==null&&x!==undefined&&Number.isFinite(Number(x));
const signed=(x,d)=>finite(x)&&(d==='long'?Number(x)>0:Number(x)<0);
const stamp=e=>e&&finite(e.ts)?Number(e.ts):null;
const num=x=>finite(x)?Number(x):null;
function lastAudit(frame){const a=frame&&frame.sources&&frame.sources.auditRows||[];return a[a.length-1]||{};}
function liveTf(frame,tf){return frame&&frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs&&frame.sources.mcb.tfs[tf]&&frame.sources.mcb.tfs[tf].live||{};}
function recordEvent(story,ts,price,direction,type,name,group,sourceTs){
  const item={ts,price,direction,type,name,group,sourceTs:sourceTs||null};
  return story.concat([item]).slice(-KEEP_EVENTS);
}
function sourceOf(name,snap){
  const map={E3_LIVE:'e3Live',E3_CONFIRMED:'e3Confirmed',E15_LIVE:'e15Live',
    E15_CONFIRMED:'e15Confirmed',E3_OPPOSITE_LIVE:'opp3Live',
    E3_OPPOSITE_CONFIRMED:'opp3Confirmed',E15_OPPOSITE_LIVE:'opp15Live',
    E15_OPPOSITE_CONFIRMED:'opp15Confirmed'};
  return map[name]?stamp(snap.refs&&snap.refs[map[name]]):null;
}
function family(name){
  if(name.startsWith('MF'))return 'FLOW';
  if(name.startsWith('MA'))return 'BOUNDARY';
  if(name.startsWith('E3')||name.startsWith('LBW3')||name.startsWith('LOBE3')||name.startsWith('STRUCT3'))return 'MCB3';
  if(name.startsWith('E15')||name.startsWith('LBW15')||name.startsWith('MCB15')||name.startsWith('STRUCT15'))return 'MCB15';
  if(name.startsWith('PM')||name.startsWith('PRICE')||name.includes('TRAVEL')||name.includes('EFFORT'))return 'CONVERSION';
  return 'CONTEXT';
}
function measures(frame,snap,translation,ticker,mf){
  const a=lastAudit(frame),t=ticker&&ticker.current||{},h=translation&&translation.horizons||{};
  const b3=liveTf(frame,'3m'),b15=liveTf(frame,'15m');
  const m3=v03.auditSlope(frame.sources&&frame.sources.auditRows,'liveMoneyFlow',3);
  const l3=v03.auditSlope(frame.sources&&frame.sources.auditRows,'liveLbw',3);
  return {...snap.values,pmLive:num(a.priceMove),mf3:num(a.liveMoneyFlow),
    mf15:num(a.live15MoneyFlow),mf3Slope:m3,mf15Slope:num(snap.values.mf15Slope),
    lbw3Slope:l3,lbw15Slope:num(snap.values.lbw15Slope),
    priceSlope3:num(h.net3mUsd),effortVsP75:num(t.effortVsP75),
    yieldVsP75:num(t.yieldVsP75),yieldVsP95:num(t.yieldVsP95),
    cadence:num(t.cadence),flowBtcPerSec:num(t.flowBtcPerSec),
    mfMemoryDirection:mf&&mf.temporal&&mf.temporal.memoryDirection||null,
    mfMemoryHorizon:mf&&mf.temporal&&mf.temporal.memoryHorizon||null,
    mfTacticalDirection:mf&&mf.temporal&&mf.temporal.tacticalDirection||null,
    mcb3High:num(b3.high),mcb3Low:num(b3.low),mcb15High:num(b15.high),mcb15Low:num(b15.low)};
}
function conditionsFor(direction,snap,v,previous,frame,mcb){
  const p=previous&&previous.measures||{},price=num(frame.market.price);
  const c=mcb&&mcb.currentLobe||{};
  const conditions={...snap.conditions,
    MCB15_CREST:direction==='short'&&c.type==='CRETE',
    MCB15_TROUGH:direction==='long'&&c.type==='CREUX',
    MF3_SLOPE_ALIGNED:signed(v.mf3Slope,direction),
    MF3_SLOPE_OPPOSITE:signed(v.mf3Slope,other(direction)),
    MF15_SLOPE_ALIGNED:signed(v.mf15Slope,direction),
    MF15_SLOPE_OPPOSITE:signed(v.mf15Slope,other(direction)),
    PM_LIVE_ALIGNED:signed(v.pmLive,direction),
    PM_LIVE_OPPOSITE:signed(v.pmLive,other(direction)),
    EASY_TRAVEL_ALIGNED:!!(snap.values.priceDirection===direction&&['EASY_TRAVEL','EXTREME_EASY_TRAVEL'].includes(snap.values.travelState)),
    PRODUCTIVE_TRAVEL_ALIGNED:!!(snap.values.priceDirection===direction&&['PRODUCTIVE_TRAVEL','EXTREME_PRODUCTIVE_TRAVEL'].includes(snap.values.travelState)),
    HIGH_EFFORT_LOW_YIELD:!!(snap.values.travelState==='HIGH_EFFORT_LOW_YIELD'&&snap.values.priceDirection===direction),
    LBW3_ACCELERATING:signed(v.lbw3Slope,direction)&&signed(p.lbw3Slope,direction)&&Math.abs(v.lbw3Slope)>Math.abs(p.lbw3Slope),
    LBW15_ACCELERATING:signed(v.lbw15Slope,direction)&&signed(p.lbw15Slope,direction)&&Math.abs(v.lbw15Slope)>Math.abs(p.lbw15Slope),
    MF3_ACCELERATING:signed(v.mf3Slope,direction)&&signed(p.mf3Slope,direction)&&Math.abs(v.mf3Slope)>Math.abs(p.mf3Slope),
    PRICE_LBW3_DISAGREE:!!(signed(v.priceSlope3,direction)&&signed(v.lbw3Slope,other(direction))),
    MF_MEMORY_ALIGNED:v.mfMemoryDirection===direction,
    MF_TACTICAL_ALIGNED:v.mfTacticalDirection===direction,
    MA3_TOUCH_REJECTION_CANDIDATE:!!(finite(v.ma3)&&finite(price)&&(
      direction==='short'?(finite(v.mcb3High)&&v.mcb3High>=v.ma3&&price<v.ma3)
      :(finite(v.mcb3Low)&&v.mcb3Low<=v.ma3&&price>v.ma3))),
    MA15_TOUCH_REJECTION_CANDIDATE:!!(finite(v.ma15)&&finite(price)&&(
      direction==='short'?(finite(v.mcb15High)&&v.mcb15High>=v.ma15&&price<v.ma15)
      :(finite(v.mcb15Low)&&v.mcb15Low<=v.ma15&&price>v.ma15)))
  };
  return conditions;
}
function evolve(previous,direction,frame,mcb,translation,ticker,mf,story){
  const now=Number(frame.market.timestamp),price=Number(frame.market.price);
  const snap=v03.eventSnapshot(frame,direction,mcb,mcb.nativeSignal||{},translation,mcb.priceBehavior||{});
  const v=measures(frame,snap,translation,ticker,mf);
  const flags=conditionsFor(direction,snap,v,previous,frame,mcb);
  const old=previous&&previous.proofs||{};
  const proofs={};let narrative=story;
  for(const [name,present] of Object.entries(flags)){
    const prior=old[name]||null;const on=!!present,src=sourceOf(name,snap);
    let p=prior?{...prior}:{name,group:family(name),firstSeenAt:null,seenCount:0,reaffirmations:0,
      activeSince:null,lastSeenAt:null,lastFadedAt:null,sourceTs:null,state:'NOT_SEEN'};
    if(on){
      if(!p.firstSeenAt)p.firstSeenAt=now;
      if(p.state!=='ACTIVE'){
        if(prior&&prior.seenCount>0)p.reaffirmations++;
        p.activeSince=now;
        narrative=recordEvent(narrative,now,price,direction,prior?'REASSERTED':'OBSERVED',name,p.group,src);
      }else if(src&&src!==p.sourceTs){
        narrative=recordEvent(narrative,now,price,direction,'NEW_SOURCE_EVENT',name,p.group,src);
        p.activeSince=now;
      }
      p.seenCount++;p.lastSeenAt=now;p.state='ACTIVE';
    }else if(p.state==='ACTIVE'){
      p.lastFadedAt=now;p.state='FADED';p.activeSince=null;
      narrative=recordEvent(narrative,now,price,direction,'FADED',name,p.group,src);
    }
    if(src)p.sourceTs=src;
    if(p.firstSeenAt)proofs[name]=p;
  }
  const retained=Object.entries(proofs).sort((a,b)=>(b[1].lastSeenAt||0)-(a[1].lastSeenAt||0)).slice(0,KEEP_PROOFS);
  const kept=Object.fromEntries(retained);
  const active=Object.values(kept).filter(p=>p.state==='ACTIVE');
  const positive=active.filter(p=>!p.name.includes('OPPOSITE')&&!p.name.includes('DISAGREE')&&!p.name.includes('LOW_YIELD'));
  const contrary=active.filter(p=>p.name.includes('OPPOSITE')||p.name.includes('DISAGREE')||p.name.includes('LOW_YIELD'));
  const supportFamilies=[...new Set(positive.map(p=>p.group))];
  const evidence=positive.sort((a,b)=>b.lastSeenAt-a.lastSeenAt).slice(0,9).map(p=>({
    name:p.name,group:p.group,ageMinutes:Number(((now-p.firstSeenAt)/60000).toFixed(1)),
    durationMinutes:p.activeSince!==null?Number(((now-p.activeSince)/60000).toFixed(1)):null,
    reaffirmations:p.reaffirmations,sourceTs:p.sourceTs}));
  return {direction,startedAt:previous&&previous.startedAt||now,
    measures:v,proofs:kept,activeProofCount:positive.length,contraryCount:contrary.length,
    families:supportFamilies,proofHighlights:evidence,story:narrative.slice(-KEEP_EVENTS),
    lastUpdatedAt:now};
}
function evaluate(frame,mcb,native,baseThesis,translation,ticker,mf,priceBehavior,previous=null){
  const now=Number(frame&&frame.market&&frame.market.timestamp);
  const prev=previous&&previous.version===VERSION?previous:null;
  const structural=mcb&&mcb.currentLobe&&mcb.currentLobe.structuralDirection||
    mcb&&mcb.structural15m&&mcb.structural15m.structuralDirection||null;
  const mcbProposal=structural||(baseThesis&&baseThesis.candidateDirection)||null;
  const degraded=!!(mcb&&mcb.dataQuality&&mcb.dataQuality.degraded);
  const directions={};let narratives=[];
  for(const direction of DIRECTIONS){
    const old=prev&&prev.chains&&prev.chains[direction]||null;
    // v0.3 uses the native and price-behavior feed; no new collector or decisions.
    const proxy={...mcb,nativeSignal:native,priceBehavior};
    const result=evolve(old,direction,frame,proxy,translation,ticker,mf,old&&old.story||[]);
    directions[direction]=result;
  }
  let primary=prev&&prev.primaryThesis||mcbProposal||null;
  if(!DIRECTIONS.includes(primary))primary=mcbProposal;
  const contender=mcbProposal&&mcbProposal!==primary?mcbProposal:null;
  const snap=contender?directions[contender]:null;
  const p=snap&&snap.measures||{};
  const priceAcceptance=!!(contender&&signed(p.pm3,contender)&&signed(p.pm5,contender)&&
    finite(p.eff3)&&p.eff3>=.25);
  const families=snap&&snap.families||[];
  const enoughIndependentFamilies=families.includes('MCB3')&&families.includes('MCB15')&&
    families.includes('CONVERSION');
  // Hypothetical handoff, NEVER a live admission signal.
  const shadowHandoff=!!(!degraded&&contender&&priceAcceptance&&enoughIndependentFamilies);
  if(shadowHandoff)primary=contender;
  if(prev&&prev.primaryThesis&&primary!==prev.primaryThesis){
    const e={ts:now,price:Number(frame.market.price),from:prev.primaryThesis,to:primary,
      cause:'MCB_STRUCTURAL_CANDIDATE_AND_PRICE_CONVERSION',decisionImpact:false};
    narratives=(prev.handoffs||[]).concat(e).slice(-12);
  }else narratives=prev&&prev.handoffs||[];
  for(const direction of DIRECTIONS){
    const ch=directions[direction];ch.role=primary===direction?'PRINCIPALE':'CONCURRENTE';
    const v=ch.measures||{};
    const opposingPrice=signed(v.pm3,other(direction))&&signed(v.pm5,other(direction));
    ch.phase=ch.role==='PRINCIPALE'
      ?(opposingPrice||ch.contraryCount>ch.activeProofCount?'CONTESTEE':'ACTIVE')
      :(ch.families.length>=3&&signed(v.pm3,direction)?'EN_CONSTRUCTION':'OBSERVATION');
  }
  return {version:VERSION,decisionImpact:false,ts:now,
    dataQuality:degraded?'DATA_DEGRADED':'DATA_OK',
    mcbAuthority:mcbProposal,primaryThesis:primary,
    chains:directions,short:directions.short,long:directions.long,
    handoff:{state:shadowHandoff?'TRANSFERT_SHADOW_OBSERVE':contender?'CANDIDAT_MCB_EN_ATTENTE_DU_PRIX':'AUCUN_TRANSFERT',
      candidate:contender,mcbProposed:!!contender,priceAcceptance,proofFamilies:families,
      handoffValidatedShadow:shadowHandoff,decisionImpact:false},
    handoffs:narratives,
    semantics:'Parallel LONG/SHORT evidence histories. Only MCB proposes direction; price tests handoff. No live decision authority.'};
}
module.exports={VERSION,evaluate,conditionsFor};