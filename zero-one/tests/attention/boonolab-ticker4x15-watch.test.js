'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const src=fs.readFileSync(path.join(ROOT,'modules/config-server.js'),'utf8');
const provider=fs.readFileSync(path.join(ROOT,'modules/attention/boonolab-ticker4x15-volume-1m.js'),'utf8');
const runner=fs.readFileSync(path.join(ROOT,'modules/attention/boonolab-ticker4x15-runner.js'),'utf8');
function client(){
 const tick=String.fromCharCode(96);
 const i=src.indexOf("app.get('/app.js', requireAuth");
 const a=src.indexOf('send('+tick,i),b=src.indexOf(tick+');\n});',a);
 assert.ok(a>0&&b>a);
 return vm.runInNewContext(tick+src.slice(a+6,b)+tick);
}
test('Watch 4x15 fetches independent route, while archived V494 route remains separate',()=>{
 const js=client();
 const mini=js.slice(js.indexOf('async function loadMiniTicker4x15(){'),
   js.indexOf('let v52Pending=',js.indexOf('async function loadMiniTicker4x15(){')));
 assert.ok(mini.includes("fetch('/api/shadows/boonolab-ticker4x15'"));
 assert.ok(!mini.includes("fetch('/api/shadows/v494-elastic'"));
 assert.ok(js.includes('TICKER 4×15 BOONOLAB INDÉPENDANT'));
 assert.ok(src.includes("app.get('/api/shadows/boonolab-ticker4x15',requireAuth"));
 assert.ok(src.includes("app.get('/api/shadows/v494-elastic',requireAuth"));
});
test('independent route requires SHADOW contract and never imports or reads V494 PAPER',()=>{
 const start=src.indexOf("app.get('/api/shadows/boonolab-ticker4x15'");
 const end=src.indexOf('// Independent Elastic v494 follow-up lab',start);
 assert.ok(start>=0&&end>start);
 const code=src.slice(start,end);
 assert.ok(code.includes("raw.version!=='boonolab-ticker4x15-independent-v1'"));
 assert.ok(code.includes("raw.mode!=='SHADOW_ONLY'"));
 assert.ok(code.includes("raw.brokerOrdersEnabled!==false"));
 assert.ok(code.includes("raw.decisionImpact!==false"));
 assert.ok(code.includes('independentTickerVolumeProvider.get('));
 assert.ok(!code.includes('v494-paper-state'));
 assert.ok(!code.includes('v52-paper-state'));
 assert.ok(!code.includes('v55-paper-state'));
 for(const p of [provider,runner]){
  assert.ok(!p.includes("require('../v5/paper"));
  assert.ok(!p.includes('v494-paper-state.json'));
  assert.ok(!p.includes('v52-paper-state.json'));
  assert.ok(!p.includes('v55-paper-state.json'));
 }
});
test('OKX BTC/min and graphic volume percentage stay separate from quality fractions',()=>{
 const js=client();
 assert.ok(js.includes('sourceVolume?.source==='));
 assert.ok(js.includes("measurement?.meanBtcPerMinute"));
 assert.ok(js.includes("measurement?.meanGraphVolumePct"));
 assert.ok(js.includes("b.qualityFractions"));
 assert.ok(js.includes("b.directionFractions"));
 assert.ok(js.includes("b.marketFractions"));
 assert.ok(js.includes("sourceVolume?.decisionImpact===false"));
 assert.ok(js.includes("sourceVolume?.brokerOrdersEnabled===false"));
});
test('UI browser code remains valid after endpoint switch',()=>{
 assert.doesNotThrow(()=>new vm.Script(client()));
});

test('authenticated read-only route serves 4 genuine windows and preserves API volume metadata',async()=>{
 const start=src.indexOf("app.get('/api/shadows/boonolab-ticker4x15'");
 const end=src.indexOf('// Independent Elastic v494 follow-up lab',start);
 assert.ok(start>=0&&end>start);
 const register={},v={fs,path,__dirname:path.join(ROOT,'modules'),
  Date,Number,Math,JSON,Error,
  app:{get:(url,auth,fn)=>{register[url]=fn}},
  requireAuth:()=>{},
  independentTickerVolumeProvider:{get:async(windows,asOf)=>({
    source:'OKX_BTC_USDT_SWAP_CLOSED_1M_VOLCCY',
    mode:'SHADOW_ONLY',decisionImpact:false,brokerOrdersEnabled:false,
    status:'OK',windows:windows.map(w=>({
      startAt:w.startAt,meanBtcPerMinute:12.4,
      meanGraphVolumePct:60,observedMinutes:15,expectedMinutes:15,
      sourceStatus:'OK',status:'COVERED'
    }))
  })},
  independentTickerVolume1m:{SOURCE:'OKX_BTC_USDT_SWAP_CLOSED_1M_VOLCCY'},
  sendUiJson:(_req,res,payload)=>{res.payload=payload;return res}
 };
 vm.createContext(v);vm.runInContext(src.slice(start,end),v);
 const handler=register['/api/shadows/boonolab-ticker4x15'];
 assert.equal(typeof handler,'function');
 const response={code:200,status(x){this.code=x;return this},
  set(){return this},json(x){this.payload=x;return this}};
 await handler({},response);
 assert.equal(response.code,200,JSON.stringify(response.payload));
 assert.equal(response.payload.mode,'SHADOW_ONLY');
 assert.equal(response.payload.brokerOrdersEnabled,false);
 assert.equal(response.payload.quality4x15.length,4);
 assert.equal(response.payload.volume4x15.windows.length,4);
 assert.equal(response.payload.volume4x15.windows[0].meanBtcPerMinute,12.4);
});

test('actual Watch 4x15 renderer shows all four independent rows with OKX 1m volume',()=>{
 const js=client();
 const start=js.indexOf('function renderMiniTicker4x15(packet){');
 const end=js.indexOf('async function loadMiniTicker4x15(){',start);
 assert.ok(start>=0&&end>start);
 const root={innerHTML:'',title:''};
 const ctx={document:{getElementById:id=>id==='v52-mini-ticker'?root:null},
  escTrade:x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
  Date,Math,Number,String,Object,Array,Map,Intl};
 vm.createContext(ctx);
 vm.runInContext(js.slice(start,end),ctx);
 const at=Date.now()-20000,nowQuarter=Math.floor(at/900000)*900000;
 const quarters=Array.from({length:4},(_,i)=>nowQuarter-(3-i)*900000);
 const input={mode:'SHADOW_ONLY',decisionImpact:false,brokerOrdersEnabled:false,
  asOf:at,status:'DATA_RECENT',quality4x15:quarters.map(startAt=>({
   startAt,samples:30,coverageFraction:.98,
   qualityFractions:{EASY:.3,INEFFICIENT:.4,SILENT:.3},
   directionFractions:{long:.25,short:.60,contested:.15},
   marketFractions:{DIRECTIONNEL_PRODUCTIF:.7,STERILE_HESITANT:.3}
  })),
  volume4x15:{source:'OKX_BTC_USDT_SWAP_CLOSED_1M_VOLCCY',status:'OK',
   decisionImpact:false,brokerOrdersEnabled:false,
   windows:quarters.map(startAt=>({
    startAt,meanBtcPerMinute:55.5,meanGraphVolumePct:70,
    observedMinutes:15,expectedMinutes:15,
    sourceStatus:'OK',status:'COVERED'
   }))}
 };
 ctx.renderMiniTicker4x15(input);
 assert.equal((root.innerHTML.match(/class="v52-ticker-card"/g)||[]).length,4);
 assert.equal((root.innerHTML.match(/Vol moy: 70%/g)||[]).length,4);
 assert.ok(root.innerHTML.includes('LONG 25 %'));
 assert.ok(root.innerHTML.includes('SHORT 60 %'));
 assert.ok(root.innerHTML.includes('CONTESTED 15 %'));
 assert.ok(root.title.includes('BOONOLAB INDÉPENDANT'));
 assert.ok(!root.title.includes('V494'));
});
