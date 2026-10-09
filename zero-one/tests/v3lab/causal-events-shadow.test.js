'use strict';
const assert=require('assert');
const causal=require('../../modules/v3lab/experiments/causal-events-shadow');

const now=1_800_000_000_000;
const rows=[];
for(let i=0;i<80;i++){
  rows.push({ts:now-(79-i)*60_000,lastPrice:1000+i});
}
const frame={market:{timestamp:now,price:1200},sources:{auditRows:rows}};
const imp=causal.impulse(frame);
assert.equal(imp.direction,'long');
assert.ok(imp.net5mUsd>0);
assert.ok(['P90_PLUS','P95_PLUS','P99_PLUS'].includes(imp.rarity));
assert.equal(imp.semantic,'EVENT_DETECTOR_ONLY_NOT_DIRECTION_PERMISSION');

const ma={byTf:{'3m':{
  current:{distanceUsd:-50,side:'BELOW'},
  campaign:{currentRun:{side:'BELOW',bars:5}},
  recentContacts:[
    {event:'CROSS_DOWN',resolveTimestamp:'a'},
    {event:'HOLD_AS_RESISTANCE',resolveTimestamp:'b'},
    {event:'HOLD_AS_RESISTANCE',resolveTimestamp:'c'},
    {event:'HOLD_AS_RESISTANCE',resolveTimestamp:'d'},
  ]
}}};
const b=causal.boundary(ma);
assert.equal(b.consecutiveResolvedHoldCount,3);
assert.equal(b.consecutiveResolvedHoldDirection,'short');
const result={
  regime:{state:'CHOC_COMBAT',current:{netUsd:-200,efficiency:.08,grossPerHour:1000,cadenceP95:50,moveP95:40}},
  dominance:{state:'DOMINATION_PERSISTANTE',direction:'short',proofScore:.8,persistCount:3,
    retainedFraction:.9,conserved:true,scores:{long:1,short:4}},
  wave:{turningPoint:'CRETE_EN_FORMATION',current:{lbw:60},phase:'MONTEE',
    completedLeg:{available:true,direction:'long',deltaUsd:300,magnitudeUsd:300,
      start:{timestamp:'a'},end:{timestamp:'b'}}}
};
const out=causal.evaluate(frame,result,ma);
assert.equal(out.decisionImpact,false);
assert.equal(out.combat.dominance.direction,'short');
assert.equal(out.completedLeg.direction,'long');
assert.equal(out.turningLegacy.type,'CRETE_EN_FORMATION');

console.log('V3 causal events shadow: OK');
