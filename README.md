# Loopy Goopy

Practice a video one part at a time, with repeat loops, clear beat counts, and adjustable speed.

## Installation

The embedded practice mode is currently in the unpacked development extension. Chrome 120 or newer is required.

1. Build the extension: `cd extension/app && npm ci && npm run build`.
2. Open Chrome's Extensions page, enable Developer mode, and load the repository's `extension` folder unpacked. If already installed, click Reload after building.
3. Refresh any open YouTube pages after reloading the extension.

The [Chrome Web Store listing](https://chrome.google.com/webstore/detail/loopy-goopy/addfplpnjjbiockjmfegacimgkcmfefn) may contain an earlier version.

## Practice

Open [the prepared example](https://www.youtube.com/watch?v=xzeGxm72GOo&loopygoopy). The `loopygoopy` query flag places the controls below the existing YouTube video and hides surrounding page content. Exit practice mode restores the page.

The extension captures the flag before YouTube loads and retains it if YouTube cleans up the URL for that same video. `#loopygoopy` also opts in. Exiting clears both markers; navigating to another video requires a fresh opt-in.

- Click one four-beat block, or drag across blocks to select a contiguous range. Dragging from `17–20` through `21–24` selects beats 17–24. Each gesture starts a fresh selection.
- Keyboard: focus a block and press Enter/Space to select it; Shift+Arrow extends a range. Arrow keys move focus.
- Choose speed, then Play. Repetitions continue until Pause.
- Lead-in and lead-out each have their own beat duration and Track/Silent/Metronome choice. Track plays adjacent footage; Silent and Metronome freeze the picture at the selected boundaries. Their duration follows playback speed.
- Clicking the extension icon always opens the original manual controls, on every video. The new beat-practice controls appear only in the page when its URL contains `&loopygoopy`. Practice preferences save automatically.

Prepared videos supply their timing. Other videos still use the manual controls. Advanced opens manual controls for a prepared video.

Existing video settings, bookmark names, and bookmark configurations are copied to shared extension storage on first use, verified, and left intact in the original storage. Practice preferences are separate from those records. Private settings and bookmarks are never published with the catalog.

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

The updated extension still needs installed-Chrome verification before a Chrome Web Store release. Catalog publication and extension publication are separate.
