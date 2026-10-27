'use strict';
// BOONO divergence READER, no strategy authority and no new engine version.
// A divergence's price anchors are local to one CONFIRMED MA200 polarity regime.
// A wick / one contrary candle / price bounce does not close a regime.
const TF_MS={'3m':180000,'15m':900000,'1h':3600000,'4h':14400000,
 '1d':86400000,'1w':604800000};
const num=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
const name=s=>s===1?'ABOVE':s===-1?'BELOW':'UNKNOWN';
function resolve(raw,tf,asOf){
 const period=TF_MS[tf]||null;
 if(!period)return {status:'UNSUPPORTED_TF',timeframe:tf,side:'UNKNOWN',
  id:null,rows:[],transitions:[],decisionImpact:false};
 const all=(raw||[]).filter(b=>b&&b._live!==true&&num(b.ts)!==null&&
  num(b.ts)+period<=asOf&&num(b.close)!==null)
  .sort((a,b)=>a.ts-b.ts);
 // Duplicate historical bars must not simulate two consecutive confirmations.
 const unique=[...new Map(all.map(b=>[Number(b.ts),b])).values()]
   .sort((a,b)=>a.ts-b.ts);
 const available=unique.filter(b=>num(b.ma200)!==null&&num(b.ma200)>0);
 const base={timeframe:tf,asOf,periodMs:period,source:'CONFIRMED_MCB_MA200_CLOSE',
  decisionImpact:false,trigger:'TWO_CONFIRMED_CLOSES_OUTSIDE_MA_TOLERANCE',
  side:'UNKNOWN',id:null,openedAt:null,confirmedAt:null,
  firstKnownAt:null,polarityConfirmed:false,partialHistory:true,
  transitions:[],rows:[],closedByPolarityAt:null,historyGapCount:0};
 if(!available.length)return {...base,status:'MA200_UNAVAILABLE',rows:unique};
 let side=0,baseline=null,regimeStart=0,observedAt=null,regimeBornAt=null;
 let candidate=0,candidateStart=0,run=0,missing=0,lastTs=null;
 let transitions=[],gaps=0;
 for(let i=0;i<unique.length;i++){
  const b=unique[i],ma=num(b.ma200),close=num(b.close);
  const consecutive=lastTs===null||b.ts-lastTs<=period*1.5;
  lastTs=b.ts;
  if(!consecutive)missing=2;
  if(ma===null||ma<=0||!consecutive){
    missing++;candidate=0;run=0;
    if(missing>=2){
      if(side!==0){
       transitions.push({type:'HISTORY_GAP',side:name(side),
        at:b.ts,previousConfirmedAt:observedAt});
      }
      if(side!==0||!consecutive)gaps++;
      side=0;baseline=null;regimeStart=i+1;
      observedAt=null;regimeBornAt=null;
    }
    continue;
  }
  missing=0;
  const tol=Math.max(5,Math.abs(ma)*.0003);
  const diff=close-ma,d=Math.abs(diff)>tol?(diff>0?1:-1):0;
  if(d===0||d===side){candidate=0;run=0;continue;}
  if(d!==candidate){candidate=d;candidateStart=i;run=1;}
  else run++;
  if(run<2)continue;
  const closedAt=b.ts+period;
  const actualFlip=side!==0;
  if(actualFlip){
    transitions.push({type:'POLARITY_CHANGED',from:name(side),to:name(d),
      confirmedAt:closedAt,
      oldRegimeId:tf+'|'+name(side)+'|'+observedAt,
      newRegimeId:tf+'|'+name(d)+'|'+closedAt,
      newRegimeFirstBarTs:unique[candidateStart]?.ts});
  }else baseline=closedAt;
  // No wick from the two flip-confirmation candles can become a fresh
  // divergence anchor: the new price-history begins AFTER confirmation.
  side=d;regimeStart=actualFlip?i+1:candidateStart;
  regimeBornAt=actualFlip?closedAt:Number(unique[candidateStart].ts);
  observedAt=closedAt;
  candidate=0;run=0;
 }
 const filtered=side!==0?unique.slice(regimeStart):[];
 const currentId=side!==0?tf+'|'+name(side)+'|'+observedAt:null;
 const openedAt=side!==0?regimeBornAt:null;
 const lastFlip=[...transitions].reverse().find(e=>e.type==='POLARITY_CHANGED');
 return {...base,status:side?'CONFIRMED_REGIME':'POLARITY_UNRESOLVED',
  side:name(side),id:currentId,openedAt,confirmedAt:observedAt,
  firstKnownAt:baseline,polarityConfirmed:side!==0,
  partialHistory:!lastFlip,rows:filtered,
  transitions:transitions.slice(-25),
  closedByPolarityAt:lastFlip?.confirmedAt||null,
  historyGapCount:gaps};
}
function compact(scope){
 const {status,timeframe,source,side,id,openedAt,confirmedAt,
  partialHistory,closedByPolarityAt,historyGapCount,
  transitions,asOf,periodMs}=scope;
 return {status,timeframe,source,side,id,openedAt,confirmedAt,
  partialHistory,closedByPolarityAt,historyGapCount,asOf,periodMs,
  recentTransitions:transitions.slice(-8),decisionImpact:false,
  note:'Only a confirmed same-TF MA200 polarity change invalidates old divergence price anchors; isolated wicks remain price observations'};
}
module.exports={TF_MS,resolve,compact};
