'use strict';
const {finite}=require('../core/utils');

const ECONOMIC_MOVE_MIN_USD=220;
const DORMANT_RANGE_FRACTION=.20;
const DORMANT_GROSS_FRACTION=.50;
const LOW_EDGE_EFFICIENCY_MAX=.12;
const LOW_EDGE_FLIPS_PER_HOUR_MIN=35;

function windowStats(rows,marketTs,minutes){
  const cut=Number(marketTs)-minutes*60000;
  const a=(rows||[]).filter(r=>finite(r.ts)&&finite(r.lastPrice)&&Number(r.ts)>=cut&&Number(r.ts)<=Number(marketTs));
  if(a.length<2)return {available:false,minutes,n:a.length};
  let gross=0,flips=0,lastDir=0,min=Number(a[0].lastPrice),max=min;
  for(let i=1;i<a.length;i++){
    const p=Number(a[i].lastPrice),prev=Number(a[i-1].lastPrice),d=p-prev;
    gross+=Math.abs(d);min=Math.min(min,p);max=Math.max(max,p);
    const dir=d>0?1:d<0?-1:0;
    if(dir&&lastDir&&dir!==lastDir)flips++;
    if(dir)lastDir=dir;
  }
  const net=Number(a[a.length-1].lastPrice)-Number(a[0].lastPrice);
  return {
    available:true,minutes,n:a.length,netUsd:net,grossUsd:gross,rangeUsd:max-min,
    efficiency:gross>0?Math.abs(net)/gross:0,
    flips,flipsPerHour:minutes>0?flips/(minutes/60):null
  };
}
function evaluate(frame){
  const rows=frame.sources&&frame.sources.auditRows||[];
  const w30=windowStats(rows,frame.market.timestamp,30);
  const w60=windowStats(rows,frame.market.timestamp,60);
  const rangeFloor=ECONOMIC_MOVE_MIN_USD*DORMANT_RANGE_FRACTION;
  const grossFloor=ECONOMIC_MOVE_MIN_USD*DORMANT_GROSS_FRACTION;
  let state='ACTIVE';
  let admissionBlocked=false;
  let lowEdge=false;
  if(w30.available&&w30.rangeUsd<rangeFloor&&w30.grossUsd<grossFloor){
    state='DORMANT';admissionBlocked=true;
  }else if(w60.available&&w60.efficiency<.08&&w60.flipsPerHour>=30){
    state='CHOP_SHADOW';lowEdge=true;
  }else if(w60.available&&w60.efficiency<=LOW_EDGE_EFFICIENCY_MAX&&w60.flipsPerHour>=LOW_EDGE_FLIPS_PER_HOUR_MIN){
    state='LOW_EDGE_SHADOW';lowEdge=true;
  }else if(w60.available&&w60.efficiency>=.25){
    state='DIRECTIONAL';
  }else if(w60.available){
    state='MIXED';
  }else state='UNKNOWN';
  return {
    state,window30:w30,window60:w60,
    admissionBlocked,lowEdge,
    decisionImpact:admissionBlocked,
    chopDecisionImpact:false,
    references:{
      economicMoveMinimumUsd:ECONOMIC_MOVE_MIN_USD,
      dormantRangeFloorUsd:rangeFloor,
      dormantGrossFloorUsd:grossFloor,
      chopEfficiencyReference:.08,
      chopFlipsPerHourReference:30,
      lowEdgeEfficiencyMax:LOW_EDGE_EFFICIENCY_MAX,lowEdgeFlipsPerHourMin:LOW_EDGE_FLIPS_PER_HOUR_MIN
    },
    note:'DORMANT suspend tous les setups. LOW_EDGE/CHOP ne bloquent qu en combinaison avec une structure MCB sub-80; une paire majeure ou UP_REINFORCED peut encore emerger.'
  };
}
module.exports={evaluate,windowStats,ECONOMIC_MOVE_MIN_USD,LOW_EDGE_EFFICIENCY_MAX,LOW_EDGE_FLIPS_PER_HOUR_MIN};
