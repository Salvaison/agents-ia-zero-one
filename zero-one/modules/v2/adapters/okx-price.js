'use strict';

const EventEmitter = require('events');
const priceStream = require('../../price-stream');
const { datum } = require('../core/contracts');

class OkxPriceAdapter extends EventEmitter {
  constructor(stream = priceStream) {
    super();
    this.stream = stream;
    this.latest = null;
    this._onPrice = tick => {
      this.latest = datum({
        value: tick.price,
        timestamp: tick.ts,
        source: 'OKX:BTC-USDT-SWAP:trades',
        timeframe: 'tick',
        confirmed: true,
      });
      this.latest.volumeBtc = Number.isFinite(tick.volume) ? tick.volume : null;
      this.latest.side = tick.side === 1 ? 'buy' : tick.side === 2 ? 'sell' : null;
      this.emit('price', this.latest);
    };
  }

  start() {
    this.stream.on('price', this._onPrice);
    this.stream.start();
  }

  stop() {
    this.stream.off('price', this._onPrice);
  }

  getLatest() {
    if (!this.latest) return null;
    const now = Date.now();
    return { ...this.latest, ageMs: Math.max(0, now - this.latest.timestamp) };
  }
}

module.exports = { OkxPriceAdapter };
