# Account age policy and restoration status

Updated 2026-11-17. These are the owner-approved product rules, not a claim of legal compliance. Public website accounts remain switched off in `js/config.js`; the isolated staging site is enabled for owner testing.

## Approved rules

- Public lessons and the forms library are available to all ages without an account or entering account details.
- Individual accounts are for ages 13 and over. A neutral age screen precedes account details. The server checks the answer and retains a private teen/adult eligibility band, not the screening age.
- Ages 13–17 have private profiles and cannot publish discussions or send messages. Editable profile age cannot promote a teen to adult posting permission.
- Adults aged 18 or over can submit discussions for moderation. Profiles remain private; approved text, username and date are public.
- Under-13 individual accounts are unavailable. Parent-managed child profiles are a future feature; no child login, child schema or consent flow is advertised as available.
- Optional profile age must be 13–99. It is separate from the enrollment answer and cannot grant adult rights.

## Verified implementation

The original Supabase project was recovered under Meghna's ownership. Its preflight showed one auth account, one profile and six legacy schools, with zero under-13 or unknown-age profiles. No member row details were inspected. Tested profile isolation, enrollment hooks and moderated-discussion schemas are installed in production and staging. Production server signups remain off.

Email enrollment uses a short-lived, single-use server ticket and a Before User Created hook. Unscreened/under-13 requests and new Google-first registrations are denied. Existing confirmed email accounts can connect Google and then sign in with it. The browser gate also holds known under-13 profiles without changing or deleting their records.

The owner completed staging email confirmation, Google connection and repeat Google login, sign-out, password reset and password sign-in. Aggregate counts were one confirmed account, one private profile and one Google identity. Resend sends account emails from the dedicated auth subdomain. Support forwarding delivery was confirmed by the owner on 2026-11-17. Only `support@tkdflow.com` may be published; never commit its destination inbox.

The current local release serves fonts and the pinned account SDK from first-party files. Hosting still receives ordinary request logs. The privacy notice in `about.html#privacy` explains account fields, public discussions, providers, retention and manual data requests. This notice and first-party asset change are not yet deployed.

## Schools and privacy

School selection is optional and is not public on a member profile. The prepared directory migration adds public business records and a separate private suggestion queue. Saving an unlisted school atomically queues it for admin review, including existing legacy private names. Approved business facts join the shared picker under ODbL; student identity, member IDs and associations stay private. Only an owner-assigned moderator can approve/reject. The school migration and initial 334-record directory are installed and browser-tested on staging. Meghna’s staging test account has explicitly approved school-only review access; production is unchanged.

## Remaining gates

- Staging school migration, picker and review approval passed. Prepare the same additive migration/data for the production release, preserving existing profiles and legacy names.
- Publish the updated privacy/contact content and first-party assets in the bounded release; verify account pages, Korean text and animations under the enforced content policy.
- Staging school-review access was explicitly approved and verified. Any production reviewer or forum moderator assignment still requires its verified account and role approval. No member can self-promote.
- Complete Google production branding/support-contact readiness and the main-project email/Google smoke tests. Google is still in limited Testing; public accounts and manual linking remain off in the main project.
- Enable production server registration, manual linking and website account switches only as part of a concrete approved release after those checks pass.

Parent-managed child profiles are a separate future project requiring its own consent, relationship, permissions, retention and deletion design before any child data is collected. They are not a gate to the current 13+ individual account feature.

## Data requests

The public notice offers manual copy, correction and deletion through the verified support alias. Verify ownership through the registered account; never request passwords or reset links. Follow `docs/account-data-requests.md`. Do not delete records merely because they are old or because a browser reports an ineligible age.

## Age-screen limits

The screen relies on a truthful answer and is not age verification. A new tab/browser or cleared storage shows it again. In a known-ineligible tab, no account client starts and only public-learning routes are shown. A UI gate is not a substitute for the server enrollment hook. The database profile constraint alone does not gate auth account creation.

A neutral screen and a written policy are **not COPPA compliance**. Applicability and any future child-profile design require an appropriate audience/privacy review. Primary reference: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
