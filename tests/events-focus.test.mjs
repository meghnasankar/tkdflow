/* Events keyboard continuity, run against the real js/pages/events.js in a
   minimal DOM where removing a focused element drops focus to <body> (as in
   browsers). The page's own one-minute ticker callback is invoked directly. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installDom,settle} from './helpers/mini-dom.mjs';
import {eventStatus,filterEvents,DEFAULT_FILTERS,eventStatuses} from '../js/lib/events.js';

const data=JSON.parse(readFileSync(new URL('../data/competitions.json',import.meta.url),'utf8'));
const RealDate=Date;
let clock=Date.parse('2026-11-18T12:00:00Z'),run=0;
class FakeDate extends RealDate{constructor(...a){super(...(a.length?a:[clock]));}static now(){return clock;}}

async function page({search=''}={}){
 const env=installDom({url:`https://tkdflow.com/competitions.html${search}`,fetch:async url=>({ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data,url})});
 const {doc,el}=env;
 const selects=['year','organization','country','region','kind','style','level','type'].map(k=>el('select',{id:`ev-${k}`}));
 const form=el('form',{id:'event-filters'},el('input',{type:'search',id:'ev-q'}),...selects,el('input',{type:'month',id:'ev-month'}),el('input',{type:'checkbox',id:'ev-major'}),
  el('button',{type:'button',id:'ev-this-month'},'This month'),el('details',{class:'event-advanced'},el('span',{id:'event-filter-count'})));
 doc.body.append(el('main',{},el('p',{id:'events-overview'}),el('p',{id:'events-coverage'}),form,
  ...['upcoming','past','announced','all'].map(s=>el('button',{type:'button','data-status':s},s)),
  el('div',{id:'events-active-filters'}),el('p',{id:'events-summary','aria-live':'polite'}),el('div',{id:'events-list'}),el('p',{id:'events-reviewed'})));
 let tick=null;
 globalThis.setInterval=fn=>{tick=fn;return 1;};globalThis.clearInterval=()=>{tick=null;};
 globalThis.Date=FakeDate;
 await import(`../js/pages/events.js?run=${++run}`);
 await settle();
 const list=doc.getElementById('events-list');
 const cards=()=>list.children.filter(n=>n.dataset.event);
 return {...env,list,cards,tick:()=>tick?.(),key:k=>list.querySelectorAll('[data-fk]').find(n=>n.dataset.fk===k)};
}
function cleanup(env){env.restore();globalThis.Date=RealDate;clock=Date.parse('2026-11-18T12:00:00Z');}
/* Identity checks: never let assert format whole (cyclic) DOM trees. */
const is=(a,b,msg='not the expected element')=>assert.ok(a===b,`${msg} (got ${a?.dataset?.fk||a?.id||a?.tagName||a})`);
const isnt=(a,b,msg='unexpectedly the same element')=>assert.ok(a!==b,msg);
const same=(a,b,msg='not the same nodes')=>assert.ok(a.length===b.length&&a.every((n,i)=>n===b[i]),msg);
const fk=el=>el?.dataset?.fk||el?.tagName;

test('Show more moves focus to the first newly shown event, without scrolling',async()=>{
 const env=await page();
 try{
  const before=env.cards();assert.equal(before.length,24);
  const more=env.key('events:more');more.focus();
  more.click();
  const after=env.cards();assert.ok(after.length>24);
  same(after.slice(0,24),before,'the first 24 cards are the same nodes');
  const first=after[24],active=env.doc.activeElement;
  assert.equal(fk(active),`event:${first.dataset.event}:title`,'focus is on the 25th card’s title, not <body>');
  assert.deepEqual(active.focusCalls.at(-1),{preventScroll:true});
  assert.equal(env.doc.scrolls.length,0,'no scroll jump');
  is(env.key('events:more'),more,'the same Show more button stays for the next batch');
 }finally{cleanup(env);}
});

test('the one-minute refresh keeps the focused control and the unchanged card nodes',async()=>{
 const env=await page();
 try{
  const cards=env.cards(),third=cards[2],control=env.key(`event:${third.dataset.event}:calendar`)||env.key(`event:${third.dataset.event}:official`)||env.key(`event:${third.dataset.event}:title`);
  control.focus();
  const options=[...env.doc.getElementById('ev-country').options];
  env.tick();
  is(env.doc.activeElement,control,'the same focused node');
  same(env.cards(),cards,'no card was replaced or moved');
  same([...env.doc.getElementById('ev-country').options],options,'no option node was replaced');
  const search=env.doc.getElementById('ev-q');search.focus();env.tick();
  is(env.doc.activeElement,search,'a refresh never takes focus from the search box');
 }finally{cleanup(env);}
});

test('filter changes update option labels in place and keep the select',async()=>{
 const env=await page();
 try{
  const year=env.doc.getElementById('ev-year'),country=env.doc.getElementById('ev-country');
  const yearOptions=[...year.options],countryOptions=[...country.options],labels=countryOptions.map(o=>o.textContent);
  const target=yearOptions.find(o=>o.value!=='all'&&!o.disabled);
  year.focus();year.value=target.value;year.dispatchEvent(env.event('change'));
  is(env.doc.activeElement,year);
  same([...year.options],yearOptions);same([...country.options],countryOptions,'same option nodes');
  assert.notDeepEqual(countryOptions.map(o=>o.textContent),labels,'their counts were updated in place');
  assert.equal(year.value,target.value);
 }finally{cleanup(env);}
});

test('when a focused event changes status it keeps focus on the same control in its new card',async()=>{
 const env=await page();
 try{
  const now=new RealDate(clock),statuses=eventStatuses(data.events,now);
  const ev=filterEvents(data.events,DEFAULT_FILTERS,now,statuses).slice(0,24).find(e=>e.start&&e.end&&eventStatus(e,now)==='upcoming');
  assert.ok(ev,'an upcoming event with dates is listed');
  const start=Date.parse(`${ev.start}T12:00:00Z`),later=new RealDate(start);
  assert.notEqual(eventStatus(ev,later),'upcoming','on its start day the event’s status changes');
  const stillListed=filterEvents(data.events,DEFAULT_FILTERS,later,eventStatuses(data.events,later)).slice(0,24).some(e=>e.id===ev.id);
  const key=`event:${ev.id}:title`;env.key(key).focus();
  const oldCard=env.cards().find(c=>c.dataset.event===ev.id);
  clock=start;env.tick();
  const newCard=env.cards().find(c=>c.dataset.event===ev.id);
  assert.equal(Boolean(newCard),stillListed);
  if(newCard){
   isnt(newCard,oldCard,'the card was rebuilt for its new status');
   assert.equal(fk(env.doc.activeElement),key,'focus moved to the same control in the new card, not <body>');
  }else isnt(env.doc.activeElement,env.doc.body,'focus did not fall to <body>');
 }finally{cleanup(env);}
});

test('if the focused event leaves the results, focus goes to the card now in its place',async()=>{
 const env=await page();
 try{
  const now=new RealDate(clock),statuses=eventStatuses(data.events,now);
  const shown=filterEvents(data.events,DEFAULT_FILTERS,now,statuses).slice(0,24);
  const index=shown.findIndex(e=>e.end&&eventStatus(e,now)==='upcoming');
  const ev=shown[index];env.key(`event:${ev.id}:title`).focus();
  clock=Date.parse(`${ev.end}T00:00:00Z`)+3*86400000;  // now past: it leaves the Upcoming list
  env.tick();
  assert.ok(!env.cards().some(c=>c.dataset.event===ev.id),'the event left the list');
  const replacement=env.cards()[Math.min(index,env.cards().length-1)];
  assert.equal(fk(env.doc.activeElement),`event:${replacement.dataset.event}:title`,'the card now at its position has focus');
 }finally{cleanup(env);}
});

test('when the last result leaves and the list becomes empty, focus goes to the results summary only if it was in the list',async()=>{
 const pick=()=>{const now=new RealDate(clock),statuses=eventStatuses(data.events,now);
  return filterEvents(data.events,DEFAULT_FILTERS,now,statuses).find(e=>e.end&&eventStatus(e,now)==='upcoming'&&filterEvents(data.events,{...DEFAULT_FILTERS,q:e.id},now,statuses).length===0&&filterEvents(data.events,{...DEFAULT_FILTERS,q:e.name},now,statuses).length===1);};
 const ev=pick();assert.ok(ev,'an event whose name finds only itself');
 const later=Date.parse(`${ev.end}T00:00:00Z`)+3*86400000;
 const env=await page({search:`?q=${encodeURIComponent(ev.name)}`});
 try{
  assert.equal(env.cards().length,1);
  env.key(`event:${ev.id}:title`).focus();
  clock=later;env.tick();
  assert.equal(env.cards().length,0,'no results now');
  const summary=env.doc.getElementById('events-summary');
  is(env.doc.activeElement,summary,'the results summary, not <body>');
  assert.equal(summary.getAttribute('tabindex'),'-1');
 }finally{cleanup(env);}
 const again=await page({search:`?q=${encodeURIComponent(ev.name)}`});
 try{
  const search=again.doc.getElementById('ev-q');search.focus();
  clock=later;again.tick();
  assert.equal(again.cards().length,0);
  is(again.doc.activeElement,search,'focus in the search box is never moved');
 }finally{cleanup(again);}
});

test('Back/Forward restores filters without moving focus',async()=>{
 const env=await page();
 try{
  const search=env.doc.getElementById('ev-q');search.focus();
  env.history.pushState(null,'','/competitions.html?status=past');
  env.win.dispatchEvent(env.event('popstate'));
  is(env.doc.activeElement,search);
  assert.equal(env.doc.querySelector('[data-status="past"]').getAttribute('aria-pressed'),'true');
 }finally{cleanup(env);}
});
