import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFormMotion} from '../js/animation/form-motion.js';
import * as original from '../js/animation/taegeuk-1-motion.js';
import {narratedMotion,narrationProblem} from '../js/animation/narrated-motion.js';
import {createLessonAudio} from '../js/lib/lesson-audio.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),json=p=>JSON.parse(read(p));
const forms=json('data/forms.json'),catalog=json('data/narration/catalog.json');
const baseFor=id=>id==='taegeuk-1'?original:createFormMotion(json(`data/lessons/${id}.json`));
const near=(a,b)=>Math.abs(a-b)<1e-6;
test('all 23 lessons have real ElevenLabs audio covering all 748 poses',()=>{
 assert.equal(catalog.files.length,23);assert.equal(catalog.provider,'ElevenLabs');assert.equal(catalog.stockVoice,true);assert.equal(catalog.voiceCloning,false);assert.equal(catalog.generationRequests,6);
 let cues=0;
 for(const f of forms){const d=json(`data/narration/${f.id}.json`),base=baseFor(f.id),record=catalog.files.find(r=>r.lessonId===f.id);
  assert.equal(narrationProblem(d,base,f.id),null);assert.equal(d.provider,'ElevenLabs');cues+=d.cues.length;
  const file=new URL('..'+d.audioSrc,import.meta.url),bytes=readFileSync(file);assert.equal(statSync(file).size,record.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);assert.ok(Math.abs(record.audio_duration-d.duration)<.15);
  const html=read(f.lessonUrl);for(const id of ['voice-toggle','voice-instruction','lesson-audio','voice-status'])assert.match(html,new RegExp(`id="${id}"`));
  for(const c of d.cues){assert.ok(c.text.length>15);assert.doesNotMatch(c.text,/DTaF|source typo|reference edition|API|https?:/i);}
 }assert.equal(cues,748);
});
test('voice timing preserves pose endpoints while allowing a crisp execution within each complete phase',()=>{
 for(const f of forms){const base=baseFor(f.id),d=json(`data/narration/${f.id}.json`),motion=narratedMotion(base,d,f.id);
  assert.equal(motion.CHAPTERS.length,base.CHAPTERS.length);assert.ok(motion.DURATION>=base.DURATION);
  for(let i=1;i<motion.CHAPTERS.length;i++){
   const c=motion.CHAPTERS[i],b=base.CHAPTERS[i];assert.ok(c.duration+1e-6>=b.duration);assert.ok(d.cues[i].end<=c.at+.001);
   for(const u of [0,1]){
    const p=motion.poseAtTime(c.start+u*c.duration),q=base.poseAtTime(b.start+u*b.duration);
    for(const side of ['left','right'])for(const part of ['arms','legs'])for(const joint of part==='arms'?['shoulder','wrist']:['hip','ankle'])assert.ok(p[part][side][joint].every((v,n)=>near(v,q[part][side][joint][n])),`${f.id} pose ${i+1}`);
   }
  }
 }
});
test('invalid, partial, overlapping or external narration data is refused',()=>{
 const base=original,d=json('data/narration/taegeuk-1.json');
 assert.ok(narrationProblem({...d,audioSrc:'https://other.example/voice.mp3'},base,'taegeuk-1'));
 assert.ok(narrationProblem({...d,lessonId:'other'},base,'taegeuk-1'));
 assert.ok(narrationProblem({...d,cues:d.cues.slice(1)},base,'taegeuk-1'));
 const wrong=structuredClone(d);wrong.cues[2].start=wrong.cues[1].start;assert.ok(narrationProblem(wrong,base,'taegeuk-1'));
});
function mockAudio(){return {readyState:3,currentTime:0,playbackRate:1,paused:true,seeking:false,muted:false,preservesPitch:false,plays:0,pauses:0,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},play(){this.plays++;this.paused=false;return Promise.resolve();},pause(){this.pauses++;this.paused=true;}};}
test('audio follows seeking, quarter speed, pause, mute and resume on the lesson clock',async()=>{
 const a=mockAudio(),voice=createLessonAudio(a);assert.equal(a.plays,0);assert.equal(a.preservesPitch,true);
 assert.equal(voice.update({time:4,playing:true,rate:.25}),true);assert.equal(a.currentTime,4);assert.equal(a.playbackRate,.25);assert.equal(a.plays,1);await Promise.resolve();
 voice.update({time:4.05,playing:false,rate:.25});assert.equal(a.paused,true);
 voice.setEnabled(false);voice.update({time:20,playing:true,rate:1});assert.equal(a.paused,true);assert.equal(a.plays,1);
 voice.setEnabled(true);voice.update({time:20,playing:true,rate:.5});assert.equal(a.currentTime,20);assert.equal(a.playbackRate,.5);assert.equal(a.plays,2);
});
test('buffering holds the motion clock and a failed voice releases it safely',async()=>{
 const a=mockAudio();a.readyState=0;let now=0,failures=0;const voice=createLessonAudio(a,{now:()=>now,timeoutMs:100,onFail:()=>failures++});
 assert.equal(voice.update({time:0,playing:true,rate:1}),false);assert.equal(a.muted,true);await Promise.resolve();
 assert.equal(voice.update({time:0,playing:true,rate:1}),false);assert.equal(a.plays,1);
 now=101;assert.equal(voice.update({time:0,playing:true,rate:1}),true);assert.equal(voice.available,false);assert.equal(a.paused,true);assert.equal(failures,1);
 a.listeners.error();assert.equal(failures,1);
});
test('a cancelled play promise cannot disable narration after the user pauses',async()=>{
 const a=mockAudio();let reject; a.play=function(){this.paused=false;return new Promise((_,b)=>{reject=b;});};
 const voice=createLessonAudio(a);voice.update({time:0,playing:true,rate:1});voice.stop();reject(new Error('cancelled'));await Promise.resolve();assert.equal(voice.available,true);
});
test('a padded audio tail never restarts at zero before the visual lesson ends',()=>{
 const a=mockAudio();a.ended=true;a.duration=10;a.currentTime=10;
 const voice=createLessonAudio(a);assert.equal(voice.update({time:9.9,playing:true,rate:1}),true);assert.equal(a.plays,0);
 a.ended=false;voice.update({time:2,playing:true,rate:1});assert.equal(a.currentTime,2);assert.equal(a.plays,1);
});
