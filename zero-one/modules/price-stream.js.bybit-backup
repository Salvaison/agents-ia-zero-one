/**
 * price-stream.js — Bybit V5
 * ---------------------------
 * Connexion WebSocket Bybit V5 (contrats lineaires USDT) — prix BTCUSDT en
 * temps reel, tick par tick.
 *
 * REECRIT LE 12/08/2026 : bascule MEXC -> Bybit. Motif : depuis le passage a
 * MEXC le 30/07, la collecte 15m perdait 10 a 49% des bougies (trous
 * systematiques de 30 min, 15 morts du collecteur en une nuit). Quatre
 * hypotheses ont ete explorees et ecartees (doublons de processus, popup
 * Chrome, WebSocket non rebascule, watchdog). Decision de Benjamin : basculer
 * TOUTE la chaine sur Bybit, exchange plus etabli, pour retrouver une collecte
 * fiable -- tout le reste en depend.
 *
 * Canal public "publicTrade" : chaque transaction executee (le plus granulaire),
 * equivalent du "push.deal" de MEXC. Aucune authentification requise pour le
 * market data public.
 *
 * PROTOCOLE (verifie sur la doc officielle le 12/08/2026) :
 *   URL          wss://stream.bybit.com/v5/public/linear
 *   Souscription {"op":"subscribe","args":["publicTrade.BTCUSDT","tickers.BTCUSDT"]}
 *   Heartbeat    {"op":"ping"} — recommande toutes les 20s
 *   Timeout      la connexion est coupee apres 10 min sans ping-pong ni data
 *   Trade        {"topic":"publicTrade.BTCUSDT","ts":...,"data":[{...}]}
 *
 * ATTENTION — DIFFERENCE DE FORMAT AVEC MEXC :
 * Bybit envoie le sens en TEXTE ("Buy"/"Sell") la ou MEXC envoyait un ENTIER
 * (1/2). Or volume-analyzer.js fait `if (t.side === 1) buyVol += v`. Le sens
 * est donc converti ici en 1/2 pour preserver la compatibilite de toute la
 * chaine aval — ne PAS retirer cette conversion sans verifier les consommateurs.
 *
 * Usage (inchange, l'interface publique est identique) :
 *   const priceStream = require('./price-stream');
 *   priceStream.start();
 *   priceStream.on('price', (tick) => { ... });
 *   const last = priceStream.getLastPrice();
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

const WS_URL = 'wss://stream.bybit.com/v5/public/linear';
const SYMBOL = 'BTCUSDT';

/* 20s recommande par la doc Bybit. La connexion est coupee apres 10 min sans
 * ping-pong NI data — large marge, mais un marche calme peut etre silencieux. */
const PING_INTERVAL_MS = 20000;
const RECONNECT_DELAY_MS = 3000;

/* Connexion "zombie" : ws.readyState reste OPEN mais plus rien n'arrive.
 * Sans ce controle, une connexion figee silencieusement ne serait jamais
 * rechargee. Mecanisme conserve du module MEXC — il avait fait ses preuves. */
const DATA_STALE_MS = 60000;
const STALE_CHECK_INTERVAL_MS = 15000;

/* Conversion du sens Bybit -> format MEXC attendu en aval (voir en-tete). */
const SIDE_BUY = 1;
const SIDE_SELL = 2;

class PriceStream extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.pingTimer = null;
    this.staleCheckTimer = null;
    this.lastPrice = null;
    this.lastUpdateTs = null;
    /* horloge murale — mise a jour sur TOUT message recu, pas juste a l'ouverture */
    this.lastMessageReceivedAt = null;
    this._shouldRun = false;
  }

  start() {
    if (this._shouldRun) return; /* deja demarre */
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
    console.log('[price-stream] Connexion a', WS_URL);
    this.ws = new WebSocket(WS_URL);
    /* evite un faux positif immediat avant le premier message */
    this.lastMessageReceivedAt = Date.now();

    this.ws.on('open', () => {
      console.log('[price-stream] Connecte. Abonnement a publicTrade pour', SYMBOL);
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
      console.warn('[price-stream] Connexion fermee.');
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

  /* Detecte une connexion "zombie" : ws.readyState reste OPEN mais plus aucun
   * message n'arrive (ni tick, ni pong). Sans ce controle, une connexion figee
   * silencieusement ne serait jamais rechargee — elle reste "ouverte"
   * indefiniment. terminate() coupe immediatement, sans attendre le handshake. */
  _startStaleCheck() {
    clearInterval(this.staleCheckTimer);
    this.staleCheckTimer = setInterval(() => {
      if (!this.lastMessageReceivedAt) return;
      const silentMs = Date.now() - this.lastMessageReceivedAt;
      if (silentMs > DATA_STALE_MS) {
        console.warn(`[price-stream] Aucune donnee recue depuis ${Math.round(silentMs / 1000)}s — connexion jugee zombie, fermeture forcee.`);
        clearInterval(this.staleCheckTimer);
        clearInterval(this.pingTimer);
        try { this.ws.terminate(); } catch (e) {}
        this._scheduleReconnect();
      }
    }, STALE_CHECK_INTERVAL_MS);
  }

  _subscribe() {
    /* Une seule requete pour les deux topics — Bybit l'accepte et c'est plus
     * economique en connexions (limite : 500 connexions par 5 min et par IP). */
    this.ws.send(JSON.stringify({
      op: 'subscribe',
      args: [`publicTrade.${SYMBOL}`, `tickers.${SYMBOL}`],
    }));
  }

  _startPing() {
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ op: 'ping' }));
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
      return; /* frame non-JSON, ignoree */
    }

    /* Reponse au ping : {"success":true,"ret_msg":"pong","op":"ping"} */
    if (msg.op === 'ping' || msg.op === 'pong') return;

    /* Confirmation de souscription : {"success":true,"op":"subscribe",...}
     * Un echec est signale explicitement — sans ce log, une souscription
     * refusee rendrait le bot aveugle sans qu'on le voie. */
    if (msg.op === 'subscribe') {
      if (msg.success) {
        console.log('[price-stream] Souscription confirmee (conn_id:', msg.conn_id, ')');
      } else {
        console.error('[price-stream] ECHEC de souscription:', msg.ret_msg);
      }
      return;
    }

    if (!msg.topic) return;

    /* Flux tick-par-tick. data est TOUJOURS un tableau chez Bybit, parfois
     * plusieurs transactions dans le meme message. */
    if (msg.topic.startsWith('publicTrade.') && Array.isArray(msg.data)) {
      for (const d of msg.data) {
        const price = parseFloat(d.p);
        if (!isFinite(price)) continue;
        const tick = {
          symbol: d.s || SYMBOL,
          price,
          volume: d.v,
          /* "Buy"/"Sell" -> 1/2 : format attendu par volume-analyzer.js.
           * Voir l'avertissement en en-tete de fichier. */
          side: d.S === 'Buy' ? SIDE_BUY : (d.S === 'Sell' ? SIDE_SELL : null),
          ts: d.T || msg.ts,
        };
        this.lastPrice = tick.price;
        this.lastUpdateTs = tick.ts;
        this.emit('price', tick);
      }
      return;
    }

    /* Flux ticker agrege (fallback / stats). Bybit envoie un "snapshot"
     * complet puis des "delta" partiels : lastPrice peut etre absent d'un
     * delta, on ne l'emet que s'il est present. */
    if (msg.topic.startsWith('tickers.') && msg.data) {
      const d = msg.data;
      if (d.lastPrice === undefined) return;
      this.emit('ticker', {
        symbol: d.symbol || SYMBOL,
        lastPrice: parseFloat(d.lastPrice),
        fundingRate: d.fundingRate,
        ts: msg.ts,
      });
    }
  }
}

module.exports = new PriceStream();
