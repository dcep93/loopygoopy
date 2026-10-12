# Practice entry link

Approved: show a small “Enter practice mode” link above the video on ordinary
YouTube watch pages whenever the current video has a valid prepared trainer.
This includes a fresh normal visit with no practice flag or previous session.

Use the catalog definition already loaded by the tab's background session. Show
no link while availability is unknown or when the definition is absent/invalid.
Do not change ordinary playback or the toolbar popup to advertise the trainer.

A normal click adds the loopygoopy flag and mounts the existing practice panel
in the same page, using the session's saved preferences. The entry link is hidden
while practice is active and returns after Exit. Keep a real href for opening or
copying the practice URL. Match the understated warm/pink practice theme.

Navigation must remove the previous video's entry link and only show a new one
when that video's definition is loaded. Handle the player arriving after catalog
loading and YouTube replacing its page elements. Remove injected UI on teardown.

Verify ordinary first visit, unprepared/invalid definitions, enter/exit/re-entry,
same-video URL changes, different-video navigation, delayed player, and unchanged
playback before entry. Rebuild the shipped runtime and popup and inspect the link
in a browser fixture using the actual entry component.
