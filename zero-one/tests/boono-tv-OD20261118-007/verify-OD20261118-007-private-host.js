'use strict';
const assert=require('assert/strict');
const allow=require('/home/ubuntu/boono-tv-studio/runtime/boono-tv/private-preview-access.js');
function req(remote,host,hostname=host.split(':')[0]){
 return {socket:{remoteAddress:remote},hostname,get:name=>name.toLowerCase()==='host'?host:''};
}
for(const [remote,host,expected] of [
 ['127.0.0.1','127.0.0.1:3091',true],
 ['::1','localhost:3091',true],
 ['127.0.0.1','100.115.92.26:8310',true],
 ['::ffff:127.0.0.1','100.115.92.27:8310',true],
 ['127.0.0.1','100.115.92.26:3091',false],
 ['127.0.0.1','100.115.92.999:8310',false],
 ['127.0.0.1','123.45.67.89:8310',false],
 ['127.0.0.1','example.com:8310',false],
 ['192.168.1.9','100.115.92.26:8310',false],
 ['192.168.1.9','localhost:3091',false]
]){
 const actual=allow(req(remote,host));
 assert.equal(actual,expected,`${remote} -> ${host}: ${actual} expected ${expected}`);
}
console.log('PASS: private host guard (10 positive/negative cases)');
