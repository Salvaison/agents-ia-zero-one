const $=s=>document.querySelector(s);
const stateRows=$('#stateRows'),priceEl=$('#price'),versionEl=$('#version'),bubbleEl=$('#bubble'),boonoEl=$('#boono'),auditEl=$('#auditTable');
let snapshot=null,layerIndex=0;
const layers=['#layerCandles','#layerMcb','#layerAudit','#layerWaves'];
function fmt(v,d=1){const n=Number(v);return Number.isFinite(n)?n.toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—'}
function esc(s){return String(s??'—').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function cls(v){const s=String(v||'').toUpperCase();if(/PASS|ALIGNED|CONFIRMED|LONG|YES|ACTIVE|VALID/.test(s))return'good';if(/NO_TRADE|NOT_|BOUNDARY|REJECT|FAIL/.test(s))return'bad';if(/WAIT|OBSERVE|MIXED|NEUTRAL|CHOP/.test(s))return'warn';return''}
function row(k,v,sub=''){return '<div class="state-row"><div class="k">'+esc(k)+'</div><div class="v '+cls(v)+'">'+esc(v)+(sub?'<small>'+esc(sub)+'</small>':'')+'</div></div>'}
function compactReason(s,max=86){s=String(s||'—');return s.length>max?s.slice(0,max-1)+'…':s}
function clock(){const d=new Date(Date.now()+2*3600e3);$('#clock').textContent=d.toISOString().slice(11,19)}
setInterval(clock,1000);clock();
function renderState(s){
 const l=s.living||{},th=l.thesis||{},bg=l.background||{},sig=l.signal||{},st=l.setup||{},sr=l.structure||{},e15=l.e15||{},m3=l.mcb3||{},mf=l.mf15||{},pm=l.pm||{},tk=l.ticker||{},cx=l.context||{},rk=l.risk||{},ac=l.action||{},v3=l.v3Shadow||{};
 versionEl.textContent=s.version||'—'; priceEl.textContent=fmt(s.market&&s.market.price,1);
 $('#freshness').textContent='update '+new Date(s.generatedAt).toLocaleTimeString('fr-FR');
 const bgTxt='1H '+(bg.oneHour?.direction||'—')+'/'+(bg.oneHour?.phase||'—')+' · 4H '+(bg.fourHour?.direction||'—')+' · D '+(bg.daily?.direction||'—')+' · '+(bg.macroShadow||'—');
 const e15Txt=(e15.type||'—')+' · '+(e15.class||'—')+' · LBW '+fmt(e15.extremeLbw,2)+' → '+fmt(e15.currentLbw,2)+' · rec '+fmt(e15.recoveryPct,1)+'%';
 const m3Txt='LBW '+fmt(m3.lbw,2)+' · ext '+fmt(m3.extremeLbw,2)+' · slope '+fmt(m3.slopeLbw,2)+' · '+(m3.structuralState||'—');
 const mfTxt=(mf.temporalState||mf.state||'—')+' · mem '+(mf.memoryDirection||'—')+' '+(mf.horizon||'')+' · tactical '+(mf.tacticalDirection||'—');
 const pmTxt=(pm.status||'—')+' · PM '+fmt(pm.moveUsd,1)+'$ · net3m '+fmt(pm.net3mUsd,1)+'$ · effic '+fmt(pm.efficiency3mPct,1)+'%';
 const tkTxt=(tk.status||'—')+' · cadence '+fmt(tk.cadence,2)+' · flow '+fmt(tk.flow,3)+' · terrain '+fmt(tk.terrain,2);
 const last=l.lastDecision||{};
 stateRows.innerHTML=[
 row('MCB THESIS',(th.state||'—')+(th.candidateDirection?' → '+th.candidateDirection:''),'autorité '+(th.authority||'MCB')),
 row('MATURITÉ',th.maturity||'—',th.maturityGate?.nested3m?.state||''),
 row('BACKGROUND MCB',bgTxt),
 row('MCB SIGNAL',(sig.type||'—')+' @ '+fmt(sig.value,1)+' · age '+fmt(sig.ageMinutes,0)+'m'),
 row('SETUP',(st.status||'—')+(st.direction?' → '+st.direction:''),compactReason(st.reason||st.reasons?.join(' + '),92)),
 row('STRUCTURE',(sr.state||'—')+' · room '+fmt(sr.roomToBoundaryUsd,1)+'$ · MARKET '+(sr.marketQuality||'—')),
 row('E15 / 15m',e15Txt,'prix depuis extrême '+fmt(e15.priceSinceExtremeUsd,1)+'$'),
 row('MCB 3m',m3Txt),
 row('MF15 / MÉMOIRE',mfTxt,(mf.candidateContext||'')+(mf.conversion?' · '+mf.conversion:'')),
 row('PM LIVE',pmTxt),
 row('TICKER',tkTxt,tk.confirmed?'confirmed':'not confirmed'),
 row('CONTEXTE',cx.status||'—',compactReason(cx.reason,74)),
 row('RISK','cap '+fmt(rk.capUsd,0)+'$ · R:R '+fmt(rk.rr,2)+' · entry '+(rk.entryAllowed?'YES':'NO'),compactReason(rk.reason,88)),
 row('ACTION V4',(ac.type||'—')+(ac.direction?' · '+ac.direction:''),compactReason(ac.reason,96)),
 row('V3 SHADOW',(v3.action||'—')+(v3.direction?' · '+v3.direction:''),compactReason(v3.reason,90)),
 row('Dernière décision',typeof last.action==='string'?last.action:(last.action?.type||'—'),compactReason(last.reason||last.ts,95))
 ].join('');
}
function canvasCtx(id){
 const c=$(id),r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
 const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
 if(c.width!==w||c.height!==h){c.width=w;c.height=h}
 const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return{x,w:r.width,h:r.height};
}
function line(ctx,pts,color,width=2){
 if(!pts.length)return;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();
}
function drawCandles(rows,id='#candlesCanvas'){
 const canvas=$(id);if(!canvas||!rows?.length)return;
 if(window.BoonoCharts){
   window.BoonoCharts.drawPrice(canvas,rows,{theme:'tv',grid:true,padding:{left:12,right:12,top:14,bottom:10},maxBodyWidth:7,maAbove:'#38d982',maBelow:'#ff4f5f'});
   return;
 }
 const {x,w,h}=canvasCtx(id);x.clearRect(0,0,w,h);
}
function drawOsc(rows,id='#mcbCanvas'){
 const {x,w,h}=canvasCtx(id);x.clearRect(0,0,w,h);if(!rows?.length)return;const pad=24,vals=rows.flatMap(r=>[r.lbw,r.bw,r.mf]).filter(Number.isFinite),mx=Math.max(20,...vals.map(Math.abs));
 const xp=i=>pad+i*(w-pad*2)/Math.max(1,rows.length-1),yp=v=>h/2-(v/mx)*(h*.42);
 x.strokeStyle='rgba(230,245,255,.28)';x.beginPath();x.moveTo(pad,h/2);x.lineTo(w-pad,h/2);x.stroke();
 line(x,rows.map((r,i)=>[xp(i),yp(r.lbw)]),'#e9edf0',2.2);line(x,rows.map((r,i)=>[xp(i),yp(r.bw)]),'#79858c',2);line(x,rows.map((r,i)=>[xp(i),yp(r.mf)]),'#f7c928',2.2);
}
function drawWaves(a,b){
 const {x,w,h}=canvasCtx('#waveCanvas');x.clearRect(0,0,w,h);const pad=22;
 function plot(rows,key,color,offset,scale){if(!rows?.length)return;const vals=rows.map(r=>r[key]).filter(Number.isFinite),mx=Math.max(15,...vals.map(Math.abs));const xp=i=>pad+i*(w-pad*2)/Math.max(1,rows.length-1),yp=v=>offset-(v/mx)*scale;line(x,rows.map((r,i)=>[xp(i),yp(r[key])]),color,2)}
 x.strokeStyle='rgba(255,255,255,.2)';x.beginPath();x.moveTo(pad,h*.28);x.lineTo(w-pad,h*.28);x.moveTo(pad,h*.74);x.lineTo(w-pad,h*.74);x.stroke();
 plot(b,'lbw','#dfe7ea',h*.28,h*.20);plot(b,'mf','#f3c928',h*.28,h*.20);plot(a,'lbw','#dfe7ea',h*.74,h*.20);plot(a,'mf','#f3c928',h*.74,h*.20);
}
function renderMarketCurtain(a,b){
 if(!window.BoonoCharts||!a?.length)return;
 const latest=Math.max(...a.map(r=>Number(r.ts)).filter(Number.isFinite),...(b||[]).map(r=>Number(r.ts)).filter(Number.isFinite));
 if(!Number.isFinite(latest))return;
 const t1=latest,t0=t1-6*3600000;
 const priceRows=a.filter(r=>Number(r.ts)>=t0&&Number(r.ts)<=t1);
 const wave3=priceRows.map(r=>({...r,vwap:Number.isFinite(Number(r.vwap))?Number(r.vwap):(Number(r.lbw)-Number(r.bw))}));
 const wave15=(b||[]).filter(r=>Number(r.ts)>=t0&&Number(r.ts)<=t1).map(r=>({...r,vwap:Number.isFinite(Number(r.vwap))?Number(r.vwap):(Number(r.lbw)-Number(r.bw))}));
 window.BoonoCharts.drawPrice($('#curtainPrice'),priceRows,{
   theme:'tv',t0,t1,candleMs:180000,grid:false,padding:{left:8,right:8,top:10,bottom:6},
   maxBodyWidth:5,maAbove:'#38d982',maBelow:'#ff4f5f',maWidth:1.5
 });
 window.BoonoCharts.drawWave($('#curtainWave15'),wave15,{theme:'tv',t0,t1,padding:{left:8,right:8,top:5,bottom:5}});
 window.BoonoCharts.drawWave($('#curtainWave3'),wave3,{theme:'tv',t0,t1,padding:{left:8,right:8,top:5,bottom:5}});
}
function renderAudit(rows){
 const use=(rows||[]).slice(-10).reverse();
 auditEl.innerHTML=use.map(r=>{const t=new Date(Number(r.ts)||Date.parse(r.timestamp||0));const tm=Number.isNaN(t.getTime())?'—':t.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});const p=r.lastPrice??r.price??'—';const evt=r.direction||r.waveRegime15||r.vwap3SlopeDir||'update';return '<div class="audit-r"><span>'+esc(tm)+'</span><span>'+esc(p)+'</span><span>'+esc(evt)+'</span></div>'}).join('');
}
const VISUAL_STATES=['working','thinking','worried','concentrated','confident','observe','execute'];
let currentArtPose=null,lastArtPoseAt=0,scenePackReady=false,manualPose=null;
function setScenePackReady(ok){
 scenePackReady=!!ok;
 const room=$('#room');
 if(room) room.classList.toggle('scene-pack-active',scenePackReady);
 let chip=$('#sceneStateChip');
 if(!chip && room){chip=document.createElement('div');chip.id='sceneStateChip';chip.className='scene-state-chip';room.appendChild(chip);}
 if(chip) chip.textContent=scenePackReady?'SCENE · '+String(currentArtPose||'working').toUpperCase():'LAYERED FALLBACK';
}
function probeScenePack(){
 fetch('/assets/scenes-runtime/manifest.json',{cache:'no-store'})
  .then(r=>r.ok?r.json():Promise.reject(new Error('no scene pack')))
  .then(m=>setScenePackReady(Array.isArray(m.states)&&VISUAL_STATES.every(s=>m.states.includes(s))))
  .catch(()=>setScenePackReady(false));
}
probeScenePack();
setInterval(probeScenePack,60000);
function applyVisualPose(pose,force=false){
 if(!VISUAL_STATES.includes(pose)) pose='working';
 const now=Date.now();
 // Automatic pose changes keep visual continuity; explicit URL/keyboard tests are immediate.
 if(!force && currentArtPose && pose!==currentArtPose && now-lastArtPoseAt<45000) return;
 if(pose===currentArtPose) return;
 currentArtPose=pose;lastArtPoseAt=now;
 const art=$('#boonoCharacter'),scene=$('#boonoScene'),chip=$('#sceneStateChip');
 if(art) art.className='boono-character '+pose;
 if(scene) scene.className='boono-scene '+pose;
 if(chip) chip.textContent=(scenePackReady?'SCENE · ':'LAYERED · ')+pose.toUpperCase();
}
function renderBoono(b){
 const forced=new URLSearchParams(location.search).get('pose');
 const pose=manualPose || (VISUAL_STATES.includes(forced)?forced:(b?.pose||'working'));
 boonoEl.className='boono '+pose;
 applyVisualPose(pose,!!manualPose||VISUAL_STATES.includes(forced));
 bubbleEl.textContent=b?.bubble||'READ CONTEXT. WAIT FOR PROOF.';
}
addEventListener('keydown',e=>{
 const map={'1':'working','2':'thinking','3':'worried','4':'concentrated','5':'confident','6':'observe','7':'execute','0':null};
 if(Object.prototype.hasOwnProperty.call(map,e.key)){
   manualPose=map[e.key];
   if(manualPose) applyVisualPose(manualPose,true);
   else if(snapshot?.boono) applyVisualPose(snapshot.boono.pose||'working',true);
 }
});
function renderDesk(rows){
 drawCandles((rows||[]).slice(-70),'#deskChartA');
 const {x,w,h}=canvasCtx('#deskChartB');x.clearRect(0,0,w,h);if(!rows?.length)return;const r=rows.slice(-70),pad=7,vals=r.map(z=>z.lbw).filter(Number.isFinite),mx=Math.max(20,...vals.map(Math.abs));const xp=i=>pad+i*(w-pad*2)/Math.max(1,r.length-1),yp=v=>h/2-(v/mx)*(h*.42);line(x,r.map((z,i)=>[xp(i),yp(z.lbw)]),'#d7e8ee',1.5);line(x,r.map((z,i)=>[xp(i),yp(z.mf)]),'#f0c729',1.3);
}
function render(s){
 snapshot=s;renderState(s);renderAudit(s.audit);renderBoono(s.boono);
 const a=s.series?.mcb3||[],b=s.series?.mcb15||[];drawCandles(a);drawOsc(a);drawWaves(a,b);renderMarketCurtain(a,b);renderDesk(a);
}
function cycleLayers(){
 layers.forEach((sel,i)=>$(sel).classList.toggle('active',i===layerIndex||((layerIndex===0)&&i===1)));
 layerIndex=(layerIndex+1)%layers.length;
}
setInterval(cycleLayers,26000);
function fitScene(){const sc=$('#scene'),q=Math.min(innerWidth/1920,innerHeight/1080);sc.style.transform='scale('+q+')';sc.style.marginLeft='0px';}
addEventListener('resize',fitScene);fitScene();
function connect(){
 const proto=location.protocol==='https:'?'wss':'ws';const ws=new WebSocket(proto+'://'+location.host+'/ws');
 ws.onmessage=e=>{try{render(JSON.parse(e.data))}catch(err){console.error(err)}};
 ws.onclose=()=>setTimeout(connect,2000);ws.onerror=()=>ws.close();
}
fetch('/api/snapshot',{cache:'no-store'}).then(r=>r.json()).then(render).catch(()=>{}).finally(connect);
function kv(k,v,sub=''){return '<div class="kv'+(sub?' wide':'')+'"><div class="kk">'+esc(k)+'</div><div class="vv '+cls(v)+'">'+esc(v)+(sub?'<br>'+esc(sub):'')+'</div></div>'}
function proof(label,state){return '<div class="proof '+state+'">'+esc(label)+'</div>'}
function boolProof(ok,waiting=false){return ok?'good':(waiting?'warn':'bad')}
function renderState(s){
 const l=s.living||{},th=l.thesis||{},bg=l.background||{},sig=l.signal||{},st=l.setup||{},sr=l.structure||{},e15=l.e15||{},m3=l.mcb3||{},mf=l.mf15||{},pm=l.pm||{},tk=l.ticker||{},cx=l.context||{},rk=l.risk||{},ac=l.action||{},v3=l.v3Shadow||{},pos=s.market?.position||{},last=l.lastDecision||{};
 versionEl.textContent=s.version||'—';priceEl.textContent=fmt(s.market?.price,1);$('#freshness').textContent='update '+new Date(s.generatedAt).toLocaleTimeString('fr-FR');
 const thesis=(th.state||'—')+(th.candidateDirection?' → '+String(th.candidateDirection).toUpperCase():'');
 const bg1='1H '+(bg.oneHour?.direction||'—')+'/'+(bg.oneHour?.phase||'—')+' · 4H '+(bg.fourHour?.direction||'—')+' · D '+(bg.daily?.direction||'—');
 const e15line=(e15.type||'—')+' · LBW '+fmt(e15.extremeLbw,2)+' → '+fmt(e15.currentLbw,2)+' · rec '+fmt(e15.recoveryPct,1)+'% · span '+fmt(e15.span,1);
 const m3line='LBW '+fmt(m3.lbw,2)+' · ext '+fmt(m3.extremeLbw,2)+' · slope '+fmt(m3.slopeLbw,2)+' · '+(m3.structuralState||'—');
 const setupReason=compactReason(st.reason||st.reasons?.join(' + '),118);
 const mfline=(mf.temporalState||mf.state||'—')+' · mem '+(mf.memoryDirection||'—')+' '+(mf.horizon||'')+' · tactical '+(mf.tacticalDirection||'—');
 const pmline=(pm.status||'—')+' · PM '+fmt(pm.moveUsd,1)+'$ · net3m '+fmt(pm.net3mUsd,1)+'$ · eff '+fmt(pm.efficiency3mPct,1)+'%';
 const tkline=(tk.status||'—')+' · cad '+fmt(tk.cadence,2)+' · flow '+fmt(tk.flow,3)+' · terrain '+fmt(tk.terrain,2);
 const posline=pos.direction?String(pos.direction).toUpperCase()+' @ '+fmt(pos.entryPrice,1)+' · MFE '+fmt(pos.mfeUsd,1)+'$ · MAE '+fmt(pos.maeUsd,1)+'$ · net '+fmt(pos.netPnlIfClosedNowUsd,2)+'$':'AUCUNE POSITION';
 const acName=(ac.type||'—')+(ac.direction?' · '+String(ac.direction).toUpperCase():'');
 const acClass=cls(acName);
 const mcbProof=boolProof(th.maturity==='PASS',th.maturity==='WAIT');
 const mfProof=boolProof(/SUPPORTS|ALIGNED/.test((mf.candidateContext||'')+' '+(mf.conversion||'')),true);
 const pmProof=boolProof(/TRANSLATING|ALIGNED/.test(pm.status||'')&&!/NOT_TRANSLATING/.test(pm.status||''),true);
 const tkProof=boolProof(tk.confirmed,true);
 stateRows.innerHTML=
 '<section class="state-block"><div class="block-head"><span class="block-num">01</span><span class="block-title">THÈSE / MCB</span><span class="block-tag">propose la direction</span></div>'+
 '<div class="block-primary '+cls(thesis)+'">'+esc(thesis)+'</div>'+
 kv('MATURITÉ',th.maturity||'—',(th.maturityGate?.nested3m?.state||'')+' · autorité '+(th.authority||'MCB'))+
 kv('15m',e15line,(e15.class||'—')+' · prix/ext '+fmt(e15.priceSinceExtremeUsd,1)+'$')+
 kv('3m',m3line,'trajet '+(m3.structuralDirection||'—')+' · turning '+(m3.turningDirection||'—'))+
 kv('BACKGROUND',bg1,bg.macroShadow||'—')+
 kv('SIGNAL',(sig.type||'—')+' @ '+fmt(sig.value,1)+' · age '+fmt(sig.ageMinutes,0)+'m')+
 '</section>'+
 '<section class="state-block"><div class="block-head"><span class="block-num">02</span><span class="block-title">STRUCTURE / POSITION</span><span class="block-tag">situe sans veto</span></div>'+
 '<div class="block-primary '+cls(sr.state)+'">'+esc(sr.state||'—')+'</div>'+
 kv('ROOM',fmt(sr.roomToBoundaryUsd,1)+'$ · '+(sr.marketQuality||'—'))+
 kv('SETUP',(st.status||'—')+(st.direction?' → '+String(st.direction).toUpperCase():''),setupReason)+
 kv('CONTEXTE',cx.status||'—','WHERE / niveaux / MA200 / liquidité = information, jamais veto')+
 kv('POSITION',posline)+
 '</section>'+
 '<section class="state-block"><div class="block-head"><span class="block-num">03</span><span class="block-title">CONVERSION / COMBAT</span><span class="block-tag">preuve post-setup</span></div>'+
 '<div class="proof-chain">'+proof('MCB',mcbProof)+proof('MF',mfProof)+proof('PM',pmProof)+proof('TICKER',tkProof)+'</div>'+
 kv('MF15',mfline,(mf.candidateContext||'—')+' · '+(mf.conversion||'—'))+
 kv('PM LIVE',pmline)+
 kv('TICKER',tkline,tk.confirmed?'CONFIRMED':'NOT CONFIRMED')+
 '</section>'+
 '<section class="state-block"><div class="block-head"><span class="block-num">04</span><span class="block-title">DÉCISION / RISQUE</span><span class="block-tag">agit ou attend</span></div>'+
 '<div class="action-box"><div class="action-main '+acClass+'"><div class="action-name">'+esc(acName)+'</div><div class="action-stage">'+esc(ac.stage||'—')+'</div></div>'+
 '<div class="risk-mini">ENTRY '+(rk.entryAllowed?'YES':'NO')+'<br>R:R '+fmt(rk.rr,2)+'<br>CAP '+fmt(rk.capUsd,0)+'$</div></div>'+
 '<div class="decision-reason">'+esc(compactReason(ac.reason,150))+'</div>'+
 kv('V3 SHADOW',(v3.action||'—')+(v3.direction?' · '+v3.direction:''),compactReason(v3.reason,90))+
 kv('DERNIÈRE',typeof last.action==='string'?last.action:(last.action?.type||'—'),compactReason(last.reason||last.ts,100))+
 '</section>';
}
