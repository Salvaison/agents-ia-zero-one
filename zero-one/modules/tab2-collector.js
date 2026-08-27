#!/usr/bin/env node
/**
 * tab2-collector.js — Rotating multi-TF MCB close collector.
 *
 * Rotates a single Chrome tab across 15m / 1H / 4H / 1D / 1W, writing each
 * timeframe's bar closes to its own CSV.
 *
 * Rotation rules (checked every POLL_INTERVAL_MS):
 *   1. Stay on current TF if its close is ≤ SWITCH_GUARD_SEC away.
 *   2. Switch (in priority order) to any TF with an uncollected close.
 *   3. Switch to the highest-priority TF closing within SWITCH_LEAD_SEC.
 *   4. Default: 15m.
 *
 * After each TF switch, a retroactive check fires once (after caughtUp):
 * if the last completed bar's MCB values are in cache and not yet written,
 * they are flushed immediately without waiting for a live close event.
 *
 * FIX 2026-07-14 (insuffisant) : le watchdog sautait sa verification des que
 * wsMap contenait une entree ("if (wsMap.size > 0) return") — un websocket
 * ouvert mais muet passait inapercu. Trou silencieux de ~16h le 14/07.
 *
 * FIX 2026-07-15 : le correctif du 14/07 ne suffisait pas. Il mesurait le temps
 * depuis la derniere FRAME, or les heartbeats TradingView le rafraichissaient
 * en continu — le watchdog ne se declenchait donc jamais. Trou de 6h30 le 15/07.
 * On mesure desormais le temps depuis la derniere BOUGIE ECRITE sur le TF actif.
 *
 * Usage:
 *   node scripts/tab2-collector.js \
 *     [--dir /path/to/csv/dir]          default: cwd
 *     [--chart https://...tradingview.com/chart/ID/]
 *     [--ws-key   YXeZEi]
 *     [--dbsi-key S8XNwk]
 */

import CDP from 'chrome-remote-interface';
import { appendFileSync, existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';

// ── CLI args ──────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const getArg = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };

const BASE_DIR      = getArg('--dir',      process.cwd());
const TV_CHART_BASE = getArg('--chart',    'https://www.tradingview.com/chart/2AqpEMfD/');
const TV_SYMBOL     = getArg('--symbol',   'BYBIT%3ABTCUSDT.P');
const WS_KEY        = getArg('--ws-key',   'YXeZEi');
const DBSI_KEY      = getArg('--dbsi-key', 'S8XNwk');

// ── Constants ─────────────────────────────────────────────────────────────────
const RECONNECT_DELAY_MS = 5_000;
/* Snapshot intra-bougie (15/08/2026) -- meme principe que
 * real-time-collector.js depuis le 11/08. 15s : assez frequent pour capter
 * l'apparition d'un signal en cours de bougie, assez espace pour ne pas
 * peser sur le collecteur. */
const LIVE_SNAPSHOT_INTERVAL_MS = 15_000;
const SETTLE_DELAY_MS    = 35_000;   // settle window after close detection
const SENTINEL_THRESHOLD = 1e90;
const SWITCH_GUARD_SEC   = 120;     // never switch if current TF closes within 2 min
const SWITCH_LEAD_SEC    = 90;      // switch to a TF if it closes within 90s
const POLL_INTERVAL_MS   = 5_000;   // scheduler tick
const WS_TIMEOUT_MS      = 90_000;  // reload if no WS frames for 90s
const CDP_CMD_TIMEOUT    = 12_000;

// ── TF schedule (priority order: index 0 = highest) ──────────────────────────
const TF_SCHEDULE = [
  { code: '15',  minutes: 15,    label: '15m', csv: `${BASE_DIR}/mcb_15m.csv` },
  { code: '60',  minutes: 60,    label: '1h',  csv: `${BASE_DIR}/mcb_1h.csv`  },
  { code: '240', minutes: 240,   label: '4h',  csv: `${BASE_DIR}/mcb_4h.csv`  },
  { code: '1D',  minutes: 1440,  label: '1D',  csv: `${BASE_DIR}/mcb_1d.csv`  },
  { code: '1W',  minutes: 10080, label: '1W',  csv: `${BASE_DIR}/mcb_1w.csv`  },
];
const TF_BY_CODE = Object.fromEntries(TF_SCHEDULE.map(t => [t.code, t]));

// ── PID file ──────────────────────────────────────────────────────────────────
const PID_FILE = '/tmp/mcb-collector-tab2.pid';
if (existsSync(PID_FILE)) {
  const oldPid = parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10);
  if (!isNaN(oldPid) && oldPid !== process.pid) {
    let alive = true;
    try { process.kill(oldPid, 0); } catch { alive = false; }
    if (alive) {
      let waited = 0;
      while (waited < 45_000) {
        await new Promise(r => setTimeout(r, 2_000));
        waited += 2_000;
        try { process.kill(oldPid, 0); } catch { alive = false; break; }
      }
    }
  }
}
writeFileSync(PID_FILE, String(process.pid), 'utf8');
process.on('exit', () => { try { unlinkSync(PID_FILE); } catch {} });

// ── Logging ───────────────────────────────────────────────────────────────────
let _logLabel = 'tab2';
function log(msg) {
  process.stderr.write(`[${new Date().toISOString().slice(11, 23)}] [${_logLabel}] ${msg}\n`);
}

// ── Timeout wrapper ───────────────────────────────────────────────────────────
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`CDP timeout: ${label}`)), ms)
    ),
  ]);
}

// ── TF timing helpers ─────────────────────────────────────────────────────────

// Unix epoch (1970-01-01) was a Thursday. TV aligns 1W bars to Monday 00:00 UTC.
// First Monday after epoch = 1970-01-05 = 4 days = 345600s.
const MONDAY_ALIGN_SEC = 4 * 86_400;

function secsUntilNextClose(tfCode) {
  const periodSec = TF_BY_CODE[tfCode].minutes * 60;
  const remainder = (Date.now() / 1000) % periodSec;
  const secs      = periodSec - remainder;
  return secs < 1 ? secs + periodSec : secs; // avoid returning ~0 at boundary
}

// Returns the open timestamp of the last completed bar, epoch-aligned.
// Weekly bars use Monday alignment instead of the default Thursday (Unix epoch).
function lastCompletedBarOpenTs(tfCode) {
  const periodSec = TF_BY_CODE[tfCode].minutes * 60;
  const nowSec    = Math.floor(Date.now() / 1000);
  if (periodSec >= 7 * 86_400) {
    const adj = nowSec - MONDAY_ALIGN_SEC;
    return Math.floor(adj / periodSec) * periodSec + MONDAY_ALIGN_SEC - periodSec;
  }
  return Math.floor(nowSec / periodSec) * periodSec - periodSec;
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
const CSV_HEADER = 'timestamp,open,high,low,close,lt_blue_wave,blue_wave,money_flow,buy,sell,dbsi_top,dbsi_bottom,ma200,wt1_cross_up,wt1_cross_dn\n';

function initCsv(csvPath) {
  if (!existsSync(csvPath)) {
    writeFileSync(csvPath, CSV_HEADER, 'utf8');
    log(`Created ${csvPath}`);
  }
}

function readLastCsvTs(csvPath) {
  try {
    const content  = readFileSync(csvPath, 'utf8');
    const lastLine = content.trimEnd().split('\n').at(-1) ?? '';
    if (!lastLine || lastLine.startsWith('timestamp')) return 0;
    const ts = Math.floor(Date.parse(lastLine.split(',')[0]) / 1000);
    return isNaN(ts) ? 0 : ts;
  } catch { return 0; }
}

function fmt(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' && Math.abs(v) > SENTINEL_THRESHOLD) return '';
  return typeof v === 'number' ? +v.toFixed(6) : v;
}

/* Snapshot INTRA-BOUGIE (15/08/2026) -- etat de la bougie en formation,
 * fichier ecrase a chaque fois (une seule ligne de donnees). Le CSV
 * principal et writeClose ne sont pas touches : la chaine existante lit
 * exactement les memes donnees qu'avant.
 * Le nom du fichier derive du CSV du timeframe : mcb_15m.csv ->
 * mcb_15m_live.csv, comme le fait real-time-collector.js pour le 3m. */
function writeLiveSnapshot(csvPath, barTs, v, dbsi, ohlc) {
  if (!v || !Array.isArray(v) || !csvPath) return;
  const livePath = csvPath.replace(/\.csv$/, '_live.csv');
  const isoTs = new Date(barTs * 1000).toISOString();
  const row = [
    isoTs,
    fmt(ohlc?.open), fmt(ohlc?.high), fmt(ohlc?.low), fmt(ohlc?.close),
    fmt(v[1]), fmt(v[2]), fmt(v[4]), fmt(v[6]), fmt(v[5]),
    fmt(dbsi?.top), fmt(dbsi?.bottom), fmt(dbsi?.ma200),
    fmt(v[7]), fmt(v[8]),
  ].join(',') + '\n';
  try {
    writeFileSync(livePath, CSV_HEADER + row, 'utf8');
  } catch (e) { /* best-effort, ne doit jamais casser le collecteur */ }
}

// Returns true if written, false if duplicate.
function writeClose(csvPath, barTs, v, dbsi, ohlc) {
  const isoTs = new Date(barTs * 1000).toISOString();
  const row   = [
    isoTs,
    fmt(ohlc?.open), fmt(ohlc?.high), fmt(ohlc?.low), fmt(ohlc?.close),
    fmt(v[1]), fmt(v[2]), fmt(v[4]), fmt(v[6]), fmt(v[5]),
    fmt(dbsi?.top), fmt(dbsi?.bottom), fmt(dbsi?.ma200),
    fmt(v[7]), fmt(v[8]),
  ].join(',') + '\n';

  try {
    const existing = readFileSync(csvPath, 'utf8');
    if ((existing.trimEnd().split('\n').at(-1) ?? '').startsWith(isoTs)) {
      log(`SKIP duplicate ${isoTs}`);
      return false;
    }
  } catch {}

  appendFileSync(csvPath, row, 'utf8');
  process.stdout.write(JSON.stringify({
    event: 'close', timestamp: isoTs, bar_ts: barTs,
    open: fmt(ohlc?.open), high: fmt(ohlc?.high), low: fmt(ohlc?.low), close: fmt(ohlc?.close),
    lt_blue_wave: fmt(v[1]), blue_wave: fmt(v[2]), money_flow: fmt(v[4]),
    buy: fmt(v[6]), sell: fmt(v[5]),
    wt1_cross_up: fmt(v[7]), wt1_cross_dn: fmt(v[8]),
    dbsi_top: dbsi?.top ?? null, dbsi_bottom: dbsi?.bottom ?? null,
  }) + '\n');
  log(`CLOSE → ${row.trim()}`);
  return true;
}

// ── TV frame parser ───────────────────────────────────────────────────────────
function parseTvFrames(raw) {
  const out = [];
  const RE  = /~m~(\d+)~m~/g;
  let m;
  while ((m = RE.exec(raw)) !== null) {
    const len   = Number(m[1]);
    const start = m.index + m[0].length;
    try { out.push(JSON.parse(raw.slice(start, start + len))); } catch {}
    RE.lastIndex = start + len;
  }
  return out;
}

function extractSds1MaxTs(sds1) {
  if (!sds1) return null;
  if (Array.isArray(sds1.s) && sds1.s.length > 0) {
    let maxT = null;
    for (const bar of sds1.s) {
      const t = bar?.v?.[0];
      if (typeof t === 'number' && (maxT === null || t > maxT)) maxT = t;
    }
    return maxT;
  }
  if (sds1.last_bar?.t) return sds1.last_bar.t;
  return null;
}

// ── CloseDetector ─────────────────────────────────────────────────────────────
class CloseDetector {
  // catchupPeriods: caughtUp fires when sds_1 is within N periods of now.
  // Default 2 covers short TFs; long TFs (1W) need this raised so their
  // bar open (up to 7 days ago) clears the threshold.
  constructor(onClose, periodSec = 2 * 86_400, csvPath = null) {
    this.catchupThreshSec = 2 * periodSec; // sds_1 must be within 2 bar-lengths of now
    /* Periode attendue du timeframe -- conservee pour le controle de
     * coherence (15/08/2026). Sans elle, le detecteur ne peut pas savoir
     * si les bougies qu'il recoit correspondent bien a son timeframe. */
    this.periodSec = periodSec;
    this.onClose       = onClose;
    /* Chemin du CSV de CE timeframe -- necessaire pour ecrire le snapshot
     * live au bon endroit. tab2-collector a un detecteur par TF, contrairement
     * a real-time-collector qui n'en a qu'un avec un chemin fixe. */
    this.csvPath       = csvPath;
    this.pendingFlush  = new Map(); // barTs → { v, timer }
    this.lastSds1T     = null;
    this.mcbCache      = new Map(); // barTs → v[]
    this.pendingTs     = null;
    this.initialized   = false;
    this.caughtUp      = false;
    this.lastCloseAt   = Date.now();
    this.dbsiIndexToTs = new Map(); // DBSI bar index → timestamp
    this.dbsiCache     = new Map(); // barTs → { top, bottom }
    this.dbsiMaCache   = new Map(); // barTs → MA200 (v[1] de la serie DBSI, "Long Term Trend")
    this.ohlcCache     = new Map(); // barTs → { open, high, low, close }

    /* Snapshot intra-bougie : ecrit periodiquement l'etat de la bougie EN
     * COURS (la plus recente du cache) dans <csv>_live.csv. N'interfere pas
     * avec la detection de cloture -- best-effort, une erreur ici ne doit
     * jamais casser le collecteur. */
    if (this.csvPath) {
      this.liveTimer = setInterval(() => {
        try {
          if (this.mcbCache.size === 0) return;
          const latestTs = Math.max(...this.mcbCache.keys());
          const v = this.mcbCache.get(latestTs);
          if (!v) return;
          const dbsiEntry = this.dbsiCache.get(latestTs);
          const dbsi = dbsiEntry
            ? { top: dbsiEntry.top, bottom: dbsiEntry.bottom, ma200: this.dbsiMaCache.get(latestTs) }
            : {};
          writeLiveSnapshot(this.csvPath, latestTs, v, dbsi, this.ohlcCache.get(latestTs));
        } catch (e) { /* best-effort */ }
      }, LIVE_SNAPSHOT_INTERVAL_MS);
    }
  }

  _processDbsi(data) {
    const s = data[DBSI_KEY];
    if (!s) return;

    if (Array.isArray(s.st)) {
      for (const bar of s.st) {
        if (typeof bar?.i !== 'number' || typeof bar?.v?.[0] !== 'number') continue;
        this.dbsiIndexToTs.set(bar.i, bar.v[0]);
        if (typeof bar.v[1] === 'number') this.dbsiMaCache.set(bar.v[0], bar.v[1]);
      }
      if (this.dbsiIndexToTs.size > 200) {
        const sorted = [...this.dbsiIndexToTs.entries()].sort((a, b) => a[0] - b[0]);
        for (let i = 0; i < sorted.length - 200; i++) this.dbsiIndexToTs.delete(sorted[i][0]);
      }
    }

    const rawGraphics = s.ns?.d;
    const indexes     = s.ns?.indexes;
    if (typeof rawGraphics !== 'string' || !Array.isArray(indexes)) return;

    let parsed;
    try { parsed = JSON.parse(rawGraphics); } catch { return; }
    const groups = parsed?.graphicsCmds?.create?.dwglabels;
    if (!Array.isArray(groups)) return;

    for (const group of groups) {
      for (const item of group?.data ?? []) {
        if (item?.y == null) continue;
        const barIndex = indexes[item.x];
        const ts = this.dbsiIndexToTs.get(barIndex);
        if (ts == null) continue;
        const val = Number(item.t);
        if (Number.isNaN(val)) continue;
        const entry = this.dbsiCache.get(ts) ?? {};
        if      (item.ci === 8) entry.top    = val;
        else if (item.ci === 9) entry.bottom = val;
        else continue;
        this.dbsiCache.set(ts, entry);
      }
    }

    if (this.dbsiCache.size > 40) {
      const sorted = [...this.dbsiCache.keys()].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 40; i++) this.dbsiCache.delete(sorted[i]);
    }
    if (this.dbsiMaCache.size > 40) {
      const sortedMa = [...this.dbsiMaCache.keys()].sort((a, b) => a - b);
      for (let i = 0; i < sortedMa.length - 40; i++) this.dbsiMaCache.delete(sortedMa[i]);
    }
  }


  _processOhlc(data) {
    const sds1 = data["sds_1"];
    if (!sds1 || !Array.isArray(sds1.s)) return;
    for (const bar of sds1.s) {
      const v = bar?.v;
      if (!Array.isArray(v) || typeof v[0] !== "number") continue;
      if (typeof v[1] !== "number" || typeof v[2] !== "number" || typeof v[3] !== "number" || typeof v[4] !== "number") continue;
      this.ohlcCache.set(v[0], { open: v[1], high: v[2], low: v[3], close: v[4] });
    }
    if (this.ohlcCache.size > 30) {
      const sorted = [...this.ohlcCache.keys()].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 30; i++) this.ohlcCache.delete(sorted[i]);
    }
  }
  _scheduleFlush(barTs, v) {
    if (this.pendingFlush.has(barTs)) {
      const entry = this.pendingFlush.get(barTs);
      const delta = Math.abs((entry.v[1] ?? 0) - (v[1] ?? 0));
      if (delta > 0.001) {
        log(`Settle update ${new Date(barTs * 1000).toISOString()} WT1 ${entry.v[1]?.toFixed(4)} → ${v[1]?.toFixed(4)}`);
      }
      entry.v = v;
      return;
    }
    const entry = { v };
    const timer = setTimeout(() => {
      if (!this.pendingFlush.has(barTs)) return;
      this.pendingFlush.delete(barTs);
      this.lastCloseAt = Date.now();
      const dbsi = this.dbsiCache.get(barTs) ?? {};
      this.dbsiCache.delete(barTs);
      dbsi.ma200 = this.dbsiMaCache.get(barTs);
      this.dbsiMaCache.delete(barTs);
      const ohlc = this.ohlcCache.get(barTs);
      this.ohlcCache.delete(barTs);
      this.onClose({ ts: barTs, v: entry.v, dbsi, ohlc });
    }, SETTLE_DELAY_MS);
    entry.timer = timer;
    this.pendingFlush.set(barTs, entry);
    log(`Close at ${new Date(barTs * 1000).toISOString()} — settling ${SETTLE_DELAY_MS}ms`);
  }

  reset() {
    for (const [, e] of this.pendingFlush) clearTimeout(e.timer);
    this.pendingFlush.clear();
    this.lastSds1T    = null;
    this.mcbCache.clear();
    this.pendingTs    = null;
    this.initialized  = false;
    this.caughtUp     = false;
    this.lastCloseAt  = Date.now();
    this.dbsiIndexToTs.clear();
    this.dbsiCache.clear();
    this.dbsiMaCache.clear();
    this.ohlcCache.clear();
  }

  process(data, msgType) {
    this._processDbsi(data);

    this._processOhlc(data);

    const mcbSeries = data[WS_KEY];
    if (mcbSeries && Array.isArray(mcbSeries.st) && mcbSeries.st.length > 0) {
      for (const bar of mcbSeries.st) {
        if (!bar?.v || !Array.isArray(bar.v) || typeof bar.v[0] !== 'number') continue;
        const ts = bar.v[0];
        this.mcbCache.set(ts, bar.v);
        if (this.pendingFlush.has(ts)) this._scheduleFlush(ts, bar.v);
      }
      if (this.mcbCache.size > 20) {
        const sorted = [...this.mcbCache.keys()].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length - 20; i++) this.mcbCache.delete(sorted[i]);
      }
      if (!this.initialized && msgType === 'du') {
        this.initialized = true;
        log(`MCB initialized (${mcbSeries.st.length} bars)`);
      }
    }

    if (this.pendingTs && this.mcbCache.has(this.pendingTs)) {
      const v = this.mcbCache.get(this.pendingTs);
      this.mcbCache.delete(this.pendingTs);
      this._scheduleFlush(this.pendingTs, v);
      this.pendingTs = null;
    }

    const newTs = extractSds1MaxTs(data['sds_1']);
    if (newTs === null) return;
    const prevTs = this.lastSds1T;
    if (prevTs !== null && newTs <= prevTs) return;
    this.lastSds1T = newTs;

    if (!this.caughtUp) {
      if (newTs > Date.now() / 1000 - this.catchupThreshSec) {
        this.caughtUp = true;
        log(`Caught up → ${new Date(newTs * 1000).toISOString()}`);
      }
      return;
    }

    if (!this.initialized || prevTs === null) return;

    /* GARDE-FOU DE COHERENCE DE TIMEFRAME (15/08/2026) -- verifie que
     * l'ecart entre bougies correspond bien a la periode attendue. Voir
     * l'en-tete du patch pour les deux incidents qui l'ont motive : dans
     * les deux cas, des bougies 3m ont ete ecrites dans mcb_15m.csv parce
     * que le graphique avait change d'intervalle a l'insu du collecteur.
     * Un ecart INFERIEUR a la periode signifie qu'on recoit des bougies
     * plus rapprochees que le timeframe suppose -- donc que l'onglet
     * n'affiche pas ce qu'on croit. */
    const gapSec = newTs - prevTs;
    if (this.periodSec && gapSec > 0 && gapSec < this.periodSec) {
      log(`INCOHERENCE TF: ecart de ${gapSec}s entre bougies alors que la periode ` +
          `attendue est ${this.periodSec}s -- le graphique affiche probablement un ` +
          `autre intervalle. Ecriture REFUSEE pour ${new Date(prevTs * 1000).toISOString()}.`);
      return;
    }
    /* Ecart non multiple de la periode : anomalie d'alignement. Tolere sur
     * les timeframes longs (> 4h), ou week-ends et jours feries produisent
     * des ecarts legitimes non multiples. */
    if (this.periodSec && this.periodSec <= 4 * 3600 && gapSec % this.periodSec !== 0) {
      log(`INCOHERENCE TF: ecart de ${gapSec}s non multiple de la periode ` +
          `${this.periodSec}s -- alignement suspect. Ecriture REFUSEE pour ` +
          `${new Date(prevTs * 1000).toISOString()}.`);
      return;
    }

    const mcbValues = this.mcbCache.get(prevTs);
    if (mcbValues) {
      this.mcbCache.delete(prevTs);
      this._scheduleFlush(prevTs, mcbValues);
    } else {
      this.pendingTs = prevTs;
      log(`Close at ${new Date(prevTs * 1000).toISOString()} — MCB pending`);
    }
  }
}

// ── Per-TF state ──────────────────────────────────────────────────────────────
// lastCollectedTs: TF code → bar open timestamp (unix s) of last written close.
// Seeded from each CSV on startup so we don't re-collect on restart.
const lastCollectedTs = new Map();

const detectors = {};
for (const tf of TF_SCHEDULE) {
  initCsv(tf.csv);
  const last = readLastCsvTs(tf.csv);
  if (last > 0) lastCollectedTs.set(tf.code, last);

  detectors[tf.code] = new CloseDetector(({ ts, v, dbsi, ohlc }) => {
    if (writeClose(tf.csv, ts, v, dbsi, ohlc)) {
      lastCollectedTs.set(tf.code, ts);
    }
  }, tf.minutes * 60, tf.csv);
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
function pickNext(currentTfCode) {
  // 1. Guard: stay if current TF closes very soon
  if (currentTfCode && secsUntilNextClose(currentTfCode) <= SWITCH_GUARD_SEC) {
    return currentTfCode;
  }

  // 2. In priority order: switch to any TF with an uncollected close
  for (const tf of TF_SCHEDULE) {
    const lastCollected = lastCollectedTs.get(tf.code) ?? 0;
    const lastCompleted = lastCompletedBarOpenTs(tf.code);
    if (lastCollected < lastCompleted) {
      if (tf.code !== currentTfCode) {
        log(`Uncollected close on ${tf.label} (last=${new Date(lastCollected * 1000).toISOString().slice(0, 16)}) — switching`);
      }
      return tf.code;
    }
  }

  // 3. In priority order: switch to a TF closing imminently (get there early)
  for (const tf of TF_SCHEDULE) {
    const secs = secsUntilNextClose(tf.code);
    if (secs <= SWITCH_LEAD_SEC) {
      return tf.code;
    }
  }

  // 4. Default: 15m
  return TF_SCHEDULE[0].code;
}

// ── Tab finder ────────────────────────────────────────────────────────────────
async function findTarget() {
  const list   = await (await fetch('http://localhost:9222/json/list')).json();
  const tvTabs = list.filter(t => t.type === 'page' && /tradingview\.com\/chart/i.test(t.url));
  if (!tvTabs.length) return null;

  const isTabOwned = tabId => {
    const lockPath = `/tmp/mcb-tab-${tabId}.pid`;
    try {
      const pid = parseInt(readFileSync(lockPath, 'utf8').trim(), 10);
      if (isNaN(pid) || pid === process.pid) return false;
      try { process.kill(pid, 0); return true; } catch { return false; }
    } catch { return false; }
  };

  for (const tab of tvTabs) {
    // Never claim the dedicated 3m tab (real-time-collector owns interval=3)
    try { if (new URL(tab.url).searchParams.get('interval') === '3') continue; } catch {}
    if (!isTabOwned(tab.id)) return tab;
  }
  log('All TV tabs owned by other collectors — will retry…');
  return null;
}

// ── Navigate helper ───────────────────────────────────────────────────────────
async function navigateToTf(Page, tfCode) {
  // TV URL uses '1D'/'1W' regardless of how we store them internally.
  const urlTf = tfCode; // already in TV format ('15', '60', '240', '1D', '1W')
  const navUrl = `${TV_CHART_BASE}?symbol=${TV_SYMBOL}&interval=${urlTf}`;
  await withTimeout(Page.navigate({ url: navUrl }), CDP_CMD_TIMEOUT, `navigate-${tfCode}`);
}

// ── CDP session ───────────────────────────────────────────────────────────────
async function runSession() {
  const target = await findTarget();
  if (!target) throw new Error('No unclaimed TradingView chart tab on localhost:9222');

  log(`Attaching to: ${target.url.slice(0, 90)}`);
  const client = await withTimeout(
    CDP({ host: 'localhost', port: 9222, target: target.id }),
    CDP_CMD_TIMEOUT, 'connect'
  );
  activeClient = client;

  const TAB_LOCK = `/tmp/mcb-tab-${target.id}.pid`;
  writeFileSync(TAB_LOCK, String(process.pid), 'utf8');
  client.on('disconnect', () => { try { unlinkSync(TAB_LOCK); } catch {} });

  const { Network, Page } = client;
  await withTimeout(Network.enable(), CDP_CMD_TIMEOUT, 'Network.enable');
  await withTimeout(Page.enable(),    CDP_CMD_TIMEOUT, 'Page.enable');

  // FIX 2026-08-13: Chrome affiche parfois un dialogue natif bloquant
  // ("Actualiser le site Web ? Les modifications que vous avez apportees
  // ne seront peut-etre pas enregistrees") quand on navigue/recharge une
  // page TradingView que l'appli considere comme ayant un etat non
  // enregistre. Sans ce listener, toute navigation (switchToTf, watchdog)
  // reste suspendue indefiniment tant que personne ne clique "Actualiser"
  // -- ce qui explique le pic nocturne de remplacements de socket bloques
  // (00h-08h, personne au clavier pour debloquer). On auto-accepte pour
  // ne jamais dependre d'un clic humain.
  Page.javascriptDialogOpening(({ message, type }) => {
    log(`JS dialog [${type}] auto-accepted: "${(message || '').slice(0, 80)}"`);
    Page.handleJavaScriptDialog({ accept: true }).catch(e => {
      log(`handleJavaScriptDialog failed: ${e.message}`);
    });
  });

  let currentTfCode   = null;
  let activeDetector  = null;
  let retroactiveDone = false; // reset on each TF switch
  let wsMap           = new Map();
  let lastWsActivityAt = Date.now();

  // ── WS listeners ──────────────────────────────────────────────────────────
  Network.webSocketCreated(({ requestId, url }) => {
    if (/data\.tradingview\.com/i.test(url)) {
      // FIX 2026-08-12: TradingView remplace parfois son propre socket de
      // donnees en cours de dwell (hors de tout appel a switchToTf), toutes
      // les 4 a 11 min selon les logs mcb_tab2.log. Si wsMap contient deja
      // une entree ici, ce n'est pas le premier connect apres navigation
      // (qui trouve wsMap vide) -- c'est ce remplacement spontane. On force
      // un nouveau passage par le rattrapage retroactif sur le nouveau
      // socket, pour ne pas perdre une cloture tombee dans la fenetre de
      // transition entre les deux sockets.
      if (wsMap.size > 0) {
        retroactiveDone = false;
        log(`WS replaced mid-dwell [${requestId.slice(-6)}] — forcing retroactive re-check`);
      }
      wsMap.set(requestId, url);
      lastWsActivityAt = Date.now();
      log(`WS open  [${requestId.slice(-6)}]`);
    }
  });

  Network.webSocketClosed(({ requestId }) => {
    if (wsMap.delete(requestId)) {
      log(`WS close [${requestId.slice(-6)}]`);
    }
  });

  Network.webSocketFrameReceived(({ requestId, response }) => {
    if (!wsMap.has(requestId) || !activeDetector) return;
    lastWsActivityAt = Date.now();

    for (const msg of parseTvFrames(response?.payloadData ?? '')) {
      const type = msg?.m;
      if (type !== 'du' && type !== 'timescale_update') continue;
      const p = msg.p;
      if (!Array.isArray(p) || p.length < 2 || typeof p[1] !== 'object' || p[1] === null) continue;
      activeDetector.process(p[1], type);
    }

    // Retroactive close check: runs once after BOTH caughtUp AND initialized, per TF visit.
    // Uses lastSds1T (current bar's open, TV-aligned) minus one period to find the
    // last completed bar. This avoids epoch-alignment issues (e.g. 1W bars start Monday,
    // not Thursday as the Unix epoch would imply).
    if (!retroactiveDone && activeDetector.caughtUp && activeDetector.initialized && currentTfCode) {
      retroactiveDone = true;
      const periodSec = TF_BY_CODE[currentTfCode].minutes * 60;
      // lastSds1T is the current bar's open (TV-aligned) after caughtUp.
      const barTs = activeDetector.lastSds1T !== null
        ? activeDetector.lastSds1T - periodSec
        : lastCompletedBarOpenTs(currentTfCode);
      const tf    = TF_BY_CODE[currentTfCode];

      const lastTs = lastCollectedTs.get(currentTfCode) ?? 0;
      if (lastTs >= barTs) {
        log(`Retroactive: ${tf.label} already up to date`);
      } else {
        // FIX 2026-08-13: boucle sur toutes les bougies manquantes entre
        // lastTs et barTs, pas seulement barTs -- un trou de 2+ bougies
        // d'affilee (sous le seuil FATAL de 1800s) laissait auparavant
        // toutes les bougies sauf la derniere perdues definitivement.
        // Plafonne a MAX_RETRO_BARS pour ne pas tenter de rattraper un
        // historique demesure si lastTs est tres ancien.
        const MAX_RETRO_BARS = 20;
        let startTs = lastTs > 0 ? lastTs + periodSec : barTs;
        if (lastTs > 0 && (barTs - lastTs) / periodSec > MAX_RETRO_BARS) {
          startTs = barTs - (MAX_RETRO_BARS - 1) * periodSec;
        }
        let recovered = 0;
        let missing = 0;
        for (let ts = startTs; ts <= barTs; ts += periodSec) {
          const v = activeDetector.mcbCache.get(ts);
          if (v) {
            const dbsi    = activeDetector.dbsiCache.get(ts) ?? {};
            dbsi.ma200    = activeDetector.dbsiMaCache.get(ts);
            const ohlc    = activeDetector.ohlcCache.get(ts);
            const written = writeClose(tf.csv, ts, v, dbsi, ohlc);
            if (written) {
              lastCollectedTs.set(currentTfCode, ts);
              recovered += 1;
            }
          } else {
            missing += 1;
          }
        }
        if (recovered > 0) {
          log(`Retroactive: ${tf.label} ${recovered} bougie(s) recuperee(s) jusqu'a ${new Date(barTs * 1000).toISOString()}${missing > 0 ? `, ${missing} introuvable(s) en cache` : ''}`);
        } else if (missing > 0) {
          log(`Retroactive: ${tf.label} ${missing} bougie(s) manquante(s) jusqu'a ${new Date(barTs * 1000).toISOString()} — not in cache, will catch live`);
        }
      }
    }
  });

  // ── TF switch helper ───────────────────────────────────────────────────────
  // Separated out so both the scheduler and the WS watchdog can call it.
  async function switchToTf(tfCode) {
    const tf    = TF_BY_CODE[tfCode];
    const prev  = currentTfCode ? TF_BY_CODE[currentTfCode].label : '—';
    if (tfCode !== currentTfCode) log(`${prev} → ${tf.label}`);

    currentTfCode   = tfCode;
    _logLabel       = `tab2/${tf.label}`;
    activeDetector  = detectors[tfCode];
    activeDetector.reset();
    retroactiveDone = false;
    wsMap.clear();
    lastWsActivityAt = Date.now();

    await navigateToTf(Page, tfCode);
  }

  // ── WS absence watchdog ───────────────────────────────────────────────────
  // FIX 2026-07-15: le critère "temps depuis la derniere frame" ne marchait pas —
  // les heartbeats TradingView le rafraichissaient en permanence, donc le watchdog
  // ne se declenchait jamais (6h30 de trou le 15/07). On mesure maintenant le temps
  // depuis la derniere bougie ECRITE sur le TF actif, seuil = 2x sa periode (min 5min).
  // Action: process.exit(1) — launchd relance, le rattrapage retroactif recupere la bougie.
  const wsAbsenceTimer = setInterval(async () => {
    const activeTf = TF_BY_CODE[currentTfCode ?? "15"]; const staleLimitMs = Math.max(activeTf.minutes * 60 * 2, 300) * 1000; const silentMs = Date.now() - (detectors[currentTfCode ?? "15"]?.lastCloseAt ?? Date.now());
    if (silentMs < staleLimitMs) return;
    const tfLabel = TF_BY_CODE[currentTfCode ?? '15']?.label ?? '?';
    log(`FATAL: no close written on ${tfLabel} for ${Math.round(silentMs / 1000)}s — exiting so launchd restarts us.`); process.exit(1);
  }, 15_000);

  // ── Rotation scheduler ────────────────────────────────────────────────────
  const schedulerTimer = setInterval(async () => {
    const next = pickNext(currentTfCode);
    if (next === currentTfCode) return;
    try { await switchToTf(next); } catch (e) { log(`Switch failed: ${e.message}`); }
  }, POLL_INTERVAL_MS);

  // ── Initial navigation ─────────────────────────────────────────────────────
  const initial = pickNext(null);
  log(`Starting on ${TF_BY_CODE[initial].label} — navigating…`);
  try {
    await switchToTf(initial);
  } catch (e) {
    clearInterval(wsAbsenceTimer);
    clearInterval(schedulerTimer);
    throw e;
  }
  log('Monitoring active.\n');

  await new Promise((_, reject) => {
    client.on('disconnect', () => {
      clearInterval(wsAbsenceTimer);
      clearInterval(schedulerTimer);
      reject(new Error('CDP disconnected'));
    });
  });
}

// ── Shutdown ──────────────────────────────────────────────────────────────────
let running = true;
let activeClient = null;

function shutdown() {
  running = false;
  log('Stopped.');
  try { activeClient?.close(); } catch {}
  process.exit(0);
}
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

// ── Main loop ─────────────────────────────────────────────────────────────────
log(`tab2-collector started`);
log(`TFs: ${TF_SCHEDULE.map(t => `${t.label}→${t.csv.split('/').at(-1)}`).join('  ')}`);
log(`guard=${SWITCH_GUARD_SEC}s  lead=${SWITCH_LEAD_SEC}s  poll=${POLL_INTERVAL_MS / 1000}s\n`);

while (running) {
  try {
    await runSession();
  } catch (err) {
    if (!running) break;
    log(`Session error: ${err.message}`);
    log(`Reconnecting in ${RECONNECT_DELAY_MS / 1000}s…\n`);
    await new Promise(r => setTimeout(r, RECONNECT_DELAY_MS));
  }
}
