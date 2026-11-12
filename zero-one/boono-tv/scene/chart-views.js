(function(){
'use strict';
/* BOONO-TV visual-only chart stage: cannot alter V4 trading or decision logic.
 * Live market/MCB from the existing read-only websocket; V4 marker file is sanitized.
 */
const Q=s=>document.querySelector(s);
const params=new URLSearchParams(location.search);
const forced=params.get('panel'); // optional fixed preview: state / charts / trades
const dialogueEditing=params.get('dialogueEdit')==='1'||params.get('storyboardEdit')==='1';
const panels=['state','charts','trades'];
// Display dwell times, not market-data refresh periods.
// Cycle: 25s State -> 15s charts -> 5s PAPER trades -> State (45s total).
const PANEL_DURATIONS_MS=Object.freeze({state:25000,charts:15000,trades:5000});
let rotationTimer=null;
const rotationDisabled=dialogueEditing||panels.includes(forced);
function scheduleNextPanel(){
 if(rotationDisabled)return;
 if(rotationTimer!==null)clearTimeout(rotationTimer);
 rotationTimer=setTimeout(()=>{
  rotationTimer=null;
  const next=panels[(panels.indexOf(active)+1)%panels.length];
  setView(next);
 },PANEL_DURATIONS_MS[active]);
}
let active='state',lastSnapshot=null,events=[],lastMarkerVersion='';
const nf=(v,d=1)=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':
  Number(v).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
const tag=(selector,value)=>{const el=Q(selector);if(el)el.textContent=value};
function setView(view){
 if(!panels.includes(view))return;
 active=view;
 const panel=Q('#statePanel'),trio=Q('#leftChartTrio'),trades=Q('#completedTradesPanel');
 if(panel){
  panel.classList.toggle('charts-active',view==='charts');
  panel.classList.toggle('trades-active',view==='trades');
  panel.dataset.activePanel=view;
 }
 if(trio)trio.setAttribute('aria-hidden',view==='charts'?'false':'true');
 if(trades)trades.setAttribute('aria-hidden',view==='trades'?'false':'true');
 if(view==='charts'&&lastSnapshot)drawTrio(lastSnapshot);
 if(view==='trades'&&lastSnapshot)drawCompletedTrades(lastSnapshot);
 scheduleNextPanel();
}
function tradeMarkers(){
 const res=[];
 for(const e of events){
  if(e.entryTs)res.push({ts:Number(e.entryTs),kind:'entry',direction:e.direction,n:e.n,price:e.entryPrice});
  if(Array.isArray(e.partials))for(const p of e.partials){
   if(p.ts)res.push({ts:Number(p.ts),kind:'partial',direction:e.direction,n:e.n,price:p.price});
  }
  if(e.exitTs)res.push({ts:Number(e.exitTs),kind:'exit',direction:e.direction,n:e.n,price:e.exitPrice});
 }
 return res.sort((a,b)=>a.ts-b.ts);
}
function tradeSpans(until){
 return events.filter(e=>e.entryTs).map(e=>({
  entryTs:Number(e.entryTs),
  drawEndTs:Number(e.exitTs)||until,
  direction:e.direction,n:e.n,engine:e.engine||null
 })).filter(z=>z.drawEndTs>z.entryTs);
}

/* TV-specific overlays use the actual MCB native WT cross columns (not
   reconstructed signals), and separate 5px sky-blue top/bottom trade brackets.
   Do not put brackets on the floating market curtain. */
function plotContext(canvas,opts){
 if(!canvas)return null;
 const d=Math.max(1,Math.min(Number(window.devicePixelRatio)||1,2));
 const w=canvas.width/d,h=canvas.height/d;
 const pad=Object.assign({left:10,right:10,top:7,bottom:7},opts.padding||{});
 const t0=Number(opts.t0),t1=Number(opts.t1);
 if(!(w>0&&h>0&&t1>t0))return null;
 const plotW=Math.max(1,w-pad.left-pad.right),plotH=Math.max(1,h-pad.top-pad.bottom);
 const ctx=canvas.getContext('2d');
 ctx.save();ctx.setTransform(d,0,0,d,0,0);
 return {ctx,pad,w,h,plotW,plotH,t0,t1,
  xx:t=>pad.left+(Number(t)-t0)/(t1-t0)*plotW};
}
function paintTradeBrackets(canvas,spans,opts){
 const g=plotContext(canvas,opts);if(!g)return;
 const {ctx,pad,plotH,t0,t1,xx}=g;
 const top=pad.top,bottom=top+plotH;
 ctx.save();ctx.beginPath();ctx.rect(pad.left,top,g.plotW,plotH);ctx.clip();
 for(const z of spans||[]){
  const a=Math.max(t0,Number(z.entryTs)),b=Math.min(t1,Number(z.drawEndTs));
  if(!(b>a))continue;
  const x1=xx(a),x2=xx(b),ww=Math.max(1,x2-x1);
  // One engine, one side: V494 at the upper edge, V543 at the lower.
  const isV543=z.engine==='V543';
  const y=isV543?bottom-5:top,edge=isV543?bottom-13:top+13;
  ctx.fillStyle='rgba(135,206,250,.93)';
  ctx.fillRect(x1,y,ww,5);
  ctx.strokeStyle='rgba(135,206,250,.88)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x1+.4,y);ctx.lineTo(x1+.4,edge);
  ctx.moveTo(x2-.4,y);ctx.lineTo(x2-.4,edge);ctx.stroke();
 }
 ctx.restore();ctx.restore();
}
function paintEEvents(canvas,rows,name,opts){
 const g=plotContext(canvas,opts);if(!g)return;
 const {ctx,pad,plotH,t0,t1,xx}=g;
 const lim=Number(opts.yLimit)||window.BoonoCharts?.waveLimit(rows)||100;
 const yy=v=>pad.top+(lim-Math.max(-lim,Math.min(lim,Number(v))))/(2*lim)*plotH;
 const isCurtain=!!opts.curtain;
 ctx.save();ctx.beginPath();ctx.rect(pad.left,pad.top,g.plotW,plotH);ctx.clip();
 for(const r of rows||[]){
  if(!(Number(r.ts)>=t0&&Number(r.ts)<=t1))continue;
  for(const [key,color,dir] of [
   ['signalUp','#31e48d','UP'],['signalDn','#f15768','DN']]){
   const v=r[key];
   if(v===null||v===undefined||v===''||!Number.isFinite(Number(v)))continue;
   const x=xx(r.ts),y=yy(v);
   const rad=isCurtain?5.4:4.4;
   ctx.save();ctx.shadowColor=color;ctx.shadowBlur=isCurtain?4:2;
   ctx.fillStyle=r.isLive?'rgba(4,24,35,.85)':color;
   ctx.strokeStyle=color;ctx.lineWidth=r.isLive?2:1;
   ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.restore(); // Native E15/E3 event: colored dot only, no obstructive text.
  }
 }
 ctx.restore();ctx.restore();
}

function drawTrio(s){
 const lib=window.BoonoCharts;
 if(!lib||!s)return;
 const a=Array.isArray(s.series?.mcb3)?s.series.mcb3:[];
 const b=Array.isArray(s.series?.mcb15)?s.series.mcb15:[];
 if(!a.length||!b.length)return;
 const latest=Math.max(...a.map(r=>Number(r.ts)||0),...b.map(r=>Number(r.ts)||0));
 if(!latest)return;
 const t1=Math.max(latest,Math.min(Date.now(),latest+180000)),t0=t1-6*3600000;
 const rawPrice=s.market?.price;
 const p=s.market?.fresh===true&&rawPrice!==null&&rawPrice!==undefined&&Number.isFinite(Number(rawPrice))&&Number(rawPrice)>0?Number(rawPrice):null;
 const trades=tradeMarkers();
 const baseWave=(rows)=>rows.filter(r=>r.ts>=t0&&r.ts<=t1).map(r=>({
  ...r,vwap:Number.isFinite(Number(r.vwap))&&r.vwap!==null?
   Number(r.vwap):(Number(r.lbw)||0)-(Number(r.bw)||0)
 }));
 const priceRows=a.filter(r=>r.ts>=t0&&r.ts<=t1);
 const spans=tradeSpans(t1).filter(z=>z.entryTs<=t1&&z.drawEndTs>=t0);
 lib.drawPrice(Q('#trioPriceCanvas'),priceRows,{
  theme:'tv-neon',grid:true,hourGrid:false,t0,t1,
  padding:{left:14,right:90,top:10,bottom:24},candleMs:180000,timeAxis:true,
  maWidth:1.9,maAbove:'#33da8c',maBelow:'#ff6573',maxBodyWidth:8,
  livePrice:p,livePriceLine:p!==null,livePriceRightLabel:true
 });
 paintTradeBrackets(Q('#trioPriceCanvas'),spans,{t0,t1,padding:{left:14,right:90,top:10,bottom:24}});
 const waveOpts={theme:'tv-neon',t0,t1,grid:true,
  padding:{left:14,right:97,top:10,bottom:22},timeAxis:true,
  endLabels:true,mfFlowFill:true};
 const w15=baseWave(b),w3=baseWave(a);
 const c15=Q('#trioMcb15Canvas'),c3=Q('#trioMcb3Canvas');
 lib.drawWave(c15,w15,waveOpts);
 paintEEvents(c15,w15,'E15',waveOpts);
 paintTradeBrackets(c15,spans,waveOpts);
 lib.drawWave(c3,w3,waveOpts);
 paintEEvents(c3,w3,'E3',waveOpts);
 paintTradeBrackets(c3,spans,waveOpts);
 tag('#trioPriceLive',(p===null?'—':nf(p,1)+' USDT'));
 tag('#trioMcb15Value','BW '+nf(b[b.length-1]?.bw,1)+'  ·  LBW '+nf(b[b.length-1]?.lbw,1));
 tag('#trioMcb3Value','BW '+nf(a[a.length-1]?.bw,1)+'  ·  LBW '+nf(a[a.length-1]?.lbw,1));
}

function drawCompletedTrades(s){
 const holder=Q('#completedTradesList'),summary=Q('#tradeEngineSummary');
 if(!holder||!summary)return;
 const closed=(Array.isArray(s?.trades)?s.trades:[])
  .filter(x=>x?.paper===true&&['V494','V543'].includes(x.engine)&&
    Number.isFinite(Number(x.exitTs))&&Number(x.exitTs)>0)
  .sort((a,b)=>Number(b.exitTs)-Number(a.exitTs));
 tag('#tradesCompletedCount',String(closed.length));
 const money=v=>{
  if(v===null||v===undefined||v===''||!Number.isFinite(Number(v)))return '—';
  const n=Number(v);return (n>0?'+':'')+nf(n,2);
 };
 const tone=v=>v===null||v===undefined||!Number.isFinite(Number(v))?'na':
  Number(v)>0?'up':Number(v)<0?'down':'';
 summary.innerHTML=['V494','V543'].map(engine=>{
  const rows=closed.filter(x=>x.engine===engine);
  const measured=rows.filter(x=>x.netPnlUsd!==null&&
    x.netPnlUsd!==undefined&&Number.isFinite(Number(x.netPnlUsd)));
  const total=measured.length?measured.reduce((sum,x)=>sum+Number(x.netPnlUsd),0):null;
  return '<div class="engine-summary-card"><div class="engine-summary-name">'+engine+
   ' · '+rows.length+' clôtures</div><div class="engine-summary-net '+tone(total)+'">'+
   money(total)+' $ net</div></div>';
 }).join('');
 const period=t=>{
  const d=new Date(Number(t));
  return {date:d.toLocaleDateString('fr-FR',{timeZone:'Europe/Stockholm',day:'2-digit',month:'2-digit'}),
    time:d.toLocaleTimeString('fr-FR',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',hour12:false})};
 };
 holder.innerHTML=closed.length?closed.slice(0,13).map(trade=>{
  const dt=period(trade.exitTs),dir=trade.direction==='long'?'LONG':'SHORT';
  const net=trade.netPnlUsd===null||trade.netPnlUsd===undefined?
    null:Number(trade.netPnlUsd);
  const tradeNo=Number.isFinite(Number(trade.n))?Number(trade.n):'—';
  return '<div class="completed-trade-row">'+
   '<div class="trade-time">'+dt.time+'<small>'+dt.date+'</small></div>'+
   '<div class="trade-engine">'+trade.engine+'<small> #'+tradeNo+'</small></div>'+
   '<div class="trade-dir '+(dir==='LONG'?'long':'short')+'">'+dir+'</div>'+
   '<div class="trade-prices">'+nf(trade.entryPrice,1)+
   '<small>→ '+nf(trade.exitPrice,1)+'</small></div>'+
   '<div class="trade-net '+tone(net)+'">'+money(net)+'</div></div>';
 }).join(''):'<div class="no-completed-trades">Aucun trade PAPER clôturé sur les 48 dernières heures.</div>';
}

function onSnapshot(s){
 lastSnapshot=s;
 // Amsterdam PAPER ledgers supersede the obsolete local V4 marker file.
 if(Array.isArray(s?.trades)){
  events=s.trades.filter(e=>Number.isFinite(Number(e.entryTs))&&
   ['long','short'].includes(e.direction)).slice(-160);
  lastMarkerVersion='PAPER_LIVE';
 }
 tag('#pricePanelLive',nf(s?.market?.price,1)+' USDT');
 drawTrio(s);
 drawCompletedTrades(s);
}
async function refreshMarkers(){
 if(Array.isArray(lastSnapshot?.trades))return;
 try{
  const r=await fetch('/assets/trade-markers.json?ts='+Date.now(),{cache:'no-store'});
  if(!r.ok)return;
  const data=await r.json();
  if(Array.isArray(lastSnapshot?.trades))return;
  if(data.version!==1||!Array.isArray(data.events))return;
  const version=String(data.generatedAt||'');
  if(version===lastMarkerVersion)return;
  lastMarkerVersion=version;
  events=data.events.filter(e=>Number.isFinite(Number(e.entryTs))&&['long','short'].includes(e.direction)).slice(-150);
  if(lastSnapshot){
   drawTrio(lastSnapshot);
   // Reflect new markers on floating waves as soon as the read-only file updates.
   if(typeof window.renderMarketCurtain==='function')
    window.renderMarketCurtain(lastSnapshot.series?.mcb3||[],lastSnapshot.series?.mcb15||[]);
  }
 }catch(_){/* feed interruption must never affect trading or scene rendering */}
}
// setView schedules a one-shot timer based on the active panel duration.
 // ?panel=... and dialogue editing intentionally disable automatic rotation.
setView(dialogueEditing?'state':(panels.includes(forced)?forced:'state'));
refreshMarkers();
setInterval(refreshMarkers,60000);
window.BoonoTVCharts={onSnapshot,tradeMarkers,tradeSpans,
 paintTradeBrackets,paintEEvents,get view(){return active},
 setView,drawTrio,drawCompletedTrades,
 cycleMs:PANEL_DURATIONS_MS.state,
 cycleDurationsMs:PANEL_DURATIONS_MS,
 get markerCount(){return events.length}};
})();
