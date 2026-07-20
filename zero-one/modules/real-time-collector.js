#!/usr/bin/env node
/**
 * real-time-collector.js — Continuous Market Cipher B close detector.
 *
 * Connects to TradingView via CDP, monitors sds_1 via WebSocket frames.
 * When the bar timestamp changes (= candle closed), waits SETTLE_DELAY_MS for
 * EMA values to stabilise, then writes one CSV row with the settled MCB values.
 *
 * Runs indefinitely. Auto-reconnects on CDP loss or TV WebSocket close.
 * One-time page reload at each CDP session start to capture the WebSocket fresh.
 *
 * v[] mapping (validated against DataWindow on 2026-06-30):
 *   v[0]  = bar timestamp (unix seconds)
 *   v[1]  = Lt Blue Wave (WT1)
 *   v[2]  = Blue Wave (WT2)
 *   v[4]  = Money Flow
 *   v[5]  = sell flag  (plot_4, hidden in DW, int 0/1)
 *   v[6]  = buy signal (0 = no signal, non-zero = signal value)
 *   v[7]  = WT1 cross UP   (null/1e+100 = no cross)
 *   v[8]  = WT1 cross DOWN (null/1e+100 = no cross)
 *   v[11]-v[14] = niveaux fixes tracés (60 / -60 / 53 / -53) — décor, pas des données
 *   v[15], v[16] = deux séries continues, rôle inconnu (varient en temps réel)
 *   v[17] = petit entier stable (2 ou 3) — rôle inconnu
 *   v[18], v[19] = bornes de la bande basse (-93 / -103) — constantes
 *   v[20]-v[23] = duplication exacte de v[5]-v[8] — raison inconnue
 *
 * DÉCOUVERTE 2026-07-16 (sniff live, ws-sniffer.js) :
 *   Le gros point vert de la bande basse s'imprime quand la Blue Wave (v[2])
 *   entre dans la zone -93/-103. À cet instant, et seulement là, v[6] passe à 1
 *   et v[7] cesse d'être na. C'est pourquoi v[6] est resté à 0 sur 284 bougies
 *   consécutives : le signal est RARE, pas cassé. La bande n'est pas décorative,
 *   c'est la zone de survente extrême qui déclenche le signal.
 *   NON RÉSOLU : v[5] vaut 1 en quasi-permanence — un "flag" toujours actif dont
 *   le sens reste inconnu. Le cas symétrique (point rouge ? v[8] ?) n'a pas été
 *   observé.
 *
 * DBSI (MarketCipher DBSI, WS key S8XNwk — identified via ws-sniffer.js on 2026-07-01):
 *   Not a plot v[] series — it draws two label.new() values per candle via Pine
 *   graphics (ns.d, a JSON-stringified graphicsCmds payload), not through plot().
 *   Each candle gets one label anchored above the bar (ci=8 → dbsi_top) and one
 *   below it (ci=9 → dbsi_bottom), both integers roughly in [-5, +28]. Bull/bear
 *   semantics unconfirmed (indicator is protected) — columns are named by
 *   on-chart position only. Label x-offsets are resolved to bar indices via the
 *   study's own ns.indexes array, then to timestamps via its st[].i/st[].v[0].
 *   Only the most recent ~25 bars carry label data (visible-window graphics).
 *
 * Usage:
 *   node scripts/real-time-collector.js \
 *     [--csv mcb_closes.csv]   output file (default: mcb_closes.csv)
 *     [--ws-key YXeZEi]        WS series key for MCB (default: YXeZEi)
 *     [--dbsi-key S8XNwk]      WS series key for MC DBSI (default: S8XNwk)
 *     [--timeframe 240]        expected TV resolution code (1/5/15/60/240/D…)
 *                              warns + prompts if chart is on a different TF
 */

import CDP from 'chrome-remote-interface';
import { appendFileSync, existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';

// ── Config ────────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const getArg     = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const CSV_PATH   = getArg('--csv',       'mcb_closes.csv');
const WS_KEY     = getArg('--ws-key',    'YXeZEi');
const DBSI_KEY   = getArg('--dbsi-key',  'S8XNwk');
const EXPECTED_TF = getArg('--timeframe', null);   // e.g. "240", "60", "D"

const RECONNECT_DELAY_MS = 5_000;
const SETTLE_DELAY_MS    = 2_000;  // wait after close detection for EMA settle
const SENTINEL_THRESHOLD = 1e90;

// Stale threshold = 2 full bar durations, minimum 5 min.
// Avoids spam on slow timeframes (4h = 28800s, 1m = 300s).
const TF_MINUTES_MAP = { '1':1,'2':2,'3':3,'5':5,'10':10,'15':15,'20':20,'30':30,
                          '45':45,'60':60,'120':120,'180':180,'240':240,
                          '360':360,'480':480,'720':720,'D':1440,'W':10080,
                          '1D':1440,'1W':10080 };
const STALE_WARNING_SEC = Math.max(
  (TF_MINUTES_MAP[EXPECTED_TF] ?? 60) * 60 * 2,
  300
);

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg) {
  process.stderr.write(`[${new Date().toISOString().slice(11, 23)}] ${TF_PREFIX}${msg}\n`);
}

// ── Timeframe helpers ─────────────────────────────────────────────────────────
const TF_NAMES = {
  '1':'1m','2':'2m','3':'3m','5':'5m','10':'10m','15':'15m','20':'20m',
  '30':'30m','45':'45m','60':'1h','120':'2h','180':'3h','240':'4h',
  '360':'6h','480':'8h','720':'12h','D':'1D','W':'1W','M':'1M',
  '1D':'1D','1W':'1W',
};
const tfLabel = tf => TF_NAMES[tf] ? `${tf} (${TF_NAMES[tf]})` : tf;
const TF_PREFIX = EXPECTED_TF ? `[${TF_NAMES[EXPECTED_TF] ?? EXPECTED_TF}] ` : '';

// ── Stdin prompt (stderr for display, stdin for input) ────────────────────────
function promptConfirm(question) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    process.stderr.write(question);
    rl.once('line', line => { rl.close(); resolve(line.trim().toLowerCase()); });
    rl.once('close', () => resolve(''));
  });
}

// ── Timeframe check (run once, before first reload) ───────────────────────────
async function checkTimeframe(Runtime) {
  if (!EXPECTED_TF) return; // no check requested

  let actual;
  try {
    const res = await Runtime.evaluate({
      expression:   `window.TradingViewApi._activeChartWidgetWV.value().resolution()`,
      returnByValue: true,
    });
    actual = String(res.result?.value ?? '');
  } catch {
    log('WARN: Could not read chart timeframe — skipping check');
    return;
  }

  if (!actual || actual === EXPECTED_TF) {
    log(`Timeframe check: ${tfLabel(actual)} ✓`);
    return;
  }

  // Mismatch — no TTY (e.g. launchd) means no one can answer a prompt: warn and continue.
  if (!process.stdin.isTTY) {
    log(`WARN: TIMEFRAME MISMATCH — chart is on ${tfLabel(actual)}, expected ${tfLabel(EXPECTED_TF)}. No TTY attached — continuing anyway (can't prompt non-interactively).`);
    return;
  }

  // Interactive session — warn and prompt.
  process.stderr.write('\n');
  process.stderr.write('  ┌─────────────────────────────────────────────┐\n');
  process.stderr.write('  │  ⚠  TIMEFRAME MISMATCH                      │\n');
  process.stderr.write(`  │  Chart is on : ${tfLabel(actual).padEnd(30)}│\n`);
  process.stderr.write(`  │  Expected    : ${tfLabel(EXPECTED_TF).padEnd(30)}│\n`);
  process.stderr.write('  └─────────────────────────────────────────────┘\n\n');

  const answer = await promptConfirm('  Continue on current timeframe? [y/N] ');
  process.stderr.write('\n');

  if (!answer.match(/^y(es)?$/i)) {
    log('Aborted — change the chart timeframe or remove --timeframe flag.');
    process.exit(1);
  }
  log(`Confirmed — continuing on ${tfLabel(actual)} (expected ${tfLabel(EXPECTED_TF)})`);
}

// ── Startup jitter — stagger tab probe/navigate to prevent simultaneous conflicts ─
const TF_STARTUP_ORDER = ['3','15','60','240','D','W','1D','1W'];
const _startupIdx = TF_STARTUP_ORDER.indexOf(EXPECTED_TF ?? '');
if (_startupIdx > 0) {
  await new Promise(r => setTimeout(r, _startupIdx * 3_000));
}

// ── PID file lock ─────────────────────────────────────────────────────────────
// Prevents duplicate instances when launchd restarts before the old process exits.
// Per-timeframe so multiple TF collectors can run in parallel.
const PID_FILE = `/tmp/mcb-collector-${EXPECTED_TF ?? 'default'}.pid`;

if (existsSync(PID_FILE)) {
  const oldPid = parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10);
  if (!isNaN(oldPid) && oldPid !== process.pid) {
    let alive = true;
    try { process.kill(oldPid, 0); } catch { alive = false; }
    if (alive) {
      log(`Waiting for existing instance PID ${oldPid} to exit…`);
      let waited = 0;
      while (waited < 45_000) {
        await new Promise(r => setTimeout(r, 2_000));
        waited += 2_000;
        try { process.kill(oldPid, 0); } catch { alive = false; break; }
      }
      if (alive) log(`Timeout waiting for PID ${oldPid} — proceeding anyway`);
      else log(`PID ${oldPid} exited — starting`);
    }
  }
}
writeFileSync(PID_FILE, String(process.pid), 'utf8');
process.on('exit', () => { try { unlinkSync(PID_FILE); } catch {} });

// ── CSV ───────────────────────────────────────────────────────────────────────
const CSV_HEADER = 'timestamp,open,high,low,close,lt_blue_wave,blue_wave,money_flow,buy,sell,dbsi_top,dbsi_bottom,ma200\n';

function initCsv() {
  if (!existsSync(CSV_PATH)) {
    writeFileSync(CSV_PATH, CSV_HEADER, 'utf8');
    log(`Created ${CSV_PATH}`);
  } else {
    const firstLine = readFileSync(CSV_PATH, 'utf8').split('\n', 1)[0];
    if (firstLine.trim() !== CSV_HEADER.trim()) {
      log(`WARN: ${CSV_PATH} has an older header (no dbsi_top/dbsi_bottom columns).`);
      log(`WARN: new rows will append with 8 columns — existing rows keep 6. Rewrite manually if you need a consistent schema.`);
    }
    log(`Appending to existing ${CSV_PATH}`);
  }
}

function fmt(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' && Math.abs(v) > SENTINEL_THRESHOLD) return '';
  return typeof v === 'number' ? +v.toFixed(6) : v;
}

function writeClose(barTs, v, dbsi, ohlc) {
  const isoTs = new Date(barTs * 1000).toISOString();
  const row   = [isoTs, fmt(ohlc?.open), fmt(ohlc?.high), fmt(ohlc?.low), fmt(ohlc?.close), fmt(v[1]), fmt(v[2]), fmt(v[4]), fmt(v[6]), fmt(v[5]), fmt(dbsi?.top), fmt(dbsi?.bottom), fmt(dbsi?.ma200)].join(",") + "\n";
  // Secondary dedup guard: skip if last CSV line already has this timestamp.
  try {
    const existing = readFileSync(CSV_PATH, 'utf8');
    const lastLine = existing.trimEnd().split('\n').at(-1) ?? '';
    if (lastLine.startsWith(isoTs)) {
      log(`SKIP duplicate row for ${isoTs}`);
      return row.trim();
    }
  } catch {}
  appendFileSync(CSV_PATH, row, 'utf8');
  process.stdout.write(JSON.stringify({
    event:        'close',
    timestamp:    isoTs,
    bar_ts:       barTs,
    open:         fmt(ohlc?.open),
    high:         fmt(ohlc?.high),
    low:          fmt(ohlc?.low),
    close:        fmt(ohlc?.close),
    lt_blue_wave: fmt(v[1]),
    blue_wave:    fmt(v[2]),
    money_flow:   fmt(v[4]),
    buy:          fmt(v[6]),
    sell:         fmt(v[5]),
    wt1_cross_up: v[7] != null && Math.abs(v[7]) < SENTINEL_THRESHOLD ? v[7] : null,
    wt1_cross_dn: v[8] != null && Math.abs(v[8]) < SENTINEL_THRESHOLD ? v[8] : null,
    dbsi_top:     dbsi?.top ?? null,
    dbsi_bottom:  dbsi?.bottom ?? null,
  }) + '\n');
  return row.trim();
}

// ── TradingView frame parser ──────────────────────────────────────────────────
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

// ── sds_1 max-timestamp extractor ─────────────────────────────────────────────
// Uses MAX across all bars in the batch — robust against non-chronological order.
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

// ── Close detector ────────────────────────────────────────────────────────────
class CloseDetector {
  /**
   * @param {(result: {ts: number, v: number[]}) => void} onClose
   *   Called SETTLE_DELAY_MS after a close is detected, with the latest MCB values.
   */
  constructor(onClose) {
    this.onClose      = onClose;
    this.pendingFlush   = new Map(); // barTs → { v: number[], timer: NodeJS.Timeout }
    this.lastSds1T      = null;
    this.mcbCache       = new Map(); // barTs → v[]
    this.pendingTs      = null;      // close detected but MCB values not yet in cache
    this.initialized    = false;
    this.caughtUp       = false;
    this.lastCloseAt    = Date.now();
    this.dbsiIndexToTs  = new Map(); // DBSI study bar index (i) → bar timestamp
    this.dbsiCache      = new Map(); // barTs → { top, bottom }
    this.dbsiMaCache    = new Map(); // barTs → MA200 (v[1] de la serie DBSI, "Long Term Trend")
    this.ohlcCache      = new Map(); // barTs → { open, high, low, close }
  }

  // Update the DBSI bar-index→timestamp map and decode any fresh label graphics.
  _processDbsi(data) {
    const dbsiSeries = data[DBSI_KEY];
    if (!dbsiSeries) return;

    if (Array.isArray(dbsiSeries.st)) {
      for (const bar of dbsiSeries.st) {
        if (typeof bar?.i !== 'number' || typeof bar?.v?.[0] !== 'number') continue;
        this.dbsiIndexToTs.set(bar.i, bar.v[0]);
        if (typeof bar.v[1] === 'number') this.dbsiMaCache.set(bar.v[0], bar.v[1]);
      }
      if (this.dbsiIndexToTs.size > 200) {
        const sorted = [...this.dbsiIndexToTs.entries()].sort((a, b) => a[0] - b[0]);
        for (let i = 0; i < sorted.length - 200; i++) this.dbsiIndexToTs.delete(sorted[i][0]);
      }
    }

    const rawGraphics = dbsiSeries.ns?.d;
    const indexes      = dbsiSeries.ns?.indexes;
    if (typeof rawGraphics !== 'string' || !Array.isArray(indexes)) return;

    let parsed;
    try { parsed = JSON.parse(rawGraphics); } catch { return; }

    const groups = parsed?.graphicsCmds?.create?.dwglabels;
    if (!Array.isArray(groups)) return;

    for (const group of groups) {
      for (const item of group?.data ?? []) {
        if (item?.y == null) continue; // legend/placeholder entries
        const barIndex = indexes[item.x];
        const ts        = this.dbsiIndexToTs.get(barIndex);
        if (ts == null) continue; // bar not yet mapped — skip rather than guess
        const val = Number(item.t);
        if (Number.isNaN(val)) continue;
        const entry = this.dbsiCache.get(ts) ?? {};
        if (item.ci === 8) entry.top = val;
        else if (item.ci === 9) entry.bottom = val;
        else continue; // unexpected color index — ignore rather than mislabel
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

  // Extract OHLC from sds_1 (main chart candle series) and cache by bar timestamp.
  // sds_1 bar.v format: [timestamp, open, high, low, close, volume] (confirmed via ws-sniffer 2026-07-03).
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

  // Schedule a settle-flush for a closed bar.
  // If called again before the timer fires (updated MCB data arrived), refreshes v[].
  _scheduleFlush(barTs, v) {
    if (this.pendingFlush.has(barTs)) {
      // Updated values arrived during the settle window — refresh silently.
      const entry    = this.pendingFlush.get(barTs);
      const delta    = Math.abs((entry.v[1] ?? 0) - (v[1] ?? 0));
      if (delta > 0.001) {
        log(`Settle update ${new Date(barTs * 1000).toISOString()} WT1 ${entry.v[1]?.toFixed(4)} → ${v[1]?.toFixed(4)}`);
      }
      entry.v = v;
      return;
    }

    const entry = { v };
    const timer = setTimeout(() => {
      if (!this.pendingFlush.has(barTs)) return; // was cancelled by reset()
      this.pendingFlush.delete(barTs);
      this.lastCloseAt = Date.now();
      const dbsi = this.dbsiCache.get(barTs) ?? {};
      dbsi.ma200 = this.dbsiMaCache.get(barTs);
      this.dbsiMaCache.delete(barTs);
      this.dbsiCache.delete(barTs);
      const ohlc = this.ohlcCache.get(barTs);
      this.ohlcCache.delete(barTs);
      this.onClose({ ts: barTs, v: entry.v, dbsi, ohlc });
    }, SETTLE_DELAY_MS);
    entry.timer = timer;
    this.pendingFlush.set(barTs, entry);
    log(`Close at ${new Date(barTs * 1000).toISOString()} — settling for ${SETTLE_DELAY_MS}ms`);
  }

  reset() {
    for (const [, e] of this.pendingFlush) clearTimeout(e.timer);
    this.pendingFlush.clear();
    this.lastSds1T   = null;
    this.mcbCache.clear();
    this.pendingTs   = null;
    this.initialized = false;
    this.caughtUp    = false;
    this.lastCloseAt = Date.now();
    this.dbsiIndexToTs.clear();
    this.dbsiCache.clear();
    this.dbsiMaCache.clear();
    this.ohlcCache.clear();
  }

  process(data, msgType) {
    // ── Update DBSI cache ────────────────────────────────────────────────────
    this._processDbsi(data);

    this._processOhlc(data);

    // ── Update MCB cache ─────────────────────────────────────────────────────
    const mcbSeries = data[WS_KEY];
    if (mcbSeries && Array.isArray(mcbSeries.st) && mcbSeries.st.length > 0) {
      for (const bar of mcbSeries.st) {
        if (!bar?.v || !Array.isArray(bar.v) || typeof bar.v[0] !== 'number') continue;
        const ts = bar.v[0];
        this.mcbCache.set(ts, bar.v);
        // If a settle window is open for this bar, push the updated values in.
        if (this.pendingFlush.has(ts)) this._scheduleFlush(ts, bar.v);
      }
      if (this.mcbCache.size > 20) {
        const sorted = [...this.mcbCache.keys()].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length - 20; i++) this.mcbCache.delete(sorted[i]);
      }
      if (!this.initialized && msgType === 'du') {
        this.initialized = true;
        log(`MCB initialized (${mcbSeries.st.length} bar(s)) — waiting for sds_1 to catch up`);
      }
    }

    // ── Flush pendingTs once its MCB data arrives ─────────────────────────────
    if (this.pendingTs && this.mcbCache.has(this.pendingTs)) {
      const v = this.mcbCache.get(this.pendingTs);
      this.mcbCache.delete(this.pendingTs);
      this._scheduleFlush(this.pendingTs, v);
      this.pendingTs = null;
    }

    // ── Sticky-max sds_1 tracking ────────────────────────────────────────────
    const newTs = extractSds1MaxTs(data['sds_1']);
    if (newTs === null) return;

    const prevTs = this.lastSds1T;
    if (prevTs !== null && newTs <= prevTs) return;
    this.lastSds1T = newTs;

    if (!this.caughtUp) {
      if (newTs > Date.now() / 1000 - 2 * 86_400) {
        this.caughtUp = true;
        log(`Caught up → ${new Date(newTs * 1000).toISOString()} — close detection active`);
      }
      return;
    }

    if (!this.initialized || prevTs === null) return;

    // ── Close detected: schedule settle flush ────────────────────────────────
    const mcbValues = this.mcbCache.get(prevTs);
    if (mcbValues) {
      this.mcbCache.delete(prevTs);
      this._scheduleFlush(prevTs, mcbValues);
    } else {
      // MCB values not yet in cache — store prevTs and wait.
      this.pendingTs = prevTs;
      log(`Close at ${new Date(prevTs * 1000).toISOString()} — MCB values pending`);
    }
  }

  checkStale() {
    if (!this.initialized) return;
    const sec = (Date.now() - this.lastCloseAt) / 1000;
    if (sec > STALE_WARNING_SEC) {
      log(`FATAL: No close written in ${Math.round(sec)}s — exiting so launchd restarts us.`);
      process.exit(1);
    }
  }
}

// ── CDP session ───────────────────────────────────────────────────────────────

// Read a tab's current TV chart resolution without reloading it.
// Opens a brief CDP connection, evaluates resolution(), then closes.
async function probeTabResolution(targetId) {
  let c;
  try {
    c = await withTimeout(
      CDP({ host: 'localhost', port: 9222, target: targetId }),
      5_000, 'probe-connect'
    );
    const { Runtime } = c;
    await withTimeout(Runtime.enable(), 3_000, 'probe-runtime');
    const res = await withTimeout(
      Runtime.evaluate({
        expression:   `(function(){try{return window.TradingViewApi._activeChartWidgetWV.value().resolution();}catch(e){return '';}})()`,
        returnByValue: true,
      }),
      3_000, 'probe-resolution'
    );
    return String(res.result?.value ?? '');
  } catch {
    return '';
  } finally {
    try { c?.close(); } catch {}
  }
}

async function findTarget() {
  const list = await (await fetch('http://localhost:9222/json/list')).json();
  const tvTabs = list.filter(t => t.type === 'page' && /tradingview\.com\/chart/i.test(t.url));

  if (!tvTabs.length) {
    return list.find(t => t.type === 'page' && /tradingview/i.test(t.url)) || null;
  }

  // Single tab or no TF constraint → return first match immediately.
  if (!EXPECTED_TF || tvTabs.length === 1) return tvTabs[0];

  // Multiple tabs + expected TF → probe each one.
  // TV returns '1D'/'1W'; normalise to match our 'D'/'W' convention.
  const normTf = raw => raw.replace(/^1([DW])$/, '$1');

  // Check if a tab is owned by another running collector.
  const isTabOwned = tabId => {
    const lockPath = `/tmp/mcb-tab-${tabId}.pid`;
    try {
      const pid = parseInt(readFileSync(lockPath, 'utf8').trim(), 10);
      if (isNaN(pid) || pid === process.pid) return false;
      try { process.kill(pid, 0); return true; } catch { return false; }
    } catch { return false; }
  };

  // First pass: exact TF match on a non-owned tab.
  for (const tab of tvTabs) {
    if (isTabOwned(tab.id)) continue;
    const raw = await probeTabResolution(tab.id);
    const tf  = normTf(raw);
    if (tf === EXPECTED_TF) {
      log(`Tab found: resolution=${raw} ✓`);
      return tab;
    }
  }

  // Second pass: any non-owned tab (navigate will set TF).
  for (const tab of tvTabs) {
    if (isTabOwned(tab.id)) continue;
    log(`No tab at ${tfLabel(EXPECTED_TF)} — will navigate unowned tab`);
    return tab;
  }

  log(`All tabs owned — no tab available for ${tfLabel(EXPECTED_TF)}, will retry…`);
  return null;
}

let firstSession = true;

// Wraps any promise with a hard timeout. Throws if not resolved within ms.
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`CDP timeout: ${label}`)), ms)
    ),
  ]);
}

const CDP_CMD_TIMEOUT = 12_000; // max ms for any single CDP command

// Build navigate URL: adds ?interval=TF to enforce the chart timeframe on every load.
// TV uses '1D'/'1W' in URL params even though our EXPECTED_TF convention uses 'D'/'W'.
const TF_TO_URL_INTERVAL = { 'D': '1D', 'W': '1W' };

async function navigateToChart(Page, target) {
  if (!EXPECTED_TF) {
    await withTimeout(Page.reload({ ignoreCache: false }), CDP_CMD_TIMEOUT, 'Page.reload');
    return;
  }
  const urlInterval = TF_TO_URL_INTERVAL[EXPECTED_TF] ?? EXPECTED_TF;
  const base  = target.url.split('?')[0];
  const sym   = new URL(target.url).searchParams.get('symbol') ?? 'BYBIT%3ABTCUSD.P';
  const navUrl = `${base}?symbol=${sym}&interval=${urlInterval}`;
  await withTimeout(Page.navigate({ url: navUrl }), CDP_CMD_TIMEOUT, 'Page.navigate');
}

async function runSession(detector) {
  const target = await findTarget();
  if (!target) throw new Error('No TradingView chart tab found on localhost:9222');

  log(`Attaching to: ${target.url.slice(0, 90)}`);
  const client = await withTimeout(
    CDP({ host: 'localhost', port: 9222, target: target.id }),
    CDP_CMD_TIMEOUT, 'connect'
  );
  activeClient = client;

  // Claim this tab so other collectors skip it.
  const TAB_LOCK = `/tmp/mcb-tab-${target.id}.pid`;
  writeFileSync(TAB_LOCK, String(process.pid), 'utf8');
  client.on('disconnect', () => { try { unlinkSync(TAB_LOCK); } catch {} });
  const { Network, Page, Runtime } = client;

  await withTimeout(Network.enable(), CDP_CMD_TIMEOUT, 'Network.enable');
  await withTimeout(Page.enable(),    CDP_CMD_TIMEOUT, 'Page.enable');
  await withTimeout(Runtime.enable(), CDP_CMD_TIMEOUT, 'Runtime.enable');

  // ── Timeframe check (first session only) ──────────────────────────────────
  if (firstSession) {
    await checkTimeframe(Runtime);
    firstSession = false;
  }

  // ── WebSocket event listeners ─────────────────────────────────────────────
  const wsMap = new Map();
  let lastWsActivityAt = Date.now(); // updated on open + frame received

  Network.webSocketCreated(({ requestId, url }) => {
    if (!wsMap.has(requestId) && /data\.tradingview\.com/i.test(url)) {
      wsMap.set(requestId, url);
      lastWsActivityAt = Date.now();
      log(`WS  OPEN [${requestId.slice(-6)}] ${url.slice(0, 72)}`);
    }
  });

  Network.webSocketClosed(({ requestId }) => {
    if (!wsMap.has(requestId)) return;
    log(`WS CLOSE [${requestId.slice(-6)}] — TV will auto-reconnect`);
    wsMap.delete(requestId);
  });

  Network.webSocketFrameReceived(({ requestId, response }) => {
    if (!wsMap.has(requestId)) return;
    lastWsActivityAt = Date.now();
    for (const msg of parseTvFrames(response?.payloadData ?? '')) {
      const type = msg?.m;
      if (type !== 'du' && type !== 'timescale_update') continue;
      const p = msg.p;
      if (!Array.isArray(p) || p.length < 2 || typeof p[1] !== 'object' || p[1] === null) continue;
      detector.process(p[1], type);
    }
  });

  // ── WS-absence watchdog ───────────────────────────────────────────────────
  // If no active TV WebSocket for 90s: reload the page (TV re-establishes its
  // WS connection under Network monitoring). After MAX_RELOAD_ATTEMPTS consecutive
  // failed reloads, close the CDP client entirely — the outer loop creates a fresh
  // session with a new Network.enable() subscription.
  const WS_TIMEOUT_MS       = 90_000;
  const MAX_RELOAD_ATTEMPTS = 5;       // ~7.5 min of retrying before hard restart
  let reloadAttempts = 0;

  const wsAbsenceTimer = setInterval(async () => {
    if (wsMap.size > 0) { reloadAttempts = 0; return; } // WS active — reset counter
    const silentMs = Date.now() - lastWsActivityAt;
    if (silentMs < WS_TIMEOUT_MS) return;

    reloadAttempts++;
    if (reloadAttempts > MAX_RELOAD_ATTEMPTS) {
      log(`No WS after ${reloadAttempts} reload attempts — closing CDP session for full restart`);
      clearInterval(wsAbsenceTimer);
      try { client.close(); } catch {} // triggers disconnect → outer loop reconnects
      return;
    }

    log(`No TV WebSocket for ${Math.round(silentMs / 1000)}s — reloading page (attempt ${reloadAttempts}/${MAX_RELOAD_ATTEMPTS})…`);
    detector.reset();
    lastWsActivityAt = Date.now();
    try { await navigateToChart(Page, target); } catch {}
  }, 15_000);

  // ── Navigate to chart (with interval param to enforce correct TF) ─────────
  detector.reset();
  log('Navigating to chart to capture WebSocket connections from scratch…');
  await navigateToChart(Page, target);
  log('Page loaded — monitoring active. Waiting for first close…\n');

  await new Promise((_, reject) => {
    client.on('disconnect', () => {
      clearInterval(wsAbsenceTimer);
      reject(new Error('CDP disconnected'));
    });
  });
}

// ── Stale watchdog ────────────────────────────────────────────────────────────
const detector = new CloseDetector(({ ts, v, dbsi, ohlc }) => {
  const row = writeClose(ts, v, dbsi, ohlc);
  log(`CLOSE → ${row}`);
});

setInterval(() => detector.checkStale(), 60_000);

// ── Main ──────────────────────────────────────────────────────────────────────
initCsv();
log(`real-time-collector started — CSV: ${CSV_PATH}, WS key: ${WS_KEY}, DBSI key: ${DBSI_KEY}, settle: ${SETTLE_DELAY_MS}ms${EXPECTED_TF ? `, expected TF: ${tfLabel(EXPECTED_TF)}` : ''}`);
log('Ctrl+C to stop.\n');

let running = true;
let activeClient = null; // track current CDP client for clean shutdown

function shutdown() {
  running = false;
  log('Stopped.');
  try { activeClient?.close(); } catch {}
  process.exit(0);
}
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

while (running) {
  try {
    await runSession(detector);
  } catch (err) {
    if (!running) break;
    log(`Session error: ${err.message}`);
    log(`Reconnecting in ${RECONNECT_DELAY_MS / 1000}s…\n`);
    await new Promise(r => setTimeout(r, RECONNECT_DELAY_MS));
  }
}
