'use strict';

const { finite, num, quantile, clamp, signDir } = require('../core/utils');

function micro(r) {
  if (!r) return null;
  const cadence=num(r.cadence), vol=num(r.volumeFenetreBtc), win=num(r.winSec), move=num(r.priceMove), price=num(r.lastPrice);
  const flow=finite(vol)&&finite(win)&&win>0?vol/win:null;
  const yieldPx=finite(vol)&&vol>0&&finite(move)?move/vol:null;
  return {ts:num(r.ts),cadence:finite(cadence)?cadence:null,vol:finite(vol)?vol:null,winSec:finite(win)?win:null,
    flow,move:finite(move)?move:null,yield:yieldPx,price:finite(price)?price:null,dir:signDir(move,0.1)};
}
function baselines(rows) {
  const a=rows.slice(-240).map(micro).filter(Boolean);
  const pack=(key,abs=false)=>{const v=a.map(x=>x[key]).filter(finite).map(x=>abs?Math.abs(x):x);return {p25:quantile(v,.25),p50:quantile(v,.5),p75:quantile(v,.75),p95:quantile(v,.95)};};
  return {n:a.length,cadence:pack('cadence'),flow:pack('flow'),move:pack('move',true),yield:pack('yield',true)};
}
function ge(v,t){return finite(v)&&finite(t)&&v>=t;}
function le(v,t){return finite(v)&&finite(t)&&v<=t;}

function forceShift(a,b){
  const r=a.slice(-10);
  for(let i=Math.max(0,r.length-7);i<r.length-2;i++){
    const x=r[i]; if(!x||x.dir==='neutral') continue;
    const effort=ge(x.cadence,b.cadence.p75)||ge(x.flow,b.flow.p75);
    const neutral=le(Math.abs(x.yield||0),b.yield.p25);
    if(!effort||!neutral) continue;
    const opp=x.dir==='long'?'short':'long', after=r.slice(i+1);
    const productive=after.filter(y=>y.dir===opp&&ge(Math.abs(y.yield||0),b.yield.p75));
    const last3=after.slice(-3).filter(y=>y.dir===opp).length;
    if(productive.length&&last3>=2) return {detected:true,direction:opp,anchorTs:x.ts,initial:x.dir};
  }
  return {detected:false,direction:null};
}
function evaluate(snapshot){
  const rows=(snapshot.sources.auditRows||[]), b=baselines(rows);
  const recent=rows.slice(-10).map(micro).filter(x=>x&&x.dir!=='neutral'&&finite(x.price));
  if(b.n<40||recent.length<3) return {state:'DONNEES_INSUFFISANTES',direction:null,proofScore:0,baseline:b};
  const last=recent[recent.length-1], first=recent[0];
  const scores={long:0,short:0}, counts={long:0,short:0};
  for(const x of recent){
    const prod=finite(b.yield.p75)&&b.yield.p75>0?Math.abs(x.yield||0)/b.yield.p75:0;
    const eff=Math.max(finite(b.cadence.p75)&&b.cadence.p75>0?(x.cadence||0)/b.cadence.p75:0,
      finite(b.flow.p75)&&b.flow.p75>0?(x.flow||0)/b.flow.p75:0);
    const terrain=finite(b.move.p75)&&b.move.p75>0?Math.abs(x.move||0)/b.move.p75:0;
    const w=clamp(.45*prod+.25*terrain+.30*Math.min(eff,2),0,3);
    scores[x.dir]+=w; counts[x.dir]++;
  }
  const winner=scores.long===scores.short?null:(scores.long>scores.short?'long':'short');
  const loser=winner==='long'?'short':'long';
  const maxScore=Math.max(scores.long,scores.short), minScore=Math.min(scores.long,scores.short);
  const asym=maxScore>0?(maxScore-minScore)/maxScore:0;
  const prices=recent.map(x=>x.price).filter(finite), start=first.price, end=last.price;
  let conserved=false, retainedFraction=0;
  if(winner==='long'){
    const best=Math.max(...prices)-start, kept=end-start;
    retainedFraction=best>0?clamp(kept/best,0,1):0; conserved=kept>0&&retainedFraction>=.5;
  } else if(winner==='short'){
    const best=start-Math.min(...prices), kept=start-end;
    retainedFraction=best>0?clamp(kept/best,0,1):0; conserved=kept>0&&retainedFraction>=.5;
  }
  const last4=recent.slice(-4), persistCount=winner?last4.filter(x=>x.dir===winner).length:0;
  const shift=forceShift(recent,b);
  const currentHighEffort=ge(last.cadence,b.cadence.p75)||ge(last.flow,b.flow.p75);
  const currentNeutral=currentHighEffort&&le(Math.abs(last.yield||0),b.yield.p25);
  const currentProductive=ge(Math.abs(last.yield||0),b.yield.p75);
  const shock=recent.some(x=>ge(x.cadence,b.cadence.p95)||ge(x.flow,b.flow.p95)||ge(Math.abs(x.move||0),b.move.p95));
  const proof=clamp(.45*asym+.30*(persistCount/4)+.25*retainedFraction+(shock&&conserved?.10:0),0,1);
  let state='COMBAT_EQUILIBRE', direction=winner;
  if(shift.detected){state='FORCE_SHIFT';direction=shift.direction;}
  else if(currentNeutral&&proof<.65){state='ATTAQUE_NEUTRALISEE';direction=last.dir;}
  else if(winner&&persistCount>=3&&conserved&&proof>=.62) state='DOMINATION_PERSISTANTE';
  else if(winner&&persistCount>=2&&conserved&&proof>=.45) state='DOMINATION_EMERGENTE';
  else if(last.dir!=='neutral'&&currentProductive&&currentHighEffort){state='ATTAQUE_PRODUCTIVE';direction=last.dir;}
  else if(asym<.2) direction=null;
  const currentYieldPct = finite(last.yield)&&finite(b.yield.p95)&&b.yield.p95>0 ? Math.abs(last.yield)/b.yield.p95 : null;
  return {state,direction,proofScore:proof,asymmetry:asym,retainedFraction,conserved,persistCount,
    shock,forceShift:shift,current:{direction:last.dir,yield:last.yield,yieldVsP95:currentYieldPct,cadence:last.cadence,flow:last.flow,priceMove:last.move},
    scores,counts,baseline:b,window:{startPrice:start,endPrice:end,startTs:first.ts,endTs:last.ts},
    question:'qui pousse fort pour peu, qui obtient beaucoup avec peu, et qui conserve le terrain ?'};
}

module.exports={evaluate,micro,baselines,forceShift};
