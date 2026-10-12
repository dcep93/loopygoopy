# Stable media identities and this computer's data port

Approved scope: replace URL/title/duration keys with stable identities, retain a source URL and title in each saved record, and port this computer's existing settings. No runtime compatibility with old formats is required.

## Identity and storage

Use `youtube:<videoId>` across watch, short, short-link, and embed URLs; `instagram:<shortcode>` across reel/post URLs; `drive:<fileId>` independently of its folder; and `file:<absolute file URL>` for local files. Generic media use their full source URL. Temporary blob/CDN URLs and duration must not identify supported platform videos. Unsupported feed items with no identifiable permalink fail explicitly rather than sharing a page-level configuration.

Save `{version: "v0.0.2", media: {id, sourceUrl, title}, config}` under `loopy-goopy:<id>`. Config and bookmark fields remain unchanged. Persist metadata with configuration edits and refresh it when an existing record is opened. Store source URLs separately from the identity so links can be recovered. Prefer the current video's title over the document title altered by training playback. The popup must not load a background tab's settings when the active tab cannot initialize.

## One-time port

Snapshot both localStorage and the old Chrome extension sync database. Resolve explicit YouTube IDs, Drive file IDs, and file URLs directly. For title-only YouTube entries, require a matching source and duration before assigning an ID. Preserve distinct saved variants as named bookmarks, with current local records taking precedence over historical sync records. Keep raw originals and unresolved records in a private local recovery archive, never in the public repository. Unknown Instagram/post identities cannot be reconstructed; do not guess or assign unrelated content.

Apply the port with Chrome closed after a successful rehearsal on a copied database; preserve a full backup, update only extension-owned records/metadata, and verify all unrelated records are unchanged. Retain old records as an inert backup; the application reads and writes only v0.0.2. Relaunch Chrome and verify the restored Ozzy preset through the popup.

## Validation

Cover URL variants, changing durations/title/blob/CDN URLs, distinct video IDs, Drive folder independence, local files, Instagram permalink discovery, unsupported feeds, metadata persistence, old-format isolation, missing active-tab responses, and preserved bookmark behavior. Compile the shipped content script and rebuild the React popup. Compare every migrated setting/bookmark to the snapshot and account explicitly for unresolved records.

The larger guided-practice feature remains a separate pending design; this change only addresses identification, persistence, and the local data port.
