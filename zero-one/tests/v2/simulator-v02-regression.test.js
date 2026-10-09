'use strict';
const assert=require('assert');
const risk=require('../../modules/v2/layers/risk');
const dominance=require('../../modules/v2/layers/dominance');
const decision=require('../../modules/v2/layers/decision');

// Un obstacle tres proche doit reduire le R/R, jamais disparaitre.
const where={nextBelow:{distanceUsd:-20},nextLgiBelow:{distanceUsd:-8}};
assert.strictEqual(risk.targetDistance(where,'short',75000),8);

// Une donnee absente ne doit pas devenir artificiellement zero.
const m=dominance.micro({ts:1,cadence:null,volumeFenetreBtc:null,winSec:null,priceMove:null,lastPrice:null});
assert.strictEqual(m.cadence,null);
assert.strictEqual(m.vol,null);
assert.strictEqual(m.price,null);
assert.strictEqual(m.dir,'neutral');
