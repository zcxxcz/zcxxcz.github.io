# 问号之后 / After the Question

54-second independent anniversary tribute. 1920×1080, 30 fps, 16:9. No narration.
Original procedural artwork and original algorithmically composed instrumental score.
No official logo, footage, screenshots, music, external samples or stock loops are used.

## Fact and date boundary

The anniversary is 2026-11-30. This edition is prepared on 2026-11-11 using facts verified
through that date. No later events or anniversary-date audience estimates are asserted.
See `../sources.json` for sources and per-claim qualifications.

## Design research, before production

Observed OpenAI's homepage, GPT-6 Astra blog hero, and verified official launch film
at https://www.youtube.com/watch?v=1QNsdr-Qx_I . Sampled its opening, around 00:56,
02:07 and 02:35. The references supplied neutral sans typography, black/white structure,
rounded controls, warm light, luminous depth, and transitions from a request to a result.
The film reinterprets those ideas through its own lime/orange palette, time ruler,
particle torus, abstract geometry and editorial typography. A third-party label appears
throughout, with a clear independent-creation credit at the end.

## Reproduce

Dependencies: Node 24, FFmpeg, Python 3, `@napi-rs/canvas@1.1.0`, NumPy and SciPy.
Install in a separate production environment; no changes to the hub's package manifest
are required. All random choices are seeded or deterministic.

```sh
npm install @napi-rs/canvas@1.1.0
python -m pip install numpy scipy
node film.mjs --stills
node film.mjs
python music.py
```

The scripts default to the parent content directory. `TRIBUTE_OUTPUT` redirects masters
and stills to a temporary directory. `TRIBUTE_NODE_MODULES` may point to an external
node_modules directory. Set `TRIBUTE_CJK_FONT` and `TRIBUTE_SANS_FONT` to local font files
to reproduce on Windows/Linux. On macOS, the renderer uses installed Arial, Hiragino
Sans GB and Menlo. Font files are not distributed.

The picture renders frame by frame into FFmpeg's RGBA pipe (not a browser screen
recording). It produces `picture.mp4`. Music produces `score-raw.wav`, a stereo 48 kHz
master. Normalize the score to -14 LUFS with a -1 dBTP ceiling using FFmpeg loudnorm,
then allow 0.4 dB additional codec headroom and mux AAC at 320 kbit/s into the MP4.
Final measured audio: -14.36 LUFS integrated, -1.13 dBTP. Export duration is 54 seconds.
`after-the-question.mp3` is a separate 256 kbit/s music export.

## Musical score

160 BPM, 4/4, 36 bars = 144 beats = exactly 54 seconds. Scene boundaries occur every
8 beats (3 seconds). The score moves through Dm(add9), Bbmaj7, F(add9), C(sus2),
resolving to Fmaj9. Melody, arpeggios, bass patterns and drum sequencing are specified
in `music.py`. Instruments use oscillators, filtered seeded noise and envelopes.
The final cadence begins at 51 seconds and decays into the final credit.

## Verification

Inspect all 18 scene stills for typography, margins and numeric qualifications. Probe
the final MP4 for duration, dimensions, frame rate, audio layout and codec. Decode the
entire video and audio to check for errors, and measure final loudness and true peak.
The accompanying video page includes a full text timeline and primary-source ledger.
