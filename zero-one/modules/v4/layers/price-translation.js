'use strict';
const {finite,quantile}=require('../core/utils');

function directionalRows(rows){
  return (rows||[]).filter(r=>finite(r.ts)&&finite(r.lastPrice)&&finite(r.priceMove));
}
function horizonStats(rows,marketTs,minutes){
  const end=(rows||[]).filter(r=>Number(r.ts)<=Number(marketTs)&&finite(r.lastPrice));
  if(!end.length)return {netUsd:null,grossUsd:null,efficiency:null};
  const cut=Number(marketTs)-minutes*60000;
  const seg=end.filter(r=>Number(r.ts)>=cut);
  const a=seg.length?seg:[end[end.length-1]];
  let gross=0;
  for(let i=1;i<a.length;i++)gross+=Math.abs(Number(a[i].lastPrice)-Number(a[i-1].lastPrice));
  const net=Number(a[a.length-1].lastPrice)-Number(a[0].lastPrice);
  return {netUsd:net,grossUsd:gross,efficiency:gross>0?Math.abs(net)/gross:0};
}
function horizonNet(rows,marketTs,minutes){return horizonStats(rows,marketTs,minutes).netUsd;}
function spanStats(rows,fromTs,marketTs){
  const a=(rows||[]).filter(r=>Number(r.ts)>=Number(fromTs)&&Number(r.ts)<=Number(marketTs)&&finite(r.lastPrice));
  if(a.length<2)return {available:false,n:a.length,netUsd:null,grossUsd:null,efficiency:null};
  let gross=0;
  for(let i=1;i<a.length;i++)gross+=Math.abs(Number(a[i].lastPrice)-Number(a[i-1].lastPrice));
  const net=Number(a[a.length-1].lastPrice)-Number(a[0].lastPrice);
  return {available:true,n:a.length,netUsd:net,grossUsd:gross,efficiency:gross>0?Math.abs(net)/gross:0,
    startTs:Number(a[0].ts),endTs:Number(a[a.length-1].ts)};
}
function evaluate(frame,thesis,opts={}){
  const rows=directionalRows(frame.sources.auditRows||[]);
  const recent=rows.slice(-240);
  const last=recent[recent.length-1]||null;
  if(!last)return {status:'UNKNOWN',direction:null,aligned:false,reason:'audit PM unavailable'};

  const absMoves=recent.map(r=>Math.abs(Number(r.priceMove))).filter(finite);
  const p75=quantile(absMoves,.75),p95=quantile(absMoves,.95);
  const move=Number(last.priceMove);
  const dir=move>0?'long':move<0?'short':null;
  const wanted=thesis&&(thesis.direction||thesis.candidateDirection)||null;
  const candidateOnly=!!(thesis&&thesis.state==='TRANSITION_NEUTRAL'&&!thesis.direction&&thesis.candidateDirection);
  const aligned=!!wanted&&dir===wanted;
  const opposite=!!wanted&&dir&&dir!==wanted;
  const h1=horizonStats(rows,frame.market.timestamp,1);
  const h3=horizonStats(rows,frame.market.timestamp,3);
  const h5=horizonStats(rows,frame.market.timestamp,5);
  const net1m=h1.netUsd,net3m=h3.netUsd,net5m=h5.netUsd;
  const aligned3=!!wanted&&finite(net3m)&&((wanted==='long'&&net3m>0)||(wanted==='short'&&net3m<0));
  const opposite3=!!wanted&&finite(net3m)&&((wanted==='long'&&net3m<0)||(wanted==='short'&&net3m>0));
  const sinceTs=finite(opts.sinceTs)?Number(opts.sinceTs):null;
  const fresh=sinceTs!==null?spanStats(rows,sinceTs,frame.market.timestamp):null;
  const freshNet=fresh&&fresh.netUsd;
  const freshAligned=sinceTs===null?aligned3:
    (!!wanted&&fresh&&fresh.available&&finite(freshNet)&&((wanted==='long'&&freshNet>0)||(wanted==='short'&&freshNet<0)));
  const freshOpposite=sinceTs===null?opposite3:
    (!!wanted&&fresh&&fresh.available&&finite(freshNet)&&((wanted==='long'&&freshNet<0)||(wanted==='short'&&freshNet>0)));
  const strong=finite(p95)&&Math.abs(move)>=Number(p95);
  const meaningful=finite(p75)&&Math.abs(move)>=Number(p75);
  const freshMaterial=sinceTs===null?true:!!(fresh&&fresh.available&&finite(fresh.netUsd)&&finite(fresh.efficiency)&&Math.abs(Number(fresh.netUsd))>=10&&Number(fresh.efficiency)>=.25);

  let status='NOT_TRANSLATING';
  if(!wanted)status='NO_THESIS';
  else if(sinceTs!==null){
    // Entry proof is causal from setupTs. Once a setup exists, cumulative
    // net/gross/efficiency carries the translation meaning; the last 30s tick
    // is descriptive and must not flip the setup on its own.
    if(!fresh||!fresh.available)status='FRESH_EVIDENCE_BUILDING';
    else if(freshAligned&&freshMaterial)status='TRANSLATING';
    else if(freshOpposite&&freshMaterial)status='OPPOSITE_TRANSLATION';
    else if(freshAligned)status=fresh.grossUsd>=20?'COMBAT_ALIGNED':'WEAK_ALIGNED';
    else if(freshOpposite)status=fresh.grossUsd>=20?'OPPOSITE_COMBAT':'WEAK_OPPOSITE';
  }
  else if(aligned&&freshAligned&&strong)status='STRONG_TRANSLATION';
  else if(aligned&&freshAligned&&meaningful)status='TRANSLATING';
  else if(aligned&&!freshAligned&&(strong||meaningful))status='BURST_ALIGNED';
  else if(aligned)status='WEAK_ALIGNED';
  else if(opposite&&freshOpposite&&strong)status='STRONG_OPPOSITE_TRANSLATION';
  else if(opposite&&freshOpposite&&meaningful)status='OPPOSITE_TRANSLATION';
  else if(opposite&&!freshOpposite&&(strong||meaningful))status='OPPOSITE_BURST';

  return {
    status,direction:dir,thesisDirection:wanted,aligned,opposite,candidateMeasurement:candidateOnly,
    evidenceWindow:sinceTs===null?'ROLLING':'POST_SETUP',sinceTs,
    pmLive:{
      ts:Number(last.ts),priceMoveUsd:move,absMoveUsd:Math.abs(move),
      moveVsP75:finite(p75)&&Number(p75)>0?Math.abs(move)/Number(p75):null,
      moveVsP95:finite(p95)&&Number(p95)>0?Math.abs(move)/Number(p95):null,
      p75AbsMoveUsd:p75,p95AbsMoveUsd:p95
    },
    horizons:{net1mUsd:net1m,net3mUsd:net3m,net5mUsd:net5m,aligned3m:aligned3,opposite3m:opposite3,
      efficiency1m:h1.efficiency,efficiency3m:h3.efficiency,efficiency5m:h5.efficiency,
      gross3mUsd:h3.grossUsd},
    sinceSetup:fresh,
    materiality:{postSetupRequired:sinceTs!==null,passed:freshMaterial,minNetUsd:10,minEfficiency:.25},
    authority:'CONFIRMS_TRANSLATION_ONLY_NEVER_CREATES_DIRECTION',
    note:wanted
      ?(sinceTs!==null?'PM post-setup exige direction + materialite (|net|>=10 USD et efficacite>=25%) avant TRANSLATING':'PM Live mesure si le prix traduit la these MCB')
      :'NO_THESIS signifie absence de direction MCB a confirmer, pas absence de mouvement prix'
  };
}
module.exports={evaluate,horizonNet,horizonStats,spanStats};
