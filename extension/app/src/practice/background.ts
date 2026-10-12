import { ensureRecordTransfer } from './recordMigration';
import { defaults, paused, validPreferences } from './model';
import { loadDefinition } from './catalog';
declare const chrome: any;
type Host = { port: any; token: string; id: string; tabId: number; snapshot: any; loading?: Promise<void> };
const hosts = new Map<number, Host>();
const views = new Map<any, Host>();
const writes = new Map<string, Promise<void>>();
const send = (port: any, value: any) => { try { port.postMessage(value); } catch {} };
function broadcast(host: Host) { views.forEach((h, port) => { if (h === host) send(port, { type: 'snapshot', ...host.snapshot }); }); }
async function load(host: Host) {
  const id = host.id;
  const [catalog, saved] = await Promise.all([loadDefinition(id), chrome.storage.local.get(`practice-prefs:${id}`)]);
  if (hosts.get(host.tabId) !== host) return;
  const p = saved[`practice-prefs:${id}`];
  host.snapshot = { ...catalog, mediaId: id, prefs: validPreferences(p) ? p : structuredClone(defaults), playback: { ...paused, beat: validPreferences(p) ? p.first : defaults.first }, loading: false };
  send(host.port, { type: 'configure', ...host.snapshot }); broadcast(host);
}
function persist(id: string, prefs: any) {
  const next = (writes.get(id) || Promise.resolve()).catch(() => {}).then(() => chrome.storage.local.set({ [`practice-prefs:${id}`]: prefs }));
  writes.set(id, next); return next;
}
chrome.runtime.onConnect.addListener((port: any) => {
  if (port.name === 'loopy-practice-host') {
    const tabId = port.sender?.tab?.id;
    if (!Number.isInteger(tabId) || port.sender.frameId !== 0 || !/^https:\/\/www\.youtube\.com\//.test(port.sender.url || '')) { port.disconnect(); return; }
    let host: Host | undefined;
    port.onMessage.addListener((message: any) => {
      if (message.type === 'hello' && /^youtube:[\w-]{11}$/.test(message.mediaId)) {
        const page = new URL(message.url);
        if (page.origin !== 'https://www.youtube.com' || page.pathname !== '/watch' || `youtube:${page.searchParams.get('v')}` !== message.mediaId) return;
        const old = hosts.get(tabId);
        if (old) views.forEach((h, p) => { if (h === old) { send(p, { type: 'stale' }); views.delete(p); } });
        host = { port, tabId, id: message.mediaId, token: crypto.randomUUID(), snapshot: { loading: true, mediaId: message.mediaId } };
        hosts.set(tabId, host); send(port, { type: 'bound', token: host.token });
        host.loading = load(host).catch(() => { if (host) { host.snapshot = { loading: false, error: 'Could not open practice settings.' }; broadcast(host); } });
      } else if (message.type === 'playback' && host && hosts.get(tabId) === host) {
        host.snapshot.playback = message.playback; broadcast(host);
      }
    });
    port.onDisconnect.addListener(() => {
      if (host && hosts.get(tabId) === host) { hosts.delete(tabId); views.forEach((h, p) => { if (h === host) { send(p, { type: 'stale' }); views.delete(p); } }); }
    });
  } else if (port.name === 'loopy-practice-view') {
    if (!port.sender?.url?.startsWith(chrome.runtime.getURL('app/build/index.html'))) { port.disconnect(); return; }
    port.onMessage.addListener(async (message: any) => {
      if (message.type === 'attach') {
        let host: Host | undefined;
        if (message.token) host = Array.from(hosts.values()).find(h => h.token === message.token && (!port.sender.tab || port.sender.tab.id === h.tabId));
        else if (!port.sender.tab && Number.isInteger(message.tabId)) host = hosts.get(message.tabId);
        if (!host) { send(port, { type: 'unavailable' }); return; }
        views.set(port, host); send(port, { type: 'snapshot', ...host.snapshot }); return;
      }
      const host = views.get(port);
      if (!host || hosts.get(host.tabId) !== host || message.mediaId !== host.id) return;
      if (message.type === 'preferences' && validPreferences(message.prefs)) {
        host.snapshot.prefs = message.prefs;
        send(host.port, { type: 'preferences', prefs: message.prefs }); broadcast(host);
        try { await persist(host.id, message.prefs); } catch { send(port, { type: 'save-error' }); }
      } else if (['play', 'pause', 'exit', 'manual'].includes(message.type)) send(host.port, { type: message.type });
      else if (message.type === 'retry' && !host.snapshot.playback?.running) await load(host);
      else if (message.type === 'height' && Number.isFinite(message.height)) send(host.port, { type: 'height', height: Math.max(250, Math.min(1800, message.height)) });
    });
    port.onDisconnect.addListener(() => views.delete(port));
  }
});
// Legacy controls already address their own tab. Never keep a global "last tab".
chrome.runtime.onMessage.addListener((message: any, sender: any, reply: any) => {
  if (message?.target === 'record-migration') return;
  if (message?.type === 'ensure-record-transfer' && sender.url?.startsWith(chrome.runtime.getURL('app/build/index.html'))) {
    ensureRecordTransfer().then(() => reply({ ok: true }), error => reply({ error: String(error) })); return true;
  }
  if (message?.type === 'practice-context' && sender.url?.startsWith(chrome.runtime.getURL('app/build/index.html'))) {
    const host = Array.from(hosts.values()).find(h => h.token === message.token && (!sender.tab || sender.tab.id === h.tabId));
    reply(host ? { id: host.tabId } : null); return;
  }
  reply(false);
});
