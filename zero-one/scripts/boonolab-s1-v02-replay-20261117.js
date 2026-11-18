'use strict';
// Retrospective AS-OF replay for V543 #272 -> #273 (17 Nov 2026).
// Read-only, NO modifications to S1's real prospective state.
// Event-time V543 decision logs are observed snapshots; future price not used.
const fs=require('node:fs'),path=require('node:path');
const v01=require('../modules/attention/v543-lbw15-s1');
const m=require('../modules/attention/v543-lbw15-s1-v02');
const ROOT=path.resolve(__dirname,'..'),DATA=path.join(ROOT,'data');
const DAY='2026-11-17';
const utc=(h,min)=>Date.parse(DAY+'T'+String(h).padStart(2,'0')+':'+String(min).padStart(2,'0')+':00+01:00');
const start=utc(15,0),end=utc(19,0);
const files=fs.readdirSync(DATA).filter(x=>
 /^v52-paper-decisions(?:\.segment-.*)?\.ndjson$/.test(x)).sort();
const input=[];
for(const file of files){
 const buf=fs.readFileSync(path.join(DATA,file),'utf8');
 for(const ln of buf.split('\n')){
  if(!ln)continue;
  try{
   const d=JSON.parse(ln);
   if(d.ts<start-15*60000||d.ts>end)continue;
   const s=v01.sample(d);
   if(s)input.push(s);
  }catch(_){}
 }
}
input.sort((a,b)=>a.at-b.at);
const unique=[...new Map(input.map(x=>[x.at,x])).values()]
 .sort((a,b)=>a.at-b.at);
const paper=JSON.parse(fs.readFileSync(path.join(DATA,'v52-paper-state.json'),'utf8'));
const positions=paper.history.filter(x=>[272,273].includes(x.tradeNo));
const fmt=t=>new Date(t).toLocaleTimeString('fr-FR',
 {timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',second:'2-digit'});
const results=[];
const st=m.initial(start);
for(let i=0;i<unique.length;i++){
 const cur=unique[i];
 if(cur.at<start)continue;
 const hist=unique.slice(Math.max(0,i-120),i).filter(x=>x.at>=cur.at-4*3600000);
 const h=positions.find(x=>x.entryAt<=cur.at&&x.exitAt>=cur.at);
 const position=h?{direction:h.direction,entryAt:h.entryAt,entryPrice:h.entryPrice,
  // Real as-of MFE estimated only from observations up to NOW
  mfePriceUsd:Math.max(0,...unique.slice(0,i+1)
   .filter(x=>x.at>=h.entryAt&&x.at<=cur.at)
   .map(x=>(x.price-h.entryPrice)*(h.direction==='long'?1:-1)))}:null;
 const r=m.observe(st,cur,{position,history:hist});
 if(r.changed&&r.transitions.length){
  results.push(...r.transitions.map(x=>({...x,price:cur.price,
   actualTrade:position?.entryAt||null,
   perspectives:r.view.references})));
 }
}
const transitions=results.map(x=>({
 at:fmt(x.at),type:x.type,from:x.from,to:x.to,
 parent:x.parentId,price:x.price,reason:x.reason||x.transitionStatus||null,
 parentAgainst:x.perspectives.parent.opposedFamilies,
 parentFor:x.perspectives.parent.alignedFamilies,
 positionAgainst:x.perspectives.position?.opposedFamilies||[],
 candidate:x.perspectives.candidate?.direction||null,
 position:x.perspectives.position?.direction||null
}));
console.log(JSON.stringify({replay:'AS_OF_DECISION_LOGS_READONLY_NO_FUTURE_SIGNALS',
 sourceFiles:files.length,observations:unique.length,
 window:'2026-11-17 15:00-19:00 Europe/Stockholm',
 trades:positions.map(x=>({tradeNo:x.tradeNo,direction:x.direction,
  entryAt:fmt(x.entryAt),exitAt:fmt(x.exitAt),entryPrice:x.entryPrice,
  exitPrice:x.exitPrice,netPnlUsd:x.netPnlUsd})),
 transitions,final:{
  campaign:st.current?.parentId,phase:st.current?.phase,
  counterattacks:st.current?.counterattacks,resumptions:st.current?.resumptions,
  archived:st.archives.map(x=>({parent:x.parentId,from:fmt(x.startedAt),
   until:fmt(x.endedAt),counterattacks:x.counterattacks,
   resumptions:x.resumptions,phase:x.phase}))
 }},null,2));
