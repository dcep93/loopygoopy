# Embedded practice mode

Status: proposed complete design for review. The user has confirmed frozen silent/metronome leads and click-or-drag range selection. This document does not authorize implementation by itself.

## Outcome and scope

A prepared YouTube video opens as a focused practice page when its URL contains the `loopygoopy` query parameter. Learners can repeat a small, clearly labeled part of a routine without entering BPM, finding timestamps, or keeping an extension popup open. Product language uses “practice,” “beats,” and “sections”; it does not categorize the app by the initial activity it serves.

The first published example is https://www.youtube.com/watch?v=xzeGxm72GOo&loopygoopy. Prepare one verified, constant-tempo, 32-beat section from this video. Its timing must be calibrated against the footage before publication; the previously saved BPM or start time is not sufficient evidence. Adding the other videos is a subsequent authoring workflow, not a requirement to prepare 30 videos in this implementation.

V1 includes the focused YouTube layout, shared practice controls, repeating playback phases, a remotely published catalog, and a small hosted library. It excludes automatic tempo detection, automatic progression through sections, multiple demonstrations per video, variable-tempo beat maps, learner accounts, and a custom publishing dashboard.

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

Use one extension-owned persistent store for both surfaces. `chrome.storage.local` is the proposed store because the background controller can access it directly. Port the current v0.0.2 records once from extension localStorage through the extension UI, verify writes before marking the port complete, and retain existing data until verification succeeds. This is a one-time transfer, not an ongoing fallback. Existing IDs, source metadata, bookmarks, and manual configs remain intact. Guided preferences occupy a separate field/namespace so curated timing does not overwrite personal presets, including Ozzy's.

Multiple tabs have separate playback sessions even when they show the same video. Saved preferences are per video; an edit in one tab must not seek or restart another tab's active session. Popup edits affect its bound tab and are reflected in that tab's embedded panel immediately. Serialize persistence and guard asynchronous initialization against stale responses.

## Publishing and the hosted site

Recommend Firestore for catalog data and Firebase Hosting for a small library at `loopygoopy.web.app`. Compared with bundling data in the extension, either hosted JSON or Firestore permits additions without an extension release. Firestore additionally permits editing individual entries without redeploying the site; a JSON catalog is the lower-complexity alternative if database publishing is unwanted.

Each catalog entry has a schema version, stable media ID, source URL, display title, original BPM, first-beat timestamp, total beat count, publication status, and revision. V1 validates 32 beats and positive finite BPM. Derive four-beat buttons from the definition. Publish only verified entries; reject invalid timestamps and unrecognized schemas rather than guessing timing.

The library lists published titles and opens canonical YouTube links with `&loopygoopy`. It explains the extension requirement. Learners do not sign in. Publishing uses the existing Firebase console or an owner-only script; do not build an authoring app in V1. Public clients can read published definitions only. Drafts and writes require owner authorization, with rules and validation tested before deployment. Store no private learner configs in the public catalog.

Fetch catalog data through the extension, validate it, and cache the last valid published definition per video. Remote content is data only; playback/UI code remains packaged with the extension. Refresh when opening a session. Pin an active session to its definition revision so a remote timing change cannot interrupt playback. Keep learner speed/range/lead preferences separate from the published definition.

If an entry is missing, say “This video isn't prepared yet” and offer exit or the existing manual controls; do not fabricate tempo. If offline, use a cached valid entry. If no valid entry is available, explain the loading failure and allow retry/exit. The golden entry can be packaged as an initial fallback.

The repository currently has no Firebase deployment configuration, and this review did not establish the live site's state. Implementation must inspect the existing Firebase project, site, and owner access before provisioning or deploying, preserve any existing hosted content, and resolve unavailable access explicitly.

## Delivery and validation

Implement and validate the local golden-example experience first, then add catalog publishing and the hosted library using the same definition schema. Do not deploy an uncalibrated example or overwrite an existing Firebase site without inspecting it.

Meaningful verification covers:

- Selection of 1–4, default 1–8, 1–12, 17–24, and 1–32; reverse drag, cancellation, release outside, and keyboard access.
- Every combination of lead style and zero/nonzero duration; 0.5×, 0.75×, and 1× speed; correct frozen frames and repeated leads.
- Boundary timing against the actual golden video, including buffering, seek delay, cancellation, and avoiding leftover metronome clicks.
- Popup/panel synchronization, popup closure, switching videos, multiple tabs, and exit restoring the ordinary page.
- Exact preservation of the existing migrated configs through the storage transfer, including Ozzy's original presets.
- Missing/invalid catalog entries, cached offline use, revisions, and unauthorized draft access/writes.

Regenerate the shipped content script with `tsc`, rebuild the popup, run targeted tests, and verify the end-to-end experience in Chrome. No application code has been changed by this design document.

## References

- Chrome content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Firebase Hosting: https://firebase.google.com/docs/hosting
- Firestore access rules: https://firebase.google.com/docs/firestore/security/get-started
