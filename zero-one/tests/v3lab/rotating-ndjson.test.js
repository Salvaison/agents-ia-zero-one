'use strict';
const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const store=require('../../modules/v3lab/storage/rotating-ndjson');

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boono-v3-rot-'));
try{
  const p=path.join(dir,'events.ndjson');
  for(let i=0;i<60;i++){
    store.appendRotatingNdjson(p,{ts:new Date(1_700_000_000_000+i*1000).toISOString(),i,payload:'x'.repeat(140)},{maxBytes:1200,maxSegments:3});
  }
  const segs=store.listSegments(p);
  assert.ok(segs.length<=3);
  assert.ok(fs.statSync(p).size<=1200);
  const recent=store.readRecentNdjson(p,8);
  assert.equal(recent.length,8);
  assert.equal(recent[0].i,52);
  assert.equal(recent[7].i,59);
  const since=store.readNdjsonSince(p,1_700_000_055_000);
  assert.deepEqual(since.map(x=>x.i),[55,56,57,58,59]);
  for(const f of [p,...segs]){
    const lines=fs.readFileSync(f,'utf8').split(/\r?\n/).filter(Boolean);
    for(const line of lines)assert.doesNotThrow(()=>JSON.parse(line));
  }
  console.log('rotating-ndjson.test.js OK');
}finally{
  fs.rmSync(dir,{recursive:true,force:true});
}
