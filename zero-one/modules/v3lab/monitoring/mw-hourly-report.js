'use strict';

const fs=require('fs');
const path=require('path');
const {readNdjsonSince}=require('../storage/rotating-ndjson');

const ROOT=path.join(__dirname,'../../..');
const DATA=path.join(ROOT,'data');
const EVAL_PATH=path.join(DATA,'trade-sim-v3lab-evaluations.ndjson');
const HISTORY_PATH=path.join(DATA,'trade-sim-v3lab-history.json');
const FORECAST_PATH=path.join(DATA,'mw-hourly-forecast-ledger.ndjson');
const MCB=path.join(ROOT,'../data/mcb-live');
const OKX_STABLE_FROM=Date.parse('2026-09-20T09:53:41.000Z');

function finite(v){return v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v));}
function n(v){const x=Number(v);return Number.isFinite(x)?x:null;}
function get(o,p){let x=o;for(const k of p.split('.')){if(x==null)return null;x=x[k];}return x==null?null:x;}
function parseIso(v){const x=Date.parse(v);return Number.isFinite(x)?x:null;}
function readJson(p,f){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(_){return f;}}
function readNdjson(p){try{return fs.readFileSync(p,'utf8').trim().split(/\r?\n/).filter(Boolean).map(x=>{try{return JSON.parse(x);}catch(_){return null;}}).filter(Boolean);}catch(_){return[];}}
function evalTs(e){return finite(e&&e.marketTimestamp)?Number(e.marketTimestamp):parseIso(e&&e.ts);}
function rowsBetween(rows,start,end){return rows.filter(x=>{const t=evalTs(x);return finite(t)&&t>=start&&t<end;}).sort((a,b)=>evalTs(a)-evalTs(b));}
function round(v,d=3){return finite(v)?Number(Number(v).toFixed(d)):null;}

function numericSummary(rows,extract){
  const vals=[];
  for(const r of rows){const v=extract(r);if(finite(v))vals.push({t:evalTs(r),v:Number(v)});}
  if(!vals.length)return null;
  const a=vals.map(x=>x.v),avg=a.reduce((s,x)=>s+x,0)/a.length;
  return {entry:round(a[0]),avg:round(avg),exit:round(a[a.length-1]),min:round(Math.min(...a)),max:round(Math.max(...a)),delta:round(a[a.length-1]-a[0]),n:a.length};
}
function categoricalSummary(rows,extract,start,end){
  const vals=rows.map(r=>({t:evalTs(r),v:extract(r)})).filter(x=>finite(x.t)&&x.v!==null&&x.v!==undefined&&String(x.v)!=='');
  if(!vals.length)return null;
  const dur=new Map(),transitions=[];
  for(let i=0;i<vals.length;i++){
    const t0=Math.max(start,vals[i].t),t1=Math.min(end,i+1<vals.length?vals[i+1].t:end);
    const ms=Math.max(0,t1-t0),key=String(vals[i].v);dur.set(key,(dur.get(key)||0)+ms);
    if(i>0&&String(vals[i-1].v)!==key)transitions.push({ts:new Date(vals[i].t).toISOString(),from:String(vals[i-1].v),to:key});
  }
  const total=[...dur.values()].reduce((a,b)=>a+b,0)||1;
  const occupancy=[...dur.entries()].map(([state,ms])=>({state,pct:round(ms/total*100,1),minutes:round(ms/60000,1)})).sort((a,b)=>b.pct-a.pct);
  return {entry:String(vals[0].v),exit:String(vals[vals.length-1].v),occupancy,transitions:transitions.slice(-12)};
}
function combinedDom(e){const d=e.dominance||{};return `${d.state||'NONE'}:${d.direction||'none'}`;}
function combinedAction(e){const a=e.action||{};return `${a.type||'NONE'}:${a.direction||'none'}`;}


function parseMcbFile(p){
  try{
    const lines=fs.readFileSync(p,'utf8').trim().split(/\r?\n/);if(lines.length<2)return[];
    const out=[];for(const line of lines.slice(1)){const v=line.split(',');if(v.length<12)continue;const ts=Date.parse(v[0]);if(!finite(ts))continue;
      const ma=v[12]!==undefined&&String(v[12]).trim()!==''?Number(v[12]):null;
      out.push({ts,timestamp:v[0],close:n(v[4]),lbw:n(v[5]),bw:n(v[6]),moneyFlow:n(v[7]),ma200:finite(ma)&&ma>1000?ma:null});}
    return out;
  }catch(_){return[];}
}
function topDownAt(end){
  const out={};
  for(const tf of ['1d','4h','1h','15m','3m']){
    const rows=[...parseMcbFile(path.join(MCB,`mcb_${tf}.csv`)),...parseMcbFile(path.join(MCB,`mcb_${tf}_live.csv`))]
      .filter(r=>r.ts<end).sort((a,b)=>a.ts-b.ts);
    const z=rows.length?rows[rows.length-1]:null;
    if(!z){out[tf]=null;continue;}
    out[tf]={timestamp:z.timestamp,ageAtWindowEndMinutes:round(Math.max(0,end-z.ts)/60000,1),close:z.close,lbw:z.lbw,bw:z.bw,moneyFlow:z.moneyFlow,
      ma200:z.ma200,priceVsMa200:finite(z.ma200)&&finite(z.close)?(z.close>=z.ma200?'ABOVE':'BELOW'):null,
      sourceEra:z.ts>=OKX_STABLE_FROM?'OKX_POST_CUTOVER':'PRE_CUTOVER_ARCHIVE'};
  }
  return out;
}

function summarizeTrades(start,end){
  const all=readJson(HISTORY_PATH,[]),trades=Array.isArray(all)?all:[];
  const entered=trades.filter(x=>{const t=parseIso(x.entryTimestamp);return finite(t)&&t>=start&&t<end;});
  const exited=trades.filter(x=>{const t=parseIso(x.exitTimestamp);return finite(t)&&t>=start&&t<end;});
  let pnl=0,grossWin=0,grossLoss=0,mfe=0,mae=0,giveback=0,capture=[];
  const details=[];
  for(const x of exited){
    const p=Number(x.pnlPercentLeveraged)||0; pnl+=p;if(p>0)grossWin+=p;else grossLoss+=p;
    const m=Number(x.mfeUsd)||0,a=Number(x.maeUsd)||0;mfe+=m;mae+=a;
    const ep=Number(x.entryPrice),xp=Number(x.exitPrice),realized=x.direction==='long'?xp-ep:ep-xp;
    const gb=m>0?Math.max(0,m-Math.max(0,realized)):0;giveback+=gb;if(m>0)capture.push(realized/m);
    details.push({entryTimestamp:x.entryTimestamp,exitTimestamp:x.exitTimestamp,direction:x.direction,entryPrice:ep,exitPrice:xp,
      pnlLevPct:round(p),exitKind:x.exitKind,mfeUsd:round(m,1),maeUsd:round(a,1),realizedUsd:round(realized,1),
      mfeCapture:round(m>0?realized/m:null,3),mfeGivebackUsd:round(gb,1),exitReason:x.exitReason});
  }
  const pf=grossLoss<0?grossWin/Math.abs(grossLoss):null;
  return {enteredCount:entered.length,exitedCount:exited.length,pnlLevPct:round(pnl),wins:exited.filter(x=>Number(x.pnlPercentLeveraged)>0).length,
    losses:exited.filter(x=>Number(x.pnlPercentLeveraged)<0).length,grossWinLevPct:round(grossWin),grossLossLevPct:round(grossLoss),profitFactor:round(pf),
    mfeUsd:round(mfe,1),maeUsd:round(mae,1),mfeGivebackUsd:round(giveback,1),medianCapture:round(capture.length?capture.sort((a,b)=>a-b)[Math.floor(capture.length/2)]:null,3),details};
}

function stateSummary(rows,start,end){
  const num={
    price:numericSummary(rows,e=>e.price),
    lbw15:numericSummary(rows,e=>get(e,'wave.current.lbw')),
    bw15:numericSummary(rows,e=>get(e,'wave.current.bw')),
    mf15:numericSummary(rows,e=>get(e,'wave.current.moneyFlow')),
    lbw3:numericSummary(rows,e=>get(e,'wave.nested3m.current.lbw')),
    bw3:numericSummary(rows,e=>get(e,'wave.nested3m.current.bw')),
    mf3:numericSummary(rows,e=>get(e,'wave.nested3m.current.moneyFlow')),
    slopeLbw3:numericSummary(rows,e=>get(e,'wave.nested3m.slopeLbw')),
    dominanceProof:numericSummary(rows,e=>get(e,'dominance.proofScore')),
    retainedFraction:numericSummary(rows,e=>get(e,'dominance.retainedFraction')),
    currentYield:numericSummary(rows,e=>get(e,'dominance.current.yield')),
    cadence:numericSummary(rows,e=>get(e,'ticker.cadence')),
    volumeWindowBtc:numericSummary(rows,e=>get(e,'ticker.volumeFenetreBtc')),
    winSec:numericSummary(rows,e=>get(e,'ticker.winSec')),
    priceMove:numericSummary(rows,e=>get(e,'ticker.priceMove')),
    respirationCounterUsd:numericSummary(rows,e=>get(e,'risk.respiration.currentCounterExcursionUsd')),
    ma200_3m_distance:numericSummary(rows,e=>get(e,'shadow.ma200.byTf.3m.current.distanceUsd')),
    ma200_15m_distance:numericSummary(rows,e=>get(e,'shadow.ma200.byTf.15m.current.distanceUsd')),
  };
  const cat={
    phase15:categoricalSummary(rows,e=>get(e,'wave.phase'),start,end),
    direction15:categoricalSummary(rows,e=>get(e,'wave.direction'),start,end),
    phase3:categoricalSummary(rows,e=>get(e,'wave.nested3m.phase'),start,end),
    regime:categoricalSummary(rows,e=>get(e,'regime.state'),start,end),
    dominance:categoricalSummary(rows,combinedDom,start,end),
    where:categoricalSummary(rows,e=>get(e,'where.status'),start,end),
    reversal:categoricalSummary(rows,e=>get(e,'reversal.status'),start,end),
    action:categoricalSummary(rows,combinedAction,start,end),
    respiration:categoricalSummary(rows,e=>get(e,'risk.respiration.currentState'),start,end),
    entryAllowed:categoricalSummary(rows,e=>String(!!get(e,'risk.entryAllowed')),start,end),
  };
  return {numeric:num,categorical:cat};
}

function summarizeShadows(rows,start,end){
  const first=rows.find(e=>e.shadow)||null,last=[...rows].reverse().find(e=>e.shadow)||null;
  const maRows=rows.filter(e=>get(e,'shadow.ma200.version'));
  const ma200={available:maRows.length>0,byTf:{}};
  for(const tf of ['3m','15m','1h','4h','1d']){
    if(!maRows.length)break;
    ma200.byTf[tf]={
      distanceUsd:numericSummary(maRows,e=>get(e,`shadow.ma200.byTf.${tf}.current.distanceUsd`)),
      side:categoricalSummary(maRows,e=>get(e,`shadow.ma200.byTf.${tf}.current.strictSide`),start,end),
      interaction:categoricalSummary(maRows,e=>String(!!get(e,`shadow.ma200.byTf.${tf}.current.interaction`)),start,end),
      sourceEra:get(maRows[maRows.length-1],`shadow.ma200.byTf.${tf}.current.maSourceEra`),
      lastCross:get(maRows[maRows.length-1],`shadow.ma200.byTf.${tf}.campaign.lastCross`),
      lastHoldSupport:get(maRows[maRows.length-1],`shadow.ma200.byTf.${tf}.campaign.lastHoldSupport`),
      lastHoldResistance:get(maRows[maRows.length-1],`shadow.ma200.byTf.${tf}.campaign.lastHoldResistance`),
    };
  }
  if(maRows.length)ma200.synthesis=get(maRows[maRows.length-1],'shadow.ma200.synthesis');
  const lineRows=rows.filter(e=>get(e,'shadow.lineage.version'));
  const lineage={available:lineRows.length>0};
  if(lineRows.length){
    const a=lineRows[0],z=lineRows[lineRows.length-1];
    lineage.movementEntry=get(a,'shadow.lineage.movementCandidate');lineage.movementExit=get(z,'shadow.lineage.movementCandidate');
    lineage.activeCount=n(get(z,'shadow.lineage.divergences.activeCount'));lineage.historicalCount=n(get(z,'shadow.lineage.divergences.historicalCount'));
    lineage.active=get(z,'shadow.lineage.divergences.active')||[];lineage.transition=get(z,'shadow.lineage.transitionEvidence');
  }
  const trancheRows=rows.filter(e=>get(e,'shadow.tranches'));
  const tranches={available:trancheRows.length>0,last:trancheRows.length?get(trancheRows[trancheRows.length-1],'shadow.tranches'):null};
  return {ma200,lineage,tranches};
}

function significantChanges(rows,start,end,trades,shadows){
  const out=[];
  const add=(ts,type,text,importance='MEDIUM')=>out.push({ts,type,importance,text});
  function transitions(path,label){
    let prev=null;
    for(const e of rows){const v=get(e,path),t=evalTs(e);if(v==null)continue;if(prev&&prev.v!==String(v))add(new Date(t).toISOString(),label,`${prev.v} → ${v}`);prev={v:String(v),t};}
  }
  transitions('wave.phase','WAVE15_PHASE');
  transitions('wave.nested3m.phase','WAVE3_PHASE');
  transitions('regime.state','REGIME');
  let lastPersistentDirection=null;
  for(const e of rows){
    const d=e.dominance||{},t=evalTs(e);
    if(d.state!=='DOMINATION_PERSISTANTE'||!['long','short'].includes(d.direction))continue;
    if(lastPersistentDirection&&d.direction!==lastPersistentDirection){
      const proof=Number(d.proofScore)||0,ret=Number(d.retainedFraction)||0;
      const importance=proof>=.70&&ret>=.80?'HIGH':'MEDIUM';
      add(new Date(t).toISOString(),'POWER_TRANSFER',`${lastPersistentDirection} → ${d.direction} | proof ${round(proof,2)} | retained ${round(ret,2)}`,importance);
    }
    lastPersistentDirection=d.direction;
  }
  let prevOrigin=null;
  for(const e of rows){const o=get(e,'wave.origin');if(!o||!finite(o.ts))continue;if(prevOrigin&&Number(prevOrigin.ts)!==Number(o.ts))add(new Date(evalTs(e)).toISOString(),'E15_ORIGIN_CHANGE',`${prevOrigin.type}@${prevOrigin.timestamp} → ${o.type}@${o.timestamp}`,'HIGH');prevOrigin=o;}
  let pr=null;
  for(const e of rows){const r=get(e,'reversal.status');if(r&&r!==pr&&r!=='NONE')add(new Date(evalTs(e)).toISOString(),'REVERSAL',String(r),'HIGH');pr=r;}
  for(const t of trades.details){add(t.exitTimestamp,'TRADE_EXIT',`${t.direction} ${t.pnlLevPct>=0?'+':''}${t.pnlLevPct}% lev | ${t.exitKind} | MFE ${t.mfeUsd}$ / giveback ${t.mfeGivebackUsd}$`,Math.abs(t.pnlLevPct)>=.5?'HIGH':'MEDIUM');}
  if(shadows.ma200.available){
    for(const tf of ['3m','15m']){const x=shadows.ma200.byTf[tf],c=x&&x.lastCross;if(c&&finite(c.ts)&&c.ts>=start&&c.ts<end)add(new Date(c.ts).toISOString(),'MA200_CROSS',`${tf} ${c.event} @ ${round(c.ma200,1)}`,'HIGH');}
  }
  return out.sort((a,b)=>Date.parse(a.ts)-Date.parse(b.ts));
}

function gateStats(rows){
  const m=new Map();
  for(const e of rows){if(get(e,'risk.entryAllowed'))continue;const reason=get(e,'risk.reason');if(!reason)continue;for(const part of String(reason).split(';').map(x=>x.trim()).filter(Boolean))m.set(part,(m.get(part)||0)+1);}
  return [...m.entries()].map(([reason,count])=>({reason,count})).sort((a,b)=>b.count-a.count).slice(0,8);
}
function deepDiveTriggers(changes,trades){
  const high=changes.filter(x=>x.importance==='HIGH');
  for(const t of trades.details){if(t.mfeUsd>=50&&t.mfeGivebackUsd>=Math.max(25,t.mfeUsd*.5))high.push({ts:t.exitTimestamp,type:'MFE_GIVEBACK',importance:'HIGH',text:`${t.direction}: MFE ${t.mfeUsd}$, rendu ${t.mfeGivebackUsd}$`});}
  const dedup=[];const seen=new Set();for(const x of high){const k=`${x.ts}|${x.type}|${x.text}`;if(!seen.has(k)){seen.add(k);dedup.push(x);}}
  return {required:dedup.length>0,triggers:dedup.slice(0,12)};
}

function forecastContext(start,end){
  const rows=readNdjson(FORECAST_PATH);
  const forecasts=rows.filter(x=>x.kind==='FORECAST'&&finite(parseIso(x.createdAt))&&parseIso(x.createdAt)<=start).sort((a,b)=>parseIso(a.createdAt)-parseIso(b.createdAt));
  const assessments=rows.filter(x=>x.kind==='ASSESSMENT');
  const prev=forecasts.length?forecasts[forecasts.length-1]:null;
  const assessed=prev?assessments.find(x=>x.forecastId===prev.id):null;
  return {previousForecast:prev,existingAssessment:assessed||null,status:prev?(assessed?'ASSESSED':'REQUIRES_ASSESSMENT'):'NO_PREVIOUS_FORECAST'};
}

function buildHourlyReport(start,end){
  if(!finite(start)||!finite(end)||end<=start)throw new Error('invalid window');
  const all=readNdjsonSince(EVAL_PATH,start),rows=rowsBetween(all,start,end);
  const state=stateSummary(rows,start,end),trades=summarizeTrades(start,end),shadows=summarizeShadows(rows,start,end);
  const changes=significantChanges(rows,start,end,trades,shadows),gates=gateStats(rows);
  return {
    version:'mw-hourly-v0.1',generatedAt:new Date().toISOString(),window:{start:new Date(start).toISOString(),end:new Date(end).toISOString(),durationMinutes:(end-start)/60000,evaluationCount:rows.length},
    contract:{numeric:'entry / time-sampled average / exit (+min/max for causal extrema)',categorical:'entry / time-weighted occupancy / exit / transitions',epistemicLabels:['DÉMONTRÉ','FALSIFIÉ','AMBIGU','ARTEFACT LOGIQUE','DONNÉES INSUFFISANTES']},
    topDown:topDownAt(end),state,trades,shadows,changes,refusalGates:gates,deepDive:deepDiveTriggers(changes,trades),forecast:forecastContext(start,end),
    commentarySlots:{globalContext:null,hourSynthesis:null,boonoAssessment:null,shadowAssessment:null,previousForecastAssessment:null,next1hForecast:null,next1to3hForecast:null},
    note:'raw hourly evidence only; commentary/forecast must remain short, causal and falsifiable. Forecast requires observable validation + invalidation conditions.'
  };
}

function validateHorizon(h,name){
  if(!h||typeof h.thesis!=='string'||!h.thesis.trim())throw new Error(`${name}: thesis required`);
  if(!Array.isArray(h.validation)||!h.validation.length)throw new Error(`${name}: at least one observable validation condition required`);
  if(!Array.isArray(h.invalidation)||!h.invalidation.length)throw new Error(`${name}: at least one observable invalidation condition required`);
  return true;
}
function appendForecast(f){
  validateHorizon(f.horizon1h,'horizon1h');validateHorizon(f.horizon1to3h,'horizon1to3h');
  const rec={kind:'FORECAST',id:f.id||`mwf-${Date.now()}`,createdAt:f.createdAt||new Date().toISOString(),
    sourceWindow:f.sourceWindow||null,horizon1h:f.horizon1h,horizon1to3h:f.horizon1to3h,
    rule:'each horizon is frozen with thesis + observable validation + observable invalidation conditions'};
  fs.appendFileSync(FORECAST_PATH,JSON.stringify(rec)+'\n');return rec;
}
function appendAssessment(a){
  const allowed=['DÉMONTRÉ','FALSIFIÉ','AMBIGU','ARTEFACT LOGIQUE','DONNÉES INSUFFISANTES'];
  if(!allowed.includes(a.label))throw new Error('invalid epistemic label');
  const rec={kind:'ASSESSMENT',forecastId:a.forecastId,createdAt:a.createdAt||new Date().toISOString(),label:a.label,evidence:a.evidence||[],comment:a.comment||null};
  fs.appendFileSync(FORECAST_PATH,JSON.stringify(rec)+'\n');return rec;
}


function fmtNum(x,d=1){return finite(x)?Number(x).toFixed(d):'—';}
function occ(x){return x&&x.occupancy&&x.occupancy.length?x.occupancy.slice(0,3).map(v=>`${v.state} ${v.pct}%`).join(' · '):'—';}
function renderEvidenceBrief(r){
  const n=r.state.numeric,c=r.state.categorical,t=r.trades,s=r.shadows;
  const lines=[];
  lines.push(`# MW ${r.window.start} → ${r.window.end}`);
  lines.push(`Prix: ${fmtNum(n.price&&n.price.entry)} → moy ${fmtNum(n.price&&n.price.avg)} → ${fmtNum(n.price&&n.price.exit)} | Δ ${fmtNum(n.price&&n.price.delta)}$ | range ${fmtNum(n.price&&n.price.min)}–${fmtNum(n.price&&n.price.max)}`);
  lines.push(`15m: ${occ(c.phase15)} | 3m: ${occ(c.phase3)} | Régime: ${occ(c.regime)}`);
  lines.push(`Dominance: ${occ(c.dominance)} | Action: ${occ(c.action)} | Respiration: ${occ(c.respiration)}`);
  lines.push(`LBW15 ${fmtNum(n.lbw15&&n.lbw15.entry)} → ${fmtNum(n.lbw15&&n.lbw15.avg)} → ${fmtNum(n.lbw15&&n.lbw15.exit)} | LBW3 ${fmtNum(n.lbw3&&n.lbw3.entry)} → ${fmtNum(n.lbw3&&n.lbw3.avg)} → ${fmtNum(n.lbw3&&n.lbw3.exit)}`);
  lines.push(`BOONO: ${t.exitedCount} sorties, ${t.pnlLevPct>=0?'+':''}${fmtNum(t.pnlLevPct,3)}% lev | MFE ${fmtNum(t.mfeUsd)}$ | MAE ${fmtNum(t.maeUsd)}$ | rendu MFE ${fmtNum(t.mfeGivebackUsd)}$`);
  if(s.ma200.available){const a=s.ma200.byTf['3m'],b=s.ma200.byTf['15m'];lines.push(`MA200: 3m ${a&&a.side?occ(a.side):'—'} | 15m ${b&&b.side?occ(b.side):'—'} | maturation=${String(!!get(s,'ma200.synthesis.observations.reversalMaturationCandidate'))}`);}
  if(s.lineage.available)lines.push(`Lineage: mouvement ${get(s,'lineage.movementExit.direction')||'—'} | div actives ${s.lineage.activeCount??'—'} | powerTransferConfirmed=${String(!!get(s,'lineage.transition.powerTransferConfirmed'))}`);
  lines.push(`Deep dive: ${r.deepDive.required?'OUI':'non'}${r.deepDive.required?' — '+r.deepDive.triggers.slice(0,5).map(x=>x.type).join(', '):''}`);
  lines.push(`Prévision précédente: ${r.forecast.status}`);
  return lines.join('\n');
}

module.exports={buildHourlyReport,numericSummary,categoricalSummary,summarizeTrades,summarizeShadows,appendForecast,appendAssessment,renderEvidenceBrief,validateHorizon};
