'use strict';
const assert=require('assert');
const ledger=require('../../modules/v3lab/experiments/combat-ledger-shadow');

const rows=[];
const base=1_800_000_000_000;
const prices=[1000,900,950,850,930,800,880,750];
for(let i=0;i<prices.length;i++){
  const move=i?prices[i]-prices[i-1]:0;
  rows.push({ts:base+i*60_000,lastPrice:prices[i],priceMove:move,
    cadence:10+i,volumeFenetreBtc:Math.max(1,Math.abs(move)/10),winSec:10});
}
const p=ledger.priceLedger(rows,'short');
assert.equal(p.grossBullUsd,210);
assert.equal(p.grossBearUsd,460);
assert.equal(p.netUsd,-250);
assert.equal(p.netInDirectionUsd,250);

const legs=ledger.swingLegs(rows,50);
assert.ok(legs.length>=5);
const a=ledger.attackSummary(legs,'short',50);
assert.equal(a.direction,'long');
assert.ok(a.materialCount>=2);
assert.ok(a.fullyReabsorbedCount>=2);
const frame={market:{timestamp:base+7*60_000,price:750},sources:{auditRows:rows}};
const result={
  wave:{direction:'short',origin:{ts:base},structural:{available:false}},
  risk:{respiration:{p75:50}}
};
const out=ledger.evaluate(frame,result,null);
assert.equal(out.decisionImpact,false);
assert.equal(out.campaignDirectionSource,'WAVE_PHASE_FALLBACK_SHADOW_ONLY');
assert.equal(out.campaign.direction,'short');
assert.ok(out.campaign.micro.bear.n>0);
assert.ok(out.campaign.micro.bull.n>0);
console.log('combat-ledger-shadow.test.js OK');
