'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'modules/elastic-live-conversion-v541.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'modules/elastic-observer-ui.js'),'utf8');
const config=fs.readFileSync(path.join(root,'modules/config-server.js'),'utf8');
function make(){
 let at=1800000000000;
 const ctx={window:{},document:{hidden:false,getElementById:()=>null},
  Date:{now:()=>at}};
 vm.createContext(ctx);vm.runInContext(src,ctx);
 const module=ctx.window.elasticConversionV541;
 const trade=(id,side,sz,px,lag=0)=>module.ingestTrade({
  tradeId:id,side,sz:String(sz),px:String(px),ts:String(at-lag),
  instId:'BTC-USDT-SWAP'});
 const move=delta=>{at+=delta;};
 const context=(extras={})=>({version:'v5.4.1-structural-e3-territory-paper-v1',
  asOf:at,brokerOrdersEnabled:false,readings:{conversion:{
   pm3:32.5,pm5:44.1,pmCombined:5.3,...extras}}});
 return {ctx,module,trade,move,context,now:()=>at};
}
test('Same public OKX trades WebSocket computes BTC agressor volumes with CTVAL 0.01',()=>{
 const x=make();
 assert.equal(x.module.setAnalysis(x.context()),true);
 assert.equal(x.trade('101','buy',100,80500),true);
 assert.equal(x.trade('102','sell',50,80540),true);
 assert.equal(x.trade('102','sell',50,80540),false,'retransmitted tradeId is deduplicated');
 const s=x.module.snapshot();
 assert.equal(s.status,'WARMING_3M');
 assert.equal(s.effort.available,true);
 assert.equal(s.effort.buyBtc,1);
 assert.equal(s.effort.sellBtc,.5);
 assert.equal(s.effort.priceNetUsd,40);
 assert.equal(s.effort.priceRangeUsd,40);
 assert.equal(s.effort.volumeUnit,'BTC');
 assert.equal(s.effort.contractsToBtc,.01);
 assert.equal(s.conversion.pm3,32.5);
 assert.equal(s.conversion.pmLive,5.3);
 assert.equal(s.conversion.yieldVsP75,null,'do not reuse V4 frozen P75');
 assert.equal(s.conversion.quality,'UNCLASSIFIED');
 assert.equal(s.decisionImpact,false);
});
test('3m volume window warms progressively and then maintains a genuinely rolling 180 seconds',()=>{
 const x=make();
 for(let i=0;i<20;i++){
  assert.equal(x.trade(String(i),'buy',5,80500+i),true);
  x.move(10000);
 }
 const s=x.module.snapshot();
 assert.equal(s.status,'LIVE_3M');
 assert.equal(s.coverageSeconds,180);
 assert.equal(s.effort.sampleCount,18,'first two trades out of 3m have expired');
 assert.ok(s.effort.buyBtc>.75&&s.effort.buyBtc<1);
 assert.equal(s.effort.sellBtc,0);
});
test('Silent WS does not masquerade as a live duel or preserve old quantities',()=>{
 const x=make();x.trade('1','buy',12,80000);x.trade('2','sell',20,80035);
 x.move(16000);
 const s=x.module.snapshot();
 assert.equal(s.status,'OKX_TRADES_UNAVAILABLE');
 assert.equal(s.effort.available,false);
 assert.equal(s.effort.buyBtc,null);
 assert.equal(s.effort.priceNetUsd,null);
 x.trade('3','buy',10,80100);
 const fresh=x.module.snapshot();
 assert.equal(fresh.status,'WARMING_3M');
 assert.equal(fresh.effort.available,false,'warm restart has only one trade');
 assert.equal(fresh.coverageSeconds,0);
});
test('V5.4.1 PM3/PM5/PM Live come from current PAPER policy, not frozen V4',()=>{
 const x=make(),old={version:'v4.10.10-archived',asOf:x.now(),
  brokerOrdersEnabled:false,readings:{conversion:{pm3:900}}};
 assert.equal(x.module.setAnalysis(old),false);
 assert.equal(x.module.setAnalysis(x.context({pm3:-7,pm5:12,pmCombined:4.8})),true);
 x.trade('a','buy',20,80000);x.trade('b','sell',10,80020);
 let snap=x.module.snapshot();
 assert.equal(snap.conversion.pm3,-7);
 assert.equal(snap.conversion.pm5,12);
 assert.equal(snap.conversion.pmLive,4.8);
 assert.equal(snap.conversion.quality,'CONTESTED');
 x.move(70000);
 snap=x.module.snapshot();
 assert.equal(snap.conversion.pm3,null,'stale analysis cannot remain live');
 assert.equal(snap.conversion.pmLive,null);
});
test('No extra WebSocket, feed from ALL original OKX message trades and V541 state',()=>{
 assert.equal((src.match(/new WebSocket\(/g)||[]).length,0);
 assert.ok(config.includes('window.elasticConversionV541.ingestTrade(tr)'));
 assert.ok(config.includes('for(const tr of msg.data)'));
 assert.ok(config.includes('window.elasticConversionV541.setAnalysis(data.analysis)'));
 assert.ok(config.includes('window.elasticConversionV541.refreshUi()'));
 assert.ok(config.includes('/elastic-live-conversion-v541.js'));
 assert.ok(ui.includes('const cv=liveSnapshot();'));
 assert.ok(ui.includes('effort(liveSnapshot())'));
 assert.ok(ui.includes('ARCHIVE V4.10.10'));
 assert.ok(!ui.includes('effort(h)+'));
});
test('V4 frozen volume 999 BTC is never painted as current buy/sell without live OKX trades',()=>{
 const x=make();vm.runInContext(ui,x.ctx);
 const old={elasticObserverShadow:{version:'v4-archived',
  effort:{available:true,buyBtc:999,sellBtc:999,priceNetUsd:900},
  conversion:{pm3:900,pm5:900}}};
 const rendered=x.ctx.window.renderElasticObserverV05(old);
 assert.ok(rendered.includes('ARCHIVE V4.10.10'));
 assert.ok(rendered.includes('FLUX OKX NON REÇU'));
 assert.ok(rendered.includes('ACHAT —'));
 assert.ok(rendered.includes('VENTE —'));
 assert.ok(!rendered.includes('ACHAT 999'));
 x.trade('1','buy',5,80500);x.trade('2','sell',10,80504);
 const live=x.ctx.window.renderElasticObserverV05(old);
 assert.ok(live.includes('ACHAT 0.050 BTC'));
 assert.ok(live.includes('VENTE 0.100 BTC'));
 assert.ok(!live.includes('ACHAT 999'));
});
