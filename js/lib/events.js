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
  const start = zonedToUtc(ev.start, '00:00', ev.timezone);
  const endDay = new Date(Date.UTC(...ev.end.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n)))));
  endDay.setUTCDate(endDay.getUTCDate() + 1);
  const end = zonedToUtc(endDay.toISOString().slice(0, 10), '00:00', ev.timezone); // exclusive
  return { start, end };
}

export function eventStatus(ev, now = new Date()) {
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
  return events.some((ev) => eventStatus(ev, now) !== 'past');
}

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-30, 2026-13-01). */
export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const DEFAULT_FILTERS = Object.freeze({ status: 'upcoming', style: 'all', level: 'all', country: 'all', type: 'all', month: '', q: '' });

/** Every filter is independent; changing one never resets another. */
export function filterEvents(events, filters, now = new Date()) {
  const f = { ...DEFAULT_FILTERS, ...filters };
  const q = f.q.trim().toLowerCase();
  return events.filter((ev) => {
    const status = eventStatus(ev, now);
    if (f.status === 'upcoming' && status === 'past') return false;
    if (f.status === 'past' && status !== 'past') return false;
    if (f.style !== 'all' && ev.style !== f.style) return false;
    if (f.level !== 'all' && ev.level !== f.level) return false;
    if (f.country !== 'all' && ev.country !== f.country) return false;
    if (f.type !== 'all' && !(ev.eventTypes || []).includes(f.type)) return false;
    if (f.month && !overlapsMonth(ev, f.month)) return false;
    if (q && !`${ev.name} ${ev.location} ${ev.country}`.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => (f.status === 'past' ? b.start.localeCompare(a.start) : a.start.localeCompare(b.start)));
}

export function overlapsMonth(ev, month) {
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
  for (const k of ['id', 'name', 'level', 'style', 'start', 'end', 'timezone', 'location', 'country']) {
    if (typeof ev[k] !== 'string' || !ev[k]) return `${ev.id || '?'}: "${k}" is required`;
  }
  if (!isCalendarDate(ev.start) || !isCalendarDate(ev.end) || ev.end < ev.start) return `${ev.id}: start/end must be real dates (YYYY-MM-DD), end on or after start`;
  for (const k of ['registrationDeadline', 'lastChecked']) {
    if (ev[k] != null && !isCalendarDate(ev[k])) return `${ev.id}: "${k}" must be a real date (YYYY-MM-DD) or null`;
  }
  if (ev.registrationDeadline && ev.registrationDeadline > ev.end) return `${ev.id}: registrationDeadline is after the event ends`;
  if (ev.eventTypes != null && !Array.isArray(ev.eventTypes)) return `${ev.id}: eventTypes must be a list`;
  try { new Intl.DateTimeFormat('en-US', { timeZone: ev.timezone }); } catch { return `${ev.id}: bad timezone`; }
  if (ev.source != null && !/^https:\/\//.test(ev.source)) return `${ev.id}: source must be an https URL`;
  if (ev.source && !ev.lastChecked) return `${ev.id}: a source needs a lastChecked date`;
  for (const banned of ['contact', 'entryFee', 'registrationLabel', 'registrationStatus']) {
    if (banned in ev) return `${ev.id}: "${banned}" must come from a verified source, not be hard-coded`;
  }
  return null;
}
