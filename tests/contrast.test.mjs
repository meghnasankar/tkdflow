/* WCAG contrast for the main text/background pairs, computed from the
   tokens in styles.css. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const token = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))[1];

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const PAIRS = [
  ['secondary text on white', 'gray-400', 'white', 4.5],
  ['secondary text on off-white', 'gray-400', 'off-white', 4.5],
  ['body text on white', 'gray-600', 'white', 4.5],
  ['gold button text', 'navy', 'gold', 4.5],
  ['gold badge text', 'gold-dark', 'gold-light', 4.5],
  ['red badge text', 'red-dark', 'red-light', 4.5],
  ['white on primary red button', 'white', 'red', 4.5],
  ['red accent on navy hero', 'red-on-dark', 'navy', 4.5],
  ['active nav link', 'red-dark', 'red-light', 4.5],
  ['lesson pose link on white', 'red-dark', 'white', 4.5],
  ['lesson key-help keycaps', 'navy', 'gray-50', 4.5],

];

for (const [label, fg, bg, min] of PAIRS) {
  test(`${label} ≥ ${min}:1`, () => {
    const ratio = contrast(token(fg), token(bg));
    assert.ok(ratio >= min, `${label}: ${ratio.toFixed(2)}:1`);
  });
}

test('the audit’s failing pairs are no longer used for text', () => {
  assert.ok(contrast('#9CA3AF', '#FFFFFF') < 3, 'sanity: old gray-400 really failed');
  assert.notEqual(token('gray-400').toUpperCase(), '#9CA3AF');
  assert.doesNotMatch(css, /\.btn-gold\s*\{[^}]*color:\s*var\(--white\)/);
  assert.doesNotMatch(css, /\.badge-gold\s*\{[^}]*color:\s*var\(--gold\)\s*;/);
});

test('focus indicator is visible on both light and dark backgrounds (≥3:1)', () => {
  const focus = token('focus');
  const halo = token('focus-halo');
  for (const bg of ['#FFFFFF', token('off-white'), token('gray-100'), token('red-light')]) {
    assert.ok(contrast(focus, bg) >= 3, `outer ring on ${bg}: ${contrast(focus, bg).toFixed(2)}`);
  }
  // darkest and lightest stops of the dark hero gradients
  for (const bg of [token('navy'), '#1A2A3A', '#2D1218', '#2E1A4A', '#3D1A00']) {
    assert.ok(contrast(halo, bg) >= 3, `inner halo on ${bg}: ${contrast(halo, bg).toFixed(2)}`);
  }
  const rule = css.match(/:focus-visible\s*\{([^}]*)\}/)[1];
  assert.match(rule, /outline:\s*3px solid var\(--focus\)/);
  assert.match(rule, /box-shadow:\s*0 0 0 3px var\(--focus-halo\)/);
  assert.match(rule, /outline-offset:\s*3px/);
});
