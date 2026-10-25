'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path'),chain=require('../../modules/v5/v53-causal-chain-view');
const server=fs.readFileSync(path.resolve(__dirname,'../../modules/config-server.js'),'utf8');
const elastic=fs.readFileSync(path.resolve(__dirname,'../../modules/elastic-observer-ui.js'),'utf8');
const BASE=1792926000000;
const ev=(family,key,type,direction,observedAt,sourceTs,price,value)=>({
 family,key,type,direction,observedAt,sourceTs,price,
 current:value===null?null:{value,sourceTs,type:direction==='long'?'UP':'DN'}});
test('MCB3/15 lifecycle has distinct observed times and PM Live at each event',()=>{
 const events=[
  ev('MCB15','E15','OBSERVED','long',BASE+32000,BASE,80600,-62),
  ev('MCB15','BW_LBW_CROSS','OBSERVED','long',BASE+62000,BASE+61000,80620,null),
  ev('MCB15','E15','CONFIRMED','long',BASE+901000,BASE,80700,-55),
  ev('MCB3','BW_LBW_CROSS','OBSERVED','long',BASE+37000,BASE+35000,80590,null),
  ev('MCB3','E3','OBSERVED','long',BASE+44000,BASE,80610,-75),
  ev('MCB3','E3','CONFIRMED','long',BASE+185000,BASE,80680,-69),
  ev('MCB3','E3','OBSERVED','short',BASE+240000,BASE+180000,80695,40),
  ev('MCB3','E3','INTERRUPTED','short',BASE+244000,BASE+180000,80698,null),
  ev('MCB15','BW_LBW_CROSS','OBSERVED','short',BASE+1920000,BASE+1920000,80100,null)];
 const audit=[
  {ts:BASE,lastPrice:80500,priceMove:12},
  {ts:BASE+30000,lastPrice:80570,priceMove:8},
  {ts:BASE+60000,lastPrice:80605,priceMove:15},
  {ts:BASE+180000,lastPrice:80650,priceMove:20},
  {ts:BASE+900000,lastPrice:80690,priceMove:5}];
 const r=chain.build({events,audit,now:BASE+1200000,price:80720,
  mcb15:{lbw:62,bw:58,currentOffensive:'long'},
  mcb3:{lbw:-74,bw:-80,tacticalDirection:'long'}});
 assert.equal(r.tf15.cross.observedAt,BASE+62000);
 assert.equal(r.tf15.live.observedAt,BASE+32000);
 assert.equal(r.tf15.confirmed.observedAt,BASE+901000);
 assert.equal(r.tf15.live.sourceTs,BASE);
 assert.equal(r.tf15.chronology.crossToLiveSec,-30);
 assert.equal(r.tf15.live.pmBaton,8);
 assert.equal(r.tf15.live.pmSinceBaton,30);
 assert.equal(r.tf15.live.pmLive,38);
 assert.equal(r.tf3.interrupted,true);
 assert.equal(r.tf3.signalAligned,false);
 assert.equal(r.tf3.cross.direction,'long');
 assert.equal(r.tf3.live.direction,'short');
 assert.equal(r.alignment,'ALIGNED');
 assert.equal(r.tf15.cross.direction,'long','future event must not leak');
 assert.equal(r.decisionImpact,false);
});
test('upper LBW+60 and lower BW−60 are DISTINCT informational references',()=>{
 let d=chain.build({now:BASE,price:80000,mcb15:{lbw:30,bw:-66},mcb3:{}});
 assert.equal(d.extremeBand.highLBW60,false);
 assert.equal(d.extremeBand.lowBWMinus60,true);
 d=chain.build({now:BASE,price:80000,mcb15:{lbw:65,bw:18},mcb3:{}});
 assert.equal(d.extremeBand.highLBW60,true);
 assert.equal(d.extremeBand.lowBWMinus60,false);
});
test('unknown event PM without prior Audit cannot be fabricated',()=>{
 const r=chain.build({now:BASE+75000,price:80080,
  events:[ev('MCB3','E3','OBSERVED','long',BASE+70000,BASE,80000,-70)],
  audit:[],mcb15:{lbw:-65,bw:-66},mcb3:{lbw:-70,bw:-75}});
 assert.equal(r.tf3.live.pmLive,null);
 assert.equal(r.tf3.live.pmQuality,'PM_AT_EVENT_UNKNOWN');
});
test('the V5.3 State vivant doubles BTC price and shows two causal histories',()=>{
 const tick=String.fromCharCode(96),source=server.indexOf("app.get('/app.js', requireAuth"),
  a=server.indexOf('send('+tick,source),b=server.indexOf(tick+');\n});',a);
 assert(a>0&&b>a);
 const js=vm.runInNewContext(tick+server.slice(a+6,b)+tick),
  start=js.indexOf('function renderV52Living(data){'),
  end=js.indexOf('async function loadV52PaperPanel(){',start);
 assert(start>0&&end>start);
 const element={innerHTML:''},context={document:{getElementById:id=>id==='v52-live'?element:null},
  Date,Math,Number,String,escTrade:String,v5Time:x=>x?new Date(x).toISOString():'—'};
 vm.createContext(context);vm.runInContext(js.slice(start,end),context);
 const data={updatedAt:BASE+1200000,completed:10,realizedUsd:-12,equityUsd:988,
  analysis:{asOf:BASE+1200000,price:80555.5,action:'WAIT',quality:'DATA_OK',
   candidate:'short',phase:'MCB15_CONTESTED_SHORT',readings:{
    mcb15:{lbw:66,bw:54,mf15:12,mf15Delta10m:-2,currentOffensive:'short',trajectory:'long'},
    mcb3:{lbw:-80,bw:-77,mf:-18},
    geometry:{cross3:{direction:'short',ts:BASE+20000},
     cross15:{direction:'short',ts:BASE+18000}},
    conversion:{pm3:-53,pm5:-61,pmLastBaton:-7,pmSinceBaton:2,mf3Delta3m:-3.4},
    maturity:{maturity:'TACTICAL_RESET_E3',cross3AgeMin:4},
    flow15:{coherence:'BOTH_FLOW_SLOPES_SUPPORT'}}},
  causalEvents:chain.build({events:[
   ev('MCB15','E15','OBSERVED','short',BASE+60000,BASE,80560,-60),
   ev('MCB15','BW_LBW_CROSS','OBSERVED','short',BASE+70000,BASE+65000,80558,null),
   ev('MCB3','BW_LBW_CROSS','OBSERVED','long',BASE+60000,BASE+50000,80555,null),
   ev('MCB3','E3','OBSERVED','short',BASE+90000,BASE,80544,-50)],
   audit:[{ts:BASE+30000,lastPrice:80555,priceMove:-13},
    {ts:BASE+60000,lastPrice:80553,priceMove:-7}],
   now:BASE+1200000,price:80555.5,
   mcb15:{lbw:66,bw:54,currentOffensive:'short'},
   mcb3:{lbw:-80,bw:-77,tacticalDirection:'long'}})};
 context.renderV52Living(data);
 const html=element.innerHTML;
 for(const term of ['MCB15 · DIRECTEUR','MCB3 · TACTIQUE','Cross15','Cross3',
 'E15 Live','E3 Live','E15 confirmé','E3 confirmé','PM Live','LBW15 ≥ +60',
 'BW15 ≤ −60','v53-btc-price','3m opposé au 15m'])assert.ok(html.includes(term),term);
 assert.ok(server.includes('.v53-btc-price{font-size:22px'));
 assert.ok(server.includes('summary.causalEvents='));
 assert.ok(server.includes('v53CausalChainUi.build'));
});
test('Conversion remains directly under Etat vivant before the Elastic memory list',()=>{
 const c={window:{},document:{}};vm.runInNewContext(elastic,c);
 const html=c.window.renderElasticObserverV05({elasticObserverShadow:{
  effort:{available:true,buyBtc:1,sellBtc:1},conversion:{pm3:10,pm5:12,pmLive:5}}});
 assert.ok(html.indexOf('el-duel-bubble')<html.indexOf('el-list-bubble'));
 const i=server.indexOf("'<div id=\"v52-live\""),
  j=server.indexOf('(window.renderElasticObserverV05?window.renderElasticObserverV05(current)',i),
  k=server.indexOf("'<details id=\"v493-details\"",i);
 assert.ok(i>0&&j>i&&k>j);
 assert.ok(!server.slice(i,j).includes('ELASTIC · MÉMOIRE COMMUNE / CONVERSION'),
  'no added row between V5.3 and the graphic');
});
test('MCB15 keeps last cross/E15 observed facts beyond three hours without treating them as live',()=>{
 const now=BASE+5*3600000,old=BASE+3600000;
 const events=[
  ev('MCB15','BW_LBW_CROSS','OBSERVED','short',old+7000,old,80470,null),
  ev('MCB15','E15','OBSERVED','short',old+12000,old,80445,-50),
  ev('MCB15','E15','CONFIRMED','short',old+15*60000+6000,old,80400,-52),
  ev('MCB3','BW_LBW_CROSS','OBSERVED','long',now-22000,now-24000,80510,null)];
 const result=chain.build({now,price:80509,events,audit:[],
  mcb15:{lbw:-51,bw:-47,currentOffensive:null,trajectory:'short'},
  mcb3:{lbw:31,bw:35,tacticalDirection:'long'}});
 assert.equal(result.version,'v53-causal-chain-ui-v0.2');
 assert.equal(result.tf15.cross.observedAt,old+7000);
 assert.equal(result.tf15.live.observedAt,old+12000);
 assert.equal(result.tf15.confirmed.observedAt,old+15*60000+6000);
 assert.ok(result.tf15.cross.historyOnly);
 assert.ok(result.tf15.confirmed.ageMinutes>180);
 assert.equal(result.tf15.geometryDirection,null,
  'a historical cross is not automatically a current 15m direction');
 assert.equal(result.alignment,'UNRESOLVED');
 assert.equal(result.tf15.confirmed.pmQuality,'PM_AT_EVENT_UNKNOWN');
 assert.equal(result.decisionImpact,false);
});
test('MCB15 gets latest official E15 from engine memory after Elastic journal rotates',()=>{
 const now=BASE+8*3600000,confirmedAt=BASE+3600000;
 const r=chain.build({now,price:80500,events:[],audit:[],
  mcb15:{lbw:-44,bw:-31,confirmedE15:{
   family:'MCB15',key:'E15',type:'CONFIRMED',direction:'short',
   observedAt:confirmedAt,sourceTs:BASE,price:80612.5}},
  mcb3:{lbw:22,bw:30}});
 assert.equal(r.tf15.confirmed.observedAt,confirmedAt);
 assert.equal(r.tf15.confirmed.direction,'short');
 assert.equal(r.tf15.confirmed.historyOnly,true);
 assert.equal(r.tf15.cross,null,'never fabricate an unobserved BW/LBW cross');
 assert.equal(r.tf15.live,null,'never fabricate an unobserved E15 Live');
});
test('future E15 confirmation must not leak into a prior as-of UI view',()=>{
 const now=BASE+3600000;
 const r=chain.build({now,price:80000,
  events:[ev('MCB15','E15','CONFIRMED','short',now+30000,BASE,80450,-39)],
  audit:[],mcb15:{lbw:-48,bw:-42,
   confirmedE15:{direction:'short',observedAt:now+30000,sourceTs:BASE}},
  mcb3:{}});
 assert.equal(r.tf15.confirmed,null);
});
test('historical E15 is visibly marked as memory, while current LBW/BW remain readable',()=>{
 const tick=String.fromCharCode(96);
 const source=server.indexOf("app.get('/app.js', requireAuth"),
  a=server.indexOf('send('+tick,source),
  b=server.indexOf(tick+');\n});',a);
 const js=vm.runInNewContext(tick+server.slice(a+6,b)+tick);
 const start=js.indexOf('function renderV52Living(data){'),
  end=js.indexOf('async function loadV52PaperPanel(){',start);
 const element={innerHTML:''},context={document:{getElementById:id=>id==='v52-live'?element:null},
  Date,Math,Number,String,escTrade:String,
  v5Time:x=>x?new Date(x).toISOString():'—'};
 vm.createContext(context);
 vm.runInContext(js.slice(start,end),context);
 const now=BASE+5*3600000;
 const audit=[];
 const events=[ev('MCB15','E15','CONFIRMED','short',BASE+3600000,BASE,80410,-52)];
 const state={updatedAt:now,analysis:{asOf:now,price:80439.4,
  action:'WAIT',quality:'DATA_OK',readings:{
   mcb15:{lbw:-51.2,bw:-47.5,trajectory:'short',
    currentOffensive:null,mf15:-.7},
   mcb3:{lbw:-31,bw:-30}}},causalEvents:chain.build({now,
   price:80439.4,events,audit,mcb15:{lbw:-51.2,bw:-47.5},mcb3:{}})};
 context.renderV52Living(state);
 assert.ok(element.innerHTML.includes('LBW15 -51.2 / BW15 -47.5'));
 assert.ok(element.innerHTML.includes('E15 confirmé'));
 assert.ok(element.innerHTML.includes('mémoire 4h00'));
 assert.ok(element.innerHTML.includes('>DN</b>'),
  'confirmed E15 direction is displayed as DN, not invented as live SHORT');
});
