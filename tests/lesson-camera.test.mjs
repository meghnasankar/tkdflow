/* Free lesson camera: framing from every allowed angle in all 23 lessons,
   easing without jumps, the keys, pointer gestures and the real page wiring. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {register} from 'node:module';
import {installDom,settle} from './helpers/mini-dom.mjs';
import {parseInto} from './helpers/mini-html.mjs';
import {createCameraRig,framingPoints,focusPoints,basis,wrap,LIMITS,DEFAULT_CAMERA,FOV} from '../js/animation/camera-rig.js';
import {cameraKeyAction,applyCameraAction,attachCameraInput,BUTTON_ACTIONS,TURN_STEP} from '../js/animation/camera-input.js';
import {playerKeyAction} from '../js/lib/lesson-nav.js';
import {createFormMotion} from '../js/animation/form-motion.js';
import * as T1 from '../js/animation/taegeuk-1-motion.js';
import {POSES,LESSON} from '../js/lessons/taegeuk-1-data.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const forms=JSON.parse(read('data/forms.json'));
const motions=forms.map(f=>[f.id,f.id==='taegeuk-1'?T1:createFormMotion(JSON.parse(read(`data/lessons/${f.id}.json`)))]);
const TAN=Math.tan(FOV/2*Math.PI/180);

/* Independent samples, offset from the rig's own 0.1 s grid so in-between frames (kick peaks) are checked too. */
function bodyPoints(m,{step=.1,offset=.05}={}){
 const whole=[],arms=[],feet=[];
 for(let t=offset;t<=m.DURATION;t+=step){
  const p=m.poseAtTime(t),o=p.pelvis,rel=v=>[v[0]-o[0],v[1],v[2]-o[2]];
  const head=rel([o[0],o[1]+.80,o[2]]);whole.push(head,rel(o));arms.push(head,rel(o));
  for(const side of ['left','right']){
   const a=p.arms[side],l=p.legs[side],d=a.wrist.map((v,i)=>v-a.elbow[i]),n=Math.hypot(...d)||1,tip=rel(a.wrist.map((v,i)=>v+d[i]/n*.10));
   for(const v of [a.shoulder,a.elbow,a.wrist])whole.push(rel(v)),arms.push(rel(v));whole.push(tip);arms.push(tip);
   const y=(l.yaw||0)*Math.PI/180,corners=[-.065,.065].flatMap(x=>[-.055,.18].map(z=>rel([l.ankle[0]+x*Math.cos(y)+z*Math.sin(y),l.ankle[1]-.07,l.ankle[2]-x*Math.sin(y)+z*Math.cos(y)])));
   whole.push(rel(l.hip),rel(l.knee),rel(l.ankle),...corners);
   feet.push(rel(l.knee),rel(l.ankle),...corners);
  }
 }
 return {whole,arms,feet};
}
/* The furthest any point lands from the centre of the screen (1 = the frame edge) for the rig's current camera. */
function worstOnScreen(rig,points){
 const {eye}=rig.place([0,0,0]),{back,right,up}=basis(rig.current.azimuth,rig.current.elevation),a=rig.aspect;let worst=0;
 for(const p of points){
  const qx=p[0]-eye[0],qy=p[1]-eye[1],qz=p[2]-eye[2],depth=-(qx*back[0]+qy*back[1]+qz*back[2]);
  worst=Math.max(worst,Math.abs((qx*right[0]+qz*right[2])/(depth*TAN*a)),Math.abs((qx*up[0]+qy*up[1]+qz*up[2])/(depth*TAN)));
 }
 return worst;
}

test('in all 23 lessons, every joint, hand and foot of the whole form stays in frame from every angle, tilt and screen shape',()=>{
 assert.equal(motions.length,23);
 for(const [id,m] of motions){
  const pts=bodyPoints(m),framing=framingPoints(m.poseAtTime,m.DURATION);
  for(const aspect of [.7,2.2]){
   const rig=createCameraRig({framing,aspect});
   for(let el=2.5;el<=LIMITS.maxElevation;el+=13.5)for(let az=-172.5;az<180;az+=15){
    rig.drag(wrap(az-rig.state.azimuth),el-rig.state.elevation);
    const worst=worstOnScreen(rig,pts.whole);
    assert.ok(worst<=1,`${id}: whole body leaves the frame (${worst.toFixed(3)}) at azimuth ${az}, tilt ${el}, aspect ${aspect}`);
   }
  }
 }
});

test('Armwork frames head and arms from every angle and is a real close-up',()=>{
 for(const [id,m] of motions.filter(([id])=>['taegeuk-1','koryo','chon-ji','songahm-3'].includes(id))){
  const pts=bodyPoints(m),rig=createCameraRig({framing:framingPoints(m.poseAtTime,m.DURATION),aspect:1});
  const whole=rig.state.distance;rig.setFocus('arms');for(let t=16;rig.update(t);t+=16);
  assert.ok(rig.state.distance<whole*.75,`${id} arms ${rig.state.distance.toFixed(2)} vs ${whole.toFixed(2)}`);
  for(let el=0;el<=70;el+=35)for(let az=7;az<360;az+=40){rig.drag(wrap(az-rig.state.azimuth),el-rig.state.elevation);assert.ok(worstOnScreen(rig,pts.arms)<=1,`${id} arms off screen at ${az}/${el}`);}
 }
});

/* Both knees and feet of the frame on screen, relative to the performer. */
const legsNow=p=>bodyPoints({DURATION:0,poseAtTime:()=>p},{offset:0}).feet;
test('Footwork follows both feet through every kick: in all 23 lessons, played at 60 fps, no knee or foot ever leaves the frame from any angle',()=>{
 for(const [id,m] of motions){
  for(const aspect of [.85,2]){
   const framing=framingPoints(m.poseAtTime,m.DURATION),rig=createCameraRig({framing,aspect,sample:m.poseAtTime,duration:m.DURATION});
   const whole=rig.state.distance;rig.setFocus('feet');rig.at(0);for(let t=16;rig.update(t,0);t+=16);
   const ratios=[];let ms=0,frame=0;
   for(let t=0;t<=m.DURATION;t+=1/60,frame++){
    ms+=1000/60;rig.update(ms,t);ratios.push(rig.current.distance/whole);
    if(frame%2)continue;
    const legs=legsNow(m.poseAtTime(t));
    for(const [az,el] of [[0,0],[70,35],[160,70],[-110,10],[-30,60]]){
     rig.drag(wrap(az-rig.current.azimuth),el-rig.current.elevation);
     const worst=worstOnScreen(rig,legs);assert.ok(worst<=1,`${id} t=${t.toFixed(2)} az ${az} el ${el} aspect ${aspect}: a foot leaves the frame (${worst.toFixed(3)})`);
    }
   }
   assert.ok(rig.framingPushes<=frame*.01,`${id}: steady playback eases; the framing guard rarely steps in (${rig.framingPushes} pushes in ${frame} frames)`);
   ratios.sort((a,b)=>a-b);
   assert.ok(ratios[Math.floor(ratios.length/2)]<.75,`${id}: Footwork is usually much closer than Whole body (median ${ratios[Math.floor(ratios.length/2)].toFixed(2)})`);
   assert.ok(ratios.at(-1)<=1.1,`${id}: at a high kick Footwork is at most a little wider than Whole body, aimed lower (${ratios.at(-1).toFixed(2)})`);
  }
 }
});

/* Settle Footwork at one lesson time, then check every view from the first frame after a change. */
const ANGLES=[[0,0],[50,18],[90,35],[160,70],[-110,10],[-45,55]];
function footRig(m,aspect){const rig=createCameraRig({framing:framingPoints(m.poseAtTime,m.DURATION),aspect,sample:m.poseAtTime,duration:m.DURATION});rig.setFocus('feet');return rig;}
function settleAt(rig,t,from=0){let ms=from;for(let i=0;i<100;i++){ms+=16;rig.update(ms,t);}return ms;}
function framed(rig,t,where){const legs=legsNow(rig.__m.poseAtTime(t));for(const [az,el] of ANGLES){rig.drag(wrap(az-rig.current.azimuth),el-rig.current.elevation);const w=worstOnScreen(rig,legs);assert.ok(w<=1,`${where}: a foot is clipped (${w.toFixed(3)}) at azimuth ${az}, tilt ${el}`);}}

test('Footwork never clips a foot on the first frame after a jump: Next, Previous, a list pick or a seek, forward and back, in all 23 lessons',()=>{
 let jumps=0;
 for(const [id,m] of motions){
  const at=m.CHAPTERS.map(c=>c.at??c.start),n=at.length;
  for(const aspect of [.85,2]){
   const rig=footRig(m,aspect);rig.__m=m;
   for(let i=0;i<n;i+=2)for(const j of [i+1,i+3,i-1,i-4,0,n-1]){
    if(j<0||j>=n||j===i)continue;
    const ms=settleAt(rig,at[i]);rig.update(ms+16,at[j]);jumps++;
    framed(rig,at[j],`${id} pose ${i+1} → ${j+1}, aspect ${aspect}, first frame`);
    for(let k=2;k<=30;k++)rig.update(ms+16*k,at[j]);
    framed(rig,at[j],`${id} pose ${i+1} → ${j+1}, aspect ${aspect}, settled`);
   }
   /* A seek during playback: playing up to a pose, then a jump ahead while still playing. */
   let ms=0;for(let t=at[1];t<at[1]+.5;t+=1/60){ms+=16.7;rig.update(ms,t);}
   const ahead=at[Math.min(n-1,Math.floor(n/2))];rig.update(ms+16.7,ahead);framed(rig,ahead,`${id} seek while playing, aspect ${aspect}`);
  }
 }
 assert.ok(jumps>2000,`a broad sample of jumps (${jumps})`);
});

test('Footwork never clips a foot when chosen from Whole body or Armwork, or when the screen changes shape, at the lesson’s kicks',()=>{
 const m=motions.find(([id])=>id==='taegeuk-4')[1],legs=t=>legsNow(m.poseAtTime(t));
 const kicks=m.POSES.map((p,i)=>[p,i]).filter(([p])=>/kick/i.test(p.name)).map(([,i])=>m.CHAPTERS[i].at??m.CHAPTERS[i].start);
 assert.ok(kicks.length>=4,'the lesson has kicks to test');
 for(const t of kicks)for(const from of ['whole','arms']){
  const rig=createCameraRig({framing:framingPoints(m.poseAtTime,m.DURATION),aspect:.85,sample:m.poseAtTime,duration:m.DURATION});rig.__m=m;
  rig.setFocus(from);const ms=settleAt(rig,t);rig.setFocus('feet');rig.update(ms+16,t);framed(rig,t,`${from} → Footwork at ${t.toFixed(2)} s`);
  for(const aspect of [.5,2.4,.85]){rig.setAspect(aspect);rig.update(ms+32,t);framed(rig,t,`resize to ${aspect} at ${t.toFixed(2)} s`);}
 }
 const rig=footRig(m,2);rig.__m=m;const ms=settleAt(rig,m.CHAPTERS[3].at);rig.setAspect(.5);rig.update(ms+16,kicks[0]);
 framed(rig,kicks[0],'rotate a phone to portrait and jump to a kick together');
 assert.equal(rig.at(kicks[1]),rig);framed(rig,kicks[1],'a direct jump without easing (at)');
});

/* Every focus, every frame of a change: the current pose's points for the active focus stay on screen. */
const focusNow=(m,t,focus)=>focusPoints(m.poseAtTime(t))[focus];
function frames(rig,m,t,focus,where,ms,count=40,angles=[[rig.current.azimuth,rig.current.elevation]]){
 const seen=[];
 for(let k=1;k<=count;k++){
  rig.update(ms+16*k,t);
  for(const [az,el] of angles){rig.drag(wrap(az-rig.current.azimuth),el-rig.current.elevation);const w=worstOnScreen(rig,focusNow(m,t,focus));seen.push(w);
   assert.ok(w<=1,`${where}, frame ${k}${angles.length>1?` at ${az}/${el}`:''}: ${focus} leaves the frame (${w.toFixed(3)})`);}
 }
 return seen;
}
test('every focus change keeps its own body parts in frame on the first frame, while easing and once settled, in all 23 lessons',()=>{
 const order=[['arms','feet'],['feet','whole'],['arms','whole'],['whole','arms'],['feet','arms'],['whole','feet']];
 let checked=0;
 for(const [id,m] of motions){
  const framing=framingPoints(m.poseAtTime,m.DURATION),at=m.CHAPTERS.map(c=>c.at??c.start);
  for(const aspect of [.85,2]){
   const rig=createCameraRig({framing,aspect,sample:m.poseAtTime,duration:m.DURATION});
   for(const [i,[from,to]] of order.entries()){
    const t=at[(i*7+3)%at.length];rig.setFocus(from);let ms=settleAt(rig,t,i*1e5);
    rig.setFocus(to);const seen=frames(rig,m,t,to,`${id} ${from} → ${to} at ${t.toFixed(2)} s, aspect ${aspect}`,ms,30);checked+=seen.length;
   }
  }
 }
 assert.ok(checked>8000,`many transition frames checked (${checked})`);
});

test('rapid focus presses (Armwork → Footwork → Whole body within a few frames) never crop the head, hands or feet, from any angle',()=>{
 for(const [id,m] of motions.filter(([id])=>['taegeuk-1','taegeuk-4','koryo','chon-ji','songahm-2','sipjin'].includes(id))){
  const framing=framingPoints(m.poseAtTime,m.DURATION),at=m.CHAPTERS.map(c=>c.at??c.start);
  for(const aspect of [.85,1.74]){
   const rig=createCameraRig({framing,aspect,sample:m.poseAtTime,duration:m.DURATION});
   for(const t of [at[0],at[Math.floor(at.length/3)],at[Math.floor(2*at.length/3)]]){
    rig.setFocus('arms');let ms=settleAt(rig,t);
    for(const [focus,gap] of [['feet',2],['whole',1],['arms',3],['whole',2],['feet',1],['whole',0]]){
     rig.setFocus(focus);
     for(let k=0;k<=gap;k++){ms+=16;rig.update(ms,t);const w=worstOnScreen(rig,focusNow(m,t,focus));assert.ok(w<=1,`${id} rapid → ${focus} at ${t.toFixed(2)} s aspect ${aspect}: ${w.toFixed(3)}`);}
    }
    frames(rig,m,t,'whole',`${id} after rapid presses`,ms,30,[[0,0],[50,18],[120,45],[-150,70],[-80,10]]);
   }
  }
 }
});

test('resizing during a focus change keeps every focus framed, and a manual zoom-in is still allowed to crop',()=>{
 const m=motions.find(([id])=>id==='taegeuk-4')[1],framing=framingPoints(m.poseAtTime,m.DURATION),t=m.CHAPTERS[6].at??m.CHAPTERS[6].start;
 for(const [from,to] of [['arms','whole'],['feet','whole'],['whole','arms'],['feet','arms'],['arms','feet']]){
  const rig=createCameraRig({framing,aspect:2,sample:m.poseAtTime,duration:m.DURATION});rig.setFocus(from);let ms=settleAt(rig,t);
  rig.setFocus(to);rig.update(ms+16,t);
  for(const [k,aspect] of [.5,2.4,.85,1.3].entries()){rig.setAspect(aspect);assert.ok(worstOnScreen(rig,focusNow(m,t,to))<=1,`${from} → ${to}, resized to ${aspect}`);rig.update(ms+32+16*k,t);assert.ok(worstOnScreen(rig,focusNow(m,t,to))<=1);}
 }
 const rig=createCameraRig({framing,aspect:1,sample:m.poseAtTime,duration:m.DURATION});settleAt(rig,t);
 rig.zoomBy(2.5);let ms=2e5;for(let k=0;k<60;k++)rig.update(ms+=16,t);
 assert.ok(worstOnScreen(rig,focusNow(m,t,'whole'))>1,'zoomed in 2.5×, Whole body is cropped as the learner asked');
 assert.ok(Math.abs(rig.current.distance-rig.state.distance)<.01,'the guard does not undo a manual zoom');
 rig.setFocus('feet');rig.update(ms+16,t);assert.equal(rig.state.zoom,1,'a focus change resets zoom');assert.ok(worstOnScreen(rig,focusNow(m,t,'feet'))<=1);
});

test('the guard is exact for the current view: in steady Whole body and Armwork it never moves the camera, so the body stays as large as before',()=>{
 for(const [id,m] of motions.filter(([id],i)=>i%4===0)){
  const framing=framingPoints(m.poseAtTime,m.DURATION);
  for(const focus of ['whole','arms']){
   const rig=createCameraRig({framing,aspect:1.74,sample:m.poseAtTime,duration:m.DURATION});rig.setFocus(focus);settleAt(rig,0);
   const d=rig.current.distance;let ms=1e6;
   for(let t=0;t<m.DURATION;t+=.25){ms+=16;rig.update(ms,t);for(const az of [0,90,200]){rig.drag(wrap(az-rig.current.azimuth),0);assert.equal(rig.current.distance,d,`${id} ${focus} kept its steady distance`);}}
   assert.equal(rig.framingPushes,0,`${id} ${focus}: no pushes in steady framing`);
  }
 }
});

test('Footwork never pumps while orbiting, and with reduced motion holds one steady framing that includes every kick',()=>{
 const m=motions.find(([id])=>id==='taegeuk-2')[1],framing=framingPoints(m.poseAtTime,m.DURATION);
 const rig=createCameraRig({framing,aspect:1,sample:m.poseAtTime,duration:m.DURATION});rig.setFocus('feet');rig.at(20);
 const d=rig.state.distance;for(let i=0;i<40;i++){rig.drag(9,i%2?7:-7);assert.equal(rig.state.distance,d);}
 const calm=createCameraRig({framing,aspect:1,sample:m.poseAtTime,duration:m.DURATION,reducedMotion:()=>true});calm.setFocus('feet');
 const steady=calm.state.distance;for(let t=0;t<m.DURATION;t+=1.7){calm.update(t*1000,t);assert.equal(calm.current.distance,steady);}
 for(let t=.05;t<m.DURATION;t+=.37){const legs=legsNow(m.poseAtTime(t));for(const az of [0,90,200])for(const el of [0,40,70]){calm.drag(wrap(az-calm.current.azimuth),el-calm.current.elevation);assert.ok(worstOnScreen(calm,legs)<=1);}}
});

const tiny={whole:{points:[[0,0,0],[.6,1.8,.4],[-.6,.4,-.5]],targetY:.9},arms:{points:[[0,1,0],[.3,1.8,.3]],targetY:1.35},feet:{points:[[0,0,0],[.4,.5,.3]],targetY:.3}};
const run=(rig,ms=16,limit=400)=>{let t=0,frames=0,samples=[];while(frames<limit){t+=ms;frames++;const moving=rig.update(t);samples.push(rig.current);if(!moving)break;}return {frames,samples};};

test('turning, tilting and playback never change the distance: no zoom pumping',()=>{
 const rig=createCameraRig({framing:tiny,aspect:1.3}),d=rig.state.distance;
 for(let i=0;i<72;i++){rig.drag(7,i%2?3:-3);assert.equal(rig.current.distance,d);assert.equal(rig.state.distance,d);}
 rig.turn(45);rig.tilt(20);run(rig);assert.equal(rig.current.distance,d,'keys change angle only');
 const a=rig.place([0,1,0]),b=rig.place([2.5,.7,-1.2]);
 assert.equal(a.distance,b.distance);assert.equal(a.target[1],b.target[1],'a crouch or jump never moves the aim');
 assert.deepEqual([b.target[0],b.target[2]],[2.5,-1.2],'the camera follows where the performer stands');
 rig.zoomBy(1.25);run(rig);assert.ok(Math.abs(rig.current.distance-d/1.25)<1e-9,'only zoom changes distance');
});

test('key and button moves ease without jumps or overshoot, take the short way round, and stop asking for frames',()=>{
 const rig=createCameraRig({framing:tiny});rig.drag(170-DEFAULT_CAMERA.azimuth,0);rig.turn(20);
 assert.equal(rig.state.azimuth,-170);
 const {frames,samples}=run(rig);
 assert.ok(frames>3&&frames<60,`eases over a few frames (${frames})`);
 for(const s of samples)assert.ok(Math.abs(s.azimuth)>=170-1e-9,`passes behind the performer, not round the front (${s.azimuth})`);
 const gaps=samples.map(s=>Math.abs(wrap(-170-s.azimuth)));for(let i=1;i<gaps.length;i++)assert.ok(gaps[i]<=gaps[i-1]+1e-9,'no overshoot');
 assert.ok(gaps[0]<20&&20-gaps[0]<20*.3,'the first frame moves only part of the way');
 assert.equal(rig.update(1e7),false,'settled');assert.equal(rig.current.azimuth,-170);
 rig.setFocus('arms');const f=run(rig).samples.map(s=>s.distance);
 for(let i=1;i<f.length;i++)assert.ok(f[i]<=f[i-1]+1e-9,'a focus change moves in steadily');
 assert.ok(f[0]>rig.state.distance+(f.at(-1)-rig.state.distance),'not an instant cut');
});

test('drag and pinch follow the pointer at once; reduced motion snaps every change',()=>{
 const rig=createCameraRig({framing:tiny});rig.drag(-30,12);
 assert.deepEqual([rig.current.azimuth,rig.current.elevation],[rig.state.azimuth,rig.state.elevation]);
 const d=rig.state.distance;rig.pinch(2);assert.equal(rig.current.distance,d/2);
 let reduce=true;const calm=createCameraRig({framing:tiny,reducedMotion:()=>reduce});
 calm.turn(90);assert.equal(calm.current.azimuth,140);calm.setFocus('feet');assert.equal(calm.current.targetY,.3);assert.equal(calm.update(16),false);
});

test('limits: tilt stays between level and 70°, zoom between 0.75× and 2.5×, angles wrap; named steps land on the eight sides',()=>{
 const rig=createCameraRig({framing:tiny});
 rig.tilt(500);assert.equal(rig.state.elevation,LIMITS.maxElevation);rig.drag(0,-999);assert.equal(rig.state.elevation,0);
 rig.zoomBy(100);assert.equal(rig.state.zoom,LIMITS.maxZoom);rig.pinch(.001);assert.equal(rig.state.zoom,LIMITS.minZoom);
 rig.reset();assert.deepEqual([rig.state.azimuth,rig.state.elevation,rig.state.zoom],[50,18,1]);
 const right=[],left=[];for(let i=0;i<4;i++){rig.turnToNext(1);right.push(rig.state.azimuth);}
 rig.reset();for(let i=0;i<4;i++){rig.turnToNext(-1);left.push(rig.state.azimuth);}
 assert.deepEqual(right,[90,135,180,-135]);assert.deepEqual(left,[45,0,-45,-90]);
 assert.equal(rig.setFocus('nose'),false);assert.equal(rig.state.focus,'whole');
 rig.reset();rig.zoomBy(1.25);rig.setFocus('arms');assert.equal(rig.state.zoom,1,'a new focus starts fully framed');
 assert.equal(rig.label(),'Camera front-left, slightly above. Armwork.');
 rig.turnToNext(1);rig.turnToNext(1);rig.turnToNext(1);rig.tilt(30);rig.zoomBy(1.25);
 assert.equal(rig.label(),'Camera back, above. Armwork, zoom 125%.');
 assert.equal(rig.preset('front'),true);assert.equal(rig.current.azimuth,0,'review presets snap for the QA lab');
});

test('a new screen shape reframes at once, and resizing to the same shape reuses the fit',()=>{
 const rig=createCameraRig({framing:tiny,aspect:1});const square=rig.state.distance;
 rig.setAspect(.5);assert.ok(rig.current.distance>square,'a narrow phone canvas steps back');assert.equal(rig.current.distance,rig.state.distance);
 rig.setAspect(1);assert.equal(rig.state.distance,square);rig.setAspect(0);rig.setAspect(NaN);assert.equal(rig.state.distance,square);
});

const region={tagName:'DIV'},key=(k,o={})=>({key:k,target:region,...o});
test('camera keys: A/D turn, Shift+A/D to the next side, W/S tilt, +/- zoom, 0 reset, 1–3 focus; never with modifiers, in fields or during IME',()=>{
 assert.deepEqual(cameraKeyAction(key('d')),{type:'turn',degrees:TURN_STEP});assert.deepEqual(cameraKeyAction(key('A')),{type:'turn',degrees:-TURN_STEP},'Caps Lock still works');
 assert.deepEqual(cameraKeyAction(key('D',{shiftKey:true})),{type:'turn-next',dir:1});
 assert.equal(cameraKeyAction(key('w')).type,'tilt');assert.ok(cameraKeyAction(key('s')).degrees<0);assert.equal(cameraKeyAction(key('W',{shiftKey:true})),null);
 assert.ok(cameraKeyAction(key('+',{shiftKey:true})).factor>1,'Shift+= types + on many layouts');assert.ok(cameraKeyAction(key('=')).factor>1);assert.ok(cameraKeyAction(key('-')).factor<1);
 assert.deepEqual(cameraKeyAction(key('0')),{type:'reset'});
 assert.deepEqual(['1','2','3'].map(k=>cameraKeyAction(key(k)).focus),['whole','arms','feet']);
 for(const o of [{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true},{defaultPrevented:true}])assert.equal(cameraKeyAction(key('d',o)),null);
 for(const tagName of ['INPUT','SELECT','TEXTAREA'])assert.equal(cameraKeyAction({key:'d',target:{tagName}}),null);
 assert.equal(cameraKeyAction({key:'2',target:{tagName:'DIV',isContentEditable:true}}),null);
});

test('camera keys and playback keys never overlap',()=>{
 for(const k of ['ArrowLeft','ArrowRight','Home','End',' ','k','r','R','Enter','Tab','Escape'])assert.equal(cameraKeyAction(key(k)),null,k);
 for(const k of ['a','d','w','s','A','D','+','=','-','0','1','2','3'])assert.equal(playerKeyAction(key(k),region),null,k);
});

test('every camera button maps to one action, and each action changes the rig',()=>{
 for(const [name,action] of Object.entries(BUTTON_ACTIONS)){
  const rig=createCameraRig({framing:tiny});if(name==='reset'){rig.turn(30);rig.zoomBy(2);}
  const before=JSON.stringify(rig.state);assert.equal(applyCameraAction(rig,action),true);assert.notEqual(JSON.stringify(rig.state),before,name);
 }
 assert.equal(applyCameraAction(createCameraRig({framing:tiny}),{type:'nope'}),false);
});

/* A canvas-like target: listeners, pointer capture and a size. */
function surface(){
 const l=new Map(),captured=new Set(),el={dataset:{},clientWidth:400,clientHeight:200,
  addEventListener(t,fn,o){l.set(t,{fn,o});},removeEventListener(t,fn){if(l.get(t)?.fn===fn)l.delete(t);},
  setPointerCapture(id){captured.add(id);},releasePointerCapture(id){captured.delete(id);},
  fire(t,e={}){let prevented=false;l.get(t)?.fn({pointerId:1,pointerType:'mouse',button:0,clientX:0,clientY:0,...e,preventDefault(){prevented=true;}});return prevented;}};
 const win={l:new Map(),addEventListener(t,fn){this.l.set(t,fn);},removeEventListener(t){this.l.delete(t);}};
 return {el,l,captured,win};
}
test('dragging turns the camera like grabbing the scene; right-click, a lone wheel and other buttons are left alone',()=>{
 const {el,captured,win}=surface(),log=[];
 attachCameraInput(el,{win,onDrag:(a,b)=>log.push(['drag',a,b]),onPinch:f=>log.push(['pinch',f]),onStart:()=>log.push(['start']),onEnd:()=>log.push(['end'])});
 el.fire('pointerdown',{clientX:100,clientY:100});assert.ok(captured.has(1));assert.equal(el.dataset.dragging,'true');
 el.fire('pointermove',{clientX:300,clientY:150});
 assert.deepEqual(log[1],['drag',-90,22.5],'half the width is 90°; dragging right moves the camera left, down raises it');
 el.fire('pointerup',{clientX:300,clientY:150});assert.equal(captured.size,0);assert.equal(el.dataset.dragging,undefined);assert.deepEqual(log.at(-1),['end']);
 log.length=0;el.fire('pointerdown',{button:2});el.fire('pointermove',{clientX:50});assert.deepEqual(log,[],'right button ignored');
 assert.equal(el.fire('wheel',{deltaY:40}),false,'a plain wheel scrolls the page');assert.deepEqual(log,[]);
 assert.equal(el.fire('wheel',{deltaY:40,ctrlKey:true}),true,'trackpad pinch (Ctrl+wheel) zooms instead of zooming the page');assert.ok(log[0][1]<1);
});

test('two fingers pinch-zoom without turning; a cancelled touch, lost capture or window blur ends the drag once',()=>{
 const {el,win,l}=surface(),log=[];
 const input=attachCameraInput(el,{win,onDrag:(a,b)=>log.push(['drag',a,b]),onPinch:f=>log.push(['pinch',f]),onEnd:()=>log.push(['end'])});
 el.fire('pointerdown',{pointerId:1,pointerType:'touch',clientX:100,clientY:100});el.fire('pointerdown',{pointerId:2,pointerType:'touch',clientX:200,clientY:100});
 el.fire('pointermove',{pointerId:2,pointerType:'touch',clientX:300,clientY:100});
 assert.deepEqual(log,[['pinch',2]]);
 el.fire('pointercancel',{pointerId:1});el.fire('lostpointercapture',{pointerId:2});el.fire('pointerup',{pointerId:2});
 assert.deepEqual(log.filter(e=>e[0]==='end'),[['end']]);
 el.fire('pointerdown',{clientX:0});win.l.get('blur')();assert.equal(input.dragging,false);
 input.detach();assert.equal(l.size,0,'all listeners removed');assert.equal(win.l.size,0);
 log.length=0;el.fire('pointermove',{clientX:90});assert.deepEqual(log,[]);
});

const lessons=forms.map(f=>f.lessonUrl);
test('all 23 lesson pages offer three focus buttons, seven labelled camera buttons, a camera status and the camera keys',()=>{
 assert.equal(lessons.length,23);
 for(const url of lessons){
  const html=read(url);
  assert.doesNotMatch(html,/data-lesson-view=/,`${url}: the fixed view buttons are gone`);
  const focus=[...html.matchAll(/<button type="button" data-lesson-focus="([a-z]+)" aria-pressed="(true|false)">([^<]+)<\/button>/g)].map(m=>[m[1],m[2],m[3]]);
  assert.deepEqual(focus,[['whole','true','Whole body'],['arms','false','Armwork'],['feet','false','Footwork']],url);
  const pad=[...html.matchAll(/<button type="button" data-camera="([a-z]+)" aria-label="([^"]+)" title="[^"]+\(([^)]+)\)">/g)];
  assert.deepEqual(pad.map(m=>m[1]).sort(),Object.keys(BUTTON_ACTIONS).sort(),url);
  for(const m of pad){const action=cameraKeyAction(key(m[3]==='-'?'-':m[3].toLowerCase()));assert.ok(action,`${url}: ${m[2]} names a real key`);}
  assert.match(html,/role="group" aria-label="Camera focus"/);assert.match(html,/role="group" aria-label="Move the camera"/);
  assert.match(html,/<span class="sr-only" id="camera-status" role="status"><\/span>/,url);
  const hint=html.match(/<p class="player-keys"[^]*?<\/p>/)[0];
  for(const k of ['A','D','W','S','+','-','0','1','2','3'])assert.match(hint,new RegExp(`<kbd>${k.replace('+','\\+')}</kbd>`),`${url} hint ${k}`);
  assert.match(html,/Drag the view, or use the camera buttons, to look from any side\. The camera stays put when the performer turns\. Directions use the performer’s left and right\./);
 }
});

/* ── the real lesson page module, with only the WebGL view (and the account widgets) substituted ── */
const FAKE_VIEW=`import {createCameraRig} from ${JSON.stringify(new URL('../js/animation/camera-rig.js',import.meta.url).href)};
export function createLessonView(canvas,opts){const t=globalThis.__camTest;const rig=createCameraRig({framing:t.framing});
 const view={draw(){t.draws++;},camera:{rig,changed(reason){t.changes.push(reason);opts.requestFrame();opts.onCamera(rig.state,reason);}},setView(){},get ready(){return true;},destroy(){}};
 t.opts=opts;t.view=view;return view;}`;
register('data:text/javascript,'+encodeURIComponent(`export async function resolve(s,c,next){
 if(/animation\\/lesson-view\\.js$/.test(s))return {url:'data:text/javascript,'+encodeURIComponent(${JSON.stringify(FAKE_VIEW)}),shortCircuit:true};
 if(/lib\\/(learning-ui|lesson-help-ui)\\.js$/.test(s))return {url:'data:text/javascript,'+encodeURIComponent('export function mountLessonLearning(){} export function mountLessonHelp(){}'),shortCircuit:true};
 return next(s,c);}`));

async function page(){
 const env=installDom({url:'https://tkdflow.com/taegeuk-1.html'}),html=read('taegeuk-1.html');
 parseInto(env.doc,env.doc.body,html.slice(html.indexOf('<main'),html.indexOf('</main>')+7));
 Object.assign(globalThis,{requestAnimationFrame:fn=>setTimeout(()=>fn(performance.now()),0),cancelAnimationFrame:clearTimeout,HTMLButtonElement:globalThis.HTMLElement,scrollY:0,scrollTo(){}});
 env.win.scrollTo=()=>{};
 const t=globalThis.__camTest={framing:tiny,draws:0,changes:[]};
 const {mountLesson}=await import(`../js/pages/lesson-player.js?run=${Math.random()}`);
 await mountLesson({POSES,LESSON,MOTION:T1});
 const $=id=>env.doc.getElementById(id),region=$('player-region');
 const press=(k,o={})=>{const e=env.event('keydown',{key:k,bubbles:true,...o});e.target=o.target||region;(o.target||region).dispatchEvent(e);return e;};
 return {env,t,$,region,press,rig:()=>t.view.camera.rig,pressed:()=>env.doc.querySelectorAll('[data-lesson-focus]').filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.lessonFocus)};
}

test('on the real lesson page, camera keys move the camera while arrows still step the lesson, and fields keep their keys',async()=>{
 const p=await page();
 try{
  const e=p.press('d');assert.equal(e.defaultPrevented,true);assert.equal(p.rig().state.azimuth,DEFAULT_CAMERA.azimuth+TURN_STEP);
  const before=p.rig().state.azimuth,time=Number(p.$('lesson-progress').value);
  p.press('ArrowRight');assert.equal(p.rig().state.azimuth,before,'arrows never turn the camera');assert.ok(Number(p.$('lesson-progress').value)>time,'arrows still step a frame');
  p.press('2');assert.equal(p.rig().state.focus,'arms');assert.deepEqual(p.pressed(),['arms'],'the pressed button follows the key');
  p.press('d',{target:p.$('lesson-progress')});assert.equal(p.rig().state.azimuth,before,'the time slider keeps its own keys');
  p.press('d',{ctrlKey:true});assert.equal(p.rig().state.azimuth,before);
  await new Promise(r=>setTimeout(r,400));
  assert.equal(p.$('camera-status').textContent,'Camera front-left, slightly above. Armwork.','announced once it settles');
 }finally{await settle(2);p.env.restore();}
});

test('on the real lesson page, the focus and camera buttons work, drags are not announced, and a 3D failure disables the camera controls',async()=>{
 const p=await page();
 try{
  p.env.doc.querySelector('[data-lesson-focus="feet"]').dispatchEvent(p.env.event('click'));
  assert.equal(p.rig().state.focus,'feet');assert.deepEqual(p.pressed(),['feet']);
  p.env.doc.querySelector('[data-camera="right"]').dispatchEvent(p.env.event('click'));assert.equal(p.rig().state.azimuth,90);
  p.env.doc.querySelector('[data-camera="reset"]').dispatchEvent(p.env.event('click'));assert.equal(p.rig().state.azimuth,DEFAULT_CAMERA.azimuth);
  await new Promise(r=>setTimeout(r,400));p.$('camera-status').textContent='';
  p.t.opts.onCamera(p.rig().state,'drag');await new Promise(r=>setTimeout(r,400));
  assert.equal(p.$('camera-status').textContent,'','a drag in progress is not read out');
  p.t.opts.onError();
  const controls=p.env.doc.querySelectorAll('[data-lesson-focus],[data-camera]');
  assert.equal(controls.length,10);assert.ok(controls.every(c=>c.disabled),'no dead buttons once the 3D view fails');
 }finally{await settle(2);p.env.restore();}
});
