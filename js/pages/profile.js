import {bounded} from '../lib/account-ops.js';
/* profile.html controller. All member text is rendered with textContent.
   A SessionGuard discards results that arrive for a user who is no longer
   the signed-in user (sign-out or account switch in another tab).
   Age policy (docs/account-age-policy.md): a tab with a known under-13 result
   never starts the account client here, and a stored legacy profile with an
   age under 13 is HELD — not shown, not editable, nothing written, converted
   or deleted. */
import { ACCOUNTS } from '../config.js';
import { getAccountService, accountsConfigured, hasStoredSession } from '../lib/account-service.js';
import { initials } from '../lib/profile-model.js';
import { fetchSchoolNames, currentSession } from '../lib/account-ops.js';
import { SessionGuard, loadOwnProfile, saveProfile, requestReset, logout } from '../lib/auth-flows.js';
import {
  populateBelts, populateSchools, wireNewSchool, readProfileForm, showFieldErrors, createStatus, withBusy,
} from '../lib/profile-form.js';
import { beltColor } from '../lib/belts.js';
import { createEligibilityStore, INELIGIBLE } from '../lib/age-gate.js';
import { h, replaceChildren } from '../lib/dom.js';

const $ = (id) => document.getElementById(id);
const msg = createStatus($('pmsg'));
const resetMsg = createStatus($('reset-msg'));
const guard = new SessionGuard(null);
let client = null;
let original = null;   // last saved profile values
let joinedAt = null;
let email = '';
const eligibility = createEligibilityStore();

const publicLinks = () => [
  h('a', { class: 'btn btn-primary', href: '/forms.html' }, 'Browse the forms library'),
  h('a', { class: 'btn btn-secondary', href: '/taegeuk-1.html' }, 'Open the Taegeuk Il Jang lesson'),
];

const HELD_TITLE = 'This account is on hold';
const HELD_TEXT =
  'TKDflow individual accounts are for ages 13 and over. The age recorded on this profile is under 13, so the profile '
  + 'can’t be viewed or edited here. Nothing has been deleted; the site owner will '
  + 'review held accounts before member accounts reopen. The forms library and lessons work without signing in.';

function showHeld() {
  eligibility.record('under-13');
  guard.switchTo(null);                         // invalidate pending profile/school responses
  original = null;
  email = '';
  joinedAt = null;
  replaceChildren($('edit-form'));               // drop any form fields from the page
  showState(HELD_TITLE, HELD_TEXT, publicLinks());
}

function showState(title, text, actions = []) {
  $('profile-wrap').hidden = true;
  $('profile-state').hidden = false;
  $('state-title').textContent = title;
  $('state-text').textContent = text;
  replaceChildren($('state-actions'), ...actions);
  replaceChildren($('hero-inner'), h('p', { text: title }));
}

const retryButton = (label, fn) => h('button', { type: 'button', class: 'btn btn-primary', on: { click: fn } }, label);

function renderProfile(p) {
  const color = beltColor(p.belt_level);
  replaceChildren($('hero-inner'),
    h('div', { class: 'avatar-lg', style: { background: color }, 'aria-hidden': 'true' }, initials(p.full_name)),
    h('div', { class: 'hero-info' },
      h('h2', { class: 'hero-name' }, p.full_name || 'New member'),
      h('p', { class: 'uname' }, `@${p.username}`),
      h('div', { class: 'hero-badges' },
        p.belt_level ? h('span', { class: 'hero-badge' }, p.belt_level) : null,
        p.school_name ? h('span', { class: 'hero-badge' }, p.school_name) : null),
    ));
  $('s-joined').textContent = joinedAt
    ? new Date(joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—';
  replaceChildren($('s-belt'), h('span', { class: 'belt-dot', style: { background: color }, 'aria-hidden': 'true' }), p.belt_level || '—');
  $('s-school').textContent = p.school_name || '—';
  $('s-age').textContent = p.age ? `${p.age} years` : '—';
  $('p-email').value = email;
}

function fillForm(p) {
  $('p-name').value = p.full_name || '';
  $('p-username').value = p.username || '';
  $('p-age').value = p.age ?? '';
  populateBelts($('p-belt'), p.belt_level || '');
  populateSchools($('p-school'), [], p.school_name || '');
  $('p-school-new').value = '';
  showFieldErrors('p', {});
}

async function loadSchools() {
  const t = guard.token();
  const { data, error } = await fetchSchoolNames(client);
  if (!guard.isCurrent(t)) return;
  // Re-populate around the CURRENT selection — never reset an edit in progress.
  populateSchools($('p-school'), data, $('p-school').value, { unavailable: Boolean(error) });
  const help = $('p-school-help');
  help.hidden = !error;
  help.textContent = error ? 'The school list could not load. Your current school is kept; you can still add a new one.' : '';
}

async function load() {
  msg.clear();
  showState('Loading your profile…', 'One moment.');
  const outcome = await loadOwnProfile(client, guard);
  if (outcome.kind === 'stale') return;                       // a newer load is in charge
  if (outcome.kind === 'signed-out') { location.assign('/auth.html'); return; }
  if (outcome.kind === 'error') { showState('Your profile could not be loaded', outcome.message, [retryButton('Try again', load)]); return; }
  if (outcome.kind === 'missing') { location.assign('/auth.html?mode=complete'); return; }
  if (outcome.kind === 'held') {
    showHeld();
    await logout(client, { stillSignedIn: () => hasStoredSession() });   // local sign-out attempt only; the record is untouched
    return;
  }
  const p = outcome.profile;
  joinedAt = p.created_at || null;
  original = { full_name: p.full_name, username: p.username, age: p.age ?? null, belt_level: p.belt_level ?? null, school_name: p.school_name ?? null };
  renderProfile(original);
  fillForm(original);
  $('profile-state').hidden = true;
  $('profile-wrap').hidden = false;
  loadSchools();
}

async function onSave(e) {
  e.preventDefault();
  msg.clear();
  showFieldErrors('p', {});
  await withBusy($('btn-save'), 'Saving…', async () => {
    const outcome = await saveProfile(client, guard, original, readProfileForm('p'));
    if (outcome.kind === 'stale') return;
    if (outcome.kind === 'held') {
      showHeld();
      await logout(client, { stillSignedIn: () => hasStoredSession() });
      return;
    }
    if (outcome.kind === 'saved') {
      original = outcome.profile;
      renderProfile(original);
      populateSchools($('p-school'), [...$('p-school').options].map((o) => o.value), original.school_name || '');
      $('p-school-new').value = '';
      msg.show('Profile updated.', 'success');
      return;
    }
    const first = showFieldErrors('p', outcome.fieldErrors || {});
    msg.show(outcome.message, outcome.kind === 'unchanged' ? 'info' : 'error');
    first?.focus();
  });
}

async function onReset() {
  resetMsg.clear();
  await withBusy($('btn-reset'), 'Sending…', async () => {
    const { session } = await currentSession(client);
    if (!session || session.user.id !== guard.userId) { resetMsg.show('Your session has ended. Sign in again to request a reset link.', 'error'); return; }
    const outcome = await requestReset(client, session.user.email, `${location.origin}/auth.html?mode=recovery`);
    resetMsg.show(outcome.kind === 'sent' ? 'Reset email sent. Check your inbox.' : outcome.message, outcome.kind === 'sent' ? 'success' : 'error');
  });
}

async function onLogout() {
  msg.clear();
  await withBusy($('btn-logout'), 'Logging out…', async () => {
    const outcome = await logout(client, { stillSignedIn: () => hasStoredSession() });
    if (outcome.kind !== 'signed-out') { msg.show(outcome.message, 'error'); return; }   // never redirect while a session remains
    location.assign('/');
  });
}

async function main() {
  // Known under-13 result in this tab: public routes only, before any profile
  // form is shown or the account client starts.
  if (eligibility.read() === INELIGIBLE) {
    showState('You can use TKDflow without an account', 'Accounts aren’t available for you, but the forms library and lessons are free to use without an account or entering account details.', publicLinks());
    return;
  }
  if (!accountsConfigured()) {
    showState('Member accounts are paused', ACCOUNTS.disabledReason, [
      h('a', { class: 'btn btn-primary', href: '/forms.html' }, 'Browse the forms library'),
      h('a', { class: 'btn btn-secondary', href: '/about.html' }, 'Project status'),
    ]);
    return;
  }
  showState('Loading your profile…', 'Connecting to the account service…');
  const service = await getAccountService();
  if (service.status !== 'ready') {
    showState('The account service is unavailable', service.reason, [retryButton('Try again', () => location.reload())]);
    return;
  }
  client = service.client;
  $('connect-google').hidden=!ACCOUNTS.googleEnabled;
  $('connect-google').addEventListener('click',async()=>{
    $('connect-google').disabled=true;
    const result=await bounded(()=>client.auth.linkIdentity({provider:'google',options:{redirectTo:`${location.origin}/profile.html`}}),{label:'Connecting Google'});
    if(result.error){$('google-link-status').textContent='Google could not be connected. Please try again.';$('connect-google').disabled=false;}
  });
  const { session, error } = await currentSession(client);
  if (error) { showState('We couldn’t check your sign-in', 'Please try again.', [retryButton('Try again', () => location.reload())]); return; }
  if (!session) { location.assign('/auth.html'); return; }
  guard.switchTo(session.user.id);
  email = session.user.email || '';

  client.auth.onAuthStateChange((event, next) => {
    setTimeout(() => {
      const nextId = next?.user?.id ?? null;
      if (!guard.switchTo(nextId)) return;
      if (!nextId) {
        showState('You have been signed out', 'Sign in again to see your profile.', [h('a', { class: 'btn btn-primary', href: '/auth.html' }, 'Sign in')]);
        return;
      }
      email = next.user.email || '';
      load();
    }, 0);
  });

  wireNewSchool($('p-school'), $('p-school-new-wrap'), $('p-school-new'));
  $('edit-form').addEventListener('submit', onSave);
  $('btn-reset').addEventListener('click', onReset);
  $('btn-logout').addEventListener('click', onLogout);
  await load();
}

main();
