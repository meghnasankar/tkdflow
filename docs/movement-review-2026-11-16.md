# Movement and narration review — 16 November 2026

Scope: all 23 study animations, 748 study poses, 169 explicitly described turns
and 29 marked kihaps. The review compares the rendered motion with the site's
attributed reference editions and checks the recorded instruction for each pose.
It is an engineering/content review, not approval by a qualified taekwondo
instructor. Existing school/edition differences and instructor-review notices
remain in place.

## Corrected source and rendering mismatches

- Taegeuk Il Jang: reverse the two incorrect spoken turns at movements 7 and 9;
  retain the actual right/left body paths. Remove the extra shout at movement 10;
  the linked Lehigh Valley curriculum specifies the final movement 18 kihap.
- Taegeuk 6: describe the branch turn when the block lands, rather than assigning
  it to the preceding forward roundhouse kick. Put the movement 12 kihap on the
  kick itself. Keep the five-second low opening block deliberate.
- Taebaek: keep both active hands in the simultaneous high-block/knifehand strike
  and downward palm-block/spearhand combinations. The second action previously
  overwrote the first arm's endpoint or supporting hand.
- Koryo, Keumgang and Taegeuk 7: middle opening blocks stay at the middle level;
  low opening blocks remain distinct. Diamond blocks retain one high arm and one
  low arm; crane feet point down. Keumgang concentration positions keep slow pace.
- Songahm 3: backfists at counts 20 and 22 target the middle section, following the
  detailed official ATA sheet. ATA forearm block heights follow the source table.
- Do-San, Won-Hyo, Yul-Gok and Joong-Gun: preserve the specifically retained hand
  positions during eight low/front kicks. Keep the opposite fist at the shoulder
  in Won-Hyo's inward knifehand strikes. ITF knifehand guarding blocks retain the
  second open guarding hand. High double-forearm and wedging blocks remain high.
- Keep the uniform visible throughout travel. The skeleton moves independently
  of the mesh root; a cached rest-pose culling sphere previously hid clothing in
  some later poses. The two small skinned garments now remain rendered.

## Power, sound and synchronization

Techniques prepare, finish together with a quicker controlled drive, then hold.
Hand delivery is about 0.8 seconds at normal speed; kicks about 0.85 seconds.
Slow/concentration movements keep their deliberate pacing. Body and supporting
feet settle with the finish; no camera shake, flashing or fake collision is used.
The joint-plane calibration uses the actual narrated cadence, avoiding elbow
flips caused by applying the old calibration to the stronger hand timing.

Three brief original ElevenLabs effects supply a female athlete's breath-driven
"Ha!" kihap, a sleeve swish and a kick swish. Separate effect tracks share the
lesson clock with narration and motion; Voice and Effects have independent
switches. Pause, scrubbing, replay, slow playback and page hiding synchronize
both tracks. Kihaps occur after the spoken instruction at the actual finish,
with a small modeled mouth movement. The face uses no photo or cloned voice.

Existing speech banks were reused. Only 3,780 new script characters, three speech
requests and three short effect requests were generated. Public media hashes and
provider provenance are in data/narration/catalog.json. No account/plan changes
or credentials are included.

## Validation and practical limits

244 release checks pass. Independent dense samples at 120 Hz cover all 23
narrated forms: maximum joint speed 2.31 m/s, maximum acceleration 14.92 m/s²,
finite connected limbs and no phase-boundary discontinuities. These numerical
checks detect mismatches and jumps; they do not certify biomechanics or style.
Visual review samples five poses from every form, with focused checks of the
corrected combinations and long travel paths. Local review images and release
proof are retained outside the deployed site.

The original reference corpus is retained: Lehigh Valley, North Bay and the Sun
Bae handbook for Taegeuk; the DTaF 1999 illustrated edition and stated school
crosschecks for black-belt forms; ITF-D/NP/Southbury sheets for ITF; and official
ATA 2024 form sheets for Songahm. See each lesson's linked edition and open review
questions. The 1999 black-belt edition is not represented as current competition
certification.

## Per-form coverage

| Lesson | Poses checked | Turn cues checked | Audible kihaps |
| --- | ---: | ---: | ---: |
| taegeuk-1 | 20 | 9 | 1 |
| taegeuk-2 | 25 | 9 | 1 |
| taegeuk-3 | 36 | 9 | 1 |
| taegeuk-4 | 31 | 9 | 1 |
| taegeuk-5 | 34 | 9 | 1 |
| taegeuk-6 | 33 | 9 | 1 |
| taegeuk-7 | 35 | 9 | 1 |
| taegeuk-8 | 40 | 9 | 2 |
| koryo | 52 | 4 | 2 |
| keumgang | 29 | 8 | 2 |
| taebaek | 44 | 8 | 2 |
| pyongwon | 33 | 2 | 2 |
| sipjin | 47 | 5 | 3 |
| jitae | 40 | 5 | 2 |
| chon-ji | 21 | 8 | 0 |
| dan-gun | 23 | 8 | 0 |
| do-san | 26 | 10 | 0 |
| won-hyo | 30 | 8 | 0 |
| yul-gok | 40 | 10 | 0 |
| joong-gun | 34 | 9 | 0 |
| songahm-1 | 20 | 4 | 2 |
| songahm-2 | 25 | 6 | 2 |
| songahm-3 | 30 | 2 | 3 |

Pre-release production/rollback target:
https://tkdflow-er9fl7mf2-meghnasankars-projects.vercel.app

Accounts, SQL, hosting security configuration, founder page/photo, the approved
character artwork and the vendored renderer are outside this release.


## Clarifying long turns

The user observed that a cue saying only "turn left" could precede a 270-degree
turn. The attributed Frontline Taebaek teaching reference explicitly describes
that longer left-shoulder path at the corresponding diamond block. All 15
source-prescribed 270-degree turn cues now say "three-quarter turn" aloud; the
visible cue retains 270°. Full turns already say "all the way around". This is a
wording correction, not substitution of a shorter path to the same endpoint.
