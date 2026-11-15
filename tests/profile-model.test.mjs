import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateProfileInput, validatePasswordPair, diffProfile, initials, parseAuthLocation,
  routeForProfileLookup, pendingProfileFrom, NEW_SCHOOL,
} from '../js/lib/profile-model.js';

const good = { full_name: '  Min  Ji ', username: 'Tkd_Min', age: '', belt_level: 'Blue Belt (5th Gup)', school_choice: '' };

test('valid input is normalised; age is optional', () => {
  const { values, errors } = validateProfileInput(good);
  assert.deepEqual(errors, {});
  assert.deepEqual(values, { full_name: 'Min Ji', username: 'tkd_min', age: null, belt_level: 'Blue Belt (5th Gup)', school_name: null });
});

test('each invalid field gets its own message', () => {
  const { errors } = validateProfileInput({ full_name: '', username: 'a b', age: '100', belt_level: 'Purple', school_choice: NEW_SCHOOL, school_new: '' });
  assert.deepEqual(Object.keys(errors).sort(), ['age', 'belt_level', 'full_name', 'school_name', 'username']);
  assert.ok(validateProfileInput({ ...good, age: '4' }).errors.age);
  assert.ok(validateProfileInput({ ...good, age: '12.5' }).errors.age);
  assert.ok(validateProfileInput({ ...good, full_name: 'x'.repeat(81) }).errors.full_name);
  assert.ok(validateProfileInput({ ...good, school_choice: NEW_SCHOOL, school_new: 'x' }).errors.school_name);
});

test('markup in names is kept as plain text (rendering escapes it)', () => {
  const { values, errors } = validateProfileInput({ ...good, full_name: '<b>example</b>' });
  assert.deepEqual(errors, {});
  assert.equal(values.full_name, '<b>example</b>');
});

test('new school is taken from the free-text field', () => {
  const r = validateProfileInput({ ...good, school_choice: NEW_SCHOOL, school_new: '  Riverside   TKD ' });
  assert.equal(r.values.school_name, 'Riverside TKD');
  assert.equal(r.isNewSchool, true);
});

test('password pair rules', () => {
  assert.match(validatePasswordPair('short', 'short'), /at least 8/);
  assert.match(validatePasswordPair('longenough1', 'different1'), /do not match/);
  assert.equal(validatePasswordPair('longenough1', 'longenough1'), null);
});

test('diffProfile returns only changed fields — an unchanged school is never overwritten', () => {
  const original = { full_name: 'A', username: 'a_user', age: 20, belt_level: 'Yellow Belt (9th Gup)', school_name: 'Unlisted Dojang' };
  assert.deepEqual(diffProfile(original, { ...original, full_name: 'B' }), { full_name: 'B' });
  assert.deepEqual(diffProfile(original, { ...original }), {});
  assert.deepEqual(diffProfile(original, { ...original, age: null }), { age: null });
});

test('initials handle empty and multi-byte names', () => {
  assert.equal(initials(''), '?');
  assert.equal(initials('kim min ji'), 'KM');
  assert.equal(initials('김민지'), '김');
});

test('auth URL parsing: modes, recovery and expired links', () => {
  assert.deepEqual(parseAuthLocation('?mode=register', ''), { mode: 'register', error: null });
  assert.equal(parseAuthLocation('?mode=nonsense', '').mode, 'login');
  assert.equal(parseAuthLocation('', '#access_token=x&type=recovery').mode, 'recovery');
  const expired = parseAuthLocation('?mode=recovery', '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  assert.equal(expired.mode, 'recovery');
  assert.equal(expired.error.expired, true);
  assert.equal(parseAuthLocation('?error=server_error', '').error.expired, false);
});

test('signed-in routing distinguishes lookup errors from missing profiles', () => {
  assert.equal(routeForProfileLookup({ data: { id: 1 }, error: null }), 'profile');
  assert.equal(routeForProfileLookup({ data: null, error: null }), 'complete');
  assert.equal(routeForProfileLookup({ data: null, error: { message: 'Failed to fetch' } }), 'error');
});

test('pending profile from sign-up metadata', () => {
  const user = { user_metadata: { pending_profile: { full_name: 'Min', username: 'min_ji', belt_level: 'Green Belt (7th Gup)', school_name: 'Riverside TKD' } } };
  const p = pendingProfileFrom(user);
  assert.equal(p.valid, true);
  assert.equal(p.values.school_name, 'Riverside TKD');
  assert.equal(pendingProfileFrom({ user_metadata: {} }), null);
  assert.equal(pendingProfileFrom({ user_metadata: { pending_profile: { username: 'BAD NAME' } } }).valid, false);
});
