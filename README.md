# Loopy Goopy

Practice a video one part at a time, with repeat loops, clear beat counts, and adjustable speed.

## Installation

The embedded practice mode is currently in the unpacked development extension. Chrome 120 or newer is required.

1. Build the extension: `cd extension/app && npm ci && npm run build`.
2. Open Chrome's Extensions page, enable Developer mode, and load the repository's `extension` folder unpacked. If already installed, click Reload after building.
3. Refresh any open YouTube pages after reloading the extension.

The [Chrome Web Store listing](https://chrome.google.com/webstore/detail/loopy-goopy/addfplpnjjbiockjmfegacimgkcmfefn) may contain an earlier version.

## Practice

Visit [the prepared example](https://www.youtube.com/watch?v=xzeGxm72GOo) and click **loopy goopy** beside YouTube's search bar, or open it with the [`loopygoopy` query flag](https://www.youtube.com/watch?v=xzeGxm72GOo&loopygoopy). Practice mode places compact controls above the existing video and hides surrounding page content. Exit practice mode restores the page.

The embedded controls use the multisport theme and newapp title font. The full video fits the space remaining below the controls without cropping. Resizing the window adjusts that space; exceptionally short windows can scroll to keep everything accessible.

The extension captures the flag before YouTube loads and retains it if YouTube cleans up the URL for that same video. `#loopygoopy` also opts in. Exiting clears both markers; navigating to another video requires a fresh opt-in.

- Click an adjacent four-beat block to extend the selection. Click a selected edge to remove it, unless it is the only selected block. Click a selected interior block or a distant unselected block to select only that block. Drag across blocks to choose a contiguous range; dragging from `17–20` through `21–24` selects beats 17–24.
- Keyboard: focus a block and press Enter/Space to select it; Shift+Arrow extends a range. Arrow keys move focus.
- Adjust Speed with minus/plus, then Play. Repetitions continue until Pause.
- Prev and Next beside Play shift the selected range by one four-beat block while keeping its length, including a single-block selection. They disable at the section boundaries.
- Lead-in and lead-out each have their own beat duration and Track/Silent/Metronome choice. Track plays adjacent footage; Silent and Metronome freeze the picture at the selected boundaries. Their duration follows playback speed. During either lead phase, the video has 50% opacity while the controls stay fully visible.
- Clicking the extension icon always opens the original manual controls, on every video. The beat-practice controls appear in the page after opting in with the page link or URL flag. Practice preferences save automatically.

Prepared videos supply their timing. Other videos still use the manual controls.

Supported `v0.0.2` video settings, bookmark names, and bookmark configurations are copied to shared extension storage on first use, verified, and left intact in the original storage. Older `v0.0.1` records are not converted or loaded. Practice preferences are separate from those records. Private settings and bookmarks are never published with the catalog. See the [privacy policy](PRIVACY.md).

## Runtime architecture

Practice controls and the playback engine run together in the YouTube tab. The controls use Shadow DOM for style isolation and call the engine directly. Playback has no background-worker connection or session token. Preferences save directly to Chrome extension storage. The worker handles bounded catalog requests and the manual editor's existing settings migration; a catalog request that fails or times out uses the saved or bundled catalog.

## Publishing prepared videos

Prepared timings live in [`catalog.json`](catalog.json), served directly by [raw.githubusercontent.com](https://raw.githubusercontent.com/dcep93/loopygoopy/master/catalog.json). The extension downloads the whole file, caches it for an hour, and matches video IDs locally. It uses saved or bundled definitions if the request fails.

To add a prepared video, edit and validate the catalog, then commit and push. No database, website, deployment, or service login is required. GitHub caching and the extension refresh interval mean changes may take time to appear. See [the publishing guide](docs/practice-publishing.md).

## Development checks

From `extension/app`:

```sh
CI=true npm test -- --watchAll=false --runInBand
npm run build
```

The build validates the public catalog and copies it into the extension as an offline fallback. It also recompiles the existing TypeScript content script, bundles the practice runtime, and builds the popup. Generated runtime files are committed; the React build is local and ignored.

For catalog-only edits after an initial build, run `node scripts/validate-catalog.mjs` from the repository root, then commit and push `catalog.json`. No extension release is needed to publish additional timing records.

The updated extension still needs installed-Chrome verification before a Chrome Web Store release. Catalog publication and extension publication are separate. The [store release guide](docs/chrome-web-store-release.md) includes packaging instructions, listing copy, permission explanations, and the upgrade limitation.
