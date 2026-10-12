(function(root){
'use strict';

function finite(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));}
function setupCanvas(canvas){
  if(!canvas)return null;
  const r=canvas.getBoundingClientRect();
  const d=Math.max(1,Math.min(Number(root.devicePixelRatio)||1,2));
  const pw=Math.max(1,Math.round(r.width*d)),ph=Math.max(1,Math.round(r.height*d));
  if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
  const ctx=canvas.getContext('2d');
  ctx.setTransform(d,0,0,d,0,0);
  return {ctx,w:r.width,h:r.height,dpr:d};
}
function medianStep(rows,fallback){
  const a=(rows||[]).slice().sort((x,y)=>Number(x.ts)-Number(y.ts));
  const ds=[];
  for(let i=1;i<a.length;i++){const d=Number(a[i].ts)-Number(a[i-1].ts);if(d>0)ds.push(d);}
  ds.sort((a,b)=>a-b);
  return ds.length?ds[Math.floor(ds.length/2)]:(fallback||180000);
}
function domainRows(rows,t0,t1){
  return (rows||[]).filter(r=>finite(r.ts)&&Number(r.ts)>=Number(t0)&&Number(r.ts)<=Number(t1));
}
function priceBounds(rows,padPct){
  const vals=[];
  for(const r of rows||[]){
    if(finite(r.low))vals.push(Number(r.low));
    if(finite(r.high))vals.push(Number(r.high));
    if(finite(r.ma200))vals.push(Number(r.ma200));
  }
  if(!vals.length)return {lo:0,hi:1};
  let lo=Math.min(...vals),hi=Math.max(...vals),span=Math.max(1,hi-lo);
  const p=span*(padPct==null?.06:Number(padPct));
  return {lo:lo-p,hi:hi+p};
}
function mapPrice(v,bounds,top,height){
  return top+(bounds.hi-Number(v))/Math.max(1e-9,bounds.hi-bounds.lo)*height;
}
function mapTime(ts,t0,t1,left,width){
  return left+(Number(ts)-Number(t0))/Math.max(1,Number(t1)-Number(t0))*width;
}
function drawPrice(canvas,rows,opts){
  opts=opts||{};
  const box=setupCanvas(canvas);if(!box)return null;
  const ctx=box.ctx,W=box.w,H=box.h;
  ctx.clearRect(0,0,W,H);
  const pad=Object.assign({left:12,right:10,top:10,bottom:15},opts.padding||{});
  const ts=(rows||[]).map(r=>Number(r.ts)).filter(Number.isFinite);
  const t0=finite(opts.t0)?Number(opts.t0):Math.min(...ts);
  const t1=finite(opts.t1)?Number(opts.t1):Math.max(...ts);
  if(!Number.isFinite(t0)||!Number.isFinite(t1)||t1<=t0)return null;
  const use=domainRows(rows,t0,t1);
  if(!use.length)return null;
  const plotW=Math.max(1,W-pad.left-pad.right),plotH=Math.max(1,H-pad.top-pad.bottom);
  const bounds=priceBounds(use,opts.pricePadPct);
  const theme=opts.theme==='tv'?'tv':'interface';
  const grid=theme==='tv'?'rgba(255,255,255,.09)':'rgba(0,0,0,.07)';
  const wick=theme==='tv'?'rgba(245,248,250,.82)':'rgba(25,25,25,.78)';
  const upFill=theme==='tv'?'rgba(245,248,250,.80)':'rgba(255,255,255,.98)';
  const dnFill=theme==='tv'?'rgba(100,108,114,.86)':'rgba(82,87,91,.94)';
  const bodyStroke=theme==='tv'?'rgba(245,248,250,.75)':'rgba(25,25,25,.85)';
  const maAbove=opts.maAbove||'#22a35a',maBelow=opts.maBelow||'#d43a3a';

  if(opts.background){ctx.fillStyle=opts.background;ctx.fillRect(0,0,W,H);}
  if(opts.grid!==false){
    ctx.save();ctx.strokeStyle=grid;ctx.lineWidth=.7;
    for(let i=1;i<5;i++){const yy=pad.top+plotH*i/5;ctx.beginPath();ctx.moveTo(pad.left,yy);ctx.lineTo(pad.left+plotW,yy);ctx.stroke();}
    ctx.restore();
  }

  if(Array.isArray(opts.tradeSpans)){
    ctx.save();
    for(const z of opts.tradeSpans){
      const a=Math.max(t0,Number(z.entryTs)),b=Math.min(t1,Number(z.drawEndTs));
      if(!(b>a))continue;
      const x1=mapTime(a,t0,t1,pad.left,plotW),x2=mapTime(b,t0,t1,pad.left,plotW);
      ctx.fillStyle=theme==='tv'?'rgba(120,205,235,.055)':'rgba(135,206,235,.10)';
      ctx.fillRect(x1,pad.top,Math.max(1,x2-x1),plotH);
    }
    ctx.restore();
  }

  const step=Number(opts.candleMs)||medianStep(use,180000);
  const pxStep=step/Math.max(1,t1-t0)*plotW;
  const bw=Math.max(theme==='tv'?1:.8,Math.min(Number(opts.maxBodyWidth)||9,pxStep*.58));
  for(const r of use){
    if(![r.open,r.high,r.low,r.close].every(finite))continue;
    const xx=mapTime(r.ts,t0,t1,pad.left,plotW);
    const yo=mapPrice(r.open,bounds,pad.top,plotH),yc=mapPrice(r.close,bounds,pad.top,plotH);
    const yh=mapPrice(r.high,bounds,pad.top,plotH),yl=mapPrice(r.low,bounds,pad.top,plotH);
    const up=Number(r.close)>=Number(r.open);
    ctx.save();
    ctx.strokeStyle=wick;ctx.lineWidth=theme==='tv'?.8:.75;
    ctx.beginPath();ctx.moveTo(xx,yh);ctx.lineTo(xx,yl);ctx.stroke();
    ctx.fillStyle=up?upFill:dnFill;ctx.strokeStyle=bodyStroke;ctx.lineWidth=.7;
    const top=Math.min(yo,yc),bh=Math.max(1,Math.abs(yc-yo));
    ctx.fillRect(xx-bw/2,top,bw,bh);ctx.strokeRect(xx-bw/2,top,bw,bh);
    ctx.restore();
  }

  const ma=use.filter(r=>finite(r.ma200));
  if(ma.length>1){
    ctx.save();ctx.lineWidth=Number(opts.maWidth)||(theme==='tv'?1.35:1.25);ctx.lineCap='round';ctx.lineJoin='round';
    for(let i=1;i<ma.length;i++){
      const a=ma[i-1],b=ma[i];
      const x1=mapTime(a.ts,t0,t1,pad.left,plotW),x2=mapTime(b.ts,t0,t1,pad.left,plotW);
      const y1=mapPrice(a.ma200,bounds,pad.top,plotH),y2=mapPrice(b.ma200,bounds,pad.top,plotH);
      const above=Number(b.close)>=Number(b.ma200);
      ctx.strokeStyle=above?maAbove:maBelow;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    }
    ctx.restore();
  }

  const tradeZones=[];
  if(Array.isArray(opts.tradeSpans)){
    for(const z of opts.tradeSpans){
      const a=Math.max(t0,Number(z.entryTs)),b=Math.min(t1,Number(z.drawEndTs));
      if(!(b>a))continue;
      tradeZones.push({x1:mapTime(a,t0,t1,pad.left,plotW),x2:mapTime(b,t0,t1,pad.left,plotW),y1:pad.top,y2:pad.top+plotH,trade:z});
    }
  }

  if(finite(opts.cursorTs)&&Number(opts.cursorTs)>=t0&&Number(opts.cursorTs)<=t1){
    const xx=mapTime(opts.cursorTs,t0,t1,pad.left,plotW);
    ctx.save();ctx.strokeStyle=theme==='tv'?'rgba(255,255,255,.34)':'rgba(55,55,55,.62)';ctx.lineWidth=.8;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(xx,pad.top);ctx.lineTo(xx,pad.top+plotH);ctx.stroke();ctx.restore();
  }
  return {bounds,t0,t1,padding:pad,plotWidth:plotW,plotHeight:plotH,tradeZones};
}
function waveLimit(rows){
  let m=0;
  for(const r of rows||[])for(const k of ['bw','lbw','mf','vwap'])if(finite(r[k]))m=Math.max(m,Math.abs(Number(r[k])));
  return Math.max(100,Math.ceil(Math.max(1,m)*1.08/10)*10);
}
function drawWave(canvas,rows,opts){
  opts=opts||{};
  const box=setupCanvas(canvas);if(!box)return null;
  const ctx=box.ctx,W=box.w,H=box.h;ctx.clearRect(0,0,W,H);
  const pad=Object.assign({left:10,right:10,top:7,bottom:7},opts.padding||{});
  const ts=(rows||[]).map(r=>Number(r.ts)).filter(Number.isFinite);
  const t0=finite(opts.t0)?Number(opts.t0):Math.min(...ts);
  const t1=finite(opts.t1)?Number(opts.t1):Math.max(...ts);
  if(!Number.isFinite(t0)||!Number.isFinite(t1)||t1<=t0)return null;
  const use=domainRows(rows,t0,t1);if(!use.length)return null;
  const plotW=Math.max(1,W-pad.left-pad.right),plotH=Math.max(1,H-pad.top-pad.bottom);
  const lim=finite(opts.yLimit)?Number(opts.yLimit):waveLimit(use);
  const xx=ts0=>mapTime(ts0,t0,t1,pad.left,plotW);
  const yy=v=>pad.top+(lim-Math.max(-lim,Math.min(lim,Number(v))))/(2*lim)*plotH;
  const zero=yy(0),theme=opts.theme==='tv'?'tv':'interface';
  const bwColor=theme==='tv'?'rgba(255,255,255,.94)':'#111';
  const lbwColor=theme==='tv'?'rgba(220,228,232,.75)':'#333';
  const vwapColor=theme==='tv'?'rgba(255,255,255,.34)':'#d4aa00';
  const mfFill=theme==='tv'?'rgba(210,216,220,.13)':'rgba(135,135,135,.24)';
  const mfEdge=theme==='tv'?'rgba(255,255,255,.58)':'rgba(0,0,0,.78)';
  if(opts.zeroLine!==false){
    ctx.save();ctx.strokeStyle=theme==='tv'?'rgba(255,255,255,.18)':'#2f80ed';ctx.lineWidth=.75;
    ctx.beginPath();ctx.moveTo(pad.left,zero);ctx.lineTo(pad.left+plotW,zero);ctx.stroke();ctx.restore();
  }
  function pts(field){return use.filter(r=>finite(r[field])).map(r=>[xx(r.ts),yy(r[field])]);}
  const mf=pts('mf');
  if(mf.length){
    ctx.save();ctx.beginPath();ctx.moveTo(mf[0][0],zero);ctx.lineTo(mf[0][0],mf[0][1]);
    for(let i=1;i<mf.length;i++)ctx.lineTo(mf[i][0],mf[i][1]);
    ctx.lineTo(mf[mf.length-1][0],zero);ctx.closePath();ctx.fillStyle=mfFill;ctx.fill();ctx.restore();
    ctx.save();ctx.strokeStyle=mfEdge;ctx.lineWidth=theme==='tv'?.65:.7;ctx.beginPath();
    mf.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.restore();
  }
  function stroke(field,color,width,alpha){
    const p=pts(field);if(!p.length)return;ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha==null?1:alpha;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke();ctx.restore();
  }
  stroke('bw',bwColor,theme==='tv'?1.2:1.35,.95);
  stroke('lbw',lbwColor,theme==='tv'?.85:1,.86);
  stroke('vwap',vwapColor,theme==='tv'?.75:1.3,.92);
  if(finite(opts.cursorTs)&&Number(opts.cursorTs)>=t0&&Number(opts.cursorTs)<=t1){
    const x=xx(opts.cursorTs);ctx.save();ctx.strokeStyle=theme==='tv'?'rgba(255,255,255,.22)':'rgba(55,55,55,.55)';ctx.lineWidth=.7;ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(x,pad.top);ctx.lineTo(x,pad.top+plotH);ctx.stroke();ctx.restore();
  }
  return {yLimit:lim,t0,t1,padding:pad,plotWidth:plotW,plotHeight:plotH};
}
root.BoonoCharts={finite,setupCanvas,priceBounds,mapPrice,mapTime,drawPrice,drawWave,waveLimit};
})(window);
