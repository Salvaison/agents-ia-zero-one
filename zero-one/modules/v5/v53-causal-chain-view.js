'use strict';
// BOONO V5.3 — read-only causal event chronology for the State Vivant.
// Elastic events retain their observedAt; bar/source timestamps remain separate.
// PM at an event is the last RECORDED Audit/Baton observation, not a synthetic fill.
// This module has no admission, exit, risk or broker authority.
const n=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const round=v=>n(v)===null?null:Math.round(v*10)/10;
function build({events=[],audit=[],now,price,mcb15=null,mcb3=null}){
 const t=n(now),value=n(price);
 if(t===null)return null;
 const rows=(audit||[]).filter(x=>n(x.ts)!==null&&x.ts<=t)
   .sort((a,b)=>a.ts-b.ts).slice(-500);
 const recent=(events||[]).filter(e=>e&&
   ['MCB15','MCB3'].includes(e.family)&&
   n(e.observedAt)!==null&&e.observedAt<=t&&
   e.observedAt>=t-3*3600000)
   .sort((a,b)=>a.observedAt-b.observedAt||Number(a.id||0)-Number(b.id||0));
 function priceAtTime(eventTime){
  const x=[...rows].reverse().find(r=>r.ts<=eventTime&&eventTime-r.ts<=70000);
  return x||null;
 }
 function point(e){
  if(!e)return null;
  const ts=n(e.observedAt),auditRow=priceAtTime(ts);
  const actualPrice=n(e.price),recorded=n(auditRow?.priceMove);
  const sinceBaton=actualPrice!==null&&n(auditRow?.lastPrice)!==null?
    round(actualPrice-n(auditRow.lastPrice)):null;
  // PM Live for this observed event = last recorded Baton displacement
  // + tick movement since that Baton. The intervals are successive,
  // not overlapping PM3/PM5 windows. Missing data stays unknown.
  const pmAtEvent=recorded!==null&&sinceBaton!==null?
    round(recorded+sinceBaton):null;
  return {
   type:e.key==='BW_LBW_CROSS'?'CROSS':e.type,
   direction:e.direction||null,observedAt:ts,
   sourceTs:n(e.sourceTs),barTs:n(e.current?.sourceTs),
   value:round(n(e.current?.value)),
   price:round(actualPrice??n(auditRow?.lastPrice)),
   pmLive:pmAtEvent,
   pmBaton:round(recorded),pmSinceBaton:sinceBaton,
   pmObservedAt:auditRow?.ts||null,
   pmQuality:pmAtEvent!==null?'BATON_PLUS_EVENT_PRICE':'PM_AT_EVENT_UNKNOWN',
   deltaSinceEvent:actualPrice!==null&&value!==null?
     round(value-actualPrice):null
  };
 }
 function chain(family,live,wave){
  const familyEvents=recent.filter(e=>e.family===family&&
    ['BW_LBW_CROSS',family==='MCB15'?'E15':'E3'].includes(e.key));
  const sig=family==='MCB15'?'E15':'E3';
  const last=(key,type)=>familyEvents.filter(e=>e.key===key&&e.type===type).at(-1)||null;
  const cross=point(last('BW_LBW_CROSS','OBSERVED'));
  const liveEvent=last(sig,'OBSERVED');
  const livePoint=point(liveEvent);
  const confirmation=point(last(sig,'CONFIRMED'));
  const interruption=last(sig,'INTERRUPTED');
  const interrupted=!!(liveEvent&&interruption&&
   interruption.observedAt>liveEvent.observedAt&&
   (!confirmation||confirmation.observedAt<interruption.observedAt));
  const geometryDir=live?.direction||null;
  const liveNow=geometryDir||cross?.direction||null;
  const signalAligned=!!(liveNow&&livePoint?.direction===liveNow);
  const nativeConfirmedForLatest=!!(confirmation&&livePoint&&
   confirmation.direction===livePoint.direction&&
   (confirmation.barTs===livePoint.barTs||confirmation.sourceTs===livePoint.sourceTs));
  const lbw=n(wave?.lbw),bw=n(wave?.bw);
  return {
   tf:family==='MCB15'?'15m':'3m',
   role:family==='MCB15'?'DIRECTEUR':'TACTIQUE',
   geometryDirection:liveNow,
   cross,live:livePoint,confirmed:confirmation,
   interrupted,signalAligned,nativeConfirmedForLatest,
   lbw:round(lbw),bw:round(bw),difference:round(lbw!==null&&bw!==null?lbw-bw:null),
   nativeIsSameGeometricFamily:true,
   chronology:{
    crossToLiveSec:cross&&livePoint?round((livePoint.observedAt-cross.observedAt)/1000):null,
    liveToConfirmedSec:livePoint&&confirmation&&nativeConfirmedForLatest?
      round((confirmation.observedAt-livePoint.observedAt)/1000):null
   }
  };
 }
 const tf15=chain('MCB15',{direction:mcb15?.currentOffensive||null},mcb15);
 const tf3=chain('MCB3',{direction:mcb3?.tacticalDirection||null},mcb3);
 const aligned=tf15.geometryDirection&&tf3.geometryDirection?
   (tf15.geometryDirection===tf3.geometryDirection?'ALIGNED':'TACTICAL_OPPOSES_15M'):
   'UNRESOLVED';
 const upper=n(mcb15?.lbw),lower=n(mcb15?.bw);
 return {
  version:'v53-causal-chain-ui-v0.1',asOf:t,price:value,
  tf15,tf3,alignment:aligned,
  extremeBand:{
   highLBW60:upper!==null&&upper>=60,
   lowBWMinus60:lower!==null&&lower<=-60,
   upperReference:'LBW15 >= +60',lowerReference:'BW15 <= -60',
   semantics:'Separately observed oscillator bands; do not conflate curves or infer win probability'
  },
  meaning:'Observed chronology, not a mandatory event order or independent MCB votes',
  source:'Existing Elastic events + Audit/Baton, no future data, display only',
  decisionImpact:false
 };
}
module.exports={build};
