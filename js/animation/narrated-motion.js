/* Retimes complete body phases to leave room for their recorded instructions.
   Every pose endpoint is unchanged; the same clock drives voice and motion. */
import {clamp,minimumJerk} from './motion-math.js';
export function narrationProblem(data,base,id){
 if(data?.version!==1||data.lessonId!==id)return 'Wrong lesson narration';
 if(!/^\/assets\/narration\/[a-z0-9-]+\.mp3$/.test(data.audioSrc))return 'Unsafe narration source';
 if(!Number.isFinite(data.duration)||data.duration<base.DURATION||data.duration>3600)return 'Invalid duration';
 if(!Array.isArray(data.chapters)||data.chapters.length!==base.CHAPTERS.length||!Array.isArray(data.cues)||data.cues.length!==base.CHAPTERS.length)return 'Narration must cover every pose';
 let previousEnd=0;
 for(let i=0;i<data.chapters.length;i++){
  const c=data.chapters[i],cue=data.cues[i];
  if(c.index!==i||cue.index!==i||typeof cue.text!=='string'||!cue.text.trim())return 'Invalid pose cue';
  if(![c.start,c.at,c.duration,cue.start,cue.end].every(Number.isFinite))return 'Invalid timing';
  if(i===0&&(c.start!==0||c.at!==0))return 'Invalid ready position';
  if(i&&(c.start<data.chapters[i-1].at||c.at<=c.start||Math.abs(c.at-c.start-c.duration)>.00001||c.duration+1e-6<base.CHAPTERS[i].duration))return 'Motion phases must not be sped up';
  const windowEnd=i===0?data.chapters[1].start:c.at;
  if(cue.start<previousEnd||cue.start<c.start||cue.end<=cue.start||cue.end>windowEnd+.001)return 'Speech overlaps another movement';
  previousEnd=cue.end;
 }
 if(data.effectsSrc&&!/^\/assets\/narration\/[a-z0-9-]+-effects\.mp3$/.test(data.effectsSrc))return 'Unsafe effects source';
 if(data.effectsSrc&&(!Array.isArray(data.effects)||data.effects.some(e=>!['hand-swish','kick-swish','kihap'].includes(e.type)||!Number.isInteger(e.pose)||e.pose<1||e.pose>=data.chapters.length||![e.start,e.end,e.impact].every(Number.isFinite)||e.start<0||e.end<=e.start||e.end>data.duration||e.impact<e.start||e.impact>e.end)))return 'Invalid effect timing';
 if(data.duration<data.chapters.at(-1).at)return 'Closing pose is truncated';
 return null;
}
export function narratedMotion(base,data,id){
 const problem=narrationProblem(data,base,id);if(problem)throw new Error(problem);
 const CHAPTERS=data.chapters,DURATION=data.duration,scales=CHAPTERS.map((c,i)=>i?c.duration/base.CHAPTERS[i].duration:1),sample=base.narrationSampler?base.narrationSampler(scales):base.poseAtTime;
 function indexAtTime(t){for(let i=1;i<CHAPTERS.length;i++){if(t<CHAPTERS[i].start)return i-1;if(t<=CHAPTERS[i].at)return i;}return CHAPTERS.length-1;}
 function originalTime(raw){
  const t=clamp(raw,0,DURATION),i=indexAtTime(t);if(i===0)return 0;
  const c=CHAPTERS[i],b=base.CHAPTERS[i],u=clamp((t-c.start)/c.duration,0,1);
  return b.start+u*b.duration;
 }
 return {...base,CHAPTERS,DURATION,indexAtTime,poseAtTime:t=>{const i=indexAtTime(t),scale=i?CHAPTERS[i].duration/base.CHAPTERS[i].duration:1;const pose=sample(originalTime(t),{durationScale:scale}),shout=data.effects?.find(e=>e.type==='kihap'&&t>=e.start&&t<=e.end);pose.kihap=shout?Math.sin(Math.PI*minimumJerk((t-shout.start)/(shout.end-shout.start)))**2:0;return pose;},poseAtIndex:i=>base.poseAtTime(base.CHAPTERS[clamp(Math.trunc(i),0,CHAPTERS.length-1)].at),originalTime,narration:data};
}
