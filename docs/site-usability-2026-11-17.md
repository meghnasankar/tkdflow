# Site usability review — 17 November 2026

## Prepared improvements

- Account setup had a second, optional age field after the initial screening question. Registration and completion now omit that duplicate field. The neutral screen, server enrollment ticket, private eligibility band and optional age editor for existing profiles remain in place. An expired enrollment or a new browser session may still need screening; no exact screened age is persisted. The age-screen button waits for the account service before it can submit.
- The optional school picker starts collapsed in new-account forms. Saved completion data opens it when a school is already present, and field errors reveal a collapsed section before focusing the relevant input.
- On the live library, `yellow belt` returned zero results despite five matching catalogue entries. Search now includes the displayed belt, difficulty, description, tags and thumbnail technique as well as names, meanings and styles.
- Library and event pages show removable active-filter selections. Discrete selections work with browser Back/Forward, query changes are debounced, and shared URLs retain the selected filters. Clearing a library search keeps its chosen sorting order.
- Event options and date tabs show matching counts while keeping the other selections. Zero-result options are visibly unavailable unless currently selected; an existing selection is never silently changed. Invalid incoming URL values are ignored. Search supports independent words, accents, visible discipline labels and common country abbreviations. Empty results offer all-date and clear-filter recovery. “This month” removes a contradictory year/date-status restriction.
- Event summaries distinguish currently shown cards, total matches and all listed events.
- Ten original, same-origin vector icons replace search/style/trophy emoji and decorate the main homepage/resource actions. The homepage's eight featured forms use the approved animation thumbnails. Decorative SVGs remain hidden from assistive technology and controls retain text labels. Country flags and the established wordmark are preserved.
- The homepage's all-lessons action now opens the complete lesson catalogue. Its event teaser accurately includes announced events rather than describing every listing as verified and scheduled.

## Verification

Node tests cover belt/technique search, event facets against actual filtered results, country aliases, accent/word-order searches, URL validation and cross-year/undated events. Existing account, privacy and animation checks also run. Browser QA covers combined filters, removal of an individual selection, browser Back, real thumbnails and 320px layout. A separate local-only account fixture verifies the age-to-registration-to-confirmation flow without creating a real account or sending email. No fixture or populated test credential is included in the release.

No database, identity-provider, permission or age-policy change is required for this batch. Production publication requires the owner's explicit release approval.

## Recommended next work

1. Learning continuity: bookmarks, recently studied forms and a clear way to resume a lesson. Decide whether these are device-only or synced to a private account before adding storage.
2. A beginner route from style and school curriculum to the first useful lesson. A Start Here draft already exists in the original checkout; preserve and review it separately.
3. Community author controls, notifications and feed pagination, building on the published moderation flow.
4. School-directory coverage, duplicate/campus review and a more compact picker for large location lists. Pending business suggestions already have an admin queue; do not assume worldwide completeness.
5. Continue content checks with Meghna, especially naming consistency and the synchronization of movement, directions and narration. Do not label unverified improvements as instructor-approved.

Priya's moderator setup is still waiting for account confirmation/profile completion; it is not part of this interface release.
