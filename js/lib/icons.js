/* Same-origin vector icons. Labels belong to their surrounding text/control. */
const NAMES = new Set(['search','close','forms','belt','play','community','calendar','trophy','person','filter']);
export function icon(name, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', `icon ${className}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `/assets/icons.svg#${NAMES.has(name) ? name : 'forms'}`);
  svg.append(use);
  return svg;
}
