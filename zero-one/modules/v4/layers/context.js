'use strict';

const where=require('../../v3lab/layers/where');

function relationForDirection(direction,whereState){
  if(!direction||!whereState)return 'NEUTRAL';
  const votes=[];
  const ma=whereState.ma200||{};
  if(ma.available&&ma.fresh){
    if(direction==='long')votes.push(ma.nature==='SUPPORT'?'SUPPORTIVE':'OPPOSING');
    if(direction==='short')votes.push(ma.nature==='RESISTANCE'?'SUPPORTIVE':'OPPOSING');
  }
  const sr=whereState.sr&&whereState.sr.interaction;
  if(sr&&sr.family){
    const fam=String(sr.family).toLowerCase();
    if(direction==='long'){
      if(fam.includes('support'))votes.push('SUPPORTIVE');
      if(fam.includes('resistance'))votes.push('OPPOSING');
    }else if(direction==='short'){
      if(fam.includes('resistance'))votes.push('SUPPORTIVE');
      if(fam.includes('support'))votes.push('OPPOSING');
    }
  }
  if(votes.includes('SUPPORTIVE')&&votes.includes('OPPOSING'))return 'MIXED';
  if(votes.includes('SUPPORTIVE'))return 'SUPPORTIVE';
  if(votes.includes('OPPOSING'))return 'OPPOSING';
  return 'NEUTRAL';
}
function evaluate(frame,thesis){
  const w=where.evaluate(frame,{});
  const dir=thesis&&(thesis.direction||thesis.candidateDirection)||null;
  return {
    status:relationForDirection(dir,w),
    thesisDirection:dir,
    where:w,
    authority:'CONTEXT_ONLY_NO_DIRECTION_NO_CONFIRMATION_NO_VETO',
    note:'niveaux/MA/liquidite/trendlines contextualisent la thèse MCB sans la confirmer'
  };
}
module.exports={evaluate,relationForDirection};
