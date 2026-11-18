# Narration, effects and texture provenance (development only)

This folder is excluded from deployment (`docs` is listed in `.vercelignore`). It keeps the technical record that was removed from public pages on 18 November 2026, when the owner asked that tool credits not be shown on the site.

- **Voice instructions:** generated with ElevenLabs, stock voice "Sarah", model `eleven_multilingual_v2`. Per-lesson bytes and SHA-256 are in `catalog.json`. That file used to be served as `data/narration/catalog.json`; no page read it, and only the tests and `scripts/assemble-narration.py` use it.
- **Sound effects:** generated with ElevenLabs, model `eleven_text_to_sound_v2`, as recorded in `catalog.json` → `soundEffects`.
- **Cotton texture atlas** used by `js/animation/avatar.js`: recorded in `docs/animation-release-2026-11-16.md`.
- **Licence basis:**
  - ElevenLabs' help centre says audio generated during a subscription keeps a commercial licence, while audio generated outside a subscription always requires attribution ("What happens to my content after my subscription ends?", read 18 November 2026).
  - **Owner confirmation (18 November 2026):** the owner confirmed that the ElevenLabs account was on a paid subscription when this narration and these effects were generated, and that it is still on a paid subscription. That is the basis for publishing without an attribution line.
  - **Not independently verified:** a read-only subscription API check on 18 November returned HTTP 500, a second check by root timed out, and a narrow invoice search found nothing. This note records the owner's statement, not billing proof.
- **Unchanged:** the audio files, cues, timing and their hashes; only the descriptive fields (`provider`, `voice`, `model`) were removed from the public manifests.
