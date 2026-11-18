# TKDflow release, rollback and recovery runbook

Hosting: Vercel (static site). Account backend: Supabase (currently **off**).
Every field marked **TBD** is genuinely unknown today. A release that depends on a TBD
item must not go ahead until the matching readiness check below is ticked.

## 0. Roles and settings (fill in before the first release)

| Item | Value | Readiness check |
|---|---|---|
| Release owner (approves preview → production) | **TBD** | Named person has Vercel access to promote and roll back |
| Second reviewer | **TBD** | Has reviewed the diff and the preview |
| Vercel project / team | **TBD** | Owner can open Deployments and see production history |
| Supabase project administrator | **TBD** | Owner can open the intended project dashboard |
| Support / incident contact | `support@tkdflow.com` (forwarding saved; delivery test pending) | Address exists, is monitored and is listed on `about.html#contact` |
| Uptime / monitoring tool | **TBD** | Checks in §6 configured and alerting a named person |
| Supabase backup type (daily / PITR) and plan | **TBD** | Confirmed in the Supabase dashboard for the intended project |
| Backup retention period | **TBD** | Confirmed and recorded; matches the published privacy policy |
| Data-retention policy for member data | **TBD** (owner decision) | Published before accounts reopen |
| Email (SMTP) provider for auth mail | **TBD** | Test reset email delivered on staging |

## 1. Release record (copy for every release)

```
Release date (UTC):
Branch / commit SHA:
Commit author (confirmed):
CI run URL (Checks workflow):
Vercel preview URL:
Approved by (preview):
Production deployment URL:
Approved by (production):
Known-good rollback target:    <production deployment URL that was live before this release>
Accounts enabled in config?:   no / yes
Database migration applied?:   none / <file + time + who>
Post-deploy checks (§5):       pass / fail (notes)
```

Keep records in a place the release owner chooses (**TBD**); do not store secrets in them.

## 2. Local checks (before pushing)

1. Confirm contributor attribution for the commit (the repository requires this before any commit).
2. `npm ci`
3. `npm run check` — layout in sync and all tests pass.
4. `git diff --check` — no whitespace errors.
5. `npm run serve` and spot-check the changed pages with CSP enforced.

## 3. Preview deployment and QA

1. Push the branch; the **Checks** GitHub Actions workflow must pass (`npm ci` + `npm run check`).
2. Open the Vercel **preview** deployment for that commit and record its URL.
3. QA on the preview:
   - All 34 pages (`/`, `/start-here.html`, `/forms.html`, `/taegeuk-1.html`, `/community.html`, `/forum.html`, `/competitions.html`, `/about.html`, `/founder.html`, `/auth.html`, `/profile.html`, `/taegeuk-2.html`, `/taegeuk-3.html`, `/taegeuk-4.html`, `/taegeuk-5.html`, `/taegeuk-6.html`, `/taegeuk-7.html`, `/taegeuk-8.html`, `/chon-ji.html`, `/dan-gun.html`, `/do-san.html`, `/won-hyo.html`, `/yul-gok.html`, `/joong-gun.html`, `/songahm-1.html`, `/songahm-2.html`, `/songahm-3.html`, `/keumgang.html`, `/koryo.html`, `/taebaek.html`, `/pyongwon.html`, `/sipjin.html`, `/jitae.html`, an unknown path → 404) at **320, 375, 390, 768 and 1280 px** — 170 checks:
     no horizontal overflow, content readable, the header marks the current section.
   - Founder page: at every width the portrait frame shows the cap, head and upper body (cap fully
     in view, no stretched or distorted image), and no layout shift while the photo loads.
   - Start here: the WT/ITF/ATA buttons open the library filtered to that style; table-of-contents
     links land below the sticky header; FAQ items open with the keyboard.
   - Mobile menu: tap, Enter, Escape (focus returns to the toggle).
   - Library: search "Koryo" → one card; lesson filter → 23 lessons; lesson Next keeps text, row and slider in sync.
   - Events: listings link the organiser's official page and show a last-checked date; nothing claims registration is open; filters are independent; a listing moves to Past only after its own dates (check the data against the date of the QA).
   - Auth page shows the paused state (while accounts are off); no form is usable.
   - Browser console: no application errors except the deliberate 404. Review CSP messages against the shipped application; record preview-toolbar and browser-automation messages separately. Vercel's preview toolbar loads scripts/frames/styles that this application does not ship, and the report-only `upgrade-insecure-requests` directive produces an ignored-directive warning. The instrumented browser also produced an inline-style warning on the static local 404. Do not claim a warning-free console or loosen the policy to silence these tools. Repeat the application-policy check in a regular browser before enforcing CSP (§8).
4. Release owner records approval of the preview.

## 4. First public release (accounts OFF, no database migration)

Scope: the static site exactly as on the preview, with `ACCOUNTS.enabled: false`.
No Supabase change of any kind is part of this release.

1. Confirm `js/config.js` has `enabled: false` and `signupEnabled: false` (the checks enforce key safety either way).
2. Record the current production deployment URL as the **known-good rollback target**.
3. Promote/merge to production per the Vercel project's setup (**TBD**: promotion method), record the production deployment URL.
4. Run the post-deploy checks (§5). If any fail, roll back (§7).

## 5. Post-deploy checks (production)

```bash
curl -sI https://tkdflow.com/ | grep -iE 'x-content-type-options|x-frame-options|referrer-policy|permissions-policy|cross-origin-opener-policy|content-security-policy'
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://tkdflow.com/index.html
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://tkdflow.com/this-page-does-not-exist
```

Expected: all six header names present; `/index.html` answers 308 (redirect to `/`); the unknown
path answers 404 with the branded page.

The same checks, plus page titles, content types, data files, the social image and the
accounts-off flags, are bundled in a read-only command (plain GETs, bounded timeouts and body
size, no credentials, remote JavaScript never run). Say which CSP the deployment should have:

```bash
npm run check:live -- --csp report-only
```

```bash
npm run check:live -- --csp enforced --base https://<deployment-origin> --json check-live.json
```

Use `report-only` for a deployment built before the §8 release and `enforced` after it. Exit code
0 = all pass, 1 = a check failed, 2 = usage error. Expectations come from the checked-out commit,
so run it from the commit that was deployed. A preview behind Vercel Authentication returns its
login page and fails the page checks; check such a preview in an authorised browser instead, and
do not add bypass tokens to the command. Also confirm in a regular browser that the home page
console shows no CSP violations from the application.

## 6. Monitoring (minimum)

Tool and alert recipient: **TBD**. Minimum checks once configured:

- `https://tkdflow.com/` and `https://tkdflow.com/data/forms.json` return 200.
- Security headers present (§5; `npm run check:live` is a manual command, nothing schedules it).
- After accounts are enabled: Supabase project health, auth error rate and email delivery (**TBD**: how).
- CSP violation reporting is not configured yet (**TBD**); until then, check the browser console on releases.

## 7. Rolling back the site (Vercel Instant Rollback)

Use Vercel **Instant Rollback** — see <https://vercel.com/docs/instant-rollback>.

1. In the Vercel dashboard, open the project's production deployments and choose the
   recorded **known-good rollback target**.
2. Use Instant Rollback to make it the live production deployment.
3. Re-run §5 against production.
4. Read the linked documentation at the time of use for plan-specific limits and for how
   later deployments are promoted after a rollback; follow it to return to normal releases.
5. Record what was rolled back, when, by whom and why.

A site rollback never changes the database. If the bad release also changed the database,
follow §9 and do not assume the old site matches the new schema.

## 8. Enforcing the Content-Security-Policy (separate release)

**Current state (18 November 2026):** `vercel.json` in source sends the **enforced**
`Content-Security-Policy`: `'self'` for scripts, styles, fonts and images (plus `data:` images),
connections to `'self'` and `https://*.supabase.co`, and `frame-ancestors 'none'`. `npm run check`
fails if it falls back to report-only, adds `unsafe-*` or any other source. What production sends is
verified, not assumed: `npm run check:live -- --csp enforced`, from the deployed commit, compares
every live security header with this source.

**History (2026-11-15):** when this section was written, production (`682d99d`) sent
`Content-Security-Policy-Report-Only`, and the enforced policy was on the review branch
`fix/post-launch-improvements-2026-11-15`. The steps below are the procedure that was used for that
switch. Keep them for any future change to the policy.

1. Review and approve the change; deploy it as a preview.
2. On the preview: §3 page QA in a regular browser (not the instrumented one), including the
   auth pages, with no application CSP violations. Messages from the Vercel preview toolbar or
   browser automation are not application violations; never allow-list them in the policy.
3. Check headers: `npm run check:live -- --csp enforced --base https://<preview-origin>` where the
   preview is reachable without authentication; otherwise inspect the headers in an authorised browser.
4. Release through §4–§5 with `--csp enforced`. Record the previous production deployment
   as the rollback target; roll back with §7 if any page breaks.
5. To rehearse the report-only baseline locally: `npm run serve -- --report-only`.

## 9. Member accounts rollout (separate, reviewed release)

Prerequisites (all must be true): project access and administrator named (§0); owner-approved
audience/privacy/retention model and published privacy policy (age rules approved; privacy, retention
and server-side age enforcement still open: [account-age-policy.md](account-age-policy.md)); support
contact forwarding verified before it is listed; legacy under-13/unknown-age rows reviewed; backup type
and retention confirmed; SDK hash re-verified (SETUP.md → "Pinning the Supabase SDK").

1. **Staging first.** Follow SETUP.md → "Restoring member accounts" steps 3–7 on a staging project
   (server-side sign-ups off, `supabase/preflight.sql`, `supabase-setup.sql`, auth settings,
   end-to-end and permission tests). Record results.
2. **Production database.** Take/confirm a backup (§0). Run `supabase/preflight.sql`; any
   unexpected policy, grant or view stops the rollout. Apply `supabase-setup.sql` (one transaction;
   it stops on unrecognised policies). Run preflight again and record the output.
3. **Site release with accounts on.** Set `supabaseUrl`, `supabaseAnonKey`, `enabled: true`
   (keep `signupEnabled: false` and Supabase sign-ups off unless the owner has approved opening
   registration). Release through §2–§5 plus an approved production smoke test (sign in, profile
   load/save, password reset, logout).
4. **Rollback for accounts:** redeploy with `enabled: false` (or Instant Rollback to the last
   accounts-off deployment). Keep the database hardening in place.

## 10. Database recovery

Supabase backups and restores are managed in the Supabase dashboard (type and retention **TBD**, §0).

1. Switch the site to accounts **off** (`enabled: false` release or Instant Rollback) and turn
   **off** Supabase sign-ups. Those switches do **not** block anonymous direct database API requests.
2. **Isolate database access before restoring.** Keep the Data API disabled, and any other public
   database access paths unavailable, throughout restore, preflight and hardening. Follow the
   [Supabase Data API security guide](https://supabase.com/docs/guides/api/securing-your-api).
   Confirm that isolation survives the restore and test it before restoring real member data.
   If isolation cannot be guaranteed, do not restore into a publicly reachable target; use a
   separate isolated staging project and a reviewed recovery plan.
3. **Never restore the old public policies to a publicly reachable database.** A backup from before the hardening migration can
   contain public profile reads and school renames by any member. While access stays isolated,
   use the administrator's trusted database connection to run `supabase/preflight.sql`, then
   `supabase-setup.sql`, then preflight again. Verify the actual restored permissions on staging;
   local `npm run test:db` checks alone do not prove deployed settings.
4. Record the restore point, who approved it, the isolation checks, and preflight output before
   and after. Re-enable the Data API only after the owner approves the verified hardened state.
5. Re-enable member accounts only through §9 step 3.

Support forwarding delivery was confirmed by the owner on 2026-11-17. The public alias is `support@tkdflow.com`; its personal destination remains private.


## Account and school update — 2026-11-17

Support forwarding delivery was confirmed by the owner. Staging confirmation, Google link/repeat login, password reset and password sign-in passed. Public accounts remain off. A bounded local release now includes first-party fonts/SDK, privacy/contact copy and a worldwide school picker with a private admin review queue. Cloud school migration and browser QA remain pending; see `docs/school-directory.md` and `docs/accounts-and-discussions-2026-11-16.md`.

Staging school follow-up: 334 sourced schools installed; existing custom school queued, matched to the canonical listing and approved through the browser after explicit school-review-role approval. Production remains unchanged.


## Production account activation — 2026-11-17

The owner approved and requested publication. PR #13 merged and its school/privacy/assets release deployed. The production school migration preserved one profile and six legacy schools, installed 334 directory records and queued one private unlisted school. Production registration and member-initiated Google linking are enabled; anonymous sign-in remains off and email confirmation stays on. Google's external app is In production with basic identity scopes and the approved private support group contact. Six live backend/permission checks passed. This client release enables the reviewed original project; production owner email/Google smoke results and the confirmed school-reviewer role assignment will be recorded after the live flow. The personal support destination and private credentials remain out of source.
