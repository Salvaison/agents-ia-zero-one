'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const paper=require('../../modules/v5/paper-v52');
const v541=require('../../modules/v5/decision-v541');
function decision(cross,retest){
 const campaign='long|E15:1';
 return {
  version:v541.VERSION,action:'ENTER_LONG',quality:'DATA_OK',
  candidate:'long',entryKey:'long|'+cross+'|'+campaign+
   (retest?'|RETEST:'+retest:''),
  invalidation:{price:79800,reference:'CONFIRMED_3M_LOW'},
  readings:{geometry:{cross3:{ts:cross}},
   causalChain:{campaignId:campaign},
   structural54:{campaignId:campaign,
    testedTerritory:{source:retest?'DEFENDED_RETEST':'MA3_CLOSED_CONTACT'}},
   maturity:{requalified:!!retest,requalifiedAt:retest},
   evidenceSincePolicy:{qualified:true},
   mcb15:{lbw:-50},mcb3:{lbw:-40},place:{},conversion:{pm3:25,pm5:30}}
 };
}
test('A consumed cross does not reenter without a NEW defended retest',()=>{
 const s=paper.initial(1000);
 const tick=(d,price,ts)=>paper.step(s,d,{price,ts,tickAgeMs:0,sourceAgeMs:100});
 assert.equal(tick(decision(2000,null),80000,3000).event.type,'ENTER_LONG');
 assert.equal(tick({action:'EXIT_LONG',reason:'STRUCTURE_LOST'},80030,4000).event.type,'EXIT_LONG');
 const stale=tick(decision(2000,null),80020,5000);
 assert.equal(stale.event,null);
 assert.equal(stale.reason,'V541_SAME_CAMPAIGN_AWAIT_NEW_NATIVE_E3_OR_PROVEN_RETEST');
 const regained=tick(decision(2000,6000),80015,7000);
 assert.equal(regained.event.type,'ENTER_LONG');
 assert.equal(s.position.entryPolicyVersion,v541.VERSION);
 assert.equal(s.brokerOrdersEnabled,false);
});
test('Old V5.4 gain floors survive migration and exit as before',()=>{
 const s=paper.initial(1000);s.version=paper.V54_VERSION;s.lastObservationAt=4000;
 s.position={direction:'short',entryAt:2000,entryPrice:80256.3,lastPrice:80100,
  entryPolicyVersion:'v5.4-structural-campaign-paper-v1',
  entryFeeUsd:.75,entryKey:'short|2000|E15:0',
  invalidationPrice:80462.3,mfePriceUsd:250,maePriceUsd:0,
  gainFloorUsd:180};
 const migrated=paper.migrate(s,5000);
 assert.equal(migrated.position.entryPolicyVersion,s.position.entryPolicyVersion);
 const result=paper.step(migrated,{version:v541.VERSION,action:'HOLD',
  reason:'INHERITED_POSITION_UNCHANGED'},{
  price:80085,ts:6000,sourceAgeMs:100,tickAgeMs:0});
 assert.equal(result.trade.exitReason,'GAIN_FLOOR_120_90_OR_220_180');
 assert.equal(result.trade.entryPolicyVersion,'v5.4-structural-campaign-paper-v1');
 assert.equal(result.state.position,null);
 assert.equal(result.state.brokerOrdersEnabled,false);
});
