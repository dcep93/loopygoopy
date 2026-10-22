# Continuous track playback

The user approved fixing redundant playback restarts at opacity changes. Track
lead-in, practice, and track lead-out use adjacent portions of the same video,
so those phase boundaries must not pause, seek, or call play again. Counters,
opacity, and weight clicks must continue following media time.

Keep the existing phase methods and explicitly allow continued playback when
entering practice from a track lead-in or entering a track lead-out. Moving
phases leave media running; the next phase owns any required transport change.
Initial playback and loop restarts seek normally. Frozen leads still seek and
pause. Existing cancellation and error handling remain responsible for stopping
playback. A paused or ended video cannot take the continuous path.

This is narrower than replacing the engine with a new state machine and avoids
guessing continuity from proximity to a timestamp. Existing boundary-exclusive
weight cues must remain single-shot, including with live range changes.

Verify no pause, seek, play, or seeking-phase notification across both track
boundaries, using the reported video's timing and multiple speeds. Verify loop
restarts still seek. Run the lead-style, buffering, cancellation, and weight-cue
tests, then the full suite, TypeScript compilation, and production build.
Browser audio verification is separate from simulated media verification.

## Verification

The new regression failed against the original implementation at 0.5×, 0.75×,
1×, and 1.5× and passes with the fix. All 201 tests in 19 suites pass. The
legacy content script compiles, and the runtime and popup production builds
succeed. The rebuilt runtime is committed with the source. Live browser audio
has not been verified; the installed extension and video tab need reloading to
exercise the new runtime when using this unpacked checkout.
