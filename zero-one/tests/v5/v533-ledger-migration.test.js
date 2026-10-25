'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const paper=require('../../modules/v5/paper-v52');
const v532=require('../../modules/v5/decision-v532');
test('V5.3.2 ledger migrates in memory without changing historical position, PNL or keys',()=>{
 const old={...paper.initial(1000),version:paper.V532_VERSION,
  completed:14,realizedUsd:-21.7389,equityUsd:978.2611,
  feesUsd:21.0024,usedKeys:['long|E3:1|E15:10'],
  history:[{tradeNo:14,entryPolicyVersion:v532.VERSION,netPnlUsd:-2.9862}],
  position:{direction:'long',entryPrice:80621.6,entryAt:1500,
   entryPolicyVersion:v532.VERSION,
   invalidationPrice:80568.1,gainFloorUsd:90}};
 const next=paper.migrate(old,2500);
 assert.equal(next.version,paper.VERSION);
 assert.equal(next.completed,14);
 assert.equal(next.realizedUsd,-21.7389);
 assert.equal(next.equityUsd,978.2611);
 assert.equal(next.feesUsd,21.0024);
 assert.deepEqual(next.usedKeys,old.usedKeys);
 assert.deepEqual(next.history,old.history);
 assert.equal(next.position.entryPolicyVersion,v532.VERSION);
 assert.equal(next.position.invalidationPrice,80568.1);
 assert.equal(next.position.gainFloorUsd,90);
 assert.equal(next.brokerOrdersEnabled,false);
 assert.equal(next.policyActivatedAt,2500);
});
