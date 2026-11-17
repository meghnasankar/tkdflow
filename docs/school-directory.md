# School directory and private suggestions

Prepared 2026-11-17. The first snapshot contains **334 schools in 63 countries/territories**. It is an initial partial worldwide directory, not all taekwondo schools or confirmation that a listed school is still operating. 323 entries include a city; 60 include a school website. Country/region/city are omitted when unknown, never inferred from a nearby town.

## Sources and license

- OpenStreetMap contributors, ODbL 1.0: https://www.openstreetmap.org/copyright and https://opendatacommons.org/licenses/odbl/1-0/.
- Cached name searches through the documented Photon service: https://github.com/komoot/photon. Queries used taekwondo, tae-kwon-do, tae kwon do, taekwon-do, 태권 and 跆拳, with several broad world-region searches. Photon caps results at 50 per query, so this is explicitly incomplete. There are no visitor-time geocoder calls or location requests.
- Search candidates were enriched in five read-only batches using the official OSM object API, exposing current public tags rather than an old scraped directory: https://wiki.openstreetmap.org/wiki/API_v0.6. All 382 distinct search objects were retrieved; 49 non-school, nonmatching, removed, duplicate or unsuitable objects were excluded. No OSM editor identity, business phone/email or member data is shipped.
- One individually checked school record uses its official contact page: https://youngmootkd.com/page/contact-us. It contains only business name, country, region, city and website.
- Country choices use ISO-style region codes from Unicode CLDR and labels from the browser's `Intl.DisplayNames`. Personal precise location is never requested.

Public `data/schools.json` is the downloadable database snapshot with attribution, license URL, date, coverage and per-record source links. `supabase/school-directory-seed.sql` contains the matching seed, under the same database license. New approved business contributions join the ODbL directory; the custom-entry UI explains this. The student-to-school association is never part of the public database.

Bulk Overpass endpoints timed out or returned service errors during this import. The academic extraction fallback required credentials. No new account, API key or paid provider was created to bypass those failures.

## Registration and profile settings

- Search school/location text and filter by country, region and city. Search is accent-insensitive and keeps campuses separate by stable source ID.
- At most 100 matching options are shown, plus the current selection when outside the filter. Search/filter/list refresh never clears a selection or custom text. Unknown legacy saved names remain visible and private.
- School is optional. “No school / prefer not to say” clears the stored association. “My school is not listed” collects a name, country, city and optional region/website.
- The database is authoritative when reachable, so a newly approved school appears without a website redeploy. A service failure falls back to the labelled first-party snapshot.

## Private review flow

`supabase/school-directory.sql` is additive and applied after base setup plus community. It preserves legacy tables/rows and closes their former public name-insertion permission, including column grants.

1. Saving a confirmed member's profile with a custom school automatically queues a private suggestion in the same transaction. Existing private unlisted school names are backfilled for admin review. Nothing is published automatically.
2. No anonymous/member direct writes to the public directory or private suggestion table. Members can read their own current suggestion status only.
3. Approved moderators use **School directory review** in profile settings. The queue contains business details and date, not submitter IDs or member profiles. Reviewers can select an existing campus or check/edit the business details and add a public reference URL before approval. Country and city are required before adding a new public record.
4. Approval publishes only business fields, marks the suggestion reviewed and connects the still-matching private profile to the canonical campus. It never overwrites a later changed selection. Equivalent approvals reuse a matching record; reviewers should also check spelling/location variants against existing campuses.
5. Rejection keeps the private profile intact. Up to five distinct school suggestions per member per day prevents rapid directory spam. No emails or automatic moderator promotions are sent.

The dedicated owner-managed `private.school_reviewers` role permits school review only; it grants no forum moderation or profile access. Existing community moderators can also review schools. After explicit owner approval, Meghna’s confirmed staging test account received school-only reviewer access. It did not receive forum moderation or another member’s profile access. Production roles are unchanged.

## Applying and verifying

Apply `supabase/school-directory.sql`, then `supabase/school-directory-seed.sql` on staging first. Re-running either is safe: the schema is idempotent and seeds do not overwrite existing directory corrections or inactive flags. Verify counts and permissions before applying to production. Keep production website accounts off until the overall account release is ready.

Tests use an embedded Postgres to exercise legacy migration, atomic suggestion creation, privacy, anonymous/member denial, moderator approval/rejection, canonical campus selection, duplicate protection and rate limiting. Pure tests cover search, preserved selection, confirmation metadata and snapshot fallback. Cloud deployment and browser tests are recorded separately; local tests alone do not establish live state.

## Rebuilding the initial snapshot

Use an approved, cached public data directory containing `photon-*.json` responses and `osm-detail-*.json` object responses. No credentials or member data. Keep raw responses and the generated import report in private task artifacts; only the sanitized school database ships. Run:

```text
python3 scripts/import-schools.py --input /absolute/path/to/public-school-cache --countries /absolute/path/to/country-codes.json --output data/schools.json --seed supabase/school-directory-seed.sql
```

Review exclusions, coverage and source links, run checks, then import deliberately. The importer does not perform network requests or automatically change cloud data. Broader coverage can be added from explicitly licensed federation/school sources and reviewed member submissions; never copy Google Maps or copyrighted school directories without permission. No school refresh schedule has been created; the existing weekly event routine remains separate.

## Staging outcome — 2026-11-17

The initial migration and all 334 school records are installed on tkdflow-staging. The existing private school value became one pending suggestion automatically. After the owner approved the narrower school-review update and the test account’s role, the profile displayed that private queue. The suggestion was matched to the independently sourced existing Young Moo school and approved. Reload showed the canonical selected school and an empty pending queue. This exercised duplicate matching and the private profile link without creating a duplicate public school. Source/country searches, saved selection preservation and unsaved custom-field preservation passed in the browser. Production school schema/data and reviewer access have not changed.
