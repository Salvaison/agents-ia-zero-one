'use strict';

const { validateSnapshot } = require('./contracts');

class BoonoCoreV02 {
  constructor(layers) {
    const required = ['location','state','dominance','risk','decision'];
    for (const name of required) {
      if (!layers || !layers[name] || typeof layers[name].evaluate !== 'function') {
        throw new TypeError(`layer ${name}.evaluate(snapshot, context) is required`);
      }
    }
    this.layers = layers;
  }

  evaluate(snapshot, previous = null) {
    validateSnapshot(snapshot);
    const context = { previous, snapshot };

    const where = this.layers.location.evaluate(snapshot, context);
    context.where = where;

    const state = this.layers.state.evaluate(snapshot, context);
    context.state = state;

    const dominance = this.layers.dominance.evaluate(snapshot, context);
    context.dominance = dominance;

    const risk = this.layers.risk.evaluate(snapshot, context);
    context.risk = risk;

    const action = this.layers.decision.evaluate(snapshot, context);

    return {
      version: 'constitution-v0.2-experimental',
      evaluatedAt: Date.now(),
      marketTimestamp: snapshot.market.timestamp,
      price: snapshot.market.price,
      where,
      state,
      dominance,
      risk,
      action,
    };
  }
}

module.exports = { BoonoCoreV02 };
