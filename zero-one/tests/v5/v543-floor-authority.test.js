'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const paper=require('../../modules/v5/paper-v543');
const VERSION='v5.4.3-causal-offensive-maturity-paper-v1';
const clone=x=>JSON.parse(JSON.stringify(x));
const t0=1793480000000;
function make(dir='long',opts={}){
 const s=paper.initial(t0-60000);
 s.lastObservationAt=t0-1000;
 s.position={direction:dir,entryAt:t0-120000,
  entryPrice:80000,lastPrice:80000,entryFeeUsd:.75,
  notionalUsd:1500,entryPolicyVersion:VERSION,
  campaignId:dir+'|E15:1793478000000',
  entryKey:dir+'|fake',
  invalidationPrice:dir==='long'?79700:80300,
  mfePriceUsd:0,maePriceUsd:0,gainFloorUsd:0,
  ...opts};
 return s;
}
function d(action='HOLD',reason='V54_CAMPAIGN_POSITION_ACTIVE'){
 return {version:VERSION,action,reason,phase:'STRUCTURAL_CONTINUATION',
  quality:'DATA_OK',asOf:t0,readings:{structural54:{
   campaignId:'long|E15:1793478000000',phase:'STRUCTURAL_CONTINUATION',
   positionReview:{structuralLoss:false,mfAdverse:false,
    opposingPivotConfirmed:false,defendedOpposition:false}}}};
}
const tick=(s,decision,price,i=0,age=5)=>paper.step(s,decision,{
 price,ts:t0+i*5000,sourceAgeMs:1000,tickAgeMs:age});
test('120/90 becomes economic attention only; parent MCB15 HOLD retains the real PAPER position',()=>{
 const s=make();
 tick(s,d(),80140,0);
 assert.equal(s.position.gainFloorUsd,90);
 const r=tick(s,d('HOLD','V54_CAMPAIGN_POSITION_ACTIVE'),80088,1);
 assert.equal(r.event,null);assert.equal(r.trade,null);
 assert.equal(r.reason,'HOLD_MCB_STRUCTURE_OVERRIDES_GAIN_FLOOR');
 assert.equal(s.position.entryAt,t0-120000);
 assert.equal(s.position.floorAttentionEpisodes,1);
 assert.equal(s.floorAttentionCount,1);
 assert.equal(s.floorAttentionLast.floorPriceMoveUsd,90);
 assert.equal(s.floorAttentionLast.mcbStructureAction,'HOLD');
 assert.equal(s.floorAttentionLast.mcb15CampaignId,'long|E15:1793478000000');
 assert.equal(s.floorAttentionLast.status,'FLOOR_EXIT_DEFERRED_TO_MCB_STRUCTURE');
 assert.equal(s.realizedUsd,0);assert.equal(s.feesUsd,0);
 assert.equal(s.brokerOrdersEnabled,false);
 tick(s,d('HOLD','V54_CAMPAIGN_POSITION_ACTIVE'),80082,2);
 assert.equal(s.floorAttentionCount,1,'5s repetitions are not new episodes');
 tick(s,d(),80110,3);
 tick(s,d('HOLD','HOLD_V54_3M_RESPIRATION_NOT_EXIT'),80085,4);
 assert.equal(s.floorAttentionCount,2,'new crossing after recovery is new event');
});
test('220/180 floor is similarly subordinate to MCB15 and cannot prematurely close',()=>{
 const s=make('short');tick(s,d('HOLD'),79775);
 assert.equal(s.position.gainFloorUsd,180);
 const hold=tick(s,d('HOLD','HOLD_V54_STRUCTURE_CONTESTED_PROTECT'),79828,1);
 assert.equal(hold.reason,'HOLD_MCB_STRUCTURE_OVERRIDES_GAIN_FLOOR');
 assert.equal(hold.event,null);assert.equal(s.position.direction,'short');
 assert.equal(s.floorAttentionLast.floorPriceMoveUsd,180);
 assert.equal(s.floorAttentionLast.currentPriceMoveUsd,172);
});
test('Even a disputed structural territory does not let the old monetary floor override MCB HOLD',()=>{
 const s=make();tick(s,d(),80125);
 const q=d('HOLD','HOLD_V54_STRUCTURE_CONTESTED_PROTECT');
 q.readings.structural54.positionReview={opposingPivotConfirmed:true,
  structuralLoss:true,mfAdverse:false,defendedOpposition:false};
 const a=tick(s,q,80078,1);
 assert.equal(a.event,null);assert.equal(s.position.direction,'long');
 assert.equal(s.floorAttentionLast.mcbStructureReason,'HOLD_V54_STRUCTURE_CONTESTED_PROTECT');
});
test('Confirmed MCB/structure EXIT remains authoritative, even if gain floor is also reached',()=>{
 const s=make();
 tick(s,d(),80150);
 const q=d('EXIT_LONG','V54_CONFIRMED_STRUCTURAL_TERRITORY_TRANSFER');
 const r=tick(s,q,80080,1);
 assert.equal(r.event.type,'EXIT_LONG');
 assert.equal(r.trade.exitReason,q.reason);
 assert.equal(r.trade.exitAuthorityVersion,paper.FLOOR_AUTHORITY_VERSION);
 assert.equal(r.trade.floorAttentionEpisodes,1);
 assert.equal(s.floorAttentionLast.status,'ALIGNED_WITH_STRUCTURAL_EXIT');
 assert.equal(s.position,null);
 assert.equal(s.completed,1);assert.equal(s.history.length,1);
 assert.ok(r.trade.grossPnlUsd>0);
});
test('MCB exit can close even without arm or threshold: floor never vetoes structure',()=>{
 const s=make();
 const r=tick(s,d('EXIT_LONG','V541_CONFIRMED_MA3_FAILURE_WITH_MF_PRICE'),80014);
 assert.equal(r.trade.exitReason,'V541_CONFIRMED_MA3_FAILURE_WITH_MF_PRICE');
 assert.equal(r.trade.floorAttentionEpisodes,0);
 assert.equal(s.position,null);
});
test('Hard -500 risk overrides MCB HOLD with active 180/90 floor',()=>{
 const s=make('long',{mfePriceUsd:225,gainFloorUsd:180});
 const r=tick(s,d('HOLD','V54_CAMPAIGN_POSITION_ACTIVE'),79490);
 assert.equal(r.trade.exitReason,'HARD_RISK_500');
 assert.equal(s.completed,1);
 assert.equal(s.position,null);
 assert.equal(s.floorAttentionLast.status,'HARD_RISK_OVERRIDE');
});
test('No fake fill when tick is stale even though adverse price crosses risk or floor',()=>{
 const s=make('long',{mfePriceUsd:220,gainFloorUsd:180});
 const r=tick(s,d('EXIT_LONG','V54_CONFIRMED_STRUCTURAL_TERRITORY_TRANSFER'),
  79480,0,35000);
 assert.equal(r.event,null);assert.equal(r.trade,null);
 assert.equal(s.completed,0);
 assert.equal(s.position.direction,'long');
 assert.equal(s.floorAttentionCount,0);
});
test('Migration from existing V543 ledger preserves admission epoch, fees, equity, keys and position',()=>{
 const old=make('long',{mfePriceUsd:220,gainFloorUsd:180});
 old.floorAuthorityVersion=undefined;
 old.floorAuthorityActivatedAt=undefined;
 old.policyActivatedAt=1793333000000;
 old.completed=135;old.realizedUsd=-198.132;old.equityUsd=801.868;
 old.feesUsd=202.5068;old.usedKeys=['persist','old'];
 old.history=[{tradeNo:135,netPnlUsd:.1813}];
 const before=clone(old);
 const newer=paper.migrate(old,t0);
 for(const k of ['version','policyActivatedAt','startedAt','completed',
  'realizedUsd','equityUsd','feesUsd','lastObservationAt'])
  assert.equal(newer[k],before[k],k);
 assert.deepEqual(newer.history,before.history);
 assert.deepEqual(newer.usedKeys,before.usedKeys);
 assert.deepEqual({...newer.position,floorAuthorityVersion:null},
  {...before.position,floorAuthorityVersion:null});
 assert.equal(newer.position.floorAuthorityVersion,
  paper.LEGACY_FLOOR_AUTHORITY_VERSION);
 assert.equal(newer.floorAuthorityActivatedAt,t0);
 assert.equal(newer.floorAuthorityVersion,paper.FLOOR_AUTHORITY_VERSION);
 assert.equal(newer.brokerOrdersEnabled,false);
 const again=paper.migrate(newer,t0+9000);
 assert.equal(again.floorAuthorityActivatedAt,t0,'policy epoch is stable');
 const legacyExit=tick(again,d('HOLD'),79830);
 assert.equal(legacyExit.trade.exitReason,'GAIN_FLOOR_120_90_OR_220_180');
 assert.equal(legacyExit.trade.exitAuthorityVersion,
  paper.LEGACY_FLOOR_AUTHORITY_VERSION);
 assert.equal(again.position,null);
 assert.equal(again.floorAttentionCount,0,
  'inherited floor exit does not count as a new advisory event');
});
