# Community and forum workflow

The community page loads the latest published member topics from the existing discussion service. Editorial guides remain labelled as guides in the forum. Empty and unavailable feeds have separate messages; neither creates fictional member activity.

Signed-in members can view their latest unpublished topics and replies under **Your submissions**, with Awaiting review / Not published statuses. Each query uses the existing public column grants and row-level policies; it never selects author UUIDs or private profile fields. The ordinary query is author-only even for moderators. Replies to a hidden or unavailable parent topic remain subject to the existing reply policy. Published contributions appear in the public discussions rather than this private review list. No schema change is needed.

Top-of-page links make posting, submissions and moderation discoverable according to the current account's permission. Moderators see queue counts, author handles, separate topic/reply labels and explicit empty report states. Publishing refreshes the public feed and private submission list. Search/category/topic state is retained in the URL, and changing a search does not rebuild an open reply form. Session changes clear private content and invalidate pending requests.

Validation covers author-only topic/reply queries, anonymous denial, a teen moderator reviewing an adult submission while retaining posting/profile restrictions, query-string encoding and partial query failure. Browser QA uses a local-only synthetic account fixture for submission, approval and sign-out; no test posts are written to production. Public feed loading and 390-pixel/desktop layouts are checked separately. The fixture is outside the repository and is not deployed.
