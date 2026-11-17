import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initAccountService, accountsConfigured, sessionStorageKey, hasStoredSession, friendlyError, withTimeout,
} from '../js/lib/account-service.js';
import { ACCOUNTS } from '../js/config.js';

const cfg = (over = {}) => ({
  ...ACCOUNTS,
  enabled: true,
  supabaseUrl: 'https://exampleref.supabase.co',
  supabaseAnonKey: 'sb_publishable_synthetic_test_value',
  timeoutMs: 40,
  ...over,
});
const never = () => new Promise(() => {});
const okClient = () => ({ auth: {} });
const elapsed = async (fn) => { const t = Date.now(); const r = await fn(); return [r, Date.now() - t]; };

test('shipped config connects to the reviewed production project', () => {
  assert.equal(ACCOUNTS.enabled, true);
  assert.equal(ACCOUNTS.supabaseUrl, 'https://ffkwwfwrqtwejyrnkxey.supabase.co');
  assert.equal(accountsConfigured(ACCOUNTS), true);
});

test('disabled or incomplete config → disabled, never loads the SDK', async () => {
  let loaded = false;
  const deps = { loadSdk: () => { loaded = true; } };
  assert.equal((await initAccountService(cfg({ enabled: false }), deps)).status, 'disabled');
  assert.equal((await initAccountService(cfg({ supabaseUrl: '' }), deps)).status, 'disabled');
  assert.equal((await initAccountService(cfg({ supabaseAnonKey: '' }), deps)).status, 'disabled');
  assert.equal(loaded, false);
});

test('hanging SDK load times out → unavailable (bounded)', async () => {
  const [r, ms] = await elapsed(() => initAccountService(cfg(), { loadSdk: never, reachable: async () => true, createClient: okClient }));
  assert.equal(r.status, 'unavailable');
  assert.match(r.cause, /SDK load timed out/);
  assert.ok(ms < 1000, `took ${ms}ms`);
});

test('blocked SDK (rejects) → unavailable', async () => {
  const r = await initAccountService(cfg(), { loadSdk: () => Promise.reject(new Error('SDK failed to load')) });
  assert.equal(r.status, 'unavailable');
});

test('SDK loader that throws synchronously → unavailable', async () => {
  const r = await initAccountService(cfg(), { loadSdk: () => { throw new Error('boom'); } });
  assert.equal(r.status, 'unavailable');
});

test('DNS failure (fetch rejects) → unavailable via the real probe', async () => {
  const r = await initAccountService(cfg(), {
    loadSdk: async () => {}, createClient: okClient,
    fetchImpl: () => Promise.reject(new TypeError('Failed to fetch')),
  });
  assert.equal(r.status, 'unavailable');
  assert.equal(r.cause, 'unreachable');
});

test('probe that hangs or ignores abort → unavailable (bounded)', async () => {
  const [r, ms] = await elapsed(() => initAccountService(cfg(), { loadSdk: async () => {}, reachable: never, createClient: okClient }));
  assert.equal(r.status, 'unavailable');
  assert.ok(ms < 1000);
  const [r2] = await elapsed(() => initAccountService(cfg(), { loadSdk: async () => {}, createClient: okClient, fetchImpl: never }));
  assert.equal(r2.status, 'unavailable');
});

test('probe that throws → unavailable', async () => {
  const r = await initAccountService(cfg(), { loadSdk: async () => {}, reachable: () => { throw new Error('x'); } });
  assert.equal(r.status, 'unavailable');
});

test('createClient throwing, missing or returning junk → unavailable', async () => {
  const base = { loadSdk: async () => {}, reachable: async () => true };
  assert.equal((await initAccountService(cfg(), { ...base, createClient: () => { throw new Error('bad key'); } })).status, 'unavailable');
  assert.equal((await initAccountService(cfg(), { ...base, createClient: () => null })).status, 'unavailable');
  assert.equal((await initAccountService(cfg(), { ...base, createClient: 'not a function' })).status, 'unavailable');
});

test('healthy path → ready with the client', async () => {
  const client = okClient();
  const r = await initAccountService(cfg(), { loadSdk: async () => {}, reachable: async () => true, createClient: () => client });
  assert.equal(r.status, 'ready');
  assert.equal(r.client, client);
});

test('withTimeout clears its timer when the promise wins', async () => {
  assert.equal(await withTimeout(Promise.resolve(5), 1000), 5);
  await assert.rejects(withTimeout(never(), 10, 'late'), /late/);
});

test('session storage key and presence check', () => {
  assert.equal(sessionStorageKey(cfg()), 'sb-exampleref-auth-token');
  assert.equal(sessionStorageKey(cfg({ supabaseUrl: 'not a url' })), null);
  const store = new Map([['sb-exampleref-auth-token', '{}']]);
  const storage = { getItem: (k) => store.get(k) ?? null };
  assert.equal(hasStoredSession(cfg(), storage), true);
  assert.equal(hasStoredSession(cfg({ supabaseUrl: 'https://other.supabase.co' }), storage), false);
  assert.equal(hasStoredSession(cfg(), { getItem: () => { throw new Error('blocked'); } }), false);
});

test('friendlyError never echoes raw server text', () => {
  assert.match(friendlyError({ code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_lower_key"' }), /already taken/);
  assert.match(friendlyError({ message: 'Failed to fetch' }), /could not be reached/);
  assert.match(friendlyError({ message: 'Invalid login credentials' }), /Incorrect email or password/);
  assert.match(friendlyError({ code: '42501', message: 'permission denied for table profiles' }), /sign in again/);
  assert.equal(friendlyError({ message: '<img src=x onerror=alert(1)>' }, 'fallback'), 'fallback');
});

// Browser privacy settings can block the property getter before getItem runs.
test('a throwing localStorage getter cannot break session checks or held-account sign-out', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let reads = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() {
    reads += 1;
    throw new DOMException('Storage blocked', 'SecurityError');
  } });
  try {
    assert.equal(hasStoredSession(cfg()), false);
    assert.equal(reads, 1);
    assert.equal(hasStoredSession(cfg({ supabaseUrl: 'not a url' })), false);
    assert.equal(reads, 1, 'invalid configuration never reads storage');
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
