'use strict';

function finite(v){
  return v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v));
}
function num(v){ return finite(v)?Number(v):null; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function median(a){
  const x=(a||[]).filter(finite).map(Number).sort((p,q)=>p-q);
  if(!x.length)return null;
  const k=Math.floor(x.length/2);
  return x.length%2?x[k]:(x[k-1]+x[k])/2;
}
function quantile(a,p){
  const x=(a||[]).filter(finite).map(Number).sort((m,n)=>m-n);
  if(!x.length)return null;
  return x[Math.min(x.length-1,Math.max(0,Math.round((x.length-1)*p)))];
}
function dirSign(d){ return d==='long'?1:d==='short'?-1:0; }
function opposite(d){ return d==='long'?'short':d==='short'?'long':null; }
function sign(v){ return Number(v)>0?1:Number(v)<0?-1:0; }
function iso(ts){ try{return new Date(Number(ts)).toISOString();}catch(_){return null;} }

module.exports={finite,num,clamp,median,quantile,dirSign,opposite,sign,iso};
