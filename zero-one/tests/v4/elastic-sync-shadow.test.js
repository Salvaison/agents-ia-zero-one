'use strict';
const assert=require('assert');
const sh=require('../../modules/v4/experiments/elastic-sync-shadow');
const base=2_000_000_000_000;
function frame(ts,price,auditRows){return {market:{timestamp:ts,price},sources:{auditRows:auditRows||[]}};}
function mcb(dir){return {dataQuality:{degraded:false},currentLobe:{startTs:base-900000,lobeDirection:dir,structuralDirection:dir,currentLbw:dir==='long'?20:-20},nested3m:{lobeDirection:dir,structuralDirection:dir}};}
function tr(n3,n5,e3=.8,e5=.8){return {horizons:{net3mUsd:n3,net5mUsd:n5,efficiency3m:e3,efficiency5m:e5}};}
function pb(dir,state='PRODUCTIVE_TRAVEL'){return {interesting:true,direction:dir,travel:{state}};}
const setup={candidateDirection:'long',setupKey:'L1'};
const thesis={candidateDirection:'long'};
let prev=null;
{
  const native={live3:{fresh:true,up:{type:'UP',value:-50,ts:base}},last3mUp:null,live15:{fresh:false},lastUp:null};
  prev=sh.evaluate(frame(base,1000,[{ts:base-180000,live15LbwRaw:-40,mf15Pente:-2},{ts:base,live15LbwRaw:-35,mf15Pente:-1}]),setup,thesis,thesis,mcb('long'),native,tr(30,0),pb('long'),prev);
  assert.equal(prev.decisionImpact,false);
  assert.equal(prev.state,'TRACKING_ELASTIC_HANDOFF');
  assert(prev.activeEpisode.events.E3_LIVE.firstTs);
  assert(prev.activeEpisode.events.PM3_EFFECTIVE.firstTs);
}
{
  const native={live3:{fresh:false},last3mUp:{type:'UP',value:-45,ts:base+60000},live15:{fresh:true,up:{type:'UP',value:-30,ts:base+60000}},lastUp:null};
  prev=sh.evaluate(frame(base+60000,1050,[{ts:base-120000,live15LbwRaw:-35,mf15Pente:-1},{ts:base+60000,live15LbwRaw:-10,mf15Pente:2}]),setup,thesis,thesis,mcb('long'),native,tr(40,45),pb('long'),prev);
  const order=prev.activeEpisode.orderSignature;
  assert(order.indexOf('E3_LIVE')<order.indexOf('E3_CONFIRMED'));
  assert(order.includes('E15_LIVE'));
  assert(order.includes('MF15_SLOPE_ALIGNED'));
}
{
  const native={live3:{fresh:true,dn:{type:'DN',value:35,ts:base+120000}},last3mUp:{type:'UP',value:-45,ts:base+60000},last3mDn:null,live15:{fresh:false},lastUp:null};
  prev=sh.evaluate(frame(base+120000,1030,[{ts:base-60000,live15LbwRaw:-10,mf15Pente:2},{ts:base+120000,live15LbwRaw:5,mf15Pente:1}]),setup,thesis,thesis,mcb('long'),native,tr(-20,30,.6,.6),pb('long'),prev);
  assert(prev.activeEpisode.relaxationCount>=1);
  assert(prev.activeEpisode.events.E3_OPPOSITE_LIVE);
}

// Evidence conversion: a thesis proof is evaluated after 1/3/5m.
{
  const t=base+10*60000;
  let s=null;
  const nat={live3:{fresh:true,up:{type:'UP',value:-40,ts:t}},last3mUp:null,live15:{fresh:false},lastUp:null};
  s=sh.evaluate(frame(t,1000,[{ts:t-60000,live15LbwRaw:-20,mf15Pente:1},{ts:t,live15LbwRaw:-15,mf15Pente:2}]),setup,thesis,thesis,mcb('long'),nat,tr(30,40),pb('long'),s);
  s=sh.evaluate(frame(t+60000,1040,[{ts:t,live15LbwRaw:-15,mf15Pente:2},{ts:t+60000,live15LbwRaw:-10,mf15Pente:2}]),setup,thesis,thesis,mcb('long'),{live3:{fresh:false},last3mUp:null,live15:{fresh:false}},tr(35,45),pb('long'),s);
  const c=s.activeEpisode.eventConversion.E3_LIVE;
  assert(c);
  assert(c.horizons['1']);
  assert.equal(c.horizons['1'].proofSignedUsd,40);
  assert.equal(c.horizons['1'].episodeSignedUsd,40);
}

// Counterfact conversion: an opposite proof is scored in its OWN direction.
{
  const t=base+20*60000;
  let s=null;
  s=sh.evaluate(frame(t,1000,[{ts:t-60000,live15LbwRaw:20,mf15Pente:1},{ts:t,live15LbwRaw:18,mf15Pente:1}]),setup,thesis,thesis,mcb('long'),{live3:{fresh:true,dn:{type:'DN',value:35,ts:t}},last3mUp:null,last3mDn:null,live15:{fresh:false}},tr(-30,-35),pb('short'),s);
  // candidateDirection still comes from setup/thesis = long; DN is a counterfact.
  s=sh.evaluate(frame(t+60000,970,[{ts:t,live15LbwRaw:18,mf15Pente:1},{ts:t+60000,live15LbwRaw:15,mf15Pente:-1}]),setup,thesis,thesis,mcb('long'),{live3:{fresh:false},last3mUp:null,last3mDn:null,live15:{fresh:false}},tr(-35,-40),pb('short'),s);
  const c=s.activeEpisode.eventConversion.E3_OPPOSITE_LIVE;
  assert(c);
  assert.equal(c.proofDirection,'short');
  assert.equal(c.horizons['1'].proofSignedUsd,30);
  assert.equal(c.horizons['1'].episodeSignedUsd,-30);
}


console.log('elastic sync shadow tests OK');