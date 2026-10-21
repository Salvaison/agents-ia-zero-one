'use strict';

// V4.10.9: absolute favourable BTC-price distance from entry, NOT USD PnL.
// Both stages are fixed, non-decreasing virtual protections based on observed MFE.
const STAGES=Object.freeze([
  Object.freeze({armUsd:120,floorUsd:90,stage:'EARLY_120_90'}),
  Object.freeze({armUsd:220,floorUsd:180,stage:'ECONOMIC_220_180'})
]);
function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
function evaluate(position,riskPosition){
  const rp=riskPosition||null;
  const mfe=rp&&finite(rp.mfeUsd)?Number(rp.mfeUsd):null;
  const current=rp&&finite(rp.currentSignedUsd)?Number(rp.currentSignedUsd):null;
  const entry=position&&finite(position.entryPrice)?Number(position.entryPrice):null;
  const direction=position&&position.direction||null;
  const validDirection=direction==='long'||direction==='short';
  const stage=mfe!==null&&validDirection?STAGES.slice().reverse().find(x=>mfe>=x.armUsd)||null:null;
  const floor=stage?stage.floorUsd:null;
  const virtualStopPrice=stage&&entry!==null
    ?(direction==='long'?entry+floor:entry-floor):null;
  const triggered=!!(stage&&current!==null&&current<=floor);
  return {
    version:'gain-floor-120-90-220-180-v1',
    armed:!!stage,stage:stage?stage.stage:'NOT_ARMED',
    armUsd:stage?stage.armUsd:null,floorUsd:floor,
    givebackAllowanceAtArmUsd:stage?stage.armUsd-stage.floorUsd:null,
    virtualStopPrice,triggered,
    mfeUsd:mfe,currentSignedUsd:current,
    isVirtual:true,exchangeOrderPlaced:false,
    executionTiming:'NEXT_V4_DECISION',guaranteedFillAtStop:false,
    note:'Fixed non-decreasing BTC price gain floor; observations can gap below virtual stop. Not a continuous trailing stop.'
  };
}
module.exports={STAGES,evaluate};
