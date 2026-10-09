'use strict';
const {finite}=require('../core/utils');

function isAhead(direction,distanceUsd){
  if(!direction||!finite(distanceUsd))return false;
  return direction==='long'?Number(distanceUsd)>0:Number(distanceUsd)<0;
}

function normalizedLabel(v){return String(v||'').trim().toUpperCase();}
function rangeCandidates(levels){
  const by=new Map();
  for(const l of Array.isArray(levels)?levels:[]){
    const gid=l&&l.groupId;
    if(gid===null||gid===undefined)continue;
    const p=Number(l.price);if(!finite(p))continue;
    const label=normalizedLabel(l.label||l.token);
    let g=by.get(String(gid));if(!g){g={groupId:gid,rows:[]};by.set(String(gid),g);}
    g.rows.push({label,price:p,fam:l.fam||null,raw:l});
  }
  const out=[];
  for(const g of by.values()){
    const vah=g.rows.find(x=>x.label.includes('VAH'));
    const val=g.rows.find(x=>x.label.includes('VAL'));
    const poc=g.rows.find(x=>x.label.includes('POC'));
    if(!vah||!val||Number(vah.price)<=Number(val.price))continue;
    out.push({groupId:g.groupId,vah:Number(vah.price),val:Number(val.price),poc:poc?Number(poc.price):null,heightUsd:Number(vah.price)-Number(val.price)});
  }
  return out;
}
function nearestRange(levels,price){
  const a=rangeCandidates(levels);
  if(!a.length)return null;
  a.sort((x,y)=>{
    const dx=price<x.val?x.val-price:price>x.vah?price-x.vah:0;
    const dy=price<y.val?y.val-price:price>y.vah?price-y.vah:0;
    return dx-dy;
  });
  return a[0];
}
function rangeRr(levels,price,direction){
  const r=nearestRange(levels,price);
  if(!r||!finite(price)||!direction)return {available:false,decisionImpact:false};
  const pos=(Number(price)-r.val)/r.heightUsd;
  let location='INSIDE_RANGE';
  if(price<r.val)location='BELOW_RANGE';
  else if(price>r.vah)location='ABOVE_RANGE';
  let roomUsd=null,roomFraction=null,quality='OUTSIDE_RANGE',targetBoundary=null,reclaimDistanceUsd=null;
  if(location==='INSIDE_RANGE'){
    roomUsd=direction==='long'?r.vah-price:price-r.val;
    roomFraction=r.heightUsd>0?roomUsd/r.heightUsd:null;
    quality=roomFraction<=.15?'LOW_RR':roomFraction<=.30?'TIGHT_RR':'OPEN_RR';
    targetBoundary=direction==='long'?'VAH':'VAL';
  }else if(location==='BELOW_RANGE'){
    reclaimDistanceUsd=r.val-price;
    quality=direction==='long'?'LONG_RECLAIM_REQUIRED':'BELOW_RANGE_BREAK';
    targetBoundary='VAL';
  }else{
    reclaimDistanceUsd=price-r.vah;
    quality=direction==='short'?'SHORT_RECLAIM_REQUIRED':'ABOVE_RANGE_BREAK';
    targetBoundary='VAH';
  }
  return {
    available:true,decisionImpact:false,groupId:r.groupId,
    val:r.val,poc:r.poc,vah:r.vah,heightUsd:r.heightUsd,
    price:Number(price),positionFraction:pos,location,
    direction,roomUsd,roomFraction,quality,targetBoundary,reclaimDistanceUsd,
    note:'range position qualifies remaining R/R and reclaim risk; never chooses direction or vetoes admission by itself'
  };
}

function evaluate(frame,candidateDirection,context){
  const price=Number(frame.market.price);
  const w=context&&context.where||{};
  const boundaries=[];
  const ma=w.ma200||{};
  if(ma.available&&ma.fresh&&finite(ma.price)){
    const d=Number(ma.price)-price,abs=Math.abs(d),tol=finite(ma.toleranceUsd)?Number(ma.toleranceUsd):Math.abs(price)*.001;
    boundaries.push({
      kind:'MA200_15M',price:Number(ma.price),distanceUsd:d,distanceAbsUsd:abs,
      ahead:isAhead(candidateDirection,d),contest:isAhead(candidateDirection,d)&&abs<=tol,
      approaching:isAhead(candidateDirection,d)&&abs<=2*tol,
      toleranceUsd:tol,source:ma.source||null
    });
  }
  const sr=w.sr&&w.sr.interaction;
  if(sr&&finite(sr.price)){
    const d=Number(sr.price)-price;
    boundaries.push({
      kind:'LEVEL',label:sr.label||sr.family||null,price:Number(sr.price),distanceUsd:d,distanceAbsUsd:Math.abs(d),
      ahead:isAhead(candidateDirection,d),contest:isAhead(candidateDirection,d),approaching:isAhead(candidateDirection,d),
      family:sr.family||null
    });
  }
  const lines=w.lgi&&Array.isArray(w.lgi.lines)?w.lgi.lines:[];
  lines.forEach(function(line){
    if(!line||!finite(line.projected))return;
    const d=Number(line.projected)-price;
    boundaries.push({
      kind:'TRENDLINE',price:Number(line.projected),distanceUsd:d,distanceAbsUsd:Math.abs(d),
      ahead:isAhead(candidateDirection,d),contest:!!line.active&&isAhead(candidateDirection,d),
      approaching:!!line.active&&isAhead(candidateDirection,d),
      points:line.points||null,residual:line.residual||null,slopeUsdPerHour:line.slopeUsdPerHour||null
    });
  });
  const ahead=boundaries.filter(b=>b.ahead).sort((a,b)=>a.distanceAbsUsd-b.distanceAbsUsd);
  const contests=ahead.filter(b=>b.contest);
  const approaching=ahead.filter(b=>b.approaching);
  let state='OPEN_PATH';
  if(contests.length)state='BOUNDARY_CONTEST';
  else if(approaching.length)state='APPROACHING_BOUNDARY';
  const rr=rangeRr(frame.sources&&frame.sources.levels||[],price,candidateDirection);
  return {
    state,candidateDirection:candidateDirection||null,
    nearestAhead:ahead[0]||null,
    contesting:contests,
    boundaries,
    roomToBoundaryUsd:ahead.length?ahead[0].distanceAbsUsd:null,
    rangeRr:rr,
    admissionBlocked:state==='BOUNDARY_CONTEST',
    decisionImpact:state==='BOUNDARY_CONTEST',
    note:'une limite structurelle ne choisit jamais LONG/SHORT; rangeRr qualifie le terrain restant sans veto autonome'
  };
}
module.exports={evaluate,isAhead,rangeCandidates,nearestRange,rangeRr};
