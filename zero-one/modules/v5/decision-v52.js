'use strict';
// BOONO Systems V5.2: structural phase -> geometry -> place -> conversion ->
// conditional prognosis -> PAPER decision/invalidation. Pure; no broker imports.
const trajectory=require('../v4/layers/structural-trajectory');
const VERSION='v5.2-structural-decision-paper-v0.1';
const N=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const rr=v=>N(v)===null?null:Math.round(v*10)/10;
const sign=v=>N(v)===null||v===0?null:v>0?'long':'short';
const mult=d=>d==='long'?1:-1;
const min=60000;
function median(xs){const a=xs.filter(Number.isFinite).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null;}
function nearby(rows,ts,tolerance=70000){
 const a=rows.filter(r=>r.ts<=ts).at(-1);
 return a&&ts-a.ts<=tolerance?a:null;
}
function change(a,b){return N(a)!==null&&N(b)!==null?rr(a-b):null;}
function geometric(rows,tf,now){
 const fields=tf==='3m'?['liveLbw','liveBw']:['live15LbwRaw','live15BwRaw'];
 const out=[],valid=rows.filter(r=>N(r[fields[0]])!==null&&N(r[fields[1]])!==null&&
   r.ts<=now&&now-r.ts<=3*60*min);
 let prior=null;
 for(const r of valid){
  const spread=N(r[fields[0]])-N(r[fields[1]]);
  if(prior && r.ts-prior.ts<=90000 && spread!==0&&prior.spread!==0&&spread*prior.spread<0){
   out.push({ts:r.ts,direction:spread>0?'long':'short',price:rr(r.lastPrice),
    fromSpread:rr(prior.spread),toSpread:rr(spread),
    slopePerMinute:rr((spread-prior.spread)/((r.ts-prior.ts)/min)),
    level:rr(r[fields[0]]),barTs:Math.floor(r.ts/(tf==='3m'?3*min:15*min))*(tf==='3m'?3*min:15*min)});
  }
  prior={ts:r.ts,spread};
 }
 const flips45=out.filter(x=>now-x.ts<=45*min);
 return {currentSpread:prior?rr(prior.spread):null,
  last:out.at(-1)||null,flips45m:flips45.length,
  latest3:flips45.slice(-3),zeroOscillator:N(rows.at(-1)?.[fields[0]])!==null?
  Math.abs(rows.at(-1)[fields[0]])<15:false};
}
function events(rows,tf,now){
 const up=tf==='3m'?'liveSignalUp':'live15SignalUp';
 const dn=tf==='3m'?'liveSignalDn':'live15SignalDn';
 const seen=new Map();
 for(const r of rows){
  if(r.ts>now)continue;
  const bar=Math.floor(r.ts/(tf==='3m'?3*min:15*min))*(tf==='3m'?3*min:15*min);
  for(const [name,col] of [['long',up],['short',dn]]){
   const v=N(r[col]);if(v===null)continue;
   const key=name+'|'+bar;
   if(!seen.has(key))seen.set(key,{direction:name,barTs:bar,firstObservedAt:r.ts,value:rr(v)});
  }
 }
 return [...seen.values()].sort((a,b)=>a.firstObservedAt-b.firstObservedAt);
}
function priceRef(samples,at,minutes,price){
 const target=at-minutes*min;
 const older=[...samples].reverse().find(r=>r.ts<=target&&target-r.ts<=65000);
 return older?change(price,older.lastPrice):null;
}
function levelsAt(levels,price,b15,b3){
 const m=(levels||[]).filter(x=>N(x.price)!==null&&N(x.price)>0&&
  !['fib0','fib1'].includes(x.token)).map(x=>({key:x.token,
   label:x.label||x.token,price:N(x.price),kind:'MAP'}));
 const local=b15.slice(-16),l3=b3.slice(-20);
 const low=local.length?Math.min(...local.map(x=>x.low).filter(Number.isFinite)):null;
 const high=local.length?Math.max(...local.map(x=>x.high).filter(Number.isFinite)):null;
 if(Number.isFinite(low))m.push({key:'MCB15_LOCAL_LOW',price:low,kind:'LOCAL'});
 if(Number.isFinite(high))m.push({key:'MCB15_LOCAL_HIGH',price:high,kind:'LOCAL'});
 const l3low=l3.length?Math.min(...l3.map(x=>x.low).filter(Number.isFinite)):null;
 const l3high=l3.length?Math.max(...l3.map(x=>x.high).filter(Number.isFinite)):null;
 if(Number.isFinite(l3low))m.push({key:'MCB3_LOCAL_LOW',price:l3low,kind:'LOCAL'});
 if(Number.isFinite(l3high))m.push({key:'MCB3_LOCAL_HIGH',price:l3high,kind:'LOCAL'});
 const ma=b3.at(-1)&&N(b3.at(-1).ma200);
 if(ma!==null)m.push({key:'MA200_3M',price:ma,kind:'MOVING'});
 const above=m.filter(x=>x.price>price+1).sort((a,b)=>a.price-b.price)[0]||null;
 const below=m.filter(x=>x.price<price-1).sort((a,b)=>b.price-a.price)[0]||null;
 const nearest=[above,below].filter(Boolean).sort((a,b)=>Math.abs(a.price-price)-Math.abs(b.price-price))[0]||null;
 return {above,below,nearest,all:m.filter(x=>Math.abs(x.price-price)<1500).slice(0,15),
   profile:{VAL:m.find(x=>x.key==='VAL')?.price||null,
    POC:m.find(x=>x.key==='POC')?.price||null,VAH:m.find(x=>x.key==='VAH')?.price||null}};
}
function evaluate(input){
 const {samples=[],bars15=[],bars3=[],bars1h=[],bars4h=[],levels=[],now,
  price,startedAt=0,position=null,sourceAgeMs=null,tickAgeMs=null}=input;
 const last=samples.at(-1),btc=N(price),ts=N(now);
 const empty={version:VERSION,asOf:ts,price:btc,mode:position?'IN_POSITION':'FLAT',
  action:'WAIT',candidate:null,phase:'DATA_UNKNOWN',prognosis:'Données à vérifier',
  reason:'Missing market/MCB',invalidation:null,readings:{},quality:'DATA_UNKNOWN',
  tradingEnabled:false,brokerOrdersEnabled:false};
 if(!last||!Number.isFinite(ts)||!Number.isFinite(btc))return empty;
 const goodPrice=sourceAgeMs!==null&&sourceAgeMs>=0&&sourceAgeMs<=95000&&tickAgeMs!==null&&tickAgeMs<=25000;
 const c15=bars15.filter(b=>b.ts+15*min<=ts&&N(b.lt_blue_wave)!==null);
 const c3=bars3.filter(b=>b.ts+3*min<=ts&&N(b.lt_blue_wave)!==null);
 const phase15=trajectory.evaluate({history:c15},'15m');
 const phase3=trajectory.evaluate({history:c3},'3m');
 const phase1=trajectory.evaluate({history:bars1h.filter(b=>b.ts+60*min<=ts)},'1h');
 const phase4=trajectory.evaluate({history:bars4h.filter(b=>b.ts+240*min<=ts)},'4h');
 const lbw15=N(last.live15LbwRaw),bw15=N(last.live15BwRaw),mf15=N(last.live15MfRaw);
 const lbw3=N(last.liveLbw),bw3=N(last.liveBw),mf3=N(last.liveMoneyFlow);
 const g3=geometric(samples,'3m',ts),g15=geometric(samples,'15m',ts);
 const es3=events(samples,'3m',ts),es15=events(samples,'15m',ts);
 const cross=g3.last,dir=cross?.direction||phase15.structuralDirection||null;
 const ageCross=cross?(ts-cross.ts)/min:null;
 const bar15=Math.floor(ts/(15*min))*(15*min);
 const bar3=Math.floor(ts/(3*min))*(3*min);
 const rawFresh=N(last.ts)!==null&&ts-last.ts<=65000 &&
    N(last.live15LbwRaw)!==null&&N(last.liveLbw)!==null &&
    last.ts>=bar15&&last.ts>=bar3;
 const med3=median(c3.slice(-35).map(b=>b.high-b.low));
 const r3=priceRef(samples,ts,3,btc),r5=priceRef(samples,ts,5,btc);
 const r15=priceRef(samples,ts,15,btc);
 const between=change(btc,last.lastPrice);
 const batonMove=N(last.priceMove);
 const mf3past=nearby(samples,ts-3*min);
 const mf15past=nearby(samples,ts-10*min);
 const dMF3=mf3past?change(mf3,mf3past.liveMoneyFlow):null;
 const dMF15=mf15past?change(mf15,mf15past.live15MfRaw):null;
 const original=nearby(samples,cross?.ts||0,65000);
 const sinceCross=cross&&original?change(btc,original.lastPrice):null;
 const loc=levelsAt(levels,btc,c15,c3);
 const recent15=samples.filter(x=>ts-x.ts<=45*min&&x.ts<=ts&&N(x.live15LbwRaw)!==null);
 const absPeak15=recent15.length?Math.max(...recent15.map(x=>Math.abs(N(x.live15LbwRaw)))):Math.abs(lbw15||0);
 const oscDirection=lbw15<0?'long':'short';
 const extreme=absPeak15>=50;
 const reversal=!!(dir&&extreme&&dir===oscDirection);
 const continuation=!!(dir&&!reversal&&phase15.structuralDirection===dir&&phase3.structuralDirection===dir);
 const zoneTolerance=Math.max(65,(med3||65)*2.0);
 const place=loc.nearest&&Math.abs(loc.nearest.price-btc)<=zoneTolerance;
 const nearSupport=loc.below&&btc-loc.below.price<=zoneTolerance;
 const nearResistance=loc.above&&loc.above.price-btc<=zoneTolerance;
 const boundaryFavorable=dir==='long'?nearSupport:nearResistance;
 const aligned=dir&&N(r3)!==null&&N(r5)!==null&&r3*mult(dir)>12&&r5*mult(dir)>8;
 const liveResponse=dir&&between!==null&&batonMove!==null&&
   (between+batonMove)*mult(dir)>0;
 const mfTactical=dir&&dMF3!==null&&dMF3*mult(dir)>0;
 const mfSlow=dir&&dMF15!==null&&dMF15*mult(dir)>-1.8;
 const key=cross?dir+'|'+cross.ts+'|'+(reversal?'REVERSAL':'CONTINUATION'):null;
 const overCross=sinceCross!==null&&dir?sinceCross*mult(dir):null;
 const consumed=!!(overCross!==null&&med3!==null&&overCross>Math.max(95,med3*2.7));
 const noisy=!!(g3.flips45m>=12||(g15.flips45m>=6&&Math.abs(lbw15||0)<30));
 let phase='STRUCTURE_OBSERVED';
 if(noisy)phase='CROSS_OSCILLATION';
 else if(reversal)phase=absPeak15>=60?'EXTREME_REVERSAL_CANDIDATE':'EXPANDED_REVERSAL_CANDIDATE';
 else if(continuation)phase='PERSISTENT_CAMPAIGN_CONTINUATION';
 else if(extreme)phase='EXTENSION_OR_EXHAUSTION';
 else phase='MID_WAVE_UNRESOLVED';
 if(consumed)phase='MOVE_CONSUMED_RISK';
 const potentialBoundary=dir==='long'?loc.above:loc.below;
 const invBoundary=dir==='long'?loc.below:loc.above;
 const cushion=Math.max(18,(med3||55)*.3);
 const syntheticStop=btc-mult(dir)*Math.max(130,(med3||60)*1.4);
 const invalidationPrice=invBoundary&&Math.abs(btc-invBoundary.price)<500?
   invBoundary.price-mult(dir)*cushion:syntheticStop;
 const invDistance=dir?Math.abs(btc-invalidationPrice):null;
 const room=potentialBoundary?Math.abs(potentialBoundary.price-btc):null;
 const feeMove=btc*1.5/1500;
 const viable=!!(room!==null&&invDistance!==null&&room>Math.max(feeMove*2.3,invDistance*1.15));
 const freshCross=!!(cross&&cross.ts>=startedAt&&ageCross>=0&&ageCross<=12);
 const viableStage=!!(reversal&&(boundaryFavorable||absPeak15>=60)||continuation&&(place||absPeak15>=35));
 const entryReady=goodPrice&&rawFresh&&freshCross&&viableStage&&aligned&&
  liveResponse&&mfTactical&&mfSlow&&!consumed&&!noisy&&viable;
 let action=entryReady?'ENTER_'+dir.toUpperCase():'WAIT';
 let reason=!goodPrice?'PRIX_INSUFFISAMMENT_FRAIS':!rawFresh?'MCB_LIVE_STALE':
  !freshCross?'PAS_DE_NOUVEAU_CROSS3_DEPUIS_ACTIVATION':
  !viableStage?'PHASE_LIEU_A_PRECISER':!aligned?'PM3_PM5_NON_PRODUCTIFS':
  !liveResponse?'PM_LIVE_DEPUIS_BATON_NON_CONVERTI':
  !mfTactical?'MF3_SANS_TRANSFERT':!mfSlow?'MF15_ADVERSE':
  consumed?'MOUVEMENT_DEJA_ETENDU':noisy?'CROSS_OSCILLANTS':
  !viable?'ESPACE_ECONOMIQUE_INSUFFISANT':'CONVERSION_EXPLOITABLE';
 if(position){action='HOLD';reason='CAMPAGNE_TENUE';
   const pd=position.direction,pdir=mult(pd),signedMove=(btc-position.entryPrice)*pdir;
   if(signedMove<=-500){action='EXIT_'+pd.toUpperCase();reason='HARD_RISK_500';}
   else if(N(position.invalidationPrice)!==null&&(btc-position.invalidationPrice)*pdir<=0){
     action='EXIT_'+pd.toUpperCase();reason='INVALIDATION_STRUCTURELLE';}
   else if(g15.last&&g15.last.direction!==pd&&ts-g15.last.ts<=25*min&&
     r3!==null&&r5!==null&&r3*pdir<-(med3||60)*.55&&r5*pdir<-(med3||60)*.7&&
     dMF15!==null&&dMF15*pdir<-0.8){
     action='EXIT_'+pd.toUpperCase();reason='TRANSFERT_15M_ADVERSE_AVEC_CONVERSION';}
   else if(phase15.structuralDirection&&phase15.structuralDirection!==pd&&
     r5!==null&&r5*pdir<-(med3||60)*.7&&dMF15!==null&&dMF15*pdir<0){
     action='EXIT_'+pd.toUpperCase();reason='TRAJECTOIRE_15M_INVALIDE_ET_CONVERSION_ADVERSE';}
 }
 const quality=goodPrice&&rawFresh?'DATA_OK':'DATA_DEGRADED';
 return {version:VERSION,asOf:ts,batonAt:last.ts,price:btc,mode:position?'IN_POSITION':'FLAT',
  action,candidate:dir,entryKey:key,phase,
  prognosis:dir?(reversal?'Retournement '+dir+' envisagé sur expansion MCB15':
    continuation?'Continuation '+dir+' de campagne MCB15':'Transition '+dir+' à qualifier'):
    'Aucune direction exploitable',reason,quality,
  invalidation:dir?{price:rr(invalidationPrice),reference:invBoundary?.key||'3M_VOLATILITY_FALLBACK',
    distanceUsd:rr(invDistance)}:null,
  levels:loc,readings:{
   mcb15:{lbw:rr(lbw15),bw:rr(bw15),mf:rr(mf15),extreme45m:rr(absPeak15),
    trajectory:phase15.structuralDirection,context1h:phase1.structuralDirection,
    context4h:phase4.structuralDirection,phase},
   mcb3:{lbw:rr(lbw3),bw:rr(bw3),mf:rr(mf3),trajectory:phase3.structuralDirection},
   geometry:{cross3:cross,cross15:g15.last,flips3:g3.flips45m,
    flips15:g15.flips45m,spread3:g3.currentSpread,spread15:g15.currentSpread,
    e3Live:es3.at(-1)||null,e15Live:es15.at(-1)||null},
   conversion:{pmLastBaton:rr(batonMove),pmSinceBaton:rr(between),
    pmCombined:rr((batonMove||0)+(between||0)),pm3:r3,pm5:r5,pm15:r15,
    mf3Delta3m:dMF3,mf15Delta10m:dMF15,sinceCross,
    intervalSeconds:rr((ts-last.ts)/1000),priceSource:'OKX_TICK_PLUS_BATON_AUDIT'},
   place:{nearest:loc.nearest,spaceUsd:rr(room),invalidationRef:invBoundary?.key||null,
    nearSupport:!!nearSupport,nearResistance:!!nearResistance,zoneTolerance:rr(zoneTolerance)},
   economics:{estimatedNextBoundarySpaceUsd:rr(room),feeRoundTripMoveUsd:rr(feeMove),
    stopDistanceUsd:rr(invDistance),spaceVsStop:room!==null&&invDistance?rr(room/invDistance):null,
    viable,lateAfterCross:consumed,median3mRange:rr(med3)}
  },
  checks:{reversal,continuation,phaseLocation:viableStage,geometryFresh:freshCross,
    pmAligned:!!aligned,batonLiveResponse:!!liveResponse,mf3Transfer:!!mfTactical,
    mf15NotOpposing:!!mfSlow,room:viable,noChop:!noisy,notConsumed:!consumed},
  data:{auditAgeMs:rr(ts-last.ts),tickAgeMs:rr(tickAgeMs),confirmed15mAt:c15.at(-1)?.ts||null,
   confirmed3mAt:c3.at(-1)?.ts||null,live15mBarStart:bar15,live3mBarStart:bar3},
  brokerOrdersEnabled:false};
}
module.exports={VERSION,evaluate,geometric,events,levelsAt};
