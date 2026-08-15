/**
 * price-stream.js — Flux tick-par-tick BTC via WebSocket public OKX.
 *
 * REECRIT LE 15/08/2026 : bascule Bybit -> OKX global (BTC-USDT-SWAP).
 * Motif : migration de l'execution vers OKX Europe. Rester sur Bybit pour
 * les donnees alors qu'on execute sur OKX recreerait le desalignement
 * diagnostique le 30/07 (signaux d'un marche, execution sur un autre).
 *
 * POURQUOI BTC-USDT-SWAP (global) ET NON L'INSTRUMENT D'EXECUTION :
 *   L'execution se fera sur BTC-USD_UM_XPERP-310404 (X-Perp EU, seul produit
 *   a levier autorise aux particuliers europeens sous MiFID II). Mais ce
 *   contrat est 31x moins liquide : mesure du 15/08, 1359 BTC de volume 24h
 *   contre 42190 pour BTC-USDT-SWAP, soit 1 transaction toutes les 17.4s
 *   contre une toutes les 0.60s. A 1.7 tick par baton de 30s, la cadence et
 *   le displacementMap n'auraient plus aucun sens statistique.
 *
 *   Ecarts de prix mesures le 15/08 :
 *     OKX global - Bybit  : +0.014%  (marches quasi identiques)
 *     X-Perp - OKX global : -0.095%  (decote structurelle du contrat EU)
 *
 *   La decote du X-Perp est un NIVEAU, pas une variation : elle affecte
 *   identiquement l'entree et la sortie, donc s'annule dans le PNL. Le
 *   risque reel est la VARIATION de ce basis pendant qu'une position est
 *   ouverte -- non mesuree a ce jour, a surveiller.
 *
 * DIFFERENCES DE FORMAT AVEC BYBIT (source de bugs si oubliees) :
 *   - side : "buy"/"sell" en MINUSCULES (Bybit envoyait "Buy"/"Sell")
 *   - sz   : en CONTRATS, pas en BTC. ctVal = 0.01 BTC pour BTC-USDT-SWAP
 *            (verifie : volCcy24h/vol24h = 42190/4219046 = 0.01).
 *            On convertit avant d'emettre, pour que le champ volume reste
 *            en BTC comme l'attend volume-analyzer.js.
 *   - ping : OKX attend la CHAINE BRUTE 'ping' (pas du JSON comme Bybit) et
 *            repond 'pong'. Connexion coupee apres 30s sans trafic.
 *   - souscription : args est un tableau d'OBJETS {channel, instId}, pas de
 *            chaines "topic.SYMBOL" comme chez Bybit.
 *
 * Le format emis en aval (evenements 'price' et 'ticker') est INCHANGE --
 * side reste 1/2, volume reste en BTC. Aucun autre module a modifier.
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

const WS_URL = 'wss://ws.okx.com:8443/ws/v5/public';
const INST_ID = 'BTC-USDT-SWAP';

/* 1 contrat = 0.01 BTC sur BTC-USDT-SWAP. Verifie via /api/v5/public/instruments
 * et confirme par le rapport volCcy24h/vol24h. A revoir si l'instrument change. */
const CT_VAL = 0.01;

/* OKX coupe apres 30s sans trafic. 20s laisse une marge confortable. */
const PING_INTERVAL_MS = 20000;
const RECONNECT_DELAY_MS = 3000;

/* Connexion "zombie" : readyState reste OPEN mais plus rien n'arrive.
 * Mecanisme conserve depuis les versions MEXC et Bybit -- il a fait ses
 * preuves, il n'y a aucune raison de le retirer en changeant d'exchange. */
const DATA_STALE_MS = 60000;
const STALE_CHECK_INTERVAL_MS = 15000;

/* Conversion du sens OKX -> format attendu en aval (voir en-tete). */
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
    this.lastMessageReceivedAt = null;
    this._shouldRun = false;
  }

  start() {
    if (this._shouldRun) return;
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
    this.lastMessageReceivedAt = Date.now();

    this.ws.on('open', () => {
      console.log('[price-stream] Connecte. Abonnement a trades+tickers pour', INST_ID);
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
    /* Format OKX : args est un tableau d'objets, un par canal.
     * Les deux canaux dans une seule requete, comme on le faisait chez Bybit. */
    this.ws.send(JSON.stringify({
      op: 'subscribe',
      args: [
        { channel: 'trades', instId: INST_ID },
        { channel: 'tickers', instId: INST_ID },
      ],
    }));
  }

  _startPing() {
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        /* CHAINE BRUTE, pas du JSON — specificite OKX. Envoyer {"op":"ping"}
         * comme chez Bybit ne serait pas reconnu et la connexion tomberait
         * au bout de 30s. */
        this.ws.send('ping');
      }
    }, PING_INTERVAL_MS);
  }

  _scheduleReconnect() {
    if (!this._shouldRun) return;
    setTimeout(() => this._connect(), RECONNECT_DELAY_MS);
  }

  _handleMessage(raw) {
    const text = raw.toString();

    /* Reponse au ping : chaine brute 'pong', pas du JSON. A intercepter
     * AVANT le JSON.parse, qui echouerait dessus. */
    if (text === 'pong') return;

    let msg;
    try {
      msg = JSON.parse(text);
    } catch (e) {
      return; /* frame non-JSON inattendue, ignoree */
    }

    /* Confirmation ou refus de souscription. Un echec silencieux rendrait
     * le bot aveugle sans qu'on le voie -- d'ou le log explicite. */
    if (msg.event === 'subscribe') {
      console.log('[price-stream] Souscription confirmee:', JSON.stringify(msg.arg));
      return;
    }
    if (msg.event === 'error') {
      console.error('[price-stream] ECHEC OKX:', msg.code, msg.msg);
      return;
    }
    if (msg.event) return; /* autres evenements de service */

    if (!msg.arg || !Array.isArray(msg.data)) return;

    /* Flux tick-par-tick. data peut contenir plusieurs transactions. */
    if (msg.arg.channel === 'trades') {
      for (const d of msg.data) {
        const price = parseFloat(d.px);
        if (!isFinite(price)) continue;
        const szContracts = parseFloat(d.sz);
        const tick = {
          symbol: d.instId || INST_ID,
          price,
          /* contrats -> BTC, pour rester coherent avec ce que les modules
           * en aval attendaient du temps de Bybit (taille en BTC). */
          volume: isFinite(szContracts) ? szContracts * CT_VAL : null,
          /* "buy"/"sell" minuscules -> 1/2. Voir en-tete. */
          side: d.side === 'buy' ? SIDE_BUY : (d.side === 'sell' ? SIDE_SELL : null),
          ts: d.ts ? parseInt(d.ts, 10) : Date.now(),
        };
        this.lastPrice = tick.price;
        this.lastUpdateTs = tick.ts;
        this.emit('price', tick);
      }
      return;
    }

    /* Flux ticker agrege (fallback / stats). */
    if (msg.arg.channel === 'tickers') {
      const d = msg.data[0];
      if (!d || d.last === undefined) return;
      this.emit('ticker', {
        symbol: d.instId || INST_ID,
        lastPrice: parseFloat(d.last),
        /* OKX n'expose pas le funding sur ce canal -- il faudrait souscrire
         * a 'funding-rate' separement. Laisse a null tant qu'aucun module
         * ne s'en sert, plutot que d'ajouter une souscription inutile. */
        fundingRate: null,
        ts: d.ts ? parseInt(d.ts, 10) : Date.now(),
      });
    }
  }
}

module.exports = new PriceStream();
