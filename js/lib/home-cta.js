/* Homepage closing banner, chosen from the shared learning/account state.
   No personal details are shown. Whenever state is loading (first load, sign-in,
   sign-out, account switch) the neutral library banner is shown at once, so a
   previous signup, member or setup banner never lingers; on first load it matches
   the static banner in index.html, so nothing flashes. */
export const LIBRARY_CTA=Object.freeze({kind:'library',title:'Keep learning at your own pace',
 text:'Explore full-body animations, discussion guides and the worldwide events calendar. All learning resources are free to browse.',
 actions:[{href:'/forms.html',label:'Browse the forms library',primary:true},{href:'/about.html',label:'Project status'}]});

/** state: a LearningState snapshot. Always returns a banner; loading gets the library banner. */
export function homeCta(state,{configured,signupEnabled}){
 if(!state||state.mode==='loading')return LIBRARY_CTA;
 if(state.mode==='account')return {kind:'member',title:'Keep learning',
  text:'Pick up your saved forms and lesson progress, kept privately with your account across devices.',
  actions:[{href:'/learning.html',label:'My learning',primary:true},{href:'/forms.html',label:'Browse the forms library'}]};
 if(state.mode==='unavailable'&&state.signedIn&&state.reason==='setup')return {kind:'setup',title:'Finish setting up your account',
  text:'Confirm your email and complete your profile to save forms and lesson progress privately across devices.',
  actions:[{href:'/profile.html',label:'Finish your profile',primary:true},{href:'/forms.html',label:'Browse the forms library'}]};
 // Signup is offered only to signed-out visitors when accounts work, signup is on and the age screen allows it.
 if(state.mode==='browser'&&!state.signedIn&&state.accountReady&&state.allowAccount!==false&&configured&&signupEnabled)return {kind:'signup',title:'Create a free account',
  text:'Save forms and resume lessons privately across devices. Free, with no ads.',
  actions:[{href:'/auth.html?mode=register',label:'Create a free account',primary:true},{href:'/about.html',label:'About TKDflow'}]};
 return LIBRARY_CTA;
}

/** Subscribe-able renderer: applies a banner only when its kind changes. */
export function createCtaRenderer(apply,options){
 let shown=null;
 return state=>{const next=homeCta(state,options());if(next.kind===shown)return false;shown=next.kind;apply(next);return true;};
}
