'use strict';
const fs=require('fs');
const path=require('path');
const DATA=path.join(__dirname,'../../../data');
const STATE_PATH=path.join(DATA,'trade-sim-v3lab-tranche-shadow.json');
const EVENTS_PATH=path.join(DATA,'trade-sim-v3lab-tranche-shadow.ndjson');
const VERSION='tranche-shadow-v0.1';
const MODELS=[
  {id:'70_30',securePct:70,runnerPct:30},
  {id:'60_40',securePct:60,runnerPct:40},
  {id:'50_50',securePct:50,runnerPct:50},
];
function read(){try{const x=JSON.parse(fs.readFileSync(STATE_PATH,'utf8'));return x&&x.version===VERSION?x:null;}catch(_){return null;}}
function initial(){return {version:VERSION,startedAt:new Date().toISOString(),open:[],history:[]};}
function save(s){fs.writeFileSync(STATE_PATH,JSON.stringify(s,null,2));}
function event(x){fs.appendFileSync(EVENTS_PATH,JSON.stringify({ts:new Date().toISOString(),...x})+'\n');}
function pnlLev(t,price){const raw=(Number(price)-Number(t.entryPrice))/Number(t.entryPrice)*100;return (t.direction==='long'?raw:-raw)*Number(t.leverage||10);}
function create(module,pos){
  return {id:module+'|'+pos.entryTimestamp,module,direction:pos.direction,entryPrice:pos.entryPrice,
    entryTimestamp:pos.entryTimestamp,leverage:Number(pos.leverage||10),mainClosed:false,mainExit:null,
    models:Object.fromEntries(MODELS.map(m=>[m.id,{...m,protected:false,closed:false,realizedLev:0,protect:null,runnerExit:null,totalLev:null}]))};
}
function allClosed(t){return Object.values(t.models).every(m=>m.closed);}
function closeFull(t,result,why){
  const lev=pnlLev(t,result.price);
  for(const m of Object.values(t.models)){
    if(m.closed)continue;
    if(m.protected){
      m.realizedLev += (m.runnerPct/100)*lev;
    }else{
      m.realizedLev = lev;
    }
    m.runnerExit={price:result.price,marketTimestamp:result.marketTimestamp,reason:why,pnlLevAtExit:lev};
    m.totalLev=m.realizedLev;m.closed=true;
  }
}
function summarize(t){
  return {id:t.id,direction:t.direction,entryPrice:t.entryPrice,entryTimestamp:t.entryTimestamp,mainClosed:t.mainClosed,
    models:Object.fromEntries(Object.entries(t.models).map(([k,m])=>[k,{protected:m.protected,closed:m.closed,
      protect:m.protect,runnerExit:m.runnerExit,totalLev:m.totalLev}]))};
}
function update(module,result,activePos){
  const s=read()||initial();
  let t=activePos?s.open.find(x=>x.id===module+'|'+activePos.entryTimestamp):null;
  if(activePos&&!t){
    t=create(module,activePos);s.open.push(t);
    event({kind:'OPEN',tracker:summarize(t)});
  }

  if(t&&activePos){
    const a=result.action||{}, lev=pnlLev(t,result.price);
    if(a.type==='EXIT_EXECUTION'&&lev>0){
      t.mainClosed=true;t.mainExit={kind:a.type,price:result.price,marketTimestamp:result.marketTimestamp,pnlLev:lev,reason:a.reason};
      for(const m of Object.values(t.models)){
        if(m.protected||m.closed)continue;
        m.protected=true;
        m.realizedLev=(m.securePct/100)*lev;
        m.protect={price:result.price,marketTimestamp:result.marketTimestamp,pnlLevAtProtect:lev,reason:a.reason};
      }
      event({kind:'PROTECT',tracker:summarize(t)});
    } else if(String(a.type||'').startsWith('EXIT_')){
      t.mainClosed=true;t.mainExit={kind:a.type,price:result.price,marketTimestamp:result.marketTimestamp,pnlLev:lev,reason:a.reason};
      closeFull(t,result,'main '+a.type);
      event({kind:'CLOSE_WITH_MAIN',tracker:summarize(t)});
    }
  }

  /* Runner virtuel: apres PROTECT, seule une vraie bascule de phase le ferme. */
  for(const x of s.open){
    if(!x.mainClosed)continue;
    const hasRunner=Object.values(x.models).some(m=>m.protected&&!m.closed);
    if(!hasRunner)continue;
    const wd=result.wave&&result.wave.direction;
    if(wd&&wd!==x.direction){
      closeFull(x,result,'phase de vague opposee');
      event({kind:'RUNNER_STRUCTURE_EXIT',tracker:summarize(x)});
    }
  }

  const done=s.open.filter(allClosed);
  if(done.length){
    s.history.push(...done);
    while(s.history.length>500)s.history.shift();
    s.open=s.open.filter(x=>!allClosed(x));
  }
  save(s);
  return {
    version:VERSION,decisionImpact:false,
    open:s.open.map(summarize),
    completed:s.history.length,
    lastCompleted:s.history.length?summarize(s.history[s.history.length-1]):null,
    rule:'EXIT_EXECUTION profitable = PROTECT; runner = sortie au changement de phase'
  };
}
module.exports={update,VERSION};
