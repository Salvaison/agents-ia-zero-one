'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../../modules/config-server.js'),'utf8');
function extract(startToken,endToken){
 const a=src.indexOf(startToken),b=src.indexOf(endToken,a+startToken.length);
 assert.ok(a>=0&&b>a,startToken+' and end must exist');
 return src.slice(a,b);
}
function browserTools(){
 const js=extract('function waveV5TradeSpans(','function waveSelectedTradeSpan()');
 const context={};
 vm.runInNewContext(js,context);
 return context;
}
const T=1792681200000;
function fakePaper(){
 return {mode:'PAPER_ONLY_0_USD_ORDERS',brokerOrdersEnabled:false,lastObservationAt:T-30000,completed:1,
  history:[{tradeNo:1,entryAt:T-300000,exitAt:T-120000,entryPrice:81800,exitPrice:81900,
    direction:'long',netPnlUsd:.34,exitReason:'EXIT_GAIN_FLOOR_PAPER'}],
  position:{entryAt:T-60000,entryPrice:81920,direction:'short',lastNetPnlUsd:-1.19}};
}
test('V5 spans are derived from independent paper positions, not V4 transactions',()=>{
 const fn=extract('function waveUiV5PaperTrades(','// Rapport V4 complet');
 const state=fakePaper();
 const mock={existsSync:()=>true,readFileSync:()=>JSON.stringify(state)};
 const ctx={fs:mock,path:{join:()=>'/simulated/v5-paper-state.json'},__dirname:'/app/modules',Date:{now:()=>T}};
 vm.runInNewContext(fn,ctx);
 const spans=ctx.waveUiV5PaperTrades(T-3600000,T);
 assert.equal(spans.length,2);
 assert.equal(spans[0].source,'V5_PAPER');assert.equal(spans[0].exitTs,T-120000);
 assert.equal(spans[1].open,true);assert.equal(spans[1].exitTs,null);
 assert.equal(spans[1].entryTs,T-60000);
 assert.equal(spans[0].netPnlUsd,.34);assert.equal(spans[1].netPnlUsd,-1.19);
 assert.equal(ctx.waveUiV5PaperTrades(T+180000,T+360000).length,1,'open position extends into current live');
 state.lastObservationAt=T-4*3600000;
 const frozen=ctx.waveUiV5PaperTrades(T-3600000,T);
 assert.equal(frozen.length,1,'frozen V5 retains only actually closed trades');
 assert.equal(frozen[0].trade,1);
 assert.equal(frozen[0].open,false);
 assert.ok(state.position,'unresolved V5 position is preserved in original paper ledger');
 state.brokerOrdersEnabled=true;
 assert.equal(ctx.waveUiV5PaperTrades(T-3600000,T).length,0,'never accept real order mode');
});
test('comparison spans have distinct colors and independent UTC trade identities',()=>{
 const {waveV5TradeSpans,wavePaintV5Bands}=browserTools();
 const spans=waveV5TradeSpans([
  {source:'V52_PAPER',trade:1,entryTs:T-300000,exitTs:T-120000,entryPrice:81800,
   exitPrice:81900,netPnlUsd:.34,direction:'long',open:false},
  {source:'V493_PAPER',trade:1,entryTs:T-60000,exitTs:null,entryPrice:81920,
   exitPrice:null,netPnlUsd:-1.19,direction:'short',open:true}
 ],T);
 assert.equal(spans.length,2);
 assert.equal(spans[0].source,'V52_PAPER');
 assert.equal(spans[1].source,'V493_PAPER');
 assert.equal(spans[0].drawEndTs,T-120000);
 assert.equal(spans[1].drawEndTs,T);
 const fills=[];let strokes=0;
 const ctx={save(){},restore(){},setTransform(){},beginPath(){},rect(){},clip(){},
  fillRect(...r){fills.push({color:this.fillStyle,rect:r});},moveTo(){},lineTo(){},
  stroke(){strokes++}};
 const canvas={width:840,getBoundingClientRect:()=>({width:420,height:200}),getContext:()=>ctx};
 const hit=wavePaintV5Bands(canvas,spans,T-600000,T,{left:36,right:9,top:12,bottom:18});
 assert.equal(hit.length,2);assert.equal(fills.length,2);
 assert.notEqual(fills[0].color,fills[1].color,'sky blue V4.9.3 versus pink V5');
 assert.equal(fills[0].color,'#e98bc2');
 assert.equal(fills[1].color,'#87cde9');
 assert.equal(fills[0].rect[1],172,'V5 bottom 10px lane in 170px plot');
 assert.equal(fills[1].rect[1],12,'V4.9.3 top 10px lane');
 assert.deepEqual(fills.map(f=>f.rect[3]),[10,10],
  'never use full-height transparent colored zones');
 const expected=36+(300000/600000)*(420-36-9);
 assert.ok(Math.abs(hit[0].x1-expected)<.01);
 assert.ok(hit[1].x2>hit[0].x2);assert.equal(strokes,2);
 assert.equal(hit[1].source,'V493_PAPER');
 assert.equal(hit[0].source,'V52_PAPER');
 assert.ok(hit[0].y1>hit[1].y2,'tapping pink cannot select overlapping blue trade');
});
test('Vagues overlays current V4.9.4 and V5.4.2 ledgers; older trades retain their archived policy versions',()=>{
 assert.ok(src.includes('waveUiComparePaperTrades(now-48*3600000,now)'));
 assert.ok(src.includes('waveUiComparePaperTrades(startTs,endTs)'));
 assert.ok(src.includes('V52_PAPER'));assert.ok(src.includes('V493_PAPER'));
 assert.ok(src.includes('wavePaintV5Bands(canvas,v5Spans,t0,t1,'));
 assert.ok(src.includes('wavePaperPaintColor(z)'));
 assert.ok(src.includes('waveReplayData.showLegacyV4?waveTradeSpans'));
 assert.ok(src.includes('v5PaperTrades:live.v5PaperTrades||snapshot.v5PaperTrades||[]'));
 assert.ok(src.includes('v5PaperTrades:recent.v5PaperTrades||base.v5PaperTrades||[]'));
 assert.ok(src.includes('bleu V4.9.4'));assert.ok(src.includes('rose V5.4.2 / archives V5.2–V5.4.1'));
});
test('overlapping positions keep their own 10px lane and preserve true entry/exit vertical markers',()=>{
 const {wavePaintV5Bands}=browserTools(),ctxLines=[],fills=[];
 let commands=[];
 const ctx={save(){},restore(){},setTransform(){},rect(){},clip(){},
  beginPath(){commands=[]},moveTo(x,y){commands.push(['M',x,y])},
  lineTo(x,y){commands.push(['L',x,y])},
  stroke(){if(commands.length)ctxLines.push(commands.slice())},
  fillRect(x,y,w,h){fills.push([this.fillStyle,x,y,w,h])}};
 const canvas={width:840,getBoundingClientRect:()=>({width:420,height:200}),getContext:()=>ctx};
 const spans=[
  {source:'V493_PAPER',trade:7,entryTs:T-400000,exitTs:null,
   drawEndTs:T,open:true},
  {source:'V52_PAPER',trade:15,entryTs:T-400000,exitTs:T-100000,
   drawEndTs:T-100000,open:false}
 ];
 const hit=wavePaintV5Bands(canvas,spans,T-600000,T,
  {left:36,right:9,top:12,bottom:18});
 assert.deepEqual(fills.map(f=>f[2]),[12,172]);
 assert.deepEqual(fills.map(f=>f[4]),[10,10]);
 assert.equal(hit.length,2);
 const x=hit[0].x1+4;
 assert.ok(x>hit[1].x1&&x<hit[1].x2);
 assert.equal(hit.filter(z=>x>=z.hitX1&&x<=z.hitX2&&13>=z.y1&&13<=z.y2)[0].source,
  'V493_PAPER','tap top lane selects blue V4.9.3 only');
 assert.equal(hit.filter(z=>x>=z.hitX1&&x<=z.hitX2&&175>=z.y1&&175<=z.y2)[0].source,
  'V52_PAPER','tap bottom lane selects pink V5 only');
 assert.equal(ctxLines.length,2);
 assert.equal(ctxLines[0].length,2,'open V4 has a real entry marker but no invented exit');
 assert.equal(ctxLines[1].length,4,'closed V5 has entry and exit thin verticals');
 assert.ok(ctxLines.every(cs=>cs.every(a=>a[2]===12||a[2]===182)),
  'all boundary markers span plot height only');
});
test('clipped active trade displays lane but never invents an entry at viewport boundary',()=>{
 const {wavePaintV5Bands,wavePaintLegacyTradeLines}=browserTools();
 const fills=[],lines=[];
 let points=[];
 const ctx={save(){},restore(){},setTransform(){},beginPath(){points=[]},
  rect(){},clip(){},fillRect(...a){fills.push(a)},
  moveTo(x,y){points.push([x,y])},lineTo(x,y){points.push([x,y])},
  stroke(){if(points.length)lines.push(points.slice())}};
 const canvas={width:840,getBoundingClientRect:()=>({width:420,height:200}),getContext:()=>ctx};
 const zone={source:'V52_PAPER',trade:11,entryTs:T-720000,exitTs:null,
  drawEndTs:T,open:true};
 const hits=wavePaintV5Bands(canvas,[zone],T-600000,T,
  {left:36,right:9,top:12,bottom:18});
 assert.equal(fills.length,1);assert.equal(fills[0][3],10);
 assert.equal(hits.length,1);assert.equal(hits[0].x1,36);
 assert.equal(lines.length,0,'no vertical line at false clipped start or current live endpoint');
 const leg=wavePaintLegacyTradeLines(canvas,
  [{trade:99,entryTs:T-120000,exitTs:T-60000}],T-600000,T,
  {left:36,right:9,top:12,bottom:18});
 assert.equal(fills.length,1,'old V4 draws no filled third lane');
 assert.equal(leg.length,2);assert.equal(lines.length,2);
});
test('price, Wave15 and Wave3 all use lanes, not shaded chart-height positions',()=>{
 const price=extract('function drawWavePrice(canvas,idx) {','function waveSetPriceTf(tf){');
 const wave=extract('function drawWaveBand(canvas, key, idx) {','function renderWaveReplay() {');
 assert.ok(price.includes('tradeSpans:[]'),'shared BTC renderer receives no shading spans');
 assert.ok(price.includes('canvas._waveTradeZones=wavePaintV5Bands(canvas,v5Spans'));
 assert.ok(price.includes('wavePaintLegacyTradeLines(canvas,spans'));
 assert.ok(wave.includes('canvas._waveTradeZones=wavePaintV5Bands(canvas'));
 assert.ok(wave.includes('wavePaintLegacyTradeLines(canvas'));
 assert.ok(!wave.includes('ctx.fillRect(x1,T,width,h)'));
 assert.ok(!wave.includes('ctx.fillRect(x1,T,zoneW,h)'));
 assert.ok(!price.includes('tradeSpans:spans'));
 assert.ok(src.includes('Toucher la bande bleue en haut'));
 assert.ok(src.includes('bande supérieure V4.9.3 ou inférieure V5'));
});
