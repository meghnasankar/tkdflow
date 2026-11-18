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
- **Batch 11 (faster avatar garment construction):** on `improve/avatar-startup-2026-11-18`, cut from `665c3ff`. Passed Codex's browser timing and visual review; uncommitted, ready for root's release. Scope: item 33.

Older documents (`audit-tracker.md`, `RELEASE.md`, `site-usability-2026-11-17.md`) record history; their blockers are not assumed current unless re-checked below.

**Status values:**
- **Published:** live on `main` and verified.
- **Batch 11:** implemented locally and browser-reviewed by Codex, uncommitted, awaiting release.
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
| 9 | Library belt filter vs school differences | Belt facets are colour buckets across styles. The hub now says labels are typical, not rules; the library has no such note. Consider one line beside the belt facet. | P3 content | Open |
| 10 | Lesson content items marked unresolved | `unresolved` notes with `reviewStatus: pending` in do-san, joong-gun, koryo, pyongwon, sipjin, songahm-3, taebaek and yul-gok. Motion or sequence changes need primary-reference confidence and must keep the approved avatar look. | P2 content accuracy | Open; needs owner/Meghna for any instructor input |
| 11 | Search ranking for partial words | Partial multi-word searches ("Il Jang") still match broadly and are sorted by curriculum, not relevance. Acceptable now that exact names win. | P3 | Open |
| 12 | Community author controls, notifications, pagination | From the 17 November usability review. Needs SQL and RLS work, a staging apply and owner release approval. | P2 feature | Open (backend) |
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
| 33 | Every lesson page builds the avatar's garments in one long main-thread task | Codex's controlled foreground Chrome probe, same module: Taegeuk Il Jang rig construction 1411 ms (jacket 957, trousers 445); Sipjin 5234 ms (jacket 3649, trousers 1576), page visible throughout. The page can't respond to input during that task. Diagnostic only, not a device benchmark. | P2 performance | Batch 11 |
| 32 | No place to keep a school’s own order of forms | Schools use different belt names and orders, and the library’s belt filter is only a colour family. Learners had no private way to write down their own school’s list of levels and forms and print it. | P2 feature | Published (PR 34) |
| 31 | Study view cut off long spoken instructions | Reproduced by Codex in real Chrome at 320×700, Study view, Taebaek pose 10: the 130-character instruction needs 3 lines but was clamped to 2 (`clientHeight` 31 vs `scrollHeight` 47). Short landscape clamped to 1 line. The full text was only in the DOM for screen readers. | P2 readability | Published (PR 33) |
| 30 | Taebaek movement 14: the 180° right turn is shown as one stage | DTaF (physical p.58, printed p.52), root-verified: 14-1 is a closed stance facing Ma (back) and 14-2 faces Da2, so the turn is 90° then 90°. The site turns all 180° into pose 23 and none into pose 24; the final heading is the same. The school source gives a single 180°. A metadata-only split was modelled offline (pose 23 faces 180, pose 24 turns right 90°; narration timing still validates). Labels would need `cue.turn` updates, and pose 24's spoken text and audio don't mention the second turn. Details: `/private/tmp/tkdflow-taebaek14-followup.md`. | P3 content accuracy | Blocked (Meghna: source choice and any audio change) |
| 29 | Saved-learning controls lose keyboard focus while saving | Reproduced by Codex in a real browser with the synthetic fixture (account mode, 3 s server). (1) Library: keyboard Unsave on Taegeuk Il Jang rebuilt the button natively `disabled`, focus became `<body>` and stayed there after confirmation. (2) My learning, Saved: Unsave on the middle card (Chon-Ji) removed the card and focus became `<body>`. (3) Lesson widget: Mark as practised, same as (1). All real backend traffic was 0. | P2 accessibility | Batch 7 |

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
