# Event source evidence — 2026 and 2027

# Worldwide event research — verified 2026-11-16

Data: /tmp/tkdflow-events-world-2026-2027.json

309 records: 274 in 2026, 35 in 2027. Regions: Europe 184, Asia 77, Oceania 32, Africa 12, Worldwide/TBC 3, South America 1 (the ITF sport World Championships exception). 136 WT, 138 ITF Vienna, 18 Australian Taekwondo, 11 unique ETU, 5 ITF sport, 1 ITF Union. Event types include competitions and training/camps/courses; types are explicit for filtering. The set is broad published-calendar coverage, not an assertion that all local, school, private, unannounced or registration-only events worldwide are represented.

## Official sources

- World Taekwondo 2026: https://www.worldtaekwondo.org/calendar/event-calendar/list?year=2026&typeCd=TW
- World Taekwondo 2027: https://www.worldtaekwondo.org/calendar/event-calendar/list?year=2027&typeCd=TW
- Para calendar uses typeCd=PT.
- European Taekwondo Union: https://europetaekwondo.org/events/
- Australian Taekwondo: https://austkd.com.au/event-information-centre/
- ITF Vienna current and past calendars: https://itf-tkd.org/events/ and https://itf-tkd.org/events/past/
- ITF sport: https://itftkd.sport/events/ and https://itftkd.sport/events/category/championships/
- ITF Union Lanzarote: https://www.itfunion.com/world-championships-lanzarote-2027/
- Asian Taekwondo Union calendar cross-check: https://asiantaekwondo.org/gboard/bbs/board.php?bo_table=calendar ; direct site was bandwidth-limited during retrieval, so current WT dates take priority.

## Data acquisition and weekly refresh

WT's list page is loaded with public calendar data. Fetch the same-origin endpoint `https://www.worldtaekwondo.org/calendar/event-calendar/page?year=2026&typeCd=TW&q=` for TW/PT, 2026/2027. HTML groups multiple discipline rows under one event via rowspan. Preserve all rows' date range and discipline, not only the first row. The event link is the official `/calendar/event-calendar/view?detailsKey=KEY&typeCd=TW&year=YEAR`. Raw fetched files /tmp/tkdflow-wt-2026-TW.html etc. Parser /tmp/tkdflow-parse-world-events.py.

ETU and Australian Taekwondo offer standard WordPress Events Calendar public APIs: `/wp-json/tribe/events/v1/events?start_date=2026-01-01&end_date=2027-12-31&per_page=100`. Read all total_pages for growth. Their per-event URLs are in the returned data. Raw JSON /tmp/tkdflow-etu-raw.json and /tmp/tkdflow-austkd-raw.json.

ITF Vienna's current/past HTML tables contain dates, country, city, event name, organizer, event type and official registration URL. Excluded Local Tournament rows and obvious test/fixture titles such as TEST TEST TEST and Prueba de torneo. Raw /tmp/tkdflow-itfv.html and /tmp/tkdflow-itfv-past.html. Its source federation is kept distinct from ITF sport and ITF Union through organization/circuit fields.

## Important uncertainties and deduplication

- Two WT 2027 entries have TBC taekwondo dates: International Classifier Refresher Course (January window) and Virtus Global Games (overall Games Nov 27–Dec 5; TKD dates TBC). Exact dates remain null with notes rather than using placeholder dates.
- Three course records have TBC location, so countryCode remains null. Do not invent a country/flag.
- 2026 Asian Para Games show the overall Oct 8–24 window and PTKD Oct 19–21. The dataset uses the specific taekwondo dates Oct 19–21.
- WT Grand Prix 2027 parent dates include the para day; separate para calendar records explicitly identify para divisions. These are related but distinct events for accessibility/filtering.
- Prefer current WT dates over conflicting ETU copies. ETU European Seniors says May 11–13 versus WT May 11–14; use WT. ETU German Open title incorrectly says 2025 for September 2026; omitted duplicate. ETU Croatia Poomsae dates/name conflicted with WT current 12th Croatia Open; omitted older ETU duplicate.
- ETU-only regional events were added without duplicating WT counterparts. Australian international WT duplicates were omitted, retaining state/selection/national/course events.
- ITF England 2027 Selection Championships occur Nov 22, 2026 according to the official source; keep date-year 2026 despite name.
- The ITF sport World Championships in Asunción Oct 17–24, 2027 are included here despite Americas agent scope; dedup if present in their file.
- ITF sport World Cup 2026 competition dates are Sept 29–Oct 3, while full delegation schedule is Sept 28–Oct 4. The entry uses competition dates with note.
- Status scheduled means listed on the official calendar, not proof of completion, ticket availability, public registration or that it actually occurred. Past/upcoming UI should derive from calendar dates. Entry eligibility remains with organizer.


# Americas event source review — 16 November 2026

131 sourced entries; 2026: 60, 2027: 71.

## Scope and uncertainty

- This covers the official calendars and event announcements researched, not every local event worldwide. It includes USATKD, AAU, ATU, ATA, NCTA, USCDKA, Taekwondo Canada and PATU.
- All 76 distinct ATA event landing-page URLs checked by HEAD returned HTTP 200. Details are in /tmp/tkdflow-ata-link-check.json. The full calendar HTML and parser are saved in /tmp/tkdflow-ata-calendar.html and /tmp/tkdflow-parse-ata.py for reproducibility.
- The ATA official calendar lists Worlds July 19–24 under 2027 but contains a stale “2026 Worlds” label in one panel. The Worlds detail page and Tournament of Champions panel call it 2027. Dataset uses 2027.
- A Clear Lake ATA event under November 2027 pointed to a 2026-slug page. It was excluded rather than guessing the intended year.
- AAU 2026 Nationals official page says June 28–July 4; Uventex envelope says June 28–July 5. Dataset follows AAU’s championship page, with a visible conflict note.
- The three 2027 AAU major entries are announced by AAU, but exact dates remain TBA. Nationals city is TBA; Junior Olympics and Team Trials list Houston. These are not guesses based on last year.
- No official 2027 ATU National Championships announcement was located. Do not invent dates, host city or a confirmed 2027 record.
- USATKD has six confirmed 2027 date ranges, but its season page does not yet name host cities. Dataset keeps cities TBA.
- AAU 2026 Team Trials and Junior Olympics were omitted because the available official future-dates page is stale and dates could not be reconciled reliably from primary sources. The AAU CMS search snippet has an apparent July29–August31 typo for Trials; do not publish it.
- Buenos Aires PATU12 is omitted because PATU calendar snapshots disagree: October16–17 versus event-detail October17–18. It needs fresh organizer confirmation.
- PATU festival and Kukkiwon Cup pages swap city/country labels in their own templates; dataset puts Lima in Peru, and Santiago in Chile.
- This is a historical calendar as well as a planning directory; do not suggest past 2026 events are still open for entry.

## Official starting points

- https://aausports.org/taekwondo/2026-nationals
- https://aausports.org/taekwondo/future-dates/
- https://assets.contentstack.io/v3/assets/blteb7d012fc7ebef7f/blt43adf921f6d63d70/6970f1d62f944bffe7acd297/2026_State_Championship_Manual_v3.0.pdf
- https://assets.contentstack.io/v3/assets/blteb7d012fc7ebef7f/bltc2e7003cff3d2b6c/69738ea5e3ff6fe349d2f3d7/2026_USAT_PATKD_State_Championship_Final.pdf
- https://atamartialarts.com/events/event-schedule/
- https://atamartialarts.com/events/fall-nationals/fall-nationals-event-schedule/
- https://atamartialarts.com/media/oovhibcn/ws26_digitalbrochure_compressed.pdf
- https://image.aausports.org/dnn/tkd/SEAAU2026LicenseApp.pdf
- https://ncta-usa.com/wordpress/2026-ncta-team-trials/
- https://storage.googleapis.com/mailerlite-uploads-prod/1358458/9skn6kz5FfhhjjpiErxu64zlAjKpUhAhIxRqoNcr.pdf
- https://taekwondo-canada.com/events/
- https://taekwondo-canada.com/events/canada-open/
- https://taekwondo-canada.com/events/list/?tribe_event_display=past&tribe_paged=1
- https://taekwondo-canada.com/events/national-championships/
- https://taekwondo-canada.com/wp-content/uploads/2026/01/2026-Canada-Open-Kyorugi-Information-Package_G2_2026.pdf
- https://uscdka.com/
- https://vatkd.org/events/2026-VA-state-championship.html
- https://www.ohiotaekwondo.org/?page_id=34
- https://www.patutkd.org/en/event/13671/
- https://www.patutkd.org/en/event/3era-copa-panamericana-kukkiwon-2026/
- https://www.patutkd.org/en/event/brazil-open-30-taekwondo-championship/
- https://www.patutkd.org/en/event/campeonato-panamericano-adultos-g4-2026/
- https://www.patutkd.org/en/event/campeonato-panamericano-infantil-2026-ecuador/
- https://www.patutkd.org/en/event/campeonato-panamericano-open-2026-2/
- https://www.patutkd.org/en/event/campeonato-panamericano-para-taekwondo-adultos-kyorugi-g4-2026/
- https://www.patutkd.org/en/event/campeonato-panamericano-para-taekwondo-adultos-poomsae-g4-2026/
- https://www.patutkd.org/en/event/colombia-open-g1-2026/
- https://www.patutkd.org/en/event/colombia-pan-am-series-patu12/
- https://www.patutkd.org/en/event/copa-de-naciones-2026/
- https://www.patutkd.org/en/event/domincan-open-2026/
- https://www.patutkd.org/en/event/ecuador-pan-am-series-patu12/
- https://www.patutkd.org/en/event/festival-tecnico-de-taekwondo-2026/
- https://www.patutkd.org/en/event/fisu-america-2026/
- https://www.patutkd.org/en/event/honduras-pan-am-series-patu12/
- https://www.patutkd.org/en/event/iv-juegos-suramericanos-de-la-juventud-panama-2026/
- https://www.patutkd.org/en/event/peru-pan-am-series-patu12/
- https://www.patutkd.org/en/event/qualifying-central-american-and-caribbea-games-2026/
- https://www.patutkd.org/en/event/wt-presidents-cup-america-2026/
- https://www.usatkd.org/2026-U-S-NATIONAL-TAEKWONDO-CHAMPIONSHIPS
- https://www.usatkd.org/2026-U-S-NATIONAL-TAEKWONDO-TEAM-TRIALS
- https://www.usatkd.org/2026-U-S-TAEKWONDO-SEASON-FINAL
- https://www.usatkd.org/2026-usatkd-maryland-state-championship
- https://www.usatkd.org/2026-usatkd-new-york-state-championship
- https://www.usatkd.org/2026-usatkd-texas-state-championship
- https://www.usatkd.org/2027-usa-taekwondo-competition-season
- https://www.usatkd.org/calendar


## Integration

Removed exact duplicates: []. Multi-time-zone country defaults are marked `timezoneEstimated`; no start-time countdown is asserted. All events retain an official event link and source-check date. Major badges exclude training courses/camps.
