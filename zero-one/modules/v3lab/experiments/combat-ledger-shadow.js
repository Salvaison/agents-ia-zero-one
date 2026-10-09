'use strict';

function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
function median(a){const v=a.filter(finite).map(Number).sort((x,y)=>x-y);if(!v.length)return null;const m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2;}
function quantile(a,p){const v=a.filter(finite).map(Number).sort((x,y)=>x-y);if(!v.length)return null;return v[Math.min(v.length-1,Math.round((v.length-1)*p))];}
function directionSign(d){return d==='long'?1:d==='short'?-1:0;}
function rowsSince(frame,startTs){
  return (frame.sources.auditRows||[])
    .filter(r=>finite(r.ts)&&finite(r.lastPrice)&&Number(r.ts)>=Number(startTs||0)&&Number(r.ts)<=Number(frame.market.timestamp))
    .sort((a,b)=>Number(a.ts)-Number(b.ts));
}
function priceLedger(rows,direction){
  if(rows.length<2)return {n:rows.length,grossBullUsd:0,grossBearUsd:0,netUsd:0,netInDirectionUsd:0};
  let bull=0,bear=0;
  for(let i=1;i<rows.length;i++){
    const d=Number(rows[i].lastPrice)-Number(rows[i-1].lastPrice);
    if(d>0)bull+=d; else if(d<0)bear+=-d;
  }
  const net=Number(rows[rows.length-1].lastPrice)-Number(rows[0].lastPrice);
  return {
    n:rows.length,startPrice:Number(rows[0].lastPrice),endPrice:Number(rows[rows.length-1].lastPrice),
    grossBullUsd:bull,grossBearUsd:bear,bearBullTerrainRatio:bull>0?bear/bull:null,
    netUsd:net,netInDirectionUsd:net*directionSign(direction)
  };
}
function microStats(rows,dir){
  const z=[];
  for(const r of rows){
    const move=Number(r.priceMove);
    if(!finite(move)||(dir==='long'?move<=0:move>=0))continue;
    const vol=Number(r.volumeFenetreBtc),win=Number(r.winSec),cad=Number(r.cadence);
    const flow=finite(vol)&&finite(win)&&win>0?vol/win:null;
    const yieldPx=finite(vol)&&vol>0?Math.abs(move)/vol:null;
    z.push({cadence:finite(cad)?cad:null,flow,yield:yieldPx,moveAbs:Math.abs(move)});
  }
  const pack=k=>{const a=z.map(x=>x[k]).filter(finite);return {median:median(a),p75:quantile(a,.75),p95:quantile(a,.95)};};
  return {direction:dir,n:z.length,cadence:pack('cadence'),flow:pack('flow'),yield:pack('yield'),moveAbs:pack('moveAbs')};
}
function swingLegs(rows,threshold=50){
  if(rows.length<3)return [];
  let start={ts:Number(rows[0].ts),price:Number(rows[0].lastPrice)};
  let ext={...start},dir=0;const out=[];
  for(const r of rows.slice(1)){
    const x={ts:Number(r.ts),price:Number(r.lastPrice)};
    if(dir===0){
      if(x.price>=ext.price+threshold){dir=1;ext=x;}
      else if(x.price<=ext.price-threshold){dir=-1;ext=x;}
      else if(Math.abs(x.price-start.price)>Math.abs(ext.price-start.price))ext=x;
    }else if(dir===1){
      if(x.price>ext.price)ext=x;
      else if(ext.price-x.price>=threshold){out.push({start,end:ext,direction:'long',amplitudeUsd:Math.abs(ext.price-start.price)});start=ext;dir=-1;ext=x;}
    }else{
      if(x.price<ext.price)ext=x;
      else if(x.price-ext.price>=threshold){out.push({start,end:ext,direction:'short',amplitudeUsd:Math.abs(ext.price-start.price)});start=ext;dir=1;ext=x;}
    }
  }
  return out;
}
function attackSummary(legs,thesisDirection,materialThresholdUsd){
  const adverse=thesisDirection==='long'?'short':thesisDirection==='short'?'long':null;
  if(!adverse)return {direction:null,count:0,materialCount:0,outcomes:[]};
  const outcomes=[];
  for(let i=0;i<legs.length;i++){
    const a=legs[i];if(a.direction!==adverse)continue;
    const prev=i>0&&legs[i-1].direction===thesisDirection?legs[i-1]:null;
    const next=i+1<legs.length&&legs[i+1].direction===thesisDirection?legs[i+1]:null;
    const retraceRatio=prev&&prev.amplitudeUsd>0?a.amplitudeUsd/prev.amplitudeUsd:null;
    const reabsorptionRatio=next&&a.amplitudeUsd>0?next.amplitudeUsd/a.amplitudeUsd:null;
    const newExtreme=!!(next&&(thesisDirection==='short'?next.end.price<a.start.price:next.end.price>a.start.price));
    outcomes.push({
      startTs:a.start.ts,endTs:a.end.ts,amplitudeUsd:a.amplitudeUsd,
      material:a.amplitudeUsd>=materialThresholdUsd,
      priorThesisAmplitudeUsd:prev&&prev.amplitudeUsd||null,retracementRatio:retraceRatio,
      nextThesisAmplitudeUsd:next&&next.amplitudeUsd||null,reabsorptionRatio,
      fullyReabsorbed:!!(next&&next.amplitudeUsd>=a.amplitudeUsd),newExtreme
    });
  }
  const mat=outcomes.filter(x=>x.material);
  return {
    direction:adverse,count:outcomes.length,materialCount:mat.length,materialThresholdUsd,
    medianAmplitudeUsd:median(mat.map(x=>x.amplitudeUsd)),
    medianRetracementVsPriorThesis:median(mat.map(x=>x.retracementRatio)),
    medianReabsorptionByThesis:median(mat.map(x=>x.reabsorptionRatio)),
    fullyReabsorbedCount:mat.filter(x=>x.fullyReabsorbed).length,
    newExtremeAfterCount:mat.filter(x=>x.newExtreme).length,
    outcomes:mat.slice(-8)
  };
}
function ledger(frame,result,startTs,direction,label,pos=null){
  const rows=rowsSince(frame,startTs);
  const price=priceLedger(rows,direction);
  const legs=swingLegs(rows,50);
  const p75=Number(result.risk&&result.risk.respiration&&result.risk.respiration.p75);
  const materialThresholdUsd=Math.max(150,finite(p75)?p75:0);
  const attacks=attackSummary(legs,direction,materialThresholdUsd);
  const current=Number(frame.market.price);
  let best=null,currentAdverseFromBestUsd=null;
  if(rows.length){
    const ps=rows.map(r=>Number(r.lastPrice));
    best=direction==='long'?Math.max(...ps):direction==='short'?Math.min(...ps):null;
    if(finite(best))currentAdverseFromBestUsd=direction==='long'?best-current:current-best;
  }
  return {
    label,direction,startTs:Number(startTs)||null,
    price,micro:{bull:microStats(rows,'long'),bear:microStats(rows,'short')},
    attacks,current:{price:current,bestPrice:best,currentAdverseFromBestUsd},
    tradeMetrics:pos?{
      entryPrice:Number(pos.entryPrice),mfeUsd:Number(pos.metrics&&pos.metrics.mfeUsd)||0,
      maeUsd:Number(pos.metrics&&pos.metrics.maeUsd)||0,
      favorableUsd:Number(pos.metrics&&pos.metrics.favorableUsd)||0
    }:null
  };
}
function evaluate(frame,result,pos){
  const wave=result.wave||{},struct=wave.structural||{},origin=wave.origin||{};
  const campaignDirection=struct.available&&struct.direction?struct.direction:wave.direction||null;
  const campaignStart=finite(origin.ts)?Number(origin.ts):Number(frame.market.timestamp)-6*3600000;
  const tradeStart=pos&&pos.entryTimestamp?Date.parse(pos.entryTimestamp):null;
  return {
    version:'combat-ledger-shadow-v0.1',decisionImpact:false,
    campaignDirectionSource:struct.available&&struct.direction?'ACTIVE_MAJOR_E15_THESIS':'WAVE_PHASE_FALLBACK_SHADOW_ONLY',
    campaign:ledger(frame,result,campaignStart,campaignDirection,'E15_CAMPAIGN'),
    trade:pos&&finite(tradeStart)?ledger(frame,result,tradeStart,pos.direction,'OPEN_TRADE',pos):null,
    note:'gross bull/bear terrain uses non-overlapping sampled price deltas; ticker cadence/flow/yield are episode statistics, not summed overlapping windows'
  };
}
module.exports={evaluate,priceLedger,microStats,swingLegs,attackSummary,ledger};
