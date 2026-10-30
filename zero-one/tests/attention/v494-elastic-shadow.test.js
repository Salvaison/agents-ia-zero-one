'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const pure=require('../../modules/attention/v494-elastic-shadow');
const ui=require('../../modules/attention/v494-elastic-ui-summary');
const H=30000,BASE=1793367000000;
function evaluation(at,{pm3=30,pm5=35,y=1.1,y95=.6,effort=.5,
  campaign=BASE-60*60000}={}){
 return {marketTimestamp:at,price:80000,
   translation:{pmLive:{priceMoveUsd:12},horizons:{
     net3mUsd:pm3,net5mUsd:pm5,efficiency3m:.6,efficiency5m:.4}},
   ticker:{current:{ts:at,cadence:15,flowBtcPerSec:.6,
      yieldVsP75:y,yieldVsP95:y95,effortVsP75:effort}},
   mcb:{currentLobe:{startTs:campaign,structuralDirection:'long'}},
   setup:{campaignKey:'historical-test'}};
}
const edge=(side)=>({valid:true,low:79800,high:80200,positionFraction:side==='upper'?.98:.02,
   edgeBandFraction:.1,nearUpper:side==='upper',nearLower:side==='lower',
   coverageMinutes:120});
function ingest(s,at,option={},price=80000,range=edge('upper'),position=null,action=null,received=1000){
 const e=evaluation(at,option);e.price=price;
 const input={asOf:at,price,evaluation:e,range,position,quality:'DATA_OK',
   decision:action||{marketTs:at,type:'WAIT',reason:'TEST'}};
 return pure.advance(s,input,at+received);
}
test('Reuses original Elastic 0.5 effort/yield classification from V493 ticker',()=>{
 const at=BASE;
 assert.equal(pure.stateForEval(evaluation(at),null).quality,'EASY');
 assert.equal(pure.stateForEval(evaluation(at,{y:1.2,effort:1.3}),null).quality,'POWERFUL');
 assert.equal(pure.stateForEval(evaluation(at,{y:1.2,y95:1.1,effort:1.3}),null).quality,'EXCEPTIONAL');
 assert.equal(pure.stateForEval(evaluation(at,{y:.6,effort:1.3}),null).quality,'INEFFICIENT');
 assert.equal(pure.stateForEval(evaluation(at,{y:.6,effort:.8}),null).quality,'SILENT');
 assert.equal(pure.stateForEval(evaluation(at,{pm3:30,pm5:-32}),null).quality,'CONTESTED');
});
test('2h range uses only completed prior 3m bars, refuses insufficient coverage',()=>{
 const bars=Array.from({length:40},(_,i)=>({ts:BASE-(40-i)*180000,
    high:80000+i,low:79800+i}));
 const r=pure.rangeFromConfirmed3m(bars,BASE,80035);
 assert.equal(r.valid,true);assert.equal(r.count,40);
 assert.equal(r.high,80039);
 const future={ts:BASE+180000,high:100000,low:100};
 assert.equal(pure.rangeFromConfirmed3m([...bars,future],BASE,80035).high,80039);
 assert.equal(pure.rangeFromConfirmed3m(bars.slice(-9),BASE,80035).valid,false);
});
test('EASY 3 observations then CONTESTED at confirmed upper extreme => paired non-authoritative hypotheses',()=>{
 const s=pure.initial(BASE-1000);
 for(let i=0;i<3;i++)ingest(s,BASE+i*H,{pm3:31,pm5:34,y:1.2},80190,edge('upper'),{direction:'long'});
 const r=ingest(s,BASE+3*H,{pm3:20,pm5:-20},80196,edge('upper'),{direction:'long'});
 const transition=s.events.find(e=>e.kind==='EASY_TO_CONTESTED_AT_EXTREME');
 assert.ok(transition);assert.equal(transition.phase,'PROVISIONAL');
 assert.equal(transition.direction,'short');
 assert.equal(transition.entryHypothesis.direction,'short');
 assert.equal(transition.exitHypothesis.positionDirection,'long');
 assert.equal(transition.rangeEdge,'UPPER_2H');
 assert.equal(r.state.brokerOrdersEnabled,false);
 for(let i=4;i<6;i++)ingest(s,BASE+i*H,{pm3:20,pm5:-20},80195,edge('upper'),{direction:'long'});
 assert.equal(transition.phase,'CONFIRMED');
 assert.equal(s.latestQuality.quality,'CONTESTED');
 const t=ingest(s,BASE+6*H,{pm3:-40,pm5:-35,y:1.2,effort:.4},
   80150,edge('upper'),{direction:'long'});
 assert.ok(s.events.some(x=>x.kind==='CONTESTED_TO_EASY_OPPOSITE_CAMP'));
 assert.equal(t.state.mode,'SHADOW_ONLY');
});
test('same direction EASY after contested is reassertion, out-of-edge is control',()=>{
 const s=pure.initial(BASE-1000);
 for(let i=0;i<3;i++)ingest(s,BASE+i*H,{pm3:20,pm5:40},80000,edge('lower'));
 ingest(s,BASE+3*H,{pm3:20,pm5:-20},80000,edge('lower'));
 assert.ok(s.events.some(e=>e.kind==='EASY_TO_CONTESTED_OUTSIDE_EXTREME'));
 ingest(s,BASE+4*H,{pm3:25,pm5:30},80020,edge('upper'));
 assert.ok(s.events.some(e=>e.kind==='CONTESTED_TO_EASY_ORIGINAL_CAMP'));
 assert.equal(s.events.filter(x=>x.entryHypothesis).length,0);
});
test('POWERFUL resolve, annotate the actual V494 admission but never block it',()=>{
 const s=pure.initial(BASE-1000);
 ingest(s,BASE,{pm3:30,pm5:40,y:1.2,effort:1.3},80000,edge('upper'),
    null,{type:'ENTER_LONG',marketTs:BASE,reason:'V493_SOURCE'});
 assert.ok(s.events.some(e=>e.kind==='V494_BASELINE_ENTRY_STRONG'));
 assert.equal(s.lastRealActionTs,BASE);
 ingest(s,BASE+H,{pm3:20,pm5:30,y:1.2,effort:1.3},80030);
 ingest(s,BASE+2*H,{pm3:35,pm5:-30},80025);
 assert.ok(s.events.some(e=>e.kind==='POWERFUL_RESOLVED'));
 assert.ok(s.events.every(e=>e.decisionImpact===false&&e.brokerOrdersEnabled===false));
});
test('Prospective horizons are measured only from fresh steps; gap censored',()=>{
 const s=pure.initial(BASE-1000);
 ingest(s,BASE,{pm3:30,pm5:40},80000);
 for(let i=1;i<=34;i++)ingest(s,BASE+i*H,{pm3:30,pm5:40},
   80000+i,edge('upper'));
 const e=s.events.find(e=>e.kind==='QUALITY_CONFIRMED_EASY');
 assert.ok(e?.horizons['15']);assert.equal(e.horizons['15'].status,'MEASURED');
 assert.ok(e.horizons['15'].signedUsd>0);
 const z=pure.initial(BASE-1000);
 ingest(z,BASE,{pm3:30,pm5:40},80000);
 for(let i=1;i<=2;i++)ingest(z,BASE+i*H,{pm3:30,pm5:40},80000);
 ingest(z,BASE+45*H,{pm3:30,pm5:40},81000);
 const ee=z.events.find(e=>e.kind==='QUALITY_CONFIRMED_EASY');
 assert.ok(ee?.horizons['15']===undefined||ee.horizons['15'].status==='CENSORED');
});
test('Never evaluates stale input, mismatched as-of, or duplicate source sample',()=>{
 const s=pure.initial(BASE-1000);
 const e=evaluation(BASE),x={asOf:BASE,price:80000,evaluation:e,quality:'DATA_OK'};
 assert.equal(pure.advance(s,x,BASE+200000).changed,false);
 assert.equal(s.lastObservationAt,0);
 assert.throws(()=>pure.advance(s,{...x,asOf:BASE+5000},BASE+1000),
  /EVAL_NOT_SAME_AS_OF/);
 assert.equal(pure.advance(s,x,BASE+1000).changed,true);
 assert.equal(pure.advance(s,x,BASE+2000).changed,false);
});
test('Summary is bounded, 4x15 observation coverage and hostile UI payload rejected',()=>{
 const s=pure.initial(BASE-1000);
 ingest(s,BASE,{pm3:20,pm5:35},80000);
 const raw=pure.summary(s,BASE+1000);
 assert.equal(raw.fourByFifteen.length,4);
 assert.equal(raw.fourByFifteen[3].samples,1);
 const compact=ui.build(raw,BASE+1000);
 assert.equal(compact.decisionImpact,false);assert.equal(compact.brokerOrdersEnabled,false);
 assert.equal(compact.current.quality,'EASY');
 assert.equal(ui.build(raw,BASE+180000).status,'SOURCE_STALE');
 assert.throws(()=>ui.build({...raw,brokerOrdersEnabled:true},BASE+1000),
  /UNTRUSTED/);
 assert.throws(()=>pure.validate({...s,decisionImpact:true}),/NON_OBSERVATIONAL/);
});
