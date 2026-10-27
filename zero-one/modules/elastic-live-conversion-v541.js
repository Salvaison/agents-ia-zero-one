'use strict';
/* BOONO Systems — live conversion telemetry for display only.
 * Reuses the EXISTING OKX BTC-USDT-SWAP WebSocket opened by /app.js.
 * No extra subscription, no trade decisions or funded orders.
 * OKX sz = contracts, ctVal = 0.01 BTC for BTC-USDT-SWAP.
 * The 3m window warms from the first trade seen in THIS browser session.
 */
(function(){
const WINDOW_MS=180000,STALE_MS=15000,BTC_PER_CONTRACT=.01,MAX_TICKS=25000;
let trades=[],ids=new Set(),firstSeenAt=null,lastTradeAt=null,
 lastUiRefresh=0,lastSource='NO_OKX_TRADES',analysis=null;
const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
function prune(now){
 const cutoff=now-WINDOW_MS;
 while(trades.length&&(trades[0].ts<cutoff||trades.length>MAX_TICKS)){
  const old=trades.shift();
  if(old.id!==null)ids.delete(old.id);
 }
}
function ingestTrade(raw){
 if(!raw||raw.instId&&raw.instId!=='BTC-USDT-SWAP')return false;
 const now=Date.now(),ts=num(raw.ts),px=num(raw.px),size=num(raw.sz);
 const side=String(raw.side||'').toLowerCase();
 if(ts===null||px===null||size===null||px<=0||size<=0||
   !['buy','sell'].includes(side)||ts>now+3000||now-ts>STALE_MS)return false;
 const id=raw.tradeId===null||raw.tradeId===undefined?null:String(raw.tradeId);
 if(id!==null&&ids.has(id))return false;
 // After an actual feed gap, the following measurement is a NEW partial window.
 if(lastTradeAt!==null&&now-lastTradeAt>STALE_MS){
  trades=[];ids.clear();firstSeenAt=null;
 }
 if(firstSeenAt===null)firstSeenAt=now;
 if(id!==null)ids.add(id);
 const tick={ts,price:px,btc:size*BTC_PER_CONTRACT,side,id};
 if(trades.length&&ts<trades[trades.length-1].ts){
  let i=trades.length;
  while(i>0&&trades[i-1].ts>ts)i--;
  trades.splice(i,0,tick);
 }else trades.push(tick);
 lastTradeAt=now;lastSource='OKX_TRADES_WS';
 prune(now);
 return true;
}
function setAnalysis(a){
 const version=String(a?.version||'');
 if(!a||!(version.startsWith('v5.4.1')||version.startsWith('v5.4.2')||version.startsWith('v5.4.3'))||
   a.brokerOrdersEnabled!==false||num(a.asOf)===null)return false;
 if(analysis&&Number(a.asOf)<Number(analysis.asOf))return false;
 const r=a.readings&&a.readings.conversion||{};
 analysis={asOf:Number(a.asOf),pm3:num(r.pm3),pm5:num(r.pm5),
  pmLive:num(r.pmCombined),source:version+'|PAPER_OBSERVATION_ONLY'};
 return true;
}
function snapshot(now=Date.now()){
 prune(now);
 const age=lastTradeAt===null?Infinity:now-lastTradeAt;
 const fresh=age>=-3000&&age<=STALE_MS;
 const usable=fresh&&trades.length>=2;
 const recent=usable?trades:[];
 const first=recent[0],last=recent[recent.length-1];
 const buy=recent.reduce((s,t)=>s+(t.side==='buy'?t.btc:0),0);
 const sell=recent.reduce((s,t)=>s+(t.side==='sell'?t.btc:0),0);
 let priceLow=Infinity,priceHigh=-Infinity;
 for(const t of recent){priceLow=Math.min(priceLow,t.price);
  priceHigh=Math.max(priceHigh,t.price);}
 const pmFresh=analysis&&now-analysis.asOf>=-3000&&now-analysis.asOf<=65000;
 const cv=pmFresh?analysis:{pm3:null,pm5:null,pmLive:null};
 const dir=cv.pm3!==null&&cv.pm5!==null&&
    Math.sign(cv.pm3)!==0&&Math.sign(cv.pm3)===Math.sign(cv.pm5)?
      (cv.pm3>0?'long':'short'):null;
 const conflict=cv.pm3!==null&&cv.pm5!==null&&
    cv.pm3*cv.pm5<0;
 const coverage=firstSeenAt===null?0:Math.min(WINDOW_MS,Math.max(0,now-firstSeenAt));
 return {
  version:'v541-live-conversion-display-v1',decisionImpact:false,
  status:!fresh?'OKX_TRADES_UNAVAILABLE':coverage<WINDOW_MS?
    'WARMING_3M':'LIVE_3M',
  coverageSeconds:Math.round(coverage/1000),
  lastTickAt:fresh?lastTradeAt:null,
  effort:{available:usable,buyBtc:usable?buy:null,sellBtc:usable?sell:null,
   sampleCount:recent.length,windowMinutes:3,
   priceNetUsd:usable?last.price-first.price:null,
   priceRangeUsd:usable?priceHigh-priceLow:null,
   source:'OKX_PUBLIC_AGGRESSOR_TRADES_CLIENT',
   volumeUnit:'BTC',contractsToBtc:BTC_PER_CONTRACT},
  conversion:{pm3:cv.pm3,pm5:cv.pm5,pmLive:cv.pmLive,
   efficiency3m:null,yieldVsP75:null,effortVsP75:null,
   quality:conflict?'CONTESTED':'UNCLASSIFIED',
   classificationSource:conflict?'PM3_PM5_OPPOSITE':
    'P75_P95_NOT_RECALIBRATED',direction:dir},
  note:'Volume buy/sell initiator by OKX trades; PM from current V5.4.x, never frozen V4'}
}
function refreshUi(force=false){
 const now=Date.now();
 if(!force&&now-lastUiRefresh<5000)return false;
 if(document.hidden)return false;
 const node=document.getElementById('elastic-live-duel');
 if(!node||typeof window.paintElasticLiveConversion!=='function')return false;
 lastUiRefresh=now;
 window.paintElasticLiveConversion(snapshot(now));
 return true;
}
window.elasticConversionV541={
 ingestTrade,setAnalysis,snapshot,refreshUi,
 getSourceStatus:()=>({lastTradeAt,firstSeenAt,
  tickCount:trades.length,lastSource}),
 constants:{windowMs:WINDOW_MS,btcPerContract:BTC_PER_CONTRACT,
  staleMs:STALE_MS}
};
})();
