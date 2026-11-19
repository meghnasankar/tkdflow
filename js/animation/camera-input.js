/* Camera keys and pointer gestures for the lesson view. No renderer here. */
export const TURN_STEP=15,TILT_STEP=10,ZOOM_STEP=1.25;
const NATIVE=new Set(['INPUT','SELECT','TEXTAREA']);
const FOCUS_KEYS={'1':'whole','2':'arms','3':'feet'};

/**
 * Map a keydown in the player to a camera action, or null. Arrows, Home, End,
 * Space, K and R stay with playback. Ctrl, Cmd, Alt and IME input are never taken,
 * and native fields keep their keys. Shift with A or D turns to the next named side.
 */
export function cameraKeyAction(e){
 if(!e||e.defaultPrevented||e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return null;
 const t=e.target;if(t&&(NATIVE.has(t.tagName)||t.isContentEditable))return null;
 const key=e.key;
 if(key==='+'||key==='=')return {type:'zoom',factor:ZOOM_STEP};
 if(key==='-'||key==='_')return {type:'zoom',factor:1/ZOOM_STEP};
 if(typeof key!=='string'||key.length!==1)return null;
 const k=key.toLowerCase();
 if(k==='a'||k==='d'){const dir=k==='a'?-1:1;return e.shiftKey?{type:'turn-next',dir}:{type:'turn',degrees:dir*TURN_STEP};}
 if(e.shiftKey)return null;
 if(k==='w'||k==='s')return {type:'tilt',degrees:k==='w'?TILT_STEP:-TILT_STEP};
 if(k==='0')return {type:'reset'};
 if(FOCUS_KEYS[k])return {type:'focus',focus:FOCUS_KEYS[k]};
 return null;
}

/** Apply a key or button action to the rig. */
export function applyCameraAction(rig,action){
 switch(action?.type){
  case 'turn':rig.turn(action.degrees);return true;
  case 'turn-next':rig.turnToNext(action.dir);return true;
  case 'tilt':rig.tilt(action.degrees);return true;
  case 'zoom':rig.zoomBy(action.factor);return true;
  case 'reset':rig.reset();return true;
  case 'focus':return rig.setFocus(action.focus);
  default:return false;
 }
}

/* The camera buttons: one press for each change, so dragging is never required. */
export const BUTTON_ACTIONS=Object.freeze({left:{type:'turn-next',dir:-1},right:{type:'turn-next',dir:1},up:{type:'tilt',degrees:TILT_STEP},down:{type:'tilt',degrees:-TILT_STEP},in:{type:'zoom',factor:ZOOM_STEP},out:{type:'zoom',factor:1/ZOOM_STEP},reset:{type:'reset'}});

/**
 * Drag to turn (a full canvas width is 180°, a full height 90°), two fingers
 * to pinch-zoom, and Ctrl or Cmd with the wheel (a trackpad pinch) to zoom.
 * A plain wheel is left alone so the page still scrolls.
 */
export function attachCameraInput(el,{onDrag,onPinch,onStart=()=>{},onEnd=()=>{},win=globalThis.window}){
 const pointers=new Map();let active=false;
 const spread=()=>{const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
 function end(){if(!active)return;active=false;pointers.clear();delete el.dataset.dragging;onEnd();}
 function down(e){
  if(e.pointerType==='mouse'&&e.button!==0)return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{el.setPointerCapture?.(e.pointerId);}catch{/* capture is optional */}
  if(!active){active=true;el.dataset.dragging='true';onStart();}
 }
 function move(e){
  const p=pointers.get(e.pointerId);if(!p)return;
  if(pointers.size>=2){const before=spread();p.x=e.clientX;p.y=e.clientY;const after=spread();if(before>0&&after>0)onPinch(after/before);return;}
  const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  const w=el.clientWidth||1,h=el.clientHeight||1;
  if(dx||dy)onDrag(-dx/w*180,dy/h*90);
 }
 function up(e){if(!pointers.delete(e.pointerId))return;try{el.releasePointerCapture?.(e.pointerId);}catch{/* already released */}if(!pointers.size)end();}
 function wheel(e){if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();onPinch(Math.exp(-clampWheel(e.deltaY)*.01));onEnd();}
 const listeners=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up]];
 for(const [type,fn] of listeners)el.addEventListener(type,fn);
 el.addEventListener('wheel',wheel,{passive:false});
 win?.addEventListener?.('blur',end);
 return {get dragging(){return active;},detach(){for(const [type,fn] of listeners)el.removeEventListener(type,fn);el.removeEventListener('wheel',wheel,{passive:false});win?.removeEventListener?.('blur',end);end();}};
}
const clampWheel=d=>Math.max(-100,Math.min(100,Number(d)||0));
