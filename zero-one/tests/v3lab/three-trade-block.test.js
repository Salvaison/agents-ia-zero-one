'use strict';
const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'boono-block-')),'state.json');
process.env.V3LAB_EXPERIMENT_BLOCK_PATH=tmp;
process.env.V3LAB_EXPERIMENT_REVIEW_HISTORY_PATH=tmp+'.reviews.ndjson';
const b=require('../../modules/v3lab/experiments/three-trade-block');
let s=b.initialize({startedAt:'2026-09-24T10:30:00.000Z',baselineHistoryLength:90,baselineLastExit:'2026-09-24T02:15:22.929Z'});
assert.equal(s.activeConfig.configId,b.CONFIG_ID);
assert.equal(s.closedTradesInBlock,0);
assert.equal(s.reviewDue,false);
s=b.onTradeClosed({entryTimestamp:'old-e',exitTimestamp:'old-x',direction:'long',entryMode:'TEST',entryPrice:100,exitPrice:101,
  pnlPercentLeveraged:1,mfeUsd:2,maeUsd:1,exitKind:'EXIT_TEST',exitReason:'legacy',experimentConfigId:'OLD_CONFIG'});
assert.equal(s.closedTradesInBlock,0);
assert.equal(s.trades.length,0);
assert.ok(fs.readFileSync(tmp+'.reviews.ndjson','utf8').includes('FOREIGN_CONFIG_TRADE_AFTER_ROLLOVER'));
for(let i=1;i<=3;i++){
  s=b.onTradeClosed({entryTimestamp:'e'+i,exitTimestamp:'x'+i,direction:i%2?'long':'short',entryMode:'TEST',entryPrice:100,exitPrice:101,pnlPercentLeveraged:i,mfeUsd:2,maeUsd:1,exitKind:'EXIT_TEST',exitReason:'test'});
}
assert.equal(s.closedTradesInBlock,3);
assert.equal(s.trades.length,3);
assert.equal(s.reviewDue,true);
s=b.onTradeClosed({entryTimestamp:'e4',exitTimestamp:'x4',direction:'long',entryMode:'TEST',entryPrice:100,exitPrice:99,pnlPercentLeveraged:-1,mfeUsd:0,maeUsd:1,exitKind:'EXIT_TEST',exitReason:'test'});
assert.equal(s.closedTradesInBlock,3);
assert.equal(s.overflowTrades.length,1);
const next=b.completeReview({verdict:'test'});
assert.equal(next.blockNumber,2);
assert.equal(next.closedTradesInBlock,1);
assert.equal(next.trades.length,1);
assert.equal(next.trades[0].entryTimestamp,'e4');
assert.equal(next.reviewDue,false);
assert.equal(next.overflowTrades.length,0);
assert.ok(fs.existsSync(tmp+'.reviews.ndjson'));
fs.rmSync(path.dirname(tmp),{recursive:true,force:true});
console.log('three-trade-block.test.js OK');
