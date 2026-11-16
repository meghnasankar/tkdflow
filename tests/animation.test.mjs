import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {POSES,LESSON} from '../js/lessons/taegeuk-1-data.js';
import {BODY} from '../js/animation/motion-math.js';
import {CHAPTERS,DURATION,poseAtTime,indexAtTime} from '../js/animation/taegeuk-1-motion.js';
import {LessonTimeline} from '../js/animation/lesson-timeline.js';
const sub=(a,b)=>a.map((v,i)=>v-b[i]),len=a=>Math.hypot(...a),close=(a,b,e=1e-6)=>Math.abs(a-b)<e;
const hash=p=>createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex');
test('every available lesson is converted and all original poses remain addressable',()=>{
 const forms=JSON.parse(readFileSync(new URL('../data/forms.json',import.meta.url)));
 assert.ok(forms.some(f=>f.id==='taegeuk-1'&&f.lessonUrl==='taegeuk-1.html'));
 assert.equal(CHAPTERS.length,POSES.length);assert.equal(CHAPTERS.length,20);
 assert.equal(LESSON.review.status,'pending');assert.equal(LESSON.review.reviewer,null);
 CHAPTERS.forEach((c,i)=>{assert.equal(c.index,i);assert.equal(indexAtTime(c.at),i);if(i){assert.ok(c.start>CHAPTERS[i-1].at);assert.ok(c.at>c.start);}});
});
test('complete form preserves limb lengths, floor clearance and a true return to ready',()=>{
 for(let t=0;t<=DURATION;t+=1/60){const p=poseAtTime(t);
  for(const side of ['left','right']){const a=p.arms[side],l=p.legs[side];
   assert.ok(close(len(sub(a.elbow,a.shoulder)),BODY.upperArm));assert.ok(close(len(sub(a.wrist,a.elbow)),BODY.forearm));
   assert.ok(close(len(sub(l.knee,l.hip)),BODY.thigh));assert.ok(close(len(sub(l.ankle,l.knee)),BODY.shin));
   assert.ok(l.ankle[1]>=.0699);for(const v of [a.shoulder,a.elbow,a.wrist,l.hip,l.knee,l.ankle])assert.ok(v.every(Number.isFinite));
  }
 }
 const a=poseAtTime(0),b=poseAtTime(DURATION);assert.ok(len(sub(a.pelvis,b.pelvis))<1e-8);
 for(const side of ['left','right'])assert.ok(len(sub(a.legs[side].ankle,b.legs[side].ankle))<1e-8);
});
test('dense whole-body samples have no sudden knee, elbow or ankle flips',()=>{
 const dt=1/240,velocities={};let previous=poseAtTime(0),maxAcceleration=0,maxSpeed=0;
 for(let n=1;n<=Math.floor(DURATION/dt);n++){
  const p=poseAtTime(n*dt);
  for(const side of ['left','right'])for(const [part,joints]of [['arms',['shoulder','elbow','wrist']],['legs',['hip','knee','ankle']]])for(const joint of joints){
   const key=side+part+joint,v=sub(p[part][side][joint],previous[part][side][joint]).map(x=>x/dt);maxSpeed=Math.max(maxSpeed,len(v));
   if(velocities[key])maxAcceleration=Math.max(maxAcceleration,len(sub(v,velocities[key]))/dt);velocities[key]=v;
  }previous=p;
 }
 assert.ok(maxSpeed<2,`joint speed spike ${maxSpeed}`);assert.ok(maxAcceleration<12,`joint acceleration spike ${maxAcceleration}`);
});
test('both front kicks are actually lifted and extended, and high blocks clear the head',()=>{
 for(const [i,side]of [[12,'right'],[15,'left']]){const p=poseAtTime(CHAPTERS[i].at);assert.ok(p.legs[side].ankle[1]>1);assert.ok(len(sub(p.legs[side].ankle,p.pelvis))>.8);}
 for(const [i,side]of [[11,'left'],[14,'right']]){const p=poseAtTime(CHAPTERS[i].at);assert.ok(p.arms[side].wrist[1]>p.pelvis[1]+.75);}
});
test('pause/resume and frame stepping preserve exact in-between frames',()=>{
 const p=new LessonTimeline();p.play();p.advance(2.3);p.pause();const t=p.time;p.advance(5);assert.equal(p.time,t);p.play();p.advance(.1);assert.ok(close(p.time,t+.1));
 p.step(1);assert.equal(p.playing,false);assert.ok(close(p.time*30,Math.round(p.time*30)));
 p.first();p.step(-1);assert.equal(p.time,0);p.last();p.step(1);assert.equal(p.time,DURATION);p.play();assert.equal(p.time,0);
});
test('pose links select the correct chapter, speed scales the one shared clock, and selection pauses',()=>{
 const p=new LessonTimeline();for(let i=0;i<POSES.length;i++){p.select(i,'link');assert.equal(p.index,i);assert.equal(p.playing,false);assert.equal(p.time,i===19?DURATION:CHAPTERS[i].at);}
 p.first();p.setRate(.25);p.play();p.advance(4);assert.equal(p.time,1);p.setRate(.5);p.advance(2);assert.equal(p.time,2);p.setRate(99);assert.equal(p.rate,.5);
});
test('approved artwork and vendored renderer are intact, and no photo is used on the face',()=>{
 assert.equal(hash('assets/animation/meghna-animation-atlas.jpg'),'c4f417cb0c7347c4e2ddd4ed8cbe8f6f39f5097e681f0ceaa3cdedfef888aa71');
 assert.equal(hash('assets/animation/kukkiwon-ci.png'),'4e1188b509072b4870ffbafc4470aad2e7eacd64edeec8ae933d8c710d0aa156');
 assert.equal(hash('vendor/three/three.module.js'),'104f56145899722094556490d787aae0617cc2fc3382f31df02d724ea1aee341');
 assert.equal(hash('vendor/three/three.core.js'),'613e370f76638fdef83926642bf256dc9615684922de1ce1f63a8583e5d78578');
 const avatar=readFileSync(new URL('../js/animation/avatar.js',import.meta.url),'utf8');assert.doesNotMatch(avatar,/meghna-founder|headArtwork|faceArt\.map/);
 assert.match(readFileSync(new URL('../vendor/three/LICENSE',import.meta.url),'utf8'),/MIT/);
});
test('production animation has no media service calls, credentials or lab imports',()=>{
 for(const name of readdirSync(new URL('../js/animation/',import.meta.url))){const s=readFileSync(new URL('../js/animation/'+name,import.meta.url),'utf8');assert.doesNotMatch(s,/\bfetch\(|https?:\/\/|\blabs\/|\bAIza[\w-]{20,}|xi-api-key/);}
 const source=readFileSync(new URL('../js/pages/lesson-taegeuk-1.js',import.meta.url),'utf8');assert.doesNotMatch(source,/getContext\('2d'\)|lerpPose/);
});
