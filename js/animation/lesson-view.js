/* The approved character/stage, shared by every pose in the complete form. */
import * as THREE from '../../vendor/three/three.module.js';
import {createAvatar} from './avatar.js';
import {createStage,createLights,createContactShadows} from './stage.js';
import {poseAtTime,DURATION} from './taegeuk-1-motion.js';
import {add,scale,norm,sub,rotY} from './motion-math.js';
const VIEWS={front:[0,.20,1],back:[0,.20,-1],side:[1,.18,0],'other-side':[-1,.18,0],'three-quarter':[.75,.32,.62]};
function fit(aspect,dir,localPoints){
 const back=new THREE.Vector3(...dir).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),back).normalize(),up=new THREE.Vector3().crossVectors(back,right),target=new THREE.Vector3(0,.92,0),tan=Math.tan(Math.PI/12);let distance=1;
 for(const p of localPoints){const d=new THREE.Vector3(...p).sub(target),depth=d.dot(back);distance=Math.max(distance,(Math.abs(d.dot(up))+.095)/tan+depth+.095,(Math.abs(d.dot(right))+.095)/(tan*aspect)+depth+.095);}
 return distance*1.035;
}
export function createLessonView(canvas,{onReady=()=>{},onError=()=>{},requestFrame=()=>{},motion={poseAtTime,DURATION}}={}){
 const {poseAtTime:sample,DURATION:duration}=motion;
 const localPoints=[];
for(let t=0;t<=duration;t+=.10){
 const p=sample(t),origin=[p.pelvis[0],0,p.pelvis[2]];
 localPoints.push(sub(add(p.pelvis,[0,.80,0]),origin),sub(p.pelvis,origin));
 for(const side of ['left','right']){
  const a=p.arms[side],l=p.legs[side];
  for(const v of [a.shoulder,a.elbow,a.wrist,l.hip,l.knee,l.ankle])localPoints.push(sub(v,origin));
  localPoints.push(sub(add(a.wrist,scale(norm(sub(a.wrist,a.elbow)),.10)),origin));
  for(const x of [-.065,.065])for(const z of [-.055,.18])localPoints.push(sub(add(l.ankle,rotY([x,-.07,z],l.yaw)),origin));
 }
}

 const scene=new THREE.Scene();scene.background=new THREE.Color(0xe8edf1);scene.fog=new THREE.Fog(0xe8edf1,8,16);
 const camera=new THREE.PerspectiveCamera(30,1,.1,40),target=new THREE.Vector3(),eye=new THREE.Vector3();
 let renderer=null,view='three-quarter',currentTime=0,fitDistance=fit(1,VIEWS['three-quarter'],localPoints);
 try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;}catch(error){onError();return{draw(){},resize(){},setView(){},get ready(){return false;}};}
 const actor=createAvatar({onReady(){onReady();requestFrame();},onError});
 const contacts=createContactShadows();scene.add(createStage({size:motion.referencePlans?8:3.2}),contacts.root,actor.root);createLights(scene);
 function draw(time=currentTime){
  currentTime=time;const p=sample(time);actor.applyPose(p);contacts.update(p);
  // Translation follows the performer; the camera angle stays fixed during turns.
  target.set(p.pelvis[0],.92,p.pelvis[2]);eye.set(...VIEWS[view]).normalize().multiplyScalar(fitDistance);camera.position.copy(target).add(eye);camera.lookAt(target);
  renderer.render(scene,camera);canvas.dataset.time=time.toFixed(3);canvas.dataset.view=view;canvas.dataset.rig='connected-skinned-3d';canvas.dataset.faceSource='modeled-features-no-photo';
 }
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();fitDistance=fit(camera.aspect,VIEWS[view],localPoints);renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(w,h,false);requestFrame();}
 const sizer=new ResizeObserver(resize);sizer.observe(canvas);resize();
 return{draw,resize,setView(name){if(VIEWS[name]){view=name;fitDistance=fit(camera.aspect,VIEWS[view],localPoints);requestFrame();}},get ready(){return actor.ready;},destroy(){sizer.disconnect();renderer.dispose();}};
}
