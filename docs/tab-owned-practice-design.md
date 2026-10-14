# Tab-owned practice controls

Approved October 12, 2026. Replace the background-worker relay and practice iframe with a React panel in a Shadow DOM root on the YouTube page. The panel and playback controller run in the same isolated content-script context and communicate by direct callbacks. Keep the current appearance, range gestures, Prev/Next, lead phases, manual toolbar popup, and local record keys.

Each watch-page session owns its preferences, playback engine, catalog definition, and subscribers. Navigation disposes the old session and ignores late asynchronous results. Player/container replacement rebinds to the new media and restores the panel. Exiting stops practice and restores YouTube sizing. Multiple tabs have separate engines; saved preferences continue to use per-video keys.

Read/write preferences directly through chrome.storage.local. Serialize writes within a tab and keep playback usable if a save fails. Catalog fetch is a one-shot background request with a bounded timeout and cached/bundled fallback. Background restart cannot erase active playback state because no active-session map or port lives there. The manual popup uses current extension storage directly; it does not import old-format settings.

Scope: no Firebase, no keepalive heartbeat, no new permissions, no bookmark format changes. Remove obsolete practice ports, tokens, embedded-manual route and messaging-based height reporting. The unsupported-video panel points users to the toolbar's manual controls.

Styles must keep their existing 16px reference scale despite YouTube's 10px root. Install isolated panel styles and its font asset, measure panel height locally, and retain the existing player layout CSS. A page refresh or extension update may still require normal reinitialization; worker inactivity must not.

Verification: range/transport behavior; idle and playback with a dead worker; load fallback; ordered saves and failure recovery; delayed navigation responses; two separate sessions; player/container replacement; exit geometry, lead opacity and original popup. Run the full test suite and both runtime/popup builds. Inspect the actual production panel in a browser fixture at desktop and narrow widths. Repackage the next store version after verification.
