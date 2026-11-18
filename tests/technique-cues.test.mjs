/* Find a technique, opt-in "Also search spoken instructions".
   - The data file is generated, exact and limited to the indexed poses.
   - Matching with the option off is exactly the named-technique search.
   - The page fetches the file only on opt-in, from the same origin, bounded
     and shape-checked; while it loads or after it fails the page says results
     are named techniques only. Late replies after Back, unticking or a new
     filter cannot bring cues back, and a focused "Try again" hands focus on.
   Page tests run the REAL js/pages/techniques.js against the REAL generated
   techniques.html markup in the test DOM, with a deferred fake fetch. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTechniqueIndex,renderCues,CUES} from '../scripts/build-technique-index.mjs';
import {selectView,summaryText,parseFinderState,finderQuery,createFinderController,cuesProblem,prepareCues,CUES_URL,CUES_MAX_LENGTH} from '../js/lib/technique-finder.js';
import {loadJSON} from '../js/lib/data.js';
import {normalize} from '../js/lib/catalog.js';
import {installDom,settle} from './helpers/mini-dom.mjs';
import {parseInto} from './helpers/mini-html.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('techniques.html');
const mainHtml=html.slice(html.indexOf('<main'),html.indexOf('</main>')+'</main>'.length);
const cueFile=read(CUES),cueData=JSON.parse(cueFile),cues=prepareCues(cueData);
const index=buildTechniqueIndex();
const model={forms:index.forms,groups:index.groups.map(g=>({key:g.key,forms:g.forms.map(f=>({id:f.id,rows:f.rows}))}))};
const indexed=new Set(index.groups.flatMap(g=>g.forms.flatMap(f=>f.rows.map(r=>`${f.id}:${r.n}`))));
const st=(q,over={})=>({q,style:'',form:'',cues:false,...over});
const view=(q,over={},opts={})=>selectView(model,st(q,over),opts);
const rowsOf=v=>v.groups.flatMap(g=>g.forms.flatMap(f=>f.rows.map(r=>({...r,form:f.id,group:g.key}))));

/* ---------- data file ---------- */

test('the cue file is exactly what the generator builds, and npm run check fails on drift',()=>{
 assert.equal(cueFile,renderCues(index),'data/technique-cues.json is stale: run npm run sync');
 assert.match(read('package.json'),/build-technique-index\.mjs --check/);
 assert.match(read('scripts/build-technique-index.mjs'),/currentCues !== nextCues && CUES/,'--check covers the cue file');
});

test('the cue file holds the 702 indexed mid-form poses only, each the lesson’s own spoken text byte for byte',()=>{
 const keys=Object.keys(cueData.cues);
 assert.equal(keys.length,702);assert.equal(indexed.size,702);
 assert.deepEqual(new Set(keys),indexed,'exactly the indexed (form, pose) pairs');
 const lessons=new Map();
 for(const [key,text] of Object.entries(cueData.cues)){
  const [id,n]=key.split(':');
  if(!lessons.has(id))lessons.set(id,JSON.parse(read(`data/narration/${id}.json`)));
  const narration=lessons.get(id);
  assert.ok(Number(n)>1&&Number(n)<narration.cues.length,`${key} is not an opening ready or closing return`);
  assert.equal(text,narration.cues[Number(n)-1].text,`${key} is verbatim`);
 }
 assert.equal(cuesProblem(cueData),null);
 assert.ok(cueFile.length<CUES_MAX_LENGTH/2,'comfortably inside the client bound');
});

test('cue text is not in the page: the default page weight is unchanged and nothing loads without opt-in',()=>{
 assert.doesNotMatch(html,/Spoken instruction:|technique-cues/);
 const distinct=Object.values(cueData.cues).filter(t=>t.length>45);
 assert.ok(distinct.length>300);
 for(const t of distinct)assert.ok(!html.includes(t),`cue embedded in HTML: ${t}`);
 assert.match(mainHtml,/<form class="tf-controls"[^>]* hidden>[\s\S]*<input type="checkbox" id="tf-cues" name="cues" value="1" aria-describedby="tf-cues-hint">[\s\S]*<\/form>/,'the option is part of the script-only controls');
 assert.match(mainHtml,/<label for="tf-cues">Also search spoken instructions<\/label>/);
 assert.match(mainHtml,/<p class="tf-hint" id="tf-cues-hint">Finds poses whose spoken instruction uses your words, even if the technique has another name\.<\/p>/);
 assert.match(mainHtml,/Until the instructions have loaded, results are named techniques only\./,'About this index says what the option does');
});

test('cuesProblem rejects malformed, oversized or hostile files',()=>{
 const ok={version:1,cues:{'koryo:2':'Step.'}};
 assert.equal(cuesProblem(ok),null);
 for(const bad of [null,[],'x',{version:2,cues:ok.cues},{version:1},{version:1,cues:[]},{version:1,cues:{}},
  {version:1,cues:{'Koryo:2':'x'}},{version:1,cues:{'koryo:0':'x'}},{version:1,cues:{'koryo:2':''}},{version:1,cues:{'koryo:2':'  '}},
  {version:1,cues:{'koryo:2':7}},{version:1,cues:{'koryo:2':'x'.repeat(601)}},{version:1,cues:{'../x:2':'x'}},
  JSON.parse('{"version":1,"cues":{"__proto__":"x"}}'),{version:1,cues:Object.fromEntries(Array.from({length:2001},(_,i)=>[`f:${(i%999)+1}${'abc'[i%3]}`,'x']))},
  {version:1,cues:Object.fromEntries(Array.from({length:2001},(_,i)=>[`f${i}:2`,'x']))}])
  assert.ok(cuesProblem(bad),`rejected: ${JSON.stringify(bad)?.slice(0,60)}`);
});

/* ---------- matching ---------- */

const CORPUS=['','low block','block','knifehand','side kick','chamber','knee','guard','fist','turn left','hip','pivot','kihap','아래막기','Koryo','Koryeo','songahm 1','koryo chamber','middle punch','x','  low   block ','elbow','jump','palm','spear','double','turn','stance','ready','high'];

test('with the option off, or on while loading or failed, matching is exactly the named-technique search',()=>{
 for(const q of CORPUS)for(const over of [{},{style:'itf'},{form:'koryo'}]){
  const before=view(q,over);
  assert.deepEqual(view(q,over,{cues}),before,`off + data “${q}” ${JSON.stringify(over)}`);
  assert.deepEqual(view(q,{...over,cues:true}),before,`on + no data “${q}” ${JSON.stringify(over)}`);
  assert.equal(before.cueOnly,0);
  assert.ok(rowsOf(before).every(r=>!('cue' in r)),'no row carries a cue when off');
 }
});

test('with the data, a pose also matches through its spoken instruction, shown as the exact text, counted once',()=>{
 const on=view('chamber',{cues:true},{cues}),off=view('chamber');
 const rows=rowsOf(on),named=new Set(rowsOf(off).map(r=>`${r.form}:${r.n}`));
 // Independent oracle: every indexed pose whose name hay or instruction contains the word.
 const expected=new Set([...indexed].filter(k=>named.has(k)||normalize(cueData.cues[k]).includes('chamber')));
 assert.equal(on.poses,expected.size);assert.ok(on.poses>=90,'the option finds far more than names alone');
 assert.equal(on.cueOnly,expected.size-named.size);
 for(const r of rows){
  const k=`${r.form}:${r.n}`;
  if(named.has(k))assert.ok(!('cue' in r),`${k} matched by name is not flagged`);
  else assert.equal(r.cue,cueData.cues[k],`${k} carries its exact instruction`);
 }
 assert.equal(new Set(rows.map(r=>`${r.form}:${r.n}`)).size,on.poses,'a pose in two groups counts once');
 assert.equal(summaryText(on,st('chamber',{cues:true}),{},'ready'),
  `${on.poses} study poses in ${on.forms} forms, ${on.groups.length} technique groups matching “chamber” (${on.cueOnly} only in spoken instructions).`);
});

test('each word may match the name or the instruction; filters, row caps and exact form names still apply',()=>{
 const mixed=rowsOf(view('koryo chamber',{cues:true},{cues}));
 assert.ok(mixed.length>0);
 for(const r of mixed){assert.equal(r.form,'koryo');if(r.cue)assert.match(normalize(r.cue),/chamber/);}
 const itf=view('chamber',{cues:true,style:'itf'},{cues});
 assert.ok(itf.poses>0&&rowsOf(itf).every(r=>index.forms.find(f=>f.id===r.form).style==='itf'));
 const one=view('turn left',{cues:true,form:'do-san'},{cues});
 assert.ok(rowsOf(one).every(r=>r.form==='do-san'));
 for(const g of view('fist',{cues:true},{cues}).groups)for(const f of g.forms)assert.ok(f.shown.length<=10&&f.shown.length+f.hidden===f.rows.length);
 for(const q of ['Koryo','Koryeo','songahm 1'])assert.deepEqual(view(q,{cues:true},{cues}),view(q),`exact form “${q}” lists that form only`);
});

test('the summary says when results are named techniques only, and what was searched when nothing matches',()=>{
 const v=view('chamber'),s=st('chamber',{cues:true}),base=summaryText(v,st('chamber'),{});
 assert.equal(summaryText(v,s,{},'loading'),base+' Named techniques only for now: spoken instructions are loading.');
 assert.equal(summaryText(v,s,{},'error'),base+' Named techniques only: spoken instructions could not load.');
 assert.equal(summaryText(v,st('chamber'),{},'error'),base,'off: no qualifier');
 const none=view('pivot',{cues:true},{cues});assert.equal(none.groups.length,0);
 assert.equal(summaryText(none,st('pivot',{cues:true}),{},'ready'),'No study poses match in technique names or spoken instructions.');
 assert.equal(summaryText(view('pivot'),st('pivot',{cues:true}),{},'loading'),'No study poses match. Named techniques only for now: spoken instructions are loading.');
 assert.equal(summaryText(view('pivot'),st('pivot'),{}),'No study poses match.','off: unchanged');
});

/* ---------- URL and controller ---------- */

test('cues=1 round-trips; any other value is ignored; links without it are unchanged',()=>{
 const f=index.forms;
 assert.deepEqual(parseFinderState('?q=chamber&cues=1',f),st('chamber',{cues:true}));
 for(const v of ['0','true','yes','','1x'])assert.equal(parseFinderState(`?q=a&cues=${v}`,f).cues,false,v);
 assert.equal(finderQuery(st('chamber',{cues:true,style:'wt'})),'?q=chamber&style=wt&cues=1');
 assert.equal(finderQuery(st('chamber')),'?q=chamber','no cues parameter by default');
 for(const s of [st('turn left',{cues:true}),st('',{cues:true}),st('x',{style:'ata',cues:true})])assert.deepEqual(parseFinderState(finderQuery(s),f),s);
});

test('ticking the option right after typing keeps the typed words in one history entry; Back removes it',()=>{
 const entries=['?'],log=[];let at=0,pop=null;const timers=new Map();let id=0;
 const win={location:{pathname:'/techniques.html',get search(){return entries[at]==='?'?'':entries[at];}},
  history:{pushState:(_,__,u)=>{entries.splice(at+1);entries.push(u.slice(u.indexOf('?')));at++;log.push(['push',entries[at]]);},
   replaceState:(_,__,u)=>{entries[at]=u.includes('?')?u.slice(u.indexOf('?')):'?';log.push(['replace',entries[at]]);}},
  addEventListener:(t,fn)=>{if(t==='popstate')pop=fn;}};
 const renders=[];
 const c=createFinderController({win,forms:index.forms,onChange:s=>renders.push({...s}),setTimer:fn=>{timers.set(++id,fn);return id;},clearTimer:i=>timers.delete(i)});
 c.start();c.type('chamber');c.choose({cues:true});
 assert.deepEqual(log,[['push','?q=chamber&cues=1']]);assert.equal(timers.size,0,'the pending keystroke was folded in');
 c.type('cham');at--;pop();
 assert.deepEqual(renders.at(-1),st(''),'Back restores the box unticked');assert.equal(c.pending,null,'and cancels pending text');
});

/* ---------- bounded loader ---------- */

test('loadJSON maxLength refuses a large declared or actual body; without it nothing changes',async()=>{
 let read=0;
 const res=(body,len)=>({ok:true,status:200,headers:{get:k=>k.toLowerCase()==='content-length'&&len!=null?String(len):null},text:async()=>{read++;return body;}});
 await assert.rejects(loadJSON('/x',{maxLength:100,fetchImpl:async()=>res('{}',101)}),e=>e.kind==='size');
 assert.equal(read,0,'a declared oversize body is not downloaded');
 await assert.rejects(loadJSON('/x',{maxLength:10,fetchImpl:async()=>res(JSON.stringify({a:'x'.repeat(20)}))}),e=>e.kind==='size');
 assert.deepEqual(await loadJSON('/x',{maxLength:100,fetchImpl:async()=>res('{"a":1}',7)}),{a:1});
 assert.deepEqual(await loadJSON('/x',{fetchImpl:async()=>res(JSON.stringify({a:'x'.repeat(500)}),999999)}),{a:'x'.repeat(500)},'no bound unless asked');
});

/* ---------- page level: the real techniques.js ---------- */

let run=0;
function fakeServer(){
 const calls=[],waiting=[];
 const fetch=(url,init)=>{calls.push({url:String(url),init});return new Promise((resolve,reject)=>waiting.push({resolve,reject}));};
 const respond=(body,{status=200,length}={})=>({ok:status>=200&&status<300,status,
  headers:{get:k=>k.toLowerCase()==='content-length'?String(length??body.length):null},text:async()=>body});
 return {fetch,calls,get waiting(){return waiting.length;},
  async reply(kind='ok'){
   const next=waiting.shift();assert.ok(next,'a request is waiting');
   if(kind==='ok')next.resolve(respond(cueFile));
   else if(kind==='500')next.resolve(respond('nope',{status:500}));
   else if(kind==='shape')next.resolve(respond(JSON.stringify({version:2,cues:{}})));
   else if(kind==='huge')next.resolve(respond(cueFile,{length:CUES_MAX_LENGTH+1}));
   else next.reject(new TypeError('network'));
   await settle(6);
  },
  async flush(){while(waiting.length)waiting.shift().reject(new TypeError('teardown'));await settle(4);}};
}
async function page(search=''){
 const srv=fakeServer();
 const env=installDom({url:`https://tkdflow.com/techniques.html${search}`,fetch:srv.fetch});
 parseInto(env.doc,env.doc.body,mainHtml);
 await import(`../js/pages/techniques.js?run=${++run}`);await settle(3);
 const $=id=>env.doc.getElementById(id);
 const shown=el=>{for(let n=el;n&&n!==env.doc.body;n=n.parentNode)if(n.hidden)return false;return true;};
 const visibleRows=()=>env.doc.querySelectorAll('#tf-groups li').filter(shown);
 const visibleCues=()=>env.doc.querySelectorAll('#tf-groups .tf-cue').filter(shown);
 const keyOf=li=>{const a=li.querySelector('a'),m=a.getAttribute('href').match(/^\/([a-z0-9-]+)\.html\?pose=(\d+)/);return `${m[1]}:${m[2]}`;};
 const tick=on=>{$('tf-cues').checked=on;$('tf-cues').dispatchEvent(env.event('change',{bubbles:true}));};
 const submit=q=>{$('tf-q').value=q;$('tf-controls').dispatchEvent(env.event('submit',{bubbles:true}));};
 const back=()=>{env.history.entries.pop();env.history.replaceState(null,'',env.history.entries.at(-1));env.win.dispatchEvent(env.event('popstate'));};
 return {...env,srv,$,shown,visibleRows,visibleCues,keyOf,tick,submit,back,
  summary:()=>$('tf-summary').textContent,status:()=>shown($('tf-cues-status'))?$('tf-cues-message').textContent:null,
  done:async()=>{await srv.flush();env.restore();}};
}
const expectedRows=(q,over={})=>{const v=view(q,{cues:true,...over},{cues});return new Set(v.groups.flatMap(g=>g.forms.flatMap(f=>f.shown.map(r=>`${g.key}|${f.id}:${r.n}`))));};
const namesOnly=q=>{const v=view(q);return summaryText(v,st(q),{});};

test('page: by default nothing is requested and the page behaves as before',async()=>{
 const p=await page('?q=chamber');
 try{
  assert.equal(p.srv.calls.length,0,'no request without opt-in');
  assert.equal(p.$('tf-cues').checked,false);assert.equal(p.status(),null);
  assert.equal(p.summary(),namesOnly('chamber'));
  assert.equal(p.visibleCues().length,0);
  assert.equal(p.visibleRows().length,view('chamber').groups.reduce((n,g)=>n+g.forms.reduce((m,f)=>m+f.shown.length,0),0));
 }finally{await p.done();}
});

test('page: an opted-in link loads once from the same origin, says names-only while loading, then shows exact instructions',async()=>{
 const p=await page('?q=chamber&cues=1');
 try{
  assert.equal(p.srv.calls.length,1);assert.equal(p.srv.calls[0].url,CUES_URL);assert.match(p.srv.calls[0].url,/^\/data\//,'same origin');
  assert.equal(p.$('tf-cues').checked,true);
  assert.equal(p.status(),'Loading spoken instructions… Results show named techniques only for now.');
  assert.equal(p.summary(),namesOnly('chamber')+' Named techniques only for now: spoken instructions are loading.');
  assert.equal(p.visibleCues().length,0,'no instruction before the data is in');
  await p.srv.reply('ok');
  assert.equal(p.status(),null,'status hides once loaded');
  const v=view('chamber',{cues:true},{cues});
  assert.equal(p.summary(),summaryText(v,st('chamber',{cues:true}),{},'ready'));
  const got=new Set(p.visibleRows().map(li=>`${li.closest('details').querySelector('.tf-name').textContent.toLowerCase()}|${p.keyOf(li)}`));
  assert.deepEqual(got,expectedRows('chamber'));
  const cueRows=p.visibleCues();assert.ok(cueRows.length>=80);
  for(const el of cueRows){
   const key=p.keyOf(el.closest('li')),text=el.querySelector('.tf-cue-text');
   assert.equal(el.querySelector('.tf-cue-label').textContent,'Spoken instruction:');
   assert.equal(text.childNodes.length,1);assert.equal(text.firstChild.childNodes.length,0,'a plain text node');
   assert.equal(text.textContent,cueData.cues[key],`${key} exact text`);
  }
  p.submit('chamber');await settle(2);assert.equal(p.srv.calls.length,1,'loaded once, then cached');
 }finally{await p.done();}
});

test('page: a reply that lands after Back or unticking cannot bring instructions back; ticking again reuses it',async()=>{
 for(const leave of ['back','untick']){
  const p=await page('');
  try{
   p.submit('chamber');p.tick(true);
   assert.equal(p.location.search,'?q=chamber&cues=1');assert.equal(p.srv.calls.length,1);
   if(leave==='back')p.back();else p.tick(false);
   assert.equal(p.location.search,'?q=chamber',leave);assert.equal(p.$('tf-cues').checked,false);assert.equal(p.status(),null);
   await p.srv.reply('ok');
   assert.equal(p.visibleCues().length,0,`${leave}: late data does not re-apply cues`);
   assert.equal(p.summary(),namesOnly('chamber'));assert.equal(p.location.search,'?q=chamber');
   p.tick(true);await settle(2);
   assert.equal(p.srv.calls.length,1,'no second request');assert.ok(p.visibleCues().length>0,'cached data applies at once');
  }finally{await p.done();}
 }
});

test('page: a filter chosen while loading is respected when the reply arrives',async()=>{
 const p=await page('?q=chamber&cues=1');
 try{
  p.$('tf-style').value='itf';p.$('tf-style').dispatchEvent(p.event('change',{bubbles:true}));
  assert.equal(p.location.search,'?q=chamber&style=itf&cues=1');
  await p.srv.reply('ok');
  const got=new Set(p.visibleRows().map(li=>`${li.closest('details').querySelector('.tf-name').textContent.toLowerCase()}|${p.keyOf(li)}`));
  assert.deepEqual(got,expectedRows('chamber',{style:'itf'}));
  for(const el of p.visibleCues())assert.equal(index.forms.find(f=>f.id===p.keyOf(el.closest('li')).split(':')[0]).style,'itf');
 }finally{await p.done();}
});

test('page: a failed or invalid file keeps named results, says so, and Try again hands focus to the message',async()=>{
 for(const kind of ['500','network','shape','huge']){
  const p=await page('?q=chamber&cues=1');
  try{
   await p.srv.reply(kind);
   assert.equal(p.status(),'Spoken instructions could not load, so results show named techniques only.',kind);
   assert.equal(p.summary(),namesOnly('chamber')+' Named techniques only: spoken instructions could not load.');
   assert.equal(p.visibleCues().length,0);assert.equal(p.$('tf-cues').checked,true,'the choice is kept');
   const retry=p.$('tf-cues-retry');assert.ok(p.shown(retry));
   retry.focus();retry.click();
   assert.equal(p.srv.calls.length,2,'Try again makes one new request');
   assert.ok(p.doc.activeElement===p.$('tf-cues-status'),`focus moved to the message, not <body> (${p.doc.activeElement.tagName})`);
   assert.equal(retry.hidden,true);assert.equal(p.status(),'Loading spoken instructions… Results show named techniques only for now.');
   assert.equal(p.summary(),namesOnly('chamber')+' Named techniques only for now: spoken instructions are loading.','the live summary says loading during the retry, not the earlier failure');
   await p.srv.reply('ok');
   assert.ok(p.visibleCues().length>0);assert.equal(p.status(),null);
   assert.ok(p.doc.activeElement===p.$('tf-cues'),'when the message goes, focus goes to the option, not <body>');
  }finally{await p.done();}
 }
});

test('page: retrying a search with no named match (Koryo “throat”) updates status and summary together, then finds the instruction matches',async()=>{
 const p=await page('?q=throat&form=koryo&cues=1');
 try{
  assert.equal(view('throat',{form:'koryo'}).groups.length,0,'no named technique matches');
  await p.srv.reply('500');
  assert.equal(p.summary(),'No study poses match. Named techniques only: spoken instructions could not load.');
  const retry=p.$('tf-cues-retry');retry.focus();retry.click();
  assert.ok(p.doc.activeElement===p.$('tf-cues-status'),'focus on the message');
  assert.equal(p.status(),'Loading spoken instructions… Results show named techniques only for now.');
  assert.equal(p.summary(),'No study poses match. Named techniques only for now: spoken instructions are loading.','summary matches the status at retry start');
  assert.equal(p.shown(p.$('tf-empty')),true,'empty state stays while loading');
  await p.srv.reply('ok');
  const v=view('throat',{form:'koryo',cues:true},{cues});
  assert.ok(v.poses>0&&v.cueOnly===v.poses,'found only through instructions');
  assert.equal(p.summary(),summaryText(v,st('throat',{form:'koryo',cues:true}),{},'ready'));
  assert.equal(p.visibleCues().length,v.groups.reduce((n,g)=>n+g.forms.reduce((m,f)=>m+f.shown.length,0),0));
  assert.equal(p.shown(p.$('tf-empty')),false);
 }finally{await p.done();}
});

test('page: Back while Try again is focused hands focus to the option; Clear keeps the option',async()=>{
 const p=await page('');
 try{
  p.submit('chamber');p.tick(true);await p.srv.reply('500');
  p.$('tf-cues-retry').focus();p.back();
  assert.equal(p.status(),null);assert.ok(p.doc.activeElement===p.$('tf-cues'),'focus kept near, not <body>');
  p.tick(true);assert.equal(p.srv.calls.length,2,'ticking again after a failure retries');await p.srv.reply('ok');
  p.$('tf-clear').click();await settle(2);
  assert.equal(p.location.search,'?cues=1','Clear resets search and filters but keeps the option');
  assert.equal(p.$('tf-cues').checked,true);assert.equal(p.$('tf-q').value,'');assert.equal(p.visibleCues().length,0,'no query, no instructions shown');
 }finally{await p.done();}
});

test('page: a focused result link keeps focus when instructions arrive and groups reorder',async()=>{
 const p=await page('?q=chamber&cues=1');
 try{
  const link=p.visibleRows()[0].querySelector('a');link.focus();
  await p.srv.reply('ok');
  assert.ok(p.doc.activeElement===link,'focus stays on the same result');
 }finally{await p.done();}
});
