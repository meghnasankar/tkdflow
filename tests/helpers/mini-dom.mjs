/* Test-only minimal DOM for running real page modules in Node. Not shipped.
   It models what keyboard-continuity tests need, including the browser rule
   that removing or moving a focused element drops focus to <body>. */

let documentRef=null;

class MiniEvent{
 constructor(type,init={}){Object.assign(this,{type,bubbles:!!init.bubbles,defaultPrevented:false,target:null,currentTarget:null},init);}
 preventDefault(){this.defaultPrevented=true;}
 stopPropagation(){this.stopped=true;}
}

class Target{
 constructor(){this._listeners=new Map();}
 addEventListener(type,fn){if(!this._listeners.has(type))this._listeners.set(type,[]);this._listeners.get(type).push(fn);}
 removeEventListener(type,fn){const l=this._listeners.get(type);if(l){const i=l.indexOf(fn);if(i>=0)l.splice(i,1);}}
 dispatchEvent(event){
  if(!(event instanceof MiniEvent))event=Object.assign(new MiniEvent(event.type,{bubbles:event.bubbles}),event);
  event.target||=this;
  for(let node=this;node;node=event.bubbles?node.parentNode:null){
   event.currentTarget=node;
   for(const fn of [...(node._listeners?.get(event.type)||[])])fn.call(node,event);
   if(event.stopped)break;
  }
  return !event.defaultPrevented;
 }
}

export class MiniNode extends Target{
 constructor(){super();this.parentNode=null;this.childNodes=[];}
 get ownerDocument(){return documentRef;}
 get isConnected(){let n=this;while(n.parentNode)n=n.parentNode;return n===documentRef;}
 get firstChild(){return this.childNodes[0]||null;}
 get lastChild(){return this.childNodes.at(-1)||null;}
 get children(){return this.childNodes.filter(n=>n instanceof MiniElement);}
 get firstElementChild(){return this.children[0]||null;}
 get textContent(){return this.childNodes.map(n=>n.textContent).join('');}
 set textContent(v){this.replaceChildren(String(v));}
 contains(node){for(let n=node;n;n=n.parentNode)if(n===this)return true;return false;}
 _adopt(node){
  if(typeof node==='string')return new MiniText(node);
  if(node.parentNode)node.parentNode._detach(node);
  return node;
 }
 _detach(node){
  const doc=documentRef;
  if(doc&&node.contains(doc.activeElement))doc.activeElement=doc.body; // focus fix-up
  const i=this.childNodes.indexOf(node);if(i>=0)this.childNodes.splice(i,1);
  node.parentNode=null;
 }
 append(...nodes){for(const raw of nodes){const node=this._adopt(raw);node.parentNode=this;this.childNodes.push(node);}}
 prepend(...nodes){[...nodes].reverse().forEach(raw=>{const node=this._adopt(raw);node.parentNode=this;this.childNodes.unshift(node);});}
 insertBefore(raw,ref){
  if(!ref)return this.append(raw),raw;
  const node=this._adopt(raw);node.parentNode=this;this.childNodes.splice(this.childNodes.indexOf(ref),0,node);return node;
 }
 replaceChildren(...nodes){for(const child of [...this.childNodes])this._detach(child);this.append(...nodes);}
 remove(){this.parentNode?._detach(this);}
 before(...nodes){const parent=this.parentNode;if(!parent)return;for(const raw of nodes)parent.insertBefore(raw,this);}
 after(...nodes){const parent=this.parentNode;if(!parent)return;const i=parent.childNodes.indexOf(this);parent.insertBefore(nodes[0],parent.childNodes[i+1]||null);for(let k=1;k<nodes.length;k++)nodes[k-1].after(nodes[k]);}
}

class MiniText extends MiniNode{
 constructor(text){super();this.data=String(text);}
 get textContent(){return this.data;}
 set textContent(v){this.data=String(v);}
}

const camel=s=>s.replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),kebab=s=>s.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
const BOOL=['hidden','disabled','open','required','readonly'];

export class MiniElement extends MiniNode{
 constructor(tag){
  super();this.tagName=tag.toUpperCase();this.attributes=new Map();this._value=null;this.checked=false;this.focusCalls=[];
  const el=this;
  this.dataset=new Proxy({},{
   get:(_,k)=>typeof k==='string'?el.getAttribute('data-'+kebab(k))??undefined:undefined,
   set:(_,k,v)=>{el.setAttribute('data-'+kebab(k),v);return true;},
   has:(_,k)=>el.hasAttribute('data-'+kebab(String(k))),
   ownKeys:()=>[...el.attributes.keys()].filter(a=>a.startsWith('data-')).map(a=>camel(a.slice(5))),
   getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true}),
  });
  this.style={setProperty(){},removeProperty(){}};
  this.classList={add:(...c)=>this._classes(s=>c.forEach(x=>s.add(x))),remove:(...c)=>this._classes(s=>c.forEach(x=>s.delete(x))),
   toggle:(c,force)=>{const on=force??!this.classList.contains(c);this._classes(s=>on?s.add(c):s.delete(c));return on;},contains:c=>this.className.split(/\s+/).includes(c)};
  for(const name of BOOL)Object.defineProperty(this,name,{get:()=>this.hasAttribute(name),set:v=>{
   v?this.setAttribute(name,''):this.removeAttribute(name);
   // Browser focus fix-up: a focused element that becomes hidden (or a focused
   // form control that becomes disabled) stops being focused.
   const doc=documentRef,active=doc?.activeElement;
   if(v&&active&&active!==doc.body&&((name==='hidden'&&this.contains(active))||(name==='disabled'&&active===this&&/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(this.tagName))))doc.activeElement=doc.body;
  },configurable:true});
 }
 _classes(fn){const s=new Set(this.className.split(/\s+/).filter(Boolean));fn(s);this.className=[...s].join(' ');}
 setAttribute(k,v){this.attributes.set(k,String(v));}
 getAttribute(k){return this.attributes.has(k)?this.attributes.get(k):null;}
 hasAttribute(k){return this.attributes.has(k);}
 removeAttribute(k){this.attributes.delete(k);}
 get id(){return this.getAttribute('id')||'';}set id(v){this.setAttribute('id',v);}
 get className(){return this.getAttribute('class')||'';}set className(v){this.setAttribute('class',v);}
 get type(){return this.getAttribute('type')||(this.tagName==='BUTTON'?'submit':'text');}
 get href(){return this.getAttribute('href')||'';}set href(v){this.setAttribute('href',v);}
 get options(){return this.querySelectorAll('option');}
 get value(){
  if(this.tagName==='OPTION')return this.getAttribute('value')??this.textContent;
  if(this.tagName==='SELECT'){if(this._value!==null)return this._value;return this.options[0]?.value??'';}
  return this._value??this.getAttribute('value')??'';
 }
 set value(v){this._value=String(v);if(this.tagName==='INPUT'||this.tagName==='TEXTAREA'){this.selectionStart=this.selectionEnd=this._value.length;}}
 get form(){return this.closest('form');}
 setSelectionRange(start,end,direction='none'){this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;}
 /* Like browsers: hidden, detached and DISABLED form controls cannot take focus
    (aria-disabled controls can). Without this, a test could not see focus
    being lost to a natively disabled button. */
 focus(options={}){if(!this.isConnected||this.hidden||(this.disabled&&/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(this.tagName)))return;this.focusCalls.push(options);documentRef.activeElement=this;}
 blur(){if(documentRef.activeElement===this)documentRef.activeElement=documentRef.body;}
 click(){
  const event=new MiniEvent('click',{bubbles:true});this.dispatchEvent(event);
  if(!event.defaultPrevented&&this.tagName==='BUTTON'&&this.type==='submit'){const f=this.form;if(f)f.dispatchEvent(new MiniEvent('submit',{bubbles:true}));}
 }
 reset(){for(const el of this.querySelectorAll('input,textarea,select'))el._value=null;}
 scrollIntoView(options){documentRef.scrolls.push({element:this,options});}
 matches(selector){return selector.split(',').some(part=>matchComplex(this,part.trim()));}
 closest(selector){for(let n=this;n instanceof MiniElement;n=n.parentNode)if(n.matches(selector))return n;return null;}
 querySelectorAll(selector){const out=[];const walk=n=>{for(const c of n.children){if(c.matches(selector))out.push(c);walk(c);}};walk(this);return out;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 getElementById(id){return this.querySelector(`#${id}`);}
}

function matchCompound(el,compound){
 const re=/([#.]?)([\w-]+)|\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]/g;let m,any=false;
 while((m=re.exec(compound))){
  any=true;
  if(m[3]){const want=m[4]??m[5]??m[6];if(!el.hasAttribute(m[3]))return false;if(want!==undefined&&el.getAttribute(m[3])!==want)return false;continue;}
  if(m[1]==='#'){if(el.id!==m[2])return false;}else if(m[1]==='.'){if(!el.className.split(/\s+/).includes(m[2]))return false;}
  else if(el.tagName!==m[2].toUpperCase())return false;
 }
 return any;
}
function matchComplex(el,selector){
 const parts=selector.split(/\s+/).filter(Boolean);
 if(!matchCompound(el,parts.at(-1)))return false;
 let node=el.parentNode;
 for(let i=parts.length-2;i>=0;i--){
  while(node instanceof MiniElement&&!matchCompound(node,parts[i]))node=node.parentNode;
  if(!(node instanceof MiniElement))return false;node=node.parentNode;
 }
 return true;
}

class MiniDocument extends MiniNode{
 constructor(){
  super();
  this.documentElement=new MiniElement('html');this.documentElement.parentNode=this;this.childNodes.push(this.documentElement);
  this.head=new MiniElement('head');this.body=new MiniElement('body');
  this.documentElement.append(this.head,this.body);
  this.activeElement=this.body;this.hidden=false;this.visibilityState='visible';this.readyState='complete';this.scrolls=[];
 }
 createElement(tag){return new MiniElement(tag);}
 createElementNS(_ns,tag){return new MiniElement(tag);}
 createTextNode(text){return new MiniText(text);}
 querySelectorAll(selector){return this.documentElement.querySelectorAll(selector).concat(this.documentElement.matches(selector)?[this.documentElement]:[]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 getElementById(id){return this.documentElement.querySelector(`#${id}`);}
}

/** Build a fresh browser-like global environment. Returns helpers for tests. */
export function installDom({url='https://tkdflow.com/',reducedMotion=false,session={},fetch}={}){
 const doc=new MiniDocument();documentRef=doc;
 const parsed=new URL(url);
 const location={origin:parsed.origin,protocol:parsed.protocol,host:parsed.host,hostname:parsed.hostname,pathname:parsed.pathname,search:parsed.search,hash:parsed.hash,get href(){return this.origin+this.pathname+this.search+this.hash;}};
 const win=new Target();
 const setUrl=u=>{const next=new URL(u,location.href);location.pathname=next.pathname;location.search=next.search;location.hash=next.hash;};
 const history={entries:[location.href],pushState(_s,_t,u){setUrl(u);this.entries.push(location.href);},replaceState(_s,_t,u){setUrl(u);this.entries[this.entries.length-1]=location.href;}};
 const store=init=>{const m=new Map(Object.entries(init));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()};};
 Object.assign(win,{location,history,document:doc,matchMedia:q=>({matches:/reduce/.test(q)?reducedMotion:false,addEventListener(){},removeEventListener(){}})});
 const globals={document:doc,window:win,location,history,Node:MiniNode,HTMLElement:MiniElement,
  sessionStorage:store(session),localStorage:store({}),matchMedia:win.matchMedia,
  CSS:{escape:s=>String(s).replace(/["\\]/g,'\\$&')},addEventListener:win.addEventListener.bind(win),
  removeEventListener:win.removeEventListener.bind(win),dispatchEvent:win.dispatchEvent.bind(win)};
 if(fetch)globals.fetch=fetch;
 const saved={};for(const [k,v] of Object.entries(globals)){saved[k]=Object.getOwnPropertyDescriptor(globalThis,k);Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}
 return {
  doc,win,location,history,
  el:(tag,attrs={},...children)=>{const e=doc.createElement(tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);e.append(...children);return e;},
  event:(type,init)=>new MiniEvent(type,init),
  restore(){for(const [k,d] of Object.entries(saved)){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}documentRef=null;},
 };
}

/** Let pending promises, immediates AND zero-delay timers settle.
 *  Each round waits for a timer turn as well as an immediate: page code that
 *  schedules work with setTimeout(fn,0) (e.g. a reconnect after a sign-in
 *  change) was queued earlier, so it always runs before our own timer, however
 *  coarse or slow the machine's timers are. Waiting on immediates alone made
 *  results depend on timer speed (a CI-only failure). */
export async function settle(rounds=20){
 for(let i=0;i<rounds;i++){
  await new Promise(r=>setTimeout(r,0));
  await new Promise(r=>setImmediate(r));
 }
}
