# Prepared practice catalog

## Storage and delivery

`catalog.json` in this public repository is the source of truth. The extension fetches `https://raw.githubusercontent.com/dcep93/loopygoopy/master/catalog.json`. There is no Firebase, GitHub Pages, hosted library, publishing server, or service authentication.

The extension downloads the complete catalog without credentials or a referrer and matches the current video locally. Every video uses the same request URL. GitHub still receives ordinary network request information, such as the IP address; this design does not claim that no network data is transmitted.

A valid catalog is cached in extension storage for one hour. A new session after expiry refreshes it; an explicit Retry bypasses the extension cache. Concurrent sessions share a download. Invalid or unavailable remote catalogs fall back to the last valid cache, then the bundled catalog. Successful remote catalogs are authoritative for which videos are included. Already running practice sessions retain their definition until reloaded/retried while paused.

GitHub's own caching can also delay updates. No cache-busting video IDs or personal information are added to requests. Bookmarks, preferences, and manual configurations remain on the computer.

## Preparing and publishing a video

1. Add an entry to the `videos` array in `catalog.json`. The envelope uses `schemaVersion: 1`. Each entry needs a unique `youtube:<video-id>`, canonical watch URL, title, positive BPM, beat-1 time in seconds, exactly 32 beats, `status: "published"`, and a positive integer revision.
2. Verify the numbered counts against the actual footage at normal and reduced speed. Confirm all four-beat boundaries and the section end; check 1–4, 1–12, 17–24, and 29–32, all lead styles, and repeated cycles. Increment the entry's revision for timing corrections.
3. From the repository root, run `node scripts/validate-catalog.mjs`. This validates the catalog and refreshes the generated Practice catalog links in `README.md`. On a fresh checkout, first run the extension build to generate the shared validator.
4. Commit and push `catalog.json` and the refreshed `README.md` to master. The raw URL then serves the updated data once GitHub's cache refreshes. No deployment command or extension review is needed for catalog data changes.

Everything in the public repository and its history is public. Keep drafts, unverified entries, credentials, and personal configs out of it; `status: "draft"` is not a privacy mechanism and the validator rejects drafts. A single malformed entry or duplicate ID rejects the catalog rather than partially replacing a valid cache.

The extension build copies the validated source catalog into `extension/app/src/practice/bundled-catalog.json`; edit the root file, not that generated fallback. `golden.json` in the practice test directory remains the calibration fixture.

## Public list of practice links

Share [the README catalog](https://github.com/dcep93/loopygoopy#practice-catalog). Its links use each entry's title and source URL with `&loopygoopy` added, so the installed extension opens practice mode. GitHub renders the list without a separate website.

`node scripts/validate-catalog.mjs` regenerates only the section between the README's `practice-catalog` comments, preserving the rest of the file. The extension build runs this same command. Edit `catalog.json`, not the generated list. Passing an alternative JSON filename to the validation command only validates that file and does not update the README.

## Golden example

The golden example uses 81 numbered beats/minute with beat 1 at approximately 12.64 seconds. Its 32-beat interval ends at 36.3437 seconds; beats 17–24 span 24.4919–30.4178 seconds. Timing was checked against the audio pulse and video frames around the first and final section boundaries. The [choreographers' count sheet](https://www.copperknob.co.uk/stepsheets/K3PHTPZ/3-tequila-floor/download/pdf) distinguishes numbered counts from subdivisions. The initial timing still needs an end-to-end playback check in the installed extension before treating it as final calibration.

## Shady

[Moonshine demo](https://www.youtube.com/watch?v=LaYwiyrqGiA) and [matching step sheet](https://www.copperknob.co.uk/stepsheets/MSJT937/shady/download/pdf), by Darren Bailey, Fred Whitehouse and Amy Glass. The video description identifies this choreography. The catalog covers the first main 32-count sequence, without later tags or restarts.

Calibration on October 12, 2026: 100 BPM, count 1 at 23.14 seconds, exclusive end at 42.34 seconds. Audio-transient measurements across all 32 counts fit 99.994 BPM with a 23.1397-second origin (maximum residual about 11 ms). Frame checks at the numbered counts match the section turns and final turn into the first tag. These values follow the musical pulse; individual dancers can land slightly before or after it.

Four-count boundaries are 23.14, 25.54, 27.94, 30.34, 32.74, 35.14, 37.54, 39.94 and 42.34 seconds. The first two lead-in counts span 21.94–23.14; there is no choreographed pickup to encode. Track lead-out after the full sequence shows the video's actual tag footage; the footwork stream describes only the selected main sequence.

User-confirmed notation: simultaneous weight transfers and knee pops/hitches show the receiving foot (L at 4; R at 18). Special-only actions use stars, retaining L through 15&–16 and 30&–32. The extended hold after 20 uses dashes until the transfer at 21&. No additional weight clicks are invented for these holds or specials.

Verification: all 36 contiguous four-count selections were checked against the 0.6-second count grid. A local browser fixture using the actual demo clip and production controls verified full-sequence playback, weight clicks, and repeated 17–24 playback at 90% speed. The existing 202 tests and both extension builds passed. After publication, the installed Chrome extension loaded Shady via Retry, started the track lead-in near 21.94 seconds, played the first eight-count loop, and paused cleanly. The page was left paused at count 1 with 1–8 selected.

## October 12 catalog additions

Each entry covers the first complete 32-count sequence, with no choreographed pickup. Timing was measured from the audio pulse and checked against numbered-count video frames. The measured tempos below intentionally follow these recordings.

| Entry | BPM | Count 1 (seconds) | Exclusive end |
| --- | ---: | ---: | ---: |
| After Party — Rain On Me | 123 | 16.68 | 32.2898 |
| The Wolf | 100.93 | 13.70 | 32.7231 |
| Country Girl Shake | 106 | 17.60 | 35.7132 |
| Cowgirl | 167.15 | 13.35 | 24.8367 |

- **After Party:** [Maurice Rowe's sheet](https://www.copperknob.co.uk/stepsheets/3J25PD4/after-party) and the linked Moonshine demo. This recording uses Lady Gaga and Ariana Grande's “Rain On Me.” The user confirmed matching its stated modification: R step at 29, L kick at 30, then the L coaster. The swivel at 18 retains R. Hip bumps retain support, as requested: R at 21 and L at 23, with stars for the subsequent bumps.
- **The Wolf:** [Jonno Liberman's sheet](https://www.copperknob.co.uk/stepsheets/93HFRDG/the-wolf). Hitches, flicks, touches, heel swivels and the final hip circle are special markers without new weight clicks. The later restart is outside the selected first sequence.
- **Country Girl Shake:** [Michele Adlam and Maria Hennings Hunt's sheet](https://www.copperknob.co.uk/stepsheets/RQ78MFX/country-girl-shake). The first turning shuffle finishes on L, as shown in the demo and required by the following R walk; the sheet's second “RF” at count 8 is a typo. Hip bumps use stars, with the explicitly specified final L transfer at 24. Heel touches are stars; heel returns and the heel grind carry weight.
- **Cowgirl:** [Sara Honey-DeLong's sheet](https://www.copperknob.co.uk/stepsheets/NK5CJH5/cowgirl). Count 24 transfers to L, as the sheet and choreographer's clarification specify. Other touches and flicks retain support. The final stomps are weighted.

Four-count boundaries, in seconds:

- After Party — Rain On Me: 16.68, 18.6312, 20.5824, 22.5337, 24.4849, 26.4361, 28.3873, 30.3385, 32.2898.
- The Wolf: 13.7, 16.0779, 18.4558, 20.8337, 23.2115, 25.5894, 27.9673, 30.3452, 32.7231.
- Country Girl Shake: 17.6, 19.8642, 22.1283, 24.3925, 26.6566, 28.9208, 31.1849, 33.4491, 35.7132.
- Cowgirl: 13.35, 14.7858, 16.2217, 17.6575, 19.0933, 20.5292, 21.965, 23.4009, 24.8367.

Verification: all 202 existing tests passed; the production runtime and popup builds passed. All 36 contiguous four-count ranges per new entry matched their timing grids. The production practice controls were exercised with actual clips: full-sequence repeats for After Party, The Wolf and Cowgirl, plus repeated 17–24 playback for Country Girl Shake at 90% speed. Each opened paused and generated weight clicks. Existing catalog entries were compared against the previous commit and remained unchanged. After publication, the raw GitHub catalog served all six entries. The installed Chrome extension refreshed its cached catalog with Retry, loaded After Party and started the correct track lead-in near 15.70 seconds.

These are catalog-only additions. Publish the root catalog and regenerated README; existing extensions fetch them without a Web Store update. The bundled fallback is regenerated by the normal extension build.

## Extension release gate

After building, reload Loopy Goopy in Chrome's Extensions page and refresh the golden-example page. Browser automation cannot operate the extension-management page in this environment, so the reload requires the user.

Check the embedded layout and player sizing; lead/speed combinations; consistent original popup behavior on all videos and explicit manual playback takeover; navigation between prepared and unprepared videos; idle/resume without a background-worker connection; and the real saved Ozzy bookmarks after the one-time migration. Before a public Chrome Web Store release, also assess migration from the currently published extension version: automatic transfer supports `v0.0.2` records only, and does not convert older `v0.0.1` records. Automated tests do not replace these installed-Chrome checks. Use the [release guide](chrome-web-store-release.md) and [privacy policy](../PRIVACY.md) for the store update.

## Optional weight stream

Add `footwork: { sourceUrl, cues }` to an entry and increase its revision. Each cue has a one-based `beat` (quarter-count increments), `duration` (0.25, 0.5 or 1), and `symbol` (R, L, r, l, -, *). R/L are quick (0.5 count); a letter then - is slow (0.5 + 0.5 count); r/l are super-quick (0.25 count). A dash holds weight for 0.5 count. A * retains weight and may use any supported duration. Cues must be ordered, non-overlapping and bounded between 0.5 and the exclusive end at 33. Missing footwork omits the strip. The source URL must be HTTPS and is attribution data, never executed or fetched by the extension.

The example includes the pickup at 0.5 and its next occurrence at 32.5. It follows the main two-walk sequence at 15–16. Special actions retain the previous weight, including the press/wobble through 24 until the transfer at 24.5. See `docs/weight-stream-design.md` for the confirmed notation choices. The renderer does not extrapolate choreography beyond the supplied cues.
