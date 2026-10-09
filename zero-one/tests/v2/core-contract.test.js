'use strict';

const assert = require('assert');
const { BoonoCoreV02 } = require('../../modules/v2/core/engine');

const calls = [];
const layer = name => ({ evaluate(snapshot, context) {
  calls.push(name);
  if (name === 'location') return { confidence: 'HIGH', zones: [] };
  if (name === 'state') { assert(context.where); return { phase: 'expansion' }; }
  if (name === 'dominance') { assert(context.state); return { status: 'none' }; }
  if (name === 'risk') { assert(context.dominance); return { state: 'WATCH' }; }
  if (name === 'decision') { assert(context.risk); return { action: 'WATCH' }; }
} });

const core = new BoonoCoreV02({
  location: layer('location'),
  state: layer('state'),
  dominance: layer('dominance'),
  risk: layer('risk'),
  decision: layer('decision'),
});

const snapshot = {
  market: { price: 75800, timestamp: Date.now() },
  sources: { price: { source: 'test' } },
};

const out = core.evaluate(snapshot);
assert.deepStrictEqual(calls, ['location','state','dominance','risk','decision']);
assert.strictEqual(out.action.action, 'WATCH');
assert.strictEqual(out.price, 75800);

assert.throws(() => core.evaluate({ market: { price: NaN, timestamp: Date.now() }, sources: {} }), /price/);
assert.throws(() => new BoonoCoreV02({}), /layer/);

console.log('core-contract.test.js OK');
