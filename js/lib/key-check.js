/* Guard against shipping a privileged Supabase key in browser code.
   Allowed: a legacy anon JWT (payload role "anon") or a new
   "sb_publishable_…" key. Rejected: "sb_secret_…" keys and any JWT whose
   payload role is not "anon" (e.g. "service_role"), however it is encoded. */

const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
const JWT_IN_TEXT = /eyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g;

function base64UrlDecode(segment) {
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
  return globalThis.atob(b64);
}

export function decodeJwtPayload(token) {
  try {
    return JSON.parse(base64UrlDecode(token.split('.')[1]));
  } catch {
    return null;
  }
}

/** null when the key is safe to ship publicly, otherwise a reason. */
export function publicKeyProblem(key) {
  if (key == null || key === '') return null;
  if (typeof key !== 'string') return 'key must be a string';
  const k = key.trim();
  if (/^sb_secret_/i.test(k)) return 'this is a Supabase SECRET key (sb_secret_…); use the publishable key';
  if (/service_role/i.test(k)) return 'key text mentions service_role';
  if (JWT_RE.test(k)) {
    const payload = decodeJwtPayload(k);
    if (!payload) return 'key looks like a JWT but its payload cannot be read';
    if (payload.role !== 'anon') return `JWT role is "${payload.role}" — only the anon key may be used in the browser`;
    return null;
  }
  if (/^sb_publishable_/i.test(k)) return null;
  return 'unrecognised key format (expected an anon JWT or sb_publishable_ key)';
}

/** Find privileged keys anywhere in a block of text (used by release checks). */
export function findPrivilegedKeys(text) {
  const found = [];
  if (/sb_secret_[A-Za-z0-9_-]+/.test(text)) found.push('sb_secret_ key');
  for (const m of String(text).matchAll(JWT_IN_TEXT)) {
    const payload = decodeJwtPayload(m[0]);
    if (payload && payload.role && payload.role !== 'anon') found.push(`JWT with role "${payload.role}"`);
  }
  return found;
}
