# Lesson help: private questions, moderator review and public lesson answers

Prepared 2026-11-17 on `feat/lesson-help-2026-11-17`.

## Rollout status — 2026-11-17

The owner approved staging checks and conditional production publication.

- **Database (done and verified):** the reviewed `supabase/lesson-help.sql` and the rollback probe `supabase/tests/lesson-help-probe.sql` were applied to the staging and production projects. Both probes passed.
  - **Staging** preserved 1 profile, 0 moderators and 0 learning rows. The temporary owner-only moderator role used by the probe was rolled back.
  - **Production** preserved 2 profiles, 2 moderators and 0 learning rows.
  - In both projects, synthetic questions, replies, help events, FAQ entries and revisions are all zero after rollback.
  - A production anonymous HTTP read of `public_lesson_faq` returned 200, version 1, with no entries (nothing is published yet).
- **Local checks:** all 437 local checks passed. The source hashes have not changed since.
- **Frontend publication (pending):** the GitHub branch/PR and the hosting deployment of the pages and scripts have not happened yet. Until they do, the live site does not show the lesson help section, `/lesson-help.html` or `/lesson-faq.html`.
- No accounts were created and no email was sent by this rollout.

## What members and visitors see

- **Every lesson (all 23)** has a **Help with this lesson** section below the player. It is hidden in Study view, so the fitted player is never covered.
  - It shows up to five published answers for that lesson and links to all of them.
  - Eligible members can ask a private question from the same section.
- **Composing a question:**
  - The current animation pose is captured when the member starts writing. The member can switch to "The whole form", or update to the pose now showing.
  - The pose is labelled as an *animation pose*, never as an official movement count.
  - The question stores the lesson ID, pose index and canonical pose count, and links back with an explicit `?pose=N#player` link. Explicit pose links already take precedence over saved-learning resume.
  - The composer never moves the player, changes the address or writes saved learning.
- **Who can ask:** members with a confirmed email and a completed profile (name, username, belt level) who are 13 or over. Age 13+ is established by an enrollment band, or by a recorded profile age of 13+.
  - **Teens can ask privately.** Their public posting rights are unchanged: `discussion_access().adult` stays false.
  - **Guests** see a sign-in explanation.
  - **Known under-13 visitors** (age-screen result, or a legacy under-13 profile) see that the lessons and public answers stay open. No form is shown, and for an age-screened visitor no account client is started.
  - An account whose age is unknown and has no enrollment band is told its age needs confirming.
- **`/lesson-help.html` (My lesson questions, noindex)** lists only the member's own questions, with status and private moderator replies, credited to "TKDflow moderators".
  - Nothing is emailed, and nothing is auto-published.
  - Loading, empty, offline and failed states are shown.
  - It is linked from every lesson, My learning, the profile page and the FAQ page.
- **`/lesson-faq.html` (public, in the sitemap)** has search and a lesson filter, deep links (`?lesson=…`, `?q=…`, `#faq-<id>`), and plain-text answers. Each answer shows a link to its pose or form, an optional safe `https` reference and its contributor credit.
  - It is read through a stateless public request carrying only the public key (`js/lib/public-faq.js`). No account client or session is involved.
  - No questions, answers or endorsements are seeded. The page starts empty until moderators publish.

## Moderators

- **Who:** existing community moderators (`private.community_moderators`, server-verified). No new role and no grants are added.
- **Where to find the tools:** `/lesson-help.html`, linked from Community's moderator-only Moderation section and from the profile page.
- **Review queue:**
  - Filter by lesson and status (open, waiting, reviewed, resolved, closed, all).
  - Recurring questions are grouped automatically by lesson and pose. Moderators can also set a short group key.
  - Members appear only as a stable pseudonym (`Member 1A2B3C`), with no email, school, profile or study history.
  - Pose links open in a new tab.
  - Moderators send private replies and move questions between states: waiting → reviewed, resolved or closed; resolved → reopen or close; closed → reopen.
  - Each status change, reply and grouping is recorded in `lesson_help_events`.
- **Public answers:**
  - Moderators write a **separate** public question and answer. A required confirmation says it was written for the public and copies no member's private text.
  - **New answers start as drafts**, and publishing is a separate step.
  - Editing a published answer updates it live only after an explicit "Update the public answer now" confirmation, which the server also requires (`update_public`).
  - Unpublishing hides an answer.
  - Every create, edit, publish and unpublish keeps a snapshot in `lesson_faq_revisions`. Edits check the expected version, so a stale tab cannot overwrite a newer edit.
- **Credit** is always derived on the server:
  - "TKDflow moderators", or `@username`;
  - on edit, **keep the existing credit** (the default), so a correction never re-attributes another moderator's answer.
  - Arbitrary credit text is rejected, and instructor credentials are not offered or claimed.

## Server design (`supabase/lesson-help.sql`)

- **Shape:** additive and rerunnable. Apply after `supabase-setup.sql`, `community.sql` and `enrollment.sql` (it uses `private.account_eligibility` and `private.community_moderators`).
- **Five tables**, each with RLS enabled and **no client grants**:
  - `lesson_help_questions`
  - `lesson_help_replies`
  - `lesson_help_events`
  - `lesson_faq_entries`
  - `lesson_faq_revisions`
- **Narrow `SECURITY DEFINER` functions, all granted to `authenticated` only:**
  - `lesson_help_access`
  - `submit_lesson_question`
  - `my_lesson_questions`
  - `lesson_help_queue`
  - `set_lesson_question_status`
  - `reply_lesson_question`
  - `group_lesson_question`
  - `save_lesson_faq`
  - `set_lesson_faq_published`
  - `lesson_faq_admin`
- **One public function:** `public_lesson_faq`, the only function granted to `anon`. It returns published entries' public fields only.
- **Account binding:** member *and* moderator calls take the page's expected `account_id`, and the server refuses a call if the signed-in account differs. A request started before an account switch therefore cannot act as the new account.
- **Lesson and pose checks:** lessons are limited to the 23 published IDs, with canonical animation pose counts. Tests recompute these from the lesson data. Pose `CHECK`s require both values in the populated branch.
- **Text:** trimmed and bounded, with control characters rejected. Text is stored verbatim and always rendered as text, never HTML. References must be credential-free `https://` links of up to 500 characters.
- **Idempotency:**
  - Questions are unique per `(author, request_id)`. A retry returns the original, and a reused ID with a different payload is refused.
  - Replies and FAQ saves follow the same rule.
  - The same open question at the same lesson and pose within 7 days returns the existing one.
- **Rate limits:** one question per 15 s, 5 per hour and 20 per day for each member.
- **Account deletion:** cascades the member's questions, replies and events. A moderator's replies and FAQ entries keep their text, and the actor becomes null. A public FAQ credit is a stored public string; remove or edit the entry if a moderator asks.

### Deployment and rollback

1. Review, then apply `supabase/lesson-help.sql` **on staging first**.
2. Make a private copy of `supabase/tests/lesson-help-probe.sql`, replace `__TKDFLOW_QA_OWNER_EMAIL__` with **one** confirmed staging account that has a completed 13+ profile, and run it.
   - It needs the owner's **explicit approval before any cloud execution**. With that approval it was run once on staging and once on production on 2026-11-17; both passed and rolled back (see "Rollout status"). Any further run needs fresh approval.
   - If that owner has no moderator role (as in staging), the probe adds the role for that owner only, inside its transaction. Every change, including that role, is **rolled back**, and other roles are checked as untouched.
   - It exercises access, submit, own-list, the queue (checking the synthetic row's allowed fields), reply, status changes, denial of a different account and of direct table reads, FAQ create/publish, and anonymous public read and denial.
3. Publish the frontend only after the owner approves. A frontend rollback can leave the additive schema and data in place.
4. **Pause without data loss:** run `revoke execute on function public.submit_lesson_question(uuid,text,integer,text,uuid) from authenticated;` and do the same for the moderator write functions. The pages show their unavailable or failed states, and the data is kept. Dropping the tables deletes private questions; do that only as an approved data-deletion step.

## Limits in this release

- There are no email or in-app notifications. Members check My lesson questions.
- Grouping is by lesson and pose, plus an optional manual key. There is no text similarity.
- A member cannot edit or withdraw a question from the UI. Withdrawals and deletion go through the manual data-request procedure.
- Moderator replies show as "TKDflow moderators", not as individual moderators.
- Lesson technique content remains unreviewed. Answers are study guidance and should send learners back to their own instructor.

## Tests

- `tests/lesson-help-db.test.mjs` runs the real migrations in PGlite. It covers:
  - access reasons;
  - denial for guests, unconfirmed, incomplete, under-13 and unknown-age accounts;
  - a teen asking without gaining posting rights;
  - cross-account and session-switch refusals;
  - direct-table denial;
  - validation and markup kept as plain text;
  - idempotency, duplicate handling (including pose) and rate limits;
  - moderator-only queue access with pseudonyms;
  - transitions and the audit trail;
  - reply payload reuse;
  - FAQ drafts, publication, live-edit confirmation, versions, revisions and public-field whitelisting;
  - credit preservation with two moderators;
  - URL safety;
  - account deletion;
  - migration reruns;
  - the probe rollback, for both an owner without the role and one with it.
- `tests/lesson-help.test.mjs` covers:
  - client validation and record whitelisting;
  - composer races: retry reuses the exact request ID and pose, the pose is locked while sending, newer edits survive, and an account switch discards an in-flight result;
  - the stateless public read: headers, timeout, configuration and no account client;
  - RPC parameters, including `account_id` on moderator calls;
  - wiring on all 23 lessons and the Study view rule;
  - the moderator page guards: latest-request, permission epoch, locked editor and cards, and distinct IDs;
  - navigation, page registration and no seeded content.
- **Browser QA** uses an untracked local fixture with synthetic accounts:
  - real UI and controllers;
  - substituted account and public-read modules backed by PGlite with the real migrations;
  - fail, delay and hold controls;
  - same-account role revocation and regrant (`USER_UPDATED`).
