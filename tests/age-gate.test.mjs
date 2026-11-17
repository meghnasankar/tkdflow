/* Pre-registration age screen: neutral classification, boundaries, and the
   non-identifying session flag that stops a simple reload/back retry. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AGE_POLICY, classifyAge, isUnderMinimumAge, createEligibilityStore, mayCreateAccount, authEntryPanel,
  isKnownUnderMinimumProfile, ELIGIBILITY_KEY, ELIGIBLE, INELIGIBLE,
} from '../js/lib/age-gate.js';

import { ACCOUNTS } from '../js/config.js';
import { accountsConfigured } from '../js/lib/account-service.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function memoryStorage() {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
  };
}
const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };

test('policy constants are the approved ones', () => {
  assert.deepEqual({ ...AGE_POLICY }, { individualMin: 13, adultMin: 18 });
});

test('boundaries: 12 / 13 and 17 / 18', () => {
  assert.equal(classifyAge('1').result, 'under-13');
  assert.equal(classifyAge('12').result, 'under-13');
  assert.equal(classifyAge('13').result, 'teen');
  assert.equal(classifyAge('17').result, 'teen');
  assert.equal(classifyAge('18').result, 'adult');
  assert.equal(classifyAge('120').result, 'adult');
  assert.equal(classifyAge(' 13 ').result, 'teen');
  assert.equal(classifyAge(13).result, 'teen');
});

test('malformed or missing answers are unknown — never eligible, never under-13', () => {
  for (const v of ['', '   ', undefined, null, '0', '00', '-5', '+13', '12.9', '13.0', '1e1', 'thirteen', '13 years', '121', '999', '1234', NaN, {}, [], '١٣']) {
    assert.equal(classifyAge(v).result, 'unknown', JSON.stringify(v) ?? String(v));
    assert.equal(isUnderMinimumAge(v), false);
  }
});

test('the result never carries the typed age', () => {
  for (const v of ['9', '15', '40']) assert.deepEqual(Object.keys(classifyAge(v)), ['result']);
});

test('only an explicit eligible flag allows account creation', () => {
  assert.equal(mayCreateAccount(ELIGIBLE), true);
  for (const v of [INELIGIBLE, null, undefined, '', 'Eligible', true, 'teen', 'adult']) assert.equal(mayCreateAccount(v), false, String(v));
});

test('session flag stores only eligible/ineligible, never the age', () => {
  const s = memoryStorage();
  const store = createEligibilityStore(s);
  assert.equal(store.read(), null);
  assert.equal(store.record(classifyAge('16').result), ELIGIBLE);
  assert.deepEqual([...s.map.entries()], [[ELIGIBILITY_KEY, 'eligible']]);
  const s2 = memoryStorage();
  createEligibilityStore(s2).record(classifyAge('45').result);
  assert.deepEqual([...s2.map.values()], ['eligible'], '13–17 and 18+ store the same value');
});

test('unknown answers record nothing', () => {
  const s = memoryStorage();
  const store = createEligibilityStore(s);
  assert.equal(store.record('unknown'), null);
  assert.equal(store.record(undefined), null);
  assert.equal(s.map.size, 0);
});

test('an under-13 result sticks: reload (new store, same storage) and a second answer cannot flip it', () => {
  const s = memoryStorage();
  const first = createEligibilityStore(s);
  assert.equal(first.record('under-13'), INELIGIBLE);
  assert.equal(first.record('adult'), INELIGIBLE, 'no second attempt in this page');
  const afterReload = createEligibilityStore(s);
  assert.equal(afterReload.read(), INELIGIBLE);
  assert.equal(afterReload.record('teen'), INELIGIBLE, 'no second attempt after reload/back');
  assert.equal(s.map.get(ELIGIBILITY_KEY), INELIGIBLE);
});

test('an eligible result can still become ineligible (e.g. an under-13 age typed later)', () => {
  const s = memoryStorage();
  const store = createEligibilityStore(s);
  store.record('adult');
  assert.equal(store.record('under-13'), INELIGIBLE);
  assert.equal(createEligibilityStore(s).read(), INELIGIBLE);
});

test('tampered or unexpected stored values are treated as not screened', () => {
  for (const v of ['ELIGIBLE', 'true', '1', '{"eligible":true}', '']) {
    const s = memoryStorage();
    s.setItem(ELIGIBILITY_KEY, v);
    assert.equal(createEligibilityStore(s).read(), null, v);
  }
});

test('blocked storage falls back to memory for this page and never throws', () => {
  const store = createEligibilityStore(throwing);
  assert.equal(store.read(), null);
  assert.equal(store.record('under-13'), INELIGIBLE);
  assert.equal(store.record('adult'), INELIGIBLE);
  assert.equal(createEligibilityStore(throwing).read(), null, 'documented limit: a reload with blocked storage shows the screen again');
  assert.equal(createEligibilityStore(undefined).read(), null);
});

test('auth page: neutral age screen comes before any account details', () => {
  const html = read('auth.html');
  const screen = html.match(/<section class="auth-panel" id="panel-age"[\s\S]*?<\/section>/)[0];
  // free entry: no checkbox, no select/radio presets, no prefilled value, no threshold hint
  assert.doesNotMatch(screen, /type="checkbox"|type="radio"|<select|\bvalue="|\bmin="|\bmax="|placeholder=/);
  assert.doesNotMatch(screen, /\b13\b|\b18\b|over|older|younger|under|adult|child/i, 'no wording that hints at the answer');
  assert.match(screen, /<label for="age-screen">How old are you\?<\/label>/);
  assert.match(screen, /not saved/);
  // the guidance route collects nothing
  const guidance = html.match(/<section class="auth-panel" id="panel-age-guidance"[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(guidance, /<form|<input|<select|<textarea|data-action="google"/);
  assert.match(guidance, /href="\/forms\.html"/);
  assert.match(guidance, /href="\/taegeuk-1\.html"/);
  assert.match(guidance, /not available yet/);
  // order: the age panel is in the page before the registration form, and the controller gates register/Google/complete
  assert.ok(html.indexOf('id="panel-age"') < html.indexOf('id="form-register"'));
  const js = read('js/pages/auth.js');
  assert.match(js, /if \(target === 'register'\) \{ requireAge\(showRegister\); return; \}/);
  assert.match(js, /else if \(initial === 'register'\) requireAge\(showRegister\)/);
  for (const call of ['register(client', 'completeProfile(client', 'startGoogle(client', 'routeSignedIn(client']) {
    const at = js.indexOf(call);
    assert.ok(at > 0, call);
    assert.match(js.slice(at, at + 400), /eligibility: eligibility\.read\(\)/, `${call} passes the session flag`);
  }
  assert.doesNotMatch(js, /localStorage/, 'the screen result is per tab (sessionStorage), not persisted');
});

test('profile age inputs carry the 13–99 range everywhere', () => {
  for (const [file, id] of [['auth.html', 'reg-age'], ['auth.html', 'cp-age'], ['profile.html', 'p-age']]) {
    assert.match(read(file), new RegExp(`id="${id}" min="13" max="99"`), `${file} #${id}`);
  }
});

test('production activation retains the approved age model and public-only credentials', () => {
  assert.equal(ACCOUNTS.enabled, true);
  assert.equal(ACCOUNTS.signupEnabled, true);
  assert.equal(ACCOUNTS.googleEnabled, true);
  assert.equal(ACCOUNTS.supabaseUrl, 'https://ffkwwfwrqtwejyrnkxey.supabase.co');
  assert.match(ACCOUNTS.supabaseAnonKey, /^sb_publishable_/);
  assert.equal(accountsConfigured(), true);
  const policy = read('docs/account-age-policy.md');
  assert.match(policy, /## Production activation/);
  assert.match(policy, /not COPPA compliance/i);
  assert.match(policy, /https:\/\/www\.ftc\.gov\/business-guidance\/resources\/complying-coppa-frequently-asked-questions/);
});

test('privacy notice explains the age rules without promising child profiles or compliance', () => {
  const html = read('about.html');
  const section = html.match(/<section id="privacy"[\s\S]*?<\/section>/)[0];
  for (const rule of [/aged 13 and over/, /13 to 17/, /18 or over/, /do not exist yet/, /private teen or adult band/, /school membership stays private/, /private admin review queue/, /Approved school details/, /Pending submissions/, /Retention/]) assert.match(section, rule);
  assert.doesNotMatch(section, /not been published|not a privacy policy|COPPA[- ]compliant|complies with/i);
});

/** Temporarily replace globalThis.sessionStorage with a getter (restored afterwards). */
function withSessionStorageGetter(get, fn) {
  const before = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get });
  try { return fn(); } finally {
    if (before) Object.defineProperty(globalThis, 'sessionStorage', before);
    else delete globalThis.sessionStorage;
  }
}

test('default store survives a sessionStorage getter that throws SecurityError', () => {
  let reads = 0;
  withSessionStorageGetter(() => { reads += 1; throw new DOMException('The operation is insecure.', 'SecurityError'); }, () => {
    const store = createEligibilityStore();           // must not throw on creation
    assert.equal(store.read(), null);
    assert.equal(store.record('under-13'), INELIGIBLE);
    assert.equal(store.read(), INELIGIBLE, 'memory keeps the result for this page');
    assert.equal(store.record('adult'), INELIGIBLE);
    assert.equal(createEligibilityStore().read(), null, 'documented limit: no persistence without storage');
  });
  assert.ok(reads > 0, 'the getter really was consulted (inside try)');
});

test('default store uses real sessionStorage when it is available', () => {
  const s = memoryStorage();
  withSessionStorageGetter(() => s, () => {
    createEligibilityStore().record('teen');
    assert.equal(createEligibilityStore().read(), ELIGIBLE);
  });
  assert.equal(s.map.get(ELIGIBILITY_KEY), ELIGIBLE);
});

test('a storage source function that throws, or returns nothing, is handled', () => {
  const boom = createEligibilityStore(() => { throw new Error('denied'); });
  assert.equal(boom.read(), null);
  assert.equal(boom.record('under-13'), INELIGIBLE);
  const none = createEligibilityStore(() => null);
  assert.equal(none.record('adult'), ELIGIBLE);
  assert.equal(none.read(), ELIGIBLE);
});

test('entry routing: a known under-13 tab sees guidance for EVERY auth mode', () => {
  for (const mode of ['login', 'register', 'complete', 'forgot', 'recovery']) {
    assert.equal(authEntryPanel(INELIGIBLE, mode), 'age-guidance', mode);
  }
});

test('entry routing: unscreened/eligible visitors keep sign-in, reset and recovery; sign-up needs the screen', () => {
  for (const state of [null, undefined, ELIGIBLE]) {
    for (const mode of ['login', 'forgot', 'recovery', 'complete']) assert.equal(authEntryPanel(state, mode), mode, `${state} ${mode}`);
  }
  assert.equal(authEntryPanel(null, 'register'), 'age');
  assert.equal(authEntryPanel('bogus', 'register'), 'age');
  assert.equal(authEntryPanel(ELIGIBLE, 'register'), 'register');
});

test('known under-13 profile detection is strict', () => {
  for (const age of [0, 1, 5, 9, 12, '9', '12']) assert.equal(isKnownUnderMinimumProfile({ age }), true, String(age));
  for (const age of [13, 17, 18, 99, 100, '13', null, undefined, '', ' 9', 9.5, -1, NaN]) assert.equal(isKnownUnderMinimumProfile({ age }), false, String(age));
  assert.equal(isKnownUnderMinimumProfile(null), false);
});

test('pages apply the known-under-13 rule before forms or the account client', () => {
  const auth = read('js/pages/auth.js');
  const main = auth.slice(auth.indexOf('async function main()'));
  const guard = main.indexOf("authEntryPanel(eligibility.read(), mode) === 'age-guidance'");
  assert.ok(guard > 0, 'main() checks the tab result');
  assert.ok(guard < main.indexOf('accountsConfigured()'), 'before the paused/enabled branch');
  assert.ok(guard < main.indexOf('showPanel(initial)'), 'before any requested form is shown');
  assert.ok(guard < main.indexOf('getAccountService()'), 'before the account client starts');
  const gotoBody = auth.slice(auth.indexOf('function goto('), auth.indexOf('function showRegister'));
  assert.ok(gotoBody.indexOf('age-guidance') < gotoBody.indexOf('showPanel(target)'), 'in-page links (Log in, Forgot password) too');
  assert.match(auth, /outcome\.kind === 'ineligible' \|\| outcome\.kind === 'held'/);

  const profile = read('js/pages/profile.js');
  const pmain = profile.slice(profile.indexOf('async function main()'));
  const pguard = pmain.indexOf('eligibility.read() === INELIGIBLE');
  assert.ok(pguard > 0 && pguard < pmain.indexOf('getAccountService()') && pguard < pmain.indexOf('accountsConfigured()'));
  assert.match(profile, /outcome\.kind === 'held'\) \{\s*showHeld\(\);/);
  assert.doesNotMatch(profile, /\.delete\(|deleteUser|admin\./, 'holding never deletes');
});

test('public-route copy does not overstate data collection', () => {
  for (const file of ['auth.html', 'about.html', 'js/pages/profile.js']) {
    const text = read(file);
    assert.doesNotMatch(text, /no personal (details|data)/i, file);
  }
  assert.match(read('auth.html'), /without an account or entering account details/);
  assert.match(read('about.html'), /without creating an account or entering account details/);
});

test('only the delivery-tested public support alias is published', () => {
  assert.match(read('about.html'), /href="mailto:support@tkdflow\.com"/);
  for (const file of ['auth.html', 'profile.html', 'founder.html']) assert.doesNotMatch(read(file), /mailto:/i, file);
  for (const file of ['docs/account-age-policy.md','docs/audit-tracker.md','docs/RELEASE.md']) assert.match(read(file), /Support forwarding delivery was confirmed/);
});
