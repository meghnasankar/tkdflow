# Account age policy — approved plan and implementation status

Status as of 2026-11-15. This records a **product decision** the site owner approved. It is
**not** a privacy policy, **not** legal advice, and **not** a statement that TKDflow complies
with COPPA or any other law. Member accounts, sign-up and Google sign-in remain **off**
(`js/config.js`). This decision does **not** reopen them.

## Approved rules

| Who | Rule |
|---|---|
| Everyone | Public lessons and the forms library: all ages, without creating an account or entering account details. (Visiting any page still involves Google Fonts requests and the host's standard request logs; see the audience and third-party review below.) |
| 13 and over | May hold an individual account. |
| 13–17 | Private by default. No public profile, no public sharing, no messaging. Only the minimum fields: name, username and belt are required; age and school are optional. |
| Under 13 | No independent account and no child login. A parent or guardian **aged 18 or over** owns and manages a **private child profile**. That profile does not exist yet: it is a future feature behind the gates below. |

Neither an optional profile age left blank (`NULL`) nor an unscreened session is evidence that someone may hold an account.

## What is implemented locally (branch `fix/post-launch-improvements-2026-11-15`, not live)

| Piece | Where | What it does |
|---|---|---|
| Neutral age screen | `auth.html` `#panel-age`, `js/lib/age-gate.js` | Shown before any name, email, password or school field, and before Google can start. It asks "How old are you?" with free entry: no checkbox, no preset or default, and no wording that hints at the threshold. The typed age is used only in memory, cleared straight away, and never stored or sent. |
| Session flag | `sessionStorage['tkdflow.ageScreen.v1']` | Stores only `eligible` or `ineligible`, never the age and nothing identifying. Once `ineligible` is set it is never replaced in that session, so reloading the page or pressing back does not offer a second try. A malformed answer stores nothing, and the screen asks again for a whole number. |
| Under-13 route | `auth.html` `#panel-age-guidance` | Links to the public lessons, plus guidance for a parent or guardian that child profiles are planned but not available. It shows no account form and asks for no account details; hosting and font requests still occur. |
| Flow gates (fake-client tests) | `js/lib/auth-flows.js` | Each of these returns `age-screen` without touching the client unless the flag is exactly `eligible`: `register`, `startGoogle` (Google can create users), `completeProfile`, and the automatic profile write in `routeSignedIn`. That means no `signUp`, no `username_available` RPC, no school insert, no profile write and no OAuth redirect. A whole-number age under 13 typed into a profile form returns `ineligible` before any call; the page then records it, clears the form and signs that device out. |
| Known under-13 tab | `authEntryPanel` in `js/lib/age-gate.js`; `auth.js`, `profile.js` | Once a tab has the `ineligible` result, every auth mode shows the public guidance instead of a form, and the account client is never started: `?mode=login`, `forgot`, `recovery`, `complete`, `register`, the header "Log in" link and in-page links all lead there. `profile.html` shows the same public routes. Nothing can turn the result back to `eligible` in that session. |
| Legacy profile with age under 13 (held) | `isKnownUnderMinimumProfile`; `routeSignedIn`, `loadOwnProfile`, `saveProfile` | A stored profile whose age is a whole number under 13 returns `held`. The profile is not shown or editable, and nothing is written (no profile update, school insert or username check). A newly entered whole-number age below 13 also holds profile saving before any call. The page records the tab as ineligible, attempts local sign-out and shows the public routes without claiming sign-out succeeded. The record is **not** deleted or converted. This is a rule in the site's own flows; it does **not** stop direct API access to that account, which needs the server-side gate and the owner review. |
| Not gated | — | For visitors who are unscreened or eligible: password sign-in, password reset, recovery and logout, because they cannot create accounts. Existing members aged 13 or over, or with a blank age, are routed to their profile as before. |
| Profile age | `js/lib/profile-model.js`; inputs `min="13"` | The optional age must be 13–99. An under-13 value is rejected with a policy message; format errors don't mention the threshold. Applies to sign-up, profile completion and profile edits. |
| Database | `supabase-setup.sql` | `profiles_age_individual` = `age IS NULL OR age BETWEEN 13 AND 99`. It is added `NOT VALID` and replaces `profiles_age_check` (original) and `profiles_age_range` (first hardened script, 5–99). It is idempotent and tested as an upgrade from the 162a7aa fixture. Every new insert or update must pass it. |
| Preflight | `supabase/preflight.sql` | Lists rows aged under 13 or out of range. Counts `profiles_under_13` and `profiles_age_unknown` (NULL). Shows which age rule is installed. |
| Public copy | `about.html#age-policy` | The planned rules, labelled as a plan and not a privacy policy, separating paused accounts from future child profiles. |

### Limits of the client-side screen

- A new tab, a private window, another browser or cleared site data shows the screen again. If storage is blocked (including a browser that throws when the page reads `sessionStorage`), the flag lasts only for the current page and the page still works.
- In a tab marked ineligible, an adult who shares the device must open a new tab or window to sign in or reset a password. This is deliberate, so a known under-13 result cannot be undone from the same tab.
- The screen relies on a truthful answer. It is a neutral screen, not age verification.
- Nothing in the browser stops a direct call to the Supabase Auth API. `signupEnabled` and the screen only change the UI.
- **The SQL profile constraint does not gate `auth.users`.** Supabase Auth creates the user (by email or Google) before any profile row exists. The constraint stops only under-13 *profile* ages. Server-side enforcement at account creation is a separate, still-open gate (below). Until it exists, the project setting "Allow new users to sign up" must stay **OFF** (SETUP.md step 3).

## Legacy records (controlled owner review)

The previous host could not be reached during the audit, and no member records were inspected. Whether any accounts or records remain is unknown. If the original project is recovered, earlier rows may include under-13 ages (allowed before as 5–99) or blank ages.

- The migration **never converts or deletes** these rows. A legacy under-13 row cannot be saved again, from the UI or the database, until it has been reviewed.
- Before accounts reopen, the owner runs `supabase/preflight.sql` and keeps only the **counts** in the release record, with no names or emails.
- For each under-13 row, the owner decides, under a documented and approved procedure: delete the account and profile, or (once the parent-managed feature exists) move it under a verified parent. Neither is done automatically.
- A blank age stays blank. It is not treated as eligible, and if the account holder edits their profile it is not changed for them. Unknown-age records still need the controlled owner review before accounts reopen.
- Until that review, the site holds a known under-13 profile (see the table above). That does not limit what a direct API client could do, so server sign-ups and accounts stay off.
- Only after that review should `alter table public.profiles validate constraint profiles_age_individual;` be run.

## Remaining gates (all blocking before accounts or child profiles open)

1. **Server-side sign-up enforcement:** a written design, tested on verified staging, that stops account creation for under-13s or unscreened users at the server. One option is Supabase's Before User Created hook. Reference only, **not configured**: https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook. Until then, server sign-ups stay off.
2. **Privacy notice and retention:** a published privacy policy covering what is collected, why, who can see it and how long it is kept; a minimal retention schedule; and a deletion process, including for auth records.
3. **Audience classification and third parties:** a legal and audience review of whether the site or any part of it is child-directed or mixed-audience, including the use of Google Fonts, hosting logs, and any analytics or embeds.
4. **Support channel:** the public alias `support@tkdflow.com` is **configured, awaiting a delivery test**. ROOT saw the saved forwarding mapping at the registrar (Namecheap), with the existing MX and SPF records pointing to its free forwarding service. The user will test delivery later. Until that test passes, no address or `mailto:` link is published on the site, and `about.html#contact` says only that an address is being set up. The destination inbox is never recorded in tracked source or docs. Once delivery is confirmed, the address can be listed for correction, deletion and parent requests.
5. **13–17 protections in code:** keep profiles owner-only (as today). Any future public profile, sharing, messaging or community posting stays off for under-18s, with tests, before such a feature ships for anyone.
6. **Parent-managed child profiles (follow-up, not built):**
   - an adult guardian account (18 or over);
   - verified parental consent using a method the FTC accepts;
   - a parent–child relationship stored on the server;
   - server-enforced permissions so only that parent can see or change the profile;
   - a way for the parent to review and delete, and to withdraw consent;
   - minimal child data, with no child email or password;
   - retention limits;
   - staging tests.
   No schema, consent service or UI for this exists in the repo, and none should be presented as working.
7. **Staging and owner approval:** the staging checks in SETUP.md plus the age-screen and gate checks above, then explicit approval before any production change.

## Legal context (for review, not a compliance claim)

- FTC, *Complying with COPPA: Frequently Asked Questions*: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- The amended COPPA Rule (16 CFR Part 312) was published on 2025-04-22 (90 FR 16977). It took effect on 2025-06-23, and the general compliance date was 2026-04-22. Sources:
  - Federal Register: https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule
  - FTC final-rule notice: https://www.ftc.gov/legal-library/browse/federal-register-notices/16-cfr-part-312-coppa-final-rule-amendments
- A written policy, a neutral age screen or a parent checkbox is **not COPPA compliance**. The rule's obligations include, among others:
  - notice;
  - verifiable parental consent before collecting from children;
  - parental review and deletion;
  - security;
  - retention limits.
  The 2025 amendments added further requirements, for example a written retention policy and separate consent for some disclosures to third parties. Counsel should confirm which provisions apply.
- Information an adult supplies about their child is treated differently from information collected directly from a child, but it is still personal data that needs notice, minimisation, security and deletion. The child-profile design must be reviewed against the rule, not assumed to be exempt.
- Whether TKDflow is child-directed, mixed-audience or general-audience, and what third-party services (fonts, hosting) collect, still needs review. That classification decides which obligations apply.
