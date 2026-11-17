/* Shared behaviour for every page: mobile navigation, the account link and
   small layout helpers. Deliberately independent of the account service —
   navigation keeps working if the Supabase SDK or network is unavailable. */
import { ACCOUNTS } from './config.js';
import { accountsConfigured, hasStoredSession } from './lib/account-service.js';
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

/** Header account link. Never shows member data — just where to go. */
export function renderAccountNav(cfg = ACCOUNTS) {
  const slot = document.getElementById('nav-account');
  if (!slot) return;
  const page = document.body.dataset.page;
  if (!accountsConfigured(cfg)) {
    replaceChildren(slot, h('a', {
      href: 'auth.html', class: 'btn btn-secondary btn-sm nav-account-link',
      'aria-current': page === 'auth' ? 'page' : null,
    }, 'Log in'));
    return;
  }
  if (hasStoredSession(cfg)) {
    replaceChildren(slot, h('a', {
      href: 'profile.html', class: 'btn btn-secondary btn-sm nav-account-link',
      'aria-current': page === 'profile' ? 'page' : null,
    }, 'My profile'));
    return;
  }
  replaceChildren(slot,
    h('a', { href: 'auth.html', class: 'btn btn-secondary btn-sm nav-account-link' }, 'Log in'),
    cfg.signupEnabled ? h('a', { href: 'auth.html?mode=register', class: 'btn btn-primary btn-sm nav-account-link' }, 'Join free') : null,
  );
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
initYear();
