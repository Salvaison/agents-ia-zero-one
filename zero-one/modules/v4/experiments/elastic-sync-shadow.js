'use strict';

const VERSION='elastic-sync-shadow-v0.2';
const ECONOMIC_TARGET_USD=220;
const ADVERSE_REFERENCE_USD=180;
const MAX_COMPLETED=50;
const MAX_OCCURRENCES_PER_EVENT=8;

function finite(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));}
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
  return signalEvent(native,tf,direction==='long'?'short':'long',live);
}
function eventSnapshot(frame,direction,mcb,native,translation,priceBehavior){
  const rows=frame&&frame.sources&&frame.sources.auditRows||[];
  const a=latestAudit(frame)||{};
  const h=translation&&translation.horizons||{};
  const n3=mcb&&mcb.nested3m||{};
  const c15=mcb&&mcb.currentLobe||{};
  const lbw15=finite(a.live15LbwRaw)?Number(a.live15LbwRaw):(finite(c15.currentLbw)?Number(c15.currentLbw):null);
  const lbw15Slope=auditSlope(rows,'live15LbwRaw',3);
  const mf15Slope=finite(a.mf15Pente)?Number(a.mf15Pente):auditSlope(rows,'live15MoneyFlow',5);
  const e3Live=signalEvent(native,'3m',direction,true);
  const e3Confirmed=signalEvent(native,'3m',direction,false);
  const e15Live=signalEvent(native,'15m',direction,true);
  const e15Confirmed=signalEvent(native,'15m',direction,false);
  const opp3Live=oppositeSignalEvent(native,'3m',direction,true);
  const opp3Confirmed=oppositeSignalEvent(native,'3m',direction,false);
  const pm3=finite(h.net3mUsd)?Number(h.net3mUsd):null;
  const pm5=finite(h.net5mUsd)?Number(h.net5mUsd):null;
  const eff3=finite(h.efficiency3m)?Number(h.efficiency3m):null;
  const eff5=finite(h.efficiency5m)?Number(h.efficiency5m):null;
  return {
    values:{lbw15,lbw15Slope,mf15Slope,pm3,pm5,eff3,eff5,
      lobe3:n3.lobeDirection||null,struct3:n3.structuralDirection||null,
      lobe15:c15.lobeDirection||null,struct15:c15.structuralDirection||null},
    conditions:{
      E3_LIVE:!!e3Live,
      E3_CONFIRMED:!!e3Confirmed,
      PM3_EFFECTIVE:alignedValue(pm3,direction,10)&&finite(eff3)&&eff3>=.25,
      PM5_EFFECTIVE:alignedValue(pm5,direction,10)&&(!finite(eff5)||eff5>=.25),
      PRICE_PRODUCTIVE:!!(priceBehavior&&priceBehavior.interesting&&priceBehavior.direction===direction),
      LBW15_SLOPE_ALIGNED:alignedValue(lbw15Slope,direction,0),
      E15_LIVE:!!e15Live,
      LBW15_ZERO_SIDE:direction==='long'?finite(lbw15)&&lbw15>0:finite(lbw15)&&lbw15<0,
      E15_CONFIRMED:!!e15Confirmed,
      MF15_SLOPE_ALIGNED:alignedValue(mf15Slope,direction,0),
      LOBE3_ALIGNED:n3.lobeDirection===direction,
      STRUCT3_ALIGNED:n3.structuralDirection===direction,
      STRUCT15_ALIGNED:c15.structuralDirection===direction,
      E3_OPPOSITE_LIVE:!!opp3Live,
      E3_OPPOSITE_CONFIRMED:!!opp3Confirmed
    },
    refs:{e3Live,e3Confirmed,e15Live,e15Confirmed,opp3Live,opp3Confirmed}
  };
}
function campaignId(direction,mcb){
  const c=mcb&&mcb.currentLobe||{};
  const anchor=finite(c.startTs)?Number(c.startTs):finite(c.extremeTs)?Number(c.extremeTs):0;
  return [direction,anchor].join('|');
}
function recordEvent(ep,name,frame,snap,ref=null){
  // Confirmed native events carry the bar timestamp. Never import an event
  // that predates this elastic episode into its causal order.
  if(name.includes('CONFIRMED')&&ref&&finite(ref.ts)&&Number(ref.ts)<Number(ep.startedAt))return;
  if(!ep.events[name])ep.events[name]={firstTs:null,firstPrice:null,count:0,occurrences:[]};
  const e=ep.events[name],now=Number(frame.market.timestamp),price=Number(frame.market.price);
  const occurrence={ts:now,price,refTs:ref&&finite(ref.ts)?Number(ref.ts):null,value:ref&&finite(ref.value)?Number(ref.value):null};
  if(!e.firstTs){e.firstTs=now;e.firstPrice=price;}
  const last=e.occurrences[e.occurrences.length-1];
  if(!last||now-Number(last.ts)>=30000){
    e.occurrences.push(occurrence);if(e.occurrences.length>MAX_OCCURRENCES_PER_EVENT)e.occurrences.shift();e.count++;
  }
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
      priceFromFirst:basePrice!==null?(ep.direction==='long'?Number(v.firstPrice)-basePrice:basePrice-Number(v.firstPrice)):null
    };
  }
}
function signedMove(direction,price,start){return direction==='long'?Number(price)-Number(start):Number(start)-Number(price);}
function newEpisode(frame,direction,mcb,setup){
  const now=Number(frame.market.timestamp),price=Number(frame.market.price);
  return {
    id:[campaignId(direction,mcb),now].join('@'),campaignId:campaignId(direction,mcb),
    direction,startedAt:now,startedPrice:price,setupKey:setup&&setup.setupKey||null,
    events:{},orderSignature:[],orderString:'',eventLags:{},
    samples:0,lastTs:now,lastPrice:price,currentSignedUsd:0,maxFavorableUsd:0,maxAdverseUsd:0,
    hit220At:null,hitMinus180At:null,success220BeforeMinus180:null,
    relaxationCount:0,relaxations:[],status:'TRACKING'
  };
}
function processEpisode(ep,frame,snap){
  const now=Number(frame.market.timestamp),price=Number(frame.market.price);
  const move=signedMove(ep.direction,price,ep.startedPrice);
  ep.currentSignedUsd=move;ep.maxFavorableUsd=Math.max(ep.maxFavorableUsd,move);ep.maxAdverseUsd=Math.max(ep.maxAdverseUsd,-move);
  if(!ep.hit220At&&move>=ECONOMIC_TARGET_USD)ep.hit220At=now;
  if(!ep.hitMinus180At&&move<=-ADVERSE_REFERENCE_USD)ep.hitMinus180At=now;
  if(ep.success220BeforeMinus180===null&&(ep.hit220At||ep.hitMinus180At)){
    ep.success220BeforeMinus180=!!(ep.hit220At&&(!ep.hitMinus180At||ep.hit220At<ep.hitMinus180At));
  }
  const refMap={E3_LIVE:snap.refs.e3Live,E3_CONFIRMED:snap.refs.e3Confirmed,E15_LIVE:snap.refs.e15Live,E15_CONFIRMED:snap.refs.e15Confirmed,E3_OPPOSITE_LIVE:snap.refs.opp3Live,E3_OPPOSITE_CONFIRMED:snap.refs.opp3Confirmed};
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
function summarize(completed,active){
  const rows=[...(completed||[]),...(active?[active]:[])];
  const orderCounts={};
  for(const e of rows){const k=e.orderString||'NO_EVENTS';orderCounts[k]=(orderCounts[k]||0)+1;}
  return {
    episodes:rows.length,success220BeforeMinus180:rows.filter(e=>e.success220BeforeMinus180===true).length,
    withRelaxation:rows.filter(e=>e.relaxationCount>0).length,
    orders:Object.entries(orderCounts).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([order,count])=>({order,count}))
  };
}
function evaluate(frame,setup,entryBaseThesis,thesis,mcb,native,translation,priceBehavior,previous=null){
  const prev=previous&&previous.version===VERSION?previous:null;
  let active=prev&&prev.activeEpisode?JSON.parse(JSON.stringify(prev.activeEpisode)):null;
  let completed=prev&&Array.isArray(prev.completed)?prev.completed.slice():[];
  const direction=candidateDirection(setup,entryBaseThesis,thesis,priceBehavior);
  const degraded=!!(mcb&&mcb.dataQuality&&mcb.dataQuality.degraded);
  const snap=direction?eventSnapshot(frame,direction,mcb,native,translation,priceBehavior):null;
  const seed=!!(snap&&Object.entries(snap.conditions).some(([k,v])=>v&&['E3_LIVE','PM3_EFFECTIVE','PM5_EFFECTIVE','PRICE_PRODUCTIVE','E15_LIVE','LOBE3_ALIGNED'].includes(k)));
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
    eventVocabulary:['E3_LIVE','E3_CONFIRMED','PM3_EFFECTIVE','PM5_EFFECTIVE','PRICE_PRODUCTIVE','LBW15_SLOPE_ALIGNED','E15_LIVE','LBW15_ZERO_SIDE','E15_CONFIRMED','MF15_SLOPE_ALIGNED','LOBE3_ALIGNED','STRUCT3_ALIGNED','STRUCT15_ALIGNED','E3_OPPOSITE_LIVE','E3_OPPOSITE_CONFIRMED'],
    contract:{ordered:false,learnObservedOrder:true,pairwiseLagBasis:'first occurrence timestamps + price consumed from first observed event',
      relaxationSemantic:'opposite E3 during an active handoff is recorded, never assumed to invalidate the slower impulse'},
    references:{economicTargetUsd:ECONOMIC_TARGET_USD,adverseReferenceUsd:ADVERSE_REFERENCE_USD},
    semantic:'shadow-only temporal handoff laboratory: records the actual order, lag and price consumption of fast/slow evidence without assuming a canonical sequence'
  };
}
module.exports={VERSION,evaluate,auditSlope,eventSnapshot};
