/**
 * okx-executor.js — Couche d'execution des ordres sur OKX Europe.
 *
 * Ecrit le 18/08/2026. Module AUTONOME : trade-simulator.js n'est pas
 * modifie tant que ce fichier n'est pas branche. Il peut donc etre teste,
 * corrige et relance sans aucun risque pour la simulation en cours.
 *
 * ── TROIS SECURITES EMPILEES ───────────────────────────────────────────
 *
 * 1. INTERRUPTEUR. config.json -> execution.enabled. A false (defaut), tout
 *    appel retourne immediatement sans rien envoyer. C'est le verrou
 *    principal : tant qu'il n'est pas bascule a la main, aucun ordre ne peut
 *    partir, quel que soit le bug en amont.
 *
 * 2. MODE SIMULATION. execution.dryRun a true (defaut) : le module construit
 *    l'ordre complet, le signe, le journalise -- et ne l'envoie pas. Permet
 *    de verifier le format et la signature sans engager de capital.
 *
 * 3. PLAFOND DUR. execution.maxContractsPerOrder. Tout ordre au-dela est
 *    refuse, meme si le calcul en amont demande davantage. Filet contre une
 *    erreur de dimensionnement.
 *
 * ── IL NE LEVE JAMAIS D'EXCEPTION ──────────────────────────────────────
 *
 * Une erreur d'execution ne doit pas casser le simulateur. Toute fonction
 * retourne un objet { ok, ... } et journalise ; l'appelant continue.
 *
 * ── PARAMETRES DU COMPTE (verifies le 14/08/2026) ──────────────────────
 *
 *   host        eea.okx.com  (les cles globales sont invalides sur www)
 *   instId      BTC-USD_UM_XPERP-310404  (FUTURES, ruleType xperp)
 *   ctVal       0.0001 BTC par contrat, lotSz 1, minSz 1
 *   settlement  USDC
 *   posMode     net_mode
 *   levier      10x (plafond reglementaire UE pour un particulier)
 *
 * Credentials attendues dans l'environnement, jamais dans le depot :
 *   OKX_API_KEY, OKX_API_SECRET, OKX_API_PASSPHRASE
 *   (fichier /root/.okx-credentials, charge par source)
 *
 * ── USAGE ──────────────────────────────────────────────────────────────
 *
 *   source /root/.okx-credentials
 *   node okx-executor.js --test        verifie la connexion et le solde
 *   node okx-executor.js --instrument  affiche les parametres du contrat
 *   node okx-executor.js --positions   liste les positions ouvertes
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HOST = 'eea.okx.com';
const INST_ID = 'BTC-USD_UM_XPERP-310404';
const CT_VAL = 0.0001;          // BTC par contrat
const CONFIG_PATH = path.join(__dirname, '../config.json');

/* User-Agent conventionnel obligatoire : sans lui, Cloudflare renvoie une
 * erreur 1010 (constate le 14/08/2026). */
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
                   'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}

/** Reglages d'execution, avec des defauts volontairement inoffensifs. */
function execConfig() {
  const c = loadConfig();
  const e = (c && c.execution) || {};
  return {
    enabled: e.enabled === true,                 // false par defaut
    dryRun: e.dryRun !== false,                  // true par defaut
    maxContractsPerOrder: e.maxContractsPerOrder || 200,
    leverage: e.leverage || 10,
  };
}

function creds() {
  return {
    key: process.env.OKX_API_KEY,
    secret: process.env.OKX_API_SECRET,
    passphrase: process.env.OKX_API_PASSPHRASE,
  };
}

/**
 * Signature OKX : base64(HMAC-SHA256(timestamp + method + path + body)).
 * Le timestamp doit etre au format ISO avec millisecondes, et le MEME que
 * celui envoye dans l'en-tete -- une divergence donne une erreur 50113.
 */
function sign(timestamp, method, requestPath, body, secret) {
  const prehash = timestamp + method.toUpperCase() + requestPath + (body || '');
  return crypto.createHmac('sha256', secret).update(prehash).digest('base64');
}

function request(method, requestPath, body, authenticated) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    };

    if (authenticated) {
      const { key, secret, passphrase } = creds();
      if (!key || !secret || !passphrase) {
        return resolve({ ok: false, error: 'credentials absentes de l environnement ' +
          '(source /root/.okx-credentials)' });
      }
      const ts = new Date().toISOString();
      headers['OK-ACCESS-KEY'] = key;
      headers['OK-ACCESS-SIGN'] = sign(ts, method, requestPath, payload, secret);
      headers['OK-ACCESS-TIMESTAMP'] = ts;
      headers['OK-ACCESS-PASSPHRASE'] = passphrase;
    }
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = https.request({ hostname: HOST, path: requestPath, method, headers },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            /* OKX renvoie code "0" en cas de succes, meme avec un HTTP 200
             * sur une erreur metier -- il faut donc verifier les deux. */
            if (j.code !== '0') {
              return resolve({ ok: false, code: j.code, error: j.msg, data: j.data });
            }
            resolve({ ok: true, data: j.data });
          } catch (e) {
            resolve({ ok: false, error: `reponse illisible (HTTP ${res.statusCode}): ${data.slice(0, 200)}` });
          }
        });
      });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ ok: false, error: 'timeout 15s' }); });
    if (payload) req.write(payload);
    req.end();
  });
}

/* ── Lectures (sans risque, aucune ecriture) ───────────────────────────── */

async function getInstrument() {
  return request('GET',
    `/api/v5/public/instruments?instType=FUTURES&instId=${INST_ID}`, null, false);
}

async function getBalance() {
  return request('GET', '/api/v5/account/balance', null, true);
}

async function getPositions() {
  return request('GET', `/api/v5/account/positions?instId=${INST_ID}`, null, true);
}

async function getTicker() {
  return request('GET', `/api/v5/market/ticker?instId=${INST_ID}`, null, false);
}

/* ── Ecritures (soumises aux trois securites) ──────────────────────────── */

/**
 * Convertit une taille en BTC vers un nombre entier de contrats.
 * lotSz = 1 et minSz = 1 sur cet instrument : la taille est forcement
 * entiere, et une position de moins d'un contrat est impossible.
 */
function btcToContracts(btc) {
  return Math.floor(btc / CT_VAL);
}

/**
 * Place un ordre. Retourne toujours un objet, ne leve jamais.
 *   side      'buy' | 'sell'
 *   contracts entier
 *   posSide   'long' | 'short' | 'net'  (net_mode sur ce compte)
 */
async function placeOrder({ side, contracts, ordType = 'market', px = null, reason = '' }) {
  const cfg = execConfig();

  if (!cfg.enabled) {
    return { ok: false, skipped: 'execution.enabled est a false', wouldHave: { side, contracts } };
  }
  if (!Number.isInteger(contracts) || contracts < 1) {
    return { ok: false, error: `taille invalide : ${contracts} contrats` };
  }
  if (contracts > cfg.maxContractsPerOrder) {
    return { ok: false, error: `PLAFOND : ${contracts} contrats demandes, maximum ${cfg.maxContractsPerOrder}` };
  }
  if (!['buy', 'sell'].includes(side)) {
    return { ok: false, error: `side invalide : ${side}` };
  }

  const body = {
    instId: INST_ID,
    tdMode: 'isolated',
    side,
    ordType,
    sz: String(contracts),
  };
  if (ordType === 'limit') {
    if (!px) return { ok: false, error: 'ordre limite sans prix' };
    body.px = String(px);
  }

  if (cfg.dryRun) {
    console.log(`[okx-executor] DRY RUN — ordre NON envoye : ${JSON.stringify(body)}` +
                (reason ? `  (${reason})` : ''));
    return { ok: true, dryRun: true, order: body };
  }

  const r = await request('POST', '/api/v5/trade/order', body, true);
  if (r.ok) {
    console.log(`[okx-executor] ordre place : ${side} ${contracts} contrats` +
                (reason ? `  (${reason})` : ''));
  } else {
    console.error(`[okx-executor] ECHEC ordre ${side} ${contracts} : ${r.code || ''} ${r.error}`);
  }
  return r;
}

/** Ferme la position ouverte sur l'instrument. */
async function closePosition(reason = '') {
  const cfg = execConfig();
  if (!cfg.enabled) return { ok: false, skipped: 'execution.enabled est a false' };

  const body = { instId: INST_ID, mgnMode: 'isolated' };
  if (cfg.dryRun) {
    console.log(`[okx-executor] DRY RUN — fermeture NON envoyee` + (reason ? `  (${reason})` : ''));
    return { ok: true, dryRun: true };
  }
  const r = await request('POST', '/api/v5/trade/close-position', body, true);
  if (!r.ok) console.error(`[okx-executor] ECHEC fermeture : ${r.code || ''} ${r.error}`);
  return r;
}

/** Regle le levier. A appeler une fois avant la premiere entree. */
async function setLeverage(lever) {
  const cfg = execConfig();
  if (!cfg.enabled) return { ok: false, skipped: 'execution.enabled est a false' };
  const body = { instId: INST_ID, lever: String(lever || cfg.leverage), mgnMode: 'isolated' };
  if (cfg.dryRun) {
    console.log(`[okx-executor] DRY RUN — levier NON regle : ${JSON.stringify(body)}`);
    return { ok: true, dryRun: true };
  }
  return request('POST', '/api/v5/account/set-leverage', body, true);
}

/* ── Diagnostic en ligne de commande ───────────────────────────────────── */

async function selfTest() {
  const cfg = execConfig();
  console.log('=== CONFIGURATION ===');
  console.log(`  enabled              ${cfg.enabled}`);
  console.log(`  dryRun               ${cfg.dryRun}`);
  console.log(`  maxContractsPerOrder ${cfg.maxContractsPerOrder}`);
  console.log(`  levier               ${cfg.leverage}x`);
  const { key, secret, passphrase } = creds();
  console.log(`  credentials          ${key && secret && passphrase ? 'presentes' : 'ABSENTES'}`);

  console.log('\n=== INSTRUMENT (public) ===');
  const inst = await getInstrument();
  if (inst.ok && inst.data && inst.data[0]) {
    const d = inst.data[0];
    console.log(`  ${d.instId}  ctVal ${d.ctVal} ${d.ctValCcy}, lotSz ${d.lotSz}, minSz ${d.minSz}`);
    console.log(`  levier max ${d.lever}, etat ${d.state}`);
  } else {
    console.log(`  ECHEC : ${inst.error}`);
  }

  const tk = await getTicker();
  if (tk.ok && tk.data && tk.data[0]) {
    console.log(`  dernier prix ${tk.data[0].last}`);
  }

  if (!key) {
    console.log('\n(credentials absentes -- tests authentifies ignores)');
    console.log('  source /root/.okx-credentials  puis relancer');
    return;
  }

  console.log('\n=== SOLDE (authentifie) ===');
  const bal = await getBalance();
  if (bal.ok && bal.data && bal.data[0]) {
    const details = bal.data[0].details || [];
    if (!details.length) console.log('  compte vide');
    for (const d of details) {
      console.log(`  ${d.ccy} : ${d.availBal} disponible, ${d.eq} total`);
    }
  } else {
    console.log(`  ECHEC : ${bal.code || ''} ${bal.error}`);
  }

  console.log('\n=== POSITIONS ===');
  const pos = await getPositions();
  if (pos.ok) {
    const open = (pos.data || []).filter(p => parseFloat(p.pos) !== 0);
    if (!open.length) console.log('  aucune position ouverte');
    for (const p of open) {
      console.log(`  ${p.posSide} ${p.pos} contrats a ${p.avgPx}, PNL ${p.upl}`);
    }
  } else {
    console.log(`  ECHEC : ${pos.code || ''} ${pos.error}`);
  }
}

if (require.main === module) {
  const a = process.argv;
  if (a.includes('--instrument')) getInstrument().then(r => console.log(JSON.stringify(r, null, 2)));
  else if (a.includes('--positions')) getPositions().then(r => console.log(JSON.stringify(r, null, 2)));
  else if (a.includes('--balance')) getBalance().then(r => console.log(JSON.stringify(r, null, 2)));
  else selfTest();
}

module.exports = {
  placeOrder, closePosition, setLeverage,
  getBalance, getPositions, getInstrument, getTicker,
  btcToContracts, execConfig, INST_ID, CT_VAL,
};
