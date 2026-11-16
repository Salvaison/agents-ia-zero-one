'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const m=require('../../modules/attention/boonolab-place-e1e4-shadow');
const T=1794830000000;
function csv(tf){
 const ms=tf==='1h'?3600000:14400000;
 const stamp=t=>new Date(t).toISOString();
 const base=T-6*ms,rows=['timestamp,open,high,low,close,lt_blue_wave,blue_wave,money_flow,buy,sell,dbsi_top,dbsi_bottom,ma200,wt1_cross_up,wt1_cross_dn'];
 for(let i=0;i<6;i++){
  const cells=[stamp(base+i*ms),'100','103','96','102',String(40-i*2),String(30-i),'-5','0','0','','','','',''];
  if(i===1)cells[13]='-50';
  if(i===4)cells[14]='20';
  rows.push(cells.join(','));
 }
 return rows.join('\n');
}
test('Confirmed E1/E4 native signals available ONLY after candle closes',()=>{
 for(const tf of ['1h','4h']){
  const ms=tf==='1h'?3600000:14400000,bars=m.parseMcbCsv(csv(tf),tf);
  assert.equal(m.confirmedE(bars,T-2*ms-1).direction,'long');
  assert.equal(m.confirmedE(bars,T-ms).direction,'short');
  assert.equal(m.confirmedE(bars,T-ms-1).direction,'long');
  assert.ok(bars.every(x=>x.availableAt===x.sourceTs+ms));
 }
});
test('Manual range snapshots cannot apply when updated AFTER entry',()=>{
 const lev=[{token:'VAL',price:100,label:'VAL big',groupId:8},
 {token:'POC',price:120,label:'POC big',groupId:8},
 {token:'VAH',price:140,label:'VAH big',groupId:8}];
 const future=m.ranges(lev,130,T+1,T);
 assert.equal(future.big,null);
 assert.equal(future.status,'LEVELS_NOT_CAUSALLY_AVAILABLE');
 const known=m.ranges(lev,90,T-1,T);
 assert.equal(known.big.outside,'BELOW_VAL');
 assert.equal(known.big.positionPct,-25);
 assert.equal(known.big.signedPocPct,-150);
 assert.equal(known.daily,null);
});
test('Regime shadow never conflates dense productive with a universal veto',()=>{
 const reg={asOf:T-30000,label:'DENSE_CONTRADICTOIRE',intensity:'HIGH',
 productivity:'LOW_RETENTION',
 metrics:{lastHour:{pathEfficiency:.28,retainedFraction:.70}},
 twoHour:{direction:'short'}};
 let o=m.marketReading(reg,T,'short');
 assert.equal(o.review,'PRESERVE_CONTESTED_WHILE_MEASURING_DEFENCE');
 reg.metrics.lastHour.pathEfficiency=.09;
 reg.metrics.lastHour.retainedFraction=.20;
 o=m.marketReading(reg,T,'short');
 assert.equal(o.review,'REVIEW_CONTESTED_WITHOUT_TERRITORY');
 assert.equal(m.marketReading({...reg,asOf:T+1},T,'short').status,'REGIME_ASOF_UNAVAILABLE');
});
test('Place shadow uses entry side and e1/e4, has no trading authority',()=>{
 const e1=m.parseMcbCsv(csv('1h'),'1h');
 const e4=m.parseMcbCsv(csv('4h'),'4h');
 const result=m.inspect({at:T,price:115,direction:'long',phase:'STRUCTURAL_CONTINUATION',
  bars1h:e1,bars4h:e4,levels:[],levelsMtime:T-10,regime:{
   asOf:T-20000,label:'STERILE_HESITANT',metrics:{lastHour:{pathEfficiency:.05,retainedFraction:.1}}},
  position:{direction:'long'}});
 assert.equal(result.alignment,'BOTH_OPPOSE');
 assert.equal(result.proposedAdmission,'EXAMINE_ADMISSION_MARKET_NOT_AUTOMATIC_VETO');
 assert.equal(result.decisionImpact,false);
 assert.equal(result.entryAllowed,null);
 assert.equal(result.exitRequested,null);
 assert.equal(result.brokerOrdersEnabled,false);
});
