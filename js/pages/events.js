/* Sourced worldwide events, with independent URL-backed filters.
   Re-renders (filters, the one-minute status ticker, returning to the tab,
   Back/Forward) reuse unchanged cards and option nodes, so keyboard focus and
   an open select survive; focus moves only after an explicit Show more. */
import {DEFAULT_FILTERS,filterEvents,eventStatus,registrationState,createTicker,needsTicking,currentMonth,eventStatuses,eventFacetCounts,eventFiltersFromParams,eventFiltersToParams} from '../lib/events.js';
import {validateEvents} from '../lib/validators.js';
import {loadInto,showEmpty} from '../lib/data.js';
import {h,replaceChildren,safeHref} from '../lib/dom.js';
import {icon} from '../lib/icons.js';
import {renderFilterChips} from '../lib/filter-chips.js';
import {canExportEvent,downloadEventCalendar} from '../lib/event-calendar.js';
import {keepFocus,findKey,focusTarget} from '../lib/focus-keep.js';
const $=id=>document.getElementById(id);
const LABELS={style:{wt:'WT / Kukkiwon',itf:'ITF',ata:'ATA',open:'Open / all styles'},level:{local:'Local / regional',national:'National',international:'International',unspecified:'Level not specified'},type:{poomsae:'Poomsae',patterns:'Patterns / tul',sparring:'Sparring',para:'Para taekwondo',breaking:'Breaking','special-techniques':'Special techniques','power-test':'Power test'}};
const STATUS={past:'Past',ongoing:'Happening now',upcoming:'Upcoming',announced:'Dates to be announced',cancelled:'Canceled',postponed:'Postponed'};
const SELECT_KEYS=['year','organization','country','region','kind','style','level','type'];
const ALL_LABELS={year:'All years',organization:'All organizations',country:'All countries',region:'All regions',kind:'All event formats',style:'All styles',level:'All levels',type:'All disciplines'};
const FIELD_LABELS={year:'Year',organization:'Organization',country:'Country',region:'Region',kind:'Format',style:'Style',level:'Level',type:'Discipline',month:'Month',q:'Search',status:'Dates',major:'Major championships only'};
let filters={...DEFAULT_FILTERS},limit=24,doc=null,searchTimer;
const ticker=createTicker(()=>render(),{intervalMs:60000});
const fmt=iso=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${iso}T00:00:00Z`));
function flag(code){return /^[A-Z]{2}$/.test(code||'')?[...code].map(c=>String.fromCodePoint(c.charCodeAt(0)+127397)).join(''):'';}
/** Update a select in place: option nodes are only created when the set of
 *  values changes; otherwise only changed labels/disabled flags are written,
 *  so an open list or keyboard position is not disturbed. */
function options(key,values,counts) {
 const select=$(`ev-${key}`);
 const wanted=[{value:'all',label:`${ALL_LABELS[key]} (${counts.all})`,disabled:false},...values.map(value=>({
  value:String(value),label:`${LABELS[key]?.[value]||value} (${counts[value]||0})`,disabled:!counts[value]&&String(filters[key])!==String(value),
 }))];
 const current=[...select.options];
 if(current.length!==wanted.length||current.some((o,i)=>o.value!==wanted[i].value)){
  replaceChildren(select,...wanted.map(w=>h('option',{value:w.value,disabled:w.disabled},w.label)));
 }else current.forEach((o,i)=>{
  if(o.textContent!==wanted[i].label)o.textContent=wanted[i].label;
  if(o.disabled!==wanted[i].disabled)o.disabled=wanted[i].disabled;
 });
 if(select.value!==String(filters[key]))select.value=String(filters[key]);
}
function card(ev,now){
 const status=eventStatus(ev,now),href=safeHref(ev.eventUrl||ev.source),source=safeHref(ev.source);
 const dates=ev.start?(ev.start===ev.end?fmt(ev.start):`${fmt(ev.start)} – ${fmt(ev.end)}`):`${ev.year} · dates to be announced`;
 return h('article',{class:`event-card ${status}${ev.major?' major-event':''}`,'data-event':ev.id},
  h('div',{class:'strip','aria-hidden':'true'}),h('div',{class:'event-body'},
   h('div',{class:'example-meta'},h('span',{class:`badge ${status==='past'?'badge-muted':'badge-navy'}`},STATUS[status]),
    ev.major?h('span',{class:'badge badge-gold'},icon('trophy'),' Major event'):null,
    h('span',{class:'badge badge-muted'},ev.organization||LABELS.style[ev.style]),
    h('span',{class:'badge badge-muted'},ev.organiserClass||LABELS.level[ev.level]||ev.level)),
   h('h3',{'data-fk':href?null:`event:${ev.id}:title`},href?h('a',{href,target:'_blank',rel:'noopener noreferrer','data-fk':`event:${ev.id}:title`},ev.name):ev.name),
   h('p',{class:'event-location'},h('span',{'aria-hidden':'true'},`${flag(ev.countryCode)} `),ev.location),
   h('dl',{class:'event-meta'},h('div',{},h('dt',{},'Dates'),h('dd',{},dates)),h('div',{},h('dt',{},'Events'),h('dd',{},(ev.eventTypes||[]).map(x=>LABELS.type[x]||x).join(' · ')||'See organizer'))),
   ev.notes?h('p',{class:'event-notes'},ev.notes):null,
   h('div',{class:'event-footer'},h('span',{},`Checked ${fmt(ev.lastChecked)}`),
    h('div',{class:'event-links'},source&&source!==href?h('a',{href:source,target:'_blank',rel:'noopener noreferrer',class:'text-link','data-fk':`event:${ev.id}:source`},'Calendar source'):null,
     canExportEvent(ev)?h('button',{type:'button',class:'btn btn-secondary btn-sm','data-fk':`event:${ev.id}:calendar`,'aria-label':`Add ${ev.name} to calendar`,title:'Download an all-day calendar entry. Saved copies do not update automatically.',on:{click:()=>downloadEventCalendar(ev)}},'Add to calendar'):null,
     href?h('a',{href,target:'_blank',rel:'noopener noreferrer',class:'btn btn-secondary btn-sm','data-fk':`event:${ev.id}:official`},'Official event page ↗'):null)),
   registrationState(ev,now)==='registration-closed'?h('p',{class:'event-notes'},'The organizer’s published registration deadline has passed.'):null));
}
/* Cards are cached per event and reused while their visible state (status and
   registration) is unchanged; event data does not change after loading. */
const cards=new Map();
function cachedCard(ev,now){
 const signature=`${eventStatus(ev,now)}|${registrationState(ev,now)}`,hit=cards.get(ev.id);
 if(hit&&hit.signature===signature)return hit.node;
 const node=card(ev,now);cards.set(ev.id,{signature,node});return node;
}
const titleOf=node=>findKey(node,`event:${node.dataset.event}:title`);
/** Make `container` hold exactly `nodes`, in order, without moving nodes that
 *  are already in place (moving a focused node would drop focus). */
function reconcile(container,nodes){
 const keep=new Set(nodes);
 for(const child of [...container.children])if(!keep.has(child))child.remove();
 nodes.forEach((node,i)=>{if(container.children[i]!==node)container.insertBefore(node,container.children[i]||null);});
}
let more=null;
function moreButton(remaining){
 more||=h('button',{type:'button',class:'btn btn-secondary','data-fk':'events:more',on:{click:showMore}});
 more.textContent=`Show more (${remaining} remaining)`;
 return more;
}
/** Explicit Show more: focus the first newly shown card's title, without scrolling. */
function showMore(){
 const container=$('events-list'),before=[...container.children].filter(n=>n.dataset?.event).length;
 limit+=24;render();
 const first=[...container.children].filter(n=>n.dataset?.event)[before];
 if(first)focusTarget(titleOf(first));
}
function syncInputs() {
 $('ev-month').value=filters.month; $('ev-q').value=filters.q; $('ev-major').checked=filters.major;
}
function render() {
 if(!doc)return;
 const now=new Date(),statuses=eventStatuses(doc.events,now),list=filterEvents(doc.events,filters,now,statuses);
 const values=key=>[...new Set(key==='type'?doc.events.flatMap(e=>e.eventTypes||[]):doc.events.map(e=>e[key]).filter(Boolean))].sort();
 for(const key of SELECT_KEYS) options(key,values(key),eventFacetCounts(doc.events,filters,key,now,statuses));
 const statusCounts=eventFacetCounts(doc.events,filters,'status',now,statuses);
 document.querySelectorAll('[data-status]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.dataset.status===filters.status));
  const key=button.dataset.status,label={upcoming:'Upcoming',past:'Past events',announced:'Dates TBA',all:'All dates'}[key];
  button.textContent=`${label} (${statusCounts[key]||0})`;
 });
 const selections=Object.entries(filters).filter(([key,value])=>value!==DEFAULT_FILTERS[key]&&value!=='').map(([key,value])=>({
  key,label:key==='major'?FIELD_LABELS[key]:`${FIELD_LABELS[key]}: ${key==='status'?{all:'All dates',past:'Past events',announced:'Dates TBA'}[value]:LABELS[key]?.[value]||value}`,
 }));
 renderFilterChips($('events-active-filters'),selections,key=>set({[key]:DEFAULT_FILTERS[key]}),()=>set({...DEFAULT_FILTERS}));
 const advanced=['region','kind','style','level','type','month'].filter(key=>filters[key]!==DEFAULT_FILTERS[key]).length;
 $('event-filter-count').textContent=advanced?`(${advanced} active)`:'';
 $('events-summary').textContent=`Showing ${Math.min(limit,list.length)} of ${list.length} matching event${list.length===1?'':'s'} · ${doc.events.length} listed in total.`;
 const container=$('events-list'),previous=[...container.children].filter(n=>n.dataset?.event);
 // Both branches run inside keepFocus: if the focused card leaves the list (a
 // status change under a filter, even down to no results), focus moves to the
 // card now at its position, else to the results summary. Focus elsewhere
 // (search, filters) is never moved.
 keepFocus(container,()=>{
  if(list.length)reconcile(container,[...list.slice(0,limit).map(e=>cachedCard(e,now)),...(list.length>limit?[moreButton(list.length-limit)]:[])]);
  else showEmpty(container,'No events match this combination. Remove a selection above or try all dates.',
   h('div',{class:'empty-actions'},filters.status!=='all'?h('button',{type:'button',class:'btn btn-secondary btn-sm','data-fk':'events:all-dates',on:{click:()=>set({status:'all'})}},'Include all dates'):null,
    h('button',{type:'button',class:'btn btn-secondary btn-sm','data-fk':'events:clear',on:{click:()=>set({...DEFAULT_FILTERS})}},'Clear search and filters')));
 },{fallback:saved=>{
  const id=saved.key.split(':')[1],at=Math.max(0,previous.findIndex(n=>n.dataset.event===id));
  const present=[...container.children].filter(n=>n.dataset?.event);
  const near=present[Math.min(at,present.length-1)];
  return near?titleOf(near):$('events-summary');
 }});
 if(needsTicking(doc.events,now))ticker.start();else ticker.stop();
}
function set(patch,{replaceUrl=false}={}) {
 clearTimeout(searchTimer); limit=24; filters={...filters,q:$('ev-q').value,...patch};
 const params=eventFiltersToParams(filters),url=params.size?`?${params}`:location.pathname;
 if(location.search!==(params.size?`?${params}`:''))history[replaceUrl?'replaceState':'pushState'](null,'',url);
 syncInputs();render();
}
function setup() {
 filters=eventFiltersFromParams(location.search,doc.events);
 for(const key of SELECT_KEYS)$(`ev-${key}`).addEventListener('change',e=>set({[key]:e.target.value}));
 $('ev-month').addEventListener('change',e=>set({month:e.target.value}));
 $('ev-major').addEventListener('change',e=>set({major:e.target.checked}));
 $('ev-q').addEventListener('input',e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>set({q:e.target.value},{replaceUrl:true}),150);});
 $('ev-this-month').addEventListener('click',()=>set({month:currentMonth(),year:'all',status:'all'}));
 $('event-filters').addEventListener('submit',e=>{e.preventDefault();set({q:$('ev-q').value});});
 $('event-filters').addEventListener('reset',e=>{e.preventDefault();set({...DEFAULT_FILTERS});});
 document.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',()=>set({status:b.dataset.status})));
 window.addEventListener('popstate',()=>{clearTimeout(searchTimer);limit=24;filters=eventFiltersFromParams(location.search,doc.events);syncInputs();render();});
 $('events-reviewed').textContent=`Official sources last checked ${fmt(doc.lastReviewed)}. Scheduled updates: Sundays at 7 p.m. Eastern.`;
 $('events-coverage').textContent=doc.note;
 $('events-overview').textContent=`${doc.events.length} official-source listings · ${new Set(doc.events.filter(e=>e.countryCode).map(e=>e.countryCode)).size} countries · ${doc.years.join('–')}`;
 if(['region','kind','style','level','type','month'].some(k=>filters[k]!==DEFAULT_FILTERS[k]))document.querySelector('.event-advanced').open=true;
 syncInputs();render();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)ticker.stop();else render();});
loadInto($('events-list'),'/data/competitions.json',{title:'Event listings could not be loaded.',validate:validateEvents,onData:d=>{doc=d;setup();}});
