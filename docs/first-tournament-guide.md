# First tournament guide (`/first-tournament.html`)

Prepared 2026-11-17 on `feat/first-tournament-guide-2026-11-17`. This is local work. Nothing is committed, published or deployed.

## What it is

A public, static guide for a first USA Taekwondo (USAT/USATKD), AAU Taekwondo or American Taekwondo United (ATU) tournament.

- **Content:**
  - how local/open, qualifying and national events differ;
  - one card per organization, keeping ATU separate from ATA and from the Asian Taekwondo Union;
  - forms (traditional forms vs sport poomsae) and sparring formats;
  - five staged checklists: choose an event, before you pay, after you register, pack, and competition day;
  - questions for the coach and the organizer;
  - a glossary and a dated source list.
- **Without JavaScript:** everything is shown and readable. The organization and discipline selector and the checklist tools appear only when the script runs; a `<noscript>` note explains this.
- **With JavaScript:**
  - native `<select>` controls filter by organization (`org=all|usatkd|aau|atu`) and discipline (`discipline=both|forms|sparring`);
  - the URL updates without reloading, so links are shareable, and back/forward works;
  - Copy link shares the view, never the ticks;
  - Print prints only the chosen context, with a context line and the full source addresses.
- **Ticks** are browser-only (`localStorage` key `tkdflow.tournamentChecklist.v1`), kept separately for each organization/discipline view. Only known item IDs are stored, never personal data. Storage behaviour is honest:
  - **Blocked storage:** ticks stay in memory and a notice says they will be lost.
  - **Corrupt data:** ignored, with an explanation, and replaced only when a tick changes.
  - **Other tabs:** stay in sync.
- **The count** reads "N of M items checked …". It never says or implies the visitor is eligible, registered or ready.
- **No account client, network request, cloud service or package is used.** Organization-specific items carry an **Organizer rule** badge only when an official USA Taekwondo page states the rule. Event-specific examples are labelled as such, and everything else is editorial advice.
- **Discoverability:**
  - a link in the Events page notice;
  - a "Competition guide" entry in Community learning resources;
  - a footer link under Community;
  - an entry in the sitemap and page manifest (navigation key `events`).

## Sources (checked 2026-11-17)

| Source | Edition / scope | Used for |
|---|---|---|
| [USAT athlete: how to register](https://www.usatkd.org/athlete-how-to-register-for-an-event) | Current page | Sport:80 member-profile registration, belt details, SafeSport for athletes aged 18+, events team if not listed, extra documents for some nationals (not general) |
| [USAT coach: how to register](https://www.usatkd.org/coach-how-to-register-for-an-event) | Current page | Separate coach registration; discipline course through USA Taekwondo University |
| [USAT competition rules](https://www.usatkd.org/usatkd-competition-rules) | Landing page | Rules link only; no edition reviewed |
| [AAU Taekwondo](https://aausports.org/taekwondo/), [future dates](https://aausports.org/taekwondo/future-dates/) | Current pages | Program link; 2027 nationals dates and locations still to be announced |
| [AAU handbook 2025–26 (PDF)](https://image.aausports.org/dnn/tw/2026/25-26-AAUTKDHandbook-2.27.26.pdf) | Updated 27 Feb 2026, 121 pages; **not** a 2027 rulebook | Traditional forms vs sport poomsae; point, continuous-point and Olympic-style sparring; district/regional route exists |
| [Arizona AAU tournament information](https://www.aautkdaz.com/tournament-information/) | One 2027 qualifier | Labelled example: AAU membership required, may not be included in entry, not always instant; current online coach certification plus an event coaching pass |
| [AAU online certification](https://application.aausports.org/stw/defaultce.asp) | Current page | 2027 online certification available |
| [ATU original site](https://americantaekwondounited.com/), [current site](https://www.joinatu.com/), [event info and registration](https://www.joinatu.com/eventinfo) | Current pages | Where to start; old site points to joinatu.com |
| [2026 ATU Nationals packet (PDF)](https://storage.googleapis.com/mailerlite-uploads-prod/1358458/9skn6kz5FfhhjjpiErxu64zlAjKpUhAhIxRqoNcr.pdf) | 2026 event, linked from joinatu.com | Labelled historical example: Grassroots vs World Class divisions, separate coach/membership fees, division weigh-in times, own sparring safety equipment |
| [ATU spectator tickets](https://joinatu.online/) | 2026 ticket site | Spectator tickets are separate from athlete entry and coach passes |

No official 2027 ATU nationals announcement was found on 16 November 2026. No 2027 fees, deadlines, equipment lists or qualification routes are stated anywhere on the page.

## Maintaining it

- Re-check the sources before each season.
- Update the dates in the page's Sources section and in this table.
- Keep paraphrases brief.
- Never present an example from one event or edition as a rule for others. Keep "Organizer rule" badges for statements an official organizer page makes.
- Add checklist items as `<li data-item="id" [data-org="usatkd|aau|atu"] [data-discipline="forms|sparring"]>`. IDs must stay stable, because saved ticks refer to them.
- `tests/first-tournament.test.mjs` checks:
  - IDs, scopes and that every stage is non-empty in each view;
  - that sources are official and listed;
  - the content guardrails;
  - the print rules;
  - the absence of account, network or cloud use;
  - discoverability.

## Limits and open questions

- English only. There are no event-specific packets, and no automatic updates from organizers.
- The guide does not choose divisions, check eligibility, or recommend equipment brands, methods for counting age, contact rules or qualification routes.
- **Owner/reviewer questions:**
  - Should a qualified instructor or official review the checklist wording?
  - Should future seasons add more organizations?
  - Should the Events page show the guide link per organization?
