(()=>{
'use strict';
// BOONO-TV scene composition only; the Amsterdam data bridge and risk remain untouched.
const root=document.querySelector('#room');
const robot=document.querySelector('#boonoCharacter');
if(!root||!robot)return;
const q=new URLSearchParams(location.search);
if(q.get('sceneV1')==='1')return;
const base='/assets/boonotv-v2-20261101/';
const images={
 working:'boono_01_concentrated.png',
 thinking:'boono_02_thinking_left.png',
 worried:'boono_06_pause_right.png',
 concentrated:'boono_08_verify_left.png',
 confident:'boono_07_idea.png',
 observe:'boono_05_observe_right.png',
 execute:'boono_03_right_finger_left_screen.png'
};
const variants=['boono_01_concentrated.png','boono_02_thinking_left.png','boono_03_right_finger_left_screen.png','boono_04_left_open_hand.png','boono_05_observe_right.png','boono_06_pause_right.png','boono_07_idea.png','boono_08_verify_left.png','boono_09_window.png','boono_10_relaxed.png'];
const cats=['cat_01_observe.png','cat_02_joue.png','cat_03_ruse.png','cat_04_toilette.png','cat_05_surveille.png'];
const variant=Number(q.get('v2Pose'));
const forced=Number.isInteger(variant)&&variant>=1&&variant<=10?variants[variant-1]:null;
const forcedCat=Number(q.get('v2Cat'));
const hasForcedCat=q.has('v2Cat')&&Number.isInteger(forcedCat)&&forcedCat>=0&&forcedCat<=5;
function image(src,id,alt){
 let node=document.getElementById(id);
 if(!node){node=document.createElement('img');node.id=id;node.setAttribute('alt',alt);node.setAttribute('aria-hidden','true');root.insertBefore(node,root.firstChild)}
 node.src=base+src;return node;
}
function pose(){
 const state=Object.keys(images).find(k=>robot.classList.contains(k))||'working';
 const file=forced||images[state];
 root.style.setProperty('--boono-v2-character','url("'+base+file+'")');
 const badge=document.getElementById('boonoV2Label');
 if(badge)badge.textContent='BOONO-TV V2 · '+(forced?'VARIANTE '+variant:state.toUpperCase())+' · SIMULATION / LECTURE SEULE';
}
function mount(){
 image(q.get('v2Landscape')==='mountain'?'landscape_mountain_demo.jpg':'loft_reference.png','boonoV2Landscape','');
 const cat=image(cats[0],'boonoV2Cat','');
 if(!document.getElementById('boonoV2Label')){
  const badge=document.createElement('div');badge.id='boonoV2Label';root.appendChild(badge);
 }
 root.classList.add('boono-v2');
 let catNum=hasForcedCat?forcedCat:1;
 function showCat(){cat.style.display=catNum?'block':'none';if(catNum)cat.src=base+cats[catNum-1]}
 showCat();
 if(!hasForcedCat)setInterval(()=>{catNum=catNum%5+1;showCat()},180000);
 pose();
 const watch=new MutationObserver(pose);
 watch.observe(robot,{attributes:true,attributeFilter:['class']});
}
fetch(base+'manifest.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error('assets absent')))
.then(m=>{
 if(m.release!=='BOONOTV-v2-artwork-2026-11-01')throw Error('incorrect version');
 const required=['loft_reference.png','loft_north_rgba.png','desk_canonical_alpha.png',...Object.values(images),...cats];
 if(!required.every(f=>m.files?.[f]))throw Error('incomplete asset manifest');
 return Promise.all(required.map(f=>new Promise((ok,fail)=>{const a=new Image();a.onload=ok;a.onerror=()=>fail(new Error(f));a.src=base+f})));
}).then(mount).catch(e=>{root.dataset.boonoV2Error=String(e.message||e);});
})();
