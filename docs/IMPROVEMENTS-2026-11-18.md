# Improvement backlog — 18 November 2026

Branch `improve/learner-foundations-2026-11-18`, cut from `main` at `d5ad883` (homepage member banner, PR 23, live). This file tracks the extended improvement session. Older documents (`audit-tracker.md`, `RELEASE.md`, `site-usability-2026-11-17.md`) record history; their blockers are not assumed current unless re-checked below.

**Status values:**
- **Batch 1:** implemented locally, uncommitted, awaiting Codex review.
- **Open:** not started.
- **Verify:** needs browser or live measurement before it counts as reproduced.
- **Blocked:** needs an owner decision, an account or a cloud change.

## Priorities

| # | Item | Evidence | Priority | Status |
|---|---|---|---|---|
| 1 | Library search misses official and common spellings | Reproduced with `matchesQuery` on `data/forms.json`. These returned nothing: Kukkiwon's own "Shipjin", ATA's sheet title "Songahm #1", "Cheon-Ji", "Koryeo", "Geumgang", "Jung-Geun", "Taeguk 1" and "tul". "poomsae" missed all eight Taegeuk forms. `normalize` did not strip `#`, and there was no alias or style vocabulary. | P2 usability | Batch 1 |
| 2 | Typing a full form name returned other forms | "Taegeuk Il Jang" returned Taegeuk 1, 2 and 7, because the short words "il" and "jang" match inside other text. | P2 usability | Batch 1 |
| 3 | Header account link went stale after another tab signed in or out, and after a Back/Forward restore | `js/site.js` called `renderAccountNav()` once per load, while the homepage banner subscribes to live state. A cross-tab sign-out could show the guest banner beside "My profile". Codex's review added: re-rendering with an unchanged state must keep the focused link. | P1 usability (code-level) | Batch 1; browser check with the synthetic fixture to follow |
| 4 | No beginner orientation | `main` has no Start here page. Style differences, pose vs count and performer's left/right were explained only inside individual lessons. | P1 content | Batch 1 |
| 5 | Header labels wrap on narrow desktops (769–900 px) | Codex browser measurement, signed out at 769 px: no horizontal overflow, and the header fits 69 px high. But "Forms Library" wraps (62 px link height), and Log in / Join free become two-line buttons 52.6 px tall. Normal at 900 px. Fix: for 769–900 px only, hide the decorative Korean logotype, trim nav and account-button padding, and keep labels on one line. Mobile menu and other breakpoints unchanged. "Start here" stays out of the top nav. | P2 layout | Batch 1; Codex recheck |
| 6 | Technique and term finder across lesson poses | Library search works at form level only; "low block" correctly returns 5 forms. The 22 data-driven lessons hold 89 structured action types (`data/lessons/*.json` `sequence[].actions[].type`) plus stances and turns, and lessons accept `?pose=N`. A static index could link straight to every pose using a technique, with style filters. Enhancement, not a defect. | P2 feature | Open (candidate for batch 2) |
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

## Batch 1 — learner foundations (this change)

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

- I used no browser. Codex measured the hub with no horizontal overflow from 320 to 1280 px; the narrow-desktop header fix (item 5) and the cross-tab header behaviour still need Codex's recheck.
- The direction explanation relies on the verified starting geometry: left joints at +x and the Front camera at +z. It deliberately says the fixed camera does not follow later turns.
- Spelling aliases are limited to Kukkiwon spellings, Revised Romanization of the Korean names and the common "Taeguk". Forms not in the catalogue (Chonkwon, Hansu, Ilyeo, Palgwe) still return the normal empty state.
