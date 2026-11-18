# Account age policy and production status

Updated 2026-11-17. These are owner-approved product rules, not a claim of legal compliance.

## Approved rules

- Public lessons and the forms library are available to all ages without an account or entering account details.
- Individual accounts are for ages 13 and over. A neutral age screen precedes account details. The server checks the answer and retains a private teen/adult eligibility band, not the screening age.
- Ages 13–17 have private profiles and cannot publish discussions or send messages. Editable profile age cannot promote a teen to adult posting permission.
- Adults aged 18 or over can submit discussions for moderation. Profiles remain private; approved text, username and date are public.
- Private lesson help: confirmed 13+ members with completed profiles, **including teens**, can send a private question about a lesson pose and read private moderator replies. This is a member-to-moderator support channel, not public posting or member-to-member messaging: teens still cannot publish discussions or message other members, and nothing they ask is published automatically. Public lesson answers are written separately by moderators. Known under-13 visitors and legacy under-13 profiles cannot ask; the lessons and public answers remain open to them. See docs/lesson-help.md.
- Forum moderation is a separately assigned staff permission. A teen moderator can review submissions without gaining public posting permission or access to other members' private profiles.
- Under-13 individual accounts are unavailable. Parent-managed child profiles are a future feature; no child login, child schema or consent flow is advertised as available.
- Optional profile age must be 13–99. It is separate from the enrollment answer and cannot grant adult rights.

## Production activation

The owner explicitly requested publication and approved the production school migration, screened registration and signed-in Google linking on 2026-11-17. The recovered original Supabase project belongs to Meghna. Its production before-user-created hook is configured and the school migration preserved one existing profile and six legacy schools, adding 334 sourced directory records and one private suggestion. No legacy record was deleted or made public.

Production server signups and member-initiated Google linking are enabled; anonymous accounts remain off and email confirmation remains on. Six live backend checks passed: public school business records are readable, anonymous profiles and review queues are denied, wrong-origin and under-13 enrollment are rejected, and a screened adult receives a short-lived enrollment ticket. The server stores only the resulting eligibility band. New Google-first accounts remain denied: users confirm an email account, then connect Google for future sign-in.

Google's external app now displays In production with identity, email and basic profile access only. Its public support contact is the owner-approved TKDFlow Support Google Group; conversations and membership are owner-only while incoming support mail is open. Personal destination inboxes are not published in the site or repository.

Staging confirmation, Google connection/repeat login, sign-out, recovery and password sign-in passed. Support forwarding delivery was confirmed by the owner on 2026-11-17. The production owner-account email and Google smoke test is the final live verification step after this client release. Never enter or read a new password, reset token or private provider key on the owner's behalf.

## Schools and privacy

School selection is optional and member associations remain private. Saving an unlisted school queues business details privately for review. Approved business facts join the shared picker under ODbL; student identity and membership never enter that public listing. The initial 334-school directory is explicitly incomplete and provides per-record sources, country/region/city filters and a missing-school flow.

School-only review access uses a private owner-managed role; it does not permit forum moderation or another member's profile reads. Staging review access was approved and tested. Production review access must be attached to the intended confirmed account, never guessed from a name or granted through client code. Forum moderator access is a separate role.

The public privacy/contact notice and first-party fonts/pinned account library were published with PR #13. Hosting still receives ordinary request logs. No site analytics or advertising tracker is installed. The public contact is support@tkdflow.com; never publish its personal destination.

## Remaining gates

The frontend must be live to complete the owner's production confirmation/sign-in/Google test. Record those results and the verified production school-reviewer assignment in the release log. If a live account flow fails, pause the affected switch while repairing it; do not weaken email confirmation, enrollment checks or row security. Parent-managed child profiles remain a separate future feature with their own consent, relationship, permissions, retention and deletion design.

## Data requests

The public notice offers manual copy, correction and deletion through the verified support alias. Verify ownership through the registered account; never request passwords or reset links. Follow docs/account-data-requests.md. Do not delete records merely because they are old or because a browser reports an ineligible age.

## Age-screen limits

The screen relies on a truthful answer and is not age verification. A new tab/browser or cleared storage shows it again. In a known-ineligible tab, no account client starts and only public-learning routes are shown. The database profile constraint alone does not gate auth account creation; the deployed server hook does.

A neutral screen and a written policy are **not COPPA compliance**. Applicability and any future child-profile design require appropriate audience/privacy review. Primary reference: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
