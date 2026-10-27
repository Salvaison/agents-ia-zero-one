'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const scope=require('../../modules/v4/experiments/divergence-polarity-scope');
const detect=require('../../modules/v4/experiments/divergence-causal-shadow');
const adapter=require('../../modules/attention/evidence-adapters');
const attention=require('../../modules/attention/attention-memory');
const TF=15*60000,T0=Date.parse('2026-10-20T00:00:00Z');
const CET=s=>Date.parse('2026-10-27T'+s+'+01:00');
function row(i,lbw,low,close=940,high=980,ma=1000,mf=-10){
 return {ts:T0+i*TF,low,high:Math.max(close,high),close,open:close,
  ma200:ma,lt_blue_wave:lbw,blue_wave:lbw+5,money_flow:mf};
}
function fixture(){
 const vals=[
 [-20,940],[-70,900],[-55,910],[-30,920],[4,930],
 [-60,830],[-40,840],[-20,850],[5,870],
 [-65,820],[-25,835],[-15,855],[4,880],
 [-80,780],[-40,815],[-25,835],[3,855],
 [-52,750],[-30,800],[-20,825],[4,865],
 [-12,870],[5,900]
 ];
 const rows=vals.map(([lbw,low],i)=>row(i,lbw,low,940,980,1000,-25+i));
 rows[21].high=1030; // Wick pierces MA, but CLOSE remains below: not a flip.
 rows.push(row(23,8,925,1025,1050)); // first confirmed above close
 rows.push(row(24,20,1006,1040,1060)); // second confirmed above close
 rows.push(row(25,30,1020,1050,1070));
 return rows;
}
test('one wick / one opposite close cannot reset the MA polarity regime',()=>{
 const b=fixture();
 const pre=scope.resolve(b,'15m',b[22].ts+TF);
 const touch=scope.resolve(b,'15m',b[23].ts+TF);
 assert.equal(pre.side,'BELOW');
 assert.equal(touch.side,'BELOW');
 assert.equal(pre.id,touch.id);
 assert.equal(pre.transitions.filter(x=>x.type==='POLARITY_CHANGED').length,0);
});
test('multidiv persists across nonmonotone LBW and an irregular price wick within SAME MA regime',()=>{
 const b=fixture().slice(0,23);
 const asOf=b.at(-1).ts+TF;
 const cat=detect.detectTimeframe(b,[],'15m',asOf);
 const line=cat.lines.find(l=>l.kind==='MULTIDIV'&&l.direction==='bullish');
 assert.ok(line,'the reader must keep a multilineage even with imperfect intermediate pivots');
 assert.equal(line.points.length,3);
 assert.equal(line.start.extremeTs,b[1].ts);
 assert.equal(line.points[0].extremeTs,b[5].ts);
 assert.equal(line.points[1].extremeTs,b[9].ts,
  'LBW end -65 is less favorable than earlier -60, but remains above the anchor -70');
 assert.equal(line.points[2].extremeTs,b[17].ts);
 assert.ok(line.irregular.some(p=>p.at===b[13].ts),
  'a deeper wick with adverse LBW stays documented without cancelling the lineage');
 assert.equal(line.regimeSide,'BELOW');
 assert.equal(line.decisionImpact,false);
 assert.equal(line.consumedByWick,false);
 assert.equal(cat.counts.multidiv,1);
 assert.equal(cat.polarityRegime.id,line.regimeId);
});
test('two confirmed opposite closes CLOSE older anchor family, with no borrowed new pivot from flip candles',()=>{
 const b=fixture(),oldTime=b[23].ts+TF,flipTime=b[24].ts+TF;
 const pre=detect.detectTimeframe(b,[],'15m',oldTime);
 const after=detect.detectTimeframe(b,[],'15m',flipTime);
 assert.equal(pre.polarityRegime.side,'BELOW');
 assert.equal(pre.lines.some(l=>l.kind==='MULTIDIV'),true);
 assert.equal(after.polarityRegime.side,'ABOVE');
 assert.notEqual(after.polarityRegime.id,pre.polarityRegime.id);
 assert.equal(after.polarityRegime.confirmedAt,flipTime);
 assert.equal(after.polarityRegime.openedAt,flipTime);
 assert.equal(after.lines.length,0);
 assert.equal(after.polarityRegime.recentTransitions.at(-1).type,'POLARITY_CHANGED');
 const x=adapter.lbw15Observations(b,flipTime);
 assert.equal(x.length,0,'V5 observation cannot recycle old anchor when MA flips');
});
test('no future close: second opposite candle cannot close the regime 1 ms early',()=>{
 const b=fixture();
 const x=scope.resolve(b,'15m',b[24].ts+TF-1);
 assert.equal(x.side,'BELOW');
});
test('polarity status stays explicitly UNKNOWN when the MA source is missing',()=>{
 const b=fixture().map(x=>({...x,ma200:null})).slice(0,15);
 const s=scope.resolve(b,'15m',b.at(-1).ts+TF);
 assert.equal(s.status,'MA200_UNAVAILABLE');
 assert.equal(s.side,'UNKNOWN');
 assert.equal(s.id,null);
 assert.equal(s.decisionImpact,false);
});
test('V5 and V4 attention forget stale divergence anchors after an observed polarity switch',()=>{
 const b=fixture();
 const preTime=b[23].ts+TF,now=b[24].ts+TF;
 const below=scope.compact(scope.resolve(b,'15m',preTime));
 const above=scope.compact(scope.resolve(b,'15m',now));
 const seeded=attention.evaluate({now:preTime-1,campaignId:'SAME',
  campaignDirection:'long',polarityRegime:below,observations:[
  {kind:'MCB15_LBW_DIVERGENCE',direction:'long',sourceAt:preTime-3,
   availableAt:preTime-2,polarityRegimeId:below.id,
   anchors:{priceFirst:900,priceSecond:800,lbwFirst:-70,lbwSecond:-55}},
  {kind:'MCB3_NATIVE',direction:'long',sourceAt:preTime-3,availableAt:preTime-2}]});
 const flipped=attention.evaluate({now,previous:seeded,
  campaignId:'SAME',campaignDirection:'long',polarityRegime:above});
 assert.equal(flipped.events.some(e=>e.kind==='MCB15_LBW_DIVERGENCE'),false);
 assert.equal(flipped.events.some(e=>e.kind==='MCB3_NATIVE'),true);
 assert.equal(flipped.polarityRegime.side,'ABOVE');
 assert.equal(flipped.entryAllowed,null);
 assert.equal(flipped.exitRequested,null);
 assert.equal(flipped.brokerOrdersEnabled,false);
});
test('A valid divergence keeps its original anchor despite age and a flood of tactical observations',()=>{
 const at=T0+60*TF,known=T0+5*TF;
 const regime={id:'15m|BELOW|'+(T0+2*TF),openedAt:T0,side:'BELOW'};
 const ev={kind:'MCB15_LBW_DIVERGENCE',direction:'long',
  sourceAt:known,availableAt:known,polarityRegimeId:regime.id,
  anchors:{priceFirst:900,priceSecond:790,lbwFirst:-75,lbwSecond:-50}};
 const noise=Array.from({length:300},(_,i)=>({
  kind:'PRICE_TRANSLATION',direction:'long',sourceAt:at-300000+i*1000,
  availableAt:at-300000+i*1000,price:850+i}));
 const observed=attention.evaluate({now:at,campaignId:'REGIME_A',
  campaignDirection:'long',positionDirection:'long',
  polarityRegime:regime,observations:[ev,...noise]});
 assert.ok(observed.events.some(e=>e.kind==='MCB15_LBW_DIVERGENCE'));
 assert.ok(observed.events.length<=240);
 assert.equal(observed.entryAllowed,null);
 assert.equal(observed.exitRequested,null);
});
test('A separate historical Oct26 17:15 CET flip also resets price-anchor membership',()=>{
 const bars=require('./fixtures/ma15_polarity_and_multidiv_2026-10-26_27.json').rows;
 const flip=Date.parse('2026-10-26T17:15:00+01:00');
 const before=scope.resolve(bars,'15m',flip-1);
 const after=scope.resolve(bars,'15m',flip);
 assert.equal(before.side,'ABOVE');
 assert.equal(after.side,'BELOW');
 assert.notEqual(before.id,after.id);
 assert.equal(after.openedAt,flip);
 assert.equal(after.transitions.at(-1).type,'POLARITY_CHANGED');
 assert.equal(after.transitions.at(-1).from,'ABOVE');
 assert.equal(after.transitions.at(-1).to,'BELOW');
});
test('Actual Oct27 13:45 CET polarity flip closes the 05:30 -> 11:15 LBW15 line',()=>{
 const bars=require('./fixtures/ma15_polarity_and_multidiv_2026-10-26_27.json').rows;
 const before=CET('13:45:00')-1,after=CET('13:45:00');
 const x=detect.detectTimeframe(bars,[],'15m',before);
 const y=detect.detectTimeframe(bars,[],'15m',after);
 assert.equal(x.polarityRegime.side,'BELOW');
 const longLine=x.lines.find(l=>l.direction==='bullish'&&
  l.kind==='MULTIDIV'&&l.end.extremeTs===CET('11:15:00'));
 assert.ok(longLine,'the entire below-MA15 regime can extend the earlier lineage');
 assert.equal(longLine.start.extremeTs,Date.parse('2026-10-26T21:45:00+01:00'));
 assert.ok(longLine.points.some(p=>p.extremeTs===CET('05:30:00')));
 assert.ok(longLine.points.length>=3);
 assert.equal(y.polarityRegime.side,'ABOVE');
 assert.equal(y.lines.some(l=>l.start.extremeTs<CET('13:45:00')),false);
 assert.equal(y.lines.length,0);
 assert.equal(y.polarityRegime.confirmedAt,after);
 const mf=adapter.divergenceFromBars(bars,after);
 assert.equal(mf.some(l=>l.sourceAt<CET('13:45:00')),false);
 assert.equal(adapter.lbw15Observations(bars,after).length,0);
});
