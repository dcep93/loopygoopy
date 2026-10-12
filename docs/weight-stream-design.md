# Synced weight stream

Add a compact row below practice settings, preserving the existing controls and video fit. A fixed center marker represents the video's current count; the symbols move right to left at 64 pixels per count. Read media time each animation frame instead of advancing an independent clock. Pauses, buffering, seeking, rate changes and loop restarts therefore stay aligned with the picture. Silent/metronome leads hold the strip with the frozen video.

Catalog entries may include optional, validated choreography cues and a source link. R/L occupy one count, r/l half a count, - one extra count holding weight, and * a special action without changing the previous weighted foot. Symbols are placed by their timed onset, so half-count events are twice as dense. No strip appears for entries without cues.

The example follows the main sequence in the choreographers' [step sheet](https://www.copperknob.co.uk/stepsheets/K3PHTPZ/3-tequila-floor/download/pdf). Include the right pickup at count 0.5; its next occurrence is 32.5. Use l then * at 4/4&, * throughout the press/wobble until r at 24&, and the two full-count walks at 15/16. Do not encode the optional four walks or later restarts. No choreography is extrapolated beyond that boundary.

Validate symbol durations, half-count positions, ascending non-overlapping cues and bounds. Test the user's timing examples, confirmed special cases and the media clock during pause, buffering, speed changes and repeats. Inspect the production UI at desktop viewport sizes; regenerate both extension builds and release ZIP. Existing bookmarks and preference keys remain unchanged.
