'use strict';
// Amsterdam independent structural-place shadow: confirmed E1/E4 + manual range
// snapshots + market productivity. Observation only; no PAPER/broker/TV writer.
const fs=require('node:fs'),path=require('node:path');
const m=require('./boonolab-place-e1e4-shadow');
const {appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const CSV=path.resolve(ROOT,'../data/mcb-live');
const FILE={
 paper:path.join(DATA,'v52-paper-state.json'),
 levels:path.join(DATA,'levels.json'),
 observer:path.join(DATA,'boonolab-market-observer-summary.json'),
 marketSamples:path.join(DATA,'boonolab-market-snapshots.ndjson'),
 state:path.join(DATA,'boonolab-place-e1e4-shadow-state.json'),
 summary:path.join(DATA,'boonolab-place-e1e4-shadow-summary.json'),
 events:path.join(DATA,'boonolab-place-e1e4-shadow-events.ndjson'),
};
const json=(p,fallback=null)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}
 catch(e){if(e.code==='ENOENT')return fallback;throw e;}};
const atomic=(p,x)=>{const tmp=p+'.tmp-'+process.pid;fs.writeFileSync(tmp,JSON.stringify(x));fs.renameSync(tmp,p);};
const n=x=>x===null||x===undefined||x===''?null:
 Number.isFinite(Number(x))?Number(x):null;
function marketAt(entryAt){
 // At an admission this picks the actual previous observed regime.
 // The continuously updated summary may already be after entry (future).
 const text=fs.readFileSync(FILE.marketSamples,'utf8');
 let best=null;
 for(const line of text.split('\n')){
  if(!line)continue;
  try{
   const a=JSON.parse(line);
   if(n(a.asOf)!==null&&a.asOf<=entryAt&&entryAt-a.asOf<=95000&&
      (!best||a.asOf>best.asOf))best=a;
  }catch(_){}
 }
 return best?{asOf:best.asOf,label:best.regimeLabel,
  intensity:best.intensity,productivity:best.productivity,
  metrics:{lastHour:best.regimeMetrics||null},twoHour:best.twoHour||null}:null;
}
function levelsAt(at){
 const st=fs.statSync(FILE.levels);
 return {data:JSON.parse(fs.readFileSync(FILE.levels,'utf8')),
   mtime:Math.round(st.mtimeMs),available:st.mtimeMs<=at};
}
function dataAt(){
 const paper=json(FILE.paper),regime=json(FILE.observer,{});
 if(!paper||paper.mode!=='PAPER_ONLY'||paper.brokerOrdersEnabled!==false||
    !String(paper.version||'').startsWith('v5.4.3'))
  throw Error('PLACE_SHADOW_REFUSE_NON_V543_PAPER');
 const asOf=n(paper.lastObservationAt);
 if(asOf===null||asOf<=0||Date.now()-asOf>95000||
    Number(paper.latestAnalysis?.asOf)!==asOf)
  throw Error('PLACE_SHADOW_REFUSE_STALE_OR_DESYNCHRONIZED_PAPER');
 const e1=m.parseMcbCsv(fs.readFileSync(path.join(CSV,'mcb_1h.csv'),'utf8'),'1h');
 const e4=m.parseMcbCsv(fs.readFileSync(path.join(CSV,'mcb_4h.csv'),'utf8'),'4h');
 const levels=levelsAt(asOf);
 const latest=regime?.regime||null;
 return {paper,asOf,e1,e4,levels,
  regime:latest&&latest.asOf<=asOf&&asOf-latest.asOf<=95000?latest:null};
}
function inspectAt(x,at,price,direction,phase,market,position=null){
 return m.inspect({at,price,direction,phase,bars1h:x.e1,bars4h:x.e4,
  levels:x.levels.data,levelsMtime:x.levels.mtime,
  regime:market,position});
}
function initial(x){
 return {version:m.VERSION,mode:'SHADOW_ONLY',brokerOrdersEnabled:false,
  decisionImpact:false,startedAt:Date.now(),asOf:0,observations:0,
  lastLevelsMtime:null,lastRegime:null,latest:null,
  lastPositionEntryAt:n(x.paper.position?.entryAt),
  closedTradeNo:Number(x.paper.completed)||0,
  admissionRecords:[],closedRecords:[],events:[]};
}
function emit(state,e){
 const row={...e,version:m.VERSION,decisionImpact:false,
   brokerOrdersEnabled:false};
 appendRotatingNdjson(FILE.events,row,{maxBytes:4*1024*1024,maxSegments:12});
 state.events.push(row);state.events=state.events.slice(-25);
}
function slim(v){
 const s={tradeNo:v.tradeNo,entryAt:v.entryAt,seenAt:v.seenAt,
  direction:v.direction,phase:v.phase,campaignId:v.campaignId,
  alignment:v.alignment,e1:v.e1,e4:v.e4,place:v.place,
  market:v.market,proposal:v.proposedAdmission,
  riskFlags:v.riskFlags||[],observedProspectively:v.observedProspectively};
 return s;
}
function advance(state,x){
 if(state.version!==m.VERSION||state.brokerOrdersEnabled!==false||
    state.decisionImpact!==false)throw Error('PLACE_SHADOW_STATE_INVALID');
 if(x.asOf<=state.asOf)return false;
 const {paper,asOf}=x,p=paper.position||null,d=paper.latestAnalysis;
 const dir=p?.direction||d.candidate;
 if(!['long','short'].includes(dir))return false;
 const current=inspectAt(x,asOf,n(d.price),dir,p?.entryContext?.phase||d.phase,x.regime,p);
 if(current.status!=='ASOF_OBSERVED')return false;
 if(x.levels.mtime!==state.lastLevelsMtime){
  emit(state,{at:asOf,type:'LEVELS_SNAPSHOT_VERSION',sourceMtime:x.levels.mtime,
   big:current.place.big,daily:current.place.daily,
   caveat:'Stored level change time; no inference for older manual ranges'});
  state.lastLevelsMtime=x.levels.mtime;
 }
 if(current.market.review!==state.lastRegime){
  emit(state,{at:asOf,type:'MARKET_REVIEW_TRANSITION',from:state.lastRegime,
    to:current.market.review,regime:current.market.label});
  state.lastRegime=current.market.review;
 }
 if(p&&n(p.entryAt)!==state.lastPositionEntryAt){
  // Use entry-price and event availability at the TRUE admission time.
  const entryAt=Number(p.entryAt),entry=inspectAt(x,entryAt,Number(p.entryPrice),
   p.direction,p.entryContext?.phase||d.phase,marketAt(entryAt),p);
  const tradeNo=(paper.completed||0)+1;
  const row=slim({...entry,tradeNo,entryAt,seenAt:asOf,
   campaignId:p.campaignId||null,observedProspectively:true});
  state.admissionRecords.push(row);
  emit(state,{at:asOf,type:'PAPER_ADMISSION_ASOF_CAPTURED',...row});
  state.lastPositionEntryAt=entryAt;
 }
 if(Number(paper.completed)>state.closedTradeNo){
  for(const t of paper.history||[]){
   if(t.tradeNo<=state.closedTradeNo||t.tradeNo>paper.completed)continue;
   const prior=state.admissionRecords.find(y=>y.tradeNo===t.tradeNo);
   const entry=prior||slim({...inspectAt(x,t.entryAt,t.entryPrice,t.direction,
     t.entryContext?.phase||null,marketAt(t.entryAt)),tradeNo:t.tradeNo,
     entryAt:t.entryAt,seenAt:asOf,
     campaignId:t.entryContext?.causalChain?.campaignId||null,
     observedProspectively:false});
   const result={...entry,exitAt:t.exitAt,netUsd:t.netPnlUsd,
    feesUsd:t.feesUsd,mfePriceUsd:t.mfePriceUsd,
    noVirtualExecution:true};
   state.closedRecords.push(result);
   emit(state,{at:asOf,type:'PAPER_CLOSED_ASOF_MATCH',...result});
  }
  state.closedTradeNo=Number(paper.completed);
 }
 state.asOf=asOf;state.observations++;
 state.latest={...current,sourceAt:asOf};
 state.admissionRecords=state.admissionRecords.slice(-120);
 state.closedRecords=state.closedRecords.slice(-150);
 return true;
}
function summary(state){
 const closed=state.closedRecords;
 const count=values=>({
  trades:values.length,wins:values.filter(x=>Number(x.netUsd)>0).length,
  baselineNetUsd:Math.round(values.reduce((s,x)=>s+Number(x.netUsd||0),0)*100)/100});
 const groups={};
 for(const k of ['BOTH_ALIGN','E1_ONLY','E4_ONLY','BOTH_OPPOSE','INCOMPLETE'])
  groups[k]=count(closed.filter(x=>x.alignment===k));
 return {version:m.VERSION,asOf:state.asOf,mode:'SHADOW_ONLY',
  observations:state.observations,decisionImpact:false,
  brokerOrdersEnabled:false,latest:state.latest,
  recentAdmissions:state.admissionRecords.slice(-12),
  historicalMatchedClosures:count(closed),byAlignment:groups,
  lastEvents:state.events.slice(-8),
  caveats:['No paper policy or broker action','No causal claim about E1/E4 correlation',
    'E1/E4 availability is bar-close proxy, actual first observed unverified',
    'Manual VAH/POC/VAL are price location proxies, not L2 order-book liquidity',
    'Range levels are present only when source mtime is at or before as-of',
    'Market regime is non-validated shadow. Never blanket veto DENSE_CONTRADICTOIRE',
    'Closed trades here are baseline results; no counterfactual fills or P&L']};
}
function once({test=false}={}){
 const x=dataAt(),s=test?initial(x):json(FILE.state,null)||initial(x);
 const did=advance(s,x);
 if(test){console.log(JSON.stringify({mode:'TEST_READ',did,summary:summary(s)},null,2));return;}
 if(did){atomic(FILE.state,s);atomic(FILE.summary,summary(s));}
}
function main(){
 if(process.argv.includes('--test-read'))return once({test:true});
 if(process.argv.includes('--once'))return once();
 let busy=false,errors=0;
 const loop=()=>{
  if(busy)return;busy=true;
  try{once();errors=0;}catch(e){
   if(++errors<=6||errors%20===0)console.error('[PLACE E1E4 SHADOW] '+(e.stack||e));
  }finally{busy=false;}
 };
 console.log('[PLACE E1E4 SHADOW] Started, read-only, no PAPER authority');
 loop();setInterval(loop,10000);
}
if(require.main===module)main();
module.exports={dataAt,inspectAt,marketAt,levelsAt,advance,initial,summary};
