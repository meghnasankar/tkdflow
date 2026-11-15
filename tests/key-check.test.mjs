/* Synthetic fixtures only — these are made-up tokens, not real keys. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicKeyProblem, findPrivilegedKeys, decodeJwtPayload } from '../js/lib/key-check.js';
import { initAccountService } from '../js/lib/account-service.js';
import { ACCOUNTS } from '../js/config.js';

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const fakeJwt = (payload) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.synthetic-signature`;
const ANON = fakeJwt({ iss: 'supabase', ref: 'synthetic', role: 'anon' });
const SERVICE = fakeJwt({ iss: 'supabase', ref: 'synthetic', role: 'service_role' });

test('fixtures are real-looking JWTs whose role is only visible after decoding', () => {
  assert.doesNotMatch(SERVICE, /service_role/, 'the encoded token does not contain the plain text');
  assert.equal(decodeJwtPayload(SERVICE).role, 'service_role');
});

test('anon JWT and publishable keys are allowed; empty is allowed (accounts off)', () => {
  assert.equal(publicKeyProblem(ANON), null);
  assert.equal(publicKeyProblem('sb_publishable_synthetic_abc123'), null);
  assert.equal(publicKeyProblem(''), null);
});

test('service-role JWTs, other roles and secret keys are rejected', () => {
  assert.match(publicKeyProblem(SERVICE), /service_role/);
  assert.match(publicKeyProblem(fakeJwt({ role: 'authenticated' })), /authenticated/);
  assert.match(publicKeyProblem('sb_secret_synthetic_abc123'), /SECRET/);
  assert.match(publicKeyProblem('eyJ.not-a-payload.x'), /cannot be read/);
  assert.match(publicKeyProblem('some-random-string'), /unrecognised/);
});

test('privileged keys are found inside arbitrary text', () => {
  assert.deepEqual(findPrivilegedKeys(`const k = '${ANON}';`), []);
  assert.deepEqual(findPrivilegedKeys(`supabaseAnonKey: '${SERVICE}',`), ['JWT with role "service_role"']);
  assert.deepEqual(findPrivilegedKeys('key = "sb_secret_synthetic_abc123"'), ['sb_secret_ key']);
});

test('the account service refuses to start with a privileged key, even when enabled', async () => {
  let loaded = false;
  const r = await initAccountService({ ...ACCOUNTS, enabled: true, supabaseUrl: 'https://synthetic.supabase.co', supabaseAnonKey: SERVICE, timeoutMs: 50 },
    { loadSdk: () => { loaded = true; }, reachable: async () => true, createClient: () => ({ auth: {} }) });
  assert.equal(r.status, 'unavailable');
  assert.equal(loaded, false, 'SDK never loaded');
});
