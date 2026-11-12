'use strict';
/**
 * BOONO-TV · État vivant 4 chapitres — 11/11/2026.
 *
 * Display-only projection of V5.4.3 read-only data from Amsterdam.
 * Text and timestamps are NOT taken from the original PDF as fixed values.
 */
(function(){
 const Q=s=>document.querySelector(s);
 const clean=x=>String(x===null||x===undefined?'—':x).replace(/[&<>"']/g,
   c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const num=x=>x===null||x===undefined||x===''||!Number.isFinite(Number(x))?null:Number(x);
 const fmt=(x,decimal=1,sign=false)=>{
   const n=num(x);if(n===null)return '—';
   const t=n.toLocaleString('fr-FR',{minimumFractionDigits:decimal,maximumFractionDigits:decimal});
   return sign&&n>0?'+'+t:t;
 };
 const time=t=>{
   const n=num(t);if(n===null||n<=0)return '—';
   return new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Stockholm',
     hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(n));
 };
 const polarity=d=>['long','up'].includes(String(d||'').toLowerCase())?'up':
   ['short','dn','down'].includes(String(d||'').toLowerCase())?'down':'neutral';
 const direction=d=>polarity(d)==='up'?'UP':polarity(d)==='down'?'DN':'—';
 // Display-only classification: the structural trajectory code names the
 // MOST RECENT confirmed LBW pivot, NOT an independently proven BTC trend.
 // Never translate ASCENT_ACTIVE directly into RETOURNEMENT_UP.
 const pivotName=state=>state==='ASCENT_ACTIVE'?'CREUX LBW15 CONFIRMÉ':
   state==='DESCENT_ACTIVE'?'CRÊTE LBW15 CONFIRMÉE':'PIVOT LBW15 —';
 const phaseName=(phase,dir)=>{
   const name=String(phase||'');
   if(name==='STRUCTURAL_CONTINUATION')
     return 'CONTINUATION MCB '+direction(dir);
   if(name==='STRUCTURAL_REVERSAL_FORMING')
     return 'RETOURNEMENT '+direction(dir)+' · EN FORMATION';
   if(name==='AWAIT_TACTICAL_ALIGNMENT')
     return 'ATTENTE ALIGNEMENT 3m/15m';
   if(name==='TACTICAL_RESPIRATION')
     return 'RESPIRATION TACTIQUE '+direction(dir);
   return name==='STRUCTURE_UNKNOWN'?'STRUCTURE NON QUALIFIÉE':name||'—';
 };
 const phaseBadge=(phase,dir)=>{
   const name=String(phase||'');
   const title=' title="Nomenclature native : '+clean(name||'—')+'"';
   if(name==='STRUCTURAL_CONTINUATION')return '<b class="tv-phase-label"'+
     title+'>CONTINUATION</b> MCB '+signal(dir);
   if(name==='STRUCTURAL_REVERSAL_FORMING')return '<b class="tv-phase-label"'+
     title+'>RETOURNEMENT</b> '+signal(dir)+' · EN FORMATION';
   if(name==='TACTICAL_RESPIRATION')return '<b class="tv-phase-label"'+
     title+'>RESPIRATION TACTIQUE</b> '+signal(dir);
   return '<b class="tv-phase-label"'+title+'>'+clean(phaseName(phase,dir))+'</b>';
 };
 // Typography only: values never acquire a different interpretation.
 const indicator=word=>'<span class="tv-indicator">'+clean(word)+'</span>';
 const signed=(value,decimals=1)=>'<b class="tv-result tv-'+
   (num(value)===null?'muted':Number(value)>0?'up':Number(value)<0?'down':'neutral')+
   '">'+clean(fmt(value,decimals,true))+'</b>';
 const signal=(value)=>'<b class="tv-direction tv-'+polarity(value)+'">'+
   clean(direction(value))+'</b>';
 function slopeStyle(a,b){
   if(num(a)===null||num(b)===null)return 'muted';
   return Number(b)>Number(a)?'up':Number(b)<Number(a)?'down':'neutral';
 }
 function pair(v,{past='confirmed',next='live'}={}){
   const one=v?.[past],two=v?.[next];
   return '<span class="tv-prior">'+clean(fmt(one,1,true))+'</span>'+
    '<span class="tv-separator"> / </span>'+
    '<b class="tv-current tv-'+slopeStyle(one,two)+'">'+clean(fmt(two,1,true))+'</b>';
 }
 function evidence(label,html,kind=''){
   return '<div class="tv-evidence '+kind+'"><strong>'+clean(label)+'</strong> '+html+'</div>';
 }
 function info(label,body,subClass=''){
   return '<div class="tv-evidence '+subClass+'"><span class="tv-label">'+clean(label)+
     '</span> '+body+'</div>';
 }
 function eventLine(tf,cross){
   const word='Cross'+tf;
   if(!cross||!cross.observedAt)return '<div class="tv-reading">'+
     indicator(word)+' — · aucun événement récent documenté</div>';
   const bw=cross.oscillatorAtEvent?.bw,lbw=cross.oscillatorAtEvent?.lbw;
   const age=num(cross.ageMinutes),since=num(cross.deltaSinceEvent);
   return '<div class="tv-reading">'+indicator(word)+' '+signal(cross.direction)+
     ' '+clean(time(cross.observedAt))+' · '+
     (age===null?'—':Math.floor(Math.max(0,age))+'min')+
     ' · '+indicator('BW/LBW')+' '+clean(fmt(bw,1,true))+' / '+clean(fmt(lbw,1,true))+
     ' · Since '+signed(since)+' $</div>';
 }
 function tag(n,title,detail){return '<div class="tv-block-title"><b class="tv-block-index">'+n+'</b>'+
   '<strong>'+clean(title)+'</strong>'+(detail?'<span>'+detail+'</span>':'')+'</div>';}
 function lineNames(items){return items.map(([label,e])=>
    '<span class="tv-event"><b>'+clean(label)+'</b> '+clean(time(e?.observedAt))+'</span>').join(' <span class="tv-arrow">→</span> ');}
 function renderHtml(v){
   if(v?.status!=='DATA_RECENT'){
     return '<section class="tv-state-block"><div class="tv-block-title"><strong>ÉTAT VIVANT · OBSERVATION</strong></div>'+
      '<p class="tv-state-unavailable">Source V5.4.3 périmée ou non reçue. Aucune ancienne trajectoire, position ou preuve ne sera présentée comme actuelle.</p></section>';
   }
   const a=v.trajectory||{},b=v.tactical||{},p=v.place||{},
         c=v.causal||{},s=v.structure||{},o=v.offensive||{},pos=v.position||null;
   const phase=s.phase||'—';
   const alignment=b.alignment==='ALIGNED'?'Alignement confirmé':
     b.alignment==='TACTICAL_OPPOSES_15M'?'Tactique opposée au directeur':'Alignement indéterminé';
   const rank=num(s.priceRangeRank);
   const placeLabel=[p.candidate?
      '<b class="tv-direction tv-'+polarity(p.candidate)+'">'+
        clean(String(p.candidate).toUpperCase())+'</b>':null,
     p.extended?'ÉTENDU':null,p.rangeZone?clean(p.rangeZone):null].filter(Boolean).join(' · ');
   const hh=p.h4||{};
   const h4=hh.status==='CONFIRMED'?
      '<div class="tv-reading"><b>4h</b> '+indicator('BW4')+' '+pair(hh.bw,{past:'previous',next:'confirmed'})+
      '　 '+indicator('LBW4')+' '+pair(hh.lbw,{past:'previous',next:'confirmed'})+
      '<span class="tv-time"> source '+clean(time(hh.sourceAt))+' · connu '+clean(time(hh.availableAt))+'</span></div>'+
      '<div class="tv-reading">'+indicator('E4 confirmé')+' '+
      (hh.event?
       signal(hh.event.direction)+
       ' · source '+clean(time(hh.event.sourceAt))+' · connu '+clean(time(hh.event.availableAt))+
       ' · '+indicator('LBW4')+' '+clean(fmt(hh.event.lbw,1,true)):'— · aucun événement dans la fenêtre')+
       '</div>':
      '<div class="tv-reading"><b>4h</b> — · bougies confirmées indisponibles</div>';
   const positionHtml=pos?
     '<div class="tv-position"><b>POSITION <span class="tv-direction tv-'+polarity(pos.direction)+'">'+
      clean(String(pos.direction).toUpperCase())+'</span></b> · entrée '+
      clean(fmt(pos.entryPrice))+' $ · '+clean(time(pos.entryAt))+
      ' · P&L net potentiel '+signed(pos.potentialNetPnlUsd)+' $</div>'+
     '<div class="tv-reading tv-position-metrics">MFE '+clean(fmt(pos.mfePriceUsd))+
      ' $ BTC · MAE '+clean(fmt(pos.maePriceUsd))+' $ · floor '+
      (pos.floorAdvisory?'indicatif non-exécutoire':'ancien exécutoire')+' '+
      clean(fmt(pos.gainFloorUsd))+' $ BTC · invalidation '+clean(fmt(pos.invalidationPrice))+' $</div>':
     '<div class="tv-position"><b>POSITION</b> FLAT · aucune position PAPER ouverte</div>';
   return [
     '<section class="tv-state-block tv-trajectory">'+
       tag('1','Trajectoire','<b class="tv-pivot" title="État natif MCB15 : '+
         clean(a.strategicState||'—')+'">'+clean(pivotName(a.strategicState))+
         '</b> · biais MCB '+signal(a.director)+' · offensive '+signal(a.offensive))+
       '<div class="tv-reading"><b>MCB15 · DIRECTEUR</b> '+indicator('BW')+' '+pair(a.bw)+
         '　'+indicator('LBW')+' '+pair(a.lbw)+'</div>'+
       eventLine('15',a.cross)+
       '<div class="tv-reading">'+indicator('MF15')+' '+pair(a.mf)+
        ' · flow '+clean(fmt(a.flowBtcPerSec,2))+' BTC/s'+
        ' · '+indicator('MF15 pente')+' '+signed(a.mf15Slope,2)+
        ' · '+indicator('MF15 Live')+' <b class="tv-current tv-'+
          slopeStyle(a.mf?.confirmed,a.mf15Live)+'">'+clean(fmt(a.mf15Live,2,true))+'</b></div>'+
       '</section>',
     '<section class="tv-state-block tv-tactical">'+
       tag('2','Tactique',phaseBadge(b.phase,
         ['STRUCTURAL_REVERSAL_FORMING','TACTICAL_RESPIRATION'].includes(b.phase)?p.candidate:a.director)+
         ' · '+clean(alignment))+
       '<div class="tv-reading"><b>MCB3 · TACTIQUE</b> '+indicator('BW')+' '+pair(b.bw)+
        '　'+indicator('LBW')+' '+pair(b.lbw)+'</div>'+
       eventLine('3',b.cross)+
       '<div class="tv-reading">'+indicator('MF3')+' '+pair(b.mf)+
        ' · '+indicator('MA3')+' distance '+signed(b.ma3?.distanceUsd)+' $ · '+
        clean(b.ma3?.state||'—')+' · '+
        (num(b.ma3?.retests)===null?'—':clean(String(b.ma3.retests)))+
        ' retests · '+(num(b.ma3?.confirmedContactBars)===null?'—':clean(String(b.ma3.confirmedContactBars)))+
        ' bougies contact</div>'+
       '</section>',
     '<section class="tv-state-block tv-place">'+
       tag('3','Lieu','<b>'+placeLabel+'</b>')+h4+
       '</section>',
     '<section class="tv-state-block tv-causal">'+
       tag('4','CHAÎNE CAUSALE · observation','')+
       '<div class="tv-causal-chain tv-evidence"><b>'+indicator('PM Live')+
        ' '+signed(c.pmLiveUsd)+' $</b> · '+
        lineNames([['Cross3',c.cross3],['E3 Live',c.e3Live],['E3 confirmé',c.e3Confirmed],
         ['Cross15',c.cross15],['E15 Live',c.e15Live],['E15 confirmé',c.e15Confirmed]])+'</div>'+
       evidence('PHASE STRUCTURELLE',phaseBadge(phase,
          ['STRUCTURAL_REVERSAL_FORMING','TACTICAL_RESPIRATION'].includes(phase)?p.candidate:a.director)+
         ' · campagne '+clean(s.campaignId||'—')+
        ' · maturité rang2h '+clean(fmt(rank,1))+
        ' · '+indicator('MF15 sur 2h')+' '+signed(s.mf15History2h)+
        ' · maturité extension '+(s.matureAfterExtension?'AVANCÉE':'mesurée'),'tv-phase')+
       positionHtml+
       evidence('MATURITÉ OFFENSIVE',clean(o.classification||'—')+
         ' · début prix 4h '+clean(time(o.priceOrigin4hAt))+
         ' · progression '+clean(fmt(o.progress4hUsd,1))+
         ' $ BTC · bord 2h '+(o.atPrice2hEdge?'oui':'non')+
         ' · LBW15/prix '+(o.oppositeDivergenceForming?'divergence opposée en formation':'pas de preuve opposée')+
         ' · '+indicator('PM marginal')+' '+(o.conversionFatigue?'s’essouffle':'non invalidé'),'tv-offensive')+
       '</section>'
   ].join('');
 }
 function render(snapshot){
   const root=Q('#stateRows');if(!root)return;
   root.classList.add('tv-four');
   root.innerHTML=renderHtml(snapshot?.tvLiving);
   root.dataset.tvSource=String(snapshot?.tvLiving?.status||'NO_SOURCE');
   root.setAttribute('aria-label','État vivant : Trajectoire, Tactique, Lieu, Chaîne causale');
 }
 window.BoonoTVLivingState={render,renderHtml};
})();
