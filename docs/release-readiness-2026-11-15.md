# TKDflow public release-readiness record — 2026-11-15

Scope: public static pages with accounts, registration and Google sign-in **off**. No database migration, service setting, account creation or production deployment is included.

## Review and release references

- Review: [draft PR #1](https://github.com/meghnasankar/tkdflow/pull/1), `fix/audit-2026-11-15`.
- Hosted baseline checked: `85512dc65a5558a209a078777d8a00ed7c9abe7d` at [the protected Vercel preview](https://tkdflow-766s3v3nf-meghnasankars-projects.vercel.app).
- Candidate additionally fixes the main skip-link offset and the unverified-events notice. See the PR for the final commit, latest automated checks and updated preview.
- Production at inspection: `d05016a2484fb3957c2431e92e6258abc9a71dfd`; GitHub deployment `5938027315`, status success.
- Current production deployment reference for rollback: [tkdflow-be2wvyrik](https://tkdflow-be2wvyrik-meghnasankars-projects.vercel.app). Confirm it is still the live deployment and selectable for rollback immediately before release.
- Hosting project/team identified from deployment records: `meghnasankars-projects/tkdflow`. A named person with promotion/rollback access and production approval remain to be recorded in the [runbook](RELEASE.md).

## Verified checks

| Check | Result and scope |
|---|---|
| Automated release checks | `npm run check`: layout in sync, 191/191 tests pass; `git diff --check` clean. Latest candidate CI must also pass on the PR. |
| Hosted responsive pages | All 10 routes at 320, 375, 390, 768 and 1280 px: 50 checks, no document overflow, one main and one h1, no unnamed visible controls in the inspected DOM. Data-backed pages were allowed to load before inspection. |
| Contrast spot-check | No failures among the 3,348 repeated flat-surface text samples checked across that matrix. This excludes complex gradients/layers, inherited opacity and native disabled controls; it is a spot-check, not a complete accessibility audit or count of unique text elements. Existing contrast tests cover the selected design-token pairs. |
| Keyboard entry | Enter activates the skip link and focuses `#main`. The final local offset moves the sign-in h1 from 48 px (covered by the header ending at 69 px) to 117 px. |
| Phone menu | Enter opens the menu; Escape closes it and returns focus to the toggle. |
| Phone library filters | A true 390 px reload starts filters collapsed. Enter expands them; Space selects a belt; ArrowRight moves to the next available belt, preserving focus and updating results. |
| Lesson entry | Keyboard activation of Jump to the player, then Tab, reaches the named player keyboard region. Prior practice checks cover deep links, synchronized state, copy, history and native range stepping. |
| Hosted headers | Root 200 and branded 404 have nosniff, frame DENY, referrer policy, permissions policy, COOP and CSP report-only. HSTS and preview noindex were also observed. |
| Redirect and assets | `/index.html` returns 308 to `/`; unknown route returns branded 404; sitemap, robots, favicon and social PNG return 200 with appropriate content types. |
| Deployment exclusions | `/package.json`, `/docs/RELEASE.md` and `/supabase-setup.sql` return 404 on the authenticated hosted preview. No credential files or member records were opened. |
| Independent source review | Claude reviewed header/resource alignment, deployment exclusions, accounts-off configuration, referenced element ids, relative module/data paths and lesson-history/keyboard changes; no additional release-breaking source problem was identified. |

## Policy-warning limitations

A warning-free console is **not** claimed. Browser security logs capture Vercel preview-toolbar script/frame/style policy reports, an ignored `upgrade-insecure-requests` report-only directive, and an inline-style warning that also occurs in the instrumented local browser on a static 404. The inspected local 404 has no application inline stylesheet or inline script; the browser adds a `codex-browser-sidebar-comments-root` element. The latter warning has no application source URL and is not attributed to an application defect without further evidence.

All checked pages render with the strict policy enforced by the local preview. Keep deployed CSP in report-only mode for the first release. Before enforcement, repeat the application-policy check in a regular browser on the actual production deployment, without hosting preview or automation additions. Do not add `unsafe-inline` or broad hosting-tool allowlists merely to clear diagnostic messages.

## Remaining release decisions and verification limits

- Production publication requires explicit approval and a named person with Vercel promotion/rollback access. Record the reviewed commit, production deployment and known-good rollback target using RELEASE.md.
- Monitoring/alert recipient, support address and the applicable runbook TBD fields have not been invented or configured.
- Actual screen-reader output, manual forced-colors/zoom testing, real mobile hardware, clipboard refusal and background-tab lifecycle remain outside the completed browser checks. Deterministic tests cover clipboard refusal/timeouts, held keys and hide/pagehide behavior.
- Instructor review is still pending. Existing teaching content remains clearly marked unreviewed/draft; no new instructional claims were added.
- Accounts stay closed until Supabase access, staging permission/auth checks, audience/privacy/retention decisions and a working support/contact process are complete. None of those account prerequisites is represented as complete here.
