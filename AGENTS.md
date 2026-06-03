# Loopy Goopy Agent Notes

- Whenever React app code is changed, regenerate both the shipped content script and popup build before finishing:
  `cd extension/app/src/app && tsc`
  `cd extension/app && npm run build`
- The extension manifest loads `extension/app/src/app/LoopyGoopy/contentScript.js` directly, so keep it in sync with `contentScript.ts`.
- The extension popup loads `extension/app/build/index.html`; source changes under `extension/app/src` will not appear in Chrome until the React build is regenerated.
