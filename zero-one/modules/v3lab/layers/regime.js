'use strict';
function finite(v){return Number.isFinite(Number(v));}
function q(v,p){const a=v.filter(finite).map(Number).sort((x,y)=>x-y);if(!a.length)return null;return a[Math.min(a.length-1,Math.round((a.length-1)*p))];}
function metrics(rows){
  const a=rows.filter(r=>finite(r.lastPrice));
  if(a.length<3)return null;
  const p=a.map(r=>Number(r.lastPrice)), d=p.slice(1).map((x,i)=>x-p[i]);
  const gross=d.reduce((s,x)=>s+Math.abs(x),0), net=p[p.length-1]-p[0];
  const hours=Math.max((Number(a[a.length-1].ts)-Number(a[0].ts))/3600000,1/60);
  return {n:a.length,hours,startPrice:p[0],endPrice:p[p.length-1],netUsd:net,rangeUsd:Math.max(...p)-Math.min(...p),
    grossUsd:gross,grossPerHour:gross/hours,efficiency:gross>0?Math.abs(net)/gross:0,
    flips:d.slice(1).reduce((s,x,i)=>s+(x*d[i]<0?1:0),0),flipsPerHour:d.length?d.slice(1).reduce((s,x,i)=>s+(x*d[i]<0?1:0),0)/hours:0,
    cadenceP95:q(a.map(r=>r.cadence),.95),moveP95:q(a.map(r=>Math.abs(Number(r.priceMove))),.95)};
}
function evaluate(frame){
  const rows=frame.sources.auditRows||[], now=frame.market.timestamp;
  const recent=rows.filter(r=>Number(r.ts)>=now-60*60000);
  const current=metrics(recent);
  const hourly=[];
  for(let end=now-60*60000;end>=now-13*3600000;end-=3600000){
    const m=metrics(rows.filter(r=>Number(r.ts)>=end&&Number(r.ts)<end+3600000));
    if(m&&m.n>60)hourly.push(m);
  }
  if(!current||hourly.length<3)return {state:'DONNEES_INSUFFISANTES',current,baselineHours:hourly.length};
  const b={grossP25:q(hourly.map(x=>x.grossPerHour),.25),grossP50:q(hourly.map(x=>x.grossPerHour),.5),
    effP25:q(hourly.map(x=>x.efficiency),.25),effP75:q(hourly.map(x=>x.efficiency),.75),
    cadP25:q(hourly.map(x=>x.cadenceP95),.25),cadP90:q(hourly.map(x=>x.cadenceP95),.90),
    moveP75:q(hourly.map(x=>x.moveP95),.75)};
  let state='TENSION_BALANCE';
  if(current.cadenceP95>=b.cadP90&&current.moveP95>=b.moveP75&&current.efficiency<Math.max(.08,b.effP75))state='CHOC_COMBAT';
  else if(current.efficiency>=Math.max(.06,b.effP75)&&Math.abs(current.netUsd)>=100)state='TRANSLATION';
  else if(current.grossPerHour<=b.grossP25&&current.cadenceP95<=b.cadP25)state='COMPRESSION';
  else if(current.efficiency<=b.effP25&&current.grossPerHour>=b.grossP50)state='HACHOIR';
  return {state,current,baseline:b,baselineHours:hourly.length,
    interpretation:'effort, conversion, flips et terrain conserve; classification experimentale dynamique'};
}
module.exports={evaluate,metrics};
