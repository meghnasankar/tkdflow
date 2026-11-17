/* Low-level Supabase operations. EVERY call is bounded by a timeout and
   resolves to { data, error } — it never throws and never hangs — so a
   stalled network request always reaches a visible error state. */

export const OP_TIMEOUT_MS = 10000;

export class TimeoutError extends Error {
  constructor(label) {
    super(`${label} timed out`);
    this.name = 'TimeoutError';
    this.code = 'timeout';
  }
}

/**
 * Run `factory()` (which may return a promise, a value, or throw) with a
 * deadline. Resolves to { data, error } plus any extra fields the SDK
 * returned (e.g. { data, error, count }).
 */
export async function bounded(factory, { ms = OP_TIMEOUT_MS, label = 'Request' } = {}) {
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ data: null, error: new TimeoutError(label) }), ms);
  });
  const work = (async () => {
    try {
      const res = await factory();
      if (res && typeof res === 'object' && ('error' in res || 'data' in res)) {
        return { ...res, data: res.data ?? null, error: res.error ?? null };
      }
      return { data: res ?? null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  })();
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

const PROFILE_COLUMNS = 'id, full_name, username, age, belt_level, school_name, school_directory_id, school_country, school_region, school_city, school_website, created_at';

export const fetchOwnProfile = (client, userId, ms) => bounded(
  () => client.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle(),
  { ms, label: 'Profile lookup' });

/** Legacy school-name lookup, retained for migration compatibility. */
export async function fetchSchoolNames(client, ms = 6000) {
  const { data, error } = await bounded(() => client.from('schools').select('name').order('name'), { ms, label: 'School list' });
  if (error) return { data: [], error };
  return { data: (data || []).map((r) => r?.name).filter((n) => typeof n === 'string'), error: null };
}

export async function usernameAvailable(client, username, ms = 6000) {
  const { data, error } = await bounded(() => client.rpc('username_available', { candidate: username }), { ms, label: 'Username check' });
  return error ? { available: null, error } : { available: data === true, error: null };
}

export async function upsertProfile(client, userId, values, ms) {
  return bounded(() => client.from('profiles').upsert({
    id: userId,
    full_name: values.full_name,
    username: values.username,
    age: values.age,
    belt_level: values.belt_level,
    school_name: values.school_name,
    ...Object.fromEntries(['school_directory_id','school_country','school_region','school_city','school_website'].filter(key => Object.hasOwn(values,key)).map(key => [key,values[key]])),
  }, { onConflict: 'id' }), { ms, label: 'Saving profile' });
}

export async function updateProfile(client, userId, changes, ms) {
  return bounded(() => client.from('profiles').update(changes).eq('id', userId).select('id'), { ms, label: 'Saving profile' });
}

export async function currentSession(client, ms = 6000) {
  const { data, error } = await bounded(() => client.auth.getSession(), { ms, label: 'Session check' });
  return { session: data?.session || null, error };
}
