/* Permission and validation tests for supabase-setup.sql, run in an embedded
   Postgres (PGlite) with a minimal Supabase auth shim.
   Covers: fresh install, migration from the original (d05016a) policies,
   re-run idempotence, unknown-policy blocking, and the privacy contract.
   These prove the SQL's behaviour; they do NOT prove what is deployed —
   that still requires supabase/preflight.sql on the real project. */
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { BELT_LEVELS } from '../js/lib/belts.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SHIM = read('supabase/tests/auth-shim.sql');
const LEGACY = read('supabase/tests/legacy-setup-d05016a.sql');
const SETUP = read('supabase-setup.sql');
const PREFLIGHT = read('supabase/preflight.sql');

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const EXPECTED_POLICIES = [
  'profiles.profiles_insert_own', 'profiles.profiles_select_own', 'profiles.profiles_update_own',
  'schools.schools_insert_member', 'schools.schools_select_all',
];

const openDbs = [];
after(async () => { await Promise.all(openDbs.map((db) => db.close())); });

async function newDb({ legacy = false } = {}) {
  const db = new PGlite();
  openDbs.push(db);
  await db.exec(SHIM);
  await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@example.test'), ('${B}', 'b@example.test');`);
  if (legacy) await db.exec(LEGACY);
  return db;
}

/** Run `fn` as a client role inside a rolled-back transaction. */
async function as(db, role, uid, fn) {
  let result;
  let error;
  try {
    await db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)`, [uid || '', role]);
      await tx.exec(`set local role ${role}`);
      try {
        result = await fn(tx);
      } catch (e) {
        error = e;
      }
      throw new Error('__rollback__');
    });
  } catch (e) {
    if (e.message !== '__rollback__') throw e;
  }
  if (error) throw error;
  return result;
}
const asAnon = (db, fn) => as(db, 'anon', null, fn);
const asUser = (db, uid, fn) => as(db, 'authenticated', uid, fn);

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (e) => {
    assert.equal(e.code, code, `expected SQLSTATE ${code}, got ${e.code}: ${e.message}`);
    return true;
  });
}

async function policies(db) {
  const { rows } = await db.query(
    `select tablename || '.' || policyname as p from pg_policies where schemaname='public' order by 1`);
  return rows.map((r) => r.p);
}

const insertProfile = (tx, id, over = {}) => tx.query(
  `insert into public.profiles (id, full_name, username, age, belt_level, school_name)
   values ($1, $2, $3, $4, $5, $6)`,
  [id, over.full_name ?? 'Test Member', over.username ?? `user_${id.slice(-1)}`, over.age ?? null,
    over.belt_level ?? 'Yellow Belt (9th Gup)', over.school_name ?? null]);

async function seedProfile(db, id, over) {
  await db.transaction(async (tx) => { await insertProfile(tx, id, over); });
}

function privacyContract(getDb) {
  test('anonymous visitors cannot read profiles at all', async () => {
    const db = await getDb();
    await seedProfile(db, A);
    await rejectsCode(asAnon(db, (tx) => tx.query('select full_name, age, school_name from public.profiles')), '42501');
    await rejectsCode(asAnon(db, (tx) => tx.query('select id from public.profiles')), '42501');
  });

  test('members read only their own profile row', async () => {
    const db = await getDb();
    await seedProfile(db, A, { username: 'alpha_one' });
    await seedProfile(db, B, { username: 'bravo_two', age: 9 });
    const rows = await asUser(db, A, async (tx) => (await tx.query('select id, username, age from public.profiles')).rows);
    assert.deepEqual(rows.map((r) => r.id), [A]);
  });

  test('members cannot insert or update another member’s profile', async () => {
    const db = await getDb();
    await seedProfile(db, B, { username: 'bravo_two' });
    await rejectsCode(asUser(db, A, (tx) => insertProfile(tx, B, { username: 'hijack' })), '42501');
    const updated = await asUser(db, A, async (tx) =>
      (await tx.query(`update public.profiles set full_name = 'Changed' where id = $1`, [B])).affectedRows);
    assert.equal(updated, 0);
    await rejectsCode(asUser(db, B, (tx) => tx.query(`update public.profiles set id = $1 where id = $2`, [A, B])), '42501');
  });

  test('anonymous school-name lookup works; creator ids and timestamps stay private', async () => {
    const db = await getDb();
    await asUser(db, A, async (tx) => { await tx.query(`insert into public.schools (name) values ('Lookup Dojang')`); });
    await db.exec(`insert into public.schools (name, created_by) values ('Lookup Dojang', '${A}') on conflict do nothing`);
    const names = await asAnon(db, async (tx) => (await tx.query('select name from public.schools order by name')).rows);
    assert.ok(names.some((r) => r.name === 'Lookup Dojang'));
    await rejectsCode(asAnon(db, (tx) => tx.query('select created_by from public.schools')), '42501');
    await rejectsCode(asAnon(db, (tx) => tx.query('select * from public.schools')), '42501');
    await rejectsCode(asUser(db, B, (tx) => tx.query('select created_by, created_at from public.schools')), '42501');
  });

  test('members can add a school but cannot rename, delete or spoof the creator', async () => {
    const db = await getDb();
    await asUser(db, A, async (tx) => {
      await tx.query(`insert into public.schools (name) values ('  Riverside Taekwondo  ')`);
    });
    await db.exec(`insert into public.schools (name, created_by) values ('Riverside Taekwondo', '${A}')`);
    const { rows } = await db.query(`select name, created_by from public.schools where name like 'Riverside%'`);
    assert.deepEqual(rows, [{ name: 'Riverside Taekwondo', created_by: A }]);
    await rejectsCode(asUser(db, B, (tx) => tx.query(`update public.schools set name = 'Vandalised'`)), '42501');
    await rejectsCode(asUser(db, B, (tx) => tx.query(`delete from public.schools`)), '42501');
    await rejectsCode(asUser(db, B, (tx) => tx.query(`insert into public.schools (name, created_by) values ('Spoof', $1)`, [A])), '42501');
    await rejectsCode(asAnon(db, (tx) => tx.query(`insert into public.schools (name) values ('Anon School')`)), '42501');
  });

  test('adding an existing school (any case/spacing) is a clean duplicate, not an update', async () => {
    const db = await getDb();
    await db.exec(`insert into public.schools (name) values ('Harbor TKD')`);
    await rejectsCode(asUser(db, A, (tx) => tx.query(`insert into public.schools (name) values (' harbor tkd ')`)), '23505');
    await rejectsCode(asUser(db, A, (tx) => tx.query(`insert into public.schools (name) values ('x')`)), '23514');
    await rejectsCode(asUser(db, A, (tx) => tx.query(`insert into public.schools (name) values ($1)`, ['y'.repeat(101)])), '23514');
  });

  test('database enforces the same validation as the UI', async () => {
    const db = await getDb();
    const bad = [
      [{ username: 'Has Caps' }, '23514'],
      [{ username: 'ab' }, '23514'],
      [{ username: 'x'.repeat(21) }, '23514'],
      [{ full_name: '   ' }, '23514'],
      [{ full_name: 'n'.repeat(81) }, '23514'],
      [{ age: 100 }, '23514'],
      [{ age: 4 }, '23514'],
      [{ belt_level: 'Purple Belt' }, '23514'],
      [{ belt_level: '' }, '23514'],
      [{ school_name: 's'.repeat(101) }, '23514'],
    ];
    for (const [over, code] of bad) {
      await rejectsCode(asUser(db, A, (tx) => insertProfile(tx, A, over)), code);
    }
    await rejectsCode(asUser(db, A, (tx) => tx.query(
      `insert into public.profiles (id, full_name, username, belt_level, avatar_url) values ($1, 'N', 'avatar_x', 'Yellow Belt (9th Gup)', 'javascript:alert(1)')`, [A])), '23514');
    // belt is required in the DB exactly as in the UI
    await rejectsCode(asUser(db, A, (tx) => tx.query(
      `insert into public.profiles (id, full_name, username) values ($1, 'No Belt', 'no_belt')`, [A])), '23514');
    // valid, with optional age omitted
    await asUser(db, A, (tx) => insertProfile(tx, A, { username: 'valid_name', age: null }));
  });

  test('members CAN update their own profile (positive case)', async () => {
    const db = await getDb();
    await seedProfile(db, A, { username: 'alpha_one' });
    const row = await asUser(db, A, async (tx) => {
      const res = await tx.query(`update public.profiles set full_name = 'Updated Name', school_name = 'New School' where id = $1 returning full_name, school_name`, [A]);
      return res.rows;
    });
    assert.deepEqual(row, [{ full_name: 'Updated Name', school_name: 'New School' }]);
  });

  test('usernames are unique case-insensitively', async () => {
    const db = await getDb();
    await seedProfile(db, B, { username: 'taken_name' });
    await db.exec(`update public.profiles set username = 'taken_name' where id = '${B}'`);
    await rejectsCode(asUser(db, A, (tx) => insertProfile(tx, A, { username: 'taken_name' })), '23505');
  });

  test('username_available() answers anonymously with only a boolean', async () => {
    const db = await getDb();
    await seedProfile(db, B, { username: 'taken_name' });
    const check = (name, who = null) => as(db, who ? 'authenticated' : 'anon', who,
      async (tx) => (await tx.query('select public.username_available($1) as ok', [name])).rows[0].ok);
    assert.equal(await check('fresh_name'), true);
    assert.equal(await check('taken_name'), false);
    assert.equal(await check('TAKEN_NAME'), false);
    assert.equal(await check('bad name'), false);
    assert.equal(await check('taken_name', B), true, 'a member keeping their own name is allowed');
  });

  test('timestamps are server-controlled', async () => {
    const db = await getDb();
    const row = await asUser(db, A, async (tx) => {
      await tx.query(`insert into public.profiles (id, full_name, username, belt_level, created_at, updated_at)
                      values ($1, 'T', 'time_test', 'Yellow Belt (9th Gup)', '2000-01-01', '2000-01-01')`, [A]);
      return (await tx.query(`select created_at, updated_at from public.profiles where id = $1`, [A])).rows[0];
    });
    assert.ok(new Date(row.created_at).getFullYear() > 2020);
    assert.ok(new Date(row.updated_at).getFullYear() > 2020);
  });

  test('only the expected policies exist', async () => {
    assert.deepEqual(await policies(await getDb()), EXPECTED_POLICIES);
  });
}

describe('fresh install', () => {
  privacyContract(async () => {
    const db = await newDb();
    await db.exec(SETUP);
    return db;
  });

  test('re-running the script is idempotent', async () => {
    const db = await newDb();
    await db.exec(SETUP);
    await db.exec(SETUP);
    await db.exec(SETUP);
    assert.deepEqual(await policies(db), EXPECTED_POLICIES);
  });

  test('no invented schools are seeded by the migration', async () => {
    const db = await newDb();
    await db.exec(SETUP);
    assert.equal((await db.query('select count(*)::int as n from public.schools')).rows[0].n, 0);
  });
});

describe('migration from the original d05016a policies', () => {
  test('legacy policies really were permissive (baseline)', async () => {
    const db = await newDb({ legacy: true });
    await seedProfile(db, A, { username: 'legacy_a', age: 8 });
    const rows = await asAnon(db, async (tx) => (await tx.query('select full_name, age from public.profiles')).rows);
    assert.equal(rows.length, 1, 'anon could read profiles before hardening');
    const renamed = await asUser(db, B, async (tx) =>
      (await tx.query(`update public.schools set name = 'Renamed' where name = 'Tiger Taekwondo Academy'`)).affectedRows);
    assert.equal(renamed, 1, 'any member could rename a school before hardening');
  });

  privacyContract(async () => {
    const db = await newDb({ legacy: true });
    await db.exec(SETUP);
    return db;
  });

  test('legacy rows survive; invalid ones are reported by preflight', async () => {
    const db = await newDb({ legacy: true });
    await db.exec(`insert into public.profiles (id, full_name, username, age) values ('${A}', 'Legacy', 'Legacy_User', 100)`);
    await db.exec(SETUP);
    await db.exec(SETUP); // idempotent after migration too
    assert.deepEqual(await policies(db), EXPECTED_POLICIES);
    const { rows } = await db.query('select username, age from public.profiles');
    assert.deepEqual(rows, [{ username: 'Legacy_User', age: 100 }]);
    const results = await db.exec(PREFLIGHT);
    const flagged = results.flatMap((r) => r.rows).filter((r) => r.username === 'Legacy_User');
    assert.ok(flagged.length >= 1, 'preflight lists the invalid legacy username');
    assert.ok(results.flatMap((r) => r.rows).some((r) => r.age === 100), 'preflight lists the out-of-range age');
  });

  test('an unknown permissive policy blocks the migration and nothing is changed', async () => {
    const db = await newDb({ legacy: true });
    await db.exec(`create policy "sneaky_read" on public.profiles for select using (true);`);
    await assert.rejects(db.exec(SETUP), /unrecognised policies exist \(public\.profiles: sneaky_read\)/);
    await db.exec('rollback'); // the script's own transaction is aborted; end it as a client would
    const p = await policies(db);
    assert.ok(p.includes('profiles.profiles_select_all'), 'legacy policy still present → transaction rolled back');
    assert.ok(p.includes('profiles.sneaky_read'));
    assert.ok(!p.includes('profiles.profiles_select_own'));
  });

  test('usernames that differ only by case stop the migration with a clear message', async () => {
    const db = await newDb({ legacy: true });
    await db.exec(`insert into public.profiles (id, username) values ('${A}', 'Same'), ('${B}', 'same')`);
    await assert.rejects(db.exec(SETUP), /usernames that differ only by case/);
    await db.exec('rollback');
    assert.ok((await policies(db)).includes('profiles.profiles_select_all'), 'nothing was applied');
  });
});

test('belt list in SQL matches js/lib/belts.js (setup and preflight)', () => {
  for (const sql of [SETUP, PREFLIGHT]) {
    const block = sql.match(/array\[\s*([\s\S]*?)\]::text\[\]/)[1];
    const list = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    assert.deepEqual(list, [...BELT_LEVELS]);
  }
});
