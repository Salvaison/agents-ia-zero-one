'use strict';
const assert=require('assert');
const thesisLayer=require('../../modules/v4/layers/mcb-thesis');
const maturity=require('../../modules/v4/layers/opportunity-maturity');
const action=require('../../modules/v4/layers/action');
const priceTranslation=require('../../modules/v4/layers/price-translation');
const sim=require('../../modules/trade-simulator-v4');

function lobe(type,opts={}){
  const sign=type==='CRETE'?1:-1;
  return {
    type,sign,confirmedSide:true,
    directionIntoLobe:sign>0?'long':'short',
    reversalCandidateDirection:sign>0?'short':'long',
    currentLbw:opts.currentLbw??(sign>0?30:-30),
    extremeLbw:opts.extremeLbw??(sign>0?40:-40),
    recoveryFraction:opts.recoveryFraction??0.25,
    maturity:opts.maturity||'MATURE',
    e15Class:'E15_PAIR_SUB80_QUALITATIVE',
    relationshipFromPrevious:{
      lbwSpan:opts.span??60,oppositeSides:true,
      pairQuality:{class:opts.pairClass||'PAIR_SUB80_QUALITATIVE',referenceSpanLbw:80,decisionImpact:false},
      economicScale:{priceMagnitudeUsd:opts.priceMagnitudeUsd??180,minimumUsefulUsd:220,preferredUsefulUsd:250,gainRetentionReferenceUsd:180,decisionImpact:false}
    }
  };
}

// Reversal starts neutral even though a candidate direction is known.
{
  const m={currentLobe:lobe('CREUX'),nested3m:{available:true,lobeSign:1,turningDirection:null}};
  const b=thesisLayer.evaluate(m);
  assert.equal(b.state,'TRANSITION_NEUTRAL');
  assert.equal(b.direction,null);
  assert.equal(b.candidateDirection,'long');
  const n=maturity.evaluate(b,m,{horizons:{net3mUsd:-12}});
  assert.equal(n.state,'TRANSITION_NEUTRAL');
  assert.equal(n.maturityGate.net3mAligned,false);
  const a=action.evaluate({market:{price:1000}},null,m,n,{status:'TRANSLATING',aligned:true,thesisDirection:'long'},{status:'CONFIRMED',confirmed:true,thesisDirection:'long'},{hardStopBreached:false});
  assert.equal(a.type,'NO_TRADE');
}

// No timer: if 3m and net3m are already coherent, candidate may mature immediately.
{
  const m={currentLobe:lobe('CREUX'),nested3m:{available:true,lobeSign:-1,turningDirection:'long'}};
  const b=thesisLayer.evaluate(m);
  const n=maturity.evaluate(b,m,{horizons:{net3mUsd:35}});
  assert.equal(n.state,'LONG_FORMING');
  assert.equal(n.direction,'long');
  assert.equal(n.maturityGate.passed,true);
}

// Opposing 3m turn keeps the candidate neutral even with aligned net3m.
{
  const m={currentLobe:lobe('CRETE',{maturity:'EXTENDING',recoveryFraction:.05}),nested3m:{available:true,lobeSign:1,turningDirection:'short'}};
  const b=thesisLayer.evaluate(m);
  assert.equal(b.state,'TRANSITION_NEUTRAL');
  assert.equal(b.candidateDirection,'long');
  const n=maturity.evaluate(b,m,{horizons:{net3mUsd:50}});
  assert.equal(n.state,'TRANSITION_NEUTRAL');
  assert.equal(n.maturityGate.nested3m.state,'TURN_OPPOSING');
}

// Qualitatively major continuation remains established and does not need the neutral gate.
{
  const c=lobe('CRETE',{maturity:'EXTENDING',recoveryFraction:.04,pairClass:'PAIR_MAJOR_QUALITATIVE',span:95});
  const m={currentLobe:c,nested3m:{available:true,lobeSign:-1,turningDirection:null}};
  const b=thesisLayer.evaluate(m);
  assert.equal(b.state,'LONG');
  const n=maturity.evaluate(b,m,{horizons:{net3mUsd:-10}});
  assert.equal(n.state,'LONG');
  assert.equal(n.maturityGate.required,false);
}

// Sizing reproduces the old BOONO live formula: 15% of 1000 margin at 10x = 1500 notional.
{
  const z=sim.sizingSnapshot(86529.3);
  assert.equal(z.capitalUsd,1000);
  assert.equal(z.marginUsd,150);
  assert.equal(z.notionalUsd,1500);
  assert.equal(z.leverage,10);
  assert.ok(z.riskAt500PriceMoveUsd<10);
  const pos={direction:'short',entryPrice:86529.3,notionalUsd:1500};
  const usd=sim.pnlUsdFor(pos,84436.9);
  assert.ok(Math.abs(usd-36.27)<0.03);
}


// A strong last impulse without aligned net3m is a BURST, not TRANSLATING.
{
  const now=1_801_000_000_000,rows=[];let price=1000;
  for(let i=0;i<45;i++){const move=i%2?1:-1;price+=move;rows.push({ts:now+i*30000,lastPrice:price,priceMove:move});}
  // 3m window loses ground overall, despite a final positive burst.
  for(const move of [-12,-10,-8,-5,20]){price+=move;rows.push({ts:now+rows.length*30000,lastPrice:price,priceMove:move});}
  const frame={market:{timestamp:rows[rows.length-1].ts,price},sources:{auditRows:rows}};
  const pm=priceTranslation.evaluate(frame,{state:'LONG_FORMING',direction:'long'});
  assert.equal(pm.direction,'long');
  assert.ok(pm.horizons.net3mUsd<0);
  assert.equal(pm.status,'BURST_ALIGNED');
}

console.log('V4.2 neutral maturity / sizing tests OK');
