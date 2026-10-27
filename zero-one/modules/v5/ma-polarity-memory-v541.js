'use strict';
// BOONO MA polarity / retest memory: descriptive counts, causal confirmed-bar facts.
// No trade action, no volume inference and no look-ahead.
const PERIOD={'3m':180000,'15m':900000};
const N=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const sign=v=>v>0?1:v<0?-1:0;
const sideName=v=>v===1?'ABOVE':v===-1?'BELOW':'UNKNOWN';
function inspect(tf,raw,now){
 const period=PERIOD[tf];
 const rows=(raw||[]).filter(b=>N(b.ts)!==null&&b.ts+period<=now&&
   [b.ma200,b.close,b.low,b.high].every(v=>N(v)!==null))
   .sort((a,b)=>a.ts-b.ts).slice(tf==='3m'?-1000:-750);
 const empty={version:'ma-polarity-memory-v1',source:'CONFIRMED_MCB_MA200_PRICE',
   asOf:now,tf,polarity:'UNKNOWN',polarityChangedAt:null,
   polarityChangeObserved:false,retestsSinceChange:null,
   countIsPartial:true,coveredFrom:rows[0]?.ts+period||null,
   recentRetests:[],events:[],lastTouchAt:null,lastRetestAt:null,lastRejection:null,
   lastFailedReclaim:null,latestAcceptance:null};
 if(!period||rows.length<3)return empty;
 let polarity=0,changedAt=null,changedKnown=false,retests=0;
 let bias=0,run=0,armed=false,inTest=false,lastTouchAt=null,
   lastRetestAt=null,lastRejection=null,lastFailedReclaim=null,
   latestAcceptance=null,retArr=[],events=[],priorContact=false;
 const remember=(type,at,extra={})=>{
  events.push({type,at,...extra});if(events.length>16)events.shift();
 };
 const contact=b=>{
   const tol=Math.max(5,Math.abs(b.ma200)*.0003);
   return b.low<=b.ma200+tol&&b.high>=b.ma200-tol;
 };
 for(let i=0;i<rows.length;i++){
  const b=rows[i],ts=b.ts+period,tol=Math.max(5,Math.abs(b.ma200)*.0003);
  const gap=b.close-b.ma200,at=sign(gap)*(Math.abs(gap)>tol?1:0);
  const touched=contact(b);
  if(touched&&!priorContact)lastTouchAt=ts;
  if(at===0){bias=0;run=0;}else if(at===bias)run++;else{bias=at;run=1;}
  const validChange=at!==0&&run===2&&at!==polarity;
  if(validChange){
   if(polarity!==0){
    changedKnown=true;
    if(lastRejection?.sideLost===sideName(at)){
      lastRejection=null;lastFailedReclaim=null;
    }
   }
   remember(changedKnown?'POLARITY_CHANGED':'POLARITY_BASELINE',ts,
    {polarity:sideName(at),confirmed:true});
   polarity=at;changedAt=changedKnown?ts:null;retests=0;
   retArr=[];inTest=false;armed=false;
   latestAcceptance={side:sideName(at),at:ts,ma:b.ma200,price:b.close};
  }
  // Rejection of a previously ACCEPTED side, on its FIRST contrary closed candle.
  // The MA need not have completed its opposite 2-close polarity flip yet.
  if(polarity!==0&&at===-polarity&&
    latestAcceptance?.side===sideName(polarity)&&
    ts-latestAcceptance.at<=90*60000){
   if(!lastRejection||lastRejection.sideLost!==sideName(polarity)||
     lastRejection.at<latestAcceptance.at){
    lastRejection={sideLost:sideName(polarity),at:ts,ma:b.ma200,
      price:b.close,acceptedAt:latestAcceptance.at,
      proof:'CLOSED_PRICE_REJECTS_PREVIOUSLY_ACCEPTED_MA'};
    remember('ACCEPTED_SIDE_REJECTED',ts,{sideLost:sideName(polarity),
      ma:b.ma200,price:b.close});
   }
  }
  // A fresh attempt to reclaim an already rejected side can fail on a
  // CLOSED candle whose wick retested the MA but whose close remains opposite.
  if(lastRejection&&ts>lastRejection.at&&
    ts-lastRejection.at<=60*60000&&touched&&
    sign(b.close-b.ma200)===-sign(lastRejection.sideLost==='ABOVE'?1:-1)&&
    Math.abs(b.close-b.ma200)>tol){
    if(!lastFailedReclaim||lastFailedReclaim.rejectionAt!==lastRejection.at){
      lastFailedReclaim={sideLost:lastRejection.sideLost,at:ts,
        rejectionAt:lastRejection.at,ma:b.ma200,price:b.close,
        proof:'CONFIRMED_TOUCH_AND_FAILED_RECLAIM'};
      remember('FAILED_RECLAIM',ts,{sideLost:lastRejection.sideLost,
        ma:b.ma200,price:b.close});
    }
  }
  if(polarity&&!validChange){
   const same=polarity*gap>2*tol;
   if(same&&!touched){armed=true;inTest=false;}
   if(armed&&touched&&!inTest){
    inTest=true;armed=false;retests++;lastRetestAt=ts;
    retArr.push({at:ts,polarity:sideName(polarity),ma:b.ma200,
      result:'PENDING'});
    remember('RETEST_STARTED',ts,{polarity:sideName(polarity),
      retestOrdinal:retests,ma:b.ma200});
    if(retArr.length>10)retArr.shift();
   }
   if(inTest&&retArr.length){
    const last=retArr[retArr.length-1];
    if(polarity*gap>tol&&!touched){
      last.result='HELD';last.resolvedAt=ts;inTest=false;armed=true;
      remember('RETEST_HELD',ts,{retestAt:last.at,polarity:sideName(polarity)});
    }else if(polarity*gap< -tol){
      last.result='FAILED';last.resolvedAt=ts;inTest=false;
      remember('RETEST_FAILED',ts,{retestAt:last.at,polarity:sideName(polarity)});
    }
   }
  }
  priorContact=touched;
 }
 // Only the latest confirmed rejection can be strategically consulted;
 // older history and retest counters are never an input to trading decisions.
 return {...empty,polarity:sideName(polarity),polarityChangedAt:changedAt,
   polarityChangeObserved:changedKnown,retestsSinceChange:retests,
   countIsPartial:!changedKnown,
   recentRetests:retArr,events,lastTouchAt,lastRetestAt,lastRejection,
   lastFailedReclaim,latestAcceptance};
}
module.exports={inspect};
