'use strict';
// V5.4.1 observation only: distinguish native E3/E15 from geometric LBW extrema.
const THREE=180000,FIFTEEN=900000;
const n=v=>v===null||v===undefined||v===''?null:
 Number.isFinite(Number(v))?Number(v):null;
const sign=d=>d==='long'?1:d==='short'?-1:0;
function nativeProof(input,family,now){
 const is15=family==='MCB15',period=is15?FIFTEEN:THREE;
 const rows=(is15?input.bars15:input.bars3||[])
  .filter(b=>n(b.ts)!==null&&b.ts+period<=now)
  .sort((a,b)=>a.ts-b.ts);
 const confirmed=rows.flatMap(b=>{
  const evidence=[];
  for(const [key,direction] of [['wt1_cross_up','long'],['wt1_cross_dn','short']]){
   if(n(b[key])!==null)evidence.push({
    direction,sourceTs:b.ts,availableAt:b.ts+period,
    kind:is15?'E15_NATIVE_CONFIRMED':'E3_NATIVE_CONFIRMED',
    level:n(b[key]),availability:'BAR_CONFIRMED_BY_ASOF',
    observationNotInvented:true});
  }
  return evidence;
 });
 const events=(input.causalEvents||[]).filter(e=>e&&e.family===family&&
   e.key===(is15?'E15':'E3')&&n(e.observedAt)!==null&&
   e.observedAt<=now&&['OBSERVED','INTERRUPTED','CONFIRMED'].includes(e.type))
   .sort((a,b)=>a.observedAt-b.observedAt);
 // Prefer actual observedAt where a CONFIRMED event was journaled.
 // Closed-bar time is only earliest possible availability when that
 // telemetry is missing; NEVER invent an historical observation timestamp.
 const witnessed=events.filter(e=>e.type==='CONFIRMED');
 const annotated=confirmed.map(c=>{
  const match=witnessed.find(e=>e.sourceTs===c.sourceTs&&e.direction===c.direction);
  return {...c,observedAt:match?.observedAt??null,
   availability:match?'ACTUAL_CONFIRMED_OBSERVED_AT':
    'BAR_CLOSED_EARLIEST__RECEIPT_TIME_UNKNOWN',
   availableAt:Math.max(c.availableAt,match?.observedAt||0)};
 });
 const latest=annotated.at(-1)||null;
 const observed=events.filter(e=>e.type==='OBSERVED').at(-1)||null;
 const interrupted=!!(observed&&events.some(e=>e.type==='INTERRUPTED'&&
   e.observedAt>observed.observedAt&&e.sourceTs===observed.sourceTs&&
   e.direction===observed.direction));
 const barStart=Math.floor(now/period)*period;
 const live=observed&&observed.sourceTs===barStart&&!interrupted?
   {direction:observed.direction,sourceTs:observed.sourceTs,
    observedAt:observed.observedAt,kind:is15?'E15_NATIVE_LIVE':'E3_NATIVE_LIVE',
    availability:'ACTUAL_AUDIT_OBSERVATION'}:null;
 return {family,confirmed:latest,live,interrupted,
  note:'Native E3/E15 are separate from geometrical extrema and their clocks'};
}
function defendedTerritory({input,now,dir,ma3,ma15,riskPlace}){
 const d=sign(dir),retest=riskPlace?.invalidation?.acceptedRetest||null;
 const heldAt=n(retest?.heldAt);
 const validRetest=!!(retest?.state==='DEFENDED'&&
  heldAt!==null&&heldAt<=now&&
  n(retest.retestAt)!==null&&retest.retestAt<heldAt&&
  n(retest.crossedAt)!==null&&retest.crossedAt<retest.retestAt&&
  n(retest.observedThrough)!==null&&retest.observedThrough<=now);
 const acceptsMA=m=>!!(m&&m.state==='ACCEPTED'&&m.accepted===true&&
   (m.confirmedSame||m.confirmedStrong)&&
   n(m.lastConfirmedAt)!==null&&m.lastConfirmedAt<=now&&
   n(m.ma)!==null&&d&&d*(input.price-m.ma)>0);
 const ma3Contact=!!(ma3?.recentlyTouched&&ma3?.zone&&
  ma3.zone.source==='CONFIRMED_PRICE_EXTREMA'&&ma3.zone.tests>=1);
 const ma15Contact=!!(ma15?.recentlyTouched&&ma15?.zone&&
  ma15.zone.source==='CONFIRMED_PRICE_EXTREMA'&&ma15.zone.tests>=1);
 const ma3Held=acceptsMA(ma3)&&ma3Contact;
 const ma15Held=acceptsMA(ma15)&&ma15Contact;
 let level=null,availableAt=null;
 if(validRetest){level=n(retest.level);availableAt=heldAt;}
 else if(ma3Held){level=n(ma3.ma);availableAt=n(ma3.lastConfirmedAt);}
 else if(ma15Held){level=n(ma15.ma);availableAt=n(ma15.lastConfirmedAt);}
 return {
  validated:validRetest||ma3Held||ma15Held,
  status:validRetest?'CONFIRMED_PRICE_RETEST_DEFENDED':
   ma3Held?'CONFIRMED_MA3_ACCEPTED_AFTER_PRICE_CONTACT':
   ma15Held?'CONFIRMED_MA15_ACCEPTED_AFTER_PRICE_CONTACT':
   'NO_PROVEN_TERRITORY_DEFENCE',
  retest:validRetest?{level:retest.level,crossedAt:retest.crossedAt,
   retestAt:retest.retestAt,heldAt:retest.heldAt,
   evidence:retest.evidence}:null,
  ma3State:ma3?.state||'UNKNOWN',ma15State:ma15?.state||'UNKNOWN',
  hasRealMA3Contact:ma3Contact,level,availableAt,
  source:validRetest?'DEFENDED_RETEST':ma3Held?'MA3_CLOSED_CONTACT':
   ma15Held?'MA15_CLOSED_CONTACT':'NONE',
  note:'Simple local candle crossing is not defended territory'
 };
}
function tacticalEpisode({input,now,dir,cross,native3,native15,territory,
 parentAvailableAt,legacyPivot3}){
 const d=sign(dir),crossAt=n(cross?.ts);
 // A new E15 confirmation may VALIDATE an E3 already observed beforehand.
 // E3->E15 is not a stale reuse if the E3 belongs to the same E15 source bar.
 const proof15=native15?.confirmed;
 const requalifiedByNewE15=!!(crossAt!==null&&proof15&&
  proof15.direction===dir&&n(proof15.availableAt)!==null&&
  proof15.availableAt<=now&&proof15.availableAt>=crossAt&&
  crossAt>=proof15.sourceTs);
 const aligned=!!(d&&cross?.direction===dir&&crossAt!==null&&
  crossAt<=now&&(crossAt>=parentAvailableAt||requalifiedByNewE15));
 const confirmed=native3.confirmed,live=native3.live;
 const confirmedMatch=!!(confirmed&&confirmed.direction===dir&&
  confirmed.availableAt<=now&&confirmed.sourceTs<=crossAt&&
  (live===null||live.direction===dir));
 const liveMatch=!!(live&&live.direction===dir&&
  live.observedAt>=crossAt-THREE);
 const nativeAligned=confirmedMatch||liveMatch;
 const territoryAligned=!!territory.validated;
 const proofAt=aligned&&nativeAligned&&territoryAligned?
  Math.max(crossAt,territory.availableAt||0,
   confirmedMatch?confirmed.availableAt:live.observedAt):null;
 return {
  allowed:!!(aligned&&nativeAligned&&territoryAligned),
  direction:dir,alignedCross:aligned,crossAt,nativeAligned,
  requalifiedByNewE15,
  confirmedE3:confirmedMatch?confirmed:null,
  liveE3:liveMatch?live:null,
  defended:territory,
  structural3PivotMemory:legacyPivot3||null,
  structural3PivotOpposes:!!(legacyPivot3&&legacyPivot3!==dir),
  structural3PivotHasVeto:false,proofAt,
  reason:!aligned?'WAIT_MCB3_CROSS_INSIDE_CAMPAIGN':
   !nativeAligned?'WAIT_NATIVE_E3_CONFIRMATION_OR_VALID_LIVE':
   !territoryAligned?'WAIT_ACTUAL_ACCEPTANCE_OR_RETEST':
   'TACTICAL_CHAIN_WITH_DEFENDED_TERRITORY'
 };
}
module.exports={nativeProof,defendedTerritory,tacticalEpisode};
