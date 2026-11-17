'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const core=require('../../modules/attention/boonolab-ticker4x15-independent');
const runner=require('../../modules/attention/boonolab-ticker4x15-runner');
const MS=30000,BASE=1794942000000;
const audit=Array.from({length:850},(_,i)=>({
 ts:BASE+i*MS,
 lastPrice:64000+i*1.3+22*Math.sin(i/15)+11*Math.sin(i/5),
 volumeFenetreBtc:6+i%8,winSec:25+i%6,
 cadence:10+i%20,priceMove:Math.sin(i/4)*15,
 live15LbwRaw:-60+i*.05,
 live15MfRaw:-11+i*.02
}));
const market=Array.from({length:850},(_,i)=>({
 asOf:BASE+i*MS,regimeLabel:i%240>=120?'DENSE_CONTRADICTOIRE':'STERILE_HESITANT'
}));
const stamp=BASE+849*MS;
test('independent quality collector builds 4 truly distinct 15m windows with original taxonomy',()=>{
 const x=core.calculate({audit,marketSnapshots:market,asOf:stamp});
 assert.equal(x.brokerOrdersEnabled,false);
 assert.equal(x.decisionImpact,false);
 assert.equal(x.mode,'SHADOW_ONLY');
 assert.equal(x.quality4x15.length,4);
 assert.equal(x.quality4x15.at(-1).partial,true);
 const starts=x.quality4x15.map(b=>b.startAt);
 assert.equal(new Set(starts).size,4);
 assert.ok(x.quality4x15.every(b=>b.coverageFraction>.9));
 assert.ok(x.quality4x15.every(b=>b.qualityCoverageFraction>.8));
 const allowed=new Set(['EASY','INEFFICIENT','SILENT','PRODUCTIVE',
  'POWERFUL','EXCEPTIONAL','CONTESTED','UNCLASSIFIED']);
 for(const b of x.quality4x15)
  for(const q of Object.keys(b.qualityFractions))assert.ok(allowed.has(q),q);
 assert.ok(x.current);
});
test('market regime and quality are separate, absent regime must not be invented',()=>{
 const x=core.calculate({audit,marketSnapshots:[],asOf:stamp});
 assert.ok(x.quality4x15.every(b=>b.qualityFractions&&Object.keys(b.qualityFractions).length>0));
 assert.ok(x.quality4x15.every(b=>Object.keys(b.marketFractions).every(k=>k==='UNKNOWN')));
 assert.equal(x.hourlyRegime.qualityCoverageFraction>.80,true);
});
test('future observations cannot alter any quarter quality at a frozen as-of',()=>{
 const end=BASE+800*MS;
 const past=core.calculate({audit,marketSnapshots:market,asOf:end});
 const future=core.calculate({audit:[...audit,
  ...Array.from({length:25},(_,i)=>({
   ...audit.at(-1),ts:stamp+(i+1)*MS,lastPrice:81000,
   volumeFenetreBtc:500,winSec:5
  }))],marketSnapshots:[...market,{asOf:stamp+MS,regimeLabel:'FUTURE_LABEL'}],
  asOf:end});
 assert.deepEqual(future.quality4x15,past.quality4x15);
 assert.deepEqual(future.current,past.current);
});
test('gap in Bâton 30s audit cannot be invented as full quarter coverage',()=>{
 const gap=audit.filter(x=>x.ts<stamp-35*60000||x.ts>stamp-15*60000);
 const x=core.calculate({audit:gap,marketSnapshots:market,asOf:stamp});
 assert.ok(x.quality4x15.some(b=>b.coverageFraction<.5));
 assert.ok(x.quality4x15.every(b=>b.coverageFraction<=1));
});
test('known price history creates contested direction when 3m and 5m disagree',()=>{
 const a=audit.map(x=>({...x}));
 const last=a.at(-1).ts;
 for(const x of a){
  if(x.ts===last-3*60000)x.lastPrice=65120;
  if(x.ts===last-5*60000)x.lastPrice=64900;
 }
 a.at(-1).lastPrice=65000;
 const d=core.calculate({audit:a,marketSnapshots:market,asOf:last});
 assert.equal(d.current.direction,'contested');
 assert.equal(d.current.quality,'CONTESTED');
});
test('volume effort and price yield baselines only read observations older than 3min',()=>{
 const prepared=core.prepareYield(core.prepareAudit(audit,stamp));
 const i=prepared.length-1;
 const before=core.sampleAt(prepared,core.normalizeMarket(market,stamp),i);
 const changed=prepared.map((x,k)=>k>=i-5?{...x,flow:25,yieldPerBtc:9000}:x);
 const after=core.sampleAt(changed,core.normalizeMarket(market,stamp),i);
 assert.equal(before.baselineFlowSamples,after.baselineFlowSamples);
 // Classification may react to CURRENT changed effort; prior p75 itself must
 // remain unaffected. Compare the same current point with future-only changes.
 const future=prepared.map((x,k)=>k===i+1?{...x,flow:25}:x);
 assert.equal(core.sampleAt(future,core.normalizeMarket(market,stamp),i).yieldVsP75,
  before.yieldVsP75);
});
test('reader and runner have no V494 PAPER path or trader side effect',()=>{
 const src=fs.readFileSync(path.resolve(__dirname,
  '../../modules/attention/boonolab-ticker4x15-runner.js'),'utf8');
 for(const s of ['v494-paper-state','v52-paper-state','v55-paper-state',
  'broker.step','paper.step','orderClient'])
  assert.equal(src.includes(s),false,s);
 const st=runner.initial();
 assert.equal(st.brokerOrdersEnabled,false);
 assert.equal(st.decisionImpact,false);
 assert.throws(()=>runner.evolve({...st,brokerOrdersEnabled:true},
  {asOf:stamp,audit,marketSnapshots:market},{persist:false}),/UNTRUSTED/);
 const test=runner.evolve(st,{asOf:stamp,audit,marketSnapshots:market},
   {persist:false});
 assert.equal(test.changed,true);
 assert.ok(test.events.length>0);
 assert.equal(test.summary.brokerOrdersEnabled,false);
});
