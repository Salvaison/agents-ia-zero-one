'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const shadow=require('../../modules/attention/v494-dual-module-shadow');
const view=require('../../modules/attention/v494-dual-ui-summary');
const AT=1793390200000, ENTRY=80000, MARKET=80400;
function position(overrides={}){
 return {direction:'long',entryAt:AT-600000,entryPrice:ENTRY,
  lastPrice:MARKET,initialNotionalUsd:1500,notionalUsd:1500,
  entryFeeUsd:.75,partialFeesUsd:0,realizedGrossUsd:0,tp1Taken:false,
  metrics:{mfeUsd:500,maeUsd:65,currentSignedUsd:MARKET-ENTRY},
  ...overrides};
}
function state(){
 const s=shadow.initial(AT-900000);
 s.lastObservationAt=AT;s.observations=15;
 for(const v of Object.values(s.branches)){
  v.entries=1;v.position=position();
 }
 return s;
}
const lanes=s=>view.build(shadow.summary(s),AT+1000);
test('Mark estimate includes both entry and exit taker costs at observed BTC price',()=>{
 const x=shadow.markedPosition(position());
 const expected=1500*(MARKET-ENTRY)/ENTRY-.75-
    1500*.0005*MARKET/ENTRY;
 assert.equal(x.positionNetIfClosedUsd,Math.round(expected*10000)/10000);
 assert.ok(Math.abs(x.estimatedRemainingExitFeeUsd-1500*.0005*MARKET/ENTRY)<.00011);
 assert.equal(x.partialGrossUsd,0);
 assert.equal(x.priceUsd,MARKET);
 assert.match(x.methodology,/PARTIAL_GROSS_PLUS_REMAINING_MARK/);
});
test('TP1 gross is retained once, partial fees paid once, remaining exit fee estimated once',()=>{
 const remaining=1125,partialGross=375*(80600-ENTRY)/ENTRY;
 const partialFee=375*.0005*80600/ENTRY, exitMark=80700;
 const p=position({lastPrice:exitMark,notionalUsd:remaining,
  realizedGrossUsd:partialGross,partialFeesUsd:partialFee,
  tp1Taken:true,metrics:{mfeUsd:900,maeUsd:100,currentSignedUsd:700}});
 const x=shadow.markedPosition(p);
 const expected=partialGross+remaining*(exitMark-ENTRY)/ENTRY-
   .75-partialFee-remaining*.0005*exitMark/ENTRY;
 assert.equal(x.positionNetIfClosedUsd,Math.round(expected*10000)/10000);
 assert.equal(x.partialGrossUsd,Math.round(partialGross*10000)/10000);
 assert.equal(x.partialFeesUsd,Math.round(partialFee*10000)/10000);
 const s=state(),b=s.branches[shadow.ROUTES[0].id];
 b.realizedNetUsd=2.125;b.completed=1;b.entries=2;
 b.position=p;b.history=[{direction:'long',netPnlUsd:2.125}];
 const data=lanes(s),lane=data.branches[0];
 assert.equal(lane.markedPortfolioNetUsd,
  Math.round((2.125+x.positionNetIfClosedUsd)*10000)/10000);
 assert.equal(lane.position.markedNetIfClosedUsd,x.positionNetIfClosedUsd);
 assert.equal(lane.position.partialGrossUsd,x.partialGrossUsd);
 assert.equal(lane.position.tp1Taken,true);
 assert.equal(data.descriptiveDiff.exitWithExactEntry,null);
});
test('Four equal live positions expose 0 provisional differences, not realized PNL',()=>{
 const v=lanes(state());
 assert.equal(v.status,'DATA_RECENT');
 assert.equal(v.comparisonReadiness.status,'SAME_EXPOSURE_NO_CONTRAST_YET');
 assert.equal(v.comparisonReadiness.sameExposureAllFour,true);
 assert.equal(v.descriptiveDiff.exitWithExactEntry,null);
 assert.equal(v.descriptiveDiff.interactionContrast,null);
 assert.equal(v.markedDiff.exitWithExactEntry,0);
 assert.equal(v.markedDiff.exitWithFilteredEntry,0);
 assert.equal(v.markedDiff.entryWithOriginalExit,0);
 assert.equal(v.markedDiff.entryWithSupervisorExit,0);
 assert.equal(v.markedDiff.interactionContrast,0);
 assert.ok(v.branches[0].markedPortfolioNetUsd>0);
 assert.ok(Buffer.byteLength(JSON.stringify(v))<25000);
});
test('Early exit in B: realized B minus still-open A is shown as provisional but realized remains pending',()=>{
 const s=state(),a=s.branches[shadow.ROUTES[0].id],
  b=s.branches[shadow.ROUTES[1].id];
 b.position=null;b.realizedNetUsd=3.22;b.completed=1;
 b.history=[{direction:'long',netPnlUsd:3.22}];
 s.influenceEvents=[{type:'EXIT_INFLUENCES_ENTRY_EXPOSURE',ts:AT}];
 s.lastRealComparison={comparableAtSameStep:true,sameExposure:false,
    actualCompleted:50,baselineCompleted:1};
 const v=lanes(s);
 assert.equal(v.descriptiveDiff.exitWithExactEntry,null);
 assert.equal(v.markedDiff.exitWithExactEntry,
  Math.round((3.22-v.branches[0].markedPortfolioNetUsd)*10000)/10000);
 assert.equal(v.comparisonReadiness.status,'EXPOSURE_DIVERGED');
 assert.equal(v.comparisonReadiness.sameExposureAllFour,false);
 assert.equal(v.branches[1].markedValuationStatus,'FLAT_CLOSED_PORTFOLIO');
});
test('When both pair branches have closed results, realized contrasts become available',()=>{
 const s=state(),a=s.branches[shadow.ROUTES[0].id],
  b=s.branches[shadow.ROUTES[1].id];
 a.position=null;a.completed=1;a.realizedNetUsd=5;
 b.position=null;b.completed=1;b.realizedNetUsd=7.5;
 const v=lanes(s);
 assert.equal(v.descriptiveDiff.exitWithExactEntry,2.5);
 assert.equal(v.markedDiff.exitWithExactEntry,2.5);
 assert.equal(v.descriptiveDiff.interactionContrast,null);
 assert.equal(v.comparisonReadiness.allHaveClosed,false);
});
test('No trades is not displayed as a proven zero-dollar contrast',()=>{
 const s=state();
 for(const b of Object.values(s.branches)){b.entries=0;b.position=null;}
 const v=lanes(s);
 assert.equal(v.comparisonReadiness.status,'NO_EXPOSURE_YET');
 assert.equal(v.descriptiveDiff.exitWithExactEntry,null);
 assert.equal(v.markedDiff.exitWithExactEntry,null);
 assert.equal(v.markedDiff.interactionContrast,null);
});
test('Missing market mark or stale source does not fabricate a positive live result',()=>{
 const s=state(),b=s.branches[shadow.ROUTES[0].id];
 b.position.lastPrice=null;
 // Invalid mark should be explicit, never treated as an observed fill.
 assert.equal(shadow.markedPosition({...position(),lastPrice:NaN}),null);
 // For null fields, same safety property applies.
 assert.equal(shadow.markedPosition({...position(),lastPrice:null}),null);
 const v=lanes(s);
 assert.equal(v.branches[0].markedPortfolioNetUsd,null);
 assert.equal(v.markedDiff.exitWithExactEntry,null);
 assert.equal(view.build(shadow.summary(state()),AT+180000).status,'SOURCE_STALE');
});
