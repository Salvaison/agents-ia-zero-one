'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'modules/config-server.js'),'utf8');
function fragment(start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'function boundaries '+start);
 return source.slice(a,b);
}
const functions=[
 fragment('function waveUiFrame(r, state) {','function waveUiSnapshotSeries(tf,startTs,endTs){'),
 fragment('function waveBarAnchors(frames, key) {','function waveTradeSpans(events,endTs) {'),
 fragment('function waveTradeSpans(events,endTs) {','function waveSelectedTradeSpan() {'),
 fragment('function waveDrawFixedYAxis(key,yLimit,H,T,B,guides) {','function drawWavePrice(canvas,idx) {'),
 fragment('function drawWaveBand(canvas, key, idx) {','function renderWaveReplay() {')
].join('\n');
test('real Amsterdam Audit MCB15 fields reach 15m Waves anchors and canvas',t=>{
 const file=path.join(root,'data/audit-history.json');
 if(!fs.existsSync(file)){t.skip('Amsterdam Audit not mounted');return;}
 const audit=JSON.parse(fs.readFileSync(file,'utf8'));
 if(audit.length<50){t.skip('Audit too short for canvas');return;}
 const end=audit.at(-1).ts;
 const rows=audit.filter(r=>r.ts>=end-4*3600000);
 const ctx={
  waveUiFinite:v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v)),
  waveUiCompactEval:()=>null,
  window:{devicePixelRatio:1},
  document:{getElementById:()=>({style:{},innerHTML:''})},
  Intl,Date,Number,Math,escTrade:String,
 };
 vm.createContext(ctx);vm.runInContext(functions,ctx);
 const frames=rows.map(r=>ctx.waveUiFrame(r,null));
 const a15=ctx.waveBarAnchors(frames,'wave15');
 const a3=ctx.waveBarAnchors(frames,'wave3');
 assert.ok(a15.length>=12,'15m contains at least 12 anchored bars over 4h');
 for(const field of ['bw','lbw','mf','vwap'])
  assert.equal(a15.filter(r=>r[field]!==null).length,a15.length,
   'all 15m '+field+' anchors must retain numeric values');
 assert.ok(a3.length>a15.length);
 let strokes=0,beziers=0,fills=0;
 const brush={save(){},restore(){},setTransform(){},clearRect(){},
  beginPath(){},closePath(){},moveTo(){},lineTo(){},
  bezierCurveTo(){beziers++},stroke(){strokes++},fill(){fills++},
  fillRect(){},strokeRect(){},setLineDash(){},fillText(){},rect(){},clip(){},arc(){}};
 const box={width:420,height:185};
 const canvas={width:840,height:370,getBoundingClientRect:()=>box,getContext:()=>brush};
 ctx.waveReplayData={frames,events:[],signalEvents:{wave15:[],wave3:[]},
  divergenceCatalog:{},v5PaperTrades:[]};
 ctx.drawWaveBand(canvas,'wave15',frames.length-1);
 assert.ok(strokes>=10,'Wave15 has rendered strokes, not a blank canvas');
 assert.ok(beziers>15,'Wave15 BW/LBW/MF curves actually pass through renderer');
 assert.equal(canvas._waveTradeZones.length,0);
});
