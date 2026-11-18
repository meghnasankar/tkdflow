/* Read-and-print companions: each row must match what its lesson actually
   plays and says, every pose link must open the real paused pose, sources must
   be the lesson's own, and the pages must work without JavaScript and print
   cleanly. Expected values are computed here from the lesson sources, not by
   calling the generator's own row builder. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {outputs,INDEX} from '../scripts/build-companions.mjs';
import {createFormMotion} from '../js/animation/form-motion.js';
import {POSES as T1} from '../js/lessons/taegeuk-1-data.js';
import {officialLabel,parsePoseParam,playerKeyAction} from '../js/lib/lesson-nav.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const forms=JSON.parse(read('data/forms.json')).filter(f=>f.lessonUrl);
const unescape=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&');
const page=id=>read(`companions/${id}.html`);
const main=html=>html.slice(html.indexOf('<main'),html.indexOf('</main>'));
const posesOf=f=>f.id==='taegeuk-1'?T1:createFormMotion(JSON.parse(read(`data/lessons/${f.id}.json`))).POSES;
const cuesOf=f=>JSON.parse(read(`data/narration/${f.id}.json`)).cues;
const rowsOf=html=>[...main(html).matchAll(/<li id="pose-(\d+)"><p class="cp-head"><a href="([^"]+)">Pose (\d+)<\/a> <span class="cp-name">([^<]*)<\/span>(?: <span class="cp-ko" lang="ko">([^<]*)<\/span>)?<\/p><p class="cp-meta"><span class="cp-count">([^<]*)<\/span>(?: <span class="cp-turn">([^<]*)<\/span>)?( <span class="cp-kihap">Kihap<\/span>)?<\/p><p class="cp-say">([^<]*)<\/p><\/li>/g)]
 .map(m=>({id:Number(m[1]),href:m[2],n:Number(m[3]),name:unescape(m[4]),korean:m[5]?unescape(m[5]):'',label:unescape(m[6]),turn:m[7]?unescape(m[7]):'',kihap:Boolean(m[8]),say:unescape(m[9])}));

test('every companion and the index are exactly what the generator builds; npm run check enforces it',()=>{
 for(const [file,content] of outputs())assert.ok(read(file)===content,`${file} is stale: run npm run sync`);
 assert.match(JSON.parse(read('package.json')).scripts.check,/build-companions\.mjs --check/);
 assert.deepEqual(readdirSync(new URL('../companions',import.meta.url)).sort(),forms.map(f=>`${f.id}.html`).sort(),'one page per lesson, no strays');
});

test('every row matches its lesson: pose link, name, count label, turn, kihap and the spoken text verbatim',()=>{
 let total=0;
 for(const f of forms){
  const poses=posesOf(f),cues=cuesOf(f),rows=rowsOf(page(f.id));
  assert.equal(rows.length,poses.length,`${f.id}: one row per study pose, endpoints included`);
  rows.forEach((r,i)=>{
   const pose=poses[i],cue=cues[i],n=i+1,where=`${f.id} pose ${n}`;
   assert.equal(r.n,n,where);assert.equal(r.id,n,where);
   assert.equal(r.href,`/${f.lessonUrl}?pose=${n}#player`,`${where}: link`);
   assert.deepEqual(parsePoseParam(new URL(r.href,'https://tkdflow.com').search,poses.length),{index:i,problem:null},`${where}: the lesson accepts the link and opens pose ${n}`);
   assert.equal(r.name,pose.name,`${where}: name`);
   assert.equal(r.label,officialLabel(pose)??(i===0?'Ready position':'Return'),`${where}: count label`);
   assert.equal(r.kihap,Boolean(pose.kihap),`${where}: kihap`);
   assert.equal(r.turn,cue.turn?`${cue.turn.side==='left'?'↶':'↷'} Turn ${cue.turn.side} ${cue.turn.degrees}°`:'',`${where}: turn`);
   assert.equal(r.say,cue.text,`${where}: spoken text, verbatim`);
  });
  total+=rows.length;
 }
 assert.equal(total,748,'all 748 study poses');
});

test('Korean pose names appear only where the lesson has them (Taegeuk Il Jang)',()=>{
 for(const f of forms){
  const rows=rowsOf(page(f.id)),poses=posesOf(f);
  rows.forEach((r,i)=>assert.equal(r.korean,poses[i].korean||'',`${f.id} pose ${i+1}`));
  if(f.id!=='taegeuk-1')assert.ok(rows.every(r=>!r.korean),`${f.id}: no Korean pose names are invented`);
 }
 assert.ok(rowsOf(page('taegeuk-1')).every(r=>r.korean),'Taegeuk Il Jang shows its Korean pose names');
});

test('the heading line states the lesson’s own count wording and value; sources are the lesson’s own, exactly',()=>{
 for(const f of forms){
  const html=main(page(f.id)),lesson=read(f.lessonUrl);
  const [,term,value]=lesson.match(/<dt>(Movements|Reference counts?)<\/dt><dd>(\d+)/);
  const phrase=term==='Movements'?`${value} movements in the reference`:`${value} ${term.toLowerCase()}`;
  assert.ok(html.includes(` · ${posesOf(f).length} study poses · ${phrase}</p>`),`${f.id}: ${phrase}`);
  assert.doesNotMatch(html,/reference counts? in the reference/,`${f.id}: no doubled “reference”`);
  const listed=[...html.slice(html.indexOf('cp-sources-title')).matchAll(/<li><a href="([^"]+)" rel="noopener">([^<]+)<\/a>( \(PDF pages (\d+)–(\d+)\))?<\/li>/g)]
   .map(m=>({url:unescape(m[1]),title:unescape(m[2]),pages:m[3]?[Number(m[4]),Number(m[5])]:null}));
  if(f.id==='taegeuk-1'){
   const [,url,title]=lesson.match(/Sequence and kihap reference: <a href="([^"]+)"[^>]*>([^<]+)<\/a>/);
   assert.deepEqual(listed,[{url,title,pages:null}]);
  }else{
   const data=JSON.parse(read(`data/lessons/${f.id}.json`));
   assert.deepEqual(listed,data.sources.map(s=>({url:s.url,title:s.title,pages:s.pdfPages?[s.pdfPages[0],s.pdfPages.at(-1)]:null})),`${f.id}: sources and editions as stored`);
   assert.ok(html.includes(`<p>${data.referenceLabel.replace(/&/g,'&amp;')}:</p>`),`${f.id}: reference edition label`);
  }
  for(const s of listed)assert.match(s.url,/^https:\/\//);
 }
});

test('the index lists every lesson by style in curriculum order with its pose count; the manifest and sitemap list every page',()=>{
 const html=main(read(INDEX));
 for(const style of ['wt','itf','ata']){
  const group=html.slice(html.indexOf(`id="cp-${style}"`),html.indexOf('</section>',html.indexOf(`id="cp-${style}"`)));
  const ids=[...group.matchAll(/<li><a href="\/companions\/([a-z0-9-]+)\.html">/g)].map(m=>m[1]);
  assert.deepEqual(ids,forms.filter(f=>f.category===style).map(f=>f.id),style);
  for(const id of ids)assert.match(group,new RegExp(`/companions/${id}\\.html">[^<]+</a> <span lang="ko">[^<]+</span> <span class="cp-index-meta">${posesOf(forms.find(f=>f.id===id)).length} study poses`));
 }
 const manifest=JSON.parse(read('layout/pages.json')).pages,sitemap=read('sitemap.xml');
 for(const file of [INDEX,...forms.map(f=>`companions/${f.id}.html`)]){
  const entry=manifest.find(p=>p.file===file);
  assert.ok(entry&&entry.sitemap===true&&entry.key==='forms'&&entry.path===`/${file}`,`${file} in the manifest`);
  assert.ok(sitemap.includes(`<loc>https://tkdflow.com/${file}</loc>`),`${file} in the sitemap`);
 }
 for(const f of forms)assert.match(manifest.find(p=>p.file===`companions/${f.id}.html`).title,new RegExp(`^${f.name} — read and print companion — TKDflow$`));
});

test('pages work without JavaScript; the Print button is hidden until the script runs and prints only on click',async()=>{
 for(const file of [INDEX,...forms.map(f=>`companions/${f.id}.html`)]){
  const html=read(file);
  assert.doesNotMatch(html,/<script(?![^>]*\bsrc=)|\son[a-z]+=|\sstyle=/,`${file}: no inline script, handler or style`);
  const scripts=[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]).filter(s=>s!=='/js/site.js');
  assert.deepEqual(scripts,file===INDEX?[]:['/js/pages/companion.js']);
  assert.ok(Buffer.byteLength(html)<45000,`${file}: compact page (${Buffer.byteLength(html)} bytes)`);
  if(file!==INDEX)assert.match(html,/<button type="button" class="btn btn-primary btn-sm" data-print hidden>Print this companion<\/button>/);
 }
 const button={hidden:true,listeners:{},addEventListener(t,f){this.listeners[t]=f;}};
 let printed=0;
 globalThis.document={querySelectorAll:s=>s==='[data-print]'?[button]:[]};globalThis.window={print:()=>{printed++;}};
 try{
  await import('../js/pages/companion.js?test');
  assert.equal(button.hidden,false,'shown when the script runs');
  assert.equal(printed,0,'no print dialog on load');
  button.listeners.click();assert.equal(printed,1,'prints on click');
 }finally{delete globalThis.document;delete globalThis.window;}
 assert.doesNotMatch(read('js/pages/companion.js'),/fetch\(|localStorage|sessionStorage|account-service/);
});

test('print styles hide navigation and controls, keep each pose whole, and nothing is wider than the page',()=>{
 const css=read('css/companion.css'),print=css.slice(css.indexOf('@media print'));
 const hidden=(print.match(/([^{}]+)\{ display: none !important; \}/)||[])[1]||'';
 for(const sel of ['.skip-link','.navbar','.footer','[data-print]','.cp-actions'])assert.ok(hidden.split(',').map(x=>x.trim()).includes(sel),`${sel} hidden in print`);
 assert.match(print,/\.cp-poses li \{[^}]*break-inside: avoid/);
 assert.match(print,/\.cp-print-url \{ display: block;/,'the lesson address prints once');
 assert.doesNotMatch(css,/(^|[;{\s])width:\s*\d{3,}px/,'no fixed pixel widths');
 assert.match(css,/\.cp-poses li \{[^}]*overflow-wrap: anywhere/,'long words wrap at 320px');
});

test('the wording explains study poses vs counts and claims no review, endorsement or verification',()=>{
 for(const file of [INDEX,...forms.map(f=>`companions/${f.id}.html`)]){
  const text=main(read(file)).replace(/<[^>]+>/g,' ');
  assert.ok(text.includes('Pose numbers count the lesson’s study poses; the count shows the movement or reference count the lesson labels. Left and right are the performer’s own.'),file);
  assert.doesNotMatch(text,/instructor[- ]approved|instructor[- ]reviewed|verified|certified|endorsed|reviewed by|not been reviewed|unreviewed/i,file);
 }
});

test('every lesson links its own companion and the reading guide; the keyboard hint matches the player',()=>{
 for(const f of forms){
  const html=read(f.lessonUrl);
  assert.ok(html.includes(`<p class="move-panel-link"><a href="/companions/${f.id}.html">Read or print this lesson as text</a> · <a href="/start-here.html#sh-reading">How to read poses, counts and directions</a></p>`),f.lessonUrl);
  assert.ok(html.includes('<kbd>Home</kbd> <kbd>End</kbd> first/last pose,'),`${f.lessonUrl}: Home/End hint names poses`);
 }
 assert.equal(playerKeyAction({key:'Home',target:null}),'first');assert.equal(playerKeyAction({key:'End',target:null}),'last');
 assert.match(read('js/lib/lesson-player.js'),/first\(\) \{ this\.select\(0, 'first'\); \}/,'Home selects the first pose');
 assert.match(read('js/lib/lesson-player.js'),/last\(\) \{ this\.select\(this\.count - 1, 'last'\); \}/,'End selects the last pose');
 assert.ok(read('forms.html').includes('<p class="hero-companions"><a href="/companions.html">Text and print companions for all 23 lessons</a></p>'));
 const hub=read('start-here.html');
 assert.ok(hub.includes('<a href="/companions.html">Read and print companions</a>'));
 assert.ok(hub.includes('Home and End to jump to the first and last pose'));
 assert.ok(read('layout/footer.html').includes('<li><a href="/companions.html">Read and print companions</a></li>'));
 assert.equal(JSON.parse(read('data/community.json')).posts.find(p=>p.id==='companions').url,'companions.html');
});

test('companion lists keep list semantics without duplicate visible numbering; print text is black',()=>{
 for(const f of forms){
  const html=main(page(f.id));
  assert.ok(html.includes('<ol class="cp-poses" role="list" aria-labelledby="cp-poses-title">'),`${f.id}: pose list keeps list semantics`);
  assert.equal((html.match(/<li id="pose-\d+">/g)||[]).length,posesOf(f).length,`${f.id}: each pose is a list item`);
 }
 assert.equal((main(read(INDEX)).match(/<ul class="cp-index" role="list">/g)||[]).length,3,'each style group is a list');
 const css=read('css/companion.css');
 assert.match(css,/\.cp-poses \{ list-style: none;/,'markers hidden: “Pose N” already numbers each item');
 const print=css.slice(css.indexOf('@media print'));
 const blackRule=(print.match(/([^{}]+)\{ color: #000; \}/)||[])[1]||'';
 const blackSel=blackRule.split(',').map(x=>x.trim());
 for(const sel of ['.cp-main p','.cp-main h2','.cp-head','.cp-name','.cp-say','.cp-meta','.cp-count','.cp-turn','.cp-ko','.cp-kihap','.cp-sources','.cp-sources li','.cp-note','.cp-index li','.cp-index-meta'])
  assert.ok(blackSel.includes(sel),`${sel} prints black (global p and heading colours would otherwise show navy/grey)`);
});
