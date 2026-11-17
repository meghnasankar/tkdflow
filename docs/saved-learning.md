# Saved forms and lesson progress

The library's Save form buttons, the lesson's save/practise controls, the homepage's Continue learning section and `learning.html` share one study state service. My learning is also linked from the footer and private profile page. All 23 lessons use the same lesson integration.

Visitors keep form IDs, animation pose indexes, optional practised marks and timestamps on this browser under `tkdflow.learning.browser.v1`. Storage failures fall back to in-page memory with accurate feedback; a failed write never reloads an older disk snapshot over the newer change. Other people using the same browser profile can see browser-only saves.

Confirmed account holders with completed profiles use private `member_learning` rows via owner-bound functions. The account copy is never placed in visitor browser storage. Teens can keep private study records without gaining public posting rights. Forum/school moderators cannot read another member's learning records. Sign-out/account switching clears the old account's visible state; late requests are discarded, and the server rejects a request whose expected account differs from the authenticated caller.

A paused lesson resumes at the last studied animation pose when no explicit `pose` link was supplied and the user has not already operated the player. Resume links request the current account/browser record and clamp to the current lesson's pose count, so a changed lesson cannot create an invalid pose link. Pose numbers are not official movement counts. No autoplay or automatic skill/completion award is added. Practised is a voluntary, reversible study mark.

Bookmark, pose and practice updates are independent patches. Concurrent pending changes are coalesced while retaining newer intentions; owner identity is checked by each write. Failed saves remain visibly unsynced until retried. Account-to-account conflicts use the last successful server write for that field; this is not a real-time shared editing system.

Browser saves are not automatically uploaded at sign-in. An explicit My learning action copies saved choices and missing progress into the account, preserving existing account study positions. Browser-only records remain separate.

## Deployment

Apply `supabase/learning.sql` to staging before publishing the frontend. It adds one private table and narrow functions, preserving existing profiles, discussions, roles and eligibility. There is no public learning feed or new moderator role. The table has RLS and no direct client-table grants; function calls require the signed-in user's matching account ID, confirmed email and valid profile. Only the 23 published lesson IDs and bounded pose indexes are accepted. Auth-user deletion cascades study records.

Make private copies of `supabase/tests/learning-probe.sql`, substituting the confirmed owner email. Run after the migration: its synthetic study changes are inside one transaction that is rolled back, including on failure. Record before/after profile, learning-row and moderator counts. Test production only after staging passes and the owner approves publication. A frontend rollback can retain the additive learning schema and private history.

The public privacy notice and manual data-request procedure include study data. Public impact metrics must not be inferred or published from private study records without a separate, explicit design and authorization.
