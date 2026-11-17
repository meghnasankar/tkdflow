/* Pure profile/auth logic shared by auth.html and profile.html.
   Mirrors the database constraints in supabase-setup.sql. */
import { BELT_LEVELS } from './belts.js';
import { AGE_POLICY } from './age-gate.js';

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const LIMITS = Object.freeze({ nameMax: 80, schoolMin: 2, schoolMax: 100, ageMin: AGE_POLICY.individualMin, ageMax: 99, passwordMin: 8 });
export const NEW_SCHOOL = '__new__';

export const AGE_UNDER_MINIMUM =
  'TKDflow individual accounts are for ages 13 and over, so this age cannot be saved.';
const AGE_FORMAT = 'Enter your age as a whole number up to 99, or leave it blank.';

/**
 * Validate raw form values. Returns { values, errors, underMinimum } where
 * errors maps a field name to a sentence. `values` is normalised (trimmed,
 * lowercased username, numeric/null age, null for empty optional fields).
 * `underMinimum` is true when a whole-number age below 13 was entered; such
 * an age is never accepted. A blank (null) age is allowed but is NOT
 * evidence of eligibility — that comes only from the age screen.
 */
export function validateProfileInput(raw) {
  const errors = {};
  const full_name = String(raw.full_name ?? '').trim().replace(/\s+/g, ' ');
  const username = String(raw.username ?? '').trim().toLowerCase();
  const ageText = String(raw.age ?? '').trim();
  const belt_level = String(raw.belt_level ?? '');
  const schoolChoice = String(raw.school_choice ?? '');
  const schoolNew = String(raw.school_new ?? '').trim().replace(/\s+/g, ' ');

  if (!full_name) errors.full_name = 'Enter your name.';
  else if (full_name.length > LIMITS.nameMax) errors.full_name = `Use ${LIMITS.nameMax} characters or fewer.`;

  if (!USERNAME_RE.test(username)) errors.username = 'Use 3–20 lowercase letters, numbers or underscores.';

  let age = null;
  let underMinimum = false;
  if (ageText) {
    age = /^[0-9]{1,3}$/.test(ageText) ? Number(ageText) : NaN;
    if (Number.isInteger(age) && age >= 1 && age < LIMITS.ageMin) {
      underMinimum = true;
      errors.age = AGE_UNDER_MINIMUM;
    } else if (!Number.isInteger(age) || age < LIMITS.ageMin || age > LIMITS.ageMax) {
      errors.age = AGE_FORMAT;
    }
  }

  if (!BELT_LEVELS.includes(belt_level)) errors.belt_level = 'Choose your belt level.';

  let school_name = schoolChoice === NEW_SCHOOL ? schoolNew : schoolChoice.trim();
  if (schoolChoice === NEW_SCHOOL && !schoolNew) errors.school_name = 'Enter your school or club name, or choose “No school”.';
  else if (school_name && (school_name.length < LIMITS.schoolMin || school_name.length > LIMITS.schoolMax)) {
    errors.school_name = `School names need ${LIMITS.schoolMin}–${LIMITS.schoolMax} characters.`;
  }
  if (!school_name) school_name = null;

  const schoolFields = {};
  if (Object.hasOwn(raw, 'school_directory_id')) {
    for (const key of ['school_directory_id','school_country','school_region','school_city','school_website']) schoolFields[key] = String(raw[key] ?? '').trim() || null;
    if (!school_name) for (const key of Object.keys(schoolFields)) schoolFields[key] = null;
    if (schoolFields.school_directory_id && schoolFields.school_directory_id.length > 100) errors.school_name = 'Choose a school from the directory.';
    if (schoolFields.school_country && !/^[A-Z]{2}$/.test(schoolFields.school_country)) errors.school_country = 'Choose a country.';
    if (schoolChoice === NEW_SCHOOL && !schoolFields.school_country) errors.school_country = 'Choose the school’s country.';
    if (schoolChoice === NEW_SCHOOL && !schoolFields.school_city) errors.school_city = 'Enter the school’s city.';
    for (const key of ['school_region','school_city']) if ((schoolFields[key] || '').length > 100) errors[key] = 'Use 100 characters or fewer.';
    const website=schoolFields.school_website;
    if (website && (website.length>500 || !/^https?:\/\/[^\s]+$/.test(website))) errors.school_website='Enter a complete http or https school website address, or leave it blank.';
  }

  return {
    values: { full_name, username, age: errors.age ? null : age, belt_level, school_name, ...schoolFields },
    isNewSchool: schoolChoice === NEW_SCHOOL && Boolean(schoolNew),
    underMinimum,
    errors,
  };
}

export function validatePasswordPair(password, confirm) {
  if (String(password).length < LIMITS.passwordMin) return `Use at least ${LIMITS.passwordMin} characters.`;
  if (password !== confirm) return 'The passwords do not match.';
  return null;
}

/** Only the fields whose values actually changed. */
export function diffProfile(original, next) {
  const changes = {};
  for (const key of ['full_name', 'username', 'age', 'belt_level', 'school_name', 'school_directory_id', 'school_country', 'school_region', 'school_city', 'school_website']) {
    const a = original?.[key] ?? null;
    const b = next[key] ?? null;
    if (a !== b) changes[key] = b;
  }
  return changes;
}

/** Initials for an avatar, from untrusted text (returned as plain text). */
export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((p) => [...p][0]).join('').toUpperCase();
}

const MODES = ['login', 'register', 'complete', 'forgot', 'recovery'];

/**
 * Read the auth page mode and any error Supabase put in the redirect URL
 * (query string or hash, e.g. #error=access_denied&error_code=otp_expired).
 */
export function parseAuthLocation(search = '', hash = '') {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(String(hash).replace(/^#/, ''));
  const get = (k) => query.get(k) ?? fragment.get(k);
  let mode = query.get('mode');
  if (fragment.get('type') === 'recovery' || query.get('type') === 'recovery') mode = 'recovery';
  if (!MODES.includes(mode)) mode = 'login';
  const code = get('error_code') || get('error');
  const error = code ? {
    code,
    expired: /otp_expired|expired/i.test(code) || /expired/i.test(get('error_description') || ''),
  } : null;
  return { mode, error };
}

/** Decide where a signed-in user goes from the result of a profile lookup. */
export function routeForProfileLookup({ data, error }) {
  if (error) return 'error';
  return data ? 'profile' : 'complete';
}

/** Profile values saved during sign-up (user_metadata.pending_profile). */
export function pendingProfileFrom(user) {
  const p = user?.user_metadata?.pending_profile;
  if (!p || typeof p !== 'object') return null;
  const { values, errors, underMinimum } = validateProfileInput({
    ...p, full_name: p.full_name, username: p.username, age: p.age ?? '',
    belt_level: p.belt_level, school_choice: p.school_directory_id ? p.school_name : p.school_name ? NEW_SCHOOL : '', school_new: p.school_name || '',
  });
  if (Object.keys(errors).length) return { values, valid: false, underMinimum };
  return { values, valid: true, underMinimum: false };
}
