'use strict';
/* BOONO Elastic v0.5 — one shared view, directional colors, persistent history.
 * Presentation only, never sends action commands to the trading engine. */
(function(){
const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=x=>x!==null&&x!==undefined&&Number.isFinite(Number(x))?Number(x):null;
const fmt=(x,d=1)=>n(x)===null?'—':(Number(x)>0?'+':'')+Number(x).toFixed(d);
const money=x=>n(x)===null?'—':fmt(x,1)+' $';
const mins=x=>n(x)===null?'—':Math.max(0,Number(x)).toFixed(1)+'m';
const tone=d=>d==='long'?'el-up':d==='short'?'el-down':'el-neutral';
const cnum=(v,d=1,dir=null)=>'<b class="'+tone(dir)+'">'+fmt(v,d)+'</b>';
const fromDelta=(a,b)=>n(a)!==null&&n(b)!==null?(b>a?'long':b<a?'short':null):null;
const pair=(p,d=1)=>{
 const a=p&&p.confirmed,b=p&&p.live;
 return '<span class="el-old">'+fmt(a,d)+'</span> / '+cnum(b,d,fromDelta(a,b));
};
const tfRow=(name,w)=>{
 if(!w)return '<div class="el-measure">Données '+esc(name)+' indisponibles</div>';
 const s=w.confirmedSignal||null,live=w.liveSignal||null,c=w.cross||{};
 const cross=c.lastCrossing?'dernier cross '+mins(c.sinceCrossMinutes):
   'aucun cross suivi';
 const inter=w.structuralRelation||{};
 const slope=inter.slopeUsdPerMinute!==null&&inter.slopeUsdPerMinute!==undefined?
   money(inter.slopeUsdPerMinute)+'/min':'—';
 return '<div class="el-section"><div class="el-section-title">'+esc(name)+' <small>confirmé gris → Live</small></div>'+
  '<div class="el-measure">BW '+pair(w.bw)+'　 LBW '+pair(w.lbw)+
  '　 <span class="el-neutral">Δ/bougie</span> '+cnum(w.lbwChangePerBar,2,fromDelta(0,w.lbwChangePerBar))+'</div>'+
  '<div class="el-measure">BW/LBW '+cnum(c.spread,2,fromDelta(0,c.spreadRatePerMinute))+
  ' · '+esc(cross)+' · Δ/min '+cnum(c.spreadRatePerMinute,2,fromDelta(0,c.spreadRatePerMinute))+'</div>'+
  '<div class="el-measure">Pente E→E prix '+cnum(inter.slopeUsdPerMinute,2,fromDelta(0,inter.slopeUsdPerMinute))+
  ' $/min　 <span class="el-neutral">durée</span> '+mins(inter.durationMinutes)+'</div>'+
  '<div class="el-measure">Signal confirmé '+(s?'<b class="'+tone(s.type==='UP'?'long':'short')+'">E'+(name==='MCB 15'?'15':'3')+' '+esc(s.type)+'</b> · barre '+mins(s.ageMinutes):'—')+
  ' · Live '+(live?'<b class="'+tone(live.type==='UP'?'long':'short')+'">'+esc(live.type)+' provisoire</b>':'—')+'</div></div>';
};
function effort(x){
 const q=x&&x.effort||{},cv=x&&x.conversion||{};
 const conv='<div class="el-duel-metrics"><div>PM3 '+cnum(cv.pm3,1,fromDelta(0,cv.pm3))+
   ' $ · PM5 '+cnum(cv.pm5,1,fromDelta(0,cv.pm5))+
   ' $ · PM Live '+cnum(cv.pmLive,1,fromDelta(0,cv.pmLive))+' $</div>'+
   '<div>eff3 '+(n(cv.efficiency3m)!==null?Math.round(cv.efficiency3m*100)+' %':'—')+
   ' · yield/P75 '+(n(cv.yieldVsP75)!==null?Number(cv.yieldVsP75).toFixed(2)+'×':'—')+
   ' · effort/P75 '+(n(cv.effortVsP75)!==null?Number(cv.effortVsP75).toFixed(2)+'×':'—')+'</div>'+
   '<div>Qualité <b>'+esc(cv.quality||'UNCLASSIFIED')+'</b> · direction <b class="'+tone(cv.direction)+'">'+
   esc(cv.direction||'—').toUpperCase()+'</b></div></div>';
 const buy=Math.max(0,n(q.buyBtc)||0),sell=Math.max(0,n(q.sellBtc)||0);
 return '<div class="el-duel"><div class="el-section-title">PRIX BTC · BOUGIES 3m + CONVERSION</div>'+
   conv+'<div class="el-duel-volumes"><span class="el-up">ACHAT '+(q.available?buy.toFixed(3)+' BTC':'—')+'</span>'+
   '<span class="el-down">VENTE '+(q.available?sell.toFixed(3)+' BTC':'—')+'</span></div>'+
   '<div class="el-overlay-chart" role="group" aria-label="Bougies BTC 3 minutes derrière la conversion PM3 et volumes des deux camps">'+
   '<canvas id="elastic-price-candles" aria-label="Graphique prix BTC 3m, comme dans Vagues"></canvas>'+
   '<svg id="elastic-conversion-overlay" aria-label="Deux grands carrés de conversion semi-transparents centrés sur les bougies 3m, indépendants du prix"></svg>'+
   '<div id="elastic-price-axis" class="el-price-axis" aria-hidden="true"></div>'+
   '<div id="elastic-chart-loading" class="el-chart-loading">Bougies 3m · chargement…</div></div>'+
   '<div class="el-duel-legend"><span>PRIX BTC · axe gauche</span><span>Surfaces · volume acheteurs / vendeurs</span><span>Temps · bas</span></div></div>';
}
function display(x){
 const h=x&&x.elasticObserverShadow||null;
 if(!h)return '<div class="el-wrap"><b>ELASTIC v0.5</b> · attente de la première évaluation</div>';
 const cv=h.conversion||{},ma=h.ma||{},fl=h.flow||{},b=h.boundary||{},ctx=h.context||{};
 const dir=h.mcbProposal||null,chain=h.thesisChain||{};
 const chainRows=(chain.supports||[]).map(a=>
   '<span class="el-chain-proof '+tone(a.direction)+'">'+esc(a.label)+
   (n(a.value)!==null?' '+fmt(a.value,1):'')+'</span>').join(' → ');
 const mfpart=p=>pair(p);
 const markup='<div class="el-stack"><section class="el-wrap el-list-bubble"><div class="el-head"><b>ELASTIC v0.5.5 · MÉMOIRE COMMUNE</b>'+
  '<span>SHADOW / aucune autorité de trading</span></div>'+
  '<div class="el-overview">MCB propose <b class="'+tone(dir)+'">'+esc((dir||'indécis').toUpperCase())+'</b>'+
  ' · trajectoire 15m <b class="'+tone(h.mcbStructural)+'">'+esc((h.mcbStructural||'—').toUpperCase())+'</b>'+
  ' · prix <b class="'+tone(h.priceDirection)+'">'+esc((h.priceDirection||'—').toUpperCase())+'</b></div>'+
  '<div class="el-chain"><b>CHAÎNE DE THÈSE '+esc((dir||'—').toUpperCase())+'</b>'+
    '<div>'+(chainRows||'<span class="el-old">Aucune observation alignée pour l’instant</span>')+'</div></div>'+
  '<div class="el-grid">'+
   tfRow('MCB 15',h.shared&&h.shared.MCB15)+
   tfRow('MCB 3',h.shared&&h.shared.MCB3)+
   '<div class="el-section"><div class="el-section-title">FLOW</div>'+
   '<div class="el-measure">MF15 '+mfpart(fl.mf15)+' · MF3 '+mfpart(fl.mf3)+'</div>'+
   '<div class="el-measure">Mémoire <b class="'+tone(fl.memoryDirection)+'">'+esc(fl.memoryDirection||'—')+'</b> · horizon '+esc(fl.memoryHorizon||'—')+'</div></div>'+
   '<div class="el-section"><div class="el-section-title">MA · épisodes confirmés</div>'+
   ['3m','15m'].map(tf=>{const z=ma[tf]||{};return '<div class="el-measure">MA'+(tf==='3m'?'3':'15')+' '+cnum(z.distanceUsd,1,fromDelta(0,z.distanceUsd))+' $'+
     ' · '+esc(z.state||'UNOBSERVED')+' · '+Number(z.retestCount||0)+' retests · '+Number(z.confirmedContactBars||0)+' bougies contact</div>';}).join('')+'</div>'+
   '<div class="el-section"><div class="el-section-title">CONVERSION</div>'+
   '<div class="el-measure">Qualité <b>'+esc(cv.quality||'UNCLASSIFIED')+'</b>'+
   ' · sens <b class="'+tone(cv.direction)+'">'+esc((cv.direction||'—').toUpperCase())+'</b>'+
   (cv.temporalQuality?' · '+esc(cv.temporalQuality):'')+'</div></div>'+
   '<div class="el-section"><div class="el-section-title">BOUNDARY</div>'+
   '<div class="el-measure">'+esc(b.state||'—')+
   ' · '+esc((b.nearestAhead&&b.nearestAhead.kind)||'aucune limite en avant')+
   ' · distance '+money(b.nearestAhead&&b.nearestAhead.distanceAbsUsd)+'</div>'+
   '<div class="el-measure">Range '+esc(b.rangeRr&&b.rangeRr.quality||'non disponible')+
   ' · terrain '+money(b.rangeRr&&b.rangeRr.roomUsd)+'</div>'+
   '<div class="el-measure">Niveaux '+(b.levels||[]).map(x=>esc(x.label)+' '+money(x.distanceUsd)).join(' · ')+
   ' · Fib '+(b.fib||[]).map(x=>esc(x.label)+' '+money(x.distanceUsd)).join(' · ')+'</div></div>'+
   '<div class="el-section"><div class="el-section-title">CONTEXT</div>'+
   '<div class="el-measure">Régime '+esc(ctx.marketQuality||'—')+
   ' · données '+esc(ctx.dataQuality||'—')+'</div>'+
   '<div class="el-measure">1h '+esc(ctx.h1&&ctx.h1.structuralDirection||'—')+
   ' · 4h '+esc(ctx.h4&&ctx.h4.structuralDirection||'—')+
   ' · Daily '+esc(ctx.daily&&ctx.daily.structuralDirection||'—')+
   ' · Weekly '+esc(ctx.weekly&&ctx.weekly.structuralDirection||'—')+'</div></div>'+
   '</div></section><section class="el-wrap el-duel-bubble">'+
   effort(h)+
   '<details id="elastic-chronology" class="el-chronology"'+(window.elasticHistoryState&&window.elasticHistoryState.open?' open':'')+'>'+
   '<summary>CHRONOLOGIE · mémoire persistante <span class="el-old">(cliquer pour ouvrir / refermer)</span></summary>'+
   '<div class="el-history-head"><label>Fenêtre <select id="elastic-history-hours"><option value="6">6 h</option><option value="24">24 h</option><option value="48">48 h</option></select></label>'+
   '<label>Famille <select id="elastic-history-family"><option value="">Toutes</option><option value="MCB15">MCB15</option><option value="MCB3">MCB3</option><option value="FLOW">FLOW</option><option value="MA">MA</option><option value="CONVERSION">CONVERSION</option><option value="BOUNDARY">BOUNDARY</option><option value="CONTEXT">CONTEXT</option></select></label></div>'+
   '<div id="elastic-history" class="el-history-list">Ouvre la chronologie pour charger les événements.</div>'+
   '<button type="button" id="elastic-history-more" class="el-more" hidden>Afficher les événements plus anciens</button></details>'+
   '</section></div>';
 return markup;
}
function date(ts){return n(ts)===null?'—':new Date(Number(ts)).toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function shortVal(v){
 if(v===null||v===undefined)return '—';
 if(typeof v==='object'){if(v.quality)return v.quality+(v.direction?' ('+v.direction+')':'');if(v.type)return v.type+' · '+date(v.sourceTs);if(v.to)return v.to;return JSON.stringify(v).slice(0,100);}
 return String(v);
}
// Stable client-side state survives the 30s trade panel redraw.
const initialHistory=window.elasticHistoryState||{
 open:false,hours:6,family:'',events:[],hasMore:false,beforeId:null,
 totalInWindow:0,loadedAt:0,loading:false,scrollTop:0
};
window.elasticHistoryState=initialHistory;
window.renderElasticObserverV05=display;
const historyHtml=e=>{
 const dir=e.direction||null,before=shortVal(e.previous),after=shortVal(e.current);
 return '<div class="el-hist-row"><span class="el-old">'+esc(date(e.observedAt))+'</span> '+
  '<b>'+esc(e.family)+' / '+esc(e.key)+'</b> '+
  '<span class="'+tone(dir)+'">'+esc(e.type)+'</span> '+
  (before==='—'?'':' <span class="el-old">'+esc(before)+'</span> → ')+
  '<b class="'+tone(dir)+'">'+esc(after)+'</b> · prix '+money(e.price)+
  (e.sourceTs&&e.sourceTs!==e.observedAt?' <span class="el-old">· source '+esc(date(e.sourceTs))+'</span>':'')+'</div>';
};
function paintHistory(){
 const st=window.elasticHistoryState,out=document.getElementById('elastic-history');
 if(!out)return;
 out.innerHTML='<div class="el-foot">'+st.events.length+' affichés sur '+st.totalInWindow+
  ' transitions enregistrées dans la fenêtre. Charger les pages suivantes pour voir les plus anciennes.</div>'+
  (st.events.length?st.events.map(historyHtml).join(''):'<div class="el-foot">Aucun événement dans cette période.</div>');
 out.scrollTop=st.scrollTop||0;
 const more=document.getElementById('elastic-history-more');
 if(more){more.hidden=!st.hasMore;more.disabled=!!st.loading;more.onclick=()=>fetchHistoryPage(true);}
}
async function fetchHistoryPage(older){
 const st=window.elasticHistoryState;
 if(st.loading)return;
 st.loading=true;
 try{
  const q='hours='+encodeURIComponent(st.hours)+'&limit=120'+
   (st.family?'&family='+encodeURIComponent(st.family):'')+
   (older&&st.beforeId?'&beforeId='+encodeURIComponent(st.beforeId):'');
  const res=await fetch('/api/elastic-history?'+q,{cache:'no-store'});
  if(!res.ok)throw new Error('HTTP '+res.status);
  const j=await res.json(),page=(j.events||[]).slice().reverse();
  if(older){const known=new Set(st.events.map(e=>e.id));st.events=st.events.concat(page.filter(e=>!known.has(e.id)));}
  else {st.events=page;st.scrollTop=0;}
  st.hasMore=!!j.hasMore;st.beforeId=j.nextBeforeId||null;
  st.totalInWindow=Number(j.totalInWindow)||0;st.loadedAt=Date.now();
 }catch(err){
  const el=document.getElementById('elastic-history');
  if(el)el.textContent='Historique indisponible : '+err.message;
  st.loading=false;return;
 }
 st.loading=false;paintHistory();
}
window.loadElasticObserverHistory=function(){
 const st=window.elasticHistoryState,details=document.getElementById('elastic-chronology');
 if(!details)return;
 const out=document.getElementById('elastic-history'),hours=document.getElementById('elastic-history-hours');
 const family=document.getElementById('elastic-history-family');
 if(hours){hours.value=String(st.hours);hours.onchange=()=>{
   st.hours=Number(hours.value)||6;st.events=[];st.beforeId=null;st.loadedAt=0;st.scrollTop=0;
   fetchHistoryPage(false);
 };}
 if(family){family.value=st.family;family.onchange=()=>{
   st.family=family.value;st.events=[];st.beforeId=null;st.loadedAt=0;st.scrollTop=0;
   fetchHistoryPage(false);
 };}
 details.ontoggle=()=>{
   st.open=details.open;
   if(details.open){
     if(st.events.length)paintHistory();
     if(!st.events.length||Date.now()-st.loadedAt>90000)fetchHistoryPage(false);
   }
 };
 if(out)out.onscroll=()=>{st.scrollTop=out.scrollTop;};
 if(details.open){
   if(st.events.length)paintHistory();
   if(!st.events.length&&!st.loading)fetchHistoryPage(false);
 }
};
// Candle renderer is intentionally reused from Waves through BoonoCharts.
// Both overlays share TIME on x, not value on y: BTC left, PM3 right.
window.loadElasticChart3m=async function(snapshot){
 const cv=snapshot&&snapshot.elasticObserverShadow||null;
 const canvas=document.getElementById('elastic-price-candles');
 const svg=document.getElementById('elastic-conversion-overlay');
 const axis=document.getElementById('elastic-price-axis');
 const loading=document.getElementById('elastic-chart-loading');
 if(!cv||!canvas||!svg||!window.BoonoCharts||!window.BoonoCharts.drawPrice)return;
 try{
  const res=await fetch('/api/elastic-chart-3m',{cache:'no-store'});
  if(!res.ok)throw new Error('HTTP '+res.status);
  const data=await res.json();
  if(document.getElementById('elastic-price-candles')!==canvas)return;
  const candles=(data.candles||[]).filter(c=>n(c.ts)!==null&&
    [c.open,c.high,c.low,c.close].every(v=>n(v)!==null));
  if(candles.length<2)throw new Error('bougies 3m indisponibles');
  const w=canvas.getBoundingClientRect().width,h=canvas.getBoundingClientRect().height;
  if(!(w>90&&h>100))return;
  const end=n(data.period&&data.period.to)||Date.now();
  const t0=end-90*60000,t1=end+6*60000;
  const pad={left:43,right:10,top:11,bottom:20};
  const chart=window.BoonoCharts.drawPrice(canvas,candles,{
   theme:'interface',t0,t1,boundsT0:t0,boundsT1:end,candleMs:180000,
   padding:pad,maxBodyWidth:9,pricePadPct:.04,minPriceSpan:300,priceSnap:50,
   priceGridMinor:100,priceGridMajor:200,hourGrid:true,
   maAbove:'#1f9d55',maBelow:'#d33'
  });
  if(!chart)throw new Error('dessin des bougies indisponible');
  const plotH=chart.plotHeight,plotW=chart.plotWidth;
  const yprice=v=>window.BoonoCharts.mapPrice(v,chart.bounds,pad.top,plotH);
  const effort=cv.effort||{},volA=Math.max(0,n(effort.buyBtc)||0),volB=Math.max(0,n(effort.sellBtc)||0);
  let duel='';
  if(effort.available){
    // Center the conversion confrontation within the CHART ITSELF.
    // Its geometry is entirely INDEPENDENT of the current BTC price, PM3
    // value and last candle location. Only its area reflects trade volume.
    const cx=pad.left+plotW/2,cy=pad.top+plotH/2;
    const maxSide=Math.min(plotW*.465,plotH*.76,174);
    const max=Math.max(volA,volB,.001);
    const size=v=>Math.max(18,Math.round(Math.sqrt(v/max)*maxSide));
    const leftSize=size(volA),rightSize=size(volB);
    const square=(x,sz,color)=>'<rect class="el-conversion-square" x="'+x.toFixed(1)+
      '" y="'+(cy-sz/2).toFixed(1)+'" width="'+sz.toFixed(1)+
      '" height="'+sz.toFixed(1)+'" rx="4" fill="'+color+
      '" fill-opacity=".21" stroke="'+color+'" stroke-opacity=".80" stroke-width="2"/>';
    duel=square(cx-leftSize,leftSize,'#16804b')+square(cx,rightSize,'#bf4149')+
      '<line class="el-duel-contact" x1="'+cx.toFixed(1)+'" y1="'+(cy-maxSide/2-6).toFixed(1)+
      '" x2="'+cx.toFixed(1)+'" y2="'+(cy+maxSide/2+6).toFixed(1)+
      '" stroke="#3d566a" stroke-opacity=".75" stroke-width="1.3"/>';
  }
  svg.setAttribute('viewBox','0 0 '+w+' '+h);
  svg.setAttribute('preserveAspectRatio','none');
  svg.innerHTML=duel;
  if(axis){
    const step=chart.bounds.hi-chart.bounds.lo>950?200:100;
    const marks=[];
    for(let v=Math.ceil(chart.bounds.lo/step)*step;v<=chart.bounds.hi;v+=step){
      marks.push('<span style="top:'+yprice(v).toFixed(1)+'px">'+
        Math.round(v).toLocaleString('fr-FR')+'</span>');
    }
    axis.innerHTML=marks.join('');
  }
  if(loading)loading.style.display='none';
 }catch(err){if(loading){loading.textContent='Bougies 3m : '+err.message;loading.style.display='block';}}
};
})();
