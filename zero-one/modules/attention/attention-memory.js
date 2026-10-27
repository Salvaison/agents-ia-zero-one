'use strict';
// BOONO Systems: causal selective-attention memory. Pure, no trading authority.
const VERSION='boono-attention-v0.2';
const STAGES={DISCOVERY:'DISCOVERY',HOLD:'CAMPAIGN_HOLD',WATCH:'REVERSAL_ATTENTION',TRANSFER:'TRANSFER_EXAMINATION'};
const KINDS=new Set(['MCB15_NATIVE','MCB3_NATIVE','MCB3_TURN','MCB15_FORMING','MCB15_PIVOT','MCB15_LBW_DIVERGENCE','MF_DIVERGENCE','MF_ACTION','MF_TRANSFER','PRICE_TRANSLATION','PRICE_DEFENCE','PRICE_FAILURE','PRICE_REJECTION','MA_ACCEPTANCE','MA_REJECTION','PRICE_FALSIFIES']);
const n=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const opposite=d=>d==='long'?'short':d==='short'?'long':null;
const directional=d=>['long','short'].includes(d);
function normal(e,at){
 if(!e||!KINDS.has(e.kind)||!directional(e.direction))return null;
 const source=n(e.sourceAt),known=n(e.availableAt);
 if(source===null||known===null||source>known||known>at||source<0)return null;
 const id=String(e.id||[e.kind,e.direction,source,known].join('|'));
 if(id.length>240)return null;
 const family=e.kind.startsWith('MCB')?'MCB':
  e.kind.startsWith('MF_')?'MF':e.kind.startsWith('MA_')?'MA':'PRICE';
 const anchors=e.anchors||null;
 return {id,kind:e.kind,family,direction:e.direction,sourceAt:source,
  availableAt:known,price:n(e.price),anchors:anchors?{
   priceFirst:n(anchors.priceFirst),priceSecond:n(anchors.priceSecond),
   mfFirst:n(anchors.mfFirst),mfSecond:n(anchors.mfSecond),
   lbwFirst:n(anchors.lbwFirst),lbwSecond:n(anchors.lbwSecond)}:null,
  quality:e.quality||null,episodeId:e.episodeId||null};
}
function divergence(e){
 if(e?.kind!=='MF_DIVERGENCE'||!e.anchors)return false;
 const a=e.anchors;
 if([a.priceFirst,a.priceSecond,a.mfFirst,a.mfSecond].some(v=>v===null))return false;
 return e.direction==='long'?a.priceSecond<a.priceFirst&&a.mfSecond>a.mfFirst:
   a.priceSecond>a.priceFirst&&a.mfSecond<a.mfFirst;
}
function proof(events,d,at){
 if(!directional(d))return null;
 const is=e=>e.direction===d&&e.availableAt<=at;
 const last=k=>events.findLast(e=>is(e)&&k.includes(e.kind))||null;
 const mcb15=last(['MCB15_PIVOT','MCB15_NATIVE','MCB15_FORMING']);
 const mcb3=last(['MCB3_NATIVE','MCB3_TURN']);
 // The oscillator divergence is an observed structural relation, not a fresh
 // E15 native event, and cannot independently open/close a position.
 const lbw15Divergence=last(['MCB15_LBW_DIVERGENCE']);
 const div=events.findLast(e=>is(e)&&divergence(e))||null;
 const mf=last(['MF_ACTION','MF_TRANSFER']);
 const mfSequence=!!(div&&mf&&mf.availableAt>=div.availableAt&&
   mf.availableAt-div.availableAt<=90*60000);
 const transferMF=last(['MF_TRANSFER']);
 const mfObserved=mfSequence||!!transferMF;
 const falsified=Math.max(0,...events.filter(e=>is(e)&&e.kind==='PRICE_FALSIFIES').map(e=>e.availableAt));
 const price=events.findLast(e=>is(e)&&e.availableAt>falsified&&
  ['PRICE_TRANSLATION','PRICE_DEFENCE','PRICE_FAILURE','PRICE_REJECTION'].includes(e.kind))||null;
 const proofStart=mfSequence?mf.availableAt:transferMF?.availableAt;
 const priceAfterMF=!!(price&&proofStart!==undefined&&
  price.availableAt>=proofStart&&price.availableAt-proofStart<=40*60000);
 const mcb15Recent=!!(mcb15&&at-mcb15.availableAt<=120*60000);
 const mcb3Recent=!!(mcb3&&at-mcb3.availableAt<=75*60000);
 const priceRecent=!!(price&&at-price.availableAt<=30*60000);
 return {direction:d,oscillator:{mcb15,mcb3,lbw15Divergence,
    observed:mcb15Recent||mcb3Recent},
  mf:{divergence:div,action:mf,sequence:mfSequence,transfer:transferMF,observed:mfObserved},
  price:{event:price,observed:priceRecent},
  transferable:!!(mcb15Recent&&mfObserved&&priceRecent&&priceAfterMF),
  missing:[...(!mcb15Recent?['MCB15_OPPOSITE_PROOF']:[]),
   ...(!mfObserved?['MF_SEQUENCE_OR_TRANSFER']:[]),
   ...(!priceAfterMF?['PRICE_RESPONSE_AFTER_MF']:[])]};
}
function evaluate({now,previous=null,campaignId=null,campaignDirection=null,
 positionDirection=null,observations=[],lastExitAt=null}={}){
 const at=n(now);
 if(at===null||at<0)throw Error('ATTENTION_REQUIRED_ASOF');
 if(previous&&previous.version!==VERSION)throw Error('ATTENTION_VERSION_MISMATCH');
 if(previous&&at<previous.asOf)throw Error('ATTENTION_ASOF_REGRESSION');
 const cid=campaignId||null,parent=directional(campaignDirection)?campaignDirection:null;
 const pos=directional(positionDirection)?positionDirection:null;
 const previousEvents=previous?.campaignId===cid?previous.events||[]:[];
 const merged=[...previousEvents,...observations.map(x=>normal(x,at)).filter(Boolean)]
  .filter(e=>e.availableAt<=at&&at-e.availableAt<=150*60000)
  .sort((a,b)=>a.availableAt-b.availableAt||a.id.localeCompare(b.id));
 const seen=new Set(),events=[];
 for(const e of merged){if(!seen.has(e.id)){events.push(e);seen.add(e.id);}}
 const bounded=events.slice(-240);
 const opposing=pos?proof(bounded,opposite(pos),at):null;
 const aligned=parent?proof(bounded,parent,at):null;
 const hasWatch=!!(opposing&&(opposing.oscillator.observed||
  opposing.mf.sequence||opposing.mf.transfer));
 const stage=pos?(opposing?.transferable?STAGES.TRANSFER:
  hasWatch?STAGES.WATCH:STAGES.HOLD):STAGES.DISCOVERY;
 const stageSince=previous?.stage===stage&&previous.campaignId===cid?
  previous.stageSince:at;
 const lastExit=n(lastExitAt);
 const postExit=lastExit===null?[]:bounded.filter(e=>e.availableAt>lastExit&&
  ['MCB3_NATIVE','MCB15_NATIVE','MF_TRANSFER','PRICE_DEFENCE','PRICE_TRANSLATION'].includes(e.kind));
 return {version:VERSION,asOf:at,campaignId:cid,direction:parent,
  positionDirection:pos,stage,stageSince,events:bounded,
  opposing,aligned,postExitEvidence:postExit.slice(-12),
  newCausalEpisodeAfterExit:postExit.length>0,
  attentionOnly:true,entryAllowed:null,exitRequested:null,riskOverride:false,
  brokerOrdersEnabled:false};
}
module.exports={VERSION,STAGES,normal,divergence,proof,evaluate};
