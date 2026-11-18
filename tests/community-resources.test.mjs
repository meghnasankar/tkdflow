/* Community learning resources: search and shareable filters. Runs the real
   community.js on the real community.html markup in the mini DOM, with the real
   data/community.json; the public guide read gets an empty published list. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installDom,settle} from './helpers/mini-dom.mjs';
import {parseInto} from './helpers/mini-html.mjs';
import {categorySlug,resourceState,resourceQuery,resourceMatches} from '../js/lib/community-resources.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(read('data/community.json')),posts=data.posts;
const html=read('community.html'),mainHtml=html.slice(html.indexOf('<main'),html.indexOf('</main>')+7);
const categories=[...new Set(posts.map(p=>p.category))];

test('category slugs, address state and the all-word search',()=>{
 assert.equal(categorySlug('Forms & curriculum'),'forms-curriculum');
 assert.deepEqual(resourceState('?view=resources&category=competitions&q=guide',categories),{category:'Competitions',q:'guide',unknownCategory:false});
 assert.deepEqual(resourceState('?view=resources&category=nope',categories),{category:'all',q:'',unknownCategory:true});
 assert.equal(resourceState(`?q=${'x'.repeat(200)}`,categories).q.length,80);
 assert.equal(resourceQuery({category:'Forms & curriculum',q:' print '}),'?view=resources&category=forms-curriculum&q=print');
 assert.equal(resourceQuery({category:'all',q:''}),'?view=resources');
 const companions=posts.find(p=>p.id==='companions');
 for(const q of ['print read','READ print','Lesson companion','all lessons'])assert.ok(resourceMatches(companions,q),q);
 assert.ok(!resourceMatches(companions,'print zzzz'),'every word must match');
});

let run=0;
async function page(search='?view=resources',{gate=null}={}){
 const calls=[];
 const fetch=async url=>{const u=String(url);calls.push(u);if(gate&&u.includes('/data/community.json'))await gate;const body=u.includes('/data/community.json')?data:[];return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(body),json:async()=>body};};
 const env=installDom({url:`https://tkdflow.com/community.html${search}`,fetch});
 parseInto(env.doc,env.doc.body,mainHtml);
 await import(`../js/pages/community.js?run=${++run}`);await settle(10);
 const $=id=>env.doc.getElementById(id);
 const titles=()=>$('community-feed').querySelectorAll('article h3').map(h=>h.textContent);
 const button=c=>$('community-nav').children.find(b=>b.dataset.category===c);
 const type=v=>{$('resources-q').value=v;$('resources-q').dispatchEvent(env.event('input',{bubbles:true}));};
 return {...env,$,calls,titles,button,type,done:()=>env.restore()};
}

test('page: all resources by default, with category counts and no clear button',async()=>{
 const p=await page();
 try{
  assert.equal(p.titles().length,posts.length);assert.equal(p.$('community-summary').textContent,`${posts.length} resources.`);
  assert.equal(p.button('all').querySelector('.count').textContent,String(posts.length));
  assert.equal(p.button('Competitions').querySelector('.count').textContent,String(posts.filter(x=>x.category==='Competitions').length));
  assert.equal(p.$('resources-clear').hidden,true);
 }finally{p.done();}
});

test('page: a category click is in the address, keeps focus on the same button, and Back restores',async()=>{
 const p=await page();
 try{
  const btn=p.button('Competitions');btn.focus();btn.click();
  assert.equal(p.location.search,'?view=resources&category=competitions');
  assert.equal(p.button('Competitions'),btn,'the button is updated in place, not rebuilt');assert.equal(p.doc.activeElement,btn);
  assert.equal(btn.getAttribute('aria-pressed'),'true');assert.equal(p.button('all').getAttribute('aria-pressed'),'false');
  assert.deepEqual(p.titles(),posts.filter(x=>x.category==='Competitions').map(x=>x.title));
  assert.equal(p.$('resources-clear').hidden,false);
  p.history.replaceState(null,'','/community.html?view=resources&category=forms-curriculum&q=print');p.win.dispatchEvent(p.event('popstate',{}));
  assert.equal(p.$('resources-q').value,'print');assert.equal(p.button('Forms & curriculum').getAttribute('aria-pressed'),'true');
  assert.ok(p.titles().length>=1&&p.titles().every(t=>posts.find(x=>x.title===t).category==='Forms & curriculum'));
 }finally{p.done();}
});

test('page: typing searches title, body, kind and tags with every word, and the summary says how many match',async()=>{
 const p=await page();
 try{
  p.$('resources-q').focus();p.type('print read');
  assert.equal(p.location.search,'?view=resources&q=print+read');
  const expected=posts.filter(x=>resourceMatches(x,'print read'));
  assert.deepEqual(p.titles(),expected.map(x=>x.title));
  assert.equal(p.$('community-summary').textContent,`${expected.length} of ${posts.length} resources ${expected.length===1?'matches':'match'} “print read”.`);
  assert.equal(p.button('all').querySelector('.count').textContent,String(expected.length),'counts follow the search');
  assert.equal(p.doc.activeElement,p.$('resources-q'));
 }finally{p.done();}
});

test('page: no match shows an empty state; Show all resources clears both filters and returns focus to search',async()=>{
 const p=await page('?view=resources&category=competitions');
 try{
  p.type('zzzz');
  assert.equal(p.titles().length,0);assert.match(p.$('community-feed').textContent,/No resources match this search/);
  p.$('resources-clear').focus();p.$('resources-clear').click();
  assert.equal(p.location.search,'?view=resources');assert.equal(p.$('resources-q').value,'');
  assert.equal(p.titles().length,posts.length);assert.equal(p.$('resources-clear').hidden,true);
  assert.equal(p.doc.activeElement,p.$('resources-q'));
 }finally{p.done();}
});

test('page: an unknown category in a shared link shows everything and says so',async()=>{
 const p=await page('?view=resources&category=nope');
 try{assert.equal(p.titles().length,posts.length);assert.match(p.$('community-summary').textContent,/^That category isn’t listed, so all resources are shown\./);}
 finally{p.done();}
});

test('the discussions view is untouched: no resources fetch and no resources listeners',async()=>{
 const p=await page('');
 try{
  assert.equal(p.calls.some(u=>u.includes('/data/community.json')),false);
  assert.equal(p.$('community-resources-pane').hidden,true);
  p.type('print');assert.equal(p.location.search,'','typing in the hidden resources field does nothing in the discussions view');
 }finally{p.done();}
});

test('page: typing before the resources arrive keeps the search, focus and address, and the categories appear when ready',async()=>{
 let release;const gate=new Promise(r=>{release=r;});
 const p=await page('?view=resources',{gate});
 try{
  p.$('resources-q').focus();p.type('print');
  assert.equal(p.location.search,'?view=resources&q=print');
  assert.equal(p.$('community-nav').children.length,0,'no partial category list is built early');
  release();await settle(10);
  const expected=posts.filter(x=>resourceMatches(x,'print'));
  assert.deepEqual(p.$('community-nav').children.map(b=>b.dataset.category),['all',...categories],'every category appears');
  assert.equal(p.button('all').querySelector('.count').textContent,String(expected.length));
  assert.deepEqual(p.titles(),expected.map(x=>x.title));
  assert.equal(p.$('resources-q').value,'print');assert.equal(p.doc.activeElement,p.$('resources-q'));
 }finally{p.done();}
});

test('page: an unknown category with a search says every category is searched',async()=>{
 const p=await page('?view=resources&category=nope&q=guide');
 try{assert.match(p.$('community-summary').textContent,/^That category isn’t listed, so all categories are searched\./);}
 finally{p.done();}
});
