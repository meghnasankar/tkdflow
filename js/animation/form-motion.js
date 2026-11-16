/* Source-specific movement plans, retargeted to the approved connected rig.
   Geometry and timing are illustrative; source counts remain separate from poses. */
import {BODY,clamp,add,sub,scale,norm,rotY,rotX,solveTwoBone,softArmTarget,minimumJerk} from './motion-math.js';
import {IMPACT,isDeliberate,driveStart} from './technique-timing.js';
const sides=['left','right'],sign=s=>s==='left'?1:-1,other=s=>s==='left'?'right':'left';
const mix=(a,b,u)=>a+(b-a)*u,mix3=(a,b,u)=>a.map((v,i)=>mix(v,b[i],u));
const phase=(u,a=0,b=1)=>minimumJerk((u-a)/(b-a));
const arc=u=>Math.sin(Math.PI*clamp(u,0,1))**2;
const yawDelta=(a,b)=>((b-a+540)%360)-180;
function movingFoot(entry){
 if(Object.hasOwn(entry,'movingFoot'))return entry.movingFoot;
 const action=entry.footAction||'';
 if(/^(turn|spin)/.test(action)&&entry.lead)return entry.lead;
 return /right/.test(action)?'right':/left/.test(action)?'left':entry.step||entry.lead||'left';
}
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
function transportBetween(from,to,bend){const k=cross(from,to),c=dot(from,to);if(c<-.99)return bend;return norm(add(add(bend,cross(k,bend)),scale(cross(k,cross(k,bend)),1/(1+c))));}
// Parallel transport from a neutral downward limb, without an IK pole switch.
function transportedBend(direction,neutral){
 const k=[-direction[2],0,direction[0]],c=-direction[1],kv=cross(k,neutral);
 return norm(add(add(neutral,kv),scale(cross(k,kv),1/Math.max(.001,1+c))));
}
const smoothMin=(a,b,k=.018)=>Math.min(a,b)-k*Math.log1p(Math.exp(-Math.abs(a-b)/k));
function sphericalHand(a,b,u,side){
 const shoulder=[sign(side)*BODY.shoulderOffset[0],BODY.shoulderOffset[1],0],va=sub(a,shoulder),vb=sub(b,shoulder),la=Math.hypot(...va),lb=Math.hypot(...vb),na=norm(va),nb=norm(vb),angle=Math.acos(clamp(dot(na,nb),-1,1));
 let direction;
 if(angle<.001)direction=norm(mix3(na,nb,u));
 else if(angle>Math.PI-.12){const middle=[0,-.15,.9887],first=u<.5,from=first?na:middle,to=first?middle:nb,v=minimumJerk(first?u*2:(u-.5)*2),theta=Math.acos(clamp(dot(from,to),-1,1));direction=norm(add(scale(from,Math.sin((1-v)*theta)),scale(to,Math.sin(v*theta))));}
 else direction=add(scale(na,Math.sin((1-u)*angle)/Math.sin(angle)),scale(nb,Math.sin(u*angle)/Math.sin(angle)));
 return add(shoulder,scale(direction,mix(la,lb,u)));
}
const targets={
 'low-block':s=>[s*.12,.04,.37],
 'middle-punch':s=>[s*.15,.30,.52],
 'high-punch':s=>[s*.13,.53,.48],
 'high-block':s=>[s*.14,.82,.16],
 'inside-block':s=>[-s*.015,.37,.33],
 'outside-block':s=>[s*.28,.42,.31],
 'inner-forearm-outward-block':s=>[s*.28,.42,.31],
 'knifehand-block':s=>[s*.18,.37,.38],
 'knifehand-strike':s=>[-s*.03,.51,.42],
 'knifehand-inward-strike':s=>[-s*.03,.51,.42],
 'knifehand-outward-strike':s=>[s*.31,.49,.31],
 'spearhand':s=>[s*.10,.34,.49],
 'palm-block':s=>[s*.10,.29,.36],
 'upward-palm-block':s=>[s*.11,.35,.35],
 'backfist':s=>[s*.20,.55,.39],
 'hammerfist':s=>[s*.21,.10,.35],
 'elbow-strike':s=>[-s*.14,.33,.19],
 'hooking-block':s=>[s*.19,.47,.37],
 'reverse-knifehand-block':s=>[s*.25,.48,.32],
 'pressing-block':s=>[s*.12,.13,.34],
 'angle-punch':s=>[-s*.11,.43,.27],
 'uppercut':s=>[s*.12,.37,.31],
 'throat-strike':s=>[s*.12,.49,.43],
 'ridgehand-strike':s=>[-s*.06,.51,.39],
 'low-spearhand':s=>[s*.12,.03,.38],
 'downward-palm-block':s=>[s*.11,.11,.37],
 'pushing-block':s=>[s*.13,.38,.40],
 'horizontal-punch':s=>[s*.24,.35,.43],
 'knuckle-strike':s=>[s*.14,.42,.39],
 'measuring-punch':s=>[s*.15,.30,.47],
 'circular-block':s=>[s*.10,.32,.40],
 'forearm-guarding-block':s=>[s*.20,.40,.32],
 'upward-elbow':s=>[s*.07,.47,.10],
 'wrist-release':s=>[s*.13,.53,.30],
 'knifehand-low-block':s=>[s*.12,.04,.37],
 'knifehand-high-block':s=>[s*.14,.82,.16],
 'outside-high-block':s=>[s*.24,.59,.27],
 'palm-strike':s=>[s*.12,.51,.42],
 'inside-knifehand-block':s=>[-s*.015,.37,.33],
 'side-punch':s=>[s*.15,.30,.52],
 'pulling-uppercut':s=>[s*.12,.38,.32],
 'arc-hand-strike':s=>[s*.12,.49,.43],
 'knee-break':s=>[s*.10,.02,.37],
 'knifehand-side-block':s=>[s*.32,.35,.11],
 'target-punch':s=>[s*.14,.33,.48],
 'grasp-chamber':s=>[s*.13,.17,.17],
 'low-upturned-spearhand':s=>[s*.13,.02,.36],
 'target-hammerfist':s=>[s*.16,.11,.38],
 'small-hinge':s=>[s*.24,.33,.18],
 'pulling-backfist':s=>[s*.20,.53,.33],
 'wrist-turn':s=>[s*.18,.38,.31],
 'target-grab':s=>[s*.17,.38,.43],
 'lifting-block':s=>[s*.13,.53,.40],
 'low-side-block':s=>[s*.22,.04,.30],
};
const openTypes=new Set(['knifehand-block','double-knifehand-block','twin-knifehand-block','knifehand-strike','knifehand-inward-strike','knifehand-outward-strike','knifehand-low-block','knifehand-high-block','inside-knifehand-block','spearhand','palm-block','palm-strike','upward-palm-block','hooking-block','reverse-knifehand-block','pressing-block','throat-strike','ridgehand-strike','low-spearhand','downward-palm-block','pushing-block','swallow-strike','knifehand-side-block','arc-hand-strike','knee-break','low-upturned-spearhand','grasp-chamber','knifehand-low-opening-block']);
const compoundTypes=new Set(['double-knifehand-block','twin-knifehand-block','double-knifehand-low-block','twin-forearm-block','scissor-block','cross-low-block','knifehand-cross-low-block','double-uppercut','mountain-block','diamond-block','diamond-middle-block','opening-block','low-opening-block','knifehand-low-opening-block','assisted-block','twin-vertical-punch','x-rising-block','u-shape-block','double-punch','double-low-block','twin-low-block','wedging-block','large-hinge','swallow-strike','covered-ready','tongmilgi','assisted-high-side-block','double-side-elbow','bull-block','palm-assisted-outside-block','opening-mountain-block','rock-pushing','ridgehand-opening-block','fork-punch','assisted-backfist','ridgehand-guard','diamond-front-punch','assisted-inside-block']);
export const SUPPORTED_TECHNIQUES=Object.freeze([...Object.keys(targets),...compoundTypes,'front-kick','side-kick','turning-side-kick','roundhouse-kick','crescent-kick','knee-strike','jump-front-kick','jump-side-kick','double-front-kick','bending-ready','ready']);
function neutral(){return {hands:{left:[.085,.08,.21],right:[-.085,.08,.21]},open:{left:0,right:0},roll:{left:0,right:0}};}
function armTargets(actions,bodyHeading=0){
 const state=neutral(),activeSides=new Set(actions.filter(a=>!a.type.includes('kick')&&!['knee-strike','bending-ready','ready'].includes(a.type)).flatMap(a=>a.side==='both'?sides:[a.side]));
 for(const action of actions){
  const {type}=action,side=(action.side==='both'?action.leadSide:action.side)==='right'?'right':'left',s=sign(side),o=other(side);
  if(type==='ready')continue;
  if(type.includes('kick')||type==='knee-strike'||type==='bending-ready'){
   for(const v of sides)if(!activeSides.has(v))state.hands[v]=[sign(v)*.16,.35,.23];continue;
  }
  if(!activeSides.has(o))state.hands[o]=[sign(o)*.15,.05,0];
  if(targets[type])state.hands[side]=targets[type](s);
  else if(type==='double-knifehand-block'||type==='twin-knifehand-block'){
   state.hands[side]=[s*.18,.37,.38];state.hands[o]=[-s*.04,.26,.21];
  }else if(type==='double-knifehand-low-block'){
   state.hands[side]=[s*.13,.04,.37];state.hands[o]=[-s*.04,.25,.21];state.open.left=state.open.right=1;
  }else if(type==='twin-forearm-block'){
   state.hands[side]=[s*.22,.48,.29];state.hands[o]=[-s*.21,.73,.15];
  }else if(type==='scissor-block'){
   state.hands[o]=[-s*.12,.04,.37];state.hands[side]=[s*.23,.43,.32];
  }else if(type==='cross-low-block'||type==='knifehand-cross-low-block'){
   state.hands.left=[-.025,.02,.37];state.hands.right=[.025,.04,.35];
   if(type==='knifehand-cross-low-block')state.open.left=state.open.right=1;
  }else if(type==='double-uppercut'){
   state.hands.left=[.16,.31,.38];state.hands.right=[-.16,.31,.38];state.roll.left=90;state.roll.right=-90;
  }else if(type==='mountain-block'||type==='opening-mountain-block'){
   state.hands.left=[.38,.68,.05];state.hands.right=[-.38,.68,.05];
   if(action.side!=='both'&&type==='mountain-block'){state.hands[side]=[s*.35,.76,.09];state.hands[o]=[-s*.28,.06,.23];}
  }else if(type==='diamond-block'){
   state.hands[side]=[s*.13,.82,.14];state.hands[o]=[-s*.23,-.06,.18];
  }else if(type==='diamond-middle-block'){
   state.hands[side]=[s*.24,.43,.30];state.hands[o]=[-s*.14,.69,.20];
  }else if(type==='opening-block'){
   state.hands.left=[.27,.43,.26];state.hands.right=[-.27,.43,.26];
  }else if(['low-opening-block','knifehand-low-opening-block','double-low-block','twin-low-block'].includes(type)){
   state.hands.left=[.29,.10,.22];state.hands.right=[-.29,.10,.22];
   if(type==='knifehand-low-opening-block')state.open.left=state.open.right=1;
  }else if(['assisted-block','palm-assisted-outside-block','assisted-inside-block','assisted-high-side-block'].includes(type)){
   state.hands[side]=[s*.23,.43,.32];state.hands[o]=[s*.07,.24,.20];
   if(type==='assisted-inside-block')state.hands[side]=[-s*.02,.39,.34];
   if(type==='assisted-high-side-block')state.hands[side]=[s*.25,.58,.28];
   state.open[o]=1;
  }else if(type==='twin-vertical-punch'){
   state.hands.left=[.14,.48,.40];state.hands.right=[-.14,.48,.40];
  }else if(type==='x-rising-block'){
   state.hands.left=[-.02,.78,.20];state.hands.right=[.02,.75,.19];
  }else if(type==='u-shape-block'){
   state.hands[side]=[s*.10,.59,.33];state.hands[o]=[s*.10,.12,.33];
  }else if(type==='double-punch'){
   state.hands.left=[.14,.32,.49];state.hands.right=[-.14,.32,.49];
  }else if(type==='wedging-block'){
   state.hands.left=[.26,.49,.26];state.hands.right=[-.26,.49,.26];
  }else if(type==='large-hinge'){
   state.hands.left=[.38,.34,.03];state.hands.right=[-.38,.34,.03];
  }else if(type==='double-side-elbow'){
   state.hands.left=[.16,.30,.05];state.hands.right=[-.16,.30,.05];
  }else if(type==='bull-block'){
   state.hands.left=[.07,.81,.13];state.hands.right=[-.07,.81,.13];
  }else if(type==='rock-pushing'){
   state.hands.left=[.14,.55,.37];state.hands.right=[-.14,.55,.37];state.open.left=state.open.right=1;
  }else if(type==='ridgehand-opening-block'){
   state.hands.left=[.27,.43,.29];state.hands.right=[-.27,.43,.29];state.open.left=state.open.right=1;state.roll.left=150;state.roll.right=-150;
  }else if(type==='fork-punch'){
   const front=action.frontSide||side;state.hands[front]=[sign(front)*.13,.47,.45];state.hands[other(front)]=[sign(other(front))*.13,.20,.43];
  }else if(type==='assisted-backfist'){
   state.hands[side]=[s*.17,.56,.37];state.hands[o]=[s*.09,.37,.27];state.open[o]=1;
  }else if(type==='ridgehand-guard'){
   state.hands[side]=[s*.17,.40,.37];state.hands[o]=[-s*.04,.27,.22];state.open.left=state.open.right=1;state.roll[side]=s*150;
  }else if(type==='diamond-front-punch'){
   const high=action.highSide||other(side),punch=action.punchSide||side;state.hands[high]=[sign(high)*.13,.82,.15];state.hands[punch]=[sign(punch)*.14,.32,.51];
  }else if(type==='swallow-strike'){
   state.hands[side]=[-s*.02,.52,.43];state.hands[o]=[-s*.13,.82,.15];state.open[o]=1;
  }else if(type==='covered-ready'||type==='tongmilgi'){
   state.hands.left=[.025,type==='covered-ready'?.52:.43,.23];state.hands.right=[-.025,type==='covered-ready'?.52:.43,.23];state.open.left=1;
  }else throw new Error(`Unsupported technique: ${type}`);
  if(openTypes.has(type)){state.open[side]=1;if(type.includes('double')||type.includes('twin'))state.open[o]=1;}
  if(type==='spearhand'&&!activeSides.has(o)){state.hands[o]=[s*.07,.24,.26];state.open[o]=1;}
  if(type==='elbow-strike'){state.hands[o]=[s*.25,.33,.34];state.open[o]=1;}
  if(type==='target-punch'||type==='target-hammerfist'){state.hands[o]=[s*.11,type==='target-punch'?.32:.10,.48];state.open[o]=1;}
  if(type==='knee-break'){state.hands[o]=[-s*.04,.22,.38];state.open[o]=1;}
  if(type==='low-upturned-spearhand'||type==='pulling-uppercut')state.roll[side]=s*90;
  if(type==='reverse-knifehand-block')state.roll[side]=s*150;
  if(type==='grasp-chamber'&&action.side==='both'){state.hands.left=[.10,.17,.17];state.hands.right=[-.10,.17,.17];}
  if(type==='small-hinge'&&action.hipSide){const h=sign(action.hipSide);state.hands.left=[h*.16,.08,.05];state.hands.right=[h*.10,.12,.09];}
  if(type==='wrist-turn')state.roll[side]=s*160;
  if(type==='target-grab')state.open[side]=1;
  if(type==='elbow-strike'&&action.mode==='rising'){state.hands[side]=[s*.06,.48,.10];state.hands[o]=[-s*.14,.05,0];}
  if(type==='diamond-block'&&action.highSide){state.hands[action.highSide]=[sign(action.highSide)*.13,.82,.14];state.hands[action.lowSide]=[sign(action.lowSide)*.23,-.06,.18];}
  if(action.highSide&&type==='mountain-block')state.hands[action.highSide][1]=.78;
  if(action.guarding&&type==='knifehand-block'){state.hands[o]=[-s*.04,.26,.21];state.open[o]=1;}
  if(action.otherHand==='opposite-shoulder')state.hands[o]=[s*.18,.43,.13];
  if(action.height==='high'&&!['high-block','knifehand-high-block','x-rising-block'].includes(type)){for(const hand of action.side==='both'?sides:[side])state.hands[hand][1]=Math.max(['outside-block','inner-forearm-outward-block','assisted-block','wedging-block'].includes(type)?.60:.51,state.hands[hand][1]);}
  if(type==='palm-block'&&(action.level==='downward'||action.height==='downward'))state.hands[side]=[s*.10,.13,.32];
  if(type==='backfist'&&action.height==='middle')state.hands[side][1]=.30;
  if(action.height==='low')state.hands[side][1]=Math.min(.10,state.hands[side][1]);
  if(action.handShape==='open')state.open[side]=1;
  if(action.heading!==undefined)for(const hand of action.side==='both'?sides:[side]){const shoulder=[sign(hand)*BODY.shoulderOffset[0],BODY.shoulderOffset[1],0];state.hands[hand]=add(shoulder,rotY(sub(state.hands[hand],shoulder),action.heading-bodyHeading));}
 }
 return state;
}
function mixArms(a,b,u){return {
 hands:Object.fromEntries(sides.map(s=>[s,sphericalHand(a.hands[s],b.hands[s],u,s)])),
 open:Object.fromEntries(sides.map(s=>[s,mix(a.open[s],b.open[s],u)])),
 roll:Object.fromEntries(sides.map(s=>[s,mix(a.roll[s],b.roll[s],u)])),
};}
function chamber(actions,bodyHeading){
 const a=armTargets(actions,bodyHeading);
 for(const {type,side='left'}of actions){
  if(type.includes('kick')||type==='knee-strike'||type==='bending-ready'||type==='ready')continue;
  if(compoundTypes.has(type)){
   if(!['covered-ready','tongmilgi','rock-pushing','small-hinge','large-hinge'].includes(type)){
    a.hands.left=[-.065,.36,.24];a.hands.right=[.065,.40,.22];
   }
   continue;
  }
  const s=sign(side);
  a.hands[side]=type.includes('punch')?[s*.15,.06,0]:type==='inside-block'?[s*.33,.38,.25]:type==='high-block'?[-s*.10,.26,.20]:[-s*.10,.40,.17];
  a.hands[other(side)]=[-s*.09,.19,.37];
 }
 return a;
}
const initial=(ready='parallel')=>{
 ready=typeof ready==='object'?ready.stance:ready;
 const p={yaw:0,pelvis:[0,1,0],feet:{left:{pos:[.15,.07,0],yaw:0,pitch:0},right:{pos:[-.15,.07,0],yaw:0,pitch:0}},...neutral(),lean:0};
 if(ready.startsWith('closed')){p.feet.left.pos[0]=.035;p.feet.right.pos[0]=-.035;p.hands.left=[.025,ready==='closed-A'?.52:.12,.22];p.hands.right=[-.025,ready==='closed-A'?.52:.12,.22];p.open.left=1;}
 if(ready==='tongmilgi'){p.hands.left=[.04,.43,.25];p.hands.right=[-.04,.43,.25];p.open.left=p.open.right=1;}
 if(ready==='overlapped-hands-closed'){p.feet.left.pos[0]=.035;p.feet.right.pos[0]=-.035;p.hands.left=[.02,.05,.22];p.hands.right=[-.02,.05,.22];p.open.left=p.open.right=1;}
 return p;
};
function stanceFeet(before,entry,yaw){
 const feet=Object.fromEntries(sides.map(s=>[s,{...before.feet[s],pos:[...before.feet[s].pos]}]));
 // A stance endpoint is grounded. A previous kicking ankle must never be
 // reused as an elevated support point for the following landing or retreat.
 for(const side of sides)feet[side].pos[1]=BODY.ankleHeight;
 const action=entry.footAction||'',moving=movingFoot(entry);
 const lead=entry.lead||moving||'left',rear=other(lead),s=sign(lead),stance=entry.stance||'front';
 const inplace=moving===null||entry.footwork==='in-place'||entry.footwork==='inplace'||entry.step===false||action==='stay'||action==='pivot';
 const lengths={walking:.34,front:.52,back:.47,fixed:.47,horse:0,cat:.30,'rear-foot':.30,low:.59,cross:.09,parallel:0,'wide-parallel':0,closed:0,crane:0};
 if(!(stance in lengths))throw new Error(`Unsupported stance: ${stance}`);
 const distance=lengths[stance];
 const width=stance==='horse'||stance==='wide-parallel'?.54:stance==='cross'?-.06:stance==='closed'?.045:.20;
 if(moving===null){for(const side of sides)feet[side].yaw+=yawDelta(before.yaw,yaw);}
 else if(inplace&&entry.stance===before.stance){
  if(action!=='stay')for(const side of sides)feet[side].yaw+=yawDelta(before.yaw,yaw);
 }else if(inplace){
  const center=scale(add(feet.left.pos,feet.right.pos),.5);
  for(const side of sides){feet[side]={pos:add(center,rotY([sign(side)*width/2,0,(side===lead?1:-1)*distance/2],yaw)),yaw,pitch:0};feet[side].pos[1]=.07;}
 }else{
  const support=other(moving),ball=add(feet[support].pos,rotY([0,0,BODY.ballOffset],feet[support].yaw));
  const rearYaw=yaw+(stance==='back'||stance==='fixed'?s*75:stance==='front'?sign(rear)*12:0);
  const supportYaw=support===rear?rearYaw:yaw;
  feet[support]={pos:sub(ball,rotY([0,0,BODY.ballOffset],supportYaw)),yaw:supportYaw,pitch:0};
  if(moving===lead)feet[lead]={pos:add(feet[rear].pos,rotY([s*width,0,distance],yaw)),yaw,pitch:0};
  else feet[rear]={pos:sub(feet[lead].pos,rotY([s*width,0,distance],yaw)),yaw:rearYaw,pitch:0};
 }
 let weight=stance==='back'||stance==='cat'||stance==='rear-foot'?.22:.5;
 const pelvis=mix3(feet[rear].pos,feet[lead].pos,weight);
 pelvis[1]=stance==='horse'||stance==='low'?.91:stance==='front'?.95:.98;
 if(stance==='crane'){
  const raised=entry.lift||lead,support=other(raised),sx=sign(raised);
  feet[support]={...before.feet[support],pos:[...before.feet[support].pos],yaw};feet[support].pos[1]=.07;
  pelvis.splice(0,3,...add(feet[support].pos,rotY([sx*.04,.94,0],yaw)));
  feet[raised]={pos:add(pelvis,rotY([sx*.10,-.37,.02],yaw)),yaw,pitch:65};
 }
 return {feet,pelvis};
}
function orderedFootStages(before,after,entry,entryStart,previousPlan){
 let instructions=Array.isArray(entry.footwork)&&entry.footwork.every(x=>x.phase===undefined)?entry.footwork.filter(x=>x.foot!=='both'&&x.action!=='support-pivot'):[];
 const combo=/^land-(left|right)-then-step-(left|right)$/.exec(entry.footAction||'');
 if(combo)instructions=[{foot:combo[1],action:'return-source'},{foot:combo[2],action:'step-final'}];
 if(entry.footAction==='land-then-turn-left')instructions=[{foot:previousPlan?.kick?.side||'right',action:'return-source'},{foot:'left',action:'step-final'}];
 if(!instructions.length)return null;
 const stages=[structuredClone(before.feet)];let feet=structuredClone(before.feet);
 for(const instruction of instructions){
  const side=instruction.foot;if(!sides.includes(side))continue;const o=other(side),s=sign(side),yaw=entry.heading??entry.facing??after.yaw;
  if(instruction.action==='kick-and-return')feet[side]={...entryStart.feet[side],pos:[...entryStart.feet[side].pos]};
  else if(instruction.action==='return-source'){const source=previousPlan?.kick?previousPlan.before:entryStart;feet[side]={...source.feet[side],pos:[...source.feet[side].pos]};}
  else if(instruction.action==='step-final')feet=stanceFeet({...before,feet}, {...entry,movingFoot:side,footwork:undefined},yaw).feet;
  else if(instruction.action==='step-back')feet[side]={pos:add(feet[o].pos,rotY([s*.20,0,-.48],yaw)),yaw,pitch:0};
  else if(instruction.action==='step-back-turn')feet[side]={...after.feet[side],pos:[...after.feet[side].pos]};
  else if(instruction.action==='draw-front')feet[side]={pos:add(feet[o].pos,rotY([s*.20,0,.30],yaw)),yaw,pitch:0};
  else if(instruction.action==='small-forward-step')feet[side]={pos:add(feet[side].pos,rotY([0,0,.14],yaw)),yaw,pitch:0};
  else if(instruction.action==='follow-close')feet[side]={pos:add(feet[o].pos,rotY([s*.20,0,-.34],yaw)),yaw,pitch:0};
  else if(instruction.action==='cross-in-front')feet[side]={pos:add(feet[o].pos,rotY([-s*.05,0,.10],yaw)),yaw,pitch:0};
  else if(instruction.action==='step-open')feet[side]={pos:add(feet[o].pos,rotY([s*.20,0,-.52],yaw)),yaw,pitch:0};
  else continue;
  feet[side].pos[1]=.07;stages.push(structuredClone(feet));
 }
 if(stages.length<2)return null;
 after.feet=structuredClone(feet);const afterMid=scale(add(feet.left.pos,feet.right.pos),.5);
 after.pelvis[0]=afterMid[0];after.pelvis[2]=afterMid[2];
 return stages;
}
function solve(state,t,planes=null,build=false){
 const {yaw,feet,hands,open,roll,lean=0}=state,chestYaw=state.chestYaw??yaw,pelvis=[...state.pelvis];
 // Keep support knees softly bent instead of hitting the straight-leg IK limit.
 for(const side of sides){const h=add(pelvis,rotY([sign(side)*BODY.hipOffset[0],BODY.hipOffset[1],0],yaw)),f=feet[side].pos,horizontal=Math.hypot(f[0]-h[0],f[2]-h[2]),cap=f[1]+Math.sqrt(Math.max(.012,.852**2-horizontal**2))-BODY.hipOffset[1];pelvis[1]=smoothMin(pelvis[1],cap);}
 const world=p=>add(pelvis,rotY(rotX(p,lean),chestYaw)),arms={},legs={};
 const nextPlanes={};
 function bendFor(key,direction,neutral){
  let bend=planes?.[key]?(build?transportBetween(planes[key].direction,direction,planes[key].bend):planes[key].bend):transportedBend(direction,neutral);
  bend=norm(sub(bend,scale(direction,dot(bend,direction))));nextPlanes[key]={direction,bend};return bend;
 }
 for(const side of sides){
  const sx=sign(side),f=feet[side],hip=add(pelvis,rotY([sx*BODY.hipOffset[0],BODY.hipOffset[1],0],yaw));
  const v=norm(rotY(sub(f.pos,hip),-yaw)),bend=rotY(bendFor(side+'-leg',v,[0,0,1]),yaw);
  const pole=add(hip,scale(bend,.6));
  const leg=solveTwoBone(hip,f.pos,BODY.thigh,BODY.shin,pole);
  legs[side]={hip,knee:leg.joint,ankle:leg.end,yaw:f.yaw,pitch:f.pitch,lateral:norm(cross(norm(sub(leg.joint,hip)),norm(sub(leg.end,leg.joint))))};
  const shoulder=world([sx*BODY.shoulderOffset[0],BODY.shoulderOffset[1],0]);
  const target=softArmTarget(shoulder,world(hands[side]),BODY.upperArm,BODY.forearm),direction=norm(rotY(sub(target,shoulder),-chestYaw)),elbowBend=rotY(bendFor(side+'-arm',direction,[sx,0,0]),chestYaw);
  const arm=solveTwoBone(shoulder,target,BODY.upperArm,BODY.forearm,add(shoulder,scale(elbowBend,.6)));
  arms[side]={shoulder,elbow:arm.joint,wrist:arm.end,open:open[side],roll:roll[side]};
 }
 return {t,pelvis,yaw,chestYaw,lean,headYaw:state.headYaw||0,breath:0,arms,legs,_planes:nextPlanes};
}
export function createFormMotion(form){
 if(!form.sequence?.length)throw new Error('A sourced movement sequence is required');
 const ready=initial(form.ready),plans=[{index:0,start:0,at:0,before:ready,after:ready,actions:[{type:'ready'}]}];
 const POSES=[{name:'Ready stance',korean:'',desc:form.readyNote||'Face the starting direction in the ready position shown for this reference.',official:null,dir:'↑',kihap:false}];
 let before=plans[0].after,time=0;
 for(const rawEntry of form.sequence){
  const entryStart=before;
  const groups=rawEntry.simultaneous?[rawEntry.actions]:rawEntry.actions.some(a=>a.phase!==undefined)?[...new Set(rawEntry.actions.map(a=>a.phase||0))].map(phase=>rawEntry.actions.filter(a=>(a.phase||0)===phase)):rawEntry.actions.map(a=>[a]);
  for(let g=0;g<groups.length;g++){
   const part=rawEntry.footwork?.find?.(f=>f.phase===(groups[g][0].phase??g));
   const entry={...rawEntry,...part,turn:g?undefined:rawEntry.spin??rawEntry.turn};
   if(groups[g][0].turn!==undefined)entry.turn=groups[g][0].turn;
   if(part?.step)entry.footAction='step-'+part.step;
   const actions=groups[g].map(a=>({...a,leadSide:entry.lead}));for(const a of actions)if(!SUPPORTED_TECHNIQUES.includes(a.type))throw new Error(`${form.id} movement ${entry.n}: unknown ${a.type}`);
   const yaw=actions[0].facing??entry.heading??entry.facing??before.yaw+(g?0:entry.turn||0);
   const kick=actions.find(a=>a.type.includes('kick')||a.type==='knee-strike');
   const moving=kick?.side||movingFoot(entry),support=other(moving);
   const airborneBefore=sides.some(s=>before.feet[s].pos[1]>.15);
   const chestYaw=entry.chestHeading??yaw;
   const after={yaw,chestYaw,...(g&&!airborneBefore&&!part?{feet:structuredClone(before.feet),pelvis:[...before.pelvis]}:stanceFeet(before,entry,yaw)),...armTargets(actions,chestYaw),lean:0,stance:entry.stance,headYaw:clamp(yawDelta(chestYaw,entry.gazeHeading??chestYaw),-65,65)};
   const kickYaw=kick?.heading??yaw;
   if(kick){
    const s=sign(moving),advance=/advance/.test(entry.footAction||'')?.28:/close.*kick/.test(entry.footAction||'')?-.20:0;
    const supportPos=[...before.feet[support].pos];if(supportPos[1]>.15){supportPos.splice(0,3,...add(before.pelvis,rotY([sign(support)*.10,-before.pelvis[1]+.07,.27],kickYaw)));}
    if(advance){const gathered=add(before.feet[moving].pos,rotY([sign(support)*.20,0,0],kickYaw));supportPos[0]=gathered[0];supportPos[2]=gathered[2];supportPos[1]=.07;}
    after.pelvis=add(supportPos,rotY([s*.07,.93,0],kickYaw));
    const side=kick.type.includes('side'),round=kick.type.includes('roundhouse'),knee=kick.type==='knee-strike';
    after.feet=structuredClone(before.feet);after.feet[support].yaw=kickYaw+(side?-s*145:round?-s*75:0);after.feet[support].pos=supportPos;
    const height=(kick.height||kick.level)==='low'?-.40:knee?-.12:.10;
    after.feet[moving]={pos:add(after.pelvis,rotY([s*.095,height,knee?.30:.80],kickYaw)),yaw:kickYaw+(side?s*90:round?s*65:0),pitch:side?-85:round?-10:-50};
    after.yaw=kick.heading!==undefined?yaw:yaw+(side?-s*70:round?-s*40:0);after.lean=side?-5:-2;
    if(kick.type==='crescent-kick'){const target=other(moving);after.hands[target]=[-s*.02,.31,.48];after.open[target]=1;}
   }
   if(kick?.keepHands){after.hands=structuredClone(before.hands);after.open={...before.open};after.roll={...before.roll};}
   const bend=actions.find(a=>a.type==='bending-ready');
   if(bend){const raised=bend.side,support=other(raised);after.pelvis=add(before.feet[support].pos,rotY([sign(raised)*.04,.94,0],yaw));after.feet=structuredClone(before.feet);after.feet[raised]={pos:add(after.pelvis,rotY([sign(raised)*.11,-.37,.02],yaw)),yaw,pitch:0};}
   const rawTurn=g&&!part?yawDelta(before.yaw,after.yaw):(entry.turn??yawDelta(before.yaw,after.yaw));
   const dyaw=Math.abs(yawDelta(before.yaw+rawTurn,after.yaw))<1?rawTurn:rawTurn+yawDelta(before.yaw+rawTurn,after.yaw);
   if(entry.footAction==='jump-back'){const current=scale(add(after.feet.left.pos,after.feet.right.pos),.5),target=add(before.pelvis,rotY([0,0,.40],180)),shift=sub(target,current);shift[1]=0;for(const side of sides)after.feet[side].pos=add(after.feet[side].pos,shift);after.pelvis=add(after.pelvis,shift);}
   const footStages=!kick?orderedFootStages(before,after,entry,entryStart,plans.at(-1)):null;
   const duration=entry.duration||entry.tempo==='slow'||entry.slow?Math.max(entry.duration||5,Math.abs(dyaw)/60):Math.max(kick?3.2:footStages?Math.max(3,(footStages.length-1)*2.3):3,Math.abs(dyaw)/60);
   const start=time+(plans.length===1?1.3:.55),at=start+duration,index=plans.length;
   plans.push({index,start,at,duration,before,after,actions,moving,support,kick,kickYaw,dyaw,footStages,returning:false,step:(g===0||airborneBefore)&&moving!==null&&entry.footAction!=='stay',entry});
   const names=actions.map(a=>a.label||`${a.side&&a.side!=='both'?a.side[0].toUpperCase()+a.side.slice(1)+' ':''}${a.type.replaceAll('-',' ')}`);
   POSES.push({name:entry.label&&groups.length===1?entry.label:names.join(' + '),korean:entry.korean||'',desc:entry.notes||`${entry.stance||'Front'} stance. ${names.join(' and ')}.`,official:[entry.n],subpose:groups.length>1?String(g+1):null,dir:['↑','←','↓','→'][((Math.round(yaw/90)%4)+4)%4],kihap:actions.some(a=>a.kihap)||!!entry.kihap&&g===groups.length-1});
   before=after;time=at+(entry.holdSeconds||0);
  }
 }
 const start=time+.65,closingTime=4.5,at=start+closingTime,after=initial(form.ready),returnFoot=form.returnFoot||form.return?.step||'left',anchor=other(returnFoot);
 const offset=sub(before.feet[anchor].pos,after.feet[anchor].pos);offset[1]=0;
 after.pelvis=add(after.pelvis,offset);for(const s of sides)after.feet[s].pos=add(after.feet[s].pos,offset);
 plans.push({index:plans.length,start,at,duration:closingTime,before,after,actions:[{type:'ready'}],returning:true,moving:'left',support:'right',dyaw:yawDelta(before.yaw,0)});
 POSES.push({name:'Return to ready',korean:'',desc:'Return to the ready position. This closing transition is illustrative.',official:null,dir:'↑',kihap:false});
 const CHAPTERS=plans.map(({index,start,at,duration=0})=>({index,start,at,duration})),DURATION=at+.8;
 function indexAtTime(t){for(let i=1;i<plans.length;i++){if(t<plans[i].start)return i-1;if(t<=plans[i].at)return i;}return plans.length-1;}
 function stateAtTime(raw,durationScale=1){
  const t=clamp(raw,0,DURATION),index=indexAtTime(t),p=plans[index];if(index===0)return p.after;
  const u=clamp((t-p.start)/p.duration,0,1),deliberate=isDeliberate(p),impact=deliberate?1:IMPACT,drive=driveStart(p.duration,durationScale,!!p.kick,impact),q=phase(u,0,impact),a=p.before,b=p.after;
  const state={yaw:a.yaw+p.dyaw*q,chestYaw:(a.chestYaw??a.yaw)+(p.dyaw+yawDelta((a.chestYaw??a.yaw)+p.dyaw,b.chestYaw??b.yaw))*q,pelvis:mix3(a.pelvis,b.pelvis,q),feet:{},lean:mix(a.lean||0,b.lean||0,q),headYaw:mix(a.headYaw||0,b.headYaw||0,q)};
  for(const side of sides){
   const f=a.feet[side],end=b.feet[side],footTurn=Math.abs(p.dyaw)>=270?p.dyaw+yawDelta(f.yaw+p.dyaw,end.yaw):yawDelta(f.yaw,end.yaw),fyaw=f.yaw+footTurn*q;
   let pos;
   if(p.footStages){const n=p.footStages.length-1,x=clamp(u/impact,0,1)*n,j=Math.min(n-1,Math.floor(x)),local=x-j,v=phase(local),from=p.footStages[j][side],to=p.footStages[j+1][side];
    if(from.pos[1]>.15&&to.pos[1]<.15){const chamber=add(state.pelvis,rotY([sign(side)*.10,-.24,.15],state.yaw));pos=local<.38?mix3(from.pos,chamber,phase(local,0,.38)):mix3(chamber,to.pos,phase(local,.38,1));}
    else pos=mix3(from.pos,to.pos,v);
    if(Math.hypot(...sub(from.pos,to.pos))>.01)pos[1]+=.065*arc(v);
   }
   else if(p.returning){const v=phase(u,side==='right'?0:.45,side==='right'?.55:1);pos=mix3(f.pos,end.pos,v);pos[1]+=.065*arc(v);}
   else if(p.kick&&side===p.moving){
    const chamber=add(state.pelvis,rotY([sign(side)*.095,-.24,.14],p.kickYaw));
    pos=u<drive?mix3(f.pos,chamber,phase(u,0,drive)):mix3(chamber,end.pos,phase(u,drive,impact));
    if(p.kick.type.includes('roundhouse'))pos=add(pos,rotY([sign(side)*.10*arc(q),0,0],p.kickYaw));
    if(p.kick.type==='crescent-kick')pos=add(pos,rotY([sign(side)*.23*Math.sin(Math.PI*phase(u,drive,impact)),.12*arc(q),0],p.kickYaw));
   }else if(f.pos[1]>.15&&end.pos[1]<.15){
    const chamber=add(state.pelvis,rotY([sign(side)*.10,-.24,.15],state.yaw));pos=u<.38?mix3(f.pos,chamber,phase(u,0,.38)):mix3(chamber,end.pos,phase(u,.38,impact));
   }else if(/close-then-step/.test(p.entry?.footAction||'')&&side===p.moving){
    const gathered=add(a.feet[other(side)].pos,rotY([sign(side)*.06,0,0],a.yaw));pos=u<.4?mix3(f.pos,gathered,phase(u,0,.4)):mix3(gathered,end.pos,phase(u,.4,impact));pos[1]+=.065*arc(q);
   }else{pos=mix3(f.pos,end.pos,q);if(side===p.moving&&p.step)pos[1]+=.065*arc(q);}
   state.feet[side]={pos,yaw:fyaw,pitch:mix(f.pitch||0,end.pitch||0,q)};
  }
  if(p.footStages){const mid=scale(add(state.feet.left.pos,state.feet.right.pos),.5),startOffset=sub(a.pelvis,scale(add(a.feet.left.pos,a.feet.right.pos),.5)),endOffset=sub(b.pelvis,scale(add(b.feet.left.pos,b.feet.right.pos),.5));for(const c of [0,2])state.pelvis[c]=mid[c]+mix(startOffset[c],endOffset[c],q);}
  if(p.returning){state.pelvis[0]=mix(a.pelvis[0],(state.feet.left.pos[0]+state.feet.right.pos[0])/2,q);state.pelvis[2]=mix(a.pelvis[2],(state.feet.left.pos[2]+state.feet.right.pos[2])/2,q);}
  if(p.kick?.type.startsWith('jump-')||p.kick?.airborne||p.entry?.footAction==='jump-back'||p.entry?.travel==='hop'&&!p.kick){const lift=.15*arc(q);state.pelvis[1]+=lift;for(const s of sides)state.feet[s].pos[1]+=lift;}
  const mid=chamber(p.actions,b.yaw),prepare=deliberate?.4:drive,arms=p.kick?.keepHands?{hands:structuredClone(a.hands),open:{...a.open},roll:{...a.roll}}:p.returning?mixArms(a,b,q):u<prepare?mixArms(a,mid,phase(u,0,prepare)):mixArms(mid,b,phase(u,prepare,impact));
  Object.assign(state,arms);return state;
 }
 // Rotation-minimizing joint planes are prepared on the same deterministic
 // timeline. They follow the previous anatomical plane through side kicks
 // and overhead/cross-body paths, rather than switching poles at a threshold.
 const frameRate=90;
 function buildPlanes(scales=[]){const table=[];let previous=null;
  for(let n=0;n<=Math.ceil(DURATION*frameRate);n++){const t=Math.min(DURATION,n/frameRate),scale=scales[indexAtTime(t)]||1,p=solve(stateAtTime(t,scale),t,previous,true);table.push(p._planes);previous=p._planes;}
  return table;
 }
 const frames=buildPlanes();
 function planeAt(t,table=frames){
  const x=clamp(t,0,DURATION)*frameRate,i=Math.floor(x),u=x-i,result={};
  for(const key of Object.keys(table[0])){
   const a=table[Math.max(0,i-1)][key].bend,b=table[Math.min(i,table.length-1)][key].bend,c=table[Math.min(i+1,table.length-1)][key].bend,d=table[Math.min(i+2,table.length-1)][key].bend;
   result[key]={bend:norm(b.map((v,j)=>.5*((2*v)+(-a[j]+c[j])*u+(2*a[j]-5*v+4*c[j]-d[j])*u*u+(-a[j]+3*v-3*c[j]+d[j])*u*u*u)))};
  }
  return result;
 }
 function poseAtTime(t,{durationScale=1}={}){return solve(stateAtTime(t,durationScale),t,planeAt(t));}
 function narrationSampler(scales){const calibrated=buildPlanes(scales);return(t,{durationScale=1}={})=>solve(stateAtTime(t,durationScale),t,planeAt(t,calibrated));}
 const LESSON={id:form.id,officialMovements:form.movementCount??form.sequence.length,poseCount:POSES.length,mappingStatus:'draft',review:{status:'pending',reviewer:null,reviewedOn:null,openQuestions:[`Reference: ${form.referenceLabel||'the sources linked below'}.`,...(form.unresolved||[]),...(form.corrections||[]).map(c=>`Reference interpretation at count ${c.n}: ${c.chosen}`),...form.sequence.filter(e=>e.footworkVariant).map(e=>`Count ${e.n}: ${e.footworkVariant}`),'The modeled stance depths, hand shapes, paths, timing and closing transition need instructor review.','Belt mappings and teaching conventions vary by school.']}};
 return {POSES,LESSON,CHAPTERS,DURATION,indexAtTime,poseAtTime,referencePlans:plans,narrationSampler,poseAtIndex:i=>poseAtTime(CHAPTERS[clamp(Math.trunc(i),0,CHAPTERS.length-1)].at)};
}
