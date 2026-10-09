'use strict';
let config={};
try{config=require('../../../config.json');}catch(_){config={};}

function finite(v){return Number.isFinite(Number(v));}
function lgiView(l,price){
  const projected=Number(l&&l.projectedNow);
  if(!finite(projected))return null;
  return {
    projected,
    distanceUsd:projected-price,
    distanceAbsUsd:Math.abs(projected-price),
    side:projected>=price?'ABOVE':'BELOW',
    anchorType:l.anchorType||null,
    points:l.points,
    residual:l.residual,
    slopeUsdPerHour:l.slopeUsdPerHour,
    contacts:Array.isArray(l.contacts)?l.contacts:undefined,
    active:!!l.active,
    confirmed:!!l.confirmed,
  };
}
function ma200State(frame,price){
  const tfs=frame.sources&&frame.sources.mcb&&frame.sources.mcb.tfs||{};
  const src=tfs['15m'];
  if(!src)return {available:false,timeframe:'15m'};
  let row=null,source=null,fresh=false;
  if(src.live&&finite(src.live.ma200)&&Number(src.liveUpdateAgeMs)<120000){row=src.live;source='live';fresh=true;}
  else if(src.confirmed&&finite(src.confirmed.ma200)){row=src.confirmed;source='confirmed';fresh=Number(src.confirmedUpdateAgeMs)<20*60*1000;}
  if(!row||!finite(row.ma200))return {available:false,timeframe:'15m',fresh:false};
  const ma=Number(row.ma200),distanceUsd=ma-price,distanceAbsUsd=Math.abs(distanceUsd);
  const tolPct=Number(config&&config.srZone&&config.srZone.ma200TolerancePercent);
  const tolerancePercent=finite(tolPct)?tolPct:.1;
  const toleranceUsd=Math.abs(price)*tolerancePercent/100;
  const nature=price>=ma?'SUPPORT':'RESISTANCE';
  return {
    available:true,timeframe:'15m',source,fresh,timestamp:row.timestamp||null,
    price:ma,distanceUsd,distanceAbsUsd,side:ma>=price?'ABOVE':'BELOW',nature,
    tolerancePercent,toleranceUsd,
    interaction:fresh&&distanceAbsUsd<=toleranceUsd,
    note:'MA200 15m = niveau dynamique directionnel: sous le prix support, au-dessus resistance'
  };
}
function evaluate(frame){
  const price=Number(frame.market.price), tl=frame.sources.trendlines||{}, levels=Array.isArray(frame.sources.levels)?frame.sources.levels:[];
  const fresh=tl.timestamp?Date.now()-Date.parse(tl.timestamp)<=180000:false;
  const cat=fresh&&Array.isArray(tl.catalogue)?tl.catalogue:[];
  const active=cat.filter(l=>l&&l.active);
  const lines=active.map(l=>lgiView(l,price)).filter(Boolean);
  const nearest=cat.map(l=>lgiView(l,price)).filter(Boolean).sort((a,b)=>a.distanceAbsUsd-b.distanceAbsUsd)[0]||null;

  let nearestLevel=null;
  for(const l of levels){
    const p=Number(l.price);if(!finite(p))continue;
    const x={label:l.label,family:l.fam,price:p,distanceUsd:p-price,distanceAbsUsd:Math.abs(p-price),side:p>=price?'ABOVE':'BELOW'};
    if(!nearestLevel||x.distanceAbsUsd<nearestLevel.distanceAbsUsd)nearestLevel=x;
  }
  const srInteraction=nearestLevel&&nearestLevel.distanceAbsUsd<=100?nearestLevel:null;
  const ma200=ma200State(frame,price);
  const maInteraction=ma200.interaction?{label:'MA200 15m',family:ma200.nature.toLowerCase(),price:ma200.price,distanceUsd:ma200.distanceUsd,distanceAbsUsd:ma200.distanceAbsUsd,side:ma200.side,nature:ma200.nature}:null;

  const relevant=active.length>0||!!srInteraction||!!maInteraction;
  const density=active.length+(srInteraction?1:0)+(maInteraction?1:0);
  let confidence='LOW';
  if(density>=2)confidence='HIGH';
  else if(density===1)confidence='MEDIUM';
  return {
    status:relevant?'RELEVANT':'NO_VALID_LOCATION',relevant,confidence,
    lgi:{fresh,activeCount:active.length,confluence:active.length,lines,nearest,
      note:'LGI = lieu geometrique neutre. ABOVE/BELOW decrit seulement le cote du prix; aucune nature support/resistance.'},
    sr:{nearest:nearestLevel,interaction:srInteraction,catalogueCount:levels.length,
      note:'niveaux fixes: la famille support/resistance peut porter une semantique directionnelle; autres familles restent des lieux'},
    ma200,
    density
  };
}
module.exports={evaluate,ma200State,lgiView};
