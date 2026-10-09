'use strict';
const assert=require('assert');
const sequence=require('../../modules/v3lab/layers/sequence');
const wave=require('../../modules/v3lab/layers/wave');
const risk=require('../../modules/v3lab/layers/risk');
const action=require('../../modules/v3lab/layers/action');

function frame(price=100,ts=1_800_000_000_000){return {market:{price,timestamp:ts},sources:{auditRows:[]}};}
function dom(direction){return {state:'DOMINATION_PERSISTANTE',direction,proofScore:.8,retainedFraction:.8};}
function regime(){return {state:'TRANSLATION'};}

// 1. REVERSAL_FORMING can legitimately oppose the still-unflipped 15m phase.
{
  const f=frame(99);
  const pos={direction:'long',entryMode:'REVERSAL_FORMING',protectionPrice:95,reversalConfirmed:false,metrics:{adverseUsd:1}};
  const out=action.evaluate(f,{previous:{position:pos},wave:{direction:'short',phase:'DESCENTE'},dominance:dom('long'),risk:{emergencyGuardUsd:500,respiration:{currentState:'NORMAL'}},reversal:{}});
  assert.equal(out.type,'HOLD');
  assert.match(out.reason,/reversal forming/i);
}

// An opposite LBW phase alone no longer falsifies a still-active structural price thesis.
{
  const f=frame(99);
  const pos={direction:'long',entryMode:'PHASE_CONTINUATION',protectionPrice:95,reversalConfirmed:true,metrics:{adverseUsd:1}};
  const out=action.evaluate(f,{previous:{position:pos},wave:{direction:'short',phase:'DESCENTE',
    structural:{available:true,status:'ACTIVE',direction:'long'}},dominance:dom('long'),
    risk:{emergencyGuardUsd:500,respiration:{currentState:'NORMAL'}},reversal:{}});
  assert.equal(out.type,'HOLD');
}

// A newly confirmed opposite E15-to-E15 leg is a completed-leg observation, not an autonomous exit.
{
  const f=frame(99);
  const pos={direction:'long',entryMode:'PHASE_CONTINUATION',protectionPrice:95,reversalConfirmed:true,metrics:{adverseUsd:1}};
  const leg={available:true,status:'ACTIVE',direction:'short',
    start:{timestamp:'2026-09-29T10:00:00.000Z'},end:{timestamp:'2026-09-29T11:00:00.000Z'}};
  const out=action.evaluate(f,{previous:{position:pos},wave:{direction:'long',phase:'MONTEE',
    structural:leg,completedLeg:{...leg,decisionImpact:false}},dominance:dom('long'),
    risk:{emergencyGuardUsd:500,respiration:{currentState:'NORMAL'}},reversal:{}});
  assert.equal(out.type,'HOLD');
  assert.equal(out.counterfactual.completedLegExit.wouldExit,true);
  assert.equal(out.counterfactual.completedLegExit.oppositeCompletedLegDirection,'short');
}

// Frozen entry price protection remains authoritative but is not called trend invalidation.
{
  const f=frame(94);
  const pos={direction:'long',entryMode:'REVERSAL_FORMING',protectionPrice:95,reversalConfirmed:false,metrics:{adverseUsd:1}};
  const out=action.evaluate(f,{previous:{position:pos},wave:{direction:'short',phase:'DESCENTE'},dominance:dom('long'),risk:{emergencyGuardUsd:500,respiration:{currentState:'NORMAL'}},reversal:{}});
  assert.equal(out.type,'EXIT_RISK');
  assert.match(out.reason,/protection prix/i);
}

// Price extrema include causal 15m candle highs/lows missed by sampled audits/ticks.
{
  const ts=1_800_000_000_000;
  const f={market:{price:110,timestamp:ts+900_000},sources:{
    auditRows:[{ts,lastPrice:112}],liveTicks:[{ts:ts+60_000,price:115}],
    mcb:{tfs:{'15m':{
      history:[{ts,timestamp:new Date(ts).toISOString(),lt_blue_wave:10,close:108,high:125,low:80}],
      live:{ts:ts+900_000,timestamp:new Date(ts+900_000).toISOString(),lt_blue_wave:8,close:110,high:118,low:null},
    }}},
  }};
  const out=wave.pricePath(f,{ts,price:100},'DESCENTE');
  assert.equal(out.maxPrice,125);
  assert.equal(out.minPrice,80);
  assert.equal(out.candle15mCount,2);
}

// 2. Admission is impossible if the structure is already breached.
{
  const f=frame(99);
  const ctx={
    wave:{direction:'long',origin:{type:'CREUX',price:100},price:{counterExcursionUsd:0,minPrice:100,maxPrice:110}},
    dominance:dom('long'),regime:regime(),where:{relevant:true},sequence:{continuation:{locationReady:true,locationSource:'CURRENT_WHERE'}},reversal:{active:false},
  };
  const out=risk.evaluate(f,ctx);
  assert.equal(out.protection.breached,true);
  assert.equal(out.entryAllowed,false);
  assert.match(out.reason,/protection prix deja franchie/i);
}

// Same evidence with an intact structure remains admissible.
{
  const f=frame(120);
  const ctx={
    wave:{direction:'long',origin:{type:'CREUX',price:100},price:{counterExcursionUsd:0,minPrice:100,maxPrice:120}},
    dominance:dom('long'),regime:regime(),where:{relevant:true},sequence:{continuation:{locationReady:true,locationSource:'CURRENT_WHERE'}},reversal:{active:false},
  };
  const out=risk.evaluate(f,ctx);
  assert.equal(out.protection.breached,false);
  assert.equal(out.entryAllowed,true);
}

// The E15/LBW anchor is metadata, never the continuation invalidation price.
{
  const f=frame(110);
  const ctx={
    wave:{direction:'short',origin:{type:'CRETE',price:100},price:{counterExcursionUsd:10,minPrice:90,maxPrice:120}},
    dominance:dom('short'),regime:regime(),where:{relevant:true},
    sequence:{continuation:{locationReady:true,locationSource:'CURRENT_WHERE'}},reversal:{active:false},
  };
  const out=risk.evaluate(f,ctx);
  assert.equal(out.protection.price,120);
  assert.equal(out.protection.origin.basis,'MAX_PRICE_SINCE_E15');
  assert.equal(out.protection.origin.waveAnchor.price,100);
  assert.equal(out.protection.breached,false);
  assert.equal(out.entryAllowed,true);
}
{
  const f=frame(90);
  const ctx={
    wave:{direction:'long',origin:{type:'CREUX',price:100},price:{counterExcursionUsd:10,minPrice:80,maxPrice:110}},
    dominance:dom('long'),regime:regime(),where:{relevant:true},
    sequence:{continuation:{locationReady:true,locationSource:'CURRENT_WHERE'}},reversal:{active:false},
  };
  const out=risk.evaluate(f,ctx);
  assert.equal(out.protection.price,80);
  assert.equal(out.protection.origin.basis,'MIN_PRICE_SINCE_E15');
  assert.equal(out.protection.breached,false);
  assert.equal(out.entryAllowed,true);
}

// Missing observed price extremes fail closed.
{
  const f=frame(101);
  const ctx={
    wave:{direction:'long',origin:{type:'CREUX',price:100},price:{counterExcursionUsd:0}},
    dominance:dom('long'),regime:regime(),where:{relevant:true},
    sequence:{continuation:{locationReady:true,locationSource:'CURRENT_WHERE'}},reversal:{active:false},
  };
  const out=risk.evaluate(f,ctx);
  assert.equal(out.protection.ready,false);
  assert.equal(out.entryAllowed,false);
  assert.match(out.reason,/protection prix indisponible/i);
}

// 3. LGI is a neutral LOCATION: it can be reused for either direction and never creates support/resistance semantics.
{
  const f=frame(100);
  const lgiWhere={relevant:true,status:'RELEVANT',confidence:'MEDIUM',density:1,
    lgi:{activeCount:1,lines:[{projected:101,distanceUsd:1,side:'ABOVE'}]},sr:{interaction:null},ma200:{interaction:false}};
  const first=sequence.evaluate(f,{previous:null,where:lgiWhere,wave:{direction:'long'},dominance:dom('long')});
  assert.deepEqual(first.memory.where.compatibleDirections,[]);
  assert.equal(first.memory.where.neutralLocation,true);
  assert.equal(first.continuation.currentWhereCompatible,true);
  const laterFrame=frame(100,f.market.timestamp+60_000);
  const laterShort=sequence.evaluate(laterFrame,{previous:{lastEvaluation:{sequence:first}},where:{relevant:false},wave:{direction:'short'},dominance:dom('short')});
  assert.equal(laterShort.continuation.recentWhereExists,true);
  assert.equal(laterShort.continuation.recentWhereCompatible,true);
  assert.equal(laterShort.continuation.locationReady,true);
  assert.equal(laterShort.continuation.locationSource,'RECENT_WHERE');
}

// Fixed support/resistance levels are directional.
{
  const f=frame(100);
  const supportWhere={relevant:true,status:'RELEVANT',confidence:'MEDIUM',density:1,
    lgi:{activeCount:0,lines:[]},sr:{interaction:{family:'support',label:'DS',price:99,distanceUsd:-1}},ma200:{interaction:false}};
  const first=sequence.evaluate(f,{previous:null,where:supportWhere,wave:{direction:'long'},dominance:dom('long')});
  assert.deepEqual(first.memory.where.compatibleDirections,['long']);
  assert.equal(first.memory.where.neutralLocation,false);
  assert.equal(first.continuation.currentWhereCompatible,true);
  const wrong=sequence.evaluate(f,{previous:null,where:supportWhere,wave:{direction:'short'},dominance:dom('short')});
  assert.equal(wrong.continuation.currentWhereCompatible,false);
  assert.equal(wrong.continuation.locationReady,false);
}
{
  const f=frame(100);
  const resistanceWhere={relevant:true,status:'RELEVANT',confidence:'MEDIUM',density:1,
    lgi:{activeCount:0,lines:[]},sr:{interaction:{family:'resistance',label:'WR',price:101,distanceUsd:1}},ma200:{interaction:false}};
  const first=sequence.evaluate(f,{previous:null,where:resistanceWhere,wave:{direction:'short'},dominance:dom('short')});
  assert.deepEqual(first.memory.where.compatibleDirections,['short']);
  assert.equal(first.continuation.currentWhereCompatible,true);
}

// MA200 is directional: below price = support for long, above price = resistance for short.
{
  const f=frame(100);
  const maSupport={relevant:true,status:'RELEVANT',confidence:'MEDIUM',density:1,
    lgi:{activeCount:0,lines:[]},sr:{interaction:null},ma200:{interaction:true,nature:'SUPPORT',price:99.5,distanceUsd:-.5,timeframe:'15m'}};
  const out=sequence.evaluate(f,{previous:null,where:maSupport,wave:{direction:'long'},dominance:dom('long')});
  assert.deepEqual(out.memory.where.compatibleDirections,['long']);
  assert.equal(out.continuation.currentWhereCompatible,true);
}
{
  const f=frame(100);
  const maResistance={relevant:true,status:'RELEVANT',confidence:'MEDIUM',density:1,
    lgi:{activeCount:0,lines:[]},sr:{interaction:null},ma200:{interaction:true,nature:'RESISTANCE',price:100.5,distanceUsd:.5,timeframe:'15m'}};
  const out=sequence.evaluate(f,{previous:null,where:maResistance,wave:{direction:'short'},dominance:dom('short')});
  assert.deepEqual(out.memory.where.compatibleDirections,['short']);
  assert.equal(out.continuation.currentWhereCompatible,true);
}

// WHERE compatibility remains observable but cannot veto an otherwise admissible continuation.
{
  const f=frame(99);
  const ctx={
    wave:{direction:'short',origin:{type:'CRETE',price:100},price:{counterExcursionUsd:0,minPrice:90,maxPrice:120}},
    dominance:dom('short'),regime:regime(),where:{relevant:true},
    sequence:{continuation:{locationReady:false,locationSource:null}},reversal:{active:false},
  };
  const out=risk.evaluate(f,ctx);
  assert.equal(out.locationReady,false);
  assert.equal(out.eligibility.location.decisionImpact,false);
  assert.equal(out.entryAllowed,true);
  assert.doesNotMatch(out.reason,/localisation/i);
}


// Neutral LGI cannot override explicit directional level evidence at the same WHERE.
{
  const f=frame(100);
  const mixedWhere={relevant:true,status:'RELEVANT',confidence:'HIGH',density:2,
    lgi:{activeCount:1,lines:[{projected:100,distanceUsd:0,side:'ABOVE'}]},
    sr:{interaction:{family:'support',label:'DS',price:99,distanceUsd:-1}},ma200:{interaction:false}};
  const short=sequence.evaluate(f,{previous:null,where:mixedWhere,wave:{direction:'short'},dominance:dom('short')});
  const long=sequence.evaluate(f,{previous:null,where:mixedWhere,wave:{direction:'long'},dominance:dom('long')});
  assert.equal(short.continuation.currentWhereCompatible,false);
  assert.equal(long.continuation.currentWhereCompatible,true);
}

// A remembered resistance ceases to authorize a short after decisive acceptance above it.
{
  const f=frame(100);
  const resistanceWhere={relevant:true,status:'RELEVANT',confidence:'MEDIUM',density:1,
    lgi:{activeCount:0,lines:[]},sr:{interaction:{family:'resistance',label:'WR',price:101,distanceUsd:1}},ma200:{interaction:false}};
  const first=sequence.evaluate(f,{previous:null,where:resistanceWhere,wave:{direction:'short'},dominance:dom('short')});
  const later=sequence.evaluate(frame(205,f.market.timestamp+60_000),{previous:{lastEvaluation:{sequence:first}},where:{relevant:false},wave:{direction:'short'},dominance:dom('short')});
  assert.equal(later.continuation.recentWhereExists,true);
  assert.equal(later.continuation.recentWhereCompatible,false);
  assert.equal(later.continuation.locationReady,false);
  assert.equal(later.continuation.recentWhereInvalidation.reason,'RECENT_RESISTANCE_ACCEPTED_ABOVE');
}

// Eligibility: too little distance to invalidation compared with normal respiration is rejected.
{
  const ts=1_800_000_000_000;
  const audit=[];
  for(let i=0;i<20;i++)audit.push({ts:ts-i*60_000,lastPrice:100+(i%2?60:0)});
  const f={market:{price:109,timestamp:ts},sources:{auditRows:audit,levels:[]}};
  const out=risk.evaluate(f,{wave:{direction:'long',price:{minPrice:100,maxPrice:120,counterExcursionUsd:0,signedTranslationUsd:9,bestTranslationUsd:60}},
    dominance:dom('long'),regime:regime(),where:{},sequence:{continuation:{locationReady:true,locationSource:'CURRENT_WHERE'}},reversal:{active:false}});
  assert.equal(out.entryAllowed,false);
  assert.equal(out.eligibility.breathingRoom.blocked,true);
  assert.match(out.reason,/protection prix trop proche/i);
}

// Eligibility: structural R:R < 1 is rejected when a known landmark lies before equivalent reward.
{
  const f={market:{price:100,timestamp:1_800_000_000_000},sources:{auditRows:[],levels:[{label:'TARGET',fam:'support',price:95}],mcb:{tfs:{}}}};
  const out=risk.evaluate(f,{wave:{direction:'short',price:{minPrice:90,maxPrice:120,counterExcursionUsd:10,signedTranslationUsd:5,bestTranslationUsd:30}},
    dominance:dom('short'),regime:regime(),where:{},sequence:{continuation:{locationReady:true,locationSource:'CURRENT_WHERE'}},reversal:{active:false}});
  assert.equal(out.eligibility.rr.ratio,.25);
  assert.equal(out.eligibility.rr.blocked,true);
  assert.equal(out.entryAllowed,false);
  assert.match(out.reason,/R:R structurel insuffisant/i);
}

// Eligibility: a continuation phase whose counter-excursion overwhelms its best translation is stale for entry.
{
  const f={market:{price:130,timestamp:1_800_000_000_000},sources:{auditRows:[],levels:[]}};
  const out=risk.evaluate(f,{wave:{direction:'short',price:{minPrice:70,maxPrice:150,counterExcursionUsd:180,signedTranslationUsd:-120,bestTranslationUsd:60}},
    dominance:dom('short'),regime:regime(),where:{},sequence:{continuation:{locationReady:true,locationSource:'CURRENT_WHERE'}},reversal:{active:false}});
  assert.ok(out.eligibility.phaseMaturity.overrunRatio>2.5);
  assert.equal(out.eligibility.phaseMaturity.blocked,true);
  assert.equal(out.entryAllowed,false);
  assert.match(out.reason,/phase E15 depassee/i);
}


// Structural R:R uses causal E15 PRICE objectives before a nearby MA200 or a distant static level.
{
  const f={market:{price:100,timestamp:1_800_000_000_000},sources:{auditRows:[],levels:[{label:'WR',fam:'resistance',price:200}],mcb:{tfs:{'3m':{live:{ma200:105}}}}}};
  const out=risk.evaluate(f,{
    wave:{direction:'short',structural:{available:true,status:'ACTIVE',direction:'long',reclaimPrice:150},
      nested3m:{direction:'long'},price:{minPrice:80,maxPrice:160,counterExcursionUsd:20,signedTranslationUsd:20,bestTranslationUsd:50}},
    dominance:dom('long'),regime:regime(),where:{},
    sequence:{locationByDirection:{long:{locationReady:true,locationSource:'CURRENT_WHERE'}},
      memory:{turning:{direction:'long'}},agesMs:{turning:60_000}},reversal:{active:false}
  });
  assert.equal(out.eligibility.rr.target.kind,'MAJOR_E15_RECLAIM');
  assert.equal(out.eligibility.rr.target.price,150);
  assert.equal(out.eligibility.rr.ratio,2.5);
  assert.equal(out.entryAllowed,true);
}

// Once the confirmed endpoint is reclaimed, the local price-path extreme remains the causal target.
{
  const f={market:{price:130,timestamp:1_800_000_000_000},sources:{auditRows:[],levels:[{label:'WR',fam:'resistance',price:1000}],mcb:{tfs:{}}}};
  const out=risk.evaluate(f,{
    wave:{direction:'long',structural:{available:true,status:'ACTIVE',direction:'long',reclaimPrice:100},
      price:{minPrice:120,maxPrice:150,counterExcursionUsd:0,signedTranslationUsd:30,bestTranslationUsd:50}},
    dominance:dom('long'),regime:regime(),where:{},
    sequence:{locationByDirection:{long:{locationReady:true,locationSource:'CURRENT_WHERE'}}},reversal:{active:false}
  });
  assert.equal(out.eligibility.rr.target.kind,'STRUCTURAL_EXTREME');
  assert.equal(out.eligibility.rr.target.price,150);
  assert.equal(out.eligibility.rr.ratio,2);
}

// A completed major E15-to-E15 leg stays descriptive; active thesis comes from the latest major pivot + price translation.
{
  const s15={latest:{type:'CREUX',price:200,lbw:-60,ts:2_000_000},pivots:[
    {type:'CRETE',price:300,lbw:55,ts:1_000_000},
    {type:'CREUX',price:200,lbw:-60,ts:2_000_000}
  ]};
  const completed=wave.structuralLeg(s15,240);
  assert.equal(completed.available,true);
  assert.equal(completed.direction,'short');
  assert.equal(completed.status,'COMPLETED');
  assert.equal(completed.lbwSpan,115);
  const path={bestTranslationUsd:80,signedTranslationUsd:40};
  const active=wave.activeThesisFromMajor(s15,path,completed);
  assert.equal(active.available,true);
  assert.equal(active.status,'ACTIVE');
  assert.equal(active.direction,'long');
  assert.equal(active.reclaimPrice,300);
}

// Flat/rounded lobe bottoms are major E15s even when the adjacent-bar local amplitude is <2.
{
  const base=1_800_000_000_000;
  const vals=[-10,10,40,61.349,43,10,-7.457,-32.8,-48,-62.4,-69.759,-69.921,-65.559,-31.686,-15.231,1.364,14.198,22.032,25.481,25.058];
  const prices=[84000,84100,84250,84544.9,84320,84100,83900,83700,83390,82962,83049,82937.9,83219,83400,83394,83600,83619,83567,83526,83512];
  const history=vals.map((v,i)=>({
    ts:base+i*900_000,timestamp:new Date(base+i*900_000).toISOString(),
    lt_blue_wave:v,blue_wave:v,money_flow:0,close:prices[i],
    high:prices[i]+50,low:(i===12?82850.8:prices[i]-50)
  }));
  const local=wave.confirmedPivots({history},2);
  assert.equal(local.some(p=>p.type==='CREUX'&&Math.abs(p.lbw+69.921)<1e-6),false);
  const major=wave.completedLobePivots({history});
  const last=major[major.length-1];
  assert.equal(last.type,'CREUX');
  assert.ok(Math.abs(last.lbw+69.921)<1e-6);
  assert.equal(last.major,true);
  const f={market:{price:83620,timestamp:base+history.length*900_000},sources:{
    auditRows:[],liveTicks:[],mcb:{tfs:{'15m':{history},'3m':{history:[]}}}
  }};
  const out=wave.evaluate(f);
  assert.equal(out.phase,'MONTEE');
  assert.equal(out.direction,'long');
  assert.equal(out.origin.type,'CREUX');
  assert.ok(Math.abs(out.origin.lbw+69.921)<1e-6);
  assert.equal(out.completedLeg.direction,'short');
  assert.ok(out.completedLeg.lbwSpan>130);
  assert.equal(out.structural.status,'ACTIVE');
  assert.equal(out.structural.direction,'long');
  assert.equal(out.price.minPrice,82850.8);
}

// An active structural LONG thesis overrides an opposite LBW/reversal candidate, but can re-enter on a fresh 3m reassertion.
{
  const f={market:{price:130,timestamp:1_800_000_000_000},sources:{auditRows:[],levels:[]}};
  const out=risk.evaluate(f,{
    wave:{direction:'short',phase:'DESCENTE',structural:{available:true,status:'ACTIVE',direction:'long'},
      nested3m:{direction:'long'},price:{minPrice:120,maxPrice:150,counterExcursionUsd:20,signedTranslationUsd:20,bestTranslationUsd:50}},
    dominance:dom('long'),regime:regime(),where:{},
    sequence:{locationByDirection:{long:{locationReady:true,locationSource:'CURRENT_WHERE'}},
      memory:{turning:{direction:'long'}},agesMs:{turning:60_000}},
    reversal:{active:true,direction:'short',protectionPrice:150}
  });
  assert.equal(out.direction,'long');
  assert.equal(out.entryMode,'STRUCTURAL_REASSERTION');
  assert.equal(out.thesis.counterThesisCandidateBlocked,true);
  assert.equal(out.eligibility.reassertion.ready,true);
  assert.equal(out.entryAllowed,true);
}

// Structural reassertion requires a fresh turning point; stale memory cannot reopen a trade.
{
  const f={market:{price:130,timestamp:1_800_000_000_000},sources:{auditRows:[],levels:[]}};
  const out=risk.evaluate(f,{
    wave:{direction:'short',phase:'DESCENTE',structural:{available:true,status:'ACTIVE',direction:'long'},
      nested3m:{direction:'long'},price:{minPrice:100,maxPrice:150,counterExcursionUsd:20,signedTranslationUsd:20,bestTranslationUsd:50}},
    dominance:dom('long'),regime:regime(),where:{},
    sequence:{locationByDirection:{long:{locationReady:true,locationSource:'CURRENT_WHERE'}},
      memory:{turning:{direction:'long'}},agesMs:{turning:7*60_000}},
    reversal:{active:false}
  });
  assert.equal(out.entryMode,'STRUCTURAL_REASSERTION');
  assert.equal(out.eligibility.reassertion.ready,false);
  assert.equal(out.entryAllowed,false);
}

// Structural reassertion keeps WHERE as context: a fresh 3m/turning/dominance chain does not require CURRENT_WHERE.
{
  const f={market:{price:130,timestamp:1_800_000_000_000},sources:{auditRows:[],levels:[]}};
  const out=risk.evaluate(f,{
    wave:{direction:'short',phase:'DESCENTE',structural:{available:true,status:'ACTIVE',direction:'long'},
      nested3m:{direction:'long'},price:{minPrice:100,maxPrice:160,counterExcursionUsd:20,signedTranslationUsd:20,bestTranslationUsd:50}},
    dominance:dom('long'),regime:regime(),where:{},
    sequence:{locationByDirection:{long:{locationReady:true,locationSource:'RECENT_WHERE'}},
      memory:{turning:{direction:'long'}},agesMs:{turning:60_000}},
    reversal:{active:false}
  });
  assert.equal(out.entryMode,'STRUCTURAL_REASSERTION');
  assert.equal(out.eligibility.reassertion.freshTurningAligned,true);
  assert.equal(out.eligibility.reassertion.currentLocation,false);
  assert.equal(out.eligibility.reassertion.locationRequired,false);
  assert.equal(out.eligibility.reassertion.ready,true);
  assert.equal(out.entryAllowed,true);
  assert.doesNotMatch(out.reason,/WHERE courant requis/i);
}

// Same-thesis continuation that has given back more than half no longer re-enters as plain continuation.
{
  const f={market:{price:130,timestamp:1_800_000_000_000},sources:{auditRows:[],levels:[]}};
  const out=risk.evaluate(f,{
    wave:{direction:'long',phase:'MONTEE',structural:{available:true,status:'ACTIVE',direction:'long'},
      nested3m:{direction:'long'},price:{minPrice:100,maxPrice:200,counterExcursionUsd:70,signedTranslationUsd:30,bestTranslationUsd:100}},
    dominance:dom('long'),regime:regime(),where:{},
    sequence:{locationByDirection:{long:{locationReady:true,locationSource:'CURRENT_WHERE'}},memory:{},agesMs:{}},
    reversal:{active:false}
  });
  assert.equal(out.entryMode,'STRUCTURAL_REASSERTION');
  assert.equal(out.eligibility.phaseMaturity.retainedFraction,.3);
  assert.equal(out.eligibility.phaseMaturity.lowRetention,true);
  assert.equal(out.eligibility.reassertion.required,true);
  assert.equal(out.eligibility.reassertion.ready,false);
  assert.equal(out.entryAllowed,false);
  assert.match(out.reason,/turning point frais absent/i);
}

// 4. A mature trade that gives back >50% of its MFE under a durable opposite transfer exits early.
{
  const f=frame(140);
  const pos={direction:'long',entryPrice:100,entryMode:'PHASE_CONTINUATION',protectionPrice:80,reversalConfirmed:true,
    metrics:{adverseUsd:0,mfeUsd:60,favorableUsd:20}};
  const opp={state:'DOMINATION_PERSISTANTE',direction:'short',proofScore:.8,retainedFraction:1,persistCount:4};
  const out=action.evaluate(f,{previous:{position:pos},wave:{direction:'long',phase:'MONTEE'},dominance:opp,
    risk:{emergencyGuardUsd:500,respiration:{currentState:'NORMAL',p50:100}},reversal:{}});
  assert.equal(out.type,'EXIT_EXECUTION');
  assert.match(out.reason,/transfert adverse durable/i);
  assert.ok(out.evidence.givebackFraction>=.5);
}

// A small/immature favorable excursion still tolerates opposite dominance in normal respiration.
{
  const f=frame(101);
  const pos={direction:'long',entryPrice:100,entryMode:'PHASE_CONTINUATION',protectionPrice:80,reversalConfirmed:true,
    metrics:{adverseUsd:0,mfeUsd:8,favorableUsd:2}};
  const opp={state:'DOMINATION_PERSISTANTE',direction:'short',proofScore:.8,retainedFraction:1,persistCount:4};
  const out=action.evaluate(f,{previous:{position:pos},wave:{direction:'long',phase:'MONTEE'},dominance:opp,
    risk:{emergencyGuardUsd:500,respiration:{currentState:'NORMAL',p50:100}},reversal:{}});
  assert.equal(out.type,'HOLD');
}


// R1.2: legacy positions keep the old P90 exit; new positions downgrade the same condition to an alert.
{
  const f=frame(100);
  const ctxBase={
    wave:{direction:'long',phase:'MONTEE',structural:{available:true,status:'ACTIVE',direction:'long'}},
    dominance:{state:'DOMINATION_PERSISTANTE',direction:'short',proofScore:.8,retainedFraction:.9,persistCount:3},
    risk:{emergencyGuardUsd:500,respiration:{currentState:'UNUSUAL',p90:200,currentCounterExcursionUsd:220,p50:100}},
    reversal:{}
  };
  const legacyPos={direction:'long',entryMode:'PHASE_CONTINUATION',protectionPrice:95,reversalConfirmed:true,
    metrics:{adverseUsd:1,mfeUsd:0,favorableUsd:0}};
  const oldOut=action.evaluate(f,{previous:{position:legacyPos},...ctxBase});
  assert.equal(oldOut.type,'EXIT_EXECUTION');
  assert.match(oldOut.reason,/p90/i);

  const newPos={...legacyPos,p90Policy:'ALERT_ONLY'};
  const newOut=action.evaluate(f,{previous:{position:newPos},...ctxBase});
  assert.equal(newOut.type,'HOLD');
  assert.equal(newOut.alerts.oppositeAttackP90.active,true);
  assert.equal(newOut.alerts.oppositeAttackP90.policy,'ALERT_ONLY');
  assert.match(newOut.alerts.oppositeAttackP90.semantic,/NOT_ACCEPTANCE/i);
}

console.log('V3 coherence regression: OK');
