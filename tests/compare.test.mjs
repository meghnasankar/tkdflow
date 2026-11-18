/* Compare two forms: URL state, the generated counts and the real page.
   The page runs the real compare.js on the real compare.html markup in the
   mini DOM, with the real catalogue and counts files served by a fake fetch. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {installDom,settle} from './helpers/mini-dom.mjs';
import {parseInto} from './helpers/mini-html.mjs';
import {parseCompare,compareQuery,factRows,sharedLines,factsProblem} from '../js/lib/form-compare.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const forms=JSON.parse(read('data/forms.json')),facts=JSON.parse(read('data/form-facts.json'));
const ids=forms.map(f=>f.id),byId=new Map(forms.map(f=>[f.id,f]));
const html=read('compare.html'),mainHtml=html.slice(html.indexOf('<main'),html.indexOf('</main>')+7);

test('the address accepts two different known forms and reports everything else',()=>{
 assert.deepEqual(parseCompare('?a=koryo&b=taegeuk-1',ids),{a:'koryo',b:'taegeuk-1',problems:[],canonical:true});
 assert.deepEqual(parseCompare('?a=koryo&b=koryo',ids),{a:'koryo',b:null,problems:['same'],canonical:false});
 assert.deepEqual(parseCompare('?b=koryo',ids),{a:'koryo',b:null,problems:[],canonical:false},'a lone second form becomes the first');
 for(const bad of ['../x','KORYO','koryo%20','nope','koryo&x'])assert.ok(parseCompare(`?a=${encodeURIComponent(bad)}`,ids).problems.includes('unknown'),bad);
 assert.deepEqual(parseCompare(`?a=${'k'.repeat(41)}&b=koryo`,ids),{a:'koryo',b:null,problems:['long'],canonical:false});
 assert.deepEqual(parseCompare('?a=koryo&a=sipjin&b=jitae',ids),{a:'koryo',b:'jitae',problems:['repeated'],canonical:false});
 assert.equal(parseCompare('?a=koryo&b=jitae&utm_source=x',ids).canonical,false,'extra parameters are not canonical');
 assert.equal(parseCompare('',ids).canonical,true);
 assert.equal(compareQuery({a:'koryo',b:'jitae'}),'?a=koryo&b=jitae');assert.equal(compareQuery({a:null,b:null}),'');
});

test('the generated counts match what each published companion states',()=>{
 assert.equal(factsProblem(facts,ids),null);
 assert.deepEqual(Object.keys(facts.forms).sort(),[...ids].sort());
 for(const id of ids){
  const m=read(`companions/${id}.html`).match(/(\d+) study poses · (\d+) /);
  assert.ok(m,`${id} companion states its counts`);
  assert.deepEqual(facts.forms[id],{studyPoses:Number(m[1]),referenceCounts:Number(m[2])},id);
 }
 assert.ok(factsProblem({version:1,forms:{nope:{studyPoses:1,referenceCounts:1}}},ids));
 assert.ok(factsProblem({version:1,forms:{koryo:{studyPoses:0,referenceCounts:1}}},ids));
});

test('each card shows only catalogue facts and the counts, and neutral shared lines',()=>{
 const koryo=byId.get('koryo');
 assert.deepEqual(factRows(koryo,facts.forms).map(r=>r[0]),['Style','Series','Typical belt / level','Reference counts','Study poses'],'no difficulty or review rows');
 assert.deepEqual(factRows(koryo,facts.forms).slice(2),[['Typical belt / level',`${koryo.beltLabel} (typical)`],['Reference counts','30'],['Study poses','52']]);
 assert.deepEqual(factRows(koryo,null).map(r=>r[0]),['Style','Series','Typical belt / level'],'without the counts file only catalogue facts');
 assert.deepEqual(sharedLines(byId.get('taegeuk-1'),byId.get('taegeuk-2')),['Both are in the Taegeuk Series (Colour Belt).']);
 assert.deepEqual(sharedLines(byId.get('chon-ji'),byId.get('taegeuk-1')),[],'nothing is said about forms from different styles');
});

let run=0;
async function page({search='',factsFail=false,clipboard}={}){
 const fetch=async url=>{const u=String(url);
  if(u.includes('/data/form-facts.json')){if(factsFail)return {ok:false,status:500,headers:{get:()=>null},text:async()=>''};return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(facts)};}
  return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(forms)};};
 const env=installDom({url:`https://tkdflow.com/compare.html${search}`,fetch});
 parseInto(env.doc,env.doc.body,mainHtml);
 const nav=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard}});
 await import(`../js/pages/compare.js?run=${++run}`);await settle(8);
 const $=id=>env.doc.getElementById(id);
 const cards=()=>$('cf-cards').querySelectorAll('article');
 const facts_=c=>{const dts=c.querySelectorAll('dt'),dds=c.querySelectorAll('dd');return dts.map((d,i)=>[d.textContent,dds[i].textContent]);};
 const change=(sel,value)=>{sel.value=value;sel.dispatchEvent(env.event('change',{bubbles:true}));};
 return {...env,$,cards,facts:facts_,change,done:()=>{env.restore();if(nav)Object.defineProperty(globalThis,'navigator',nav);}};
}

test('page: a shared address shows the pair with correct facts, links and the school-variation note',async()=>{
 const p=await page({search:'?a=koryo&b=taegeuk-1'});
 try{
  assert.equal(p.$('cf-nojs').hidden,true);assert.equal(p.$('cf-app').hidden,false);
  const [a,b]=p.cards();
  assert.equal(a.querySelector('h2').textContent,'Koryo');assert.equal(b.querySelector('h2').textContent,'Taegeuk Il Jang');
  assert.deepEqual(p.facts(a),[['Style','WT / Kukkiwon'],['Series',byId.get('koryo').series],['Typical belt / level',`${byId.get('koryo').beltLabel} (typical)`],['Reference counts','30'],['Study poses','52']]);
  const img=a.querySelector('img');assert.equal(img.getAttribute('src'),byId.get('koryo').thumbnail.src);assert.equal(img.getAttribute('alt'),byId.get('koryo').thumbnail.alt);
  for(const link of a.querySelectorAll('a')){const href=link.getAttribute('href'),file=href.split('?')[0].replace(/^\//,'');assert.ok(existsSync(new URL('../'+file,import.meta.url)),href);}
  assert.deepEqual(a.querySelectorAll('a').map(l=>l.getAttribute('href')),['/koryo.html','/companions/koryo.html','/forms.html?q=Koryo']);
  assert.equal(p.$('cf-summary').textContent,'Comparing Koryo and Taegeuk Il Jang.');
  assert.equal(p.$('cf-note').hidden,false);assert.match(p.$('cf-note').textContent,/not equivalents/);
  assert.equal(p.$('cf-a').value,'koryo');assert.equal(p.$('cf-b').value,'taegeuk-1');
 }finally{p.done();}
});

test('page: choosing, swapping and Back keep the selects focused and the address in step',async()=>{
 const p=await page({search:'?a=koryo'});
 try{
  assert.equal(p.cards().length,1);assert.equal(p.$('cf-summary').textContent,'Choose a second form to compare with Koryo.');
  p.$('cf-b').focus();p.change(p.$('cf-b'),'taegeuk-2');
  assert.equal(p.location.search,'?a=koryo&b=taegeuk-2');assert.equal(p.cards().length,2);
  assert.equal(p.doc.activeElement,p.$('cf-b'),'the select keeps focus; only the cards change');
  p.$('cf-swap').click();
  assert.equal(p.location.search,'?a=taegeuk-2&b=koryo');assert.equal(p.$('cf-a').value,'taegeuk-2');
  assert.equal(p.cards()[0].querySelector('h2').textContent,'Taegeuk Yi Jang');
  // Back to an earlier address.
  p.history.replaceState(null,'','/compare.html?a=koryo&b=taegeuk-1');p.win.dispatchEvent(p.event('popstate',{}));
  assert.equal(p.$('cf-b').value,'taegeuk-1');assert.equal(p.cards()[1].querySelector('h2').textContent,'Taegeuk Il Jang');
  p.change(p.$('cf-b'),'koryo');
  assert.equal(p.cards().length,1,'the same form twice shows one card');assert.match(p.$('cf-summary').textContent,/same form/);
 }finally{p.done();}
});

test('page: a mistyped or extended address is shown honestly and rewritten to what is shown',async()=>{
 for(const [search,canonical,cardCount,message] of [
  ['?a=nope&b=../x&utm_source=mail','',0,/isn’t in the library/],
  ['?a=koryo&b=koryo','?a=koryo',1,/same form/],
  ['?a=koryo&b=sipjin&ref=1','?a=koryo&b=sipjin',2,/^Comparing Koryo and Sipjin\.$/],
 ]){
  const p=await page({search});
  try{assert.equal(p.location.search,canonical,search);assert.equal(p.cards().length,cardCount);assert.match(p.$('cf-summary').textContent,message);}
  finally{p.done();}
 }
});

test('page: Copy comparison link copies the canonical address, or shows it to select when copying fails',async()=>{
 let copied=null;
 let p=await page({search:'?a=koryo&b=jitae',clipboard:{writeText:async t=>{copied=t;}}});
 try{p.$('cf-copy').click();await settle(4);assert.equal(copied,'https://tkdflow.com/compare.html?a=koryo&b=jitae');assert.equal(p.$('cf-copy-status').textContent,'Comparison link copied.');assert.equal(p.$('cf-copy-fallback').hidden,true);}
 finally{p.done();}
 p=await page({search:'?a=koryo&b=jitae',clipboard:{writeText:async()=>{throw new Error('denied');}}});
 try{
  p.$('cf-copy').click();await settle(4);
  assert.equal(p.$('cf-copy-fallback').hidden,false);assert.equal(p.$('cf-url').value,'https://tkdflow.com/compare.html?a=koryo&b=jitae');
  assert.equal(p.doc.activeElement,p.$('cf-url'),'the address is ready to select');assert.match(p.$('cf-copy-status').textContent,/couldn’t be copied/);
 }finally{p.done();}
});

test('page: without the counts file the cards still show the catalogue facts',async()=>{
 const p=await page({search:'?a=koryo&b=jitae',factsFail:true});
 try{assert.equal(p.cards().length,2);assert.deepEqual(p.facts(p.cards()[0]).map(r=>r[0]),['Style','Series','Typical belt / level']);}
 finally{p.done();}
});

test('the comparison is reachable from the library, Start here and Community, not the header',()=>{
 assert.match(read('forms.html'),/<p class="hero-companions"><a href="\/compare\.html">Compare two forms side by side<\/a><\/p>/);
 assert.match(read('start-here.html'),/<a href="\/compare\.html">Compare two forms<\/a>/);
 assert.equal(JSON.parse(read('data/community.json')).posts.find(p=>p.id==='compare').url,'compare.html');
 assert.doesNotMatch(read('layout/header.html'),/compare\.html/);
 const page=JSON.parse(read('layout/pages.json')).pages.find(p=>p.file==='compare.html');assert.equal(page.sitemap,true);
});

test('page: each card carries the form’s own description, and one note explains the two counts',async()=>{
 let p=await page({search:'?a=koryo&b=jitae'});
 try{
  const [a,b]=p.cards();
  assert.equal(a.querySelector('.cf-desc').textContent,byId.get('koryo').description);
  assert.equal(b.querySelector('.cf-desc').textContent,byId.get('jitae').description);
  assert.equal(p.$('cf-counts-note').hidden,false);
  assert.equal(p.$('cf-counts-note').querySelector('a').getAttribute('href'),'/start-here.html#sh-reading');
  assert.match(read('start-here.html'),/id="sh-reading"/,'the explanation it links to exists');
 }finally{p.done();}
 p=await page({search:'?a=koryo&b=jitae',factsFail:true});
 try{assert.equal(p.$('cf-counts-note').hidden,true,'no counts, no counts note');}finally{p.done();}
});

const deferred=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return {promise,resolve,reject};};
test('page: a copy that finishes after the pair changed, or after a newer copy, shows nothing stale',async()=>{
 // Success arriving after a new choice: no "copied" message for the old pair.
 let gate=deferred();
 let p=await page({search:'?a=koryo&b=jitae',clipboard:{writeText:()=>gate.promise}});
 try{
  p.$('cf-copy').click();await settle(2);
  p.$('cf-b').focus();p.change(p.$('cf-b'),'sipjin');
  gate.resolve();await settle(4);
  assert.equal(p.$('cf-copy-status').textContent,'');assert.equal(p.$('cf-copy-fallback').hidden,true);
 }finally{p.done();}
 // Failure arriving after a new choice: no fallback field, and focus stays on the select.
 gate=deferred();
 p=await page({search:'?a=koryo&b=jitae',clipboard:{writeText:()=>gate.promise}});
 try{
  p.$('cf-copy').click();await settle(2);
  p.$('cf-b').focus();p.change(p.$('cf-b'),'sipjin');
  gate.reject(new Error('denied'));await settle(4);
  assert.equal(p.$('cf-copy-fallback').hidden,true);assert.equal(p.$('cf-copy-status').textContent,'');
  assert.equal(p.doc.activeElement,p.$('cf-b'),'focus is not pulled to the old address');
 }finally{p.done();}
 // An older failing copy finishing after a newer successful one leaves the newer result.
 const first=deferred();let calls=0;
 p=await page({search:'?a=koryo&b=jitae',clipboard:{writeText:()=>++calls===1?first.promise:Promise.resolve()}});
 try{
  p.$('cf-copy').click();await settle(2);p.$('cf-copy').click();await settle(4);
  assert.equal(p.$('cf-copy-status').textContent,'Comparison link copied.');
  first.reject(new Error('late'));await settle(4);
  assert.equal(p.$('cf-copy-status').textContent,'Comparison link copied.');assert.equal(p.$('cf-copy-fallback').hidden,true);
 }finally{p.done();}
});
