'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const temporal=require('../../modules/attention/attention-memory');
const adapters=require('../../modules/attention/evidence-adapters');
const v494=require('../../modules/attention/listening-v494');
const v542=require('../../modules/v5/decision-v542');
const v541=require('../../modules/v5/decision-v541');
const paper=require('../../modules/v5/paper-v542');
const fs=require('fs'),path=require('path');
const base=path.resolve(__dirname,'../../data');
const evt=(kind,d,t,ex={})=>({kind,direction:d,sourceAt:t,availableAt:t,...ex});
const T=Date.parse('2026-10-27T04:00:00Z');
test('As-of evidence refuses future, unobserved and impossible event ordering',()=>{
 const x=temporal.evaluate({now:T,observations:[
  evt('MCB15_NATIVE','long',T-1000),evt('MF_ACTION','long',T+1000),
  {kind:'MCB3_NATIVE',direction:'long',sourceAt:T+1000,availableAt:T-10}]});
 assert.equal(x.events.length,1);
 assert.equal(x.entryAllowed,null);assert.equal(x.exitRequested,null);
});
test('A single MCB3 contrary impulse keeps the campaign, never triggers EXIT',()=>{
 const x=temporal.evaluate({now:T,positionDirection:'long',campaignDirection:'long',
  campaignId:'long|1',observations:[evt('MCB3_NATIVE','short',T-1000)]});
 assert.equal(x.stage,'REVERSAL_ATTENTION');
 assert.equal(x.opposing.transferable,false);assert.equal(x.exitRequested,null);
});
test('An unchanged campaign has passive HOLD attention',()=>{
 const x=temporal.evaluate({now:T,positionDirection:'long',campaignDirection:'long',
  campaignId:'long|1'});
 assert.equal(x.stage,'CAMPAIGN_HOLD');
});
test('MF divergence + MF response + MCB15 + independent PRICE permit examination, not an order',()=>{
 const a=T-1000,b=T+1000,c=T+2000,d=T+3000;
 const observations=[
  evt('MF_DIVERGENCE','short',a,{anchors:{priceFirst:100,priceSecond:110,mfFirst:20,mfSecond:10}}),
  evt('MF_ACTION','short',b),evt('MCB15_NATIVE','short',c),
  evt('PRICE_TRANSLATION','short',d,{price:95})];
 const x=temporal.evaluate({now:d,positionDirection:'long',campaignDirection:'long',
  campaignId:'l|1',observations});
 assert.equal(x.stage,'TRANSFER_EXAMINATION');
 assert.equal(x.opposing.mf.sequence,true);
 assert.equal(x.exitRequested,null);assert.equal(x.riskOverride,false);
});
test('A price reaction BEFORE the MF action is not a valid transfer proof',()=>{
 const x=temporal.evaluate({now:T+3000,positionDirection:'long',
  campaignId:'l|1',observations:[
   evt('MF_DIVERGENCE','short',T-3000,{anchors:{priceFirst:100,priceSecond:110,mfFirst:30,mfSecond:20}}),
   evt('PRICE_TRANSLATION','short',T),
   evt('MF_ACTION','short',T+1000),
   evt('MCB15_NATIVE','short',T+2000)]});
 assert.equal(x.opposing.transferable,false);
});
test('An explicitly falsified PRICE proof does not remain valid',()=>{
 const x=temporal.evaluate({now:T+3000,positionDirection:'long',campaignId:'l|1',
  observations:[evt('MF_TRANSFER','short',T-2000),evt('MCB15_NATIVE','short',T-1500),
   evt('PRICE_TRANSLATION','short',T),evt('PRICE_FALSIFIES','short',T+2000)]});
 assert.equal(x.opposing.transferable,false);
});
test('Causal memory is deduplicated and resets when campaign source changes',()=>{
 const a=evt('MCB3_NATIVE','long',T-10);
 const x=temporal.evaluate({now:T,campaignId:'A',observations:[a,a]});
 assert.equal(x.events.length,1);
 const y=temporal.evaluate({now:T+200,previous:x,campaignId:'B'});
 assert.equal(y.events.length,0);
 assert.equal(y.stage,'DISCOVERY');
});
test('MA events remain descriptive and do not generate an order or a veto',()=>{
 const x=temporal.evaluate({now:T,campaignId:'l|1',positionDirection:'long',
  observations:[evt('MA_REJECTION','short',T-10),evt('MA_ACCEPTANCE','short',T-1)]});
 assert.equal(x.stage,'CAMPAIGN_HOLD');
 assert.equal(x.entryAllowed,null);assert.equal(x.exitRequested,null);
});
test('Confirmed 15m bars cannot leak a divergence before second low closes',()=>{
 const file='/root/agents-ia-zero-one/data/mcb-live/mcb_15m.csv';
 const rows=fs.readFileSync(file,'utf8').split(/\r?\n/).slice(1).map(l=>{
  const x=l.split(',');return {ts:Date.parse(x[0]),low:Number(x[3]),
   high:Number(x[2]),money_flow:Number(x[7])};
 }).filter(x=>Number.isFinite(x.ts));
 const when=Date.parse('2026-10-27T04:45:00Z');
 const before=adapters.divergenceFromBars(rows,when-1);
 const after=adapters.divergenceFromBars(rows,when);
 const thisPair=x=>x.kind==='MF_DIVERGENCE'&&x.direction==='long'&&
   x.anchors.priceFirst===79611.5&&x.anchors.priceSecond===79607.2;
 assert.equal(before.some(thisPair),false,'05:30 candle cannot be observed before 05:45 UTC');
 assert.equal(after.some(thisPair),true,'known MF and price anchors can form divergence at the close');
 assert.equal(after.find(thisPair).availableAt,when);
});
test('V494 never modifies the ORIGINAL frozen action',()=>{
 const e={version:'v4.9.3-mf-memory-admission-20261012',
  action:{type:'HOLD',reason:'still aligned'},mcb:{currentLobe:{
   structuralDirection:'long',startTs:1000}}};
 const d=v494.decorate({v493Evaluation:e,frame:{market:{timestamp:T}},
  position:{direction:'long'}});
 assert.deepEqual(d.action,e.action);
 assert.equal(d.version,v494.VERSION);
 assert.equal(d.temporalAttention.stage,'CAMPAIGN_HOLD');
});
test('V542 is V541-equivalent on the existing causal admission fixture',()=>{
 const f=require('../v5/fixtures/v541-20261026-asof.json');
 const c=f.cases.find(c=>c.label==='16:00:37');
 const samples=f.samples.filter(x=>x.ts<=c.ts).slice(-450);
 const input={...f,now:c.ts,price:c.price,samples,position:null,
  startedAt:f.activatedV54,sourceAgeMs:c.ts-samples.at(-1).ts,tickAgeMs:100,
  health:true,liveMa3:null,liveMa15:null,levels:[]};
 const a=v541.evaluate(input),b=v542.evaluate(input);
 assert.equal(a.action,'ENTER_LONG');assert.equal(b.action,a.action);
 assert.equal(b.reason,a.reason);assert.equal(b.version,v542.VERSION);
 assert.equal(b.readings.attention.attentionOnly,true);
 assert.equal(b.brokerOrdersEnabled,false);
});
test('Legacy V541 positions preserve their exact V541 exit outcome under V542',()=>{
 const f=require('../v5/fixtures/v541-20261026-asof.json');
 const c=f.cases.find(c=>c.label==='16:21:10'),samples=f.samples.filter(x=>x.ts<=c.ts).slice(-450);
 const pos={direction:'short',entryAt:c.ts-100000,entryPrice:c.price+25,
  entryPolicyVersion:v541.VERSION,invalidationPrice:c.price+240};
 const input={...f,now:c.ts,price:c.price,samples,position:pos,
  startedAt:f.activatedV54,sourceAgeMs:c.ts-samples.at(-1).ts,
  tickAgeMs:100,health:true,liveMa3:null,liveMa15:null,levels:[]};
 const a=v541.evaluate(input),b=v542.evaluate(input);
 assert.equal(b.action,a.action);assert.equal(b.reason,a.reason);
});
test('A V542 position uses the full V541 exit stack, not legacy V54 delegation',()=>{
 const f=require('../v5/fixtures/v541-20261026-asof.json');
 const c=f.cases.find(c=>c.label==='16:21:10'),samples=f.samples.filter(x=>x.ts<=c.ts).slice(-450);
 const pos={direction:'short',entryAt:c.ts-120000,entryPrice:c.price+30,
  entryPolicyVersion:v542.VERSION,invalidationPrice:c.price+250};
 const input={...f,now:c.ts,price:c.price,samples,position:pos,
  startedAt:f.activatedV54,sourceAgeMs:c.ts-samples.at(-1).ts,
  tickAgeMs:100,health:true,liveMa3:null,liveMa15:null,levels:[]};
 const a=v541.evaluate({...input,position:{...pos,entryPolicyVersion:v541.VERSION}});
 const b=v542.evaluate(input);
 assert.equal(b.action,a.action);assert.equal(b.reason,a.reason);
});
test('Paper migration is additive and refuses other versions',()=>{
 const previous={...paper.initial(1234),version:paper.V541_VERSION,completed:24,
  realizedUsd:-22,equityUsd:978,feesUsd:41,
  usedKeys:['abc'],history:[{tradeNo:24,entryPolicyVersion:'v5.4.1-structural-e3-territory-paper-v1'}],position:{
   direction:'long',entryAt:123,entryPrice:80000,
   entryPolicyVersion:'v5.4.1-structural-e3-territory-paper-v1'}};
 const next=paper.migrate(previous,2345);
 assert.equal(next.version,paper.VERSION);assert.equal(next.completed,24);
 assert.equal(next.equityUsd,978);assert.equal(next.feesUsd,41);
 assert.deepEqual(next.history,previous.history);
 assert.deepEqual(next.position,previous.position);
 assert.throws(()=>paper.migrate({...previous,version:'bad'},2345),/REFUSED/);
});
test('V493 shadow supplies no trading authority and V542 only accepts provenance',()=>{
 const f=require('../v5/fixtures/v541-20261026-asof.json');
 const c=f.cases.find(c=>c.label==='16:00:37');
 const samples=f.samples.filter(x=>x.ts<=c.ts).slice(-450);
 const i={...f,now:c.ts,price:c.price,samples,position:null,
  startedAt:f.activatedV54,sourceAgeMs:c.ts-samples.at(-1).ts,tickAgeMs:100,
  health:true,liveMa3:null,liveMa15:null,levels:[],
  v493AdmissionAsOf:{engine:'v4.9.3-mf-memory-admission-20261012',
   at:c.ts-30000,asOfVerified:true,action:{type:'ENTER_LONG',reason:'fresh PM'}}};
 const a=v542.evaluate({...i,v493AdmissionAsOf:null}),b=v542.evaluate(i);
 assert.equal(a.action,b.action);assert.equal(a.reason,b.reason);
 assert.equal(b.readings.admissionV493Shadow.action,'ENTER_LONG');
 assert.equal(b.readings.admissionV493Shadow.noTradingAuthority,true);
});
