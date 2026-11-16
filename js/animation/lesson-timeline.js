/* A deterministic clock: pausing preserves the exact in-between frame.
   The page owns requestAnimationFrame; no independent limb/pose timers. */
import {CHAPTERS,DURATION,indexAtTime} from './taegeuk-1-motion.js';
import {clamp} from './motion-math.js';
export class LessonTimeline{
 constructor(){this.count=CHAPTERS.length;this.time=0;this.index=0;this.rate=1;this.playing=false;this.listeners=new Set();}
 get atEnd(){return this.time>=DURATION;}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 emit(from,cause){const value={index:this.index,from,playing:this.playing,cause,time:this.time,rate:this.rate,count:this.count};for(const fn of this.listeners)fn(value);}
 select(index,cause='select'){const from=this.index;this.index=clamp(Math.trunc(Number(index))||0,0,this.count-1);this.time=this.index===this.count-1?DURATION:CHAPTERS[this.index].at;this.playing=false;this.emit(from,cause);}
 seek(time,cause='seek'){const from=this.index;this.time=clamp(Number(time)||0,0,DURATION);this.index=indexAtTime(this.time);this.playing=false;this.emit(from,cause);}
 next(){this.select(this.index+1,'next');}prev(){this.select(this.index-1,'prev');}first(){this.select(0,'first');}last(){this.select(this.count-1,'last');}
 play(){if(this.playing)return;const from=this.index;if(this.atEnd){this.time=0;this.index=0;}this.playing=true;this.emit(from,'play');}
 pause(){if(!this.playing)return;this.playing=false;this.emit(this.index,'pause');}
 toggle(){this.playing?this.pause():this.play();}
 advance(seconds){if(!this.playing)return;const from=this.index;this.time=Math.min(DURATION,this.time+Math.max(0,seconds)*this.rate);this.index=indexAtTime(this.time);if(this.atEnd)this.playing=false;this.emit(from,this.atEnd?'ended':this.index===from?'tick':'advance');}
 step(direction){const frame=direction>0?Math.floor(this.time*30+1e-7)+1:Math.ceil(this.time*30-1e-7)-1;this.seek(frame/30,'frame');}
 setRate(rate){if(![.25,.5,1].includes(Number(rate)))return;this.rate=Number(rate);this.emit(this.index,'rate');}
 destroy(){this.playing=false;this.listeners.clear();}
}
