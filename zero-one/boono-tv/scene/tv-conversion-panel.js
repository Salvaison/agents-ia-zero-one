/* BOONO-TV FOURTH panel — Price/Conversion and Elastic 4×15.
   Render-only. Uses V543 paper, existing 3m candle series, existing OKX
   public trades in bridge, and V494 SHADOW quarters with closed 1m volume.
   No orders, no new websocket, no independent trading signals. */
(function(){
'use strict';
const Q=s=>document.querySelector(s);
const n=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const safe=s=>String(s===undefined||s===null?'—':s).replace(/[&<>"']/g,
 c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=1)=>{
 const x=n(v);return x===null?'—':x.toLocaleString('fr-FR',{
 minimumFractionDigits:d,maximumFractionDigits:d});
};
const signed=(v,d=1)=>n(v)===null?'—':(Number(v)>0?'+':'')+fmt(v,d);
const tone=v=>n(v)===null?'na':Number(v)>0?'up':Number(v)<0?'down':'na';
const clock=ms=>n(ms)===null?'—':new Date(Number(ms)).toLocaleTimeString('fr-FR',{
 timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',hour12:false});
const stamp=ms=>n(ms)===null?'—':new Date(Number(ms)).toLocaleString('fr-FR',{
 timeZone:'Europe/Stockholm',day:'2-digit',month:'2-digit',
 hour:'2-digit',minute:'2-digit',hour12:false});
const escClass=s=>['up','down','na'].includes(s)?s:'na';
const pct=v=>n(v)===null?'—':Math.round(Number(v)*100)+'%';
const ordered=(map,count=2)=>Object.entries(map||{}).filter(([k,v])=>
 n(v)!==null&&Number(v)>0&&Number(v)<=1).sort((a,b)=>b[1]-a[1]).slice(0,count);
const graphVolumeLevels=[1,2,5,10,20,50,100,200,500,1000];
let latest=null;
function updateRail(effort){
 const el=Q('#tvConvVolumeRail');if(!el)return;
 const buy=n(effort?.buyBtc),sell=n(effort?.sellBtc);
 const total=effort?.available===true&&buy!==null&&sell!==null?buy+sell:null;
 const level=total===null?null:graphVolumeLevels.filter(t=>total>=t).length;
 el.innerHTML=Array.from({length:10},(_,i)=>
  '<span class="'+(level!==null&&9-i<level?'on':'')+'"></span>').join('');
 el.title=total===null?'Volume OKX 3m indisponible':
  'Volume agressif total exécuté sur 3m : '+fmt(total,2)+' BTC, seuils du graphe BOONO Watch (pas profondeur du carnet)';
}
function drawDuelOverlay(canvas,data,e,p,chart){
 if(!canvas||!chart)return;
 const lib=window.BoonoCharts;
 const box=lib?.setupCanvas?.(canvas);
 if(!box)return;
 const {ctx,w,h}=box;
 ctx.clearRect(0,0,w,h);
 const buy=n(e?.buyBtc),sell=n(e?.sellBtc);
 if(e?.available!==true||buy===null||sell===null)return;
 const pad=chart.padding,lowY=pad.top,highY=pad.top+chart.plotHeight;
 const plotStart=pad.left,plotW=chart.plotWidth,axis=plotStart+plotW*.50;
 const max=Math.max(1,buy,sell);
 const maxWidth=Math.min(125,plotW*.39);
 const leftWidth=Math.max(10,maxWidth*buy/max),rightWidth=Math.max(10,maxWidth*sell/max);
 const live=n(p);
 const bounds=chart.bounds;
 const rawY=live!==null?lib.mapPrice(live,bounds,pad.top,chart.plotHeight):lowY+chart.plotHeight*.5;
 const y=Math.max(lowY+57,Math.min(highY-57,rawY));
 const rectHeight=Math.min(95,chart.plotHeight*.20);
 const sy=y-rectHeight/2;
 ctx.save();ctx.beginPath();ctx.rect(plotStart,lowY,plotW,chart.plotHeight);ctx.clip();
 ctx.strokeStyle='rgba(67,180,244,.6)';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(axis,lowY);ctx.lineTo(axis,highY);ctx.stroke();
 ctx.setLineDash([3,5]);ctx.strokeStyle='rgba(103,203,242,.7)';ctx.lineWidth=.8;
 ctx.beginPath();ctx.moveTo(plotStart,y);ctx.lineTo(plotStart+plotW,y);ctx.stroke();ctx.setLineDash([]);
 function block(x,width,amount,color,fill){
  ctx.fillStyle=fill;ctx.strokeStyle=color;ctx.lineWidth=1.8;
  ctx.beginPath();ctx.roundRect(x,sy,width,rectHeight,5);ctx.fill();ctx.stroke();
  ctx.font='900 13px ui-monospace,Menlo,Consolas,monospace';
  ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
  const label=fmt(amount,1);
  if(width>47)ctx.fillText(label+' BTC',x+width/2,y,Math.max(25,width-6));
 }
 block(axis-leftWidth,leftWidth,buy,'#4eecad','rgba(48,199,117,.24)');
 block(axis,rightWidth,sell,'#ff8190','rgba(237,85,112,.23)');
 ctx.restore();
}
function ticker(s){
 const root=Q('#tvConvTicker');if(!root)return;
 const source=s?.tvTicker4x15;
 const trusted=source?.mode==='SHADOW_ONLY'&&
   source?.decisionImpact===false&&source?.brokerOrdersEnabled===false;
 const fresh=trusted&&source?.status==='DATA_RECENT'&&n(source.asOf)!==null&&
   Date.now()-Number(source.asOf)<=90000;
 const windows=trusted&&Array.isArray(source.windows)?
   source.windows.slice(-4).sort((a,b)=>Number(b.startAt)-Number(a.startAt)):[];
 const v=source?.volume4x15;
 const volumeTrusted=trusted&&v?.source==='OKX_BTC_USDT_SWAP_CLOSED_1M_VOLCCY'&&
    v.status==='OK'&&n(v.asOf)!==null&&Number(v.asOf)<=Number(source.asOf)&&
    Number(source.asOf)-Number(v.asOf)<=90000;
 const byStart=new Map(volumeTrusted&&Array.isArray(v.windows)?
   v.windows.map(x=>[Number(x.startAt),x]):[]);
 const cards=[];
 for(let i=0;i<4;i++){
  const w=windows[i];
  if(!w){
   cards.push('<div class="tv-quarter-card stale"><div class="quarter-time">15 MIN · —</div><div class="quarter-market">Fenêtre indisponible</div></div>');
   continue;
  }
  const vol=byStart.get(Number(w.startAt));
  const hasVolume=vol?.sourceStatus==='OK'&&
   n(vol?.meanBtcPerMinute)!==null&&n(vol.meanGraphVolumePct)!==null;
  const volText=hasVolume?
   'Vol moy: '+Math.round(Number(vol.meanGraphVolumePct))+'% · '+
   fmt(vol.meanBtcPerMinute,1)+' BTC/min':
   'Vol moy: —% · — BTC/min';
  const qualities=ordered(w.qualityFractions).map(([k,x])=>safe(k)+' '+pct(x)).join(' · ')||'Qualité —';
  const dirs=w.directionFractions||{};
  const longs='LONG '+pct(dirs.long)+' · SHORT '+pct(dirs.short)+
   ' · CONTESTED '+pct(dirs.contested);
  const markets=ordered(w.marketFractions).map(([k,x])=>safe(k)+' '+pct(x)).join(' · ')||'MARCHÉ —';
  const state=!fresh?'SOURCE ANCIENNE':w.partial?'EN FORMATION':'15 MIN';
  cards.push('<div class="tv-quarter-card'+(!fresh?' stale':'')+'"'+
   ' title="Fenêtre Elastic SHADOW, '+safe(String(w.samples??'—'))+
   ' relevés, source '+safe(stamp(source.asOf))+
   ', volume confirmé OKX 1m '+(hasVolume?'observé':'indisponible')+'">'+
   '<div class="quarter-time">'+safe(stamp(w.startAt))+
   '<span>'+safe(state)+'</span></div>'+
   '<div class="quarter-volume">'+safe(volText)+'</div>'+
   '<div class="quarter-quality">'+qualities+'</div>'+
   '<div class="quarter-direction">'+
     '<span class="up">'+safe('LONG '+pct(dirs.long))+'</span> · '+
     '<span class="down">'+safe('SHORT '+pct(dirs.short))+'</span>'+
     '<span class="na">'+safe(' · CONTESTED '+pct(dirs.contested))+'</span>'+
   '</div>'+
   '<div class="quarter-market">Régime : '+markets+'</div></div>');
 }
 root.innerHTML=cards.join('');
 root.dataset.status=!trusted?'UNAVAILABLE':fresh?'DATA_RECENT':'SOURCE_STALE';
}
function render(s){
 if(s)latest=s;else s=latest;
 const host=Q('#tvConversionPanel');
 if(!host||!s)return;
 const lib=window.BoonoCharts;
 const candleCanvas=Q('#tvConvPriceCanvas'),overlayCanvas=Q('#tvConvOverlayCanvas');
 const effort=s.conversion?.effort||{},c=s.conversion?.conversion||{};
 const quote=n(s.market?.fresh===true?s.market.price:null);
 Q('#tvConvQuote').textContent=quote===null?'BTC —':fmt(quote,1)+' $';
 const isLive=effort.available===true&&s.conversion?.status==='LIVE_3M';
 Q('#tvConvPM').innerHTML=[
  ['PM3',c.pm3],['PM5',c.pm5],['PMLive',c.pmLive]
 ].map(([label,v])=>'<b>'+label+'</b> <span class="conv-'+escClass(tone(v))+'">'+
   safe(signed(v,1))+' $</span>').join('　');
 const summary=Q('#tvConvQuality');
 summary.textContent='Qualité '+(c.quality||'—')+
   ' · direction '+(c.direction||'—').toUpperCase();
 const vol=Q('#tvConvDuelInfo');
 vol.innerHTML='<span class="conv-buy">ACHAT '+safe(fmt(effort.available?effort.buyBtc:null,2))+
  ' BTC</span><span class="conv-sell">VENTE '+safe(fmt(effort.available?effort.sellBtc:null,2))+' BTC</span>';
 Q('#tvConvDelta').textContent='Δ BTC 3m '+signed(effort.available?effort.priceNetUsd:null,1)+' $';
 const dep=effort.available&&n(effort.priceRangeUsd)>0?
  100*Number(effort.priceNetUsd)/Number(effort.priceRangeUsd):null;
 Q('#tvConvDeport').textContent='Déport '+signed(dep,1)+' % du range 3m';
 Q('#tvConvEffortNote').textContent=
  'Flux initiateurs OKX 3m · '+(isLive?'LIVE_3M':
    effort.available?'FENÊTRE EN FORMATION':'SOURCE INDISPONIBLE');
 updateRail(effort);
 ticker(s);
 const series=Array.isArray(s.series?.mcb3)?s.series.mcb3:[];
 const now=Date.now(),last=Math.max(0,...series.map(r=>Number(r.ts)||0));
 const end=Math.max(last,Math.min(now,Number(s.market?.marketTimestamp||last)));
 const start=end-150*60000;
 const rows=series.filter(r=>n(r.ts)!==null&&Number(r.ts)>=start-180000&&
  Number(r.ts)<=end&&[r.high,r.low,r.close,r.open].every(v=>n(v)!==null));
 if(!lib||rows.length<2||!candleCanvas){
  Q('#tvConvPeriod').textContent='Bougies 3m indisponibles';
  host.dataset.priceStatus='UNAVAILABLE';return;
 }
 const hi=Math.max(...rows.map(r=>Number(r.high)));
 const lo=Math.min(...rows.map(r=>Number(r.low)));
 const amplitude=Math.max(1,hi-lo);
 const maLast=n(rows.at(-1)?.ma200);
 const maVisible=maLast!==null&&maLast>=lo-.28*amplitude&&maLast<=hi+.28*amplitude;
 const priceRows=rows.map(r=>({
  ...r,ma200:maVisible&&n(r.ma200)!==null?Number(r.ma200):null
 }));
 const chart=lib.drawPrice(candleCanvas,priceRows,{
  theme:'tv-neon',grid:true,hourGrid:false,t0:start,t1:end,
  padding:{left:22,right:83,top:11,bottom:26},candleMs:180000,
  timeAxis:true,maxBodyWidth:8,maWidth:1.8,maAbove:'#32d88a',
  maBelow:'#ff6178',pricePadPct:.07,livePrice:quote,
  livePriceLine:quote!==null,livePriceRightLabel:quote!==null,
  candleOutlineUp:'#38e4a4',candleOutlineDown:'#ff7a8c'
 });
 drawDuelOverlay(overlayCanvas,priceRows,effort,quote,chart);
 const maDist=maLast!==null&&quote!==null?quote-maLast:null;
 Q('#tvConvPeriod').textContent='150 MIN · 3m · '+clock(start)+'–'+clock(end);
 Q('#tvConvMA').textContent='MA200 '+(maLast===null?'—':fmt(maLast,1)+
  ' · dist '+signed(maDist,1)+' $'+(maVisible?'':' · hors vue'));
 host.dataset.priceStatus=quote===null?'PRICE_STALE':'PRICE_FRESH';
}
function onSnapshot(s){
 latest=s;
 if(Q('#statePanel')?.dataset.activePanel==='conversion')render(s);
}
window.BoonoTVConversion={render,onSnapshot,
 volumeLevels:graphVolumeLevels.slice(),get source(){return 'TV_READ_ONLY_EXISTING_OKX_MCB3_V494_ELASTIC';}};
})();
