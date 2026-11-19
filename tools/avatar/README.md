# Detailed lesson avatar: how the asset is built

These scripts document how `assets/animation/avatar-v2.{json,bin}` was made. They are not part of `npm run check` and are not deployed (`tools` is in `.vercelignore`). Provenance and licence: `assets/animation/AVATAR-SOURCE.md`.

## Safety
- Blender 5.2.4, always headless with auto-run off: `Blender -b -Y --factory-startup …`. The source bundle's own text blocks are never run.
- The build keeps only the head and neck, the hands and the feet as skin and deletes every other body vertex before saving. All bundle objects, collections and texts are removed from the saved files. Review renders are of the clothed character only.

## Pipeline
1. **`build_avatar.py`** (stage A), run on the CC0 bundle `.blend`: crops the base mesh, fits the dobok shell, cuts the flat V collar into the jacket surface, raycasts the belt band onto the jacket torso and seats the knot and tails, adds hair, brows and eyes, and decimates to the web budget. Writes `stage_a/avatar_stage_a.blend` and `build.json` (joint landmarks).
2. **`export_poses.mjs`**: writes a few real lesson poses from this checkout's motion code for the review renders.
3. **`rig_pose.py`** (stage B), run on the stage A file: builds the 50-bone rig (with the shoulder and elbow helper bones), weights skin and cloth, rescales the limbs to the runtime's bone lengths and renders review poses. Weighting rules, in order:
   - sleeves and body panels are told apart by distance along the cloth from the cuff and by distance from the arm's centre line, with a 6 cm armhole blend through the shoulder helper;
   - the elbow blends over 10 cm through the elbow helper;
   - the trousers' crotch seam and waist follow the pelvis; the jacket skirt follows each thigh progressively below the belt;
   - smoothing passes, then the **belt cinch**: cloth under the belt band follows the torso only, with leg weight returning over 3 cm below it;
   - hands: the thumb follows its own chain joint to joint, and the web and pad at its base follow the thumb's root bone before blending into the palm (the pad fades out smoothly toward the knuckles); the palm follows the hand alone except in a band at the wrist, so a rolled wrist turns the palm whole;
   - feet: everything below the ankle follows the foot alone, blending into the shin over 4 cm above the ankle (under the hem);
   - collar, belt, knot and tails take the jacket's torso weights.
4. **`bake_hands.py`**: bakes each hand shape once as per-bone rotations in `hand_rules.json` (`shapes`, `knuckles`), so the Blender rig and the browser apply exactly the same fingers:
   - **fist:** the finger angles in `hand_rules.json` `fingers`; the thumb's middle joint against the thumb side of the folded index finger (its root swing capped at 14°) and its tip turned most of the way across the middle finger, so it lies over the fist instead of bowing out; the left thumb mirrors the right;
   - **knife-hand:** fingers straight and closed together (the index, ring and little-finger knuckles drawn part of the way toward the middle finger), thumb bent along the edge of the palm;
   - **spear-hand:** the knife-hand with the middle finger flexed so the fingertips line up;
   - **palm:** fingers together, slightly bent at the middle and end joints;
   - **ridge-hand:** knife-hand fingers with the thumb tucked against the palm just below the index knuckle.
   The thumb's root bone is held stiff in the open-hand solves so the thumb bends at its joints instead of dragging the skin at its base. The thumb-web test in `tests/detailed-avatar.test.mjs` bounds how far the skin round the thumb may stretch.
5. **`render_hands.py`** (review only): each hand shape from four sides.
6. **`export_web.py`**: writes the raw binary and JSON (runtime axes; bone rest frames; foot rest heading, toe drop and sole depth; hand rules).
7. **`package-asset.mjs`**: keeps only what the runtime reads and records the binary's length and FNV-1a checksum: `node tools/avatar/package-asset.mjs <export_dir>`.

## Runtime and checks
- `js/animation/avatar-core.js` builds and poses the avatar from the lesson's own joint positions; `js/animation/avatar.js` loads it and falls back to the procedural avatar when the asset can't be used.
- `tests/detailed-avatar.test.mjs` checks the real asset: weights, grounded feet at every held pose of all 23 lessons, side-kick soles, joints within 1 mm of the lesson's joints and no frame-to-frame flips at 30 fps, hand shapes, cloth and trim in the review poses, the size budget, unchanged lesson motion, and the fallback.
