import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {createFormMotion} from '../js/animation/form-motion.js';import * as original from '../js/animation/taegeuk-1-motion.js';import {POSES} from '../js/lessons/taegeuk-1-data.js';import {narratedMotion} from '../js/animation/narrated-motion.js';
const json=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url))),forms=json('data/forms.json'),base=id=>id==='taegeuk-1'?{...original,POSES}:createFormMotion(json('data/lessons/'+id+'.json')),motions=new Map(forms.map(f=>{const b=base(f.id),d=json('data/narration/'+f.id+'.json');return[f.id,{b,d,m:narratedMotion(b,d,f.id)}];})),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
test('all spoken turn directions agree with the rendered body and prescribed turn path',()=>{
 let turns=0;for(const {b,d,m} of motions.values())for(let i=1;i<d.cues.length;i++){
  const c=m.CHAPTERS[i],turn=d.cues[i].text.match(/(?:Turn|Pivot) (left|right)|Turn all the way around to the (left|right)/i),delta=m.poseAtTime(c.at).yaw-m.poseAtTime(c.start).yaw,p=b.referencePlans[i];
  if(p.entry?.turn)assert.ok(Math.sign(p.entry.turn)===Math.sign(p.dyaw),'Prescribed turn path was reversed');
  if(turn){turns++;assert.ok(((turn[1]||turn[2])==='left'?1:-1)*delta>0,d.lessonId+' pose '+(i+1));}
  if(d.cues[i].turn)assert.equal(d.cues[i].turn.side,delta>0?'left':'right');
 }assert.ok(turns>150);
 const t=motions.get('taegeuk-1').d;assert.match(t.cues[6].text,/Turn right/);assert.match(t.cues[8].text,/Turn left/);
});
test('both active arms survive simultaneous Taebaek high-block/strike and low-palm/spearhand combinations',()=>{
 const b=motions.get('taebaek').b;
 const first=b.referencePlans.find(p=>p.entry?.n===5);assert.ok(first.after.hands.left[1]>.75);assert.ok(first.after.hands.right[2]>.35);
 const second=b.referencePlans.find(p=>p.entry?.n===20);assert.ok(second.after.hands.left[1]<.2);assert.ok(second.after.hands.right[2]>.4);
});
test('source middle opening blocks, high/low diamond arms, and middle Songahm backfists are distinct',()=>{
 for(const id of ['keumgang','koryo','taegeuk-7'])for(const p of motions.get(id).b.referencePlans.filter(p=>p.actions.some(a=>a.type==='opening-block')))for(const side of ['left','right'])assert.ok(p.after.hands[side][1]>.35);
 for(const p of motions.get('keumgang').b.referencePlans.filter(p=>p.actions.some(a=>a.type==='diamond-block'))){const a=p.actions[0];assert.ok(p.after.hands[a.highSide][1]>.75);assert.ok(p.after.hands[a.lowSide][1]<.1);assert.equal(p.entry.duration,10);assert.equal(p.after.feet[p.entry.lift].pitch,65);}
 for(const n of [20,22]){const p=motions.get('songahm-3').b.referencePlans.find(p=>p.entry?.n===n);assert.equal(p.actions[0].height,'middle');assert.equal(p.after.hands[p.actions[0].side][1],.30);}
});
test('every marked kihap has one audible event at the movement finish; no extra shout at Taegeuk 1 count 10',()=>{
 let shouts=0;for(const {b,d,m} of motions.values()){
  assert.equal(d.effects.filter(e=>e.type==='kihap').length,b.POSES.filter(p=>p.kihap).length);
  for(let i=0;i<b.POSES.length;i++){const e=d.effects.filter(e=>e.type==='kihap'&&e.pose===i);assert.equal(e.length,b.POSES[i].kihap?1:0);if(e.length){shouts++;assert.ok(e[0].start>=d.cues[i].end);const at=(e[0].start+e[0].end)/2;assert.ok(m.poseAtTime(at).kihap>.9);assert.equal(m.poseAtTime(e[0].end+.01).kihap,0);}}
 }assert.ok(shouts>25);assert.equal(POSES[9].kihap,false);assert.equal(POSES[18].kihap,true);
});
test('all 23 optional effect tracks and three original effects are real, integrity-checked audio',()=>{
 const catalog=json('data/narration/catalog.json');assert.equal(catalog.soundEffects.length,3);
 for(const f of catalog.files){const d=motions.get(f.lessonId).d,bytes=fs.readFileSync(new URL('..'+d.effectsSrc,import.meta.url));assert.equal(bytes.length,f.effects.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.effects.sha256);assert.ok(d.effects.length>10);}
 for(const effect of catalog.soundEffects){const bytes=fs.readFileSync(new URL('../assets/effects/'+effect.name+'.mp3',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),effect.sha256);assert.ok(effect.duration>.05);assert.ok(effect.duration<=.7);}
});
test('narrated motion has no frame discontinuities across all 748 study poses',()=>{
 let count=0;for(const {b,d,m} of motions.values()){
  for(let i=1;i<d.chapters.length;i++){
   const c=d.chapters[i];for(const t of [c.start,c.at]){const a=m.poseAtTime(Math.max(0,t-1e-5)),z=m.poseAtTime(t+1e-5);for(const side of ['left','right'])for(const part of ['arms','legs'])for(const joint of part==='arms'?['shoulder','elbow','wrist']:['hip','knee','ankle'])assert.ok(distance(a[part][side][joint],z[part][side][joint])<.001,d.lessonId+' pose '+i+' '+joint);}
  }count+=b.CHAPTERS.length;
 }assert.equal(count,748);
});
test('explicit source hand holds remain fixed during ITF kicks, with the required opposite shoulder fist',()=>{
 for(const [id,counts]of [['do-san',[14,18]],['won-hyo',[20,23]],['yul-gok',[8,12]],['joong-gun',[2,5]]]){
  for(const n of counts){const p=motions.get(id).b.referencePlans.find(p=>p.entry?.n===n);assert.equal(p.kick.keepHands,true);assert.deepEqual(p.after.hands,p.before.hands);assert.deepEqual(p.after.open,p.before.open);}
 }
 for(const n of [2,5,14,17]){const p=motions.get('won-hyo').b.referencePlans.find(p=>p.entry?.n===n),side=p.actions[0].side,other=side==='left'?'right':'left';assert.ok(p.after.hands[other][1]>.4);}
 const t=motions.get('taegeuk-6');const kick=t.b.referencePlans.find(p=>p.entry?.n===12&&p.kick),block=t.b.referencePlans.find(p=>p.entry?.n===12&&!p.kick);assert.equal(t.b.POSES[kick.index].kihap,true);assert.equal(t.b.POSES[block.index].kihap,false);assert.equal(kick.entry.turn,0);assert.equal(block.entry.turn,90);
});
test('powerful narrated execution keeps dense speed and acceleration within the smooth-motion envelope',()=>{
 const dt=1/120;for(const {d,m} of motions.values()){let previous=m.poseAtTime(0),velocities={},maxSpeed=0,maxAcceleration=0;
  for(let n=1;n<=Math.floor(m.DURATION/dt);n++){const p=m.poseAtTime(n*dt);
   for(const side of ['left','right'])for(const [part,joints]of [['arms',['shoulder','elbow','wrist']],['legs',['hip','knee','ankle']]])for(const joint of joints){const key=side+part+joint,v=p[part][side][joint].map((x,i)=>(x-previous[part][side][joint][i])/dt);assert.ok(v.every(Number.isFinite));maxSpeed=Math.max(maxSpeed,Math.hypot(...v));if(velocities[key])maxAcceleration=Math.max(maxAcceleration,Math.hypot(...v.map((x,i)=>(x-velocities[key][i])/dt)));velocities[key]=v;}previous=p;
  }assert.ok(maxSpeed<3,d.lessonId+' speed '+maxSpeed);assert.ok(maxAcceleration<18,d.lessonId+' acceleration '+maxAcceleration);
 }
});
