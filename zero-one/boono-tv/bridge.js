const express = require('express');
const http = require('http');
const { WebSocket, WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.BOONO_TV_PORT || 3090);
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const MCB = '/root/agents-ia-zero-one/data/mcb-live';
const SHARED_CHARTS = path.join(ROOT, 'shared', 'boono-chart-renderer.js');
// BOONO-TV four-section State Vivant; read-only V5.4.3 + Audit/MCB evidence.
const livingTVReader=require('./tv-living-state').createReader({dataDir:DATA,mcDir:MCB});
// Fourth left-stage view: compact V494 Elastic 4×15 and closed OKX 1m volume.
const conversionTickerReader=require('./tv-conversion-ticker').createReader({dataDir:DATA});

const PATHS = {
  state: path.join(DATA, 'trade-sim-v4-state.json'), // historical V4, NOT LIVE; no longer used by buildPayload
  v543paper: path.join(DATA, 'v52-paper-state.json'), // V5.4.3 PAPER analysis
  v494paper: path.join(DATA, 'v494-paper-state.json'),
  trades494: path.join(DATA, 'v494-paper-trades.ndjson'),
  trades543: path.join(DATA, 'v52-paper-trades.ndjson'),
  causalMcb: path.join(DATA, 'elastic-observer-events.ndjson'),
  audit: path.join(DATA, 'audit-history.json'),
  decisions: path.join(DATA, 'trade-sim-v4-decisions.ndjson'),
  mcb3: path.join(MCB, 'mcb_3m.csv'),
  mcb3live: path.join(MCB, 'mcb_3m_live.csv'),
  mcb15: path.join(MCB, 'mcb_15m.csv'),
  mcb15live: path.join(MCB, 'mcb_15m_live.csv')
};


// TV-ONLY OBSERVER: isolated OKX public prices/trades; no trading runner imports.
// PAPER evaluation cadence is not a live-price source. A second, read-only
// subscription allows price updates without touching the PAPER processes.
const OKX_PUBLIC_WS='wss://ws.okx.com:8443/ws/v5/public';
const OKX_INSTRUMENT='BTC-USDT-SWAP';
const OKX_CONTRACT_BTC=0.01;
let okxQuote=null,okxTradeRows=[],okxFirstTradeAt=0,okxLastTradeAt=0;
function liveMarketQuote(){
  const now=Date.now(),q=okxQuote;
  const age=q ? now-q.ts : Infinity;
  const fresh=!!q && Number.isFinite(age) && age>=-3000 && age<=15000 &&
    Number.isFinite(q.price) && q.price>0;
  return {price:fresh?round(q.price,1):null,marketTimestamp:fresh?q.ts:null,
    source:fresh?'OKX_PUBLIC_TICKER_READ_ONLY':'OKX_PUBLIC_PRICE_STALE',
    ageMs:fresh?age:null,fresh};
}
function recentEffort(){
  const now=Date.now();
  okxTradeRows=okxTradeRows.filter(t=>t.ts>=now-180000 && t.ts<=now+3000);
  const fresh=okxLastTradeAt>0 && now-okxLastTradeAt>=-3000 &&
    now-okxLastTradeAt<=15000;
  const arr=fresh?okxTradeRows:[];
  const available=arr.length>=2;
  const buy=arr.reduce((sum,x)=>sum+(x.side==='buy'?x.btc:0),0);
  const sell=arr.reduce((sum,x)=>sum+(x.side==='sell'?x.btc:0),0);
  const min=available?Math.min(...arr.map(x=>x.price)):null;
  const max=available?Math.max(...arr.map(x=>x.price)):null;
  const covered=okxFirstTradeAt?Math.min(180,Math.max(0,(now-okxFirstTradeAt)/1000)):0;
  return {status:!fresh?'OKX_TRADES_UNAVAILABLE':covered<180?'WARMING_3M':'LIVE_3M',
    coverageSeconds:Math.round(covered),
    effort:{available,buyBtc:available?round(buy,4):null,
      sellBtc:available?round(sell,4):null,sampleCount:arr.length,
      windowMinutes:3,priceNetUsd:available?round(arr[arr.length-1].price-arr[0].price,1):null,
      priceRangeUsd:available?round(max-min,1):null,
      source:'OKX_PUBLIC_AGGRESSOR_TRADES_TV_READ_ONLY',
      volumeUnit:'BTC',contractsToBtc:OKX_CONTRACT_BTC}};
}
function miniConversion(readings){
  const base=recentEffort(),pm3=round(readings?.pm3,1),pm5=round(readings?.pm5,1);
  const clash=pm3!==null&&pm5!==null&&pm3*pm5<0;
  const direction=pm3!==null&&pm5!==null&&pm3*pm5>0?(pm3>0?'long':'short'):null;
  return {...base,conversion:{pm3,pm5,pmLive:round(readings?.pmCombined,1),
    quality:clash?'CONTESTED':'UNCLASSIFIED',
    direction,classificationSource:clash?'PM3_PM5_OPPOSITE':'P75_P95_NOT_RECALIBRATED',
    efficiency3m:null,yieldVsP75:null,effortVsP75:null}};
}
function startPublicOkxObserver(){
  function connect(){
    const ws=new WebSocket(OKX_PUBLIC_WS,{handshakeTimeout:8000});
    let ping=null;
    ws.on('open',()=>{
      console.log('[boono-tv] OKX public read-only observer connected');
      ws.send(JSON.stringify({op:'subscribe',args:[
        {channel:'trades',instId:OKX_INSTRUMENT},
        {channel:'tickers',instId:OKX_INSTRUMENT}]}));
      ping=setInterval(()=>{if(ws.readyState===WebSocket.OPEN)ws.send('ping');},20000);
    });
    ws.on('message',buf=>{
      if(buf.toString()==='pong')return;
      let msg;
      try{msg=JSON.parse(buf.toString());}catch(_){return;}
      if(msg.event==='error'){console.warn('[boono-tv] OKX public subscription rejected',msg.code);return;}
      if(!Array.isArray(msg.data))return;
      const now=Date.now();
      if(msg.arg?.channel==='trades'){
        if(okxLastTradeAt && now-okxLastTradeAt>30000){
          okxTradeRows=[];okxFirstTradeAt=0;
        }
        for(const d of msg.data){
          const ts=Number(d.ts),price=Number(d.px),sz=Number(d.sz);
          if(!Number.isFinite(ts)||Math.abs(ts-now)>60000||
             !Number.isFinite(price)||price<=0||!Number.isFinite(sz)||sz<0)continue;
          if(!okxFirstTradeAt)okxFirstTradeAt=now;
          okxLastTradeAt=now;
          okxTradeRows.push({ts,price,btc:sz*OKX_CONTRACT_BTC,side:d.side});
          if(!okxQuote||ts>=okxQuote.ts)okxQuote={price,ts};
        }
        if(okxTradeRows.length>10000)okxTradeRows=okxTradeRows.slice(-8000);
      }else if(msg.arg?.channel==='tickers'){
        for(const d of msg.data){
          const ts=Number(d.ts),price=Number(d.last);
          if(Number.isFinite(ts)&&Math.abs(ts-now)<60000&&
             Number.isFinite(price)&&price>0&&(!okxQuote||ts>=okxQuote.ts))
            okxQuote={price,ts};
        }
      }
    });
    ws.on('error',err=>console.warn('[boono-tv] OKX public observer:',err.message));
    ws.on('close',()=>{
      if(ping)clearInterval(ping);
      setTimeout(connect,4000);
    });
  }
  connect();
}

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

// TV-only historical brackets from the TWO current PAPER ledgers.
// These are not hypothetical shadow fills or old V4.10.x simulator trades.
const tradeLedgerCache=new Map();
function latestPaperLedgerTrades(file,engine){
  let st;
  try{st=fs.statSync(file);}catch(_){return [];}
  const previous=tradeLedgerCache.get(file);
  if(previous&&previous.mtime===st.mtimeMs&&previous.size===st.size)
    return previous.trades;
  const cutoff=Date.now()-48*3600000;
  const lines=tailText(file,1024*1024).split(/\r?\n/);
  const list=[];
  for(const line of lines){
    try{
      const r=JSON.parse(line),entry=Number(r.entryAt),exit=Number(r.exitAt);
      if(!Number.isFinite(entry)||entry<=0||!['long','short'].includes(r.direction))continue;
      if(Number.isFinite(exit)&&exit<cutoff)continue;
      list.push({engine,n:Number(r.tradeNo)||null,entryTs:entry,
        exitTs:Number.isFinite(exit)&&exit>0?exit:null,
        direction:r.direction,entryPrice:round(r.entryPrice,1),
        exitPrice:round(r.exitPrice,1),
        netPnlUsd:round(r.netPnlUsd,2),feesUsd:round(r.feesUsd,2),
        exitReason:r.exitReason||null,paper:true});
    }catch(_){}
  }
  const trades=list.slice(-120);
  tradeLedgerCache.set(file,{mtime:st.mtimeMs,size:st.size,trades});
  return trades;
}
// Historical observed causal cross; NEVER derived from the desk screenshot.
function lastObservedMcb3Cross(){
  const lines=tailText(PATHS.causalMcb,160*1024).split(/\r?\n/);
  for(let i=lines.length-1;i>=0;i--){
    try{
      const e=JSON.parse(lines[i]);
      if(e.family!=='MCB3'||e.key!=='BW_LBW_CROSS'||e.type!=='OBSERVED')continue;
      const at=Number(e.observedAt),age=Date.now()-at;
      if(!Number.isFinite(at)||age< -3000||age>3*3600000)return null;
      return {family:'MCB3',key:'BW_LBW_CROSS',type:'OBSERVED',
        direction:e.direction||null,observedAt:at,ageMs:age,
        event:e.current?.event||null,source:'ELASTIC_CAUSAL_EVENTS_READ_ONLY',
        decisionImpact:false};
    }catch(_){}
  }
  return null;
}
// Exact newest row of the seven-family Elastic Chronologie, not the last
// BW/LBW cross.  Keep observedAt internally; BOONO-TV never prints a clock.
function lastChronologyObservation(){
  const allowed=new Set(['MCB3','MCB15','FLOW','MA','CONVERSION','BOUNDARY','CONTEXT']);
  const lines=tailText(PATHS.causalMcb,256*1024).split(/\r?\n/);
  const now=Date.now(),MAX_AGE_MS=3*3600000;
  for(let i=lines.length-1;i>=0;i--){
    let e;try{e=JSON.parse(lines[i]);}catch(_){continue;}
    if(!e||!allowed.has(e.family)||typeof e.key!=='string'||!e.key||
       typeof e.type!=='string'||!e.type)continue;
    const at=Number(e.observedAt),age=now-at;
    if(!Number.isFinite(at)||age< -3000||age>MAX_AGE_MS)continue;
    const srcDir=e.current?.type;
    const direction=(srcDir==='UP'||srcDir==='DN')?srcDir:
      (e.direction==='long'?'UP':e.direction==='short'?'DN':null);
    return {id:Number.isSafeInteger(e.id)?e.id:null,
      family:e.family,key:e.key,type:e.type,direction,
      observedAt:at,ageMs:age,source:'ELASTIC_CHRONOLOGIE_NATIVE_READ_ONLY',
      decisionImpact:false};
  }
  return null;
}
function currentPaperTrades(v543State){
  const closed=[...latestPaperLedgerTrades(PATHS.trades494,'V494'),
    ...latestPaperLedgerTrades(PATHS.trades543,'V543')];
  const state494=readJson(PATHS.v494paper,{});
  for(const [engine,ledger] of [['V494',state494],['V543',v543State]]){
    if(ledger.brokerOrdersEnabled!==false||!ledger.position)continue;
    const pos=ledger.position,entry=Number(pos.entryAt);
    if(!Number.isFinite(entry)||entry<=0||
       !['long','short'].includes(pos.direction))continue;
    closed.push({engine,n:Number(ledger.completed)+1||null,
      entryTs:entry,exitTs:null,direction:pos.direction,
      entryPrice:round(pos.entryPrice,1),exitPrice:null,
      paper:true,open:true});
  }
  return closed.sort((a,b)=>a.entryTs-b.entryTs).slice(-160);
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
// This presentation adapter NEVER uses V4.10.10's frozen lastEvaluation.
 // Live price must come from current V5.4.3 PAPER analysis, whose price is
// itself derived from the supervised OKX market data source. Not a trade order.
// V543 PAPER observations are refreshed separately from the public OKX tick feed.
function normalizeV543Live() {
  const paper = readJson(PATHS.v543paper, {});
  const a = paper.latestAnalysis || {};
  const r = a.readings || {};
  const story = r.structural54 || {};
  const c = r.conversion || {};
  const m15 = r.mcb15 || {};
  const m3 = r.mcb3 || {};
  const ts = Number(a.asOf), p = Number(a.price);
  const now = Date.now();
  const age = now - ts;
  const fresh = paper.brokerOrdersEnabled === false &&
    /^v5\.4\.3/.test(String(a.version||'')) &&
    Number.isFinite(ts) && ts > 0 && age >= -3000 && age <= 90000 &&
    Number.isFinite(p) && p > 0;
  const analysisFresh=fresh && age<=45000;
  const tick=liveMarketQuote();
  const position = fresh && paper.position ? {
    direction: paper.position.direction || null,
    entryPrice: round(paper.position.entryPrice, 1),
    entryTimestamp: paper.position.entryAt || null,
    netPnlIfClosedNowUsd: round(paper.position.lastNetPnlUsd, 2)
  } : null;
  const freshVersion = fresh ? String(a.version)+(analysisFresh?'':' · OBSERVATION RETARDÉE') : 'V5.4.3 · ÉTAT PÉRIMÉ';
  const living = {
    thesis: {
      state:fresh?(story.phase||a.phase||null):'SOURCE_UNAVAILABLE',
      direction:fresh?(story.director||null):null,
      candidateDirection:fresh?(a.candidate||null):null,
      originMode:null,phase:fresh?(a.phase||null):null,
      authority:'MCB15 / V543 PAPER',maturity:fresh?(a.phase||'OBSERVE'):'NO_FRESH_STATE',
      maturityGate:null
    },
    background:{primary:fresh?(story.strategicState||null):null,
      oneHour:{direction:fresh?(m15.context1h||null):null,phase:'CONTEXT_ONLY'},
      fourHour:{direction:fresh?(m15.context4h||null):null,phase:'CONTEXT_ONLY'},
      daily:{direction:null,phase:null},macroShadow:null
    },
    signal:{type:null,value:null,ageMinutes:null},
    setup:{status:fresh?(a.action||null):'NO_FRESH_STATE',
      direction:fresh?(a.candidate||null):null,reason:fresh?(a.reason||null):'Waiting for fresh V543 observation',reasons:[]},
    structure:{state:fresh?(story.phase||a.phase||null):null,
      roomToBoundaryUsd:fresh?round(r.place?.spaceUsd,1):null,
      marketQuality:fresh?(a.quality||null):null},
    e15:{type:fresh?(story.structuralOrigin?.type||null):null,
      class:fresh?(story.phase||null):null,
      currentLbw:fresh?round(m15.lbw,2):null,
      extremeLbw:fresh?round(story.structuralOrigin?.lbw,2):null,
      recoveryPct:null,span:null,priceSinceExtremeUsd:null},
    mcb3:{lbw:fresh?round(m3.lbw,2):null,extremeLbw:null,slopeLbw:null,
      turningDirection:fresh?(m3.trajectory||null):null,
      structuralDirection:fresh?(story.director||null):null,
      structuralState:fresh?(m3.trajectory||null):null},
    mf15:{state:fresh?(story.mfQuality||null):null,direction:null,
      temporalState:fresh?(story.mfQuality||null):null,memoryDirection:fresh?(story.director||null):null,
      horizon:'E15→E15',tacticalDirection:fresh?(m3.trajectory||null):null,
      candidateContext:null,conversion:null},
    pm:{status:fresh?(a.phase||null):null,direction:fresh?(a.candidate||null):null,
      moveUsd:fresh?round(c.pmCombined,1):null,net3mUsd:fresh?round(c.pm3,1):null,
      gross3mUsd:null,efficiency3mPct:null},
    ticker:{status:fresh?'NO_TICKER_DECISION_AUTHORITY':'SOURCE_STALE',
      direction:null,confirmed:false,yieldVsP75:null,effortVsP75:null,cadence:null,flow:null,terrain:null},
    context:{status:fresh?(a.phase||null):null,reason:fresh?(a.prognosis||null):null},
    risk:{capUsd:null,entryAllowed:false,reason:fresh?(a.reason||null):null,rr:null},
    action:{type:fresh?(a.action||null):'NO_FRESH_STATE',direction:fresh?(a.candidate||null):null,
      stage:fresh?(a.phase||null):null,reason:fresh?(a.reason||null):null},
    v3Shadow:{action:null,direction:null,reason:null},
    lastDecision:fresh?{ts:a.asOf,action:a.action||null,reason:a.reason||null}:null
  };
  return {
    generatedAt:new Date(now).toISOString(), // bridge check time, not market timestamp
    source:fresh?'V543_PAPER_STATE_READ_ONLY':'V543_STATE_UNAVAILABLE',
    version:freshVersion,
    market:{...tick,position},
    analysis:{source:'V543_PAPER',asOf:Number.isFinite(ts)?ts:null,
      ageMs:Number.isFinite(age)?age:null,fresh:analysisFresh,available:fresh},
    tvLiving:livingTVReader(paper),
    tvTicker4x15:conversionTickerReader.view(),
    conversion:miniConversion(c),
    trades:currentPaperTrades(paper),
    chronology:{latest:lastChronologyObservation(),mcb3BwLbwCross:lastObservedMcb3Cross()},
    living, audit:[], // no obsolete V4 audit records in current TV state
    series:{
      mcb3:mergedMcb(PATHS.mcb3,PATHS.mcb3live,260),
      mcb15:mergedMcb(PATHS.mcb15,PATHS.mcb15live,120)
    }
  };
}

function speechFor(s) {
  const l=s.living;
  const a=(l.action.type||'').toUpperCase();
  const pm=(l.pm.status||'').toUpperCase();
  const tk=(l.ticker.status||'').toUpperCase();
  const mq=((l.structure.marketQuality||'')+' '+(l.structure.state||'')).toUpperCase();
  const setup=(l.setup.status||'').toUpperCase();
  const pos=s.market&&s.market.position;
  const hasPosition=!!(pos&&pos.direction);
  const c=l.thesis.candidateDirection||l.action.direction||l.setup.direction||'';
  const dir=c?c.toUpperCase():'';
  const contradiction=/OPPOSITE|FAILED|REJECT|INVALID|BREACH|STRESS|VOLAT|CHOP/.test(pm+' '+tk+' '+mq);
  const translating=/TRANSLATING|ALIGNED/.test(pm)&&!/NOT_TRANSLATING/.test(pm);

  if (/ENTER|OPEN|EXECUTE|EXIT|CLOSE/.test(a)) {
    return {type:'announcement',text:`${dir||'SETUP'} validé · R/R ${textOr(l.risk.rr)}. J'EXÉCUTE.`};
  }
  if (hasPosition&&contradiction) {
    return {type:'exclamation',text:'Contradiction détectée. Je protège le capital.'};
  }
  if (/NO_TRADE|WATCH|OBSERVE/.test(a)||setup==='OBSERVE') {
    if (pm==='NOT_TRANSLATING'&&/NOT_CONFIRMED|NO_THESIS/.test(tk)) {
      return {type:'thought',text:`MCB propose ${dir||'—'}. PM ne traduit pas encore. Ticker non confirmé. J'ATTENDS.`};
    }
    return {type:'thought',text:`J'OBSERVE.${dir?' '+dir+' candidat.':''} Il me faut plus de preuve.`};
  }
  if (l.risk.entryAllowed||l.ticker.confirmed||translating) {
    return {type:'affirmation',text:'Preuves renforcées. Je vérifie conversion, structure et R/R.'};
  }
  return {type:'thought',text:'Je lis le contexte. MCB propose. Je mesure la conversion.'};
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
  const data = normalizeV543Live();
  const speech=speechFor(data);
  data.boono = { bubble:speech.text, bubbleType:speech.type, pose:poseFor(data) };
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
// Lightweight price/volume messages do not rebuild full MCB series every second.
setInterval(()=>{
  if(!wss.clients.size)return;
  const market=liveMarketQuote(),mini=recentEffort();
  const payload=JSON.stringify({kind:'marketTick',generatedAt:new Date().toISOString(),
    market,conversion:{status:mini.status,coverageSeconds:mini.coverageSeconds,
      effort:mini.effort}});
  for(const c of wss.clients)if(c.readyState===WebSocket.OPEN)c.send(payload);
},1000);
startPublicOkxObserver();
// One REST read of confirmed OKX 1m candles per minute, cached independently
// from every 5s snapshot. No extra WS and no modification to the PAPER runners.
const refreshTickerVolume=()=>conversionTickerReader.refresh().catch(err=>
  console.warn('[boono-tv] 4x15 volume shadow refresh:',String(err?.message||err).slice(0,100)));
setTimeout(refreshTickerVolume,1500);
setInterval(refreshTickerVolume,60000);
server.listen(PORT, '127.0.0.1', () => {
  publish(true);
  console.log(`[boono-tv] read-only renderer bridge on http://127.0.0.1:${PORT}`);
});