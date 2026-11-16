# Complete 3D animation conversion

Scope: the one available animated lesson, Taegeuk Il Jang (`taegeuk-1.html`).
The production catalogue contains 23 entries; the other 22 have no lesson or
video to convert and remain unavailable. No new lesson availability is claimed.

All 20 existing display poses are converted, including the two grouped
block/punch pairs, both front kicks, landing punches, turns, ready and return.
The original draft numbering, Korean terms, kihap flags, review status and
pose-link contract remain in place. This is a visualization conversion, not an
instructor approval or a claim of technically validated motion.

The approved Indian girl character has a modeled face, black ponytail, white
dobok, Sankar belt and existing Kukkiwon emblem. The photograph is not projected
onto the face. Cotton pixels from the existing Nano Banana atlas are reused;
there are no new media-provider calls. The former lesson was silent and this
conversion also has no generated audio.

The complete sequence is 71.3 seconds at 1×. A single deterministic clock drives
body, camera translation, pose metadata and time controls. Pausing preserves
in-between frames; frame buttons step 1/30 second; 0.25× and 0.5× are available.
Pose selection and pose links open paused at that pose. Playback pauses on hide.
Study view preserves full-body framing and captions outside the canvas. Fixed
front, back, left, right and three-quarter views cover the complete form.

Source assets:
- `assets/animation/meghna-animation-atlas.jpg`: existing Google Gemini /
  Nano Banana Pro atlas, SHA-256
  `c4f417cb0c7347c4e2ddd4ed8cbe8f6f39f5097e681f0ceaa3cdedfef888aa71`.
- `assets/animation/kukkiwon-ci.png`: existing official CI artwork, SHA-256
  `4e1188b509072b4870ffbafc4470aad2e7eacd64edeec8ae933d8c710d0aa156`.
- Three.js 0.187.0: pinned files and MIT licence under `vendor/three/`.

The release is based on production commit
`e49c4d1c5de9545fd19247e188f529dc10e3253d`. Account configuration, database
setup, hosting policy, founder page/photo and catalogue data are unchanged.
The ongoing local audit/account work is not included in this release.
