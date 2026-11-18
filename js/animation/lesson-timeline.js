/* A deterministic clock: pausing preserves the exact in-between frame.
   The page owns requestAnimationFrame; no independent limb/pose timers.
   playMove() plays one move once on the same clock and stops on its pose:
   Pause keeps that stop, while any seek, pose change or frame step clears it. */
import {CHAPTERS,DURATION,indexAtTime} from './taegeuk-1-motion.js';
import {clamp} from './motion-math.js';
export class LessonTimeline{
 constructor(motion={CHAPTERS,DURATION,indexAtTime}){this.chapters=motion.CHAPTERS;this.duration=motion.DURATION;this.indexAtTime=motion.indexAtTime;this.count=this.chapters.length;this.time=0;this.index=0;this.rate=1;this.playing=false;this.stopAt=null;this.listeners=new Set();}
 get atEnd(){return this.time>=this.duration;}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 emit(from,cause){const value={index:this.index,from,playing:this.playing,cause,time:this.time,rate:this.rate,count:this.count};for(const fn of this.listeners)fn(value);}
 select(index,cause='select'){const from=this.index;this.stopAt=null;this.index=clamp(Math.trunc(Number(index))||0,0,this.count-1);this.time=this.index===this.count-1?this.duration:this.chapters[this.index].at;this.playing=false;this.emit(from,cause);}
 seek(time,cause='seek'){const from=this.index;this.stopAt=null;this.time=clamp(Number(time)||0,0,this.duration);this.index=this.indexAtTime(this.time);this.playing=false;this.emit(from,cause);}
 next(){this.select(this.index+1,'next');}prev(){this.select(this.index-1,'prev');}first(){this.select(0,'first');}last(){this.select(this.count-1,'last');}
 play(){if(this.playing)return;const from=this.index;if(this.atEnd){this.time=0;this.index=0;}this.playing=true;this.emit(from,'play');}
 pause(){if(!this.playing)return;this.playing=false;this.emit(this.index,'pause');}
 toggle(){this.playing?this.pause():this.play();}
 /** Play move `index` once, from `start` to `stop`, then pause there. */
 playMove(index,{start,stop}){const from=this.index;this.time=clamp(Number(start)||0,0,this.duration);this.stopAt=clamp(Number(stop),this.time,this.duration);this.index=this.indexAtTime(this.time);this.playing=true;this.emit(from,'move-replay');}
 advance(seconds){if(!this.playing)return;const from=this.index,limit=this.stopAt??this.duration;this.time=Math.min(limit,this.time+Math.max(0,seconds)*this.rate);this.index=this.indexAtTime(this.time);
  if(this.stopAt!==null&&this.time>=this.stopAt){this.stopAt=null;this.playing=false;this.emit(from,'move-ended');return;}
  if(this.atEnd)this.playing=false;this.emit(from,this.atEnd?'ended':this.index===from?'tick':'advance');}
 step(direction){const frame=direction>0?Math.floor(this.time*30+1e-7)+1:Math.ceil(this.time*30-1e-7)-1;this.seek(frame/30,'frame');}
 setRate(rate){if(![.25,.5,1].includes(Number(rate)))return;this.rate=Number(rate);this.emit(this.index,'rate');}
 destroy(){this.playing=false;this.stopAt=null;this.listeners.clear();}
}
/** Where a replay of move `index` starts and stops: from the move's start through
 *  its pose and a short hold. A silent hold is capped at 1 s after the pose, but
 *  the stop never cuts that move's own speech or sound effect. The ready pose
 *  keeps its whole hold (its spoken instruction lives there) and the last pose
 *  plays to the end of the form. The stop is always before the next move starts,
 *  so the lesson stays on the replayed pose. */
export function replayWindow({CHAPTERS,DURATION},index,{cues=[],effects=[]}={}){
 const count=CHAPTERS.length,i=clamp(Math.trunc(Number(index))||0,0,count-1),c=CHAPTERS[i],start=i===0?0:c.start;
 if(i===count-1)return {index:i,start,stop:DURATION};
 const holdEnd=Math.max(start,CHAPTERS[i+1].start-1e-3);
 if(i===0)return {index:i,start,stop:holdEnd};
 const sound=Math.max(c.at,...[cues[i]].filter(Boolean).map(q=>q.end),...effects.filter(e=>e.pose===i).map(e=>e.end));
 return {index:i,start,stop:Math.min(holdEnd,Math.max(c.at+1,sound))};
}
