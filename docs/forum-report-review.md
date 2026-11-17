# Unified Community and report review

The navigation has one Community entry. `/community.html` opens Discussions; `?view=resources` opens Learning resources, including three existing editorial guides selected across forms, technique and competitions. The Home, About and founder links use the combined destination. The old `/forum.html` route redirects while retaining query parameters; a static-host fallback also retains the fragment. Vercel's query-preserving behavior is documented in its [configuration redirect reference](https://vercel.com/docs/routing/redirects/configuration-redirects).

Direct discussion links load the requested published topic independently of the first feed page. Live visibility takes precedence over static guide metadata, so hidden guides are not reinserted into a successful live feed. Copy discussion link uses the canonical Community route. Refreshing a discussion retains a reply draft and its consent checkbox within the same account; account changes still clear private content.

## Report service update

Apply `supabase/discussion-report-review.sql` after `supabase/community.sql`, on staging first. It adds nullable resolution fields and an index to existing reports without deleting reports, topics, replies or profiles. Existing moderator membership and profile policies are unchanged. The new resolution function is executable by authenticated accounts but checks the existing private moderator role before reading or changing a report. Direct report-table access remains revoked.

The moderator queue contains only open reports, includes the reported content and its parent topic where available, and omits reporter, author and reviewer UUIDs and private profile fields. Queue batches remain bounded while totals count the full open queues. A Keep decision closes that report without publishing or changing the content. Hide rejects the target and closes all its open reports. Earlier resolved records remain unchanged. Decisions on the same content are serialized; repeated decisions report that the case was already reviewed. Audit fields remain private.

The frontend enables report decisions only when the queue advertises `report_review_version: 1`. Older server versions retain a readable report list while the update is pending. Install the service update before publishing the new frontend.

## Verification and recovery

`tests/report-review.test.mjs` covers upgrade/re-run preservation, permission denial, context redaction, Keep/Hide, duplicate reports, missing targets, repeated decisions, teen moderation, bounded queues, and the rollback smoke probe. Navigation tests cover old links, selected-topic loading, live guide visibility and copy-link failure. Browser testing uses local synthetic reports; no test content is published through the production UI.

For cloud verification, make a private copy of `supabase/tests/report-review-probe.sql`, replacing its owner-email placeholder with the confirmed test owner's email. The probe creates temporary content and moderator access inside one transaction, checks the functions under the authenticated role, then rolls everything back. Never commit the substituted email or any private credential. Verify profile/report/moderator counts before and after. The probe does not change enrollment eligibility.

The additive database update is compatible with the previous frontend. A frontend rollback does not require dropping resolution fields or losing audit history. Do not restore a queue definition that reopens already resolved reports.

Notifications, author editing/withdrawal and broader discussion pagination remain separate follow-ups.
