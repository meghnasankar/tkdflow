/* Account service loader.
   Resolves to one of:
     { status: 'disabled',    reason }          accounts switched off in config
     { status: 'unavailable', reason }          SDK blocked or service unreachable
     { status: 'ready',       client }          Supabase client ready to use
   The SDK is only downloaded on account pages, only when accounts are
   enabled, and always from the exact pinned URL in config.js. */
import { ACCOUNTS } from '../config.js';
import { publicKeyProblem } from './key-check.js';

let pending = null;

export function accountsConfigured(cfg = ACCOUNTS) {
  return Boolean(cfg.enabled && cfg.supabaseUrl && cfg.supabaseAnonKey);
}

/** localStorage key supabase-js v2 uses for the persisted session. */
export function sessionStorageKey(cfg = ACCOUNTS) {
  try {
    const ref = new URL(cfg.supabaseUrl).hostname.split('.')[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

/** Cheap check used by the navbar: is there a stored session at all?
 *  (The profile page validates it properly.) */
export function hasStoredSession(cfg = ACCOUNTS, storage) {
  const key = sessionStorageKey(cfg);
  if (!key) return false;
  try {
    // The browser may throw from the localStorage getter itself.
    if (storage === undefined) storage = globalThis.localStorage;
    return Boolean(storage?.getItem(key));
  } catch {
    return false;
  }
}

export const UNAVAILABLE_REASON =
  'The account service cannot be reached right now. Please try again later — the forms library and lessons still work.';

/** Reject if `promise` has not settled within `ms`. */
export function withTimeout(promise, ms, message = 'Timed out') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function loadSdk(cfg) {
  if (globalThis.supabase?.createClient) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = cfg.sdk.url;
    if (cfg.sdk.integrity) {
      script.integrity = cfg.sdk.integrity;
      script.crossOrigin = 'anonymous';
    }
    script.onload = () => (globalThis.supabase?.createClient ? resolve() : reject(new Error('SDK did not initialise')));
    script.onerror = () => reject(new Error('SDK failed to load'));
    document.head.append(script);
  });
}

/** Reachability probe. `no-cors` resolves for any HTTP response and rejects
 *  on DNS/connection failure — exactly the NXDOMAIN case seen in the audit —
 *  without depending on CORS headers. */
async function reachable(cfg, fetchImpl = globalThis.fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    await fetchImpl(`${cfg.supabaseUrl.replace(/\/$/, '')}/auth/v1/health`, {
      mode: 'no-cors', cache: 'no-store', signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Every failure path — disabled config, blocked/hanging/broken SDK, an
 *  unreachable host, a hanging probe or a throwing createClient — resolves
 *  to a status object; this function never rejects and never hangs longer
 *  than about 2 × cfg.timeoutMs. */
export async function initAccountService(cfg = ACCOUNTS, deps = {}) {
  if (!accountsConfigured(cfg)) return { status: 'disabled', reason: cfg.disabledReason };
  // Never initialise with a privileged key, even if one was configured by mistake.
  if (publicKeyProblem(cfg.supabaseAnonKey)) {
    return { status: 'unavailable', reason: UNAVAILABLE_REASON, cause: 'unsafe key configuration' };
  }
  const unavailable = (cause) => ({ status: 'unavailable', reason: UNAVAILABLE_REASON, cause });
  const ms = cfg.timeoutMs || 8000;

  try {
    await withTimeout(Promise.resolve().then(() => (deps.loadSdk || loadSdk)(cfg)), ms, 'SDK load timed out');
  } catch (err) {
    return unavailable(err?.message || 'sdk');
  }

  let ok = false;
  try {
    ok = await withTimeout(Promise.resolve().then(() => (deps.reachable || reachable)(cfg, deps.fetchImpl)), ms, 'Probe timed out');
  } catch (err) {
    return unavailable(err?.message || 'probe');
  }
  if (!ok) return unavailable('unreachable');

  try {
    const create = deps.createClient || globalThis.supabase?.createClient;
    if (typeof create !== 'function') return unavailable('createClient missing');
    const client = create(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    if (!client?.auth) return unavailable('createClient returned no client');
    return { status: 'ready', client };
  } catch (err) {
    return unavailable(err?.message || 'createClient');
  }
}

export function getAccountService() {
  if (!pending) pending = initAccountService();
  return pending;
}

/** Turn a Supabase/PostgREST error into a safe, user-facing sentence. */
export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  const msg = String(error.message || '');
  if (error.code === 'timeout' || error.name === 'TimeoutError') {
    return 'The account service took too long to respond. Please try again.';
  }
  if (/wait a day before suggesting another school/i.test(msg)) return 'Please wait a day before suggesting another school. Your previous school is still saved.';
  if (/School unavailable/i.test(msg)) return 'That school is no longer available. Choose another school or add its details.';
  if (error.code === '23505') return 'That username is already taken. Try another.';
  if (error.code === '23514') return 'One of the values is not allowed. Check the highlighted fields.';
  if (error.code === '42501' || /permission denied|row-level security/i.test(msg)) {
    return 'Your session does not allow this action. Please sign in again.';
  }
  if (/failed to fetch|network|load failed/i.test(msg) || error.name === 'AuthRetryableFetchError') {
    return 'The account service could not be reached. Check your connection and try again.';
  }
  if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password. Please try again.';
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email address first — check your inbox for the link.';
  if (/password should be|weak password/i.test(msg)) return 'Choose a stronger password (at least 8 characters).';
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a few minutes and try again.';
  return fallback;
}
