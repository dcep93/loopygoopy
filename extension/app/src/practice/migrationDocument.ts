export {};
declare const chrome: any;
chrome.runtime.onMessage.addListener((message: any, sender: any, reply: any) => {
  if (message?.target !== 'record-migration' || message.type !== 'read-legacy-records' || sender.id !== chrome.runtime.id) return;
  try {
    const records: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (!key.startsWith('loopy-goopy:')) continue;
      try {
        const record = JSON.parse(localStorage.getItem(key)!);
        if (record?.version === 'v0.0.2' && key === `loopy-goopy:${record.media?.id}`) records[key] = record;
      } catch { /* Unrelated or malformed records remain untouched. */ }
    }
    reply({ records });
  } catch { reply({ error: 'Original settings are unavailable.' }); }
});
