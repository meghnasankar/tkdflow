/* Shape checks for the JSON content files. Used by the pages (to show a
   clear error instead of a broken panel) and by `npm test`. */
import { formRecordProblem } from './catalog.js';
import { eventRecordProblem, isCalendarDate } from './events.js';

export function validateForms(d) {
  if (!Array.isArray(d)) return 'expected a list of forms';
  return d.map(formRecordProblem).find(Boolean) || null;
}

export function validateForum(d) {
  if (!d || !Array.isArray(d.categories)) return 'expected { categories: [...] }';
  for (const c of d.categories) {
    if (typeof c?.id !== 'string' || typeof c.title !== 'string' || !Array.isArray(c.examples)) return `bad category ${c?.id}`;
    if (c.examples.some((t) => typeof t !== 'string')) return `category ${c.id} has a non-text example`;
  }
  return null;
}

export function validateCommunity(d) {
  if (!d || !Array.isArray(d.posts)) return 'expected { posts: [...] }';
  for (const p of d.posts) {
    for (const k of ['id', 'category', 'kind', 'title', 'body']) if (typeof p?.[k] !== 'string') return `post ${p?.id} missing ${k}`;
    if (!Array.isArray(p.tags)) return `post ${p.id} tags`;
    for (const banned of ['author', 'likes', 'comments', 'mediaSrc', 'liked']) {
      if (banned in p) return `post ${p.id} has unsupported "${banned}" (needs real members/media)`;
    }
  }
  return null;
}

export function validateEvents(d) {
  if (!d || !Array.isArray(d.events)) return 'expected { events: [...] }';
  if (!isCalendarDate(d.lastReviewed)) return 'lastReviewed must be a real date (YYYY-MM-DD)';
  return d.events.map(eventRecordProblem).find(Boolean) || null;
}
