# Embedded practice mode

Status: approved with `yesi`; local implementation built. The user subsequently chose a raw GitHub JSON catalog with no website or database. Installed-Chrome verification remains pending. See `docs/practice-publishing.md` for current setup and verification gates.

## Outcome and scope

A prepared YouTube video opens as a focused practice page when its URL contains the `loopygoopy` query parameter. Learners can repeat a small, clearly labeled part of a routine without entering BPM, finding timestamps, or keeping an extension popup open. Product language uses “practice,” “beats,” and “sections”; it does not categorize the app by the initial activity it serves.

The first published example is https://www.youtube.com/watch?v=xzeGxm72GOo&loopygoopy. Prepare one verified, constant-tempo, 32-beat section from this video. Its timing must be calibrated against the footage before publication; the previously saved BPM or start time is not sufficient evidence. Adding the other videos is a subsequent authoring workflow, not a requirement to prepare 30 videos in this implementation.

V1 includes the focused YouTube layout, shared practice controls, repeating playback phases, a remotely published JSON catalog. It excludes automatic tempo detection, automatic progression through sections, multiple demonstrations per video, variable-tempo beat maps, learner accounts, and a custom publishing dashboard.

## Page and controls

Detect the parameter with URL parsing, including the bare `&loopygoopy` form. Activate only on supported YouTube watch pages. Handle initial loading, YouTube navigation without a full reload, and leaving the flagged URL. Restore the ordinary page on exit.

Keep YouTube's existing player mounted. Hide surrounding recommendations, comments, and navigation while focused mode is active, and place the practice panel beneath the video. Avoid rebuilding the player or deleting the page DOM. Provide “Exit practice mode.” Playback starts with an explicit Play action.

The panel contains:

- A prepared title, selected range, and large current beat within the full section, such as “Beat 19 of 32 · Practicing 17–24.”
- Eight equal buttons: `1–4`, `5–8`, `9–12`, `13–16`, `17–20`, `21–24`, `25–28`, `29–32`.
- Play/Pause and playback speed. Proposed speed shortcuts are 0.5×, 0.75×, and 1×, with small increase/decrease controls for intermediate speeds.
- Separate lead-in and lead-out rows. Each has a nonnegative whole-beat duration, default 2, and Track / Silent / Metronome segmented buttons. Proposed initial style is Track for both; zero beats disables that lead.
- A restrained Advanced area for existing technical controls where applicable. Normal guided practice never requires a BPM field, timestamps, or bookmark dropdown.

The default selection is 1–8. Restore the learner's saved selection, speed, and leads on subsequent visits to that video. Show a visible phase label during leads rather than pretending those beats are part of the selected range. Keep controls keyboard accessible with visible focus and expose phase/selection text to assistive technology without announcing every fast beat automatically.

## Range gestures

Clicking a block selects only that block. Pressing and dragging across blocks previews the inclusive range between the initial and current block; releasing commits it. Reverse drags work. Every gesture replaces the old selection, and there are never gaps.

There is no remembered first-click/second-click mode. A canceled pointer gesture restores the prior selection. Release outside the row resolves to the nearest valid endpoint. Keyboard users can focus and select a block and extend the range using Shift+Arrow keys. Support pointer capture so mouse and touch drags behave consistently.

While playback runs, previewing a drag does not repeatedly seek. Committing a changed range cancels the current cycle and starts the new range with its lead-in. While paused, committing seeks to the new start and remains paused. Changing speed or lead settings while running also restarts a clean cycle; no old timers or clicks remain active.

## Playback semantics

Every repetition is lead-in → selected beats → lead-out → repeat. A 32-beat section is a span inside the video, not a claim about the whole video's duration.

For original BPM `b`, first-beat timestamp `t0`, and inclusive selection `a..z`, the video interval is `[t0 + (a-1)*60/b, t0 + z*60/b)`. At playback speed `r`, each beat lasts `60/(b*r)` wall-clock seconds. Use this same speed-adjusted duration for synthetic leads and metronome clicks.

Lead styles apply independently before and after the selected interval:

| Style | Lead-in | Lead-out |
| --- | --- | --- |
| Track | Play the requested preceding footage with its audio | Play the requested following footage with its audio |
| Silent | Hold the first frame of the selected interval without audio | Hold the final available frame inside the selected interval without audio |
| Metronome | Hold the same starting frame and play beat clicks | Hold the same ending frame and play beat clicks |

After lead-out, seek to the next cycle's starting position. Frozen leads show an explicit remaining-beat count. Preserve the user's volume and ordinary audio settings. If Track runs beyond the physical start/end of the video, fill the unavailable portion with a silent frozen hold so the requested lead length remains consistent. Prepared section timestamps themselves must fit inside the video.

Drive practice beat display and interval boundaries from the player's actual media time, not a single wall-clock timeout. Buffering and seeking must not advance the displayed practice count. Synthetic frozen phases use a monotonic clock and cancellable audio scheduling. Seek completion precedes starting the next phase. Pause cancels scheduled clicks and holds position; Play restarts the selected range with its lead-in. Navigation, exiting practice mode, and a replaced session stop the old controller and restore page/audio state.

## Shared UI and state

Extract reusable controls from the current popup. The embedded panel and popup render the same practice component and communicate with the same per-tab controller; opening or closing the popup does not reset playback. The embedded panel is packaged with the extension, preferably as an extension-owned iframe for CSS isolation and build reuse. The existing YouTube player stays outside this frame.

The content script controls the player and reports phase, media time, buffering, and playback status. Extension messaging binds each view to its actual tab and video, validates the sender/session, and rejects stale or mismatched commands. Remove reliance on a single remembered background tab when routing shared controls. Navigation invalidates the old session before loading another video's settings.

Use one extension-owned persistent store for both surfaces. `chrome.storage.local` is the proposed store because the background controller can access it directly. Port the current v0.0.2 records once from extension localStorage through a packaged offscreen extension document (avoiding embedded-frame storage partitioning), verify writes before marking the port complete, and retain existing data until verification succeeds. This is a one-time transfer, not an ongoing fallback. Existing IDs, source metadata, bookmarks, and manual configs remain intact. Guided preferences occupy a separate field/namespace so curated timing does not overwrite personal presets, including Ozzy's.

Multiple tabs have separate playback sessions even when they show the same video. Saved preferences are per video; an edit in one tab must not seek or restart another tab's active session. Popup edits affect its bound tab and are reflected in that tab's embedded panel immediately. Serialize persistence and guard asynchronous initialization against stale responses.

## Publishing the catalog

The user selected a single public `catalog.json` file served from `https://raw.githubusercontent.com/dcep93/loopygoopy/master/catalog.json`. No Firebase, GitHub Pages, hosted library, publishing service, or credentials are needed. An ordinary commit and push publishes catalog changes, subject to GitHub caching.

Each definition retains its schema version, media ID, canonical URL, title, BPM, first-beat timestamp, 32-beat count, published status, and revision. The catalog envelope has schemaVersion 1 and a videos array with unique media IDs. Validate the entire catalog before caching it. Keep drafts and all personal configs out of this public file and public Git history.

Fetch the same complete catalog for every video, and perform video matching locally. Cache it in extension storage for one hour; concurrent sessions share one in-flight fetch. Retry explicitly refreshes it. A failed request or invalid response uses the last valid cache, then the catalog bundled with the installed extension. Successfully fetched catalogs are authoritative for missing entries. An active session keeps its definition until reloaded/retried while paused. Remote content is JSON data only; UI and playback code remain packaged in the extension.

Publishing is editing and validating the JSON, then committing and pushing to master. Extension code updates still use the Chrome Web Store release workflow. The existing practice preferences and saved manual configs remain untouched. The branding link points to the repository README instead of an undeployed site.

## Delivery and validation

Validate the local golden-example experience and the catalog loader. Verify the public raw file after pushing. Installed-Chrome playback checks remain required before releasing the extension.

Meaningful verification covers:

- Selection of 1–4, default 1–8, 1–12, 17–24, and 1–32; reverse drag, cancellation, release outside, and keyboard access.
- Every combination of lead style and zero/nonzero duration; 0.5×, 0.75×, and 1× speed; correct frozen frames and repeated leads.
- Boundary timing against the actual golden video, including buffering, seek delay, cancellation, and avoiding leftover metronome clicks.
- Popup/panel synchronization, popup closure, switching videos, multiple tabs, and exit restoring the ordinary page.
- Exact preservation of the existing migrated configs through the storage transfer, including Ozzy's original presets.
- Missing/invalid catalog entries, cached offline use, revisions, shared downloads, and ensuring every request uses the same URL without a video ID.

Regenerate the shipped content script with `tsc`, rebuild the popup, run targeted tests, and verify the end-to-end experience in Chrome. Automated coverage and build results are recorded with the implementation; installed-browser checks remain a separate delivery gate.

## References

- Chrome content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- GitHub raw files: https://docs.github.com/en/repositories/working-with-files/using-files/viewing-and-understanding-files
