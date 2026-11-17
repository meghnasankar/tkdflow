import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  zonedToUtc, eventStatus, registrationState, filterEvents, overlapsMonth, currentMonth, countdownParts, createTicker, eventRecordProblem,
  needsTicking, isCalendarDate, eventFacetCounts, eventStatuses, eventFiltersFromParams, eventFiltersToParams,
} from '../js/lib/events.js';
import { validateEvents } from '../js/lib/validators.js';

const data = JSON.parse(readFileSync(new URL('../data/competitions.json', import.meta.url), 'utf8'));
const REVIEW_DATE = new Date('2026-11-15T12:00:00Z');
const ev = (over) => ({ id: 'x', name: 'Test Open', level: 'local', style: 'wt', eventTypes: ['poomsae'], start: '2026-12-05', end: '2026-12-06',
  timezone: 'America/New_York', location: 'Boston, USA', country: 'United States', source: null, lastChecked: null, ...over });

test('shipped listings have official sources, dates and no hard-coded registration claims', () => {
  for (const e of data.events) assert.equal(eventRecordProblem(e), null);
  assert.ok(data.lastReviewed);
});

test('published catalogue spans both requested years with official links and major national events', () => {
  assert.ok(data.events.length >= 400);
  assert.equal(new Set(data.events.map(e=>e.id)).size, data.events.length);
  for (const e of data.events) {
    assert.ok([2026,2027].includes(e.year));assert.match(e.source,/^https:\/\//);assert.match(e.eventUrl,/^https:\/\//);assert.ok(isCalendarDate(e.lastChecked));
  }
  for(const org of ['AAU','USATKD','ATU'])assert.ok(data.events.some(e=>e.organization===org&&e.major),org);
  assert.ok(filterEvents(data.events,{status:'upcoming'},REVIEW_DATE).length>0);
  assert.ok(filterEvents(data.events,{status:'past'},REVIEW_DATE).length>0);
});

test('unannounced dates stay undated and compose with year, organization, region and major filters',()=>{
 const tba=ev({id:'tba',start:null,end:null,year:2027,dateStatus:'tba',organization:'AAU',region:'North America',major:true,source:'https://aausports.org/taekwondo/future-dates/',lastChecked:'2026-11-16'});
 assert.equal(eventRecordProblem(tba),null);assert.equal(eventStatus(tba,REVIEW_DATE),'announced');assert.equal(overlapsMonth(tba,'2027-07'),false);
 assert.deepEqual(filterEvents([tba],{year:'2027',organization:'AAU',region:'North America',major:true},REVIEW_DATE),[tba]);
 assert.equal(filterEvents([tba],{year:'2026'},REVIEW_DATE).length,0);
 assert.equal(filterEvents([tba],{month:'2027-07'},REVIEW_DATE).length,0);
 assert.equal(needsTicking([tba],REVIEW_DATE),false);
 const cancelled=ev({status:'cancelled'});assert.equal(filterEvents([cancelled],{},REVIEW_DATE).length,0);assert.equal(filterEvents([cancelled],{status:'all'},REVIEW_DATE).length,1);
});

test('time zones: an event ends at local midnight, not UTC midnight', () => {
  assert.equal(zonedToUtc('2026-07-01', '00:00', 'Asia/Seoul').toISOString(), '2026-06-30T15:00:00.000Z');
  assert.equal(zonedToUtc('2026-01-15', '00:00', 'America/New_York').toISOString(), '2026-01-15T05:00:00.000Z');
  assert.equal(zonedToUtc('2026-07-15', '00:00', 'America/New_York').toISOString(), '2026-07-15T04:00:00.000Z'); // DST
  const e = ev({ start: '2026-12-05', end: '2026-12-06', timezone: 'Pacific/Auckland' });
  assert.equal(eventStatus(e, new Date('2026-12-06T10:59:00Z')), 'ongoing'); // 23:59 local on the 6th
  assert.equal(eventStatus(e, new Date('2026-12-06T11:00:00Z')), 'past');     // 00:00 local on the 7th
});

test('status crosses from upcoming → ongoing → past', () => {
  const e = ev();
  assert.equal(eventStatus(e, new Date('2026-12-05T04:59:00Z')), 'upcoming');
  assert.equal(eventStatus(e, new Date('2026-12-05T05:00:00Z')), 'ongoing');
  assert.equal(eventStatus(e, new Date('2026-12-07T05:00:00Z')), 'past');
});

test('registration needs a verified source and respects its deadline', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  assert.equal(registrationState(ev(), now), 'unverified');
  const sourced = ev({ source: 'https://example.org/event', lastChecked: '2026-11-15', registrationDeadline: '2026-11-25' });
  assert.equal(registrationState(sourced, now), 'see-organiser');
  assert.equal(registrationState(sourced, new Date('2026-11-27T12:00:00Z')), 'registration-closed');
  assert.match(eventRecordProblem(ev({ source: 'https://example.org' })), /lastChecked/);
  assert.match(eventRecordProblem(ev({ source: 'javascript:alert(1)', lastChecked: '2026-11-15' })), /https/);
  assert.match(eventRecordProblem(ev({ contact: 'a@b.c' })), /verified source/);
});

test('filters are independent and intersect', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const list = [
    ev({ id: 'a', style: 'wt', country: 'United States', eventTypes: ['poomsae'] }),
    ev({ id: 'b', style: 'itf', country: 'United States', eventTypes: ['sparring'] }),
    ev({ id: 'c', style: 'wt', country: 'Canada', location: 'Toronto, Canada', eventTypes: ['sparring'], start: '2027-01-10', end: '2027-01-10' }),
  ];
  const ids = (f) => filterEvents(list, f, now).map((e) => e.id);
  assert.deepEqual(ids({ country: 'United States' }), ['a', 'b']);
  assert.deepEqual(ids({ country: 'United States', style: 'wt' }), ['a']);
  assert.deepEqual(ids({ type: 'sparring' }), ['b', 'c']);
  assert.deepEqual(ids({ type: 'sparring', style: 'wt' }), ['c']);
  assert.deepEqual(ids({ month: '2027-01' }), ['c']);
  assert.deepEqual(ids({ q: 'boston' }), ['a', 'b']);
  assert.deepEqual(ids({ country: 'United States', type: 'poomsae', style: 'itf' }), []);
});

test('month overlap and current month', () => {
  assert.equal(overlapsMonth(ev({ start: '2026-11-29', end: '2026-12-02' }), '2026-12'), true);
  assert.equal(overlapsMonth(ev({ start: '2026-11-29', end: '2026-11-30' }), '2026-12'), false);
  assert.equal(currentMonth(new Date(2026, 10, 15)), '2026-11');
});

test('countdown ends with null instead of a frozen value', () => {
  const target = new Date('2026-12-01T00:00:00Z');
  assert.deepEqual(countdownParts(target, new Date('2026-11-29T22:30:00Z')), { days: 1, hours: 1, minutes: 30 });
  assert.equal(countdownParts(target, new Date('2026-12-01T00:00:01Z')), null);
});

test('one ticker: repeated start() never multiplies timers; stop() clears', () => {
  const active = new Set(); let next = 0;
  const t = createTicker(() => {}, { setIntervalImpl: () => { const id = ++next; active.add(id); return id; }, clearIntervalImpl: (id) => active.delete(id) });
  for (let i = 0; i < 10; i++) t.start();
  assert.equal(active.size, 1);
  t.stop();
  assert.equal(active.size, 0);
  assert.equal(t.running, false);
});

test('an ongoing event whose registration deadline passed is "registration closed", not "finished"', () => {
  const e = ev({ start: '2026-12-05', end: '2026-12-07', registrationDeadline: '2026-12-01', source: 'https://example.org', lastChecked: '2026-11-15' });
  const during = new Date('2026-12-06T15:00:00Z');
  assert.equal(eventStatus(e, during), 'ongoing');
  assert.equal(registrationState(e, during), 'registration-closed');
  assert.equal(registrationState(e, new Date('2026-12-08T12:00:00Z')), 'event-finished');
  assert.equal(registrationState(ev({ registrationDeadline: '2026-11-01' }), new Date('2026-11-20T12:00:00Z')), 'registration-closed');
});

test('the timer keeps running while only ongoing events remain, and stops once all are past', () => {
  const e = ev({ start: '2026-12-05', end: '2026-12-06' });
  assert.equal(needsTicking([e], new Date('2026-12-04T12:00:00Z')), true);   // upcoming
  assert.equal(needsTicking([e], new Date('2026-12-06T12:00:00Z')), true);   // ongoing only
  assert.equal(needsTicking([e], new Date('2026-12-08T12:00:00Z')), false);  // past
  assert.equal(needsTicking(data.events, REVIEW_DATE), true);
});

test('only real calendar dates are accepted everywhere', () => {
  for (const good of ['2026-02-28', '2028-02-29', '2026-12-31']) assert.equal(isCalendarDate(good), true, good);
  for (const bad of ['2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10', '2026-1-1', '26-01-01', '', null, 20260101]) {
    assert.equal(isCalendarDate(bad), false, String(bad));
  }
  assert.match(eventRecordProblem(ev({ start: '2026-02-30', end: '2026-03-01' })), /real dates/);
  assert.match(eventRecordProblem(ev({ registrationDeadline: '2026-11-31' })), /registrationDeadline/);
  assert.match(eventRecordProblem(ev({ source: 'https://example.org', lastChecked: '2026-99-01' })), /lastChecked/);
  assert.match(eventRecordProblem(ev({ registrationDeadline: '2027-01-01' })), /after the event ends/);
  assert.match(eventRecordProblem(ev({ timezone: 'Mars/Olympus' })), /timezone/);
  assert.match(validateEvents({ lastReviewed: '2026-11-31', events: [] }), /lastReviewed/);
  assert.match(validateEvents({ lastReviewed: '15/11/2026', events: [] }), /lastReviewed/);
  assert.equal(validateEvents({ lastReviewed: '2026-11-15', events: [] }), null);
});

test('ATA class tiers are kept separate from a national or international level',()=>{
 for(const e of data.events.filter(e=>e.organization==='ATA'&&e.organiserClass&&!/national|world|state|district/i.test(e.name)))assert.equal(e.level,'unspecified',e.id);
});


test('event search matches separate words, accents, country aliases and visible discipline labels',()=>{
 const fixture=ev({name:'National Open',location:'São Paulo',country:'Brazil',countryCode:'BR',eventTypes:['patterns']});
 assert.equal(filterEvents([fixture],{q:'Paulo Sao'},REVIEW_DATE).length,1);
 assert.equal(filterEvents([fixture],{q:'tul'},REVIEW_DATE).length,1);
 assert.equal(filterEvents([fixture],{q:'missing word'},REVIEW_DATE).length,0);
 const usa=ev({countryCode:'US'});assert.equal(filterEvents([usa],{q:'USA'},REVIEW_DATE).length,1);
 assert.equal(filterEvents([ev({country:'Australia',countryCode:'AU',location:'Sydney'})],{q:'US'},REVIEW_DATE).length,0);
 assert.equal(filterEvents([ev({country:'United Kingdom',countryCode:'GB'})],{q:'UK'},REVIEW_DATE).length,1);
});
test('event facet counts keep every other filter and match the resulting event list',()=>{
 const state={status:'all',country:'United States',year:'2026'},statuses=eventStatuses(data.events,REVIEW_DATE);
 for(const facet of ['country','organization','year','type','style','region','level','kind','status']) {
  const counts=eventFacetCounts(data.events,state,facet,REVIEW_DATE,statuses);
  for(const [value,count]of Object.entries(counts)) {
   if(value==='all'&&facet==='type')continue;
   assert.equal(filterEvents(data.events,{...state,[facet]:value},REVIEW_DATE,statuses).length,count,`${facet}:${value}`);
  }
 }
});
test('event filters reject malformed URL values and round-trip valid selections',()=>{
 const state=eventFiltersFromParams('?status=all&country=United+States&organization=AAU&year=2027&major=1&q=National',data.events);
 assert.equal(state.country,'United States');assert.equal(state.status,'all');assert.equal(state.major,true);
 assert.deepEqual(eventFiltersFromParams(eventFiltersToParams(state),data.events),state);
 const invalid=eventFiltersFromParams('?month=2026-99&status=bogus&country=bogus&year=9999&major=false',data.events);
 assert.equal(invalid.month,'');assert.equal(invalid.status,'upcoming');assert.equal(invalid.country,'all');assert.equal(invalid.year,'all');assert.equal(invalid.major,false);
});
test('facet years count a cross-year event in both years and exclude undated events from months',()=>{
 const list=[ev({year:2026,start:'2026-12-30',end:'2027-01-02'}),ev({year:2027,start:null,end:null,dateStatus:'tba'})];
 const counts=eventFacetCounts(list,{status:'all'},'year',REVIEW_DATE);
 assert.equal(counts['2026'],1);assert.equal(counts['2027'],2);
 assert.equal(filterEvents(list,{status:'all',month:'2027-01'},REVIEW_DATE).length,1);
});
