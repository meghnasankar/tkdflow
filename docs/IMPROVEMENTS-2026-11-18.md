# Improvement backlog — 18 November 2026

This file tracks the extended improvement session that started from `main` at `d5ad883` (homepage member banner, PR 23).

- **Batch 1 (learner foundations): published.** PR 24 merged as `main` `62d5ac5`. Codex verified it live: all 47 public files match source, security headers match, development paths return 404, the live Start here page has its 10 sections, and "Koryeo" finds Koryo. All 480 checks and the browser review passed: 9 widths, the 769–900 px header without wrapping, and native cross-tab sign-in, sign-out and token refresh with focus kept.
- **Batch 2 (technique finder): published.** PR 25 merged as `main` `fde815c`. Codex verified it live: 47/47 public files byte-match, headers match, development paths return 404, the live finder works, and all 503 checks passed.
- **Batch 3 (public Community reading): published.** PR 26 merged as `main` `47bee71`. Codex verified it live:
  - 7/7 public scripts and config byte-match, headers match, and development paths return 404;
  - the live resources view loads 3 guides with no account-library script;
  - an existing signed-in teen moderator still has moderation but no composer;
  - no errors, and all 527 checks passed.
- **Batch 4 (keyboard and focus continuity): published.** PR 27 merged as `main` `d0fc54e`. Codex verified it live: 6/6 files match, headers and development 404s are correct, and Show more focuses the 25th event.
- **Follow-up (Community initial focus): published.** PR 28 merged as `main` `9f5d5fd`, including the test-only CI timing fix `8835291`. Codex verified it live: source and header checks pass, the public heading keeps focus, and a teen moderator still has moderation but no public composer.
- **Batch 5 (read and print companions): published.** PR 29 merged as `main` `e86803d`. Codex verified it live: 69/69 public files, headers and development 404s; the live index lists all 23; Koryo shows its 52 poses; print works; the header uses root-absolute profile links.
- **Batch 6 (age-aware header): published.** PR 30 merged as `main` `dc05c83` (CI success). Codex verified 5/5 source files, headers and development 404s, and a normal member's UI live.
- **Batch 7 (saved-learning keyboard focus): published.** PR 31 merged as `main` `57fd990`. Codex verified 6/6 public files, headers and development 404s, plus the live tabs in native Chrome.
- **Batch 8 (opt-in search of spoken instructions): published.** PR 32 merged as `main` `16260de`. Codex verified it live: 7/7 public files, security headers and development 404s; Koryo "throat" shows the 4 exact instructions; no account SDK loads.
- **Batch 9 (full spoken instruction in Study view): published.** PR 33 merged as `main` `d77f81b`. Codex verified it live: 2/2 public files, headers and development 404s; real Chrome at 320×700 shows the caption at 47/47 and a 253 px canvas with the full body, controls visible without scrolling, and no errors.
- **Batch 10 (My school’s forms, a private organizer): published.** PR 34 merged as `main` `665c3ff`. Codex verified it live: 72/72 public files, all headers and development 404s.
- **Batch 11 (faster avatar garment construction): published.** PR 35 merged as `main` `0d0a340`. Codex verified it live: 2/2 public files, headers and development 404s; Sipjin ready in native Chrome with 0 errors.
- **Batch 12 (homepage Explore by learner task): published.** PR 36 merged as `main` `4412fcf`.
- **Batch 13 (library search ranking and belt note): published.** PR 37 merged as `main` `aab06f8`. Codex verified it live: 5/5 files, headers and development 404s; Won-Hyo is first for “Won”.
- **Batch 14 (Community pages of 50): published.** PR 38 merged as `main` `102ebdc`. Codex verified it live: 7/7 public files, headers and development 404s; 9 topics shown; real anonymous API reads (new topics 9, after the cursor 8, replies 0), with no errors and no writes.
- **Batch 15 (Replay move): published.** PR 39 merged as `main` `fda0dc9`. Codex verified it live: 29/29 files, 6 headers and development 404s; in native Chrome the Replay button and pose were healthy, with 0 errors.
- **Batch 16 (read-only live checker, deploy exclusions and current docs): published.** PR 40 merged as `main` `1bff3c5`. In production, `npm run check:live` passed 194/194, including a 404 for `/.gitattributes`.
- **Batch 17 (Community search by every word): published.** PR 41 merged as `main` `1a5d72c`. In production, live checks passed 194/194, and Codex's native query checks passed.
- **Batch 18 (Clear confirmation and other tabs): published.** PR 42 merged as `main` `8cb2551`. The full suite passed 687/687, and 247/247 live checks passed, including all 53 public JSON files.
- **Batch 19 (school planner recovers from a failed save): published.** PR 43 merged as `main` `1e017ac`. Codex verified it in production: main CI succeeded, 194 live checks passed and the source matched.
- **Batch 21 (header Log out): published.** PR 44 merged as `main` `bc4c677`. Codex verified it in production: the source files match exactly, and the live member header shows Log out.
- **Batch 20 (no tool credits on public pages): published.** PR 45 merged as `main` `10a5496`. Codex verified it in production: the 72 changed public paths match (including the old catalog now answering 404), 246/246 live checks pass, the live print wording is clean, and the header Log out is visible.
- **Batch 22 (compare two forms): published.** PR 46 merged as `main` `aed2905`. Codex verified it live: main CI passed, the 10 changed public files match, and the live Forms → Compare link works with Taegeuk Il Jang and Chon-Ji cards and no errors.
- **Batch 23 (search and shareable filters for learning resources): published.** PR 47 merged as `main` `ac23656`. Codex verified it live: main CI passed, the 5 changed public files match, the live query "print read" shows 1 result, the search input is 44 px, the discussion guides are below the resources, and there were 0 errors.
- **Batch 24 (2027 ATU National Championships, dates TBA): published.** PR 48 merged as `main` `5d65fec`. Codex verified it in production: main CI passed, the 2 changed source files match, and the live ATU card shows dates TBA with no calendar export and 0 errors.
- **Batch 25 (first-tournament checklist recovers from failed saves): published.** PR 49 merged as `main` `44f573a`. Codex verified it in production: main CI passed, hosting is healthy, the 3 changed source files match, and security headers and private-path 404s pass.
- **Batch 31 (Log out is reported only when it's proven): published.** PR 50 merged as `main` `d634ce8`. Codex verified it in production: main CI passed, the 5 changed source files match, security headers and private-path 404s pass, and the live signed-in header shows Log out with 0 errors.
- **Batch 26 (Community Refresh recovery and an honest submissions limit): published.** PR 51 merged as `main` `00d1366`. Codex verified it in production: main CI passed, the 6 changed source files match, security headers and private-path 404s pass, and the public resources view has 0 errors.
- **Batches 27 and 30 (unsent reply drafts, and a session recheck after Back/Forward): published.** PR 52 merged as `main` `b4c97e2`. Codex verified it in production: main CI passed, the 3 source files checked match, and security headers and private-path 404s pass.
- **Batches 28 and 29 (Taekwondo words explained, and one compact Forms tool row): published.** PR 53 merged as `main` `17278e9`. Root reported main CI run 44394381798 passing, 779 tests and 256 live checks. Codex's browser review results are in each batch's section. Scope: items 49 and 50.
- **Batch 35 (a free lesson camera with Whole body, Armwork and Footwork): published.** PR 54 merged as `main` `0c90d64`. Root reported production serving all 32 changed files exactly as in source, security headers and private-path 404s passing, and the in-app browser preview passing. Scope: item 58.
- **Batch 36 (camera focus transitions keep the body in frame): published.** PR 55 merged as `main` `97f75f9`. Root reported:
  - production source, security headers, private-path 404s and rapid-focus browser checks passing;
  - main CI run 44467609454 succeeding.
  - Scope: item 59.
- **Batch 37 (grounded feet stand flat):** on `feat/detailed-avatar-2026-11-19`, cut from `97f75f9`. Codex's review passed on 19 November (results in the batch section); awaiting root's release. Scope: item 60.
- **Closeout:** batches 32, 33A and 34 are prepared but not published, and 33B isn't implemented. See "Closeout — prepared, not published" at the end.

Older documents (`audit-tracker.md`, `RELEASE.md`, `site-usability-2026-11-17.md`) record history; their blockers are not assumed current unless re-checked below.

**Status values:**
- **Published:** live on `main` and verified.
- **Batch 37:** implemented locally and reviewed by Codex; awaiting root's release.
- **Open:** not started.
- **Verify:** needs browser or live measurement before it counts as reproduced.
- **Blocked:** needs an owner decision, an account or a cloud change.

## Priorities

| # | Item | Evidence | Priority | Status |
|---|---|---|---|---|
| 1 | Library search misses official and common spellings | Reproduced with `matchesQuery` on `data/forms.json`. These returned nothing: Kukkiwon's own "Shipjin", ATA's sheet title "Songahm #1", "Cheon-Ji", "Koryeo", "Geumgang", "Jung-Geun", "Taeguk 1" and "tul". "poomsae" missed all eight Taegeuk forms. `normalize` did not strip `#`, and there was no alias or style vocabulary. | P2 usability | Published (PR 24) |
| 2 | Typing a full form name returned other forms | "Taegeuk Il Jang" returned Taegeuk 1, 2 and 7, because the short words "il" and "jang" match inside other text. | P2 usability | Published (PR 24) |
| 3 | Header account link went stale after another tab signed in or out, and after a Back/Forward restore | `js/site.js` called `renderAccountNav()` once per load, while the homepage banner subscribes to live state. A cross-tab sign-out could show the guest banner beside "My profile". Codex's review added: re-rendering with an unchanged state must keep the focused link. | P1 usability | Published (PR 24); native cross-tab check passed |
| 4 | No beginner orientation | `main` has no Start here page. Style differences, pose vs count and performer's left/right were explained only inside individual lessons. | P1 content | Published (PR 24) |
| 5 | Header labels wrap on narrow desktops (769–900 px) | Codex browser measurement, signed out at 769 px: no horizontal overflow, and the header fits 69 px high. But "Forms Library" wraps (62 px link height), and Log in / Join free become two-line buttons 52.6 px tall. Normal at 900 px. Fix: for 769–900 px only, hide the decorative Korean logotype, trim nav and account-button padding, and keep labels on one line. Mobile menu and other breakpoints unchanged. "Start here" stays out of the top nav. | P2 layout | Published (PR 24); no wrapping at 769–900 px |
| 6 | Technique and term finder across lesson poses | Library search works at form level only; "low block" correctly returns 5 forms. The 22 data-driven lessons hold 89 structured action types (`data/lessons/*.json` `sequence[].actions[].type`) plus stances and turns, and lessons accept `?pose=N`. A static index could link straight to every pose using a technique, with style filters. Enhancement, not a defect. | P2 feature | Published (PR 25, `/techniques.html`) |
| 7 | Lessons do not link to the shared explanation of poses and directions | Each lesson says "Views are fixed to the starting stance…" but offers no further help. A small "How to read this lesson" link to `/start-here.html#sh-reading` would serve all 23 lessons. | P2 content | Published (PR 29) |
| 8 | The lesson keyboard hint says "Home End first/last" | `taegeuk-1.html` `#player-keys` does not say whether these mean pose or time. Check `lesson-player.js` behaviour, then make the hint specific. | P3 accessibility | Published (PR 29; confirmed: Home and End select the first and last pose) |
| 9 | Library belt filter vs school differences | Belt facets are colour buckets across styles. The hub now says labels are typical, not rules; the library has no such note. Consider one line beside the belt facet. | P3 content | Published (PR 37) |
| 10 | Lesson content items marked unresolved | `unresolved` notes with `reviewStatus: pending` in do-san, joong-gun, koryo, pyongwon, sipjin, songahm-3, taebaek and yul-gok. Motion or sequence changes need primary-reference confidence and must keep the approved avatar look. | P2 content accuracy | Open; needs owner/Meghna for any instructor input |
| 11 | Search ranking for partial words | Partial multi-word searches ("Il Jang") still match broadly and are sorted by curriculum, not relevance. Acceptable now that exact names win. | P3 | Published (PR 37) |
| 12 | Community author controls, notifications, pagination | From the 17 November usability review. Needs SQL and RLS work, a staging apply and owner release approval.  Pagination needs no schema change and is batch 14; author controls and notifications still need SQL, RLS and an owner staging apply. | P2 feature | Pagination published (PR 38); the rest Open (backend) |
| 13 | School directory coverage and picker compactness | 334 sourced records, explicitly incomplete. | P3 | Open |
| 14 | Performance and accessibility pass on live pages | No current measurements in the repo. Needs live Lighthouse or axe runs. | P2 | Verify (Codex browser) |
| 15 | Old "Start here" draft in the original checkout | Unmerged and out of scope. The new hub was written from current `main` and official sources, not imported. The owner can discard or compare it. | P3 | Owner decision |
| 16 | Parent-managed child profiles | Policy says it is a future feature with its own consent design. | — | Blocked (owner, legal/consent) |
| 17 | Moderator assignment for a named helper | The 17 November note says it was waiting for account confirmation. Current state not re-checked. | — | Blocked (account owner) |
| 18 | Engine-worded technique names are shown to learners | The finder and lesson pose lists show the animation's type wording. Examples: "small hinge", "large hinge", "grasp chamber", "wrist turn", "covered ready", "bending ready", "rock pushing", "tongmilgi". Learner-friendly names need a primary terminology source and would also change the lesson display. Do not invent them. | P2 content | Open; needs a source and Meghna's review |
| 19 | Korean pose names exist for Taegeuk Il Jang only | The 22 data-driven lessons carry no Korean terms (0 of 688 actions), and Taegeuk Il Jang's mapping is marked draft in its data file. The finder states this coverage. | P3 content | Open; needs sourced terms |
| 20 | Optional search of spoken instructions | Narration cues line up one-to-one with poses in all 23 lessons (about 47 KB). Searching them would help ("chamber", "knee") but is noisy by default. Candidate: an opt-in "also search spoken instructions". | P3 feature | Published (PR 32) |
| 21 | Stance indexing in the technique finder | The finder indexes only the techniques named in pose labels, not stances. The 22 data-driven lessons record a `stance` per sequence entry (walking, back, horse, front, crane, rear-foot, low, closed, fixed, parallel, cross, wide-parallel, cat), but Taegeuk Il Jang has stance only in description text. Adding stances needs source-backed stance names per style and a Taegeuk Il Jang mapping. Do not derive them from description prose. | P3 feature | Open; needs sourced stance terms |
| 22 | Community started the account service in a known under-13 tab | `forum.js` `connect()` and `community.js` `loadGuides()` called `getAccountService()` without checking this tab's age screen. That started the SDK client, which can restore a stored session (for example someone else's on a shared device) and offer reporting, submissions, posting or moderation. My learning, lesson help (page and widget), profile and sign-in already guarded this. | P1 privacy/policy | Published (PR 26) |
| 23 | Header account link in a known under-13 tab | `site.js` shows "My profile" whenever a session is stored, including in an under-13 tab; the profile page then shows the public guidance. Harmless, but an owner/UX decision. Batch 3 deliberately leaves the header unchanged. | P3 UX | Published (PR 30) |
| 24 | Signed-out eligible visitors start the account service to read Community | Needed today to notice a sign-in. A lazier start (read publicly, start the client on a session-key `storage` event) changes sign-in timing and needs its own review. | P3 | Open |
| 25 | Events: Show more and background renders lose keyboard focus | Reproduced live by Codex after batch 2: with 24 of 164 events shown, Show more rendered 48 cards but focus became `<body>`, and the next Tab reached the first existing card, not the first new one. In code, `render()` rebuilt every card and every select's options on filter changes, the one-minute ticker, tab visibility and Back/Forward. A focused card control or an open select could be replaced by the timer; that case was not reproduced live. | P2 accessibility | Published (PR 27) |
| 26 | Community: opening and closing a discussion, categories and refreshes lose focus | Codex observed live: opening a guide replaced the focused list link and left focus on `<body>`. The next Tab did reach "All topics", so it was usable, but the heading was not announced. In code, "All topics" removed itself; category buttons and the list were rebuilt on every click or refresh; and a preserved reply draft was re-attached after the replies loaded, losing its focus. | P2 accessibility | Published (PR 27) |
| 27 | Printable lesson companions | Narration (748 cues, about 47 KB), pose names, count labels, turns and reference editions exist for all 23 lessons. Agreed direction: separate generated static pages with TKDflow's own narration verbatim. Held until batch 4 is reviewed. | P2 content | Published (PR 29) |
| 28 | Community: the first session arriving removed focus from an opened guide's heading | Found live after PR 27: on a fresh signed-in load, a visitor who opened a bundled guide immediately had its heading focused. About 1 s later the session arrived, `applyConnection` called `clearPrivate()` and emptied the detail panel before `detail()` could keep focus, so focus fell to `<body>`. Reproduced in the real page harness with a deferred account service. | P2 accessibility | Published (PR 28) |
| 67 | Referee practice felt like a long article, not a practice tool | On desktop, the arena, the evidence and the answers sat one under another, so learners scrolled between watching and answering. On a 390 × 844 phone, the answers were several screens below the fighters. Saved progress was raw JSON read straight from localStorage, with no validation. The page never said where progress was kept, and there was no way to reset it. | P2 learning | Batch 44 |
| 66 | Fixed-view wording and hard-to-find learning pages | A public-site audit after Batches 40–42. The 22 data-driven lessons, 23 lesson descriptions, the home page and a Community post still promised "camera views" from the fixed-view era, and lessons mentioned "camera labels" that only screen readers hear. Outside the footer, the history page was linked from one page, the video gallery from two, and the referee guide and practice from three, mostly each other. | P3 consistency | Batch 43 |
| 65 | No guided way to learn from video | Learners were left to search YouTube, where the results mix official, independent and mislabelled uploads, and auto-translated captions often get techniques and history wrong. Nothing said who published a video, which rules a match was fought under, or what to look for. | P2 content | Batch 42 |
| 64 | No way to learn or practise how sparring is officiated | Parents, athletes and new referees met 1/2/3/4/6 points, Gam-jeom, the PSS and "Kal-yeo" at their first tournament with no plain explanation. The scoring and penalty rules changed again on 1 November 2026, and summaries online often double every penalty in the last ten seconds or mix up what the PSS, the judges and the centre referee each decide. | P2 content | Batch 41 |
| 63 | No history of taekwondo on the site | Learners met three traditions (WT/Kukkiwon, ITF, ATA) without the dates behind them. Origin stories online often present one organization's account, or an unbroken ancient lineage, as settled. | P2 content | Batch 40 |
| 62 | Feet slid on the floor: pivots drifted and steps dragged before lifting | Codex's motion audit and a heel-and-ball contact scan of all 22 data-driven lessons at 30 fps on the published motion: 100.1 m of floor slip in total. Turning support feet blended ankle position and yaw separately, so the ball wandered up to 48 cm mid-turn although it was the same point at both ends. Steps lifted on `sin²`, which is flat at the start, so the foot travelled about 6 cm along the floor before it was 1 cm up. Footwork-sequence steps, kick supports that move, and returns to ready slid without lifting. | P2 accuracy | Batch 39 |
| 61 | The lesson character was a simple procedural figure | `js/animation/avatar.js` built the character from spheres, cylinders and two generated garments: blob hands with sliding knuckle spheres (no fingers or thumb, so fists, knife-hands and spear-hands all looked alike), oval feet, and a collar and belt floating on the chest. The motion data already carried open hands, wrist roll, foot pitch and knee frames the figure couldn't show. | P1 learning | Batch 38 |
| 60 | A foot standing on the floor could keep the previous kick's pitch | `js/animation/form-motion.js` cloned the feet from the previous pose into kick, bending-ready and kept-feet stance plans, and reset the supporting foot's yaw and position but not its pitch. A leg that had just kicked then stood on the floor with the toes tipped up 50° or 85°. A read-only scan of `97f75f9` by root found 10 held poses: Taegeuk Sa Jang 10, Taegeuk Pal Jang 5 and 28, Pyongwon 8 and 21, Jitae 31–33, and Songahm 3 5 and 27. Separately, a landing foot finished flattening up to 0.7 s after touching down (Won-Hyo 28, Joong-Gun 4, Taegeuk Pal Jang 17). The new detailed avatar's real feet made it visible; the current character receives the same values. | P2 accuracy | Batch 37 |
| 59 | A quick focus change could crop the head on its first frames | Root caught it live after PR 54: Armwork → Footwork → Whole body pressed quickly showed the head outside the canvas with Whole body selected. The aim and distance were still easing from the low Footwork view, and the safety net only protected Footwork's feet. Settled views fitted; the first transition frames didn't. | P2 learning | Published (PR 55) |
| 58 | The lesson camera offered only five fixed views | All 23 lessons used `js/animation/lesson-view.js` with Front, Back, Left, Right and 3/4 buttons, each fitted only for its own direction. There was no way to turn freely, zoom or move in on the arms or feet. | P2 learning | Published (PR 54) |
| 53 | A Community page restored by Back/Forward kept a signed-out member's private controls | A read-only audit with the real pinned SDK (2.119.0) and the real connection code, offline and synthetic, found the gap: a sign-out made in another tab while this page sat in the back/forward cache wasn't noticed on restore. `pageShown` rechecked only under-13 tabs, and the SDK's visibility recovery returns without any event when the stored session is gone. The composer, Your submissions and the moderation queue stayed. An account switch was noticed. This is synthetic SDK evidence only; it hasn't been shown in a real browser, which may evict the cached page instead. No production leak is claimed. | P2 privacy | Published (PR 52) |
| 52 | Profile Log out could report a sign-out it hadn't proved | `js/pages/profile.js` passed `stillSignedIn: () => hasStoredSession()`, which returns false when storage can't be read, so `logout()` treated unreadable storage as a verified sign-out and the page redirected home. Its auth listener said "You have been signed out" on any null session, even with a stored copy still present. Password recovery used the same weak proof for "signed out". Codex reproduced both profile cases in native Chrome with the synthetic fixture (`/private/tmp/tkdflow-profile-logout-fixture.mjs`). No live account was affected. | P2 accuracy | Published (PR 50) |
| 50 | The Forms library hero stacked three separate tool lines | Below the three primary buttons, `forms.html` had three `<p class="hero-companions">` lines (companions, school order, compare), each a full-width line, pushing the summary and style tabs down. Codex measured the hero before the change at 699/624/420/443 px high at 320/390/768/1280 px, with the style tabs at y=676/601/445/468 and no overflow (`/private/tmp/tkdflow-forms-tools-before.json`). | P3 layout | Batch 29 |
| 49 | Beginners and parents meet Korean taekwondo terms without a plain-English key | Lesson poses use words such as Chagi, Makgi and Junbi; the site had no short explanation of them. | P3 learning | Batch 28 |
| 48 | An unsent Community reply was lost when switching topics | `forum.js` kept a reply draft only across re-renders of the same open topic; opening another topic, All topics or Back replaced the panel and its text. | P3 usability | Published (PR 52) |
| 47 | "Your submissions" quietly stopped at 30 topics and 30 replies | `reviewSubmissions` used `.limit(30)` on each list with no indication that more existed. | P3 honesty | Published (PR 51) |
| 46 | Community Refresh couldn't recover from an unavailable account service | `getAccountService()` kept the first start-up result for the page, including `unavailable`, so **Refresh discussions** (and its "try refreshing" notice) could never succeed without reloading. | P3 reliability | Published (PR 51) |
| 45 | The first-tournament checklist stopped saving after one failed write, and another tab could replace unsaved ticks | `js/lib/tournament-guide.js` `set()` made any write error a permanent `unavailable` state; the notice said ticks would be lost on leaving, although a reload shows the last saved ticks; `first-tournament.js` rebuilt the store on every `storage` event; and each save wrote the whole in-memory object, so a stale tab could erase another tab's other views. | P2 data safety | Published (PR 49) |
| 44 | The 2027 ATU National Championships wasn't listed, and the 2026 note said no 2027 announcement existed | Codex rechecked the official sources on 18 November (evidence: root's `atu-announcement-source.json`). `https://www.joinatu.com/` announces the 2027 National Championships at the Gas South Convention Center, Duluth, Georgia. Its main announcement says May 28–29, 2027, but its countdown says May 27, 2027, and the linked `/event-schedule` still shows 2026 (May 22–23). | P3 content | Published (PR 48) |
| 43 | Community learning resources had no search, and the category couldn't be shared | The resources view (`community.html?view=resources`) kept its category in a page variable, so it wasn't in the address, wasn't shareable and wasn't restored by Back. It also had no search, unlike the discussions pane. | P3 usability | Published (PR 47) |
| 42 | No way to look at two forms side by side | The library shows one card per form; choosing between two meant switching pages. All the facts already exist: `data/forms.json` and each lesson's study poses and reference count, which the companions state. | P3 feature | Published (PR 46) |
| 41 | No visible Log out | The owner reported "I can't find a logout button". A signed-in member's header showed only My profile (`js/site.js`, member mode); the only Log out was `#btn-logout` inside `profile.html`. | P2 usability | Published (PR 44) |
| 40 | Public pages credited the tools used to make the voice and texture | At the owner's request, which reached Codex. Found by Codex and checked by scan: all 23 lesson pages had a `.voice-credit` paragraph ("Voice instructions generated with ElevenLabs using the stock Sarah voice."); all 23 read and print companions repeated it, from `VOICE` in `scripts/build-companions.mjs`; all 23 public narration manifests carried `provider`/`voice`/`model`; the public `data/narration/catalog.json` (read by no page) held the full generation record; and a comment in `js/animation/avatar.js` named the texture tool. | P2 owner request | Published (PR 45) |
| 39 | After one failed save the planner never retries in that visit, and the notice misdescribes reload | Code path: a throwing `setItem` (for example a full origin quota) sets `state = 'unavailable'` (`js/lib/school-planner.js:287`), so every later `save()`/`replace()` returns memory-only. The notice says the list lasts only until reload, but a reload shows the last saved, older list. Low likelihood (a valid list is at most about 105 KB). | P3 | Published (PR 43) |
| 38 | A stale Clear confirmation could delete another tab's newer school list | Reproduced in the final focused audit with the real planner page in the test DOM. Tab A opened "Clear all 2 levels, 0 forms?"; tab B saved a third level; tab A silently adopted it ("Updated with changes made in another tab.") with the confirmation and its old count still open. Yes then saved an empty list ("List cleared."). | P2 data safety | Published (PR 42) |
| 37 | Community search needed exact phrases | `js/pages/forum.js` filtered with one lower-cased substring of title plus body, so word order, hyphens, spacing and accents changed the results, unlike the library search. | P3 usability | Published (PR 41) |
| 36 | Release docs named a live checker that didn't exist, and production served `/.gitattributes` | SETUP.md and docs/RELEASE.md told the owner to run `npm run check:live`, but there was no such script. Codex's read-only live audit found `/.gitattributes` answering 200 (whitespace rules only, no credentials), while other dot-files returned 404. SETUP.md and RELEASE.md §8 still described the earlier accounts-off, report-only state as current. | P2 maintenance | Published (PR 40) |
| 35 | No way to watch one move again | Codex's plan audit: Play after choosing a pose already rewound to that move's start in some cases, but then played on to the end of the form. There was no "play this move once and stop". | P2 learning | Published (PR 39) |
| 34 | The homepage Explore cards hid the newer tools | Three of the six cards led to the forms library (the library, one lesson and the library filtered to lessons). Find a technique, the read and print companions, My school’s forms, the lesson answers and the first-tournament guide were reachable from the homepage only through the footer. Five of the six chips restated the section label. | P3 discoverability | Published (PR 36) |
| 33 | Every lesson page builds the avatar's garments in one long main-thread task | Codex's controlled foreground Chrome probe, same module: Taegeuk Il Jang rig construction 1411 ms (jacket 957, trousers 445); Sipjin 5234 ms (jacket 3649, trousers 1576), page visible throughout. The page can't respond to input during that task. Diagnostic only, not a device benchmark. | P2 performance | Published (PR 35) |
| 32 | No place to keep a school’s own order of forms | Schools use different belt names and orders, and the library’s belt filter is only a colour family. Learners had no private way to write down their own school’s list of levels and forms and print it. | P2 feature | Published (PR 34) |
| 31 | Study view cut off long spoken instructions | Reproduced by Codex in real Chrome at 320×700, Study view, Taebaek pose 10: the 130-character instruction needs 3 lines but was clamped to 2 (`clientHeight` 31 vs `scrollHeight` 47). Short landscape clamped to 1 line. The full text was only in the DOM for screen readers. | P2 readability | Published (PR 33) |
| 30 | Taebaek movement 14: the 180° right turn is shown as one stage | DTaF (physical p.58, printed p.52), root-verified: 14-1 is a closed stance facing Ma (back) and 14-2 faces Da2, so the turn is 90° then 90°. The site turns all 180° into pose 23 and none into pose 24; the final heading is the same. The school source gives a single 180°. A metadata-only split was modelled offline (pose 23 faces 180, pose 24 turns right 90°; narration timing still validates). Labels would need `cue.turn` updates, and pose 24's spoken text and audio don't mention the second turn. Details: `/private/tmp/tkdflow-taebaek14-followup.md`. | P3 content accuracy | Blocked (Meghna: source choice and any audio change) |
| 29 | Saved-learning controls lose keyboard focus while saving | Reproduced by Codex in a real browser with the synthetic fixture (account mode, 3 s server). (1) Library: keyboard Unsave on Taegeuk Il Jang rebuilt the button natively `disabled`, focus became `<body>` and stayed there after confirmation. (2) My learning, Saved: Unsave on the middle card (Chon-Ji) removed the card and focus became `<body>`. (3) Lesson widget: Mark as practised, same as (1). All real backend traffic was 0. | P2 accessibility | Published (PR 31) |

## Batch 1 — learner foundations (published, PR 24)

- **`start-here.html`** (new, with `css/start.css`). A static, account-free and script-free beginner hub. It covers:
  - three paths: new student, parent or guardian, returning learner;
  - WT/Kukkiwon, ITF and ATA differences, with sourced organization facts;
  - finding a form, including spelling variants;
  - pose numbers vs official counts;
  - the performer's left and right, relative to the fixed starting-stance cameras;
  - lesson tools: playback, speed, cameras, voice and effects, Study view with Escape, pose links;
  - saved learning and private help;
  - the first-tournament guide;
  - Community age rules;
  - a glossary and dated sources.

  It is linked from the homepage hero, library hero, footer (Learn), Community learning resources, the 404 page and the sitemap. It is not in the top nav (see item 5).
- **Search** (`js/lib/catalog.js`, `data/forms.json`):
  - `normalize` drops all punctuation and keeps Hangul;
  - optional, validated `aliases` hold Kukkiwon spellings, Revised Romanization and common Taegeuk spellings;
  - each style's own word for forms (poomsae, tul or patterns, Songahm) is searchable;
  - an exact name, id, Korean name or alias match returns just that form, and facet counts use the same rule.
- **Narrow-desktop header** (`styles.css`): see item 5.
- **Header** (`js/site.js`):
  - `watchAccountNav` redraws on `storage` events for the session key (or a whole-storage change) and on `pageshow` from the Back/Forward cache;
  - `renderAccountNav` skips redrawing when the visible state (accounts on or off, member, signup, current page) is unchanged, so a token refresh keeps the existing focused link.

  It still uses no account client.
- **Tests:**
  - `tests/start-here.test.mjs` ties the hub to the catalogue, the real player controls, the library search, `AGE_POLICY`, the no-JS requirement, official sources and discoverability;
  - `tests/catalog.test.mjs` gains spelling, style-word, alias-validation and exact-name tests;
  - `tests/site-nav.test.mjs` runs the real `site.js` against a fake page through sign-in, a token refresh with focus kept, sign-out, unrelated keys, a cleared store and Back/Forward restore.
  - Mutation checks confirmed the tests fail without each fix: dedupe, the storage watch, the pageshow handler, the old normalize, exact match and style terms.

## Sources used by the hub (checked 18 November 2026)

| Source | Used for |
|---|---|
| [Kukkiwon introduction](https://www.kukkiwon.or.kr/eng/contents/view?contentsNo=78&menuLevel=2&menuNo=80) | Kukkiwon describes itself as the World Taekwondo Headquarters |
| [Kukkiwon poomsae pages](https://www.kukkiwon.or.kr/eng/board/list?boardManagementNo=55&page=1&menuLevel=3&menuNo=72) (p. 1–2) | Taegeuk 1–8 and Koryo to Ilyeo listed; the Pyongwon entry places Koryo, Keumgang and Taebaek after the Taegeuk series. Kukkiwon spells it "Shipjin" |
| [World Taekwondo Poomsae Competition Rules & Interpretation](https://www.worldtaekwondo.org/att_file/documents/Poomsae%20Competition%20Rules%20and%20Interpretation%20(In%20force%20as%20of%20September%2030%202024).pdf) | Only that WT publishes poomsae competition rules (title/edition); the body was not extracted, so no rule is paraphrased |
| [ITF Deutschland Chon-Ji tul booklet (2013)](https://itf-d.de/files/itf-d/downloads/taekwondo/english/Tul/01%20Chon-Ji%20Tul%20booklet.pdf) | Already the Chon-Ji lesson source; "tul" naming |
| [ATA Martial Arts](https://atamartialarts.com/) | American Taekwondo Association, Songahm taekwondo |
| [ATA Songahm #1 sheet (updated 8 Jan 2024)](https://media.atamartialarts.com/media/11789/9th-grade-white-belt-form-songahm-1final.pdf) | 18 numbered moves between the ready position and Bah Ro; compass directions on a diagram |

For ITF, the hub says only that ITF-style schools use tul (patterns) and should follow the named reference their school uses; it does not rank or describe ITF organizations. Practical advice is labelled TKDflow editorial guidance. No instructor review, endorsement or statistic is claimed.

## Known limits of batch 1

- Browser checks were done by Codex: 9 widths, the 769–900 px header, and native cross-tab behaviour with a synthetic-session fixture. All passed before publication.
- The direction explanation relies on the verified starting geometry: left joints at +x and the Front camera at +z. It deliberately says the fixed camera does not follow later turns.
- Spelling aliases are limited to Kukkiwon spellings, Revised Romanization of the Korean names and the common "Taeguk". Forms not in the catalogue (Chonkwon, Hansu, Ilyeo, Palgwe) still return the normal empty state.

## Batch 2 — Find a technique (`/techniques.html`)

### Page and index

A public, account-free index of every pose whose label names a block, strike, kick or other technique, in all 23 lessons. Stances and turns are not indexed (item 21). Each link opens the lesson paused on that pose (`/<lesson>.html?pose=N#player`, 1-based, as the lesson's own pose links use).

**Source and generation:** `scripts/build-technique-index.mjs` builds the index into `techniques.html`; it runs as part of `npm run sync`, and `npm run check` fails if it is stale. It reads the poses the lessons really play:
- Taegeuk Il Jang: its hand-written `POSES`, with English and Korean names, the counts and kick/punch sub-poses.
- The other 22 lessons: `createFormMotion(data/lessons/<id>.json).POSES`, with each pose's technique types from the matching `referencePlans` entry.

**What is included:**
- Only each lesson's opening ready and closing return are left out; mid-form ready techniques (bending ready, covered ready) stay.
- 702 study poses (748 minus 46 endpoints) in 89 lexical groups.
- Group names are the lesson's own wording with a leading Left/Right removed.
- A combined pose (for example Taegeuk Il Jang pose 6, "Low Block + Middle Punch", Movements 5–6) appears in each of its groups but is counted once.

**Page:**
- **Without JavaScript:** collapsed native `<details>` groups of plain links. Each pose list names its form for screen readers.
- **With JavaScript:** search, style and form controls, a live summary, a per-form limit of 10 poses with "Show all", up to 40 groups opened for a search, and an empty state linking to the forms library search.
- **Order on screen:** the hero, a one-line stats line and a short always-visible note (pose numbers are not movement counts; links open paused), then the search controls, then a collapsed native "About this index" panel with the longer scope, naming and Korean notes, then the results. On a phone, search is reachable right after the hero.
- **Disclosure cue:** results groups and the About panel use a decorative chevron drawn in CSS, with no text and no motion. It points right when closed and down when open. Native `<details>` keeps the semantics, and Enter and Space toggle natively.
- **Size:** about 153 KB raw, 13 KB compressed, with no extra download.

### Search (`js/lib/technique-finder.js`)

- Uses the library's `normalize`, so case, punctuation and spacing are ignored and Hangul is kept. Words are AND-matched over the group wording, the pose name, the Korean pose text and the form's own names.
- An exact group name is listed first, but related groups stay visible. For example, "low block" also shows "knifehand low block" as its own group, without claiming they are the same technique.
- A query that is exactly a form's name, id, Korean name or listed spelling ("Koryeo", "Songahm #1", "고려") selects that form.
- Form descriptions are never matched against poses.

### URL state and navigation

- `?q=&style=&form=` is validated: unknown values are ignored, a form outside the chosen style is dropped, and `q` is capped at 80 characters. It never carries pose numbers, so shared finder links survive lesson changes.
- Typing is debounced into a single `replaceState`; choices and Clear push a history entry.
- The controller holds the newest typed text as a pending query.
  - A style or form choice made inside the debounce carries that text with it, so the typed words are never dropped.
  - An explicit query (Clear, or submitting the box) wins over pending text.
  - Back/Forward discards pending text, so neither a late timer nor a later choice can bring it back.
- The box is rewritten only when the restored query really differs, ignoring surrounding spaces (`shouldReplaceInput`), so a space before the next word is never trimmed while typing.

### Links and other changes

- **Discoverability:**
  - Start here: "Find your form" and "Lesson tools";
  - the library hero, plus an empty library search, which offers the same words as a technique search;
  - Community learning resources;
  - the footer (Learn) and the sitemap;
  - a line under "All poses" in all 23 lessons.
- **Glossary:** "Form" is now defined as a set sequence of techniques performed as a pattern.
- **`showEmpty`** now accepts more than one action; existing single-action callers are unchanged.
- **Unchanged:** no animation, motion, narration, avatar, auth, backend, service, package or media change.

### Tests

`tests/technique-finder.test.mjs` has 23 tests:
- generator drift;
- every link checked against the real pose name, `officialLabel` and Korean text;
- full coverage with endpoints excluded;
- lexical grouping and once-only counting of combined poses;
- related groups kept, with the exact group first;
- Korean limited to Taegeuk Il Jang;
- whole-form names and spellings, with no matches from form descriptions;
- style and form filters;
- URL validation and round-trip;
- per-form limits, "Show all" and the open-group limit;
- readability without JavaScript and accessible structure;
- no account, network or storage use;
- intro honesty;
- discoverability;
- debounce, Back/Forward cancellation and link normalisation using a fake window and timers;
- a style or form choice right after typing, Clear and submit while text is pending, and Back while text is pending;
- the input-rewrite rule;
- copy that offers only named techniques (no stances);
- the decorative disclosure cue with native keyboard toggling;
- the phone-first order: note, then search, then the collapsed About panel, with a clean heading hierarchy.

Mutation checks confirmed failures without each of these: carrying pending text into choices, explicit `q` winning, Back discarding pending text, the input-rewrite rule, the popstate cancel, the exact-first order, the row cap, exact form matching, description isolation, once-only counting, the debounce, endpoint exclusion, and listing a combined pose in its second group.

### Known limits of batch 2

- I used no browser. Layout at 320 px and above, focus after "Show all", and real Back/Forward need Codex QA.
- The page script itself is exercised through the shared controller and the pure view function; its DOM wiring (reordering groups, show/hide, the "Show all" button) is not unit-tested.
- Technique wording and Korean coverage are inherited from lesson data (items 18 and 19).

## Batch 3 — public Community reading for known under-13 tabs

### Finding
See item 22. Anonymous readers already have exactly the needed access in `supabase/community.sql`:
- column grants on `discussion_topics(id,category,title,body,author_handle,editorial,status,created_at)`;
- column grants on `discussion_replies(id,topic_id,body,author_handle,status,created_at)`;
- RLS that shows anonymous readers only published topics, and only published replies of published topics.

A live public-only GET (`apikey` and `accept` headers only, no session or cookies) returned 200 for topics and guides. **No SQL, RLS, role, key or package change.**

### Change
- **`js/lib/public-read.js`** (new): the bounded, stateless transport extracted from `public-faq.js`. It sends only `apikey`, `accept` and (with a body) `content-type`, with `credentials:'omit'`, `cache:'no-store'` and `referrerPolicy:'no-referrer'`.
  - `public-faq.js` keeps its signature and behaviour; its existing tests pass unchanged.
- **`js/lib/public-discussions.js`** (new): published topics, editorial guides, one topic and replies.
  - URLs are built with `URLSearchParams` and name exactly the granted columns.
  - Each row is reduced to that allowlist and checked against the table's constraints: published, UUIDs, category list, title and body lengths, handle, boolean `editorial`, date.
  - Topic ids are validated before any request and lowercased (uppercase deep links work; malformed ids send nothing).
  - Absent topics (pending, hidden or deleted) return `data:null`; failures return errors.
- **`js/lib/community-connection.js`** (new): decides public or account mode before any network call.
  - **A known under-13 tab** (`INELIGIBLE` in this tab's age screen) never calls the account service. There is no session, no posting access, no sign-in listener and no member control.
  - **Account mode** keeps the existing order: service, session, access when signed in, feed, then a selected topic.
  - **Age screen rechecked:** after every account wait, a superseded request stops, and a tab whose age screen now says under 13 switches to public reading.
  - **Back/Forward cache:** a persisted `pageshow` after the age screen recorded under 13:
    - invalidates late account work (the `SessionGuard` generation);
    - unsubscribes the sign-in listener, whose callback is also ignored if the SDK still calls it;
    - stops the **existing** client's automatic token refresh once (`stopAutoRefresh`, best effort and contained);
    - clears private controls and data, and re-reads publicly.

    It never creates a client to stop it, never signs out and never touches stored credentials or other tabs. A client that arrives after the tab turned public is quieted without reading its session.
  - **Loading:** owned by the connection. Every start (refresh, sign-in callback, back/forward restore) sets it, and only the newest request clears it, so the refresh button always ends enabled.
- **`forum.js`** renders the connection state.
  - Member controls (report, composer, submissions, moderation, sign-in prompt) come from `communityControls()`, which returns none in public mode.
  - Public mode shows "Reading is open to everyone." and a neutral service line.
  - Topic links are lowercased on load and on Back/Forward.
- **`community.js`** reads discussion guides publicly for every visitor. The resources view never starts the account service.
- **Unchanged:** the global header (item 23), and adult, teen and moderator flows.

### Tests
`tests/community-public.test.mjs` has 24 tests:
- requests match the SQL grants and categories;
- headers, credentials and cache options;
- allowlist reduction and row checks;
- UUID validation and lowercasing (including uppercase deep links);
- absent, failing, malformed and timed-out responses;
- the public-answers transport;
- an under-13 tab: no account, auth or listener calls;
- the adult, teen, guest and moderator account path;
- back/forward restore and a pending account connection abandoned;
- the age screen changing during each account wait;
- refresh races, failures keeping the guides, selected and absent topics, hidden guides not reinserted;
- the loading lifecycle across refresh, sign-in callbacks (pending and idle) and restore, plus the page's single button writer;
- auto-refresh stopped once for a prior client and for a late client, never for ordinary refreshes, with failures contained;
- a teen moderator (moderator, not adult): queue and reports available, no public composer, and nothing in an under-13 tab;
- page wiring;
- every module that starts the account service checks the age screen first.

Mutation checks confirmed a failure without each guard. Two survivors are equivalent:
- reply topic comparison: `publicReplies` already lowercases;
- the stop-once set: a tab cannot return to account mode after an under-13 result.

### QA fixture (outside the repo)
`/private/tmp/tkdflow-community-public-fixture.mjs` serves the real pages and replaces `account-service.js` and `public-read.js` with clearly labelled fakes, so no request reaches Supabase.
- **Shows:** account-service starts, auto-refresh stops, sign-outs and public requests.
- **Scenarios:**
  - under 13 with a planted fake adult/moderator session;
  - under 13 without a session;
  - eligible adult, teen, adult moderator, teen moderator (16) and signed-out visitors; moderators see one synthetic pending topic and one open report;
  - slow, failing and malformed feeds, and a slow account service;
  - live sign-in and sign-out;
  - uppercase, hidden and malformed deep links;
  - the resources view;
  - a real Back test ("record under 13 on another page, then press Back"); a browser may reload instead of restoring from the cache, which still tests the first-load guard;
  - "Simulate cached return: under 13 (no reload)", which records under 13 and dispatches `pageshow` with `persisted:true` on the existing page, so the clearing of private controls and the stop/unsubscribe of the old client can be observed. It is labelled as a simulation.

Run it with `node /private/tmp/tkdflow-community-public-fixture.mjs --port 8931`.

### Known limits
- I used no browser. Real back/forward-cache behaviour, the layout and focus need Codex QA with the fixture.
- The age screen is per tab (sessionStorage). A new tab is unscreened, as documented in `account-age-policy.md`.
- **Withdrawing an editorial guide** needs two steps. A successful live feed already excludes hidden or rejected rows, but if the live read fails the page falls back to the guides bundled in `data/forum.json`, which stay publicly readable. So withdrawing a guide also means removing it from that file.

## Batch 4 — keyboard and focus continuity (Events, Community)

### Shared helper: `js/lib/focus-keep.js`
- Re-creatable controls carry a stable `data-fk` key.
- **`keepFocus(container, update)`** is synchronous. If focus was inside `container` and the update removed the focused element, it puts focus back on:
  - the same element, if it was re-attached (for example the preserved reply form), else
  - the element with the same key (with its text caret), else
  - the caller's bounded fallback.

  Focus that was elsewhere, or that survived, is never moved, so background updates never steal focus.
- **`focusTarget()`** is used only for explicit actions. It focuses with `preventScroll`, gives headings `tabindex="-1"`, and scrolls only when asked, honouring reduced motion.

### Events (`js/pages/events.js`)
- **Cards** are cached per event and reused while their status and registration state are unchanged. A reconcile step removes, adds and reorders only what changed, and never moves a card that is already in place (moving a focused node drops focus).
- **Select options** are updated in place (label and `disabled`) and only rebuilt when the set of values changes, which happens on first load only.
- **Show more** is one persistent button. After it, focus moves to the first newly shown card's title, without scrolling; the summary already announces the new count.
- **Both result branches** (cards and the empty state) run inside `keepFocus`. When a focused card leaves the list, for example at a status boundary under a filter or down to no results, focus goes to the card now at its position, else to the results summary.
- **Unchanged:** filters, URL, history and the advanced-filter state.

### Community (`js/pages/forum.js`, `community.html`)
- **Keys:** category buttons, topic links and Read buttons, the detail heading, Back, Copy, Report, reply Report buttons and the reply text box.
- **Opening a discussion** (link or Read button) focuses its heading (`#topic-detail-title`, `tabindex="-1"`, which labels the panel). It scrolls the panel into view below the sticky header (`scroll-margin-top`), smoothly or instantly under reduced motion.
- **"← All topics"** returns focus to the link or button that opened the discussion, else to the results summary.
- **No focus moves on:** deep links (`?topic=`, including uppercase), Back/Forward and background refreshes.
- **The detail panel** is built synchronously, including a preserved reply draft (text, focus and caret restored before any await). Only the replies area changes after replies load, so a later response never moves focus. A focused control that is rebuilt later (a reply's Report button) falls back synchronously to the heading.
- **Category clicks and refreshes** keep focus on the same category button or topic; a focused topic that disappears falls back to the results summary.
- **Help route:** a line under the Community guidelines points to public lesson answers and to private lesson questions for members aged 13 and over with a confirmed account and completed profile. It says private questions are not published. No posting rights change.
- **CSS** (`css/preview.css`): `scroll-margin-top` for event cards, discussion cards, the summaries and the topic heading, plus visible focus outlines for the heading and summaries.

### Tests (no browser; real page modules)
- **`tests/helpers/mini-dom.mjs`:** a test-only DOM in which removing or moving a focused element drops focus to `<body>`, as browsers do.
- **`tests/events-focus.test.mjs`** (7 tests) runs the real `events.js` with local data, a controllable clock and the page's own ticker callback. It covers:
  - Show more focus, without scrolling;
  - the ticker keeping the focused control and the card and option nodes;
  - in-place option updates;
  - a status change re-keying focus into the rebuilt card;
  - a card leaving the results, and the last result leaving (focus to the summary, but never taken from the search box);
  - Back/Forward.
- **`tests/community-focus.test.mjs`** (11 tests) runs the real `forum.js`. Public mode uses a fake fetch; account mode substitutes `account-service.js` through a module loader hook in that test process only. It covers:
  - heading focus with reduced motion;
  - return to the opener;
  - category focus;
  - refresh keeping focus, or never taking it;
  - the summary fallback;
  - deep links;
  - the focused heading surviving a rebuild;
  - the Report-button fallback with no delayed steal;
  - draft text, focus and caret restored before replies load;
  - an unkeyed draft checkbox;
  - the help-route copy.
- **`tests/focus-keep.test.mjs`** (4 tests) covers caret restore when focusing moves the caret, the no-steal rules, a one-time synchronous fallback, and scrolling only on request with reduced motion.
- **Assertions** on DOM nodes are identity checks, so a failure never formats a whole document tree.
- **Mutation checks** (25 s cap per run; a timeout counts as detected) confirmed a failure without each of these:
  - restore;
  - same-element restore;
  - caret restore;
  - heading focus, origin return and heading key;
  - the panel, summary and list fallbacks;
  - category focus;
  - Show more focus;
  - card and option reuse;
  - reduced motion.

  One survivor is equivalent: the "only when lost" guard, because updates are synchronous.
- **Updated:** two batch 3 structural assertions, for the new detail code.

### QA fixture (outside the repo)
`/private/tmp/tkdflow-navigation-fixture.mjs` serves the real pages with a labelled toolbar on Events and Community:
- a live focus readout;
- "Schedule background refresh in 2 s" (place focus first, then it runs the page's own background update);
- on Community: an eligible adult (reply form), public reading, and slow replies (3 s), with fake account and public modules, so there is no Supabase traffic.

Run it with `node /private/tmp/tkdflow-navigation-fixture.mjs --port 8941`.

### Known limits
- I used no browser. Real screen-reader announcements, smooth scrolling under the sticky header, and an open native select during the ticker need Codex QA.
- The test DOM models focus loss on removal and moving, but not every browser quirk; helper tests cover caret jumps separately.

## Follow-up — focus kept when the first session arrives (item 28)

### Fix (`js/pages/forum.js`, `applyConnection`)
- Before `clearPrivate()` empties private state on an account boundary, capture focus only if it is on a **public reading control** of the open discussion: its heading, "← All topics", "Copy discussion link" or the related-resource link.
- After the synchronous clear and render, restore that focus with the existing lost-focus guard, and only if the same discussion is still open.
- Private controls (reply drafts, reports, submissions, moderator items) are never carried over. A visitor who moved focus elsewhere, such as search, is never pulled back.
- No auth-policy, content or data change.

### Tests (`tests/community-focus.test.mjs`, real `forum.js`)
- Opening a bundled guide while the account service is deferred: after the session arrives, focus is on the rebuilt heading. This reproduced the bug (focus was `<body>`) before the fix.
- Moving to search during the wait: the session's arrival leaves focus in search.
- "← All topics" focused during the wait stays focused after the rebuild.
- A change to a different account: the previous account's reply draft is removed (a new empty form, the old node gone), and focus is not placed into the new form.

Mutation checks: removing the restore fails 3 tests, and carrying private keys fails 2. The "restore steals focus" mutant is equivalent, because focus elsewhere is never captured and the clear and restore are synchronous.

### Fixture
`/private/tmp/tkdflow-navigation-fixture.mjs` gains "Toggle slow account start (3 s)": choose an eligible adult, toggle it on, open a guide before the session arrives, and watch the focus readout.

### CI follow-up (PR 28): harness timing, not a product race
- **Symptom:** PR 28's push CI passed, but its pull-request CI failed 2 of 553 tests in `tests/community-focus.test.mjs`:
  - "a change to a different account removes the previous reply draft…": the reply form was `null`;
  - "other public reading controls (All topics)…": the guide link was missing.

  Both passed locally.
- **Root cause:** `settle()` in `tests/helpers/mini-dom.mjs` waited only for `setImmediate` rounds. The page reconnects after a sign-in change with `setTimeout(connect, 0)`, so on a runner with slower or coarser timers the reconnect had not run when the first test checked. Its late timer then fired during the next test and redrew that test's document, which removed the guide link. The product behaviour is correct: private state clears first, then the page reconnects.
- **Reproduced deterministically:** running the file with zero-delay timers held for at least 5 ms reproduced exactly the same two failures.
- **Fix (tests only):**
  - each `settle()` round now waits for a timer turn as well as an immediate, so earlier zero-delay page timers always run first;
  - teardown in both page harnesses awaits `settle()` before restoring globals, so no late timer can reach the next test.

  The account-isolation assertions are unchanged.
- **Coverage:** `tests/harness-timing.test.mjs`:
  - `settle()` drains an earlier zero-delay timer with timers slowed to 15 ms;
  - the Events and Community page harnesses run in a child process with timers slowed to 5 ms, and must report 0 failures and exit with status 0.

  Both tests fail with the old immediate-only `settle()`.
- **Validation:** two full `npm run check` runs passed 555/555. The page harnesses also pass with timers slowed to 5 ms and 15 ms, and `git diff --check` is clean.

## Batch 5 — read and print companions (items 27, 7, 8)

### Pages
- `/companions.html` (index) and `/companions/<lesson>.html` (23 pages). They are static, need no JavaScript and use the shared layout. They're listed in `layout/pages.json` (key `forms`) and the sitemap.
- **Each page:**
  - the form name and its Korean name;
  - "<style> · N study poses · M movements | reference counts in the reference", worded exactly as the lesson page words its count;
  - links to the full lesson, Lesson answers and All companions;
  - one short note that pose numbers aren't counts and that left and right are the performer's own;
  - an ordered list of every study pose (endpoints included): a link to the lesson paused on that pose (`?pose=N#player`, 1-based), the lesson's pose name (plus Korean for Taegeuk Il Jang only), the lesson's count label (endpoints: "Ready position" / "Return"), the narration turn in the lesson counter's wording, Kihap, and the spoken instruction verbatim;
  - Sources: the lesson's reference edition and links exactly as stored (PDF page ranges where recorded; Taegeuk Il Jang uses its page's reference link), plus the lesson's existing voice credit.
- No source document's content is copied. Per the reference audit, the stored titles and editions are kept and the Southbury "private use" PDFs are linked only.

### Generator and checks
- `scripts/build-companions.mjs` reads the real sources: Taegeuk Il Jang's `POSES` or `createFormMotion()`, `officialLabel()`, the narration cues, the lesson data and the lesson pages.
- It writes only the `<!-- companion -->` / `<!-- companion-index -->` regions and creates missing pages with layout markers.
- `npm run sync` now runs companions, then layout, then technique index. `npm run check` adds `build-companions.mjs --check`.

### Print and responsiveness
- `css/companion.css`: no fixed widths and `overflow-wrap:anywhere`.
- In print: header, footer, skip link, actions and the Print button are hidden; each pose has `break-inside: avoid`; headings don't break after; the lesson address prints once; text is black at 11pt with 14 mm margins.
- `js/pages/companion.js` unhides the optional Print button and calls `print()` only on click. Without JavaScript, the browser's own Print works the same.

### Links (items 7 and 8 included)
- **Every lesson:** "Read or print this lesson as text" (its companion) and "How to read poses, counts and directions" (`/start-here.html#sh-reading`).
- **Keyboard hint:** now "Home End first/last pose". `playerKeyAction` maps Home and End to `first()` and `last()`, which select pose 1 and the last pose. The hub's Lesson tools wording was updated to match.
- **Elsewhere:** the library hero, a hub "Read and print" entry, Community learning resources, the footer (Learn) and the sitemap.

### Tests (`tests/companions.test.mjs`, 9)
- **Generator drift**, and one page per lesson with no strays.
- **All 748 rows** against independently computed lesson data: the link, and that `parsePoseParam` accepts it; the name; the count label; kihap; the turn; the spoken text verbatim.
- **Korean** only where the lesson has it.
- **The heading count** worded as each lesson page.
- **Sources and editions** equal the lesson data or page.
- **Index order and counts**, plus manifest and sitemap.
- **No-JS and safety:** no inline code or styles; the Print button is hidden and prints only on click (fake window); compact size.
- **Print CSS rules.**
- **No review or verification claims.**
- **Lesson, hub, library, footer and community links**, and the keyboard hint against the real key mapping.

Mutation checks (pages regenerated with each defect; 25 s cap) are all caught: an off-by-one pose link, a wrong count label, a dropped Return pose, missing Taegeuk Il Jang Korean, swapped turn arrows, non-verbatim instructions, auto-print on load, and navigation visible in print.

### Limits
- I used no browser. Print layout, page breaks and the Korean font in print need Codex QA.
- No lesson data, sources, narration, motion, avatar or audio changed.
- The Sipjin, Taebaek and other source questions stay in `/private/tmp/tkdflow-source-accuracy-plan.md` for later visual review.

### Review fixes (batch 5)
- **Header account links** (`js/site.js`) are now root-absolute (`/auth.html`, `/auth.html?mode=register`, `/profile.html`) in every mode. On nested pages such as `/companions/…` they had resolved to `/companions/auth.html`.
  - A site-nav test resolves every mode against `/companions/taegeuk-1.html`.
  - Skipping the redraw when nothing changed, the cross-tab and back/forward refresh, and the no-account-library behaviour are unchanged.
- **Companion pose and index lists** carry `role="list"`, because `list-style: none` can drop list semantics in some browser and screen-reader combinations. Numbering stays in the visible "Pose N" text.
- **Print:** Kihap prints black.
- **Mutants:** relative links (fail 5–6), no list role (fail 1) and red Kihap in print (fail 1) are all caught.

## Batch 6 — age-aware header (item 23)

### Change
- **`js/lib/age-gate.js`:**
  - `sharedEligibilityStore()` gives one store per page, wrapping the unchanged `createEligibilityStore()`;
  - `onEligibilityChange(fn)` notifies only when the result in effect changes.
  - Every reader on a page then sees a result that could only be kept in memory (session storage blocked). There is no reset or test hook.
- **Age writers** record into the shared store. A review of every `.record(` call in `js/` found two pages; no code writes the age key directly.
  - `js/pages/auth.js`: the age screen and an under-13 age typed into a profile form;
  - `js/pages/profile.js` `showHeld()`: an account held for a recorded under-13 profile age. This one was missed in the first pass.

  Their behaviour, including the existing sign-out and hold, is unchanged. Pure readers (Community, lesson help, My learning) still create their own store; they only read at load and never record.
- **`js/site.js`:**
  - **New first rule:** when this tab's age screen says under 13, the header shows one neutral link, "About accounts" → `/start-here.html#sh-community`. It is root-absolute and takes precedence over a stored session, accounts off and signup off. The stored session is not read in that case.
  - **Unchanged:**
    - the unchanged-state check;
    - root-absolute links for eligible and unscreened tabs;
    - cross-tab `storage` and back/forward `pageshow` refresh.
  - **Same-page answers:** an answer recorded on the same page updates the header immediately through the change signal.
  - **Focus** moves to the new link only if it was on a header account link that was replaced.
- **No account library, sign-out, credential or storage writes, age-policy or backend change.**

### Tests
- `tests/age-nav.test.mjs` (7) runs each scenario in its own fresh Node process (`tests/helpers/age-nav-scenario.mjs`), so the shared store's state can't leak between cases. Covered:
  - an under-13 tab with a stored session (About only; the session is read 0 times);
  - accounts or signup off;
  - a same-page answer, where focus moves only from a replaced link and stays elsewhere otherwise;
  - the result is sticky;
  - unrelated session changes and back/forward restores keep the same node and focus;
  - blocked session storage, both a throwing getter and a throwing `setItem`: the header follows the shared store, and a separate store reads `null`;
  - eligible and unscreened links;
  - structural checks: `auth.js` uses the shared store, the header is read-only, and the age check comes before any session read;
  - **every age writer** shares the header's store: a source scan finds every `.record(` caller in `js/` (currently `auth.js` and `profile.js`), and each must use `sharedEligibilityStore()` and create no private store;
  - fresh processes (normal and blocked storage) record through `age-gate.js` exactly as a `js/pages/` writer resolves it, and confirm the same module and an immediate header switch.
- `tests/site-nav.test.mjs`: the fake element gains `contains` and `querySelector` for the focus rule; its 9 tests still pass.
- **Mutants caught:** ignoring age, reading the session first, no same-page listener, no dedupe, a relative About link, always moving focus, a private store in `auth.js`, a private store in the header, and a private store in `profile.js` (the review finding).

### QA fixture (outside the repo)
`/private/tmp/tkdflow-age-nav-fixture.mjs` serves the real pages on any path, including `/companions/…`. It uses a fake account module with no client or network. Its toolbar can:
- plant or remove a fake stored session;
- block session storage before `site.js` runs;
- record under 13 through the shared store (the same module the age screen uses);
- record through a separate store as a control;
- clear the tab's result.

It also shows a live readout of the header, the store, storage and focus.

Run it with `node /private/tmp/tkdflow-age-nav-fixture.mjs --port 8951`.

### Limits
- I used no browser. With the fake account module, the real `auth.html` age form and the profile hold can't reach the account service, so the same-page path is exercised through the shared store both of them use.
- With storage blocked, a new page load can't remember the answer. That's the age policy's existing per-tab, client-side limit.

## Batch 7 — keyboard focus through saved-learning changes (item 29)

### Fix
- **`js/lib/learning-ui.js`:** while a change is pending, Save, Mark as practised and Clear progress are **busy, not removed from focus**. They get `aria-disabled="true"` (already styled like disabled) instead of the native `disabled`, because a disabled button can't keep keyboard focus. Native `disabled` remains only where saving is impossible (`loading`, `unavailable`).
- **Live guards:** every click re-checks the service's mode and pending count first (`readyToSave`), before any confirm dialog and again before `update()`. So there is still no write while a change is pending, and a stale button can't bypass it. The saved and practised toggles read the live record.
- **Lesson widget:** restores focus with the shared `keepFocus` helper (keys `save:<id>`, `practised`).
- **`js/pages/learning.js`:**
  - tabs and cards are rebuilt inside `keepFocus`;
  - when the focused card leaves the current view (Unsave on Saved, un-practise on Practised, Clear progress on In progress), focus goes to the card now in its place, then the empty-state "Explore forms" link, then the summary;
  - focus on a tab or elsewhere is never moved;
  - Refresh and Import are busy (`aria-disabled`) rather than natively disabled while saving, with live guards; Refresh stays natively disabled only while loading.
- **Card names:** each card's primary link now has the accessible name "Resume lesson: <form>" or "Open lesson: <form>"; the visible text is unchanged and starts the name. A screen-reader user who lands there after a fallback hears which form it is.
- **Library (`forms.js`):** unchanged. Its existing keyed refocus works once the button can take focus.
- **`styles.css`:** "Clear progress" is a link-style button, not `.btn`, so it gets its own busy style (`.reset-learning[aria-disabled="true"]`: dimmed, not-allowed cursor, no underline).
- **Transient controls** (found in Codex native QA after the first fix): a keyboard-activated Retry hid itself as its retry started (`hidden = !error`), so focus fell to `<body>` during and after the retry.
  - New `setHidden` and `setDisabled` in `js/lib/focus-keep.js`: if the control (or something inside it) **had focus** when it is hidden or natively disabled, focus moves synchronously to the nearby status message. Otherwise nothing moves.
  - **Used for:** the Library Retry (to `#forms-learning-status`); My learning's Retry, Refresh (natively disabled while the list reloads) and Import panel (all to `#learning-status`); the lesson widget's Retry (to the widget status).
  - Retry semantics are unchanged: a failed, still-pending change stays retryable, and Retry isn't gated by `readyToSave`.
  - **Import assessed:** `importBrowser()` doesn't clear browser saves, so the panel normally stays and its button stays focusable while busy. The handoff covers the panel disappearing while focused.
- **`LearningState`:** unchanged (pending map, generation and owner checks, drain, error and retry, account switching). No backend or data-store change.

### Test model and tests
- **`tests/helpers/mini-dom.mjs`:** `focus()` now refuses natively disabled `button`, `input`, `select` and `textarea`, as browsers do; `aria-disabled` controls still take focus. It also gains `before()`. A focused element that becomes hidden, or a focused form control that becomes disabled, drops focus to `<body>` (browser focus fix-up). All existing suites pass under the stricter model.
- **`tests/learning-focus.test.mjs` (19)** runs the real Library, My learning and lesson widget against the **real `LearningState`** with a fake account client whose server replies the test releases. Only `getLearningService()` is substituted, in this test process. Covered:
  - the model check;
  - Library Unsave through pending and confirmation, with a second press and another card's Save writing nothing;
  - a failed save keeping focus and the busy state until Retry succeeds;
  - the widget's Mark as practised through confirm and fail;
  - My learning Saved: the middle card hands focus to the card now in its place, and the last card to the empty-state link;
  - tab focus never moved, and Refresh busy-not-disabled while saving;
  - an account switch discarding the old pending change, with a late reply ignored;
  - browser mode saving at once;
  - native `disabled` only when saving is impossible;
  - card link accessible names for both Resume and Open;
  - **Clear progress** with a fake `confirm`:
    - In progress: the cleared card hands focus to the card now in its place, and a press while saving neither asks nor writes;
    - Practised: clearing the last card focuses the empty-state link;
    - a cancelled confirmation writes nothing;
    - a save that starts while the dialog is open stops the reset (the second live check);
  - **Refresh and Import:** spy wrappers show no call while saving and exactly one each once ready;
  - the Clear progress busy style;
  - **real transient controls:**
    - Library Retry: confirm, fail again (focus not pulled back), retry again;
    - a background retry never takes focus from search;
    - My learning Retry and Refresh, with a reload started elsewhere not moving tab focus;
    - Import busy-but-focusable, and the panel disappearing while focused;
    - the widget Retry through confirm and failure.

  Teardown answers any still-waiting reply, so a failing test can't hang on a timer. Assertions on elements are identity checks.
- **Mutants caught** (25 s cap, full restore): native `disabled` while pending, no live guard, the widget without `keepFocus`, no My learning fallback, a fallback that steals focus, Refresh natively disabled while saving, a card link without its form name, and the old permissive focus model. Also caught: the Clear progress check before confirm, the check after confirm, unguarded Refresh, unguarded Import, and a missing Clear progress busy style. Also caught: plain `hidden`/`disabled` for each of the five transient controls, a helper that always moves focus, and a model without the focus fix-up.

### QA
The fixture `/private/tmp/tkdflow-learning-focus-fixture.mjs` (outside the repo, all Supabase traffic blocked) reproduces the original bugs and now exercises the fix.

### Limits
- I used no browser after the fix. Codex should re-run the three reproductions, plus fail and Retry, in Chrome.
- A natively disabled control that already had focus (not rebuilt) isn't modelled; the product no longer disables during pending.

## Batch 8 — opt-in search of spoken instructions (item 20)

### What changed
- **Data:** `scripts/build-technique-index.mjs` also generates **`data/technique-cues.json`** (`{"version":1,"cues":{"<lesson>:<pose>": text}}`).
  - It covers exactly the 702 indexed mid-form study poses (no opening ready or closing return), in lesson then pose order.
  - Each text is the lesson's own `data/narration/<id>.json` cue, byte for byte. There's no new teaching text.
  - Size: 60,256 bytes raw, about 6.2 KB gzipped.
  - `--check` (so `npm run check`) fails if either `techniques.html` or the cue file is stale.
- **Page (`techniques.html`, script-only controls):**
  - a checkbox, "Also search spoken instructions", with the hint "Finds poses whose spoken instruction uses your words, even if the technique has another name.";
  - a status line with "Try again";
  - one new note under "About this index".
  - The static index, the stats line and the no-JavaScript page are unchanged, and no cue text is in the HTML.
- **URL:** `?cues=1` (only `1` is accepted). Ticking the box uses the finder controller, so it is one history entry, carries any pending typed words, and Back/Forward restores it. **Clear** resets the search and filters but keeps the option, because it is a search option, not a filter.
- **Loading (`js/pages/techniques.js`):**
  - The file is fetched only when the option is on, from the same origin (`/data/technique-cues.json`), through the existing `loadJSON`. The 8 s timeout and the shape check (`cuesProblem`) apply.
  - The response is bounded by `maxLength` (200,000 characters). This is a new optional `loadJSON` parameter: a larger declared Content-Length is refused before download, and a longer body before parsing. Other callers are unchanged.
  - There is one request at a time, and the data is cached once loaded.
  - A reply only fills the cache. What is shown always follows the current state, so a reply that lands after Back, unticking or a filter change cannot bring cues back into a view that no longer asks for them.
- **While loading, or after a failure,** results stay named techniques only, and both the status line and the polite live summary say so: "Named techniques only for now: spoken instructions are loading." / "Named techniques only: spoken instructions could not load."
  - "Try again" makes one new request and re-renders at once, so the live summary switches to the loading wording together with the status line.
  - If Try again was focused, focus moves to the status message. If the message itself goes (Back, unticked, loaded), focus moves to the checkbox, never to `<body>`.
  - Ticking the box again after a failure also retries.
- **Matching (`js/lib/technique-finder.js` `selectView`):**
  - With the option off, or on without data, the output is identical to the named-technique search; this is tested over a 30-query corpus × 3 filters.
  - With data, each search word may match the pose's name hay **or** its instruction, so "koryo chamber" works.
  - Exact form names, style and form filters, row caps and group order are unchanged.
  - A pose found only through its instruction shows **"Spoken instruction:"** and the exact text, built as DOM text nodes (no `innerHTML`).
  - The summary adds "(N only in spoken instructions)", with counts deduplicated by (form, pose).
  - No-match text: "No study poses match in technique names or spoken instructions."
- When cue data arrives and groups reorder, a focused result link keeps focus.

### Tests
- `tests/technique-cues.test.mjs` (19), including **8 page-level tests**: the real `techniques.js` runs on the real generated `techniques.html` markup in the mini DOM (new test-only `tests/helpers/mini-html.mjs`), with a deferred fake fetch. They cover:
  - no request by default;
  - one same-origin request on opt-in, names-only wording while loading, and exact snippets afterwards;
  - a late reply after Back or untick, then cached re-use;
  - a filter chosen while loading;
  - 500, network, wrong-shape and oversize failures with Try again focus, and the summary's loading wording during the retry;
  - retrying Koryo "throat" (no named match): status and summary both say loading at retry start, focus is on the message, then 4 instruction-only poses;
  - Back with Try again focused, and Clear keeping the option;
  - focus kept across the reorder.
- `tests/technique-finder.test.mjs`: state expectations gain `cues:false`. The old "no network" contract is now "only the opt-in, same-origin, bounded cue file; no storage or account; no `innerHTML`".
- `tests/helpers/mini-dom.mjs`: anchors accept `href` assignment, which the page already does for the Library link.
- **18 bounded mutants, all killed:**
  - cues searched when off;
  - endpoints included;
  - altered or normalised cue text;
  - a late reply re-applying cues;
  - `innerHTML` snippets;
  - no Retry or status focus handoff;
  - no size bound;
  - no shape check;
  - Clear dropping the option;
  - no names-only wording;
  - loading without opt-in;
  - a repeat request;
  - an undeduplicated count;
  - loose `cues=` parsing;
  - Retry not re-rendering the summary;
  - no focus keep on reorder.
- `npm run check`: 612/612.

### Review fix R1 (root browser QA)
- **Found in real Chrome:** `?q=throat&form=koryo&cues=1`, a 500, then a 3 s delayed response and a keyboard Try again. Focus and the status line were correct, but `#tf-summary` kept "Named techniques only: spoken instructions could not load." until the reply arrived. The Retry handler started the load without re-rendering.
- **Fix:** the Retry handler calls `apply()` after starting the load. This is the only product change; there's a page-level regression and a mutant for it.
- **Already passed root's browser checks:**
  - 0 requests by default;
  - "chamber" 2 → 103 poses (101 found only through instructions);
  - Back/untick with the cached data is safe;
  - pending typed words carried into the choice;
  - Koryo "throat" → the 4 correct poses.

### Browser QA (Codex, real Chrome, synthetic local fixture)
Codex used `/private/tmp/tkdflow-technique-cues-fixture.mjs` (outside the repo, which chooses the cue response: normal, 3 s delay, 500, malformed). After the R1 fix:
- 0 requests by default.
- "chamber": 2 → 103 poses, 101 of them found only through instructions. Koryo "throat" shows 4 exact instructions.
- Pending typed words carry into the choice.
- **Failure and retry:** after a 500, keyboard Try again moves focus to the status message, and the status line and summary both say loading.
- **Back and Forward:** Back before the delayed reply stays names-only; Forward uses the cached data.
- 320, 390, 820 and 1280 px: no overflow. 0 backend requests.
- **Live after PR 32:** 7/7 public files, security headers and development 404s match; the live Koryo "throat" search shows its 4 exact instructions; no account SDK loads.

### Known limits
- The summary's announcement was not tested with a real screen reader. It uses the existing polite live region.
- There's no highlighting of matched words inside the instruction; the exact text is shown plain.
- Matching is literal substring matching after the catalogue's `normalize()`, with no stemming ("pivot" finds nothing).
- Spoken instructions describe stances and turns, so the option can find poses by those words, but the named index still does not index stances (item 21).
- `kihap` is a pose flag, not cue text.
- The cue file uses the browser's and Vercel's default caching for `/data` (no explicit Cache-Control rule), so freshness relies on default revalidation. Right after a deploy, a browser could pair a newer page with an older cached cue file, or the reverse. That file would still pass the shape check, but its instruction text or keys might not match the current lessons until it revalidates. There is no version check between the two.

## Batch 9 — full spoken instruction in Study view (item 31)

### Change (`css/lesson.css` only)
- **Clamps removed:** the Study view clamps on `.voice-caption` are gone, both the 2-line portrait clamp and the 1-line short-landscape clamp (`min-width:560px and max-height:560px`). The whole instruction always shows, and the flexible canvas row gives up the extra lines. The existing ResizeObserver in `lesson-view.js` re-fits the camera, so the full body stays framed, slightly smaller on poses with longer instructions.
- **Empty captions:** with the Study `display` override gone, the existing `.voice-caption:empty { display: none; }` applies in Study view too, so a lesson without narration doesn't keep an empty caption margin.
- **Large-text safety valve:**
  - the canvas row keeps a minimum, `minmax(min(140px, 25svh), 1fr)`, which is 80 px on a 320 px-high screen and 140 px on 568 px and taller;
  - `.lesson-study .player-card` is `overflow: hidden auto`, so it scrolls vertically only if the content can't fit (very large text). Before this change, the card's `overflow: hidden` would have clipped the bottom controls.
  - The new row rule follows the old one inside the same declaration block, so a browser without `svh` keeps the previous `minmax(0,1fr)` row.
- **Unchanged:** no new button, dialog or JavaScript; no reserved line heights; no content length limit. Narration text, audio, animation, avatar and the non-Study layout are untouched.

### Checks
- `npm run check`: 612/612. `git diff --check`: clean.
- This small, reversible CSS fix was implemented without CSS-mirroring tests or mutants. It is covered by the existing 612 checks plus Codex's independent browser review (below).

### Browser review (Codex, real Chrome, synthetic data only)
Measured on Taebaek pose 10, the longest instruction (130 characters). Before the change, at 320×700 the caption was 31 px high (`scrollHeight` 47) and the canvas 269 px.

| Viewport | Caption (`clientHeight`/`scrollHeight`) | Canvas | Card scroll |
|---|---|---|---|
| 320×700 | 47 / 47 (full) | 253 | none |
| 320×568 | full | 185 | none |
| 390×844 | full | 253 | none |
| 568×320 | full | 80 (at the `25svh` minimum) | none |
| 740×360 | full | 100 | none |
| 820×1180, 1280×800 | full | 354 | none |

- **All normal sizes:** full caption, no card scroll, all controls visible, no horizontal overflow.
- **Native Chrome page zoom at 200%** (zoom badge confirmed):
  - 1280×800 physical (640×400 CSS): full caption 31 px, canvas 140, all controls visible, no scroll;
  - extreme 320×700 physical (160×350 CSS): full caption 109 px and canvas 88. The card scrolls (511 px of content in 332), and keyboard focus on Speed scrolls it into view. No horizontal overflow.
- **Escape, re-entry and rendering:** after resetting to 100%, Escape exits Study view and focuses the Study view button, and re-entry works. The connected rig's whole body was visually confirmed. No errors and 0 real backend requests.

### Known limits
- This was not a real screen-reader test or a text-only zoom test; the 200% checks above are page zoom.
- The canvas height varies a little more between poses (1, 2 or 3 caption lines), and the avatar is re-framed, as it already was between 1- and 2-line poses. No line-height reserve was added.
- At 568×320 the canvas is at its minimum (80 px) with the longest instruction. A longer future instruction, or larger text, there would make the card scroll rather than shrink the canvas further.
- There is no fixed content-length limit. Longer future instructions take more lines; the canvas gives up space down to its minimum (`min(140px, 25svh)`), and beyond that the card scrolls.

## Batch 10 — My school’s forms, a private organizer (item 32)

### What it is
- **`/school-forms.html`** (new; registered in `layout/pages.json`, so it is in the sitemap), with `css/planner.css`, `js/lib/school-planner.js` (model, validation, storage) and `js/pages/school-planner.js` (page).
- **Content:**
  - It starts **empty**: no templates, sample schools or suggested orders.
  - The visitor adds their own belt or level names, in their order, and for each level adds TKDflow lessons (any of the 23, grouped by style) or **their own form name**. Their own names are shown as plain text labelled "Your entry · no TKDflow lesson", with no link and no guessed match to a lesson.
  - Lesson entries are stored by lesson id only. Their names and links come from `data/forms.json`, the page's only request.
- **Copy:** one short invitation, plus one line saying the list is saved only in this browser, isn't part of the account and is separate from saved forms and progress. A hint asks for belt or level names only, not people's names or personal details. There are no personal-data fields and no reviewer or author banners.
- **Discoverability:**
  - a line in the library hero;
  - Start here ("Keep your school’s order");
  - a Community learning resource, with a new `clipboard` icon in `assets/icons.svg` (+ `icons.js`, `community.js`);
  - the shared footer.
  - Not in the top navigation, and not in lesson content.

### Editing, focus and Undo
- **Controls:** native buttons, inputs and selects only.
  - Levels and forms have Move up, Move down and Remove. Names carry context through `aria-labelledby` (for example "Remove Koryo"), and the level is the description.
  - The first and last Move buttons are `aria-disabled` and stay focusable; pressing them changes nothing.
- **Focus:**
  - After a move, focus stays on the moved item.
  - After a removal, focus goes to the item now in that place, else the previous one. Otherwise, for forms, it goes to the level's lesson choice; for levels, to the level name field.
  - Rebuilds keep focus through `keepFocus`.
- **Drafts:** typing or choices not yet submitted in any level (a rename, an own form name, a chosen lesson) are carried across every rebuild, whether add, move, remove, Undo or loading another tab's version. Only the submitted field is cleared.
- **Rename:** commits on Enter or on leaving the field, and updates in place without a rebuild.
- **Undo:** offered for the latest removal only. It **re-inserts** the item into the current list at its old position (clamped) and never restores an older copy of the whole list, so later edits can't be lost. Any other change retires it, and if Undo was focused, focus goes to the status message.
- **Clearing:** Clear the list asks first, with in-page buttons, and says an exported copy can be imported again.

### Saving, other tabs, export and import
- **Saving:**
  - `localStorage` key `tkdflow.schoolForms.v1`, `{version:1, rev, levels}`.
  - **Blocked or full storage:** the page works in memory and says the list lasts only until the page is left or reloaded, with Export to keep a copy.
  - **Unreadable data:** left untouched until the visitor changes something, and the page says so.
- **Other tabs:**
  - Every save re-reads storage first. If another tab saved since, nothing is written and a notice offers **Load the other version** or **Keep this tab’s version** (which also keeps a rename still being typed). Focus stays where the visitor is working.
  - A `storage` event while idle loads the other tab's version, with focus kept. While anything is being typed or an import preview is open, it shows the same notice instead of replacing anything.
- **Export:** a `Blob` download of `tkdflow-school-forms.json`, `{app, version, levels:[{label, forms:[{lesson}|{name}]}]}`. It contains no ids, dates or anything about the visitor.
- **Import:**
  - A file over **192 KB** is refused before it is read. That cap is above the largest valid export: 30 levels × 12 own names of 60 four-byte characters is 105,396 bytes, as root measured and as tested through the page's real file-size path.
  - Validation is strict, with plain reasons that never repeat file content. Objects are rebuilt from known fields only, ids are never imported, and unknown lessons are refused.
  - A preview with counts and the literal names comes first, then **Replace** or **Cancel**. An import never merges.
- **Text:** NFC; control characters, direction or isolate marks and unpaired surrogate halves are removed; whitespace is collapsed; at most 60 characters (code points). Everything is inserted as text, and links come only from validated lesson ids.
- **Print:** `window.print()` with print CSS. It shows a title, the numbered levels and their forms, with lesson URLs as text; controls and notices are hidden.

### Tests
- `tests/school-planner.test.mjs` (21). It covers:
  - the model;
  - Undo re-insertion with later edits kept;
  - export and import round trip;
  - the worst-case export re-importing for emoji, quote, backslash, accented and ASCII text;
  - hostile imports (prototype keys, markup, wrong app or version, over the caps, unknown lessons);
  - the store (blocked, quota, corrupt, two-tab conflict, replace, reload).
- It also has **10 page-level tests** that run the real page module on the real `school-forms.html` markup in the mini DOM, covering:
  - the empty default;
  - keyboard add with focus kept;
  - lesson links versus literal own names;
  - moves and edges;
  - remove focus and Undo;
  - drafts surviving add, move, remove, Undo and loading another version;
  - import (oversize before read, malformed, preview, Cancel, Replace, the largest list through the byte check);
  - export, print and clear;
  - blocked and corrupt storage;
  - idle and typing cross-tab changes, a held save, Keep and Load;
  - a focused Undo retired by an outside change;
  - lesson-list failure and Try again focus.
- **19 bounded mutants, all killed:**
  - Undo surviving later edits;
  - a snapshot Undo;
  - typing replaced by another tab;
  - a save overwriting a newer save;
  - corrupt data overwritten on load;
  - an unknown lesson imported;
  - an own name rendered as a link;
  - no pre-read size check;
  - import without preview;
  - no `keepFocus`;
  - no Remove fallback;
  - natively disabled edges;
  - direction marks kept;
  - lone surrogates kept;
  - a byte cap below a valid export;
  - drafts dropped on rebuild;
  - imported extra keys kept;
  - a missing memory-only notice;
  - no Retry focus handoff.
- Found and fixed while building: control-character removal ran before whitespace collapsing, so "Yellow↵belt" became "Yellowbelt". The editor had also written the regex's direction marks as literal invisible characters into the source; the regex now uses ASCII `\u` escapes, and a scan of the checkout finds no bidi characters.
- `npm run check`: 633/633. `git diff --check`: clean.

### Browser QA (Codex, real Chrome, synthetic lists only)
Codex used `/private/tmp/tkdflow-school-planner-fixture.mjs` (outside the repo; real `localStorage` by default, `?qa-storage=blocked` or `?qa-storage=corrupt`, a fake account service and a guard on backend requests). Every list was one Codex made up for the test.
- **Editing:** added 2 levels, a Taegeuk Il Jang lesson and an own name containing markup, which showed as literal text with no HTML or link. Another level's unsubmitted draft was kept across add, move, remove and Undo. Keyboard focus after reordering, and the fallback after removal, were correct.
- **Two real tabs:** a conflict kept the draft. Keep this tab's version and Load the other version both worked, and focused the status and the list heading.
- **Export:** a 305-byte file was actually downloaded.
- **Import:**
  - The extension's file API was blocked and no permission was changed; the native OS file picker worked.
  - An invalid lesson file was rejected and the current list was unchanged.
  - The real exported file previewed, and both Cancel and Replace worked.
  - A 105,396-byte Unicode file previewed as 30 levels and 360 forms and was accepted by the size check; Codex cancelled it, and the list was unchanged.
- **Print:** native Print preview was 1 page with 3 levels, 2 forms and the lesson URL, and no editing controls.
- **Layout:** 320, 390, 820 and 1280 px, no horizontal overflow.
- **Storage:**
  - Blocked storage: editing worked in memory, with the export notice.
  - Corrupt fixture: 0 writes until Add, then 1 write; the real stored list was untouched.
  - Clear: Cancel kept the list; confirming emptied it and focused the add-level field.
- 0 console errors and 0 real backend requests. Root's 21 targeted tests passed, and the full 633/633 passed.

### Known limits
- **Not tested:**
  - a real screen reader (names and announcements are checked only in the mini DOM);
  - the download in Safari or on iOS (only Chrome downloaded a file);
  - real school lists, since only Codex's own synthetic lists were used;
  - committing or printing the largest Unicode list, which was previewed and then cancelled.
- Input `maxlength="60"` counts UTF-16 units, so a field holds about 30 emoji, while the model and import allow 60 code points.
- `localStorage` has no transactions. Two tabs saving in the same instant could still race in the moment between the re-read and the write, a far smaller window than before. Different devices or browsers never sync, by design; use Export and Import.
- Undo covers only the latest removal, in memory, and is gone after reload. Import replaces and never merges.
- The organizer needs `data/forms.json` to open. If it fails, a Try again message is shown and nothing is lost.

## Batch 11 — faster avatar garment construction, byte-identical (item 33)

### Change (`js/animation/avatar-geometry.js` only)
`buildGarmentGeometry` builds the jacket and trousers once per lesson page by marching tetrahedra over a distance field. It now reuses work it used to repeat, with the same arithmetic:
- **Field values per lattice point, once:** a `Float64Array` holds the field at every grid point, instead of each cell evaluating its 8 corners. Each point is computed as `min + k*step` with an integer `k`, the same number the old `min + (x+c)*step` gave.
- **Gradients per exact point, once:** every emitted vertex used to recompute a 6-sample gradient, although the 63,504 jacket vertices have only 10,586 distinct positions. The cache key is the raw bits of the three coordinates, so `0` and `-0` never share an entry. It is created inside each build and is not shared between garments or calls.
- **Sort angles per point, once:** the polygon sort comparator used to build `Vector3`s and call `atan2` on every comparison. Each point's angle is now computed once, with the arithmetic of `Vector3.sub()` then `dot()`, so the comparisons and the resulting order are the same.
- **Scalar distance functions:** `ellipsoid` and `capsule` take coordinates instead of building arrays with `map`, spread and `reduce`, with the same operations in the same order (`Math.hypot` arguments in order, dot products summed left to right from 0).
- **Unchanged:** the exports (`buildGarmentGeometry`, `garmentField`, `garmentWeights`) and their signatures; attribute names, order, types and item sizes; the non-indexed layout and triangle order; `avatar.js`; motion, avatar look, artwork, materials, media, downloads and network.

### Tests (`tests/garment-geometry.test.mjs`, 8)
- **Frozen reference:** `tests/helpers/garment-reference.mjs` is a verbatim copy of the builder as published on `main` at `665c3ff`, marked test-only. Its source text is pinned by SHA-256, so editing it fails a test.
- **Same-engine byte comparison:** both builders run in the same JavaScript engine. For each garment the test requires the same attribute names and order, array types, item sizes, counts, normalized flags, no index, identical bytes in all five attributes, and the same draw range and bounding sphere.
- **Other spacings:** four other grid spacings are byte-identical too.
- **Independence:** a rebuild after another garment matches the first build, and no globals are left behind.
- **Field and weights:** `garmentField` and `garmentWeights` match the reference exactly (`Object.is`) at 412 points per garment, including `-0` coordinates.
- **Exports:** the same three exports as before.
- **Counts:** jacket 63,504 vertices and trousers 49,992, the same as Codex measured in Chrome.
- **Not asserted:**
  - No hash of the output is pinned, because another engine may compute the last bit of `Math.atan2` or `Math.hypot` differently. The test compares with the reference in whichever engine runs it.
  - No timing is asserted.
- **15 bounded mutants, all killed** (runner outside the repo, `/private/tmp/tkdflow-optA-mutants.mjs`):
  - a rounded (`toFixed(4)`) cache key, and a key that ignores z;
  - a corner point computed as `min + x*step + c*step`;
  - the lattice built with `spacing` instead of `step`, and read with y and z strides swapped;
  - a sort angle without the centre offset, and one with u and v swapped;
  - reversed triangle winding;
  - gradient components reordered;
  - `Math.hypot` arguments reversed in `ellipsoid` and in `capsule`;
  - `r` instead of `r*r` in the ellipsoid denominator;
  - the union smoothing term re-associated;
  - an extra export;
  - a leaked global.
- **Probes, reported rather than required:**
  - **Changes that left every output byte the same here, so the byte test can't see them:**
    - reordering the capsule dot product (every capsule lies along one axis);
    - a `toFixed(6)` key (no two distinct points lie within 1e-6);
    - merging `0` and `-0` in the key;
    - dropping the leading `0+` of the dot products;
    - `Math.sqrt` of a sum instead of `Math.hypot` (a last-bit double difference that disappears when stored as Float32);
    - reordering the sort-angle dot products;
    - removing the duplicate-point check;
    - `> 0` instead of `>= 0` in the empty-cell test.

    The product keeps the exact form of each anyway.
  - **Caught:** sharing the gradient cache between builds.

### Measurements (Node 24, this machine; a guide, not the claim)
| | Jacket | Trousers |
|---|---|---|
| Reference builder | 748 ms | 347 ms |
| New builder | 91 ms | 60 ms |

Output is identical: all five attributes match byte for byte in Node.

### Browser QA (Codex, foreground Chrome, same local diagnostic fixture before and after)
- **Code review:** Codex independently ran the 8 geometry tests. The frozen reference, from its first import, matches `origin/main` exactly. No runtime export or call site changed.
- **Rendering:** Taegeuk Il Jang pose 6 (front) and Sipjin pose 23 (right) show the same full body and approved look as the baseline screenshots, with 0 warnings or errors.
- **Measured runs** (raw data: `/private/tmp/tkdflow-geometry-reference-t1.json`, `…-reference-sipjin.json`, `…-optimized-t1.json`, `…-optimized-sipjin.json`, outside the repo):

| Page | Avatar rig construction | Avatar ready after navigation |
|---|---|---|
| Taegeuk Il Jang | 1411.3 → 155.5 ms | 1617.1 → 327 ms |
| Sipjin | 5234.0 → 186.7 ms | 5684.5 → 583 ms |

- **What this is:** local diagnostic runs on one machine, not a guarantee for every device and not a frame-rate measurement. The baseline itself varied 3.7× between pages, so no speed-up factor should be advertised. Release notes should quote only these measured before-and-after runs.

### Known limits
- Construction still runs once per page, as one main-thread task, only shorter. A module Worker (option B in `/private/tmp/tkdflow-garment-performance-plan.md`) is the next step if Codex still measures a noticeable task.
- Byte-identical means identical to what the same engine computed before. Engines may already differ from each other in the last bit of `Math.atan2` and `Math.hypot`; this change doesn't alter that.
- The same garment code took about 3.8 times longer on Sipjin than on Taegeuk Il Jang in Codex's baseline. The cause wasn't investigated (other work on the page or garbage collection are possibilities), so the gain on each page has to be measured, not assumed.

## Batch 12 — homepage Explore by learner task (item 34)

### Change (`index.html` Explore section, `assets/icons.svg`, `js/lib/icons.js`, `css/home.css`)
The six cards are now six distinct tasks, each with one sentence and one or two links:

| Card | Links |
|---|---|
| Study a form | Open the forms library |
| Find a technique | Find a technique |
| Read or print a form | Read and print companions |
| Plan your study | Open my learning · My school’s forms |
| Community | Visit the community · Lesson questions & answers |
| Events | View events · Your first tournament |

- **Sentences:** each restates the target page's own description; there are no fixed counts.
- **Removed:** the separate Taegeuk Il Jang and "All 23 lessons" cards, which still have their routes from the hero, Featured forms and the library. Also removed are the five generic chips.
- **Events card:** keeps `#events-state` and `#events-teaser` with the same elements, classes and static text, so `home.js` is unchanged.
- **Icon:** one new sprite icon, `page` (a sheet with a folded corner), for the read and print card. The other cards use existing icons.
- **CSS:** two rules for a wrapping row of links.
- **Unchanged:** the hero, stats, styles strip, Continue learning, Featured forms, founder teaser and member banner.

### Tests (existing `tests/site.test.mjs`)
- **Explore section:**
  - six cards, each with a sprite icon;
  - no destination offered twice;
  - links to the library, finder, companions, My learning, My school’s forms, Community, lesson answers, events and the first-tournament guide;
  - `#events-state` and `#events-teaser` exist once, stay on the Events card, and are still updated by `home.js`.
- **Icon references:** the existing local-link test now also requires every `assets/icons.svg#…` reference on a page to exist in the sprite.
- **Not pinned:** headings and sentences, so copy can change without editing tests. No mutants were run for this reversible copy and layout change. I checked by hand that renaming the `page` symbol, or repeating a destination, makes the tests fail.

### Browser QA (Codex, real Chrome, local fixtures with a synthetic account only)
Fixture on port 8994 with the real home and learning modules:
- **Layout:** 320, 390, 820 and 1280 px, with 0 horizontal overflow. Six cards in 3×2 on desktop and one column on phones. Links are at least 30.5 px high (53 px where wrapped at 820).
- **Icons:** all six render cleanly, including the new `page` icon at 26 px.
- **Keyboard:** the Tab order of the 9 links matches the visual order. Enter on Find a technique, Read and print companions and My school’s forms reached the right heading and URL.
- **Member and visitor:** a synthetic member sees Continue learning (Taegeuk Il Jang pose 5) and the Keep learning banner. After signing out, the banner offers Create a free account and Continue learning is hidden.
- **Events:**
  - Normal runtime text: 164 upcoming or announced events.
  - With a forced 503 (fixture on port 8995): the static "Worldwide" text and the events and tournament links stay.
- **Errors:** 0 on the ordinary path; the only error was the expected 503 on the failure fixture.
- **Diff review:** Codex confirmed only the Explore copy, 2 CSS rules, one SVG symbol and its registry entry, the test guard and docs changed. Hero, stats, Featured forms, founder teaser and member banner logic are unchanged.

### Known limits
- No real screen-reader test; link names and the Tab order were checked in Chrome only.
- Tested with a synthetic account and fixture data only, not live member data.

## Batch 13 — library search ranking and belt note (items 11 and 9)

### Search ranking (`js/lib/catalog.js`, `js/pages/forms.js`)
- **What changed:** with a search and the default order, results are ordered by how well the form's own names fit, and ties keep curriculum order. The names are the name, Korean name, id and listed spellings. In order:
  1. every word is a whole name word;
  2. every word starts a name word;
  3. every word is inside a name;
  4. the words are found only in other text, such as the meaning, description or belt.
- **Examples:**
  - "Won" now lists Won-Hyo first. Codex's live baseline showed 15 results with Won-Hyo last, because the 14 WT forms match through the word "Kukkiwon". It now leads, with its ITF series header first;
  - "do" lists Do-San first;
  - "sa" lists Sa Jang before Sam Jang;
  - "Il Jang" lists Il Jang before Chil Jang;
  - "geu" lists Keumgang (spelled Geumgang) before the Taegeuk forms.
- **Unchanged:**
  - the set of matching forms;
  - exact whole-name matches (still only that form);
  - facet counts;
  - every filter;
  - a chosen sort (name, difficulty, movements);
  - the URL (no new parameter).
- **Flat results while ranking:** a ranked search is shown as one flat grid in exactly the ranked order, like an explicit sort. Series groups (with their headers) are kept only for the plain curriculum view with no search. Each card's style badge still names its style.
  - **Review fix (root browser QA):** the first build kept series grouping while ranking, so `?q=sa` rendered Sa Jang, Sam Jang, then the other six Taegeuk forms before Do-San, although the ranked order put Do-San third.
- **Honest labels:** while a search is active with the default order:
  - the sort control's default option reads "Closest name match, then curriculum";
  - the summary adds "closest name matches first" when there is more than one result.

  Without a search, or with another sort chosen, the option reads "Curriculum order" as before. A chosen sort is never overridden.

### Belt note (`forms.html`, `css/forms.css`)
- One line under the belt colour filter: "A typical colour for each style, not a rule: every school sets its own belt order", with a link to My school’s forms.
- The belt fieldset is described by the note (`aria-describedby`).

### Tests (existing `tests/catalog.test.mjs`)
- **Ranking:** closest name first for 7 partial queries, the same match set as before, facet counts agreeing, Chil Jang ranked below Il Jang, and ties kept in curriculum order.
- **Unchanged behaviour:** a chosen sort still wins, the style filter still applies, exact names still return one form, no URL parameter is added, and no search keeps curriculum order.
- **Belt note:** the belt filter is described by the note, and it links to the school list.
- **Real page** (`tests/learning-focus.test.mjs`, which already runs the real `forms.js`):
  - `?q=sa`: the rendered card order equals `applyState`'s order, Do-San comes before the Taegeuk forms that match only in their text, and no series header is shown;
  - `?q=Won` shows Won-Hyo first, with the summary and the sort label;
  - `?q=Won&sort=name` keeps the name sort and the plain label.
- **Spot-checked:** removing each tier or the curriculum tie-break makes a catalogue test fail; turning ranking off, or restoring series grouping while ranking, makes a page test fail.

- **Live REST syntax:** Codex checked the production endpoint anonymously and read-only for the planned Community keyset filter (`created_at` and `id` together, both directions). Baseline, descending and ascending all returned HTTP 200, with no database change. That's for the next batch; nothing in this batch uses it.

### Browser QA (Codex, native Chrome, local)
- **Tests:** Codex independently ran the catalogue and learning-focus tests (39); the full suite is 647/647.
- **Ranking:**
  - `?q=Won`: Won-Hyo first, then Pyongwon, then the other WT forms;
  - `?q=sa`: Do-San is third in the rendered page, before the Taegeuk forms that match only in their text.
- **Unchanged behaviour:**
  - choosing the Name sort gives A–Z, and Back restores the previous state;
  - the ITF filter with "Won" gives only Won-Hyo;
  - Clear restores all 23 forms in grouped curriculum order;
  - the full name "Taegeuk Il Jang" gives exactly one form.
- **Layout:** 320, 390, 820 and 1280 px, with no overflow and no clipping of the belt note.
- **Errors:** 0 console errors on the ordinary path.
- **Diff review:** Codex reviewed the 7-file diff.

### Known limits
- Ranking uses names only. A form found only through its description is ranked by curriculum order among the others found that way.
- The option's value stays `curriculum`, so links that set `sort=curriculum` are unchanged; only its visible label changes during a search.
- No real screen-reader test of the sort label change or the belt note.

## Batch 14 — Community pages of 50 (item 12, pagination part)

### What changed (`js/lib/discussions.js`, `js/lib/public-discussions.js`, `js/lib/community-connection.js`, `js/pages/forum.js`, `community.html`, `css/preview.css`)
- **Before:** topics and replies were each read as one fixed list of 100, ordered by time only. A topic with more than 100 replies silently showed only the oldest 100, and search covered only those rows.
- **Now:** both are read 50 at a time, with "Load more discussions" under the list and "Load more replies" inside an open discussion.
- **Keyset:**
  - Order is by the full keyset, `created_at` then `id`: newest first for topics, oldest first for replies. 51 rows are requested to learn whether more exist.
  - A later page uses `or=(created_at.lt."<ts>",and(created_at.eq."<ts>",id.lt.<id>))`, with `gt` for replies. Any number of rows sharing one timestamp is walked exactly once.
- **Cursor values:**
  - The timestamp is the server's own string, keeping microseconds and offset; it is never parsed into a `Date`.
  - It must have a safe ISO shape, the id must be a UUID, and the timestamp is double-quoted in the filter.
  - The URL goes through `URLSearchParams`, so `+` and `:` are percent-encoded.
  - An unsafe cursor is refused before any request.
- **Cursor source:**
  - The cursor comes from the raw rows of the last feed page consumed. A row dropped as invalid never makes the next page skip posts.
  - A deep-linked older topic, read on its own, never moves the cursor. It is shown after the feed until a later page reaches it, then appears once in its own place.
- **Failures and late answers:**
  - A failed page keeps everything shown, says "Older discussions could not be loaded" and offers a retry. Two clicks make one request.
  - A page answered after a Refresh, a sign-in change or a switch to public reading is discarded.
- **Focus:** after an explicit Load more, focus moves to the first new topic link or reply, but only if the Load more button still has focus. A visitor who moved to search or a reply draft keeps their place. The button stays focusable while loading (`aria-disabled`).
- **Honest search wording:**
  - While older topics remain: "Showing the 50 topics loaded so far. Older discussions can be loaded."
  - With a search or category: "N of the 50 topics loaded so far match … Load more discussions to search older ones."
  - With everything loaded, the plain count as before.
  - The loaded total counts every distinct topic shown, including a deep-linked older one. The feed cursor stays independent of it.
  - **Review fix (root browser QA):** the first build counted only feed rows, so a deep link plus a search that matched everything read "51 of the 50 topics loaded so far".
- **Reply links:** a pending or rejected reply in "Your submissions" now links to the discussion it belongs to.
- **Under-13 tabs:** they keep reading publicly; Load more uses only the stateless public reader and never starts the account service.
- **Unchanged:** schema, grants, RLS and cloud settings; columns requested (`TOPIC_COLUMNS`, `REPLY_COLUMNS`); posting, reporting and moderation.
- **Production syntax:** Codex had already checked the compound keyset filter read-only on production: HTTP 200 for baseline, descending and ascending.

### Tests
- **New `tests/community-pagination.test.mjs` (13):**
  - **Cursors:** exact cursor strings and validation (microseconds, offsets, no `Date`, injection characters).
  - **Request syntax:** the exact emitted query in both directions, percent-encoded; the SDK path (`or`, both `order`s, `limit 51`); the cursor taken from raw rows.
  - **PGlite oracle:**
    - the real client walks every page against the real schema and row security as anonymous; a test-only parser (`tests/helpers/postgrest-filter.mjs`) turns the client's actual URL into SQL;
    - seeds include 70 published topics and 60 replies sharing one exact timestamp, rows a microsecond apart, equal instants written with other offsets, and pending or rejected rows;
    - the walk equals a plain ordered `SELECT`, each published row once, and unpublished rows never appear.
  - **Controller:** Load more and a deep link; a failed page and retry; double clicks; late answers after a Refresh and after an account switch.
- **`tests/community-focus.test.mjs` (+4, real `forum.js`):**
  - the harness now answers the client's real query (filters, keyset, order, limit);
  - Load more focuses the first new topic and the summary wording is right;
  - a slow page doesn't take focus from search;
  - the pending-reply link;
  - a deep-linked older topic plus a broad search: "51 of the 51", and after Load more each topic is listed once.
- **Updated:** `tests/community-public.test.mjs`, the request shape (`created_at,id` order, limit 51).
- **Six spot-checked mutants, all caught:**
  - a timestamp-only cursor;
  - unquoted timestamps;
  - a cursor taken from the kept rows only;
  - no late-answer check;
  - focus taken after a slow page;
  - a duplicated deep-linked topic.

### Browser QA (Codex, native Chrome, root's local fixture on port 9002; synthetic data only)
- **Tests:** Codex independently ran the 62 Community checks. They need permission to bind a local server; a run under the default scope failed only with `EPERM`. The full suite is 664/664.
- **Topics:**
  - 50 → 100 → 138, all unique, with no Load more at the end; focus moved to the first new topic each time;
  - a search for a word that occurs once: 0 of 50, then 0 of 100, then 1 when everything was loaded;
  - Retry after a failed page kept 50, then reached 100;
  - typing in search during a 2-second page kept focus in search.
- **Replies:** 50 → 100 → 130, unique. A failed last page plus Retry kept the reply draft and focus.
- **Links:** the pending reply's parent link opened topic 005. The deep link to topic 005 showed 51 of 51, then 101, then 130 for "Demo", with topic 005 listed once.
- **Under-13 public tab, with a planted moderator account:** 0 SDK or account queries; no composer, report, moderation or submissions controls; public replies reached 130.
- **Category plus "Demo":** 25 → 50 → 65 unique.
- **Sign-out:** a page that arrived after signing out kept 50 topics, and private controls stayed hidden.
- **Layout:** 320, 390, 820 and 1280 px, retry controls included, no overflow.
- **Errors:** 0 on the ordinary path.
- **Not completed:** a native check of repeated key presses while busy (the control had changed); the unit guards cover it. No real screen reader or Safari.

### Known limits
- Search and category still filter only the loaded topics; the wording now says so. A server-side search would need a new query or index.
- A topic published between two page loads, newer than the first page, appears only after Refresh. One hidden meanwhile disappears from the list on Refresh.
- No real screen-reader or Safari test. The native repeated-keypress-while-busy check wasn't completed; the unit guards cover it.
- Author controls (edit or withdraw) and notifications remain open. They need SQL, RLS and an owner staging apply.

## Batch 15 — Replay move (item 35)

### Change (`js/animation/lesson-timeline.js`, `js/pages/lesson-player.js`, `js/lib/lesson-nav.js`, `css/lesson.css`, all 23 lesson pages, `start-here.html`)
- **Replay move:** a button in the playback controls, and the R key while the player is selected. It plays the current move once, from the move's start through its pose and a short hold, then pauses on that pose.
- **One clock:** the replay runs on the lesson's single clock (`LessonTimeline.playMove`), so voice and effects follow it exactly as in normal play. Assets, motion and the avatar are unchanged.
- **Where it stops** (`replayWindow`, chosen by the product decision):
  - **Silent hold:** capped at 1 s after the pose, but it never cuts that move's own speech or effect.
  - **Ready pose:** keeps its whole hold, because its spoken instruction is there.
  - **Last pose:** plays to the end of the form.
  - **Next move:** the stop is always before the next move starts, so the lesson stays on the replayed pose.
- **Pause and navigation:** Pause keeps the stop, and resuming still stops on the pose. Speed changes keep it. Seeking, choosing a pose, Previous/Next/First/Last and frame steps clear it.
- **Normal Play is unchanged,** including the existing rewind to a chosen move's start.
- **Keys:** a held R doesn't restart the replay; R with a modifier or in a text field does nothing.
- **Announcements:** a separate screen-reader-only status (`#replay-status`) says "Replaying pose N: name." and "Paused on pose N: name." It never uses the voice error status.
- **Hints:** all 23 key hints and the Start here tools section name R and the button.
- **Phone Study view (≤400 px):** the controls grid has 5 columns, with Speed spanning 2 cells. The 8 buttons plus Speed make exactly two rows. The Replay button's text label is visually hidden there but stays its accessible name.
- **Short landscape Study view** (at least 560 px wide and at most 560 px high, e.g. 568×320 and 740×360): one compact row of 10 columns, with Play and Replay icon-only and Speed spanning 2. Outside Study view the controls are unchanged.
- **Review fixes (root browser QA, Taebaek `?pose=10`, the longest caption):**
  - at 320×700 the Speed select was only 16.68 px wide and its value unreadable;
  - at 568×320 the wrapped controls (111 px high) overlapped the caption by 25 px, and the card's `scrollHeight` didn't reveal it.

  Both are fixed by the grids above. A replay that is restarted now also resets the frame delta, as Play does, so it never uses an old frame's elapsed time.
  - after those fixes, at 568×320 `.move-info` measured `clientHeight` 70 against `scrollHeight` 74: the caption text ended at y=225.09, past the box's edge at 222. It was still readable, because the progress track sits lower.

  Study view's `.move-info` now uses `min-height: auto` instead of `0`. It still drops the normal 132 px minimum, but the grid can't size the box below its own text. The caption text and size are unchanged.
  - with the full caption (78 px) at 568×320, the 80 px canvas minimum pushed the controls' bottom to y=315.09, 7.1 px past the card's 308 (the card's `clientHeight` was 294 against a `scrollHeight` of 302). Codex saw everything fit at 320×568, 740×360 and 1280×800.

  In short-landscape Study view only, the canvas row's minimum is now `min(140px, 20svh)`: 64 px at 320 px high, 72 px at 360 px. Other sizes keep `min(140px, 25svh)`.

### Tests (`tests/replay-move.test.mjs`, 7)
- **Clock-driven, no timers:**
  - the replay starts at the move's start, stops exactly once on the replayed pose, and Play then continues normally;
  - Pause and speed changes keep the stop; seek, select, frame step and next clear it;
  - normal Play runs to the end.
- **All 23 real lessons with their narration and effects,** for every pose:
  - the start is correct and the stop is on the pose and before the next move;
  - speech and effects are never cut, and at least 1 s of hold is kept when available;
  - silent holds are capped, which happens in practice;
  - the ready pose's whole hold, and the last pose to the end.
- **Keys:** R inside the player only, no modifiers or fields, and repeats ignored.
- **Markup:** the button in all 23 pages' playback controls, the R hint, a separate status, and Start here.
- **Phone Study view:** a 5-column grid, 9 controls in two rows, and the label visually hidden rather than removed.
- **Spot-checked mutants:** Pause cancelling the stop, no 1 s cap, a shorter cap, and a held R restarting were each caught.

### Browser QA (Codex, native Chrome, local)
- **Replay:**
  - **Speeds:** normal speed ends exactly on the pose (Taegeuk Il Jang pose 6 at 30.684 s), with voice and effects paused. Pause and resume, then 0.5× and 0.25×, end on the same pose.
  - **After a replay:** Play continues to the next move.
  - **Long silent hold:** Jitae's is capped.
  - **Ready and last pose:** the ready pose stops at 2.458 s and the last at 104.639 s.
- **Keys and navigation:** R in a text field, or outside the player, is ignored; R inside the player starts a replay. A frame step cancels the stop.
- **Audio:** with both tracks muted the replay still works. Missing narration works, and failed audio keeps the voice error status.
- **Layout:** all six viewport layouts have a readable Speed value and no control overflow. The remaining caption-box overflow at 568×320 is fixed above.

### Known limits
- **Browser review:** Codex reviewed this in native desktop Chrome and with phone-size emulation.
  - **Final layout:** at 568×320, canvas 71.9 px, full caption 78/78, card 294/294, controls ending at 307 within 308. At 320×700 the caption and card fit, Speed 0.25× is readable, and there's no horizontal overflow.
  - **Study view:** Escape exits it and returns focus to the Study view button.
  - **Errors:** 0 console errors on the ordinary page.
- **Not tested:** Safari or iOS, a real screen reader, and how well the spoken audio lines up with the motion by ear.
- The existing implicit rewind on Play (after choosing a pose with narration on) is kept, as decided. Replay move is the explicit, bounded alternative.

## Batch 16 — read-only live checker, deploy exclusions and current docs (item 36)

### Change
- **`scripts/check-live.mjs` and `npm run check:live`:** read-only GET requests, with no cookies, credentials or account calls. It checks:
  - **Bytes:** every sitemap page, script and stylesheet, plus any named public files, against this checkout by SHA-256.
  - **Global headers:** the `vercel.json` headers, exactly, on the home page, `/styles.css`, `/favicon.svg` and `/favicon.ico`. Each sample must answer 200; a 404 or redirect carrying the same headers fails.
  - **Favicon headers:** the favicon-specific `Cache-Control`.
  - **`--csp`:** `--csp report-only` expects the report-only header instead and requires the enforcing one to be absent.
  - **Redirects:** each `vercel.json` redirect's status and destination.
  - **Private paths:** 404 for every `.vercelignore` entry (a real file inside each folder), `vercel.json` and every dot-file.
- **Input safety:** these are refused as usage errors (exit 2) before any request is made or any file hashed:
  - for `--base`: credentials, a path, query or fragment, plain http other than localhost, and protocol-relative values;
  - for named files: URLs, `//`, absolute paths, `..`, backslashes, `%`, `?` or `#`, dot-files, development paths, non-public file types, symlinks anywhere in the path, files outside the checkout and files over 25 MB;
  - more than 100 named files.
- **Resource bounds:**
  - a live body is read only up to the local file's size and abandoned beyond it;
  - header, redirect and private-path responses aren't read;
  - 8 requests at a time, 15 s each.
- **Options:** the ones docs/RELEASE.md already documents (`--base`, `--csp`, `--json`), with `--origin` as another name for `--base`.
- **`.vercelignore`:** adds `.gitattributes`, which production served, and `.gitignore`, explicit now although Vercel already skips it.
- **`SETUP.md`:**
  - the top describes the current source flags (`enabled`, `signupEnabled` and `googleEnabled` all true) and says production is verified with the checker;
  - the additive `supabase/*.sql` files are listed;
  - the generated-file drift checks are described;
  - "36 pages" becomes every page in `layout/pages.json`;
  - the lesson review-status location is corrected;
  - the CSP description matches `vercel.json`;
  - "Current restoration work" and "Restoring member accounts" are labelled historical reference; the headings are kept because RELEASE.md links to them. The dated owner sections are unchanged.
- **`docs/RELEASE.md` §8:** current state first (enforced in source, verified live with `npm run check:live -- --csp enforced`), then the 2026-11-15 report-only situation and switch procedure, labelled as history. No dashboard state is claimed.

### Tests (`tests/live-check.test.mjs`, 11)
- **Deploy exclusions:** every root dot-entry is in `.vercelignore` (this catches `.gitattributes`).
- **A matching deployment:** against the real preview server, every check passes, using GET only.
- **Tampering is reported:** changed bytes, a missing header, a wrong redirect status and a served dot-file each fail, and nothing else does.
- **Large responses and favicons:** an endless response is cut off early as larger; a wrong favicon `Cache-Control` fails; favicons get both the global and their own headers.
- **`--base`:** origin validation covers credentials, a path, query or fragment, plain http, other schemes and protocol-relative values.
- **Named files:** permitted public files are accepted; URLs, traversal, backslash and encoded traversal, dot-files and development paths are refused.
- **Symlinks:** a symlinked file or folder, including one leading outside the checkout, is refused, and nothing is fetched for a refused input. The test uses two new unique temporary directories and never touches any other file.
- **Non-200 samples:** a header sample answering 404 with the expected headers fails both its status and its headers, while the 200 samples still pass.
- **Command line:**
  - the CLI exits 0 against a matching deployment and 2 for each usage error;
  - the documented options parse;
  - an enforcing deployment fails a report-only expectation.
- **Docs:** every `npm run` script named in SETUP.md and docs/RELEASE.md exists.

### Known limits
- **First production run:** the checker hasn't run against production yet. Root runs `npm run check:live` from the deployed commit.
- **Named files under 25 MB:** a larger file is refused locally rather than compared.
- **Not corrected in this batch:** the comments in `supabase/preflight.sql` about the schools policy, and `supabase-setup.sql:222`, which points to a SETUP section that doesn't exist. These are SQL files, left for a later batch. The full SETUP rewrite plan is in `/private/tmp/tkdflow-setup-doc-plan.md`.

## Batch 17 — Community search by every word (item 37)

### Change (`js/pages/forum.js` only)
- **How it matches now:** every typed word must appear in the topic's title or body. Words are compared with the catalogue's existing `normalize()`, which ignores case, accents, spaces and punctuation, the same function the library search uses. Word order no longer matters.
- **Unchanged:**
  - category filtering;
  - the URL (`?q=` and `?category=`);
  - the 50-topic paging and the "loaded so far" wording;
  - focus handling;
  - the bundled guides shown when the feed is unavailable;
  - the "No topics match" message.
- **Not added:** ranking, fuzzy matching or server-side search.

### Observed on the real bundled guides (`data/forum.json`), before → after
| Query | Before | After |
|---|---|---|
| `pose link` | "What information makes a technique question useful?" | that guide, plus "How to study a difficult transition with TKDflow" (which says "pose-link") |
| `poselink` | none | the same two |
| `playback slow` | none | "How to study a difficult transition with TKDflow" (`slow playback` found it before and still does) |
| `packet information` | none | "A checklist for reading an event information packet" |
| `ÉVENT PACKET` | none | that checklist and "Keep rules discussions specific to the event" |
| `checklist venue` (title word plus body word) | none | "A checklist for reading an event information packet" |
| `checklist zzzz` | none | none ("No topics match") |
| `tournament first` | none (Codex also saw 0 results in production for `?q=tournament+first`) | "Which tournament organization should I look at first?" |

### Tests (`tests/community-focus.test.mjs`, +2, real `forum.js` with the real guides as the feed)
- hyphens and spacing, word order, case and accents, and words split across title and body;
- every word required, with the no-match message and summary;
- clearing the search shows every topic again;
- a `?q=` search applied from the URL, with categories still filtering.

With the previous substring search, both tests fail. The full suite passes 673/673 in the scratch copy.

### Known limits
- As in the library, normalized words are matched inside the joined text, so a word can match across a word boundary or inside a longer word ("poselink" matches "pose link").
- Search still covers only the topics loaded so far; the wording says so.
- **Browser review** (Codex: 34 independent targeted checks, plus native Chrome with the real Community page code and a synthetic feed):
  - **Search across pages:** `playback slow` gave 0 of 50, then 0 of 100, then 1 when all 138 were loaded.
  - **Real guides:** `pose link` and `poselink` each gave the 2 real guides; `ÉVENT PACKET` 2; `checklist venue` 1; `checklist zzzz` 0; `tournament first` 1.
  - **Categories:** Competitions 1, Forms 0, All 1, with focus kept on the category button.
  - **Clear:** 138 topics.
  - **Slow page:** typing "discussion learning" during a 2-second page kept focus in search at 100.
  - **Failed last page:** it kept 100 topics and the query. After the fixture recovered, Retry reached 130 unique topics, with the query preserved.
  - **Layout and errors:** no overflow at 320 px, and 0 errors on the ordinary path.
- **Not tested:** a real screen reader and Safari.

## Batch 18 — Clear confirmation and other tabs (item 38)

### Change (`js/pages/school-planner.js`)
- **Counts as editing:** `editing()` now also counts an open Clear confirmation. Another tab's save then shows the existing conflict notice instead of being adopted silently under it.
- **The confirmation closes when the list changes:** a new `dismissClear()` closes an open Clear confirmation whenever this tab's list changes:
  - every in-tab change through `commit()` (add, rename, move, remove, Undo, import);
  - **Load the other version**;
  - **Keep this tab's version**;
  - adopting another tab's save.

  A later Yes can therefore only clear the version whose count the visitor just saw. Focus moves to the Clear button only if it was inside the confirmation.
- **Root review fix:** with only the `editing()` change, Load the other version adopted the 3 levels but left the "Clear all 2 levels" confirmation open. Because the tab then knew the new saved value, that stale Yes could save an empty list. The dismissal closes this path.
- **Yes:** it now closes the confirmation before clearing, so focus still lands in the add-level field.
- **A Yes that arrives anyway:** if a stale Yes is pressed while the conflict is unresolved, `store.save()` returns a conflict ("List cleared. Not saved yet: choose which version to keep above."), and the other tab's list stays saved.
- **Not added:** automatic recovery, deletion or any new flow. No storage or quota change (item 39 stays backlog).

### Tests (`tests/school-planner.test.mjs`, +3 page tests on the real page and store)
- **Clear open for 2 levels, another tab saves a third:**
  - the conflict is shown and the confirmation is unchanged;
  - a stale Yes leaves White, Yellow and Black saved, with the "Not saved yet" status;
  - Load the other version shows all three.
- **After Load the other version:**
  - the old confirmation is closed and 3 levels are saved;
  - a fresh Clear says "Clear all 3 levels"; Cancel keeps all 3, and Yes clears.
- **In this tab:** an Add, and then a rename, each close an open confirmation, and a reopened one counts 3.
- **Old code:**
  - with no fix, the first test fails;
  - with only the `editing()` line, the second and third fail ("the confirmation for the old 2 levels is closed", "an add closes the confirmation").
- **Full suite:** 687/687.

### Known limits
- **Notice wording:** the conflict notice's existing sentence ("What you are typing is kept; choose which version to keep.") is reused unchanged, although here the visitor may have been confirming rather than typing.
- **Keep this tab's version:** after a stale Yes, choosing it still replaces the other version, as for any conflict; it's an explicit choice offered by the notice.
- **Browser review** (Codex: native Chrome, two real tabs on an isolated local port, synthetic QA levels only):
  - **Old code:** the bug reproduced. A's "Clear 2" confirmation stayed open after B's 3 levels were adopted, with no conflict.
  - **Fixed, stale Yes:** with A's confirmation for 3 open and B adding a 4th, A shows the conflict and still 3 levels. A stale Yes gives the "Not saved yet" warning, and B, reloaded, still has 4 stored.
  - **Fixed, Load other:** Load the other version gave a fresh 4. Then, with Clear open for 4 and B adding a 5th, Load the other version closed the confirmation, showed 5 and focused the list heading. A fresh Clear counted 5; Cancel kept 5 and focused Clear.
  - **Same tab:** an Add (6) closed an open confirmation; so did a rename.
  - **Normal Clear:** a fresh Clear for 6 saved 0, which persisted after B reloaded, and focus went to the add field.
  - **Errors:** 0 console errors.
- **Not tested:** a real screen reader and Safari.

## Batch 19 — school planner recovers from a failed save (item 39)

### Change (`js/lib/school-planner.js`, `js/pages/school-planner.js`)
- **Two different problems, now handled differently:**
  - **Unreadable storage** (the storage getter or a read throws) stays memory-only. Its notice now describes the latest changes rather than the whole list: "This browser isn't letting the page read or save its storage, so your latest changes are kept only on this page and are lost if you reload or leave. A list saved here earlier may come back if the browser allows storage again. Use Export to keep a copy."
  - **A failed write** (for example a full quota) gets its own `write-failed` state.
- **What happens after a failed write:**
  - the last successful save stays the known version (`knownRaw`/`knownRev` change only after a successful `setItem`);
  - the next explicit change, or **Keep this tab's version**, tries to save again;
  - a successful retry stores every current edit and the status adds "Your earlier unsaved changes are now saved too.";
  - continued failure keeps the warning on every change.
- **Honest notice:** "Your latest changes couldn't be saved in this browser (it may be out of space). They're still on this page, and the page tries again when you make your next change. If you reload or leave now, the list last saved here comes back without them. Use Export to keep a copy." The status after a failed change adds "Not saved in this browser: see the notice above."
- **Unsaved changes are tracked on their own:** a `dirty` flag records that this tab holds changes that aren't stored, whatever the reason: a failed write, unreadable storage or a conflict.
  - Any save or Keep sets it until that write succeeds.
  - Only a successful write, the initial load or adopting the stored version (Load the other version) clears it.
  - So a later read failure, for example Load failing to read and the storage becoming unreadable, can't make the page forget unsaved edits.
  - Read-blocked storage stays memory-only as before.
  - **Review fix (root, notice):** when Load the other version failed to read, the page didn't refresh the storage notice, so it kept promising a retry ("tries again…") although unreadable storage won't retry. A failed Load now refreshes the notice.
  - **Review fix (root):** the first version derived "unsaved" only from the `write-failed` state. A failed read afterwards changed the state to `unavailable` and lost that meaning, so a later storage event could have adopted another tab's list over the edits.
- **Other tabs:** while this tab holds unsaved changes, another tab's save is routed to the existing conflict flow ("…while your latest changes here weren't saved. They're kept on this page; choose which version to keep.") instead of being adopted silently. A later save in this tab still reports the conflict and never overwrites the other tab. **Load the other version** and **Keep this tab's version** work as before, and either clears the warning once a version is stored.
- **Unchanged:** the Clear protection from PR 42, import, export, blocked and corrupt storage.

### Tests (`tests/school-planner.test.mjs`, +5; the page harness gains a `faulty` storage mode whose writes throw a quota error on demand)
- **Store:**
  - one failed write, then a save stores all current edits, and the older list is untouched in between;
  - continued failure stays warned and retries every time; Keep also retries and reports failure;
  - unreadable storage stays memory-only.
- **Store and another tab:** another tab's save after a failed write is news; the next save is a conflict and doesn't overwrite; Load adopts and clears the warning.
- **Store, unsaved marking:**
  - starting blocked and empty claims no unsaved edits, and a change kept only in memory is unsaved;
  - after a failed write, a failed Load read and a save that can't read both keep the edits marked unsaved;
  - only adopting the stored version clears it.
- **Messages:**
  - the failed-write notice names the latest changes, the older list returning on reload, the retry and Export;
  - the unreadable-storage notice names the latest changes held only on this page and an earlier list possibly returning, with no retry promised;
  - neither claims the whole list disappears.
- **Real page:**
  - one failed add warns while the list keeps the change; the next add saves all three and says so; continued failure stays warned;
  - another tab's save after a failed add shows the conflict with the unsaved levels kept, a further add doesn't overwrite, and both Keep and Load work and clear the warning.
- **Real page, a failed write and then a failed read:**
  - Load failing to read refreshes the notice to the unreadable-storage message; then reads recovering and another tab saving again: the conflict is shown, the unsaved levels are kept, and the other tab isn't overwritten;
  - an add whose save can't read, then another tab saving: the conflict, not a silent adopt, and an explicit Load still adopts;
  - a tab with no changes still adopts another tab's save.
- **Updated:** the existing quota assertion now expects `write-failed` rather than `unavailable`.
- **Eight spot mutants, all caught:** a failed Load not refreshing the notice, "unsaved" derived only from `write-failed`, and Load not clearing the flag, plus:
  - a write failure made permanent (the old behaviour);
  - `knownRaw` updated before the write;
  - an external change adopted despite unsaved edits;
  - no status warning;
  - the old "lasts only until reload" message for failed writes.

### Known limits
- **Retry trigger:** the retry happens on the next explicit change or Keep, not on a timer.
- **Same-instant saves:** two tabs saving at exactly the same moment remain the documented `localStorage` limit.
- **Browser review** (Codex: 31 independent planner checks, plus native Chrome on an isolated storage-fault fixture with synthetic levels only; results saved as root's `browser-qa.json` for batch 19):
  - **One failed write:** 2 visible and 1 stored, then the next change persisted all 3.
  - **Continued failure:** 5 visible and 3 stored; after unblocking, Enter persisted all 6 and kept focus in the field.
  - **Another tab, Keep:** a save in another tab after a failed write kept the local edits and showed the conflict; an explicit Keep wrote this tab's version.
  - **Failed Load:** after a failed write, a failed Load read showed the updated unreadable-storage message. When reads recovered, another tab's update kept the unsaved draft; an explicit Load adopted the other version and cleared the warning.
  - **Initial blocked read:** 0 levels shown while an older 10 were still stored. One local edit plus a recovered external change protected the draft; an explicit Load adopted 11.
  - **Clear confirmation:** the PR 42 protection kept 11 while 12 were stored, and a normal Clear still worked.
  - **Layout and errors:** at 320 px the notice fits its 285 px width, with no horizontal overflow; 0 console errors and 0 Supabase calls.
- **Not tested:** a real screen reader and Safari.

## Batch 21 — header Log out (item 41)

### Change (`js/site.js`, `styles.css`)
- **The button:** in member mode the header shows **Log out** beside **My profile**, on every page, on desktop and in the mobile menu (the same `#nav-account` slot). Guest, accounts-off and under-13 modes are unchanged, with no button.
- **No account client until the click:**
  - `site.js` still imports only the storage helpers;
  - the account service and the existing bounded `logout()` (`js/lib/auth-flows.js`, local scope, the same helper Profile uses) are loaded with dynamic `import()` only inside the click path;
  - a page view never calls `getAccountService()`;
  - before starting, the click re-reads the age store: a tab now known to be under 13 re-renders the header and starts nothing.
- **Busy:** one attempt at a time; repeated clicks or key presses return without a second attempt. The button gets `aria-disabled="true"` and "Logging out…" and keeps keyboard focus.
- **Success:** only when a strict read proves that no stored session remains: signed out here, or already signed out (for example by another tab). Then it loads a fresh `/`.
  - **The strict read:** used only for this proof. It returns present, absent or unknown, and never writes. The navbar keeps its cheap `hasStoredSession` check unchanged.
  - **Unknown (storage unreadable):** counts as still signed in, both for the bounded helper's check and afterwards. The header shows "Couldn't confirm that you're logged out in this browser. Try again." and never navigates.
  - **Review fix (root):** the first version used `hasStoredSession`, which returns false on a read error, so blocked storage could have looked like a completed logout.
- **Stale attempts:** each attempt is numbered.
  - A Back/Forward restore, or an under-13 result recorded on the page, invalidates the attempt in flight.
  - After each await (loading the service, loading the helper, the sign-out answer), an outdated attempt stops without signing out, navigating, writing the status or unlocking a newer attempt.
  - The age is re-checked after the service loads.
  - **Boundary:** a sign-out request already sent can't be recalled; its late answer is ignored and doesn't touch the current header.
- **Failure:** this covers sign-out errors with the session remaining, a timeout (bounded by the helper), and an unavailable service.
  - A status next to the button: "Couldn't log out. Try again." (a click retries), or "Log out isn't available right now. Reload this page and try again." The account service keeps an unavailable result for the page, so only a reload can retry it.
  - The button is usable again, focus stays on it, and there's no navigation.
- **Not done:** global or other-device sign-out, and any wider storage clearing.
- **Other tabs and Back:**
  - another tab signing out during an attempt re-renders to guest links through the existing storage watcher, and focus moves to the first header link as before; the attempt then ends on `/`;
  - a page restored by Back/Forward resets any "Logging out…";
  - the token-refresh and Back/Forward focus guards are unchanged.

### Tests
- **New `tests/header-logout.test.mjs` (14):** the real `site.js` in the mini DOM, with `account-service.js` replaced in this test process only by a fake that re-exports the real storage helpers and counts `getAccountService()`; the real `logout()` runs against synthetic clients.
  - page views (member, guest, under-13) never start the client, and only members see the button;
  - success: busy state and focus, one service call, the session gone, then `/`;
  - failure keeps the session and the visitor here with a retryable message; a retry makes a new attempt;
  - a hanging client times out as a failure; an unavailable service says so;
  - double clicks give one attempt;
  - an under-13 result recorded before the click starts nothing;
  - another tab signing out mid-attempt;
  - Back/Forward reset;
  - Back/Forward while the service loads, then a second click: the old attempt never signs out, navigates or unlocks, and the newer one completes;
  - a restored page with no new click ignores the old attempt;
  - an under-13 result while the service loads stops before signing out;
  - a sign-out already sent before Back/Forward: its late failure doesn't unlock or report over the newer attempt;
  - no session left: it goes home rather than reporting a failure;
  - session reads blocked during the attempt, with either a failed or a successful sign-out answer: no navigation, the synthetic record still stored, and a retryable "couldn't confirm" message with focus kept.
- **Updated deliberately:**
  - `site-nav.test.mjs` and the age-nav scenario now list header **links** (anchors) separately from the new button, and assert that members see Log out while under-13 tabs see no button;
  - the `age-nav.test.mjs` string ban is replaced: still no `initAccountService|createClient|signOut|removeItem|.clear(|setItem` in `site.js`, no static import of the account client or logout, and the only references are the two lazy loaders in the Log out path. Behaviour is proven by the new tests.
- **Eleven spot mutants caught:** using the cheap `hasStoredSession` as proof (the review fix), and no check after the sign-out answer, no age re-check after the service loads, Back/Forward not invalidating, and a failure reported with no session left, plus the first six:
  - success without confirming the session is gone;
  - the client started on page view;
  - no one-attempt guard;
  - no Back/Forward reset;
  - no age re-check;
  - native `disabled`, which drops focus.
- **One redundant guard:** removing the check right after the service loads is still covered by the check after the helper loads.
- **Full suite on this branch:** 708/708 (`npm run check`).

### Known limits
- The failure status sits just below the header button on desktop (absolutely positioned) and full-width in the mobile menu.
- **Mobile menu (≤768 px):** the account buttons (My profile, Log out, Log in, Join free) are at least 44 px high. Codex had measured 40 px at 320 px.
- **Browser review** (Codex: native Chrome with a synthetic fixture and a fake account service, never the real owner account; Codex's targeted header tests passed 31/31 independently):
  - **Page view:** the real `about.html` made 0 account-service calls before the click, with 0 errors. A synthetic member saw Log out beside My profile.
  - **Mobile menu:** at 320 and 390 px there was no horizontal overflow. The buttons first measured 40 px; after the mobile `min-height: 44px` change they measured 44 px.
  - **769 px, member header:** it first overflowed (`scrollWidth` 771 once fonts settled, Log out's right edge at 771.38 against 769, about 800 before fonts loaded). After the CSS fix in the 769–900 px rule it fits once settled: `scrollWidth` 769, with Log out's right edge at 745. A fast viewport-resize loop briefly animates the padding but leaves no steady overflow.
  - **Wider desktops:** no overflow at 820, 900 and 1280 px.
  - **Keyboard:** a failure keeps focus, keeps the session and allows a retry. Success goes to a fresh home page. An unavailable service shows the honest "reload" message.
  - **Under 13:** a tab known to be under 13, with a fake session key, shows About accounts and makes 0 service calls.
  - **Not counted as error-free:** earlier forms and home page runs with a fake client showed expected fixture-only errors (an auth method the fake didn't implement).
- **Not tested:** a real screen reader and Safari.

## Batch 20 — no tool credits on public pages (item 40)

### Change
- **Lesson pages:** the `.voice-credit` paragraph is removed from all 23. No CSS rule used it.
- **Companions:** the generator's `VOICE` sentence is now "Instructions are the text of the lesson's spoken guidance.", and all 23 companions are regenerated. The generator's `--check` drift mode keeps them matching.
- **Narration manifests (`data/narration/*.json`):** `provider`, `voice` and `model` are removed. Nothing at runtime reads them. Audio sources, duration, chapters, cues and effects are byte-for-byte the same (each manifest loses exactly 3 lines).
- **Catalog:** `data/narration/catalog.json` moves to `docs/narration/catalog.json`, which is excluded from deployment. The tests and `scripts/assemble-narration.py` now read and write it there. The assembler no longer writes generation metadata into public manifests.
- **`js/animation/avatar.js`:** the comment says "the existing texture atlas" without the tool name.
- **Provenance kept:** `docs/narration/PROVENANCE.md` (development only) records the voice, models, effects, the texture record (`docs/animation-release-2026-11-16.md`) and the licence basis.
- **Unchanged:**
  - all 74 media files (narration, effects, animation, form images): SHA-256 checked before and after;
  - vendor code and its required notices;
  - Git history;
  - photo and binary metadata.

### Tests
- **New `site.test.mjs` guard:**
  - every deployable text file (not a dot-file, not excluded by `.vercelignore`, not vendor) is scanned for ElevenLabs, `eleven_*` model ids, Nano Banana, "stock voice", text-to-speech, "voice was generated", "generated with" and `voice-credit`;
  - the catalog is not deployed, and provenance remains in docs;
  - the companion generator can't add the credit back.
- **`narration.test.mjs`:** public manifests must have no `provider`/`voice`/`model`; the catalog is read from docs, and audio hashes are still checked.
- **`technique-accuracy.test.mjs`:** reads the catalog from docs.
- **Full suite on this branch:** 709/709 (`npm run check`).

### Licence basis
- **ElevenLabs' help centre** (read 18 November 2026): audio generated during a subscription keeps a commercial licence, while "audio generated outside of a subscription will always require attribution".
- **The owner confirmed on 18 November 2026** that the account was on a paid subscription when the audio was generated, and still is. This unblocked the batch.
- **No independent check:** one read-only subscription API check returned HTTP 500, a retry by root timed out, and a narrow invoice search returned nothing. So the docs record the owner's statement and don't claim billing proof. The full note is in `docs/narration/PROVENANCE.md`, which isn't deployed.

### Known limits
- **Review** (Codex: 30 targeted narration and site tests; native in-app browser on a local build):
  - **Data:** all 23 runtime narration objects are identical to `HEAD` once the 3 descriptive fields are removed, and the moved catalog is byte-identical.
  - **Taegeuk Il Jang companion:** 20 poses, its sources, the neutral instruction line, no tool credit, 0 errors.
  - **Taegeuk Il Jang lesson:** the voice and effects controls are available, and there's no `.voice-credit`.
  - **Playback:** Play brought both media to ready state 4 and playing. Time went from 0.18 s to 8.44 s, then both paused, the caption updated, and there were 0 console errors.
  - **Media:** no audio bytes changed, and no API generation happened.
- **Not tested:** a real screen reader and Safari.

## Batch 22 — compare two forms (item 42)

### Change
- **New `/compare.html`** (in `layout/pages.json` and the sitemap, `data-page="forms"`), with `js/pages/compare.js`, `js/lib/form-compare.js` and `css/compare.css`.
- **Choosing forms:** two labelled selects, grouped by style, plus Swap and **Copy comparison link**. If copying fails, a selectable, focused field shows the address.
- **The address:** the pair lives in it (`?a=<id>&b=<id>`), so it can be shared.
  - Unknown, overlong or repeated values and the same form twice are reported in plain words, and the address is rewritten to what is shown, without adding a history entry.
  - A choice adds a history entry, and Back restores the pair.
  - The selects are never rebuilt, so focus stays on them.
- **Each card:**
  - the approved thumbnail and its alt text, name, Korean name and meaning;
  - the form's existing catalogue description;
  - style, series, **Typical belt / level** (the existing `beltLabel`, such as "Yellow Belt", "10th Gup" or a black-belt rank, plus "(typical)"; no derived mapping), **Reference counts** and **Study poses**;
  - **Review fix (root):** the label was "Typical belt colour", which was wrong for entries such as Chon-Ji's "10th Gup" or black-belt ranks.
  - links to the lesson, the read-and-print companion and the library entry.
- **Not shown:** difficulty (not comparable across styles) and review status, at the owner's direction.
- **Shared line:** a neutral one appears only when both forms share a series or style ("Both are in the …"). There's no ranking or equivalence.
- **Counts note:** one line explains that study poses are the lesson's own steps (including the ready and return positions) while reference counts follow the form's reference, so the numbers differ. It links to Start here, "How lessons count poses" (`#sh-reading`). It's hidden when the counts file isn't available.
- **Copy results:** each copy is numbered. A copy that finishes after a newer copy, or after a different pair is chosen or restored by Back, shows no stale success or fallback and doesn't move focus.
- **School note:** "Belt colours and order vary by style and school; these are typical placements, not equivalents", linking to Start here and My school's forms.
- **Counts:** `data/form-facts.json` (study poses and reference counts) is generated by `scripts/build-companions.mjs` from the same lesson data as the companions, and kept current by its `--check` drift mode. Without it, the cards show the catalogue facts only.
- **Where it's linked:** a Forms library hero line, a Start here "Choose a form" item and a Community resource post (kind "Study guide"). The header is unchanged, and there's no per-card compare link for now.

### Tests (`tests/compare.test.mjs`, 11)
- **Address parsing:** valid pairs; the same form twice; a lone second form; unknown, traversal, case and overlong values; repeated parameters; extra parameters; canonical form.
- **Counts:** the generated counts equal what each published companion states (all 23); shape checks.
- **Card facts:** the facts and their order (no difficulty or review rows); catalogue-only facts without the counts; neutral shared lines only within a series or style.
- **Real page:**
  - a shared address shows the right facts, thumbnail, links (all existing files) and note;
  - choosing and swapping update the address with focus kept, and Back restores;
  - mistyped addresses are reported and rewritten;
  - copy success and the selectable fallback;
  - a missing counts file is tolerated;
  - each card's description, and the counts note with its link (hidden without counts);
  - with a deferred clipboard: a success or failure after the pair changes shows nothing and keeps focus on the select, and an older failing copy after a newer successful one leaves the newer result.
- **Discoverability:** library, Start here, Community and the sitemap link to it; the header doesn't.
- **Five spot mutants caught:** no stale-copy guard, plus:
  - no address rewrite;
  - difficulty shown;
  - no copy fallback;
  - the same form shown twice.

  One was equivalent: rebuilding the options inside the same select keeps focus.
- **Full suite on this branch:** 720/720 (`npm run check`).

### Known limits
- **Browser review** (Codex: native Chrome with a fake clipboard; the real clipboard was untouched):
  - **Passed:** the address pair, the selects, Swap and Back; unknown and duplicate values rewritten to the canonical address; a fake copy succeeding, and a denied copy showing the selected, focused address; a delayed old copy after a pair change ignored.
  - **Layout:** 320, 390, 820 and 1280 px with no overflow, 44 px tool controls, thumbnails loaded, 0 errors.
  - **Review fix (layout):** at 1280×1000 the full-size hero and full-width thumbnails pushed almost every fact below the fold, with only "Style" starting at about 980 px.
    - This page now has its own compact hero (28/24 px padding, a smaller heading). Other pages' heroes are unchanged.
    - Desktop thumbnails are 190 px high with the whole figure visible (`object-fit: contain`); phones keep the natural 16:9 ratio. The approved art is unchanged.
    - **Re-measured by Codex:**
      - at 1280×900 the hero is 193.5 px, the thumbnails 190 px, all facts end at 869 px and the links sit near 915 px (before, only "Style" began near 980 px);
      - at 320 px there's no overflow, the thumbnails keep their natural 16:9 ratio, and the four tool controls are 44 px;
      - Codex independently ran all 11 comparison tests, which passed.
- **Not tested:** a real screen reader and Safari.

## Batch 23 — search and shareable filters for learning resources (item 43)

### Change (`community.html`, `js/pages/community.js` resources part only, new `js/lib/community-resources.js`)
- **Search:** a "Search learning resources" field. Every typed word must appear in a resource's title, body, kind or tags, compared with the catalogue's `normalize()`, as in the library and discussions searches.
- **Category in the address:** `?view=resources&category=<slug>` (for example `forms-curriculum`), with the search in `&q=`.
  - A category click adds a history entry, typing replaces it, and Back/Forward restore both.
  - An unknown category in a shared link shows everything and says so. With a search active it says all categories are searched.
- **Typing before the data arrives:** only the address changes. The first render, with every category and its count, waits until the resources have loaded, and the typed search, focus and address are kept.
  - **Review fix (root):** an early render had built an All-only category list that never got rebuilt.
- **Buttons:** the category buttons are built once and then updated in place, with `aria-pressed` and counts that follow the search, so focus stays on them.
- **Summary:** "3 of 10 resources in Competitions match "guide"."; the plain count with no filter.
- **Clearing:** an empty state for searches with no match. **Show all resources** clears both filters and returns focus to the search field.
- **Unchanged:**
  - the discussions view: `forum.js` still handles it, and the resources code fetches and listens only in the resources view;
  - the public, stateless guide read and the age rules;
  - the card markup.
- **Not added:** a copy button for now; the address is shareable.

### Tests (`tests/community-resources.test.mjs`, 9, real `community.js` on the real `community.html` and `data/community.json`)
- slugs, address state (unknown category, long search clipped) and the all-word search on the real posts;
- the default view with counts;
- a category click: the address, the same button keeping focus, `aria-pressed`, and Back restoring category and search;
- typing: the address, matching titles, the summary and counts;
- no match, then clearing;
- an unknown category, with and without a search;
- typing while the data fetch is held back: the address updates, no partial category list is built, and on arrival every category appears with search-aware counts, the search text and focus kept;
- the discussions view: no resources fetch, and typing does nothing there.
- **Seven spot mutants caught:** rendering before the data arrives, plus:
  - buttons rebuilt (focus lost);
  - no address update;
  - no Back restore;
  - search ignoring kind and tags;
  - any word instead of every word;
  - Clear not returning focus.
- **Full suite on this branch:** 729/729 (`npm run check`).

### Known limits
- **Browser review** (Codex, native Chrome, synthetic local data):
  - **Typing while the data was held back:** "print read" updated the address and built no partial category buttons. After release, all 5 category buttons showed the right search counts, the field kept its text and focus, and there was one companion result.
  - **Passed:** the category filter, the empty state, keyboard Enter and focus, Back/Forward, and Clear (back to 10 resources, focus in search); 0 errors.
  - **Review fix (field):** `#resources-q` was a tiny unstyled 185.5×23.5 px input on desktop. It now reuses the site's `search-bar` (search icon, full available width, the existing focus ring), with a scoped minimum height of 44 px.
  - **Review fix (grammar):** the summary said "1 of 10 resources match…"; it now says "1 of 10 resources matches…" when one is shown.
  - **Review fix (phone order, real public page):** at 390 px the three discussion-guide cards above the resources grew to 873 px, so `#resources-q` sat at y=1623, nearly two screens down, even for a shared filtered link.
    - The guide section ("A good place to start", now headed **Discussion guides**) moved below the resources, filters and list in the resources pane. Its IDs, public guide reading and links are unchanged, and so is the discussions pane.
    - The search wrapper measured 46 px but the input itself 34 px, so `#resources-q` now has a scoped 44 px minimum height too.
    - **Re-measured by Codex:**
      - at 390 px with the page at the top, the search input is at y=709, 44 px high and 308 px wide (it was at y=1623), and the discussion guides are below the resource feed;
      - at 320, 390, 820 and 1280 px the input is 44 px, full available width, with no horizontal overflow;
      - an unknown category with `q=print` says all categories are searched and "3 of 10 resources match";
      - "print read" gives one companion with the singular "matches";
      - 0 console errors;
      - Codex independently ran the 9 resource tests, which passed.
- **Not tested:** a real screen reader and Safari.

## Batch 24 — 2027 ATU National Championships, dates TBA (item 44)

### Change (`data/competitions.json` only)
- **New listing:** `atu-atu-national-championships-2027`.
  - **Dates:** `dateStatus: "tba"`, with `start`/`end` null and year 2027.
  - **Place:** Duluth, GA, United States, on `America/New_York` time, marked `timezoneEstimated` because it comes from the location, as for 2026.
  - **Classification:** national, Championship, `major: true`, scheduled.
  - **Source:** the official homepage as both `source` and `eventUrl`, `lastChecked` 2026-11-18.
  - **`eventTypes: []`:** the page lists competition events, but alongside 2026 schedule links, so none are claimed.
  - **Notes:** the 2027 edition is announced at the Gas South Convention Center, and its dates are pending confirmation because the official pages disagree (May 28–29 versus May 27, with the schedule still showing 2026).
- **2026 record:** its dates are unchanged. Its stale sentence "No official 2027 edition/date announcement was located." is replaced with "The 2027 edition is listed separately."
- **Coverage note:** "441 listings…". `lastReviewed` stays 2026-11-16; only this record was rechecked.
- **Calendar export:** none for this listing. `canExportEvent` already requires confirmed dates.

### Tests (`tests/events.test.mjs`, +2)
- **The new listing:**
  - it passes the record rules, has TBA dates and is "announced";
  - it can't be exported to a calendar;
  - the source host is official;
  - the notes name both conflicting dates and "pending confirmation", and no event types are claimed;
  - it's found under ATU 2027, Dates TBA, a "duluth ATU" search and the major filter, but not under May 2027.
- **The 2026 record:** dates unchanged, and the stale sentence is gone.
- **Coverage note:** its count equals the number of listings, a consistency check rather than a fixed snapshot.
- **Full suite on this branch:** 731/731 (`npm run check`); the coverage count matches the 441 listings.

### Known limits
- The dates will need updating once ATU's pages agree. Root verified that the existing weekly events review (Sundays, 19:00 Eastern) is active and keeps TBA announcements and source conflicts under review, so no new automation or updater code was added.
- **Browser review** (Codex, the local events page on this branch):
  - **Filtered by ATU, 2027, major and all statuses:** exactly one ATU National Championships card. It shows MAJOR EVENT, Duluth, 2027 dates TBA, the source-conflict note and "Checked Nov 18", and links to the official `https://www.joinatu.com/`.
  - **No calendar export:** no buttons, download or calendar link on the card.
  - 0 console errors.
  - Codex independently ran the events tests, which passed 20/20.
- **Not tested:** a real screen reader and Safari.

## Batch 25 — first-tournament checklist recovers from failed saves (item 45)

### Change (`js/lib/tournament-guide.js`, `js/pages/first-tournament.js`)
- **States:**
  - `ok`;
  - `unavailable`: storage can't be read or used right now; the next tick tries again;
  - `write-failed`: the last save failed; the next tick tries again;
  - `corrupt`: the saved data couldn't be read when the page loaded, so the checklist started empty;
  - `damaged`: the saved data became unreadable after the page loaded. This tab keeps showing its ticks, with its own notice ("…became unreadable, so your latest tick wasn't saved. Your ticks are still shown here; ticking or unticking an item replaces the unreadable data.");
  - `unsaved`: another tab's readable save was adopted, but some ticks here still aren't stored ("Some of your latest ticks aren't saved in this browser yet…"). No cause is guessed.
  - In `corrupt` and `damaged`, unreadable data is replaced only by the visitor's next tick, after the notice has said so.
- **Unsaved views:** views changed here but not yet stored are tracked. A successful save stores all of them and clears the warning.
- **Merge on write:** each save re-reads what's stored and writes back only the views this tab changed, so another tab's ticks for **other** views are kept. For the **same** view the latest save wins; this isn't described as keeping every change.
- **Unreadable data:**
  - data that became unreadable after the page loaded is never overwritten unannounced: the save is skipped and the notice changes to the unreadable message;
  - the next tick replaces it, writing every view this tab knows.
- **Another tab's update:** a `storage` event adopts the other tab's views but keeps this tab's unsaved ones. Unreadable updates are ignored. (`localStorage.clear()` elsewhere is treated as an empty update.)
  - When readable data returns with nothing unsaved here, the warning clears to the normal notice. With unsaved ticks here it becomes `unsaved`, or stays `write-failed` if the last write failed.
  - **Review fix (root):** the first version kept a stale "unreadable" or "unavailable" warning after recovery, and used the "started empty" wording for data damaged after load.
- **Best effort:** saving re-reads, merges and writes, so a **different** view already stored by another tab is kept. Two truly simultaneous saves can still end with whichever was written last. No locking is added.
- **Honest notices:**
  - **Failed write:** "Your latest ticks couldn't be saved in this browser (it may be out of space). They're still shown here, and the page tries again when you tick or untick an item. If you reload or leave now, the ticks last saved here come back without them."
  - **Unavailable storage:** names the latest ticks kept only on this page, and earlier saved ticks possibly coming back.
- **Unchanged:** the Reset confirmation, which still clears only the current view and doesn't promise to keep other changes made to that view elsewhere.

### Tests (`tests/first-tournament.test.mjs`, +8; two existing assertions updated to the new meaning)
- **Recovery:** one failed save, then a tick stores every unsaved view, with the older saved ticks untouched in between; a failed read while saving is retried.
- **Two stale tabs:** both keep their different views, and the latest save wins for the same view.
- **Another tab's update:** adopted for saved views, kept back for unsaved ones; unreadable updates are ignored.
- **Data damaged after load:** left as it is, with the `damaged` notice (not "started empty"); the next tick replaces it with every known view.
- **Recovery:** readable data coming back clears the warning (clean), or reports `unsaved` while keeping the unsaved view (dirty); the next tick then stores everything.
- **Real page, both recovery cases:**
  - unreadable at load, then another tab's readable save: the warning clears and the other tab's tick shows;
  - ok, damaged, a refused tick, then another tab's readable save: the `unsaved` notice and the tick kept, and the next tick stores all.
- **Real `first-tournament.js` page with injected write faults:** the honest notice after a failed tick; the next tick saves both; another tab's update keeps this tab's unsaved ticks.
- **Six spot mutants caught:** no warning recovery, plus:
  - a permanent failure;
  - no merge;
  - another tab replacing unsaved views;
  - unreadable data overwritten unannounced;
  - unsaved views forgotten after a failure.
- **Found while testing:** replacing unreadable data with only the unsaved views would have dropped earlier saved views. It now writes every view this tab knows.
- **Full suite on this branch:** 739/739 (`npm run check`).

### Known limits
- **Simultaneous saves:** two truly simultaneous saves can still end with whichever was written last; there's no locking.
- **Browser review** (Codex, native Chrome, two tabs on a local storage-fault fixture; screenshot and JSON in Codex's batch-25 notes):
  - **A failed write**, then the next tick stores both ticks.
  - **Separate views** (AAU forms and USAT sparring) keep both tabs' contexts.
  - **Damaged data** isn't overwritten by the first tick.
  - **Another tab's readable save while AAU ticks were unsaved:** the unsaved ticks are kept, the notice says they're unsaved, and the next tick stores everything.
  - **A blocked read**, then storage allowed: the next tick recovers.
  - **The same view in two tabs:** the latest save updates the other tab.
  - 0 app errors in both tabs.
  - Codex independently ran `tests/first-tournament.test.mjs`, which passed 20/20.
- **Not tested:** a physical phone, Safari and a screen reader.

## Batch 31 — Log out is reported only when it's proven (item 52)

### Change
- **One strict, SDK-free proof** (`js/lib/account-service.js`):
  - `storedSessionState()` returns `present`, `absent`, or `unknown` when the stored session can't be read (no key, no storage, a throwing getter). It only reads.
  - `logoutVerdict(state, kind)` counts a Log out as done only on `absent`.
  - `LOGOUT_MESSAGES` holds the shared wording:
    - "Couldn’t confirm that you’re logged out in this browser. Try again."
    - "Log out isn’t available right now. Reload this page and try again."
    - "Couldn’t log out. Try again."
  - The navbar's cheap `hasStoredSession()` is unchanged.
- **Header** (`js/site.js`): it now uses the shared helper and verdict instead of its private copy. Its behaviour and messages are unchanged; batch 21's tests pass as they were.
- **Profile** (`js/pages/profile.js`):
  - **Log out loads the home page only when the stored session is confirmed absent.** Otherwise the page stays, with the header's wording.
  - **The identity guard** (root review correction): the attempt keeps the page's `SessionGuard` token (user and generation). Its answer is used only if the identity is unchanged, or changed exactly once, to signed out (the expected effect of this sign-out).
    - After any other change it is dropped silently, with no redirect and no message, and the auth listener's state stands. Examples: signed out then back in as the same account; another account; another account then signed out.
    - This protects the page and its redirect from a stale answer. It can't recall a sign-out request the SDK has already started.
  - **The age guard:** an under-13 result recorded in this tab meanwhile shows the public route, with no redirect.
  - **After the page's session ends** (this tab or another), private fields are hidden at once, as before. The notice says only what the stored state confirms:
    - **absent:** "You have been signed out";
    - **a stored copy remains:** "You’re signed out on this page. This browser may still keep your sign-in. Reload this page to check.";
    - **unknown:** "You’re signed out on this page. Couldn’t confirm that you’re logged out in this browser. Reload this page to check."
  - **The listener's age guard:** in an under-13 tab it shows the public route, never an account state.
  - **The held-account paths:** their background sign-outs use the strict proof too. Nothing visible changes.
- **Password recovery** (`js/pages/auth.js`): "signed out" now needs the strict proof. Otherwise it says "Password updated, but we couldn’t confirm that you’re logged out in this browser. Sign in with your new password."
- **Never:**
  - page code removing a stored key;
  - a global sign-out;
  - an automatic retry.
  - Only the SDK's local `signOut` is used.
- **Unchanged:**
  - the auth page's under-13 background sign-out (`becomeIneligible`), whose result isn't shown;
  - every other auth flow.
- **Test helper:** `tests/helpers/mini-dom.mjs` gains `after()`, which the profile's school picker uses.

### Tests (`tests/profile-logout.test.mjs`, new, 11)
- **The proof itself:** present, absent, and unknown for a throwing getter, no storage or a bad config, with no writes. The verdict never treats unknown as signed out.
- **The real `profile.js` on the real `profile.html`** (a fake client through the same module-substitution pattern as the header tests; synthetic session text, no network):
  - **Success:** a redirect to `/`; only `scope: 'local'`; no key removed by page code.
  - **Failure:** it stays, with "Couldn’t log out. Try again.", and the profile is still shown.
  - **Unreadable storage:** no redirect; private fields hidden; "You’re signed out on this page" with the unknown text; never "You have been signed out".
  - **A stored copy left behind:** no redirect; the "may still keep" text.
  - **Another tab's sign-out:** "You have been signed out" only when the stored copy is gone.
  - **Guards** (a deferred sign-out):
    - **This page's own sign-out seen by the listener before the answer:** private fields hidden at once, then the home page loads.
    - **Signed out and back in as the same account:** no redirect, no message, and the profile is shown again.
    - **Another account, and another account then signed out:** no redirect and no message.
    - **An under-13 result during the attempt:** no redirect, and the public route.
- **Source and unit guards:**
  - the header, profile and recovery all use the strict proof;
  - no private copy of the proof remains;
  - the profile no longer uses `hasStoredSession`;
  - none of the three removes keys or signs out globally;
  - `updatePassword` reports `signedOut` only when absence is proven.
- **Twelve spot mutants caught:**
  - redirecting on unknown;
  - the listener always saying "signed out";
  - the previous id-only guard (caught by same-account re-login and another account then signed out);
  - accepting any change to signed out;
  - accepting only an unchanged identity (the page's own sign-out then fails);
  - no identity check;
  - no age guard in Log out;
  - no age guard in the listener;
  - unreadable storage counted as absent;
  - the verdict trusting unknown;
  - the header redirecting without proof;
  - recovery back on the cheap check.
- **Full suite on this branch:** 750/750 (`npm run check`), and `git diff --check` is clean.

### Known limits
- **Before the change (Codex):** in native Chrome, the synthetic fixture reproduced both issues, with 0 errors:
  - with a stored copy kept, the page said "You have been signed out";
  - with storage reads blocked, Log out redirected to `/`.
- **After the change** (Codex, native Chrome, the same synthetic fixture on port 9012, no live account; `browser-qa.json` and a screenshot in Codex's batch-31 notes):
  - **Blocked storage:** Log out stays on the page; the profile hides its fields and says it couldn't confirm the sign-out.
  - **An SDK sign-out failure:** it stays; the profile fields stay, with "Couldn’t log out. Try again."
  - **A sign-out event with the stored copy kept:** the fields are hidden, and the notice says this browser may still keep the sign-in.
  - **The page's own SDK sign-out with the stored copy left behind (remove-fails):** the same honest notice, and no redirect.
  - **A confirmed sign-out:** a redirect to `/`.
  - 0 console errors.
  - Codex independently ran `tests/profile-logout.test.mjs` and `tests/header-logout.test.mjs`, which passed 25/25, including the generation cases.
- **Not tested:** a physical phone, Safari and a screen reader.

## Batch 26 — Community Refresh recovery and an honest submissions limit (items 46, 47)

### Change
- **`js/lib/account-service.js`:** the shared start-up now comes from a small `createServiceCache(start)`.
  - `getAccountService()` is unchanged in behaviour.
  - The new `retryAccountService()` restarts **only** an attempt that has finished as `unavailable`. An attempt in progress, a ready client or switched-off accounts are returned unchanged, so a healthy client is never created twice, and simultaneous retries share one attempt.
- **Community** (`js/lib/community-connection.js`, `js/pages/forum.js`): after an unavailable start-up, the next start (**Refresh discussions**) uses the retry. The notice now says "…could not be connected. Use Refresh discussions to try again." Under-13 public reading still never calls either.
- **Your submissions** (`js/lib/discussions.js`, `js/pages/forum.js`): each list requests 31 and shows at most 30.
  - A line appears only for the list actually cut short: "Showing your 30 most recent unpublished topics.", "…replies.", or both.
  - Newest-first order and the reply parent links are unchanged.
- **Not changed:** the database.

### Tests
- **New `tests/account-retry.test.mjs` (2):**
  - an unavailable result is retried once, the retry is shared and becomes the cached result;
  - ready, disabled and in-progress attempts are never restarted.
- **`tests/community-focus.test.mjs` (+2, real `forum.js`):**
  - an unavailable start-up, then Refresh, retries once and loads the member feed; a healthy service is reused;
  - submissions with 31+2, 2+31, 31+31 and 30+30 items: the right line, or none, and the right number of cards.
- **Test fakes:** the two test-only account-service fakes now export `retryAccountService`.
- **Spot mutants:**
  - **Caught (three):** retry restarting a ready client; Refresh never retrying; both lists claimed when one is cut.
  - **Equivalent (one):** a guard against a stale attempt's result, which can't happen because only settled attempts are replaced. It's kept as defence.
- **Full suite on this branch:** 754/754 (`npm run check`).
- **Rebase note:** batch 23's committed `css/preview.css` had gained lines after `.forum-more`, so this branch's copy of the patch appends the same `.submissions-limit` rule after them; nothing else changed. It applied unchanged on top of batch 31.

### Known limits
- **Browser review** (Codex, native Chrome, synthetic fake-service fixture on port 9015; JSON and a screenshot in Codex's batch-26 notes):
  - **Refresh recovery:**
    - The start-up is unavailable: attempt 1.
    - Making the fake service healthy doesn't retry by itself.
    - Refresh makes attempt 2, which recovers the feed and the private controls.
    - A later Refresh stays at 2 attempts, because the healthy client is reused.
  - **Submissions limit:**
    - 31 topics and 2 replies give 32 cards and the topics-only notice.
    - 2 topics and 31 replies give 32 cards and the replies-only notice.
    - 31 and 31 give 60 cards and the notice for both.
    - 30 and 30 give 60 cards and no notice.
  - **Phone width:** no overflow at 390 px.
  - **Under 13:**
    - a simulated cached return hides the private controls;
    - a reload in a known under-13 tab makes zero account-service attempts.
  - 0 app errors.
  - Codex independently ran `tests/account-retry.test.mjs` and `tests/community-focus.test.mjs`, which passed 25/25.
- **Not tested:** a physical phone, Safari and a screen reader.
- **Not wired to the retry yet:** the header Log out and the learning service.

## Batch 27 — keep unsent replies while switching topics (item 48)

### Change (`js/pages/forum.js` only)
- **Page memory only:** a map keyed by account and topic holds unsent reply text. It's never written to browser storage or sent anywhere, so it doesn't survive a reload or a closed page.
  - It's saved on each input in the reply field.
  - It's restored when the same account opens the same topic again, including by Back/Forward, with the note "Your unsent reply is kept while this page stays open."
  - The consent checkbox is never restored, so the visitor confirms again before sending.
- **Typing while a submission is sending** (root review fix): the fields stay editable while the request is in flight, and the old success path reset the whole form, erasing anything typed meanwhile.
  - The page now keeps the values that were sent. On a successful response for the current account, it clears only the fields that still equal what was sent.
  - Newer text stays where it is, with its caret and focus, and stays in the reply draft map. A new topic's category stays with its unsent text.
  - The consent box is always cleared.
  - The message then says: "Your earlier version was submitted for moderation. What you typed while it was sending is still here and has not been sent." An unchanged success shows the usual "Submitted for moderation…".
  - The same rule covers the new-topic composer (title, body, category). No topic drafts are stored.
  - **Topic switched while sending:** for a reply, the form now on the page for that topic is the one checked, so a copy restored from the draft is cleared once that exact text is saved. A reply's draft is removed only if it still equals the sent text.
  - **Another topic open when the answer arrives** (root review fix): the message names the discussion instead of saying "still here".
    - With text typed while sending: "Your reply to “…” was submitted for moderation. What you typed while it was sending is kept as an unsent reply for that discussion."
    - With nothing new: "Your reply to “…” was submitted for moderation. Your username will appear with the text after a moderator approves it."
    - The open topic's field is untouched, and the newer text comes back when that discussion is reopened.
  - **Account changed while sending:** the existing guard means a late response changes nothing.
- **One submission at a time per account and target** (root review; reproduced first): during a slow reply, switching topics and back rebuilt that topic's form, restored the sent text, and left Submit enabled. A second submit sent a second request (the harness counted 2).
  - Now a form rebuilt for the same account and topic while its earlier submission is in flight stays locked: Submit is disabled, with "Your earlier submission is still sending.", and a submit attempt sends nothing.
  - When the earlier request settles, success or failure, the form now on the page is unlocked. On success the copy of what was saved is cleared; on failure the text is kept.
  - Other topics' forms and drafts aren't affected. The same lock covers the new-topic composer if it's rebuilt while a topic is sending.
  - **Cross-account correction (root review):** when an earlier request settles, it always releases its own lock, even if stale. The forms on the page then show the **current** account's state for that target.
    - A late answer for account A can't unlock account B's pending reply to the same topic.
    - After signing out and back in as A while A's old reply is sending, the new form stays locked until it settles, then unlocks without bringing the old text back or showing a message.
  - **Limit:** this is page-level only; nothing stops two tabs from each sending once.
- **Cleared:**
  - that topic's draft once its exact text is saved;
  - every draft whenever private state is cleared: sign-in, sign-out (even back into the same account), an account switch, or switching to public reading.
- **Kept:** a failed send keeps the draft.
- **Unchanged:** the server and public mode (which has no composer).

### Tests (`tests/community-focus.test.mjs`, +11, real `forum.js`, synthetic accounts)
- **Switching:** type in topic A; topic B shows nothing; back in A the text returns with consent unchecked and the note shown; Back/Forward keep it; no draft is written to browser storage.
- **Sending and accounts:** a failed send keeps the draft, a successful send clears it, and another account never sees it.
- **Same account:** signing out and back in as the same account clears drafts.
- **Typing while sending** (deferred submission RPC in the harness):
  - **Reply edited while sending:** after success the newer text, focus and caret stay; consent is cleared; the "earlier version" message shows. After switching topics and back, the newer text is restored as a draft.
  - **Reply unchanged while sending:** the field, the draft and the note are cleared, with the usual message.
  - **Reply sent, then topics switched:** the restored copy is cleared on success; another topic's draft is untouched.
  - **New topic:** a body edited while sending stays, with its category, while the sent title is cleared; an unchanged one returns every field to its default.
  - **An account change while sending:** no success message, and the new account sees no draft.
  - **A form rebuilt while its reply is sending** (success and failure): it's locked with the note; a submit attempt makes no second request (1 counted); it unlocks when the reply settles; the text is cleared on success and kept on failure; another topic's draft is kept.
  - **Two accounts, two pending replies to one topic** (separate deferred answers): A's late answer leaves B's form busy, with no message and no duplicate request; B's own answer releases it.
  - **Signed out and back in as the same account while sending:** locked until it settles, then released; the old text never returns.
  - **Another topic opened before the answer:** the discussion is named; the open topic's text is untouched; the newer text is restored on reopening; an unchanged send keeps nothing.
- **`tests/community-public.test.mjs`:** two source guards that pin the gated reply composer now name the new `withReplyDraft(composer(…))` expression. It's still gated by `controls().composer`.
- **Spot mutants:**
  - **Caught (twenty):**
    - no clear on an auth change (by the same-account test);
    - the draft kept after a successful send;
    - no restore;
    - clearing every field unconditionally on success;
    - deleting the draft unconditionally;
    - checking only the submitted form;
    - keeping consent;
    - resetting the category despite newer text;
    - no account guard on the response;
    - always showing the usual message;
    - treating the topic as always open;
    - clearing through another topic's form;
    - no in-flight check on submit;
    - a rebuilt form left unlocked;
    - a rebuilt form never unlocked;
    - one lock for every topic;
    - a lock never released;
    - an unconditional unlock (the previous version);
    - a stale lock not released;
    - only the submitted form updated.
  - **Equivalent (one):** keying drafts by account is covered by clearing on every auth change, and is kept as defence.
- **Full suite on this branch (with batch 30):** 773/773 (`npm run check`).

### Known limits
- **Browser review** (Codex, native Chrome, synthetic fixture on port 9015, no remote calls; JSON and a screenshot in Codex's batch-27-30 notes):
  - **Drafts:** a per-topic draft is restored with consent unchecked; a failed send keeps the body.
  - **Typing during a slow successful reply:** the newer text stays and consent is cleared.
  - **A reply form reopened while its reply is pending:** it's locked, and a failure unlocks it.
  - **A successful reply after moving to another topic:** the message names the original topic, and the current topic's draft is left alone.
  - **An unchanged success:** the draft is cleared.
  - **Two accounts:** A's late answer leaves B's pending reply to the same topic locked, with no stale message. B's failure unlocks it and keeps the body.
  - **An account switch:** drafts are cleared.
  - **New topic** (isolated run): success clears the sent title, keeps the newer body and category, and clears consent. An earlier slow manual run hit the 8 s request timeout and kept the text, as expected.
  - **Phone width:** the pending note has no overflow at 390 px.
  - 0 console errors.
  - Codex independently ran `tests/community-focus.test.mjs` and `tests/community-public.test.mjs`, which passed 66/66.
- **Back/Forward wording, bounded:**
  - opening a topic uses `replaceState`, and Codex verified switching topics and All topics in the browser;
  - `popstate` restores are covered by unit tests only;
  - a real return to a cached page isn't verified yet. This batch doesn't change history behaviour.
- **No persistent copy:** drafts are never written to browser storage, so they don't survive a reload or a closed page. While a browser keeps the page in its back/forward cache, page memory, drafts included, can come back with it; batch 30 rechecks the session on such a restore.
- **Not tested:** a physical phone, Safari and a screen reader.

## Batch 30 — Community rechecks the session after a Back/Forward restore (item 53)

### Change (`js/lib/community-connection.js` only)
- **A restored page in account mode** (`pageshow` with `persisted`), once it has an account client, reads the stored session once through the same `account.currentSession(client)` that a start uses.
  - **The same account (or still signed out):** nothing is published and nothing else is fetched, so reply drafts, focus and a pending feed stay as they are.
  - **Signed out, or another account:** private state is cleared (`privateCleared`, as for an auth-listener change), and the feed is re-read for the new state.
  - **The check fails** (an error or timeout): fail closed. Private state is cleared, the notice is the existing "We could not check your sign-in. Refresh to try again…", loading ends, and there's no reconnect.
- **Stale answers are dropped:**
  - **Overlapping restores:** a restore has its own sequence, so only the newest restore's answer counts (root review correction). An older restore's late sign-out or error can't undo a newer same-account confirmation, and an older same-account answer can't undo a newer sign-out.
  - **Same-account restores leave the feed request alone:** a same-account restore doesn't bump the feed `request`, so a pending Refresh still completes.
  - **A newer start or a sign-in change** (request or guard token) also wins.
  - **An under-13 result recorded meanwhile** switches to public reading, as before.
- **Unchanged:**
  - **Before a client exists** (the service still starting), there's no recheck; that start reads the session itself.
  - the under-13 restore path;
  - nobody is signed out;
  - no stored session is touched.

### Tests (+8)
- **`tests/community-public.test.mjs`** (connection level, +7):
  - **Signed out while cached:** private state is cleared, only Sign in remains, the feed is re-read, and there's no sign-out call.
  - **The same account:** exactly one session read, nothing published, the guard token still current, and a normal load never rechecked.
  - **Another account:** the switch, with access read again.
  - **A failed check:** fails closed, with the session-error notice, no loading and no further reads.
  - **Stale answers:** a sign-in change, a newer Refresh and an under-13 result each win over a pending recheck.
  - **A failed check while a Refresh is loading:** loading ends, and that Refresh's late answer can't bring the old session back.
  - **Overlapping restores:**
    - an old error or sign-out answered after a newer same-account confirmation clears nothing;
    - a newer sign-out wins over an old same-account answer;
    - a same-account restore while a Refresh waits for the feed: that feed still completes.
- **`tests/community-focus.test.mjs`** (real `forum.js`, +1):
  - a same-account restore keeps the same reply field, its draft and focus;
  - after a sign-out made while cached, the restore removes the reply composer, hides the topic composer, Your submissions and moderation, and empties the loaded lists;
  - the draft doesn't survive.
- **Spot mutants:**
  - **Caught (nine):**
    - no account-mode recheck;
    - the same account still clearing;
    - a failure keeping private state;
    - no stale guard;
    - no request guard;
    - no age check after the read;
    - a failure leaving loading on;
    - no restore sequence;
    - a same-account restore bumping the request.
  - **Removed:** a redundant client-identity guard whose mutant survived; the request guard covers it.
- **Full suite on this branch (with batch 27):** 773/773 (`npm run check`).

### Assumptions and limits
- **Evidence:** the bug is synthetic. The pinned SDK, offline, with the cross-tab message removed, as the HTML spec allows for a cached document. Real browsers may instead evict the page when that message arrives, in which case Back loads a fresh page and this code path isn't reached. That's harmless.
- **Who is signed in:** the restore check reads the SDK's stored session; it doesn't ask the server who is signed in. That matches how a start decides.
- **What it covers:** this protects what the page shows. It doesn't revoke anything or sign anyone out.
- **Browser review** (Codex, native Chrome, synthetic fixture on port 9015; the restores were **simulated** by the fixture dispatching persisted `pageshow` events):
  - **The same account A:** the draft is kept.
  - **A quiet sign-out:** the composers and private cards are cleared.
  - **A quiet switch to B:** A's draft is cleared.
  - **Overlapping restores:** a newer A confirmation wins over an older failure.
  - **A failed read:** private UI is cleared and the page asks for a Refresh.
  - **Under 13:** private UI is hidden.
  - 0 console errors.
- **Not yet verified:** a real browser back/forward cache lifecycle. Whether native Chrome keeps or evicts the page with the real SDK is the pending native baseline (batch 33, part B).
- **Reproduction script** (outside the repo): `/private/tmp/tkdflow-research/scripts/community-bfcache-repro.mjs`.

## Batch 28 — Taekwondo words explained (item 49)

### Source
- **One publisher reference:** Kukkiwon, *Taekwondo Technical Terminology* (English edition, first published 31 December 2011; preface dated 1 March 2012), `https://research.kukkiwon.or.kr/homepage/boardMedia/11621` (96 PDF pages).
  - Every term, spelling and Hangul comes from it: contents on PDF page 11, introduction on pages 4–5, and entries on pages 12, 15, 22, 23, 33, 40, 44, 61 and 76.
  - Each entry links to its page with `#page=N`.
- **Wording:** the explanations are short paraphrases, 84 words across the entries, under the 200-word budget with the reference line.
- **Not reproduced:** no pages, images, audio or long quotations, and no tool credits.
- **Hangul:** none is shown for Poomsae or Gyeorugi, because the source doesn't give either as a standalone entry.

### Change
- **New `/glossary.html`, "Taekwondo words explained"**, generated from the new `data/glossary.json` by the new `scripts/build-glossary.mjs`.
  - **Generator:** it joins `npm run sync`, and `npm run check` adds its `--check` drift mode.
  - **Without JavaScript:** the page is complete, with a stable anchor per term (`#ap-chagi`, `#junbi-jase` and so on).
  - **Hero:** compact, like the comparison page.
  - **Title (root review):** "Taekwondo words explained" rather than "Words in the lessons", because Gyeorugi and Gyeokpa have no form-lesson examples. The same name is used in the page title, the Start here link and the Community resource.
  - **Intro:** the terms and spellings come from Kukkiwon's *Taekwondo Technical Terminology* (English edition, 2011); some, such as Gyeorugi and Gyeokpa, aren't part of the form lessons; other styles and schools may use different names. No equivalence is claimed.
  - **Unchanged by the retitle:** the 12 terms, their wording and the scope. No new translations.
- **12 entries:** Poomsae, Gyeorugi, Gyeokpa, Junbi-jase, Seogi, Makgi, Jireugi, Chigi, Chagi, Ap-chagi, Dollyeo-chagi and Yeop-chagi.
  - **Chigi:** "Strikes, including knife-hand and back-fist techniques" (PDF page 23).
- **Examples:** only where they're verified.
  - **Finder links:** block, punch, kick, front kick, roundhouse kick.
  - **Direct poses:** Junbi-jase → Taegeuk Il Jang pose 1 "Junbi — Ready stance"; Chigi → Taegeuk Sam Jang pose 10 "Right knifehand strike"; Yeop-chagi → Taegeuk Sa Jang pose 9 "Left side kick".
  - **Library:** Poomsae → the forms library.
  - **None:** Gyeorugi, Gyeokpa and Seogi (the lessons have none, and stances aren't indexed).
- **Search** (`js/pages/glossary.js`, shown only with JavaScript): Korean, romanized or English words, with every word required and any order, using the catalogue `normalize()`. `?q=` goes in the address, plus a summary, an empty state with "Show all words", and focus back in the field.
- **Where it's linked:** a note in Start here's "Reading a lesson" section and a Community resource (kind "Study guide"). The header is unchanged.

### Tests (`tests/glossary.test.mjs`, 6)
- **Source fidelity:** spellings and a Hangul allowlist exactly as the source prints them, PDF pages within 1–96, labelled by vintage (no "latest"), and the publisher's host.
- **Budget:** the word budget (at most 200).
- **Examples:**
  - every link resolves;
  - for each finder link, every pose it shows has the words in its group or pose name;
  - each direct pose's label matches the real companion pose name;
  - no examples for terms without one.
- **Generated page:** `glossary.html` equals the generator's output, every anchor and page link is present, and the search appears only with JavaScript.
- **Real page:** search by "앞차기", "front kick", "ap chagi" and "KICK FRONT"; "kick" gives 4; `?q=`; the empty state and clear with focus; a Korean address query.
- **Discoverability:** Start here and Community link to the page, and the header doesn't.
- **Five spot mutants caught:**
  - invented Hangul;
  - the wrong example pose;
  - an empty finder example;
  - a hand-edited page (drift);
  - any-word search.
- **Found while building:** a "block" finder link also shows a pose named "knifehand high block + knifehand strike". The check therefore looks at each pose's own name as well as its group.
- **Full suite on this branch (with batch 29):** 779/779 (`npm run check`).

### Browser review (Codex, 18 November)
- **Tests:** `tests/glossary.test.mjs` passed 6/6 when Codex ran it independently.
- **Search, in the in-app browser:**
  - "kick front" gives 1 result, Ap-chagi;
  - "막기" gives 1, Makgi;
  - "junbi jase" gives 1, Junbi-jase;
  - a nonsense query gives 0.
  - **Show all words** restores all 12 and puts focus back in the search field (`gl-q`). The query survives a reload.
- **Example link:** Chigi's Taegeuk Sam Jang pose 10 example loads the actual "Right knifehand strike".
- **Layout:** no overflow at 320, 390, 768 and 1280 px, and the search field is 44 px high.
- **Source links:** each p. N link's href was checked. The source PDF and its page numbers were researched when the batch was built.
- **Evidence:** root's `fivehour/batch-28-29` artifacts (JSON and screenshots).

### Known limits
- **Not retested:** that a browser's PDF viewer opens each p. N link at its anchor.
- **Not checked in a browser:**
  - reading without JavaScript (covered by the generated-page test only);
  - the other example links (Junbi-jase, Yeop-chagi and the finder links), which the tests check against the real pose names.
- **Not tested:** a physical phone, Safari and a screen reader.

## Batch 29 — one compact tool row in the Forms library hero (item 50)

### Change (`forms.html`, `css/forms.css`)
- **One list replaces the three paragraphs**, directly after the primary buttons: `<ul class="hero-tools" aria-label="More forms tools">` with "Text and print companions", "Your school’s order of forms" and "Compare two forms", in the same order as before.
  - No `<nav>`, so no extra landmark.
  - No glossary link yet.
- **CSS:**
  - one wrapping flex row (gaps of 4 × 20 px), with no bullets;
  - the existing white, bold, underlined link style at .95 rem;
  - each link a 24 px minimum target.
  - The two `hero-companions` rules are removed; nothing else used them.
- **Unchanged:** the three primary buttons ("My saved forms & progress", "New here? Start here", "Find a technique"), the summary, the style tabs, the header and every destination page.

### Tests
- **Pins updated:**
  - `tests/companions.test.mjs`: the library links `/companions.html` as "Text and print companions";
  - `tests/compare.test.mjs`: it links `/compare.html` as "Compare two forms".
  - `tests/school-planner.test.mjs` still finds `/school-forms.html` unchanged.
- **No new tests (root review):** a layout-only, reversible change; Codex's responsive and keyboard review is the meaningful check.
- **Full suite on this branch (with batch 28):** 779/779 (`npm run check`), and `git diff --check` is clean.

### Browser review (Codex, native Chrome, 18 November)
- **Layout:**
  - no overflow at 320, 390, 768 and 1280 px;
  - all three tool links are 28.32 px high;
  - the hero is about 59 px shorter at phone widths, and about 70 px shorter at desktop width, than Codex's earlier native baseline.
- **Keyboard:** Tab goes through the primary buttons, then the three tool links, then All styles. Each has a visible focus state with a solid outline.
- **Accessibility name:** the list is named "More forms tools".
- **Console:** 0 errors.
- **Evidence:** root's `fivehour/batch-28-29` artifacts (JSON and screenshots).

### Known limits
- **Not tested:** a physical phone, Safari and a screen reader.

## Closeout — prepared, not published (18 November)
The work below stays in the backlog. None of it is on this branch, and none of it is published. The patch files are outside the repository, in `/private/tmp`.
- **Batch 32, item 56 (operational docs current state):**
  - `/private/tmp/tkdflow-ops-docs-current-state.patch`, docs-only plus one runbook consistency test;
  - 779/779 on `b4c97e2` plus batches 28 and 29;
  - to apply after this branch is committed.
- **Batch 33A, item 57 (working retries on Lesson help, the lesson panel and saved learning):**
  - `/private/tmp/tkdflow-private-pages-retry.patch`;
  - 762/762 alone, with 19 spot mutants caught;
  - not tested in a browser.
- **Batch 34, item 55 (CI actions pinned to release SHAs):**
  - `/private/tmp/tkdflow-ci-actions-pin.patch`;
  - 750/750 alone;
  - the real check is a GitHub Actions run.
- **Together:** 32, 33A and 34 on `b4c97e2` plus 28 and 29 passed 787/787 in scratch, and `git diff --check` was clean.
- **Batch 33B (Back/Forward restore checks on the other private pages): not implemented.**
  - **Codex's clean native Chrome baseline:** after a same-user Back, Chrome restored the cached profile document. When a sign-out happened while the profile page was cached, Chrome evicted it (`notRestoredReasons`: `broadcastchannel-message`). The fresh load went to sign-in with no private fields shown.
  - **Result:** no stale profile was reproduced.
  - **Not tested:** Safari, which could use `/private/tmp/tkdflow-bfcache-native-baseline-fixture.mjs` later.
- **Known test flake, not fixed:** batch 21's header Log out test "a sign-out already sent before Back/Forward…" failed once under load.

## Batch 35 — a free lesson camera with three focus options (item 58)

### Change (one shared implementation for all 23 lessons)
- **New `js/animation/camera-rig.js`** (pure math, no renderer):
  - **Angles:** azimuth around the performer (0 in front of the starting stance, 90 on the performer's left), a tilt from level to 70°, and zoom from 0.75× to 2.5×.
  - **Position, not turns:** the camera follows where the performer stands, never the way they face.
  - **Default:** front-left, 18° up, as the old 3/4 view.
- **Framing without zoom pumping:**
  - **Whole body and Armwork:** for each lesson, one distance per focus and screen shape fits every sampled point of the whole form from every allowed angle (5° steps, 3.5% margin). Turning, tilting and playback never change it. Only zoom, a focus change or a new screen shape does.
  - **Whole body** includes the head, both hands, both feet and every joint, kicks included.
  - **Armwork** covers the head, shoulders, elbows, wrists, hands and the pelvis.
  - **A per-angle table** is built once per focus (about 30 ms for the longest form in Node), so a resize is a lookup.
- **Footwork follows both knees and feet, kicks included** (root review: it must not hide the kicking foot).
  - It looks from 0.25 s before to 0.75 s after the current lesson time and fits those leg points from any angle.
  - It backs out quickly (80 ms easing) and moves back in slowly (450 ms), and it's never wider than one steady whole-lesson framing of the legs.
  - Its distance depends only on lesson time, so orbiting never changes it.
  - **With reduced motion,** it holds that steady framing instead.
  - **Safety net for jumps (root review, 19 Nov):** easing alone could clip a foot. Root found this after Next, a list pick or a seek from a low stance straight to a kick (Taegeuk Sa Jang pose 4 → 7: the first frame reached 1.089 of the frame edge at a 0.85 aspect).
    - **The check:** after easing, every Footwork frame checks with a conservative any-angle bound that the current pose's knees and feet fit at the current aim and distance.
    - **If they might not,** the camera moves straight out to the goal's aim, at the larger of the current and goal distances. Moving back along the view axis only widens the view, so nothing is clipped.
    - **Also covered:** choosing Footwork from another focus, a screen-shape change (which reframes at once), and `at()`.
    - **Steady playback still eases:** across all 23 lessons at 60 fps the net moved the camera on at most 4 frames per lesson (≤0.05%). The largest per-frame distance change was about 0.1 m.
- **Easing:** key and button moves ease (about 0.3 s) by the short way round, with no overshoot. Drag and pinch follow the pointer at once. Reduced motion snaps every change.
- **New `js/animation/camera-input.js`:**
  - **Drag:** the full canvas width turns the camera 180°, and the full height tilts it 90°. Dragging right moves the camera left, as if grabbing the scene.
  - **Zoom:** two-finger pinch, or Ctrl/Cmd with the wheel (a trackpad pinch). A plain wheel still scrolls the page.
  - **Phones:** `touch-action: pan-y`, so sideways drags turn the camera and vertical swipes scroll. Study view takes every direction.
  - **Ending a drag:** a cancelled touch, a lost capture or a window blur ends it.
- **Keys** (with the player selected; never with Ctrl, Cmd or Alt, in fields or during IME):
  - A and D move around 15°, and Shift with A or D goes to the next named side;
  - W and S raise or lower;
  - + and - zoom;
  - 0 resets;
  - 1, 2 and 3 choose Whole body, Armwork or Footwork.
  - They don't overlap the playback keys (arrows, Home, End, Space, K and R).
- **Lesson pages (all 23):**
  - **Focus group:** the five view buttons are replaced by "Camera focus" (Whole body, Armwork, Footwork; `aria-pressed`).
  - **Camera buttons, so dragging is never required:** "Move the camera" has seven labelled buttons (left and right go to the next named side; raise; lower; zoom out; zoom in; Reset).
  - **Status:** a polite `camera-status` line announces the camera once it settles ("Camera back-left, slightly above. Armwork."). Drags in progress aren't read out.
  - **Text:** the key hint, the view note and the hero sentence are updated.
  - **If the 3D view fails,** the camera controls are disabled.
- **`js/animation/lesson-view.js`:**
  - uses the rig and attaches the input;
  - exposes `camera` to the page;
  - keeps `setView(name)` presets for the QA lab;
  - writes `data-azimuth`, `data-elevation`, `data-zoom`, `data-focus`, `data-camera-distance` and a direction name in `data-view` for review.
- **Start here and the homepage** describe the new controls.
- **Layout:** at 320 px the toolbar rows may shrink inside the card. The Voice/Effects/Study row already overflowed the card by 6 px at 320 px on `main`; it now wraps its label below 360 px.

### Framing compared with before
- **Default Whole body,** measured as figure size against the old fixed 3/4 fit, across all 23 lessons:
  - desktop-shaped canvas (1.74): 91–101%, median about 96%;
  - phone-shaped canvas (0.85): 83–101%, median about 95%.
- **Why it's smaller in some lessons:** the drop comes from front kicks seen side-on, which a fixed 3/4 view never had to fit. It isn't caused by the 70° tilt; each tilt from 0° to 70° needs about the same distance. Zoom goes up to 2.5×.
- **Footwork:** typically about 0.5–0.6× the Whole body distance during steps and stances, widening to at most about 1.06× at high kicks.

### Tests (`tests/lesson-camera.test.mjs`, new, 19; `tests/start-here.test.mjs` updated)
- **Whole body, all 23 lessons:**
  - samples offset from the rig's own grid (in-between frames);
  - 24 azimuths × 6 tilts × 2 screen shapes;
  - every joint, hand and foot stays on screen.
- **Footwork, all 23 lessons,** played at 60 fps (frames checked every 1/30 s) at two screen shapes:
  - both knees and feet of the current frame stay on screen from five angles;
  - the median distance is under 0.75× Whole body;
  - the peak is under 1.1×.
- **Footwork jumps, all 23 lessons, at two screen shapes:**
  - settled at every other pose, then jumping 1 or 3 ahead, 1 or 4 back, to the first pose and to the last pose;
  - a seek while playing;
  - 2,000+ jumps in all.
  - The first frame and the settled frame are each checked from six angles.
- **Footwork, focus and shape changes:** chosen from Whole body or Armwork at each of Taegeuk Sa Jang's kicks, then resized to 0.5, 2.4 and 0.85; a rotate-and-jump together; and a direct `at()`.
- **Steady playback:** safety snaps stay at or under 1% of frames.
- **Armwork:** on screen from every tested angle, and under 0.75× Whole body.
- **Rig behaviour:**
  - no pumping while orbiting, including Footwork;
  - reduced motion gives steady Footwork with every kick in frame;
  - easing takes the short way round with no overshoot, and stops asking for frames once settled;
  - focus changes move in steadily;
  - drag and pinch are immediate;
  - the limits hold, and the next-side steps go 90, 135, 180, −135 and back 45, 0, −45, −90;
  - the labels read as expected;
  - a new screen shape reframes at once.
- **Input:**
  - the key map and its exclusions, and no overlap with the playback keys;
  - drag direction and scale, pointer capture, and right-click ignored;
  - a plain wheel left alone, while Ctrl+wheel zooms;
  - pinch;
  - cancel, lost capture and blur;
  - detach removes every listener.
- **The real `js/pages/lesson-player.js` page,** with only the WebGL view and the account widgets substituted:
  - camera keys move the camera, while arrows still step a frame;
  - the time slider and Ctrl keep their keys;
  - the focus and camera buttons work, and `aria-pressed` follows;
  - the announcement arrives after settling, and drags aren't announced;
  - a 3D failure disables all 10 camera controls.
- **Markup:** all 23 pages have the focus group, the seven labelled buttons with real keys, the status line, the key hint and the note.
- **Spot mutants caught (12):**
  - distance depending on angle;
  - no Footwork cap;
  - Footwork zoom-out slowed to 600 ms with no look window;
  - zoom-out slowed to 5 s;
  - Footwork need cut by 20%;
  - drag sign flipped;
  - the wheel always zooming;
  - Shift taking letters;
  - the page ignoring camera keys;
  - no disabling on error;
  - drags announced;
  - a focus change keeping the zoom.
- **After the jump fix, one bounded mutant:** removing the per-frame safety check fails both new jump tests (Taegeuk Il Jang pose 15 → 16 reached 1.455; Armwork → Footwork reached 1.321).
- **Survived (stated plainly):**
  - with the look-ahead removed, or the zoom-out slowed to 900 ms, every tested frame stays in view, because the any-angle bound is already conservative. The look-ahead is kept so the camera widens before a kick rather than during it.
  - **Helper:** `tests/helpers/mini-dom.mjs` gains `firstElementChild`.
- **Full suite:** 798/798 (`npm run check`), and `git diff --check` is clean.

### Browser check (Claude, in-app browser on root's local preview, port 8899)
- **Taegeuk Yi Jang:** a drag turned the camera, with the distance unchanged.
- **Koryo:** Shift+D twice, W and 2 gave back-left, 28° and Armwork. The status read "Camera back-left, slightly above. Armwork.", and 3 switched to Footwork.
- **Taegeuk Sa Jang:**
  - Footwork held both feet through the left side kick (pose 9) and the right front kick (pose 7);
  - at the knifehand block (pose 4) it moved in to 3.06 against 4.83 for Whole body.
- **Layout:** at 320 px wide there's no page overflow. The focus and camera rows sit inside the card, with 32–48 px buttons that are 40 px high.
- **Console:** no errors from the camera. The two 401 resource errors per page load come from account reads on the local preview and also appear without any camera action.

### Codex review (19 November)
- **Tests:** `tests/lesson-camera.test.mjs` passed 19/19 when Codex ran it independently (28.85 s), and `git diff --check` is clean.
- **All 23 lessons linked from the library (native Chrome):**
  - each loaded the connected 3D canvas;
  - each switched between Armwork, Footwork and Whole body with keyboard activation.
- **Focus buttons with a mouse:** a click works once the page has settled. A first click during the browser's smooth auto-scroll was unreliable in automation, with no JavaScript error; Enter and a settled click work.
- **Mouse drag:** azimuth 50 → 18.6 and tilt 18 → 7.9, with the distance unchanged at 4.622 and the lesson time still 0.
- **Keys:** A, D, W and 2 changed the camera. ArrowRight advanced the time by 0.033 s without turning it. The time slider kept the A key.
- **Emulated real touch:** a pinch zoomed from 1× to 1.67×, and Reset restored it. Touch emulation was switched off afterwards.
- **Keyboard focus:** Armwork showed a 3 px solid blue outline.
- **Study view:** at 320×780, 390×844, 768×1024, 1280×800, 844×390 and 640×320 there was no horizontal overflow, and every camera control was on screen.
  - At 640×320 the canvas is 64 px high and the playback container ends at y = 321.5, so the card's existing scrolling applies there.
  - Not every text was checked at that size: the real buttons with long captions weren't checked, so this makes no claim that all text fits.
- **Evidence:** root's `camera-route-checks.json` in the session outputs.

### Known limits
- **Not tested:** a physical phone, Safari or a screen reader.
- **Short landscape Study view (640×320):** the camera rows leave a 64 px canvas. The card scrolls to its playback controls; long captions at that size aren't verified.
- **Focus buttons during smooth auto-scroll:** a first mouse click could be missed in automation. A settled click and Enter work.
- **Mesh and motion are unchanged here.** The avatar and motion improvement is the next stage.

## Batch 36 — camera focus transitions keep the body in frame (item 59)

### Change (`js/animation/camera-rig.js`)
- **One exact framing guard for every focus** replaces the Footwork-only safety net.
  - **When it runs:** after each easing step, and after each drag, pinch or resize.
  - **What it checks:** the current pose's points for the active focus (Whole body: head, hands, feet and joints; Armwork: head and arms; Footwork: knees and feet), projected at the current angle, the current (possibly still-easing) aim and the screen shape.
  - **What it does:** if any point would fall outside the frame (with a 5 cm pad), the camera moves straight back along its current line of sight by exactly enough. It doesn't snap the aim or zoom out further than needed.
  - Because it's exact for the view on screen, it never moves the camera in settled Whole body or Armwork, so the body stays as large as before.
- **A manual zoom-in past 1× is left to crop,** as the learner asked. A focus change still resets zoom to 1×, so the guard applies again.
- **Shared points:** `focusPoints(pose)` now supplies the per-pose points both for the whole-lesson fit and for the guard.
- **Resize:** a new screen shape keeps the larger of the current and new distances and then eases in, instead of cutting.
- **Unchanged:** Footwork's look-ahead and its easing rates, the keys, the buttons and the pages.

### Tests (`tests/lesson-camera.test.mjs`, now 23)
- **All 23 lessons, two screen shapes:** six focus changes each (Armwork → Footwork, Footwork → Whole body, Armwork → Whole body, Whole body → Armwork, Footwork → Armwork, Whole body → Footwork). Every one of the first 30 frames (first frame, while easing and settled) keeps the new focus's points on screen; more than 8,000 frames are checked.
- **Rapid presses** in six lessons (all three styles), at two screen shapes and three times each: Armwork → Footwork → Whole body → Armwork → Whole body → Footwork → Whole body, 0–3 frames apart. Each frame is checked, then Whole body from five angles.
- **Resizing mid-transition:** to 0.5, 2.4, 0.85 and 1.3 for five focus pairs. A 2.5× manual zoom still crops Whole body and isn't undone, and the next focus change resets zoom and is framed.
- **Exactness:** in steady Whole body and Armwork (6 lessons, playback and three angles), the guard never moves the camera.
- **Existing tests:** the Footwork playback test now counts guard pushes (at most 1% of frames). The jump, focus, resize, keys, pointer and page tests pass unchanged.
- **One bounded check:** restricting the guard to Footwork, as before, fails the new transition and rapid-press tests. Taegeuk Il Jang Footwork → Whole body reached 1.624 of the frame edge on its first frame, the head leaving the canvas as root saw. With no guard at all, Armwork → Footwork reached 1.372.
- **Full suite:** 802/802 (`npm run check`), and `git diff --check` is clean.

### Codex review (19 November)
- **Tests:** `tests/lesson-camera.test.mjs` passed 23/23 when Codex ran it independently (37.9 s), and `git diff --check` is clean.
- **Rapid focus keys in native Chrome,** in the order 2, 3, 1, 2, 1, 3, 1, on:
  - Taegeuk Il Jang at the ready position;
  - Taegeuk Sa Jang pose 7 (front kick);
  - Koryo, Chon-Ji and Songahm 3.
  - The immediate screenshots show no head crop.
- **Phone size:** Songahm 3 at a real 390×844 inner size, with rapid focus switches. The full head and body are visible in Whole body.
- **Evidence:** root's `camera-focus-corrected-local.jpg` and `camera-focus-corrected-phone.jpg` in the session outputs.
- The browser viewport was reset afterwards.

### Known limits
- **Not tested:** a physical phone, Safari or a screen reader.

## Batch 37 — grounded feet stand flat (item 60)

### Change (`js/animation/form-motion.js` only)
- **A foot that ends a move on the floor gets pitch 0** (its ankle at or below 7.5 cm, the 7 cm ankle height plus a margin). This applies to kick plans (the supporting foot), bending-ready and every plan that keeps the previous feet.
- **A foot coming down from a kick** finishes flattening as it reaches the floor: its pitch progress is at least as far as its descent. It no longer lands with the toes up and flattens afterwards.
- **Unchanged:**
  - **Feet in the air:** a front kick keeps −50° and a side kick −85° at the kick, and in-between frames still ease.
  - **Everything else:** across all 82,997 frames of the 22 data-driven lessons, sampled at 30 fps, nothing changes except foot pitch (4,714 values). Foot and joint positions, timing, chapters, the 728 poses, counts and narration are identical. Taegeuk Il Jang uses its own motion file and is untouched.
- **Read-only audit after the fix:** zero frames, in any lesson, where a foot on the floor is pitched more than 5°.
- **Pyongwon thumbnail** (`assets/forms/pyongwon.webp`, `data/form-thumbnails.json`): it shows pose 8, one of the corrected poses, so the existing thumbnail test caught the changed pose.
  - **How it was re-rendered:** by the documented thumbnail studio process (`docs/form-thumbnails.md`), with the unchanged renderer and avatar.
  - **What changed in the image:** the supporting right foot now stands flat instead of tipped up.
  - **Manifest record:** only Pyongwon's changed: its new pose fingerprint, render proof (bounds 353/752/124/834, 77,800 pixels), 17,918 bytes and image hash.
  - **The other 22 thumbnails** rendered in the same session reproduced their recorded bounds and pixel counts exactly, and their files are untouched.

### Tests (`tests/foot-pitch.test.mjs`, new, 3; `tests/form-thumbnails.test.mjs` passes with the new Pyongwon record)
- **All 23 lessons, every frame at 30 fps:** a foot on the floor is never pitched more than 5° (more than 100,000 grounded feet checked).
- **Consecutive opposite-leg kicks:** root's 10 flagged held poses stand flat on the floor. In Taegeuk Sa Jang 9 → 10, the left leg side-kicks at −85°, then supports the right side kick at 0°.
- **Kicks and landings:** the front kick keeps −50° and the side kick −85° in the air. Won-Hyo 28, Joong-Gun 4 and Taegeuk Pal Jang 17 land flat, within 5° at touchdown.
- **Against the unpatched file:** all 3 tests fail.
- **Full suite:** 805/805 (`npm run check`), and `git diff --check` is clean.

### Codex review (19 November)
- **The release lesson player, current character:**
  - Taegeuk Sa Jang pose 10 in Whole body and Footwork;
  - Jitae pose 31 in Whole body;
  - at desktop and at a real 390×844 size.
  - The supporting feet stand flat, and the whole character fits.
- **Independent before/after comparison** of 29,815 sampled frames and pose endpoints across all 23 forms:
  - all pose state other than foot pitch, plus the chapters and duration, is identical;
  - the largest pitch on a grounded foot is 0.557°.
- **Evidence:** root's `support-foot-independent-review.json` in the session outputs.

### Known limits
- **The scan finds geometry, not technique.** It isn't an instructor's check of foot technique.
- **The detailed avatar** (the new mesh, the fitted feet and the side-kick foot frame) stays in scratch for further review and isn't part of this batch.

## Batch 38 — detailed lesson avatar (item 61)

### Change
- **A detailed, clothed character** (`assets/animation/avatar-v2.json` and `.bin`, 666,624 bytes raw, 483,666 bytes gzipped after the review fix below, 34,058 triangles, 50 bones), built from the CC0 Blender Studio Human Base Meshes v1.4.1. Only the head and neck, hands and feet are kept as skin; the rest is a fitted dobok with a flat black V collar cut into the jacket surface, a belt raycast onto the jacket with its knot and tails ("Sankar"; the emblem and two gold bars), hair, brows and eyes. No photograph is used. Provenance: `assets/animation/AVATAR-SOURCE.md`.
- **`js/animation/avatar-core.js` (new)** builds the avatar from the binary and poses it from each lesson's own joint positions:
  - upper arm, forearm, thigh and shin on the lesson's joints, turned by the same elbow-plane and knee frames the runtime uses;
  - shoulder and elbow helper bones at half the joint's turn, so the sleeve folds round a raised or chambered arm instead of tearing into fins;
  - feet at the lesson's yaw and pitch, corrected for the mesh foot's own rest heading and toe drop, with a uniform 8.9 mm lift for its deeper sole;
  - side kicks: the smallest extra turn that points the sole along the shin, easing in as the foot rises and turns, so it never snaps;
  - fingers from baked hand shapes (fist, knife-hand, spear-hand, palm, ridge-hand), blended by how open the hand is and, while an open hand changes technique, between the two shapes (review fix 2).
- **Hand shapes, checked up close against the technique descriptions:**
  - **Knife-hand:** fingers straight and closed together (the knuckles drawn in toward the middle finger, so no splay), thumb bent along the edge of the palm.
  - **Spear-hand:** the knife-hand with the middle finger flexed so the fingertips line up.
  - **Palm** (supporting, covering and pushing hands): fingers together, slightly bent.
  - **Ridge-hand:** knife-hand fingers with the thumb tucked against the palm below the index knuckle (see the review fix).
  - **Fist:** fingers folded, thumb lying across the index and middle fingers (see the review fix).
  - The thumb's base no longer tears when it tucks: it follows its own chain joint to joint, and its pad follows the thumb's root bone.
- **`js/animation/form-motion.js`:** each open hand now also carries a `shape` label (knife-hand by default; spear-hand, palm or ridge-hand where the technique says so; the supporting hand of an assisted, target or spear technique is a palm; Koryo's tongmilgi ready uses two knife-hands; covered and overlapped ready hands are palms). **Nothing else changes:** positions, angles, open, roll, timing, chapters, counts and narration are identical (`tests/helpers/motion-digests.json`, computed from the published motion at `79c4124`).
- **`js/animation/avatar.js`:** `createAvatar()` keeps its contract (`root`, `applyPose`, `ready`, `onReady`, `onError`) and loads the detailed avatar. **If the asset fails** (network error, missing file, wrong length or checksum, bad JSON or ranges), it shows the earlier procedural avatar, now `createProceduralAvatar()`. `onError` fires only if neither can be shown. The detailed face has no mouth rig yet, so the kihap cue changes nothing on it.
- **`js/animation/media.js`:** the asset's same-origin paths. It's the only network read in `js/animation/`; `tests/animation.test.mjs` now allows exactly that one `fetch` in `avatar.js`.
- **Weighting fixes found by the new tests** (before integration):
  - **belt cinch:** cloth under the belt band follows the torso only; a raised knee had lifted the band 2.9 cm off the waist;
  - **feet:** everything below the ankle follows the foot alone; in back stances the heel had twisted 10–15° with the shin.
- **Thumbnails and social image:** all 23 library thumbnails were re-rendered with the detailed avatar by the documented studio process (`docs/form-thumbnails.md`), with the same 23 poses and camera angles. Every pose fingerprint is unchanged except for the new `shape` field: with it removed, all 23 match the previous records. The social card (`assets/social-card.svg`) embeds the new Taegeuk Sa Jang thumbnail and was re-exported to `assets/og-animation-v2.png` and `assets/og-image.png`. `docs/social-card-render.json` records the SVG and PNG hashes.
- **Build tools** (`tools/avatar/`, not deployed): the Blender scripts, the packaging script and a README describing the pipeline. `tools` is in `.vercelignore` and in the local preview server's private list (`scripts/serve.mjs`); the live checker now also probes it.

### Tests (`tests/detailed-avatar.test.mjs`, new, 15 with the review fixes; `tests/animation.test.mjs`, `tests/site.test.mjs` and the thumbnail manifest updated)
- **Asset:** within budget (at most 1 MB raw, 600 KB gzipped, 40,000 triangles); its length and checksum match; a truncated, altered, wrong-format or out-of-range asset is rejected before anything is built.
- **Real skin weights:** every vertex sums to 1; torso cloth carries no arm weight (under 5% from smoothing); sleeves never follow the hips; the trousers' crotch seam never follows both legs; feet below the ankle follow the foot alone; no thumb vertex mixes the thumb tip and the palm; the collar shares its outline with the jacket.
- **Feet, all 23 lessons, all 748 held poses (1,372 grounded feet):** soles within 0.07 mm of the floor (limit 12 mm), heel and ball within 3 mm of each other (limit 12 mm), heading within 0.02° (limit 8°); the ready stance at 0/90/180/270°; all 26 side kicks present the sole within 35° of the kick.
- **Retargeting, all 23 lessons at 30 fps (85,151 frames):** shoulders, elbows, wrists, hips, knees and ankles land within 1 mm of the lesson's joints; no tracked bone turns more than 45° between frames.
- **Hands, every held pose:** 1,186 closed hands are fists; every open hand has a technique shape (164 knife, 90 palm, 14 spear, 2 ridge), reaches out, has its fingers together and its thumb tucked.
- **Cloth and trim in 9 review poses** (ready, punch, high block, front kick, knife-hand, double knife-hand block, kicks): no edge stretched more than 10× and longer than 3 cm; trim within 2 cm of the body surface (the knot, 3 cm deep by design, within 6 cm).
- **Motion unchanged:** all 23 lessons sampled at 10 fps match the published motion's digests.
- **Fallback:** with the real asset the lesson shows `detailed-v2`; on a network error, a missing file, a truncated or altered binary or bad JSON it shows `procedural-fallback`, which still poses (kihap included). It reports an error only when neither avatar can be shown.
- **Social image:** the PNG and SVG match their recorded export hashes.
- **Full suite:** 820/820 (`npm run check`, after both review fixes), and `git diff --check` is clean.

### Browser check (Claude, in-app browser)
- **Release preview (port 8899):** Taegeuk Sa Jang loads `avatar-v2.json` and `.bin` and no procedural atlas; the lesson plays with the camera, focus buttons and pose links. The only console line was a 401 resource error in that local preview session, which also appeared on its About page. It is specific to that local context: root did not reproduce it on the production About page.
- **Fallback in the real browser:** an offline load and a truncated binary both give `procedural-fallback`; the normal load gives `detailed-v2`.
- **Close-ups:** the knife-hand (Taegeuk Sam Jang 10–12), spear-hand with the supporting palm (Taegeuk Sa Jang 3 and 5), Koryo's tongmilgi ready, the chambered elbow and raised arm from behind, back-stance feet, and front and side kicks.

### Review fix (19 November): ridge-hand thumb web and fist thumb
- **Found by root:** in the ridge-hand (Sipjin 28 and 44) the thumb web showed a pointed flap on the right hand and a serrated lip on the left, and the fist read as an open loop from the thumb side. Fresh close-ups of the packaged asset confirmed both; the earlier review sheets predated the last re-bake but showed the same hand shapes.
- **Causes:**
  - **Ridge-hand:** the thumb curled into the palm's centre (99–102° at its first joint), so the web skin, which switches from the thumb's root bone to its first joint within 2–3 mm, folded over.
  - **Rolled wrists** (150° in the ridge-hand poses): palm skin up to 9 cm from the wrist kept 11–47% forearm weight and twisted.
  - **Fist:** the stiff thumb root made the thumb reach by bending, so its middle joint stood 2.4–3.8 cm off the fingers; the left solve also wrapped further than the right.
- **Fixes** (shape and weights only; joint targets, lesson motion and timing are unchanged):
  - the ridge-hand thumb tucks against the palm just below the index knuckle (first joint 44°);
  - the thumb pad's weight fades out smoothly toward the knuckles instead of stopping at a hard edge;
  - the palm takes forearm weight only in a band at the wrist;
  - the fist thumb's middle joint rests against the thumb side of the folded index (root swing capped at 14°), its tip turns most of the way across the middle finger, and the left thumb mirrors the right.
- **Measured on the real asset at every held pose of all 23 lessons** (skin edges round the thumb and palm, stretch against rest length):
  - ridge-hand: worst 2.5× with 1 edge over 2.5× (Batch 38 as frozen: 5.8× with 52–57);
  - knife-hand, spear-hand and palm: worst 2.75× with 3 edges;
  - fist: worst 6.1× with at most 18 edges, a crease at the thumb web (frozen: 91 edges on the right hand); the thumb's middle joint at most 1.26 cm and its tip about 0.5 cm from the index and middle finger axes, i.e. resting on them (frozen: 2.3–3.8 cm).
- **New test** (`tests/detailed-avatar.test.mjs`, now 14): open hands stay under 3× with at most 5 stretched edges; the fist stays under 6.5× with at most 25, its thumb's middle joint within 1.8 cm of the fingers and its tip within 2.2 cm. It fails on the frozen Batch 38 asset (the fist thumb 2.3 cm off the fingers; the ridge-hand 5.8×).
- **Still visible:** from a low thumb-side angle, a narrow gap under the curled index finger (the curl itself, unchanged); the thumb no longer bows out.
- **Asset:** 666,624 bytes raw, 483,666 bytes gzipped, 34,058 triangles. All 23 thumbnails were re-rendered (same poses, fingerprints and camera angles; new images and hashes), and the social card was re-embedded and re-exported.

### Review fix 2 (19 November): fingers no longer jump when an open hand changes technique
- **Found by root:** a scan of every finger joint in all 23 lessons at 30 fps found 3 one-frame jumps over 45°, all in Sipjin: 106.6 s and 110.2 s (`thumb2.L` about 103–116°) and 184.0 s (`thumb2.R`). In each, an already-open hand changed shape (ridge-hand to knife-hand, palm to ridge-hand) and `mixArms` switched the shape label at once. The earlier no-flip test tracked the hand bones but not the fingers.
- **Fix:**
  - `js/animation/form-motion.js`: while an open hand moves from one shape to another, the arm carries `shapeFrom` and `shapeMix` (0 → 1) alongside `shape`, on the same eased phase as the arm. They appear only while the change is under way (2,047 of 83,011 frames), so every held pose and its fingerprint is unchanged.
  - `js/animation/avatar-core.js`: the two baked presets, and their knuckle offsets, are blended by `shapeMix` before the fist blend. The blend is computed from the time alone, so seeking and frame stepping give the same fingers.
- **Unchanged, checked against the frozen source:**
  - all 728 held poses of the 22 data-driven lessons are byte-identical;
  - all 83,011 frames at 30 fps match apart from the two blend fields;
  - chapters, durations, counts and narration are unchanged;
  - the posed bones and skin at all 748 held poses are bit-identical (0 difference). The poser now skips slerping a preset to itself, because three's `slerp` re-normalises even at 1.
  - So the 23 thumbnails and the social image are still exact and were not re-rendered.
- **Tests** (`tests/detailed-avatar.test.mjs`, now 15):
  - every finger and thumb joint of both hands in all 23 lessons turns less than 20° per frame at 30 fps (largest now 8.1°);
  - the fingers join the hand bones in the 45° world-turn check;
  - Sipjin's shape-changing stretch, sampled in order and then shuffled, gives identical fingers;
  - held poses carry no blend.
  - On the frozen source the new checks fail at Sipjin 106.6 s (`thumb2.L` 103°, `thumb1.L` 27°).

### Root QA (19 November, independent final verification)
- **Focused tests:** 30/30 passed (log: `/private/tmp/tkdflow-root-avatar38-tests-final2.log`).
- **Finger scan:** every finger joint in all 23 lessons at 30 fps, with zero jumps over 45° in one frame. The largest is 8.08394° (Taegeuk Chil Jang, `thumb2.R`, 112.633 s).
- **Shape blend in the real player:** Sipjin pose 28 replayed at 0.25× speed in Armwork and Study view shows the hands blending between shapes.
- **Earlier reviews still valid:**
  - all 23 lesson routes in all 3 focus modes;
  - the phone check at 390×844;
  - the blocked-model check, where the procedural fallback works with the pose and camera controls;
  - the high-block front and back review and the phone side-kick review.

### Known limits
- **Simplified pieces:** no mouth or kihap expression; the hair is a sculpted cap and ponytail.
- **The raised-arm armpit** still creases a little (no tears).
- **The foot skin is low-poly** (about 54 vertices per foot); it reads correctly at lesson distance.
- **Not changed here:** the motion audit's pivot drift and step-start foot slide are a separate motion batch.

## Batch 39 — planted pivots and lifted steps (item 62)

### Change (`js/animation/form-motion.js` only)
- **Planted pivots:** a grounded foot that turns keeps whichever floor point (ball or heel) is the same at both ends of the move, and its ankle swings round that point.
- **Lifted steps:** a step rises over its first 35%, travels between 12% and 88%, and is set down over its last 35% (peak height unchanged, 6.5 cm). It is about 1.5 cm up before it travels, and it turns in the air.
- **The same applies to:** footwork-sequence steps, the two-part close-then-step (now one continuous lifted step), returns to ready, and kick plans whose support foot moves (an advance or a closing step, taken before the kick chamber).
- **Kicking feet:** they rise before they travel to the chamber, and on the way back reach their spot before they are set down. Their turn and toe pitch wait until they are clear of the floor, on the kick's own clock, and the roundhouse and crescent sweeps start from zero with the kick.
- **Deliberate slides kept:** the source's `slide-left`/`slide-right` (shifting or extending the front foot, 21 moves in 7 lessons) now stay on the floor as the notes describe. The published motion lifted them 6.5 cm.
- **Unchanged:**
  - every held pose (all joints, angles, hand shapes), chapter and duration in all 23 lessons, pinned by `tests/helpers/held-pose-digests.json` taken from the published Batch 38 motion;
  - counts and narration;
  - Taegeuk Il Jang (its own motion file).
  - The knee bend planes are still carried along the published foot paths, so the knees at every held pose are exactly as published. The thumbnails and social image are therefore unaffected.

### Measured (heel-and-ball contact, all 22 data-driven lessons, 30 fps)
- **Total floor slip:** 100.1 m published → 4.39 m. Of the 4.39 m, 3.2 m is the source's deliberate slides.
- **Plans with more than 2 cm of slip:**

  | Foot | Published | Batch 39 |
  |---|---|---|
  | Supports | 243 | 11 |
  | Steps | 326 | 22 (all slides or the two named below) |
  | Kick supports | 35 | 0 |
  | Returns | 36 | 0 |
  | Footwork-sequence steps | 7 | 0 |
  | Kicking feet (worst) | 0.7 cm | 0.04 cm |
- **The 11 supports over 2 cm** are feet the source endpoints themselves relocate without a step (14 foot-moves: Taegeuk Pal Jang's two "stay" 180° turns and Pyongwon's in-place 180° pivot keep the ankle fixed while the foot turns, and the Keumgang and Taebaek crane supports turn about the ankle). They slide no further than their endpoints require; planting them would mean moving reference endpoints.

### Tests (`tests/foot-contact.test.mjs`, new, 4; `tests/helpers/foot-contact.mjs`; `held-pose-digests.json`; transit digests in `motion-digests.json` re-recorded)
- **The measure itself:** a 35° roll onto the ball, a rock onto the heel and a 90° pivot on the ball measure 0 slip while the ankle moves; a pivot about the ankle and a 20 cm slide are caught; a lifted step is clean and the published `sin²` step is caught. Roles come from the plans (the moving and the planted foot of Taegeuk Yi Jang's first step).
- **All 22 lessons, every plan and foot:**
  - a planted foot slides at most 5 mm;
  - a foot that leaves the floor slides at most 1.5 cm around its step;
  - a foot the endpoints relocate without a step slides no further than they require, plus 1 cm;
  - deliberate slides are exempt.
- **Ball pivots:** every support that turns more than 20° on a ball that is the same at both ends keeps it within 3 mm through the turn (more than 50 turns).
- **Endpoints:** every held pose, chapter and duration matches the published digest.
- **Against the published motion:** both slip tests fail (Taegeuk Yi Jang's first step slides 2.9 cm; the ball pivots wander). The measure and endpoint tests pass.
- **Existing smoothness limits still hold:** joint speed under 3 m/s and acceleration under 18 m/s², both throughout and in narrated execution. A first version broke them in two roundhouse lessons and was fixed before freezing.
- **Full suite:** 824/824 (`npm run check` on `fix/natural-footwork-2026-11-19` from main `552a049`), and `git diff --check` is clean.

### Browser check (Claude, avatar lab on this checkout's code)
- **Taegeuk Yi Jang's 180° turning step (plan 3, 8.40–11.40 s), frames at 8.40, 9.10, 9.60, 10.10, 10.70 and 11.40 s, Footwork view:** the support foot turns in place, the stepping foot is clear of the floor in the middle of the step and is set down at its endpoint. The held pose at 11.40 s is the published one.
- **Not yet seen in the release player:** the same lesson at 0.25× speed (root's review).

### Root QA (19 November, independent checks)
- **Focused tests:** 58/58. That is 22 foot-contact, foot-pitch and avatar tests, plus 36 form-lesson and technique-accuracy tests.
- **Direct comparison against the published main (`552a049`):** all 728 held endpoints across the 22 data-driven forms, and every chapter and duration, are identical.
- **Release player, Taegeuk Yi Jang pose 4** (the turning step), replayed at 0.25× in Footwork and Whole body: smooth, with the travelling foot lifted and the stance settled.
- **Release player, Taegeuk Yuk Jang pose 9 (roundhouse kick):** under root review at the time of writing.

### Known limits
- **Two staged moves are not yet converted** and are named in the test: Won-Hyo 27 (land, then turn: the foot turns on the floor between stages, 7.8 cm) and Yul-Gok 36 (jump back, 2.7 cm).
- **The relocations above** need source-endpoint decisions (pivot on the ball would shift the stance).
- **Geometry, not technique:** an instructor should still review the footwork.

## Batch 40 — a short, sourced history of taekwondo (item 63)

### Change
- **New page `/history.html`** (`layout/pages.json`, footer link "History of taekwondo", sitemap), with `css/history.css` and no scripts.
- **How modern taekwondo took shape.** A short narrative before the timeline, summarised from Kukkiwon's History of Taekwondo. All prose drawn from that page is marked `data-source="kukkiwon-history"` and kept under its 200-word summary limit: 166 words in all, 113 of them in the three origins paragraphs, in TKDflow's own wording:
  - **Roots:** Subak and Taekkyeon; judo, kendo and Tangsoo during the occupation.
  - **The Five Kwans, 1946–1960:** in Kukkiwon's account, Taekkyeon-inspired kicking, and the name "Taekwondo" in use after the Korean War.
  - **One association, 1961–1970:** the early-1960s national association unified dan tests and set poomsae; sparring became official at the 44th National Sports Festival in 1963; taekwondo spread to Asia, Europe and the United States.
  - **Who does what:** Kukkiwon (1972, the World Taekwondo Headquarters) leads the martial art and its poomsae; World Taekwondo (1973) governs the international sport, including Olympic competition; the ITF (1966) teaches its own patterns.
- **Timeline of 11 dated events**, each linking the record it comes from:
  - **Kukkiwon:** its early-taekwondo period of the post-war kwans (1946–1960, a period rather than one founding year); the 1963 National Sports Festival; founded 30 November 1972.
  - **ITF:** names "taekwondo" on 11 April 1955 (one attributed line); founded 22 March 1966 with General Choi Hong Hi named as founder; first World Championships in Montreal in 1974.
  - **World Taekwondo:** founded 28 May 1973.
  - **IOC:** demonstration sport at Seoul 1988 and Barcelona 1992, the 1994 decision, first medals at Sydney 2000.
  - **IPC:** Para taekwondo's debut on 2 September 2021.
- **Links onward:** the forms library, the beginner's guide, and World Taekwondo's official YouTube retrospective (a link).
- **Photos** (`assets/history/`, 1200 px wide WebP):
  - Kukkiwon's south gate: LucaPagani7, CC0 1.0, captioned as a 2026 view and not a 1972 photograph (155 KB);
  - the Rio 2016 Olympic taekwondo arena from the stands: Henriquemarra01, CC BY-SA 4.0, with the change noted and the adapted image under the same licence, and no athletes identified (124 KB).
  - Each has descriptive alternative text, and its credit appears in the caption and in the sources list.
- **Statement:** TKDflow is independent and not affiliated with these organizations.
- **Not included:** the names Korea Taesoodo Association (1961) and Korea Taekwondo Association (1965). Kukkiwon's History of Taekwondo page describes the early-1960s association without naming it, so the page doesn't name it either. A source that does would let them be added.
- **Kept to the IOC's wording:** Kukkiwon's page also calls taekwondo an "official event" at Seoul 1988, while the IOC records it as a demonstration sport. The page uses the IOC's wording.

### Tests (`tests/history.test.mjs`, new, 6)
- The page is in the manifest, the sitemap and the footer.
- **Timeline:** all 11 events are dated in order, each links its own record, and the ITF's 1955 date and founder are attributed to the ITF.
- **Origins narrative:** it comes before the timeline and cites Kukkiwon's history. It covers the Five Kwans, 1946–1960, Taekkyeon, the national association, the unified dan tests, the 1963 festival and the spread overseas, and states the different roles of Kukkiwon and World Taekwondo. There's no caveat banner or lineage debate.
- **Summary limit:** the marked Kukkiwon-derived passages total under 200 words, and the origins summary is 100–125 words in exactly three paragraphs. The roles paragraph cites its own founding and introduction sources.
- **Photos:** licensed WebP files of the stated size, under 200 KB, with descriptive alternative text. Each credit has the author, source page, licence link, licence name and the change note. The 2026 photo is not passed off as archival, and the CC BY-SA adaptation keeps its licence.
- **Self-contained:** same-origin images, no scripts or embeds, and external links only to the cited sources.
- **Full suite:** 830/830 (`npm run check` on `feat/taekwondo-history-2026-11-19` from main `a1afe57`, with Batch 39's motion, tests and digests unchanged), and `git diff --check` is clean.

### Browser check (Claude)
- The overlay's own preview server (CSP enforced), at desktop width and 375 px: no console errors and no horizontal overflow.
- Kukkiwon's two pages were re-read on 19 November 2026 for the narrative.
- **Release preview (port 8899, this branch):** all 11 timeline events and the 1946–1960 period entry render; the footer link is present on the page; there's no inline script, no console error and no horizontal overflow.

### Root QA (19 November, independent review)
- **Focused tests:** 28/28 history and site tests.
- **Layout:** compared outside the footer against HEAD, all 66 existing HTML pages have only the footer change.
- **Browser, at desktop width and a real 390×844:** no horizontal overflow; both photos load; all 11 timeline entries show; the anchor headings clear the header; the source and licence credits are visible.
- **Source:** the primary Kukkiwon page was rechecked live for the modern-history narrative.
- **CI:** Batch 39's main CI has also passed.

## Batch 41 — referee guide and 3D referee practice (item 64)

### Change
- **New page `/referee-guide.html`**: a sourced, plain-language guide to officiating sparring. Every rule statement names its edition, article and printed page. It links to the matching practice scenario.
  - **Who decides what:** the PSS, the judges, the centre referee, the Review Jury and the technical assistant (WT Art. 12.2.3, 13, 20.3.2).
  - **How a bout runs:** WT Art. 7 and 10.1–10.4.7.
  - **What scores:** permitted techniques and areas (Art. 11) and the Art. 12.3 table of 1, 2, 3, 4 and 6 points, each with who decides it.
  - **Penalties (Gam-jeom):** the Art. 14 acts with their Explanations (printed pp. 37–40). An ordinary Gam-jeom gives the opponent 1 point. In the last ten seconds only the cases the rules list give 2; there is no blanket doubling.
  - **Commands:** Art. 10.4, and Art. 18 Explanation #2.
  - **Stoppages, knock-downs and reviews:** Art. 17–19 and Art. 21, the IVR and the technical card. The guide says plainly that it gives no medical or return-to-play advice.
  - **AAU youth and Grassroot divisions:** AAU Art. 9, 11, 22 and 23, compared in a table. A note under the table lists the two WT rules that don't carry over to youth safety divisions: there's no 8-count for any head kick (one strong enough to need it is excessive; strong trunk kicks keep the standard knock-down procedure, AAU Art. 22.3.7 and 22.3.9, p. 60), and there's no fall exception after a turning kick to the head (Gam-jeom for falling, Art. 22.4.3–22.4.4, p. 60). The WT fall-exception row and the WT count rule both link to this note.
  - **Becoming a referee:** WT Art. 20.3.1 and real clinic routes: USATKD University's kyorugi referee courses, AAU Taekwondo, and WT's rules directory.
- **New page `/referee.html`**: watch an exchange in a 3D arena, choose what the scoreboard should show, then see the answer, who decides it and the article that says so.
  - **Arena:** an octagonal mat (apothem 4.0 m) whose boundary line turns red when a foot crosses it. Two fighters built from the lesson avatar's detailed rig, each in a continuous trunk protector (hogu) worn over the jacket, plus a head protector on the head bone. The hogu is a moulded shell around the front, ribs and back, with armholes and dark binding along its top and bottom edges.
  - **Playback:** play, pause, replay, a scrubber, speeds of 0.25× (the default), 0.5× and 1×, side, referee and overhead views, and drag/pinch orbit. A gold flash marks contact. The round clock is overlaid.
  - **For each scenario:** the evidence the officials have (round clock, PSS, judges), a numbered text description that is enough to answer without the 3D view, and three or more answers. Feedback lists each award with who decided it and the citation, names the fighter (for example "Gam-jeom to Hong (red)"), and links the source rulebook.
  - **Statements:** "Practice only": it is not certification or an official interpretation, and TKDflow is not affiliated with World Taekwondo or AAU Taekwondo. Progress is kept only in this browser (`localStorage`).
- **Code:**
  - `js/referee/rules.js`: three dated profiles, the citation strings, and `decide(profile, facts)`.
  - `js/referee/fighter.js`: posing and contact geometry, including the trunk-protector shell. The arena draws that shell, the scoring maths tests against it, and the strikes aim at it.
  - `js/referee/scenarios.js`: the 16 exchanges.
  - `js/referee/framing.js`: camera framing. It fits each scenario's camera to both fighters across the whole exchange.
  - `js/referee/arena.js`: the three.js scene, using the vendored three.js r187 and the lesson avatar's `avatar-core.js`.
  - `js/pages/referee.js` and `css/referee.css`.
  - There are no new accounts, database tables, permissions, credentials or third-party scripts. The pages run under the existing CSP.
- **Profiles and sources:**
  - **WT 2026:** WT Competition Rules and Interpretation, in force as of 1 November 2026 (the PDF hosted by the Dutch federation, plus WT's rules directory).
  - **AAU youth:** light-contact safety rules for all belts aged 5–11 and colour belts aged 12–17.
  - **AAU Grassroot:** no head contact.
  - Both AAU profiles come from the AAU Taekwondo Competition Rules & Regulations Handbook, effective 11-01-2026, linked from AAU Taekwondo's Rules menu.
- **Where to find it:** `layout/pages.json` (both pages, key `events`, in the sitemap), footer links "Referee guide" and "Referee practice", two Competitions posts in `data/community.json`, and a paragraph in `first-tournament.html`. The other pages change in the footer only (`sync-layout`).

### Scenarios (16, deterministic; Chung is blue, Hong is red)
| Profile | Scenario (clock) | Scoreboard and who decides |
|---|---|---|
| WT 2026 | Roundhouse kick to the trunk (0:42) | Blue +2, PSS |
| WT 2026 | Roundhouse kick to the head (0:51) | Blue +3, PSS |
| WT 2026 | Straight punch to the trunk (1:15) | Blue +1, PSS and judges |
| WT 2026 | Back kick to the trunk (0:33) | Blue +4: 2 by the PSS, plus 2 turning points by the judges |
| WT 2026 | Spinning kick to the head (0:58) | Blue +6: 3 by the PSS, plus 3 turning points by the judges |
| WT 2026 | A light trunk kick the sensors don't register (0:47) | No points, and no turning bonus |
| WT 2026 | A punch to the head (0:36) | Gam-jeom to Hong: Blue +1, referee |
| WT 2026 | A punch to the head with 6 seconds left (0:06) | Still Blue +1: not one of the doubled cases |
| WT 2026 | A kick to the thigh (1:04) | Gam-jeom to Hong: Blue +1, referee |
| WT 2026 | Stepping over the boundary line (0:40) | Gam-jeom to Hong: Blue +1, referee |
| WT 2026 | Stepping over the line with 8 seconds left (0:08) | Blue +2, referee (WT 14.4.1.1 / 12.3.5.1) |
| WT 2026 | Pushed over the line (0:25) | Gam-jeom to Chung for the prolonged push: Red +1; Hong's crossing isn't penalised |
| WT 2026 | A scoring back kick, then a fall (0:19) | Blue +4; the fall after a scoring turning kick isn't penalised |
| AAU Grassroot | A kick that touches the head (0:30) | Gam-jeom to Chung: Red +1, referee |
| AAU Grassroot | A head kick that misses (0:44) | No points; the referee may give a verbal warning |
| AAU youth | A colour belt's light spinning kick to the head (0:50) | Blue +3, judges |

### Tests (`tests/referee.test.mjs`, new, 14)
- **Answers:** each scenario's answer matches a table written from the rule texts independently of `rules.js`. Exactly one option is correct, and every award cites an article and a printed page.
- **Rules, profile by profile:**
  - **WT points and who decides:** a punch needs the PSS and the judges, and there's no turning bonus without a PSS score. On a turning kick the PSS scores the kick and the judges add the turning points.
  - **WT penalties:** ordinary Gam-jeom gives the opponent 1. In the last ten seconds, crossing the boundary, falling and avoiding give 2 (10 s doubles, 11 s doesn't). Pushing, attacks below the waist, hand-to-head and misconduct stay at 1. The two exceptions (the pushed-out fighter, and a fall after a scoring turning kick) are explained with their page citations rather than skipped.
  - **AAU youth:** a light head kick scores 3, with no turning bonus to the head; a turning kick to the trunk still scores 4.
  - **AAU Grassroot:** any head touch is misconduct (opponent +1), and a miss draws a verbal warning only.
- **Geometry (measured at 60 fps):**
  - Every contact lands on the stated scoring area at the stated moment, and nothing touches earlier:
    - kicks and punches: 1.2 cm into it at the contact time;
    - the light trunk kick the sensors don't register: 0.4 cm;
    - the AAU light head contacts: 0.6 cm;
    - the kick below the waist: 2.7 cm.
  - Each strike is 70–108 cm away a quarter second earlier.
  - The Grassroot miss passes 10.0 cm from the head.
  - The boundary crossings come from the sole points: Hong (red), right foot, at 1.417 s (both boundary scenarios) and at 1.442 s when pushed, within 50 ms of the stated times. The other fighter stays inside.
  - Both hands stay on the trunk protector for the whole prolonged push (0.9–1.9 s).
  - The falling fighter is up at the kick and down by 2.15 s (pelvis 0.42 m).
- **Fighters:** bone lengths stay constant, feet stay on or above the floor, the bodies never overlap, and every replay is deterministic in any order.
- **Text alternative:** every scenario can be answered from its text alone. The clock, the PSS result and the judges' view are stated, and the last-ten-seconds scenarios say so in words.
- **Page:** labelled controls, a live feedback region, the practice-only statement, the source links and the clinic routes.
- **Guide:** covers the officiating basics with article and page references, avoids certification and medical advice, and links the practice scenarios. Both pages are linked from the footer, the tournament guide and Community.
- **AAU youth rules:** they don't inherit WT's count or its fall exception.
  - The same turning head kick and fall gives Blue +6 with no penalty under WT, but Blue +3 and Red +1 under AAU youth, cited to Art. 22.4.3–22.4.4, p. 60. In the last ten seconds that fall gives Red +2.
  - `countAfter()` gives no count for a youth head kick (excessive, Art. 22.3.7) and the standard procedure for the trunk (Art. 22.3.9).
  - Cases the sources here don't settle are refused rather than guessed.
  - The WT fall scenario is now decided by the profile instead of being pre-cleared.
  - The guide's note and both cross-links are checked.
- **Trunk protector:**
  - **Proportions:** 38–44 cm wide (widest at the chest), 31.5 cm tall at the front, lower at the armholes, with a flat front.
  - **Drawn shell matches the scoring surface:** every drawn vertex, placed as the arena places it, lies within 2 mm of the scoring surface in all scenario poses.
  - **The real jacket stays inside:** the shipped avatar is skinned on the CPU and the jacket's torso vertices checked at 0.1 s steps through every exchange (356,283 positions over 1,024 frames). The worst is 1.2 mm, and the front panel is 2.07 cm over the jacket.
  - **The test catches the old problem:** checked the same way, the old ellipsoid had 162,481 of those jacket positions outside it, so the test fails on the old gear.
- **Page:**
  - Zoom in, Zoom out and Reset view buttons.
  - The heading can take focus, with header clearance.
  - The first scenario names Hong's red trunk protector, and "blue-and-red" appears nowhere.
- **Camera framing:** both whole fighters stay in the picture at zoom 1, with a margin.
  - **Landmarks:** at every 1/30 s of all 16 scenarios, every landmark (soles, ankles, knees, hands, head and trunk protectors) stays within 0.9 of the picture edges. This holds for the default view, every preset, and an orbit sweep (every 30° of azimuth at elevations of 2°, 16°, 40° and 70°).
  - **Real meshes:** the shipped avatar is skinned on the CPU (skin, dobok, belt, hair, plus the drawn hogu) at 0.4 s steps, contact, the end and the fall. Seen from the default, side, referee and overhead views, no vertex passes 0.97 of the picture edge; the worst is 0.898.
  - **Catches the old bug:** the same check on the old camera (4.6 m from the midpoint of the pelvises) finds crops, so the test fails on it.
  - **Arena wiring:** the arena uses this framing, the presets and Reset view return to zoom 1, and zooming out stays inside the fog.
- **Full suite:** 844/844 (`npm run check` on `feat/referee-training-2026-11-19` from main `c97965e`), and `git diff --check` is clean (rerun after the review fixes below). History, the footer and Batch 39's motion files are unchanged apart from the two footer links.

### Browser check (Claude, release preview on port 8899)
- **Desktop:**
  - The 0:08 boundary scenario plays in real time: the crossing is at 1.60 s at 0.25× and the clip ends at 3.20 s.
  - Answering "Blue +2" gives Correct, with the referee as decider and the WT 14.4.1.1 / 12.3.5.1 citations. From overhead, the red line marks Hong's crossing.
  - No console errors.
- **Phone (375 × 812):**
  - Neither page scrolls sideways.
  - The arena is 343 × 193 and loads. From the side, the spinning kick meets the head protector at 1.50 s. From the referee's position, Hong's body hides the contact, as it would in a real ring, and orbiting shows it.
  - The guide's three tables fit at 343 px.
  - All 16 practice links in the guide open real scenarios.
- **Fixes from this check:**
  - Feedback now names the penalised fighter.
  - On narrow screens, the evidence list stacks its labels above the answers.
  - An unused helper was removed from the boundary test.

### Review fixes (root's first simulator review, 19 November)
- **Trunk protectors were buried in the jacket.** The ellipsoid gear (radii 19.5 × 21.5 × 17.5 cm, centred 3.5 cm forward) showed only red patches and a blue oval through the dobok, as root's screenshot showed.
  - **Measured:** ray-casting the skinned jacket on the posed rig showed why. The jacket is flat in front, about 16.5 cm ahead of the pelvis, about 17–19 cm to each side and wider at the lats. The ellipsoid tapered top and bottom, so only its middle band cleared the jacket.
  - **Fitted:** height by height, with about 2 cm of clearance, a superellipse with a squarer front (exponent 6) and a rounder back (3.5), around an axis 4 cm in front of the pelvis. It runs from just above the belt (4.5 cm) to 36 cm at the front, 22 cm at the sides and 32 cm at the back.
  - **Shared:** the shell is placed each frame with the scoring transform (pelvis, chest yaw, lean) instead of a rest-pose bone offset, and the strikes aim at it.
  - **Solver fix:** a back kick then bounced between two poses: a near-horizontal leg turns its knee as the foot moves, so the heel overshoots. `landOn` now halves its steps after four passes (up to 48 passes, still deterministic). Every contact lands where it is meant to.
- **Heading focus:** `rf-title` had no `tabindex`, so the focus call did nothing.
  - It is now `tabindex="-1"`, focused with `preventScroll`, and its container is scrolled into view with `scroll-margin-top: 84px`, instantly when reduced motion is set.
  - Checked at 375 × 812: Next scenario puts focus on the new heading, 15 px below the 69 px header.
- **First scenario text:** "the blue-and-red scoring area of Hong's trunk protector" is now "Hong's red trunk protector".
- **Zoom without pinching:** Zoom in (×1.25), Zoom out and Reset view (side view, 4.6 m) buttons, in a labelled group. The hint mentions them.
- **AAU youth distinctions:** the handbook's printed p. 60 (Art. 22.3.7, 22.3.9 and 22.4.3–22.4.4) is added to the guide, the rules engine and the tests, as above. The guide still gives no medical or return-to-play instructions of its own.
- **Browser (release preview, port 8899):**
  - **Desktop:** both fighters wear a continuous hogu over the jacket, wrapping round the back, with armholes and binding. The roundhouse kick visibly meets Hong's red protector at 1.50 s, with the gold flash. Zoom in, the referee view and Reset view all work.
  - **Phone (375 × 812):** the protectors read clearly, the zoom buttons wrap onto their own row, and Next scenario brings the new heading into view.
  - **Console:** no errors from the page.

### Review fix 2 (root, 19 November): the camera cropped a fighter's feet
- **The problem:** the camera stood 4.6 m from the midpoint of the two pelvises, whatever the exchange. From the referee's angle (azimuth 35°, elevation 22°) the near fighter's feet left the picture. Root's independent projection found 20 cropped landmarks, the worst being the `wt-boundary` end at NDC y −1.096.
  - **Reproduced:** on the shipped meshes, the old camera crops in 24 scenario/view/time combinations, the worst being `wt-boundary` at 3.20 s, referee view, y −1.125. Root's other example, `wt-trunk-kick` at rest, is among them.
- **The fix, in `js/referee/framing.js`:**
  - Each scenario gets one framing: both fighters' landmarks sampled every 1/30 s through the whole exchange, and the middle of their bounding box as the look-at point. The camera no longer follows the pelvises.
  - For any azimuth and elevation, the camera stands just far enough back for every landmark to stay within 86% of the picture's half-width and half-height. Typical distances are 3.8 m side-on, 5.4–5.9 m from the referee's position and 2.8–3.3 m from overhead.
  - The default view, the presets, Reset view and plain orbiting all use this zoom-1 distance. Pinch, the wheel and Zoom in/out change only a zoom factor (0.6–3), so only deliberate zooming in can crop.
  - Motion, timing and scoring are unchanged.
- **Small fix found during the check:** when the fighters finished loading, the page reloaded the scenario and reset a scrub made while loading back to 0 s. The arena now just redraws.
- **Browser (port 8899):**
  - At desktop width, from the referee's angle: Hong's (red's) right foot at the end of `wt-boundary` is in the picture with a margin, and the fall in `wt-turning-then-fall` is framed whole.
  - At 375 × 812, from the referee's angle at 1.60 s of `wt-trunk-kick`: both fighters are whole, feet included.
  - No console errors.
- **Root confirmed:** the protector appearance is approved, heading focus settles 107 px below the top at desktop width, and the zoom and reset buttons work.

### Root QA (19 November, final independent review: passed)
- **Focused tests:** 43/43 (referee, site and history).
- **Through the real interface:** all 16 correct answers give the right score, the official who decides it, and the source feedback. A deliberately wrong answer also explains the correct result.
- **Camera:** an independent three.js projection checked 239,360 landmarks at 60 fps across all 16 scenes and eight view angles. There are no crops, and the worst NDC magnitude is 0.8554.
- **Desktop:** at the end of the boundary scenario, from the referee's view, both fighters are whole.
- **Phone (390 × 844):** Next scenario focuses the new title below the header, both fighters fit, and nothing overflows.
- **Guide:** eight sections. All three tables fit at 358 px, and the AAU youth count and fall distinctions are present.
- **Layout:** of the 66 existing HTML pages, all except the tournament guide have only footer changes. The tournament guide's two new links were reviewed. The motion and avatar files are unchanged.

### Known limits
- **Fighters:** they're posed from a small set of keyed stances and techniques on the lesson rig. There's no foot roll or weight shift beyond the keyed poses, and no physics.
- **Contact:** shown geometrically. Sensor thresholds and impact force aren't modelled; the PSS result is part of each scenario's evidence.
- **Protector fit:** the shell is fitted to the lesson character's jacket. The elbows in guard can touch its sides, as they do in real sparring. During the fall, one transient frame comes within 1.2 mm of the shell.
- **AAU youth:** there is no paired youth turning-head-kick-and-fall scenario yet. The rule is in the engine, the guide and the tests, and the scenario could be added later.
- **Rule coverage:** the scenarios cover common decisions only. They don't include knock-downs, the IVR or the technical card.
- **Practice only:** this isn't certification or an official interpretation. Rulebooks change, and the on-screen edition dates say which ones were used.

## Batch 42 — a visual video gallery (item 65)

### Change
- **New page `/videos.html`, "Watch and learn"** (`layout/pages.json` key `forms`, in the sitemap), with `css/videos.css` and `js/pages/videos.js`.
- **Seven reviewed videos, shown as a visual gallery.** Each card has:
  - the publisher's own YouTube thumbnail (the page's `og:image`, `i.ytimg.com/vi/<id>/maxresdefault.jpg`), with a running-time badge;
  - type and tradition tags, and a plain-language heading;
  - the video's original title (the Kukkiwon titles in Korean with their English) and an accurate publisher label;
  - two or three concise "Watch for" notes;
  - a red "Watch on YouTube" button, and a link to the matching TKDflow page.
- **Thumbnails:** loaded remotely with `width="1280" height="720" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt=""`. The thumbnail is also a mouse shortcut to the video, but it is `aria-hidden` and `tabindex="-1"`, so keyboard and screen-reader users get the one real link: "Watch on YouTube", named after the video for screen readers.
- **If a thumbnail can't load:** it is hidden, and the 16:9 frame shows a navy play panel with the running time. This also happens when YouTube serves its small grey placeholder (width under 320 px). Without JavaScript the panel sits under the image. The watch link works either way.

| Card | Original title | Publisher label | Time | Context | Onward |
|---|---|---|---|---|---|
| Taegeuk 1 (`__4pltpaPJo`) | 유급자 품새 교육 \| 태극 1장 (Color Belt Poomsae Education \| Taegeuk 1 Jang) | Kukkiwon, official channel | 21:11 | — | Taegeuk Il Jang lesson |
| Taegeuk 8 (`djVVT-fnZkw`) | 유급자 품새 교육 \| 태극 8장 (Color Belt Poomsae Education \| Taegeuk 8 Jang) | Kukkiwon, official channel | 17:55 | — | Taegeuk Pal Jang lesson |
| Koryo (`mGa60JDtWmg`) | KORYO | Kukkiwon, official channel | 22:04 | — | Koryo lesson |
| Chon-Ji (`EZGF16nVOlU`) | Chon-Ji Tul (천지틀) - Performed by Master Pak Chung Song 박충성 | ITF HQ channel, linked from the Czech Taekwon-Do ITF federation | 0:48 | — | Chon-Ji lesson |
| Songahm 1 (`wJG2mmTkFOk`) | Songahm 1 - White Belt Form | ATA Martial Arts Master T, independent instructor | 7:56 | — | Songahm 1 lesson |
| Tokyo 2020 (`p4N1jaCAB3U`) | Taekwondo Mens +80kg Gold Medal bout \| Tokyo 2020 Replays | Olympics, official channel | 26:28 | Held in 2021 under the rules of the time, so the scoring differs from today's. | Referee guide |
| Dakar 2026 (`9h6tDY4GB54`) | Jordan Win a THRILLER! \| Taekwondo Mixed Team Final #Dakar2026 | Olympics, official channel | 10:38 | A mixed-team format with substitutions, shown as edited highlights. | Referee practice |

- **Titles:** the original titles come from each page's `og:title` (root's `research/gallery-thumbnail-sources.json`), with decorative emoji left out. Correction: the first draft gave the Tokyo title as "Men's"; the published title is "Mens".
- **Time stamps in the notes:** Taegeuk 1 at 9:25, 11:35 and 15:44; Taegeuk 8 at 3:54 and 13:14; Koryo at 3:06, 4:05 and 6:51; Songahm 1 from 2:20; Tokyo's round 1 at 2:54. The Dakar card has none.
- **Shorter copy:** the long hosting, affiliation and review note and the repeated caption warnings are removed. Only Tokyo and Dakar carry a brief context line. Master T's actual channel name is kept and labelled as an independent instructor, with nothing implying ATA endorsement.
- **Security policy:** `img-src` is now `'self' data: https://i.ytimg.com`. Every other directive is unchanged: script, style, font and connect sources, `frame-ancestors 'none'`, `object-src 'none'`, no `frame-src`, no iframes, and no new scripts. `tests/site.test.mjs` pins the full directive map.
- **About:** the public-lessons privacy paragraph keeps its self-hosted fonts, animations, audio and scripts sentence and adds one: "The preview images on the video gallery are supplied by YouTube, and watching a linked video opens YouTube, under YouTube's own privacy practices." There is no consent flow or banner.
- **Filters:**
  - **Show:** All, Forms or Sparring. **Tradition:** All, WT/Kukkiwon, ITF or ATA.
  - Each is a labelled group of `aria-pressed` buttons, with a polite live count.
  - A combination with no matches offers "Show all videos". Without JavaScript the filter bar stays hidden and every card shows.
- **Where to find it:** a "Video gallery" footer link after "History of taekwondo", one sentence in the history page's Watch section, the link from About, and a link back to the history page. Every other page changes in its footer only.

### Tests (`tests/videos.test.mjs`, new, 6; `tests/site.test.mjs` CSP map updated)
- **Seven cards, as published:** exactly seven, against a table written from the source notes and `og:` data (id, original title, publisher, running time, type, tradition). Each card's thumbnail markup and URL, its one "Watch on YouTube" action, and its onward page are checked. Notes are two or three, under 120 characters each, with no quotation marks, and every time stamp falls inside the video.
- **Labels and copy:** the ITF HQ and Czech federation label. Master T is labelled an independent instructor and never official. Only Tokyo and Dakar carry context, in their exact brief wording. The Dakar card has no time stamp other than its running time. The long note and caption warnings are absent.
- **Outside requests:** seven `i.ytimg.com` images, all lazy-loaded with no referrer. No iframe, embed or extra script. External hosts are limited to i.ytimg.com, youtube.com and taekwondo.cz. YouTube appears in the CSP once, in `img-src`, with the other directives intact. No other page loads an outside image.
- **Thumbnail failure:** `thumbFailed` treats a broken image or YouTube's 120 px placeholder as failed and an image still loading as not failed. The handler is wired, and the frame keeps its size, colour and play glyph.
- **Filters and links:** the counts for every combination, the empty state, the manifest, sitemap, footer and history links, and About's privacy sentence.
- **Full suite:** 850/850 (`npm run check` on `feat/video-gallery-2026-11-19` from main `8c7002e`), and `git diff --check` is clean. The published referee and guide pages change by their footer line only; the motion, avatar and referee scripts are unchanged.

### Browser check (Claude)
- **Release preview (port 8899, restarted by root, enforcing the new policy):**
  - The policy reads `img-src 'self' data: https://i.ytimg.com` with every other directive unchanged.
  - All seven thumbnails load at 1280 px with `no-referrer`, and i.ytimg.com is the only outside host contacted.
  - About shows the new sentence.
- **Same branch on a temporary server (port 8924, now stopped):**
  - **Desktop (1280 × 900):** a three-column visual grid with no overflow or console errors.
  - **Failure test:** pointing two cards at a missing thumbnail and a non-existent video got YouTube's 120 px placeholder. Both were hidden, the navy play panel with the running time showed instead, and "Watch on YouTube" still pointed at the right video.
  - **Phone (375 × 812):** filtering to Sparring shows two cards ("Showing 2 of 7 videos."), with no overflow, full-width thumbnails, the brief Tokyo context, and the watch button above the referee-guide link.
- **First version (link-only cards, before root's review):** the filters (Forms with ATA gives Songahm 1 only; Sparring with ITF gives the empty state and reset) and the 375 px layout were checked on 8899 and the scratch overlay.

### Release correction
- **About:** the privacy notice's "Last updated" date changes from 17 to 19 November 2026, because this release adds the YouTube preview-image sentence to that notice.

### Root QA (19 November, independent: passed)
- **Filters:** all 12 combinations of type and tradition passed.
- **Thumbnails:** all seven actual thumbnails loaded at 1280 px. With i.ytimg.com blocked, all seven showed usable fallback panels, and their original watch links still worked.
- **Phone (390 × 844):** the layout fits with no horizontal overflow.
- **Reviewed:** the privacy paragraph, the history-page link, and the CSP change (image host only).
- **Checks:** root's focused checks passed 42/42, and the server tests 12/12.

### Known limits
- The thumbnails come from YouTube and the videos open on YouTube; About says so.
- Time stamps rely on the source notes and transcripts. Root sampled parts of each video, not every minute.
- Publishers can rename videos or change thumbnails; the cards show the titles as of 19 November 2026.

## Batch 43 — consistent camera wording and links to the new learning pages (item 66)

### Audit (19 November, the public site after Batch 42)
- **Fixed-view wording:**
  - The 22 data-driven lessons said "Use the camera views and slow playback…".
  - All 23 lesson descriptions ended "…slow playback and camera views".
  - The home "Study a form" card and the Community "forms" post also said "camera views".
  - The 22 lessons said "Camera labels refer to the starting stance", but the direction labels exist only in the screen-reader camera status.
  - The player and Start here already describe the turnable camera correctly. A forum guide's "two camera views" means two viewpoints, which is still accurate, so it is unchanged.
- **Stick-figure imagery: none found on the public site.**
  - Every lesson thumbnail (`assets/forms/*.webp`) and the social images (`og-animation-v2.png`, and `og-image.png` with `social-card.svg` at the legacy address, pinned by `tests/site.test.mjs`) show the current full-body 3D character.
  - The inline SVGs are interface icons.
  - The procedural avatar appears only if the detailed model fails to load.
- **Links to the new pages, from page content outside the header and footer:**

| Page | Before |
|---|---|
| History | 1 (the gallery) |
| Video gallery | 2 (About, History) |
| Referee guide | 3 (the tournament guide, referee practice, the gallery) |
| Referee practice | 3 (the same three) |

  For comparison, Start here had 31 and Find a technique 28.

### Change
- **Lessons (22 pages):**
  - "Turn the camera to any side and slow the playback to study stance, target height and movement paths."
  - "Camera directions, such as front or left side, are measured from the starting stance." These are the words the camera announces.
- **Descriptions (23, `layout/pages.json`, synced into the meta tags):** "…slow playback and a camera you can turn to any side".
- **Home:**
  - The "Study a form" card says "a camera you can turn to any side" and adds "Watch the video gallery →".
  - The Events card adds "Referee practice →".
- **Start here:**
  - The styles section ends: "For how these organizations came about, read the short history of taekwondo. To see each style performed, open the video gallery."
  - The tournament section adds: "To understand sparring scores and penalties, read the referee guide and try the 3D referee practice."
- **Forms library:** the hero tools list adds "Video gallery" and "History of taekwondo".
- **Events:** the first-tournament notice adds "Learning how sparring is scored? Read the referee guide or try the 3D referee practice."
- **Community:** the "forms" post says "a camera you can turn to any side".
- **Not changed:** account permissions, the age policy, founder facts, About, the lesson player, the motion, referee and gallery code, and the CSP.

### Tests (`tests/consistency.test.mjs`, new, 2)
- **Camera wording:** no public page, page description or Community post says "camera views" or "Camera labels". All 23 descriptions say "a camera you can turn to any side". The 22 data-driven lessons carry both new sentences, and their direction words match those in `camera-rig.js`. Home uses the new wording.
- **Links:** History, the video gallery, the referee guide and referee practice each have at least three in-content links, from the named hub pages, at the stated places.
- Both tests fail on the Batch 42 tree (it still has "camera views", and History has one in-content link).
- **Full suite:** 852/852 in the overlay, and `git diff --check` is clean.
- **Integrated (19 November):** applied on `feat/site-consistency-2026-11-19` from main `9f3c1ed` (Batch 42 published) using the 31-file allowlist; the patch applied with no fuzz, and the changed files are exactly the allowlist. `npm run check` passes 852/852, `git diff --check` is clean and the layout is in sync. On the release preview (port 8899), the new sentences and links appear on Start here, Home, Events and the Koryo lesson (including its meta description), with no console errors.

### Browser check (overlay preview, port 8925)
- **Start here:** both new sentences appear in the styles and tournament sections.
- **Home:** the cards show "Watch the video gallery →" and "Referee practice →".
- **Events:** the notice shows the referee links.
- **Forms library:** the tools list shows "Video gallery" and "History of taekwondo".
- **Koryo lesson:** shows both new camera sentences.
- No horizontal overflow on desktop or at 375 px, where the forms tools wrap onto three lines.

### Root QA (19 November, independent review: passed)
- **Focused checks:** 38 (consistency, site and contrast tests).
- **Phone (390 × 844):** the forms library tools fit with no overflow, and the video gallery link opens the gallery. The home card links fit.
- **Desktop:** Start here has all four new in-content links, and Events has both referee links.
- **Koryo:** the camera guidance matches the player.
- **Overflow:** none on any of these pages.
- **Evidence:** `outputs/tkdflow-ten-hour-session-2026-11-18/batch-43-site-consistency`.

### Known limits
- The audit looked for wording, imagery and links. It didn't review page layouts beyond the edited spots.

## Batch 44 — a referee Practice view (item 67)

### Design
- **Watch and call in one place.** Desktop: from 960 px, the arena sits on the left and a compact call panel on the right. The panel holds the evidence (round clock, PSS, judges), the question with its answers in a 2 × 2 grid, the feedback, the step-by-step text description, and Next. The arena column stays in view while you scroll, so the feedback and the citations can be read beside the replay.
- **A scenario bar instead of a long list first.** The scenario's profile and title, Previous and Next, "Scenario n of 16" and Focus mode. All 16 scenarios follow below the practice area as a grid of tiles, numbered, with their profile, and marked ✓ or ✗ once answered.
- **Phone in about one screen.** One column: the bar (arrow-only Previous and Next on phones, still named "Previous scenario" and "Next scenario"), the whole arena, playback with a full-width scrubber, one row of camera and zoom buttons, the evidence and the answers. The drag hint is hidden on phones.
- **Optional focus mode, like the lesson Study view.** The practice area fills the window and the rest of the page is hidden, so keyboard focus stays in it. The arena is sized from the window height, keeping 16:9, so the whole arena and its controls fit together. The toggle reports `aria-pressed`. Escape or the toggle leaves, restoring the scroll position and returning focus to the toggle.
- **Never cropped.** The canvas is 16:9 in every mode, the shape the Batch 41 camera framing fits both whole fighters into. No layout rule changes its height or aspect.
- **Progress, kept in this browser and said so.**
  - The line under the panel shows, for example, "1 of 2 answered correctly, 2 of 16 tried", followed by a note that changes with what storage actually did:
    - "Saved in this browser only."
    - "Some saved answers couldn't be read and were removed; the rest are saved in this browser only."
    - "Earlier progress in this browser couldn't be read, so it was reset."
    - "This browser isn't saving progress, so it lasts only until you leave the page."
    - "Progress cleared from this browser."
  - **Reset progress** opens an inline confirmation ("Clear your answers for all 16 scenarios from this browser? This can't be undone."), with focus on the safe choice, "Keep progress". Escape keeps the progress. A status message announces the outcome, and focus returns to the reset button, or to the scenario heading once there is nothing left to reset. The button is disabled when there is nothing to reset.
- **The text description:** now "What happens, step by step", a disclosure in the panel. The canvas is described by its steps (`aria-describedby="rf-steps"`). The disclosure opens by itself if the 3D view can't load.

### Change
- `referee.html`: the practice section (bar, stage, panel, progress), and the scenario list moved below it. Every existing control id is kept.
- `css/referee.css`: the two-column practice layout, the compact panel, the phone rules and focus mode.
- `js/pages/referee.js`: Previous and Next, the count, focus mode, the reset confirmation, and progress through the new module. The rules, the feedback and the arena calls are unchanged.
- `js/referee/progress.js` (new): `sanitize` keeps only the 16 known scenario ids with true/false results. `createProgress` reads, repairs, probes and writes storage and reports its status; `progressText` and `savedNote` give the labels. It uses the same storage key (`tkdflow.refereePractice.v1`) and stores only `{scenarioId: true|false}`, with nothing sent anywhere.
- **Unchanged:** the rules engine, the scenarios, the fighters, the arena, the framing, the scoring and all 16 answers. There are no new requests, accounts or scripts.

### Tests (`tests/referee-practice.test.mjs`, new, 6; `tests/referee.test.mjs` unchanged and passing)
- **Validation:** known ids with booleans survive. Unknown ids, non-boolean values, arrays, numbers, strings, unreadable JSON and `__proto__`/`constructor` keys are dropped, with no prototype pollution.
- **Recovery and honest labels:**
  - **Healthy storage:** valid answers load, recording writes clean JSON, and invalid records never reach storage.
  - **Damaged data:** partly unreadable data is repaired and rewritten; wholly unreadable data is cleared.
  - **Blocked or missing storage:** the page works for the visit, and the label never claims saving.
  - **A write that starts failing later:** the label changes at once.
  - **Reset:** it clears storage, or only the current visit if storage refuses.
- **Labels and privacy:** the exact label texts. There are no fetch, beacon, cookie, sessionStorage or Supabase calls in the practice code, and all storage goes through `progress.js`. Every scenario still has exactly one correct answer from the rules.
- **Layout:** the practice parts appear in reading order, the scenario list comes after them, the desktop grid keeps the arena in view, the answers are a 2 × 2 grid, and the phone rules apply. The arrow-only buttons keep their full names.
- **Framing:** every canvas rule keeps 16:9, no viewer rule sets a height, and focus mode sizes the arena by width from the window height.
- **Focus mode and reset:** the toggle markup and `aria-pressed`, the hidden page parts, the fixed practice area, scroll restoration, and Escape (closing the confirmation first, then leaving focus mode and returning focus to the toggle). The labelled confirmation, focus on the safe choice, the status announcement, the disabled reset when there is nothing to reset, and no `window.confirm` or `alert`.
- **3D fallback:** if the arena reports an error, or the browser has no WebGL, the step-by-step text opens by itself.
- **Naming:** the progress method is `setResult`, not `record`, because `tests/age-nav.test.mjs` treats any `.record(` call in a page script as an age-eligibility writer, and that test is left unchanged.
- **Full suite:** 856/856 in the overlay, `git diff --check` is clean, and the layout is in sync.

### Browser check (Claude, overlay on port 8926)
- **Desktop (1280 × 800):**
  - The arena (814 × 458) sits beside the panel, with the evidence, the question and all four answers visible at once.
  - Answering "Blue +2" in the trunk kick showed "Correct." beside the arena, and storage held only `{"wt-trunk-kick":true}`.
- **Reset, by keyboard:**
  - Enter opened the confirmation with focus on "Keep progress". Escape kept the progress ("Progress kept.") and returned focus to Reset.
  - "Clear progress" removed the key, re-enabled the answers, cleared the ✓ marks, announced "Practice progress cleared from this browser.", disabled Reset and moved focus to the heading.
- **Malformed storage:**
  - Mixed data (`wt-punch: "yes"`, an unknown id) kept `wt-head-kick ✓` and `wt-boundary ✗` and rewrote storage cleanly.
  - `{not json` was cleared, and the label explained what happened.
- **Focus mode (desktop):** the header and footer are hidden and the arena is 878 × 494 (1.778). The playback controls end at 622 px and the answers at 347 px of 800. Escape returned focus to the toggle and the scroll position to 300 px.
- **Phone (390 × 844), normal view:** the first layout left the second row of answers 40 px off-screen. With the arrow-only scenario buttons and one camera row, the heading, the whole arena, playback, camera, evidence and every answer fit, the answers ending at 792 px. There is no overflow.
- **Phone, focus mode:** the arena is 366 px wide at 16:9, and everything through Next scenario fits in 844 px.

### Root QA (19 November, independent: passed)
- **Focused tests:** 33 (referee practice, referee and contrast).
- **Desktop (1512 × 828):** the whole canvas and the decision controls are visible together.
- **Phone (390 × 844), focus view, all 16 scenarios:** every camera control fits, there is no horizontal overflow, and every answer button's bottom edge falls between 702 and 771 px.
- **Feedback:** the first correct answer showed the source feedback.
- **Progress:** a reload keeps the result. Cancelling the reset, or pressing Escape, keeps it. Root confirmed clearing its own single test answer, and after a reload all 16 showed as untried.
- **Focus mode:** Escape returns focus to the Focus mode toggle.
- **Evidence:** screenshots and JSON in the `batch-44-referee-practice` artifact directory.

- **On the integrated branch:** root's checks pass 56/56 (referee practice, referee, site and contrast). Root independently confirmed the exact six-file allowlist, that the product and test files are byte-identical to the reviewed scratch, and that the rules, scenarios, arena, fighters and framing are unchanged.

### Integration (19 November)
- **Applied:** on `feat/referee-practice-view-2026-11-19` from main `f1211ce` (Batch 43 published), using the six-file allowlist. The patch applied with no fuzz, the changed files are exactly the allowlist and each matches the frozen overlay, and the docs only add lines. The checks below were run after these notes were added.

### Known limits
- The practice view changes layout and progress handling only. There are no new scenarios, rules or scoring.
- Progress is per browser and per device by design. No account sync.
- Focus mode hides the rest of the page rather than using a modal dialog, matching the lesson Study view.
