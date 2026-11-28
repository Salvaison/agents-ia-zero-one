'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../../modules/v554/market'),D=require('../../modules/v554/decision'),A=require('../../modules/v554/account');
const MIN=60000,base=Date.parse('2026-11-24T00:00:00Z');
const bars={};
const bar=(closeAt,L,B,price)=>({sourceAt:closeAt-60*MIN,closeAt,L,B,price,mf:0,high:price+20,low:price-20});
function higherCtx(d=1,at=base+60*MIN){
 const previous=bar(at-60*MIN,0,0,60000),latest=bar(at,d*10,d*3,60000+d*100);
 return {latest,previous,lastNative:{direction:'DN'}};
}
function hyp(d,at,over={}){
 return {direction:d,eligible:d==='UP',state:'NEW_IMPULSE',reason:'PROOF',initiativeId:'INIT_'+d,knownActualCross:true,
  crossTravel:20,variantA:false,variantB:false,evidence:{proof:null},...over};
}
function market(at,over={}){
 return {asOf:at,sourceAt:at,price:60000,noise:10,geometry:{gapSide:'UP',k:{3:{L:1,G:1}},tactical:{side:'UP'},conversion:{pm3:15}},
  liveCross:{type:'CROSS15_LIVE',direction:'UP',sourceAt:at-60000,price:59980},
  hypotheses:{UP:hyp('UP',at),DN:hyp('DN',at)},...over};
}
function tick(a,m,ts,price,extra={}){return A.step(a,m,{ts,price,fresh:true,healthy:true,bars,...extra});}
test('1h trajectory authority, not last E1 sign',()=>{
 const at=base+60*MIN;
 assert.equal(M.higher(higherCtx(1,at),at,'UP','1h').state,'PRODUCTIVE_SUPPORT');
 assert.equal(M.higher(higherCtx(1,at),at,'UP','1h').native,'DN');
 assert.equal(M.higher(higherCtx(-1,at),at,'UP','1h').state,'PRODUCTIVE_OPPOSITION');
 assert.equal(M.higher(higherCtx(1,at),at-1,'UP','1h').state,'UNKNOWN');
 assert.equal(M.higher(higherCtx(1,at),at+63*MIN,'UP','1h').state,'UNKNOWN');
});
test('reject old market source and future knowledge',()=>{
 const a=A.initial(base);
 assert.equal(tick(a,market(base+2*MIN),base+MIN,60000).decision.action,'WAIT');
 assert.equal(tick(a,market(base),base+2*MIN,60000).decision.action,'WAIT');
 assert.equal(a.completed,0);
});
test('one initiative entry; trade never changes market clock',()=>{
 const a=A.initial(base),m=market(base+MIN),snapshot=JSON.stringify(m);
 assert.equal(tick(a,m,base+MIN,60000).decision.action,'ENTER_LONG');
 assert.equal(JSON.stringify(m),snapshot);
 // Risk remains active when market health is bad; no source-based veto on exits.
 assert.equal(tick(a,null,base+2*MIN,59499,{healthy:false}).trade.exitReason,'V554_HARD_RISK_500_BTC_PRICE_USD');
 assert.equal(a.completed,1);
 const next=market(base+3*MIN);
 assert.equal(tick(a,next,base+3*MIN,60000).decision.reason,'INITIATIVE_ALREADY_EXPLOITED_NO_NEW_PROOF');
 const x=market(base+4*MIN);
 x.hypotheses.UP.evidence.proof={id:'NEW',sourceAt:base+4*MIN,price:60030,level:60010};
 x.price=60030;
 assert.equal(tick(a,x,base+4*MIN,60030).decision.action,'ENTER_LONG');
 assert.equal(a.position.initiativeId,'INIT_UP');
});
test('reused / pre-exit proof cannot rearm same initiative',()=>{
 const a=A.initial(base);a.usedInitiatives.INIT_UP={at:base,proofId:'OLD',price:60000,peakPrice:60100};a.lastExit={at:base+MIN};
 const m=market(base+2*MIN);m.price=60140;m.hypotheses.UP.evidence.proof={id:'NEW',sourceAt:base+MIN-1,level:60100};
 assert.equal(D.candidate(m,a,60140).reason,'INITIATIVE_ALREADY_EXPLOITED_NO_NEW_PROOF');
 m.hypotheses.UP.evidence.proof.sourceAt=base+2*MIN;m.price=60090;m.hypotheses.UP.evidence.proof.level=60070;
 assert.equal(D.candidate(m,a,60090).reason,'INITIATIVE_ALREADY_EXPLOITED_NO_NEW_PROOF');
});
test('A/B comparator variants do not alter market history; B distinguishes conversion',()=>{
 const a=A.initial(base),m=market(base+MIN);
 m.hypotheses.UP.variantA=true;m.hypotheses.UP.variantB=false;
 m.hypotheses.UP.evidence.proof={id:'P',sourceAt:m.sourceAt,level:59980};
 assert.equal(D.candidate(m,a,60000,'TRAJECTORY').action,'ENTER_LONG');
 assert.equal(D.candidate(m,a,60000,'A').reason,'EXPERIMENTAL_ANTI_PHASE_A');
 assert.equal(D.candidate(m,a,60000,'B').action,'ENTER_LONG');
 m.hypotheses.UP.variantB=true;
 assert.equal(D.candidate(m,a,60000,'B').reason,'EXPERIMENTAL_ANTI_PHASE_B');
});
test('no late chase between market observation and public fill',()=>{
 const a=A.initial(base),m=market(base+MIN);
 assert.equal(D.candidate(m,a,60021).reason,'PRICE_ALREADY_MOVED_SINCE_PROOF');
 assert.equal(D.candidate(m,a,59979).reason,'PRICE_PROOF_RETRACTED');
});
test('no gain floor at 120/90 or other threshold',()=>{
 const a=A.initial(base);tick(a,market(base+MIN),base+MIN,60000);
 assert.equal(tick(a,market(base+2*MIN),base+2*MIN,60140).decision.action,'HOLD');
 assert.equal(tick(a,market(base+3*MIN),base+3*MIN,60085).decision.action,'HOLD');
 assert.equal(a.position.mfePriceUsd,140);assert.equal(a.completed,0);
});
test('actual adverse Cross must be after entry; two unique observations',()=>{
 const a=A.initial(base);tick(a,market(base+MIN),base+MIN,60000);
 const at=base+2*MIN;
 const m=market(at,{price:59980,geometry:{gapSide:'DN',k:{3:{L:-1,G:-1}},tactical:{side:'DN'},conversion:{pm3:-20}},
  liveCross:{type:'CROSS15_LIVE',direction:'DN',sourceAt:at,price:60010}});
 assert.equal(tick(a,m,at,59980).decision.action,'HOLD');
 assert.equal(tick(a,m,at+1000,59979).decision.action,'HOLD');
 m.sourceAt=at+30000;m.asOf=m.sourceAt;
 const o=tick(a,m,m.sourceAt,59970);assert.equal(o.trade.exitReason,'V554_REAL_CROSS_ADVERSE_TRANSLATED');
});
test('pre-cross structural loss needs price and two unique observations; cross-only control holds',()=>{
 const a=A.initial(base),b=A.initial(base);
 for(const q of [a,b]){tick(q,market(base+MIN),base+MIN,60000);q.position.defense={level:59970,knownAt:base};}
 const at=base+2*MIN,m=market(at,{price:59945,geometry:{gapSide:'UP',k:{3:{L:-2,G:-2}},tactical:{side:'DN'},conversion:{pm3:-30}}});
 assert.equal(tick(a,m,at,59945).decision.action,'HOLD');
 tick(b,m,at,59945,{early:false});
 assert.equal(tick(a,m,at+1000,59944).decision.action,'HOLD');
 m.sourceAt=at+30000;m.asOf=m.sourceAt;
 assert.equal(tick(a,m,m.sourceAt,59940).trade.exitReason,'V554_STRUCTURAL_DEFENSE_LOST');
 assert.equal(tick(b,m,m.sourceAt,59940,{early:false}).decision.action,'HOLD');
});
function fake(s,at,price,d='UP',crossAt=at-10*MIN){
 const k=M.sg(d),other=d==='UP'?'DN':'UP',g={sourceAt:at,price,L:k*20,B:k*10,G:k*10,gapSide:d,k:{3:{L:k,G:k},15:{L:k,G:k}},tactical:{side:d},conversion:{pm3:k*30,pmLive:k*15}};
 const origin={sourceAt:at-20*MIN,price:price-k*50};
 const h={initiative:{id:'I_'+d,origin,originKind:'PRE_CROSS_LBW_ROTATION',progress:{ageMin:20}},origin:{sourceAt:at-MIN,price:price-k*20},attemptId:'ATT',evolution:'OUVERTURE_DANS_LE_SENS'};
 const o={initiative:{id:'I_'+other,origin,originKind:'PRE_CROSS_LBW_ROTATION',progress:{ageMin:20}},origin:{sourceAt:at-MIN,price},attemptId:'B',evolution:'ELOIGNEMENT_DU_CROSS'};
 return {available:true,asOf:at,sourceAt:at,geometry:g,liveCross:{type:'CROSS15_LIVE',direction:d,sourceAt:crossAt,price:price-k*20},
 hypotheses:{[d]:h,[other]:o}};
}
test('actual cross age remains the same source timestamp across local candidate changes',()=>{
 const s=M.initial(base),at=base+60*MIN;
 s.trajectory.rows=Array.from({length:121},(_,j)=>({ts:base+j*30000,price:59950+(j%20),L:1,B:0}));
 const c=at-20*MIN,i=fake(s,at,59960,'UP',c);
 const ctx={'1h':higherCtx(1,at),'4h':{latest:bar(at,1,0,60000),previous:{...bar(at-240*MIN,0,0,59900),closeAt:at-240*MIN}},'3m':{medianRange:50}};
 const z=M.sync(s,i,ctx,{at,quality:'EASY'});
 assert.equal(z.hypotheses.UP.crossAt,c);assert.equal(z.hypotheses.UP.crossAgeMin,20);
 i.geometry.sourceAt+=30000;i.asOf+=30000;i.hypotheses.UP.origin.sourceAt+=30000;
 const y=M.sync(s,i,ctx,{at,quality:'EASY'});
 assert.equal(y.hypotheses.UP.crossAt,c);assert.equal(y.hypotheses.UP.crossAgeMin,20.5);
});
test('suspension not lifted by favorable local readings inside frozen range',()=>{
 const s=M.initial(base),at=base+60*MIN;
 s.trajectory.rows=Array.from({length:121},(_,j)=>({ts:base+j*30000,price:59980+(j%20),L:1,B:0}));
 s.suspension={since:at-5*MIN,range:{low:59800,high:60100},beyond:{UP:0,DN:0}};
 const i=fake(s,at,60000);
 const ctx={'1h':higherCtx(1,at),'4h':{latest:bar(at,1,0,60000),previous:{...bar(at-240*MIN,0,0,59900),closeAt:at-240*MIN}},'3m':{medianRange:50}};
 const z=M.sync(s,i,ctx,{at,quality:'EASY'});
 assert.equal(z.hypotheses.UP.state,'CONTESTED_TRAJECTORY');assert.ok(s.suspension);
 i.geometry.price=60150;i.asOf+=30000;i.geometry.sourceAt+=30000;
 M.sync(s,i,ctx,{at,quality:'EASY'});assert.ok(s.suspension);
 i.geometry.sourceAt+=30000;i.asOf+=30000;
 const q=M.sync(s,i,ctx,{at,quality:'EASY'});
 assert.equal(s.suspension,null);assert.equal(q.hypotheses.UP.state,'RENEWED_IMPULSE');
});
test('ledger fee math and serialization, no broker or predecessor policy',()=>{
 const a=A.initial(base);tick(a,market(base+MIN),base+MIN,60000);
 assert.equal(A.pnl(a.position,60000).net,-1.5);
 const b=JSON.parse(JSON.stringify(a));assert.deepEqual(A.verify(b),a);
 assert.equal(b.brokerOrdersEnabled,false);assert.equal(b.decisionImpact,false);
 b.brokerOrdersEnabled=true;assert.throws(()=>A.verify(b));
});

test('economic proof expires independently of actual Cross and cannot be renewed by a local candidature',()=>{
 const at=base+20*MIN,p={sourceAt:at-2*MIN,knownAt:at-2*MIN,price:60020,level:60000};
 assert.equal(M.proofFresh(p,at,at,60050,'UP',10,base),true);
 assert.equal(M.proofFresh(p,at,at,60130,'UP',10,base),false);
 assert.equal(M.proofFresh(p,at+11*MIN,at+11*MIN,60050,'UP',10,base),false);
 assert.equal(M.proofFresh(p,at,at,60005,'UP',10,base),false);
 assert.equal(M.proofFresh({...p,knownAt:at+1},at,at,60050,'UP',10,base),false);
 assert.equal(M.proofFresh(p,at,at,60050,'UP',10,at-MIN),false);
});
