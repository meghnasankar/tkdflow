/* auth.html controller. Decisions live in lib/auth-flows.js; this file maps
   their outcomes to panels and messages. The requested mode is visible
   immediately; submit buttons stay disabled until the account client is
   ready, and optional data (the school list) never blocks the page. */
import { ACCOUNTS } from '../config.js';
import { getAccountService, accountsConfigured, hasStoredSession } from '../lib/account-service.js';
import { parseAuthLocation } from '../lib/profile-model.js';
import { fetchSchoolNames, currentSession } from '../lib/account-ops.js';
import {
  signIn, register, completeProfile, requestReset, updatePassword, routeSignedIn, startGoogle,
} from '../lib/auth-flows.js';
import {
  populateBelts, populateSchools, wireNewSchool, readProfileForm, showFieldErrors, createStatus, withBusy,
} from '../lib/profile-form.js';

const $ = (id) => document.getElementById(id);
const status = createStatus($('auth-msg'));
const PANELS = ['status', 'login', 'register', 'check-email', 'complete', 'forgot', 'recovery'];
const HERO = {
  status: ['Your TKDflow account', 'Member accounts'],
  login: ['Welcome back', 'Sign in to your TKDflow account'],
  register: ['Join TKDflow', 'Free · No ads'],
  'check-email': ['Almost there', 'Confirm your email address'],
  complete: ['Finish your profile', 'One more step'],
  forgot: ['Reset your password', 'We’ll email you a link'],
  recovery: ['Choose a new password', 'Secure your account'],
};
const SUBMITS = ['btn-login', 'btn-register', 'btn-complete', 'btn-forgot', 'btn-recovery'];

let client = null;
let flow = null;          // non-null while a flow owns navigation (prevents auth-event races)
let routing = null;
let schoolNames = [];
let schoolsFailed = false;

function setReady(ready) {
  for (const id of SUBMITS) {
    const b = $(id);
    b.disabled = !ready;
    b.title = ready ? '' : 'Connecting to the account service…';
  }
  document.querySelector('[data-action="google"]').disabled = !ready;
}

function showPanel(name, { keepStatus = false } = {}) {
  for (const p of PANELS) $(`panel-${p}`).hidden = p !== name;
  const tabs = $('auth-tabs');
  tabs.hidden = !ACCOUNTS.signupEnabled || !(name === 'login' || name === 'register');
  tabs.querySelectorAll('.auth-tab').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.mode === name)));
  const [title, sub] = HERO[name] || HERO.status;
  $('hero-title').textContent = title;
  $('hero-sub').textContent = sub;
  if (!keepStatus) status.clear();
  if (['login', 'register', 'forgot'].includes(name)) {
    const url = new URL(location.href);
    url.searchParams.set('mode', name);
    url.hash = '';
    history.replaceState(null, '', url);
  }
}

function goto(mode) {
  const target = mode === 'register' && !ACCOUNTS.signupEnabled ? 'login' : mode;
  showPanel(target);
  $(`panel-${target}`).querySelector('input, select')?.focus();
}

function showServiceState(kind, reason, onRetry) {
  showPanel('status', { keepStatus: true });
  $('status-title').textContent = {
    disabled: 'Member accounts are paused',
    unavailable: 'The account service is unavailable',
    error: 'We couldn’t finish signing you in',
    loading: 'Signing you in…',
  }[kind];
  $('status-text').textContent = reason;
  $('hero-sub').textContent = kind === 'loading' ? 'One moment' : 'Member accounts';
  $('status-actions').hidden = kind === 'loading';
  const retry = $('status-retry');
  retry.hidden = !onRetry;
  retry.onclick = onRetry || null;
}

function applyFieldErrors(prefix, outcome) {
  const first = showFieldErrors(prefix, outcome.fieldErrors || {});
  status.show(outcome.message, 'error');
  (first || (outcome.field && $(`${prefix}-${outcome.field}`)))?.focus();
}

/* ── static wiring (no network) ── */
function setup() {
  for (const prefix of ['reg', 'cp']) {
    wireNewSchool($(`${prefix}-school`), $(`${prefix}-school-new-wrap`), $(`${prefix}-school-new`));
    populateBelts($(`${prefix}-belt`));
    populateSchools($(`${prefix}-school`), [], '');
  }
  document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => goto(b.dataset.goto)));
  document.querySelectorAll('.auth-tab').forEach((t) => t.addEventListener('click', () => goto(t.dataset.mode)));
  document.querySelectorAll('[data-toggle-pw]').forEach((btn) => btn.addEventListener('click', () => {
    const input = $(btn.dataset.togglePw);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', String(show));
    btn.textContent = show ? 'Hide' : 'Show';
    btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace(show ? 'Show' : 'Hide', show ? 'Hide' : 'Show'));
  }));
  document.querySelectorAll('[data-signup-only]').forEach((el) => { el.hidden = !ACCOUNTS.signupEnabled; });
  document.querySelectorAll('[data-google]').forEach((el) => { el.hidden = !ACCOUNTS.googleEnabled; });

  $('form-login').addEventListener('submit', onLogin);
  $('form-register').addEventListener('submit', onRegister);
  $('form-complete').addEventListener('submit', onComplete);
  $('form-forgot').addEventListener('submit', onForgot);
  $('form-recovery').addEventListener('submit', onRecovery);
  document.querySelector('[data-action="google"]').addEventListener('click', onGoogle);
  setReady(false);
}

async function loadSchools() {
  const { data, error } = await fetchSchoolNames(client);
  schoolNames = data;
  schoolsFailed = Boolean(error);
  // Re-populate around whatever is selected *now* (late completion keeps edits).
  for (const prefix of ['reg', 'cp']) populateSchools($(`${prefix}-school`), schoolNames, $(`${prefix}-school`).value, { unavailable: schoolsFailed });
}

/* ── signed-in routing ── */
function route(session) {
  routing ||= (async () => {
    try {
      showServiceState('loading', 'Checking your profile…');
      const outcome = await routeSignedIn(client, session);
      if (outcome.kind === 'profile') { location.assign('/profile.html'); return; }
      if (outcome.kind === 'error') {
        showServiceState('error', outcome.message, () => { routing = null; route(session); });
        return;
      }
      showComplete(session, outcome);
    } finally {
      routing = null;
    }
  })();
  return routing;
}

function showComplete(session, outcome = {}) {
  showPanel('complete');
  const meta = session?.user?.user_metadata || {};
  const v = outcome.values || {};
  $('cp-name').value = v.full_name || meta.full_name || meta.name || '';
  $('cp-username').value = v.username || '';
  $('cp-age').value = v.age ?? '';
  populateBelts($('cp-belt'), v.belt_level || '');
  populateSchools($('cp-school'), schoolNames, v.school_name || '', { unavailable: schoolsFailed });
  if (outcome.message) applyFieldErrors('cp', outcome);
  else $('cp-name').focus();
}

/* ── handlers ── */
async function onLogin(e) {
  e.preventDefault();
  status.clear();
  await withBusy($('btn-login'), 'Signing in…', async () => {
    flow = 'signing-in';
    const outcome = await signIn(client, { email: $('login-email').value.trim(), password: $('login-password').value });
    flow = null;
    if (outcome.kind !== 'signed-in') { status.show(outcome.message, 'error'); return; }
    await route(outcome.session);
  });
}

async function onRegister(e) {
  e.preventDefault();
  status.clear();
  showFieldErrors('reg', {});
  await withBusy($('btn-register'), 'Creating account…', async () => {
    flow = 'registering';
    try {
      const outcome = await register(client, {
        raw: readProfileForm('reg'),
        email: $('reg-email').value.trim(),
        password: $('reg-password').value,
        confirm: $('reg-confirm').value,
        redirectTo: `${location.origin}/auth.html?mode=complete`,
      });
      if (outcome.kind === 'invalid' || outcome.kind === 'error') { applyFieldErrors('reg', outcome); return; }
      if (outcome.kind === 'check-email') { showPanel('check-email'); return; }
      if (outcome.kind === 'profile') { location.assign('/profile.html'); return; }
      showComplete(outcome.session, outcome);          // account exists, profile needs a retry
    } finally {
      flow = null;
    }
  });
}

async function onComplete(e) {
  e.preventDefault();
  status.clear();
  showFieldErrors('cp', {});
  await withBusy($('btn-complete'), 'Saving…', async () => {
    flow = 'completing';
    try {
      const outcome = await completeProfile(client, readProfileForm('cp'));
      if (outcome.kind === 'profile') { status.show('Profile saved. Taking you to your profile…', 'success'); location.assign('/profile.html'); return; }
      if (outcome.kind === 'session-ended') { showPanel('login'); status.show(outcome.message, 'error'); return; }
      applyFieldErrors('cp', outcome);
    } finally {
      flow = null;
    }
  });
}

async function onForgot(e) {
  e.preventDefault();
  status.clear();
  await withBusy($('btn-forgot'), 'Sending…', async () => {
    const outcome = await requestReset(client, $('forgot-email').value.trim(), `${location.origin}/auth.html?mode=recovery`);
    status.show(outcome.message, outcome.kind === 'sent' ? 'success' : 'error');
    if (outcome.kind === 'invalid') $('forgot-email').focus();
  });
}

function showRecoveryForm() {
  $('recovery-intro').textContent = 'Enter a new password for your account.';
  $('form-recovery').hidden = false;
  $('recovery-expired').hidden = true;
  $('new-password').focus();
}

function recoveryExpired(message) {
  $('recovery-intro').textContent = message;
  $('form-recovery').hidden = true;
  $('recovery-expired').hidden = false;
}

async function startRecovery(urlError) {
  flow = 'recovering';
  showPanel('recovery');
  if (urlError) {
    recoveryExpired(urlError.expired
      ? 'This reset link has expired or was already used. Request a new one below.'
      : 'This reset link is not valid. Request a new one below.');
    return;
  }
  const { session } = await currentSession(client);
  if (session) { showRecoveryForm(); return; }
  setTimeout(async () => {
    if (!$('form-recovery').hidden) return;
    const again = await currentSession(client);
    if (again.session) showRecoveryForm();
    else recoveryExpired('This reset link is not valid or has expired. Request a new one below.');
  }, 4000);
}

async function onRecovery(e) {
  e.preventDefault();
  status.clear();
  await withBusy($('btn-recovery'), 'Updating…', async () => {
    const outcome = await updatePassword(client, $('new-password').value, $('new-confirm').value, {
      stillSignedIn: () => hasStoredSession(),
    });
    if (outcome.kind !== 'updated') { status.show(outcome.message, 'error'); $('new-password').focus(); return; }
    flow = null;
    $('form-recovery').reset();
    showPanel('login');
    status.show(outcome.signedOut
      ? 'Password updated. Sign in with your new password.'
      : 'Password updated, but this device could not be signed out automatically. Sign in with your new password.', 'success');
    $('login-email').focus();
  });
}

async function onGoogle() {
  status.clear();
  const outcome = await startGoogle(client, `${location.origin}/auth.html?mode=complete`);
  if (outcome.kind === 'error') status.show(outcome.message, 'error');
}

/* ── start ── */
async function main() {
  setup();
  const { mode, error: urlError } = parseAuthLocation(location.search, location.hash);

  if (!accountsConfigured()) {
    showServiceState('disabled', ACCOUNTS.disabledReason);
    return;
  }

  const initial = mode === 'register' && !ACCOUNTS.signupEnabled ? 'login' : mode;
  if (initial === 'complete') showServiceState('loading', 'Checking your sign-in…');
  else showPanel(initial);                       // requested mode visible immediately (#11)

  const service = await getAccountService();     // bounded: always resolves
  if (service.status !== 'ready') {
    showServiceState('unavailable', service.reason, () => location.reload());
    return;
  }
  client = service.client;
  setReady(true);
  // Never await Supabase calls inside this callback (supabase-js documents a
  // deadlock risk); defer to the next task instead.
  client.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      if (event === 'PASSWORD_RECOVERY') { flow = 'recovering'; showPanel('recovery'); showRecoveryForm(); return; }
      if (flow || routing) return;
      if (event === 'SIGNED_IN' && session && initial !== 'recovery') route(session);
    }, 0);
  });
  loadSchools(); // background — never blocks the requested mode

  if (initial === 'recovery') { await startRecovery(urlError); return; }
  if (urlError) {
    status.show(urlError.expired ? 'That link has expired or was already used. Please sign in or request a new link.'
      : 'Sign-in could not be completed. Please try again.', 'error');
  }
  const { session } = await currentSession(client);
  if (session && initial !== 'forgot') { await route(session); return; }
  if (initial === 'complete') {
    showPanel('login', { keepStatus: Boolean(urlError) });
    if (!urlError) status.show('Sign in to finish setting up your profile.', 'info');
  }
}

main();
