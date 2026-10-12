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
        if (JSON.stringify(check[key]) !== JSON.stringify(additions[key])) throw Error("Could not verify saved settings. Original records are intact.");
      }
      await store.set({ [migrationMarker]: { completed: true, records: Object.keys(additions).length } });
    } finally {
      await chrome.offscreen.closeDocument();
    }
  }

  // src/practice/model.ts
  var defaults = { first: 1, last: 8, speed: 1, leadIn: { beats: 2, style: "track" }, leadOut: { beats: 2, style: "track" } };
  var paused = { phase: "paused", running: false, beat: 1, remaining: 0, cycle: 0 };
  function validDefinition(v, id) {
    return Boolean(v && v.schemaVersion === 1 && /^youtube:[\w-]{11}$/.test(v.mediaId) && (!id || v.mediaId === id) && v.sourceUrl === `https://www.youtube.com/watch?v=${v.mediaId.slice(8)}` && typeof v.title === "string" && v.title.length > 0 && v.title.length < 200 && Number.isFinite(v.bpm) && v.bpm > 0 && v.bpm <= 400 && Number.isFinite(v.firstBeat) && v.firstBeat >= 0 && v.totalBeats === 32 && Number.isSafeInteger(v.revision) && v.revision > 0 && v.status === "published");
  }
  function validPreferences(v) {
    const lead = (l) => l && Number.isInteger(l.beats) && l.beats >= 0 && l.beats <= 32 && ["track", "silent", "metronome"].includes(l.style);
    return Boolean(v && Number.isInteger(v.first) && Number.isInteger(v.last) && v.first >= 1 && v.last <= 32 && v.first <= v.last && (v.first - 1) % 4 === 0 && v.last % 4 === 0 && Number.isFinite(v.speed) && v.speed >= 0.25 && v.speed <= 1.5 && lead(v.leadIn) && lead(v.leadOut));
  }
  function validCatalog(value) {
    return Boolean(value && value.schemaVersion === 1 && Array.isArray(value.videos) && value.videos.length <= 1e3 && value.videos.every((video) => validDefinition(video)) && new Set(value.videos.map((video) => video.mediaId)).size === value.videos.length);
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
        revision: 1,
        status: "published"
      }
    ]
  };

  // src/practice/catalog.ts
  var catalogUrl = "https://raw.githubusercontent.com/dcep93/loopygoopy/master/catalog.json";
  var catalogKey = "practice-catalog-v1";
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
  var hosts = /* @__PURE__ */ new Map();
  var views = /* @__PURE__ */ new Map();
  var writes = /* @__PURE__ */ new Map();
  var send = (port, value) => {
    try {
      port.postMessage(value);
    } catch {
    }
  };
  function broadcast(host) {
    views.forEach((h, port) => {
      if (h === host) send(port, { type: "snapshot", ...host.snapshot });
    });
  }
  async function load(host, refresh = false) {
    const id = host.id;
    const [catalog, saved] = await Promise.all([loadDefinition(id, refresh), chrome.storage.local.get(`practice-prefs:${id}`)]);
    if (hosts.get(host.tabId) !== host) return;
    const p = saved[`practice-prefs:${id}`];
    host.snapshot = { ...catalog, mediaId: id, prefs: validPreferences(p) ? p : structuredClone(defaults), playback: { ...paused, beat: validPreferences(p) ? p.first : defaults.first }, loading: false };
    send(host.port, { type: "configure", ...host.snapshot });
    broadcast(host);
  }
  function persist(id, prefs) {
    const next = (writes.get(id) || Promise.resolve()).catch(() => {
    }).then(() => chrome.storage.local.set({ [`practice-prefs:${id}`]: prefs }));
    writes.set(id, next);
    return next;
  }
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "loopy-practice-host") {
      const tabId = port.sender?.tab?.id;
      if (!Number.isInteger(tabId) || port.sender.frameId !== 0 || !/^https:\/\/www\.youtube\.com\//.test(port.sender.url || "")) {
        port.disconnect();
        return;
      }
      let host;
      port.onMessage.addListener((message) => {
        if (message.type === "hello" && /^youtube:[\w-]{11}$/.test(message.mediaId)) {
          const page = new URL(message.url);
          if (page.origin !== "https://www.youtube.com" || page.pathname !== "/watch" || `youtube:${page.searchParams.get("v")}` !== message.mediaId) return;
          const old = hosts.get(tabId);
          if (old) views.forEach((h, p) => {
            if (h === old) {
              send(p, { type: "stale" });
              views.delete(p);
            }
          });
          host = { port, tabId, id: message.mediaId, token: crypto.randomUUID(), snapshot: { loading: true, mediaId: message.mediaId } };
          hosts.set(tabId, host);
          send(port, { type: "bound", token: host.token });
          host.loading = load(host).catch(() => {
            if (host) {
              host.snapshot = { loading: false, error: "Could not open practice settings." };
              broadcast(host);
            }
          });
        } else if (message.type === "playback" && host && hosts.get(tabId) === host) {
          host.snapshot.playback = message.playback;
          broadcast(host);
        }
      });
      port.onDisconnect.addListener(() => {
        if (host && hosts.get(tabId) === host) {
          hosts.delete(tabId);
          views.forEach((h, p) => {
            if (h === host) {
              send(p, { type: "stale" });
              views.delete(p);
            }
          });
        }
      });
    } else if (port.name === "loopy-practice-view") {
      if (!port.sender?.url?.startsWith(chrome.runtime.getURL("app/build/index.html"))) {
        port.disconnect();
        return;
      }
      port.onMessage.addListener(async (message) => {
        if (message.type === "attach") {
          let host2;
          if (message.token) host2 = Array.from(hosts.values()).find((h) => h.token === message.token && (!port.sender.tab || port.sender.tab.id === h.tabId));
          else if (!port.sender.tab && Number.isInteger(message.tabId)) host2 = hosts.get(message.tabId);
          if (!host2) {
            send(port, { type: "unavailable" });
            return;
          }
          views.set(port, host2);
          send(port, { type: "snapshot", ...host2.snapshot });
          return;
        }
        const host = views.get(port);
        if (!host || hosts.get(host.tabId) !== host || message.mediaId !== host.id) return;
        if (message.type === "preferences" && validPreferences(message.prefs)) {
          host.snapshot.prefs = message.prefs;
          send(host.port, { type: "preferences", prefs: message.prefs });
          broadcast(host);
          try {
            await persist(host.id, message.prefs);
          } catch {
            send(port, { type: "save-error" });
          }
        } else if (["play", "pause", "exit", "manual"].includes(message.type)) send(host.port, { type: message.type });
        else if (message.type === "retry" && !host.snapshot.playback?.running) await load(host, true);
        else if (message.type === "height" && Number.isFinite(message.height)) send(host.port, { type: "height", height: Math.max(250, Math.min(1800, message.height)) });
      });
      port.onDisconnect.addListener(() => views.delete(port));
    }
  });
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.target === "record-migration") return;
    if (message?.type === "ensure-record-transfer" && sender.url?.startsWith(chrome.runtime.getURL("app/build/index.html"))) {
      ensureRecordTransfer().then(() => reply({ ok: true }), (error) => reply({ error: String(error) }));
      return true;
    }
    if (message?.type === "practice-context" && sender.url?.startsWith(chrome.runtime.getURL("app/build/index.html"))) {
      const host = Array.from(hosts.values()).find((h) => h.token === message.token && (!sender.tab || sender.tab.id === h.tabId));
      reply(host ? { id: host.tabId } : null);
      return;
    }
    reply(false);
  });
})();
