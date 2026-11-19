'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const S=require('../../modules/v552/source'),
 D=require('../../modules/v552/decision'),
 M=require('../../modules/v552/market-quality');
const ROOT=path.resolve(__dirname,'../..');
const state=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v552-paper-state.json')));
function find(no){
 const t=state.history.find(x=>x.tradeNo===no)||
  (state.completed+1===no&&state.position?
    {...state.position,tradeNo:no,direction:state.position.direction}:null);
 assert.ok(t,'missing trade #'+no);
 const input=S.load(t.entryAt);
 const o=D.sensor(input,t.entryAt,t.entryPrice);
 const cross=parseInt(t.episodeId?.split(':').at(-1),10);
 const audit=input.samples.find(x=>x.ts===cross);
 const ep={id:t.episodeId,direction:t.direction,
  crossAt:cross,crossPrice:audit?.lastPrice||
   t.entryPrice-(t.entryContext?.qualification?.cross0||0)*(t.direction==='long'?1:-1),
  status:'TACTICAL_HYPOTHESIS'};
 const market=M.inspect(o,input,t.direction,ep);
 const mem={campaign:{id:t.campaignId||'historical',direction:
  t.entryContext?.campaignDirection||t.direction,phase:'CAMPAIGN_ACTIVE'},
  episode:ep,startedAt:cross-1};
 const result=D.qualify(o,mem,null,{phase:'CAMPAIGN_ACTIVE'},market);
 return {t,market,result,mem,o};
}
test('12:45 LONG #14 is deferred: confirmation of cross15 is not proof of accepted price',()=>{
 const {result,market}=find(14);
 assert.equal(market.lastConfirmedCross.direction,'long');
 assert.equal(market.priorPolarityRetained,false);
 assert.equal(market.postCrossReclaim,false);
 assert.equal(market.deferNewEntry,true);
 assert.equal(result.action,'WAIT');
 assert.equal(result.reason,'V552_MARKET_POLARITY_CONTESTED_WAIT_PRICE_STRUCTURE');
});
test('13:16 SHORT #15 is deferred by MF15 opposition and market unaccepted reversal',()=>{
 const {result,market}=find(15);
 assert.equal(market.lastConfirmedCross.direction,'short');
 assert.equal(market.priorPolarityRetained,false);
 assert.equal(market.mfConflict,true);
 assert.equal(market.deferNewEntry,true);
 assert.equal(result.action,'WAIT');
});
test('SHORT winner #2 has independent post-cross defended price and aligned slow MF',()=>{
 const {result,market}=find(2);
 assert.equal(market.lastConfirmedCross.direction,'short');
 assert.equal(market.priorPolarityRetained,true);
 assert.equal(market.postCrossReclaim,true);
 assert.equal(market.mfAligned,true);
 assert.equal(market.deferNewEntry,false);
 assert.equal(result.action,'ENTER_SHORT');
});
test('market state survives E15 parent and position changes, not reset to CURRENT LIVE slope',()=>{
 const early=find(13),later=find(14);
 assert.equal(early.market.kind,'CONFIRMED_MCB15_NEEDS_PRICE_TRANSLATION');
 assert.equal(later.market.kind,'PREVIOUS_POLARITY_NOT_RETAINED');
 assert.equal(early.market.lastConfirmedCross.direction,'short');
 assert.equal(later.market.lastConfirmedCross.direction,'long');
});
test('confirmed 15m opposite is a structural REVIEW, not mandatory exit with MF15 and defended held price',()=>{
 const at=1795090600000;
 const o={at,price:64800,mcb3:{direction:'short'},
  mcb15:{gap:-2,gapSlope3:-1,direction:'short',
   closed:{direction:'short',confirmedCross:{direction:'short',knownAt:at-2000}}},
  mf:{slow:30,slope15:2,slope3:-2},
  pm:{live:-12,p3:80}};
 const pos={direction:'long',entryAt:at-600000,entryPrice:64000,mfePriceUsd:900};
 const a={phase:'CROSS15_LIVE_WATCH',counterConvinces:false,
  evidence:{priceFromLive:-20}};
 const result=D.positionReview(o,{campaign:{direction:'long'}},pos,a);
 assert.equal(result.action,'HOLD');
 assert.equal(result.reason,'V552_CONFIRMED_15M_CONTEST_PRICE_DEFENDS_POSITION');
 assert.equal(result.positionReview.confirmed15Review.slowMFConfirms,true);
 const fail=D.positionReview({...o,price:63800,
   mf:{slow:30,slope15:-2,slope3:-2},pm:{live:-12,p3:-80}},
  {campaign:{direction:'long'}},pos,a);
 assert.equal(fail.action,'EXIT_LONG');
});
test('structural market reads ONLY 15m closed before as-of and snapshots that predate now',()=>{
 const good=find(14),x=good.o;
 const input=S.load(good.t.entryAt);
 const last=M.closedCrosses(input.bars.m15,good.t.entryAt).crosses.at(-1);
 assert.ok(last.at<=good.t.entryAt);
 assert.ok(last.at>1795080000000);
 const future=[...input.bars.m15,{ts:good.t.entryAt,
  close:99999,lbw:-999,bw:999,high:99999,low:1}];
 const after=M.closedCrosses(future,good.t.entryAt).crosses.at(-1);
 assert.equal(after.at,last.at);
});
test('market gate has no wall-clock 18/25m TTL, or broker import',()=>{
 const txt=fs.readFileSync(path.join(ROOT,'modules/v552/market-quality.js'),'utf8');
 for(const forbidden of ['decision-v543','decision-v551','paper-v551','orderClient',
  'brokerClient','privateKey'])
  assert.equal(txt.includes(forbidden),false);
 assert.equal(txt.includes('Cross3 <= 18'),false);
});

function frozenPolicyV11(){
 const current=JSON.parse(fs.readFileSync(path.join(ROOT,'data/v552-paper-state.json')));
 const f=JSON.parse(JSON.stringify(current));
 if(f.policyVersion==='v5.5.2-lbw15-live-vigilance-campaign-paper-v1.2'){
  f.policyVersion='v5.5.2-lbw15-live-vigilance-campaign-paper-v1.1';
  f.policyRevision=current.policyRevision.previousPolicyRevision;
  delete f.policyHistory;
 }
 assert.equal(f.policyVersion,'v5.5.2-lbw15-live-vigilance-campaign-paper-v1.1');
 return f;
}
test('explicit V552 v1.1 to v1.2 policy migration preserves account and open position',()=>{
 const {build}=require('../../scripts/boonolab-v552-policy-v12-upgrade');
 const frozen=frozenPolicyV11();
 const migrated=build(frozen,frozen.lastObservationAt+1,'test-old-sha');
 assert.equal(migrated.policyVersion,'v5.5.2-lbw15-live-vigilance-campaign-paper-v1.2');
 assert.deepEqual(migrated.position,frozen.position);
 assert.deepEqual(migrated.history,frozen.history);
 assert.deepEqual(migrated.usedEpisodes,frozen.usedEpisodes);
 assert.equal(migrated.completed,frozen.completed);
 assert.equal(migrated.equityUsd,frozen.equityUsd);
 assert.equal(migrated.feesUsd,frozen.feesUsd);
 assert.equal(migrated.policyRevision.oldCompleted,frozen.completed);
 assert.equal(migrated.policyRevision.oldEquityUsd,frozen.equityUsd);
 assert.equal(migrated.policyRevision.previousPolicyRevision.to,
   'v5.5.2-lbw15-live-vigilance-campaign-paper-v1.1');
 assert.equal(migrated.brokerOrdersEnabled,false);
 assert.throws(()=>build({...frozen,engine:'V551'},Date.now(),'x'),/UNTRUSTED/);
});
test('read-only Watch endpoint serves actually migrated V552 v1.2 state with coherent source age',()=>{
 const src=fs.readFileSync(path.join(ROOT,'modules/config-server.js'),'utf8');
 const a=src.indexOf("app.get('/api/v552-paper',requireAuth");
 const b=src.indexOf("app.get('/api/v493'",a);
 assert.ok(a>0&&b>a);
 const route=src.slice(a,b),handlers={};
 const vm=require('vm');
 const old=frozenPolicyV11(),
   staged=require('../../scripts/boonolab-v552-policy-v12-upgrade')
    .build(old,old.lastObservationAt+1,'test-readonly-sha'),
   stagedView=require('../../modules/v552/runner').summary(staged);
 const stagedFs={readFileSync:(file,enc)=>{
  if(file.endsWith('/data/v552-paper-state.json'))
   return JSON.stringify(staged);
  if(file.endsWith('/data/v552-paper-summary.json'))
   return JSON.stringify(stagedView);
  return fs.readFileSync(file,enc);
 }};
 const env={app:{get:(k,auth,fn)=>{handlers[k]=fn}},
  requireAuth:()=>{},fs:stagedFs,path,__dirname:path.join(ROOT,'modules'),
  Date,Number,Math,JSON,Error,
  sendUiJson:(_req,res,data)=>{res.body=data;return res}};
 vm.runInNewContext(route,env);
 const res={statusCode:200,set(){return this},status(x){this.statusCode=x;return this},
  json(x){this.body=x;return this}};
 handlers['/api/v552-paper']({},res);
 assert.equal(res.statusCode,200,JSON.stringify(res.body));
 assert.equal(res.body.policyVersion,
  'v5.5.2-lbw15-live-vigilance-campaign-paper-v1.2');
 assert.equal(res.body.engine,'V552');
 assert.equal(res.body.brokerOrdersEnabled,false);
 assert.ok(res.body.market);
 assert.equal(res.body.market.source,'ASOF_CLOSED_15M_BARS_PLUS_BATON_NO_FUTURE');
});
test('Watch exposes structural market admissions instead of only instantaneous LBW slopes',()=>{
 const src=fs.readFileSync(path.join(ROOT,'modules/config-server.js'),'utf8');
 assert.ok(src.includes("x.market?.deferNewEntry"));
 assert.ok(src.includes('MARCHÉ / ADMISSION'));
 assert.ok(src.includes('territoire post-Cross15'));
 assert.ok(src.includes('VIGILANCE LBW15 LIVE'));
});
