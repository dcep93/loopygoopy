# Loopy Goopy privacy policy

Effective October 12, 2026. Applies to Loopy Goopy versions 5.0.0 through 5.0.7.

Loopy Goopy helps you practice parts of videos using loops, playback speed, and beat counts. It has no account system, analytics, advertising, Firebase service, or developer-operated data server.

## Data used on your computer

The extension reads the current supported media's identity, source URL, title, duration, and playback state so it can control playback and associate settings with the right video. It stores video identifiers and source metadata, named bookmarks and their loop settings, practice preferences, and a cached public practice catalog in your Chrome profile. Local file paths may be part of source metadata if you enable access to file URLs and use local media. These settings are not uploaded to the developer or synced by the extension.

The extension can copy supported saved settings from its older local storage into Chrome extension storage. Original records are retained. Saved settings persist until deleted or the extension's data is removed. Removing the extension removes its local extension data; copies you make yourself are outside its control.

## Network requests and third parties

To discover prepared practice videos and their timing, Loopy Goopy downloads a public JSON catalog from `raw.githubusercontent.com/dcep93/loopygoopy/master/catalog.json`. It requests the same complete catalog for every video, without credentials or a referrer, and matches videos locally. It does not send your current video ID, page URL, bookmarks, or preferences in this request.

GitHub receives ordinary connection information, including your IP address and request metadata, when serving that file. GitHub handles that information under its [privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). Catalog downloads are data only; the extension's executable code is packaged with the extension.

Videos continue to play on their original websites. Those websites handle their own playback requests, cookies, and account information under their own policies. Clicking a link to GitHub opens that site normally. Loopy Goopy does not record or upload audio or video.

## Use and disclosure

The developer does not receive your saved settings or browsing history through the extension, sell personal information, use it for advertising, or use it for credit or lending decisions. Local data is used only to provide the practice features described above.

## Contact

Questions about this policy: [dcep93@gmail.com](mailto:dcep93@gmail.com). Changes to these practices will be reflected in this policy and the Chrome Web Store disclosures.
