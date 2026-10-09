'use strict';
const {buildHourlyReport,renderEvidenceBrief}=require('./mw-hourly-report');
function arg(k){const i=process.argv.indexOf(k);return i>=0?process.argv[i+1]:null;}
let start=arg('--start'),end=arg('--end');
if(!start||!end){
  const h=Number(arg('--hours')||1),now=Date.now(),floor=Math.floor(now/3600000)*3600000;
  end=floor;start=end-h*3600000;
}else{start=Date.parse(start);end=Date.parse(end);}
const report=buildHourlyReport(Number(start),Number(end));
process.stdout.write(process.argv.includes('--brief')?renderEvidenceBrief(report)+'\n':JSON.stringify(report,null,2)+'\n');
