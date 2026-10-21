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
 const q=x&&x.effort||{};
 if(!q.available)return '<div class="el-duel-notice">Duel agressif acheteurs/vendeurs : volume directionnel indisponible pour cette fenêtre (ne pas substituer Effort/P75).</div>';
 const buy=Math.max(0,n(q.buyBtc)||0),sell=Math.max(0,n(q.sellBtc)||0),max=Math.max(buy,sell,0.00001);
 const sz=v=>Math.max(13,Math.round(Math.sqrt(v/max)*66));
 const b=sz(buy),s=sz(sell),price=q.priceNetUsd;
 const pd=fromDelta(0,price);
 return '<div class="el-duel"><div class="el-duel-title">Duel · transactions initiées 3m</div>'+
   '<div class="el-duel-grid"><div class="el-fighter"><span class="el-buy-square" style="width:'+b+'px;height:'+b+'px"></span>'+
   '<span class="el-up">Acheteurs '+buy.toFixed(3)+' BTC</span></div>'+
   '<div class="el-duel-line"><span>PRIX</span><b class="'+tone(pd)+'">'+money(price)+'</b></div>'+
   '<div class="el-fighter"><span class="el-sell-square" style="width:'+s+'px;height:'+s+'px"></span>'+
   '<span class="el-down">Vendeurs '+sell.toFixed(3)+' BTC</span></div></div>'+
   '<div class="el-foot">Surface des carrés ∝ volume agressif · prix = déplacement net indépendant · '+Number(q.sampleCount||0)+' transactions observées</div></div>';
}
function display(x){
 const h=x&&x.elasticObserverShadow||null;
 if(!h)return '<div class="el-wrap"><b>ELASTIC v0.5</b> · attente de la première évaluation</div>';
 const cv=h.conversion||{},ma=h.ma||{},fl=h.flow||{},b=h.boundary||{},ctx=h.context||{};
 const dir=h.mcbProposal||null;
 const mfpart=p=>pair(p);
 const markup='<div class="el-wrap"><div class="el-head"><b>ELASTIC v0.5 · MÉMOIRE COMMUNE</b>'+
  '<span>SHADOW / aucune autorité de trading</span></div>'+
  '<div class="el-overview">MCB propose <b class="'+tone(dir)+'">'+esc((dir||'indécis').toUpperCase())+'</b>'+
  ' · trajectoire 15m <b class="'+tone(h.mcbStructural)+'">'+esc((h.mcbStructural||'—').toUpperCase())+'</b>'+
  ' · prix <b class="'+tone(h.priceDirection)+'">'+esc((h.priceDirection||'—').toUpperCase())+'</b></div>'+
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
   '<div class="el-history-head"><b>CHRONOLOGIE · mémoire persistante</b>'+
   '<label>Fenêtre <select id="elastic-history-hours"><option value="6">6 h</option><option value="24">24 h</option><option value="48">48 h</option></select></label></div>'+
   '<div id="elastic-history" class="el-history-list">Chargement de l’historique…</div>'+
   '<div class="el-foot">Heure observée distincte de la bougie source. Les états remplacés restent dans le journal ; aucun double comptage E3/E15 et BW/LBW.</div>'+
   '</div>';
 return markup;
}
function date(ts){return n(ts)===null?'—':new Date(Number(ts)).toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function shortVal(v){
 if(v===null||v===undefined)return '—';
 if(typeof v==='object'){if(v.type)return v.type+' · '+date(v.sourceTs);if(v.to)return v.to;return JSON.stringify(v).slice(0,160);}
 return String(v);
}
window.elasticObserverHours=window.elasticObserverHours||6;
window.renderElasticObserverV05=display;
window.loadElasticObserverHistory=async function(){
 const out=document.getElementById('elastic-history'),sel=document.getElementById('elastic-history-hours');
 if(!out)return;
 if(sel){sel.value=String(window.elasticObserverHours);sel.onchange=()=>{
   window.elasticObserverHours=Number(sel.value)||6;window.loadElasticObserverHistory();
 };}
 try{
  const res=await fetch('/api/elastic-history?hours='+encodeURIComponent(window.elasticObserverHours),{cache:'no-store'});
  if(!res.ok)throw new Error('HTTP '+res.status);
  const j=await res.json(),events=j.events||[];
  const newest=events.slice().reverse();
  out.innerHTML='<div class="el-foot">'+events.length+' transitions'+
   (j.truncated?' · limite de 3 000 entrées atteinte':'')+
   ' · historique disponible depuis la mise en service de v0.5</div>'+
   (newest.length?newest.map(e=>{
     const dir=e.direction||null;
     const before=shortVal(e.previous),after=shortVal(e.current);
     const old=before==='—'?'':' <span class="el-old">'+esc(before)+'</span> → ';
     return '<div class="el-hist-row"><span class="el-old">'+esc(date(e.observedAt))+'</span> '+
      '<b>'+esc(e.family)+' / '+esc(e.key)+'</b> '+
      '<span class="'+tone(dir)+'">'+esc(e.type)+'</span> '+
      old+'<b class="'+tone(dir)+'">'+esc(after)+'</b>'+
      ' · prix '+money(e.price)+
      (e.sourceTs&&e.sourceTs!==e.observedAt?' <span class="el-old">· source '+esc(date(e.sourceTs))+'</span>':'')+
      '</div>';
   }).join(''):'<div class="el-foot">Aucune transition encore enregistrée sur cette fenêtre.</div>');
 }catch(err){out.textContent='Historique non disponible : '+err.message;}
};
})();
