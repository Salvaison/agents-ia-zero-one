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
     return '<section class="tv-state-block tv-state-unavailable-block">'+
      tag('!','ÉTAT VIVANT · OBSERVATION','')+
      '<div class="tv-state-unavailable">Source V5.4.3 périmée ou non reçue. '+
      'Aucune ancienne trajectoire, position ou preuve ne sera présentée comme actuelle.</div>'+
      '</section>';
   }
   const a=v.trajectory||{},b=v.tactical||{},p=v.place||{},
     c=v.causal||{},s=v.structure||{},o=v.offensive||{},pos=v.position||null;
   const phase=s.phase||b.phase||'—',m15=a.ma15||{},m3=b.ma3||{},
     rank=num(s.priceRangeRank);
   const count=x=>num(x)===null?'—':clean(String(x));
   // Direction color describes candidate direction; a CREUX LBW is not a
   // confirmed reversal of the multi-day BTC price trend.
   const dirPiv='<b class="tv-pivot" title="État natif MCB15 : '+
     clean(a.strategicState||'—')+'">'+clean(pivotName(a.strategicState))+'</b>';
   const phaseText=phaseBadge(b.phase,
     ['STRUCTURAL_REVERSAL_FORMING','TACTICAL_RESPIRATION'].includes(b.phase)?
      p.candidate:a.director);
   const maRow=(tf,ma)=>indicator('MA'+tf)+' distance '+signed(ma?.distanceUsd)+
     ' $ · '+clean(ma?.state||'—')+' · '+count(ma?.retests)+' retests · '+
     count(ma?.confirmedContactBars)+' bougies contact';
   const crossShort=(tf,item)=>{
     if(!item?.observedAt)return '<div class="tv-reading">'+indicator('Cross'+tf)+
       ' — · événement indisponible</div>';
     const age=num(item.ageMinutes),since=num(item.deltaSinceEvent);
     return '<div class="tv-reading"><b>'+indicator('Cross'+tf)+' '+
       signal(item.direction)+'</b> · '+indicator('LBW')+' '+
       clean(fmt(item.oscillatorAtEvent?.lbw))+' · '+clean(time(item.observedAt))+
       ' · Since '+(age===null?'—':Math.floor(Math.max(0,age))+'min')+
       ' '+signed(since)+' $</div>';
   };
   const rangeRow=(r,name)=>{
     if(!r)return '<div class="tv-reading tv-range">'+indicator(name)+
       ' · triplet VAL/POC/VAH non enregistré</div>';
     const zone=String(r.zone||'—');
     // BELOW_VAL is a geometric fact, not defended territorial LOSS.
     const status=zone==='BELOW_VAL'?'SOUS VAL':
       zone==='ABOVE_VAH'?'AU-DESSUS VAH':zone==='ABOVE_POC'?'ABOVE POC':
       zone==='BELOW_POC'?'BELOW POC':'AU POC';
     const pct=zone==='ABOVE_POC'||zone==='BELOW_POC'||zone==='AT_POC'?
       r.fairValuePct:r.positionPct;
     const ref=name==='DailyRange'?'VAL':'VAH';
     const dist=name==='DailyRange'?r.distanceFromValUsd:r.distanceFromVahUsd;
     const tone=zone==='BELOW_VAL'?'down':zone==='ABOVE_VAH'?'up':
       zone==='ABOVE_POC'?'up':zone==='BELOW_POC'?'down':'neutral';
     return '<div class="tv-reading tv-range">'+indicator(name)+
       ' <span class="tv-range-bounds">VAH → VAL</span> · '+
       '<b class="tv-direction tv-'+tone+'">'+clean(status)+'</b> '+
       signed(pct,1)+' % · depuis '+clean(ref)+' '+signed(dist)+' $</div>';
   };
   const h4=p.h4||{};
   const h4Row=h4.status==='CONFIRMED'?
     '<div class="tv-reading"><b>4h</b> '+indicator('BW4')+' '+
       pair(h4.bw,{past:'previous',next:'confirmed'})+'　'+indicator('LBW4')+
       ' '+pair(h4.lbw,{past:'previous',next:'confirmed'})+
       ' · '+indicator('E4 Live')+' —</div>'+
     '<div class="tv-reading">'+indicator('E4 confirmé')+' '+
       (h4.event?signal(h4.event.direction)+' · '+clean(time(h4.event.availableAt))+
        ' · '+indicator('LBW4')+' '+signed(h4.event.lbw):
        '— · aucun signal confirmé documenté')+'</div>':
     '<div class="tv-reading"><b>4h</b> — · données confirmées indisponibles</div>';
   const locationHead=(pos?.direction?
       '<b class="tv-direction tv-'+polarity(pos.direction)+'">'+
         clean(String(pos.direction).toUpperCase())+'</b>':p.candidate?
       '<b class="tv-direction tv-'+polarity(p.candidate)+'">'+
         clean(String(p.candidate).toUpperCase())+'</b>':'—')+
     (b.phase==='AWAIT_TACTICAL_ALIGNMENT'&&p.candidate?
       ' · ATTENTE '+signal(p.candidate):'')+
     (p.recordedRanges?.daily?.zone==='BELOW_VAL'?' · SOUS VAL DAILY':'');
   const posHeadline=pos?
      'POSITION '+signal(pos.direction):'POSITION · FLAT';
   const positionRows=pos?
     '<div class="tv-reading"><b>entrée</b> '+clean(fmt(pos.entryPrice))+' $ · '+
       clean(time(pos.entryAt))+' · <b>P&L net potentiel</b> '+
       signed(pos.potentialNetPnlUsd)+' $</div>'+
     '<div class="tv-reading tv-position-metrics">'+
       indicator('MFE')+' '+clean(fmt(pos.mfePriceUsd))+' $ BTC · '+
       indicator('MAE')+' '+clean(fmt(pos.maePriceUsd))+' $ · floor '+
       (pos.floorAdvisory?'indicatif non-exécutoire':'ancienne protection')+' '+
       clean(fmt(pos.gainFloorUsd))+' $ · invalidation '+
       clean(fmt(pos.invalidationPrice))+' $</div>':
     '<div class="tv-reading">Aucune position PAPER ouverte</div>';
   return [
     '<section class="tv-state-block tv-mcb15">'+
       tag('1','MCB15 · DIRECTEUR',dirPiv+' · offensive '+signal(a.offensive))+
       '<div class="tv-reading">'+indicator('BW')+' '+pair(a.bw)+
          '　'+indicator('LBW')+' '+pair(a.lbw)+'</div>'+
       crossShort('15',a.cross)+
       '<div class="tv-reading">'+indicator('MF15')+' '+pair(a.mf)+
         ' · flow '+clean(fmt(a.flowBtcPerSec,2))+' BTC/s · '+
         indicator('MF15 pente')+' '+signed(a.mf15Slope,2)+
         ' · '+indicator('MF15 Live')+' '+signed(a.mf15Live,2)+
         ' · '+maRow('15',m15)+'</div>'+
       '</section>',
     '<section class="tv-state-block tv-mcb3">'+
       tag('2','MCB3 · TACTIQUE',phaseText)+
       '<div class="tv-reading">'+indicator('BW')+' '+pair(b.bw)+
         '　'+indicator('LBW')+' '+pair(b.lbw)+'</div>'+
       crossShort('3',b.cross)+
       '<div class="tv-reading">'+indicator('MF3')+' '+pair(b.mf)+
        ' · '+maRow('3',m3)+'</div>'+
       '</section>',
     '<section class="tv-state-block tv-place">'+
       tag('3','LIEU STRUCTUREL',locationHead)+
       h4Row+
       rangeRow(p.recordedRanges?.daily,'DailyRange')+
       rangeRow(p.recordedRanges?.big,'BigRange')+
       '</section>',
     '<section class="tv-state-block tv-causal">'+
       tag('4','CHAÎNE CAUSALE','OBSERVATION')+
       '<div class="tv-reading">'+indicator('PM Live')+' '+
         signed(c.pmLiveUsd)+' $ · '+
         lineNames([['Cross3',c.cross3],['E3 Live',c.e3Live],
          ['E3 confirmé',c.e3Confirmed],['Cross15',c.cross15],
          ['E15 Live',c.e15Live],['E15 confirmé',c.e15Confirmed]])+'</div>'+
       '<div class="tv-reading tv-structural-phase"><b>PHASE STRUCTURELLE</b> '+
         phaseBadge(phase,['STRUCTURAL_REVERSAL_FORMING',
          'TACTICAL_RESPIRATION'].includes(phase)?p.candidate:a.director)+
         ' · campagne '+clean(s.campaignId||'—')+
         ' · maturité rang2h '+clean(fmt(rank,1))+
         ' · '+indicator('MF15 sur 2h')+' '+signed(s.mf15History2h)+
         ' · maturité extension '+(s.matureAfterExtension?'AVANCÉE':'mesurée')+
         '</div></section>',
     '<section class="tv-state-block tv-position-block">'+
       tag('5','POSITION',pos?signal(pos.direction):'FLAT')+
       positionRows+
       '<div class="tv-reading tv-offensive"><b>MATURITÉ OFFENSIVE</b> '+
         clean(o.classification||'—')+
         ' · début prix 4h '+clean(time(o.priceOrigin4hAt))+
         ' · progression '+clean(fmt(o.progress4hUsd))+
         ' $ BTC · bord 2h '+(o.atPrice2hEdge?'oui':'non')+
         ' · '+indicator('LBW15/prix')+' '+
         (o.oppositeDivergenceForming?'divergence opposée en formation':'pas de preuve opposée')+
         ' · '+indicator('PM marginal')+' '+
         (o.conversionFatigue?'s’essouffle':'non invalidé')+
       '</div></section>'
   ].join('');
 }
 function render(snapshot){
   const root=Q('#stateRows');if(!root)return;
   root.classList.remove('tv-four');root.classList.add('tv-five');
   root.innerHTML=renderHtml(snapshot?.tvLiving);
   root.dataset.tvSource=String(snapshot?.tvLiving?.status||'NO_SOURCE');
   root.setAttribute('aria-label','État vivant : MCB15, MCB3, Lieu structurel, Chaîne causale et Position');
 }
 window.BoonoTVLivingState={render,renderHtml};
})();
