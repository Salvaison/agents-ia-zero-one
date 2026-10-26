'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const feed=require('../../modules/v5/causal-event-feed-v54');
const t=Date.parse('2026-10-26T14:00:00Z');
const row=(ts,spread3=-1,spread15=-3,extra={})=>({
 ts,lastPrice:80000,
 liveLbw:10,liveBw:10+spread3,live15LbwRaw:20,live15BwRaw:20+spread15,
 liveSignalUp:null,liveSignalDn:null,live15SignalUp:null,live15SignalDn:null,
 ...extra});
const confirmed=(ts,extra={})=>({ts,close:80000,low:79900,high:80100,
 lt_blue_wave:20,blue_wave:21,money_flow:5,wt1_cross_up:null,wt1_cross_dn:null,...extra});
test('Bootstrapping new sole V54 telemetry NEVER fabricates historical E15 OBSERVED',()=>{
 const s=feed.initial(row(t+10000,-1,-3,{live15SignalUp:-60}),
  [confirmed(t-180000)],[confirmed(t-900000)],13784);
 assert.equal(s.lastSampleTs,t+10000);
 assert.equal(s.lastId,13784);
 assert.equal(s.families.MCB15.live.direction,'long');
 assert.equal(s.bootstrap,'NO_BACKDATED_OBSERVATION_ON_RESTART');
 assert.equal(s.tradingEnabled,false);
});
test('First new E3 live and genuine BW/LBW cross are recorded with observedAt not backdated to sourceTs',()=>{
 let s=feed.initial(row(t+10000,2,-3),[confirmed(t-180000)],[confirmed(t-900000)],13784);
 const later=row(t+40000,-2,-3,{liveSignalUp:-70});
 const x=feed.step(s,later,[confirmed(t-180000)],[confirmed(t-900000)]);
 assert.equal(x.changed,true);
 assert.deepEqual(x.events.map(e=>e.key),['E3','BW_LBW_CROSS']);
 const native=x.events[0],cross=x.events[1];
 assert.equal(native.type,'OBSERVED');
 assert.equal(native.direction,'long');
 assert.equal(native.sourceTs,t);
 assert.equal(native.observedAt,t+40000);
 assert.equal(cross.direction,'long');
 assert.equal(cross.current.event,'BW_CROSSES_BELOW_LBW');
 assert.equal(cross.detail.noAdditionalVote,true);
 assert.ok(cross.id>13784);
 assert.equal(feed.step(s,later,[confirmed(t-180000)],[confirmed(t-900000)]).events.length,0);
});
test('Provisional E15 interruption keeps ORIGINAL signal sourceTs so V5.4 can revoke it',()=>{
 let s=feed.initial(row(t+10000,1,2),[confirmed(t-180000)],[confirmed(t-900000)],13784);
 const up=feed.step(s,row(t+40000,1,2,{live15SignalUp:-51}),
   [confirmed(t-180000)],[confirmed(t-900000)]);
 assert.equal(up.events.filter(e=>e.key==='E15'&&e.type==='OBSERVED').length,1);
 const erased=feed.step(s,row(t+70000,1,2),
   [confirmed(t-180000)],[confirmed(t-900000)]);
 const i=erased.events.find(e=>e.key==='E15'&&e.type==='INTERRUPTED');
 assert.ok(i);
 assert.equal(i.sourceTs,t);
 assert.equal(i.observedAt,t+70000);
 assert.equal(feed.step(s,row(t+100000,1,2),[confirmed(t-180000)],[confirmed(t-900000)]).events.length,0);
});
test('Confirmed E3 and E15 event times reflect FIRST ACTUAL OBSERVATION after closed bar',()=>{
 let s=feed.initial(row(t+10000),[confirmed(t-180000)],[confirmed(t-900000)],13784);
 const THREE=180000,at3=t+THREE+38000;
 const bar3=confirmed(t,{wt1_cross_up:-61});
 const three=feed.step(s,row(at3),[confirmed(t-180000),bar3],
   [confirmed(t-900000)]);
 const evt3=three.events.find(e=>e.key==='E3'&&e.type==='CONFIRMED');
 assert.ok(evt3);assert.equal(evt3.sourceTs,t);assert.equal(evt3.observedAt,at3);
 const bar15=confirmed(t,{wt1_cross_dn:68});
 const at15=t+900000+42000;
 const fifteen=feed.step(s,row(at15),[confirmed(t-180000),bar3],
   [confirmed(t-900000),bar15]);
 const evt15=fifteen.events.find(e=>e.key==='E15'&&e.type==='CONFIRMED');
 assert.ok(evt15);assert.equal(evt15.direction,'short');
 assert.equal(evt15.sourceTs,t);assert.equal(evt15.observedAt,at15);
 assert.equal(evt15.current.type,'DN');
});
test('Only the V54 runner writes native events; no new funded broker or competing strategy',()=>{
 const src=fs.readFileSync(path.resolve(__dirname,'../../modules/v5/runner-v52.js'),'utf8');
 const evt=fs.readFileSync(path.resolve(__dirname,'../../modules/v5/causal-event-feed-v54.js'),'utf8');
 assert.ok(src.includes("const decision=require('./decision-v54')"));
 assert.ok(src.includes('nativeFeed.step(feedState,x.last,x.bars3,x.bars15)'));
 assert.ok(src.includes('appendRotatingNdjson(ELASTIC_EVENTS,e'));
 assert.ok(!evt.includes('decision-v53'));
 assert.ok(!evt.includes('trading-client'));
 assert.ok(!evt.includes('orderPayload'));
});
