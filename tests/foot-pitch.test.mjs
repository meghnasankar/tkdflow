/* Feet on the floor stand flat. A kick, a bending-ready stance or a stance that keeps the previous feet
   must not carry the last kick's foot pitch onto a grounded foot, and a landing foot finishes flattening
   as it reaches the floor. Kicks in the air keep their pitch. Positions and timing are unchanged. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFormMotion} from '../js/animation/form-motion.js';
import * as T1 from '../js/animation/taegeuk-1-motion.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),forms=JSON.parse(read('data/forms.json'));
const motions=forms.map(f=>[f.id,f.id==='taegeuk-1'?T1:createFormMotion(JSON.parse(read(`data/lessons/${f.id}.json`)))]);
const motion=id=>motions.find(([k])=>k===id)[1],held=(m,pose)=>m.poseAtTime(m.CHAPTERS[pose-1].at??m.CHAPTERS[pose-1].start);
const GROUNDED=.075;

test('in all 23 lessons, a foot on the floor is never pitched (every frame at 30 fps)',()=>{
 let checked=0;
 for(const [id,m] of motions)for(let t=0;t<=m.DURATION;t+=1/30){
  const p=m.poseAtTime(t);
  for(const s of ['left','right']){const l=p.legs[s];if(l.ankle[1]>GROUNDED)continue;checked++;
   assert.ok(Math.abs(l.pitch||0)<=5,`${id} t=${t.toFixed(2)} ${s}: grounded foot pitched ${(l.pitch||0).toFixed(1)}°`);}
 }
 assert.ok(checked>100000,`many grounded feet checked (${checked})`);
});

test('consecutive opposite-leg kicks: the supporting foot is flat even though it just kicked',()=>{
 // The poses a read-only scan of 97f75f9 flagged: the supporting foot kept the previous kick's pitch.
 for(const [id,pose,side] of [['taegeuk-4',10,'left'],['taegeuk-8',5,'right'],['taegeuk-8',28,'left'],['pyongwon',8,'right'],['pyongwon',21,'left'],['jitae',31,'right'],['jitae',32,'right'],['jitae',33,'right'],['songahm-3',5,'right'],['songahm-3',27,'left']]){
  const l=held(motion(id),pose).legs[side];
  assert.ok(l.ankle[1]<=GROUNDED,`${id} pose ${pose} ${side} is on the floor`);assert.equal(l.pitch,0,`${id} pose ${pose} ${side} stands flat`);
 }
 // Taegeuk Sa Jang 9 → 10: the left leg side-kicks, then supports the right side kick.
 const m=motion('taegeuk-4');assert.equal(held(m,9).legs.left.pitch,-85);assert.equal(held(m,10).legs.left.pitch,0);
});

test('kicks in the air keep their pitch, and a landing foot is flat by the time it touches down',()=>{
 const m=motion('taegeuk-4');
 assert.equal(held(m,7).legs.right.pitch,-50,'front kick');assert.equal(held(m,10).legs.right.pitch,-85,'side kick');
 for(const [id,pose,side] of [['won-hyo',28,'right'],['joong-gun',4,'left'],['taegeuk-8',17,'right']]){
  const mm=motion(id),c=mm.CHAPTERS[pose-1];let landed=null,lastPitch=null;
  for(let t=c.start;t<=(c.at??c.start)+1e-9;t+=1/60){const l=mm.poseAtTime(t).legs[side];if(landed===null&&l.ankle[1]<=GROUNDED)landed=t;if(landed!==null)lastPitch=l.pitch;if(landed!==null&&t-landed<.05)assert.ok(Math.abs(l.pitch)<=5,`${id} pose ${pose}: ${l.pitch.toFixed(1)}° at touchdown`);}
  assert.ok(landed!==null,`${id} pose ${pose}: the ${side} foot lands`);
 }
});
