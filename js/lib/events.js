/* Event listings: timezone-aware status, independent filters, one ticker. */

/** UTC instant for a wall-clock time in an IANA time zone. */
export function zonedToUtc(dateStr, timeStr, timeZone) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [hh, mm, ss = 0] = (timeStr || '00:00').split(':').map(Number);
  let guess = Date.UTC(y, mo - 1, d, hh, mm, ss);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  // Two passes converge for every real-world offset, including DST edges.
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
    const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    guess += Date.UTC(y, mo - 1, d, hh, mm, ss) - asUtc;
  }
  return new Date(guess);
}

export function eventWindow(ev) {
  if (!ev.start || !ev.end) return { start: null, end: null };
  const start = zonedToUtc(ev.start, '00:00', ev.timezone);
  const endDay = new Date(Date.UTC(...ev.end.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n)))));
  endDay.setUTCDate(endDay.getUTCDate() + 1);
  const end = zonedToUtc(endDay.toISOString().slice(0, 10), '00:00', ev.timezone); // exclusive
  return { start, end };
}

export function eventStatus(ev, now = new Date()) {
  if (['cancelled', 'postponed'].includes(ev.status)) return ev.status;
  if (!ev.start || !ev.end) return 'announced';
  const { start, end } = eventWindow(ev);
  if (now >= end) return 'past';
  if (now >= start) return 'ongoing';
  return 'upcoming';
}

/** 'event-finished' | 'registration-closed' | 'unverified' | 'see-organiser'.
 *  A passed registration deadline is NOT the same as a finished event. */
export function registrationState(ev, now = new Date()) {
  if (eventStatus(ev, now) === 'past') return 'event-finished';
  if (ev.registrationDeadline) {
    const deadlineEnd = eventWindow({ ...ev, start: ev.registrationDeadline, end: ev.registrationDeadline }).end;
    if (now >= deadlineEnd) return 'registration-closed';
  }
  if (!ev.source) return 'unverified';
  return 'see-organiser';
}

/** True while any event can still change state (starts, ends or closes
 *  registration) — the page keeps its single timer running until then. */
export function needsTicking(events, now = new Date()) {
  return events.some((ev) => ['upcoming', 'ongoing'].includes(eventStatus(ev, now)));
}

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-30, 2026-13-01). */
export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const DEFAULT_FILTERS = Object.freeze({ status: 'upcoming', style: 'all', level: 'all', country: 'all', type: 'all', month: '', q: '', year: 'all', region: 'all', organization: 'all', major: false, kind: 'all' });

/** Search the visible event vocabulary, accepting accents, punctuation and any word order. */
const searchText = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function matchesEventQuery(ev, query) {
  const aliases = {US:'USA United States America',GB:'UK Great Britain United Kingdom',KR:'Korea South Korea',AE:'UAE United Arab Emirates'};
  const text=searchText([ev.name,ev.location,ev.country,ev.countryCode,aliases[ev.countryCode],ev.organization,ev.region,ev.kind,ev.style,{wt:'Kukkiwon',ata:'Songahm',itf:'Chang Hon'}[ev.style],ev.level,ev.level==='local'?'regional':'',...(ev.eventTypes || []).map(type=>({poomsae:'poomsae forms',patterns:'patterns tul'}[type]||type))].join(' '));
  const words=text.split(/\s+/);
  return searchText(query).split(/\s+/).filter(Boolean).every(term=>term.length<=2?words.includes(term):text.includes(term));
}
function matchesEvent(ev,f,status,skip) {
  if(skip!=='status') {
    if(f.status==='upcoming'&&!['upcoming','ongoing','announced'].includes(status))return false;
    if(f.status==='announced'&&status!=='announced')return false;
    if(f.status==='past'&&status!=='past')return false;
  }
  if(skip!=='year'&&f.year!=='all'&&!(ev.start?ev.start.slice(0,4)<=String(f.year)&&ev.end.slice(0,4)>=String(f.year):String(ev.year)===String(f.year)))return false;
  for(const key of ['region','organization','kind','style','level','country'])if(skip!==key&&f[key]!=='all'&&ev[key]!==f[key])return false;
  if(skip!=='major'&&f.major&&!ev.major)return false;
  if(skip!=='type'&&f.type!=='all'&&!(ev.eventTypes||[]).includes(f.type))return false;
  if(skip!=='month'&&f.month&&!overlapsMonth(ev,f.month))return false;
  if(skip!=='q'&&f.q&&!matchesEventQuery(ev,f.q))return false;
  return true;
}
/** A shared status snapshot avoids repeated time-zone calculations across facets. */
export function eventStatuses(events,now=new Date()) { return new Map(events.map(ev=>[ev,eventStatus(ev,now)])); }
export function filterEvents(events, filters, now = new Date(), statuses = eventStatuses(events,now)) {
  const f={...DEFAULT_FILTERS,...filters};
  return events.filter(ev=>matchesEvent(ev,f,statuses.get(ev))).sort((a,b)=>f.status==='past'?(b.start||'').localeCompare(a.start||''):(a.start||`${a.year}-99-99`).localeCompare(b.start||`${b.year}-99-99`));
}
/** Counts keep every other selection; zero-result options remain visible. */
export function eventFacetCounts(events,filters,facet,now=new Date(),statuses=eventStatuses(events,now)) {
  const f={...DEFAULT_FILTERS,...filters},counts={all:0};
  for(const ev of events) {
    if(!matchesEvent(ev,f,statuses.get(ev),facet))continue;
    counts.all++;
    let values;
    if(facet==='status') {const status=statuses.get(ev);values=[...(['upcoming','ongoing','announced'].includes(status)?['upcoming']:[]),...(['past','announced'].includes(status)?[status]:[])];}
    else if(facet==='type')values=ev.eventTypes||[];
    else if(facet==='year') {values=[];for(let year=Number(ev.start?.slice(0,4)||ev.year);year<=Number(ev.end?.slice(0,4)||ev.year);year++)values.push(String(year));}
    else values=[ev[facet]];
    for(const value of new Set(values.filter(v=>v!==null&&v!==undefined&&v!=='')))counts[value]=(counts[value]||0)+1;
  }
  return counts;
}
export function eventFiltersFromParams(params,events) {
  const p=params instanceof URLSearchParams?params:new URLSearchParams(params), f={...DEFAULT_FILTERS};
  for(const key of ['style','level','country','region','organization','kind'])if(events.some(ev=>ev[key]===p.get(key)))f[key]=p.get(key);
  if(events.some(ev=>String(ev.year)===p.get('year')))f.year=p.get('year');
  if(events.some(ev=>ev.eventTypes?.includes(p.get('type'))))f.type=p.get('type');
  if(['upcoming','past','all','announced'].includes(p.get('status')))f.status=p.get('status');
  if(/^\d{4}-(0[1-9]|1[0-2])$/.test(p.get('month')||''))f.month=p.get('month');
  f.major=p.get('major')==='1'; f.q=(p.get('q')||'').slice(0,120);
  return f;
}
export function eventFiltersToParams(filters) {
  const p=new URLSearchParams();for(const [key,value]of Object.entries(filters))if(value!==DEFAULT_FILTERS[key]&&value!=='')p.set(key,key==='major'?'1':value);return p;
}

export function overlapsMonth(ev, month) {
  if (!ev.start || !ev.end) return false;
  const first = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return ev.start < next && ev.end >= first;
}

export function currentMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function countdownParts(target, now = new Date()) {
  const diff = target - now;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
  };
}

/** A single shared timer. start() is idempotent; stop() always clears it. */
export function createTicker(onTick, { intervalMs = 30000, setIntervalImpl = setInterval, clearIntervalImpl = clearInterval } = {}) {
  let id = null;
  return {
    start() { if (id === null) id = setIntervalImpl(onTick, intervalMs); },
    stop() { if (id !== null) { clearIntervalImpl(id); id = null; } },
    get running() { return id !== null; },
  };
}

export function eventRecordProblem(ev) {
  for (const k of ['id', 'name', 'level', 'style', 'timezone', 'location', 'country']) {
    if (typeof ev[k] !== 'string' || !ev[k]) return `${ev.id || '?'}: "${k}" is required`;
  }
  const tba = ev.dateStatus === 'tba' && ev.start === null && ev.end === null && Number.isInteger(ev.year);
  if (!tba && (!isCalendarDate(ev.start) || !isCalendarDate(ev.end) || ev.end < ev.start)) return `${ev.id}: start/end must be real dates (YYYY-MM-DD), end on or after start`;
  for (const k of ['registrationDeadline', 'lastChecked']) {
    if (ev[k] != null && !isCalendarDate(ev[k])) return `${ev.id}: "${k}" must be a real date (YYYY-MM-DD) or null`;
  }
  if (ev.registrationDeadline && (!ev.end || ev.registrationDeadline > ev.end)) return `${ev.id}: registrationDeadline is after the event ends`;
  if (ev.eventTypes != null && !Array.isArray(ev.eventTypes)) return `${ev.id}: eventTypes must be a list`;
  try { new Intl.DateTimeFormat('en-US', { timeZone: ev.timezone }); } catch { return `${ev.id}: bad timezone`; }
  if (ev.eventUrl != null && !/^https:\/\//.test(ev.eventUrl)) return `${ev.id}: eventUrl must be an https URL`;
  if (ev.source != null && !/^https:\/\//.test(ev.source)) return `${ev.id}: source must be an https URL`;
  if (ev.source && !ev.lastChecked) return `${ev.id}: a source needs a lastChecked date`;
  for (const banned of ['contact', 'entryFee', 'registrationLabel', 'registrationStatus']) {
    if (banned in ev) return `${ev.id}: "${banned}" must come from a verified source, not be hard-coded`;
  }
  return null;
}
