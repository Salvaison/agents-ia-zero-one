'use strict';
function finite(v){return Number.isFinite(Number(v));}
function evaluate(result){
  const piv=(result.wave&&result.wave.pivots)||[];
  if(piv.length<3)return {status:'INSUFFICIENT',decisionImpact:false};
  const [a,b,c]=piv.slice(-3);
  let direction=null;
  if(a.type==='CREUX'&&b.type==='CRETE'&&c.type==='CREUX')direction='long';
  if(a.type==='CRETE'&&b.type==='CREUX'&&c.type==='CRETE')direction='short';
  if(!direction)return {status:'INVALID_SEQUENCE',decisionImpact:false,anchors:{a,b,c}};
  const impulse=Math.abs(Number(b.price)-Number(a.price));
  if(!finite(impulse)||impulse<=0)return {status:'INVALID_IMPULSE',decisionImpact:false,anchors:{a,b,c}};
  const retr=direction==='long'?(Number(b.price)-Number(c.price))/impulse:(Number(c.price)-Number(b.price))/impulse;
  const sign=direction==='long'?1:-1,price=Number(result.price),targets={};
  for(const ratio of [1,1.272,1.618]){
    const target=Number(c.price)+sign*impulse*ratio;
    const distance=direction==='long'?target-price:price-target;
    targets[String(ratio)]={price:target,distanceUsd:distance,ahead:distance>0};
  }
  return {status:retr>=0&&retr<=1.2?'VALID_GEOMETRY':'DEEP_OR_BROKEN_RETRACE',decisionImpact:false,
    direction,anchors:{a,b,c},impulseUsd:impulse,retracementRatio:retr,targets,
    note:'Fib ancre sur pivots de vague E15 V3; descriptif uniquement'};
}
module.exports={evaluate};
