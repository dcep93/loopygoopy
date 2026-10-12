# Prepared practice catalog

## Deployment status

Local extension build, bundled example, hosted library source, owner publishing script, and Firestore rules are implemented. Production deployment is pending Firebase CLI authentication and verification of the existing project/site. Do not deploy these rules over an existing project's unrelated rules without merging them.

The configured project/site ID is `loopygoopy`. Confirm it with `npx firebase-tools login`, `npx firebase-tools projects:list`, and `npx firebase-tools hosting:sites:list --project loopygoopy`. If the actual project differs, change `projectId` in `extension/app/src/practice/catalog.ts`, the endpoint in `site/library.js`, and the Hosting site in `firebase.json` before building.

Inspect existing Hosting deployments and Firestore rules/data before deploying. Once verified and merged if needed:

```sh
npx firebase-tools deploy --project loopygoopy --only hosting,firestore:rules
```

The library fetches published schema-version-1 entries. Only public timing metadata belongs in `practiceVideos`. Client reads require published status; all client writes are denied. Publishing uses the project owner's Google IAM authorization. Drafts can be stored with a different status through the owner console and are not publicly readable. User bookmarks and preferences stay on the computer.

## Preparing a video

Copy `extension/app/src/practice/golden.json` to a new JSON file. Set the canonical watch URL, `youtube:<video-id>` media ID, title, BPM, time of beat 1 in seconds, and revision. This version supports exactly 32 beats at a constant tempo.

Verify the numbered counts visually at normal and reduced speed. Do not confuse subdivisions with numbered counts. Confirm the first beat, each four-beat boundary, and the end of the section; exercise 1–4, 1–12, 17–24, and 29–32. Check each lead style and repeated cycles before publishing. Increment `revision` for corrected definitions.

The golden example uses 81 numbered beats/minute with beat 1 at approximately 12.64 seconds. Its 32-beat interval ends at 36.3437 seconds; beats 17–24 span 24.4919–30.4178 seconds. Timing was checked against the audio pulse and video frames around the first and final section boundaries. The [choreographers' count sheet](https://www.copperknob.co.uk/stepsheets/K3PHTPZ/3-tequila-floor/download/pdf) distinguishes numbered counts from subdivisions. The initial timing still needs an end-to-end playback check in the installed extension before treating it as final calibration.

## Publishing

Build first so the publisher and extension use the same validator. Obtain a short-lived Google OAuth access token with the relevant project IAM permission through your normal authorized Google Cloud workflow. Keep the token in the process environment, never in a definition or repository file.

```sh
node scripts/publish-practice.mjs loopygoopy path/to/entry.json
```

The command requires `GOOGLE_OAUTH_ACCESS_TOKEN` in its environment and rejects invalid definitions. It refuses to overwrite an equal or newer revision. Successful publication makes the entry discoverable by the website and available on the next extension session/catalog retry. An active practice session keeps its loaded definition until reloaded or retried while paused.

No site deployment is needed for additional entries. A site deployment is needed for library UI changes; an extension reload/update is needed for extension code changes.

## Verification still needed on the installed extension

After building, reload Loopy Goopy in Chrome's Extensions page and refresh the golden-example page. Browser automation cannot operate the extension-management page in this environment, so the reload requires the user.

Check the embedded layout and player sizing; the full range/lead/speed combinations; popup and in-page synchronization; navigation between prepared and unprepared videos; reload/reconnection; and the real saved Ozzy bookmarks after the one-time migration. Automated tests cover the engine, storage transfer, block gestures, tab/session binding, and legacy behavior, but do not replace these installed-Chrome checks.
