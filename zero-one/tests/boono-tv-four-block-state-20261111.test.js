'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const state=require('../boono-tv/tv-living-state');
const MS=60000,TF3=3*MS,TF15=15*MS,TF4=240*MS;
const T=Date.parse('2026-11-11T08:00:00Z');
function csv(tf,values){
 const lines=['timestamp,open,high,low,close,lt_blue_wave,blue_wave,money_flow,buy,sell,dbsi_top,dbsi_bottom,ma200,wt1_cross_up,wt1_cross_dn'];
 for(let i=0;i<values.length;i++){
  const [bw,lbw,mf,dir]=values[i],t=new Date(T-(values.length-i)*tf).toISOString();
  const tail=dir==='UP'?'42,':dir==='DN'?',-42':',';
  lines.push([t,75000,75040,74990,75010,lbw,bw,mf,0,1,'','','',...tail.split(',')].join(','));
 }
 return lines.join('\n');
}
function paper(){
 return {brokerOrdersEnabled:false,latestAnalysis:{version:'v5.4.3-test',quality:'DATA_OK',
  asOf:T,price:74990,candidate:'short',
  readings:{structural54:{phase:'AWAIT_TACTICAL_ALIGNMENT',strategicState:'DESCENT_ACTIVE',director:'short',
   currentOffensive:'short',campaignId:'short|E15:test',priceRangeRank:.15,extendedTacticalWave:true,
   mf15History2h:7.2,matureAfterExtension:false},
   mcb15:{bw:-32,lbw:-45,currentOffensive:'short'},
   mcb3:{bw:-20,lbw:-40,tacticalDirection:'short'},
   conversion:{pmCombined:19.2},
   maContract:{ma3:{distanceUsd:-56.5,state:'ACCEPTED',polarityMemory:{retestsSinceChange:2}}},
   offensiveMaturity:{classification:'NO_MULTI_FAMILY_MATURITY_CONFLICT',
     context:{priceOrigin:{origin4h:{availableAt:T-60*MS,progressUsd:351.9}},
       priceGeometry:{priceAt2hExtreme:false},
       oscillator:{oppositeDivergenceForming:false},
       conversion:{conversionFatigue:false}}}}},position:{
     direction:'short',entryAt:T-30*MS,entryPrice:73625.1,lastNetPnlUsd:-2.5,
     mfePriceUsd:25.7,maePriceUsd:47.8,gainFloorUsd:0,
     invalidationPrice:73701.3,floorAuthorityVersion:'v543-mcb-structure-first-floor-advisory-v1'
   }};
}
test('MCB 4h signal is attributed only to closed bar and carries real source/availability clocks',()=>{
 const data=csv(TF4,[[-52,-64,0,'DN'],[-62,-74,2,'UP']]);
 const h4=state.confirmed4h(data,T);
 assert.equal(h4.status,'CONFIRMED');
 assert.equal(h4.bw.previous,-52);
 assert.equal(h4.bw.confirmed,-62);
 assert.equal(h4.event.direction,'UP');
 assert.equal(h4.event.sourceAt+TF4,h4.event.availableAt);
 const hasFuture=state.confirmed4h(data,T-TF4+1);
 assert.notEqual(hasFuture.bw.confirmed,-62);
});
test('V5 current four blocks reflect causal and PAPER data, not the PDF constants',()=>{
 const p=paper();
 const audit=[{ts:T-20000,lastPrice:74990,priceMove:3.2,
    live15BwRaw:-41,live15LbwRaw:-47,live15MfRaw:-4.49,
    liveBw:-57,liveLbw:-56,liveMoneyFlow:9,
    mf15Pente:-5.37,volumeFenetreBtc:84,winSec:20}];
 const event={family:'MCB15',key:'BW_LBW_CROSS',type:'OBSERVED',
    direction:'short',observedAt:T-4*MS,sourceTs:T-4*MS,
    price:75173,current:{sourceTs:T-15*MS}};
 const result=state.build({paper:p,audit,events:[event],
   csv3:csv(TF3,[[-52,-57,6],[-56,-55,7]]),
   csv15:csv(TF15,[[54,47,-.2],[46,33,-4.5]]),
   csv4:csv(TF4,[[-52,-64,0,'DN'],[-62,-74,2,'UP']]),now:T});
 assert.equal(result.status,'DATA_RECENT');
 assert.equal(result.brokerOrdersEnabled,false);
 assert.equal(result.trajectory.bw.live,-41);
 assert.equal(result.trajectory.flowBtcPerSec,4.2);
 assert.equal(result.tactical.ma3.retests,2);
 assert.equal(result.place.rangeZone,'RANGE_LOW');
 assert.equal(result.place.extended,true);
 assert.equal(result.causal.pmLiveUsd,19.2);
 assert.equal(result.causal.cross15.deltaSinceEvent,-183);
 assert.equal(result.position.floorAdvisory,true);
 assert.equal(result.position.invalidationPrice,73701.3);
 assert.equal(result.offensive.progress4hUsd,351.9);
});
test('stale or unauthorized PAPER input cannot be shown as current facts',()=>{
 const p=paper();
 assert.equal(state.build({paper:p,now:T+91*1000}).status,'SOURCE_STALE');
 p.brokerOrdersEnabled=true;
 assert.equal(state.build({paper:p,now:T}).status,'SOURCE_STALE');
});
test('position missing leaves the causal record but no imaginary P&L',()=>{
 const p=paper();p.position=null;
 const result=state.build({paper:p,now:T});
 assert.equal(result.position,null);
 assert.equal(result.structure.phase,'AWAIT_TACTICAL_ALIGNMENT');
});
test('read cached real datasets without requiring 3MB Audit parsing per 5sec',()=>{
 const get=state.createReader();
 const p=require('../data/v52-paper-state.json');
 const x=get(p),y=get(p);
 assert.equal(x.version,'boono-tv-living-four-blocks-v1');
 assert.equal(y.version,x.version);
 assert.equal(x.decisionImpact,false);
 if(x.status==='DATA_RECENT'){
  assert.ok(x.trajectory&&x.place&&x.causal);
  assert.equal(x.place.h4.status,'CONFIRMED');
 }
});
