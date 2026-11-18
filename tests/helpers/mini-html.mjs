/* Test-only: build mini-dom elements from the site's own generated markup.
   It handles only what that markup uses: elements with quoted attributes,
   void elements, comments and the entities the generators escape. It is not a
   general HTML parser and is not shipped. */
const VOID = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (m, e) => {
  const k = e.toLowerCase();
  if (k[0] === '#') return String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : Number(k.slice(1)));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[k];
});

/** Parse `html` into `parent` (a mini-dom element) using `doc.createElement`. */
export function parseInto(doc, parent, html) {
  const stack = [parent];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const top = stack.at(-1);
    if (m[0].startsWith('<!--')) continue;
    if (m[1]) {
      const tag = m[1].toUpperCase();
      const i = stack.findLastIndex((n, j) => j > 0 && n.tagName === tag);
      if (i < 0) throw new Error(`mini-html: unexpected </${m[1]}>`);
      stack.length = i;
      continue;
    }
    if (m[2]) {
      const el = doc.createElement(m[2].toLowerCase());
      for (const a of m[3].matchAll(/([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) el.setAttribute(a[1].toLowerCase(), decode(a[2] ?? a[3] ?? a[4] ?? ''));
      top.append(el);
      if (!VOID.has(m[2].toLowerCase()) && !m[4]) stack.push(el);
      continue;
    }
    if (m[5]) top.append(doc.createTextNode(decode(m[5])));
  }
  if (stack.length !== 1) throw new Error(`mini-html: unclosed <${stack.at(-1).tagName.toLowerCase()}>`);
  return parent;
}
