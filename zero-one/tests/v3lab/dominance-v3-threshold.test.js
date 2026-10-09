'use strict';
const assert=require('assert');
const d=require('../../modules/v3lab/layers/dominance');
const base={state:'DOMINATION_EMERGENTE',direction:'long',persistCount:2,conserved:true,proofScore:.64};
const promoted=d.applyV3Thresholds(base);
assert.equal(promoted.state,'DOMINATION_PERSISTANTE');
assert.equal(promoted.v3ThresholdOverride.promoted,true);
assert.equal(promoted.v3ThresholdOverride.persistMinCount,2);
assert.equal(promoted.v3ThresholdOverride.proofMin,.62);

const weak=d.applyV3Thresholds({...base,proofScore:.61});
assert.equal(weak.state,'DOMINATION_EMERGENTE');
assert.equal(weak.v3ThresholdOverride.promoted,false);

const notConserved=d.applyV3Thresholds({...base,conserved:false});
assert.equal(notConserved.state,'DOMINATION_EMERGENTE');

const one=d.applyV3Thresholds({...base,persistCount:1});
assert.equal(one.state,'DOMINATION_EMERGENTE');
console.log('dominance-v3-threshold.test.js OK');
