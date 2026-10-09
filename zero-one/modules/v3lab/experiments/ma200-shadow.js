'use strict';

const fs=require('fs');
const path=require('path');
let config={};
try{config=require('../../../config.json');}catch(_){config={};}

const VERSION='ma200-multitf-shadow-v0.1';
const MCB=path.join(__dirname,'../../../../data/mcb-live');
const TF_MINUTES={'3m':3,'15m':15,'1h':60,'4h':240,'1d':1440};
const LOOKBACK={'3m':1100,'15m':320,'1h':180,'4h':120,'1d':120};
const TFS=['3m','15m','1h','4h','1d'];
const OKX_STABLE_FROM=Date.parse('2026-09-20T09:53:41.000Z');

function finite(v){return Number.isFinite(Number(v));}
function num(v){if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function median(a){const x=a.filter(finite).map(Number).sort((a,b)=>a-b);if(!x.length)return null;const k=Math.floor(x.length/2);return x.length%2?x[k]:(x[k-1]+x[k])/2;}
function readRaw(tf,suffix=''){
  const p=path.join(MCB,`mcb_${tf}${suffix}.csv`);
  try{
    const stat=fs.statSync(p);
    const lines=fs.readFileSync(p,'utf8').trim().split(/\r?\n/);
    if(lines.length<2)return {rows:[],fileAgeMs:Date.now()-stat.mtimeMs,fileMtimeMs:stat.mtimeMs,path:p};
    const out=[];
    for(const line of lines.slice(1)){
      const v=line.split(',');
      if(v.length<12)continue;
      const ts=Date.parse(v[0]);
      if(!finite(ts))continue;
      // Historical 3m/15m/1h/4h files still carry the extended values even
      // when their legacy header stops at dbsi_bottom. Position 12 is MA200.
      const r={timestamp:v[0],ts,
        open:num(v[1]),high:num(v[2]),low:num(v[3]),close:num(v[4]),
        lbw:num(v[5]),bw:num(v[6]),moneyFlow:num(v[7]),
        ma200:num(v[12])};
      if(finite(r.close)&&finite(r.ma200)&&Number(r.ma200)>1000)out.push(r);
    }
    return {rows:out.slice(-LOOKBACK[tf]),fileAgeMs:Math.max(0,Date.now()-stat.mtimeMs),fileMtimeMs:stat.mtimeMs,path:p};
  }catch(_){return {rows:[],fileAgeMs:null,fileMtimeMs:null,path:p};}
}
function mergedRows(tf){
  const hist=readRaw(tf,''),live=readRaw(tf,'_live');
  const m=new Map();
  for(const r of hist.rows)m.set(r.ts,{...r,source:'confirmed'});
  for(const r of live.rows)m.set(r.ts,{...r,source:'live'});
  const rows=[...m.values()].sort((a,b)=>a.ts-b.ts).slice(-LOOKBACK[tf]);
  return {rows,histAgeMs:hist.fileAgeMs,liveAgeMs:live.fileAgeMs,histMtimeMs:hist.fileMtimeMs,liveMtimeMs:live.fileMtimeMs};
}
function tolerancePct(){
  const v=Number(config&&config.srZone&&config.srZone.ma200TolerancePercent);
  return finite(v)?v:.1;
}
function toleranceUsd(price){return Math.abs(Number(price)||0)*tolerancePct()/100;}
function strictSide(close,ma){return Number(close)>=Number(ma)?'ABOVE':'BELOW';}
function relation(close,ma,tol){const d=Number(close)-Number(ma);return Math.abs(d)<=tol?'AT_MA':d>0?'ABOVE':'BELOW';}
function touches(r,tol){return finite(r.low)&&finite(r.high)&&Number(r.low)<=Number(r.ma200)+tol&&Number(r.high)>=Number(r.ma200)-tol;}

function buildEpisodes(rows,tf){
  const episodes=[];let cur=null;
  for(let i=0;i<rows.length;i++){
    const r=rows[i],tol=toleranceUsd(r.ma200);
    const touch=touches(r,tol);
    if(touch){
      if(!cur){
        const prev=i>0?rows[i-1]:null;
        cur={startIndex:i,endIndex:i,startTs:r.ts,endTs:r.ts,startTimestamp:r.timestamp,endTimestamp:r.timestamp,
          approachSide:prev?strictSide(prev.close,prev.ma200):null,bars:[],minDistanceAbsUsd:Infinity};
      }
      const dist=Number(r.close)-Number(r.ma200);
      cur.endIndex=i;cur.endTs=r.ts;cur.endTimestamp=r.timestamp;
      cur.bars.push({ts:r.ts,timestamp:r.timestamp,close:r.close,high:r.high,low:r.low,ma200:r.ma200,
        distanceUsd:dist,distancePct:r.ma200?dist/r.ma200*100:null,relation:relation(r.close,r.ma200,tol),source:r.source});
      cur.minDistanceAbsUsd=Math.min(cur.minDistanceAbsUsd,Math.abs(dist));
    }else if(cur){
      const next=r;
      cur.outcomeSide=strictSide(next.close,next.ma200);
      cur.resolveTs=next.ts;cur.resolveTimestamp=next.timestamp;
      episodes.push(finalizeEpisode(cur,tf));cur=null;
    }
  }
  if(cur){cur.outcomeSide=null;episodes.push(finalizeEpisode(cur,tf));}
  return episodes;
}
function finalizeEpisode(e,tf){
  let event='CONTACT';
  if(e.approachSide==='BELOW'&&e.outcomeSide==='ABOVE')event='CROSS_UP';
  else if(e.approachSide==='ABOVE'&&e.outcomeSide==='BELOW')event='CROSS_DOWN';
  else if(e.approachSide==='ABOVE'&&e.outcomeSide==='ABOVE')event='HOLD_AS_SUPPORT';
  else if(e.approachSide==='BELOW'&&e.outcomeSide==='BELOW')event='HOLD_AS_RESISTANCE';
  else if(e.approachSide==='ABOVE'&&!e.outcomeSide)event='OPEN_CONTACT_FROM_ABOVE';
  else if(e.approachSide==='BELOW'&&!e.outcomeSide)event='OPEN_CONTACT_FROM_BELOW';
  return {...e,event,durationBars:e.bars.length,durationMinutes:e.bars.length*TF_MINUTES[tf],
    minDistanceAbsUsd:finite(e.minDistanceAbsUsd)?e.minDistanceAbsUsd:null};
}

function lastStrictCross(rows,marketTs){
  let out=null;
  for(let i=1;i<rows.length;i++){
    const a=rows[i-1],b=rows[i];
    const sa=strictSide(a.close,a.ma200),sb=strictSide(b.close,b.ma200);
    if(sa===sb)continue;
    out={event:sa==='BELOW'&&sb==='ABOVE'?'CROSS_UP':'CROSS_DOWN',timestamp:b.timestamp,ts:b.ts,
      from:sa,to:sb,close:b.close,ma200:b.ma200,distanceUsd:Number(b.close)-Number(b.ma200)};
  }
  if(out)out.ageMinutes=finite(marketTs)?Math.max(0,(Number(marketTs)-out.ts)/60000):null;
  return out;
}

function slopeStats(rows,tf){
  if(rows.length<2)return {usdPerHour:null,pctPerDay:null};
  const a=rows[Math.max(0,rows.length-6)],b=rows[rows.length-1];
  const h=(b.ts-a.ts)/3600000;if(!(h>0))return {usdPerHour:null,pctPerDay:null};
  const usd=(b.ma200-a.ma200)/h;
  return {usdPerHour:usd,pctPerDay:a.ma200?usd*24/a.ma200*100:null,fromTs:a.ts,toTs:b.ts};
}
function runForTf(rows,tf){
  if(!rows.length)return {side:null,bars:0,minutes:0,since:null};
  const side=strictSide(rows[rows.length-1].close,rows[rows.length-1].ma200);let n=0,start=rows[rows.length-1];
  for(let i=rows.length-1;i>=0;i--){if(strictSide(rows[i].close,rows[i].ma200)!==side)break;n++;start=rows[i];}
  return {side,bars:n,minutes:n*TF_MINUTES[tf],since:start.timestamp};
}
function analyzeTf(tf,marketPrice,marketTs){
  const src=mergedRows(tf),rows=src.rows;
  if(!rows.length)return {timeframe:tf,status:'INSUFFICIENT_DATA',decisionImpact:false};
  const latest=rows[rows.length-1],ma=Number(latest.ma200),tol=toleranceUsd(ma),dist=Number(marketPrice)-ma;
  const episodes=buildEpisodes(rows,tf);
  const resolved=episodes.filter(e=>e.outcomeSide);
  const lastEpisode=episodes.length?episodes[episodes.length-1]:null;
  const lastCrossEpisode=[...resolved].reverse().find(e=>e.event==='CROSS_UP'||e.event==='CROSS_DOWN')||null;
  const strictCross=lastStrictCross(rows,marketTs);
  const lastHoldSupport=[...resolved].reverse().find(e=>e.event==='HOLD_AS_SUPPORT')||null;
  const lastHoldResistance=[...resolved].reverse().find(e=>e.event==='HOLD_AS_RESISTANCE')||null;
  const counts={};for(const e of resolved)counts[e.event]=(counts[e.event]||0)+1;
  const run=runForTf(rows,tf),slope=slopeStats(rows,tf);
  const sourceAgeMs=latest.source==='live'?src.liveAgeMs:src.histAgeMs;
  const sourceMtimeMs=latest.source==='live'?src.liveMtimeMs:src.histMtimeMs;
  const maSourceEra=finite(sourceMtimeMs)&&Number(sourceMtimeMs)>=OKX_STABLE_FROM?'OKX_POST_CUTOVER':'PRE_CUTOVER_ARCHIVE';
  const recentEpisodes=episodes.slice(-12).map(e=>({event:e.event,startTimestamp:e.startTimestamp,endTimestamp:e.endTimestamp,
    resolveTimestamp:e.resolveTimestamp||null,approachSide:e.approachSide,outcomeSide:e.outcomeSide,durationBars:e.durationBars,
    durationMinutes:e.durationMinutes,minDistanceAbsUsd:e.minDistanceAbsUsd}));
  return {
    timeframe:tf,status:'OK',decisionImpact:false,
    current:{price:Number(marketPrice),ma200:ma,distanceUsd:dist,distancePct:ma?dist/ma*100:null,
      side:dist>tol?'ABOVE':dist<-tol?'BELOW':'AT_MA',strictSide:dist>=0?'ABOVE':'BELOW',
      interaction:Math.abs(dist)<=tol,tolerancePercent:tolerancePct(),toleranceUsd:tol,
      maTimestamp:latest.timestamp,maSource:latest.source,maSourceAgeMs:sourceAgeMs,maSourceEra,
      maFresh:finite(sourceAgeMs)?sourceAgeMs<=Math.max(120000,TF_MINUTES[tf]*60*1000*1.5):false,
      slopeUsdPerHour:slope.usdPerHour,slopePctPerDay:slope.pctPerDay},
    campaign:{currentRun:run,lastCross:strictCross,
      lastCrossEpisode:lastCrossEpisode?{event:lastCrossEpisode.event,resolveTimestamp:lastCrossEpisode.resolveTimestamp,startTimestamp:lastCrossEpisode.startTimestamp,
        approachSide:lastCrossEpisode.approachSide,outcomeSide:lastCrossEpisode.outcomeSide,ageMinutes:finite(marketTs)&&finite(lastCrossEpisode.resolveTs)?Math.max(0,(marketTs-lastCrossEpisode.resolveTs)/60000):null}:null,
      lastHoldSupport:lastHoldSupport?{resolveTimestamp:lastHoldSupport.resolveTimestamp,ageMinutes:finite(marketTs)?Math.max(0,(marketTs-lastHoldSupport.resolveTs)/60000):null}:null,
      lastHoldResistance:lastHoldResistance?{resolveTimestamp:lastHoldResistance.resolveTimestamp,ageMinutes:finite(marketTs)?Math.max(0,(marketTs-lastHoldResistance.resolveTs)/60000):null}:null,
      contactEpisodeCount:episodes.length,resolvedCounts:counts,
      medianContactDurationBars:median(resolved.map(e=>e.durationBars))},
    recentContacts:recentEpisodes,
    dataQuality:{archiveMixedSource:true,okxStableFrom:new Date(OKX_STABLE_FROM).toISOString(),currentMaSourceEra:maSourceEra},
    note:'shadow descriptif: contacts regroupes en episodes; support/resistance vient de la position du prix par rapport a MA200, pas des LGI'
  };
}
function synthesis(byTf,marketTs){
  const ok=TFS.map(tf=>byTf[tf]).filter(x=>x&&x.status==='OK');
  const above=ok.filter(x=>x.current.strictSide==='ABOVE').map(x=>x.timeframe);
  const below=ok.filter(x=>x.current.strictSide==='BELOW').map(x=>x.timeframe);
  const interacting=ok.filter(x=>x.current.interaction).map(x=>x.timeframe);
  const trusted=ok.filter(x=>x.current.maSourceEra==='OKX_POST_CUTOVER'&&x.current.maFresh);
  const trustedAbove=trusted.filter(x=>x.current.strictSide==='ABOVE').map(x=>x.timeframe);
  const trustedBelow=trusted.filter(x=>x.current.strictSide==='BELOW').map(x=>x.timeframe);
  const three=byTf['3m'],fifteen=byTf['15m'];
  const cross3=three&&three.campaign&&three.campaign.lastCross;
  const hold15=fifteen&&fifteen.campaign&&fifteen.campaign.lastHoldSupport;
  const lowTfReclaim=!!(three&&three.current&&three.current.maSourceEra==='OKX_POST_CUTOVER'&&cross3&&cross3.event==='CROSS_UP'&&finite(cross3.ageMinutes)&&cross3.ageMinutes<=120);
  const midTfSupportHeld=!!(fifteen&&fifteen.current&&fifteen.current.maSourceEra==='OKX_POST_CUTOVER'&&fifteen.current.strictSide==='ABOVE'&&hold15&&finite(hold15.ageMinutes)&&hold15.ageMinutes<=24*60);
  return {
    above,below,interacting,trustedAbove,trustedBelow,
    priceVsMa200Stack:{aboveCount:above.length,belowCount:below.length,total:ok.length,trustedAboveCount:trustedAbove.length,trustedBelowCount:trustedBelow.length,trustedTotal:trusted.length,
      semantic:'POSITION_ONLY_NOT_DIRECTIONAL_BIAS'},
    observations:{lowTf3mRecentReclaim:lowTfReclaim,tf15mAboveWithRecentSupportHold:midTfSupportHeld,
      reversalMaturationCandidate:lowTfReclaim&&midTfSupportHeld},
    hypothesis:'un reclaim 3m apres campagne sous MA200, combine a une MA200 15m tenue comme support, peut decrire une maturation de retournement; a falsifier prospectivement',
    decisionImpact:false
  };
}
function evaluate(frame){
  const price=Number(frame&&frame.market&&frame.market.price),ts=Number(frame&&frame.market&&frame.market.timestamp)||Date.now();
  const byTf={};for(const tf of TFS)byTf[tf]=analyzeTf(tf,price,ts);
  return {version:VERSION,decisionImpact:false,timeframes:TFS,byTf,synthesis:synthesis(byTf,ts),
    sourceBoundary:{archiveMixedSource:true,okxStableFrom:new Date(OKX_STABLE_FROM).toISOString(),note:'pre-cutover MCB/MA200 rows may be Bybit; synthesis maturation uses only fresh OKX-post-cutover 3m/15m evidence'},
    note:'MA200 multi-TF shadow only: 3m/15m/1h/4h/1d; no entry/exit gate reads this object'};
}

module.exports={VERSION,evaluate,analyzeTf,buildEpisodes,finalizeEpisode,mergedRows};
