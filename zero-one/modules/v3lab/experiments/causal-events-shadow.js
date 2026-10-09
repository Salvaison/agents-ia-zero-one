'use strict';

function finite(v){return Number.isFinite(Number(v));}
function q(v,p){
  const a=v.filter(finite).map(Number).sort((x,y)=>x-y);
  if(!a.length)return null;
  return a[Math.min(a.length-1,Math.round((a.length-1)*p))];
}
function priceAtOrBefore(rows,targetTs){
  let best=null;
  for(const r of rows){
    const ts=Number(r.ts);
    if(!finite(ts)||ts>targetTs)break;
    if(finite(r.lastPrice))best=r;
  }
  return best;
}
function netOver(rows,now,currentPrice,ms){
  const r=priceAtOrBefore(rows,now-ms);
  return r&&finite(r.lastPrice)?Number(currentPrice)-Number(r.lastPrice):null;
}
function fiveMinuteDistribution(rows,now){
  const start=now-12*3600000;
  const a=rows.filter(r=>Number(r.ts)>=start&&finite(r.lastPrice));
  const out=[];let j=0;
  for(let i=0;i<a.length;i++){
    const target=Number(a[i].ts)-300000;
    while(j+1<i&&Number(a[j+1].ts)<=target)j++;
    if(j<i&&Math.abs(Number(a[j].ts)-target)<=90000)
      out.push(Math.abs(Number(a[i].lastPrice)-Number(a[j].lastPrice)));
  }
  return out;
}function impulse(frame){
  const rows=(frame.sources.auditRows||[]).filter(r=>finite(r.ts)&&finite(r.lastPrice)).sort((a,b)=>Number(a.ts)-Number(b.ts));
  const now=Number(frame.market.timestamp), price=Number(frame.market.price);
  const net1m=netOver(rows,now,price,60000);
  const net3m=netOver(rows,now,price,180000);
  const net5m=netOver(rows,now,price,300000);
  const dist=fiveMinuteDistribution(rows,now);
  const p90=q(dist,.90),p95=q(dist,.95),p99=q(dist,.99);
  const abs5=finite(net5m)?Math.abs(Number(net5m)):null;
  let rarity='UNKNOWN';
  if(finite(abs5)&&finite(p99)&&abs5>=p99)rarity='P99_PLUS';
  else if(finite(abs5)&&finite(p95)&&abs5>=p95)rarity='P95_PLUS';
  else if(finite(abs5)&&finite(p90)&&abs5>=p90)rarity='P90_PLUS';
  else if(finite(abs5))rarity='NORMAL';
  return {
    net1mUsd:net1m,net3mUsd:net3m,net5mUsd:net5m,
    direction:finite(net5m)?(net5m>0?'long':net5m<0?'short':null):null,
    abs5mUsd:abs5,rarity,
    baseline12h:{n:dist.length,p90Abs5mUsd:p90,p95Abs5mUsd:p95,p99Abs5mUsd:p99},
    semantic:'EVENT_DETECTOR_ONLY_NOT_DIRECTION_PERMISSION'
  };
}
function boundary(ma200){
  const tf=ma200&&ma200.byTf&&ma200.byTf['3m']||null;
  if(!tf)return {available:false};
  const resolved=(tf.recentContacts||[]).filter(x=>x&&x.resolveTimestamp);
  let consecutiveHoldCount=0, holdSide=null;
  for(let i=resolved.length-1;i>=0;i--){
    const ev=resolved[i].event;
    const side=ev==='HOLD_AS_SUPPORT'?'long':ev==='HOLD_AS_RESISTANCE'?'short':null;
    if(!side)break;
    if(holdSide===null)holdSide=side;
    if(side!==holdSide)break;
    consecutiveHoldCount++;
  }  return {
    available:true,
    current:tf.current||null,
    currentRun:tf.campaign&&tf.campaign.currentRun||null,
    lastResolved:resolved.length?resolved[resolved.length-1]:null,
    consecutiveResolvedHoldCount:consecutiveHoldCount,
    consecutiveResolvedHoldDirection:holdSide,
    recentResolved:resolved.slice(-5),
    semantic:'BOUNDARY_MEMORY_DESCRIPTIVE_ONLY'
  };
}
function combat(result,boundaryState){
  const r=result.regime||{}, c=r.current||{}, d=result.dominance||{};
  const scores=d.scores||{};
  const winner=d.direction;
  const winnerScore=winner==='long'?Number(scores.long):winner==='short'?Number(scores.short):null;
  const loserScore=winner==='long'?Number(scores.short):winner==='short'?Number(scores.long):null;
  return {
    regimeState:r.state||null,
    netUsd60m:finite(c.netUsd)?Number(c.netUsd):null,
    efficiency60m:finite(c.efficiency)?Number(c.efficiency):null,
    grossPerHour:finite(c.grossPerHour)?Number(c.grossPerHour):null,
    cadenceP95:finite(c.cadenceP95)?Number(c.cadenceP95):null,
    moveP95:finite(c.moveP95)?Number(c.moveP95):null,
    dominance:{
      state:d.state||null,direction:winner||null,
      proofScore:finite(d.proofScore)?Number(d.proofScore):null,
      persistCount:finite(d.persistCount)?Number(d.persistCount):null,
      retainedFraction:finite(d.retainedFraction)?Number(d.retainedFraction):null,
      conserved:d.conserved===true,
      winnerScore:finite(winnerScore)?winnerScore:null,
      loserScore:finite(loserScore)?loserScore:null
    },
    boundary:boundaryState,
    semantic:'COMBAT_RESOLUTION_INPUTS_ONLY_NO_DECISION_IMPACT'
  };
}function evaluate(frame,result,ma200){
  const completed=result.wave&&result.wave.completedLeg||result.wave&&result.wave.structural||null;
  return {
    version:'causal-events-shadow-v0.1',
    decisionImpact:false,
    priceImpulse:impulse(frame),
    turningLegacy:{
      type:result.wave&&result.wave.turningPoint||null,
      lbw:result.wave&&result.wave.current&&result.wave.current.lbw,
      phase:result.wave&&result.wave.phase||null,
      semantic:'LEGACY_LBW_NEAR_FLAT_OBSERVATION_ONLY'
    },
    completedLeg:completed?{
      direction:completed.direction||null,start:completed.start||null,end:completed.end||null,
      deltaUsd:completed.deltaUsd??null,magnitudeUsd:completed.magnitudeUsd??null,
      semantic:'COMPLETED_LEG_DESCRIPTIVE_NOT_AUTONOMOUS_EXIT'
    }:null,
    combat:combat(result,boundary(ma200)),
    note:'prix live, rarete netMove, memoire MA200 et conversion exposes en shadow; aucune permission entree/sortie'
  };
}
module.exports={evaluate,impulse,boundary,combat,fiveMinuteDistribution};
