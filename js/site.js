/* Shared behaviour for every page: mobile navigation, the account link and
   small layout helpers. Deliberately independent of the account service —
   navigation keeps working if the Supabase SDK or network is unavailable. */
import { ACCOUNTS } from './config.js';
import { accountsConfigured, hasStoredSession, sessionStorageKey } from './lib/account-service.js';
import { h, replaceChildren } from './lib/dom.js';

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
  const wide = window.matchMedia('(min-width: 769px)');
  wide.addEventListener?.('change', (e) => { if (e.matches) setOpen(false); });
  return { setOpen };
}

/** Header account link. Never shows member data — just where to go.
 *  Destinations are root-absolute so nested pages (e.g. /companions/…) work.
 *  Re-rendering with the same visible state leaves the existing links (and
 *  any keyboard focus on them) untouched, so a token refresh in another tab
 *  does not disturb the header. Returns true when the links were replaced. */
export function renderAccountNav(cfg = ACCOUNTS) {
  const slot = document.getElementById('nav-account');
  if (!slot) return false;
  const page = document.body.dataset.page;
  const configured = accountsConfigured(cfg);
  const mode = !configured ? 'off' : hasStoredSession(cfg) ? 'member' : cfg.signupEnabled ? 'guest-signup' : 'guest';
  const visible = `${mode}|${page === 'auth' || page === 'profile' ? page : ''}`;
  if (slot.dataset.navState === visible) return false;
  slot.dataset.navState = visible;
  if (mode === 'off') {
    replaceChildren(slot, h('a', {
      href: '/auth.html', class: 'btn btn-secondary btn-sm nav-account-link',
      'aria-current': page === 'auth' ? 'page' : null,
    }, 'Log in'));
    return true;
  }
  if (mode === 'member') {
    replaceChildren(slot, h('a', {
      href: '/profile.html', class: 'btn btn-secondary btn-sm nav-account-link',
      'aria-current': page === 'profile' ? 'page' : null,
    }, 'My profile'));
    return true;
  }
  replaceChildren(slot,
    h('a', { href: '/auth.html', class: 'btn btn-secondary btn-sm nav-account-link' }, 'Log in'),
    mode === 'guest-signup' ? h('a', { href: '/auth.html?mode=register', class: 'btn btn-primary btn-sm nav-account-link' }, 'Join free') : null,
  );
  return true;
}

/** Keep the header link current without the account client: another tab
 *  signing in or out changes the stored session (a `storage` event here), and
 *  a page restored by Back/Forward may have been cached before a sign-out.
 *  Returns a function that removes the listeners. */
export function watchAccountNav(win = window, render = renderAccountNav, cfg = ACCOUNTS) {
  const key = sessionStorageKey(cfg);
  const onStorage = (e) => { if (e.key === null || (key && e.key === key)) render(cfg); };
  const onShow = (e) => { if (e.persisted) render(cfg); };
  win.addEventListener('storage', onStorage);
  win.addEventListener('pageshow', onShow);
  return () => { win.removeEventListener('storage', onStorage); win.removeEventListener('pageshow', onShow); };
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
