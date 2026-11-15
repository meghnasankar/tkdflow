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
| Support / incident contact | **TBD** (support email not yet created) | Address exists, is monitored and is listed on `about.html#contact` |
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
   - All 10 pages (`/`, `/forms.html`, `/taegeuk-1.html`, `/community.html`, `/forum.html`,
     `/competitions.html`, `/about.html`, `/auth.html`, `/profile.html`, an unknown path → 404)
     at **320, 375, 390, 768 and 1280 px** — 50 checks: no horizontal overflow, content readable.
   - Mobile menu: tap, Enter, Escape (focus returns to the toggle).
   - Library: search "Koryo" → one card; lesson filter → one lesson; lesson Next keeps text, row and slider in sync.
   - Events: Past archive filters work; nothing appears as open or upcoming.
   - Auth page shows the paused state (while accounts are off); no form is usable.
   - Browser console: no errors except the deliberate 404, and **no CSP report-only violations**.
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

Expected: all six header names present (CSP as `Content-Security-Policy-Report-Only` until §8);
`/index.html` answers 308 (redirect to `/`); the unknown path answers 404 with the branded page.
Also confirm `https://tkdflow.com/sitemap.xml`, `/robots.txt`, `/favicon.ico` and
`/assets/og-image.png` return 200, and that the home page console has no CSP report-only violations.

## 6. Monitoring (minimum)

Tool and alert recipient: **TBD**. Minimum checks once configured:

- `https://tkdflow.com/` and `https://tkdflow.com/data/forms.json` return 200.
- Security headers present (the §5 header command, daily).
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

1. After at least one production release with **no** CSP report-only violations on any page
   (including the auth pages once accounts are on), change the `vercel.json` header key from
   `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.
2. Release through §2–§5. Roll back with §7 if any page breaks.

## 9. Member accounts rollout (separate, reviewed release)

Prerequisites (all must be true): project access and administrator named (§0); owner-approved
audience/privacy/retention model and published privacy policy; support contact live; backup type
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
