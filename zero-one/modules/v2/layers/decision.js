'use strict';

function opposite(d){return d==='long'?'short':d==='short'?'long':null;}

function evaluate(snapshot,context){
  const prev=context.previous||{}, pos=prev.position||null;
  const dom=context.dominance||{}, risk=context.risk||{}, state=context.state||{};
  if(!pos){
    if(risk.tradeable&&risk.direction){
      return {type:risk.direction==='long'?'ENTER_LONG':'ENTER_SHORT',direction:risk.direction,
        reason:'WHERE + STATE + DOMINANCE + RISK valides',
        proof:{where:context.where,state:{phase:state.phase,structure3m:state.priceStructure3m},dominance:dom.state,risk:risk.reason}};
    }
    if(dom.direction&&Number(dom.proofScore)>=.35) return {type:'WATCH',direction:dom.direction,reason:risk.reason||'preuve en formation'};
    return {type:'NO_TRADE',direction:null,reason:risk.reason||'aucune opportunite'};
  }

  const m=pos.metrics||{}, opp=opposite(pos.direction), events=[];
  const favorable=Number(m.favorableUsd)||0, mfe=Number(m.mfeUsd)||0, adverse=Number(m.adverseUsd)||0;
  const giveback=mfe>0?Math.max(0,(mfe-favorable)/mfe):0;
  const domOpp=dom.direction===opp&&['DOMINATION_PERSISTANTE','FORCE_SHIFT'].includes(dom.state)&&Number(dom.proofScore)>=.60;
  const domSame=dom.direction===pos.direction&&['DOMINATION_PERSISTANTE','DOMINATION_EMERGENTE','ATTAQUE_PRODUCTIVE'].includes(dom.state);
  const currentGod=dom.current&&dom.current.direction===pos.direction&&Number(dom.current.yieldVsP95)>=1&&mfe>=150&&
    ['DOMINATION_PERSISTANTE','DOMINATION_EMERGENTE','ATTAQUE_PRODUCTIVE'].includes(dom.state);
  if(currentGod) events.push('GOD_YIELD');

  if(adverse>=500) return {type:'EXIT_RISK',direction:pos.direction,reason:'garde-fou risque 500 USD',events};
  if(m.godYieldSeen&&mfe>=150&&giveback>=.25&&!domSame)
    return {type:'EXIT_GOD_YIELD',direction:pos.direction,reason:`GOD_YIELD capture puis degradation; restitution ${(giveback*100).toFixed(1)}% MFE`,events};
  if(mfe>=250&&giveback>=.50&&!domSame)
    return {type:'EXIT_EFFICIENCY',direction:pos.direction,reason:`conversion deterioree; restitution ${(giveback*100).toFixed(1)}% MFE`,events};
  if(domOpp) return {type:'EXIT_EXECUTION',direction:pos.direction,reason:`domination opposee persistante -> ${opp}`,events};

  const ps=state.priceStructure3m||{};
  const structuralOpp=ps.direction===opp&&String(ps.state||'').startsWith('RECONSTRUCTION_');
  const phaseShift=['bascule de polarité','résolution','divergence de crête'].includes(state.phase);
  if(structuralOpp&&phaseShift&&dom.direction===opp&&Number(dom.proofScore)>=.45)
    return {type:'EXIT_STRUCTURE',direction:pos.direction,reason:`nouvelle structure locale ${opp} + phase ${state.phase}`,events};
  return {type:'HOLD',direction:pos.direction,reason:domSame?'domination conservee':'thèse non invalidée',events,givebackPct:giveback*100};
}

module.exports={evaluate};
