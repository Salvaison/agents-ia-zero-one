'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const state=require('../boono-tv/tv-living-state');
const T=Date.parse('2026-11-14T08:00:00Z'),H=3600000,FOUR=4*H;
const header='timestamp,open,high,low,close,lt_blue_wave,blue_wave,money_flow,buy,sell,dbsi_top,dbsi_bottom,ma200,wt1_cross_up,wt1_cross_dn';
function row(at,lbw,bw,direction=null) {
 return [new Date(at).toISOString(),70000,70300,69700,69900,lbw,bw,1,0,1,'','','',
  direction==='UP'?bw:'',direction==='DN'?bw:''].join(',');
}
const csv=(...lines)=>[header,...lines].join('\n')+'\n';
const live=(barAt,lbw,bw,direction,at)=>({
 csv:csv(row(barAt,lbw,bw,direction)),observedAt:at
});
const closed4=csv(row(T-8*H,-70,-67,'DN'),row(T-4*H,-95,-95.3,'UP'));
const closed1=csv(row(T-2*H,-65,-68,'DN'),row(T-H,-79.7,-80.1,'UP'));
test('4h confirmed EUP remains visible at negative LBW level and holds its source time',()=>{
 const h=state.confirmed4h(closed4,T+60000);
 assert.equal(h.event.direction,'UP');
 assert.equal(h.event.lbw,-95);
 assert.equal(h.event.nativeValue,-95.3);
 assert.equal(h.event.availableAt,T);
 assert.equal(h.event.sourceAt,T-FOUR);
 assert.equal(h.live,null);
});
test('An opposite fresh 4h intrabar native DN can coexist with the last confirmed EUP',()=>{
 const current=live(T,-78.4,-76.1,'DN',T+30000);
 const h=state.confirmed4h(closed4,T+60000,current);
 assert.equal(h.event.direction,'UP');
 assert.equal(h.live.direction,'DN');
 assert.equal(h.live.lbw,-78.4);
 assert.equal(h.live.nativeValue,-76.1);
 assert.equal(h.live.provisional,true);
 assert.equal(h.live.oppositeToConfirmed,true);
 assert.equal(h.live.confirmed,false);
});
test('Same-side Live extinguishes even if it persists in current 1h/4h CSV',()=>{
 const same4=live(T,-93,-94,'UP',T+30000);
 const same1=live(T,-74,-73,'UP',T+30000);
 assert.equal(state.confirmed4h(closed4,T+60000,same4).live,null);
 const one=state.confirmed1h(closed1,T+60000,same1);
 assert.equal(one.live,null);
 assert.equal(one.e1Live,null);
 assert.equal(one.event.direction,'UP');
 assert.equal(one.event.lbw,-79.7);
});
test('Once opposite provisional DN is confirmed by a bar close, its Live extinguishes',()=>{
 const before=state.confirmed4h(closed4,T+60000,live(T,-80,-78,'DN',T+30000));
 assert.equal(before.live.direction,'DN');
 const confirmedDn=closed4+row(T,-75.5,-72.4,'DN')+'\n';
 const now=T+FOUR+60000;
 const ongoingSameDn=live(T+FOUR,-74.6,-72.7,'DN',now-30000);
 const after=state.confirmed4h(confirmedDn,now,ongoingSameDn);
 assert.equal(after.event.direction,'DN');
 assert.equal(after.event.lbw,-75.5);
 assert.equal(after.event.availableAt,T+FOUR);
 assert.equal(after.live,null);
 const opposite=live(T+FOUR,-65.3,-62.1,'UP',now-30000);
 assert.equal(state.confirmed4h(confirmedDn,now,opposite).live.direction,'UP');
});
test('1h has same provisional-opposite and confirmation-extinction contract',()=>{
 const asOf=T+60000;
 const before=state.confirmed1h(closed1,asOf,live(T,-66.5,-64.2,'DN',T+30000));
 assert.equal(before.live.direction,'DN');
 const afterClose=closed1+row(T,-63.3,-60.2,'DN')+'\n';
 const after=state.confirmed1h(afterClose,T+H+60000,
  live(T+H,-62.7,-60.1,'DN',T+H+30000));
 assert.equal(after.event.direction,'DN');
 assert.equal(after.live,null);
 assert.equal(after.e1Live,null);
 assert.equal(state.confirmed1h(afterClose,T+H+60000,
  live(T+H,-57,-56,'UP',T+H+30000)).live.direction,'UP');
});
test('Never display future, stale, wrong-bar, double-marked or already-closed Live as evidence',()=>{
 const future=live(T,-80,-75,'DN',T+10000);
 assert.equal(state.confirmed4h(closed4,T+1000,future).live,null);
 const old=live(T,-80,-75,'DN',T+30000);
 assert.equal(state.confirmed4h(closed4,T+200000,old).live,null);
 const wrong=live(T-FOUR,-80,-75,'DN',T+30000);
 assert.equal(state.confirmed4h(closed4,T+60000,wrong).live,null);
 const double=csv(row(T,-80,-75,'UP').slice(0,-1)+'-75');
 assert.equal(state.confirmed4h(closed4,T+60000,{csv:double,observedAt:T+30000}).live,null);
 const sameBarClosed=state.confirmed4h(closed4+row(T,-76,-73,'DN')+'\n',
  T+FOUR+1000,live(T,-76,-73,'DN',T+FOUR));
 assert.equal(sameBarClosed.live,null);
});
test('TV payload carries native 4h/1h live and confirmed event evidence but no broker authority',()=>{
 const paper={brokerOrdersEnabled:false,position:null,
  latestAnalysis:{version:'v5.4.3-unit',quality:'DATA_OK',asOf:T+60000,price:70000,
  readings:{structural54:{phase:'AWAIT_TACTICAL_ALIGNMENT'}}}};
 const data=state.build({paper,now:T+60000,csv1:closed1,csv4:closed4,
  liveCsv1:live(T,-69,-67,'DN',T+30000),
  liveCsv4:live(T,-77,-74,'DN',T+30000)});
 assert.equal(data.status,'DATA_RECENT');
 assert.equal(data.place.h4.event.direction,'UP');
 assert.equal(data.place.h4.live.direction,'DN');
 assert.equal(data.place.h1.event.direction,'UP');
 assert.equal(data.place.h1.live.direction,'DN');
 assert.equal(data.decisionImpact,false);
 assert.equal(data.brokerOrdersEnabled,false);
});
const FRONT=fs.readFileSync(path.join(__dirname,'../boono-tv/scene/tv-living-state.js'),'utf8');
const CSS=fs.readFileSync(path.join(__dirname,'../boono-tv/scene/tv-living-state.css'),'utf8');
function render(place){
 const w={};
 vm.runInNewContext(FRONT,{window:w,document:{querySelector:()=>null},
  Date,Intl,Math,Number,String});
 return w.BoonoTVLivingState.renderHtml({status:'DATA_RECENT',place,
  trajectory:{},tactical:{},causal:{},structure:{},offensive:{},position:null});
}
function viewH(tf,dir,liveDir=null){
 const period=tf==='4h'?FOUR:H;
 return {status:'CONFIRMED',bw:{previous:-83.5,confirmed:-82.1},
  lbw:{previous:-82.7,confirmed:-81.4},sourceAt:T-period,availableAt:T,
  event:{direction:dir,lbw:-95,nativeValue:-95.3,sourceAt:T-period,availableAt:T},
  live:liveDir?{direction:liveDir,lbw:-75,nativeValue:-73,
    sourceAt:T,observedAt:T+30000,provisional:true}:null};
}
test('TV 4h/1h shows inline E Live then E confirmed, each direction color independent of value sign',()=>{
 const html=render({h4:viewH('4h','UP'),h1:viewH('1h','DN'),recordedRanges:{}});
 const m=html.match(/<section class="tv-state-block tv-place">([\s\S]*?)<\/section>/);
 assert.ok(m);
 const p=m[1],a=p.indexOf('<b>4h</b>'),b=p.indexOf('<b>1h</b>'),c=p.indexOf('DailyRange');
 assert.ok(a>=0&&b>a&&c>b);
 assert.match(p,/<span class="tv-indicator">E4Live<\/span> — · <b class="tv-native-label tv-up">E4<\/b> <b class="tv-native-signal tv-up"[^>]*>-95,0<\/b>/);
 assert.match(p,/<span class="tv-indicator">E1Live<\/span> — · <b class="tv-native-label tv-down">E1<\/b> <b class="tv-native-signal tv-down"[^>]*>-95,0<\/b>/);
 assert.doesNotMatch(p,/E4 confirmé<\/span>/);
});
test('TV opposite Live paints red while existing E confirmed stays green; same-direction Live suppressed',()=>{
 let h=viewH('4h','UP','DN');
 let html=render({h4:h,h1:viewH('1h','UP')});
 assert.match(html,/<b class="tv-native-label tv-down">E4Live<\/b> <b class="tv-native-signal tv-down"[^>]*>-75,0<\/b>/);
 assert.match(html,/<b class="tv-native-label tv-up">E4<\/b> <b class="tv-native-signal tv-up"[^>]*>-95,0<\/b>/);
 h=viewH('4h','UP','UP');
 html=render({h4:h,h1:viewH('1h','UP')});
 assert.match(html,/<span class="tv-indicator">E4Live<\/span> —/);
 assert.match(CSS,/#statePanel \.tv-five \.tv-place \.tv-native-signal\.tv-up,/);
 assert.match(CSS,/#statePanel \.tv-five \.tv-place \.tv-native-label\.tv-down\{/);
});
