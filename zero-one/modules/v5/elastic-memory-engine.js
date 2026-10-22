'use strict';
// BOONO V5 experimental memory. Observation only: no orders, no strategy authority.
const VERSION='v5-elastic-causal-shadow-v0.1',M3=180000,M15=900000;
const num=x=>x===undefined||x===null||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const sign=x=>x>0?'long':x<0?'short':null;
const cut=(a,n)=>a.length>n?a.slice(-n):a;
const productive=new Set(['POWERFUL','EASY','PRODUCTIVE','EXCEPTIONAL']);
function empty(){return {version:VERSION,decisionImpact:false,lastSampleTs:0,lastEventId:0,
 anchor:{confirmed:null,live:null},threads:[],lineageEdges:[],events:[],lastQuality:null,samples:[],
 observation:null,hour:null,counts:{samples:0,events:0,linked:0,missing:0},
 warnings:['SHADOW_ONLY','NO_TRADING_PERMISSIONS','NATIVE_AND_CROSS_ARE_LINKED']};}
const init=x=>x&&x.version===VERSION?x:empty();
function threadFor(s,anchor,kind){
 if(!anchor)return null;
 const id=(anchor.direction||'unknown')+'|E15:'+anchor.sourceTs;
 let t=s.threads.find(v=>v.id===id);
 if(!t){t={id,direction:anchor.direction,anchor,originKind:kind,firstSeenAt:anchor.observedAt,
  attempts:[],events:[],priceStart:null,priceLast:null,priceHigh:null,priceLow:null,
  status:kind==='E15_CONFIRMED'?'OBSERVED_STRUCTURAL':'PROVISIONAL',
  interpretation:'UNVALIDATED_CAUSAL_CLUSTER'};s.threads.push(t);s.threads=cut(s.threads,36);}
 if(kind==='E15_CONFIRMED')t.status='OBSERVED_STRUCTURAL';
 return t;
}
function processEvent(s,e){
 if(!e||!Number.isSafeInteger(e.id)||e.id<=s.lastEventId)return null;
 const at=num(e.observedAt),source=num(e.sourceTs);
 if(at===null||(source!==null&&source>at+M15))return null;
 s.lastEventId=e.id;s.counts.events++;
 if(e.family==='CONVERSION'){
  const v=typeof e.current==='string'?{quality:e.current}:e.current||{},d=e.detail||{};
  if(v.quality&&['TRANSITION','RESTORED','CONFIRMED'].includes(e.type))
   s.lastQuality={at,quality:v.quality,direction:v.direction||e.direction||null,
    pm3:num(d.pm3)??(s.lastQuality?.pm3??null),
    pm5:num(d.pm5)??(s.lastQuality?.pm5??null),
    pmLive:num(d.pmLive)??(s.lastQuality?.pmLive??null),
    yieldVsP75:num(d.yieldVsP75)??(s.lastQuality?.yieldVsP75??null),
    effortVsP75:num(d.effortVsP75)??(s.lastQuality?.effortVsP75??null)};
  return {type:'QUALITY_CHANGE',at,id:e.id};
 }
 const tf=e.family==='MCB15'?'15m':e.family==='MCB3'?'3m':null;
 if(!tf)return null;
 const native=e.key==='E15'||e.key==='E3';
 const cross=/CROSS/.test(e.key||'');
 if(!native&&!cross)return null;
 const v=e.current&&typeof e.current==='object'?e.current:{};
 let dir=e.direction||(v.type==='UP'?'long':v.type==='DN'?'short':null);
 if(cross&&!dir)dir=v.event==='BW_CROSSES_ABOVE_LBW'?'short':
    v.event==='BW_CROSSES_BELOW_LBW'?'long':null;
 const src=num(v.sourceTs)??source??at;
 const event={id:e.id,at,sourceTs:src,tf,kind:native?'NATIVE':'CROSS',
  status:e.type,direction:dir,price:num(e.price),parent:null,linkedTo:null,
  independentVote:!cross};
 if(tf==='15m'&&native){
  if(e.type==='OBSERVED'&&dir)
   s.anchor.live={sourceTs:src,direction:dir,observedAt:at,eventId:e.id};
  else if(e.type==='INTERRUPTED')s.anchor.live=null;
  else if(e.type==='CONFIRMED'&&dir){
   const a={sourceTs:src,direction:dir,observedAt:at,eventId:e.id};
   const prev=s.anchor.confirmed;
   s.anchor.confirmed=a;s.anchor.live=null;threadFor(s,a,'E15_CONFIRMED');
   if(prev&&(prev.direction!==dir||prev.sourceTs!==src)){
     const prevId=prev.direction+'|E15:'+prev.sourceTs,toId=dir+'|E15:'+src;
     const earlier=s.threads.find(x=>x.id===prevId);
     s.lineageEdges=cut([...s.lineageEdges,{from:prevId,to:toId,at,
       relation:prev.direction===dir?'REPEATED_E15_DIRECTION':'OPPOSING_E15_TEST',
       priceFrom:earlier&&earlier.priceLast||null,priceAt:num(e.price),
       membership:'UNRESOLVED_CANDIDATE',
       note:'Adjacent E15 anchors are related; this is NOT proof of a new strategic campaign'}],100);
   }
  }
 }
 // The 3m is subordinate to a preceding 15m anchor, never independently
 // entitled to manufacture a strategic trend; provisional 15m is labelled.
 const a=s.anchor.confirmed||s.anchor.live;
 const t=threadFor(s,a,s.anchor.confirmed?'E15_CONFIRMED':'E15_LIVE');
 if(t){
  event.parent=t.id;
  const related=[...t.events].reverse().find(x=>x.tf===tf&&x.kind!==event.kind&&
     Math.abs(x.at-at)<(tf==='3m'?M3:M15));
  if(related&&(cross||related.kind==='CROSS')){
   if(cross){event.linkedTo=related.id;event.independentVote=false;}
   else {related.linkedTo=event.id;related.independentVote=false;}
   s.counts.linked++;
  }
  t.events=cut([...t.events,event],100);
  if(tf==='3m'&&native&&dir&&['OBSERVED','CONFIRMED'].includes(e.type)){
   const key=dir+'|'+src;
   let x=t.attempts.find(z=>z.id===key);
   if(!x){x={id:key,direction:dir,againstAnchor:dir!==t.direction,
      firstSeenAt:at,confirmedAt:null,interrupted:false,outcome:'UNRESOLVED',
      classification:dir===t.direction?'ALIGNED_TEST':'COUNTER_TEST'};
    t.attempts=cut([...t.attempts,x],40);}
   if(e.type==='CONFIRMED')x.confirmedAt=at;
  }
  if(tf==='3m'&&native&&e.type==='INTERRUPTED'){
   const x=t.attempts.find(z=>z.id===dir+'|'+src);
   if(x)x.interrupted=true;
  }
 }
 s.events=cut([...s.events,event],160);
 return event;
}
function slot(rows,from,to){
 const a=rows.filter(s=>s.ts>=from&&s.ts<to),qualities={},dirs={long:0,short:0,contested:0};
 let prod=0,ineff=0,qualityValid=0;const ys=[],es=[],ps=[];
 for(const r of a){
  qualities[r.quality]=(qualities[r.quality]||0)+1;
  const side=r.qualityDirection||'contested';dirs[side]=(dirs[side]||0)+1;
  if(r.quality!=='UNKNOWN')qualityValid++;
  if(productive.has(r.quality))prod++;
  if(['INEFFICIENT','EXHAUSTED','ABSORBED'].includes(r.quality))ineff++;
  if(num(r.yieldVsP75)!==null)ys.push(r.yieldVsP75);
  if(num(r.effortVsP75)!==null)es.push(r.effortVsP75);
  ps.push(r.price);
 }
 const avg=a=>a.length?Math.round(a.reduce((s,x)=>s+x,0)*1000/a.length)/1000:null;
 return {from,to,count:a.length,coverage:Math.min(1,Math.round(a.length/30*100)/100),
  qualityShare:Object.fromEntries(Object.entries(qualities).map(([k,v])=>[k,Math.round(v/Math.max(a.length,1)*100)/100])),
  directions:dirs,productiveShare:a.length?prod/a.length:null,
  inefficientShare:a.length?ineff/a.length:null,qualityCoverage:a.length?qualityValid/a.length:0,
  meanYieldVsP75:avg(ys),meanEffortVsP75:avg(es),
  price:ps.length>1?{netUsd:Math.round((ps.at(-1)-ps[0])*10)/10,
   high:Math.max(...ps),low:Math.min(...ps),start:ps[0],end:ps.at(-1)}:null};
}
function hourly(s,ts){
 const current=Math.floor(ts/M15)*M15,buckets=[];
 for(let i=3;i>=0;i--)buckets.push(slot(s.samples,current-i*M15,current-(i-1)*M15));
 const total={long:0,short:0,contested:0};
 for(const b of buckets)for(const [k,v] of Object.entries(b.directions))total[k]+=v;
 const all=Object.values(total).reduce((a,b)=>a+b,0),net=total.long-total.short;
 return {buckets,coverage:Math.round(Math.min(1,all/120)*100)/100,
  distribution:total,observedBias:all&&Math.abs(net)/all>.5?sign(net):null,
  classification:'DESCRIPTIVE_ONLY',note:'4 x 15m, last bar partial; no duplicated tick volume'};
}
function step(old,sample,events){
 const s=init(old),ts=num(sample&&sample.ts);
 if(ts===null||ts<=s.lastSampleTs)return {state:s,changed:false,reason:'DUPLICATE'};
 if(num(sample.price)===null||num(sample.lbw15)===null||num(sample.lbw3)===null){
  s.counts.missing++;return {state:s,changed:false,reason:'MISSING_PRICE_OR_MCB'};
 }
 let significant=0;
 for(const e of (events||[]).sort((a,b)=>a.observedAt-b.observedAt||a.id-b.id)){
  if(e.observedAt>ts)break;
  if(processEvent(s,e))significant++;
 }
 const q=s.lastQuality&&ts-s.lastQuality.at<=6*60000?s.lastQuality:null;
 const obs={ts,price:sample.price,lbw3:sample.lbw3,lbw15:sample.lbw15,
  mf3:num(sample.mf3),mf15:num(sample.mf15),mf15Slope:num(sample.mf15Slope),
  pmLive:num(sample.pmLive),quality:q&&q.quality||'UNKNOWN',
  qualityDirection:q&&q.direction||null,
  yieldVsP75:q&&q.yieldVsP75,effortVsP75:q&&q.effortVsP75,
  pm3:q&&q.pm3,pm5:q&&q.pm5};
 s.samples=cut([...s.samples,obs],130);s.lastSampleTs=ts;s.counts.samples++;
 s.observation=obs;s.hour=hourly(s,ts);
 const a=s.anchor.confirmed,t=a&&s.threads.find(x=>x.id===a.direction+'|E15:'+a.sourceTs);
 if(t){t.priceStart??=obs.price;t.priceLast=obs.price;
  t.priceHigh=t.priceHigh===null?obs.price:Math.max(obs.price,t.priceHigh);
  t.priceLow=t.priceLow===null?obs.price:Math.min(obs.price,t.priceLow);}
 return {state:s,changed:true,significant,
   compact:{ts,price:obs.price,quality:obs.quality,qualityDirection:obs.qualityDirection,
    priceNet3m:obs.pm3,pmLive:obs.pmLive,threadId:t&&t.id||null,
    e15:s.anchor.confirmed&&s.anchor.confirmed.direction||null,
    e15Live:s.anchor.live&&s.anchor.live.direction||null,
    hourCoverage:s.hour.coverage,hourBias:s.hour.observedBias,decisionImpact:false}};
}
module.exports={VERSION,empty,init,processEvent,step,hourly,slot};
