/* Complete visual conversion of the existing twenty-pose lesson.
   Draft study aid: not instructor-reviewed. One clock drives the shared rig. */
import {POSES} from '../lessons/taegeuk-1-data.js';
import {BODY,clamp,add,sub,scale,norm,rotY,rotX,solveTwoBone,softArmTarget,minimumJerk} from './motion-math.js';
const mix=(a,b,u)=>a+(b-a)*u,mix3=(a,b,u)=>a.map((v,i)=>mix(v,b[i],u));
const phase=(u,a=0,b=1)=>minimumJerk((u-a)/(b-a));
const arc=u=>Math.sin(Math.PI*clamp(u,0,1))**2;
const sign=side=>side==='left'?1:-1;
const heading={'←':90,'→':-90,'↑':0,'↓':180,'↕':0};
const actions=[
 ['ready',null,null],['low','left','left'],['punch','right','right'],['low','right','right'],['punch','left','left'],
 ['combo','left','left'],['inside','left','right'],['punch','right','left'],['inside','right','left'],['punch','left','right'],
 ['combo','right','right'],['high','left','left'],['kick','right','left'],['punch','right','right'],['high','right','right'],
 ['kick','left','right'],['punch','left','left'],['low','left','left'],['punch','right','right'],['ready',null,null],
];
const neutral={left:[.085,.08,.21],right:[-.085,.08,.21]};
const basePoles={left:[.45,.25,-.15],right:[-.45,.25,-.15]};
function armTargets(kind,side){
 const hands={left:[...neutral.left],right:[...neutral.right]},poles={left:[...basePoles.left],right:[...basePoles.right]};
 if(kind==='ready')return{hands,poles};
 if(kind==='kick'){
  for(const s of ['left','right']){hands[s]=[sign(s)*.16,.35,.23];poles[s]=[sign(s)*.44,.20,.14];}
  return{hands,poles};
 }
 const other=side==='left'?'right':'left',sx=sign(side);hands[other]=[sign(other)*.15,.05,0];
 if(kind==='low'){hands[side]=[sx*.11,.04,.38];poles[side]=[sx*.48,.28,.05];}
 if(kind==='punch'){hands[side]=[sx*.15,.30,.52];poles[side]=[sx*.46,.25,.08];}
 if(kind==='inside'){hands[side]=[-sx*.015,.37,.33];poles[side]=[sx*.35,.16,.19];}
 if(kind==='high'){hands[side]=[sx*.14,.82,.16];poles[side]=[sx*.44,.57,.06];}
 return{hands,poles};
}
function chamber(kind,side){
 if(kind==='ready'||kind==='kick')return armTargets(kind,side);
 const t=armTargets('punch',side),other=side==='left'?'right':'left',sx=sign(side);
 t.hands[other]=[sign(other)*.09,.18,.38];
 t.hands[side]=kind==='punch'?[sx*.15,.06,0]:kind==='inside'?[sx*.33,.38,.25]:kind==='high'?[-sx*.10,.26,.20]:[-sx*.12,.45,.15];
 t.poles[side]=[sx*.34,.18,.22];return t;
}
function deltaYaw(from,to,desc=''){
 let d=((to-from+540)%360)-180;
 if(Math.abs(d+180)<1e-7&&!/right 180/i.test(desc))d=180;
 return d;
}
const initial={yaw:0,pelvis:[0,1,0],feet:{left:{pos:[.15,.07,0],yaw:0,pitch:0},right:{pos:[-.15,.07,0],yaw:0,pitch:0}},...armTargets('ready')};
const plans=[];let prior=initial,at=0;
for(let i=0;i<POSES.length;i++){
 if(i===0){plans.push({index:0,start:0,at:0,before:initial,after:initial,kind:'ready'});continue;}
 const [kind,side,front]=actions[i],yaw=heading[POSES[i].dir],dyaw=deltaYaw(prior.yaw,yaw,POSES[i].desc),isFront=i===5||i===10||i===17||i===18;
 const duration=kind==='combo'?4.2:kind==='kick'?2.6:i===19?3.6:2.8;
 const start=Number((at+(i===1?1.5:.7)).toFixed(3));at=Number((start+duration).toFixed(3));
 const feet=Object.fromEntries(['left','right'].map(s=>[s,{pos:[...prior.feet[s].pos],yaw:prior.feet[s].yaw,pitch:0}]));
 const moving=kind==='kick'?side:i===19?'left':front,support=moving==='left'?'right':'left';
 let pelvis;
 if(kind==='kick'){
  pelvis=add(feet[support].pos,rotY([sign(side)*.07,.92,-.02],yaw));
  feet[side]={pos:add(pelvis,rotY([sign(side)*.095,.13,.83],yaw)),yaw,pitch:-55};
 }else if(i===19){
  feet.left={pos:[.15,.07,0],yaw:0,pitch:0};feet.right={pos:[-.15,.07,0],yaw:0,pitch:0};pelvis=[0,1,0];
 }else{
  const supportYaw=yaw+(isFront?sign(support)*15:0),ball=add(feet[support].pos,rotY([0,0,BODY.ballOffset],feet[support].yaw));
  feet[support]={pos:sub(ball,rotY([0,0,BODY.ballOffset],supportYaw)),yaw:supportYaw,pitch:0};
  feet[moving]={pos:add(feet[support].pos,rotY([sign(moving)*.18,0,isFront?.50:.34],yaw)),yaw,pitch:0};
  pelvis=scale(add(feet.left.pos,feet.right.pos),.5);pelvis[1]=isFront?.95:.98;
 }
 const finishKind=kind==='combo'?'punch':kind,finishSide=kind==='combo'?(side==='left'?'right':'left'):side;
 const after={yaw,pelvis,feet,lean:kind==='kick'?-2:kind==='ready'?0:1.5,...armTargets(finishKind,finishSide)};
 plans.push({index:i,start,at,duration,before:prior,after,kind,side,front,moving,support,dyaw,landing:actions[i-1][0]==='kick'});prior=after;
}
export const CHAPTERS=Object.freeze(plans.map(({index,start,at,duration=0})=>Object.freeze({index,start,at,duration})));
export const DURATION=Number((CHAPTERS.at(-1).at+.8).toFixed(3));
export function indexAtTime(t){
 for(let i=1;i<plans.length;i++){if(t<plans[i].start)return i-1;if(t<=plans[i].at)return i;}
 return plans.length-1;
}
function armPath(plan,u){
 const {kind,side,before,after}=plan;
 if(kind==='ready'||kind==='kick')return {hands:mixHands(before.hands,after.hands,phase(u)),poles:mixHands(before.poles,after.poles,phase(u))};
 const mid=chamber(kind==='combo'?'low':kind,side);
 if(kind==='combo'){
  const block=armTargets('low',side);
  if(u<.30)return {hands:mixHands(before.hands,mid.hands,phase(u,0,.30)),poles:mixHands(before.poles,mid.poles,phase(u,0,.30))};
  if(u<.63)return {hands:mixHands(mid.hands,block.hands,phase(u,.30,.63)),poles:mixHands(mid.poles,block.poles,phase(u,.30,.63))};
  return {hands:mixHands(block.hands,after.hands,phase(u,.63,1)),poles:mixHands(block.poles,after.poles,phase(u,.63,1))};
 }
 if(u<.42)return {hands:mixHands(before.hands,mid.hands,phase(u,0,.42)),poles:mixHands(before.poles,mid.poles,phase(u,0,.42))};
 const v=phase(u,.42,1),hands=mixHands(mid.hands,after.hands,v);
 if(kind==='low'){hands[side][0]+=sign(side)*.04*arc(v);hands[side][2]+=.03*arc(v);}
 return {hands,poles:mixHands(mid.poles,after.poles,v)};
}
const mixHands=(a,b,u)=>Object.fromEntries(['left','right'].map(s=>[s,mix3(a[s],b[s],u)]));
function solvePose({pelvis,yaw,feet,hands,poles,lean=0,twist=0,headYaw=0},t){
 const chestYaw=yaw+twist,chestToWorld=p=>add(pelvis,rotY(rotX(p,lean),chestYaw)),legs={},arms={};
 for(const side of ['left','right']){
  const sx=sign(side),foot=feet[side],hip=add(pelvis,rotY([sx*BODY.hipOffset[0],BODY.hipOffset[1],0],yaw));
  // The anatomical side axis defines a continuous knee plane. As the
  // leg rises for a kick, forward bend rotates upward without a pole flip.
  const v=sub(foot.pos,hip),lateral=rotY([1,0,0],foot.yaw);
  const bend=norm([v[1]*lateral[2]-v[2]*lateral[1],v[2]*lateral[0]-v[0]*lateral[2],v[0]*lateral[1]-v[1]*lateral[0]]);
  const pole=add(hip,add(scale(bend,.6),scale(lateral,sx*.025)));
  const leg=solveTwoBone(hip,foot.pos,BODY.thigh,BODY.shin,pole);
  legs[side]={hip,knee:leg.joint,ankle:leg.end,yaw:foot.yaw,pitch:foot.pitch};
  const shoulder=chestToWorld([sx*BODY.shoulderOffset[0],BODY.shoulderOffset[1],0]);
  const target=softArmTarget(shoulder,chestToWorld(hands[side]),BODY.upperArm,BODY.forearm);
  const arm=solveTwoBone(shoulder,target,BODY.upperArm,BODY.forearm,chestToWorld([sx*.62,.18,.22]));
  arms[side]={shoulder,elbow:arm.joint,wrist:arm.end};
 }
 return{t,pelvis,yaw,chestYaw,lean,headYaw,breath:0,arms,legs};
}
export function poseAtTime(rawT){
 const t=clamp(rawT,0,DURATION),i=indexAtTime(t),plan=plans[i];
 if(i===0)return solvePose(initial,t);
 const u=clamp((t-plan.start)/plan.duration,0,1),step=phase(u,0,plan.kind==='combo'?.63:1),q=phase(u);
 const yaw=plan.before.yaw+plan.dyaw*q,pelvis=mix3(plan.before.pelvis,plan.after.pelvis,step);
 if(plan.kind!=='kick'&&i!==19){const shift=rotY([-sign(plan.moving)*.035*arc(step),-.012*arc(step),0],yaw);for(let c=0;c<3;c++)pelvis[c]+=shift[c];}
 const feet={};
 for(const side of ['left','right']){
  const a=plan.before.feet[side],b=plan.after.feet[side],fyaw=a.yaw+deltaYaw(a.yaw,b.yaw,POSES[i].desc)*q;
  let pos;
  if(i===19){const f=phase(u,side==='right'?0:.45,side==='right'?.55:1);pos=mix3(a.pos,b.pos,f);pos[1]+=.065*arc(f);}
  else if(plan.kind==='kick'&&side===plan.side){
   const knee=add(pelvis,rotY([sign(side)*.095,-.22,.14],yaw)),end=add(pelvis,rotY([sign(side)*.095,.13,.83],yaw));
   pos=u<.55?mix3(a.pos,knee,phase(u,0,.55)):mix3(knee,end,phase(u,.55,1));
  }else if(side===plan.support){
   const ball=add(a.pos,rotY([0,0,BODY.ballOffset],a.yaw));pos=sub(ball,rotY([0,0,BODY.ballOffset],fyaw));
  }else if(plan.landing){
   const chamber=add(pelvis,rotY([sign(side)*.095,-.22,.14],yaw));
   pos=u<.35?mix3(a.pos,chamber,phase(u,0,.35)):mix3(chamber,b.pos,phase(u,.35,1));
  }else{
   pos=mix3(a.pos,b.pos,step);pos[1]+=.068*arc(step);
   const detour=rotY([sign(side)*.04*arc(step),0,0],yaw);pos=add(pos,detour);
  }
  feet[side]={pos,yaw:fyaw,pitch:mix(a.pitch||0,b.pitch||0,q)};
 }
 if(i===19){pelvis[0]=(feet.left.pos[0]+feet.right.pos[0])/2;pelvis[2]=(feet.left.pos[2]+feet.right.pos[2])/2;pelvis[1]=mix(plan.before.pelvis[1],1,q)-.04*arc(q);}
 const arms=armPath(plan,u),lean=mix(plan.before.lean||0,plan.after.lean||0,q)+.6*arc(q);
 return solvePose({pelvis,yaw,feet,...arms,lean:i===19?lean+6*arc(phase(u,.6,1)):lean,twist:-3*arc(q),headYaw:clamp(plan.dyaw*.045,-8,8)*arc(q)},t);
}
export function poseAtIndex(i){return poseAtTime(CHAPTERS[clamp(Math.trunc(i),0,CHAPTERS.length-1)].at);}
