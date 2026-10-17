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
console.log('elastic sync shadow tests OK');