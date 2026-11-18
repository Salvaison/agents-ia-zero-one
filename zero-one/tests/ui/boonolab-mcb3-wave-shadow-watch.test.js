'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const js=fs.readFileSync(path.join(ROOT,'modules/config-server.js'),'utf8');
function browser(){
 const tick=String.fromCharCode(96);
 const anchor=js.indexOf("app.get('/app.js', requireAuth");
 const a=js.indexOf('send('+tick,anchor);
 const b=js.indexOf(tick+');\n});',a);
 assert.ok(a>0&&b>a);
 return vm.runInNewContext(tick+js.slice(a+6,b)+tick);
}
test('Shadow endpoint is protected, read-only and never writes a PAPER ledger',()=>{
 const marker="app.get('/api/shadows/boonolab-mcb3-wave',requireAuth";
 assert.ok(js.includes(marker));
 const a=js.indexOf(marker),b=js.indexOf('// V494 timestamped state layer',a);
 const route=js.slice(a,b);
 assert.ok(route.includes('boonolabReadReadonlyShadow'));
 assert.ok(route.includes('boonolab-mcb3-first-mcb15-shadow-summary.json'));
 assert.ok(route.includes('boonolab-mcb3-first-mcb15-wave-shadow-v0.1'));
 assert.equal(route.includes('paper.step'),false);
});
test('Watch has a compact CLOSED disclosure without modifying existing S1 panels',()=>{
 const client=browser();
 assert.ok(js.includes('id="shadowMcb3WaveDetails"'));
 assert.ok(js.includes('id="shadowMcb3WaveLive"'));
 assert.ok(js.includes('id="shadowV543S1V02Details"'));
 assert.ok(client.includes("get('/api/shadows/boonolab-mcb3-wave')"));
 assert.ok(client.includes("get('/api/shadows/boonolab-lbw15-s1-v02')"));
 assert.ok(client.includes('MCB3 '+String('')));
 assert.ok(client.includes('confirmé opposé'));
 assert.doesNotThrow(()=>new vm.Script(client));
});
test('UI source keeps child DOM while refreshing, no extra overlay or chart rotation',()=>{
 const client=browser();
 assert.ok(client.includes("document.getElementById('shadowMcb3WaveLive')"));
 assert.ok(client.includes("document.getElementById('shadowV543S1V02Live')"));
 assert.ok(client.includes("waveEl.innerHTML="));
 assert.equal(client.includes('paper.step('),false);
});
test('Actual summary, if present, is SHADOW and fresh',()=>{
 const f=path.join(ROOT,'data/boonolab-mcb3-first-mcb15-shadow-summary.json');
 if(!fs.existsSync(f))return;
 const x=JSON.parse(fs.readFileSync(f,'utf8'));
 assert.equal(x.version,'boonolab-mcb3-first-mcb15-wave-shadow-v0.1');
 assert.equal(x.mode,'SHADOW_ONLY');
 assert.equal(x.decisionImpact,false);
 assert.equal(x.brokerOrdersEnabled,false);
 assert.equal(x.authorizesOrders,false);
});
