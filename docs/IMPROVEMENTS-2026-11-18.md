# Improvement backlog — 18 November 2026

This file tracks the extended improvement session that started from `main` at `d5ad883` (homepage member banner, PR 23).

- **Batch 1 (learner foundations): published.** PR 24 merged as `main` `62d5ac5`. Codex verified it live: all 47 public files match source, security headers match, development paths return 404, the live Start here page has its 10 sections, and "Koryeo" finds Koryo. All 480 checks and the browser review passed: 9 widths, the 769–900 px header without wrapping, and native cross-tab sign-in, sign-out and token refresh with focus kept.
- **Batch 2 (technique finder): published.** PR 25 merged as `main` `fde815c`. Codex verified it live: 47/47 public files byte-match, headers match, development paths return 404, the live finder works, and all 503 checks passed.
- **Batch 3 (public Community reading):** on `improve/community-public-reading-2026-11-18`, cut from `fde815c`. Uncommitted, awaiting Codex review.

Older documents (`audit-tracker.md`, `RELEASE.md`, `site-usability-2026-11-17.md`) record history; their blockers are not assumed current unless re-checked below.

**Status values:**
- **Published:** live on `main` and verified.
- **Batch 3:** implemented locally, uncommitted, awaiting Codex review.
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
| 7 | Lessons do not link to the shared explanation of poses and directions | Each lesson says "Views are fixed to the starting stance…" but offers no further help. A small "How to read this lesson" link to `/start-here.html#sh-reading` would serve all 23 lessons. | P2 content | Open |
| 8 | The lesson keyboard hint says "Home End first/last" | `taegeuk-1.html` `#player-keys` does not say whether these mean pose or time. Check `lesson-player.js` behaviour, then make the hint specific. | P3 accessibility | Open |
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
| 20 | Optional search of spoken instructions | Narration cues line up one-to-one with poses in all 23 lessons (about 47 KB). Searching them would help ("chamber", "knee") but is noisy by default. Candidate: an opt-in "also search spoken instructions". | P3 feature | Open |
| 21 | Stance indexing in the technique finder | The finder indexes only the techniques named in pose labels, not stances. The 22 data-driven lessons record a `stance` per sequence entry (walking, back, horse, front, crane, rear-foot, low, closed, fixed, parallel, cross, wide-parallel, cat), but Taegeuk Il Jang has stance only in description text. Adding stances needs source-backed stance names per style and a Taegeuk Il Jang mapping. Do not derive them from description prose. | P3 feature | Open; needs sourced stance terms |
| 22 | Community started the account service in a known under-13 tab | `forum.js` `connect()` and `community.js` `loadGuides()` called `getAccountService()` without checking this tab's age screen. That started the SDK client, which can restore a stored session (for example someone else's on a shared device) and offer reporting, submissions, posting or moderation. My learning, lesson help (page and widget), profile and sign-in already guarded this. | P1 privacy/policy | Batch 3 |
| 23 | Header account link in a known under-13 tab | `site.js` shows "My profile" whenever a session is stored, including in an under-13 tab; the profile page then shows the public guidance. Harmless, but an owner/UX decision. Batch 3 deliberately leaves the header unchanged. | P3 UX | Open (owner decision) |
| 24 | Signed-out eligible visitors start the account service to read Community | Needed today to notice a sign-in. A lazier start (read publicly, start the client on a session-key `storage` event) changes sign-in timing and needs its own review. | P3 | Open |

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
