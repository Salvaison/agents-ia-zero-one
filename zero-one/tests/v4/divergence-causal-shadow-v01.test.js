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


// V0.4: local causal E15 bullish model must prefer meaningful local structures,
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

console.log('Divergence causal shadow v0.4 tests OK');
