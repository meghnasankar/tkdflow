import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createFormMotion} from '../js/animation/form-motion.js';
import {BODY} from '../js/animation/motion-math.js';
import {LessonTimeline} from '../js/animation/lesson-timeline.js';
import {poseUrl,createPoseHistory} from '../js/lib/lesson-nav.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),forms=JSON.parse(read('data/forms.json'));
const references=forms.filter(f=>f.id!=='taegeuk-1').map(f=>JSON.parse(read(`data/lessons/${f.id}.json`)));
const motions=new Map(references.map(f=>[f.id,createFormMotion(f)]));
const sub=(a,b)=>a.map((v,i)=>v-b[i]),len=a=>Math.hypot(...a),near=(a,b,e=1e-7)=>Math.abs(a-b)<e;
test('all 23 catalogue forms have their own complete addressable lesson',()=>{
 assert.equal(forms.length,23);assert.equal(references.length,22);
 assert.equal(references.reduce((n,f)=>n+f.sequence.length,0),540);
 for(const f of forms){assert.equal(f.lessonUrl,f.id+'.html');assert.ok(existsSync(new URL('../'+f.lessonUrl,import.meta.url)));}
 for(const f of references){
  const m=motions.get(f.id),html=read(f.id+'.html');
  assert.deepEqual(f.sequence.map(e=>e.n),Array.from({length:f.movementCount},(_,i)=>i+1));
  assert.deepEqual([...new Set(m.POSES.flatMap(p=>p.official||[]))],f.sequence.map(e=>e.n));
  assert.match(html,new RegExp(`data-form-id="${f.id}"`));
  assert.match(html,/\/js\/pages\/form-lesson\.js/);
  assert.match(html,/Awaiting review by a qualified instructor/);
  assert.equal(m.LESSON.review.status,'pending');assert.equal(m.LESSON.review.reviewer,null);
  for(const source of f.sources){assert.equal(new URL(source.url).protocol,'https:');assert.ok(source.title);assert.ok(html.includes(source.url.replaceAll('&','&amp;')));}
 }
});
test('source movement counts replace known catalogue errors without adding filler',()=>{
 for(const [id,count]of [['taegeuk-6',19],['pyongwon',21],['sipjin',28]])assert.equal(forms.find(f=>f.id===id).moves,count);
});
for(const f of references)test(`${f.id}: whole-body motion is finite, connected, grounded and smooth throughout`,()=>{
 const m=motions.get(f.id),dt=1/120,velocities={};let previous=m.poseAtTime(0),maxSpeed=0,maxAcceleration=0;
 for(let n=1;n<=Math.floor(m.DURATION/dt);n++){
  const p=m.poseAtTime(n*dt);
  for(const side of ['left','right']){
   const a=p.arms[side],l=p.legs[side];
   for(const [actual,expected]of [[len(sub(a.elbow,a.shoulder)),BODY.upperArm],[len(sub(a.wrist,a.elbow)),BODY.forearm],[len(sub(l.knee,l.hip)),BODY.thigh],[len(sub(l.ankle,l.knee)),BODY.shin]])assert.ok(near(actual,expected),f.id+' connected bone length');
   assert.ok(l.ankle[1]>=BODY.ankleHeight-1e-6,f.id+' foot below floor');
   for(const [part,joints]of [['arms',['shoulder','elbow','wrist']],['legs',['hip','knee','ankle']]])for(const joint of joints){
    const point=p[part][side][joint];assert.ok(point.every(Number.isFinite));
    const key=side+part+joint,v=sub(point,previous[part][side][joint]).map(x=>x/dt);maxSpeed=Math.max(maxSpeed,len(v));
    if(velocities[key])maxAcceleration=Math.max(maxAcceleration,len(sub(v,velocities[key]))/dt);velocities[key]=v;
   }
  }previous=p;
 }
 assert.ok(maxSpeed<3,`${f.id} joint speed spike ${maxSpeed}`);assert.ok(maxAcceleration<18,`${f.id} joint acceleration spike ${maxAcceleration}`);
});
test('stationary techniques preserve feet, retreat steps move the named rear foot',()=>{
 for(const id of ['do-san','songahm-1','yul-gok'])for(const p of motions.get(id).referencePlans.filter(p=>p.entry?.footAction==='stay'&&p.before.stance===p.after.stance)){
  for(const side of ['left','right'])assert.deepEqual(p.after.feet[side],p.before.feet[side],id+' stationary foot');
 }
 const m=motions.get('chon-ji');for(const n of [18,19]){
  const p=m.referencePlans.find(p=>p.entry?.n===n),side=n===18?'right':'left';
  assert.ok(p.after.feet[side].pos[2]<p.before.feet[side].pos[2],`Chon-Ji ${n} retreats`);
 }
});
test('long turns, same-leg double kicks and airborne switching remain distinct',()=>{
 const d=motions.get('do-san').referencePlans.find(p=>p.entry?.n===7);assert.equal(d.dyaw,360);
 const k=motions.get('koryo').referencePlans.filter(p=>p.entry?.n===2&&p.kick);assert.equal(k.length,2);assert.ok(k.every(p=>p.kick.side==='right'));assert.ok(k[0].after.feet.right.pos[1]<k[1].after.feet.right.pos[1]);
 const jumps=motions.get('taegeuk-8').referencePlans.filter(p=>p.kick?.airborne);assert.ok(jumps.length>=3);
 for(const p of jumps){const pose=motions.get('taegeuk-8').poseAtTime(p.start+p.duration*.5);assert.ok(pose.legs.left.ankle[1]>.10&&pose.legs.right.ankle[1]>.10);}
 const bends=motions.get('won-hyo').referencePlans.filter(p=>p.actions.some(a=>a.type==='bending-ready'));assert.ok(bends.length>=2);
 for(const p of bends){const side=p.actions.find(a=>a.type==='bending-ready').side;assert.ok(p.after.feet[side].pos[1]>.4);assert.ok(near(p.after.feet[side==='left'?'right':'left'].pos[1],.07));}
});
test('each form has its own duration, navigation, pause, replay and share links',()=>{
 for(const f of references){const m=motions.get(f.id),p=new LessonTimeline(m);
  for(let i=0;i<m.POSES.length;i++){p.select(i);assert.equal(p.index,i);assert.equal(p.playing,false);assert.ok(near(p.time,i===m.POSES.length-1?m.DURATION:m.CHAPTERS[i].at));}
  p.play();assert.equal(p.time,0);p.setRate(.5);p.advance(2);p.pause();assert.equal(p.time,1);p.advance(10);assert.equal(p.time,1);
  assert.equal(poseUrl('https://tkdflow.com',2,'/'+f.id+'.html'),`https://tkdflow.com/${f.id}.html?pose=3#player`);
 }
 assert.equal(poseUrl('https://tkdflow.com',0,'//other.example/steal'), 'https://tkdflow.com/taegeuk-1.html?pose=1#player');
});
