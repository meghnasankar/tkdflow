/* First-tournament guide: context URLs, scoped content, browser-only ticks,
   storage failures, print, sources, no-JS usefulness and no account use. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ORGS,DISCIPLINES,DEFAULT_CONTEXT,STORAGE_KEY,parseContext,contextQuery,contextKey,contextLabel,parseScope,applies,eventsHref,progressText,createChecklistStore,storageMessage} from '../js/lib/tournament-guide.js';
import {validateCommunity} from '../js/lib/validators.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('first-tournament.html');
const main=html.slice(html.indexOf('<main'),html.indexOf('</main>'));
const items=[...main.matchAll(/<li data-item="([^"]+)"([^>]*)>([\s\S]*?)<\/li>/g)].map(([,id,attrs,body])=>({
 id,orgs:parseScope(attrs.match(/data-org="([^"]*)"/)?.[1]),disciplines:parseScope(attrs.match(/data-discipline="([^"]*)"/)?.[1]),body}));
const CONTEXTS=Object.keys(ORGS).flatMap(org=>Object.keys(DISCIPLINES).map(discipline=>({org,discipline})));
const OFFICIAL=/^https:\/\/(www\.usatkd\.org|aausports\.org|application\.aausports\.org|image\.aausports\.org|www\.aautkdaz\.com|americantaekwondounited\.com|www\.joinatu\.com|joinatu\.online|storage\.googleapis\.com\/mailerlite-uploads-prod\/1358458\/)/;

function memoryStorage(initial=null){
 const data=new Map(initial===null?[]:[[STORAGE_KEY,initial]]);
 return {data,getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>{data.set(k,String(v));},removeItem:k=>data.delete(k)};
}

test('context comes from shareable query parameters, with safe defaults',()=>{
 assert.deepEqual(parseContext(''),DEFAULT_CONTEXT);
 assert.deepEqual(parseContext('?org=aau&discipline=sparring'),{org:'aau',discipline:'sparring'});
 assert.deepEqual(parseContext('?org=ATA&discipline=poomsae'),DEFAULT_CONTEXT,'unknown values fall back');
 assert.deepEqual(parseContext('?org=__proto__&discipline=constructor'),DEFAULT_CONTEXT);
 for(const ctx of CONTEXTS)assert.deepEqual(parseContext(contextQuery(ctx)),ctx,`round trip ${contextKey(ctx)}`);
 assert.equal(contextQuery(DEFAULT_CONTEXT),'','defaults keep a clean URL');
 assert.equal(contextQuery({org:'atu',discipline:'forms'}),'?org=atu&discipline=forms');
 assert.equal(contextKey({org:'usatkd',discipline:'sparring'}),'usatkd:sparring');
 assert.equal(contextLabel({org:'atu',discipline:'both'}),'American Taekwondo United · Forms and sparring');
 assert.equal(eventsHref('usatkd'),'/competitions.html?organization=USATKD&status=all');
 assert.equal(eventsHref('all'),'/competitions.html');
});

test('scope matching shows general items everywhere and specific items only in their context',()=>{
 assert.equal(applies({},{org:'aau',discipline:'forms'}),true);
 assert.equal(applies({orgs:['usatkd']},{org:'aau',discipline:'both'}),false);
 assert.equal(applies({orgs:['usatkd']},{org:'all',discipline:'both'}),true,'"all organizations" shows every organization');
 assert.equal(applies({disciplines:['sparring']},{org:'all',discipline:'forms'}),false);
 assert.equal(applies({orgs:['atu'],disciplines:['sparring']},{org:'atu',discipline:'sparring'}),true);
 assert.deepEqual(parseScope(' usatkd  aau '),['usatkd','aau']);
});

test('ticks are kept separately for each organization and discipline view',()=>{
 const storage=memoryStorage(),known=new Set(items.map(i=>i.id));
 const store=createChecklistStore(storage,{known});
 assert.equal(store.set('usatkd:sparring',['pay-equipment','choose-packet']),true);
 assert.equal(store.set('aau:forms',['pay-forms']),true);
 const again=createChecklistStore(storage,{known});
 assert.deepEqual([...again.get('usatkd:sparring')].sort(),['choose-packet','pay-equipment']);
 assert.deepEqual([...again.get('aau:forms')],['pay-forms']);
 assert.equal(again.get('atu:both').size,0,'other views are unaffected');
 again.set('usatkd:sparring',[]);
 assert.equal(createChecklistStore(storage,{known}).get('usatkd:sparring').size,0);
 assert.deepEqual(Object.keys(JSON.parse(storage.data.get(STORAGE_KEY)).contexts),['aau:forms'],'empty views are removed');
 assert.equal(store.set('nope:forms',['pay-forms']),false,'unknown contexts are refused');
 const filtered=createChecklistStore(memoryStorage(),{known});
 filtered.set('all:both',['pay-forms','not-an-item','<img>','pay-forms']);
 assert.deepEqual([...filtered.get('all:both')],['pay-forms'],'unknown, unsafe and duplicate IDs are dropped');
 assert.doesNotMatch(storage.data.get(STORAGE_KEY),/@|name|email|age|weight|birth/i,'only item IDs are stored');
});

test('blocked, failing and corrupt storage are reported honestly and never crash',()=>{
 const blocked=createChecklistStore(()=>{throw new DOMException('denied','SecurityError');});
 assert.equal(blocked.state,'unavailable');
 assert.equal(blocked.set('all:both',['choose-packet']),false,'kept in memory only');
 assert.deepEqual([...blocked.get('all:both')],['choose-packet'],'the checklist still works this visit');
 assert.match(storageMessage(blocked.state),/not saving ticks/);
 const quota=memoryStorage();quota.setItem=()=>{throw new DOMException('full','QuotaExceededError');};
 const full=createChecklistStore(quota);
 assert.equal(full.set('all:both',['choose-packet']),false);assert.equal(full.state,'unavailable');
 for(const bad of ['{not json','{"version":2,"contexts":{}}','{"version":1,"contexts":[]}','null','"text"'])
  {const s=createChecklistStore(memoryStorage(bad));assert.equal(s.state,'corrupt',bad);assert.equal(s.get('all:both').size,0);}
 const corruptStorage=memoryStorage('{not json'),corrupt=createChecklistStore(corruptStorage);
 assert.equal(corrupt.state,'corrupt');assert.equal(corruptStorage.data.get(STORAGE_KEY),'{not json','unreadable data is not overwritten until a tick changes');
 assert.match(storageMessage('corrupt'),/could not be read/);
 corrupt.set('all:both',['choose-packet']);assert.equal(corrupt.state,'ok');assert.equal(JSON.parse(corruptStorage.data.get(STORAGE_KEY)).version,1);
 const mixed=createChecklistStore(memoryStorage(JSON.stringify({version:1,contexts:{'all:both':['choose-packet',5,null],'evil:key':['x'],'aau:sparring':'nope'}})));
 assert.equal(mixed.state,'ok');assert.deepEqual([...mixed.get('all:both')],['choose-packet']);assert.equal(mixed.get('aau:sparring').size,0);
 const none=createChecklistStore(()=>null);assert.equal(none.state,'unavailable');
});

test('progress is a concise count, and the reminder note appears once beside it',()=>{
 assert.equal(progressText(3,24,{org:'aau',discipline:'sparring'}),'3 of 24 items checked · AAU Taekwondo · Sparring');
 assert.equal(progressText(1,1,DEFAULT_CONTEXT),'1 of 1 item checked · All three organizations · Forms and sparring');
 for(const n of [0,5,24])assert.doesNotMatch(progressText(n,24,DEFAULT_CONTEXT),/ready|eligib|complete|all set|qualified|confirm/i);
 const tools=main.slice(main.indexOf('id="ft-tools"'),main.indexOf('<section class="ft-stage"'));
 assert.match(tools,/id="ft-progress"/);
 assert.equal((main.match(/do not confirm eligibility, registration or readiness/g)||[]).length,1,'the explanation is shown once');
 assert.match(tools,/do not confirm eligibility, registration or readiness/,'next to the count');
 assert.doesNotMatch(read('js/pages/first-tournament.js'),/eligib|readiness/,'the controller does not add a second copy');
});

test('checklist items are unique, correctly scoped and non-empty in every view',()=>{
 assert.ok(items.length>=40);
 assert.equal(new Set(items.map(i=>i.id)).size,items.length,'unique item IDs');
 for(const i of items){
  assert.match(i.id,/^[a-z0-9][a-z0-9-]{1,59}$/);
  for(const o of i.orgs)assert.ok(o!=='all'&&Object.hasOwn(ORGS,o),`${i.id}: org ${o}`);
  for(const d of i.disciplines)assert.ok(d!=='both'&&Object.hasOwn(DISCIPLINES,d),`${i.id}: discipline ${d}`);
  // Structure: checkbox, then ONE block label (inline badge + text), then an optional source link.
  const expected=new RegExp(`^<input type="checkbox" id="ft-i-${i.id}"><label for="ft-i-${i.id}" class="ft-item-label">([\\s\\S]*?)<\\/label>( <a class="ft-source" href="[^"]+">[^<]+<\\/a>)?$`);
  const parts=i.body.match(expected);
  assert.ok(parts,`${i.id}: checkbox + label + optional source, in that order`);
  const label=parts[1];
  assert.doesNotMatch(label,/<(input|a|div|p|ul|label)\b/,`${i.id}: the label holds only inline text and an optional badge`);
  assert.match(label.replace(/<span class="badge badge-navy">Organizer rule<\/span> /,''),/^[^<]{12,}$/,`${i.id}: the label's text is plain and readable`);
  if(/Organizer rule/.test(label))assert.match(label,/^<span class="badge badge-navy">Organizer rule<\/span> \S/,`${i.id}: the badge is inline at the start of the label`);
 }
 const stages=[...main.matchAll(/<section class="ft-stage"[\s\S]*?<\/section>/g)].map(m=>m[0]);
 assert.equal(stages.length,5);
 for(const ctx of CONTEXTS)for(const [n,stage] of stages.entries()){
  const ids=[...stage.matchAll(/data-item="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(items.filter(i=>ids.includes(i.id)).some(i=>applies(i,ctx)),`stage ${n+1} has items for ${contextKey(ctx)}`);
 }
 for(const org of ['usatkd','aau','atu'])assert.ok(items.some(i=>i.orgs.includes(org)),`${org} has specific items`);
 for(const d of ['forms','sparring'])assert.ok(items.some(i=>i.disciplines.includes(d)),`${d} has specific items`);
});

test('organizer-rule badges and external links point to dated official sources',()=>{
 for(const i of items.filter(i=>/Organizer rule/.test(i.body)))assert.match(i.body,/<a class="ft-source" href="https:\/\/www\.usatkd\.org\//,`${i.id} cites its source`);
 for(const i of items.filter(i=>/ft-source/.test(i.body))){const href=i.body.match(/href="([^"]+)"/)[1];assert.match(href,OFFICIAL,`${i.id}: ${href}`);}
 const external=[...main.matchAll(/href="(https?:[^"]+)"/g)].map(m=>m[1]);
 for(const href of external){assert.match(href,/^https:/,href);assert.match(href,OFFICIAL,`only official organizer sources: ${href}`);}
 const sources=main.slice(main.indexOf('id="ft-sources"'));
 for(const href of new Set(external))assert.ok(sources.includes(`href="${href}"`),`listed in Sources: ${href}`);
 assert.match(sources,/last checked on 17 November 2026/);
 assert.match(sources,/updated 27 February 2026/);assert.match(sources,/not a 2027 rulebook/);
 assert.match(sources,/historical 2026 example/);
});

test('content keeps organizations distinct and avoids unsupported or universal claims',()=>{
 const text=main.replace(/<[^>]+>/g,' ');
 assert.match(text,/not\s+the ATA/);assert.match(text,/not\s+the Asian Taekwondo Union/);
 assert.match(text,/do not carry over to another organization’s events/);
 assert.match(text,/a spectator ticket is not an athlete entry or a coach pass/);
 assert.match(text,/current online coach certification and an event coaching pass/);
 assert.match(text,/Ask your instructor whether a local or open event suits your first tournament\./);
 assert.doesNotMatch(text,/Most students start|most welcoming/);
 assert.match(text,/head protector, chest protector, mouthguard, forearm and shin\/instep guards and groin protection; electronic scoring socks or gloves only where the event requires them/);
 assert.doesNotMatch(text,/\b(Adidas|Daedo|KP&P|KPNP|Mooto|Century|Macho|Hayabusa|Proforce)\b/i,'no brand claims');
 assert.doesNotMatch(text,/\$\s?\d|USD\s?\d|\b\d+\s?dollars/i,'no fees');
 assert.doesNotMatch(text,/weight[- ]cut|dehydrat|diagnos|concussion|treatment/i,'no medical or weight-cutting advice');
 assert.doesNotMatch(text,/you (are|will be) (eligible|qualified|ready)/i);
 assert.equal((text.match(/current packet|event’s official packet/g)||[]).length<=3,true,'one clear packet note, not repeated cautions');
 assert.match(text,/Exact 2027 dates and locations were still to be announced/);
 assert.match(text,/No official 2027 ATU national championship announcement was found/);
});

test('the page is useful without JavaScript and filters/print are enhancements',()=>{
 assert.match(html,/<form class="ft-context" id="ft-context" action="\/first-tournament\.html" method="get" hidden>/,'selector appears only when JavaScript can apply it');
 assert.match(html,/<div class="ft-tools" id="ft-tools" hidden>/);
 assert.match(html,/<noscript><p class="field-help">All organizations and both disciplines are shown\./);
 for(const id of ['ft-levels','ft-organizations','ft-disciplines','ft-checklist','ft-questions','ft-glossary','ft-sources'])assert.match(main,new RegExp(`id="${id}"`));
 assert.equal((main.match(/<dt>/g)||[]).length>=13+3,true,'glossary and event levels are static content');
 assert.deepEqual([...main.matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]),[...Object.keys(ORGS),...Object.keys(DISCIPLINES)]);
 assert.match(main,/<label for="ft-org">Organization<\/label>/);assert.match(main,/<label for="ft-discipline">Discipline<\/label>/);
 const css=read('css/tournament.css'),print=css.slice(css.indexOf('@media print'));
 for(const hiddenPart of ['header','footer','.page-hero','.ft-context','.ft-actions','#ft-glossary'])assert.ok(print.includes(hiddenPart),`print hides ${hiddenPart}`);
 assert.match(print,/\[hidden\] \{ display: none !important; \}/,'print shows only the chosen context');
 assert.match(print,/#ft-sources a\[href\^="http"\]::after \{ content: " \(" attr\(href\) "\)"/,'printed source links show their address');
 assert.match(main,/id="ft-print-context">Showing guidance for all three organizations, forms and sparring\./);
});

test('the guide uses no account, personal data, network or cloud service',()=>{
 const page=read('js/pages/first-tournament.js'),lib=read('js/lib/tournament-guide.js');
 for(const src of [page,lib]){
  assert.doesNotMatch(src,/account-service|getAccountService|supabase|fetch\(|XMLHttpRequest|sendBeacon|auth\.|sessionStorage/);
  assert.doesNotMatch(src,/innerHTML|insertAdjacentHTML|eval\(/);
 }
 assert.deepEqual([...page.matchAll(/from '([^']+)'/g)].map(m=>m[1]),['../lib/tournament-guide.js']);
 assert.match(page,/history\.replaceState\(null,'',`\$\{location\.pathname\}\$\{contextQuery\(ctx\)\}\$\{location\.hash\}`\)/,'shareable URL without reloading');
 assert.match(page,/window\.addEventListener\('popstate'/);
 assert.match(page,/addEventListener\('storage'/,'other tabs stay in sync');
 assert.match(page,/\$\('ft-print'\)\.addEventListener\('click',\(\)=>window\.print\(\)\)/);
 assert.match(page,/ticks are not shared/,'copied links share the view, not personal ticks');
 assert.doesNotMatch(html,/<input(?![^>]*type="checkbox")[^>]*>/,'no text fields: no personal data is collected');
});

test('the guide is discoverable from Events, Community resources and the footer',()=>{
 const pages=JSON.parse(read('layout/pages.json')).pages,page=pages.find(p=>p.file==='first-tournament.html');
 assert.equal(page.sitemap,true);assert.equal(page.key,'events');assert.ok(!page.noindex);
 assert.match(read('sitemap.xml'),/first-tournament\.html/);
 assert.match(read('competitions.html'),/<p class="events-guide-link">First tournament\? <a href="\/first-tournament\.html">/);
 assert.match(read('competitions.html'),/<p id="events-overview">/,'the events summary element is unchanged');
 const community=JSON.parse(read('data/community.json'));
 assert.equal(validateCommunity(community),null);
 const entry=community.posts.find(p=>p.id==='first-tournament');
 assert.equal(entry.url,'first-tournament.html');assert.equal(entry.kind,'Competition guide');
 assert.match(read('js/pages/community.js'),/'Competition guide':'trophy'/);
 assert.match(read('layout/footer.html'),/href="\/first-tournament\.html">First tournament guide</);
});

test('checklist rows lay out as checkbox column + label column, so badges never wrap letter by letter',()=>{
 const css=read('css/tournament.css');
 const rule=sel=>css.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} \\{([^}]*)\\}`))?.[1]||'';
 assert.match(rule('.ft-items li'),/display: grid; grid-template-columns: 20px minmax\(0, 1fr\)/);
 assert.match(rule('.ft-items input'),/grid-column: 1/);
 assert.match(rule('.ft-item-label'),/grid-column: 2; display: block; min-width: 0/);
 assert.match(rule('.ft-item-label .badge'),/display: inline-block; white-space: nowrap/);
 assert.match(rule('.ft-source'),/grid-column: 2/);
 assert.doesNotMatch(css,/\.ft-items label \{[^}]*display: flex/,'no flex label that would squeeze the badge');
 const sourced=items.filter(i=>/Organizer rule/.test(i.body));
 assert.ok(sourced.some(i=>i.id==='usat-sport80')&&sourced.some(i=>i.id==='usat-safesport'),'the items seen in QA are covered');
});
