# Narrated study lessons — 16 November 2026

All 23 study lessons now include recorded ElevenLabs instructions for all 748
study poses. Sarah is a stock voice; no voice cloning was used. The original
English cues describe the existing draft animation, not a certified curriculum.
Existing instructor-review notices and reference editions remain applicable.

## Playback and layout

- One shared lesson timeline drives the full-body character, captions and audio.
  Each movement is extended when necessary to finish its instruction; pose
  endpoints and original choreography are unchanged.
- Play, pause, frame stepping, scrubbing, selected-pose replay, visibility changes
  and quarter/half speed keep voice and motion together. Buffering briefly holds
  the visual clock; unavailable audio falls back to the visual lesson.
- Voice can be turned off. No playback preference is stored, and page loading
  does not start audio.
- The normal canvas is capped at 360 px. Study view is capped at 640 px high and
  920 px wide and fits within the available viewport. Controls remain visible at
  tested phone and landscape sizes; the renderer keeps the full body in frame.

## Media provenance and maintenance

`data/narration/catalog.json` records SHA-256 hashes, byte sizes, durations and
provider information for all 23 tracks. There are 371 deduplicated utterances,
26,482 generation characters and four generation requests using
`eleven_multilingual_v2`. The generation used 11,652 included credits, without
account or plan changes. Credentials are not shipped or stored in this repo.

`scripts/prepare-narration.mjs` produces scripts and a deduplicated bank plan.
Provider generation is a separate authorized operation. With the matching private
bank audio/alignment checkpoints, `scripts/assemble-narration.py` rebuilds all
tracks offline using ffmpeg and ffprobe. Changing the written cues requires
regenerating the corresponding speech, assembling the tracks and updating their
manifests; editing captions alone would leave the recording inconsistent.

## Validation and release scope

234 automated checks pass, including manifest/media integrity, complete pose
coverage, unchanged motion endpoints, malformed timing rejection, pause/rate/
seek behavior, buffering recovery, and MP3 byte-range serving. Browser checks
cover pause, selected-pose replay, voice off/on resynchronization and quarter
speed. Responsive checks cover 320–1280 px widths and 375–720 px heights, with
no player overflow in the tested Study view sizes.

This release changes only narration, playback integration, compact player
layout, lesson descriptions and supporting tooling/tests. Accounts, database,
security configuration, founder page/photo and animation choreography remain
unchanged. The pre-release production commit is
`92b8fcebe156f729f375ece03adf0899059fa0cf`; its known-good deployment is
`https://tkdflow-ftfy1u666-meghnasankars-projects.vercel.app`.
