/* Taekwondo words explained: data true to the one source, a small word budget,
   example links that really lead to matching poses, a page generated from the
   data (no drift), and search on the real page. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {installDom,settle} from './helpers/mini-dom.mjs';
import {parseInto} from './helpers/mini-html.mjs';
import {expected,renderGlossary} from '../scripts/build-glossary.mjs';
import {buildTechniqueIndex} from '../scripts/build-technique-index.mjs';
import {selectView} from '../js/lib/technique-finder.js';
import {normalize} from '../js/lib/catalog.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(read('data/glossary.json'));

test('entries use the source’s spellings and Hangul, with page references inside the PDF',()=>{
 // Hangul exactly as Kukkiwon, Taekwondo Technical Terminology (English edition, 2011) prints it.
 const HANGUL={gyeokpa:'격파','junbi-jase':'준비자세',seogi:'서기',makgi:'막기',jireugi:'지르기',chigi:'치기',chagi:'차기','ap-chagi':'앞차기','dollyeo-chagi':'돌려차기','yeop-chagi':'옆차기'};
 assert.equal(new Set(data.terms.map(t=>t.id)).size,data.terms.length);
 for(const t of data.terms){
  assert.match(t.id,/^[a-z]+(?:-[a-z]+)*$/);
  assert.equal(t.hangul??null,HANGUL[t.id]??null,`${t.id}: Hangul only where the source gives it`);
  assert.ok(t.pages.length&&t.pages.every(p=>Number.isInteger(p)&&p>=1&&p<=data.source.pdfPages),t.id);
 }
 assert.match(data.source.edition,/2011/);assert.doesNotMatch(JSON.stringify(data.source),/latest/i,'labelled by its vintage');
 assert.equal(new URL(data.source.url).hostname,'research.kukkiwon.or.kr');
});

test('the source-derived wording stays short (at most 200 words with the reference line)',()=>{
 const entryWords=data.terms.reduce((n,t)=>n+[t.term,t.hangul,t.english,t.plain].filter(Boolean).join(' ').split(/\s+/).length,0);
 const sourceWords=`Source: ${data.source.publisher}, ${data.source.title} (${data.source.edition}). Page links open the publisher’s PDF.`.split(/\s+/).length;
 assert.ok(entryWords+sourceWords<=200,`${entryWords+sourceWords} words`);
});

test('every example leads to real matching poses; terms without a supported example have none',async()=>{
 const index=buildTechniqueIndex(),model={forms:index.forms,groups:index.groups.map(g=>({key:g.key,forms:g.forms.map(f=>({id:f.id,rows:f.rows}))}))};
 for(const t of data.terms.filter(x=>x.example)){
  const u=new URL(t.example.href,'https://tkdflow.com');
  assert.ok(existsSync(new URL('..'+u.pathname,import.meta.url)),`${t.id}: ${u.pathname} exists`);
  if(u.pathname==='/techniques.html'){
   const q=u.searchParams.get('q'),view=selectView(model,{q,style:'',form:''}),words=q.split(/\s+/).map(normalize);
   assert.ok(view.poses>0,`${t.id}: "${q}" returns poses`);
   // Every pose the link shows really is one: its group or its own name contains the words.
   for(const g of view.groups)for(const f of g.forms)for(const r of f.rows)
    assert.ok(words.every(w=>normalize(`${g.key} ${r.name}`).includes(w)),`${t.id}: ${f.id} pose ${r.n} "${r.name}" matches "${q}"`);
  }else if(u.searchParams.has('pose')){
   const id=u.pathname.replace(/^\/|\.html$/g,''),n=u.searchParams.get('pose');
   const name=read(`companions/${id}.html`).match(new RegExp(`<li id="pose-${n}">[^]*?<span class="cp-name">([^<]+)`))?.[1];
   assert.ok(name,`${t.id}: ${id} has pose ${n}`);
   assert.ok(t.example.label.endsWith(`pose ${n}: ${name.trim()}`),`${t.id}: the label names the real pose (${name})`);
  }
 }
 assert.deepEqual(data.terms.filter(t=>!t.example).map(t=>t.id).sort(),['gyeokpa','gyeorugi','seogi'],'no examples where the lessons have none');
});

test('the page is generated from the data, complete without JavaScript',()=>{
 assert.equal(read('glossary.html'),expected(),'glossary.html is in sync (npm run sync)');
 const html=renderGlossary(data);
 for(const t of data.terms){
  assert.match(html,new RegExp(`<article class="gl-entry" id="${t.id}"`));
  for(const p of t.pages)assert.ok(html.includes(`${data.source.url}#page=${p}`),`${t.id} p.${p}`);
 }
 assert.match(read('glossary.html'),/<form class="toolbar gl-search" id="gl-search" role="search" hidden>/,'search appears only with JavaScript');
});

test('page: search by Korean, romanized or English words, shared in the address',async()=>{
 const html=read('glossary.html'),main=html.slice(html.indexOf('<main'),html.indexOf('</main>')+7);
 let run=0;
 async function page(search=''){
  const env=installDom({url:`https://tkdflow.com/glossary.html${search}`});parseInto(env.doc,env.doc.body,main);
  await import(`../js/pages/glossary.js?run=${++run}`);await settle(2);
  const $=id=>env.doc.getElementById(id),shown=()=>env.doc.querySelectorAll('.gl-entry').filter(e=>!e.hidden).map(e=>e.id);
  const type=v=>{$('gl-q').value=v;$('gl-q').dispatchEvent(env.event('input',{bubbles:true}));};
  return {...env,$,shown,type};
 }
 const p=await page();
 try{
  assert.equal(p.$('gl-search').hidden,false);assert.equal(p.$('gl-summary').textContent,`${data.terms.length} words.`);
  for(const q of ['앞차기','front kick','ap chagi','KICK FRONT'])
   {p.type(q);assert.deepEqual(p.shown(),['ap-chagi'],q);}
  p.type('kick');assert.deepEqual(p.shown(),['chagi','ap-chagi','dollyeo-chagi','yeop-chagi']);
  assert.equal(p.location.search,'?q=kick');assert.equal(p.$('gl-summary').textContent,`4 of ${data.terms.length} words match “kick”.`);
  p.type('zzzz');assert.equal(p.$('gl-empty').hidden,false);
  p.$('gl-clear').click();assert.equal(p.shown().length,data.terms.length);assert.equal(p.location.search,'');assert.equal(p.doc.activeElement,p.$('gl-q'));
 }finally{p.restore();}
 const q=await page('?q=%EB%A7%89%EA%B8%B0');   // 막기
 try{assert.deepEqual(q.shown(),['makgi']);assert.equal(q.$('gl-q').value,'막기');assert.equal(q.$('gl-summary').textContent,`1 of ${data.terms.length} words matches “막기”.`);}
 finally{q.restore();}
});

test('the glossary is reachable from Start here and Community, not the header',()=>{
 assert.match(read('start-here.html'),/<a href="\/glossary\.html">Taekwondo words explained<\/a>/);
 assert.equal(JSON.parse(read('data/community.json')).posts.find(p=>p.id==='glossary').url,'glossary.html');
 assert.doesNotMatch(read('layout/header.html'),/glossary/);
 assert.equal(JSON.parse(read('layout/pages.json')).pages.find(p=>p.file==='glossary.html').sitemap,true);
});
