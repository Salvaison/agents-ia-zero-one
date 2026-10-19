'use strict';

const VERSION='elastic-sync-shadow-v0.3-evidence-conversion';
const ECONOMIC_TARGET_USD=220;
const ADVERSE_REFERENCE_USD=180;
const MAX_COMPLETED=50;
const MAX_OCCURRENCES_PER_EVENT=8;
const CONVERSION_HORIZONS_MIN=[1,3,5,15,30];

function finite(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));}
function opposite(direction){return direction==='long'?'short':direction==='short'?'long':null;}
function dirOf(v){return finite(v)?(Number(v)>0?'long':Number(v)<0?'short':null):null;}
function alignedValue(v,direction,minAbs=0){
  if(!finite(v)||Math.abs(Number(v))<minAbs)return false;
  return direction==='long'?Number(v)>0:Number(v)<0;
}
function candidateDirection(setup,entryBaseThesis,thesis,priceBehavior){
  return setup&&setup.candidateDirection||
    entryBaseThesis&&entryBaseThesis.candidateDirection||
    thesis&&thesis.candidateDirection||thesis&&thesis.direction||
    priceBehavior&&priceBehavior.interesting&&priceBehavior.direction||null;
}
function auditSlope(rows,field,minutes=3){
  const a=(rows||[]).filter(r=>finite(r&&r.ts)&&finite(r&&r[field]));
  if(a.length<2)return null;
  const end=a[a.length-1],endTs=Number(end.ts),cut=endTs-minutes*60000;
  let start=a[0];
  for(const r of a){if(Number(r.ts)>=cut){start=r;break;}}
  const dt=(endTs-Number(start.ts))/60000;
  return dt>0?(Number(end[field])-Number(start[field]))/dt:null;
}
function latestAudit(frame){
  const a=frame&&frame.sources&&frame.sources.auditRows||[];
  return a.length?a[a.length-1]:null;
}
function signalEvent(native,tf,direction,live){
  const type=direction==='long'?'UP':'DN';
  if(tf==='3m'&&live){
    const x=native&&native.live3||{};
    const e=direction==='long'?x.up:x.dn;
    return x.fresh&&e&&e.type===type?e:null;
  }
  if(tf==='15m'&&live){
    const x=native&&native.live15||{};
    const e=direction==='long'?x.up:x.dn;
    return x.fresh&&e&&e.type===type?e:null;
  }
  if(tf==='3m')return direction==='long'?native&&native.last3mUp:native&&native.last3mDn;
  return direction==='long'?native&&native.lastUp:native&&native.lastDn;
}
function oppositeSignalEvent(native,tf,direction,live){
  return signalEvent(native,tf,opposite(direction),live);
}
function liveTfRow(frame,tf){
  return frame&&frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs&&frame.sources.mcb.tfs[tf]&&frame.sources.mcb.tfs[tf].live||null;
}
function eventSnapshot(frame,direction,mcb,native,translation,priceBehavior){
  const rows=frame&&frame.sources&&frame.sources.auditRows||[];
  const a=latestAudit(frame)||{};
  const h=translation&&translation.horizons||{};
  const n3=mcb&&mcb.nested3m||{};
  const c15=mcb&&mcb.currentLobe||{};
  const live3=liveTfRow(frame,'3m')||{};
  const live15=liveTfRow(frame,'15m')||{};
  const price=Number(frame&&frame.market&&frame.market.price);
  const lbw3=finite(live3.lt_blue_wave)?Number(live3.lt_blue_wave):(finite(a.liveLbw)?Number(a.liveLbw):(finite(n3.currentLbw)?Number(n3.currentLbw):null));
  const lbw15=finite(a.live15LbwRaw)?Number(a.live15LbwRaw):(finite(live15.lt_blue_wave)?Number(live15.lt_blue_wave):(finite(c15.currentLbw)?Number(c15.currentLbw):null));
  const ma3=finite(live3.ma200)?Number(live3.ma200):null;
  const ma15=finite(live15.ma200)?Number(live15.ma200):null;
  const lbw15Slope=auditSlope(rows,'live15LbwRaw',3);
  const mf15Slope=finite(a.mf15Pente)?Number(a.mf15Pente):auditSlope(rows,'live15MoneyFlow',5);
  const e3Live=signalEvent(native,'3m',direction,true);
  const e3Confirmed=signalEvent(native,'3m',direction,false);
  const e15Live=signalEvent(native,'15m',direction,true);
  const e15Confirmed=signalEvent(native,'15m',direction,false);
  const opp3Live=oppositeSignalEvent(native,'3m',direction,true);
  const opp3Confirmed=oppositeSignalEvent(native,'3m',direction,false);
  const opp15Live=oppositeSignalEvent(native,'15m',direction,true);
  const opp15Confirmed=oppositeSignalEvent(native,'15m',direction,false);
  const pm3=finite(h.net3mUsd)?Number(h.net3mUsd):null;
  const pm5=finite(h.net5mUsd)?Number(h.net5mUsd):null;
  const eff3=finite(h.efficiency3m)?Number(h.efficiency3m):null;
  const eff5=finite(h.efficiency5m)?Number(h.efficiency5m):null;
  const priceDir=priceBehavior&&priceBehavior.interesting?priceBehavior.direction||null:null;
  const values={
    price,lbw3,lbw15,lbw15Slope,mf15Slope,pm3,pm5,eff3,eff5,ma3,ma15,
    priceDirection:priceDir,priceInteresting:!!(priceBehavior&&priceBehavior.interesting),
    travelState:priceBehavior&&priceBehavior.travel&&priceBehavior.travel.state||null,
    lobe3:n3.lobeDirection||null,struct3:n3.structuralDirection||null,
    lobe15:c15.lobeDirection||null,struct15:c15.structuralDirection||null
  };
  return {
    values,
    conditions:{
      E3_LIVE:!!e3Live,
      E3_CONFIRMED:!!e3Confirmed,
      PM3_EFFECTIVE:alignedValue(pm3,direction,10)&&finite(eff3)&&eff3>=.25,
      PM5_EFFECTIVE:alignedValue(pm5,direction,10)&&(!finite(eff5)||eff5>=.25),
      PRICE_PRODUCTIVE:!!(values.priceInteresting&&priceDir===direction),
      LBW3_ZERO_SIDE:direction==='long'?finite(lbw3)&&lbw3>0:finite(lbw3)&&lbw3<0,
      LBW15_SLOPE_ALIGNED:alignedValue(lbw15Slope,direction,0),
      E15_LIVE:!!e15Live,
      LBW15_ZERO_SIDE:direction==='long'?finite(lbw15)&&lbw15>0:finite(lbw15)&&lbw15<0,
      E15_CONFIRMED:!!e15Confirmed,
      MF15_SLOPE_ALIGNED:alignedValue(mf15Slope,direction,0),
      LOBE3_ALIGNED:n3.lobeDirection===direction,
      STRUCT3_ALIGNED:n3.structuralDirection===direction,
      STRUCT15_ALIGNED:c15.structuralDirection===direction,
      MA3_SIDE_ALIGNED:finite(ma3)&&finite(price)&&(direction==='long'?price>=ma3:price<=ma3),
      MA15_SIDE_ALIGNED:finite(ma15)&&finite(price)&&(direction==='long'?price>=ma15:price<=ma15),

      E3_OPPOSITE_LIVE:!!opp3Live,
      E3_OPPOSITE_CONFIRMED:!!opp3Confirmed,
      PM3_OPPOSITE:alignedValue(pm3,opposite(direction),10)&&finite(eff3)&&eff3>=.25,
      PM5_OPPOSITE:alignedValue(pm5,opposite(direction),10)&&(!finite(eff5)||eff5>=.25),
      PRICE_OPPOSITE_PRODUCTIVE:!!(values.priceInteresting&&priceDir===opposite(direction)),
      LBW3_ZERO_OPPOSITE:direction==='long'?finite(lbw3)&&lbw3<0:finite(lbw3)&&lbw3>0,
      LBW15_SLOPE_OPPOSITE:alignedValue(lbw15Slope,opposite(direction),0),
      E15_OPPOSITE_LIVE:!!opp15Live,
      LBW15_ZERO_OPPOSITE:direction==='long'?finite(lbw15)&&lbw15<0:finite(lbw15)&&lbw15>0,
      E15_OPPOSITE_CONFIRMED:!!opp15Confirmed,
      MF15_SLOPE_OPPOSITE:alignedValue(mf15Slope,opposite(direction),0),
      LOBE3_OPPOSITE:n3.lobeDirection===opposite(direction),
      STRUCT3_OPPOSITE:n3.structuralDirection===opposite(direction),
      STRUCT15_OPPOSITE:c15.structuralDirection===opposite(direction),
      MA3_SIDE_OPPOSITE:finite(ma3)&&finite(price)&&(direction==='long'?price<ma3:price>ma3),
      MA15_SIDE_OPPOSITE:finite(ma15)&&finite(price)&&(direction==='long'?price<ma15:price>ma15)
    },
    refs:{
      e3Live,e3Confirmed,e15Live,e15Confirmed,opp3Live,opp3Confirmed,opp15Live,opp15Confirmed
    }
  };
}
function campaignId(direction,mcb){
  const c=mcb&&mcb.currentLobe||{};
  const anchor=finite(c.startTs)?Number(c.startTs):finite(c.extremeTs)?Number(c.extremeTs):0;
  return [direction,anchor].join('|');
}
function eventIsOpposite(name){return String(name||'').includes('OPPOSITE');}
function evidenceFamily(name){
  const n=String(name||'');
  if(n.startsWith('E3_')||n.startsWith('LBW3_')||n.startsWith('LOBE3')||n.startsWith('STRUCT3'))return 'MCB3';
  if(n.startsWith('E15_')||n.startsWith('LBW15_')||n.startsWith('STRUCT15'))return 'MCB15';
  if(n.startsWith('PM3')||n.startsWith('PM5')||n.startsWith('PRICE_'))return 'CONVERSION';
  if(n.startsWith('MF15_'))return 'FLOW';
  if(n.startsWith('MA3_')||n.startsWith('MA15_'))return 'BOUNDARY';
  return 'OTHER';
}
function eventProofDirection(name,episodeDirection){
  return eventIsOpposite(name)?opposite(episodeDirection):episodeDirection;
}
function contextSnapshot(snap,proofDirection){
  const v=snap.values||{};
  return {
    pm3:v.pm3,pm5:v.pm5,eff3:v.eff3,eff5:v.eff5,
    lbw3:v.lbw3,lbw15:v.lbw15,lbw15Slope:v.lbw15Slope,mf15Slope:v.mf15Slope,
    ma3:v.ma3,ma15:v.ma15,
    lobe3:v.lobe3,struct3:v.struct3,lobe15:v.lobe15,struct15:v.struct15,
    priceDirection:v.priceDirection,priceInteresting:v.priceInteresting,travelState:v.travelState,
    pm3SupportsProof:alignedValue(v.pm3,proofDirection,10),
    pm5SupportsProof:alignedValue(v.pm5,proofDirection,10),
    lbw15SlopeSupportsProof:alignedValue(v.lbw15Slope,proofDirection,0),
    mf15SlopeSupportsProof:alignedValue(v.mf15Slope,proofDirection,0),
    ma3SupportsProof:finite(v.ma3)&&finite(v.price)&&(proofDirection==='long'?v.price>=v.ma3:v.price<=v.ma3),
    ma15SupportsProof:finite(v.ma15)&&finite(v.price)&&(proofDirection==='long'?v.price>=v.ma15:v.price<=v.ma15)
  };
}
function newConversionTracker(name,ep,frame,snap,ref=null){
  const now=Number(frame.market.timestamp),price=Number(frame.market.price),proofDirection=eventProofDirection(name,ep.direction);
  return {
    event:name,family:evidenceFamily(name),polarity:eventIsOpposite(name)?'COUNTERFACT':'THESIS',
    proofDirection,eventTs:now,eventPrice:price,
    refTs:ref&&finite(ref.ts)?Number(ref.ts):null,value:ref&&finite(ref.value)?Number(ref.value):null,
    currentProofSignedUsd:0,maxProofFavorableUsd:0,maxProofAdverseUsd:0,
    currentEpisodeSignedUsd:0,maxEpisodeFavorableUsd:0,maxEpisodeAdverseUsd:0,
    proofHit220At:null,proofHitMinus180At:null,
    episodeHit220At:null,episodeHitMinus180At:null,
    horizons:Object.fromEntries(CONVERSION_HORIZONS_MIN.map(m=>[String(m),null])),
    contextAtEvent:contextSnapshot(snap,proofDirection)
  };
}
function conversionPoint(tracker,ep,frame,snap,horizonMin){
  const price=Number(frame.market.price);
  const proofSigned=signedMove(tracker.proofDirection,price,tracker.eventPrice);
  const episodeSigned=signedMove(ep.direction,price,tracker.eventPrice);
  const proofDen=Number(tracker.maxProofFavorableUsd||0)+Number(tracker.maxProofAdverseUsd||0);
  const episodeDen=Number(tracker.maxEpisodeFavorableUsd||0)+Number(tracker.maxEpisodeAdverseUsd||0);
  return {
    minutes:horizonMin,ts:Number(frame.market.timestamp),price,
    proofSignedUsd:proofSigned,episodeSignedUsd:episodeSigned,
    proofMfeUsd:tracker.maxProofFavorableUsd,proofMaeUsd:tracker.maxProofAdverseUsd,
    episodeMfeUsd:tracker.maxEpisodeFavorableUsd,episodeMaeUsd:tracker.maxEpisodeAdverseUsd,
    proofNetToExcursion:proofDen>0?proofSigned/proofDen:null,
    episodeNetToExcursion:episodeDen>0?episodeSigned/episodeDen:null,
    proofRetention:tracker.maxProofFavorableUsd>0?Math.max(0,proofSigned)/tracker.maxProofFavorableUsd:null,
    episodeRetention:tracker.maxEpisodeFavorableUsd>0?Math.max(0,episodeSigned)/tracker.maxEpisodeFavorableUsd:null,
    context:contextSnapshot(snap,tracker.proofDirection)
  };
}
function updateConversionTrackers(ep,frame,snap){
  const now=Number(frame.market.timestamp),price=Number(frame.market.price);
  for(const tracker of Object.values(ep.eventConversion||{})){
    const pMove=signedMove(tracker.proofDirection,price,tracker.eventPrice);
    const eMove=signedMove(ep.direction,price,tracker.eventPrice);
    tracker.currentProofSignedUsd=pMove;
    tracker.maxProofFavorableUsd=Math.max(Number(tracker.maxProofFavorableUsd)||0,pMove);
    tracker.maxProofAdverseUsd=Math.max(Number(tracker.maxProofAdverseUsd)||0,-pMove);
    tracker.currentEpisodeSignedUsd=eMove;
    tracker.maxEpisodeFavorableUsd=Math.max(Number(tracker.maxEpisodeFavorableUsd)||0,eMove);
    tracker.maxEpisodeAdverseUsd=Math.max(Number(tracker.maxEpisodeAdverseUsd)||0,-eMove);
    if(!tracker.proofHit220At&&pMove>=ECONOMIC_TARGET_USD)tracker.proofHit220At=now;
    if(!tracker.proofHitMinus180At&&pMove<=-ADVERSE_REFERENCE_USD)tracker.proofHitMinus180At=now;
    if(!tracker.episodeHit220At&&eMove>=ECONOMIC_TARGET_USD)tracker.episodeHit220At=now;
    if(!tracker.episodeHitMinus180At&&eMove<=-ADVERSE_REFERENCE_USD)tracker.episodeHitMinus180At=now;
    const elapsed=(now-Number(tracker.eventTs))/60000;
    for(const m of CONVERSION_HORIZONS_MIN){
      if(tracker.horizons[String(m)]===null&&elapsed>=m)tracker.horizons[String(m)]=conversionPoint(tracker,ep,frame,snap,m);
    }
  }
}
function recordEvent(ep,name,frame,snap,ref=null){
  if(name.includes('CONFIRMED')&&ref&&finite(ref.ts)&&Number(ref.ts)<Number(ep.startedAt))return false;
  if(!ep.events[name])ep.events[name]={firstTs:null,firstPrice:null,count:0,occurrences:[]};
  const e=ep.events[name],now=Number(frame.market.timestamp),price=Number(frame.market.price);
  const occurrence={ts:now,price,refTs:ref&&finite(ref.ts)?Number(ref.ts):null,value:ref&&finite(ref.value)?Number(ref.value):null};
  const first=!e.firstTs;
  if(first){
    e.firstTs=now;e.firstPrice=price;
    ep.eventConversion[name]=newConversionTracker(name,ep,frame,snap,ref);
  }
  const last=e.occurrences[e.occurrences.length-1];
  if(!last||now-Number(last.ts)>=30000){
    e.occurrences.push(occurrence);if(e.occurrences.length>MAX_OCCURRENCES_PER_EVENT)e.occurrences.shift();e.count++;
  }
  return first;
}
function updateOrder(ep){
  const arr=Object.entries(ep.events).filter(([,v])=>finite(v.firstTs)).sort((a,b)=>Number(a[1].firstTs)-Number(b[1].firstTs));
  ep.orderSignature=arr.map(([k])=>k);
  ep.orderString=ep.orderSignature.join(' → ');
  const base=arr.length?Number(arr[0][1].firstTs):null;
  const basePrice=arr.length?Number(arr[0][1].firstPrice):null;
  ep.firstEventTs=base;
  ep.firstEventPrice=basePrice;
  ep.eventLags={};
  for(const [k,v] of arr){
    ep.eventLags[k]={
      minutesFromFirst:base!==null?(Number(v.firstTs)-base)/60000:null,
      priceFromFirst:basePrice!==null?signedMove(ep.direction,Number(v.firstPrice),basePrice):null
    };
  }
}
function signedMove(direction,price,start){return direction==='long'?Number(price)-Number(start):Number(start)-Number(price);}
function newEpisode(frame,direction,mcb,setup){
  const now=Number(frame.market.timestamp),price=Number(frame.market.price);
  return {
    id:[campaignId(direction,mcb),now].join('@'),campaignId:campaignId(direction,mcb),
    direction,startedAt:now,startedPrice:price,setupKey:setup&&setup.setupKey||null,
    events:{},eventConversion:{},orderSignature:[],orderString:'',eventLags:{},
    samples:0,lastTs:now,lastPrice:price,currentSignedUsd:0,maxFavorableUsd:0,maxAdverseUsd:0,
    hit220At:null,hitMinus180At:null,success220BeforeMinus180:null,
    relaxationCount:0,relaxations:[],status:'TRACKING'
  };
}
function processEpisode(ep,frame,snap){
  const now=Number(frame.market.timestamp),price=Number(frame.market.price);
  updateConversionTrackers(ep,frame,snap);
  const move=signedMove(ep.direction,price,ep.startedPrice);
  ep.currentSignedUsd=move;ep.maxFavorableUsd=Math.max(ep.maxFavorableUsd,move);ep.maxAdverseUsd=Math.max(ep.maxAdverseUsd,-move);
  if(!ep.hit220At&&move>=ECONOMIC_TARGET_USD)ep.hit220At=now;
  if(!ep.hitMinus180At&&move<=-ADVERSE_REFERENCE_USD)ep.hitMinus180At=now;
  if(ep.success220BeforeMinus180===null&&(ep.hit220At||ep.hitMinus180At)){
    ep.success220BeforeMinus180=!!(ep.hit220At&&(!ep.hitMinus180At||ep.hit220At<ep.hitMinus180At));
  }
  const refMap={
    E3_LIVE:snap.refs.e3Live,E3_CONFIRMED:snap.refs.e3Confirmed,
    E15_LIVE:snap.refs.e15Live,E15_CONFIRMED:snap.refs.e15Confirmed,
    E3_OPPOSITE_LIVE:snap.refs.opp3Live,E3_OPPOSITE_CONFIRMED:snap.refs.opp3Confirmed,
    E15_OPPOSITE_LIVE:snap.refs.opp15Live,E15_OPPOSITE_CONFIRMED:snap.refs.opp15Confirmed
  };
  for(const [name,on] of Object.entries(snap.conditions))if(on)recordEvent(ep,name,frame,snap,refMap[name]||null);
  const oppositeLive=!!snap.conditions.E3_OPPOSITE_LIVE;
  const oppositeConfirmed=!!(snap.conditions.E3_OPPOSITE_CONFIRMED&&snap.refs.opp3Confirmed&&finite(snap.refs.opp3Confirmed.ts)&&Number(snap.refs.opp3Confirmed.ts)>=Number(ep.startedAt));
  if(oppositeLive||oppositeConfirmed){
    const last=ep.relaxations[ep.relaxations.length-1];
    if(!last||now-Number(last.ts)>2*60000){
      ep.relaxations.push({ts:now,price,kind:oppositeConfirmed?'CONFIRMED':'LIVE',
        pm3:snap.values.pm3,pm5:snap.values.pm5,lbw15Slope:snap.values.lbw15Slope,mf15Slope:snap.values.mf15Slope,
        struct15:snap.values.struct15,lobe15:snap.values.lobe15});
      ep.relaxationCount++;
    }
  }
  ep.lastValues=snap.values;ep.samples++;ep.lastTs=now;ep.lastPrice=price;
  updateOrder(ep);
  return ep;
}
function finalize(ep,frame,reason){
  if(!ep)return null;const out=JSON.parse(JSON.stringify(ep)),now=Number(frame.market.timestamp);
  out.status='COMPLETED';out.resolvedAt=now;out.durationMinutes=(now-Number(out.startedAt))/60000;out.resolution=reason||'CONTEXT_CHANGED';
  return out;
}
function proofStats(rows){
  const agg={};
  for(const ep of rows)for(const [name,t] of Object.entries(ep.eventConversion||{})){
    if(!agg[name])agg[name]={event:name,family:t.family,polarity:t.polarity,occurrences:0,matured5:0,sum5:0,positive5:0,matured15:0,sum15:0,positive15:0,proof220BeforeMinus180:0};
    const a=agg[name];a.occurrences++;
    const h5=t.horizons&&t.horizons['5'],h15=t.horizons&&t.horizons['15'];
    if(h5){a.matured5++;a.sum5+=Number(h5.proofSignedUsd||0);if(Number(h5.proofSignedUsd)>0)a.positive5++;}
    if(h15){a.matured15++;a.sum15+=Number(h15.proofSignedUsd||0);if(Number(h15.proofSignedUsd)>0)a.positive15++;}
    if(t.proofHit220At&&(!t.proofHitMinus180At||Number(t.proofHit220At)<Number(t.proofHitMinus180At)))a.proof220BeforeMinus180++;
  }
  return Object.values(agg).map(a=>({
    event:a.event,family:a.family,polarity:a.polarity,occurrences:a.occurrences,
    matured5:a.matured5,avgProofSigned5m:a.matured5?a.sum5/a.matured5:null,positive5Rate:a.matured5?a.positive5/a.matured5:null,
    matured15:a.matured15,avgProofSigned15m:a.matured15?a.sum15/a.matured15:null,positive15Rate:a.matured15?a.positive15/a.matured15:null,
    proof220BeforeMinus180:a.proof220BeforeMinus180
  })).sort((a,b)=>b.occurrences-a.occurrences);
}
function interactionStats(rows){
  const agg={};
  for(const ep of rows){
    const arr=Object.entries(ep.events||{}).filter(([,v])=>finite(v.firstTs)).sort((a,b)=>Number(a[1].firstTs)-Number(b[1].firstTs));
    const groups=[];
    for(const [name,v] of arr){
      let g=groups[groups.length-1];
      if(!g||Number(v.firstTs)!==g.ts){g={ts:Number(v.firstTs),price:Number(v.firstPrice),events:[]};groups.push(g);}
      g.events.push(name);
    }
    for(let i=1;i<groups.length;i++){
      const from=groups[i-1],to=groups[i],lag=(to.ts-from.ts)/60000,move=signedMove(ep.direction,to.price,from.price);
      for(const f of from.events)for(const t of to.events){
        const key=f+' → '+t;
        if(!agg[key])agg[key]={from:f,to:t,count:0,sumLag:0,sumMove:0,matured5:0,sumAfter5:0,positiveAfter5:0};
        const a=agg[key];a.count++;a.sumLag+=lag;a.sumMove+=move;
        const conv=ep.eventConversion&&ep.eventConversion[t],h5=conv&&conv.horizons&&conv.horizons['5'];
        if(h5){a.matured5++;a.sumAfter5+=Number(h5.episodeSignedUsd||0);if(Number(h5.episodeSignedUsd)>0)a.positiveAfter5++;}
      }
    }
  }
  return Object.entries(agg).map(([interaction,a])=>({
    interaction,from:a.from,to:a.to,count:a.count,avgLagMinutes:a.count?a.sumLag/a.count:null,
    avgEpisodeMoveBetweenUsd:a.count?a.sumMove/a.count:null,
    matured5:a.matured5,avgEpisodeSigned5mAfterTo:a.matured5?a.sumAfter5/a.matured5:null,
    positive5RateAfterTo:a.matured5?a.positiveAfter5/a.matured5:null
  })).sort((a,b)=>b.count-a.count||Math.abs(Number(b.avgEpisodeSigned5mAfterTo||0))-Math.abs(Number(a.avgEpisodeSigned5mAfterTo||0))).slice(0,30);
}
function summarize(completed,active){
  const rows=[...(completed||[]),...(active?[active]:[])];
  const orderCounts={};
  for(const e of rows){const k=e.orderString||'NO_EVENTS';orderCounts[k]=(orderCounts[k]||0)+1;}
  return {
    episodes:rows.length,success220BeforeMinus180:rows.filter(e=>e.success220BeforeMinus180===true).length,
    withRelaxation:rows.filter(e=>e.relaxationCount>0).length,
    orders:Object.entries(orderCounts).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([order,count])=>({order,count})),
    proofConversion:proofStats(rows),
    interactions:interactionStats(rows)
  };
}
function evaluate(frame,setup,entryBaseThesis,thesis,mcb,native,translation,priceBehavior,previous=null){
  const compatiblePrevious=previous&&(previous.version===VERSION||previous.version==='elastic-sync-shadow-v0.2')?previous:null;
  const prev=compatiblePrevious;
  // Preserve v0.2 completed episodes for order/lag history, but start a fresh
  // v0.3 active episode because old events have no prospective conversion clocks.
  let active=prev&&prev.version===VERSION&&prev.activeEpisode?JSON.parse(JSON.stringify(prev.activeEpisode)):null;
  let completed=prev&&Array.isArray(prev.completed)?prev.completed.slice():[];
  completed=completed.map(ep=>({...ep,eventConversion:ep&&ep.eventConversion||{},legacyVersion:ep&&ep.eventConversion?null:(ep&&ep.legacyVersion||'elastic-sync-shadow-v0.2')}));
  const direction=candidateDirection(setup,entryBaseThesis,thesis,priceBehavior);
  const degraded=!!(mcb&&mcb.dataQuality&&mcb.dataQuality.degraded);
  const snap=direction?eventSnapshot(frame,direction,mcb,native,translation,priceBehavior):null;
  const seed=!!(snap&&Object.entries(snap.conditions).some(([k,v])=>v&&[
    'E3_LIVE','PM3_EFFECTIVE','PM5_EFFECTIVE','PRICE_PRODUCTIVE','E15_LIVE','LOBE3_ALIGNED'
  ].includes(k)));
  const cid=direction?campaignId(direction,mcb):null;

  if(active){
    if(degraded){completed.push(finalize(active,frame,'DATA_DEGRADED'));active=null;}
    else if(!direction){completed.push(finalize(active,frame,'CANDIDATE_LOST'));active=null;}
    else if(direction!==active.direction){completed.push(finalize(active,frame,'DIRECTION_CHANGED'));active=null;}
    else if(cid!==active.campaignId){completed.push(finalize(active,frame,'15M_CAMPAIGN_CHANGED'));active=null;}
  }
  if(!active&&!degraded&&direction&&seed)active=newEpisode(frame,direction,mcb,setup);
  if(active&&snap)active=processEpisode(active,frame,snap);
  completed=completed.filter(Boolean).slice(-MAX_COMPLETED);
  return {
    version:VERSION,decisionImpact:false,state:active?'TRACKING_ELASTIC_HANDOFF':'IDLE',
    activeEpisode:active,completed,summary:summarize(completed,active),
    eventVocabulary:[
      'E3_LIVE','E3_CONFIRMED','PM3_EFFECTIVE','PM5_EFFECTIVE','PRICE_PRODUCTIVE','LBW3_ZERO_SIDE',
      'LBW15_SLOPE_ALIGNED','E15_LIVE','LBW15_ZERO_SIDE','E15_CONFIRMED','MF15_SLOPE_ALIGNED',
      'LOBE3_ALIGNED','STRUCT3_ALIGNED','STRUCT15_ALIGNED','MA3_SIDE_ALIGNED','MA15_SIDE_ALIGNED',
      'E3_OPPOSITE_LIVE','E3_OPPOSITE_CONFIRMED','PM3_OPPOSITE','PM5_OPPOSITE','PRICE_OPPOSITE_PRODUCTIVE',
      'LBW3_ZERO_OPPOSITE','LBW15_SLOPE_OPPOSITE','E15_OPPOSITE_LIVE','LBW15_ZERO_OPPOSITE',
      'E15_OPPOSITE_CONFIRMED','MF15_SLOPE_OPPOSITE','LOBE3_OPPOSITE','STRUCT3_OPPOSITE',
      'STRUCT15_OPPOSITE','MA3_SIDE_OPPOSITE','MA15_SIDE_OPPOSITE'
    ],
    conversionHorizonsMinutes:CONVERSION_HORIZONS_MIN,
    contract:{
      ordered:false,learnObservedOrder:true,
      pairwiseLagBasis:'first occurrence timestamps + price consumed between evidence batches',
      evidenceConversion:'each first proof/counterfact is evaluated at 1/3/5/15/30m in its own direction and in the episode direction',
      relaxationSemantic:'opposite evidence is measured by subsequent conversion; it never invalidates the slower impulse by definition'
    },
    references:{economicTargetUsd:ECONOMIC_TARGET_USD,adverseReferenceUsd:ADVERSE_REFERENCE_USD},
    semantic:'shadow-only temporal handoff laboratory: learns actual proof order, proof conversion and recurring causal interactions without trading authority'
  };
}
module.exports={VERSION,CONVERSION_HORIZONS_MIN,evaluate,auditSlope,eventSnapshot,evidenceFamily,eventProofDirection};
