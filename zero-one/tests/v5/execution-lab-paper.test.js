'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../../modules/v5/execution-lab-model');
function book(now=Date.now()){
 return model.quote({data:[{ts:String(now-125),
  asks:[['80230.4','110'],['80231.2','120'],['80234.4','100'],['80240','200'],['80243','500']],
  bids:[['80230.3','80'],['80229.2','120'],['80225','100'],['80220','300'],['80210','400']]
 }]},now-25);
}
test('X-Perp explicit contract sizing and spread',()=>{
 const q=book(),ct=model.contracts(1500,q.mid);
 assert.equal(q.bid,80230.3);
 assert.equal(q.ask,80230.4);
 assert.equal(q.spread,.1);
 assert.equal(model.INSTRUMENT.ctValBtc,.0001);
 assert.equal(ct,186);
 assert.ok(ct*.0001*q.mid<=1500);
});
test('buy marketable IOC with $5 cap fills better than the cap, across book levels',()=>{
 const now=Date.now(),q=book(now);
 const fill=model.simulateIOC({quote:q,side:'buy',quantityContracts:186,offsetUsd:5,now});
 assert.equal(fill.status,'FULL');
 assert.equal(fill.limitPx,80235.4);
 assert.equal(fill.legs.length,2);
 assert.equal(fill.legs[0].contracts,110);
 assert.equal(fill.legs[1].contracts,76);
 assert.ok(fill.avgPx<fill.limitPx);
 assert.equal(fill.fillQuality,'PUBLIC_BOOK_SNAPSHOT_ESTIMATE_NOT_ACTUAL_FILL');
});
test('sell IOC partial cancels remainder; no invented complete fill',()=>{
 const now=Date.now(),q=book(now);
 const fill=model.simulateIOC({quote:q,side:'sell',quantityContracts:490,offsetUsd:5,now});
 assert.equal(fill.limitPx,80225.3);
 assert.equal(fill.status,'PARTIAL');
 assert.equal(fill.filledContracts,200);
 assert.equal(fill.unfilledContracts,290);
});
test('stale or crossed quotes not used',()=>{
 const now=Date.now(),q=book(now);
 const fill=model.simulateIOC({quote:q,side:'buy',quantityContracts:100,offsetUsd:5,now:now+5100});
 assert.equal(fill.status,'NO_FRESH_BOOK');
 assert.equal(model.quote({ts:String(now),bids:[['100.1','3']],asks:[['99.9','3']]},now),null);
});
test('dynamic offset and trigger bounded 2-8, with long/short symmetric trigger',()=>{
 const q=book(),p=model.bounds({q,median3mRangeUsd:35,priceRateUsdPerMin:10});
 assert.ok(p.offsetUsd>=2&&p.offsetUsd<=8);
 assert.ok(p.triggerUsd>=3&&p.triggerUsd<=8);
 assert.equal(model.bounds({q,median3mRangeUsd:400,priceRateUsdPerMin:1000}).offsetUsd,8);
 assert.equal(model.triggerStatus({direction:'long',referenceMid:80000,currentMid:80005,thresholdUsd:5}).status,'TRIGGERED');
 assert.equal(model.triggerStatus({direction:'short',referenceMid:80000,currentMid:79995,thresholdUsd:5}).status,'TRIGGERED');
});
test('fee-aware PNL for actual simulated X-Perp contracts',()=>{
 const p=model.netPnl({direction:'long',quantityContracts:100,entryPx:80000,exitPx:80200});
 assert.equal(p.grossUsd,2);
 assert.equal(p.feeEntryUsd,.4);
 assert.equal(p.feeExitUsd,.401);
 assert.equal(p.netUsd,1.199);
});
test('standalone lab is read-only: public WS, isolated JSON and NDJSON, no broker actions',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.resolve(__dirname,'../../modules/v5/execution-lab-worker.js'),'utf8');
 assert.ok(src.includes("channel:'books5'"));
 assert.ok(src.includes("const WS_URL='wss://ws.okx.com:8443/ws/v5/public'"));
 assert.ok(src.includes("STATE=path.join(DATA,'v53-execution-lab-state.json')"));
 assert.ok(src.includes("const recent=recentActiveTradeEvents(EVENTS)"));
 assert.ok(src.includes('fundedOrders:false'));
 assert.ok(!src.includes('/api/v5/trade/order'));
 assert.ok(!src.includes('/ws/v5/private'));
 assert.ok(!src.includes('require(\'../broker'));
 assert.ok(!src.includes("fs.writeFileSync(LEDGER"));
});
test('execution lab UI has one read-only route, panel, refresh and no trade-action endpoint',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const s=fs.readFileSync(path.resolve(__dirname,'../../modules/config-server.js'),'utf8');
 assert.ok(s.includes("app.get('/api/execution-lab',requireAuth"));
 assert.ok(!s.includes("app.post('/api/execution-lab"));
 assert.ok(s.includes("fundedOrders:false,"));
 assert.ok(s.includes("if(x.brokerOrdersEnabled!==false||x.fundedOrders!==false)"));
 assert.ok(s.includes("fetch('/api/execution-lab'"));
 assert.ok(s.includes("setInterval(loadExecutionLabPanel,15000)"));
 const panel=s.indexOf("'<details id=\"execution-lab-details\""),
  v52=s.indexOf("'<div id=\"v52-live\""),
  v493=s.indexOf("'<details id=\"v493-details\"");
 assert.ok(v52>0&&panel>v52&&v493>panel);
 const tick=String.fromCharCode(96),
  route=s.indexOf("app.get('/app.js', requireAuth"),
  a=s.indexOf('send('+tick,route),
  b=s.indexOf(tick+');\n});',a);
 assert.ok(a>0&&b>a);
 const src=vm.runInNewContext(tick+s.slice(a+6,b)+tick);
 new vm.Script(src);
});
