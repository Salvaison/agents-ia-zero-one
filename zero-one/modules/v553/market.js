'use strict';
// V553: independent AS-OF interpretation of market exploitability.
// It limits NEW admissions, never forces a position exit or a trade direction.
// No shadow endpoint / V543 or previous decision engine is imported.
const VERSION='v553-asof-market-admission-v1',MIN=60000;
const num=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const median=v=>{const a=v.filter(x=>num(x)!==null).sort((a,b)=>a-b);
 if(!a.length)return null;return a[Math.floor((a.length-1)/2)];};
const sg=d=>d==='long'?1:d==='short'?-1:0;
const round=x=>num(x)===null?null:Math.round(x*1000)/1000;
function features(xs){
 const r=xs.filter(x=>num(x?.ts)!==null&&num(x.lastPrice)!==null)
  .sort((a,b)=>a.ts-b.ts);
 if(r.length<2)return {samples:r.length,available:false};
 const moves=r.slice(1).map((x,i)=>x.lastPrice-r[i].lastPrice);
 const path=moves.reduce((s,x)=>s+Math.abs(x),0);
 const net=r.at(-1).lastPrice-r[0].lastPrice;
 const first15=x=>Math.sign(x.live15LbwRaw-x.live15BwRaw);
 const first3=x=>Math.sign(x.liveLbw-x.liveBw);
 const changeOf=f=>r.slice(1).reduce((s,x,i)=>{
  const a=f(r[i]),b=f(x);return s+(a&&b&&a!==b?1:0);},0);
 const cross15=changeOf(first15),cross3=changeOf(first3);
 const hi=Math.max(...r.map(x=>x.lastPrice)),lo=Math.min(...r.map(x=>x.lastPrice));
 const excursion=Math.max(hi-r[0].lastPrice,r[0].lastPrice-lo);
 const flow=median(r.map(x=>num(x.volumeFenetreBtc)!==null&&
  num(x.winSec)!==null&&x.winSec>0?60*x.volumeFenetreBtc/x.winSec:null));
 return {samples:r.length,available:true,
  startAt:r[0].ts,endAt:r.at(-1).ts,
  netUsd:round(net),pathUsd:round(path),high:hi,low:lo,
  retainedFraction:round(excursion>0?Math.abs(net)/excursion:0),
  priceEfficiency:round(path>0?Math.abs(net)/path:0),
  cross15Live:cross15,cross3Live:cross3,
  medianBtcMinute:round(flow),
  intervalCount:r.length-1,
  median30sMove:round(median(moves.map(Math.abs))),
  medianLBW15Slope3:round(median(r.slice(6).map((x,i)=>
   Math.abs(x.live15LbwRaw-r[i].live15LbwRaw)))),
  medianBW15Slope3:round(median(r.slice(6).map((x,i)=>
   Math.abs(x.live15BwRaw-r[i].live15BwRaw))))};
}
function calculate(input,o,chain=null,position=null){
 const asOf=o.at;
 const all=(input.samples||[]).filter(r=>r.ts<=asOf&&
  r.ts>=asOf-4*60*MIN&&num(r.lastPrice)!==null).sort((a,b)=>a.ts-b.ts);
 const recent=features(all.filter(x=>x.ts>asOf-60*MIN));
 const prior=[3,2,1].map(n=>features(all.filter(x=>
  x.ts>asOf-(n+1)*60*MIN&&x.ts<=asOf-n*60*MIN)));
 const back=prior.filter(x=>x.samples>=65),recentOk=recent.samples>=65;
 const cross15Baseline=median(back.map(x=>x.cross15Live));
 const cross3Baseline=median(back.map(x=>x.cross3Live));
 const efficiencyBaseline=median(back.map(x=>x.priceEfficiency));
 const retentionBaseline=median(back.map(x=>x.retainedFraction));
 const flowBaseline=median(back.map(x=>x.medianBtcMinute));
 const known=recentOk&&back.length>=2;
 const flat=known&&num(o.mcb15.slope3)!==null&&
  num(o.mcb15.bwSlope3)!==null&&
  Math.abs(o.mcb15.slope3)<=
    median(back.map(x=>x.medianLBW15Slope3)) &&
  Math.abs(o.mcb15.bwSlope3)<=
    median(back.map(x=>x.medianBW15Slope3));
 const frequent=known&&(recent.cross15Live>cross15Baseline||
  recent.cross3Live>cross3Baseline);
 const lowReturn=known&&recent.priceEfficiency<
  (efficiencyBaseline===null?0:efficiencyBaseline) &&
  recent.retainedFraction<
  (retentionBaseline===null?0:retentionBaseline);
 const contested=known&&(frequent&&lowReturn||
  (flat&&lowReturn));
 const s=sg(chain?.direction);
 const fresh=!!(chain&&s&&chain.startedAt>0&&
  chain.startedAt<=asOf&&chain.startedAt>Number(position?.exitAt||0));
 const progress=fresh?s*(o.price-chain.startPrice):null;
 const signed3=s&&num(o.pm.p3)!==null?s*o.pm.p3:null;
 const signedPm=s&&num(o.pm.live)!==null?s*o.pm.live:null;
 const waveGap=s&&num(o.mcb15.gapSlope3)!==null?s*o.mcb15.gapSlope3:null;
 const waveSlope=s&&num(o.mcb15.slope3)!==null?s*o.mcb15.slope3:null;
 const mcb3=s&&o.mcb3.direction===chain.direction;
 const live=s&&o.mcb15.direction===chain.direction;
 // A new impulse can reopen a contested market before the 1h regime catches up.
 const emerging=fresh&&chain.confirmations>=2&&
  progress>0&&signed3>0&&signedPm>0&&
  mcb3&&waveGap>0&&waveSlope>0&&
  (chain.live15At?live:true)&&
  (num(recent.median30sMove)===null||
    progress>recent.median30sMove);
 const age=chain?asOf-chain.startedAt:null;
 const recents=(input.bars?.m15||[]).filter(x=>x.ts+15*MIN<=asOf&&
  x.ts+15*MIN>=asOf-60*MIN);
 const typical15=median(recents.map(x=>x.high-x.low));
 const travel=fresh?progress:null;
 const late=travel!==null&&typical15!==null&&travel>typical15&&
  signed3!==null&&signed3<=0;
 const available=input.healthy&&known;
 const status=!available?'UNRECOGNIZED':
  contested&&!emerging?'SUSPEND_NEW':
  emerging?'EMERGING_DIRECTION':
  contested?'WATCH_CONTESTED':'OPEN_OBSERVING';
 const admissionAllowed=available&&status!=='SUSPEND_NEW'&&
  status!=='UNRECOGNIZED'&&!late;
 return {version:VERSION,asOf,source:'INDEPENDENT_BATON_AND_CLOSED_MCB_ASOF',
  mode:'PAPER_ONLY',brokerOrdersEnabled:false,
  status,admissionAllowed,reason:!available?'SOURCE_OR_HISTORY_UNAVAILABLE':
  late?'EPISODE_TRAVEL_MATURE_NO_MARGINAL_PROGRESS':
  contested&&!emerging?'REPEATED_LIVE_CROSS_LOW_RETAINED_PRICE':
  emerging?'NEW_PRICE_TRANSLATION_REOPENS_MARKET':
  'RELATIVE_MARKET_NOT_DISQUALIFIED',
  contested,emerging,flat,frequent,lowReturn,
  evidence:{recent,cross15Baseline,cross3Baseline,efficiencyBaseline,
   retentionBaseline,flowBaseline,typical15Range:round(typical15),
   progressFromChain:round(progress),marginal3:round(signed3),
   pmLive:round(signedPm),gapSlope:round(waveGap),
   lbwSlope:round(waveSlope),chainAgeMs:age,
   dataAgeMs:asOf-(input.current?.ts||0)},
  place:pricePlace(input,o,chain)};
}
function pricePlace(input,o,chain){
 const asOf=o.at;
 const bars=(input.bars?.m15||[]).filter(b=>b.ts+15*MIN<=asOf);
 const prior=bars.filter(b=>b.ts+15*MIN>asOf-240*MIN);
 if(prior.length<8)return {status:'NO_CLOSED_WAVE_RANGE',sourceAt:null};
 const high=Math.max(...prior.map(b=>b.high)),
 low=Math.min(...prior.map(b=>b.low)),
 height=high-low,price=o.price;
 const position=height>0?(price-low)/height:null;
 const bars15=bars.slice(-12);
 const medianBarRange=median(bars15.map(x=>x.high-x.low));
 const direction=chain?.direction||null,s=sg(direction);
 const room=direction==='long'?high-price:direction==='short'?price-low:null;
 const extension=direction==='long'?price>high:
   direction==='short'?price<low:false;
 const nearBoundary=direction&&room!==null&&medianBarRange!==null&&
  room<medianBarRange&&!extension;
 return {status:extension?'BREAKOUT_BEYOND_PRIOR_RANGE':
   nearBoundary?'NEAR_PRIOR_DIRECTIONAL_BOUNDARY':'WITHIN_CLOSED_WAVE_RANGE',
  high,low,priceLocationFraction:round(position),
  medianBarRange:round(medianBarRange),roomDirectionalUsd:round(room),
  nearBoundary:!!nearBoundary,extension,
  sourceAt:bars.at(-1)?.ts+15*MIN||null,
  reference:'LAST_4H_CONFIRMED_15M_BARS_NOT_USER_MANUAL_PROFILE',
  note:'PRICE_ROOM_QUALIFICATION_NOT_A_GUARANTEED_TURN'};
}
module.exports={VERSION,features,calculate,pricePlace,median};
