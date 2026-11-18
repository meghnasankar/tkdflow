/* Keyboard focus continuity for regions that are re-rendered.

   Rules:
   - Controls that can be re-created carry a stable `data-fk` key.
   - keepFocus(container, update) is synchronous. If focus was inside the
     container and the update removed the focused element, focus moves to the
     element with the same key (with its text caret), or to a bounded fallback.
     If focus was anywhere else, or the user's focus survived, nothing moves:
     background updates never steal focus.
   - focusTarget() is for explicit actions only (Show more, open a topic, back
     to all topics). It never scrolls unless asked, and then honours
     prefers-reduced-motion. */

const reducedMotion=()=>Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
const lost=(doc,saved)=>{const a=doc.activeElement;return !a||a===doc.body||a===doc.documentElement||(a===saved.element&&a.isConnected===false);};

/** Find the element carrying `key` inside `container` (keys are plain strings; no selector escaping needed). */
export function findKey(container,key){
 if(!container||!key)return null;
 for(const el of container.querySelectorAll('[data-fk]'))if(el.dataset.fk===key)return el;
 return null;
}

/** What has focus inside `container`: the element itself, its key (if any)
 *  and its text caret (if any). */
export function captureFocus(container,doc=globalThis.document){
 const active=doc?.activeElement;
 if(!container||!active||active===doc.body||!container.contains(active))return null;
 const holder=active.closest?.('[data-fk]');
 const caret=typeof active.selectionStart==='number'?{start:active.selectionStart,end:active.selectionEnd,direction:active.selectionDirection||'none'}:null;
 return {key:holder&&container.contains(holder)?holder.dataset.fk:null,element:active,caret};
}

/** Put focus back if (and only if) it was lost: to the same element when it
 *  was re-attached (e.g. a preserved draft form), else to the element with the
 *  same key, else to the caller's bounded fallback. Returns the element or null. */
export function restoreFocus(container,saved,{fallback=null}={},doc=globalThis.document){
 if(!saved||!lost(doc,saved))return null;
 const same=saved.element?.isConnected!==false&&container.contains(saved.element)?saved.element:null;
 const keyed=same||findKey(container,saved.key);
 const target=keyed||(saved.key&&typeof fallback==='function'?fallback(saved):null);
 if(!target)return null;
 focusTarget(target);
 if(keyed&&saved.caret&&typeof target.setSelectionRange==='function'){
  try{target.setSelectionRange(saved.caret.start,saved.caret.end,saved.caret.direction);}catch{/* not a text field */}
 }
 return target;
}

/** Run a synchronous re-render of `container` without losing keyboard focus. */
export function keepFocus(container,update,options={}){
 const saved=captureFocus(container);
 const result=update();
 restoreFocus(container,saved,options);
 return result;
}

/** Focus an element for an explicit action. Headings get tabindex="-1";
 *  interactive elements are focused as they are. Scrolls only on request,
 *  smoothly unless reduced motion is preferred. */
export function focusTarget(el,{scroll=false,scrollTarget=el}={}){
 if(!el)return false;
 const native=/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName)&&!(el.tagName==='A'&&!el.hasAttribute('href'));
 if(!native&&!el.hasAttribute('tabindex'))el.setAttribute('tabindex','-1');
 el.focus({preventScroll:true});
 if(scroll)scrollTarget?.scrollIntoView?.({block:'start',behavior:reducedMotion()?'auto':'smooth'});
 return true;
}

/** Hide or show `el`. If hiding it would drop keyboard focus that is inside it
 *  (e.g. a Retry button that just did its job), move focus synchronously to
 *  `fallback`, usually the nearby status message. Focus anywhere else is never
 *  touched. */
export function setHidden(el,hidden,fallback,doc=globalThis.document){
 const had=Boolean(hidden)&&!el.hidden&&el.contains(doc.activeElement);
 el.hidden=Boolean(hidden);
 if(had&&fallback)focusTarget(fallback);
}

/** Natively disable or enable a control, handing its focus to `fallback` in
 *  the same way if it was focused when it became disabled. */
export function setDisabled(el,disabled,fallback,doc=globalThis.document){
 const had=Boolean(disabled)&&!el.disabled&&doc.activeElement===el;
 el.disabled=Boolean(disabled);
 if(had&&fallback)focusTarget(fallback);
}
