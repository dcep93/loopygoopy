import { loadDefinition } from './catalog';
declare const chrome: any;

// Stateless requests only. The worker owns no playback sessions or live UI ports.
chrome.runtime.onMessage.addListener((message: any, sender: any, reply: any) => {
  if (message?.type === 'practice-definition') {
    let allowed = false;
    try {
      const url = new URL(sender.url);
      allowed = Number.isInteger(sender.tab?.id) && sender.frameId === 0 && url.origin === 'https://www.youtube.com' &&
        url.pathname === '/watch' && /^youtube:[\w-]{11}$/.test(message.mediaId) && `youtube:${url.searchParams.get('v')}` === message.mediaId;
    } catch {}
    if (!allowed) { reply({ ok: false }); return; }
    loadDefinition(message.mediaId, message.refresh === true).then(result => reply({ ok: true, ...result }), () => reply({ ok: false }));
    return true;
  }
  reply(false);
});
