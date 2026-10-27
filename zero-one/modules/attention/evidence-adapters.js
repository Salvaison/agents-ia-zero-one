'use strict';
// Convert only available source facts into chronological observations.
// A divergence is a price-vs-MF relation, never a naked MF slope or a vote.
const MIN=60000,THREE=3*MIN,FIFTEEN=15*MIN;
const n=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const dir=d=>d==='long'||d==='short'?d:null;
function add(out,kind,d,sourceAt,availableAt,more={}){
 if(!dir(d)||n(sourceAt)===null||n(availableAt)===null)return;
 out.push({kind,direction:d,sourceAt,availableAt,
   id:[kind,d,sourceAt,more.episodeId||''].join('|'),...more});
}
function divergenceFromBars(bars,now){
 const closed=(bars||[]).filter(b=>n(b.ts)!==null&&b.ts+FIFTEEN<=now&&
  n(b.low)!==null&&n(b.high)!==null&&n(b.money_flow)!==null)
  .sort((a,b)=>a.ts-b.ts).slice(-24);
 if(closed.length<4)return [];
 const out=[];
 // First anchor must be a local price extreme whose following closed candle
 // was actually observed. Second anchor may be FORMING at a freshly closed bar.
 for(const d of ['long','short']){
  const extreme=(a,b)=>d==='long'?a.low<b.low:a.high>b.high;
  const mfImproves=(a,b)=>d==='long'?b.money_flow>a.money_flow:
   b.money_flow<a.money_flow;
  const previous=[];
  for(let i=1;i<closed.length-1;i++){
   if(extreme(closed[i],closed[i-1])&&extreme(closed[i],closed[i+1]))
    previous.push(i);
  }
  for(let j=2;j<closed.length;j++){
   // Compare against the strongest previous confirmed price pivot, not
   // simply the most recent minor bounce inside the same attack.
   const candidates=previous.filter(i=>i<=j-2&&extreme(closed[j],closed[i]));
   if(!candidates.length)continue;
   const i=candidates.reduce((best,i)=>best===null||
    extreme(closed[i],closed[best])?i:best,null);
   const a=closed[i],b=closed[j];
   if(!mfImproves(a,b))continue;
   // Two chronological comparisons only; current newer low/high may be forming.
   // Do not infer a price pivot confirmation before the next 15m bar closes.
   const confirmed=j+1<closed.length&&extreme(b,closed[j+1]);
   if(!confirmed&&j!==closed.length-1)continue;
   add(out,'MF_DIVERGENCE',d,b.ts,b.ts+FIFTEEN,{
     anchors:{priceFirst:d==='long'?a.low:a.high,
      priceSecond:d==='long'?b.low:b.high,
      mfFirst:a.money_flow,mfSecond:b.money_flow},
     quality:confirmed?'CONFIRMED_PIVOT':'FORMING_SECOND_PIVOT',
     episodeId:[a.ts,b.ts].join(':')});
  }
 }
 return out.slice(-6);
}
function fromV542(decision,input){
 const now=n(decision?.asOf),s=decision?.readings?.structural54||{},
  m=decision?.readings?.maContract||{},c=s.conversion||{};
 if(now===null)return [];
 const out=[];
 const p=s.structuralOrigin;
 if(p?.availableAt&&s.director)add(out,'MCB15_PIVOT',s.director,p.sourceTs,p.availableAt,
  {episodeId:s.campaignId,price:p.price});
 for(const [field,kind] of [['nativeE3','MCB3_NATIVE'],['nativeE15','MCB15_NATIVE']]){
  const ev=s[field]?.confirmed;
  if(ev&&ev.availableAt)add(out,kind,ev.direction,ev.sourceTs,ev.availableAt);
 }
 if(s.oppositeLive15?.observedAt)
  add(out,'MCB15_FORMING',s.oppositeLive15.direction,
   s.oppositeLive15.sourceTs,s.oppositeLive15.observedAt);
 if(s.mcb3?.latestPivot?.availableAt)
  add(out,'MCB3_TURN',s.mcb3.latestPivot.direction,
   s.mcb3.latestPivot.sourceTs,s.mcb3.latestPivot.availableAt);
 const candidate=dir(decision.candidate);
 const t=s.testedTerritory;
 if(candidate&&t?.validated&&t.availableAt)
  add(out,'PRICE_DEFENCE',candidate,t.availableAt,t.availableAt,
    {price:t.level,episodeId:s.campaignId,quality:t.status});
 for(const v of [m.ma3,m.ma15]){
  const e=v?.polarityMemory?.lastRejection;
  if(e?.at)add(out,'MA_REJECTION',e.sideLost==='ABOVE'?'short':'long',
   e.at,e.at,{price:e.price});
 }
 const sign=candidate==='long'?1:candidate==='short'?-1:0;
 if(sign){
  const mf3=n(s.directionalMF3),mf15=n(s.directionalMF15);
  const observed=input.samples?.filter(x=>x.ts<=now).at(-1);
  const source=observed?.ts;
  if(mf3!==null&&mf15!==null&&mf3>.15&&mf15>.15&&source)
   add(out,'MF_ACTION',candidate,source,now,{quality:'MF3_MF15_DIRECTIONAL'});
  const pm3=n(c.pm3),pm5=n(c.pm5);
  if(pm3!==null&&pm5!==null&&sign*pm3>0&&sign*pm5>0&&source)
   add(out,'PRICE_TRANSLATION',candidate,source,now,
     {price:decision.price,quality:'PM3_PM5_SAME_DIRECTION'});
 }
 return [...divergenceFromBars(input.bars15,now),...out]
   .filter(e=>e.availableAt<=now);
}
function fromV494(e,frame){
 const at=n(frame?.market?.timestamp),out=[];
 if(at===null||!e)return out;
 const native=e.nativeSignal?.latest;
 if(native?.confirmed&&native.ts)
  add(out,'MCB15_NATIVE',native.type==='UP'?'long':'short',
    native.ts,native.ts+FIFTEEN);
 const p=e.mcb?.structural15m?.lastStructuralPivot;
 if(p&&p.confirmedAt&&p.confirmedAt+FIFTEEN<=at)
  add(out,'MCB15_PIVOT',p.direction,p.extremeTs,p.confirmedAt+FIFTEEN);
 const p3=e.mcb?.nested3m;
 if(p3?.structuralConfirmedAt&&p3.structuralConfirmedAt<=at)
  add(out,'MCB3_TURN',p3.structuralDirection,
    p3.structuralConfirmedAt,p3.structuralConfirmedAt);
 const cand=e.entryBaseThesis?.candidateDirection||e.entryBaseThesis?.direction;
 if(cand&&e.entryBaseThesis?.state==='TRANSITION_NEUTRAL')
  add(out,'MCB15_FORMING',cand,Math.floor(at/FIFTEEN)*FIFTEEN,at);
 const pm=e.translation||{};
 if(dir(pm.thesisDirection)&&pm.aligned&&['TRANSLATING','STRONG_TRANSLATION'].includes(pm.status))
  add(out,'PRICE_TRANSLATION',pm.thesisDirection,
   frame.sources?.auditRows?.at(-1)?.ts||at,at,
   {price:e.price,quality:'V493_ROLLING_PM'});
 const fresh=e.entryTranslation||{};
 if(dir(cand)&&fresh.sinceSetup?.available&&fresh.sinceSetup.netUsd&&
  fresh.status==='TRANSLATING')
  add(out,'PRICE_TRANSLATION',cand,
   fresh.sinceSetup.startTs,at,{price:e.price,quality:'V493_POST_SETUP_PM'});
 const temporal=e.mfStructureShadow?.temporal;
 if(cand&&temporal?.tacticalDirection===cand&&
  temporal?.horizons?.h1?.direction===cand&&
  (p3?.structuralDirection===cand))
  add(out,'MF_TRANSFER',cand,
    frame.sources?.auditRows?.at(-1)?.ts||at,at,
    {quality:'V493_30M_1H_3M_TRANSFER'});
 for(const x of divergenceFromBars(frame.sources?.mcb?.tfs?.['15m']?.history,at))
  out.push(x);
 return out.filter(x=>x.availableAt<=at);
}
module.exports={fromV542,fromV494,divergenceFromBars};
