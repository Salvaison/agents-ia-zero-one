'use strict';
// Geometry measured from raw Bâton observations, independent of trading.
// No future points, no artificial fitted extrema, no trade threshold.
const old=require('./boonolab-wave-geometry');
const VERSION='boonolab-wave-geometry-v0.2';
const MIN=60000,H=3600000;
const finite=Number.isFinite;
const r=(n,d=4)=>finite(n)?Math.round(n*10**d)/10**d:null;
const sign=n=>finite(n)?Math.sign(n):null;
const dir=n=>sign(n)===1?'UP':sign(n)===-1?'DN':null;
const diff=(a,b)=>finite(a)&&finite(b)?a-b:null;
function point(x){
 if(!x||![x.ts,x.lastPrice,x.live15LbwRaw,x.live15BwRaw].every(finite)||x.lastPrice<=0)return null;
 return {ts:x.ts,price:x.lastPrice,L:x.live15LbwRaw,B:x.live15BwRaw,
  mf15:finite(x.live15MfRaw)?x.live15MfRaw:null,
  L3:finite(x.liveLbw)?x.liveLbw:null,B3:finite(x.liveBw)?x.liveBw:null,
  mf3:finite(x.liveMoneyFlow)?x.liveMoneyFlow:null,
  pmLive:finite(x.priceMove)?x.priceMove:null,
  e3Live:finite(x.liveSignalUp)&&!finite(x.liveSignalDn)?'UP':finite(x.liveSignalDn)&&!finite(x.liveSignalUp)?'DN':null,
  e15LiveDisplay:finite(x.live15SignalUp)&&!finite(x.live15SignalDn)?'UP':finite(x.live15SignalDn)&&!finite(x.live15SignalUp)?'DN':null,
  flow:finite(x.volumeFenetreBtc)&&finite(x.winSec)&&x.winSec>0?x.volumeFenetreBtc/x.winSec:null};
}
const gap=x=>x.L-x.B;
const fns={L:x=>x.L,B:x=>x.B,G:gap,price:x=>x.price,mf15:x=>x.mf15,mf3:x=>x.mf3};
function vel(a,b,fn){return a&&b&&finite(fn(a))&&finite(fn(b))?r(old.velocity(a,b,fn)):null;}
function read(rows,asOf){
 const p=rows.at(-1);
 if(!p||p.ts>asOf)return {version:VERSION,available:false};
 const w=Object.fromEntries([3,6,10,15,60].map(m=>[m,old.known(rows,p.ts-m*MIN)]));
 const k={};
 for(const n of [3,15,60]){
  k[n]=Object.fromEntries(['L','B','G','price','mf15','mf3'].map(key=>[key,vel(p,w[n],fns[key])]));
 }
 const prior=Object.fromEntries(['L','B','G'].map(key=>[key,vel(w[3],w[6],fns[key])]));
 const acceleration=Object.fromEntries(['L','B','G'].map(key=>[key,finite(prior[key])&&finite(k[3][key])?r((k[3][key]-prior[key])/3):null]));
 let lo=p.L,hi=p.L,plo=p.price,phi=p.price;
 for(const q of rows){lo=Math.min(lo,q.L);hi=Math.max(hi,q.L);plo=Math.min(plo,q.price);phi=Math.max(phi,q.price);}
 const amp=hi-lo;
 return {version:VERSION,available:true,sourceAt:p.ts,asOf,
  price:p.price,L:p.L,B:p.B,G:r(gap(p)),gapSide:dir(gap(p)),slopeSide:dir(k[3].L),
  k,acceleration,positionInObservedAmplitude:amp>0?r((p.L-lo)/amp):null,
  observed:{fromAt:rows[0].ts,toAt:p.ts,samples:rows.length,Lmin:lo,Lmax:hi,priceMin:plo,priceMax:phi,
   fullTrajectoryGuaranteed:false,maxLookbackHours:8},
  conversion:{pmLive:p.pmLive,pm3:w[3]?r(p.price-w[3].price):null,pm15:w[15]?r(p.price-w[15].price):null,
   mf3:p.mf3,mf15:p.mf15,mf3Change:w[3]?r(diff(p.mf3,w[3].mf3)):null,
   mf15Change:w[10]?r(diff(p.mf15,w[10].mf15)):null,flowBtcSec:r(p.flow)},
  tactical:{gap:finite(p.L3)&&finite(p.B3)?r(p.L3-p.B3):null,side:finite(p.L3)&&finite(p.B3)?dir(p.L3-p.B3):null,e3LiveObserved:p.e3Live},
  e15LiveDisplay:p.e15LiveDisplay,
  basis:'RAW_BATON_CAUSAL_DISCRETE_DERIVATIVES_NOT_BEZIER_FIT',decisionImpact:false,brokerOrdersEnabled:false};
}
function trim(rows,p){rows.push(p);while(rows.length&&rows[0].ts<p.ts-8*H)rows.shift();return rows;}
module.exports={VERSION,MIN,H,finite,r,sign,dir,diff,point,gap,read,trim};
