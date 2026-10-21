'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boono-v4-hard-gain-'));
process.env.NODE_ENV='test';
process.env.BOONO_V4_TEST_DATA_DIR=dir;
const sim=require('../../modules/trade-simulator-v4');
const stream=require('../../modules/price-stream');
after(()=>{fs.rmSync(dir,{recursive:true,force:true});});
const statePath=path.join(dir,'trade-sim-v4-state.json');
const histPath=path.join(dir,'trade-sim-v4-history.json');
function init(direction,entry){
  const ts=new Date().toISOString();
  const pos={version:sim.VERSION,direction,entryPrice:entry,entryTimestamp:ts,
    capitalUsd:1000,marginUsd:150,notionalUsd:1500,positionPercent:15,leverage:10,
    feeModel:sim.DEFAULT_FEE_MODEL,tradingFeesPaidUsd:.75,entryFeeUsd:.75,
    realizedPnlUsd:-.75,grossRealizedPnlUsd:0,exitFeesPaidUsd:0,
    metrics:{mfeUsd:0,maeUsd:0,mfeAt:null,maeAt:null},tpEvents:[]};
  const st={version:sim.VERSION,startedAt:ts,modules:{scalp:null,day:pos,swing:null},
    lastEvaluation:{version:sim.VERSION,price:entry,marketTimestamp:Date.now(),
      thesis:{direction},action:{type:'HOLD'}},
    lastDecisionTsByModule:{},lastExitByModule:{}};
  fs.writeFileSync(statePath,JSON.stringify(st));
  fs.writeFileSync(histPath,'[]');
  sim.__testEnsureTrack('day',pos);
  return pos;
}
function tick(price){stream.emit('price',{price,ts:Date.now()});}
function readState(){return JSON.parse(fs.readFileSync(statePath));}
function history(){return JSON.parse(fs.readFileSync(histPath));}
test('hard stop triggers on OKX price tick without waiting for V4 evaluation: LONG +120 then +90',()=>{
  init('long',82800);
  tick(82920);
  let s=readState();
  assert.ok(s.modules.day);
  assert.equal(s.modules.day.metrics.mfeUsd,120);
  tick(82904);
  assert.ok(readState().modules.day);
  tick(82889);
  s=readState();
  assert.equal(s.modules.day,null);
  assert.equal(history().length,1);
  assert.equal(history()[0].exitKind,'EXIT_ECONOMIC_PROFIT_FLOOR');
  assert.equal(history()[0].exitPrice,82889);
  assert.equal(history()[0].exitContext.action.evidence.triggerSource,'OKX_PRICE_TICK');
  assert.equal(history()[0].exitContext.action.evidence.floorUsd,90);
  assert.equal(s.lastExitByModule.day.exitKind,'EXIT_ECONOMIC_PROFIT_FLOOR');
  tick(82850); assert.equal(history().length,1);
});
test('hard stop keeps higher 220/180 floor and closes exactly once: SHORT',()=>{
  init('short',82800);
  tick(82580);
  assert.equal(readState().modules.day.metrics.mfeUsd,220);
  tick(82595);
  assert.ok(readState().modules.day);
  tick(82621);
  const h=history();
  assert.equal(h.length,1);
  assert.equal(h[0].exitKind,'EXIT_ECONOMIC_PROFIT_FLOOR');
  assert.equal(h[0].exitContext.action.evidence.gainGuardStage,'ECONOMIC_220_180');
  assert.equal(h[0].exitContext.action.evidence.floorUsd,180);
  assert.equal(h[0].exitPrice,82621);
  assert.equal(readState().modules.day,null);
});
test('hard tick stop does not activate before MFE arm or on stale timestamps',()=>{
  init('long',82800);
  tick(82919);tick(82860);
  assert.ok(readState().modules.day);
  stream.emit('price',{ts:Date.now()-60000,price:83000});
  assert.ok(readState().modules.day);
  assert.equal(history().length,0);
});
