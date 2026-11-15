/* Account flows as plain async functions returning outcome objects.
   The page controllers only map outcomes to UI; all decisions live here so
   they can be tested with fake clients (including hanging and failing
   ones). No function in this module throws or waits without a deadline. */
import { friendlyError } from './account-service.js';
import {
  bounded, fetchOwnProfile, ensureSchool, usernameAvailable, upsertProfile, updateProfile, currentSession,
} from './account-ops.js';
import { validateProfileInput, validatePasswordPair, diffProfile, routeForProfileLookup, pendingProfileFrom } from './profile-model.js';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TAKEN = 'That username is already taken. Try another.';

/** Tracks which user a page is showing; in-flight results for an older
 *  user/session are discarded instead of rendered. */
export class SessionGuard {
  constructor(userId = null) { this.userId = userId; this.generation = 0; }
  token() { return { generation: this.generation, userId: this.userId }; }
  isCurrent(t) { return t.generation === this.generation && t.userId === this.userId; }
  /** Returns true when the user actually changed. */
  switchTo(userId) {
    if (userId === this.userId) return false;
    this.userId = userId;
    this.generation += 1;
    return true;
  }
}

export async function signIn(client, { email, password }, opts = {}) {
  if (!EMAIL_RE.test(email || '') || !password) return { kind: 'invalid', message: 'Enter a valid email address and your password.' };
  const { data, error } = await bounded(() => client.auth.signInWithPassword({ email, password }), { ...opts, label: 'Sign-in' });
  if (error || !data?.session) return { kind: 'error', message: friendlyError(error, 'Sign-in failed. Please try again.') };
  return { kind: 'signed-in', session: data.session };
}

async function provision(client, userId, values, isNewSchool, opts) {
  if (isNewSchool && values.school_name) {
    const school = await ensureSchool(client, values.school_name, opts.ms);
    if (school.error) return { error: school.error, schoolError: true };
  }
  const { error } = await upsertProfile(client, userId, values, opts.ms);
  return { error };
}

/** After any sign-in: decide between profile page, completion form or error. */
export async function routeSignedIn(client, session, opts = {}) {
  const lookup = await fetchOwnProfile(client, session.user.id, opts.ms);
  const route = routeForProfileLookup(lookup);
  if (route === 'profile') return { kind: 'profile' };
  if (route === 'error') return { kind: 'error', message: friendlyError(lookup.error, 'Your profile could not be loaded. Please try again.') };
  const pending = pendingProfileFrom(session.user);
  if (pending?.valid) {
    const r = await provision(client, session.user.id, pending.values, Boolean(pending.values.school_name), opts);
    if (!r.error) return { kind: 'profile' };
    return { kind: 'complete', values: pending.values, ...profileError(r) };
  }
  return { kind: 'complete', values: pending?.values || null };
}

function profileError(r) {
  if (r.error?.code === '23505') return { fieldErrors: { username: TAKEN }, message: TAKEN };
  if (r.schoolError) return { message: 'Your new school could not be added to the shared list. Please try again, or choose “No school”.' };
  return { message: friendlyError(r.error, 'Your profile could not be saved. Please try again.') };
}

export async function register(client, { raw, email, password, confirm, redirectTo }, opts = {}) {
  const { values, errors, isNewSchool } = validateProfileInput(raw);
  if (Object.keys(errors).length) return { kind: 'invalid', fieldErrors: errors, message: 'Please fix the highlighted fields.' };
  if (!EMAIL_RE.test(email || '')) return { kind: 'invalid', field: 'email', message: 'Enter a valid email address.' };
  const pw = validatePasswordPair(password, confirm);
  if (pw) return { kind: 'invalid', field: 'password', message: pw };

  const avail = await usernameAvailable(client, values.username, opts.ms);
  if (avail.available === false) return { kind: 'invalid', fieldErrors: { username: TAKEN }, message: TAKEN };

  const { data, error } = await bounded(() => client.auth.signUp({
    email, password,
    options: { emailRedirectTo: redirectTo, data: { full_name: values.full_name, pending_profile: values } },
  }), { ...opts, label: 'Sign-up' });
  if (error) return { kind: 'error', message: friendlyError(error, 'The account could not be created. Please try again.') };
  if (!data?.session) return { kind: 'check-email' };      // email confirmation required (or address already registered)
  const r = await provision(client, data.user.id, values, isNewSchool, opts);
  if (!r.error) return { kind: 'profile' };
  return { kind: 'complete', session: data.session, values, ...profileError(r) };   // account exists; retry on the completion form
}

export async function completeProfile(client, raw, opts = {}) {
  const { values, errors, isNewSchool } = validateProfileInput(raw);
  if (Object.keys(errors).length) return { kind: 'invalid', fieldErrors: errors, message: 'Please fix the highlighted fields.' };
  const { session, error } = await currentSession(client, opts.ms);
  if (error) return { kind: 'error', message: friendlyError(error) };
  if (!session) return { kind: 'session-ended', message: 'Your session has ended. Sign in again to finish your profile.' };
  const avail = await usernameAvailable(client, values.username, opts.ms);
  if (avail.available === false) return { kind: 'invalid', fieldErrors: { username: TAKEN }, message: TAKEN };
  const r = await provision(client, session.user.id, values, isNewSchool, opts);
  if (r.error) return { kind: 'error', ...profileError(r) };
  return { kind: 'profile' };
}

export async function requestReset(client, email, redirectTo, opts = {}) {
  if (!EMAIL_RE.test(email || '')) return { kind: 'invalid', message: 'Enter a valid email address.' };
  const { error } = await bounded(() => client.auth.resetPasswordForEmail(email, { redirectTo }), { ...opts, label: 'Reset request' });
  if (error) {
    // Genuine delivery/service failures are surfaced; wording never reveals whether an account exists.
    return { kind: 'error', message: friendlyError(error, 'The reset email could not be sent right now. Please try again later.') };
  }
  return { kind: 'sent', message: 'If an account exists for that address, a reset link is on its way. It expires after a short time.' };
}

export async function updatePassword(client, password, confirm, opts = {}) {
  const problem = validatePasswordPair(password, confirm);
  if (problem) return { kind: 'invalid', message: problem };
  const { error } = await bounded(() => client.auth.updateUser({ password }), { ...opts, label: 'Password update' });
  if (error) return { kind: 'error', message: friendlyError(error, 'Your password could not be updated. Request a new reset link and try again.') };
  const out = await logout(client, opts);
  return { kind: 'updated', signedOut: out.kind === 'signed-out' };
}

/**
 * Sign out of this device. supabase-js ≥2.119 removes the local session
 * before contacting the server for scope "local"; we still verify that no
 * session remains (via `stillSignedIn`) before reporting success.
 */
export async function logout(client, { stillSignedIn, ms } = {}) {
  const { error } = await bounded(() => client.auth.signOut({ scope: 'local' }), { ms, label: 'Sign-out' });
  const remaining = stillSignedIn ? await stillSignedIn() : (await currentSession(client, ms)).session !== null;
  if (remaining) return { kind: 'error', message: friendlyError(error, 'You could not be signed out. Please try again.') };
  return { kind: 'signed-out', serverRevoked: !error };
}

export async function loadOwnProfile(client, guard, opts = {}) {
  const t = guard.token();
  if (!t.userId) return { kind: 'signed-out' };
  const { data, error } = await fetchOwnProfile(client, t.userId, opts.ms);
  if (!guard.isCurrent(t)) return { kind: 'stale' };
  if (error) return { kind: 'error', message: friendlyError(error, 'Your profile could not be loaded. Please try again.') };
  if (!data) return { kind: 'missing' };
  return { kind: 'ok', profile: data };
}

export async function saveProfile(client, guard, original, raw, opts = {}) {
  const t = guard.token();
  const { values, errors, isNewSchool } = validateProfileInput(raw);
  if (Object.keys(errors).length) return { kind: 'invalid', fieldErrors: errors, message: 'Please fix the highlighted fields.' };
  const changes = diffProfile(original, values);
  if (!Object.keys(changes).length) return { kind: 'unchanged', message: 'No changes to save.' };

  const { session, error: sessionError } = await currentSession(client, opts.ms);
  if (!guard.isCurrent(t)) return { kind: 'stale' };
  if (sessionError) return { kind: 'error', message: friendlyError(sessionError) };
  if (!session || session.user.id !== t.userId) {
    return { kind: 'session-ended', message: 'Your session has ended. Your changes are still in the form — sign in again, then save.' };
  }
  if ('username' in changes) {
    const avail = await usernameAvailable(client, changes.username, opts.ms);
    if (!guard.isCurrent(t)) return { kind: 'stale' };
    if (avail.available === false) return { kind: 'invalid', fieldErrors: { username: TAKEN }, message: TAKEN };
  }
  if (isNewSchool && 'school_name' in changes) {
    const school = await ensureSchool(client, changes.school_name, opts.ms);
    if (!guard.isCurrent(t)) return { kind: 'stale' };
    if (school.error) return { kind: 'error', message: 'Your new school could not be added to the shared list, so nothing was saved. Please try again.' };
  }
  const result = await updateProfile(client, t.userId, changes, opts.ms);
  if (!guard.isCurrent(t)) return { kind: 'stale' };
  if (result.error || !result.data?.length) {
    if (result.error?.code === '23505') return { kind: 'invalid', fieldErrors: { username: TAKEN }, message: TAKEN };
    return { kind: 'error', message: friendlyError(result.error || { code: '42501' }, 'Your changes could not be saved. They are still in the form — please try again.') };
  }
  return { kind: 'saved', changes, profile: { ...original, ...changes } };
}

export async function startGoogle(client, redirectTo, opts = {}) {
  const { error } = await bounded(() => client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }), { ...opts, label: 'Google sign-in' });
  return error ? { kind: 'error', message: friendlyError(error, 'Google sign-in could not start. Please try again.') } : { kind: 'redirecting' };
}
