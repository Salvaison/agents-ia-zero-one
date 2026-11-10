'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const volume=require('../../modules/attention/v494-elastic-volume-1m');
const MIN=60000,base=Date.parse('2026-11-10T16:00:00.000Z');
const line=(ts,btc,confirmed='1')=>
 [String(ts),'73000','73050','72950','73020',String(btc*100),String(btc),
 String(btc*73020),confirmed];
const rows=Array.from({length:65},(_,i)=>line(base-i*MIN,10+(i%15)));

test('1m OKX volCcy selects BTC rather than contracts, rejects unconfirmed and invalid',()=>{
 const result=volume.parseResponse({code:'0',data:[
  line(base,20),line(base+MIN,25,'0'),line(base+2*MIN,-1),
  line(base+3*MIN,0),line(base-15000,15)]});
 assert.deepEqual(result,[{at:base,btc:20},{at:base+3*MIN,btc:0}]);
 assert.throws(()=>volume.parseResponse({code:'1',data:[]}),/BAD_RESPONSE/);
});
test('full 15-minute window averages unique completed 1m BTC volume and preserves units',()=>{
 const start=base-15*MIN;
 const arr=Array.from({length:15},(_,i)=>({at:start+i*MIN,btc:20+i}));
 const r=volume.reconcile([{startAt:start}],arr,base,{sourceStatus:'OK'})[0];
 assert.equal(r.meanBtcPerMinute,27);
 assert.equal(r.totalBtcObserved,405);
 assert.equal(r.observedMinutes,15);
 assert.equal(r.coverageFraction,1);
 assert.equal(r.source,volume.SOURCE);
 assert.equal(r.unit,'BTC/min');
});
test('current 15m window stops at last confirmed minute as-of',()=>{
 const arr=Array.from({length:15},(_,i)=>({at:base+i*MIN,btc:10+i}));
 const b=volume.reconcile([{startAt:base}],arr,base+7.7*MIN)[0];
 assert.equal(b.meanBtcPerMinute,13);
 assert.equal(b.observedMinutes,7);
 assert.equal(b.expectedMinutes,7);
 assert.equal(b.totalBtcObserved,91);
 assert.equal(b.completed15Minutes,false);
 const first=volume.reconcile([{startAt:base}],arr,base+15000)[0];
 assert.equal(first.status,'WAIT_CONFIRMED_1M');
 assert.equal(first.meanBtcPerMinute,null);
});
test('missing minutes never pass for full-volume measurement',()=>{
 const arr=Array.from({length:15},(_,i)=>({at:base+i*MIN,btc:10+i})).filter((_,i)=>i!==6);
 const r=volume.reconcile([{startAt:base}],arr,base+15*MIN)[0];
 assert.equal(r.status,'PARTIAL_1M_COVERAGE');
 assert.equal(r.meanBtcPerMinute,null);
 assert.equal(r.observedMinutes,14);
});
test('provider caches a public 1m request, bounds its output to shadow as-of',async()=>{
 let now=base+MIN,fetches=0;
 const fetcher=async(_url,options)=>{
  fetches++;
  assert.equal(options.method,'GET');
  return {ok:true,json:async()=>({code:'0',data:rows})};
 };
 const provider=volume.createProvider({request:fetcher,clock:()=>now,ttlMs:45000});
 const first=await provider.get([{startAt:base-15*MIN}],now);
 assert.equal(first.status,'OK');
 assert.equal(first.windows.length,1);
 const next=await provider.get([{startAt:base-15*MIN}],now);
 assert.equal(fetches,1);
 now+=46000;
 await provider.get([{startAt:base-15*MIN}],now);
 assert.equal(fetches,2);
});
test('failed exchange read does not fabricate volume or throw to the trade UI',async()=>{
 let now=base+MIN;
 const p=volume.createProvider({request:async()=>{throw Error('OFFLINE');},clock:()=>now});
 const r=await p.get([{startAt:base}],now);
 assert.equal(r.status,'UNAVAILABLE');
 assert.equal(r.windows[0].meanBtcPerMinute,null);
});

