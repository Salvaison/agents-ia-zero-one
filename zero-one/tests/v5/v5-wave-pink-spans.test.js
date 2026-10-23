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
test('V5 rose bands align with UTC trade durations and preserve open-vs-closed stroke',()=>{
 const {waveV5TradeSpans,wavePaintV5Bands}=browserTools();
 const spans=waveV5TradeSpans([
  {source:'V5_PAPER',trade:1,entryTs:T-300000,exitTs:T-120000,entryPrice:81800,
   exitPrice:81900,netPnlUsd:.34,direction:'long',open:false},
  {source:'V5_PAPER',trade:2,entryTs:T-60000,exitTs:null,entryPrice:81920,
   exitPrice:null,netPnlUsd:-1.19,direction:'short',open:true}
 ],T);
 assert.equal(spans.length,2);
 assert.equal(spans[0].drawEndTs,T-120000);
 assert.equal(spans[1].drawEndTs,T);
 let fills=[],strokes=0;
 const ctx={save(){},restore(){},setTransform(){},beginPath(){},rect(){},clip(){},
  fillRect(...a){fills.push({color:this.fillStyle,rect:a});},moveTo(){},lineTo(){},
  stroke(){strokes++}};
 const canvas={width:840,getBoundingClientRect:()=>({width:420,height:200}),getContext:()=>ctx};
 const hit=wavePaintV5Bands(canvas,spans,T-600000,T,{left:36,right:9,top:12,bottom:18});
 assert.equal(hit.length,2);assert.equal(fills.length,2);
 assert.ok(fills.every(v=>v.color==='rgba(224,72,151,.15)'));
 const x0=36+(300000/600000)*(420-36-9);
 assert.ok(Math.abs(hit[0].x1-x0)<.01,'entry precisely mapped to price time axis');
 assert.ok(hit[1].x2>hit[0].x2);
 assert.equal(strokes,2);
 assert.equal(hit[0].trade.source,'V5_PAPER');
 assert.equal(hit[1].trade.open,true);
});
test('V5 is rendered on Waves 3m and 15m, with distinct source and pink V5 panel',()=>{
 assert.ok(src.includes('waveV5TradeSpans(waveReplayData.v5PaperTrades||[],t1).forEach'));
 assert.ok(src.includes('wavePaintV5Bands(canvas,v5Spans,t0,t1,'));
 assert.ok(src.includes("ctx.fillStyle='rgba(135,206,235,.18)'"),'V4 blue remains unchanged');
 assert.ok(src.includes("ctx.fillStyle='rgba(224,72,151,.15)'"));
 assert.ok(src.includes("if(t.source==='V5_PAPER')"));
 assert.ok(src.includes('v5PaperTrades:waveUiV5PaperTrades(now-48*3600000,now)'));
 assert.ok(src.includes('v5PaperTrades:live.v5PaperTrades||snapshot.v5PaperTrades||[]'));
 assert.ok(src.includes('v5PaperTrades:recent.v5PaperTrades||base.v5PaperTrades||[]'));
 assert.ok(src.includes('rose V5 PAPER'),'pink legend even before first V5 trade');
});
