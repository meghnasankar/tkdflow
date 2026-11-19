/* Free orbit camera for the lesson view. Pure math, no renderer or DOM.
   Angles are degrees. Azimuth 0 is in front of the starting stance (+z);
   90 is the performer's left side (+x), 180 is behind them, -90 their right.
   The camera never follows the performer's turns, only their position. */
export const FOCUS=Object.freeze({whole:'Whole body',arms:'Armwork',feet:'Footwork'});
export const LIMITS=Object.freeze({minElevation:0,maxElevation:70,minZoom:.75,maxZoom:2.5});
export const DEFAULT_CAMERA=Object.freeze({azimuth:50,elevation:18,zoom:1});
export const PRESETS=Object.freeze({front:{azimuth:0,elevation:11},back:{azimuth:180,elevation:11},side:{azimuth:90,elevation:10},'other-side':{azimuth:-90,elevation:10},'three-quarter':{azimuth:50,elevation:18}});
export const FOV=30;
const RAD=Math.PI/180,TAN=Math.tan(FOV/2*RAD),PAD=.095,CELL=.015,MARGIN=1.035,TAU=90;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
/** An angle in (-180, 180]. */
export const wrap=a=>{const w=((a+180)%360+360)%360-180;return w===-180?180:w;};

/* Points that must stay in frame for each focus, relative to the performer's
   floor position, sampled over the whole lesson. Near-duplicates are merged on
   a 1.5 cm grid; the padding covers that rounding.
   whole: head, hands, feet and every joint, kicks included.
   arms:  head, shoulders, elbows, wrists, hands and the pelvis.
   feet:  both knees and feet, kicks included. Footwork normally follows the
          lesson instead (see followGoal); this whole-lesson fit is its steady
          framing when reduced motion is on. */
export function framingPoints(sample,duration,step=.1){
 const sets={whole:new Map(),arms:new Map(),feet:new Map()};
 const put=(names,o,v)=>{const p=[v[0]-o[0],v[1],v[2]-o[2]],key=p.map(x=>Math.round(x/CELL)).join();for(const n of names)if(!sets[n].has(key))sets[n].set(key,p);};
 for(let t=0;t<=duration+1e-9;t+=step){
  const p=sample(Math.min(t,duration)),o=p.pelvis;
  put(['whole','arms'],o,p.pelvis);put(['whole','arms'],o,[p.pelvis[0],p.pelvis[1]+.80,p.pelvis[2]]);
  for(const side of ['left','right']){
   const a=p.arms[side],l=p.legs[side];
   for(const v of [a.shoulder,a.elbow,a.wrist])put(['whole','arms'],o,v);
   const d=[a.wrist[0]-a.elbow[0],a.wrist[1]-a.elbow[1],a.wrist[2]-a.elbow[2]],n=Math.hypot(...d)||1;
   put(['whole','arms'],o,[a.wrist[0]+d[0]/n*.10,a.wrist[1]+d[1]/n*.10,a.wrist[2]+d[2]/n*.10]);
   put(['whole'],o,l.hip);
  }
  for(const v of legPoints(p))put(['whole','feet'],[0,0,0],v);
 }
 const out={};
 for(const [name,map] of Object.entries(sets)){const pts=[...map.values()];let lo=Infinity,hi=-Infinity;for(const p of pts){lo=Math.min(lo,p[1]);hi=Math.max(hi,p[1]);}out[name]={points:pts,targetY:(lo+hi)/2};}
 return out;
}

/** Both knees, ankles and foot corners, relative to the performer's floor position. */
export function legPoints(p){
 const o=p.pelvis,out=[];
 for(const side of ['left','right']){
  const l=p.legs[side],yaw=(l.yaw||0)*RAD;
  out.push([l.knee[0]-o[0],l.knee[1],l.knee[2]-o[2]],[l.ankle[0]-o[0],l.ankle[1],l.ankle[2]-o[2]]);
  for(const x of [-.065,.065])for(const z of [-.055,.18])out.push([l.ankle[0]+x*Math.cos(yaw)+z*Math.sin(yaw)-o[0],l.ankle[1]-.07,l.ankle[2]-x*Math.sin(yaw)+z*Math.cos(yaw)-o[2]]);
 }
 return out;
}

/* A distance that fits these points from any azimuth and any allowed tilt,
   treating each point as anywhere on its circle around the performer. Cheap
   enough to run every frame for the few leg points Footwork follows. */
export function followNeed(points,targetY,aspect){
 let distance=1;
 for(let el=LIMITS.minElevation;el<=LIMITS.maxElevation;el+=10){
  const c=Math.cos(el*RAD),s=Math.sin(el*RAD);
  for(const p of points){
   const rho=Math.hypot(p[0],p[2]),h=p[1]-targetY;
   distance=Math.max(distance,Math.max((Math.abs(h)*c+rho*s+PAD)/TAN,(rho+PAD)/(TAN*aspect))+rho*c+h*s+PAD);
  }
 }
 return distance*MARGIN;
}

/** Unit vectors for a camera at this azimuth/elevation: back (target → eye), right, up. */
export function basis(azimuth,elevation){
 const a=azimuth*RAD,e=elevation*RAD,back=[Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)];
 const right=[Math.cos(a),0,-Math.sin(a)],up=[back[1]*right[2]-back[2]*right[1],back[2]*right[0]-back[0]*right[2],back[0]*right[1]-back[1]*right[0]];
 return {back,right,up};
}

/* One distance per focus and screen shape that fits every point from every
   allowed angle, so turning or tilting never changes the zoom. For each angle
   the table keeps the tallest need (aspect-free) and, for width, the deepest
   point per 1 cm band of sideways reach, so a new screen shape costs only a lookup. */
const BAND=.01,tables=new WeakMap();
function angleTable(f){
 if(tables.has(f))return tables.get(f);
 const n=f.points.length,X=new Float64Array(n),Y=new Float64Array(n),Z=new Float64Array(n);let reach=0;
 f.points.forEach((p,i)=>{X[i]=p[0];Y[i]=p[1]-f.targetY;Z[i]=p[2];reach=Math.max(reach,Math.hypot(p[0],p[2]));});
 const bands=new Float64Array(Math.floor(reach/BAND)+2),rows=[];
 for(let el=LIMITS.minElevation;el<=LIMITS.maxElevation;el+=5)for(let az=0;az<360;az+=5){
  const {back,right,up}=basis(az,el);let tall=-Infinity;bands.fill(-Infinity);
  for(let i=0;i<n;i++){
   const depth=X[i]*back[0]+Y[i]*back[1]+Z[i]*back[2];
   tall=Math.max(tall,(Math.abs(X[i]*up[0]+Y[i]*up[1]+Z[i]*up[2])+PAD)/TAN+depth);
   const band=Math.floor(Math.abs(X[i]*right[0]+Z[i]*right[2])/BAND);if(depth>bands[band])bands[band]=depth;
  }
  const wide=[];let deepest=-Infinity;
  for(let band=bands.length-1;band>=0;band--)if(bands[band]>deepest){deepest=bands[band];wide.push((band+1)*BAND+PAD,deepest);}
  rows.push({tall,wide});
 }
 tables.set(f,rows);return rows;
}
export function fitDistance(f,aspect){
 let distance=1;
 for(const {tall,wide} of angleTable(f)){
  distance=Math.max(distance,tall+PAD);
  for(let i=0;i<wide.length;i+=2)distance=Math.max(distance,wide[i]/(TAN*aspect)+wide[i+1]+PAD);
 }
 return distance*MARGIN;
}

/** Plain-language direction for the status line: where the camera stands relative to the starting stance. */
export function directionName(azimuth){
 const names=['front','front-left','left side','back-left','back','back-right','right side','front-right'];
 return names[((Math.round(wrap(azimuth)/45)%8)+8)%8];
}
export function heightName(elevation){return elevation<8?'level':elevation<35?'slightly above':elevation<55?'above':'high above';}

/* Footwork looks this far around the current lesson time, so it widens before a kick starts and settles back after it lands. */
export const FOLLOW=Object.freeze({before:.25,after:.75,step:.05,outMs:80,inMs:450,aimMs:150});
export function createCameraRig({framing,aspect=1,reducedMotion=()=>false,sample=null,duration=0}={}){
 const fits=new Map(),legCache=new Map();let shape=aspect,time=0,followed=null;
 const fitFor=(focus,a=shape)=>{const key=focus+'@'+a.toFixed(2);if(!fits.has(key))fits.set(key,fitDistance(framing[focus],a));return fits.get(key);};
 const goal={azimuth:DEFAULT_CAMERA.azimuth,elevation:DEFAULT_CAMERA.elevation,zoom:DEFAULT_CAMERA.zoom,focus:'whole'};
 const following=()=>goal.focus==='feet'&&!!sample&&!reducedMotion();
 function followGoal(){
  const key=time.toFixed(3)+'@'+shape.toFixed(2);if(followed?.key===key)return followed;
  /* Samples sit on a fixed 0.05 s grid, so each new frame usually needs only one new pose. */
  const pts=[],first=Math.floor((time-FOLLOW.before)/FOLLOW.step),last=Math.ceil((time+FOLLOW.after)/FOLLOW.step);
  for(let k=first;k<=last;k++){if(!legCache.has(k)){legCache.set(k,legPoints(sample(clamp(k*FOLLOW.step,0,duration))));if(legCache.size>96)legCache.delete(legCache.keys().next().value);}pts.push(...legCache.get(k));}
  pts.push(...legPoints(sample(clamp(time,0,duration))));
  let lo=Infinity,hi=-Infinity;for(const p of pts){lo=Math.min(lo,p[1]);hi=Math.max(hi,p[1]);}
  /* Never wider than the steady whole-lesson leg framing, which holds every kick from every angle. */
  const targetY=(lo+hi)/2,need=followNeed(pts,targetY,shape),steady=fitFor('feet');
  followed=need<steady?{key,targetY,distance:need}:{key,targetY:framing.feet.targetY,distance:steady};return followed;
 }
 const goalDistance=()=>(following()?followGoal().distance:fitFor(goal.focus))/goal.zoom;
 const goalAim=()=>following()?followGoal().targetY:framing[goal.focus].targetY;
 const now={azimuth:goal.azimuth,elevation:goal.elevation,distance:goalDistance(),targetY:goalAim()};
 let last=null,safetySnaps=0;
 /* Footwork safety net, checked on every frame after easing: if this frame's knees and feet might not fit
    at the current aim and distance (a jump to another pose, a seek, a focus change), move straight out to the
    goal's aim at the larger of the two distances. Moving back along the view axis only widens the view, so
    nothing is clipped; in steady playback the look-ahead means this rarely fires. */
 function keepInFrame(){
  if(!following())return;
  const need=followNeed(legPoints(sample(clamp(time,0,duration))),now.targetY,shape)/goal.zoom;
  if(need<=now.distance+1e-9)return;
  const aim=goalAim(),far=Math.max(now.distance,goalDistance());
  if(Math.abs(aim-now.targetY)>.002||far-now.distance>.002)safetySnaps++;
  now.targetY=aim;now.distance=far;
 }
 function snap(){now.azimuth=goal.azimuth;now.elevation=goal.elevation;now.distance=goalDistance();now.targetY=goalAim();}
 function settle(){if(reducedMotion())snap();}
 const rig={
  get state(){return {azimuth:goal.azimuth,elevation:goal.elevation,zoom:goal.zoom,focus:goal.focus,distance:goalDistance()};},
  get current(){return {...now};},
  get aspect(){return shape;},
  /** How many times Footwork had to step straight out (by more than 2 mm) to keep the feet in frame. */
  get safetySnaps(){return safetySnaps;},
  /* Keys and buttons ease to the new angle. */
  turn(deg){goal.azimuth=wrap(goal.azimuth+deg);settle();},
  /* Next multiple of 45° in that direction, so steps land on named sides. */
  turnToNext(dir){const q=goal.azimuth/45;goal.azimuth=wrap(dir>0?(Math.floor(q+1e-6)+1)*45:(Math.ceil(q-1e-6)-1)*45);settle();},
  tilt(deg){goal.elevation=clamp(goal.elevation+deg,LIMITS.minElevation,LIMITS.maxElevation);settle();},
  zoomBy(f){goal.zoom=clamp(goal.zoom*f,LIMITS.minZoom,LIMITS.maxZoom);settle();},
  setFocus(name){if(!FOCUS[name])return false;goal.focus=name;goal.zoom=1;settle();return true;},
  /** Lesson time without easing, for tests and the first frame. */
  at(t){time=Number(t)||0;keepInFrame();return rig;},
  reset(){Object.assign(goal,{azimuth:DEFAULT_CAMERA.azimuth,elevation:DEFAULT_CAMERA.elevation,zoom:DEFAULT_CAMERA.zoom});settle();},
  preset(name){const p=PRESETS[name];if(!p)return false;Object.assign(goal,p,{zoom:1});snap();return true;},
  /* Dragging and pinching follow the pointer directly. */
  drag(dAz,dEl){goal.azimuth=wrap(goal.azimuth+dAz);goal.elevation=clamp(goal.elevation+dEl,LIMITS.minElevation,LIMITS.maxElevation);now.azimuth=goal.azimuth;now.elevation=goal.elevation;},
  pinch(f){goal.zoom=clamp(goal.zoom*f,LIMITS.minZoom,LIMITS.maxZoom);now.distance=goalDistance();},
  /* A new screen shape reframes at once rather than drifting. */
  setAspect(a){if(!(a>0))return;shape=a;now.distance=goalDistance();if(following())now.targetY=goalAim();},
  /** Advance easing; returns true while still moving. */
  /** Advance easing at this clock time (ms), for this lesson time (s); returns true while still moving. */
  update(ms,lessonTime=time){
   const dt=last===null?16:Math.min(100,Math.max(0,ms-last));last=ms;time=Number(lessonTime)||0;
   if(reducedMotion()){snap();return false;}
   const rate=tau=>1-Math.exp(-dt/tau),k=rate(TAU);let moving=false;
   const ease=(cur,target,eps,step=k)=>{const d=target-cur;if(Math.abs(d)<eps)return target;moving=true;return cur+d*step;};
   const turn=ease(0,wrap(goal.azimuth-now.azimuth),.05);now.azimuth=turn===wrap(goal.azimuth-now.azimuth)?goal.azimuth:wrap(now.azimuth+turn);
   now.elevation=ease(now.elevation,goal.elevation,.05);
   const far=goalDistance(),aim=goalAim(),tracking=following();
   /* Footwork backs out quickly and moves in slowly; other changes ease evenly. */
   now.distance=ease(now.distance,far,.002,tracking?rate(far>now.distance?FOLLOW.outMs:FOLLOW.inMs):k);
   now.targetY=ease(now.targetY,aim,.001,tracking?rate(FOLLOW.aimMs):k);
   keepInFrame();
   if(!moving)last=null;
   return moving;
  },
  /** Eye and look-at target for a performer whose pelvis is here. */
  place(pelvis){const {back}=basis(now.azimuth,now.elevation),target=[pelvis[0],now.targetY,pelvis[2]];return {target,eye:target.map((v,i)=>v+back[i]*now.distance),distance:now.distance};},
  label(){const s=rig.state,zoom=Math.round(s.zoom*100);return `Camera ${directionName(s.azimuth)}, ${heightName(s.elevation)}. ${FOCUS[s.focus]}${zoom===100?'':`, zoom ${zoom}%`}.`;},
 };
 return rig;
}
