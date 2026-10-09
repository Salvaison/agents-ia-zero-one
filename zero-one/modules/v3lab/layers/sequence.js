'use strict';

const TTL = {
  whereMs: 12 * 60 * 1000,
  turningMs: 18 * 60 * 1000,
  dominanceMs: 6 * 60 * 1000,
};

function nowTs(frame){ return Number(frame.market && frame.market.timestamp) || Date.now(); }
function age(now, ev){ return ev ? Math.max(0, now - Number(ev.ts || 0)) : null; }
function fresh(now, ev, ttl){ return !!ev && age(now, ev) <= ttl; }
function turningDirection(turn){
  if(turn === 'CREUX_EN_FORMATION') return 'long';
  if(turn === 'CRETE_EN_FORMATION') return 'short';
  return null;
}
function copyEvent(x){ return x ? JSON.parse(JSON.stringify(x)) : null; }

function normalizeWhereMemory(ev){
  if(!ev)return ev;
  if(typeof ev.neutralLocation === 'boolean')return ev;
  const lgiLines=Array.isArray(ev.lgiLines)?ev.lgiLines:[];
  const dirs=[];
  const sr=ev.sr||null;
  const fam=String(sr&&sr.family||'').toLowerCase();
  if(fam==='support')dirs.push('long');
  if(fam==='resistance')dirs.push('short');
  return {...ev,
    neutralLocation:lgiLines.length>0,
    compatibleDirections:[...new Set(dirs)],
    directionalEvidence:[...(lgiLines.length?[{kind:'LGI_LOCATION_MIGRATED',count:lgiLines.length}]:[]),
      ...(sr?[{kind:fam==='support'?'LEVEL_SUPPORT':fam==='resistance'?'LEVEL_RESISTANCE':'LEVEL_LOCATION',label:sr.label||null,price:Number(sr.price),distanceUsd:Number(sr.distanceUsd)}]:[])]
  };
}

function whereSemantics(where){
  const dirs = new Set(), evidence = [];
  let neutralLocation = false;

  // LGI are intentionally direction-neutral: they answer WHERE, never LONG/SHORT.
  const lines = where && where.lgi && Array.isArray(where.lgi.lines) ? where.lgi.lines : [];
  if(lines.length){
    neutralLocation = true;
    for(const line of lines){
      evidence.push({kind:'LGI_LOCATION',price:Number(line.projected),distanceUsd:Number(line.distanceUsd),side:line.side||null});
    }
  }

  // Fixed levels may carry an explicit support/resistance family.
  const sr = where && where.sr && where.sr.interaction;
  const family = String(sr && sr.family || '').toLowerCase();
  if(sr){
    if(family === 'support'){ dirs.add('long'); evidence.push({kind:'LEVEL_SUPPORT',label:sr.label||null,price:Number(sr.price),distanceUsd:Number(sr.distanceUsd)}); }
    else if(family === 'resistance'){ dirs.add('short'); evidence.push({kind:'LEVEL_RESISTANCE',label:sr.label||null,price:Number(sr.price),distanceUsd:Number(sr.distanceUsd)}); }
    else { neutralLocation = true; evidence.push({kind:'LEVEL_LOCATION',label:sr.label||null,family:family||null,price:Number(sr.price),distanceUsd:Number(sr.distanceUsd)}); }
  }

  // MA200 is a dynamic level and is allowed to carry support/resistance nature.
  const ma = where && where.ma200;
  if(ma && ma.interaction){
    const nature = String(ma.nature || '').toUpperCase();
    if(nature === 'SUPPORT'){ dirs.add('long'); evidence.push({kind:'MA200_SUPPORT',price:Number(ma.price),distanceUsd:Number(ma.distanceUsd),timeframe:ma.timeframe||'15m'}); }
    if(nature === 'RESISTANCE'){ dirs.add('short'); evidence.push({kind:'MA200_RESISTANCE',price:Number(ma.price),distanceUsd:Number(ma.distanceUsd),timeframe:ma.timeframe||'15m'}); }
  }

  return { compatibleDirections:[...dirs], neutralLocation, evidence };
}


function semanticCompatible(sem, direction){
  if(!sem||!direction)return false;
  const dirs=Array.isArray(sem.compatibleDirections)?sem.compatibleDirections:[];
  // Explicit directional evidence (level/MA200) is authoritative. A neutral LGI
  // can provide location, but cannot override an explicit support/resistance.
  if(dirs.length)return dirs.includes(direction);
  return !!sem.neutralLocation;
}
function memoryCompatibility(memWhere,direction,price){
  if(!memWhere||!direction)return {compatible:false,reason:'NO_MEMORY'};
  const dirs=Array.isArray(memWhere.compatibleDirections)?memWhere.compatibleDirections:[];
  let compatible=dirs.length?dirs.includes(direction):!!memWhere.neutralLocation;
  if(!compatible)return {compatible:false,reason:'DIRECTION_MISMATCH'};

  // Directional WHERE memories expire immediately after a decisive breach.
  // We keep the original interaction tolerance: 100 USD for fixed levels and
  // the configured tolerance carried by MA200 observations. A mere touch/wick
  // inside that band does not cancel the memory.
  const sr=memWhere.sr||null;
  const fam=String(sr&&sr.family||'').toLowerCase();
  const sp=Number(sr&&sr.price);
  if(Number.isFinite(sp)){
    if(direction==='short'&&fam==='resistance'&&price>sp+100)
      return {compatible:false,reason:'RECENT_RESISTANCE_ACCEPTED_ABOVE',boundary:sp,toleranceUsd:100};
    if(direction==='long'&&fam==='support'&&price<sp-100)
      return {compatible:false,reason:'RECENT_SUPPORT_ACCEPTED_BELOW',boundary:sp,toleranceUsd:100};
  }
  const ma=memWhere.ma200||null;
  const mp=Number(ma&&ma.price), tol=Number(ma&&ma.toleranceUsd);
  const mtol=Number.isFinite(tol)?tol:0;
  const nature=String(ma&&ma.nature||'').toUpperCase();
  if(Number.isFinite(mp)){
    if(direction==='short'&&nature==='RESISTANCE'&&price>mp+mtol)
      return {compatible:false,reason:'RECENT_MA200_RESISTANCE_ACCEPTED_ABOVE',boundary:mp,toleranceUsd:mtol};
    if(direction==='long'&&nature==='SUPPORT'&&price<mp-mtol)
      return {compatible:false,reason:'RECENT_MA200_SUPPORT_ACCEPTED_BELOW',boundary:mp,toleranceUsd:mtol};
  }
  return {compatible:true,reason:null};
}

function evaluate(frame, ctx){
  const now = nowTs(frame);
  const prev = ctx.previous && ctx.previous.lastEvaluation && ctx.previous.lastEvaluation.sequence;
  const mem = {
    where: prev && prev.memory ? normalizeWhereMemory(copyEvent(prev.memory.where)) : null,
    turning: prev && prev.memory ? copyEvent(prev.memory.turning) : null,
    dominanceLong: prev && prev.memory ? copyEvent(prev.memory.dominanceLong) : null,
    dominanceShort: prev && prev.memory ? copyEvent(prev.memory.dominanceShort) : null,
  };

  const where = ctx.where || {};
  const wave = ctx.wave || {};
  const dom = ctx.dominance || {};

  if(where.relevant){
    const semantics = whereSemantics(where);
    mem.where = {
      ts: now,
      status: where.status,
      confidence: where.confidence,
      density: Number(where.density || 0),
      priceAtObservation: Number(frame.market.price),
      lgiCount: Number(where.lgi && where.lgi.activeCount || 0),
      lgiLines: where.lgi && Array.isArray(where.lgi.lines) ? copyEvent(where.lgi.lines) : [],
      sr: where.sr && where.sr.interaction ? copyEvent(where.sr.interaction) : null,
      ma200: where.ma200 && where.ma200.interaction ? copyEvent(where.ma200) : null,
      compatibleDirections: semantics.compatibleDirections,
      neutralLocation: !!semantics.neutralLocation,
      directionalEvidence: semantics.evidence,
    };
  }

  if(wave.turningPoint){
    mem.turning = {
      ts: now,
      type: wave.turningPoint,
      direction: turningDirection(wave.turningPoint),
      phase: wave.phase,
      price: Number(frame.market.price),
      lbw: wave.current && wave.current.lbw,
    };
  }

  if(dom.state === 'DOMINATION_PERSISTANTE' && (dom.direction === 'long' || dom.direction === 'short') && Number(dom.proofScore) >= .60){
    const ev = {
      ts: now,
      direction: dom.direction,
      proofScore: Number(dom.proofScore),
      retainedFraction: Number(dom.retainedFraction || 0),
    };
    if(dom.direction === 'long') mem.dominanceLong = ev;
    else mem.dominanceShort = ev;
  }

  if(!fresh(now, mem.where, TTL.whereMs)) mem.where = null;
  if(!fresh(now, mem.turning, TTL.turningMs)) mem.turning = null;
  if(!fresh(now, mem.dominanceLong, TTL.dominanceMs)) mem.dominanceLong = null;
  if(!fresh(now, mem.dominanceShort, TTL.dominanceMs)) mem.dominanceShort = null;

  const currentSemantics = whereSemantics(where);
  const recentWhere = !!mem.where;
  const price = Number(frame.market.price);
  const locFor = direction => {
    if(direction!=='long'&&direction!=='short')return {
      direction:null,currentWhereRelevant:!!where.relevant,currentWhereCompatible:false,currentWhereNeutral:!!currentSemantics.neutralLocation,
      recentWhereExists:recentWhere,recentWhereCompatible:false,recentWhereInvalidation:null,recentWhereNeutral:!!(mem.where&&mem.where.neutralLocation),
      locationReady:false,locationSource:null,turningSupport:false
    };
    const currentWhereCompatible=!!where.relevant&&semanticCompatible(currentSemantics,direction);
    const memCompat=memoryCompatibility(mem.where,direction,price);
    const recentWhereCompatible=!!mem.where&&memCompat.compatible;
    return {
      direction,currentWhereRelevant:!!where.relevant,currentWhereCompatible,currentWhereNeutral:!!currentSemantics.neutralLocation,
      recentWhereExists:recentWhere,recentWhereCompatible,recentWhereInvalidation:recentWhereCompatible?null:memCompat,
      recentWhereNeutral:!!(mem.where&&mem.where.neutralLocation),
      locationReady:currentWhereCompatible||recentWhereCompatible,
      locationSource:currentWhereCompatible?'CURRENT_WHERE':(recentWhereCompatible?'RECENT_WHERE':null),
      turningSupport:!!(mem.turning&&mem.turning.direction===direction)
    };
  };
  const waveLoc=locFor(wave.direction);
  const structuralDirection=wave.structural&&wave.structural.status==='ACTIVE'?wave.structural.direction:null;
  const structuralLoc=locFor(structuralDirection);
  const currentAlignedPersistent = dom.state === 'DOMINATION_PERSISTANTE' &&
    dom.direction === wave.direction && Number(dom.proofScore) >= .60;
  const structuralAlignedPersistent = dom.state === 'DOMINATION_PERSISTANTE' &&
    dom.direction === structuralDirection && Number(dom.proofScore) >= .60;

  return {
    model: 'SEQUENCE_MEMORY_V3',
    ttl: TTL,
    memory: mem,
    current: {
      whereRelevant: !!where.relevant,
      turningPoint: wave.turningPoint || null,
      dominanceState: dom.state || null,
      dominanceDirection: dom.direction || null,
      dominanceProof: Number(dom.proofScore || 0),
    },
    agesMs: {
      where: age(now, mem.where),
      turning: age(now, mem.turning),
      dominanceLong: age(now, mem.dominanceLong),
      dominanceShort: age(now, mem.dominanceShort),
    },
    locationByDirection:{long:locFor('long'),short:locFor('short')},
    continuation: {
      ...waveLoc,
      currentAlignedPersistent,
      ready: !!wave.direction && currentAlignedPersistent && waveLoc.locationReady,
    },
    structuralContinuation: {
      ...structuralLoc,
      currentAlignedPersistent:structuralAlignedPersistent,
      ready: !!structuralDirection && structuralAlignedPersistent && structuralLoc.locationReady,
    },
    note: 'LGI = lieu neutre; niveaux/MA200 peuvent etre directionnels; la localisation est maintenant evaluable independamment de la phase LBW',
  };
}

module.exports = { evaluate, TTL };
