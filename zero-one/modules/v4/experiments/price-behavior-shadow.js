'use strict';

const VERSION='price-behavior-shadow-v0.1';

function finite(v){return Number.isFinite(Number(v));}
function dirFrom(v){
  const n=Number(v);
  return Number.isFinite(n)?(n>0?'long':n<0?'short':null):null;
}
function opposite(d){return d==='long'?'short':d==='short'?'long':null;}

function eventDirection(e){
  if(!e)return null;
  if(e.type==='UP')return 'long';
  if(e.type==='DN')return 'short';
  return null;
}
function newest(a,b){
  if(!a)return b||null;
  if(!b)return a||null;
  return Number(a.ts)>=Number(b.ts)?a:b;
}
function signalMemory(native){
  const persistent=native&&native.signalSequenceMemory||null;
  if(persistent&&persistent.available){
    return {
      state:persistent.established?'WAVE_SIGNAL_MEMORY_ESTABLISHED':'SIGNAL15_MEMORY_ONLY',
      direction:persistent.direction||null,
      established:!!persistent.established,
      sequence:persistent.sequence||'NONE',
      gapMinutes:persistent.precursor3m&&persistent.strategic15m
        ?(Number(persistent.strategic15m.ts)-Number(persistent.precursor3m.ts))/60000
        :persistent.follower3m&&persistent.strategic15m
          ?(Number(persistent.follower3m.ts)-Number(persistent.strategic15m.ts))/60000:null,
      signal3:persistent.precursor3m||persistent.follower3m||persistent.latest3m||null,
      signal15:persistent.strategic15m||null,
      tacticalOpposition:!!persistent.tacticalOpposition,
      tacticalState:persistent.tacticalState||null,
      persistentStrategicMemory:true,
      semantic:persistent.semantic||'persistent native signal sequence memory'
    };
  }
  const up3=native&&native.last3mUp||null;
  const dn3=native&&native.last3mDn||null;
  const up15=native&&native.lastUp||null;
  const dn15=native&&native.lastDn||null;
  const latest3=newest(up3,dn3);
  const latest15=newest(up15,dn15);
  const d3=eventDirection(latest3),d15=eventDirection(latest15);

  let state='NO_SIGNAL_MEMORY',direction=null,sequence='NONE',gapMinutes=null,established=false;
  if(latest3&&latest15){
    const same=d3&&d3===d15;
    const gap=(Number(latest15.ts)-Number(latest3.ts))/60000;
    gapMinutes=Number.isFinite(gap)?gap:null;
    if(same){
      direction=d3;
      established=true;
      if(Number(latest3.ts)<=Number(latest15.ts))sequence='SIGNAL3_TO_SIGNAL15';
      else sequence='SIGNAL15_TO_SIGNAL3';
      state='WAVE_SIGNAL_MEMORY_ESTABLISHED';
    }else{
      state='SIGNAL_MEMORY_CONFLICT';
      direction=Number(latest3.ts)>Number(latest15.ts)?d3:d15;
      sequence='OPPOSING_LATEST_SIGNALS';
    }
  }else if(latest3){
    state='SIGNAL3_MEMORY_ONLY';direction=d3;sequence='SIGNAL3_ONLY';
  }else if(latest15){
    state='SIGNAL15_MEMORY_ONLY';direction=d15;sequence='SIGNAL15_ONLY';
  }

  return {
    state,direction,established,sequence,gapMinutes,
    signal3:latest3||null,signal15:latest15||null,
    last3mUp:up3,last3mDn:dn3,last15mUp:up15,last15mDn:dn15,
    semantic:'descriptive memory only: preserves the latest native 3m and 15m events so price behavior can be studied in relation to an established wave'
  };
}

function classifyTicker(ticker){
  const c=ticker&&ticker.current||{};
  const y75=Number(c.yieldVsP75),y95=Number(c.yieldVsP95),effort=Number(c.effortVsP75);
  const direction=ticker&&ticker.direction||null;
  let state='UNKNOWN';
  if(Number.isFinite(y95)&&y95>=1&&Number.isFinite(effort)&&effort<1)state='EXTREME_EASY_TRAVEL';
  else if(Number.isFinite(y75)&&y75>=1&&Number.isFinite(effort)&&effort<1)state='EASY_TRAVEL';
  else if(Number.isFinite(y95)&&y95>=1)state='EXTREME_PRODUCTIVE_TRAVEL';
  else if(Number.isFinite(y75)&&y75>=1)state='PRODUCTIVE_TRAVEL';
  else if(Number.isFinite(effort)&&effort>=1&&(!Number.isFinite(y75)||y75<1))state='HIGH_EFFORT_LOW_YIELD';
  else if(Number.isFinite(y75)&&y75<1)state='LOW_YIELD';
  return {
    state,direction,
    yieldVsP75:Number.isFinite(y75)?y75:null,
    yieldVsP95:Number.isFinite(y95)?y95:null,
    effortVsP75:Number.isFinite(effort)?effort:null,
    cadence:Number.isFinite(Number(c.cadence))?Number(c.cadence):null,
    flowBtcPerSec:Number.isFinite(Number(c.flowBtcPerSec))?Number(c.flowBtcPerSec):null,
    yieldUsdPerBtc:Number.isFinite(Number(c.yieldUsdPerBtc))?Number(c.yieldUsdPerBtc):null
  };
}

function pmView(translation){
  const h=translation&&translation.horizons||{};
  const net1=Number(h.net1mUsd),net3=Number(h.net3mUsd),net5=Number(h.net5mUsd);
  const d3=dirFrom(net3),d5=dirFrom(net5);
  return {
    status:translation&&translation.status||null,
    net1mUsd:Number.isFinite(net1)?net1:null,
    net3mUsd:Number.isFinite(net3)?net3:null,
    net5mUsd:Number.isFinite(net5)?net5:null,
    efficiency1m:finite(h.efficiency1m)?Number(h.efficiency1m):null,
    efficiency3m:finite(h.efficiency3m)?Number(h.efficiency3m):null,
    efficiency5m:finite(h.efficiency5m)?Number(h.efficiency5m):null,
    direction3m:d3,direction5m:d5,
    multiHorizonDirection:d3&&d3===d5?d3:null
  };
}

function relation(direction,memory){
  if(!direction||!memory||!memory.direction)return 'NO_RELATION';
  return direction===memory.direction?'WITH_SIGNAL_MEMORY':'AGAINST_SIGNAL_MEMORY';
}

function evaluate(frame,native,translation,ticker,previous=null){
  const now=Number(frame&&frame.market&&frame.market.timestamp);
  const price=Number(frame&&frame.market&&frame.market.price);
  const memory=signalMemory(native);
  const tk=classifyTicker(ticker);
  const pm=pmView(translation);

  // Use the ticker's current directional observation first; when unavailable,
  // use coherent rolling 3m+5m price conversion. This is descriptive only.
  const direction=tk.direction||pm.multiHorizonDirection||pm.direction3m||null;
  const travelState=tk.state;
  const interesting=['EXTREME_EASY_TRAVEL','EASY_TRAVEL','EXTREME_PRODUCTIVE_TRAVEL','PRODUCTIVE_TRAVEL'].includes(travelState);
  const easy=['EXTREME_EASY_TRAVEL','EASY_TRAVEL'].includes(travelState);
  const rel=relation(direction,memory);
  const waveAligned=!!(memory.established&&rel==='WITH_SIGNAL_MEMORY');
  const waveOpposed=!!(memory.established&&rel==='AGAINST_SIGNAL_MEMORY');

  const sameEpisode=!!(
    previous&&previous.version===VERSION&&
    previous.travel&&previous.travel.state===travelState&&
    previous.direction===direction&&
    Number.isFinite(Number(previous.episode&&previous.episode.startedAt))
  );
  const startedAt=sameEpisode?Number(previous.episode.startedAt):now;
  const startPrice=sameEpisode?Number(previous.episode.startPrice):price;
  const signedMove=direction==='long'?price-startPrice:direction==='short'?startPrice-price:null;
  const samples=sameEpisode?(Number(previous.episode.samples)||0)+1:1;

  let maxFavorable=sameEpisode?Number(previous.episode.maxFavorableUsd)||0:0;
  let maxAdverse=sameEpisode?Number(previous.episode.maxAdverseUsd)||0:0;
  if(Number.isFinite(signedMove)){
    maxFavorable=Math.max(maxFavorable,signedMove);
    maxAdverse=Math.max(maxAdverse,-signedMove);
  }

  const durationMinutes=Number.isFinite(now)&&Number.isFinite(startedAt)?Math.max(0,(now-startedAt)/60000):null;
  const easeRatio=finite(tk.yieldVsP75)&&finite(tk.effortVsP75)&&Number(tk.effortVsP75)>0
    ?Number(tk.yieldVsP75)/Number(tk.effortVsP75):null;

  return {
    version:VERSION,
    decisionImpact:false,
    state:interesting?(waveAligned?'INTERESTING_PRICE_WITH_WAVE':'INTERESTING_PRICE'):'OBSERVING_PRICE',
    direction,
    interesting,
    easyTravel:easy,
    travel:{...tk,easeRatio:Number.isFinite(easeRatio)?easeRatio:null},
    pm,
    signalMemory:memory,
    relationToSignalMemory:rel,
    waveEstablished:memory.established,
    waveAligned,
    waveOpposed,
    episode:{
      startedAt:Number.isFinite(startedAt)?startedAt:null,
      startedTimestamp:Number.isFinite(startedAt)?new Date(startedAt).toISOString():null,
      startPrice:Number.isFinite(startPrice)?startPrice:null,
      durationMinutes,
      samples,
      currentSignedMoveUsd:Number.isFinite(signedMove)?signedMove:null,
      maxFavorableUsd:maxFavorable,
      maxAdverseUsd:maxAdverse
    },
    observations:{
      highYieldLowEffort:easy,
      productivePrice:interesting,
      establishedWavePlusEasyPrice:!!(memory.established&&waveAligned&&easy),
      establishedWavePlusProductivePrice:!!(memory.established&&waveAligned&&interesting),
      priceBehaviorCanExistWithoutTradeThesis:true
    },
    semantic:'shadow-only continuous study of price effort/yield and rolling conversion, related to remembered 3m/15m native signal sequence; never creates direction or trading authority'
  };
}

module.exports={VERSION,evaluate,signalMemory,classifyTicker,pmView};
