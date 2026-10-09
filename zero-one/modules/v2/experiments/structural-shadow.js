'use strict';

const { finite } = require('../core/utils');

const SHADOW_VERSION = 'div-fib-shadow-v0.1';
const TF_MS = { '3m':180000, '15m':900000, '1h':3600000, '4h':14400000 };
const WAVE_SCALE = 200;
const HORIZON_ROWS = {'3m':1100,'15m':240,'1h':72,'4h':36};

function rows(src, max=80){
  return ((src && src.history) || []).filter(r => finite(r.ts) && finite(r.lt_blue_wave)).slice(-max);
}

function currentRow(src){
  if(!src) return null;
  if(src.live && src.liveUpdateAgeMs !== null && src.liveUpdateAgeMs < 120000) return {row:src.live, source:'live'};
  if(src.confirmed) return {row:src.confirmed, source:'confirmed'};
  return null;
}

function structuralPivots(src, minAmplitude=2){
  const a=rows(src,HORIZON_ROWS[src&&src.timeframe]||80), out=[];
  for(let i=1;i<a.length-1;i++){
    const r=a[i], prev=a[i-1], next=a[i+1];
    const v=r.lt_blue_wave, p=prev.lt_blue_wave, n=next.lt_blue_wave;
    const high=v>=p && v>n;
    const low=v<=p && v<n;
    if(!high && !low) continue;
    const amp=Math.min(Math.abs(v-p),Math.abs(v-n));
    if(amp < minAmplitude) continue;
    if(high && v <= 0) continue;
    if(low && v >= 0) continue;
    out.push({
      ts:r.ts, timestamp:r.timestamp, type:high?'high-lbw':'low-lbw',
      lbw:v, price:high?r.high:r.low, close:r.close,
      amplitude:amp, confirmed:true,
    });
  }
  return out;
}

function comparison(oldP,newP,direction,tf){
  const priceDeltaPct=(newP.price-oldP.price)/oldP.price*100;
  const lbwDelta=newP.lbw-oldP.lbw;
  const lbwDeltaPctScale=lbwDelta/WAVE_SCALE*100;
  const geometryGapPct=Math.abs(priceDeltaPct-lbwDeltaPctScale);
  return {
    timeframe:tf,direction,status:'confirmed',older:oldP,newer:newP,
    priceDeltaPct,lbwDelta,lbwDeltaPctScale,geometryGapPct,
    barsApart:TF_MS[tf]?Math.round((newP.ts-oldP.ts)/TF_MS[tf]):null,
  };
}

function confirmedDivergences(pivots,tf){
  const result={bullish:null,bearish:null,multiBullish:0,multiBearish:0};
  for(const cfg of [
    {dir:'bullish',type:'low-lbw',priceOk:(a,b)=>b.price<a.price,lbwOk:(a,b)=>b.lbw>a.lbw},
    {dir:'bearish',type:'high-lbw',priceOk:(a,b)=>b.price>a.price,lbwOk:(a,b)=>b.lbw<a.lbw},
  ]){
    const same=pivots.filter(p=>p.type===cfg.type);
    if(same.length<2) continue;
    const newest=same[same.length-1], hits=[];
    for(let i=same.length-2;i>=0 && hits.length<4;i--){
      const old=same[i];
      if(cfg.priceOk(old,newest)&&cfg.lbwOk(old,newest)) hits.push(comparison(old,newest,cfg.dir,tf));
    }
    if(hits.length){
      result[cfg.dir==='bullish'?'bullish':'bearish']=hits[0];
      result[cfg.dir==='bullish'?'multiBullish':'multiBearish']=hits.length;
    }
  }
  return result;
}

function formingDivergence(src,pivots,tf){
  const cur=currentRow(src);
  if(!cur || !cur.row || !finite(cur.row.lt_blue_wave)) return [];
  const r=cur.row, out=[];
  const lows=pivots.filter(p=>p.type==='low-lbw');
  const highs=pivots.filter(p=>p.type==='high-lbw');
  if(r.lt_blue_wave<0 && lows.length && finite(r.low)){
    const old=lows[lows.length-1];
    if(r.ts>old.ts && r.low<old.price && r.lt_blue_wave>old.lbw){
      out.push({...comparison(old,{ts:r.ts,timestamp:r.timestamp,type:'forming-low-lbw',lbw:r.lt_blue_wave,price:r.low,confirmed:false},'bullish',tf),status:'forming',source:cur.source});
    }
  }
  if(r.lt_blue_wave>0 && highs.length && finite(r.high)){
    const old=highs[highs.length-1];
    if(r.ts>old.ts && r.high>old.price && r.lt_blue_wave<old.lbw){
      out.push({...comparison(old,{ts:r.ts,timestamp:r.timestamp,type:'forming-high-lbw',lbw:r.lt_blue_wave,price:r.high,confirmed:false},'bearish',tf),status:'forming',source:cur.source});
    }
  }
  return out;
}

function divergenceByTf(tfs,minAmplitude){
  const byTf={};
  for(const tf of ['3m','15m','1h','4h']){
    const pivots=structuralPivots(tfs[tf],minAmplitude);
    const confirmed=confirmedDivergences(pivots,tf);
    const forming=formingDivergence(tfs[tf],pivots,tf);
    byTf[tf]={
      pivots:pivots.slice(-8), confirmed, forming,
      latestConfirmedSignal:confirmed.bullish||confirmed.bearish||null,
    };
  }
  const counts={bullish:0,bearish:0,formingBullish:0,formingBearish:0};
  for(const v of Object.values(byTf)){
    if(v.confirmed.bullish)counts.bullish++;
    if(v.confirmed.bearish)counts.bearish++;
    counts.formingBullish+=v.forming.filter(x=>x.direction==='bullish').length;
    counts.formingBearish+=v.forming.filter(x=>x.direction==='bearish').length;
  }
  return {byTf,counts,minPivotAmplitude:minAmplitude,model:'price-extreme vs same-side confirmed LBW pivots; forming uses fresh current bar'};
}

function abcForDirection(pivots,direction){
  const wanted=direction==='long'?['low-lbw','high-lbw','low-lbw']:['high-lbw','low-lbw','high-lbw'];
  for(let k=pivots.length-1;k>=2;k--){
    const c=pivots[k]; if(c.type!==wanted[2]) continue;
    for(let j=k-1;j>=1;j--){
      const b=pivots[j]; if(b.type!==wanted[1]) continue;
      for(let i=j-1;i>=0;i--){
        const a=pivots[i]; if(a.type!==wanted[0]) continue;
        const amp=Math.abs(b.price-a.price);
        if(!(amp>0)) break;
        const retr=direction==='long'?(b.price-c.price)/amp:(c.price-b.price)/amp;
        return {a,b,c,impulseUsd:amp,retracementRatio:retr};
      }
    }
  }
  return null;
}

function fibProjection(pivots,direction,currentPrice){
  const abc=abcForDirection(pivots,direction);
  if(!abc) return null;
  const sign=direction==='long'?1:-1;
  const targets={};
  for(const ratio of [1,1.272,1.618]){
    const price=abc.c.price + sign*abc.impulseUsd*ratio;
    const distanceUsd=direction==='long'?price-currentPrice:currentPrice-price;
    targets[String(ratio)]={price,distanceUsd,ahead:distanceUsd>0};
  }
  return {
    direction, anchors:{a:abc.a,b:abc.b,c:abc.c}, impulseUsd:abc.impulseUsd,
    retracementRatio:abc.retracementRatio, retracementVsClassic:{r382:abc.retracementRatio-0.382,r618:abc.retracementRatio-0.618},
    targets,
  };
}

function structuralRiskFromFib(fib,currentPrice){
  if(!fib || !fib.anchors || !fib.anchors.c) return null;
  const c=fib.anchors.c.price;
  const d=fib.direction==='long'?currentPrice-c:c-currentPrice;
  return d>0?{price:c,distanceUsd:d,anchor:fib.anchors.c}:null;
}

function nearestAheadTarget(fib){
  if(!fib) return null;
  const vals=Object.entries(fib.targets||{}).filter(([,v])=>v.ahead && finite(v.distanceUsd)).sort((a,b)=>a[1].distanceUsd-b[1].distanceUsd);
  return vals.length?{ratio:Number(vals[0][0]),...vals[0][1]}:null;
}

function rr(reward,risk){ return finite(reward)&&finite(risk)&&risk>0?reward/risk:null; }

function evaluate(snapshot,result,legacyDivergence=null,config=null){
  const tfs=(snapshot.sources.mcb&&snapshot.sources.mcb.tfs)||{};
  const minAmp=Number(config&&config.scoring&&config.scoring.wavePivot&&config.scoring.wavePivot.minAmplitude)||2;
  const div=divergenceByTf(tfs,minAmp);
  const direction=(result.action&&result.action.direction)||(result.dominance&&result.dominance.direction)||null;
  const fib={};
  for(const tf of ['15m','1h']){
    const piv=div.byTf[tf].pivots;
    fib[tf]={
      long:fibProjection(piv,'long',snapshot.market.price),
      short:fibProjection(piv,'short',snapshot.market.price),
    };
  }
  const selected=direction?{
    '15m':fib['15m'][direction],
    '1h':fib['1h'][direction],
  }:null;
  const risk15=selected&&structuralRiskFromFib(selected['15m'],snapshot.market.price);
  const risk1h=selected&&structuralRiskFromFib(selected['1h'],snapshot.market.price);
  const target15=selected&&nearestAheadTarget(selected['15m']);
  const target1h=selected&&nearestAheadTarget(selected['1h']);
  const rewardWhere=result.risk&&finite(result.risk.rewardUsd)?result.risk.rewardUsd:null;
  const riskMicro=result.risk&&finite(result.risk.riskUsd)?result.risk.riskUsd:null;
  return {
    version:SHADOW_VERSION,decisionImpact:false,direction,
    divergence:{structural:div,legacy:legacyDivergence||null},
    rr:{
      riskMicro3mUsd:riskMicro,rewardWhereUsd:rewardWhere,
      structural15m:risk15,structural1h:risk1h,
      fib15m:selected&&selected['15m'],fib1h:selected&&selected['1h'],
      nearestFib15m:target15,nearestFib1h:target1h,
      comparisons:{
        whereOverMicro:rr(rewardWhere,riskMicro),
        whereOver15m:rr(rewardWhere,risk15&&risk15.distanceUsd),
        whereOver1h:rr(rewardWhere,risk1h&&risk1h.distanceUsd),
        fib15Over15m:rr(target15&&target15.distanceUsd,risk15&&risk15.distanceUsd),
        fib1hOver1h:rr(target1h&&target1h.distanceUsd,risk1h&&risk1h.distanceUsd),
      },
      note:'shadow descriptif uniquement; aucune valeur ne pilote RISK/ACTION',
    },
  };
}

module.exports={SHADOW_VERSION,evaluate,structuralPivots,confirmedDivergences,formingDivergence,fibProjection,abcForDirection};
