/* Start here hub: the beginner guidance must stay true to the catalogue, the
   real lesson player, the library search and the account age rules, and must
   be fully readable without JavaScript or an account. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyState,DEFAULT_STATE,sortForms} from '../js/lib/catalog.js';
import {AGE_POLICY} from '../js/lib/age-gate.js';
import {POSES} from '../js/lessons/taegeuk-1-data.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('start-here.html');
const main=html.slice(html.indexOf('<main'),html.indexOf('</main>'));
const text=main.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ');
const forms=JSON.parse(read('data/forms.json'));
const section=id=>{const start=main.indexOf(`id="${id}"`);assert.ok(start>0,`section ${id}`);return main.slice(start,main.indexOf('</section>',start));};
const plain=s=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');

test('style cards state the real lesson counts, ranges and filters for each style',()=>{
 const cards={wt:'sh-style-wt',itf:'sh-style-itf',ata:'sh-style-ata'};
 let total=0;
 for(const [org,id] of Object.entries(cards)){
  const start=main.indexOf(`id="${id}"`),card=plain(main.slice(start,main.indexOf('</article>',start)));
  const lessons=sortForms(forms.filter(f=>f.category===org&&f.lessonUrl),'curriculum');
  total+=lessons.length;
  assert.match(card,new RegExp(`\\b${lessons.length} lessons\\b`),`${org} lesson count`);
  assert.ok(card.includes(lessons[0].name),`${org} first lesson ${lessons[0].name}`);
  if(lessons.length>3)assert.ok(card.includes(lessons.at(-1).name),`${org} last lesson ${lessons.at(-1).name}`);
  assert.match(main.slice(start,main.indexOf('</article>',start)),new RegExp(`href="/forms\\.html\\?org=${org}"`));
 }
 assert.equal(total,forms.filter(f=>f.lessonUrl).length,'the three styles cover every lesson');
});

test('each style’s first form link opens that style’s first lesson in curriculum order',()=>{
 const firsts=[...section('sh-choose').matchAll(/<li><a href="\/([a-z0-9-]+\.html)">([^<]+)<\/a> <span>([^<]+)<\/span><\/li>/g)];
 assert.equal(firsts.length,3);
 for(const [,href,name,label] of firsts){
  const org={'WT / Kukkiwon':'wt',ITF:'itf',ATA:'ata'}[label];
  const first=sortForms(forms.filter(f=>f.category===org&&f.lessonUrl),'curriculum')[0];
  assert.equal(href,first.lessonUrl);assert.equal(name,first.name);
 }
});

test('the spellings the guide promises are found by the real library search',()=>{
 const step=plain(section('sh-choose'));
 const pairs=[...step.matchAll(/([A-Z][\w-]+(?: (?:Il Jang|\d|#\d))?) is also(?: written)? ([A-Z][\w-]+(?: #?\d)?)/g)].map(m=>[m[1],m[2]]);
 assert.ok(pairs.length>=4,'spelling examples are listed');
 for(const [name,variant] of pairs){
  const target=forms.find(f=>f.name===name);assert.ok(target,`${name} is a catalogue form`);
  const found=applyState(forms,{...DEFAULT_STATE,q:variant}).map(f=>f.id);
  assert.deepEqual(found,[target.id],`searching “${variant}” finds only ${name}`);
 }
});

test('the pose-vs-count example matches the catalogue and the lesson data',()=>{
 const t1=forms.find(f=>f.id==='taegeuk-1');
 assert.match(text,new RegExp(`Taegeuk Il Jang is commonly counted as ${t1.moves} movements; its animation has ${POSES.length} poses`));
 assert.notEqual(t1.moves,POSES.length,'the example shows a real difference');
 assert.match(POSES[0].name,/Junbi|Ready/);assert.match(POSES.at(-1).name,/Baro|Return/,'ready and return are poses, as the guide says');
});

test('lesson tools described are the controls the lesson player actually has',()=>{
 const lesson=read('taegeuk-1.html'),tools=plain(section('sh-tools'));
 const speeds=[...lesson.matchAll(/<option value="[\d.]+"[^>]*>([\d.]+×)<\/option>/g)].map(m=>m[1]);
 assert.deepEqual(speeds,['0.25×','0.5×','1×']);
 assert.match(tools,new RegExp(speeds.map(s=>s.replace('.','\\.')).join(', ').replace(/, (?=[^,]*$)/,',? or ')));
 const views=[...lesson.matchAll(/data-lesson-view="[a-z-]+"[^>]*>([^<]+)</g)].map(m=>m[1]);
 assert.deepEqual(views,['Front','Back','Left','Right','3/4']);
 assert.ok(tools.includes(views.slice(0,4).join(', ')+' and 3/4'));
 const keys=[...lesson.match(/<p class="player-keys"[^]*?<\/p>/)[0].matchAll(/<kbd>([^<]+)<\/kbd>/g)].map(m=>m[1]);
 for(const k of keys)assert.ok(tools.includes(k),`key ${k} is explained`);
 for(const id of ['voice-toggle','effects-toggle','study-view','btn-copy-link','move-list'])assert.ok(lesson.includes(`id="${id}"`),`lesson control ${id}`);
 assert.match(read('js/pages/lesson-player.js'),/e\.key==='Escape'&&document\.body\.classList\.contains\('lesson-study'\)/,'Escape leaves study view, as stated');
 assert.match(tools,/Press Escape/);
});

test('directions are explained relative to the starting stance, never as a mirror that tracks turns',()=>{
 const reading=plain(section('sh-reading'));
 assert.match(reading,/performer’s own left and right/);
 assert.match(reading,/At the ready position, the Back view puts you behind the performer/);
 assert.match(reading,/does not mirror or follow the way they face/);
 assert.doesNotMatch(text,/faces the same way you do|their left is your left/,'no claim that Back view always matches the viewer');
 assert.match(read('taegeuk-1.html'),/Views are fixed to the starting stance\. Directions use the performer’s left and right\./,'matches the lesson’s own note');
});

test('account, age and posting statements match the age policy',()=>{
 assert.equal(AGE_POLICY.individualMin,13);assert.equal(AGE_POLICY.adultMin,18);
 const community=plain(section('sh-community')),save=plain(section('sh-save'));
 assert.match(community,new RegExp(`Accounts are for ages ${AGE_POLICY.individualMin} and over`));
 assert.match(community,new RegExp(`Members aged ${AGE_POLICY.individualMin} to ${AGE_POLICY.adultMin-1} have private profiles and do not publish posts or send messages`));
 assert.match(community,new RegExp(`Adults aged ${AGE_POLICY.adultMin} and over can submit`));
 assert.match(save,new RegExp(`members aged ${AGE_POLICY.individualMin} and over with a confirmed account and completed profile`));
 assert.match(text,/Browse this guide and study all lessons without an account\./);
 assert.doesNotMatch(text,/Everything[^.]*works without an account/,'private help and synced saves need an account');
});

test('readable without JavaScript: no page script, hidden content or JS-only notice',()=>{
 assert.deepEqual([...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]),['/js/site.js'],'only the shared header script');
 assert.doesNotMatch(main,/\shidden\b|<noscript|<template|Loading/);
 for(const [,hash] of main.match(/<nav class="sh-toc"[^]*?<\/nav>/)[0].matchAll(/href="#([^"]+)"/g))assert.match(main,new RegExp(`<section[^>]+id="${hash}"`),`contents link #${hash}`);
});

test('organization facts are sourced, dated and official; guidance makes no endorsement claim',()=>{
 const sources=section('sh-sources');
 assert.match(plain(sources),/checked on 18 November 2026/);
 const external=[...main.matchAll(/href="(https?:[^"]+)"/g)].map(m=>m[1]);
 assert.ok(external.length>=5);
 for(const url of external){
  assert.match(url,/^https:\/\//);
  assert.match(new URL(url.replace(/&amp;/g,'&')).hostname,/(^|\.)(kukkiwon\.or\.kr|worldtaekwondo\.org|itf-d\.de|atamartialarts\.com)$/,url);
  assert.ok(sources.includes(url),`${url} is listed under Sources`);
 }
 assert.doesNotMatch(text,/approved by|endorsed|certified|reviewed by|has not been reviewed|official TKDflow curriculum/i);
 assert.doesNotMatch(text,/\bequivalent\b|\bequals\b|same as a .* belt/i,'no universal belt mapping');
 assert.match(text,/Belt colours do not line up between styles/);
 assert.match(text,/ATA is a different organization from American Taekwondo United/);
});

test('the guide is discoverable from home, library, community, footer, 404 and sitemap',()=>{
 const page=JSON.parse(read('layout/pages.json')).pages.find(p=>p.file==='start-here.html');
 assert.equal(page.sitemap,true);assert.match(read('sitemap.xml'),/https:\/\/tkdflow\.com\/start-here\.html/);
 assert.match(read('layout/footer.html'),/<li><a href="\/start-here\.html">Start here<\/a><\/li>/);
 assert.match(read('index.html'),/<p class="hero-start">New to taekwondo forms\? <a href="\/start-here\.html">/);
 assert.match(read('forms.html'),/<a class="btn btn-secondary btn-sm" href="\/start-here\.html">New here\? Start here<\/a>/);
 assert.match(read('404.html'),/href="\/start-here\.html">Start here</);
 const entry=JSON.parse(read('data/community.json')).posts.find(p=>p.id==='start-here');
 assert.equal(entry.url,'start-here.html');assert.equal(entry.kind,'Beginner guide');
});
