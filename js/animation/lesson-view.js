/* The approved character/stage, shared by every pose in the complete form. */
import * as THREE from '../../vendor/three/three.module.js';
import {createAvatar} from './avatar.js';
import {createStage,createLights,createContactShadows} from './stage.js';
import {poseAtTime,DURATION} from './taegeuk-1-motion.js';
import {createCameraRig,framingPoints,directionName,FOV} from './camera-rig.js';
import {attachCameraInput} from './camera-input.js';
export function createLessonView(canvas,{onReady=()=>{},onError=()=>{},requestFrame=()=>{},onCamera=()=>{},motion={poseAtTime,DURATION}}={}){
 const {poseAtTime:sample,DURATION:duration}=motion;
 const reducedMotion=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const rig=createCameraRig({framing:framingPoints(sample,duration),reducedMotion,sample,duration});

 const scene=new THREE.Scene();scene.background=new THREE.Color(0xe8edf1);scene.fog=new THREE.Fog(0xe8edf1,8,16);
 const camera=new THREE.PerspectiveCamera(FOV,1,.1,40);
 let renderer=null,currentTime=0;
 try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;}catch{onError();return{draw(){},resize(){},setView(){},camera:null,get ready(){return false;},destroy(){}};}
 const actor=createAvatar({onReady(){onReady();requestFrame();},onError});
 const contacts=createContactShadows();scene.add(createStage({size:motion.referencePlans?8:3.2}),contacts.root,actor.root);createLights(scene);
 function draw(time=currentTime){
  currentTime=time;const p=sample(time);actor.applyPose(p);contacts.update(p);
  // The camera follows the performer's position, never their turns. Footwork also widens for kicks; easing keeps every change smooth.
  if(rig.update(performance.now(),time))requestFrame();
  const {eye,target,distance}=rig.place(p.pelvis),s=rig.state;camera.position.set(...eye);camera.lookAt(...target);
  renderer.render(scene,camera);
  Object.assign(canvas.dataset,{time:time.toFixed(3),view:directionName(s.azimuth),azimuth:s.azimuth.toFixed(1),elevation:s.elevation.toFixed(1),zoom:s.zoom.toFixed(2),focus:s.focus,cameraDistance:distance.toFixed(3),rig:'connected-skinned-3d',faceSource:'modeled-features-no-photo'});
 }
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();rig.setAspect(camera.aspect);renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(w,h,false);requestFrame();}
 const changed=reason=>{requestFrame();onCamera(rig.state,reason);};
 const input=attachCameraInput(canvas,{onDrag(dAz,dEl){rig.drag(dAz,dEl);changed('drag');},onPinch(f){rig.pinch(f);changed('drag');},onEnd(){changed('settled');}});
 const sizer=new ResizeObserver(resize);sizer.observe(canvas);resize();
 /* `camera` is for keys and buttons; `setView` keeps the named review angles for the QA lab. */
 return{draw,resize,camera:{rig,changed},setView(name){if(rig.preset(name))changed('preset');},get ready(){return actor.ready;},destroy(){input.detach();sizer.disconnect();renderer.dispose();}};
}
