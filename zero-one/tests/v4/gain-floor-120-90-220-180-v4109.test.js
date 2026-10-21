'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const guard=require('../../modules/v4/layers/gain-floor');
const riskLayer=require('../../modules/v4/layers/risk');
const action=require('../../modules/v4/layers/action');

function state(direction,entry,price,mfe,extra={}){
  const position={direction,entryPrice:entry,metrics:{mfeUsd:mfe,maeUsd:0},...extra};
  const risk=riskLayer.evaluate({market:{price}},position,null,null,null,null,null);
  return {position,risk,exit:action.economicProfitFloorExit(position,risk)};
}
test('LONG: 120 arms virtual +90 floor, protecting only after reversal to 90',()=>{
  for(const [mfe,p,armed,exit] of [[119,82800+80,false,false],[120,82800+120,true,false],
    [120,82800+105,true,false],[120,82800+91,true,false],[120,82800+90,true,true],
    [120,82800+89,true,true]]){
    const v=state('long',82800,p,mfe);
    assert.equal(v.risk.gainProtection.armed,armed);
    assert.equal(!!v.exit,exit);
    if(armed){assert.equal(v.risk.gainProtection.stage,'EARLY_120_90');assert.equal(v.risk.gainProtection.virtualStopPrice,82890);}
    if(exit){assert.equal(v.exit.evidence.armUsd,120);assert.equal(v.exit.evidence.floorUsd,90);
      assert.equal(v.exit.type,'EXIT_ECONOMIC_PROFIT_FLOOR');}
  }
});
test('LONG: 220 supersedes 120, old floor is never reinstated',()=>{
  for(const [mfe,p,expect] of [[219,82800+115,null],[220,82800+220,null],
    [220,82800+181,null],[220,82800+180,'EXIT_ECONOMIC_PROFIT_FLOOR'],
    [290,82800+179,'EXIT_ECONOMIC_PROFIT_FLOOR']]){
    const v=state('long',82800,p,mfe);
    assert.equal(v.exit&&v.exit.type||null,expect);
    assert.equal(v.risk.gainProtection.floorUsd,mfe>=220?180:90);
    assert.equal(v.risk.gainProtection.virtualStopPrice,mfe>=220?82980:82890);
  }
});
test('SHORT: 120/90 and 220/180 are symmetric',()=>{
  const a=state('short',82800,82800-120,120);
  assert.equal(a.risk.gainProtection.virtualStopPrice,82710);
  assert.equal(a.exit,null);
  const b=state('short',82800,82710,120);
  assert.equal(b.exit.evidence.floorUsd,90);
  const c=state('short',82800,82800-220,220);
  assert.equal(c.risk.gainProtection.virtualStopPrice,82620);
  assert.equal(c.exit,null);
  const e=state('short',82800,82620,220);
  assert.equal(e.exit.evidence.floorUsd,180);
});
test('MFE state survives a 120→220 upgrade and never trails on each new high',()=>{
  const seq=[[120,120,90],[121,111,90],[180,105,90],[220,215,180],[300,210,180]];
  for(const [mfe,cur,floor] of seq){
    const s=state('long',82800,82800+cur,mfe);
    assert.equal(s.risk.gainProtection.floorUsd,floor);
    assert.equal(s.exit,null);
  }
});
test('gapped observations exit at actual observed price, not falsely guaranteed floor',()=>{
  const v=state('long',82800,82850,120);
  assert.equal(v.exit.type,'EXIT_ECONOMIC_PROFIT_FLOOR');
  assert.equal(v.risk.gainProtection.virtualStopPrice,82890);
  assert.equal(v.exit.evidence.currentSignedUsd,50);
  assert.equal(v.risk.gainProtection.exchangeOrderPlaced,false);
  assert.equal(v.risk.gainProtection.guaranteedFillAtStop,false);
});
test('gain floor has priority before other exits, but not before hard risk',()=>{
  const pos={direction:'long',entryPrice:82800,metrics:{mfeUsd:220,maeUsd:0}};
  const frame={market:{timestamp:Date.now(),price:82980}};
  const r=riskLayer.evaluate(frame,pos,null,null,null,null,null);
  const result=action.evaluate(frame,pos,{}, {state:'LONG',direction:'long'}, {},{},r);
  assert.equal(result.type,'EXIT_ECONOMIC_PROFIT_FLOOR');
  const riskHard=riskLayer.evaluate({market:{...frame.market,price:82299}},pos,null,null,null,null,null);
  assert.equal(riskHard.hardStopBreached,true);
  assert.equal(action.evaluate(frame,pos,{}, {state:'LONG',direction:'long'}, {},{},riskHard).type,'EXIT_RISK');
});
test('TP1 and established 220/180 remain compatible, even with existing position',()=>{
  const v=state('long',82800,82980,440,{tp1Taken:true});
  assert.equal(v.exit.type,'EXIT_ECONOMIC_PROFIT_FLOOR');
  assert.equal(v.exit.evidence.floorUsd,180);
  assert.equal(action.economicProfitFloorExit({direction:'long'}, {position:{mfeUsd:219,currentSignedUsd:170}}),null);
});
