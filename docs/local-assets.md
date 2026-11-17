# First-party fonts and account library

Prepared 2026-11-17; publication pending.

- `css/fonts.css` and `assets/fonts/` preserve the official Google Fonts CSS Unicode ranges for Inter variable 400–900 and Noto Sans KR 400–700. The manifest records source URLs, bytes and SHA-256. Browsers download only the subsets needed by a page. Both font families include their SIL Open Font License files.
- `vendor/supabase/supabase-2.119.0.js` is the exact reviewed UMD build from the official npm tarball. Its SHA-384 matches `js/config.js` SRI. `source.json` and the MIT license preserve provenance. No private provider key is included.
- `layout/head.html` uses local fonts. Run `npm run sync` after layout changes. The preview server serves `.woff2` as `font/woff2`.
- The intended enforced CSP uses self for scripts, styles and fonts. Supabase connections remain explicitly permitted by the existing account policy. Public learning pages no longer contact Google Fonts or a script CDN for these assets.
- Tests check local URLs, font existence/licenses and exact library SRI. Browser QA must cover Korean text, accounts and animation before the policy is released.

Rollback: revert the bounded asset/head/config/policy commit as a unit. Keep provider settings and member data untouched. Do not replace a failed asset with an unpinned remote script.
