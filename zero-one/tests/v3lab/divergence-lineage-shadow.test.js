'use strict';
const assert=require('assert');
const m=require('../../modules/v3lab/experiments/divergence-lineage-shadow');
function p(ts,type,lbw,price){return {ts,timestamp:new Date(ts).toISOString(),type,lbw,price,close:price,amplitude:3};}
const H=3600000, t=Date.UTC(2026,8,19,12,0,0);
const pivots=[
 p(t,'CREUX',-30,81000),
 p(t+H,'CRETE',80,81800),
 p(t+2*H,'CREUX',-25,81400),
 p(t+3*H,'CRETE',60,82000), // old bearish divergence belongs to prior move
 p(t+4*H,'CREUX',-35,81600),
 p(t+5*H,'CRETE',75,82200), // candidate start of dominant short campaign
 p(t+9*H,'CREUX',-90,80200),
 p(t+11*H,'CRETE',10,80500),
];
const series=[];
for(let i=0;i<=48;i++){
 const ts=t+i*15*60000;
 let lbw=20;
 if(ts>=t+5*H&&ts<t+7*H)lbw=40-(ts-(t+5*H))/H*45;
 else if(ts>=t+7*H)lbw=-50;
 series.push({ts,timestamp:new Date(ts).toISOString(),lt_blue_wave:lbw,open:100,high:80500,low:80300,close:80400});
}
const move=m.movementCandidate(pivots,series,80300);
assert.equal(move.direction,'short');
assert.equal(move.startPivot.price,82200);
const cands=m.divergenceCandidates(pivots,series);
assert.ok(cands.some(x=>x.direction==='bearish'&&x.older.price===81800&&x.newer.price===82000));
const content=m.lobeContent(series,pivots[5],pivots[6]);
assert.ok(content.lbwMassAbsTime>0);
assert.ok(content.durationMinutes>0);
console.log('divergence-lineage-shadow.test.js OK');
