/* Referee practice progress, kept only in this browser (localStorage), never sent anywhere.
   Saved data is checked against the known scenario ids: only {id: true|false} entries survive, so malformed or
   tampered values can't break the page or claim answers that don't exist. Every write reports whether it worked,
   and the page only says progress is saved when the last write succeeded. */
export const STORE_KEY = 'tkdflow.refereePractice.v1';

/* Keep only known scenario ids with boolean results. Accepts the stored string or an already-parsed value. */
export function sanitize(raw, ids) {
  let value = raw, malformed = false;
  if (typeof raw === 'string') { try { value = JSON.parse(raw); } catch { value = null; malformed = true; } }
  const answers = {}, known = new Set(ids);
  if (value === null || value === undefined) return {answers, dropped: 0, malformed};
  if (typeof value !== 'object' || Array.isArray(value)) return {answers, dropped: 1, malformed: true};
  let dropped = 0;
  for (const [id, result] of Object.entries(value)) {
    if (known.has(id) && typeof result === 'boolean') answers[id] = result; else dropped++;
  }
  return {answers, dropped, malformed: malformed || dropped > 0};
}

/* A store over a Storage-like object (or none). status: 'saved' (reading and writing work), 'unavailable' (this
   browser isn't keeping it), 'repaired' (unreadable entries were removed, valid answers kept), 'recovered' (nothing
   saved could be read, so it was cleared), 'cleared' (the learner reset it). */
export function createProgress(storage, ids, key = STORE_KEY) {
  let answers = {}, status = 'saved';
  const write = next => {
    try {
      if (!storage) throw new Error('no storage');
      if (Object.keys(next).length) storage.setItem(key, JSON.stringify(next)); else storage.removeItem(key);
      return true;
    } catch { return false; }
  };
  try {
    if (!storage) throw new Error('no storage');
    const raw = storage.getItem(key), r = sanitize(raw, ids);
    answers = r.answers;
    if (r.malformed) status = !write(answers) ? 'unavailable' : Object.keys(answers).length ? 'repaired' : 'recovered';
    else { storage.setItem(key + ':probe', '1'); storage.removeItem(key + ':probe'); }   // can this browser write?
  } catch { status = 'unavailable'; }
  return {
    get answers() { return {...answers}; },
    get status() { return status; },
    setResult(id, right) {
      if (!ids.includes(id) || typeof right !== 'boolean') return false;
      answers = {...answers, [id]: right};
      const ok = write(answers); status = ok ? 'saved' : 'unavailable'; return ok;
    },
    clear() { answers = {}; const ok = write(answers); status = ok ? 'cleared' : 'unavailable'; return ok; }
  };
}

/* What the page says about progress: counts, then where it is kept, accurately. */
export function progressText(answers, total) {
  const done = Object.keys(answers).length, right = Object.values(answers).filter(Boolean).length;
  return done ? `${right} of ${done} answered correctly, ${done} of ${total} tried` : `${total} scenarios to try`;
}
export function savedNote(status) {
  return {
    saved: 'Saved in this browser only.',
    cleared: 'Progress cleared from this browser.',
    repaired: 'Some saved answers couldn’t be read and were removed; the rest are saved in this browser only.',
    recovered: 'Earlier progress in this browser couldn’t be read, so it was reset. New answers are saved in this browser only.',
    unavailable: 'This browser isn’t saving progress, so it lasts only until you leave the page.'
  }[status];
}
