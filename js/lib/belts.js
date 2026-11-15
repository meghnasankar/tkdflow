/* Single source for belt options and colours.
   The same list is enforced in the database (supabase-setup.sql,
   constraint profiles_belt_level_valid); `npm test` checks they match.
   Gup/dan numbering differs between organisations and schools — these
   labels describe a member's own rank and are not a curriculum mapping. */

export const BELT_LEVELS = Object.freeze([
  'White Belt (10th Gup)', 'Yellow Belt (9th Gup)', 'Yellow Stripe (8th Gup)',
  'Green Belt (7th Gup)', 'Green Stripe (6th Gup)', 'Blue Belt (5th Gup)',
  'Blue Stripe (4th Gup)', 'Red Belt (3rd Gup)', 'Red Stripe (2nd Gup)',
  '1st Gup (Poom / Pre-Black)', '1st Dan Black Belt', '2nd Dan Black Belt',
  '3rd Dan Black Belt', '4th Dan Black Belt', '5th Dan Black Belt',
  '6th Dan Black Belt', '7th Dan Black Belt', '8th Dan Black Belt',
  '9th Dan Black Belt (Grand Master)',
]);

/** Colour families used by catalogue filters and badges. */
export const BELT_FAMILIES = Object.freeze([
  { id: 'white', label: 'White', color: '#E5E7EB' },
  { id: 'yellow', label: 'Yellow', color: '#F5C518' },
  { id: 'green', label: 'Green', color: '#2E8B57' },
  { id: 'blue', label: 'Blue', color: '#1A56A0' },
  { id: 'red', label: 'Red', color: '#C8102E' },
  { id: 'black', label: 'Black', color: '#1F2937' },
]);

const UNKNOWN = '#9CA3AF';

/** Colour for a stored belt label ("Blue Stripe (4th Gup)" → blue). */
export function beltColor(label) {
  if (!label) return UNKNOWN;
  const lower = String(label).toLowerCase();
  if (lower.includes('dan') || lower.includes('black')) return BELT_FAMILIES.find((b) => b.id === 'black').color;
  const family = BELT_FAMILIES.find((b) => lower.includes(b.id));
  return family ? family.color : UNKNOWN;
}

export function isValidBelt(label) {
  return BELT_LEVELS.includes(label);
}
