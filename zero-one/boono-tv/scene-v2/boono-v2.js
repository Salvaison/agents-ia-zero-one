(()=>{
'use strict';
// BOONO-TV scene composition only; the Amsterdam data bridge and risk remain untouched.
const root=document.querySelector('#room');
const robot=document.querySelector('#boonoCharacter');
if(!root||!robot)return;
const q=new URLSearchParams(location.search);
if(q.get('sceneV1')==='1')return;
const base='/assets/boonotv-v2-20261101/';
const framedBase=base+'reframed-20261101/';
let framed=false;
const framedFile=n=>n.replace(/\.png$/, '_1200x1080.png');
const activeAsset=n=>framed?framedBase+framedFile(n):base+n;
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
 node.src=framed?framedBase+src:base+src;return node;
}
function pose(){
 const state=Object.keys(images).find(k=>robot.classList.contains(k))||'working';
 const file=forced||images[state];
 root.style.setProperty('--boono-v2-character','url("'+activeAsset(file)+'")');
 const badge=document.getElementById('boonoV2Label');
 if(badge)badge.textContent='BOONO-TV V2 · '+(forced?'VARIANTE '+variant:state.toUpperCase())+' · SIMULATION / LECTURE SEULE';
}
function mount(){
 image(framed?(q.get('v2Landscape')==='mountain'?'landscape_mountain_1200x1080.png':'landscape_city_1200x1080.png'):(q.get('v2Landscape')==='mountain'?'landscape_mountain_demo.jpg':'loft_reference.png'),'boonoV2Landscape','');
 const cat=image(framed?framedFile(cats[0]):cats[0],'boonoV2Cat','');
 if(!document.getElementById('boonoV2Label')){
  const badge=document.createElement('div');badge.id='boonoV2Label';root.appendChild(badge);
 }
 root.classList.add('boono-v2');
 if(framed)root.classList.add('boono-reframed');
 let catNum=hasForcedCat?forcedCat:1;
 function showCat(){cat.style.display=catNum?'block':'none';if(catNum)cat.src=activeAsset(cats[catNum-1])}
 showCat();
 if(!hasForcedCat)setInterval(()=>{catNum=catNum%5+1;showCat()},180000);
 pose();
 const watch=new MutationObserver(pose);
 watch.observe(robot,{attributes:true,attributeFilter:['class']});
}
async function preload(names,prefix){
 await Promise.all(names.map(f=>new Promise((ok,fail)=>{
  const image=new Image();
  image.onload=ok;image.onerror=()=>fail(new Error('image missing: '+f));
  image.src=prefix+f;
 })));
}
async function initialize(){
 const r=await fetch(base+'manifest.json',{cache:'no-store'});
 if(!r.ok)throw Error('Original image pack missing');
 const old=await r.json();
 if(old.release!=='BOONOTV-v2-artwork-2026-11-01')throw Error('Unrecognized original manifest');
 const originals=['loft_reference.png','loft_north_rgba.png','desk_canonical_alpha.png',...Object.values(images),...cats];
 if(!originals.every(f=>old.files?.[f]))throw Error('Original manifest incomplete');
 if(q.get('reframeV1')==='1'){await preload(originals,base);mount();return;}
 try{
  const fr=await fetch(framedBase+'manifest.json',{cache:'no-store'});
  if(!fr.ok)throw Error('Reframed images missing');
  const m=await fr.json();
  if(m.release!=='BOONOTV-V2-REFRAMED-20261101')throw Error('Reframe manifest version mismatch');
  const required=['loft_north_1200x1080.png','landscape_city_1200x1080.png',
    'desk_1200x1080.png',...variants.map(framedFile),...cats.map(framedFile)];
  if(!required.every(f=>m.files?.[f]))throw Error('Reframe manifest incomplete');
  await preload(required,framedBase);
  framed=true;
 }catch(e){
  root.dataset.boonoReframeError=String(e.message||e);
  await preload(originals,base);
 }
 mount();
}
initialize().catch(e=>{root.dataset.boonoV2Error=String(e.message||e);});
})();
