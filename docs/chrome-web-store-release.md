# Chrome Web Store release: 5.0.15

Update the existing **Loopy Goopy** item: `addfplpnjjbiockjmfegacimgkcmfefn`.
[Public listing](https://chromewebstore.google.com/detail/loopy-goopy/addfplpnjjbiockjmfegacimgkcmfefn).
The public version checked October 12, 2026 was 3.1.0. The new package is 5.0.15; if an unpublished dashboard package already uses that version or a higher one, increase the manifest version and rebuild before uploading.

## Build and package

From the repository root:

```sh
CI=true npm test --prefix extension/app -- --watchAll=false --runInBand
npm run build --prefix extension/app
python3 scripts/package-extension.py ../_codex_output/loopygoopy-release-5.0.15
```

Upload `loopy-goopy-5.0.15.zip`. Its only manifest is at the ZIP root. The unused Create React App web manifest is removed from the popup source; packaging rejects any nested manifest.json. The package includes the compiled popup, content scripts, worker, icons, and font license. It excludes development dependencies, source maps, tests, and personal records. Do not upload the old repository-root `extension.zip`.

## Store description — paste this

Practice a video one part at a time with Loopy Goopy.

On prepared YouTube videos, click “loopy goopy” beside the search bar to open a focused practice view. Compact controls sit above the video so you can see the demonstration and your controls together.

• Select four-beat blocks and combine neighboring blocks into one continuous loop.
• Use Prev and Next beside Play to move that loop one block backward or forward.
• Slow down or speed up playback with simple minus and plus controls.
• Set lead-in and lead-out durations independently, using the original track, silence, or a metronome.
• Enable Weight clicks to hear each footwork weight transfer while the video plays.
• Follow the beat count while your chosen section repeats. Prepared guides can also show a synced scrolling foot-weight sequence.
• Exit practice mode to return to the normal YouTube page.

Prepared videos include their timing, so you do not need to work out the tempo yourself. The prepared catalog currently contains one example and can grow through catalog updates. Other supported videos use the manual controls.

Click the extension icon to open manual loop controls and save named bookmarks for the current video. Settings stay in your Chrome profile. No Loopy Goopy account is required.

Requires Chrome 120 or later. Video playback remains on the original website. Loopy Goopy is not affiliated with YouTube or Google.

## Release notes — optional announcement copy

Version 5.0.15 removes old-settings migration and the offscreen permission. The popup opens directly using current extension storage. Existing current-format settings remain available; old localStorage settings are not imported. The package retains the original Loopy Goopy icons. Version 5.0.14 removed the unused popup web-app manifest so the Chrome Web Store package contains exactly one manifest. Packaging now rejects extra manifests. It lets selection changes continue playback when the current count stays selected, using the updated loop end and preserving synced weight clicks. It spaces scroller markers every two counts: pink squares at 1, 5, 9, 13 and every fourth count thereafter, with amber ticks halfway between. It makes weight clicks louder again and raises their pitch from 760 Hz to 1500 Hz, keeping lead metronome levels unchanged. It includes a Weight clicks checkbox beside Lead-out, enabled by default, that clicks on footwork weight changes in sync with the video. It halves the visual scroll speed and symbol spacing while preserving video synchronization and step durations. It keeps practice-mode startup paused until Play is pressed, including delayed YouTube autoplay and late player creation. It also corrects the weight-stream notation: uppercase letters are quick steps, a letter plus dash is slow, and lowercase letters are super-quick. It includes a synced weight stream beneath the controls for the prepared example, with count-based spacing, half-count steps, and special-action markers. Practice controls and playback run together in the video tab so background-worker inactivity does not interrupt the practice connection. It includes Prev and Next buttons that move the selected range by one four-beat block, retaining its length and disabling at section boundaries. It also adds an embedded practice view for prepared YouTube videos, selectable four-beat loops, adjustable speed, and independent lead-in and lead-out controls. The extension icon continues to open the manual editor. This release also fixes settings being associated with the wrong video and improves practice layout, visibility, and exit behavior.

## Privacy practices — prepared answers

**Single purpose:** Help users practice sections of online videos through repeat loops, adjustable playback speed, saved loop bookmarks, and beat-based practice controls.

**storage:** Store per-video loop bookmarks, practice preferences, and a cached public timing catalog locally in the user's Chrome profile.


**Host access:** Content scripts inspect and control media elements on the supported YouTube, Instagram, existing specific Google Drive folder, and local-file pages listed in the manifest, including supported YouTube embeds. File access additionally requires the user's Chrome setting. Access to raw.githubusercontent.com downloads the public practice timing catalog from a fixed URL. The current video is matched locally; personal settings are not uploaded.

**Remote code:** No. All executable code is packaged with the extension. The remote catalog is validated JSON containing video identities, titles, tempo, beat timing, and section length, and optional timed choreography symbols with a source link; it is not executable code.

**Privacy policy URL:** https://github.com/dcep93/loopygoopy/blob/master/PRIVACY.md

**Data handling:** Settings, media URLs/titles, and bookmarks are processed and stored locally. There is no developer analytics or collection endpoint. GitHub receives IP/request metadata when serving the public catalog, as disclosed in the privacy policy. Review the dashboard's current data-category definitions against these facts; do not describe the extension as making no network requests. The data-use certifications should reflect that data is not sold, used for unrelated purposes, or used for creditworthiness/lending.

## Reviewer instructions

No extension account or credentials are needed. Visit https://www.youtube.com/watch?v=xzeGxm72GOo normally and click “loopy goopy” beside the YouTube search bar. Alternatively use https://www.youtube.com/watch?v=xzeGxm72GOo&loopygoopy. Select blocks, play/pause, change speed, and try the lead-in/out settings. “Exit practice mode” restores YouTube. Clicking the extension toolbar icon opens the manual editor. Prepared mode is currently available for this one catalog video; it is not advertised for every YouTube video.

## Before submitting

1. Reload the unpacked build and check the golden example in Chrome, including two repeated cycles, lead styles, speed changes, at least a minute paused before resuming, exiting, and the original manual popup/bookmarks. Automated tests cover these components but do not establish complete installed-browser behavior.
2. Settings use current Chrome extension storage. Older localStorage settings are not imported.
3. Open the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), select the item ID above, then **Package → Upload New Package**. Upload the complete ZIP.
4. Update the Store listing and Privacy practices with the copy above. Keep existing valid store artwork; if adding practice screenshots, capture the actual installed extension at the dashboard's required size. No new screenshot assets are supplied in this release bundle.
5. Preview the listing, resolve dashboard validation messages, then **Submit for review**. Choose automatic publication or deferred publication as desired. Uploading alone does not publish the extension.

Official references: [Update an extension](https://developer.chrome.com/docs/webstore/update), [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [Store images](https://developer.chrome.com/docs/webstore/images).

The extension and raw GitHub catalog are the only app infrastructure. Firebase and GitHub Pages are not needed.
