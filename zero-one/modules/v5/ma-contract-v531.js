'use strict';
// BOONO V5.3.1: MA200 3m tactical and MA200 15m structural.
// Single bounded PRICE CONFRONTATION zone, no LGI-like level proliferation.
// Evidence uses CLOSED MCB bars only (known after bar close), and LIVE MA
// values for situational proximity only, never confirmed acceptance.
// Pure evaluation; no broker, no filesystem, no future candles.
const {number:N,rounded:R,side}=require('./v53-causal');
const maMemory=require('./ma-polarity-memory-v541');
const M=60000;
const PERIOD={ '3m':3*M,'15m':15*M };
const rv=(v,fallback)=>N(v)===null?fallback:N(v);
const median=xs=>{const a=xs.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
const sign=v=>v>0?1:v<0?-1:0;
function band(ma,medianRange,tf){
 if(N(ma)===null)return null;
 const tolerance=Math.max(5,Math.abs(ma)*.0003);
 // Approach is a separate, volatility-aware stage, NOT the CONTACT threshold.
 const approach=Math.max((tf==='15m'?2.5:2)*tolerance,
   (tf==='15m'?.5:.65)*(medianRange||0));
 return {toleranceUsd:R(tolerance),approachUsd:R(approach),
  departureUsd:R(2*tolerance),basis:'MA200 0.03% contact; approach uses confirmed TF range'};
}
function history(tf,raw,now){
 const p=PERIOD[tf],out=[];
 for(const b of raw||[]){
  if(N(b.ts)===null||b.ts+p>now||N(b.ma200)===null||N(b.close)===null||
      N(b.high)===null||N(b.low)===null)continue;
  out.push(b);
 }
 return out.sort((a,b)=>a.ts-b.ts).slice(-(tf==='3m'?64:32));
}
function maPath({tf,raw=[],live=null,now,price,dir}){
 const period=PERIOD[tf],d=side(dir),bars=history(tf,raw,now);
 const ranges=bars.slice(-26).map(b=>b.high-b.low);
 const med=median(ranges);
 const last=bars.at(-1);
 let liveValue=null;
 if(live&&N(live.value)!==null&&N(live.observedAt)!==null&&
   live.observedAt<=now&&now-live.observedAt<=(tf==='15m'?180000:90000) &&
   N(live.barTs)!==null&&live.barTs<=now&&
   (!last||live.barTs>=last.ts))liveValue=live.value;
 const confirmedMa=N(last?.ma200),ref=liveValue??confirmedMa;
 const polarityMemory=maMemory.inspect(tf,raw,now);
 if(ref===null||!d)return {
  tf,role:tf==='3m'?'TACTICAL':'STRUCTURAL',state:'UNKNOWN',
  availableAt:null,distanceUsd:null,hasLive:liveValue!==null,
  medianRangeUsd:R(med),polarityMemory,decisionImpact:false};
 const widths=band(ref,med,tf),tol=widths.toleranceUsd,approach=widths.approachUsd;
 const signed=d*(price-ref),inApproach=Math.abs(price-ref)<=approach;
 const closed=last?d*(last.close-last.ma200):null;
 const before=bars.at(-2),prior=before?d*(before.close-before.ma200):null;
 const confirmedSame=bars.slice(-2).length===2&&bars.slice(-2).every(b=>
   d*(b.close-b.ma200)>tol);
 const confirmedStrong=closed!==null&&closed>widths.departureUsd&&
   prior!==null&&prior>0;
 const established=confirmedSame||confirmedStrong;
 // Confirmed losses after accepted territory: TWO closes or one material close
 // with actual counterconversion before the decision may exit.
 const confirmedLost=bars.slice(-2).length===2&&bars.slice(-2).every(b=>
   d*(b.close-b.ma200)<-tol);
 // LOST is only a proven prior acceptance that was subsequently abandoned.
 // A price that has always remained under MA is OPPOSITE_SIDE, not LOST.
 const acceptedPreviously=bars.slice(-14,-2).some((b,i,a)=>i>0&&
    d*(b.close-b.ma200)>tol&&d*(a[i-1].close-a[i-1].ma200)>tol);
 const prevNear=bars.slice(-10).filter(b=>Math.abs(b.close-b.ma200)<=approach||
    (b.low<=b.ma200+tol&&b.high>=b.ma200-tol));
 const recentlyTouched=prevNear.some(b=>now-(b.ts+period)<=
   (tf==='3m'?4:2)*period);
 const liveCrossed=prior!==null&&closed!==null&&closed<=tol&&signed>0&&inApproach;
 const testInProgress=inApproach&&(recentlyTouched||liveCrossed||
   (closed!==null&&closed<=tol&&signed>=-tol));
 let state='FAR';
 if(inApproach){
  // A fresh LIVE crossing is still a TEST, even if an earlier rejection
  // existed. A confirmed defence requires subsequent closed bars.
  if(liveCrossed&&!established)state='TEST_PENDING';
  else if(established&&signed>=-tol)state='ACCEPTED';
  else if(confirmedLost||recentlyTouched&&signed< -tol&&closed!==null&&closed< -tol)
    state='REJECTED';
  else if(testInProgress)state='TEST_PENDING';
  else state='APPROACH';
 }else if(established&&signed>tol)state='ACCEPTED';
 else if(confirmedLost&&signed< -tol)state=acceptedPreviously?'LOST':'OPPOSITE_SIDE';
 const nearBars=bars.filter(b=>
   now-(b.ts+period)<=(tf==='3m'?8:4)*period&&
   (Math.abs(b.close-b.ma200)<=approach||
     (b.low<=b.ma200+tol&&b.high>=b.ma200-tol)));
 const episodeRows=nearBars.slice(-7);
 // Range is ONE object per TF, formed from real confirmed attempts.
 const upper=episodeRows.length?Math.max(...episodeRows.map(b=>b.high)):null;
 const lower=episodeRows.length?Math.min(...episodeRows.map(b=>b.low)):null;
 const visits=episodeRows.filter(b=>b.low<=b.ma200+tol&&b.high>=b.ma200-tol).length;
 const stage=visits>=3&&episodeRows.length>=3?'CONFRONTATION_REPEATED':
   visits>=1?'TEST_ZONE_FORMING':'NO_REPEATED_TEST';
 let zone=episodeRows.length>=2?{
   lower:R(lower),upper:R(upper),
   source:'CONFIRMED_PRICE_EXTREMA',
   firstTs:episodeRows[0].ts,
   lastAvailableAt:episodeRows.at(-1).ts+period,
   tests:visits,stage,maAtLast:R(ref)}:null;
 // A live crossing can create ONE provisional confrontation zone, without
 // inventing confirmed extrema, retests or a trade-authoritative level.
 if(!zone&&inApproach&&state==='TEST_PENDING'){
  zone={lower:R(Math.min(ref-tol,price)),upper:R(Math.max(ref+tol,price)),
   source:'LIVE_TEST_PROVISIONAL',firstTs:null,
   lastAvailableAt:null,tests:0,stage:'FORMING_UNCONFIRMED',maAtLast:R(ref)};
 }
 // Acceptance requires confirmation, or a demonstrated reclaim/retest.
 const support=state==='ACCEPTED'&&zone&&d*(price-ref)>0;
 const riskLevel=support?R(d>0?Math.min(ref,zone.lower):Math.max(ref,zone.upper)):null;
 return {tf,role:tf==='3m'?'TACTICAL':'STRUCTURAL',
  state,ma:R(ref),confirmedMa:R(confirmedMa),hasLive:liveValue!==null,
  price:R(price),distanceUsd:R(price-ref),distanceAbsUsd:R(Math.abs(price-ref)),
  signedDistanceUsd:R(signed),inApproach,
  ...widths,medianRangeUsd:R(med),
  lastConfirmedAt:last?last.ts+period:null,sourceBar:last?.ts||null,
  accepted:state==='ACCEPTED',recentlyTouched,
  testedLive:liveCrossed,confirmedSame,confirmedStrong,
  lostConfirmed:confirmedLost,polarityMemory,
  zone,structureLevel:riskLevel,decisionImpact:false,
  evidence:'Approach is context; pending test defers new contested admission; risk uses observed confirmed reaction'};
}
function quality(base,dir){
 const f=base?.readings?.flow15||{},d=side(dir),
  fast=N(f.mf3Change),slow=N(f.mf15Change),
  eps3=.15,eps15=.15;
 const fdir=fast===null?'UNKNOWN':d*fast>eps3?'FAVORABLE':d*fast< -eps3?'ADVERSE':'NEUTRAL';
 const sdir=slow===null?'UNKNOWN':d*slow>eps15?'FAVORABLE':d*slow< -eps15?'ADVERSE':'NEUTRAL';
 const grade=fdir==='FAVORABLE'&&sdir==='FAVORABLE'?'REINFORCING':
   fdir==='FAVORABLE'&&sdir==='NEUTRAL'?'TACTICAL_LEADING':
   fdir==='FAVORABLE'&&sdir==='ADVERSE'?'TACTICAL_VS_SLOW_ADVERSE':
   fdir==='ADVERSE'&&sdir==='ADVERSE'?'ADVERSE':
   fdir==='UNKNOWN'||sdir==='UNKNOWN'?'UNKNOWN':'CONTESTED';
 return {grade,mf3Slope:R(fast),mf15Slope:R(slow),
  mf3Role:fdir,mf15Role:sdir,
  genuineSlowSupport:sdir==='FAVORABLE',
  note:'MF15 slightly negative is not BOTH_SLOPES_SUPPORT, even if old V5.3 tolerated it'};
}
function activeZone(ma3,ma15,price){
 const options=[ma3,ma15].filter(x=>x&&x.inApproach&&x.zone);
 if(!options.length)return null;
 // Merge when 3m and 15m contests refer to the SAME territory.
 if(options.length===2&&Math.abs(ma3.ma-ma15.ma)<=Math.max(ma3.approachUsd,ma15.approachUsd)){
  return {name:'JOINT_MA_CONFRONTATION',horizons:['3m','15m'],ma:R((ma3.ma+ma15.ma)/2),
   upper:R(Math.max(ma3.zone.upper,ma15.zone.upper)),
   lower:R(Math.min(ma3.zone.lower,ma15.zone.lower)),
   quality:ma15.zone.stage==='CONFRONTATION_REPEATED'||
      ma3.zone.stage==='CONFRONTATION_REPEATED'?'REPEATED':'FORMING',
   cause:'Convergent MA3/MA15, one zone only, no extra LGI'};
 }
 options.sort((a,b)=>{
  const wa=a.state==='TEST_PENDING'||a.state==='REJECTED'?0:1,
   wb=b.state==='TEST_PENDING'||b.state==='REJECTED'?0:1;
  return wa-wb||a.distanceAbsUsd/a.approachUsd-b.distanceAbsUsd/b.approachUsd;
 });
 const a=options[0];
 return {name:a.tf==='15m'?'STRUCTURAL_MA15':'TACTICAL_MA3',
  horizons:[a.tf],ma:a.ma,upper:a.zone.upper,lower:a.zone.lower,
  quality:a.zone.stage==='CONFRONTATION_REPEATED'?'REPEATED':'FORMING',
  cause:'Only active, observable price confrontation'};
}
function evaluate(input,base){
 const dir=input?.position?.direction||base?.candidate;
 const now=N(input?.now),price=N(input?.price);
 if(!dir||now===null||price===null)return {version:'v531-ma-contract',quality:{grade:'UNKNOWN'},
  ma3:null,ma15:null,activeZone:null,entryGate:null,decisionImpact:false};
 const ma3=maPath({tf:'3m',raw:input.bars3,live:input.liveMa3,now,price,dir});
 const ma15=maPath({tf:'15m',raw:input.bars15,live:input.liveMa15,now,price,dir});
 const zone=activeZone(ma3,ma15,price);
 const flow=quality(base,dir);
 // Shared maturity. Do not veto based on MA proximity alone.
 const candidates=[ma15,ma3].filter(x=>x&&x.inApproach&&
   ['TEST_PENDING','REJECTED'].includes(x.state));
 const challenged=candidates[0]||null;
 const entryGate=challenged?{
  block:true,reason:challenged.state==='REJECTED'?
    'WAIT_'+challenged.tf.toUpperCase()+'_REJECTION':
    'WAIT_'+challenged.tf.toUpperCase()+'_TEST_PENDING',
  source:challenged.tf,level:challenged.ma,
  observation:'Price is testing an unresolved moving-average frontier'}:null;
 // A validated MA can share risk, only for NEW trades and with a credible range.
 let maRisk=null;
 for(const m of [ma15,ma3]){
  if(!m?.accepted||!m.structureLevel||!m.zone||
    m.distanceAbsUsd>2*m.approachUsd||
    m.zone.source!=='CONFIRMED_PRICE_EXTREMA'||
    m.zone.tests<2)continue;
  const buffer=Math.max(12,m.toleranceUsd*.5);
  const protective=m.structureLevel-side(dir)*buffer;
  const dist=side(dir)*(price-protective);
  const minDist=Math.max(36,(m.medianRangeUsd||65)*.8);
  if(dist<minDist||dist>=500)continue;
  const z={price:R(protective),distanceUsd:R(dist),reference:'DEFENDED_MA200_'+m.tf.toUpperCase(),
   kind:'CONFIRMED_MA_TERRITORY',underlyingLevel:m.structureLevel,
   confirmedAvailableAt:m.zone.lastAvailableAt,
   sourceTs:m.zone.firstTs,
   reason:'Shared MCB/MA stop, based on observed price reactions, not MA proximity'};
  if(!maRisk||z.distanceUsd<maRisk.distanceUsd)maRisk=z;
 }
 return {version:'v531-ma-contract',
  ma3,ma15,activeZone:zone,
  flowQuality:flow,entryGate,riskCandidate:maRisk,
  quality:{grade:flow.grade},
  decisionImpact:true,
  note:'One active zone; hypotheses do not become structural levels until tested'};
}
module.exports={band,history,maPath,quality,activeZone,evaluate};
