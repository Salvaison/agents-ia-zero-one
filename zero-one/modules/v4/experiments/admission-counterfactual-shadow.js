'use strict';

const VERSION='admission-counterfactual-shadow-v0.1';
const ECONOMIC_TARGET_USD=220;
const ADVERSE_REFERENCE_USD=180;
const MAX_COMPLETED=40;

function finite(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));}
function dirSignalType(direction){return direction==='long'?'UP':direction==='short'?'DN':null;}
function normalizeBlocker(r){
  const s=String(r||'');
  if(s.includes('LOW_EDGE_REQUIRES'))return 'LOW_EDGE';
  if(s.includes('WAIT_3M_15M_SYNC'))return 'WAIT_SYNC';
  if(s.includes('SETUP_LATE'))return 'SETUP_LATE';
  if(s.includes('WAIT_MF_MEMORY'))return 'MF_MEMORY';
  if(s.includes('WAIT_MF_TRANSFER_1H'))return 'MF_1H';
  if(s.includes('WAIT_MF_TRANSFER_3M'))return 'MF_3M';
  if(s.includes('BOUNDARY_CONTEST'))return 'BOUNDARY';
  if(s.includes('UP_REINFORCED_3M'))return 'UP3_CLOSE_SHORT';
  if(s.includes('CAMPAIGN_RETRY'))return 'CAMPAIGN_RETRY';
  if(s.includes('THESIS_CONSUMED'))return 'THESIS_CONSUMED';
  if(s.includes('DATA_DEGRADED'))return 'DATA_DEGRADED';
  if(s.includes('DORMANT_MARKET'))return 'DORMANT';
  return null;
}
function blockersFromSetup(setup){
  const src=[];
  if(setup&&Array.isArray(setup.reasons))src.push(...setup.reasons);
  else if(setup&&setup.reason)src.push(...String(setup.reason).split(' + '));
  return [...new Set(src.map(normalizeBlocker).filter(Boolean))];
}
function candidateDirection(setup,thesis){
  return setup&&setup.candidateDirection||thesis&&thesis.candidateDirection||thesis&&thesis.direction||null;
}
function strictReady(candidate,priceBehavior){
  if(!candidate||!priceBehavior)return false;
  const pm=priceBehavior.pm||{};
  return !!(
    priceBehavior.interesting&&
    priceBehavior.waveEstablished&&
    priceBehavior.waveAligned&&
    priceBehavior.direction===candidate&&
    pm.multiHorizonDirection===candidate&&
    finite(pm.efficiency3m)&&Number(pm.efficiency3m)>=.25
  );
}
function signedMove(direction,price,start){
  if(!finite(price)||!finite(start)||!direction)return null;
  return direction==='long'?Number(price)-Number(start):Number(start)-Number(price);
}
function sameSignal(e,direction){
  const type=dirSignalType(direction);
  return !!(e&&e.type===type);
}
function live3Event(native,direction){
  const l=native&&native.live3||null;
  if(!l||!l.fresh)return null;
  const e=direction==='long'?l.up:l.dn;
  return sameSignal(e,direction)?e:null;
}
function confirmed3Event(native,direction){
  const e=direction==='long'?native&&native.last3mUp:native&&native.last3mDn;
  return sameSignal(e,direction)?e:null;
}
function boundarySnapshot(room){
  const n=room&&room.nearestAhead||null;
  return n?{
    kind:n.kind||null,label:n.label||null,price:finite(n.price)?Number(n.price):null,
    distanceUsd:finite(n.distanceUsd)?Number(n.distanceUsd):null,
    distanceAbsUsd:finite(n.distanceAbsUsd)?Number(n.distanceAbsUsd):null
  }:null;
}
function snapshot(frame,candidate,setup,mcb,priceBehavior,native,mfStructure,room,quality){
  const n3=mcb&&mcb.nested3m||{};
  const pm=priceBehavior&&priceBehavior.pm||{};
  const sm=priceBehavior&&priceBehavior.signalMemory||{};
  const mf=mfStructure&&mfStructure.temporal||{};
  return {
    candidate,
    setupKey:setup&&setup.setupKey||null,
    marketQuality:quality&&quality.state||null,
    boundary:boundarySnapshot(room),
    priceBehavior:{
      state:priceBehavior&&priceBehavior.state||null,
      travel:priceBehavior&&priceBehavior.travel&&priceBehavior.travel.state||null,
      relationToSignalMemory:priceBehavior&&priceBehavior.relationToSignalMemory||null,
      signalMemoryDirection:sm.direction||null,
      signalSequence:sm.sequence||null,
      pm3Usd:finite(pm.net3mUsd)?Number(pm.net3mUsd):null,
      pm5Usd:finite(pm.net5mUsd)?Number(pm.net5mUsd):null,
      efficiency3m:finite(pm.efficiency3m)?Number(pm.efficiency3m):null
    },
    e3:{
      lobeDirection:n3.lobeDirection||null,
      structuralDirection:n3.structuralDirection||null,
      structuralState:n3.structuralState||null,
      structuralConfirmedAt:finite(n3.structuralConfirmedAt)?Number(n3.structuralConfirmedAt):null,
      currentLbw:finite(n3.currentLbw)?Number(n3.currentLbw):null,
      extremeLbw:finite(n3.extremeLbw)?Number(n3.extremeLbw):null
    },
    mf:{
      state:mf.state||null,memoryDirection:mf.memoryDirection||null,memoryHorizon:mf.memoryHorizon||null,
      tacticalDirection:mf.tacticalDirection||null
    },
    dataQuality:mcb&&mcb.dataQuality&&mcb.dataQuality.state||null
  };
}
function startEpisode(frame,candidate,blockers,setup,mcb,priceBehavior,native,mfStructure,room,quality){
  const now=Number(frame.market.timestamp),price=Number(frame.market.price);
  const live=live3Event(native,candidate);
  const conf=confirmed3Event(native,candidate);
  const boundary=boundarySnapshot(room);
  return {
    id:[candidate,setup&&setup.setupKey||'NO_KEY',now].join('|'),
    direction:candidate,
    triggerTs:now,triggerTimestamp:new Date(now).toISOString(),triggerPrice:price,
    setupKey:setup&&setup.setupKey||null,
    initialBlockers:blockers.slice(),
    currentBlockers:blockers.slice(),
    blockerHistory:[{ts:now,blockers:blockers.slice()}],
    currentSignedUsd:0,maxFavorableUsd:0,maxAdverseUsd:0,
    hit220At:null,hitMinus180At:null,success220BeforeMinus180:null,
    boundary,
    boundaryCrossedAt:null,
    live3ContinuationAt:live?now:null,
    live3Signal:live?{type:live.type,value:live.value,barTs:live.ts}:null,
    confirmed3ContinuationAt:conf&&finite(conf.ts)&&Number(conf.ts)>=now?Number(conf.ts):null,
    confirmed3Signal:conf&&finite(conf.ts)&&Number(conf.ts)>=now?{type:conf.type,value:conf.value,ts:conf.ts}:null,
    structuralAlignedAt:mcb&&mcb.nested3m&&mcb.nested3m.structuralDirection===candidate?now:null,
    contextAtStart:snapshot(frame,candidate,setup,mcb,priceBehavior,native,mfStructure,room,quality),
    samples:1,lastTs:now,lastPrice:price,status:'TRACKING'
  };
}
function crossesBoundary(ep,price){
  const b=ep&&ep.boundary;
  if(!b||!finite(b.price)||!finite(price))return false;
  return ep.direction==='long'?Number(price)>=Number(b.price):Number(price)<=Number(b.price);
}
function updateEpisode(ep,frame,blockers,mcb,native){
  const now=Number(frame.market.timestamp),price=Number(frame.market.price);
  const out=JSON.parse(JSON.stringify(ep));
  const move=signedMove(out.direction,price,out.triggerPrice);
  out.currentSignedUsd=finite(move)?Number(move):out.currentSignedUsd;
  if(finite(move)){
    out.maxFavorableUsd=Math.max(Number(out.maxFavorableUsd)||0,Number(move));
    out.maxAdverseUsd=Math.max(Number(out.maxAdverseUsd)||0,-Number(move));
    if(!out.hit220At&&Number(move)>=ECONOMIC_TARGET_USD)out.hit220At=now;
    if(!out.hitMinus180At&&Number(move)<=-ADVERSE_REFERENCE_USD)out.hitMinus180At=now;
    if(out.success220BeforeMinus180===null&&(out.hit220At||out.hitMinus180At)){
      if(out.hit220At&&(!out.hitMinus180At||Number(out.hit220At)<Number(out.hitMinus180At)))out.success220BeforeMinus180=true;
      else if(out.hitMinus180At&&(!out.hit220At||Number(out.hitMinus180At)<Number(out.hit220At)))out.success220BeforeMinus180=false;
    }
  }
  const prevKey=(out.currentBlockers||[]).slice().sort().join('|');
  const nextKey=(blockers||[]).slice().sort().join('|');
  if(prevKey!==nextKey){
    out.blockerHistory.push({ts:now,blockers:(blockers||[]).slice()});
    out.currentBlockers=(blockers||[]).slice();
  }
  if(!out.boundaryCrossedAt&&crossesBoundary(out,price))out.boundaryCrossedAt=now;

  const live=live3Event(native,out.direction);
  if(!out.live3ContinuationAt&&live){
    out.live3ContinuationAt=now;
    out.live3Signal={type:live.type,value:live.value,barTs:live.ts};
  }
  const conf=confirmed3Event(native,out.direction);
  if(!out.confirmed3ContinuationAt&&conf&&finite(conf.ts)&&Number(conf.ts)>=Number(out.triggerTs)){
    out.confirmed3ContinuationAt=Number(conf.ts);
    out.confirmed3Signal={type:conf.type,value:conf.value,ts:conf.ts};
  }
  if(!out.structuralAlignedAt&&mcb&&mcb.nested3m&&mcb.nested3m.structuralDirection===out.direction){
    out.structuralAlignedAt=now;
  }
  out.liveToConfirmed3Minutes=out.live3ContinuationAt&&out.confirmed3ContinuationAt
    ?Math.max(0,(Number(out.confirmed3ContinuationAt)-Number(out.live3ContinuationAt))/60000):null;
  out.liveToStructural3Minutes=out.live3ContinuationAt&&out.structuralAlignedAt
    ?Math.max(0,(Number(out.structuralAlignedAt)-Number(out.live3ContinuationAt))/60000):null;
  out.samples=(Number(out.samples)||0)+1;
  out.lastTs=now;out.lastPrice=price;
  return out;
}
function finalize(ep,frame,resolution){
  if(!ep)return null;
  const out=JSON.parse(JSON.stringify(ep));
  const now=Number(frame.market.timestamp);
  out.status='COMPLETED';
  out.resolvedAt=now;
  out.resolvedTimestamp=new Date(now).toISOString();
  out.durationMinutes=Math.max(0,(now-Number(out.triggerTs))/60000);
  out.resolution=resolution||'CONTEXT_ENDED';
  if(out.success220BeforeMinus180===null){
    if(out.hit220At&&!out.hitMinus180At)out.success220BeforeMinus180=true;
    else if(out.hitMinus180At&&!out.hit220At)out.success220BeforeMinus180=false;
  }
  return out;
}
function gateSummary(completed,current){
  const rows=[...(completed||[])];
  if(current)rows.push(current);
  const gates=['LOW_EDGE','WAIT_SYNC','SETUP_LATE','MF_MEMORY','MF_1H','MF_3M','BOUNDARY','UP3_CLOSE_SHORT','CAMPAIGN_RETRY','THESIS_CONSUMED'];
  const out={};
  for(const g of gates){
    const a=rows.filter(x=>(x.initialBlockers||[]).includes(g));
    out[g]={
      episodes:a.length,
      hit220:a.filter(x=>Number(x.maxFavorableUsd)>=ECONOMIC_TARGET_USD).length,
      hitMinus180:a.filter(x=>Number(x.maxAdverseUsd)>=ADVERSE_REFERENCE_USD).length,
      success220BeforeMinus180:a.filter(x=>x.success220BeforeMinus180===true).length,
      withLive3Continuation:a.filter(x=>x.live3ContinuationAt).length,
      live3Confirmed:a.filter(x=>x.confirmed3ContinuationAt).length,
      structuralAligned:a.filter(x=>x.structuralAlignedAt).length
    };
  }
  return out;
}
function evaluate(frame,position,setup,thesis,mcb,priceBehavior,native,mfStructure,room,quality,previous=null){
  const prev=previous&&previous.version===VERSION?previous:null;
  let active=prev&&prev.activeEpisode?JSON.parse(JSON.stringify(prev.activeEpisode)):null;
  let completed=prev&&Array.isArray(prev.completed)?prev.completed.slice():[];
  const candidate=candidateDirection(setup,thesis);
  const blockers=blockersFromSetup(setup);
  const degraded=!!(mcb&&mcb.dataQuality&&mcb.dataQuality.degraded);
  const strict=strictReady(candidate,priceBehavior);
  const setupOpened=!!(setup&&setup.status==='SETUP');
  const now=Number(frame.market.timestamp);

  if(active){
    const sameKey=!!(candidate&&active.setupKey&&setup&&setup.setupKey===active.setupKey&&candidate===active.direction);
    if(position){
      completed.push(finalize(active,frame,'POSITION_OPENED'));
      active=null;
    }else if(degraded){
      completed.push(finalize(active,frame,'DATA_DEGRADED'));
      active=null;
    }else if(setupOpened){
      completed.push(finalize(active,frame,'SETUP_OPENED'));
      active=null;
    }else if(!sameKey){
      completed.push(finalize(active,frame,candidate?'SETUP_KEY_CHANGED':'CANDIDATE_LOST'));
      active=null;
    }else{
      active=updateEpisode(active,frame,blockers,mcb,native);
    }
  }

  const strategicBlockers=blockers.filter(x=>x!=='DATA_DEGRADED'&&x!=='DORMANT');
  if(!active&&!position&&!degraded&&!setupOpened&&strict&&candidate&&strategicBlockers.length){
    active=startEpisode(frame,candidate,strategicBlockers,setup,mcb,priceBehavior,native,mfStructure,room,quality);
  }
  completed=completed.filter(Boolean).slice(-MAX_COMPLETED);
  const summary=gateSummary(completed,active);

  return {
    version:VERSION,decisionImpact:false,
    state:active?'TRACKING_BLOCKED_OPPORTUNITY':'IDLE',
    strictQualification:{
      candidate,ready:strict,
      requirements:['PRICE_BEHAVIOR_INTERESTING','WAVE_MEMORY_ALIGNED','MCB_CANDIDATE_SAME_DIRECTION','PM3_PM5_ALIGNED','EFF3_GTE_25PCT','DATA_OK']
    },
    activeEpisode:active,
    completed,
    summary,
    references:{economicTargetUsd:ECONOMIC_TARGET_USD,adverseReferenceUsd:ADVERSE_REFERENCE_USD},
    semantic:'counterfactual admission laboratory only: measures what happens after a coherent opportunity is blocked; never changes setup/action authority'
  };
}

module.exports={VERSION,ECONOMIC_TARGET_USD,ADVERSE_REFERENCE_USD,normalizeBlocker,blockersFromSetup,strictReady,evaluate};
