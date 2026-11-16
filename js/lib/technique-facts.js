/* Direction is always anatomical: the performer's left/right, from ready.
   Positive yaw is left. A camera view never changes a movement command. */
import {IMPACT,isDeliberate} from '../animation/technique-timing.js';
export function turnFact(plan){
 if(!plan||plan.returning||plan.kind==='ready')return null;
 const requested=plan.entry?Number(plan.entry.turn)||0:plan.dyaw||0;
 if(Math.abs(requested)<45||Math.abs(plan.dyaw||0)<1)return null;
 return {side:plan.dyaw>0?'left':'right',degrees:Math.abs(requested)};
}
export function techniqueFacts(motion,poses){
 return motion.CHAPTERS.map((_,index)=>{
  const p=motion.referencePlans?.[index],slow=p?isDeliberate(p):false,kick=!!p?.kick||p?.kind==='kick';
  const active=index>0&&p&&!slow&&p.kind!=='ready';
  return {index,turn:turnFact(p),kihap:!!poses[index].kihap,slow,
   impacts:!active?[]:p.kind==='combo'?[{phase:.46,type:'hand'},{phase:IMPACT,type:'hand'}]:[{phase:IMPACT,type:kick?'kick':'hand'}]};
 });
}
