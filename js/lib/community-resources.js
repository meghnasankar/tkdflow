/* Community learning resources: category and search state in the address
   (?view=resources&category=<slug>&q=<words>) and the all-word search, which
   compares words the way the library and Community discussions do
   (catalogue normalize(): case, accents, spaces and punctuation). Pure. */
import { normalize } from './catalog.js';

export const MAX_QUERY = 80;
export const categorySlug = (name) => String(name).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Read the address against the categories present. An unknown category falls back to all. */
export function resourceState(search, categories) {
  const p = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const slugs = new Map(categories.map((c) => [categorySlug(c), c]));
  const raw = p.get('category');
  const category = raw && slugs.has(raw) ? slugs.get(raw) : 'all';
  return { category, q: (p.get('q') || '').slice(0, MAX_QUERY), unknownCategory: Boolean(raw) && category === 'all' };
}

/** The address for a state; always keeps the resources view. */
export function resourceQuery({ category, q }) {
  const p = new URLSearchParams({ view: 'resources' });
  if (category && category !== 'all') p.set('category', categorySlug(category));
  if (q && q.trim()) p.set('q', q.trim().slice(0, MAX_QUERY));
  return `?${p}`;
}

/** Every typed word must appear in the title, body, kind or tags. */
export function resourceMatches(post, q) {
  const words = String(q || '').trim().split(/\s+/).map(normalize).filter(Boolean);
  if (!words.length) return true;
  const hay = normalize([post.title, post.body, post.kind, ...(post.tags || [])].join(' '));
  return words.every((w) => hay.includes(w));
}
