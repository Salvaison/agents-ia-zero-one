'use strict';
const assert=require('assert');
const ma=require('../../modules/v3lab/experiments/ma200-shadow');

function r(min,close,low,high,ma200=100){
  const ts=Date.UTC(2026,8,20,0,min,0);
  return {ts,timestamp:new Date(ts).toISOString(),open:close,close,low,high,ma200,source:'confirmed'};
}

// A grouped contact approached from below and resolved above = CROSS_UP.
{
  const rows=[
    r(0,98,97.5,98.5),
    r(3,99.5,99,100.2),
    r(6,100.2,99.6,100.8),
    r(9,101.5,101,102),
  ];
  const e=ma.buildEpisodes(rows,'3m');
  assert.equal(e.length,1);
  assert.equal(e[0].event,'CROSS_UP');
  assert.equal(e[0].approachSide,'BELOW');
  assert.equal(e[0].outcomeSide,'ABOVE');
}

// A grouped contact approached from above and stayed above = dynamic support hold.
{
  const rows=[
    r(0,102,101.5,102.5),
    r(3,100.4,99.8,101),
    r(6,102,101.2,102.4),
  ];
  const e=ma.buildEpisodes(rows,'3m');
  assert.equal(e.length,1);
  assert.equal(e[0].event,'HOLD_AS_SUPPORT');
}

// Runtime integration: the shadow includes 3m/15m/1h/4h/daily and is non-decisionnel.
{
  const out=ma.evaluate({market:{price:80600,timestamp:Date.now()}});
  assert.equal(out.decisionImpact,false);
  assert.deepEqual(out.timeframes,['3m','15m','1h','4h','1d']);
  for(const tf of out.timeframes){
    assert.ok(out.byTf[tf]);
    assert.equal(out.byTf[tf].decisionImpact,false);
  }
  assert.equal(out.synthesis.decisionImpact,false);
  assert.ok(out.sourceBoundary.archiveMixedSource);
}

console.log('ma200-shadow.test.js OK');
