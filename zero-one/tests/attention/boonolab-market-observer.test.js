'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const reg=require('../../modules/attention/boonolab-regime-observer');
const pos=require('../../modules/attention/boonolab-position-attention');
const chron=require('../../modules/attention/boonolab-causal-chronicle');
const history=require('../../modules/attention/boonolab-market-history');
const {appendRotatingNdjson}=require('../../modules/v3lab/storage/rotating-ndjson');
const T=1794100000000,MIN=60000;
function audit({lastFlow=2,productive=true}={}){
 const rows=[],base=77000;
 for(let i=0;i<600;i++){
  const recent=i>=480;
  let price;
  if(!recent)price=base+(i%2?14:0);
  else price=productive?base+(i-480)*2:base+(i%2?90:0);
  rows.push({ts:T-(599-i)*30000,lastPrice:price,
   cadence:recent?lastFlow*50:50,
   volumeFenetreBtc:(recent?lastFlow:1)*10,winSec:10});
 }
 return rows;
}
function paperInput(t=T){
 return {asOf:t,price:77012,readings:{
  structural54:{director:'short',phase:'STRUCTURAL_CONTINUATION',
   campaignId:'short|E15:1',
   testedTerritory:{status:'DEFENDED',validated:true,
    availableAt:t-30000,source:'DEFENDED_RETEST',level:77000}},
  maContract:{ma3:{state:'ACCEPTED',ma:77010,
   polarityMemory:{lastRejection:null}},ma15:{state:'ACCEPTED'}},
  conversion:{mf3Delta3m:-2,mf15Delta10m:-1,
   pm3:-24,pm5:-55,pmCombined:-5}}};
}
test('Four regimes are relative to the previous observations, not fixed BTC/s gates',()=>{
 for(const [flow,productive,label] of [
  [10,true,'DIRECTIONNEL_PRODUCTIF'],[10,false,'DENSE_CONTRADICTOIRE'],
  [.1,true,'SILENCIEUX_PRODUCTIF'],[.1,false,'STERILE_HESITANT']]){
  const s=reg.evaluate(audit({lastFlow:flow,productive}),T);
  assert.equal(s.label,label);
  assert.equal(s.decisionImpact,false);
  assert.equal(s.brokerOrdersEnabled,false);
  assert.equal(s.fourByFifteen.length,4);
  assert.ok(s.twoHour.rangeUsd>=0);
  assert.equal(s.metrics.lastHour.samples,120);
 }
});
test('No regime if insufficient coverage, stale sources or future-only samples',()=>{
 assert.equal(reg.evaluate(audit().slice(-50),T).label,'INDETERMINE');
 assert.equal(reg.evaluate(audit().map(x=>({...x,ts:x.ts+4*60*MIN})),T).label,'INDETERMINE');
});
test('One-minute strong rebound after mature SHORT flags an OBSERVATION, not an EXIT',()=>{
 const entry=75941;
 const rows=Array.from({length:50},(_,i)=>({ts:T-25*MIN+i*30000,
  lastPrice:76000+(i%2?5:0),volumeFenetreBtc:10,winSec:10}));
 rows.push(...[75941,75500,74940,74980,75146].map((price,i)=>({
  ts:T+i*30000,lastPrice:price,volumeFenetreBtc:i>=2?70:10,winSec:10})));
 const position={entryAt:T,entryPrice:entry,direction:'short',notionalUsd:1500};
 const k=pos.probe({position,audit:rows,asOf:T+120000});
 assert.equal(k.valid,true);
 assert.ok(k.favourableObservedUsd>900);
 assert.ok(k.adverse60sUsd>=200);
 assert.ok(k.fractionGivenBack>=.2);
 assert.ok(['MATERIAL_COUNTERATTACK','COUNTERATTACK_WITH_AGGRESSIVE_FLOW'].includes(k.status));
 assert.equal(k.decisionImpact,false);
 assert.ok(k.netIfClosedOnObservedPriceUsd>0);
 // Earlier no large buyback: a mature impulsion is not force-exited.
 const z=pos.probe({position,audit:rows,asOf:T+60000});
 assert.equal(z.status,'MATURE_IMPULSE');
});
test('Position shadow records only first attention in the episode and compares eventual actual',()=>{
 let s=pos.initial();const position={entryAt:T,entryPrice:75941,direction:'short'};
 const auditRows=[{ts:T,lastPrice:75941},{ts:T+30000,lastPrice:75430},
  {ts:T+60000,lastPrice:74940},
  {ts:T+90000,lastPrice:74980},
  {ts:T+120000,lastPrice:75146},
  {ts:T+150000,lastPrice:75280}].map(x=>({...x,volumeFenetreBtc:80,winSec:10}));
 for(const p of auditRows.slice(2)){
  const v=pos.observe(s,{position,audit:auditRows.filter(x=>x.ts<=p.ts),
   asOf:p.ts});s=v.state;
 }
 assert.equal(s.position,undefined);
 assert.ok(s.session.firstAttention);
 const first=s.session.firstAttention.at;
 const v=pos.observe(s,{position:null,audit:auditRows,asOf:T+180000,
  paperHistory:[{entryAt:T,exitAt:T+175000,netPnlUsd:3.89}]});
 assert.equal(v.state.recentClosed[0].firstAttention.at,first);
 assert.equal(v.state.recentClosed[0].actualNetUsd,3.89);
 assert.equal(v.state.recentClosed[0].hypotheticalDifferenceUsd!==null,true);
 assert.equal(v.state.decisionImpact,false);
});
test('Chronicle has EXACTLY seven causal event families, no double native bootstrap',()=>{
 assert.deepEqual(chron.FAMILIES,
  ['MCB15','MCB3','FLOW','MA','CONVERSION','BOUNDARY','CONTEXT']);
 const native=[{id:20,observedAt:T-30000,sourceTs:T-900000,
  family:'MCB15',key:'E15',type:'CONFIRMED',direction:'short',price:77012}];
 const a=chron.observe(chron.initial(),{
  asOf:T,price:77012,analysis:paperInput(),native,
  regime:{label:'DENSE_CONTRADICTOIRE',intensity:'HIGH',
   productivity:'LOW_RETENTION'}});
 assert.equal(a.events.filter(e=>e.family==='MCB15'&&
  e.type==='BOOTSTRAP_OBSERVED').length,1);
 assert.equal(a.events.filter(e=>e.type==='CONFIRMED').length,0);
 assert.equal(a.events.length,7);
 const b=chron.observe(a.state,{asOf:T+30000,price:77020,
  analysis:paperInput(T+30000),native:[...native,{
   id:21,observedAt:T+15000,sourceTs:T,price:77020,
   family:'MCB3',key:'BW_LBW_CROSS',type:'OBSERVED',direction:'long'}],
  regime:{label:'DENSE_CONTRADICTOIRE'}});
 assert.equal(b.events.filter(e=>e.key==='BW_LBW_CROSS').length,1);
 assert.equal(b.events.find(e=>e.key==='BW_LBW_CROSS').relatedTo,
  'E3_OR_E15_SAME_OSCILLATOR_NOT_INDEPENDENT');
 assert.ok(b.events.every(e=>e.decisionImpact===false));
 const again=chron.observe(b.state,{asOf:T+60000,price:77020,
  analysis:paperInput(T+60000),native:[...native,{
   id:21,observedAt:T+15000,sourceTs:T,price:77020,
   family:'MCB3',key:'BW_LBW_CROSS',type:'OBSERVED',direction:'long'}],
  regime:{label:'DENSE_CONTRADICTOIRE'}});
 assert.equal(again.events.filter(e=>e.key==='BW_LBW_CROSS').length,0);
});
test('Reverse history pages are deterministic; family filters never expose unread data',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boono-seven-family-'));
 const file=path.join(dir,'events.ndjson');
 try{
  for(let i=0;i<7;i++)appendRotatingNdjson(file,{
    version:chron.VERSION,seq:i+1,at:T+i*30000,
    family:i%2?'FLOW':'MCB15',key:'x',type:'STATE_CHANGED',
    decisionImpact:false,brokerOrdersEnabled:false},
    {maxBytes:500,maxSegments:16});
  const a=history.page(file,{now:T+300000,hours:6,limit:2});
  assert.equal(a.items.length,2);
  assert.equal(a.items[0].seq,7);
  const b=history.page(file,{now:T+300000,hours:6,limit:2,before:a.nextBefore});
  assert.ok(b.items.every(e=>e.seq<a.nextBefore));
  const f=history.page(file,{now:T+300000,hours:6,limit:20,family:'FLOW'});
  assert.equal(f.items.length,3);
  assert.ok(f.items.every(e=>e.family==='FLOW'));
  assert.throws(()=>history.page(file,{family:'../etc/passwd'}),/BAD_FAMILY/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('Watch endpoint remains authenticated and reader never replaces an open view on a timer',()=>{
 const config=fs.readFileSync(path.join(__dirname,'../../modules/config-server.js'),'utf8');
 const reader=fs.readFileSync(path.join(__dirname,'../../modules/attention/boonolab-observatory.html'),'utf8');
 for(const endpoint of ['/api/shadows/boonolab-market',
  '/api/shadows/boonolab-market-history','/boonolab-observatoire'])
  assert.ok(config.includes("app.get('"+endpoint+"',requireAuth,"));
 assert.ok(config.includes('target="_blank"'));
 assert.ok(reader.includes('LECTURE STABLE'));
 assert.ok(reader.includes('fetch(url,{cache:'));
 const script=reader.match(/<script>([\s\S]*?)<\/script>/)[1];
 assert.doesNotMatch(script,/\b(setInterval|setTimeout)\s*\(|new\s+(WebSocket|EventSource)\b/);
 assert.doesNotThrow(()=>new (require('node:vm').Script)(script));
});
