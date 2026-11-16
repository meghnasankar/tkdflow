/* Original, concise coaching language for the existing illustrative poses.
   These cues describe the rendered study aid; they do not certify technique. */
const TECHNIQUES={
 'low-block':'Sweep your {side} arm down for a low block.',
 'middle-punch':'Punch to the middle with your {side} fist.',
 'high-punch':'Punch high with your {side} fist.',
 'high-block':'Raise your {side} forearm above your head to block.',
 'inside-block':'Sweep your {side} forearm inward across your body.',
 'outside-block':'Move your {side} forearm outward to block.',
 'inner-forearm-outward-block':'Block outward with your {side} inner forearm.',
 'knifehand-block':'Extend your {side} knifehand to block.',
 'double-knifehand-block':'Extend the front knifehand while the other hand guards your body.',
 'twin-knifehand-block':'Form the twin knifehand guard with both open hands.',
 'double-knifehand-low-block':'Lower the front knifehand while the other hand guards your body.',
 'knifehand-strike':'Strike across with the edge of your {side} hand.',
 'knifehand-inward-strike':'Strike inward with your {side} knifehand.',
 'knifehand-outward-strike':'Strike outward with your {side} knifehand.',
 'knifehand-low-block':'Sweep your {side} knifehand down to block.',
 'knifehand-high-block':'Raise your {side} knifehand above your head to block.',
 'inside-knifehand-block':'Sweep your {side} knifehand inward across your body.',
 'knifehand-side-block':'Extend your {side} knifehand out to the side.',
 'knifehand-low-opening-block':'Spread both open hands outward into the low block.',
 'spearhand':'Thrust your {side} fingertips forward with the other hand supporting.',
 'low-spearhand':'Thrust your {side} fingertips forward at a low level.',
 'low-upturned-spearhand':'Thrust your {side} fingertips low, with the palm turned upward.',
 'palm-block':'Press the attack away with your {side} palm.',
 'upward-palm-block':'Lift your {side} palm upward to block.',
 'downward-palm-block':'Press your {side} palm downward to block.',
 'palm-strike':'Drive your {side} palm forward to strike.',
 'backfist':'Strike forward with your {side} backfist.',
 'pulling-backfist':'Draw back, then strike with your {side} backfist.',
 'hammerfist':'Strike down with your {side} hammerfist.',
 'target-hammerfist':'Strike down with your {side} hammerfist toward the opposite palm.',
 'elbow-strike':'Drive your {side} elbow toward the opposite open palm.',
 'upward-elbow':'Drive your {side} elbow upward.',
 'hooking-block':'Hook and redirect with your open {side} hand.',
 'reverse-knifehand-block':'Block with the thumb side of your {side} hand.',
 'pressing-block':'Press down with your {side} palm.',
 'angle-punch':'Punch across at an angle with your {side} fist.',
 'uppercut':'Drive your {side} fist upward in an uppercut.',
 'pulling-uppercut':'Pull with one hand as your {side} fist rises in an uppercut.',
 'throat-strike':'Extend your {side} hand forward at throat level.',
 'arc-hand-strike':'Extend your {side} arc hand forward at throat level.',
 'ridgehand-strike':'Strike across with your {side} ridgehand.',
 'pushing-block':'Push your {side} palm forward to block.',
 'horizontal-punch':'Drive your {side} fist forward in a horizontal punch.',
 'knuckle-strike':'Drive the knuckles of your {side} hand forward.',
 'measuring-punch':'Extend your {side} arm to measure the target distance.',
 'circular-block':'Guide your {side} forearm around in a circular block.',
 'forearm-guarding-block':'Set your {side} forearm forward with the other arm guarding.',
 'wrist-release':'Rotate and lift your {side} wrist to release the grip.',
 'wrist-turn':'Turn your {side} wrist to change the hand position.',
 'outside-high-block':'Raise your {side} forearm outward into a high block.',
 'side-punch':'Punch out to the side with your {side} fist.',
 'knee-break':'Press down with your {side} hand while the other hand supports.',
 'target-punch':'Punch with your {side} fist toward the opposite open palm.',
 'grasp-chamber':'Draw your hands in to prepare the next technique.',
 'small-hinge':'Draw both fists back together beside your hip.',
 'large-hinge':'Open both forearms outward to the sides.',
 'twin-forearm-block':'Raise one forearm high while the other forearm blocks forward.',
 'wedging-block':'Wedge both forearms outward to separate the attack.',
 'scissor-block':'Block outward with your {side} arm as the other arm blocks low.',
 'cross-low-block':'Cross both forearms in front for a low block.',
 'knifehand-cross-low-block':'Cross both open hands in front for a low block.',
 'double-uppercut':'Drive both fists forward and upward together.',
 'mountain-block':'Raise both forearms outward into the mountain block.',
 'opening-mountain-block':'Open both arms outward into the mountain block.',
 'diamond-block':'Raise one arm high with the other forearm guarding across.',
 'diamond-middle-block':'Set one forearm high and the other forward at the middle.',
 'opening-block':'Spread both forearms outward into a middle block.',
 'low-opening-block':'Spread both forearms outward at a low level.',
 'double-low-block':'Lower both forearms outward together to block.',
 'twin-low-block':'Lower both forearms outward together to block.',
 'assisted-block':'Block with your {side} forearm, supported by the other hand.',
 'palm-assisted-outside-block':'Block outward with your {side} forearm and support it with your palm.',
 'assisted-inside-block':'Block inward with your {side} forearm, supported by the other hand.',
 'assisted-high-side-block':'Raise your {side} forearm to the side with the other hand supporting.',
 'twin-vertical-punch':'Punch forward with both fists held vertically.',
 'x-rising-block':'Cross both forearms above your head in a rising block.',
 'u-shape-block':'Hold one hand high and the other low in a U-shaped block.',
 'double-punch':'Punch forward with both fists together.',
 'swallow-strike':'Strike with your {side} knifehand as the other hand blocks above.',
 'covered-ready':'Bring your hands together in front, with one hand covering the fist.',
 'tongmilgi':'Bring both open hands together in front of your chest.',
 'double-side-elbow':'Drive both elbows outward to the sides.',
 'bull-block':'Bring both forearms up to guard above your head.',
 'rock-pushing':'Push both palms forward and upward at a steady pace.',
 'ridgehand-opening-block':'Open both ridgehands outward to block.',
 'fork-punch':'Punch forward with one fist high and the other low.',
 'assisted-backfist':'Strike with your {side} backfist while the other hand supports.',
 'ridgehand-guard':'Form a guarding position with both open ridgehands.',
 'diamond-front-punch':'Raise one arm high while the other fist punches forward.',
 'target-grab':'Reach out with your {side} hand to prepare the next strike.',
 'lifting-block':'Lift your {side} forearm upward to redirect the attack.',
 'low-side-block':'Sweep your {side} arm down and out for the low side block.',
 'bending-ready':'Chamber your {side} leg beside the supporting knee.',
 'ready':'Return your hands to the ready position.',
};
const STANCES={front:'front',walking:'walking',back:'back',fixed:'fixed',horse:'horse',cat:'cat','rear-foot':'rear-foot',low:'low',cross:'cross',parallel:'parallel',closed:'closed',crane:'one-leg','wide-parallel':'wide parallel'};
const INITIAL=['Stand ready, with your hands held in front.','Stand with your feet together and hands near your face.','Stand with your feet together and hands in front of your abdomen.'];
const TAEGEUK_ONE=[
 INITIAL[0],
 'Turn left into a walking stance. Sweep your left arm down to block.',
 'Step forward and punch to the middle with your right fist.',
 'Turn right into a walking stance. Sweep your right arm down to block.',
 'Step forward and punch to the middle with your left fist.',
 'Turn into a front stance. Block low with your left arm, then punch right.',
 'Turn right. Sweep your left forearm inward to block.',
 'Step forward and punch to the middle with your right fist.',
 'Turn left. Sweep your right forearm inward to block.',
 'Step forward and punch to the middle with your left fist.',
 'Turn into a front stance. Block low with your right arm, then punch left.',
 'Turn left and raise your left forearm above your head to block.',
 'Chamber your right knee, then extend a front kick.',
 'Land with your right foot forward and punch with your right fist.',
 'Turn right and raise your right forearm above your head to block.',
 'Chamber your left knee, then extend a front kick.',
 'Land with your left foot forward and punch with your left fist.',
 'Turn into a front stance. Sweep your left arm down to block.',
 'Step forward and punch with your right fist. Finish with a strong shout.',
 'Return to the ready position.',
];
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function actionText(a,plan){
 const side=a.side==='left'||a.side==='right'?a.side:a.leadSide||plan.entry?.lead||'front';
 if(a.type.includes('kick')){
  const kind=a.type.includes('roundhouse')?'roundhouse':a.type.includes('crescent')?'crescent':a.type.includes('side')?'side':'front';
  if(kind==='crescent')return `Swing your ${side} leg inward in a crescent toward the opposite palm.`;
  if(a.airborne||a.type.startsWith('jump-'))return `Lift off and extend a ${side} ${kind} kick.`;
  if(a.repeatedSameLeg)return `Re-chamber the same leg and extend the ${side} ${kind} kick again.`;
  return `Chamber your ${side} knee, then extend a ${(a.height||a.level)==='low'?'low ':''}${kind} kick.`;
 }
 if(a.type==='diamond-block'&&a.highSide&&a.lowSide)return `Raise your ${a.highSide} forearm above your head and block low with your ${a.lowSide} arm.`;
 if(a.type==='palm-block'&&(a.level==='downward'||a.height==='downward'))return `Press downward with your ${side} palm.`;
 if(a.type==='backfist'&&a.height==='middle')return `Strike to the middle with your ${side} backfist.`;
 if(a.type==='spearhand'&&plan.actions.some(b=>b!==a&&b.side!==a.side))return `Thrust your ${side} fingertips forward as the other hand blocks.`;
 if(a.type==='knee-strike')return `Pull your hands down as your ${side} knee rises.`;
 if(a.type==='mountain-block'&&a.side!=='both')return `Raise your ${side} arm while the other arm blocks low.`;
 if(a.type==='elbow-strike'&&a.mode==='rising')return `Drive your ${side} elbow upward.`;
 const text=TECHNIQUES[a.type];if(!text)throw new Error(`Missing spoken instruction for ${a.type}`);
 return text.replaceAll('{side}',side);
}
export function lessonSpeech({id,POSES,MOTION,reference}){
 if(id==='taegeuk-1'){
  if(POSES.length!==TAEGEUK_ONE.length)throw new Error('Original lesson narration no longer matches its poses');
  return TAEGEUK_ONE.map((text,index)=>({index,text}));
 }
 const ready=typeof reference?.ready==='string'?reference.ready:reference?.ready?.stance;
 return MOTION.referencePlans.map((plan,index)=>{
  if(index===0)return {index,text:ready==='closed-A'?INITIAL[1]:ready==='closed-B'?INITIAL[2]:ready==='tongmilgi'?'Stand ready with open hands in front of your chest.':INITIAL[0]};
  if(plan.returning)return {index,text:'Return to the ready position.'};
  const a=plan.actions,entry=plan.entry||{},stance=STANCES[entry.stance],landing=['left','right'].some(s=>plan.before.feet[s].pos[1]>.15&&plan.after.feet[s].pos[1]<.15);
  let prefix='';
  const prescribedTurn=Number(entry.turn)||0;
  if(Math.abs(prescribedTurn)>=45&&Math.abs(plan.dyaw)>1){const side=plan.dyaw>0?'left':'right';prefix=Math.abs(prescribedTurn)>=360?`Turn all the way around to the ${side}. `:Math.abs(prescribedTurn)>=270?`Make a three-quarter turn to your ${side}${stance&&!plan.kick?', then set a '+stance+' stance':''}. `:`Turn ${side}${stance&&!plan.kick?' into a '+stance+' stance':''}. `;}
  if(!prefix&&!plan.kick&&!a.some(a=>a.type==='bending-ready')){
   if(entry.stance==='crane'){
    const support=plan.after.feet.left.pos[1]<plan.after.feet.right.pos[1]?'left':'right';prefix=`Balance on your ${support} leg. `;
   }else if(entry.movingFoot===null&&Math.abs(plan.dyaw)>45)prefix=`Pivot ${plan.dyaw>0?'left':'right'} without stepping. `;
   else if(landing&&stance)prefix=`Land in a ${stance} stance. `;
   else if(entry.turn&&Math.abs(entry.turn)>=90&&plan.step){const side=entry.turn>0?'left':'right';prefix=Math.abs(entry.turn)>=360?`Turn all the way around to the ${side}. `:`Turn ${side}${stance?' into a '+stance+' stance':''}. `;}
   else if(stance&&plan.step&&['left','right'].some(s=>distance(plan.before.feet[s].pos,plan.after.feet[s].pos)>.08))prefix=`Set a ${stance} stance. `;
  }
  let text=prefix+a.map(a=>actionText(a,plan)).join(' ');
  if(POSES[index].kihap)text+=' Finish with a strong shout.';
  return {index,text};
 });
}
