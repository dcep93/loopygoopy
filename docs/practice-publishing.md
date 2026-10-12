# Prepared practice catalog

## Storage and delivery

`catalog.json` in this public repository is the source of truth. The extension fetches `https://raw.githubusercontent.com/dcep93/loopygoopy/master/catalog.json`. There is no Firebase, GitHub Pages, hosted library, publishing server, or service authentication.

The extension downloads the complete catalog without credentials or a referrer and matches the current video locally. Every video uses the same request URL. GitHub still receives ordinary network request information, such as the IP address; this design does not claim that no network data is transmitted.

A valid catalog is cached in extension storage for one hour. A new session after expiry refreshes it; an explicit Retry bypasses the extension cache. Concurrent sessions share a download. Invalid or unavailable remote catalogs fall back to the last valid cache, then the bundled catalog. Successful remote catalogs are authoritative for which videos are included. Already running practice sessions retain their definition until reloaded/retried while paused.

GitHub's own caching can also delay updates. No cache-busting video IDs or personal information are added to requests. Bookmarks, preferences, and manual configurations remain on the computer.

## Preparing and publishing a video

1. Add an entry to the `videos` array in `catalog.json`. The envelope uses `schemaVersion: 1`. Each entry needs a unique `youtube:<video-id>`, canonical watch URL, title, positive BPM, beat-1 time in seconds, exactly 32 beats, `status: "published"`, and a positive integer revision.
2. Verify the numbered counts against the actual footage at normal and reduced speed. Confirm all four-beat boundaries and the section end; check 1–4, 1–12, 17–24, and 29–32, all lead styles, and repeated cycles. Increment the entry's revision for timing corrections.
3. From the repository root, run `node scripts/validate-catalog.mjs`. On a fresh checkout, first run the extension build to generate the shared validator.
4. Commit and push `catalog.json` to master. The raw URL then serves the updated data once GitHub's cache refreshes. No deployment command or extension review is needed for catalog data changes.

Everything in the public repository and its history is public. Keep drafts, unverified entries, credentials, and personal configs out of it; `status: "draft"` is not a privacy mechanism and the validator rejects drafts. A single malformed entry or duplicate ID rejects the catalog rather than partially replacing a valid cache.

The extension build copies the validated source catalog into `extension/app/src/practice/bundled-catalog.json`; edit the root file, not that generated fallback. `golden.json` in the practice test directory remains the calibration fixture.

## Golden example

The golden example uses 81 numbered beats/minute with beat 1 at approximately 12.64 seconds. Its 32-beat interval ends at 36.3437 seconds; beats 17–24 span 24.4919–30.4178 seconds. Timing was checked against the audio pulse and video frames around the first and final section boundaries. The [choreographers' count sheet](https://www.copperknob.co.uk/stepsheets/K3PHTPZ/3-tequila-floor/download/pdf) distinguishes numbered counts from subdivisions. The initial timing still needs an end-to-end playback check in the installed extension before treating it as final calibration.

## Extension release gate

After building, reload Loopy Goopy in Chrome's Extensions page and refresh the golden-example page. Browser automation cannot operate the extension-management page in this environment, so the reload requires the user.

Check the embedded layout and player sizing; lead/speed combinations; consistent original popup behavior on all videos and explicit manual playback takeover; navigation between prepared and unprepared videos; idle/resume without a background-worker connection; and the real saved Ozzy bookmarks after the one-time migration. Before a public Chrome Web Store release, also assess migration from the currently published extension version: automatic transfer supports `v0.0.2` records only, and does not convert older `v0.0.1` records. Automated tests do not replace these installed-Chrome checks. Use the [release guide](chrome-web-store-release.md) and [privacy policy](../PRIVACY.md) for the store update.

## Optional weight stream

Add `footwork: { sourceUrl, cues }` to an entry and increase its revision. Each cue has a one-based `beat` (half-count increments), `duration` (0.5 or 1), and `symbol` (R, L, r, l, -, *). R/L/- last one count; r/l last half a count; * may last either. Cues must be ordered, non-overlapping and bounded between 0.5 and the exclusive end at 33. Missing footwork omits the strip. The source URL must be HTTPS and is attribution data, never executed or fetched by the extension.

The example includes the pickup at 0.5 and its next occurrence at 32.5. It follows the main two-walk sequence at 15–16. Special actions retain the previous weight, including the press/wobble through 24 until the transfer at 24.5. See `docs/weight-stream-design.md` for the confirmed notation choices. The renderer does not extrapolate choreography beyond the supplied cues.
