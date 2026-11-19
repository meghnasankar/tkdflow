/* Shared behaviour for every page: mobile navigation, the account links and
   small layout helpers. Rendering is independent of the account service —
   navigation keeps working if the Supabase SDK or network is unavailable. The
   account client is loaded only when a signed-in member presses the header's
   Log out button; a page view never starts it, and a known under-13 tab never
   shows the button. */
import { ACCOUNTS } from './config.js';
import { accountsConfigured, hasStoredSession, sessionStorageKey, storedSessionState, logoutVerdict } from './lib/account-service.js';
import { h, replaceChildren } from './lib/dom.js';
import { sharedEligibilityStore, onEligibilityChange, INELIGIBLE } from './lib/age-gate.js';

export function initNav(root = document) {
  const toggle = root.querySelector('.nav-toggle');
  const menu = root.getElementById ? root.getElementById('site-nav') : root.querySelector('#site-nav');
  if (!toggle || !menu) return null;

  const setOpen = (open, { focusToggle = false } = {}) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Open menu';
    menu.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    if (focusToggle) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, { focusToggle: true });
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', (e) => {
    if (toggle.getAttribute('aria-expanded') === 'true' && !e.target.closest('.navbar')) setOpen(false);
  });
  const wide = window.matchMedia('(min-width: 861px)');   // the header menu folds at 860px and below (styles.css)
  wide.addEventListener?.('change', (e) => { if (e.matches) setOpen(false); });
  return { setOpen };
}

/** Header account link. Never shows member data — just where to go.
 *  Destinations are root-absolute so nested pages (e.g. /companions/…) work.
 *  A tab whose age screen recorded a known under-13 result gets one neutral
 *  link, "About accounts", whatever else is true; the stored session is not
 *  even read for that tab.
 *  Re-rendering with the same visible state leaves the existing links (and
 *  any keyboard focus on them) untouched, so a token refresh in another tab
 *  does not disturb the header. Returns true when the links were replaced. */
export function renderAccountNav(cfg = ACCOUNTS) {
  const slot = document.getElementById('nav-account');
  if (!slot) return false;
  const page = document.body.dataset.page;
  const mode = sharedEligibilityStore().read() === INELIGIBLE ? 'age'
    : !accountsConfigured(cfg) ? 'off' : hasStoredSession(cfg) ? 'member' : cfg.signupEnabled ? 'guest-signup' : 'guest';
  const visible = `${mode}|${page === 'auth' || page === 'profile' ? page : ''}`;
  if (slot.dataset.navState === visible) return false;
  slot.dataset.navState = visible;
  // Keyboard focus moves only if it was on a header account link being replaced.
  const hadFocus = slot.contains(document.activeElement);
  replaceAccountLinks(slot, mode, page, cfg);
  if (hadFocus) slot.querySelector('a')?.focus();
  return true;
}

function replaceAccountLinks(slot, mode, page, cfg) {
  if (mode === 'age') {
    replaceChildren(slot, h('a', { href: '/start-here.html#sh-community', class: 'btn btn-secondary btn-sm nav-account-link' }, 'About accounts'));
    return;
  }
  if (mode === 'off') {
    replaceChildren(slot, h('a', {
      href: '/auth.html', class: 'btn btn-secondary btn-sm nav-account-link',
      'aria-current': page === 'auth' ? 'page' : null,
    }, 'Log in'));
    return;
  }
  if (mode === 'member') {
    logoutButton = h('button', {
      type: 'button', class: 'btn btn-secondary btn-sm nav-account-link nav-logout',
      'aria-disabled': logoutPending ? 'true' : null, on: { click: () => headerLogout({ cfg }) },
    }, logoutPending ? BUSY_TEXT : LOGOUT_TEXT);
    logoutStatus = h('span', { class: 'nav-logout-status', role: 'status' });
    replaceChildren(slot, h('a', {
      href: '/profile.html', class: 'btn btn-secondary btn-sm nav-account-link',
      'aria-current': page === 'profile' ? 'page' : null,
    }, 'My profile'), logoutButton, logoutStatus);
    return;
  }
  logoutButton = null; logoutStatus = null;
  replaceChildren(slot,
    h('a', { href: '/auth.html', class: 'btn btn-secondary btn-sm nav-account-link' }, 'Log in'),
    mode === 'guest-signup' ? h('a', { href: '/auth.html?mode=register', class: 'btn btn-primary btn-sm nav-account-link' }, 'Join free') : null,
  );
}

/* ── Header Log out ── */
const LOGOUT_TEXT = 'Log out', BUSY_TEXT = 'Logging out…';
// `logoutAttempt` numbers each attempt. A Back/Forward restore or an under-13 result
// invalidates the attempt in flight: its later answers never touch the header or navigate.
let logoutPending = false, logoutAttempt = 0, logoutButton = null, logoutStatus = null;
function showLogoutBusy(busy) {
  if (!logoutButton) return;
  // aria-disabled, not disabled: the button keeps keyboard focus while busy.
  if (busy) logoutButton.setAttribute('aria-disabled', 'true'); else logoutButton.removeAttribute('aria-disabled');
  logoutButton.textContent = busy ? BUSY_TEXT : LOGOUT_TEXT;
}
const sayLogout = (text) => { if (logoutStatus) logoutStatus.textContent = text; };
function cancelLogout() { logoutAttempt += 1; logoutPending = false; showLogoutBusy(false); sayLogout(''); }
const defaults = {
  service: () => import('./lib/account-service.js').then((m) => m.getAccountService()),
  logout: () => import('./lib/auth-flows.js').then((m) => m.logout),
  go: (url) => window.location.assign(url),
};
/** Sign out of this device (local scope, through the shared bounded logout helper),
 *  then load a fresh public home page. Success requires that no session remains
 *  stored; anything else keeps the visitor here with a message. One attempt at a
 *  time. An attempt invalidated while it waits (Back/Forward restore, an under-13
 *  result) stops before signing out; if its sign-out request had already started
 *  it can't be recalled, but its answer is ignored. Dependencies are injectable. */
export async function headerLogout({ cfg = ACCOUNTS, deps = {} } = {}) {
  const d = { ...defaults, ...deps };
  const ineligible = () => sharedEligibilityStore().read() === INELIGIBLE;
  if (logoutPending) return 'busy';
  if (ineligible()) { renderAccountNav(cfg); return 'ineligible'; }
  const attempt = ++logoutAttempt, current = () => attempt === logoutAttempt;
  logoutPending = true; showLogoutBusy(true); sayLogout('');
  let outcome = { kind: 'error' };
  try {
    const svc = await d.service();
    if (!current()) return 'stale';
    if (ineligible()) { cancelLogout(); renderAccountNav(cfg); return 'ineligible'; }
    if (svc?.status !== 'ready') outcome = { kind: 'unavailable' };
    else {
      const logout = await d.logout();
      if (!current()) return 'stale';
      // Unreadable storage is not proof of absence: treat it as still signed in.
      outcome = await logout(svc.client, { stillSignedIn: () => storedSessionState(cfg) !== 'absent', ms: d.ms });
    }
  } catch { outcome = { kind: 'error' }; }
  if (!current()) return 'stale';
  logoutPending = false;
  // Signed out here, or already signed out (for example by another tab): verified absent.
  // The navbar keeps the cheap hasStoredSession; Log out needs the strict proof.
  const state = storedSessionState(cfg), verdict = logoutVerdict(state, outcome.kind);
  if (verdict.verified) { d.go('/'); return 'signed-out'; }
  showLogoutBusy(false);
  // The account service keeps an unavailable result for this page, so only a reload can retry it.
  sayLogout(verdict.message);
  return state === 'unknown' ? 'unconfirmed' : outcome.kind === 'unavailable' ? 'unavailable' : 'error';
}

/** Keep the header link current without the account client: another tab
 *  signing in or out changes the stored session (a `storage` event here), a
 *  page restored by Back/Forward may have been cached before a sign-out, and
 *  the age screen on this page may record a result (shared store change).
 *  Returns a function that removes the listeners. */
export function watchAccountNav(win = window, render = renderAccountNav, cfg = ACCOUNTS) {
  const key = sessionStorageKey(cfg);
  const onStorage = (e) => { if (e.key === null || (key && e.key === key)) render(cfg); };
  // A page restored by Back/Forward is never left showing an old "Logging out…".
  const onShow = (e) => { if (e.persisted) { cancelLogout(); render(cfg); } };
  win.addEventListener('storage', onStorage);
  win.addEventListener('pageshow', onShow);
  const stopAge = onEligibilityChange(() => { if (sharedEligibilityStore().read() === INELIGIBLE) cancelLogout(); render(cfg); });
  return () => { win.removeEventListener('storage', onStorage); win.removeEventListener('pageshow', onShow); stopAge(); };
}

function initYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll('[data-current-year]').forEach((el) => { el.textContent = year; });
}

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

initNav();
renderAccountNav();
watchAccountNav();
initYear();
