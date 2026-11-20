'use strict';
// Historical Bâton snapshots outlive the rolling 24h audit-history.json.
// Reconstruct only rows that existed as of the requested timestamp.
// Test/replay input ONLY; no live PAPER state or future evidence.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=path.resolve(__dirname,'../..');
let all=null;
function archive(){
 if(all)return all;
 const dir=path.join(ROOT,'data/audit-14d'),found=new Map();
 for(const name of fs.readdirSync(dir).filter(n=>
  /^audit-202611(18|19|20)T\d\d\.ndjson(\.gz)?$/.test(n))){
  const buff=fs.readFileSync(path.join(dir,name));
  const raw=name.endsWith('.gz')?zlib.gunzipSync(buff).toString():
   buff.toString();
  for(const line of raw.split('\n')){
   try{
    const x=JSON.parse(line);
    if(Number.isFinite(x.ts)&&Number.isFinite(x.lastPrice))
     found.set(x.ts,x);
   }catch(_){}
  }
 }
 // Live Bâton may be halfway through a JSON rewrite: historical hourly
 // archives are sufficient for the early 19/20 November replay.
 let live=[];
 try{live=JSON.parse(fs.readFileSync(path.join(ROOT,'data/audit-history.json')));}
 catch(e){if(!(e instanceof SyntaxError))throw e;}
 for(const x of live)found.set(x.ts,x);
 all=[...found.values()].sort((a,b)=>a.ts-b.ts);
 return all;
}
function load(source,asOf){
 const input=source.load(asOf),
  sample=archive().filter(x=>x.ts<=asOf).slice(-1000);
 input.samples=sample;input.current=sample.at(-1)||null;
 input.healthy=!!input.current&&asOf-input.current.ts>=0&&
  asOf-input.current.ts<=65000&&
  input.bars.m3.length>=8&&input.bars.m15.length>=5;
 return input;
}
module.exports={load,archive};
