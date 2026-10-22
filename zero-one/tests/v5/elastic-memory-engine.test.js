'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {empty,step,processEvent,hourly}=require('../../modules/v5/elastic-memory-engine');
const t0=1792632600000;
const price=(ts,p=84000)=>({ts,price:p,lbw15:-40,lbw3:20,mf15:15,mf3:12,mf15Slope:-2,pmLive:-25});
const e=(id,at,family,key,type,dir,source=at,current=null,detail=null)=>({
 id,observedAt:at,sourceTs:source,price:84000,family,key,type,direction:dir,
 current:current===null?{type:dir==='long'?'UP':'DN',sourceTs:source}:current,detail});
test('E3 alone cannot assert an E15 campaign; native & BW/LBW cross are linked',()=>{
 let s=empty();
 s=step(s,price(t0),[e(1,t0-200,'MCB3','E3','OBSERVED','short')]).state;
 assert.equal(s.threads.length,0);
 const src=t0+30000;
 s=step(s,price(t0+30000),[e(2,t0+1000,'MCB15','E15','CONFIRMED','long',t0-900000),
  e(3,t0+15000,'MCB3','E3','OBSERVED','short',src),
  e(4,t0+20000,'MCB3','BW_LBW_CROSS','OBSERVED','short',src,
    {event:'BW_CROSSES_ABOVE_LBW',sourceTs:src})]).state;
 assert.equal(s.threads.length,1);
 assert.equal(s.threads[0].direction,'long');
 assert.equal(s.threads[0].attempts.length,1);
 assert.equal(s.threads[0].attempts[0].classification,'COUNTER_TEST');
 assert.equal(s.counts.linked,1);
 assert.equal(s.threads[0].events.at(-1).independentVote,false);
 assert.equal(s.threads[0].events.at(-1).linkedTo,3);
 assert.equal(s.anchor.confirmed.direction,'long');
});
test('E15 Live is provisional, not a confirmed replacement or an entry authorization',()=>{
 let s=empty();
 s=step(s,price(t0),[e(1,t0-1500,'MCB15','E15','CONFIRMED','long',t0-900000)]).state;
 s=step(s,price(t0+30000),[e(2,t0+20000,'MCB15','E15','OBSERVED','short',t0+15000)]).state;
 assert.equal(s.anchor.confirmed.direction,'long');
 assert.equal(s.anchor.live.direction,'short');
 assert.equal(s.threads.length,1,'not a new campaign for every live fluctuation');
 s=step(s,price(t0+60000),[e(3,t0+50000,'MCB15','E15','INTERRUPTED','short')]).state;
 assert.equal(s.anchor.live,null);
 assert.equal(s.anchor.confirmed.direction,'long');
 assert.equal(s.decisionImpact,false);
});
test('successive confirmed E15 anchors generate unresolved causal edges, never forced campaign switches',()=>{
 let s=empty();
 s=step(s,price(t0),[e(1,t0-5000,'MCB15','E15','CONFIRMED','long',t0-900000)]).state;
 s=step(s,price(t0+30000,83800),[e(2,t0+20000,'MCB15','E15','CONFIRMED','short',t0-15000)]).state;
 assert.equal(s.threads.length,2);
 assert.equal(s.lineageEdges.length,1);
 assert.equal(s.lineageEdges[0].relation,'OPPOSING_E15_TEST');
 assert.equal(s.lineageEdges[0].membership,'UNRESOLVED_CANDIDATE');
 assert.equal(s.anchor.confirmed.direction,'short');
});
test('4×15m quality ticker measures occupancy, not numerical average of classes',()=>{
 let s=empty(),k=0;
 for(let i=0;i<120;i++){
  const ts=t0+i*30000,dir=i<60?'short':'long',q=i<60?'INEFFICIENT':'POWERFUL';
  const events=[e(++k,ts,'CONVERSION','CONVERSION','TRANSITION',dir,ts,
     {quality:q,direction:dir},{pm3:dir==='long'?100:-100,
      pm5:dir==='long'?120:-120,yieldVsP75:i<60?.3:1.8,
      effortVsP75:i<60?2:1})];
  const r=step(s,price(ts,84000+i),events);s=r.state;
 }
 const h=s.hour;
 assert.equal(h.buckets.length,4);
 assert.equal(h.coverage,1);
 assert.equal(h.observedBias,null,'50/50 opposition does not fabricate dominance');
 assert.deepEqual(h.buckets.map(x=>x.count),[30,30,30,30]);
 assert.equal(h.buckets[0].inefficientShare,1);
 assert.equal(h.buckets[3].productiveShare,1);
 assert.equal(h.buckets[3].meanYieldVsP75,1.8);
 assert.equal(s.counts.samples,120);
 assert.equal(s.decisionImpact,false);
});
test('duplicate/outdated source timestamps never overwrite causal memory; missing samples do not fabricate quality',()=>{
 let s=empty();
 s=step(s,price(t0),[e(1,t0,'MCB15','E15','CONFIRMED','short',t0-900000)]).state;
 const old=s.lastSampleTs;
 assert.equal(step(s,price(old),[]).changed,false);
 assert.equal(step(s,{ts:t0+30000,price:84000},[]).reason,'MISSING_PRICE_OR_MCB');
 assert.equal(s.lastSampleTs,old);
 s=step(s,price(t0+30000),[e(1,t0,'MCB15','E15','CONFIRMED','long')]).state;
 assert.equal(s.anchor.confirmed.direction,'short','replayed duplicate id cannot rewrite anchor');
});
