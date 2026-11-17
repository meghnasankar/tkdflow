/* Pre-registration age screen (approved policy, docs/account-age-policy.md).

   - Individual accounts: 13 and over. Under 13: public lessons only, plus
     guidance for a parent or guardian; no child form, no child login.
   - The screen asks for age neutrally (free entry, no default, no hint about
     the threshold) BEFORE any name, email, password, school or Google step.
   - The exact age is never stored. Only a coarse, non-identifying result
     ('eligible' / 'ineligible') is kept in sessionStorage for this tab, so a
     reload or the back button does not offer a second attempt.

   Limits (documented in docs/account-age-policy.md): this is a client-side
   screen. A new tab, a private window or cleared site data shows the screen
   again, and nothing here stops a direct call to the auth API. Server-side
   enforcement is a separate, still-blocking gate. */

export const AGE_POLICY = Object.freeze({ individualMin: 13, adultMin: 18 });
export const ELIGIBILITY_KEY = 'tkdflow.ageScreen.v1';
export const ELIGIBLE = 'eligible';
export const INELIGIBLE = 'ineligible';

const AGE_TEXT_RE = /^[0-9]{1,3}$/;
const AGE_MAX = 120;

/**
 * Classify a typed age. Never throws; never returns the number itself.
 * @returns {{ result: 'under-13'|'teen'|'adult'|'unknown' }}
 *   'unknown' = empty, not a whole number, 0, or above 120.
 */
export function classifyAge(input) {
  const text = String(input ?? '').trim();
  if (!AGE_TEXT_RE.test(text)) return { result: 'unknown' };
  const n = Number(text);
  if (n < 1 || n > AGE_MAX) return { result: 'unknown' };
  if (n < AGE_POLICY.individualMin) return { result: 'under-13' };
  if (n < AGE_POLICY.adultMin) return { result: 'teen' };
  return { result: 'adult' };
}

/** True only for an age that is a valid whole number below 13. */
export function isUnderMinimumAge(input) {
  return classifyAge(input).result === 'under-13';
}

export const AGE_SCREEN_RETRY =
  'Enter your age in years as a whole number.';

/**
 * Session eligibility flag. `source` is a storage object or a function that
 * returns one; by default it is window.sessionStorage. The storage is looked
 * up INSIDE try/catch on every access, because browsers can throw (e.g. a
 * SecurityError) from the sessionStorage getter itself when site data is
 * blocked. Any storage failure falls back to memory for the life of the page.
 * Once 'ineligible' is recorded it is never replaced by 'eligible' in the
 * same session.
 */
export function createEligibilityStore(source = () => globalThis.sessionStorage) {
  let memory = null;
  const storage = () => (typeof source === 'function' ? source() : source);
  const readStored = () => {
    try {
      const v = storage()?.getItem(ELIGIBILITY_KEY);
      return v === ELIGIBLE || v === INELIGIBLE ? v : null;
    } catch {
      return null;
    }
  };
  return {
    /** 'eligible' | 'ineligible' | null (not screened yet) */
    read() {
      const stored = readStored();
      if (memory === INELIGIBLE || stored === INELIGIBLE) return INELIGIBLE;
      return stored || memory;
    },
    /** Record the outcome of a screen. Returns what is now in effect. */
    record(result) {
      const next = result === 'under-13' ? INELIGIBLE : (result === 'teen' || result === 'adult') ? ELIGIBLE : null;
      if (!next) return this.read();
      if (this.read() === INELIGIBLE) return INELIGIBLE;
      memory = next;
      try { storage()?.setItem(ELIGIBILITY_KEY, next); } catch { /* memory only */ }
      return next;
    },
  };
}

/** Only an explicit 'eligible' result allows an account-creating call. */
export function mayCreateAccount(eligibility) {
  return eligibility === ELIGIBLE;
}

/**
 * Which auth.html panel a request may open, decided BEFORE any form is shown
 * or the account client starts.
 * - A known under-13 result ('ineligible') keeps the public-guidance panel
 *   for EVERY mode — login, forgot, recovery, complete, register — so no
 *   email/password form appears and the session result cannot be undone.
 * - Registration needs the age screen first unless already 'eligible'.
 * - Unscreened or eligible visitors keep sign-in, reset and recovery (those
 *   cannot create accounts), so existing members are not affected.
 */
export function authEntryPanel(eligibility, mode) {
  if (eligibility === INELIGIBLE) return 'age-guidance';
  if (mode === 'register' && eligibility !== ELIGIBLE) return 'age';
  return mode;
}

/**
 * A stored profile whose recorded age is a whole number under 13 (possible
 * only in legacy rows written before the 13+ rule). Such an account is HELD:
 * not shown or editable, no profile or school writes, never converted or
 * deleted automatically. A missing/NULL age is not "known under 13" — those
 * records still need the owner review before accounts reopen.
 */
export function isKnownUnderMinimumProfile(profile) {
  const raw = profile?.age;
  // numbers as stored, or digit-only text if a client ever stringifies them
  const age = typeof raw === 'string' && /^[0-9]{1,3}$/.test(raw) ? Number(raw) : raw;
  return typeof age === 'number' && Number.isInteger(age) && age >= 0 && age < AGE_POLICY.individualMin;
}
