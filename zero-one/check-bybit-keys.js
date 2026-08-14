/**
 * check-bybit-keys.js  (12/08/2026)
 * ----------------------------------
 * Verifie que les cles API Bybit enregistrees dans .env sont valides, en
 * interrogeant l'endpoint de solde (privé, donc authentifie).
 *
 * NE MODIFIE RIEN, NE PASSE AUCUN ORDRE — lecture seule.
 *
 * Protocole de signature Bybit V5 (verifie sur la doc officielle) :
 *   payload   = timestamp + apiKey + recvWindow + queryString
 *   signature = HMAC-SHA256(payload, apiSecret) en hexadecimal
 *   en-tetes  = X-BAPI-API-KEY, X-BAPI-TIMESTAMP, X-BAPI-RECV-WINDOW,
 *               X-BAPI-SIGN
 *
 * Usage :  node check-bybit-keys.js
 */

const crypto = require('crypto');
const https = require('https');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const API_KEY = process.env.BYBIT_API_KEY;
const API_SECRET = process.env.BYBIT_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error('ERREUR : BYBIT_API_KEY ou BYBIT_API_SECRET absent de .env');
  process.exit(1);
}

/* Diagnostic de forme, sans jamais afficher les valeurs. Les caracteres
 * parasites en fin de chaine (espace, $, retour chariot) sont la cause la
 * plus frequente d'echec d'authentification -- on les detecte ici plutot que
 * de chercher pendant une heure pourquoi la signature est refusee. */
console.log('Cles chargees depuis .env :');
console.log('  API_KEY    : longueur', API_KEY.length,
            '| commence par', API_KEY.slice(0, 3) + '...');
console.log('  API_SECRET : longueur', API_SECRET.length);
if (API_KEY !== API_KEY.trim() || API_SECRET !== API_SECRET.trim()) {
  console.warn('  ATTENTION : espace ou caractere invisible en debut/fin — cause frequente d\'echec.');
}
console.log('');

const recvWindow = '5000';
const timestamp = Date.now().toString();
const queryString = 'accountType=UNIFIED';

const payload = timestamp + API_KEY + recvWindow + queryString;
const signature = crypto.createHmac('sha256', API_SECRET).update(payload).digest('hex');

const options = {
  hostname: 'api.bybit.com',
  path: '/v5/account/wallet-balance?' + queryString,
  method: 'GET',
  headers: {
    'X-BAPI-API-KEY': API_KEY,
    'X-BAPI-TIMESTAMP': timestamp,
    'X-BAPI-RECV-WINDOW': recvWindow,
    'X-BAPI-SIGN': signature,
  },
};

console.log('Requete : GET api.bybit.com/v5/account/wallet-balance (lecture seule)');

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (c) => { body += c; });
  res.on('end', () => {
    let json;
    try {
      json = JSON.parse(body);
    } catch (e) {
      console.error('Reponse non-JSON (code HTTP ' + res.statusCode + ') :');
      console.error(body.slice(0, 300));
      process.exit(1);
    }

    console.log('');
    if (json.retCode === 0) {
      console.log('=== CLES VALIDES ===');
      const list = json.result && json.result.list;
      if (Array.isArray(list) && list.length) {
        const acct = list[0];
        console.log('  Type de compte   :', acct.accountType);
        console.log('  Equity totale    :', acct.totalEquity, 'USD');
        console.log('  Solde disponible :', acct.totalAvailableBalance, 'USD');
        const coins = (acct.coin || []).filter(c => parseFloat(c.walletBalance) > 0);
        if (coins.length) {
          console.log('  Actifs non nuls  :');
          for (const c of coins) {
            console.log('    ', c.coin.padEnd(6), c.walletBalance);
          }
        } else {
          console.log('  Aucun actif avec un solde non nul (compte vide).');
        }
      }
    } else {
      console.error('=== ECHEC ===');
      console.error('  retCode :', json.retCode);
      console.error('  retMsg  :', json.retMsg);
      console.error('');
      /* Les codes les plus frequents, pour eviter de chercher a l'aveugle. */
      const aide = {
        10003: 'Cle API invalide ou inexistante.',
        10004: 'Signature incorrecte — verifier le SECRET (caractere parasite ?).',
        10005: 'Permissions insuffisantes — la cle n\'a pas le droit de lire le compte.',
        10006: 'Trop de requetes (rate limit).',
        10010: 'IP non autorisee — la cle est restreinte a une liste d\'IP ne contenant pas celle du VPS.',
        10016: 'Service indisponible cote Bybit.',
        33004: 'Cle API expiree.',
      };
      if (aide[json.retCode]) console.error('  -> ' + aide[json.retCode]);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Erreur reseau :', e.message);
  process.exit(1);
});

req.end();
