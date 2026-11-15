# TKDflow · Setup, checks and restoring accounts

The site is static HTML/CSS/JS (ES modules, no build step), deployed on
Vercel. The only backend is **Supabase**, used for member accounts and two
tables, `profiles` and `schools`. Member accounts are currently **switched
off** (`js/config.js`) — see "Restoring member accounts".

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
| `supabase-setup.sql` | Hardened schema + policies (fresh install or upgrade) |
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
Do not open pages as `file://` — modules and data loading need a server.

## Checks (run before every release)

```bash
npm run check
```

This verifies the stamped layout is current and runs every test:
script syntax, no inline scripts/handlers/styles or raw HTML injection, no
`href="#"` or dead local links, labels/accessible names, metadata,
unsupported claims, content-file validation, safe account config, headers,
colour contrast, catalogue/event/lesson logic, auth/profile flows (with
hanging and failing fake clients), preview-server path safety, and the
database policies in an embedded Postgres (PGlite).

After editing anything in `layout/`, run `npm run sync`.

Manual checks still required (not automated here): keyboard-only pass and a
screen-reader spot check on each page, phone widths 320/375/390/768, and the
staging account checks below.

## Releases, rollback and recovery

Follow [docs/RELEASE.md](docs/RELEASE.md): release record, local checks, preview QA
(10 pages × 5 widths), first public release with accounts off and no database migration,
post-deploy header/CSP checks, Vercel Instant Rollback, CSP enforcement, the separate
accounts rollout, and database recovery that never restores the old public policies.

## Content rules

- Do not add statistics, people, engagement figures, media, contacts, event
  URLs or claims unless they are real and sourced. `tests/site.test.mjs`
  rejects the known unsupported claims and any email address in pages/data.
- Events need an `https` `source` and a `lastChecked` date before they show
  a registration link; status (upcoming / ongoing / past) is computed from
  dates in the event's own time zone.
- Lessons record their review status in their data module
  (`js/lessons/*.js`); do not mark one reviewed without a named reviewer.

## Pinning the Supabase SDK

`js/config.js` pins `@supabase/supabase-js@2.119.0` with an SRI hash computed
from the npm tarball. Before enabling accounts, confirm the CDN serves the
same bytes:

```bash
curl -sL https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js | openssl dgst -sha384 -binary | openssl base64 -A
```

The output must equal the part after `sha384-` in `sdk.integrity`. To
upgrade, review the release notes, update both values, and re-run the checks
and the staging account tests.

## Restoring member accounts

The previous project host (`ffkwwfwrqtwejyrnkxey.supabase.co`) failed DNS
during the 2026-11-15 audit. Do not guess a replacement. In order:

1. **Owner decisions (blocking):** who may have accounts (minimum age and any
   parent/guardian process), what is collected and why, retention, and who
   handles correction/deletion requests. Publish the privacy policy and a
   working support contact on `about.html` first.
2. **Project access:** identify (or create) the intended Supabase project and
   confirm who administers it.
3. **Block server-side sign-ups until approval:** Authentication → Sign In /
   Providers → turn **off** "Allow new users to sign up". This also stops
   Google/OAuth from creating new users. `signupEnabled` in `js/config.js` only
   hides the form; it cannot stop direct API sign-ups.
4. **Preflight:** run `supabase/preflight.sql` (read-only) and keep the output.
   Any unexpected policy, grant or view is a release blocker.
5. **Staging first:** apply `supabase-setup.sql` to a staging project. It runs
   in one transaction and stops if it finds an unrecognised policy. Optional
   sample schools for staging only: `supabase/seed.example.sql`.
6. **Auth settings:** Site URL `https://tkdflow.com`; redirect allow-list
   `https://tkdflow.com/**` (plus staging/preview origins); custom SMTP
   for reliable delivery; minimum password length ≥ 8; leaked-password
   protection and rate limits/CAPTCHA as appropriate; Google provider with
   redirect `https://<ref>.supabase.co/auth/v1/callback`.
7. **Staging tests:** with a staging config, verify end to end: email sign-up
   (with the chosen confirmation setting), Google sign-in, profile completion,
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
`Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and a
**Report-Only** CSP. After a Vercel preview deploy shows no CSP reports or
broken pages (including auth once enabled), rename the key to
`Content-Security-Policy` to enforce it, then confirm the headers on the live
site.
