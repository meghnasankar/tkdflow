/* RFC 5545 all-day calendar exports. Dates remain the organizer's local dates. */
import {isCalendarDate} from './events.js';
function officialUrl(value){
 if(typeof value!=='string'||/[\x00-\x20]/.test(value))return null;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
export function canExportEvent(ev){return !!(ev&&ev.id&&ev.name&&ev.dateStatus==='confirmed'&&ev.status==='scheduled'&&isCalendarDate(ev.start)&&isCalendarDate(ev.end)&&ev.end>=ev.start&&officialUrl(ev.eventUrl||ev.source));}
const text=value=>String(value??'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'');
function fold(line){
 const encoder=new TextEncoder();let result='',size=0;
 for(const char of line){const bytes=encoder.encode(char).length;if(size+bytes>75){result+='\r\n ';size=1;}result+=char;size+=bytes;}
 return result;
}
export function eventCalendar(ev,now=new Date()){
 if(!canExportEvent(ev))return null;
 const end=new Date(ev.end+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+1);
 const description=[ev.organization,ev.notes,'Official event page: '+officialUrl(ev.eventUrl||ev.source),ev.lastChecked?'Source checked: '+ev.lastChecked:null,'Saved calendar copy. Check the official event page for changes; this entry does not update automatically.'].filter(Boolean).join('\n\n');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TKDflow//Event calendar//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',
  'UID:'+encodeURIComponent(ev.id)+'@events.tkdflow.com','DTSTAMP:'+now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'),
  'DTSTART;VALUE=DATE:'+ev.start.replaceAll('-',''),'DTEND;VALUE=DATE:'+end.toISOString().slice(0,10).replaceAll('-',''),
  'SUMMARY:'+text(ev.name),'LOCATION:'+text(ev.location),'URL:'+officialUrl(ev.eventUrl||ev.source),'DESCRIPTION:'+text(description),'TRANSP:TRANSPARENT','END:VEVENT','END:VCALENDAR'];
 return lines.map(fold).join('\r\n')+'\r\n';
}
export function downloadEventCalendar(ev){
 const content=eventCalendar(ev);if(!content)return;
 const url=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='tkdflow-'+String(ev.id).replace(/[^a-z0-9_-]/gi,'-')+'.ics';
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
