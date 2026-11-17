/* Flow-level tests with fake Supabase clients: hanging calls, server
   failures, partial failures and user switches during in-flight requests. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  SessionGuard, signIn, register, completeProfile, requestReset, updatePassword, logout, routeSignedIn,
  loadOwnProfile, saveProfile, startGoogle,
} from '../js/lib/auth-flows.js';
import { bounded } from '../js/lib/account-ops.js';
import { withBusy, schoolOptions } from '../js/lib/profile-form.js';
import { NEW_SCHOOL } from '../js/lib/profile-model.js';

const MS = 30;                     // short deadline for hang tests
const never = () => new Promise(() => {});
const A = 'user-a'; const B = 'user-b';
const session = (id = A, meta = {}) => ({ user: { id, email: `${id}@example.test`, user_metadata: meta } });
const ok = (data = null) => ({ data, error: null });
const fail = (error) => ({ data: null, error });

function chain(resolve) {
  const run = () => Promise.resolve().then(resolve);
  const c = { select: () => c, eq: () => c, order: () => c, maybeSingle: run, then: (a, b) => run().then(a, b) };
  return c;
}

function fakeClient(h = {}) {
  const calls = [];
  const rec = (name, fn) => (...args) => { calls.push([name, ...args]); return fn(...args); };
  const handler = (key, fallback) => h[key] || fallback;
  return {
    calls,
    from: (table) => ({
      select: rec(`${table}.select`, () => chain(handler(`${table}.select`, () => ok(null)))),
      insert: rec(`${table}.insert`, (row) => chain(() => handler(`${table}.insert`, () => ok())(row))),
      upsert: rec(`${table}.upsert`, (row) => chain(() => handler(`${table}.upsert`, () => ok())(row))),
      update: rec(`${table}.update`, (row) => chain(() => handler(`${table}.update`, () => ok([{ id: A }]))(row))),
    }),
    rpc: rec('rpc', (name, args) => chain(() => handler('rpc', () => ok(true))(args))),
    auth: {
      signInWithPassword: rec('signIn', (...a) => handler('signIn', async () => ok({ session: session() }))(...a)),
      signUp: rec('signUp', (...a) => handler('signUp', async () => ok({ session: session(), user: { id: A } }))(...a)),
      resetPasswordForEmail: rec('reset', (...a) => handler('reset', async () => ok({}))(...a)),
      updateUser: rec('updateUser', (...a) => handler('updateUser', async () => ok({ user: {} }))(...a)),
      getSession: rec('getSession', (...a) => handler('getSession', async () => ok({ session: session() }))(...a)),
      signOut: rec('signOut', (...a) => handler('signOut', async () => ({ error: null }))(...a)),
      signInWithOAuth: rec('oauth', (...a) => handler('oauth', async () => ok({}))(...a)),
    },
  };
}

const goodRaw = { full_name: 'Min Ji', username: 'min_ji', age: '', belt_level: 'Blue Belt (5th Gup)', school_choice: '' };
const timed = async (fn) => { const t = Date.now(); const r = await fn(); return [r, Date.now() - t]; };

describe('bounded()', () => {
  test('hanging, throwing and plain results all resolve', async () => {
    const [r, ms] = await timed(() => bounded(never, { ms: MS, label: 'X' }));
    assert.equal(r.error.code, 'timeout');
    assert.ok(ms < 500);
    assert.equal((await bounded(() => { throw new Error('boom'); })).error.message, 'boom');
    assert.deepEqual(await bounded(() => 5), { data: 5, error: null });
  });

  test('withBusy always restores a button when the action is bounded', async () => {
    const button = { textContent: 'Save', disabled: false, setAttribute() {}, removeAttribute() {} };
    await withBusy(button, 'Saving…', () => bounded(never, { ms: MS }));
    assert.equal(button.textContent, 'Save');
    assert.equal(button.disabled, false);
  });
});

describe('sign in', () => {
  test('validates email format before calling the service', async () => {
    const c = fakeClient();
    assert.equal((await signIn(c, { email: 'nope', password: 'x' })).kind, 'invalid');
    assert.equal(c.calls.length, 0);
  });
  test('wrong password, outage and hang give clear errors', async () => {
    assert.match((await signIn(fakeClient({ signIn: async () => fail({ message: 'Invalid login credentials' }) }), { email: 'a@b.co', password: 'x' })).message, /Incorrect/);
    assert.match((await signIn(fakeClient({ signIn: async () => fail({ message: 'Failed to fetch' }) }), { email: 'a@b.co', password: 'x' })).message, /could not be reached/);
    const [r, ms] = await timed(() => signIn(fakeClient({ signIn: never }), { email: 'a@b.co', password: 'x' }, { ms: MS }));
    assert.equal(r.kind, 'error');
    assert.match(r.message, /took too long/);
    assert.ok(ms < 500);
  });
  test('success returns the session', async () => {
    assert.equal((await signIn(fakeClient(), { email: 'a@b.co', password: 'x' })).kind, 'signed-in');
  });
});

describe('registration', () => {
  const input = (over = {}) => ({ raw: goodRaw, email: 'new@example.test', password: 'longenough1', confirm: 'longenough1', redirectTo: 'x', eligibility: 'eligible', ...over });

  test('invalid fields and passwords never reach the service', async () => {
    const c = fakeClient();
    assert.equal((await register(c, input({ raw: { ...goodRaw, username: 'Bad Name' } }))).fieldErrors.username !== undefined, true);
    assert.equal((await register(c, input({ email: 'x' }))).field, 'email');
    assert.match((await register(c, input({ confirm: 'other' }))).message, /do not match/);
    assert.equal(c.calls.length, 0);
  });
  test('taken username is reported before creating an account', async () => {
    const c = fakeClient({ rpc: () => ok(false) });
    const r = await register(c, input());
    assert.equal(r.kind, 'invalid');
    assert.ok(r.fieldErrors.username);
    assert.ok(!c.calls.some(([n]) => n === 'signUp'));
  });
  test('email confirmation required → check-email (no profile write)', async () => {
    const c = fakeClient({ signUp: async () => ok({ session: null, user: { id: A } }) });
    assert.equal((await register(c, input())).kind, 'check-email');
    assert.ok(!c.calls.some(([n]) => n === 'profiles.upsert'));
  });
  test('confirmation off → profile provisioned → profile page', async () => {
    const c = fakeClient();
    assert.equal((await register(c, input())).kind, 'profile');
    const up = c.calls.find(([n]) => n === 'profiles.upsert');
    assert.equal(up[1].id, A);
    assert.equal(up[1].username, 'min_ji');
  });
  test('partial failure: account created but username raced → completion form with field error', async () => {
    const c = fakeClient({ 'profiles.upsert': () => fail({ code: '23505', message: 'dup' }) });
    const r = await register(c, input());
    assert.equal(r.kind, 'complete');
    assert.ok(r.fieldErrors.username);
    assert.equal(r.values.username, 'min_ji');
  });
  test('custom school is saved only in the private profile, never the public directory', async () => {
    const raw = { ...goodRaw, school_choice: NEW_SCHOOL, school_new: 'Private School Entry' };
    const c = fakeClient({ 'schools.insert': () => fail({ code: '42501' }) });
    assert.equal((await register(c, input({ raw }))).kind, 'profile');
    assert.ok(!c.calls.some(([name]) => name === 'schools.insert'));
    assert.equal(c.calls.find(([name]) => name === 'profiles.upsert')[1].school_name, 'Private School Entry');
  });
  test('hanging sign-up resolves to an error', async () => {
    const [r, ms] = await timed(() => register(fakeClient({ signUp: never }), input(), { ms: MS }));
    assert.equal(r.kind, 'error');
    assert.ok(ms < 500);
  });
});

describe('completion and routing', () => {
  test('profile lookup failure is an error state, not the completion form', async () => {
    const r = await routeSignedIn(fakeClient({ 'profiles.select': () => fail({ message: 'Failed to fetch' }) }), session());
    assert.equal(r.kind, 'error');
    const [h2] = await timed(() => routeSignedIn(fakeClient({ 'profiles.select': never }), session(), { ms: MS }));
    assert.equal(h2.kind, 'error');
  });
  test('existing profile → profile page; missing → completion (provisioned from sign-up data when valid)', async () => {
    assert.equal((await routeSignedIn(fakeClient({ 'profiles.select': () => ok({ id: A }) }), session())).kind, 'profile');
    assert.equal((await routeSignedIn(fakeClient(), session(), { eligibility: 'eligible' })).kind, 'complete');
    const pending = { pending_profile: { full_name: 'Min', username: 'min_ji', belt_level: 'Green Belt (7th Gup)' } };
    const c = fakeClient();
    assert.equal((await routeSignedIn(c, session(A, pending), { eligibility: 'eligible' })).kind, 'profile');
    assert.ok(c.calls.some(([n]) => n === 'profiles.upsert'));
  });
  test('completeProfile handles an ended or hanging session', async () => {
    assert.equal((await completeProfile(fakeClient({ getSession: async () => ok({ session: null }) }), goodRaw, { eligibility: 'eligible' })).kind, 'session-ended');
    const [r] = await timed(() => completeProfile(fakeClient({ getSession: never }), goodRaw, { ms: MS, eligibility: 'eligible' }));
    assert.equal(r.kind, 'error');
  });
});

describe('password reset and recovery', () => {
  test('email format is validated', async () => {
    const c = fakeClient();
    assert.equal((await requestReset(c, 'not-an-email', 'x')).kind, 'invalid');
    assert.equal(c.calls.length, 0);
  });
  test('genuine service failures are surfaced, not reported as sent', async () => {
    for (const err of [{ message: 'Error sending recovery email', status: 500 }, { message: 'Failed to fetch' }, { message: 'email rate limit exceeded' }]) {
      const r = await requestReset(fakeClient({ reset: async () => fail(err) }), 'a@b.co', 'x');
      assert.equal(r.kind, 'error', err.message);
    }
    assert.equal((await requestReset(fakeClient({ reset: never }), 'a@b.co', 'x', { ms: MS })).kind, 'error');
  });
  test('success wording does not reveal whether the account exists', async () => {
    const r = await requestReset(fakeClient(), 'a@b.co', 'x');
    assert.equal(r.kind, 'sent');
    assert.match(r.message, /If an account exists/);
  });
  test('updatePassword: mismatch, failure, success with verified sign-out', async () => {
    assert.equal((await updatePassword(fakeClient(), 'longenough1', 'nope')).kind, 'invalid');
    assert.equal((await updatePassword(fakeClient({ updateUser: async () => fail({ message: 'x' }) }), 'longenough1', 'longenough1')).kind, 'error');
    const r = await updatePassword(fakeClient(), 'longenough1', 'longenough1', { stillSignedIn: () => false });
    assert.deepEqual(r, { kind: 'updated', signedOut: true });
    const r2 = await updatePassword(fakeClient(), 'longenough1', 'longenough1', { stillSignedIn: () => true });
    assert.equal(r2.signedOut, false);
  });
});

describe('logout', () => {
  test('reports failure while a session remains — never a silent success', async () => {
    const r = await logout(fakeClient({ signOut: async () => ({ error: { message: 'Failed to fetch' } }) }), { stillSignedIn: () => true });
    assert.equal(r.kind, 'error');
    const r2 = await logout(fakeClient({ signOut: never }), { stillSignedIn: () => true, ms: MS });
    assert.equal(r2.kind, 'error');
  });
  test('local session gone → signed out even if the server could not be told', async () => {
    const r = await logout(fakeClient({ signOut: async () => { throw new Error('offline'); } }), { stillSignedIn: () => false });
    assert.deepEqual(r, { kind: 'signed-out', serverRevoked: false });
    assert.deepEqual(await logout(fakeClient(), { stillSignedIn: () => false }), { kind: 'signed-out', serverRevoked: true });
  });
  test('uses local scope', async () => {
    const c = fakeClient();
    await logout(c, { stillSignedIn: () => false });
    assert.deepEqual(c.calls.find(([n]) => n === 'signOut')[1], { scope: 'local' });
  });
});

describe('profile page data and user switches', () => {
  const original = { full_name: 'Min Ji', username: 'min_ji', age: null, belt_level: 'Blue Belt (5th Gup)', school_name: 'Unlisted Dojang' };
  const raw = (over = {}) => ({ full_name: 'Min Ji', username: 'min_ji', age: '', belt_level: 'Blue Belt (5th Gup)', school_choice: 'Unlisted Dojang', ...over });

  test('a lookup that finishes after the user changed is discarded', async () => {
    const guard = new SessionGuard(A);
    let release;
    const c = fakeClient({ 'profiles.select': () => new Promise((r) => { release = () => r(ok({ id: A, full_name: 'A' })); }) });
    const pending = loadOwnProfile(c, guard);
    await new Promise((r) => setTimeout(r, 5));
    guard.switchTo(B);
    release();
    assert.equal((await pending).kind, 'stale');
    assert.equal((await loadOwnProfile(fakeClient({ 'profiles.select': () => ok({ id: B }) }), guard)).kind, 'ok');
  });

  test('a save whose response arrives after a user switch is not applied', async () => {
    const guard = new SessionGuard(A);
    let release;
    const c = fakeClient({ 'profiles.update': () => new Promise((r) => { release = () => r(ok([{ id: A }])); }) });
    const pending = saveProfile(c, guard, original, raw({ full_name: 'Changed' }));
    await new Promise((r) => setTimeout(r, 5));
    guard.switchTo(B);
    release();
    assert.equal((await pending).kind, 'stale');
  });

  test('session belonging to another user ends the save before writing', async () => {
    const guard = new SessionGuard(A);
    const c = fakeClient({ getSession: async () => ok({ session: session(B) }) });
    assert.equal((await saveProfile(c, guard, original, raw({ full_name: 'X' }))).kind, 'session-ended');
    assert.ok(!c.calls.some(([n]) => n === 'profiles.update'));
  });

  test('only changed fields are written; unlisted school is preserved', async () => {
    const guard = new SessionGuard(A);
    const c = fakeClient();
    const r = await saveProfile(c, guard, original, raw({ full_name: 'Min-Ji Kim' }));
    assert.equal(r.kind, 'saved');
    assert.deepEqual(c.calls.find(([n]) => n === 'profiles.update')[1], { full_name: 'Min-Ji Kim' });
    assert.equal(r.profile.school_name, 'Unlisted Dojang');
  });

  test('explicitly choosing “No school” clears it', async () => {
    const r = await saveProfile(fakeClient(), new SessionGuard(A), original, raw({ school_choice: '' }));
    assert.deepEqual(r.changes, { school_name: null });
  });

  test('unchanged, RLS-blocked (0 rows), duplicate and hanging saves', async () => {
    const g = () => new SessionGuard(A);
    assert.equal((await saveProfile(fakeClient(), g(), original, raw())).kind, 'unchanged');
    assert.equal((await saveProfile(fakeClient({ 'profiles.update': () => ok([]) }), g(), original, raw({ full_name: 'X' }))).kind, 'error');
    assert.equal((await saveProfile(fakeClient({ 'profiles.update': () => fail({ code: '23505' }) }), g(), original, raw({ username: 'other' }))).kind, 'invalid');
    const [r, ms] = await timed(() => saveProfile(fakeClient({ 'profiles.update': never }), g(), original, raw({ full_name: 'X' }), { ms: MS }));
    assert.equal(r.kind, 'error');
    assert.ok(ms < 500);
  });

  test('Google start failure is reported', async () => {
    assert.equal((await startGoogle(fakeClient({ oauth: async () => fail({ message: 'provider is not enabled' }) }), 'x', { eligibility: 'eligible' })).kind, 'error');
  });
});

describe('age policy gates (no account-creating call before an eligible age screen)', () => {
  const ACCOUNT_CALLS = ['signUp', 'rpc', 'schools.insert', 'profiles.upsert', 'profiles.update', 'oauth'];
  const touched = (c) => c.calls.map(([n]) => n).filter((n) => ACCOUNT_CALLS.includes(n));
  const reg = (over = {}) => ({ raw: { ...goodRaw, school_choice: NEW_SCHOOL, school_new: 'Riverside TKD' }, email: 'new@example.test', password: 'longenough1', confirm: 'longenough1', redirectTo: 'x', ...over });
  const UNSCREENED = [undefined, null, '', 'unknown', 'ELIGIBLE', 'yes', true, 1, {}];

  test('sign-up, username check and school write need an explicit eligible result', async () => {
    for (const eligibility of UNSCREENED) {
      const c = fakeClient();
      assert.deepEqual(await register(c, reg({ eligibility })), { kind: 'age-screen' }, String(eligibility));
      assert.deepEqual(c.calls, [], `no client call at all for eligibility=${String(eligibility)}`);
    }
    const blocked = fakeClient();
    assert.deepEqual(await register(blocked, reg({ eligibility: 'ineligible' })), { kind: 'ineligible' });
    assert.deepEqual(blocked.calls, []);
  });

  test('an under-13 profile age stops sign-up before any call; 13 and blank proceed', async () => {
    for (const age of ['1', '12', ' 12 ', '012']) {
      const c = fakeClient();
      assert.deepEqual(await register(c, reg({ eligibility: 'eligible', raw: { ...goodRaw, age } })), { kind: 'ineligible' }, age);
      assert.deepEqual(c.calls, []);
    }
    for (const age of ['13', '17', '18', '']) {
      const c = fakeClient();
      assert.equal((await register(c, reg({ eligibility: 'eligible', raw: { ...goodRaw, age } }))).kind, 'profile', age);
      assert.ok(touched(c).includes('signUp'));
    }
    // malformed ages are ordinary field errors (never a call, never silently dropped)
    for (const age of ['12.5', '-13', 'thirteen', '100', '0']) {
      const c = fakeClient();
      const r = await register(c, reg({ eligibility: 'eligible', raw: { ...goodRaw, age } }));
      assert.equal(r.kind, 'invalid', age);
      assert.ok(r.fieldErrors.age, age);
      assert.deepEqual(c.calls, []);
    }
  });

  test('Google cannot be used to create an account before the age screen', async () => {
    for (const eligibility of UNSCREENED) {
      const c = fakeClient();
      assert.deepEqual(await startGoogle(c, 'x', { eligibility }), { kind: 'age-screen' });
      assert.deepEqual(c.calls, []);
    }
    const blocked = fakeClient();
    assert.deepEqual(await startGoogle(blocked, 'x', { eligibility: 'ineligible' }), { kind: 'ineligible' });
    assert.deepEqual(blocked.calls, []);
    const c = fakeClient();
    assert.equal((await startGoogle(c, 'https://tkdflow.com/auth.html?mode=complete', { eligibility: 'eligible' })).kind, 'redirecting');
    assert.deepEqual(touched(c), ['oauth']);
  });

  test('finishing a new profile (e.g. after Google) is gated the same way', async () => {
    const raw = { ...goodRaw, school_choice: NEW_SCHOOL, school_new: 'Riverside TKD' };
    for (const eligibility of UNSCREENED) {
      const c = fakeClient();
      assert.deepEqual(await completeProfile(c, raw, { eligibility }), { kind: 'age-screen' });
      assert.deepEqual(c.calls, []);
    }
    const young = fakeClient();
    assert.deepEqual(await completeProfile(young, { ...raw, age: '12' }, { eligibility: 'eligible' }), { kind: 'ineligible' });
    assert.deepEqual(young.calls, []);
    const c = fakeClient();
    assert.equal((await completeProfile(c, { ...raw, age: '13' }, { eligibility: 'eligible' })).kind, 'profile');
    assert.deepEqual(touched(c), ['rpc', 'profiles.upsert']);
  });

  test('routing a signed-in user: existing members are not gated; new profiles are', async () => {
    // existing member → profile page whatever the session flag says (sign-in is not account creation)
    for (const eligibility of [undefined, 'ineligible', 'eligible']) {
      const c = fakeClient({ 'profiles.select': () => ok({ id: A }) });
      assert.equal((await routeSignedIn(c, session(), { eligibility })).kind, 'profile');
      assert.deepEqual(touched(c), []);
    }
    const pending = { pending_profile: { full_name: 'Min', username: 'min_ji', belt_level: 'Green Belt (7th Gup)', school_name: 'Riverside TKD' } };
    const unscreened = fakeClient();
    const r = await routeSignedIn(unscreened, session(A, pending));
    assert.equal(r.kind, 'age-screen');
    assert.equal(r.values.username, 'min_ji', 'values kept for the completion form after the screen');
    assert.deepEqual(touched(unscreened), [], 'no profile or school written without the screen');
    const blocked = fakeClient();
    assert.equal((await routeSignedIn(blocked, session(A, pending), { eligibility: 'ineligible' })).kind, 'ineligible');
    assert.deepEqual(touched(blocked), []);
    const legacyChild = fakeClient();
    const childMeta = { pending_profile: { ...pending.pending_profile, age: 9 } };
    assert.equal((await routeSignedIn(legacyChild, session(A, childMeta), { eligibility: 'eligible' })).kind, 'ineligible');
    assert.deepEqual(touched(legacyChild), []);
  });

  test('password sign-in, reset and logout are unchanged by the age screen', async () => {
    const c = fakeClient();
    assert.equal((await signIn(c, { email: 'a@b.co', password: 'x' })).kind, 'signed-in');
    assert.equal((await requestReset(c, 'a@b.co', 'x')).kind, 'sent');
    assert.equal((await updatePassword(c, 'longenough1', 'longenough1', { stillSignedIn: () => false })).kind, 'updated');
    assert.equal((await logout(c, { stillSignedIn: () => false })).kind, 'signed-out');
    assert.deepEqual(touched(c), []);
  });

  test('an existing member cannot save an under-13 age; 13 saves', async () => {
    const original = { full_name: 'Min Ji', username: 'min_ji', age: null, belt_level: 'Blue Belt (5th Gup)', school_name: null };
    const raw = (age) => ({ full_name: 'Min Ji', username: 'min_ji', age, belt_level: 'Blue Belt (5th Gup)', school_choice: '' });
    const c = fakeClient();
    const r = await saveProfile(c, new SessionGuard(A), original, raw('12'));
    assert.deepEqual(r, { kind: 'held' }, 'a newly disclosed under-13 age holds the account before any call');
    assert.deepEqual(c.calls, []);
    const legacyClient = fakeClient();
    const legacy = await saveProfile(legacyClient, new SessionGuard(A), { ...original, age: 9 }, raw('15'));
    assert.deepEqual(legacy, { kind: 'held' }, 'a held legacy profile cannot be edited, even to a 13+ age');
    assert.deepEqual(legacyClient.calls, []);
    const okSave = await saveProfile(fakeClient(), new SessionGuard(A), original, raw('13'));
    assert.deepEqual(okSave.changes, { age: 13 });
  });
});

describe('known legacy under-13 profiles are held (no conversion, no deletion, no writes)', () => {
  const WRITES = ['signUp', 'rpc', 'schools.insert', 'profiles.upsert', 'profiles.update', 'oauth', 'signOut'];
  const writes = (c) => c.calls.map(([n]) => n).filter((n) => WRITES.includes(n));
  const stored = (over) => ({ id: A, full_name: 'Legacy', username: 'legacy_one', belt_level: 'Blue Belt (5th Gup)', school_name: 'Old Dojang', ...over });

  test('routeSignedIn: stored age under 13 → held, whatever the tab flag', async () => {
    for (const age of [5, 9, 12]) {
      for (const eligibility of [undefined, 'eligible', 'ineligible']) {
        const c = fakeClient({ 'profiles.select': () => ok(stored({ age })) });
        assert.deepEqual(await routeSignedIn(c, session(), { eligibility }), { kind: 'held' }, `age ${age}, ${eligibility}`);
        assert.deepEqual(writes(c), []);
      }
    }
  });

  test('routeSignedIn: existing 13+ and blank-age members still reach their profile', async () => {
    for (const age of [13, 17, 18, 64, null, undefined]) {
      const c = fakeClient({ 'profiles.select': () => ok(stored({ age })) });
      assert.equal((await routeSignedIn(c, session())).kind, 'profile', String(age));
      assert.deepEqual(writes(c), []);
    }
  });

  test('loadOwnProfile: a held profile is never returned to the edit form', async () => {
    const held = await loadOwnProfile(fakeClient({ 'profiles.select': () => ok(stored({ age: 11 })) }), new SessionGuard(A));
    assert.deepEqual(held, { kind: 'held' });
    assert.ok(!('profile' in held));
    const okLoad = await loadOwnProfile(fakeClient({ 'profiles.select': () => ok(stored({ age: 13 })) }), new SessionGuard(A));
    assert.equal(okLoad.kind, 'ok');
    assert.equal(okLoad.profile.age, 13);
    const blank = await loadOwnProfile(fakeClient({ 'profiles.select': () => ok(stored({ age: null })) }), new SessionGuard(A));
    assert.equal(blank.kind, 'ok', 'blank age is not held — it goes to the owner review, not an automatic decision');
  });

  test('saveProfile: no session check, username RPC, school insert or update for a held profile', async () => {
    const c = fakeClient();
    const raw = { full_name: 'Changed', username: 'new_name', age: '', belt_level: 'Blue Belt (5th Gup)', school_choice: NEW_SCHOOL, school_new: 'New Dojang' };
    assert.deepEqual(await saveProfile(c, new SessionGuard(A), stored({ age: 12 }), raw), { kind: 'held' });
    assert.deepEqual(c.calls, []);
  });

  test('stringified stored ages are held too; non-integer junk is left to the owner review', async () => {
    const str = fakeClient({ 'profiles.select': () => ok(stored({ age: '9' })) });
    assert.equal((await routeSignedIn(str, session())).kind, 'held');
    for (const age of [9.5, NaN]) {
      const c = fakeClient({ 'profiles.select': () => ok(stored({ age })) });
      assert.equal((await routeSignedIn(c, session())).kind, 'profile', `${String(age)} is not a known under-13 age`);
    }
  });
});

describe('school list arriving late', () => {
  test('keeps “Add my school”, “No school” and unlisted selections', () => {
    const names = ['Alpha TKD', 'Beta TKD'];
    assert.equal(schoolOptions(names, NEW_SCHOOL).value, NEW_SCHOOL);
    assert.equal(schoolOptions(names, '').value, '');
    const unlisted = schoolOptions(names, 'Unlisted Dojang');
    assert.equal(unlisted.value, 'Unlisted Dojang');
    assert.ok(unlisted.options.some((o) => o.value === 'Unlisted Dojang'));
    assert.equal(schoolOptions([], 'Alpha TKD', { unavailable: true }).options[0].label.includes('unavailable'), true);
    assert.equal(schoolOptions(names, NEW_SCHOOL).options.filter((o) => o.value === NEW_SCHOOL).length, 1);
  });
});
