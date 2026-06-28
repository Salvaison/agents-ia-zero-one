const https = require('https');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../../data/mcb-history.csv');
const SYMBOL = 'BTCUSDT';
const TIMEFRAMES = ['60m', '4h', '1d'];

// Crée le dossier data si nécessaire
if (!fs.existsSync(path.dirname(CSV_PATH))) {
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
}

// Entête CSV
if (!fs.existsSync(CSV_PATH)) {
  fs.writeFileSync(CSV_PATH, 
    'timestamp,timeframe,prix_close,volume,blue_wave,lt_blue_wave,money_flow,buy_signal,sell_signal\n'
  );
  console.log('Fichier CSV créé.');
}

function getKline(symbol, interval) {
  return new Promise((resolve, reject) => {
    const url = `https://api.mexc.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=2`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const arr = Array.isArray(parsed) ? parsed : (parsed.data || []);
          // On prend l'avant-dernière bougie (fermée)
          resolve(arr[arr.length - 2] || null);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function collect() {
  const now = new Date().toISOString();
  console.log(`\n[${now}] Collecte en cours...`);

  for (const tf of TIMEFRAMES) {
    try {
      const candle = await getKline(SYMBOL, tf);
      if (!candle) { console.log(`[${tf}] Pas de bougie`); continue; }

      const timestamp = new Date(candle[0]).toISOString();
      const close     = candle[4];
      const volume    = candle[5];

      // Valeurs MCB — à connecter via MCP TradingView
      // Pour l'instant on enregistre des placeholders
      const blue_wave   = 'NA';
      const lt_blue_wave = 'NA';
      const money_flow  = 'NA';
      const buy_signal  = 'NA';
      const sell_signal = 'NA';

      const line = `${timestamp},${tf},${close},${volume},${blue_wave},${lt_blue_wave},${money_flow},${buy_signal},${sell_signal}\n`;
      fs.appendFileSync(CSV_PATH, line);
      console.log(`[${tf}] ${timestamp} | Close: ${close} | Volume: ${volume}`);

    } catch(e) {
      console.log(`[${tf}] Erreur: ${e.message}`);
    }
  }
}

// Collecte immédiate puis toutes les 5 minutes
collect();
setInterval(collect, 5 * 60 * 1000);
console.log('Collecteur démarré — Ctrl+C pour arrêter.');