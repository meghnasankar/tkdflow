import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadJSON, DataError, requireArrayOf } from '../js/lib/data.js';

const never = () => new Promise(() => {});
const response = ({ ok = true, status = 200, text }) => ({ ok, status, text });

test('valid JSON loads and passes validation', async () => {
  const data = await loadJSON('x.json', {
    fetchImpl: async () => response({ text: async () => '[{"id":"a"}]' }),
    validate: requireArrayOf({ id: 'string' }),
  });
  assert.deepEqual(data, [{ id: 'a' }]);
});

test('HTTP 404 → http error', async () => {
  await assert.rejects(loadJSON('x.json', { fetchImpl: async () => response({ ok: false, status: 404, text: async () => '' }) }),
    (e) => e instanceof DataError && e.kind === 'http' && /404/.test(e.message));
});

test('network failure → network error', async () => {
  await assert.rejects(loadJSON('x.json', { fetchImpl: () => Promise.reject(new TypeError('Failed to fetch')) }),
    (e) => e.kind === 'network');
});

test('headers never arrive → timeout', async () => {
  await assert.rejects(loadJSON('x.json', { timeoutMs: 30, fetchImpl: never }), (e) => e.kind === 'timeout');
});

test('headers arrive but the body hangs → timeout (deadline covers body parsing)', async () => {
  const t = Date.now();
  await assert.rejects(loadJSON('x.json', { timeoutMs: 40, fetchImpl: async () => response({ text: never }) }),
    (e) => e.kind === 'timeout');
  assert.ok(Date.now() - t < 1000);
});

test('the abort signal is delivered to fetch and body reads', async () => {
  let signal;
  const fetchImpl = async (_url, opts) => {
    signal = opts.signal;
    return response({
      text: () => new Promise((_, reject) => opts.signal.addEventListener('abort', () => {
        const err = new Error('aborted'); err.name = 'AbortError'; reject(err);
      })),
    });
  };
  await assert.rejects(loadJSON('x.json', { timeoutMs: 30, fetchImpl }), (e) => e.kind === 'timeout');
  assert.equal(signal.aborted, true);
});

test('interrupted body download → network error', async () => {
  await assert.rejects(loadJSON('x.json', { fetchImpl: async () => response({ text: () => Promise.reject(new TypeError('network')) }) }),
    (e) => e.kind === 'network');
});

test('malformed JSON → parse error', async () => {
  await assert.rejects(loadJSON('x.json', { fetchImpl: async () => response({ text: async () => '{"broken":' }) }),
    (e) => e.kind === 'parse');
});

test('wrong shape → shape error', async () => {
  await assert.rejects(loadJSON('x.json', {
    fetchImpl: async () => response({ text: async () => '{"not":"a list"}' }),
    validate: requireArrayOf({ id: 'string' }),
  }), (e) => e.kind === 'shape');
  const v = requireArrayOf({ id: 'string', tags: 'array' });
  assert.match(v([{ id: 1, tags: [] }]), /id/);
  assert.match(v([{ id: 'a', tags: 'x' }]), /tags/);
  assert.equal(v([{ id: 'a', tags: [] }]), null);
});
