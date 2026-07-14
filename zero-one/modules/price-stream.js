/**
 * price-stream.js
 * ----------------
 * Connexion WebSocket MEXC Futures — prix BTC/USDT en temps réel, tick par tick.
 *
 * Canal public "push.deal" : chaque transaction exécutée (le plus granulaire).
 * Aucune authentification requise — les clés API et l'erreur 602 (signature)
 * ne concernent que les endpoints privés (comptes/ordres), pas le market data.
 *
 * Usage dans cerveau-central.js :
 *   const priceStream = require('./price-stream');
 *   priceStream.start();
 *   priceStream.on('price', (tick) => { ... });
 *   const last = priceStream.getLastPrice();
 */
const WebSocket = require('ws');
const EventEmitter = require('events');

const WS_URL = 'wss://contract.mexc.com/edge';
const SYMBOL = 'BTC_USDT';
const PING_INTERVAL_MS = 15000; /* doit rester < 60s (limite serveur) */
const RECONNECT_DELAY_MS = 3000;
const DATA_STALE_MS = 60000; /* si aucun message reçu depuis ce délai, la connexion est jugée zombie */
const STALE_CHECK_INTERVAL_MS = 15000;

class PriceStream extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.pingTimer = null;
    this.staleCheckTimer = null;
    this.lastPrice = null;
    this.lastUpdateTs = null;
    this.lastMessageReceivedAt = null; /* horloge murale — mise à jour sur TOUT message reçu, pas juste à l'ouverture */
    this._shouldRun = false;
  }

  start() {
    if (this._shouldRun) return; /* déjà démarré */
    this._shouldRun = true;
    this._connect();
  }

  stop() {
    this._shouldRun = false;
    clearInterval(this.pingTimer);
    clearInterval(this.staleCheckTimer);
    if (this.ws) this.ws.close();
  }

  getLastPrice() {
    return this.lastPrice;
  }

  _connect() {
    console.log('[price-stream] Connexion à', WS_URL);
    this.ws = new WebSocket(WS_URL);
    this.lastMessageReceivedAt = Date.now(); /* évite un faux positif immédiat avant le premier message */

    this.ws.on('open', () => {
      console.log('[price-stream] Connecté. Abonnement à push.deal pour', SYMBOL);
      this._subscribe();
      this._startPing();
      this._startStaleCheck();
      this.emit('connected');
    });

    this.ws.on('message', (raw) => {
      this.lastMessageReceivedAt = Date.now();
      this._handleMessage(raw);
    });

    this.ws.on('close', () => {
      console.warn('[price-stream] Connexion fermée.');
      clearInterval(this.pingTimer);
      clearInterval(this.staleCheckTimer);
      this.emit('disconnected');
      this._scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[price-stream] Erreur WS:', err.message);
      this.emit('error', err);
    });
  }

  /* Détecte une connexion "zombie" : ws.readyState reste OPEN mais plus aucun
   * message n'arrive (ni tick, ni pong). Sans ce contrôle, une connexion figée
   * silencieusement ne serait jamais rechargée — elle reste "ouverte" indéfiniment. */
  _startStaleCheck() {
    clearInterval(this.staleCheckTimer);
    this.staleCheckTimer = setInterval(() => {
      if (!this.lastMessageReceivedAt) return;
      const silentMs = Date.now() - this.lastMessageReceivedAt;
      if (silentMs > DATA_STALE_MS) {
        console.warn(`[price-stream] Aucune donnée reçue depuis ${Math.round(silentMs / 1000)}s — connexion jugée zombie, fermeture forcée.`);
        clearInterval(this.staleCheckTimer);
        clearInterval(this.pingTimer);
        try { this.ws.terminate(); } catch (e) {} /* terminate() coupe immédiatement, sans attendre le handshake de close */
        this._scheduleReconnect();
      }
    }, STALE_CHECK_INTERVAL_MS);
  }

  _subscribe() {
    /* Tick par tick (chaque transaction exécutée) */
    this.ws.send(JSON.stringify({ method: 'sub.deal', param: { symbol: SYMBOL } }));
    /* Optionnel : ticker agrégé (dernier prix + stats 24h), utile en complément */
    this.ws.send(JSON.stringify({ method: 'sub.ticker', param: { symbol: SYMBOL } }));
  }

  _startPing() {
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: 'ping' }));
      }
    }, PING_INTERVAL_MS);
  }

  _scheduleReconnect() {
    if (!this._shouldRun) return;
    setTimeout(() => this._connect(), RECONNECT_DELAY_MS);
  }

  _handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      return; /* frame non-JSON, ignorée */
    }

    /* Réponse au ping serveur / pong */
    if (msg.channel === 'pong' || msg.method === 'pong') return;

    /* Confirmation de souscription */
    if (msg.channel === 'rs.sub.deal' || msg.channel === 'rs.sub.ticker') {
      console.log('[price-stream] Souscription confirmée:', msg.channel);
      return;
    }

    /* Flux tick-par-tick (transactions) — msg.data est un TABLEAU de deals, */
    /* parfois plusieurs transactions dans le même message push */
    if (msg.channel === 'push.deal' && msg.data) {
      const deals = Array.isArray(msg.data) ? msg.data : [msg.data];
      for (const d of deals) {
        const tick = {
          symbol: msg.symbol || SYMBOL,
          price: parseFloat(d.p),
          volume: d.v,
          side: d.T, /* 1 = achat, 2 = vente */
          ts: d.t || msg.ts,
        };
        this.lastPrice = tick.price;
        this.lastUpdateTs = tick.ts;
        this.emit('price', tick);
      }
      return;
    }

    /* Flux ticker agrégé (fallback / stats) */
    if (msg.channel === 'push.ticker' && msg.data) {
      const d = msg.data;
      this.emit('ticker', {
        symbol: msg.symbol || SYMBOL,
        lastPrice: parseFloat(d.lastPrice),
        fundingRate: d.fundingRate,
        ts: msg.ts,
      });
    }
  }
}

module.exports = new PriceStream();