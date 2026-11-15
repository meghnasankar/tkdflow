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
  const input = (over = {}) => ({ raw: goodRaw, email: 'new@example.test', password: 'longenough1', confirm: 'longenough1', redirectTo: 'x', ...over });

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
  test('new school: duplicate counts as success; other failure stops before saving', async () => {
    const raw = { ...goodRaw, school_choice: NEW_SCHOOL, school_new: 'Riverside TKD' };
    const dup = fakeClient({ 'schools.insert': () => fail({ code: '23505' }) });
    assert.equal((await register(dup, input({ raw }))).kind, 'profile');
    const broken = fakeClient({ 'schools.insert': () => fail({ code: '500', message: 'oops' }) });
    const r = await register(broken, input({ raw }));
    assert.equal(r.kind, 'complete');
    assert.match(r.message, /school could not be added/);
    assert.ok(!broken.calls.some(([n]) => n === 'profiles.upsert'));
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
    assert.equal((await routeSignedIn(fakeClient(), session())).kind, 'complete');
    const pending = { pending_profile: { full_name: 'Min', username: 'min_ji', belt_level: 'Green Belt (7th Gup)' } };
    const c = fakeClient();
    assert.equal((await routeSignedIn(c, session(A, pending))).kind, 'profile');
    assert.ok(c.calls.some(([n]) => n === 'profiles.upsert'));
  });
  test('completeProfile handles an ended or hanging session', async () => {
    assert.equal((await completeProfile(fakeClient({ getSession: async () => ok({ session: null }) }), goodRaw)).kind, 'session-ended');
    const [r] = await timed(() => completeProfile(fakeClient({ getSession: never }), goodRaw, { ms: MS }));
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
    assert.equal((await startGoogle(fakeClient({ oauth: async () => fail({ message: 'provider is not enabled' }) }), 'x')).kind, 'error');
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
