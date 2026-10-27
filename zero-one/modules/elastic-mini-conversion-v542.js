'use strict';
/* BOONO Systems — compact conversion chart, PRESENTATION ONLY.
 * The existing chart fetch and existing OKX WebSocket are shared. No new
 * market connection, no strategy import and no independent PM calculation.
 */
(function(){
const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,low,high)=>Math.max(low,Math.min(high,v));
const format=(v,d=1)=>num(v)===null?'—':Number(v).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
const signed=(v,d=1)=>num(v)===null?'—':(Number(v)>0?'+':'')+format(v,d);
const btc=v=>num(v)===null?'—':Number(v).toFixed(Math.abs(Number(v))<.01?4:3);
// Normalized 3m PRICE translation: net / range. Not volume balance and
// not eff3 (which would instead require cumulative absolute price travel).
function relativePriceDeport(e){
 if(e?.available!==true)return null;
 const net=num(e.priceNetUsd),range=num(e.priceRangeUsd);
 return net!==null&&range!==null&&range>0?clamp(net/range,-1,1):null;
}
// The ten small WHITE/BLACK rounded pastilles show the aggregate EXECUTED
// aggressor volume (buy + sell BTC) over the same 3-minute OKX trade window.
// Fixed logarithmic thresholds allow comparison across sessions; do NOT
// mistake this for resting order-book liquidity, and do not display a scale.
const TOTAL_VOLUME_THRESHOLDS_BTC=[1,2,5,10,20,50,100,200,500,1000];
function totalVolumeReading(e){
 const buy=num(e?.buyBtc),sell=num(e?.sellBtc);
 if(e?.available!==true||buy===null||sell===null||buy<0||sell<0)
  return {btc:null,level:null};
 const total=buy+sell;
 return {btc:total,level:TOTAL_VOLUME_THRESHOLDS_BTC.filter(x=>total>=x).length};
}
function volumePastilles(e,status,h){
 const {btc:total,level}=totalVolumeReading(e);
 const square=7.2,step=10.4,x=1.2;
 const y0=Math.max(3,(h-(9*step+square))/2);
 const title=total===null?'Volume OKX exécuté 3m indisponible':
   'Volume TOTAL exécuté OKX sur 3m : '+btc(total)+
   ' BTC (achat + vente), intensité '+level+'/10 selon seuils logarithmiques fixes'+
   (status==='WARMING_3M'?' ; fenêtre 3m encore partielle':'')+
   '. Ce n’est PAS la liquidité disponible dans le carnet.';
 const items=['<g class="v52-mini-total-volume-pastilles" role="img"'+
  ' aria-label="Intensité du volume total exécuté sur 3 minutes"'+
  ' data-level="'+(level===null?'unknown':level)+'"'+
  ' data-total-btc="'+(total===null?'':total.toFixed(3))+'">'+
  '<title>'+esc(title)+'</title>'];
 for(let i=0;i<10;i++){
  const y=y0+i*step,active=level!==null&&9-i<level;
  items.push('<rect class="v52-mini-volume-pastille" x="'+x+'"'+
   ' y="'+y.toFixed(1)+'" width="'+square+'" height="'+square+
   '" rx="2" fill="#fff" stroke="#283039" stroke-width=".85"'+
   ' data-active="'+(active?'true':'false')+'"/>');
  // Active levels gain an inner dark mark; the squares remain WHITE with
  // their black rounded outlines as requested.
  if(active)items.push('<rect class="v52-mini-volume-active"'+
   ' x="'+(x+2).toFixed(1)+'" y="'+(y+2).toFixed(1)+'"'+
   ' width="'+(square-4).toFixed(1)+'" height="'+(square-4).toFixed(1)+
   '" rx=".65" fill="#283039"/>');
 }
 return items.join('')+'</g>';
}
const VISIBLE_MINUTES=150; // 2 h 30, same viewport as the full Conversion graph
function visibleEnd(lastCandleTs,periodData,now){
 const bound=num(periodData?.to);
 // The last LIVE candle is stamped at its OPEN, not at its end. The HTTP
 // period.to is the actual observation time, which must take priority so
 // that a newly opened candle cannot shift the 150m window 3m into future.
 if(bound!==null&&bound>=lastCandleTs&&bound<=now+10000)return Math.min(now,bound);
 return Math.min(now,lastCandleTs+180000);
}
const clock=t=>Number.isFinite(Number(t))?new Date(t).toLocaleTimeString('fr-FR',{
 timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit'}):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let candles=[],period=null,quote={price:null,ts:null,status:'NO_SOURCE'},lastSnapshot=null;
function quotePrice(now){
 const p=num(quote.price),t=num(quote.ts);
 const maxAge=quote.status==='V5.4 live serveur'?25000:15000;
 return p!==null&&p>0&&t!==null&&now-t>=-3000&&now-t<=maxAge&&
  ['OKX live','V5.4 live serveur'].includes(quote.status)?p:null;
}
function miniSvg({data=candles,periodData=period,snapshot=lastSnapshot,
  width=290,height=200,now=Date.now(),quoteValue=quotePrice(now)}={}){
 const w=clamp(Math.round(width),155,720),h=clamp(Math.round(height),145,320);
 // Top/bottom captions are now separate DOM rows; fill the SVG with PRICE.
 const plot={l:w<240?39:43,r:7,t:3,b:3},pw=w-plot.l-plot.r,ph=h-plot.t-plot.b;
 const svgParts=[];
 // Keep the price CANDLE window pure white; only its OUTER frame is grey.
 svgParts.push('<rect width="'+w+'" height="'+h+'" fill="#fff"/>');
 const valid=(data||[]).filter(x=>num(x.ts)!==null&&
  [x.open,x.high,x.low,x.close].every(v=>num(v)!==null)&&
  Number(x.ts)<=now+3000).slice(-53);
 if(valid.length<2)return '<svg viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bougies 3 minutes indisponibles">'+
  svgParts.join('')+'<text x="'+(w/2)+'" y="'+(h/2)+'" text-anchor="middle" font-size="9" fill="#748493">Bougies 3m en attente</text></svg>';
 const latestTs=valid.at(-1).ts;
 const end=visibleEnd(latestTs,periodData,now);
 const start=end-VISIBLE_MINUTES*60000;
 const bars=valid.filter(x=>Number(x.ts)>=start-180000&&Number(x.ts)<=end);
 // Use the observed BTC candle excursion, not distant MA levels, to avoid
 // empty price bands. 1600 USD remains the MAX view window. Distant MA values
 // may be clipped; they must not invent excess vertical whitespace.
 const values=[];
 for(const c of bars)values.push(Number(c.high),Number(c.low));
 const actualQuote=num(quoteValue);
 if(actualQuote!==null&&actualQuote>0)values.push(actualQuote);
 const first=Math.min(...values),last=Math.max(...values);
 const movement=Math.max(0,last-first),padding=Math.max(18,movement*.035);
 const span=clamp(movement+padding*2,500,1600);
 const recentClose=num(bars.at(-1)?.close);
 const mid=movement+2*padding>1600?
   (actualQuote!==null&&actualQuote>0?actualQuote:recentClose??(first+last)/2):
   (first+last)/2;
 const lo=mid-span/2,hi=mid+span/2;
 const tx=ts=>plot.l+(Number(ts)-start)/Math.max(1,end-start)*pw;
 const ty=val=>plot.t+(hi-Number(val))/(hi-lo)*ph;
 const clip='v52-mini-plot-clip';
 svgParts.push('<defs><clipPath id="'+clip+'"><rect x="'+plot.l+'" y="'+plot.t+
  '" width="'+pw+'" height="'+ph+'"/></clipPath></defs>');
 for(let p=Math.ceil(lo/500)*500;p<=hi;p+=500){
  const y=ty(p).toFixed(1);
  svgParts.push('<line x1="'+plot.l+'" x2="'+(w-plot.r)+'" y1="'+y+'" y2="'+y+
   '" stroke="#dee5e9" stroke-width=".65"/>');
  svgParts.push('<text x="'+(plot.l-3)+'" y="'+(Number(y)+2.4)+'" text-anchor="end"'+
   ' font-family="SF Mono,Menlo,monospace" font-size="7.8" fill="#657789">'+
   Math.round(p).toLocaleString('fr-FR')+'</text>');
 }
 // Ten unlabelled total-volume pastilles live in the narrow left margin,
 // just BEFORE the BTC price tick labels; no extra axis/legend is added.
 svgParts.push(volumePastilles(snapshot?.effort,snapshot?.status,h));
 // Hourly lines remain in the chart; captions have their own row below it.
 for(let t=Math.ceil(start/3600000)*3600000;t<=end;t+=3600000){
  const x=tx(t);
  if(x>=plot.l&&x<=w-plot.r)
   svgParts.push('<line x1="'+x.toFixed(1)+'" y1="'+plot.t+'" x2="'+x.toFixed(1)+
    '" y2="'+(h-plot.b)+'" stroke="#edf1f3" stroke-width=".55"/>');
 }
 svgParts.push('<g clip-path="url(#'+clip+')">');
 const bw=clamp(pw/Math.max(12,bars.length)*.65,1.1,4.8);
 for(const c of bars){
  const x=tx(c.ts+90000);if(x<plot.l-5||x>w-plot.r+5)continue;
  const up=c.close>=c.open,color=up?'#728995':'#536a78';
  const y1=ty(c.high),y2=ty(c.low);
  svgParts.push('<line x1="'+x.toFixed(2)+'" x2="'+x.toFixed(2)+
   '" y1="'+y1.toFixed(2)+'" y2="'+y2.toFixed(2)+
   '" stroke="'+color+'" stroke-width=".68"/>');
  const yO=ty(c.open),yC=ty(c.close),top=Math.min(yO,yC);
  svgParts.push('<rect x="'+(x-bw/2).toFixed(2)+'" y="'+top.toFixed(2)+
   '" width="'+bw.toFixed(2)+'" height="'+Math.max(.9,Math.abs(yO-yC)).toFixed(2)+
   '" fill="'+(up?'#f3f7f9':'#657986')+
   '" stroke="'+color+'" stroke-width=".55"/>');
 }
 // The shared 3m MA200 is a test/context, not a veto or price target.
 for(let i=1;i<bars.length;i++){
  const a=bars[i-1],b=bars[i];
  if([a.ma200,b.ma200].some(v=>num(v)===null||Number(v)<=0))continue;
  const x1=tx(a.ts+90000),x2=tx(b.ts+90000);
  svgParts.push('<path d="M'+x1.toFixed(2)+' '+ty(a.ma200).toFixed(2)+
   ' L'+x2.toFixed(2)+' '+ty(b.ma200).toFixed(2)+
   '" fill="none" stroke="'+(b.close>=b.ma200?'#16804b':'#ba4747')+
   '" stroke-opacity=".86" stroke-width=".92"/>');
 }
 if(num(quoteValue)!==null&&quoteValue>=lo&&quoteValue<=hi){
  svgParts.push('<line x1="'+plot.l+'" x2="'+(w-plot.r)+'" y1="'+ty(quoteValue).toFixed(2)+
   '" y2="'+ty(quoteValue).toFixed(2)+'" stroke="#3577b9" stroke-width=".75"'+
   ' stroke-dasharray="3 3" opacity=".9"/>');
 }
 svgParts.push('</g>');
 const e=snapshot?.effort||{},available=e.available===true;
 const buy=available?Math.max(0,num(e.buyBtc)||0):0;
 const sell=available?Math.max(0,num(e.sellBtc)||0):0;
 const cx=plot.l+pw/2,cy=plot.t+ph*.55;
 // The sky-blue vertical is the FIXED zero-price-translation reference,
 // never the volume balance point and never an actual price/time level.
 // Draw it OVER the cubes below, so the neutral reference remains visible.
 if(available){
  // For legibility at small widths squares are RELATIVELY larger than the
  // full-size graph, still sqrt-proportional in area to aggressor BTC volume.
  // Keep the OLD cube scale despite removing top/bottom SVG text bands.
  const maxSide=Math.min(pw*.41,151*.61,110),max=Math.max(buy,sell,.00001);
  const size=v=>v<=0?Math.min(14,maxSide*.25):
    clamp(Math.sqrt(v/max)*maxSide,18,maxSide);
  const sa=size(buy),sb=size(sell);
  const ratio=relativePriceDeport(e)??0;
  const travel=Math.max(0,Math.min(pw*.13,(pw-sa-sb)/2-3));
  const contact=cx+ratio*travel;
  // The cyan corridor visually encodes the signed displacement of PRICE,
  // normalized by the actual high-low range of OKX trades over 3m.
  // Its pixel width is limited by the cube geometry, so pixel distances
  // are NOT directly comparable when buyer/seller cube sizes change.
  if(Math.abs(contact-cx)>.3)
   svgParts.push('<rect class="v52-mini-price-deport-gap"'+
    ' x="'+Math.min(cx,contact).toFixed(2)+'" y="'+plot.t+'"'+
    ' width="'+Math.abs(contact-cx).toFixed(2)+'" height="'+ph+'"'+
    ' fill="#4a9eff" fill-opacity=".17">'+
    '<title>Déport prix 3m : '+signed(ratio*100,1)+
    ' % de l’amplitude observée (Δ BTC 3m / range BTC 3m). Ce n’est ni un écart de volume ni eff3.</title>'+
    '</rect>');
  const square=(left,sz,col,v,key)=>{
   const top=cy-sz/2,mid=left+sz/2,font=clamp(sz*.17,7.5,10.8);
   const label=btc(v),fits=(label.length*font*.57)>sz-5;
   return '<g class="v52-mini-camp" data-camp="'+key+'">'+
     '<title>'+key+' : '+btc(v)+' BTC initiateurs 3m</title>'+
     '<rect x="'+left.toFixed(1)+'" y="'+top.toFixed(1)+'"'+
     ' width="'+sz.toFixed(1)+'" height="'+sz.toFixed(1)+
     '" rx="2.5" fill="'+col+'" fill-opacity=".31" stroke="'+col+
     '" stroke-width=".95" stroke-opacity=".95"/>'+
     '<text x="'+mid.toFixed(1)+'" y="'+(cy+font*.33).toFixed(1)+
     '" text-anchor="middle" fill="'+col+'" font-size="'+font.toFixed(1)+
     '" font-family="SF Mono,Menlo,monospace" font-weight="750"'+
     (fits?' textLength="'+Math.max(8,sz-5).toFixed(1)+'" lengthAdjust="spacingAndGlyphs"':'')+
     '>'+label+'</text></g>';
  };
  svgParts.push(square(contact-sa,sa,'#117a4b',buy,'ACHAT'));
  svgParts.push(square(contact,sb,'#b93946',sell,'VENTE'));
  svgParts.push('<line class="v52-mini-cube-contact" x1="'+contact.toFixed(1)+
   '" x2="'+contact.toFixed(1)+'" y1="'+(cy-maxSide/2-3).toFixed(1)+
   '" y2="'+(cy+maxSide/2+3).toFixed(1)+
   '" stroke="#2f4453" stroke-width=".9" opacity=".95"/>');
 }
 // The zero axis stays visible even where it crosses a cube. Uses the
 // existing BOONO blue accent (#4a9eff) to distinguish it from PM/MA.
 svgParts.push('<line class="v52-mini-blue-zero-axis"'+
  ' x1="'+cx.toFixed(1)+'" x2="'+cx.toFixed(1)+'"'+
  ' y1="'+plot.t+'" y2="'+(h-plot.b)+
  '" stroke="#4a9eff" stroke-width="1.6" stroke-opacity=".96">'+
  '<title>Référence fixe Δ prix BTC sur 3m = 0. Distance au contact = Δ prix 3m / amplitude du prix 3m, projeté sur le déplacement horizontal autorisé.</title>'+
  '</line>');
 // Live BTC quote, 3m signed price move, and start/end time are rendered in
 // independent, bigger rows OUTSIDE this SVG. No text masks the candles.
 return '<svg viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg"'+
  ' data-window-minutes="'+VISIBLE_MINUTES+'"'+
  ' data-price-span-usd="'+span.toFixed(1)+'" data-price-span-max-usd="1600"'+
  ' role="img" aria-label="Prix BTC 3m, graduations 500 dollars, ligne bleue ciel de référence Δ prix zéro, écart du contact des cubes proportionnel au déport prix 3m normalisé, duel en volumes BTC">'+
  svgParts.join('')+'</svg>';
}
function setQuote(price,ts,status){
 quote={price:num(price),ts:num(ts),status:String(status||'NO_SOURCE')};
 if(typeof document!=='undefined'){
  const el=document.getElementById('v52-mini-btc-price');
  const p=quotePrice(Date.now());
  if(el)el.textContent=p===null?'BTC —':'BTC '+format(p,1)+' $';
 }
}
function setCandles(data){
 if(!data||!Array.isArray(data.candles)||data.candles.length<2)return false;
 candles=data.candles.slice(-53);period=data.period||null;
 return refresh();
}
function refresh(snapshot){
 if(typeof document==='undefined'||document.hidden)return false;
 const host=document.getElementById('v52-mini-conversion');
 const slot=document.getElementById('v52-mini-conversion-svg');
 if(!host||!slot)return false;
 const current=snapshot||window.elasticConversionV541?.snapshot?.()||lastSnapshot;
 if(current)lastSnapshot=current;
 const dim=host.getBoundingClientRect?.()||{};
 const w=num(dim.width)||num(host.clientWidth)||0;
 if(w<100)return false;
 const h=192;
 slot.innerHTML=miniSvg({data:candles,periodData:period,
   snapshot:current,width:w,height:h,now:Date.now()});
 const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
 const e=current?.effort||{},cv=current?.conversion||{};
 const ok=e.available===true,coverage=num(current?.coverageSeconds)||0;
 const status=current?.status==='LIVE_3M'?'OKX LIVE 3MIN':
   current?.status==='WARMING_3M'?'OKX 3MIN · '+Math.round(coverage)+'s':
   'OKX INDISPONIBLE';
 set('v52-mini-conversion-status',status);
 set('v52-mini-buy',ok?btc(e.buyBtc)+' BTC':'—');
 set('v52-mini-sell',ok?btc(e.sellBtc)+' BTC':'—');
 const quoteNow=quotePrice(Date.now());
 set('v52-mini-btc-price',quoteNow===null?'BTC —':'BTC '+format(quoteNow,1)+' $');
 const delta=ok?num(e.priceNetUsd):null;
 set('v52-mini-delta',delta===null?'Δ BTC 3m —':'Δ BTC 3m '+signed(delta,1)+' $');
 const deport=relativePriceDeport(e);
 set('v52-mini-price-deport',deport===null?'Déport prix —':
  'Déport prix '+signed(100*deport,1)+' % du range 3m');
 const deltaRow=document.getElementById('v52-mini-delta');
 if(deltaRow)deltaRow.className='v52-mini-delta'+(
  delta===null?'':delta>0?' up':delta<0?' down':'');
 if(candles.length>=2){
  const latest=candles.at(-1).ts;
  const end=visibleEnd(latest,period,Date.now());
  set('v52-mini-begin',clock(end-VISIBLE_MINUTES*60000));
  set('v52-mini-end',clock(end));
 }else{set('v52-mini-begin','—');set('v52-mini-end','—');}
 set('v52-mini-pm','PM3 '+signed(cv.pm3)+' · PM5 '+signed(cv.pm5)+
   ' · Live '+signed(cv.pmLive));
 set('v52-mini-eff','eff3 '+(num(cv.efficiency3m)===null?'—':format(cv.efficiency3m*100,1)+'%')+
   ' · yield/P75 '+(num(cv.yieldVsP75)===null?'—':format(cv.yieldVsP75,2)+'×')+
   ' · effort/P75 '+(num(cv.effortVsP75)===null?'—':format(cv.effortVsP75,2)+'×'));
 set('v52-mini-quality','Qualité '+(cv.quality||'UNCLASSIFIED')+
   ' · direction '+(cv.direction||'—').toUpperCase());
 return true;
}
window.BoonoMiniConversion={miniSvg,setCandles,setQuote,refresh,
 getSourceStatus:()=>({candles:candles.length,period,quote})};
})();
