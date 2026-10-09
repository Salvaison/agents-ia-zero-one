'use strict';
function finite(v){return v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v));}
function combined(src){
  if(!src)return[];
  const a=(src.history||[]).filter(r=>finite(r.lt_blue_wave)&&finite(r.close)).slice();
  if(src.live&&finite(src.live.lt_blue_wave)&&(!a.length||src.live.ts>a[a.length-1].ts))a.push(src.live);
  return a;
}
function confirmedPivots(src,minAmp=2){
  const a=(src&&src.history||[]).filter(r=>finite(r.lt_blue_wave)&&finite(r.close));
  const raw=[];
  for(let i=1;i<a.length-1;i++){
    const p=Number(a[i-1].lt_blue_wave),v=Number(a[i].lt_blue_wave),n=Number(a[i+1].lt_blue_wave);
    const hi=v>0&&v>=p&&v>n, lo=v<0&&v<=p&&v<n;
    if(!hi&&!lo)continue;
    const amp=Math.min(Math.abs(v-p),Math.abs(v-n));
    if(amp<minAmp)continue;
    raw.push({ts:a[i].ts,timestamp:a[i].timestamp,type:hi?'CRETE':'CREUX',lbw:v,
      price:hi?Number(a[i].high):Number(a[i].low),close:Number(a[i].close),amplitude:amp});
  }
  const out=[];
  for(const p of raw){
    const last=out[out.length-1];
    if(last&&last.type===p.type){
      const better=p.type==='CRETE'?p.lbw>last.lbw:p.lbw<last.lbw;
      if(better)out[out.length-1]=p;
    }else out.push(p);
  }
  return out;
}

function signLbw(v){return Number(v)>0?1:Number(v)<0?-1:0;}
function completedLobePivots(src){
  const a=(src&&src.history||[]).filter(r=>finite(r.lt_blue_wave)&&finite(r.close)&&finite(r.high)&&finite(r.low));
  const out=[];
  let seg=[],segSign=0,openedByCross=false;
  const pushCompleted=(rows,sgn,completedBy)=>{
    if(!openedByCross||!rows.length||!sgn)return;
    let extreme=rows[0];
    for(const r of rows){
      const v=Number(r.lt_blue_wave),e=Number(extreme.lt_blue_wave);
      if((sgn>0&&v>e)||(sgn<0&&v<e))extreme=r;
    }
    let priceExtreme=rows[0], priceValue=sgn>0?Number(rows[0].high):Number(rows[0].low);
    for(const r of rows){
      const v=sgn>0?Number(r.high):Number(r.low);
      if((sgn>0&&v>priceValue)||(sgn<0&&v<priceValue)){priceValue=v;priceExtreme=r;}
    }
    out.push({
      ts:extreme.ts,timestamp:extreme.timestamp,type:sgn>0?'CRETE':'CREUX',
      lbw:Number(extreme.lt_blue_wave),price:sgn>0?Number(extreme.high):Number(extreme.low),
      close:Number(extreme.close),amplitude:null,
      major:true,model:'COMPLETED_ZERO_BOUNDED_LOBE_EXTREME',
      lobeStartTimestamp:rows[0].timestamp,lobeEndTimestamp:rows[rows.length-1].timestamp,
      completedAt:completedBy&&completedBy.timestamp||null,
      priceExtremeWithinLobe:priceValue,
      priceExtremeTimestamp:priceExtreme.timestamp
    });
  };
  for(const r of a){
    const sg=signLbw(r.lt_blue_wave);
    if(!sg)continue;
    if(!segSign){segSign=sg;seg=[r];continue;}
    if(sg===segSign){seg.push(r);continue;}
    pushCompleted(seg,segSign,r);
    openedByCross=true;
    segSign=sg;seg=[r];
  }
  return out;
}
function majorTfState(src,minAmp,dtHours){
  const local=tfState(src,minAmp,dtHours);
  const pivots=completedLobePivots(src);
  const latest=pivots[pivots.length-1]||null;
  let phase=local.phase,direction=local.direction;
  if(latest){
    phase=latest.type==='CRETE'?'DESCENTE':'MONTEE';
    direction=phase==='MONTEE'?'long':'short';
  }
  return {...local,localPivots:local.pivots,pivots,latest,phase,direction,
    majorModel:'COMPLETED_ZERO_BOUNDED_LOBE_EXTREME'};
}
function zeroCrossAfter(series,pivot){
  if(!pivot)return null;
  const a=series.filter(r=>r.ts>pivot.ts);
  for(let i=1;i<a.length;i++){
    const x=Number(a[i-1].lt_blue_wave),y=Number(a[i].lt_blue_wave);
    if((x>0&&y<=0)||(x<0&&y>=0))return {ts:a[i].ts,timestamp:a[i].timestamp,from:x,to:y};
  }
  return null;
}
function lobeMetrics(series,dtHours=.25){
  if(series.length<2)return null;
  let k=0;
  for(let i=series.length-1;i>0;i--){
    const a=Number(series[i-1].lt_blue_wave),b=Number(series[i].lt_blue_wave);
    if((a>0&&b<=0)||(a<0&&b>=0)){k=i;break;}
  }
  const seg=series.slice(k);
  const mass=seg.reduce((s,r)=>s+Math.abs(Number(r.lt_blue_wave)||0)*dtHours,0);
  const cur=seg[seg.length-1];
  return {fromTs:seg[0]&&seg[0].ts,direction:Number(cur&&cur.lt_blue_wave)>=0?'POSITIVE':'NEGATIVE',
    massAbsTime:mass,durationBars:seg.length,currentLbw:Number(cur&&cur.lt_blue_wave)};
}
function tfState(src,minAmp,dtHours){
  const series=combined(src), pivots=confirmedPivots(src,minAmp);
  const cur=series[series.length-1]||null, prev=series[series.length-2]||null;
  const latest=pivots[pivots.length-1]||null;
  let phase='INDETERMINE',direction=null;
  if(latest){
    phase=latest.type==='CRETE'?'DESCENTE':'MONTEE';
    direction=phase==='MONTEE'?'long':'short';
  }else if(cur&&prev){
    const d=Number(cur.lt_blue_wave)-Number(prev.lt_blue_wave);
    if(d>0){phase='MONTEE';direction='long';}
    else if(d<0){phase='DESCENTE';direction='short';}
  }
  let turningPoint=null;
  let slope=null;
  if(cur&&prev){
    slope=Number(cur.lt_blue_wave)-Number(prev.lt_blue_wave);
    const nearFlat=Math.abs(slope)<=2;
    if(Number(cur.lt_blue_wave)>0&&nearFlat)turningPoint='CRETE_EN_FORMATION';
    if(Number(cur.lt_blue_wave)<0&&nearFlat)turningPoint='CREUX_EN_FORMATION';
  }
  return {
    series,pivots,cur,prev,latest,phase,direction,turningPoint,slope,
    lobe:lobeMetrics(series,dtHours),
    current:{lbw:cur&&Number(cur.lt_blue_wave),bw:cur&&Number(cur.blue_wave),moneyFlow:cur&&Number(cur.money_flow),
      timestamp:cur&&cur.timestamp,source:src&&src.live===cur?'live':'confirmed'}
  };
}
function structuralLeg(s15,currentPrice){
  const end=s15&&s15.latest||null;
  const start=s15&&Array.isArray(s15.pivots)&&s15.pivots.length>1?s15.pivots[s15.pivots.length-2]:null;
  if(!start||!end||!finite(start.price)||!finite(end.price)){
    return {available:false,status:'UNKNOWN',direction:null,start,end,deltaUsd:null,magnitudeUsd:null,retracementRatio:null,lbwSpan:null,durationMinutes:null};
  }
  const startPrice=Number(start.price),endPrice=Number(end.price),cur=Number(currentPrice);
  const delta=endPrice-startPrice,magnitude=Math.abs(delta);
  const direction=delta>0?'long':delta<0?'short':null;
  const lbwSpan=finite(start.lbw)&&finite(end.lbw)?Math.abs(Number(end.lbw)-Number(start.lbw)):null;
  const durationMinutes=finite(start.ts)&&finite(end.ts)?Math.abs(Number(end.ts)-Number(start.ts))/60000:null;
  if(!direction||magnitude<50){
    return {available:false,status:'UNKNOWN',direction:null,start,end,deltaUsd:delta,magnitudeUsd:magnitude,retracementRatio:null,lbwSpan,durationMinutes};
  }
  const retracement=direction==='long'?(endPrice-cur)/magnitude:(cur-endPrice)/magnitude;
  const fullyRetraced=direction==='long'?cur<=startPrice:cur>=startPrice;
  return {available:true,status:'COMPLETED',direction,start,end,
    deltaUsd:delta,magnitudeUsd:magnitude,retracementRatio:retracement,lbwSpan,durationMinutes,
    fullyRetraced,priceRetracementStatus:fullyRetraced?'FULLY_RETRACED':'NOT_FULLY_RETRACED',
    note:'leg E15 majeur→E15 majeur acheve; descriptif de ce qui vient de se produire, jamais direction active automatique'};
}
function activeThesisFromMajor(s15,path,completedLeg){
  const origin=s15&&s15.latest||null;
  const previous=s15&&Array.isArray(s15.pivots)&&s15.pivots.length>1?s15.pivots[s15.pivots.length-2]:null;
  if(!origin)return {available:false,status:'UNKNOWN',direction:null,origin:null,previousMajor:previous||null};
  const direction=origin.type==='CREUX'?'long':origin.type==='CRETE'?'short':null;
  const span=completedLeg&&finite(completedLeg.lbwSpan)?Number(completedLeg.lbwSpan):null;
  const legMagnitude=completedLeg&&finite(completedLeg.magnitudeUsd)?Number(completedLeg.magnitudeUsd):null;
  const best=path&&finite(path.bestTranslationUsd)?Number(path.bestTranslationUsd):null;
  const signed=path&&finite(path.signedTranslationUsd)?Number(path.signedTranslationUsd):null;
  const majorPair=completedLeg&&completedLeg.available===true&&finite(span)&&span>=80&&finite(legMagnitude)&&legMagnitude>=50;
  const priceConfirmed=finite(best)&&best>=50;
  const available=!!direction&&majorPair&&priceConfirmed;
  return {
    available,status:available?'ACTIVE':'OBSERVING',direction:available?direction:null,
    origin,previousMajor:previous||null,reclaimPrice:previous&&finite(previous.price)?Number(previous.price):null,
    completedLegDirection:completedLeg&&completedLeg.direction||null,
    lbwSpan:span,majorLbwSpanMin:80,completedLegMagnitudeUsd:legMagnitude,
    signedTranslationUsd:signed,bestTranslationUsd:best,priceConfirmationMinUsd:50,
    majorPairEligible:majorPair,priceConfirmed,
    note:'these active = dernier E15 majeur confirme par lobe zero-borne + translation prix; LBW/phase seuls ne donnent jamais permission directionnelle'
  };
}
function pricePath(frame,pivot,phase){
  if(!pivot)return null;
  const dir=phase==='MONTEE'?1:phase==='DESCENTE'?-1:0;
  const audit=(frame.sources.auditRows||[]).filter(r=>Number(r.ts)>=pivot.ts&&finite(r.lastPrice));
  const ticks=(frame.sources.liveTicks||[]).filter(r=>Number(r.ts)>=pivot.ts&&finite(r.price));
  const candleSrc=frame.sources.mcb&&frame.sources.mcb.tfs&&frame.sources.mcb.tfs['15m'];
  const candles=combined(candleSrc).filter(r=>Number(r.ts)>=pivot.ts);
  const vals=audit.map(r=>Number(r.lastPrice)).concat(ticks.map(r=>Number(r.price)));
  const highs=candles.filter(r=>finite(r.high)).map(r=>Number(r.high));
  const lows=candles.filter(r=>finite(r.low)).map(r=>Number(r.low));
  const cur=Number(frame.market.price), origin=Number(pivot.price);
  if(!vals.length)vals.push(cur);
  const max=Math.max(...vals,...highs,cur), min=Math.min(...vals,...lows,cur);
  const signed=dir*(cur-origin);
  const best=dir>0?max-origin:dir<0?origin-min:0;
  const counter=dir>0?max-cur:dir<0?cur-min:0;
  return {originPrice:origin,currentPrice:cur,signedTranslationUsd:signed,bestTranslationUsd:best,
    counterExcursionUsd:Math.max(0,counter),maxPrice:max,minPrice:min,liveTickCount:ticks.length,auditCount:audit.length,candle15mCount:candles.length};
}
function evaluate(frame){
  const tfs=frame.sources.mcb&&frame.sources.mcb.tfs||{};
  const s15=majorTfState(tfs['15m'],2,.25);
  const s3=tfState(tfs['3m'],1,.05);
  const zero=zeroCrossAfter(s15.series,s15.latest);
  const path=pricePath(frame,s15.latest,s15.phase);
  const completedRaw=structuralLeg(s15,frame.market.price);
  const completedLeg=completedRaw&&completedRaw.available?{
    ...completedRaw,decisionImpact:false,
    semantic:'LAST_COMPLETED_MAJOR_E15_TO_E15_LEG_DESCRIPTIVE_NOT_AUTONOMOUS_EXIT'
  }:{...completedRaw,decisionImpact:false,
    semantic:'NO_COMPLETED_MAJOR_E15_TO_E15_LEG'};
  const structural=activeThesisFromMajor(s15,path,completedLeg);
  return {
    model:'E15_MAJOR_LOBE_PRICE_ACTION_V3_R11',
    phase:s15.phase,direction:s15.direction,turningPoint:s15.turningPoint,
    structural,completedLeg,
    origin:s15.latest,
    previousOrigin:s15.pivots.length>1?s15.pivots[s15.pivots.length-2]:null,
    pivots:s15.pivots.slice(-12),
    intermediatePivots:(s15.localPivots||[]).slice(-12),
    pivotSemantics:{
      major:'extreme LBW absolu du lobe de signe complet entre deux passages zero; confirme seulement apres fermeture du lobe',
      intermediate:'extrema locaux conserves pour respiration/risque, jamais structure majeure automatique'
    },
    zeroCrossSinceOrigin:zero,
    zeroCrossMeaning:'confirme la fermeture du lobe de l E15 majeur passe; ne donne jamais a lui seul une permission de trade',
    lobe:s15.lobe,
    price:path,
    current:s15.current,
    nested3m:{
      phase:s3.phase,direction:s3.direction,turningPoint:s3.turningPoint,slopeLbw:s3.slope,
      origin:s3.latest,previousOrigin:s3.pivots.length>1?s3.pivots[s3.pivots.length-2]:null,
      current:s3.current,lobe:s3.lobe,pivots:s3.pivots.slice(-12)
    },
    confidence:s15.latest?'MEDIUM':'LOW'
  };
}
module.exports={evaluate,confirmedPivots,completedLobePivots,majorTfState,pricePath,structuralLeg,activeThesisFromMajor};
