'use strict';
// BOONO Watch / V494 ticker: observation ONLY. Global traded BTC volume
// from OKX 1-minute CLOSED market candles, instrument BTC-USDT-SWAP.
// This does NOT reclassify the historical Elastic quality percentages.
const SOURCE='OKX_BTC_USDT_SWAP_CLOSED_1M_VOLCCY';
const URL='https://www.okx.com/api/v5/market/candles?instId=BTC-USDT-SWAP&bar=1m&limit=100';
const MINUTE=60000,QUARTER=15*MINUTE;
// The same fixed, logarithmic 3m TOTAL executed-BTC thresholds used by
// BOONO Watch's ten volume pastilles in elastic-mini-conversion-v542.js.
// 0/10 active = 0%, 7/10 active = 70%, 10/10 = 100%.
// This is a graph-intensity level, NOT a 24h relative-volume percentile.
const VOLUME_3M_THRESHOLDS_BTC=Object.freeze([1,2,5,10,20,50,100,200,500,1000]);
const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const r=(x,d=3)=>finite(x)?Math.round(Number(x)*10**d)/10**d:null;
const graphIntensityPct=btc=>
 finite(btc)&&Number(btc)>=0?
 VOLUME_3M_THRESHOLDS_BTC.filter(threshold=>Number(btc)>=threshold).length*10:null;


function parseResponse(payload){
 if(!payload||payload.code!=='0'||!Array.isArray(payload.data))
  throw Error('OKX_CANDLES_BAD_RESPONSE');
 const byMinute=new Map();
 for(const row of payload.data){
  if(!Array.isArray(row)||row.length<9||String(row[8])!=='1')continue;
  const at=Number(row[0]),volCcy=Number(row[6]);
  if(!finite(row[6])||!Number.isSafeInteger(at)||at<=0||at%MINUTE!==0||
     !Number.isFinite(volCcy)||volCcy<0)continue;
  // On BTC-USDT-SWAP, vol (index 5) is contracts and volCcy
  // (index 6) is executed BTC. Never sum vol or volCcyQuote.
  byMinute.set(at,{at,btc:volCcy});
 }
 return [...byMinute.values()].sort((a,b)=>a.at-b.at);
}
function reconcile(windows,minutes,asOf,{fetchedAt=null,sourceStatus='OK'}={}){
 const at=finite(asOf)?Number(asOf):null;
 if(at===null||at<=0)return [];
 const m=new Map((minutes||[]).map(x=>[Number(x.at),Number(x.btc)]));
 return (windows||[]).slice(-4).map(w=>{
  const start=finite(w.startAt)?Number(w.startAt):null;
  if(start===null||start%QUARTER!==0||start>at)
   return {startAt:start,status:'INVALID_OR_FUTURE_WINDOW',source:SOURCE,
     meanBtcPerMinute:null,observedMinutes:0,expectedMinutes:0};
  // Match the exact as-of chronology. A 1m volume is accepted ONLY after
  // its confirmed candle has ended, not during the unfinished minute.
  const elapsed=Math.min(QUARTER,Math.max(0,at-start));
  const expected=Math.max(0,Math.min(15,Math.floor(elapsed/MINUTE)));
  let observed=0,total=0,intensityObserved=0,intensitySum=0;
  for(let i=0;i<expected;i++){
   const atMinute=start+i*MINUTE,value=m.get(atMinute);
   if(Number.isFinite(value)&&value>=0){total+=value;observed++;}
   // At the end of each CLOSED 1m bar, reconstruct exactly the 3m
   // total-BTC concept of the graph from three distinct, closed OKX 1m
   // bars. This uses the graph's same 10 thresholds, but minute-granular
   // historical observations; do not pretend it reproduces intra-minute
   // trades or extrapolate across missing minute bars.
   const prev1=m.get(atMinute-MINUTE),prev2=m.get(atMinute-2*MINUTE);
   if(![prev2,prev1,value].every(v=>Number.isFinite(v)&&v>=0))continue;
   const intensity=graphIntensityPct(prev2+prev1+value);
   if(intensity===null)continue;
   intensitySum+=intensity;
   intensityObserved++;
  }
  const coverage=expected>0?observed/expected:null;
  const complete=expected>0&&observed===expected;
  const intensityComplete=expected>0&&intensityObserved===expected;
  const fullyClosed=at>=start+QUARTER;
  const status=expected===0?'WAIT_CONFIRMED_1M':
    observed===0?'NO_1M_COVERAGE':
    complete?'COVERED':'PARTIAL_1M_COVERAGE';
  return {startAt:start,throughAt:start+elapsed,
   meanBtcPerMinute:complete?r(total/expected):null,
   // Mean over 15 (or elapsed partial-window) one-minute samples of the
   // GRAPH'S 3m volume-pastille intensity, 0..100. Missing trailing
   // 3m inputs invalidate the percentage instead of silently biasing it.
   meanGraphVolumePct:intensityComplete?r(intensitySum/expected,1):null,
   intensityObservedMinutes:intensityObserved,
   intensityExpectedMinutes:expected,
   intensityCoverageFraction:expected?r(intensityObserved/expected):null,
   intensityBasis:'SAME_GRAPH_3M_PASTILLE_THRESHOLDS_MEAN_1M_SAMPLES',
   totalBtcObserved:observed?r(total):null,
   observedMinutes:observed,expectedMinutes:expected,
   coverageFraction:coverage===null?null:r(coverage),
   completed15Minutes:fullyClosed&&expected===15,
   status,sourceStatus,fetchedAt,
   source:SOURCE,instrument:'BTC-USDT-SWAP',unit:'BTC/min',
   authority:'SHADOW_READ_ONLY',
   note:'Minutes are unique and confirmed, bounded by V494 asOf. Volume % reproduces graph thresholds on closed 3x1m BTC totals, time-averaged over the slot; intra-minute live tick values may differ.'};
 });
}
function createProvider({request=globalThis.fetch,clock=()=>Date.now(),ttlMs=45000}={}){
 let last={fetchedAt:0,minutes:[]},pending=null,lastError=null;
 async function refresh(){
  if(typeof request!=='function')throw Error('NO_OKX_FETCH');
  const controller=new AbortController();
  const limit=setTimeout(()=>controller.abort(),4500);
  try{
   const response=await request(URL,{method:'GET',signal:controller.signal,
     headers:{'Accept':'application/json'}});
   if(!response.ok)throw Error('OKX_HTTP_'+response.status);
   const parsed=parseResponse(await response.json());
   if(parsed.length<40)throw Error('OKX_1M_COVERAGE_TOO_SHORT');
   last={fetchedAt:clock(),minutes:parsed};
   lastError=null;
   return last;
  }finally{clearTimeout(limit);}
 }
 async function get(windows,asOf){
  const now=clock();
  if(!last.fetchedAt||now-last.fetchedAt>ttlMs){
   if(!pending)pending=refresh().catch(err=>{
    lastError=String(err.message||err).slice(0,95);return null;
   }).finally(()=>{pending=null;});
   await pending;
  }
  const age=last.fetchedAt?clock()-last.fetchedAt:Infinity;
  const usable=age<=240000;
  const sourceStatus=!usable?'UNAVAILABLE':
    lastError||age>2*ttlMs?'STALE':'OK';
  const payload=reconcile(windows,usable?last.minutes:[],asOf,
   {fetchedAt:last.fetchedAt||null,sourceStatus});
  return {status:sourceStatus,source:SOURCE,
    decisionImpact:false,brokerOrdersEnabled:false,
    updatedAt:last.fetchedAt||null,
    error:lastError,windows:payload};
 }
 return {get};
}
module.exports={SOURCE,URL,VOLUME_3M_THRESHOLDS_BTC,graphIntensityPct,parseResponse,reconcile,createProvider};

