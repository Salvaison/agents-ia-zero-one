'use strict';
const fs=require('fs');
const path=require('path');
const readline=require('readline');

const ROOT=path.join(__dirname,'..');
const DATA=path.join(ROOT,'data');
const OUT=path.join(DATA,'replays','wave-replay-2026-10-02-six-losses.json');
const START=Date.parse('2026-10-02T08:45:00.000Z');
const END=Date.parse('2026-10-02T14:30:00.000Z');

function readJson(p,fallback){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(_){return fallback;}}
function finite(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));}
async function readNdjsonWindow(prefix,start,end){
  const files=fs.readdirSync(DATA).filter(f=>f.startsWith(prefix)&&f.endsWith('.ndjson')).sort();
  const out=[];
  for(const f of files){
    const rl=readline.createInterface({input:fs.createReadStream(path.join(DATA,f)),crlfDelay:Infinity});
    for await(const line of rl){
      if(!line.trim())continue;
      let r;try{r=JSON.parse(line);}catch(_){continue;}
      const t=Date.parse(r.ts||r.timestamp||'');
      if(Number.isFinite(t)&&t>=start-60000&&t<=end+60000)out.push(r);
    }
  }
  out.sort((a,b)=>Date.parse(a.ts)-Date.parse(b.ts));
  return out;
}
function nearest(rows,ts,maxMs=45000){
  if(!rows.length)return null;
  let lo=0,hi=rows.length-1;
  while(lo<hi){const m=Math.floor((lo+hi)/2);if(Date.parse(rows[m].ts)<ts)lo=m+1;else hi=m;}
  const c=[rows[lo],rows[Math.max(0,lo-1)]].filter(Boolean);
  let best=null,bd=Infinity;
  for(const r of c){const d=Math.abs(Date.parse(r.ts)-ts);if(d<bd){bd=d;best=r;}}
  return bd<=maxMs?best:null;
}
function compactEval(r){
  if(!r)return null;
  const c=r.mcb&&r.mcb.currentLobe||{},n=r.mcb&&r.mcb.nested3m||{},tr=r.translation||{},tk=r.ticker||{},th=r.thesis||{},a=r.action||{},p=r.position||null;
  return {
    ts:r.ts,price:r.price,
    position:p?{direction:p.direction,entryPrice:p.entryPrice,entryTimestamp:p.entryTimestamp,metrics:p.metrics||null}:null,
    thesis:{state:th.state||null,direction:th.direction||null,mode:th.mode||null,reason:th.reason||null},
    mcb15:{type:c.type||null,currentLbw:c.currentLbw??null,extremeLbw:c.extremeLbw??null,recoveryFraction:c.recoveryFraction??null,maturity:c.maturity||null,e15Class:c.e15Class||null},
    mcb3:{currentLbw:n.currentLbw??null,extremeLbw:n.extremeLbw??null,recoveryFraction:n.recoveryFraction??null,slopeLbw:n.slopeLbw??null,turningDirection:n.turningDirection||null},
    pm:{status:tr.status||null,direction:tr.direction||null,move:(tr.pmLive&&tr.pmLive.priceMoveUsd)??null,net3m:(tr.horizons&&tr.horizons.net3mUsd)??null,gross3m:(tr.horizons&&tr.horizons.gross3mUsd)??null,eff3m:(tr.horizons&&tr.horizons.efficiency3m)??null},
    ticker:{status:tk.status||null,direction:tk.direction||null,confirmed:!!tk.confirmed,yieldVsP75:(tk.current&&tk.current.yieldVsP75)??null,effortVsP75:(tk.current&&tk.current.effortVsP75)??null,alignedLast4:(tk.persistence&&tk.persistence.alignedLast4)??null,terrain:(tk.persistence&&tk.persistence.terrainRetainedFraction)??null},
    action:{type:a.type||null,direction:a.direction||null,stage:a.stage||null,reason:a.reason||null},
    contextStatus:r.context&&r.context.status||null
  };
}
function frameFromAudit(r,state){
  return {
    ts:Number(r.ts),
    price:finite(r.lastPrice)?Number(r.lastPrice):null,
    wave3:{
      bw:finite(r.liveBw)?Number(r.liveBw):null,
      lbw:finite(r.liveLbw)?Number(r.liveLbw):null,
      mf:finite(r.liveMoneyFlow)?Number(r.liveMoneyFlow):null,
      vwap:finite(r.vwapLive)?Number(r.vwapLive):null,
      up:finite(r.liveSignalUp)?Number(r.liveSignalUp):null,
      dn:finite(r.liveSignalDn)?Number(r.liveSignalDn):null
    },
    wave15:{
      bw:finite(r.live15BwRaw)?Number(r.live15BwRaw):null,
      lbw:finite(r.live15LbwRaw)?Number(r.live15LbwRaw):null,
      mf:finite(r.live15MfRaw)?Number(r.live15MfRaw):null,
      vwap:finite(r.live15Vwap)?Number(r.live15Vwap):null,
      up:finite(r.live15SignalUp)?Number(r.live15SignalUp):null,
      dn:finite(r.live15SignalDn)?Number(r.live15SignalDn):null,
      confirmed:{
        bw:finite(r.live15Bw)?Number(r.live15Bw):null,
        lbw:finite(r.live15Lbw)?Number(r.live15Lbw):null,
        mf:finite(r.live15MoneyFlow)?Number(r.live15MoneyFlow):null
      }
    },
    audit:{
      priceMove:finite(r.priceMove)?Number(r.priceMove):null,
      cadence:finite(r.cadence)?Number(r.cadence):null,
      volumeFenetreBtc:finite(r.volumeFenetreBtc)?Number(r.volumeFenetreBtc):null,
      winSec:finite(r.winSec)?Number(r.winSec):null,
      mf15Pente:finite(r.mf15Pente)?Number(r.mf15Pente):null,
      vwap3Confirmed:finite(r.vwap3)?Number(r.vwap3):null,
      vwap15Confirmed:finite(r.vwap15)?Number(r.vwap15):null
    },
    state:compactEval(state)
  };
}
(async()=>{
  const audit=readJson(path.join(DATA,'audit-history.json'),[]).filter(r=>Number(r.ts)>=START&&Number(r.ts)<=END);
  const evals=await readNdjsonWindow('trade-sim-v4-evaluations',START,END);
  const history=readJson(path.join(DATA,'trade-sim-v4-history.json'),[]);
  const state=readJson(path.join(DATA,'trade-sim-v4-state.json'),{});
  const frames=audit.map(r=>frameFromAudit(r,nearest(evals,Number(r.ts))));
  const events=[];
  (Array.isArray(history)?history:[]).forEach((t,i)=>{
    const n=i+1;
    const en=Date.parse(t.entryTimestamp),ex=Date.parse(t.exitTimestamp);
    if(en>=START&&en<=END)events.push({ts:en,type:'ENTER',trade:n,direction:t.direction,price:t.entryPrice,label:'#'+n+' IN'});
    if(ex>=START&&ex<=END)events.push({ts:ex,type:'EXIT',trade:n,direction:t.direction,price:t.exitPrice,label:'#'+n+' OUT',exitKind:t.exitKind,pnlPercentLeveraged:t.pnlPercentLeveraged});
  });
  const open=state.modules&&state.modules.day;
  if(open){
    const en=Date.parse(open.entryTimestamp);
    if(en>=START&&en<=END&&!events.some(e=>e.type==='ENTER'&&Math.abs(e.ts-en)<1000)){
      events.push({ts:en,type:'ENTER',trade:(Array.isArray(history)?history.length:0)+1,direction:open.direction,price:open.entryPrice,label:'#'+((Array.isArray(history)?history.length:0)+1)+' IN (open)'});
    }
  }
  events.sort((a,b)=>a.ts-b.ts);
  const out={
    version:'wave-replay-mock-0.1',
    generatedAt:new Date().toISOString(),
    period:{start:new Date(START).toISOString(),end:new Date(END).toISOString(),label:'Six pertes consecutives puis short #16 — 02/10/2026'},
    sampling:{auditSeconds:30,source:'audit-history.json snapshot',frames:frames.length},
    sourceContract:{
      wave3:'audit live intra-bougie: liveBw/liveLbw/liveMoneyFlow/vwapLive/liveSignalUp/liveSignalDn',
      wave15:'audit live intra-bougie: live15BwRaw/live15LbwRaw/live15MfRaw/live15Vwap/live15SignalUp/live15SignalDn',
      wave15Confirmed:'audit confirme: live15Bw/live15Lbw/live15MoneyFlow',
      state:'nearest V4 evaluation within 45s; compact diagnostic only',
      tradingImpact:false
    },
    events,frames
  };
  fs.writeFileSync(OUT,JSON.stringify(out));
  console.log(JSON.stringify({out,frames:frames.length,evals:evals.length,events:events.length,bytes:fs.statSync(OUT).size,first:frames[0]&&new Date(frames[0].ts).toISOString(),last:frames.at(-1)&&new Date(frames.at(-1).ts).toISOString()},null,2));
})();
