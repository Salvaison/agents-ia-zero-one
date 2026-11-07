'use strict';
// BOONOLAB — seven EVENT families, separate from V494 seven STATE dimensions.
// Sources are timestamped and linked, not counted as independent votes.
const VERSION='boonolab-seven-family-chronicle-v0.1';
const FAMILIES=['MCB15','MCB3','FLOW','MA','CONVERSION','BOUNDARY','CONTEXT'];
const n=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const sign=x=>n(x)===null?'UNKNOWN':x>.15?'UP':x<-.15?'DN':'FLAT';
function initial(){return {version:VERSION,mode:'SHADOW_ONLY',
 decisionImpact:false,brokerOrdersEnabled:false,lastAt:0,nativeLastId:0,
 nextSeq:0,current:{},counts:{},lastEvents:[],latestSnapshot:null};}
function snapshot({asOf,price,analysis,regime,threat,elasticState}={}){
 const r=analysis?.readings||{},s=r.structural54||{},
  cv=r.conversion||{},ma=r.maContract||{},t=s.testedTerritory||{};
 const ma3=ma.ma3||{},ma15=ma.ma15||{},
  rejection3=ma3.polarityMemory?.lastRejection||{},
  rejection15=ma15.polarityMemory?.lastRejection||{};
 const grade=elasticState?.current?.CONVERSION_QUALITY||null;
 const flow3=sign(cv.mf3Delta3m),flow15=sign(cv.mf15Delta10m);
 const market=regime?.label||'INDETERMINE';
 const states={
  MCB15:{status:s.director||'UNKNOWN',phase:s.phase||null,
   parent:s.campaignId||null,e15Live:s.oppositeLive15?.direction||null,
   sourceAt:n(s.structuralOrigin?.availableAt)},
  MCB3:{status:s.mcb3Direction||'UNKNOWN',
   sourceAt:n(s.mcb3?.latestPivot?.availableAt)},
  FLOW:{status:flow3===flow15&&['UP','DN'].includes(flow3)?
    'MF3_MF15_'+flow3:flow3==='UNKNOWN'||flow15==='UNKNOWN'?
      'UNKNOWN':'MF_MIXED_OR_WEAK',
   mf3:cv.mf3Delta3m??null,mf15:cv.mf15Delta10m??null},
  MA:{status:(ma3.state||'UNKNOWN')+' / '+(ma15.state||'UNKNOWN'),
   ma3:ma3.state||null,ma15:ma15.state||null,
   lastRejection3At:n(rejection3.at),lastRejection15At:n(rejection15.at),
   lastFailedReclaim3At:n(ma3.polarityMemory?.lastFailedReclaim?.at),
   retests3:ma3.polarityMemory?.retestsSinceChange??null,
   level3:ma3.ma??null},
  CONVERSION:{status:n(cv.pm3)!==null&&n(cv.pm5)!==null?
    (cv.pm3>0&&cv.pm5>0?'PM_AGREE_LONG':
     cv.pm3<0&&cv.pm5<0?'PM_AGREE_SHORT':'PM_CONTRADICTORY'):
    'PM_UNKNOWN',
   pm3:cv.pm3??null,pm5:cv.pm5??null,pmLive:cv.pmCombined??null,
   v494Quality:grade,elasticIsIndependentVote:false},
  BOUNDARY:{status:t.status||'UNRESOLVED',
   level:t.level??null,validated:t.validated===true,
   sourceAt:n(t.availableAt),source:t.source||null,
   parent:s.campaignId||null},
  CONTEXT:{status:market,regime:market,
   intensity:regime?.intensity||'UNKNOWN',
   productivity:regime?.productivity||'UNKNOWN',
   parent:s.campaignId||null,
   currentPositionThreat:threat?.status||'NO_POSITION',
   context4h:regime?.twoHour?.context4h||null}
 };
 const statesFlat={};
 for(const f of FAMILIES)statesFlat[f]=states[f];
 return {version:VERSION,asOf,price,states:statesFlat,
  source:'V543_READONLY+V494_ELASTIC_READONLY+AUDIT',
  decisionImpact:false,brokerOrdersEnabled:false};
}
function changeKey(f,v){
 switch(f){
 case 'MCB15':return [v.status,v.parent,v.phase,v.e15Live].join('|');
 case 'MCB3':return [v.status,v.sourceAt].join('|');
 case 'FLOW':return v.status; // MF amplitudes change continuously; do not spam
 case 'MA':return [v.ma3,v.ma15,v.lastRejection3At,v.lastRejection15At,
  v.lastFailedReclaim3At,v.retests3].join('|');
 case 'CONVERSION':return [v.status,v.v494Quality].join('|');
 case 'BOUNDARY':return [v.status,v.validated,v.sourceAt,v.parent].join('|');
 case 'CONTEXT':return [v.regime,v.parent,v.currentPositionThreat].join('|');
 default:return JSON.stringify(v);
 }
}
function add(s,{at,family,key,type,sourceAt=null,value=null,relatedTo=null,
 origin='DERIVED_READ_ONLY',uncertain=false}){
 const e={version:VERSION,seq:++s.nextSeq,id:s.nextSeq,at,family,key,type,
  sourceAt,knownAt:at,relatedTo,origin,uncertain,
  value,decisionImpact:false,brokerOrdersEnabled:false};
 s.counts[family]=(s.counts[family]||0)+1;
 s.lastEvents.unshift(e);s.lastEvents=s.lastEvents.slice(0,40);
 return e;
}
function observe(old,{asOf,price,analysis,regime,threat,
  elasticState,native=[]}={}){
 const s=old||initial();
 if(s.version!==VERSION||s.decisionImpact!==false||
  s.brokerOrdersEnabled!==false)throw Error('SEVEN_FAMILY_UNTRUSTED_STATE');
 if(!n(asOf)||asOf<=s.lastAt)
  return {state:s,events:[],changed:false};
 const events=[],snap=snapshot({asOf,price,analysis,regime,threat,elasticState});
 // Historical native E3/E15/crosses already existed before this observer.
 // Never fabricate their original observation as freshly recorded.
 const present=(native||[]).filter(x=>Number.isSafeInteger(Number(x.id))&&
  n(x.observedAt)!==null&&x.observedAt<=asOf)
  .sort((a,b)=>a.observedAt-b.observedAt||a.id-b.id);
 if(!s.lastAt){
  s.nativeLastId=Math.max(0,...present.map(x=>Number(x.id)));
 }else{
  for(const e of present){
   if(Number(e.id)<=s.nativeLastId)continue;
   if(!['MCB3','MCB15'].includes(e.family))continue;
   if(!['E3','E15','BW_LBW_CROSS'].includes(e.key))continue;
   if(!['OBSERVED','CONFIRMED','INTERRUPTED'].includes(e.type))continue;
   events.push(add(s,{at:e.observedAt,family:e.family,key:e.key,
    type:e.type,sourceAt:n(e.sourceTs),origin:'NATIVE_FIRST_OBSERVED',
    value:{direction:e.direction||null,price:e.price??null,
     nativeId:e.id,reading:e.current?.value??null,
     sourceBarAt:e.sourceTs??null},
    relatedTo:e.key==='BW_LBW_CROSS'?
     'E3_OR_E15_SAME_OSCILLATOR_NOT_INDEPENDENT':null}));
  }
  s.nativeLastId=Math.max(s.nativeLastId,
   ...present.map(x=>Number(x.id)),0);
 }
 for(const family of FAMILIES){
  const state=snap.states[family];
  const key=changeKey(family,state),oldKey=s.current[family]?.key;
  if(key===oldKey)continue;
  const first=!s.lastAt;
  events.push(add(s,{at:asOf,family,key:family+'_STATE',
   type:first?'BOOTSTRAP_OBSERVED':'STATE_CHANGED',
   sourceAt:n(state.sourceAt),origin:first?'CURRENT_STATE_NOT_RETROACTIVE':
    'DERIVED_STATE_AS_OF',uncertain:family==='CONTEXT'||
     family==='CONVERSION',
   value:{from:s.current[family]?.status||null,to:state.status,
    state,price},relatedTo:family==='CONVERSION'?
      'PM3_PM5_OVERLAP_NOT_INDEPENDENT':null}));
  s.current[family]={key,status:state.status,at:asOf,state};
 }
 s.lastAt=asOf;s.latestSnapshot=snap;
 return {state:s,events,changed:true};
}
function summary(s,regime=null,position=null){
 return {version:VERSION,asOf:s.lastAt,mode:'SHADOW_ONLY',
  decisionImpact:false,brokerOrdersEnabled:false,
  sevenFamilies:FAMILIES,
  current:Object.fromEntries(FAMILIES.map(f=>[f,s.current[f]?.state||null])),
  counts:s.counts,lastEvents:s.lastEvents.slice(0,16),
  regime,positionAttention:position?.current||null,
  positionSessions:position?.recentClosed?.slice(0,8)||[],
  positionAttentionEpisodes:position?.episodeCount||0,
  view:'DELIBERATE_READER_REFRESH_ONLY',
  storage:'ROTATING_OBSERVER_LOGS_NOT_GUARANTEED_14_DAYS',
  notes:['Native and derived events have separate timestamps/authority',
   'Seven event families do not equal seven V494 state dimensions',
   'No automatic PAPER trade impact']};
}
module.exports={VERSION,FAMILIES,initial,snapshot,observe,summary,changeKey};
