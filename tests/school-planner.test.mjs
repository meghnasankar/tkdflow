/* My school's forms: a private, browser-only organizer.
   Model and import tests use the real module; store tests use fake storage
   shared by two "tabs"; page tests run the REAL js/pages/school-planner.js on
   the REAL school-forms.html markup in the test DOM. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 STORAGE_KEY,APP,LIMITS,MAX_IMPORT_BYTES,EXPORT_NAME,cleanText,emptyList,addLevel,renameLevel,moveLevel,removeLevel,addForm,moveForm,removeForm,
 restoreRemoved,validateLevels,exportText,parseImport,createPlannerStore,storageMessage,
} from '../js/lib/school-planner.js';
import {FORM_IDS} from '../js/lib/learning-model.js';
import {installDom,settle} from './helpers/mini-dom.mjs';
import {parseInto} from './helpers/mini-html.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const formsJson=read('data/forms.json'),forms=JSON.parse(formsJson);
const html=read('school-forms.html'),mainHtml=html.slice(html.indexOf('<main'),html.indexOf('</main>')+7);
const is=(a,b,msg='not the expected element')=>assert.ok(a===b,`${msg} (got ${a?.dataset?.fk||a?.id||a?.tagName})`);
let n=0;const nid=()=>`t${++n}`;
const build=(...levels)=>levels.reduce((l,[label,...fs])=>{let r=addLevel(l,label,nid());const id=r.level.id;l=r.list;for(const f of fs)l=addForm(l,id,typeof f==='string'&&FORM_IDS.includes(f)?{kind:'lesson',lesson:f}:{kind:'custom',name:f},nid()).list;return l;},emptyList());
const labels=l=>l.levels.map(x=>x.label);

/* ---------- model ---------- */

test('lesson choices are exactly the 23 TKDflow lessons',()=>{
 assert.deepEqual([...FORM_IDS].sort(),forms.filter(f=>f.lessonUrl).map(f=>f.id).sort());
 assert.equal(FORM_IDS.length,23);
});

test('text is cleaned and bounded; nothing is prefilled',()=>{
 assert.deepEqual(emptyList(),{levels:[]});
 assert.equal(cleanText('  Yellow\n\tbelt  ',60),'Yellow belt');
 assert.equal(cleanText('Blue\u202eeulb\u2066x\u0007',60),'Blueeulbx','control and direction marks removed');
 assert.equal(cleanText('Café',60),'Café','NFC');
 assert.equal(cleanText('😀'.repeat(70),60),'😀'.repeat(60),'counted by character, never splitting one');
 assert.equal(addLevel(emptyList(),'   ').error,'Type a belt or level name first.');
 let l=emptyList();for(let i=0;i<LIMITS.levels;i++)l=addLevel(l,`L${i}`).list;
 assert.match(addLevel(l,'one more').error,/up to 30 levels/);
 let one=build(['White']);const id=one.levels[0].id;
 for(let i=0;i<LIMITS.forms;i++)one=addForm(one,id,{kind:'custom',name:`F${i}`}).list;
 assert.match(addForm(one,id,{kind:'lesson',lesson:'koryo'}).error,/up to 12 forms/);
  const w=build(['W']);assert.equal(addForm(w,w.levels[0].id,{kind:'lesson',lesson:'nope'}).error,'Choose a lesson first.');
 assert.equal(addForm(w,w.levels[0].id,{kind:'custom',name:'  '}).error,'Type a form name first.');
});

test('operations never mutate; moves stop at the edges',()=>{
 const l=build(['A','koryo','Kibon 1'],['B']),frozen=JSON.stringify(l);
 assert.deepEqual(labels(moveLevel(l,l.levels[1].id,-1).list),['B','A']);
 assert.equal(moveLevel(l,l.levels[0].id,-1).unchanged,true);
 assert.equal(moveLevel(l,l.levels[1].id,1).unchanged,true);
 const f=l.levels[0].forms;
 assert.deepEqual(moveForm(l,l.levels[0].id,f[1].id,-1).list.levels[0].forms.map(x=>x.id),[f[1].id,f[0].id]);
 assert.equal(renameLevel(l,l.levels[0].id,'  ').error,'A level needs a name.');
 renameLevel(l,l.levels[0].id,'Z');removeLevel(l,l.levels[0].id);removeForm(l,l.levels[0].id,f[0].id);
 assert.equal(JSON.stringify(l),frozen);
});

test('Undo puts the removed item back into the current list and never discards later edits',()=>{
 let l=build(['White','taegeuk-1'],['Yellow','taegeuk-2','Kibon 2'],['Green']);
 const r=removeLevel(l,l.levels[1].id);l=r.list;
 l=renameLevel(l,l.levels[0].id,'White belt').list;            // later edits
 l=addLevel(l,'Blue',nid()).list;
 l=addForm(l,l.levels[1].id,{kind:'lesson',lesson:'taegeuk-3'},nid()).list;
 const back=restoreRemoved(l,r.removed);
 assert.deepEqual(labels(back.list),['White belt','Yellow','Green','Blue'],'back at its old position; later edits kept');
 assert.deepEqual(back.list.levels[1].forms.map(f=>f.lesson||f.name),['taegeuk-2','Kibon 2'],'with its forms');
 assert.deepEqual(back.list.levels[2].forms.map(f=>f.lesson),['taegeuk-3']);
 // A form: re-inserted at its old index, clamped if the level got shorter.
 let m=build(['W','taegeuk-1','taegeuk-2','taegeuk-3']);const lv=m.levels[0].id;
 const rf=removeForm(m,lv,m.levels[0].forms[2].id);m=rf.list;
 m=removeForm(m,lv,m.levels[0].forms[0].id).list;
 assert.deepEqual(restoreRemoved(m,rf.removed).list.levels[0].forms.map(f=>f.lesson),['taegeuk-2','taegeuk-3']);
 // Its level is gone: nothing is invented.
 assert.match(restoreRemoved(removeLevel(m,lv).list,rf.removed).error,/level is no longer/);
});

/* ---------- export / import ---------- */

test('export holds only the visitor’s labels and forms, and imports back to the same list',()=>{
 const l=build(['White','taegeuk-1','Kibon 1'],['Yellow']);
 const text=exportText(l),data=JSON.parse(text);
 assert.deepEqual(Object.keys(data),['app','version','levels']);
 assert.equal(data.app,APP);assert.equal(data.version,1);
 assert.deepEqual(data.levels,[{label:'White',forms:[{lesson:'taegeuk-1'},{name:'Kibon 1'}]},{label:'Yellow',forms:[]}]);
 assert.doesNotMatch(text,/"id"|date|time|user|email/i);
 const back=parseImport(text).list;
 assert.deepEqual(back.levels.map(x=>({label:x.label,forms:x.forms.map(({id,...f})=>f)})),l.levels.map(x=>({label:x.label,forms:x.forms.map(({id,...f})=>f)})));
 assert.ok(back.levels.every((x,i)=>x.id!==l.levels[i].id),'imported items get new local ids');
});

const worst=(ch)=>{let l=emptyList();const t=ch.repeat(LIMITS.label);for(let i=0;i<LIMITS.levels;i++){const r=addLevel(l,t);l=r.list;for(let j=0;j<LIMITS.forms;j++)l=addForm(l,r.level.id,{kind:'custom',name:ch.repeat(LIMITS.name)}).list;}return l;};
test('every valid list re-imports: the largest export fits the byte cap, whatever the characters',()=>{
 for(const ch of ['😀','"','\\','é','x']){
  const l=worst(ch),text=exportText(l),bytes=Buffer.byteLength(text,'utf8');
  assert.equal(l.levels.length,30);assert.equal(l.levels.every(x=>x.forms.length===12),true);
  assert.ok(bytes<=MAX_IMPORT_BYTES,`${JSON.stringify(ch)}: ${bytes} bytes fits ${MAX_IMPORT_BYTES}`);
  const back=parseImport(text);assert.equal(back.error,undefined,JSON.stringify(ch));assert.equal(back.list.levels[29].forms[11].name,ch.repeat(60));
 }
 assert.equal(Buffer.byteLength(exportText(worst('😀')),'utf8'),105396,'root’s measured worst case');
 assert.equal(cleanText('a\uD800b\uDC00c😀',60),'abc😀','unpaired surrogate halves removed; real pairs kept');
});

test('import is strict, bounded and literal: hostile or malformed files are refused with a plain reason',()=>{
 const wrap=(levels,extra={})=>JSON.stringify({app:APP,version:1,levels,...extra});
 const cases=[
  ['not json','{oops',/valid JSON/],[ 'array','[]',/not a TKDflow school forms list/],['other app',JSON.stringify({app:'x',version:1,levels:[]}),/not a TKDflow/],
  ['version',JSON.stringify({app:APP,version:2,levels:[]}),/different version/],['levels missing',JSON.stringify({app:APP,version:1}),/no list of levels/],
  ['too many levels',wrap(Array.from({length:31},(_,i)=>({label:`L${i}`,forms:[]}))),/31 levels; the limit is 30/],
  ['too many forms',wrap([{label:'A',forms:Array.from({length:13},()=>({name:'x'}))}]),/13 forms; the limit is 12/],
  ['long label',wrap([{label:'x'.repeat(61),forms:[]}]),/longer than 60/],['long name',wrap([{label:'A',forms:[{name:'y'.repeat(61)}]}]),/longer than 60/],
  ['empty label',wrap([{label:'  ',forms:[]}]),/no name/],['label type',wrap([{label:7,forms:[]}]),/no name/],
  ['unknown lesson',wrap([{label:'A',forms:[{lesson:'kibon-99'}]}]),/lesson TKDflow doesn’t have/],
  ['both',wrap([{label:'A',forms:[{lesson:'koryo',name:'x'}]}]),/either a lesson or a name/],['neither',wrap([{label:'A',forms:[{}]}]),/either a lesson or a name/],
  ['form type',wrap([{label:'A',forms:['koryo']}]),/not readable/],['forms type',wrap([{label:'A',forms:{}}]),/no list of forms/],
  ['oversize','x'.repeat(MAX_IMPORT_BYTES+1),/too large/],
 ];
 for(const [name,text,re] of cases){const r=parseImport(text);assert.ok(r.error&&!r.list,name);assert.match(r.error,re,name);assert.ok(!r.error.includes('kibon-99'),'never echoes file content');}
 const hostile=parseImport('{"app":"'+APP+'","version":1,"__proto__":{"polluted":1},"levels":[{"label":"<img src=x onerror=alert(1)>","__proto__":{"x":1},"href":"javascript:alert(1)","forms":[{"name":"<script>","href":"javascript:1","id":"evil id"}]}]}');
 assert.equal(({}).polluted,undefined,'no prototype pollution');
 assert.deepEqual(Object.keys(hostile.list.levels[0]).sort(),['forms','id','label']);
 assert.equal(hostile.list.levels[0].label,'<img src=x onerror=alert(1)>','kept as literal text');
 assert.deepEqual(Object.keys(hostile.list.levels[0].forms[0]).sort(),['id','kind','name']);
 assert.notEqual(hostile.list.levels[0].forms[0].id,'evil id','ids are never imported');
});

/* ---------- store ---------- */

function memory(init={}){const m=new Map(Object.entries(init));return {m,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}

test('store: saves, survives blocked storage in memory, and leaves unreadable data until a change',()=>{
 const s=memory(),a=createPlannerStore(()=>s);
 assert.deepEqual(a.load(),{list:emptyList(),state:'ok'});
 const l=build(['White','koryo']);
 assert.deepEqual(a.save(l),{saved:true});
 assert.deepEqual(createPlannerStore(()=>s).load().list,l,'ids kept in browser storage for focus continuity');
 const blocked=createPlannerStore(()=>{throw new DOMException('no','SecurityError');});
 assert.equal(blocked.load().state,'unavailable');assert.deepEqual(blocked.save(l),{saved:false,memory:true});
 const full={getItem:()=>null,setItem:()=>{throw new DOMException('quota','QuotaExceededError');}};
 const q=createPlannerStore(()=>full);q.load();assert.deepEqual(q.save(l),{saved:false,writeFailed:true});assert.equal(q.state,'write-failed');assert.equal(q.unsaved,true);
 for(const bad of ['{bad','{"version":2,"rev":1,"levels":[]}','{"version":1,"rev":-1,"levels":[]}','{"version":1,"rev":1,"levels":[{"label":"","forms":[]}]}']){
  const c=memory({[STORAGE_KEY]:bad}),st=createPlannerStore(()=>c);
  assert.equal(st.load().state,'corrupt');assert.equal(c.getItem(STORAGE_KEY),bad,'left untouched on load');
  assert.deepEqual(st.save(l),{saved:true});assert.equal(st.state,'ok');assert.notEqual(c.getItem(STORAGE_KEY),bad,'replaced only by a change');
 }
 assert.match(storageMessage('unavailable'),/latest changes are kept only on this page and are lost if you reload or leave/);assert.match(storageMessage('unavailable'),/saved here earlier may come back/);assert.match(storageMessage('ok'),/this browser on this device only/);
});

test('store: a save never overwrites what another tab saved meanwhile; the visitor chooses',()=>{
 const s=memory(),a=createPlannerStore(()=>s),b=createPlannerStore(()=>s);
 a.load();b.load();
 const fromA=build(['A']),fromB=build(['B']);
 assert.deepEqual(a.save(fromA),{saved:true});
 const raw=s.getItem(STORAGE_KEY);
 const res=b.save(fromB);
 assert.equal(res.saved,false);assert.deepEqual(res.conflict.list,fromA,'reports the other version');
 assert.equal(s.getItem(STORAGE_KEY),raw,'nothing overwritten');
 assert.equal(b.external(raw).list.levels[0].label,'A');assert.equal(a.external(raw),null,'a tab’s own save is not news');
 assert.deepEqual(b.reload().list,fromA);assert.deepEqual(b.save(fromB),{saved:true},'after loading the other version, saving works');
 assert.equal(a.save(fromA).saved,false,'now A is the stale tab');
 assert.deepEqual(a.replace(fromA),{saved:true},'“keep this tab’s version” replaces it');
 assert.deepEqual(createPlannerStore(()=>s).load().list,fromA);
 const r1=JSON.parse(s.getItem(STORAGE_KEY)).rev;assert.ok(r1>=3,'revision rises on every save');
});

/* ---------- page level ---------- */

let run=0;
async function page({storage='ok',stored=null,formsFail=false}={}){
 const calls=[];
 const fetch=async url=>{calls.push(String(url));if(formsFail&&calls.length===1)return {ok:false,status:500,headers:{get:()=>null},text:async()=>''};return {ok:true,status:200,headers:{get:()=>null},text:async()=>formsJson};};
 const env=installDom({url:'https://tkdflow.com/school-forms.html',fetch});
 if(stored!==null)globalThis.localStorage.setItem(STORAGE_KEY,stored);
 const real=globalThis.localStorage,fault={fail:0,always:false,writes:0,readFail:0};
 if(storage==='blocked')Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new DOMException('blocked','SecurityError');}});
 // 'faulty': reads work; writes throw a quota error while fault.fail > 0 (counting down) or fault.always.
 if(storage==='faulty'){const proxy={getItem:k=>{if(fault.readFail>0){fault.readFail--;throw new DOMException('read','SecurityError');}return real.getItem(k);},removeItem:k=>real.removeItem(k),setItem:(k,v)=>{fault.writes++;if(fault.always||fault.fail>0){if(fault.fail>0)fault.fail--;throw new DOMException('full','QuotaExceededError');}real.setItem(k,v);}};
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get:()=>proxy});}
 parseInto(env.doc,env.doc.body,mainHtml);
 const prints=[];env.win.print=()=>prints.push(1);
 await import(`../js/pages/school-planner.js?run=${++run}`);await settle(4);
 const $=id=>env.doc.getElementById(id);
 const shown=el=>{for(let x=el;x&&x!==env.doc.body;x=x.parentNode)if(x.hidden)return false;return true;};
 const levels=()=>$('sp-levels').children;
 const key=k=>env.doc.querySelector(`[data-fk="${k}"]`);
 const submit=f=>f.dispatchEvent(env.event('submit',{bubbles:true}));
 const addLevelUI=label=>{$('sp-level-name').focus();$('sp-level-name').value=label;submit($('sp-add-level'));};
 const level=i=>{const li=levels()[i];return {li,id:li.dataset.level,head:li.querySelector('h3')};};
 const addLesson=(i,id)=>{const {li}=level(i);const sel=li.querySelector('select');sel.value=id;submit(sel.closest('form'));};
 const addCustom=(i,name)=>{const {li}=level(i);const inp=li.querySelector('form[data-act="add-custom"] input');inp.value=name;submit(inp.closest('form'));};
 const saved=()=>{try{return JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));}catch{return null;}};
 const storageEvent=newValue=>env.win.dispatchEvent(env.event('storage',{key:STORAGE_KEY,newValue}));
 return {...env,calls,prints,$,shown,levels,key,submit,addLevelUI,level,addLesson,addCustom,saved,storageEvent,fault,real,
  status:()=>$('sp-status').textContent,done:()=>env.restore()};
}

test('page: starts empty with a short invitation and browser-only note; the lesson list is the only request',async()=>{
 const p=await page();
 try{
  assert.equal(p.shown(p.$('sp-app')),true);assert.equal(p.$('sp-nojs').hidden,true);assert.equal(p.shown(p.$('sp-loading')),false);
  assert.equal(p.levels().length,0);assert.equal(p.shown(p.$('sp-empty')),true);
  assert.deepEqual(p.calls,['/data/forms.json']);
  assert.equal(p.$('sp-storage').textContent,'Saved in this browser on this device only.');
  const intro=p.$('sp-app').querySelector('.sp-intro').textContent;
  assert.match(intro,/Add your school’s own names in your order/);assert.match(intro,/saved only in this browser on this device/);
  assert.match(intro,/isn’t part of your account/);assert.match(intro,/please don’t add people’s names or other personal details/);
  assert.equal(p.saved(),null,'nothing is written until the visitor adds something');
  assert.equal(p.$('sp-clear').getAttribute('aria-disabled'),'true');
 }finally{p.done();}
});

test('page: keyboard adding keeps focus where you type; lessons link to the lesson, your own names never link',async()=>{
 const p=await page();
 try{
  p.addLevelUI('   ');assert.equal(p.status(),'Type a belt or level name first.');assert.equal(p.levels().length,0);
  p.addLevelUI('Yellow belt');
  assert.equal(p.levels().length,1);assert.equal(p.level(0).head.textContent,'Yellow belt');
  assert.equal(p.$('sp-level-name').value,'');is(p.doc.activeElement,p.$('sp-level-name'),'focus stays in the name field');
  assert.equal(p.status(),'Added Yellow belt (level 1 of 1).');
  assert.deepEqual(p.saved().levels.map(l=>l.label),['Yellow belt']);
  const sel=p.level(0).li.querySelector('select');sel.focus();
  assert.deepEqual(sel.querySelectorAll('optgroup').map(g=>g.getAttribute('label')),['WT / Kukkiwon','ITF','ATA / Songahm']);
  assert.equal(sel.querySelectorAll('option').filter(o=>o.value).length,23);
  p.addLesson(0,'koryo');
  is(p.doc.activeElement,p.key(`al:${p.level(0).id}`),'focus back on the lesson choice');
  const first=p.level(0).li.querySelector('.sp-form');
  assert.equal(first.querySelector('a').getAttribute('href'),'/koryo.html');assert.equal(first.querySelector('a').textContent,'Koryo');
  assert.equal(first.querySelector('.sp-form-meta').textContent,'WT / Kukkiwon lesson');
  p.addCustom(0,'<img src=x onerror=alert(1)> Kibon');
  const own=p.level(0).li.querySelectorAll('.sp-form')[1];
  assert.equal(own.querySelector('a'),null,'no link for your own entry');assert.equal(own.querySelector('img'),null,'no markup');
  assert.equal(own.querySelector('.sp-form-name').textContent,'<img src=x onerror=alert(1)> Kibon','shown as literal text');
  assert.equal(own.querySelector('.sp-form-meta').textContent,'Your entry · no TKDflow lesson');
  assert.deepEqual(p.saved().levels[0].forms.map(f=>f.lesson||f.name),['koryo','<img src=x onerror=alert(1)> Kibon']);
  const remove=p.key(`fr:${p.saved().levels[0].forms[0].id}`);
  assert.equal(remove.getAttribute('aria-labelledby'),`${remove.id} sp-n-${p.saved().levels[0].forms[0].id}`,'named “Remove Koryo”');
  assert.equal(remove.getAttribute('aria-describedby'),`sp-h-${p.level(0).id}`,'described by its level');
 }finally{p.done();}
});

test('page: Move up/down keeps focus on the moved item; first and last are aria-disabled and keep focus',async()=>{
 const p=await page();
 try{
  for(const l of ['White','Yellow','Green'])p.addLevelUI(l);
  const g=p.level(2).id;
  p.key(`lu:${g}`).focus();p.key(`lu:${g}`).click();
  assert.deepEqual(p.saved().levels.map(l=>l.label),['White','Green','Yellow']);
  is(p.doc.activeElement,p.key(`lu:${g}`),'focus follows the moved level');assert.equal(p.status(),'Moved Green to 2 of 3.');
  p.key(`lu:${g}`).click();
  const top=p.key(`lu:${g}`);assert.equal(top.getAttribute('aria-disabled'),'true');assert.equal(top.disabled,false);
  is(p.doc.activeElement,top,'still focused at the top');
  top.click();assert.deepEqual(p.saved().levels.map(l=>l.label),['Green','White','Yellow'],'no change at the edge');
  is(p.doc.activeElement,top);
  p.addLesson(0,'taegeuk-1');p.addLesson(0,'taegeuk-2');
  const t2=p.saved().levels[0].forms[1].id;
  p.key(`fu:${t2}`).focus();p.key(`fu:${t2}`).click();
  is(p.doc.activeElement,p.key(`fu:${t2}`));assert.equal(p.status(),'Moved Taegeuk Yi Jang to 1 of 2 in Green.');
 }finally{p.done();}
});

test('page: Remove moves focus to the next item; Undo restores it in place and any later change retires Undo',async()=>{
 const p=await page();
 try{
  for(const l of ['White','Yellow','Green'])p.addLevelUI(l);
  p.addLesson(1,'taegeuk-2');
  const y=p.level(1).id,g=p.level(2).id;
  p.key(`lr:${y}`).focus();p.key(`lr:${y}`).click();
  assert.deepEqual(p.saved().levels.map(l=>l.label),['White','Green']);
  is(p.doc.activeElement,p.key(`lr:${g}`),'focus on the level now in that place');
  assert.equal(p.status(),'Removed Yellow and its 1 form.');assert.equal(p.shown(p.$('sp-undo')),true);
  p.$('sp-undo').focus();p.$('sp-undo').click();
  assert.deepEqual(p.saved().levels.map(l=>l.label),['White','Yellow','Green']);
  assert.deepEqual(p.saved().levels[1].forms.map(f=>f.lesson),['taegeuk-2']);
  is(p.doc.activeElement,p.key(`lr:${y}`),'focus on the restored level');assert.equal(p.$('sp-undo').hidden,true);assert.equal(p.status(),'Restored Yellow.');
  // A later edit retires Undo, so it can never discard that edit.
  p.key(`lr:${y}`).click();
  const w=p.level(0);const input=w.li.querySelector('.sp-rename input');input.value='White belt';input.dispatchEvent(p.event('change',{bubbles:true}));
  assert.equal(p.$('sp-undo').hidden,true,'Undo is gone after the rename');
  assert.equal(w.head.textContent,'White belt');assert.deepEqual(p.saved().levels.map(l=>l.label),['White belt','Green']);
  // Removing the last form of a level hands focus to that level's lesson choice.
  p.addLesson(1,'koryo');const k=p.saved().levels[1].forms[0].id;
  p.key(`fr:${k}`).focus();p.key(`fr:${k}`).click();
  is(p.doc.activeElement,p.key(`al:${g}`),'focus on Add a lesson');
  // Removing the only level hands focus to the level name field.
  p.$('sp-clear-yes').click();p.addLevelUI('Only');const o=p.level(0).id;p.key(`lr:${o}`).focus();p.key(`lr:${o}`).click();
  is(p.doc.activeElement,p.$('sp-level-name'));
 }finally{p.done();}
});

test('page: unsubmitted typing and choices in other levels survive adds, moves, removals, Undo and loading another tab’s version',async()=>{
 const p=await page();
 try{
  for(const l of ['White','Yellow','Green','Blue'])p.addLevelUI(l);
  const [w,y,g,b]=[0,1,2,3].map(i=>p.level(i).id);
  const field=k=>p.key(k);
  field(`ac:${w}`).value='Kibon 1';            // typed own form name, not added
  field(`al:${y}`).value='koryo';              // chosen lesson, not added
  field(`rn:${g}`).value='Green stripe';       // rename being typed
  const drafts=()=>[field(`ac:${w}`)?.value,field(`al:${y}`)?.value,field(`rn:${g}`)?.value];
  const same=(msg)=>assert.deepEqual(drafts(),['Kibon 1','koryo','Green stripe'],msg);
  p.addLevelUI('Red');same('after adding a level');
  p.key(`ld:${b}`).click();same('after moving another level');
  p.addLesson(3,'taegeuk-1');same('after adding a lesson to another level');
  assert.equal(p.key(`al:${b}`)?.value,'','only the submitted choice is cleared');
  p.key(`lr:${b}`).click();same('after removing another level');
  p.$('sp-undo').click();same('after Undo');
  // Submitting a draft clears only that field.
  p.submit(field(`ac:${w}`).closest('form'));
  assert.equal(field(`ac:${w}`).value,'');assert.deepEqual([field(`al:${y}`).value,field(`rn:${g}`).value],['koryo','Green stripe']);
  assert.deepEqual(p.saved().levels[0].forms.map(f=>f.name),['Kibon 1']);
  // Another tab saves while drafts exist: nothing is replaced; loading the other version keeps the drafts.
  const other=createPlannerStore(()=>globalThis.localStorage);other.save(addLevel(other.load().list,'Black').list);
  p.storageEvent(globalThis.localStorage.getItem(STORAGE_KEY));
  assert.equal(p.shown(p.$('sp-conflict')),true);assert.deepEqual([field(`al:${y}`).value,field(`rn:${g}`).value],['koryo','Green stripe']);
  p.$('sp-conflict-load').click();
  assert.equal(p.levels().at(-1).querySelector('h3').textContent,'Black');
  assert.deepEqual([field(`al:${y}`).value,field(`rn:${g}`).value],['koryo','Green stripe'],'still being typed: kept');
  assert.equal(p.status(),'Loaded the version saved in the other tab. This tab’s unsaved list changes were replaced.');
 }finally{p.done();}
});

test('page: import shows a literal preview first; Cancel keeps the list, Replace replaces it; bad files are refused safely',async()=>{
 const p=await page();
 try{
  p.addLevelUI('Mine');
  const file=(text,size=text.length)=>{let read=0;return {f:{name:'x.json',size,text:async()=>{read++;return text;}},reads:()=>read};};
  const choose=async f=>{p.$('sp-import-file').files=[f];p.$('sp-import-file').dispatchEvent(p.event('change',{bubbles:true}));await settle(3);};
  const big=file('{}',MAX_IMPORT_BYTES+1);await choose(big.f);
  assert.equal(big.reads(),0,'too large: refused before reading');assert.match(p.status(),/too large/);assert.equal(p.$('sp-preview').hidden,true);
  await choose(file('{not json').f);assert.match(p.status(),/^That file couldn’t be imported: the file is not a TKDflow list/);
  const good=JSON.stringify({app:APP,version:1,levels:[{label:'<b>Black</b>',forms:[{lesson:'koryo'},{name:'<i>Kibon</i>'}]},{label:'Red',forms:[]}]});
  await choose(file(good).f);
  assert.equal(p.shown(p.$('sp-preview')),true);is(p.doc.activeElement,p.$('sp-preview-title'),'focus on the preview');
  assert.equal(p.$('sp-preview-text').textContent,'Replace your list (1 level, 0 forms) with the list in this file (2 levels, 2 forms)?');
  const items=p.$('sp-preview-list').children;
  assert.equal(items[0].firstChild.textContent,'<b>Black</b>');assert.equal(items[0].querySelector('b'),null,'literal, not markup');
  assert.deepEqual(items[0].querySelector('ul').children.map(li=>li.textContent),['Koryo','<i>Kibon</i> (your entry)']);
  assert.deepEqual(p.saved().levels.map(l=>l.label),['Mine'],'nothing replaced before the choice');
  p.$('sp-preview-cancel').click();
  assert.equal(p.$('sp-preview').hidden,true);is(p.doc.activeElement,p.$('sp-import-file'));assert.equal(p.status(),'Import cancelled. Your list is unchanged.');
  assert.deepEqual(p.saved().levels.map(l=>l.label),['Mine']);
  await choose(file(good).f);p.$('sp-preview-replace').click();
  assert.deepEqual(p.saved().levels.map(l=>l.label),['<b>Black</b>','Red']);is(p.doc.activeElement,p.$('sp-list-title'));
  assert.equal(p.status(),'Imported 2 levels, 2 forms.');assert.equal(p.level(0).head.textContent,'<b>Black</b>');
  // The largest valid list, measured as a real file is (UTF-8 bytes), still imports.
  const biggest=exportText(worst('😀'));
  await choose(file(biggest,Buffer.byteLength(biggest,'utf8')).f);
  assert.equal(p.$('sp-preview-text').textContent,'Replace your list (2 levels, 2 forms) with the list in this file (30 levels, 360 forms)?');
  p.$('sp-preview-replace').click();assert.equal(p.levels().length,30);assert.equal(p.saved().levels[29].forms.length,12);
 }finally{p.done();}
});

test('page: export downloads exactly the list; print uses the browser; clearing asks first',async()=>{
 const p=await page();const realCreate=URL.createObjectURL,realRevoke=URL.revokeObjectURL;let blob=null;
 URL.createObjectURL=b=>{blob=b;return 'blob:test';};URL.revokeObjectURL=()=>{};
 try{
  p.$('sp-export').click();assert.equal(blob,null);assert.equal(p.status(),'Nothing to export yet: add a level first.');
  p.addLevelUI('White');p.addLesson(0,'taegeuk-1');
  let clicked=null;const orig=p.doc.body.append.bind(p.doc.body);
  p.doc.body.append=(...n)=>{for(const x of n)if(x.tagName==='A')x.addEventListener('click',()=>{clicked={href:x.getAttribute('href'),download:x.getAttribute('download')};});orig(...n);};
  p.$('sp-export').click();
  assert.deepEqual(clicked,{href:'blob:test',download:EXPORT_NAME});
  assert.equal(blob.type,'application/json');
  assert.deepEqual(JSON.parse(await blob.text()),{app:APP,version:1,levels:[{label:'White',forms:[{lesson:'taegeuk-1'}]}]});
  assert.equal(p.status(),`Exported 1 level, 1 form. Look for ${EXPORT_NAME} in your downloads.`);
  p.$('sp-print').click();assert.equal(p.prints.length,1);
  p.$('sp-clear').click();assert.equal(p.shown(p.$('sp-clear-confirm')),true);is(p.doc.activeElement,p.$('sp-clear-text'));
  p.$('sp-clear-no').click();assert.equal(p.levels().length,1);is(p.doc.activeElement,p.$('sp-clear'));
  p.$('sp-clear').click();p.$('sp-clear-yes').click();
  assert.equal(p.levels().length,0);assert.deepEqual(p.saved().levels,[]);is(p.doc.activeElement,p.$('sp-level-name'));
 }finally{URL.createObjectURL=realCreate;URL.revokeObjectURL=realRevoke;p.done();}
});

test('page: blocked storage keeps working in memory and says so; unreadable data is left until a change',async()=>{
 const b=await page({storage:'blocked'});
 try{
  assert.equal(b.$('sp-storage').textContent,storageMessage('unavailable'));assert.match(b.$('sp-storage').textContent,/Use Export to keep a copy\.$/);assert.ok(b.$('sp-storage').classList.contains('is-warn'));
  b.addLevelUI('White');assert.equal(b.levels().length,1,'editing works in memory');assert.equal(b.status(),'Added White (level 1 of 1).');
 }finally{b.done();}
 const c=await page({stored:'{broken'});
 try{
  assert.match(c.$('sp-storage').textContent,/couldn’t be read/);assert.equal(globalThis.localStorage.getItem(STORAGE_KEY),'{broken');
  c.addLevelUI('White');assert.deepEqual(c.saved().levels.map(l=>l.label),['White'],'replaced only by a change');
  assert.equal(c.$('sp-storage').textContent,'Saved in this browser on this device only.');
 }finally{c.done();}
});

test('page: another tab’s change loads when you are idle, but never replaces typing; you choose which version to keep',async()=>{
 const p=await page();
 try{
  p.addLevelUI('White');p.addLevelUI('Yellow');
  const other=createPlannerStore(()=>globalThis.localStorage);other.load();
  // Idle: the other tab's change is shown, keyboard focus kept on the same control.
  const y=p.level(1).id;p.key(`lr:${y}`).focus();
  other.save(renameLevel(other.load().list,p.level(0).id,'White belt').list);
  p.storageEvent(globalThis.localStorage.getItem(STORAGE_KEY));
  assert.equal(p.level(0).head.textContent,'White belt');assert.equal(p.status(),'Updated with changes made in another tab.');
  is(p.doc.activeElement,p.key(`lr:${y}`),'focus kept');assert.equal(p.$('sp-conflict').hidden,true);
  // Typing a rename: the other tab's change does not replace it.
  const input=p.level(1).li.querySelector('.sp-rename input');input.focus();input.value='Yellow stripe';
  other.load();other.save(addLevel(other.load().list,'Green').list);
  p.storageEvent(globalThis.localStorage.getItem(STORAGE_KEY));
  assert.equal(p.shown(p.$('sp-conflict')),true);assert.equal(input.value,'Yellow stripe','typing kept');is(p.doc.activeElement,input);
  assert.equal(p.levels().length,2,'not replaced');assert.match(p.status(),/changed in another tab\. What you are typing is kept/);
  p.$('sp-conflict-keep').click();
  assert.deepEqual(p.saved().levels.map(l=>l.label),['White belt','Yellow stripe'],'this tab’s version, with the typed rename, replaced the other');
  assert.equal(p.$('sp-conflict').hidden,true);is(p.doc.activeElement,p.$('sp-status'));
  // A save that would overwrite another tab's newer save is held until the visitor chooses.
  other.load();other.save(addLevel(other.load().list,'Blue').list);
  const theirs=globalThis.localStorage.getItem(STORAGE_KEY);
  p.addLevelUI('Red');
  assert.equal(globalThis.localStorage.getItem(STORAGE_KEY),theirs,'not overwritten');
  assert.equal(p.shown(p.$('sp-conflict')),true);assert.equal(p.status(),'Added Red (level 3 of 3). Not saved yet: choose which version to keep above.');
  is(p.doc.activeElement,p.$('sp-level-name'),'focus stays where you were typing');
  p.$('sp-conflict-load').click();
  assert.deepEqual([...p.levels()].map(li=>li.querySelector('h3').textContent),['White belt','Yellow stripe','Blue']);
  is(p.doc.activeElement,p.$('sp-list-title'));assert.match(p.status(),/Loaded the version saved in the other tab/);
 }finally{p.done();}
});

test('page: a focused Undo hands focus to the status when an outside change retires it',async()=>{
 const p=await page();
 try{
  p.addLevelUI('White');p.addLevelUI('Yellow');p.key(`lr:${p.level(1).id}`).click();
  p.$('sp-undo').focus();
  const other=createPlannerStore(()=>globalThis.localStorage);other.save(addLevel(other.load().list,'Green').list);
  p.storageEvent(globalThis.localStorage.getItem(STORAGE_KEY));
  assert.equal(p.$('sp-undo').hidden,true);is(p.doc.activeElement,p.$('sp-status'),'not <body>');
 }finally{p.done();}
});

test('page: if the lesson list fails, Try again hands focus to the loading message, then opens the organizer',async()=>{
 const p=await page({formsFail:true});
 try{
  assert.equal(p.shown(p.$('sp-load-error')),true);assert.equal(p.shown(p.$('sp-app')),false);
  p.$('sp-load-retry').focus();p.$('sp-load-retry').click();
  is(p.doc.activeElement,p.$('sp-loading'),'focus on “Loading…”, not <body>');
  await settle(4);
  assert.equal(p.shown(p.$('sp-app')),true);is(p.doc.activeElement,p.$('sp-list-title'));
 }finally{p.done();}
});

test('the page is private, literal and honest: no account, network beyond the lesson list, HTML injection or invented curricula',()=>{
 const src=read('js/pages/school-planner.js')+read('js/lib/school-planner.js');
 assert.doesNotMatch(src,/innerHTML|insertAdjacentHTML|account-service|supabase|sendBeacon|XMLHttpRequest|sessionStorage|fetch\(/);
 assert.equal((read('js/pages/school-planner.js').match(/loadJSON\(/g)||[]).length,1);
 assert.match(read('js/pages/school-planner.js'),/loadJSON\('\/data\/forms\.json'/);
 const main=mainHtml.replace(/<[^>]+>/g,' ');
 assert.doesNotMatch(main,/instructor|reviewed|certif|official curriculum|recommended order|typical/i,'no reviewer banners or invented curricula');
 assert.doesNotMatch(mainHtml,/<li class="sp-level"/,'no prefilled levels');
 assert.doesNotMatch(mainHtml,/type="(email|tel|date|number)"/,'no personal-data fields');
 assert.doesNotMatch(main,/\b(date of birth|birthday|your age|phone|email address)\b/i,'none asked for');
 assert.match(read('layout/footer.html'),/<a href="\/school-forms\.html">My school’s forms<\/a>/);
 assert.match(read('forms.html'),/href="\/school-forms\.html"/);assert.match(read('start-here.html'),/href="\/school-forms\.html"/);
 assert.equal(JSON.parse(read('data/community.json')).posts.find(p=>p.id==='school-forms').url,'school-forms.html');
 assert.match(read('assets/icons.svg'),/<symbol id="clipboard" viewBox="0 0 24 24">/);
 for(const lesson of forms.filter(f=>f.lessonUrl)){const h=read(lesson.lessonUrl);assert.doesNotMatch(h.slice(h.indexOf('<main'),h.indexOf('</main>')),/school-forms\.html/,'not added to lesson content (the shared footer link only)');}
 assert.doesNotMatch(read('layout/header.html'),/school-forms/,'not in the top navigation');
});

test('another tab’s save while Clear is being confirmed shows the conflict, and a stale Yes cannot overwrite it',async()=>{
 const p=await page();
 try{
  p.addLevelUI('White');p.addLevelUI('Yellow');
  p.$('sp-clear').click();
  const asked=p.$('sp-clear-text').textContent;
  assert.match(asked,/^Clear all 2 levels/);
  // Another tab adds a level meanwhile.
  const other=createPlannerStore(()=>globalThis.localStorage);other.save(addLevel(other.load().list,'Black').list);
  p.storageEvent(globalThis.localStorage.getItem(STORAGE_KEY));
  assert.equal(p.shown(p.$('sp-conflict')),true,'the conflict notice is shown instead of adopting the change silently');
  assert.equal(p.levels().length,2,'this tab still shows what the confirmation describes');
  assert.equal(p.shown(p.$('sp-clear-confirm')),true);assert.equal(p.$('sp-clear-text').textContent,asked);
  assert.match(p.status(),/changed in another tab/);
  // Yes on the confirmation that predates the other tab's save.
  p.$('sp-clear-yes').click();
  assert.deepEqual(p.saved().levels.map(l=>l.label),['White','Yellow','Black'],'the other tab’s newer list stays saved');
  assert.match(p.status(),/^List cleared\. Not saved yet: choose which version to keep above\.$/);
  assert.equal(p.shown(p.$('sp-conflict')),true);
  // The existing choice still works: loading the other version brings back all three levels.
  p.$('sp-conflict-load').click();
  assert.deepEqual(p.levels().map(l=>l.querySelector('h3').textContent),['White','Yellow','Black']);
 }finally{await p.done?.();}
});

test('after another tab’s version is loaded, the old Clear confirmation is gone and a new Clear counts the loaded list',async()=>{
 const p=await page();
 try{
  p.addLevelUI('White');p.addLevelUI('Yellow');
  p.$('sp-clear').click();
  const other=createPlannerStore(()=>globalThis.localStorage);other.save(addLevel(other.load().list,'Black').list);
  p.storageEvent(globalThis.localStorage.getItem(STORAGE_KEY));
  p.$('sp-conflict-load').click();
  assert.equal(p.shown(p.$('sp-clear-confirm')),false,'the confirmation for the old 2 levels is closed');
  assert.equal(p.levels().length,3);assert.deepEqual(p.saved().levels.map(l=>l.label),['White','Yellow','Black']);
  p.$('sp-clear').click();
  assert.match(p.$('sp-clear-text').textContent,/^Clear all 3 levels/,'a fresh confirmation counts what is shown');
  p.$('sp-clear-no').click();assert.equal(p.levels().length,3);assert.equal(p.saved().levels.length,3);
  p.$('sp-clear').click();p.$('sp-clear-yes').click();
  assert.deepEqual(p.saved().levels,[],'a confirmed Clear of the shown list still works');
 }finally{await p.done?.();}
});

test('adding or renaming in this tab while Clear is being confirmed closes the old confirmation',async()=>{
 const p=await page();
 try{
  p.addLevelUI('White');p.addLevelUI('Yellow');
  p.$('sp-clear').click();assert.match(p.$('sp-clear-text').textContent,/^Clear all 2 levels/);
  p.addLevelUI('Green');
  assert.equal(p.shown(p.$('sp-clear-confirm')),false,'an add closes the confirmation');
  p.$('sp-clear').click();assert.match(p.$('sp-clear-text').textContent,/^Clear all 3 levels/);
  const rename=p.doc.querySelector('.sp-rename input');rename.value='White belt';p.submit(rename.closest('form'));
  assert.equal(p.saved().levels[0].label,'White belt');
  assert.equal(p.shown(p.$('sp-clear-confirm')),false,'a rename closes it too');
  assert.equal(p.saved().levels.length,3,'nothing was cleared');
 }finally{await p.done?.();}
});

/* ── a failed write is not blocked storage (item 39) ─────────────────── */
function flaky(init={}){const m=memory(init),f={fail:0,always:false};return {f,m,getItem:k=>m.getItem(k),removeItem:k=>m.removeItem(k),setItem:(k,v)=>{if(f.always||f.fail>0){if(f.fail>0)f.fail--;throw new DOMException('full','QuotaExceededError');}m.setItem(k,v);}};}
const savedLabels=raw=>JSON.parse(raw).levels.map(l=>l.label);
test('store: a failed write keeps the last save as the known version and the next save stores every current edit',()=>{
 const st=flaky(),a=createPlannerStore(()=>st);a.load();
 let l=build(['White']);assert.deepEqual(a.save(l),{saved:true});
 st.f.fail=1;l=build(['White'],['Yellow']);
 assert.deepEqual(a.save(l),{saved:false,writeFailed:true});assert.equal(a.state,'write-failed');assert.equal(a.unsaved,true);
 assert.deepEqual(savedLabels(st.m.getItem(STORAGE_KEY)),['White'],'the older saved list is untouched');
 assert.equal(a.external(st.m.getItem(STORAGE_KEY)),null,'its own last save is not news');
 l=build(['White'],['Yellow'],['Green']);assert.deepEqual(a.save(l),{saved:true});assert.equal(a.state,'ok');
 assert.deepEqual(savedLabels(st.m.getItem(STORAGE_KEY)),['White','Yellow','Green']);
 // Continued failure stays warned, and every attempt is a real retry.
 st.f.always=true;for(let i=0;i<3;i++)assert.deepEqual(a.save(build(['X'+i])),{saved:false,writeFailed:true});
 assert.equal(a.state,'write-failed');assert.deepEqual(savedLabels(st.m.getItem(STORAGE_KEY)),['White','Yellow','Green']);
 assert.deepEqual(a.replace(build(['Kept'])),{saved:false,writeFailed:true},'Keep also tries, and reports the failure');
 st.f.always=false;assert.deepEqual(a.replace(build(['Kept'])),{saved:true});assert.deepEqual(savedLabels(st.m.getItem(STORAGE_KEY)),['Kept']);
 // Unreadable storage is different: it stays memory-only.
 const blocked=createPlannerStore(()=>{throw new Error('blocked');});blocked.load();
 assert.equal(blocked.unsaved,false,'starting blocked and empty claims no unsaved edits');
 assert.deepEqual(blocked.save(l),{saved:false,memory:true});assert.equal(blocked.state,'unavailable');assert.equal(blocked.unsaved,true,'a change kept only in memory is unsaved');
});

test('store: another tab’s save after a failed write is a conflict, never overwritten, until Load or Keep',()=>{
 const st=flaky(),a=createPlannerStore(()=>st),b=createPlannerStore(()=>st.m);
 a.load();a.save(build(['White']));
 st.f.fail=1;assert.equal(a.save(build(['White'],['Yellow'])).writeFailed,true);
 b.load();b.save(build(['White'],['Black']));
 const raw=st.m.getItem(STORAGE_KEY);
 assert.deepEqual(a.external(raw).list.levels.map(l=>l.label),['White','Black'],'the other version is news');
 const r=a.save(build(['White'],['Yellow'],['Green']));
 assert.ok(r.conflict,'the next save reports a conflict');assert.deepEqual(savedLabels(st.m.getItem(STORAGE_KEY)),['White','Black'],'and does not overwrite');
 assert.deepEqual(a.reload().list.levels.map(l=>l.label),['White','Black']);assert.equal(a.state,'ok','Load adopts and clears the warning');
});

test('messages: a failed write says the latest changes are not stored and the older list returns on reload; blocked storage is unchanged',()=>{
 const m=storageMessage('write-failed');
 assert.match(m,/latest changes couldn’t be saved/);assert.match(m,/list last saved here comes back without them/);assert.match(m,/Export/);assert.match(m,/tries again/);
 assert.doesNotMatch(m,/lost if you reload/,'a failed write does not claim the changes are lost on reload without saying the older list returns');
 const u=storageMessage('unavailable');
 assert.match(u,/latest changes are kept only on this page/);assert.match(u,/saved here earlier may come back/);assert.doesNotMatch(u,/tries again/,'unreadable storage does not promise a retry');
 for(const msg of [m,u])assert.doesNotMatch(msg,/list lasts only|whole list|entire list/,'neither claims the whole list disappears');
});

test('page: one failed save warns, keeps editing, and the next change saves everything and says so',async()=>{
 const p=await page({storage:'faulty'});
 try{
  p.addLevelUI('White');assert.deepEqual(p.saved().levels.map(l=>l.label),['White']);
  p.fault.fail=1;p.addLevelUI('Yellow');
  assert.equal(p.status(),'Added Yellow (level 2 of 2). Not saved in this browser: see the notice above.');
  assert.equal(p.$('sp-storage').textContent,storageMessage('write-failed'));assert.ok(p.$('sp-storage').classList.contains('is-warn'));
  assert.equal(p.levels().length,2,'the list on the page keeps the change');assert.deepEqual(p.saved().levels.map(l=>l.label),['White']);
  p.addLevelUI('Green');
  assert.equal(p.status(),'Added Green (level 3 of 3). Your earlier unsaved changes are now saved too.');
  assert.deepEqual(p.saved().levels.map(l=>l.label),['White','Yellow','Green']);
  assert.equal(p.$('sp-storage').textContent,storageMessage('ok'));assert.ok(!p.$('sp-storage').classList.contains('is-warn'));
  // Continued failure stays warned on every change.
  p.fault.always=true;p.addLevelUI('Blue');p.addLevelUI('Red');
  assert.match(p.status(),/^Added Red .*Not saved in this browser/);assert.equal(p.$('sp-storage').textContent,storageMessage('write-failed'));
  assert.equal(p.levels().length,5);assert.equal(p.saved().levels.length,3);
 }finally{await p.done?.();}
});

test('page: another tab’s save after a failed write shows the conflict instead of replacing unsaved changes; Keep and Load both work',async()=>{
 for(const choice of ['keep','load']){
  const p=await page({storage:'faulty'});
  try{
   p.addLevelUI('White');p.fault.fail=1;p.addLevelUI('Yellow');
   const other=createPlannerStore(()=>p.real);other.save(addLevel(other.load().list,'Black').list);
   p.storageEvent(p.real.getItem(STORAGE_KEY));
   assert.equal(p.shown(p.$('sp-conflict')),true,'conflict, not a silent adopt');
   assert.deepEqual([...p.levels()].map(li=>li.querySelector('h3').textContent),['White','Yellow'],'unsaved changes stay on the page');
   assert.match(p.status(),/while your latest changes here weren’t saved/);
   p.addLevelUI('Green');
   assert.match(p.status(),/Not saved yet: choose which version to keep above/);
   assert.deepEqual(p.saved().levels.map(l=>l.label),['White','Black'],'nothing overwrites the other tab automatically');
   if(choice==='keep'){
    p.$('sp-conflict-keep').click();
    assert.deepEqual(p.saved().levels.map(l=>l.label),['White','Yellow','Green']);assert.equal(p.status(),'Kept this tab’s version. It replaced the other one.');
   }else{
    p.$('sp-conflict-load').click();
    assert.deepEqual([...p.levels()].map(li=>li.querySelector('h3').textContent),['White','Black']);
   }
   assert.equal(p.$('sp-storage').textContent,storageMessage('ok'),`${choice}: the warning clears once a version is stored`);
  }finally{await p.done?.();}
 }
});

test('store: unsaved changes stay marked through a later read failure, until a successful write or an adopted version',()=>{
 const st=flaky(),reads={fail:0},src={getItem:k=>{if(reads.fail>0){reads.fail--;throw new Error('read');}return st.getItem(k);},setItem:(k,v)=>st.setItem(k,v),removeItem:k=>st.removeItem(k)};
 const a=createPlannerStore(()=>src),b=createPlannerStore(()=>st.m);
 a.load();a.save(build(['White']));assert.equal(a.unsaved,false);
 st.f.fail=1;a.save(build(['White'],['Yellow']));assert.equal(a.unsaved,true);
 // Load the other version fails to read: storage becomes unreadable, but the edits are still unsaved.
 b.load();b.save(build(['White'],['Black']));reads.fail=1;
 assert.equal(a.reload().list,null);assert.equal(a.state,'unavailable');assert.equal(a.unsaved,true);
 // An explicit save that can't read is unsaved too, not forgotten.
 assert.deepEqual(a.save(build(['White'],['Yellow'],['Green'])),{saved:false,memory:true});assert.equal(a.unsaved,true);
 // Only adopting the stored version clears it.
 assert.deepEqual(a.reload().list.levels.map(l=>l.label),['White','Black']);assert.equal(a.unsaved,false);assert.equal(a.state,'ok');
});

test('page: after a failed write and a failed read, another tab’s later save still shows the conflict and keeps the unsaved levels',async()=>{
 // Case 1: Load the other version fails to read, then reads recover and another save arrives.
 let p=await page({storage:'faulty'});
 try{
  p.addLevelUI('White');p.fault.fail=1;p.addLevelUI('Yellow');
  let other=createPlannerStore(()=>p.real);other.save(addLevel(other.load().list,'Black').list);
  p.storageEvent(p.real.getItem(STORAGE_KEY));assert.equal(p.shown(p.$('sp-conflict')),true);
  p.fault.readFail=1;p.$('sp-conflict-load').click();
  assert.equal(p.status(),'The other version couldn’t be read, so this tab’s list is kept.');
  assert.equal(p.$('sp-storage').textContent,storageMessage('unavailable'),'the notice no longer promises a retry once storage can’t be read');
  other=createPlannerStore(()=>p.real);other.save(addLevel(other.load().list,'Blue').list);
  p.storageEvent(p.real.getItem(STORAGE_KEY));
  assert.deepEqual([...p.levels()].map(li=>li.querySelector('h3').textContent),['White','Yellow'],'the unsaved levels are kept');
  assert.equal(p.shown(p.$('sp-conflict')),true);assert.match(p.status(),/while your latest changes here weren’t saved/);
  assert.deepEqual(p.saved().levels.map(l=>l.label),['White','Black','Blue'],'and the other tab is not overwritten');
 }finally{await p.done?.();}
 // Case 2: no conflict yet; a change whose save can't read, then another tab saves.
 p=await page({storage:'faulty'});
 try{
  p.addLevelUI('White');p.fault.fail=1;p.addLevelUI('Yellow');
  p.fault.readFail=1;p.addLevelUI('Green');
  assert.equal(p.$('sp-storage').textContent,storageMessage('unavailable'));
  const other=createPlannerStore(()=>p.real);other.save(addLevel(other.load().list,'Black').list);
  p.storageEvent(p.real.getItem(STORAGE_KEY));
  assert.equal(p.shown(p.$('sp-conflict')),true,'not adopted silently');
  assert.deepEqual([...p.levels()].map(li=>li.querySelector('h3').textContent),['White','Yellow','Green']);
  p.$('sp-conflict-load').click();
  assert.deepEqual([...p.levels()].map(li=>li.querySelector('h3').textContent),['White','Black'],'an explicit Load still adopts');
 }finally{await p.done?.();}
 // Case 3: a tab with no changes of its own still adopts another tab's save as before.
 p=await page({storage:'faulty'});
 try{
  const other=createPlannerStore(()=>p.real);other.save(addLevel(other.load().list,'Red').list);
  p.storageEvent(p.real.getItem(STORAGE_KEY));
  assert.equal(p.shown(p.$('sp-conflict')),false);assert.deepEqual([...p.levels()].map(li=>li.querySelector('h3').textContent),['Red']);
 }finally{await p.done?.();}
});
