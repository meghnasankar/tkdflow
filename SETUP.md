# TKDflow · Setup, checks and restoring accounts

The site is static HTML/CSS/JS (ES modules, no build step), deployed on
Vercel. The only backend is **Supabase**: member accounts, profiles, the school
directory, Community discussions, saved learning and lesson help.

**Current source state** (`js/config.js` → `ACCOUNTS`): `enabled`, `signupEnabled`
and `googleEnabled` are all `true`. `enabled` also gates public Community, discussion
and lesson-answer reads; there is no separate Community switch. What production
actually serves is verified, not assumed: run `npm run check:live` (below) from the
deployed commit. Cloud settings that can't be read from source (Supabase Auth
options, SMTP, applied SQL) are owner records, kept in the dated sections at the end.
"Restoring member accounts" is history from when accounts were off.

## Layout of the repository

| Path | What it is |
|---|---|
| `*.html` | Pages. Shared head/header/footer are stamped in from `layout/` |
| `layout/pages.json` | Page titles, descriptions, canonical URLs, sitemap/noindex flags |
| `styles.css`, `css/*.css` | Global and page styles (no inline styles — CSP forbids them) |
| `js/site.js` | Navigation + account link, loaded on every page (works without Supabase) |
| `js/config.js` | Public site + account-service configuration |
| `js/lib/*.js` | Tested logic: catalogue, events, auth flows, validation, DOM helpers |
| `js/pages/*.js` | One controller per page |
| `data/*.json` | Content: forms catalogue, events, forum/community preview examples |
| `supabase-setup.sql` | Hardened base schema + policies (fresh install or upgrade) |
| `supabase/*.sql` | Additive SQL on top of the base: `community`, `discussion-guides`, `discussion-report-review`, `enrollment`, `learning`, `lesson-help`, `school-directory` (+ seed); `preflight.sql` is read-only. Owner-applied, staging first |
| `supabase/preflight.sql` | Read-only checks to run on the real project first |
| `tests/` | `npm test` — unit, flow, database-permission and release checks |
| `vercel.json`, `.vercelignore` | Deployment headers/redirects; dev files excluded from deploys |

## Local preview

```bash
npm install
```

(Installs the only dev dependency, `@electric-sql/pglite`, used by the
database tests. The site itself has no runtime npm dependencies.)

```bash
npm run serve
```

Opens `http://127.0.0.1:8899/` (use `-- --port 8901` for another port).
The preview server applies the `vercel.json` headers and **enforces** the
Content-Security-Policy, serves `404.html` for unknown paths, refuses
dot-files and development folders, and only binds to loopback.
`npm run serve -- --report-only` sends the same policy as
`Content-Security-Policy-Report-Only` instead, to rehearse a report-only deployment.
Do not open pages as `file://` — modules and data loading need a server.

## Checks (run before every release)

```bash
npm run check
```

This verifies that the generated files are current (stamped layout and sitemap,
read and print companions, technique index; each has a `--check` drift mode)
and runs every test:
script syntax, no inline scripts/handlers/styles or raw HTML injection, no
`href="#"` or dead local links, labels/accessible names, metadata,
unsupported claims, content-file validation, safe account config, headers,
colour contrast, catalogue/event/lesson logic, auth/profile flows (with
hanging and failing fake clients), preview-server path safety, and the
database policies in an embedded Postgres (PGlite).

After editing anything in `layout/`, lesson data or narration cues, run `npm run sync`.

After a deployment, from the deployed commit:

```bash
npm run check:live
```

It makes read-only GET requests to `https://tkdflow.com` (or `--base <origin>`, which must be
a bare https origin with no credentials, path or query). It fails if:
- any sitemap page, script or stylesheet, or any public file named on the command line,
  differs byte for byte from this checkout;
- the global `vercel.json` headers differ on the home page, `/styles.css` or a favicon, or
  a favicon's own `Cache-Control` differs;
- a `vercel.json` redirect differs;
- any development path answers anything but 404: every `.vercelignore` entry, `vercel.json`
  and every dot-file.

Named files must be public files of this checkout. URLs, `..`, dot-files, development paths
and symlinks are refused as usage errors before any request. `--csp report-only` expects the
report-only header instead, and `--json <file>.json` saves the results. See docs/RELEASE.md §5.

Manual checks still required (not automated here): keyboard-only pass and a
screen-reader spot check on each page, phone widths 320/375/390/768, and the
staging account checks below.

## Releases, rollback and recovery

Follow [docs/RELEASE.md](docs/RELEASE.md): release record, local checks, preview QA
(every page in `layout/pages.json` × 5 widths), first public release with accounts off and no database migration,
post-deploy header/CSP checks, Vercel Instant Rollback, CSP enforcement, the separate
accounts rollout, and database recovery that never restores the old public policies.

## Content rules

- Do not add statistics, people, engagement figures, media, contacts, event
  URLs or claims unless they are real and sourced. `tests/site.test.mjs`
  rejects the known unsupported claims and any email address in pages/data.
- Events need an `https` `source` and a `lastChecked` date before they show
  a registration link; status (upcoming / ongoing / past) is computed from
  dates in the event's own time zone, so a listing archives itself after its
  dates. Copy only what the organiser's page states: leave `eventTypes` empty
  and `registrationDeadline` null without primary evidence (a discount date is
  not a deadline). If the organiser's tier (e.g. ATA "Class A+") does not map
  to local/national/international, use level `unspecified` and record the tier
  as `organiserClass`.
- Lessons record their review status in their lesson data (`data/lessons/*.json`,
  and `js/lessons/taegeuk-1-data.js` for Taegeuk Il Jang); do not mark one reviewed
  without a named reviewer.

## Pinning the Supabase SDK

`js/config.js` loads the local reviewed build at `/vendor/supabase/supabase-2.119.0.js` with an SRI hash computed from the official npm tarball. Tests verify the exact bytes and license. To upgrade, review official release notes, replace the vendored build and provenance, update the pin/hash, then rerun checks and staging account tests. Fonts are also first-party; see `docs/local-assets.md`.

## Restoring member accounts

> **History, not current status.** These steps were written on 2026-11-15, when accounts
> were off and the old project failed DNS. Accounts are now on in source (see the top of
> this file). Keep them as the reference for rebuilding a staging project; check current
> facts in the dated sections at the end and with `npm run check:live`.

**Historical reference (2026-11-16):** [docs/accounts-and-discussions-2026-11-16.md](docs/accounts-and-discussions-2026-11-16.md) records the ownership and access blocker as it stood then, and the staged enrollment, Google-linking and discussion schema the client needed. The steps below are reference material for rebuilding a project; flags alone could not restore the service.


The previous project host (`ffkwwfwrqtwejyrnkxey.supabase.co`) failed DNS
during the 2026-11-15 audit. Do not guess a replacement. In order:

1. **Owner decisions (blocking):** the **audience/age rules are approved**
   (individual accounts 13+; 13–17 private; under 13 only via a future
   parent-managed child profile, not built). See
   [docs/account-age-policy.md](docs/account-age-policy.md): the age screen,
   flow gates and 13–99 profile age are prepared locally. Still blocking: what
   is collected and why, retention, correction/deletion handling, audience and
   third-party review, a published privacy policy, and a **verified** support
   contact on `about.html`. `support@tkdflow.com` forwarding is saved at the
   registrar but delivery is not yet tested, so do not list it or link it yet,
   and never put the destination inbox in source or docs.
2. **Project access:** identify (or create) the intended Supabase project and
   confirm who administers it.
3. **Block server-side sign-ups until approval:** Authentication → Sign In /
   Providers → turn **off** "Allow new users to sign up". This also stops
   Google/OAuth from creating new users. `signupEnabled` in `js/config.js` and
   the age screen only change the UI; neither can stop direct API sign-ups,
   and the SQL profile age rule does not gate `auth.users`. Opening sign-ups
   needs a separate server-side age-enforcement design tested on staging
   (docs/account-age-policy.md → "Remaining gates").
4. **Preflight:** run `supabase/preflight.sql` (read-only) and keep the output.
   Any unexpected policy, grant or view is a release blocker. Under-13 or
   unknown-age counts need the controlled owner review in
   docs/account-age-policy.md → "Legacy records" before `VALIDATE`.
5. **Staging first:** apply `supabase-setup.sql` to a staging project. It runs
   in one transaction and stops if it finds an unrecognised policy. Optional
   sample schools for staging only: `supabase/seed.example.sql`.
6. **Auth settings:** Site URL `https://tkdflow.com`; redirect allow-list
   `https://tkdflow.com/**` (plus staging/preview origins); custom SMTP
   for reliable delivery; minimum password length ≥ 8; leaked-password
   protection and rate limits/CAPTCHA as appropriate; Google provider with
   redirect `https://<ref>.supabase.co/auth/v1/callback`.
7. **Staging tests:** with a staging config, verify end to end: email sign-up
   (with the chosen confirmation setting), the age screen (12 → guidance with
   no form, and no second try after reload, and `?mode=login`/`forgot`/`recovery`
   also keep the guidance; 13 and 18 → sign-up), a legacy profile with age
   under 13 held (not editable, signed out, record untouched), Google sign-in
   (only after the screen), profile completion, an under-13 profile age refused,
   duplicate username, password reset (old password fails, new one works),
   expired reset link, logout, and that an anonymous request to
   `/rest/v1/profiles` and another member's row are both denied while
   `select=name` on `schools` works and `select=created_by` is denied.
8. **Enable:** set `supabaseUrl`, `supabaseAnonKey` and `enabled: true` in
   `js/config.js`; `npm run check` must pass. Turn on `signupEnabled` (and the
   Supabase sign-up setting) only after step 1 is approved.
9. **Production:** apply the SQL, run preflight again, and do an approved
   production smoke test.

## Deployment headers

`vercel.json` sets `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and an
**enforced** `Content-Security-Policy`: `'self'` for scripts, styles, fonts and
images (plus `data:` images), connections to `'self'` and `https://*.supabase.co`
only, and `frame-ancestors 'none'`. Fonts and the Supabase SDK are first-party
files, so no third-party origin is allowed. `tests/site.test.mjs` fails if the
policy falls back to report-only or gains a source. `npm run check:live` confirms
that production sends exactly these headers.


## Current account and school status — 2026-11-17

Support forwarding delivery was confirmed by the owner. Staging email confirmation, password recovery/sign-in and Google connection/repeat login passed. The recovered original project belongs to Meghna; production signups and public website switches remain off. Read `docs/accounts-and-discussions-2026-11-16.md` for current observed state rather than treating earlier restoration steps as unresolved.

The new school feature is additive: apply `supabase/school-directory.sql` after base setup and community, then `supabase/school-directory-seed.sql`. The directory exposes business facts only; private suggestions queue automatically from confirmed profile saves. Assign a verified school reviewer through the owner-controlled private.school_reviewers table to review schools in profile settings. Never grant this role from client code. See `docs/school-directory.md`.


## Lesson help (local, not yet deployed) — 2026-11-17

Private lesson questions, moderator review and public lesson answers are additive: after base setup, community and enrollment, apply `supabase/lesson-help.sql` on staging, then run a private copy of `supabase/tests/lesson-help-probe.sql` (owner approval required before any cloud run; it rolls back). See `docs/lesson-help.md`.


## Production account activation — 2026-11-17

The owner approved and requested publication. PR #13 merged and its school/privacy/assets release deployed. The production school migration preserved one profile and six legacy schools, installed 334 directory records and queued one private unlisted school. Production registration and member-initiated Google linking are enabled; anonymous sign-in remains off and email confirmation stays on. Google's external app is In production with basic identity scopes and the approved private support group contact. Six live backend/permission checks passed. This client release enables the reviewed original project; production owner email/Google smoke results and the confirmed school-reviewer role assignment will be recorded after the live flow. The personal support destination and private credentials remain out of source.
