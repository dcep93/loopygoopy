# Header placement and lead opacity

Apply the user's explicit UI changes:

- The video has 50% opacity during active lead-in and lead-out. The controls
  remain fully visible. Clear the effect when leaving those phases or exiting.
- Remove the complete repeat/Advanced footer and its manual-controls entry.
- On ordinary prepared-video pages, label the entry link only “loopy goopy”
  and place it immediately before the search box in YouTube's masthead center.
- In practice, place the existing brand immediately before the beat counter
  within the transport group. Keep the video title at the left of the header.
- Show speed as minus, current percentage, plus; remove the preset selectors.
- Lead phases display just their countdown number, without Get ready, Reset,
  or beats remaining labels. Remove the transient Getting ready label too.

Countdown correction: rounded media seek positions must not show a larger
count than the configured lead. Use a 1 ms tolerance at beat boundaries and
bound the count to the lead duration. Compute genuinely missing track footage
from video-edge clipping rather than subtraction of the rounded interval length,
which can invent tiny frozen lead steps. Tests reproduce the 2-to-3 error with
the golden video's tempo and microsecond-rounded seeks and retain edge padding.

Use the existing engine state and tab-specific catalog availability. Do not
alter playback timing, saved settings, or ordinary toolbar popup behavior.
Preserve the brand on loading/error screens. Verify opacity cleanup, masthead
availability/replacement, and both layouts using the production build.
