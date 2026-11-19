'use strict';
// V552 research: actual V551 historical positions, as-of Audit & CLOSED 15m,
// no future signal injected, no speculative fills attributed to PAPER.
const fs=require('fs'),path=require('path');
const S=require('../modules/v552/source');
const D=require('../modules/v552/decision');
const V=require('../modules/v552/vigilance');
const ROOT=path.resolve(__dirname,'..');
const audit=JSON.parse(fs.readFileSync(path.join(ROOT,'data/audit-history.json'),'utf8'));
const ledger=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v551-paper-state.json'),'utf8'));
const bars=S.load(Date.now()).bars;
const fmt=t=>new Date(t).toLocaleTimeString('fr-FR',{
 timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
const results=[];
for(const t of ledger.history.filter(t=>t.tradeNo<=12)){
 const mem=V.initial(),owner=t.direction,sgn=owner==='long'?1:-1;
 let runningMfe=0,firstReview=null,firstExit=null,firstClosed=null;
 const obs=audit.filter(x=>x.ts>=t.entryAt-180000&&x.ts<t.exitAt);
 for(const row of obs){
  const at=row.ts,b={};
  for(const [tf,ms] of Object.entries(S.PERIOD))
   b[tf]=bars[tf].filter(x=>x.ts+ms<=at);
  const o=D.sensor({asOf:at,samples:audit,current:row,bars:b,healthy:true,
   source:'REPLAY_CLOSED_ASOF'},at,row.lastPrice);
  if(at>=t.entryAt)runningMfe=Math.max(runningMfe,sgn*(row.lastPrice-t.entryPrice));
  const pos=at>=t.entryAt?{direction:owner,entryAt:t.entryAt,
   entryPrice:t.entryPrice,mfePriceUsd:runningMfe}:null;
  const att=V.assess(o,mem,pos,audit);
  if(!pos)continue;
  const r=D.positionReview(o,{campaign:{direction:t.entryContext?.campaignDirection||owner}},pos,att);
  if(att.counterConvinces&&!firstReview)
   firstReview={at,price:row.lastPrice,progress:att.evidence?.priceFromLive};
  if(r.action.startsWith('EXIT')&&r.reason.includes('LIVE15')&&!firstExit)
   firstExit={at,price:row.lastPrice,reason:r.reason,evidence:r.positionReview};
  if(r.action.startsWith('EXIT')&&r.reason.includes('CONFIRMED_15M')&&!firstClosed)
   firstClosed={at,price:row.lastPrice};
 }
 const gross=firstExit?sgn*(firstExit.price-t.entryPrice)*1500/t.entryPrice:null;
 const hypot=firstExit?gross-.75-.0005*1500*firstExit.price/t.entryPrice:null;
 results.push({
  tradeNo:t.tradeNo,direction:t.direction,
  originalExitAt:fmt(t.exitAt),originalNetUsd:t.netPnlUsd,
  firstLiveReview:firstReview?fmt(firstReview.at):null,
  selectiveLiveExit:firstExit?fmt(firstExit.at):null,
  selectiveLiveExitPrice:firstExit?.price||null,
  selectiveLiveExitNet:hypot===null?null:Math.round(hypot*100)/100,
  wouldExitBeforeConfirmed:!!firstExit&&firstExit.at<t.exitAt,
  reason:firstExit?.reason||null});
}
console.log(JSON.stringify({version:'V552_ASOF_EXIT_DIAGNOSTIC',
 usesFutureSignals:false,ledgerMutated:false,mode:'RESEARCH_NOT_PAPER',
 caveat:'Counterfactual exit price is one observed Bâton sample, not an actual fill. No re-entry scenario included.',
 results},null,2));
