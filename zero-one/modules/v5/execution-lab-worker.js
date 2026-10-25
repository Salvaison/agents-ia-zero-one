'use strict';
// BOONO EXECUTION LAB: OBSERVATION ONLY, NEVER PLACE AN ORDER.
// Uses one public WS books5 BTC X-Perp and V5.3.1 PAPER trade-event journal.
// Does not import broker APIs, credentials, order-senders, or strategy modules.
const fs=require('fs'),path=require('path'),WebSocket=require('ws');
const model=require('./execution-lab-model');
const {readRecentNdjson,appendRotatingNdjson}=require('../v3lab/storage/rotating-ndjson');
function recentActiveTradeEvents(file,maxBytes=384*1024){
 // Avoid parsing multi-MB active decision journals every second. Only
 // fresh trade events are actionable; restart gaps must NOT fabricate fills.
 let fd;try{
  const st=fs.statSync(file),len=Math.min(st.size,maxBytes);
  if(len===0)return [];
  fd=fs.openSync(file,'r');const buf=Buffer.allocUnsafe(len);
  fs.readSync(fd,buf,0,len,st.size-len);
  const rows=buf.toString('utf8').split(/\r?\n/);
  if(len<st.size)rows.shift(); // first line may be truncated
  const result=[];
  for(const line of rows){
   if(!line)continue;
   try{const e=JSON.parse(line);if(e.tradeEvent)result.push(e);}catch(_){}
  }
  return result;
 }catch(_){return [];}finally{if(fd!==undefined)fs.closeSync(fd);}
}
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'data');
const EVENTS=path.join(DATA,'v52-paper-decisions.ndjson');
const LEDGER=path.join(DATA,'v52-paper-state.json');
const STATE=path.join(DATA,'v53-execution-lab-state.json');
const TRACE=path.join(DATA,'v53-execution-lab-events.ndjson');
const WS_URL='wss://ws.okx.com:8443/ws/v5/public';
const INSTRUMENT=model.INSTRUMENT;
const safe=(p,f)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(_){return f;}};
const round=x=>x===null||x===undefined?null:Math.round(x*10000)/10000;
const emit=(type,detail)=>appendRotatingNdjson(TRACE,{
  type,at:Date.now(),...detail,version:model.MODEL_VERSION,
  fundedOrders:false,modelOnly:true}, {maxBytes:2*1024*1024,maxSegments:5});
function initial(now=Date.now()){
 // No retroactive fills: begin on next genuinely new signal after boot.
 const history=readRecentNdjson(EVENTS,100).filter(x=>x.tradeEvent);
 const last=history.at(-1);
 const ledger=safe(LEDGER,null);
 return {
  version:model.MODEL_VERSION,mode:'PUBLIC_BOOK_PAPER_ONLY',
  fundedOrders:false,brokerOrdersEnabled:false,decisionImpact:false,
  instId:INSTRUMENT.instId,analyticInstId:'BTC-USDT-SWAP',
  startedAt:now,updatedAt:now,
  lastEventTs:last?.tradeEvent?.ts||now,
  lastEventKey:last?String(last.tradeEvent?.ts)+'|'+last.tradeEvent?.type:null,
  bootstrapStatus:ledger?.position?'SKIPPED_PREEXISTING_POSITION':'AWAIT_FRESH_SIGNAL',
  book:{status:'CONNECTING',lastTs:null,lastReceivedAt:null,bid:null,ask:null,
    spread:null,topBidContracts:null,topAskContracts:null},
  active:null,records:[],statistics:{
    signals:0,closed:0,modeBFull:0,modeBPartial:0,
    modeCFull:0,modeCPartial:0,modeCTriggered:0,
    expiredC:0,noQuoteB:0,noQuoteC:0,ignoredStaleEvents:0,
    matched3:0,matchedSumA:0,matchedSumB:0,matchedSumC:0
  }
 };
}
function start({listen=true}={}){
 let s=safe(STATE,null);
 if(!s||s.version!==model.MODEL_VERSION){
  s=initial();
  emit('LAB_STARTED',{note:'No historical fill claims; start after latest PAPER event'});
 }
 if(s.brokerOrdersEnabled!==false||s.fundedOrders!==false)
  throw Error('EXECUTION_LAB_NEVER_FUNDED');
 let ws=null,quote=null,saveAt=0,connectTimer=null,ping=null,stopped=false,busy=false;
 function persist(force=false){
  if(!force&&Date.now()-saveAt<1500)return;
  s.updatedAt=Date.now();
  s.book={
   status:quote&&model.validQuote(quote,Date.now())?'FRESH':
    ws?.readyState===WebSocket.OPEN?'STALE':'DISCONNECTED',
   lastTs:quote?.exchangeTs||null,lastReceivedAt:quote?.receivedAt||null,
   bid:quote?.bid||null,ask:quote?.ask||null,
   spread:quote?.spread??null,
   topBidContracts:quote?.topBidContracts??null,
   topAskContracts:quote?.topAskContracts??null
  };
  const tmp=STATE+'.tmp-'+process.pid;
  fs.writeFileSync(tmp,JSON.stringify(s));fs.renameSync(tmp,STATE);
  saveAt=Date.now();
 }
 function freshBook(){return model.validQuote(quote,Date.now())?quote:null;}
 function startWs(){
  if(stopped)return;
  try{
   ws=new WebSocket(WS_URL);
   ws.on('open',()=>{
    ws.send(JSON.stringify({op:'subscribe',args:[
      {channel:'books5',instId:INSTRUMENT.instId}
    ]}));
    if(ping)clearInterval(ping);
    ping=setInterval(()=>{if(ws?.readyState===WebSocket.OPEN)ws.send('ping');},20000);
    emit('BOOK_SOCKET_CONNECTED',{channel:'books5',instId:INSTRUMENT.instId});
   });
   ws.on('message',x=>{
    if(String(x)==='pong')return;
    let e;try{e=JSON.parse(String(x));}catch(_){return;}
    if(e.event==='error'){
     emit('BOOK_SUBSCRIPTION_ERROR',{code:e.code,msg:e.msg});
     return;
    }
    if(e.arg?.channel!=='books5'||e.arg?.instId!==INSTRUMENT.instId)return;
    const q=model.quote(e,Date.now());
    if(q)quote=q;
   });
   ws.on('error',e=>{console.error('[BOONO EXEC LAB] public WS',e.message);});
   ws.on('close',()=>{
    quote=null;
    if(ping)clearInterval(ping);
    if(!stopped){
     if(connectTimer)clearTimeout(connectTimer);
     connectTimer=setTimeout(startWs,3500);
    }
   });
  }catch(e){
   if(connectTimer)clearTimeout(connectTimer);
   connectTimer=setTimeout(startWs,3500);
  }
 }
 function baseInfo(evt,source){
  const inSide=evt.type==='ENTER_LONG'?'long':'short';
  const now=Date.now(),q=freshBook(),latency=now-evt.ts;
  const ma3=source.maContract?.ma3||{};
  const median=ma3.medianRangeUsd;
  const limits=model.bounds({q,median3mRangeUsd:median,
    priceRateUsdPerMin:source.maturity?.recent3mRateUsdPerMin});
  const qty=q?model.contracts(model.NOTIONAL_USD,q.mid):null;
  return {signalTs:evt.ts,signalPrice:evt.price,
   signalDirection:inSide,signalLatencyMs:latency,
   signalReason:source.reason,signalPhase:source.phase,
   signalQuality:source.maContract?.flowQuality?.grade||null,
   sourceTradingPolicy:source.policyVersion||null,
   quoteAtSignal:q?{bid:q.bid,ask:q.ask,mid:q.mid,ts:q.exchangeTs,
     receivedAt:q.receivedAt}:null,quoteStatus:q?'FRESH':'NO_BOOK',
   limits,contractsRequested:qty};
 }
 function entry(row){
  const evt=row.tradeEvent;
  if(s.active){
   emit('UNPAIRED_ENTRY',{signalTs:evt.ts,existing:s.active.signalTs});
   s.active.status='UNPAIRED_BY_NEW_SIGNAL';
   s.records.push(s.active);
   s.records=s.records.slice(-100);
  }
  const now=Date.now(),metadata=baseInfo(evt,row);
  s.statistics.signals++;
  const side=metadata.signalDirection==='long'?'buy':'sell';
  const q=freshBook(),age=now-evt.ts;
  const ok=age>=-3000&&age<=5000;
  const qty=metadata.contractsRequested;
  const modeB=ok&&q&&qty?model.simulateIOC({
   quote:q,side,quantityContracts:qty,
   offsetUsd:metadata.limits.offsetUsd,now}):
   {status:!ok?'STALE_DECISION_EVENT':q?'INVALID_SIZE':'NO_FRESH_BOOK'};
  if(modeB.status==='FULL')s.statistics.modeBFull++;
  if(modeB.status==='PARTIAL')s.statistics.modeBPartial++;
  if(modeB.status==='NO_FRESH_BOOK')s.statistics.noQuoteB++;
  const modeC=ok&&q&&qty?{
    status:'WAIT_TRIGGER',referenceMid:q.mid,
    referenceQuoteTs:q.exchangeTs,triggerDistanceUsd:metadata.limits.triggerUsd,
    cutoffAt:now+metadata.limits.maxTriggerWaitMs,
    contractsRequested:qty,entry:null,triggeredAt:null
  }:{status:!ok?'STALE_DECISION_EVENT':q?'INVALID_SIZE':'NO_FRESH_BOOK'};
  if(modeC.status==='NO_FRESH_BOOK')s.statistics.noQuoteC++;
  s.active={...metadata,modeB:{entry:modeB,exit:null,pnl:null},
    modeC,createdAt:now,status:'REFERENCE_OPEN',referenceNetUsd:null,
    comparisonResult:null,exitEvent:null,
    _latestPrice:evt.price};
  emit('ENTRY_SIGNAL',{signalTs:evt.ts,signalPrice:evt.price,
   latencyMs:age,direction:metadata.signalDirection,quantityContracts:qty,
   quote:metadata.quoteAtSignal,limits:metadata.limits,
   modeB:modeB.status,modeC:modeC.status,
   caution:'Book at LAB observation time, not fictitious quote at decision timestamp'});
  persist(true);
 }
 function processTrigger(){
  const a=s.active;if(!a||a.modeC?.status!=='WAIT_TRIGGER')return;
  const ledger=safe(LEDGER,null),now=Date.now(),q=freshBook(),c=a.modeC;
  if(!ledger?.position||ledger.position.entryAt!==a.signalTs){
   c.status='CANCELLED_ORIGINAL_POSITION_CLOSED';
  }else if(now>=c.cutoffAt){
   c.status='EXPIRED_60S';s.statistics.expiredC++;
  }else if(q){
   const progress=model.triggerStatus({direction:a.signalDirection,
    referenceMid:c.referenceMid,currentMid:q.mid,
    thresholdUsd:c.triggerDistanceUsd});
   if(progress.movementUsd<=-Math.max(15,c.triggerDistanceUsd*2.5)){
    c.status='CANCELLED_ADVERSE_MOVE';
   }else{
    const posDir=ledger.latestAnalysis?.readings?.mcb15?.currentOffensive;
    if(posDir&&posDir!==a.signalDirection&&
       ledger.latestAnalysis?.asOf>=a.signalTs)
      c.status='CANCELLED_OPPOSING_MCB15';
    else if(progress.status==='TRIGGERED'){
     const side=a.signalDirection==='long'?'buy':'sell';
     c.entry=model.simulateIOC({quote:q,side,
      quantityContracts:c.contractsRequested,
      offsetUsd:a.limits.offsetUsd,now});
     c.status=c.entry.status==='FULL'?'FILLED':
       c.entry.status==='PARTIAL'?'PARTIALLY_FILLED':'NO_FILL';
     c.triggeredAt=now;c.progressUsd=progress.movementUsd;
     s.statistics.modeCTriggered++;
     if(c.entry.status==='FULL')s.statistics.modeCFull++;
     if(c.entry.status==='PARTIAL')s.statistics.modeCPartial++;
    }
   }
  }
  if(c.status!=='WAIT_TRIGGER'){
   emit('MODE_C_RESOLVED',{signalTs:a.signalTs,status:c.status,
    triggeredAt:c.triggeredAt,limit:c.entry?.limitPx,entryPx:c.entry?.avgPx,
    completion:c.entry?.completion});
   persist(true);
  }
 }
 function closeModel(mode,entryFill,outSide,q,now,offset){
  if(!entryFill||!['FULL','PARTIAL'].includes(entryFill.status))
   return {exit:{status:'NO_ENTRY'},pnl:null};
  if(!q)return {exit:{status:'NO_FRESH_BOOK'},pnl:null};
  const exit=model.simulateIOC({quote:q,side:outSide,
   quantityContracts:entryFill.filledContracts,offsetUsd:offset,now});
  if(exit.status!=='FULL')return {exit,pnl:null};
  const pnl=model.netPnl({direction:s.active.signalDirection,
   quantityContracts:entryFill.filledContracts,
   entryPx:entryFill.avgPx,exitPx:exit.avgPx});
  return {exit,pnl};
 }
 function exit(row){
  const evt=row.tradeEvent,a=s.active,now=Date.now();
  if(!a){emit('UNPAIRED_EXIT',{signalTs:evt.ts,tradeNo:evt.tradeNo});return;}
  if(a.modeC?.status==='WAIT_TRIGGER'){
   a.modeC.status='CANCELLED_BY_REFERENCE_EXIT';
   emit('MODE_C_RESOLVED',{signalTs:a.signalTs,status:a.modeC.status});
  }
  const q=freshBook(),outSide=a.signalDirection==='long'?'sell':'buy';
  const modeB=closeModel('B',a.modeB.entry,outSide,q,now,a.limits.offsetUsd);
  const modeC=closeModel('C',a.modeC.entry,outSide,q,now,a.limits.offsetUsd);
  a.modeB={...a.modeB,...modeB};
  a.modeC={...a.modeC,exit:modeC.exit,pnl:modeC.pnl};
  a.referenceNetUsd=evt.netPnlUsd;
  a.exitEvent={ts:evt.ts,price:evt.price,reason:evt.reason,tradeNo:evt.tradeNo,
    processedAt:now,latencyMs:now-evt.ts};
  a.status='CLOSED';s.statistics.closed++;
  const comparable=!!(a.modeB.entry.status==='FULL'&&
    a.modeC.entry?.status==='FULL'&&
    a.modeB.exit?.status==='FULL'&&a.modeC.exit?.status==='FULL'&&
    a.modeB.pnl&&a.modeC.pnl);
  if(comparable){
   s.statistics.matched3++;
   s.statistics.matchedSumA=round(s.statistics.matchedSumA+evt.netPnlUsd);
   s.statistics.matchedSumB=round(s.statistics.matchedSumB+a.modeB.pnl.netUsd);
   s.statistics.matchedSumC=round(s.statistics.matchedSumC+a.modeC.pnl.netUsd);
  }
  a.comparisonResult=comparable?'ALL_3_COMPARABLE':'NOT_FULLY_COMPARABLE';
  emit('COMPARISON_CLOSED',{
   signalTs:a.signalTs,tradeNo:evt.tradeNo,direction:a.signalDirection,
   baselineA:{signalPrice:a.signalPrice,exitPrice:evt.price,netUsd:evt.netPnlUsd},
   B:{entry:a.modeB.entry.status,exit:a.modeB.exit.status,
     entryPrice:a.modeB.entry.avgPx,exitPrice:a.modeB.exit.avgPx,
     netUsd:a.modeB.pnl?.netUsd??null},
   C:{entry:a.modeC.status,exit:a.modeC.exit.status,
     entryPrice:a.modeC.entry?.avgPx??null,
     exitPrice:a.modeC.exit.avgPx,netUsd:a.modeC.pnl?.netUsd??null},
   comparisonResult:a.comparisonResult,latencyMs:now-evt.ts});
  s.records.push(a);s.records=s.records.slice(-100);
  s.active=null;persist(true);
 }
 function eventsLoop(){
  if(busy)return;busy=true;
  try{
   const recent=recentActiveTradeEvents(EVENTS).filter(x=>x.tradeEvent)
     .sort((a,b)=>a.tradeEvent.ts-b.tradeEvent.ts);
   for(const row of recent){
    const e=row.tradeEvent,ts=Number(e.ts),key=ts+'|'+e.type;
    if(!ts||ts<s.lastEventTs||
       ts===s.lastEventTs&&key===s.lastEventKey)continue;
    if(ts===s.lastEventTs&&key!==s.lastEventKey){ /* distinct event same ms */ }
    s.lastEventTs=ts;s.lastEventKey=key;
    if(Date.now()-ts>5000){
     s.statistics.ignoredStaleEvents++;
     emit('SKIPPED_EVENT_TOO_OLD',{eventKey:key,observedLatencyMs:Date.now()-ts});
     // A previously active trade may have closed while worker was down.
     if(e.type.startsWith('EXIT_')&&s.active){
      s.active.status='UNRESOLVED_DOWNTIME_EXIT';s.active.exitEvent=e;
      s.records.push(s.active);s.records=s.records.slice(-100);s.active=null;
     }
     persist(true);continue;
    }
    if(e.type.startsWith('ENTER_'))entry(row);
    else if(e.type.startsWith('EXIT_'))exit(row);
   }
   processTrigger();persist();
  }catch(e){console.error('[BOONO EXEC LAB] poll',e.stack||e);}
  finally{busy=false;}
 }
 console.log('[BOONO EXEC LAB] PUBLIC_BOOK_ONLY '+JSON.stringify({
  instrument:INSTRUMENT.instId,policy:model.MODEL_VERSION,
  fundedOrders:false,bootstrap:s.bootstrapStatus,lastEvent:s.lastEventTs}));
 startWs();
 const timer=setInterval(eventsLoop,1000);
 // Clients never receive a trading API or an order sender. Termination is safe.
 function stop(){
  if(stopped)return;stopped=true;clearInterval(timer);
  if(connectTimer)clearTimeout(connectTimer);
  if(ping)clearInterval(ping);
  try{ws?.close();}catch(_){}
  persist(true);
 }
 process.on('SIGTERM',()=>{stop();process.exit(0);});
 process.on('SIGINT',()=>{stop();process.exit(0);});
 persist(true);
 if(!listen)return {stop,tick:eventsLoop,getState:()=>s,updateQuote:q=>{quote=q;}};
 return {stop};
}
if(require.main===module)start();
module.exports={start,initial};
