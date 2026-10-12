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

- Click one four-beat block, or drag across blocks to select a contiguous range. Dragging from `17–20` through `21–24` selects beats 17–24. Each gesture starts a fresh selection.
- Keyboard: focus a block and press Enter/Space to select it; Shift+Arrow extends a range. Arrow keys move focus.
- Choose speed, then Play. Repetitions continue until Pause.
- Lead-in and lead-out each have their own beat duration and Track/Silent/Metronome choice. Track plays adjacent footage; Silent and Metronome freeze the picture at the selected boundaries. Their duration follows playback speed.
- The extension popup uses the same controls and active video session. No Save button is needed.

Prepared videos supply their timing. Other videos still use the manual controls. Advanced opens manual controls for a prepared video.

Existing video settings, bookmark names, and bookmark configurations are copied to shared extension storage on first use, verified, and left intact in the original storage. Practice preferences are separate from those records. Private settings and bookmarks are never published with the catalog.

## Publishing prepared videos

The library in `site/` is intended for `loopygoopy.web.app`; Firestore stores published timing definitions so adding videos does not require an extension update. See [the publishing guide](docs/practice-publishing.md) for setup, calibration, and publishing.

Deployment is not complete: the Firebase project must be verified after CLI sign-in. The bundled example works without a deployed catalog.

## Development checks

From `extension/app`:

```sh
CI=true npm test -- --watchAll=false --runInBand
npm run build
```

The build recompiles the existing TypeScript content script, bundles the practice content script/service worker/migration document, builds the popup, and copies the golden definition to the site. Generated runtime files are committed; the React build is local and ignored.

Firestore rules can be tested without production access. Start the emulator from the repo root with Java 21+ installed:

```sh
npx firebase-tools emulators:start --only firestore --project demo-loopygoopy
```

Then, in another terminal:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8189 node scripts/test-firestore.mjs
```
