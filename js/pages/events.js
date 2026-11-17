/* Sourced worldwide events, with independent URL-backed filters. */
import {DEFAULT_FILTERS,filterEvents,eventStatus,registrationState,createTicker,needsTicking,currentMonth} from '../lib/events.js';
import {validateEvents} from '../lib/validators.js';
import {loadInto,showEmpty} from '../lib/data.js';
import {h,replaceChildren,safeHref} from '../lib/dom.js';
const $=id=>document.getElementById(id);
const LABELS={style:{wt:'WT / Kukkiwon',itf:'ITF',ata:'ATA',open:'Open / all styles'},level:{local:'Local / regional',national:'National',international:'International',unspecified:'Level not specified'},type:{poomsae:'Poomsae',patterns:'Patterns / tul',sparring:'Sparring',para:'Para taekwondo',breaking:'Breaking','special-techniques':'Special techniques','power-test':'Power test'}};
const STATUS={past:'Past',ongoing:'Happening now',upcoming:'Upcoming',announced:'Dates to be announced',cancelled:'Cancelled',postponed:'Postponed'};
const params=new URLSearchParams(location.search);
let filters={...DEFAULT_FILTERS};
for(const k of Object.keys(filters))if(params.has(k))filters[k]=k==='major'?params.get(k)==='1':params.get(k);
if(!['upcoming','past','all','announced'].includes(filters.status))filters.status='upcoming';
let limit=24;let doc=null;const ticker=createTicker(()=>render(),{intervalMs:60000});
const fmt=iso=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${iso}T00:00:00Z`));
function flag(code){return /^[A-Z]{2}$/.test(code||'')?[...code].map(c=>String.fromCodePoint(c.charCodeAt(0)+127397)).join(''):'';}
function options(id,values,labels,all){replaceChildren($(id),h('option',{value:'all'},all),...values.map(v=>h('option',{value:v},labels?.[v]||v)));}
function card(ev,now){
 const status=eventStatus(ev,now),href=safeHref(ev.eventUrl||ev.source),source=safeHref(ev.source);
 const dates=ev.start?(ev.start===ev.end?fmt(ev.start):`${fmt(ev.start)} – ${fmt(ev.end)}`):`${ev.year} · dates to be announced`;
 return h('article',{class:`event-card ${status}${ev.major?' major-event':''}`},
  h('div',{class:'strip','aria-hidden':'true'}),h('div',{class:'event-body'},
   h('div',{class:'example-meta'},h('span',{class:`badge ${status==='past'?'badge-muted':'badge-navy'}`},STATUS[status]),
    ev.major?h('span',{class:'badge badge-gold'},'★ Major event'):null,
    h('span',{class:'badge badge-muted'},ev.organization||LABELS.style[ev.style]),
    h('span',{class:'badge badge-muted'},ev.organiserClass||LABELS.level[ev.level]||ev.level)),
   h('h3',{},href?h('a',{href,target:'_blank',rel:'noopener noreferrer'},ev.name):ev.name),
   h('p',{class:'event-location'},h('span',{'aria-hidden':'true'},`${flag(ev.countryCode)} `),ev.location),
   h('dl',{class:'event-meta'},h('div',{},h('dt',{},'Dates'),h('dd',{},dates)),h('div',{},h('dt',{},'Events'),h('dd',{},(ev.eventTypes||[]).map(x=>LABELS.type[x]||x).join(' · ')||'See organizer'))),
   ev.notes?h('p',{class:'event-notes'},ev.notes):null,
   h('div',{class:'event-footer'},h('span',{},`Checked ${fmt(ev.lastChecked)}`),
    h('div',{class:'event-links'},source&&source!==href?h('a',{href:source,target:'_blank',rel:'noopener noreferrer',class:'text-link'},'Calendar source'):null,
     href?h('a',{href,target:'_blank',rel:'noopener noreferrer',class:'btn btn-secondary btn-sm'},'Official event page ↗'):null)),
   registrationState(ev,now)==='registration-closed'?h('p',{class:'event-notes'},'The organizer’s published registration deadline has passed.'):null));
}
function syncControls(){
 for(const k of ['style','level','country','type','year','region','organization','kind']){
  const el=$(`ev-${k}`);if(![...el.options].some(o=>o.value===String(filters[k])))filters[k]='all';el.value=filters[k];
 }
 $('ev-month').value=filters.month;$('ev-q').value=filters.q;$('ev-major').checked=filters.major;
}
function render(){if(!doc)return;const now=new Date(),list=filterEvents(doc.events,filters,now);
 document.querySelectorAll('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status===filters.status)));
 $('events-summary').textContent=`${list.length} of ${doc.events.length} events${filters.major?' · major events only':''}.`;
 if(list.length)replaceChildren($('events-list'),...list.slice(0,limit).map(e=>card(e,now)),list.length>limit?h('button',{type:'button',class:'btn btn-secondary',on:{click:()=>{limit+=24;render();}}},`Show more (${list.length-limit} remaining)`):null);else showEmpty($('events-list'),'No events match these filters. Try another year, country or date status.');
 if(needsTicking(doc.events,now))ticker.start();else ticker.stop();
}
function set(patch){limit=24;filters={...filters,...patch};const p=new URLSearchParams();for(const [k,v]of Object.entries(filters))if(v!==DEFAULT_FILTERS[k]&&v!=='')p.set(k,k==='major'?'1':v);history.replaceState(null,'',p.size?`?${p}`:location.pathname);syncControls();render();}
function setup(){const unique=k=>[...new Set(doc.events.map(e=>e[k]).filter(Boolean))].sort();
 for(const [key,label]of [['style','All styles'],['level','All levels'],['country','All countries'],['region','All regions'],['organization','All organizations'],['year','All years'],['kind','All event formats']])options(`ev-${key}`,unique(key),LABELS[key],label);
 options('ev-type',[...new Set(doc.events.flatMap(e=>e.eventTypes||[]))].sort(),LABELS.type,'All disciplines');
 for(const key of ['style','level','country','type','year','region','organization','kind'])$(`ev-${key}`).addEventListener('change',e=>set({[key]:e.target.value}));
 $('ev-month').addEventListener('change',e=>set({month:e.target.value}));$('ev-major').addEventListener('change',e=>set({major:e.target.checked}));$('ev-q').addEventListener('input',e=>set({q:e.target.value}));
 $('ev-this-month').addEventListener('click',()=>set({month:currentMonth()}));$('event-filters').addEventListener('submit',e=>e.preventDefault());$('event-filters').addEventListener('reset',e=>{e.preventDefault();set({...DEFAULT_FILTERS});});
 document.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',()=>set({status:b.dataset.status})));
 $('events-reviewed').textContent=`Official sources last checked ${fmt(doc.lastReviewed)}. Scheduled updates: Sundays at 7 p.m. Eastern.`;
 $('events-coverage').textContent=doc.note;
 $('events-overview').textContent=`${doc.events.length} official-source listings · ${new Set(doc.events.filter(e=>e.countryCode).map(e=>e.countryCode)).size} countries · ${doc.years.join('–')}`;
 if(['region','kind','style','level','type','month'].some(k=>filters[k]!==DEFAULT_FILTERS[k]))document.querySelector('.event-advanced').open=true;
 syncControls();render();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)ticker.stop();else render();});
loadInto($('events-list'),'/data/competitions.json',{title:'Event listings could not be loaded.',validate:validateEvents,onData:d=>{doc=d;setup();}});
