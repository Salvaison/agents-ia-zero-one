'use strict';
// V5 experimental admission hypothesis, derived from linked market observations.
// No broker calls, no import from V4 decisions; paper simulator consumes the output.
const VERSION='v5-opportunity-hypothesis-v0.1';
const N=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const dir=x=>x>0?'long':x<0?'short':null;
const sign=d=>d==='long'?1:-1;
const qOK=new Set(['EASY','PRODUCTIVE','POWERFUL','EXCEPTIONAL']);
function delta(samples,now,mins){
 const ts=now-mins*60000;
 const earlier=[...samples].reverse().find(x=>x.ts<=ts&&ts-x.ts<=75000);
 const latest=samples.at(-1);
 return earlier&&latest?Math.round((latest.price-earlier.price)*10)/10:null;
}
function latestNative(s,now){
 const ev=s.events||[];
 const status={};
 for(const x of ev){
  if(x.tf!=='3m'||x.kind!=='NATIVE'||!x.direction)continue;
  const k=x.direction+'|'+x.sourceTs;
  if(x.status==='INTERRUPTED'){delete status[k];continue;}
  if(x.status==='OBSERVED'||x.status==='CONFIRMED')status[k]=x;
 }
 return Object.values(status).filter(e=>now-e.at<=12*60000&&e.at<=now).sort((a,b)=>b.at-a.at)[0]||null;
}
function evaluate(memory,market={}){
 const o=memory&&memory.observation||null,a=memory&&memory.anchor||{},ts=o&&N(o.ts);
 const unknown={version:VERSION,decisionImpact:false,ready:false,direction:null,phase:'NO_DATA',
  hypothesis:'Données insuffisantes pour formuler une opportunité exploitable.',
  evidence:[],contradictions:[],entryKey:null,sourceAt:ts,expectedNetEconomicEdge:'UNPROVEN'};
 if(!o||ts===null||!a.confirmed)return unknown;
 const current=market.marketNow||Date.now();
 if(current-ts>90000)return {...unknown,phase:'STALE_OBSERVATION',sourceAt:ts};
 if(market.dataQuality&&market.dataQuality!=='DATA_OK')
  return {...unknown,phase:'DATA_DEGRADED',sourceAt:ts,
    hypothesis:'MCB non fiable : aucune nouvelle admission.'};
 const slow=a.live&&a.live.observedAt<=ts?a.live:a.confirmed;
 const direction=slow.direction;
 if(!['long','short'].includes(direction))return unknown;
 const e3=latestNative(memory,ts);
 const pm3=delta(memory.samples||[],ts,3),pm5=delta(memory.samples||[],ts,5);
 const sgn=sign(direction),pmLive=N(o.pmLive);
 const quality=o.quality||'UNKNOWN',qualityDirection=o.qualityDirection||null;
 const evidence=[],contradictions=[];
 evidence.push('MCB15 '+(a.live?'Live provisoire':'confirmé')+' '+direction.toUpperCase()+
   ' observé '+new Date(slow.observedAt).toISOString().slice(11,16));
 if(a.live&&a.confirmed.direction!==direction)
  evidence.push('Transition contre E15 confirmé '+a.confirmed.direction.toUpperCase()+' encore actif');
 if(e3&&e3.direction===direction)evidence.push('E3 '+e3.status+' '+direction.toUpperCase()+
   ' observé '+new Date(e3.at).toISOString().slice(11,16));
 else contradictions.push(e3?'E3 actif opposé '+e3.direction.toUpperCase():'E3 tactique récent absent');
 if(pm3!==null&&pm3*sgn>0&&pm5!==null&&pm5*sgn>0)
  evidence.push('PM3 '+pm3+'$ et PM5 '+pm5+'$ traduisent '+direction.toUpperCase());
 else contradictions.push('PM3/PM5 non synchronisés en '+direction.toUpperCase());
 if(pmLive!==null&&pmLive*sgn>0)
  evidence.push('PM Live '+pmLive+'$ : conversion immédiate cohérente');
 else contradictions.push('PM Live actuellement opposé ou insuffisant');
 if(qOK.has(quality)&&qualityDirection===direction)
  evidence.push('Qualité '+quality+' du flux '+direction.toUpperCase());
 else contradictions.push('Qualité '+quality+' non productive dans le camp proposé');
 // Quality is a reading of conversion, NOT an independent vote.
 // It qualifies uncertainty but cannot invent a direction by itself.
 const hardContradictions=contradictions.filter(x=>!x.startsWith('Qualité '));
 const ready=hardContradictions.length===0;
 const key=ready?direction+'|'+slow.sourceTs+'|'+e3.sourceTs:null;
 const phase=ready?'EARLY_EXECUTABLE_HYPOTHESIS':
   e3&&e3.direction===direction?'TRANSLATION_CONTESTED':'WAIT_TACTICAL_CONVERGENCE';
 const hypothesis=ready?
   'Candidat '+direction.toUpperCase()+' : MCB propose, E3 exprime et PM Live/PM3/PM5 convertissent ; fenêtre paper ouverte.':
   'MCB '+direction.toUpperCase()+' proposé ; '+contradictions.join(' ; ')+'.';
 return {version:VERSION,decisionImpact:false,ready,direction,
  phase,sourceAt:ts,slowKind:a.live?'E15_LIVE':'E15_CONFIRMED',slowSourceTs:slow.sourceTs,
  e3SourceTs:e3&&e3.sourceTs||null,e3ObservedAt:e3&&e3.at||null,quality,pm3,pm5,pmLive,entryKey:key,
  evidence,contradictions,hypothesis,expectedNetEconomicEdge:'UNPROVEN',
  note:'Order-independent facts; admission is one experimental paper policy, not demonstrated profitable'};
}
module.exports={VERSION,evaluate,delta,latestNative};
