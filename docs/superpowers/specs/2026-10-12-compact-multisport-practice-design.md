# Compact multisport practice layout

Approved via `yesi` after the interactive layout preview on October 12, 2026.

Use the canonical multisport420 warm dark palette, tan borders/selected controls,
pink Comic Sans title, and newapp's bundled Comic Relief fallback with OFL license.
Scope the styling to the embedded practice view. The toolbar continues opening the
original manual controls and existing bookmarks retain their current behavior.

Place the full practice panel above the existing YouTube player. The header holds
the brand, video title, selected range, current count/phase, Play/Pause and Exit.
The next row contains the eight existing four-beat selection buttons. Speed and
independent lead-in/out duration and sound controls occupy the following row,
wrapping to additional rows on smaller windows. Keep the short range-selection
hint, repeat status and expandable Advanced details. Remove the large slogan and
oversized whitespace. Preserve pointer drag, keyboard range selection and all
playback commands.

Measure the panel's actual content height with ResizeObserver, send that height
through the existing background connection, and reserve the remaining viewport
height for the existing player. Contain the whole video without cropping, with
unused space around it as necessary. Window resizing, wrapped controls, open
Advanced details and errors must update the player space. Permit scrolling on
exceptionally short windows or large zoom rather than hiding controls or reducing
the video below 12rem tall. Target no scroll at desktop 1280×720 and 1024×600.

Keep all page overrides under the practice class. Exit/navigation removes the
panel, style, sizing variables and observers, restoring ordinary YouTube layout.
Keep manual fallback separate. Do not replace the underlying video or alter loop
timing, URL opt-in, saved records, or catalog loading.

Verification: exercise actual production React markup in a local browser fixture
with the production page-layout CSS, representative YouTube wrappers and a local
video still; measure viewport fit and inspect screenshots at both target sizes.
Cover panel ordering/removal, height relay and expanding/shrinking controls in
focused tests. Run the existing suite and rebuild runtime and popup. Verify live
YouTube after extension reload if the browser tool can access the embedded frame;
report that limit rather than treating a fixture as live YouTube proof.

Self-review: the layout contract distinguishes typical desktop fitting from the
readable small-window fallback; no settings or database migration is needed.
