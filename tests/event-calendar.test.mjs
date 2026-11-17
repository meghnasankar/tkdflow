import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canExportEvent,eventCalendar} from '../js/lib/event-calendar.js';
const event={id:'test-event',name:'Tournament',dateStatus:'confirmed',status:'scheduled',start:'2026-12-30',end:'2027-01-02',location:'City, Country',organization:'WT',eventUrl:'https://example.org/event',lastChecked:'2026-11-17'};
const now=new Date('2026-11-17T17:00:00Z');
test('all-day exports include the full multi-day range across year and leap-day boundaries',()=>{
 const ics=eventCalendar(event,now);assert.match(ics,/DTSTART;VALUE=DATE:20261230\r\nDTEND;VALUE=DATE:20270103/);
 assert.match(ics,/DTSTAMP:20261117T170000Z/);assert.match(ics,/UID:test-event@events.tkdflow.com/);
 for(const [start,end,next]of [['2028-02-29','2028-02-29','20280301'],['2027-03-14','2027-03-14','20270315'],['2026-11-01','2026-11-01','20261102']])assert.ok(eventCalendar({...event,start,end},now).includes('DTEND;VALUE=DATE:'+next));
});
test('announced, cancelled, postponed and malformed records cannot create misleading dates',()=>{
 for(const patch of [{start:null},{end:null},{dateStatus:'announced'},{status:'cancelled'},{status:'postponed'},{start:'2026-02-30'},{end:'2026-01-01'},{eventUrl:'javascript:alert(1)'},{eventUrl:'https://user:password@example.org'},{eventUrl:'https://example.org\nATTENDEE:bad'}])assert.equal(eventCalendar({...event,...patch},now),null,JSON.stringify(patch));
});
test('calendar text escapes injected properties and folds by UTF-8 bytes without splitting characters',()=>{
 const ics=eventCalendar({...event,name:'Cup, finals;\\\r\nBEGIN:VEVENT',notes:'🥋 é한'.repeat(100)},now);
 assert.equal(ics.split('\r\n').filter(x=>x==='BEGIN:VEVENT').length,1);
 assert.ok(ics.includes('SUMMARY:Cup\\, finals\\;\\\\\\nBEGIN:VEVENT'));
 for(const line of ics.split('\r\n'))assert.ok(Buffer.byteLength(line,'utf8')<=75);
 const unfolded=ics.replace(/\r\n /g,'');assert.ok(unfolded.includes('🥋 é한'.repeat(100)));assert.ok(unfolded.includes('does not update automatically.'));
});
test('every eligible catalogue record exports its own exact dates and official URL',()=>{
 const data=JSON.parse(readFileSync(new URL('../data/competitions.json',import.meta.url)));
 let count=0;for(const ev of data.events){if(!canExportEvent(ev))continue;count++;const ics=eventCalendar(ev,now).replace(/\r\n /g,'');assert.ok(ics.includes('DTSTART;VALUE=DATE:'+ev.start.replaceAll('-','')));assert.ok(ics.includes('URL:'+new URL(ev.eventUrl||ev.source).href));}
 assert.ok(count>100);
});
