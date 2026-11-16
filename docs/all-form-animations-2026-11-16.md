# Source-based 3D reference lessons

Scope:22 new lessons, covering 540 numbered reference counts and 728 study poses. The existing Taegeuk Il Jang lesson is retained.

The source edition is stated on each lesson. All content remains pending instructor review; sourced facts, code validation and visual QA do not constitute technical certification. Stance depth, hand shape, timing, paths and closing motions are illustrations. The six black-belt forms follow the attributed DTaF1999 edition with documented corrections and school-source crosschecks; they are not claimed to reflect current2026 Kukkiwon competition standards. Reference inconsistencies and interpretations appear under review questions. No third-party photos, illustrations, video or narration were copied. No paid media requests were made.

| Lesson | Reference counts | Study poses | Seconds |
| --- | ---: | ---: | ---: |
| Taegeuk Yi Jang | 18 | 25 | 90.8 |
| Taegeuk Sam Jang | 20 | 36 | 130.1 |
| Taegeuk Sa Jang | 20 | 31 | 112.3 |
| Taegeuk Oh Jang | 20 | 34 | 123.0 |
| Taegeuk Yuk Jang | 19 | 33 | 120.3 |
| Taegeuk Chil Jang | 25 | 35 | 130.1 |
| Taegeuk Pal Jang | 27 | 40 | 159.2 |
| Koryo | 30 | 52 | 188.2 |
| Keumgang | 27 | 29 | 164.6 |
| Taebaek | 26 | 44 | 163.0 |
| Pyongwon | 21 | 33 | 119.9 |
| Sipjin | 28 | 47 | 200.1 |
| Jitae | 28 | 40 | 162.1 |
| Chon-Ji | 19 | 21 | 74.1 |
| Dan-Gun | 21 | 23 | 84.2 |
| Do-San | 24 | 26 | 96.8 |
| Won-Hyo | 28 | 30 | 110.0 |
| Yul-Gok | 38 | 40 | 150.4 |
| Joong-Gun | 32 | 34 | 130.3 |
| Songahm 1 | 18 | 20 | 71.4 |
| Songahm 2 | 23 | 25 | 89.5 |
| Songahm 3 | 28 | 30 | 107.3 |

Catalogue corrections: Taegeuk Yuk Jang23→19, Pyongwon25→21 and Sipjin31→28 match the cited reference counting conventions; no filler movements were added.

## Implementation and validation

Each page loads its own factual sequence from data/lessons. The shared player uses one continuous clock, fixed camera views, reduced-motion behavior, per-form pose links, keyboard/frame controls, pause on page hide and WebGL/data-load fallback. Compound counts can have several study poses.

The retargeter distinguishes stances, stationary hand changes, named-foot retreats, long turn paths, same-leg kicks, open hands, one-legged positions, airborne switches and ordered multi-foot sequences. Smooth spherical wrist paths, support-knee reach control and rotation-minimizing joint planes prevent independent limb jumps. Camera fitting uses the entire sampled movement envelope.

Automated checks cover all540 source counts, addressable poses, per-form transport/share links, stationary/retreating feet, long spins, double kicks, airborne phases, exact bone lengths, finite deformation, floor clearance and dense speed/acceleration limits. Exact release results, browser QA and deployment evidence are retained in the local release artifact folder.

Account flags, database files, hosting policy, approved founder photo and vendored renderer are outside this release and must remain byte-identical to the prior production release.

Release validation:226 automated checks passed. The120Hz real-rig audit sampled798226 garment vertices with finite deformation, maximum bone error1.03e-15m and maximum angular speed5.48rad/s. Browser and deployment evidence are retained separately.
