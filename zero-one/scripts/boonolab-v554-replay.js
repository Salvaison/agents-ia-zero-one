'use strict';
// Replays in memory on Bâton 30s. No writes to live accounts.
// All variants see identical sampled prices and closed-bar availability proxies.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const R=require('../modules/attention/boonolab-trajectory-shadow-runner'),M=require('../modules/v554/market'),
 A=require('../modules/v554/account'),D=require('../modules/v554/decision'),L=require('../modules/v553/decision'),
 LS=require('../modules/v553/source'),C=require('../modules/v554/runner').CONFIGS;
const DATA=path.resolve(__dirname,'../data'),MCB=path.resolve(DATA,'../../data/mcb-live');
const START=Date.parse('2026-11-20T16:00:00+01:00'),BEGIN=Date.parse('2026-11-21T00:00:00+01:00'),
 CUT=Date.parse('2026-11-26T14:30:00+01:00'),END=Date.parse('2026-11-28T15:52:00+01:00');
const byTs=new Map();
for(const n of fs.readdirSync(path.join(DATA,'audit-14d')).filter(n=>/^audit-2026112[012345678]T.*\.ndjson(\.gz)?$/.test(n)).sort()){
 const b=fs.readFileSync(path.join(DATA,'audit-14d',n)),txt=n.endsWith('.gz')?zlib.gunzipSync(b).toString():b.toString();
 for(const l of txt.split('\n'))try{const x=JSON.parse(l);if(x.ts>=START&&x.ts<=END)byTs.set(x.ts,x);}catch{}
}
const rows=R.sortedAudit([...byTs.values()],END);
if(rows.length<500)throw Error('V554_REPLAY_NO_COVERAGE');
const bars={},legacyBars={};
for(const [tf,k] of [['3m','m3'],['15m','m15'],['1h','h1'],['4h','h4']]){
 const txt=fs.readFileSync(path.join(MCB,'mcb_'+tf+'.csv'),'utf8');
 bars[tf]=R.parseBars(txt,tf).filter(x=>x.closeAt<=END&&x.closeAt>=START-7*86400000);
 const ma=new Map();for(const l of txt.split('\n')){const x=l.split(','),t=Date.parse(x[0]);if(Number.isFinite(t))ma.set(t,LS.val(x[12]));}
 legacyBars[k]=bars[tf].map(x=>({ts:x.sourceAt,open:null,high:x.high,low:x.low,close:x.price,lbw:x.L,bw:x.B,mf:x.mf,ma200:ma.get(x.sourceAt)??null,nativeUp:x.direction==='UP'?x.L:null,nativeDn:x.direction==='DN'?x.L:null,knownAt:x.closeAt}));
}
const tk=new Map();
for(const n of fs.readdirSync(DATA).filter(n=>/^boonolab-ticker4x15-samples.*\.ndjson$/.test(n))){
 for(const l of fs.readFileSync(path.join(DATA,n),'utf8').split('\n'))try{const x=JSON.parse(l);if(x.at>=START&&x.at<=END)tk.set(x.at,x);}catch{}
}
const ticker=[...tk.values()].sort((a,b)=>a.at-b.at);let ti=0;
const market=M.initial(START),accounts=Object.fromEntries(Object.keys(C).map(k=>[k,A.initial(BEGIN)]));
const trades=Object.fromEntries(Object.keys(C).map(k=>[k,[]])),reasons={},stateCounts={},samples=[];
const old={memory:L.originalMemory(BEGIN-1),position:null,lastExit:null,used:new Set(),trades:[],equity:1000};
function legacyStep(input,ts,price){
 const q=L.evaluate(old.memory,input,price,ts,old.position).decision;
 if(old.position){
  const p=old.position,k=p.direction==='long'?1:-1,move=k*(price-p.entryPrice);p.mfePriceUsd=Math.max(p.mfePriceUsd,move);
  if(move<=-500||(input.healthy&&q.action==='EXIT_'+p.direction.toUpperCase())){
   const gross=move*1500/p.entryPrice,fees=.75+.75*price/p.entryPrice,net=gross-fees;
   const tr={direction:p.direction,entryAt:p.entryAt,exitAt:ts,entryPrice:p.entryPrice,exitPrice:price,netPnlUsd:net,mfePriceUsd:p.mfePriceUsd,feesUsd:fees,exitReason:move<=-500?'HARD_RISK':q.reason};
   old.trades.push(tr);old.equity+=net;old.lastExit={at:ts,price,direction:p.direction,netPnlUsd:net};
   old.memory.lastExit={...old.lastExit};old.memory.opportunity=null;old.memory.threat=null;old.memory.lastPositionEntryAt=null;old.position=null;
  }
 }else if(input.healthy&&old.equity>0&&q.action.startsWith('ENTER_')&&q.market?.admissionAllowed&&q.opportunity?.confirmations>=2&&q.opportunity.startedAt>(old.lastExit?.at||0)&&!old.used.has(q.opportunity.id)){
  old.used.add(q.opportunity.id);old.position={direction:q.opportunity.direction,entryAt:ts,entryPrice:price,mfePriceUsd:0,entryContext:q.qualification};
  old.memory.opportunity=null;
 }
}
const prefix=[],inds=Object.fromEntries(Object.keys(legacyBars).map(k=>[k,0]));let n=0,gaps=0,prev=null;
for(const row of rows){
 const ts=row.ts;if(prev&&ts-prev>95000)gaps++;prev=ts;
 while(ti+1<ticker.length&&ticker[ti+1].at<=ts)ti++;
 const t=ticker[ti]?.at<=ts?ticker[ti]:null;
 const m=M.observe(market,row,bars,ts,t,'HISTORICAL_REPLAY_CLOSE_PROXY');
 prefix.push(row);if(prefix.length>1000)prefix.shift();
 const b={};
 for(const [k,arr] of Object.entries(legacyBars)){
  while(inds[k]<arr.length&&arr[inds[k]].knownAt<=ts)inds[k]++;
  b[k]=arr.slice(Math.max(0,inds[k]-150),inds[k]);
 }
 const health=LS.confirmedHealth(b,ts),healthy=health.valid&&b.m3.length>=8&&b.m15.length>=5;
 if(!m||ts<BEGIN)continue;
 n++;
 for(const [k,config] of Object.entries(C)){
  const o=A.step(accounts[k],m,{ts,price:row.lastPrice,fresh:true,healthy,bars,...config});
  if(o.trade)trades[k].push(o.trade);
  if(k==='TRAJECTORY')reasons[o.decision.reason]=(reasons[o.decision.reason]||0)+1;
 }
 legacyStep({asOf:ts,healthy,current:row,samples:prefix,bars:b,confirmedHealth:health,source:'HISTORICAL_REPLAY_CLOSE_PROXY'},ts,row.lastPrice);
 for(const h of Object.values(m.hypotheses))stateCounts[h.state]=(stateCounts[h.state]||0)+1;
 if(n%10===0)samples.push({at:ts,price:m.price,suspension:!!m.suspension,hypotheses:Object.fromEntries(Object.entries(m.hypotheses).map(([d,h])=>[d,{state:h.state,reason:h.reason,initiative:h.initiativeId,crossAge:h.crossAgeMin,travel:h.crossTravel,hi:h.higher1h.state,eligible:h.eligible}]))});
}
trades.V553_APPROX=old.trades;
function stats(q){const sum=k=>q.reduce((a,x)=>a+(x[k]||0),0);return {n:q.length,wins:q.filter(x=>x.netPnlUsd>0).length,net:+sum('netPnlUsd').toFixed(2),fees:+sum('feesUsd').toFixed(2)};}
const report={version:D.VERSION,mode:'HISTORICAL_REPLAY_CLOSE_PROXY',start:BEGIN,end:END,cut:CUT,observations:n,gaps,
 stats:Object.fromEntries(Object.entries(trades).map(([k,q])=>[k,{all:stats(q),prior:stats(q.filter(x=>x.exitAt<CUT)),recent:stats(q.filter(x=>x.exitAt>=CUT))}])),
 positions:Object.fromEntries([...Object.entries(accounts).map(([k,a])=>[k,a.position]),['V553_APPROX',old.position]]),trades,stateCounts,reasons,samples,
 caveats:['30s sampled price, not exact public tick fills; close-time proxy; no slippage or funding','Legacy baseline approximate: same source & simulated fee/hard risk; no active ledger used','All variants start flat at same time; retrospective tuning, not prospective proof']};
const out=process.argv[2]||'/tmp/boonolab-v554-replay.json';fs.writeFileSync(out,JSON.stringify(report));
console.log(JSON.stringify({observations:n,gaps,stats:report.stats,stateCounts,reasons,positions:Object.fromEntries(Object.entries(report.positions).map(([k,p])=>[k,p?{direction:p.direction,entryAt:p.entryAt,entryPrice:p.entryPrice}:null])),
 top:trades.TRAJECTORY.slice().sort((a,b)=>b.netPnlUsd-a.netPnlUsd).slice(0,6).map(x=>({entryAt:x.entryAt,exitAt:x.exitAt,direction:x.direction,net:x.netPnlUsd,mfe:x.mfePriceUsd,reason:x.entryContext.reason,exit:x.exitReason}))},null,2));
