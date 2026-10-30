'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
  fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ui=require('../../modules/attention/v494-elastic-ui-summary');
const config=fs.readFileSync(path.resolve(__dirname,'../../modules/config-server.js'),'utf8');
const at=1793368800000;
function example(){
 return {version:ui.SOURCE,mode:'SHADOW_ONLY',brokerOrdersEnabled:false,
  decisionImpact:false,startedAt:at-3600000,asOf:at,observations:45,
  stage:'OBSERVING_FRESH_V494',price:79900,
  current:{quality:'EASY',direction:'long',marketState:'DIRECTIONAL',
    travelState:'EASY_TRAVEL',phaseHypothesis:'RETAINING',yieldVsP75:1.5,
    effortVsP75:.5,flowBtcPerSec:.7},
  range2h:{valid:true,low:79000,high:81000,positionFraction:.45},
  activePositionComparison:{direction:'FLAT'},
  fourByFifteen:Array.from({length:4},(_,i)=>({startAt:at-(3-i)*900000,
    samples:30,coverageFraction:1,qualityCoverageFraction:1,
    qualityFractions:{EASY:1},directionFractions:{long:1},
    marketFractions:{DIRECTIONAL:1},travelFractions:{EASY_TRAVEL:1},
    phaseFractions:{RETAINING:1},meanEffortVsP75:.5,meanYieldVsP75:1.5,
    meanFlowBtcPerSec:.7,meanCadence:19,priceMoveUsd:20,
    priceRetainedFraction:.75})),
  hourRegime:{classification:'PERSISTENT_LONG',coverageFraction:1,
    qualityCoverageFraction:1,directionFractions:{long:1},
    productiveShare:1,sterileShare:0,easyShare:1,strongShare:0},
  corroboration:[{kind:'EASY_TO_CONTESTED_AT_EXTREME',
    alignment:'REGIME_OPPOSED',seen:2,matured15:1,positive15:0,
    mean15Usd:-12}],
  totals:{QUALITY_CONFIRMED_EASY:{seen:5,matured5:3,positive5:2,matured15:2,
    positive15:1,matured30:0,positive30:0,censored:0}},
  recentEvents:[{id:1,kind:'EASY_TO_CONTESTED_AT_EXTREME',
    at,price:79900,direction:'short',phase:'CONFIRMED',
    tickerAtEvent:{regime:'PERSISTENT_LONG',
      corroboration:'REGIME_OPPOSED',coverageFraction:1},
    horizons:{},horizon15:{status:'MEASURED',signedUsd:-12,mfeUsd:15,maeUsd:32}}]
 };
}
function domRender(source){
 const begin=config.indexOf('function elastic494EventLabel(kind){'),
  end=config.indexOf('let v494ElasticShadowPending=false;',begin);
 assert.ok(begin>=0&&end>begin);
 const root={innerHTML:'',querySelectorAll(){return[];}};
 const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
 const fmt=(x,n=1)=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':
  Number(x).toFixed(n);
 const ctx={document:{getElementById:id=>id==='shadowV494Elastic'?root:null},
    escTrade:esc,shadowFmt:fmt,v494DualFmt:fmt,
    shadowDateTime:v=>new Date(v).toISOString().slice(5,16),
    shadowStat:(v,label)=>'<div>'+esc(v)+' '+esc(label)+'</div>',
    shadowKv:rows=>rows.map(([k,v])=>'<span>'+esc(k)+': '+esc(v)+'</span>').join('')};
 vm.runInNewContext(config.slice(begin,end),ctx,{timeout:1000});
 vm.runInNewContext('renderV494ElasticShadow(globalPayload)',{...ctx,globalPayload:source},
  {timeout:1000});
 return root.innerHTML;
}
test('UI payload contains 4 distinct state dimensions and as-of corroboration, remains bounded',()=>{
 const out=ui.build(example(),at+1000);
 assert.equal(out.brokerOrdersEnabled,false);
 assert.equal(out.hourlyRegime.classification,'PERSISTENT_LONG');
 assert.equal(out.current.travelState,'EASY_TRAVEL');
 assert.equal(out.current.marketState,'DIRECTIONAL');
 assert.equal(out.current.phaseHypothesis,'RETAINING');
 assert.equal(out.quality4x15.length,4);
 assert.equal(out.quality4x15[0].marketFractions.DIRECTIONAL,1);
 assert.equal(out.quality4x15[0].travelFractions.EASY_TRAVEL,1);
 assert.equal(out.recentEvents[0].tickerAtEvent.corroboration,'REGIME_OPPOSED');
 assert.ok(Buffer.byteLength(JSON.stringify(out))<32*1024);
});
test('HTML renders ticker always visible and shows corroboration without trade policy',()=>{
 const result=domRender(ui.build(example(),at+1000));
 assert.match(result,/TICKER MÉMOIRE/);
 assert.match(result,/PERSISTENT_LONG/);
 assert.match(result,/Régime marché/);
 assert.match(result,/HIGH_EFFORT_LOW_YIELD|EASY_TRAVEL/);
 assert.match(result,/Corroboration ticker/);
 assert.match(result,/aucun veto/i);
});
test('Hostile research event text is HTML escaped before rendering',()=>{
 const raw=example();
 raw.recentEvents[0].kind='<img src=x onerror=alert(1)>';
 raw.current.marketState='<svg onload=alert(1)>';
 raw.fourByFifteen[0].qualityFractions={'<script>alert(1)</script>':1};
 const text=domRender(ui.build(raw,at+1000));
 assert.doesNotMatch(text,/<img src=x/);
 assert.doesNotMatch(text,/<svg onload/);
 assert.doesNotMatch(text,/<script>alert/);
 assert.match(text,/&lt;img/);
});
test('Rejects forged authority or excessive future timestamp',()=>{
 const raw=example();
 assert.throws(()=>ui.build({...raw,decisionImpact:true},at+1000),/UNTRUSTED/);
 assert.throws(()=>ui.build({...raw,asOf:at+300000},at),/INVALID_ASOF/);
 assert.throws(()=>ui.build({...raw,brokerOrdersEnabled:true},at),/UNTRUSTED/);
});
test('UI route is authenticated and loads only a small summary on demand',()=>{
 assert.match(config,/app\.get\('\/api\/shadows\/v494-elastic',requireAuth/);
 assert.match(config,/v494-elastic-shadow-summary\.json/);
 assert.match(config,/if\(fs\.statSync\(file\)\.size>256\*1024\)/);
 assert.match(config,/loadV494ElasticShadow\(\)/);
 assert.doesNotMatch(config.slice(config.indexOf("app.get('/api/shadows/v494-elastic'"),
   config.indexOf('// V494 entry/exit laboratory:')),/audit-history|elastic-observer-events|v494-paper-state/);
});
