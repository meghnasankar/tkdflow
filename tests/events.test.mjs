import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  zonedToUtc, eventStatus, registrationState, filterEvents, overlapsMonth, currentMonth, countdownParts, createTicker, eventRecordProblem,
  needsTicking, isCalendarDate, eventsTeaser,
} from '../js/lib/events.js';
import { validateEvents } from '../js/lib/validators.js';

const data = JSON.parse(readFileSync(new URL('../data/competitions.json', import.meta.url), 'utf8'));
// The five unsourced 2025 listings that used to ship; kept as a fixture for archive/date cases.
const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-events-2025.json', import.meta.url), 'utf8'));
const REVIEW_DATE = new Date('2026-11-15T12:00:00Z');
const ev = (over) => ({ id: 'x', name: 'Test Open', level: 'local', style: 'wt', eventTypes: ['poomsae'], start: '2026-12-05', end: '2026-12-06',
  timezone: 'America/New_York', location: 'Boston, USA', country: 'United States', source: null, lastChecked: null, ...over });

test('shipped listings are valid, sourced from the organiser and claim nothing the source did not state', () => {
  assert.equal(validateEvents(data), null);
  assert.equal(data.events.length, 3);
  for (const e of data.events) {
    assert.equal(eventRecordProblem(e), null, e.id);
    assert.match(e.source, /^https:\/\/atamartialarts\.com\//, `${e.id} links the organiser's own site`);
    assert.equal(e.lastChecked, '2026-11-15');
    assert.equal(e.registrationDeadline, null, `${e.id}: no deadline without primary evidence`);
    assert.deepEqual(e.eventTypes, [], `${e.id}: no invented event types`);
    assert.ok(['America/Chicago', 'America/New_York'].includes(e.timezone));
    assert.equal(e.style, 'ata');
  }
  const huLee = data.events.find((e) => e.id === 'ata-hu-lee-classic-2026');
  assert.deepEqual([huLee.start, huLee.end, huLee.location], ['2026-12-04', '2026-12-05', 'Statehouse Convention Center, Little Rock, Arkansas, United States']);
  assert.equal(huLee.level, 'unspecified', 'organiser tier is not mapped to a TKDflow level');
  assert.equal(huLee.organiserClass, 'Class A+');
  const spring = data.events.find((e) => e.id === 'ata-spring-nationals-2027');
  assert.deepEqual([spring.start, spring.end, spring.location, spring.level],
    ['2027-03-17', '2027-03-20', 'Fort Worth Convention Center, Fort Worth, Texas, United States', 'national']);
});

test('legacy fixture: on the review date every old unsourced listing is past and none is open or upcoming', () => {
  assert.equal(validateEvents(legacy), null);
  for (const e of legacy.events) {
    assert.equal(eventStatus(e, REVIEW_DATE), 'past', e.id);
    assert.equal(registrationState(e, REVIEW_DATE), 'event-finished');
  }
  assert.equal(filterEvents(legacy.events, { status: 'upcoming' }, REVIEW_DATE).length, 0);
  assert.equal(filterEvents(legacy.events, { status: 'past' }, REVIEW_DATE).length, legacy.events.length);
  assert.ok(legacy.events.every((e) => e.source === null), 'fixture keeps the unsourced shape it had');
});

test('on the review date all shipped events are upcoming, with check-with-organiser wording', () => {
  assert.deepEqual(filterEvents(data.events, { status: 'upcoming' }, REVIEW_DATE).map((e) => e.id),
    ['ata-atlantic-city-class-b-2026', 'ata-hu-lee-classic-2026', 'ata-spring-nationals-2027']);
  assert.equal(filterEvents(data.events, { status: 'past' }, REVIEW_DATE).length, 0);
  for (const e of data.events) assert.equal(registrationState(e, REVIEW_DATE), 'see-organiser');
});

test('shipped events move to the archive from their real local dates (America/Chicago)', () => {
  const [huLee, spring] = ['ata-hu-lee-classic-2026', 'ata-spring-nationals-2027'].map((id) => data.events.find((e) => e.id === id));
  // H.U. Lee Classic: CST (UTC−6). Starts 00:00 4 Dec local, ends after 5 Dec local.
  assert.equal(eventStatus(huLee, new Date('2026-12-04T05:59:00Z')), 'upcoming');
  assert.equal(eventStatus(huLee, new Date('2026-12-04T06:00:00Z')), 'ongoing');
  assert.equal(eventStatus(huLee, new Date('2026-12-06T05:59:00Z')), 'ongoing');
  assert.equal(eventStatus(huLee, new Date('2026-12-06T06:00:00Z')), 'past');
  assert.equal(registrationState(huLee, new Date('2026-12-06T06:00:00Z')), 'event-finished');
  // Spring Nationals: CDT (UTC−5) after the 14 Mar 2027 DST change.
  assert.equal(eventStatus(spring, new Date('2027-03-17T04:59:00Z')), 'upcoming');
  assert.equal(eventStatus(spring, new Date('2027-03-17T05:00:00Z')), 'ongoing');
  assert.equal(eventStatus(spring, new Date('2027-03-21T04:59:00Z')), 'ongoing');
  assert.equal(eventStatus(spring, new Date('2027-03-21T05:00:00Z')), 'past');
  const between = new Date('2027-01-10T12:00:00Z');
  assert.deepEqual(filterEvents(data.events, { status: 'upcoming' }, between).map((e) => e.id), ['ata-spring-nationals-2027']);
  assert.deepEqual(filterEvents(data.events, { status: 'past' }, between).map((e) => e.id), ['ata-hu-lee-classic-2026', 'ata-atlantic-city-class-b-2026']);
  const after = new Date('2027-04-01T12:00:00Z');
  assert.equal(filterEvents(data.events, { status: 'upcoming' }, after).length, 0);
  assert.deepEqual(filterEvents(data.events, { status: 'past' }, after).map((e) => e.id),
    ['ata-spring-nationals-2027', 'ata-hu-lee-classic-2026', 'ata-atlantic-city-class-b-2026'], 'archive lists newest first');
  assert.equal(needsTicking(data.events, after), false);
});

test('home teaser counts only sourced, not-yet-past events and says so honestly when none remain', () => {
  const now = eventsTeaser(data.events, REVIEW_DATE);
  assert.equal(now.state, 'available');
  assert.match(now.text, /^3 upcoming events listed, each linked to the organiser’s official page/);
  assert.match(eventsTeaser(data.events, new Date('2027-01-10T12:00:00Z')).text, /^1 upcoming event listed/);
  const later = eventsTeaser(data.events, new Date('2027-04-01T12:00:00Z'));
  assert.equal(later.state, 'none');
  assert.match(later.text, /No upcoming listings/);
  assert.equal(eventsTeaser([ev({ start: '2026-12-05', end: '2026-12-06' })], REVIEW_DATE).state, 'none', 'unsourced events are not advertised');
});

test('level, style, event type and organiser class are validated; unspecified level filters on its own', () => {
  assert.match(eventRecordProblem(ev({ level: 'regional' })), /level must be one of/);
  assert.match(eventRecordProblem(ev({ style: 'kickboxing' })), /style must be one of/);
  assert.match(eventRecordProblem(ev({ eventTypes: ['forms-and-more'] })), /unknown event type/);
  assert.match(eventRecordProblem(ev({ organiserClass: 'Class A+' })), /needs an official source/);
  const sourced = { source: 'https://example.org/e', lastChecked: '2026-11-15' };
  assert.match(eventRecordProblem(ev({ ...sourced, organiserClass: '' })), /organiserClass/);
  assert.match(eventRecordProblem(ev({ ...sourced, organiserClass: 'x'.repeat(41) })), /organiserClass/);
  assert.equal(eventRecordProblem(ev({ ...sourced, level: 'unspecified', organiserClass: 'Class A+' })), null);
  assert.deepEqual(filterEvents(data.events, { level: 'unspecified' }, REVIEW_DATE).map((e) => e.id), ['ata-hu-lee-classic-2026']);
  assert.deepEqual(filterEvents(data.events, { level: 'national', style: 'ata' }, REVIEW_DATE).map((e) => e.id), ['ata-spring-nationals-2027']);
});

test('Atlantic City listing has primary evidence and archives at New Jersey midnight', () => {
  const event = data.events.find((e) => e.id === 'ata-atlantic-city-class-b-2026');
  assert.deepEqual([event.start, event.end, event.timezone, event.level, event.organiserClass],
    ['2026-11-20', '2026-11-21', 'America/New_York', 'local', 'Class B']);
  assert.equal(event.source, 'https://atamartialarts.com/events/event-schedule/class-b/1120-212026-nj-class-b/');
  assert.equal(eventStatus(event, new Date('2026-11-22T04:59:00Z')), 'ongoing');
  assert.equal(eventStatus(event, new Date('2026-11-22T05:00:00Z')), 'past');
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
  assert.equal(needsTicking(legacy.events, REVIEW_DATE), false);
  assert.equal(needsTicking(data.events, REVIEW_DATE), true, 'shipped upcoming events keep the countdown live');
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
