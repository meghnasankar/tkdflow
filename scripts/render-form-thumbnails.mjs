/* Browser-only offline thumbnail compositor. See docs/form-thumbnails.md. */
import * as THREE from '/vendor/three/three.module.js';
import {createAvatar} from '/js/animation/avatar.js';
import {createLights} from '/js/animation/stage.js';
import {createFormMotion} from '/js/animation/form-motion.js';
import * as original from '/js/animation/taegeuk-1-motion.js';

const palettes = {
 sky:['#e9f2f8','#cfdfec','#567792'], lake:['#e8f4f3','#cbdeda','#52858b'],
 fire:['#fcf0e5','#f2d8c4','#b67c53'], thunder:['#eef0f8','#d7dbe9','#797ba3'],
 wind:['#edf4ed','#d5e3d5','#789079'], water:['#e8f3f7','#cbdfe7','#5a869b'],
 mountain:['#edf1ef','#d2ded8','#768d80'], earth:['#f4efe5','#e4d9c6','#958263'],
 scholar:['#edf0f5','#d3dce7','#6c809c'], diamond:['#edf3f7','#d1e1e9','#6b8fa3'],
 dawn:['#fbefe5','#dfdce5','#ac8d81'], plain:['#f1f4e9','#d8dfcb','#879771'],
 stone:['#f2f0ed','#dad8d1','#8f8c7d'], soil:['#f7efe8','#e4d7cb','#a08c79'],
 horizon:['#edf3f5','#dedfd8','#7c949d'], forest:['#ecf3ed','#cbdccf','#6f8c78'],
 paper:['#f6f0e8','#e1d8c9','#a09682'], lotus:['#f1edf5','#ddd4e7','#9785a4'],
 ink:['#edf1f3','#d2dce2','#7d8c97'], resolve:['#f5edef','#e0d2d7','#a0808e'],
 pine:['#edf3ed','#d1dfd1','#78937d'], 'pine-sun':['#f7f1e4','#dfdfcb','#929572'],
 'pine-stone':['#edf1ed','#d5dbd1','#8b9784'],
};
const W=960,H=540;
function background(ctx, spec) {
 const [light,shade,accent]=palettes[spec.theme];
 const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,light);g.addColorStop(1,shade);
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // Broad translucent motifs stay behind the character and never depict a form's floor path.
 ctx.save();ctx.strokeStyle=accent;ctx.fillStyle=accent;ctx.lineWidth=2;ctx.globalAlpha=.11;
 const t=spec.theme;
 if(['lake','water','wind','plain'].includes(t)) {
  for(let n=0;n<7;n++){ctx.beginPath();ctx.moveTo(290,280+n*38);ctx.bezierCurveTo(520,180+n*40,650,370+n*30,1020,260+n*38);ctx.stroke();}
 } else if(['mountain','diamond','dawn','stone','soil','earth','pine-stone'].includes(t)) {
  for(let n=0;n<3;n++){ctx.beginPath();ctx.moveTo(340+n*120,540);ctx.lineTo(600+n*95,170+n*50);ctx.lineTo(1060+n*60,540);ctx.closePath();ctx.fill();}
 } else if(['forest','pine','pine-sun'].includes(t)) {
  for(let n=0;n<3;n++){const x=540+n*180;ctx.beginPath();ctx.moveTo(x,165+n*35);ctx.lineTo(x-130,440);ctx.lineTo(x+130,440);ctx.closePath();ctx.fill();ctx.fillRect(x-3,420,6,120);}
 } else if(t==='lotus') {
  for(let n=0;n<5;n++){ctx.beginPath();ctx.ellipse(660,410,80,220,(n-2)*.45,0,Math.PI*2);ctx.stroke();}
 } else if(t==='thunder') {
  for(let n=0;n<3;n++){ctx.beginPath();ctx.moveTo(420+n*200,90);ctx.bezierCurveTo(520+n*200,50,600+n*200,130,660+n*200,95);ctx.stroke();}
 } else if(['paper','scholar','ink','resolve'].includes(t)) {
  for(let n=0;n<4;n++){ctx.lineWidth=15-n*3;ctx.beginPath();ctx.moveTo(450+n*110,80);ctx.bezierCurveTo(350+n*130,240,700+n*20,330,580+n*110,550);ctx.stroke();}
 } else {
  ctx.beginPath();ctx.arc(700,250,t==='fire'?185:215,0,Math.PI*2);ctx.fill();
  if(t==='sky')for(let n=0;n<9;n++){const a=n*Math.PI/8;ctx.beginPath();ctx.moveTo(700+230*Math.cos(a),250+230*Math.sin(a));ctx.lineTo(700+360*Math.cos(a),250+360*Math.sin(a));ctx.stroke();}
 }
 ctx.restore();
 // Quiet grounding shadow, separate from the unmodified source rig.
 const shadow=ctx.createRadialGradient(672,494,3,672,494,210);shadow.addColorStop(0,'rgba(21,42,57,.12)');shadow.addColorStop(1,'rgba(21,42,57,0)');
 ctx.save();ctx.translate(0,403);ctx.scale(1,.18);ctx.fillStyle=shadow;ctx.fillRect(420,-100,500,1100);ctx.restore();
 ctx.fillStyle='#415667';ctx.font='600 21px system-ui, sans-serif';ctx.fillText(spec.series,48,66);
 ctx.fillStyle='#112b40';
 if(spec.trigram){
  ctx.font='600 100px system-ui, sans-serif';ctx.fillText(String(spec.number).padStart(2,'0'),45,184);
  const y=236;ctx.lineWidth=13;ctx.strokeStyle='#29465d';ctx.lineCap='butt';
  [...spec.trigram].forEach((bit,i)=>{ctx.beginPath();ctx.moveTo(51,y+i*32);ctx.lineTo(bit==='1'?213:118,y+i*32);if(bit==='0'){ctx.moveTo(146,y+i*32);ctx.lineTo(213,y+i*32);}ctx.stroke();});
 }else{
  const label=spec.number?String(spec.number).padStart(2,'0'):spec.name;
  ctx.font=`600 ${spec.number?100:48}px system-ui, sans-serif`;
  ctx.fillText(label,45,186,355);
  ctx.fillStyle=accent;ctx.fillRect(49,223,72,5);
 }
 ctx.fillStyle='#415667';ctx.font='400 22px system-ui, sans-serif';
 const words=spec.meaning.split(' ');let line='',y=365;
 for(const word of words){if(ctx.measureText(line+' '+word).width>300&&line){ctx.fillText(line,49,y);line=word;y+=31;}else line+=(line?' ':'')+word;}
 ctx.fillText(line,49,y);
 ctx.fillStyle='#667b89';ctx.font='500 17px system-ui, sans-serif';ctx.fillText('TKDFLOW',49,492);
}
function poseSignature(p){return JSON.stringify({pelvis:p.pelvis,yaw:p.yaw,chestYaw:p.chestYaw,arms:p.arms,legs:p.legs},(_,v)=>typeof v==='number'?Math.round(v*1e6)/1e6:v);}
async function sha(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function main(){
 const manifest=await (await fetch('/data/form-thumbnails.json')).json();
 const canvas=document.createElement('canvas');
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});
 renderer.setSize(1080,1000,false);renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 const scene=new THREE.Scene(),lighting=new THREE.Group();createLights(lighting);scene.add(lighting);
 let resolveReady,rejectReady;const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
 const actor=createAvatar({onReady:resolveReady,onError:rejectReady});scene.add(actor.root);await ready;
 const camera=new THREE.PerspectiveCamera(30,1.08,.1,30);
 for(const spec of manifest.files){
  const motion=spec.id==='taegeuk-1'?original:createFormMotion(await (await fetch(`/data/lessons/${spec.id}.json`)).json());
  const p=motion.poseAtIndex(spec.poseIndex),poseHash=await sha(poseSignature(p));
  if(poseHash!==spec.sourcePoseSha256)throw Error('Source pose differs: '+spec.id);
  actor.applyPose(p);actor.root.position.set(-p.pelvis[0],0,-p.pelvis[2]);actor.root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(actor.root,true),target=box.getCenter(new THREE.Vector3());
  const angle=((p.chestYaw??p.yaw)+spec.cameraAngle)*Math.PI/180;
  const back=new THREE.Vector3(Math.sin(angle),.12,Math.cos(angle)).normalize();
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),back).normalize(),up=new THREE.Vector3().crossVectors(back,right);
  let distance=1;const tan=Math.tan(Math.PI/12);
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   const v=new THREE.Vector3(x,y,z).sub(target),d=v.dot(back);
   distance=Math.max(distance,(Math.abs(v.dot(up))+.07)/tan+d,(Math.abs(v.dot(right))+.07)/(tan*camera.aspect)+d);
  }
  camera.position.copy(target).addScaledVector(back,distance*1.025);camera.lookAt(target);
  lighting.rotation.y=(p.chestYaw??p.yaw)*Math.PI/180;
  renderer.render(scene,camera);
  const check=document.createElement('canvas');check.width=1080;check.height=1000;const cc=check.getContext('2d');cc.drawImage(canvas,0,0);
  const pixels=cc.getImageData(0,0,1080,1000).data;let left=1080,rightPx=0,top=1000,bottom=0,count=0;
  for(let y=0;y<1000;y++)for(let x=0;x<1080;x++)if(pixels[(y*1080+x)*4+3]>30){left=Math.min(left,x);rightPx=Math.max(rightPx,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;}
  if(count<10000||left<8||rightPx>1071||top<8||bottom>991)throw Error('Clipped or blank actor: '+spec.id);
  const output=document.createElement('canvas');output.width=W;output.height=H;const ctx=output.getContext('2d');
  background(ctx,spec);ctx.drawImage(canvas,400,20,540,500);
  const card=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');
  image.alt=spec.alt;image.width=W;image.height=H;image.src=output.toDataURL('image/webp',.9);
  image.dataset.id=spec.id;image.dataset.proof=JSON.stringify({id:spec.id,poseHash,alphaBounds:{left,right:rightPx,top,bottom,count},cameraAngle:spec.cameraAngle});
  caption.textContent=`${spec.name} · ${spec.poseNumber}: ${spec.poseName}`;card.append(image,caption);document.querySelector('main').append(card);
  document.querySelector('#status').textContent=`Rendered ${document.querySelectorAll('figure').length} of 23`;
  await new Promise(requestAnimationFrame);
 }
 renderer.dispose();document.body.dataset.ready='true';document.querySelector('#status').textContent='All 23 exact source poses rendered';
}
main().catch(error=>{document.body.dataset.error=error.message;document.querySelector('#status').textContent=error.stack;});
