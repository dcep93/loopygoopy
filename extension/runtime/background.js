"use strict";
(() => {
  // src/practice/recordMigration.ts
  var migrationMarker = "loopy-record-port-v1";
  var pending;
  function ensureRecordTransfer() {
    if (pending) return pending;
    pending = transfer().catch((error) => {
      pending = void 0;
      throw error;
    });
    return pending;
  }
  function sameRecord(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && sameRecord(a[key], b[key]));
  }
  async function transfer() {
    const store = chrome.storage.local;
    const existing = await store.get(null);
    if (existing[migrationMarker]?.completed) return;
    const url = chrome.runtime.getURL("runtime/migrate.html");
    const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"], documentUrls: [url] });
    if (!contexts.length) await chrome.offscreen.createDocument({ url: "runtime/migrate.html", reasons: ["LOCAL_STORAGE"], justification: "Preserve existing saved video configurations in shared extension storage." });
    try {
      const response = await chrome.runtime.sendMessage({ target: "record-migration", type: "read-legacy-records" });
      if (!response?.records || response.error) throw Error("Could not read original settings. Original records are intact.");
      const additions = {};
      for (const [key, record] of Object.entries(response.records)) {
        if (record?.version === "v0.0.2" && key === `loopy-goopy:${record.media?.id}` && existing[key] === void 0) additions[key] = record;
      }
      await store.set(additions);
      const check = await store.get(Object.keys(additions));
      for (const key of Object.keys(additions)) {
        if (!sameRecord(check[key], additions[key])) throw Error("Could not verify saved settings. Original records are intact.");
      }
      await store.set({ [migrationMarker]: { completed: true, records: Object.keys(additions).length } });
    } finally {
      await chrome.offscreen.closeDocument();
    }
  }

  // src/practice/model.ts
  function validDefinition(v, id) {
    return Boolean(v && v.schemaVersion === 1 && /^youtube:[\w-]{11}$/.test(v.mediaId) && (!id || v.mediaId === id) && v.sourceUrl === `https://www.youtube.com/watch?v=${v.mediaId.slice(8)}` && typeof v.title === "string" && v.title.length > 0 && v.title.length < 200 && Number.isFinite(v.bpm) && v.bpm > 0 && v.bpm <= 400 && Number.isFinite(v.firstBeat) && v.firstBeat >= 0 && v.totalBeats === 32 && Number.isSafeInteger(v.revision) && v.revision > 0 && v.status === "published" && (v.footwork === void 0 || validFootwork(v.footwork)));
  }
  function validCatalog(value) {
    return Boolean(value && value.schemaVersion === 1 && Array.isArray(value.videos) && value.videos.length <= 1e3 && value.videos.every((video) => validDefinition(video)) && new Set(value.videos.map((video) => video.mediaId)).size === value.videos.length);
  }
  function validFootwork(value) {
    if (!value || typeof value.sourceUrl !== "string") return false;
    try {
      if (new URL(value.sourceUrl).protocol !== "https:") return false;
    } catch {
      return false;
    }
    if (!Array.isArray(value.cues) || !value.cues.length || value.cues.length > 65) return false;
    let end = 0.5;
    return value.cues.every((cue) => {
      if (!cue || !Number.isFinite(cue.beat) || !Number.isInteger(cue.beat * 2) || cue.beat < end || ![0.5, 1].includes(cue.duration) || cue.beat + cue.duration > 33 || !["R", "L", "r", "l", "-", "*"].includes(cue.symbol) || ["R", "L", "-"].includes(cue.symbol) && cue.duration !== 1 || ["r", "l"].includes(cue.symbol) && cue.duration !== 0.5) return false;
      end = cue.beat + cue.duration;
      return true;
    });
  }

  // src/practice/bundled-catalog.json
  var bundled_catalog_default = {
    schemaVersion: 1,
    videos: [
      {
        schemaVersion: 1,
        mediaId: "youtube:xzeGxm72GOo",
        sourceUrl: "https://www.youtube.com/watch?v=xzeGxm72GOo",
        title: "3 Tequila Floor",
        bpm: 81,
        firstBeat: 12.64,
        totalBeats: 32,
        revision: 2,
        status: "published",
        footwork: {
          sourceUrl: "https://www.copperknob.co.uk/stepsheets/K3PHTPZ/3-tequila-floor/download/pdf",
          cues: [
            {
              beat: 0.5,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 1,
              duration: 1,
              symbol: "L"
            },
            {
              beat: 2,
              duration: 1,
              symbol: "R"
            },
            {
              beat: 3,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 3.5,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 4,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 4.5,
              duration: 0.5,
              symbol: "*"
            },
            {
              beat: 5,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 5.5,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 6,
              duration: 1,
              symbol: "R"
            },
            {
              beat: 7,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 7.5,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 8,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 8.5,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 9,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 9.5,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 10,
              duration: 0.5,
              symbol: "*"
            },
            {
              beat: 10.5,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 11,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 11.5,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 12,
              duration: 1,
              symbol: "R"
            },
            {
              beat: 13,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 13.5,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 14,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 14.5,
              duration: 0.5,
              symbol: "*"
            },
            {
              beat: 15,
              duration: 1,
              symbol: "R"
            },
            {
              beat: 16,
              duration: 1,
              symbol: "L"
            },
            {
              beat: 17,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 17.5,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 18,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 18.5,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 19,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 19.5,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 20,
              duration: 1,
              symbol: "R"
            },
            {
              beat: 21,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 21.5,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 22,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 22.5,
              duration: 0.5,
              symbol: "*"
            },
            {
              beat: 23,
              duration: 0.5,
              symbol: "*"
            },
            {
              beat: 23.5,
              duration: 0.5,
              symbol: "*"
            },
            {
              beat: 24,
              duration: 0.5,
              symbol: "*"
            },
            {
              beat: 24.5,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 25,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 25.5,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 26,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 26.5,
              duration: 0.5,
              symbol: "*"
            },
            {
              beat: 27,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 27.5,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 28,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 28.5,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 29,
              duration: 0.5,
              symbol: "*"
            },
            {
              beat: 29.5,
              duration: 0.5,
              symbol: "r"
            },
            {
              beat: 30,
              duration: 0.5,
              symbol: "*"
            },
            {
              beat: 30.5,
              duration: 0.5,
              symbol: "l"
            },
            {
              beat: 31,
              duration: 0.5,
              symbol: "*"
            },
            {
              beat: 31.5,
              duration: 0.5,
              symbol: "*"
            },
            {
              beat: 32,
              duration: 0.5,
              symbol: "*"
            },
            {
              beat: 32.5,
              duration: 0.5,
              symbol: "r"
            }
          ]
        }
      }
    ]
  };

  // src/practice/catalog.ts
  var catalogUrl = "https://raw.githubusercontent.com/dcep93/loopygoopy/master/catalog.json";
  var catalogKey = "practice-catalog-v2";
  var refreshInterval = 60 * 60 * 1e3;
  var pending2;
  async function readCatalog(refresh) {
    const saved = (await chrome.storage.local.get(catalogKey))[catalogKey];
    const cached = validCatalog(saved?.catalog) ? saved.catalog : void 0;
    const age = Date.now() - saved?.fetchedAt;
    if (!refresh && cached && Number.isFinite(age) && age >= 0 && age < refreshInterval) return { catalog: cached };
    const fallback = cached || (validCatalog(bundled_catalog_default) ? bundled_catalog_default : void 0);
    const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 4e3);
    try {
      const response = await fetch(catalogUrl, { signal: abort.signal, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-cache" });
      if (!response.ok) throw Error("Catalog unavailable");
      const catalog = await response.json();
      if (!validCatalog(catalog)) throw Error("Invalid practice catalog");
      try {
        await chrome.storage.local.set({ [catalogKey]: { catalog, fetchedAt: Date.now() } });
      } catch {
        return { catalog, notice: "Practice guides loaded, but could not be cached for offline use." };
      }
      return { catalog };
    } catch {
      return { catalog: fallback, notice: fallback ? "Using the saved practice catalog." : "Could not load practice guides. Retry when connected." };
    } finally {
      clearTimeout(timer);
    }
  }
  async function loadDefinition(id, refresh = false) {
    const request = pending2 || (pending2 = readCatalog(refresh));
    try {
      const result = await request;
      return { definition: result.catalog?.videos.find((video) => video.mediaId === id), notice: result.notice };
    } finally {
      if (pending2 === request) pending2 = void 0;
    }
  }

  // src/practice/background.ts
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.target === "record-migration") return;
    if (message?.type === "ensure-record-transfer" && sender.url?.startsWith(chrome.runtime.getURL("app/build/index.html"))) {
      ensureRecordTransfer().then(() => reply({ ok: true }), (error) => reply({ error: error instanceof Error ? error.message : String(error) }));
      return true;
    }
    if (message?.type === "practice-definition") {
      let allowed = false;
      try {
        const url = new URL(sender.url);
        allowed = Number.isInteger(sender.tab?.id) && sender.frameId === 0 && url.origin === "https://www.youtube.com" && url.pathname === "/watch" && /^youtube:[\w-]{11}$/.test(message.mediaId) && `youtube:${url.searchParams.get("v")}` === message.mediaId;
      } catch {
      }
      if (!allowed) {
        reply({ ok: false });
        return;
      }
      loadDefinition(message.mediaId, message.refresh === true).then((result) => reply({ ok: true, ...result }), () => reply({ ok: false }));
      return true;
    }
    reply(false);
  });
})();
