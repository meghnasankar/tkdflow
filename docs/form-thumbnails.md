# Forms library thumbnails

The 23 static 960 × 540 WebPs in `assets/forms/` are rendered from the same approved character rig and source poses as the public lessons. No generated person, body part, invented technique, mirrored pose, or cropped screenshot is used. Whole-character bounds determine the camera fit, including hands, feet and the ponytail. The camera follows chest orientation with an additional documented angle to make kicks readable.

`data/form-thumbnails.json` records each selected lesson pose, its numeric joint hash, image hash, size and measured nontransparent character bounds. The eight Taegeuk trigrams are drawn top to bottom, as referenced at https://www.nbtkda.com/poomsae. Other series use restrained decorative backgrounds without assigning Taegeuk symbols. Nature and brush motifs are decorative, not claims about a form's floor diagram or organization endorsement.

The library uses ordinary lazy-loaded image elements with intrinsic dimensions and descriptive alternative text. No WebGL, video, audio or animation runs in library cards. Lesson review labels and source movement files remain unchanged.

## Reproduction

1. Run `node scripts/prepare-form-thumbnails.mjs` to select the documented real endpoints. This resets the manifest's render metadata, which must be repopulated after rendering.
2. Create an untracked local studio page under `labs/thumbnail-studio/` that loads a same-origin copy of `scripts/render-form-thumbnails.mjs`. Its markup needs `#status` and `main` elements, an external stylesheet, and an external module script (no inline script under the preview CSP).
3. Run `node scripts/serve.mjs --port 8906` and open the studio in a WebGL-capable browser. The renderer reuses one avatar/context and displays 23 images. Completion is marked by `body[data-ready="true"]`; errors appear in `#status`.
4. Save each rendered image's `src` WebP data URL to `assets/forms/{data-id}.webp`. Save its `data-proof` JSON as the matching manifest record's `renderProof`, plus the encoded asset's `bytes` and SHA-256 `assetSha256`. Do not change or rerender the face or source joints. Visually review every preview and verify full-body framing.
5. Keep the temporary studio excluded from version control/deployment. Run `npm run check`, then verify the actual library at desktop and phone widths before publishing.

The tests detect source-pose drift, clipping/blank render evidence, broken catalogue mappings, incorrect trigram order, stale/missing image hashes, oversized files and unsafe image metadata. Raster decoding and visual appearance are also checked in the browser; numerical render evidence does not replace visual or instructor review of the lesson movements.
