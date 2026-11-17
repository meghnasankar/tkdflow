# Link preview image

All shared page metadata points to `/assets/og-animation-v2.png`, a static 1200 × 630 PNG. The new address replaces the original stick-figure sharing image. The legacy `/assets/og-image.png` also contains the updated card for consumers that retain its address.

`assets/social-card.svg` is the self-contained editable source. It embeds the existing `assets/forms/taegeuk-4.webp` thumbnail and crops its labels, retaining the complete approved lesson character and side-kick pose. It does not change or generate a new face, uniform or technique. The source thumbnail's pose provenance remains in `data/form-thumbnails.json`.

To export after editing the SVG, create a temporary same-origin studio with `#status`, `main` and a copy of `scripts/render-social-card.mjs`, using an external module script. Run the local preview server and open the studio. Save the rendered `#social-export` image's PNG data URL to both image paths above. Remove the studio before committing or deploying. Run the release checks and inspect the exported image at full size and card size.

Edit shared metadata in `layout/head.html` and run `node scripts/sync-layout.mjs`; do not edit each page's generated head separately. Existing chat messages may retain a previously cached preview until their chat service fetches the page again.
