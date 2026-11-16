# Founder page production release — 2026-11-15

Requested by the owner: deploy the reviewed founder page with the approved taekwondo photo.

## Scope

Based on production commit `682d99d590642371cc7ac1eb57eb8d7b9fc8049f`.
Adds the founder biography, mission, training and activities, approved portrait, page styling, search metadata and sitemap entry. Adds discovery links on Home, About and the shared footer. The new page links only to routes already present in production; its draft beginner-guide card is replaced by the existing forum preview.

The other pending content, event/CSP, account, age and database changes in the development checkout are excluded. Production account configuration, scripts, technical lesson data, database files and hosting headers are preserved byte-for-byte from the baseline.

## Approved photo

The owner selected the newer competition photo and approved the edited version after seeing it on the local founder preview. It uses a neutral background and adjusted lighting. The original is preserved outside the repository. The image editor changed small certificate, ribbon and belt lettering; that limitation was disclosed before approval. The photograph is not an exact documentary reproduction and no new achievement claims were inferred from it.

Asset: `assets/meghna-founder.jpg`, 1122×1402, 299,991 bytes; metadata stripped.
SHA-256: `0d2e9ef3370493bbcf067b011fd2db3b37c2d86957de5b15e02b44e94c6f8a6e`.

Contributor attribution remains Meghna, as previously confirmed by the user.

## Rollback target

Production baseline: `682d99d590642371cc7ac1eb57eb8d7b9fc8049f`.
Vercel production deployment: https://vercel.com/meghnasankars-projects/tkdflow/FKbtM7uVSFhWGHYsBxSJj7D7FMjS

## Release verification

Results are recorded in the pull request and the local release evidence. No Supabase or mail operations are part of this release.
