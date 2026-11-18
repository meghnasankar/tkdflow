/* Find a technique: the generated index must stay true to the poses each
   lesson actually plays, every link must open the real 1-based pose, and the
   search/filter/URL/bounds behaviour must be honest and usable without an
   account, network or (for reading) JavaScript. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTechniqueIndex,renderPage,indexStats} from '../scripts/build-technique-index.mjs';
import {selectView,parseFinderState,finderQuery,createFinderController,shouldReplaceInput,ROW_LIMIT,OPEN_LIMIT,MAX_QUERY} from '../js/lib/technique-finder.js';
import {createFormMotion} from '../js/animation/form-motion.js';
import {POSES as T1} from '../js/lessons/taegeuk-1-data.js';
import {officialLabel} from '../js/lib/lesson-nav.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('techniques.html');
const main=html.slice(html.indexOf('<main'),html.indexOf('</main>'));
const forms=JSON.parse(read('data/forms.json'));
const lessons=forms.filter(f=>f.lessonUrl);
const index=buildTechniqueIndex();
const model={forms:index.forms,groups:index.groups.map(g=>({key:g.key,forms:g.forms.map(f=>({id:f.id,rows:f.rows}))}))};
const view=(q,style='',form='',opts)=>selectView(model,{q,style,form},opts);
const decode=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
/* The poses each lesson page really plays (independent of the generator). */
const actual=new Map(lessons.map(f=>[f.id,f.id==='taegeuk-1'?T1:createFormMotion(JSON.parse(read(`data/lessons/${f.id}.json`))).POSES]));
const links=[...main.matchAll(/<li><a href="\/([a-z0-9-]+)\.html\?pose=(\d+)#player">Pose (\d+) · ([^<]+)<\/a>( <span class="tf-ref">([^<]+)<\/span>)?( <span class="tf-ko" lang="ko">([^<]+)<\/span>)?/g)]
 .map(m=>({form:m[1],n:Number(m[2]),shown:Number(m[3]),name:decode(m[4]),ref:m[6]?decode(m[6]):null,korean:m[8]||''}));

test('the committed index is exactly what the generator builds from today’s lesson data',()=>{
 assert.equal(renderPage(html),html,'techniques.html is stale: run npm run sync');
 assert.match(read('package.json'),/build-technique-index\.mjs --check/,'npm run check fails on a stale index');
});

test('every link opens a real pose and shows that pose’s own name, count label and Korean text',()=>{
 assert.ok(links.length>=700);
 for(const l of links){
  const poses=actual.get(l.form);assert.ok(poses,`${l.form} is a lesson`);
  assert.equal(l.n,l.shown,'link pose number matches the visible pose number');
  assert.ok(l.n>=2&&l.n<=poses.length-1,`${l.form} pose ${l.n} is a mid-form pose`);
  const pose=poses[l.n-1];
  assert.equal(l.name,pose.name,`${l.form} pose ${l.n} name`);
  assert.equal(l.ref,officialLabel(pose),`${l.form} pose ${l.n} count label`);
  assert.equal(l.korean,pose.korean||'',`${l.form} pose ${l.n} Korean`);
 }
});

test('all 23 lessons are covered: every mid-form pose appears, only the opening ready and closing return are left out',()=>{
 const seen=new Set(links.map(l=>`${l.form}:${l.n}`));
 assert.deepEqual([...new Set(links.map(l=>l.form))].sort(),lessons.map(f=>f.id).sort());
 let expected=0;
 for(const [id,poses] of actual){
  for(let n=2;n<poses.length;n++){assert.ok(seen.has(`${id}:${n}`),`${id} pose ${n} is findable`);expected++;}
  assert.ok(!seen.has(`${id}:1`)&&!seen.has(`${id}:${poses.length}`),`${id} endpoints are not techniques`);
 }
 assert.equal(seen.size,expected);
 const stats=indexStats(index);
 assert.equal(stats.poses,expected,'summary counts each (form, pose) once');
 assert.match(main,new RegExp(`<p class="tf-stats">${expected} study poses from all ${lessons.length} lessons, in ${stats.groups} technique groups\\.</p>`));
 assert.ok(index.groups.some(g=>g.key==='bending ready')&&index.groups.some(g=>g.key==='covered ready'),'mid-form ready techniques are kept');
});

test('groups use the lessons’ own wording; combined poses sit in each of their groups but count once',()=>{
 for(const g of index.groups){
  assert.equal(g.key,g.key.toLowerCase().trim());assert.doesNotMatch(g.key,/^(left|right) /,'only the side is removed');
  for(const f of g.forms)for(const r of f.rows)assert.ok(r.name.toLowerCase().includes(g.key),`${f.id} pose ${r.n} “${r.name}” is worded as “${g.key}”`);
 }
 const t1=key=>index.groups.find(g=>g.key===key).forms.find(f=>f.id==='taegeuk-1').rows;
 const combined=t1('low block').find(r=>r.n===6);
 assert.equal(combined.name,'Low Block + Middle Punch');assert.equal(combined.label,'Movements 5–6');
 assert.ok(t1('middle punch').some(r=>r.n===6),'the combined Taegeuk Il Jang pose is in both groups');
 assert.equal(t1('front kick').find(r=>r.n===13).label,'Movement 14 (kick)');
 const v=view('아래막기');
 const rows=v.groups.reduce((n,g)=>n+g.poses,0);
 assert.equal(v.poses,5);assert.ok(rows>v.poses,'a pose listed in two groups is counted once');
});

test('search keeps related techniques visible, exact wording first, without merging them',()=>{
 const v=view('low block');
 assert.equal(v.groups[0].key,'low block');assert.equal(v.groups[0].exact,true);
 const keys=v.groups.map(g=>g.key);
 assert.ok(keys.includes('knifehand low block')&&keys.includes('double knifehand low block'),'related groups are not hidden');
 assert.ok(v.groups.slice(1).every(g=>!g.exact));
 for(const g of view('knifehand').groups)for(const f of g.forms)for(const r of f.rows)assert.match(r.name.toLowerCase(),/knifehand/);
 assert.deepEqual(view('side kick','','koryo').groups.map(g=>g.key),['side kick']);
});

test('Korean pose names find Taegeuk Il Jang only, as the page says',()=>{
 const v=view('아래막기');
 assert.deepEqual([...new Set(v.groups.flatMap(g=>g.forms.map(f=>f.id)))],['taegeuk-1']);
 assert.ok(index.groups.every(g=>g.forms.every(f=>f.id==='taegeuk-1'||f.rows.every(r=>!r.korean))),'no Korean is invented for other lessons');
 assert.match(main.replace(/<[^>]+>/g,''),/Korean pose names are currently available for Taegeuk Il Jang only\./);
});

test('a whole form name or listed spelling selects that form; form descriptions never match poses',()=>{
 for(const [q,id] of [['Koryeo','koryo'],['Songahm #1','songahm-1'],['Taegeuk Il Jang','taegeuk-1'],['고려','koryo'],['chon-ji','chon-ji']]){
  const v=view(q);
  assert.deepEqual(v.exactForms,[id],q);
  assert.deepEqual([...new Set(v.groups.flatMap(g=>g.forms.map(f=>f.id)))],[id],`${q} lists only ${id}`);
  assert.equal(v.poses,actual.get(id).length-2,`${q} lists every technique pose of ${id}`);
 }
 assert.equal(view('heaven').poses,0,'a word from a form description is not a technique');
 assert.equal(view('trigram').poses,0);
});

test('style and form filters narrow honestly',()=>{
 const itf=view('middle punch','itf');
 const ids=new Set(itf.groups.flatMap(g=>g.forms.map(f=>f.id)));
 assert.ok(ids.size>0);for(const id of ids)assert.equal(forms.find(f=>f.id===id).category,'itf');
 assert.equal(view('','ata').forms,3);
 assert.equal(view('','','koryo').poses,actual.get('koryo').length-2);
 assert.equal(view('zzzz').groups.length,0);
});

test('URL state is validated, shareable and never carries pose numbers',()=>{
 const f=index.forms;
 assert.deepEqual(parseFinderState('?q=low%20block&style=itf&form=chon-ji',f),{q:'low block',style:'itf',form:'chon-ji',cues:false});
 assert.deepEqual(parseFinderState('?style=tkd&form=nope',f),{q:'',style:'',form:'',cues:false},'unknown values are ignored');
 assert.deepEqual(parseFinderState('?style=itf&form=koryo',f),{q:'',style:'itf',form:'',cues:false},'a form outside the style is dropped');
 assert.equal(parseFinderState('?q='+'x'.repeat(200),f).q.length,MAX_QUERY);
 for(const s of [{q:'side kick',style:'wt',form:'koryo',cues:false},{q:'',style:'',form:'',cues:false},{q:'아래막기',style:'',form:'',cues:false}])
  assert.deepEqual(parseFinderState(finderQuery(s),f),s,'round trip');
 assert.equal(finderQuery({q:'  ',style:'',form:'',cues:false}),'');
 assert.doesNotMatch(finderQuery({q:'x',style:'wt',form:'koryo',cues:false}),/pose/);
});

test('rendering is bounded: long lists are capped per form until “Show all”, and only so many groups open',()=>{
 const big=index.groups.flatMap(g=>g.forms.map(f=>({g:g.key,f:f.id,n:f.rows.length}))).sort((a,b)=>b.n-a.n)[0];
 assert.ok(big.n>ROW_LIMIT,'some technique repeats more than the cap in one form');
 const capped=view(big.g).groups.find(g=>g.key===big.g).forms.find(f=>f.id===big.f);
 assert.equal(capped.shown.length,ROW_LIMIT);assert.equal(capped.hidden,big.n-ROW_LIMIT);
 const all=view(big.g,'','',{expanded:new Set([`${big.g}|${big.f}`])}).groups.find(g=>g.key===big.g).forms.find(f=>f.id===big.f);
 assert.equal(all.shown.length,big.n);assert.equal(all.hidden,0);
 const broad=view('block');
 assert.ok(broad.groups.length>OPEN_LIMIT);
 assert.equal(broad.groups.filter(g=>g.open).length,OPEN_LIMIT);
 assert.equal(view('').groups.filter(g=>g.open).length,0,'nothing opens without a search');
});

test('readable without JavaScript: every result is a plain link, controls appear only with the script',()=>{
 assert.match(main,/<form class="tf-controls" id="tf-controls" action="\/techniques\.html" method="get" role="search" aria-label="Find a technique" hidden>/);
 const groups=main.slice(main.indexOf('<!-- technique-index -->'),main.indexOf('<!-- /technique-index -->'));
 assert.doesNotMatch(groups,/\shidden\b|style=|<script/,'no result is hidden or styled inline');
 assert.equal((groups.match(/<details class="tf-group" id="t-[a-z0-9-]+"><summary>/g)||[]).length,index.groups.length);
 for(const id of ['tf-q','tf-style','tf-form'])assert.match(main,new RegExp(`<label for="${id}">`),`${id} is labelled`);
 assert.match(main,/<p class="tf-summary" id="tf-summary" role="status">/);
 assert.equal((groups.match(/<ul aria-label="[^"]+ poses">/g)||[]).length,index.groups.reduce((n,g)=>n+g.forms.length,0),'every pose list names its form');
 assert.ok(Buffer.byteLength(html)<250000,'a single static page of modest size');
});

test('the finder needs no account, storage or new service; its only request is the opt-in same-origin cue file',()=>{
 for(const file of ['js/pages/techniques.js','js/lib/technique-finder.js']){
  const src=read(file);
  assert.doesNotMatch(src,/fetch\(|localStorage|sessionStorage|account-service|createClient|supabase|XMLHttpRequest|sendBeacon|innerHTML|https?:\/\//,file);
 }
 assert.deepEqual([...read('js/pages/techniques.js').matchAll(/from '([^']+)'/g)].map(m=>m[1]).sort(),['../lib/data.js','../lib/dom.js','../lib/focus-keep.js','../lib/technique-finder.js']);
 const page=read('js/pages/techniques.js');
 assert.equal((page.match(/loadJSON\(/g)||[]).length,1,'one loader call');
 assert.match(page,/loadJSON\(CUES_URL, \{ validate: cuesProblem, timeoutMs: \d+, maxLength: CUES_MAX_LENGTH \}\)/,'bounded and shape-checked');
 assert.match(read('js/lib/technique-finder.js'),/export const CUES_URL = '\/data\/technique-cues\.json';/,'same origin, root-relative');
 assert.equal(JSON.parse(read('package.json')).dependencies,undefined,'no new runtime package');
});

test('the intro explains study poses vs counts and claims no equivalence or certification',()=>{
 const text=main.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
 assert.match(text,/Study poses, not official counts\./);
 assert.match(text,/Each link opens the lesson paused on that pose\./);
 assert.match(text,/are not claimed to be the same/);
 const intro=text.slice(0,text.indexOf('Techniques '));
 assert.doesNotMatch(intro,/equivalent|official name|certified|approved|reviewed by|instructor/i);
});

test('the finder is linked from the hub, library, resources, footer and every lesson',()=>{
 const page=JSON.parse(read('layout/pages.json')).pages.find(p=>p.file==='techniques.html');
 assert.equal(page.sitemap,true);assert.match(read('sitemap.xml'),/https:\/\/tkdflow\.com\/techniques\.html/);
 assert.match(read('layout/footer.html'),/<li><a href="\/techniques\.html">Find a technique<\/a><\/li>/);
 assert.match(read('forms.html'),/<a class="btn btn-secondary btn-sm" href="\/techniques\.html">Find a technique<\/a>/);
 assert.match(read('js/pages/forms.js'),/href: `\/techniques\.html\?q=\$\{encodeURIComponent\(state\.q\.trim\(\)\)\}`/,'an empty library search offers the same words as a technique search');
 const hub=read('start-here.html');assert.equal((hub.slice(hub.indexOf('<main'),hub.indexOf('</main>')).match(/href="\/techniques\.html"/g)||[]).length,2,'hub: finding a form and lesson tools');
 assert.equal(JSON.parse(read('data/community.json')).posts.find(p=>p.id==='techniques').url,'techniques.html');
 for(const f of lessons)assert.match(read(f.lessonUrl),/<p class="move-panel-link"><a href="\/techniques\.html">Find a technique across all form lessons<\/a><\/p>/,f.lessonUrl);
});

/* A fake window with manual timers: history entries, location and popstate. */
function fakeWindow(search=''){
 const entries=[search];let at=0,popstate=null;
 const log=[],timers=new Map();let nextTimer=1;
 const win={
  location:{pathname:'/techniques.html',get search(){return entries[at];}},
  history:{
   pushState:(_,__,url)=>{entries.splice(at+1);entries.push(url.slice(url.indexOf('?')>=0?url.indexOf('?'):url.length));at++;log.push(['push',entries[at]]);},
   replaceState:(_,__,url)=>{entries[at]=url.slice(url.indexOf('?')>=0?url.indexOf('?'):url.length);log.push(['replace',entries[at]]);},
  },
  addEventListener:(type,fn)=>{if(type==='popstate')popstate=fn;},
 };
 return {win,log,entries:()=>entries,
  back(){at--;popstate();},
  setTimer:(fn)=>{const id=nextTimer++;timers.set(id,fn);return id;},
  clearTimer:(id)=>timers.delete(id),
  flush(){const fns=[...timers.values()];timers.clear();fns.forEach(fn=>fn());},
  pending:()=>timers.size};
}
const controllerWith=(search)=>{
 const w=fakeWindow(search),renders=[];
 const c=createFinderController({win:w.win,forms:index.forms,onChange:s=>renders.push({...s}),setTimer:w.setTimer,clearTimer:w.clearTimer});
 c.start();return {c,w,renders};
};

test('typing is debounced into one replaced history entry; choices add entries',()=>{
 const {c,w,renders}=controllerWith('');
 c.type('lo');c.type('low');c.type('low block');
 assert.equal(w.pending(),1,'only the latest keystroke is pending');assert.equal(renders.length,1,'no render per keystroke');
 w.flush();
 assert.deepEqual(w.log,[['replace','?q=low+block']]);assert.equal(c.state.q,'low block');
 c.choose({style:'itf'});
 assert.deepEqual(w.log.at(-1),['push','?q=low+block&style=itf']);
 assert.equal(w.entries().length,2);
});

test('Back/Forward cancels a pending keystroke so a late timer cannot overwrite the restored view',()=>{
 const {c,w,renders}=controllerWith('?q=low+block');
 c.choose({style:'wt'});                // history: ?q=low+block → ?q=low+block&style=wt
 c.type('side kick');                   // still waiting for the debounce
 w.back();                              // the visitor presses Back first
 assert.equal(w.pending(),0,'the pending keystroke was cancelled');
 w.flush();
 assert.deepEqual(c.state,{q:'low block',style:'',form:'',cues:false});
 assert.equal(renders.at(-1).q,'low block');
 assert.equal(w.win.location.search,'?q=low+block','the restored entry was not rewritten');
});

test('a conflicting or invalid link is normalised without adding history',()=>{
 const {c,w}=controllerWith('?style=itf&form=koryo&extra=1');
 assert.deepEqual(c.state,{q:'',style:'itf',form:'',cues:false});
 assert.deepEqual(w.log,[['replace','?style=itf']]);
 c.choose({form:'chon-ji',cues:false});
 assert.deepEqual(c.state,{q:'',style:'itf',form:'chon-ji',cues:false});
 c.choose({style:'wt'});
 assert.deepEqual(c.state,{q:'',style:'wt',form:'',cues:false},'changing style drops a form from another style');
 c.choose({q:'',style:'',form:'',cues:false});
 assert.equal(w.win.location.search,'');
});

test('choosing a style or form right after typing keeps the freshest typed words',()=>{
 for(const [choice,expected] of [[{style:'wt'},{q:'side kick',style:'wt',form:'',cues:false}],[{form:'koryo',cues:false},{q:'side kick',style:'',form:'koryo',cues:false}]]){
  const {c,w,renders}=controllerWith('');
  c.type('side');c.type('side kick');                  // still inside the debounce
  c.choose(choice);                                     // the select change arrives first
  assert.deepEqual(c.state,expected,`typed words survive ${JSON.stringify(choice)}`);
  assert.deepEqual(renders.at(-1),expected);
  assert.equal(c.pending,null);assert.equal(w.pending(),0,'the stale timer is gone');
  assert.deepEqual(w.log,[['push',finderQuery(expected)]],'one history entry with both the words and the choice');
  w.flush();
  assert.deepEqual(c.state,expected,'nothing late overwrites it');assert.equal(w.log.length,1);
 }
});

test('Clear and submit win over pending text; Back discards pending text for later choices too',()=>{
 const cleared=controllerWith('?q=low+block&style=wt');
 cleared.c.type('front kick');
 cleared.c.choose({q:'',style:'',form:'',cues:false});           // Clear while a keystroke is pending
 assert.deepEqual(cleared.c.state,{q:'',style:'',form:'',cues:false});
 cleared.w.flush();
 assert.deepEqual(cleared.c.state,{q:'',style:'',form:'',cues:false},'the pending words do not come back');
 assert.equal(cleared.w.win.location.search,'');

 const submitted=controllerWith('');
 submitted.c.type('front');
 submitted.c.choose({q:'front kick'});                  // Enter submits the box’s full text
 assert.equal(submitted.c.state.q,'front kick');submitted.w.flush();assert.equal(submitted.c.state.q,'front kick');

 const back=controllerWith('?q=low+block');
 back.c.choose({style:'wt'});
 back.c.type('side kick');
 back.w.back();                                         // Back while the words are pending
 assert.equal(back.c.pending,null);
 back.c.choose({style:'itf'});                          // a later choice must not resurrect them
 assert.deepEqual(back.c.state,{q:'low block',style:'itf',form:'',cues:false});
});

test('the search box is rewritten only when the restored query really differs',()=>{
 assert.equal(shouldReplaceInput('low ',  'low'),false,'a space before the next word is kept while typing');
 assert.equal(shouldReplaceInput('  low block  ','low block'),false);
 assert.equal(shouldReplaceInput('side kick','low block'),true,'Back/Forward shows the restored query');
 assert.equal(shouldReplaceInput('kick',''),true,'Clear empties the box');
 assert.equal(shouldReplaceInput('   ',''),false);
 assert.equal(shouldReplaceInput('x'.repeat(MAX_QUERY+5),'x'.repeat(MAX_QUERY)),false,'the capped query matches the capped box');
 assert.match(read('js/pages/techniques.js'),/if \(shouldReplaceInput\(input\.value, state\.q\)\) input\.value = state\.q;/,'the page uses this rule');
});

test('copy promises only what the index covers: named techniques, not stances',()=>{
 assert.ok(!index.groups.some(g=>/\bstance\b/.test(g.key)),'no stance groups exist');
 const page=JSON.parse(read('layout/pages.json')).pages.find(p=>p.file==='techniques.html');
 const hero=main.slice(0,main.indexOf('</div></div>')).replace(/<[^>]+>/g,' ');
 for(const [where,text] of [['meta description',page.description],['hero',hero],
  ['community resource',JSON.parse(read('data/community.json')).posts.find(p=>p.id==='techniques').body]])
  assert.doesNotMatch(text,/stance/i,`${where} does not offer stances`);
 assert.match(main,/stances and turns are not indexed/,'the intro says what is not covered');
 const hub=read('start-here.html');
 for(const m of hub.matchAll(/[^.]*href="\/techniques\.html"[^.]*\./g))assert.doesNotMatch(m[0],/stance/i);
});

test('collapsed groups show a decorative expand/collapse indicator and keep native keyboard toggling',()=>{
 const css=read('css/techniques.css');
 assert.match(css,/\.tf-group > summary \{[^}]*list-style: none/,'one indicator, not the native marker plus ours');
 assert.match(css,/\.tf-group > summary::-webkit-details-marker, \.tf-about > summary::-webkit-details-marker \{ display: none; \}/);
 assert.match(css,/\.tf-about > summary \{[^}]*list-style: none/);
 const closed=css.match(/\.tf-group > summary::before, \.tf-about > summary::before \{([^}]*)\}/)[1];
 assert.match(closed,/content: ""/,'the indicator has no text to be announced');
 assert.match(closed,/rotate\(-45deg\)/,'points right when closed');
 assert.match(css,/\.tf-group\[open\] > summary::before, \.tf-about\[open\] > summary::before \{[^}]*rotate\(45deg\)/,'points down when open');
 assert.doesNotMatch(css.replace(/\/\*[^]*?\*\//g,''),/transition|animation/,'no motion');
 const groups=main.slice(main.indexOf('<!-- technique-index -->'),main.indexOf('<!-- /technique-index -->'));
 assert.doesNotMatch(groups,/<summary[^>]*(tabindex|role|aria-expanded)/,'the native summary keeps its own focus, role and state');
 assert.doesNotMatch(read('js/pages/techniques.js'),/keydown|keyup|keypress|preventDefault\(\)[^;]*summary/,'Enter and Space toggle groups natively');
});

test('on a phone the search comes first: a short note, the controls, then a collapsed “About this index”',()=>{
 const at=s=>{const i=main.indexOf(s);assert.ok(i>0,s);return i;};
 const hero=at('<h1>Find a technique</h1>'),stats=at('<p class="tf-stats">'),brief=at('<p class="tf-brief">'),
  controls=at('<form class="tf-controls"'),about=at('<details class="tf-about">'),results=at('<h2 id="tf-results-title">Techniques</h2>');
 assert.ok(hero<stats&&stats<brief&&brief<controls&&controls<about&&about<results,'hero, stats, note, search, about, results');
 const note=main.slice(brief,main.indexOf('</p>',brief)).replace(/<[^>]+>/g,'');
 assert.match(note,/not official movement counts/,'the always-visible note says pose numbers are not counts');
 assert.ok(note.length<220,'the always-visible note stays short');
 const panel=main.slice(about,main.indexOf('</details>',about));
 assert.match(panel,/^<details class="tf-about">\s*<summary>About this index<\/summary>/,'collapsed by default, native summary');
 for(const t of [/Study poses, not official counts\./,/stances and turns are not indexed/,/not claimed to be the same/,/Taegeuk Il Jang only/])assert.match(panel,t);
 assert.equal((main.match(/<h1[ >]/g)||[]).length,1);
 assert.deepEqual([...main.matchAll(/<h([1-6])[ >]/g)].map(m=>Number(m[1])),[1,2],'one h1, then the results h2: no skipped levels');
});
