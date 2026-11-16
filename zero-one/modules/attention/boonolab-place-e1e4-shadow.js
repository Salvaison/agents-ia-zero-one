'use strict';
// BOONOLAB E1/E4 / STRUCTURAL PLACE: pure as-of observer, never an order.
const VERSION='boonolab-e1e4-place-shadow-v0.1';
const num=x=>x===null||x===undefined||x===''?null:
 Number.isFinite(Number(x))?Number(x):null;
const r=x=>x===null?null:Math.round(x*100)/100;
const opposite=x=>x==='long'?'short':x==='short'?'long':null;
function parseMcbCsv(text,tf){
 const period=tf==='1h'?3600000:tf==='4h'?14400000:null;
 if(!period)throw Error('E1E4_UNSUPPORTED_TF');
 return String(text||'').split(/\r?\n/).slice(1).map(l=>{
  const v=l.split(','),ts=Date.parse(v[0]);
  const up=num(v[13]),dn=num(v[14]);
  if(!Number.isFinite(ts)||num(v[5])===null||num(v[6])===null)return null;
  return {sourceTs:ts,availableAt:ts+period,lbw:num(v[5]),
   bw:num(v[6]),mf:num(v[7]),
   signal:up!==null&&dn===null?'long':dn!==null&&up===null?'short':null,
   price:num(v[4])};
 }).filter(Boolean).sort((a,b)=>a.sourceTs-b.sourceTs);
}
function confirmedE(bars,asOf){
 const valid=(bars||[]).filter(x=>x.availableAt<=asOf);
 const prior=valid.at(-2)||null,latest=valid.at(-1)||null;
 const lastSignal=[...valid].reverse().find(x=>x.signal)||null;
 return {status:latest?'CONFIRMED_BAR_CLOSE_PROXY':'NO_CONFIRMED_BAR',
  direction:lastSignal?.signal||null,
  sourceAt:lastSignal?.sourceTs||null,
  knownAtProxy:lastSignal?.availableAt||null,
  ageMinutes:lastSignal?r((asOf-lastSignal.availableAt)/60000):null,
  lbw:latest?.lbw??null,bw:latest?.bw??null,mf:latest?.mf??null,
  lbwChange:latest&&prior?r(latest.lbw-prior.lbw):null,
  lastBarAvailableAt:latest?.availableAt||null,
  availabilityBasis:'BAR_CLOSE_AT_PERIOD_END_NOT_ACTUAL_FIRST_OBSERVATION'};
}
function ranges(levels,price,sourceMtime,asOf){
 const sourceAt=num(sourceMtime);
 if(!Array.isArray(levels)||sourceAt===null||sourceAt>asOf)
  return {status:'LEVELS_NOT_CAUSALLY_AVAILABLE',sourceAt,
   big:null,daily:null,nearestAbove:null,nearestBelow:null};
 const groups=new Map(),points=[];
 for(const v of levels){
  const p=num(v.price);if(p===null||p<=0)continue;
  if(['DS','DR','WS','WR','MS','MR'].includes(v.token))points.push({token:v.token,price:p});
  if(!['VAL','POC','VAH'].includes(v.token)||v.groupId==null)continue;
  const scope=String(v.label||'').split(/\s+/).slice(1)[0]||'other';
  const key=String(v.groupId)+'|'+scope;
  if(!groups.has(key))groups.set(key,{scope,values:{}});
  groups.get(key).values[v.token]=p;
 }
 const summary=g=>{
  if(!g||[g.values.VAL,g.values.POC,g.values.VAH].some(x=>x==null))return null;
  const {VAL:val,POC:poc,VAH:vah}=g.values;
  if(!(vah>val&&poc>val&&poc<vah))return null;
  const span=vah-val,pocSide=price>=poc?'ABOVE_POC':'BELOW_POC';
  return {scope:g.scope,val,poc,vah,
   positionPct:r(100*(price-val)/span),
   fromPocUsd:r(price-poc),
   signedPocPct:r(100*(price-poc)/(price>=poc?vah-poc:poc-val)),
   outside:price>vah?'ABOVE_VAH':price<val?'BELOW_VAL':'INSIDE',
   distanceToVal:r(price-val),distanceToVah:r(vah-price),
   signedBoundaryExtensionUsd:price>vah?r(price-vah):price<val?r(price-val):0,
   basis:'USER_RECORDED_STATIC_VALUE_AREA_PROXY_NOT_L2_LIQUIDITY'};
 };
 const pool=[...groups.values()];
 const nearest=list=>list.sort((a,b)=>Math.abs(a.price-price)-Math.abs(b.price-price))[0]||null;
 return {status:'RECORDED_LEVEL_SNAPSHOT',sourceAt,
  big:summary(pool.find(x=>x.scope==='big')),
  daily:summary(pool.find(x=>x.scope==='daily')),
  other:pool.filter(x=>!['big','daily'].includes(x.scope)).map(summary).filter(Boolean),
  nearestAbove:nearest(points.filter(x=>x.price>=price)),
  nearestBelow:nearest(points.filter(x=>x.price<price))};
}
function marketReading(regime,asOf,dir){
 if(!regime||num(regime.asOf)===null||regime.asOf>asOf||
    asOf-regime.asOf>95000)
  return {status:'REGIME_ASOF_UNAVAILABLE',sourceAt:num(regime?.asOf)};
 const m=regime.metrics?.lastHour||{},t=regime.twoHour||{};
 const e=num(m.pathEfficiency),ret=num(m.retainedFraction);
 const label=regime.label||'INDETERMINE';
 let review='UNKNOWN';
 if(label==='STERILE_HESITANT')review='REVIEW_WEAK_UNPRODUCTIVE';
 else if(label==='DENSE_CONTRADICTOIRE'){
  // Exploratory retention only. Not a universal veto on productive shorts.
  review=e!==null&&ret!==null&&e<.18&&ret<.45?
   'REVIEW_CONTESTED_WITHOUT_TERRITORY':
   'PRESERVE_CONTESTED_WHILE_MEASURING_DEFENCE';
 }else if(label==='SILENCIEUX_PRODUCTIF')review='PRESERVE_SILENT_PRODUCTIVE';
 else if(label==='DIRECTIONNEL_PRODUCTIF')review='PRESERVE_DIRECTIONAL_PRODUCTIVE';
 return {status:'DESCRIPTIVE_SHADOW_NOT_VALIDATED',sourceAt:regime.asOf,
  label,intensity:regime.intensity||null,productivity:regime.productivity||null,
  pathEfficiency:e,retainedFraction:ret,
  twoHourDirection:t.direction||null,twoHourContext4h:t.context4h||null,
  directionAgreesWith2h:!!(dir&&dir===t.direction),
  review,caveat:'Relative regimes trained historically; no admission authority, no universal DENSE veto'};
}
function inspect({at,price,direction,phase,bars1h,bars4h,levels,
 levelsMtime,regime,position=null}={}){
 if(num(at)===null||num(price)===null||!['long','short'].includes(direction))
  return {version:VERSION,status:'UNAVAILABLE',decisionImpact:false,brokerOrdersEnabled:false};
 const e1=confirmedE(bars1h,at),e4=confirmedE(bars4h,at);
 const place=ranges(levels,price,levelsMtime,at);
 const market=marketReading(regime,at,direction);
 const alignment=e1.direction&&e4.direction?
  e1.direction===direction&&e4.direction===direction?'BOTH_ALIGN':
  e1.direction===direction?'E1_ONLY':
  e4.direction===direction?'E4_ONLY':'BOTH_OPPOSE':'INCOMPLETE';
 const riskFlags=[];
 if(market.review.startsWith('REVIEW_'))riskFlags.push(market.review);
 if(e1.direction===opposite(direction)&&e4.direction===opposite(direction))
  riskFlags.push('BOTH_SLOW_E_OPPOSE_ENTRY');
 if(place.big){
  if(place.big.outside!=='INSIDE')riskFlags.push('OUTSIDE_BIG_VALUE_AREA');
  if(place.big.signedPocPct<-80&&direction==='long')
   riskFlags.push('LOW_BIG_RANGE_POC_TERRITORY');
 }
 return {version:VERSION,status:'ASOF_OBSERVED',asOf:at,price,
  direction,phase:phase||null,positionDirection:position?.direction||null,
  e1,e4,alignment,place,market,riskFlags,
  proposedAdmission:market.review.startsWith('REVIEW_')?
    'EXAMINE_ADMISSION_MARKET_NOT_AUTOMATIC_VETO':
    'NO_REGIME_BASED_ADMISSION_VETO',
  proposedPosition:'NO_NEW_POSITION_EXIT_CONTRACT',
  proposedTransfer:'NOT_DECIDED_BY_E1_E4_OR_POC_ALONE',
  authority:'SHADOW_ONLY',entryAllowed:null,exitRequested:null,
  decisionImpact:false,brokerOrdersEnabled:false};
}
module.exports={VERSION,parseMcbCsv,confirmedE,ranges,marketReading,inspect};
