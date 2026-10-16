'use strict';
const assert=require('assert');
const dq=require('../../modules/v4/layers/data-quality');
const mcbState=require('../../modules/v4/layers/mcb-state');
const thesis=require('../../modules/v4/layers/mcb-thesis');
const setup=require('../../modules/v4/layers/setup-lifecycle');

function row(ts,lbw,p){return {ts,timestamp:new Date(ts).toISOString(),lt_blue_wave:lbw,open:p,high:p+5,low:p-5,close:p};}
const now=1_900_000_000_000;
function src(tf,stale=false){
  const step=tf==='3m'?180000:900000;
  const history=[row(now-3*step,-30,1000),row(now-2*step,-50,990),row(now-step,-35,995)];
  const live=row(now-(stale?20*step:Math.floor(step/2)),-20,1000);
  return {history,confirmed:history.at(-1),live,
    confirmedUpdateAgeMs:stale?60*60000:30000,
    liveUpdateAgeMs:stale?60*60000:1000,
    confirmedAgeMs:stale?60*60000:step+30000,
    liveAgeMs:stale?60*60000:Math.floor(step/2)};
}
function frame(stale3=false,stale15=false){return {market:{timestamp:now,price:1000},sources:{mcb:{tfs:{'3m':src('3m',stale3),'15m':src('15m',stale15)}},auditRows:[],levels:[]}};}

{
  const f=frame(false,false),q=dq.evaluate(f);
  assert.equal(q.state,'DATA_OK');
  assert.equal(q.threeMinute.ready,true);
  assert.equal(q.fifteenMinute.ready,true);
  const m=mcbState.evaluate(f,null,q);
  assert.notEqual(m.nested3m.available,false);
}
{
  const f=frame(true,false),q=dq.evaluate(f);
  assert.equal(q.state,'DATA_DEGRADED');
  assert.equal(q.threeMinute.ready,false);
  const m=mcbState.evaluate(f,null,q);
  assert.equal(m.nested3m.available,false);
  assert.equal(m.nested3m.reason,'DATA_DEGRADED_3M');
  const bt={candidateDirection:'short',direction:null,mode:'REVERSAL_FORMING'};
  const s=setup.evaluate(f,bt,m,{primaryRelation:'WITH_BACKGROUND'},{state:'OPEN_PATH',admissionBlocked:false},{state:'ACTIVE',admissionBlocked:false},null,null,null,null);
  assert.equal(s.status,'OBSERVE');
  assert.ok(s.reasons.includes('DATA_DEGRADED_3M'));
}
{
  const f=frame(false,true),q=dq.evaluate(f);
  assert.equal(q.fifteenMinute.ready,false);
  const m=mcbState.evaluate(f,null,q);
  const t=thesis.evaluate(m);
  assert.equal(t.state,'UNCLEAR');
  assert.equal(t.candidateDirection,null);
  assert.ok(String(t.reason).includes('DATA_DEGRADED_15M'));
}
{
  const q=dq.evaluate({sources:{mcb:{tfs:{'3m':{history:[]},'15m':{history:[]}}}}});
  assert.equal(q.threeMinute.ready,true);
  assert.equal(q.threeMinute.status,'FRESHNESS_UNMEASURED');
}
console.log('V4.10.5 data quality tests OK');
