'use strict';
const assert=require('assert');
const d=require('../../modules/v4/experiments/divergence-causal-shadow');

function p(ts,price,lbw){
  return {confirmedAt:ts,extremeTs:ts,price,lbw};
}

const bearish15=d.regularLineages([
  p(1,86063.5,100.6),
  p(2,86687.1,96.1),
  p(3,86777.0,87.8),
  p(4,86963.7,64.2)
],'15m','bearish');
assert.strictEqual(bearish15.length,1);
assert.strictEqual(bearish15[0].start.confirmedAt,1);
assert.strictEqual(bearish15[0].end.confirmedAt,4);

const bullish3=d.regularLineages([
  p(1,85730.5,-80.2),
  p(2,85440.0,-52.2),
  p(3,85130.5,-59.2)
],'3m','bullish');
assert.strictEqual(bullish3.length,1);
assert.strictEqual(bullish3[0].start.confirmedAt,1);
assert.strictEqual(bullish3[0].end.confirmedAt,3);

const cont1h=d.anchoredContinuationChain([
  {confirmedAt:1,extremeTs:0,price:87239,lbw:70.7},
  {confirmedAt:2,extremeTs:1,price:85394,lbw:83.5},
  {confirmedAt:3,extremeTs:2,price:86777,lbw:100.2},
  {confirmedAt:4,extremeTs:3,price:86964,lbw:95.9}
],'1h','bullish');
assert(cont1h);
assert.strictEqual(cont1h.points.length,2);
assert.strictEqual(cont1h.end.confirmedAt,3);

const daily=d.anchorMultidiv([
  p(1,81260,75.7),
  p(2,84931,52.5)
],p(3,86485,55.0),'1d','bearish');
assert(daily);
assert.strictEqual(daily.kind,'MULTIDIV');
assert.strictEqual(daily.status,'FORMING');
assert.strictEqual(daily.points.length,2);


// 3m hidden/continuation structures are diagnostic candidates only: they must
// never pollute the displayed WAVE lines until visually validated.
{
  const base=1_800_000_000_000,step=180000;
  const vals=[20,55,40,-20,-60,-30,25,70,45];
  const rows=vals.map((lbw,i)=>({
    ts:base+i*step,timestamp:new Date(base+i*step).toISOString(),
    high:lbw>0?1000+i*10:990+i*5,
    low:lbw<0?900-i*10:950-i*5,
    close:970,lt_blue_wave:lbw
  }));
  const out=d.detectTimeframe(rows,[],'3m');
  assert.strictEqual(out.lines.some(x=>x.kind==='CONTINUATION'),false);
  assert.ok(Array.isArray(out.continuationCandidates));
}


// V0.6: local causal E15 bullish model must prefer meaningful local structures,
// not long-range mathematically-valid weak comparisons.
{
  const piv=[
    {type:'CREUX',extremeTs:1,confirmedAt:2,price:84701.8,lbw:-4.16},
    {type:'CREUX',extremeTs:3,confirmedAt:4,price:85087.7,lbw:-14.22},
    {type:'CREUX',extremeTs:5,confirmedAt:6,price:85089.9,lbw:-27.39},
    {type:'CREUX',extremeTs:7,confirmedAt:8,price:85450,lbw:-74.57},
    {type:'CREUX',extremeTs:9,confirmedAt:10,price:85923,lbw:-16.71},
    {type:'CREUX',extremeTs:11,confirmedAt:12,price:85874.8,lbw:-14.42},
    {type:'CREUX',extremeTs:13,confirmedAt:14,price:85818.2,lbw:-27.73},
    {type:'CREUX',extremeTs:15,confirmedAt:16,price:85751.5,lbw:-18.57},
    {type:'CREUX',extremeTs:17,confirmedAt:18,price:84937.5,lbw:-52.54},
    {type:'CREUX',extremeTs:19,confirmedAt:20,price:85281.2,lbw:-53.65},
    {type:'CREUX',extremeTs:21,confirmedAt:22,price:85212.2,lbw:-53.62}
  ];
  const lines=d.localBullish15mFromPivots(piv);
  const h=lines.find(x=>x.kind==='CONTINUATION');
  const r=lines.find(x=>x.kind==='REGULAR');
  assert(h);
  assert.strictEqual(h.start.extremeTs,5);
  assert.strictEqual(h.end.extremeTs,7);
  assert(h.strength.lbwDelta>=20);
  assert(r);
  assert.strictEqual(r.start.extremeTs,7);
  assert.strictEqual(r.end.extremeTs,17);
}


// V0.5: bearish 15m uses the same causal local E15 lineage.
// Regression for 09/10/2026: price makes a materially higher high while LBW
// prints a lower crest. The lineage must retain the strong 06:00 anchor and
// extend to the latest qualifying crest instead of falling back to a smaller
// persistent-signal divergence.
{
  const piv=[
    {type:'CRETE',extremeTs:1,confirmedAt:2,price:82482.4,lbw:83.608694},
    {type:'CRETE',extremeTs:3,confirmedAt:4,price:82580.0,lbw:62.756565},
    {type:'CRETE',extremeTs:5,confirmedAt:6,price:82625.0,lbw:60.081522},
    {type:'CRETE',extremeTs:7,confirmedAt:8,price:82663.8,lbw:58.994407},
    {type:'CRETE',extremeTs:9,confirmedAt:10,price:82713.3,lbw:53.126714},
    {type:'CRETE',extremeTs:11,confirmedAt:12,price:82683.0,lbw:53.306690},
    {type:'CRETE',extremeTs:13,confirmedAt:14,price:83310.9,lbw:64.855796}
  ];
  const lines=d.localBearish15mFromPivots(piv);
  assert.strictEqual(lines.length,1);
  const r=lines[0];
  assert.strictEqual(r.direction,'bearish');
  assert.strictEqual(r.source,'CAUSAL_E15_LOCAL_DIVERGENCE');
  assert.strictEqual(r.start.extremeTs,1);
  assert.strictEqual(r.end.extremeTs,13);
  assert(r.strength.priceDeltaUsd>800);
  assert(r.strength.lbwDelta>18);
}


// V0.6: an old bullish anchor cannot be reused after a divergence from that
// anchor has already translated enough to reclaim the anchor price.
{
  const piv=[
    {type:'CREUX',extremeTs:1,confirmedAt:2,price:100,lbw:-80},
    {type:'CREUX',extremeTs:10,confirmedAt:11,price:40,lbw:-60},
    {type:'CREUX',extremeTs:30,confirmedAt:31,price:30,lbw:-50}
  ];
  const series=[
    {ts:1,high:101,low:100,close:100,lt_blue_wave:-80},
    {ts:10,high:42,low:40,close:41,lt_blue_wave:-60},
    {ts:12,high:70,low:42,close:68,lt_blue_wave:-40},
    {ts:20,high:101,low:90,close:100,lt_blue_wave:20},
    {ts:30,high:32,low:30,close:31,lt_blue_wave:-50},
    {ts:31,high:34,low:31,close:33,lt_blue_wave:-45}
  ];
  assert.strictEqual(d.regularAnchorConsumedBeforeEnd(series,piv,piv[0],piv[2],'bullish'),true);
}

// V0.6: a hidden bullish continuation is consumed after price breaks the
// intervening structural high; it must not remain a current Wave relation.
{
  const line={
    kind:'CONTINUATION',direction:'bullish',
    start:{extremeTs:1,confirmedAt:2,price:100,lbw:-30},
    end:{extremeTs:10,confirmedAt:11,price:110,lbw:-70}
  };
  const series=[
    {ts:1,high:102,low:100,close:101,lt_blue_wave:-30},
    {ts:5,high:130,low:115,close:125,lt_blue_wave:40},
    {ts:10,high:112,low:110,close:111,lt_blue_wave:-70},
    {ts:11,high:115,low:111,close:114,lt_blue_wave:-60},
    {ts:20,high:131,low:120,close:130,lt_blue_wave:50}
  ];
  assert.strictEqual(d.hiddenLineConsumed(series,line),true);
}


// V0.7: current 15m display anchors to the latest structural E15, while a
// weaker same-side local pivot may still be the divergence endpoint.
{
  const base=1_900_000_000_000,step=15*60*1000;
  const vals=[20,-80,-60,-40,20,60,40,20,-20,-70,-50,-30,10,50,30,20,-2,-5,-1,2,10,30,10,0];
  const rows=vals.map((lbw,i)=>({
    ts:base+i*step,timestamp:new Date(base+i*step).toISOString(),
    high:90,low:80,close:85,lt_blue_wave:lbw
  }));
  rows[1].low=80;
  rows[5].high=120;
  rows[9].low=60;
  rows[13].high=100;
  rows[17].low=70;   // local trough, too weak in LBW to replace structural CREUX
  rows[21].high=180; // local crest, lower LBW than structural CRETE -> bearish div

  const bullAnchor=d.latestStructuralAnchor15m(rows,'bullish');
  const bearAnchor=d.latestStructuralAnchor15m(rows,'bearish');
  assert(bullAnchor);
  assert(bearAnchor);
  assert.strictEqual(bullAnchor.extremeTs,rows[9].ts);
  assert.strictEqual(bearAnchor.extremeTs,rows[13].ts);
  assert.strictEqual(d.activeRegular15mFromStructuralAnchor(rows,'bullish'),null);
  const bear=d.activeRegular15mFromStructuralAnchor(rows,'bearish');
  assert(bear);
  assert.strictEqual(bear.start.extremeTs,rows[13].ts);
  assert.strictEqual(bear.end.extremeTs,rows[21].ts);
}

console.log('Divergence causal shadow v0.7 tests OK');
