'use strict';
class V3LabEngine{
  constructor(layers){this.layers=layers;}
  evaluate(frame,previous=null){
    const ctx={frame,previous};
    ctx.raw=this.layers.baton.build(frame);
    ctx.where=this.layers.where.evaluate(frame,ctx);
    ctx.wave=this.layers.wave.evaluate(frame,ctx);
    ctx.regime=this.layers.regime.evaluate(frame,ctx);
    ctx.dominance=this.layers.dominance.evaluate(frame,ctx);
    ctx.sequence=this.layers.sequence.evaluate(frame,ctx);
    ctx.reversal=this.layers.reversal.evaluate(frame,ctx);
    ctx.risk=this.layers.risk.evaluate(frame,ctx);
    ctx.action=this.layers.action.evaluate(frame,ctx);
    return {version:'v3-lab-prototype-0.2',evaluatedAt:Date.now(),marketTimestamp:frame.market.timestamp,price:frame.market.price,
      raw:ctx.raw,where:ctx.where,wave:ctx.wave,regime:ctx.regime,dominance:ctx.dominance,sequence:ctx.sequence,
      reversal:ctx.reversal,risk:ctx.risk,action:ctx.action};
  }
}
module.exports={V3LabEngine};
