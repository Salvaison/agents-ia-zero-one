const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.BOONO_TV_PORT || 3090);
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const MCB = '/root/agents-ia-zero-one/data/mcb-live';
const SHARED_CHARTS = path.join(ROOT, 'shared', 'boono-chart-renderer.js');

const PATHS = {
  state: path.join(DATA, 'trade-sim-v4-state.json'),
  audit: path.join(DATA, 'audit-history.json'),
  decisions: path.join(DATA, 'trade-sim-v4-decisions.ndjson'),
  mcb3: path.join(MCB, 'mcb_3m.csv'),
  mcb3live: path.join(MCB, 'mcb_3m_live.csv'),
  mcb15: path.join(MCB, 'mcb_15m.csv'),
  mcb15live: path.join(MCB, 'mcb_15m_live.csv')
};

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}
function tailText(file, maxBytes = 512 * 1024) {
  try {
    const st = fs.statSync(file);
    const len = Math.min(maxBytes, st.size);
    const fd = fs.openSync(file, 'r');
    const b = Buffer.alloc(len);
    fs.readSync(fd, b, 0, len, st.size - len);
    fs.closeSync(fd);
    return b.toString('utf8');
  } catch (_) { return ''; }
}
function lastNdjson(file) {
  const lines = tailText(file, 256 * 1024).trim().split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try { return JSON.parse(lines[i]); } catch (_) {}
  }
  return null;
}
function csvRows(file, limit = 180) {
  const txt = tailText(file, 1024 * 1024);
  const lines = txt.trim().split(/\r?\n/).filter(Boolean);
  const rows = [];
  for (const line of lines.slice(-limit)) {
    if (line.startsWith('timestamp,')) continue;
    const v = line.split(',');
    const ts = Date.parse(v[0]);
    const nums = v.slice(1).map(x => x === '' ? null : Number(x));
    if (!Number.isFinite(ts) || !Number.isFinite(nums[3])) continue;
    rows.push({
      ts,
      timestamp: v[0],
      open: nums[0], high: nums[1], low: nums[2], close: nums[3],
      lbw: nums[4], bw: nums[5], mf: nums[6],
      buy: nums[7], sell: nums[8],
      dbsiTop: nums[9], dbsiBottom: nums[10],
      ma200: nums[11], signalUp: nums[12], signalDn: nums[13]
    });
  }
  return rows;
}
function mergedMcb(base, live, limit = 180) {
  const a = csvRows(base, limit);
  const b = csvRows(live, 4);
  const m = new Map();
  for (const r of [...a, ...b]) m.set(r.ts, r);
  return [...m.values()].sort((x, y) => x.ts - y.ts).slice(-limit);
}
function lastAudit(limit = 26) {
  const a = readJson(PATHS.audit, []);
  return Array.isArray(a) ? a.slice(-limit) : [];
}
function round(v, d = 2) {
  if (v === null || v === undefined || v === '') return null;
  return Number.isFinite(Number(v)) ? Number(Number(v).toFixed(d)) : null;
}
function textOr(v, fallback = '—') {
  return v === undefined || v === null || v === '' ? fallback : String(v);
}
function normalize() {
  const state = readJson(PATHS.state, {});
  const e = state.lastEvaluation || {};
  const t = e.thesis || {};
  const bg = e.background || {};
  const sig = e.nativeSignal || {};
  const setup = e.setup || {};
  const room = e.structuralRoom || {};
  const mq = e.marketQuality || {};
  const mcb = e.mcb || {};
  const l15 = mcb.currentLobe || {};
  const m3 = mcb.nested3m || {};
  const mfs = e.mfStructureShadow || {};
  const mft = mfs.temporal || {};
  const tr = e.translation || {};
  const tk = e.ticker || {};
  const ctx = e.context || {};
  const risk = e.risk || {};
  const act = e.action || {};
  const v3 = e.v3Shadow || {};
  const decision = lastNdjson(PATHS.decisions);

  const maturity = (t.maturityGate && t.maturityGate.passed) ? 'PASS' :
    (t.maturityGate && t.maturityGate.required ? 'WAIT' : textOr(t.maturityGate && t.maturityGate.state));
  const latestSignal = sig.latest || {};
  const oneHour = bg.oneHour || {};
  const fourHour = bg.fourHour || {};
  const daily = bg.daily || {};
  const pmLive = tr.pmLive || {};
  const horizons = tr.horizons || {};
  const tickCur = tk.current || {};
  const tickP = tk.persistence || {};
  const pRaw = state.modules && state.modules.day ? state.modules.day : null;
  const position = pRaw ? {
    direction:pRaw.direction||null, entryPrice:round(pRaw.entryPrice,1), entryTimestamp:pRaw.entryTimestamp||null,
    leverage:pRaw.leverage||null, positionPercent:pRaw.positionPercent||null,
    mfeUsd:round(pRaw.metrics&&pRaw.metrics.mfeUsd,1), maeUsd:round(pRaw.metrics&&pRaw.metrics.maeUsd,1),
    netPnlIfClosedNowUsd:round(pRaw.metrics&&pRaw.metrics.netPnlIfClosedNowUsd,2)
  } : null;

  return {
    generatedAt: new Date().toISOString(),
    source: 'BOONO v4 sidecar / read-only',
    version: state.version || e.version || null,
    market: {
      price: round(e.price, 1),
      marketTimestamp: e.marketTimestamp || null,
      position
    },
    living: {
      thesis: {
        state: t.state || null,
        direction: t.direction || null,
        candidateDirection: t.candidateDirection || null,
        originMode: t.originMode || null,
        phase: t.phase || null,
        authority: t.authority || 'MCB_ONLY',
        maturity,
        maturityGate: t.maturityGate || null
      },
      background: {
        primary: bg.primaryRelation || null,
        oneHour: { direction: oneHour.structuralDirection || oneHour.direction || null, phase: oneHour.phase || null },
        fourHour: { direction: fourHour.structuralDirection || fourHour.direction || null, phase: fourHour.phase || null },
        daily: { direction: daily.structuralDirection || daily.direction || null, phase: daily.phase || null },
        macroShadow: bg.macroShadow || null
      },
      signal: {
        type: latestSignal.type || null,
        value: round(latestSignal.value, 2),
        ageMinutes: round(latestSignal.ageMinutes, 1)
      },
      setup: {
        status: setup.status || null,
        direction: setup.direction || setup.candidateDirection || null,
        reason: setup.reason || null,
        reasons: setup.reasons || []
      },
      structure: {
        state: room.state || null,
        roomToBoundaryUsd: round(room.roomToBoundaryUsd, 1),
        marketQuality: mq.state || null
      },
      e15: {
        type: l15.type || null,
        class: l15.e15Class || null,
        currentLbw: round(l15.currentLbw, 2),
        extremeLbw: round(l15.extremeLbw, 2),
        recoveryPct: round(Number(l15.recoveryFraction) * 100, 1),
        span: round((l15.relationshipFromPrevious && l15.relationshipFromPrevious.lbwSpan) || (l15.relationship && l15.relationship.lbwSpan), 1),
        priceSinceExtremeUsd: round(l15.priceReversalFromLobeExtremeUsd, 1)
      },
      mcb3: {
        lbw: round(m3.currentLbw, 2),
        extremeLbw: round(m3.extremeLbw, 2),
        slopeLbw: round(m3.slopeLbw, 2),
        turningDirection: m3.turningDirection || null,
        structuralDirection: m3.structuralDirection || null,
        structuralState: m3.structuralState || null
      },
      mf15: {
        state: mfs.state || mfs.phase || null,
        direction: mfs.direction || null,
        temporalState: mft.state || null,
        memoryDirection: mft.memoryDirection || null,
        horizon: mft.memoryHorizon || null,
        tacticalDirection: mft.tacticalDirection || null,
        candidateContext: mft.candidateContext ? (mft.candidateContext.state || String(mft.candidateContext)) : null,
        conversion: mft.conversion ? (mft.conversion.priceRelation || mft.conversion.state || String(mft.conversion)) : null
      },
      pm: {
        status: tr.status || null,
        direction: tr.direction || null,
        moveUsd: round(pmLive.priceMoveUsd, 1),
        net3mUsd: round(horizons.net3mUsd, 1),
        gross3mUsd: round(horizons.gross3mUsd, 1),
        efficiency3mPct: round(Number(horizons.efficiency3m) * 100, 1)
      },
      ticker: {
        status: tk.status || null,
        direction: tk.direction || null,
        confirmed: !!tk.confirmed,
        yieldVsP75: round(tickCur.yieldVsP75, 2),
        effortVsP75: round(tickCur.effortVsP75, 2),
        cadence: round(tickCur.cadence, 2),
        flow: round(tickCur.flow, 3),
        terrain: round(tickP.terrainRetainedFraction, 2)
      },
      context: {
        status: ctx.status || null,
        reason: ctx.reason || null
      },
      risk: {
        capUsd: round(risk.capAbsoluteUsd || risk.capUsd || 500, 0),
        entryAllowed: risk.entryAllowed === true,
        reason: risk.reason || null,
        rr: round(risk.rr && risk.rr.ratio, 2)
      },
      action: {
        type: act.type || null,
        direction: act.direction || null,
        stage: act.stage || null,
        reason: act.reason || null
      },
      v3Shadow: {
        action: v3.action && v3.action.type || v3.type || null,
        direction: v3.action && v3.action.direction || v3.direction || null,
        reason: v3.action && v3.action.reason || v3.reason || null
      },
      lastDecision: decision ? {
        ts: decision.ts || decision.recordedAt || decision.timestamp || null,
        action: decision.action || null,
        reason: decision.reason || (decision.action && decision.action.reason) || null
      } : null
    },
    audit: lastAudit(28),
    series: {
      mcb3: mergedMcb(PATHS.mcb3, PATHS.mcb3live, 260),
      mcb15: mergedMcb(PATHS.mcb15, PATHS.mcb15live, 120)
    }
  };
}
function bubbleFor(s) {
  const l = s.living;
  const a = l.action.type || '';
  const c = l.thesis.candidateDirection || l.action.direction || l.setup.direction || '';
  if (/ENTER|OPEN|EXECUTE/.test(a)) return `${c ? c.toUpperCase() : 'SETUP'} validated. R/R ${textOr(l.risk.rr)}. EXECUTE.`;
  if (l.pm.status === 'NOT_TRANSLATING' && /NOT_CONFIRMED|NO_THESIS/.test(l.ticker.status || '')) return `MCB candidate ${c ? c.toUpperCase() : '—'}. PM not translating. Ticker not confirmed. WAIT.`;
  if (/NO_TRADE|WATCH|OBSERVE/.test(a) || l.setup.status === 'OBSERVE') return `OBSERVE. ${c ? c.toUpperCase() + ' candidate. ' : ''}Need more proof. No forced trade.`;
  if (l.ticker.confirmed) return `Ticker confirmed. Check conversion, structure and R/R.`;
  return 'READ CONTEXT. CHECK MCB. MEASURE CONVERSION. WAIT FOR PROOF.';
}
function poseFor(s) {
  const l = s.living;
  const a=(l.action.type||'').toUpperCase();
  const pm=(l.pm.status||'').toUpperCase();
  const tk=(l.ticker.status||'').toUpperCase();
  const mq=((l.structure.marketQuality||'')+' '+(l.structure.state||'')).toUpperCase();
  const setup=(l.setup.status||'').toUpperCase();
  const pos=s.market && s.market.position;
  const hasPosition=!!(pos && pos.direction);
  const opposite=/OPPOSITE|FAILED|REJECT|INVALID|BREACH/.test(pm+' '+tk+' '+mq);
  const translating=/TRANSLATING|ALIGNED/.test(pm) && !/NOT_TRANSLATING/.test(pm);
  const candidate=!!(l.thesis.candidateDirection||l.setup.direction);

  // 7 visual states, deterministic and tied to the V4 situation.
  if (/ENTER|OPEN|EXECUTE|EXIT|CLOSE/.test(a)) return 'execute';
  if (hasPosition && (opposite || /BOUNDARY_CONTEST|STRESS|VOLAT|CHOP/.test(mq))) return 'worried';
  if (l.risk.entryAllowed || (l.ticker.confirmed && translating)) return 'confident';
  if (l.thesis.maturity==='PASS' && candidate && translating) return 'concentrated';
  if (candidate && (pm==='NOT_TRANSLATING' || /NOT_CONFIRMED|WAIT/.test(tk) || setup==='OBSERVE')) return 'thinking';
  if (!hasPosition && (/NO_TRADE|WATCH|OBSERVE/.test(a) || (!candidate && setup==='OBSERVE'))) return 'observe';
  return 'working';
}

let lastSerialized = '';
let cached = null;
function buildPayload() {
  const data = normalize();
  data.boono = { bubble: bubbleFor(data), pose: poseFor(data) };
  return data;
}

const app = express();
app.get('/boono-charts.js', (_req,res) => res.type('application/javascript').send(fs.readFileSync(SHARED_CHARTS,'utf8')));
app.use('/assets', express.static(path.join(__dirname, 'assets'), { maxAge: 0 }));
app.use(express.static(path.join(__dirname, 'scene'), { maxAge: 0 }));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'boono-tv', port: PORT, readOnly: true, time: new Date().toISOString() }));
app.get('/api/snapshot', (_req, res) => {
  try { res.set('Cache-Control', 'no-store'); res.json(buildPayload()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.use((_req, res) => res.sendFile(path.join(__dirname, 'scene', 'index.html')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function publish(force = false) {
  try {
    const p = buildPayload();
    const compare = JSON.stringify(Object.assign({}, p, { generatedAt:null }));
    if (!force && compare === lastSerialized) return;
    lastSerialized = compare;
    cached = p;
    const s = JSON.stringify(p);
    for (const c of wss.clients) if (c.readyState === 1) c.send(s);
  } catch (e) {
    console.error('[boono-tv] publish failed:', e.message);
  }
}
wss.on('connection', ws => {
  try {
    if (!cached) cached = buildPayload();
    ws.send(JSON.stringify(cached));
  } catch (_) {}
});

setInterval(() => publish(false), 5000);
server.listen(PORT, '127.0.0.1', () => {
  publish(true);
  console.log(`[boono-tv] read-only renderer bridge on http://127.0.0.1:${PORT}`);
});