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
 if(!q.available)return '<div class="el-duel"><div class="el-section-title">DUEL · 3m</div>'+conv+
   '<div class="el-duel-notice">Volumes directionnels indisponibles.</div></div>';
 const buy=Math.max(0,n(q.buyBtc)||0),sell=Math.max(0,n(q.sellBtc)||0);
 const max=Math.max(buy,sell,.00001),sz=v=>Math.max(12,Math.round(Math.sqrt(v/max)*52));
 const b=sz(buy),s=sz(sell),price=n(q.priceNetUsd)||0;
 const dir=fromDelta(0,price),range=Math.max(n(q.priceRangeUsd)||0,1);
 const plotX=delta=>170+Math.max(-1,Math.min(1,delta/range))*64;
 const contact=Math.round(plotX(price)),centerY=58;
 // Price path is drawn UNDER the two translucent effort squares.
 // Shared horizontal axis = BTC displacement; vertical = time oldest -> newest.
 const trail=(q.priceTrail||[]).filter(p=>n(p.ts)!==null&&n(p.deltaUsd)!==null);
 const t0=trail.length?Number(trail[0].ts):0,t1=trail.length?Number(trail[trail.length-1].ts):0;
 const pricePath=trail.length>=2&&t1>t0?'M'+trail.map(p=>
   plotX(Number(p.deltaUsd)).toFixed(1)+' '+(109-(Number(p.ts)-t0)/(t1-t0)*51).toFixed(1)
 ).join(' L'):'';
 const priceLayer=pricePath?
   '<path class="el-price-underlay" d="'+pricePath+'" stroke="#ffffff" stroke-width="5" opacity=".86" fill="none" stroke-linejoin="round"/>'+
   '<path class="el-price-trail" d="'+pricePath+'" stroke="#2069a2" stroke-width="2.5" opacity=".9" fill="none" stroke-linejoin="round"/>'+
   '<circle cx="'+plotX(price).toFixed(1)+'" cy="58" r="2.4" fill="#2069a2"/>':'';
 const square=(x,y,w,col)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+w+
   '" rx="3" fill="'+col+'" fill-opacity=".12" stroke="'+col+'" stroke-opacity=".75" stroke-width="1.8"/>';
 const ticks=[-2,-1,0,1,2].map(i=>{
   const x=170+i*32,v=i*range/2;
   return '<line x1="'+x+'" y1="114" x2="'+x+'" y2="120" stroke="#93a0aa" stroke-width="1"/>'+
     '<text x="'+x+'" y="133" text-anchor="middle" fill="#71808c" font-size="8">'+fmt(v,0)+'</text>';
 }).join('');
 return '<div class="el-duel"><div class="el-section-title">DUEL · 3m</div>'+conv+
   '<div class="el-duel-volumes"><span class="el-up">ACHAT '+buy.toFixed(3)+' BTC</span>'+
   '<span class="el-down">VENTE '+sell.toFixed(3)+' BTC</span></div>'+
   '<svg role="img" aria-label="Carrés acheteur et vendeur accolés, prix déplaçant les deux, graduation en dollars BTC" viewBox="0 0 340 160" width="100%" xmlns="http://www.w3.org/2000/svg">'+
   '<rect x="5" y="3" width="330" height="154" rx="6" fill="#fafbfc" stroke="#d9e0e6"/>'+
   '<line x1="170" y1="10" x2="170" y2="114" stroke="#9ca8b2" stroke-dasharray="4 3" stroke-width="1.5"/>'+
   '<text x="9" y="56" font-size="7.6" fill="#657888">NOW</text>'+
   '<text x="9" y="108" font-size="7.6" fill="#657888">−3m</text>'+
   priceLayer+
   square(contact-b,centerY-b/2,b,'#16804b')+square(contact,centerY-s/2,s,'#bb3e42')+
   '<line x1="'+contact+'" y1="'+(centerY-Math.max(b,s)/2-4)+'" x2="'+contact+'" y2="'+(centerY+Math.max(b,s)/2+4)+'" stroke="#586978" stroke-width="1"/>'+
   '<line x1="94" y1="114" x2="246" y2="114" stroke="#9eabb7" stroke-width="1"/>'+
   ticks+
   '<text x="170" y="149" text-anchor="middle" font-size="11" font-weight="750" fill="'+
     (dir==='long'?'#16804b':dir==='short'?'#bb3e42':'#53616e')+'">PRIX '+esc(money(price))+'</text></svg></div>';
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
 const markup='<div class="el-stack"><section class="el-wrap el-list-bubble"><div class="el-head"><b>ELASTIC v0.5.3 · MÉMOIRE COMMUNE</b>'+
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
})();
