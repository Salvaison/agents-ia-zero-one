'use strict';
// BOONO V5.3 — causal evidence utilities. No I/O, no broker, no state writes.
const previous=require('./decision-v522');
const MIN=60000,THREE=3*MIN,FIFTEEN=15*MIN;
const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const rounded=v=>number(v)===null?null:Math.round(v*10)/10;
const side=d=>d==='long'?1:d==='short'?-1:0;
const opposite=d=>d==='long'?'short':d==='short'?'long':null;
const bars=(all,now,period)=>previous.barsAvailable(all||[],now,period);
function native15(samples,c15,now){
 const tbar=Math.floor(now/FIFTEEN)*FIFTEEN;
 const inBar=(samples||[]).filter(x=>x.ts<=now&&x.ts>=tbar&&x.ts>=now-FIFTEEN);
 const current=inBar.filter(x=>number(x.live15LbwRaw)!==null&&number(x.live15BwRaw)!==null).at(-1);
 const spread=current?current.live15LbwRaw-current.live15BwRaw:null;
 let crossDirection=spread===null||Math.abs(spread)<.04?null:spread>0?'long':'short';
 const liveCandidates=[];
 for(const x of inBar){
  for(const [col,direction] of [['live15SignalUp','long'],['live15SignalDn','short']]){
   if(number(x[col])!==null)liveCandidates.push({direction,observedAt:x.ts,barTs:tbar,value:rounded(x[col])});
  }
 }
 const nativeLive=liveCandidates.filter(x=>x.direction===crossDirection).at(-1)||null;
 // Confirmed 15m signals are known only AFTER the source bar has closed.
 const confirmed=[];
 for(const b of c15.slice(-32)){
  for(const [key,d] of [['wt1_cross_up','long'],['wt1_cross_dn','short']]){
   if(number(b[key])!==null&&b.ts+FIFTEEN<=now)
    confirmed.push({direction:d,barTs:b.ts,availableAt:b.ts+FIFTEEN,level:rounded(b[key])});
  }
 }
 confirmed.sort((a,b)=>a.availableAt-b.availableAt);
 const lastConfirmed=confirmed.at(-1)||null;
 const lastConsistent=confirmed.filter(x=>x.direction===crossDirection).at(-1)||null;
 // Persistence is a geometric property, not an arbitrary number of minutes
 // after the crossing. An opposite spread supersedes an old native 15m event.
 const currentConfirmed=!!(lastConfirmed&&lastConfirmed.direction===crossDirection);
 const lastCandle=c15.at(-1);
 const d15=lastCandle&&current?rounded(current.live15LbwRaw-lastCandle.lt_blue_wave):null;
 return {crossDirection,spread:rounded(spread),nativeLive,
   confirmed:lastConfirmed,consistentConfirmed:lastConsistent,
   currentConfirmed,live15Available:!!current,
   lbw15:current?rounded(current.live15LbwRaw):null,
   bw15:current?rounded(current.live15BwRaw):null,
   lbwChangeSinceConfirmed:d15,
   sourceBar:tbar,
   lastConfirmedAt:lastConfirmed?.availableAt||null};
}
function retestCausal(confirmedBars,level,dir,scale,now){
 const d=side(dir),tol=Math.max(10,(scale||65)*.14);
 if(!d||number(level)===null||!Array.isArray(confirmedBars)||confirmedBars.length<4)return null;
 let state='IDLE',crossed=null,extended=null,touched=null,held=null;
 const reset=()=>{state='IDLE';crossed=null;extended=null;touched=null;held=null;};
 let prev=null;
 for(const b of confirmedBars){
  if(!Number.isFinite(b.ts)||b.ts+THREE>now)continue;
  const close=number(b.close),lo=number(b.low),hi=number(b.high);
  if(close===null||lo===null||hi===null)continue;
  const p=d*(close-level),edge=d===1?lo:hi,at=b.ts+THREE;
  const wrong=p<-tol*.35;
  if(wrong&&state!=='IDLE')reset(); // old defence is no longer valid
  const crossedNow=prev!==null&&prev<=0&&p>tol*.25;
  if(state==='IDLE'&&crossedNow){state='CROSSED';crossed=at;}
  else if(state==='CROSSED'&&p>tol*1.2){state='EXTENDED';extended=at;}
  else if(state==='EXTENDED'&&d*(edge-level)<=tol&&p>=-tol*.35){
   state='RETEST';touched=at;
  }else if(state==='RETEST'&&p>tol*1.2&&at>touched){
   state='HELD';held=at;
  }else if(state==='HELD'&&wrong){reset();}
  prev=p;
 }
 if(state!=='HELD'||!held)return null;
 const current=confirmedBars.filter(b=>b.ts+THREE<=now).at(-1);
 if(current&&d*(current.close-level)<-tol*.35)return null;
 return {state:'DEFENDED',level:rounded(level),crossedAt:crossed,
   extendedAt:extended,retestAt:touched,heldAt:held,
   observedThrough:current?current.ts+THREE:null,
   tolerance:rounded(tol),availableAt:held,
   evidence:'Cross+extension+retest+hold; reset on meaningful loss'};
}
function mapPlace({now,price,dir,bars3,bars15,levels,median3,base}){
 const d=side(dir),scale=median3||65,c3=bars(bars3,now,THREE),c15=bars(bars15,now,FIFTEEN);
 const candidates=[],context=[],pad=Math.max(12,scale*.14),minMove=Math.max(36,scale*.8);
 const add=(anchor,weight='OBSERVED')=>{
  if(!anchor||number(anchor.price)===null||!d||d*(price-anchor.price)<=0)return;
  const stop=rounded(anchor.price-d*pad),dist=rounded(d*(price-stop));
  if(dist<=0||dist>=500)return;
  candidates.push({...anchor,stop,distanceUsd:dist,weight});
 };
 const swings=previous.localSwings(c3,dir,55);
 swings.slice(-14).forEach(x=>add(x,'OBSERVED_SWING'));
 const recent15=c15.slice(-6);
 if(recent15.length){
  const pivot=recent15.reduce((a,b)=>!a||(d===1?b.low<a.low:b.high>a.high)?b:a,null);
  if(pivot)add({price:d===1?pivot.low:pivot.high,
    key:d===1?'CONFIRMED_15M_LOW':'CONFIRMED_15M_HIGH',
    kind:'CONFIRMED_15M_EXTREME',sourceTs:pivot.ts,availableAt:pivot.ts+FIFTEEN},'CONFIRMED_MCB15');
 }
 const mapped=(levels||[]).filter(x=>number(x.price)!==null);
 for(const x of mapped){
  const key=String(x.token||x.label||'MAPPED').toUpperCase();
  const lev=number(x.price);
  context.push({key,price:lev,source:'MAPPED',confidence:'HYPOTHETICAL_UNTIL_DEFENDED'});
  // Mapping is informative only; it cannot VETO the trade or create a stop.
  const defend=retestCausal(c3.slice(-55),lev,dir,scale,now);
  if(defend)add({key:'DEFENDED_'+key,price:lev,kind:'DEFENDED_LEVEL',
    availableAt:defend.availableAt,acceptance:defend},'OBSERVED_DEFENCE');
 }
 // No false support from an ancient local HIGH: it must be causally defended.
 const oppositePivots=previous.localSwings(c3,opposite(dir),55).slice(-12);
 for(const x of oppositePivots){
  const after=c3.filter(b=>b.ts+THREE>=x.availableAt).slice(-55);
  const defended=retestCausal(after,x.price,dir,scale,now);
  if(defended)add({key:dir==='long'?'DEFENDED_PREVIOUS_HIGH':'DEFENDED_PREVIOUS_LOW',
    price:x.price,kind:'DEFENDED_RECLAIM',sourceTs:x.sourceTs,
    availableAt:defended.availableAt,acceptance:defended},'OBSERVED_DEFENCE');
 }
 const good=candidates.filter(x=>x.distanceUsd>=minMove&&x.availableAt<=now)
   .sort((a,b)=>a.distanceUsd-b.distanceUsd);
 // Defended levels on the profitable side are qualitative hurdles, not vetoes.
 const nearestContext=context.filter(x=>d*(x.price-price)>0)
   .sort((a,b)=>Math.abs(a.price-price)-Math.abs(b.price-price))[0]||null;
 return {anchor:good[0]||null,invalidation:good[0]?{
   price:good[0].stop,reference:good[0].key,
   kind:good[0].kind,confirmedAvailableAt:good[0].availableAt,
   sourceTs:good[0].sourceTs||null,distanceUsd:good[0].distanceUsd,
   underlyingLevel:rounded(good[0].price),
   acceptedRetest:good[0].acceptance||null}:null,
  nearestContext,contextCount:context.length,validAnchors:good.length,
  volatilityMin:rounded(minMove),
  source:good[0]?.weight||'NONE',
  notes:'Mapped boundaries are contextual; stop is derived only from observed structural support/resistance'};
}
module.exports={MIN,THREE,FIFTEEN,number,rounded,side,opposite,bars,
 native15,retestCausal,mapPlace};
