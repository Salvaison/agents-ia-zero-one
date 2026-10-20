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
const NATIVE_REFS={
  E3_LIVE:['e3Live','last3mUp','last3mDn'],E3_CONFIRMED:['e3Confirmed','last3mUp','last3mDn'],
  E15_LIVE:['e15Live','lastUp','lastDn'],E15_CONFIRMED:['e15Confirmed','lastUp','lastDn'],
  E3_OPPOSITE_LIVE:['opp3Live','last3mUp','last3mDn'],
  E3_OPPOSITE_CONFIRMED:['opp3Confirmed','last3mUp','last3mDn'],
  E15_OPPOSITE_LIVE:['opp15Live','lastUp','lastDn'],
  E15_OPPOSITE_CONFIRMED:['opp15Confirmed','lastUp','lastDn']
};
function isSupersededNative(name,snap,native){
  const meta=NATIVE_REFS[name];
  if(!meta)return null;
  const own=snap&&snap.refs&&snap.refs[meta[0]],sourceTs=stamp(own);
  if(sourceTs===null)return null;
  const oppositeName=own&&own.type==='UP'?meta[2]:meta[1];
  const opposing=stamp(native&&native[oppositeName]);
  return opposing!==null&&opposing>sourceTs?{sourceTs,opposingTs:opposing}:null;
}
function priceWindow(frame,minutes){
  const now=Number(frame.market.timestamp),rows=(frame.sources&&frame.sources.auditRows||[])
    .filter(x=>finite(x&&x.ts)&&finite(x&&x.lastPrice)&&Number(x.ts)<=now&&Number(x.ts)>=now-minutes*60000)
    .slice().sort((a,b)=>Number(a.ts)-Number(b.ts));
  if(rows.length<2)return {available:false,minutes,rows:rows.length};
  const elapsed=(Number(rows[rows.length-1].ts)-Number(rows[0].ts))/60000;
  if(elapsed<minutes*.75)return {available:false,minutes,rows:rows.length,elapsedMinutes:elapsed};
  const prices=rows.map(x=>Number(x.lastPrice)),start=prices[0],last=prices[prices.length-1];
  let gross=0;for(let i=1;i<prices.length;i++)gross+=Math.abs(prices[i]-prices[i-1]);
  const net=last-start;
  return {available:true,minutes,elapsedMinutes:elapsed,
    startPrice:start,lastPrice:last,netUsd:net,grossUsd:gross,netToPath:gross?Math.abs(net)/gross:0,
    maxPrice:Math.max(...prices),minPrice:Math.min(...prices),direction:net>0?'long':net<0?'short':null};
}
function priceDominance(frame){
  const windows={};
  for(const min of [3,5,15,30])windows['m'+min]=priceWindow(frame,min);
  const h15=windows.m15,h30=windows.m30,h5=windows.m5;
  const aligned=!!(h15.available&&h30.available&&h15.direction&&h15.direction===h30.direction);
  const direction=aligned?h15.direction:null;
  return {direction,context30mDirection:h30.available?h30.direction:null,
    classification:aligned?'ALIGNEMENT_15M_30M':h15.available&&h30.available
      ?'HORIZONS_CONTRADICTOIRES':'DONNEES_EN_MATURATION',
    shortTermOpposes:!!(h30.available&&h30.direction&&h5.available&&h5.direction&&h5.direction!==h30.direction),
    windows,decisionImpact:false,
    semantic:'descriptive price territory, not a score, MCB proposal or trade permission'};
}
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
    const prior=old[name]||null,src=sourceOf(name,snap);
    const superseded=isSupersededNative(name,snap,mcb.nativeSignal||{});
    const on=!!present&&!superseded;
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
      p.supersededByTs=null;
    }else if(superseded){
      if(prior&&prior.state==='ACTIVE'){
        p.state='SUPERSEDED';p.lastFadedAt=now;p.activeSince=null;
        p.supersededByTs=superseded.opposingTs;
        narrative=recordEvent(narrative,now,price,direction,'SUPERSEDED',name,p.group,superseded.opposingTs);
      }
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
  // MCB's current candidate has directional authority NOW, including REVERSAL_FORMING.
  // Structural E15→E15 direction is a separate maturity marker, never a reason to
  // hide the new MCB proposal or wait for an instantaneous PM confluence.
  const rawProposal=baseThesis&&(baseThesis.candidateDirection||baseThesis.direction)||null;
  const mcbProposal=DIRECTIONS.includes(rawProposal)?rawProposal:null;
  const degraded=!!(mcb&&mcb.dataQuality&&mcb.dataQuality.degraded);
  const directions={};let narratives=[];
  for(const direction of DIRECTIONS){
    const old=prev&&prev.chains&&prev.chains[direction]||null;
    const proxy={...mcb,nativeSignal:native,priceBehavior};
    directions[direction]=evolve(old,direction,frame,proxy,translation,ticker,mf,old&&old.story||[]);
  }
  const primary=!degraded&&mcbProposal?mcbProposal:(prev&&prev.primaryThesis||null);
  const proposalFresh=!!(!degraded&&mcbProposal);
  const price=priceDominance(frame);
  const previousPrimary=prev&&prev.primaryThesis||null;
  if(previousPrimary&&primary&&primary!==previousPrimary){
    narratives=(prev.handoffs||[]).concat({
      ts:now,price:Number(frame.market.price),from:previousPrimary,to:primary,
      cause:'NEW_MCB_DIRECTION_PROPOSAL',structuralDirection:structural,
      priceDominanceDirection:price.direction,decisionImpact:false
    }).slice(-12);
  }else narratives=prev&&prev.handoffs||[];
  for(const direction of DIRECTIONS){
    const ch=directions[direction],v=ch.measures||{};
    ch.role=primary===direction?'PRINCIPALE':'CONCURRENTE';
    const opposingPm=signed(v.pm3,other(direction))&&signed(v.pm5,other(direction));
    const priceOpposes=!!(price.direction&&price.direction!==direction);
    const priceSupports=price.direction===direction;
    ch.priceRelation=priceSupports?'SOUTIENT':priceOpposes?'CONTREDIT':
      price.context30mDirection===direction?'30M_SOUTIENT_15M_CONTESTE':
      price.context30mDirection?'30M_OPPOSE_15M_CONTESTE':'EN_OBSERVATION';
    ch.phase=ch.role==='PRINCIPALE'
      ?(degraded?'DONNEES_DEGRADEES':priceOpposes||opposingPm?'CONTESTEE':'MCB_PROPOSEE')
      :(priceSupports?'PRIX_FAVORABLE':signed(v.pm3,direction)?'EN_CONSTRUCTION':'OBSERVATION');
  }
  const priceAcceptance=!!(primary&&price.direction===primary);
  const structuralAgreement=!!(primary&&structural===primary);
  const handoffState=!proposalFresh?'MCB_INDISPONIBLE'
    :priceAcceptance&&structuralAgreement?'PROPOSITION_MCB_STRUCTURE_ET_PRIX_ALIGNES'
    :priceAcceptance?'PROPOSITION_MCB_PRIX_ALIGNE'
    :price.direction&&price.direction!==primary?'PROPOSITION_MCB_PRIX_OPPOSE'
    :'PROPOSITION_MCB_PRIX_EN_MATURATION';
  return {version:VERSION,revision:'mcb-proposal-and-price-persistence-v0.4.1',
    decisionImpact:false,ts:now,
    dataQuality:degraded?'DATA_DEGRADED':'DATA_OK',
    mcbAuthority:mcbProposal,structuralDirection:structural,primaryThesis:primary,
    proposalFresh,priceDominance:price,
    chains:directions,short:directions.short,long:directions.long,
    handoff:{state:handoffState,candidate:primary,mcbProposed:proposalFresh,
      structuralAgreement,priceAcceptance,priceDominanceDirection:price.direction,
      shortTermRespiration:price.shortTermOpposes,decisionImpact:false},
    handoffs:narratives,
    semantics:'MCB proposes current search direction instantly; structural maturity and 15m/30m price dominance are independently observable; trade authority unchanged.'};
}
module.exports={VERSION,evaluate,conditionsFor};