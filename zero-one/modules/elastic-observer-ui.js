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
 const q=x&&x.effort||{},evt=x&&x.lastEvent||null;
 const label=evt?date(evt.observedAt)+' · '+evt.family+' / '+evt.key+' '+evt.type:'Chronologie · aucune transition suivie';
 const latest=esc(label.length>56?label.slice(0,53)+'…':label);
 if(!q.available)return '<div class="el-duel-notice">Dernier événement : '+latest+
   ' · Duel indisponible : volumes acheteurs/vendeurs initiateurs non mesurables sur cette fenêtre.</div>';
 const buy=Math.max(0,n(q.buyBtc)||0),sell=Math.max(0,n(q.sellBtc)||0),max=Math.max(buy,sell,0.00001);
 const sz=v=>Math.max(14,Math.round(Math.sqrt(v/max)*61));
 const b=sz(buy),s=sz(sell),price=n(q.priceNetUsd)||0;
 const pd=fromDelta(0,price),range=Math.max(n(q.priceRangeUsd)||0,1);
 const drift=Math.round(Math.max(-1,Math.min(1,price/range))*69),contact=180+drift;
 const rect=(x,y,w,col)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+w+'" rx="4" fill="'+col+'" fill-opacity=".20" stroke="'+col+'" stroke-width="2.3"/>';
 const indicator=contact===180?'':('<line x1="180" y1="158" x2="'+contact+'" y2="158" stroke="'+(pd==='long'?'#16804b':'#bd444b')+'" stroke-width="3" stroke-linecap="round"/>'+
   '<circle cx="'+contact+'" cy="158" r="3.5" fill="'+(pd==='long'?'#16804b':'#bd444b')+'"/>');
 return '<div class="el-duel"><div class="el-duel-title">Duel · terrain gagné sur 3m (prix indépendant du volume)</div>'+
   '<svg role="img" aria-label="Deux carrés accolés, déplacement conjoint par le prix, tailles proportionnelles aux volumes initiateurs" viewBox="0 0 360 202" width="100%" xmlns="http://www.w3.org/2000/svg">'+
   '<text x="180" y="15" text-anchor="middle" font-size="9" fill="#586672">'+latest+'</text>'+
   '<line x1="180" y1="27" x2="180" y2="167" stroke="#84909c" stroke-dasharray="5 4" stroke-width="1.5"/>'+
   '<text x="180" y="36" text-anchor="middle" font-size="8" fill="#85919b">AXE INITIAL</text>'+
   rect(contact-b,108-b/2,b,'#16804b')+rect(contact,108-s/2,s,'#bb3e42')+
   '<line x1="'+contact+'" y1="'+Math.max(38,108-Math.max(b,s)/2-6)+'" x2="'+contact+'" y2="'+Math.min(151,108+Math.max(b,s)/2+6)+'" stroke="#40515d" stroke-width="1.2"/>'+
   indicator+
   '<text x="78" y="173" text-anchor="middle" font-size="9" fill="#16804b">ACHAT '+buy.toFixed(3)+' BTC</text>'+
   '<text x="282" y="173" text-anchor="middle" font-size="9" fill="#bb3e42">VENTE '+sell.toFixed(3)+' BTC</text>'+
   '<text x="180" y="192" text-anchor="middle" font-size="11" font-weight="700" fill="'+(pd==='long'?'#16804b':pd==='short'?'#bb3e42':'#56636c')+'">PRIX '+esc(money(price))+'</text>'+
   '</svg>'+
   '<div class="el-foot">Les carrés restent accolés : tailles ∝ volumes, leur position commune suit le prix et non le plus gros carré. Translation normalisée à l’amplitude 3m ('+money(q.priceRangeUsd)+'). '+Number(q.sampleCount||0)+' transactions publiques OKX.</div></div>';
}
function display(x){
 const h=x&&x.elasticObserverShadow||null;
 if(!h)return '<div class="el-wrap"><b>ELASTIC v0.5</b> · attente de la première évaluation</div>';
 const cv=h.conversion||{},ma=h.ma||{},fl=h.flow||{},b=h.boundary||{},ctx=h.context||{};
 const dir=h.mcbProposal||null,conv=h.conviction||{};
 const mfpart=p=>pair(p);
 const markup='<div class="el-wrap"><div class="el-head"><b>ELASTIC v0.5.1 · MÉMOIRE COMMUNE</b>'+
  '<span>SHADOW / aucune autorité de trading</span></div>'+
  '<div class="el-overview">MCB propose <b class="'+tone(dir)+'">'+esc((dir||'indécis').toUpperCase())+'</b>'+
  ' · trajectoire 15m <b class="'+tone(h.mcbStructural)+'">'+esc((h.mcbStructural||'—').toUpperCase())+'</b>'+
  ' · prix <b class="'+tone(h.priceDirection)+'">'+esc((h.priceDirection||'—').toUpperCase())+'</b></div>'+
  '<div class="el-conviction"><b>CONVICTION / ticker</b> '+esc(conv.tickerConfirmed?'CONFIRMED':conv.tickerStatus||'NOT_CONFIRMED')+' · <b>PM Live</b> '+cnum(cv.pmLive,1,fromDelta(0,cv.pmLive))+' $ · PM3/5 '+esc(conv.pm3Pm5Aligned?'ALIGNÉS':'EN OBSERVATION')+' · '+esc(conv.label||'UNDER_OBSERVATION')+'</div>'+
  '<div class="el-grid">'+
   tfRow('MCB 15',h.shared&&h.shared.MCB15)+
   tfRow('MCB 3',h.shared&&h.shared.MCB3)+
   '<div class="el-section"><div class="el-section-title">FLOW</div>'+
   '<div class="el-measure">MF15 '+mfpart(fl.mf15)+' · MF3 '+mfpart(fl.mf3)+'</div>'+
   '<div class="el-measure">Mémoire <b class="'+tone(fl.memoryDirection)+'">'+esc(fl.memoryDirection||'—')+'</b> · horizon '+esc(fl.memoryHorizon||'—')+'</div></div>'+
   '<div class="el-section"><div class="el-section-title">MA · épisodes confirmés</div>'+
   ['3m','15m'].map(tf=>{const z=ma[tf]||{};return '<div class="el-measure">MA'+(tf==='3m'?'3':'15')+' '+cnum(z.distanceUsd,1,fromDelta(0,z.distanceUsd))+' $'+
     ' · '+esc(z.state||'UNOBSERVED')+' · '+Number(z.retestCount||0)+' retests · '+Number(z.confirmedContactBars||0)+' bougies contact</div>';}).join('')+'</div>'+
   '<div class="el-section"><div class="el-section-title">CONVERSION <small>qualités anglaises · hypothèses descriptives</small></div>'+
   '<div class="el-measure">PM3 '+cnum(cv.pm3,1,fromDelta(0,cv.pm3))+' $ · PM5 '+cnum(cv.pm5,1,fromDelta(0,cv.pm5))+
   ' $ · PM Live '+cnum(cv.pmLive,1,fromDelta(0,cv.pmLive))+' $</div>'+
   '<div class="el-measure">eff3 '+(n(cv.efficiency3m)!==null?Math.round(cv.efficiency3m*100)+' %':'—')+
   ' · yield/P75 '+(n(cv.yieldVsP75)!==null?Number(cv.yieldVsP75).toFixed(2)+'×':'—')+
   ' · effort/P75 '+(n(cv.effortVsP75)!==null?Number(cv.effortVsP75).toFixed(2)+'×':'—')+'</div>'+
   '<div class="el-measure">Qualité <b class="'+tone(cv.direction)+'">'+esc(cv.quality||'UNCLASSIFIED')+'</b>'+
    (cv.temporalQuality?' · évolution '+esc(cv.temporalQuality):'')+
   ' · direction <b class="'+tone(cv.direction)+'">'+esc(cv.direction||'non établie')+'</b></div></div>'+
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
   '</div>'+
   effort(h)+
   '<details id="elastic-chronology" class="el-chronology"'+(window.elasticHistoryState&&window.elasticHistoryState.open?' open':'')+'>'+
   '<summary>CHRONOLOGIE · mémoire persistante <span class="el-old">(cliquer pour ouvrir / refermer)</span></summary>'+
   '<div class="el-history-head"><label>Fenêtre <select id="elastic-history-hours"><option value="6">6 h</option><option value="24">24 h</option><option value="48">48 h</option></select></label>'+
   '<label>Famille <select id="elastic-history-family"><option value="">Toutes</option><option value="MCB15">MCB15</option><option value="MCB3">MCB3</option><option value="FLOW">FLOW</option><option value="MA">MA</option><option value="CONVERSION">CONVERSION</option><option value="BOUNDARY">BOUNDARY</option><option value="CONTEXT">CONTEXT</option></select></label></div>'+
   '<div id="elastic-history" class="el-history-list">Ouvre la chronologie pour charger les événements.</div>'+
   '<button type="button" id="elastic-history-more" class="el-more" hidden>Afficher les événements plus anciens</button></details>'+
   '<div class="el-foot">Heure observée distincte de la bougie source. Les états remplacés restent dans le journal ; aucun double comptage E3/E15 et BW/LBW.</div>'+
   '</div>';
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
})();
