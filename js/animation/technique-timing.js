/* Teaching cadence: deliberate preparation, a crisp coordinated finish, then hold.
   Slow/concentration techniques retain their prescribed pacing. */
import {clamp,minimumJerk} from './motion-math.js';
export const IMPACT=.84;
export function isDeliberate(plan){return !!(plan.returning||plan.entry?.slow||plan.entry?.duration>=5||plan.entry?.tempo==='slow'||plan.actions?.some(a=>['ready','covered-ready','tongmilgi','rock-pushing','bending-ready','measuring-punch'].includes(a.type)));}
export function driveStart(duration,scale=1,kick=false,impact=IMPACT){return impact-clamp((kick?.85:.80)/Math.max(.01,duration*scale),.08,.30);}
export function techniquePhase(u,start=0,end=1){return minimumJerk((u-start)/(end-start));}
